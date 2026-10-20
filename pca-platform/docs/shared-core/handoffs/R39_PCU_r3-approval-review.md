# R39 · 배재 3차 승인 요청 — Common Core 검토 의견 (회신 초안 · **미발송**)

**이 문서는 승인이 아니다.** 승인은 총괄 PM 과 사업주가 한다. Core 는 항목마다 권고(승인 권고 · 조건부 ·
보류)와 그 근거와 조건을 적는다. 다른 세션에 보내지 않았다. 보낼지는 사업주가 정한다.

| | |
|---|---|
| 검토 대상 | `origin/claude/happy-faraday-q85c13` @ `feb3ea13` (merge-base `4f02d79b`) |
| 읽은 것 | `00_의사결정.md` · `C/API_CONTRACT_REVIEW.md` · `F/CI_AND_APPROVAL_REQUEST.md` · `F/STAGING_PLAN.md` · `F/ci/pcu-verify.yml.draft` · `E/APPROVAL_PACKAGE.md` · 패치 01 · 커밋 `93ba9265` · `c5f22344` 의 diff |
| Core 가 한 것 | **읽기만.** PCU 가지에 쓰지 않았고 패치를 적용하지 않았다. 운영 · Staging · 운영 DB 에 닿지 않았다 |
| Core 가 다시 돌린 것 | 없음(이 환경은 npm 이 막혀 PCU 의 typecheck · build · E2E 를 재현할 수 없다). 아래 `확인` 은 **코드와 문서를 읽고 대조한 것**이고 실행 증거가 아니다 |

## 0. 한 줄

**C-A 와 CI 는 고쳐서 먼저, Staging 은 CI 뒤, C-B 는 조건부, GM 01 은 보류(결정 둘이 먼저), 02 · 03 · 04 는
플래그 OFF 를 조건으로 Staging 까지.** 정식 배포 재판정은 브라우저 E2E 뒤라는 PCU 의 원칙에 동의한다.

| # | 요청 | Core 권고 | 막는 것 / 조건 |
|---|---|---|---|
| 1 | C-A `93ba9265` 제출 연결 고갈 수정 | **승인 권고** | CI typecheck 통과 |
| 2 | CI `pcu-verify` 추가 | **조건부 승인 권고** | 초안의 결함 셋을 고친 뒤 (2절) |
| 3 | Staging 생성 | **조건부 승인 권고** | CI 초록 뒤 · 이미 있는 staging 환경인지 먼저 확인 (3절) |
| 4 | C-B `c5f22344` `ok:false` 의미 확장 | **조건부 승인 권고** | Staging 두 탭 확인 · 다른 기관 영향 공지 (4절) |
| 5 | GM 패치 01 (입력 고정 · 파기 연결) | **보류 권고** | CC-006 기준시점 결정 · CC-009 최소 파기 범위 결정 · HEAD 위 재검사 (5절) |
| 6 | GM 패치 02 (권한) | 승인 권고(코드만) | 03 없이는 부르는 곳이 없다 · 옛 `canDownloadGm` 정리 |
| 7 | GM 패치 03 (다운로드 입구) | 조건부 · **Staging 한정** | 플래그 둘 OFF 기본 · Next 위 HTTP 미검증 |
| 8 | GM 패치 04 (이미지 · 볼륨) | 조건부 · **부분 보류** | KODATA 이미지 반입(CC-003) · 글꼴 결정 · Railway 볼륨 |
| 9 | D9 `v3_experiences` 파기 구멍 | **선행 필수** | 실학생 GM · 파일럿 전에 닫는다 (6절) |

## 1. C-A · 제출이 연결을 못 얻던 자리 (`93ba9265`) — 승인 권고

**확인(코드 대조).** `submit()` 이 `FOR UPDATE` 로 응시 줄을 잡은 **뒤에** 같은 트랜잭션 연결 `c` 로
`attemptOf` · `answersOf` · `picksOf` 를 읽는다. 연결 인자는 선택(`db?: Reader`)이라 없으면 전과 같이 풀로
읽고, 다른 호출자 모양이 바뀌지 않는다. 반환값 · 화면 동작 · 저장 값이 같다 — 계약 변경이 아니라는 PCU 판단에
동의한다.

**증거 수준.** BEFORE 7/14 실패 → AFTER 14/14 · 40/40 은 실제 node-postgres(풀 10) 위 실행이고 Core 가
재현하지 않았다. typecheck 는 NOT VERIFIED 다.

**조건.** CI typecheck 통과. **권고(차단 아님)**: 같은 모양(`tx()` 안에서 풀 `query()` 를 부르는 자리)이
다른 곳에도 있을 수 있다. 정적 검사 한 줄(트랜잭션 콜백 안의 풀 조회)을 다음 회차에 두기를 권한다.

## 2. CI `pcu-verify` — 조건부 승인 권고

틀(권한 `contents: read` · 일회용 PostgreSQL · 실행마다 새 비밀값 · 글 결과만 업로드 · 파일 하나로 되돌림)은
안전하다. 참조한 npm 스크립트 열셋과 스크립트 · fixture 여섯이 그 가지에 전부 있다(대조함). 다만 초안대로
두면 **결과를 잘못 읽게 되는 자리가 셋**이다.

| # | 자리 | 무엇이 틀리나 | 고칠 것 |
|---|---|---|---|
| CI-1 | `on: workflow_dispatch` | GitHub 의 수동 실행은 **워크플로 파일이 기본 가지에 있을 때만** 뜬다. 기본 가지는 `main`(2026-09-08 에 멈춤)이고 파일은 PCU 가지에만 둔다 → 수동 실행 단추가 서지 않는다 | 실행 경로를 `[pcu-verify]` 커밋 메시지 하나로 적는다(문서 갱신). `main` 에 파일을 두는 것은 별도 결정이고 Core 는 권하지 않는다 |
| CI-2 | `측정 동결 · 서버 회귀` 단계 | `... trackC-race.ts ... \|\| rc=1` 다음 줄의 `printf ... $?` 는 **늘 0** 이다(`\|\| rc=1` 이 0 으로 끝난다 · 이 환경에서 확인). 단계는 `rc` 로 빨개지지만 `steps.tsv` 와 마지막 `판정` 표에는 경합 검사가 통과로 적힌다 | `npx tsx ...; r=$?; [ $r -eq 0 ] \|\| rc=1; printf '...\t%s\n' $r` |
| CI-3 | `v3-pdf-audit.ts` 를 기본값으로 | 이 검사는 EE · PUBADM · NURSING 에서 `없는 산업팩이다` 로 멈추는 것이 **알려진 기존 결함**으로 기록돼 있다(본체 R17 · R34 · PCU HEAD 에서 그대로인지는 CI 첫 실행이 답한다). 그대로 두면 CI 가 이번 변경과 무관하게 늘 빨갛고, 빨강을 아무도 안 읽게 된다 | `CORES=BIZ_CORE_V1` 로 좁히거나, 그 셋을 `알려진 실패` 로 따로 적고 판정에서 가른다 |

**선택.** 외부 action 셋(`checkout` · `setup-node` · `upload-artifact`)을 태그 대신 SHA 로 고정하면 공급망
위험이 준다. `PCU_ARTIFACT_KEY`(승인 ②)는 첫 실행에 필요 없다 — 글 결과만으로 typecheck · build · 경합 ·
E2E 판정이 선다. 승인 ③(실패를 고치는 커밋을 이 가지에)은 동의한다.

**CI 초록을 브라우저 PASS 로 적지 않는다**는 PCU 원칙에 동의한다. E2E 는 CI 러너의 Chromium 결과이고, 운영 ·
Staging 브라우저 결과가 아니다.

## 3. Staging 생성 — 조건부 승인 권고 (CI 초록 뒤)

원칙(새 환경 · 새 Postgres · 운영 변수 복제 안 함 · `APP_ENV=staging` · 기본 인증 · `noindex` · 평소 멈춤 ·
시험 계정만 · SMTP 비움)은 Core 의 격리 원칙과 맞는다.

| 조건 | 까닭 |
|---|---|
| **이미 있는 staging 환경인지 먼저 확인** | 본체 R33 · R34 기록이 Staging 에서 응시와 PDF 를 쓴 일을 적는다. 같은 프로젝트에 staging 이 이미 있으면 둘을 만들지 말고 어느 가지를 굽는지 정한다. Core 는 확인할 수 없다(UNKNOWN) |
| `V3_PREVIEW_OPEN=BIZ_CORE_V1` 하나 | `*` 로 열면 Staging 학생이 아직 검토 전인 Core 를 받는다 |
| 운영 DB 연결 문자열 · 볼륨 · 도메인 공유 금지 · 운영 덤프 반입 금지 | 계획에 이미 있다 · 그대로 지킨다 |
| 13걸음 기록에 Git SHA · `/api/health` · 서버 로그 줄 | 재판정이 어느 커밋을 본 것인지 남겨야 한다 |
| 실학생 명단 금지는 **D9 가 닫힐 때까지** 유지 | 6절 |

## 4. C-B · `ok:false` 의미 확장 (`c5f22344`) — 조건부 승인 권고

**확인(코드 대조).**

- 반환 꼴 `{ ok: boolean }` 그대로. `ok:false` 가 새로 나오는 곳은 넷(`noteAction` · `profileAction` ·
  `picksAction3` · `cursorAction`)이고, 셋은 `UPDATE ... WHERE status='in_progress' RETURNING` 이 0줄일 때다.
  PostgreSQL 은 같은 값으로 갱신해도 줄을 돌려주므로 **열린 응시에서 같은 값을 다시 보내도 `ok:false` 가
  나지 않는다** — 끝난 응시에서만 난다.
- `src/` 안의 다른 호출자를 전수로 봤다: `page.tsx:50`(`moveTo` · 결과를 안 읽음) · `start/actions.ts:54`
  (`setProfile` · 열린 응시에만) · `session.ts:1052`(`savePicks3` 래퍼) · `session.ts:1087`(`upgradeTier` 가
  `status='in_progress'` 로 되돌린 **뒤** `moveTo`). **옛 `true` 에 기대는 소비자가 없다.**
- `saveNote` 가 `writable()` 을 지나 제출 뒤 `skipped` 줄이 생기지 않는다 — 굳은 판정과 다시 채점한 판정이
  갈리던 자리를 닫는다. 측정 동결이 그대로라는 PCU 기록과 맞는다(Core 재실행 안 함).

**조건.**

| 조건 | 까닭 |
|---|---|
| Staging 에서 두 탭 확인(한 탭 제출 · 다른 탭 저장 → `저장 실패` · 결과로 가는 길) | 서버 수준 경합만 쟀고 화면 표시는 NOT VERIFIED |
| **다른 기관 영향 공지** | `runtime/session.ts` 와 `actions.ts` 는 기관 공통이다. 운영 가지에 합쳐지면 전주 · 세종도 같은 동작을 받는다. 동작 변화는 끝난 응시에만 있고 사용자 쪽은 거짓 `저장됨` 이 사라지는 것이라 해가 적지만, 검사 화면 동결 판본이 `ME_V3_2_ASSESSMENT_UI_V45` 로 오르므로 각 기관 가지의 동결 기록이 갈린다. 합칠 때 차례를 맞춘다 |
| D4(`reason` 칸)는 **다음 회차 · 별도 승인** | 반환 꼴을 넓히는 일이라 이번 계약 변경과 섞지 않는다. Core 동의 |

## 5. GM 패치 01 · 입력 고정과 파기 연결 — 보류 권고

DB 모양(`v3_snapshots.gm_inputs JSONB NULL` · 차례 맨 뒤 · 앱보다 먼저 붓기)과 허용 칸 목록 방식
(`GM_EXPERIENCE_COLUMNS` · `note_text` 제외 · 음성 대조로 확인)은 좋다. 그러나 **정해지지 않은 결정 둘을
코드가 먼저 정한다.**

### 5-1. 기준시점이 Core 권고와 다르다 (CC-006)

패치 01 은 **제출 때(A1)** 굳힌다. Core 는 R38 에서 **발급 때(A2)** 를 권고했다(`CONTRACTS.md` CC-006 ·
`R38_PCU_gm-evidence-cc006-cc008.md` 4절). 차이는 제품 동작이다.

| | A1 제출 때 (패치 01) | A2 발급 때 (Core 권고) |
|---|---|---|
| 결과를 받은 뒤 작업공간에 적은 경험 | **GM 에 영영 서지 않는다** | 다음 발급에 선다 |
| 같은 응시의 종이 | 다시 안 바뀐다 | 발급마다 다를 수 있다(발급 기록이 재현) |
| 굳히는 자리 | `v3_snapshots` 한 칸 | 발급 기록(CC-004) |

작업공간의 핵심 루프(경험 추가 → 반영)가 GM 에 닿지 않게 되므로 **PM 이 A1 / A2 를 먼저 고른다.** A1 을
고르면 패치 01 그대로 가능하고, A2 를 고르면 01 의 입력 고정 부분은 발급 쪽으로 옮겨야 한다.

### 5-2. 사본은 지우고 원본은 남는다 (CC-009 · D9)

패치 01 은 `v3_experiences.title`(자유입력)을 `gm_inputs` 로 **한 벌 더 베끼고**, 탈퇴 때 그 사본을 비운다.
그런데 **원본 `v3_experiences` 줄은 탈퇴 뒤에도 남는다** — PCU 가 S3 에서 직접 찾았고(D9), Core 도 R38
`p0-erasure.test.ts` ER-REPRO-2 에서 같은 것을 재현했다. 그래서 01 만 들어가면 `파기 증명` 표는 GM 쪽만
닫히고 같은 제목이 다른 표에 그대로 있다.

**권고**: 01 을 적용하는 배포에 **최소 파기 범위**를 함께 넣는다 — `erasure.ts` 의 `REMOVE` 에
`v3_experiences`. 나머지(6절)는 결정 뒤.

### 5-3. 검사가 HEAD 위에서 다시 돌지 않았다

01 은 `submit()` 을 고치고, C-A 도 `submit()` 을 고쳤다. `git apply --check` 는 HEAD 에서 통과했지만
`trackE-r3` 76/76 은 `55b20bfb` 위 결과다(PCU 가 그렇게 적었다). **C-A 가 들어간 HEAD 위에서 S1~S6 을 다시
돌린 뒤** 적용 판단을 한다. 검사 화면 동결 판본 갱신은 PCU 계획대로 적용 때 한다.

## 6. D9 · 파기 범위 — 실학생 GM · 파일럿 전에 선행 필수

Core R38 ER-0 은 `user_id` 를 가진 표 34 가운데 **어느 목록(REMOVE · KEEP)에도 없는 표가 20** 임을 셌다
(`docs/shared-core/evidence/R38/p0-erasure.log`). PCU D9 는 그중 `v3_experiences` 를 짚었다. 같은 질문이
걸리는 표를 Core 쪽 분류로 다시 적는다(결정은 PM · 사업주 · 법률).

| 표 | 담는 것 | Core 권고 분류 | 까닭 |
|---|---|---|---|
| `v3_experiences` | 제목 · 한 줄(`note_text`) · 고른 항목 | **REMOVE (이번 배포에)** | 자유입력 · GM 사본의 원본 |
| `campus_students` | 학번 · 학과 | 결정 필요 | 학번은 준식별자. 학교 집계 보존과 맞선다 |
| `v3_applications` | 지원 기록(기업 이름 · 메모) | REMOVE 후보 | 자유입력 |
| `v3_actions` · `v3_saved_jobs` · `v3_track_interest` | 할 일 · 저장 · 관심 | 결정 필요 | 개인 행동 기록 |
| 나머지 열넷 | (R38 로그) | 결정 필요 | — |
| `v3_experiences.purge_after` | 1년 기한 | **집행 자리 없음** | 집행 명령이 0. 기한을 적어 두고 지우는 코드가 없다 |

실험 경로가 남긴 `var/pdf-gm/gm-student-*.html`(PCU 작업 트리 5개)은 PCU 가 정리한다.

## 7. GM 패치 02 · 03 · 04

| 패치 | Core 의견 | 조건 |
|---|---|---|
| 02 권한 | 기관 기본 거절(`org_default_deny`)과 거절 전부 404 는 Core 의 기관 격리 원칙(CC-005)과 맞는다. 승인 권고(코드만) | 옛 `inputs.ts` 의 같은 이름 `canDownloadGm` 을 03 적용 때 지운다(이름이 같으면 다음 사람이 옛 것을 부른다) |
| 03 입구 | `FEATURE_GM_REPORT` · `GM_STUDENT_DISTRIBUTION` 두 플래그 OFF 기본 · 실패 시 반쪽 파일 0 · `job_failures` 제약을 phase2_2 한 자리에서 더한 판단은 맞다 | **Staging 한정.** Next 위 HTTP(미들웨어 · 쿠키 · 로그인 이동) 미검증. 이 칸이 서기 전 굳은 BIZ PRO 응시는 503 — 일괄 채움 여부는 5-1 결정에 따른다 |
| 04 이미지 | `.dockerignore` 에 `var`(개인정보 파일이 빌드 컨텍스트에 안 든다)는 좋다 | ① `data/region` 의 KODATA 줄을 **이미지에 담는 것 자체**가 권리 검토 대상(CC-003). 배포 플래그는 내보내기만 막는다 → 권리 확인 전에는 그 COPY 를 빼고 굽기를 권한다 ② Railway 는 compose 를 읽지 않는다 → 볼륨은 Railway 설정에서 따로 ③ 글꼴(Pretendard)은 BLOCKED 그대로 |

## 8. 권하는 차례

1. CI 초안 고침(CI-1~3) → `pcu-verify` 추가 → 초록 확인
2. C-A 병합 후보(일반 검토)
3. Staging(기존 환경 확인 뒤) → 학생 E2E · PDF · 담당자 · 권한 · 모바일
4. C-B (두 탭 확인 · 기관 공지)
5. **결정**: CC-006 A1/A2 · CC-009 최소 범위(`v3_experiences`)
6. 패치 01(+ `v3_experiences` REMOVE) → HEAD 위 재검사 → Staging
7. 02 · 03 플래그 OFF 로 Staging · 시험 계정만
8. 04(KODATA COPY 제외 · 글꼴 결정 뒤)
9. 브라우저 E2E 증거로 정식 배포 재판정 — Production 은 그때까지 그대로

## 9. 판정 표기

| 항목 | 상태 |
|---|---|
| C-A 정합성 | 코드 대조 PASS · 실행 NOT VERIFIED(Core) |
| C-B 소비자 영향 | 코드 대조 PASS(옛 `true` 의존 0) · 화면 NOT VERIFIED |
| CI 초안 | 결함 3 (CI-1~3) |
| Staging | UNKNOWN(기존 환경 여부) |
| 패치 01 | HOLD — 결정 2 · 재검사 1 |
| 파기 | BLOCKED — `v3_experiences` · 미분류 표 20 · 기한 집행 0 |
| 운영 | 바뀌지 않음 · Core 는 운영에 닿지 않았다 |
