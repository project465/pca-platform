# R11 BIZ Evidence 를 PRODUCT STRUCTURE LEVEL 에서 다시 세웠다

범위는 **BIZ Evidence 한 절**이다. `presentation / layout / result copy
resolver` 만 고쳤고, measurement · scoring · item bank · assessment
question · answer meaning · result decision · evidence decision · gap
decision · registry · DB schema · `student_open` 을 한 줄도 건드리지
않았다(§13). 다른 Core 로 넓히지 않았고 115개 학과로 복제하지 않았다(§12).

읽는 차례는 ① 캡처 → ② 버린 구조 → ③ 새 구조 → ④ copy BEFORE/AFTER →
⑤ Desktop/Mobile → ⑥ frozen logic → ⑦ 회귀다(§14).

---

## ① 제출 캡처 여덟 장

`docs/metri/shots/review-loop/r15-evidence/`

```
1  Desktop 결과 연속 흐름        flow-desktop.png        (.rs-hero → .rs-ev2)
2  Mobile  결과 연속 흐름        flow-mobile.png
3  Desktop Evidence 전체         gate4-desktop.png       (section#evidence h2 → .rs-ev2)
4  Mobile  Evidence 전체         gate4-mobile.png
5  Desktop OPENING + 경험 1      gate4-desktop-card.png  (.rs-ev2-of → .rs-ev2-use)
6  Mobile  OPENING + 경험 1      gate4-mobile-card.png
7  Desktop 경험 2 + 활용         gate4-desktop-card2.png (.rs-ev2-also)
8  Mobile  경험 2 + 활용         gate4-mobile-card2.png
```

응시 10343 · `BIZ_CORE_V1` · `PCU26_BIZ`(배재대 경영학과) · PERSON C ·
PRO. 캡처 하네스는 같은 그림이 두 이름으로 저장되면 그 자리에서 멈춘다
(sha256 대조).

---

## ② 버린 기존 구조 (R9)

R9 는 경험 둘의 **차례**를 갈랐지만 조각의 **성격**은 둘 다 `카드 한 장`
이었다. 그래서 색과 여백을 바꿔도 `경험 1 카드 / 경험 2 카드` 로 읽혔다.
DOM 과 CSS 를 통째로 버렸다.

- **`.rs-chain` wrapper 와 `article` 둘.** 경험마다 `article` 하나에
  eyebrow → 큰 한 마디 → 보조 → 남은 결과 → 활용 두 줄을 담던 틀.
- **`label → value` 두 줄 묶음.** `지원서에 꺼낼 포인트` / `면접에서 받을
  질문` 이 경험마다 같은 꼴로 서던 자리(`.rs-st-use` · `.rs-nx-use`).
- **들머리 판정문** `전부 직접 하신 일`.
- **반복되던 라벨 여섯**: `이 경험을 이렇게 써볼 수 있어요` · `지원서에
  꺼낼 포인트` · `면접에서 받을 질문` · `남은 결과` · `내가 직접 정한 것` ·
  `같이 쓸 이야기` / `먼저 쓸 이야기`(§2).
- CSS 로는 `.rs-chain` · `.rs-st` · `.rs-st-of` · `.rs-st-head` ·
  `.rs-st-lead` · `.rs-st-kept` · `.rs-st-use` · `.rs-nx` · `.rs-nx-of` ·
  `.rs-nx-head` · `.rs-nx-say` · `.rs-nx-use` 열두 묶음을 화면·좁은
  화면·종이 세 벌에서 지웠다.
- 문장 층에서는 `evidenceStoryKo` 와 그 다섯 토막(`head` · `lead` ·
  `kept` · `resume` · `ask`)을 버렸다.

**빈 캔버스에서 다시 물었다**(§0). `학생이 3초 봤을 때 무엇을 먼저 알아야
하는가` → 지원서에 쓸 수 있는 **내 경험 한 장면**이다. 그 답을 먼저
세우고 나머지를 그 아래에 달았다.

---

## ③ 새 정보 구조 (네 막 · §3)

```
ACT 1  OPENING          eyebrow  내가 이미 가진 근거      (카드 금지 · 판정문 금지)
                        작은 of  경영전략·기획
                        headline 근거를 들어 여러 방법 중 하나를 골라 본 경험

ACT 2  WHAT I DID       행동 장면 하나 (평서문)
                        └ 들여쓴 document chip 둘   ACTION → OUTPUT
                          목표·지표 정리표 / 사업계획

ACT 3  USE IT           [지원서]  action cue        ← 좌: cyan surface (유일한 강조면)
                        "면접 질문"                 ← 우: 큰 인용 활자 + cite
                        (좌우 비대칭 · 둘의 시각 역할이 다르다)

ACT 4  SECONDARY        ── 금 ──
       EVIDENCE         of · 결과물이 머리 · 평서문 한 줄
                        활용 두 줄은 왼쪽 hairline 들여쓰기 (proof strip)
                        → 훨씬 짧고 DOM 구조가 ACT 2·3 과 다르다
```

**ACT 2 와 ACT 4 가 DOM 까지 다르다**: ACT 2 는 `p` + `ul > li`(chip),
ACT 4 는 `aside` 안의 `p` 넷이고 격자 자리만 다르다. 같은 component 를
무게만 달리 그리지 않는다.

**ACT 3 의 둘은 역할이 다르다.** 왼쪽은 `지원서` 태그가 붙은 **행동
지시**(radius 20 cyan surface), 오른쪽은 **실제 질문**을 큰 활자로 띄운
`blockquote` 다. 이름표도 `면접에서 받을 질문`(라벨)이 아니라 인용 아래의
`cite` 다.

**Visual (§4·§5).** 한 viewport 의 강한 rounded surface가 **한
개**(`.rs-ev2-cue`, radius 20)이고 보조 surface가 document chip
(radius 10)이다. 색은 white · cool off-white · navy · muted cyan ·
제한적 teal 뿐이고 beige/brown · lilac · pastel card 3종 · rainbow ·
gradient 가 0건이다. editorial 요소(headline · 금 · chip)는 radius 0~10
이고 999px pill 은 `지원서` 태그 하나에만 쓴다.

**Alignment (§6).** headline 왼쪽 → chip 들여쓰기(`margin-left: --r-s7`)
→ 활용 좌우 비대칭(`23rem / 1fr`) → ACT 4 세 단(`17rem / 1fr / 1.1fr`)
으로 리듬이 네 번 바뀐다. Desktop 은 1400px 격자를 실제로 쓰고 중앙에 작은
문서를 두지 않는다.

---

## ④ AI copy BEFORE / AFTER

같은 응시(10343)에서 렌더된 글자다.

**BEFORE (R9)**

```
내가 이미 가진 근거
전부 직접 하신 일
경영전략·기획
근거를 들어 여러 방법 중 하나를 골라 본 경험
목표가 애매한 부분은 가정을 세워 적었어요.
남은 결과  목표·지표 정리표 / 사업계획
지원서에 꺼낼 포인트   하지 않을 것과 먼저 할 것을 가른 기준
면접에서 받을 질문     그 기준은 어떻게 정했는지 말해보세요.
마케팅·시장에서 남은 것
채널별 성과 비교표 / 캠페인 기획서
무엇을 알릴지 범위를 좁혀 적었고, 고객을 나누는 기준도 직접 정했어요.
지원서  채널별 예산 배분을 정한 근거
면접    그 기준은 어떻게 정했는지 말해보세요.
그 밖에  영업·사업개발 / 재무·투자 판단
```

**AFTER (R11)**

```
내가 이미 가진 근거
경영전략·기획
근거를 들어 여러 방법 중 하나를 골라 본 경험
목표가 애매한 부분은 가정을 세워 적었습니다
목표·지표 정리표
사업계획
지원서
하지 않을 것과 먼저 할 것을 어떤 기준으로 나눴는지부터
"전사 목표와 어떻게 맞췄나요?"
면접에서 이어질 질문
마케팅·시장
채널별 성과 비교표 / 캠페인 기획서
고객을 나누는 기준은 직접 정했습니다
지원서엔 채널별 예산 배분을 정한 근거
"고객을 나누는 기준은 어떻게 정했나요?"
그 밖에
영업·사업개발 / 재무·투자 판단
```

| | R8 | R9 | R10 | **R11** |
|---|---|---|---|---|
| 첫 노출 글자 | 340자 | 224자 | 185자 | **204자** |
| 줄 | — | — | — | **17줄** |
| 마침표 | 14 | 2 | 0 | **0** |
| `~요` 로 닫는 줄 | 13 | 0 | 0 | **0** |
| `습니다` 로 닫는 줄 | 0 | 0 | 3 | **2** |

R11 의 204자가 R10 의 185자보다 큰 까닭은 **세는 범위가 다르다**는
것이다: R11 셈에는 eyebrow `내가 이미 가진 근거`(8자)와 `지원서`
태그(3자)와 `면접에서 이어질 질문` cite(9자)가 들어 있고 R10 셈에는
없었다. 그 스물을 빼면 184자다. **R8·R9 의 수는 다른 회차에 다른 범위로
잰 값이라 이 표에서 뺄셈을 하지 않는다.**

**세 가지 꼴을 섞는다**(§7).

- **A 행동문**: `목표가 애매한 부분은 가정을 세워 적었습니다`
- **B 명사형**: `목표·지표 정리표` · `사업계획` · `채널별 성과 비교표`
- **C 실제 질문**: `"전사 목표와 어떻게 맞췄나요?"`

**금지 표현 0건**(§7 열두 가지 · §2 라벨 일곱 가지). `경험이 있습니다` ·
`정리해 두었습니다` · `이렇게 활용해보세요` · `설명하기 쉬워집니다` ·
`근거로 남아 있습니다` · `도움이 됩니다` · `~하면 좋아요` · `~했어요` 가
전부 0 이다.

**§8 Human copy rule.** 매 문장에 `취업상담사가 학생 옆에서 실제로 이
말을 할까` 를 물었다. `그 기준은 어떻게 정했는지 말해보세요` 는 NO 였다
(상담사는 질문을 **그대로** 말한다) → `"전사 목표와 어떻게 맞췄나요?"`.
**Core/Domain 이름을 문장 template 에 끼워 넣지 않는다**: 영역 이름은
문장 밖의 작은 `of` 줄 하나뿐이고, 활용 문장은 그 영역이 일하는 차례의
`먼저 정하는 것` 과 응답의 `verifications` 에서 온다.

---

## ⑤ Desktop / Mobile 차이 (§9)

세로 스택이 아니다. 같은 DOM 을 쓰지만 격자와 리듬이 갈린다.

| | Desktop (≥880px) | Mobile 390 |
|---|---|---|
| headline | `clamp(34px,3.4vw,46px)` · `max-width:15ch` | `clamp(27px,3.1vw,42px)` · 선독 |
| chip | 문장 아래 `margin-left: --r-s7` 들여쓰기 | 문장 바로 아래 왼쪽 정렬 |
| ACT 3 | `23rem / 1fr` **좌우 비대칭** 두 단 | 세로 둘 · cue 먼저 · 질문이 한 단 작게 |
| ACT 4 | `17rem / 1fr / 1.1fr` 세 단 | 세로 네 줄 · 활용 둘만 hairline 들여쓰기 |
| 절 높이 | 2535px | 4031px |
| 막별 높이 | 19 / 116 / 87 / 117 / 80 / 18 | 19 / 67 / 80 / 188 / 160 / 18 |

Mobile 은 **한 화면에 최소 하나의 의미 단위가 완결된다**: OPENING + 행동
장면 + chip 이 첫 화면에서 끝나고 ACT 3 이 그다음 화면이다. 긴 report
scroll 이 아니고 작은 label 을 지웠으며 **본문이 16px 아래로 줄지
않는다**(`--r-t-body` 16px 그대로). 전부 가운데 정렬이 아니다: headline 과
chip 과 cue 가 왼쪽이고 금만 전폭이다.

---

## ⑥ Frozen logic (변경 없음 · §13)

| | 상태 | 증거 |
|---|---|---|
| measurement | 불변 | `v3:freeze:measure` 14/14 **재기록 없이** 통과 |
| scoring | 불변 | `me-v3-scoring.5` 그대로 · `src/lib/me-v3/scoring/` diff 0줄 |
| item bank | 불변 | `ME_V3_ITEM_BANK_V2.5` 그대로 · `bank-lock.json` diff 0줄 |
| assessment question | 불변 | `sites/pca-platform/content/*-items.json` diff 0줄 |
| answer meaning | 불변 | `ownership.ts` · `band()` diff 0줄 |
| result decision | 불변 | `me-v3-result-model.6` 그대로 · `result/model.ts` · `build.ts` diff 0줄 |
| evidence decision | 불변 | `zones.ts` diff 0줄 |
| gap decision | 불변 | `gaps` 산출 코드 diff 0줄 |
| registry | 불변 | `major-cores.json` · `campus-universities.json` diff 0줄 |
| DB schema | 불변 | `db/` diff 0줄 → **migration 불필요** |
| student_open | 불변 | `open_to_students` 한 칸도 바뀌지 않았다 |

**변경 파일은 일곱 벌이다.**

```
src/lib/me-v3/result/text.ko.ts          result copy resolver
src/lib/me-v3/result/version.ts          판본과 근거 기록
src/app/v3/[attemptId]/result/page.tsx   presentation (네 막 JSX)
src/app/v3/result.css                    layout (화면·좁은 화면·종이)
scripts/lab/gate34-shots.ts              캡처 하네스 selector
sites/pca-platform/assessment/ME_V3/result-lock.json    동결 지문
sites/pca-platform/assessment/ME_V3/core-ui-lock.json   동결 지문
```

판본은 화면과 문장만 올렸다: `ME_V3_RESULT_UI_V59` ·
`me-v3-result-copy.51`. **문항 은행과 판단 규칙과 결과 모델 판본은
그대로다.**

---

## ⑦ 회귀 결과

| 검사 | 결과 |
|---|---|
| `v3:freeze:measure` | 14 / 14 · **기록 재작성 없음** |
| `v3:result` | 25 / 25 |
| `v3:result:copy` | 16 / 16 |
| `v3:freeze` (검사 화면) | 파일 19벌 그대로 |
| `v3:result:freeze` | V59 로 재기록 |
| `v3:workspace` | 파일 44벌 그대로 |
| `v3:freeze:core` | 재기록 |
| `v3:content:qa` | 60벌 · 걸림 0벌 (20 Core × 사람 셋) |
| `v3:human` | 10 / 10 · 걸림 0 (`DUMP=var/content-qa-r11`) |
| `v3:product-loop` | 65 / 65 · 걸림 0 |
| `v3-pdf-audit` | 22벌 · 걸림 0 · **보고 3** |

`v3-pdf-audit` 의 보고 셋은 **R8 전부터 있던 자리**이고 이 회차가 만든
것이 아니다: `ME_CORE_V3 STANDARD` 마지막 쪽 38% · `CS_CORE_V1 PRO` 39%
와 13쪽 · `SPORTS_CORE_V1 PRO` 39% 와 13쪽. 쪽 높이가 고정이라 마지막 쪽
채움은 제로섬이고(한 자리를 올리면 다른 자리가 내려간다) 셋 다 앞 쪽이
89~100% 로 차 있어 밀린 덩이도 빈 쪽도 없다.

**근거 절은 종이 쪽수를 바꾸지 않았다**: 학교 종이가 12쪽 그대로이고
BIZ PRO 의 쪽별 찬 비율이 89/98/95/96/98/96/97/99/95/99/100/73% 다.

---

## §11 Screenshot-driven review (A~L)

캡처를 찍고 A~L 열두 문항을 판정했다. **1차에서 NO 가 넷**이어서 고치고
다시 찍었고, 2차에서 NO 가 하나 남아 한 번 더 고쳤다(§11 은 2회 이상을
요구한다).

| | 문항 | 1차 | 2차 | 최종 |
|---|---|---|---|---|
| A | 카드 반복으로 읽히는가 | NO | NO | **NO** |
| B | label → value 나열인가 | NO | NO | **NO** |
| C | 같은 cyan panel 이 반복되는가 | NO | NO | **NO** |
| D | 경험 2 가 경험 1 의 변형인가 | NO | NO | **NO** |
| E | 전부 왼쪽 정렬인가 | NO | NO | **NO** |
| F | 모든 문장이 완전한 설명문인가 | NO | NO | **NO** |
| G | 같은 어미가 3회 이상 잇따르는가 | **YES** | NO | **NO** |
| H | 마침표가 남발되는가 | NO | NO | **NO** |
| I | ACTION → OUTPUT 이 끊겨 읽히는가 | **YES** | NO | **NO** |
| J | 보조 근거가 본 근거와 같은 무게인가 | **YES** | **YES** | **NO** |
| K | Desktop 중앙에 작은 문서가 떠 있는가 | **YES** | NO | **NO** |
| L | Mobile 이 Desktop 축소판인가 | NO | NO | **NO** |

**1차에서 고친 것 넷.**

- **I**. chip 을 2단 격자의 오른쪽 끝에 두어 행동 장면과 결과물이
  **서로 떨어진 두 항목**으로 읽혔다. 격자를 걷고 문장 아래로 들여썼다.
- **G**. 한 화면에 `습니다` 가 셋이었다. ACT 4 의 결과물 줄을
  이름씨(`keep.join(" / ")`)로 바꿔 행동문이 둘만 남는다.
- **K**. ACT 3 을 중앙 정렬 한 단으로 두어 1400px 에서 가운데에 작은
  문서가 떴다. `23rem / 1fr` 비대칭 두 단으로 폭을 실제로 썼다.
- **J**(1차). ACT 4 의 네 줄이 같은 무게로 서서 목록으로 읽혔다. 활용 두
  줄에 왼쪽 hairline 들여쓰기를 주고 질문을 본문 크기·accent 로 올렸다.

**2차에서 고친 것 하나.**

- **J**(2차). 그래도 ACT 4 의 결과물 머리가 15rem 단에서 두 줄로 접혀
  본 근거와 비슷한 덩이가 됐다. Desktop 단을 `17rem / 1fr / 1.1fr` 로
  넓혀 한 줄에 선다. 최종 ACT 4 높이가 ACT 2+3 의 39%(Desktop)다.

**padding 조정으로 끝내지 않았다**: I 와 K 는 격자를 버린 것이고 G 와
J 는 돌려주는 값의 **꼴**을 바꾼 것이다.

---

## 아직 아닌 것

네트워크 정책이 `app.careermatri.com:443` 을 막아 **운영 배포본을 밖에서
한 번도 열지 못했다**(HTTP 000). **학생 공개 상태를 한 칸도 바꾸지
않았다.** 다른 Core 로 넓히지 않았고 115개 학과로 복제하지 않았다. 영역
사전이 같은 결과물 이름을 쓰는 Core 쌍(BIZ = PUBADM)과 종이 보고 셋은
문항 은행 지문이 덮는 자리라 그대로 적어 둔다.
