-- ============================================================
--  문의와 출시 알림 신청 (2026-10-30 작업지시서 1단계 4 · 2단계 2-1)
--
--  **한 표에 둘을 받는다.** 홈페이지의 도입 문의와 가격 옆의 `출시 알림
--  신청` 은 둘 다 "연락해 달라는 사람" 이고, 결제가 열리는 날 알림 명단에
--  보낼 메일과 문의 회신은 같은 사람이 같은 화면에서 본다. 표를 둘로 두면
--  같은 사람이 두 번 세어지고 개인정보를 지울 자리도 둘이 된다.
--
--  **전에는 문의가 남지 않았다.** `/contact` 가 메일 앱을 여는 방식이라
--  웹메일을 쓰는 사람은 거기서 나갔고, 보낸 사람도 기록이 없었다.
--
--  **개인정보는 필요한 만큼만 받고 기한을 박는다.** 받는 자리에서
--  `purge_after` 를 적고, 지나면 지운다. 동의 시각이 없으면 줄이 서지 않는다.
-- ============================================================

CREATE TABLE IF NOT EXISTS inquiries (
  id            BIGSERIAL PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('contact', 'launch_notify')),
  /* 문의 유형. 화면의 보기와 같은 이름이다(`src/lib/inquiry.ts`) */
  topic         TEXT CHECK (topic IS NULL OR topic IN
                  ('univ', 'dept', 'grad', 'rise', 'personal', 'mat', 'partner')),
  org_name      TEXT,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 200),
  headcount     TEXT,
  timing        TEXT,
  message       TEXT CHECK (message IS NULL OR length(message) <= 4000),
  /* 출시 알림이면 어느 상품의 결제가 열리길 기다리는가 */
  product_code  TEXT,
  lang          TEXT,
  /* 어디서 왔는가: `www:/ko/contact` · `app:/pricing` 같은 짧은 표시 */
  source        TEXT,
  source_brand  TEXT NOT NULL DEFAULT 'careermatri'
                CHECK (source_brand IN ('careermatri', 'jobindustry', 'careerpeak')),
  consent_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* 담당자 알림 메일을 보낸 때. 못 보냈으면 비어 있고 운영 화면이 센다 */
  alerted_at    TIMESTAMPTZ,
  /* 결제가 열려 안내 메일을 보낸 때(출시 알림) */
  launch_mailed_at TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'answered', 'closed')),
  purge_after   DATE NOT NULL DEFAULT (now() + interval '3 years')::date
);

CREATE INDEX IF NOT EXISTS inquiries_kind_idx ON inquiries(kind, created_at DESC);

/* **같은 사람이 같은 상품 알림을 두 번 신청해도 한 줄이다.** 알림 메일이 두
   통 가면 받는 사람은 스팸으로 읽는다. 읽고 나서 쓰는 검사로는 동시 요청을
   막을 수 없어 제약으로 둔다 */
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_notify_uniq
  ON inquiries(lower(email), COALESCE(product_code, ''))
  WHERE kind = 'launch_notify';

COMMENT ON TABLE inquiries IS
  '도입 문의와 출시 알림 신청. 개인정보는 purge_after 가 지나면 지운다';
