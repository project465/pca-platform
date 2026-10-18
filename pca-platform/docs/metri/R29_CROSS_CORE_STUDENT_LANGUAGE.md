# R29 · CROSS-CORE STUDENT LANGUAGE SYSTEM

이 회차가 고친 것은 **학생이 읽는 말의 출처**다. 문항 은행 · 채점 · 소유
판정 · 묶음 규칙 · 결과 모델 · 등록부 · 학생 공개 상태 · DB 스키마를 한
줄도 건드리지 않았고, `v3:freeze:measure` 가 **기록을 다시 적지 않은
채로** 통과한다.

판정을 미리 적지 않는다. 사업주가 실제 screenshot 을 보고 승인하기
전까지는 `CROSS-CORE PRODUCT SYSTEM · HUMAN REVIEW REQUESTED` 다.

---

## A. ROOT CAUSE FIX

R28 이 적어 둔 공통 원인 넷을 구조로 닫았다. 문구를 한 자리씩 고치는
방식을 쓰지 않았다: 그렇게 하면 Core 를 하나 더 만드는 날 같은 모양이
돌아온다.

### B1 · 학생 문구 레이어가 BIZ 밖으로 나가지 않았다

읽는 쪽이 `domainSub()` 로 taxonomy 의 `subareas` 를 가운뎃점으로 이어
열한 글자에서 잘라 쓰고 있었다. 그 산식은 BIZ 에서만 읽히는 말이 나왔고
나머지 Core 에서는 분류표 토막이 그대로 섰다.

고친 자리는 하나다. `src/lib/me-v3/student/copy.ts` 가 사전이고
`tile-sub.ts` 는 그 사전을 부르는 세 줄짜리 전달자가 됐다. 사전은
**손으로 썼다**: 여섯 Core × 열한둘 영역 = 71 줄이고 생성 규칙이 없다.

**내부와 학생 표시를 가른다.** 사전이 들고 있는 것은 학생 표시 셋
(`activity` · `evidence` · `family`)뿐이고, 도메인 id 와 taxonomy 와
scoring 과 증거 분류는 사전을 읽지 않는다.

**되돌아갈 자리를 숨기지 않는다.** 사전이 없는 Core 는 옛 산식으로
떨어지고, 그 자리를 `v3:student` 1번이 Core 마다 센다.

### B2 · 표시를 자리 번호가 골랐다

`TILE_IC[i % 3]` 과 `TILE_ICON` 이 **첫 카드니까 wave** 를 하고 있었다.
뜻 갈래 열둘(`plan` · `compare` · `structure` · `data` · `people` ·
`rule` · `verify` · `build` · `talk` · `cost` · `site` · `decide`)을 두고
영역마다 사람이 붙였다. 갈래 하나가 두 벌을 든다: 결과지 배지가 드는 채운
글리프와 작업공간 타일이 드는 선 글리프.

**짐작으로 갈래를 붙이지 않는다.** 사전이 없는 Core 는 코드 번호로
갈래를 만들지 않고 중립 글리프 하나를 든다.

### B3 · 화면마다 새 문장을 지었다

한 객체가 `영역 → 학생 활동 → 결과물` 을 공급한다. 결과지는 `activity`
를, 작업공간 타일은 `evidence` 를 읽고 **그 자리에서 새 문장을 만들지
않는다**. `v3:student` 10번이 두 화면이 같은 사전을 읽는지 센다.

### B4 · 경험 추가의 예시가 기계공학 한 벌이었다

`예: 전동 스쿠터 프레임 경량화 캡스톤` 이 공통 화면에 글자로 박혀 있었다.
경영학과 학생이 기계공학 예시를 읽는 자리이고, 운영 Canary 에서 나온
`기계공학자` 와 같은 모양이다. 지금은 Core 마다 다르고 되돌아갈 자리는
전공을 가리키지 않는다. **현업 경력을 전제하지 않는다**: 여섯 줄 전부
수업과 실습과 팀 과제에서 나올 수 있는 것이다.

---

## B. STUDENT LANGUAGE TABLE

표를 손으로 적지 않는다(`npx tsx scripts/lab/r29-table.ts`). 문면을 고친
날 문서가 조용히 옛 글을 들고 있는 것을 막는다.

| Core | Internal taxonomy | Student activity | Evidence | 표시 갈래 |
|---|---|---|---|---|
| BIZ | 경영전략·기획 | 목표와 성과 기준 정하기 | 사업계획서 | 계획·우선순위 |
| BIZ | 마케팅·시장 | 고객을 나누고 반응 비교하기 | 캠페인 기획서 | 비교·분석 |
| BIZ | 회계·원가 | 쓴 돈을 증빙과 맞춰 보기 | 결산 대조표 | 데이터·기록 |
| NURSING | 간호 사정·간호진단 | 환자 상태를 살펴보고 판단하기 | 사정 기록 | 사람·사용자 |
| NURSING | 간호 계획·우선순위 | 해야 할 간호의 순서 정하기 | 간호계획 | 계획·우선순위 |
| NURSING | 투약·주사 관리 | 약을 주기 전후로 확인하기 | 투약 기록 | 실험·검증 |
| PUBADM | 정책·사업 기획 | 어떤 사업을 할지 고르기 | 추진계획서 | 계획·우선순위 |
| PUBADM | 법령·규정 해석 | 근거 조문을 찾아 판단하기 | 검토 의견서 | 문서·규정 |
| PUBADM | 예산 편성·집행 | 필요한 돈을 셈해 나누기 | 예산안 | 자원·비용 |
| CS | 소프트웨어 설계·구조 | 요구를 나누고 구조 잡기 | 모듈 구조도 | 구조·설계 |
| CS | 자료구조·알고리즘 | 자료 담을 모양 고르기 | 구현 코드 | 데이터·기록 |
| CS | 서버·API 구현 | 요청 받아 처리하는 길 만들기 | 응답 규약 | 시스템·구현 |
| EE | 아날로그 회로 설계 | 원하는 신호 나오게 회로 짜기 | 회로도 | 구조·설계 |
| EE | 디지털·논리 설계 | 논리 동작을 맞춰 기능 만들기 | 논리 기술 코드 | 시스템·구현 |
| EE | 임베디드·펌웨어 | 코드로 장치를 움직이기 | 펌웨어 소스 | 현장·운영 |
| MEDIA | 기획·과제 정의 | 누구에게 무엇을 보일지 정하기 | 기획서 | 계획·우선순위 |
| MEDIA | 메시지·콘셉트 | 전할 말을 한 문장으로 잡기 | 메시지 한 줄 | 커뮤니케이션 |
| MEDIA | 매체·채널 설계 | 어디에 얼마나 낼지 고르기 | 매체 집행 계획 | 구조·설계 |

Action 줄은 이 표에 없다. 까닭은 H 절에 적는다.

### 금지 패턴이 0 인가

`npm run v3:student` 가 32 가지를 세고 걸림이 0 이다.

| 규칙 | 재는 것 | 결과 |
|---|---|---|
| 금지 1 | 활동 줄에 가운뎃점이 없다 | 0 / 71 |
| 금지 2 | 활동이 움직씨로 끝나고 띄어쓰기가 있다 | 71 / 71 |
| 금지 3 | 내부 추상어가 없다 | 0 / 71 |
| 금지 4 | 한 Core 의 열둘이 한 끝맺음으로 몰리지 않는다 | 통과 |
| 길이 | 활동 16자 · 결과물 8자 안 | 통과 |
| 겹침 | Core 를 건너 같은 줄이 없다 | 0 쌍 |

**되돌려 확인했다.** NURSING TD01 을 옛 줄로 되돌리면 금지 1·2 와 길이
규칙 셋이 걸리고, PUBADM TD01 을 BIZ 와 같은 줄로 두면 겹침 규칙이
걸린다. 그 뒤에 되돌렸다.

---

## C. ICON SEMANTICS

갈래가 열둘이고 자리는 보지 않는다. 같은 뜻이면 Core 를 건너 같은 갈래를
쓴다: BIZ 의 `경영전략·기획` 과 PUBADM 의 `정책·사업 기획` 과 NURSING 의
`간호 계획·우선순위` 가 전부 `계획·우선순위` 다.

| 갈래 | 뜻 | 채운 글리프 | 선 글리프 |
|---|---|---|---|
| plan | 계획·우선순위 | goal | target |
| compare | 비교·분석 | bars | chart |
| structure | 구조·설계 | cube | layers |
| data | 데이터·기록 | table | grid |
| people | 사람·사용자 | person | users |
| rule | 문서·규정 | note | doc |
| verify | 실험·검증 | flask | clipboard |
| build | 시스템·구현 | chip | gear |
| talk | 커뮤니케이션 | bubble | send |
| cost | 자원·비용 | coins | cart |
| site | 현장·운영 | pin | building |
| decide | 의사결정 | verdict | check |

`v3:student` 8번이 셋을 센다: 갈래가 여덟에서 열둘 사이인가 · 갈래마다 두
글리프가 다 있는가 · 채운 글리프가 서로 겹치지 않는가. 그리고 두 화면의
소스에 `TILE_IC` 와 `TILE_ICON` 이 남아 있지 않은지 본다.

---

## D. BEFORE / AFTER

여섯 Core 의 첫 카드 거드는 줄이다. BEFORE 는 `subareas` 를 이어 열한
글자에서 자른 값이고, 사업주가 §3 에 BAD 로 적어 둔 줄이 그대로 거기서
나온다.

| Core | BEFORE | AFTER |
|---|---|---|
| BIZ | `목표와 지표 세우기·…` | 목표와 성과 기준 정하기 |
| NURSING | `볼 항목·지금 상태·…` | 환자 상태를 살펴보고 판단하기 |
| PUBADM | `목표와 성과지표 세우…` | 어떤 사업을 할지 고르기 |
| CS | `요구 정리·모듈 분해…` | 요구를 나누고 구조 잡기 |
| EE | `증폭 회로·필터 회로…` | 원하는 신호 나오게 회로 짜기 |
| MEDIA | `알릴 것·받는 사람·…` | 누구에게 무엇을 보일지 정하기 |

BAD 로 적어 둔 나머지도 전부 BEFORE 쪽에 있었다: `확인할 것·줄 방법`
(NURSING TD03) · `쓸 매체·낼 양과 때`(MEDIA TD03) · `소요 추계`
(PUBADM TD03).

표시 쪽 BEFORE 는 자리 번호다. 여섯 Core 의 첫 카드가 전부 같은 글리프를
들었고, 지금은 뜻이 고른다: BIZ `target` · NURSING `person` ·
PUBADM `target` · CS `cube` · EE `cube` · MEDIA `target`.

---

## E. SCREEN REVIEW

### E-1 Result Current State (여섯 Core · Desktop · Mobile)

| 축 | 판정 |
|---|---|
| 성격 | PRODUCT-LIKE |
| 글 | HUMAN COPY |
| 레퍼런스 | MATCH |
| 이번 회차 | PASS 후보 |

여섯 카드가 전부 학생의 움직씨 구를 들고, 표시가 뜻으로 갈리고, 거드는
줄이 두 줄을 넘지 않는다. 절 머리의 한 줄도 `지금 설명할 수 있는 일
3가지` 로 바뀌어 §4 가 막는 `영역` 이 그 자리에서 사라졌다.

**KEEP** 카드 셋 · 채운 배지 · 절 머리 한 줄 · `전체 보기` 한 자리.
**DELETE** 없음. **MERGE** 없음. **REBUILD** 없음.

### E-2 Assessment (BIZ · NURSING · CS · Desktop · Mobile)

구조 진단만 적는다. **이번 회차에 고치지 않았다.**

| 축 | 판정 |
|---|---|
| 성격 | SURVEY-LIKE 가 남아 있다 |
| 글 | HUMAN COPY(문면은 사람 글이다) |
| 이번 회차 | FAIL |

**KEEP** 묶음 머리(`관심 1 / 3`) · 다섯 칸 보기와 척도 밖 `모르겠다` ·
자동 저장 표시 · 손전화에서 한 질문만 펴 두는 접힘 · 아래 띠의 두 단추.

**DELETE** 없음. 지울 덩이를 찾지 못했다.

**MERGE** 첫 문항 위에 머리가 넷 쌓인다(장면 한 줄 · 묶음 머리 · 큰 질문 ·
거드는 줄). 큰 질문과 거드는 줄을 한 줄로 묶는다. 손전화 머리띠에서 줄
이름이 `영…` 으로 잘리는 자리도 같이 본다.

**REBUILD** 같은 영역을 검사와 결과지가 서로 다른 말로 적는다. CS TD01 이
검사에서는 `무엇을 만들지와 모듈 경계를 정하는 일` 이고 결과지에서는
`요구를 나누고 구조 잡기` 다. B3 이 요구한 `한 객체가 공급한다` 가 검사
화면에는 닿지 않았다. **다만 그 문면은 문항 은행이 들고 있고 문항 은행은
측정 동결 안이라, 고치는 일은 승인을 받는다.**

### E-3 Experience Add (여섯 Core · Desktop · Mobile)

| 축 | 판정 |
|---|---|
| 성격 | FORM-LIKE |
| 글 | 걸음 이름이 AI-LIKE |
| 이번 회차 | FAIL |

**KEEP** 세 걸음 · 종류 칩 아홉 · `무엇을 했는지 한 줄로` ·
[연도][월] 고르기 · `이걸 적으면 무엇이 달라지나요` 펼침 · 짙은 단추 하나.
그리고 이번 회차가 넣은 Core 별 예시 한 줄.

**DELETE** 없음.

**MERGE** 걸음 이름 셋이 화면 안에서 다시 설명되지 않는다. 걸음 설명 한
줄로 묶는다.

**REBUILD** 걸음 이름이 우리 쪽 분류어다. `2 기술 판단` 은 학생이 쓰지
않는 말이고 `3 남은 것` 은 §4 가 막는 `남긴 것` 과 한 글자 차이다. 학생의
말로 다시 세운다.

### E-4 Workspace `/me`

| 축 | 판정 |
|---|---|
| 성격 | PRODUCT-LIKE |
| 글 | HUMAN COPY |
| 이번 회차 | PASS 후보 |

타일의 거드는 줄이 사전의 결과물 이름을 들어 한 줄에 들어가고, 선 글리프가
뜻으로 갈린다. 절 머리의 한 줄에서도 `영역` 이 사라졌다.

### E-5 Result Summary 전체

이번 회차의 범위 밖이다. REPORT-LIKE 가 남아 있고 판정을 적지 않는다.

---

## F. SCREENSHOT

여섯 Core × 16 자리 = 96 장이다. 자리 목록을 주소로 열지 않고 학과에서
계정을 발급해 학교 길로 들어가 끝까지 눌러 찍었고, 남은 문항은 사람 C 의
규칙으로 채웠다.

```
docs/metri/shots/review-loop/r29/{BIZ,NURSING,PUBADM,CS,EE,MEDIA}/
  a0-intro-d  a1-sweep-d  a2-judge-d  a2-judge-m      검사
  b1-summary-{d,m}  b2-open-{d,m}                     결과 첫 화면
  c-state-{d,m}  c-card-{d,m}                         현재 상태와 카드 확대
  d1-me-{d,m}                                          작업공간
  e1-exp-{d,m}                                         경험 추가

docs/metri/shots/review-loop/r29/sixup-state-d.png     여섯 Core 절 전체 (1440)
docs/metri/shots/review-loop/r29/sixup-state-m.png     여섯 Core 절 전체 (390)
docs/metri/shots/review-loop/r29/sixup-card-d.png      여섯 Core 카드 확대
```

```bash
V3_PREVIEW_OPEN='*' bash scripts/stage-serve.sh 3100
CORE=BIZ_CORE_V1 LEAF=PCU26_BIZ TAG=BIZ FULL=1 \
  OUT=docs/metri/shots/review-loop/r29/BIZ \
  UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
  npx tsx scripts/lab/r28-shots.ts
SIXUP_ROOT=docs/metri/shots/review-loop/r29 \
  python3 scripts/lab/r28_sixup.py c-state-d 2 \
  docs/metri/shots/review-loop/r29/sixup-state-d.png
```

---

## G. 측정 변경 0

| 재는 것 | 결과 |
|---|---|
| `v3:freeze:measure` | 기록을 다시 적지 않은 채로 통과 |
| 문항 은행 지문(`bank-lock.json`) | diff 0 줄 |
| `sites/pca-platform/content/*.json` | diff 0 줄 |
| `src/lib/me-v3/scoring/` | diff 0 줄 |
| `result/model.ts` · `result/build.ts` | diff 0 줄 |
| 등록부 두 벌 | diff 0 줄 |
| `open_to_students` | 바꾼 칸 0 |
| DB 스키마 | diff 0 줄 |

동결 다섯이 전부 통과한다: `v3:freeze:measure` · `v3:freeze` ·
`v3:result:freeze` · `v3:workspace` · `v3:freeze:core`. 뒤의 셋은 판본을
올리고 지문을 다시 적었다(`ME_V3_RESULT_UI_V72` ·
`me-v3-result-copy.61` · `CAREERMATRI_WORKSPACE_UI_V43` ·
`careermatri-workspace-copy.27`).

**사전 파일 셋을 두 동결 목록에 같이 적었다.** `student/copy.ts` 와
`icon.ts` 와 `index.ts` 는 결과지와 작업공간이 함께 읽으므로, 한 목록에만
두면 그 파일을 고친 날 다른 동결이 모르는 채로 통과한다.

회귀: `v3:student` 32 · `v3:result` 25 · `v3:result:copy` 16 ·
`v3:majors` 통과 · `copy:audit` 46 개로 기준선 그대로.

---

## H. 아직 남은 문제

스스로 적는 FAIL 이다.

**1. Action 층을 사전에 넣지 않았다.** §6 은 `DOMAIN → STUDENT ACTIVITY →
EVIDENCE → ACTION` 을 한 객체가 공급하라고 적었는데, 이 회차의 사전은 앞의
셋까지다. 할 일 문장은 그대로 `actionKo` 와 `actionHeadKo` 가 만든다.
넣지 않은 까닭은 그 칸을 읽을 코드가 지금 없어서다: 이 저장소는 받고 쓰지
않는 자리를 여러 번 찾아냈고, 읽지 않는 칸을 먼저 만들면 그것이 한 번 더
생긴다. 읽는 쪽을 함께 바꾸는 일이라 승인을 받는다.

**2. `영역` 이 학생 화면에 95 자리 남아 있다.** 이번에 고친 것은 사전이
고친 카드 바로 위의 두 줄뿐이다. 주석을 걷어 내고 센 수이고 자리는
이렇다: 결과지 쪽 42 · 영역 사전 번역표 18 · 채점 번역표 11 ·
`/me/state` 10 · `/me/next` 10 · `/me` 4. 한 번에 쓸어 내지 않은 까닭은
그 말이 서는 자리가 묶음 이름과 절 이름과 판정 까닭이라, 고치면 결과
문장의 판정 줄이 같이 움직이기 때문이다. 다음 회차의 몫으로 적어 둔다.

```bash
# 세는 법
python3 - <<'PY'
import re, pathlib
for r in ["src/lib/me-v3/result/text.ko.ts",
          "src/app/v3/[attemptId]/result/page.tsx",
          "src/app/me/page.tsx", "src/app/me/state/page.tsx",
          "src/app/me/next/page.tsx", "src/lib/me-v3/scoring/text.ko.ts"]:
    s = pathlib.Path(r).read_text(encoding="utf-8")
    s = re.sub(r"/\*[\s\S]*?\*/", "", s); s = re.sub(r"//[^\n]*", "", s)
    print(f"{s.count('영역'):4d}  {r}")
PY
```

**3. 영역 제목이 데스크톱 카드에서 두 줄로 접힌다.** NURSING
`간호 사정·간호진단` · CS `소프트웨어 설계·구조` · `자료구조·알고리즘` ·
EE `아날로그 회로 설계` 넷이다. 그 이름은 taxonomy 가 들고 있고 taxonomy 는
측정 동결 안이라 이번 회차에 고치지 않았다. **문구가 안 들어간다고 카드를
늘리지 않았다**: BIZ 에서 승인된 카드 높이가 그대로다.

**4. 경험 추가의 걸음 이름 둘이 우리 쪽 말이다.** `기술 판단` 과
`남은 것` 이고 E-3 에 REBUILD 로 적었다. 고치는 일이 작업공간 문구 판본을
올리는 일이라 이번 회차의 범위 밖에 두었다.

**5. 검사와 결과지가 같은 영역을 다른 말로 적는다.** E-2 의 REBUILD 와
같은 자리다. 고칠 데가 문항 은행이라 측정 동결 안이다.

**6. 열아홉 Core 가운데 열셋은 아직 사전이 없다.** 사전이 없는 Core 는 옛
산식으로 떨어지고 중립 글리프를 든다. 그 자리가 어디인지는 `v3:student`
1번이 Core 마다 적는다. **20 Core 와 115 학과로 넓히지 않았다.**

**7. 운영을 열지 못했다.** 네트워크 정책이 `app.careermatri.com:443` 을
막아 배포본을 밖에서 한 번도 열지 못했다. `PRODUCTION UNVERIFIED` 와
`PCU CANARY BLOCKED` 가 그대로다.
