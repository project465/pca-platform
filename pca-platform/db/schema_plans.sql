-- ============================================================
--  MAT 기본 · 연구자 플랜 (2026-11-03 수익화 E-4)
--
--  연구자 30일(19,900원) 상품 한 줄과, 연구자 플랜의 쪽 수 한도를 세는 칸 하나.
--  연구자 90일 · 해외 90일 · 해외 추가 이용권은 값이 정해지지 않아 줄을 만들지 않는다.
--  값의 정본은 `src/lib/pricing/config.ts` 이고, 이 줄은 주문 · 이용권이 가리키는 상품 이름이다.
--
--  **더하기만 한다.** 상품 한 줄을 더하고(이미 있으면 그대로 둔다), 칸 하나를 더한다.
-- ============================================================

INSERT INTO products (code, kind, amount, currency, seat_count, active, report_level, duration_days, market, price_status)
VALUES ('RESEARCH_30D', 'track', 19900, 'KRW', 0, true, 'full', 30, 'KR', 'approved')
ON CONFLICT (code) DO NOTHING;

/* 연구자 플랜은 파일 수가 아니라 읽은 PDF 쪽 수로 센다 */
ALTER TABLE research_docs ADD COLUMN IF NOT EXISTS pages INTEGER;
