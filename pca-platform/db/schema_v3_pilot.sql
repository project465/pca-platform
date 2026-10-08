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


-- ============================================================
--  4. 초대 — 코드는 사람 이름이 아니고 링크의 열쇠도 아니다
--
--  **가명과 초대 열쇠를 가른다.** 링크에 `V3-A0001` 을 그대로 싣고 그것으로
--  등록이 되면, 다음 번호를 눌러 본 사람이 남의 자리에 들어앉는다. 그래서
--  링크가 싣는 것은 **한 번 보여 주고 버리는 임의의 열쇠**이고, 가명은
--  운영자가 보는 이름이다. 둘이 한 줄에 같이 있지만 쓰이는 자리가 다르다.
--
--  열쇠는 해시만 저장한다(응시권 코드와 같은 규칙). DB 가 새도 그것으로
--  남의 자리에 들어갈 수 없다.
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_pilot_enrollments (
  id          BIGSERIAL PRIMARY KEY,
  -- 운영자가 보는 이름. 사람 이름도 학번도 아니다
  code        TEXT NOT NULL UNIQUE,
  -- 링크가 싣는 열쇠의 sha256. 만들 때 한 번 보여 주고 다시 보여주기는 없다
  token_hash  TEXT NOT NULL UNIQUE,
  cohort      TEXT NOT NULL DEFAULT 'V3_PILOT_1',
  -- 0 내부 확인 · 1 첫 사용자 · 2 추가 · 3 최종
  wave        SMALLINT NOT NULL DEFAULT 0 CHECK (wave BETWEEN 0 AND 3),
  note        TEXT,
  expires_at  TIMESTAMPTZ,
  used_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v3_pilot_enrollments_open
  ON v3_pilot_enrollments(cohort, wave) WHERE used_at IS NULL;

COMMENT ON TABLE v3_pilot_enrollments IS
  '초대 한 자리. code 는 운영자가 보는 가명이고 token_hash 가 링크의 열쇠다';

-- 참가자가 어느 초대로 들어왔는가. **wave 를 여기에도 적는다**: 초대를
-- 지워도 분석이 wave 를 잃지 않아야 한다
ALTER TABLE v3_pilot_participants
  ADD COLUMN IF NOT EXISTS enrollment_id BIGINT REFERENCES v3_pilot_enrollments(id);
ALTER TABLE v3_pilot_participants
  ADD COLUMN IF NOT EXISTS wave SMALLINT NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE v3_pilot_participants ADD CONSTRAINT v3_pilot_wave_chk
    CHECK (wave BETWEEN 0 AND 3);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- **한 종류 사용자만 모이면 안 된다.** 섞였는지 보려면 섞임을 적어야 한다.
-- 셋 다 분석용이고 Core 판정에 들어가지 않는다
ALTER TABLE v3_pilot_participants
  ADD COLUMN IF NOT EXISTS experience_level TEXT CHECK (experience_level IN
    ('none','coursework','lab','internship','industry'));
ALTER TABLE v3_pilot_participants
  ADD COLUMN IF NOT EXISTS interest_area TEXT;

COMMENT ON COLUMN v3_pilot_participants.experience_level IS
  '분석용. 거의 없음 · 수업/캡스톤 · 연구실 · 인턴/현장 · 산업 경력';
COMMENT ON COLUMN v3_pilot_participants.interest_area IS
  '분석용. 설계 · CAE · 생산 · 시험/계측 · 제어 · 재료 가운데 고른 것';


-- ============================================================
--  5. 문항마다 머뭇거린 자리
--
--  **침습적으로 쫓지 않는다.** 키 입력도 화면 녹화도 마우스 자취도 적지
--  않는다. 적는 것은 그 문항에 처음 닿은 때와 답이 몇 번 바뀌었는가와
--  뒤로 갔는가뿐이고, 셋 다 **고칠 수 있는 것**을 가리킨다.
--
--  답이 찍힌 시각은 `v3_responses.answered_at` 에 이미 있다. 여기 더하는
--  것은 **그 앞에 걸린 시간**과 **다시 누른 횟수**다.
-- ============================================================

ALTER TABLE v3_responses ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;
ALTER TABLE v3_responses ADD COLUMN IF NOT EXISTS change_count SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN v3_responses.change_count IS
  '같은 문항의 답을 고쳐 적은 횟수. 0 이면 한 번에 골랐다';

CREATE TABLE IF NOT EXISTS v3_pilot_screen_events (
  id         BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  -- 화면 이름. **문항 번호를 적지 않는다**
  screen_id  TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('enter','back','skip')),
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v3_pilot_screen_events_attempt
  ON v3_pilot_screen_events(attempt_id, at);

COMMENT ON TABLE v3_pilot_screen_events IS
  '화면에 들어온 때와 뒤로 간 때. 파일럿 참가자에게만 적는다';


-- ============================================================
--  6. 파일럿 의견 — 여섯 지표를 따로 묻는다
--
--  **만족도 하나로 합치지 않는다.** `4.3점` 하나로 끝내면 무엇을 고쳐야
--  할지 알 수 없다. 문항 이해 · 소유 구분 · 결과 납득 · 공백 이해 ·
--  실행 가능성 · 상품 가치를 따로 받고, 따로 집계한다.
--
--  가격은 **값을 정하는 질문으로 만들지 않는다.** 지금 값을 보여 주고
--  어떻게 느끼는지만 받는다. 실제 결제 행동이 아니라 자기보고다.
-- ============================================================

ALTER TABLE v3_pilot_items ADD COLUMN IF NOT EXISTS choices JSONB;
ALTER TABLE v3_pilot_items ADD COLUMN IF NOT EXISTS required BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  ALTER TABLE v3_pilot_items DROP CONSTRAINT v3_pilot_items_kind_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE v3_pilot_items ADD CONSTRAINT v3_pilot_items_kind_chk
    CHECK (kind IN ('scale','text','choice','action'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE v3_pilot_items DROP CONSTRAINT v3_pilot_items_topic_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE v3_pilot_items ADD CONSTRAINT v3_pilot_items_topic_chk
    CHECK (topic IN ('item','result','product','ui','price'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN v3_pilot_items.choices IS
  '고르는 문항의 보기. [{value,label}] — action 은 결과지의 할 일에서 만든다';

-- 상품 문항이 등급마다 다른 것을 묻는다. `PAID` 하나로는 STANDARD 와 PRO 가
-- 같은 질문을 받게 되고, 그러면 둘의 값 차이를 물을 수 없다
DO $$ BEGIN
  ALTER TABLE v3_pilot_items DROP CONSTRAINT v3_pilot_items_tier_scope_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE v3_pilot_items ADD CONSTRAINT v3_pilot_items_tier_scope_chk
    CHECK (tier_scope IN ('all','BASIC','STANDARD','PRO','PAID'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1차에 둔 여덟 가운데 상품 문항 둘을 등급별 세 벌로 바꾼다
UPDATE v3_pilot_items SET active = false
 WHERE code IN ('V6_FREE_VALUE','V6_PAID_VALUE');

INSERT INTO v3_pilot_items (code, order_no, kind, topic, tier_scope, ko, hint, choices) VALUES
  -- A 문항 이해 · B 소유 구분
  ('V2B_OWNERSHIP',  3, 'scale', 'item', 'all',
   '"내가 했다" 와 "내가 정했다" 의 차이를 이해하기 쉬웠습니까?',
   '보기 2·3·4 를 고를 때를 떠올려 주세요', NULL),
  -- UI · 근거 고르기 피로도
  ('V9_EVIDENCE_LOAD', 9, 'scale', 'ui', 'all',
   '근거를 고르는 화면에서 항목이 너무 많다고 느꼈습니까?',
   '많다고 느끼셨으면 5 에 가깝게 골라주세요', NULL),
  -- 결과 첫 화면
  ('V10_FIRST_READ', 10, 'scale', 'result', 'all',
   '결과 화면을 처음 봤을 때, 어디부터 읽어야 할지 바로 알 수 있었습니까?',
   NULL, NULL),
  ('V11_FIRST_SECTION', 11, 'choice', 'ui', 'all',
   '결과에서 가장 먼저 본 부분은 무엇입니까?', NULL,
   '[{"value":"focus","label":"먼저 볼 영역"},
     {"value":"evidence","label":"근거"},
     {"value":"gaps","label":"채울 것"},
     {"value":"plan","label":"다음 할 일"},
     {"value":"industry","label":"산업"},
     {"value":"role","label":"직무"},
     {"value":"translation","label":"연구·프로젝트 번역"},
     {"value":"other","label":"그 밖"}]'::jsonb),
  -- C 결과 납득 · 설명 가능성
  ('V12_EXPLAIN', 12, 'scale', 'result', 'all',
   '친구나 선배에게 "왜 이 영역이 결과에 나왔는지" 설명할 수 있겠습니까?',
   NULL, NULL),
  ('V13_DISAGREE', 13, 'scale', 'result', 'all',
   '결과 가운데 본인의 경험과 맞지 않는다고 느낀 부분이 있습니까?',
   '있다고 느끼셨으면 5 에 가깝게 골라주세요', NULL),
  ('V14_DISAGREE_TEXT', 14, 'text', 'result', 'all',
   '맞지 않는다고 느낀 부분을 적어주세요.',
   '한 곳만 적어주셔도 됩니다', NULL),
  -- E 실행 가능성
  ('V15_ACTION_PICK', 15, 'action', 'result', 'all',
   '가장 해볼 만한 행동 하나를 골라주세요.',
   '결과지의 "다음에 할 일" 가운데 하나입니다', NULL),
  -- F 상품 가치 — 등급마다 다른 것을 묻는다
  ('V16_BASIC_VALUE', 16, 'scale', 'product', 'BASIC',
   '이 결과만으로도 다음에 무엇을 해볼지 알 수 있었습니까?', NULL, NULL),
  ('V16_STD_VALUE', 16, 'scale', 'product', 'STANDARD',
   '무료 결과보다 "내가 실제로 한 판단과 근거" 를 더 잘 이해하게 됐습니까?',
   NULL, NULL),
  ('V16_PRO_VALUE', 16, 'scale', 'product', 'PRO',
   '산업·직무·연구 경험 번역이 지원서나 면접 준비에 도움이 될 것 같습니까?',
   NULL, NULL),
  -- 가격 — 값을 정하는 질문으로 만들지 않는다.
  -- **세 등급 모두에게 두 값을 다 보여 주고 묻는다.** 산 등급만 묻으면
  -- 무료로 받으신 분이 올라올 값인지와 STANDARD 를 받으신 분이 PRO 로
  -- 올라갈 값인지를 아무도 말해 주지 않는다. 받지 않은 등급에 대한 답은
  -- **치러 본 값이 아닌 짐작**이고, 분석 문서가 그것을 적는다
  ('V17_PRICE_STD', 17, 'choice', 'price', 'all',
   '지금 값은 14,900원입니다. 어떻게 느끼십니까?',
   '받으신 등급과 관계없이, 그 값이면 어떨지 골라주세요',
   '[{"value":"1","label":"매우 아깝다"},
     {"value":"2","label":"다소 아깝다"},
     {"value":"3","label":"적절하다"},
     {"value":"4","label":"괜찮다"},
     {"value":"5","label":"충분히 가치 있다"}]'::jsonb),
  ('V17_PRICE_PRO', 18, 'choice', 'price', 'all',
   '지금 값은 21,900원입니다. 어떻게 느끼십니까?',
   '받으신 등급과 관계없이, 그 값이면 어떨지 골라주세요',
   '[{"value":"1","label":"매우 아깝다"},
     {"value":"2","label":"다소 아깝다"},
     {"value":"3","label":"적절하다"},
     {"value":"4","label":"괜찮다"},
     {"value":"5","label":"충분히 가치 있다"}]'::jsonb),
  ('V18_PRICE_TEXT', 19, 'text', 'price', 'all',
   '이 값을 내려면 결과에서 무엇이 더 있어야 한다고 느끼셨습니까?',
   NULL, NULL)
ON CONFLICT (code) DO UPDATE
  SET order_no = EXCLUDED.order_no, kind = EXCLUDED.kind, topic = EXCLUDED.topic,
      tier_scope = EXCLUDED.tier_scope, ko = EXCLUDED.ko, hint = EXCLUDED.hint,
      choices = EXCLUDED.choices, active = true;

-- 1차 문항의 차례를 새 문항 사이에 끼워 넣는다
UPDATE v3_pilot_items SET order_no = 1 WHERE code = 'V1_ITEM_CLEAR';
UPDATE v3_pilot_items SET order_no = 2 WHERE code = 'V2_OWNERSHIP';
UPDATE v3_pilot_items SET order_no = 4 WHERE code = 'V3_MATCH';
UPDATE v3_pilot_items SET order_no = 5 WHERE code = 'V4_WHY';
UPDATE v3_pilot_items SET order_no = 6 WHERE code = 'V5_NEXT';
UPDATE v3_pilot_items SET order_no = 7 WHERE code = 'V7_HARD';
UPDATE v3_pilot_items SET order_no = 8 WHERE code = 'V8_MISSING';

-- 고른 보기와 고른 할 일을 적을 칸. 척도는 value, 자유입력은 text 를 쓴다
ALTER TABLE v3_pilot_feedback ADD COLUMN IF NOT EXISTS choice TEXT;
COMMENT ON COLUMN v3_pilot_feedback.choice IS
  '고르는 문항의 보기 값, 또는 고른 할 일의 action id';


-- ============================================================
--  7. 재는 자리를 응시 화면 밖에 둔다
--
--  응시 화면은 `ME_V3_ASSESSMENT_UI_V1` 로 굳혀 두었다. 답을 몇 번 고쳤는지와
--  어느 화면으로 되돌아갔는지를 재려고 그 파일에 코드를 심으면, 동결 기록에
--  `응시 화면이 바뀌었다` 가 남고 참가자와 일반 응시자가 다른 코드를 지나게
--  된다. **그러면 파일럿이 재는 것이 제품이 아니다.**
--
--  둘 다 DB 가 혼자 할 수 있는 일이다. 쓰는 쪽은 아무것도 모르고, 재는 것이
--  응답을 바꾸지 않는다.
-- ============================================================

-- 답을 고쳐 적은 횟수. 값이 그대로면 세지 않는다(같은 답을 다시 눌렀다)
CREATE OR REPLACE FUNCTION v3_response_change_count() RETURNS trigger AS $$
BEGIN
  IF NEW.value_int IS DISTINCT FROM OLD.value_int
     OR NEW.value_text IS DISTINCT FROM OLD.value_text
     OR NEW.kind IS DISTINCT FROM OLD.kind THEN
    NEW.change_count := COALESCE(OLD.change_count, 0) + 1;
  ELSE
    NEW.change_count := COALESCE(OLD.change_count, 0);
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS v3_response_change_trg ON v3_responses;
CREATE TRIGGER v3_response_change_trg
  BEFORE UPDATE ON v3_responses
  FOR EACH ROW EXECUTE FUNCTION v3_response_change_count();

-- 화면을 옮긴 자취. **파일럿 참가자에게만 적는다**: 모두를 재면 그것은
-- 파일럿이 아니라 추적이다
CREATE OR REPLACE FUNCTION v3_screen_trace() RETURNS trigger AS $$
BEGIN
  IF NEW.current_screen IS DISTINCT FROM OLD.current_screen
     AND NEW.current_screen IS NOT NULL
     AND EXISTS (SELECT 1 FROM v3_pilot_participants p WHERE p.user_id = NEW.user_id) THEN
    INSERT INTO v3_pilot_screen_events (attempt_id, screen_id, kind)
    VALUES (NEW.id, NEW.current_screen, 'enter');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS v3_screen_trace_trg ON v3_attempts;
CREATE TRIGGER v3_screen_trace_trg
  AFTER UPDATE OF current_screen ON v3_attempts
  FOR EACH ROW EXECUTE FUNCTION v3_screen_trace();

COMMENT ON FUNCTION v3_response_change_count() IS
  '응시 화면을 건드리지 않고 답 수정 횟수를 센다';
COMMENT ON FUNCTION v3_screen_trace() IS
  '응시 화면을 건드리지 않고 화면 이동을 적는다. 파일럿 참가자만';

/* ── 8. 종이를 못 뽑은 자리 ────────────────────────────────────────

   **화면이 보내는 발자국과 서버가 적는 사실을 한 표에 둔다.** 둘을 갈라
   두면 운영 표가 두 곳을 봐야 하고, 보는 곳이 둘이면 한 곳을 빠뜨린다.
   `pdf_fail` 은 그리는 브라우저가 죽은 자리라 응시자의 클릭이 아니다.           */

DO $$ BEGIN
  ALTER TABLE v3_pilot_events DROP CONSTRAINT v3_pilot_events_kind_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE v3_pilot_events ADD CONSTRAINT v3_pilot_events_kind_chk
    CHECK (kind IN ('result_open','section_view','action_click',
                    'action_save','action_unsave','pdf_fail'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
