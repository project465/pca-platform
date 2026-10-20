# Track C 3차 · 제출 경합 반복 (r5)

- 실행: 2026-10-20T12:53Z · 실제 node-postgres 8.16.3 · DB `postgres:///cm_iso_c` (격리 5433) · BIZ_CORE_V1 · 10판
- 판마다 응시 하나를 끝까지 답한 뒤 서버 동작 6갈래 22번을 제출과 같은 순간에 보낸다.
- 받아들인 답 수가 판마다 6가지로 갈렸다(끼어드는 차례가 실제로 바뀌었다는 뜻).

| 판정 | 확인 |
|---|---|
| PASS | R1 굳은 결과가 판마다 한 줄 |
| PASS | R2 굳은 판정 = 지금 남은 응답으로 다시 채점한 판정 (10/10) |
| PASS | R3 제출 뒤에 보낸 일곱 갈래가 DB 를 바꾸지 않는다 (10/10) |
| PASS | R4 제출 뒤에 보낸 동작이 ok:true 로 답하지 않는다 (10/10) |
| PASS | R5 학생 40명(풀 10보다 많다)이 저장 셋과 제출을 같은 순간에 보낸다: 제출 성공 40/40 · 굳은 판정 = 다시 채점 40/40 · 3961ms |

| 판 | 결과 줄 | 다시 채점 | 받아들인(같은 순간) | 뒤에 보낸 것 DB | ok:true 로 답한 갈래 |
|---|---|---|---|---|---|
| 1 | 1 | 같다 | answer 2 · picks 0 · note 0 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
| 2 | 1 | 같다 | answer 9 · picks 1 · note 0 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
| 3 | 1 | 같다 | answer 10 · picks 1 · note 0 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
| 4 | 1 | 같다 | answer 4 · picks 1 · note 0 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
| 5 | 1 | 같다 | answer 7 · picks 0 · note 0 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
| 6 | 1 | 같다 | answer 8 · picks 2 · note 0 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
| 7 | 1 | 같다 | answer 10 · picks 0 · note 1 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
| 8 | 1 | 같다 | answer 9 · picks 2 · note 0 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
| 9 | 1 | 같다 | answer 8 · picks 0 · note 0 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
| 10 | 1 | 같다 | answer 7 · picks 0 · note 0 · profile 0 · industry 0 · cursor 0 | 그대로 | - |
