# F · Staging 브라우저 확인표 (작업 5)

**이 회차에 브라우저로 밟은 걸음은 0 이다**: Next 빌드 불가 · Staging 미생성. 그래서 열세 걸음 전부 **NOT VERIFIED**
이고, 옆 칸에 **같은 동작을 서버 수준에서 실제로 돌린 증거**를 적는다. 서버 수준 PASS 를 브라우저 PASS 로 읽지 않는다.

| # | 걸음 | 브라우저 | 서버 수준 증거(이 회차 · 실제 PostgreSQL) | Staging 에서 남길 증거 |
|---|---|---|---|---|
| 1 | 학교 계정 로그인 | NOT VERIFIED | 시도 제한 · 계정 신분(`auth:check` 16절 · R33) — 이 회차 재실행 없음 | 캡처 · 302 → `/me` · 서버 로그 |
| 2 | 검사 시작 (학과 맥락 · PRO) | NOT VERIFIED | D seed: 학교 응시 36 전부 PRO · 학과 코드 그대로 (33/33) | 캡처 · 응시 줄 SQL |
| 3 | 임시 저장 | NOT VERIFIED | C race: 저장 · 근거 · 메모 22동작 경합 15판 PASS | 머리띠 `저장됨` 캡처 · `v3_responses` 수 |
| 4 | 새로고침 | NOT VERIFIED | C stability 26/26(이어하기 자리 · 응답 수 그대로) | 같은 화면 · 같은 답 캡처 |
| 5 | 재개(로그아웃 → 재로그인) | NOT VERIFIED | C stability 26/26 | 캡처 · `current_screen` |
| 6 | 제출 (중복 · 다른 탭) | NOT VERIFIED | C race R1 결과 한 줄 · R5 반 40명 동시 제출 40/40 | 완료 브리지 캡처 · 스냅샷 1줄 |
| 7 | 개인 결과 | NOT VERIFIED | C race R2 굳은 판정 = 남은 응답으로 다시 채점 | 결과 첫 화면 캡처 |
| 8 | 학생 PDF 다운로드 | NOT VERIFIED | (운영 PDF 경로 재실행 없음 · R33 기록) · GM PDF 는 E 승인 대기 | PDF 파일 · 200 `application/pdf` · `[v3-pdf] done` 로그 |
| 9 | 담당자 조회 | NOT VERIFIED | D seed 집계 = SQL 10/10 학과 · 5명 미만 가림 | 집계 화면 캡처 |
| 10 | 담당자 거절(다른 학교 · 개인 결과) | NOT VERIFIED | D admin 38/38 · 담당자 개인 결과 기본 거절 | 404/303 · 캡처 |
| 11 | 모바일(좁은 뷰포트) | NOT VERIFIED | — | 360 · 390 캡처 · 가로 넘침 0 |
| 12 | 세션 만료 | NOT VERIFIED | — | 만료 후 저장 → 로그인 이동 · 답 보존 |
| 13 | 오류 복구(DB 끊김) | NOT VERIFIED | C outage 11/11 (DB 를 실제로 멈췄다 띄움) | `저장 실패 · 다시 시도` 캡처 · 재시도 뒤 저장 |

증거 묶음 규칙: 걸음마다 **캡처 1장 이상 · HTTP 상태 · 서버 로그 줄 · 실행 명령 · Git SHA**. 하나라도 없으면 그 걸음은 NOT VERIFIED.
