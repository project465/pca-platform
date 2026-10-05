-- ============================================================
--  Phase 2.3 — 런칭 가격과 운영 설정
--
--  **여섯 번째로 적용한다** (schema.sql → schema_metri.sql →
--  schema_platform.sql → schema_phase2.sql → schema_phase2_1.sql →
--  schema_phase2_2.sql → 이 파일).
-- ============================================================


-- ============================================================
--  1. 승인된 런칭 가격
--
--  사업 결정이 끝났다. **가격 정본은 `products` 하나다**: 여기 적고
--  화면과 주문과 검사가 전부 그 표를 읽는다. 새 표를 만들면 가격을
--  정하는 자리가 둘이 되고, 그중 하나는 반드시 뒤처진다(설계 원칙 10).
--
--  **금액은 통화의 최소 단위다**(`src/lib/money.ts`).
--
--    KRW 14900  →  ₩14,900   (KRW 는 쪼개지지 않는다)
--    USD  1499  →  $14.99    (USD 는 백 조각)
--
--  $14.99 를 14.99 로 적으면 `amount` 가 INTEGER 라 14 로 잘린다.
--  한국만 팔 때는 이 차이가 안 보이고, 글로벌을 여는 날 드러난다.
--
--  **BASIC 의 0 은 승인된 무료다.** 값을 못 정한 것이 아니라 0 으로
--  정한 것이고, 그래서 `price_status = 'approved'` 다. 이 둘을 가르는
--  것이 `priceState()` 의 `FREE_APPROVED` 와 `PRICE_NOT_APPROVED` 다.
-- ============================================================

UPDATE products SET amount = 0,     currency = 'KRW', price_status = 'approved'
  WHERE code = 'ME_V2_BASIC_KR';
UPDATE products SET amount = 14900, currency = 'KRW', price_status = 'approved'
  WHERE code = 'ME_V2_STANDARD_KR';
UPDATE products SET amount = 21900, currency = 'KRW', price_status = 'approved'
  WHERE code = 'ME_V2_PRO_KR';

UPDATE products SET amount = 0,    currency = 'USD', price_status = 'approved'
  WHERE code = 'ME_V2_BASIC_GL';
UPDATE products SET amount = 1499, currency = 'USD', price_status = 'approved'
  WHERE code = 'ME_V2_STANDARD_GL';
UPDATE products SET amount = 2499, currency = 'USD', price_status = 'approved'
  WHERE code = 'ME_V2_PRO_GL';

COMMENT ON COLUMN products.amount IS
  '**통화의 최소 단위 정수다**(src/lib/money.ts). KRW 14900 = ₩14,900,
   USD 1499 = $14.99. 소수로 두면 더하고 나눌 때 끝자리가 흔들리고,
   흔들린 값이 결제 금액이 된다';


-- ============================================================
--  2. 무료 이용권을 한 사람이 한 번만 받는다
--
--  BASIC 은 결제를 거치지 않으므로 **중복을 막는 것이 코드가 아니라
--  DB 여야 한다.** 화면에서 두 번 눌리는 것은 막을 수 있어도, 두 요청이
--  같은 순간에 들어오면 코드의 if 는 둘 다 통과한다.
--
--  주문 번호를 사람과 상품으로 정해 두면(`FREE-<user>-<code>`) 유일
--  제약이 그 자리에서 두 번째를 거절한다. 거절된 쪽은 이미 있는 주문을
--  다시 읽어 그 이용권으로 간다.
--
--  **한 사람이 같은 무료 상품을 다시 받지 못하는 것도 일부러다.** 좌석이
--  늘면 같은 사람의 응답이 두 벌 쌓여 규준이 오염된다.
-- ============================================================

-- `orders_order_no_key` 가 이미 UNIQUE 다. 여기서는 뜻만 적어 둔다.
COMMENT ON COLUMN orders.order_no IS
  '사람이 읽고 문의에 적는 번호. **무료 주문은 번호가 정해져 있다**:
   FREE-<user_id>-<product_code> 라서 두 번 눌러도 주문이 하나다';


-- ============================================================
--  3. 운영 설정 — 사업자 정보를 배포 없이 넣는다
--
--  전자상거래법 제10조 표시는 **사업자가 직접 넣어야 하는 값**이고,
--  그때마다 배포를 하게 두면 런칭이 개발 일정에 묶인다. 그래서 운영
--  화면에서 넣는다.
--
--  **읽는 자리는 하나다**(`src/lib/business.ts`): 이 표에 값이 있으면
--  그것을, 없으면 환경변수를, 둘 다 없으면 비어 있다고 말한다. 두 곳을
--  각각 읽으면 화면과 검사가 다른 답을 낸다.
--
--  **비밀은 여기 담지 않는다.** 결제 열쇠와 메일 비밀번호는 환경변수에
--  남는다: 운영 화면에서 고칠 수 있게 두면 그 화면이 열쇠 보관함이 된다.
-- ============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  BIGINT REFERENCES users(id)
);

COMMENT ON TABLE site_settings IS
  '사업자 표시처럼 사업자가 직접 넣는 값. **비밀은 담지 않는다** —
   결제 열쇠와 메일 비밀번호는 환경변수에 남는다';


-- ============================================================
--  4. 도메인 소유 확인
--
--  **DNS 가 어디를 가리키는지와 도메인이 누구 것인지는 다른 문제다.**
--  남의 IP 가 응답한다는 것만으로 '제3자 소유' 라고 적어 두었다가
--  틀렸다(`careermatri.com` 은 우리 것이다). 조회로 알 수 있는 것과
--  사람이 확인해 주는 것을 칸으로 가른다.
--
--    ownership = 'confirmed'    소유자가 확인해 주었다
--    ownership = 'unconfirmed'  아직 확인되지 않았다
--
--  소유가 확인돼도 **켤 수 있는 것은 아니다.** DNS 가 운영을 가리키는지,
--  인증서가 정상인지, www 리디렉션과 정규 주소가 맞는지는 배포한 뒤에
--  실제로 열어 봐야 안다(`npm run domains:verify`).
-- ============================================================

ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS ownership TEXT NOT NULL
  DEFAULT 'unconfirmed';

DO $$ BEGIN
  ALTER TABLE site_configs ADD CONSTRAINT site_configs_ownership_chk
    CHECK (ownership IN ('confirmed', 'unconfirmed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

/* 정규 주소. **코드에 적지 않는다**: 메일 링크와 결제 콜백과 결과지
   주소가 전부 이 값을 읽는다 */
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS canonical_url TEXT;

COMMENT ON COLUMN site_configs.ownership IS
  '소유자가 확인해 주었는가. **DNS 조회로 정하지 않는다** — 지금 누가
   그 주소로 서버를 띄워 두었는지와 도메인이 누구 것인지는 별개다';

COMMENT ON COLUMN site_configs.canonical_url IS
  '정규 주소. 메일 링크·결제 콜백·결과지 주소가 이 값을 읽는다';

UPDATE site_configs SET ownership = 'confirmed',
                        canonical_url = 'https://careermatri.com'
  WHERE domain = 'careermatri.com';

/* 한국 도메인은 아직 확인되지 않았다. **소유자가 말해 주기 전까지
   확인됐다고 적지 않는다** */
UPDATE site_configs SET canonical_url = 'https://careermatri.co.kr'
  WHERE domain = 'careermatri.co.kr' AND canonical_url IS NULL;
