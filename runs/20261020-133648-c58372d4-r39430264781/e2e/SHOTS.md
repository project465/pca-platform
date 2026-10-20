# 전주대 R5 브라우저 E2E 캡처

실제 Next.js standalone 서버 · 실제 Auth.js 로그인 · Chromium. 합성 QA 계정. 비밀번호는 실행마다 새로 만들고 적지 않았다.

| # | 파일 | 폭 | 주소 | 무엇 | sha256(16) |
|---|---|---|---|---|---|
| 1 | 01-login.desktop.png | 1440x900 | `/login` | Auth.js 로그인 화면(로그인 전) | f2d81ae6246a78f6 |
| 2 | 01-login.mobile.png | 390x844 | `/login` | Auth.js 로그인 화면(로그인 전) | 56faab9f98829713 |
| 3 | 01-home-guest.desktop.png | 1440x900 | `/jju` | 전주대 첫 화면(로그인 전) | 203820e05fd48d0d |
| 4 | 01-fields.desktop.png | 1440x900 | `/jju/fields` | 학과와 과정 | 2f6ba395903f8da7 |
| 5 | 01-home-guest.mobile.png | 390x844 | `/jju` | 전주대 첫 화면(로그인 전) | f82404c0dfe18ac2 |
| 6 | 01-fields.mobile.png | 390x844 | `/jju/fields` | 학과와 과정 | 13dc8c078dd7e975 |
| 7 | 02-home.desktop.png | 1440x900 | `/jju` | 전주대 학생 홈(로그인 뒤) | 83555e20671c7e38 |
| 8 | 03-tracks.desktop.png | 1440x900 | `/campus/jju/majors` | 트랙(전공) 고르기 | 2b20181bac439b7f |
| 9 | 02-home.mobile.png | 390x844 | `/jju` | 전주대 학생 홈(로그인 뒤) | 065f5bcd21175fe7 |
| 10 | 03-tracks.mobile.png | 390x844 | `/campus/jju/majors` | 트랙(전공) 고르기 | 1d7e2cb4a35230e8 |
| 11 | 04-track.png | 1440x900 | `/campus/jju/d/JJU{id}_AI?y={id}` | 트랙 인공지능학과 상세 | c2b15b4212696f16 |
| 12 | 05-start.png | 1440x900 | `/v3/start` | 검사 시작(학업 단계 고르기) | 85134f785fe4cd88 |
| 13 | 06-save.png | 1440x900 | `/v3/{id}?s=6` | 저장된 상태(답 11개) | 02a8e36f63289c90 |
| 14 | 07-resume.desktop.png | 1440x900 | `/v3/{id}` | 다시 로그인 뒤 이어하기 | ad2b43cc227d2e2b |
| 15 | 07-resume.mobile.png | 390x844 | `/v3/{id}` | 이어하기(390) | 5e18a6d6dc3c2bd8 |
| 16 | 08-submit.png | 1440x900 | `/v3/{id}?s={id}` | 제출 직전 끝 화면 | 40ece476745811a1 |
| 17 | 09-result.desktop.png | 1440x900 | `/v3/{id}/result` | 결과 첫 화면 | 0c70dda43376fcef |
| 18 | 09-result.mobile.png | 390x844 | `/v3/{id}/result` | 결과(390) | 1256ab48e31c9a1f |
| 19 | 10-evidence.png | 1440x900 (절) | `/v3/{id}/result#evidence` | Evidence(내가 이미 가진 근거) | 49d7f95ccda33747 |
| 20 | 11-gap.png | 1440x900 (절) | `/v3/{id}/result#gaps` | Gap(더 채울 부분) | b9def965e636f274 |
| 21 | 12-report-web.desktop.png | 1440x900 | `/jju/report/{id}` | 본인 전주대 리포트(웹) | 9c4e46b171cdc7fc |
| 22 | 13-pdf-download.png | 1440x900 | `/jju/report/{id}` | PDF 응답 헤더와 내려받기 사건(서버 응답에서 그대로 적음) | e752b9f95a248599 |
| 23 | 14-admin.desktop.png | 1440x900 | `/jju/admin` | 사업단 현황 | adf1a158d6b8b7af |
| 24 | 15-org-insights.png | 1440x900 | `/org/v3` | 담당자 집계 | d6a6caed688df36b |
| 25 | 16-org-students.png | 1440x900 | `/org/v3/students` | 담당자 명단 | 369ff64ebafba45c |
| 26 | 14-admin.mobile.png | 390x844 | `/jju/admin` | 사업단 현황(390) | 3eab55a791bbabff |
| 27 | 17-deny-peer.png | 1440x900 | `/jju/report/{id}` | 학생 B 가 학생 D 의 리포트를 연 화면(404) | 40a4c8d0b192a601 |
| 28 | 18-deny-pcu-admin.png | 1440x900 | `/jju/admin` | 배재대 담당자가 전주대 사업단 현황을 연 화면(거절) | 82f806d577ed26f4 |
| 29 | 19-deny-anon.png | 1440x900 | `/login` | 로그인 없이 리포트를 연 화면(로그인으로 보냄) | f2d81ae6246a78f6 |
| 30 | 20-abc-A-result.png | 1440x900 | `/v3/6/result` | 학생 A 결과 | ec1806a99cd91ee8 |
| 31 | 20-abc-B-result.png | 1440x900 | `/v3/7/result` | 학생 B 결과 | 13569eba2bbad425 |
| 32 | 20-abc-C-result.png | 1440x900 | `/v3/8/result` | 학생 C 결과 | ccbf4d5e84888cd1 |
