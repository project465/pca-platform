# CareerMatri Common Core (shared-core)

네 프로젝트(배재대 · 전주대 · 세종일자리경제진흥원 · CareerMatri 본체)가 함께 쓰는
기술 기반을 맡는 작업의 문서 묶음이다. **이미 있는 검사·채점·Evidence·PDF·관리자
기능을 다시 만들지 않는다.** 기관별로 갈라져야 하는 자리만 공통 인터페이스로
세운다.

| 문서 | 내용 |
|---|---|
| [00_BASELINE.md](00_BASELINE.md) | 브랜치 차이, 기준 커밋 확정, 보존 대상 목록 |
| [01_REQUESTS.md](01_REQUESTS.md) | 다른 세션이 요청한(또는 요청할) 공통 변경 목록 |
| [02_INTERFACES.md](02_INTERFACES.md) | 공통 Core 인터페이스와 파일 정의 |
| [03_PLAN.md](03_PLAN.md) | 계약을 보존하는 구현 순서와 단계별 검사 |
| [CONTRACTS.md](CONTRACTS.md) | 영향받는 세션에 전달할 변경 계약서(초안) |
| [R36_P0_LOGIN_COLLISION.md](R36_P0_LOGIN_COLLISION.md) | **R36 P0** 기관 사이 학번 충돌 재현 · 영향 · 수정안 · 승인 목록 |
| [SC1_TENANT_PROFILE.md](SC1_TENANT_PROFILE.md) | **R36 SC-1** 기관 프로필 읽기 전용 인터페이스 계약과 경계 |
| [R36_REPORT.md](R36_REPORT.md) | R36 보고 열 항목 |
| [R37_REPORT.md](R37_REPORT.md) | **R37** 보고 열 항목 |
| [R37_TRACKS.md](R37_TRACKS.md) | Gate P0 + Track A~F 현황 · 결함 우선순위 · 다음 순서 |
| [R37_P0_VERIFICATION.md](R37_P0_VERIFICATION.md) | SC-2 여덟 질문 · 식별자 · PASS/TODO/SKIP · ADJ-1 |
| [R37_BENCHMARK.md](R37_BENCHMARK.md) | Core 품질 벤치마크 v1 기준선 (합성 44 사례) |
| [handoffs/2026-10-20_pcu-gm-core-requests.md](handoffs/2026-10-20_pcu-gm-core-requests.md) | 배재 GM 요청 3건 회신 초안 (**보내지 않음**) |
| [R38_REPORT.md](R38_REPORT.md) | **R38** 보고 — 콘텐츠 무결성 · 파기 재현 · 기관 회신 |
| [R38_TRACKS.md](R38_TRACKS.md) | R38 Track 상태 |
| [R38_OUTPUT_CONTENT_QA.md](R38_OUTPUT_CONTENT_QA.md) | 결과 본문 QA (합성 · 전/후 · 근거 ID · 9축) |
| `handoffs/R38_*.md` | 배재 · 본체 · 전주 · 세종 회신 초안 (**미발송**) |
| [handoffs/R39_PCU_r3-approval-review.md](handoffs/R39_PCU_r3-approval-review.md) | **R39** 배재 3차 승인 요청 검토 의견 — CI · Staging · API · GM 패치 · 파기 (**미발송 · 승인 아님**) |

## 기준 커밋에서 돌린 불변 묶음 (2026-10-20)

기준 커밋 `4f02d79b` 그대로(문서 말고 바뀐 파일 0)에서 돌렸다.

| 검사 | 결과 |
|---|---|
| `v2:frozen` (Q1~Q92 포함 12 파일) | 어긋난 자리 0 |
| `v3:freeze:measure` | 14 / 14 · `ME_V3_MEASUREMENT_FREEZE_1` 과 같다 · 기록을 다시 적지 않았다 |
| `v3:scoring` ME · BIZ · EE · CS | 각 31 / 31 · `GOLDEN=update` 없이 |
| `db:chain` | 8 / 8 |
| `campus:check` | 80 / 80 |
| `typecheck` · DB·브라우저가 필요한 검사 | **돌리지 못했다** (아래) |

**이 세션의 네트워크 정책이 `registry.npmjs.org` 를 막아**(connect_rejected) `npm ci` 를 할 수 없었다. 그래서
`tsx` 대신 Node 22 의 type-stripping 과 확장자 없는 import 를 푸는 작은 로더(세션 scratchpad, 저장소 밖)로
DB 없는 검사만 돌렸다. (R36 에서 그 로더를 저장소의 `scripts/shared-core/test/` 로 옮기고,
`pg` 를 psql 로 대신하는 shim 과 일회용 PostgreSQL 16 샌드박스를 더해 `v3:freeze` 까지 돌린다.) `tsc` 와 `pg` · Playwright 가 필요한 검사(`v3:freeze` · `v3:result:freeze` ·
`v3:workspace` · `v3:runtime` 등)는 의존성 설치가 되는 환경에서 1단계를 시작할 때 돌린다.

## 이 작업이 지키는 규칙

1. **운영 브랜치(`claude/amazing-thompson-w3f2o2`)에 쓰지 않는다.** 푸시가 곧
   `app.careermatri.com` 배포다. Staging 브랜치(`claude/careermatri-screen-review-p0c8kb`)
   에도 쓰지 않는다 — 배재대 세션의 작업 줄기이고 푸시가 Staging 배포다.
2. **강제 푸시·rebase·역사 재작성을 하지 않는다.** 이 브랜치는 기준 커밋에서
   fast-forward 로만 나아간다.
3. **운영 DB 마이그레이션을 하지 않는다.** 새 표는 `db/proposed/` 에 두고
   `deploy/db-chain.json` 에 넣지 않는다. 넣는 일은 계약 승인 뒤 Staging 에서 먼저.
4. **다른 세션의 파일을 고치지 않는다.** 고쳐야 하면 `CONTRACTS.md` 에 계약을 쓰고
   그 세션의 승인을 받는다. 소유 구역은 `00_BASELINE.md` §5.
5. **공통 Core 의 새 코드는 새 자리에만 둔다.** `src/lib/shared-core/`,
   `sites/pca-platform/content/tenants/`, `db/proposed/`, `scripts/shared-core/`,
   `docs/shared-core/`. (본체 세션이 제안한 `src/lib/tenant/` · `docs/core/` 와
   겹치지 않게 이름을 갈랐다.)
6. **CLAUDE.md 를 고치지 않는다.** 여러 세션이 동시에 덧붙이는 충돌 지점이다.
   통합할 때 이 폴더를 가리키는 한 줄만 더한다.
