# R40 보고 — Core 로드맵 · 단계 0 시작 (공통 출시 관문 v1 · 착지 패치 셋)

**최종 판정은 총괄 PM 이 한다.** 이 보고는 승인을 선언하지 않는다. 운영 · 운영 DB · 다른 기관 가지에 쓰지 않았고,
**2구역(공통 파일)을 이 가지에서 고치지 않았다** — 패치는 `docs/shared-core/proposed/` 에 두고 임시 사본에만 붓는다.
다른 세션에 보내지 않았다.

## 1. 한 것

| # | 산출물 | 구역 |
|---|---|---|
| 1 | [CORE_ROADMAP.md](CORE_ROADMAP.md) — 단계 0 · 1 · 2 · 안 바뀌는 것 · Core 밖 | 1 |
| 2 | `proposed/cc009-l1.patch` — 파기에 `v3_experiences` | 패치(미적용) |
| 3 | `proposed/l3-forgot-order.patch` — 찾기 조회 차례 | 패치(미적용) |
| 4 | `scripts/shared-core/p0-forgot-order.test.ts` (새) · `p0-erasure.test.ts` (L1 모드 · ER-G) · `p0-login-collision.test.ts` (`L2` 토큰) | 1 |
| 5 | **`scripts/shared-core/gate.sh` — 공통 출시 관문 v1** | 1 |
| 6 | `landing/L1` · `L2` · `L3` 착지 요청서 (미발송) | 1 |

## 2. 관문 판정 (`evidence/R40/gate/`)

```
bash scripts/shared-core/gate.sh docs/shared-core/evidence/R40/gate
```

결과는 `verdict.tsv` · `summary.tsv` 에 그대로 있다. 판정 줄과 뜻:

| 줄 | 무엇 |
|---|---|
| `current` | 이 작업 트리 그대로 — P0 재현이 서 있다 (`current_repro_standing`) |
| `landed` | 같은 트리를 베끼고 L1 · L2 · L3 을 **함께** 부은 사본 — FIX · 보호 묶음 |
| 판정 | `READY_WHEN_LANDED` 면 승인 · 합치기만 남았다는 뜻. 두 번째 학교 열기는 아직 `SECOND_TENANT_BLOCKED` 다(운영 코드에 안 들어갔다) |

음성 대조: 패치 없이 FIX 모드로 돌리면 L1 · L3 의 FIX 가 걸린다(`evidence/R40/neg-l1.log` · `neg-l3.log`).
관문이 아무것도 안 세고 초록이 되는 자리가 아니다.

## 3. 새로 드러난 것

1. **같은 P0 에 고침이 두 벌이다.** 전주 가지 C16(`f144368f`)이 학번 충돌을 **거절** 방식으로 고쳤고, Core SC-2 는
   **학교별 계정** 방식이다. Core 테스트로 둘 다 쟀다: 둘 다 덮어쓰기 · 넘어감을 막지만, 전주 방식에서는 두 번째
   학교 학생이 계정을 못 받아 FIX 일곱이 설 수 없다. 반대로 C16 의 거래 · advisory lock 은 SC-2 에 없다.
   → [landing/L2](landing/L2_sc2-identity.md) — 방식 결정과 합친 패치가 먼저다. **Core 의 착지 권한이 필요한 까닭이
   그대로 드러난 자리다**: 기관마다 공통 문제를 따로 고치고 있었다.
2. **비밀번호 찾기가 로그인과 다른 계정을 고를 수 있다** — 재현됨(B 먼저 쌓이면 로그인 A · 찾기 B). 남의 계정이
   열리지는 않지만 A 는 재설정을 못 한다 → [landing/L3](landing/L3_forgot-order.md).
3. 착지 패치 셋은 운영 · 배재 · 세종 가지에 그대로 붙는다. 전주에는 L2 만 안 붙는다(위 1).

## 4. NOT VERIFIED

실제 `pg`(관문은 psql shim) · 트랜잭션 되돌림(autocommit) · next-auth · 브라우저 · 운영 DB · 운영 배포본 · 부분 typecheck 19파일(p0 테스트는 전부터 대상 밖) ·
프로젝트 전체 typecheck. 전주 C16 은 `SC_SHIM_TX=autocommit` 으로 돌렸으므로 그 advisory lock 의 효과는 재지 못했다.

## 5. 정하실 것

| # | 결정 | 막는 것 |
|---|---|---|
| 1 | 착지 권한 범위 확인 (CORE_LANDING_AUTHORITY) | 2구역 착지 전체 |
| 2 | L1 · L3 승인 | 실학생 GM · 파일럿(L1) |
| 3 | L2 방식 — 학교별 계정 / 거절 · 합친 패치를 Core 가 쓰는 것 | 두 번째 학교 명단 |
| 4 | 착지 요청서를 PM 에게 보내는 경로 | 승인 단계 |
