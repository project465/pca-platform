/**
 * ME_V1(253문항)을 실제로 쓰는 곳이 있는가. **읽기만 한다.**
 *
 * 2026-10-07 결정: ME_V1 을 바로 지우지 않는다. 신규 판매와 신규 진입만
 * 막고 기존 결과의 열람과 재현을 남긴다. 다만 **archive 로 넘길 수 있는지**
 * 는 실사용이 있는지 보고 정한다.
 *
 * 보는 다섯 자리다. 계약 · 활성 회차 · 최근 응시 · 기존 결과 링크 ·
 * 홈페이지의 학과 결과지 예시.
 *
 * **한 줄도 쓰지 않는다.** `UPDATE` 와 `INSERT` 가 이 파일에 없고,
 * 판정도 적지 않는다. 숫자를 보고 사람이 정한다.
 *
 * ME_V1 응시를 가리는 방법: `responses` 에 줄이 있는 응시가 ME_V1 이고
 * `v2_responses` 에 줄이 있는 응시가 ME_V2 다. 두 표를 나눠 둔 것이
 * 그 자체로 판본 표시다(설계 원칙 8).
 *
 *   DATABASE_URL=<운영> npm run v1:audit
 */
import { readFileSync, existsSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";

type Row = { 자리: string; 값: string; 뜻: string };
const rows: Row[] = [];
function add(자리: string, 값: string | number, 뜻: string): void {
  rows.push({ 자리, 값: String(값), 뜻 });
}

async function one<T extends Record<string, unknown>>(sql: string): Promise<T | null> {
  try {
    return await queryOne<T>(sql, []);
  } catch (e) {
    rows.push({ 자리: "못 봄", 값: "-", 뜻: (e as Error).message.slice(0, 80) });
    return null;
  }
}

async function dbPart(): Promise<void> {
  const v1 = await one<{ n: string }>(
    `SELECT count(DISTINCT attempt_id)::text AS n FROM responses`);
  add("ME_V1 응시 전체", v1?.n ?? "?", "responses 에 줄이 있는 응시");

  const v2 = await one<{ n: string }>(
    `SELECT count(DISTINCT attempt_id)::text AS n FROM v2_responses`);
  add("ME_V2 응시 전체", v2?.n ?? "?", "v2_responses 에 줄이 있는 응시");

  const recent = await one<{ n: string; last: string | null }>(
    `SELECT count(*)::text AS n, max(a.started_at)::text AS last
       FROM attempts a
      WHERE EXISTS (SELECT 1 FROM responses r WHERE r.attempt_id = a.id)
        AND a.started_at > now() - interval '90 days'`);
  add("최근 90일 ME_V1 응시", recent?.n ?? "?", "0 이면 사람이 안 쓰고 있다");
  add("마지막 ME_V1 응시 시각", recent?.last ?? "없음", "언제 마지막으로 쓰였는가");

  const sessions = await one<{ open: string; total: string }>(
    `SELECT count(*) FILTER (WHERE s.closes_at > now())::text AS open,
            count(*)::text AS total
       FROM test_sessions s
      WHERE EXISTS (SELECT 1 FROM attempts a
                     WHERE a.session_id = s.id
                       AND EXISTS (SELECT 1 FROM responses r WHERE r.attempt_id = a.id))`);
  add("ME_V1 회차 전체", sessions?.total ?? "?", "응시가 한 건이라도 있는 회차");
  add("아직 열려 있는 회차", sessions?.open ?? "?", "0 이 아니면 지금 응시할 수 있다");

  const contracts = await one<{ n: string; orgs: string }>(
    `SELECT count(DISTINCT c.id)::text AS n,
            count(DISTINCT c.org_id)::text AS orgs
       FROM contracts c
       JOIN test_sessions s ON s.contract_id = c.id
      WHERE EXISTS (SELECT 1 FROM attempts a
                     WHERE a.session_id = s.id
                       AND EXISTS (SELECT 1 FROM responses r WHERE r.attempt_id = a.id))`);
  add("ME_V1 을 쓴 계약", contracts?.n ?? "?", "0 이면 학과 계약이 이것을 안 쓴다");
  add("그 계약의 기관 수", contracts?.orgs ?? "?", "사람이 연락할 곳의 수");

  /* `seats` 는 상품 코드를 직접 들고 있지 않다. 주문을 거쳐 본다 */
  const seats = await one<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM seats st
       LEFT JOIN orders o ON o.id = st.order_id
      WHERE st.status IN ('available', 'invited', 'claimed')
        AND (o.product_code LIKE 'UNIV%' OR o.product_code = 'REPORT_UNIV')`);
  add("안 쓴 UNIV 좌석", seats?.n ?? "?", "0 이 아니면 산 사람이 쓸 자리가 남아 있다");

  /* 학과 계약으로 나간 좌석은 주문이 없다. 계약 쪽으로 한 번 더 본다 */
  const cseats = await one<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM seats st
      WHERE st.status IN ('available', 'invited', 'claimed')
        AND st.contract_id IS NOT NULL AND st.order_id IS NULL`);
  add("안 쓴 계약 좌석", cseats?.n ?? "?", "학과가 사 두고 아직 안 쓴 자리");

  const snaps = await one<{ n: string }>(
    `SELECT count(*)::text AS n FROM report_snapshots
      WHERE assessment_version NOT LIKE 'ME_V2%'
        AND assessment_version NOT LIKE 'ME_V3%'`);
  add("ME_V1 결과 스냅샷", snaps?.n ?? "?", "열람과 재현을 남겨야 하는 결과의 수");

  const prod = await query<{ code: string; active: boolean; amount: number }>(
    `SELECT code, active, amount FROM products
      WHERE code LIKE 'UNIV%' OR code LIKE 'REPORT_UNIV%' ORDER BY code`, []).catch(() => []);
  for (const p of prod) {
    add(`상품 ${p.code}`, p.active ? "켜짐" : "꺼짐", `금액 ${p.amount}`);
  }
}

/** 홈페이지에 ME_V1 출력이 예시로 남아 있는가. DB 없이도 본다 */
function sitePart(): void {
  const f = "marketing/src/content/kr.ts";
  if (!existsSync(f)) {
    add("홈페이지 학과 결과지 예시", "못 봄", f);
    return;
  }
  const body = readFileSync(f, "utf8");
  const marks = [
    ["직무 적합도", /직무\s*적합도/],
    ["100점 척도", /100점/],
    ["1군 묶음", /tierLabel|\{n\}군/],
    ["업무 성향 여섯", /styleAxes/],
  ] as const;
  for (const [name, re] of marks) {
    add(`홈페이지 · ${name}`, re.test(body) ? "있다" : "없다",
        "ME_V1 이 계산하는 값이다. V1 을 접으면 같이 내린다");
  }
}

async function main(): Promise<void> {
  console.log("ME_V1 실사용 감사 — 읽기만 합니다\n");
  sitePart();
  if (process.env.DATABASE_URL) {
    await dbPart();
  } else {
    add("DB", "못 봄", "DATABASE_URL 이 없습니다. 운영 DB 에서 한 번 돌리십시오");
  }

  const w = Math.max(...rows.map((r) => r.자리.length));
  for (const r of rows) {
    console.log(`  ${r.자리.padEnd(w)}  ${r.값.padEnd(22)}  ${r.뜻}`);
  }
  console.log(
    "\n판정은 사람이 합니다. 계약과 열린 회차와 안 쓴 좌석이 전부 0 이면\n" +
    "archive 로 넘길 수 있고, 그때 홈페이지의 학과 결과지 예시도 내립니다.",
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
