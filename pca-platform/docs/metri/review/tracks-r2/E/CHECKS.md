# Track E 2차 · 입력 고정 정책 · 파기 · 파일 접근 · 패키징

- 실행: 2026-10-20T09:27Z · DB `postgres:///cm_iso_c` (격리 5433) · GM 파일 자리 `var/gm-r2/inputs` · `var/gm-r2/out` (1차 파일과 따로)
- 운영 PDF 경로 · Dockerfile · `erasure.ts` · DB 는 고치지 않았다. 파기 함수는 GM 입력 모듈(`report-gm/inputs.ts`) 안에 두었다.
- 패키징 대상 크기: data/report-gm: 3파일 · 130685B · data/region: 4파일 · 112130B

**통과 22 · 걸림 1 / 23** (걸림 가운데 패키징 한 줄은 승인 전이라 예상된 FAIL)

| 판정 | 확인 | 값 |
|---|---|---|
| | **준비** | |
| PASS | 응시가 굳었다 | 응시 430 |
| | **P1 제출 시점과 입력 고정 기준 시각** | |
| PASS | 스냅샷이 한 줄이다 |  |
| PASS | 제출 시각 = 스냅샷 시각 = GM 기준 시각 | 2026-10-20T09:27:03.251536Z · 2026-10-20T09:27:03.251536Z |
| PASS | 제출 뒤에 더한 기록은 굳힌 입력에 들어가지 않는다 |  |
| PASS | (전제) DB 에는 그 자유입력이 적혀 있다 | 1 |
| PASS | 굳힌 입력에 자유입력 한 줄(note_text)이 없다 · 판본 gm-input.2 | gm-input.2 |
| | **P2 등급을 올려 다시 굳으면 입력도 새 기준으로** | |
| PASS | 다시 굳은 뒤에는 옛 입력 파일을 쓰지 않는다 | 2026-10-20T09:27:04.694461Z → 2026-10-20T09:27:06.732159Z |
| PASS | 새 기준 시각 앞에 적은 기록은 새 입력에 들어간다 |  |
| PASS | 등급이 새 입력에 적힌다 | STANDARD |
| | **P3 파기** | |
| PASS | 지울 파일이 실제로 있다(입력 · PDF) | var/gm-r2/out/430/BIZ-PRO.pdf |
| PASS | 응시 하나를 지우면 입력과 PDF 폴더가 사라진다 |  |
| PASS | 다시 불러도 오류 없이 지울 것이 없다고 답한다 |  |
| PASS | 응시 번호 꼴이 아니면 지우지 않는다(경로 넘기기) |  |
| PASS | 사람 하나를 지우면 그 사람의 응시 파일이 전부 사라진다 | {"attempts":1,"input":1,"output":0} |
| PASS | 운영 PDF 폴더(var/reports)는 그대로다 | 0 → 0 |
| PASS | 파기 뒤 다시 모으면 지금 DB 기준이다(지운 파일을 되살리지 않는다) |  |
| | **P4 파일 접근 차단 (정적)** | |
| PASS | 화면 · 라우트 · 미들웨어가 GM 파일을 읽지 않는다 | 0개 파일 |
| PASS | public 에 GM 파일이나 PDF 가 없다 | 0 |
| PASS | GM 폴더는 public 과 .next 밖이다 | var/gm-r2/inputs · var/gm-r2/out |
| PASS | GM 폴더는 저장소에 들어가지 않는다(.gitignore) |  |
| PASS | 운영 결과 PDF 경로는 GM 을 부르지 않는다 |  |
| | **P5 운영 이미지 패키징 (정적 · Dockerfile 고치지 않음)** | |
| **FAIL** | 운영 이미지 마지막 단계가 GM 실행 파일을 담는다 | 빠진 자리 3: data/report-gm · data/region · var/pdf-gm/fonts/pretendard |
| PASS | 이 기계에 Pretendard woff2 다섯 벌이 있다(저장소 밖) | 5벌 |

## 걸린 것

- 운영 이미지 패키징(승인 전이라 고치지 않음 · 예상된 FAIL)
