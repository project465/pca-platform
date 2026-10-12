# 04. Assessment — 자리와 문면

파일 둘이다. `items_blueprint` 가 **자리**를 정하고 `items` 가 그 자리에
들어갈 **문면**을 든다. 자리를 먼저 채우고 문면을 나중에 쓴다.

## 공통 측정 구조

전공이 달라도 재는 것은 같다. 바뀌는 것은 콘텐츠뿐이다.

| 무엇 | 척도 | 저장값 | 어디서 |
|---|---|---|---|
| 관심 | 5보기 + 모르겠다 | 1~5 · `null` | 영역 훑기 |
| 경험 | `없음 · 1~2회 · 3회 이상` | 0 · 1 · 2 | 영역 훑기 |
| 학습 의향 | 5보기 + 모르겠다 | 1~5 · `null` | 선별된 영역만 |
| 실제 판단 | 소유 넷 | L0~L3 | 선별·심화·산업·역할 |
| Industry | 소유 넷 | L0~L3 | 고른 산업 하나 |
| Role | 소유 넷 | L0~L3 | 고른 역할 하나 |

**빈도 척도를 전공마다 만들지 않는다**(README 의 공통 잠금). 같은 `1` 이
전공에 따라 다른 뜻이 되면 두 전공을 같은 자 위에 놓을 수 없다.

**세 낱말을 문항 은행에서 고치지 않는다.** 화면에 적는 말은
`src/lib/me-v3/runtime/menus.ts` 의 `EXPOSURE` 가 들고, 은행의 `options` 는
그 판본의 기록이라 동결돼 있다(`ME_V3_ITEM_BANK_V2.5`). 그래서 기준 전공의
은행에는 아직 옛 말이 적혀 있고, 응시자가 보는 것은 위 표의 셋이다. 새
전공을 만들 때도 **은행의 그 자리를 건드릴 일이 없다**: 화면의 말은 공통
표에서 오고, 전공 파일이 정하는 것은 어느 영역을 묻는가뿐이다.

## blueprint 의 한 자리

`slots[]` — `id` · `block` · `construct` · `domain` · `axis` · `scale` ·
`tier` · `result_sections[]` · `reverse` · `stage_variants` ·
`field_routing` · `note`

`result_sections` 가 비면 **받고 쓰지 않는 문항**이다. 그 자리는 묻지
않는다. 반대로 입력이 없는 결과 절도 두지 않는다.

## 묶음

`CORE-GRID` 영역 훑기 · `CORE-JUDGE` 공통 판단 · `CORE-FORCE` 강제 선택 ·
`PROBE-S4` 선별 네 축 · `DEEP-S8` 심화 여덟 축 · 학위 묶음 넷
(`UG-CORE` · `MS-CORE` · `PHD-CORE` · `POSTDOC-CORE`) · `GRAD-XFIELD` ·
`CONSIST` · `TARGET` · `TRANS-10` · `INDUSTRY` · `ROLE`

## 문면 규칙

`items[]` 의 `wording` 을 쓸 때 지키는 것.

- 한 문항에 동작 하나 · 대상 하나 · 축 하나
- 능력을 묻지 않는다. `~할 수 있다` 대신 `~해 본 경험이 있다`
- 행동과 대상과 판단이 함께 있다
- 수준 이름을 문면에 적지 않는다. 적으면 높은 칸을 고르는 법을 배운다
- `또는` 과 `및` 으로 둘을 묶지 않는다
- 학위는 `stage_wording` 으로 **장면만** 바꾼다. 보기와 척도는 그대로다

## 자리마다 적어 두는 것

`measurement_axis` 와 `evidence_axis` 를 추론에 맡기지 않는다. 문항마다
무엇을 재는지 적어 두고(`constructs` 파일), 짝 표가 맞지 않으면 걸린다.
선호를 묻는 문면에 소유 사다리를 붙이지 않는다.

## 세는 명령

```bash
CORE=XX_CORE_V1 npm run v3:domains   # 영역 자료
CORE=XX_CORE_V1 npm run v3:items     # 자리와 응답 수
npm run v3:wording                   # 베낀 문장
npm run v3:length                    # 화면 수와 분
```
