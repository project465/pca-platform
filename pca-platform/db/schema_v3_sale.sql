/* ME_V3 개인 판매를 연다 (2026-10-25)

   홈페이지(careermatri.com)의 `검사 시작하기` 를 누른 개인이 무료 BASIC 을
   풀고, STANDARD 와 PRO 를 사서 같은 응시를 넓힐 수 있게 한다. 학교 계정은
   이 상품을 거치지 않는다(학교 응시는 늘 PRO 이고 계약이 연다).

   **값은 승인된 그대로다**: 무료 · 14,900원 · 21,900원(2026-10-05 승인,
   `schema_phase2_3.sql`). 상품 줄은 `schema_v3_pilot.sql` 이 이미 만들어
   두었고 여기서는 켜기만 한다.

   **글로벌 시장은 열지 않는다.** 해외 결제 대행사가 정해지지 않았고, 영어
   응시의 PRO 는 아직 책자를 뽑지 않는다. 해외 개인은 지금처럼 무료 기본
   검사만 연다.

   **결제를 받을 수 있는지는 여기서 정하지 않는다.** 상품이 켜져 있어도
   결제 대행사 설정이 비어 있으면 가격표가 유료 단추를 그리지 않는다
   (`payOpen`). 그래서 이 파일이 운영에 먼저 들어가도 눌러서 예외를 만나는
   단추가 생기지 않는다. */

UPDATE products SET active = true
 WHERE code IN ('ME_V3_BASIC_KR', 'ME_V3_STANDARD_KR', 'ME_V3_PRO_KR')
   AND assessment_version = 'ME_V3_2'
   AND price_status = 'approved';

/* 해외판 세 등급의 줄을 **꺼 둔 채로** 만들어 둔다 (2026-10-27).
   값은 2026-10-05 에 승인된 글로벌 값 그대로다: Free · $14.99 · $24.99
   (`schema_phase2_3.sql` 의 ME_V2 글로벌 줄과 같다). 금액은 최소 단위
   정수다(1499 = $14.99, `src/lib/money.ts`).
   **켜지 않는다.** 해외 결제 대행사가 아직 없어서 켜도 아무도 값을 낼 수
   없고, 켜는 순간 글로벌 가격표가 `무료 기본 검사만 열림` 안내 대신
   등급 카드로 바뀐다. 대행사 채널(`PORTONE_CHANNEL_KEY_GLOBAL`)이 서는 날
   `UPDATE products SET active = true WHERE code LIKE 'ME_V3_%_GL'` 한 줄로
   연다. **다시 돌아도 켜고 끈 상태와 값을 덮지 않는다** */
INSERT INTO products
  (code, kind, amount, currency, seat_count, active, report_level,
   market, major_code, tier, assessment_version, price_status)
VALUES
  ('ME_V3_BASIC_GL',    'assessment',    0, 'USD', 1, false, 'free',
   'GLOBAL', 'ME', 'BASIC',    'ME_V3_2', 'approved'),
  ('ME_V3_STANDARD_GL', 'assessment', 1499, 'USD', 1, false, 'full',
   'GLOBAL', 'ME', 'STANDARD', 'ME_V3_2', 'approved'),
  ('ME_V3_PRO_GL',      'assessment', 2499, 'USD', 1, false, 'full',
   'GLOBAL', 'ME', 'PRO',      'ME_V3_2', 'approved')
ON CONFLICT (code) DO NOTHING;
