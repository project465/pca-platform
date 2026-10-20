# C16 — 다른 기관 계정 충돌 (P0) · R3 독립 재현과 수정안

받는 곳: 본체 총괄 PM · 공통 Core 담당 · 보내는 곳: JJU 세션 · 2026-10-20 · 기준 `71eca64e`

**JJU 세션은 공통 코드를 고치지 않았다.** 아래 수정안은 이 저장소 밖의 임시 worktree 에서만 적용해
같은 테스트로 돌려 보고 지웠다. 적용 여부는 본체 PM 이 정한다.

## 1. 독립 재현 (`scripts/jju-c16.ts`)

진입점마다 피해자를 **새로 만들고**(`qa-c16-*`), 바꾸기 전과 뒤의 `users` · `campus_students` · `memberships`
줄을 통째로 떠서 견주고, 끝나면 그 사람들을 지운다. 기존 QA 계정과 운영 자료를 건드리지 않는다.
해시는 값을 적지 않고 `바뀜` 만 적는다. 실제 PostgreSQL 16 이고 해시 함수는 오프라인 대체기다(아래 6절).

| # | 진입점 | 지금 HEAD | 수정안 적용 |
|---|---|---|---|
| 1 | 단건 추가 JJU → PCU 학생 아이디 | **성공 응답 · 학과·단과대학·갈래가 전주대 값으로 바뀜** | 거절 · 변화 없음 |
| 2 | 단건 추가 PCU → JJU 학생 아이디(반대 방향) | **성공 응답 · 같은 모양으로 바뀜** | 거절 · 변화 없음 |
| 3 | 단건 추가 → 다른 기관 담당자 아이디 | 성공 응답 · 줄 변화는 없음(감사 기록만 남는다) | 거절 · 변화 없음 |
| 4 | 단건 추가 → 개인 회원(B2C) 아이디 | 성공 응답 · 줄 변화는 없음 | 거절 · 변화 없음 |
| 5 | CSV 일괄 등록 | **`고침 1` 로 적용 · 피해자 학과가 바뀜** | 그 줄만 거절 · 변화 없음 |
| 6 | `provisionStudent(..., {rotate:true})`(운영 스크립트 `pcu-students` · `staging-bootstrap`) | **비밀번호 해시 · 이름 · 학교(PCU→JJU) · 소속(JJU 추가)이 바뀜 = 계정 탈취** | 거절 · 변화 없음 |
| 7 | 비밀번호 재발급(`rotateStudentPassword`) | 거절 · 변화 없음(소유 확인이 있다) | 같음 |
| 8 | 두 학교가 같은 새 아이디를 같은 순간에 만든다 | **둘 다 성공 응답 · 한쪽이 받은 비밀번호는 덮여 쓸 수 없음 · 학교 JJU + 학과 PCU 가 섞인 줄** | 한쪽만 성공 · 한 학교에만 묶임 |

로그: `c16-current-head.log`(통과 1 · 걸림 7) · `c16-with-patch.log`(통과 8 · 걸림 0).

R2 보고보다 넓다. R2 는 1번 한 방향만 실행했고 6번은 코드 읽기였다. 6번과 8번을 이번에 실제로 돌렸다.

## 2. 원인

`src/lib/campus/students.ts` 의 `provisionStudent()` 가 아이디로만 기존 사람을 찾고 **그 사람이 어느 학교의
학생인지 보지 않는다.** 기존 사람이 있으면(rotate 아님) `campus_students` 의 학과를 그 자리에서 고치고,
rotate 면 `ON CONFLICT (login_id) DO UPDATE password_hash` 와 `campus_students` 의 `university_code` 덮어쓰기로
통째로 가져간다. 읽고 나서 쓰는 사이에 잠금이 없어 8번이 난다.

## 3. 수정안 (`C16_proposed.patch` · 공통 파일 두 벌 · 스키마 변경 없음)

- `provisionStudent()` 를 한 거래로 묶고 `pg_advisory_xact_lock(hashtext(login_id))` 로 아이디 하나를 한 번에
  한 곳만 만지게 한다.
- 이미 있는 아이디가 **같은 학교의 학생**이 아니면(다른 학교 학생 · 개인 회원 · 담당자) `LoginTaken` 을 던지고
  **어느 칸도 바꾸지 않는다.** 문구는 `이 아이디는 이미 쓰이고 있습니다` 뿐이고 누구 것인지 적지 않는다.
- 새로 만드는 쪽은 `ON CONFLICT (login_id) DO NOTHING` 이고 비어 돌아오면 `LoginTaken`. 같은 학교 rotate 는
  `UPDATE users SET password_hash` 로 바꾸며 학교 칸은 덮지 않는다(`WHERE university_code = EXCLUDED…`).
- `addStudentAccount` 는 `{ ok:false, why }` 로, `applyImport` 는 그 줄을 `rejected` 로 돌린다.

수정안을 적용한 상태에서 돌린 회귀: `jju-verify` 42/42 · `campus:check` 80/80(fixture 닫음) ·
`jju-access` 25/26(남은 하나는 R2 의 `코드 읽기` 고정 줄이라 늘 걸린다) · `jju-c16` 8/8.

수정안이 하지 않는 것: 아이디 이름공간을 학교별로 바꾸는 일(학번이 겹치는 두 학교 학생 중 뒤엣사람은
다른 아이디를 받아야 한다). 그 정책과 로그인 영향은 본체 PM 이 정한다.

## 4. 과거 오염 확인 (`c16_readonly_audit.sql` · 읽기만)

네 가지를 센다: 학교 칸과 학과 코드의 학교가 다른 줄 · 학생 소속이 두 기관인 사람 · 학교 줄이 있는데 그
기관 소속이 없는 사람 · 담당자가 남의 학교 학생을 대상으로 남긴 감사 기록. 이 기계의 DB 에서 돌린 결과는
`c16_readonly_audit.local.txt` 다: 앞의 셋은 0 이고, 넷째에 R2 재현이 남긴 감사 세 줄이 잡힌다(그 줄은
되돌렸지만 감사 기록은 남는다 · 의도한 대로다). **운영에서는 아직 돌리지 않았다**(이 세션이 운영 DB 에 닿지
못한다).

## 5. 막아 둔 것 (JJU 소유 범위)

- `src/lib/jju/login-guard.ts` 가 전주대 스크립트(`jju-demo-setup` · `jju-verify`)를 들어가기 전에 멈춘다.
- **담당자 화면의 학생 추가와 CSV 는 공통 `src/app/org/v3/students/actions.ts` 라 JJU 가 막을 자리가 없다.**
  전주대가 소유한 쓰기 진입점은 0 개다(`/jju/admin` 은 읽기만 한다).
- 그래서 운영 차단은 정책으로 둔다: **C16 이 닫히기 전에는 PCU·JJU 가 같은 운영 DB 를 쓰지 않고 전주대 실제
  계정을 발급하지 않는다**(Gate S0).

## 6. 아직 아닌 것

- 실제 bcrypt(`bcryptjs`) · Auth.js · 서버 액션을 HTTP 로 부른 E2E 는 Next 를 띄우지 못해 하지 않았다
  (`docs/jju/r3/evidence/runtime.txt`). 수용 기준 6번은 열려 있다.
- 운영 DB 의 테넌시(공유 여부) 확인과 위 읽기 질의는 운영 권한이 있는 사람이 돌린다.
