# METRI 설계 문서

Engineering Career Intelligence — 공학 학습자 Career Profile 엔진의 설계 묶음.
업로드된 사업 컨텍스트 문서(`Engineering Career Intelligence Platform — 사업 아이디어 및 경쟁사 분석`)의
16장 "다음 단계에서 해야 할 일" 을 실제 설계로 옮긴 것이다.

## 읽는 순서

| # | 문서 | 답하는 것 |
|---|---|---|
| 00 | [무엇을 만드는가](00_positioning.md) | 정의, 기존 PCA 와의 관계, 고교까지 넓힌 이유, 5개 트랙 |
| 01 | [학생 화면](01_screens.md) | 트랙별 화면 흐름 전부. 학과·기업 화면 포함 |
| 02 | [Skill Graph](02_skill_graph.md) | 온톨로지 구조와 3개 전공 Skill Tree |
| 03 | [검사 문항](03_assessment.md) | 축·문항 수·실제 예시 문항·응답 품질 |
| 04 | [매칭 산식과 AI](04_matching.md) | 점수 산식 전체와 AI 를 어디에 쓰고 어디에 안 쓰는지 |
| 05 | [JD 수집 구조](05_jd_pipeline.md) | 국내·미국 소스, 라이선스, 파이프라인 |
| 06 | [데이터베이스](06_database.md) | 테이블 설계 해설 |
| 07 | [1차 MVP](07_mvp.md) | 12주 범위, 완료 기준, 100명 검증 |
| 08 | [수익모델](08_revenue.md) | 대학·학생·기업 각각. 단위경제 포함 |
| 09 | [글로벌 흐름 검증](09_global_flow.md) | 그 흐름이 한국만의 것인지 |

부속물

- [`generated/skill_tree.md`](generated/skill_tree.md) — 3개 전공 전체 표 (자동 생성)
- `../../data/metri/*.json` — Skill Tree 원본. **고칠 곳은 여기다**
- `../../db/schema_metri.sql` — 확장 스키마
- `../../db/seed/metri/skill_tree.sql` — 시드 (자동 생성)
- `../../prototypes/metri/index.html` — 임시 프리뷰 사이트

## 다시 만들기

```bash
npm run metri:build     # JSON → SQL 시드 + 문서 표 + 프리뷰 데이터
```

## 확정되지 않은 것

아래는 **제안이지 확정이 아니다.** 숫자는 전부 근거와 함께 적어 두었으니,
동의하지 않는 항목은 그 근거를 보고 바꾸면 된다.

- 매칭 산식의 계수 (4장) — 100명 검증 전까지는 전문가 설정값이다
- 문항 수와 문항 문구 (3장) — 예시 30문항만 실제로 썼다
- 가격 (8장) — 경쟁사 공개가와 학과 예산 규모에서 역산한 범위다
- 기존 `CLAUDE.md` 의 "제안서 vs 플랫폼 스펙 충돌" — 07번 문서 마지막에 정리해 두었다
