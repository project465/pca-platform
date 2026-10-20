# Track A 2차 · BIZ Gold Master v8

산출물: `docs/metri/review/pdf-gm/v8-full/` (PDF 세 벌 · 쪽 그림 `pages/` · `BUILD_*.md` · `CHANGES.md` · 원시 로그 `logs/`). v7-full 은 비교용으로 그대로 두었다.

| PM 지시 | 판정 | 근거 |
|---|---|---|
| POOR 결과물 0건 vs ‘3건 묶기’ 모순 | **PASS** | 결과물 수로 6개월 계획을 적는다(0건 → 첫 결과물 한 건으로 시작) · `CHANGES.md` 1 |
| 면접 질문 ↔ ‘내가 정한 것’ 어긋남 | **PASS** 0건 | 질문 24개에 판단(J1~J8) 표시 · 같은 판단 문장만 붙이고 없으면 직접 기입 · `logs/03-gm-a-interview.log` |
| POOR 실행 과제 구체화 | **PASS** | 할 일 + 남길 것 + 규모(2~4주 · 팀 3~5명 4~8주) |
| 축소 쪽 가독성 | **PASS** 95% 아래 0쪽(전 2·3·2) | 숨기지 않고 짜임을 바꿨다(28 · 41 · 15 · 80쪽) |
| 사례마다 핵심 쪽 3개 이상 이미지 대조 · 오독 문장 수정 | **PASS** 사례마다 4~6쪽 · 8문장 | `CHANGES.md` 이미지 표 |
| 출처 등급 유지 | **PASS** | 2쪽 범례 네 등급 · 15 · 75쪽 ‘추천 전략’ 표시 |
| 기업 수치 원문 대조 · KODATA 학생 배포 권리 | **NOT VERIFIED → 배포 금지** | 검토용 미리보기만 |
| 사례 사이 유사도 0.85 넘는 쪽 6 | **남음** | 이번 목표가 아니었다(공통 안내 · 공시 쪽) |
| RICH 45쪽 판단↔마일스톤 짝 하나 | **남음** | 짝을 만드는 `companies.ts` 는 이번 허용 파일 밖 |
| `npm run typecheck` | **NOT VERIFIED** | npm 레지스트리 막힘 |

| 지표 | RICH | POOR | CONTRA |
|---|---|---|---|
| 쪽 수 | 73 | 59 | 66 |
| 줄여 맞춘 쪽(95% 아래) | 5 (0) | 7 (0) | 6 (0) |
| 직접 기입 칸 | 41 | 42 | 51 |

바꾼 파일: `src/lib/me-v3/report-gm/{report3,analysis3,render6,render5}.ts` · `data/report-gm/biz-role-guide.json` · 새 `scripts/lab/gm-a-interview.ts`. 측정 동결 14/14.
