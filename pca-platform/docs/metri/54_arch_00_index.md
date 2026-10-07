# CareerMatri 장기 구조 · 1차 구현 기반

작성 2026-10-07. **V3 assessment 코드는 시작하지 않았다.** 이 묶음이
확정하는 것은 구조이고, 그 구조가 데이터와 스키마와 검사로 서 있는지까지
확인했다.

## 일곱 층

```
Country / Market
  └ Major Core            전공이 정한다. 기계공학이 첫 번째다
      └ Industry Pack     산업 맥락. 진단에 포함되고 잠그지 않는다
          └ Role Pack     공고 직무명 단위의 깊이
              └ Region Layer    한국판. 직무 판단과 섞지 않는다
                  └ Evidence / Gap   확인된 축과 비어 있는 축
                      └ Career Action  다음에 만들 것
```

**나라별로 엔진을 따로 만들지 않는다.** 같은 Core Engine 을 쓰고 Market
Policy 가 **노출 가능한 Major Core 만** 제한한다.

| 시장 | 내놓는 계열 | Region Layer |
|---|---|---|
| KR | STEM · 인문·사회 · 경상 | 켠다 |
| GLOBAL | STEM | 끈다 |

## 산출물과 파일

| 산출물 | 어디에 |
|---|---|
| A Mechanical Engineering Core schema | `54_arch_01_market_core.md` · `content/major-cores.json` |
| B 기술영역 열둘 데이터 | `content/me-v3-domains.json` (이전 회차에 확정) |
| C 판단 여덟 축 데이터 | `content/me-v3-taxonomy.json` 의 `axes` · `scales` · `levels` |
| D BASIC routing | `54_arch_02_routing.md` 2절 |
| E 심화영역 routing | `54_arch_02_routing.md` 3절 |
| F 학위별 routing | `54_arch_02_routing.md` 4절 |
| G Industry Pack schema | `54_arch_03_packs.md` · `content/industry-packs.json` |
| H Role Pack schema | `54_arch_03_packs.md` · `content/role-packs.json` |
| I Region Layer schema | `54_arch_04_region_trace.md` · `db/schema_v3_arch.sql` 3절 |
| J 결과 trace | `54_arch_04_region_trace.md` 4절 |
| K 자동화 event 구조 | `54_arch_05_events_versions.md` · `db/schema_v3_arch.sql` 5절 |
| L version 구조 | `54_arch_05_events_versions.md` 4절 |
| 장기 확장성 검사 | `54_arch_06_extensibility.md` |

## 검사

```bash
npm run v3:arch      # 일곱 층이 서 있는가 20가지
npm run v3:extend    # 엔진을 뜯지 않고 core 를 더할 수 있는가 14가지
npm run v3:build     # core 의 체크리스트를 만든다 (CORE 로 고른다)
npm run v3:domains   # core 데이터 13가지
npm run v3:items     # core 문항 blueprint 11가지
```

**네 검사가 전부 core 이름을 모른다.** `CORE=EE_CORE_V1` 로 돌리면 전기전자
core 를 본다. 이것이 장기 확장 원칙의 실제 모양이다.

## 한 문장

**CareerMatri 는 전공 Core 하나 위에 산업과 역할과 지역을 얹는 구조이고,
Core 를 더하는 일이 코드를 고치는 일이 아니라 파일을 더하는 일이다.**

## 두 번 섞기 쉬운 자리

설계를 읽는 사람이 가장 자주 헷갈릴 두 쌍을 먼저 적어 둔다.

**전공계열(`grad_field`)과 Major Core 계열(`family`)은 다른 값이다.**
앞엣것은 **기계공학 Core 를 푸는 사람의 대학원 전공계열**이고 묻는 말과
번역 메뉴를 고른다. 뒤엣것은 **어느 Core 상품인가**이고 시장 정책이 그것을
가린다. 경영학 석사가 기계공학 Core 를 푸는 일과 경영학 Core 가 열리는
일은 서로 다른 일이다.

**Role Pack 과 역할기능(RF)은 다른 층이다.** RF 는 Core 안의 축이고 일곱
가지 기능 가운데 무엇을 맡는가를 잰다. Role Pack 은 공고 직무명 단위의
깊이 모듈이고 **새 축을 만들지 않는다**: `core_ref` 로 Core 의 기술영역과
역할기능을 가리킬 뿐이다.
