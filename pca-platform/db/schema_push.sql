/* 웹 알림 구독 (2026-10-26, PWA 1단계).

   기기 하나 = 줄 하나. `endpoint` 는 브라우저 회사의 푸시 서버 주소이고
   그 자체로 사람을 가리키지는 않지만 **그 사람의 기기에 닿는 길**이라
   개인정보로 다룬다: 탈퇴하면 지우고(`erasure.ts`), 기기에서 알림을 끄면
   푸시 서버가 404 · 410 을 돌려주므로 그때 지운다(`push.ts`).

   기기 이름 · 브라우저 · IP 를 적지 않는다. 보내는 데 필요한 것은 세 칸뿐이다. */
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE CHECK (endpoint LIKE 'https://%' AND length(endpoint) <= 1000),
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_ok_at  TIMESTAMPTZ,
  fail_count  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
