# 05. Industry Pack

산업팩은 산업 소개가 아니다. 답해야 하는 것은 하나다.

> 이 산업에서 **이 전공의 어떤 판단이 어떤 형태로 쓰이는가**

## 채우는 칸

`code` · `version` · `name_ko` · `name_en` · `core` · `markets[]` ·
`status` · `demands[]` · `scene` · `judgement_dimensions[]` ·
`axis_emphasis` · `items[]` · `gap_language` · `result_line` ·
`evidence_reading` · `job_aliases[]` · `org_mix` · `vocabulary`

| 칸 | 무엇 |
|---|---|
| `demands[]` | 그 산업이 요구하는 것. 전공 말이 아니라 산업의 조건으로 |
| `scene` | 이 전공 사람이 거기서 다루는 것 서너 줄 |
| `judgement_dimensions[]` | `name` · `axis` · `domain` · `why`. 판단 열둘쯤 |
| `axis_emphasis` | 그 산업이 더 보는 축. **점수를 바꾸지 않는다** |
| `items[]` | 그 산업에서 실제로 갈리는 판단 문항. 전부 `gloss` 를 단다 |
| `gap_language` | 비어 있을 때 그 산업의 말로 적는 한 줄 |
| `result_line` | 결과지에 서는 한 줄 |
| `job_aliases[]` | 공고에 적히는 직무명 |
| `org_mix` | 그 산업의 조직 유형 분포 |
| `vocabulary` | 그 산업의 말과 일반어의 짝 |

## 점수를 바꾸지 않는다

`axis_emphasis` 가 쓰이는 자리는 셋뿐이다. 비어 있는 축을 **설명하는
순서**, 먼저 권하는 축, 그 산업 말로 다시 읽어 주는 문장. 축 수준과 영역
묶음과 확인된 축 개수에는 들어가지 않는다. 팩 안에 `weight` ·
`score_delta` · `multiplier` 를 두지 않는다.

## 용어를 모른다고 깎지 않는다

문항마다 `gloss` 를 단다. 그 판단을 **일반적인 전공 말로 바꿔 적은 한
줄**이다. 반도체의 파티클을 몰라도 `오염을 설계 조건으로 다룬 경험` 이면
같은 판단이다.

## 산업 수를 맞추지 않는다

여덟에 맞추려고 연결이 얕은 산업을 넣지 않는다. 실제 연결성이 높은
것부터 쓰고, 같은 이름의 산업이 다른 전공에도 있어도 **묻는 판단과 연결
영역은 달라야 한다.**
