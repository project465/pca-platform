-- ============================================================
--  CareerMatri Track — 1단계 (기간권 두 가지)
--
--  **자동 갱신하지 않는다.** 30일권과 365일권을 한 번씩 판다. 정기결제
--  (빌링키)는 PG 계약과 중도 해지·정산 규칙이 먼저 정해져야 하고, 그 전에
--  카드를 매달 긁는 길을 열면 해지를 못 찾은 사람의 돈이 나간다.
--
--  **표를 새로 만들지 않는다.** 상품은 `products` 한 줄이고 권한은
--  `entitlements.kind = 'track'` 한 줄이다(`schema_v3_arch.sql` 이 그 값을
--  이미 받는다). 등급을 정하는 자리가 둘이 되지 않게 한다(설계 원칙 10).
--
--  **검사 이용권으로 읽히지 않게 한다.** 세 칸을 비워 둔다: `tier` ·
--  `major_code` · `assessment_version`. 응시를 여는 쪽(`v3Grants` ·
--  `openGrants`)이 `assessment_version` 으로 이용권을 고르므로, 이 칸이
--  비어 있으면 Track 을 산 사람이 검사를 한 번 더 풀 길이 생기지 않는다.
--  좌석도 주지 않는다(`seat_count = 0`): 같은 사람의 응답이 두 벌 쌓이면
--  규준이 오염된다.
-- ============================================================

INSERT INTO products
  (code, kind, amount, currency, seat_count, active, report_level,
   market, major_code, tier, assessment_version, price_status, duration_days)
VALUES
  ('TRACK_30D',  'track',  4900, 'KRW', 0, true, 'full',
   'KR', NULL, NULL, NULL, 'approved',  30),
  ('TRACK_365D', 'track', 39000, 'KRW', 0, true, 'full',
   'KR', NULL, NULL, NULL, 'approved', 365),
  /* **PRO 결과지를 산 분의 첫 한 달.** 팔지 않는다(`active = false`):
     가격표와 결제창에 서지 않고, 이용권이 가리킬 자리만 있다. 금액이
     0 인 것은 PRO 값 안에 들어 있어서다 */
  ('TRACK_PRO_TRIAL', 'track', 0, 'KRW', 0, false, 'full',
   'KR', NULL, NULL, NULL, 'approved', 30)
ON CONFLICT (code) DO UPDATE
  SET kind = EXCLUDED.kind, amount = EXCLUDED.amount,
      seat_count = EXCLUDED.seat_count, active = EXCLUDED.active,
      market = EXCLUDED.market, tier = NULL, major_code = NULL,
      assessment_version = NULL, price_status = EXCLUDED.price_status,
      duration_days = EXCLUDED.duration_days;

/* **첫 한 달은 사람마다 한 번이다.** 결제 확정 코드가 먼저 보고 넣지만,
   같은 사람의 PRO 결제 둘이 같은 순간에 확정되면 둘 다 통과한다. 읽고
   나서 쓰는 검사로는 막을 수 없어 제약으로 둔다 */
CREATE UNIQUE INDEX IF NOT EXISTS entitlements_track_trial_uniq
  ON entitlements(user_id) WHERE product_code = 'TRACK_PRO_TRIAL';

/* 지금 살아 있는 Track 을 고르는 자리. `activeTrack()` 이 매 쪽마다 묻는다 */
CREATE INDEX IF NOT EXISTS entitlements_track_live_idx
  ON entitlements(user_id, ends_at DESC) WHERE kind = 'track';

COMMENT ON INDEX entitlements_track_trial_uniq IS
  'PRO 구매 첫 한 달 Track 은 사람마다 한 번. 동시 확정을 DB 에서 막는다';
