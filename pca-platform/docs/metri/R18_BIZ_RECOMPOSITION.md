# BIZ Result 제품 디자인 재구성 (R18)

제출 상태: **HUMAN REVIEW REQUESTED**. 이 문서는 사람이 읽고 PASS 또는
FAIL 을 적는 자리이고, 여기에 `Gold Master PASS` 와 `Commercial Ready` 와
`Reference Match PASS` 를 적지 않는다.

Reference image 는 이 세션에 도착하지 않았다. `/mnt/user-data/uploads` 가
비어 있고 대화에 이미지 블록이 없다. 그래서 **REFERENCE UNAVAILABLE** 로
적고 reference 와의 대조를 하지 않았으며, 기준으로 삼은 것은 지시문에 글로
적힌 §1~§15 뿐이다.

## A. 무엇을 건드리지 않았는가 (§13 FREEZE)

measurement · scoring · item bank · assessment question · answer meaning ·
result/evidence/gap decision · Core·Domain mapping · registry · DB schema ·
`student_open` 을 한 줄도 건드리지 않았다. `npm run v3:freeze:measure` 가
**기록을 다시 적지 않은 채로** 통과한다(확인 14가지 · 걸림 0). 그리고
`open_to_students` 를 한 칸도 바꾸지 않았다.

NURSING 과 PUBADM 으로 넓히지 않았다(§14). 고친 파일은 결과지 presentation
layer 다섯 벌과 그 이름을 든 검사 다섯 벌뿐이다.

## B. 다섯 장면 (§6)

| 장면 | 자리 | 무엇을 답하는가 |
|---|---|---|
| 1 WHO I AM NOW | Hero | 지금 지원서에 쓸 수 있는 상태인가 |
| 2 WHAT MATTERS NOW | `지금` | 이미 가진 것 하나와 지금 할 행동 하나 |
| 3 WHAT I ALREADY HAVE | `내 경험` | 어떤 경험이 어떤 근거로 남아 있는가 |
| 4 WHAT I CAN DO NEXT | `다음` | 지금 눌러서 할 수 있는 일 |
| 5 WHERE THIS CAN GO | `닿는 곳` | 산업과 직무와 /me 로 이어지는 길 |

앞 판본은 절 차례가 `요약 → 근거 → (접힌 자리 안에) 산업·직무와 할 일`
이었다. **행동하는 자리와 닫는 CTA 가 접힌 자리 안에 있었다.** 펴지 않은
사람은 이 제품이 파는 자리를 한 번도 보지 못한다.

## C. KEEP / REBUILD / DELETE

### KEEP
- Hero (§2 지시 그대로). 쪽 전체의 리듬 기준으로 삼았다
- 열두 영역 전체와 지역 자료. 되짚어 보실 자리라 접었고 종이에서는 펴진다
- 닫는 자리의 navy CTA. 쪽에서 면을 든 자리가 거기와 SCENE 2·4 의 단추뿐이다

### REBUILD
- **Summary → STARTING POINT**(§3). navy 추천 카드와 흰 카드를 걷고
  `minmax(0,1fr) 19rem` 비대칭 두 단으로. 왼쪽은 테도 면도 없는 큰 경험
  문장과 가로로 놓인 artifact strip, 오른쪽은 왼쪽에 teal 금 하나를 세운
  action cue 와 CTA 하나. 3~4문장짜리 `무엇을 적나요` 는 progressive
  disclosure 안으로
- **Evidence primary**(§4). artifact 가 문장보다 **먼저** 선다. 그다음이
  실제 행동을 적은 큰 제목이고, 지원서는 hairline 한 줄, 면접은 큰 인용이다.
  **둘이 같은 형태가 아니다**: 앞엣것은 금 아래의 작은 글이고 뒤엣것은
  따옴표를 든 blockquote 다
- **Evidence secondary**(§4). 첫 카드의 되풀이가 아니라 editorial teaser 다
- **Action**(§5). h2 바로 아래에서 실제로 도는 길 셋으로 연다
- **Mobile 390**(§8). 데스크톱 차례를 그대로 쌓지 않는다. SCENE 2 는
  `headline → action → artifact` 차례로 뒤집힌다

### DELETE
- `ActionRoadmap` 네 칸 흐름 표(`.pv-flow` · `charts.tsx` 237~290줄)
- 근거 절의 머리 블록(`.rs-ev3-intro`)과 그 안의 두 문장
- navy 추천 카드와 흰 카드(`.rs-card` · `.is-did` · `.is-next`)
- 지원서·면접의 cyan 둥근 면 둘(`.rs-ev3-ub` · `.is-interview`)
- 곁근거를 여는 전체 폭 회색 바(`.rs-openbtn` 를 그 단추에서 걷었다)
- `.rs-aside` · `.rs-gain` 두 금
- `.rs-bridge` 와 `.rs-draft` 의 면과 테(class 는 남고 면만 걷었다)

## D. 제거한 AI trope

| trope | 어디에 있었나 | 무엇으로 바꿨나 |
|---|---|---|
| 파스텔 둥근 카드 모음 | 요약 카드 둘 | 테 없는 비대칭 두 단 |
| icon + title + body 템플릿 | 근거 절 머리 | 머리를 걷고 artifact 부터 |
| 3·4 칸 격자 | `ActionRoadmap` | 걷었다 |
| 동일 카드 반복 | 근거 primary·secondary | 서로 다른 DOM 과 서로 다른 활자 |
| 칩 남발 | 근거 산출물 목록 | artifact strip 한 줄 |
| 개발자 아코디언 | `[영역] 열기 / 닫기` 바 | `…에서도 꺼내 쓸 경험이 있어요 · 보기` |
| 제품이 자기를 설명하는 문장 | 근거 절 머리 | 걷었다 |

## E. 센 것

- **삭제한 문장**: 화면에 서던 줄 14개(`지원서에 쓸 만한 경험은 이미 여기
  있습니다` · `여기 있는 건 …` · `다음 과제에서는 직접 정한 기준을 한 줄만
  적어두면 좋아요.` · `ActionRoadmap` 네 칸의 제목과 값과 빈 상태 · 요약
  카드의 보조 문장 둘 · `자세한 내용 보기` 의 note · `[영역] 열기/닫기`)
- **삭제한 사각형·카드**: 면이나 테를 들고 서던 자리 10종. `.rs-card` ·
  `.rs-card.is-did` · `.rs-card.is-next` · `.rs-aside` · `.rs-gain` ·
  `.pv-flow` · `.rs-ev3-outs li` · `.rs-ev3-ub` · `.rs-ev3-ub.is-interview` ·
  `.rs-openbtn`(곁근거 전환 줄에서)
- **사라진 CSS class** 16개 · **새 class** 11개
- **한 viewport 에서 면을 든 자리**: SCENE 2 는 담아두기 단추 하나,
  SCENE 4 는 `경험 한 줄 남기기` 하나

## F. 새 interaction

| 자리 | 무엇이 도는가 |
|---|---|
| SCENE 2 `지금 할 일에 담아두기` | 서버 동작(`takeActionsFromResult`) |
| SCENE 2 `무엇을 적나요` | progressive disclosure |
| SCENE 4 `경험 한 줄 남기기` | `/me/experience/new` |
| SCENE 4 `지금 할 일에 담아두기` | 같은 서버 동작 |
| SCENE 4 `지원서 문장 만들기` | `#translation` |
| SCENE 4 `[전공] 쪽에서 지금 할 수 있는 한 걸음` | progressive disclosure |
| SCENE 3 `…에서도 꺼내 쓸 경험이 있어요 · 보기` | 곁근거 열기 |

**없는 기능을 단추로 두지 않았다.** 일곱 자리 전부 이미 도는 길이다.

## G. §12 자가검수 (AUTO PASS 금지)

Desktop 7장과 Mobile 390 7장을 읽고 적는다. FAIL 을 숨기지 않는다.

| | 묻는 것 | d2 요약 | d4 근거 | d6 행동 | m9 요약 | m13 행동 |
|---|---|---|---|---|---|---|
| A | 3초 안에 무엇을 하라는지 아는가 | PASS | PASS | PASS | PASS | PASS |
| B | 큰 네모가 둘 이상인가 | PASS | PASS | PASS | PASS | PASS |
| C | 같은 꼴의 카드가 되풀이되는가 | PASS | PASS | PASS | PASS | PASS |
| D | 완전한 문장이 너무 많은가 | PASS | PASS | **FAIL** | PASS | **FAIL** |
| E | 마침표가 셋을 넘는가 | PASS | PASS | **FAIL** | PASS | **FAIL** |
| F | 제품이 자기를 설명하는가 | PASS | PASS | PASS | PASS | PASS |
| G | 금지 문구가 서는가 | PASS | PASS | PASS | PASS | PASS |
| H | artifact 가 문장보다 먼저인가 | PASS | PASS | — | PASS | — |
| I | interaction 이 정보보다 먼저인가 | PASS | — | PASS | PASS | PASS |
| J | 데스크톱이 1400px 를 쓰는가 | PASS | PASS | PASS | — | — |
| K | 손전화가 데스크톱 축소판인가 | — | — | — | PASS | PASS |
| L | 설정·디버그 컨트롤처럼 보이는 바가 있는가 | PASS | PASS | PASS | PASS | PASS |

### FAIL 두 줄 (D · E — SCENE 4)

`적을 과제 고르기` 아래의 영역별 할 일이 한 viewport 에서 마침표 여섯과
`~세요` 넷을 쓴다. §9 한도(마침표 ~3 · `~요` ~2)를 넘는다.

고치지 않고 적어 두는 까닭은 하나다. 그 문장을 만드는 자리가 `actionKo()`
이고 **`/me` 홈과 `다음 할 일` 쪽과 종이가 같은 함수를 읽는다**(설계 원칙
10). 결과지에서만 줄이면 같은 할 일이 두 화면에서 다른 말을 하고, 상담
자리에서 다른 종이를 들고 앉게 된다. 고치는 길은 `actionKo` 의 출력을
`행동 한 마디 + 남길 것` 두 토막으로 **자료 쪽에서** 가르는 것이고, 그것은
`/me` 와 종이를 함께 다시 보는 별도 회차다.

## H. Reference 와 아직 다른 점

Reference image 가 없으므로 reference 와의 거리를 적을 수 없다. 대신
**지시문에 글로 적힌 것 가운데 아직 못 한 것**을 적는다.

1. §9 의 copy rule 이 SCENE 4 에서 깨진다(위 G 의 FAIL 두 줄)
2. §3 이 말한 `artifact strip` 은 섰지만 **artifact 기반 시각**(§7 USE)은
   아직 글자 칩이다. 실제 문서 모양을 그리지 않았다
3. SCENE 5 는 이번 회차에서 자리만 옮겼고 안쪽은 앞 판본 그대로다
4. 종이는 이번 회차에서 손대지 않았다. 화면이 다섯 장면이 된 뒤 종이의
   절 차례가 그대로인지는 다음 회차가 본다

## I. 회귀

| 검사 | 결과 |
|---|---|
| `v3:freeze:measure` | 14 / 14 · **다시 적지 않은 채로** |
| `v3:result:freeze` | 파일 18벌 그대로(`second.tsx` 를 목록에 더했다) |
| `v3:freeze:core` | 화면 14자리 |
| `v3:freeze` · `v3:workspace` | 그대로 |
| `v3:result:copy` | 16 / 16 |
| `v3:human` | 10 / 10 |
| `v3:product-loop` | 65 / 65 |
| `v3:result:height` | 28 / 28 |
| `v3:visual` | 폭 11 · 확대 4 · 자리 20 |
| `v3-pdf-audit` | 22벌 · 걸림 0 · 보고 1 |

`second.tsx` 가 **어느 동결 목록에도 없었다.** 학생이 읽는 글이고 누르는
자리인데, 이번에 그 줄의 말과 모양을 바꾸고서야 드러났다. 목록에 없는
파일은 고쳐도 동결이 모르는 채로 통과한다.

## J. 판본

올린 것은 둘이다: `ME_V3_RESULT_UI_V62` · `me-v3-result-copy.54`.
**문항 은행과 판단 규칙과 결과 모델과 검사 화면과 작업공간은 그대로다.**

## K. 제출 자료

`docs/metri/shots/review-loop/r18/` 에 14장. Desktop 1440 일곱
(`d1-all` · `d2-hero-summary` · `d3-second-closed` · `d4-evidence` ·
`d5-second-open` · `d6-action` · `d7-closing`)과 Mobile 390 일곱
(`m8-all` · `m9-hero-summary` · `m10-second-closed` · `m11-evidence` ·
`m12-second-open` · `m13-action` · `m14-closing`).
응시 10793 · `BIZ_CORE_V1` · 배재대 경영학과.

## L. 아직 아닌 것

네트워크 정책이 `app.careermatri.com:443` 을 막아 운영 배포본을 밖에서
한 번도 열지 못했다. 그래서 `PRODUCTION UNVERIFIED` 와
`PCU CANARY BLOCKED` 를 그대로 둔다. 학생 공개 상태를 한 칸도 바꾸지
않았고, DB 스키마를 한 줄도 바꾸지 않았으므로 마이그레이션은 필요 없다.
고친 것이 전부 이미지 안으로 들어가는 파일이라 재배포가 먼저다.
