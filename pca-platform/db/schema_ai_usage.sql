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
