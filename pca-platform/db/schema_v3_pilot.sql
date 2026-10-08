-- ME_V3 본 파일럿. **ME_V2 파일럿 표에 섞지 않는다.**
--
-- `pilot_feedback` 은 `attempts`(V2) 를 가리키고 문항도 V2 결과지를 묻는다.
-- 거기에 V3 응답을 넣으면 두 판본의 집계가 한 표에서 섞이고, 어느 쪽도
-- 아닌 평균이 나온다.
--
-- **응시 화면은 건드리지 않는다.** 화면은 `ME_V3_ASSESSMENT_UI_V1` 로
-- 굳혀 두었고, 블록마다 걸린 시간은 `v3_responses.answered_at` 에서 그대로
-- 읽을 수 있다. 재려고 화면에 코드를 심으면 재는 행위가 재려는 것을 바꾼다.
--
-- 적용: psql --single-transaction -f db/schema_v3_pilot.sql

-- ============================================================
--  1. 참가자 — 이름이 아니라 가명으로 다닌다
--
--  **전공명은 준식별자다.** `○○대 기계공학과 박사 후 연구원` 세 칸이면
--  그 사람이 누구인지 좁혀진다. 그래서 (1) 화면과 분석에는 가명만 쓰고,
--  (2) 전공명에 보존 기한을 박아 두고, (3) 기한이 지나면 지운다.
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_pilot_participants (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 화면·내보내기·분석에서 쓰는 이름. 사람 이름도 학번도 아니다
  code            TEXT NOT NULL UNIQUE,
  cohort          TEXT NOT NULL DEFAULT 'V3_PILOT_1',
  education_stage TEXT NOT NULL CHECK (education_stage IN
                    ('bachelor','master','phd','postdoc')),
  -- **준식별자.** 자유입력이라 `기계공학부 정밀가공연구실` 처럼 적힌다
  major_name      TEXT,
  major_field     TEXT CHECK (major_field IN
                    ('STEM','HUMANITIES_SOCIAL','BUSINESS','OTHER_INTERDISCIPLINARY')),
  current_status  TEXT CHECK (current_status IN
                    ('enrolled','on_leave','graduated','employed','job_seeking','other')),
  -- 가고 싶은 쪽을 그 사람 말로. 이것도 자유입력이라 파기 대상이다
  career_interest TEXT,
  consented_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 이 날짜가 지나면 `major_name` 과 `career_interest` 를 지운다
  purge_after     DATE NOT NULL,
  purged_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cohort)
);

CREATE INDEX IF NOT EXISTS v3_pilot_participants_purge
  ON v3_pilot_participants(purge_after) WHERE purged_at IS NULL;

COMMENT ON COLUMN v3_pilot_participants.code IS
  '가명. 운영 화면과 내보내기는 이 값만 쓴다';
COMMENT ON COLUMN v3_pilot_participants.major_name IS
  '준식별자. 학위·전공계열과 함께 쓰면 개인이 좁혀진다. purge_after 뒤 삭제';
COMMENT ON COLUMN v3_pilot_participants.career_interest IS
  '자유입력. purge_after 뒤 삭제';


-- ============================================================
--  2. 발자국 — 어디를 보고 어디를 안 봤는가
--
--  **표를 종류마다 만들지 않는다.** 화면 머문 시간과 결과지 절 조회와
--  할 일 누름은 같은 모양(언제 · 무엇을)이고, 표가 셋이 되면 운영자가 한
--  표만 보고 나머지를 놓친다.
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_pilot_events (
  id         BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN
               ('result_open','section_view','action_click','action_save','action_unsave')),
  -- 절 이름이나 할 일 id. **문항 번호는 넣지 않는다**
  ref        TEXT,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v3_pilot_events_attempt
  ON v3_pilot_events(attempt_id, kind, at DESC);

COMMENT ON TABLE v3_pilot_events IS
  '파일럿 참가자의 결과지 발자국. 채점에 들어가지 않는다';


-- ============================================================
--  3. 피드백 — 여덟 문항
--
--  네 가지를 묻는다: 문항 · 결과 · 상품 · 화면. 만족도 하나로 줄이면
--  무엇을 고쳐야 할지 알 수 없다. 척도 여섯에 자유입력 둘이고, 상품
--  문항은 받은 등급에 따라 다른 쪽이 선다.
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_pilot_items (
  code       TEXT PRIMARY KEY,
  order_no   INTEGER NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('scale','text')),
  -- 무엇을 재는 칸인가. `v3:pilot` 이 네 가지가 덮였는지 이 값으로 센다
  topic      TEXT NOT NULL CHECK (topic IN ('item','result','product','ui')),
  -- 'all' · 'BASIC' · 'PAID'. 받은 등급에 맞는 문항만 세운다
  tier_scope TEXT NOT NULL DEFAULT 'all' CHECK (tier_scope IN ('all','BASIC','PAID')),
  ko         TEXT NOT NULL,
  hint       TEXT,
  active     BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO v3_pilot_items (code, order_no, kind, topic, tier_scope, ko, hint) VALUES
  ('V1_ITEM_CLEAR',  1, 'scale', 'item',    'all',
   '문항이 무엇을 묻는지 분명했습니까?', NULL),
  ('V2_OWNERSHIP',   2, 'scale', 'item',    'all',
   '받아서 한 일과 직접 정한 일을 가려 답하기 쉬웠습니까?',
   '보기 2·3·4 를 고를 때를 떠올려 주세요'),
  ('V3_MATCH',       3, 'scale', 'result',  'all',
   '결과가 지금까지 해 온 일과 맞습니까?', NULL),
  ('V4_WHY',         4, 'scale', 'result',  'all',
   '왜 이 영역이 먼저인지 남에게 설명할 수 있겠습니까?', NULL),
  ('V5_NEXT',        5, 'scale', 'result',  'all',
   '적혀 있는 다음에 할 일을 실제로 해볼 수 있겠습니까?', NULL),
  ('V6_FREE_VALUE',  6, 'scale', 'product', 'BASIC',
   '무료로 받은 이 결과가 쓸모 있었습니까?', NULL),
  ('V6_PAID_VALUE',  6, 'scale', 'product', 'PAID',
   '치른 값에 견주어 받은 것이 알맞았습니까?', NULL),
  ('V7_HARD',        7, 'text',  'ui',      'all',
   '어느 화면이 가장 어려웠습니까?',
   '한 곳만 적어주셔도 됩니다'),
  ('V8_MISSING',     8, 'text',  'result',  'all',
   '결과지에서 빠졌다고 느낀 것이 있습니까?', NULL)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS v3_pilot_feedback (
  id          BIGSERIAL PRIMARY KEY,
  attempt_id  BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  item_code   TEXT NOT NULL REFERENCES v3_pilot_items(code),
  -- 척도면 1~5, 자유입력이면 NULL
  value       SMALLINT CHECK (value BETWEEN 1 AND 5),
  -- 자유입력. **파기 대상이다**
  text        TEXT,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, item_code)
);

CREATE INDEX IF NOT EXISTS v3_pilot_feedback_item
  ON v3_pilot_feedback(item_code, answered_at DESC);

COMMENT ON TABLE v3_pilot_feedback IS
  'ME_V3 본 파일럿 응답. 채점에 들어가지 않는다. 자유입력이 섞여 있어
   파기 때 지운다';
