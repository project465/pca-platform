# KUS R2 변경 요청 묶음 (총괄 PM · Common Core 담당 승인 전 · 미적용)

작성 2026-10-20 · 가지 `claude/ecstatic-cori-sv6lh5` · 기준 커밋 `a4891662`

이 폴더의 patch 셋은 **저장소에 적용하지 않았다.** 공통 파일은 한 줄도 바뀌지
않았고(`kus-verify` 의 `공통 파일 무변경 확인` 단계가 센다), 패치는 따로 세운
작업 나무(git worktree)에 얹어 검사만 돌렸다. 승인 뒤 `git apply` 한 번으로 들어간다.

| 파일 | 요청 | 대상 공통 파일 | 줄 수 |
|---|---|---|---|
| `CR-03-unsupported-accounts.patch` | KUS-CR-03 Core 없는 학과 학생의 계정 발급 | `src/lib/campus/registry.ts` · `src/lib/campus/students.ts` · `src/app/v3/start/actions.ts` · `src/lib/me-v3/runtime/session.ts` | +71 −6 |
| `CR-01-02-registry-and-chain.patch` | KUS-CR-01 운영 등록부에 KUS 블록 · KUS-CR-02 DB 체인에 `db/kus/schema_kus.sql` | `sites/pca-platform/content/campus-universities.json` · `deploy/db-chain.json` | +491 −2 |

## KUS-CR-03 — 계정 발급과 검사 가능 여부를 가른다

**지금.** `checkStudent` 는 Core 매핑이 없는 자리를 거절한다. KUS 34자리 가운데
Core 가 붙은 자리는 8(R2 교육과정 대조 뒤 · `docs/kus/CORE_COMPAT.md`), 전공을 고르는 자리(자유전공)가 4이고
**나머지 22자리의 학생은 로그인 계정을 받지 못한다.** 기업탐방은 검사와 무관한 일인데 그 학생들은
탐방 기록도 남길 수 없다.

**바꾸는 것(네 자리).**

1. `registry.ts` — 학교에 `allow_unsupported_accounts` 칸을 둔다(**기본 꺼짐**).
   켜진 학교에서만 `unsupportedContextOf()` 가 Core 없는 자리에 `core_code: ""` ·
   `unsupported: true` 맥락을 세운다. `pickRequired()` 는 그 맥락에서 `false` 다:
   **다른 Core 를 고르게 하지 않는다**(임의 연결 금지). `examBlocked()` 를 더한다.
2. `students.ts` — 맥락을 찾는 차례 끝에 `unsupportedContextOf` 를 붙인다
   (`contextOf ?? routingContextOf ?? unsupportedContextOf`). 앞의 둘은 그대로다.
3. `v3/start/actions.ts` — `examBlocked(campus)` 이면 학교 시작 화면으로 돌려보낸다.
4. `runtime/session.ts` `openAttempt` — `campus.unsupported` 이면 던진다.
   **막는 자리는 서버다**: 폼을 직접 보내도 응시 줄이 생기지 않는다.

**바꾸지 않는 것.** 채점 · 문항 · 결과 모델 · 측정 동결 · DB 스키마 · 다른 학교의
판정. `campus_students.core_code` 가 빈 글자로 적히는 것은 자율전공 자리가 이미
쓰는 모양이라 스키마를 바꾸지 않는다.

**검사 근거** (`scripts/kus/cr03-check.ts`, 같은 스크립트를 두 나무에서 돌렸다)

| | 변경 전(HEAD) | 변경 후(patch) |
|---|---|---|
| 확인 | 1 / 1 PASS | 19 / 19 PASS |
| PCU 117자리 판정 | 발급 117 | 발급 117 (**바뀐 줄 0**) |
| JJU 10자리 판정 | 발급 10 | 발급 10 (**바뀐 줄 0**) |
| KUS 34자리 판정 | 발급 12 · 거절 22 | 발급 34 (바뀐 줄 22 — 전부 Core 없는 자리) |
| 미지원 학생 응시 | — | `openAttempt` 가 던짐 · 응시 줄 0 |
| 기관 격리 | — | KUS 명단에만 잡힘 · PCU 명단 0 · 진흥원 대역 사용자 학교 맥락 없음 |

판정 전문: `cr03-verdicts.before.json` · `cr03-verdicts.after.json`(161자리) ·
`cr03-check.before.log` · `cr03-check.after.log`.

patch 를 얹은 나무에서 공통 회귀도 돌렸다(전부 운영 조건 · 미리보기 문 닫음):
`campus:check` 80 / 80 · `v3:freeze:measure` 동결 일치 · `db:chain` 8 / 8 ·
KUS 서버 E2E 79 / 79.

**KUS 쪽 준비(이미 커밋, 공통 파일 아님).** `examUnavailable()` 가 맥락의
`unsupported` 칸을 느슨하게 읽어, 칸이 없는 지금은 늘 `false` 라 화면이 전과 같다.
patch 가 들어가면 그 학생의 홈 · 검사 안내가 `검사 이용 불가` 를 적고 첫 할 일이
탐방 기록이 되며, 탐방 기록은 직무·영역 코드 없이 적은 말만 받아 `core_code = NULL`
로 저장된다. 이것도 위 19가지 안에 있다.

**PCU/JJU 회귀를 위해 한 가지 주의.** 플래그는 학교 단위다. 배재대·전주대
등록부에는 그 칸이 없으므로 그 학교의 판정은 바뀌지 않는다. 배재대는 Core 없는
자리가 0이라 이 변경이 열 자리도 없다.

## KUS-CR-01 / CR-02 — 운영 등록부와 DB 체인

- **CR-01.** `scripts/fixtures/campus-kus.json` 의 KUS 블록을 운영 등록부 끝에
  덧붙인다. fixture 는 `APP_ENV=production` 에서 읽히지 않으므로, 이것 없이는 KUS 가
  운영에 서지 않는다. 등록부의 `verification` 은 `OFFICIAL_PAGE_UNREACHABLE` 그대로다:
  **학과 구조를 공식 쪽에서 직접 읽지 못한 상태로 올라간다는 것을 그 칸이 든다.**
- **CR-02.** `deploy/db-chain.json` 의 `upgrade` 끝에 `db/kus/schema_kus.sql` 을
  더한다(표 둘 · `IF NOT EXISTS` · `CHECK university_code = 'KUS'`).

patch 를 얹은 나무에서 `campus:check` 86 / 86 · `db:chain` 8 / 8 이고, 운영 조건
(`APP_ENV=production`, fixture 없음)에서 등록부가 KUS 34자리를 읽는다.

**이 patch 를 만들다가 찾은 KUS 쪽 결함 둘.** (둘째는 R2 교육과정 대조에서: KUS 글로벌경영전공이 배재대 유학생용 갈래 `SPEC_BIZ_GLOBAL_MGMT` 를 들고 있었다. 이름으로 붙인 자리였고 과목 근거로는 `경영 일반` 이다. 고쳤다.) 첫째: 운영 등록부에 올려 `campus:check`
를 돌리니 `계층이 넷을 넘지 않는다` 가 자유전공 4자리에서 걸렸다. 단과대학 바로 아래
자리의 `kind` 가 `track` 이었는데 그 자리는 `department` 여야 한다. fixture 는
`campus:check` 가 보지 않는 파일이라(그 검사는 fixture 문을 닫고 돈다) R1 에서
드러나지 않았다. **fixture 를 고쳤고**(KUS 전용 파일) 판정은 그대로다.

## 승인 순서 제안

1. CR-03 (학생 명단을 받기 전에 정해야 한다)
2. CR-02 → CR-01 (표가 먼저 서야 등록부가 가리키는 화면이 500 없이 선다)
3. 운영 반영은 그 뒤 `npm run db:upgrade` 한 번 · 재배포 한 번
