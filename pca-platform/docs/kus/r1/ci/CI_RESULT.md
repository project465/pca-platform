# KUS CI 결과 (GitHub Actions `kus-verify`)

실제 Next.js 런타임 검증은 이 세션이 npm 에 닿지 못해 GitHub 러너에서 돌렸다. 결과는 잡 로그(글)에서 옮겼다.
화면 캡처와 PDF 는 공개 저장소 artifact 로 올리지 않았다(세종 가지와 같은 규칙).

## Run 1 — 39407357360 · 커밋 ae3ec62e · 2026-10-20

https://github.com/project465/pca-platform/actions/runs/39407357360

| 단계 | 종료코드 |
|---|---|
| npm ci | 0 |
| typecheck (`tsc --noEmit`, 저장소 전체) | 0 |
| next build | 0 |
| db chain + kus schema | 0 |
| v3:freeze:measure | 0 (14/14) |
| campus:check | **1** — CI 설정 결함(아래) |
| db:chain | 0 (8/8) |
| kus server e2e (`scripts/kus/verify.ts`, 실제 pg · bcrypt) | 0 — **PASS 79 · FAIL 0** · PDF 10쪽 × 3 |
| kus next browser e2e (`scripts/kus/e2e-next.ts`, standalone Next 서버 · Chromium) | 0 — **PASS 27 · FAIL 0** |
| shared files changed | 0 |
| 글로 된 결과 올리기 | 실패 — 로그 파일 이름의 `:` (artifact 이름 규칙) |

**실제 Next 에서 확인된 것(27)**: 로그인 전 차단 · 틀린 비밀번호 거절 · 학교 로그인 → `/kus` · 검사 전 홈 ·
`검사 시작하기` → `/campus/kus/start` → 공통 시작(등급 선택 없음) → 응시 열림 · 6화면 답하고 나가기 → 홈이
`진행 중 · 이어서 답하기` · 같은 응시로 이어하기 · **공통 검사 UI 61화면을 끝까지 답하고 제출** · 홈이 결과 상태 ·
개인별 결과 일곱 묶음 · 30·60·90일 계획 · 탐방 기록 저장(서버 액션) · 초안 · 리포트 웹 · **PDF 내려받기
602,742바이트**(서버 로그 `[kus-pdf] done attempt=6 … 1107ms`) · 다른 KUS 학생 리포트/PDF/탐방 404 · 학생의 담당자
화면 거절 · 배재 학생 · 진흥원 대역 사용자 KUS 홈 차단과 리포트 404 · KUS 담당자 집계 화면 · 담당자 화면에 개인
문장 없음 · 담당자도 학생 리포트 404.

**campus:check 1 의 원인**: 워크플로가 `V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1` 를 잡 전체에 걸어 두었다.
`campus:check` 는 `열지 않은 Core 의 자리가 검사 가능으로 서지 않는다` 를 재는데, 미리보기 문이 열려 있으면 배재
CS·EE 자리가 검사 가능으로 서서 바르게 걸린다. 같은 HEAD 를 이 세션에서 미리보기 없이 돌리면 **80/80**,
미리보기를 켜면 79/80(같은 한 줄). 코드 결함이 아니라 CI 설정 결함이고, 회귀 단계에서 두 변수를 빼도록 고쳤다.

## Run 2 — 39408882460 · 커밋 5c5a638d · 2026-10-20 · **전 단계 통과**

https://github.com/project465/pca-platform/actions/runs/39408882460

| 단계 | 종료코드 |
|---|---|
| npm ci | 0 |
| typecheck | 0 |
| next build | 0 |
| db chain + kus schema | 0 |
| v3:freeze:measure | 0 |
| campus:check (운영 조건 · 미리보기 끔) | 0 |
| db:chain | 0 |
| kus server e2e | 0 — PASS 79 · FAIL 0 · PDF 10쪽 × 3 |
| kus next browser e2e | 0 — PASS 27 · FAIL 0 · PDF 602,742바이트 · `[kus-pdf] done attempt=6 … 919ms` |
| shared files changed | 0 |
| 글로 된 결과 올리기 | 성공(artifact 12258342691 · 글만) |
