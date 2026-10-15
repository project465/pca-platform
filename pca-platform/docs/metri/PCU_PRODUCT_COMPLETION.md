# PCU PRODUCT COMPLETION PASS — 배재대 운영 기능 마감

받은 기준은 `예쁜 데모` 가 아니라 **배재대학교가 학생 수백 명에게 배포하고,
학교 담당자가 개발자 도움 없이 운영할 수 있는 상용 CareerMatri Campus
제품**이었다. 이 회차가 한 것은 그 운영 기능을 메우는 일이고, **측정은 한
눈금도 건드리지 않았다.**

---

## 0. 가장 먼저 — 바꾸지 않은 것

`ME_V3_MEASUREMENT_FREEZE_1` 이 **기록을 다시 적지 않은 채로** 통과한다.
scoring · threshold · item id · item count · item wording · Core 구조 ·
Domain 정의 · Result 판정 · Evidence 판정 · Gap 판정 · routing engine ·
PCU registry 구조 · `student_open` · `open_to_students` · 기존 assessment
logic 의 diff 가 0 이다.

**DB 스키마를 한 줄도 바꾸지 않았다.** 재응시도 계정 상태도 감사 기록도
이미 있는 칸으로 들어간다(`entitlements` 한 줄 · `users.status` ·
`audit_logs.action`). 그래서 마이그레이션이 필요 없고, 바뀐 것이 전부
이미지 안으로 들어가는 파일이라 **재배포가 먼저다.**

---

## 1. Gap Audit — 그래서 무엇이 없었는가

| 규격 | 전 | 후 |
|---|---|---|
| §3 학생 계정 운영(조회·추가·CSV·재발급·비활성) | MISSING | IMPLEMENTED |
| §4 로그인 상태별 메시지 | PARTIAL | IMPLEMENTED |
| §5 Assessment Resume | IMPLEMENTED | 그대로 |
| §6 제출 전 검토 | MISSING | IMPLEMENTED |
| §7 재응시 정책 | MISSING(정책 없음) | IMPLEMENTED(보수적 기본안) |
| §8 Result 기능성 | IMPLEMENTED | 그대로 |
| §9 Evidence 추가·수정·삭제 | PARTIAL(수정 없음) | IMPLEMENTED |
| §10 Action loop | PARTIAL | IMPLEMENTED |
| §12~§14 학생 관리 UI · 재발급 · CSV import | MISSING | IMPLEMENTED |
| §16 Admin 필터(기간·단과대학·학과) | MISSING | IMPLEMENTED |
| §17 미응시·진행중·완료와 리마인드 대상 | MISSING | IMPLEMENTED |
| §18 Export 셋 | MISSING | IMPLEMENTED |
| §19 대학 운영 요약 PDF | MISSING | IMPLEMENTED |
| §20 자율전공 flow | PARTIAL(막다른 길) | IMPLEMENTED |
| §21 오류 복구 | PARTIAL | IMPLEMENTED |
| §22 Operator Incident | IMPLEMENTED(재사용) | 그대로 |
| §23 권한 경계 | IMPLEMENTED | 짝으로 다시 셌다 |

---

## 2. 세 Journey

### A. 학생 (§33 Student journey)

`/campus/pcu` → 학과 선택 → 학교 로그인 → 시작 안내 → 응시 → 중간 저장과
이어하기 → **제출 전 검토** → 제출 → 완료 → 결과 → 종이 → `/me` → 경험
추가 → **경험 고치기** → 현재 상태 → 다음 할 일.

`npm run v3:product-loop` **63 / 63**, `npm run v3:launch` 가 폭 셋에서
같은 길을 밟는다.

### B. 대학 담당자 (§33 Operator journey)

로그인 → 집계 → **좁혀 보기(기간·단과대학·학과)** → 학생 명단 → CSV 일괄
등록 → 비밀번호 재발급 → 미응시 목록 → **리마인드 대상 CSV** → 학과별 집계
CSV → **운영 요약 PDF**.

`npm run campus:export` **49 / 49**(실제 브라우저 · 실제 파일).

### C. CareerMatri 운영자

`/admin/incidents` 를 그대로 쓴다. **새 monitoring platform 을 만들지
않았다**: 운영 요약 PDF 가 못 뽑힌 자리는 `job_failures` 에
`org-pdf-<걸음>-<학교>` 로 적히고 그 표가 이미 그 쪽에 선다.

---

## 3. 이 회차가 찾아낸 것

**`return page.pdf(...)` 가 종이를 못 뽑게 하고 있었다.** 기다리지 않고
돌려주면 `finally` 가 그리는 동안 브라우저를 닫고, 크로뮴이
`Printing failed` 로 거절한다. 밖에서 보면 **브라우저가 못 뜬 것과
구별되지 않는다.**

**담당자 화면이 두 모집단을 나란히 세우고 있었다.** 집계는 시연·검사
계정을 거르는데(`campusV3`) 명단 쪽만 그 줄을 빠뜨려서, 같은 화면에
`대상자 0명` 과 `아직 시작하지 않은 학생 63명` 이 함께 섰다.

**집계 화면의 링크가 명단 화면에서 좁혀지지 않았다.** 저쪽이 `department`
를 달고 오는데 이쪽이 `dept` 로만 읽어서, 눌러 넘어온 담당자가 전체 목록을
그 학과의 수로 읽는다.

**`.sf-btn is-primary` 는 어느 CSS 에도 규칙이 없는 이름이었다.** 쓰는
이름이 CSS 에 없는 자리가 이 저장소에서 열한 번째다.

**빈 표를 까닭 없이 내보내고 있었다.** 좁혀 본 범위에 든 학생이 다섯이 안
되면 집계가 아래 칸을 아예 만들지 않는데, 표만 비워서 보내면 받은 담당자가
내려받기가 깨진 줄로 읽고 다시 누른다.

---

## 4. 개인정보와 권한 (§18·§19·§23)

- **개별 학생 답변 raw export 가 없다.** 명단 CSV 의 칸은 일곱이고 문항
  번호도 응답 값도 결과 묶음 코드도 들어 있지 않다. 검사가 그 모양을
  **받은 글자에서** 센다
- **5명 미만 칸은 수가 만들어지지 않는다.** 가리는 자리를 CSV 와 PDF 에
  따로 두지 않고 집계 함수가 `null` 로 돌려준 것을 그대로 적는다
- **담당자가 학생 결과를 열 수 없다.** 담당자 계정으로 결과 쪽과 종이를
  두드려 404 를 확인했고, 명단 화면에 답한 내용이 서지 않는 것도 함께 센다
- **비밀번호 평문을 저장하지 않는다.** 재발급은 그 자리에서 한 번만 보여
  주고 해시만 남으며 감사에 적힌다
- **메일·문자 발송 기능을 만들지 않았다**(§17). 없는 기능을 단추로 두면
  누른 담당자가 보낸 줄로 읽고 학생은 아무것도 받지 않는다. 받는 학생
  명단을 CSV 로 내려받는다

---

## 5. Visual QA

담당자 다섯 화면 × 데스크톱·손전화 = 열 장을
`docs/metri/shots/pcu-ops/` 에 두었다. 세는 것 넷: 열리는가 · 가로로
밀리는가 · 안쪽 코드가 손님 화면에 서는가 · 브라우저 오류가 나는가.
**24 / 24.**

고친 자리 하나: 운영 요약 쪽이 손전화에서 266px 밀렸다. 다섯 칸짜리 표가
창보다 넓었고, **표만 제 상자 안에서 밀게** 하고 KPI 넷을 좁은 화면에서
둘씩 세웠다. 종이에서는 넷을 한 줄로 못 박는다.

---

## 6. 판본과 동결

| 올린 것 | 값 |
|---|---|
| 검사 화면 | `ME_V3_2_ASSESSMENT_UI_V27` · `me-v3-2-assessment-copy.16` |
| 결과지 | `ME_V3_RESULT_UI_V35` · `me-v3-result-copy.23` |
| 작업공간 | `CAREERMATRI_WORKSPACE_UI_V31` · `careermatri-workspace-copy.20` |

**문항 은행과 판단 규칙과 결과 모델은 그대로다.** 동결 다섯이 전부
통과한다(측정 · 검사 화면 · 결과지 · 작업공간 · Core 묶음).

---

## 7. 아직 아닌 것

- **운영 배포본을 밖에서 한 번도 열지 못했다.** 네트워크 정책이
  `app.careermatri.com:443` 을 막는다(HTTP 000). 그래서 이 회차의 판정은
  `LOCAL PASS / PRODUCTION UNVERIFIED` 이고 **`COMMERCIAL READY` 라고
  적지 않는다**
- **학생 공개 상태를 바꾸지 않았다**(`open_to_students` 그대로). 운영
  Canary 는 별개라 `PCU CANARY BLOCKED` 가 그대로다
- 경험에 **파일 업로드를 더하지 않았다**(§9). 기존 storage 구조가 없고,
  이번 P0 에서 억지로 더하지 않는다
- 자율전공 학생의 **고른 전공을 기억해 두지 않는다.** 고를 때마다 그
  전공으로 시작하고, 기억해 두는 칸을 만드는 일은 DB 변경이라 따로
  승인받는다
- iPhone Safari 실기기 확인이 남아 있다

---

## 8. 돌리는 법

```bash
# 담당자 내려받기와 권한 49가지 (실제 브라우저 · 실제 파일)
V3_PREVIEW_OPEN='*' bash scripts/stage-serve.sh 3100
UI_BASE=http://127.0.0.1:3100 npm run campus:export

# 담당자 다섯 화면 × 두 폭
UI_BASE=http://127.0.0.1:3100 npx tsx scripts/pcu-ops-shots.ts

# 학생 쪽 제품 루프 (경험 고치기가 2b 로 들어갔다)
UI_BASE=http://127.0.0.1:3100 npm run v3:product-loop
```
