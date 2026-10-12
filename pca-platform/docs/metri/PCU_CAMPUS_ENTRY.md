# 배재대학교 학생용 진입 경로 (`/campus/pcu`)

이 자리가 만드는 것은 **전용 검사가 아니다.** 학교 학과 이름에서
CareerMatri 의 Major Core 로 가는 **길** 하나이고, 그 뒤는 전부 공통이다.

```
배재대 전용 진입 → 배재대 실제 학과 선택 → CareerMatri Canonical Major Core
→ 기존 공통 Assessment → 기존 Result → 기존 Experience / Current State
```

측정은 `ME_V3_MEASUREMENT_FREEZE_1` 에 그대로 머문다: 채점 · Item Bank ·
ResultModel · Evidence 판정 · 현재 상태 계산 · 가격 · 이용권을 한 줄도
건드리지 않았고 `v3:freeze:measure` 가 **기록을 다시 적지 않은 채로**
통과한다.

---

## A. 먼저 적어 두는 것: 공식 쪽을 읽지 못했다

지정해 주신 출처는 `https://www.pcu.ac.kr/kor/contents/105` 의 2027 구조다.
**이 작업 환경의 네트워크 정책이 그 호스트를 막는다**: `curl` 과 WebFetch
둘 다 `www.pcu.ac.kr:443` 에서 거절됐다(게이트웨이가 CONNECT 에 403).
사이트가 죽은 것은 아니다. 이 컨테이너가 나가지 못하는 것이다.

그래서 **학과를 기억으로 지어내지 않았다.** 등록부에 실은 것은 지시문에
적어 주신 2027 구조를 그대로 옮긴 것이고, 학교마다
`source_url · source_year · verified_at · verification` 를 적어 둔다.
지금 `verified_at` 은 비어 있고 `verification` 은 `OFFICIAL_PAGE_UNREACHABLE`
이다. **확인하지 못한 것을 확인했다고 적지 않는다.**

### 확인이 필요한 어긋남 하나

검색으로 닿은 배재대 쪽들에서는 2027 모집단위가 이렇게 보인다.

| | 지시문 | 검색으로 보이는 2027 |
|---|---|---|
| 소프트웨어 쪽 | 소프트웨어공학부 (컴퓨터공학 · 소프트웨어학 · 정보보안학 · 게임공학) | **AI소프트웨어공학부** (앞의 넷 + **인공지능**) |
| 하드웨어 쪽 | 전기전자공학과 · 스마트배터리학과 · 드론로봇공학과 · 철도건설공학과 | **피지컬AI공학부** (드론로봇공학 · **AI융합전자**) |

어느 쪽이 2027 확정인지 이 환경에서는 가릴 수 없다. **검색 결과를
등록부에 올리지 않았다**: 검색 요약은 공식 쪽이 아니고, 그것을 정본으로
올리면 그 줄이 어디서 왔는지 다음 사람이 알 수 없다. 등록부의
`open_questions` 에 이 어긋남을 적어 두었다.

### 그 밖에 비워 둔 것

- 문화예술대학은 지시문의 `최소` 목록까지만 섰다. 공식 쪽의 `전체 구조` 는
  읽지 못했다
- 아펜젤러공유대학의 평생교육융합학부와 글로벌자율융합학부는 **전공 목록을
  확인하지 못해** 학부만 섰다
- `교직과` 가 학생이 고르는 전공인지 지원 조직인지 확인하지 못해 **고르는
  자리에서 뺐다.** 전공이면 인문사회대학에 한 줄 더한다
- 글로벌자율융합학부는 일반 학부생용 검사 대상인지 확인 전이라
  `student_visible: false` 로 두어 학생 화면에서 뺐다. **등록부에서 지우지
  않는다**: 지우면 다음 사람이 빠뜨린 줄로 보고 다시 넣는다

---

## B. 공식 2027 Registry

단과대학 **6** · 학부와 학과 **38** · 전공과 트랙 **19** · 고르는 자리 **47**.

고르는 자리는 학과이거나, 학부 아래의 전공이나 트랙이다. **학부를 고르게
두지 않는다**: 학부를 고르면 그 학생이 어느 전공으로 재어졌는지 아무도
모른다.

### 인문사회대학 · 고르는 자리 8개

| 자리 | Core | 갈래 | 매핑 |
|---|---|---|---|
| 국어국문한국어교육학과 | `LANG_CORE_V1` | — | EXACT |
| 일본학과 | `LANG_CORE_V1` | — | SPECIALIZATION_REQUIRED |
| 경찰법학부 · 경찰학전공 | — | — | CORE_REQUIRED |
| 경찰법학부 · 법학전공 | — | — | CORE_REQUIRED |
| 행정학과 · 일반행정트랙 | `PUBADM_CORE_V1` | — | EXACT |
| 행정학과 · 소방행정트랙 | `PUBADM_CORE_V1` | — | SPECIALIZATION_REQUIRED |
| 심리상담학과 | `PSY_CORE_V1` | — | EXACT |
| 유아교육과 | `EDU_CORE_V1` | — | SPECIALIZATION_REQUIRED |

### 경영대학 · 고르는 자리 6개

| 자리 | Core | 갈래 | 매핑 |
|---|---|---|---|
| 경영학과 | `BIZ_CORE_V1` | — | EXACT |
| IT경영정보학과 | `BIZ_CORE_V1` | — | EXACT |
| 글로벌비즈니스학과 | `BIZ_CORE_V1` | — | EXACT |
| 관광경영학과 | — | — | CORE_REQUIRED |
| 호텔항공경영학과 | — | — | CORE_REQUIRED |
| 항공서비스학과 | — | — | CORE_REQUIRED |

### 생명보건대학 · 고르는 자리 7개

| 자리 | Core | 갈래 | 매핑 |
|---|---|---|---|
| 생명공학과 | `BT_CORE_V1` | — | EXACT |
| 식품영양학과 | `FOOD_CORE_V1` | — | EXACT |
| 외식조리학과 | `FOOD_CORE_V1` | — | SPECIALIZATION_REQUIRED |
| 원예산림학과 | — | — | CORE_REQUIRED |
| 보건의료복지학과 | — | — | CORE_REQUIRED |
| 간호학과 | — | — | CORE_REQUIRED |
| 운동재활복지학과 | — | — | CORE_REQUIRED |

### AI·SW창의융합대학 · 고르는 자리 8개

| 자리 | Core | 갈래 | 매핑 |
|---|---|---|---|
| 전기전자공학과 | `EE_CORE_V1` | — | EXACT |
| 스마트배터리학과 | — | — | CORE_REQUIRED |
| 드론로봇공학과 | `ROBOT_CORE_V1` | — | SPECIALIZATION_REQUIRED |
| 철도건설공학과 | `CIV_CORE_V1` | — | SPECIALIZATION_REQUIRED |
| 소프트웨어공학부 · 컴퓨터공학전공 | `CS_CORE_V1` | `SPEC_CS_COMPUTER` | SPECIALIZATION_REQUIRED |
| 소프트웨어공학부 · 소프트웨어학전공 | `CS_CORE_V1` | `SPEC_CS_SOFTWARE` | SPECIALIZATION_REQUIRED |
| 소프트웨어공학부 · 정보보안학전공 | `CS_CORE_V1` | `SPEC_CS_SECURITY` | SPECIALIZATION_REQUIRED |
| 소프트웨어공학부 · 게임공학전공 | `CS_CORE_V1` | `SPEC_CS_GAME` | SPECIALIZATION_REQUIRED |

### 문화예술대학 · 고르는 자리 15개

| 자리 | Core | 갈래 | 매핑 |
|---|---|---|---|
| 건축학과 | `ARCH_CORE_V1` | — | EXACT |
| 실내건축학과 | `ARCH_CORE_V1` | — | SPECIALIZATION_REQUIRED |
| 조경학과 | — | — | CORE_REQUIRED |
| 아트앤웹툰학부 · 아트앤웹툰전공 | — | — | CORE_REQUIRED |
| 아트앤웹툰학부 · 게임애니메이션전공 | — | — | CORE_REQUIRED |
| 디자인학부 · 커뮤니케이션디자인전공 | — | — | CORE_REQUIRED |
| 디자인학부 · 산업디자인전공 | — | — | CORE_REQUIRED |
| 광고사진영상학과 | `MEDIA_CORE_V1` | — | EXACT |
| 미디어콘텐츠학과 | `MEDIA_CORE_V1` | — | EXACT |
| 의류패션학과 | — | — | CORE_REQUIRED |
| 뷰티케어학과 | — | — | CORE_REQUIRED |
| 공연예술학과 · 음악트랙 | — | — | CORE_REQUIRED |
| 공연예술학과 · 영화영상트랙 | — | — | CORE_REQUIRED |
| 레저스포츠학부 · 스포츠지도·건강재활전공 | — | — | CORE_REQUIRED |
| 레저스포츠학부 · 스포츠마케팅전공 | — | — | CORE_REQUIRED |

### 아펜젤러공유대학 · 고르는 자리 3개

| 자리 | 처리 | 매핑 |
|---|---|---|
| 자율전공학부 | `routing_only` — Core 를 만들지 않고 전공 목록으로 돌려보낸다 | CORE_REQUIRED |
| 평생교육융합학부 | 전공 목록 확인 전 | CORE_REQUIRED |
| 글로벌자율융합학부 | 전공 목록 확인 전 · 학생 화면에서 뺌 | CORE_REQUIRED |

---

## C. Registry 와 Core 를 가른다

**학교 학과 수만큼 Core 를 만들지 않는다.** 학교 이름은 등록부에 있고,
전공을 재는 자는 `major-cores.json` 에 있다. 학교가 학과를 쪼개거나 합쳐도
자는 그대로여야, 그 학교 학생과 다른 학교 학생의 결과를 견줄 수 있다.

고르는 자리 47개가 가리키는 Canonical Core 는 **열한 가지**뿐이다.

**학교마다 달라지는 것**은 등록부에 담는다: 학교 이름 · 단과대학 · 학부와
학과 · 전공과 트랙 · 그 자리가 가는 Core · 그 학교가 먼저 보는 지역.
**달라지지 않는 것**은 Core 가 들고 있다: 채점 · 축 · 묶음 · 문항 은행 ·
결과 모델.

---

## D. 갈래는 조정하는 층이고 엔진이 아니다

CS Core 아래 갈래를 넷으로 적었다: `SPEC_CS_COMPUTER` ·
`SPEC_CS_SOFTWARE` · `SPEC_CS_SECURITY` · `SPEC_CS_GAME`(+ 기존
`SPEC_CS_AI`). 옛 이름 `SPEC_CS_SW` 와 `SPEC_CS_SYS` 는 그 자리로 고쳐
적었다: 학교 학과 이름이 `소프트웨어학전공` 과 `정보보안학전공` 으로 갈려
있는데 갈래 이름이 `소프트웨어 공학` 과 `시스템·보안` 이면 **같은 것을 두
이름으로 부르게 된다.** 가리키던 자리는 없었다.

등록부에 `specialization_contract` 를 적었다. 갈래가 조정하는 것은 다섯
층뿐이다: 영역 무게 · 산업 · 역할 · 보기 · 근거와 할 일. 건드리지 않는
것은 채점 · 축 수준 · 묶음 규칙 · 문항 은행 · 결과 모델이다. **문서에
적어 두는 것으로는 지켜지지 않으므로** `campus:check` 가 채점과 결과 모듈
여덟 벌에서 갈래 코드 열한 개를 센다.

**이름만 적어 둔 갈래는 아직 쓰이지 않는다.** 다섯 층이 비어 있으면
`authored` 가 서지 않고, 그 갈래를 가리키는 학과는 `갈래 작성 필요` 로
선다. 그래서 CS 네 전공은 코드가 생겼어도 아직 `SPECIALIZATION_REQUIRED`
다. **갈래를 켜는 일은 다섯 층을 적는 일이고 코드를 고치는 일이 아니다.**

---

## E. 매핑 단계 셋과 학생 표시 둘

| 안쪽 단계 | 뜻 | 수 |
|---|---|---|
| `EXACT` | 그 자리를 맡는 Core 가 있고 갈래가 더 필요 없다 | **12** |
| `SPECIALIZATION_REQUIRED` | Core 는 있는데 그 학과가 읽을 갈래가 아직 없다 | **11** |
| `CORE_REQUIRED` | 그 자리를 맡는 Core 가 아직 없다 | **24** |

**이 값도 적어 두지 않고 끌어온다.** `core_code` 와 `specialization` 과
`specialization_required` 셋에서 나온다. 적어 두면 갈래를 쓴 날 등록부를
같이 고쳐야 하고, 안 고치면 **작성된 갈래를 가리키며 아직 필요하다고
적는다.**

학생에게 보이는 것은 `검사 가능` 과 `준비 중` 둘뿐이고, 안쪽 단계는 화면
파일에 0건이다. **`EXACT` 라고 바로 열리지 않는다**: 그 Core 가 이
시장에서 지금 응시할 수 있어야 한다. 매핑이 섰다는 것과 문항이 써졌다는
것은 다른 일이고, 앞엣것만 보고 열면 그 학생이 빈 검사를 만난다.

지금 **검사 가능 0개**다. 억지로 하나를 열지 않았다.

---

## F. Wave 1

차례가 곧 만드는 차례다(등록부의 `wave1`).

| # | 자리 | Core | 지금 막는 것 |
|---|---|---|---|
| 1 | 전기전자공학과 | `EE_CORE_V1` | Core 콘텐츠(영역 사전 · 문항 은행) |
| 2 | 소프트웨어공학부 · 컴퓨터공학전공 | `CS_CORE_V1` + `SPEC_CS_COMPUTER` | Core 콘텐츠 · 갈래 다섯 층 |
| 3 | 소프트웨어공학부 · 소프트웨어학전공 | `CS_CORE_V1` + `SPEC_CS_SOFTWARE` | 같음 |
| 4 | 경영학과 | `BIZ_CORE_V1` | Core 콘텐츠 |
| 5 | 행정학과 · 일반행정트랙 | `PUBADM_CORE_V1` | Core 콘텐츠 |
| 6 | 생명공학과 | `BT_CORE_V1` | Core 콘텐츠 |

**기계공학을 PCU 화면에 억지로 세우지 않았다.** 지금 열려 있는 Core 가
그것 하나지만 배재대에 그 학과가 없으므로 등록부에 넣지 않았다.

---

## G. 서버가 자리를 맞춰 본다

주소나 쿠키를 고쳐 남의 학과 맥락을 자기 응시에 적을 수 없다.

- 폼이 보내는 칸이 **둘뿐이다**(`u` · `d`). Core 도 단과대학도 보내지
  않는다
- 쿠키가 담는 것도 그 둘뿐이고, 읽을 때 등록부로 **다시** 맞춰 본다
  (`findLeaf` → `statusOf` → `contextOf`)
- `openAttempt()` 가 한 번 더 본다: 그 시장에서 지금 응시할 수 있는 Core
  가 아니면 **맥락을 통째로 버린다**

말로 적어 두지 않고 찍는다. `campus:walk` 가 고친 쿠키 셋을 그 자리에서
넣어 보고(준비 중인 학과 · 다른 학교의 자리 · 뒤바꾼 짝) 적힌 줄이
비어 있는지 본다.

---

## H. 집계는 학부까지 굴러간다

`campusV3` 가 받는 것이 기관 목록 하나에서 둘이다: 담당자가 맡은 기관과
그 기관이 등록부의 어느 학교인가(`organizations.code`). 하나만 보면
담당자 화면에 학생이 반만 잡히고, **그 반이 비어 있는 것을 담당자는
`아직 아무도 안 쳤다` 로 읽는다.**

`by_college` 와 `by_department` 가 서고, **학부가 있으면 함께 적는다**
(`레저스포츠학부 · 스포츠마케팅전공`). **DB 에 칸을 더하지 않았다**: 적힌
줄은 고르는 자리의 코드이고 그 위의 학부는 등록부가 언제든 다시 읽는다
(`facultyOf`). 칸을 하나 더 두면 학교가 학부를 바꾸는 날 이미 적힌 줄이
틀려진다.

5명 미만은 가려지는 것이 아니라 **값이 만들어지지 않는다.** 두 칸도 기존
`cell()` 을 그대로 지난다.

---

## I. 검사 셋

```bash
npm run campus:check   # 등록부와 경계 34가지 (DB 없이)
npm run campus:shots   # 실제 브라우저로 밟고 찍는다 31가지
npm run campus:walk    # 검사 가능한 자리의 길 13가지 + 집계 6가지
```

`campus:check` 가 보는 여섯 묶음: 등록부가 성립하는가 · 어느 쪽의 어느
해인가 · 매핑이 실제로 닿는가 · 상태가 둘뿐인가 · 학과 이름이 코드에
없는가 · 경계가 지켜지는가.

**문구는 여기서 세지 않는다**: AI 티와 금지한 말은 `npm run v3:copy` 가
세고 그 목록에 학교 쪽 네 파일이 들어 있다.

---

## J. 이 회차에 돌린 것

| 검사 | 결과 |
|---|---|
| `campus:check` | 통과 34 · 걸림 0 |
| `campus:shots` | 통과 31 · 걸림 0 (Desktop 1440 · Mobile 390) |
| `campus:walk` | 통과 13 + 6 · 걸림 0 (고친 쿠키 셋 포함) |
| `v3:copy` · `copy:audit` · `claims:check` | 파일 36벌 OK · 원고 OK · 금지 주장 0곳 |
| `v3:freeze:measure` | `ME_V3_MEASUREMENT_FREEZE_1` 그대로 |
| `v3:freeze` · `v3:result:freeze` · `v3:workspace` · `v3:freeze:core` | 넷 다 그대로 |
| `v3:domains` · `v3:extend` · `v3:arch` · `v3:items` · `v3:length` | 15 · 14 · 20 · 16 · 19 |
| `routes:check` · `db:chain` | 10 · 8 |

**판본을 하나도 올리지 않았다.** 검사 화면과 결과지와 작업공간과 판단
규칙이 전부 그대로고, 다섯 동결이 **기록을 다시 적지 않은 채로** 통과한다.
바뀐 것은 등록부와 그것을 읽는 층과 학교 쪽 화면 셋뿐이다.

**DB 스키마를 한 줄도 바꾸지 않았다.** 앞 회차에 더한 칸 넷을 그대로 쓴다.

### 손전화에서 목록이 길다

고르는 자리가 47개라 390px 에서 쪽이 길다. **접지 않았다**: 첫 화면의
단과대학 칸이 `#단과대학` 으로 바로 보내므로, 자기 학과를 찾는 사람은
목록을 훑지 않고 제 단과대학으로 간다. 학과가 더 늘면 그때 접는 것을
다시 본다.
