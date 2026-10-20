# Track E · 총괄 PM 변경 요청 — Gold Master PDF 를 제품의 PDF 요청과 권한에 잇기

- 작성: 2026-10-20 (2차) · 상태: **요청. 승인 전에는 운영 환경 · 공통 코드 · 배포를 바꾸지 않는다.**
- 지금 Gold Master 는 저장소 안의 실험 경로(`scripts/lab/gm-student.ts`)로만 뽑힌다. 운영 PDF 경로
  (`/v3/{id}/result/pdf` · `var/reports`)와 이어져 있지 않다(`CHECKS.md` P4 · 1차 E5).

## 0. 이번 회차에 한 것(승인 없이 되는 범위)

| 바꾼 것 | 파일 | 까닭 | 검사 |
|---|---|---|---|
| GM 파기 함수 `purgeGm(응시)` · `purgeGmForUser(사람)` | `src/lib/me-v3/report-gm/inputs.ts` | 입력 고정 파일이 개인정보다. 파기가 부를 자리를 먼저 둔다 | `CHECKS.md` P3 (7가지) |
| 입력 고정 파일에서 자유입력 한 줄(`note_text`) 제외 · 판본 `gm-input.2` | 같은 파일 | DB 는 1년 뒤 그 칸을 지우는데 파일에 남으면 파기가 반쪽이다. GM 렌더는 그 칸을 읽지 않는다 | P1 |
| GM 산출 자리를 입력 모듈 하나가 든다(`gmOutDir()`) | `inputs.ts` · `scripts/lab/gm-student.ts` | 파기가 생성과 같은 자리를 지워야 한다 | P3 |

**`src/lib/erasure.ts` · Dockerfile · `deploy/runtime-needs.json` · DB 스키마 · 운영 PDF 경로는 고치지 않았다.**

## 1. 요청 1 — GM 서버 입구 (공통 API · 승인 필요)

| 항목 | 제안 |
|---|---|
| 주소 | `GET /v3/{attemptId}/report/gm` (새 경로 · 기존 `/result/pdf` 를 바꾸지 않는다) |
| 켜는 조건 | `FEATURE_GM_REPORT=yes` **그리고** 응시의 Core 가 `BIZ_CORE_V1` · 등급 PRO. 아니면 404 |
| 누가 | **본인만.** `attemptOf(id, user.id)` 가 주인을 확인하고 `canDownloadGm()` 이 한 번 더 본다. 기관 담당자는 계약·동의 칸이 없어 **기본 거절**(rbac `canReadParticipantReport` 그대로) |
| 차례 | 권한 → `frozenInput()` → `build3`/`full6` → 인쇄 → `var/gm-out/{id}/` 에 둔다 → `Content-Disposition: attachment` · `Cache-Control: no-store` 로 내보낸다 |
| 실패 | 걸음과 까닭을 `job_failures`(새 `kind` 값 `gm_pdf_fail`)와 서버 로그에 남기고, 사람에게는 웹 결과지로 가는 쪽을 내준다(운영 PDF 경로의 sorry page 와 같은 모양). **덜 만든 PDF 를 남기지 않는다**(1차 E4) |
| 배포 전 금지 | KODATA 학생 배포 권리 확인 전 · 기업 수치 원문 대조 전에는 **학생에게 열지 않는다**(Track A 조건) |

`job_failures.kind` 에는 CHECK 제약이 있다(`db/schema_phase2_2.sql:149` `job_failures_kind_chk`). 값 하나를 더하는 일이 **DB 변경**이다(공통 · 승인 필요).

## 2. 요청 2 — 제출 시점 스냅샷과 GM 입력 고정의 일치 (Core 요청 1 의 확정)

지금(임시 해법)과 확인된 사실:

- 기준 시각 = 그 응시의 **가장 최근 굳은 결과의 `created_at`** = `submitted_at`. 같은 트랜잭션의 `now()` 라 한 값이다(P1: `2026-10-20T09:25:36.044626Z` 둘 다).
- 등급을 올려 다시 굳으면 기준 시각이 새 제출로 옮겨 가고, 옛 입력 파일은 쓰지 않고 다시 모은다(P2). **결과지가 가장 최근 굳은 줄을 읽는 것과 같은 규칙**이다.
- 기준 시각 뒤에 만들었거나 고친 경험 기록은 넣지 않고 제목만 `excluded` 에 적는다(1차 E1).

**제안(승인 필요 · DB):** 제출할 때 경험 기록을 스냅샷과 **같은 트랜잭션에서** 적는다. `v3_snapshots` 에 `gm_inputs jsonb` 한 칸(또는 별도 표)을 더한다. 그러면

1. 파일이 필요 없다 → 볼륨 · 재배포 · 파기 문제가 사라진다(요청 4 가 줄어든다).
2. 파기는 기존 `erasure.ts` 가 스냅샷 줄을 다루는 그대로 따라간다.
3. `edited_after` 처럼 **되살릴 수 없는 글**이 생기지 않는다(제출 순간의 글이 그대로 남는다).

승인 전까지는 지금 파일 고정을 유지하고, **운영에서 굳힌 입력 파일을 만들지 않는다.**

## 3. 요청 3 — 개인정보 보존 · 파기 (공통 코드 · 승인 필요)

| 무엇 | 지금 | 요청 |
|---|---|---|
| 탈퇴 · 파기 | `erasure.ts` 가 GM 파일을 모른다 | `erasure.ts` 가 사람을 떼어 낼 때 `purgeGmForUser(userId)` 를 부른다(한 줄) |
| 자유입력 1년 | DB 는 `purge_after` 로 지운다 | 파일에는 이제 담지 않는다(이번 회차 · `gm-input.2`) |
| 보존 기간 | 정하지 않음 | 결과 PDF(`var/reports`)와 같은 기간. 응시가 지워지면 GM 파일도 같이 |
| 기관 담당자 열람 | 기본 거절 | 계약 칸 · 본인 동의 칸 · 열람 기록 셋이 생기기 전에는 계속 거절(사업주 · 계약 결정) |

## 4. 요청 4 — 운영 파일 패키징 · 볼륨 (배포 · 승인 필요)

`CHECKS.md` P5: 운영 이미지 마지막 단계가 GM 실행 파일을 **담지 않는다**(예상된 FAIL · 고치지 않음).

```Dockerfile
# 승인되면 run 단계에 더한다 (이번 회차에 적용하지 않았다)
COPY --from=build --chown=metri:nodejs /app/data/report-gm ./data/report-gm
COPY --from=build --chown=metri:nodejs /app/data/region ./data/region
# 글꼴: 저장소 밖(var/pdf-gm/fonts/pretendard · OFL 1.1). 저장소에 넣을지 빌드 때 받을지 결정 필요
```

- 볼륨: `var/gm-inputs` · `var/gm-out` 를 **한 볼륨**(`/app/var/gm`)으로. 운영 PDF 볼륨(`/app/var/reports`)과 섞지 않는다. 요청 2 가 승인되면 `var/gm-inputs` 는 필요 없다.
- `deploy/runtime-needs.json` 에 위 자리를 적어 `image:check` · `ops:check` 가 같이 보게 한다.
- 이미지 안에서 Chromium 경로는 운영 PDF 와 같은 `resolveChromium()` 을 쓴다(지금 `gm-student.ts` 는 `GM_CHROMIUM` 환경변수).

## 5. 승인 순서 제안

1. 요청 3 의 `erasure.ts` 한 줄(가장 작고 개인정보 쪽) → 2. 요청 2(DB 한 칸) → 3. 요청 4(이미지 · 볼륨) → 4. 요청 1(입구 · 기능 플래그 꺼 둔 채 배포) → 5. KODATA 권리 · 기업 수치 대조가 끝난 뒤 플래그를 BIZ PRO 에만 켠다.

## 6. NOT VERIFIED

- 새 입구는 만들지 않았으므로 브라우저 다운로드 · 쿠키 · 운영 컨테이너 인쇄는 **NOT VERIFIED**.
- 운영 볼륨 · 운영 DB 에서의 파기는 **NOT VERIFIED**(이 세션은 운영에 닿지 않는다).
