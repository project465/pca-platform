# Track C 2차 · 플랫폼 안정화 (실제 pg 드라이버)

| 항목 | 판정 | 근거 |
|---|---|---|
| 실제 pg 드라이버(node-postgres 8.16.3)로 DB 장애·재연결 | **PASS** 11/11 ×3회 | `OUTAGE_realpg.md` · `logs/outage-realpg-after-fix-{1,2,3}.log` |
| 저장이 날아가는 중 제출(경합) | **FAIL → 고침 → PASS** | 고치기 전 `logs/outage-realpg.log`(O5 걸림: 늦은 저장 30/30 이 굳은 판정과 어긋남) |
| 중복 제출 · 동시 제출 · 동시 수정 | **PASS** | `STABILITY.md` 26/26(대체 드라이버 · 실제 드라이버 둘 다 · `logs/stability-*.log`) |
| 세션 만료 | **NOT VERIFIED** | next-auth 미설치 · Next 빌드 불가(npm 레지스트리 DNS 막힘) |
| 브라우저 저장/재개 · 반응형 UX E2E | **NOT VERIFIED** | 브라우저로 띄울 서버가 없다 |
| 무료 CI 활용 | **검토만** | 저장소에 `.github/workflows` 가 없다. GitHub Actions(비공개 저장소 월 2,000분 무료)에 `npm ci → typecheck → v3:all` 한 벌을 두면 npm 막힘을 우회한다. **워크플로 추가는 공통 변경이라 승인 전 하지 않았다** |

## P0 · 제출과 저장의 경합 (고친 것)

- 재현: 다른 탭의 저장 30개가 제출과 같은 순간 들어오면 30개가 전부 받아들여졌고, 굳은 판정이 지금 저장된 응답으로 다시 채점한 값과 달랐다.
- 고침(`src/lib/me-v3/runtime/session.ts`): 저장(`saveAnswer` · `savePicks`)이 응시 줄을 `FOR NO KEY UPDATE` 로 잡고 `status='in_progress'` 일 때만 쓴다(`writable()`). 제출은 `FOR UPDATE` 를 잡은 **뒤에** 응답을 다시 읽어 채점한다. 두 잠금이 서로를 기다리므로 제출이 굳힌 뒤에 온 저장은 `ok:false` 로 거절된다. `FOR SHARE` 는 `last_saved_at` 갱신과 교착해서 쓰지 않았다.
- `setProfile` · `savePicks3` 도 `status='in_progress'` 조건을 받는다. 화면 쪽 `answerAction` · `picksAction` 은 거절을 `{ ok:false }` 로 돌려준다.
- 따라 고친 검사: `v3-runtime-check`(굳은 응시는 팩이 바뀌지 않는다는 줄 추가 · 30/30) · `v3-provenance-check`(들여쓰기와 무관한 정규식).
- 화면 동결: `ui-lock.json` 지문만 다시 적었다(판본 그대로 `ME_V3_2_ASSESSMENT_UI_V44`). 측정 동결은 기록을 다시 적지 않은 채로 14/14.
