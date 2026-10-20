# F · 빌드와 브라우저 실행 경로 — 기존 CI 평가와 PM 승인 요청 (작업 1)

작성 2026-10-20 · 기준 `55b20bfb` · **상태: 승인 요청. 승인 전에는 워크플로를 저장소에 두지 않는다.**

## 1. 이 환경에서 막힌 것 (네트워크 정책 · 우회하지 않았다)

| 대상 | 결과 | 처리 |
|---|---|---|
| `registry.npmjs.org` | 연결 거절(000) | `npm ci` 불가 → `next` · `react` · `typescript` 타입 · `pg` 없음 → **`npm run typecheck` · `next build` · 브라우저 E2E 불가** |
| `app.careermatri.com:443` · Staging | CONNECT 403 | 운영 · Staging 접속 시도 안 함 |
| `api.github.com` | 200 | 저장소 읽기 · Actions 기록 조회만 |

인증 우회 · 프록시 비밀키 확인 · 임의 Production 접속은 **시도하지 않았다**(지시 그대로).
대신 저장소 밖 임시 실행기로 **실제 node-postgres 8.16.3** 을 세워 서버 동작을 직접 불렀다(Track C · D · E).
이 실행기는 타입을 검사하지 않으므로 **typecheck 는 NOT VERIFIED** 다.

## 2. 기존 GitHub Actions / CI

| 자리 | 가지 | 하는 일 | 이 가지에 쓸 수 있나 |
|---|---|---|---|
| `.github/workflows/sejong-verify.yml` | `claude/epic-galileo-lrvgxr` | `npm ci` → typecheck → `next build` → DB 체인 → 회귀 → standalone 서버 + Playwright E2E · PDF → 운영 Dockerfile 로 이미지 굽고 `APP_ENV=staging` 컨테이너 리허설 · 글로 된 결과만 업로드 · 캡처는 암호화 | **아니다.** `on.push.branches` 가 그 가지 하나이고 단계가 세종 자료에 묶여 있다. **틀은 그대로 쓸 수 있다**(run 39393453011 성공 · E2E 33/33 · rehearsal 6/6) |
| `.github/workflows/ci.yml` | `claude/upbeat-archimedes-ekbg0i` | `npm ci` → typecheck → build · PostgreSQL 옆에 띄운 도입 흐름 | **아니다.** `main` push · PR 에서만 돈다. 이 가지에는 그 파일이 없다 |
| 이 가지 `claude/happy-faraday-q85c13` | — | **워크플로 없음** (`.github/` 없음) | — |
| `main` · 운영 가지 `claude/amazing-thompson-w3f2o2` | — | 워크플로 없음 | — |

**결론: 기존 워크플로로는 이 가지에서 `npm ci` · typecheck · production build 를 돌릴 수 없다.**
기존 것을 고치거나 다른 가지의 파일을 옮기는 것도 **신규 워크플로 추가**에 해당하므로 아래 승인을 요청한다.

## 3. 승인 요청 — `pcu-verify` 워크플로 한 벌

| 항목 | 내용 |
|---|---|
| 파일 | `.github/workflows/pcu-verify.yml` (초안: `ci/pcu-verify.yml.draft` · **아직 두지 않았다**) |
| 도는 때 | 손으로(`workflow_dispatch`) 또는 이 가지 푸시 중 커밋 메시지에 `[pcu-verify]` 가 있을 때만 |
| 권한 | `permissions: contents: read` 하나. 푸시 · PR 쓰기 · 배포 · 비밀값 읽기 없음 |
| 자료 | 러너 안 일회용 PostgreSQL 16 + 합성 시험 계정(실행마다 무작위 비밀번호 · 로그에서 가림). 운영 · Staging DB · Railway · KODATA 원본 · 실제 개인정보 **사용 안 함** |
| 단계 | `npm ci` → `typecheck` → `next build` → `db-init`(db-chain.json) · `db:verify` → 측정 · 화면 동결과 서버 회귀 → `trackC-race`(풀 10 · 반 40명) → Chromium E2E(`r33-e2e` `FAULTS=0` · `pcu:campus` · `pcu:ops` · `v3-pdf-audit`) |
| 산출물 | **글로 된 결과만**(tsv · log · 보관 7일). 캡처 · PDF 는 `PCU_ARTIFACT_KEY` 비밀값을 따로 승인받은 뒤 암호화해서만 |
| 비용 | 1회 30~60분 · ubuntu-latest 1대(공개 저장소면 무료 분량 안) |
| 되돌리기 | 파일 하나를 지우면 끝. 다른 가지 · 운영에 영향 없음 |

**승인 받을 것 셋**: ① 워크플로 파일 추가 ② (선택) `PCU_ARTIFACT_KEY` 비밀값 추가 ③ 결과로 나온 typecheck · build
실패를 고치는 커밋을 이 가지에 올리는 것. **CI 빌드 성공만으로 브라우저 PASS 를 선언하지 않는다**(정식 배포 게이트):
E2E 단계가 따로 통과해야 하고 Staging 브라우저 확인(`STAGING_PLAN.md`)은 그다음이다.

## 4. 승인된 별도 로컬 환경

의존성이 깔린 승인 로컬 환경이 **이 세션에는 없다.** 있으면 같은 명령을 그대로 돌린다:

```bash
cd pca-platform && npm ci && npm run typecheck && NODE_OPTIONS=--max-old-space-size=4096 npm run build
DATABASE_URL=... bash scripts/db-init.sh && V3_PREVIEW_OPEN=BIZ_CORE_V1 V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json bash scripts/stage-serve.sh 3100
UI_BASE=http://127.0.0.1:3100 FAULTS=0 CORE=BIZ_CORE_V1 LEAF=PCU26_BIZ npx tsx scripts/lab/r33-e2e.ts
```

기록할 것: 명령 · 노드 판 · 커밋 SHA · 로그 전문(위 초안의 `meta.tsv` · `steps.tsv` 와 같은 꼴).
