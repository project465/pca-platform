-- ============================================================
--  Phase 2.1 — 상용화 준비
--
--  **네 번째로 적용한다** (schema.sql → schema_metri.sql →
--  schema_platform.sql → schema_phase2.sql → 이 파일).
--
--  표를 새로 만들지 않는다. 늘어나는 것은 칸과 제약이다. 표를 하나 더
--  만들면 같은 것을 정하는 자리가 둘이 되고, 그중 하나는 반드시
--  뒤처진다(설계 원칙 10).
-- ============================================================


-- ============================================================
--  1. 가격이 승인됐는가 — 0원과 '아직 안 정했다' 를 가른다
--
--  **0 하나로 두 가지를 말하고 있었다.**
--
--    HS_FREE · UNIV_FREE   금액 0 = 진짜 무료 구간. 법이 요구하는 시용
--                          장치다(전자상거래법 제17조 제6항: 제공 개시
--                          후 철회를 제한하려면 시험 사용을 제공해야 한다)
--    ME_V2_*               금액 0 = 값을 아직 못 정했다. 지어내지 않았다
--
--  표에서 둘이 똑같이 생겨서, '0원이면 팔지 않는다' 로 막으면 **법이
--  요구하는 무료 구간까지 닫힌다.** 그래서 뜻을 칸으로 꺼낸다.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS price_status TEXT NOT NULL
  DEFAULT 'approved';

DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_price_status_chk
    CHECK (price_status IN ('approved', 'not_approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- **승인되지 않은 가격은 금액이 0 이어야 한다.** 숫자를 적어 두고 상태만
-- '미승인' 으로 두면, 승인 안 된 값이 화면에 찍히다가 어느 날 그대로
-- 결제된다. 지어낸 값이 코드에 사는 것을 제약으로 막는다.
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_not_approved_zero_chk
    CHECK (price_status = 'approved' OR amount = 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN products.price_status IS
  'approved = 값이 정해졌다(0 이면 진짜 무료) · not_approved = 아직 못
   정했다. **화면에 0원이라고 적지 않고 PRICE_NOT_APPROVED 로 적는다**';

-- ME_V2 여섯 상품은 값이 정해지지 않았다. 지어내지 않는다
UPDATE products SET price_status = 'not_approved'
 WHERE assessment_version = 'ME_V2' AND amount = 0;

-- 무료 구간은 **승인된 0원**이다. 법이 요구하는 시용 장치라 닫으면 안 된다
UPDATE products SET price_status = 'approved'
 WHERE code IN ('HS_FREE', 'UNIV_FREE');


-- ============================================================
--  2. 승인된 결제의 통화를 대조한다
--
--  `settlePayment` 이 금액만 견주고 **통화를 안 보고 있었다.** 글로벌
--  시장을 열면 USD 29 가 KRW 29 주문을 확정시킨다. 금액이 같아서
--  대조를 통과한다.
--
--  대조하려면 PG 가 승인한 통화를 적어 두어야 한다. 지금은 적는 자리가
--  없었다.
-- ============================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency CHAR(3);

COMMENT ON COLUMN payments.currency IS
  'PG 가 실제로 승인한 통화. 주문의 통화와 대조한다. **금액만 보면
   USD 29 가 KRW 29 주문을 확정시킨다**';


-- ============================================================
--  3. 주문 상태를 한 자리에서 못 박는다
--
--  `orders.status` 가 글자였고 제약이 없었다. 코드가 'pending' ·
--  'paid' · 'failed' · 'cancelled' 를 쓰는데, 오타 하나가 조용히
--  들어가면 그 주문은 어느 조회에도 걸리지 않는다.
-- ============================================================

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_status_chk
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN orders.status IS
  'pending → paid → refunded, 또는 pending → failed · cancelled.
   **되돌아가지 않는다**: paid 에서 pending 으로 내려오는 길은 없다';


-- ============================================================
--  4. 결제 이벤트는 쌓이기만 한다
--
--  `payment_events` 가 이미 있고 UNIQUE(provider, event_id) 로 같은
--  이벤트를 두 번 쌓지 않는다. 모자란 것은 **고치지 못하게 막는 것**이다.
--  감사 자료는 고칠 수 있으면 감사 자료가 아니다.
-- ============================================================

CREATE OR REPLACE FUNCTION payment_events_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '결제 이벤트는 고치거나 지울 수 없습니다 (감사 자료)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_events_no_change ON payment_events;
CREATE TRIGGER payment_events_no_change
  BEFORE UPDATE OR DELETE ON payment_events
  FOR EACH ROW EXECUTE FUNCTION payment_events_immutable();

-- 서명이 틀린 요청도 남긴다(공격을 받고 있는지 나중에 알아야 한다).
-- 그런 요청은 `event_id` 가 없어서 UNIQUE 가 걸리지 않으므로, 같은
-- 요청이 쏟아질 때 표가 부풀지 않도록 들어온 시각으로 찾을 수 있게 둔다
CREATE INDEX IF NOT EXISTS payment_events_recent_idx
  ON payment_events(received_at DESC);


-- ============================================================
--  5. 동의 기록 — 무엇에 · 어느 판에 · 어느 언어로 · 언제 · 어느 사이트에서
--
--  **동의는 받았다는 사실만으로는 쓸 수 없다.** 분쟁이 생기면 "그때
--  어느 문서의 어느 판에 동의했는가" 를 대야 한다. 판을 적어 두지
--  않으면 약관을 고친 뒤에 받은 동의와 고치기 전에 받은 동의가
--  구별되지 않는다.
--
--  **개인정보를 더 담지 않는다.** 누가 동의했는지는 `user_id` 하나로
--  충분하고, IP 와 User-Agent 는 담지 않는다: 분쟁에 쓰이는 것은
--  '어느 판에 동의했는가' 이고, 그 둘은 그 질문에 답하지 않으면서
--  파기 대상만 늘린다.
-- ============================================================

CREATE TABLE IF NOT EXISTS consent_documents (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT NOT NULL,            -- terms | privacy | marketing | third_party
  version     TEXT NOT NULL,            -- 'v1.0'. 고칠 때마다 올린다
  locale      CHAR(2) NOT NULL,         -- ko | en
  title       TEXT NOT NULL,
  body_path   TEXT,                     -- 본문이 사는 파일. 표에 본문을 담지 않는다
  required    BOOLEAN NOT NULL DEFAULT true,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at  TIMESTAMPTZ,
  UNIQUE (kind, version, locale)
);

COMMENT ON TABLE consent_documents IS
  '동의문·약관의 판. **본문을 표에 담지 않는다**: 본문은 파일에 있고
   여기는 어느 판이 언제부터 유효한지를 적는다';

DO $$ BEGIN
  ALTER TABLE consent_documents ADD CONSTRAINT consent_documents_kind_chk
    CHECK (kind IN ('terms', 'privacy', 'marketing', 'third_party'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS consent_records (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id BIGINT NOT NULL REFERENCES consent_documents(id),
  site_id     TEXT REFERENCES site_configs(site_id),
  agreed      BOOLEAN NOT NULL,
  agreed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ
);

COMMENT ON TABLE consent_records IS
  '누가 어느 판에 동의했는가. **지우지 않고 철회 시각을 적는다**:
   동의한 사실과 철회한 사실이 둘 다 남아야 쓸 수 있다.
   **IP 와 User-Agent 는 담지 않는다**: 분쟁에 쓰이지 않으면서 파기
   대상만 늘린다';

-- 같은 사람이 같은 판에 두 번 동의하지 않는다. 철회한 뒤 다시 동의하면
-- 철회 시각을 비우고 동의 시각을 올린다(줄을 늘리지 않는다)
CREATE UNIQUE INDEX IF NOT EXISTS consent_records_once_idx
  ON consent_records(user_id, document_id);

CREATE INDEX IF NOT EXISTS consent_records_user_idx
  ON consent_records(user_id, agreed_at DESC);
