-- ============================================================
--  ECI 확장 스키마 — Engineering Career Intelligence
--  db/schema.sql 을 적용한 다음에 적용한다.
--
--  적용 순서
--    1. db/schema.sql            기존 검사 플랫폼
--    2. db/schema_eci.sql        이 파일
--    3. db/seed/eci/skill_tree.sql   자동 생성 시드
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
