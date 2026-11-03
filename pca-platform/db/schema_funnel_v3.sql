-- ============================================================
--  MAT 수익화 수치 (2026-11-03 수익화 E-2)
--
--  가입 → 검사 완료 → MAT 열기 → 무료 분석 → 결제 시작 → 결제 → 갱신 · 해지 · 결제 실패를
--  유입 경로(잡인더스트리 · 커리어피크 · 학교 · 직접)별 · 날짜별로 센다.
--
--  **사람을 적지 않는다.** 같은 사람을 두 번 세지 않으려고 `subject` 에 사람 번호의
--  열쇠 해시(16자)만 둔다. 이름 · 메일 · 사람 번호 · 글은 없다. 운영자 화면은 수만 보인다.
--
--  **더하기만 한다.** 새 표 둘이다.
-- ============================================================

CREATE TABLE IF NOT EXISTS mat_funnel_events (
  id          BIGSERIAL PRIMARY KEY,
  /* 한국 시각 날짜. 같은 사람이 같은 날 같은 걸음을 두 번 해도 한 줄이다 */
  day         DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Seoul')::date),
  step        TEXT NOT NULL,
  source      TEXT NOT NULL,
  /* 잡인더스트리 공고 idx(숫자). 없으면 빈 글자 */
  posting_idx TEXT NOT NULL DEFAULT '',
  subject     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day, step, subject, posting_idx)
);
CREATE INDEX IF NOT EXISTS mat_funnel_events_day_idx ON mat_funnel_events (day, step, source);

/* 분석 한 번에 쓴 근거(내 경험 · 검사 결과) 개수. 검사 전 · 후로 나눠 센다.
   나중에 "검사하면 근거가 몇 개 늘어난다" 를 말하려면 이 집계가 먼저 있어야 한다. 사람은 적지 않는다 */
CREATE TABLE IF NOT EXISTS mat_evidence_counts (
  id               BIGSERIAL PRIMARY KEY,
  day              DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Seoul')::date),
  with_assessment  BOOLEAN NOT NULL,
  /* 요구 항목 가운데 근거(경험 제목 · 검사로 확인된 영역)가 하나라도 붙은 줄 수 */
  backed_items     INTEGER NOT NULL DEFAULT 0,
  /* 붙은 근거를 모두 더한 수 */
  evidence_items   INTEGER NOT NULL DEFAULT 0,
  requirement_items INTEGER NOT NULL DEFAULT 0,
  analyzed_by      TEXT NOT NULL DEFAULT 'rules',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mat_evidence_counts_day_idx ON mat_evidence_counts (day, with_assessment);
