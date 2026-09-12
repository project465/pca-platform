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
--  11. 현직자 멘토링 (현멘) — 초안 v0.3에서 추가
--
--  갤러리에서 익명 카드를 고르고, 그 사람이 열어둔 시간대에 신청한다.
--  멘토가 승낙하면 줌 회의가 자동 생성되고 두 사람에게 일정이 자동으로 간다.
--
--  대상은 석·박사다 (career peak 브랜드). 멘토도 신청자도 석·박사 과정에 있거나
--  그 과정을 지나온 사람이다. 그래서 고르는 축이 학부 취업 서비스와 다르다 —
--  회사 규모보다 학위와 진로 경로(산업계 R&D·출연연·학계·창업)가 먼저다.
--  전공 계열은 지금 이공계지만, 인문·경상으로 넓힐 때 컬럼이 아니라
--  field_track 의 값이 늘어난다.
--
--  익명이 이 기능의 전제다. 응시자에게 보이는 화면에서는 users.display_name 을
--  쓰지 않고 mentors.handle 과 속성(연차·회사 규모·직무 영역)만 보여준다.
--  멘토도 users 에 들어간다 (설계 원칙 1). 소속이 없으므로 memberships 행은 없고,
--  멘토라는 사실은 mentors 에 행이 있는 것으로 판정한다.
-- ============================================================

CREATE TABLE mentors (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  handle          TEXT NOT NULL UNIQUE,          -- 화면·주소에 쓰는 익명 식별자. M-7F3K
  alias           TEXT NOT NULL,                 -- 멘토가 정한 익명 별명. 실명·회사명은 금지
  years           SMALLINT NOT NULL CHECK (years BETWEEN 0 AND 50),
  degree          TEXT NOT NULL,                 -- master | phd  (멘토 본인의 최종 학위)
  field_track     TEXT NOT NULL DEFAULT 'stem',  -- stem | humanities | business
  career_path     TEXT NOT NULL,                 -- 석·박사가 갈라지는 경로.
                                                 -- industry_rnd | industry_biz | research_inst
                                                 -- | academia | startup | public_policy
  company_scale   TEXT NOT NULL,                 -- large | midsize | startup | public | research | foreign
  region          TEXT,                          -- 근무 지역. 시도 단위까지만 (익명 유지)
  headline        TEXT NOT NULL,                 -- 카드에 한 줄로 뜨는 문장
  bio             TEXT,                          -- 상세 화면의 소개
  session_minutes SMALLINT NOT NULL DEFAULT 30 CHECK (session_minutes BETWEEN 15 AND 120),
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | active | paused
  verify_note     TEXT,                          -- 현직 인증 근거. 무엇으로 확인했는지 적는다
  approved_at     TIMESTAMPTZ,
  approved_by     BIGINT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 근거 없이 갤러리에 올릴 수 없게 DB 가 막는다. '인증된 현직자'라고 쓰려면 근거가 남아야 한다
  CONSTRAINT mentors_active_needs_verify
    CHECK (status <> 'active' OR (verify_note IS NOT NULL AND approved_at IS NOT NULL))
);
COMMENT ON TABLE mentors IS '현직자 본인의 프로필. 승인(status=active) 전에는 갤러리에 나오지 않는다';
COMMENT ON COLUMN mentors.alias IS '실명을 넣으면 익명이 깨진다. 화면에서 그렇게 안내한다';

CREATE INDEX idx_mentors_open ON mentors(status) WHERE status = 'active';
CREATE INDEX idx_mentors_facet ON mentors(degree, career_path, field_track)
  WHERE status = 'active';

-- 갤러리 필터의 기준. 결과지의 직무 영역을 그대로 쓴다
CREATE TABLE mentor_job_clusters (
  mentor_id  BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  job_id     BIGINT NOT NULL REFERENCES job_clusters(id) ON DELETE CASCADE,
  PRIMARY KEY (mentor_id, job_id)
);
COMMENT ON TABLE mentor_job_clusters IS
  '결과지 상위 직무 영역으로 멘토를 찾게 하려면 이 표가 있어야 한다';

-- 멘토가 열어둔 시간대. 신청자는 여기 있는 것만 고를 수 있다
CREATE TABLE mentor_slots (
  id          BIGSERIAL PRIMARY KEY,
  mentor_id   BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',   -- open | held(신청 대기) | booked | closed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, starts_at)
);
COMMENT ON COLUMN mentor_slots.status IS
  '신청이 들어오면 held 로 잡아둔다. 승낙하면 booked, 거절·취소하면 open 으로 돌린다';

CREATE INDEX idx_slots_open ON mentor_slots(mentor_id, starts_at) WHERE status = 'open';

CREATE TABLE mentoring_requests (
  id             BIGSERIAL PRIMARY KEY,
  slot_id        BIGINT NOT NULL REFERENCES mentor_slots(id) ON DELETE CASCADE,
  mentor_id      BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  applicant_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'requested',
                 -- requested | accepted | declined | cancelled | expired | completed
  question       TEXT NOT NULL,                 -- 무엇을 묻고 싶은지. 멘토가 승낙 판단에 쓴다
  -- 신청자가 어느 단계에 있는지. 멘토가 답의 높이를 맞추는 데 쓴다.
  -- 석사 1학기와 박사 수료생에게 같은 말을 해줄 수는 없다
  applicant_stage TEXT NOT NULL,                 -- ms_student | phd_student | phd_abd
                                                 -- | postdoc | graduated
  decline_reason TEXT,
  -- 응답 기한. 멘토가 이 시각까지 답하지 않으면 expired 로 넘기고 시간대를 풀어준다.
  -- 신청자가 무응답으로 며칠을 기다리는 것이 이 서비스에서 가장 나쁜 경험이다
  respond_by     TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE mentoring_requests IS '신청 1건 = 1행. 같은 시간대에 살아있는 신청은 하나뿐이다';

-- 같은 시간대에 두 사람이 동시에 신청해 둘 다 성립하는 일을 DB가 막는다
CREATE UNIQUE INDEX idx_request_live_slot ON mentoring_requests(slot_id)
  WHERE status IN ('requested', 'accepted');

CREATE INDEX idx_request_mentor ON mentoring_requests(mentor_id, status);
CREATE INDEX idx_request_applicant ON mentoring_requests(applicant_id, created_at DESC);

-- 세션이 끝난 뒤 신청자가 남기는 평가. 갤러리 카드의 평점이 여기서 나온다
CREATE TABLE mentor_reviews (
  id          BIGSERIAL PRIMARY KEY,
  request_id  BIGINT NOT NULL UNIQUE REFERENCES mentoring_requests(id) ON DELETE CASCADE,
  mentor_id   BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE mentor_reviews IS
  '신청 1건에 후기 1건. 세션이 completed 가 된 뒤에만 쓸 수 있다.
   신청자가 누구인지는 멘토에게 드러나지 않는다 — 후기에는 작성자를 표시하지 않는다';

CREATE INDEX idx_reviews_mentor ON mentor_reviews(mentor_id);

CREATE TABLE meetings (
  id                  BIGSERIAL PRIMARY KEY,
  request_id          BIGINT NOT NULL UNIQUE REFERENCES mentoring_requests(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL DEFAULT 'zoom',   -- zoom | dryrun(개발용)
  provider_meeting_id TEXT,
  join_url            TEXT NOT NULL,                  -- 신청자에게 보내는 참가 링크
  host_url            TEXT,                           -- 멘토(호스트)용 시작 링크
  passcode            TEXT,
  starts_at           TIMESTAMPTZ NOT NULL,
  duration_min        SMALLINT NOT NULL,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE meetings IS
  '신청 1건에 회의 1개. request_id 가 UNIQUE 이므로 승낙이 두 번 눌려도 회의가 겹쳐 생기지 않는다';
COMMENT ON COLUMN meetings.host_url IS
  '호스트 권한이 담긴 링크다. 멘토에게만 보여준다. 신청자 화면에 절대 내보내지 않는다';

-- 발송 대기열. 승낙과 같은 트랜잭션에서 행이 쌓이고, 발송기가 비운다
CREATE TABLE notifications (
  id            BIGSERIAL PRIMARY KEY,
  -- 신청과 무관한 알림(가입 확인 메일 등)도 이 큐로 나가므로 NULL 을 허용한다
  request_id    BIGINT REFERENCES mentoring_requests(id) ON DELETE CASCADE,
  recipient_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,                  -- email | inapp
  kind          TEXT NOT NULL,                  -- accepted | declined | cancelled | expired
                                                -- | reminder_24h | reminder_1h | verify
  dedupe_key    TEXT NOT NULL UNIQUE,           -- request:recipient:kind. 같은 알림이 두 번 안 나간다
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  send_after    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at       TIMESTAMPTZ,
  attempts      SMALLINT NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE notifications IS
  '알림을 보내는 순간 만들지 않고 큐에 넣는다. 메일 서버가 죽어 있어도 승낙은 성립하고,
   되살아나면 밀린 것이 나간다. 학생 계정은 email 이 NULL 일 수 있으므로 그때는 channel=inapp';

CREATE INDEX idx_notifications_due ON notifications(send_after) WHERE sent_at IS NULL;
CREATE INDEX idx_notifications_inbox ON notifications(recipient_id, created_at DESC)
  WHERE channel = 'inapp';


-- ============================================================
--  12. 개인 결제 (2026-09-12 결정 변경)
--
--  현멘은 개인이 직접 가입해 건당 결제한다. 그전까지 이 플랫폼은
--  "계약 후 관리자 발급, 좌석 차감"만 전제했다 (CLAUDE.md 확정된 결정).
--  학과 계약으로 들어온 학생은 그대로 무료다 — memberships 에 행이 있으면 무료.
--
--  결제는 신청과 동시에 승인하고, 멘토가 거절하거나 24시간을 넘기면 취소한다.
--  매입 전 취소라 카드 청구 자체가 가지 않는다.
-- ============================================================

CREATE TABLE mentoring_prices (
  session_minutes  SMALLINT PRIMARY KEY,
  amount           INTEGER NOT NULL CHECK (amount >= 0),   -- 원 단위
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by       BIGINT REFERENCES users(id)
);
COMMENT ON TABLE mentoring_prices IS
  '운영사가 정하는 정가표. 멘토가 값을 정하지 않는다 — 가격이 멘토 서열 신호가 되면 익명이 흐려진다';

CREATE TABLE payments (
  id              BIGSERIAL PRIMARY KEY,
  request_id      BIGINT NOT NULL UNIQUE REFERENCES mentoring_requests(id) ON DELETE CASCADE,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  amount          INTEGER NOT NULL CHECK (amount >= 0),
  -- 결제창에 넘기는 우리 쪽 주문번호. PG 가 중복을 거부하므로 UNIQUE 여야 한다
  order_id        TEXT NOT NULL UNIQUE,
  provider        TEXT NOT NULL DEFAULT 'toss',   -- toss | dryrun
  provider_key    TEXT,                           -- 승인 후 PG 가 준 결제 키
  status          TEXT NOT NULL DEFAULT 'ready',  -- ready | paid | cancelled | failed
  method          TEXT,
  receipt_url     TEXT,
  fail_reason     TEXT,
  cancel_reason   TEXT,
  paid_at         TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE payments IS
  '신청 1건에 결제 1건. request_id 가 UNIQUE 라 결제창을 두 번 열어도 두 번 청구되지 않는다';

CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_open ON payments(status) WHERE status = 'ready';

-- 셀프 가입 계정의 이메일 확인. 원문 토큰은 링크에만 있고 DB 에는 해시만 둔다
CREATE TABLE email_verifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN terms_agreed_at TIMESTAMPTZ;
COMMENT ON COLUMN users.terms_agreed_at IS
  '셀프 가입에만 채운다. 학과가 발급한 계정은 학과가 동의를 받는다';


-- ============================================================
--  13. 소셜 로그인 (2026-09-12)
--
--  카카오·네이버로 들어온 사람도 users 에 들어간다 (설계 원칙 1).
--  이메일을 안 주는 계정이 있어서 이메일로 사람을 특정할 수 없다.
--  그래서 제공자가 주는 고유 id 를 따로 들고 매칭한다.
-- ============================================================

CREATE TABLE user_identities (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,             -- kakao | naver
  provider_user_id  TEXT NOT NULL,
  email             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);
COMMENT ON TABLE user_identities IS
  '같은 사람이 이메일 가입과 소셜을 함께 쓸 수 있다. 이메일이 같으면 기존 계정에 붙인다';

CREATE INDEX idx_identities_user ON user_identities(user_id);


-- ============================================================
--  14. 환불과 정산 (2026-09-12)
--
--  환불 규칙은 코드가 아니라 표에 둔다 (설계 원칙 3 과 같은 이유).
--  "세션 시작 몇 시간 전까지 몇 %" 를 행으로 쌓아두고, 취소 시각에 맞는 행을 고른다.
-- ============================================================

CREATE TABLE refund_rules (
  id           BIGSERIAL PRIMARY KEY,
  -- 세션 시작까지 남은 시간이 이 값 이상이면 이 행이 적용된다
  hours_before INTEGER NOT NULL UNIQUE CHECK (hours_before >= 0),
  percent      SMALLINT NOT NULL CHECK (percent BETWEEN 0 AND 100),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   BIGINT REFERENCES users(id)
);
COMMENT ON TABLE refund_rules IS
  '신청자가 스스로 취소할 때만 쓴다. 멘토 거절·기한 초과·멘토 취소는 언제나 전액이다';

ALTER TABLE payments ADD COLUMN refunded_amount INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN payments.refunded_amount IS '부분 환불이 있으므로 금액을 따로 센다';

-- 멘토에게 줄 돈. 세션이 끝난 뒤 확정한다
CREATE TABLE payouts (
  id             BIGSERIAL PRIMARY KEY,
  mentor_id      BIGINT NOT NULL REFERENCES mentors(id),
  request_id     BIGINT NOT NULL UNIQUE REFERENCES mentoring_requests(id) ON DELETE CASCADE,
  gross          INTEGER NOT NULL,   -- 신청자가 실제로 낸 돈(환불 제외)
  fee            INTEGER NOT NULL,   -- 운영사 수수료
  withholding    INTEGER NOT NULL,   -- 원천징수
  net            INTEGER NOT NULL,   -- 실제 지급액
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | void
  paid_at        TIMESTAMPTZ,
  memo           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE payouts IS
  '세션 1건에 정산 1행. 무료(학과 계약) 세션은 gross 가 0 이라 행을 만들지 않는다';

CREATE INDEX idx_payouts_mentor ON payouts(mentor_id, created_at DESC);
CREATE INDEX idx_payouts_pending ON payouts(status) WHERE status = 'pending';

-- 수수료율과 원천징수율. 한 행짜리 설정이라 id 를 고정한다
CREATE TABLE payout_settings (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  fee_percent     NUMERIC(5,2) NOT NULL DEFAULT 0,
  withholding_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      BIGINT REFERENCES users(id)
);
COMMENT ON TABLE payout_settings IS
  '값은 비워둔 채로 시작한다. 수수료율은 사업 결정이라 코드가 정하지 않는다';
