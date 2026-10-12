# 배재대학교 학생용 진입 경로 (`/campus/pcu`)

이 회차가 만든 것은 **전용 검사가 아니다.** 학교 학과 이름에서
CareerMatri 의 Major Core 로 가는 **길** 하나이고, 그 뒤는 전부 공통이다.

```
배재대 전용 진입 → 배재대 실제 학과 선택 → CareerMatri Canonical Major Core
→ 기존 공통 Assessment → 기존 Result → 기존 Experience / Current State
```

측정은 `ME_V3_MEASUREMENT_FREEZE_1` 에 그대로 머문다: 채점 · Item Bank ·
ResultModel · Evidence 판정 · 현재 상태 계산 · Industry/Role 관계 자료 ·
가격 · 이용권을 한 줄도 건드리지 않았고 `v3:freeze:measure` 가 **기록을
다시 적지 않은 채로** 통과한다.

---

## A. 먼저 적어 두는 것: 공식 학과 구조를 확인하지 못했다

배재대학교 공식 학과 구조를 이 환경에서 확인하지 못했다
(`www.pcu.ac.kr` 이 연결되지 않고 검색으로도 공식 목록이 나오지 않았다).
그래서 **학과를 기억으로 지어내지 않았다.** 등록부에 실은 것은 지시문에
적힌 학과 열 개뿐이고, 그 사실과 출처를 등록부와 첫 화면에 함께 적는다.

같은 까닭으로 **배재대학교 로고를 그려 넣지 않았다**(규격 §4). 저장소에
정식 asset 이 없고, 학교 상표를 우리가 다시 그리면 그 학교가 승인한 적
없는 상표가 학생 화면에 선다. 서는 것은 공식 CareerMatri 상표 하나와
학교 이름 글자다: `CareerMatri + 배재대학교` 로 충분하다.

---

## B. 지시문의 줄임말과 저장소의 정식 코드

지시문 §7 이 적어 준 Core 이름은 줄임말이고, 등록부(`major-cores.json`)의
정식 코드는 다르다. **줄임말을 등록부에 적으면 그 학과가 빈 검사를
연다**(코드가 가리키는 Core 가 없다). 그래서 정식 코드로 적고 그 차이를
여기에 남긴다.

| 학과 | 지시문 | 등록부 정식 코드 | 갈래 |
|---|---|---|---|
| 전기전자공학과 | `EE_CORE` | `EE_CORE_V1` | — |
| 컴퓨터공학 | `CS_SOFTWARE_CORE` + `COMPUTER_ENGINEERING` | `CS_CORE_V1` | 없음 |
| 소프트웨어학 | `CS_SOFTWARE_CORE` + `SOFTWARE` | `CS_CORE_V1` | `SPEC_CS_SW` 소프트웨어 공학 |
| 정보보안학 | `CS_SOFTWARE_CORE` + `SECURITY` | `CS_CORE_V1` | `SPEC_CS_SYS` 시스템·보안 |
| 게임공학 | `CS_SOFTWARE_CORE` + `GAME_ENGINEERING` | `CS_CORE_V1` | 없음 |
| 경영학과 | `BUSINESS_CORE` | `BIZ_CORE_V1` | — |
| 행정학과 | `PUBLIC_POLICY_ADMIN_CORE` | `PUBADM_CORE_V1` | — |

**`COMPUTER_ENGINEERING` 과 `GAME_ENGINEERING` 에 해당하는 갈래가 Core
등록부에 없다.** 갈래를 지금 만들지 않았다: 갈래를 묶는 기준은 이름이
비슷한가가 아니라 **같은 영역 사전을 읽는가**이고(등록부의 `alias_rule`),
그 판단은 그 전공을 아는 분이 해야 한다. 두 학과는 Core 전체로 보내고
갈래를 비웠다.

### 지시문이 매핑을 적어 주지 않은 세 학과

| 학과 | 제안한 Core | 왜 |
|---|---|---|
| 스마트배터리학과 | **비움** | 전기·전자와 화학공학과 신소재가 모두 닿는 자리라 이름만 보고 고르지 않는다 |
| 드론로봇공학과 | `ROBOT_CORE_V1` | 등록부의 로봇 Core 가 맡는 자리로 제안 |
| 철도건설공학과 | `CIV_CORE_V1` | 등록부의 토목·건설환경 Core 가 맡는 자리로 제안 |

세 줄 다 `mapping_source: "proposed"` 다. **제안 매핑은 Core 가 열려도
검사가 열리지 않는다**: 매핑이 틀리면 그 학생이 남의 전공 사전을 읽고,
그 결과는 되돌릴 수 없다. 학교 확인을 받으면 `owner` 로 바꾼다.

---

## C. 등록부 하나 · 화면은 그것을 그린다

`sites/pca-platform/content/campus-universities.json` 과
`src/lib/campus/registry.ts` 다. 담는 것은 **학교마다 달라지는 것만**이다:
학교 이름 · 단과대학 · 학과 이름 · 학과에서 Core 로 가는 길 · 그 학교가
먼저 보는 지역. 검사와 채점과 결과는 담지 않는다.

```
university / college / department / major_core / specialization
```

**상태를 등록부에 적지 않는다.** 학생에게 보이는 `검사 가능` 과 `준비 중`
은 그 학과가 가리키는 Core 의 **판매 상태**에서 끌어온다. 적어 두면 Core
가 열린 날 이 파일이 옛 상태를 들고 있고, 둘이 갈리면 `검사 가능` 이라고
적힌 학과에서 빈 검사가 열린다.

**학과 이름을 route 나 component 에 적지 않는다**(규격 §7). 적어 두면 두
번째 학교를 붙이는 날 그 화면을 베끼게 되고, 베낀 화면 가운데 하나는
반드시 뒤처진다. `npm run campus:check` 가 화면 여섯 벌에서 학교·단과대학·
학과 이름과 학교 코드를 센다. 만들자마자 한 자리를 잡았다(학과 상세의
쪽 머리가 `단과대학 확인 전` 을 글자로 들고 있었다).

**PCU 전용으로 끝내지 않았다**(규격 §15). route 가
`/campus/[universityCode]` 이고 학교를 붙이는 일이 등록부에 묶음 하나를
더하는 일이다: `/campus/hanbat` · `/campus/cnu` 가 코드를 고치지 않고
선다.

---

## D. 상태는 둘뿐이다

| 보이는 것 | 언제 | 누를 수 있는가 |
|---|---|---|
| `검사 가능` | Core 가 정해져 있고 · 학교가 그 매핑을 확인했고 · 그 Core 가 이 시장에서 지금 응시할 수 있다 | 예 |
| `준비 중` | 셋 가운데 하나라도 아니다 | 아니오 |

**안쪽 성숙도를 내보내지 않는다.** `FOUNDATION` 과 `READY_FOR_REVIEW` 와
`VALIDATED` 는 Major Core 등록부가 들고 있는 QA 값이고, 그 글자가 화면
파일에 0건인 것을 `campus:check` 가 센다.

**칸을 꺼 두는 것은 안내이고 막는 것은 서버다.** 준비 중인 학과의 주소를
손으로 쳐도 상태를 다시 보고 시작 단추를 세우지 않으며, 폼을 직접 보내도
`startFromCampus` 가 학과 목록으로 돌려보낸다.

---

## E. 검사 시작 이후는 한 줄도 바뀌지 않았다

전용 Assessment UI 를 만들지 않았다. 고른 학과는 **짧게 들고 가는 쿠키**
하나로 `/v3/start` 까지 이어지고, 거기서부터는 Assessment Intro · Shell ·
Frequency Scale · Experience · Industry · Role · Result · PDF · Current
State · Experience Update · autoRecompute 가 전부 공통이다.

**주소에 Core 를 싣지 않는다.** `?core=CS_CORE_V1` 로 들고 가면 그 주소를
고쳐 아직 열리지 않은 전공으로 들어가는 길이 생긴다. 쿠키는 서버가 적고
(`httpOnly`) 서버가 읽으며, 읽을 때 등록부로 한 번 더 맞춰 본다. 그리고
`openAttempt()` 가 한 번 더 본다: 그 시장에서 지금 응시할 수 있는 Core 가
아니면 **맥락을 통째로 버린다**(등급을 화면에서 받지 않는 것과 같은
까닭이다).

**열린 응시의 전공을 바꾸지 않는다.** 푸는 중에 Core 가 갈리면 앞에 답한
문항이 다른 전공의 영역 사전 위에 선다. 들고 있던 학과 선택은 그 자리에서
버린다: 다음 응시에 조용히 묻어 들어가면 그 사람이 고르지 않은 학과로
검사가 시작된다.

---

## F. 맥락을 응시 줄에 적는다. 표를 새로 만들지 않았다

`v3_attempts` 에 칸 넷을 더했다(`university_code` · `college_code` ·
`department_code` · `specialization_code`). 표를 따로 두지 않은 까닭은 이
값이 **그 응시의 속성**이어서다. `undergrad_core` 와 `industry_interest`
를 칸으로 더한 것과 같은 자리다.

**이 값이 채점을 바꾸지 않는다**(규격 §12). 쓰이는 자리는 넷뿐이다:
routing · Campus 집계 · 학과 보고 · 지역 표시. 채점과 결과 모듈에 이 칸이
0건인 것을 `campus:check` 가 센다. 문서에 적어 두는 것으로는 지켜지지
않는다(계열 값이 채점에 안 들어가는 것을 검사로 막은 것과 같다).

**외래키를 걸지 않는다.** 학교와 단과대학과 학과의 정본은 등록부 JSON
이고, DB 에 한 벌 더 두면 학과를 늘리는 날 한쪽만 늘어난다. 이 저장소에서
`industries` 가 그렇게 깨졌다.

**올리는 차례에 적었다.** `deploy/db-chain.json` 의 `upgrade` 맨 뒤이고,
`npm run db:chain` 이 그것을 센다. 이 저장소에서 `career_profiles` 가 그
목록에서 빠져 운영에 선 적이 없었다.

---

## G. Campus 집계: 소속과 학교 진입은 다른 길이다

`campusV3` 가 받는 것이 기관 목록 하나에서 **둘**이 됐다: 담당자가 맡은
기관과 그 기관이 등록부의 어느 학교인가(`organizations.code`). 둘 가운데
하나만 보면 담당자 화면에 학생이 반만 잡히고, **그 반이 비어 있는 것을
담당자는 `아직 아무도 안 쳤다` 로 읽는다.** 학과가 명단을 올려 계정을
발급한 학생은 `memberships` 로 묶이고 `/campus/pcu` 로 혼자 들어온 학생은
소속이 없다.

`by_college` 와 `by_department` 가 새로 선다. **5명 규칙을 새로 적지
않았다**: 두 칸도 기존 `cell()` 을 지나므로 다섯이 안 되는 칸에서는
**값이 만들어지지 않는다.** 가려서 보여 주지 않는 것과는 다르다. 개별
학생 정보 노출은 한 줄도 넓히지 않았다.

**학교 전용 진입으로 들어온 응시만 두 묶음에 선다.** 소속으로만 묶인
학생은 그 칸이 비어 있고, 빈 칸을 `(고르지 않음)` 한 줄로 세우면 담당자가
그만큼의 학생이 어느 학과인지 모르는 줄로 읽는다.

---

## H. 검사 셋

```bash
npm run campus:check   # 등록부와 경계 21가지 (DB 없이)
npm run campus:shots   # 실제 브라우저로 밟고 찍는다 31가지
npm run campus:walk    # 검사 가능한 학과의 길과 집계 16가지
```

`campus:check` 가 보는 다섯 묶음: 등록부가 성립하는가 · 매핑이 실제로
닿는가 · 상태가 둘뿐인가 · 학과 이름이 코드에 없는가 · 경계가 지켜지는가.
**문구는 여기서 세지 않는다**: AI 티와 금지한 말은 `npm run v3:copy` 가
세고, 그 목록에 학교 쪽 네 파일을 더했다. 같은 판정을 두 곳에서 하면
어느 날 갈리고, 갈린 날 둘 다 못 믿는다.

`campus:shots` 는 자리 목록을 주소로 열지 않고 **학생이 밟는 차례 그대로**
밟는다. 쪽이 서는가와 고른 일이 막히는가는 다른 질문이라, 준비 중인 학과를
막는 자리를 화면과 서버 양쪽에서 본다.

`campus:walk` 는 **검사 가능한 학과의 길**을 끝까지 밟고, 그 응시가 집계에
잡히는지까지 본다. 지금 배재대 학과가 전부 준비 중이라 등록부에 시험용
학교 하나를 넣고 밟은 뒤 되돌린다. 학교가 하나라도 열리면 그 학교를 그대로
밟게 바꾼다 — **열리는 날 처음 밟아 보면 그날 고칠 것이 생긴다.**

---

## I. 이 회차에 돌린 것

| 검사 | 결과 |
|---|---|
| `campus:check` | 통과 21 · 걸림 0 |
| `campus:shots` | 통과 31 · 걸림 0 (Desktop 1440 · Mobile 390) |
| `campus:walk` | 통과 16 · 걸림 0 |
| `v3:copy` | 파일 36벌 · 규칙 38가지 OK |
| `v3:freeze:measure` | `ME_V3_MEASUREMENT_FREEZE_1` 그대로 |
| `v3:runtime` · `v3:ui` | 28 · 28 통과 |
| `v3:gate` · `v3:loop` · `v3:product-loop` | 20 · 15 · 51 통과 |
| `v3:result` · `v3:result:copy` · `v3:result:freeze` | 25 · 10 · 그대로 |
| `v3:workspace` | 파일 44벌 그대로 |
| `routes:check` · `db:chain` | 10 · 8 통과 |
| `copy:audit` · `claims:check` | 원고 OK · 금지 주장 0곳 |
| `errors:check` | 통과 7 · 걸림 1 (`recompute.ts:377`, 이번 회차 전부터 있던 자리) |

판본은 검사 화면 하나만 올랐다: `ME_V3_2_ASSESSMENT_UI_V20`. **문항 은행과
판단 규칙과 결과 모델과 결과지 화면과 작업공간은 그대로다.**
