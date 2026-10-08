-- ============================================================
--  ME_V3 장기 구조 스키마
--
--  Country/Market → Major Core → Industry Pack → Role Pack
--  → Region Layer → Evidence/Gap → Career Action
--
--  적용: `npm run db:v3:arch` (`db:init` 과 `db:upgrade` 가 부른다).
--  넉 달 동안 **적어만 두고 올리지 않았다.** 그 사이에 `/v3` 가 쓰는 표가
--  운영에 선 적이 없어서 그 주소는 500 이었다. 적어 둔 스키마와 올라간
--  스키마는 다른 것이고, 그 차이는 아무 검사도 세지 않는다.
--
--  표를 새로 만들 때마다 까닭을 적는다. 표가 늘면 판단하는 자리가 늘고,
--  늘어난 자리 가운데 하나는 반드시 뒤처진다(설계 원칙 10).
-- ============================================================


-- ============================================================
--  1. 응시가 어느 모듈 조합으로 돌았는가
--
--  `attempts` 에 칸을 더한다. 표를 새로 만들지 않는다. 한 응시는 Core
--  하나와 산업 하나와 역할 하나까지만 깊게 본다(조합 폭발을 구조로 막는다).
-- ============================================================

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS core_code      TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS market_code    TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS industry_pack  TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS role_pack      TEXT;

COMMENT ON COLUMN attempts.core_code IS
  'ME_CORE_V3 같은 Major Core 코드. 등록부가 가리키는 값이고 화면이 정하지 않는다';
COMMENT ON COLUMN attempts.industry_pack IS
  '깊게 본 산업 하나. 나머지 산업은 Core 자료로 견주기만 한다';
COMMENT ON COLUMN attempts.role_pack IS
  '깊게 본 역할 하나. 같은 까닭이다';


-- ============================================================
--  2. 어느 판본으로 돌았는가
--
--  `report_snapshots` 에는 엔진 판본 다섯 칸이 이미 있다. 모듈이 늘었으므로
--  **모듈마다 판본을 적는 칸**을 하나 더 둔다. 칸을 모듈 수만큼 늘리지
--  않는 까닭은 모듈이 계속 늘기 때문이다.
--
--  {"core":"ME_CORE_V3","industry":"INDUSTRY_SEMICON_V1@1",
--   "role":"ROLE_CAE_V1@1","region":"REGION_KR_V1@1"}
-- ============================================================

ALTER TABLE report_snapshots
  ADD COLUMN IF NOT EXISTS module_versions JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN report_snapshots.module_versions IS
  '그때 실제로 돌아간 모듈과 판본. 손으로 적지 않고 돌린 자리가 적는다';


-- ============================================================
--  3. Region Layer · 표 여섯
--
--  **직무 판단과 섞지 않는다.** 이 표들의 어느 값도 축 수준이나 영역 묶음에
--  들어가지 않는다. 시장 단위로 켜고(`markets.json` 의 `region_layer`)
--  지금은 한국만이다.
-- ============================================================

CREATE TABLE IF NOT EXISTS regions (
  code        TEXT PRIMARY KEY,          -- KR-30 (세종) 같은 행정구역 코드
  name        TEXT NOT NULL,
  market_code TEXT NOT NULL,
  parent_code TEXT REFERENCES regions(code),
  adjacent    TEXT[] NOT NULL DEFAULT '{}',
  source      TEXT NOT NULL
);

/* **`industries` 표를 만들지 않는다.**
   그 이름이 이미 있었다(`db/schema_metri.sql`, 칸은 `id`·`code`·`sort_no`
   이고 이름은 `translations` 에 있다). `CREATE TABLE IF NOT EXISTS` 는
   조용히 아무것도 하지 않고, 아래 표들의 외래키가 **옛 표를 가리킨 채로**
   섰다. 이름이 겹치는 것이 곧 버그다(이 저장소에서 `.btn` · `--sf-r` ·
   `.lg` · `empty` 에 이어 다섯 번째다).

   그래서 산업 코드를 **글자로** 들고 외래키를 걸지 않는다. V3 의 산업
   정본은 그 core 의 산업팩 파일이고(`major-cores.json` 의 `packs.industry`),
   거기 코드와 이름이 함께 있다. DB 에 같은 목록을 한 벌 더 두면 산업을
   늘리는 날 한쪽만 늘어난다. */
ALTER TABLE IF EXISTS region_industry
  DROP CONSTRAINT IF EXISTS region_industry_industry_code_fkey;
ALTER TABLE IF EXISTS industry_td_demand
  DROP CONSTRAINT IF EXISTS industry_td_demand_industry_code_fkey;
ALTER TABLE IF EXISTS org_registry
  DROP CONSTRAINT IF EXISTS org_registry_industry_code_fkey;

CREATE TABLE IF NOT EXISTS region_industry (
  region_code    TEXT NOT NULL REFERENCES regions(code),
  industry_code  TEXT NOT NULL,            -- 산업팩의 코드. 외래키를 걸지 않는다
  establishments INTEGER,
  employees      INTEGER,
  base_year      SMALLINT NOT NULL,
  source         TEXT NOT NULL,
  PRIMARY KEY (region_code, industry_code, base_year)
);

/* 이 layer 의 가장 약한 자리다. 공고를 모아 세는 일은 저작권과 이용약관을
   따지고 시작해야 하므로 **1차에서는 줄이 없다.** 표본 수와 근거 등급을
   스키마에 먼저 두는 까닭은, 나중에 채울 때 근거 없는 강도가 들어오는
   것을 막으려는 것이다 */
CREATE TABLE IF NOT EXISTS industry_td_demand (
  industry_code TEXT NOT NULL,             -- 산업팩의 코드
  core_code     TEXT NOT NULL,
  td_code       TEXT NOT NULL,
  rf_code       TEXT,
  strength      SMALLINT CHECK (strength BETWEEN 1 AND 3),
  sample_size   INTEGER NOT NULL,
  evidence_grade TEXT NOT NULL CHECK (evidence_grade IN ('약함', '보통', '충분')),
  source        TEXT NOT NULL,
  base_year     SMALLINT NOT NULL,
  PRIMARY KEY (industry_code, core_code, td_code, base_year)
);

/* 기관 수를 담을 자리. **지금 줄이 0 이다.**
   열쇠가 넷인 까닭은 사용자가 탐색에서 고르는 것이 넷이기 때문이다:
   산업 × 직무 × 권역 × 기관 유형. 하나라도 빠지면 그 조합으로 물어볼 수
   없고, 나중에 칸을 더하면 이미 쌓인 줄의 뜻이 달라진다.

   `org_type_code` 는 `region-layer.json` 의 ORG_* 다. **Core 의 조직환경
   (OC)과 다른 층이다**: OC 는 그 일을 하는 자리의 성격이고 ORG 는 그 자리를
   가진 기관의 종류다. 전에 한 칸에 `oc_code` 로 적어 두어서 두 뜻이
   겹쳤다. 옛 칸은 지우지 않고 남긴다 — 지우면 그 칸을 읽던 줄이 사라진다 */
CREATE TABLE IF NOT EXISTS org_registry (
  region_code   TEXT NOT NULL REFERENCES regions(code),
  oc_code       TEXT NOT NULL,           -- 옛 칸. ORG 로 옮겼다
  industry_code TEXT,                      -- 산업팩의 코드
  org_count     INTEGER NOT NULL,
  base_year     SMALLINT NOT NULL,
  source        TEXT NOT NULL,
  PRIMARY KEY (region_code, oc_code, industry_code, base_year)
);
ALTER TABLE org_registry ADD COLUMN IF NOT EXISTS org_type_code TEXT;
ALTER TABLE org_registry ADD COLUMN IF NOT EXISTS role_code TEXT;
CREATE INDEX IF NOT EXISTS org_registry_pick_idx
  ON org_registry (industry_code, role_code, region_code, org_type_code);

CREATE TABLE IF NOT EXISTS region_notes (
  region_code TEXT NOT NULL REFERENCES regions(code),
  note        TEXT NOT NULL,
  source      TEXT NOT NULL,
  base_year   SMALLINT NOT NULL,
  PRIMARY KEY (region_code, base_year)
);

COMMENT ON TABLE industry_td_demand IS
  '산업이 어느 기술영역을 얼마나 요구하는가. 표본 수 없이 강도만 채우지 않는다';
COMMENT ON TABLE org_registry IS
  '지역 × 조직 유형의 기관 수. **기업 이름을 담지 않는다** (직업정보제공사업 범위)';


-- ============================================================
--  4. 지속 관리 · 한 사람의 지금 상태
--
--  검사가 끝나면 끝나는 서비스가 아니다. 경험이 늘면 Gap 이 다시 계산되고
--  목표가 바뀌면 다시 견준다. 그 **지금 값**을 담는 자리다.
--
--  `report_snapshots` 와 다른 표인 까닭: 스냅샷은 **그때 그대로 굳은 것**
--  이고 여기는 **지금 값**이다. 한 표에 담으면 갱신이 스냅샷을 덮어서
--  "만들어 둔 결과지를 고치지 않는다" 가 깨진다.
-- ============================================================

CREATE TABLE IF NOT EXISTS career_profiles (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  core_code      TEXT NOT NULL,
  market_code    TEXT NOT NULL,
  /* **ME_V3 응시를 가리킨다.** 처음에는 `attempts(id)` 로 적어 두었는데
     그 표는 ME_V1 과 ME_V2 의 응시고, 거기를 가리키면 V3 판정이 옛 판본의
     응시에 붙는다. 기술영역 열둘과 직무군 열여섯 사이에 1 대 1 사상이
     없어서 섞으면 어느 쪽도 아닌 값이 나온다 */
  base_attempt_id BIGINT REFERENCES v3_attempts(id) ON DELETE SET NULL,
  axis_levels    JSONB NOT NULL DEFAULT '{}',  -- {TD02:{J3:"L2",...},...}
  zones          JSONB NOT NULL DEFAULT '{}',  -- {Z1:[...],Z2:[...],...}
  gaps           JSONB NOT NULL DEFAULT '{}',  -- 비어 있는 축과 채우는 조건
  /* 관심 산업과 관심 역할을 **둘까지** 받는다. 응시에서 고른 것이 여기로
     옮겨 오고, 내 CareerMatri 에서 더하거나 지울 수 있다 */
  target_industry TEXT[] NOT NULL DEFAULT '{}',
  target_role     TEXT[] NOT NULL DEFAULT '{}',
  /* 보고 싶은 기관 유형(ORG_*). **Core 판정에 들어가지 않는다** */
  target_org      TEXT[] NOT NULL DEFAULT '{}',
  home_region     TEXT REFERENCES regions(code),
  move_range      TEXT,
  recomputed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, core_code)
);

/* 검사에서 고른 **조직환경**(OC1~OC7). 기관 유형(ORG_*)과 다른 층이다:
   OC 는 그 일을 하는 자리의 성격이고 ORG 는 그 자리를 가진 기관의 종류다.
   한 칸에 둘을 담고 있다가, 검사가 쓴 `OC1` 을 지역 화면이 `대기업` 으로
   읽는 자리가 생겼다. **이름이 겹치는 것이 곧 버그다** */
ALTER TABLE career_profiles
  ADD COLUMN IF NOT EXISTS target_org_context TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON TABLE career_profiles IS
  '지금 값. 스냅샷은 굳은 값이라 따로 둔다. 자유입력을 담지 않는다';


-- ============================================================
--  5. 자동화 event
--
--  표가 셋이 되는 것이 맞는지 먼저 적는다.
--
--    analytics_events  퍼널 계측. **사람으로 센다**. payload 를 최소로 둔다
--    outbox            메일. 보낼 것과 보낸 결과
--    career_events     다시 계산해야 할 일. **순서와 멱등이 필요하다**
--
--  셋이 묻는 질문이 다르다. 퍼널에 재계산을 섞으면 전환율이 거짓이 되고,
--  메일 대기열에 섞으면 메일이 안 나가는 날 재계산이 멈춘다.
-- ============================================================

CREATE TABLE IF NOT EXISTS career_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
  core_code   TEXT,
  kind        TEXT NOT NULL CHECK (kind IN (
                'attempt.scored',      -- 채점이 끝났다
                'evidence.added',      -- 경험이 늘었다
                'evidence.edited',     -- 경험이 바뀌었다
                'target.changed',      -- 목표 산업이나 역할이 바뀌었다
                'region.changed',      -- 희망 지역이나 이동 범위가 바뀌었다
                'pack.updated',        -- 산업팩이나 역할팩 판본이 올라갔다
                'posting.ingested',    -- 공고 자료가 들어왔다 (3단계)
                'gap.recomputed',      -- Gap 을 다시 계산했다
                'report.refreshed',    -- 결과를 다시 냈다
                'digest.due'           -- 월간 리포트를 낼 때가 됐다 (4단계)
              )),
  /* 다시 계산하는 데 필요한 최소값. **결과지 본문과 자유입력을 담지 않는다** */
  payload     JSONB NOT NULL DEFAULT '{}',
  /* 같은 일로 두 번 돌지 않게 하는 열쇠. 웹훅과 화면이 같은 순간에 들어와도
     두 번째가 DB 에서 거절된다 */
  dedupe_key  TEXT,
  status      TEXT NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued', 'running', 'done', 'failed', 'skipped')),
  attempts_n  SMALLINT NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS career_events_dedupe_uniq
  ON career_events(dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS career_events_queue_idx
  ON career_events(status, created_at) WHERE status IN ('queued', 'failed');

COMMENT ON TABLE career_events IS
  '다시 계산해야 할 일. 퍼널(analytics_events)과 메일(outbox)과 섞지 않는다';
COMMENT ON COLUMN career_events.dedupe_key IS
  '같은 일로 두 번 돌지 않게 DB 가 막는다. 읽고 판단한 뒤 쓰면 둘 다 통과한다';


-- ============================================================
--  6. 구독 · **산업팩을 잠그지 않는다**
--
--  구독은 계속 갱신되는 기능에 붙는다. 산업팩과 역할팩은 진단에 포함된다.
--  표는 이미 있는 `entitlements` 를 쓰고 종류만 늘린다.
-- ============================================================

/* **이미 선 제약의 이름을 그대로 쓴다.** 처음에는 `entitlements_kind_chk`
   라는 새 이름으로 `seat` · `pass` · `grant` · `track` 을 적어 두었는데,
   운영에 선 이름은 `entitlements_kind_check` 이고 받는 값은 `pass` 와
   `report` 다. 새 이름으로 올리면 **같은 칸에 제약이 둘** 서고, 적어 둔
   값 목록이 이미 있는 줄을 거절해서 그 자리에서 멈춘다. 실제로 멈췄다.
   `seat` 과 `grant` 는 쓰는 코드가 없다: 좌석은 `seats` 표에 있고 결과지
   권한은 `report_grants` 에 있다 */
ALTER TABLE entitlements DROP CONSTRAINT IF EXISTS entitlements_kind_check;
ALTER TABLE entitlements ADD CONSTRAINT entitlements_kind_check
  CHECK (kind IN ('pass', 'report', 'track'));

COMMENT ON CONSTRAINT entitlements_kind_check ON entitlements IS
  'track 이 CareerMatri Track 구독이다. 산업팩을 잠그는 종류를 만들지 않는다';
