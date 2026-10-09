# 80. 선택지 STOP GATE: 3지선을 5단계로 바꿀 수 있는가

> 지시대로 **구현보다 먼저** 적었다. 순서는 ① 값 구조 조사 ② 읽는 자리 표
> ③ 바꿀 수 있는 것과 안 되는 것 분류 ④ backward compatibility mapping
> ⑤ persona regression ⑥ 결과가 변하는 범위다.

## 1. 지금 저장되는 값

문항 은행(`sites/pca-platform/content/me-v3-2-items.json`)의 영역 훑기
서른여섯 문항이다. `response_scale` 이 `3보기` 이고 보기와 값이 이렇다.

| 축 | 보기 | 저장되는 값 |
|---|---|---|
| `interest` | 관심 있다 · 관심이 적다 · 잘 모르겠다 | `5` · `1` · `null` |
| `exposure` | 해 본 적 있다 · 조금 있다 · 없다 | `2` · `1` · `0` |
| `learning_intent` | 배우고 싶다 · 아니다 · 잘 모르겠다 | `5` · `1` · `null` |

`null` 자리는 화면이 글자 `UNKNOWN` 을 보내고
`normalize/read` 가 `ANSWERED_UNKNOWN` 으로 받는다. **수가 아니다.**

## 2. 읽는 자리

| 값 | 읽는 자리 | 무엇으로 바꾸는가 |
|---|---|---|
| `interest.raw` | `scoring/engine.ts:118` | `band(raw)` → `LOW` / `MID` / `HIGH` |
| `learning.raw` | `scoring/engine.ts:147` | 같은 `band()` |
| `exposure.raw` | `scoring/engine.ts:128` | `expLabel`: `0=NONE` · `1=ONCE_OR_TWICE` · `≥2=SEVERAL` |
| `exposure.raw` | `normalize.ts:touched()` | `>= 1` 이면 그 영역을 해 봤다고 본다 |
| `exposure.raw` | `normalize.ts:routedFor()` | 선별 축 **둘째 문항**을 열지 말지 |
| `interest.band` | `zones.ts:decide()` | `=== "LOW"` 분기 둘 |
| `interest.band` | `zones.ts:nextSteps()` | `=== "HIGH"` 분기 하나 |
| `interest.band` | `engine.ts:173` | 같은 상태로 묶인 영역의 열쇠 |
| `interest.band` | `engine.ts:185` | `focus` 마지막 칸(관심 높은 Z4) |
| `interest.band` | `result/build.ts:114` | `HIGH` 가 하나라도 있으면 `EXPLORING` |
| `experience.label` | `result/build.ts:93` · `result/page.tsx:162` | 사람이 읽는 세 마디 |

**`band()` 는 이미 다섯 값을 받는다**(`normalize.ts` 마지막 줄).

```ts
export function band(v: number): "LOW" | "MID" | "HIGH" {
  return v >= 4 ? "HIGH" : v <= 2 ? "LOW" : "MID";
}
```

`1~2 = LOW` · `3 = MID` · `4~5 = HIGH`. 지시의 권장 mapping 과 **글자까지
같다.** 그러니까 5단계는 새 mapping 이 필요한 변경이 아니고, **화면이
다섯 가운데 셋만 내놓고 있던 것**이다.

## 3. 분류

| 축 | 판정 | 까닭 |
|---|---|---|
| Interest | **5단계로 바꾼다** | `band()` 가 이미 1~5 를 가른다. 채점 코드 0줄 |
| Learning Intent | **5단계로 바꾼다** | 같은 함수를 지난다 |
| Experience | **3단계 유지** | 아래 |
| Ownership | 4단계 유지 | 서로 다른 경험 의미다. Likert 가 아니다 |
| Forced choice | 2지선 유지 | 강제 선택이 목적이다 |
| Evidence | checkbox 유지 | 복수 선택이다 |
| 프로필·계열 | categorical 유지 | 묻는 말을 고르는 분기다 |

### Experience 를 늘리지 않는 까닭

읽는 자리가 셋이고 **셋 다 세 값 이상을 쓰지 않는다.**

- `expLabel` 이 `0` · `1` · `≥2` 로 세 마디를 만든다. 다섯으로 늘리면
  `2·3·4` 가 전부 `SEVERAL` 로 모인다
- `touched()` 와 `routedFor()` 는 `>= 1` 만 본다
- 결과지가 내놓는 것도 `해 본 적 없음 · 한두 번 · 여러 번` 세 마디다

그래서 다섯으로 받으면 **받고 쓰지 않는 값이 둘 생긴다.** 이 저장소는 그
자리를 0 으로 유지하기로 했고(`v3:migrate` 가 센다), 네 번이나 그 문제로
회차를 썼다. 보기를 늘리려면 `expLabel` 과 결과지 문장과 Gap 규칙을 같이
늘려야 하고, 그것은 **ResultModel 변경**이라 이 회차의 금지 목록에 든다.

대신 **UI 는 고친다**: 세 보기를 `없다 · 한두 번 · 여러 번` 순서(지금은
거꾸로 서 있다)로 세우고 다른 척도와 같은 segmented control 로 그린다.

## 4. Backward compatibility mapping

바꿀 것이 없다. 옛 응답이 들고 있는 값은 `5` · `1` · `UNKNOWN` 셋이고,
새 보기에서도 같은 자리에 같은 값이 선다.

| 옛 보기 | 옛 값 | 새 보기 | 새 값 | band |
|---|---|---|---|---|
| 관심 있다 | `5` | 매우 관심 있다 | `5` | HIGH |
| — | — | 관심 있다 | `4` | HIGH |
| — | — | 보통이다 | `3` | MID |
| — | — | 별로 관심 없다 | `2` | LOW |
| 관심이 적다 | `1` | 전혀 관심 없다 | `1` | LOW |
| 잘 모르겠다 | `UNKNOWN` | 잘 모르겠다 (척도 밖) | `UNKNOWN` | `null` |

**옛 응시의 스냅샷은 한 글자도 달라지지 않는다.** 저장된 값이 그대로이고
읽는 함수가 그대로다.

## 5. persona regression

`sites/pca-platform/assessment/ME_V3/personas.json` 의 열두 사람이 이미
**관심 1·2·3·4·5 와 배울 뜻 2·3·4·5 를 쓴다.**

```
P01 관심=[3]        P07 관심=[1,4,5]
P02 관심=[5]        P09 관심=[2,4,5]
P03 관심=[3,4,5]    P11 관심=[3,4]
```

그래서 **5단계 화면이 만들 수 있는 모든 값이 이미 골든에 들어 있다.**
`MID` 는 도달 불가능한 band 가 아니라 fixture 가 늘 지나던 자리였고, 화면만
그 값을 못 보내고 있었다.

`npm run v3:scale` 이 네 가지를 더 센다.

1. `band()` 가 1~5 와 `UNKNOWN` 을 표대로 가른다
2. 옛 세 값(`5`·`1`·`UNKNOWN`)만으로 돌린 Core 지문이 **바꾸기 전과 같다**
3. 새 값 둘(`4`·`2`)이 옛 값(`5`·`1`)과 **같은 band 를 만든다**
4. `3` 은 `MID` 이고 `LOW` 분기와 `HIGH` 분기 **어디에도 들어가지 않는다**

## 6. 결과가 변하는 범위

| 무엇 | 변하는가 |
|---|---|
| 이미 응시한 사람의 스냅샷 | **아니다.** 값과 읽는 함수가 그대로다 |
| 채점 코드 | **0줄** |
| zone 규칙 · 필수 축 · 소유 판정 | 아니다 |
| ResultModel | 아니다 |
| 문항 문면(`grid_row`) | 아니다 |
| 문항 은행의 보기(`options`·`option_values`) | **그렇다.** 셋에서 다섯 |
| 문항 은행 판본 | `ME_V3_ITEM_BANK_V2.3` → `V2.4` |
| 새 응시에서 나올 수 있는 band | `MID` 가 실제로 나온다 (전에는 화면이 못 보냈다) |

마지막 줄이 이 변경의 **전부**다. `MID` 로 답한 영역은 `LOW` 분기(Z3)에도
`HIGH` 분기(TRY_SHORT_EXPERIENCE)에도 들어가지 않고 `Z2` 나 `Z4` 로 간다.
그 길은 P01 과 P03 과 P10 이 이미 지나는 길이다.

**측정 판본을 올리는 까닭.** 보기가 셋에서 다섯이 되면 같은 사람이 다른
값을 보낼 수 있다(전에는 `관심 있다` 하나로 받던 사람이 `4` 와 `5` 로
갈린다). 설계 원칙 4 대로 **문항을 고치지 않고 판본을 올린다.** Wave 0
초대를 아직 보내지 않았으므로 섞이는 응답이 없다.
