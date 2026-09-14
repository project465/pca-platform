/**
 * 알림이 돈길을 막지 않는가.
 *
 * 밤에 사람이 없어도 되는 이유는 알림이 자동으로 나가서가 아니라,
 * **알림이 실패해도 결제와 가입이 그대로 끝나기 때문이다.** 메일 서버
 * 하나 때문에 돈이 안 들어오면 자동화가 아니라 새 고장점이다.
 *
 * 보는 것 일곱.
 *
 *   1. 가입하면 한 줄 쌓이고, 화면은 기다리지 않는다
 *   2. 채점이 끝나면 한 줄 쌓인다. 두 번 제출해도 한 줄이다
 *      — 승인제 회차는 담당자가 공개를 누를 때까지 접어 둔다
 *   3. 업그레이드 결제가 확정되면 한 줄. 같은 웹훅이 또 와도 한 줄이다
 *   4. **대기열이 통째로 고장 나도 결제는 확정된다**
 *   5. 자격증명이 없으면 보내지 않고 그대로 둔다 (붙는 날 나간다)
 *   6. 보낼 곳이 없는 줄(익명화된 사람)은 조용히 접는다
 *   7. 코드 재고가 모자라면 경고가 하루에 한 번만 쌓인다
 *
 *   npm run metri:outbox
 */
import { query, queryOne } from "../../src/lib/db";
import { enqueue, flushOutbox, checkCodeStock, outboxCount, notifyReportReady } from "../../src/lib/outbox";
import { hashPassword } from "../../src/lib/password";
import { startCheckout, settlePayment, openFreeOrder } from "../../src/lib/orders";
import { markMockPaid } from "../../src/lib/payments";
import { openAttempt, questionPage, saveResponse, submitAttempt, PAGE_SIZE } from "../../src/lib/attempts";
import { score } from "../../src/lib/scoring";

let failed = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

async function student(email: string): Promise<string> {
  const pw = await hashPassword("test-pass-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ($1,'대기열 검사',$2,'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id`,
    [email, pw],
  );
  const uid = u!.id;
  await query(`DELETE FROM outbox WHERE user_id = $1`, [uid]);
  // 지우는 순서가 있다 — 응답 → 응시 → 개인 회차 → 좌석 → 주문.
  // 회차와 좌석이 주문을 붙들고 있어서 거꾸로 가면 FK 에 걸린다.
  await query(`DELETE FROM responses WHERE attempt_id IN (SELECT id FROM attempts WHERE user_id = $1)`, [uid]);
  await query(`DELETE FROM report_grants WHERE attempt_id IN (SELECT id FROM attempts WHERE user_id = $1)`, [uid]);
  await query(`DELETE FROM attempts WHERE user_id = $1`, [uid]);
  await query(
    `DELETE FROM test_sessions WHERE kind = 'solo'
       AND order_id IN (SELECT id FROM orders WHERE user_id = $1)`, [uid]);
  await query(`DELETE FROM seats WHERE user_id = $1 AND contract_id IS NULL`, [uid]);
  await query(`DELETE FROM orders WHERE user_id = $1`, [uid]);
  return uid;
}

/** 무료로 한 판 풀고 채점까지 간다. 업그레이드가 붙을 자리를 만든다. */
async function finishFree(uid: string): Promise<string> {
  await openFreeOrder(uid, "HS_FREE");
  const at = await openAttempt(uid);
  if (!at) throw new Error("좌석이 없다");
  for (let p = 1; p <= Math.ceil(at.total / PAGE_SIZE); p++) {
    for (const q of await questionPage(at, p)) {
      // 주의 문항은 시키는 값을 넣는다. 아니면 성실도에서 걸린다
      let v = 3;
      if (q.itemKind === "attention") {
        const e = await queryOne<{ e: number }>(
          `SELECT attention_expect AS e FROM questions WHERE id=$1`, [q.id]);
        v = e!.e;
      }
      const opt = q.options.find((o) => o.orderNo === v)!;
      await saveResponse(at.id, uid, q.id, opt.id, 900);
    }
  }
  const r = await submitAttempt(at.id, uid);
  if (!r.ok) throw new Error(`빠진 문항 ${r.missing.length}개`);
  await score(at.id);
  await notifyReportReady(at.id);   // 화면(제출 액션)이 하는 것과 같은 호출
  return at.id;
}

async function main() {
  console.log("════════ 1. 가입 ════════");
  const a = await student("outbox-a@example.com");
  await enqueue({ kind: "signup", userId: a, toAddr: "outbox-a@example.com", dedupeKey: `signup:${a}` });
  await enqueue({ kind: "signup", userId: a, toAddr: "outbox-a@example.com", dedupeKey: `signup:${a}` });
  check((await outboxCount("signup", a)) === 1, "가입 알림이 한 줄만 쌓인다",
    `${await outboxCount("signup", a)}줄`);

  console.log("\n════════ 2. 채점 ════════");
  const b = await student("outbox-b@example.com");
  const attempt = await finishFree(b);
  check((await outboxCount("report_ready", b)) === 1, "채점이 끝나면 한 줄 쌓인다");
  // 같은 응시로 또 적어 본다 — dedupe_key 가 같으므로 늘지 않아야 한다
  await enqueue({ kind: "report_ready", userId: b, dedupeKey: `report_ready:${attempt}` });
  check((await outboxCount("report_ready", b)) === 1, "같은 응시로는 두 번 쌓이지 않는다",
    `${await outboxCount("report_ready", b)}줄`);

  /**
   * 승인제 회차는 채점만으로 보내지 않는다. 담당자가 공개를 누르기 전에
   * 보내면 학생이 들어와 빈 화면을 본다.
   */
  const e = await student("outbox-e@example.com");
  const at3 = await finishFree(e);
  await query(
    `UPDATE test_sessions SET release_mode = 'manual', released_at = NULL
      WHERE id = (SELECT session_id FROM attempts WHERE id = $1)`, [at3]);
  await query(`DELETE FROM outbox WHERE dedupe_key = $1`, [`report_ready:${at3}`]);
  const held = await notifyReportReady(at3);
  check(!held && (await outboxCount("report_ready", e)) === 0,
    "공개 전 회차에서는 보내지 않는다");
  await query(
    `UPDATE test_sessions SET released_at = now()
      WHERE id = (SELECT session_id FROM attempts WHERE id = $1)`, [at3]);
  await notifyReportReady(at3);
  check((await outboxCount("report_ready", e)) === 1, "공개를 누르면 그제야 나간다",
    `${await outboxCount("report_ready", e)}줄`);

  console.log("\n════════ 3. 업그레이드 결제 ════════");
  const { ticket } = await startCheckout(b, "HS_UPGRADE", "http://localhost:3000", "domestic", attempt);
  await markMockPaid({
    providerPaymentId: ticket.providerPaymentId, status: "paid", amount: ticket.amount,
    currency: ticket.currency, method: "CARD", orderNo: ticket.orderNo, raw: {},
  });
  const s1 = await settlePayment(ticket.providerPaymentId);
  check(s1.ok, "결제가 확정된다", s1.ok ? "" : s1.reason);
  check((await outboxCount("upgrade_done", b)) === 1, "확장 알림이 한 줄 쌓인다");
  const s2 = await settlePayment(ticket.providerPaymentId);
  check(s2.ok, "같은 웹훅이 또 와도 확정 상태 그대로");
  check((await outboxCount("upgrade_done", b)) === 1, "두 번째 수신에는 쌓지 않는다",
    `${await outboxCount("upgrade_done", b)}줄`);

  console.log("\n════════ 4. 대기열이 고장 났을 때 ════════");
  /**
   * 표를 통째로 못 쓰게 만들고 결제를 한 번 더 돌린다. 여기서 결제가
   * 실패하면 **알림이 새 고장점이 된 것**이고, 그건 자동화가 아니다.
   */
  const c = await student("outbox-c@example.com");
  const at2 = await finishFree(c);
  await query(`ALTER TABLE outbox RENAME TO outbox_hidden`);
  let settled = false;
  try {
    const { ticket: t2 } = await startCheckout(c, "HS_UPGRADE", "http://localhost:3000", "domestic", at2);
    await markMockPaid({
      providerPaymentId: t2.providerPaymentId, status: "paid", amount: t2.amount,
      currency: t2.currency, method: "CARD", orderNo: t2.orderNo, raw: {},
    });
    const r = await settlePayment(t2.providerPaymentId);
    settled = r.ok;
    const g = await queryOne<{ n: number }>(
      `SELECT count(*)::int AS n FROM report_grants WHERE attempt_id = $1`, [at2]);
    check(settled && g!.n === 1, "대기열이 없어도 결제가 확정되고 결과지가 열린다",
      settled ? "" : (r.ok ? "" : r.reason));
  } finally {
    await query(`ALTER TABLE outbox_hidden RENAME TO outbox`);
  }

  console.log("\n════════ 5·6. 내보내기 ════════");
  const before = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE status = 'queued'`);
  const hadMail = process.env.MAIL_HOST;
  delete process.env.MAIL_HOST;
  const f1 = await flushOutbox(100);
  const after = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE status = 'queued'`);
  check(f1.sent === 0 && f1.held > 0, "자격증명이 없으면 보내지 않고 들고 있는다",
    `보냄 ${f1.sent} · 들고 있음 ${f1.held}`);
  // 보낼 곳이 있는 줄은 그대로 남아야 한다. 주소가 없는 줄만 접힌다
  check(after!.n > 0 && after!.n <= before!.n, "보낼 곳이 있는 줄은 그대로 남는다",
    `${before!.n} → ${after!.n}`);

  const d = await student("outbox-d@example.com");
  await query(`UPDATE users SET email = NULL WHERE id = $1`, [d]);   // 익명화된 사람
  await enqueue({ kind: "signup", userId: d, dedupeKey: `signup:gone:${d}` });
  await flushOutbox(100);
  const gone = await queryOne<{ status: string }>(
    `SELECT status FROM outbox WHERE dedupe_key = $1`, [`signup:gone:${d}`]);
  check(gone?.status === "skipped", "보낼 곳이 없는 줄은 조용히 접는다", gone?.status ?? "없음");
  if (hadMail) process.env.MAIL_HOST = hadMail;

  console.log("\n════════ 7. 코드 재고 경고 ════════");
  const today = new Date().toISOString().slice(0, 10);
  await query(`DELETE FROM outbox WHERE kind = 'code_low'`);
  await query(`UPDATE redemption_codes SET voided_at = now() WHERE used_at IS NULL AND voided_at IS NULL`);
  const low1 = await checkCodeStock();
  const low2 = await checkCodeStock();
  const warn = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE kind = 'code_low'`);
  check(low1.length === low2.length, "같은 재고를 두 번 봐도 같은 판단");
  check((warn?.n ?? 0) === low1.length, "하루에 상품마다 한 줄만 쌓인다",
    `${warn?.n ?? 0}줄 / 모자란 상품 ${low1.length}개`);
  await query(`DELETE FROM outbox WHERE dedupe_key LIKE $1`, [`code_low:%:${today}`]);

  console.log(failed
    ? `\n${failed}개 실패.`
    : "\n대기열 OK — 알림은 돈길 옆에 있지, 그 위에 있지 않다.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
