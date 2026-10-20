# 공통 인터페이스 변경 계약서 (초안)

계약마다 **바뀌는 것 · 바뀌지 않는 것 · 영향받는 세션 · 되돌리는 법 · 승인할 사람** 을 적는다.
모두 `DRAFT` 이고 이 세션은 승인 전에 다른 세션의 파일을 고치지 않는다. 다른 세션에 보내지 않았다:
보낼지는 사업주가 정한다.

기준 커밋: `4f02d79b` · Common Core 가지: `feature/shared-core` (= `claude/determined-brahmagupta-jwnqs9`) · R37 개정: CC-002a · CC-006 후보 · CC-007 · CC-008 검토 항목

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
| 확인 (R37) | 시험 21개. 지금 코드 10 PASS / 11 TODO · 수정 사본 14 PASS / 6 SKIP / 1 TODO(RISK-1 — 1단계로는 풀리지 않는다). 비밀번호 찾기(FIX-8) · 소속(FIX-9) · 로그인 질의(FIX-10)를 더했다. 여덟 질문: [R37_P0_VERIFICATION.md](R37_P0_VERIFICATION.md) |
| 데이터 | PCU 이전 없음. 운영 탐지 SQL `scripts/shared-core/sql/r36_p0_detect.sql` (읽기만) |
| 되돌림 | 패치를 되돌리면 된다. 데이터는 바뀌지 않는다 |
| 시한 | **두 번째 학교가 명단을 올리기 전** |
| 승인 | 총괄 PM · 사업주 · 배재 (1단계) · 본체 (2단계) |

## CC-002a 배포 upgrade 가 학번 계정을 시연으로 표시한다 (ADJ-1) — R36 발견

| | |
|---|---|
| 영향 | 배재 (담당자 목록·집계에서 학생이 빠진다) |
| 재현 | `scripts/shared-core/p0-demo-remark.test.ts` — 다시 부은 뒤 `is_demo true · 목록 0` |
| 언제 나는가 (R37) | **처음 부을 때는 안 난다**: INSERT 트리거는 숫자 학번만으로 표시하지 않는다(ADJ-1a). **upgrade 를 다시 부을 때마다** 학교 학생이 시연으로 표시되고 담당자 목록에서 빠진다(ADJ-1b · 목록 1 → 0 · 실패한 파일 0) |
| 바뀌는 것은 하나 | 다시 부어도 `users.is_demo` 말고는 사람 · 소속 · 학교 줄이 바뀌지 않는다(ADJ-1e · 지문 대조) |
| 바꿀 자리 (R37 개정) | **이미 부어진 `db/schema_phase2_4.sql` 은 고치지 않는다.** 따로 한 파일 `docs/shared-core/proposed/adj1-campus-students-not-demo.sql` 을 upgrade 목록 **맨 뒤**(`schema_campus_students.sql` 다음)에 둔다. 학교 학생만 걷고 시드 꼴 계정은 그대로 · 멱등(ADJ-1d). `provisionStudent` 가 계정을 만들 때 하는 일과 같은 규칙이다 |
| 목록에 넣지 않으면 | 다음 배포에 또 표시된다(ADJ-1d 마지막 단계가 그것을 보인다) |
| 위험 | 확인용 학교(ZZTEST)의 학생도 걷힌다. 그 학교를 지표에서 가리고 싶다면 별도 규칙이다 |
| 탐지 | `scripts/shared-core/sql/r36_p0_detect.sql` 의 `ADJ1` 줄. **읽기만 한다**(DET-1: 쓰는 문장 0 · `BEGIN TRANSACTION READ ONLY` · DB 지문 전후 같음 · READ ONLY 쓰기 거절). 운영에서 돌리는 일은 운영자 승인 뒤 |
| 운영 | NOT VERIFIED |
| 분류 | DB/API CONTRACT (배포 차례 변경) |
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

## CC-006 후보 경험 기록의 기준 시점 — R37 · 배재 GM 요청 1 · **DRAFT · 승인된 요구사항 아님**

| | |
|---|---|
| 영향 | 배재 GM (PDF) · 본체 (작업공간 · 파기) · SC-4 (발급 기록) |
| 지금 | `v3_snapshots` 는 경험을 고쳐도 그대로다(TP-1). 결과 화면이 읽는 `experiencesOf` 는 그 순간의 값이고 지우면 흔적이 없다(TP-2). 본체 PDF 는 경험을 싣지 않는다(TP-3 정적). **GM PDF 가 live 경험을 실을 때** 같은 응시의 종이가 달라진다 |
| 권고 | **A · 스냅숏.** 구조화 열쇠(종류 · 제목 · 영역 · 결정 · 산출물 · 검증 · 문제 · 쓰인 자리 · 기간)만 적고 `note_text` 는 뺀다(1년 파기 우회 방지) |
| 결정할 것 | 굳히는 시점: **A1 제출 때**(같은 응시의 종이가 다시 안 바뀐다 · 결과 뒤에 적은 경험은 영영 안 선다) / **A2 발급 때**(CC-004 의 발급 기록에 같이 적는다 · 종이 한 벌마다 재현) |
| 견준 안 | B · 이력 표(기준일 질의). 쓰고 읽는 자리가 다수 바뀌고 같은 파기 질문이 생긴다. 비교표는 [handoffs/2026-10-20_pcu-gm-core-requests.md](handoffs/2026-10-20_pcu-gm-core-requests.md) |
| 바뀌지 않는 것 | 채점 · 결과 모델 · 이미 적힌 `v3_snapshots` 줄(칸을 더할 뿐 고치지 않는다) |
| 지난 응시 | 어느 안이든 되살릴 수 없다. "기준 없음" 으로 읽는다 |
| 같이 정할 것 (정적 발견) | `erasure.ts` 의 지우는 표에 `v3_experiences` 가 없다 · `v3_experiences.purge_after` 를 집행하는 자리가 없다 |
| DB | 이 회차에 바꾸지 않았다. 고르면 `db/proposed/` 에 적고 Staging 먼저 |
| 분류 | DB/API CONTRACT |
| 승인 | 총괄 PM · 사업주 (개인정보) · 배재 |

## CC-007 검토 항목 GM 서버 입구 · 런타임 파일 — R37 · 배재 GM 요청 3 · **기록만**

| | |
|---|---|
| 요청 | 운영 `/v3/{id}/result/pdf` 를 그대로 두고 승인 플래그 뒤에 별도 입구(담당자 전용 미리보기 등) · 런타임 이미지에 `data/report-gm/*` · `data/region/*` · Pretendard(OFL) |
| 책임 | 배포·디자인 쪽. Common Core 는 Dockerfile · 서버 코드를 고치지 않는다 |
| 검토할 것 | `deploy/runtime-needs.json` · `Dockerfile` 변경 · 글꼴 라이선스와 내려받기(지금 저장소에 없다) · 지역·공시 자료 사용 권리(CC-003) · 미리보기 권한(기관은 기본으로 개인 결과지를 못 본다, CC-005) |
| 분류 | DEPLOYMENT/INFRA · DB/API CONTRACT (새 입구) |
| 승인 | 사업주 · 총괄 PM (디자인 승인 뒤) |

## CC-008 검토 항목 결과지 빈자리의 범위 — R37 벤치마크 발견 · **기록만**

| | |
|---|---|
| 관찰 | 스냅샷은 답하지 않은 축을 `empty` · `SKIPPED` 로 가른다. 결과 모델의 빈자리(`gapsOf`)는 **필수 축 · J5/J6 · 요청된 축 · focus 의 부분 축 하나**만 세운다. 그래서 ME · EE 에서 심화 축 넷에 답하지 않은 사례(C07)와 J4 를 `없다` 로 답한 사례(C08)가 강한 사례(C01)와 **머리글 · 할 일 목록이 같다**(벤치마크 6/20 짝) |
| 숫자 | `docs/shared-core/evidence/R37/bench/results.json` 의 `actual.gaps_d1` · `empty_d1` |
| 판단 | 설계된 동작으로 보인다(비필수 · 미요청 축을 빈자리로 세우지 않는다). 바꿀지 말지는 결과 계약이라 이 세션이 정하지 않는다 |
| 분류 | ASSESSMENT/SCORING CONTRACT (결과 모델) |
| 승인 | 총괄 PM |

## STOP GATE — 참여자 학업 단계

전주대 J-4 와 세종 S-5. `v3_attempts.education_stage` 가 `bachelor · master · phd · postdoc` 넷이고 그 값이 학위
묶음 routing 을 고른다. 부트캠프 참여자나 구직자를 넣으려면 ① 기존 넷 가운데 하나로 옮겨 적거나 ② 값을 늘리고
routing · 문항 묶음 · 측정 동결을 다시 정해야 한다. ②는 측정 계약 변경이라 **이 세션은 착수하지 않는다.**
사업주가 ①을 고르면 Common Core 는 SC-1 의 `participant_model` 로 그 옮겨 적는 규칙만 담는다.
