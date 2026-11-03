-- ============================================================
--  유입 경로 · 나라 (2026-11-03 수익화 E-6 · E-7)
--
--  한 사람이 **처음 어디서 왔는가**(잡인더스트리 · 커리어피크 · 학교 · 직접)와 들어온 공고(게시판 · idx),
--  결제 길을 가르는 나라(가입 때 접속 국가 · 카드 발급국)를 한 줄에 둔다.
--  주문 · 정기결제가 이 줄을 베껴 간다(사이트별 전환 · 정산 집계).
--
--  **적지 않는 것**: IP 주소 · 카드 번호 · 카드 BIN. 나라 두 글자만 둔다.
--
--  **더하기만 한다.** 새 표 하나다.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_attribution (
  user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  source          TEXT NOT NULL CHECK (source IN ('jobindustry', 'careerpeak', 'school', 'direct')),
  /* 잡인더스트리 게시판 번호와 공고 idx(숫자). 없으면 NULL */
  board           TEXT,
  posting_idx     TEXT,
  /* ISO 3166-1 두 글자. 가입 때 앞단 머리글로 읽은 접속 국가 */
  signup_country  TEXT CHECK (signup_country IS NULL OR signup_country ~ '^[A-Z]{2}$'),
  /* 결제 때 알게 된 카드 발급국(KCP 빌링키 발급 성공 = KR, Paddle 이 알려 준 나라) */
  card_country    TEXT CHECK (card_country IS NULL OR card_country ~ '^[A-Z]{2}$'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_attribution_source_idx ON user_attribution (source, posting_idx);
