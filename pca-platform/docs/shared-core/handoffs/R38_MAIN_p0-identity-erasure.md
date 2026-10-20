# R38 · 본체 — P0 신원 · 파기 · 기한 (전달 초안 · **미발송**)

- 검증한 커밋: `c4f39cdf` 위 R38 작업 · 운영 브랜치 · 운영 DB 를 보지 않았다
- 본체 소유 코드를 **고치지 않았다**. 아래는 재현 · 영향 · 최소 수정안 · 승인 요청이다

## 1. 재현된 사실

| # | 사실 | 근거 | 상태 |
|---|---|---|---|
| A | 두 번째 학교가 같은 학번을 rotate 로 올리면 계정 · 비밀번호 · 소속 · 응시가 넘어간다 | `p0-login-collision.test.ts` REPRO-4 (지금 코드 10 PASS / 11 TODO) | 패치 제안(CC-002) |
| A' | 1단계 패치 뒤에도 다른 학교 학생이 학번만으로 제 계정에 못 들어간다 | RISK-1 TODO | 2단계 미설계 |
| B | `db:upgrade` 를 다시 부을 때마다 학교 학생이 시연이 되어 담당자 목록에서 빠진다 | `p0-demo-remark.test.ts` 6/6 | 별도 SQL 제안(CC-002a) |
| C | 파기가 `v3_experiences` · `campus_students`(학번) · `v3_applications` 를 남긴다 · `user_id` 표 34 가운데 20 이 어느 목록에도 없다 | `p0-erasure.test.ts` 6 PASS / 3 TODO (실제 `anonymizeUser`) | CC-009 |
| D | `v3_*` 의 `purge_after` 를 집행하는 제품 질의 · 운영 명령 0 · 기한 지난 메모가 남는다 | 같은 검사 ER-REPRO-5 | CC-009 |

## 2. 2단계 영향 범위 (정적 · 실행 안 함)

기관 인지 로그인을 하려면 같이 바뀌어야 하는 자리다.

| 자리 | 지금 | 2단계에서 |
|---|---|---|
| `src/lib/auth.ts:41` `findUserByIdentifier` | `login_id OR email` 전역 · `login_id` 먼저 | `(기관, 학번)` 을 먼저 · 기관 없는 손잡이는 전처럼 |
| `src/app/login/actions.ts` · 시도 제한 | 열쇠가 아이디 · IP | 열쇠에 기관 코드 |
| `src/app/password/forgot/actions.ts:51` | `login_id OR email` · **`LIMIT 1` 에 차례가 없다** | 로그인과 같은 차례 · 기관 |
| `src/app/password/reset/[token]` | 토큰 → `user_id` | 그대로(토큰이 사람을 가리킨다) |
| JWT `sub` · 소속 | `users.id` · 요청마다 소속을 다시 읽는다 · 기관 claim 없음 | 그대로 둘 수 있다(계정이 갈리면 넘어갈 길이 없다) |
| `src/lib/campus/students.ts:125` · `manage.ts:336` | `login_id` 로 사람을 찾는다 | `(university_code, student_id)` 로 (1단계 패치) |
| `src/lib/auth-accounts.ts:82` | 확인된 메일로 기존 계정과 **충돌** 판단(연결하지 않음) | 그대로 · 기관마다 같은 메일이 있을 때의 안내만 |
| `src/app/admin/organizations/[id]/actions.ts:57` · `src/lib/org.ts:211` | 메일로 사람을 찾는다(전역) | 기관 범위 확인 필요 |

**정적 발견 하나(고치지 않음)**: 비밀번호 찾기 질의는 `LIMIT 1` 에 `ORDER BY` 가 없다. 한 사람의 `login_id`
와 다른 사람의 `email` 이 같은 글자면 어느 줄이 잡히는지 정해지지 않는다(로그인은 2026-10-14 운영 Canary 회차에 `login_id` 먼저로
고쳐졌다). 재현은 하지 않았다 — NOT VERIFIED.

## 3. 최소 수정안 · 거절 · 보류

| | |
|---|---|
| 지금 승인 요청 | CC-002 1단계 패치(Staging 먼저 · `campus:walk` · `pcu:campus` 브라우저) · CC-002a SQL 을 upgrade 맨 뒤에 · CC-009 표 20 분류와 `purge_after` 집행 명령 |
| 보류 | 2단계 설계(위 표가 범위) · 이미 파기된 계정 정리(운영 DB 쓰기) |
| 하지 않는다 | Core 가 본체 인증 · 파기 코드를 직접 고치는 일 |
| 운영 탐지 | `scripts/shared-core/sql/r36_p0_detect.sql` (읽기 전용 증명 DET-1) — 운영자 승인 뒤 한 번 |

## 4. 판정

| | |
|---|---|
| A · B · C · D 재현 | PASS (shim · 일회용 DB) |
| 실제 `pg` · next-auth · 브라우저 · 운영 | NOT VERIFIED |
| 출시 | **STOP 권고 유지** — 두 번째 기관 실학생 명단 · 운영 전환 전에 A · B · C 결정 |
