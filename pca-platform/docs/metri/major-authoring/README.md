# Major Core Authoring Kit

전공 하나를 CareerMatri 에 올리려면 **무엇을 작성해야 하는가**를 적어 둔
자리다. 기준은 지금 돌고 있는 `ME_CORE_V3` 이고, 여기 적힌 열쇠는 손으로
적은 것이 아니라 그 core 의 실제 파일에서 떠 온다(`schema.json`).

```bash
npm run major:kit            # 이 Kit 이 실제 구조와 같은가
KIT=write npm run major:kit  # 구조가 일부러 바뀐 날 다시 적는다
```

## 엔진을 고치지 않는다

CareerMatri 는 `공통 엔진 하나 + Major Core 여럿` 이다. 전공을 더하는 일은
**콘텐츠 파일을 쓰는 일**이고 코드를 쓰는 일이 아니다. 등록부
(`sites/pca-platform/content/major-cores.json`)가 가리키는 파일만 엔진이
읽고, 엔진은 core 이름도 파일 이름도 모른다.

전공마다 다음을 만들지 않는다.

- 별도 scoring philosophy
- 별도 판단축
- 별도 빈도 척도
- 별도 UI
- 별도 DB 표

## 쓰는 차례

차례가 곧 조건이다. 앞의 것이 비면 뒤의 것을 쓸 수 없다.

| | 쓰는 것 | 문서 | 엔진이 읽는 파일 |
|---|---|---|---|
| 1 | 전공 신원 | `01-major-core.md` | `major-cores.json` 의 한 줄 |
| 2 | 기술영역·역할·조직·경계 | `02-domain.md` | `taxonomy` · `domains` |
| 3 | 영역 × 축 체크리스트 | `03-checklist.md` | `checklists` |
| 4 | 문항 자리와 문면 | `04-assessment-items.md` | `items_blueprint` · `items` |
| 5 | 산업팩 | `05-industry-pack.md` | `packs.industry` |
| 6 | 역할팩 | `06-role-pack.md` | `packs.role` |
| 7 | 영역 ↔ 산업·역할 관계표 | `07-relations.md` | `relations` |
| 8 | 결과 문구의 재료 | `08-result-copy.md` | `domains` 안의 값 |
| 9 | 열기 전에 세는 것 | `09-qa-checklist.md` | 검사 명령 |

## 공통으로 잠긴 것

`schema.json` 의 `shared` 가 정본이다. 전공을 늘려도 이 값은 그대로다.

- **판단축 여덟** `J1`~`J8`
- **소유 네 단계** `없다 · 남이 한 것을 받아 썼다 · 내가 했다 · 내가 정하고 그 결과가 쓰였다`
- **경험 빈도 셋** `없음 · 1~2회 · 3회 이상` (저장값 `0 · 1 · 2`)
- **척도 둘** `S4`(선별) · `S8`(전체)
- **결과 절 열** `A`~`J`

공통 판단축으로 표현할 수 없는 영역을 만나면 **임의로 축을 늘리지 말고**
`09-qa-checklist.md` 의 GAP 보고 자리에 적는다.

## 기계공학을 베끼지 않는다

영역 수를 열둘로 맞추지 않는다. 산업을 여덟으로 맞추지 않는다. 명사만
바꾼 문장을 쓰지 않는다. 베낀 문장은 `npm run v3:wording` 이 세 글자 묶음
겹침으로 센다.
