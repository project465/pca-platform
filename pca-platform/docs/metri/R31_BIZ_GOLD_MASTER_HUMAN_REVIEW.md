# R31 · BIZ Gold Master 실행 + Final Human Review Package

판정 요약을 먼저 적는다. 자동 검사 PASS 는 디자인 최종 승인이 아니고, Scene
Freeze 를 선언하지 않는다. 운영환경(`app.careermatri.com`)은 이 세션의 네트워크
정책이 막아 한 번도 열지 못했으므로 운영에 관한 줄은 전부 `NOT VERIFIED` 다.

```
HUMAN DESIGN PASS      선언하지 않음 (사람이 읽는다)
PRODUCT QUALITY        LOCAL PASS · 5 기준 가운데 PASS 3 · FAIL 1 · NOT VERIFIED 1
AI ADVANTAGE           FAIL (LLM 호출 0 · 규칙 기반 개인화만)
PRODUCTION             NOT VERIFIED (운영 미접속)
SCENE FREEZE           선언하지 않음
```

증거는 전부 `docs/metri/review/r31/` 한 폴더에 있고 `INDEX.md` 가 파일명 · 대상 ·
시나리오 · 뷰포트 · 결과를 한 줄씩 잇는다.

## 1. 바뀐 파일과 커밋

| 자리 | 파일 | 무엇이 |
|---|---|---|
| 현재 상태 공통 함수 | `src/lib/me-v3/student/state.ts` | 카드 셋의 세부가 한 종류(`kind`). 전부 남긴 것이 있을 때만 그 이름, 아니면 셋 다 해 본 일 |
| 결과 문장 | `src/lib/me-v3/result/text.ko.ts` | `PARTIAL_EVIDENCE` 빈자리 세 줄(제목 · 짧은 꼴 · 까닭) |
| 경험 추가 2단 | `src/app/me/experience/steps.tsx` · `compose.tsx` | 결과가 선 영역부터 세우고 나머지를 접는다(`suggest`). 저장 계약 그대로 |
| 저장 직후 화면 | `src/app/me/recompute/page.tsx` | 일곱 항목 구조. 학생 실제 데이터가 없는 절은 서지 않는다 |
| 작업공간 CSS | `src/app/me/platform.css` | 영역 칸 거드는 줄 두 줄까지(말줄임 걷음) · 저장 직후 · 접힌 영역 |
| 경험 번역 보기 | `src/lib/me-v3/student/translate.ts`(새) · `runtime/menus.ts` | 번역 열 단계의 보기를 Core 마다 든다. 공통 층의 글자 한 벌을 걷었다 |
| 판본 | `result/version.ts` · `workspace-version.ts` · `runtime/ui-version.ts` | `ME_V3_RESULT_UI_V74` · `me-v3-result-copy.63` · `CAREERMATRI_WORKSPACE_UI_V45` · `careermatri-workspace-copy.29` · `ME_V3_2_ASSESSMENT_UI_V40` · `me-v3-2-assessment-copy.25` |
| 동결 기록 | `result-lock.json` · `workspace-lock.json` · `core-ui-lock.json` · `ui-lock.json`(21벌) | 다시 적음. **측정 동결은 다시 적지 않은 채로 통과** |
| 검사 | `scripts/v3-student-check.ts`(§13 R31 열다섯 줄) · `v3-product-loop.ts` · `v3-loop-shots.ts` | 새 구조를 센다 |
| 증거 도구 | `scripts/lab/r31-e2e.ts` · `r31-shots.ts` · `r31_compare.py` · `r31_index.py` | 브라우저 E2E · 여정 캡처 · 나란히 · 색인 |

건드리지 않은 것: 문항 은행 · 채점 · 소유 판정 · 묶음 규칙 · 결과 모델 · 등록부 ·
`open_to_students` · DB 스키마 · 저장 계약(칸 이름 · `required` · 서버 액션).
`v3:freeze:measure` 가 **기록을 다시 적지 않은 채로** 14/14 통과한다. 검사 화면
동결(`v3:freeze`)은 번역 보기 파일 때문에 판본을 올리고 다시 적었다(`menus.ts` 와
새 `translate.ts` 두 벌만 바뀜).

## 2. R30 Human Review 결함 다섯과 닫은 자리

| 결함 | 원인 | 고친 자리 | 증거 |
|---|---|---|---|
| Current State 의 행동과 산출물 혼용 | 카드마다 따로 정해 한 줄에 `사업계획서`(남긴 것)와 `고객을 나누고 반응 비교하기`(해 본 일)가 섰다 | `studentStateView` 가 뷰 단위 `kind` 를 정한다 | `shots/08-result-state-d.png` · `08b-home-state-d.png` · `v3:student` 13-1 |
| Experience Step 2 의 설문조사형 UX | 열두 칸이 같은 생김새로 한 번에 깔렸다 | 그 사람의 결과가 선 영역(같은 함수)부터 세우고 나머지를 `다른 업무 영역 보기 · N` 으로 접는다. 접힌 칸도 같은 이름 `td` | `shots/14-exp-step2-{d,m}.png` · `v3:student` 13-2~4 |
| 저장 완료 화면의 내부 근거 반복 나열 | 영역·축마다 `경험 근거 N개` 줄이 되풀이됐다 | 일곱 항목: 저장됐어요 → 경험 제목 → 기록으로 확인된 역할과 판단(고른 말 그대로) → 실제 달라진 현재 상태 → 다음에 보완할 것 → 현재 상태 확인하기 → 다른 경험 추가하기 | `shots/16-postsave-{d,m}.png` · `v3:student` 13-5~13 |
| Scenario C 의 상충 | 머리글 `방향을 직접 정해 본 일`(J3 CONFIRMED) 과 빈자리 `어디까지 직접 정했는지가 아직 없습니다`(J3 not OWNED) | `직접 정한 것은 보이고, 그 기준을 어떤 근거로 어디까지 맡았는지는 아직입니다` | `scenarios/scenarios.md` C · `shots/11-result-gaps-d.png` |
| 데스크톱 텍스트 말줄임 | `.cm-tile-txt small` 이 `nowrap` 이라 1440 에서 `채널별 성과 비…` | 두 줄까지 접는다(`line-clamp: 2`). 칸의 키는 배지가 정하므로 늘어나지 않는다 | `shots/08b-home-state-d.png` · `v3:student` 13-15 |
| **(이번에 찾음) 경험 번역 보기가 기계공학의 말** | `runtime/menus.ts` 의 보기 한 벌이 스무 Core 전부에 나갔다. 경영학과 학생의 종이 5쪽 `직무 언어로` 표에 `재질이나 부품을 바꿨다` · `해석이나 시험 보고로 남았다` · `판정이나 인증의 근거로` 가 섰다(E2E 첫 바퀴의 PDF 에서 사람이 읽고 찾았다) | `student/translate.ts` 가 Core 마다 든다(ME 는 전 글자 그대로 · BIZ 는 경영의 말 · 나머지 18 Core 는 중립 벌). 저장되는 값(`S1`~`S5`)과 보기의 수·차례·`없다` 자리는 세 벌이 같아 **측정은 그대로**다 | `e2e/pdf/page-05.png` · `shots/12-result-apply-*.png` · `v3:student` §14 열 줄 |

## 3. 실제 검사 완주 (브라우저 E2E)

`scripts/lab/r31-e2e.ts` 가 학교가 발급한 BIZ 학생 계정 하나로 **실제 Chromium 에서**
밟았다. 답은 전부 화면에서 눌렀고 API 로 채운 답은 없다(`walk()`). 걸음마다의
판정은 `review/r31/e2e/e2e.md` 에 있다.

| 걸음 | 결과 |
|---|---|
| 로그인 → 학과 상세(`/campus/pcu/d/PCU26_BIZ`) → 검사 시작하기 → `/v3/start` → 학부 → 검사 시작 | PASS · 응시 32 · 응시 줄이 `BIZ_CORE_V1 · PCU26_BIZ · tier PRO` |
| 모든 문항 응답(실제 클릭) | PASS · 화면 67 · 5.4분 · 서버에 답 109개 |
| 제출 → 결과 생성 | PASS · `scored` · 완료 브리지 → 결과 · 결과 모델 영역 12 |
| 점수 대조(화면 ↔ 굳은 결과 모델) | PASS · 머리글 글자 그대로 · 현재 상태 카드 3/3 · 전체 판단 수 `18·0`(`overview.counts`) · 깊게 물은 영역 3곳의 판단 수 3/3 · 열두 영역 이름 12/12 |
| 화면에 안쪽 코드 · 점수 · 퍼센트 · 순위 | PASS · 0건 |
| PDF 다운로드(Desktop) | PASS · 200 `application/pdf` · 1,447,536바이트 · `attachment; filename="careermatri-v3-PRO-32.pdf"` |
| PDF 다운로드(Mobile 390) | PASS · 200 · 결과 화면 가로 넘침 +0px · 내려받기 길 있음 |
| 다른 학생 → 같은 PDF / 결과 | PASS · 404 / 결과 안 보임 |
| 비로그인 → PDF | PASS · 307 |
| 브라우저 오류 | 0 |

확인 37가지 · 통과 37 · 걸림 0. 첫 바퀴는 32/36 이었는데 걸린 넷이 전부 **검사
쪽 셈의 문제**였다(전체 수와 영역별 수를 섞어 더함 · 접힌 절을 펴지 않고 영역
이름을 셈 · pdftotext 가 가운뎃점을 떨어뜨림). 셈을 화면이 실제로 적는 칸에 맞춘
뒤 걸림 0 이다. 그 첫 바퀴의 PDF 를 사람이 읽다가 §2 의 여섯째 결함(번역 보기)을
찾았고, 고친 빌드로 마지막 바퀴를 다시 돌렸다.

한 번은 제출까지 끝나고 `scored` 로 굳은 뒤 마지막 이동의 `networkidle` 이
돌아오지 않아 스무 분을 멈춰 섰다(결과 쪽은 `Link` 미리 불러오기로 조용해지지
않는 때가 있다). 걸음에 시간 예산을 두고 돌아오지 않으면 DB 가 적은 상태로
이어 가게 고쳤다. **제품 쪽 문제가 아니다**: 그 응시는 109개 답과 결과 모델이
전부 서 있었다.

캡처와 E2E 증거는 빌드 `MNOLR1SLfAtw9d9y-9tJ3` 에서 떴다. 그 뒤 결과 문장 한 줄
(`FILL_AXIS` 의 까닭 줄에서 우리 쪽 비유 `그 자리에서` → `그 과제에서`)만 고쳐
마지막 빌드 `-JZFNXyX2QE0tKMYg2ftb` 를 다시 구웠고, 그 빌드로 제품 루프
66/66(`review/r31/checks/v3-product-loop.log`)을 돌렸다. 두 빌드의 차이는 그 한
줄이고 그 줄은 캡처한 화면 어디에도 서지 않는다(C 의 빈자리는 `FILL_AXIS` 가
아니다). 그래도 **그림을 다시 뜨지는 않았으므로** 그 사실을 여기 적는다.

**API 테스트와 가른다.** 위 E2E 는 문항 전부를 화면에서 눌렀다. 아래 두 줄은 API
수준의 계약·회귀 검사이고 브라우저 E2E 를 대체하지 않는다.

| 검사 | 종류 | 결과 |
|---|---|---|
| `npm run v2:check` | 계약(API) | ME_V2 문항 수 BASIC 48 · STANDARD 68 · PRO 92 그대로 |
| `npm run v3:length` | 계약(API) | ME_V3 응답 수 BASIC 46 · STANDARD 84 · PRO 110(학부) · 시작 화면이 적는 수와 같다 · 19/19 |
| `npm run v3:recompute` | 회귀(DB) | 19/19 · 저절로 돌아 지금 값에 들어가고 굳은 결과는 그대로 |
| `npm run v3:result` · `v3:result:copy` | 회귀(모델·문장) | 25/25 · 16/16 |
| `npm run v3:student` | 회귀(학생 언어) | 71/71 (R31 §13 열다섯 줄 · §14 번역 메뉴 열 줄 포함) |

학교 진입의 등급은 서버가 PRO 로 못 박는다(`openAttempt()`): E2E 의 응시 줄이
`tier = PRO` 다(Campus PRO 계약). BASIC·STANDARD 는 개인 B2C 길이고 이번 E2E
범위 밖이다. 스무 Core 가운데 BIZ 하나만 밟았다.

## 4. PDF 결과물 검증

`review/r31/e2e/result.pdf` 가 E2E 학생의 실제 PDF 이고 `e2e/pdf/page-01.png` ~
`page-11.png` 가 전 쪽 렌더(96dpi), `e2e/result.txt` 가 꺼낸 글자다. 사람이 열한 쪽을
읽었다.

| 항목 | 판정 | 근거 |
|---|---|---|
| 학생별 정확성 | PASS | 표지와 쪽머리가 `배재대학교 · 경영학과 · 경영 일반 · 2026-10-19 응답`. 머리글 · 현재 상태 · 깊게 물은 영역 셋(재무·투자 판단 5 · 회계·원가 7 · 글로벌 비즈니스 6)의 수가 화면과 모델과 같다 |
| Result 화면과 일치 | PASS | 머리글 글자 그대로 · 열두 영역 이름 12/12 · 영역별 판단 수 3/3(E2E 셈) |
| Evidence · Gap · Action 근거 | PASS | 2쪽 `내가 이미 가진 근거`(없으면 없다고 적고 그 학과가 흔히 남기는 것으로 잇는다) · 4쪽 `다음에 또 무엇을 적으면 되는가`(영역마다 다른 할 일과 남길 것) · 8쪽 `앞으로 채울 것` |
| 한글 폰트 | PASS | 한글 5,917자가 글자로 꺼내지고 `□`·`?` 0건. 모든 쪽 한글 정상 렌더 |
| 겹침 · 잘림 | PASS | 열한 쪽 전부 겹친 줄 없음. 8쪽의 긴 묶음 제목이 두 줄로 접히고 잘리지 않음 |
| 차트 · 표 | PASS | 3쪽 열두 영역 표(묻지 않은 영역은 `이번에 묻지 않음`) · 7쪽 여덟 축 격자 · 10쪽 산업·직무 표. 점수·퍼센트·순위 0건 |
| Mobile · Desktop 다운로드 | PASS | 둘 다 200 `application/pdf` |
| 다른 학생 접근 | PASS | 404 (비로그인 307) |
| **첫 바퀴에서 찾은 결함** | 고침 | 5쪽 `연구·프로젝트를 직무 언어로` 표가 기계공학의 보기(`재질이나 부품을 바꿨다` · `해석이나 시험 보고로 남았다` · `판정이나 인증의 근거로`)를 들었다. 고친 뒤 같은 자리가 `대상 고객이나 채널을 바꿨다` · `분석 보고나 결산 자료로 남았다` · `의사결정이나 보고의 근거로` 다(§2 여섯째 줄) |
| 사람이 봐 둘 자리 | P2 | 5쪽 머리가 `연구·프로젝트를 직무 언어로` 로 서는데 경영학과 학생에게는 `과제·프로젝트` 가 더 맞다(frozen 문장 · 결과 문장 판본 올릴 때). 11쪽(마지막)이 절반쯤 찬다(제로섬 자리, 앞 회차부터) |

PDF 는 **그 자리에서 뽑고 저장하지 않는다**(`/v3/{id}/result/pdf`). 그래서 저장소
용량과 재배포 유실이 이 길에는 없고, 접근 제어는 그 요청마다 `attemptOf(user)` 가
본다.

## 5. 학생별 결과 검증 (A/B/C/D)

`scenarios/scenarios.md` 가 네 사람의 입력 → 머리글 → 현재 상태 → Hero → 빈자리 →
할 일 → 근거 → 경험 추가 뒤 /me 를 서버 함수로 읽은 글자 그대로 든다. R30 과의 diff
는 C 의 빈자리 문장 한 줄뿐이다(§2).

| 사람 | 확인된 사실(응답·고른 항목) | 추론(판정) | 권고(할 일) |
|---|---|---|---|
| A 경험 거의 없음 | 해 본 적이 있다고 고른 영역 없음 · 남긴 것 없음 | 어느 쪽으로도 기울지 않음 · focus 없음 · 빈자리 없음 | 한 가지를 골라 짧게 해 보기(EXPLORE_BROADLY) |
| B 활동은 있고 직무 연결이 약함 | 영역 넷에서 해 본 일 각 2 · 직접 정한 것 0 · 남긴 것 0 | 넷 다 `정리만 남은 일`(Z2) · 카드 셋 전부 해 본 일 | 직접 정한 기준 세 줄 적기(DEEPEN_OWNERSHIP) · 경험 하나 추가 뒤 J6 PARTICIPATED→CONFIRMED · 빈자리 1 닫힘 |
| C 직접 수행 + 증거 | 영역 넷에서 해 본 일 20 · 직접 정한 것 6 · 남긴 것 2 · 비교 2 | 넷 다 `근거가 선 영역`(Z1) · 카드 셋 전부 남긴 것(사업계획 · 채널별 성과 비교표 · 견적서) | 빈자리: 직접 정한 것은 보이고 그 기준의 근거와 범위는 아직 · 할 일: 요구를 옮긴 조건 적어 두기 |
| D C 와 비슷하나 직접 정한 것 없음 | 재무·투자 판단에서 해 본 일 18 · 직접 정한 것 0 · 남긴 것 2 · 비교 2 | 재무·투자 판단만 Z1(머리글 `끝까지 가서 남긴 것이 있어요`) · 나머지 Z2 | 직접 정한 조건이나 기준이 아직 안 보여요 → 기준값을 직접 정하기(FILL_AXIS) |

없는 프로젝트·성과·산출물을 만들지 않았다: 카드와 근거 절이 드는 산출물 이름은
전부 그 사람이 체크리스트에서 고른 것이고, 고르지 않은 사람(A·B)은 사전의
활동 구만 받는다. 네 사람이 서로 다른 머리글 · 현재 상태 · Hero · 빈자리 · 할 일을
받는 것까지가 말할 수 있는 개인화의 전부다.

**AI Advantage: FAIL.** 결과지 · 작업공간 · 경험 추가 · 저장 직후 어느 길에도 LLM
호출이 0건이다(`grep -rn "openai\|anthropic\|llm" src/lib/me-v3` 0건). 개인화는 결과
모델과 사전(`student/copy.ts`)과 규칙(`text.ko.ts`)이 만든다. 규칙 기반 개인화와
LLM 기반 기능을 가르면 뒤엣것이 없으므로 FAIL 로 유지한다.

## 6. 상용화 차단 요소 (P0 / P1 / P2)

운영에 접근하지 못했으므로 운영 쪽 줄은 `NOT VERIFIED` 다. 로컬에서 센 것만
PASS 로 적는다. 실결제 · 운영 DB 변경 · 운영 브랜치 Push · 운영 배포는 하지 않았다.

| 축 | 로컬 | 운영 | 등급 | 근거 |
|---|---|---|---|---|
| 인증 | PASS (auth:check 46/46 · 로그인 시도 제한 · 정지 계정) | NOT VERIFIED | P1 | `checks/auth-check.log` |
| 사용자별 격리 | PASS (E2E: 다른 학생·비로그인에게 결과와 PDF 막힘) | NOT VERIFIED | P0 항목 · 로컬 닫힘 | `e2e/e2e.md` |
| 이용권 | PASS (학교 진입 PRO 강제) · **이용권이 Core 를 가리키지 않는 자리는 그대로** | NOT VERIFIED | P1 | `e2e/e2e.md` · CLAUDE.md EE 9절 ③ |
| 결제 | BLOCKED (가짜 결제 · PG 계약 없음 · 운영에서는 서버가 뜨지 않음) | NOT VERIFIED | **P0 (B2C)** · 학교 계약 좌석은 결제 없이 열림 | `checks/ops-check.log` PAYMENT |
| PDF 접근 제어 | PASS (본인만 · 404/리다이렉트) | NOT VERIFIED | P0 항목 · 로컬 닫힘 | `e2e/e2e.md` · launch-check `PDF 내려받기가 본인 확인을 거친다` |
| 저장소 | V3 PDF 는 그 자리에서 뽑고 저장하지 않는다 · `REPORT_PDF_DIR` 은 옛 판본 결과지용 | NOT VERIFIED (PDF_VOLUME UNKNOWN) | P1 | `checks/ops-check.log` |
| 오류 처리 | PASS (errors:check 8/8 · MUST FAIL 9구역 0건) | NOT VERIFIED | P2 | `checks/errors-check.log` |
| 개인정보 | PASS (secrets:check 7/7 · 파기 목록 · 퍼널 열쇠 좁힘) · 이 패키지에 실제 학생 정보 0건 | NOT VERIFIED | P1 | `checks/secrets-check.log` · launch-check |
| 백업 | 저장소에 절차 있음 · **운영 복구 시험 기록 없음** | NOT VERIFIED | P1 | launch-check `BACKUP_RESTORE` |
| 배포·롤백 | Railway 가 운영 브랜치를 자동 배포 · 이 브랜치는 운영 브랜치가 아님 · 롤백은 이전 커밋 재배포 | NOT VERIFIED | P1 | `checks/ops-check.log` DEPLOY |
| 사업자 표시 · 거래 메일 · 도메인 | 로컬 환경값 비어 있음(launch-check 4개 깨짐은 이 컨테이너의 환경 부재) | NOT VERIFIED | P1 (운영 담당) | `checks/launch-check.log` |

**P0 가운데 코드로 닫을 수 있는 것은 이번에 닫았다**(격리 · PDF 접근 제어가 로컬에서
닫혀 있음을 E2E 가 센다). 남은 P0 는 결제(PG 계약)이고 이 세션 밖이다.

## 7. 디자인 및 제품 검증

`review/r31/shots/` 에 47장(Desktop 1440×900 · Mobile 390×844 @2x · 원본 해상도)과
나란히 둔 그림 둘이 있고 `index.json` 과 `INDEX.md` 가 파일명 · 대상 · 시나리오 ·
뷰포트 · 결과를 잇는다. 자리: 홈(검사 전·후) · 검사 시작 · 시작 안내 · 응시(영역
훑기 · 판단 문항, 실제 클릭) · 완료 브리지 · 결과(첫 화면 · 현재 상태 · 근거 · 할
일 · 더 채울 부분 · 지원서·면접) · 현재 상태 · 지금 할 일 · 경험 추가 1·2·3단 ·
저장 직후 · 경험 목록 · 경험 고치기 · 지원 기록 · Track.

사람이 읽은 것(자동 PASS 가 아니다):

| 화면 | 읽은 것 |
|---|---|
| 08 결과 현재 상태 · 08b 홈 현재 상태 | 카드 셋이 전부 남긴 것(`사업계획` · `채널별 성과 비교표` · `견적서`)이고 거드는 줄이 두 줄로 접혀 말줄임이 없다. 두 화면이 같은 셋을 같은 차례로 든다(`cmp-result-state-vs-home.png`) |
| 14 경험 추가 2단 (d·m) | 결과가 선 영역 셋이 먼저 서고(할 일에서 넘어온 영역이 켜진 채) 나머지 아홉이 `다른 업무 영역 보기 · 9` 로 접힌다. 손전화에서 세로 열둘이 서지 않는다 |
| 16 저장 직후 (d·m) | `경험이 저장됐어요` → 기록 제목 → 기록으로 확인된 역할과 판단(고른 말 그대로, 다섯 줄) → 실제 달라진 현재 상태 → 다음에 보완할 것 → 현재 상태 확인하기 · 다른 경험 추가하기. `경험 근거 N개` 류 0건 |
| 11 더 채울 부분 (d·m) | `직접 정한 것은 보이고, 그 기준을 어떤 근거로 어디까지 맡았는지는 아직입니다` 가 머리글 `직접 정해 본 일` 과 부딪히지 않는다. 다만 같은 종류의 빈자리 넷이 한 줄로 묶여 영역 이름 넷이 앞에 서서 손전화에서 네 줄이다(P2 · 사람 판단) |
| 12 지원서·면접 (d·m) | 번역 열 단계가 경영의 말로 서고(`대상 고객이나 채널을 바꿨다` …) 이은 문단이 그 말로 읽힌다 |
| 01 홈 ↔ 레퍼런스 | 띠 · 지금 할 일 면 · 현재 상태 카드 셋 · 최근 변화 줄의 차례와 무게가 같다. 레퍼런스의 `최근 기록` 단추(결과 보기 · PDF)가 우리 홈에도 선다 |

### Premium Home Reference 대조

`shots/cmp-home-vs-reference.png` 가 레퍼런스와 홈을 같은 폭으로 나란히 둔다(늘리지
않음). `compare/geometry-probe.txt` 가 자리 46 가운데 활자·상자·표시를 화소로 견준
값을 적고, 이번 회차에 그 값은 바뀌지 않았다(±0.1 안). 레퍼런스에 없는 검색·알림
기능은 앞 회차 그대로 **실제로 도는 칸**만 두었다.

### 5 기준 판정

| 기준 | 판정 | 근거 |
|---|---|---|
| ① 대학 담당자 상품성 | NOT VERIFIED | 담당자 화면은 이번 범위 밖(학생 화면만 캡처). 운영 담당자 집계는 운영 미접속 |
| ② 학생 즉각 이해·행동 | PASS (로컬) | 결과 첫 화면 → 지금 할 일 → 경험 추가 → 저장 직후 일곱 항목 → 현재 상태로 이어진다. `shots/07 · 10 · 13~16 · 17` |
| ③ 전공·직무·Evidence 전문성 | PASS (로컬 · 사람 판단 전) | BIZ 사전과 체크리스트의 말로 서고(`scenarios.md`) 안쪽 코드 0건(E2E) |
| ④ 자소서·면접·포트폴리오 실용성 | PASS (로컬 · 자소서·면접) / 포트폴리오 기능 없음 | 결과 번역 절(`shots/12-result-apply-*.png`)과 근거 절의 지원서 포인트 · 면접 질문. **포트폴리오를 만들어 주는 기능은 없다**(지원 기록 `/me/apply` 만 있다) |
| ⑤ 실제 개인화 및 AI Advantage | FAIL | §5. 규칙 기반 개인화만 있고 LLM 기반 기능이 없다 |

## 8. 배포 가능 범위

- 이 브랜치(`claude/careermatri-screen-review-p0c8kb`)의 변경은 전부 이미지 안으로
  들어가는 파일이고 DB 스키마를 바꾸지 않는다. 마이그레이션은 필요 없다.
- 운영 브랜치(`claude/amazing-thompson-w3f2o2`) 로의 통합은 사용자 승인 뒤다.
  통합 절차와 회귀·롤백은 `docs/metri/R30_MERGE_PLAN.md` 그대로다.
- 학생 공개 상태(`open_to_students`)를 한 칸도 바꾸지 않았다. 20 Core · 115 학과로
  넓히지 않았다(BIZ Gold Master 검증 전 확장 금지).

## 9. 구현되지 않은 것과 검증 불가 항목

- 운영환경 전부(Canary · PDF · 담당자 집계 · 백업 복구 · 롤백): 네트워크 정책이
  `app.careermatri.com:443` 을 막는다. `NOT VERIFIED`.
- 포트폴리오 생성 기능: 없다. 지원 기록(`/me/apply`)과 번역 절까지다.
- LLM 기반 기능: 없다. AI Advantage FAIL.
- 담당자(Campus) 화면: 이번 캡처 범위 밖.
- 실제 결제: 가짜 결제뿐. PG 계약 전.
- 영역 사전이 같은 결과물 이름을 쓰는 Core 쌍 여섯과 `v3-pdf-audit` 의 EE·NURSING
  `없는 산업팩` 멈춤은 앞 회차부터 있던 자리이고 측정 동결 안이라 그대로다.

## 10. HUMAN REVIEW REQUESTED

사람이 읽어야 하는 자리: `docs/metri/review/r31/INDEX.md` 의 캡처 전부(특히 08 · 11 ·
14 · 16), `e2e/pdf/page-*.png` 전 쪽, `scenarios/scenarios.md` 의 네 사람. Human
Design PASS · Product Quality PASS · Scene Freeze 는 이 문서가 선언하지 않는다.
