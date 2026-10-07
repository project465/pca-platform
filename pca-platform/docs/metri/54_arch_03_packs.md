# G. Industry Pack schema · H. Role Pack schema

## 1. 두 층이 무엇을 하고 무엇을 하지 않는가

| | Industry Pack | Role Pack |
|---|---|---|
| 단위 | 산업 | 공고 직무명 |
| 1차 | 8벌 | 7벌 |
| 하는 일 | 산업 맥락 · 추가 질문 · Evidence 해석 · 직무 연결 | 요구 축 · 추가 질문 · 비교 대상 · 지원 자료 |
| 하지 않는 일 | **축 수준을 바꾸지 않는다** | **새 축을 만들지 않는다** |
| 잠그는가 | 잠그지 않는다. 진단에 포함된다 | 같다 |

**Role Pack 과 역할기능(RF)은 다른 층이다.** RF 는 Core 안의 축이고,
Role Pack 은 `core_ref` 로 Core 의 기술영역과 역할기능을 가리키는 깊이
모듈이다. 축을 새로 만들면 지금 제품이 축을 섞어 둔 것과 같은 실수가 된다.

## 2. Industry Pack schema

```
code · version · name_ko · name_en · core · markets · status
demands[]          그 산업이 실제로 요구하는 것
axis_emphasis{}    TD → [축...]  그 산업이 더 보는 축
items[]            추가 질문 (상한 6)
evidence_reading[] 같은 경험이 그 산업에서 무엇으로 읽히는가
job_aliases[]      그 산업의 공고 직무명
org_mix{}          조직 유형 분포
vocabulary[]       공고에 적히는 산업 용어
```

### 2-1. `axis_emphasis` 가 점수를 바꾸지 않는다

그 산업이 **더 보는 축**이고, 쓰이는 자리는 셋이다.

| 쓰인다 | 쓰이지 않는다 |
|---|---|
| 비어 있는 축을 설명하는 **순서** | 축 수준 L0~L3 계산 |
| 다음 행동에서 먼저 권하는 축 | 영역 묶음 Z1~Z4 조건 |
| 같은 경험을 그 산업 말로 읽어 주는 문장 | 확인된 축 개수 |

검사가 팩 전체에서 `weight` 와 `가중치` 와 `score_delta` 와 `multiplier`
를 찾는다. 하나라도 있으면 실패다.

### 2-2. 여덟 벌

| 코드 | 이름 | 그 산업이 가장 크게 보는 자리 |
|---|---|---|
| `INDUSTRY_SEMICON_V1` | 반도체 | 정밀도와 열과 진동이 동시에 걸린 조건에서의 반복성 |
| `INDUSTRY_DEFENSE_V1` | 방산·항공우주 | 요구 추적과 규격 적합과 형상 관리 |
| `INDUSTRY_MOBILITY_V1` | 자동차·모빌리티 | 내구와 소음·진동과 공정능력과 원가 |
| `INDUSTRY_ROBOT_V1` | 로봇·자동화 | 택트와 반복 정밀도와 안전 범주 |
| `INDUSTRY_BATTERY_V1` | 이차전지 | 조건창과 수율과 열폭주와 가압 |
| `INDUSTRY_SHIP_V1` | 조선·해양 | 선급 규칙과 용접과 대형 구조 피로 |
| `INDUSTRY_ENERGY_V1` | 원전·에너지 | 안전등급과 코드와 품질보증 기록 |
| `INDUSTRY_SMARTFACTORY_V1` | 스마트팩토리 | 설비 데이터와 설비 종합효율과 예지 보전 |

## 3. Role Pack schema

```
code · version · name_ko · name_en · core · markets · status
core_ref{td[], rf[]}   Core 의 어느 영역과 역할인가
required_axes[]        그 역할에서 빠지면 안 되는 축
items[]                추가 질문 (상한 6)
compare_with[]         같이 놓고 보는 다른 역할팩
application_material[] 지원할 때 들고 가는 것
```

| 코드 | 이름 | `core_ref` | 필수 축 |
|---|---|---|---|
| `ROLE_DESIGN_V1` | 설계 | TD01 × RF1 | J3 · J5 |
| `ROLE_CAE_V1` | CAE | TD02·TD03·TD04 × RF2 | J3 · J6 |
| `ROLE_RND_V1` | R&D | TD01·TD02·TD03·TD05·TD06 × RF7 | J1 · J6 |
| `ROLE_TEST_V1` | 시험·검증 | TD07 × RF3 | J3 · J5 |
| `ROLE_MFG_V1` | 생산기술 | TD08 × RF4 | J3 · J6 |
| `ROLE_QUALITY_V1` | 품질·신뢰성 | TD10 × RF3·RF6 | J3 · J6 |
| `ROLE_PM_V1` | PM·기술기획 | TD11 × RF6 | J2 · J5 |

`compare_with` 가 경계표와 짝이다. CAE 를 고른 사람에게 설계와 시험·검증과
R&D 를 같이 놓고 **가르는 질문**을 보여 준다.

## 4. 조합별 문항세트를 복제하지 않는다

구조가 그것을 막는다. 문항은 **더하기로 늘고 곱하기로 늘지 않는다.**

| | 수 |
|---|---|
| 산업 × 역할 조합 | 56 |
| 조합마다 열두 문항을 복제하면 | 672 |
| 실제로 쓴 문항 | **90** (산업 48 + 역할 42) |
| 한 응시에 더해지는 응답 | 최대 12 (산업 6 + 역할 6) |

검사가 `authored < duplicated / 4` 를 센다. 어느 날 조합별로 쓰기 시작하면
그 줄이 걸린다.

## 5. 산업팩을 잠그지 않는다

기계공학 진단은 **주요 산업을 기본으로 견줄 수 있어야 한다.** 그래서
산업팩과 역할팩을 상품으로 가르지 않는다.

| 등급 | 산업과 역할에서 받는 것 |
|---|---|
| BASIC | 어느 산업과 역할부터 볼지. Core 자료로 견준다 |
| STANDARD | 산업 하나와 역할 하나를 깊게. 나머지는 차이로 |
| PRO | 그 산업 × 역할에서 내 경험이 무엇으로 읽히는지와 지원 재료 |

구독은 **계속 갱신되는 기능**에 붙는다(`54_arch_05_events_versions.md` 5절).

## 6. 산업팩과 역할팩이 늘어날 때

| 늘리는 일 | 고치는 자리 |
|---|---|
| 산업팩 한 벌 | `industry-packs.json` 에 줄 하나 |
| 역할팩 한 벌 | `role-packs.json` 에 줄 하나 |
| 다른 Core 의 팩 | 그 core 의 `packs` 에 파일 이름 둘 |

**코드를 고치지 않는다.** 검사가 영역과 역할과 조직 유형이 그 Core 의
taxonomy 로 풀리는지만 본다.
