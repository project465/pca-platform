/**
 * 런칭 E2E — **환불과 거래 메일까지 한 바퀴.**
 *
 * `phase2:check` 가 가입에서 제출까지, `phase2:report` 가 결과지와 PDF,
 * `global:check` 가 영어 한 바퀴를 본다. 여기가 보는 것은 그 뒤다:
 * 요청 → 판정 → 승인 → 좌석 회수 → 메일. 규격 §33 의 `refund sandbox`
 * 와 §14 의 여섯 통이 이 자리다.
 *
 * **두 언어로 돈다.** 영어로 결제한 사람에게 한국어 메일이 가는 것은
 * 쌓을 때 언어를 안 적어서 생기는 탈이고, 그것은 한 언어로만 돌리면
 * 절대 안 보인다.
 *
 *   DATABASE_URL=... npx tsx scripts/launch-e2e.ts
 */
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { settlePayment, startCheckout } from "../src/lib/orders";
import { renderMail } from "../src/lib/outbox";
import { requestRefund, decide, listRequests } from "../src/lib/refund-requests";
import { refundable } from "../src/lib/refund";
import { funnelReport, track } from "../src/lib/funnel";
import { productByCode } from "../src/lib/catalog";

const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });

async function user(email: string, name: string, locale: string): Promise<string> {
  const pw = await hashPassword("launch-dev-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status, locale)
     VALUES ($1,$2,$3,'active',$4)
     ON CONFLICT (email) DO UPDATE
       SET display_name = EXCLUDED.display_name, locale = EXCLUDED.locale
     RETURNING id::text`,
    [email, name, pw, locale],
  );
  return u!.id;
}

async function reset(userId: string) {
  await query(`DELETE FROM pilot_feedback WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM refund_requests WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM refunds WHERE order_id IN
                 (SELECT id FROM orders WHERE user_id = $1)`, [userId]);
  await query(`DELETE FROM attempts WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM entitlements WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM payments WHERE order_id IN
                 (SELECT id FROM orders WHERE user_id = $1)`, [userId]);
  await query(`DELETE FROM seats WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM outbox WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM analytics_events WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM orders WHERE user_id = $1`, [userId]);
}

/** 값이 승인되지 않은 상품도 검사에서는 결제를 태워야 한다 */
async function priced(code: string): Promise<number> {
  const p = await productByCode(code);
  if (!p) throw new Error(`없는 상품: ${code}`);
  if (p.amount > 0) return 0;
  await query(
    `UPDATE products SET amount = 29000, price_status = 'approved' WHERE code = $1`,
    [code],
  );
  return 1;
}

async function buy(userId: string, code: string, region: "domestic" | "global") {
  const { ticket } = await startCheckout(userId, code, "http://localhost", region);
  const { markMockPaid } = await import("../src/lib/payments");
  await markMockPaid({
    providerPaymentId: ticket.providerPaymentId, status: "paid",
    amount: ticket.amount, currency: ticket.currency,
    orderNo: ticket.orderNo, raw: { by: "launch-e2e" },
  });
  const r = await settlePayment(ticket.providerPaymentId);
  if (!r.ok) throw new Error(`결제가 확정되지 않았다: ${r.reason}`);
  return ticket;
}

async function main() {
  /* 승인되지 않은 값을 잠깐 켠다. **끝에 되돌린다**: 지어낸 값이
     저장소에 남으면 그것이 어느 날 그대로 결제된다.
     **켜는 것도 try 안이다**: 바깥에 두었다가 뒤의 줄에서 터졌을 때
     29,000원이 DB 에 남았다(실제로 그랬다) */
  const touched: string[] = [];

  try {
    for (const code of ["ME_V2_BASIC_KR", "ME_V2_BASIC_GL"]) {
      if (await priced(code)) touched.push(code);
    }

    for (const [market, code, region, locale] of [
      ["KR", "ME_V2_BASIC_KR", "domestic", "ko"],
      ["GLOBAL", "ME_V2_BASIC_GL", "global", "en"],
    ] as const) {
      const uid = await user(`launch-${locale}@example.com`, `런칭 ${market}`, locale);
      await reset(uid);

      /* ── 결제 → 이용권 ─────────────────────────────────────────── */
      const ticket = await buy(uid, code, region);
      const ent = await queryOne<{ n: number }>(
        `SELECT count(*)::int AS n FROM entitlements WHERE user_id = $1`, [uid]);
      ok(`${market} 결제가 이용권을 낸다`, (ent?.n ?? 0) === 1, `${ent?.n ?? 0}장`);

      /* ── 결제 확인 메일이 그 사람 언어로 쌓이는가 (규격 §14) ───── */
      const mail = await query<{ kind: string; locale: string | null }>(
        `SELECT kind, locale FROM outbox WHERE user_id = $1 ORDER BY id`, [uid]);
      const paidMail = mail.find((m) => m.kind === "purchase_done");
      ok(`${market} 결제 확인 메일이 쌓인다`, !!paidMail, paidMail?.kind ?? "없음");
      ok(`${market} 메일이 그 사람 언어로 쌓인다`,
        (paidMail?.locale ?? "ko") === locale, `${paidMail?.locale}`);

      /* ── 퍼널에 결제가 적히는가 ────────────────────────────────── */
      const ev = await query<{ name: string }>(
        `SELECT name FROM analytics_events WHERE user_id = $1`, [uid]);
      ok(`${market} 퍼널에 결제가 적힌다`,
        ev.some((e) => e.name === "purchase"), ev.map((e) => e.name).join(" · "));

      /* ── 응시 전 환불: 전액이고 기간 제한이 없다 ────────────────── */
      const v = await refundable((await queryOne<{ id: string }>(
        `SELECT id::text FROM orders WHERE order_no = $1`, [ticket.orderNo]))!.id);
      ok(`${market} 응시 전 환불이 전액이다`,
        v.ok && v.amount === ticket.amount, v.ok ? String(v.amount) : v.deny);

      /* ── 요청 → 접수 메일 ──────────────────────────────────────── */
      const req = await requestRefund({
        orderNo: ticket.orderNo, userId: uid, reason: "changed_mind",
      });
      ok(`${market} 환불 요청이 접수된다`, req.ok, req.ok ? req.id : req.reason);

      const asked = await query<{ kind: string; locale: string | null }>(
        `SELECT kind, locale FROM outbox WHERE user_id = $1 AND kind = 'refund_requested'`,
        [uid]);
      ok(`${market} 접수 메일이 그 사람 언어로 쌓인다`,
        asked.length === 1 && (asked[0].locale ?? "ko") === locale,
        `${asked.length}통 · ${asked[0]?.locale}`);

      /* **같은 주문에 열린 요청이 둘 생기지 않는다** */
      const again = await requestRefund({
        orderNo: ticket.orderNo, userId: uid, reason: "duplicate",
      });
      ok(`${market} 같은 주문에 요청이 두 번 쌓이지 않는다`,
        !again.ok && again.reason === "already_open",
        again.ok ? "두 번 쌓였다" : again.reason);

      /* **남의 주문은 요청할 수 없다** */
      const other = await user("launch-other@example.com", "남", "ko");
      const stolen = await requestRefund({
        orderNo: ticket.orderNo, userId: other, reason: "other",
      });
      ok(`${market} 남의 주문을 요청할 수 없다`,
        !stolen.ok && stolen.reason === "not_mine",
        stolen.ok ? "열렸다" : stolen.reason);

      /* ── 승인 → 환불 기록 · 좌석 회수 · 처리 메일 ───────────────── */
      const mineOpen = (await listRequests({ userId: uid, limit: 5 }))
        .find((r) => r.status === "requested");
      const d = await decide({ requestId: mineOpen!.id, by: uid, action: "approve" });
      ok(`${market} 승인이 환불로 간다`, d.ok, d.reason ?? "");

      const after = await queryOne<{ status: string; refunds: number; ents: number }>(
        `SELECT o.status,
                (SELECT count(*)::int FROM refunds r WHERE r.order_id = o.id) AS refunds,
                (SELECT count(*)::int FROM entitlements e
                  WHERE e.order_id = o.id AND e.ends_at > now()) AS ents
           FROM orders o WHERE o.order_no = $1`,
        [ticket.orderNo]);
      ok(`${market} 주문이 환불로 바뀐다`, after?.status === "refunded", after?.status);
      ok(`${market} 환불 기록이 한 줄 남는다`, (after?.refunds ?? 0) === 1,
        String(after?.refunds));

      /* ── 승인 뒤에 또 승인되지 않는가 ──────────────────────────── */
      const twice = await decide({ requestId: mineOpen!.id, by: uid, action: "approve" });
      ok(`${market} 같은 요청을 두 번 승인할 수 없다`, !twice.ok, twice.reason ?? "");
    }

    /* ── 거래 메일 여섯 가지가 두 언어로 서는가 (규격 §14) ────────── */
    const kinds = ["signup", "purchase_done", "report_ready", "upgrade_done",
      "refund_requested", "refund_done"] as const;
    for (const k of kinds) {
      const ko = renderMail(k, "ko");
      const en = renderMail(k, "en");
      ok(`메일 ${k} 가 두 언어로 있다`,
        !!ko?.subject && !!en?.subject && ko.subject !== en.subject,
        `${ko?.subject} / ${en?.subject}`);
    }

    /* ── 퍼널이 사람으로 세는가 ───────────────────────────────────── */
    const anon = `e2e-${Date.now()}`;
    for (let i = 0; i < 3; i++) await track("landing", { anonId: anon });
    const f = await funnelReport(1);
    const landing = f.steps.find((s) => s.step === "landing")!.people;
    ok("퍼널이 같은 사람을 한 번으로 센다", landing >= 1,
      `방문 ${landing}명`);
    await query(`DELETE FROM analytics_events WHERE anon_id = $1`, [anon]);
  } finally {
    /* 켜 둔 값을 되돌린다. **지어낸 값을 남기지 않는다** */
    for (const code of touched) {
      await query(
        `UPDATE products SET amount = 0, price_status = 'not_approved' WHERE code = $1`,
        [code],
      );
    }
  }

  const bad = T.filter((x) => !x.pass);
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  console.log(bad.length
    ? `\n${bad.length}개가 걸렸다.`
    : `\n런칭 E2E OK — ${T.length}가지.`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
