# 전주대 리포트 경로 · 하네스 HTTP

라우트 파일의 `GET` 을 node http 서버에 꽂고 `fetch` 로 불렀다. 로그인은 하네스 세션(쿠키 `harness_uid`)이고 Auth.js 가 아니다.

| 요청 | 누구 | 상태 | Content-Type | Content-Disposition | 바이트 |
|---|---|---|---|---|---|
| `/jju/report/{id}` | 본인 A | 200 | text/html; charset=utf-8 |  | 21159 |
| `/jju/report/{id}/pdf` | 본인 A | 200 | application/pdf | attachment; filename="careermatri-jju-31.pdf" | 149444 |
| `/jju/report/{id}` | 본인 B | 200 | text/html; charset=utf-8 |  | 21555 |
| `/jju/report/{id}/pdf` | 본인 B | 200 | application/pdf | attachment; filename="careermatri-jju-32.pdf" | 150501 |
| `/jju/report/{id}` | 본인 C | 200 | text/html; charset=utf-8 |  | 22313 |
| `/jju/report/{id}/pdf` | 본인 C | 200 | application/pdf | attachment; filename="careermatri-jju-33.pdf" | 150652 |
| `/jju/report/{id}` | 같은 학교 학생 B | 404 | text/plain;charset=UTF-8 |  | 9 |
| `/jju/report/{id}/pdf` | 같은 학교 학생 B | 404 | text/plain;charset=UTF-8 |  | 9 |
| `/jju/report/{id}` | 전주대 담당자 | 404 | text/plain;charset=UTF-8 |  | 9 |
| `/jju/report/{id}/pdf` | 전주대 담당자 | 404 | text/plain;charset=UTF-8 |  | 9 |
| `/jju/report/{id}` | 배재대 학생 | 404 | text/plain;charset=UTF-8 |  | 9 |
| `/jju/report/{id}/pdf` | 배재대 학생 | 404 | text/plain;charset=UTF-8 |  | 9 |
| `/jju/report/{id}` | 배재대 담당자 | 404 | text/plain;charset=UTF-8 |  | 9 |
| `/jju/report/{id}/pdf` | 배재대 담당자 | 404 | text/plain;charset=UTF-8 |  | 9 |
| `/jju/report/{id}/pdf` | 로그인 안 함 | 307 → /login |  |  | 0 |
| `/jju/report/{id}/pdf` | 본인 A | 404 | text/plain;charset=UTF-8 |  | 9 |
| `/jju/report/{id}/pdf` | 배재대 학생 본인 | 404 | text/plain;charset=UTF-8 |  | 9 |
