# R37 Core 품질 벤치마크 v1 — 기준선

**기준선만 적는다.** 합격선(90 · 95 같은)을 새로 만들지 않았고 PASS 를 선언하지 않는다.
합성 사례가 통과했다는 것은 **엔진이 적힌 규칙대로 돈다**까지이고, 학술적 타당성이나 실제 직무 추천의
정확성을 보이지 않는다. 최종 품질 판정은 Core PM 이 한다.

```bash
N="node --no-warnings --experimental-strip-types --import ./scripts/shared-core/test/register.mjs"
$N scripts/shared-core/bench/inventory.ts     # 실제 현황 (읽기만)
$N scripts/shared-core/bench/run.ts           # 44 사례 · results.json
node scripts/shared-core/bench/table.mjs > docs/shared-core/evidence/R37/bench/cases.md
```

로그 · 원자료: `docs/shared-core/evidence/R37/bench/` (`inventory.json` · `results.json` · `run.log` ·
`cases.md` · `run-v0-before-checkfix.log`). DB 없이 돈다(채점과 결과 모델은 순수 함수다).

---

## 1. 실제 기능 인벤토리 (§4-1)

등록부(`content/major-cores.json`)가 가리키는 파일을 열어 셌다. 문서에 적힌 수를 옮기지 않았다.

| 항목 | 값 |
|---|---|
| Core 등록 | 39 · 짓는 중 20 · planned 19 |
| 학생에게 명시적으로 연 Core | `BIZ_CORE_V1` 하나(`open_to_students: true`) · ME 는 값 없음(null) |
| 성숙도 | FOUNDATION 16 · READY_FOR_DOMAIN_REVIEW 3 · READY_FOR_REVIEW 1 · **VALIDATED 0** |
| 문항 | Core 마다 344~369 |
| 기술영역 | 12 (19개) · 11 (CS) |
| 체크리스트 항목 | 202~256 |
| 산업팩 · 역할팩 | 8 (18개) · 7 (2개) / 8 (20개) |
| 관계표 | 깨진 참조 0 · 중복 짝 0 · 산업 없는 영역 0 · 영역 없는 팩 0 |
| 빠진 파일 · fixture | 0 · 20 Core 모두 personas + bank-lock 있음 |

### 규칙 기반인가 AI 인가

| 자리 | 방식 |
|---|---|
| 채점(축 수준 · 소유 · 묶음 · 품질) | **규칙** (`scoring/*.ts`) |
| 결과 모델(초점 · 빈자리 · 할 일) | **규칙** (`result/*.ts`) |
| 결과 문장 | **규칙 + 사전**(`text.ko.ts` · 학생 사전) |
| LLM 호출 | `src/lib/me-v3` 57 파일에서 **0** · `fetch` 0 |

## 2. 사례 (§4-2) — 4 Core × 11 = 44

ME · BIZ · EE · CS 에 같은 틀을 그 Core 의 첫 두 영역으로 세웠다(`scripts/shared-core/bench/cases.ts`).
사례마다 입력 · 기대 특성 · 필수 근거 · 금지 과장 · 빈자리 조건 · 실제 출력 · 판정을 적는다. 전체 표는
[`evidence/R37/bench/cases.md`](evidence/R37/bench/cases.md).

| 종류 | 무엇을 흔드는가 | 짝 |
|---|---|---|
| C01 STRONG | d1 여덟 축 직접 수행 · 근거 둘씩 · PRO | 기준 |
| C02 | 같은 전공 · 경험 없음 | CORE_DIFFERS |
| C03 | 같은 경험 · 관심 낮음 | CORE_SAME (관심은 Core 를 바꾸지 않는다) |
| C04 | 근거 없이 `직접 결정` 주장 | CORE_DIFFERS |
| C05 | 다른 산업팩 | CORE_SAME |
| C06 | 같은 응답 · 키 차례만 뒤집음 | FULL_SAME |
| C07 | 심화 축 넷 무응답 | CORE_DIFFERS |
| C08 | J4 `없다` + J4 체크리스트 고름 | CORE_DIFFERS |
| C09 | 다른 역할 목표 | CORE_SAME |
| C10 | BASIC 등급 | — |
| C11 | 포닥 단계 | CORE_SAME (학위는 Core 를 바꾸지 않는다) |

## 3. 지표 (분자 / 분모)

| 축 | 지표 | 값 |
|---|---|---|
| 정확성 | 사례 기대 검사 | **556 / 556** (사례 44 / 44) |
| 정확성 | 결정성(같은 입력 두 번 → 같은 지문) | 44 / 44 |
| 정확성 | 불변식 K1~K9 | 396 / 396 (각 44 / 44) |
| 근거 | K8 지어내지 않음(결과의 근거 글 ⊆ 제출한 고르기) | 44 / 44 |
| 근거 | K3 소유 ⇒ 근거 둘 이상 · K9 `decided ⊆ did` | 44 / 44 · 44 / 44 |
| 개인화 | 짝 관계가 기대대로 | 36 / 36 (CORE_DIFFERS 20 · CORE_SAME 12 · FULL_SAME 4) |
| 개인화 | 할 일 문장이 서로 다름 | **40 / 68** |
| 개인화 | 머리글이 서로 다름 | **14 / 44** |
| 개인화 | Core 판정이 다른데 머리글 · 할 일이 같은 짝 | **6 / 20** |
| 데이터 품질 | 영역 안에서 칸이 다른데 글이 같은 고르기 | 11 (20 Core · CS 6 · BIZ · HEALTH · LANG · EDU · AGRI 각 1) |
| 데이터 품질 | 같은 칸 안 중복 | 0 |
| 확장성 | 같은 사례 틀이 Core 코드 없이 네 Core 에 선다 | 4 / 4 · LLM 0 |

## 4. 무엇을 읽어야 하는가

**6 / 20 이 이번 벤치마크의 가장 큰 발견이다.** ME · EE 의 C07(심화 축 넷 무응답)과 네 Core 모두의
C08(J4 `없다`)이 C01 과 **머리글 · 할 일이 같다.** 스냅샷은 그 축을 `empty` · `SKIPPED` 로 정확히 가르는데
(검사 통과), 결과 모델의 빈자리(`gapsOf`)는 **필수 축 · J5/J6 · 요청된 축 · focus 의 부분 축 하나**만 세운다.

| 사례 | 스냅샷 `empty` (d1) | 결과지 빈자리 (d1) |
|---|---|---|
| ME-C07 | J1 J2 J4 J8 | J3:PARTIAL_EVIDENCE 만 |
| BIZ-C07 | J1 J2 J4 J8 | J2:REQUIRED_AXIS · J3:PARTIAL_EVIDENCE |
| ME-C08 | J4 | J3:PARTIAL_EVIDENCE 만 |

설계된 동작으로 보인다(비필수 · 미요청 축을 빈자리로 세우지 않는다). 바꿀지는 **결과 계약**이라 이 세션이
정하지 않는다 → `CONTRACTS.md` CC-008 검토 항목.

## 5. 이 벤치마크 자신을 고친 자리 (숨기지 않는다)

| 회차 | 무엇이 틀렸나 | 고친 것 |
|---|---|---|
| v0 | K5 를 `NOT_EXPLORED ⇒ 확인 축 없음` 으로 셌다. 깊은 등급에서 선별 축(J3 J5 J6 J7)은 깊게 열지 않아도 확인된다 | `깊게 열지 않음` 과 상태가 맞는지로 바꿨다. 첫 판 로그는 `run-v0-before-checkfix.log` 에 남겼다 (8 / 44) |
| v0 | C05 가 없는 칸(`industry.pack`)을 읽었다 | `industry.code` |
| v0 | `actionKo` 가 객체를 돌려주는데 문자열로 견줘 `[object Object]` 끼리 같다고 셌다 | `sayAction` 으로 펴서 견준다 (68 / 68 → 40 / 68) |
| v1 | C08 의 `J4 가 빈자리로 선다` 를 스냅샷 `empty` **또는** 결과지 빈자리로 묶어, 결과지 쪽이 비어도 통과했다 · C01 · C07 의 빈자리 조건 문장이 실제 출력과 달랐다 | 스냅샷 쪽만 검사하고 결과지 쪽은 `gaps_d1` 관찰값으로 적는다 · C01 에 `확인되지 않은 축의 빈자리가 서지 않는다` 를 더했다 (552 → 556) |
