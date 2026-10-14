# PCU UI/UX 고도화 — 배재대학교 전용 CareerMatri Portal

**측정은 `ME_V3_MEASUREMENT_FREEZE_1` 에 그대로 머문다.** 이 회차가 고치는
것은 **보이는 것과 읽는 차례**뿐이다: scoring · item id · item count ·
Core mapping · Result decision · Evidence decision · Gap decision ·
Registry · `student_open` 의 diff 가 0 이다(§21).

---

## A. BEFORE — 사람 눈으로 읽은 열 화면

캡처는 `docs/metri/shots/pcu-wow/before/` 에 있고, 뽑은 명령은 이렇다.

```bash
V3_PREVIEW_OPEN='*' bash scripts/stage-serve.sh 3100
OUT=docs/metri/shots/pcu-wow/before UI_BASE=http://127.0.0.1:3100 \
  V3_PREVIEW_OPEN='*' npx tsx scripts/pcu-wow-shots.ts
```

**자리 목록을 주소로 열어 찍지 않는다.** 학생이 밟는 차례 그대로 밟으면서
찍는다. 주소로 열면 그 쪽이 어떤 상태인지는 **지난번 누군가가 눌러 둔
상태**에 달려 있고, 그러면 BEFORE 와 AFTER 를 견줄 수 없다.

| # | 화면 | Desktop | Mobile | 판정 | 가장 무거운 것 |
|---|---|---|---|---|---|
| 1 | `/campus/pcu` | 1440×957 | 375×1734 | **FAIL** | 학교 전용 포털이 아니라 **학교 이름을 덧붙인 작업공간**이다. 신뢰 띠도 4 핵심 가치도 없고, 단과대학 칸의 아이콘과 색조가 **뜻을 갖지 않는다**(§2 가 금지한 generic UI) |
| 2 | 학과 선택 | 1440×**6534** | 375×**15053** | **FAIL** | 같은 생김새의 칸 쉰일곱이 **같은 본문 한 줄을 되풀이**한다. select box 는 아니지만 §4 가 요구한 `학과명 · 한 줄 · 검사 가능 · 화살표` 가 아니다. 모바일 한 손 탐색이 불가능하다 |
| 3 | 로그인 | 1440×900 | 375×812 | **PARTIAL** | 학교 전용으로 이미 닫혀 있다(가입·소셜 0건). 다만 왼쪽 정렬 full-bleed 폼이고 오른쪽과 아래가 통째로 비었다. §5 의 `배재대학교 학생 전용 검사` 와 CTA `검사 시작하기` 가 없다 |
| 4 | 검사 | 1440×900 | 375×812 | **FAIL** | 상단이 `CareerMatri · 기본 정보 · 관심 산업 · PRO · 1 / 1` 이다. **학과명이 없고 진행 %가 없다**. 보기는 얇은 줄이라 §6 의 큰 카드형이 아니고, 화면 아래 절반이 비었다 |
| 5 | 결과 첫 화면 | 1440×1206 | 375×1638 | **PARTIAL** | 4칸 요약과 `배재대학교 · 경영학과 · 날짜` 줄이 이미 있다. 다만 상단 띠가 `내 CareerMatri` 뿐이라 §8 의 학교 정체성이 없고, 1+3 격자가 어긋나며 같은 무게의 행동 넷이 한 줄에 선다 |
| 6 | 상세 결과 | 1440×**7086** | 375×8905 | **PARTIAL** | 영역마다 `직접 판단한 것 / 남긴 결과 / 아직 부족한 부분` 이 서는 것은 §9 에 맞다. 다만 §10 의 **독립된 Evidence 영역**이 없고 §13 의 `왜 연결되는지` 가 한 줄뿐이다 |
| 7 | PDF 1쪽 | A4 | — | **FAIL** | **표지가 없다.** 머리글이 `CareerMatri` 한 줄이고 학교 이름이 본문 메타에만 있다. §14 가 실패로 못박은 `기존 웹을 print CSS 로 찍는 수준` 그대로이고 11쪽이다 |
| 8 | PDF 상세 | A4 | — | **FAIL** | 같은 까닭. 쪽마다의 이름(확인된 경험 / Evidence / Gap / Industry·Role / Action …)이 없다 |
| 9 | `/me` | 1440×933 | 375×1333 | **PARTIAL** | 승인된 작업공간이라 구조는 §15 에 가깝다. 다만 **배재대학교가 어디에도 없고** 왼쪽 띠의 전공 이름이 학과명이 아니라 Core 이름(`경영`)이다 |
| 10 | `/org/v3` | 1440×**9226** | 375×9377 | **FAIL** | 막대 목록 1만 8천 px 이고 **담당자 화면에 안쪽 코드가 샌다**(`CENTRAL` · `FOUNDRY` · `COMPTEAM` · `PLANNING` · `WEBTOON` · `Z4_INSUFFICIENT_EVIDENCE` · `NOT_EXPLORED` · `CL_EVIDENCE_*`). KPI 줄도 단과대학·학과 구조도 추이도 없다 |

**세어 보면 FAIL 여섯 · PARTIAL 넷 · PASS 0 이다.** 그리고 여섯 WOW
질문(§19)에 지금 답할 수 있는 것이 하나도 없다.

