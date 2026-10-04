-- ============================================================
--  Phase 2 — 셀프 서비스와 ME_V2 서버 연결
--
--  **표를 새로 만들기 전에 있는 것을 먼저 늘린다.** Phase 1 감사에서
--  products · orders · payments · entitlements · attempts · consents ·
--  report_snapshots · evidence_profiles 가 전부 이미 있었다. 여기서 하는
--  일은 그 표에 Phase 2 가 필요로 하는 칸을 더하는 것이고, 새 표는 둘뿐이다.
--
--  적용: schema.sql → schema_metri.sql → schema_platform.sql → 이 파일
-- ============================================================


-- ============================================================
--  1. 상품이 시장과 등급을 들고 다닌다
--
--  **상품은 설정이지 코드가 아니다.** ME × BASIC/STANDARD/PRO × KR/GLOBAL
--  여섯 줄을 코드에 if 로 쌓으면 다음 전공에서 열두 줄이 된다.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS market TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS major_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS assessment_version TEXT;

COMMENT ON COLUMN products.market IS
  'KR | GLOBAL. 사이트가 아니라 시장이다: 한국 사이트에서 미국을 보는
   사람이 가장 흔하고, 그 사람의 결제 시장은 KR 이다';
COMMENT ON COLUMN products.tier IS
  'BASIC | STANDARD | PRO. 이용권이 여는 등급이고, 주소의 ?tier= 가 아니다';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tier_chk;
ALTER TABLE products ADD CONSTRAINT products_tier_chk
  CHECK (tier IS NULL OR tier IN ('BASIC', 'STANDARD', 'PRO'));
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_market_chk;
ALTER TABLE products ADD CONSTRAINT products_market_chk
  CHECK (market IS NULL OR market IN ('KR', 'GLOBAL'));

/* ME_V2 상품 여섯. **금액을 지어내지 않는다**: 승인된 가격이 없으므로
   0 으로 둔다. 0 은 '아직 값을 못 정했다' 는 뜻이고, 운영 결제 대행사가
   켜져 있을 때 0원 상품은 `catalog.ts` 가 결제를 거절한다. */
INSERT INTO products (code, kind, amount, currency, seat_count, active,
                      track_code, report_level, market, major_code, tier,
                      assessment_version)
VALUES
  ('ME_V2_BASIC_KR',     'report', 0, 'KRW', 1, true, 'UNIV_HIGH', 'free', 'KR',     'ME', 'BASIC',    'ME_V2'),
  ('ME_V2_STANDARD_KR',  'report', 0, 'KRW', 1, true, 'UNIV_HIGH', 'full', 'KR',     'ME', 'STANDARD', 'ME_V2'),
  ('ME_V2_PRO_KR',       'report', 0, 'KRW', 1, true, 'UNIV_HIGH', 'full', 'KR',     'ME', 'PRO',      'ME_V2'),
  ('ME_V2_BASIC_GL',     'report', 0, 'USD', 1, true, 'UNIV_HIGH', 'free', 'GLOBAL', 'ME', 'BASIC',    'ME_V2'),
  ('ME_V2_STANDARD_GL',  'report', 0, 'USD', 1, true, 'UNIV_HIGH', 'full', 'GLOBAL', 'ME', 'STANDARD', 'ME_V2'),
  ('ME_V2_PRO_GL',       'report', 0, 'USD', 1, true, 'UNIV_HIGH', 'full', 'GLOBAL', 'ME', 'PRO',      'ME_V2')
ON CONFLICT (code) DO UPDATE
  SET market = EXCLUDED.market, major_code = EXCLUDED.major_code,
      tier = EXCLUDED.tier, assessment_version = EXCLUDED.assessment_version;


-- ============================================================
--  2. 이용권이 등급을 들고 다닌다
--
--  **주소의 ?tier=PRO 를 믿지 않는다.** BASIC 을 산 사람이 주소를 고쳐
--  PRO 를 여는 길을 막는 유일한 방법은, 열 수 있는 등급을 서버가 들고
--  있는 것이다.
-- ============================================================

/* **끝나는 날이 없는 이용권이 있다.** 기간권(`pass`)은 날짜가 뜻을 갖지만
   결과지 이용권은 한 번 열리면 닫히지 않는다. NOT NULL 로 두면 '안 끝난다'
   를 적을 길이 없어 2099년 같은 가짜 날짜를 쓰게 되고, 그 날짜가 언젠가
   비교식에 끼어든다. NULL 이 '끝나지 않는다' 다 */
ALTER TABLE entitlements ALTER COLUMN ends_at DROP NOT NULL;

/* 예전에는 이용권이 기간권 하나뿐이라 `kind = 'pass'` 로 못 박혀 있었다.
   결과지 이용권이 들어오므로 둘을 받는다. **값을 열어 두지 않는다**:
   목록을 지우면 오타가 그대로 들어온다 */
ALTER TABLE entitlements DROP CONSTRAINT IF EXISTS entitlements_kind_check;
ALTER TABLE entitlements ADD CONSTRAINT entitlements_kind_check
  CHECK (kind IN ('pass', 'report'));

ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS major_code TEXT;
ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS assessment_version TEXT;
ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE entitlements DROP CONSTRAINT IF EXISTS entitlements_status_chk;
ALTER TABLE entitlements ADD CONSTRAINT entitlements_status_chk
  CHECK (status IN ('active', 'expired', 'revoked'));

/* **주문 하나가 이용권 하나다.** 웹훅이 두 번 와도 둘째 줄이 생기지
   않는다. 멱등을 코드의 if 가 아니라 제약으로 보장한다: 코드는 고쳐 쓰다
   빠뜨릴 수 있고 제약은 빠뜨릴 수 없다. */
CREATE UNIQUE INDEX IF NOT EXISTS entitlements_order_uniq
  ON entitlements(order_id) WHERE order_id IS NOT NULL;

COMMENT ON INDEX entitlements_order_uniq IS
  '같은 결제로 이용권이 두 번 생기지 않는다. 중복 웹훅을 여기서 막는다';


-- ============================================================
--  3. 응시가 이용권·등급·학위 단계를 들고 다닌다
--
--  `attempts` 에는 이미 site_id · interface_language · target_country 가
--  있다(Phase 1). **표를 새로 만들지 않고** 네 칸을 더한다.
-- ============================================================

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS entitlement_id BIGINT REFERENCES entitlements(id);
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS education_stage TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS assessment_version TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ;

ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_stage_chk;
ALTER TABLE attempts ADD CONSTRAINT attempts_stage_chk
  CHECK (education_stage IS NULL
         OR education_stage IN ('bachelor', 'master', 'phd', 'postdoc'));

COMMENT ON COLUMN attempts.education_stage IS
  '묻는 장면을 바꾸고 점수를 바꾸지 않는다. 증거와 연구 소유를 올리지도 않는다';

/* 한 이용권으로 응시를 두 번 열지 않는다. 좌석 하나 = 응시 하나와 같은
   규칙이고, 같은 사람의 응답이 두 벌 쌓여 규준이 오염되는 것을 막는다 */
CREATE UNIQUE INDEX IF NOT EXISTS attempts_entitlement_uniq
  ON attempts(entitlement_id) WHERE entitlement_id IS NOT NULL;


-- ============================================================
--  4. ME_V2 응답
--
--  **`responses` 에 넣지 않는다.** 저 표는 `questions.id`(DB 행)를 가리키는
--  외래키인데 ME_V2 문항은 DB 에 없고 `assessment/ME_V2/*.json` 이 원본이다.
--  억지로 넣으려면 92문항을 `questions` 에 심어야 하는데, 그러면 ME_V1 채점
--  (`scoring.ts`)이 그 행들을 집어 갈 수 있다(설계 원칙 8 이 말하는 사고다).
--
--  **그래서 다른 열쇠 공간을 쓰는 다른 검사의 응답표다.** 진실의 출처가
--  둘이 되는 것이 아니라, 검사지가 둘이라 응답표가 둘이다.
-- ============================================================

CREATE TABLE IF NOT EXISTS v2_responses (
  attempt_id   BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  item_id      TEXT   NOT NULL,          -- ME_INT_DESIGN_01 …
  value        JSONB  NOT NULL,          -- 숫자 하나이거나 고른 것 목록
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, item_id)
);

COMMENT ON TABLE v2_responses IS
  'ME_V2 응답. 서버가 진실이고 브라우저 저장소는 복구용 사본일 뿐이다';

CREATE INDEX IF NOT EXISTS v2_responses_attempt_idx
  ON v2_responses(attempt_id, answered_at DESC);


-- ============================================================
--  5. 결과지 판본에 결과 자체를 담는다
--
--  **지난 결과지를 조용히 고치지 않는다.** 경험을 나중에 고쳐도 예전
--  결과지는 그대로여야 하고, 그러려면 그때 그린 값이 어딘가 남아 있어야
--  한다. 판본 숫자만 적어 두고 결과를 매번 다시 계산하면, 엔진을 고치는
--  날 작년 결과지가 같이 바뀐다.
-- ============================================================

ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS evidence_snapshot_id BIGINT
  REFERENCES evidence_snapshots(id);
ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS pdf_path TEXT;
ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS trace_id TEXT;
ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS interface_language TEXT;

COMMENT ON COLUMN report_snapshots.payload IS
  '그때 그린 결과 객체 그대로. 엔진을 고쳐도 이 줄은 바뀌지 않는다';

/* 한 응시에 결과지 판본이 여럿 쌓인다(다시 생성). 가장 최근 것이 지금
   보는 것이고 옛것은 그대로 남는다 */
DROP INDEX IF EXISTS report_snapshots_attempt_key;
CREATE INDEX IF NOT EXISTS report_snapshots_attempt_idx
  ON report_snapshots(attempt_id, generated_at DESC);


-- ============================================================
--  6. 막힌 것을 아침에 보이게
--
--  **결과 생성이 깨진 것과 아직 안 만든 것은 다른 상태다.** 화면에서
--  구별되지 않으면 몇 달이 간다(Phase 1 에서 실제로 그랬다).
-- ============================================================

CREATE TABLE IF NOT EXISTS job_failures (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT NOT NULL,            -- result | pdf | payment | email
  attempt_id  BIGINT REFERENCES attempts(id) ON DELETE CASCADE,
  order_id    BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  trace_id    TEXT NOT NULL,
  message     TEXT NOT NULL,            -- 사람이 읽는 한 줄. 스택은 담지 않는다
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE job_failures IS
  '사람이 봐야 하는 실패만 적는다. **개인 서술을 담지 않는다**: 무엇이
   몇 번 깨졌는지와 되짚을 번호까지다';

CREATE INDEX IF NOT EXISTS job_failures_open_idx
  ON job_failures(kind, created_at DESC) WHERE resolved_at IS NULL;
