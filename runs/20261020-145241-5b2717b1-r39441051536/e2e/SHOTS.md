# 전주대 R5 브라우저 E2E 캡처

실제 Next.js standalone 서버 · 실제 Auth.js 로그인 · Chromium. 합성 QA 계정. 비밀번호는 실행마다 새로 만들고 적지 않았다.

| # | 파일 | 폭 | 주소 | 무엇 | sha256(16) |
|---|---|---|---|---|---|
| 1 | 01-login.desktop.png | 1440x900 | `/login` | Auth.js 로그인 화면(로그인 전) | 289ceb0f9343b34d |
| 2 | 01-login.mobile.png | 390x844 | `/login` | Auth.js 로그인 화면(로그인 전) | a0df2035cd5b9729 |
| 3 | 01-home-guest.desktop.png | 1440x900 | `/jju` | 전주대 첫 화면(로그인 전) | 962cf8ceb30ec40d |
| 4 | 01-fields.desktop.png | 1440x900 | `/jju/fields` | 학과와 과정 | 919afd2dfec5e1a8 |
| 5 | 00-pcu-entry.desktop.png | 1440x900 | `/campus/pcu` | 배재대 학교 진입(공통 화면) | afd5c618e2929d38 |
| 6 | 00-pcu-majors.desktop.png | 1440x900 | `/campus/pcu/majors` | 배재대 학과 고르기(공통 화면) | fa141f796cf1afd2 |
| 7 | 00-jju-entry.desktop.png | 1440x900 | `/campus/jju` | 전주대 학교 진입(공통 화면) | dafc5ced13f12daa |
| 8 | 00-cores.desktop.png | 1440x900 | `/login` | CareerMatri 전공 고르기(본체) | 289ceb0f9343b34d |
| 9 | 01-home-guest.mobile.png | 390x844 | `/jju` | 전주대 첫 화면(로그인 전) | 3381667e759cb684 |
| 10 | 01-fields.mobile.png | 390x844 | `/jju/fields` | 학과와 과정 | efc6f60db06ff1cf |
| 11 | 00-pcu-entry.mobile.png | 390x844 | `/campus/pcu` | 배재대 학교 진입(공통 화면) | a206746e22a88d1b |
| 12 | 00-pcu-majors.mobile.png | 390x844 | `/campus/pcu/majors` | 배재대 학과 고르기(공통 화면) | f1dc074f07008b3d |
| 13 | 00-jju-entry.mobile.png | 390x844 | `/campus/jju` | 전주대 학교 진입(공통 화면) | 4ba9f175570f8bd0 |
| 14 | 00-cores.mobile.png | 390x844 | `/login` | CareerMatri 전공 고르기(본체) | a0df2035cd5b9729 |
| 15 | 00-me.desktop.png | 1440x900 | `/cores` | 내 CareerMatri(공통 화면) | 6a961d5ef3fa5ba2 |
| 16 | 02-home.desktop.png | 1440x900 | `/jju` | 전주대 학생 홈(로그인 뒤) | c0ba9ff52ca426da |
| 17 | 03-tracks.desktop.png | 1440x900 | `/campus/jju/majors` | 트랙(전공) 고르기 | 38f2b96575f237d7 |
| 18 | 02-home.mobile.png | 390x844 | `/jju` | 전주대 학생 홈(로그인 뒤) | fa26331fc3401499 |
| 19 | 03-tracks.mobile.png | 390x844 | `/campus/jju/majors` | 트랙(전공) 고르기 | 645502d0b116f619 |
| 20 | 04-track.png | 1440x900 | `/campus/jju/d/JJU{id}_AI?y={id}` | 트랙 인공지능학과 상세 | 456fb1069c95c466 |
| 21 | 05-start.png | 1440x900 | `/v3/start` | 검사 시작(학업 단계 고르기) | bf4ae0baba983396 |
| 22 | 06-save.png | 1440x900 | `/v3/{id}?s=6` | 저장된 상태(답 11개) | b0b54691273f48b2 |
| 23 | 07-resume.desktop.png | 1440x900 | `/v3/{id}` | 다시 로그인 뒤 이어하기 | 77158942707abe55 |
| 24 | 07-resume.mobile.png | 390x844 | `/v3/{id}` | 이어하기(390) | 04a6ffb2f570491f |
| 25 | 08-submit.png | 1440x900 | `/v3/{id}?s={id}` | 제출 직전 끝 화면 | e65d272b7a27e056 |
| 26 | 09-result.desktop.png | 1440x900 | `/v3/{id}/result` | 결과 첫 화면 | 51391cf93fb8255b |
| 27 | 09-result.mobile.png | 390x844 | `/v3/{id}/result` | 결과(390) | ffcc6c5be19c4f01 |
| 28 | 10-evidence.png | 1440x900 (절) | `/v3/{id}/result#evidence` | Evidence(내가 이미 가진 근거) | 05922111ed3f783d |
| 29 | 11-gap.png | 1440x900 (절) | `/v3/{id}/result#gaps` | Gap(더 채울 부분) | 59a8e6e657a60a6d |
| 30 | 12-report-web.desktop.png | 1440x900 | `/jju/report/{id}` | 본인 전주대 리포트(웹) | f23633cd0a97f838 |
| 31 | 13-pdf-download.png | 1440x900 | `/jju/report/{id}` | PDF 응답 헤더와 내려받기 사건(서버 응답에서 그대로 적음) | 635801b51ad4c3b5 |
| 32 | 14-admin.desktop.png | 1440x900 | `/jju/admin` | 사업단 현황 | 554d5e55abba56c4 |
| 33 | 15-org-insights.png | 1440x900 | `/org/v3` | 담당자 집계 | 3be5080273db34ce |
| 34 | 16-org-students.png | 1440x900 | `/org/v3/students` | 담당자 명단 | e588fa11a89cdbf6 |
| 35 | 14-admin.mobile.png | 390x844 | `/jju/admin` | 사업단 현황(390) | 86715a1ed2be044f |
| 36 | 17-deny-peer.png | 1440x900 | `/jju/report/{id}` | 학생 B 가 학생 D 의 리포트를 연 화면(404) | 40a4c8d0b192a601 |
| 37 | 18-deny-pcu-admin.png | 1440x900 | `/jju/admin` | 배재대 담당자가 전주대 사업단 현황을 연 화면(거절) | c2b253c19ef2b682 |
| 38 | 19-deny-anon.png | 1440x900 | `/login` | 로그인 없이 리포트를 연 화면(로그인으로 보냄) | 289ceb0f9343b34d |
| 39 | 20-abc-A-result.png | 1440x900 | `/v3/6/result` | 학생 A 결과 | 174ed0605cb8b597 |
| 40 | 20-abc-B-result.png | 1440x900 | `/v3/7/result` | 학생 B 결과 | 006fe3cc28010487 |
| 41 | 20-abc-C-result.png | 1440x900 | `/v3/8/result` | 학생 C 결과 | 5ee77362f81b4f06 |
