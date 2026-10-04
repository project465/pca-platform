-- ============================================================
--  데모 자료.
--
--  **실제 기관이 아니다.** 한빛대학교는 지어낸 이름이고 로고도 쓰지 않는다.
--  화면을 눌러 보려고 만든 것이라 운영 DB 에 넣지 않는다.
--
--  적용: schema.sql → schema_metri.sql → schema_platform.sql → 이 파일
-- ============================================================

INSERT INTO organizations (code, country, org_type, name, language, status, aggregate_min_cell)
VALUES
  ('DEMO_HANBIT',    'KR', 'university', '한빛대학교',          'ko', 'active', 5),
  ('DEMO_HANBIT_ME', 'KR', 'department', '한빛대학교 기계공학과','ko', 'active', 5)
ON CONFLICT (code) DO NOTHING;

UPDATE organizations SET parent_id = (SELECT id FROM organizations WHERE code='DEMO_HANBIT')
 WHERE code = 'DEMO_HANBIT_ME' AND parent_id IS NULL;

-- 계약 하나에 등급이 둘 묶여 있다. **계약과 상품은 같은 것이 아니다**
INSERT INTO contracts
  (org_id, title, starts_on, ends_on, seat_count, status,
   product_package, allowed_report_levels, allowed_majors, billing_status)
SELECT id, '2026-1학기 기계공학과', current_date - 20, current_date + 120, 100, 'active',
       'CAMPUS', '{STANDARD,PRO}', '{ME}', 'paid'
  FROM organizations WHERE code = 'DEMO_HANBIT_ME'
ON CONFLICT DO NOTHING;

-- 좌석 100개. STANDARD 80 · PRO 20
INSERT INTO seats (contract_id, report_level, major_code, status)
SELECT c.id, CASE WHEN g <= 80 THEN 'STANDARD' ELSE 'PRO' END, 'ME', 'available'
  FROM contracts c, generate_series(1, 100) g
 WHERE c.title = '2026-1학기 기계공학과'
   AND NOT EXISTS (SELECT 1 FROM seats s WHERE s.contract_id = c.id);

INSERT INTO cohorts (org_id, contract_id, name, description, starts_on, ends_on)
SELECT o.id, c.id, '2026 기계공학 4학년', '졸업 예정자 대상',
       current_date - 10, current_date + 80
  FROM organizations o JOIN contracts c ON c.org_id = o.id
 WHERE o.code = 'DEMO_HANBIT_ME' AND c.title = '2026-1학기 기계공학과'
ON CONFLICT DO NOTHING;

INSERT INTO cohorts (org_id, contract_id, name, description, starts_on, ends_on)
SELECT o.id, c.id, '2026 대학원 진로 프로그램', '석·박사 과정',
       current_date - 5, current_date + 100
  FROM organizations o JOIN contracts c ON c.org_id = o.id
 WHERE o.code = 'DEMO_HANBIT_ME' AND c.title = '2026-1학기 기계공학과'
ON CONFLICT DO NOTHING;

-- 좌석 상태를 72 받음 · 58 끝남 쪽으로 옮긴다. 숫자가 맞물려야 화면이
-- 말이 된다: 초대 ≥ 받음 ≥ 시작 ≥ 끝남
WITH c AS (SELECT id FROM contracts WHERE title = '2026-1학기 기계공학과' LIMIT 1),
     pick AS (SELECT s.id, row_number() OVER (ORDER BY s.id) rn
                FROM seats s, c WHERE s.contract_id = c.id)
UPDATE seats s SET
  status = CASE
    WHEN p.rn <= 58 THEN 'completed'
    WHEN p.rn <= 66 THEN 'started'
    WHEN p.rn <= 72 THEN 'claimed'
    WHEN p.rn <= 90 THEN 'invited'
    ELSE 'available' END,
  invited_at   = CASE WHEN p.rn <= 90 THEN now() - interval '20 days' END,
  claimed_at   = CASE WHEN p.rn <= 72 THEN now() - interval '15 days' END,
  consumed_at  = CASE WHEN p.rn <= 66 THEN now() - interval '10 days' END,
  completed_at = CASE WHEN p.rn <= 58 THEN now() - interval '8 days' END
FROM pick p WHERE s.id = p.id;
