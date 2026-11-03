-- ============================================================
--  MAT 무료 분석 쓴 기록 (2026-11-03 수익화 E-3)
--
--  무료 = 공고 AI 분석 검사 없이 1회 + 검사를 끝내면 1회 더. **계정이 아니라 사람에 붙인다.**
--  계정을 지우고 같은 메일 · 같은 소셜 계정으로 다시 가입해도 무료가 다시 생기지 않게
--  `identity_hash` 에 정규화한 메일(소문자, +뒤 · gmail 점 제거) · 소셜 계정 번호의 열쇠 해시만 둔다.
--  메일 · 소셜 번호 그 자체는 적지 않는다.
--
--  계정을 지워도 이 줄은 남는다(user_id 만 끊는다). 이 줄로 사람을 되찾을 수 없다.
--
--  **더하기만 한다.** 새 표 하나다.
-- ============================================================

CREATE TABLE IF NOT EXISTS mat_free_claims (
  identity_hash TEXT NOT NULL,
  /* notest = 검사 없이 쓴 1회 · aftertest = 검사를 끝낸 뒤 1회 */
  slot          TEXT NOT NULL CHECK (slot IN ('notest', 'aftertest')),
  user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  posting_id    BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (identity_hash, slot)
);
CREATE INDEX IF NOT EXISTS mat_free_claims_user_idx ON mat_free_claims (user_id);
