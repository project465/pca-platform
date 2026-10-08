-- ME_V3 응시 저장. **ME_V2 와 섞지 않는다.**
--
-- V2 는 읽기 전용으로 잠겨 있고 그쪽 표(`v2_responses` · `attempts`)에
-- V3 응답을 넣으면 두 판본의 집계가 섞인다. 직무군 열여섯과 기술영역
-- 열둘 사이에 1 대 1 사상이 없어서, 섞으면 어느 쪽도 아닌 값이 나온다.
--
-- 적용: psql --single-transaction -f db/schema_v3_runtime.sql

CREATE TABLE IF NOT EXISTS v3_attempts (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id),
  entitlement_id    BIGINT REFERENCES entitlements(id),
  tier              TEXT NOT NULL CHECK (tier IN ('BASIC','STANDARD','PRO')),
  core_code         TEXT NOT NULL DEFAULT 'ME_CORE_V3',
  market_code       TEXT NOT NULL DEFAULT 'KR',
  education_stage   TEXT NOT NULL CHECK (education_stage IN ('bachelor','master','phd','postdoc')),
  -- 석사 이상은 전공계열 없이 시작하지 않는다. **화면이 지키게 두지 않는다**
  grad_field        TEXT CHECK (grad_field IN
                      ('STEM','HUMANITIES_SOCIAL','BUSINESS','OTHER_INTERDISCIPLINARY')),
  assessment_version TEXT NOT NULL DEFAULT 'ME_V3_DOMAIN_2026',
  item_bank_version TEXT NOT NULL,
  scoring_version   TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress','submitted','scored')),
  current_screen    TEXT,
  opened_probe      TEXT[] NOT NULL DEFAULT '{}',
  opened_deep       TEXT[] NOT NULL DEFAULT '{}',
  fourth_reason     TEXT,
  industry_pack     TEXT,
  role_pack         TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_saved_at     TIMESTAMPTZ,
  submitted_at      TIMESTAMPTZ,
  CONSTRAINT v3_grad_field_required
    CHECK (education_stage = 'bachelor' OR grad_field IS NOT NULL)
);

-- 이용권 하나가 응시 하나다. 같은 사람의 응답이 두 벌 쌓이면 규준이 오염된다
CREATE UNIQUE INDEX IF NOT EXISTS v3_attempts_entitlement
  ON v3_attempts(entitlement_id) WHERE entitlement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS v3_attempts_user ON v3_attempts(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS v3_responses (
  attempt_id   BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  item_id      TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('level','scale5','exposure','choice','skipped')),
  value_int    SMALLINT,
  value_text   TEXT,
  -- 번역 단계에서 덧붙인 한 줄. **응답이 아니다**: 고른 보기가 단계를 센
  -- 근거이고 이 줄은 결과지가 그 사람의 말로 옮겨 적을 때만 읽는다
  note_text    TEXT,
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, item_id)
);
ALTER TABLE v3_responses ADD COLUMN IF NOT EXISTS note_text TEXT;

-- 축마다 고른 판단 체크리스트. 소유(OWNED)는 이 줄이 둘 이상일 때만 선다
CREATE TABLE IF NOT EXISTS v3_evidence_picks (
  attempt_id   BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  domain_code  TEXT NOT NULL,
  -- 'J1'~'J8' 은 판단 체크리스트, 'ARTIFACT' 는 산출물, 'VERIFY' 는 검증 대상
  slot         TEXT NOT NULL,
  item_text    TEXT NOT NULL,
  PRIMARY KEY (attempt_id, domain_code, slot, item_text)
);

-- 등급을 올린 기록. **새 응시를 만들지 않는다**
CREATE TABLE IF NOT EXISTS v3_tier_events (
  id             BIGSERIAL PRIMARY KEY,
  attempt_id     BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  from_tier      TEXT NOT NULL,
  to_tier        TEXT NOT NULL,
  entitlement_id BIGINT REFERENCES entitlements(id),
  at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT v3_tier_forward CHECK (from_tier <> to_tier)
);

-- 그때 낸 판정. 줄이 쌓이기만 하고 고치지 않는다
CREATE TABLE IF NOT EXISTS v3_snapshots (
  id               BIGSERIAL PRIMARY KEY,
  attempt_id       BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  module_versions  JSONB NOT NULL,
  response_quality TEXT NOT NULL,
  payload          JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS v3_snapshots_attempt
  ON v3_snapshots(attempt_id, created_at DESC);
