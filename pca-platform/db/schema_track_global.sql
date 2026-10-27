-- ============================================================
--  CareerMatri Track — 해외판 기간권 두 가지 (MAT 영어판)
--
--  **값을 지어내지 않는다.** 해외 MAT 값은 사업주가 정한다. 정해지기 전에는
--  금액 0 · `not_approved` 로 두고, 결제를 여는 쪽(`startCheckout`)이 승인되지
--  않은 값을 거절한다. 화면은 이 상태를 `값을 정하는 중` 으로 적는다.
--
--  2026-10-27 사업주 결정: **30일권 4.99달러.** 365일권은 아직 정하지 않았다.
--  금액은 통화의 최소 단위 정수다(499 = $4.99, `src/lib/money.ts`).
--
--  나머지 칸은 한국 기간권(`schema_track.sql`)과 같다: 좌석도 검사
--  이용권도 주지 않고 기간만 연다.
-- ============================================================

INSERT INTO products
  (code, kind, amount, currency, seat_count, active, report_level,
   market, major_code, tier, assessment_version, price_status, duration_days)
VALUES
  ('TRACK_30D_GL',  'track', 499, 'USD', 0, true, 'full',
   'GLOBAL', NULL, NULL, NULL, 'approved',  30),
  ('TRACK_365D_GL', 'track', 0, 'USD', 0, true, 'full',
   'GLOBAL', NULL, NULL, NULL, 'not_approved', 365)
ON CONFLICT (code) DO UPDATE
  SET kind = EXCLUDED.kind, seat_count = EXCLUDED.seat_count,
      active = EXCLUDED.active, market = EXCLUDED.market,
      tier = NULL, major_code = NULL, assessment_version = NULL,
      duration_days = EXCLUDED.duration_days
  /* **승인된 값을 덮지 않는다.** 사업주가 값을 넣은 뒤에 이 파일이 다시
     돌아도(`db:upgrade` 는 매 배포마다 돈다) 금액과 상태가 0 · 미승인으로
     돌아가지 않게, 그 두 칸은 처음 넣을 때만 적는다 */;

/* 처음 넣을 때 0 · 미승인으로 들어간 30일권에 사업주가 정한 값을 넣는다. **아직
   미승인인 줄만 고친다**: 그 뒤 운영 화면에서 값을 바꾸면 이 파일이 다시 돌아도
   되돌리지 않는다 */
UPDATE products SET amount = 499, price_status = 'approved'
 WHERE code = 'TRACK_30D_GL' AND price_status = 'not_approved';
