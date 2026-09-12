/**
 * 무료 구간과 유료 구간을 가르는 한 곳.
 *
 * 메트리 플러스가 파는 것은 지표가 아니라 사슬이다. 지표(115문항 →
 * 8계열 적합)는 커리어넷·워크넷이 무료로 주는 층이고, 규준이 없어서
 * "상위 몇 %" 를 말할 수도 없다. 규준 없이 팔 수 있는 것은 사슬 쪽이다 —
 * "구조해석 엔지니어가 하중 조건을 세운다" 는 그 학생의 점수가 조금
 * 틀려도 참이다.
 *
 * 등급을 정하는 순서가 중요하다.
 *
 *   1. report_grants 에 줄이 있으면 full — 무료로 보고 나중에 결제한 경우
 *   2. 학과·학교 단체 좌석(contract_id)이면 full — 학교가 사는 것이 사슬이다
 *   3. 개인 결제 좌석이면 그 상품의 report_level
 *   4. 아무것도 없으면 free — 등급을 못 가리면 덜 주는 쪽으로 떨어진다
 *
 * 4번이 기본값인 이유: 새 결제 경로를 잘못 배선하면 유료 구간이 공짜로
 * 나가는데, 그건 조용히 돈이 새는 쪽이라 눈에 안 띈다. 반대로 떨어지면
 * 학생이 바로 문의한다.
 */
import { query, queryOne } from "./db";

export type ReportLevel = "free" | "full";

/** 이 응시가 어느 구간까지 열리는가. 응시가 없으면 null */
export async function reportLevel(attemptId: string): Promise<ReportLevel | null> {
  const row = await queryOne<{ level: ReportLevel | null }>(
    `SELECT CASE
              -- 1. 무료로 보고 나중에 결제한 응시
              WHEN EXISTS (SELECT 1 FROM report_grants g
                            WHERE g.attempt_id = a.id AND g.level = 'full') THEN 'full'
              -- 2. 학과·학교 단체 좌석. 학교가 사는 것이 바로 사슬이다
              WHEN s.contract_id IS NOT NULL THEN 'full'
              -- 3. 개인 결제 좌석 — 상품이 정한다
              WHEN p.report_level IS NOT NULL THEN p.report_level
              -- 4. 못 가리면 덜 주는 쪽
              ELSE 'free'
            END AS level
       FROM attempts a
       LEFT JOIN seats s    ON s.id = a.seat_id
       LEFT JOIN orders o   ON o.id = s.order_id
       LEFT JOIN products p ON p.code = o.product_code
      WHERE a.id = $1`,
    [attemptId],
  );
  return row ? (row.level ?? "free") : null;
}

/**
 * 무료로 본 응시를 유료 구간까지 연다.
 *
 * 같은 응시를 연다 — 115문항을 다시 풀게 하면 아무도 결제하지 않는다.
 * 결제가 확정된 주문만 통과시킨다. `paid` 가 아닌 주문으로 열리면
 * 결제 창을 닫아 버린 사람에게 유료 구간이 나간다.
 */
export async function grantFull(attemptId: string, orderId: string, userId: string): Promise<boolean> {
  const ok = await queryOne<{ id: string }>(
    `SELECT o.id
       FROM orders o
       JOIN products p ON p.code = o.product_code
       JOIN attempts a ON a.id = $2 AND a.user_id = o.user_id
      WHERE o.id = $1 AND o.user_id = $3
        AND o.status = 'paid' AND p.report_level = 'full'`,
    [orderId, attemptId, userId],
  );
  if (!ok) return false;
  await query(
    `INSERT INTO report_grants (attempt_id, order_id, level)
     VALUES ($1, $2, 'full')
     ON CONFLICT (attempt_id) DO NOTHING`,
    [attemptId, orderId],
  );
  return true;
}
