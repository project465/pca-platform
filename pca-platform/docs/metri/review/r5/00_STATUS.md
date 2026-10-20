# CareerMatri PCU — R5 현황 (00_STATUS)

작성 2026-10-20 · 가지 `claude/happy-faraday-q85c13` · 시작 기준 `a4a7121d`(= origin) · R5 커밋은 맨 아래 SHA 줄.
표시: `[x]` 끝남(검사 걸림 0) · `[~]` 했으나 사람 검수 · 승인 남음 · `[!]` 막힘(밖의 사정) · `[ ]` 안 함.
**브라우저로 밟지 않은 것은 `[x]` 로 적지 않는다.**

## R0 기준

- [x] HEAD = origin = `a4a7121d` · `bd86b349` · `169d9123` 모두 커밋으로 존재 (`logs/r0-baseline.log`)
- [x] 측정 동결 `ME_V3_MEASUREMENT_FREEZE_1` 14/14 · 기록 다시 적지 않음 (`logs/v3-measurement-freeze.log`)

## 트랙 판

| 트랙 | 상태 | 담당 | 막힌 까닭 | 고치는 길 |
|---|---|---|---|---|
| A 결과지(R5) | `[~]` 자동 검사 걸림 0 · 사람 검수 NOT VERIFIED | 개발 → 사업주 | — | `02_HUMAN_REVIEW.md` 판정 (R5-6) |
| B 학과 Catalog | `[x]` 서버 수준 2026·2027 자리 115/115 · 전체 153/153 · 학생별 갈림 19/19 · `[ ]` 브라우저 | 개발 | 브라우저: Staging 403 | R5-1 또는 R5-4 |
| C 안정성 | `[x]` 서버 수준 · `[ ]` 브라우저 | 개발 | 브라우저: Staging 403 | R5-1 또는 R5-4 |
| D 관리자 | `[x]` 서버 수준 38/38 · `[ ]` 화면 | 개발 | 화면: Staging 403 | 〃 |
| E PDF 연동 | `[~]` 20/20 · 01~04 · E-1 · E-2 미적용 | Core · PM | 승인 대기 | R5-7 · R5-8 |
| F 실물 검증 | `[!]` 브라우저 0걸음 | PM · 사업주 | Staging · Railway · npm 레지스트리 모두 CONNECT 403 | `STAGING_BLOCKED.md` |

## R1 실행 환경

- [!] `npm ci` · typecheck · `next build` — npm 레지스트리 403 · node_modules 의존성 0 · docker 데몬 없음 (`logs/build-env.log`)
- [~] CI `pcu-verify` R5 판 초안 + 바뀐 곳 diff (`ci/`) — **`.github/workflows/` 에 두지 않았다** · 승인 요청 R5-4
- [!] 기존 Staging `/me` — CONNECT 403 · 배포 가지 · SHA · 실행 상태 · DB 분리 **UNVERIFIABLE** (`STAGING_BLOCKED.md`)
- [x] 새 Railway 서비스 · 배포 · 운영 접속 — **하지 않음**(지시)

## R2 실제 화면 (학생 · 담당자 · 1440 · 390 · 360)

- [ ] 학생 흐름 9걸음 · 담당자 4걸음 — **NOT VERIFIED**(0장). 서버 수준 짝 증거는 `04_RELEASE_GATE.md` §2
- [x] 찍는 도구 준비: `scripts/lab/r5-staging-probe.ts`(Staging 읽기만) · `r35-inventory.ts` 의 `VIEWS=d,m,s`

## R3 · R4 결과지 재설계

- [x] Noto Serif KR 제거 · Pretendard 한 벌 · 12단 격자 · 역할 활자 8단 (`01_DESIGN_DIFF.md` §3)
- [x] 쪽 문법 12가지 · 시안 6쪽 문법 6/6 · **4쪽 구조가 사례마다 다름**(evidence-flow / gap-timeline / conflict-map)
- [x] POOR `강점` 0 · 금지어 24 · 단정어 9 · 상투 18 · 명조 · 넘침 · 8.5pt 아래 — 세 사례 0 (`pdf/LINT_RESULTS.md`)
- [x] 시안 6쪽 × 3 · 전체 12쪽 × 3 · 쪽 그림 · 같은 번호 비교판 6 · BEFORE/AFTER 4
- [~] 사람이 볼 여섯 자리(표지 · 4쪽 · 직무 비교 · 자기소개서 · 면접 · 마지막) — 사용자 검수 NOT VERIFIED

## R5 회귀 · R6 안전장치

- [x] 경합 R1~R5 · 반 40명 동시 제출 40/40 (`logs/trackC-race.log`) · DB 실제 정지 11/11 · 저장 26/26
- [x] 담당자 격리 · 역할 · 집계 = SQL · 5명 규칙 · CSV 38/38
- [x] 학생 배포 플래그 OFF · 담당자 개인 PDF 기본 거절 — 바꾸지 않음
- [ ] 01~04 · E-1 · E-2 · 파기 목록(A5) — 승인 전 적용 안 함

## 커밋

| SHA | 무엇 |
|---|---|
| __SHA__ | R5: 결과지 render9 · 6쪽 시안 · 전체 셋 · 검사 · Staging 차단 보고 · CI R5 초안 · 회귀 로그 |
