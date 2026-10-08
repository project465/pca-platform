# 까닭 코드 스물한 가지

**엔진은 코드만 내놓는다.** 사람이 읽는 말은 `text.ko.ts` 에 있고 엔진은
그 파일을 읽지 않는다. 검사가 두 가지를 센다: 엔진 파일에 사람에게 나갈
한국어가 없는지와, 엔진이 번역표를 읽지 않는지다.

영어판을 여는 날 번역만 늘리면 되고, **채점을 고치지 않는다.** 채점을
고치면 이미 산 사람의 결과가 번역 작업 때문에 움직인다.

## 1. 근거가 선 영역에서 떨어진 까닭

| 코드 | 뜻 | 한국어 예 |
|---|---|---|
| `MISSING_REQUIRED_AXIS` | 그 영역의 필수 축 가운데 하나가 확인되지 않았다 | 이 영역이 꼭 보는 판단 가운데 하나가 아직 확인되지 않았습니다 |
| `MISSING_OUTPUT` | 산출물 축이 확인되지 않았다 | 실제 판단 경험은 확인됐지만 이를 남긴 산출물이 아직 확인되지 않았습니다 |
| `MISSING_OUTPUT_EVIDENCE` | 산출물 축은 확인됐고 고른 산출물이 없다 | 산출물을 내셨다고 답하셨는데 그것이 무엇인지는 아직 고르지 않으셨습니다 |
| `MISSING_VERIFICATION` | 비교·검증 축이 확인되지 않았다 | 무엇과 견주어 확인했는지가 아직 비어 있습니다 |
| `INSUFFICIENT_CONFIRMED_AXES` | 확인된 축이 넷에 못 미친다 | 확인된 판단이 아직 넷에 못 미칩니다 |

## 2. 판단할 근거 자체가 부족한 까닭

| 코드 | 뜻 |
|---|---|
| `NO_CONFIRMED_AXIS` | 확인된 축이 하나도 없다 |
| `NO_RESPONSE` | 그 영역의 심화 문항에 답이 없다 |
| `NOT_ROUTED` | 그 영역이 이번 응시에서 열리지 않았다 |
| `TIER_WITHOUT_DEEP_AXES` | 이 등급은 여덟 축을 묻지 않는다 |

## 3. 관심과 근거가 어긋난 자리

| 코드 | 뜻 |
|---|---|
| `LOW_INTEREST_WITH_EVIDENCE` | 근거는 섰고 관심이 낮다 |

## 4. 다음 걸음

| 코드 | 언제 |
|---|---|
| `TRY_SHORT_EXPERIENCE` | 관심이 높고 겪은 적이 없다 |
| `STUDY_NEXT` | 거기에 학습 의향까지 높다 |
| `BUILD_OUTPUT` | 확인된 축이 둘 이상이고 산출물이 비었다 |
| `ADD_VERIFICATION` | 산출물은 있고 검증이 비었다 |
| `RECHECK_DIRECTION` | 근거는 있고 관심이 낮다 |
| `NOT_A_PRIORITY` | 관심이 낮고 확인된 축도 하나 이하다 |

## 5. 응답 품질

| 코드 | 언제 |
|---|---|
| `REVERSE_PAIR_AGREED` | 반대 방향 두 문항을 함께 높게 답했다 |
| `LOW_VARIANCE_GRID` | 격자가 거의 한 값이다 |
| `CONSISTENCY_PAIR_GAP` | 같은 축의 두 장면이 두 칸 이상 갈렸다 |
| `CHECKLIST_MISMATCH_HIGH` | 소유를 골랐는데 그 축에 고른 항목이 없다 |
| `CHECKLIST_MISMATCH_LOW` | 고른 항목이 있는 축에 답이 없다 |

## 6. 묶음과 축 상태의 번역

| 코드 | 한국어 |
|---|---|
| `Z1_EVIDENCE_ESTABLISHED` | 근거가 선 영역 |
| `Z2_EVIDENCE_INCOMPLETE` | 관심은 있고 근거가 아직 덜 선 영역 |
| `Z3_EVIDENCE_LOW_INTEREST` | 근거는 있고 관심이 낮은 영역 |
| `Z4_INSUFFICIENT_EVIDENCE` | 아직 판단할 근거가 부족한 영역 |
| `NOT_EXPLORED` | 이번에 열지 않은 영역 |
| `NOT_OBSERVED` | 아직 확인되지 않음 |
| `PARTICIPATED` | 받아 쓴 범위까지 확인 |
| `CONFIRMED` | 확인 |
| `OWNED` | 직접 정한 것으로 확인 |

**화면에 코드를 적지 않는다.** 되짚어 보실 자리가 필요하면 괄호로 남기고,
스냅샷에는 코드가 그대로 있다.
