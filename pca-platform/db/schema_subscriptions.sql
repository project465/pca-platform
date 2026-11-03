-- ============================================================
--  MAT 정기결제 (2026-11-03 수익화 E-5, /legal/subscription 규정 그대로)
--
--  - subscriptions: 한 사람의 자동 갱신 이용권 한 줄(플랜 · 주기 · 상태 · 다음 결제일 · 결제사 · 동의한 금액)
--  - subscription_charges: 결제 시도 한 번 한 줄(첫 결제 · 갱신 · 다시 시도). 같은 회차 같은 시도는 한 줄뿐
--  - subscription_notices: 보낸 안내(7일 전 · 결제됨 · 실패 · 멈춤 · 금액 변경 · 해지 · 학교 이용권 끝남)
--  - orders 에 칸 셋: 어느 정기결제의 회차인가 · 유입 경로 · 들어온 공고
--
--  **카드 번호를 두지 않는다.** 결제사가 준 빌링키 · 구독 번호(provider_ref)만 둔다.
--  **더하기만 한다.** 새 표 셋과 orders 의 칸 셋이다.
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL CHECK (plan IN ('basic', 'research')),
  period_days         INTEGER NOT NULL CHECK (period_days IN (30, 90)),
  /* pending = 첫 결제 전 · active · canceled = 해지(남은 기간은 쓴다) · past_due = 결제 실패, 다시 시도 중
     · paused = 세 번 다시 시도해도 실패해서 멈춤 · ended = 해지 뒤 기간이 끝남 */
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'active', 'canceled', 'past_due', 'paused', 'ended')),
  current_period_end  TIMESTAMPTZ,
  next_charge_at      TIMESTAMPTZ,
  provider            TEXT NOT NULL CHECK (provider IN ('mock', 'kcp', 'paddle')),
  /* KCP: PortOne 빌링키 · Paddle: 구독 번호. 카드 번호가 아니다 */
  provider_ref        TEXT,
  /* 고객이 동의한 회차 금액(통화의 최소 단위). 바뀐 금액에 다시 동의하기 전에는 이 값으로만 결제한다 */
  consented_price     INTEGER NOT NULL CHECK (consented_price > 0),
  consented_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* 금액 변경: 새 금액 · 적용일(알림 + 30일 이후) · 알린 때. 다시 동의하면 consented_price 로 옮긴다 */
  pending_price       INTEGER CHECK (pending_price IS NULL OR pending_price > 0),
  price_change_at     TIMESTAMPTZ,
  price_notice_at     TIMESTAMPTZ,
  country             TEXT CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  currency            CHAR(3) NOT NULL,
  source              TEXT,
  posting_idx         TEXT,
  retry_count         INTEGER NOT NULL DEFAULT 0,
  cancel_reason       TEXT,
  canceled_at         TIMESTAMPTZ,
  paused_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
/* 살아 있는 정기결제는 한 사람에 하나 */
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_live_uniq ON subscriptions (user_id)
  WHERE status IN ('pending', 'active', 'past_due');
CREATE INDEX IF NOT EXISTS subscriptions_due_idx ON subscriptions (status, next_charge_at);

CREATE TABLE IF NOT EXISTS subscription_charges (
  id                  BIGSERIAL PRIMARY KEY,
  subscription_id     BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  /* 몇 번째 회차인가(첫 결제 = 1) · 그 회차의 몇 번째 시도인가(갱신 = 1, 다시 시도 = 2~4) */
  cycle_no            INTEGER NOT NULL,
  attempt_no          INTEGER NOT NULL DEFAULT 1,
  kind                TEXT NOT NULL CHECK (kind IN ('first', 'renewal', 'retry', 'resume')),
  amount              INTEGER NOT NULL,
  currency            CHAR(3) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  order_id            BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  provider_payment_id TEXT,
  error               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, cycle_no, attempt_no)
);

CREATE TABLE IF NOT EXISTS subscription_notices (
  id                  BIGSERIAL PRIMARY KEY,
  subscription_id     BIGINT REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id             BIGINT REFERENCES users(id) ON DELETE CASCADE,
  kind                TEXT NOT NULL CHECK (kind IN ('pre_renewal', 'charged', 'payment_failed', 'paused',
                        'price_change', 'canceled', 'school_ending')),
  /* 같은 일로 두 번 쌓이지 않게. 예: pre_renewal:12:2026-12-03 */
  dedupe_key          TEXT NOT NULL UNIQUE,
  /* 날짜 · 금액 같은 값만. 글 본문은 보낼 때 만든다 */
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'skipped', 'failed')),
  attempts            INTEGER NOT NULL DEFAULT 0,
  last_error          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at             TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS subscription_notices_queued_idx ON subscription_notices (created_at) WHERE status = 'queued';

/* 주문에 정기결제 회차 · 유입 경로 · 공고를 베껴 둔다(정산 · 사이트별 전환) */
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS posting_idx TEXT;
