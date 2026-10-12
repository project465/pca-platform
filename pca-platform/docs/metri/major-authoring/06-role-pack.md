# 06. Role Pack

역할팩은 직무 소개가 아니다. 답해야 하는 것은 하나다.

> 이 직무가 **먼저 보는 판단과 근거**는 무엇인가

## 채우는 칸

`code` · `version` · `name_ko` · `name_en` · `core` · `markets[]` ·
`status` · `core_ref{td[], rf[]}` · `required_axes[]` · `owns` ·
`decides[]` · `differs_from[]` · `items[]` · `compare_with[]` ·
`application_material`

| 칸 | 무엇 |
|---|---|
| `core_ref` | 가리키는 영역과 역할기능. **새 축을 만들지 않는다** |
| `required_axes` | 그 자리가 먼저 보는 축 |
| `owns` | 그 자리가 확정하는 것 한 줄 |
| `decides[]` | 실제로 정하는 것들 |
| `differs_from[]` | `vs` · `line`. 가장 헷갈리는 이웃과의 차이 |
| `items[]` | `id` · `axis` · `domain` · `ask`. 그 자리의 **권한과 범위** |
| `compare_with[]` | 같이 놓고 볼 직무 |
| `application_material` | 지원서에서 읽히는 재료 |

## Core 문항을 베끼지 않는다

역할팩이 파는 것은 **그 자리에서 가진 권한과 범위**다. 어미만 바꾼 문장을
두면 응시자가 같은 질문을 두 번 받고 역할팩이 설 자리가 사라진다.
`npm run v3:wording` 이 묶음을 건너뛴 겹침을 센다.

## 이름을 재사용하지 않는다

다른 전공의 역할 이름을 그대로 가져오지 않는다. 그 전공 현장에서 부르는
이름으로 적고, 공고에 적히는 이름은 `job_aliases` 에 둔다.

## 한 칸을 여섯 번 묻지 않는다

선별 둘과 심화 하나에 산업 둘과 역할 둘이 같은 `영역 × 축` 에 얹히면 한
사람이 같은 데를 여섯 번 돈다. 실제 응시 기준으로 가장 많은 자리가 넷을
넘지 않게 한다.
