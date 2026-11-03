-- ============================================================
--  MAT 학교 단체 이용권 (6개월 · 1년)
--
--  **학교가 인원을 사고, 담당자가 그 안에서 학생에게 연다.** 돈은 계약으로
--  받는다(1인당 6개월 19,000원 · 1년 29,000원, 부가세 별도). 앱 안에서는
--  금액을 받지 않으므로 두 상품 모두 `amount = 0` 이고 `active = false`
--  다: 가격표와 결제창에 서지 않는다.
--
--  **권한은 개인 구매와 같은 한 줄이다**(`entitlements.kind = 'track'`).
--  그래서 학생 화면 · 알림 · 공고 확인이 고칠 곳 없이 그대로 열린다
--  (`activeTrack()` 이 상품을 가리지 않는다). 등급을 정하는 자리를 둘로
--  만들지 않는다(설계 원칙 10).
--
--  **검사 이용권으로 읽히지 않는다.** `tier` · `major_code` ·
--  `assessment_version` 을 비우고 좌석을 주지 않는다(`schema_track.sql` 과
--  같은 까닭이다).
-- ============================================================

INSERT INTO products
  (code, kind, amount, currency, seat_count, active, report_level,
   market, major_code, tier, assessment_version, price_status, duration_days)
VALUES
  ('CAMPUS_MAT_6M',  'track', 0, 'KRW', 0, false, 'full',
   'KR', NULL, NULL, NULL, 'approved', 183),
  ('CAMPUS_MAT_12M', 'track', 0, 'KRW', 0, false, 'full',
   'KR', NULL, NULL, NULL, 'approved', 365)
ON CONFLICT (code) DO UPDATE
  SET kind = EXCLUDED.kind, amount = 0, seat_count = 0, active = false,
      market = EXCLUDED.market, tier = NULL, major_code = NULL,
      assessment_version = NULL, price_status = EXCLUDED.price_status,
      duration_days = EXCLUDED.duration_days;

/* 학교가 산 묶음 하나. 운영자가 계약을 받고 적는다 */
CREATE TABLE IF NOT EXISTS campus_mat_pools (
  id               BIGSERIAL PRIMARY KEY,
  university_code  TEXT NOT NULL,
  product_code     TEXT NOT NULL REFERENCES products(code),
  seats            INTEGER NOT NULL CHECK (seats > 0 AND seats <= 20000),
  /* 이 날까지 담당자가 학생에게 열 수 있다. 연 학생의 기간은 연 날부터 센다 */
  grant_until      DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'closed')),
  memo             TEXT,
  created_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (product_code IN ('CAMPUS_MAT_6M', 'CAMPUS_MAT_12M'))
);
CREATE INDEX IF NOT EXISTS campus_mat_pools_uni_idx
  ON campus_mat_pools(university_code, status);

/* 이 기간 줄이 어느 묶음에서 나갔는가. 남은 인원은 이 칸으로 센다 */
ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS campus_pool_id BIGINT
    REFERENCES campus_mat_pools(id) ON DELETE SET NULL;

/* **한 묶음에서 한 사람에게 한 번이다.** 담당자가 단추를 두 번 눌러도,
   두 담당자가 같은 순간에 눌러도 줄은 하나다. 읽고 나서 쓰는 검사로는
   동시 요청을 막을 수 없어 제약으로 둔다 */
CREATE UNIQUE INDEX IF NOT EXISTS entitlements_campus_pool_uniq
  ON entitlements(user_id, campus_pool_id) WHERE campus_pool_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS entitlements_campus_pool_idx
  ON entitlements(campus_pool_id) WHERE campus_pool_id IS NOT NULL;

COMMENT ON TABLE campus_mat_pools IS
  'MAT 학교 단체 이용권 묶음. 금액은 계약으로 받고 여기에는 인원과 기간만 적는다';
