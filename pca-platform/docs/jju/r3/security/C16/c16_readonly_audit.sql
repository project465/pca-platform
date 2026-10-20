-- C16 과거 오염 확인 (읽기만 한다 · 운영에서 사람이 돌린다)
-- 1) 학교 칸과 학과 코드의 학교가 다른 줄 (학과 코드 앞머리로 가른다: PCU26_/PCU27_ · JJU)
SELECT 'dept_vs_university' AS check, cs.user_id, cs.university_code, cs.department_code
  FROM campus_students cs
 WHERE (cs.university_code = 'PCU' AND cs.department_code NOT LIKE 'PCU%')
    OR (cs.university_code = 'JJU' AND cs.department_code NOT LIKE 'JJU%');
-- 2) 학생 역할 소속이 두 기관 이상인 사람
SELECT 'multi_org_student' AS check, m.user_id, array_agg(o.code ORDER BY o.code) AS orgs
  FROM memberships m JOIN organizations o ON o.id = m.org_id
 WHERE m.role = 'student'
 GROUP BY m.user_id HAVING count(DISTINCT m.org_id) > 1;
-- 3) 학교 학생 줄이 있는데 그 학교 기관 소속이 없는 사람
SELECT 'campus_without_membership' AS check, cs.user_id, cs.university_code
  FROM campus_students cs
 WHERE NOT EXISTS (SELECT 1 FROM memberships m JOIN organizations o ON o.id = m.org_id
                    WHERE m.user_id = cs.user_id AND o.code = cs.university_code);
-- 4) 담당자가 남의 학교 학생을 대상으로 남긴 감사 기록
SELECT 'cross_org_audit' AS check, a.id, a.action, a.org_id, a.target_id
  FROM audit_logs a
  JOIN campus_students cs ON cs.user_id::text = a.target_id
  JOIN organizations o ON o.id = a.org_id
 WHERE a.action LIKE 'campus.student.%' AND o.code <> cs.university_code;
