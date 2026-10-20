# Track E 2차 · Gold Master 실제 연동 (설계 · 변경 요청 · 검증)

| 항목 | 판정 | 근거 |
|---|---|---|
| 제품 PDF 요청 · 권한 연결 설계 · 코드 변경 요청 | **제출** | `PM_CHANGE_REQUEST.md` 요청 1~4 |
| 제출 시점 스냅샷 = GM 입력 기준 시각 | **PASS** | `CHECKS.md` P1 (`submitted_at` = 스냅샷 `created_at` = `frozen_at`) |
| 등급을 올려 다시 굳으면 입력도 새 기준으로 | **PASS** | P2 |
| 파기(응시 하나 · 사람 하나 · 경로 넘기기 막힘 · 운영 PDF 폴더 무관) | **PASS** | P3 · `purgeGm` · `purgeGmForUser` (`report-gm/inputs.ts`) |
| 자유입력 한 줄(`note_text`)이 굳힌 파일에 남는 구멍 | **찾음 → 고침 → PASS** | P1 · 판본 `gm-input.2` |
| 파일 접근 차단(라우트 · public · .next · gitignore) | **PASS** (정적) | P4 |
| 운영 파일 패키징 | **FAIL (예상 · 승인 전 고치지 않음)** | P5 · `PM_CHANGE_REQUEST.md` 요청 4 |
| 1차 검사(생성 · 권한 · 재현성 · 실패 복구 18가지) 회귀 | **PASS** 18/18 | `../REGRESSION/logs/trackE-check-realpg.log` |
| 공통 `erasure.ts` 가 GM 파일을 지움 | **NOT DONE (승인 필요)** | 요청 3 |
| 운영 다운로드 · 운영 볼륨 | **NOT VERIFIED** | 운영에 닿지 않는다 |
