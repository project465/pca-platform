# 전주대 R5 브라우저 E2E 캡처

실제 Next.js standalone 서버 · 실제 Auth.js 로그인 · Chromium. 합성 QA 계정. 비밀번호는 실행마다 새로 만들고 적지 않았다.

| # | 파일 | 폭 | 주소 | 무엇 | sha256(16) |
|---|---|---|---|---|---|
| 1 | 01-login.desktop.png | 1440x900 | `/login` | Auth.js 로그인 화면(로그인 전) | f2d81ae6246a78f6 |
| 2 | 01-login.mobile.png | 390x844 | `/login` | Auth.js 로그인 화면(로그인 전) | 56faab9f98829713 |
| 3 | 02-home.desktop.png | 1440x900 | `/jju` | 전주대 학생 홈(로그인 뒤) | 69752976054ebe8a |
| 4 | 03-tracks.desktop.png | 1440x900 | `/campus/jju/majors` | 트랙(전공) 고르기 | c3b8376f1bab380f |
| 5 | 02-home.mobile.png | 390x844 | `/jju` | 전주대 학생 홈(로그인 뒤) | 31872587ece10690 |
| 6 | 03-tracks.mobile.png | 390x844 | `/campus/jju/majors` | 트랙(전공) 고르기 | b177282647e5e5de |
| 7 | 04-track.png | 1440x900 | `/campus/jju/d/JJU1_AI?y={id}` | 트랙 AI·데이터 트랙 상세 | a84bf1947f6b1376 |
| 8 | 05-start.png | 1440x900 | `/v3/start` | 검사 시작(학업 단계 고르기) | 0af6e3e8169e5f20 |
| 9 | 06-save.png | 1440x900 | `/v3/{id}?s=6` | 저장된 상태(답 11개) | a28755c4d3ab2ca7 |
| 10 | 07-resume.desktop.png | 1440x900 | `/v3/{id}` | 다시 로그인 뒤 이어하기 | 4545bcf73a60eaae |
| 11 | 07-resume.mobile.png | 390x844 | `/v3/{id}` | 이어하기(390) | dc083a5b78aa4283 |
| 12 | 08-submit.png | 1440x900 | `/v3/{id}?s={id}` | 제출 직전 끝 화면 | 2ff582576dc9be68 |
| 13 | 09-result.desktop.png | 1440x900 | `/v3/{id}/result` | 결과 첫 화면 | 522f44a0a4742c70 |
| 14 | 09-result.mobile.png | 390x844 | `/v3/{id}/result` | 결과(390) | 13b40f37449460a3 |
| 15 | 10-evidence.png | 1440x900 (절) | `/v3/{id}/result#evidence` | Evidence(내가 이미 가진 근거) | 49d7f95ccda33747 |
| 16 | 11-gap.png | 1440x900 (절) | `/v3/{id}/result#gaps` | Gap(더 채울 부분) | b9def965e636f274 |
| 17 | 12-report-web.desktop.png | 1440x900 | `/jju/report/{id}` | 본인 전주대 리포트(웹) | e5fe760230a663cc |
| 18 | 13-pdf-download.png | 1440x900 | `/jju/report/{id}` | PDF 응답 헤더와 내려받기 사건(서버 응답에서 그대로 적음) | 79e61113878976a0 |
| 19 | 14-admin.desktop.png | 1440x900 | `/jju/admin` | 사업단 현황 | 689f127bf4bdde43 |
| 20 | 15-org-insights.png | 1440x900 | `/org/v3` | 담당자 집계 | d6a6caed688df36b |
| 21 | 16-org-students.png | 1440x900 | `/org/v3/students` | 담당자 명단 | 67d4ac0507c42c09 |
| 22 | 14-admin.mobile.png | 390x844 | `/jju/admin` | 사업단 현황(390) | 3f4226b72b76b504 |
| 23 | 17-deny-peer.png | 1440x900 | `/jju/report/{id}` | 학생 B 가 학생 D 의 리포트를 연 화면(404) | 40a4c8d0b192a601 |
| 24 | 18-deny-pcu-admin.png | 1440x900 | `/jju/admin` | 배재대 담당자가 전주대 사업단 현황을 연 화면(거절) | bebeed9b6fc43dcb |
| 25 | 19-deny-anon.png | 1440x900 | `/login` | 로그인 없이 리포트를 연 화면(로그인으로 보냄) | f2d81ae6246a78f6 |
| 26 | 20-abc-A-result.png | 1440x900 | `/v3/6/result` | 학생 A 결과 | ef7f7a3639cf5f03 |
| 27 | 20-abc-B-result.png | 1440x900 | `/v3/7/result` | 학생 B 결과 | 218bf9d4057f7c28 |
| 28 | 20-abc-C-result.png | 1440x900 | `/v3/8/result` | 학생 C 결과 | 057261c8b23dd6e1 |
