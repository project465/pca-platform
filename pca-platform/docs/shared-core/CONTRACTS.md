# 공통 인터페이스 변경 계약서 (초안)

계약마다 **바뀌는 것 · 바뀌지 않는 것 · 영향받는 세션 · 되돌리는 법 · 승인할 사람** 을 적는다.
모두 `DRAFT` 이고 이 세션은 승인 전에 다른 세션의 파일을 고치지 않는다. 다른 세션에 보내지 않았다:
보낼지는 사업주가 정한다.

기준 커밋: `4f02d79b` · Common Core 가지: `feature/shared-core` (= `claude/determined-brahmagupta-jwnqs9`)

---

## CC-000 작업 분담과 공용 파일

| | |
|---|---|
| 영향 | 배재 · 전주 · 세종 · 본체 |
| 바뀌는 것 | Common Core 가 맡는 자리: 기관 프로필 · 로그인 이름공간 · 콘텐츠 선택 · 결과 렌더 기록 · 역할 · 기관 격리 검사. 새 코드는 `src/lib/shared-core/` · `content/tenants/` · `db/proposed/` · `scripts/shared-core/` · `docs/shared-core/` |
| 바뀌지 않는 것 | 본체가 제안한 `src/lib/tenant/` · `docs/core/` 를 Common Core 가 쓰지 않는다(이름을 갈랐다). 본체는 상용화(PG · B2C · Global)를 맡는다 |
| 공용 파일 | `package.json` 에 `shared-core:check` 한 줄(1단계) · `shared-core:isolation` 한 줄(5단계). `CLAUDE.md` 는 통합할 때 이 폴더를 가리키는 한 줄만 |
| 기준 커밋 | 전주대 · 세종도 `4f02d79b` 에서 출발하기를 권한다 |
| 승인 | 사업주 |

## CC-001 Tenant Profile (SC-1)

| | |
|---|---|
| 영향 | 전주대 · 세종 (새 파일을 쓴다) · 배재 (영향 없음) |
| 바뀌는 것 | `content/tenants/<코드>.json` 한 벌을 더하면 기관이 생긴다. 읽는 자리는 `loadTenantProfile()` 하나 (R36 구현 · 미연결 · [SC1_TENANT_PROFILE.md](SC1_TENANT_PROFILE.md)) |
| 바뀌지 않는 것 | `campus-universities.json` 과 그 등록부 코드 · 학교 진입 화면 · 응시 · 채점 · 결과 · DB |
| 각 세션이 할 일 | 자기 코드의 파일 하나만 쓴다. 남의 파일을 고치지 않는다. 학교라면 단과대·학과 구조는 지금처럼 등록부(`campus-universities.json`)에 들어가야 학생 진입이 서는데, **그 파일은 배재 소유라 블록을 더하는 일은 배재 세션과 맞춘다** (전주대 세션이 적은 `운영에서는 무시되는 테스트용 설정 파일` 은 `V3_CAMPUS_FIXTURE` 이고 그 길을 그대로 쓴다) |
| 되돌림 | 파일을 지우면 그 기관이 사라진다. 다른 기관에 영향 없음 |
| 승인 | 사업주 · 전주대 · 세종 |

## CC-002 로그인 신원 (SC-2) — P0 · R36 개정

| | |
|---|---|
| 영향 | **배재** (파일 소유) · 전주대 · 세종 (두 번째 학교부터) · 본체 (2단계 인증) |
| 재현 | 다른 학교가 같은 학번을 올리면 앞 학교 학생의 학과가 덮이고(rotate 없음), rotate 면 계정·열쇠·학교·응시가 통째로 넘어간다. [R36_P0_LOGIN_COLLISION.md](R36_P0_LOGIN_COLLISION.md) |
| 바뀌는 것 (1단계) | `students.ts` 가 사람을 `(university_code, student_id)` 로만 찾는다 · 남의 손잡이·메일을 가져가지 않고 그 줄을 거절한다 · `campus_students` 의 학교를 바꿔 쓰지 않는다 · 새 학교의 손잡이는 `<CODE>:<학번>` · `manage.ts` 미리 보기는 그 학교 안에서만 · 거절은 그 줄만. 패치 `proposed/sc2-p0.patch` |
| 바뀌는 것 (2단계) | 학교 로그인·비밀번호 찾기가 기관 코드를 함께 넘기고 `authorize()` 가 `(기관, 학번)` 으로 찾는다. 시도 제한 열쇠에 기관 코드 |
| 배재의 동작 | 아이디 = 학번 그대로 · 재등록 수렴 · 열쇠 그대로 · rotate 는 같은 계정. `P0-COMPAT-1/2` 가 전후 모두 센다 |
| 바뀌지 않는 것 | **DB 스키마** · `users.login_id UNIQUE` · `campus_students UNIQUE(university_code, student_id)` · 비밀번호 규칙 |
| 확인 | 수정 사본에서 FIX-1~7 · COMPAT-1/2 통과(`evidence/R36/p0-fixed-run.log`). 적용 뒤 `campus:walk` · `pcu:campus` (브라우저) |
| 데이터 | PCU 이전 없음. 운영 탐지 SQL `scripts/shared-core/sql/r36_p0_detect.sql` (읽기만) |
| 되돌림 | 패치를 되돌리면 된다. 데이터는 바뀌지 않는다 |
| 시한 | **두 번째 학교가 명단을 올리기 전** |
| 승인 | 총괄 PM · 사업주 · 배재 (1단계) · 본체 (2단계) |

## CC-002a 배포 upgrade 가 학번 계정을 시연으로 표시한다 (ADJ-1) — R36 발견

| | |
|---|---|
| 영향 | 배재 (담당자 목록·집계에서 학생이 빠진다) |
| 재현 | `scripts/shared-core/p0-demo-remark.test.ts` — 다시 부은 뒤 `is_demo true · 목록 0` |
| 바꿀 자리 | `db/schema_phase2_4.sql` 의 일괄 UPDATE 에 `campus_students` 가 있는 줄을 빼는 조건 한 줄 |
| 운영 | NOT VERIFIED — 탐지 SQL 의 `ADJ1` 이 센다 |
| 승인 | 총괄 PM · 배재 |

## CC-003 콘텐츠 선택 (SC-3)

| | |
|---|---|
| 영향 | 전주대 · 세종 · (나중) 배재 GM |
| 바뀌는 것 | `contentFor()` 가 기관 프로필의 권역을 학생의 `home_region` 앞에 둔다. 1~3단계는 배선하지 않는다 |
| 바뀌지 않는 것 | `region.ts` · `report-gm/**` · 지역 자료 · 산업팩 · 역할팩 |
| 자료 원칙 | 0줄인 권역을 숫자로 채우지 않는다. 기업 자료는 사용 권리 확인 전 PREVIEW 로 둔다(KODATA 와 같은 자리) |
| 승인 | 사업주 |

## CC-004 결과 렌더 기록 (SC-4)

| | |
|---|---|
| 영향 | 배재 (종이 경로 · 담당자 화면) · 전주대 · 세종 (담당자 현황) |
| 바뀌는 것 | 새 표 `v3_report_renders`(제안 SQL 은 `db/proposed/`). `result/pdf/route.ts` 의 그리기 앞뒤에 두 줄 · `SC_RENDER_LOG=1` 일 때만 |
| 바뀌지 않는 것 | 종이를 그리는 방식 · 내용 · 쪽수 · `v3_snapshots` · `job_failures` · 결과 화면 |
| 실패 규칙 | 표가 없거나 기록이 실패해도 종이는 나간다 |
| DB | 차례(`db-chain.json`)에 넣는 일은 Staging 먼저 · 운영 `db:upgrade` 는 사람이 한다 |
| 되돌림 | 환경변수를 끄면 적지 않는다. 표는 남겨도 아무것도 읽지 않는다 |
| 승인 | 사업주 · 배재 |

## CC-005 역할과 상담사 (SC-5)

| | |
|---|---|
| 영향 | 세종 (상담사) · 전주대 · 배재 (담당자 범위) |
| 결정할 것 | `memberships.role` 에 `counselor` 값을 둘지 · 상담사가 개인 결과지를 여는 계약 조건 · 동의를 받는 화면 |
| 바뀌지 않는 것 | 기본값: **기관은 개인 결과지를 못 본다**(`org.participant.report.read` 는 어느 역할에도 없다) |
| 승인 | 사업주 (개인정보 · 법무 확인 포함) |

## STOP GATE — 참여자 학업 단계

전주대 J-4 와 세종 S-5. `v3_attempts.education_stage` 가 `bachelor · master · phd · postdoc` 넷이고 그 값이 학위
묶음 routing 을 고른다. 부트캠프 참여자나 구직자를 넣으려면 ① 기존 넷 가운데 하나로 옮겨 적거나 ② 값을 늘리고
routing · 문항 묶음 · 측정 동결을 다시 정해야 한다. ②는 측정 계약 변경이라 **이 세션은 착수하지 않는다.**
사업주가 ①을 고르면 Common Core 는 SC-1 의 `participant_model` 로 그 옮겨 적는 규칙만 담는다.
