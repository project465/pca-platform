-- ============================================================
--  METRI 확장 스키마 — Engineering Career Intelligence
--  db/schema.sql 을 적용한 다음에 적용한다.
--
--  적용 순서
--    1. db/schema.sql            기존 검사 플랫폼
--    2. db/schema_metri.sql        이 파일
--    3. db/seed/metri/skill_tree.sql   자동 생성 시드
--
--  기존 파일의 설계 원칙 세 가지를 그대로 지킨다.
--    1. 로그인 주체는 users 하나. 고등학생도 대학생도 여기 들어간다.
--    2. 사람이 읽는 이름은 전부 translations. 컬럼이 아니라 행이 늘어난다.
--    3. 산식은 코드가 아니라 데이터. 가중치·배점·임계값이 전부 테이블에 있다.
--
--  네 번째 원칙을 여기서 추가한다.
--    4. 점수는 산식이 만들고, 문장은 모델이 만든다.
--       LLM 이 만든 값은 절대 job_fit_scores 에 들어가지 않는다.
-- ============================================================


-- ============================================================
--  11. 축과 트랙 — 전 세계 공통 레이어
-- ============================================================

CREATE TABLE indicator_axes (
  id    BIGSERIAL PRIMARY KEY,
  code  TEXT NOT NULL UNIQUE,             -- ANALYZE, DESIGN, ... / INDEP, COLLAB, ...
  kind  TEXT NOT NULL                     -- activity(공학 활동 선호) | trait(업무 성향)
);
COMMENT ON TABLE indicator_axes IS
  'instruments 를 넘어 고정되는 지표 축. 문항은 버전이 올라가도 축은 유지돼야
   작년 응시자와 올해 응시자를 같은 자로 비교할 수 있다';

-- 검사 버전마다 새로 생기는 indicators 를 고정 축에 붙인다.
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS axis_code TEXT REFERENCES indicator_axes(code);

CREATE TABLE tracks (
  id              BIGSERIAL PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,   -- HS | UNIV_LOW | UNIV_HIGH | GRAD
  stage           TEXT NOT NULL,          -- high | univ | grad
  instrument_key  TEXT NOT NULL,          -- HS_V1 | UNIV_V1 — 트랙 4개가 검사 2개를 나눠 쓴다
  sort_no         INTEGER NOT NULL DEFAULT 0
);
COMMENT ON TABLE tracks IS
  '트랙은 상품이 아니라 채점 가중치의 키다. 상품을 나누는 축은 전공이고,
   만들어야 하는 검사지는 instrument_key 가 말해주듯 두 벌뿐이다.
   고교를 일반계/마이스터로 쪼개지 않는다 — 문항은 같고 결과지 뒷부분만 goal 로 갈린다';

CREATE TABLE learner_goals (
  id       BIGSERIAL PRIMARY KEY,
  code     TEXT NOT NULL UNIQUE,          -- univ(진학형) | job(취업형) | any(대학 트랙)
  sort_no  INTEGER NOT NULL DEFAULT 0
);
COMMENT ON TABLE learner_goals IS
  '일반계고와 마이스터고의 차이는 트랙이 아니라 이 값 하나로 흡수한다.
   검사지 한 벌, 결과지 한 벌, 분기 한 군데. 학교 유형이 늘어도 코드가 안 늘어난다';

CREATE TABLE industries (
  id       BIGSERIAL PRIMARY KEY,
  code     TEXT NOT NULL UNIQUE,          -- AUTO, SEMI, BATT ...
  sort_no  INTEGER NOT NULL DEFAULT 0
);


-- ============================================================
--  12. Skill Graph — 기존 competencies / job_clusters 를 넓힌다
-- ============================================================

ALTER TABLE competencies ADD COLUMN IF NOT EXISTS layer    TEXT;    -- L1~L5
ALTER TABLE competencies ADD COLUMN IF NOT EXISTS major_id BIGINT REFERENCES majors(id);
COMMENT ON COLUMN competencies.major_id IS
  'NULL 이면 전공을 안 가리는 공통 역량(L5). 전공별 역량은 여기에 소속을 둔다';

-- 직무군 코드는 전공 접두어를 달아 전역에서 유일하다. 시드가 코드로 찾는다.
ALTER TABLE job_clusters ADD CONSTRAINT job_clusters_code_key UNIQUE (code);

-- 요구 역량의 무게. 다 채워야 하는 것과 있으면 좋은 것을 구분하지 않으면
-- 적합도 점수가 전부 비슷해진다.
ALTER TABLE job_competency_map
  ADD COLUMN IF NOT EXISTS criticality SMALLINT NOT NULL DEFAULT 2
  CHECK (criticality BETWEEN 1 AND 3);
COMMENT ON COLUMN job_competency_map.criticality IS '3 필수 · 2 중요 · 1 보조';

CREATE TABLE competency_aliases (
  id             BIGSERIAL PRIMARY KEY,
  competency_id  BIGINT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  lang           CHAR(2) NOT NULL,
  alias          TEXT NOT NULL,           -- 전부 소문자로 저장한다
  UNIQUE (lang, alias)
);
COMMENT ON TABLE competency_aliases IS
  'JD 와 이력서에서 스킬을 뽑을 때 쓰는 사전. 한국 공고의 "솔리드웍스" 와
   미국 공고의 "SolidWorks" 가 같은 competency 로 떨어지게 하는 표';

CREATE INDEX idx_alias_lookup ON competency_aliases(lang, alias);

CREATE TABLE job_industry_map (
  job_id       BIGINT NOT NULL REFERENCES job_clusters(id) ON DELETE CASCADE,
  industry_id  BIGINT NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, industry_id)
);

CREATE TABLE job_cluster_tracks (
  job_id      BIGINT NOT NULL REFERENCES job_clusters(id) ON DELETE CASCADE,
  track_code  TEXT NOT NULL REFERENCES tracks(code),
  PRIMARY KEY (job_id, track_code)
);
COMMENT ON TABLE job_cluster_tracks IS
  '고졸로 갈 수 있는 직무와 학사 이상이 필요한 직무를 나눈다.
   마이스터고 학생에게 석사 요구 직무를 1순위로 보여주면 그 결과지는 버려진다';

CREATE TABLE job_axis_weights (
  job_id      BIGINT NOT NULL REFERENCES job_clusters(id) ON DELETE CASCADE,
  axis_code   TEXT NOT NULL REFERENCES indicator_axes(code),
  weight      NUMERIC(5,3) NOT NULL,
  PRIMARY KEY (job_id, axis_code)
);
COMMENT ON TABLE job_axis_weights IS
  '전 세계 공통 가중치. 기존 scoring_weights 는 (검사 버전 × 지표 × 직무) 라
   국가·학과별로 덮어쓰는 용도로 남기고, 기본값은 이 표에서 온다';

CREATE TABLE major_fit_weights (
  major_id   BIGINT NOT NULL REFERENCES majors(id) ON DELETE CASCADE,
  axis_code  TEXT NOT NULL REFERENCES indicator_axes(code),
  weight     NUMERIC(5,3) NOT NULL,
  PRIMARY KEY (major_id, axis_code)
);
COMMENT ON TABLE major_fit_weights IS
  '고등학생용. 아직 전공이 없으니 직무 대신 전공 적합도를 낸다';


-- ============================================================
--  13. 학습자 프로파일 — 검사 한 번이 아니라 누적되는 데이터
-- ============================================================

CREATE TABLE learner_profiles (
  user_id       BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  track_code    TEXT NOT NULL REFERENCES tracks(code),
  goal_code     TEXT NOT NULL DEFAULT 'any' REFERENCES learner_goals(code),
  school_type   TEXT,                     -- general_high | meister | specialized | university | graduate
  major_id      BIGINT REFERENCES majors(id),   -- 고등학생은 NULL
  grade_year    SMALLINT,
  country       CHAR(2) NOT NULL DEFAULT 'KR',
  region_code   TEXT,                     -- 정주 지표용 시도 코드
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE learner_profiles IS
  '고1 때 만든 행이 대학 4학년까지 따라간다. track_code 만 올라간다.
   이 연속성이 이 사업의 핵심 자산이다';
COMMENT ON COLUMN learner_profiles.school_type IS
  '학교 유형은 여기 기록만 하고 로직을 태우지 않는다. 로직은 goal_code 만 본다.
   특성화고가 늘어도 갈라지는 코드가 늘지 않게 하기 위한 것';

CREATE TABLE evidence_sources (
  id           BIGSERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,      -- COURSE | PROJECT | CERT | INTERN | SOFTWARE | SELF | AWARD | NCS_UNIT
  max_point    NUMERIC(4,2) NOT NULL,     -- 이 출처 하나가 줄 수 있는 최대 점수
  reliability  NUMERIC(3,2) NOT NULL,     -- 0~1. 자기보고일수록 낮다
  needs_proof  BOOLEAN NOT NULL DEFAULT false
);
COMMENT ON TABLE evidence_sources IS
  '"나 ANSYS 할 줄 안다" 와 "구조해석 과목 A+" 를 같은 무게로 세면 안 된다.
   배점과 신뢰도를 데이터로 둔다';

CREATE TABLE learner_evidence (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id  BIGINT NOT NULL REFERENCES competencies(id),
  source_code    TEXT NOT NULL REFERENCES evidence_sources(code),
  ref_kind       TEXT,                    -- course | project | certificate | ...
  ref_id         BIGINT,                  -- courses.id 등. 자유 입력이면 NULL
  ref_label      TEXT,                    -- '기계설계 (ME301)' 처럼 화면에 보일 문자열
  grade          TEXT,                    -- A+ ~ D, P
  raw_point      NUMERIC(4,2) NOT NULL,   -- 배점 × 성적계수
  verified_at    TIMESTAMPTZ,
  verified_by    BIGINT REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE learner_evidence IS
  '역량 보유 수준은 직접 입력하지 않는다. 증거를 쌓고 계산해서 얻는다.
   결과지에서 "왜 3레벨인가" 를 물으면 이 표의 행들을 그대로 보여준다';

CREATE INDEX idx_evidence_user ON learner_evidence(user_id, competency_id);

CREATE TABLE learner_competency_levels (
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id  BIGINT NOT NULL REFERENCES competencies(id),
  held_raw       NUMERIC(5,2) NOT NULL,   -- 증거 점수 합 (상한 6.0)
  held_level     SMALLINT NOT NULL CHECK (held_level BETWEEN 0 AND 5),
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, competency_id)
);

CREATE TABLE learner_preferences (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,              -- industry | region | company_size | country | worktype
  code        TEXT NOT NULL,
  weight      NUMERIC(4,3) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (user_id, kind, code)
);
COMMENT ON TABLE learner_preferences IS
  'region 에 담기는 정주 의향이 앵커사업 리포트의 근거가 된다';


-- ============================================================
--  14. 채점 프로파일과 규준
-- ============================================================

CREATE TABLE scoring_profiles (
  track_code    TEXT NOT NULL REFERENCES tracks(code),
  goal_code     TEXT NOT NULL REFERENCES learner_goals(code),
  w_aptitude    NUMERIC(4,3) NOT NULL,    -- A 성향·활동
  w_skill       NUMERIC(4,3) NOT NULL,    -- S 역량 충족
  w_preference  NUMERIC(4,3) NOT NULL,    -- P 선호
  w_coursework  NUMERIC(4,3) NOT NULL,    -- C 이력
  display_mode  TEXT NOT NULL DEFAULT 'score',  -- score(점수) | band(구간)
  top_n         SMALLINT NOT NULL DEFAULT 6,
  PRIMARY KEY (track_code, goal_code),
  CHECK (w_aptitude + w_skill + w_preference + w_coursework = 1.0)
);
COMMENT ON TABLE scoring_profiles IS
  '고1 은 증거가 거의 없다. 같은 산식을 쓰되 가중치를 트랙별로 달리 준다.
   증거가 없는 학생에게 소수점 한 자리 점수를 주면 그건 거짓말이므로
   display_mode 를 band 로 두어 구간으로 보여준다';

CREATE TABLE norm_groups (
  id          BIGSERIAL PRIMARY KEY,
  track_code  TEXT NOT NULL REFERENCES tracks(code),
  major_id    BIGINT REFERENCES majors(id),
  grade_year  SMALLINT,
  country     CHAR(2) NOT NULL DEFAULT 'KR',
  n_size      INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_code, major_id, grade_year, country)
);
COMMENT ON TABLE norm_groups IS
  '규준 집단은 트랙·전공·학년·국가로만 나눈다. 성별·출신학교는 넣지 않는다';

CREATE TABLE norm_stats (
  norm_group_id  BIGINT NOT NULL REFERENCES norm_groups(id) ON DELETE CASCADE,
  axis_code      TEXT NOT NULL REFERENCES indicator_axes(code),
  mean           NUMERIC(6,3) NOT NULL,
  sd             NUMERIC(6,3) NOT NULL,
  PRIMARY KEY (norm_group_id, axis_code)
);


-- ============================================================
--  15. 검사 확장 — 트랙별 문항, 응답 품질
-- ============================================================

ALTER TABLE instruments ADD COLUMN IF NOT EXISTS track_code TEXT REFERENCES tracks(code);
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS item_count SMALLINT;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS est_minutes SMALLINT;
ALTER TABLE questions   ADD COLUMN IF NOT EXISTS axis_code TEXT REFERENCES indicator_axes(code);
ALTER TABLE questions   ADD COLUMN IF NOT EXISTS item_kind TEXT NOT NULL DEFAULT 'likert';
COMMENT ON COLUMN questions.item_kind IS
  'likert(선호) | self_rating(역량 자기평가) | attention(주의 확인) | forced_choice(양자택일) | preference(산업·지역 선호)';

ALTER TABLE responses ADD COLUMN IF NOT EXISTS elapsed_ms INTEGER;
COMMENT ON COLUMN responses.elapsed_ms IS '문항 체류 시간. 직선 응답·초고속 응답 탐지에 쓴다';

CREATE TABLE attempt_quality (
  attempt_id       BIGINT PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
  straightline_run SMALLINT NOT NULL DEFAULT 0,   -- 같은 보기 최대 연속 횟수
  fast_ratio       NUMERIC(4,3) NOT NULL DEFAULT 0, -- 1.5초 미만 응답 비율
  attention_pass   SMALLINT NOT NULL DEFAULT 0,
  attention_total  SMALLINT NOT NULL DEFAULT 0,
  evidence_fill    NUMERIC(4,3) NOT NULL DEFAULT 0, -- 증거 충실도 0~1
  band_width       NUMERIC(4,1) NOT NULL DEFAULT 12, -- 결과지에 찍히는 ± 폭
  flagged          BOOLEAN NOT NULL DEFAULT false
);
COMMENT ON TABLE attempt_quality IS
  '신뢰도는 점수를 깎는 데 쓰지 않는다. 점수는 그대로 두고 구간 폭을 넓힌다.
   깎으면 학생 간 비교가 깨지고, 넓히면 정직해진다';


-- ============================================================
--  16. 결과 확장 — 점수의 내역을 남긴다
-- ============================================================

ALTER TABLE job_fit_scores ADD COLUMN IF NOT EXISTS a_score   NUMERIC(5,1);
ALTER TABLE job_fit_scores ADD COLUMN IF NOT EXISTS s_score   NUMERIC(5,1);
ALTER TABLE job_fit_scores ADD COLUMN IF NOT EXISTS p_score   NUMERIC(5,1);
ALTER TABLE job_fit_scores ADD COLUMN IF NOT EXISTS c_score   NUMERIC(5,1);
ALTER TABLE job_fit_scores ADD COLUMN IF NOT EXISTS band_low  NUMERIC(5,1);
ALTER TABLE job_fit_scores ADD COLUMN IF NOT EXISTS band_high NUMERIC(5,1);
COMMENT ON COLUMN job_fit_scores.a_score IS
  '네 항을 따로 남겨야 "왜 이 점수인가" 를 화면에서 펼칠 수 있다.
   합쳐진 숫자 하나만 저장하면 설명할 수 없고, 설명 못 하는 점수는 팔리지 않는다';

CREATE TABLE major_fit_scores (
  attempt_id  BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  major_id    BIGINT NOT NULL REFERENCES majors(id),
  fit_score   NUMERIC(5,1) NOT NULL,
  band_low    NUMERIC(5,1) NOT NULL,
  band_high   NUMERIC(5,1) NOT NULL,
  rank_no     SMALLINT NOT NULL,
  PRIMARY KEY (attempt_id, major_id)
);
COMMENT ON TABLE major_fit_scores IS '고등학생 결과지의 1면';

CREATE TABLE skill_gap_items (
  id              BIGSERIAL PRIMARY KEY,
  attempt_id      BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  job_id          BIGINT NOT NULL REFERENCES job_clusters(id),
  competency_id   BIGINT NOT NULL REFERENCES competencies(id),
  required_level  SMALLINT NOT NULL,
  held_level      SMALLINT NOT NULL,
  demand_share    NUMERIC(4,3),           -- 상위 직무 JD 에서 이 스킬이 등장한 비율
  feasibility     NUMERIC(3,2),           -- 남은 학기 안에 채울 수 있는가
  priority        NUMERIC(6,3) NOT NULL,
  action_kind     TEXT,                   -- course | project | cert | ncs_unit | camp | online
  action_ref      TEXT,
  rank_no         SMALLINT NOT NULL
);
COMMENT ON TABLE skill_gap_items IS
  '부족한 역량 전부가 아니라 상위 5개만 남긴다. 20개를 처방하면 0개를 처방한 것과 같다';

CREATE INDEX idx_gap_rank ON skill_gap_items(attempt_id, rank_no);


-- ============================================================
--  17. JD 파이프라인 — 국내와 미국
-- ============================================================

CREATE TABLE jd_sources (
  code            TEXT PRIMARY KEY,       -- WORK24 | USAJOBS | ADZUNA | ONET | PARTNER_* | COMPANY_*
  country         CHAR(2) NOT NULL,
  kind            TEXT NOT NULL,          -- public_api | commercial_api | partner_feed | crawl
  base_url        TEXT,
  license_note    TEXT NOT NULL,          -- 재배포 가능 범위. 비워두지 않는다
  redistributable BOOLEAN NOT NULL DEFAULT false,
  fetch_cron      TEXT,
  enabled         BOOLEAN NOT NULL DEFAULT true
);
COMMENT ON TABLE jd_sources IS
  'license_note 가 빈 소스는 수집하지 않는다. 공고 원문을 우리 화면에 그대로
   띄울 수 있는지 여부가 소스마다 다르다';

CREATE TABLE jd_raw (
  id           BIGSERIAL PRIMARY KEY,
  source_code  TEXT NOT NULL REFERENCES jd_sources(code),
  external_id  TEXT NOT NULL,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  body_hash    TEXT NOT NULL,
  payload      JSONB NOT NULL,
  UNIQUE (source_code, external_id, body_hash)
);
COMMENT ON TABLE jd_raw IS
  '원문을 지우지 않는다. 스킬 추출기를 고칠 때마다 전량 재처리해야 하는데,
   원문이 없으면 과거 공고는 영영 옛 기준으로 남는다';

CREATE TABLE companies (
  id            BIGSERIAL PRIMARY KEY,
  country       CHAR(2) NOT NULL,
  name          TEXT NOT NULL,
  biz_no        TEXT,                     -- 사업자번호 등 국가별 식별자
  size_band     TEXT,                     -- large | mid | sme | startup
  industry_id   BIGINT REFERENCES industries(id),
  region_code   TEXT,
  is_local      BOOLEAN NOT NULL DEFAULT false,  -- 대학 소재 지역 기업인가
  UNIQUE (country, name, biz_no)
);

CREATE TABLE jd_postings (
  id              BIGSERIAL PRIMARY KEY,
  raw_id          BIGINT REFERENCES jd_raw(id),
  source_code     TEXT NOT NULL REFERENCES jd_sources(code),
  country         CHAR(2) NOT NULL,
  company_id      BIGINT REFERENCES companies(id),
  title_original  TEXT NOT NULL,
  job_id          BIGINT REFERENCES job_clusters(id),   -- 분류 결과
  classify_conf   NUMERIC(4,3),
  region_code     TEXT,
  employment_type TEXT,
  education_req   TEXT,                   -- highschool | associate | bachelor | master | phd
  experience_req  SMALLINT,               -- 개월. 신입은 0
  salary_min      INTEGER,
  salary_max      INTEGER,
  currency        CHAR(3),
  url             TEXT,
  posted_at       DATE,
  expires_at      DATE,
  dedup_key       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open',   -- open | closed | expired
  UNIQUE (dedup_key)
);
COMMENT ON COLUMN jd_postings.dedup_key IS
  '회사+직무명+지역+본문 지문(simhash). 같은 공고가 워크넷과 기업 사이트에
   동시에 올라오므로 이 키가 없으면 수요 집계가 두 배로 부풀어 오른다';

CREATE INDEX idx_posting_job ON jd_postings(country, job_id, status);
CREATE INDEX idx_posting_region ON jd_postings(country, region_code) WHERE status = 'open';

CREATE TABLE jd_skills (
  posting_id     BIGINT NOT NULL REFERENCES jd_postings(id) ON DELETE CASCADE,
  competency_id  BIGINT NOT NULL REFERENCES competencies(id),
  requirement    TEXT NOT NULL,           -- must | nice
  confidence     NUMERIC(4,3) NOT NULL,
  extractor      TEXT NOT NULL,           -- dict | embed | llm | human
  evidence_span  TEXT,                    -- 근거가 된 공고 문장
  PRIMARY KEY (posting_id, competency_id)
);
COMMENT ON COLUMN jd_skills.evidence_span IS
  '근거 문장이 없으면 사람이 검수할 수 없다. 추출기를 믿을 근거는 이 문장뿐이다';

CREATE TABLE jd_skill_stats (
  country        CHAR(2) NOT NULL,
  region_code    TEXT,
  job_id         BIGINT NOT NULL REFERENCES job_clusters(id),
  competency_id  BIGINT NOT NULL REFERENCES competencies(id),
  period_month   DATE NOT NULL,
  posting_count  INTEGER NOT NULL,
  share          NUMERIC(4,3) NOT NULL,   -- 그 직무 공고 중 이 스킬을 요구한 비율
  PRIMARY KEY (country, region_code, job_id, competency_id, period_month)
);
COMMENT ON TABLE jd_skill_stats IS
  '학과 대시보드의 "기업 수요" 칸과 Skill Gap 우선순위의 demand_share 가 여기서 온다';

CREATE TABLE skill_candidates (
  id             BIGSERIAL PRIMARY KEY,
  term           TEXT NOT NULL,
  lang           CHAR(2) NOT NULL,
  seen_count     INTEGER NOT NULL DEFAULT 1,
  first_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  suggested_id   BIGINT REFERENCES competencies(id),
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending | merged | new_skill | rejected
  reviewed_by    BIGINT REFERENCES users(id),
  reviewed_at    TIMESTAMPTZ,
  UNIQUE (term, lang)
);
COMMENT ON TABLE skill_candidates IS
  '사전에 없는 말이 공고에 자주 나오면 여기 쌓인다. 주 1회 사람이 판정해야
   온톨로지가 늙지 않는다. 자동 승인은 하지 않는다';

CREATE TABLE jd_match_scores (
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  posting_id      BIGINT NOT NULL REFERENCES jd_postings(id) ON DELETE CASCADE,
  score           NUMERIC(5,1) NOT NULL,
  skill_match     NUMERIC(5,1) NOT NULL,
  missing_must    SMALLINT NOT NULL DEFAULT 0,
  qualified       BOOLEAN NOT NULL DEFAULT true,   -- 학력·전공·비자 요건 통과 여부
  rank_no         SMALLINT NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, posting_id)
);


-- ============================================================
--  18. 고교 트랙 전용 — 과목과 NCS
-- ============================================================

CREATE TABLE hs_subjects (
  id           BIGSERIAL PRIMARY KEY,
  country      CHAR(2) NOT NULL DEFAULT 'KR',
  code         TEXT NOT NULL,             -- 교육과정 과목 코드
  category     TEXT NOT NULL,             -- common | general_elective | career_elective | fusion | specialized
  credit       SMALLINT,
  UNIQUE (country, code)
);
COMMENT ON TABLE hs_subjects IS
  '고교학점제 과목. 일반계고 결과지의 처방 단위가 대학의 "다음 학기 과목" 이
   아니라 이 표의 행이다';

CREATE TABLE hs_subject_major_map (
  subject_id  BIGINT NOT NULL REFERENCES hs_subjects(id) ON DELETE CASCADE,
  major_id    BIGINT NOT NULL REFERENCES majors(id) ON DELETE CASCADE,
  necessity   SMALLINT NOT NULL CHECK (necessity BETWEEN 1 AND 3),  -- 3 사실상 필수
  PRIMARY KEY (subject_id, major_id)
);

CREATE TABLE hs_subject_competency_map (
  subject_id     BIGINT NOT NULL REFERENCES hs_subjects(id) ON DELETE CASCADE,
  competency_id  BIGINT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  PRIMARY KEY (subject_id, competency_id)
);

CREATE TABLE ncs_units (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,     -- NCS 능력단위 코드
  level         SMALLINT,
  UNIQUE (code, level)
);

CREATE TABLE ncs_competency_map (
  ncs_unit_id    BIGINT NOT NULL REFERENCES ncs_units(id) ON DELETE CASCADE,
  competency_id  BIGINT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  PRIMARY KEY (ncs_unit_id, competency_id)
);
COMMENT ON TABLE ncs_competency_map IS
  '마이스터고·특성화고는 NCS 로 교육과정이 짜여 있다. 우리 역량 코드와 NCS 를
   이어두지 않으면 그 학교의 이수 이력을 증거로 쓸 수 없다';

CREATE TABLE certifications (
  id           BIGSERIAL PRIMARY KEY,
  country      CHAR(2) NOT NULL DEFAULT 'KR',
  code         TEXT NOT NULL,
  tier         TEXT,                      -- technician | industrial_engineer | engineer | vendor
  base_point   NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  UNIQUE (country, code)
);

CREATE TABLE certification_competency_map (
  certification_id  BIGINT NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  competency_id     BIGINT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  PRIMARY KEY (certification_id, competency_id)
);


-- ============================================================
--  19. 집계 — 학과 대시보드가 읽는 것
-- ============================================================

CREATE TABLE cohort_reports (
  id            BIGSERIAL PRIMARY KEY,
  org_id        BIGINT NOT NULL REFERENCES organizations(id),
  session_id    BIGINT REFERENCES test_sessions(id),
  period_label  TEXT NOT NULL,            -- '2026-1학기'
  n_attempts    INTEGER NOT NULL,
  min_cell      SMALLINT NOT NULL DEFAULT 5,  -- 이보다 작은 칸은 공개하지 않는다
  payload       JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN cohort_reports.min_cell IS
  '5명 미만 칸을 그대로 보여주면 익명 집계가 아니라 개인 식별이 된다.
   학과 담당자가 특정 학생을 지목할 수 있게 되는 순간 이 제품은 못 쓴다';

CREATE TABLE outcome_records (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,             -- applied | offered | hired | enrolled_program
  company_id   BIGINT REFERENCES companies(id),
  job_id       BIGINT REFERENCES job_clusters(id),
  region_code  TEXT,
  occurred_on  DATE NOT NULL,
  source       TEXT NOT NULL,             -- self_report | org_report | partner
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE outcome_records IS
  '지역정주 취업률은 졸업 후 통계로 확정되는 지표라 우리가 산출한다고 말하지
   않는다. 여기 쌓이는 것은 그 앞단의 과정 데이터다 — 지역기업 매칭률, 정주 의향,
   지원 전환. 둘을 섞어 말하면 대학 담당자가 먼저 알아챈다';

CREATE TABLE match_feedback (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id  BIGINT REFERENCES attempts(id) ON DELETE CASCADE,
  job_id      BIGINT REFERENCES job_clusters(id),
  posting_id  BIGINT REFERENCES jd_postings(id),
  verdict     TEXT NOT NULL,              -- fit | unfit | unsure
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE match_feedback IS
  '1차 MVP 100명 검증이 만드는 표. 가중치를 다시 학습시킬 유일한 정답지다';


-- ============================================================
--  20. 결제 (2026-09-11)
--
--  개인 결제(B2C)를 받기 위한 최소 구성이다. 기존 seats 를 그대로 쓴다 —
--  학과 계약은 contracts → seats 500개, 개인 결제는 계약 없이 seats 1개.
--  회원 테이블을 나누지 않았듯이 좌석도 나누지 않는다.
--
--  지키는 것 세 가지
--   1. 금액은 서버가 정한다. 브라우저가 보낸 금액을 믿지 않는다
--   2. 승인은 PG 조회 결과로만 확정한다. 리다이렉트 파라미터를 믿지 않는다
--   3. 같은 결제가 두 번 들어와도 좌석은 하나만 생긴다 (UNIQUE + 트랜잭션)
-- ============================================================

CREATE TABLE products (
  code        TEXT PRIMARY KEY,          -- REPORT_UNIV | REPORT_HS | PACK_CAREER
  kind        TEXT NOT NULL,             -- report | pack
  amount      INTEGER NOT NULL,          -- 최소 화폐 단위 (원)
  currency    CHAR(3) NOT NULL DEFAULT 'KRW',
  seat_count  SMALLINT NOT NULL DEFAULT 1,
  active      BOOLEAN NOT NULL DEFAULT true
);
COMMENT ON TABLE products IS
  '가격을 코드에 박지 않는다. 값을 바꿀 때 배포하지 않기 위한 것이고,
   무엇보다 브라우저가 보낸 금액으로 결제를 만들지 않기 위한 것이다';

CREATE TABLE orders (
  id           BIGSERIAL PRIMARY KEY,
  order_no     TEXT NOT NULL UNIQUE,     -- PG 에 넘기는 값. 영문·숫자만, 40자 이내
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL REFERENCES products(code),
  amount       INTEGER NOT NULL,         -- 주문 시점에 굳힌다. products 가 나중에 바뀌어도 이 값이 진실
  currency     CHAR(3) NOT NULL DEFAULT 'KRW',
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | failed | cancelled | refunded
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at      TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_open ON orders(status) WHERE status = 'pending';

CREATE TABLE payments (
  id                  BIGSERIAL PRIMARY KEY,
  order_id            BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,     -- mock | portone
  provider_payment_id TEXT NOT NULL,     -- PortOne 의 paymentId
  status              TEXT NOT NULL,     -- ready | paid | failed | cancelled | partial_cancelled
  amount              INTEGER NOT NULL,  -- PG 가 알려준 실제 승인 금액
  method              TEXT,
  raw                 JSONB,             -- PG 응답 원문. 분쟁이 나면 이것만 증거가 된다
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);
COMMENT ON CONSTRAINT payments_provider_provider_payment_id_key ON payments IS
  '웹훅과 리다이렉트가 같은 결제를 두 번 들고 와도 행이 하나만 생긴다.
   좌석 중복 발급을 막는 것이 이 제약이다';

CREATE TABLE payment_events (
  id          BIGSERIAL PRIMARY KEY,
  provider    TEXT NOT NULL,
  event_id    TEXT,                      -- 웹훅 고유 id. 재전송 판별용
  kind        TEXT NOT NULL,             -- webhook | redirect | manual
  payload     JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);
COMMENT ON TABLE payment_events IS
  '들어온 것은 검증 전에 일단 다 적는다. 서명이 틀린 요청도 적는다 —
   공격을 받고 있는지 나중에 알아야 하기 때문이다';

-- 개인 결제로 생긴 좌석은 계약이 없다. 기존 seats.contract_id 의 NOT NULL 을 푼다.
ALTER TABLE seats ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS order_id BIGINT REFERENCES orders(id);
COMMENT ON COLUMN seats.order_id IS
  '개인 결제로 발급된 좌석. 학과 계약 좌석은 여기가 NULL 이고 contract_id 가 찬다';

CREATE UNIQUE INDEX idx_seats_order ON seats(order_id) WHERE order_id IS NOT NULL;

INSERT INTO products (code, kind, amount, currency, seat_count) VALUES
  ('REPORT_UNIV', 'report', 29000, 'KRW', 1),
  ('REPORT_HS',   'report', 19000, 'KRW', 1)
ON CONFLICT (code) DO UPDATE SET amount = EXCLUDED.amount;


-- ============================================================
--  21. 직무분야 — 단체 PCA 250문항이 실제로 재는 10개 축
--
--  기존 단체 PCA 기계공학과 검사지는 10개 직무분야 × 25문항으로 돼 있고,
--  그 중 120문항에 6개 업무성향이 심어져 있다. METRI 는 이 문항을 새로 쓰지
--  않고 그대로 쓴다. 문항이 실제로 재는 것은 직무분야 흥미이고, activity 축
--  8개는 그 위에 올린 해석 레이어다. 그래서 변환 가중치를 코드가 아니라
--  여기 테이블에 둔다 — 전공이 늘면 행만 늘어난다.
-- ============================================================

CREATE TABLE job_areas (
  id       BIGSERIAL PRIMARY KEY,
  code     TEXT NOT NULL UNIQUE,          -- DESIGN_DEV, MFG_PROD, ...
  major_id BIGINT REFERENCES majors(id),  -- NULL이면 전공 공통
  sort_no  INTEGER NOT NULL DEFAULT 0
);
COMMENT ON TABLE job_areas IS
  '문항이 직접 재는 단위. indicator_axes(activity) 는 이것을 8축으로 요약한 해석값이다';

CREATE TABLE job_area_axis_weights (
  area_code  TEXT NOT NULL REFERENCES job_areas(code) ON DELETE CASCADE,
  axis_code  TEXT NOT NULL REFERENCES indicator_axes(code),
  weight     NUMERIC(4,3) NOT NULL CHECK (weight > 0 AND weight <= 1),
  PRIMARY KEY (area_code, axis_code)
);
COMMENT ON TABLE job_area_axis_weights IS
  '직무분야 점수를 activity 축으로 옮기는 변환 행렬. 분야별 합이 1.0 이어야 한다';

CREATE TABLE job_cluster_areas (
  job_id     BIGINT NOT NULL REFERENCES job_clusters(id) ON DELETE CASCADE,
  area_code  TEXT NOT NULL REFERENCES job_areas(code) ON DELETE CASCADE,
  share      NUMERIC(4,3) NOT NULL DEFAULT 1.0 CHECK (share > 0 AND share <= 1),
  PRIMARY KEY (job_id, area_code)
);
COMMENT ON TABLE job_cluster_areas IS
  '결과지에서 "설계 및 개발 92점 → 기계설계 직무" 로 내려가는 경로';

-- 문항이 어느 직무분야에 속하는지, 성실도 문항이면 정답이 무엇인지
ALTER TABLE questions ADD COLUMN IF NOT EXISTS area_code        TEXT REFERENCES job_areas(code);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS attention_expect SMALLINT;

CREATE TABLE area_scores (
  attempt_id    BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  area_code     TEXT NOT NULL REFERENCES job_areas(code),
  raw_score     NUMERIC(7,2) NOT NULL,      -- 1~5 평균
  scaled_score  NUMERIC(5,1) NOT NULL,      -- 0~100
  rank_no       SMALLINT NOT NULL,
  PRIMARY KEY (attempt_id, area_code)
);
CREATE INDEX idx_area_scores_rank ON area_scores(attempt_id, rank_no);


-- ============================================================
--  22. 개인 응시 — 회차 없이 혼자 보는 경우
--
--  기존 test_sessions 는 학교가 계약을 맺고 회차를 여는 B2B 전제였다.
--  개인이 결제해서 바로 보는 B2C 를 위해 org_id·contract_id 를 풀고,
--  대신 둘 중 하나는 반드시 있도록 CHECK 로 묶는다. 테이블은 늘리지 않는다.
-- ============================================================

ALTER TABLE test_sessions ALTER COLUMN org_id      DROP NOT NULL;
ALTER TABLE test_sessions ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS order_id BIGINT REFERENCES orders(id);
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS kind     TEXT NOT NULL DEFAULT 'org';  -- org | solo

DO $$ BEGIN
  ALTER TABLE test_sessions ADD CONSTRAINT test_sessions_owner_chk CHECK (
    (kind = 'org'  AND org_id IS NOT NULL AND contract_id IS NOT NULL) OR
    (kind = 'solo' AND order_id IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 주문 하나당 개인 회차 하나
CREATE UNIQUE INDEX IF NOT EXISTS uq_test_sessions_solo_order
  ON test_sessions(order_id) WHERE kind = 'solo';

-- 신뢰도는 예/아니오보다 세 단계가 쓸모 있다. ok / check(재확인 권고) / invalid(무효)
ALTER TABLE attempt_quality ADD COLUMN IF NOT EXISTS flag TEXT NOT NULL DEFAULT 'ok';

-- 결과지의 레이더는 축 순서가 곧 뜻이다. 성향 육각형은 마주 보는 짝이
-- 독립↔협력 · 도전↔안정 · 속도중시↔품질중시 로 놓여야 읽힌다.
-- 순서를 코드에 박으면 전공이 늘 때마다 배포해야 하므로 데이터로 둔다.
ALTER TABLE indicator_axes ADD COLUMN IF NOT EXISTS sort_no INTEGER NOT NULL DEFAULT 0;


-- ============================================================
--  23. 증거 → 레벨 변환에 쓰는 두 표
--
--  역량 보유 수준은 학생이 직접 고르지 않는다. 증거를 쌓고 계산해서 얻는다.
--  그 계산에 성적계수와 레벨 사다리가 들어가는데, 둘 다 코드가 아니라 여기
--  있어야 한다 — 학교마다 성적 체계가 다르고(P/NP, 백분위), 사다리는 1차
--  검증 뒤에 반드시 조정되기 때문이다. 배포 없이 바꿀 수 있어야 한다.
-- ============================================================

CREATE TABLE grade_points (
  grade        TEXT PRIMARY KEY,          -- A+ ~ D, P
  coefficient  NUMERIC(3,2) NOT NULL CHECK (coefficient > 0 AND coefficient <= 1),
  sort_no      INTEGER NOT NULL DEFAULT 0
);
COMMENT ON TABLE grade_points IS
  '성적계수. 증거 배점 × 이 값 × 출처 신뢰도 = 그 증거 한 줄의 점수';

INSERT INTO grade_points (grade, coefficient, sort_no) VALUES
  ('A+', 1.00, 1), ('A', 0.95, 2), ('B+', 0.85, 3), ('B', 0.75, 4),
  ('C+', 0.65, 5), ('C', 0.55, 6), ('D', 0.35, 7), ('P', 0.70, 8)
ON CONFLICT (grade) DO UPDATE SET coefficient = EXCLUDED.coefficient;

CREATE TABLE level_ladder (
  min_raw     NUMERIC(4,2) PRIMARY KEY,   -- 이 값 이상이면
  held_level  SMALLINT NOT NULL CHECK (held_level BETWEEN 0 AND 5)
);
COMMENT ON TABLE level_ladder IS
  '증거 점수 합을 0~5 레벨로 바꾸는 사다리. 경계는 하한 포함이다.
   1차 100명 검증에서 가장 먼저 조정될 값이라 테이블에 둔다';

INSERT INTO level_ladder (min_raw, held_level) VALUES
  (0.00, 0), (0.80, 1), (1.80, 2), (2.80, 3), (3.80, 4), (4.80, 5)
ON CONFLICT (min_raw) DO UPDATE SET held_level = EXCLUDED.held_level;

-- 증거 점수 합의 상한. 같은 역량에 과목 열 개를 넣어도 5레벨을 넘지 않는다.
ALTER TABLE learner_competency_levels
  ADD CONSTRAINT learner_competency_levels_raw_cap CHECK (held_raw <= 6.0);


-- ============================================================
--  24. 회원 삭제가 막히지 않게 한다
--
--  개인정보보호법은 보유기간이 끝나거나 본인이 요구하면 파기하도록 한다.
--  그런데 users 를 가리키는 외래키 넷이 NO ACTION 이라 DELETE 가 그냥
--  에러로 끝난다. 지울 수 없는 개인정보는 법을 지킬 수 없다는 뜻이다.
--
--  둘로 나눠 잡는다.
--    본인의 것(attempts)      → 사람과 함께 지운다. CASCADE
--    조직의 것(seats·감사 기록) → 사람만 떼어낸다. SET NULL
--
--  좌석은 계약이 산 자산이지 개인정보가 아니다. 학생이 나가면 주인만
--  비고 좌석은 학과에 남는다. 검수·발급자 기록도 마찬가지로 "누가 했는지"
--  만 지우고 행은 남긴다 — 감사 기록 자체를 지우면 안 된다.
-- ============================================================

ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_user_id_fkey;
ALTER TABLE attempts ADD CONSTRAINT attempts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_user_id_fkey;
ALTER TABLE seats ADD CONSTRAINT seats_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE learner_evidence DROP CONSTRAINT IF EXISTS learner_evidence_verified_by_fkey;
ALTER TABLE learner_evidence ADD CONSTRAINT learner_evidence_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_issued_by_fkey;
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_issued_by_fkey
  FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE skill_candidates DROP CONSTRAINT IF EXISTS skill_candidates_reviewed_by_fkey;
ALTER TABLE skill_candidates ADD CONSTRAINT skill_candidates_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 주문이 지워질 때 좌석까지 막히지 않게 한다. 좌석은 주문의 결과물이지
-- 주문 자체가 아니다.
ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_order_id_fkey;
ALTER TABLE seats ADD CONSTRAINT seats_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- ⚠ 여기까지는 "지울 수 있게" 만든 것이고, 실제 운영에서 쓸 길은 아니다.
--
-- orders.user_id 가 CASCADE 라, 회원을 하드 딜리트하면 결제 기록까지 같이
-- 사라진다. 그런데 전자상거래법 제6조는 대금결제·재화공급 기록을 5년간
-- 보존하도록 한다. 개인정보보호법의 파기 의무와 이 보존 의무가 부딪히는
-- 자리이고, 실무의 답은 "지우기" 가 아니라 **익명화**다 —
--   users 의 이메일·이름·로그인 아이디를 지우고 status 를 'erased' 로 두면,
--   orders 는 그대로 남아 5년 보존이 되고 사람은 식별되지 않는다.
--
-- 익명화 절차는 아직 만들지 않았다. 만들기 전까지 회원 삭제를 운영에서
-- 쓰지 말 것. 위 제약들은 그 절차를 만들 때 막히지 않게 미리 풀어둔 것이다.


-- ============================================================
--  25. 파기 — 지우는 것이 아니라 사람을 떼어내는 것
--
--  두 법이 반대 방향으로 당긴다.
--    개인정보보호법 제21조   보유기간이 끝나거나 본인이 요구하면 지체 없이 파기
--    전자상거래법 제6조·시행령 제6조  대금결제·재화공급 기록은 5년 보존
--
--  그래서 하드 딜리트가 답이 아니다. users 행에서 사람을 알아볼 수 있는 값만
--  지우고(익명화), 거래 기록은 그대로 둔다. 익명화가 끝나면 남은 행은
--  개인정보가 아니므로 5년 보존과 부딪히지 않는다.
--
--  같은 원칙으로 검사 응답과 점수도 남긴다 — 사람과 이어지지 않는 숫자는
--  규준(norm)을 만드는 근거이고, 지우면 그 해 학과 집계가 뒤늦게 흔들린다.
--  대신 자유입력이 섞인 것(증거 이름)과 준식별자(학교·지역·소속)는 지운다.
--  "기계공학과 3학년 대전 거주" 세 칸이면 사람이 좁혀진다.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS erased_at TIMESTAMPTZ;
COMMENT ON COLUMN users.erased_at IS
  '익명화한 시각. 이 값이 있으면 로그인할 수 없고 화면에 "탈퇴한 회원" 으로 나온다';

CREATE INDEX IF NOT EXISTS idx_users_erased ON users(erased_at) WHERE erased_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS erasure_log (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  requested_by TEXT NOT NULL,            -- self | admin
  reason       TEXT,                     -- withdraw | retention | request
  removed      JSONB NOT NULL,           -- 무엇을 몇 행 지웠는지
  kept         JSONB NOT NULL,           -- 무엇을 왜 남겼는지
  erased_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE erasure_log IS
  '파기했다는 사실 자체는 증명할 수 있어야 한다(개인정보보호법 제21조 제3항).
   그런데 이 표에 개인정보를 또 남기면 파기가 아니다 — 그래서 이름도 이메일도
   담지 않고, 어떤 표에서 몇 행이 지워졌는지 숫자만 남긴다';


-- ============================================================
--  26. 등수 대신 묶음
--
--  500명 시뮬레이션에서 나온 숫자.
--    1위와 2위 적합도 차이  중앙 3.7점
--    측정 오차(95% 구간 반폭) 중앙 7.3점
--
--  오차가 차이보다 크다. 1위와 2위를 갈라 적으면 그건 없는 정밀도를 파는
--  것이다. 반면 1위와 3위(7.4점), 1위와 8위(25.6점)는 갈린다.
--
--  그래서 등수를 1~8 로 늘어놓지 않고, 구간이 겹치는 직무를 한 묶음으로
--  보여준다. "1위 기계설계" 가 아니라 "1군 — 기계설계 · 자동차 R&D" 다.
--  rank_no 는 정렬용으로 남기고, 사람이 읽는 단위는 tier 다.
-- ============================================================

ALTER TABLE job_fit_scores ADD COLUMN IF NOT EXISTS tier SMALLINT;
COMMENT ON COLUMN job_fit_scores.tier IS
  '신뢰구간이 겹치는 직무끼리 같은 번호를 갖는다. 결과지는 등수가 아니라 이것을 읽는다';


-- ============================================================
--  27. 메트리 플러스 — 전공이 없는 검사지와 전공 적합 점수
--
--  대학판은 "이 전공 학생이 어느 직무로 가나" 를 낸다. 고교판은 전공이
--  아직 없으므로 "어느 전공으로 가나" 를 낸다. 재는 축은 같다 —
--  activity 8축과 업무성향 6축. 고1 때 잰 DESIGN 이 대학 2학년 때 잰
--  DESIGN 과 같은 자로 읽혀야 learner_profiles 의 연속성이 말이 된다.
--
--  걸림돌은 세 개였고 전부 여기서 푼다.
--    1) instruments.major_id 가 NOT NULL 이라 전공 없는 검사지를 못 만든다
--    2) 채점이 job_areas 를 전부 긁어서, 고교 영역이 대학 채점에 섞인다
--    3) 전공 적합도를 넣을 표가 없다 (job_fit_scores 는 직무를 가리킨다)
-- ============================================================

-- 1) 전공 없는 검사지. 대신 instrument_key 로 유일성을 잡는다 —
--    tracks.instrument_key 가 처음부터 가리키고 있던 값이다.
ALTER TABLE instruments ALTER COLUMN major_id DROP NOT NULL;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS instrument_key TEXT;

UPDATE instruments i SET instrument_key = 'PCA_' || m.code || '_V1'
  FROM majors m WHERE m.id = i.major_id AND i.instrument_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_instruments_key
  ON instruments(instrument_key, version) WHERE instrument_key IS NOT NULL;

COMMENT ON COLUMN instruments.instrument_key IS
  '검사지를 부르는 이름. 전공이 있는 검사지는 (major_id, version) 으로도
   유일하지만 고교판은 전공이 없어서 이 값이 유일성을 진다';

-- 2) 영역을 검사지에 묶는다. 이게 없으면 채점이 SELECT code FROM job_areas
--    로 전부 긁어, 고교 영역 8개가 대학 응시자의 채점에 0점으로 끼어든다.
ALTER TABLE job_areas ADD COLUMN IF NOT EXISTS instrument_key TEXT;

UPDATE job_areas SET instrument_key = 'PCA_ME_V1' WHERE instrument_key IS NULL;

COMMENT ON COLUMN job_areas.instrument_key IS
  '이 영역을 재는 검사지. 채점은 응시자가 본 검사지의 영역만 본다';

CREATE INDEX IF NOT EXISTS idx_job_areas_instrument ON job_areas(instrument_key, sort_no);

-- 3) 전공 적합 점수. 표는 16절에 이미 있다 — 칸만 맞춘다.
--    job_fit_scores 와 같은 산식으로 계산되므로 남기는 값도 같아야 한다.
--    a_score·p_score 를 안 남기면 "왜 이 점수인가" 를 화면에서 펼칠 수 없고,
--    tier 가 없으면 결과지가 등수를 적게 된다(26절).
ALTER TABLE major_fit_scores ADD COLUMN IF NOT EXISTS a_score NUMERIC(5,1);
ALTER TABLE major_fit_scores ADD COLUMN IF NOT EXISTS p_score NUMERIC(5,1);
ALTER TABLE major_fit_scores ADD COLUMN IF NOT EXISTS tier    SMALLINT;

-- 고1은 증거가 없어 구간이 넓다. 구간이 겹치면 순위를 읽히지 않게 NOT NULL 을 푼다
ALTER TABLE major_fit_scores ALTER COLUMN band_low  DROP NOT NULL;
ALTER TABLE major_fit_scores ALTER COLUMN band_high DROP NOT NULL;

COMMENT ON TABLE major_fit_scores IS
  '고교판 결과. 가중치는 major_fit_weights 에 있고 산식은 직무 적합과 같다.
   등수가 아니라 tier 를 읽는다 — 고1의 1위와 2위를 갈라 적을 만큼 정확하지 않다';

-- 4) 중학생. 트랙을 새로 만들지 않는다 — learner_goals 에 행 하나다.
--    중학생이 앞둔 선택은 과목도 직무도 아니고 "어느 고등학교" 하나다.
INSERT INTO learner_goals (code, sort_no) VALUES ('hs', 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO scoring_profiles
  (track_code, goal_code, w_aptitude, w_skill, w_preference, w_coursework, display_mode, top_n)
VALUES ('HS', 'hs', 0.700, 0.000, 0.300, 0.000, 'band', 3)
ON CONFLICT (track_code, goal_code) DO UPDATE SET
  w_aptitude = EXCLUDED.w_aptitude, w_skill = EXCLUDED.w_skill,
  w_preference = EXCLUDED.w_preference, w_coursework = EXCLUDED.w_coursework,
  display_mode = EXCLUDED.display_mode, top_n = EXCLUDED.top_n;

-- 중학생에게는 증거(S)도 이력(C)도 0 이다. 있지도 않은 것에 가중치를 주면
-- 점수가 아니라 빈칸에 곱하기를 하는 것이다.


-- 5) 어떤 상품을 샀는지가 어떤 검사지를 푸는지를 정한다.
--
--    예전에는 openAttempt 가 `ORDER BY id DESC LIMIT 1` 로 검사지를 골랐다.
--    검사지가 하나뿐일 때는 맞는 말이었지만, 고교판을 올리는 순간 29,000원을
--    내고 대학판을 산 사람이 고교 문항 115개를 받게 된다. 상품이 정하게 한다.
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_code TEXT REFERENCES tracks(code);
COMMENT ON COLUMN products.track_code IS
  '이 상품을 사면 어느 트랙의 검사지를 푸는가. 전공이 늘어도 상품은 그대로이고
   전공은 응시자의 learner_profiles 가 정한다';

UPDATE products SET track_code = 'UNIV_LOW' WHERE code = 'REPORT_UNIV' AND track_code IS NULL;
UPDATE products SET track_code = 'HS'       WHERE code = 'REPORT_HS'   AND track_code IS NULL;


-- ============================================================
--  28. 과목 처방 — 고교학점제 2022 개정 교육과정
--
--  고교판 결과지의 마지막 칸이다. "기계공학이 앞에 있습니다" 로 끝나면
--  학생이 다음 주에 할 일이 없다. 2학년 과목 신청서에 무엇을 적을지까지
--  내려가야 결과지가 쓰인다.
--
--  기존 hs_subjects 는 (코드·구분·학점) 세 칸뿐이라 처방을 만들 수 없었다.
--  실제로 필요한 것은 다섯 개가 더 있다.
--    교과군      수학인지 과학인지 — 대학 권장이 교과군 단위로 걸린다
--    선수과목    미적분Ⅱ 를 미적분Ⅰ 없이 신청할 수 없다
--    권장 학년   2학년에 넣을지 3학년에 넣을지
--    석차등급    2028 대입에서 사회·과학 융합선택 9과목만 절대평가다
--    수능 범위   2028 수능은 선택과목이 없는 통합형이다
-- ============================================================

ALTER TABLE hs_subjects ADD COLUMN IF NOT EXISTS subject_group TEXT;
ALTER TABLE hs_subjects ADD COLUMN IF NOT EXISTS prereq_code   TEXT;
ALTER TABLE hs_subjects ADD COLUMN IF NOT EXISTS grade_hint    SMALLINT;
ALTER TABLE hs_subjects ADD COLUMN IF NOT EXISTS absolute_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE hs_subjects ADD COLUMN IF NOT EXISTS csat          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE hs_subjects ADD COLUMN IF NOT EXISTS sort_no       INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN hs_subjects.prereq_code IS
  '이 과목 앞에 들어야 하는 과목. 처방이 "미적분Ⅱ" 를 먼저 적어 놓고
   "미적분Ⅰ" 을 빠뜨리면 학생은 그 신청서를 낼 수 없다';
COMMENT ON COLUMN hs_subjects.absolute_only IS
  '상대평가 석차등급을 병기하지 않는 과목(사회·과학 융합선택 9과목).
   내신 부담이 적어 탐구형 과목을 권하기 좋은 자리라 화면에 표시한다';
COMMENT ON COLUMN hs_subjects.grade_hint IS
  '몇 학년에 두는 것이 보통인가. 학교 편제가 우선이므로 참고값이다';

CREATE INDEX IF NOT EXISTS idx_hs_subjects_group ON hs_subjects(country, subject_group, sort_no);

-- 교과군 이름도 translations 로 간다(설계 원칙 2). translations.row_id 가
-- BIGINT 라 코드 문자열을 그대로 넣을 수 없어 표를 하나 둔다.
CREATE TABLE IF NOT EXISTS hs_subject_groups (
  id       BIGSERIAL PRIMARY KEY,
  code     TEXT NOT NULL UNIQUE,        -- KOR MATH ENG SOC SCI TECH INFO
  sort_no  INTEGER NOT NULL DEFAULT 0
);

-- 왜 이 과목인지를 함께 담는다. 이유 없는 목록은 학생이 믿지 않는다.
-- 문장은 translations 에 두고(설계 원칙 2), 여기에는 연결만 남긴다.
ALTER TABLE hs_subject_major_map ADD COLUMN IF NOT EXISTS id BIGSERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hs_subject_major_id ON hs_subject_major_map(id);
COMMENT ON COLUMN hs_subject_major_map.id IS
  '(과목, 전공) 쌍마다 "왜 이 과목인가" 한 줄이 붙는다. translations 가
   가리킬 행 번호가 필요해 복합키와 별도로 둔다';
COMMENT ON COLUMN hs_subject_major_map.necessity IS
  '3 사실상 필수 — 안 들으면 대학 1~2학년이 막힌다
   2 권장 — 들으면 유리하다
   1 도움 — 관심이 그쪽이면 열어 둔다';

-- 대학이 권장하는 과목은 계열이 요구하는 과목과 근거가 다르다. 섞지 않는다.
CREATE TABLE IF NOT EXISTS hs_univ_subject_recs (
  id          BIGSERIAL PRIMARY KEY,
  univ_code   TEXT NOT NULL,             -- SNU ...
  track_code  TEXT NOT NULL,             -- type2 (자연계열 모집단위)
  subject_id  BIGINT REFERENCES hs_subjects(id) ON DELETE CASCADE,
  level       TEXT NOT NULL,             -- required(권장) | preferred(우선 권장) | core(핵심권장)
  -- 같은 대학·트랙 안에서도 계열마다 권장이 갈린다. 서울대 유형② 는 전체에
  -- 기하·미적분Ⅱ 를 권장하지만, 물리학 우선 이수는 공과대학 일부 전공에만 붙는다.
  -- NULL 이면 그 트랙 전체에 걸린다.
  major_id    BIGINT REFERENCES majors(id) ON DELETE CASCADE,
  UNIQUE (univ_code, track_code, subject_id, major_id)
);
ALTER TABLE hs_univ_subject_recs
  ADD COLUMN IF NOT EXISTS major_id BIGINT REFERENCES majors(id) ON DELETE CASCADE;
COMMENT ON TABLE hs_univ_subject_recs IS
  '"서울대는 기하와 미적분Ⅱ 를 권장한다" 처럼 대학이 이름을 걸고 밝힌 것만 담는다.
   학원이 추측한 것은 담지 않는다 — 출처가 없는 권장은 학부모가 가장 먼저 따진다';

-- 과목 하나가 아니라 "과학 진로선택 3과목 이상" 처럼 묶음으로 걸리는 권장.
CREATE TABLE IF NOT EXISTS hs_univ_subject_rules (
  id          BIGSERIAL PRIMARY KEY,
  univ_code   TEXT NOT NULL,
  track_code  TEXT NOT NULL,
  subject_group TEXT NOT NULL,           -- SCI ...
  category    TEXT NOT NULL,             -- career ...
  min_count   SMALLINT NOT NULL,
  UNIQUE (univ_code, track_code, subject_group, category)
);


-- ============================================================
--  29. 현장에서 거꾸로 내려오는 사슬
--
--  "기계공학이 앞에 있습니다" 다음에 학생이 묻는 것은 하나다 — 그래서 뭘
--  해야 하는데. 28절의 과목 처방이 "무엇을" 에 답했다면 여기는 "왜" 에
--  답한다. 그리고 그 왜는 교실이 아니라 현장에서 와야 한다.
--
--    직무          구조해석 엔지니어
--    현장 장면      배터리 팩이 진동에 깨질지 실차 시험 전에 계산으로 짚는다
--    필요한 것      실제 하중을 계산 가능한 조건으로 바꾸는 일
--    대학에서       정역학 · 동역학 · 재료역학
--    고등학교에서   물리학 · 역학과 에너지
--    중학교에서     부러진 의자를 보고 왜 거기가 먼저 갔는지 설명해 보기
--
--  사슬의 방향이 중요하다. 과목에서 출발해 직업을 붙이면 "이 과목을 들으면
--  이런 직업" 이라는 빈말이 되고, 직무에서 출발해 내려오면 "그 일이 이것을
--  요구하기 때문에 이 과목" 이 된다. 뒤엣것만 학부모를 설득한다.
-- ============================================================

CREATE TABLE IF NOT EXISTS career_roles (
  id        BIGSERIAL PRIMARY KEY,
  major_id  BIGINT NOT NULL REFERENCES majors(id) ON DELETE CASCADE,
  -- 대학판에 같은 직무가 있으면 잇는다. 없는 계열도 있어서 NULL 을 허용한다.
  job_id    BIGINT REFERENCES job_clusters(id),
  sort_no   SMALLINT NOT NULL,
  UNIQUE (major_id, sort_no)
);
COMMENT ON TABLE career_roles IS
  '계열마다 대표 직무 두엇. 이름과 현장 장면은 translations 에 있다.
   특정 회사 사례가 아니라 그 분야에서 실제로 일어나는 일을 압축한 것이다';

CREATE TABLE IF NOT EXISTS career_needs (
  id       BIGSERIAL PRIMARY KEY,
  role_id  BIGINT NOT NULL REFERENCES career_roles(id) ON DELETE CASCADE,
  sort_no  SMALLINT NOT NULL,
  UNIQUE (role_id, sort_no)
);
COMMENT ON TABLE career_needs IS
  '그 직무가 현장에서 요구하는 것 하나. 딸린 문장 다섯 개가 translations 에 있다 —
   what(현장에서 하는 일) · univ(대학 과목) · hs_why(고교 과목이 왜) ·
   ms(중학교에서 할 것) · ms_why(그게 왜)';

CREATE TABLE IF NOT EXISTS career_need_subjects (
  need_id     BIGINT NOT NULL REFERENCES career_needs(id) ON DELETE CASCADE,
  subject_id  BIGINT NOT NULL REFERENCES hs_subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (need_id, subject_id)
);
COMMENT ON TABLE career_need_subjects IS
  '현장의 요구 ↔ 고교 과목. 이 연결이 있어야 과목 처방의 각 줄이
   "이건 현장 어디서 쓰인다" 를 달 수 있다. 28절 처방과 29절 사슬을 잇는 표다';

CREATE INDEX IF NOT EXISTS idx_career_need_subject ON career_need_subjects(subject_id);

-- ════════════════════════════════════════════════════════════════
-- 30. 무료 구간과 유료 구간
--
-- 메트리 플러스가 파는 것은 지표가 아니라 사슬이다.
--
-- 지표(115문항 → 8계열 적합)는 커리어넷·워크넷이 무료로 주는 것과
-- 같은 층이고, 무엇보다 규준(norm)이 없어서 "상위 몇 %" 를 말할 수
-- 없다. 규준 없이 팔 수 있는 것은 사슬 쪽이다 — "구조해석 엔지니어가
-- 하중 조건을 세운다" 는 그 학생의 점수가 조금 틀려도 참이다.
--
-- 그래서 지표는 무료로 열어 유입으로 쓰고, 현장 사슬과 과목 처방을
-- 유료 구간으로 가른다.
--
--   무료   00 응답 신뢰도 · 01 계열 적합(1군까지) · 02 활동 8축
--   유료   03 성향 6축 · 05 현장 사슬 · 06 과목 처방 · 07 다음 학기
--
-- 등급은 응시가 아니라 "그 응시에 무엇을 살 수 있었나" 가 정한다.
-- 무료로 본 학생이 나중에 결제하면 **같은 응시가 열린다** — 115문항을
-- 다시 풀게 하면 아무도 결제하지 않는다.
-- ════════════════════════════════════════════════════════════════

-- 상품마다 어느 구간까지 여는가. 기존 상품은 전부 full 이다.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS report_level TEXT NOT NULL DEFAULT 'full'
    CHECK (report_level IN ('free', 'full'));
COMMENT ON COLUMN products.report_level IS
  'free = 지표까지만 · full = 사슬과 과목 처방까지.
   학과·학교 단체 계약 좌석(contract_id)은 상품을 거치지 않으므로 항상 full 이다 —
   학교가 사는 것이 바로 사슬이다';

-- 무료로 본 응시를 나중에 결제로 여는 기록.
CREATE TABLE IF NOT EXISTS report_grants (
  attempt_id  BIGINT PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
  order_id    BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  level       TEXT NOT NULL CHECK (level IN ('full')),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE report_grants IS
  '무료 응시 하나를 유료 구간까지 연 기록. attempt 당 한 줄이고,
   상품 등급보다 이 표가 우선한다. 결제를 취소해도 줄을 지우지 않는다 —
   이미 본 것을 되돌릴 수는 없고, 환불 판단은 orders 쪽이 한다';

INSERT INTO products (code, kind, amount, currency, seat_count, active, track_code, report_level)
VALUES
  -- 무료 진단. 금액이 0이므로 결제 화면을 거치지 않는다
  ('HS_FREE',    'report', 0,     'KRW', 1, true, 'HS', 'free'),
  -- 무료로 본 학생이 사는 것. 같은 응시가 열린다
  ('HS_UPGRADE', 'report', 19000, 'KRW', 1, true, 'HS', 'full')
ON CONFLICT (code) DO UPDATE
  SET amount = EXCLUDED.amount,
      track_code = EXCLUDED.track_code,
      report_level = EXCLUDED.report_level,
      active = EXCLUDED.active;

-- 어느 응시를 여는 결제인가. 업그레이드 상품에만 찬다.
-- 학생이 여러 번 무료로 봤을 수 있으므로 "최근 응시" 로 추측하지 않는다 —
-- 결제 화면이 받은 응시 번호를 주문에 적어 두고 그것만 연다.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS upgrades_attempt_id BIGINT REFERENCES attempts(id) ON DELETE SET NULL;
COMMENT ON COLUMN orders.upgrades_attempt_id IS
  '유료 구간을 열어 줄 응시. report_level=full 상품을 이미 본 응시에 붙일 때 쓴다.
   비어 있으면 새 좌석을 발급하는 보통 주문이다';
