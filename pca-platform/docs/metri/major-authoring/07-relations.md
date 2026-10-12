# 07. Relations — 영역 ↔ 산업·역할

`relations` 파일은 표 둘이다. `td_industry` 와 `td_role`.

## 왜 표인가

영역 × 산업 × 역할을 곱하면 사람이 손으로 유지할 수 없는 수가 된다. 표
둘로만 관리한다. 영역이 아홉이고 산업이 여섯이면 `td_industry` 가 54줄,
역할이 여덟이면 `td_role` 이 72줄이다.

## `td_industry` 한 줄

`td` · `td_name` · `industry` · `industry_name` · `strength` ·
`appears_as` · `axes_watched[]` · `dimensions[]`

| 칸 | 무엇 |
|---|---|
| `strength` | `중심` · `있음` · `드묾` 셋 |
| `appears_as` | 그 산업에서 이 영역이 **어떤 모양으로 나타나는가** 한 줄 |
| `axes_watched` | 그 조합에서 특히 보는 축 |
| `dimensions` | 그 조합에서 갈리는 판단 |

## `td_role` 한 줄

`td` · `td_name` · `role` · `role_name` · `strength` · `appears_as` ·
`axes_watched[]`

## 세는 규칙

- **모든 조합에 줄을 둔다.** 빠진 조합은 화면에서 `관계 없음` 이 아니라
  `자료 없음` 이 되고, 둘은 다른 상태다
- `드묾` 은 연결의 근거로 쓰지 않는다. 묶음을 가르는 것은 `중심` 이고
  줄에 적는 것은 `중심` 과 `있음` 이다
- 여기서 **수를 만들지 않는다.** 겹친 개수를 세어 적을 뿐 점수로 바꾸지 않는다
- 같은 수로 걸린 자리는 차례를 만들지 않는다
