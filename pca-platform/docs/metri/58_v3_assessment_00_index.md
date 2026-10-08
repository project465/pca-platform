# 58. ME_V3 응시 화면 — 단계별 기록

ME_V3 판단 엔진을 실제 응시에 붙이고 검사 화면을 세운 회차다. 결과지와
홈페이지와 공고 수집과 구독과 월간 리포트와 반복결제는 건드리지 않았다.

읽는 순서는 이렇다.

| 쪽 | 무엇 |
|---|---|
| `58_v3_assessment_01_runtime.md` | STEP 1~5. runtime · DB · routing · 이어보기 · 등급 올리기 |
| `58_v3_assessment_02_interface.md` | STEP 6. 화면이 하는 일과 서버에 쓰는 자리 |
| `58_v3_assessment_03_design.md` | STEP 7. 정보 계층과 화면 여덟 자리, 반응형과 접근성 |

## 이 회차에서 지킨 것

**채점 규칙을 한 줄도 바꾸지 않았다.** Z1 확인축 넷, 소유의 근거 둘,
보기 네 단계, 응답 품질 임계, 등급별 판정 차이, 산업·역할 팩과 학위·계열의
비채점 원칙이 그대로다. 구현하면서 불편했던 자리는 있었지만 그 값들은
파일럿 전까지 운영 가설이므로 손대지 않았다.

**routing 과 scoring 을 갈라 두었다.** 화면은 다음에 무엇을 물을지만
정하고, 판정은 끝에서 `scoring/engine.ts` 가 한 번 한다. 화면이 판정의
조각을 들고 있으면 같은 응답이 화면을 지나는 동안 달라진다.

**ME_V2 와 섞지 않았다.** V3 는 `v3_*` 표에만 쓰고 V2 는 읽기 전용으로
잠겨 있다(`npm run v2:frozen`).

## 단계마다 무엇을 했는가

| STEP | 구현 | 검사 | commit |
|---|---|---|---|
| 1 Assessment Runtime | `runtime/{routing,blocks,progress,session}.ts` | `v3:runtime` | `feat(v3): assessment runtime…` |
| 2 DB wiring | `db/schema_v3_runtime.sql` 다섯 표 | `v3:runtime` | 같은 commit |
| 3 Routing Engine | `pickDomains` · 넷째 영역 조건 | `v3:runtime` 1~2절 | 같은 commit |
| 4 Save / Resume | `saveAnswer` · `viewOf` · `moveTo` | `v3:runtime` 4절 | 같은 commit |
| 5 Tier Upgrade | `upgradeTier` · `newScreensAfterUpgrade` | `v3:runtime` 6절 | 같은 commit |
| 6 Assessment UI 기능 | `src/app/v3/**` · `runtime/menus.ts` | `v3:ui` 15가지 | `feat(v3): assessment interface` |
| 7 Assessment UI 1차 디자인 | `src/app/v3/assessment.css` · 화면 캡처 | `v3:shots` 30장 | `design(v3): assessment experience` |

## 이 회차에서 찾은 것

세 가지가 코드를 읽어서는 안 나왔고 검사를 만들면서 나왔다.

**조직 선호 일곱이 어느 화면에도 서지 않았다.** 화면과 채점이 둘 다
`PR_OC` 로 문항을 찾고 있었는데 은행의 번호는 `PO_OC1`~`PO_OC7` 이다.
문항은 멀쩡히 있고, 묻지도 않고, 결과의 조직 선호 칸이 늘 비었다. 번호의
앞머리로 고르는 방식을 버리고 측정축(`measurement_axis`)으로 고르게
고쳤다. 번호 짓는 버릇이 바뀌어도 측정축은 같이 움직인다.

**없는 팩 이름을 받아 두고 있었다.** 산업이나 역할 코드가 틀려도 고르는
자리에서는 아무 일이 없고, 다 풀고 나서 결과를 만들 때 터진다. 응시자는
마지막 단추가 안 되는 것만 보고 어디서 틀렸는지 모른다. 고르는 자리에서
막는다.

**스타일시트가 안 내려가는 배포본을 눈으로는 못 잡는다.** 고친 뒤
서버를 다시 띄우지 않고 캡처를 돌렸더니 쪽은 200 으로 멀쩡히 뜨고
CSS 만 400 이었다. 캡처 스크립트가 브라우저 오류를 세고 있어서 걸렸다.

## 아직 아닌 것

결과지 화면과 PDF 는 시작하지 않았다. 완료 화면에서 판정 한 줄을 만들어
두는 데까지다. 영어판 문면은 한 줄도 쓰지 않았다. 추정 응답 시간과 보기
넷의 경계가 사람들에게 실제로 통하는지는 파일럿에서만 나온다.
