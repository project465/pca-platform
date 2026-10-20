# R41 보고 — L2 학교 학생 신원 · 합친 패치

**승인은 총괄 PM 이 한다.** 이 가지에서 제품 코드를 고치지 않았다 — 패치는 `proposed/` 에 두고 임시 사본에만 붓는다.
다른 기관 가지에 쓰지 않았고 보내지 않았다.

| | |
|---|---|
| 결정 | 사업주 2026-10-20: L2 는 **Core 방식(학교별 계정)** · 합친 패치를 Core 가 만든다 |
| 패치 | `proposed/sc2-merged.patch` (students · manage · pcu-students) + 짝 `proposed/sc2-merged-bootstrap.patch` (staging-bootstrap) |
| 요청서 | [landing/L2_sc2-identity.md](landing/L2_sc2-identity.md) |

## 합친 것

| 출처 | 가져온 것 |
|---|---|
| Core SC-2 | (학교, 학번)으로만 사람을 찾는다 · 새 학교는 `<CODE>:<학번>` 손잡이 · 남의 손잡이 · 메일을 가져가지 않고 그 줄만 거절 · 다른 학교 줄을 고쳐 쓰지 않는다 |
| 전주 C16 | 한 거래 · 거래 범위 advisory lock · `ON CONFLICT (login_id) DO NOTHING` 뒤 0줄이면 거절 · `LoginTaken` 이름(하위 클래스) · staging-bootstrap 이 거절을 받고 이어 감 |
| 새로 | 잠금 열쇠 셋((학교, 학번) · 손잡이 · 메일)을 정렬해 교착 방지 · 해시는 잠금 밖에서 · 메일 유일 제약 경합을 거절로 |

## 증거

| 검사 | 결과 | 자리 |
|---|---|---|
| 공통 관문 (L1 · L2 · L2b · L3 함께) | `evidence/R41/gate/verdict.tsv` | `evidence/R41/gate/` |
| 전주 자기 검사 `jju-c16.ts` (합친 사본) | **8 / 8** | `evidence/R41/jju-c16-on-merged.log` |
| 음성 대조 (옛 SC-2 사본) | P0-FIX-11(거래 · 잠금) 걸림 | `evidence/R41/neg-l2-old-sc2.log` |

## NOT VERIFIED

잠금의 효과(shim 은 문장마다 커밋한다) · 실제 `pg` 풀 위 동시 명단 적용 · next-auth · 브라우저 · 운영.
전주 가지에는 붙지 않는다 — 그 가지 세션이 C16 을 이 패치로 바꾸는 차례가 필요하다.
