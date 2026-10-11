# CareerMatri Final Visual Reference Alignment

2026-10-11 · 기계공학 ME_V3

**판정: NOT READY — REFERENCE ALIGNMENT ISSUES REMAIN**

**막는 것은 화면이 아니라 기준이다.** 지시문이 `반드시 실제 visual
reference 로 사용하라` 고 적은 목표 UI 이미지가 **이번에도 첨부되지
않았다.** 그래서 §1 의 `목표 이미지 VS 현재 CareerMatri` 대조와 §6 의
재비교를 **이미지에 대고** 수행할 수 없었고, 수행하지 않은 일을
`VISUAL REFERENCE ALIGNMENT PASS` 로 적을 수 없다. 자세한 것은 A 절에
있다. 이미지를 주시면 그 기준으로 다시 한 바퀴 돌고 그때 판정을 바꾼다.

---

## A. 첨부 이미지에 대하여

받은 세 회차(Final UI Build · Final Visual Acceptance · 이번 회차)가 모두
목표 UI 이미지를 가리켰고 **세 번 다 이미지가 이 세션에 도착하지 않았다.**
이번에는 짐작하지 않고 찾아본 자리를 적어 둔다.

| 찾아본 자리 | 결과 |
|---|---|
| `/mnt/user-data/uploads` (업로드가 놓이는 자리) | 비어 있음 |
| `/mnt/user-data/working` · `/mnt/user-data/outputs` | 비어 있음 |
| `/home/user` 아래 12시간 안에 생긴 그림 파일 | 없음 |
| `/tmp` · `/var/tmp` · `/workspace` 아래 그림 파일 | 이 세션이 직접 만든 캡처 조각뿐 |
| 대화에 실린 이미지 블록 | 없음 |

**그래서 하지 못한 것**: §1 이 요구한 이미지 대 화면의 나란한 비교,
§6 의 `목표 이미지 VS 현재 CareerMatri` 재비교, §3 이 `첨부 이미지에서
가장 중요한 것` 이라고 적은 특성이 실제 그 이미지에 있는지 확인하는 일.

**그래서 한 것**: §3 이 A~G 로, §4 가 화면 셋으로, §5 가 금지 목록으로
글에 적어 둔 기준은 이미지 없이도 그대로 쓸 수 있다. 그 기준으로 Core
화면 열을 실제 렌더를 보고 판정하고, PARTIAL 과 FAIL 만 고쳤다.
**이 문서의 어느 줄도 이미지를 봤다는 뜻으로 읽히지 않게 적었다.**

## B. 절대 금지: 건드리지 않은 것

| 잠근 것 | 확인한 방법 | 결과 |
|---|---|---|
| Measurement · Item Bank · Scoring · ResultModel | `v3:freeze:measure` 열네 가지 | **고치지 않은 채로 통과** |
| Ownership 뜻 · Zone 규칙 | `v3:scoring` · `v3:persona` 지문 | 글자까지 같다 |
| Current State 계산 | `v3:recompute` | 통과 |
| Product Loop | `v3:product-loop` | 통과 |
| DB schema | 바뀐 `db/*.sql` 0개 | 마이그레이션 없음 |
| Frozen Result | `v3:result` · `v3:result:height` | 굳은 결과 그대로 |
| Industry/Role → Core 관계 | `v3:scoring` 변형 검사 | Core 지문 불변 |
| 가격 · 등급 | 바뀐 `products` 0줄 | 그대로 |

새 기능을 만들지 않았다. 바뀐 파일은 CSS 둘과 결과지 쪽 하나와 판본 둘이다.

## C. §1 Core 화면 판정 (고치기 전)

기준은 §3 A~G 와 §4 다. 이미지가 아니다.

| 화면 | 판정 | 근거 |
|---|---|---|
| Home Desktop | **MATCH** | 첫 창 77% · 짙은 단추 하나(`지금 정리하기`) · 카드 2 · 칩 3 · 1순위가 면을 채우고 나머지는 읽는 줄 |
| Home Mobile | **MATCH** | 히어로 두 줄 · CTA 와 아래 띠 충돌 0 · 세로로 줄인 판이 아니고 아래 띠를 든 손전화 배치다 |
| Assessment Desktop | **FAIL** | 아직 표 계산기다. D 절에 적었다 |
| Assessment Mobile | **PARTIAL** | 한 질문 → 보기 배치는 맞는데 칸마다 테가 둘려 줄 열둘이 카드 열둘로 읽힌다 |
| Experience | **MATCH** | 1단이 종류·제목·시작한 달·`다음` 네 줄 · 2단은 고른 영역의 판단만 뜬다 · 짙은 단추 하나 |
| Current State | **MATCH** | 첫 화면이 상태·설명할 수 있는 영역 셋·지금 할 일 하나 · 그 아래에 `여기부터 자세한 내용` 경계 |
| Next Action | **MATCH** | 한 가지 행동이 면을 채우고 나머지는 접힘 · 첫 창 67% |
| Result Summary | **MATCH** | 확인된 것 → 지금 할 일 → 먼저 채울 것 → 산업·직무 · Primary 1 · Secondary 1 · Utility 2 |
| Result Detail | **PARTIAL** | Domain 기본 보기는 셋에 답하는데, **참고 자료 절 하나가 1,441px** 로 둘째로 큰 덩이였고 짙은 단추가 둘이었다 |
| Industry/Role Explore | **MATCH** | 카드가 이름 · 한 줄 · 겹치는 영역 · [자세히 보기] 넷뿐 · 칩 0 |

**MATCH 일곱은 한 줄도 건드리지 않았다**(§2). CSS 를 통일한다는 이유로
다시 뜯지 않았다.

## D. Assessment Desktop: FAIL 이었던 까닭과 고친 것

§4 가 묻는 것은 `숫자 control 보다 질문이 먼저 읽히는가` 다. 고치기 전
화면에서 먼저 읽히는 것은 **표**였다. 그 까닭이 셋이다.

1. **묶음 전체가 상자였다.** 테 · 깎은 모서리 · 색이 깔린 머리띠 안에
   같은 줄이 열둘 쌓이면, 그것은 표의 본문으로 읽힌다
2. **다섯 칸에 테가 돌고 칸 사이에 선이 있었다.** 한 줄에 세로선 여섯,
   열두 줄이면 **일흔둘**이다. 앞 회차가 `칸마다 돌던 테` 를 걷었는데
   그것을 `덩이의 테 + 칸 사이 선` 으로 옮겨 놓았을 뿐이었다
3. **질문과 번호가 같은 무게였다.** 질문은 테 없는 본문 글자이고 번호는
   흰 칸 안의 굵은 글자라, 흰 바탕에서 **테를 두른 쪽이 먼저 읽힌다**

고친 것(`src/app/v3/assessment.css` 하나).

| 자리 | 고치기 전 | 고친 뒤 |
|---|---|---|
| 묶음 | 테 1px · 모서리 · 흰 바탕 | 없음. 구조는 **줄 사이 선 하나**가 만든다 |
| 격자 머리 | `--q-sunk` 가 깔린 띠 + 아래 테 | 평범한 범례 줄 + 아래 선 하나 |
| 다섯 칸 | 덩이 테 + 칸 사이 선 | 테 0 · 칸 사이 선 0 · **담는 면 하나** |
| 칸 너비 | 56px (다섯 280) | 48px (다섯 240) |
| 질문 | `--q-t-body` · 400 | `--q-t-opt` · 500 · 짙게 |
| 번호 | `--q-t-sub` · 650 | `--q-t-gloss` · 500 |
| `모르겠다` | `--q-t-gloss` | `--q-t-meta` · 한 단 더 조용하게 |

**담는 면 하나를 남긴 까닭**은 affordance 다. 번호만 남기면 hover 가 없는
손전화에서 **누를 수 있는 자리인지가 화면에 없다.** 선 일흔둘을 0 으로
만들면서 누를 자리는 보이게 하는 자리가 그 면이다.

1440 에서 질문 **59%** · 다섯 칸 **28%** · 척도 밖 **8%** 다. §5 가 적은
`70 / 30` 에 정확히 닿지는 않았고, 그 까닭은 앞 회차 보고 C 절과 같다:
칸을 더 좁히면 접근성 하한(44px)을 깨고, `모르겠다` 를 줄에서 빼면 §4 가
요구한 **척도 밖의 별도 action** 이 사라진다. 다만 고치기 전 43% 에서
59% 로 올라갔고, 질문이 먼저 읽히는가를 정한 것은 비율보다 **활자와 테**였다. 쪽 길이는 1,258 → 1,223px 이다.

## E. Result Detail: PARTIAL 이었던 까닭과 고친 것

§4 가 요구한 것은 `기본 상태에서 각 Domain 에 대해 무엇이 확인됐는지 ·
무엇을 남겼는지 · 다음에 무엇을 할지만 읽고 넘어갈 수 있어야 한다` 다.
Domain 기본 보기는 이미 그 셋에 답하고 있었다(영역명 · 상태 한 줄 ·
직접 판단한 것 · 남긴 결과 · 다음에 정리할 것 · [상세 근거 보기], 460px).

**그런데 쪽 전체에서 둘째로 큰 덩이가 그 셋과 상관없는 참고 자료였다.**
눈으로 짐작하지 않고 절마다 높이를 재서 찾았다.

| 절 | 고치기 전 | 고친 뒤 |
|---|---|---|
| 먼저 볼 영역 (Domain 셋) | 1,491 | 1,491 |
| **어디에서 찾을지** | **1,441** | **173** |
| 연구·프로젝트를 직무 언어로 (PRO) | 844 | 844 |
| 전체 기술영역 | 509 | 509 |
| 산업 절 · 직무 절 | 449 · 465 | 449 · 465 |
| **쪽 전체** | **7,950** | **6,681** |

`어디에서 찾을지` 가 권역 다섯과 조합 넷과 고르신 자리를 한꺼번에 펼치고
있었다. 셋 다 참고 자료이고 `다음에 무엇을 할지` 에 답하지 않는다.
`권역과 고르신 것 보기` 안으로 접었고, 기본으로 서는 것은 **지역 선택이
무엇을 바꾸고 무엇을 바꾸지 않는가 한 줄과 고르러 가는 길**이다.

**줄을 지우지 않았다.** 접은 자리는 눌러서 펴지고 인쇄 매체에서는 전부
펴진다(`v3:result:height` 가 센다).

**짙은 단추가 둘이었다**(§3 D). 첫 화면의 `지금 할 일로 담기` 와 닫는
자리의 `내 CareerMatri에서 계속하기` 다. 둘이면 읽는 사람이 **무엇이 이
쪽의 주된 행동인지** 를 한 번 더 고른다. 뒤엣것을 테 두른 거드는 단추로
내렸다. 주된 행동은 첫 화면에 있고 닫는 자리는 다 읽은 뒤에 가는 길이다.

## F. Industry / Role Explore: 건드리지 않았다

§4 가 적은 `처음에는 산업 이름 / 한 줄 설명 / 내 경험과 연결되는 영역 /
자세히 보기 정도만` 이 이미 그대로다. 칩 0 · 긴 문장형 설명은 펼침 안.
**MATCH 이므로 한 줄도 고치지 않았다.**

## G. §5 복제 금지 목록

그래프 · 점수 · badge · metric · fake progress · 삽화 · gradient 를 한
줄도 더하지 않았다. 이번 회차가 더한 시각 요소는 **다섯 칸을 담는 면
하나**뿐이고 그것은 값을 그리지 않는다. 쓴 자료는 전부 지금 CareerMatri
가 이미 들고 있는 값이다.

## H. §6 재비교 (고친 뒤)

**이미지에 대고 비교하지 못했다**(A 절). 아래는 §3 A~G 와 §4 와 §5 의
글로 적힌 기준에 대고 Core 화면 열을 다시 읽은 결과다.

| 항목 | 판정 | 근거 |
|---|---|---|
| hierarchy | PASS | 화면마다 dominant 하나. Home `지금 정리하기` · Current State `경험에 추가` · Result `지금 할 일로 담기` · Next Action `경험에 추가` |
| density | PASS | 첫 창 채움 62~100% · 결과 상세 7,950 → 6,681px · 검사 격자 1,258 → 1,223px |
| CTA | PASS | 짙은 단추가 화면마다 **하나**다. Result Detail 의 둘째를 거드는 단추로 내렸다. Explore 는 0(훑는 화면) |
| navigation | PASS | 왼쪽 띠 네 묶음 · 폭 235px · 활성 줄만 옅은 면 · 주인공이 아니다(§3 C) |
| whitespace | PASS | 읽는 폭 760 · 견주는 폭 840~1100 · 1440 에서 빈 면이 큰 자리 0 |
| card count | PASS | Home 2 · Next 1 · Experience 2 · Result Summary 3. Explore 16 과 Result Detail 19 는 **차례로 읽는 묶음**이고 같은 무게로 깔린 dashboard 가 아니다 |
| chip count | PASS | Explore 0 · Home 3 · Next 3. Current State 15 와 Result Detail 19 는 전부 **영역 이름표**이고 경계선 아래다 |
| typography | PASS | 활자 여섯 단 · 그 밖의 크기 0 · 검사 격자에서 질문이 번호보다 한 단 크고 짙다 |
| content grouping | PASS | 결과 상세의 참고 자료가 전부 펼침 안 · 현재 상태의 세부가 `여기부터 자세한 내용` 아래 |
| mobile behavior | PASS | 가로 넘침 0(폭 일곱) · 검사가 한 질문 → 보기 세로 배치 · 결과가 한 판 안의 네 절 |
| product perception | PASS | 검사 격자가 표에서 진단으로 · 결과가 보고서에서 결정 화면으로 |

**Core 화면에 `NEEDS WORK` 가 없다.** 그래도 §7 의 PASS 를 선언하지
않는다: §6 이 요구한 비교 대상(목표 이미지)이 없었기 때문이다. 위 표가
말하는 것은 **글로 적힌 기준에 대해 통과한다**까지다.

## I. Regression

| 검사 | 결과 |
|---|---|
| `v2:frozen` · `v3:build` · `v3:domains` · `v3:items` · `v3:length` · `v3:migrate` · `v3:arch` · `v3:extend` | 통과 |
| `v3:wording` · `v3:persona` · `v3:scoring` · `v3:registry` · `v3:j3` · `v3:measure` · `v3:gaming` | 통과 |
| **`v3:freeze:measure`** | **고치지 않은 채로 통과** |
| `v3:runtime` · `v3:ui` · `v3:copy` · `v3:result` · `v3:result:copy` · `v3:recompute` · `v3:workspace` | 통과 |
| `v3:result:height` · `v3:isolation` · `v3:owner` · `v3:usability` | 통과 |
| `v3:gate` · `v3:loop` · `v3:product-loop` 47 · `v3:visual`(폭 열하나 × 확대 넷) | 통과 |
| `auth:check` · `secrets:check` · `errors:check` · `routes:check` · `runbook:check` · `oauth:ready` · `pilot:ready` · `v3:pilot` | 통과 |
| `a11y:check`(10쪽) | 대비미달 0 · 작은단추 0 · 이름표없음 0 |
| `copy:audit` | 통과 |
| `v3:freeze` · `v3:result:freeze` | 판본을 올리고 지문을 다시 적었다 |
| 캡처 | 자리 15 × 폭 둘 · 겹침 0 · 가로 넘침 0 (`docs/metri/shots/align/`) |

**짙은 단추를 기계가 센다.** 화면마다 배경 밝기가 0.55 아래인 단추와
링크를 세어 적었다. Home 1 · Current State 1 · Next Action 1 · Experience 1
· Result Summary 1 · Result Detail **2 → 1** · Track 1 · Explore 0(훑는
화면). 고치기 전 Result Detail 의 둘을 이 수가 찾았다.

## J. Version

| 판본 | 앞 회차 | 이번 회차 |
|---|---|---|
| 검사 화면 | `ME_V3_2_ASSESSMENT_UI_V10` | `ME_V3_2_ASSESSMENT_UI_V11` |
| 검사 문장 | `me-v3-2-assessment-copy.12` | **그대로** (CSS 만 바뀌었다) |
| 결과지 | `ME_V3_RESULT_UI_V14` · `me-v3-result-copy.14` | `ME_V3_RESULT_UI_V15` · `me-v3-result-copy.15` |
| 작업공간 | `CAREERMATRI_WORKSPACE_UI_V12` · `careermatri-workspace-copy.10` | **그대로** (MATCH 라 건드리지 않았다) |
| 문항 은행 · 판단 규칙 · 결과 모델 | `V2.5` · `scoring.5` · `result-model.5` | **그대로** |

## K. 운영에서 확인할 것

이 컨테이너의 네트워크 정책이 `app.careermatri.com:443` 을 막아(HTTP 000)
**운영 배포본을 밖에서 한 번도 열지 못했다.** 위의 모든 결과는 이 기계에서
운영과 같은 배치(`scripts/stage-serve.sh`)로 띄워 돌린 것이다. DB 스키마를
한 줄도 바꾸지 않았으므로 마이그레이션은 필요 없고, 고친 것이 전부 이미지
안으로 들어가는 파일이라 **재배포가 먼저다.**

재배포 뒤에 사람이 눌러야 하는 자리는 넷이다.

1. `/v3/{id}` 영역 훑기. 상자와 칸 사이 선이 사라졌는지, 다섯 칸이
   **누를 수 있는 자리로 보이는지**(손전화에서 특히), 확대 125·150% 에서
   같은지
2. `/v3/{id}/result` 상세에서 `어디에서 찾을지` 가 한 줄 + 펼침으로 서는지,
   `권역과 고르신 것 보기` 가 **눌리는지**
3. `/v3/{id}/result` 상세에서 짙은 단추가 첫 화면의 하나뿐인지
4. iPhone Safari 실기기. 이 컨테이너에서 WebKit 을 내려받지 못해
   크로뮴에 iOS 화면을 씌워 찍었다

## L. 판정을 바꾸는 길

목표 UI 이미지를 첨부해 주시면 §1 과 §6 을 이미지에 대고 다시 돌린다.
그 한 바퀴에서 Core 화면에 `NEEDS WORK` 가 없으면 그때
`VISUAL REFERENCE ALIGNMENT PASS / PRODUCTION UNVERIFIED` 를 적는다.
지금 적을 수 없는 까닭은 **대조할 기준을 받지 못했기 때문**이고,
화면이 모자라서가 아니다.
