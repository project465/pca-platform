# 3차 회귀 (트랙 A~F 변경을 합친 뒤 · 커밋 `e02847f4` 위에서)

DB: `postgres:///cm_dev`(로컬 개발 DB · 운영 아님). 드라이버: 표시 없는 것은 대체 드라이버(psycopg 다리),
`realpg` 는 실제 node-postgres 8.16.3. 원시 로그는 `logs/`, 한 줄 요약은 `logs/SUMMARY.tsv`.

| 검사 | 결과 | 원시 로그 |
|---|---|---|
| 측정 동결 `ME_V3_MEASUREMENT_FREEZE_1` | **14 / 14** (기록 다시 적지 않음) | `logs/v3-measurement-freeze.log` |
| 검사 화면 동결 | OK · `ME_V3_2_ASSESSMENT_UI_V45` · 파일 21벌 (Track C 커밋 B 에서 V44 → V45 로 올리고 다시 적음) | `logs/v3-freeze-check.log` |
| 결과지 동결 | OK · `ME_V3_RESULT_UI_V77` · 파일 25벌 | `logs/v3-result-freeze.log` |
| 작업공간 동결 | OK · `CAREERMATRI_WORKSPACE_UI_V48` · 파일 53벌 | `logs/v3-workspace-freeze.log` |
| Core UI 묶음 동결 | OK · 화면 14 | `logs/v3-core-ui-freeze.log` |
| 채점 | 31 / 31 | `logs/v3-scoring-check.log` |
| 런타임 | 30 / 30 | `logs/v3-runtime-check.log` |
| 결과 모델 | 25 / 25 | `logs/v3-result-check.log` |
| 판본 provenance | 18 / 18 | `logs/v3-provenance-check.log` |
| 검사 화면 계획 | 29 / 29 | `logs/v3-ui-check.log` |
| 재분석 | 19 / 19 | `logs/v3-recompute-check.log` |
| 학생 언어 | 122 / 122 | `logs/v3-student-check.log` |
| Track B 115 자리 E2E (realpg) | 115 / 115 · 153 / 153 · 갈림 19 / 19 | `../B/logs/trackB-dept-e2e.log` |
| Track C 경합 (realpg) | 15판 R1~R5 PASS · 반 14 · 40명 | `../C/logs/race-realpg*.log` |
| Track C 안정성 · DB 정지 (realpg) | 26 / 26 · 11 / 11 | `../C/logs/stability-realpg.log` · `../C/logs/outage-realpg.log` |
| Track D 시드 · 관리자 (realpg) | 33 / 33 · 38 / 38 | `../D/logs/*.log` |
| Track F 접근 기록 (realpg) | 10 / 10 | `../F/logs/trackF-audit.log` |
| Track A v9 | 측정 동결 14/14 · 8.5pt 미만 0 · 어긋난 짝 0 | `../../pdf-gm/v9-full/logs/` |
| Track E 승인 패키지 | `../E/logs/` | 패키지 쪽 README |

`npm run typecheck` · `npm run build` · 브라우저 검사(`v3:shots` · `campus:shots` · `pcu:coverage` · `pcu:ops`)는
**NOT VERIFIED**: npm 레지스트리가 막혀 의존성을 설치할 수 없다(`../F/CI_AND_APPROVAL_REQUEST.md`).
