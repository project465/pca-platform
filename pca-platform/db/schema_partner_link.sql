-- ============================================================
--  제휴 사이트 계정 연결 (2026-11-01 대표 결정 · 캔버스 10번 "들어오는 곳은 넷, MAT 화면은 하나")
--
--  **잡인더스트리 · 커리어피크에서 MAT 단추를 누른 사람이 다시 가입하지 않고 들어온다.**
--  제휴 서버가 파트너 API 키로 우리 서버를 부르고(서버끼리), 우리는 5분짜리 한 번 쓰는
--  로그인 링크를 돌려준다. 제휴 사이트는 사람을 그 링크로 보낸다.
--
--  **제휴마다 코드를 새로 짜지 않는다.** 키 · 정산 비율 · 넘겨받을 항목 · 허용 IP 는
--  `partner_configs` 한 줄이다. 커리어피크를 붙일 때는 줄 하나와 키 하나면 된다.
--
--  **이용권은 따로 만들지 않는다.** 어디서 들어와도 결제는 CareerMatri 에서 하고
--  `entitlements` 한 줄이 선다(`activeTrack()` 하나로 확인). 정산 표는 2단계에서
--  따로 올린다(별도 승인). 정산이 읽을 유입 표시는 `partner_links.created_at` 이다.
--
--  지키는 것
--  - **키는 해시만 둔다.** 원래 키는 만든 화면에 한 번 보이고 어디에도 남지 않는다
--  - **넘겨받은 이력서 요약은 오래 두지 않는다.** `partner_handoffs.profile` 은 동의 화면이
--    읽고 나면 비운다. 쓰지 않은 링크는 만료 뒤 지운다(`purgeHandoffs`)
--  - **같은 메일이라고 계정을 합치지 않는다.** 이미 있는 계정과는 그 계정으로 로그인한
--    뒤에만 잇는다(남의 계정을 가져가는 길을 막는다). 그래서 표에 메일 칸이 없다
--  - 회사 이름 · 연락처 · 주소 · 사진 · 생년월일은 받지 않는다(받는 항목은 `share_fields`)
--
--  **표를 따로 둔다**(`schema_brand.sql` 과 같은 까닭): 이 파일을 올리기 전에도 가입 ·
--  MAT 이 그대로 돈다. 쓰는 쪽은 표가 없으면 제휴 연결만 닫힌다.
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_configs (
  partner         TEXT PRIMARY KEY CHECK (partner IN ('jobindustry', 'careerpeak')),
  -- off: 받지 않음 · test: 시험 키만 · live: 운영 키
  status          TEXT NOT NULL DEFAULT 'off' CHECK (status IN ('off', 'test', 'live')),
  -- 정산 비율(만분율). 2000 = 20%. 아직 안 정했으면 NULL(정산 내역에 '미정'으로 선다)
  settlement_bps  INT CHECK (settlement_bps IS NULL OR settlement_bps BETWEEN 0 AND 10000),
  -- 넘겨받는 항목. 여기 없는 칸은 요청에 와도 버린다. 동의 화면이 이 목록을 그대로 보인다
  share_fields    TEXT[] NOT NULL DEFAULT '{}',
  -- 허용 IP(비어 있으면 IP 로 막지 않는다)
  ip_allowlist    CIDR[] NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      BIGINT REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE partner_configs IS
  '제휴 한 곳에 한 줄: 받는지 · 정산 비율 · 넘겨받는 항목 · 허용 IP';

-- 결정(2026-11-01): 잡인더스트리 20% · 최소 항목. 커리어피크는 방식 · 비율 미정이라 꺼 둔다.
-- **이미 있는 줄은 고치지 않는다**(운영자가 화면에서 바꾼 값을 파일이 덮지 않게)
INSERT INTO partner_configs (partner, status, settlement_bps, share_fields)
VALUES
  ('jobindustry', 'off', 2000,
   ARRAY['display_name', 'interest_jobs', 'interest_regions', 'education', 'certificates', 'career_summary']),
  ('careerpeak', 'off', NULL, '{}')
ON CONFLICT (partner) DO NOTHING;

CREATE TABLE IF NOT EXISTS partner_keys (
  id           BIGSERIAL PRIMARY KEY,
  partner      TEXT NOT NULL REFERENCES partner_configs(partner),
  env          TEXT NOT NULL CHECK (env IN ('test', 'live')),
  -- 키 앞 12자. 요청이 어느 키인지 찾는 데만 쓴다(그 자체로는 열쇠가 아니다)
  key_prefix   TEXT NOT NULL UNIQUE,
  -- 나머지의 SHA-256(hex). 원래 키는 두지 않는다
  key_hash     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS partner_keys_live_idx ON partner_keys(partner) WHERE revoked_at IS NULL;

COMMENT ON TABLE partner_keys IS
  '제휴 API 키. 해시만 둔다. 교체는 새 키를 만들고 옛 키에 revoked_at 을 적는다';

CREATE TABLE IF NOT EXISTS partner_links (
  partner           TEXT NOT NULL REFERENCES partner_configs(partner),
  -- 제휴 사이트의 회원 번호(그쪽이 정한 글자). 이름 · 메일이 아니다
  partner_user_id   TEXT NOT NULL CHECK (length(partner_user_id) BETWEEN 1 AND 120),
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 처음 연결에 동의한 때와 그때 동의한 항목
  consented_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  consented_fields  TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (partner, partner_user_id),
  -- 한 사람은 한 제휴에 한 계정만
  UNIQUE (partner, user_id)
);

CREATE INDEX IF NOT EXISTS partner_links_user_idx ON partner_links(user_id);

COMMENT ON TABLE partner_links IS
  '제휴 회원 ↔ CareerMatri 계정. 유입 표시(정산의 근거)이기도 하다';

CREATE TABLE IF NOT EXISTS partner_handoffs (
  id                BIGSERIAL PRIMARY KEY,
  partner           TEXT NOT NULL REFERENCES partner_configs(partner),
  key_id            BIGINT NOT NULL REFERENCES partner_keys(id),
  -- 링크에 실린 토큰의 SHA-256. 토큰 자체는 두지 않는다
  token_hash        TEXT NOT NULL UNIQUE,
  partner_user_id   TEXT NOT NULL CHECK (length(partner_user_id) BETWEEN 1 AND 120),
  -- 동의 화면이 보여 줄 요약(share_fields 안의 칸만). 읽고 나면 '{}' 로 비운다
  profile           JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 보고 있던 공고(제휴 쪽 공고 번호). 들어오면 이 공고와 얼마나 맞는지부터 보인다
  posting_ref       TEXT CHECK (posting_ref IS NULL OR length(posting_ref) <= 64),
  expires_at        TIMESTAMPTZ NOT NULL,
  used_at           TIMESTAMPTZ,
  user_id           BIGINT REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_handoffs_exp_idx ON partner_handoffs(expires_at) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS partner_handoffs_user_idx ON partner_handoffs(user_id) WHERE user_id IS NOT NULL;

COMMENT ON TABLE partner_handoffs IS
  '5분짜리 한 번 쓰는 로그인 링크. 이력서 요약은 동의 화면이 읽으면 비운다';

-- 같은 요청을 두 번 받지 않는다(서명이 맞아도 nonce 가 이미 있으면 거절). 10분 지난 줄은 지운다
CREATE TABLE IF NOT EXISTS partner_nonces (
  partner   TEXT NOT NULL REFERENCES partner_configs(partner),
  nonce     TEXT NOT NULL CHECK (length(nonce) BETWEEN 16 AND 64),
  seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (partner, nonce)
);

CREATE INDEX IF NOT EXISTS partner_nonces_seen_idx ON partner_nonces(seen_at);

-- 호출 기록: 누가(키) · 언제 · 어디를 · 결과. **본문 · 키 · 토큰은 적지 않는다**
CREATE TABLE IF NOT EXISTS partner_calls (
  id         BIGSERIAL PRIMARY KEY,
  partner    TEXT NOT NULL,
  key_id     BIGINT REFERENCES partner_keys(id),
  endpoint   TEXT NOT NULL,
  status     INT NOT NULL,
  -- 거절 까닭(코드 이름만: bad_signature · stale · replay · ip · off ...)
  reason     TEXT,
  ip         INET,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_calls_at_idx ON partner_calls(partner, at DESC);
