# 전주대 R2 Parallel Tracks 보고

기준 커밋 `e3ccfd75`(R1) · 가지 `feature/jju-campus` · 2026-10-20

이 세션은 Track A~E 를 **차례로** 돌렸다. 격리 workspace 를 쓰지 않은 까닭은 트랙끼리 같은 DB 와 같은 fixture 를 써야 했기 때문이다. 대신 파일 소유를 아래 표대로 나누고 한 파일을 두 트랙이 고치지 않았다.

| 트랙 | 소유 파일 |
|---|---|
| A | `src/lib/jju/student.ts` · `src/app/jju/page.tsx` · `src/app/jju/jju.css` |
| B | `src/lib/jju/coverage.ts` · `scripts/jju-coverage.ts` · `docs/jju/r2/TRACK_B_COVERAGE.md` · `coverage.json` · `AI_CORE_REQUEST.md` |
| C | `src/lib/jju/report.ts` · `src/lib/jju/report-pdf.ts` · `src/app/jju/report/**` · `scripts/jju-report.ts` · `docs/jju/r2/track-c/**` |
| D | `scripts/jju-access.ts` · `src/lib/jju/login-guard.ts` · `docs/jju/r2/track-d/**` · (가드 연결) `scripts/jju-demo-setup.ts` · `scripts/jju-verify.ts` |
| E | `docs/jju/r2/evidence/network.txt` · `scripts/lab/offline/tsr` |
| 통합 | `docs/jju/r2/integration/regression.log` · `docs/jju/CHANGE_REQUESTS.md` · 이 문서 |

**공통 코드를 한 줄도 바꾸지 않았다.** 바뀐 경로는 전부 `src/lib/jju/` · `src/app/jju/` · `scripts/jju-*` · `scripts/lab/offline/` · `docs/jju/` 다. 공통 채점·문항·DB·API·인증, 다른 기관 가지, Production, 유료 인프라를 건드리지 않았다. 운영 데이터 대신 합성 QA 계정(`qa-jju-*` · `qa-pcu-*`)만 썼다.

## 판정 요약

| 트랙 | 판정 | 한 줄 |
|---|---|---|
| A 학생 플랫폼 | **NOT VERIFIED** (서버 함수 PASS) | 학생 상태 덩이는 서버 함수에서 다섯 상태 전부 맞다. 화면·모바일·E2E UI 는 Next 를 띄우지 못해 못 봤다 |
| B AI 교육과정·적합도 | **PASS** (문서 수준) | 문항 번호 단위 coverage · 미측정 목록 · 트랙 판정 · AI Core 요청 C10-R2 |
| C 학생별 결과·PDF | **CONDITIONAL PASS** | A/B/C 세 PDF 를 실제 Chromium 으로 뽑았고 9절 가운데 8절이 학생마다 갈린다. HTTP 다운로드 경로와 공통 PDF 연결(C9)은 미확인·미승인 |
| D 관리자·권한·격리 | **FAIL** (P0 · PASS 보류) | 결과 열람 격리와 ID 교체는 23가지 통과. **같은 아이디로 다른 학교 학생 줄이 바뀐다**(공통 `provisionStudent` · C16) |
| E 환경·브라우저 QA | **NOT VERIFIED** (차단 증거 제출) | npm registry DNS 실패 · jj.ac.kr CONNECT 403 · Docker 데몬 없음 |
| 통합 | **CONDITIONAL** | 회귀 17묶음 통과 · 보안 결함 하나 때문에 D 영역 PASS 보류 |

---

## Track A — 학생 플랫폼

**구현한 것.** 전주대 홈에 로그인한 학생의 지금 상태와 다음 한 걸음을 세운다(`jjuStudentStatus`).

- 상태는 다섯: `closed`(트랙 검사가 준비 중이면 시작 단추를 세우지 않고 그 사실을 적는다) · `start` → `/campus/jju/start` · `resume` → `/v3/{id}` 와 저장된 답 수 · `result` → 결과 · 전주대 리포트 · 리포트 PDF · 공통 결과 PDF · 경험 추가 · `retake`.
- **새로 판정하지 않는다.** 학교 학생인지는 `campusStudentOf`, 응시가 어디까지 왔는지는 `campusAttemptState`, 단추 말은 `CAMPUS_CTA_KO` 를 그대로 쓴다. 배재대 학교 진입이 쓰는 것과 같은 자다(PCU 비교는 코드 경로로 했다: 시작·이어하기·결과·재응시의 판정 함수가 같고 갈리는 것은 전주대 트랙 이름과 리포트 링크뿐).
- 보조 링크는 `<a>` 로 두었다. `Link` 의 미리 불러오기가 PDF 를 만들지 않게 하려는 것이다(이 저장소가 한 번 겪은 자리).

**검사.** `scripts/jju-access.ts` 6절 다섯 가지 통과(결과 · 시작 · 하는 중 답 1개 · 배재대 학생 null · 담당자 null).

**결함·미해결.**
- **화면을 못 봤다.** PC·모바일 캡처, 학생 E2E UI, 사람별 결과 화면 캡처 전부 NOT VERIFIED(Track E).
- **Slack-style Premium Home 레퍼런스 이미지가 이 세션에 첨부되지 않았다.** 그래서 그 레퍼런스를 적용하지 않았고 적용했다고 적지 않는다.
- 검사 시작이 막히는 트랙(`PREPARING`)은 숨기지 않고 `아직 열리지 않았습니다` 로 적는다.

## Track B — AI 교육과정과 전공 검사 적합도

**구현한 것.** `coverageOf(core, courseTopics)` 가 AI 역량 12개를 Core 문항 은행에서 **문항 번호로** 센다. 상태 넷을 섞지 않는다: `MEASURED`(판정 문항 `axis_level` 이 직접 묻는다) · `SELF_REPORT`(체크리스트 문구에만) · `CURRICULUM`(공식 과정만) · `NOT_MEASURED`. **점수를 만들지 않는다.**

- 측정: CS 기계학습 모형 평가·개선(Core 12 · 팩 14) · CS 데이터 처리(2) · EE 센서(Core 14) · EE 통계(측정 분포 수준) · ME 통계.
- 교육과정만: 파이썬 · 시각화 · 딥러닝(세 Core 모두).
- 미측정: LLM·생성형 AI · 컴퓨터 비전 · MLOps · 엣지 AI · 로봇 인지(세 Core 모두).
- 트랙 판정: AI·데이터 부분 적합 · **LLM 응용 부적합** · AIoT 부분 적합 · 피지컬 AI 부분 적합 · **스마트팩토리 부적합**. 트랙이 약속하는 역량은 트랙 이름에서 읽은 가정이다.
- AI 기초 과정(사업주 확인 · S2)과 ND1~ND6(`EXISTS_DETAIL_UNVERIFIED`)을 갈라 적었다.

**증거.** `TRACK_B_COVERAGE.md` · `coverage.json` · `AI_CORE_REQUEST.md`(C10-R2: CS 판본 올림 / AI_CORE_V1 신설 / 트랙 이름 조정 셋 가운데 하나를 사업주와 Core 담당이 정한다).

**결함.** 오탐 둘을 고쳤다(`모형` 이 EE 시뮬레이션 모형에 걸림 · `편차`·`불확도` 가 통계로 걸림). 통계 키를 `통계|분포|유의|회귀|표본` 으로 좁히고 이름을 `측정 분포 수준 포함` 으로 밝혔다.

## Track C — 학생별 결과와 Gold Master PDF

**구현한 것.**
- `jjuReportFor(attemptId, userId)`: 등록부 → **본인 응시인가**(`attemptOf`) → 전주대 응시인가 → 채점됐는가 순으로 막고 HTML 9절을 만든다. 실패는 `NOT_FOUND`·`NOT_JJU`·`NOT_SCORED`·`NO_REGISTRY` 넷.
- `jjuReportPdf(html)`: playwright 로 A4 를 뽑는다.
- 경로 둘: `/jju/report/[attemptId]`(HTML) · `/jju/report/[attemptId]/pdf`(첨부). 둘 다 `requireUser` 뒤 같은 함수를 부르고 남의 응시는 404 다.
- 리포트 `jju-report.3`: 2절에 AI 역량 표(이 검사에서 · 이 학생이 답한 판정 문항 수), 3절 직무·산업은 **확인된 영역이 있을 때만** 근거 영역과 함께 적는다(근거 없는 추천 0), 6절 AI 학습·프로젝트 전략은 측정된 역량과 판정 밖 역량을 갈라 문항 번호를 든다. 이번에 **팩에만 문항이 있는 역량**(CS 의 센서 · 모빌리티 팩 1개)을 `측정(팩만)` 으로 갈랐다: `측정` 한 마디면 모든 학생이 재어지는 것으로 읽힌다.

**같은 문장이 나온 까닭.** 세 자리이고 셋 다 공통 코드다.
1. 묶음 머리의 이끄는 줄이 묶음 코드마다 한 줄로 고정(`headlineLead`) → 같은 묶음 학생 A·C 가 같은 줄 → **C12**. 전주대 리포트는 1절 이끄는 줄을 그 학생의 머리글과 `응답에서 확인된 예` 로 세워 우회했다.
2. 빈자리 까닭이 영역마다 같은 줄로 반복 → **C13**. 전주대 리포트는 같은 까닭을 묶어 한 번 적는다(`groupGaps`).
3. CS·EE 번역 보기가 기계공학 말 → **C11**.

**검사.** `scripts/jju-report.ts` 13 / 13: 세 학생 모두 리포트와 PDF 가 서고, 학생별로 갈린 절 1·2·3·5·6·7·8·9, 첫 절 이끄는 줄 셋 다 다름, 3절에 근거 없는 연결 없음, ID 교체 `NOT_FOUND`, 담당자 `NOT_FOUND`, 배재대 본인 응시 `NOT_JJU`, 없는 번호 거절.

**증거.** `track-c/pdf/jju-report-{A,B,C}.{html,pdf}` · `track-c/png/jju-report-{A,B,C}-{1..3}.png`(쪽 그림) · `report-web-B-{1440,390}.png`(가로 넘침 0) · `link-table.md`(응답 → 결과 → 리포트) · `report-text.json`.

**미해결.**
- `/jju/report/...` 의 **HTTP 다운로드는 못 눌렀다**(Next 를 띄우지 못함). 경로가 부르는 함수는 같다.
- 공통 `/v3/{id}/result/pdf` 에 학교 절을 붙이는 일은 공통 PDF 엔진 변경이라 **C9 승인 요청**으로 남겼다. 학생이 지금 받는 공통 PDF 에는 전주대 9절이 없다.

## Track D — 관리자·권한·격리

**검사**(`scripts/jju-access.ts` · 실제 PostgreSQL · 해시는 offline scrypt 대체기라 **인증 라이브러리 재검증은 NOT VERIFIED**).

- 결과 접근 행렬(`track-d/access-matrix.md`): A 의 응시를 본인만 연다. 같은 학교 학생 · 전주대 담당자 · 배재대 학생 · 배재대 담당자는 응시·결과·공통 PDF·전주대 리포트 전부 404.
- 담당자 범위: 전주대 → 전주대, 배재대 → 배재대 · 명단에 남의 학교 학생 0 · 집계가 겹치지 않는다(JJU 3 · PCU 1).
- ID 교체: 계정 멈춤 · 비밀번호 재발급 · 재응시 허용에 배재대 학생 번호 → 전부 거절. 학생 추가와 CSV 에 배재대 학과 코드 → 거절.
- 개인 결과 열람(`canReadParticipantReport`): 계약·동의 없이 막힘(C14).

**P0 결함 — C16.** 전주대 담당자가 `학생 추가` 에 **배재대 학생과 같은 아이디**를 넣으면 성공으로 응답하고, 그 배재대 학생의 `campus_students` 단과대학·학과·갈래가 전주대 값으로 바뀐다. 학교 칸은 PCU 로 남아 그 학생의 학교 맥락이 깨진다. 기본 아이디가 학번이라 실제로 난다. `rotate` 경로(`pcu-students` · `staging-bootstrap`)는 비밀번호와 소속까지 덮는다(코드 읽기 · 되돌릴 수 없어 실행하지 않음). 검사는 고친 줄을 원래 값으로 되돌렸다.

- 원인은 공통 `src/lib/campus/students.ts` 의 `provisionStudent()` 가 아이디 충돌 때 학교를 보지 않는 것이다. 공통 코드라 고치지 않고 **C16** 으로 넘겼다.
- 전주대가 소유한 스크립트는 `src/lib/jju/login-guard.ts` 가 들어가기 전에 막는다(다른 학교 학생 · 개인 회원 · 담당자의 아이디 거절). 가드 세 가지 통과. **담당자 화면 경로는 C16 전까지 열려 있다.**

**판정.** `보안·권한 결함이 발견되면 그 영역의 PASS 를 보류한다` 에 따라 **FAIL**.

**미해결.** 실제 bcrypt(`bcryptjs`)와 Auth.js 쿠키·미들웨어·302·URL 직접 접근은 제품 서버를 띄우지 못해 NOT VERIFIED. 동의·계약 기능(C14)은 변경 요청으로만 남겼다.

## Track E — 환경·브라우저 QA·회귀

**차단 증거**(`evidence/network.txt` · 2026-10-20T08:25Z):
- `registry.npmjs.org`: DNS 응답 없음, 직접·프록시 둘 다 `Could not resolve host`.
- `www.jj.ac.kr` · `app.careermatri.com`: 프록시가 CONNECT 에 403(`connect_rejected`).
- Docker: 데몬 소켓 없음. 저장소 `node_modules` 0개, next/react 패키지 0개.

우회 프록시·외부 미러를 쓰지 않았다. 유료 Railway 서비스를 만들지 않았다.

**NOT VERIFIED 장부.**

| 항목 | 상태 | 풀리는 조건 |
|---|---|---|
| `npm ci` · `npm run build` | NOT VERIFIED | 환경 네트워크에서 `registry.npmjs.org` 허용 |
| 오프라인 대체기 vs 실제 패키지 비교 | NOT VERIFIED | 위와 같음 |
| `deploy/Dockerfile.jju-demo` 빌드 | NOT VERIFIED | Docker 데몬 · 승인된 격리 실행 |
| PC·모바일 화면 캡처(전주대 홈·검사·결과·담당자) | NOT VERIFIED | Next 실행 |
| 실제 bcrypt·Auth.js·미들웨어 | NOT VERIFIED | Next 실행 |
| `/jju/report/*` HTTP 다운로드 | NOT VERIFIED | Next 실행 |
| 전주대 공식 쪽 원문 재수집 | NOT VERIFIED | `www.jj.ac.kr` 허용 |
| 운영 배포본 | 손대지 않음 | — |

네트워크 허용 방법: https://code.claude.com/docs/en/cloud-environments#network-access

**한 일.** 오프라인 실행기(`scripts/lab/offline/tsr`)를 `--experimental-transform-types` 로 올려 파라미터 프로퍼티를 쓰는 공통 코드도 돌게 했다. 실제 PostgreSQL 16 과 실제 Chromium(리포트 HTML·PDF)은 돌았다.

## 통합 QA

`integration/regression.log` 가 전부다. 요약:

- 공통 회귀 14묶음 전부 rc=0(campus · 채점 ME·CS · 측정 동결 · 검사/결과/작업공간/Core UI 동결 · majors · result · student · db:chain · pcu:dept · Dockerfile drift). **동결 다섯이 기록을 다시 적지 않은 채로 통과** → 공통 화면·채점·문항을 건드리지 않았다는 증거.
- 전주대: verify 42 / 42 · report 13 / 13 · access 23 / 26.
- typecheck: 새 전주대 파일의 실제 오류 0. 남은 오류는 패키지 타입이 없어 나는 것이고 공통 화면에서도 같은 모양으로 난다.
- 충돌: 한 파일을 두 트랙이 고친 자리 0. 공통 코드 diff 0.

이번에 고친 검사 하나: `jju-verify` 의 `JJU 집계 시작 수 === 3` 이 다른 검사가 남긴 전주대 응시 하나 때문에 걸렸다(PCU 누출이 아니었다). 기대값을 DB 의 전주대 응시자 수로 바꾸고, `jju-access` 는 자기 확인용 응시를 치운다.

| 통합 항목 | 결과 |
|---|---|
| 충돌 검토 · 공통 코드 확인 | PASS |
| typecheck / build | typecheck 부분 PASS · build NOT VERIFIED |
| 학생 E2E | 서버 함수 PASS · 화면 NOT VERIFIED |
| 3인 개인화 | PASS (8 / 9 절 갈림) |
| PDF 생성·다운로드 | 생성 PASS · HTTP 다운로드 NOT VERIFIED |
| 관리자 권한 · 격리 | **FAIL (C16)** |
| PC·모바일 시각 확인 | 리포트 HTML 만 PASS · 제품 화면 NOT VERIFIED |
| PCU 회귀 | PASS (`campus:check` · `pcu:dept` · 동결) |

## 사람이 할 일

1. **C16 을 Core 세션에 넘긴다.** 닫히기 전까지 전주대와 배재대를 같은 운영 DB 에서 동시에 열지 않는다.
2. 환경 네트워크에서 `registry.npmjs.org` 를 허용하면 build · 화면 캡처 · 실제 인증 재검증을 다음 회차에 바로 돌린다.
3. C9(공통 PDF 에 학교 절) · C10-R2(AI Core 선택지) · C1(시연용 Railway 서비스 · 유료) 승인.
4. Slack-style Home 레퍼런스 이미지를 첨부해 주면 Track A 를 그 기준으로 다시 돈다.

배포하지 않았고 다른 기관 가지에 합치지 않았다.
