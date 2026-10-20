# Track D 2차 · 격리 DB 배재대 시드로 담당자 기능

| 항목 | 판정 | 근거 |
|---|---|---|
| 격리 시드(학과 10 · 학생 44 · 응시 36 · 완료 31) | **PASS** | `SEED.md` S1·S2 · DB `cm_pcu_seed`(포트 5433 · 운영도 개발 DB 도 아님) |
| 학과별 집계 = 따로 쓴 SQL · 5명 규칙 | **PASS** 10/10 학과 | `SEED.md` 학과별 대조 표 |
| 개인 조회(학번 · 학과 · 미응시) | **PASS** | S4 |
| 접근 거부(다른 학교 담당자 · 교수 · 학생 · 다른 학생) | **PASS** | S5 |
| CSV(명단 · 학과) · 다섯 미만 가림 | **PASS** | S6 · `exports/students.csv` · `exports/departments.csv` (가명) |
| 요약 PDF(`/org/v3/report.pdf`) | **NOT VERIFIED** | Next 서버 + 머리 없는 브라우저가 `/org/v3/report` 를 연다 · Next 빌드 불가 |
| 권한별 메뉴 · 다운로드 · 숫자 화면 스크린샷 | **NOT VERIFIED** | 같은 까닭 |
| 1차 검사(두 학교 격리 · 38가지) 회귀 | **PASS** 38/38 | `../REGRESSION/logs/trackD-admin-realpg.log` |

- 시드 이름과 학번은 **지어낸 것**이다. 학과 코드는 등록부 배재대 2026 편제 그대로다.
- 검사 쪽 고침 하나: `trackD-admin.ts` · `trackD-seed.ts` 가 다시 돌릴 때 시험 계정을 지우려다 감사 기록(외래키)에 막혀 같은 아이디로 새로 만들지 못했다. 있으면 그 계정을 다시 쓴다. 제품 코드 변경 없음.
- 실행: `PGPORT=5433 DATABASE_URL=postgres:///cm_pcu_seed V3_PREVIEW_OPEN='*' V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json npx tsx scripts/lab/trackD-seed.ts`
