# 판단 엔진의 층과 파일

## 1. 층

```
응답 → 읽기(normalize) → 보기 뜻(ownership) → 축 판정(axes)
     → 영역 상태(domains) → 묶음과 까닭(zones) → 응답 품질(quality)
     → 스냅샷(engine) → [읽는 층] 산업·역할 context · 한국어 번역
```

`src/lib/me-v3/scoring/` 아래 열한 파일이다.

| 파일 | 하는 일 | 하지 않는 일 |
|---|---|---|
| `version.ts` | 판본 여섯 칸과 지문 | 판본을 저절로 올리지 않는다 |
| `ownership.ts` | **보기 넷의 뜻. 유일한 출처** | 사람이 읽는 말을 들지 않는다 |
| `reason-codes.ts` | 까닭 코드 스물한 가지 | 한국어를 들지 않는다 |
| `normalize.ts` | 응답 읽기와 routing과 **빈 것의 네 가지** | 판정하지 않는다 |
| `axes.ts` | 축 하나의 상태와 근거 수 | 영역을 보지 않는다 |
| `zones.ts` | 묶음과 까닭과 다음 걸음 | 점수를 만들지 않는다 |
| `quality.ts` | 응답 품질 flag | **Core 를 깎지 않는다** |
| `packs.ts` | 산업·역할 읽는 순서 | Core 를 다시 계산하지 않는다 |
| `engine.ts` | 묶어서 스냅샷으로 | 사람이 읽는 말을 만들지 않는다 |
| `fixtures.ts` | 사람 벌을 응답으로 펼친다 | 제품 경로가 아니다 |
| `text.ko.ts` | 코드를 한국어로 | **엔진이 읽지 않는다** |

## 2. 들어가지 않는 것 넷

| 값 | 어디에 쓰는가 | Core 판정에 |
|---|---|---|
| 학위 단계 | 묻는 장면 · 번역 · 설명 맥락 | 가중치 0 |
| 전공계열 | routing · 번역 모듈 · 읽는 법 | 가중치 0 |
| 산업팩 | 설명 순서 · 비어 있는 축을 그 분야 말로 | 가중치 0 |
| 역할팩 | 확인된 근거를 그 역할에서 읽는 법 | 가중치 0 |

넷 다 **변형 검사**로 고정했다. 같은 응답에서 그 값만 바꾸면 Core 판정의
지문이 글자까지 같아야 한다(`v3:scoring` A~D).

## 3. 흐름이 한 방향이다

```
Core → 기술영역 상태 확정 → 산업 context 더하기 → 역할 context 더하기
```

산업과 역할은 **이미 확정된 Core 를 읽는다.** `packs.ts` 가 받는 것은
영역 결과이고 돌려주는 것은 설명 순서와 비어 있는 축의 목록이다. 거꾸로
Core 를 다시 계산하는 길이 없다.

## 4. 스냅샷에 적히는 판본 여섯

| 칸 | 값의 예 |
|---|---|
| `core_version` | `ME_CORE_V3` |
| `item_bank_version` | `ME_V3_ITEM_BANK_V1` |
| `scoring_version` | `me-v3-scoring.1` |
| `industry_pack_version` | `INDUSTRY_MOBILITY_V1.v1` · 안 골랐으면 `null` |
| `role_pack_version` | `ROLE_CAE_V1.v1` · 안 골랐으면 `null` |
| `region_layer_version` | 지금은 `null`. 지역 자료가 비어 있다 |

**채점이 바뀌어도 이미 산 사람의 결과가 조용히 달라지면 안 된다.** 그래서
스냅샷은 줄이 쌓이기만 하고, 다시 계산하지 않는다. 문항 은행도 지문으로
잠겨 있다(`sites/pca-platform/sites/pca-platform/assessment/ME_V3/bank-lock.json`): 문면을 고치면 검사가 걸리고
그때 판본을 올린다. **고치지 못하게 막는 장치가 아니다.**

## 5. 아직 배선하지 않은 것

엔진은 함수다. `attempts` 와 `report_snapshots` 에 붙이는 일과 응시 화면이
응답을 보내는 일은 다음 회차다. 이번에 만든 것은 **응답 묶음을 넣으면
스냅샷이 나오는 자리**까지다.
