# 공통 인터페이스 변경 계약서 (초안)

계약마다 **바뀌는 것 · 바뀌지 않는 것 · 영향받는 세션 · 되돌리는 법 · 승인할 사람** 을 적는다.

**상태 (R38)** — `DRAFT` 제안만 · `PROPOSED` 재현 · 회귀 검사가 붙어 승인을 요청함 · `APPROVED` 승인 증거가 있음 ·
`IMPLEMENTED` 적용 · `VERIFIED` 적용 뒤 회귀 통과. **공식 승인 증거가 없으면 DRAFT 또는 PROPOSED 다.**

| CC | 상태 (R38) | 공식 승인 증거 |
|---|---|---|
| CC-000 | DRAFT | 없음 |
| CC-001 | DRAFT (구현은 미연결) | 없음 |
| CC-002 SC-2 | PROPOSED (패치 · 재현 21개) · **R41: 사업주 결정 — Core 방식. 합친 패치 `sc2-merged.patch`(SC-2 + 전주 C16 거래·잠금) · 관문 READY_WHEN_LANDED · 전주 c16 8/8 · 승인 대기 (landing/L2)** | 없음 |
| CC-002a ADJ-1 | PROPOSED (별도 SQL · 재현 6개) | 없음 |
| CC-003 | DRAFT | 없음 |
| CC-004 | DRAFT | 없음 |
| CC-005 | DRAFT | 없음 |
| CC-006 경험 기준시점 | PROPOSED (A2 권고 · 재현 4개) · **R39: 배재 GM 패치 01 이 A1(제출 때)로 구현 — 결정 전 적용 보류 권고** | 없음 |
| CC-007 | 기록만 (Core 관여 안 함) | — |
| CC-008 결과 빈자리 범위 | PROPOSED (세 범주 · 독립 실험 · XFAIL 8) | 없음 |
| CC-009 파기 · 기한 | PROPOSED (재현 6 PASS / 3 TODO) · **R40: L1 착지 요청(`v3_experiences`) · 수정 사본 FIX-1a PASS** · **R39: 배재 D9 가 같은 구멍(`v3_experiences`)을 독립 확인 — GM 01 과 같은 배포에 최소 REMOVE 권고** | 없음 |
| CN-001 근거 세는 법 | 해석 메모 (계약 변경 아님) | — |
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
| R39 개정 | 사업주 결정(2026-10-20): Core 가 공통 파일 일부에 **패치 + 실행 테스트까지 착지**한다 — 범위 [CORE_LANDING_AUTHORITY.md](CORE_LANDING_AUTHORITY.md) · **범위는 총괄 PM 확인 전 PROPOSED** |

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

## CC-006 후보 경험 기록의 기준 시점 — R37 · 배재 GM 요청 1 · **PROPOSED (R38) · 승인된 요구사항 아님**

| | |
|---|---|
| 영향 | 배재 GM (PDF) · 본체 (작업공간 · 파기) · SC-4 (발급 기록) |
| 지금 | `v3_snapshots` 는 경험을 고쳐도 그대로다(TP-1). 결과 화면이 읽는 `experiencesOf` 는 그 순간의 값이고 지우면 흔적이 없다(TP-2). 본체 PDF 는 경험을 싣지 않는다(TP-3 정적). **GM PDF 가 live 경험을 실을 때** 같은 응시의 종이가 달라진다 |
| 권고 | **A · 스냅숏.** 구조화 열쇠(종류 · 제목 · 영역 · 결정 · 산출물 · 검증 · 문제 · 쓰인 자리 · 기간)만 적고 `note_text` 는 뺀다(1년 파기 우회 방지) |
| R38 권고 (Core PM 결정 메모 반영) | **A2 · 발급할 때 굳힌다.** 그리고 종이에 두 칸을 **따로** 적는다: ① 응시 시점 판정의 근거(`v3_snapshots` · 바뀌지 않는다) ② 발급 시점까지 더해진 경험(`v3_report_renders` 에 그때의 구조화 열쇠 · 기준일). 둘을 한 목록으로 섞으면 응시 뒤에 적은 경험이 응시 판정의 근거처럼 읽힌다 |
| 먼저 정할 것 | CC-009(파기 · 기한)가 먼저다 — 지금은 파기가 `v3_experiences` 를 지우지 않으므로, 발급 기록에 베끼면 지워지지 않는 사본이 하나 더 생긴다 |
| 회귀 검사 | `exp-timepoint.test.ts` TP-1~4 (R37 · R38 다시 통과) · 구현 뒤: 발급 두 번 사이에 경험을 고쳐도 첫 발급 기록이 같은가 · 파기 뒤 발급 기록에 구조화 열쇠가 남지 않는가 |
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

## CC-008 결과지 빈자리의 범위 — R37 발견 · **PROPOSED (R38)**

| | |
|---|---|
| 관찰 | 스냅샷은 답하지 않은 축을 `empty` · `SKIPPED` 로 가른다. 결과 모델의 빈자리(`gapsOf`)는 **필수 축 · J5/J6 · 요청된 축 · focus 의 부분 축 하나**만 세운다. 그래서 ME · EE 에서 심화 축 넷에 답하지 않은 사례(C07)와 J4 를 `없다` 로 답한 사례(C08)가 강한 사례(C01)와 **머리글 · 할 일 목록이 같다**(벤치마크 6/20 짝) |
| 숫자 | `docs/shared-core/evidence/R37/bench/results.json` 의 `actual.gaps_d1` · `empty_d1` |
| 판단 | 설계된 동작으로 보인다(비필수 · 미요청 축을 빈자리로 세우지 않는다). 바꿀지 말지는 결과 계약이라 이 세션이 정하지 않는다 |
| R38 재현 | `scripts/shared-core/content/integrity.ts` — C-UNSEEN **XFAIL 6**(ME · EE 의 C07 · 네 Core 의 C08) · C-SKIP-CAL **XFAIL 2**(BIZ · CS 의 C07: 답하지 않은 필수 축 J2 가 `아직 없습니다` 와 같은 글로 선다). XFAIL 은 합격 통계에 넣지 않는다 |
| 사용자 영향 | 네 축을 답하지 않은 학생과 여덟 축을 다 한 학생이 같은 머리글 · 할 일을 받는다(S2) · 답하지 않은 필수 축이 `없다` 로 읽힌다(S1) — `R38_OUTPUT_CONTENT_QA.md` |
| 제안 | 결과 출력을 세 범주로: **확인된 강점 / 확인된 개선 과제 / 미확인 · 추가 검증 권고.** 규칙: 답하지 않은 축을 개선 과제에 넣지 않는다 · 후보 근거를 강점 근거로 쓰지 않는다 · 새 수 · 점수 · 순위를 만들지 않는다 |
| 독립 실험 | `scripts/shared-core/content/three-way.ts` · `personas.ts` — 페르소나 넷 × Core 넷 = 16, 실험 규칙 16/16. **제품에 연결하지 않았다** |
| 바뀌지 않는 것 | 채점 · 축 판정 · 묶음(Z1~Z4) · 기존 합격 · 통과 판단 · 결과 모델의 기존 칸 |
| 바뀌는 것(승인 뒤) | 결과 모델에 `not_assessed` 를 담는 칸 또는 읽는 층의 분류 · 결과지 문장 · 판본(`me-v3-result-model` · `me-v3-result-copy`) |
| 하위 호환 | 이미 굳은 `v3_snapshots.result_model` 은 다시 만들지 않는다 — 새 칸이 없는 옛 줄을 읽는 층이 견뎌야 한다 |
| 롤백 | 판본을 되돌린다. 저장된 응답 · 스냅샷은 그대로 |
| 필수 회귀 | `v3:freeze:measure` · `v3:scoring` 4 Core · `integrity.ts`(C-UNSEEN · C-SKIP-CAL 이 PASS 로 바뀌고 나머지 398 은 그대로) · `personas.ts` · 결과지 동결 |
| 분류 | ASSESSMENT/SCORING CONTRACT (결과 모델) |
| 승인 | 총괄 PM |

## CC-009 파기 · 기한이 V3 표를 덮지 않는다 — R38 P0-C · **PROPOSED · 본체 소유**

| | |
|---|---|
| 재현 | `scripts/shared-core/p0-erasure.test.ts` (일회용 DB · 실제 `anonymizeUser()` · 6 PASS / 3 TODO). `user_id` 칸이 있는 표 34개 가운데 파기 목록 11 · 보존 목록 3 · **어느 목록에도 없는 표 20** |
| 남는 개인정보 (재현) | `v3_experiences`(제목 · 메모) · `campus_students`(**학번 · 학교 · 학과**가 같은 `users.id` 에 이어진 채) · `v3_applications`(기관 이름 · 메모) |
| 남는 개인정보 (스키마로 확인 · 행 재현은 안 함) | `auth_accounts.email` · `provider_account_id` · `outbox.to_addr` · `v3_pilot_participants.major_name`(자체 기한 있음) · `analytics_events` · `career_events.payload` · `v3_actions.body` |
| 기한 | `v3_experiences` · `v3_applications` 의 `purge_after` 를 고르는 제품 질의 0 · 운영 이미지 명령 0 (src · deploy 417 파일 · 정적) — 기한이 지난 메모가 DB 에 그대로 있다(재현) |
| 사용자 영향 | 탈퇴한 학생의 학번이 학교 명단과 이어져 사람이 특정될 수 있다 · 학생이 적은 자유입력이 파기되지 않는다 |
| 위험 | **법적 · 신뢰 차단 사유.** 두 번째 기관의 실학생 명단 전에 정해야 한다 |
| 바꿀 자리 (제안) | `src/lib/erasure.ts` 의 `REMOVE` · `KEEP` 에 20 표를 하나씩 **분류**한다(지움 · 남김 + 법적 근거 · 익명화). 남기는 표는 개인 칸을 비운다. `purge_after` 를 집행하는 운영 명령 하나 |
| 바뀌지 않는 것 | 응답 · 점수 보존 정책(KEEP 의 법적 근거) · 이미 굳은 결과 스냅샷의 판정 |
| 회귀 | `p0-erasure.test.ts` ER-FIX-1~3 이 TODO 를 벗고 통과 · `erasure:check` · 결과 · 담당자 집계(파기된 학생이 집계에서 어떻게 보이는가) |
| 데이터 이전 | 이미 파기된 계정에 남은 줄을 한 번 정리하는 일 — 운영 DB 쓰기라 별도 승인 |
| 권한 | 본체 총괄 PM · 사업주(개인정보) · 기관(학교 명단) |
| 시험의 한계 | `SC_SHIM_TX=autocommit` — 문장마다 커밋된다. 실패 때 되돌아가는지는 NOT VERIFIED |

## CN-001 근거를 세는 법 — 해석 메모 (계약 변경 아님)

| 수 | 정의 | 세는 자리 |
|---|---|---|
| 응시 근거 원시 고유 수 | `(attempt_id, domain_code, slot, item_text)` PK 행 수 | `v3_evidence_picks` |
| 확인된 근거 수 | 그 가운데 확인된 축(체크리스트 칸 = 그 축 · ARTIFACT = J5 · VERIFY = J6)에 걸린 것 | 스냅샷 `axes[].evidence_keys` |
| 후보 수 | 원시 고유 − 확인 | 같음 |

`did + decided + artifacts + verifications` 는 **세지 않는다**(재현 32 vs 고유 26). `did` 는 글로 합쳐 칸이 다른 같은
글을 하나로 센다(재현 PK 2 · did 1). 회귀: `integrity.ts` R-BIZ · R-CS-SLOT · E-CAND-*.

## STOP GATE — 참여자 학업 단계

전주대 J-4 와 세종 S-5. `v3_attempts.education_stage` 가 `bachelor · master · phd · postdoc` 넷이고 그 값이 학위
묶음 routing 을 고른다. 부트캠프 참여자나 구직자를 넣으려면 ① 기존 넷 가운데 하나로 옮겨 적거나 ② 값을 늘리고
routing · 문항 묶음 · 측정 동결을 다시 정해야 한다. ②는 측정 계약 변경이라 **이 세션은 착수하지 않는다.**
사업주가 ①을 고르면 Common Core 는 SC-1 의 `participant_model` 로 그 옮겨 적는 규칙만 담는다.
