# 배재대 Gold Master 세션 요청 3건에 대한 Common Core 답 (초안)

- 받은 것: 배재대학교 CareerMatri 세션(`session_01Pb5gcCnJzPGSA2kMcXfZXf`)의 메시지,
  2026-10-20 07:31Z. 원문이 가리키는 문서는 `claude/happy-faraday-q85c13` 가지
  (`7e01e3df`)의 `docs/metri/review/pdf-gm/p3-iso/CORE_CHANGE_REQUEST.md` · `ISO_CHECK.md`
- 쓴 것: Common Core 세션, `feature/shared-core` (R37)
- **보내지 않았다.** `send_message` 로 보낼지, 이 파일을 그 세션에 가리킬지는 사업주가 정한다
- 이 세션은 그쪽 가지와 코드를 읽기만 했고 고치지 않았다. 아래 셋 가운데 **승인된 요구사항은 없다**

| 요청 | 이 문서의 답 | 상태 |
|---|---|---|
| 2 · `did` 와 저장 근거 수 | 의도된 동작이다. **네 목록을 더하면 안 된다** · 세는 열쇠를 적었다 | 확인됨 (재현 테스트) |
| 1 · 경험 기록을 응시 시점에 고정 | CC-006 **후보**로 적었다. 권고안 A(스냅숏) · 기준 시점은 결정 필요 | DRAFT · DB 변경 없음 |
| 3 · GM 서버 입구 · 런타임 파일 | CC-007 **검토 항목**으로만 적었다. 배포·디자인 쪽 책임 | 기록만 · 착수 안 함 |

---

## 요청 2 — `did` 26 · 저장 27 (먼저 답한다: 바로 쓸 수 있다)

**의도된 동작이다.** 결과 모델의 네 목록은 서로 다른 질문에 답하고, 서로 겹친다.

| 목록 | 무엇을 담는가 | 만드는 자리 |
|---|---|---|
| `did` | **확인된 축**(직접 수행 이상)에서 고른 항목의 글자 합집합 | `pickIn(d.confirmed)` |
| `decided` | **소유된 축**(직접 결정 + 근거 둘)에서 고른 항목. 늘 `did` 의 부분집합 | `pickIn(owned)` |
| `artifacts` | J5 의 `artifact:` 고르기 전부. **축 상태와 상관없다** | `picksOf(J5, "artifact")` |
| `verifications` | J6 의 `verify:` 고르기 전부. **축 상태와 상관없다** | `picksOf(J6, "verify")` |

그래서 J6 를 묻지 않았거나 확인되지 않은 영역(그쪽 사례의 TD02)에서 고른 `VERIFY` 근거는
`verifications` 에는 서고 `did` 에는 서지 않는다. 그쪽에서 본 `27 − 26 = 1` 이 그 한 줄이다.

### 같은 모양을 이쪽에서 재현했다

`scripts/shared-core/evidence-aggregation.test.ts` (DB 없음 · 실제 `score` + `buildResult` · 5/5 통과,
로그 `docs/shared-core/evidence/R37/evidence-aggregation.log`). BIZ Core 에 TD01 · TD08 을 깊게 열고
TD02 는 선별만 열어 J6 를 `받아 썼다(1)` 로 둔 사례다.

| 값 | 수 |
|---|---|
| 저장된 고르기 (`v3_evidence_picks` PK 기준 고유) | 26 |
| `did` | 25 |
| `decided` | 0 |
| `artifacts` | 4 |
| `verifications` | 3 |
| **네 목록 합** | **32** — 실제 고유 26 보다 6 많다 |
| 겹침: `artifacts ∩ did` · `verifications ∩ did` | 4 · 2 |
| 확인된 축에 걸린 고르기 · 아직 후보 | 25 · 1 |

**네 목록을 더하면 같은 근거를 두 번 센다.** 그쪽이 "네 목록의 합으로 세도록 바꿨다" 고 적은 방식은
이 사례에서 32 를 내고 실제 고유 근거는 26 이다. `decided` 가 서는 응답(직접 결정 + 근거 둘)에서는
`decided ⊆ did` 라 그만큼 더 부풀어진다.

### 글자로 세어도 틀리는 자리가 하나 더 있다

`did` 는 **글자**로 합친다. 같은 영역에서 같은 글자가 `ARTIFACT` 칸과 `VERIFY` 칸에 둘 다 있으면
저장은 두 줄인데 `did` 에는 한 번 선다. 재현: CS Core TD01 `요구 목록` — 저장 2행 · `did` 1
(같은 테스트의 E5). 스무 Core 가운데 그런 글자가 11곳이다(`docs/shared-core/evidence/R37/bench/run.log`
· CS 6 · BIZ · HEALTH · LANG · EDU · AGRI 각 1).

### 세는 열쇠 (권고)

```
(domain_code, slot, item_text)      ← v3_evidence_picks 의 PK 에서 attempt_id 를 뺀 것
slot ∈ J1…J8 · ARTIFACT · VERIFY
```

- **고유 근거 수** = 그 응시의 `v3_evidence_picks` 행 수 (PK 가 이미 고유하다)
- 화면·종이에서는 둘로 나눠 적기를 권한다: **확인된 근거**(그 축이 확인됐거나, `ARTIFACT`/`VERIFY` 는
  J5/J6 가 확인된 것) · **아직 후보**(고르기는 했지만 그 축이 확인되지 않은 것)
- 결과 모델의 네 목록은 **문장 재료**로 쓰고 수를 세는 데 쓰지 않는다

이건 결과 모델을 바꾸자는 요청이 아니다. 세는 법만 정한다. 결과 모델·채점은 그대로다.

---

## 요청 1 — 경험 기록 고정 → CC-006 후보

### 먼저 재현했다 (지금 무엇이 바뀌고 무엇이 그대로인가)

`scripts/shared-core/exp-timepoint.test.ts` (일회용 PostgreSQL · 실제 `addExperience` ·
`updateExperience` · `removeExperience` · `experiencesOf` · 4/4 통과, 로그 `.../R37/exp-timepoint.log`)

| | 결과 |
|---|---|
| TP-1 `v3_snapshots` (payload · result_model · 판본) | 경험을 더하고 · 고치고 · 지워도 **한 글자도 안 바뀐다** (`2a58f66b…` 네 번 같음) |
| TP-2 결과 화면이 읽는 `experiencesOf` | 바뀔 때마다 달라지고, 지우면 원래로 돌아간다 — **지운 흔적이 없다** |
| TP-3 (정적) 본체 결과지 | 경험 묶음 `#records` 가 `rs-webonly` 이고 `@media print` 에서 숨는다 → 본체 PDF 에는 경험이 안 들어간다 |
| TP-4 `note_text` | 적으면 `purge_after` 가 선다(1년) |

그래서 문제는 **GM 이 PDF 에 live 경험을 넣기 시작한 지점**에서 생긴다. 본체 PDF 는 지금 경험을 싣지 않는다.

### 두 안을 견줬다

| | A · 스냅숏(그때의 경험을 한 벌 적어 둔다) | B · 이력(경험 표에 판본을 두고 기준일로 읽는다) |
|---|---|---|
| 호환 | 칸 하나 더하기. 옛 응시는 비어 있고 "기준 없음" 으로 읽는다 | 쓰는 자리 셋(add · update · remove)과 읽는 자리 전부(`experiencesOf` · 재분석 · 작업공간)가 바뀐다 |
| 재현 | 적어 둔 그때를 그대로 | 이력이 시작된 날 이후라면 어느 날이든 |
| 지난 응시 | **되살릴 수 없다**(TP-2: 지운 흔적이 없다) | 같다 — 이력도 시작한 날부터다 |
| 양 | 응시(또는 발급)마다 경험 몇 줄 | 고칠 때마다 한 줄 |
| 개인정보 · 삭제 | `note_text` 를 베끼면 1년 파기가 우회된다 → **구조화 열쇠만 베끼고 `note_text` 는 뺀다.** 학생이 지운 경험이 기록에 남아도 되는지는 정책 결정 | 같은 질문이 생긴다. 지움이 "숨김" 이 되므로 파기 규칙을 다시 적어야 한다 |
| 고침 · 지움 뒤 | 굳힌 기록은 그대로 · 작업공간은 지금 값 | 기준일 질의로 같다 |
| PDF 시각 vs 응시 시각 | 굳히는 시점을 하나 정해야 한다(아래) | 읽을 때 기준일을 고른다 |
| DB · API 범위 | `v3_snapshots` 에 nullable 칸 하나(또는 SC-4 의 발급 기록 표에 칸 하나) · 쓰는 자리 한 곳 · GM 이 읽는 자리 한 곳 | 새 표 또는 `valid_from/valid_to` + soft delete · 쓰고 읽는 자리 다수 |
| `v3_snapshots` 계약 | **만들어 둔 줄을 고치지 않는다**를 지킨다(칸을 더할 뿐 · 옛 줄은 null) | 스냅숏은 그대로 · 경험 쪽 계약이 새로 생긴다 |

### 권고: A — 다만 "언제 굳히는가" 는 결정이 필요하다

A 가 범위가 작고 이미 있는 원칙(만들어 둔 결과지를 고치지 않는다)과 같은 방향이다.
남는 질문은 **굳히는 시점**이고 이 세션이 정하지 않는다.

- **A1 · 제출할 때** (그쪽 요청 ①). 같은 응시의 PDF 가 다시는 안 바뀐다. 다만 이 제품의 흐름이
  `검사 → 결과 → 경험 추가 → 반영` 이라 **결과를 받은 뒤 적은 경험은 그 응시의 PDF 에 영영 서지 않는다.**
  실제 학생이 제출 전에 경험을 적는 비율은 운영 자료로 확인하지 못했다(NOT VERIFIED)
- **A2 · PDF 를 발급할 때** (CC-004 의 발급 기록에 같이 적는다). 발급한 종이 한 벌마다 그때의 경험이 남아
  그 종이를 그대로 다시 만들 수 있다. 다시 발급하면 새 기준일이 종이에 적힌다

어느 쪽이든 GM 은 종이에 **기준일**을 적는 것이 맞다(지금 그쪽이 쓰려는 "뽑은 날 기준" 문구가 A2 의 표시와 같다).

### 같이 걸린 정적 발견 (이번에 고치지 않았다)

- `src/lib/erasure.ts` 의 지우는 표 목록에 `v3_experiences` 가 없다. 파기된 사람의 경험 제목·메모가 남는다
- `v3_experiences.purge_after` 를 실제로 집행하는 자리를 찾지 못했다(`v3-pilot-purge.ts` 는 파일럿 표만 본다)

둘 다 본체 소유 코드이고 A 를 고르면 같이 정해야 한다. CONTRACTS.md CC-006 에 적어 두었다.

---

## 요청 3 — GM 서버 입구 · 런타임 파일 → CC-007 검토 항목

이 세션이 할 일이 아니라 **배포·디자인 쪽 책임**이라 기록만 했다. 착수·연결 0.

- 운영 `/v3/{id}/result/pdf` 를 건드리지 않고 승인 플래그 뒤에 별도 입구 — 분류 DEPLOYMENT/INFRA · DB/API CONTRACT
- 런타임 이미지에 `data/report-gm/*` · `data/region/*`(공시 스냅숏) · Pretendard(OFL) — `deploy/runtime-needs.json` ·
  `Dockerfile` 변경. 글꼴은 지금 저장소에 없다(`globals.css` 는 이름만 적고 내려받지 않는다)
- 같이 정할 것: 지역·공시 자료의 사용 권리(CC-003 은 권리 확인 전 PREVIEW 로 둔다) · 담당자 전용 미리보기의 권한
  (기관은 기본으로 개인 결과지를 못 본다, CC-005)

---

## 근거 파일

| 파일 | 내용 |
|---|---|
| `scripts/shared-core/evidence-aggregation.test.ts` | 요청 2 재현 · E1~E5 |
| `scripts/shared-core/exp-timepoint.test.ts` | 요청 1 재현 · TP-1~4 |
| `docs/shared-core/evidence/R37/evidence-aggregation.log` · `exp-timepoint.log` | 실행 로그 |
| `docs/shared-core/evidence/R37/bench/run.log` · `results.json` | 칸이 다른데 글이 같은 고르기 11곳 |
| `docs/shared-core/CONTRACTS.md` | CC-006 · CC-007 |
