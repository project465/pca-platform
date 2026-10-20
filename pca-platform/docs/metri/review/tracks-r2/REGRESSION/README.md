# 2차 회귀 (모든 트랙 변경을 합친 뒤 한 번에)

DB: `postgres:///cm_dev`(로컬 개발 DB · 운영 아님). 드라이버: 표시 없는 것은 대체 드라이버(psycopg 다리), `realpg` 는 실제 node-postgres 8.16.3.

| 검사 | 결과 | 원시 로그 |
|---|---|---|
| 측정 동결 `ME_V3_MEASUREMENT_FREEZE_1` | 14 / 14 (기록 다시 적지 않음) | `logs/v3-measurement-freeze.log` |
| 검사 화면 동결 | OK · `ME_V3_2_ASSESSMENT_UI_V44` · 파일 21벌 | `logs/v3-freeze-check.log` |
| 결과지 동결 | OK · `ME_V3_RESULT_UI_V77` · 파일 25벌 | `logs/v3-result-freeze.log` |
| 작업공간 동결 | OK · 파일 53벌 · CSS 이름 133 | `logs/v3-workspace-freeze.log` |
| 채점 | 31 / 31 | `logs/v3-scoring-check.log` |
| 런타임 | 30 / 30 | `logs/v3-runtime-check.log` |
| 결과 모델 | 25 / 25 | `logs/v3-result-check.log` |
| 판본 provenance | 18 / 18 | `logs/v3-provenance-check.log` |
| 검사 화면 계획 | 29 / 29 | `logs/v3-ui-check.log` |
| 재분석 | 19 / 19 | `logs/v3-recompute-check.log` |
| 학생 언어 | 122 / 122 | `logs/v3-student-check.log` |
| Track B 1차 115 자리 E2E (realpg) | 115 / 115 · 153 / 153 · 갈림 19 / 19 | `logs/trackB-dept-e2e-realpg.log` |
| Track C 1차 안정성 (bridge · realpg) | 26 / 26 · 26 / 26 | `logs/trackC-stability-*.log` |
| Track D 1차 관리자 (realpg) | 38 / 38 | `logs/trackD-admin-realpg.log` |
| Track E 1차 PDF 연동 (realpg) | 18 / 18 | `logs/trackE-check-realpg.log` |

`npm run typecheck` · `npm run build` · 브라우저 검사(`v3:shots` · `campus:shots` · `pcu:coverage`)는 **NOT VERIFIED**: npm 레지스트리 DNS 가 막혀 의존성을 설치할 수 없다.
