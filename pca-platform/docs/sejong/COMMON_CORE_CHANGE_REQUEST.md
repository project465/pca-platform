# 공통 엔진 변경 제안서 (COMMON CORE CHANGE REQUEST)

| 항목 | 값 |
|---|---|
| 요청 측 | 세종일자리경제진흥원 전용 세션 |
| 받는 측 | CareerMatri 본체 담당 세션 |
| 작성일 | 2026-10-20 |
| 기준 커밋 | `0bff307c` (`claude/careermatri-screen-review-p0c8kb`, R35 포함). 작성 시점의 그 가지 머리는 `3c67c09d` |
| 상태 | **제안만 한다. 이 세션은 아래 어느 것도 구현하지 않는다** |

이 문서는 세종 전용 서비스가 공통 엔진을 고치지 않고는 닫을 수 없는 여섯 자리를 적는다.
여섯 자리는 배재대·전주대·세종에 똑같이 걸린다. 그래서 한 세션이 제 사정에 맞춰
고치면 다른 세션의 결과가 조용히 바뀐다. 결정과 구현은 본체 담당 세션이 한다.

## 공통 전제

1. **측정·채점·문항 은행·결과 모델은 건드리지 않는다.** 대상 파일은 `measurement-lock.json`,
   Core 마다의 `bank-lock.json`, `assessment-frozen.json` 에 묶인 것들이다.
   아래 어느 제안도 `npm run v3:freeze:measure` 가 기록을 다시 적지 않은 채로 통과해야 한다.
2. **DB 는 더하기만 한다.** 새 표와 NULL 허용 칸만 더하고, 기존 CHECK·NOT NULL·외래키는 고치지 않는다.
   다만 CR-2 는 예외 후보다. CHECK 를 넓힐지는 본체가 고른다.
3. **기본값은 지금 동작이다.** 테넌트 설정이 없으면 배재대(PCU)가 지금과 바이트 단위로 같게 돌아야 한다.
4. **R35 회귀 세트를 매 변경마다 돌린다.** `rb-start-gate`(34/34), `r33-e2e`(54/54), `campus:check`,
   `pcu:cli`, `v3:isolation`, `v3:freeze:measure`, PDF 감사가 대상이다.
   `campus:walk` 의 `campus-agg-check.ts` 가 PCU 응시를 지우므로 이것들을 동시에 돌리지 않는다.
5. **마이그레이션 목록은 한 곳이어야 한다.** 이 위험은 운영 500 사고로 이미 한 번 확인됐다
   (CLAUDE.md "운영 500 복구. 마이그레이션 목록이 두 벌이었다").
   새 `db/schema_*.sql` 은 `scripts/db-init.sh` 와 `scripts/db-upgrade.sh` 양쪽에 같은 순서로 들어가야 한다.
   `db-chain-check` 의 순서 검사에도 함께 넣는다.

---

## CR-1. 대학이 아닌 기관의 테넌트 모델

### 현행 구조
- 기관 등록부 `sites/pca-platform/content/campus-universities.json` (`cm-campus-universities.5`) 은
  대학 → 학년도 catalog → 단과대 → 학과(leaf) → Core 순서로 이어진다. 지금 등록된 곳은 `PCU` 하나다.
- 읽는 쪽은 `src/lib/campus/registry.ts` (`university()`, `leafOpen()` L506, `routingContextOf()` L591 등)다.
- 진입은 `src/app/campus/[universityCode]/…` 경로와 httpOnly 쿠키 `cm_campus`
  (`src/lib/campus/entry.ts`)로 이뤄진다.
- `organizations.code = university_code` 가 맞으면 `campusV3Only()` (`src/lib/campus/org-mode.ts:20`)가
  담당자를 `/org/v3` 로 보낸다.
- 학교가 발급하는 신원은 `campus_students(university_code, student_id, college_code, department_code)`
  이고, 네 칸 모두 NOT NULL 이다 (`db/schema_campus_students.sql:21`).
- 응시 맥락은 `v3_attempts.university_code / college_code / department_code` 와
  CHECK `v3_campus_pair` 로 기록된다 (`db/schema_campus_entry.sql:24-35`).
- 하드코딩된 자리가 있다. `src/lib/me-v3/report-gm/assemble.ts:267` 이 `university("PCU")` 를 직접 부른다.

### 문제점
- 진흥원 참여자에게는 학과와 학번이 없다. 단위는 **사업(프로그램)·회차·참여번호**다.
- 지금 모델에 넣으려면 학과 칸에 사업 코드를 넣는 식의 위장이 필요하다.
  그렇게 하면 학과 집계·학과 → Core 라우팅·PDF 표지가 모두 틀린 말을 하게 된다.
- 기관 유형, 브랜드, 지역 범위, 결과 공개 정책을 둘 자리가 없다.

### 제안 인터페이스
대학 등록부는 그대로 두고, 그 **위에** 테넌트 층을 더한다.

```jsonc
// sites/pca-platform/content/tenants/<tenant_code>.json   schema: "cm-tenant.1"
{
  "tenant_code": "SJEPA",                 // 예시 코드. 확정 전
  "tenant_kind": "AGENCY",                // UNIVERSITY | AGENCY
  "org_code": "SJEPA",                    // organizations.code
  "campus_ref": null,                     // UNIVERSITY 면 campus-universities.json 의 university_code
  "brand": { "name_key": "tenant.sjepa.name", "asset": null, "tokens": "tenants/sjepa/tokens.css" },
  "region": { "home": "KR-SEJONG", "core_cities": ["세종"], "aux_cities": ["대전", "충남", "충북"] },
  "entry": { "mode": "PROGRAM" },         // CATALOG(대학) | PROGRAM(사업)
  "programs": [
    { "program_code": "…", "audience": ["youth", "graduate", "jobseeker", "career"],
      "eligibility": { "residence": ["세종"], "age": null }, "open": false }
  ],
  "routing": { "by": "TARGET_JOB_AREA", "map": { "<job_area>": "<CORE_CODE>" } },
  "content_pack": "tenants/sjepa/",       // CR-4
  "pdf_template": "AGENCY_JOBSEEKER_V1",  // CR-4
  "release_mode": "MANAGER_APPROVAL",     // CR-5
  "counselor_access": true                // CR-6
}
```

```ts
// src/lib/tenant/registry.ts  (새 파일, 읽기 전용)
tenant(code: string): Tenant | null
tenantOfOrg(orgId: number): Promise<Tenant | null>
routeCore(t: Tenant, profile: { audience; majorAlias?; targetJobArea? }): CoreCode | null
tenantMode(userId: string): Promise<"campus" | "agency" | null>  // campusV3Only 를 감싼다
```

```sql
-- db/schema_tenant.sql  (새 파일, 더하기만 한다)
ALTER TABLE v3_attempts ADD COLUMN IF NOT EXISTS tenant_code  TEXT;
ALTER TABLE v3_attempts ADD COLUMN IF NOT EXISTS program_code TEXT;
CREATE TABLE IF NOT EXISTS tenant_participants (
  id             BIGSERIAL PRIMARY KEY,
  tenant_code    TEXT NOT NULL,
  program_code   TEXT NOT NULL,
  participant_no TEXT NOT NULL,              -- 기관이 부여한 참여번호
  user_id        BIGINT NOT NULL REFERENCES users(id),
  cohort_id      BIGINT REFERENCES cohorts(id),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_code, participant_no)
);
```

- 진흥원 응시는 `university_code` 가 NULL 이고 단과대·학과도 NULL 이다.
  이 조합은 기존 `v3_campus_pair` 를 **이미 만족하므로** 그 제약을 고칠 필요가 없다.
- `campus_students` 도 고치지 않는다. 대학이 아닌 신원은 `tenant_participants` 에 둔다.

### 영향 파일
- 새로 만드는 것: `src/lib/tenant/*`, `db/schema_tenant.sql`, `sites/pca-platform/content/tenants/*`
- 고치는 것: `src/lib/campus/org-mode.ts`(`tenantMode` 로 감싸기), `src/lib/campus/entry.ts`(쿠키를 테넌트 일반형으로),
  `src/lib/campus/start-gate.ts`(R35 판정 자리), `scripts/db-init.sh`, `scripts/db-upgrade.sh`, `scripts/db-chain-check.ts`
- PCU 하드코딩 일반화: `src/lib/me-v3/report-gm/assemble.ts:267`

### 마이그레이션 위험
- **중간.** 칸은 NULL 허용으로만 더하므로 되채움(backfill)이 필요 없다.
- 가장 큰 위험은 `start-gate.ts` 다. R35 의 "학교 계정의 개인 응시 차단"과 같은 판정을
  기관 계정에도 걸어야 하고, 이 판정이 두 벌로 갈라지면 R35 이전의 P0 로 돌아간다.
- 마이그레이션 목록을 두 벌로 만드는 사고가 반복되지 않아야 한다(공통 전제 5).

### 검증 방법
- PCU 회귀: R35 세트 전부가 같은 수로 통과해야 한다(34/34, 54/54).
  `campus:walk` 결과도 변경 전후에 같아야 한다.
- 가상 기관 고정자료(`scripts/fixtures/tenant-zztest.json`, AGENCY)로 다음을 확인한다.
  - 기관 계정이 `/v3/start` 를 직접 열지 못한다.
  - 기관 응시에 `university_code` 가 NULL 로 남는다.
  - 기관 담당자가 다른 기관 응시를 보지 못한다.
- `v3:freeze:measure` 가 기록을 다시 적지 않은 채로 통과해야 한다.

---

## CR-2. 일반 구직자·경력자용 검사 체계

### 현행 구조
- `v3_attempts.education_stage` 의 허용값은 `('bachelor','master','phd','postdoc')` 뿐이다
  (`db/schema_v3_runtime.sql:16`).
- 문항 라우팅은 `src/lib/me-v3/runtime/routing.ts` (L143 `crossField`, L171 이하 stage → ug/ms/phd core,
  L240 `eligible`)가 한다.
- Core 의 영역 파일과 체크리스트 키는 전공·학업 언어로 쓰여 있다. 문항 은행은 잠금 파일로 묶여 있다.
- 갈래(`specialization_contract`)가 바꿀 수 있는 것은 `domain_emphasis`, `industry_mapping`,
  `role_mapping`, `examples`, `evidence_action` 뿐이다. 채점·축 수준·영역 규칙·문항 은행·결과 모델은 바꿀 수 없다.
- 경험 입력(`v3_experiences.kind`)에는 이미 `work` 가 있다.
- Core 39개 가운데 학생에게 열린 것은 `BIZ_CORE_V1` 하나다(`open_to_students: true`).

### 문제점
- 고졸·비학위 구직자, 경력 전환자, 신중년을 표현할 단계값이 없다.
  `bachelor` 로 넣으면 기록이 사실과 다르고, 이후 규준이 섞인다.
- 경력자는 경험을 적을 때 고를 어휘(문제·결정·산출물·검증·쓰인 곳)가 학업 장면 위주라 고를 것이 없다.
- 학생 규준과 구직자 응답이 같은 집계에 섞이면 양쪽의 해석이 모두 흐려진다.

### 제안 인터페이스
두 갈래로 나눈다. 본체가 하나를 고른다.

- **(권장) 대상 구분 칸을 더하고 단계값은 그대로 둔다.**
  ```sql
  ALTER TABLE v3_attempts ADD COLUMN IF NOT EXISTS audience TEXT
    CHECK (audience IS NULL OR audience IN ('student','graduate','jobseeker','career_changer','midcareer'));
  ```
  - 문항 경로는 당분간 `ug-core` 로 고정한다. 측정 변화가 없다.
  - 대상에 따른 차이는 **문구 층**에서만 둔다(결과 문구 판본을 하나 올린다).
- **(대안) 단계값 CHECK 를 넓힌다.** `'nondegree'` 를 더하고 `routing.ts` 에서 `ug-core` 로 보낸다.
  기존 CHECK 를 바꾸는 계약 변경이라 본체의 명시 승인이 필요하다.

대상별 사례와 경험 어휘는 갈래가 이미 허용하는 칸으로만 더한다.
`audience_overlay` 를 같은 허용 목록(`examples`, `evidence_action`, `role_mapping`, `industry_mapping`)으로
묶으면 채점은 손대지 않는다. 체크리스트 **키**는 그대로 두고, 경력 장면의 **표시 이름**만
`src/lib/evidence-labels.ts` 계열에 더한다.

성인 장면 문항이 따로 필요해지면 기존 문항을 고치지 않고 **새 은행 판본**으로 낸다(설계 원칙 4).
그 경우 인지 인터뷰와 검증 설계가 먼저 있어야 한다.

### 영향 파일
- `db/schema_tenant.sql` 또는 새 `db/schema_v3_audience.sql`
- `src/lib/me-v3/runtime/routing.ts`(대안을 고를 때만), `src/lib/me-v3/runtime/session.ts`(`openAttempt` 가 audience 를 적는다)
- `src/lib/me-v3/result/text.ko.ts`(문구 판본), `src/lib/evidence-labels.ts`, `src/lib/me-v3/recompute.ts`(키 → 축 연결은 그대로)
- 집계: `src/app/org/v3/page.tsx` 와 집계 함수가 audience 로 나눠 세야 한다

### 마이그레이션 위험
- **권장안은 낮음, 대안은 높음.** 대안은 CHECK 를 바꾸는 계약 변경이고, 검사 화면 동결(`v3:freeze`)의 지문이 바뀐다.
- 규준 오염 위험이 있다. 구직자 응답이 학생 집계에 섞이지 않게 audience 를 스냅샷에 함께 굳혀야 한다.

### 검증 방법
- 같은 응답 벡터에서 audience 만 다른 두 응시가 **같은 `v3_snapshots.payload`** 를 내야 한다. 점수가 대상 구분에 흔들리지 않음을 확인하는 것이다.
- `evidence:check` 를 돌린다. `kind=work` 경험을 넣어도 판정이 CONFIRMED 를 넘지 않아야 한다.
- 집계 분리를 확인한다. 학생 집계 쿼리가 audience 가 `student` 가 아닌 응시를 0 건 읽어야 한다.

---

## CR-3. v3 검사와 사업성과 설문 연동

### 현행 구조
- `survey_items`(전 `before` / 후 `after`)와 `survey_responses` 를 쓴다.
  `survey_responses.attempt_id` 는 `REFERENCES attempts(id)`, 즉 **구판 응시**를 가리킨다(`db/schema_metri.sql:1466-1498`).
- 설문 적용 여부는 `surveyApplies` 가 `test_sessions.kind='org'` 로 판정한다. 집계는 `residencyShift()`(짝지은 전후)와
  `satisfaction()` 이고 둘 다 n<5 칸을 가린다(`src/lib/survey.ts`).
- 표시는 `src/app/org/sessions/[id]/report/page.tsx` 에서 한다. 구판 회차 화면이다.
- v3 응시(`v3_attempts`)에는 설문이 붙지 않는다.

### 문제점
- 지금 운영 중인 v3 흐름에서는 정주 의향·지역기업 인지·만족도가 한 줄도 쌓이지 않는다.
- 진흥원 성과지표 가운데 플랫폼이 댈 수 있는 과정 지표(참여 전후 변화)의 원천이 비어 있다.

### 제안 인터페이스
구판 표는 고치지 않고 v3 전용 표를 둔다.

```sql
-- db/schema_v3_survey.sql
CREATE TABLE IF NOT EXISTS v3_survey_responses (
  v3_attempt_id BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  item_id       BIGINT NOT NULL REFERENCES survey_items(id),
  value         SMALLINT NOT NULL,
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (v3_attempt_id, item_id)
);
ALTER TABLE survey_items ADD COLUMN IF NOT EXISTS item_set TEXT;   -- 예: AGENCY_OUTCOME_V1
```

```ts
// src/lib/survey.ts 에 더하기 (구판 함수는 그대로)
surveyAppliesV3(attemptId): Promise<{ before: Item[]; after: Item[] } | null>  // 테넌트 설정의 item_set
outcomesV3(orgId, { programCode?, from?, to? }): Promise<MaskedOutcome>          // MIN_CELL 적용
```

추적 문항(3·6개월 후 본인 응답 구직 상태)은 **본인 응답**으로만 적는다.
고용보험 등 행정자료로 확정되는 취업 성과를 플랫폼이 산출한다고 쓰지 않는다(CLAUDE.md 앵커 절과 같은 선).

### 영향 파일
- 새로 만드는 것: `db/schema_v3_survey.sql`, `src/app/survey/v3/[attemptId]/…`(또는 기존 경로의 v3 분기)
- 고치는 것: `src/lib/survey.ts`(더하기만), `src/app/org/v3/report/page.tsx`(성과 칸), db 목록 두 파일

### 마이그레이션 위험
- **낮음.** 새 표와 NULL 칸만 더한다.
- 추적 연락에는 별도 동의가 필요하다. 동의 철회 시 응답을 어떻게 처리할지 함께 정해야 한다.

### 검증 방법
- 설문 응답을 넣고 빼도 `v3_snapshots`·`career_profiles` 가 바뀌지 않아야 한다(점수 격리).
- `outcomesV3` 는 n<5 칸을 가려야 한다(`organizations.aggregate_min_cell`).
- 구판 `metri:survey` 는 결과가 변하지 않아야 한다.

---

## CR-4. 기관별 설정·기업 데이터·PDF 템플릿 분리

### 현행 구조
- `sites/pca-platform/content/region-layer.json`(`region-layer.1`)은 **빈 계약**이다.
  규칙에 "기업 이름을 담지 않는다", "다섯 명 미만 칸 집계 금지"가 있다. 읽는 쪽은 `src/lib/me-v3/region.ts` 뿐이다.
- Gold Master(`src/lib/me-v3/report-gm/*`)는 `companies.ts` `orgSet2(file = "data/region/kr-chungcheong-orgs.v2.json")`(L50)으로
  **기업 이름이 든** 자료를 읽는다.
- 지역 문구가 하드코딩돼 있다. `REGION_KO` 와 권역 순서(`companies.ts:55,170`),
  "대전·세종·충청권"(`render3.ts:42,335`, `render4.ts:81`), `by("대전")`(`render3.ts:455`), `assemble.ts:275` 의 대전 문장이 그렇다.
- Gold Master 는 경영(BIZ)만 있고 `scripts/lab` 에서만 돈다. 운영 PDF(`src/app/v3/[attemptId]/result/pdf/route.ts`)는
  웹 결과 화면을 Chromium 으로 인쇄한다.
- 2026-10-20 06:32 에 `render5.ts`(PRO 80쪽 설계)가 더해지는 등 **배재대 세션이 지금도 이 폴더를 고치고 있다.**

### 문제점
- 두 계약이 충돌한다. `region-layer.json` 은 기업 이름을 금지하는데 Gold Master 자료는 이름을 담는다.
- 지역·학교가 코드에 박혀 있어 세종 판을 내려면 공통 렌더러를 고쳐야 한다.
- 기관마다 다른 템플릿·장 구성·표지를 고를 자리가 없다.

### 제안 인터페이스
- **`region-layer.json` 은 그대로 둔다.** 이 파일은 집계·계약 층으로 남긴다.
- **테넌트 콘텐츠 층을 따로 둔다.** 규칙을 갈라 적어 두 계약이 서로를 깨지 않게 한다.
  ```
  sites/pca-platform/content/tenants/<code>/
    orgs.json            schema "cm-tenant-orgs.1"  — 기업·기관 자료 (이름 허용, 아래 규칙)
    region-profile.json  schema "cm-tenant-region.1" — 핵심/보조 도시, 지역 사실(출처 필수), 권역 표기 문구
    pdf.json             schema "cm-tenant-pdf.1"    — 템플릿 코드, 장 켜고 끄기, 표지·고지 문구 키
    copy.ko.json         — 사이트·결과 문구 덮어쓰기 (키만)
  ```
  `cm-tenant-orgs.1` 의 줄 규칙은 다음과 같다.
  - **본사(`hq`)와 사업장(`sites[]`)을 가른다.** `location_basis` 는 `HQ_IN_REGION`, `SITE_IN_REGION_HQ_ELSEWHERE`, `UNCONFIRMED` 중 하나다.
  - `hiring.status` 는 `UNVERIFIED` 만 허용한다.
  - `sources[].checked_on` 이 필수다.
  - 학생·구직자에게 보이려면 `verify` 가 `OFFICIAL_SINGLE` 이상이어야 한다.
  - "추천"이라는 표현은 쓰지 않는다. 고지 문구가 필수이고, 원 출처로 가는 링크가 필수다.
  - 이름을 허용하는 근거는 직업정보 제공 범위다. 공개 공식 정보만 쓰고 알선 행위는 하지 않는다.
    **노무사·행정사 확인 전에는 PREVIEW_ONLY 다.**
- **Gold Master 를 인자화한다.**
  ```ts
  build3(model, { tenant, orgSet, regionProfile, template })   // 지금의 기본값 = PCU·충청권 그대로
  pdfTemplate(tenant): { renderer: "web-print" | "gm"; chapters: ChapterCode[]; cover; notices }
  ```
  하드코딩 문구는 `regionProfile` 에서 읽는다. 값이 없으면 지금 문구를 그대로 쓴다.

### 영향 파일
`src/lib/me-v3/report-gm/{companies,report3,render3,render4,render5,assemble,visuals}.ts`,
`src/lib/me-v3/result/pdf.ts`, `src/lib/me-v3/region.ts`(읽기 함수 추가만),
`sites/pca-platform/content/tenants/*`(새 파일)

### 마이그레이션 위험
- **높음(진행 중인 코드).** Gold Master 는 지금 배재대 작업으로 바뀌고 있다.
  인자화는 **배재대 Gold Master 가 승인·동결된 뒤**에 본체가 해야 한다. 그 전에 손대면 납품물이 흔들린다.
- 기본값이 지금과 다르면 배재대 PDF 문구가 바뀐다.

### 검증 방법
- PCU 고정자료로 렌더한 HTML 이 변경 전후 **차이 0** 이어야 한다(`gm-report3` 출력 비교).
- 세종 고정자료로 렌더한 결과에서 다음 세 가지를 문자열 검사로 확인한다.
  - "대전" 이 들어간 문장이 보조 권역 칸 밖에 0 건이다.
  - `추천` 이 0 건이다.
  - `채용 중` 이 0 건이다.
- `claims:check` 와 PDF 감사를 돌린다.
- `region-layer.json` 은 변경 전후 해시가 같아야 한다.

---

## CR-5. PDF 생성 상태 및 공개 승인 관리

### 현행 구조
- PDF 는 **미리 만들지 않고** 부를 때 그린다(`route.ts` 머리 주석). 웹과 종이가 갈리지 않게 하려는 원칙이다.
- 그린 파일은 `${REPORT_PDF_DIR}/v3/${attemptId}-${Date.now()}.pdf` 로 디스크에 남지만(`result/pdf.ts:266-268`) **DB 기록이 없다.**
- 이벤트는 파일럿 퍼널의 `pdf_opened` 와 실패 기록 `record(attemptId, "pdf_fail")` 뿐이다(`route.ts:107,154`).
  구판의 `pdf_downloaded` 는 구판 경로에만 있다.
- 학생 공개 범위는 등록부의 `student_open` 이 정한다(`registry.ts:506`). 이 값을 바꾸려면 코드 배포가 필요하다.
  CLAUDE.md 확정 결정 표에는 "결과 공개: 학과 담당자 승인 후 공개"가 있다. 구판 흐름(`metri:org`)에는 이것이 있었지만 v3 에는 없다.
- 응시 상태 단추는 R35 의 `src/lib/campus/attempt-state.ts` 가 정한다.

### 문제점
- 관리자 화면에서 개인별 PDF 생성·실패·열람 여부를 볼 수 없다.
- 기관 담당자가 결과 공개를 승인하거나 보류할 수 없다. 공개 단위가 학과 leaf 이고 배포로만 바뀐다.

### 제안 인터페이스
"미리 만들지 않는다" 원칙은 유지한다. 표는 캐시가 아니라 **생성 기록**이다.

```sql
-- db/schema_v3_report_ops.sql
CREATE TABLE IF NOT EXISTS v3_report_renders (
  id               BIGSERIAL PRIMARY KEY,
  attempt_id       BIGINT NOT NULL REFERENCES v3_attempts(id) ON DELETE CASCADE,
  snapshot_id      BIGINT REFERENCES v3_snapshots(id),
  template_code    TEXT NOT NULL,               -- web-print | AGENCY_JOBSEEKER_V1 | …
  template_version TEXT NOT NULL,
  renderer_version TEXT,
  status           TEXT NOT NULL CHECK (status IN ('rendering','ready','failed')),
  file_key         TEXT, sha256 TEXT, bytes INTEGER, pages SMALLINT,
  error_step       TEXT,                        -- PdfStep: browser|cookie|open|auth|render
  requested_by     BIGINT REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at      TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS v3_report_releases (
  attempt_id   BIGINT PRIMARY KEY REFERENCES v3_attempts(id) ON DELETE CASCADE,
  state        TEXT NOT NULL CHECK (state IN ('pending','approved','withheld')),
  decided_by   BIGINT REFERENCES users(id),
  decided_at   TIMESTAMPTZ,
  note         TEXT
);
```

```ts
releaseState(attemptId): "auto" | "pending" | "approved" | "withheld"   // 테넌트 release_mode=AUTO 면 "auto"
approveRelease(actor, attemptIds[], note?)   // audit_logs 에 한 줄씩
withholdRelease(actor, attemptId, note)
logRender(attemptId, …) / renderStatus(attemptId)
```

- 학생 결과·PDF 경로는 `releaseState ∈ {auto, approved}` 일 때만 연다.
- `attempt-state.ts` 에 `결과 공개 대기` 상태를 더한다. `release_mode` 기본값은 `AUTO` 라 PCU 동작은 그대로다.
- 관리자 학생 표에 `결과 공개`, `PDF 상태`, `최근 열람` 칸을 더한다.

### 영향 파일
`src/lib/me-v3/result/pdf.ts`, `src/app/v3/[attemptId]/result/pdf/route.ts`, `src/app/v3/[attemptId]/result/*`,
`src/lib/campus/attempt-state.ts`(R35), `src/app/org/v3/students/*`, `src/lib/campus/export.ts`(CSV 칸 추가), `src/lib/audit.ts`

### 마이그레이션 위험
- **중간.** R35 상태 단추 로직을 건드린다. 기본값이 AUTO 가 아니면 배재대 학생 결과가 닫힌다.
- 공개 승인 이전에 생성된 기존 응시는 `auto` 로 본다(되채움 없음).

### 검증 방법
- `rb-start-gate` 34/34 와 `r33-e2e` 54/54 가 AUTO 에서 변하지 않아야 한다.
- MANAGER_APPROVAL 고정자료에서 다음을 확인한다.
  - 승인 전 학생 결과·PDF 는 404 다.
  - 승인 후 열린다.
  - 보류하면 다시 닫힌다.
  - 승인한 행위가 `audit_logs` 에 남는다.
- PDF 를 그릴 때마다 `v3_report_renders` 에 한 줄이 생기고, 실패하면 `error_step` 이 채워져야 한다.

---

## CR-6. 상담사 결과 열람 동의 및 권한 구조

### 현행 구조
- 역할은 `src/lib/rbac.ts:16` 에 정의된 `platform_super_admin`, `platform_admin`, `org_admin`, `org_staff`, `org_participant`, `individual` 이다.
- `org.participant.report.read` 권한은 **어느 역할에도 없다.**
- `canReadParticipantReport()`(`rbac.ts:166`)는 세 조건이 모두 맞아야 연다.
  - 기관 담당자 이상이다.
  - 계약이 개인 열람을 허용한다.
  - 본인이 동의했다.
  
  `org_staff` 는 동의가 있어도 열 수 없다.
- 동의는 `consents(kind … 'data_visibility', org_id, version, granted)` 에 저장된다(`db/schema_platform.sql:273`). `src/lib/consent.ts` 가 `record`, `withdraw`, `statusOf` 를 제공한다.
- 감사 기록은 `audit_logs`(org_id 포함)에 남는다.
- R35 화면 조사 결과 학생 상세 화면과 역할 관리 화면이 없다(`OPERATOR USABLE: NO`).

### 문제점
- 진흥원 운영의 중심은 상담사가 참여자 결과를 보고 상담하는 것이다. 지금은 그 경로가 막혀 있다.
- 담당 범위(배정된 참여자만)를 표현할 자리가 없다.

### 제안 인터페이스
```sql
-- db/schema_tenant.sql 에 함께
CREATE TABLE IF NOT EXISTS counselor_assignments (
  org_id              BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  counselor_user_id   BIGINT NOT NULL REFERENCES users(id),
  participant_user_id BIGINT NOT NULL REFERENCES users(id),
  program_code        TEXT,
  active              BOOLEAN NOT NULL DEFAULT true,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, counselor_user_id, participant_user_id)
);
```

```ts
// rbac.ts — 역할을 새로 만들지 않고 권한만 더한다 (ROLE_RANK 순서를 건드리지 않기 위해)
"org.participant.report.read.assigned"   // org_staff 에 부여. 테넌트 counselor_access=true 일 때만 효력
canReadAssignedReport({ actor, orgId, participantId }): { ok; reason }
  // ① 같은 기관 ② 배정 줄이 active ③ consents(kind='data_visibility', org_id, granted, 최신 판본) ④ 계약 허용
  // ⑤ 부르는 쪽이 audit_logs 에 actor·대상·사유를 적는다
```

- 동의 범위는 문서 판본마다 고정한다. 기본 범위는 **결과 요약과 PDF** 다.
  경험 메모 원문(`note_text`)은 기본에서 제외하고, 넣으려면 별도 항목으로 받는다.
- 철회하면 다음 요청부터 바로 거절한다. 철회 시각은 감사 기록에 남긴다.

### 영향 파일
`src/lib/rbac.ts`, `src/lib/roles.ts`(구 역할 대응), `src/lib/consent.ts`, `src/lib/audit.ts`,
`src/app/org/v3/students/[id]/…`(새 학생 상세 화면), `db/schema_tenant.sql`

### 마이그레이션 위험
- **중간.** 권한 표에 한 줄을 더하는 일이지만, 인증·라우팅 검사(`auth:check`, `routes:check`)의 기대값이 바뀐다.
- 개인정보 처리방침과 동의서 문안을 고쳐야 한다. 법률 확인이 필요하다.

### 검증 방법
행렬 시험을 돌린다. 기대값은 다음과 같다.

| 경우 | 기대 |
|---|---|
| 배정 없음 | 거절 |
| 다른 기관 | 거절 |
| 동의 없음 | 거절 |
| 동의 철회 뒤 | 거절 |
| 계약 불허 | 거절 |
| 다섯 조건 충족 | 허용, `audit_logs` 에 한 줄 |

- PCU(`counselor_access` 없음)에서는 결과가 지금과 같아야 한다.
- 다음 검사를 통과해야 한다: `auth:check`, `routes:check`, `secrets:check`.

---

## 받는 쪽에 요청하는 결정

| # | 결정 | 막히는 세종 작업 |
|---|---|---|
| D1 | CR-1 테넌트 층을 받아들일지, 코드 이름 | 진흥원 진입·참여자 발급 |
| D2 | CR-2 권장안(`audience`)과 대안(CHECK 확장) 중 무엇을 고를지 | 구직자·경력자 응시 |
| D3 | CR-4 를 언제 할지 (배재대 Gold Master 동결 뒤를 권장) | 세종 PDF |
| D4 | CR-5 기본값을 `AUTO` 로 둘지 | 결과 공개 승인 |
| D5 | 기업 이름이 든 테넌트 콘텐츠 층의 법률 확인 주체 | 기업 탐색 장 공개 |

## CR-7. `drawPagePdf` 쪽 여백·머리말을 부르는 쪽이 고를 수 있게 (2026-10-20 추가)

| 항목 | 내용 |
|---|---|
| 지금 | `src/lib/me-v3/result/pdf.ts` 의 `drawPagePdf` 가 A4 · 여백 14mm · 머리말·꼬리말을 늘 켠다 |
| 세종에서 걸린 자리 | 결과지를 편집 디자인(짙은 파랑 표지 · 장 구분 쪽)으로 바꿨다. 표지를 종이 끝까지 채울 수 없어 14mm 안쪽에 파란 판을 세웠고, 표지에도 머리말 한 줄이 찍힌다 |
| 제안 | `PageDrawOpts` 에 `margin?`(기본 14mm 그대로)과 `headerFooter?: "all" \| "none"` 을 더한다. 첫 쪽만 머리말을 빼는 것은 Chromium 템플릿으로 안 되므로, 쪽 안의 CSS 로 그리게 `none` 을 고를 수 있으면 된다 |
| 기본값 | 지금과 바이트까지 같다. 배재대·전주대 PDF 는 바뀌지 않는다 |
| 세종이 하는 것 | 결정 전까지 14mm 안쪽 표지로 둔다(`src/sejong/ui/report-doc.tsx`). 공통 파일은 고치지 않았다 |

세종 세션은 결정이 오기 전까지 다음만 한다.
- `docs/sejong/` 안의 설계
- PREVIEW_ONLY 자료
- 고정자료(fixture)
