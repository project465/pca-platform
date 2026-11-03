-- ============================================================
--  MAT 연구 자료 읽기 (2026-10-31 대표 지시: 석·박사 취업비서)
--
--  **논문 · 학위논문 · 발표 자료 · 보고서 · 이력서 · 자기소개서를 한 줄로
--  남긴다.** 원본 파일은 저장하지 않는다(`upload.ts` 와 같다): 바이트는 읽는
--  함수 안에서만 살고, 남는 것은 지문과 읽어 낸 요약뿐이다.
--
--  **학술지 지표는 공식 Impact Factor 가 아니다.** JCR 은 Clarivate 의 유료
--  자료라 가져오지 않는다. 남기는 것은 OpenAlex 의 공개 지표(2년 평균 피인용 ·
--  h-index · 이 논문 피인용)와 그것을 가져온 날짜이고, 화면이 그 사실을 적는다.
--
--  **점수에 들어가지 않는다**(설계 원칙 6). 여기 남는 것은 그 사람의 자료를
--  직무 말로 옮긴 요약과 공고를 찾을 낱말이다. 경험 기록이 되려면 사람이
--  초안을 열어 직접 저장한다.
-- ============================================================

CREATE TABLE IF NOT EXISTS research_docs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  core_code     TEXT NOT NULL,
  sha256        TEXT NOT NULL,
  /* 어떤 파일이었나(바이트를 보고 정한다) */
  file_kind     TEXT NOT NULL CHECK (file_kind IN ('pdf', 'docx', 'pptx', 'text')),
  /* 무엇이었나(모델이 읽고 정한다) */
  doc_type      TEXT NOT NULL CHECK (doc_type IN
                  ('paper', 'thesis', 'slides', 'report', 'patent', 'cv', 'cover_letter', 'portfolio', 'other')),
  lang          TEXT,
  title         TEXT NOT NULL,
  venue         TEXT,
  year          INTEGER CHECK (year IS NULL OR year BETWEEN 1950 AND 2100),
  doi           TEXT,
  /* 요약 · 방법 · 결과 · 직무 말 · 문장 뼈대 · 면접 질문 · 되물을 것 */
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  /* 공고를 찾을 낱말(한·영). 공고 찾기(`match.ts`)가 읽는다 */
  terms         TEXT[] NOT NULL DEFAULT '{}',
  /* OpenAlex 지표와 가져온 날. 못 가져왔으면 비어 있다 */
  metrics       JSONB,
  /* 이 자료에서 만든 경험 초안(`assistant_drafts`) */
  draft_ids     BIGINT[] NOT NULL DEFAULT '{}',
  model         TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* 마지막으로 쓴 날부터 1년(MAT 커리어피크 모드 지시서 2장의 제안) */
  purge_after   DATE NOT NULL DEFAULT (now() + interval '1 year')::date
);
CREATE INDEX IF NOT EXISTS research_docs_user_idx ON research_docs(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS research_docs_sha_uniq ON research_docs(user_id, sha256);

COMMENT ON TABLE research_docs IS
  'MAT 이 읽은 연구 자료·지원 서류의 요약. 원본 파일은 저장하지 않는다. 학술지 지표는 OpenAlex(공식 IF 아님)';
