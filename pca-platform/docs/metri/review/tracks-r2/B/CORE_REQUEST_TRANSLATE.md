# Core 승인 요청 · 경험 번역 메뉴를 ME · BIZ 밖 18 Core 로 넓히기

- 요청: Track B (2026-10-20 2차)
- 받는 쪽: 총괄 PM · Core 담당
- 상태: **요청만 한다. 이 회차에서 코드도 콘텐츠도 고치지 않았다.**

## 1. 지금 상태

경험 번역 열 단계(`TR_T1` ~ `TR_T10`)의 보기는 `src/lib/me-v3/student/translate.ts` 가 Core 마다 든다.

| Core | 보기 벌 |
|---|---|
| ME_CORE_V3 | 기계공학 벌(R31 전 글자 그대로) |
| BIZ_CORE_V1 | 경영 벌(R31) |
| 나머지 18 (EE · CS · ARCH · CIV · BT · SPORTS · NURSING · HEALTH · FOOD · PUBADM · PSY · MEDIA · LANG · LAW · EDU · AGRI · VISUAL · STYLE) | **중립 벌**(`TRANSLATE_NEUTRAL`) |

중립 벌은 어느 전공도 가리키지 않아 틀린 말을 하지는 않지만, 그 전공의 산출물(간호계획 · 회로도 · 판례 요약 · 촬영 계획)을 보기에서 고를 수 없다. 그래서 그 학과 학생의 결과지에서 `지원서에서 이렇게 묶어볼 수 있습니다` 가 일반어로 이어진다.

## 2. 왜 Core 승인이 필요한가

`translate.ts` 는 **검사 화면 동결 목록 안**이다(`sites/pca-platform/assessment/ME_V3/ui-lock.json` 27번 줄). 보기 글자를 바꾸면:

1. 검사 화면이 바뀐다 → `ASSESSMENT_UI_VERSION`(지금 `ME_V3_2_ASSESSMENT_UI_V44`)과 `ASSESSMENT_COPY_VERSION`(`me-v3-2-assessment-copy.25`)을 올려야 한다.
2. 결과지가 그 글자를 이어 적는다 → `RESULT_COPY_VERSION`(`me-v3-result-copy.66`)을 올려야 한다.
3. 동결 지문을 다시 적어야 한다(`FREEZE=update` · `RESULT_FREEZE=update`).

**측정은 바뀌지 않는다.** 저장되는 값은 보기의 자리(`S1`~`S5`)이고 채점은 그 문항이 답해졌는지만 센다(`scoring/engine.ts` 의 `translation_steps`). 단계마다 보기의 수와 차례를 지키면 측정 동결(`ME_V3_MEASUREMENT_FREEZE_1`)은 기록을 다시 적지 않은 채로 통과해야 한다. 이미 응시한 사람의 결과 모델은 그때 이은 글자를 굳혀 두어 달라지지 않는다.

그래도 승인을 받는 까닭: 검사 화면 판본은 파일럿 뒤에 `이 사람이 어느 화면으로 답했는가` 를 되묻는 자리이고, 18 Core 가 한 번에 바뀌면 그 판본 하나가 18 전공의 화면 변경을 함께 든다. 한 번에 올릴지 Core 묶음별로 나눠 올릴지가 결정 사항이다.

## 3. 바꾸는 자리 (승인되면)

| 파일 | 바꾸는 것 | 동결 |
|---|---|---|
| `src/lib/me-v3/student/translate.ts` | Core 18 벌 추가(단계마다 보기 수 · 차례 · `없다` 자리 고정) | 검사 화면 |
| `src/lib/me-v3/runtime/ui-version.ts` | `ASSESSMENT_UI_VERSION` · `ASSESSMENT_COPY_VERSION` | 검사 화면 |
| `src/lib/me-v3/result/version.ts` | `RESULT_COPY_VERSION` | 결과지 |
| `scripts/v3-student-check.ts` 14절 | Core 마다 제 벌을 드는지(중립 벌로 떨어진 Core 0) | — |

**바꾸지 않는 자리**: 문항 은행 · 채점 · 결과 모델 · 등록부 · DB · `option_values`.

## 4. 승인 전에 정할 것

1. **한 번에 18 이냐, Wave 묶음이냐.** 배재대 자리가 많은 BIZ 다음이 EE(7) · CS(11) · MEDIA(8) · STYLE(8) 이다.
2. **누가 보기를 쓰는가.** 보기는 그 전공 학생이 자기 산출물을 고를 수 있어야 하므로 전공을 아는 분의 검토가 먼저다(전공자 검토 묶음 `PCU_SPEC_REVIEW_PACK.md` 와 같은 길).
3. **이미 응시한 사람.** 결과 모델이 굳어 있어 다시 계산하지 않는다(설계 원칙 4). 이 결정을 문서로 확인받는다.

## 5. 함께 올리는 관찰 (승인 대상 아님 · 판정 변경 금지)

Track B 2차 `DEPT_CONTENT.md` 에서 확인했다: **같은 Core 안에서 Evidence/Gap 판정은 학과에 따라 갈리지 않는다.** 같은 응답이면 경영학과와 관광경영학과가 같은 빈자리를 받는다. 이것은 결함이 아니고 설계(판정 불변 · 측정 동결)다. 학과마다 다른 것은 먼저 읽는 영역 · 산업 · 역할 · 근거 예시 · 행동 제안(갈래 다섯 층)이다. 학과별로 Evidence/Gap 판정 자체를 다르게 하려면 채점이 바뀌어야 하고 그것은 이 요청의 범위가 아니다.
