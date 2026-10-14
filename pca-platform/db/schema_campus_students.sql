-- ============================================================
--  학교가 미리 발급하는 학생 계정 (Campus Student Accounts)
--
--  **새 인증 시스템을 만들지 않는다.** 로그인 주체는 `users` 하나이고
--  (설계 원칙 1) 비밀번호도 `users.password_hash` 를 그대로 쓴다. 소속은
--  `memberships` 가 들고, 이 표가 더하는 것은 **그 학교 안에서 누구인가**
--  뿐이다: 학번과 단과대학과 학과와 갈래.
--
--  **왜 응시 줄로는 모자란가.** `v3_attempts` 의 학교 맥락은 그 응시가
--  어디에서 들어왔는가이고, 응시를 **시작하기 전에** 알아야 하는 값이
--  여기 있다. 학생이 로그인한 순간 학과를 복원해야 다시 고르게 하지 않는다.
--
--  **외래키를 걸지 않는다.** 학교와 단과대학과 학과의 정본은
--  `content/campus-universities.json` 이고, DB 에 한 벌 더 두면 학과를
--  늘리는 날 한쪽만 늘어난다. 이 저장소에서 `industries` 가 그렇게 깨졌다.
--  대신 **넣는 자리가 등록부로 검증한다**(`campus/students.ts`).
--
--  적용: 차례는 `deploy/db-chain.json` 하나가 들고 있다
-- ============================================================

CREATE TABLE IF NOT EXISTS campus_students (
  user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  university_code TEXT NOT NULL,
  -- 학교가 부르는 번호(학번). 로그인 아이디와 **같은 값일 수 있지만 같은
  -- 칸이 아니다**: 학교가 학번을 아이디로 못 쓰게 하는 날 아이디만 갈린다
  student_id      TEXT NOT NULL,
  college_code    TEXT NOT NULL,
  department_code TEXT NOT NULL,
  -- Core 안의 갈래. 갈래가 없는 학과는 NULL 이고 그것이 정상이다
  specialization  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_code, student_id)
);

COMMENT ON TABLE campus_students IS
  '학교가 미리 발급한 학생 계정의 학교 안 신분. 로그인은 users 가 맡고
   소속은 memberships 가 맡는다. 이 표는 학번과 학과만 든다';
COMMENT ON COLUMN campus_students.student_id IS
  '학교가 부르는 번호. 로그인 아이디(users.login_id)와 같은 값일 수 있으나
   같은 칸이 아니다 — 학교가 학번을 아이디로 못 쓰게 하는 날 아이디만 갈린다';
COMMENT ON COLUMN campus_students.department_code IS
  '등록부(content/campus-universities.json)의 고르는 자리 코드. 외래키를
   걸지 않는 대신 넣는 자리가 등록부로 검증한다';

-- 담당자 화면과 일괄 발급이 학교로 좁혀 읽는다
CREATE INDEX IF NOT EXISTS campus_students_uni
  ON campus_students (university_code, department_code);
