-- ============================================================
--  Phase 2.2 — 상용 런칭
--
--  **다섯 번째로 적용한다** (schema.sql → schema_metri.sql →
--  schema_platform.sql → schema_phase2.sql → schema_phase2_1.sql →
--  이 파일).
--
--  Phase 2.1 과 같은 규칙이다: 표를 늘리는 것보다 칸을 늘리는 쪽을
--  고른다. 그래도 새로 만든 표가 둘 있는데, 둘 다 **없던 사건을 적는
--  자리**이고 기존 표에 끼워 넣으면 뜻이 흐려지는 것들이다.
-- ============================================================


-- ============================================================
--  1. 환불 요청 — 판정과 집행 사이에 기록을 둔다
--
--  판정은 이미 `src/lib/refund.ts` 한 곳에서 한다. 없던 것은 **요청이
--  들어온 사건**이다. 요청을 적지 않으면
--
--    - 요청한 사람은 자기 요청이 접수됐는지 알 수 없고
--    - 운영자는 어제 무엇을 거절했는지 알 수 없고
--    - 거절한 까닭을 나중에 설명할 수 없다
--
--  **판정을 요청 시점에 박아 둔다.** 응시 상태와 결과지 상태는 시간이
--  지나면 바뀐다. 요청한 다음 날 응시를 시작했다고 해서 어제의 '응시 전
--  환불' 이 사라지면 안 된다. 그래서 그때의 판정을 값으로 적는다.
-- ============================================================

CREATE TABLE IF NOT EXISTS refund_requests (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES orders(id),
  user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  /* 왜 돌려달라는가. **자유입력을 받지 않는다** — 아래 설명 참고 */
  reason_code   TEXT NOT NULL CHECK (reason_code IN
                  ('changed_mind', 'not_as_expected', 'cannot_use',
                   'duplicate', 'other')),

  /* 요청이 들어온 그 순간의 사실. 뒤에 바뀌어도 이 값은 그대로다 */
  attempt_state TEXT,              -- none | progress | submitted
  report_state  TEXT,              -- none | generated | viewed
  verdict_ok    BOOLEAN NOT NULL,  -- 그때 규칙으로 돌려줄 수 있었는가
  verdict_code  TEXT NOT NULL,     -- before_start | started | viewed | ...
  verdict_amount INTEGER NOT NULL DEFAULT 0,

  /* 처리 */
  status        TEXT NOT NULL DEFAULT 'requested' CHECK (status IN
                  ('requested', 'approved', 'denied', 'refunded', 'withdrawn')),
  decided_at    TIMESTAMPTZ,
  decided_by    BIGINT REFERENCES users(id),
  /* 대행사가 실제로 돌려보낸 건의 번호. 심사 전까지는 비어 있다 */
  provider_refund_id TEXT,
  refund_id     BIGINT REFERENCES refunds(id)
);

CREATE INDEX IF NOT EXISTS refund_requests_open_idx
  ON refund_requests(requested_at DESC) WHERE status = 'requested';
CREATE INDEX IF NOT EXISTS refund_requests_order_idx
  ON refund_requests(order_id, requested_at DESC);

/* **같은 주문에 열린 요청이 둘 있으면 안 된다.** 두 번 눌러 두 건이
   쌓이면 한 건을 승인하고 다른 건을 또 승인해 두 번 돌려줄 수 있다 */
CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_one_open_idx
  ON refund_requests(order_id) WHERE status IN ('requested', 'approved');

COMMENT ON TABLE refund_requests IS
  '환불 요청과 그때의 판정. 거래 기록이라 5년 남는다(전자상거래법 제6조)';

COMMENT ON COLUMN refund_requests.reason_code IS
  '**자유입력을 담지 않는다.** 환불 사유에 사람이 사정을 적으면 그 칸이
   개인 서술이 되고, 거래 기록으로 5년 남는 표에 그것을 담으면 파기가
   반쪽이 된다(erasure_log 와 같은 규칙). 자세한 사정은 지원 메일로
   오고, 메일은 우리 DB 가 아니다';

COMMENT ON COLUMN refund_requests.verdict_ok IS
  '요청 시점의 판정을 박아 둔다. 상태는 뒤에 바뀌지만 그때의 권리는
   바뀌지 않는다';


-- ============================================================
--  2. 퍼널 — 표는 이미 있었고 아무도 쓰지 않았다
--
--  `analytics_events` 가 schema_platform.sql 에 있는데 적는 코드가 없다.
--  그래서 **방문이 결제가 되는 비율을 아무도 모른다.** 파는 쪽에서 그
--  비율을 모르면 고칠 자리를 고를 수 없다.
--
--  늘어난 칸은 하나다: 로그인 전 사람을 세는 열쇠.
-- ============================================================

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS anon_id TEXT;

COMMENT ON COLUMN analytics_events.anon_id IS
  '로그인 전 방문을 세는 임의 문자열. 쿠키 한 개이고 사람과 이어지지
   않는다. **IP 와 User-Agent 를 적지 않는다** — 그 둘이 붙으면 이 칸이
   개인정보가 된다';

CREATE INDEX IF NOT EXISTS analytics_events_anon_idx
  ON analytics_events(anon_id, created_at DESC) WHERE anon_id IS NOT NULL;


-- ============================================================
--  3. 파일럿 — 만족도만 재지 않는다
--
--  이미 있는 `survey_items` 는 기관 성과지표(정주·인지·만족도)용이고
--  5점 척도만 받는다. 파일럿이 묻는 것은 다르다: **이해했는가, 얼마면
--  내겠는가, 어디가 헷갈렸는가.** 뒤의 둘은 숫자가 아니다.
--
--  그래서 따로 둔다. 척도 칸에 자유입력을 끼워 넣으면 그 표를 읽는
--  기관 리포트 집계가 깨진다.
-- ============================================================

CREATE TABLE IF NOT EXISTS pilot_feedback (
  id          BIGSERIAL PRIMARY KEY,
  attempt_id  BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  item_code   TEXT NOT NULL,
  /* 척도 문항이면 1~5, 자유입력이면 NULL */
  value       SMALLINT CHECK (value BETWEEN 1 AND 5),
  /* 자유입력. **파기 대상이다** (src/lib/erasure.ts 의 REMOVE 목록) */
  text        TEXT,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, item_code)
);

CREATE INDEX IF NOT EXISTS pilot_feedback_item_idx
  ON pilot_feedback(item_code, answered_at DESC);

COMMENT ON TABLE pilot_feedback IS
  '20~50명 통제 파일럿의 응답. 채점에 들어가지 않는다. 자유입력이 섞여
   있어 파기 때 지운다';


-- ============================================================
--  4. 사고를 한 자리에서 본다 — 종류를 늘린다
--
--  `job_failures` 는 결과지·PDF 생성이 깨진 것을 적고 있었다. 런칭에
--  필요한 종류가 더 있다: 결제 확정, 이용권 발급, 메일 발송.
--
--  **표를 더 만들지 않는다.** 사고를 보는 자리가 둘이 되면 운영자가 한
--  자리만 보고 다른 쪽을 놓친다.
-- ============================================================

DO $$ BEGIN
  ALTER TABLE job_failures DROP CONSTRAINT IF EXISTS job_failures_kind_chk;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE job_failures ADD CONSTRAINT job_failures_kind_chk
    CHECK (kind IN ('result', 'pdf', 'mail', 'payment', 'entitlement', 'webhook'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN job_failures.kind IS
  'result · pdf · mail · payment · entitlement · webhook.
   **로그에만 두지 않는다** — 운영 화면이 이 표를 읽는다';


-- ============================================================
--  5. 파일럿 문항 — 받은 규격 열 개 그대로
--
--  규격 §20 의 열 문항이다. **고쳐 쓰지 않았다.** 물음을 바꾸면 다른
--  것을 재게 되고, 그러면 파일럿 결과를 규격과 견줄 수 없다.
-- ============================================================

CREATE TABLE IF NOT EXISTS pilot_items (
  code     TEXT PRIMARY KEY,
  order_no INTEGER NOT NULL,
  /* scale(1~5) | text(자유입력) | choice */
  kind     TEXT NOT NULL CHECK (kind IN ('scale', 'text')),
  ko       TEXT NOT NULL,
  en       TEXT NOT NULL,
  active   BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO pilot_items (code, order_no, kind, ko, en) VALUES
  ('P01_PATHS',     1,  'text',
   '먼저 살펴봐야 할 경로는 무엇이었습니까?',
   'Which career paths should you explore first?'),
  ('P02_GAP',       2,  'text',
   '가장 큰 증거 공백은 무엇이었습니까?',
   'What is your biggest evidence gap?'),
  ('P03_NEXT',      3,  'text',
   '다음에 무엇을 하시겠습니까?',
   'What should you do next?'),
  ('P04_CLARITY',   4,  'scale',
   '결과지가 진로 결정을 분명하게 했습니까?',
   'Did the report clarify your career decision?'),
  ('P05_USEFUL',    5,  'text',
   '어느 부분이 가장 쓸모 있었습니까?',
   'Which part was most useful?'),
  ('P06_CONFUSING', 6,  'text',
   '어느 부분이 헷갈렸습니까?',
   'Which part was confusing?'),
  ('P07_WTP',       7,  'scale',
   '이 결과지에 값을 내시겠습니까?',
   'Would you pay for this?'),
  ('P08_PRICE',     8,  'text',
   '얼마면 알맞다고 느끼십니까?',
   'What price feels reasonable?'),
  ('P09_RECOMMEND', 9,  'scale',
   '남에게 권하시겠습니까?',
   'Would you recommend it?'),
  ('P10_AGAIN',    10,  'text',
   '다시 쓰게 하려면 무엇이 있어야 합니까?',
   'What would make you use it again?')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE pilot_items IS
  '받은 규격 §20 의 열 문항. **만족도 하나만 재지 않는다** — 이해·
   다음 행동·지불의향을 따로 묻는다';


-- ============================================================
--  6. 메일 주소 확인 — 보낼 수 있는 주소인지 먼저 안다
--
--  규격 §14 가 요구하는 여섯 통 가운데 하나다. 지금은 가입할 때 받은
--  주소가 실제로 닿는지 **아무도 모른다.** 결과지가 준비됐다는 메일이
--  오타 난 주소로 나가면, 산 사람은 기다리고 우리는 보냈다고 생각한다.
--
--  **응시를 막지 않는다.** 확인 안 된 주소로도 응시와 결과지가 그대로
--  나간다(규격 §16: 메일 실패가 제품 접근을 막지 않는다). 확인은
--  **연락이 닿는지**를 아는 일이고, 산 것을 주지 않는 근거가 아니다.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN users.email_verified_at IS
  '주소가 닿는 것을 확인한 때. **응시·결과지를 막는 값이 아니다**';

CREATE TABLE IF NOT EXISTS email_verify_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  /* **원문을 저장하지 않는다.** 임시 비밀번호와 같은 규칙이다: DB 가
     새어도 그것만으로 남의 계정이 되지 않아야 한다 */
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_verify_open_idx
  ON email_verify_tokens(user_id) WHERE used_at IS NULL;

COMMENT ON TABLE email_verify_tokens IS
  '메일 확인 링크. 해시만 남긴다. 파기 때 지운다(erasure.ts REMOVE)';


-- ============================================================
--  7. 사고를 사람이 봤다는 기록
--
--  **지우지 않고 처리한 사람을 적는다.** 지우면 "어제 그거 누가 봤느냐" 에
--  답할 수 없고, 같은 사고가 다시 났을 때 앞의 것을 못 찾는다.
-- ============================================================

ALTER TABLE job_failures ADD COLUMN IF NOT EXISTS resolved_by BIGINT
  REFERENCES users(id);

COMMENT ON COLUMN job_failures.resolved_by IS
  '처리했다고 적은 사람. **지우는 대신 적는다**';


-- ============================================================
--  8. 거래 메일 세 가지가 더 생긴다
--
--  규격 §14 가 요구하는 여섯 통 가운데 결제 확인 · 환불 접수 · 환불 처리
--  가 없었다. 그런데 `outbox.kind` 에 CHECK 가 걸려 있어서, 코드에서
--  종류를 늘려도 **INSERT 가 조용히 거절됐다**: `enqueue()` 는 실패해도
--  던지지 않으므로(돈길에 메일을 끼우지 않으려고 그렇게 두었다) 아무
--  표시 없이 한 통도 쌓이지 않았다. 런칭 E2E 가 그것을 잡았다.
--
--  **종류를 늘릴 때 제약도 같이 늘린다.** 코드와 제약이 갈리면 조용히
--  안 되는 쪽으로 갈린다.
-- ============================================================

DO $$ BEGIN
  ALTER TABLE outbox DROP CONSTRAINT IF EXISTS outbox_kind_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE outbox ADD CONSTRAINT outbox_kind_check
    CHECK (kind IN ('signup', 'report_ready', 'upgrade_done', 'code_low',
                    'purchase_done', 'refund_requested', 'refund_done'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN outbox.kind IS
  '거래 메일 종류. **열쇠가 들어가는 메일은 여기 없다**: 비밀번호 재설정과
   주소 확인은 링크에 한 번 쓰는 열쇠가 있어서 표에 적지 않고
   `outbox.sendNow()` 로 그 자리에서 보낸다';
