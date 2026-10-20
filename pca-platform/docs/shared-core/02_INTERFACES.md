# 02. 공통 Core 인터페이스

기준 커밋 `4f02d79b`. 인터페이스마다 **무엇을 받고 무엇을 돌려주는지 · 어느 파일에 서는지 · 무엇을 건드리지
않는지** 를 적는다. 상태는 전부 `DRAFT` 이고 계약서(`CONTRACTS.md`) 승인 전에는 기존 경로에 배선하지 않는다.

## 공통 원칙

1. **판정에 닿지 않는다.** 어느 인터페이스도 `src/lib/me-v3/scoring/**` · `result/model.ts` · `result/build.ts` ·
   문항 은행을 들여오지 않는다. 그것을 `scripts/shared-core-check.ts` 가 들여오기 줄로 센다
   (`v3:workspace` 가 작업공간에서 채점 모듈을 세는 것과 같은 방식).
2. **읽는 자리는 하나다**(설계 원칙 10). 기관 설정을 읽는 함수는 `resolveTenant()` 하나이고 화면마다 따로
   등록부를 열지 않는다.
3. **모르면 덜 준다.** 프로필을 못 찾으면 지금 동작(개인 B2C)으로 떨어지고, 학교 맥락을 짐작해 채우지 않는다
   (`schema_campus_entry.sql` 이 `university_code` 의 기본값을 NULL 로 둔 까닭과 같다).
4. **새 자리에만 둔다.** `src/lib/shared-core/` · `sites/pca-platform/content/tenants/` · `db/proposed/`.

---

## SC-1 Tenant Profile — 기관 하나를 읽는 한 자리

> **R36 에서 구현했다(읽기 전용 · 미연결).** 실제 파일 이름과 함수는 이 절의 초안과 다르다:
> `loadTenantProfile` · `findTenantProfile` · `listTenantProfiles` 이고 어댑터는 `campus.ts`, zod 대신
> 손으로 쓴 엄격한 검사(모르는 칸 거절)다. 정본은 [SC1_TENANT_PROFILE.md](SC1_TENANT_PROFILE.md).

**목적**: 대학 · 공공기관 · 개인 사용자를 같은 꼴로 읽는다. 전주대와 세종이 **코드를 고치지 않고 파일 하나를
더해** 붙을 수 있게 한다.

**파일**

```
src/lib/shared-core/tenant/types.ts      타입과 zod 스키마 (DB 없음)
src/lib/shared-core/tenant/resolve.ts    resolveTenant() · listTenants()
src/lib/shared-core/tenant/pcu.ts        campus-universities.json 을 읽어 프로필로 옮기는 어댑터 (읽기만)
sites/pca-platform/content/tenants/      기관마다 파일 하나: JJU.json · <세종 코드>.json
```

**타입**

```ts
export type TenantKind = "university" | "public_agency" | "individual";
export type ParticipantModel =
  | "campus_student"        // 학번 · 단과대 · 학과 (배재 · 전주)
  | "program_participant"   // 프로그램 · 기수 (세종 · 전주 부트캠프)
  | "individual";           // 개인 B2C

export interface TenantProfile {
  code: string;               // = organizations.code = v3_attempts.university_code
  kind: TenantKind;
  name: string;               // 표시 이름 (campus 등록부와 같은 방식: 이름 칸을 직접 든다)
  market: "KR";
  participant_model: ParticipantModel;
  login: {
    id_prefix: string | null; // SC-2 · 예 "jju-"
  };
  assessment: {
    cores: "registry" | string[];          // 이 기관에 열린 Core. "registry" 면 sellableCores() 그대로
    pins?: Record<string, {                // 판본 고정 (검증만 · 배선은 4단계)
      item_bank_version: string;
      scoring_version: string;
    }>;
    tier: "PRO" | "per_entitlement";       // 학교는 PRO (session.ts:536 과 같다)
  };
  content: {
    region_codes: string[];                // regions.code · 예 ["KR-HONAM"]
    org_dataset: string | null;            // SC-3 이 고를 기관·기업 자료 열쇠
  };
  report: {
    template_key: "v3-web-print" | string; // SC-4 · 지금은 하나뿐
  };
  roles: {
    counselor_report_access: boolean;      // SC-5 · 기본 false
  };
  display?: {
    accent?: string;                       // 학교 진입 화면만. 공통 화면에는 학교 색을 쓰지 않는다
    cohort_label?: string;                 // "기수" · "학번"
  };
  source: "campus-registry" | "tenant-file";
}

export function resolveTenant(code: string | null | undefined): TenantProfile | null;
export function listTenants(): TenantProfile[];
```

**읽는 차례**: `campus-universities.json` 에 그 코드가 있으면 어댑터가 만든다(지금 PCU) → 없으면
`content/tenants/<code>.json` → 없으면 `null`. **두 곳에 같은 코드가 있으면 던진다**: 하나가 다른 하나를 조용히
덮으면 그 학교 학생의 자리가 바뀐다(`V3_CAMPUS_FIXTURE` 가 실제 학교를 덮지 않는 것과 같은 규칙).

**건드리지 않는 것**: `campus-universities.json` 의 내용 · `campus/registry.ts` · `campus/start-gate.ts` ·
`openAttempt()`. 1단계에서 아무 화면도 이 함수를 부르지 않는다.

**지금 PCU 의 프로필**은 어댑터가 만들고 값은 지금 동작과 글자까지 같아야 한다
(`kind=university` · `participant_model=campus_student` · `tier=PRO` · `cores=registry` ·
`template_key=v3-web-print` · `id_prefix=null`). 같은지를 검사가 센다.

**DB 와의 관계**: 3단계에서 `organizations.workspace_settings JSONB`(지금 쓰는 곳 0)로 옮길 수 있게 타입을
JSON 그대로 둔다. 1~2단계는 파일이라 운영 DB 를 건드리지 않는다.

---

## SC-2 로그인 아이디 이름공간 — P0

> **R36 에서 고쳤다(제안).** 아래 초안의 `id_prefix` 접두어 방식만으로는 모자란다: 신원은
> `(university_code, student_id)` 이고 접두어는 손잡이 배정일 뿐이다. 재현과 수정안·검증·승인 목록은
> [R36_P0_LOGIN_COLLISION.md](R36_P0_LOGIN_COLLISION.md), 패치는 `proposed/sc2-p0.patch`.

**목적**: 한 학교의 명단이 다른 학교 학생의 계정을 덮지 못하게 한다(J-7).

**파일**: `src/lib/shared-core/login-namespace.ts` (DB 없는 순수 함수)

```ts
/** 명단 한 줄이 만들 로그인 아이디. 접두어가 있으면 붙이고, 이미 붙어 있으면 그대로 둔다 */
export function namespacedLoginId(profile: TenantProfile, raw: string): string;

/** 이미 있는 계정을 이 학교가 다시 써도 되는가 */
export function canClaimExisting(opts: {
  tenantCode: string;
  existing: { campus_university_code: string | null } | null;
}): { ok: true } | { ok: false; reason: "OTHER_TENANT" | "NOT_CAMPUS_ACCOUNT" };
```

**규칙**: 이미 있는 아이디가 **다른 학교의 `campus_students` 줄**을 들고 있으면 거절한다(덮지 않는다).
`campus_students` 줄이 없는 계정(개인 회원 · 담당자)도 거절한다: 학교가 발급하지 않은 사람을 그 학교 학생으로
만들지 않는다(`pcu:students rotate` 가 이미 같은 규칙이다).

**배선 자리**: `src/lib/campus/students.ts:124~176` — **배재 소유 파일**이라 계약 CC-002 승인 뒤에 두 줄을
넣는다: 아이디를 만들 때 `namespacedLoginId()`, 찾은 계정이 있으면 `canClaimExisting()`. PCU 의 `id_prefix` 가
`null` 이므로 **배재의 지금 동작은 바뀌지 않는다**. 전주대가 `jju-` 를 들면 그쪽만 갈린다.

**DB 스키마**: 바꾸지 않는다. `users.login_id UNIQUE` 는 그대로이고 접두어가 이름공간을 만든다.

---

## SC-3 콘텐츠 선택 — 기관에 맞는 산업·기관 자료를 고르는 한 자리

**목적**: 결과에 붙는 지역·기관 자료를 기관 프로필이 고르게 한다. 지금은 학생의 `career_profiles.home_region`
하나로 고르고(`me-v3/region.ts:140`), GM 은 충청 파일을 글자로 들고 있다.

**파일**: `src/lib/shared-core/content-select.ts`

```ts
export interface ContentSelection {
  region_codes: string[];        // 앞에서부터 우선
  org_dataset: string | null;    // 자료 열쇠. null 이면 기관 자료를 붙이지 않는다
  reason: "TENANT" | "HOME_REGION" | "NONE";
}

export function contentFor(opts: {
  tenant: TenantProfile | null;
  homeRegion: string | null;
}): ContentSelection;
```

**규칙**: 기관 프로필이 있으면 그 `region_codes` 가 먼저이고 학생의 `home_region` 은 뒤에 붙는다. 프로필이 없으면
지금과 같다. **자료가 0줄인 권역을 숫자로 채우지 않는다**(설계 원칙: 기관 수를 짐작으로 적지 않는다).
**산업팩과 역할팩은 여기서 고르지 않는다**: 그것은 Core 의 콘텐츠이고 응시자가 고른다.

**건드리지 않는 것**: `region.ts` · `report-gm/**` · `data/region/*.json`. GM 이 이 함수를 쓰게 하는 일은 배재
세션이 GM 을 운영에 잇는 날 정한다.

---

## SC-4 결과 렌더 기록과 상태 — 검사 완료 → 분석 → PDF → 관리자 현황

**목적**: 종이를 언제 · 어느 템플릿 판본으로 · 성공했는지를 응시마다 남겨 담당자 화면이 읽게 한다.
**그리는 방식은 바꾸지 않는다**(Playwright 로 웹 결과지를 인쇄 · 미리 만들어 두지 않음).

**표** (`db/proposed/sc_001_v3_report_renders.sql` · **db-chain 에 넣지 않는다**)

```sql
CREATE TABLE IF NOT EXISTS v3_report_renders (
  id               BIGSERIAL PRIMARY KEY,
  attempt_id       BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  snapshot_id      BIGINT REFERENCES v3_snapshots(id) ON DELETE SET NULL,
  template_key     TEXT NOT NULL,                -- SC-1 report.template_key
  result_ui_version TEXT NOT NULL,               -- 그때 그린 화면 판본
  requested_by     BIGINT REFERENCES users(id),  -- 본인 · 담당자 · 운영자
  requester_role   TEXT NOT NULL CHECK (requester_role IN ('self','org','platform')),
  status           TEXT NOT NULL CHECK (status IN ('started','ready','failed')),
  error_step       TEXT,                         -- browser · cookie · open · auth · render (PdfFailed 와 같은 값)
  bytes            INTEGER,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS v3_report_renders_attempt ON v3_report_renders (attempt_id, started_at DESC);
```

- `v3_snapshots` 에 칸을 더하지 않는다. 굳은 결과는 그대로이고 이 표는 **그 결과를 몇 번 종이로 뽑았는가** 다.
- 파일 경로와 해시 칸을 두지 않는다: 지금은 저장하지 않으므로 칸이 늘 빈다. 저장소(S3)를 정하는 날 더한다.
- 운영 표 `job_failures` 는 그대로 둔다(옛 `attempts` 외래키 문제는 이 표가 V3 쪽을 맡으면서 우회된다).

**함수** (`src/lib/shared-core/report-renders.ts`)

```ts
export async function renderStarted(input: {
  attemptId: number; snapshotId: number | null; templateKey: string;
  resultUiVersion: string; requestedBy: number; requesterRole: "self" | "org" | "platform";
}): Promise<number | null>;   // 표가 없으면 null 을 돌려주고 던지지 않는다
export async function renderFinished(id: number | null, out:
  { ok: true; bytes: number } | { ok: false; step: string }): Promise<void>;

/** 담당자 화면이 읽는 모양. 5명 규칙은 이 함수가 아니라 부르는 집계가 지킨다 */
export async function renderStatusByAttempt(attemptIds: number[]):
  Promise<Map<number, { last: "ready" | "failed" | "started"; at: string; count: number }>>;
```

**표가 없으면 던지지 않는다.** 이 표는 운영에 아직 없고, 기록이 실패했다고 종이가 안 나오면 기록이 매출을 붙든다
(`enqueue()` 가 실패해도 던지지 않는 것과 같은 까닭). 실패는 `oplog` 한 줄로 남긴다.

**배선 자리**(계약 CC-004 승인 뒤): `src/app/v3/[attemptId]/result/pdf/route.ts` 의 `drawResultPdf` 앞뒤에
두 줄. 환경변수 `SC_RENDER_LOG=1` 일 때만 적는다. 담당자 화면(`/org/v3/students`)에 `종이 받음 · 날짜` 한 칸을
더하는 일은 배재 소유 화면이라 따로 계약한다.

**흐름**

```
제출 submit() ─▶ v3_snapshots (굳음 · 바뀌지 않음)
             └▶ career_events "attempt.scored" (재분석 대기)
결과 보기 ─▶ /v3/{id}/result  (snapshot.result_model 을 그대로 그림)
종이 받기 ─▶ /v3/{id}/result/pdf ─▶ renderStarted → drawResultPdf → renderFinished   ← SC-4
담당자     ─▶ /org/v3 · /org/v3/students ─▶ campusV3() + renderStatusByAttempt()         ← SC-4 · SC-5
```

---

## SC-5 역할과 권한 — 상담사와 기관 담당자

**목적**: 기관 범위 안에서만 열고, 상담사는 계약 + 본인 동의 + 감사 기록이 셋 다 있을 때만 개인 결과지를 연다.

**새 역할을 만들지 않는다.** `src/lib/rbac.ts` 가 이미 들고 있는 것을 쓴다: 상담사 = `org_staff` +
`canReadParticipantReport()`(세 조건). 지금은 런타임에서 아무도 부르지 않는다.

**파일**: `src/lib/shared-core/actor.ts`

```ts
/** 세션과 memberships 에서 rbac.Actor 를 만든다. 역할을 기관마다 따로 든다 */
export async function actorFor(userId: number): Promise<{
  actor: Actor;                         // rbac.ts 의 타입
  roleByOrg: Map<number, PlatformRole>; // 세션의 전역 역할 하나와 다르다
}>;
```

- `memberships.role` 에 새 값 `counselor` 를 둘지는 계약 CC-005 의 결정 사항이다. 두면 `rbac.ts` 의
  `FROM_LEGACY` 에 한 줄(`counselor → org_staff`)이고 표는 바뀌지 않는다(그 칸이 자유 TEXT).
- 개인 결과지 열람의 **동의 기록**은 기존 `consent.ts` 와 `audit_logs` 를 쓴다. 새 표를 만들지 않는다.

---

## SC-6 기관 격리 검사

**목적**: 기관 A 의 담당자가 기관 B 의 학생 · 응시 · 결과 · 종이 · 내보내기를 열지 못하는 것을 짝으로 센다
(`v3:isolation` 이 사용자 A ↔ B 를 센 방식을 기관 단위로).

**파일**: `scripts/shared-core-isolation.ts` (로컬 DB 전용 · 운영처럼 보이는 주소면 그 자리에서 멈춘다)

자리마다 **A 는 열리고 B 는 막힌다** 를 함께 센다: 막히는 것만 세면 전부 막는 코드가 통과하면서 산 사람도
못 보게 된다. 볼 자리: `/org/v3` · `/org/v3/students` · 내보내기 CSV 셋 · 운영 요약 PDF · 학생 결과 쪽 ·
학생 종이.

---

## 파일 목록 요약

| 파일 | 단계 | 새로/고침 |
|---|---|---|
| `src/lib/shared-core/tenant/{types,resolve,pcu}.ts` | 1 | 새로 |
| `sites/pca-platform/content/tenants/README.md` · `_schema.json` | 1 | 새로 |
| `src/lib/shared-core/login-namespace.ts` | 2 | 새로 |
| `src/lib/campus/students.ts` (두 줄) | 2 | **고침 · 계약 CC-002** |
| `src/lib/shared-core/content-select.ts` | 3 | 새로 |
| `db/proposed/sc_001_v3_report_renders.sql` | 3 | 새로 (차례 밖) |
| `src/lib/shared-core/report-renders.ts` | 3 | 새로 |
| `src/app/v3/[attemptId]/result/pdf/route.ts` (두 줄) | 4 | **고침 · 계약 CC-004** |
| `src/lib/shared-core/actor.ts` | 5 | 새로 |
| `scripts/shared-core-check.ts` · `scripts/shared-core-isolation.ts` | 1 · 5 | 새로 |
| `package.json` scripts 두 줄 | 1 | **공용 파일 · 계약 CC-000 에 적어 알린다** |
