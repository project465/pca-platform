# 03. 구현 순서 — 계약을 보존하면서 가장 작은 단위부터

**규칙 셋.**

1. 단계마다 **기존 경로에 배선하지 않는 것**을 먼저 하고, 배선은 계약 승인 뒤 한 단계를 따로 둔다.
2. 단계마다 아래 **불변 묶음**이 통과해야 다음으로 간다. 측정 동결은 **기록을 다시 적지 않은 채로** 통과해야 한다.
3. 단계마다 `git diff 4f02d79b -- <보존 경로>` 가 비어 있어야 한다.

**불변 묶음** (DB 없이 도는 것)

```bash
npm run v2:frozen               # Q1~Q92
npm run v3:freeze:measure       # 측정 동결 — MEASURE_FREEZE=write 금지
npm run v3:freeze && npm run v3:result:freeze && npm run v3:workspace && npm run v3:freeze:core
for c in ME_CORE_V3 BIZ_CORE_V1 EE_CORE_V1 CS_CORE_V1; do CORE=$c npm run -s v3:scoring; done   # GOLDEN=update 금지
npm run db:chain                # db/proposed/ 가 차례 목록에 새지 않았는가
npm run campus:check
npm run typecheck
npm run shared-core:check       # 1단계에서 생긴다
```

**보존 경로** (diff 가 비어야 한다)

```
sites/pca-platform/assessment/**        assessment-frozen.json
sites/pca-platform/content/*-items.json  *-bank-lock.json  campus-universities.json  major-cores.json
src/lib/me-v3/scoring/**  src/lib/me-v3/result/{model,build,version}.ts
db/schema*.sql  deploy/db-chain.json
src/lib/me-v3/report-gm/**  data/report-gm/**  data/region/**
CLAUDE.md  .gitignore
```

---

## 0단계 — 기준선과 문서 (이번 회차 · 완료)

- 작업 가지를 `4f02d79b` 로 fast-forward. 강제 푸시 없음.
- `docs/shared-core/` 다섯 벌. 코드 변경 0.
- 불변 묶음을 기준 커밋에서 한 번 돌려 기록(`README` 의 결과 절).

## 1단계 — Tenant Profile 읽기 전용 (배선 0)

**만드는 것**: SC-1 의 `types.ts` · `resolve.ts` · `pcu.ts` · `content/tenants/_schema.json` · `README.md` ·
`scripts/shared-core-check.ts`.

**검사가 세는 것**
1. `resolveTenant("PCU")` 가 지금 동작과 같은 값을 돌려준다 (`tier=PRO` · `cores=registry` · `id_prefix=null` ·
   `template_key=v3-web-print`). 지금 동작은 `session.ts` · `start-gate.ts` · `registry.ts` 에서 읽어 와 견준다.
2. `content/tenants/*.json` 이 전부 스키마를 지난다. 등록부와 같은 코드가 둘이면 걸린다.
3. `src/lib/shared-core/**` 가 채점·결과 모듈을 들여오지 않는다.
4. `src/app/**` 에서 `shared-core` 를 들여오는 줄이 0 이다 (**1단계는 배선하지 않는다**).

**전주대·세종에 열리는 것**: 각 세션이 자기 `tenants/<코드>.json` 을 쓰고 `shared-core:check` 로 검사할 수 있다.
배재 파일을 한 줄도 고치지 않고 병합 충돌도 없다.

**DB · 화면 변경**: 0.

## 2단계 — 로그인 아이디 이름공간 (P0)

**2a (배선 0)**: SC-2 `login-namespace.ts` 와 그 검사. 다른 학교 학생 계정을 덮는 경우 · 담당자 계정 · 개인 회원 ·
접두어가 이미 붙은 아이디 · 접두어 없는 학교(PCU)가 지금과 같은 아이디를 만드는지.

**2b (계약 CC-002 승인 뒤)**: `campus/students.ts` 에 두 줄. 로컬 DB 로 `pcu:students` 를 돌려 PCU 의 결과가 글자까지
같은지와, 임시 학교 둘로 같은 학번을 올려 덮지 않는지를 센다. **두 번째 학교가 명단을 올리기 전에 끝낸다.**

## 3단계 — 콘텐츠 선택과 렌더 기록 (배선 0)

- SC-3 `content-select.ts` 와 검사(프로필 없음 = 지금과 같음).
- SC-4 `db/proposed/sc_001_v3_report_renders.sql` · `report-renders.ts`. 표가 없는 DB 에서 던지지 않는지,
  로컬 DB 에 손으로 부은 뒤 started → ready / failed 가 적히는지.
- `db:chain` 이 `db/proposed/` 를 세지 않는지(지금 `readdirSync("db")` 와 `db/seed` 만 본다).

## 4단계 — 종이 기록 배선 (계약 CC-004 승인 뒤)

- `result/pdf/route.ts` 에 두 줄 · `SC_RENDER_LOG=1` 일 때만.
- 표를 차례(`deploy/db-chain.json`)에 넣는 일은 **Staging 에서 먼저** · 사업주 승인 · 운영 DB 는 사람이 `db:upgrade`.
- 담당자 화면의 `종이` 한 칸은 배재 세션과 따로 계약.

## 5단계 — 역할과 기관 격리

- SC-5 `actor.ts` (rbac.ts 를 쓰는 첫 런타임 자리). 화면 배선은 계약 CC-005.
- SC-6 기관 격리 검사. 기관 둘 · 담당자 둘 · 학생 넷을 로컬 DB 에 세워 짝으로 센다.

## 6단계 이후 — 사업주 결정이 먼저인 것

| 항목 | 막는 까닭 |
|---|---|
| 참여자 학업 단계 확장(부트캠프 · 구직자) | `education_stage` 가 routing 을 고른다. 넓히면 측정 동결에 닿는다 → **STOP GATE** |
| 기관별 Core 개방 (`assessment.cores` 를 `sellableCores` 에 배선) | 학생 공개 정책 · Canary 판정과 묶여 있다 |
| 기관별 판본 고정 배선 (`openAttempt`) | `session.ts` 는 검사 화면 동결 안이다 |
| 기관 설정을 DB 로 (`organizations.workspace_settings`) | 운영 DB 마이그레이션 |
| PDF 저장소(S3) · 대기열 | 인프라 결정 |
| GM 운영 연결 | 배재 세션 · Human Review · `RESULT_UI_VERSION` |

---

## 배재 Gold Master 를 방해하지 않는다는 근거

- 1~3단계가 만드는 파일은 전부 새 경로이고 배재 줄기의 추가 경로와 겹치지 않는다(`00_BASELINE.md` §2).
- 1~3단계가 고치는 기존 파일은 0이다. 2b · 4단계의 두 줄짜리 고침은 계약 승인 뒤이고 GM 경로 밖이다.
- `package.json` 에 더하는 두 줄은 배재 줄기도 고치는 공용 파일이라, 그 줄을 더하는 커밋을 따로 두고 계약
  CC-000 에 적는다(합칠 때 줄 단위 충돌이면 양쪽을 살린다).

## 전주대 · 세종이 지금 시작할 수 있는 것

| 세션 | 1단계가 끝나면 | 2단계가 끝나면 |
|---|---|---|
| 전주대 | `tenants/JJU.json` 작성 · 검사 · `id_prefix: "jju-"` 확정 · 전북권 `region_codes` | 명단 발급을 실제 DB 로 시험 |
| 세종 | `kind: public_agency` · `participant_model: program_participant` 로 프로필 초안 · 세종 기업 자료를 `org_dataset` 열쇠로 정리(자료 권리 확인 전에는 PREVIEW) | — |
