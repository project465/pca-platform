-- ADJ-1 수정안 (R37) — **승인 전 적용 금지 · deploy/db-chain.json 에 넣지 않았다.**
--
-- 무엇: `db/schema_phase2_4.sql` 끝의 일괄 UPDATE 가 배포마다 다시 돌아
--       메일 없는 학번 계정(학교가 발급한 학생)을 is_demo=true 로 바꾼다.
--       담당자 목록 · 집계는 시연을 거르므로 그 학생이 사라진다.
-- 왜 원본을 고치지 않는가: 이미 운영에 부어진 파일이다. 원본을 바꾸면
--       "그 파일이 무엇을 했는가" 의 기록이 사라지고, 되돌릴 기준도 사라진다.
-- 어떻게: 이 파일을 upgrade 목록 **맨 뒤**(schema_campus_students.sql 다음)에
--       두면 매 upgrade 마다 phase2_4 가 붙인 표시를 학교 학생에 한해 걷는다.
--       `provisionStudent` 가 계정을 만들 때 하는 일(학생을 시연으로 두지 않는다)과
--       같은 규칙이다. 두 번 돌려도 같다(멱등).
-- 걷지 않는 것: campus_students 줄이 없는 계정(시드 학번 계정 · 개인 회원)은 그대로.
UPDATE users SET is_demo = FALSE
 WHERE is_demo
   AND id IN (SELECT user_id FROM campus_students);
