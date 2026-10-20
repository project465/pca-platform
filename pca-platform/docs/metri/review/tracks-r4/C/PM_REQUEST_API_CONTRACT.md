# PM 승인 요청 (재제출) — 응시 저장 동작의 `{ok:false}` 의미 확장 · 커밋 `c5f22344`

작성 2026-10-20 · 받는 사람: 본체 총괄 PM · **상태: 승인 대기(3차에 제출 · 답 없음 → 4차 재제출).**
분석 원문은 `../../tracks-r3/C/API_CONTRACT_REVIEW.md` 이다. 여기서는 되풀이하지 않고 요청과 남은 것만 적는다.

## 요청

| # | 승인 받을 것 | 권고 |
|---|---|---|
| R1 | 커밋 B `c5f22344` 를 운영 병합 대상에 넣는다 | **승인** |
| R2 | (선택 · 다음 회차) `ok:false` 에 `reason` 칸 하나(`"submitted"`)를 더해 `제출이 끝난 검사입니다 · 결과 보기` 로 잇는다 — 반환 꼴에 칸을 더하는 변경 | 별도 승인 · 지금은 보류 가능 |

## 무엇이 바뀌나 (한 줄씩)

- 반환 꼴 `{ ok: boolean }` 은 **그대로**다. 바뀌는 것은 **언제 `false` 가 나오는가**: 끝난 응시에 대한 `noteAction` ·
  `profileAction` · `picksAction3` · `cursorAction` 이 이제 `false`(전에는 0줄 갱신이나 굳은 응시에 쓰고도 `true`).
- 유일한 소비자 `src/app/v3/[attemptId]/screen.tsx` 의 `push()` 가 `{ok:false}` 를 실패로 세어 `저장 실패 · 다시 시도` 를 띄운다
  (전에는 거절된 저장에도 `저장됨`). 판본 `ME_V3_2_ASSESSMENT_UI_V45` · 문항 · 보기 · 저장 값 · 문면 그대로.
- 다른 소비자 없음: 공개 HTTP API 가 아니고 `/api/*` · 담당자 화면 · 결과지 · PDF 가 부르지 않는다(원문 2절 전수 목록).
- 바뀐 파일: `src/app/v3/[attemptId]/actions.ts` · `screen.tsx` · `src/lib/me-v3/runtime/session.ts` · `ui-version.ts` · 화면 동결 두 벌.

## 승인하지 않으면

되돌리면 1차부터 있던 **제출 뒤 메모 기록**(굳은 응시에 `skipped` 줄이 생겨 다시 채점한 판정이 굳은 판정과 갈림)이 다시 열리고,
화면이 거절된 저장을 `저장됨` 으로 적는다. 커밋 A `93ba9265`(반 전체 동시 제출 P0)는 계약을 바꾸지 않으므로 이 승인과 무관하게 유지한다.

## 4차 서버 수준 재검 (같은 HEAD · 실제 node-postgres 8.16.3)

| 검사 | 결과 | 로그 |
|---|---|---|
| 경합 10판 × 22동작 + 반 40명 | R1~R5 PASS · R4 `ok:true` 거짓 답 0 · 40/40 | `logs/race-realpg-r4.log` |
| 안정성 C1~C9 | 26/26 | `logs/stability-realpg.log` |
| DB 실제 정지 · 재기동 | 11/11 | `logs/outage-realpg.log` |
| 서버 수준 로그인 판단 · 시도 제한 | 46/46 | `logs/auth-check-realpg.log` |

## 승인과 무관하게 아직 NOT VERIFIED

- **브라우저 두 탭**: 한 탭 제출 · 다른 탭 저장에서 `저장 실패 · 다시 시도` 표시와 다시 누름의 동작.
- **세션 만료**: 만료 뒤 저장 → 303 로그인 이동 · 답 보존(서버 검사는 세션을 바꿔 끼워 실제 쿠키 만료를 재지 않는다).
- **로그인**: 실제 쿠키 · 미들웨어 · `authorize()` 를 거친 HTTP 302(판단 함수만 `auth-check` 로 쟀다).
- `npm run typecheck` · production build(이 환경 npm 레지스트리 막힘).

위 넷은 CI 워크플로(`../../tracks-r3/F/CI_AND_APPROVAL_REQUEST.md`)와 Staging(`../../tracks-r3/F/STAGING_PLAN.md`) 승인 뒤
`../../tracks-r3/F/BROWSER_CHECKLIST.md` #1 · #3 · #6 · #12 에서 증거(캡처 · HTTP 상태 · 서버 로그 줄 · Git SHA)를 남긴다.
