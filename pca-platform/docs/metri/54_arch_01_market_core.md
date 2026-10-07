# A. Mechanical Engineering Core schema · Market Policy

## 1. Market Policy

`content/markets.json` 하나가 어느 시장에서 어느 계열의 Core 를 내놓을지
정한다. **시장을 늘릴 때 고치는 자리가 여기 한 곳이다.**

| 칸 | 뜻 |
|---|---|
| `code` | `KR` · `GLOBAL`. 호스트가 아니라 앱 안의 market 값이다 |
| `allowed_core_families` | 그 시장이 내놓는 Core 계열 |
| `region_layer` | 지역 층을 켜는가. 지역 자료가 그 나라 것이라 시장 단위다 |
| `locale_default` | 그 시장의 기본 언어 |

규칙 넷이다.

1. 노출되지 않는 Core 는 가격표에도 결제에도 응시에도 나타나지 않는다.
2. 목록에 없는 core 를 주소로 넘겨도 서버가 거절한다
   (`coresForMarket()` 이 빈 배열을 돌려준다).
3. **모르면 내놓지 않는다.** 시장 코드가 등록부에 없으면 빈 목록이다.
4. 시장은 호스트로 갈리지 않는다(설계 원칙 5).

지금 상태다.

| 시장 | 등록된 core | 지금 응시 가능 |
|---|---|---|
| KR | 10벌 | 1벌 (기계공학) |
| GLOBAL | 7벌 | 1벌 (기계공학) |

GLOBAL 에 경영학과 경제학과 인문·사회 core 가 **등록조차 되지 않는다.**
`markets` 칸에 `KR` 만 적혀 있고, 그 위에 계열 허용 목록이 한 번 더
막는다. 둘 중 하나만 틀려도 새지 않는 이중 잠금이다.

## 2. Major Core 등록부

`content/major-cores.json` 이 Core 목록이고 **엔진은 이 파일만 읽는다.**
Core 이름도 파일 이름도 코드에 적지 않는다.

| 칸 | 뜻 |
|---|---|
| `code` | `ME_CORE_V3`. 판본이 코드 안에 들어 있다 |
| `family` | `STEM` · `HUMANITIES_SOCIAL` · `BUSINESS`. 시장 정책이 보는 값 |
| `major` | `ME` · `EE` · `BIZ`. 사람이 고르는 전공 |
| `assessment_version` | `ME_V3_DOMAIN_2026`. 응시 기록에 적히는 값 |
| `status` | `planned` · `building` · `live` · `archived` |
| `markets` | 그 core 가 설 수 있는 시장 |
| `files` | 계약이 요구하는 파일의 이름 |
| `packs` | 산업팩과 역할팩 파일의 이름 |

### 2-1. 계약

`contract` 가 **core 마다 같은 열쇠로 내놓아야 하는 것**을 적는다.

| 파일 | 필수 열쇠 |
|---|---|
| `taxonomy` | `technical_domains` · `role_functions` · `org_contexts` · `job_aliases` · `boundaries` · `axes` · `scales` · `levels` |
| `domains` | `domains` |
| `checklists` | (생성물) |
| `items_blueprint` | `slots` · `result_sections` · `rules` |

선택 파일은 셋이다. `checklist_additions` · `common_additions` ·
`evidence_remap`. 옛 자산을 재배치한 core 에만 있다. ME 에는 199영역이
있었고 전기전자에는 없을 수 있다.

**`status: planned` 인 core 에는 파일을 요구하지 않는다.** 등록만 해 두고
파일이 없는 것이 맞는 상태이고, 그것을 검사가 실패로 적으면 아홉 줄이
영원히 빨갛다.

### 2-2. 읽는 자리를 하나로 모았다

`src/lib/me-v3/core-registry.ts` 하나가 등록부를 읽는다.

| 함수 | 무엇 |
|---|---|
| `coreFile(code, kind)` | 그 core 의 파일 하나를 읽는다 |
| `coresForMarket(market)` | 그 시장에 등록된 core |
| `sellableCores(market)` | 지금 응시할 수 있는 core |
| `contractGaps(code)` | 계약을 안 지키는 자리를 글로 |

처음에는 1~4단계 검사가 `me-v3-*.json` 을 이름으로 못 박고 있었다. 그러면
두 번째 core 를 올리는 날 검사를 베껴 쓰게 되고, **베낀 검사 가운데 하나는
반드시 뒤처진다.** 네 검사를 전부 등록부로 돌렸고, 그 사실을
`v3:extend` 가 금지 낱말 검사로 지킨다.

## 3. Mechanical Engineering Core

| 값 | |
|---|---|
| `code` | `ME_CORE_V3` |
| `assessment_version` | `ME_V3_DOMAIN_2026` |
| `family` · `major` | `STEM` · `ME` |
| 시장 | KR · GLOBAL |
| 기술영역 | 12 |
| 역할기능 | 7 |
| 조직환경 | 7 |
| 판단 축 | 8 (J1~J8) |
| 척도 | S4 선별 · S8 전체 |
| 수준 | L0 없다 · L1 접했다 · L2 수행했다 · L3 소유했다 |
| 공고 직무명 별칭 | 24 |
| 직무 경계 쌍 | 10 |
| 영역 × 축 체크리스트 | 245 |
| 공통 판단 체크리스트 | 32 |
| 문항 자리 | 113 |
| 산업팩 | 8 |
| 역할팩 | 7 |

**ME_V2 의 직무 열여섯 목록을 쓰지 않는다.** 그 목록은 기술영역과 제품
단계와 역할과 조직환경을 한 줄에 섞어 두었다. 자세한 것은
`52_rebuild_02_taxonomy.md`.

## 4. 기본정보로 받는 값

| 키 | 언제 | 허용값 |
|---|---|---|
| `market_code` | 항상 | `KR` · `GLOBAL` |
| `core_code` | 항상 | 그 시장에서 응시 가능한 core |
| `education_stage` | 항상 | `bachelor` · `master` · `phd` · `postdoc` |
| `ug_major_name` | 항상 | 자유입력 (준식별자) |
| `ug_major_field` | 항상 | 네 계열 |
| `grad_major_name` | 석사 이상 | 자유입력 (준식별자) |
| `grad_field` | 석사 이상 **필수** | 네 계열 |
| `current_status` | 항상 | 재학·졸업·재직·준비 |
| `target_interest` | 항상 | 자유입력 |

전공계열 넷은 `STEM` · `HUMANITIES_SOCIAL` · `BUSINESS` ·
`OTHER_INTERDISCIPLINARY` 다.

**이 값들이 scoring 에 들어가지 않는다.** 들어가는 자리는 넷뿐이다:
문항 routing · 문면 장면 · 경험 번역 모듈 · 결과 해석 한 절. 자세한 것과
그것을 지키는 방법은 `53_v3_01_branching.md` 3~4절.

**학위 자체로 Evidence 가 오르지 않는다.** 축 수준은 응답자가 고른 판단과
산출물로만 오르고, 한 칸을 올리려면 근거가 둘 이상이어야 한다.

**학부 전공과 대학원 전공이 다르면 번역 메뉴를 합집합으로 연다.** 기계
학부에서 산업공학 석사로 간 사람과 경영 학부에서 기계공학 석사로 간 사람은
가진 근거가 반대 방향이라, 하나만 받으면 한쪽 경험이 사라진다.
