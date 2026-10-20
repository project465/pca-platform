# 전주대 R5 보고 — 실제 플랫폼 실행 증거

가지 `feature/jju-campus` · 기준 R4 `f144368f` · 최종 검증 커밋 `8f0f4c13` · 2026-10-20

## 한 줄 판정

**실제 Next.js 서버 + 실제 Auth.js 로그인 + 실제 PostgreSQL + 실제 bcrypt 로 학생 하루(로그인 → 검사 저장·재개·제출 → 결과 → 본인 PDF)와
관리자 권한·기관 격리를 끝까지 밟았다. GitHub Actions run 39417128563: 14단계 전부 통과 · 브라우저 E2E 72/72 · 실제 화면 28장.**
다만 이것은 **합성 QA 자료로 돈 시연 증거**다. 운영 배포 · 운영 DB · 실제 학생 계정은 건드리지 않았고, 그래서 상용화 PASS 를 적지 않는다.

## Track 0 — 정상 빌드 환경

| 항목 | 결과 |
|---|---|
| 이 세션의 npm | 여전히 막힘. **R5 에서는 더 재시도하지 않았다**(PM 결정) |
| 대체 경로 | 사용자 승인으로 `.github/workflows/jju-verify.yml` 을 이 가지에만 추가. 공개 저장소의 GitHub 러너(무료) · 일회용 PostgreSQL 16 · 저장소 비밀값 미사용 |
| 패키지 | `next@15.5.25` · `next-auth@5.0.0-beta.29` · `bcryptjs@3.0.2` · `pg@8.16.3` · `playwright@1.56.1` · Node 22.23.3 |
| shim · fake Auth.js · mock | **쓰지 않았다.** R3 의 하네스(`jju-report-http.ts`)는 CI 에서 돌리지 않았고 E2E 가 그 자리를 대신한다 |
| 증거 회수 | artifact 저장소가 이 세션에서 막혀 있어 워크플로가 결과를 `jju-ci-evidence` 가지에만 커밋한다(승인 범위) |
| 신규 유료 환경 | 만들지 않았다(Railway 없음) |

실행 기록: run 39415157447(1차 · `next build` 실패 → `jju-access.ts` 의 타입 오류 1건) → run 39415559940(2차 · E2E 64/65) →
run 39417128563(3차 · 전부 통과).

## Track C — 결과와 PDF (실제 로그인)

| 확인 | 결과 |
|---|---|
| 본인 `GET /jju/report/{id}/pdf` | `200` · `content-type: application/pdf` · `content-disposition: attachment; filename="careermatri-jju-{id}.pdf"` · 첫 바이트 `%PDF` · `cache-control: no-store` |
| 브라우저 내려받기 | Chromium `download` 사건으로 실제 파일 저장(`careermatri-jju-{id}.pdf`) |
| A/B/C | `jju-verify.ts` 가 서로 다른 답(사람 A·B·C)으로 끝낸 세 학생으로 **실제 로그인**해 받은 PDF 셋: sha256 셋이 다르고, 응시번호·날짜를 빼도 글이 서로 다르다(9,397 · 9,552 · 9,952자) |
| 결과의 출처 | 제출 때 굳은 결과(`v3_snapshots`)를 그대로 읽는다. 결과를 하드코딩하지 않았다 |
| LLM·CV·MLOps | PDF 의 AI 역량 표에서 `미측정` · 점수 없음 |
| PDF 생성 | Chromium(Skia/PDF m155) · 4쪽 · 한글 글꼴 내장 |

## Track D — 관리자 권한과 C16

| 확인 | 결과 |
|---|---|
| C16 (실제 bcrypt · PostgreSQL 16.15) | `jju-c16` **8/8**: 양방향 단건 추가 · 다른 기관 담당자 아이디 · B2C 아이디 · CSV · rotate · 비밀번호 재발급 → 전부 거절 · 줄 변화 0 |
| C16 동시 등록 경쟁 | 같은 새 아이디를 JJU·PCU 가 같은 순간에 만들면 **성공 1 · 실패 1** · 계정이 한 학교에만 묶인다 |
| 접근 행렬 | `jju-access` 26/26: A 의 응시를 같은 학교 학생 · 전주대 담당자 · 배재대 학생 · 배재대 담당자가 열면 전부 404 |
| HTTP 로 다시 | E2E 에서 실제 쿠키로: 같은 학교 학생 B → 404 · 전주대 담당자 → PDF 404 · 결과 쪽 404 · 배재대 담당자 → 사업단 현황 거절 · PDF 404 · 로그인 없음 → 307 `/login` |
| 개인 결과 관리자 열람 | 열지 않았다(계약·동의·감사 요건 C14 전) |
| main 병합 | **하지 않았다.** C16 수정은 이 가지에만 있다 |

## Track E — 실제 화면 28장

전부 실제 Next 서버에 실제 Auth.js 로 로그인한 Chromium 이 찍었다(합성 그림 0장). 목록과 sha256 은 `ci/SHOTS.md`, 그림은 `jju-ci-evidence` 가지.

규격의 열두 자리: 로그인(01) · 홈 PC/모바일(02) · 전공(트랙) 선택(03·04) · 시작(05) · 저장(06) · 재개(07) · 제출(08) · 결과(09) ·
Evidence/Gap(10·11) · PDF 다운로드(12·13) · 관리자 현황(14·15·16) · 기관 격리 거절(17·18·19). 더해 A/B/C 결과(20).

## 실제 화면을 읽고 고친 결함 3

run 2 의 캡처를 사람이 읽고 찾았다. 셋 다 JJU 소유 파일이다. run 3 에서 검사로 다시 센다.

| 자리 | 보인 것 | 고침 |
|---|---|---|
| `src/app/jju/report/[attemptId]/route.ts` | 남의 리포트를 연 학생에게 영문 `not found` 한 줄 | 한국어 안내 404 쪽. 누구의 응시인지 · 있는지 적지 않는다 |
| `src/app/jju/admin/page.tsx` | 같은 줄에 `완료 4 · 응시 시작 0` | 다섯이 안 되어 집계 칸이 없는 것을 0 으로 적었다 → 진행·완료가 있으면 `5명 미만` |
| `src/app/jju/page.tsx` | 로그인한 학생에게 `학교 계정으로 로그인` | 감춤 |

## Track A · B — 이번 회차에 하지 않은 것

- **Track A(Slack형 학생 UI 개편)**: 시작하지 않았다. 이번 회차는 실제 실행 증거를 먼저 세웠다. 지금 학생 홈은 상태 카드(시작 전 · 진행 중 ·
  결과 있음)와 `시연 전용` 표시를 이미 들고 있고(02 그림), 작업공간 `/me` 는 공통 navy 띠를 쓴다.
- **Track B(공식 원문 확인)**: `www.jj.ac.kr` 이 이 세션에서 여전히 막혀 새로 VERIFIED 로 올린 사실이 없다. 화면은 출처와 `원문 페이지는 열지 못함` 을 그대로 적는다.

## 공통 코드라 고치지 않고 요청으로 올리는 것

| 번호 | 무엇 | 왜 JJU 가 고치지 않는가 |
|---|---|---|
| C18 | 로그인한 전주대 학생의 첫 자리가 `/cores`(일반 전공 고르기)다. 학교 학생이면 학교 진입(`/jju` 또는 트랙)으로 가야 한다 | `homePathFor` 는 공통 로그인 길 |
| C19 | 390px 검사 화면 머리에서 `[시연] AI·…` · `영역 훑기` · `자동 저장` 이 겹친다(07-resume.mobile) | 공통 검사 화면 · Gate 1·2 동결 |

## 공통 파일 변경

R4 이후 JJU 밖 공통 파일 변경 **0**. 바뀐 것은 `.github/workflows/jju-verify.yml`(승인) · `scripts/jju-*` · `src/app/jju/*` 뿐이다.
측정 동결(`v3:freeze:measure`) · 학교 등록부(`campus:check` 80/80) · DB 체인 검사 통과.

## 승인 요청

1. C16 수정을 main/PCU 로 올릴지(본체 PM 결정 · 지금은 이 가지에만)
2. C18 · C19 를 공통 쪽에서 고칠지
3. 시연을 사람이 직접 눌러 볼 staging(유료 Railway 환경)을 만들지. 만들지 않았다
4. 운영 DB 에서 C16 오염 확인 질의(`docs/jju/r3/security/C16/c16_readonly_audit.sql`, 읽기만)를 돌릴 사람

## 다시 돌리는 법

워크플로를 손으로(`workflow_dispatch`) 돌리거나 이 가지에 `[jju-verify]` 가 든 커밋을 올린다. 결과는 `jju-ci-evidence/runs/<시각>-<sha>-r<run>/`.
