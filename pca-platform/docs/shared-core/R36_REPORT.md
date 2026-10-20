# R36 보고 — Common Core (P0 학번 충돌 · SC-1 기관 프로필)

**완료를 PASS 로 확정하지 않는다.** 아래는 명령 · 종료코드 · 통과/실패 수 · 원 기록의 자리다.
판정은 총괄 PM 이 한다. 이번 회차에 **하지 않은 것**: SC-2 운영 적용 · SC-3~6 배선 · DB 적용 · 배포.

## 1. 커밋 · 브랜치

| | |
|---|---|
| 기준 커밋 | `4f02d79b` (R35) |
| 시작 커밋 | `d1c3ca87` (turn 1 문서) — `feature/shared-core` · `claude/determined-brahmagupta-jwnqs9` 둘 다 |
| 끝 커밋 | 이 문서가 든 커밋(아래 git log). 두 가지에 fast-forward 로만 올렸다(강제 푸시 · rebase 없음) |
| 쓰지 않은 가지 | 운영 `claude/amazing-thompson-w3f2o2` · 배재 dev `claude/careermatri-screen-review-p0c8kb` |

## 2. 바뀐 파일

**제품 코드 · DB · 측정 · 채점 · 등록부 · package.json · lockfile · CLAUDE.md 는 0 줄.**
`evidence/R36/protect/protected-diff.txt` 에 경로 목록과 `git diff` 수(0)와 지문을 적었다.

| 자리 | 파일 | 무엇 |
|---|---|---|
| `src/lib/shared-core/tenant/` (새) | `types.ts` · `errors.ts` · `refs.ts` · `validate.ts` · `campus.ts` · `resolve.ts` · `index.ts` | SC-1 읽기 전용 · 미연결 |
| `scripts/shared-core/` (새) | `tenant-profile.test.ts` · `tenant-boundary.test.ts` · `p0-login-collision.test.ts` · `p0-demo-remark.test.ts` · `sql/r36_p0_detect.sql` | 검사 · 탐지 SQL |
| `scripts/shared-core/test/` (새) | `loader.mjs` · `register.mjs` · `shims/{pg,bcryptjs,next-navigation}.mjs` · `pg-sandbox.sh` · `protect.sh` · `typecheck.sh` | npm 없이 돌리는 하네스 |
| `docs/shared-core/` | 새: `R36_P0_LOGIN_COLLISION.md` · `SC1_TENANT_PROFILE.md` · `R36_REPORT.md` · `proposed/sc2-p0.patch` · `evidence/R36/**` / 고침: `README.md` · `CONTRACTS.md`(CC-001 이름 · CC-002 개정 · CC-002a 추가) · `02_INTERFACES.md`(SC-1·SC-2 머리에 R36 안내 두 덩이) | 문서 |

## 3. SC-1 — 함수와 계약

정본 [SC1_TENANT_PROFILE.md](SC1_TENANT_PROFILE.md). 요약:

- `loadTenantProfile(code, opts?)` → `TenantProfile` (없으면 `TENANT_NOT_FOUND`) · `findTenantProfile` (던지지 않는 쪽) · `listTenantProfiles` · `canonicalProfileJson`
- 칸: `schema_version`(`cm-tenant-profile.1`) · `code`(기존 코드 그대로) · `name` · `kind` · `country` · `market` · `majors.{cores,catalogs}` · `content.{region_codes,org_dataset}` · `source.{kind,file,sha256}`
- 원천: 학교 등록부(읽기만) + `content/tenants/<CODE>.json`(0 벌). 같은 코드 두 원천 → `CODE_CONFLICT`. `V3_CAMPUS_FIXTURE` 를 덧붙이지 않는다
- 오류 11 가지 · 모르는 칸 거절 · 깊게 얼린 객체 · 캐시 없음 · 쓰기 없음
- 본체 `src/lib/tenant/` 는 **어느 가지에도 없다**. 경계는 SC1 문서 §1

## 4. P0 — 재현과 영향

정본 [R36_P0_LOGIN_COLLISION.md](R36_P0_LOGIN_COLLISION.md). 요약:

- 원인: 사람을 `users.login_id`(기관 없는 학번)로 찾는다(`students.ts:97 · :124-125`). 논리 키 `campus_students UNIQUE(university_code, student_id)` 는 있는데 쓰지 않는다
- 재현(가상 2명 · PCU/ZZTEST · 같은 학번): rotate 없음 → 앞 학교 학생 학과 덮임 · 검사 맥락 사라짐 · 뒤 학교 학생 계정 없음. rotate → 이름·열쇠·학교·소속·**응시**가 새 주인에게. 메일 충돌 → 명단 반쪽 적용. 기준선 격리(남의 학생 직접 조작)는 선다
- 수정안: 신원 = (tenant, 기관 내 학번) · 손잡이는 PCU 만 학번 그대로 · 남의 손잡이·메일을 가져가지 않고 줄 거절 · 학교를 바꿔 쓰지 않는 upsert · 미리 보기 학교 안에서만 · 2단계 기관을 아는 로그인
- 패치 `proposed/sc2-p0.patch` — **적용하지 않았다.** 버려지는 worktree 에서만 붙여 검증했다
- 인접 결함 ADJ-1: `db:upgrade` 가 메일 없는 학번 계정을 시연으로 다시 표시 → 담당자 목록에서 빠짐(재현됨 · 운영 NOT VERIFIED)

## 5. 배재 하위 호환

- PCU 아이디 = 학번 그대로 · 재등록 수렴 · 열쇠 유지 · rotate 같은 계정 → `P0-COMPAT-1` · `P0-COMPAT-2` 가 **지금 코드 PASS · 수정 사본 PASS**
- 데이터 이전 없음 · DB 스키마 변경 없음 · SC-1 은 PCU 등록부를 읽기만(전후 sha256 `b029cf0a…572a` 같음, T99)

## 6. 테스트 명령 · 결과

하네스: Node 22.22 `--experimental-strip-types` + `scripts/shared-core/test/register.mjs`.
DB 검사는 `pg-sandbox.sh up` 이 띄운 일회용 PostgreSQL 16(소켓 · 55436)에 `deploy/db-chain.json`
base+upgrade 19 파일을 부은 것(`evidence/R36/sandbox-applied.txt`). 끝에서 `down` 으로 지웠다.

| 명령 | 종료 | 결과 | 기록 |
|---|---|---|---|
| `--test scripts/shared-core/tenant-profile.test.ts` | 0 | 21 · 통과 21 · 실패 0 | `sc1-run.log` |
| `--test scripts/shared-core/tenant-boundary.test.ts` | 0 | 6 · 통과 6 · 실패 0 | `sc1-boundary.log` |
| `bash scripts/shared-core/test/typecheck.sh` (부분) | 0 | tsc 6.0.2 · 파일 9 · 오류 0 | `sc1-typecheck.log` |
| P0 `--test --test-concurrency=1 p0-login-collision.test.ts` (지금 코드) | 0 | 17 · 통과 10 · 실패 0 · todo 7 | `p0-run.log` · `p0-observed.json` |
| 같은 검사 `SC_EXPECT_FIX=1` (수정 사본) | 0 | 17 · 통과 11 · 실패 0 · 건너뜀 6 | `p0-fixed-run.log` |
| `--test p0-demo-remark.test.ts` | 0 | 1 · 통과 1 (= 재현) | `adj1-demo-remark.log` |
| `psql -f scripts/shared-core/sql/r36_p0_detect.sql` | 0 | 빈 DB 전부 0 · 재현 뒤 D1 3 · D2 3 · D3 2 | `detect-clean.txt` · `detect-after-repro.txt` |

실패 0. todo 7 은 **승인 전 결함 확인**이다(지금 코드에서 단언으로 걸린다). 일부러 깬 확인(mutation)은
SC1 문서 §7 — 일곱 번 깨 봤고 일곱 번 다 걸렸고 되돌렸다.

## 7. 측정 · 채점 · DB 보호 증거

`bash scripts/shared-core/test/protect.sh <뿌리> <기록>` 을 **`d1c3ca87` worktree 와 지금 트리** 에서 같은
명령으로 돌렸다. 11 가지 모두 종료 0 이고 **로그가 줄마다 같다**(`protect/compare.txt` 11 × SAME).

| 검사 (package.json 이 가리키는 스크립트) | 종료 | 결과 |
|---|---|---|
| `v2:frozen` | 0 | 잠근 파일 12 · 어긋난 자리 0 (Q1~Q92 · BASIC 48 / STANDARD 68 / PRO 92) |
| `v3:freeze:measure` | 0 | `ME_V3_MEASUREMENT_FREEZE_1` 과 같다 · 기록을 다시 적지 않았다 |
| `v3:freeze` (샌드박스 · pg shim) | 0 | `ME_V3_2_ASSESSMENT_UI_V44` 파일 21 벌 그대로 |
| `v3:result:freeze` | 0 | `ME_V3_RESULT_UI_V77` 파일 25 벌 그대로 |
| `v3:workspace` | 0 | `CAREERMATRI_WORKSPACE_UI_V48` 파일 53 벌 그대로 |
| `db:chain` | 0 | 8 / 8 |
| `campus:check` | 0 | 80 / 80 |
| `v3:scoring` ME · BIZ · EE · CS | 0 × 4 | 각 31 / 31 (사람 열두 벌 golden · `GOLDEN=update` 없이) |

`deploy/db-chain.json` sha256 `9688a926…266f` = `4f02d79b` 의 그 파일 → **diff 0**.
보호 경로 `git diff 4f02d79b` · `git diff d1c3ca87` 둘 다 0 줄 · 그 경로의 새 파일 0.

## 8. NOT VERIFIED

| 항목 | 까닭 |
|---|---|
| 프로젝트 전체 typecheck(`tsc` 5.9.2 · Next 타입) | npm 레지스트리 차단(`connect_rejected`) — 의존성을 깔 수 없다. 부분 검사만 했다 |
| `authorize()` · next-auth · JWT 세션 · 학교 로그인 웹 폼 · 재설정 토큰 끝까지 | `next-auth` · `next` 미설치 · 브라우저 검사 없음. 식별 SQL 만 소스에서 꺼내 돌렸다 |
| 실제 채점 · 결과 화면 · PDF 에서의 귀속 | 응시 줄 귀속까지만. 브라우저·Chromium 검사 미실행 |
| `v3:runtime` · `v3:result` · `campus:walk` · `pcu:campus` 등 브라우저/서버 검사 | `tsx` · Playwright 의존 경로 미설치 |
| 수정 패치의 전체 타입 검사 | 위와 같다 |
| 운영 DB 에 충돌·ADJ-1 이 이미 일어났는가 | 운영 접근 없음. 탐지 SQL 을 사람이 운영에서 돌려야 한다 |
| 담당자 `scope()` 가 두 학교에 걸린 담당자를 어떻게 고르는가 | 이번 재현 밖 |

## 9. 승인이 필요한 변경

| 변경 | 승인 |
|---|---|
| SC-2 1단계 패치(`students.ts` · `manage.ts` · `scripts/pcu-students.ts`) | 총괄 PM · 사업주 · 배재 |
| `campus-universities.json` 에 학교별 `login_namespace` 칸 | 배재 |
| SC-2 2단계(기관을 아는 로그인 · 재설정 · 시도 제한 열쇠) — `auth.ts` 등 | 총괄 PM · 본체 · 배재 |
| ADJ-1 `db/schema_phase2_4.sql` 일괄 UPDATE 조건 | 총괄 PM · 배재 |
| 운영에서 탐지 SQL 실행 | 총괄 PM (운영자) |
| SC-1 첫 연결 지점 · `content/tenants/` 첫 파일(전주대 · 세종) | 사업주 · 전주대 · 세종 (CC-001) |

## 10. 다음 최소 수정

1. **두 번째 학교 명단 업로드 전에** SC-2 1단계 패치를 승인받아 적용하고 `SC_EXPECT_FIX=1` 로 P0 검사를 회귀에 넣는다(FIX 7 · COMPAT 2).
2. 운영에서 `r36_p0_detect.sql` 을 한 번 돌려 D1~D4 · ADJ1 이 0 인지 본다.
3. ADJ-1 한 줄(`campus_students` 가 있는 계정 제외)을 승인받는다.
4. 의존성이 깔리는 환경에서 프로젝트 전체 typecheck 와 `campus:walk` · `pcu:campus` 를 돌린다.
5. 그 뒤 SC-2 2단계(기관 로그인)와 SC-1 첫 연결.
