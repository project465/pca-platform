# Track E · Gold Master PDF 연동 검사

- 실행: 2026-10-20T08:19Z · DB `postgres:///cm_dev` (로컬 개발 DB · 운영 아님)
- 응시는 제품의 저장 경로로 굳혔다. PDF 는 `scripts/lab/gm-student.ts` → `var/gm-out/<응시>/` (운영 경로 아님).
- 경험 기록 고정: `src/lib/me-v3/report-gm/inputs.ts` (공통 DB 변경 없음 · Core 요청 1 의 임시 해법).

**통과 18 · 걸림 0 / 18**

| 판정 | 확인 | 값 |
|---|---|---|
| | **준비: 제품 저장 경로로 굳힌 응시 하나** | |
| PASS | 응시가 굳었다 | 응시 105 · BIZ_CORE_V1 |
| | **E1 본인이 뽑는다 · 경험 기록은 응시 시점 기준** | |
| PASS | 본인 요청으로 PDF 가 나온다 | 72쪽 |
| PASS | 검사 전에 적고 그대로인 기록만 들어간다 | 쓴 기록 1 |
| PASS | 검사 뒤에 더한 기록은 넣지 않는다 |  |
| PASS | 검사 뒤에 고친 기록은 넣지 않는다 |  |
| PASS | PDF 표지에 학교와 학과가 적힌다 |  |
| | **E2 재현성 · 기록을 지워도 같은 PDF** | |
| PASS | 두 번째는 굳혀 둔 입력을 다시 쓴다 |  |
| PASS | 같은 입력이면 같은 HTML 이다 | 3b41b190d4e90d1f |
| PASS | 학생이 기록을 지운 뒤에도 같은 HTML 이 나온다 |  |
| | **E3 다운로드 권한** | |
| PASS | 다른 학생은 받지 못한다 | 본인의 응시가 아닙니다. |
| PASS | 같은 학교 담당자도 기본으로 받지 못한다(계약·동의 칸이 없다) | 계약에 개인 결과지 열람이 들어 있지 않습니다. |
| PASS | 다른 학교 담당자는 받지 못한다 | 본인의 응시가 아닙니다. |
| | **E4 실패 복구** | |
| PASS | 브라우저가 뜨지 않으면 걸음과 까닭을 남긴다 | Error: browserType.launch: Failed to launch chromium because executable doesn't  |
| PASS | 덜 만든 파일을 남기지 않는다 |  |
| PASS | 앞서 만든 PDF 는 그대로 남는다 |  |
| PASS | 다시 하면 성공하고 실패 기록을 치운다 |  |
| PASS | 굳혀 둔 입력 파일이 고쳐졌으면 쓰지 않고 다시 모은다 |  |
| | **E5 운영 PDF 경로** | |
| PASS | 운영 PDF 폴더(var/reports)에 쓴 파일이 없다 | 0 → 0 |
