# 전주대학교 AI·첨단산업 부트캠프 MVP: 1차 보고

작성 2026-10-20 · 브랜치 `feature/jju-campus`

## 판정

`CODE WRITTEN / NOT RUN / SCREENSHOTS NOT TAKEN / PRODUCTION UNTOUCHED`

이 세션의 네트워크 정책이 npm 레지스트리(`registry.npmjs.org`)를 막았다.
게이트웨이가 CONNECT 에 403 을 주어 의존성을 하나도 설치하지 못했다. 그래서
앱을 빌드하지도 띄우지도 못했다. 아래 화면 코드와 스크립트는 **문법만**
확인했고(TypeScript transpile) 실제 브라우저 스크린샷은 한 장도 없다.
찍지 않은 그림을 찍었다고 적지 않는다.

## 0. 개발 기준

| 항목 | 값 |
|---|---|
| 작업 브랜치 | `feature/jju-campus` |
| 기준 커밋 | `4f02d79b` (R35 출시 차단 해소 · 배재대 개발 가지의 R35 마지막 커밋) |
| 옮긴 방법 | main(`0079cd8`)에서 **fast-forward 만**. 강제 초기화 없음 · 다른 세션의 커밋을 덮지 않음 |
| 뺀 것 | `4f02d79b` 뒤의 PDF Gold Master 커밋 여섯(Human Review 대기 중이라 기준에 넣지 않았다) |
| 손대지 않은 가지 | `main` · `claude/careermatri-screen-review-p0c8kb`(배재대) · `claude/amazing-thompson-w3f2o2`(Production) |
| 배포 | 이 가지를 보는 Railway 서비스가 없다. 푸시해도 배포되지 않는다 |

## 1. 만든 것 (전부 새 파일)

| 파일 | 하는 일 |
|---|---|
| `scripts/fixtures/campus-jju.json` | 전주대 학교 등록. 기수 둘(Catalog) × 분야 둘 × 트랙 다섯. **운영에서는 읽히지 않는다**(`V3_CAMPUS_FIXTURE` 는 `APP_ENV=production` 이면 무시된다) |
| `src/lib/jju/program.ts` | 등록부를 기수 → 분야 → 트랙 → 재는 검사로 다시 묶는다. 트랙 상태를 `LIVE` · `DEMO` · `PREPARING` 으로 끌어온다 |
| `src/app/jju/page.tsx` | 전주대 전용 첫 화면 |
| `src/app/jju/fields/page.tsx` | AI·첨단산업 교육 분야와 트랙 소개 |
| `src/app/jju/admin/page.tsx` | 사업단 현황(기수 × 트랙 · 교육과정 등록 상태 · 기능 상태) |
| `src/app/jju/parts.tsx` · `jju.css` | 시연 표시 띠와 트랙 상태 칩. 이름은 전부 `jju-` 로 시작한다 |
| `scripts/jju-demo-setup.ts` | 합성 데모 자료(기관 · 담당자 · 학생 · 제품과 같은 길로 푼 응시). 운영 DB 와 원격 DB 에서는 멈춘다 |
| `scripts/jju-shots.ts` | 공개 · 학생 · 사업단 화면을 누르는 차례로 밟고 찍는다 |

**공통 엔진과 공유 파일의 diff 는 0줄이다.** 문항 은행 · 채점 · 결과 모델 ·
DB 스키마 · `campus-universities.json` · `major-cores.json` · 검사·결과·작업공간
화면 · `package.json` · `Dockerfile` 을 고치지 않았다.

## 2. 화면과 재사용

| 요구한 화면 | 자리 | 새로 만들었나 |
|---|---|---|
| 전주대 전용 홈페이지 | `/jju` | 새로 만듦(학교 진입 껍데기 `CampusShell` 재사용) |
| AI·첨단산업 교육 분야 소개 | `/jju/fields` | 새로 만듦 |
| 학생 로그인 | `/campus/jju/login` | 공통 재사용 |
| 학생 대시보드 | `/me` | 공통 작업공간 재사용 |
| 전공·기술 분야별 검사 진입 | `/campus/jju/majors` → `/campus/jju/d/<트랙>` → `/v3/start` | 공통 재사용 |
| 검사 진행 | `/v3/<응시>` | 공통 재사용 |
| 역량 분석 결과 | `/v3/<응시>/result` | 공통 재사용. 머리말에 `전주대학교 · [시연] … 트랙` 이 선다 |
| Evidence 입력·프로젝트 기록 | `/me/experience/new` · `/me/state` | 공통 재사용 |
| 개인 PDF | `/v3/<응시>/result/pdf` | 공통 재사용 |
| 사업단 관리자 대시보드 | `/jju/admin` + `/org/v3` + `/org/v3/students` | `/jju/admin` 만 새로 만들고 집계·명단·내려받기는 공통 |

**`[시연]` 표시가 학생 화면 끝까지 따라간다.** 트랙 이름 앞에 붙여 두었고
결과지와 PDF 머리말이 학과 이름을 그대로 적으므로, 공통 화면을 고치지 않고도
시연 트랙이 결과지와 종이에 시연으로 찍힌다.

## 3. 검사 설계

트랙마다 새 검사를 만들지 않았다. 트랙은 공통 Major Core 로 이어진다.

| 트랙(가안) | 재는 검사 | 지금 상태 |
|---|---|---|
| AI·데이터 | 컴퓨터·소프트웨어 · 인공지능·데이터 갈래 | `DEMO`: 도메인 검수 전이라 학생에게 닫혀 있음 |
| LLM 응용 | 컴퓨터·소프트웨어 · 소프트웨어학 갈래 | `DEMO` |
| AIoT | 전기전자 · 정보통신 갈래 | `DEMO` |
| 피지컬 AI | 전기전자 · 드론·로봇 갈래 | `DEMO` |
| 스마트팩토리 | 기계공학 | `LIVE`: 지금 학생에게 열린 유일한 이공계 검사 |

- **트랙은 전부 공식 과정이 아니다.** 공개 검색으로 전주대학교의 부트캠프
  선정 여부와 교육과정을 확인하지 못했다. 등록부에 `OFFICIAL_PAGE_UNREACHABLE`
  로 적었고, 화면은 트랙마다 `확인 전(가안)` 을 적는다.
- **EE·CS 를 열지 않았다.** `open_to_students` 는 그대로 `false` 다. 시연
  서버만 `V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1` 로 열고, 그 값은 운영에서
  거절된다(`previewOpenCores()`). 화면은 그 트랙에 `시연 전용` 칩을 붙인다.
- **기수는 Catalog 다.** 1기(`JJU1_*`)와 2기(`JJU2_*`)의 코드 앞머리가 기수를
  들고 있어 **DB 에 기수 칸을 더하지 않았다.** 2기는 `FUTURE` 이고 1기를
  이어받는다(`replaces`).

## 4. 실제 동작과 시연 구분

| 기능 | 구분 | 근거 |
|---|---|---|
| 검사 응시·저장·이어하기 | 실제(공통 엔진) | 코드 변경 없음. **이 세션에서 돌려 보지 못함** |
| 결과 화면 · PDF | 실제(공통 엔진) | 같음 |
| 경험·프로젝트 기록 → 현재 상태 | 실제(공통 엔진) | 같음 |
| 사업단 기수 × 트랙 표 | 실제 집계 함수(`campusV3` · `studentCounts`) 위에 새 화면 | 5명 미만 칸은 `by_department` 가 값을 만들지 않는다 |
| `DEMO` 트랙의 결과 | 시연 | 검수 전 검사. 진단으로 쓰지 않는다고 화면이 적는다 |
| 트랙 · 기수 구성 | 시연 | 공식 교육과정 미확인 |
| 학생 · 응시 수 | 시연(합성) | `jju-demo-setup.ts` 가 만든 학생이다. 다른 기관 자료를 베끼지 않았다 |
| 교육 전후 역량 변화 | 표시하지 않음 | 비교 가능한 평가 체계가 검증되기 전 |
| 전북권 기업·기관 연계 | 자료 없음 | 출처·사용 권리 확인 전 |

## 5. 돌리는 법 (npm 이 열린 환경에서)

```bash
cd pca-platform
npm ci
createdb cm_jju
export DATABASE_URL=postgres://postgres:...@127.0.0.1:5432/cm_jju
bash scripts/db-init.sh
export V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json
export V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1
APPLY=yes npx tsx scripts/jju-demo-setup.ts      # 담당자 비밀번호를 한 번만 보여 준다
NODE_OPTIONS=--max-old-space-size=4096 npm run build
bash scripts/stage-serve.sh 3100
UI_BASE=http://127.0.0.1:3100 JJU_ADMIN_PW=<위의 값> OUT=docs/jju/shots \
  npx tsx scripts/jju-shots.ts
```

그 다음에 돌릴 회귀: `npm run typecheck` · `campus:check` · `v3:freeze:measure` ·
`v3:freeze` · `v3:result:freeze` · `v3:workspace` · `routes:check` · `db:chain`.
`campus:check` 는 fixture 를 닫고 운영 등록부만 보므로 전주대 fixture 는 세지
않는다. fixture 의 계약 위반은 `jju-demo-setup.ts` 가 `checkStudent` 로 걸러낸다.

## 6. 비공개 Staging 방안 (제안 · 실행하지 않음)

기존 Railway 서비스와 겹치지 않게 **새 서비스와 새 DB** 를 둔다.

1. Railway 프로젝트 `feisty-generosity` 안에 새 environment `jju-demo` 를
   만든다. 기존 `production` · `staging` 은 건드리지 않는다
2. 그 안에 **새 PostgreSQL** 을 만든다. 운영·배재대 staging DB 를 가리키지
   않는다
3. 앱 서비스를 `feature/jju-campus` 가지에 묶고 `Deploy on push` 를 켠다.
   **이 가지만** 본다
4. 변수: `APP_ENV=staging` · `STAGING_BASIC_AUTH=<아이디:비밀번호>` ·
   `DATABASE_URL`(새 DB) · `AUTH_SECRET` · `PLATFORM_URL`(Railway 임시 주소) ·
   `V3_CAMPUS_FIXTURE=/app/scripts/fixtures/campus-jju.json` ·
   `V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1`
5. 컨테이너 Shell 에서 `npm run db:init`. 시연 자료는 DB 를 이 기계에서
   만들고 붓거나, 이미지에 스크립트를 담는다(아래)

**막는 것 하나.** 지금 운영 이미지(`Dockerfile`)는 `scripts/fixtures/` 를
담지 않는다. 그래서 4번의 fixture 경로가 컨테이너에 없다. 둘 중 하나를
정해야 한다:

- (a) `Dockerfile` 에 fixture 한 줄을 더한다. 운영에서는 읽히지 않으므로
  동작은 같지만 **운영 이미지 파일을 고치는 일**이라 Core 담당 세션과 협의한다
- (b) 시연 전용 `Dockerfile.jju-demo` 를 따로 두고 서비스의
  `RAILWAY_DOCKERFILE_PATH` 로 가리킨다. 운영 파일은 그대로지만 두 벌이
  어느 날 갈린다

`STAGING_BASIC_AUTH` 와 `noindex` 가 붙으므로 주소를 아는 사람도 열쇠 없이는
못 들어간다.

## 7. Core 담당 세션에 넘길 것

| # | 항목 | 까닭 |
|---|---|---|
| C1 | `Dockerfile` 에 학교 fixture 를 담을지 | Staging 6절 (a) |
| C2 | 학교 진입 첫 화면의 `{지역}을` 조사 고정(`campus/[universityCode]/page.tsx:172`) | 받침 없는 지역명이면 틀린다. 이번에는 `["전주","전북"]` 으로 피했다 |
| C3 | 학교마다 다른 진입 문구·색(`--pcu-*` 고정) | 지금은 전주대 화면도 배재대 색이다 |
| C4 | 부트캠프 참여자의 학업 단계(재직자 · 졸업생) | `education_stage` CHECK 는 학위 넷뿐이다 |
| C5 | V3 응시에 기수 칸이 없다 | 지금은 Catalog 코드 앞머리로 대신한다 |
| C6 | CS·EE 학생 공개 | 도메인 검수 뒤 `open_to_students` 판단 |
| C7 | 사업단 메뉴에 `/jju/admin` 을 넣을지 | 메뉴 글자는 공통 사전(`TxKey`)을 고쳐야 한다. 지금은 첫 화면 링크로만 닿는다 |
| C8 | 기관·학교별 PDF 템플릿과 지역 기업 자료 | Gold Master 계층이 BIZ·배재대·충청 고정이다 |

## 8. 사람이 정해야 하는 것

1. 전주대학교 부트캠프 선정 여부와 사업단 정식 이름
2. 실제 트랙 구성(AI · AIoT · 스마트팩토리 · 피지컬 AI · LLM 응용 가운데 무엇이 공식 과정인가)과 기수 일정
3. 트랙별로 어느 전공 검사로 잴지
4. 참여자 신분과 학업 단계 매핑
5. 학교 로고·도메인 사용 승인
6. Staging 6절 (a)/(b)
