# R5 · 출시 게이트

작성 2026-10-20 · 가지 `claude/happy-faraday-q85c13`.
판정 낱말: **PASS**(검사가 돌았고 걸림 0) · **FAIL** · **BLOCKED**(밖의 사정으로 돌릴 수 없음) · **NOT VERIFIED**(아직 안 함).
**CI 빌드 · 서버 수준 PASS 는 브라우저 PASS 가 아니다.**

## 1. 기존 Staging — 접근할 수 없음 (정확한 차단 원인)

사용자 지시대로 새 Railway 서비스를 만들기 전에 **기존 Staging `https://charming-reverence-staging.up.railway.app/me` 를 먼저** 확인하려 했다.

| 확인할 것 | 결과 | 근거 |
|---|---|---|
| 연결 | **BLOCKED** | 이 세션의 송신 프록시가 `CONNECT charming-reverence-staging.up.railway.app:443` 에 **403** 으로 답한다(`connect_rejected` · "gateway answered 403 to CONNECT (policy denial or upstream failure)"). curl `(56) CONNECT tunnel failed, response 403` · HTTP 000 · 12:24:02Z 와 12:46:05Z · 12:55Z 세 번 같음 → `logs/staging-reach.log` |
| 배포 가지 | **UNVERIFIABLE** | Railway 화면 · API(`railway.app` · `backboard.railway.app`)도 같은 403. 저장소 문서 어디에도 Staging 이 가리키는 가지가 적혀 있지 않다. GitHub MCP 에는 Deployments 를 읽는 도구가 없다 |
| 커밋 SHA | **UNVERIFIABLE** | `/api/health` 는 설계상 판본을 내놓지 않는다(`{ok:true}` 만) — 열렸어도 SHA 는 나오지 않는다 |
| 실행 상태 | **UNVERIFIABLE** | 위 연결 차단 |
| DB 분리(운영과 다른 Postgres) | **UNVERIFIABLE** | Railway 화면이 필요하다 |
| 최신 PCU 코드 반영 여부 | **UNVERIFIABLE** | 위 둘이 필요하다. **반영돼 있지 않더라도 승인 없이 배포하지 않는다** → `03_CORE_APPROVAL_REQUESTS.md` R5-3 변경 요청 |

**하지 않은 것**: 403 을 우회하는 재시도 · 프록시 설정 변경 · 다른 경로로의 접속 · Production(`app.careermatri.com`) 접속 · 새 Railway 서비스 생성 · 배포.

**풀리는 최소 조치(하나만 있으면 된다)**
1. 환경 설정 → Network access → Allowed domains 에 `charming-reverence-staging.up.railway.app` (R5-1) — 이 세션에서 바로 찍는다.
2. 또는 CI `pcu-verify` R5 판 승인 + 비밀값 다섯(R5-4 · R5-5) — GitHub 러너의 `staging-probe` job 이 같은 화면을 1440 · 390 · 360 으로 찍는다(`scripts/lab/r5-staging-probe.ts` · 읽기만).
3. 배포 가지 · SHA · DB 분리는 Railway → staging → Deployments 맨 위 줄을 알려 주시면 된다(R5-2).

## 2. 학생 · 담당자 브라우저 13걸음 — 전부 NOT VERIFIED

이 회차에 **브라우저로 밟은 걸음은 0** 이다(위 차단 · 이 세션은 `npm ci` 도 막혀 로컬 Next 빌드가 없다 → `logs/build-env.log`).
옆 칸은 같은 동작을 **서버 수준에서 실제 PostgreSQL 로** 돌린 이 회차의 증거다.

| # | 걸음 | 브라우저 | 서버 수준 (R5 · 실제 node-postgres) | 캡처 폭 |
|---|---|---|---|---|
| [ ] 1 | 학교 계정 로그인 | NOT VERIFIED | (재실행 없음 · R33 `auth:check` 16절) | 1440 · 390 · 360 |
| [ ] 2 | 학과 선택 → 검사 시작(PRO) | NOT VERIFIED | `trackB-dept-e2e` 자리 115 (`logs/trackB-dept-e2e.log`) | 〃 |
| [ ] 3 | 임시 저장 | NOT VERIFIED | `trackC-race` R1~R5 PASS (`logs/trackC-race.log`) | 〃 |
| [ ] 4 | 새로고침 | NOT VERIFIED | `trackC-stability` 26/26 | 〃 |
| [ ] 5 | 재개(로그아웃 → 재로그인) | NOT VERIFIED | `trackC-stability` 26/26 | 〃 |
| [ ] 6 | 다른 탭 제출 경합 | NOT VERIFIED | `trackC-race` R1 · 반 40명 동시 제출 40/40 | 〃 |
| [ ] 7 | 결과 | NOT VERIFIED | `trackC-race` R2 굳은 판정 = 다시 채점 | 〃 |
| [ ] 8 | PDF 버튼 | NOT VERIFIED | 운영 PDF 경로 재실행 없음 · GM(R5) 는 E-2 승인 대기 | 〃 |
| [ ] 9 | 담당자 `/org/v3` 집계 | NOT VERIFIED | `trackD-admin` 38/38 (집계 = SQL · 5명 규칙) | 〃 |
| [ ] 10 | 학교 격리 | NOT VERIFIED | `trackD-admin` 두 학교 격리 | 〃 |
| [ ] 11 | CSV 내려받기 | NOT VERIFIED | `trackD-admin` CSV 칸 · 수식 막기 | 〃 |
| [ ] 12 | 담당자 개인 PDF 거절 | NOT VERIFIED | `trackD-admin` 기본 거절 | 〃 |
| [ ] 13 | DB 끊김 → 복구 | NOT VERIFIED | `trackC-outage` 11/11 (클러스터를 실제로 멈췄다 띄움) | 〃 |

걸음마다 남길 증거: 캡처(세 폭) · URL · Git SHA · 시각 · 가명 계정 · HTTP 상태 · 서버 로그 줄. 하나라도 없으면 NOT VERIFIED.
비교 기준: 승인된 작업공간 홈(`docs/metri/shots/reference/reference-home-desktop.png`). **서버 함수 테스트로 브라우저 PASS 를 대신하지 않는다.**

## 3. 이 회차 회귀 (R5 커밋 기준 · 서버 수준)

| 검사 | 결과 | 로그 |
|---|---|---|
| 측정 동결 `ME_V3_MEASUREMENT_FREEZE_1` | PASS · 기록 다시 적지 않음 | `logs/v3-measurement-freeze.log` |
| 저장 · 이어하기 · 격리 | 26/26 PASS | `logs/trackC-stability.log` |
| DB 실제 정지 · 복구 | 11/11 PASS | `logs/trackC-outage.log` |
| 경합 R1~R5 · 반 40명 동시 제출 | PASS · 40/40 | `logs/trackC-race.log` |
| 담당자 격리 · 역할 · 집계 · CSV | 38/38 PASS | `logs/trackD-admin.log` |
| GM 연동(같은 입력 → 같은 HTML · 식별자 · 글꼴) | 20/20 PASS | `logs/trackE-r4-render8.log` |
| Catalog 2026 · 2027 학과 자리 115 끝까지 | PASS · 115/115 · 전체 153/153 · 학생별 갈림 19/19 | `logs/trackB-dept-e2e.log` |
| R5 결과지 검사(세 사례) | 걸림 0 | `pdf/LINT_RESULTS.md` |
| typecheck · next build | **BLOCKED** (npm 레지스트리 403) | `logs/build-env.log` |

## 4. 판정 (셋을 따로)

| 용도 | 판정 | 까닭 · 남은 것 |
|---|---|---|
| **학교 시연** (담당자에게 화면 · 종이 보여 주기) | **CONDITIONAL** | R5 종이 세 벌 · 12쪽은 보여 줄 수 있다(사람 검수 전 시안으로 밝혀서). 화면 시연은 Staging 을 이 세션이 확인하지 못해 **사람이 직접 띄워 보여 줄 때만** |
| **학생 파일럿** (실제 학생 계정 배포) | **NO-GO** | 브라우저 13걸음 0 · Staging 배포 가지 · SHA · DB 분리 미확인 · `test001` Production Canary 미완 · 학생 배포 플래그 OFF |
| **정식 배포** | **NO-GO** | 위에 더해 CI 빌드 미실행 · E-1 · E-2 · A3 · A5 · A10 승인 대기 · 사람 검수 대기 |
