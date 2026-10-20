# P2 · P3 · Staging 확인과 Gold Master 연동 준비 (2026-10-20)

## P2 · Staging 브라우저 검증 — **막힘(검증하지 못함)**

| 주소 | 결과 |
|---|---|
| `https://charming-reverence-staging.up.railway.app/api/health` (저장소 문서에 적힌 Staging) | `curl: (56) CONNECT tunnel failed, response 403` · HTTP 000 |
| `https://app.careermatri.com/api/health` | 같은 403 · HTTP 000 |
| `https://careermatri.com/` | 같은 403 · HTTP 000 |

이 작업 환경의 네트워크 정책이 위 호스트를 막는다(에이전트 프록시가 CONNECT 를 403 으로 거절). 그래서 1) PCU 학생 로그인
2) 검사 진행·완료 3) 결과 저장 4) 개인 결과 화면 5) 기존 PDF 다운로드 6) 대학 관리자 페이지 — **여섯 가지 모두 실제 Staging 에서
확인하지 못했다.** 스크린샷도 없다. 로컬에서 플랫폼을 띄워 대신 찍으려 했지만 npm 레지스트리도 막혀(`registry.npmjs.org` HTTP 000)
Next.js 를 설치·빌드할 수 없었다. **다른 환경의 화면이나 지난 회차 캡처를 이번 Staging 검증으로 내놓지 않는다.**

열려면: 클라우드 환경 설정의 Network access 에서 `charming-reverence-staging.up.railway.app`(와 필요하면 `registry.npmjs.org`)를
Allowed domains 에 더하거나 접근 수준을 넓힌다(https://code.claude.com/docs/en/cloud-environments#network-access). 그 뒤에
`docs/metri/review/r34/STAGING_CHECKS.md` 차례로 여섯 걸음을 다시 밟는다.

## P3 · 저장된 결과 → Gold Master PDF (격리 환경) — **통과 33 / 33**

운영 경로에 연결하지 않았다. 개발 DB 를 복사한 격리 DB(`cm_gm_iso`)에서 **제품의 저장 경로**(`openAttempt → saveAnswer →
savePicks → submit`, `scripts/lab/gm-cases2.ts`)로 세 학생(RICH · POOR · CONTRA)의 응시를 새로 굳히고, 그 줄을 Gold Master
입력(`load3` → `Report3`)으로 읽어 전체 보고서(73 · 59 · 66쪽)를 뽑았다. `ISO_CHECK.md` 가 응시마다 열한 가지를 센다:
제출 상태 · 굳은 결과 한 줄 · 저장 응답 · Core · 학교·학과 · 등급 · 고른 근거 수(저장 행 = 결과 모델 = 리포트) · 열두 영역 상태 ·
같은 결과면 같은 보고서(해시) · PDF 표지의 학교·학과 · PDF 표지의 근거 수. **운영 PDF 폴더(`var/reports`)에 쓴 파일 0개.**

이 검사가 처음에 한 가지를 잡았다: RICH 의 저장된 근거는 27개인데 리포트 표지는 26개라고 적었다. 결과 모델이 묻지 않은 판단
자리(경영전략 외 TD02 · J6)의 ‘비교한 대상’ 을 `did` 에 넣지 않고 `verifications` 에만 남기기 때문이다. Gold Master 쪽 셈을 네 목록의
합으로 고쳐 27 = 27 = 27 이 됐다(`analysis3.ts` `profileRead`). 결과 모델은 고치지 않았다(아래 요청 2).

**화면을 거친 연동은 확인하지 않았다.** 위 경로는 서버 함수를 직접 부른 것이고, 브라우저로 응시해 저장된 줄은 P2 와 같은 까닭으로 만들지 못했다.

## PDF 자동 연동을 막는 문제

| # | 문제 | 종류 | 누가 |
|---|---|---|---|
| 1 | Staging·운영에 이 환경에서 닿지 못해, 운영 DB 의 굳은 결과로 한 번도 뽑아 보지 못함 | 환경 | 환경 설정(사용자) |
| 2 | **경험 기록이 굳지 않는다**: Gold Master 는 `v3_experiences` 를 리포트를 뽑는 순간에 읽는다. 학생이 기록을 고치면 같은 응시의 리포트가 달라진다 | Core·DB | Core 세션(요청 1) |
| 3 | Gold Master 를 부르는 서버 입구가 없다(`load3` 이 `scripts/lab` 에 있다). 운영 PDF(`/v3/{id}/result/pdf`)와 따로, 승인 플래그 뒤에 둘 입구가 필요 | 공통 코드 | 승인 뒤 · Core 세션과 협의(요청 3) |
| 4 | 런타임 이미지에 필요한 파일: `data/report-gm/*` · `data/region/*`(공시 스냅숏 포함) · Pretendard 글꼴(지금은 `var/pdf-gm/fonts` 에만 있음, 저장소·이미지에 없음) | 배포 | Core·배포(요청 3) |
| 5 | KODATA 자료의 학생 배포 권리 미확정(R10) — 학생 배포본에서 제3자 자료 줄을 빼야 함 | 권리 | 사업주 |
| 6 | 직무·기업 안내 자료가 검토 전(PREVIEW, R12) | 내용 | 전공자 검토 |
| 7 | 조사 자료 미확보 R1~R5 · R8(교육과정 · 지역 통계 · 세종 공공기관 · 공고 원문) | 내용 | 네트워크가 열린 곳에서 조사 |
| 8 | 공시 자료는 2026-10-20 스냅숏. 다시 받으려면 `PCA_DART_KEY` 와 갱신 절차가 필요(운영에서 실시간 호출하지 않는 쪽 권장) | 운영 | 사업주 |
| 9 | Gold Master 는 PRO 학교판 기준으로 설계됨. BASIC · STANDARD 판은 설계하지 않음 | 범위 | 사업주 |
| 10 | 결과 모델의 `did` 가 묻지 않은 판단 자리의 ‘비교한 대상’ 근거를 빠뜨림 — 의도인지 확인 | Core | Core 세션(요청 2) |

## 배재대 실제 납품까지 남은 필수 작업

1. 네트워크를 열고 Staging 에서 P2 여섯 걸음을 밟아 스크린샷과 함께 PASS/FAIL 을 적는다.
2. Core 요청 1~3 의 답을 받는다(경험 기록 고정 · 서버 입구 · 이미지 파일).
3. 디자인 Human Review(13쪽 · 전체 보고서) — Annual Report 레퍼런스를 받아 대조.
4. KODATA 권리 확정 또는 제3자 자료 줄을 뺀 학생 배포본 생성.
5. 직무·기업 안내 자료의 전공자 검토(R12) · 조사 자료 R1~R5 · R8 확보.
6. 승인 뒤에만: Gold Master 입구를 플래그 뒤에 두고 Staging 에서 실제 응시 한 건으로 뽑아 운영 PDF 와 나란히 검토.
7. 그다음 운영 연결 · Production 배포(이번 단계에서는 하지 않음).
