# R5 · 결과지 디자인 차이 (v11 매거진판 → R5)

작성 2026-10-20 · 렌더러 `src/lib/me-v3/report-gm/render9.ts` · 뽑는 쪽 `scripts/lab/gm-r5.ts`.
같은 입력(`load3` → `edit8`)을 쓴다. **문장의 사실 · 판정 · 측정은 그대로**이고 바뀐 것은 짜임과 활자와 말끝이다.
운영 PDF 경로는 그대로다(실험 경로).

## 1. v11 에서 R5 지시가 짚은 문제 → 고친 것

| # | v11 문제 | R5 에서 | 확인 자리 |
|---|---|---|---|
| 1 | 큰 명조 제목(25~30pt Noto Serif KR)이 쪽마다 서서 잡지처럼 읽힘 | **Noto Serif KR 제거**. 본문 Pretendard · 제목도 Pretendard 800. 표지 큰 글 28pt 하나 | `LINT_RESULTS.md` 명조 0 (PDF 글꼴 목록 + 계산된 글꼴 둘 다) |
| 2 | `03 / 강점 세 가지 / 3행` 이 사례마다 되풀이 | 그 장을 없앴다. 표지 takeaway 는 `응답에서 가장 깊은 판단`(POOR 는 `출발점 — 관심 높음`) | 단정어 검사에 `강점 세 가지` · `지금 강한 쪽` 포함 0 |
| 3 | 같은 3단 템플릿이 쪽마다 | 쪽 문법 12가지(full-bleed · matrix · comparison · evidence-flow / gap-timeline / conflict-map · dot-plot · process-flow · timeline · workbook · worksheet-cards · worksheet · answer-drill · closing) | 시안 6쪽 문법 6/6 · 세 사례 |
| 4 | 4쪽이 사례와 무관하게 같은 꼴 | **사례마다 정보 구조가 다르다**: RICH 근거→직무 쓰임(evidence-flow) · POOR 빠진 근거→첫 실습 4주(gap-timeline) · CONTRA 어긋남→확인 질문 3(conflict-map) | `COMPARE6/p-04.png` · 검사 `4쪽 문법이 사례마다 다르다` |
| 5 | POOR 에도 `강점` 칸이 섬 | POOR 에는 강점 문구 0. `출발점` · `빈 판단` · `첫 실습` 으로만 | POOR 단정어 0 |
| 6 | 공시 · DART · 재무 · 기업 매출 · 지역 기업 수치 | **R5 결과지는 기업 자료를 읽지 않는다.** 금지어 24 전부 0 | 금지어 검사 |
| 7 | 응답 · 자기기록 · 일반 안내 · 분석을 배지로 도배 | 표시 넷(● 응답 확인 · ○ 학생 자기기록 · ◇ 일반 직무 안내 · → 분석 제안)을 **줄 머리에 한 글자**로만, 범례는 쪽 바닥 한 줄 | 쪽 그림 |
| 8 | 자기보고에서 `능력이 있습니다 · 강점입니다` 로 단정 | 수준마다 말끝을 고정: `해 본 적이 없다고 / 정해진 조건 안에서 해 봤다고 / 스스로 맡아 해 봤다고 / 기준까지 직접 정했다고 응답했습니다` + `실제 결과물의 품질과 수치는 확인하지 않았습니다.` | 단정어 9종 0 |
| 9 | 쪽 수 목표가 디자인을 끌고 감 | 쪽 수 목표 없음. 전체 12쪽은 결과, 시안 6쪽은 지시의 R4 첫 제출 규격 | — |

## 2. 쪽별 비교 (같은 자리 · 같은 사례)

| 그림 | v11 | R5 | 무엇이 달라졌나 |
|---|---|---|---|
| `pdf/BEFORE_AFTER/cover_v11-p01_r5-p01.png` | 01 표지 | 01 표지 | 명조 큰 제목 + 남색 띠 → 어두운 판 위 응답 문장 + 12영역 타일 + 차례. 타일 막대가 응답 깊이를, 점이 관심을 · 빗금은 묻지 않음 |
| `pdf/BEFORE_AFTER/page4_v11-p04_r5-p04.png` | 04 두 직무 | 04 사례별 쪽 | 같은 대조표 → 사례마다 다른 쪽(위 표 4번) |
| `pdf/BEFORE_AFTER/jobs_v11-p06_r5-p03.png` | 06 장면 | 03 직무 비교 | 장면 문단 → 직무 셋 비교표(먼저 정하는 것 · 지금 가진 근거 · 비어 있는 판단) + 어두운 결론 띠 |
| `pdf/BEFORE_AFTER/apply_v11-p10_r5-p06.png` | 10 정리 | 06 지원서·면접 | 정리 문단 → 자기소개서 뼈대(빈칸은 학생이 씀) + 면접 카드 4 |

12쪽 전체: `pdf/FULL/<RICH|POOR|CONTRA>.pdf` · 쪽 그림 `pdf/FULL/pages/<사례>/` · 시안 6쪽 `pdf/PROTO6/` · 같은 번호 쪽 셋을 나란히 `pdf/COMPARE6/p-01..06.png`.

## 3. 활자 표

| 역할 | 토큰 | 크기 · 굵기 | 글꼴 | v11 |
|---|---|---|---|---|
| 표지 큰 글 | `--t-display` | 28pt · 800 | Pretendard | Noto Serif KR 30pt 700 |
| 쪽 제목 | `--t-h1` | 19pt · 800 | Pretendard | Noto Serif KR 25pt 700 |
| 묶음 제목 | `--t-h2` | 12.5pt · 700 | Pretendard | Pretendard 12pt |
| 이끄는 줄 | `--t-lead` | 11.5pt · 500 | Pretendard | Noto Serif KR 16pt(인용) |
| 본문 | `--t-body` | 10pt · 400 | Pretendard | Pretendard 10pt |
| 거드는 줄 | `--t-small` | 9.2pt · 400 | Pretendard | Pretendard 9pt |
| 이름표 · 범례 | `--t-label` | 8.5pt · 600 | Pretendard | Pretendard 8.5pt |
| 숫자 | `--t-num` | 24pt · 800 · tabular | Pretendard | Noto Serif KR 30pt |

v11 열은 `render8.ts` 에서 읽은 값이다(Noto Serif KR 자리 넷: 장 번호 30pt · 제목 25pt · 인용 16pt · 숫자).

격자: A4 · 위/좌우/아래 13/16/11mm · 12단(`.g12` + `.s2~.s12`). 색: 잉크 #14171d · 어두운 판 #111620 · 강조 #d9582b · 남색 #2f4a7a.
가장 작은 글자 8.5pt(검사 `8.5pt 아래 0`).

## 4. 검사가 말하지 않는 것

`LINT_RESULTS.md` 는 디자인 PASS 가 아니다. 사람 판단은 `02_HUMAN_REVIEW.md`.
