# R37 Gate P0 — SC-2 학번 충돌 · ADJ-1 재부착 검증 보강

상태: **READY FOR REVIEW** (VERIFIED ≠ PM PASS). 운영 인증 코드 · `students.ts` · DB 스키마에
**패치를 적용하지 않았다.** 수정안은 `docs/shared-core/proposed/sc2-p0.patch` 그대로이고, 확인은
그 패치를 **저장소 밖 사본**에 적용해 돌린 것이다. 운영 DB 와 운영 배포본은 보지 못했다.

환경: Node 22.22 · `--experimental-strip-types` · 일회용 PostgreSQL 16(`pg-sandbox.sh`, 소켓만, 회차마다 새로) ·
`SC_SHIMS=1` 이라 `pg` 는 psql 을 부르는 **shim** 이다(실제 `pg` 패키지 아님). next-auth · 브라우저 없음.

---

## 1. 식별자 다섯을 가른다

| 식별자 | 어디 있는가 | 고유 범위 | 누가 정하는가 |
|---|---|---|---|
| 내부 사용자 ID | `users.id` (BIGSERIAL) | 전역 | DB |
| 학번 | `campus_students.student_id` | `(university_code, student_id)` UNIQUE — **학교 안에서만** | 학교 명단 |
| 로그인 손잡이 | `users.login_id` | **전역** UNIQUE | 지금은 학번 그대로(`loginId()`) |
| 기관(tenant) ID | `organizations.code` · `campus_students.university_code` · `v3_attempts.university_code` | 전역 | 운영 |
| 응시 소유자 | `v3_attempts.user_id` → `users.id` | 응시 하나 | 응시를 연 세션의 `sub` |

**문제의 뿌리**: 학교 안에서만 고유한 학번을 전역 고유인 손잡이로 그대로 쓴다. 두 번째 학교가 같은 학번을 올리면
손잡이 하나에 두 사람이 걸린다.

## 2. SC-2 여덟 질문

| # | 질문 | 지금 코드 | 수정안 사본 (1단계) | 근거 |
|---|---|---|---|---|
| 1 | 로그인이 학교 + 학번을 함께 가리키는가 | **아니다.** `findUserByIdentifier` 가 `login_id OR email` 로 전역에서 찾는다 | 손잡이가 `<CODE>:<학번>` 으로 갈려 **충돌은 막힌다.** 그러나 학교 로그인 화면이 기관 코드를 넘기지 않으므로 다른 학교 학생이 학번만 넣으면 제 계정으로 못 들어간다 → **2단계 필요** | REPRO-0 · FIX-10 · **RISK-1 (TODO 그대로)** |
| 2 | 두 학교의 같은 학번이 함께 설 수 있는가 | 아니다 — 한 계정으로 합쳐진다 | 선다 · 각자 계정 | REPRO-2 · FIX-1 |
| 3 | 비밀번호 재설정이 남의 학교 계정으로 가는가 | **간다.** rotate 로 넘어간 뒤 찾기가 같은 `users.id` 로 풀린다 · 앞 학교 학생의 비밀번호가 죽는다 | 학번 그대로는 배재 학생 · 다른 학교 손잡이는 그 학생 | REPRO-4 (`forgot_sql_resolves_to` 같음 · `pcu_password_still_works:false`) · FIX-8 |
| 4 | 명단 업로드가 소속 · 권한을 바꾸는가 | 바꾼다. rotate 없이도 `campus_students` 학과가 덮이고(PCU 목록에 ZZ 학과로 선다 · ZZ 목록 0) rotate 면 `memberships` 가 `[PCU, ZZTEST]` 가 된다 | 바꾸지 않는다 | REPRO-2 · REPRO-3 · REPRO-4 · FIX-2 · FIX-9 |
| 5 | 응시 · 스냅샷 · PDF 소유가 넘어가는가 | 넘어간다. 앞 학교 학생의 응시가 새 소유자에게 보인다(`pcu_attempt_visible_to_new_holder:true`) — PDF 는 같은 `v3_attempts.user_id` 로 열리므로 같은 길이다(PDF 는 정적 판단 · 그리지 않았다) | 넘어가지 않는다 | REPRO-4 · FIX-7 |
| 6 | 세션 · JWT 의 기관 경계 | JWT `sub` = `users.id` · 소속은 요청마다 DB 에서 다시 읽는다 · **기관 claim 이 없다.** 그래서 넘어간 계정은 같은 `sub` 로 새 소속을 받는다 | 계정이 넘어가지 않으므로 그 길이 없다 | `src/lib/auth.ts` jwt 콜백(정적). **실제 next-auth 로는 NOT VERIFIED** |
| 7 | 메일 충돌 때 부분 저장 | 그 줄에서 적용이 던지고 **앞 줄은 남는다**(전부 아니면 전무가 아니다) | 그 줄만 거절하고 뒤 줄은 적힌다(줄 단위 · 설계된 동작) | REPRO-6 · FIX-5 |
| 8 | 배재 기존 로그인 | 아이디 = 학번 그대로 · 재등록은 같은 계정 · rotate 는 같은 계정 | **같다**(고치기 전후 모두 통과) | COMPAT-1 · COMPAT-2 · REPRO-1 |

## 3. P0-3 PASS · TODO · SKIP 을 섞지 않는다

`scripts/shared-core/p0-login-collision.test.ts` 21개. **TODO 와 SKIP 은 PASS 에 넣지 않는다.**

| 실행 | PASS | TODO | SKIP | FAIL | 로그 |
|---|---|---|---|---|---|
| 지금 코드 | 10 (REPRO-0~7 · COMPAT-1/2) | 11 (FIX-1~10 · RISK-1 — 전부 단언에서 걸린다) | 0 | 0 | `evidence/R37/p0-current.log` · `p0-current-observed.json` |
| 수정안 사본 `SC_EXPECT_FIX=1` | 14 (REPRO-1 · REPRO-7 · COMPAT-1/2 · FIX-1~10) | 1 (RISK-1 — 여전히 걸린다) | 6 (REPRO-0 · 2 · 3 · 4 · 5 · 6 — 재현 대상 동작이 사라졌다) | 0 | `evidence/R37/p0-patched.log` · `p0-patched-observed.json` |

켜지고 꺼지는 것:

- **지금 코드에서 켜져 있는 것**: REPRO 여덟 · COMPAT 둘. FIX 열과 RISK-1 은 `todo` 라 걸려도 실패로 세지 않는다
- **수정안 사본에서 꺼지는 것**: 수정안이 없애는 동작을 재현하는 REPRO 여섯(`SKIP`). 그 자리를 FIX 가 센다
- **수정안 사본에서 켜지는 것**: FIX-1~10 이 `todo` 를 벗고 단언이 선다
- **어느 쪽에서도 TODO 인 것**: RISK-1. 2단계(학교 로그인이 기관 코드를 넘기고 `authorize()` 가 `(기관, 학번)` 으로 찾는다)를 승인 · 구현하기 전에는 켜지 않는다
- R37 에서 FIX-10 과 RISK-1 이 지금 코드에서 **빈 통과**를 하던 것을 고쳤다: 두 사람이 같은 `users.id` 면 그 자리에서 걸리게 `b ≠ a` 전제를 넣었다

수정안 사본에서 보호 묶음 11개가 전부 종료코드 0 이다(`evidence/R37/protect/patched-copy/summary.tsv`).

## 4. ADJ-1 — upgrade 를 다시 부으면 학교 학생이 시연이 된다

`scripts/shared-core/p0-demo-remark.test.ts` 6/6 (`evidence/R37/p0-demo-remark.log`)

| 시험 | 본 것 |
|---|---|
| ADJ-1a 처음 | 나중에 만든 학번 학생은 시연이 아니다(INSERT 트리거는 숫자 학번만으로 표시하지 않는다) |
| ADJ-1b 다시 부음 | `{"demo":false,"listed":1}` → `{"demo":true,"listed":0}` · 실패한 파일 0 |
| ADJ-1c | 학교 줄이 없는 시드 꼴 계정이 표시된다 — 그 UPDATE 가 원래 노린 대상이다 |
| ADJ-1e | 다시 부어도 `is_demo` 말고 사람 · 소속 · 학교 줄 지문이 같다 |
| ADJ-1d 수정안 | 학교 학생만 걷고 시드는 그대로 · 두 번 돌려도 같다 · upgrade 를 다시 부으면 또 표시된다 → **목록 맨 뒤에 넣어야 한다** |
| DET-1 탐지 SQL | 쓰는 문장 0 · `BEGIN TRANSACTION READ ONLY` · `ROLLBACK` · DB 지문 전후 같음 · READ ONLY 에서 UPDATE 거절 |

- **처음 배포와 다시 배포를 가른다**: 첫 upgrade 는 해롭지 않다. 그 뒤 **모든** upgrade 가 학교 학생을 다시 표시한다
- **이미 부어진 migration 원본(`schema_phase2_4.sql`)을 고치지 않는다.** 따로 한 파일
  `docs/shared-core/proposed/adj1-campus-students-not-demo.sql` 을 제안하고 `db-chain.json` 에 넣지 않았다
- 탐지 SQL 을 운영에서 돌리지 않았다(운영자 승인 전)

## 5. 아직 아닌 것

- 실제 `pg` 패키지 · 실제 next-auth · 브라우저로 돌리지 않았다(shim 결과다)
- 운영 DB 에 학교가 둘 이상 있는지, 이미 겹친 학번이 있는지 모른다. 탐지 SQL 의 D1~D4 가 센다
- 2단계(기관 코드를 넘기는 로그인)는 설계 · 승인 전이다
