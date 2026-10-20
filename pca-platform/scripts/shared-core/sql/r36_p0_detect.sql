-- R36 P0 — 기관 사이 학번 충돌이 이미 일어났는가를 **읽기만 해서** 센다.
--   psql "$DATABASE_URL" -X -A -f scripts/shared-core/sql/r36_p0_detect.sql
-- 이름·학번·메일을 내지 않는다. 수와 users.id 만 낸다(사람이 운영 화면에서 되짚는다).
-- 한 줄도 쓰지 않는다: 전부 SELECT 이고 트랜잭션을 READ ONLY 로 연다.
BEGIN TRANSACTION READ ONLY;

-- D1 학생 소속(memberships.role='student')이 학교 둘 이상에 걸린 계정
SELECT 'D1_student_in_many_orgs' AS check_id, count(*) AS n,
       coalesce(string_agg(user_id::text, ',' ORDER BY user_id), '') AS user_ids
  FROM (SELECT m.user_id FROM memberships m JOIN organizations o ON o.id = m.org_id
         WHERE m.role = 'student'
           AND o.code IN (SELECT DISTINCT university_code FROM campus_students)
         GROUP BY m.user_id HAVING count(DISTINCT o.code) > 1) x;

-- D2 학생 소속 학교와 campus_students 의 학교가 다른 계정
SELECT 'D2_membership_vs_campus_row' AS check_id, count(*) AS n,
       coalesce(string_agg(DISTINCT cs.user_id::text, ','), '') AS user_ids
  FROM campus_students cs
  JOIN memberships m ON m.user_id = cs.user_id AND m.role = 'student'
  JOIN organizations o ON o.id = m.org_id
 WHERE o.code <> cs.university_code
   AND o.code IN (SELECT DISTINCT university_code FROM campus_students);

-- D3 응시에 적힌 학교와 지금 campus_students 의 학교가 다른 응시
SELECT 'D3_attempt_vs_campus_row' AS check_id, count(*) AS n,
       coalesce(string_agg(a.id::text, ',' ORDER BY a.id), '') AS attempt_ids
  FROM v3_attempts a JOIN campus_students cs ON cs.user_id = a.user_id
 WHERE a.university_code IS NOT NULL AND a.university_code <> cs.university_code;

-- D4 학교 학생인데 아이디가 그 학번이 아닌 계정(명단의 login_id 칸 · 다른 학교 학번에 붙은 줄)
SELECT 'D4_login_not_student_id' AS check_id, count(*) AS n,
       coalesce(string_agg(u.id::text, ',' ORDER BY u.id), '') AS user_ids
  FROM campus_students cs JOIN users u ON u.id = cs.user_id
 WHERE coalesce(u.login_id, '') <> cs.student_id;

-- ADJ1 학교 학생 계정이 시연으로 표시되어 담당자 화면에서 빠지는 줄
SELECT 'ADJ1_campus_student_marked_demo' AS check_id, count(*) AS n,
       coalesce(string_agg(u.id::text, ',' ORDER BY u.id), '') AS user_ids
  FROM campus_students cs JOIN users u ON u.id = cs.user_id
 WHERE u.is_demo;

ROLLBACK;
