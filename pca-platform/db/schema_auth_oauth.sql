-- ============================================================
--  소셜 로그인 (Google · Apple)
--
--  **로그인 주체는 users 하나다**(설계 원칙 1). 구글로 들어오든 비밀번호로
--  들어오든 같은 `users` 행이고, 늘어나는 것은 **그 사람에게 붙은 로그인
--  방법**이다. 사람 표를 하나 더 만들면 같은 사람이 둘로 갈리고, 갈린 날
--  한쪽에만 주문과 응시와 결과지가 남는다.
--
--      users  ──┬── password        (password_hash · pw_login)
--               ├── auth_accounts    provider='google'
--               └── auth_accounts    provider='apple'
--
--  **지우는 줄이 없다.** 이 파일은 표 하나와 칸 하나를 더할 뿐이고,
--  이미 있는 계정은 `pw_login = true` 로 그대로 선다.
-- ============================================================

-- ── 로그인 방법 ──────────────────────────────────────────────
--
-- **열쇠를 담지 않는다.** access token 도 refresh token 도 적지 않는다.
-- 우리가 OAuth 를 쓰는 까닭은 **누구인지 확인하는 것** 하나뿐이고, 남의
-- 서비스를 대신 부를 일이 없다. 담아 두면 그 줄이 새는 날 남의 메일함이
-- 열린다. 담지 않은 것은 샐 수 없다.
--
-- `provider_account_id` 가 그 공급자의 `sub` 다. **이메일로 사람을
-- 찾지 않는다**: 이메일은 바뀌고, 애플은 가려 준 주소를 주고, 같은
-- 주소를 다른 사람이 나중에 받을 수 있다. `sub` 은 바뀌지 않는다.
CREATE TABLE IF NOT EXISTS auth_accounts (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  -- 그 공급자가 알려준 주소. **사람을 찾는 열쇠가 아니라 보여 주는 값이다**
  email               TEXT,
  -- 공급자가 그 주소를 확인했다고 말했는가. 연결 정책이 이 값을 본다
  email_verified      BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at       TIMESTAMPTZ,
  UNIQUE (provider, provider_account_id)
);
COMMENT ON TABLE auth_accounts IS
  '한 사람에게 붙은 로그인 방법. 사람 표를 나누지 않는다 (설계 원칙 1)';
COMMENT ON COLUMN auth_accounts.provider_account_id IS
  '공급자의 sub. 이메일은 바뀌지만 이것은 바뀌지 않는다';

CREATE INDEX IF NOT EXISTS idx_auth_accounts_user ON auth_accounts(user_id);

-- ── 비밀번호 로그인을 쓰는 계정인가 ──────────────────────────
--
-- `users.password_hash` 가 `NOT NULL` 이라 소셜로만 만든 계정에도 무언가
-- 들어가야 한다. 거기에는 **아무 비밀번호와도 맞지 않는 임의의 해시**를
-- 넣고, 그 사실을 이 칸이 적는다.
--
-- **칸 없이 해시 모양으로 짐작하지 않는다.** 짐작하면 `/my` 의 `로그인
-- 방법` 이 틀린 말을 하고, 비밀번호 재설정이 될 것처럼 보인다.
--
-- 기본값이 `true` 인 것이 중요하다. **이미 있는 계정은 전부 비밀번호
-- 로그인을 쓰고 있다.**
ALTER TABLE users ADD COLUMN IF NOT EXISTS pw_login BOOLEAN NOT NULL DEFAULT true;
COMMENT ON COLUMN users.pw_login IS
  '비밀번호로 들어올 수 있는 계정인가. 소셜로만 만든 계정은 false';
