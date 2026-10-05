-- 시연 자료와 운영 지표를 가른다.
--
-- 운영 첫 화면이 '가입 48 · 매출 107,499원' 을 적고 있었는데 그 가운데
-- 한 줄도 손님이 아니었다. 전부 시드와 검사 스크립트가 만든 줄이다.
-- **첫 손님이 들어온 날 그 한 사람이 48명 뒤에 숨는다.**
--
-- 그래서 사람에게 칸을 하나 붙이고, 지표를 내는 자리는 전부 그 칸을
-- 거른다. **지우지 않는 까닭**은 시연 자료가 화면을 눌러 보는 데 계속
-- 필요하고, 지우면 `db:demo` 를 다시 돌려야 하기 때문이다.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS users_is_demo_idx ON users (is_demo) WHERE is_demo;

-- **규칙을 사람 손에 맡기지 않는다.**
--
-- 사용자를 만드는 스크립트가 스무 개가 넘는다. 거기에 한 줄씩 적어 두면
-- 다음에 더하는 스크립트가 반드시 빠뜨리고, 그날부터 시연 자료가 운영
-- 지표에 섞인다. 들어올 때 한 번 보는 것이 싸다.
--
-- 보는 것은 **예약된 시험용 도메인(RFC 2606)과 시드가 찍는 아이디**뿐이다.
-- 진짜 손님의 주소가 여기 걸릴 수 없다: `example.com` · `example.test` ·
-- `.local` 은 인터넷에서 메일이 오가지 않는 이름이다.
CREATE OR REPLACE FUNCTION mark_demo_user() RETURNS trigger AS $$
BEGIN
  IF NEW.is_demo IS NOT TRUE THEN
    NEW.is_demo := (
         COALESCE(NEW.email, '') ~* '@example\.(test|com|org|net)$'
      OR COALESCE(NEW.email, '') ~* '\.local$'
      OR COALESCE(NEW.login_id, '') ~ '^demo-'
      OR COALESCE(NEW.login_id, '') IN ('admin', 'me-admin', '2021001234')
    );
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_mark_demo ON users;
CREATE TRIGGER users_mark_demo
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION mark_demo_user();

-- 이미 들어와 있는 줄에 같은 규칙을 한 번 돌린다.
UPDATE users SET is_demo = true
 WHERE is_demo = false
   AND (
        COALESCE(email, '') ~* '@example\.(test|com|org|net)$'
     OR COALESCE(email, '') ~* '\.local$'
     OR COALESCE(login_id, '') ~ '^demo-'
     OR COALESCE(login_id, '') IN ('admin', 'me-admin', '2021001234')
     -- 기수 시드가 만든 학번 계정(이메일 없이 학번만 있는 줄)
     OR (email IS NULL AND COALESCE(login_id, '') ~ '^[0-9]{8,}$')
   );

-- 기관도 같은 규칙으로 가른다.
--
-- **이름으로 가리지 않는다.** '한양대학교' 가 시드인지 손님인지는 이름이
-- 말해 주지 않는다. 대신 **그 기관에 붙은 사람이 전부 시연이면 그 기관도
-- 시연이다**: 자료가 스스로 말하게 둔다.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- **사람이 하나도 없는 기관도 시연이다.** 손님 기관에는 계약을 맺은
-- 담당자 계정이 반드시 하나는 있다. 비어 있는 기관은 시드가 자리만 잡아
-- 둔 줄이고, 그 줄이 '활성 기관 1' 로 세어지면 첫 계약이 들어온 날 그
-- 계약이 숫자 뒤에 숨는다.
UPDATE organizations o SET is_demo = true
 WHERE o.is_demo = false
   AND NOT EXISTS (
     SELECT 1 FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.org_id = o.id AND NOT u.is_demo);
