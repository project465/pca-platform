# R12 근거 절: 받은 참조 구현을 적용했다

받은 참조 구현(`EvidenceSection` · `EvidenceStory` · `.cm-evidence` CSS)을
BIZ 결과지의 근거 절에 적용했다. 측정은 `ME_V3_MEASUREMENT_FREEZE_1` 에
그대로 머문다: measurement · scoring · item bank · assessment question ·
answer meaning · result decision · evidence decision · gap decision ·
registry · DB schema · `student_open` 을 한 줄도 건드리지 않았고 그 동결이
**기록을 다시 적지 않은 채로** 통과한다.

## ① 무엇을 그대로 가져왔는가

참조가 정한 것 가운데 구조에 해당하는 것은 전부 가져왔다.

1. **자료 꼴 하나.** `primary` 와 `secondary` 가 `EvidenceStory` 한 꼴을
   쓰고 둘을 layout 으로만 가른다. 그래서 여는 경험과 곁근거가 서로 다른
   타입을 들고 있던 것(`EvOpen` · `EvAlso`)을 하나로 합쳤다.
2. **다섯 토막.** `domain` · `action` · `decision?` · `outputs[]` ·
   `application` · `interview`.
3. **다섯 막.** INTRO · PRIMARY · TRANSITION · SECONDARY · MORE.
4. **DOM 짜임.** 여는 경험은 `meta` 한 줄 아래 왼쪽 이야기(`h4` ·
   `decision` · `outputs`)와 오른쪽 꺼내 쓰는 자리(`지원서` ·
   `면접에서 이어질 질문`)가 비대칭 두 단으로 갈리고, 곁근거는 머리가
   가로로 눕고(영역과 행동 | 남긴 것) 쓰는 자리가 두 칸으로 선다.
5. **면과 둥글기.** 강한 둥근 면은 여는 경험 하나(32)이고 그 안에 면접
   묶음(20)과 결과물 조각(12)이 든다. 곁근거는 면이 없고 금 한 줄로만
   갈린다.
6. **문면.** 참조가 적어 둔 라벨과 안내 문장을 글자 그대로 세웠다.

## ② 바꾼 것 셋과 그 까닭

**class 이름을 `rs-ev3-*` 로 바꿨다.** 참조의 `cm-` 은 작업공간
디자인 시스템이 쓰는 이름이고(`src/app/me/platform.css` 의 173개),
`v3:workspace` 가 쓰는 `cm-` 이름이 CSS 에 있는지 센다. 결과지는
`result.css` 만 읽으므로 지금 당장 겹쳐 보이지는 않지만, 이 저장소에서
이름이 겹친 것이 열세 번 버그였다. 짜임과 값은 한 줄도 바꾸지 않았다.

**색을 토큰으로 옮겼다.** 참조의 여섯(`--ink #10233f` ·
`--ink-soft #5f6e82` · `--line #dfe7ef` · `--surface #f7f9fc` ·
`--cyan-soft #e9f7fa` · `--cyan #2393a3`)은 결과지 팔레트의 `--r-ink
#16203a` · `--r-ink-2` · `--r-line` · `--r-field #f5f7fb` ·
`--r-cyan-soft #e3f4f9` · `--r-teal #1b7f8c` 와 눈으로 갈리지 않는
자리다. 팔레트를 한 벌 더 두면 결과지가 두 가지 색 체계로 서고, 그
어긋남은 한 쪽씩 볼 때는 보이지 않는다. 이 저장소는 토큰 네 벌을 한
벌로 합친 적이 있고 그 까닭이 그대로 여기에도 선다. 굵기도 650/720/
750/760 대신 네 토큰(`--ui-w-rg/md/sb/bd`)을 쓴다.

**폭을 결과지 container 로 두었다.** 참조의
`min(1180px, calc(100% - 48px))` 을 여기서 못 박으면 근거 절만 다른 글
폭으로 서서, 이어 내려 읽을 때 절들이 서로 다른 화면을 붙여 놓은 것으로
보인다.

## ③ 참조가 비워 둔 자리를 어떻게 채웠는가

참조는 자료를 손으로 적은 보기였고, 제품은 그 자리를 굳은 결과에서
채운다. 채우는 규칙은 이렇다.

| 토막 | 어디서 오는가 |
|---|---|
| `domain` | 그 Core 의 taxonomy 가 적어 둔 영역 이름 |
| `action` | 여는 경험은 `decided`, 곁근거는 `did` |
| `decision` | 여는 경험은 `did`, 곁근거는 `${고른 판단}도 직접 정했습니다` |
| `outputs` | 고르신 `artifacts` 를 이름씨로 다듬어 둘까지 |
| `application` | 여는 경험은 그 영역이 일하는 차례, 곁근거는 손에 남은 것 |
| `interview` | 여는 경험은 견준 자리, 곁근거는 고른 기준 |

**여는 경험의 큰 한 마디는 고른 판단이다.** 서류와 면접에서 읽히는 쪽이
한 일이 아니라 그 안에서 직접 정한 것이고(설계 원칙 `한 일과 고른 것을
가른다`), 참조의 보기도 머리에 선택을 적고 그 아래에 가정 정리를 적었다.
곁근거는 반대로 한 일이 머리에 서므로, 두 이야기가 같은 꼴을 써도 **먼저
읽히는 토막이 서로 다르다.**

**재료가 없는 토막은 비운다.** `decision` 이 `action` 과 같은 문장이 되면
돌려주지 않는다: 같은 줄을 두 번 적으면 둘 가운데 하나는 읽히지 않는다.

## ④ 참조의 보기 문장을 그대로 쓰지 않은 두 자리

**인용 부호를 자료에서 뺐다.** 면접 물음이 `blockquote` 로 서므로 부호가
화면과 자료에 두 번 선다. 참조도 자료에는 부호를 두지 않았다.

**`전사 목표와는` 을 `전사 목표와` 로 적는다.** 받침을 보고 고른 토씨 뒤에
글자를 또 이어 붙이는 꼴이고 `v3:result:copy` 4번이 그 자리를 센다. 검사를
느슨하게 하지 않았고, 떼고 읽어도 뜻이 그대로다.

## ⑤ 화면에서 두 번 고친 자리

찍어 놓고 읽어서 둘을 고쳤다. 둘 다 상태코드로는 지나간다.

**가운데 맞춘 머리가 세 줄로 끊겼다.** `text-wrap: balance` 와 글에 적힌
줄바꿈이 서로 다투어 `지원서에 쓸 / 만한 경험은 / 이미 여기 있습니다` 가
됐다. 줄바꿈이 적혀 있으면 균형 맞추기를 쓰지 않는다.

**좁은 화면에서 앞뒤 글자가 붙었다.** 손전화에서는 `<br>` 을 세우지 않는데
그 자리에 사이띄개가 없어 `경험은이미` 로 나갔다. 줄바꿈 앞에 사이띄개를
둔다.

## ⑥ 회귀

| 검사 | 결과 |
|---|---|
| `v3:freeze:measure` | 14 / 14 · **기록을 다시 적지 않았다** |
| `v3:result` | 25 / 25 |
| `v3:result:copy` | 16 / 16 |
| `v3:freeze` | 검사 화면 파일 19벌 그대로 |
| `v3:workspace` | 파일 46벌 그대로 · 쓰는 이름 118개 |
| `v3:result:freeze` | `ME_V3_RESULT_UI_V60` 으로 다시 적었다 |
| `v3:freeze:core` | Core 화면 열넷 · 다시 적었다 |
| `v3:extend` | 14 / 14 · core 를 모르게 짠 파일 9벌 |
| `v3:majors` | 18 / 18 |
| `v3:content:qa` | 60벌 · 걸림 0 |
| `v3:human` | 10 / 10 |
| `v3:product-loop` | 65 / 65 |
| `v3-pdf-audit` | 22벌 · 걸림 0 · 보고 3 |

**종이 보고 셋은 R11 과 같은 줄이다**(ME STANDARD 마지막 쪽 38% · CS PRO
39% · SPORTS PRO 39%). 쪽 높이가 고정이라 마지막 쪽이 얼마나 차는가는
제로섬이고, 그 셋은 이번 회차 전부터 있던 자리다.

`gate34-audit` 의 §2 금지 틀 17가지가 0건이고, §12 의 `요구 해석` 은
영역 축 목록에 서는 줄이라 이번 회차 전부터 있던 자리다(R11 떠 둔 글에도
같은 수로 들어 있다).

## ⑦ 판본

올린 것은 결과지 화면과 문장 둘이다: `ME_V3_RESULT_UI_V60` ·
`me-v3-result-copy.52`. **문항 은행과 판단 규칙과 결과 모델은 그대로다**
(`ME_V3_ITEM_BANK_V2.5` · `me-v3-scoring.5` · `me-v3-result-model.6`).

## ⑧ 아직 아닌 것

네트워크 정책이 `app.careermatri.com:443` 을 막아 운영 배포본을 밖에서 열지
못했다. **학생 공개 상태를 한 칸도 바꾸지 않았다**: 열린 Core 는 운영
Canary 의 `BIZ_CORE_V1` 하나이고 등록부 지문이 그대로다. 그래서
`PRODUCTION UNVERIFIED` 와 `PCU CANARY BLOCKED` 를 그대로 둔다. 다른
Core 로 넓히지 않았고 115개 학과로 복제하지 않았다. 영역 사전이 같은
결과물 이름을 쓰는 Core 쌍(BIZ = PUBADM)은 문항 은행 지문이 덮는 자리라
그대로 적어 둔다.

## ⑨ 그림

`docs/metri/shots/review-loop/r16-evidence/` 에 열넷. 제출하는 여덟은
`flow-desktop` · `flow-mobile` · `gate4-desktop` · `gate4-mobile` ·
`gate4-desktop-card` · `gate4-mobile-card` · `gate4-desktop-card2` ·
`gate4-mobile-card2` 다.
