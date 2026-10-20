# Track C 3차 · 제출 경합 반복 (before-55b20bfb)

- 실행: 2026-10-20T10:08Z · 실제 node-postgres 8.16.3 · DB `postgres:///cm_iso_c` (격리 5433) · BIZ_CORE_V1 · 5판
- 판마다 응시 하나를 끝까지 답한 뒤 서버 동작 6갈래 22번을 제출과 같은 순간에 보낸다.
- 받아들인 답 수가 판마다 3가지로 갈렸다(끼어드는 차례가 실제로 바뀌었다는 뜻).

| 판정 | 확인 |
|---|---|
| **FAIL** | R1 굳은 결과가 판마다 한 줄 |
| **FAIL** | R2 굳은 판정 = 지금 남은 응답으로 다시 채점한 판정 (1/5) |
| **FAIL** | R3 제출 뒤에 보낸 일곱 갈래가 DB 를 바꾸지 않는다 (2/5) |
| **FAIL** | R4 제출 뒤에 보낸 동작이 ok:true 로 답하지 않는다 (1/5) |
| **FAIL** | R5 학생 14명(풀 10보다 많다)이 저장 셋과 제출을 같은 순간에 보낸다: 제출 성공 7/14 · 굳은 판정 = 다시 채점 7/14 · 10632ms · 실패: timeout exceeded when trying to connect |

| 판 | 결과 줄 | 다시 채점 | 받아들인(같은 순간) | 뒤에 보낸 것 DB | ok:true 로 답한 갈래 |
|---|---|---|---|---|---|
| 1 | 0 | 다르다: : undefined ≠ {"context":{"common":[{"axis":"J1","block":"CORE-JUDGE","con | answer 9 · picks 2 · note 0 · profile 0 · industry 0 · cursor 0 | **바뀜** | answer, picks, note, profile, industry |
| 2 | 0 | 다르다: : undefined ≠ {"context":{"common":[{"axis":"J1","block":"CORE-JUDGE","con | answer 12 · picks 4 · note 4 · profile 1 · industry 1 · cursor 0 | 그대로 | answer, picks, note, profile, industry |
| 3 | 0 | 다르다: : undefined ≠ {"context":{"common":[{"axis":"J1","block":"CORE-JUDGE","con | answer 11 · picks 4 · note 1 · profile 0 · industry 1 · cursor 0 | **바뀜** | answer, picks, note, profile, industry |
| 4 | 0 | 다르다: : undefined ≠ {"context":{"common":[{"axis":"J1","block":"CORE-JUDGE","con | answer 11 · picks 3 · note 0 · profile 0 · industry 0 · cursor 0 | **바뀜** | answer, picks, note, profile, industry |
| 5 | 1 | 같다 | answer 11 · picks 3 · note 4 · profile 1 · industry 1 · cursor 1 | 그대로 | - |
