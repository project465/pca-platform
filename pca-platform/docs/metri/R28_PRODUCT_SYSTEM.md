# CAREERMATRI PRODUCT SYSTEM EXPANSION (R28)

**코드를 고치지 않았다.** `src` · `sites` · `assessment` · `db` 의 diff 가
0줄이고 동결 다섯이 **기록을 다시 적지 않은 채로** 통과한다. 늘어난 것은
찍는 하네스 둘(`scripts/lab/r28-shots.ts` · `scripts/lab/r28_sixup.py`)과
그 하네스가 뜬 그림이다.

```
v3:freeze:measure  통과      v3:result:freeze  통과      v3:freeze:core  통과
v3:freeze          통과      v3:workspace      통과
```

**자리 목록을 주소로 열어 찍지 않았다.** 학과에서 계정을 발급하고 학교 길로
응시를 열어 실제로 눌러 들어간 뒤, 남은 문항을 사람 C 의 규칙으로 채우고
제출해서 받은 결과를 찍었다. 경험이 거의 없는 응답으로 찍으면 결과지가
`아직 없습니다` 로 차서 상품성을 가릴 수 없다.

응시 11208 BIZ · 11209 NURSING · 11210 PUBADM · 11211 CS · 11212 EE ·
11213 MEDIA.

---

## A. 제출물

여섯 Core Current State (Desktop 1440 · Mobile 390 · 카드 확대)

| Core | 자리 | 그림 |
|---|---|---|
| BIZ | PCU26_BIZ 경영학과 | `r28/BIZ/c-state-{d,m}.png` · `c-card-{d,m}.png` |
| NURSING | PCU26_NURSING 간호학과 | `r28/NURSING/...` |
| PUBADM | PCU26_PUBADM_GENERAL 행정학과 | `r28/PUBADM/...` |
| CS | PCU26_SWF_COMPUTER 컴퓨터공학 | `r28/CS/...` |
| EE | PCU26_EE 전기전자공학과 | `r28/EE/...` |
| MEDIA | PCU26_ADPHOTO 광고사진영상 | `r28/MEDIA/...` |

비교판 셋: `r28/sixup-state-d.png` · `sixup-state-m.png` · `sixup-card-d.png`.
**늘려 맞추지 않았다**: 폭만 같게 두고 세로는 제 비율대로 둔다.

제품 화면 다섯 (BIZ 기준 · Desktop · Mobile)

| 화면 | 그림 |
|---|---|
| Assessment | `r28/BIZ/a0-intro-d.png` · `a1-sweep-d.png` · `a2-judge-{d,m}.png` |
| Result Summary | `r28/BIZ/b1-summary-{d,m}.png` · `b2-open-{d,m}.png` |
| Current State | `r28/BIZ/c-state-{d,m}.png` |
| /me Workspace | `r28/BIZ/d1-me-{d,m}.png` |
| Experience Add | `r28/BIZ/e1-exp-{d,m}.png` |

---

## B. 공통 원인 넷

화면마다 따로 난 결함이 아니다. 네 자리가 모든 화면에 퍼져 있다.

**B1. 학생 copy layer 가 한 Core 에만 있다.**
`src/lib/me-v3/result/tile-sub.ts` 의 `BY_CORE` 에 `BIZ_CORE_V1` 열둘만
적혀 있고 나머지 열아홉 Core 는 `domainSub` 로 떨어진다. 그 함수가 내놓는
것은 `*-taxonomy.json` 의 `subareas` 를 가운뎃점으로 잇고 열한 자에서 자른
값이다. 그래서 비교판에서 BIZ 와 PUBADM 만 움직씨 구로 서고 넷은 이름씨
토막으로 선다. 규격 §3 이 요구한 `INTERNAL TAXONOMY → STUDENT-FACING COPY`
가 한 Core 에서만 서 있다.

**B2. 표시가 뜻이 아니라 자리로 정해진다.**
결과지는 `TILE_IC = ["plan","cube","note"]` 를 `i % 3` 으로 돌린다
(`result/page.tsx:972`). 그래서 여섯 Core 전부 첫 칸이 막대, 둘째가 상자,
셋째가 문서다. 간호 사정에 막대가 서고 서버·API 구현에 문서가 선다.
`/me` 는 `TILE_ICON` 한 표(`TD01: gear` …)를 스무 Core 가 같이 쓴다.
규격 §8 의 `icon이 의미를 방해하는가` 에 해당한다.

**B3. 같은 타일이 화면마다 다른 세부를 든다.**
결과지 타일의 세부는 `tileSub(core, code)` 가 주는 경험 움직씨 구이고,
`/me` 타일의 세부는 `st.model.domains[].artifacts[0]` 이 주는 산출물
이름이다. 그래서 경영전략·기획 한 칸이 결과지에서는 `목표와 성과 기준
정하기` 로, `/me` 에서는 `목표와 지표를 정리한 표` 로 선다. 데스크톱
`/me` 는 그 칸의 글 폭이 168px 안팎이라 `목표와 지표를 …` 으로 가린다.

**B4. 다른 전공의 예시가 공통 화면에 글자로 박혀 있다.**
`src/app/me/experience/compose.tsx:172` 의 placeholder 가
`예: 전동 스쿠터 프레임 경량화 캡스톤` 이다. 경영학과 학생의 화면에
기계공학 예시가 선다. 운영 Canary 의 `기계공학자` 와 같은 자리다.

---

## C. Cross-Core Current State 판정

`sixup-state-d.png` · `sixup-state-m.png` · `sixup-card-d.png` 을 읽고 적었다.

| 확인할 것 (§8) | 판정 | 근거 |
|---|---|---|
| 영역명이 자연스러운가 | PARTIAL | 여섯 다 taxonomy 이름 그대로다. `임베디드·펌웨어` 와 `자료구조·알고리즘` 은 그 전공 학생에게 읽히고, `투약·주사 관리` 도 읽힌다. 다만 학생이 한 일을 가리키지 않고 분류 이름에 머문다 |
| subtitle이 학생 경험 언어인가 | FAIL | BIZ 셋과 PUBADM 둘만 움직씨 구다. NURSING `볼 항목·지금 상태` · CS `요구 정리·모듈 분해` · EE `증폭 회로·필터 회로` · MEDIA `쓸 매체·낼 양과 때` 는 이름씨 토막이다. NURSING `확인할 것·줄 방법` 은 한 번 읽어 뜻이 서지 않는다 |
| 명사만 갈아 끼운 것처럼 보이는가 | FAIL | 넷이 그렇게 보인다. 원인은 B1 이다 |
| card height가 깨지는가 | PASS | Core 안에서 셋의 키가 같다. Core 사이에는 갈리는데 세부 줄 수가 다르기 때문이다 |
| 2줄/3줄이 난립하는가 | FAIL | 데스크톱에서 BIZ·PUBADM 은 세부가 두 줄, NURSING·CS·EE 는 제목이 두 줄이다. 끊기는 자리가 가운뎃점 뒤라 `간호 사정·` 과 `소프트웨어 설계·` 가 줄 끝에 선다 |
| icon이 의미를 방해하는가 | FAIL | B2 |
| 학과가 바뀌어도 product language가 유지되는가 | PARTIAL | 구조(절 머리 · 카드 셋 · 꺾쇠 · 전체 보기)는 여섯이 같다. 말의 결은 갈린다 |

Mobile 390 은 여섯 다 제목 한 줄 · 세부 한 줄로 서고 가로 넘침이 없다.
**손전화가 데스크톱 축소판이 아니다**: 데스크톱만 `전체 보기 →` 를 들고,
손전화는 그 줄을 세우지 않는다.

---

## D. 화면 다섯 판정

### D1. Assessment

| | |
|---|---|
| SCREEN ROLE | 생각하지 않고 답할 수 있게 만드는 화면 |
| REFERENCE principle | 레퍼런스에 짝이 없다. 판정 기준은 규격 §2 와 §10 이다 |
| PRODUCT-LIKE / REPORT-LIKE | **SURVEY-LIKE** |
| HUMAN COPY / SYSTEM COPY | HUMAN (문항 문면은 묻는 말이다) |
| REFERENCE MATCH | 해당 없음 |

CURRENT problem

- 데스크톱 한 화면에 같은 다섯 칸짜리 보기가 네 번 선다. 테를 두른 칸이
  스무 개이고 그것이 화면에서 가장 큰 덩이다 (§10 Q6 · Q7)
- 첫 질문 앞에 머리가 여섯 줄이다: 맥락 한 줄 · `관심 1 / 3` · 큰 질문 ·
  도움말 · `1 / 4` · 문항. 손전화에서는 그 여섯 줄이 화면의 절반을 먹는다
- 문항 번호(`1 / 4`)가 문항보다 먼저 읽힌다
- 손전화는 한 질문만 펴고 나머지를 접는다. 이 자리는 축소판이 아니다

| 구성 요소 | 판정 |
|---|---|
| 머리띠(브랜드 · 학과 · 걸음 · 자동 저장 · 진행) | KEEP |
| 맥락 한 줄 | KEEP |
| `관심 1 / 3` 눈썹 | KEEP |
| 큰 질문 + 도움말 | MERGE (도움말을 질문 아래 한 줄로) |
| 문항 번호 `1 / 4` | DELETE (손전화의 접힌 줄이 이미 차례를 적는다) |
| 다섯 칸 보기 | REBUILD (데스크톱에서 네 번 되풀이되지 않게) |
| `모르겠다` | KEEP (척도 밖의 자리다) |
| 아래 띠(이전 · 다음) | KEEP |

### D2. Result Summary

| | |
|---|---|
| SCREEN ROLE | 내가 이미 가진 경험과 지금 부족한 한 가지를 이해하는 화면 |
| REFERENCE principle | 레퍼런스 Hero: 눈썹 · 큰 한 마디 · 왜 한 줄 · 채운 단추 하나 · 접힌 나머지 |
| PRODUCT-LIKE / REPORT-LIKE | PRODUCT-LIKE |
| HUMAN COPY / SYSTEM COPY | **혼재** |
| REFERENCE MATCH | PARTIAL |

CURRENT problem

- 큰 한 마디(`예산이나 인원을 항목별로 나눴어요.`)는 그 사람이 고른 답에서
  온다. 이 자리는 HUMAN COPY 다
- 바로 아래 `지금 할 일` 의 큰 글씨가 `그때 직접 정한 것을 적어 두기` 다.
  `ACTION_HEAD_KO` 아홉 줄 가운데 하나이고 누가 응시해도 아홉 중 하나가
  그대로 선다. SYSTEM COPY 다
- 그 설명이 `경영전략·기획 과제 하나. 받은 요구를 어떤 조건으로 옮겼는지
  세 줄로 적습니다.` 다. §4 가 금지한 `최근 OO 과제 하나` 와 `세 줄로` 가
  한 줄에 같이 있다
- 왜 해야 하는지가 없다. 레퍼런스는 그 자리에 `이 경험을 명확히 정리하면,
  지원서와 면접에서 더 구체적으로 설명할 수 있습니다.` 를 둔다
- CTA 가 셋이다: `지금 적어두기` · `그 밖에 할 일 3개 ∨` · `할 일에 담아두기`

| 구성 요소 | 판정 |
|---|---|
| 큰 한 마디 + 메타 줄 | KEEP |
| 산출물 rail (`목표와 지표를 정리한 표 · 사업계획 · …`) | KEEP |
| `지금 할 일` 면 | KEEP |
| 그 안의 큰 글씨 | REBUILD (작업 이름에서 내 경험을 가리키는 문장으로) |
| 그 안의 설명 두 줄 | REBUILD (방법과 분량에서 왜로) |
| 채운 단추 | KEEP (문구만 `지금 정리하기 →`) |
| `그 밖에 할 일 N개 ∨` | KEEP |
| `할 일에 담아두기` 폼 | MERGE (토글 안 또는 `#plan` 절로) |
| `이미 담아 둔 할 일 N개 · 보기` | MERGE (위와 같은 자리로) |
| 오른쪽 체크리스트 그림 | REBUILD (손전화에서 서지 않고 데스크톱에서 16% 짜리 얼룩이다) |

### D3. Current State

| | |
|---|---|
| SCREEN ROLE | 지금 내가 설명할 수 있는 것을 한눈에 보는 자리 |
| REFERENCE principle | 절 머리 + 카드 셋 + 꺾쇠 + 오른쪽 `전체 보기` |
| PRODUCT-LIKE / REPORT-LIKE | PRODUCT-LIKE |
| HUMAN COPY / SYSTEM COPY | BIZ 는 HUMAN, 나머지 넷은 SYSTEM |
| REFERENCE MATCH | MATCH (geometry) · MISMATCH (copy · icon) |

CURRENT problem

- 세부가 데스크톱에서 두 줄로 접히고 끊기는 자리가 어절 가운데다:
  `목표와 성과 기준 / 정하기`. 레퍼런스의 세 칸은 전부 한 줄이다
- 절 머리 아래 한 줄이 `지금 설명할 수 있는 영역 3개` 다. `영역` 은 §4 가
  금지한 말이고, 그 줄이 여섯 Core 에서 글자까지 같다
- 표시 셋이 Core 와 무관하게 자리로 정해진다 (B2)

| 구성 요소 | 판정 |
|---|---|
| 절 머리(채운 표시 + `현재 상태` + `전체 보기 →`) | KEEP |
| 절 머리 아래 한 줄 | REBUILD (`영역` 을 걷고 학생의 말로) |
| 카드 geometry (344 × 124 · 배지 78 · 꺾쇠) | KEEP |
| 카드 제목(taxonomy 이름) | KEEP (그 전공 학생이 찾는 이름이다) |
| 카드 세부 | REBUILD (열아홉 Core 에 학생 copy layer 를 쓴다) |
| 배지 표시 | REBUILD (자리로 정하지 말고 그 영역이 가리키는 것으로) |

### D4. /me Workspace

| | |
|---|---|
| SCREEN ROLE | 검사 이후 경험이 계속 쌓이는 생활 화면 |
| REFERENCE principle | 레퍼런스 그 자체(왼쪽 띠 · 쪽 제목 · Hero · 현재 상태 · 최근 변화) |
| PRODUCT-LIKE / REPORT-LIKE | PRODUCT-LIKE |
| HUMAN COPY / SYSTEM COPY | 혼재 |
| REFERENCE MATCH | MATCH |

CURRENT problem

- 현재 상태 카드 셋의 세부가 데스크톱에서 말줄임으로 잘린다:
  `목표와 지표를 …` · `채널별 성과 비…` · `견적서`. 셋 가운데 둘이 가려지고
  하나만 온전하다
- Hero 의 큰 글씨가 결과지와 같은 `그때 직접 정한 것을 적어 두기` 다
- Hero 의 설명이 `세 줄만 적어 두면 …` 이다. §4 금지
- `최근 변화` 아래 안내가 두 문장이고 `판단` 이 들어 있다
- 같은 타일이 결과지와 다른 세부를 든다 (B3)

| 구성 요소 | 판정 |
|---|---|
| 왼쪽 띠(네 묶음) | KEEP |
| 쪽 제목 + 메타 + `+ 경험 추가` + 찾기 + 종 + 계정 | KEEP |
| Hero 면 | KEEP |
| Hero 큰 글씨 | REBUILD (D2 와 같은 자리이고 같은 함수를 읽는다) |
| Hero 설명 | REBUILD (`세 줄만` 을 걷는다) |
| 현재 상태 카드 셋 | REBUILD (세부를 결과지와 한 출처로 모으고 말줄임을 없앤다) |
| 최근 변화 줄 묶음 | KEEP |
| 최근 변화 안내 두 문장 | MERGE (한 줄로) |
| 손전화 아래 띠 | KEEP |

### D5. Experience Add

| | |
|---|---|
| SCREEN ROLE | 오늘 할 한 가지를 바로 시작하는 화면 |
| REFERENCE principle | 레퍼런스에 짝이 없다. 판정 기준은 §2 와 §10 이다 |
| PRODUCT-LIKE / REPORT-LIKE | **FORM-LIKE** |
| HUMAN COPY / SYSTEM COPY | 혼재 (`기술 판단` · `남은 것`) |
| REFERENCE MATCH | MISMATCH |

CURRENT problem

- 데스크톱에서 폼이 왼쪽 위에 서고 오른쪽과 아래가 통째로 빈 면이다 (§10 Q9)
- 테를 두른 흰 상자 하나 안에 `이름표 → 값` 이 세 번 쌓인다 (§2 label/value)
- 2단 이름이 `기술 판단` 이고 3단이 `남은 것` 이다. 둘 다 §4 금지
- 손전화에서 고르는 칩이 아홉이고 네 줄로 깔린다
- `다음` 단추가 손전화에서도 왼쪽에 작게 선다
- 연도와 월이 브라우저 기본 `select` 다. 한 화면 안에서 그 칸만 다른 제품으로 보인다
- placeholder 가 다른 전공의 예시다 (B4)

| 구성 요소 | 판정 |
|---|---|
| 쪽 제목 `새 경험 하나 추가` | KEEP |
| 걸음 표 (1 · 2 · 3) | KEEP (이름만 REBUILD) |
| `어떤 경험인가요` 칩 아홉 | KEEP |
| 이름표 셋 | MERGE (묻는 말 한 줄로) |
| 한 줄 입력 | KEEP (placeholder 는 REBUILD) |
| 연도·월 `select` | REBUILD |
| `다음` | REBUILD (손전화에서 폭을 채운다) |
| `+ 이걸 적으면 무엇이 달라지나요` | KEEP |
| 바깥 흰 상자 | DELETE |

---

## E. §10 REFERENCE EXPERIENCE TEST

| | Assessment | Result Summary | Current State | /me | Experience Add |
|---|---|---|---|---|---|
| 1 3초에 할 일이 보이는가 | YES | YES | 해당 없음 | YES | YES |
| 2 쓰는 느낌이 강한가 | YES | PARTIAL | PARTIAL | YES | NO |
| 3 카드 하나를 지우면 좋아지는가 | YES | NO | NO | NO | YES |
| 4 문장을 절반으로 줄일 수 있는가 | YES | YES | YES | YES | YES |
| 5 taxonomy 없이 뜻이 서는가 | YES | PARTIAL | **NO** (BIZ 밖) | PARTIAL | YES |
| 6 같은 모양이 3번 이상 | **YES** | NO | NO | NO | NO |
| 7 모두 네모박스 안인가 | **YES** | NO | NO | NO | **YES** |
| 8 회색 설명문이 행동보다 먼저인가 | NO | **YES** | NO | **YES** | NO |
| 9 모바일이 축소판인가 | NO | NO | NO | NO | PARTIAL |
| 10 상용 서비스로 보이는가 | PARTIAL | YES | YES | YES | NO |
| 11 레퍼런스와 같은 family 인가 | PARTIAL | YES | YES | YES | NO |
| 12 AI 취업 리포트처럼 보이는가 | NO | NO | NO | NO | NO |

12번이 다섯 화면 모두 NO 다. 그 한 줄만으로 통과를 적지 않는다.

---

## F. DESIGN SYSTEM 승격 후보와 보류

승격 후보 (여섯 Core 에서 그대로 섰다)

- Current State section hierarchy (절 머리 · 아래 한 줄 · 카드 셋)
- card geometry (344 × 124 · 배지 78 · 배지 둥글기 0.36 · 꺾쇠 10 × 18.5)
- filled icon badge 의 면과 짙기
- spacing rhythm 과 typography level
- one-primary-action (Hero 안의 채운 단추 하나)
- mobile vertical card pattern (여섯 다 한 줄 제목 · 한 줄 세부)
- desktop 3-column summary

아직 공통화하지 않는다

- Current State 의 **세부 한 줄**. 열아홉 Core 가 taxonomy 토막을 쓰고 있다
- 타일의 **표시 고르기**. 자리로 정해진다
- Experience Add 의 폼 묶음. label/value 구조가 그대로다
- Assessment 의 다섯 칸 보기 되풀이

---

## G. 아직 아닌 것

PASS 를 적지 않는다. 네트워크 정책이 `app.careermatri.com:443` 을 막아
운영 배포본을 밖에서 열지 못했고 **학생 공개 상태를 한 칸도 바꾸지
않았다**. 20 Core 와 115 자리로 넓히지 않았다. 레퍼런스에 짝이 없는 화면
둘(Assessment · Experience Add)은 규격 §2 와 §10 으로만 판정했고 이미지
대조를 하지 않았다.
