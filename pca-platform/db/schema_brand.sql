-- ============================================================
--  제휴 입구 (2026-10-30 · 잡인더스트리 AI취업지원도우미)
--
--  **잡인더스트리에서 MAT 으로 넘어온 사람을 센다.** 잡인더스트리 사이트의
--  단추가 `app.careermatri.com/from/jobindustry` 로 보내고, 그 길로 들어온
--  사람이 가입하거나 작업공간을 열면 여기 한 줄이 선다. 결제·채점·결과에는
--  들어가지 않는다. 어느 입구가 사람을 데려오는지 보는 자리다.
--
--  **표를 따로 둔다.** `users` 에 칸을 더하면, 이 파일을 올리기 전의 운영 DB
--  에서 가입이 그 칸을 찾다가 멈춘다. 따로 둔 표는 쓰는 쪽이 실패를 삼키므로
--  이 파일을 올리기 전에도 가입과 MAT 이 그대로 돈다.
--
--  **한 사람이 한 입구에 한 줄이다.** 처음 들어온 때와 마지막으로 본 때만
--  적는다. 이름도 주소도 담지 않으므로 탈퇴해도 지우지 않는다(사람이 지워진
--  뒤에는 어느 입구 숫자 하나로만 남는다, `erasure.ts` LEFT_AS_IS).
-- ============================================================

CREATE TABLE IF NOT EXISTS brand_touches (
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand          TEXT NOT NULL CHECK (brand IN ('jobindustry', 'careerpeak')),
  first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand)
);

CREATE INDEX IF NOT EXISTS brand_touches_brand_idx ON brand_touches(brand, first_seen_at DESC);

COMMENT ON TABLE brand_touches IS
  '제휴 입구(잡인더스트리 등)로 들어온 사람. 결제·채점에 들어가지 않는다';
