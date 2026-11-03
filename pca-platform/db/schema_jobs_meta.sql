-- ============================================================
--  공고 카드 칸 (2026-11-03)
--
--  잡인더스트리 · 커리어피크(우리 회사 아임웹 사이트) 공고 카드에 보이는
--  분류 · 분야 · 학위 표시 · 지역 · 종류 · 고용 형태 · 본문 칸을 칸으로 둔다. 전에는 본문 줄
--  (`raw_requirements`)만 있어서 화면이 첫 줄을 제목으로 짐작했고, 요구 줄의
--  `석사` · `박사` 말로 대학원 모집을 갈랐다(기업 경력 채용이 "대학원 · 연구실
--  모집" 에 들어갔다).
--
--  **제목을 담는다. 우리 회사 사이트 공고만이다**(`src/lib/jobs/ingest.ts` 의
--  `OWN_SITES`). 제목은 그 사이트에 누구나 보게 올린 공고 글이고 개인 정보가
--  아니다. 고용24 · CSV 공고는 전처럼 제목을 비운다. **기업 이름 칸은 여전히
--  없다**(직업정보제공사업 범위).
--
--  모든 칸은 비어도 된다: 못 읽으면 비우고 짐작으로 채우지 않는다. 칸이 없는
--  DB(이 파일을 올리기 전)에서도 앱은 돈다. 그때는 옛 칸만 적고 읽는다.
--
--  `v3_job_skips` 는 담지 않은 공고의 **번호만** 적는다(마감이 지났거나 제목이
--  없던 것). 다음 당번이 같은 상세를 다시 부르지 않게 하려는 것이다. 본문 ·
--  제목은 적지 않는다.
-- ============================================================

ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS field TEXT;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS degree_label TEXT;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS degree_min TEXT;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS posting_kind TEXT;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS region_label TEXT;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS abroad BOOLEAN;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS job_family TEXT;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS employment_type TEXT;

ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS posting_fields JSONB;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS verified_source TEXT;
ALTER TABLE v3_job_postings ADD COLUMN IF NOT EXISTS verified_ref TEXT;

/* 제약은 지우고 다시 세운다(ADD CONSTRAINT 에는 IF NOT EXISTS 가 없다). 몇 번 돌려도 같다 */
ALTER TABLE v3_job_postings DROP CONSTRAINT IF EXISTS v3_job_postings_degree_min_check;
ALTER TABLE v3_job_postings ADD CONSTRAINT v3_job_postings_degree_min_check
  CHECK (degree_min IS NULL OR degree_min IN ('bachelor', 'master', 'phd', 'any'));
ALTER TABLE v3_job_postings DROP CONSTRAINT IF EXISTS v3_job_postings_posting_kind_check;
ALTER TABLE v3_job_postings ADD CONSTRAINT v3_job_postings_posting_kind_check
  CHECK (posting_kind IS NULL OR posting_kind IN ('job', 'grad', 'faculty', 'funding', 'evaluator', 'education'));

CREATE INDEX IF NOT EXISTS v3_job_postings_kind_idx
  ON v3_job_postings (posting_kind) WHERE posting_kind IS NOT NULL;

COMMENT ON COLUMN v3_job_postings.title IS
  '공고 제목. 우리 회사 사이트(잡인더스트리 · 커리어피크) 공고만 담는다. 다른 출처는 비운다';
COMMENT ON COLUMN v3_job_postings.category IS '카드의 분류(기업 R&D · 공공기관 · 대학원 · 교원 임용 · 출연연 · 정출연 · 연구비 …)';
COMMENT ON COLUMN v3_job_postings.field IS '카드의 분야(IT·AI·통신 · 기계·항공우주 · 바이오·의료 …). 뚜렷하지 않으면 비운다';
COMMENT ON COLUMN v3_job_postings.degree_label IS '학위 표시를 보이는 그대로(석사·박사 · 경력·신입박사 · 전문연구요원(석사))';
COMMENT ON COLUMN v3_job_postings.degree_min IS '가장 낮은 요구 학위. bachelor · master · phd · any(학력 무관)';
COMMENT ON COLUMN v3_job_postings.posting_kind IS
  'job(채용) · grad(대학원 · 연구실 모집, 488 게시판) · faculty(교원 임용) · funding(연구비) · evaluator(평가위원) · education(교육). 뒤 셋은 공고 목록에 세우지 않는다';
COMMENT ON COLUMN v3_job_postings.region_label IS '지역 표시(서울 · 대전 … 또는 나라 이름)';
COMMENT ON COLUMN v3_job_postings.abroad IS '해외 공고인가. 모르면 비운다';
COMMENT ON COLUMN v3_job_postings.job_family IS '직군(연구 · 행정 · 기술). 커리어피크 정출연 채용 캘린더';
COMMENT ON COLUMN v3_job_postings.employment_type IS '고용 형태(정규직 · 무기계약직 · 계약직 …)';
COMMENT ON COLUMN v3_job_postings.posting_fields IS
  '본문 칸(모집 분야 · 지원 자격 · 고용 형태 · 근무지 · 접수 기간, 연구비의 소관 부처 · 공고 번호 …). 우리 사이트 공고 글 그대로';
COMMENT ON COLUMN v3_job_postings.verified_source IS
  '학위 · 직군 · 고용 형태를 사람이 확인한 출처(careerpeak). 있으면 다시 모아도 그 칸을 덮지 않는다';
COMMENT ON COLUMN v3_job_postings.verified_ref IS
  '같은 공고의 그 출처 번호. 화면은 이 번호의 커리어피크 줄을 따로 세우지 않는다(같은 공고가 두 번 서지 않게)';

CREATE TABLE IF NOT EXISTS v3_job_skips (
  source     TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  reason     TEXT NOT NULL CHECK (reason IN ('closed', 'no_title')),
  seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source, source_ref)
);
COMMENT ON TABLE v3_job_skips IS
  '담지 않은 공고 번호(마감 지남 · 제목 없음). 같은 상세를 당번마다 다시 부르지 않게 한다. 번호만 적는다';
