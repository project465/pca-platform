/**
 * 무료 구간과 유료 구간을 가르는 한 곳.
 *
 * 커리어메트리 플러스가 파는 것은 지표가 아니라 사슬이다. 지표(115문항 →
 * 8계열 적합)는 커리어넷·워크넷이 무료로 주는 층이고, 규준이 없어서
 * "상위 몇 %" 를 말할 수도 없다. 규준 없이 팔 수 있는 것은 사슬 쪽이다 —
 * "구조해석 엔지니어가 하중 조건을 세운다" 는 그 학생의 점수가 조금
 * 틀려도 참이다.
 *
 * 등급을 정하는 순서가 중요하다.
 *
 *   1. report_grants 에 줄이 있으면 full — 무료로 보고 나중에 결제한 경우
 *   2. 학과·학교 단체 좌석(contract_id)이면 full — 학교가 사는 것이 사슬이다
 *   3. 응시 시점에 살아 있던 PASS 가 있으면 full
 *   4. 개인 결제 좌석이면 그 상품의 report_level
 *   5. 아무것도 없으면 free — 등급을 못 가리면 덜 주는 쪽으로 떨어진다
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
              -- 3. PASS. 기준은 **지금 시각이 아니라 응시 시각**이고,
              --    보는 것은 끝날 밖에 없다(a.started_at < e.ends_at).
              --
              --    지금 시각으로 보면 만료된 날 결과지가 닫혀, 돈을 낸
              --    기간에 받은 문서를 학생이 잃는다. 기간 동안 판 것은
              --    "그 기간에 검사할 권리" 이지 "그 기간에만 읽을 권리"
              --    가 아니다.
              --
              --    시작일을 안 보는 것도 일부러다. 무료로 먼저 풀어 보고
              --    PASS 를 산 학부모의 결과지가 안 열리면, 방금 79만원을
              --    낸 사람이 자기 아이 문서를 못 보는 일이 된다. 만료
              --    이후에 새로 본 응시는 끝날 조건에서 걸린다.
              WHEN EXISTS (SELECT 1 FROM entitlements e
                            WHERE e.user_id = a.user_id
                              AND e.kind = 'pass'
                              AND a.started_at < e.ends_at) THEN 'full'
              -- 4. 개인 결제 좌석 — 상품이 정한다
              WHEN p.report_level IS NOT NULL THEN p.report_level
              -- 5. 못 가리면 덜 주는 쪽
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

/**
 * PASS 를 발급한다 — 기간 동안 열리는 권한.
 *
 * 좌석을 주지 않는다. PASS 는 "이 기간에 검사를 볼 수 있다" 는 권한이고,
 * 실제 응시권은 회차마다 따로 발급한다. 여기서 좌석을 같이 주면 1년짜리
 * PASS 하나로 115문항을 무한히 풀 수 있게 되어 규준이 오염된다.
 *
 * 기간은 상품이 정한다(products.duration_days). 결제 화면에서 넘어온
 * 날짜를 쓰지 않는다 — 금액을 화면에서 받지 않는 것과 같은 이유다.
 */
export async function grantPass(
  userId: string,
  orderId: string,
): Promise<{ ok: true; endsAt: string } | { ok: false; reason: string }> {
  const row = await queryOne<{ code: string; days: number | null }>(
    `SELECT p.code, p.duration_days AS days
       FROM orders o
       JOIN products p ON p.code = o.product_code
      WHERE o.id = $1 AND o.user_id = $2 AND o.status = 'paid' AND p.kind = 'pass'`,
    [orderId, userId],
  );
  if (!row) return { ok: false, reason: "확정된 PASS 주문이 아닙니다." };
  if (!row.days) return { ok: false, reason: "기간이 정해지지 않은 상품입니다." };

  /**
   * 이미 살아 있는 PASS 가 있으면 그 끝에서 이어 붙인다.
   *
   * 지금부터 1년으로 덮어쓰면 남아 있던 기간이 사라져 산 것을 뺏는 셈이 된다.
   */
  const made = await queryOne<{ ends_at: string }>(
    `INSERT INTO entitlements (user_id, order_id, product_code, kind, starts_at, ends_at)
     SELECT $1, $2, $3, 'pass',
            COALESCE(MAX(e.ends_at), now()),
            COALESCE(MAX(e.ends_at), now()) + ($4 || ' days')::interval
       FROM entitlements e
      WHERE e.user_id = $1 AND e.kind = 'pass' AND e.ends_at > now()
     RETURNING ends_at`,
    [userId, orderId, row.code, String(row.days)],
  );
  if (!made) return { ok: false, reason: "PASS 를 발급하지 못했습니다." };
  return { ok: true, endsAt: made.ends_at };
}
