# 응시 182 추적표 (원본 응시 174 의 응답을 같은 번호·값으로 옮김)

- 로그인 아이디: `r34-trace@test.invalid` · 스냅샷 `154`
- DB 에 적힌 것: `v3_responses` **109** 줄 · `v3_evidence_picks` **8** 줄 · `v3_snapshots` **1** 줄
- 응답 종류: scale5 15 · exposure 12 · choice 15 · level 67
- 판본: `core_code=BIZ_CORE_V1` · `item_bank_version=BIZ_V1_ITEM_BANK_V1.3` · `scoring_version=me-v3-scoring.5` · `result_model_version=me-v3-result-model.6` · `result_copy_version=me-v3-result-copy.64` · `result_ui_version=ME_V3_RESULT_UI_V75`

## 1. 고른 근거 8개 → 결과 모델 → 종이

| # | 영역 | 자리(slot) | 글자 그대로 | 결과 모델 칸 | 종이 쪽 |
|---|---|---|---|---|---|
| 1 | 마케팅·시장 | ARTIFACT | 캠페인 기획서 | axes[J5].picks → did, artifacts | 2,3,7 |
| 2 | 마케팅·시장 | J3 | 고객을 나누는 기준을 정했다 | axes[J3].picks → did, decided | 3,7 |
| 3 | 마케팅·시장 | J3 | 채널별 예산 배분을 정했다 | axes[J3].picks → did, decided | 3,7 |
| 4 | 마케팅·시장 | VERIFY | 지난 캠페인 반응 | axes[J6].picks → did, verifications | 2,3,4,7 |
| 5 | 데이터·의사결정 | ARTIFACT | 지표 정의표 | axes[J5].picks → did, decided, artifacts | 2,3,4,7 |
| 6 | 데이터·의사결정 | J3 | 자료에서 넣을 것과 뺄 것을 정했다 | axes[J3].picks → (확인에 못 미쳐 did/decided 에 없음) | — |
| 7 | 데이터·의사결정 | J4 | 분석 방법을 골라 적용했다 | axes[J4].picks → did | 3,7 |
| 8 | 데이터·의사결정 | VERIFY | 지난 기간 값 | axes[J6].picks → did, verifications | 2,3,7 |

## 2. 영역별 판정 (응답 → 축 상태 → 묶음)

| 영역 | 묶음(zone) | 축 상태 (from = 문항 번호) | did | decided | artifacts | verifications |
|---|---|---|---|---|---|---|
| 마케팅·시장 | Z1_EVIDENCE_ESTABLISHED | J1:CONFIRMED[TD02_J1_1] · J2:PARTICIPATED[TD02_J2_1] · J3:OWNED[TD02_J3_1,TD02_J3_2] · J4:CONFIRMED[TD02_J4_1] · J5:CONFIRMED[TD02_J5_1,TD02_J5_2] · J6:CONFIRMED[TD02_J6_1,TD02_J6_2] · J7:CONFIRMED[TD02_J7_1,TD02_J7_2] · J8:CONFIRMED[TD02_J8_1] | 4 | 2 | 1 | 1 |
| 데이터·의사결정 | Z1_EVIDENCE_ESTABLISHED | J1:PARTICIPATED[TD08_J1_1] · J2:PARTICIPATED[TD08_J2_1] · J3:PARTICIPATED[TD08_J3_1,TD08_J3_2] · J4:CONFIRMED[TD08_J4_1] · J5:OWNED[TD08_J5_1,TD08_J5_2] · J6:CONFIRMED[TD08_J6_1,TD08_J6_2] · J7:CONFIRMED[TD08_J7_1,TD08_J7_2] · J8:CONFIRMED[TD08_J8_1] | 3 | 1 | 1 | 1 |
| 고객·서비스 운영 | Z2_EVIDENCE_INCOMPLETE | J1:PARTICIPATED[TD09_J1_1] · J2:CONFIRMED[TD09_J2_1] · J3:CONFIRMED[TD09_J3_1,TD09_J3_2] · J4:CONFIRMED[TD09_J4_1] · J5:PARTICIPATED[TD09_J5_1,TD09_J5_2] · J6:CONFIRMED[TD09_J6_1,TD09_J6_2] · J7:CONFIRMED[TD09_J7_1,TD09_J7_2] · J8:PARTICIPATED[TD09_J8_1] | 0 | 0 | 0 | 0 |

## 3. 종이에 선 표현과 그 출처

| 자리 | 종이에 선 글자 | 결과 모델의 출처 칸 | 문장을 만든 함수 | 종이 쪽 |
|---|---|---|---|---|
| 머리 알약 | 지원서에 바로 쓸 수 있어요 | `overview.headline`=EVIDENCE_READY | result/text.ko.ts `HEADLINE_BADGE_KO` | — |
| 머리글 | 마케팅·시장 과제에서 방향을 직접 정해 본 일이 있어요 | `overview.focus[0]`=TD02 + J3 상태 | result/text.ko.ts `headlineKo()` | — |
| 머리 보조 줄 | 지원서에 그대로 쓰시면 돼요. | `overview.headline` | result/text.ko.ts `headlineLead()` | — |
| 근거 절 첫 경험 · 행동 | 고객을 나누는 기준을 정했습니다 | domains[TD02].decided[0] / did[0] | result/text.ko.ts `evidenceStoryKo()` | 2 |
| 근거 절 첫 경험 · 지원서 | 볼 고객과 쓸 채널을 어떤 기준으로 나눴는지부터 꺼내보세요 | 영역 사전의 먼저 정하는 것 + verifications | result/text.ko.ts `evidenceStoryKo()` | 2 |
| 근거 절 첫 경험 · 면접 | 지난 캠페인 반응과 어떻게 맞췄나요? | verifications[0] | result/text.ko.ts `evidenceStoryKo()` | 2 |
| 공통 판단 · 직접 정함 | 쓸 방법을 고르고 까닭을 적기 | `common.items[].item_id` (owned) | student/common.ts `commonItemKo(core,id)` | 9 |
| 공통 판단 · 직접 정함 | 실험값과 계산값을 대조해 차이를 설명하기 | `common.items[].item_id` (owned) | student/common.ts `commonItemKo(core,id)` | 9 |
| 공통 판단 · 해 봄 | 선택지를 같은 기준으로 견주어 고르기 | `common.items[].item_id` (confirmed) | student/common.ts `commonItemKo(core,id)` | 9 |
| 공통 판단 · 해 봄 | 내려온 조건을 근거를 들어 바꾸기 | `common.items[].item_id` (confirmed) | student/common.ts `commonItemKo(core,id)` | 9 |
| 공통 판단 · 해 봄 | 캡스톤에서 다룰 범위를 직접 좁히기 | `common.items[].item_id` (confirmed) | student/common.ts `commonItemKo(core,id)` | 9 |
| 공통 판단 · 해 봄 | 만든 것을 남이 읽고 쓸 수 있게 정리하기 | `common.items[].item_id` (confirmed) | student/common.ts `commonItemKo(core,id)` | 9 |
| 할 일 | 최근 마케팅·시장 과제 하나. 지난 캠페인 반응이나 목표 지표 가운데 무엇과 견줬는지 적고, 그 차이를 채널별 성과 비교표에 남깁니다. | `actions[]` DEEPEN_OWNERSHIP TD02/J6 | result/text.ko.ts `actionKo()` | 4 |
| 할 일 | 최근 데이터·의사결정 과제 하나. 지표 정의, 자료 정리 같은 것 가운데 왜 그 방법을 골랐는지 다른 선택과 나란히 지표 정의표에 적습니다. | `actions[]` DEEPEN_OWNERSHIP TD08/J4 | result/text.ko.ts `actionKo()` | 4 |
| 할 일 | 다음 고객·서비스 운영 과제 하나. 끝까지 가서 서비스 절차나 응대 기준 한 벌을 남겨 두세요. | `actions[]` BUILD_OUTPUT TD09/J5 | result/text.ko.ts `actionKo()` | 4 |
| 빈자리 | 마케팅·시장 · 직접 정한 것은 보이고, 그 기준을 어떤 근거로 어디까지 맡았는지는 아직입니다 | `gaps[]` TD02/J6 PARTIAL_EVIDENCE | result/text.ko.ts `gapKo()` | — |
| 빈자리 | 데이터·의사결정 · 직접 정한 것은 보이고, 그 기준을 어떤 근거로 어디까지 맡았는지는 아직입니다 | `gaps[]` TD08/J4 PARTIAL_EVIDENCE | result/text.ko.ts `gapKo()` | 8 |
| 빈자리 | 고객·서비스 운영 · 과제에서 손에 남은 것이 아직 없어요 | `gaps[]` TD09/J5 OUTPUT | result/text.ko.ts `gapKo()` | — |

## 4. 공통 판단 원자료 (문항 번호 그대로)

| 문항 | 축 | ownership | confirmed | owned | 종이에 선 말 |
|---|---|---|---|---|---|
| CJ_SCOPE | J1 | RECEIVED | False | False | |
| CJ_REQUIRE | J2 | RECEIVED | False | False | |
| CJ_METHOD | J4 | DECIDED_USED | True | True | |
| CJ_COMPARE | J6 | DID | True | False | |
| CJ_HANDOFF | J8 | RECEIVED | False | False | |
| CJ_GIVEN_REV | J3 | DID | True | False | |
| UG_SCOPE | J1 | DID | True | False | |
| UG_DECIDE | J3 | RECEIVED | False | False | |
| UG_OUTPUT | J5 | DID | True | False | |
| UG_CHECK | J6 | DECIDED_USED | True | True | |
| UG_FIX | J7 | RECEIVED | False | False | |
| UG_USED | J8 | RECEIVED | False | False | |
