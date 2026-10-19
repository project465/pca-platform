# R34 · AI 사용 감사 (2026-10-19)

**결론: 이 제품에 LLM 호출은 0건이다. "AI Advantage" 는 구현되지 않았고, 이 회차에도 새로 더하지 않았다.**

## 1. 센 자리

| 본 것 | 방법 | 결과 |
|---|---|---|
| 의존성 | `package.json` · `deploy/ops/package.json` 에서 `openai` `anthropic` `@google` `langchain` `llm` `gpt` | 0건 |
| 바깥 호출 | `src/` 전체에서 `fetch("https://…")` 가운데 localhost·env 가 아닌 것 | 0건 |
| 모델 호출 꼴 | `generateText` `createCompletion` `messages.create` `api.openai` `api.anthropic` (src + scripts) | 0건 |
| 낱말 | `LLM` `llm` `openai` `anthropic` (낱말 경계) | `src/lib/scoring.ts:6` 주석 한 줄뿐 (“LLM 이 쓴 문장은 이 숫자를 바꾸지 않는다” 는 설계 원칙 6 의 기록) |
| 환경변수 | `OPENAI_*` `ANTHROPIC_*` `LLM_*` | 없음 |

## 2. 개인화는 어디서 오는가

결과지와 작업공간의 문장은 전부 **규칙과 사전**이 만든다. 학생의 응답은 서버 밖으로 나가지 않는다.

| 층 | 들어가는 값 | 만드는 자리 |
|---|---|---|
| 판정 | `v3_responses` · `v3_evidence_picks` | `scoring/engine.ts` (측정 동결 안, 결정적) |
| 결과 모델 | 판정 스냅샷 | `result/build.ts` (측정 동결 안) → `v3_snapshots.result_model` 에 굳는다 |
| 한국어 문장 | 결과 모델 + 영역 사전 + 학생 사전 | `result/text.ko.ts` · `student/*.ts` |
| 고정 문구 | 없음에 가깝다 | 절 머리 · 읽는 기준 · 안내문 |

같은 응답이면 같은 결과가 나온다(`v3:scoring` 의 golden 지문). 사람 넷(A·B·C·D)이 서로 다른 머리글·현재 상태·할 일을 받는 것까지가 "개인화" 이고, 그것은 LLM 이 아니라 **그 사람이 고른 항목을 그대로 돌려주는 규칙**이다(R30 보고).

## 3. 이번 회차에 지키는 선

- 근거 없는 성과를 만들지 않는다: 결과지의 네 층(해 봤다고 고른 것 · 직접 정했다고 고른 것 · 남겼다고 고른 결과물 · 견줬다고 고른 대상)은 전부 **자기보고**이고, 그 사실을 절 머리와 영역 카드가 글자로 적는다.
- 개인정보를 밖으로 보내지 않는다: 바깥 호출이 0건이므로 구조적으로 막혀 있다.
- 결정적 채점을 바꾸지 않는다: `v3:freeze:measure` 가 기록을 다시 적지 않은 채로 통과한다.

## 4. 고정 문구와 개인화 문구를 가르는 법

화면과 종이에서 **값이 응답에 따라 달라지는 자리**는 결과 모델의 칸을 읽는 함수가 만들고(`headlineKo` · `evidenceStoryKo` · `actionKo` · `gapKo` · `commonKo`), 그 출처는 `docs/metri/review/r34/TRACE_AFTER.md` 3절이 자리마다 적는다. 거기 없는 문장은 고정 문구다.
