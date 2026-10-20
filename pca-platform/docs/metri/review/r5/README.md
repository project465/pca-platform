# R5 — 결과지 재설계와 실물 플랫폼 검증

| 파일 | 무엇 |
|---|---|
| `00_STATUS.md` | 현황판(체크 상태 · 담당 · 막힌 까닭 · 고치는 길 · SHA) |
| `01_DESIGN_DIFF.md` | v11 문제 → R5 고침 · 쪽 비교 · 활자 표 |
| `02_HUMAN_REVIEW.md` | 사람이 볼 여섯 자리 · 자체 검토 · 판정 칸 (사용자 검수 NOT VERIFIED) |
| `03_CORE_APPROVAL_REQUESTS.md` | R5 승인 요청 R5-1~R5-8 |
| `04_RELEASE_GATE.md` | Staging 확인 결과 · 13걸음 · 회귀 · 시연/파일럿/정식 판정 |
| `STAGING_BLOCKED.md` | 기존 Staging 에 닿지 못한 정확한 원인과 최소 조치 (한 장) |
| `pdf/` | PROTO6(6쪽 × 3) · FULL(12쪽 × 3) · 쪽 그림 · COMPARE6 · BEFORE_AFTER · LINT_RESULTS |
| `ci/` | `pcu-verify` R5 초안(승인 전 · 워크플로 아님) · 3차 초안과의 diff |
| `logs/` | 원본 로그(R0 기준 · 도달 · 빌드 환경 · 회귀) |

다시 뽑기: `DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' npx tsx scripts/lab/gm-r5.ts` (글꼴은 `var/pdf-gm/fonts/pretendard/`).
