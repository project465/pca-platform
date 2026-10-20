# 전주대학교 CareerMatri — R1 실행 검증 보고

가지 `feature/jju-campus` · 기준 `4f02d79b`(R35 출시 차단 해소) · 앞 커밋 `29ff7af7`.
main · 배재대 가지 · Production · 운영 DB 는 건드리지 않았다. 병합·배포·유료 인프라 생성 없음.
문항(Q1~Q92 포함 전 Core 은행) · BASIC48/STANDARD68/PRO92 · 채점 엔진 · 공통 DB/API/인증 계약을 한 줄도 고치지 않았다.

## 최종 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| P0 공식 사실 정정 · 시연 분류 분리 | **PASS** | fixture `official_program`(사실 6 · 출처 2 · 확인일 · 상태) · 화면 셋이 두 층을 따로 그린다 |
| 서버 쪽 E2E (발급 → 응시 → 저장 → 이어하기 → 중복 제출 → 재조회) | **PASS** | `jju-verify.log` 42 / 42, 실제 PostgreSQL 16 |
| A·B·C 차별화 (공통 엔진) | **PASS** (결함 후보 2) | `ABC_COMPARISON.md` · 판정 지문 셋이 전부 다르다 · A·C 첫 줄 문구가 같다(C12) |
| JJU / PCU 격리 | **PASS** (서버 함수 수준) | 집계·명단·권한 함수 9가지 |
| 트랙–Core 감사 | **PASS** (발견: AI 하위 주제 6개 미측정) | `TRACK_CORE_AUDIT.md` · C10 |
| 학생별 JJU 리포트 9절 구조 + PDF 3벌 | **CONDITIONAL PASS** | 구조·PDF 생성됨. 제품 PDF 경로가 아닌 시안이고 학생 화면에 걸리지 않았다(C9) |
| Dockerfile 선택지 B | **CONDITIONAL PASS** | 파일·드리프트 검사 있음. `docker build` 는 돌리지 못했다 |
| 기존 회귀 (측정·채점·동결·등록부) | **PASS** | 아래 5절 13묶음 |
| 브라우저 화면 · 모바일 · 3~5초 파악 · 9장 캡처 | **NOT VERIFIED** | npm registry 차단으로 Next 빌드 불가 |
| 운영 · Staging | **NOT VERIFIED** | 배포하지 않았다 |

**종합: CONDITIONAL PASS (서버·데이터·리포트 구조) / NOT VERIFIED (화면).**
`JJU 학생이 실제 검사를 진행하고 결과를 확인하는 E2E` 가운데 **서버 쪽은 증거가 있고 화면 쪽은 없다.**
화면 증거 없이 완료를 선언하지 않는다.

## 1. 커밋과 diff

이 보고와 같은 커밋. 바뀐 파일은 2절. 해시는 커밋 메시지와 채팅 보고에 적는다.

## 2. 파일

| 파일 | 새/고침 | 무엇 |
|---|---|---|
| `scripts/fixtures/campus-jju.json` | 고침 | `official_program`(공식 사실·출처·확인일·상태·과정) · Catalog 를 `DEMO_CLASSIFICATION` 으로 · 열린 질문 갱신 |
| `src/lib/jju/program.ts` | 고침 | `officialProgram()` · `FACT_STATUS_KO` · 두 층 원칙 |
| `src/app/jju/page.tsx` · `fields/page.tsx` · `admin/page.tsx` · `parts.tsx` · `jju.css` | 고침 | `사업 개요(공식 출처)` 절과 `검사 연결 트랙(시연용 분류)` 절을 가름 · `OfficialFacts` |
| `src/lib/jju/report.ts` | 새 | 학생 리포트 9절 구조(결과 모델만 읽는 순수 함수) + A4 HTML |
| `scripts/jju-verify.ts` | 새 | 서버 함수 E2E · A·B·C · 격리 (42가지) |
| `scripts/jju-report.ts` | 새 | 굳은 결과 → 9절 → HTML/PDF |
| `scripts/jju-track-audit.ts` | 새 | 트랙–Core 감사 → `TRACK_CORE_AUDIT.md` |
| `scripts/jju-abc-doc.mjs` | 새 | `abc-results.json` → `ABC_COMPARISON.md` |
| `deploy/Dockerfile.jju-demo` · `scripts/jju-dockerfile-drift.mjs` | 새 | 선택지 B 와 드리프트 검사 |
| `scripts/jju-demo-setup.ts` | 고침 | null 처리만(형 없이도 좁혀지게) |
| `scripts/lab/offline/` | 새 | 검증 전용 실행기(대역). 제품·이미지에 들어가지 않는다 |
| `docs/jju/*` · `docs/jju/qa/*` | 새 | 이 보고 · 비교 · 감사 · 요청 · 로그 · PDF |

## 3. 동작하는 것

- 전주대 fixture 로 선 학교에서 트랙(학교 자리) 맥락으로 학생 발급 → 학교 맥락 응시(BASIC 을 넘겨도 PRO) → 화면 차례대로 저장 → 12화면에서 끊고 다시 들어오면 **같은 응시 · 같은 답 22개 · 같은 화면**(`sweep-interest-2`) → 끝까지 → 동시 제출 둘에도 스냅샷 1줄 → 다시 제출해도 1줄 → 결과 두 번 읽어 글자까지 같음.
- 담당자 집계(`campusV3`)·명단(`listStudents`)·상태 수(`studentCounts`)가 JJU 와 PCU 를 섞지 않는다. JJU 담당자는 PCU 기관에 `canInOrg` 거절, 개인 결과는 계약·동의 없이 거절, 남의 기관이면 계약·동의가 있어도 거절.
- 공식 사실 6개가 출처·확인일·상태와 함께 홈·교육과정·사업단 화면과 리포트 9절에 선다. 사업비 줄에는 `CareerMatri 계약 예산이 아니다` 가 붙는다. ND1~ND6 은 `있음·세부 미확인` 으로만 적힌다.

## 4. 만들지 않았거나 동작을 확인하지 못한 것

- 학생·담당자 **화면**(로그인 · 홈 · 진행 · 결과 · Evidence/Gap · Action · PDF 내려받기 · 관리자) — 코드는 있으나 이 세션에서 띄우지 못했다. **NOT VERIFIED.**
- 학생이 받는 JJU 전용 PDF — 구조와 시안 PDF 만 있다(C9).
- 담당자 개별 결과·PDF 열람 — 공통 규칙상 닫혀 있다(C14). 열지 않았다.
- AI 하위 주제(딥러닝·LLM·비전·MLOps·엣지·로봇 인지) 측정 — 어느 Core 에도 없다(C10).
- 교육 전후 변화 · 전북 기업 자료 — 없음. 지어내지 않았다.

## 5. 시험 기록

`docs/jju/qa/jju-verify.log` 와 `docs/jju/qa/logs/*.log` 가 원본이다.

| 묶음 | 결과 | 규격 시험 항목 |
|---|---|---|
| `jju-verify.ts` | 42 / 42 | 발급(로그인 계정)·이어하기·중복 제출·결과 재조회·3인 차별화·관리자 명단·PCU/JJU 격리 |
| `campus-check` | 80 / 80 | 등록부 정본(fixture 없이) — PCU 회귀 |
| `v3-scoring` ME / CS | 31 / 31 · 31 / 31 | 채점 회귀 |
| `v3-measurement-freeze` | 14 / 14 | 측정 동결(기록을 다시 적지 않음) |
| `v3-freeze` · `v3-result-freeze` · `v3-workspace-freeze` | OK · OK · OK | 화면 동결 21 · 25 · 53벌 그대로 |
| `v3-majors` · `v3-result` · `v3-student` · `db-chain` | 18 · 25 · 79 · 8, 걸림 0 | Core·결과·학생 언어·DB 차례 |
| `pcu-dept` | 걸림 0 | PCU 학과 콘텐츠 회귀 |
| `jju-dockerfile-drift` | 덩이 3 · 그 밖 운영과 같음 | 선택지 B |
| 로그인(화면) · 권한 없는 접근(HTTP) · 모바일 | **NOT VERIFIED** | 브라우저 필요 |

**어떻게 돌렸나.** npm 패키지가 없어 `scripts/lab/offline/` 의 대역(pg 프로토콜·scrypt 해시·next 요청 함수·메일)을 끼우고
Node 22 로 TypeScript 를 그대로 돌렸다. DB 는 이 기계의 PostgreSQL 16 에 `deploy/db-chain.json` 19파일을 그대로 올린 것이다.
해시 대역 때문에 **로그인 비밀번호 검증은 제품 bcrypt 로 재지 않았다** — 로그인은 NOT VERIFIED 로 둔다.

## 6. 캡처

**0장. NOT VERIFIED.** 필수 9장(홈 PC · 홈 모바일 · 전공·교육과정 · 검사 시작 · 검사 진행 · 결과 · Evidence/Gap · 개인 PDF · 관리자)
모두 찍지 못했다. `scripts/jju-shots.ts` 가 있지만 **스크립트가 있는 것은 실행 증거가 아니다.**
리포트 PDF 시안의 그림(`docs/jju/qa/pdf/*.pdf`)은 제품 화면 캡처가 아니다.

## 7. 3인 비교

`docs/jju/ABC_COMPARISON.md`. 요약:

| | A AI 기초 강·실무 적음 | B 프로그래밍·프로젝트 강·직무 이해 약 | C 전공 기초·AI 근거 부족 |
|---|---|---|---|
| 묶음 | 기계학습·데이터 분석 Z2 | 4영역 Z1(근거 있음) | 3영역 Z2 |
| 확인/직접 정함 | 2 / 0 | 32 / 8 | 3 / 0 |
| 첫 할 일 | 자료구조 짧은 과제 | 설계 과제 요구→조건 | 알고리즘 실측 비교 |
| 이어 볼 일 | 탐색·연구 | 설계·개발 · 시험·검증 · 통합·조정 | 빌드·배포 자동화 · 해석·예측 |

결함 후보: A·C 의 badge·lead 가 같다(C12) · B 의 Gap 넷이 같은 까닭 문장(C13) · CS 경험 번역 보기가 기계공학 말(C11) ·
세 사람 모두 `고른 산업·직무` 가 같다 — **이것은 시험 쪽 선택**(첫 팩을 고르게 했다)이고 결함이 아니다.

## 8. PDF 3벌

`docs/jju/qa/pdf/jju-report-{A,B,C}.pdf`(2 · 3 · 2쪽) · 같은 이름의 `.html` · 본문 글자 `report-text.json`.
9절: 개인 진단 요약 · 전공·AI 지식과 실무역량 · 산업·직무 탐색 · 조직 유형과 그 근거 · Evidence/Gap ·
학습·프로젝트 경험 활용 · 자기소개서·면접·포트폴리오 전략 · 우선순위 Career Action · 근거 출처와 검증 상태.
머리에 `구조 시안 · 합성 QA 학생 · 제품 PDF 경로가 아님` 이 붙는다. 기업 이름 추천 0 · 점수·백분위·적합도 0.

## 9. 관리자 격리 증거

`jju-verify.log` 5절. JJU 시작 3 · PCU 시작 1 이 서로 섞이지 않고, 학과 칸은 5명 미만이라 **값을 만들지 않는다**(가린 것이 아니다).
화면에서의 학교 범위는 `campusViewer()` 가 담당자의 소속 기관 코드로 정하고, 그 소속이 JJU 하나뿐임을 확인했다.
**화면에서 주소를 바꿔 PCU 를 여는 시도는 브라우저로 재지 못했다(NOT VERIFIED).**

## 10. 변경 요청

`docs/jju/CHANGE_REQUESTS.md` C1~C15.

## 11. 시연 서버 띄우는 법

선택지 B. Railway 에 **새 환경·새 Postgres·새 서비스**(유료라 승인 뒤, C1).

1. 서비스 Dockerfile 경로 `deploy/Dockerfile.jju-demo`, 가지 `feature/jju-campus`.
2. 변수: `APP_ENV=staging` · `STAGING_BASIC_AUTH` · `DATABASE_URL`(새 DB) · `AUTH_SECRET` · `PLATFORM_URL` ·
   `V3_CAMPUS_FIXTURE=/app/scripts/fixtures/campus-jju.json` · `V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1`.
3. 컨테이너에서 `npm run db:init`(빈 DB) → `JJU_DEMO_REMOTE=yes APPLY=yes node ops/jju-demo-setup.cjs`(합성 자료, 비밀번호 한 번만 표시).
4. `APP_ENV=production` 이면 fixture 와 미리보기가 둘 다 꺼진다 — 운영 서비스에 이 이미지를 물리지 않는다.

이 세션에서 1~4 는 **하지 않았다**(승인 전 유료 인프라 금지 · 네트워크 차단).

## 12. 설치 실패 분석

- `npm ci` / `npm install`: `registry.npmjs.org` DNS 실패(ENOTFOUND), 프록시 CONNECT 403. 로컬 npm 캐시에는 전역 도구 패키지뿐이고 next·react·pg 가 없다.
- `www.jj.ac.kr`: Bash 와 WebFetch 둘 다 ENOTFOUND. 그래서 공식 사실은 **사업주가 옮겨 준 문면 + URL** 로 적고 상태를 `CONFIRMED_BY_OWNER` 로 두었다(`VERIFIED` 아님).
- 우회 프록시·외부 미러를 쓰지 않았다.
- 운영 이미지 쪽 문제는 별개다: `Dockerfile` 이 `scripts/fixtures` 를 옮기지 않아 시연 fixture 가 이미지에 없다 → 선택지 B.
- 풀리는 길: 환경 네트워크 설정에서 `registry.npmjs.org` 허용(C15). 그러면 `npm ci && npm run build` 뒤
  `scripts/jju-shots.ts` 로 9장을 찍고 이 보고의 NOT VERIFIED 줄을 바꾼다.
