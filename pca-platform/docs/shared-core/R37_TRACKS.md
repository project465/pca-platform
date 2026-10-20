# R37 통합 진행 현황 — Gate P0 + Track A~F

상태 값: `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `READY FOR REVIEW` · `VERIFIED`.
**VERIFIED 는 실행 증거가 있다는 뜻이고 PM 의 PASS 가 아니다.** 체크리스트 개수로 진행률을 세지 않았다.
`—` 는 이번 회차에 그 칸의 일을 하지 않았다는 뜻이다(완료가 아니다).

## 1. Track 표

| Track | 현재 작업 | 구현 | 테스트 | 검증 | 차단 사항 |
|---|---|---|---|---|---|
| Gate P0 | SC-2 학번 충돌 · 재설정 · 응시 소유 · ADJ-1 · 동결 | READY FOR REVIEW (패치 · SQL 제안만 · **미적용**) | VERIFIED (shim) — P0 21개: 지금 10 PASS / 11 TODO · 수정 사본 14 PASS / 6 SKIP / 1 TODO · ADJ-1 6/6 | READY FOR REVIEW | 적용 승인(총괄 PM · 사업주 · 배재) · 2단계(기관 코드 로그인) 미설계 · 실제 `pg` · next-auth 미검증 · 운영 DB 미확인 |
| A | Assessment — 문항 · 등급 범위 인벤토리 | — | IN PROGRESS — 문항 344~369 · 등급별 분포 · BASIC 사례 C10 | NOT VERIFIED | 전공별 중복 · 누락 · 편향 분석은 전공자 자료가 필요하다 |
| B | Scoring — 재현성 · 불변식 · 경계 입력 | — (채점 규칙 변경 없음) | VERIFIED — 결정성 44/44 · 불변식 396/396 · `v3:scoring` 4 Core 31/31 (golden 그대로) | READY FOR REVIEW | 비정상 응답은 C04 · C07 · C08 셋만 · 정규화 분석 없음 |
| C | Major / Industry / Role — 관계 구조 | — | IN PROGRESS — 20 Core 관계 깨짐 0 · 중복 0 · 고아 0 | NOT VERIFIED | 매핑의 **내용**이 맞는지는 구조 검사로 답할 수 없다(전공자 검토) |
| D | Evidence / Gap — 네 목록 의미 · 중복 집계 · 기준시점 | READY FOR REVIEW (해석 · CC-006 후보 · 회신 초안 · 코드 변경 없음) | VERIFIED — evidence-aggregation 5/5 · exp-timepoint 4/4 | READY FOR REVIEW | CC-006 시점 결정 · 파기 경로(정적 발견) |
| E | Personalization — 차별성 기준선 | — (결과 계약 변경 없음) | VERIFIED (기준선) — 할 일 40/68 · 머리글 14/44 · 판정 다른데 글 같은 짝 6/20 | READY FOR REVIEW | CC-008(빈자리 범위) 결정 |
| F | Integration — SC-1 계약 · 보호 묶음 · 격리 | IN PROGRESS — SC-1 판본 검사 한 줄(미연결) | VERIFIED (부분) — SC-1 33/33 · 보호 11/11 · 격리는 P0 FIX-7(shim) | NOT VERIFIED (E2E) | npm 막힘 → 전체 typecheck · 브라우저 · PDF · next-auth E2E 를 못 돌린다 |

## 2. 검증된 것 · 검증하지 못한 것

| 검증됨 (실행 증거) | 검증하지 못함 |
|---|---|
| P0 재현 여덟 · 배재 호환 둘(지금 코드) | 실제 `pg` 패키지로 같은 시험 (shim 결과다) |
| 수정 사본에서 FIX 열 · 보호 11 | 실제 next-auth 로그인 · JWT |
| ADJ-1 재부착 · 수정안 멱등 · 탐지 SQL 읽기 전용 | 운영 DB 에 겹친 학번 · 시연 표시가 있는가 |
| 네 목록 관계 · 중복 집계 · 글자 충돌 | GM 가지의 실제 27 행 응시 (그 DB 를 못 봤다 · 같은 모양만 재현) |
| 스냅샷 불변 · live 경험 변동 | PDF 를 실제로 그려 경험이 빠지는지 (정적 판단) |
| 벤치마크 44 사례 · 불변식 · 결정성 | 합성 밖의 실제 응답 · 학술 타당성 · 추천 정확성 |
| SC-1 원천 충돌 · 판본 · 코드 경계 | **프로젝트 전체 typecheck** (부분 13 파일만 TSC_EXIT=0) |
| 동결 · 채점 · DB 사슬 · 등록부 지문 | 브라우저 · 운영 배포본 |

## 3. 결함 우선순위

| # | 결함 | 분류 | 근거 | 상태 |
|---|---|---|---|---|
| P0-1 | 두 번째 학교가 같은 학번을 올리면 계정 · 비밀번호 · 소속 · 응시가 넘어간다 | AUTH/IDENTITY | REPRO-2~6 | 패치 제안 · **두 번째 학교 명단 전에 승인 필요** |
| P0-2 | upgrade 를 다시 부을 때마다 학교 학생이 시연이 되어 담당자 화면에서 빠진다 | DB/API CONTRACT | ADJ-1b | 별도 SQL 제안 · 차례에 넣지 않음 |
| P0-3 | 1단계 뒤에도 다른 학교 학생이 학번만으로 제 계정에 못 들어간다 | AUTH/IDENTITY | RISK-1 (TODO) | 2단계 설계 전 |
| P1-1 | GM 이 근거를 네 목록 합으로 센다 → 중복 (사례 32 vs 고유 26) | 해석 (계약 변경 아님) | E3 | 회신 초안 · **보내지 않음** |
| P1-2 | GM PDF 가 live 경험을 읽어 같은 응시의 종이가 바뀐다 | DB/API CONTRACT | TP-1 · TP-2 | CC-006 후보 |
| P1-3 | 파기가 `v3_experiences` 를 지우지 않는다 · `purge_after` 집행 자리 없음 | 개인정보 (본체 소유) | 정적 grep | 기록만 · 고치지 않음 |
| P2-1 | 비필수 · 미요청 축 무응답이 결과지 빈자리 · 할 일에 안 선다 → 판정 다른데 글 같은 짝 6/20 | ASSESSMENT/SCORING CONTRACT | 벤치마크 `gaps_d1` | CC-008 검토 항목 |
| P2-2 | 같은 영역에서 ARTIFACT · VERIFY 칸에 같은 글 11곳 → `did` 가 하나로 합친다 | DATA ONLY (측정 동결 안) | 데이터 품질 스캔 · E5 | 기록만 |
| P2-3 | 같은 판본 이름으로 칸 이름이 바뀐 등록부는 Core 0 개 프로필로 선다 | SHARED CORE INTERNAL | T25 | 판본을 올리면 걸린다 · 남은 자리 기록 |
| P3-1 | 머리글 다양성 14/44 | 정보 | 벤치마크 | 기준선 |

## 4. 실제 변경 파일 (기준 `60f04ad8`)

| 파일 | 분류 | 무엇 |
|---|---|---|
| `src/lib/shared-core/tenant/campus.ts` | SHARED CORE INTERNAL | 읽는 법을 아는 등록부 판본만 받는다(`KNOWN_CAMPUS_SCHEMAS`) · 미연결 |
| `scripts/shared-core/tenant-profile.test.ts` | 테스트 | T21~T26 |
| `scripts/shared-core/p0-login-collision.test.ts` | 테스트 | FIX-8 · 9 · 10 · RISK-1 · 빈 통과 막는 전제 |
| `scripts/shared-core/p0-demo-remark.test.ts` | 테스트 | ADJ-1a~e · DET-1 |
| `scripts/shared-core/evidence-aggregation.test.ts` | 테스트 (새) | E1~E5 |
| `scripts/shared-core/exp-timepoint.test.ts` | 테스트 (새) | TP-1~4 |
| `scripts/shared-core/bench/{cases,run,inventory}.ts` · `table.mjs` | 테스트 (새) | 벤치마크 v1 |
| `scripts/shared-core/test/typecheck.sh` | 테스트 | 벤치마크 · Evidence 검사까지 부분 타입 검사 |
| `docs/shared-core/proposed/adj1-campus-students-not-demo.sql` | DB/API CONTRACT (제안 · 미적용) | ADJ-1 수정안 |
| `docs/shared-core/{R37_*.md, CONTRACTS.md, SC1_TENANT_PROFILE.md, README.md}` · `handoffs/` | 문서 | |
| `docs/shared-core/evidence/R37/**` | 증거 | 로그 · 관찰값 |

보호 경로(`db/` · `deploy/` · `src/lib/campus` · `src/lib/auth.ts` · `src/app` · `src/lib/me-v3` ·
`sites` · `assessment` · `content` · `package.json` · lockfile) diff **0 줄**
(`evidence/R37/protected-diff.txt`). `db-chain.json` `9688a926…` · 학교 등록부 `b029cf0a…` 그대로.

## 5. 다음 회차 실행 순서

1. **P0-1 · P0-2 승인 판단** — 두 번째 학교가 명단을 올리기 전. 승인되면 Staging 에서 패치 적용 → `campus:walk` ·
   `pcu:campus`(브라우저) → ADJ-1 파일을 차례 맨 뒤에
2. 운영자 승인 뒤 탐지 SQL(`r36_p0_detect.sql`)을 운영에서 한 번 — D1~D4 · ADJ1 수를 받는다
3. 회신 초안을 보낼지 사업주가 정한다 → GM 의 근거 세는 법을 고유 열쇠로
4. CC-006 시점(A1 · A2) 결정 · 파기 경로(P1-3)를 본체와 같이 정한다
5. CC-008 결정(빈자리 범위)
6. npm 이 열리는 환경에서 전체 typecheck · 실제 `pg` · next-auth · 브라우저 E2E (Track F)
7. Track A · C 의 내용 검토를 전공자 자료로
