# University Operations: 지금 있는 것만 (실사)

이 회차는 **기능을 하나도 만들지 않았다.** 한 일은 셋이다. 운영자 화면의
자리를 실제 코드에서 세고, 그 자리를 **실제 브라우저로 열어 찍고**, 보이는
단추를 **눌러서 DB 가 실제로 바뀌는지** 확인했다.

- 찍은 그림 **34장** (`docs/metri/shots/pcu-ops-survey/`)
- 눌러 본 확인 **116가지: 통과 116 · 걸림 0**
- **없는 자리는 그림을 만들지 않았다**: 비슷한 쪽을 찍어 두면 다음 사람이
  그것을 그 화면으로 읽는다
- **운영 자료를 건드리지 않았다**: 이 기계의 DB 가 아니면 멈추고, 만든
  사람과 기관은 끝에서 전부 치웠다(남은 줄 0)

돌린 자리:

```bash
V3_PREVIEW_OPEN='*' bash scripts/stage-serve.sh 3100
UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' npx tsx scripts/pcu-ops-survey.ts
UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' npm run -s pcu:cli
```

---

## 0. screenshot index

자리마다의 그림과 파일 이름은 `docs/metri/shots/pcu-ops-survey/INDEX.md` 에
있다. 거기 적힌 34장이 아래 판정의 근거 전부다. 같은 그림이 두 이름으로
저장되면 찍는 쪽이 그 자리에서 걸린다(이 저장소가 여러 번 속은 자리다).

내려받은 실제 파일 셋도 함께 두었다:
`docs/metri/shots/pcu-ops-survey/files/`: `students.csv` 11.7KB ·
`departments.csv` 1.2KB · `report.pdf` 411KB.

---

## 1. 지금 있는 route (코드에서 센다)

`src/app/org` 의 쪽 **16개**와 `src/app/admin` 의 쪽 **24개**가 전부다.
그중 운영자가 쓰는 자리는 이렇다.

| 지시문의 항목 | 실제 route | 상태 |
|---|---|---|
| `/org` | `src/app/org/page.tsx` | 있음: **옛 계약·회차 모델만 읽는다** |
| `/org/v3` | `src/app/org/v3/page.tsx` | 있음: 지금 파는 검사의 집계 |
| 학생 관리 | `/org/v3/students` | 있음 |
| 참여자 | `/org/participants` | 있음: **옛 `attempts` 를 읽는다** |
| seat | `/org/licenses` | 있음: **`contracts`·`seats` 를 읽는다** |
| 응시 현황 | `/org/v3` 안의 KPI 넷과 상태별 묶음 | 있음 |
| 학과별 통계 | `/org/v3` 안의 `학과` 묶음 | 있음 |
| 단과대학별 통계 | `/org/v3` 안의 `단과대학별 응시 현황` 묶음 | 있음 |
| import | `/org/v3/students/import` | 있음 |
| export | `/org/v3/export/students.csv` · `/org/v3/export/departments.csv` · `/org/v3/report.pdf` · `/org/v3/report` | 있음 |
| 계정 관리 (활성·비활성) | 전용 route 없음. `/org/v3/students` 의 줄에서 끝난다 | 전용 route **MISSING** · 기능은 있음 |
| password reset | 전용 route 없음. `/org/v3/students` 의 줄에서 끝난다 | 전용 route **MISSING** · 기능은 있음 |
| 학생 상세 | `/org/v3/students/[id]` | **MISSING** |
| 권한·role 관리 | `/org/settings` · `/admin/users` | 둘 다 `아직 열려 있지 않습니다` 자리만. 실제 화면 **MISSING** |
| incidents (학교 담당자) |: | **MISSING** |
| incidents (운영사) | `/admin/incidents` | 있음: `superadmin` 전용 |
| admin sites | `/admin/sites` | 있음: `superadmin` 전용 · 읽기만 |

그 밖에 메뉴에 서 있는 자리: `/org/cohorts` · `/org/contract` ·
`/org/insights` · `/org/evidence-insights` · `/org/reports`(자리만) ·
`/org/sessions/*`.

**`v3_attempts` 를 읽는 담당자 화면은 `/org/v3` 와 `/org/v3/students` 와
그 내려받기 넷뿐이다.** 나머지(`/org` · `/org/participants` ·
`/org/licenses` · `/org/cohorts` · `/org/insights` ·
`/org/evidence-insights`)는 전부 옛 검사의 표(`attempts` · `contracts` ·
`seats` · `cohorts`)를 읽는다.

---

## 2. 열네 화면: 찍은 것과 없는 것

| # | 지시문의 화면 | 그림 | 판정 |
|---|---|---|---|
| 1 | 관리자 첫 화면 / Dashboard | `01-org-home-*` · `02-v3-overview-*` | 있음: **첫 화면 `/org` 은 비어 있고 실제 대시보드는 `/org/v3` 다** |
| 2 | 전체 응시 현황 | `02-v3-overview-w1440` | 있음 |
| 3 | 단과대학별 현황 | `03-by-college-sec` | 있음 |
| 4 | 학과별 현황 | `04-by-department-sec` | 있음 |
| 5 | 학생 목록 | `05-students-w1440` | 있음 |
| 6 | 학생 상세 |: | **MISSING** |
| 7 | 학생 검색 / 필터 | `07a` · `07b` · `07c` | 있음 |
| 8 | CSV import | `08-csv-import-w1440` | 있음 |
| 9 | import preview | `09-csv-preview-w1440` | 있음 |
| 10 | 비밀번호 재발급 | `10-password-reset-w1440` | 있음: 전용 화면이 아니라 **목록 줄에서 끝난다** |
| 11 | 계정 활성 / 비활성 | `11a` · `11b` · `03s` | 있음: 같은 자리 |
| 12 | export | `12-export-sec` · `12b-ops-report-w1440` | 있음 |
| 13 | 권한 / role 화면 | `13-org-settings-w1440` · `13b-admin-users-w1440` | **MISSING**: 둘 다 `아직 열려 있지 않습니다` 자리뿐 |
| 14 | incident / 오류 관리 | `14-admin-incidents-w1440` | 학교 담당자용 **MISSING** · 운영사용은 있음 |

1280px 은 넷을 더 찍었다(`01` · `02` · `05` · `08`). 가로로 밀리는 자리가
두 폭 모두 **0** 이고, 손님·담당자 화면에 안쪽 코드가 선 자리도 **0** 이다.

---

## 3. 상태별 화면 아홉

| 상태 | 그림 | 무엇이 서는가 |
|---|---|---|
| 학생 0명 | `03e-state-zero-students` | `이 조건에 맞는 학생이 없습니다` + 나갈 길 둘 |
| 미응시 | `07c-students-filter-state` | 상태 tab `미응시` 와 그 수 |
| 진행중 | `03b-state-in-progress` | 같은 tab 의 `진행중` |
| 완료 | `03c-state-scored` | 같은 tab 의 `완료` · 줄마다 `재응시 열기` 가 붙는다 |
| 비활성 | `03s-state-disabled` | 계정 알약이 `멈춤` 으로 선다 |
| 5명 미만 suppression | `03f-state-suppressed` | 단과대학 표가 `5명 미만` · 완료율 `—` · 학과 막대는 빗금 |
| 오류 상태 | `03g-state-scope-error` | 등록부에 없는 기관이면 **학생 목록이 닫히고** 내려받기도 CSV 를 내주지 않는다 |
| 빈 검색 결과 | `03d-state-empty-search` | 같은 Empty · 조건 지우기 |
| CSV 오류 | `09-csv-preview` | **미리 보기와 같은 화면**에 거절된 줄과 까닭이 선다 |

`CSV 오류` 를 따로 찍지 않은 까닭은 그것이 미리 보기와 **같은 그림**이기
때문이다. 이름을 둘로 두면 목록만 늘고 본 자리는 늘지 않는다.

---

## 4. 눌러 본 결과 (fixture · 운영 자료 아님)

**버튼이 보인다고 IMPLEMENTED 로 적지 않았다.** 여덟을 실제로 누르고 DB 를
다시 읽었다.

| 누른 것 | 화면이 한 말 | DB 가 바뀐 것 |
|---|---|---|
| 학생 추가 | 새 비밀번호를 **한 번만** 보여 준다 | `campus_students` 에 줄 하나 (확인) |
| 검색 (`q=학번`) | `전체 1` 로 좁혀진다 |: (읽기) |
| 학과 필터 | 그 학과만 선다 |: (읽기) |
| 상태 필터 | tab 마다 수가 맞는다 |: (읽기) |
| 비밀번호 재발급 | 다시 묻고, 새 열쇠를 한 번만 보여 준다 | `password_hash` 가 바뀐다 (전후 비교) |
| 비활성화 | 알약이 `멈춤` 으로 | `users.status = disabled` |
| 재활성화 | 알약이 `사용 중` 으로 | `users.status = active` |
| CSV import | 미리 보기 → 적용 | **미리 보기는 한 줄도 쓰지 않는다**(186 → 186). 적용이 정상 2줄만 만든다(189 → 191). 거절 3줄과 까닭이 선다 |
| export |: | `students.csv` 11,695B · `departments.csv` 1,159B · `report.pdf` 410,532B 를 실제로 받았다 |

**거절 세 줄을 일부러 섞었다**: 등록부에 없는 학과 · 파일 안의 학번 겹침 ·
메일 꼴 틀림. 셋 다 까닭이 줄마다 적힌다.

**범위 밖 담당자**로도 눌러 봤다. 등록부에 없는 기관의 `org_admin` 은
학생 목록이 닫히고 `students.csv` 도 CSV 를 받지 못한다.

---

## 5. 기능 상태표

| 기능 | 상태 | 실제 route | screenshot | 비고 |
|---|---|---|---|---|
| Dashboard | PARTIAL | `/org` · `/org/v3` | `01` · `02` | **로그인이 닿는 첫 화면 `/org` 이 옛 계약 모델이라 `현재 활성 계약이 없습니다` 로 선다.** 실제 대시보드는 `/org/v3` 이고 메뉴에서 다섯째 줄이다 |
| Student List | IMPLEMENTED | `/org/v3/students` | `05` | 50명씩 · 쪽 넘김 있음 |
| Student Search | IMPLEMENTED | `/org/v3/students?q=` | `07a` | 이름·학번·아이디 셋 |
| Department Filter | IMPLEMENTED | `?department=` | `07b` | 집계 쪽도 `좁혀 보기` 로 같은 이름을 쓴다 |
| Status Filter | IMPLEMENTED | `?state=` | `07c`·`03b`·`03c`·`03s` | tab 에 수가 함께 선다 |
| Student Add | IMPLEMENTED | `/org/v3/students` | `06x` | 접힌 폼. 비밀번호 한 번만 |
| CSV Import | IMPLEMENTED | `/org/v3/students/import` | `08` | 파일 또는 붙여 넣기 |
| Import Preview | IMPLEMENTED | 같은 route 2단계 | `09` | **쓰지 않는다**를 값으로 확인 |
| Password Reset | IMPLEMENTED | `/org/v3/students` 줄 | `10` | 되돌릴 수 없어 다시 묻는다 |
| Disable / Enable | IMPLEMENTED | `/org/v3/students` 줄 | `11a`·`11b` | 파기된 계정은 거절 |
| Assessment Status | IMPLEMENTED | `/org/v3` · `/org/v3/students` | `02`·`05` | 대상자·시작·완료·완료율 |
| Department Drill-down | PARTIAL | `/org/v3` 좁혀 보기 | `02`·`04` | **학과별 표의 줄이 링크가 아니다.** 그 학과 명단으로 가려면 `좁혀 보기` 나 학생 목록의 학과 select 로 다시 골라야 한다 |
| Export | IMPLEMENTED | `.../students.csv` · `.../departments.csv` · `/org/v3/report.pdf` · `/org/v3/report` | `12`·`12b` | 개별 답변은 한 칸도 나가지 않는다 |
| Permissions | MISSING | `/org/settings` · `/admin/users` | `13`·`13b` | 둘 다 `아직 열려 있지 않습니다` 자리뿐. 역할을 화면에서 주고 뺄 길이 없다 |
| Error / Incident | MISSING (학교) |: | `14` | 운영사 `/admin/incidents` 는 있고 `superadmin` 전용이다 |

---

## 6. CLI 의존 (`npm run pcu:cli`: 통과 57 · 걸림 0)

| 업무 | 끝내는 자리 | Railway / npm / shell / SQL |
|---|---|---|
| 학생 추가 | `/org/v3/students` | **필요 없음** |
| 비밀번호 재발급 | `/org/v3/students` | **필요 없음** |
| CSV 등록 | `/org/v3/students/import` | **필요 없음** |
| 학생 상태 조회 | `/org/v3` · `/org/v3/students` | **필요 없음** |
| export | `/org/v3/export/*` · `/org/v3/report.pdf` | **필요 없음** |

담당자 화면 다섯에 `Railway` · `psql` · `npm run` · `DATABASE_URL` 이
**0건**이다.

**본사 쪽은 그대로 CLI 다**(담당자가 쓰지 않는다): `pcu:org`(기관과 담당자
계정 발급) · `pcu:students`(발급 복구) · `pcu:diag`(진단·읽기만) ·
`pcu:open`(학생 공개 상태) · `db:upgrade` · `db:verify` · `ops:check`.

---

## 7. 다섯으로 가른다

### 현재 잘 되어 있는 것

- 집계 한 쪽(`/org/v3`)에서 대상자·시작·완료·완료율과 추이와 단과대학과
  학과와 주의가 필요한 학과까지 한 번에 읽힌다. 5명 미만 칸은 수를 내지
  않고 0 으로도 적지 않는다.
- 학생 관리 한 쪽에서 담당자가 실제로 하는 일 다섯(찾기 · 추가 · 재발급 ·
  멈춤/열기 · 재응시)이 **그 줄에서 끝난다.**
- CSV 등록이 올리고 → 미리 보고 → 적용하는 세 걸음이고, 미리 보기가 한 줄도
  쓰지 않는 것을 값으로 확인했다.
- 내려받기 셋이 실제 바이트로 나온다. 개별 답변은 한 칸도 들어 있지 않다.
- 범위가 서버에서 막힌다. 등록부에 없는 기관은 화면도 내려받기도 닫힌다.

### 실제 운영에 막히는 것

- **로그인해서 닿는 첫 화면이 비어 있다.** `/org` 가 옛 계약·회차 모델만
  읽어 `현재 활성 계약이 없습니다 · 회차 0` 으로 선다. 배재대처럼 학교
  전용 진입으로 들어온 학생이 백 명 넘게 있어도 그 화면은 0 이다. 담당자는
  메뉴의 다섯째 줄(`전공 진단 집계`)을 스스로 찾아야 한다.
- **역할을 화면에서 줄 수 없다.** 담당자를 한 명 더 붙이거나 권한을 빼는
  일이 화면에 없다. 지금은 본사가 `pcu:org` 로 한다.
- **학과별 표에서 그 학과 명단으로 바로 못 간다.** 상태별로는 가고 학과별
  로는 못 간다.

### UI 는 있으나 지금 파는 검사의 기능이 없는 것

- `/org/participants`: 115명이 전부 `검사 시작 전` · `결과지 열람 불가` 로
  선다. 그 쪽이 읽는 표가 옛 `attempts` 라 V3 응시를 한 줄도 보지 않는다.
- `/org/licenses` · `/org/cohorts` · `/org/insights` ·
  `/org/evidence-insights`: 같은 까닭으로 전부 옛 검사의 표를 읽는다.
- `/org/reports` · `/org/settings`: 자리만 잡아 두고 `아직 열려 있지
  않습니다` 를 적는다.

### CLI 로만 가능한 것

- 기관(`organizations`)과 담당자 계정 만들기: `pcu:org`
- 학생 공개 상태 확인과 변경: `pcu:open` · 등록부 파일
- 발급 복구(열쇠를 잃었을 때 한 명 재발급): `pcu:students`(같은 일을
  담당자는 화면에서도 한다)
- 장애 진단: `pcu:diag` · 스키마: `db:upgrade` · `db:verify`

### 완전히 없는 것

- 학생 상세 화면 (한 학생의 응시·계정·기록을 한 쪽에서 보는 자리)
- 학교 담당자용 오류·사고 화면
- 권한·role 관리 화면
- 학생에게 메일·문자를 보내는 기능 (일부러 만들지 않았다. 지금은 리마인드
  대상 CSV 를 받아 학교가 쓰는 길로 보낸다)

---

## 8. 판정

- **DEMO POSSIBLE: YES.** 집계와 학생 관리와 CSV 와 내려받기까지 담당자가
  볼 화면이 실제로 서고 눌러서 돈다.
- **OPERATOR USABLE: NO.** 로그인이 닿는 첫 화면이 비어 있고, 권한을
  화면에서 줄 수 없고, 옛 검사 화면 다섯이 지금 파는 검사의 상태를 반영하지
  않는다.
- **PILOT READY: NO.** 위의 셋이 닫히기 전이고, 운영 배포본을 밖에서 한
  번도 열지 못했다(네트워크 정책이 `app.careermatri.com:443` 을 막는다).

**다음 구현 우선순위는 이 판정이 정한다**: ① `/org` 첫 화면을 지금 파는
검사의 자리로 ② 권한 화면 ③ 옛 검사 화면 다섯의 거취(지금 검사에 연결할지,
`아직 열려 있지 않습니다` 로 내릴지) ④ 학생 상세 ⑤ 학과별 drill-down.
**이 회차에서는 하나도 만들지 않았다.**
