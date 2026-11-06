# 학교·기관 학생 MAT 경로 정리 (2026-11-06)

브랜치 `work/campus-mat` (운영 커밋 528b0277 에서 시작). 운영 배포 · 운영 DB 변경은 하지 않았다.
로컬에 PostgreSQL 이 없어(도커 · psql · 설치본 없음) DB 를 띄워 눌러 보지 못했다. 아래는 코드와
DB 없이 도는 점검(`campus:check` · 타입 검사 · 빌드)으로 확인한 것이다.

---

## 1. 경로: 무엇이 있어야 학생 MAT 이 열리는가

```
학교 등록부 한 줄(campus-universities.json, 코드 PCU · JJU …)
  └ 기관(organizations.code = 등록부 코드)            /admin/organizations/new
      └ 담당자 계정(memberships.role = org_admin)      /admin/organizations/{id}
          └ 학생 계정(users + memberships student + campus_students)
                                                    /org/v3/students · CSV 등록
MAT 좌석 묶음(campus_mat_pools, university_code 로 묶임) /admin/campus-mat (슈퍼관리자)
  └ 담당자가 학생에게 연다 → entitlements(kind='track', campus_pool_id) /org/v3/students
      └ 학생 MAT 전부 열림(activeTrack.on, source=school)
```

**옛 계약(`contracts`) · 좌석(`seats`) · 코호트(`cohorts`)는 이 길에 없다.** 그것은 옛 PCA 검사용이다.

- 학교 MAT 묶음은 계약 표를 보지 않는다. 묶음과 계약을 잇는 것은 묶음의 `memo`(계약 번호) 한 칸뿐이다
- 코호트 · 회차는 학교 진입(V3) 학생에게 쓰지 않는다. 학생 · 학과는 `campus_students` 가 든다
- 학교 진입(`/campus/{코드}`)은 `campus_students` 줄과 학과가 READY(또는 전공 고르는 자리)인지만 본다
- 담당자가 주는 리포트 이용권(`CM_V3_CAMPUS_PRO`)도 `이 학교 발급 계정 + 채점된 응시 1건 이상` 만 본다

**함정(이번에 막았다).** 학교 등록부 기관에 옛 계약을 한 줄이라도 넣으면 `campusV3Only()` 가 거짓이 되어
담당자 메뉴가 옛 화면 11줄(계약 · 좌석 · 회차, 전부 0)로 바뀐다. 그런데 기관 상세 화면(`/admin/organizations/{id}`)이
배재대에 `계약이 없습니다 · 계약 등록` 을 띄우고 있어서, 슈퍼관리자가 "계약 먼저" 로 읽고 누르면 바로 그 함정에 빠졌다.
학교 MAT 은 그래도 열리지 않는다.

### MAT 기능별 열림 조건 (`src/lib/mat-access.ts` · `src/lib/track.ts`)

| 상태 | 공고 분석 | 지원서 문장 · 면접 · 파일 · 자료 | 결제 입구 |
|---|---|---|---|
| 학교 좌석이 열림(`activeTrack.on`, source school) | 기간권 한도(30일당 20) | 전부(30일당 한도) | 안 보임. 추가 이용권도 안 팖 |
| 학교 좌석 없음 · 개인 이용권 없음 | 무료 1회 + 검사 끝내면 1회 | 막힘 → `/mat/pricing?from=free` | 보임 |
| 개인 이용권 | 기간권 한도 | 전부 | 안 보임 |

- 첫 로그인 비밀번호를 바꾸기 전(`must_reset_pw`)에는 검사 · 결과 · MAT 에 들어가지 못한다
- 학교 좌석 기간은 담당자가 **연 날부터** 183일(6개월) · 365일(1년)이다. 개인 기간이 남아 있으면 그 뒤에 이어 붙는다
- 좌석이 30일 안에 끝나는 학생에게만 개인 이용권 안내가 선다(`SchoolEnding`)

### 확정: 학교 MAT 이 없는 학교 학생은 개인 무료 → 개인 결제로 빠진다

코드에서 확인했다. `matAccess()` 는 학교 소속을 보지 않고 `activeTrack()` 만 본다. 학교 좌석 줄이 없으면
그 학생은 개인 회원과 똑같이 무료 2회를 쓰고, 다 쓰면 결제 입구(`Paywall`)와 요금 화면(`/mat/pricing`)을 받는다.
배재대 실제 학생 1명이 지금 이 상태다.

**고친 것**: 그 두 화면 위에 `○○대학교 계정이에요. 학교가 MAT을 열어 주면 결제 없이 모두 쓸 수 있어요.
언제 열리는지는 학교 담당자에게 물어보세요.` 가 선다(`CampusWait`). 이용권 화면(`/mat/pass`)에는 전부터 같은
뜻의 줄이 있었다. 개인 결제 길은 막지 않았다(막을지는 대표 결정).

### 전주대 TRACK_30D 한 줄의 출처

학교 좌석이 아니다(`campus_pool_id` 없음). 개인 무료는 이용권 줄을 만들지 않는다(무료는 `mat_free_claims` 에만 적힌다).
그러므로 셋 가운데 하나다.

1. 개인 결제: `order_id` 가 있다
2. 운영자 시험 이용권: `/admin/partners` 의 `grantTestPassAction`(미리보기 계정에만 30일, `order_id` 없음, 감사 `mat.preview.pass`)
3. 점검 스크립트가 남긴 줄: `order_id` 없음, 감사 기록 없음

`matUntilOf` 주석에 "2026-11-02 운영 시험: 좌석이 없는 학교의 명단에 '12-02까지' 가 섰다" 가 있다. 11-02 + 30일 = 12-02 라서
**2번(11-02 운영 시험 이용권)일 가능성이 높다.** 확정하려면 운영에서 읽기만 하는 아래 질의를 돌린다.

```sql
SELECT e.id, e.user_id, e.order_id, e.campus_pool_id, e.created_at, e.ends_at,
       EXISTS (SELECT 1 FROM mat_preview_users p WHERE p.user_id = e.user_id) AS preview_user,
       (SELECT count(*) FROM audit_logs a WHERE a.action = 'mat.preview.pass'
          AND a.target_id = e.user_id::text) AS preview_grants
  FROM entitlements e JOIN campus_students cs ON cs.user_id = e.user_id
 WHERE cs.university_code = 'JJU' AND e.kind = 'track' AND e.status = 'active';
```

이 학생은 지금 MAT 이 전부 열려 있지만 화면에는 `개인` 으로 나온다. 담당자 명단의 MAT 칸은 이 줄을 세지 않는다(주문도 학교 좌석도 없는 줄).

---

## 2. 슈퍼관리자 · 담당자가 화면에서 혼자 끝낼 수 있는가

| 단계 | 누가 | 화면 | 상태 |
|---|---|---|---|
| 기관 만들기(코드 = 등록부 코드) | 슈퍼관리자 | `/admin/organizations/new` | 됨 |
| 담당자 계정 발급 | 슈퍼관리자 | `/admin/organizations/{id}` 담당자 칸 | 됨 |
| 계약 등록 | 슈퍼관리자 | **학교 기관에는 쓰지 않는다.** 계약 번호는 묶음 메모에 적는다 | 함정을 막았다 |
| 좌석 묶음 만들기 | 슈퍼관리자 | `/admin/campus-mat` | 됨. 학교별 준비 상태 표를 더했다 |
| 학생 일괄 발급(CSV) | 담당자(org_admin만) | `/org/v3/students/import` | 됨. 슈퍼관리자는 이 화면에 못 들어간다(CLI `pcu:students` 는 있다) |
| MAT 열기 | 담당자 | `/org/v3/students` 의 MAT 칸(지금 조건의 학생 전부) · 학생 줄의 MAT 열기/닫기 | 됨 |
| 사용 현황 | 담당자 | 같은 칸의 집계 셋(연 학생 · 30일 사용 · 상담, 5명 미만은 숨김) | 됨 |
| 사용 현황 | 슈퍼관리자 | `/admin/campus-mat` 묶음 표(연 학생/인원) · 준비 상태 표 | 됨 |

고친 곳:

- `/admin/organizations/{id}`: 학교 등록부 기관이면 `계약 등록` 대신 `MAT 인원 넣기`, 그 학교의 MAT 묶음 표, 옛 계약 칸에 "이 학교에는 없는 것이 맞습니다"
- `/admin/contracts/new`: 학교 등록부 기관이면 확인 칸을 켜지 않는 한 거절하고 `/admin/campus-mat` 로 안내
- `/admin/campus-mat`: `?uni=PCU` 로 학교가 미리 골라진다. **학교별 준비 상태**(기관 · 담당자 수 · 학생 계정 수 · MAT 열린 학생 · 열 수 있는 인원)를 한 표로. 데모 학교 이름 뒤에 `(데모)`
- 담당자 MAT 칸: 묶음은 있는데 열 수 있는 것이 없을 때(기간 지남 · 인원 다 씀) 단추만 사라지고 까닭이 없었다. 까닭과 다음 할 일을 적는다. 묶음이 없을 때 "그 전까지 학생은 MAT 무료 분석만 쓸 수 있습니다" 를 더했다
- 담당자가 조건으로 한꺼번에 열 때 시연 · 검사 계정에는 좌석을 쓰지 않는다(전과 같다. 데모 학교만 예외)

---

## 3. 계약 전 데모: `체험대학교`(코드 `DEMO`)

**제안: 데모 학교 한 곳을 등록부에 두고, 그 학교의 기관 · 학생 · 좌석을 전부 시연으로 표시한다.**
체험 좌석을 실제 학교에 주는 방식은 쓰지 않는다. 그러면 계약 전 실제 학생 개인정보가 들어오고, 실제 학교 집계에 섞인다.

만든 것(코드만):

- 등록부에 `DEMO` 체험대학교 한 줄(`demo: true`). 공과대학 · 기계공학과(ME) · 전기전자공학과(EE) · 컴퓨터공학과(CS).
  세 자리 모두 전주대에서 이미 EXACT 로 쓰는 Core · 갈래다. `campus:check` 통과
- `isDemoSchool()` 한 곳이 데모 여부를 정한다(`src/lib/campus/registry.ts`)
- 데모 학교 학생 계정은 만들 때 `users.is_demo = true` 로 둔다(전에는 학교 학생을 무조건 false 로 되돌렸다).
  학생 아이디 머리도 `demo-` 라 DB 트리거가 먼저 시연으로 표시한다
- `/admin/organizations/new` 로 `DEMO` 기관을 만들면 `organizations.is_demo = true` 로 들어간다
- 데모 학교 담당자 화면(집계 · 명단 · CSV · PDF 요약)은 시연 계정을 거르지 않고 보고, 집계 화면에 "데모 학교입니다" 한 줄이 선다

섞이지 않는 까닭: 운영 첫 화면 · 퍼널 · MAT 퍼널 · 학교 집계는 `users.is_demo` / `organizations.is_demo` 를 이미 거른다.
학교 좌석은 금액이 없어서 매출 · 정산에 들어갈 줄이 없다(`orders` 없음). 데모 묶음은 `university_code = 'DEMO'` 라 실제 학교 묶음과 섞이지 않는다.

**데모 준비 순서(운영 배포 뒤, 대표가 화면에서)**

1. `/admin/organizations/new`: 코드 `DEMO`, 한국, 대학, 이름 `체험대학교`
2. `/admin/organizations/{id}`: 담당자 발급. **아이디를 `demo-` 로 시작**(예: `demo-staff`) 해야 담당자 계정도 시연으로 표시된다
3. `/admin/campus-mat?uni=DEMO`: MAT 1년, 인원 20, 메모 `데모`
4. 데모 담당자로 로그인 → `/org/v3/students/import` 에 지어낸 학생 CSV(학번 `20260001`… 이름 `학생 하나`…, 학과 코드 `DEMO26_ME` 등)
5. `/org/v3/students` MAT 칸에서 열기 → 학생 `demo-20260001` 로 로그인해 MAT 화면

학교 담당자 앞에서는 4·5 를 직접 눌러 보이면 된다(계정 발급 → MAT 열기 → 사용 현황).

대표 결정이 필요한 것: 데모 학교 이름(지금 `체험대학교`), `/campus/demo` 가 공개 주소로 열려 있어도 되는지(지어낸 학교라 개인정보는 없다).

---

## 4. 운영에서 배재대 · 전주대에 좌석 묶음 넣는 절차 (운영에는 하지 않았다)

### 정해야 할 값(대표)

| 값 | 배재대(PCU) | 전주대(JJU) |
|---|---|---|
| 이용권 | 6개월(183일) 또는 1년(365일) | 같음 |
| 인원 | ? 명 | ? 명 |
| 담당자가 열 수 있는 마지막 날 | ? (예: 2027-02-28) | ? |
| 메모 | 계약 번호 또는 `계약 전 무상 시범` | 같음 |

학생 기간은 마지막 날까지가 아니라 **연 날부터** 183/365일이다. 마지막 날을 학기 끝으로 잡아도 그날 연 학생은 1년을 쓴다.

### 화면 경로(권장, 감사 기록이 남는다)

1. 슈퍼관리자로 `/admin/campus-mat` → `학교별 준비 상태` 에서 PCU · JJU 의 기관 · 담당자 · 학생 계정 수를 본다
2. 담당자가 `없음` 이면 `/admin/organizations/3`(PCU) · `/admin/organizations/9`(JJU) 에서 담당자를 발급한다
3. `/admin/campus-mat` 인원 넣기: 학교 · 이용권 · 인원 · 마지막 날 · 메모 → `인원 넣기`
4. 학교 담당자가 `/org/v3/students` 에서 학생을 CSV 로 등록하고 MAT 칸에서 연다
   (배재대 실제 학생 1명은 이미 계정이 있으니 열기만 하면 된다)
5. **`/admin/contracts/new` 로 계약을 넣지 않는다**

### DB 로 넣어야 할 때(화면을 못 쓸 때만)

```sql
-- 먼저 확인(읽기만)
SELECT code, duration_days, active FROM products WHERE code IN ('CAMPUS_MAT_6M','CAMPUS_MAT_12M');
-- 넣기(값은 대표가 정한 것으로)
INSERT INTO campus_mat_pools (university_code, product_code, seats, grant_until, memo, created_by)
VALUES ('PCU', 'CAMPUS_MAT_12M', <인원>, '<YYYY-MM-DD>', '<계약 번호>', <슈퍼관리자 users.id>);
```

DB 로 넣으면 `campus.mat.pool.create` 감사 기록이 남지 않는다. 화면을 권한다.

---

## 5. 점검

- `npm run typecheck` 통과
- `npm run campus:check` 통과(DEMO 포함)
- `npm run build` 통과
- `npm run copy:screens`: 이번에 고친 파일에서는 늘지 않았다. 손대지 않은 운영자 화면 6곳(partners · v3-pilot · business · readiness · push)이 기준보다 늘어 있어 실패한다(이 브랜치 시작 전부터)
- `npm run copy:audit`: 시작 전과 같은 53건(이번 변경으로 늘지 않음)
- `npm run campus:mat`: DB 가 필요해 돌리지 못했다

확인 못 한 것: 실제 DB 로 묶음 만들기 → CSV → 열기 → 학생 MAT 화면을 눌러 본 것, 데모 학생 `is_demo` 가 실제로 true 로 남는지,
운영 DB 의 `organizations.is_demo` 값(배재대 · 전주대가 옛 이관으로 시연 표시가 붙어 있는지).
