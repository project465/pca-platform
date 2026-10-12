# 01. Major Core — 전공 신원

등록부 `sites/pca-platform/content/major-cores.json` 의 `cores` 에 한 줄을
더한다. 쓰는 칸은 `schema.json` 의 `authoring_units.registry_entry` 다.

## 채우는 칸

| 칸 | 무엇 | 규칙 |
|---|---|---|
| `code` | `XX_CORE_V1` | 한 번 정하면 바꾸지 않는다. 응시 기록이 이 값을 들고 다닌다 |
| `family` | `STEM` · `BUSINESS` · `HUMANITIES_SOCIAL` | 시장 정책이 이 값으로 가린다 |
| `major` | 두세 글자 줄임 | `ME` · `EE` · `CS` |
| `name_ko` · `name_en` | 사람이 읽는 이름 | 학과명이 아니라 전공 이름이다 |
| `aliases[]` | 이 Core 로 들어올 학과 이름 | **겹치면 더 좁은 전공이 가져간다** |
| `specializations[]` | 같은 Core 안에서 갈리는 줄기 | 판단이 실제로 갈릴 때만 둔다 |
| `markets[]` | `KR` · `GLOBAL` | 시장의 계열 허용 목록과 둘 다 맞아야 열린다 |
| `status` | `planned` → `building` → `live` | `planned` 은 파일을 요구하지 않는다 |
| `maturity` | `FOUNDATION` → `READY_FOR_REVIEW` → `VALIDATED` | 규준이 없으면 `VALIDATED` 를 쓰지 않는다 |
| `files{}` | 아래 넷은 필수 | `taxonomy` · `domains` · `checklists` · `items_blueprint` |
| `packs{}` | `industry` · `role` | 없으면 탐색 절이 비어 선다 |
| `domain_count` · `axis_count` | 실제 수 | 영역 수는 전공마다 다르다. 축은 여덟 고정 |

## specialization 을 언제 두는가

**판단이 갈릴 때만 둔다.** 이름이 다르다는 것은 까닭이 되지 않는다.
전기와 전자가 갈리는 자리는 `전력 · 계통 · 기기` 와 `회로 · 소자` 에서
묻는 판단이 서로 다른 자리이고, 그 차이가 문항과 영역에 나타날 때 비로소
specialization 이다.

## status 를 올리는 선

`building` 으로 올리면 그 Core 가 가격표와 검사 시작 화면에 선다. 올리기
전에 `09-qa-checklist.md` 를 전부 통과해야 한다. **등록만 된 상태로
`building` 을 적지 않는다**: 고르는 사람이 빈 검사를 만난다.
