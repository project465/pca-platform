# Track C 4차 · 안정성 — 제출 경합 P0 수정 유지 · 서버 수준 재검

기준 HEAD `feb3ea13`(race · stability · outage 실행 시점) · `697b4b19`(auth-check 실행 시점 · 사이에 바뀐 코드는
`src/lib/me-v3/report-gm/` 새 파일뿐이라 응시 · 저장 · 제출 · 로그인 경로와 겹치지 않는다).
드라이버: **실제 node-postgres 8.16.3**(저장소 밖 `run-realpg`) · 풀 10(`DATABASE_POOL_MAX` 기본값).

## 1. 실제 구현

- 이 회차 코드 변경 **없음**. 3차 두 커밋을 그대로 둔다:
  - A `93ba9265` — `submit()` 이 잠금을 쥔 연결로 읽는다(반 전체 동시 제출 P0 · **계약 변경 없음**).
  - B `c5f22344` — 끝난 응시에 대한 `note` · `profile` · `picks3` · `cursor` 가 `{ok:false}` · 화면 `push()` 가 그것을 실패로 센다
    (**공통 API 계약 의미 확장 · PM 승인 전 운영 병합 금지**). 재승인 요청: **`PM_REQUEST_API_CONTRACT.md`**.

## 2. 테스트 증거

| 검사 | 환경 | 결과 | 로그 |
|---|---|---|---|
| `trackC-race.ts` 10판 × 서버 동작 22번을 제출과 같은 순간 + 반 40명 동시 제출 | 격리 5433 `cm_iso_c` · 207초 | R1~R5 **PASS** · 결과 한 줄 10/10 · 다시 채점 같음 10/10 · 뒤 동작 DB 그대로 10/10 · `ok:true` 거짓 답 0 · 반 **40/40** · 다시 채점 같음 40/40 · 3,443ms | `logs/race-realpg-r4.log` · `RACE_r4.md` |
| `trackC-stability.ts` C1~C9: 중복 응시 없음 · 동시 저장 · 남의 응시 거절 · **비로그인 → `/login`** · **이어하기(재개)** · **동시 제출 다섯 → 결과 한 벌** · 끝난 응시 쓰기 거절 · 사용자별 보호 · 재현성 · 연결 끊김 뒤 재접속 | cm_dev | **26 / 26** | `logs/stability-realpg.log` |
| `trackC-outage.ts` O1~O5: DB 를 `pg_ctlcluster` 로 실제로 멈춤 → 저장 실패(304ms · 성공으로 꾸미지 않음) → 재기동 뒤 프로세스 재시작 없이 재접속 · 두 탭 동시 저장 · 저장 중 제출(받아들인 저장 28/30 · 판정 = 다시 채점) | 격리 5433 `cm_iso_c` | **11 / 11** | `logs/outage-realpg.log` |
| `scripts/auth-check.ts`(서버 수준 로그인 판단): 소셜 신원 연결 · 봉투 위변조 · `safeNext` · **로그인 시도 제한 ⑯ 아홉**(다섯 번째 잠김 · 존재 여부 비노출 · 성공 시 0) · 정지 계정 | cm_dev | **46 / 46** | `logs/auth-check-realpg.log` |

받아들인 답 수가 판마다 갈렸다(answer 1~11) — 끼어드는 차례가 실제로 바뀌었다. 판마다 같은 차례만 재면 경합을 잰 것이 아니다.

## 3. BLOCKED

- 브라우저 E2E(두 탭 · 세션 쿠키 · 로그인 화면): Next 빌드 불가 — npm 레지스트리 막힘(`../F/logs/build-env.log`).
  CI 워크플로 · Staging 이 **승인 전**이라 다른 길이 없다(`../CORE_APPROVAL_REQUESTS_BCDF.md` A1 · A2).
- 커밋 B 의 운영 병합: PM 승인 대기(`PM_REQUEST_API_CONTRACT.md`).

## 4. NOT VERIFIED

- **브라우저 두 탭**(한 탭 제출 · 다른 탭 저장)에서 `저장 실패 · 다시 시도` 가 실제로 서는 모습.
- **세션 만료**: 만료 뒤 저장 → 로그인 이동(303) · 답 보존. 서버 검사는 세션을 바꿔 끼우므로 실제 쿠키 만료를 재지 않았다.
- **브라우저 로그인**(쿠키 · 미들웨어 · `authorize()` 를 거친 302). `auth-check` 는 판단 함수와 DB 를 실제로 돌리지만 HTTP 를 거치지 않는다.
- `npm run typecheck` · production build.
- 운영 · Staging 의 풀 크기와 동시 제출 수.

## 5. 다음 행동

1. PM: 커밋 B 승인 여부 · `reason` 칸(다른 탭 제출 안내) 여부 — `PM_REQUEST_API_CONTRACT.md`.
2. PM: CI 승인 → 러너에서 typecheck · build · `trackC-race`(`RACE_ALLOW_DB` 경로) · 브라우저 경합 E2E.
3. Staging 승인 뒤 `../../tracks-r3/F/BROWSER_CHECKLIST.md` #1 · #3~#6 · #12 · #13 을 브라우저로.

```bash
PGPORT=5433 DATABASE_URL=postgres:///cm_iso_c V3_PREVIEW_OPEN='*' ROUNDS=10 CLASS=40 TAG=r4 OUT=docs/metri/review/tracks-r4/C npx tsx scripts/lab/trackC-race.ts
DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' OUT=var/tmp-r4c npx tsx scripts/lab/trackC-stability.ts
PGPORT=5433 DATABASE_URL=postgres:///cm_iso_c V3_PREVIEW_OPEN='*' OUT=var/tmp-r4c npx tsx scripts/lab/trackC-outage.ts   # DB 를 실제로 멈춘다
DATABASE_URL=postgres:///cm_dev npx tsx scripts/auth-check.ts
```
