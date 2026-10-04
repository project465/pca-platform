-- ============================================================
--  커리어메트리 플랫폼 층
--
--  적용 순서: schema.sql → schema_metri.sql → 이 파일
--
--  **이미 있는 것을 다시 만들지 않는다.** users · organizations ·
--  memberships · contracts · seats · entitlements · products · orders ·
--  payments · refunds 는 이미 돌고 있다. 여기서는 모자란 칸을 더하고,
--  없는 표(초대 · 기수 · 사이트 설정 · 나라 묶음 · 동의 · 감사 기록 ·
--  행동 기록 · 경험 프로필 · 결과지 판본)만 새로 만든다.
--
--  **좌석이 곧 라이선스다.** 규격은 licenses 를 따로 두라고 하지만,
--  이 저장소에서 좌석은 이미 `seats` 한 줄이고 등급을 정하는 함수
--  (`src/lib/entitlement.ts`)가 그 표를 본다. 표를 하나 더 만들면 등급을
--  정하는 자리가 둘이 되고, 둘 중 하나는 반드시 뒤처진다(설계 원칙 10).
--  그래서 **좌석에 생애주기를 붙인다.**
-- ============================================================


-- ============================================================
--  1. 조직
-- ============================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS language CHAR(2) NOT NULL DEFAULT 'ko';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS workspace_settings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS aggregate_min_cell SMALLINT NOT NULL DEFAULT 5;

COMMENT ON COLUMN organizations.aggregate_min_cell IS
  '이보다 적은 칸은 집계를 내보내지 않는다. 기관마다 다르게 둘 수 있게
   표에 두지만 기본값은 5 다. 코드에 못 박으면 작은 학과에서 개인이 드러난다';

-- org_type 에 쓸 수 있는 값. 코드가 아니라 표에 둔다
CREATE TABLE IF NOT EXISTS organization_types (
  code     TEXT PRIMARY KEY,
  name_ko  TEXT NOT NULL,
  sort_no  SMALLINT NOT NULL DEFAULT 0
);
INSERT INTO organization_types (code, name_ko, sort_no) VALUES
  ('university',         '대학',            1),
  ('department',         '학과',            2),
  ('graduate_school',    '대학원',          3),
  ('career_center',      '취업지원처',      4),
  ('public_institution', '공공기관',        5),
  ('research_institute', '연구기관',        6),
  ('company',            '기업',            7),
  ('education_provider', '교육기관',        8),
  ('other',              '그 밖에',         9)
ON CONFLICT (code) DO NOTHING;


-- ============================================================
--  2. 역할
--
--  규격이 여섯을 요구한다. 지금 쓰는 네 가지를 버리지 않고 **이름을
--  잇는다**: 이미 발급된 계정의 membership 행을 건드리지 않기 위해서다.
--  새로 늘어난 것은 org_staff 와 운영사 두 단계의 분리다.
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  code        TEXT PRIMARY KEY,
  scope       TEXT NOT NULL,            -- platform | organization | self
  rank        SMALLINT NOT NULL,        -- 넓은 쪽이 큰 수
  name_ko     TEXT NOT NULL,
  legacy_code TEXT,                     -- 예전 memberships.role 값
  note        TEXT
);
INSERT INTO roles (code, scope, rank, name_ko, legacy_code, note) VALUES
  ('platform_super_admin', 'platform',     60, '운영사 시스템 관리자', 'superadmin',
   '나라·상품·검사 판본 같은 설정을 바꾼다'),
  ('platform_admin',       'platform',     50, '운영사 운영자',        NULL,
   '계약·조직·주문을 본다. 시스템 설정은 못 바꾼다'),
  ('org_admin',            'organization', 40, '기관 담당자',          'org_admin',
   '계약·좌석·참여자 상태·집계를 본다. 개인 결과지는 기본으로 못 본다'),
  ('org_staff',            'organization', 30, '기관 실무자',          'instructor',
   '참여자 상태와 집계만 본다. 계약과 좌석은 못 건드린다'),
  ('org_participant',      'self',         10, '기관 참여자',          'student',
   '기관 프로그램으로 들어온 개인. 자기 자료만 본다'),
  ('individual',           'self',          0, '개인 이용자',          NULL,
   '직접 결제한 개인. 소속이 없다')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE roles IS
  '**숨긴 메뉴를 권한으로 쓰지 않는다.** 화면에서 링크를 빼는 것은 안내이고,
   막는 것은 이 표를 읽는 서버 쪽 검사다';


-- ============================================================
--  3. 계약
-- ============================================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS product_package TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS allowed_report_levels TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS allowed_majors TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'pending';

COMMENT ON COLUMN contracts.allowed_report_levels IS
  '계약 하나가 여러 등급을 묶을 수 있다. STANDARD 100 + PRO 20 처럼.
   **계약과 상품은 같은 것이 아니다**: 상품은 파는 단위고 계약은 약속한 묶음이다';


-- ============================================================
--  4. 좌석(라이선스) 생애주기
--
--  **초대를 좌석 사용으로 치지 않는다.** 초대만 보내 놓고 아무도 안 들어온
--  날, 쓴 좌석을 센 숫자가 틀리면 기관이 돈을 더 냈다고 생각한다.
-- ============================================================

ALTER TABLE seats ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';
ALTER TABLE seats ADD COLUMN IF NOT EXISTS report_level TEXT;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS major_code TEXT;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS revoked_by BIGINT REFERENCES users(id);

DO $$ BEGIN
  ALTER TABLE seats ADD CONSTRAINT seats_status_chk CHECK (status IN
    ('available','invited','claimed','started','completed','expired','revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN seats.status IS
  'available(아무에게도 안 감) → invited(초대만 보냄) → claimed(계정이 받음)
   → started(첫 문항) → completed(제출). expired · revoked 는 옆길이다.
   **쓴 좌석은 started 부터 센다**: 초대장은 응시가 아니다';

CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(contract_id, status);


-- ============================================================
--  5. 초대
-- ============================================================

CREATE TABLE IF NOT EXISTS invitations (
  id            BIGSERIAL PRIMARY KEY,
  org_id        BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id   BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  seat_id       BIGINT REFERENCES seats(id),
  cohort_id     BIGINT,
  email         TEXT,
  -- 코드는 해시만 남긴다. 임시 비밀번호와 같은 규칙이다
  code_sha256   TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'email',   -- email | link | cohort_code
  status        TEXT NOT NULL DEFAULT 'sent',    -- sent | claimed | expired | revoked
  sent_count    SMALLINT NOT NULL DEFAULT 1,
  created_by    BIGINT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  claimed_at    TIMESTAMPTZ,
  claimed_by    BIGINT REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_code_idx ON invitations(code_sha256);
CREATE INDEX IF NOT EXISTS invitations_org_idx ON invitations(org_id, status);

COMMENT ON TABLE invitations IS
  '초대 코드는 sha256 만 저장한다. 만들 때 한 번 보여주고 다시 보여주지
   않는다. DB 가 새도 남의 좌석을 가져갈 수 없다';


-- ============================================================
--  6. 기수
--
--  **학과와 다른 축이다.** 같은 학과가 해마다 여러 기수를 돌리고, 한 기수에
--  여러 학과가 섞이기도 한다. test_sessions 는 '언제 열고 언제 닫는 회차'
--  이고 기수는 '누구 묶음' 이라, 둘을 한 표에 담으면 재사용이 안 된다.
-- ============================================================

CREATE TABLE IF NOT EXISTS cohorts (
  id           BIGSERIAL PRIMARY KEY,
  org_id       BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id  BIGINT REFERENCES contracts(id),
  name         TEXT NOT NULL,
  description  TEXT,
  starts_on    DATE,
  ends_on      DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cohorts_org_idx ON cohorts(org_id);

CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id  BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_id, user_id)
);

DO $$ BEGIN
  ALTER TABLE invitations ADD CONSTRAINT invitations_cohort_fk
    FOREIGN KEY (cohort_id) REFERENCES cohorts(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS cohort_id BIGINT REFERENCES cohorts(id);


-- ============================================================
--  7. 사이트 설정
--
--  **화면 언어 · 사이트 지역 · 목표 국가는 서로 다른 값이다.**
--  careermatri.co.kr 을 한국어로 쓰면서 미국 시장을 보는 사람이 가장 흔한
--  경우다. 셋을 하나로 묶으면 그 사람에게 한국 공고를 내보낸다.
-- ============================================================

CREATE TABLE IF NOT EXISTS site_configs (
  site_id            TEXT PRIMARY KEY,         -- global | kr
  domain             TEXT NOT NULL,
  default_language   CHAR(2) NOT NULL,
  default_currency   CHAR(3) NOT NULL,
  payment_market     TEXT NOT NULL,            -- GLOBAL | KR
  site_region        CHAR(2),                  -- 사이트가 서 있는 지역. 목표 국가가 아니다
  offered_languages  TEXT[] NOT NULL DEFAULT '{}',
  active             BOOLEAN NOT NULL DEFAULT true,
  note               TEXT
);

-- **도메인이 사는 자리는 여기 한 곳이다.** 화면에도 코드에도 적어 두지
-- 않았다. 2026-10-04 에 careermetri → careermatri 로 바로잡았는데, 그때
-- 고친 것이 이 두 줄과 검사 한 줄뿐이었다. 적어 두는 자리를 늘리지 않는
-- 값은 이렇게 싸게 고쳐진다.
INSERT INTO site_configs
  (site_id, domain, default_language, default_currency, payment_market,
   site_region, offered_languages, active, note) VALUES
  ('global', 'careermatri.com',   'en', 'USD', 'GLOBAL', NULL, '{en}', true,
   '영문 개인 이용자. 결제 수단은 아직 고르지 않았다'),
  ('kr',     'careermatri.co.kr', 'ko', 'KRW', 'KR',     'KR', '{ko}', true,
   '한국 개인과 기관')
ON CONFLICT (site_id) DO NOTHING;

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS site_id TEXT REFERENCES site_configs(site_id);
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS interface_language CHAR(2);
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS target_country CHAR(2);

COMMENT ON COLUMN attempts.target_country IS
  '가고 싶은 나라. 사이트 도메인과도 화면 언어와도 무관하다.
   확인된 나라 묶음이 없으면 결과지가 Global Reference Mode 로 간다';


-- ============================================================
--  8. 나라 묶음
--
--  **틀만 만들고 채우지 않는다.** 임금·비자·면허를 지어내면 그것을 믿고
--  움직이는 사람이 생긴다. 확인된 자료가 생길 때만 행이 는다.
-- ============================================================

CREATE TABLE IF NOT EXISTS country_packs (
  id                BIGSERIAL PRIMARY KEY,
  country_code      CHAR(2) NOT NULL,
  version           TEXT NOT NULL,
  default_language  CHAR(2),
  currency          CHAR(3),
  career_taxonomy   TEXT,
  payload           JSONB NOT NULL DEFAULT '{}',
  sources           JSONB NOT NULL DEFAULT '[]',   -- 어디서 온 자료인지
  verified_at       TIMESTAMPTZ,                   -- 확인 전에는 NULL
  status            TEXT NOT NULL DEFAULT 'draft', -- draft | verified | retired
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, version)
);

COMMENT ON TABLE country_packs IS
  '확인된 자료가 있는 나라만 verified 가 된다. 그 전에는 결과지가
   GLOBAL_REFERENCE_MODE 로 나가고 그 사실을 화면에 적는다.
   **행이 없다고 조용히 비워 두지 않는다**';


-- ============================================================
--  9. 동의
--
--  **한 칸에 묶지 않는다.** 약관·개인정보·마케팅·기관 참여는 받는 이유가
--  서로 다르고, 하나로 묶으면 마케팅을 거절한 사람이 서비스를 못 쓴다.
-- ============================================================

CREATE TABLE IF NOT EXISTS consents (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,     -- terms | privacy | marketing | org_participation | data_visibility
  version     TEXT NOT NULL,
  granted     BOOLEAN NOT NULL,
  org_id      BIGINT REFERENCES organizations(id),
  site_id     TEXT REFERENCES site_configs(site_id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consents_user_idx ON consents(user_id, kind, created_at DESC);

COMMENT ON TABLE consents IS
  '거절도 한 줄로 남긴다. 행이 없는 것과 거절한 것은 다르고, 나중에
   물어본 적이 있는지를 증명할 수 있어야 한다';


-- ============================================================
--  10. 감사 기록
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGSERIAL PRIMARY KEY,
  actor_id     BIGINT REFERENCES users(id),
  actor_role   TEXT,
  action       TEXT NOT NULL,     -- license.revoke | contract.update | report.access ...
  target_kind  TEXT,
  target_id    TEXT,
  org_id       BIGINT REFERENCES organizations(id),
  detail       JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_org_idx ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action, created_at DESC);

COMMENT ON TABLE audit_logs IS
  '**이름과 메일 주소를 detail 에 담지 않는다.** 파기(익명화)가 끝난 뒤에도
   남는 표라, 여기에 개인정보를 적으면 파기가 반쪽이 된다
   (erasure_log 와 같은 규칙이다)';


-- ============================================================
--  11. 행동 기록
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  org_id      BIGINT REFERENCES organizations(id),
  site_id     TEXT REFERENCES site_configs(site_id),
  name        TEXT NOT NULL,     -- purchase | assessment_start | report_opened ...
  props       JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events(name, created_at DESC);

COMMENT ON TABLE analytics_events IS
  '필요한 것보다 많이 모으지 않는다. 자유 입력과 결과지 본문은 담지 않는다';


-- ============================================================
--  12. 경험 프로필
--
--  **경험은 응시가 아니라 사람에게 붙는다.** 다시 응시해도 캡스톤은
--  그대로이고, 두 번 적게 하면 두 번째에는 안 적는다. 다만 결과지는
--  **그때 찍은 사본**을 읽어야 한다: 지난달 결과지가 오늘 경험을 고쳤다고
--  바뀌면 기관에 제출한 자료와 달라진다.
-- ============================================================

CREATE TABLE IF NOT EXISTS evidence_profiles (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  payload     JSONB NOT NULL DEFAULT '{}',   -- 경험 · 도구 · 연구 과제
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_snapshots (
  id             BIGSERIAL PRIMARY KEY,
  attempt_id     BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  profile_id     BIGINT REFERENCES evidence_profiles(id),
  profile_version INTEGER,
  payload        JSONB NOT NULL,
  taken_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id)
);


-- ============================================================
--  13. 결과지 판본
--
--  **판본을 안 적으면 나중에 설명할 수 없다.** 기관이 작년 자료를 들고
--  와서 "이 줄이 왜 달라졌냐" 고 물을 때 댈 것이 있어야 한다.
-- ============================================================

CREATE TABLE IF NOT EXISTS report_snapshots (
  id                     BIGSERIAL PRIMARY KEY,
  attempt_id             BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  report_level           TEXT NOT NULL,
  assessment_version     TEXT NOT NULL,
  scoring_engine_version TEXT,
  evidence_engine_version TEXT,
  value_engine_version   TEXT,
  coverage_engine_version TEXT,
  renderer_version       TEXT,
  country_pack_id        BIGINT REFERENCES country_packs(id),
  generated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, generated_at)
);
CREATE INDEX IF NOT EXISTS report_snapshots_attempt_idx ON report_snapshots(attempt_id);
