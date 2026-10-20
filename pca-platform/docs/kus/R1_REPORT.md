# CareerMatri KUS(고려대학교 세종캠퍼스) R1 보고

작성 2026-10-20 · 가지 `claude/ecstatic-cori-sv6lh5` · 기준 커밋 `4f02d79b` (R35)

## 0. 판정 한 줄

**KUS 학생 흐름(학교 로그인 → 홈 → 공통 검사 → 개인별 결과 → 기업탐방 기록 → 30·60·90일 계획 →
개인 PDF)이 코드로 서 있고, 서버 함수 수준과 하네스 브라우저 수준에서 실제 DB 로 끝까지 확인했다.**
실제 Next.js 런타임에서의 빌드·브라우저 E2E 는 이 세션에서 돌릴 수 없어(npm 레지스트리 차단)
GitHub Actions(`kus-verify`)로 넘겼다 — 그 결과는 §6 에 따로 적는다.

| 층 | 상태 | 증거 |
|---|---|---|
| 서버 함수 E2E (실제 PostgreSQL 16 · 실제 채점 엔진) | **PASS 79 / FAIL 0** | `r1/qa/verify.log` |
| 하네스 브라우저 E2E (실제 Chromium · 실제 DB · KUS 화면 TSX 를 하네스가 그림) | **PASS 53 / FAIL 0** | `r1/shots/shots.log` · 그림 33장 |
| 개인 PDF (RICH · POOR · CONTRA) | **10쪽 × 3 · 서로 다름** | `r1/qa/pdf/*.pdf` · `r1/shots/*.download.pdf` |
| `tsc` · `next build` · 공통 회귀 · 실제 Next 브라우저 E2E (GitHub Actions Run 2) | **전 단계 0 · E2E 27/27** | `r1/ci/CI_RESULT.md` |

## 1. 코드 기준선

| 항목 | 값 |
|---|---|
| `main` | `0079cd8` (09-08) — 1단계 계정·소개 사이트뿐. **대학형 플랫폼 코드가 없다.** 쓰지 않음 |
| 운영 가지 | `claude/amazing-thompson-w3f2o2` `02b6c610` — 손대지 않음 |
| 배재대 작업 줄기 | `claude/careermatri-screen-review-p0c8kb` `3c67c09d` — R35 뒤에 승인 전 PDF Gold Master 커밋만 더해진 가지 |
| **채택 기준** | **`4f02d79b` R35 출시 차단 해소** — 전주대(`feature/jju-campus`) · 세종(`claude/epic-galileo-lrvgxr`) · Common Core(`feature/shared-core`)가 모두 이 커밋에서 갈라졌다. 승인 전 GM 코드가 딸려 오지 않는다 |
| 배재대 학생 플랫폼 | `/campus/[universityCode]` (학교 진입 · 학교 로그인 · 학과 확인) → `/v3/start` → `/v3/[id]` 공통 검사 → `/v3/[id]/result` · `/me/*` 작업공간 |
| 배재대 관리자 | `/org/v3` · `/org/v3/students` (공통 `campusV3` 집계 · 5명 규칙) |
| 검사 | 학교 진입은 `ME_V3` Core 검사를 **늘 PRO** 로 연다(`openAttempt`). Q1~Q92 BASIC48/STANDARD68/PRO92 는 `ME_V2_DECISION_2026` 동결 파일(`assessment-frozen.json`)이고 이번에 열지도 않았다 |
| 기관 격리 | 학생: `campus_students.university_code` + 등록부 재대조(`campusStudentOf`). 응시: `v3_attempts.university_code`. 담당자: `memberships(org_admin)` + `rbac.canInOrg` · `canReadParticipantReport` |
| 작업 가지 | 지시문은 `feature/kus-campus` 를 요청했으나, 이 세션은 `claude/ecstatic-cori-sv6lh5` 에만 푸시하도록 지정되어 있어 그 가지를 썼다. 이 가지는 `main` 에서 `4f02d79b` 로 **fast-forward** 한 뒤 KUS 커밋만 더했다(강제 초기화·다른 세션 커밋 덮어쓰기 없음) |

## 2. 만든 것 (전부 새 파일 · KUS 이름 공간)

| 파일 | 하는 일 |
|---|---|
| `scripts/fixtures/campus-kus.json` | KUS 등록부(fixture). 6개 단과대학 · 34자리. **운영에서는 읽히지 않는다**(KUS-CR-01) |
| `docs/kus/data/kus-departments.secondary.json` · `docs/kus/DEPARTMENTS.md` | 학과 근거(검색 요지)와 등록부 표 |
| `db/kus/schema_kus.sql` | 탐방 기업(`kus_visit_programs`) · 탐방 기록(`kus_company_visits`). 공통 체인 밖(KUS-CR-02) |
| `src/lib/kus/program.ts` | 학과 상태 `LIVE` · `DEMO`(미리보기 문으로만 열림) · `PREPARING` |
| `src/lib/kus/access.ts` | `requireKusStudent` · `requireKusAdmin`(DB 재확인) |
| `src/lib/kus/visits.ts` | 탐방 기록 검증 · 저장 · 초안(자기소개서 · 면접 · 포트폴리오) · 집계 |
| `src/lib/kus/analysis.ts` | 결과 화면 · 홈 · PDF 가 함께 읽는 **값 묶음**(판정 없음, 결과 모델 재배열) |
| `src/lib/kus/home.ts` · `workspace.ts` · `load.ts` | `지금 해야 할 일` · 화면 자료 모음 · 응시 묶음(본인 · KUS 응시만) |
| `src/lib/kus/report.ts` · `report-pdf.ts` | A4 개인 리포트(표지 + 8장 + 근거와 한계 = **10쪽**) · `setContent` PDF |
| `src/app/kus/**` | 홈 · 검사 · 결과 · 탐방(목록 · 새 기록 · 상세) · 계획 · 보고서(웹 · PDF) · 담당자 · 접근 거절 |
| `scripts/kus/verify.ts` · `demo-setup.ts` · `e2e-next.ts` · `departments-doc.ts` | 서버 E2E · 테스트 시드 · 실제 Next E2E(CI) · 학과 표 |
| `scripts/kus/lab/**` | **검증 전용 하네스**(제품 아님): TSX 를 TypeScript 로 옮겨 그리고 서버 액션을 POST 로 잇는 HTTP 서버 + 브라우저 스크립트 |
| `scripts/lab/offline/**` | 전주대 세션의 오프라인 실행기(pg · bcrypt 대역)를 **바꾸지 않고 그대로** 가져왔다 |
| `.github/workflows/kus-verify.yml` | `contents: read` · 글로 된 결과만 올린다 |

**재사용한 것**: 학교 로그인 · 세션(Auth.js) · 학교 진입과 학과 확인 · 공통 검사(저장 · 이어하기 · 제출 · 동시 제출 한 벌) ·
채점 엔진 · 결과 모델 · 결과 문장 함수(`text.ko`) · 공통 경험 입력(`/me/experience`) · 작업공간 디자인 토큰과
껍데기 클래스(`cm-*`) · `PrimaryActionHero` 등 UI 조각 · 공통 집계(`campusV3`) · 권한(`rbac`).

**바꾸지 않은 것**: 공통 파일 diff 0줄(`src/lib/me-v3/**` · `src/lib/campus/**` · `src/app/campus/**` ·
`campus-universities.json` · `major-cores.json` · DB 스키마 · `package.json` · `CLAUDE.md`).

## 3. 화면

| 요구 | 자리 | 비고 |
|---|---|---|
| KUS 진입 · 로그인 · 로그아웃 · 세션 | `/campus/kus` · `/campus/kus/login?next=/kus` (공통) · 로그아웃은 KUS 학교 로그인으로 | 개인 회원 로그인으로 보내지 않는다 |
| 학생 Home | `/kus` | 네이비 왼쪽 띠 · 개인화 Hero(검사 전 / 진행 중 / 결과 상태별 문장) · 상태 카드 넷(검사 진행 · 현재 상태 · 기업탐방 · 보고서) · 지금 해야 할 일 · 최근 분석 결과 · 탐방 프로그램 · 실행 계획 · 보고서 |
| 검사 | `/kus/assessment` → `/campus/kus/start` → 공통 `/v3/*` | 문항 · 채점 변경 없음 |
| 개인별 결과 | `/kus/result` (+ 공통 결과지 링크) | 현재 상태 · 전공 역량 · Evidence · 관심 산업·직무 · 직무 요구와 연결 · 준비할 영역 · 다음 행동 · 탐방 연결 |
| 기업탐방 | `/kus/visits` · `/kus/visits/new` · `/kus/visits/[id]` | 방문 기업(등록 목록 또는 `확인 전`) · 날짜 · 관찰 직무 · 이해한 것 · 한 활동(관찰/직접) · 새로 안 것 · 전공 영역 연결 · 초안 · 경험으로 옮기기 |
| 실행 계획 | `/kus/plan` | 결과 모델의 NOW/NEXT/LATER → 30/60/90일 + 탐방 상태에서 나온 할 일 |
| PDF | `/kus/report` · `/kus/report/[id]` · `/kus/report/[id]/pdf` | 본인 KUS 응시만 · 그 밖은 404 |
| 담당자 | `/kus/admin` | 집계 · 학과 준비 상태 · 탐방 등록. **개인 결과 쿼리 없음**(소스 검사) |

## 4. RICH / POOR / CONTRA (같은 학과 · 같은 검사 · 답만 다름)

학과 `KUS26_CBIZ_GM`(융합경영학부 글로벌경영전공 → 경영 Core · 글로벌경영 갈래) · PRO.

| 항목 | RICH | POOR | CONTRA |
|---|---|---|---|
| 답한 문항 | 122 | 106 | 106 |
| 머리 상태 | 지원서에 쓸 경험이 있어요 | 아직 한쪽으로 기울지 않았어요 | 정리만 하면 돼요 |
| 확인된 판단 / 직접 정한 판단 | 32 / 28 | 0 / 0 | 32 / **0** |
| 고른 근거 · 근거가 선 영역 | 93 · 4 | 0 · 0 | **0 · 0** |
| 응답 품질 | OK | LOW_VARIANCE | LOW_VARIANCE |
| 이어진 직무 | 경영기획(고름) · 데이터·분석 · 마케팅 · 영업·사업개발 | 경영기획(고름) | 경영기획(고름) · 영업·사업개발 · 데이터·분석 · 재무·회계 |
| 경영기획 직무 연결 | 경영전략·기획 5/5 · 재무·투자 0/1 · 데이터 1/1 | 0/5 · 0/1 · 0/1 | 5/5 · 1/1 · 0/1 |
| 탐방 | 등록 탐방 · 과제·발표(직접) · **경험으로 옮김** | 등록 탐방 · 설명·견학(관찰만) | 학생이 적은 기업(**확인 전**) · 멘토링(관찰) |
| 초안 동사 | 직접 해 보며 | 직접 보며 · `할 수 있다` 금지 안내 | 직접 보며 · 기업 확인 안내 |
| 30일 계획 | 영역별 `결과가 어디에 쓰였는지 한 문단` 셋 | `수업·교내 과제 하나를 짧게 해 보기` | 영역별 `짧은 과제나 스터디 하나` |

- 이름을 지운 세 리포트 HTML 이 서로 다르다(검사 통과). PDF 는 셋 모두 10쪽.
- **CONTRA 는 공통 엔진에서 `확인된 판단 32칸` 과 `정리만 하면 돼요` 를 받는다.** KUS 는 판정을 바꾸지 않고
  응답 품질 · 근거 0 · 근거가 선 영역 0 을 함께 보인다. 측정 담당 검토 요청 → KUS-CR-04.
- 원자료: `r1/qa/rich-poor-contra.json`

## 5. 격리와 권한 (증거: `verify.log` §6~8 · `shots.log` §6~7)

| 확인 | 서버 | 하네스 브라우저 |
|---|---|---|
| 다른 KUS 학생의 탐방 기록 · 결과 · 리포트 · PDF | 막힘(`NOT_FOUND`) | 404 |
| 배재 학생의 응시를 KUS 리포트로 | 막힘(`NOT_KUS`) | KUS 홈 → 학교 로그인으로 · 리포트 404 · 담당자 거절 |
| 진흥원 **대역** 기관 사용자(`SJ_QA`, 실제 진흥원 자료 아님) | KUS 학생 아님 · 응시 열람 불가 | 같음 |
| KUS 집계에 배재 학생 · 배재 집계에 KUS 학생 | 섞이지 않음 | — |
| 탐방 집계에 다른 학교 학생 줄을 넣어도 | 빠짐 | — |
| 배재 · 진흥원 대역 담당자 → KUS 담당자 | 아님 | `/kus/denied` |
| KUS 담당자 → 개인 결과 | 공통 규칙상 계약·동의 없이 불가 · **담당자 화면 소스에 개인 결과 호출 0** | 담당자 화면에 학생 문장 없음 |

## 6. 실제 Next 런타임 (CI)

`.github/workflows/kus-verify.yml` 이 GitHub 러너에서 `npm ci` → `tsc --noEmit` → `next build` → DB 체인 +
KUS 표 → 공통 회귀(`v3:freeze:measure` · `campus:check` · `db:chain`) → KUS 서버 E2E → standalone 서버 +
`scripts/kus/e2e-next.ts`(실제 로그인 · 실제 검사 화면을 끝까지 · 서버 액션 · PDF · 격리) → 공통 파일 무변경 확인.
결과: `r1/ci/CI_RESULT.md`. Run 1 에서 `tsc` 0 · `next build` 0 · KUS 서버 E2E **79/79** · **실제 Next 브라우저 E2E 27/27**
(공통 검사 UI 61화면 완주 · 서버 액션 저장 · PDF 내려받기 · 격리) · 공통 파일 변경 0. `campus:check` 의 1 은 CI 가 미리보기
변수를 켠 채 돌린 설정 결함이었고(이 세션에서 HEAD 80/80) 고쳤다. **Run 2(39408882460)는 열 단계 전부 0 이다.**

## 7. 남은 결함과 NOT VERIFIED

| 항목 | 상태 |
|---|---|
| 실제 Next 런타임의 로그인 쿠키 · 서버 액션 · 공통 검사 UI | CI 에서 확인(27/27). **그 화면의 그림은 없다**(공개 artifact 에 올리지 않는 규칙) |
| PC · 모바일 그림 | **harness render** 다(파일 이름 `.harness.jpg`, 그림 오른쪽 아래 표시). Next 런타임 그림이 아니다. 글꼴은 이 기계에 Pretendard 가 없어 WenQuanYi 로 찍혔다 |
| iPhone Safari · 실기기 | NOT VERIFIED |
| 학과 목록 공식 대조 | NOT VERIFIED — 공식 쪽에 닿지 못했다(`OFFICIAL_PAGE_UNREACHABLE`). 검색 요지만. 교육과정 연도 미확인 |
| 참여 학생 20명 전공 | 미수령. **Core 가 없는 25자리 학생은 계정 발급이 안 된다**(KUS-CR-03) |
| 운영 노출 | KUS 는 fixture 라 운영에서 서지 않는다(KUS-CR-01) · 탐방 표는 공통 체인 밖(KUS-CR-02) |
| 탐방 기업 | 0곳(실제). 테스트 줄 `[테스트] 가상기업 A` 만 있다. 담당자 등록 화면으로 넣는다 |
| CS · EE 학과 | Core 가 전공 검수 전 → 운영 규칙으로는 `준비 중`, 시연(미리보기)으로만 열리고 `시연 전용` 표시 |
| CONTRA 판정 | 공통 엔진 동작 · 검토 요청(KUS-CR-04) |
| 홈 모바일의 표 | 탐방 표가 좁은 화면에서 안쪽 가로 스크롤로 선다(쪽 전체는 넘치지 않음) |
| 학교 로고 · 계약 · 이름 사용 범위 | 미확보 가정. 로고를 쓰지 않았다 |

## 8. 다음 단계

2. KUS-CR-03 승인(Core 없는 학과 계정 발급) — 학생 명단 수령 전에.
3. 참여 학생 20명 전공 수령 → `student_open.leaves` 순서 조정 · 필요한 Core 매핑 검수 요청.
4. 탐방 기업 확정 → 담당자 화면으로 등록(확인 근거 함께).
5. KUS-CR-01 · 02 승인 → Staging 리허설(운영 Dockerfile 이미지) → Human Review(UI · PDF Gold Master 후보 10쪽).
6. 공식 학과 목록을 닿는 환경에서 대조하고 `verification` 을 `VERIFIED` 로.

## 9. 다시 돌리는 법 (npm 없는 세션)

```bash
cd pca-platform
export APP_ENV=dev DATABASE_URL=postgres://postgres@127.0.0.1:5432/cm_kus \
  V3_CAMPUS_FIXTURE=scripts/fixtures/campus-kus.json V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1 APPLY=yes
# DB: 공통 체인 + KUS 표
for f in $(node -e 'const c=require("./deploy/db-chain.json");for(const f of [...c.base,...c.upgrade])console.log(f)'); do psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 --single-transaction -f $f; done
psql "$DATABASE_URL" -f db/kus/schema_kus.sql
CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome OUT=docs/kus/r1/qa scripts/lab/offline/tsr scripts/kus/verify.ts
KUS_STUDENT_PW=<임의> KUS_ADMIN_PW=<임의> scripts/lab/offline/tsr scripts/kus/demo-setup.ts
scripts/kus/lab/run scripts/kus/lab/server.mjs 3301 &
BASE=http://127.0.0.1:3301 OUT=docs/kus/r1/shots PW=<학생> APW=<담당자> node scripts/kus/lab/shots.mjs
```

npm 이 열린 환경에서는 `npx tsx scripts/kus/verify.ts` · `npm run build` · `bash scripts/stage-serve.sh 3100` ·
`BASE=http://127.0.0.1:3100 KUS_PW=… KUS_ADMIN_PW=… npx tsx scripts/kus/e2e-next.ts`.
