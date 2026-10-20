# R36 P0 — 기관 사이 학번(로그인 아이디) 충돌

판정: **재현됨 (로컬 일회용 PostgreSQL 16 · 실제 제품 함수).** 운영 DB 에서 일어났는지는
이 세션이 볼 수 없다 → **NOT VERIFIED** (읽기 전용 탐지 SQL 을 준비했다, §8).

**제품 코드와 DB 스키마를 한 줄도 고치지 않았다.** `src/lib/campus/students.ts` ·
`src/lib/campus/manage.ts` · `src/lib/auth.ts` · `db/**` 의 diff 가 0 이다
(`docs/shared-core/evidence/R36/protect/protected-diff.txt`). 수정안은 **패치 파일과 검증 기록**
으로만 둔다(§5). 적용은 총괄 PM 승인 사항이다.

| | |
|---|---|
| 기준 커밋 | `4f02d79b` (R35) · 문서 커밋 `d1c3ca87` 위에서 작업 |
| 사람 | 전부 가상. 학번은 `SC36-` 로 시작한다 |
| 기관 | 이미 있는 코드 둘: `PCU`(운영 등록부 · 읽기만) · `ZZTEST`(`scripts/fixtures/campus-zztest.json`) — **새 기관 ID 없음** |
| 학과 | `PCU26_KOREAN`(인문사회 · `LANG_CORE_V1`) · `ZZ26_ME`(`ZZ_ENG`) |
| 검사 | `scripts/shared-core/p0-login-collision.test.ts` |
| 원 기록 | `evidence/R36/p0-run.log` · `p0-observed.json` (비밀번호 해시는 적지 않았다) |

---

## 1. 무엇이 틀렸는가 — 한 줄

**같은 사람인가를 `users.login_id`(전 세계에 하나인 글자)로 묻는다.** 그런데 그 글자는
기관 없이 학번 그대로다(`students.ts:97`). 그래서 다른 학교가 같은 학번을 올리면 앞 학교
학생을 **같은 사람으로 읽고** 그 줄을 고친다. 신원의 논리적 유일성은 이미 DB 에
`campus_students UNIQUE (university_code, student_id)`(`db/schema_campus_students.sql:32`)로
있는데, **만드는 쪽이 그것을 쓰지 않는다.**

## 2. 경로별 추적 — 확인한 것과 못 한 것

| # | 경로 | 자리 | 상태 | 관찰 |
|---|---|---|---|---|
| 1 | 최초 등록 | `checkStudent` `students.ts:58` → `provisionStudent` `:119` | **VERIFIED** REPRO-0/1 | 아이디 = 학번(`SC36-0000`), 두 학교가 같은 글자를 낸다 |
| 2 | 같은 학교 재등록·수정 | `provisionStudent` `:124-133` (rotate 없음) | **VERIFIED** REPRO-1 · COMPAT-2 | 한 계정으로 수렴 · 열쇠 그대로(`password:null`) · 학과만 맞춤 |
| 3 | 다른 학교 같은 학번 (화면 · 명단) | `addStudentAccount` `manage.ts:236` · `applyImport` `:348` → `:125` 조회 → `campus_students` UPDATE | **VERIFIED** REPRO-2/3 | PCU 학생의 학과가 `ZZ26_ME` 로 덮인다 · 등록부 맥락 `ctx` 가 `null` 이 되어 **그 학생의 검사가 막힌다** · ZZ 쪽은 계정을 못 받는다(`password:null`) · ZZ 명단 0명 |
| 4 | 다른 학교 같은 학번 (rotate · CLI `pcu:students ROTATE=yes`) | `:136-146` `ON CONFLICT (login_id) DO UPDATE` · `:163-172` `ON CONFLICT (user_id) DO UPDATE SET university_code` | **VERIFIED** REPRO-4 | **계정이 통째로 넘어간다**: 이름 `가상 A→가상 B` · 학교 `PCU→ZZTEST` · 소속 `[PCU,ZZTEST]` · 옛 비밀번호 false · 새 비밀번호 true |
| 5 | 명단에 적은 login_id 가 남의 아이디 | `:97` · 위와 같은 길 | **VERIFIED** REPRO-5 | 다른 학번(`SC36-9005`)이어도 아이디가 같으면 PCU 학생의 학과를 고친다 |
| 6 | 메일 충돌 | `INSERT users` `users_email_key` | **VERIFIED** REPRO-6 | `23505` 로 **그 줄에서 던지고** 앞 줄만 적힌 반쪽 적용 |
| 7 | 로그인 식별 | `auth.ts:41-46` `findUserByIdentifier` (SQL 을 소스에서 글자 그대로 꺼내 돌림) | **VERIFIED (SQL)** REPRO-4 · COMPAT-1 | 넘어간 뒤 그 학번은 새 주인에게 풀린다 · `authorize()`·next-auth 자체는 **NOT VERIFIED** (패키지 없음) |
| 8 | 비밀번호 재설정 | `password/forgot/actions.ts:51` (같은 방법) | **VERIFIED (SQL)** REPRO-4 | 같은 계정으로 풀린다 → 재설정 메일이 새 주인 메일로 간다. 토큰 흐름 전체는 **NOT VERIFIED** |
| 9 | 응시·스냅샷·결과 귀속 | `attemptOf` `runtime/session.ts:593` (`user_id` 로 거른다) | **VERIFIED** REPRO-4 | **PCU 학생의 응시가 새 주인에게 보인다**(`pcu_attempt_visible_to_new_holder:true`). 질의는 맞고 신원이 틀렸다. 실제 채점·결과 화면·PDF 는 **NOT VERIFIED** |
| 10 | 다른 학교 담당자 접근 | `ownedBySchool` `manage.ts:166` | **VERIFIED** REPRO-7 · REPRO-4 | 기준선 격리는 선다(ZZ 담당자는 PCU 학생을 직접 못 만진다). **넘어간 뒤에는 뒤집힌다**: PCU 담당자 rotate 거절 · ZZ 담당자 끄기 성공 |
| 11 | 담당자 범위 고르기 | `org/v3/students/actions.ts:20 scope()` | **NOT VERIFIED** | 등록부에 있는 첫 기관을 고른다 — 담당자가 두 학교에 걸리면 어느 쪽인지 정해지지 않는다(이번 재현 밖) |
| 12 | 웹 폼 · 학교 로그인 화면 · 세션(JWT) | `campus/[code]/login` → 공용 `loginAction` | **NOT VERIFIED** | 브라우저와 next 가 없다. 학교 로그인 화면이 **기관을 넘기지 않는** 공용 액션을 쓰는 것은 소스로 확인했다 |

## 3. 영향

| 대상 | 영향 |
|---|---|
| DB 제약 | `users.login_id UNIQUE` 가 **전 세계 하나**를 강제하므로 두 번째 학교의 같은 학번은 새 계정이 될 수 없고, 코드는 그것을 "같은 사람" 으로 처리한다. `campus_students` 는 `user_id` PK 라 한 사람이 한 학교 줄만 가지는데 `ON CONFLICT (user_id) DO UPDATE SET university_code` 가 **학교를 바꿔 쓴다** |
| 인증 | 로그인 질의가 기관을 모른다. 넘어간 계정은 새 주인의 비밀번호로만 열린다 → **앞 학교 학생이 잠긴다** |
| 세션 | JWT 는 `user_id` 를 들고 있어 그 자체는 옳다. 다만 같은 `user_id` 의 사람이 바뀌었으므로 앞 학생의 열린 세션이 남의 계정을 보게 된다(최대 8시간 · NOT VERIFIED) |
| 비밀번호 재설정 | 학번으로 찾으면 넘어간 계정이 나오고 메일은 새 주인 것이다 |
| 응시·결과 | `v3_attempts.user_id` 귀속이 그대로라 앞 학생의 결과·종이가 새 주인에게 열린다. 담당자 집계는 응시에 적힌 `university_code` 로 묶여 학교 칸은 그대로지만 사람은 바뀐다 |
| 담당자 | 앞 학교 담당자는 자기 학생을 잃고(재발급 거절), 뒤 학교 담당자가 그 계정을 다룬다 |
| 범위 | **두 번째 학교가 명단을 올리는 순간부터.** 지금 운영 등록부에는 PCU 하나라 학교 사이 충돌은 아직 없다. 다만 PCU 학번과 같은 글자의 **개인 계정**(학교가 발급하지 않은 계정)이 있으면 rotate 경로에서 가져간다(FIX-6) |

## 4. 수정안 — `(tenant, 기관 내 식별자)` 가 신원이다

**문자열 접두어에 기대지 않는다.** 신원의 보장은 ①과 ③에서 온다. 접두어(②)는 두 번째 학교의
첫 학생이 거절되지 않게 하는 **손잡이 배정**일 뿐이다.

| | 바꾸는 것 | 자리 |
|---|---|---|
| ① | 같은 사람인가를 `campus_students (university_code, student_id)` 로만 찾는다. `users.login_id` 로 찾지 않는다 | `provisionStudent` |
| ② | 손잡이: 이미 나간 학교(PCU)는 학번 그대로, 다른 학교는 `<CODE>:<학번>` | `checkStudent` · `defaultLoginId()` |
| ③ | 손잡이·메일을 다른 계정이 들고 있으면 **가져가지 않고 그 줄을 거절** (`CampusProvisionRejected`) | `provisionStudent` |
| ④ | `campus_students` 갱신은 **같은 (학교, 학번)일 때만** (`ON CONFLICT … WHERE`) — 학교를 바꿔 쓰지 않는다 | `provisionStudent` |
| ⑤ | 미리 보기의 `existing` 을 **그 학교 안에서만** 묻는다 — 남의 학번이 새지 않는다 | `previewImport` |
| ⑥ | 거절은 그 줄만 (`applyImport` · `addStudentAccount` · CLI) — 반쪽 적용이 없다 | `manage.ts` · `scripts/pcu-students.ts` |
| ⑦ | **2단계(인증 승인 필요)**: 학교 로그인 화면이 기관 코드를 함께 넘기고 `authorize()` 가 `(기관, 입력값)` → `campus_students` → `users` 로 찾는다. 그래서 새 학교 학생도 학번만 친다. 비밀번호 찾기도 같은 꼴. 공용 `/login` 은 지금처럼 아이디·메일 | `auth.ts` · `login/actions.ts` · `password/forgot` · `campus/[code]/login` |

### 배재 하위 호환

- PCU 아이디는 학번 그대로다(`BARE_LOGIN_UNIVERSITIES = {"PCU"}`). 이미 나간 계정·열쇠·세션이 바뀌지 않는다.
- 같은 학교 재등록은 같은 계정으로 수렴하고 열쇠를 바꾸지 않는다. rotate 는 같은 계정에서 열쇠만 바꾼다.
- 위 셋을 **고치기 전과 뒤 모두에서** 센다: `P0-COMPAT-1` · `P0-COMPAT-2` (현재 코드 PASS · 수정 사본 PASS).
- 데이터 이전이 **필요 없다**: PCU 줄은 그대로이고 다른 학교의 운영 학생은 0명이다.
- ②의 목록은 패치에서 상수로 두었다. 승인 시 등록부(`campus-universities.json`, 배재 소유) 학교마다
  `login_namespace: "bare" | "scoped"` 한 칸으로 옮기는 안을 권한다(없으면 `scoped`).

## 5. 준비한 패치와 검증 (적용하지 않았다)

- 패치: `docs/shared-core/proposed/sc2-p0.patch` (students.ts · manage.ts · scripts/pcu-students.ts · 230줄)
- `git apply --check` 가 지금 HEAD 에 깨끗이 붙는다.
- 검증: **버려지는 worktree 에 붙여** 같은 검사를 `SC_EXPECT_FIX=1` 로 돌렸다
  (`evidence/R36/p0-fixed-run.log`): **17개 · 통과 11 · 실패 0 · 건너뜀 6**
  (건너뜀 = 수정안이 없애는 REPRO-0/2/3/4/5/6). FIX-1~7 전부 통과 · COMPAT-1/2 통과.
- 같은 검사를 지금 코드로 돌리면(`evidence/R36/p0-run.log`): **17개 · 통과 10 · 실패 0 · todo 7**.
  todo 7 이 전부 **단언에서** 걸린다(참조 오류가 아니다) — FIX 가 실제로 그 결함을 잰다는 뜻이다.
- ⑦(인증 2단계)은 패치에 넣지 않았다: `auth.ts` 는 이번 회차 수정 금지이고 next-auth 가 설치되지
  않아 검증할 수 없다. 필요한 계약만 §6 에 적는다.
- 패치 전체 타입 검사는 **NOT VERIFIED** (프로젝트 의존성이 설치되지 않는다).

## 6. 승인이 필요한 것

| 파일·자리 | 소유 | 무엇 |
|---|---|---|
| `src/lib/campus/students.ts` | 배재 | ①②③④ |
| `src/lib/campus/manage.ts` | 배재 | ⑤⑥ |
| `scripts/pcu-students.ts` | 배재 | ⑥ (CLI 가 거절 줄을 세고 계속한다) |
| `sites/pca-platform/content/campus-universities.json` | 배재 | ② 를 데이터로 옮길 때 `login_namespace` 한 칸 |
| `src/lib/auth.ts` · `src/app/login/actions.ts` · `src/app/password/forgot/actions.ts` · `src/app/campus/[universityCode]/login/*` | 본체 · 배재 | ⑦ 기관을 아는 로그인·재설정 |
| `src/lib/login-throttle.ts` | 본체 | ⑦ 셈 열쇠에 기관 코드를 더한다(학교마다 같은 학번이 서로를 잠그지 않게) |
| DB | — | **스키마 변경 없음.** `campus_students UNIQUE(university_code, student_id)` 와 `users.login_id UNIQUE` 그대로. 선택: `campus_students.university_code` 를 바꾸지 못하게 하는 트리거(별도 승인) |

**시한: 두 번째 학교가 명단을 올리기 전.** 전주대 세션이 `pcu:students` 계열로 명단을 올리기 전에
①~⑥이 먼저 들어가야 한다. ⑦ 전까지 새 학교 학생은 `ZZTEST:학번` 꼴 손잡이로 공용 `/login` 에 들어간다.

## 7. 회귀 테스트 — 켜는 법

```bash
bash scripts/shared-core/test/pg-sandbox.sh up
SC_SHIMS=1 DATABASE_URL='postgresql://postgres@/sc_test?host=/tmp/sc-pg-sandbox/sock&port=55436' \
  V3_CAMPUS_FIXTURE=$PWD/scripts/fixtures/campus-zztest.json \
  node --no-warnings --experimental-strip-types --import ./scripts/shared-core/test/register.mjs \
  --test --test-concurrency=1 scripts/shared-core/p0-login-collision.test.ts
bash scripts/shared-core/test/pg-sandbox.sh down
```

패치를 적용한 날 `SC_EXPECT_FIX=1` 을 붙이거나 `TODO` 를 걷으면 FIX-1~7 이 회귀 검사가 된다.
검사는 소켓 경로에 `sc-pg-sandbox` 가 있는 일회용 DB 에서만 돈다(운영 DB 주소면 시작하지 않는다).

## 8. 운영 데이터 — 이미 일어났는가 (읽기만)

`scripts/shared-core/sql/r36_p0_detect.sql` — `READ ONLY` 트랜잭션 · 수와 `users.id` 만 낸다.

| 검사 | 빈 DB | 재현 뒤 |
|---|---|---|
| D1 학생 소속이 학교 둘 이상 | 0 | **3** |
| D2 학생 소속 ≠ campus_students 학교 | 0 | **3** |
| D3 응시의 학교 ≠ campus_students 학교 | 0 | **2** |
| D4 학교 학생인데 아이디 ≠ 학번 | 0 | 0 |
| ADJ1 학교 학생이 시연으로 표시됨 | 0 | 0 |

(`evidence/R36/detect-clean.txt` · `detect-after-repro.txt`.) **못 세는 것**: REPRO-2 처럼 rotate 없이
**학과만** 다른 학교 것으로 바뀐 줄은 SQL 만으로 가를 수 없다(등록부가 필요하다). 운영에서 0 이
아니면 자동 정정하지 않는다 — 이름·열쇠가 이미 덮였으므로 사람이 한 건씩 되짚는다.

## 9. 인접 결함 ADJ-1 — 배포마다 학번 계정이 시연으로 다시 표시된다

추적 중에 나왔다. `deploy/db-chain.json` upgrade 목록의 `db/schema_phase2_4.sql` 끝 일괄 UPDATE 가
`email IS NULL AND login_id ~ '^[0-9]{8,}$'` 인 줄을 `is_demo = true` 로 바꾼다. 학교가 발급한 학번
계정이 그 꼴이다. `provisionStudent` 가 만들 때 걷지만 **배포마다 도는 `db:upgrade` 가 다시 붙이고**,
담당자 목록·집계는 시연을 거른다.

- 재현: `scripts/shared-core/p0-demo-remark.test.ts` (`evidence/R36/adj1-demo-remark.log`)
  — `before {"is_demo":false,"listed":1} · after {"is_demo":true,"listed":0}`.
- 운영 영향: **NOT VERIFIED.** 운영 학번이 여덟 자리 이상이고 메일 없이 발급됐다면 배포 뒤 담당자 화면에서
  학생이 빠진다. `r36_p0_detect.sql` 의 ADJ1 이 그 수를 센다.
- 고치는 자리는 `db/schema_phase2_4.sql`(DB 스키마 파일 · 이번 회차 수정 금지)이다. 제안: 그 UPDATE 에
  `AND NOT EXISTS (SELECT 1 FROM campus_students cs WHERE cs.user_id = users.id)` 를 더한다. 승인 사항.

## 10. NOT VERIFIED

- `authorize()` · next-auth · JWT 세션 · 학교 로그인 웹 폼 · 비밀번호 재설정 토큰 흐름 끝까지 (패키지 없음 · 브라우저 없음)
- 담당자 `scope()` 가 두 학교에 걸린 담당자에게 무엇을 고르는가
- 실제 채점·결과 화면·PDF 에서의 귀속 (응시 줄의 귀속까지만 봤다)
- 패치의 프로젝트 전체 typecheck · `campus:walk` · `pcu:campus` 같은 브라우저 검사
- 운영 DB 에 이미 일어났는가 (§8 SQL 을 운영에서 사람이 돌려야 한다)
