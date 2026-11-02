-- ============================================================
--  MAT 이 Claude 를 부를 때마다 한 줄 (2026-11-02 대표 결정 "MAT 에 AI 킬꺼야")
--
--  **무엇을 하려고 두는가**
--  - 학생 한 사람 · 기능 하나가 실제로 얼마를 쓰는지 본다(원가 · 가격 다시 보기)
--  - 서버 하루 총비용 상한: 오늘 합이 `MAT_AI_DAILY_USD` 를 넘으면 그날은 규칙으로 읽는다
--  - 기간권 한 장의 기능별 횟수 상한(`ai-budget.ts`)
--
--  **적지 않는 것**: 묻는 글 · 답 · 공고 글 · 파일 이름. 토큰 수와 결과 종류만 적는다.
--
--  **표를 따로 둔다**: 이 파일을 올리기 전에도 MAT 은 그대로 돈다. 쓰는 쪽은 표가 없으면
--  적지 않고, 상한을 세지 못하므로 막지도 않는다(열쇠를 넣기 전에 이 표를 먼저 세운다).
-- ============================================================

CREATE TABLE IF NOT EXISTS assistant_ai_calls (
  id                 BIGSERIAL PRIMARY KEY,
  /* 계정을 지워도 원가 줄은 남긴다. 사람과의 이음만 끊는다 */
  user_id            BIGINT REFERENCES users(id) ON DELETE SET NULL,
  op                 TEXT NOT NULL,
  model              TEXT NOT NULL,
  effort             TEXT,
  outcome            TEXT NOT NULL CHECK (outcome IN ('ok', 'refusal', 'rate', 'timeout', 'error', 'parse')),
  input_tokens       INTEGER NOT NULL DEFAULT 0,
  output_tokens      INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd           NUMERIC(12, 6) NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assistant_ai_calls_day_idx ON assistant_ai_calls (created_at);
CREATE INDEX IF NOT EXISTS assistant_ai_calls_user_idx ON assistant_ai_calls (user_id, op, created_at DESC);

-- ============================================================
--  MAT 추가 이용권 (2026-11-02 대표 "2900원에 1개만 쓸 수 있는 것이 아니고 처음 구매했을때처럼
--  다 이용할 수 있어야", 값은 4,900원으로 정함)
--
--  - 한 번 사면 기능을 한꺼번에 다시 채운다: 공고 10 · 지원서 문장 5 · 면접 1번(8턴) · 파일 5
--  - 여러 번 살 수 있다. **기간은 늘지 않는다**: 지금 쓰는 개인 30일권 · 90일권이 끝나는 날 같이 끝난다
--  - 이용권이 없으면 살 수 없고, 학교 좌석으로 쓰는 사람에게는 팔지 않는다(`startCheckout`)
--  - 기간권과 따로 둔다(`entitlements` 에 넣으면 `activeTrack` 이 기간을 늘린 것으로 읽는다)
-- ============================================================

INSERT INTO products
  (code, kind, amount, currency, seat_count, active, report_level,
   market, major_code, tier, assessment_version, price_status, duration_days)
VALUES
  ('MAT_REFILL', 'track_refill', 4900, 'KRW', 0, true, 'full',
   'KR', NULL, NULL, NULL, 'approved', NULL)
ON CONFLICT (code) DO UPDATE
  SET kind = EXCLUDED.kind, amount = EXCLUDED.amount, active = EXCLUDED.active,
      price_status = EXCLUDED.price_status, duration_days = EXCLUDED.duration_days;

CREATE TABLE IF NOT EXISTS mat_refills (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  /* 결제 한 건에 한 줄. 같은 웹훅이 두 번 와도 둘째 줄이 서지 않는다 */
  order_id    BIGINT NOT NULL UNIQUE REFERENCES orders(id),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'refunded')),
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at     TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mat_refills_user_idx ON mat_refills (user_id, ends_at DESC);
