/**
 * 익명화가 실제로 무엇을 지우고 무엇을 남기는지 DB 로 확인한다.
 *
 * 확인하는 것.
 *   1. 이름·이메일·아이디가 사라지는가
 *   2. 그 비밀번호로 다시 못 들어오는가
 *   3. 결제 기록이 남는가 (전자상거래법 5년)
 *   4. 응시·점수가 남아 학과 집계가 흔들리지 않는가
 *   5. 증거·프로필 같은 준식별자가 사라지는가
 *   6. 두 번 돌려도 탈이 없는가
 */
import { query, queryOne } from "../../src/lib/db";
import { hashPassword, verifyPassword } from "../../src/lib/password";
import { anonymizeUser, isErased } from "../../src/lib/erasure";
import { startCheckout, settlePayment } from "../../src/lib/orders";
import { markMockPaid } from "../../src/lib/payments";
import { openAttempt, questionPage, saveResponse, submitAttempt, PAGE_SIZE } from "../../src/lib/attempts";
import { score } from "../../src/lib/scoring";
import { addEvidence, competencies } from "../../src/lib/evidence";

const PW = "erase-pass-1234";
const n = async (sql: string, p: unknown[] = []) =>
  (await queryOne<{ n: number }>(sql, p))!.n;

async function main() {
  await query(`DELETE FROM users WHERE email = 'erase@example.com'`);
  const hash = await hashPassword(PW);
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, must_reset_pw, status)
     VALUES ('erase@example.com','지울사람',$1,false,'active') RETURNING id`, [hash]);
  const uid = u!.id;

  // 결제하고, 응시하고, 증거까지 넣어 둔다 — 지울 거리를 다 만든다
  const { ticket } = await startCheckout(uid, "REPORT_UNIV", "http://localhost:3000", "domestic");
  await markMockPaid({ providerPaymentId: ticket.providerPaymentId, status: "paid",
    amount: ticket.amount, currency: ticket.currency, orderNo: ticket.orderNo, raw: {} });
  await settlePayment(ticket.providerPaymentId);

  const a = (await openAttempt(uid))!;
  for (let p = 1; p <= Math.ceil(a.total / PAGE_SIZE); p++) {
    for (const q of await questionPage(a, p)) {
      const v = q.itemKind === "attention"
        ? (await queryOne<{ e: number }>(`SELECT attention_expect AS e FROM questions WHERE id=$1`, [q.id]))!.e
        : 3;
      await saveResponse(a.id, uid, q.id, q.options.find(o => o.orderNo === v)!.id, 5000);
    }
  }
  await submitAttempt(a.id, uid);
  await score(a.id);

  const comp = (await competencies(uid))[0];
  await addEvidence(uid, { competencyId: comp.id, sourceCode: "COURSE", refLabel: "전산구조해석", grade: "A+" });
  await query(`INSERT INTO learner_profiles (user_id, track_code, goal_code, country, region_code)
               VALUES ($1,'UNIV_LOW','any','KR','30') ON CONFLICT (user_id) DO NOTHING`, [uid]);

  const before = {
    주문: await n(`SELECT count(*)::int AS n FROM orders WHERE user_id=$1`, [uid]),
    응시: await n(`SELECT count(*)::int AS n FROM attempts WHERE user_id=$1`, [uid]),
    응답: await n(`SELECT count(*)::int AS n FROM responses r JOIN attempts a ON a.id=r.attempt_id WHERE a.user_id=$1`, [uid]),
    점수: await n(`SELECT count(*)::int AS n FROM job_fit_scores f JOIN attempts a ON a.id=f.attempt_id WHERE a.user_id=$1`, [uid]),
    증거: await n(`SELECT count(*)::int AS n FROM learner_evidence WHERE user_id=$1`, [uid]),
    프로필: await n(`SELECT count(*)::int AS n FROM learner_profiles WHERE user_id=$1`, [uid]),
    좌석: await n(`SELECT count(*)::int AS n FROM seats WHERE user_id=$1`, [uid]),
  };
  console.log("익명화 전:", JSON.stringify(before, null, 0));

  const res = await anonymizeUser(uid, { requestedBy: "self", reason: "withdraw" });
  console.log("지운 것 :", JSON.stringify(res.removed));

  const after = {
    주문: await n(`SELECT count(*)::int AS n FROM orders WHERE user_id=$1`, [uid]),
    응시: await n(`SELECT count(*)::int AS n FROM attempts WHERE user_id=$1`, [uid]),
    응답: await n(`SELECT count(*)::int AS n FROM responses r JOIN attempts a ON a.id=r.attempt_id WHERE a.user_id=$1`, [uid]),
    점수: await n(`SELECT count(*)::int AS n FROM job_fit_scores f JOIN attempts a ON a.id=f.attempt_id WHERE a.user_id=$1`, [uid]),
    증거: await n(`SELECT count(*)::int AS n FROM learner_evidence WHERE user_id=$1`, [uid]),
    프로필: await n(`SELECT count(*)::int AS n FROM learner_profiles WHERE user_id=$1`, [uid]),
    좌석: await n(`SELECT count(*)::int AS n FROM seats WHERE user_id=$1`, [uid]),
  };
  console.log("익명화 후:", JSON.stringify(after, null, 0));

  const row = await queryOne<{ email: string | null; login_id: string | null; display_name: string;
                              status: string; password_hash: string; erased_at: string | null }>(
    `SELECT email, login_id, display_name, status, password_hash, erased_at FROM users WHERE id=$1`, [uid]);
  console.log(`\n식별자 — 이메일 ${row!.email ?? "없음"} · 아이디 ${row!.login_id ?? "없음"} · 이름 "${row!.display_name}"`);
  console.log(`상태 ${row!.status} · 익명화 시각 ${row!.erased_at ? "기록됨" : "없음"}`);
  console.log(`예전 비밀번호로 로그인: ${await verifyPassword(PW, row!.password_hash) ? "된다 (막았어야 한다)" : "안 된다"}`);

  const log = await queryOne<{ removed: unknown; kept: unknown; requested_by: string }>(
    `SELECT removed, kept, requested_by FROM erasure_log WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [uid]);
  console.log(`파기 기록: ${log ? "남음 (" + log.requested_by + ")" : "없음 (남겨야 한다)"}`);
  const leak = JSON.stringify(log);
  console.log(`기록에 개인정보 섞였나: ${leak.includes("erase@example.com") || leak.includes("지울사람") ? "섞임 (안 된다)" : "없음"}`);

  console.log(`\n두 번째 실행: ${JSON.stringify((await anonymizeUser(uid)).removed)} (빈 객체여야 한다)`);
  console.log(`isErased: ${await isErased(uid)}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
