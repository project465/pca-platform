# CareerMatri Workspace Productization

로그인한 뒤에 쓰는 쪽을 **계속 돌아와 쓰는 작업공간**으로 세웠습니다.
검사와 결과지는 이번 회차에서 한 줄도 바꾸지 않았습니다.

---

## 1. 실제로 바꾼 Workspace 화면

| 화면 | 무엇을 바꿨나 |
|---|---|
| App Shell | 쪽 안쪽 꼭대기에 **작업공간 띠**(`.cm-bar`)를 세웠다. 지금 어느 줄에 있는지 · 어느 전공인지 · 이 쪽의 한 가지를 든다. 왼쪽 띠는 한 단 가라앉혀(`--sf-surface-2`) 붙여 두었고, 본문이 그 옆의 작업 면이 된다 |
| Home | 띠가 전공을 들고 있으므로 쪽 머리의 kicker 에서 전공을 걷었다. 차례는 그대로다: 지금 할 일 → 현재 상태 → 최근 변화 → 기록 |
| Current State | 띠에 `+ 경험 추가` 를 두었다. 첫 화면 차례는 그대로다 |
| Experience List | 카드 더미를 **한 줄짜리 목록**으로 바꿨다. 한 줄에 다섯: 제목 · 종류 · 연결된 기술영역 · 반영 여부 · 날짜 |
| New Experience | 세 걸음 구조 그대로. 머리의 kicker 만 걷었다 |
| Next Action | 세로 가운데 맞춤을 걷고 위에서 시작하게 했다. 띠에 `+ 경험 추가` |
| Result History | 결과 하나를 **한 줄**로 바꿨다: 날짜 · 전공 · 등급 · 고정됨 · [결과 보기] [PDF] |
| Industry / Role | 세 칸 카드 벽을 **목록**으로 바꿨다. 줄마다 이름 · 한 줄 설명 · 이어지는 기술영역 · 자세히 보기 |
| Track | 그대로(준비 중 · 앞으로 제공할 기능 · 지금 되는 것). 세로 가운데 맞춤만 걷었다 |
| 계정 `/my/*` | 같은 껍데기 안에서 같은 띠를 쓴다. kicker `계정` 을 걷었다 |

**이름을 두 번 적지 않는다.** 띠가 든 줄 이름을 쪽 머리에서 걷었고, 띠가
든 단추는 쪽 머리에서 좁은 화면에만 선다. 손전화 위 띠도 쪽마다 적던
이름 대신 메뉴의 그 줄 이름을 쓴다: 전에는 같은 자리가 `탐색` 과
`산업·직무` 로 달리 불렸다.

---

## 2. Desktop / Mobile screenshot

`docs/metri/shots/workspace/before` 와 `.../after` 에 있습니다. 자리
여덟 × 폭 둘(1440×900 · 390×844), 첫 창과 쪽 전체.

```
1_home  2_state  3_exp  4_expnew  5_next  6_results  7_explore  8_track
```

---

## 3. 바뀐 전후의 핵심 차이

| | 전 | 후 |
|---|---|---|
| 쪽 꼭대기 | 큰 제목이 빈 바탕 위에 혼자 섰다 | 띠가 `지금 어디 · 어느 전공 · 한 가지` 를 든다 |
| 왼쪽 띠 | 흰 면이라 본문 쪽이 배경처럼 읽혔다 | 한 단 가라앉은 chrome, 본문이 작업 면 |
| 짧은 쪽 | 세로 가운데에 떠서 **안내창**으로 읽혔다 | 위에서 시작하는 작업공간 쪽 |
| 경험 · 결과 · 탐색 | 카드 더미(카드 하나 200~250px) | 한 줄짜리 목록 |
| 탐색 쪽 길이 | 2,485px (손전화 4,820px) | **1,813px** (손전화 2,773px) |
| 손전화 탐색 | 이름이 설명에 밀려 `자동차·모...` 로 잘렸다 | 이름 → 설명 → 이어지는 영역 → 자세히 보기 |

---

## 4. 기존 로직 불변

바꾸지 않은 것: Assessment UI · 문항 · scoring · ownership · zone ·
ResultModel · Result Summary · Result Detail · PDF · DB schema · 가격 ·
Product Loop 로직.

- `npm run v3:freeze`: 검사 화면 15벌 **그대로**
- `npm run v3:result:freeze`: 결과지 10벌 **그대로**
- `npm run v3:freeze:measure`: 측정 동결을 **다시 적지 않은 채로** 통과
- `npm run v3:product-loop`: 47 / 0

**새 값을 만들지 않았다.** 화면이 드는 것은 전부 `currentState()` 와
`experiencesOf()` 와 굳은 결과에서 옵니다.

---

## 5. Regression

| 묶음 | 결과 |
|---|---|
| `v3:product-loop` | 47 / 0 |
| `v3:loop` | 15 / 0 |
| `v3:gate` | 19 / 0 |
| `v3:visual` | 자리 20 · 폭 11 · 확대 4 OK |
| `v3:usability` | 12 / 0 |
| `v3:delta` | 16 / 0 |
| `v3:result:height` | 28 / 0 |
| `v3:workspace` | 파일 41벌 · 쓰는 이름 80개가 전부 CSS 에 있다 |
| `v3:copy` · `copy:audit` · `a11y:check` · `routes:check` | OK |
| `v3:freeze` · `v3:result:freeze` · `v3:freeze:core` · `v3:freeze:measure` | OK |

`v3:loop` 의 `한 화면에 짙은 단추가 하나다` 가 한 번 걸렸습니다. 쪽 머리의
단추가 넓은 화면에서 꺼져 있는데도(`.cm-acts.is-narrow`) DOM 으로 세고
있어서, **멀쩡한 화면이 걸렸습니다.** 세는 자리를 `:visible` 로 좁혔습니다.

**새 검사를 만들지 않았습니다.** 고친 것은 이미 있던 줄 하나입니다.

---

## 6. 판본과 동결

| 판본 | 전 | 후 |
|---|---|---|
| 작업공간 화면 | `CAREERMATRI_WORKSPACE_UI_V12` | `CAREERMATRI_WORKSPACE_UI_V13` |
| 작업공간 문장 | `careermatri-workspace-copy.10` | `careermatri-workspace-copy.11` |
| 검사 화면 · 결과지 · 문항 은행 · 채점 · 결과 모델 | | **그대로** |

**새 동결 종류를 만들지 않았습니다.** 이미 있는
`CAREERMATRI_CORE_UI_FREEZE_1` 이 세 동결을 묶고 있어서, 얼린 화면 목록에
넷을 더했습니다(Result History · New Experience · Track · App Shell).
이제 열둘입니다. 측정 동결(`ME_V3_MEASUREMENT_FREEZE_1`)과는 그대로
별개입니다.

---

## 7. 아직 아닌 것

네트워크 정책이 `app.careermatri.com:443` 을 막아 **운영 배포본을 밖에서
한 번도 열지 못했습니다**(HTTP 000). 위의 결과는 전부 이 기계에서 운영과
같은 배치로 띄워 돌린 것입니다. iPhone Safari 실기기 확인이 남아 있습니다.
DB 스키마를 한 줄도 바꾸지 않았으므로 마이그레이션은 필요 없고, 고친 것이
전부 이미지 안으로 들어가는 파일이라 **재배포가 먼저입니다.**

---

## 판정

```
CAREERMATRI WORKSPACE PRODUCTIZATION PASS / PRODUCTION UNVERIFIED
```

`COMMERCIAL READY` 라고 적지 않습니다.
