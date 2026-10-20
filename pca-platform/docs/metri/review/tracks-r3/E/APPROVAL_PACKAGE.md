# Track E 3차 · GM 연동 승인 패키지 (diff 초안 · 검증 계획)

- 기준 커밋 `55b20bfb` · 요청 본문은 `../../tracks-r2/E/PM_CHANGE_REQUEST.md`(여기서 되풀이하지 않는다)
- **본 작업 트리에는 아무것도 적용하지 않았다.** 패치는 별도 작업 트리에서 만들고 격리 DB(`cm_iso_e3` · 5433)에서 돌렸다
- 적용(앱 폴더에서): `git apply --directory=pca-platform patches/0N-*.patch` 또는 `patch -p1 < patches/0N-*.patch`
  (git 은 하위 폴더에서 돌면 경로를 저장소 뿌리 기준으로 읽어 `--directory` 없이는 조용히 건너뛴다 · `logs/git-apply-check.log`)
- 의존: **01 → 02 → 03** (02 는 01 의 `snapshot-inputs.ts`, 03 은 01·02 를 import). **04 는 따로 적용된다**
- 검사: `scripts/lab/trackE-r3.ts`(사본 `trackE-r3.ts`) → `CHECKS.md` **76/76 PASS** · 관찰 2

## 기본 거절 (승인 전후 모두 유지)

1. **담당자 개인 PDF 는 기본 거절이다.** 기관 담당자 · 교수 · 운영사가 남의 응시를 요청하면 `org_default_deny`(404). 계약 칸 · 본인 동의 칸 · 열람 기록 정책이 확정되기 전에는 이 길을 여는 코드가 없다(`access.ts`).
2. **학생 배포 플래그 `GM_STUDENT_DISTRIBUTION` 은 OFF 가 기본이다.** 꺼져 있으면 실제 학생(`users.is_demo=false`)은 `distribution_off`(404) — 시험 계정만 받는다. **KODATA 학생 배포 권리 확인과 기업 공식 수치 원문 대조가 끝나기 전에는 켜지 않는다.**
3. 입구 플래그 `FEATURE_GM_REPORT` 도 OFF 가 기본: 꺼져 있으면 로그인보다 먼저 404(입구 존재도 알리지 않는다).

## 패치 01 — 제출 시 경험 스냅샷(요청 2) · 개인정보 파기 연결(요청 3)

| 항목 | 내용 |
|---|---|
| 바꾸는 것 | `db/schema_v3_gm.sql` 새 파일 +27 (`v3_snapshots.gm_inputs JSONB NULL`) · `deploy/db-chain.json` +3/−2 · `runtime/session.ts` +12/−3 (`submit()` 이 같은 INSERT 로 `gm_inputs` 를 적는다) · `report-gm/snapshot-inputs.ts` 새 파일 +87 (허용 칸 목록 `GM_EXPERIENCE_COLUMNS` · `gmEligible` · `gmInputsInTx`) · `report-gm/inputs.ts` +46/−13 (굳은 줄 우선 · `allowFile:false`) · `erasure.ts` +28 (`gm_inputs` NULL · `purgeGmForUser`) — 6파일 +203/−18 |
| 승인 종류 | **DB**(칸 하나) · **공통 코드**(`submit()` · `erasure.ts`) · 검사 화면 동결 판본 |
| 위험 | ① 앱이 마이그레이션보다 먼저 오르면 **제출이 없는 칸에 쓰다 멈춘다** → 배포 순서 고정: `db:upgrade` 먼저, 앱 나중(칸은 NULL 허용이라 옛 앱과 함께 있어도 된다). ② 제출 트랜잭션에 SELECT 두 번이 더해진다(BIZ PRO 만). ③ `session.ts` 가 검사 화면 동결 목록에 있어 `v3:freeze` 가 걸린다(예상 · 아래). ④ `erasure.ts` 가 GM 모듈을 import 한다(파기 화면 서버 번들이 조금 커진다) |
| 되돌리기 | 패치 역적용(`git apply -R`) 뒤 앱 배포. 칸은 남겨도 옛 코드가 읽지 않는다. 지우려면 `ALTER TABLE v3_snapshots DROP COLUMN IF EXISTS gm_inputs;` + `db-chain.json` 줄 제거 |
| 승인 때 할 일 | 검사 화면 동결: `session.ts` 바뀜으로 `v3:freeze` FAIL(`logs/v3-freeze-check.log` · 기준 커밋은 PASS `logs/v3-freeze-check-BASE.log`). 화면 · 채점은 바뀌지 않으므로 승인 시 판본을 올리고 `FREEZE=update npm run v3:freeze` (이번에 하지 않았다) |

**바꾼 결정 둘(지시와 다른 점).** ① `db-chain.json` 줄을 04 가 아니라 **01 에 넣었다**: 마이그레이션 파일만 오르고 차례에 없으면 `db:upgrade` 가 그 칸을 만들지 않고, 01 의 `submit()` 이 곧바로 멈춘다. 마이그레이션과 그 차례는 한 패치여야 한다. ② `gm_inputs` 는 **BIZ_CORE_V1 · PRO 응시에만** 적는다(나머지는 NULL): GM 과 상관없는 사람의 경험 기록 사본을 만들지 않는다.

**검증 계획**

```bash
PGPORT=5433 DATABASE_URL=postgres:///cm_iso_e3 bash -c 'for f in $(node -e "for (const f of require(\"./deploy/db-chain.json\").upgrade) console.log(f)"); do psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 --single-transaction -f $f; done'   # 기대: 16파일 rc=0 · gm_inputs jsonb NULL
PGPORT=5433 DATABASE_URL=postgres:///cm_iso_e3 V3_PREVIEW_OPEN='*' GM_INPUT_DIR=var/tmp/gm-r3/inputs GM_OUT=var/tmp/gm-r3/out \
  REPORT_PDF_DIR=var/tmp/gm-r3/reports CHROMIUM_PATH=<chromium> npx tsx scripts/lab/trackE-r3.ts   # 기대: S1 13 · S2 7 · S3 8 통과
ONLY=S1 ... npx tsx scripts/lab/trackE-r3.ts   # note_text 회귀만. 허용 목록에 note_text 를 넣으면 3줄 FAIL 이어야 한다
npx tsx scripts/v3-measurement-freeze.ts      # 기대: 14/14 (측정 동결 그대로)
```

**이번에 돌린 결과** — S1 13/13 · S2 7/7 · S3 8/8 PASS(`CHECKS.md` · `logs/trackE-r3.log`). 음성 대조: 허용 목록에 `note_text` 를 넣자 S1 이 **3줄 FAIL**(`logs/trackE-r3-S1-negative-note_text-added.log` · 넣은 diff `logs/negative-control-note_text.diff.log`), 되돌리고 9/9 PASS(`logs/trackE-r3-S1-reverted.log`). 같은 트랜잭션 증거 셋: `created_at = frozen_at = submitted_at` · 스냅샷 줄과 응시 줄의 `xmin` 같음 · `gmInputsInTx` 를 실패시키면 스냅샷 0줄 · 응시 `in_progress` 그대로. 측정 동결 14/14(`logs/v3-measurement-freeze.log`). 검사 화면 동결 FAIL 1(예상 · 위). `v3:provenance` 18/18.

**NOT VERIFIED** — 운영 DB 에서의 마이그레이션 · 운영 데이터 양에서 제출 시간 · 실제 탈퇴 화면(`/my/account`)을 거친 파기(서버 액션은 Next 없이 못 돈다; `anonymizeUser` 를 직접 불렀다) · `npm run typecheck`(이 환경에 TypeScript 형 검사 의존성이 없다).

## 패치 02 — 안전한 권한 검증(요청 1 의 권한)

| 항목 | 내용 |
|---|---|
| 바꾸는 것 | `report-gm/access.ts` 새 파일 +74 (`canDownloadGm(viewer, attemptId, env)`) |
| 승인 종류 | 공통 코드(권한 규칙) — DB · API 변경 없음 |
| 차례 | 플래그 → 번호 꼴 → 응시 있음 → **본인**(아니면 담당자면 `org_default_deny`, 아니면 `not_owner`) → BIZ_CORE_V1·PRO → 굳은 결과 → 학생 배포 플래그(OFF 면 시험 계정만). **거절은 전부 404**(남의 번호 존재를 알리지 않는다) |
| 위험 | `inputs.ts` 의 옛 `canDownloadGm`(실험 경로 전용)과 이름이 같다. 운영 입구는 `access.ts` 만 읽는다. 실험 경로를 03 의 `generateGm` 으로 옮길 때 옛 함수를 지운다(후속) |
| 되돌리기 | 파일 삭제(03 이 없으면 아무도 부르지 않는다) |

**검증 계획 · 결과** — `trackE-r3.ts` S4: 본인(시험) · 본인(실제, 배포 OFF/ON) · 다른 학생 · org_admin · instructor · superadmin · 플래그 OFF · BIZ 아님 · PRO 아님 · 결과 없음 · 번호 꼴 아님 · 없는 응시 **13/13 PASS**. **NOT VERIFIED**: 실제 세션 쿠키로 들어온 `SessionUser` 의 `memberships` 모양(세션을 바꿔 끼워 셌다).

## 패치 03 — GM 다운로드 입구(요청 1)

| 항목 | 내용 |
|---|---|
| 바꾸는 것 | `src/app/v3/[attemptId]/report/gm/route.ts` 새 파일 +93 · `report-gm/generate.ts` 새 파일 +152(운영용 생성: 입력은 굳은 줄만 · 글꼴 없으면 멈춤 · 그리던 HTML 과 `.part` 를 응시 폴더 안에 두고 `finally` 로 지움 · MANIFEST 는 해시와 개수만) · `db/schema_phase2_2.sql` +6/−2(`job_failures_kind_chk` 에 `gm_pdf_fail`) · `incidents.ts` +2/−1(운영 화면 이름표) — 4파일 +253/−3 |
| 승인 종류 | **API**(새 경로) · **DB**(CHECK 값 하나) |
| 위험 | ① 이 칸이 서기 전에 굳은 BIZ PRO 응시는 입구에서 `input` 503(입력 파일을 새로 만들지 않기 때문). 그 사람들에게 열려면 재제출이나 일괄 채움이 따로 필요하다(결정 대기). ② PDF 한 부 약 1.2MB · 약 5초(이 기계) — 동시 요청을 막는 줄 세우기는 없다(플래그 OFF 동안 문제 없음) |
| 되돌리기 | 플래그 OFF 로 즉시 닫힌다(404). 코드는 역적용. CHECK 값은 남겨도 해가 없다 |

**바꾼 결정(지시와 다른 점).** `gm_pdf_fail` 은 새 마이그레이션이 아니라 **`schema_phase2_2.sql` 의 제약 한 자리에서** 더했다. 배포마다 차례대로 붓는 phase2_2 가 제약을 지우고 옛 목록으로 다시 걸기 때문에, 다른 파일에서 더하면 `gm_pdf_fail` 줄이 쌓인 다음 배포에서 `db:upgrade` 가 멈춘다. 음성 대조로 확인했다: 옛 목록으로 다시 걸자 `check constraint "job_failures_kind_chk" ... is violated by some row`.

**검증 계획 · 결과** — `trackE-r3.ts` S5 **22/22 PASS**: 플래그 OFF → 404 · `requireUser` 0회 / 남 · 담당자 · 배포 OFF 실제 학생 → 404 / 본인(시험) → 200 `application/pdf` · `attachment` · `private, no-store` · `%PDF-` 1,188,527B / 응시 폴더에 PDF · MANIFEST 만(`.part` · HTML 없음) · MANIFEST 에 제목 · user_id · note_text 없음 · `var/pdf-gm` 에 HTML 을 더하지 않음 · 입력 파일 안 만듦 / 실패 넷(브라우저 · 인쇄 중 끊김 · 쪽 넘침 · 글꼴 없음) 모두 PDF · `.part` · HTML 을 남기지 않고 `FAIL.json` 만 · 앞서 완성된 PDF 는 덮이지 않음 / 브라우저 실패 → 503 안내 쪽 + `job_failures` `gm_pdf_fail` 한 줄(`trace_id=gm-pdf-browser-{id}`) · 그 줄과 FAIL.json 에 개인 글 없음 / 옛 응시 → 503 · 파일 안 만듦 / 모르는 kind 거절 · phase2_2 다시 부어도 통과. 정적: `errors:check` 8/8 · `routes:check` 10/10 · `db:chain` 8/8.

**NOT VERIFIED** — Next 위에서의 HTTP(라우트 모듈의 `GET` 을 `Request` 로 직접 불렀다: 미들웨어 · 쿠키 · `requireUser` 의 로그인 이동 · 실제 응답 스트리밍은 재지 않았다) · 브라우저 다운로드 · 알파인 운영 이미지의 chromium 으로 찍은 GM.

## 패치 04 — 런타임 파일 · 글꼴 · 볼륨(요청 4)

| 항목 | 내용 |
|---|---|
| 바꾸는 것 | `Dockerfile` +17/−1(run 단계에 `data/report-gm` · `data/region` COPY · `GM_OUT=/app/var/gm/out` · `GM_INPUT_DIR=/app/var/gm/inputs` · `GM_FONT_DIR=/app/fonts/pretendard` · `mkdir /app/var/gm/out` · 글꼴 결정 메모) · `deploy/runtime-needs.json` +24(GM 자료 여섯) · `deploy/docker-compose.prod.yml` +7(`gm:/app/var/gm` 볼륨 · **백업하지 않음**) · `deploy/entrypoint.sh` +5(GM 볼륨 주인 고침 · 못 써도 멈추지 않음) · `.dockerignore` +3(`var` — 개인정보 파일이 빌드 컨텍스트에 들지 않게) — 5파일 +56/−1 |
| 승인 종류 | **배포**(이미지 · 볼륨 · compose) |
| 위험 | ① `data/region` 에 KODATA 줄이 이미지에 담긴다(학생에게 내보내는 것은 02 의 배포 플래그가 막는다 · 권리 검토 대상). ② 관리형 플랫폼(railway 등)은 compose 를 읽지 않으므로 볼륨을 그쪽 설정에서 따로 붙여야 한다. ③ `.dockerignore` 의 `var` 는 빌드에 `var/` 가 필요한 날 막는다(지금은 필요 없음 · `image:check` 통과) |
| 되돌리기 | 역적용 후 재빌드. 볼륨 `gm` 은 지워도 된다(굳은 줄에서 다시 만든다) |
| **BLOCKED · 글꼴** | Pretendard 1.3.9(OFL 1.1)를 이미지에 담지 않았다. 저장소에 넣을지(woff2 다섯 벌 약 3.9MB + LICENSE · CLAUDE.md 는 지금 "저장소에 넣지 않는다") · 빌드 때 받을지(해시 고정) 결정이 필요하다. 없으면 입구는 `fonts` 걸음에서 멈추고 `job_failures` 에 남긴다(다른 글꼴로 찍지 않는다 · S5 실패 4). 결정되면 COPY 한 줄 + `runtime-needs.json` 에 `fonts/pretendard/Pretendard-Regular.woff2` |

**검증 계획 · 결과** — `node scripts/image-check.mjs` 기대 `이미지 구성 OK.` → **통과**(`logs/image-check.log`) · `sh -n deploy/entrypoint.sh` 통과 · `trackE-r3.ts` S6 **13/13 PASS**(COPY · 볼륨 자리 · 운영 PDF 볼륨과 다름 · runtime-needs 여섯 실재 · `.dockerignore` · compose 볼륨과 백업 제외 · entrypoint · db-chain 차례 · 제약을 거는 파일 하나 · GM 을 읽는 앱 파일은 새 입구 하나 · 운영 결과 PDF 경로 무관). **NOT VERIFIED**: `docker build` · 컨테이너 안 `ops:check` · 실제 볼륨 마운트와 주인 · 알파인 chromium 인쇄(이 환경에 docker 가 없다).

## 개인정보 최소화와 삭제 가능성 증명

**`v3_snapshots.gm_inputs` 에 들어가는 것 — 이것뿐이다** (`GM_SNAPSHOT_VERSION = gm-snap.1` · BIZ_CORE_V1·PRO 제출만)

| 칸 | 내용 |
|---|---|
| `version` · `frozen_at` · `core` | 판본 · 스냅샷 `created_at` 과 같은 시각 · Core 코드 |
| `experiences[]` | `id` · `kind` · `title` · `started_on` · `ended_on` · `td_codes` · `axis_codes` · `problems` · `decisions` · `artifacts` · `verifications` · `used_where` · `status` · `created_at` (보기에서 고른 열쇠 + 제목) |
| `excluded[]` | `id` · `why` 만(**제목 없음**) — 같은 순간 다른 트랜잭션이 넣거나 고친 기록 |
| **넣지 않는 것** | `note_text`(1년 파기 자유입력) · `purge_after` · `user_id` · `core_code` · `updated_at`. 목록은 코드 한 자리(`GM_EXPERIENCE_COLUMNS`)이고 `SELECT *`/`row_to_json` 을 쓰지 않는다 |

`title` 은 자유입력(120자)이라 개인정보다 — 렌더가 그 사람의 말로 옮기는 자리라 담는다. 그래서 파기가 이 칸을 비운다.

**디스크에 생기는 것과 지워지는 길**

| 파일 | 담는 것 | 언제 사라지나 | 증거(CHECKS.md) |
|---|---|---|---|
| `GM_OUT/{id}/BIZ-PRO.pdf` | 보고서 | 탈퇴(`purgeGmForUser`) · `purgeGm(id)` | S3 "X 의 GM 폴더와 입력 파일이 사라진다" |
| `GM_OUT/{id}/MANIFEST.json` | 해시 · 개수 · 판본(제목 · user_id 없음) | 같음 | S5 "MANIFEST 에 경험 제목 · user_id · note_text 가 없다" |
| `GM_OUT/{id}/FAIL.json` | 걸음 · 까닭(개인 글 없음) | 같음 · 성공하면 지움 | S5 "FAIL.json · 운영 표 줄에 … 없다" |
| `GM_OUT/{id}/.render-*.html` · `.BIZ-PRO-*.pdf.part` | 그리던 글(제목 포함) · 반쪽 PDF | **생성 `finally` 에서 즉시**. 프로세스가 죽어도 응시 폴더 안이라 파기가 지운다 | S5 ".part · 그리던 HTML 없음" · 실패 넷 |
| `GM_INPUT_DIR/{id}.json` | (옛 실험 경로) 입력 고정 | 운영 입구는 **만들지 않는다**. 남은 것은 탈퇴가 지운다 | S2 "파일을 만들지 않는다" · S5 "입력 파일을 만들지 않는다" · S3 |
| DB `gm_inputs` | 위 표 | 탈퇴 트랜잭션에서 NULL | S3 "gm_inputs 가 NULL … 결과 모델은 남는다" |

- 파기는 **DB 확정 뒤 파일**이고, 이미 익명화된 계정이어도 다시 부르면 남은 파일을 지운다(끊긴 파기 회복 · S3). 두 번째 호출은 `{}`.
- 다른 사람의 파일 · 굳은 줄, 운영 PDF 폴더(`REPORT_PDF_DIR`)는 그대로다(S3).
- GM 볼륨은 백업하지 않고(백업 사본은 파기가 닿지 않는다) 빌드 컨텍스트에서 `var` 를 뺀다(04).

**찾은 구멍 둘(이 패치 밖 · 따로 결정)**

1. **탈퇴 뒤에도 `v3_experiences` 줄이 남는다.** `erasure.ts` 의 `REMOVE` 목록에 없다 — S3 관찰: 익명화 뒤 1줄 · `note_text` 1줄 그대로(`purge_after` 1년이 지날 때까지). `users` 를 지우지 않으므로 `ON DELETE CASCADE` 도 돌지 않는다. `REMOVE` 와 `ERASE_GROUPS`('적어 주신 경험과 설정')에 `v3_experiences`(그리고 `v3_actions` 등 V3 표 점검)를 더하는 공통 파기 변경 요청이 필요하다.
2. **실험 경로 `scripts/lab/gm-student.ts` 는 그리던 HTML 을 `var/pdf-gm/gm-student-{id}.html` 에 두고 지우지 않는다** — 본 작업 트리에 5개 남아 있다(격리 DB 시험 응시). 파기(`purgeGm`)가 닿지 않는 자리다. 실험 경로를 `generateGm` 으로 옮기거나 그 파일을 지우는 정리가 필요하다(이번에 본 작업 트리를 건드리지 않아 지우지 않았다).

## 회귀 · 동결 (이번에 돌린 것)

| 검사 | 결과 | 로그 |
|---|---|---|
| `trackE-r3.ts` (패치 후) | **76/76 PASS** · 관찰 2 | `CHECKS.md` · `logs/trackE-r3.log` |
| `trackE-r2.ts` 패치 전(격리 DB 이름만 바꾼 사본 · `logs/trackE-r2-guard-only.diff.log`) | 22/23 (패키징 예상 FAIL 1) | `logs/trackE-r2-base.log` |
| `trackE-r2.ts` 패치 후 | **P1 에서 멈춤**(예상): 굳은 줄이 있으면 입력 파일이 없어 `readFileSync(inputFile)` 가 ENOENT | `logs/trackE-r2-after-patches.log` |
| 같은 것 · 그 한 줄만 "파일 없으면 굳은 줄"로 바꾼 사본 | 20/23 — 걸린 셋 모두 설계 변경: P3 "입력 파일이 있다" 둘(이제 없다) · P5 패키징(이제 글꼴만 빠짐) | `logs/trackE-r2-after-patches-compat.log` · `logs/trackE-r2-compat-variant.diff.log` |
| `v3-measurement-freeze.ts` | 14/14 · 측정 동결 그대로 | `logs/v3-measurement-freeze.log` |
| `v3-freeze-check.ts` | FAIL 1 `session.ts` (예상 · 기준 커밋 PASS) | `logs/v3-freeze-check.log` · `-BASE.log` |
| `v3-provenance-check.ts` | 18/18 | `logs/v3-provenance-check.log` |
| `v3-copy-check.ts` | FAIL 1 `result/charts.tsx` — **기준 커밋에서도 같은 FAIL**(패치와 무관) | `logs/v3-copy-check.log` · `-BASE.log` |
| `image-check` · `db:chain` · `errors:check` · `routes:check` | OK · 8/8 · 8/8 · 10/10 | `logs/*.log` |
| `git apply --check` 새 작업 트리 | 01→04 차례 적용 OK · 결과 16파일이 검사한 트리와 같음 · 01 · 04 단독 OK | `logs/git-apply-check.log` |
| `git apply --check` 지금 가지 끝(`dc9d08ff` · 기준 뒤 다른 트랙 커밋 6개) | 01~04 차례 적용 OK. **검사는 `55b20bfb` 위에서만 돌렸다**(그 위에서 다시 돌리지 않음) | `logs/git-apply-check-HEAD.log` |

승인 뒤 `trackE-r2.ts` 의 P1 · P3 은 "굳은 줄이 있으면 파일이 없다"로 고쳐야 한다(이번에 저장소 검사를 고치지 않았다).

## 승인 순서 제안

1. **01**(DB 칸 → 앱 · 파기 연결) — `db:upgrade` 먼저, 앱 나중. 검사 화면 동결 판본 갱신 동반
2. **04**(이미지 · 볼륨) — 글꼴 결정 전이면 COPY 없이 그대로
3. **02 + 03**(권한 · 입구) — `FEATURE_GM_REPORT` OFF 로 배포, staging 에서 시험 계정으로만 켬
4. 글꼴 결정 · 운영 이미지에서 GM 인쇄 확인 · `v3_experiences` 파기 구멍 결정
5. KODATA 권리 · 기업 수치 대조 완료 뒤에만 `GM_STUDENT_DISTRIBUTION=yes`
