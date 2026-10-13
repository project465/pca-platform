# Major Core 생산 파이프라인이 반복 가능한가 (2026-10-13)

컴퓨터·소프트웨어 Core 를 만들면서 같은 무게로 물은 것이 이것이다. 묻는 방식은
하나다. **공통 엔진을 수정하지 않고 Core 를 하나 더 넣을 수 있는가.** Core 쪽
보고는 `docs/metri/CS_CORE_V1.md` 다.

---

## A. 성공 기준과 실제

| 기준 | 목표 | 실제 |
|---|---|---|
| 공통 채점 엔진 변경 | 0 | **0** (`scoring/` 파일 0벌) |
| 결과 엔진 판정 변경 | 0 | **0** (`result/model.ts` · `build.ts` · `text.ko.ts` 0벌) |
| Workspace UI 변경 | 0 | **0** |
| DB 스키마 변경 | 0 | **0** (마이그레이션 없음) |
| 기존 ME / EE output | 불변 | **글자까지 같다** (522줄 대조 · 다른 줄 0) |
| CS 콘텐츠만으로 작동 | 응시에서 Current State 까지 | **돈다** (브라우저 26 / 26) |

`src/` 아래에서 바뀐 파일은 **한 벌**이고 그것도 **더하기만** 했다
(`result/chains.ts` · 26줄 · 판정 로직 0줄). 까닭은 D 절이다.

---

## B. 콘텐츠만으로 끝난 자리

Core 하나가 서려면 `sites/pca-platform/content/` 에 열한 벌과
`sites/pca-platform/assessment/<판본>/` 에 두 벌이 선다.

| 파일 | 담는 것 |
|---|---|
| `cs-v1-taxonomy.json` | 역할기능 8 · 조직환경 7 · 별칭 28 · 경계 10 · 축과 척도와 수준 |
| `cs-v1-domains.json` | 영역 11 · 축마다 l2·l3 · 산출물 · 검증 대상 · 업무 흐름 |
| `cs-v1-checklist-additions.json` | 영역 체크리스트 202 |
| `cs-v1-common-additions.json` | 공통 체크리스트 8 |
| `cs-v1-checklists.json` | `v3:build` 생성물 |
| `cs-v1-items-blueprint.json` | 자리 98 · 결과 절 배선 · 규칙 |
| `cs-v1-items.json` | 문항 344 · 판본 `CS_V1_ITEM_BANK_V1` |
| `cs-industry-packs.json` | 산업팩 7 |
| `cs-role-packs.json` | 역할팩 8 |
| `cs-v1-relations.json` | 영역×산업 77 · 영역×역할 88 |
| `cs-v1-constructs.json` | 문항마다 primary construct 344 |
| `CS_V1/personas.json` | 사람 12벌 · 기대값 · 지문 · `cases` |
| `CS_V1/bank-lock.json` | 은행 파일 11벌의 지문 |

여기에 등록부(`major-cores.json`)에 묶음 하나를 더하면 끝이다. **파일을 더하는
일이고 코드를 고치는 일이 아니다.** 등록부가 적는 것은 판본 · 상태 · 개방 칸 ·
파일 사상 · 팩 사상 · 영역 수 · fixture 경로 · 갈래 다섯이다.

**열어서 확인한 것**: `CORE=CS_CORE_V1` 만 넘겨 `v3:domains` · `v3:items` ·
`v3:wording` · `v3:length` · `v3:registry` · `v3:scoring` · `v3:persona` ·
`v3:measure` · `v3:gaming` · `v3:result` · `v3:result:copy` · `v3:ui` 가 전부
돈다. 그리고 **응시 화면과 결과지 화면과 작업공간의 파일이 한 벌도 바뀌지
않았다**: 동결 다섯이 기록을 다시 적지 않은 채로 통과한다.

**이 Core 로 직접 돌릴 수 없는 검사 둘**은 `v3:runtime` 과 `v3:recompute` 다.
앞엣것은 응시를 `openAttempt` 로 여는데 그 함수가 **열려 있는 Core 만** 열고,
뒤엣것은 가장 최근 굳은 결과의 Core 를 따라간다. 그 자리의 증거는 `cs:walk`
이고, 그 검사가 개방 칸을 잠시 열어 실제 브라우저로 밟은 뒤 되돌린다. 세
검사가 Core 를 어떻게 고르는지는 E 절 ④.

---

## C. Authoring Kit 이 실제로 해결한 것

`docs/metri/major-authoring/` 의 README 와 01~09 와 `schema.json` 이 이번에
답해 준 것은 셋이다.

1. **공유 자물쇠를 다시 묻지 않아도 됐다.** 축 여덟 · 소유 네 단계 · 노출 세
   마디 · 척도 둘 · 결과 절 A~J 가 Kit 에 못 박혀 있어서, 컴퓨터·소프트웨어를
   위해 자를 새로 만들 생각을 할 자리가 없었다.
2. **영역 수와 산업 수를 기계공학에 맞추지 않았다.** Kit 이 그것을 명시로 금지해
   둔 덕에 영역 열하나와 산업 일곱으로 끊는 판단을 흔들림 없이 했다.
3. **파일 계약과 필수 열쇠를 등록부가 센다.** `v3:registry` 와
   `contractGaps()` 가 빠진 파일과 빠진 열쇠를 그 자리에서 적어 준다.

**Kit 이 답해 주지 못한 것 하나**가 D 절이다.

---

## D. 공통 층에 손을 댄 자리 하나

`src/lib/me-v3/result/chains.ts` 에 Core 묶음 하나를 더했다(11개 영역의 적는
차례). 이 표는 지난 회차에 **Core 마다 따로 적으려고 만든 자료 표**이고 판정에
들어가지 않는다. 그래서 더한 것은 데이터이고 로직이 0줄이다. ME 와 EE 의 묶음은
글자 하나도 건드리지 않았다.

**다만 그 표가 `content/` 밖에 있다.** Core 를 하나 더 만드는 일이
`sites/pca-platform/content/` 안에서 끝나지 않고 TypeScript 파일 한 벌을 남긴다.

고칠 방향은 그 줄을 `<prefix>-domains.json` 의 영역마다 한 줄로 옮기고
`chainFor` 가 그것을 읽게 하는 것이다. 그러면 다음 Core 는 콘텐츠 안에서
끝난다. **이번 회차에 하지 않았다**: 결과 층이 읽는 자리를 바꾸는 일이고,
기계공학과 전기전자의 차례를 콘텐츠로 옮기면서 글자가 한 자라도 달라지면 이미
응시한 사람의 결과지가 바뀐다. 승인받고 따로 한다.

---

## E. 검사 쪽에서 드러난 것

제품 코드가 아니라 **검사 스크립트**가 한 Core 의 자료를 글자로 들고 있었다.
이번 회차에서 고친 것이 셋이다.

### ① 읽는 규칙 검사가 남의 사람 벌로 돌았다

`scripts/v3-persona-check.ts` 가 fixture 경로를
`assessment/ME_V3/personas.json` 으로 적어 두고 있었다. 그래서 `CORE` 를 바꿔
돌린 결과가 **기계공학 열두 벌을 그 Core 의 은행에 얹어 읽은 것**이고, 그
상태로는 통과도 걸림도 그 Core 에 대한 답이 아니다.

전기전자가 `15 / 15` 로 적혀 있던 것이 그래서 틀린 값이다. 자기 fixture 로
돌리면 `8 / 15` 였고, 걸린 일곱은 **읽는 규칙의 자리를 기계공학 번호로
가리켰기 때문**이다(`P12` 가 기계공학에서는 판단과 산출물과 검증이 다 선 포닥
이고 전기전자에서는 다른 처지다).

경로를 등록부에서 읽게 하고 **어느 벌의 어느 영역이 어느 상태를 맡는지**를
fixture 의 `cases.reading` 으로 옮겼다. 세 Core 전부 `15 / 15` 이고
**기계공학 결과는 그대로다**(옮긴 값이 전에 박혀 있던 것과 같다).

같은 자리에서 전기전자 fixture 의 빈 칸이 드러났다. 관심과 근거의 네 칸 가운데
`관심도 낮고 근거도 얕은` 칸을 어느 벌도 만들지 않아서, 결과지의 그 칸을 한
번도 그려 보지 않은 상태였다.

### ② 밟는 검사와 검토 묶음 생성기가 Core 이름을 들고 있었다

`ee-walk.ts` · `ee-review-doc.ts` · `ee-qa-doc.mjs` 를 `core-walk.ts` ·
`core-review-doc.ts` · `core-qa-doc.mjs` 로 옮기고 전공 이름을 등록부의
`name_ko` 에서 읽게 했다. 베껴 두면 Core 를 하나 더 만드는 일이 **검사를
베끼는 일**이 되고, 베낀 쪽은 화면이 한 번 바뀐 날 한 곳만 고쳐진다.

이제 `CORE` 하나로 어느 Core 든 돈다: `npm run core:all` · `core:walk` ·
`core:review` · `core:qa` 이고 `ee:*` 와 `cs:*` 는 그것을 `CORE` 와 함께 부르는
한 줄이다.

### ③ 열어 둔 Core 만 보는 검사 셋

`v3:runtime` 과 `v3:ui` 와 `v3:length` 가 볼 Core 를
`sellableCores("KR")[0]` 으로 골랐다. **짓고 있는 Core 는 그 목록에 들지
않는다**(`open_to_students: false`). 그래서 `CORE` 를 넘겨도 기계공학을 재고
그 수를 그 Core 의 수로 읽는다. 자료만 보는 둘(`v3:ui` · `v3:length`)이
`CORE` 를 따르게 고쳤고, **고치자마자 `v3:ui` 가 이 Core 에서 걸렸다**: 세는
줄이 `산업 여덟` 을 글자로 요구해 산업이 일곱인 Core 의 콘텐츠가 모자란 것으로
읽혔다. 수를 팩 파일에서 읽게 바꿨고 세 Core 전부 28 / 28 이다.

`v3:runtime` 은 고치지 않았다. 닫힌 Core 의 응시를 열 수 없는 것이 **설계**고
(주소로 등급을 올리는 길을 막는 것과 같은 까닭이다), 그 자리의 증거는
`cs:walk` 가 개방 칸을 잠시 열고 밟은 뒤 되돌리는 것으로 대신한다.

### ④ 돌아오지 못하게 막았다

`v3:extend` 의 `core 를 모르게 짠 파일` 목록이 여섯에서 아홉으로 늘었다
(`v3-persona-check.ts` · `v3-recompute-check.ts` · `v3-length-check.ts`).
**한 Core 의 fixture 폴더를 글자로 적은 자리**를 세는 그림도 하나 더 두었고
되돌려 걸리는 것까지 확인했다. `v3-ui-check.ts` 는 그 목록에 넣지 못한다:
손님 화면에서 안쪽 코드를 찾는 그림 자체가 `ME_CORE` 를 글자로 들고 있어서,
넣으면 그 그림이 자기를 걸고 고치는 쪽이 그림을 지우게 된다.

---

## F. 다음 Core 가 걸릴 자리

| 자리 | 지금 상태 |
|---|---|
| 적는 차례 표 | `content/` 밖이다 (D 절) |
| `v3:runtime` | 닫힌 Core 의 응시를 열 수 없다. `core:walk` 가 대신 밟는다 |
| 이용권 | Core 를 가리키지 않는다. 상품표가 기계공학 쪽 줄이다 |
| `v3:migrate` | ME 판본 사이의 길을 세는 검사라 새 Core 에는 셀 것이 없다 |
| 영문 문면 | 한 줄도 없다 |
| 산업 용어 검토 | 그 산업 경력자가 읽어야 한다 |

**앞의 둘이 승인 대기이고 뒤의 셋은 자료와 사람이 와야 풀린다.**

---

## G. 판정

**MULTI-CORE PIPELINE REPEATABLE / CS READY FOR DOMAIN REVIEW.**

콘텐츠 열세 벌과 등록부 한 묶음으로 Core 가 섰고, 공통 채점과 결과 판정과
화면과 DB 가 한 줄도 바뀌지 않았다. 남은 한 자리(적는 차례 표)는 데이터
이동으로 닫히고 그 설계를 D 절에 적었다.

**학생에게 열지 않았다.** 전공자 검토와 인지 면접과 실제 응답 기반 검증이 전부
남아 있어서 어느 자리에서도 `검증된 검사` 로 적지 않는다.
