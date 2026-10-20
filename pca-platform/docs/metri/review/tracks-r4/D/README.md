# Track D 4차 · 관리자 — `/org/v3` 집계 · 명단 · 조회 · CSV · 권한 · 다기관 격리 · 5명 미만 비공개

기준 HEAD `feb3ea13`(seed · admin · audit 실행 시점) · 실제 node-postgres 8.16.3(저장소 밖 `run-realpg`).
시드 · 계정 · 이름 · 학번은 전부 **지어낸 시험 자료**다(`../../tracks-r3/F/TEST_ACCOUNTS.md`). 운영 DB · Staging 에 닿지 않았다.

## 1. 실제 구현

- 이 회차 코드 변경 **없음**. 담당자 화면이 부르는 서버 동작 · 라우트(`src/app/org/v3/page.tsx` · `students/actions.ts` ·
  `export/students.csv/route.ts` · `export/departments.csv/route.ts` · `report.pdf/route.ts`)를 로그인 세션 하나만 바꿔 끼워 그대로 불렀다.
  주인 확인 · 역할 규칙 · 학교 범위 · 5명 규칙 · 접근 기록은 제품 코드가 돈다.

## 2. 테스트 증거

| 검사 | 환경 | 결과 | 로그 · 산출물 |
|---|---|---|---|
| `trackD-seed.ts` — 10개 학과 44명 발급 · 응시 36 · 제출 31 · 학교 응시 전부 PRO | 격리 5433 `cm_pcu_seed` | **33 / 33** | `logs/trackD-seed.log` · `SEED.md` · `exports/` |
| └ S3 **집계 = 따로 쓴 SQL**: 명단 44 · 시작 36 · 끝냄 31 · 완료율 70% · 단과대학(경영대학) 17 · **학과마다 화면 칸 = SQL 10 / 10** | | 통과 | 같은 로그 16~26행 |
| └ S3 **5명 미만 비공개**: 다섯 미만 칸이 수로 새지 않음 · 학과 하나로 좁혀 다섯 미만(심리상담 시작 3)이면 아래 칸을 세지 않음 | | 통과 | 같은 로그 |
| └ S4 명단 · 조회: 총원 = 발급 44 · 학번으로 한 사람 찾기 · 미응시 8 · 학과로 좁힌 명단 | | 통과 | |
| └ S5 **접근 거부**: 다른 학교(ZZTEST) 담당자 범위 · 그 집계에 PCU 학생 0 · PCU 비밀번호 재발급 거절 · CSV 에 PCU 학번 없음 · 교수 · 학생 계정 차단 · 담당자 · 다른 학생이 학생 응시를 열지 못함 | | 8 / 8 통과 | |
| └ S6 **CSV**: 명단 200 · 53줄 · 비밀번호 · 문항 · 응답값 칸 없음 · 학과 CSV 200 · 경영학과 8 = 화면 · 다섯 미만 학과 `5명 미만이라 수를 내지 않습니다` | | 통과 | `exports/students.csv` · `exports/departments.csv` |
| `trackD-admin.ts` D1~D10 — **두 학교 격리**(재발급 · 멈춤 · 재응시 · 명단 교차 0) · 역할(`instructor` 읽기만 · 학생 차단 · 비로그인 `/login`) · 계정 멈춤/재발급 · 집계 = SQL(ZZTEST 6/5 · 83%) · **5명 규칙** · 재응시 한 줄 · 결과 조회 경계 · CSV 수식 막기 · CSV 등록 미리 보기 0줄 | cm_dev · fixture | **38 / 38** | `logs/trackD-admin.log` |
| `trackF-audit.ts` — 담당자 CSV 내려받기 접근 기록(누가 · 학교 · 범위 · 이름/메일 없음) · 조회 담당자 · 다른 학교는 자기 학교로 · **기록 실패 시 CSV 를 만들지 않음** · PDF 는 코드 자리 | 격리 5433 `cm_pcu_seed` | **10 / 10** | `logs/trackF-audit.log`(같은 것 `../F/logs/`) |

## 3. BLOCKED

- 없음(서버 수준 검사는 이 환경에서 돈다). 브라우저 검사는 4절.

## 4. NOT VERIFIED

- **브라우저 관리자 화면 전부**: 권한별 메뉴 · 숫자 화면 · 내려받기 단추 · 명단 검색 · 모바일 — Next 빌드 불가 · Staging 미생성.
- **운영 요약 PDF**: seed S7 `재지 못함` · audit F4 `NOT VERIFIED`(그리는 브라우저 · 서버 필요). 기록 자리는 코드로만 확인.
- 실제 세션 쿠키로 들어온 담당자의 `memberships` 모양(세션을 바꿔 끼워 셌다).
- 운영 데이터 양에서의 집계 시간.

## 5. 다음 행동

1. CI 승인 뒤 `pcu:ops`(브라우저) · Staging 승인 뒤 `../../tracks-r3/F/BROWSER_CHECKLIST.md` #9(담당자 조회) · #10(다른 학교 · 개인 결과 거절)을
   캡처 · HTTP 상태 · 서버 로그 줄 · Git SHA 와 함께.
2. Staging 에서 운영 요약 PDF 한 번 → `audit_logs` 에 `campus.export.*` 한 줄 확인.
3. 담당자 화면에 내려받기 기록을 보여 줄지 — 새 기능이라 사업주 판단.

```bash
PGPORT=5433 DATABASE_URL=postgres:///cm_pcu_seed V3_PREVIEW_OPEN='*' V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json OUT=docs/metri/review/tracks-r4/D npx tsx scripts/lab/trackD-seed.ts
DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json OUT=var/tmp-r4d npx tsx scripts/lab/trackD-admin.ts
PGPORT=5433 DATABASE_URL=postgres:///cm_pcu_seed V3_PREVIEW_OPEN='*' V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json npx tsx scripts/lab/trackF-audit.ts
```
