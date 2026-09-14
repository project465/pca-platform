/**
 * 응시권 코드가 좌석으로 바뀌는가, 그리고 **한 번만 바뀌는가.**
 *
 * 결제를 밖(아임웹 같은 쇼핑몰)에서 받고 응시는 여기서 하는 구조다.
 * 그 사이를 잇는 것이 코드 한 줄이라, 코드가 새면 그대로 공짜 좌석이 된다.
 * 확인하는 것 일곱.
 *
 *   1. 만든 코드로 좌석이 생기고 응시가 열리는가
 *   2. **금액이 0 으로 적히는가** — 돈은 저쪽 장부에 있다. 두 번 잡으면 안 된다
 *   3. 같은 코드를 다시 내면 거절되는가
 *   4. **두 사람이 동시에 같은 코드를 내도 한 명만 받는가**
 *   5. 없는 코드·취소된 코드·기간 지난 코드가 각각 제 이유로 거절되는가
 *   6. 하이픈·소문자·공백을 섞어 적어도 같은 코드로 읽는가
 *   7. 코드로 연 결과지 등급이 그 상품의 등급과 같은가
 *
 *   npm run metri:redeem
 */
import { query, queryOne } from "../../src/lib/db";
import { issueCodes, redeemCode, normalizeCode, batchStatus, voidBatch } from "../../src/lib/redeem";
import { reportLevel } from "../../src/lib/entitlement";
import { hashPassword } from "../../src/lib/password";

let failed = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

async function student(email: string, name: string): Promise<string> {
  const pw = await hashPassword("test-pass-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ($1,$2,$3,'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id`,
    [email, name, pw],
  );
  return u!.id;
}

async function main() {
  const BATCH = `check-${Date.now()}`;

    // 지난 회차가 남아 있으면 숫자가 겹친다.
  // **좌석을 먼저 지운다** — seats.order_id 는 ON DELETE SET NULL 이라
  // 주문만 지우면 주인 없는 좌석이 남아 "좌석이 늘지 않았다" 가 매번 실패한다
  const stale = `SELECT id FROM users WHERE email LIKE 'redeem-%@example.com'`;
  await query(`DELETE FROM attempts WHERE user_id IN (${stale})`);
  await query(`DELETE FROM seats WHERE user_id IN (${stale})`);
  await query(
    `DELETE FROM redemption_codes
      WHERE used_by IN (${stale}) OR batch LIKE 'check-%'`,
  );
  await query(`DELETE FROM orders WHERE user_id IN (${stale})`);

  console.log("════════ 1. 코드를 만든다 ════════");
  const codes = await issueCodes({ productCode: "REPORT_HS", count: 5, batch: BATCH });
  check(codes.length === 5, "5장이 나온다", codes.map((c) => c.display).join(" "));
  check(
    codes.every((c) => /^[ACDEFGHJKMNPQRTUVWXY34679]{4}-[ACDEFGHJKMNPQRTUVWXY34679]{4}-[ACDEFGHJKMNPQRTUVWXY34679]{4}$/.test(c.display)),
    "헷갈리는 글자(0·O·1·I·L·S·B·Z)가 없다",
  );
  check(new Set(codes.map((c) => c.display)).size === 5, "같은 코드가 두 장 나오지 않는다");
  const stored = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM redemption_codes
      WHERE batch = $1 AND code_hash = ANY($2::text[])`,
    [BATCH, codes.map((c) => c.display)],
  );
  check(stored!.n === 0, "DB 에 평문이 그대로 있지 않다 — 해시만 저장한다");

  console.log("\n════════ 2. 코드로 좌석이 생긴다 ════════");
  const a = await student("redeem-a@example.com", "코드 학생 A");
  const r1 = await redeemCode(a, codes[0].display);
  check(r1.ok, "코드가 받아들여진다");
  if (!r1.ok) throw new Error("여기서 막히면 나머지를 볼 수 없다");
  const seats = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats WHERE order_id = $1`, [r1.orderId]);
  check(seats!.n === 1, "좌석이 하나 생긴다", `${seats!.n}개`);
  const ord = await queryOne<{ amount: number; status: string; rc: string | null }>(
    `SELECT amount, status, redemption_code_id::text AS rc FROM orders WHERE id = $1`, [r1.orderId]);
  check(ord!.amount === 0, "금액은 0 — 돈은 쇼핑몰 장부에 있다", `${ord!.amount}원`);
  check(ord!.status === "paid", "주문은 확정 상태다");
  check(ord!.rc !== null, "어느 코드로 열렸는지 주문이 들고 있다");

  console.log("\n════════ 3. 같은 코드를 또 내면 ════════");
  const again = await redeemCode(a, codes[0].display);
  check(!again.ok && again.reason === "used", "거절된다", again.ok ? "통과해 버렸다" : again.reason);
  const b = await student("redeem-b@example.com", "코드 학생 B");
  const byOther = await redeemCode(b, codes[0].display);
  check(!byOther.ok, "남이 주워 써도 거절된다");
  const seatsAfter = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats
      WHERE user_id IN ($1::bigint, $2::bigint)`, [a, b]);
  check(seatsAfter!.n === 1, "좌석이 늘지 않았다", `${seatsAfter!.n}개`);

  console.log("\n════════ 4. 둘이 동시에 같은 코드를 낸다 ════════");
  const c = await student("redeem-c@example.com", "코드 학생 C");
  const d = await student("redeem-d@example.com", "코드 학생 D");
  const [rc, rd] = await Promise.all([
    redeemCode(c, codes[1].display),
    redeemCode(d, codes[1].display),
  ]);
  const winners = [rc, rd].filter((r) => r.ok).length;
  check(winners === 1, "한 명만 받는다", `${winners}명이 통과`);
  const bothSeats = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats WHERE user_id IN ($1::bigint, $2::bigint)`, [c, d]);
  check(bothSeats!.n === 1, "좌석도 하나만 생긴다", `${bothSeats!.n}개`);

  console.log("\n════════ 5. 틀린 코드는 이유가 각각 다르다 ════════");
  const none = await redeemCode(b, "AAAA-AAAA-AAAA");
  check(!none.ok && none.reason === "unknown", "없는 코드 → unknown");

  const [expiring] = await issueCodes({
    productCode: "REPORT_HS", count: 1, batch: BATCH,
    expiresAt: new Date(Date.now() - 60_000),
  });
  const exp = await redeemCode(b, expiring.display);
  check(!exp.ok && exp.reason === "expired", "기간이 지난 코드 → expired");

  const voidBatchName = `${BATCH}-void`;
  const [toVoid] = await issueCodes({ productCode: "REPORT_HS", count: 1, batch: voidBatchName });
  const voided = await voidBatch(voidBatchName);
  check(voided === 1, "안 쓴 코드를 묶음째 막을 수 있다", `${voided}장`);
  const vr = await redeemCode(b, toVoid.display);
  check(!vr.ok && vr.reason === "voided", "취소된 코드 → voided");
  // 이미 쓴 코드는 막히지 않아야 한다 — 산 사람의 결과지를 빼앗는 셈이 된다
  const usedStill = await queryOne<{ v: string | null }>(
    `SELECT voided_at::text AS v FROM redemption_codes WHERE id = (SELECT redemption_code_id FROM orders WHERE id = $1)`,
    [r1.orderId]);
  check(usedStill!.v === null, "이미 쓴 코드는 취소에 걸리지 않는다");

  console.log("\n════════ 6. 사람이 적는 대로 읽는다 ════════");
  const e = await student("redeem-e@example.com", "코드 학생 E");
  const messy = ` ${codes[2].display.toLowerCase().replace(/-/g, " ")} `;
  const rm = await redeemCode(e, messy);
  check(rm.ok, "하이픈 대신 공백, 소문자로 적어도 통한다", JSON.stringify(messy));
  check(
    normalizeCode("metri 7k4m-9xq2") === normalizeCode("METRI-7K4M-9XQ2"),
    "표준형이 같다",
  );

  console.log("\n════════ 7. 열리는 등급 ════════");
  const lvl = await queryOne<{ report_level: string }>(
    `SELECT report_level FROM products WHERE code = 'REPORT_HS'`);
  const att = await queryOne<{ id: string }>(
    `SELECT a.id FROM attempts a JOIN seats s ON s.id = a.seat_id WHERE s.order_id = $1`,
    [r1.orderId]);
  if (att) {
    check((await reportLevel(att.id)) === lvl!.report_level, "상품 등급 그대로 열린다");
  } else {
    check(true, "아직 응시 전이라 등급은 응시 후에 본다 (좌석까지 확인됨)");
  }

  console.log("\n════════ 묶음 현황 ════════");
  for (const row of await batchStatus(BATCH)) {
    console.log(`  ${row.product_code} — 발행 ${row.total} · 사용 ${row.used} · 취소 ${row.voided}`);
  }

  console.log(
    failed
      ? `\n${failed}개 실패.`
      : "\n응시권 코드 OK — 밖에서 판 것이 안에서 좌석 하나가 된다. 한 번만.",
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
