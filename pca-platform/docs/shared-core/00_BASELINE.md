# 00. 기준선: 브랜치 차이와 기준 커밋

조사일 2026-10-20. 원격 `project465/pca-platform` 의 모든 가지를 받아 견줬다.

## 1. 브랜치 지도

| 가지 | 머리 | 역할 | 이 세션이 쓰는가 |
|---|---|---|---|
| `main` | `0079cd8` (09-08) | 1단계 계정 + 소개 사이트뿐. **공통 엔진이 없다** | 쓰지 않는다 |
| `claude/amazing-thompson-w3f2o2` | `02b6c610` (10-19) | **운영.** Railway `feisty-generosity/production`(`app.careermatri.com`)이 매 커밋 자동 배포 | **절대 쓰지 않는다** |
| `claude/careermatri-screen-review-p0c8kb` | `3c67c09d` (10-20) | 배재대 세션의 작업 줄기. Staging 자동 배포. 운영 머리를 품고 있다 | 쓰지 않는다 (읽기만) |
| `feature/jju-campus` | `0079cd8` | 전주대 세션. **main 과 같은 커밋이라 엔진이 없다** | 쓰지 않는다 |
| `claude/charming-dijkstra-wlblwl` | (원격에 없음) | 본체 세션. main 기준 | 쓰지 않는다 |
| `claude/epic-galileo-lrvgxr` | (원격에 없음) | 세종 세션 | 쓰지 않는다 |
| `claude/upbeat-archimedes-ekbg0i` | `03d28578` | PR #1 (CI · KCP 약관 · Firebase 마케팅). 병합 안 됨 | 쓰지 않는다 |
| `claude/serene-hawking-qnripx` | `39f6bdc1` | 현멘(별도 상품). 고아 가지 | 쓰지 않는다 |
| `gh-pages` | `a8244154` | ME_V2 정적판 | 쓰지 않는다 |
| **`claude/determined-brahmagupta-jwnqs9`** | 기준 커밋 + 문서 | **이 세션(Common Core)** | 쓴다 |
| **`feature/shared-core`** | 위와 같은 커밋 | 사업주가 지정한 Common Core 목표 가지 | 쓴다 |

관계:

```
main 0079cd8
 └─ ... 452 커밋 ... ─ 02b6c610 (운영)
                         └─ merge 9151fd71 ─ R31~R35 ─ 4f02d79b ─ GM v1~v4 ─ 3c67c09d (배재 작업 줄기)
                                                        ▲
                                                        └─ shared-core 기준
```

- 운영 → 작업 줄기: 운영 쪽에만 있는 커밋 0, 작업 줄기에만 있는 커밋 28.
- 작업 줄기 쪽 28 커밋이 운영 대비 바꾼 데이터 계약은 하나다:
  `db/schema_campus_students.sql` 끝의 `CM_V3_CAMPUS_PRO` 상품 한 줄(R35, `4f02d79b`).
  **Staging·운영 모두 `npm run db:upgrade` 가 아직 필요하다.** 운영 DB 작업이라 이 세션은 하지 않는다.

## 2. 기준 커밋: `4f02d79b`

**`4f02d79b` (R35 출시 차단 해소)** 를 Common Core 의 기준으로 확정한다.

| 후보 | R35 포함 | 승인 전 Gold Master 포함 | 판정 |
|---|---|---|---|
| `0079cd8` (main) | ✗ | ✗ | 엔진이 없다. 탈락 |
| `02b6c610` (운영) | ✗ | ✗ | R33~R35 안정화가 빠진다(DB 끊김 세션 유지 · 동시 제출 한 벌 · 학교 계정의 개인 응시 차단). 탈락 |
| **`4f02d79b`** | ✓ | ✗ | **채택** |
| `0bff307c` (전주대 세션 권고) | ✓ | GM v4 중간본 | Human Review 전 코드가 딸려 온다 |
| `3c67c09d` (배재 머리) | ✓ | GM v4 + 설계안 | 위와 같음 |

채택 까닭을 숫자로 확인했다.

```
git diff --name-status 4f02d79b origin/claude/careermatri-screen-review-p0c8kb
  A  추가만 ...................... 382 파일 (docs/ 밖은 42: src/lib/me-v3/report-gm/** · data/report-gm/** · data/region/*.json · scripts/lab/gm-* 등)
  M  수정 ........................ 3 파일 (.gitignore · CLAUDE.md · docs/metri/review/rb/STAGING_CHECKS.md)
  src/ · db/ · data/ · scripts/ 의 삭제 줄 ... 0
```

그래서:

1. R35 까지의 안정화가 전부 들어 있다.
2. Gold Master 는 **추가만 하는 커밋들**이라, shared-core 가 그 추가 경로와 위 3 파일을 건드리지 않으면
   배재 작업 줄기와 shared-core 를 나중에 합칠 때 **충돌이 0** 이다.
3. 승인 전 Gold Master 코드를 Common Core 가 의존하지 않는다.

**전주대·세종 세션에 권하는 출발점도 같은 `4f02d79b` 다.** 같은 기준을 쓰면 공통 인터페이스 계약서의
`기준 커밋` 줄이 하나로 맞는다. (전주대 세션은 `0bff307c` 를 권했다. 둘 다 R35 를 품지만
`0bff307c` 는 승인 전 GM 코드가 딸려 와 그 위에 짓는 코드가 GM 에 기댈 위험이 있다.)

## 3. 반드시 보존: 무엇이 지키고 있는가

| 보존 대상 | 정체 | 지키는 장치 | 이 세션의 규칙 |
|---|---|---|---|
| **Q1~Q92 검사** | `ME_V2_DECISION_2026` (BASIC 48 / STANDARD 68 / PRO 92). `sites/pca-platform/assessment/ME_V2/items-{core,standard,pro}.json` 외 5벌. 채점은 `sites/pca-platform/assets/v2-scoring.js` | `assessment-frozen.json` (sha256) · `npm run v2:frozen` · `v2:check` | 파일을 열지도 않는다 |
| **현재 판매 엔진** | `ME_V3_2` · Core 20벌 · `scoring/engine.ts` `score()` (DB 없는 순수 함수) | `measurement-lock.json` (`ME_V3_MEASUREMENT_FREEZE_1`) · Core별 `bank-lock.json` · `v3:freeze:measure` · `v3:scoring` | `src/lib/me-v3/scoring/**`, `result/model.ts`, `result/build.ts`, 문항 은행을 고치지 않는다 |
| **v3_snapshots** | `db/schema_v3_runtime.sql:102` · append-only · `result_model` 을 같은 줄에 굳힌다 · `module_versions` 12칸 | 관례 + `v3:result:freeze` (DB 트리거 없음) | 읽기만 한다. 칸을 더하지 않는다 |
| **결과 계약 판본** | `SCORING_VERSION=me-v3-scoring.5` · `ITEM_BANK_VERSION` · `RESULT_MODEL_VERSION=me-v3-result-model.6` · `RESULT_UI_VERSION` | 위 동결들 | 판본을 올리지 않는다 |
| **R35 안정화** | `campus/start-gate.ts` · `campus/attempt-state.ts` · `campus/org-mode.ts`(`campusV3Only`) · `auth.ts` jwt 유지(R33) · `submit()` 의 `FOR UPDATE`(R33) | `scripts/lab/rb-start-gate.ts` · `rb-evidence-compare.ts` · R33 E2E | 동작을 바꾸지 않는다 |
| **기존 사용자 데이터** | 운영 DB | — | 운영 DB 에 연결하지 않는다 |
| **운영과 Production 가지** | `claude/amazing-thompson-w3f2o2` | `R30_MERGE_PLAN.md` | 쓰지 않는다 |

## 4. 지금 돌릴 수 있는 검사 (DB 없이)

```bash
npm ci --ignore-scripts          # node_modules 가 없다
npm run v2:frozen                # Q1~Q92 지문
npm run v3:freeze:measure        # 측정 동결 (기록을 다시 적지 않은 채로 통과해야 한다)
CORE=ME_CORE_V3 npm run v3:scoring
npm run typecheck
npm run db:chain                 # 새 스키마 파일이 차례에서 빠지지 않았는가
npm run campus:check
```

단위 테스트 실행기는 없다(jest · vitest · node:test 0). 검사는 전부 `tsx`/`node` 스크립트다.
CI 도 없다(`.github/workflows` 는 PR #1 가지에만 있다).

## 5. 소유 구역 (파일 충돌 방지)

| 구역 | 소유 | shared-core 의 태도 |
|---|---|---|
| `src/lib/me-v3/report-gm/**` · `data/report-gm/**` · `data/region/*.json` · `scripts/lab/gm-*` · `docs/metri/review/pdf-gm/**` | 배재대 (Gold Master) | 읽지도 의존하지도 않는다 |
| `sites/pca-platform/content/campus-universities.json` | 배재대 (PCU 블록) | **읽기만** 한다 (어댑터) |
| `src/lib/campus/**` · `src/app/campus/**` · `src/app/org/v3/**` | 배재대 (최근 R30~R35) | 고칠 일은 계약서로 |
| `src/lib/me-v3/scoring/**` · `result/**` · 문항 은행 · `*-lock.json` | 측정 동결 | 고치지 않는다 |
| `CLAUDE.md` · `.gitignore` · `package.json` scripts · `deploy/db-chain.json` | 공용(한 세션씩) | 이번 회차에 고치지 않는다. `package.json` 에 줄을 더해야 할 때는 계약서로 알린다 |
| `src/lib/shared-core/**` · `sites/pca-platform/content/tenants/**` · `db/proposed/**` · `scripts/shared-core-*.ts` · `docs/shared-core/**` | **Common Core (이 세션)** | 새로 만든다 |
| `sites/pca-platform/content/tenants/JJU.json` | 전주대 (계약 CC-001 승인 뒤) | 틀만 정의한다 |
| `sites/pca-platform/content/tenants/<세종 코드>.json` | 세종 (계약 CC-001 승인 뒤) | 틀만 정의한다 |
