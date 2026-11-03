# 긴 결과지(70쪽) 직무 안내 작성 규격

학교 학생이 받는 PRO 결과지(70쪽)의 `04 직무 탐색` 장은 전공마다 **직무 여덟 개의 일반 안내**를 읽는다.
경영은 `data/report-gm/biz-role-guide.json` 에 있고, 다른 전공은
`data/report-gm/role-guide/<CORE 코드>.json` 에 같은 모양으로 둔다.

## 무엇을 읽고 쓰는가

- 그 전공의 직무팩: `sites/pca-platform/content/<prefix>-role-packs.json` (직무 여덟의 코드·이름·설명·문항)
- 그 전공의 영역 사전: `sites/pca-platform/content/major-cores.json` 에서 그 Core 의 `files.domains` 와 `files.checklists`
- 산업팩: 같은 Core 의 `packs.industry`
- 모양의 기준: `docs/metri/report-long-role-guide-example.json` (경영기획 한 직무)

## 파일 모양

```json
{ "schema": "role-guide.v1", "core": "EE_CORE_V1", "status": "DRAFT_FOR_REVIEW",
  "note": "<전공> 직무 일반에 대한 설명이다. 특정 기업의 직무기술서나 채용 요건이 아니며 측정·채점에 쓰이지 않는다.",
  "roles": { "<직무팩 코드>": { ...예시와 같은 열여섯 칸... } } }
```

- `roles` 의 열쇠는 **그 전공 직무팩의 코드 여덟 개 그대로**다. 더하거나 빼지 않는다.
- `lens` 의 열쇠는 **그 전공 영역 코드(TD01~TD12)** 가운데 그 직무와 가장 가까운 셋이다.
- `practice` 는 J1~J8 여덟 칸을 모두 쓴다(문제 정의 · 요구사항 해석 · 직접 판단 · 방법·도구 선택 · 산출물 · 비교·검증 · 실패·수정 · 조직 활용).
  각 칸은 그 직무에서 **학생이 수업·과제·실습에서 실제로 해 볼 수 있는 일**로 적는다.
- `interview` 는 셋, 각 줄에 `axis`(J1~J8) · `q` · `why`.
- `process` 는 다섯~여섯 걸음, `learnOrder` 는 넷, `firstProject.steps` 는 넷.

## 문장 규칙 (어기면 검사가 걸린다)

1. **사람이 쓴 안내서처럼.** 짧고 구체적인 한국어 존댓말 없는 서술체(예시와 같은 체)를 쓴다.
2. 대시(—) 금지. 쉼표나 문장 분리로 푼다.
3. 쓰지 않는 말: `다양한` `효과적으로` `역량을 강화` `핵심은` `중요합니다` `~를 통해` `결국` `혁신적` `획기적`
   `견줍니다` `섭니다` `세웠습니다` `가지고 있` `되어진` `시너지` `인사이트` `차별화된` `최적화`.
4. "A가 아니라 B" 대구는 직무 하나에 한 번까지.
5. **확인되지 않은 숫자·회사 이름·통계·연봉을 쓰지 않는다.** 직무 일반 안내 수준(NCS 직무 정의, 채용 공고에 흔히 쓰이는 업무 표현)까지만.
6. 자격증·법령 이름은 실제로 있는 것만 쓴다. 확실하지 않으면 쓰지 않는다.
7. 학생이 읽는다. 전문 용어는 그 분야 학생이 수업에서 듣는 말까지.

## 검사

```bash
node scripts/role-guide-check.mjs data/report-gm/role-guide/<CORE>.json
```
