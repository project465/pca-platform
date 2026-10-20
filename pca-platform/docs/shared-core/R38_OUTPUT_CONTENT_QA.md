# R38 결과 본문 QA — 합성 출력 기준 (실제 PDF 아님)

**이 문서의 샘플은 실제 학생 · 실제 기관 PDF 가 아니다.** 기관에서 받은 PDF · 화면 캡처 · 비식별 입력이 이
패키지와 이 저장소에 없어서, 출력 위치는 전부 **엔진이 내는 결과지 문장**(`result/text.ko.ts` 의
`headlineKo · gapKo · actionKo` 를 결과 모델에 대어 부른 것)이다. PDF 의 시각 · 쪽 · 조판 검수는
**NOT VERIFIED** 이고 기관 세션 몫이다. 점수는 편집 검수용 진단이고 출시 PASS 가 아니다. 채점자는
Claude(초안)이며 Core PM 의 판정이 아니다.

근거 원자료: `docs/shared-core/evidence/R38/content/` (`personas.json` · `personas.md` · `integrity.json` ·
`sample-ids.log`). 근거 ID 는 `EV-<영역>-<칸>-<sha256(PK) 앞 4자>` 이고 `sample-ids.ts` 가 엔진에서 뽑았다
(손으로 지어내지 않았다).

---

## 1. 샘플 넷

| sample_id | core | 사례 | 입력 판본 | 출력 위치 | 실제 검증 |
|---|---|---|---|---|---|
| S1 | BIZ_CORE_V1 | PARTIAL (C07 · 심화 축 넷 무응답) | `BIZ-C07` input hash → `integrity.md` | 결과지 빈자리 줄 (`gapKo`) | 합성 · 화면/PDF NOT VERIFIED |
| S2 | ME_CORE_V3 | PARTIAL vs RICH (C07 vs C01) | `ME-C07` · `ME-C01` | 머리글 (`headlineKo`) | 같음 |
| S3 | BIZ_CORE_V1 | 배재 GM 모양 재현 (`BIZ_CASE`) | `fixtures/evidence.ts` | 근거 수 표시(GM 쪽 집계) | 같음 · GM 실제 PDF 미확인 |
| S4 | ME_CORE_V3 | CONTRA (C04 · 근거 없이 `직접 결정` 주장) | `ME-C04` | 머리글 · 빈자리 | 같음 |

## 2. 샘플마다 — 주장 · 근거 · 수정

### S1 · 답하지 않은 축이 `없다` 로 적힌다 (Gap calibration)

| | |
|---|---|
| 지금 문장 | `경영전략·기획 · 받은 요구를 어떤 조건으로 옮겼는지가 아직 없습니다` · 까닭 `이 영역에서 빠지면 경험을 설명하기 어려운 부분입니다` |
| 사실 | 스냅샷 `TD01.J2.missing = SKIPPED` (답하지 않음) · 필수 축이라 `REQUIRED_AXIS` 빈자리가 선다 · 그 축에 고른 체크리스트 2건은 후보로 남았다 (`EV-TD01-J2-9d68` · `EV-TD01-J2-2fc8`) |
| 문제 | `아직 없습니다` 는 답한 사람의 `없다` 와 답하지 않은 사람의 `모른다` 를 같은 말로 적는다 → 미평가를 부재로 읽힌다 · 고른 근거가 있었다는 사실도 사라진다 |
| 수정 제안 | **경영전략·기획에서 받은 요구를 조건으로 옮긴 경험은 이번 검사에서 답하지 않아 판단하지 않았습니다. 이 영역에서 빠지면 설명이 비는 자리라, 해 본 과제가 있다면 그때 받은 요구와 옮긴 조건을 기록에 더해 확인할 수 있습니다. 함께 고르신 두 항목(목표를 지표로 옮김 · 우선순위 정함)은 그 확인 뒤에 근거로 씁니다.** |
| 근거 ID | `EV-TD01-J2-9d68` · `EV-TD01-J2-2fc8` (후보) · gap `TD01.J2:REQUIRED_AXIS` |
| 추론 경계 | `해 본 적이 있다` 고 추정하지 않는다 · `요구 해석 역량` 을 평가하지 않는다 |
| 금지 주장 | `요구 해석 능력이 부족합니다` · `이 경험이 없습니다` · 후보 두 항목을 확인된 경험으로 쓰기 |
| 검사 | `integrity.ts` C-SKIP-CAL **XFAIL**(BIZ-C07 · CS-C07) · CC-008 |

### S2 · 네 축을 답하지 않은 사람과 여덟 축을 다 한 사람의 머리글이 같다 (Personal distinctiveness)

| | |
|---|---|
| 지금 문장 (둘 다) | `기구·제품 설계 과제에서 방향을 직접 정해 본 일이 있어요` — `확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요.` · 빈자리 하나 · 할 일 첫 줄까지 글자까지 같다 |
| 사실 | RICH: 확인 8축 · 확인 근거 26 · 후보 0. PARTIAL: 확인 4축(J3 J5 J6 J7) · 확인 근거 18 · 후보 8 · J1 J2 J4 J8 `SKIPPED` |
| 문제 | 판정이 다른데 학생이 읽는 첫 줄이 같다(`integrity.ts` C-UNSEEN **XFAIL** · 짝 DISCREPANCY 6 / 20 가운데 하나) |
| 수정 제안 (PARTIAL) | **기구·제품 설계에서 직접 판단 · 산출물 · 비교와 검증 · 실패와 수정은 응답과 고른 근거 18건으로 확인됩니다(예: `끼워 맞춤과 공차 등급을 정했다` EV-TD01-J3-9383 · 부품도 EV-TD01-ARTIFACT-dcb9). 문제 정의 · 요구 해석 · 방법과 도구 · 조직 활용 네 축은 답하지 않아 이번 판단에 넣지 않았습니다. 그 축에서 고르신 8건은 확인 전이라 경험으로 쓰지 않았습니다.** |
| 근거 ID | `EV-TD01-J3-9383` · `EV-TD01-J3-9153` · `EV-TD01-ARTIFACT-dcb9` · `EV-TD01-ARTIFACT-5c46` (확인) · `EV-TD01-J1-6165` · `EV-TD01-J2-195a` … (후보 8) |
| 추론 경계 | 답하지 않은 네 축을 `약하다` 로 읽지 않는다 · RICH 와 같은 결론이라고 쓰지 않는다 |
| 금지 주장 | `설계 전 과정을 주도했다` · `문제 정의부터 직접 했다` |
| 비변경 사례 | RICH 의 머리글은 그대로가 맞다(확인 8축) — 다르게 만들려고 바꾸지 않는다 |

### S3 · 근거 수를 네 목록 합으로 센다 (Evidence lineage · 배재 GM)

| | |
|---|---|
| 지금 표시(GM 쪽 방식) | `did + decided + artifacts + verifications` = **32** |
| 사실 | `v3_evidence_picks` PK 고유 **26** · 그 가운데 확인된 축에 걸린 것 **25** · 후보 **1** (`EV-TD02-VERIFY-9a8e` = `지난 캠페인 반응`, TD02 의 J6 가 `받아서 해 봤다` 라 확인되지 않음) |
| 수정 제안 | **응시 근거 26건(같은 항목을 한 번씩) 가운데 응답으로 확인된 판단에 걸린 것은 25건입니다. 마케팅·시장의 `지난 캠페인 반응` 1건은 비교·검증을 직접 했다는 응답이 없어 아직 확인 전으로 둡니다.** |
| 근거 ID | `EV-TD02-VERIFY-9a8e` (후보) · 나머지 25 는 `sample-ids.log` |
| 금지 주장 | `근거 32건` · `27건 모두 검증됨` · 후보 1건을 `확인된 경험` 으로 |
| 검사 | `integrity.ts` R-BIZ PASS(25 · 32 · 26 재현) · E-CAND-MODEL / E-CAND-TEXT 0 누출 · R-CS-SLOT PASS |

### S4 · 근거 없이 `직접 결정` 이라고 답한 사람 (Factual integrity)

| | |
|---|---|
| 지금 문장 | `기구·제품 설계 과제는 해 봤고, 정리만 남았어요` — `뭘 골랐는지만 덧붙이면 돼요.` · 빈자리 `직접 정한 것은 보이고, 그 기준을 어떤 근거로 어디까지 맡았는지는 아직입니다` · `무엇을 남겼는지 아직 고르지 않았습니다` |
| 사실 | 여덟 축 모두 `조건·기준까지 직접 정함`(3) 답 · 고른 근거 **0** · 소유(OWNED) 0 — 근거 둘 미만이면 올리지 않는다(K3) |
| 판단 | 엔진은 **과장하지 않는다**: `직접 결정했다` 고 쓰지 않고 `정리만 남았다` 로 낮춘다. 다만 확인이 **자기보고만**이라는 경계가 문장에 없다 |
| 수정 제안 | **기구·제품 설계의 여덟 축 모두 기준까지 직접 정했다고 답하셨지만, 고른 근거가 없어 지금은 응답(자기보고)으로만 확인됩니다. 지원서에 쓰려면 한 과제를 골라 그때 정한 기준과 남긴 결과물을 함께 적어야 합니다.** |
| 근거 ID | 없음(고른 항목 0 · 그 사실 자체가 근거) |
| 금지 주장 | `설계를 주도한 경험이 확인됐습니다` · `여덟 축 모두 강점` |

## 3. 9축 루브릭 (0~3 · 편집 진단 · Claude 초안)

| 축 | S1 전 | S1 후 | S2 전 | S2 후 | S3 전 | S3 후 | S4 전 | S4 후 |
|---|---|---|---|---|---|---|---|---|
| Factual integrity | 2 | 3 | 2 | 3 | 1 | 3 | 2 | 3 |
| Personal distinctiveness | 2 | 3 | **0** | 3 | 2 | 3 | 2 | 3 |
| Evidence lineage | 1 | 3 | 1 | 3 | **0** | 3 | 2 | 3 |
| Gap calibration | **1** | 3 | 1 | 3 | 2 | 3 | 2 | 3 |
| Major/role fit | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| Practicality | 2 | 2 | 2 | 2 | — | — | 2 | 3 |
| Career artifact usability | 2 | 2 | 2 | 3 | 1 | 2 | 1 | 2 |
| Language | 3 | 2 | 3 | 2 | 2 | 2 | 3 | 2 |
| Cross-format consistency | NV | NV | NV | NV | NV | NV | NV | NV |

- **Language 가 개선안에서 한 칸 내려간 것을 적어 둔다**: 근거와 경계를 넣으면 문장이 길어진다. 실제로
  쓰려면 첫 줄과 펼침으로 나눠야 한다(결과지 구조는 기관 · 결과지 화면 소유)
- `Major/role fit` 는 합성 사례라 그 전공에서 맞는 말인지 판단할 수 없다 → 전공자 검토 전 2 에서 올리지 않았다
- `Cross-format consistency` 는 PDF · 화면 실물이 없어 NV(NOT VERIFIED)
- **차단 사유(평균과 무관 FAIL)**: 사실 조작 · 기관 간 개인정보 노출 · 점수 왜곡 — 네 샘플 모두 **없음**

## 4. 공통 결과 데이터 계약 제안 ↔ 지금 스키마 (audit 만 · 필드 추가 없음)

| 제안 칸 (`02` 문서) | 지금 자리 | 차이 |
|---|---|---|
| assessment_snapshot_id | `v3_snapshots.id` · `result_model.attempt_id` | 있음 |
| assessment_version / scoring_version | `provenance.module_versions` (`core_version` · `item_bank_version` · `scoring_version`) | 있음 |
| report_generation_time | 없음 (CC-004 `v3_report_renders` 제안 · 미구현) | **없음** |
| experience_capture_time | 없음 — `experiencesOf` 는 그때그때 읽는다 (CC-006) | **없음** |
| content_source_versions | 팩 판본 · `result_model_version` · `result_copy_version` | 지역 · 기관 콘텐츠 판본 없음 |
| observed_claims[] (claim · source_ref · state) | `domains[].did/decided/artifacts/verifications` (글) + 스냅샷 `axes[].evidence_keys` | **줄마다 출처 ID 가 없다**(글로 합친다 · E5) |
| inferences[] | `zone` · `reasons` · `next` (규칙 이름) | 추론 · 불확실성을 따로 담는 칸 없음 |
| competency_gaps[].kind = confirmed_gap / insufficient_evidence / not_assessed | `GapKind` 여섯 | **`not_assessed` 가 없다** — 답하지 않은 축은 빈자리가 안 서거나(C07 · C08) 부재와 같은 글로 선다(S1) |
| role_matches[] | `role_context` · `industry_context` (PackView) | 직무 요구 원문 · 근거 ID 연결 없음 |
| action_items[] (deliverable · connected_gap_refs) | `actions[]` (`horizon` · `material.workflow.output` · `from_gap`) | 대체로 있음 |
| provenance[] (기관 · 국가 · 산업 출처 · 날짜 · 검증 수준) | 없음 | **없음** — 기관 자료가 없어 지금은 담을 것도 없다 |

## 5. 아직 아닌 것

- 기관 실제 PDF · 화면 · 비식별 입력: **0건 수신** → 쪽 · 조판 · 화면 일치 NOT VERIFIED
- 산업 · 기업 · 지역 사실: 이번 샘플은 팩 등록부의 말만 쓴다(`integrity.ts` OUT-5 88/88 · 지어낸 말 0). 기업명 · 채용 수치는 넣지 않았다
- 개선 문단이 그 전공에서 자연스러운지 · 학생이 실제로 그렇게 읽는지 → 전공자 · 파일럿
