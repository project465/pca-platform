# Track E 3차 · GM 연동 승인 패키지

PM 변경 요청 넷(`../../tracks-r2/E/PM_CHANGE_REQUEST.md`)을 **적용 가능한 diff 넷과 검증 계획**으로 바꿨다. 본 작업 트리 · 공통 DB · 배포에는 적용하지 않았다. 자세한 승인 항목은 `APPROVAL_PACKAGE.md`.

## 1. 실제 구현 (diff 초안 · 기준 `55b20bfb` · 적용하지 않음)

| 패치 | 요청 | 파일 · 줄 |
|---|---|---|
| `patches/01-privacy-erasure-and-snapshot-inputs.patch` | 2 제출 시 경험 스냅샷 · 3 파기 연결 | `v3_snapshots.gm_inputs` (새 `db/schema_v3_gm.sql` + 차례) · `submit()` 이 같은 INSERT 로 적음(note_text 제외 · BIZ PRO 만) · `inputs.ts` 굳은 줄 우선 · `erasure.ts` 가 `gm_inputs` NULL + `purgeGmForUser` — 6파일 +203/−18 |
| `patches/02-access-check.patch` | 1 권한 | `report-gm/access.ts` `canDownloadGm` — 본인만 · 담당자 기본 거절 · BIZ PRO · 학생 배포 플래그 OFF 기본 · 거절은 404 — +74 |
| `patches/03-download-route.patch` | 1 입구 | `GET /v3/{id}/report/gm` · `report-gm/generate.ts`(입력 파일 안 만듦 · 임시 HTML/`.part` 즉시 삭제 · 글꼴 없으면 멈춤) · `job_failures_kind_chk` 에 `gm_pdf_fail`(phase2_2 한 자리) — 4파일 +253/−3 |
| `patches/04-runtime-packaging.patch` | 4 런타임 | Dockerfile `data/report-gm` · `data/region` · `GM_OUT` · 볼륨 `/app/var/gm` · `runtime-needs.json` 여섯 · compose 볼륨(백업 제외) · entrypoint · `.dockerignore var` — 5파일 +56/−1 |

적용: 앱 폴더에서 `git apply --directory=pca-platform patches/0N-*.patch`(01→02→03 차례 · 04 따로).

## 2. 테스트 증거 (격리 DB `cm_iso_e3` · 5433 · 실제 node-postgres · 실제 chromium)

- `trackE-r3.ts` **76/76 PASS**(`CHECKS.md` · `logs/trackE-r3.log`): S1 같은 트랜잭션 · note_text 13 · S2 굳은 줄 우선 7 · S3 탈퇴 파기 8 · S4 권한 표 13 · S5 입구 · 실패 22 · S6 패키징 13
- **note_text 재유입 음성 대조**: 허용 목록에 넣자 S1 3줄 FAIL → 되돌리고 9/9 PASS(`logs/trackE-r3-S1-*.log`)
- 측정 동결 14/14 · `v3:provenance` 18/18 · `image:check` OK · `db:chain` 8/8 · `errors:check` 8/8 · `routes:check` 10/10
- `git apply --check` 새 작업 트리에서 01→04 OK · 결과 16파일이 검사한 트리와 같음(`logs/git-apply-check.log`)
- 예상된 걸림: 검사 화면 동결 `session.ts` 1(승인 때 판본 갱신) · `trackE-r2.ts` P1 에서 멈춤(입력 파일이 더는 생기지 않음 · 한 줄 호환 사본 20/23, 걸린 셋 모두 설계 변경) · `v3:copy` 1 은 기준 커밋에서도 같다

## 3. BLOCKED

- **승인**: 공통 DB 칸 · `submit()` · `erasure.ts` · 새 API · CHECK 값 · 이미지/볼륨 — 넷 다 승인 전 적용 금지
- **글꼴**: Pretendard 를 저장소에 둘지 빌드 때 받을지 결정 전. 없으면 입구가 `fonts` 에서 멈춘다(다른 글꼴로 찍지 않는다)
- **담당자 개인 PDF**: 계약 · 동의 · 열람 기록 정책 전 기본 거절(코드에 여는 길 없음)
- **학생 배포**: KODATA 학생 배포 권리 · 기업 공식 수치 원문 대조 전 `GM_STUDENT_DISTRIBUTION` OFF
- 이 칸이 서기 전에 굳은 BIZ PRO 응시를 열지(재제출 · 일괄 채움) — 결정 대기

## 4. NOT VERIFIED

- Next 위 HTTP · 미들웨어 · 쿠키 · 로그인 이동 · 브라우저 다운로드(라우트의 `GET` 을 직접 불렀다)
- `docker build` · 컨테이너 안 `ops:check` · 볼륨 마운트와 주인 · 알파인 chromium 인쇄
- 운영 DB 마이그레이션 · 운영 데이터 양에서 제출 시간 · `/my/account` 서버 액션을 거친 파기
- `npm run typecheck` (형 검사 의존성 없음 · 실행기는 형을 지우고 돈다)

## 5. 다음 행동

1. 01 승인 → `db:upgrade` 먼저 · 앱 나중 · 검사 화면 판본 갱신 · `trackE-r2.ts` P1/P3 를 "굳은 줄이면 파일 없음"으로 고침
2. **파기 구멍 결정**: 탈퇴 뒤에도 `v3_experiences`(제목 · note_text)가 남는다(S3 관찰 · `erasure.ts` `REMOVE` 에 없음) — 공통 파기 변경 요청
3. 실험 경로 `gm-student.ts` 가 남긴 `var/pdf-gm/gm-student-*.html` 5개 정리 · 실험 경로를 `generateGm` 으로 옮기고 `inputs.ts` 의 옛 `canDownloadGm` 제거
4. 04 → 02 · 03(플래그 OFF 배포) → 글꼴 결정 → staging 시험 계정으로 운영 이미지 GM 인쇄 확인 → 권리 · 수치 대조 뒤 학생 배포 플래그

```bash
# 검사 다시 돌리기(패치를 적용한 작업 트리 · 격리 DB)
PGPORT=5433 DATABASE_URL=postgres:///cm_iso_e3 V3_PREVIEW_OPEN='*' \
  GM_INPUT_DIR=var/tmp/gm-r3/inputs GM_OUT=var/tmp/gm-r3/out REPORT_PDF_DIR=var/tmp/gm-r3/reports \
  CHROMIUM_PATH=<chromium> OUT=docs/metri/review/tracks-r3/E npx tsx scripts/lab/trackE-r3.ts
```
