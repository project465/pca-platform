# Track C 3차 — 제출 경합 P0 (작업 2)

기준 `55b20bfb` · 실제 PostgreSQL 16(격리 클러스터 `16/iso` · 포트 5433 · DB `cm_iso_c`) ·
**실제 node-postgres 8.16.3** · 풀 10(`DATABASE_POOL_MAX` 기본값).

## 실제 구현

| 커밋 | 무엇 | 계약 |
|---|---|---|
| A `93ba9265` | `submit()` 이 잠금을 쥔 연결로 응답·근거·응시 줄을 읽는다(`attemptOf` · `answersOf` · `picksOf` · `submissionOf` 가 연결을 받는다) | 변경 없음 |
| B `c5f22344` | `saveNote` 가 `writable()` 을 지난다 · `setProfile` · `savePicks3` · `moveTo` 가 끝난 응시에서 `false` · 서버 동작 넷이 그 값을 돌려준다 · 화면 `push()` 가 `{ok:false}` 를 실패로 센다(`ME_V3_2_ASSESSMENT_UI_V45`) | **변경 — PM 승인 전 운영 병합 금지** |

**새로 찾은 P0**: 제출이 잠금을 쥔 채 풀에서 연결을 하나 더 기다렸다. BEFORE 에서 **반 14명 동시
제출 가운데 7명이 `timeout exceeded when trying to connect` 로 떨어졌다.** 수업 끝에 한 반이
같이 제출하는 장면이 그대로 이 모양이다. 2차의 대체 드라이버로는 보이지 않던 자리다.

## 테스트 증거

| 검사 | BEFORE `55b20bfb` | AFTER | 로그 |
|---|---|---|---|
| `trackC-race.ts` 15판 × 22동작 + 반 14명 | R1~R5 전부 **FAIL** (제출 4/5판 실패 · 반 7/14) | R1~R5 **PASS** (15/15 · 14/14 · 1.3초) | `logs/race-before-55b20bfb.log` · `logs/race-realpg.log` · `RACE_*.md` |
| 같은 검사 5판 + 반 40명 | — | **PASS** (40/40 · 3.5초) | `logs/race-realpg-class40.log` |
| 2차 서버 검사 `trackC-stability.ts` (real pg) | 26/26 | **26/26** | `logs/stability-realpg.log` |
| 2차 `trackC-outage.ts` (DB 를 실제로 멈춤) | 11/11 | **11/11** | `logs/outage-realpg.log` |
| 측정 동결 `ME_V3_MEASUREMENT_FREEZE_1` | — | 기록을 다시 적지 않은 채로 통과 | 회귀 로그(LOGS) |
| 검사 화면 동결 | — | V44 → **V45** 로 올리고 다시 적음(파일 21벌) · Core UI 묶음 다시 적음 | 회귀 로그 |

R2 는 **굳은 판정 전체**를 지금 DB 에 남은 응답으로 다시 채점한 것과 견준다(때 · 번호 칸만 뺀다).
판마다 받아들인 답 수가 달랐다(15판에서 7가지): 끼어드는 차례가 실제로 바뀌었다.

계약 영향 분석: **`API_CONTRACT_REVIEW.md`**.

## BLOCKED

- 브라우저 E2E(두 탭에서 하나는 제출 · 하나는 저장): Next 빌드 불가(npm 레지스트리 막힘). 초안
  CI(`../F/ci/pcu-verify.yml.draft`)가 같은 검사를 러너에서 돌리게 적었다 — **새 워크플로라 PM 승인 대기.**

## NOT VERIFIED

- `npm run typecheck` (이 환경에 `next` · `@types/*` 가 없다).
- 화면에서 `저장 실패 · 다시 시도` 가 실제로 서는 모습(브라우저).
- 운영 · Staging 의 풀 크기와 동시 제출(운영에 닿지 않는다).

## 다음 행동

1. PM: 커밋 B(계약 변경) 승인 여부 · `reason` 칸 추가(다른 탭에서 제출됨 안내) 여부.
2. PM: CI 워크플로 초안 승인 → 러너에서 typecheck · build · 브라우저 경합 E2E.
3. 운영 반영 시 `DATABASE_POOL_MAX` 와 동시 제출 수를 Staging 에서 한 번 잰다(이 검사 그대로).
