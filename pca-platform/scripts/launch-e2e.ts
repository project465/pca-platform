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
import { openFreeOrder } from "../src/lib/orders";
import { formatMoney } from "../src/lib/money";

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
  /**
   * **값을 켜고 끄지 않는다.**
   *
   * 값이 승인되기 전에는 이 검사가 상품 하나를 잠깐 29,000원으로 켜고
   * 끝에 되돌렸다. 한 번 되돌리지 못하고 터져서 지어낸 값이 DB 에
   * 남았고, 그런 값은 어느 날 그대로 결제된다. 이제 승인된 런칭
   * 가격이 표에 있으므로 **표에 있는 것을 그대로 쓴다.**
   */
  {

    for (const [market, code, region, locale] of [
      ["KR", "ME_V2_STANDARD_KR", "domestic", "ko"],
      ["GLOBAL", "ME_V2_STANDARD_GL", "global", "en"],
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

    /* ── BASIC 무료 흐름 ──────────────────────────────────────────── */
    for (const [market, code] of [
      ["KR", "ME_V2_BASIC_KR"], ["GLOBAL", "ME_V2_BASIC_GL"],
    ] as const) {
      const uid = await user(`free-${market}@example.com`, `무료 ${market}`, "ko");
      await reset(uid);

      const first = await openFreeOrder(uid, code);
      ok(`${market} BASIC 이 결제 없이 열린다`, !first.reused, first.orderId);

      const ents = await query<{ tier: string; product_code: string }>(
        `SELECT tier, product_code FROM entitlements WHERE user_id = $1`, [uid]);
      ok(`${market} 무료 이용권이 한 장 생긴다`, ents.length === 1,
        `${ents.length}장 · ${ents[0]?.tier}`);
      ok(`${market} 이용권 등급이 상품이 정한 것이다`,
        ents[0]?.tier === "BASIC", ents[0]?.tier ?? "없음");

      /* **두 번 눌러도 둘이 되지 않는다.** 같은 순간에 들어온 두 요청도
         DB 가 막는다: 읽고 나서 쓰면 둘 다 통과한다 */
      const again = await Promise.all([
        openFreeOrder(uid, code), openFreeOrder(uid, code), openFreeOrder(uid, code),
      ]);
      const after = await query<{ id: string }>(
        `SELECT id FROM entitlements WHERE user_id = $1`, [uid]);
      ok(`${market} 여러 번 눌러도 이용권이 하나다`, after.length === 1,
        `${after.length}장 · 주문 ${new Set(again.map((a) => a.orderId)).size}건`);

      /* **유료 상품 코드를 무료 길에 넣어도 열리지 않는다** */
      const paidCode = market === "KR" ? "ME_V2_PRO_KR" : "ME_V2_PRO_GL";
      let refused = false;
      try { await openFreeOrder(uid, paidCode); } catch { refused = true; }
      ok(`${market} 유료 상품은 무료 길로 열리지 않는다`, refused,
        refused ? "거절" : "열렸다");

      /* **값을 아직 못 정한 0원도 열리지 않는다** */
      await query(
        `UPDATE products SET amount = 0, price_status = 'not_approved' WHERE code = $1`,
        [paidCode]);
      let refusedTbd = false;
      try { await openFreeOrder(uid, paidCode); } catch { refusedTbd = true; }
      ok(`${market} 미승인 0원은 무료 길로 열리지 않는다`, refusedTbd,
        refusedTbd ? "거절" : "열렸다");
      await query(
        `UPDATE products SET amount = $2, price_status = 'approved' WHERE code = $1`,
        [paidCode, market === "KR" ? 21900 : 2499]);
    }

    /* ── 승인된 런칭 가격이 주문에 그대로 굳는가 ──────────────────── */
    {
      const uid = await user("price-check@example.com", "값 확인", "en");
      await reset(uid);
      const t = await buy(uid, "ME_V2_STANDARD_GL", "global");
      const o = await queryOne<{ amount: number; currency: string }>(
        `SELECT amount, currency FROM orders WHERE order_no = $1`, [t.orderNo]);
      /* **코드에 값을 다시 적지 않는다.** 표에 적힌 것과 주문에 굳은 것이
         같은지만 본다. 여기 14.99 를 쓰면 가격 정본이 둘이 된다 */
      const p = await productByCode("ME_V2_STANDARD_GL");
      ok("주문이 표의 금액을 그대로 굳힌다",
        !!o && !!p && o.amount === p.amount && o.currency.trim() === p.currency.trim(),
        `${o?.amount} ${o?.currency} · 표 ${p?.amount} ${p?.currency}`);
      ok("USD 금액이 최소 단위라 사람이 읽는 값이 맞는다",
        formatMoney(o?.amount ?? 0, "USD", "en") === "$14.99",
        formatMoney(o?.amount ?? 0, "USD", "en") ?? "없음");
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
    const before = (await funnelReport(1)).steps
      .find((s) => s.step === "landing")!.people;
    for (let i = 0; i < 3; i++) await track("landing", { anonId: anon });
    const after = (await funnelReport(1)).steps
      .find((s) => s.step === "landing")!.people;
    /* **늘어난 수만 본다.** 전체 수를 보면 다른 검사와 화면이 남긴 줄까지
       세어서, 세 번 눌러도 한 명인지를 못 가린다 */
    ok("퍼널이 같은 사람을 한 번으로 센다", after - before === 1,
      `세 번 눌러 ${after - before}명 늘었다`);
    await query(`DELETE FROM analytics_events WHERE anon_id = $1`, [anon]);
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
