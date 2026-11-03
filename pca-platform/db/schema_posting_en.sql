-- ============================================================
--  한국어 공고의 영어 요약 (2026-11-03 영어 화면 · 국내 유학생)
--
--  영어 화면의 유학생이 잡인더스트리 · 고용24 한국어 공고를 영어로 본다.
--  **지어 옮기지 않는다.** 요약은 영어 화면에서 그 공고를 AI 로 분석했을 때
--  (공고 분석의 영어 읽기, `src/lib/assistant/posting.ts`) 나온 직무 이름과
--  요구 줄을 그대로 담는다. AI 가 꺼져 있으면 이 줄이 서지 않고, 화면은
--  한국어 제목 · `Korean posting` 표시 · 한국어 요구 줄을 그대로 보인다.
--
--  공고마다 한 줄이다. 같은 공고를 다른 사람이 영어로 분석하면 그 줄을 다시
--  쓴다(공고 글이 같으면 요약도 같다). 사람 · 경험은 담지 않는다. 공고가
--  지워지면 같이 지운다.
-- ============================================================

CREATE TABLE IF NOT EXISTS job_posting_en (
  posting_id  BIGINT PRIMARY KEY REFERENCES v3_job_postings(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  lines       JSONB NOT NULL DEFAULT '[]'::jsonb,
  model       TEXT,
  made_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
