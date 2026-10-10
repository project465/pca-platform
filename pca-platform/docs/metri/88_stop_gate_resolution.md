# STOP GATE 둘을 닫는다

`CJ_GIVEN_REV` 의 construct·response mismatch 와 산업팩 문항 셋만 다룬다.
새 전면 감사는 하지 않았다. UI · Workspace · PG · OAuth · 다른 Major Core 는
한 줄도 건드리지 않았다.

함께 읽는 자리: `87_measurement_audit.md`(측정체계 감사 A~Z) ·
`86_measurement_stop_gate.md`(두 자리의 내력) ·
`84_measurement_map.md`(측정 지도) · `85_persona_gaming.md`(사람 열세 벌)

---

## A. 운영 응답 수 — `PRODUCTION UNKNOWN`

**0건이라고 적지 않는다.** 이 세션에서 운영 DB 와 운영 배포본에 닿지 못했다.

| 확인한 것 | 결과 |
|---|---|
| 운영 DB 연결 문자열 | 환경변수에 없음 |
| `app.careermatri.com:443` | HTTP 000 (연결 거절). 네트워크 정책이 막는다 |
| `careermatri.com:443` | HTTP 000 |
| Railway Shell | 권한 없음 |

**로컬 개발 DB 에서 센 것** (운영이 아니다):

| 센 것 | 수 |
|---|---|
| `v3_responses` 전체 | 1,097 |
| `CJ_GIVEN_REV` 응답 | 12 |
| `v3_attempts` 전체 / 제출됨 | 13 / 8 |
| `v3_snapshots`(굳은 결과) | 8 |
| 응답을 남긴 사용자의 `is_demo` | 13 / 13 전부 참 |
| `ME_V3_BASIC_KR` · `STANDARD` · `PRO` 의 `active` | 셋 다 거짓 |

로컬 응답 전부가 QA·시연 자료이고 실제 사용자가 0명이며, ME_V3 상품 셋이
꺼져 있어 상품 경로로는 응시가 열리지 않는다. **그래도 이것은 운영에 대한
답이 아니다.**

### 그래서 고치는 길을 어떻게 골랐나

운영에 응답이 **있어도 안전한 길**만 골랐다. 고른 길은 저장된 응답의 뜻을
바꾸지 않고 migration 을 요구하지 않는다.

| 안전 조건 | 지킨 방식 |
|---|---|
| 저장된 응답의 뜻 | `{kind:"level", index:0~3}` 과 그 번호의 뜻이 그대로다 |
| response scale | `L0~L3` 그대로. 옛 응답이 새 척도와 어긋나지 않는다 |
| 판단축 | `J3` 그대로. 기여 경로가 바뀌지 않는다 |
| 굳은 결과 | 다시 계산하지 않는다. `v3_snapshots` 는 읽기만 한다 |
| migration | 필요 없다. 스키마와 값이 한 칸도 바뀌지 않았다 |
| 되만들기 | 같은 응답을 다시 채점하면 같은 판정이 나온다 |

**운영에 응답이 있었다면 달라지는 것은 하나다**: 그 사람은 선호를 묻는
문장에 답했고 그 답이 이제 겪은 장면 문장 아래에 놓인다. 그 한 가지가
지금 상태보다 나쁘지 않은 까닭은, **지금은 그 답이 이미 J3 판단 확인으로
세어지고 있다**는 것이다. 문면을 고치는 것은 저장된 번호가 엔진이 이미
가정하던 뜻을 갖게 만드는 일이다.

---

## B. mismatch 가 생긴 원인

**ME_V3 V1 에서는 맞았다.**

| 칸 | V1 `CJ_ASSUME_REV` |
|---|---|
| 문면 | `남이 정해 둔 가정을 그대로 받아서 계산만 하는 편이 편하다` |
| 척도 | `5점` (다섯 칸 동의 척도) |
| 축 | J1 |
| 역방향 | 참 |
| rationale | `역방향. CJ_PROBLEM 과 같은 축을 반대로 묻는다. 둘을 함께 높게 답하면 일관성 신호로 적는다` |

선호 문면에 다섯 칸 척도이고, 같은 축의 정방향 짝(`CJ_PROBLEM`, J1)이
실제로 있었다. **`quality.ts` 가 `CJ_PROBLEM` 을 글자로 적어 둔 까닭이
여기 있다.**

**ME_V3_2 재설계에서 셋이 따로 어긋났다.**

1. CORE-JUDGE 묶음을 소유 사다리 `L0~L3` 로 통일하면서 **이 문항의 척도도
   같이 옮겼다.** 축도 J1 에서 J3 으로 옮겼다
2. 정방향 짝 `CJ_PROBLEM` 은 `CJ_SCOPE` 로 다시 쓰이면서 **J1 에 남았다.**
   그래서 J3 에 정방향 짝이 없어졌고 역방향 규칙이 돌 수 없게 됐다
3. 문면 고치기가 **반만 끝났다**

**셋째가 핵심이다.** `me-v3-2-migration.json` 의 그 줄이 이렇게 적혀 있다.

```
planned_reason: "역문항은 은행에 이것 하나뿐이라 남긴다.
                 다만 `편이 편하다` 를 겪은 장면으로 바꾼다"
reason:         "`남이 정해 둔 가정을 ...` 는 가정이라는 말이 해석 쪽으로
                 좁게 읽혔다. 조건으로 바꿔 모든 영역에 걸리게 했다"
agrees:         true
```

**계획은 맞았다.** `편이 편하다` 를 겪은 장면으로 바꾸라고 적혀 있고, 척도를
`L0~L3` 로 옮긴 것은 그 계획과 맞는다. 실행에서 `가정 → 조건` 만 적용되고
`~편이 편하다` 가 남았다. `agrees: true` 로 적힌 까닭은 그 검사가 견주는 것이
`planned_reason` 이 아니고 `reason` 이기 때문이다.

**같은 자리에서 네 번째 어긋남도 나왔다.** blueprint 는
`stage_variants: true` 라고 적어 두었고 은행의 `stage_wording` 은 `null`
이었다. 은행 101자리 가운데 **이 한 자리가 유일한 어긋남**이었고, 그것을
세는 검사가 없었다.

---

## C. 세 해결안 비교

| | 길 1 선호 문항으로 | 길 2 소유 문항으로 (**고른 쪽**) | 길 3 그대로 두고 파일럿에서 본다 |
|---|---|---|---|
| 측정 construct | PREFERENCE | JUDGMENT | 정해지지 않은 채로 |
| response type | LIKERT_5 | OWNERSHIP_4 (그대로) | OWNERSHIP_4 |
| scoring 영향 | 공통 J3 기여가 사라진다 | **없다** (문면만 바뀐다) | 없다 |
| 기존 응답 영향 | `level` 응답이 새 척도와 어긋난다. **migration 필요** | **없다.** 번호의 뜻이 그대로 | 없다 |
| 결과 영향 | 공통 J3 한 자리가 비고 선호 칸이 새로 선다 | 문장 하나가 제대로 선다 | 선호 응답이 판단 확인으로 적힌다 |
| backward compatibility | 깨진다 (옛 응답 해석 규칙이 필요하다) | **유지** | 유지 |
| 사용자 이해도 | 문면과 보기가 맞는다 | 문면과 보기가 맞는다 | 어긋난 채다 |
| cross-validation 역할 | 역방향 짝이 선다 (정방향 짝을 새로 둬야 한다) | J3 정방향 하나가 는다 | 가짜 교차검증으로 남는다 |
| 응답 수 | 그대로 | 그대로 | 그대로 |

---

## D. 고른 해결안과 까닭

**길 2.** 문면을 겪은 장면으로 다시 쓰고 역방향 표시를 내렸다.

| 칸 | 전 | 후 |
|---|---|---|
| 문면 | `조건은 위에서 내려오고 나는 그대로 계산만 하는 편이 편하다` | `이미 정해져 내려온 조건을 근거를 들어 바꿔 본 적이 있다` |
| 학위 장면 | 없음 | 넷 (학부 · 석사 · 박사 · 포닥) |
| 역방향 표시 | 참 | 거짓 |
| 보기 · 자리 번호 · 축 · 척도 | 소유 사다리 넷 · 0~3 · J3 · `L0~L3` | **그대로** |

까닭이 셋이다.

1. **이것이 설계가 이미 정한 길이다.** migration map 의 `planned_reason` 이
   그렇게 적어 두었고 척도는 그 계획대로 옮겨져 있었다. 남은 일은 문면을
   끝내는 것이었다
2. **운영 응답 수가 `PRODUCTION UNKNOWN` 이다.** 세 길 가운데 저장된 응답의
   뜻을 바꾸지 않는 길이 이것뿐이다
3. **J3 가 얇아지지 않는다.** 길 1 은 공통 J3 의 입력을 하나 줄이는데, 이
   길은 하나를 제대로 세운다

선택 원칙과 맞는지: 문면이 **실제 행동과 판단 책임**을 묻는다. 내려온 조건을
받아 쓴 것과 근거를 들어 바꾼 것이 갈리고, 보기 넷이 그 행동을 누가
소유했는지를 받는다.

**문항 번호는 바꾸지 않았다.** `_REV` 는 이제 내력만 남은 이름이지만, 번호를
바꾸면 저장된 응답의 열쇠가 바뀌어 migration 이 생긴다.

---

## E. scoring 영향

**판단 규칙 판본을 올리지 않았다** (`me-v3-scoring.5` 그대로).

| 센 것 | 결과 |
|---|---|
| 사람 열두 벌의 기대 묶음과 까닭 | 통과 (12벌) |
| 사람 열두 벌 Core 지문 (`coreOnly`) | **고치기 전과 글자까지 같다** |
| 두 번 돌려도 같은 값 | 통과 |
| 남이 정한 것을 받아 쓴 응답은 확인이 아니다 | 참여 8축 · 확인 0축 |
| 학위 넷 불변 | 같은 응답이면 네 학위의 근거 판정이 같다 |
| 산업·역할 팩 → Core | 팩 문항 17개를 바닥에서 천장까지 바꿔도 Core 지문이 같다 |

역방향 표시를 내려도 판정이 바뀌지 않는 까닭은, **그 규칙이 짝이 없어 애초에
한 번도 돌지 않았기** 때문이다.

---

## F. 기존 데이터 영향

**없다.** migration 도 되만들기도 필요하지 않다.

- 스키마 변경 0줄. `DROP` · `TRUNCATE` · reset 0건
- 저장된 응답의 모양과 뜻이 그대로다
- `v3_snapshots` 의 굳은 결과는 다시 계산하지 않는다. 결과지는 그때 적어 둔
  모델을 그대로 꺼내 그린다
- 모델에 칸을 더하지 않았으므로 옛 판본의 굳은 결과가 그대로 선다
  (`v3:result` 의 `굳은 결과에 새 칸이 없어도 결과지가 선다` 가 센다)

---

## G. J3 cross-validation 구조

한 응시에서 J3 를 올릴 수 있는 입력이 **열하나 + 근거 고르기**다.

| 입력 | 묶음 | construct | response type | 등급 |
|---|---|---|---|---|
| `CJ_GIVEN_REV` | CORE-JUDGE | JUDGMENT | OWNERSHIP_4 | BASIC |
| `UG_DECIDE` / `MS_METHOD` / `PHD_PICK` / `PD_ALONE` | 학위 묶음 (하나만 받는다) | JUDGMENT | OWNERSHIP_4 | BASIC |
| `CN_1A` · `CN_1B` | CONSIST | CONSISTENCY | OWNERSHIP_4 | STANDARD |
| `TR_T4` · `TR_T8` | TRANS-10 | TRANSLATION | CHOICE_WITH_NOTE | PRO |
| `TDxx_J3_1` · `TDxx_J3_2` | PROBE-S4 | OWNERSHIP | OWNERSHIP_4 | BASIC / STANDARD |
| 산업팩 J3 문항 | INDUSTRY | OWNERSHIP | OWNERSHIP_4 | PRO |
| 역할팩 J3 문항 | ROLE | OWNERSHIP | OWNERSHIP_4 | STANDARD |
| `checklist:TDxx.J3` | 근거 고르기 | EVIDENCE | EVIDENCE_PICK | STANDARD |

**독립으로 세는 묶음이 여덟이다.** construct 와 response type 과 장면 가운데
하나라도 달라야 독립으로 센다(`measurement/registry.ts` 의 `independent`).
같은 묶음 안에서 같은 construct 와 같은 척도로 다시 묻는 자리는 되풀이로
묶었다: CONSIST 2 · TRANS-10 2 · PROBE-S4 2 · INDUSTRY 2.

**영역 J3 는 이 문항에 애초에 매달리지 않았다.** `CJ_GIVEN_REV` 은 기술영역이
없어서 영역 축에 들어가지 않고 `context.common` 으로 간다. 새던 자리는
결과지가 `영역을 가리지 않고 확인된 판단` 으로 적는 공통 J3 였고, 그 자리도
학위 묶음 문항이 함께 받치므로 **고친 뒤에도 한 문항에 매달리지 않는다.**

근거와의 연결: 소유로 올라가려면 `checklist:TDxx.J3` 에서 고른 항목이 둘
이상 있어야 한다(`OWNED_EVIDENCE_MIN = 2`). 산출물(J5)과 검증(J6)은 각자의
축에서 따로 받는다.

---

## H. Preference-only persona 결과

`npm run v3:j3` 가 사람 넷을 세워 raw 응답에서 축 상태까지 찍는다.

**고치기 전**

```
A  선호만 (preference only)   영역 J3 NOT_OBSERVED   공통J3 확인·직접정함 ← CJ_GIVEN_REV
```

아무 경험도 주장하지 않고 선호와 태도만 높인 사람이 **공통 J3 를
`직접 정한 것으로 확인` 까지** 받았다. 출처가 이 문항 하나였다.

**고친 뒤**

```
A  선호만 (preference only)       영역 J3 NOT_OBSERVED   공통J3 아직
B  소유만 (근거 0)                 영역 J3 CONFIRMED      공통J3 아직
C  소유 + 근거                     영역 J3 OWNED          공통J3 아직
D  판단 + 산출물 + 검증 전부         영역 J3 OWNED          공통J3 아직   Z1
```

**이 벌이 성립하는지 먼저 센다.** `선호만` 벌이 소유 사다리에서 한 칸이라도
올라가 있으면 아래 검사가 통과해도 아무것도 증명하지 못한다. 이 저장소에서
`한 번도 돌지 않은 검사` 가 두 번 나왔으므로 벌의 성립을 먼저 센다:
사다리 전부 바닥임을 확인했다.

---

## I. Gaming persona 결과

`npm run v3:gaming` 사람 열세 벌. 통과 26 · 걸림 0.

| 벌 | 근거가 선 영역 | 소유 축 | 머리글 |
|---|---|---|---|
| A 전부 최고로 답한 사람 (근거 0) | **0** | **0** | 해 본 일은 있고, 설명할 재료가 아직 모자랍니다 |
| E 직접 판단 주장 · 근거 0 | 0 | 0 | 해 본 일은 있고, 설명할 재료가 아직 모자랍니다 |
| F 근거 많고 소유 낮음 | 0 | 0 | 관심 있는 쪽은 또렷하고, 해 본 일이 아직 적습니다 |
| T 솔직하게 답한 사람 | **12** | **96** | 지원서에서 정리해볼 만한 근거가 있는 영역이 있습니다 |

전부 최고로 답한 사람에게 비어 있는 자리 24개와 할 일 24개가 남고 응답 품질
표시가 선다. 여덟 벌이 서로 다른 결과 문장을 받는다.

**막는 것은 역방향 문항이 아니다.** 이번 회차로 역방향 문항이 0개가 됐는데
이 결과는 그대로다. 막는 것은 소유가 **응답과 고른 근거 둘**을 함께 보는
규칙이다.

---

## J. Persona 열두 벌 regression

`v3:j3` 가 고치기 전의 지문을 `assessment/ME_V3/j3-before.json` 에 적어 두고
고친 뒤 글자로 견준다. 견주는 칸이 다섯이다: Core 지문 · 응답 품질 flag ·
결과 머리글 · 첫 걸음 · 비어 있는 자리와 할 일의 수.

```
통과  사람 열두 벌의 Core 결과가 고치기 전과 같다 — 열두 벌 지문 그대로
```

**의도한 변화 밖의 차이가 0 이다.** 문면만 바뀌었으므로 판정이 바뀔 수 없고,
그것을 말로 적지 않고 지문으로 확인했다.

---

## K. 산업팩 셋 처리

**Core 와 떨어져 있다는 것을 먼저 돌려 확인했다.**

```
통과  산업·역할 팩 응답이 Core 판정을 바꾸지 않는다
      — 팩 문항 17개를 바닥에서 천장까지 바꿔도 Core 지문이 같다
통과  산업을 바꿔도 Core 판정이 같다 — SEMICON vs DEFENSE
```

그래서 Wave 0 전에 억지로 고치지 않고 **여섯 문항에
`HUMAN_DOMAIN_REVIEW_REQUIRED` 를 표시**했다. 셋이 아니라 여섯인 까닭은 닮은
쌍의 **양쪽**을 다 표시했기 때문이다: 한쪽만 고치면 다른 쪽이 일반 문장으로
남는다.

| item_id | 봐야 하는 것 |
|---|---|
| `INDUSTRY_MOBILITY_V2_I6` | 자동차에서 달라지는 조건(패키징 공간 · 주행 풍속 · 법규 온도 한계)이 문면에 없다 |
| `INDUSTRY_BATTERY_V2_I1` | 배터리에서 달라지는 조건(셀 간 온도 편차 · 열폭주 전파)이 문면에 없다 |
| `INDUSTRY_DEFENSE_V2_I6` | 방산에서 달라지는 조건(규격 시험 항목 · 환경 시험 등급)이 문면에 없다 |
| `INDUSTRY_BATTERY_V2_I6` | 배터리 안전 시험에서 달라지는 조건(열폭주 · 압괴 · 과충전)이 문면에 없다 |
| `INDUSTRY_SEMICON_V2_I7` | 반도체에서 달라지는 조건(수율과 공정 창)이 문면에 없다 |
| `INDUSTRY_BATTERY_V2_I3` | 배터리에서 달라지는 조건(공정 창과 용량 · 수명 산포)이 문면에 없다 |

`v3:measure` 가 표시마다 까닭이 적혀 있는지와 표시한 문항에도 쉬운 말 풀이가
있는지를 센다. **표시만 두면 다음 사람이 무엇을 봐야 하는지 모른다.**

파일럿에서 따로 묻는 셋: 문항 이해도 · 그 산업답게 느껴지는지 · 일반
기계공학 문항처럼 느껴지는지.

---

## L. 더한 자동검사

| 명령 | 세는 것 | 결과 |
|---|---|---|
| `npm run v3:registry` | construct 등록부 · response type 짝 표 · 역방향 짝 · 일관성 짝 | 통과 9 |
| `npm run v3:j3` | J3 승격 경로 사람 넷 · 독립 교차검증 지도 · 열두 벌 전후 지문 | 통과 11 |

### construct registry

`src/lib/me-v3/measurement/registry.ts` 에 이름 열셋과 response type 아홉과
짝 표가 있고, `sites/pca-platform/content/me-v3-2-constructs.json` 에 문항
369줄이 있다. **문항 이름이나 문면에서 추론하지 않는다**: 줄이 없는 문항은
`UNKNOWN_CONSTRUCT` 로 걸리고, 사람이 정한 줄(`pinned`)은 생성기가 덮지
않는다.

| construct × response type | 문항 |
|---|---|
| OWNERSHIP × OWNERSHIP_4 | 194 |
| VERIFICATION × OWNERSHIP_4 | 47 |
| OUTPUT × OWNERSHIP_4 | 39 |
| JUDGMENT × OWNERSHIP_4 | 30 |
| INTEREST × LIKERT_5 | 12 |
| LEARNING_INTENT × LIKERT_5 | 12 |
| EXPERIENCE × EXPOSURE_3 | 12 |
| TRANSLATION × CHOICE_WITH_NOTE | 10 |
| TRANSLATION × SINGLE_CHOICE | 4 |
| CONSISTENCY × OWNERSHIP_4 | 4 |
| GOAL × SINGLE_CHOICE | 3 |
| ROUTING_ONLY × FORCED_CHOICE | 2 |

### response-type compatibility matrix

| construct | 받아도 되는 response type |
|---|---|
| INTEREST | LIKERT_5 |
| LEARNING_INTENT | LIKERT_5 |
| EXPERIENCE | EXPOSURE_3 |
| OWNERSHIP | OWNERSHIP_4 |
| JUDGMENT | OWNERSHIP_4 |
| OUTPUT | OWNERSHIP_4 · MULTI_SELECT · EVIDENCE_PICK |
| VERIFICATION | OWNERSHIP_4 · MULTI_SELECT · EVIDENCE_PICK |
| EVIDENCE | EVIDENCE_PICK · MULTI_SELECT |
| PREFERENCE | LIKERT_5 · SINGLE_CHOICE · FORCED_CHOICE |
| ROUTING_ONLY | SINGLE_CHOICE · FORCED_CHOICE · MULTI_SELECT |
| CONSISTENCY | OWNERSHIP_4 |
| TRANSLATION | CHOICE_WITH_NOTE · SINGLE_CHOICE · MULTI_SELECT |
| GOAL | SINGLE_CHOICE · MULTI_SELECT |

**짝 표가 실제로 거르는지 되돌려 확인했다.** 고치기 전의 `CJ_GIVEN_REV` 를
참값(`PREFERENCE`)으로 적어 두고 돌리니 걸렸다.

```
걸림  construct 와 response type 이 맞는 짝이다 — CJ_GIVEN_REV PREFERENCE×OWNERSHIP_4
```

`INTEREST × OWNERSHIP_4` 와 `OWNERSHIP × LIKERT_5` 와
`EVIDENCE × LIKERT_5` 도 같은 자리에서 걸린다.

### 고친 검사 셋

- `v3:items` 와 `v3:wording` 이 `역방향 문항이 하나 이상` 을 세고 있었다.
  그 수는 설계 선택이고, **짝이 없는 역방향 문항은 아무것도 재지 않는다.**
  세는 것을 짝의 유무로 바꿨다. 역방향을 다시 넣는 날 짝까지 넣어야
  지나간다
- `v3:measure` 의 `적어 둔 예외` 둘(`MASK_OK` · `NO_SENTENCE`)을 비웠다.
  문항이 제대로 된 판단 문항이 되었으므로 예외가 필요하지 않다
- **`v3:extend` 의 가짜 core 둘이 그 계약을 안 지키고 있었다.** 새 규칙으로
  바꾸자 전기전자와 경영학 가짜 core 가 걸렸다: 둘 다 CORE-JUDGE 에 역방향
  자리 하나만 두고 정방향 짝을 두지 않았다. 옛 규칙(`하나 이상`)으로는
  지나갔던 자리다. **고친 쪽은 검사가 아니라 가짜 core 다**: 짝이 없는
  역방향 자리는 품질 규칙에서 아무것도 재지 않으므로 가짜 core 도 그 계약을
  지켜야 한다. 새 규칙이 실제로 무엇을 거르는지 그 자리에서 드러났다

---

## M. 변경된 version

| 판본 | 전 | 후 | 까닭 |
|---|---|---|---|
| 문항 은행 | `ME_V3_ITEM_BANK_V2.4` | **`V2.5`** | 문항 하나의 문면 · 학위 장면 넷 · 역방향 표시 |
| 판단 규칙 | `me-v3-scoring.5` | **그대로** | 판정이 한 글자도 바뀌지 않았다 |
| 결과 모델 | `me-v3-result-model.5` | **그대로** | 구조가 바뀌지 않았다. 담기는 문항이 하나 늘었다 |
| 결과 문장 | `me-v3-result-copy.8` | **`.9`** | 읽는 이름 하나를 더해 30 / 30 이 됐다 |
| 결과 화면 | `ME_V3_RESULT_UI_V8` | **그대로** | 화면 파일이 바뀌지 않았다 |
| 검사 화면 | `ME_V3_2_ASSESSMENT_UI_V7` | **그대로** | 문면은 은행이 들고 있다 |
| 작업공간 | `CAREERMATRI_WORKSPACE_UI_V6` | **그대로** | 건드리지 않았다 |

**검사 화면 판본을 같이 올리지 않은 까닭**을 `ui-version.ts` 에 적어 두었다.
같이 올리면 되짚을 때 화면이 바뀐 회차와 문항이 바뀐 회차를 가를 수 없다.

---

## N. commit SHA

| commit | 내용 |
|---|---|
| `0659fc4` | 측정체계 감사 (앞 회차) |
| `a7bb5c6` | 보고 87 의 Y 절 |
| `9e1342d` | STOP GATE 둘 · 등록부 둘 · 검사 둘 |
| (이 줄을 적은 commit) | 회귀 집계와 판정 |

가지는 `claude/amazing-thompson-w3f2o2` 이고 `origin` 에 올라가 있다.

### 회귀 (`npm run v3:all`, 서른여덟 묶음)

이 기계의 배포본을 띄워 끝까지 돌렸다. **종료코드 0 · 통과 551 · 걸림 0 ·
보고 1.** 보고 한 줄은 `역방향 문항이 0개다` 이고 아래 L 절이 그 뜻을 적어
두었다.

```
v2:frozen  v3:build  v3:domains 15  v3:items 16  v3:length 19  v3:migrate 14
v3:arch 20  v3:extend 14  v3:wording 35  v3:persona 15  v3:scoring 31
v3:registry 9  v3:j3 11  v3:measure 28(보고 1)  v3:gaming 26  v3:runtime 28
v3:ui 28  v3:copy  v3:freeze  v3:result 25  v3:result:copy 9  v3:recompute 7
v3:isolation 11  v3:owner 19  v3:usability 12  v3:visual  v3:gate 18
v3:loop 15  v3:result:freeze  v3:workspace  auth:check  secrets:check 7
errors:check 8  routes:check 10  runbook:check 7  oauth:ready 11
pilot:ready 15  v3:pilot 29
```

확장성 검사도 같이 돌았다: 전기전자와 경영학 core 를 데이터로만 올려
통과한다(가짜 core 둘에 정방향 짝을 넣은 뒤).

---

## 완료 선언 조건 대조

| 조건 | 상태 |
|---|---|
| `CJ_GIVEN_REV` construct/response mismatch 해결 | 끝 (D 절) |
| preference-only → J3 승격 0 | 끝 (H 절) |
| all-high gaming 방어 유지 | 끝 (I 절) |
| persona 열두 벌 회귀 확인 | 끝 (J 절) |
| dead item 0 | 끝. DEAD 0 · MASKED 0 |
| unknown item reference 0 | 끝. 코드가 적어 둔 문항 번호 전부가 은행에 있다 |
| cross-check map 유지 | 끝 (G 절). 독립 묶음 여덟 |
| Industry Pack → Core mutation 0 | 끝 (K 절) |
| frozen old result render 정상 | 끝 (F 절) |

| 반드시 포함할 여섯 | 자리 |
|---|---|
| production response count | A 절 (`PRODUCTION UNKNOWN`) |
| construct registry | L 절 |
| response-type compatibility matrix | L 절 |
| J3 escalation fixtures | H 절 · `npm run v3:j3` |
| independent cross-check map | G 절 |
| before/after persona diff | J 절 · `j3-before.json` |

---

## 판정

**MEASUREMENT ARCHITECTURE READY FOR PILOT**

이 판정이 말하는 것은 **스무 명에서 서른 명을 불러도 쓸 수 있는 자료가
모인다**는 것까지다. 검증된 검사라는 뜻도, 규준이 있다는 뜻도 아니다.
`87_measurement_audit.md` 의 V 절 인간 검토 여덟 가지와 Z 절 위험 열 가지가
그대로 남아 있고, 여기에 둘을 보탠다.

- **운영 응답 수가 `PRODUCTION UNKNOWN` 이다.** 그래서 운영에 응답이 있어도
  안전한 길을 골랐지만, 초대를 보내기 전에 운영 컨테이너에서
  `select count(*) from v3_responses` 를 한 번 보는 것이 맞다
- **산업팩 여섯 문항이 산업 경력자 검토를 기다린다.** Core 와 떨어져 있으므로
  Wave 0 를 막지 않는다
