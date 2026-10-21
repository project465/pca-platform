-- ============================================================
--  AI 취업비서 — 알림 · 붙여 넣은 공고 · 경험 초안
--
--  `CareerMatri Track` 기간권(`schema_track.sql`)이 여는 기능 셋을 받는
--  자리다. **권한 표를 새로 만들지 않는다**: 열려 있는가는 여전히
--  `entitlements.kind = 'track'` 한 줄이 답한다(설계 원칙 10).
--
--  **점수에 들어가지 않는다**(설계 원칙 6). 여기 쌓이는 것은 알림과
--  사용자가 붙여 넣은 공고와 그 공고를 읽은 결과, 그리고 아직 저장하지
--  않은 경험 초안이다. 채점과 결과 모델은 이 표를 하나도 읽지 않는다.
--
--  **붙여 넣은 글은 기한이 지나면 지운다.** 공고 본문과 경험 메모에는
--  사람을 좁히는 말이 섞일 수 있다. `purge_after` 가 지나면 밤 당번이
--  본문만 비우고 읽은 결과의 뼈대(영역 코드와 수)는 남긴다.
--
--  **알림은 앱 안이 먼저다.** 메일은 자격증명이 붙어 있을 때만 나가고,
--  메일 줄에는 본문을 담지 않는다(`outbox` 의 규칙 그대로).
-- ============================================================

CREATE TABLE IF NOT EXISTS assistant_settings (
  user_id       BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  /* 붙여 넣은 글을 Claude 로 읽어도 된다고 한 때. 비어 있으면 규칙으로만
     읽는다. **화면이 켜 두지 않는다**: 사람이 직접 눌러야 생긴다 */
  ai_consent_at TIMESTAMPTZ,
  /* 주간 정리를 메일로도 받을지. 앱 안 알림은 늘 쌓인다 */
  email_digest  BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assistant_nudges (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  core_code    TEXT,
  kind         TEXT NOT NULL CHECK (kind IN (
                 'weekly',     -- 이번 주에 할 일 하나
                 'deadline',   -- 붙여 둔 공고의 마감이 다가온다
                 'gap',        -- 오래 비어 있는 자리
                 'welcome'     -- 처음 열었을 때 한 번
               )),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  href         TEXT,
  /* 같은 일로 두 번 쌓이지 않게. 예: `weekly:2026-W43` */
  dedupe_key   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at      TIMESTAMPTZ,
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS assistant_nudges_open_idx
  ON assistant_nudges (user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS assistant_postings (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  core_code    TEXT NOT NULL,
  /* 사용자가 붙인 이름. 기업 이름을 받을 수 있지만 **우리가 기업을
     고르지 않는다**: 직업정보제공사업 범위 안이다(CLAUDE.md 법적 범위) */
  label        TEXT NOT NULL,
  deadline     DATE,
  raw_text     TEXT,
  /* 읽은 결과. 요구 항목과 그것이 걸리는 영역 코드와 축 코드 */
  analysis     JSONB NOT NULL DEFAULT '{}'::jsonb,
  analyzed_by  TEXT NOT NULL CHECK (analyzed_by IN ('claude', 'rules')),
  model        TEXT,
  state        TEXT NOT NULL DEFAULT 'watching'
                 CHECK (state IN ('watching', 'applied', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  purge_after  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 year'
);
CREATE INDEX IF NOT EXISTS assistant_postings_user_idx
  ON assistant_postings (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS assistant_drafts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  core_code    TEXT NOT NULL,
  /* 적어 주신 메모. 저장한 경험이 되면 비운다 */
  note_text    TEXT,
  /* 고른 보기 묶음. **전부 그 Core 의 체크리스트에 있는 문장이다**:
     목록 밖의 말은 저장하기 전에 버린다 */
  draft        JSONB NOT NULL DEFAULT '{}'::jsonb,
  drafted_by   TEXT NOT NULL CHECK (drafted_by IN ('claude', 'rules')),
  model        TEXT,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  purge_after  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days'
);
CREATE INDEX IF NOT EXISTS assistant_drafts_user_idx
  ON assistant_drafts (user_id, created_at DESC);

--  **종류를 늘릴 때 제약도 같이 늘린다**(schema_phase2_2.sql 의 교훈).
--  코드와 제약이 갈리면 `enqueue()` 가 던지지 않아 조용히 한 통도 안
--  쌓인다.
DO $$ BEGIN
  ALTER TABLE outbox DROP CONSTRAINT IF EXISTS outbox_kind_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE outbox ADD CONSTRAINT outbox_kind_check
    CHECK (kind IN ('signup', 'report_ready', 'upgrade_done', 'code_low',
                    'purchase_done', 'refund_requested', 'refund_done',
                    'assistant_digest'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
