# R30 · CareerMatri Product Quality & Human Review (BIZ Gold Master)

기준 Core `BIZ_CORE_V1` · 자리 `PCU26_BIZ` · 등급 PRO(학교 진입) ·
캡처 1440×900 / 390×844 · 이 기계의 staging 빌드에서 실제 앱으로 밟았다.

**이 문서는 PASS 를 선언하지 않는다.** 자동 검사가 통과한 것과 사람이 읽고
괜찮다고 적는 것은 다른 일이다. 끝은 `HUMAN REVIEW REQUESTED` 다.

---

## 1. BASELINE (PHASE 0 · 고치기 전에 확인한 사실)

| 자리 | 확인한 것 | 근거 |
|---|---|---|
| Result 현재 상태 | `overview.focus` 를 그대로 세운다(Z1 있으면 Z1 만, 없으면 Z2, 없으면 관심 높은 Z4). 세부 줄은 사전의 **활동 구** | `src/app/v3/[attemptId]/result/page.tsx` · `var/r30-before/scenarios.md` |
| /me 현재 상태 | `zoneOf` 를 **영역 차례대로** Z1·Z2 걸러 셋. 세부 줄은 사전의 **결과물 이름**을 실제로 남겼는지와 무관하게 적는다 | `src/app/me/page.tsx`(고치기 전) |
| 두 화면의 어긋남 | 시나리오 D 에서 Result 는 `재무·투자 판단` 하나, /me 는 `경영전략·기획 · 마케팅·시장 · 영업·사업개발` 셋 → **홈이 그 사람의 가장 센 자리를 빠뜨렸다** | `var/r30-before/scenarios.md` D 절 |
| 머리 한 줄 | Z2 만 있는 사람(B)에게도 `지금 설명할 수 있는 일 3가지` | 같은 파일 B 절 |
| Hero 머리 | `그때 직접 정한 것을 적어 두기` · 영역도 축도 없는 문장. 설명 줄은 `받은 요구를 어떤 조건으로 옮겼는지` 를 적어 머리와 설명이 다른 축을 가리킴(C) | `actionHeadKo` 고치기 전 |
| 경험 추가 | 2단 이름 `기술 판단` · `어느 기술영역의 일인가요` 가 Core 를 가리지 않고 글자로 박혀 있음. 종류 아홉이 알약 한 줄 | `steps.tsx` 고치기 전 |
| Experience → Evidence | `previewRecompute` 가 경험의 problems/decisions/artifacts/verifications/used_where 를 J1/J3/J5/J6/J8 후보로 묶고, 같은 (영역·축) 에 고른 항목이 둘이면 `CONFIRMED`, 하나면 `PARTICIPATED`. 경험으로 `OWNED` 는 서지 않는다 | `src/lib/me-v3/recompute.ts:41-51` |
| 닫힌 빈자리 | `closed_gaps` 가 **아무 축이나 움직이면** 다른 축의 빈자리까지 닫힌 것으로 셌다(B 에서 J3 가 안 움직였는데 1 로 찍힘) | 고치기 전 `previewRecompute` |
| AI 사용 | LLM 호출 0건. 개인화는 전부 결과 모델과 사전과 규칙이 만든다 | `grep -ri "openai\|anthropic\|llm" src` 0건 |
| Reference | `docs/metri/shots/reference/reference-home-2026-10-18.png` · `reference-home-desktop.png` 둘 다 읽었다. 카드 템플릿으로 베끼지 않고 **정보 차례(Hero 할 일 → 현재 상태 셋 → 최근 변화 → 최근 기록)** 만 받았다 | 그림 둘 |

확인하지 못한 것: 운영 배포본(네트워크 정책이 `app.careermatri.com:443` 을 막는다). 실제 학생의 눈. 20 Core 전수 캡처(이번 범위 밖).

---

## 2. CODE CHANGES (KEEP / DELETE / MERGE / REBUILD)

| 자리 | 판정 | 무엇을 |
|---|---|---|
| Result 현재 상태 카드 geometry · 아이콘 · 세 칸 | **KEEP** | 상자와 자리와 표시 그대로. 바뀐 것은 **어느 영역을 세우고 무슨 말을 적는가** |
| 두 화면의 현재 상태 선택 규칙 | **MERGE** | 새 파일 `src/lib/me-v3/student/state.ts` 의 `studentStateView()` 하나를 결과지와 홈이 함께 읽는다. 차례 Z1 → Z2 → (없으면) 관심 높은 Z4. 세부는 **실제로 남긴 것**이 있으면 그 이름, 없으면 사전의 활동 구. 머리 한 줄은 묶음이 말하는 것만(`stateLeadKo`) |
| /me 현재 상태의 결과물 이름 | **DELETE** | 남기지 않은 사람에게 `사업계획서` 를 적던 길(`studentEvidence` 기본값)을 홈 카드에서 걷었다 |
| Hero · 결과지 `지금 할 일` 머리 | **MERGE** | `actionHeadKo(action, domainName)` 이 영역 이름과 축을 든다(`경영전략·기획 과제에서 직접 정한 기준 적어 두기`). 설명 줄과 같은 축을 가리킨다. 손전화에서 네 줄이 되지 않게 축의 짧은 이름씨(`HEAD_NEED_KO`)를 머리에만 쓴다 |
| 결과지 Z1 머리글 | **MERGE** | 직접 판단(J3)이 확인되지 않은 영역이 머리에 설 때 `방향을 직접 정해 본 일` 대신 `끝까지 가서 남긴 것이 있어요`(시나리오 D). 묶음도 알약도 그대로 |
| `closed_gaps` 셈 | **MERGE** | 같은 영역·같은 축의 후보가 `CONFIRMED` 이상으로 **실제로 움직였을 때만** 닫힌 것으로 센다(`recompute.ts` previewRecompute). 적용 쪽은 전부터 축 단위라 **저장되는 값은 바뀌지 않는다** |
| /me/state 요약 | **MERGE** | 수는 Z1 만 세고, Z2 가 먼저 설 때는 `해 봤고 정리만 남았습니다` 로 적는다 |
| 경험 추가 1단 | **REBUILD** | 걸음 안내 한 덩이(왜 적는가) · 종류 아홉을 세 묶음(수업·과제 / 연구·프로젝트 / 현장·자격)으로 · 예시는 Core 별 · 날짜는 제목 아래 한 단 작은 자리 |
| 경험 추가 2단 | **REBUILD** | 걸음 이름과 묻는 말을 사전(`EXPERIENCE_FLOW`)이 든다: BIZ 는 `업무 판단` · `어느 업무 영역의 일이었나요`. 영역 칸이 **이름 + 그 영역에서 해 본 일** 두 줄. 직접 정한 것 칸에 `지원서에서 읽히는 쪽` 한 마디 |
| 경험 추가 3단 | **REBUILD** | 걸음 안내(고르면 무엇이 달라지는가: 같은 영역의 근거가 둘이 되면 직접 수행까지). 결과물·비교·쓰인 곳·선택 칸은 그대로 |
| 저장 계약 | **KEEP** | 칸 이름(`kind` · `title` · `started_on_y/_m` · `td` · `problem` · `decision` · `artifact` · `verification` · `used_where` · `ongoing` · `ended_on_*` · `note`) · 검증(`required`) · 서버 액션 · 자동 반영 · 저장 뒤 `/me/recompute?new=` 전부 그대로. 뒤로 가도 고른 값이 남는 구조(가린 판)도 그대로 |
| 측정 | **KEEP** | 문항 은행 · 채점 · 소유 · 묶음 · 결과 모델 · DB 스키마 0줄. `v3:freeze:measure` 가 기록을 다시 적지 않은 채로 통과 |

새 파일: `src/lib/me-v3/student/state.ts` · `scripts/lab/r30-scenarios.ts` · `scripts/lab/r30-shots.ts` · `scripts/lab/r30_compare.py`.
하드코딩으로 화면만 맞춘 자리 없음: 두 화면이 **같은 함수**를 읽는다(`v3:student` 10번이 센다).

---

## 3. GATES

| Gate | 판정 | 근거 |
|---|---|---|
| G1 Result Current State 가 거짓을 적지 않는다 | 자동 PASS · 사람 미검 | B: 남긴 것이 없는 사람의 세부에 결과물 이름 0 · 머리 `해 봤고 정리만 남은 일 3가지`. D: `설명할 수 있는 일 1가지 · 정리가 덜 된 일 2가지` |
| G2 Result 와 /me 가 같은 판정을 같은 말로 | 자동 PASS · 사람 미검 | 네 시나리오 모두 두 화면의 영역 셋과 세부와 머리가 글자까지 같다(`var/r30-final/scenarios.md`) |
| G3 경험 추가가 안내형이고 BIZ 말로 묻는다 | 자동 PASS · 사람 미검 | `v3:student` 12번 · 캡처 3·4·5 |
| G4 Experience → Evidence → Action 이 실제로 움직인다 | PASS(실제 코드 경로) | B 가 `재무·투자 판단` 에 비교 대상 둘을 적자 J6 `PARTICIPATED → CONFIRMED` · 그 축의 빈자리 1 닫힘 · 저장 직후 화면이 그 사실을 적음 |
| G5 측정·저장 계약 불변 | PASS | `v3:freeze:measure` · `v3:recompute` 19/19 · 저장 칸 이름 diff 0 |

`NOT VERIFIED`: 실제 학생 3~5초 이해 · 학교 담당자 구매 의사 · 운영 배포본.

---

## 4. 5-AXIS MATRIX

| 축 | 판정 | 무엇으로 |
|---|---|---|
| 대학 구매자 품질 | NOT VERIFIED | 담당자에게 보여 주지 않았다. 사람이 캡처 열 장을 읽어야 한다 |
| 학생 relevance(3~5초) | 자동 PASS · 사람 미검 | 첫 화면이 영역 이름 + 해 본 일/남긴 것 셋, Hero 가 영역과 축을 든 한 줄 |
| 전공 domain validity | 자동 PASS · 전공자 미검 | 영역 이름은 taxonomy, 활동·결과물은 R29 사전(손으로 쓴 것). 새 문장을 지어내지 않았다 |
| 취업 utility | PASS(경로) · 사람 미검 | 자소서: 결과지 `지원서에 꺼내 쓸 경험`(실제 고른 항목) · 면접: 영역별 질문 · 포트폴리오: `손에 남은 것` 칩 · 다음 경험: Hero → `/me/experience/new?td=` 로 그 영역이 켜진 채 열림 |
| 측정 가능한 AI 우위 | FAIL(정직하게) | LLM 이 없다. 우위라고 말할 수 있는 것은 **규칙 기반 개인화**뿐이다: 같은 Core 에서 A/B/C/D 가 서로 다른 머리글·현재 상태·Hero·할 일을 받는다(아래 표). `AI 분석` 이라고 적지 않는다 |

---

## 5. SCENARIO COMPARISON (실제 코드 경로 · Expected vs Actual · before → after)

| | A 경험 거의 없음 | B 해 봤고 정리 안 됨 | C 직접 수행 + 증거 | D C 와 비슷하나 J3 없음 |
|---|---|---|---|---|
| Expected 머리글 | 방향 없음 | 해 봤고 정리만 | 직접 정해 본 일 | **직접 정했다고 적지 않기** |
| Actual before | 아직 한쪽으로 기울지 않았어요 | …해 봤고, 정리만 남았어요 | …방향을 직접 정해 본 일이 있어요 | **재무·투자 판단 과제에서 방향을 직접 정해 본 일이 있어요**(거짓) |
| Actual after | 같음 | 같음 | 같음 | **재무·투자 판단 과제를 끝까지 가서 남긴 것이 있어요** |
| Expected Result 현재 상태 | 없음 | Z2 셋 · 활동 구 · `설명할 수 있다` 금지 | Z1 셋 · 실제 산출물 | Z1 하나 먼저 + Z2 둘 |
| Actual before | 없음 | Z2 셋 · 머리 `지금 설명할 수 있는 일 3가지`(거짓) | Z1 셋 · 세부 활동 구 | Z1 하나만 · `설명할 수 있는 일 1가지` |
| Actual after | 없음 | Z2 셋 · `해 봤고 정리만 남은 일 3가지` | Z1 셋 · `사업계획 / 채널별 성과 비교표 / 견적서` | `설명할 수 있는 일 1가지 · 정리가 덜 된 일 2가지` · 재무 먼저 |
| /me 현재 상태 before | 없음 | 세부 `사업계획서 / 캠페인 기획서 / 제안서`(**남기지 않은 것**) | 세부 사전 결과물 | **재무 빠짐** · 경영전략·마케팅·영업 |
| /me 현재 상태 after | 없음 | Result 와 글자까지 같음 | 같음 | 같음(재무 먼저) |
| Hero before | 한 가지를 골라 짧게 해 보기 | 그때 직접 정한 것을 적어 두기 | 그때 직접 정한 것을 적어 두기(설명은 J2) | 그때 직접 정한 것을 적어 두기(설명은 J4) |
| Hero after | 같음 | 경영전략·기획 과제에서 직접 정한 기준 적어 두기 | 경영전략·기획 과제에서 요구를 옮긴 조건 적어 두기 | 재무·투자 판단 과제에서 쓴 방법 적어 두기 |
| 경험 추가 뒤 | · | 재무 J6 PARTICIPATED→CONFIRMED · 빈자리 1 닫힘 | 이미 높은 축이라 움직임 0 · 닫힘 0 | · |

`closed_gaps` before 는 B 에서 J3 가 안 움직였는데 1 이었다(틀린 셈). after 는 실제로 움직인 축의 빈자리만 센다.

---

## 6. EVIDENCE TRACE (BIZ · 다섯 가지가 어디서 오는가)

| 종류 | 화면의 말 | 출처 | 지어내는가 |
|---|---|---|---|
| Experience | `동아리 행사 예산 집행 계획` · 종류 `수업` | `v3_experiences.title / kind` (학생 입력) | 아니오 |
| Activity | `목표와 성과 기준 정하기` | `STUDENT_COPY[BIZ][TD01].activity`(손으로 쓴 사전) | 아니오 |
| Evidence(남긴 것) | `사업계획` · `채널별 성과 비교표` | 결과 모델 `domains[].artifacts`(응답에서 고른 항목) → `thingKo` | 아니오. 없으면 **활동 구로 내려간다** |
| Capability(판단 상태) | `직접 수행` · `받아서 수행` | `career_profiles.axis_levels` / 스냅샷 축 상태 | 아니오 |
| Output(쓰인 곳) | `보고서나 과제 결과물로 제출됐다` | `v3_experiences.used_where` → J8 | 아니오 |
| Gap | `재무·투자 판단 · 무엇과 비교해 봤는지가 아직 없어요` | 결과 모델 `gaps[]`(종류·축) → `gapKo` | 아니오 |
| Action | `재무·투자 판단 과제에서 쓴 방법 적어 두기` | 결과 모델 `actions[]`(코드·영역·축) → `actionHeadKo(a, 영역명)` | 아니오. 영역 없는 할 일(`EXPLORE_BROADLY`)은 영역 이름을 쓰지 않는다 |

---

## 7. EMPLOYMENT FLOW

- **자소서**: 결과지 `내가 이미 가진 근거` 절이 그 사람이 고른 `decided` · `artifacts` 를 그대로 든다(C: `근거를 들어 여러 방법 중 하나를 골랐습니다 / 남긴 것 목표·지표 정리표, 사업계획`).
- **면접**: 영역마다 질문 한 줄(`전사 목표와 어떻게 맞췄나요?`)이 그 영역의 비교 대상에서 온다.
- **포트폴리오**: `손에 남은 것` 칩 = 실제로 고른 산출물. 남기지 않은 사람(B)에게는 칩이 없고 `정리만 남았어요` 가 선다.
- **다음 경험**: Hero → `지금 정리하기` → `/me/experience/new?td=TD01` 로 그 영역이 켜진 채 열리고(캡처 4), 저장하면 `/me/recompute?new=` 가 **이번 경험이 움직인 축**을 적는다(캡처 6).

---

## 8. SCREENSHOTS (`docs/metri/shots/review-loop/r30/`)

| # | 파일 | 무엇 |
|---|---|---|
| 1 | `1-result-state-d.png` · `1-result-state-m.png` | Result Current State(C 응답) |
| 2 | `2-me-home-d.png` · `2-me-home-m.png` | /me Home |
| 3 | `3-exp-step1-d.png` · `3-exp-step1-m.png` | Experience Add 1단 |
| 4 | `4-exp-step2-d.png` · `4-exp-step2-m.png` | 2단(영역 둘 고른 상태) |
| 5 | `5-exp-step3-d.png` · `5-exp-step3-m.png` | 3단 |
| 6 | `6-postsave-d.png` · `6-postsave-m.png` | 저장 직후 연결 화면 |
| 7 | `7-compare-result-vs-me.png` | Result 현재 상태 ↔ /me 현재 상태 나란히 |

전부 `scripts/lab/r30-shots.ts` 가 한 사람(PCU 경영학과 발급 계정 · 사람 C 응답)으로 **실제로 눌러** 찍었다. 같은 그림이 두 이름으로 저장되면 멈춘다.

---

## 9. QA

| 검사 | 결과 | 비고 |
|---|---|---|
| `tsc --noEmit` | 통과 | |
| `v3:freeze:measure` | 통과 · **기록을 다시 적지 않음** | 문항 은행 · 채점 · 결과 모델 불변 |
| `v3:freeze`(검사 화면) | 통과 · 파일 20벌 그대로 | 검사 화면 판본 `ME_V3_2_ASSESSMENT_UI_V39` 그대로 |
| `v3:result:freeze` | 다시 적음 → 통과 | `ME_V3_RESULT_UI_V73` · `me-v3-result-copy.62` · 파일 24벌(`state.ts` 추가) |
| `v3:workspace` | 다시 적음 → 통과 | `CAREERMATRI_WORKSPACE_UI_V44` · `careermatri-workspace-copy.28` · 파일 53벌 · 쓰는 class 128개 전부 CSS 에 있음 |
| `v3:freeze:core` | 다시 적음 → 통과 | Core 화면 열넷 |
| `v3:student` | 46 / 46 | 12번(경험 추가 흐름 말 · 종류 아홉 묶음)이 새로 들어감 |
| `v3:result` | 25 / 25 | 사람 열두 벌 golden `GOLDEN=update` 없이 통과 |
| `v3:result:copy` | 16 / 16 | |
| `v3:recompute` | 19 / 19 | |
| `v3:copy` | 통과 · 파일 39벌 · 규칙 38가지 | 새 안내 문구에 금지어 0 |
| `copy:audit` | 46개(기준선 46) | 새 문서의 대시 7개를 걷은 뒤 |
| `v3:product-loop`(실제 브라우저) | 65 / 65 | 경험 → 저장 → 더함 → 현재 상태 → 할 일 → 홈 |
| `scripts/lab/r27-probe.ts`(결과지 현재 상태 자) | 자리 34 · 벌어진 자리 0 | 카드 geometry KEEP 의 증거 |
| `scripts/lab/r30-scenarios.ts` | A/B/C/D 전부 두 화면 일치 | `docs/metri/shots/review-loop/r30/scenarios-{before,after}.md` |
| `scripts/lab/r30-shots.ts` | 그림 14장 · 같은 그림 0 | 열 장 + 비교 한 장 + 데스크톱 2·3단 |
| 돌리지 않은 것 | `v3:human`(60벌 dump 필요) · `v3:visual` · `v3:screens` · `v3-pdf-audit` · iPhone 실기기 · 운영 배포본 | NOT VERIFIED 로 적는다. 결과지 CSS 는 건드리지 않았고 종이는 문장만 바뀐다 |

---

## 10. RISKS / NOT VERIFIED

- **사람이 읽지 않았다.** 자동 PASS 는 글자와 구조를 센 것이다. 3~5초 이해와 구매 의사는 사람의 판정이다.
- **C 의 머리글과 빈자리가 서로 다른 단계를 말한다.** 머리글 `방향을 직접 정해 본 일이 있어요`(J3 CONFIRMED) 와 빈자리 `어디까지 직접 정했는지가 아직 없습니다`(J3 OWNED 아님)가 한 쪽에 선다. 둘 다 사실이지만 읽는 사람에게는 모순으로 읽힐 수 있다. 빈자리 문장은 결과 문장 공통층이라 이번에 손대지 않았다 → **사람 판단 요청**.
- **경험 추가 2단이 손전화에서 열두 칸 세로**(한 줄에 하나). 훑기는 쉬우나 길다. 두 칸으로 접으면 활동 구가 두 줄로 접힌다.
- **사전이 있는 Core 는 여섯.** 나머지 열넷은 `domainSub`(taxonomy 토막)로 떨어지고 흐름 말은 `영역 / 직접 정한 것` 중립 말이다. BIZ 승인 전에 넓히지 않았다.
- **AI 우위 없음.** 규칙 기반 개인화뿐이다. 판매 문구에 `AI` 를 쓰면 안 된다.
- 운영 배포본과 iPhone Safari 는 보지 못했다.

---

## 11. HUMAN REVIEW REQUEST

읽어 주실 것(차례대로):
1. `7-compare-result-vs-me.png` · 두 화면이 같은 말을 하는가, 그 말이 학생의 말인가.
2. `1-result-state-m.png` · `2-me-home-m.png` · 손전화 첫 화면 3초.
3. `3/4/5-exp-step*-m.png` · 경영학과 학생이 `업무 영역` · `무엇을 직접 정했나요` 를 자기 과제로 읽는가.
4. `6-postsave-d.png` · 저장 직후에 `무엇이 달라졌는가` 가 답이 되는가.
5. 위 10절의 C 머리글·빈자리 모순 · 어느 문장을 고칠지.

선언하지 않는 것: Human Design PASS · Product Quality PASS · FREEZE · COMMERCIAL READY.

**HUMAN REVIEW REQUESTED**
