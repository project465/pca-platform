-- ============================================================
--  세종일자리경제진흥원 시연(DEMO) 층
--
--  **공통 엔진의 표를 고치지 않는다.** 여기 있는 것은 전부 `sj_` 로 시작하는
--  새 표다. `deploy/db-chain.json` 에 넣지 않는다: 운영·공용 Staging 에
--  올라가지 않게 하려는 것이다(`db-chain-check` 는 `db/` 와 `db/seed/` 의
--  바로 아래 파일만 센다).
--
--  공통 표는 읽거나 줄만 더한다 — users · organizations · memberships ·
--  consents. 칸·제약은 그대로다.
--
--  이 표들은 공통 엔진 변경 제안(docs/sejong/COMMON_CORE_CHANGE_REQUEST.md)
--  CR-1·3·5·6 이 받아들여지기 전까지 쓰는 **세종 전용 대역**이다.
--  받아들여지면 그 표로 옮기고 이것은 버린다.
--
--    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/sejong/schema_sejong_demo.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 사업(프로그램). 시연용 가상 사업만 들어간다
CREATE TABLE IF NOT EXISTS sj_programs (
  code          TEXT PRIMARY KEY,
  org_id        BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  -- 지원사업의 지역 제한. 있으면 보조 권역 탐색을 끈다
  region_rule   TEXT NOT NULL DEFAULT 'NONE' CHECK (region_rule IN ('NONE','SEJONG_ONLY')),
  is_demo       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 참여자. 학번·학과 대신 사업과 참여번호로 선다 (CR-1 의 대역)
CREATE TABLE IF NOT EXISTS sj_participants (
  user_id        BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  org_id         BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_code   TEXT NOT NULL REFERENCES sj_programs(code),
  participant_no TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, participant_no)
);

-- 기관 쪽 사람. 관리자와 상담사를 가른다 (memberships.role 은 그대로 둔다)
CREATE TABLE IF NOT EXISTS sj_staff (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id     BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('admin','counselor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, org_id, kind)
);

-- 상담사 배정 (CR-6 의 대역)
CREATE TABLE IF NOT EXISTS sj_counselor_assignments (
  org_id              BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  counselor_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active              BOOLEAN NOT NULL DEFAULT true,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, counselor_user_id, participant_user_id)
);

-- 응시. 검사 판본은 SJ_JOBSEEKER_DEMO_V0 하나다. **ME_V3 응시가 아니다**
CREATE TABLE IF NOT EXISTS sj_attempts (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id             BIGINT NOT NULL REFERENCES organizations(id),
  program_code       TEXT NOT NULL REFERENCES sj_programs(code),
  instrument_version TEXT NOT NULL,
  -- 시작 정보: 대상 구분(선택) · 희망 직무 · 희망 지역 범위 · 보유 기술.
  -- **판정에 들어가지 않는다**
  profile            JSONB NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'in_progress'
                       CHECK (status IN ('in_progress','scored')),
  -- 제출할 때 굳힌 결과. 다시 만들지 않고 이 값을 읽는다
  result             JSONB,
  analysis_version   TEXT,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  scored_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sj_attempts_user ON sj_attempts (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS sj_attempts_org ON sj_attempts (org_id, program_code, status);

-- 문항 응답. 문항마다 바로 저장한다 (이어하기)
CREATE TABLE IF NOT EXISTS sj_responses (
  attempt_id  BIGINT NOT NULL REFERENCES sj_attempts(id) ON DELETE CASCADE,
  item_code   TEXT NOT NULL,
  value       SMALLINT NOT NULL CHECK (value BETWEEN 0 AND 3),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, item_code)
);

-- 경험(Evidence). 경력·아르바이트·교육훈련·자격까지 받는다.
-- 고른 체크 칸은 ME_V3 경험 화면과 같은 다섯 칸이다(문제·결정·산출물·검증·쓰인 곳)
CREATE TABLE IF NOT EXISTS sj_experiences (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('work','parttime','intern','project','training','credential','volunteer')),
  title         TEXT NOT NULL,
  org_name      TEXT,
  period_text   TEXT,
  job_area      TEXT,
  role_text     TEXT,
  checks        TEXT[] NOT NULL DEFAULT '{}',
  skills        TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sj_experiences_user ON sj_experiences (user_id, created_at DESC);

-- 실행 계획에서 고른 할 일과 그 상태
CREATE TABLE IF NOT EXISTS sj_actions (
  attempt_id  BIGINT NOT NULL REFERENCES sj_attempts(id) ON DELETE CASCADE,
  action_code TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, action_code)
);

-- PDF 생성 기록 (CR-5 의 대역). **캐시가 아니다**: 부를 때마다 다시 그리고 한 줄 적는다
CREATE TABLE IF NOT EXISTS sj_report_renders (
  id           BIGSERIAL PRIMARY KEY,
  attempt_id   BIGINT NOT NULL REFERENCES sj_attempts(id) ON DELETE CASCADE,
  requested_by BIGINT REFERENCES users(id),
  status       TEXT NOT NULL CHECK (status IN ('ready','failed')),
  bytes        INTEGER,
  error_step   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sj_report_renders_attempt ON sj_report_renders (attempt_id, created_at DESC);

-- 결과를 누가 열었는가. 본인 열람과 상담사 열람을 함께 남긴다 (CR-6 의 감사 대역)
CREATE TABLE IF NOT EXISTS sj_access_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    BIGINT REFERENCES users(id),
  actor_kind  TEXT NOT NULL CHECK (actor_kind IN ('self','counselor','admin')),
  target_user BIGINT REFERENCES users(id),
  attempt_id  BIGINT REFERENCES sj_attempts(id) ON DELETE SET NULL,
  what        TEXT NOT NULL CHECK (what IN ('result_web','report_web','report_pdf','denied')),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sj_access_logs_target ON sj_access_logs (target_user, created_at DESC);
