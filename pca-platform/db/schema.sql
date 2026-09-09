-- ============================================================
--  단체 PCA 플랫폼 — 계정 발급형 MVP 스키마 (PostgreSQL)
--  초안 v0.1
--
--  설계 원칙 3가지
--   1. 로그인 주체는 users 하나. 기관 소속은 memberships로 연결한다.
--   2. 사람이 읽는 이름은 전부 translations에 모은다. 나라 추가 = 행 추가.
--   3. 채점 산식은 코드가 아니라 scoring_weights 테이블에 데이터로 둔다.
-- ============================================================


-- ============================================================
--  1. 계정과 조직
-- ============================================================

CREATE TABLE organizations (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,          -- 내부 식별 코드
  country     CHAR(2) NOT NULL,              -- KR, TR, US, JP, KZ
  org_type    TEXT NOT NULL,                 -- university | department | company
  parent_id   BIGINT REFERENCES organizations(id),  -- 학과의 상위 대학
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE organizations IS '계약 주체. 대학과 학과를 parent_id로 계층 구성';

CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT UNIQUE,                -- 학생 계정은 NULL 가능(학번 로그인)
  login_id       TEXT UNIQUE,                -- 학번 등 기관이 부여한 ID
  password_hash  TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  locale         CHAR(2) NOT NULL DEFAULT 'ko',
  status         TEXT NOT NULL DEFAULT 'active',   -- active | suspended | pending
  must_reset_pw  BOOLEAN NOT NULL DEFAULT true,    -- 일괄 발급 계정의 첫 로그인 강제 변경
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE users IS '로그인 주체. 개인회원도 기관 소속 학생도 모두 여기에 들어간다';

CREATE TABLE memberships (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id     BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,                  -- superadmin | org_admin | instructor | student
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id, role)
);
COMMENT ON TABLE memberships IS '소속 없는 개인회원은 여기에 행이 없다';

CREATE INDEX idx_memberships_org ON memberships(org_id, role);


-- ============================================================
--  2. 다국어
-- ============================================================

CREATE TABLE translations (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,                 -- majors | job_clusters | competencies | ...
  row_id      BIGINT NOT NULL,
  lang        CHAR(2) NOT NULL,
  field       TEXT NOT NULL,                 -- name | description | short_name
  value       TEXT NOT NULL,
  UNIQUE (table_name, row_id, lang, field)
);
COMMENT ON TABLE translations IS '나라를 추가할 때 컬럼이 아니라 행이 늘어난다';

CREATE INDEX idx_translations_lookup ON translations(table_name, row_id, lang);


-- ============================================================
--  3. 계약과 응시권
-- ============================================================

CREATE TABLE contracts (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT NOT NULL REFERENCES organizations(id),
  title       TEXT NOT NULL,
  starts_on   DATE NOT NULL,
  ends_on     DATE NOT NULL,
  seat_count  INTEGER NOT NULL,              -- 구매한 응시권 수량
  status      TEXT NOT NULL DEFAULT 'active',
  memo        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seats (
  id           BIGSERIAL PRIMARY KEY,
  contract_id  BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id      BIGINT REFERENCES users(id),  -- 배정 전에는 NULL
  assigned_at  TIMESTAMPTZ,
  consumed_at  TIMESTAMPTZ,                  -- 응시 시작 시각. 소진 판정 기준
  expires_at   TIMESTAMPTZ
);
COMMENT ON TABLE seats IS '응시권 1개 = 1행. 계약 생성 시 seat_count만큼 미리 만든다';

CREATE INDEX idx_seats_contract ON seats(contract_id) WHERE consumed_at IS NULL;


-- ============================================================
--  4. 매핑 데이터 — 글로벌 공통
-- ============================================================

CREATE TABLE majors (
  id    BIGSERIAL PRIMARY KEY,
  code  TEXT NOT NULL UNIQUE                 -- ME, EE, CE ...
);

CREATE TABLE job_clusters (
  id         BIGSERIAL PRIMARY KEY,
  major_id   BIGINT NOT NULL REFERENCES majors(id),
  code       TEXT NOT NULL,
  onet_code  TEXT,                           -- 미국 O*NET 코드. 해외 진출 시 매핑 기준
  sort_no    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (major_id, code)
);

CREATE TABLE competencies (
  id         BIGSERIAL PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,           -- ANSYS, FEM, MATLAB ...
  comp_type  TEXT NOT NULL                   -- software | theory | tool | soft_skill
);

CREATE TABLE job_competency_map (
  job_id          BIGINT NOT NULL REFERENCES job_clusters(id) ON DELETE CASCADE,
  competency_id   BIGINT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  required_level  SMALLINT NOT NULL CHECK (required_level BETWEEN 1 AND 5),
  PRIMARY KEY (job_id, competency_id)
);
COMMENT ON TABLE job_competency_map IS '결과지의 역량 갭 화면이 이 표를 그대로 그린다';


-- ============================================================
--  5. 매핑 데이터 — 국가·대학별
-- ============================================================

CREATE TABLE courses (
  id           BIGSERIAL PRIMARY KEY,
  org_id       BIGINT NOT NULL REFERENCES organizations(id),  -- 대학
  major_id     BIGINT NOT NULL REFERENCES majors(id),
  course_code  TEXT NOT NULL,                -- ME401
  credit       SMALLINT,
  term_hint    TEXT,                         -- '4-1' 같은 개설 학기 힌트
  is_offered   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (org_id, course_code)
);

CREATE TABLE course_competency_map (
  course_id      BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  competency_id  BIGINT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, competency_id)
);


-- ============================================================
--  6. 검사 문항
-- ============================================================

CREATE TABLE instruments (
  id          BIGSERIAL PRIMARY KEY,
  major_id    BIGINT NOT NULL REFERENCES majors(id),
  version     TEXT NOT NULL,                 -- v1.0
  status      TEXT NOT NULL DEFAULT 'draft', -- draft | published | retired
  published_at TIMESTAMPTZ,
  UNIQUE (major_id, version)
);
COMMENT ON TABLE instruments IS '문항을 고치면 새 버전을 만든다. 기존 응시 결과를 보존하기 위함';

CREATE TABLE indicators (
  id             BIGSERIAL PRIMARY KEY,
  instrument_id  BIGINT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,              -- ANALYTIC, DESIGN, FIELD ...
  UNIQUE (instrument_id, code)
);

CREATE TABLE questions (
  id             BIGSERIAL PRIMARY KEY,
  instrument_id  BIGINT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  indicator_id   BIGINT REFERENCES indicators(id),
  competency_id  BIGINT REFERENCES competencies(id),  -- 역량 보유 수준을 직접 묻는 문항
  order_no       INTEGER NOT NULL,
  answer_type    TEXT NOT NULL,              -- likert5 | choice
  is_reversed    BOOLEAN NOT NULL DEFAULT false,      -- 역채점 문항
  UNIQUE (instrument_id, order_no)
);

CREATE TABLE question_options (
  id           BIGSERIAL PRIMARY KEY,
  question_id  BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_no     SMALLINT NOT NULL,
  score        NUMERIC(5,2) NOT NULL,        -- 이 선택지의 배점
  UNIQUE (question_id, order_no)
);


-- ============================================================
--  7. 채점 규칙 — 산식을 코드가 아닌 데이터로
-- ============================================================

CREATE TABLE scoring_weights (
  instrument_id  BIGINT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  indicator_id   BIGINT NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  job_id         BIGINT NOT NULL REFERENCES job_clusters(id) ON DELETE CASCADE,
  weight         NUMERIC(6,3) NOT NULL,
  PRIMARY KEY (instrument_id, indicator_id, job_id)
);
COMMENT ON TABLE scoring_weights IS
  '직무 적합도 = 지표 점수 × 가중치의 합. 산식이 확정되지 않아도 개발을 시작할 수 있고,
   나중에 학과별·국가별로 가중치를 다르게 줄 수 있다';


-- ============================================================
--  8. 회차와 응시
-- ============================================================

CREATE TABLE test_sessions (
  id             BIGSERIAL PRIMARY KEY,
  org_id         BIGINT NOT NULL REFERENCES organizations(id),
  contract_id    BIGINT NOT NULL REFERENCES contracts(id),
  instrument_id  BIGINT NOT NULL REFERENCES instruments(id),
  name           TEXT NOT NULL,              -- '2026-1학기 기계공학과 3학년'
  opens_at       TIMESTAMPTZ NOT NULL,
  closes_at      TIMESTAMPTZ NOT NULL,
  release_mode   TEXT NOT NULL DEFAULT 'manual',  -- manual(담당자 승인) | instant
  released_at    TIMESTAMPTZ,                -- 학생 공개 시각
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN test_sessions.released_at IS '단체 리포트 화면의 공개 버튼이 이 값을 채운다';

CREATE TABLE attempts (
  id            BIGSERIAL PRIMARY KEY,
  session_id    BIGINT NOT NULL REFERENCES test_sessions(id),
  user_id       BIGINT NOT NULL REFERENCES users(id),
  seat_id       BIGINT REFERENCES seats(id),
  status        TEXT NOT NULL DEFAULT 'ready',  -- ready | in_progress | submitted | scored
  last_order_no INTEGER NOT NULL DEFAULT 0,     -- 이어보기 지점
  started_at    TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ,
  scored_at     TIMESTAMPTZ,
  UNIQUE (session_id, user_id)
);

CREATE TABLE responses (
  attempt_id   BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id  BIGINT NOT NULL REFERENCES questions(id),
  option_id    BIGINT REFERENCES question_options(id),
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id)
);
COMMENT ON TABLE responses IS '문항 하나 고를 때마다 즉시 저장. 중간 이탈해도 이어보기가 된다';


-- ============================================================
--  9. 채점 결과
-- ============================================================

CREATE TABLE indicator_scores (
  attempt_id    BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  indicator_id  BIGINT NOT NULL REFERENCES indicators(id),
  raw_score     NUMERIC(7,2) NOT NULL,
  scaled_score  NUMERIC(5,1) NOT NULL,       -- 0~100 환산
  PRIMARY KEY (attempt_id, indicator_id)
);

CREATE TABLE job_fit_scores (
  attempt_id  BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  job_id      BIGINT NOT NULL REFERENCES job_clusters(id),
  fit_score   NUMERIC(5,1) NOT NULL,         -- 결과지의 82점
  rank_no     SMALLINT NOT NULL,
  PRIMARY KEY (attempt_id, job_id)
);

CREATE TABLE competency_levels (
  attempt_id     BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  competency_id  BIGINT NOT NULL REFERENCES competencies(id),
  held_level     SMALLINT NOT NULL CHECK (held_level BETWEEN 0 AND 5),
  PRIMARY KEY (attempt_id, competency_id)
);
COMMENT ON TABLE competency_levels IS
  '결과지의 빗금(부족분) = job_competency_map.required_level - held_level';

CREATE INDEX idx_jobfit_rank ON job_fit_scores(attempt_id, rank_no);


-- ============================================================
--  10. 인증 보조 (초안 v0.2에서 추가)
--
--  비밀번호 재설정은 1단계 범위다. 학생 계정은 email이 NULL일 수 있어
--  메일 발송을 전제할 수 없으므로, 담당자가 재설정 링크를 발급하는 방식도
--  같은 테이블로 처리한다. issued_by가 NULL이면 본인이 요청한 것이다.
-- ============================================================

CREATE TABLE password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,          -- 원문 토큰은 저장하지 않는다
  issued_by   BIGINT REFERENCES users(id),   -- 담당자 발급이면 그 사람, 본인 요청이면 NULL
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE password_reset_tokens IS
  '토큰 원문은 링크에만 있고 DB에는 해시만 둔다. 사용하면 used_at을 채워 재사용을 막는다';

CREATE INDEX idx_reset_active ON password_reset_tokens(user_id) WHERE used_at IS NULL;


-- ============================================================
--  11. 단체 신청과 전용 링크 (초안 v0.3에서 추가)
--
--  소개 사이트에서 단체가 도입을 신청하고, 승인되면 그 단체 전용 링크를
--  받아 학생에게 뿌리는 흐름이다. 제안서의 "전용 링크 발급 → 학생 응시 →
--  성과 자동 집계" 를 데이터로 옮긴 것이다.
--
--  셀프 가입이 아니다. 신청은 누구나 넣을 수 있지만 organizations 행과
--  링크는 운영자가 승인해야 생긴다 (확정된 결정: "계약 후 관리자가 발급").
-- ============================================================

CREATE TABLE org_applications (
  id             BIGSERIAL PRIMARY KEY,
  ref_code       TEXT NOT NULL UNIQUE,       -- 신청자에게 알려주는 접수번호
  site           TEXT NOT NULL,              -- 어느 나라 소개 사이트에서 왔는가 (global|kr|...)
  country        CHAR(2) NOT NULL,
  org_name       TEXT NOT NULL,              -- 적어 낸 그대로. 아직 organizations 행이 없다
  dept_name      TEXT,
  contact_name   TEXT NOT NULL,
  contact_email  TEXT NOT NULL,
  contact_phone  TEXT,
  expected_size  INTEGER,                    -- 예상 응시 인원
  plan           TEXT,                       -- 소개 사이트에서 고른 요금제 키
  message        TEXT,
  status         TEXT NOT NULL DEFAULT 'received',  -- received | approved | rejected
  org_id         BIGINT REFERENCES organizations(id),  -- 승인하면 채워진다
  reviewed_by    BIGINT REFERENCES users(id),
  reviewed_at    TIMESTAMPTZ,
  review_memo    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE org_applications IS
  '홈페이지 도입 신청. org_name 을 translations 에 넣지 않는 이유는, 이것이
   아직 기관이 아니라 신청자가 적어 낸 원문이기 때문이다. 승인해서 실제
   organizations 행이 생길 때 비로소 translations 로 옮겨간다 (설계 원칙 2)';

CREATE INDEX idx_applications_open ON org_applications(created_at DESC)
  WHERE status = 'received';

CREATE TABLE org_links (
  id           BIGSERIAL PRIMARY KEY,
  org_id       BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id   BIGINT REFERENCES test_sessions(id),   -- 회차가 정해지면 연결한다
  token        TEXT NOT NULL UNIQUE,        -- 링크에 그대로 들어가는 값
  label        TEXT NOT NULL,               -- '2026-1학기 기계공학과' 처럼 담당자가 알아볼 이름
  max_uses     INTEGER,                     -- NULL 이면 계약 좌석 수가 실질 상한이다
  used_count   INTEGER NOT NULL DEFAULT 0,
  -- 등록 조건. 링크를 공개된 곳에 걸 때 엉뚱한 사람을 거른다. NULL 이면 조건 없음
  login_id_mask TEXT,                      -- 9=숫자 A=영문 *=숫자나영문, 나머지는 그대로
  email_domains TEXT,                      -- 쉼표로 나눈 목록. 'ac.kr' 은 그 아래 도메인까지
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_by   BIGINT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE org_links IS
  '단체 전용 링크. password_reset_tokens 와 달리 원문을 그대로 저장한다.
   재설정 토큰은 1회용·개인용이라 다시 보여줄 일이 없지만, 이 링크는 담당자가
   학생들에게 반복해서 뿌려야 하므로 화면에 다시 띄울 수 있어야 한다.
   대신 만료(expires_at)·사용 상한(max_uses)·회수(revoked_at)로 위험을 줄이고,
   학번 형태(login_id_mask)와 이메일 도메인(email_domains)으로 누가 들어올 수
   있는지를 좁힌다. 정규식을 그대로 받지 않는 이유는 lib/join-rules.ts 에 적었다';

CREATE INDEX idx_org_links_live ON org_links(org_id) WHERE revoked_at IS NULL;
