# CareerMatri PRO · 경영학과 80쪽 상세 목차와 쪽별 설계

> 이 문서는 `data/report-gm/biz-pro-toc.v1.json` 에서 만든다(`scripts/lab/gm_toc5.py`). 손으로 고치지 않는다.

상태: **DESIGN_ONLY** — 설계안이다. 80쪽을 다시 뽑지 않았고 운영 PDF 와 연결하지 않았다. 쪽 수 범위 70~90.

규칙: 쪽 수를 채우려고 쪽을 세우지 않는다. when 조건이 맞지 않으면 그 쪽은 빠지고, 70쪽 아래로 내려가면 빈 쪽을 만들지 않고 그대로 낸다.

## 1. 장별 쪽 수

| 장 | 이름 | 쪽 |
|---|---|---|
| 1 | 표지·진단·요약 | 5 |
| 2 | 개인 역량 | 10 |
| 3 | Evidence | 9 |
| 4 | 전공 직무 심층 | 10 |
| 5 | 지역 산업 | 6 |
| 6 | 기업 분석 | 14 |
| 7 | 기업별 전략 | 10 |
| 8 | 자소서·면접·포트폴리오 | 9 |
| 9 | 계획·워크시트·출처 | 7 |

## 2. 작성 가능 여부 요약

| 구분 | 뜻 | 쪽 |
|---|---|---|
| `NOW` | 기존 코드·자료로 지금 만들 수 있음 | 31 |
| `CODE` | 자료는 있고 새 쪽 틀이 필요함 | 45 |
| `RESEARCH` | 조사 자료가 있어야 함(없으면 쪽을 세우지 않거나 빈칸 표시) | 4 |

- 부족한 조사 자료가 걸린 쪽: **24쪽**(그 쪽은 자료가 없는 칸을 ‘확인 필요’ 로 세우고 지어내지 않는다).
- 학생 자료에 따라 서거나 빠지는 쪽: **10쪽**(`언제` 칸). 빠지면 다른 쪽으로 채우지 않는다.

## 3. 검증 상태 표기

| 표기 | 뜻 |
|---|---|
| `MEASURED` | 검사 응답·고른 근거(측정 엔진, 판본 고정) |
| `STUDENT_RECORD` | 학생이 적은 경험 기록(자기보고) |
| `GENERAL` | 직무 일반 안내(PREVIEW, 특정 기업 요건 아님) |
| `OFFICIAL_DIRECT` | 공식 원문 직접 확인(OpenDART API · 2026-10-20) |
| `THIRD_PARTY` | 제3자 자료(KODATA, 배포 권리 미확정) |
| `SEARCH_ONLY` | 검색·보도 결과만 확인 |
| `NEEDS_OFFICIAL` | 공식 자료 필요·미확보 |
| `MIXED` | 쪽 안에서 줄마다 다름(줄마다 표시) |

## 4. 쪽별 설계


### 1. 표지·진단·요약 (5쪽)

| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 표지 | 표지 | A | 학교·학과·목표 직무·준비 상태, 열두 영역 레이더(관심 길이 × 해 본 깊이) | v3_snapshots.result_model · profile | `MEASURED` | `NOW` | — | 재사용: v4 p1 |
| 2 | 차례와 읽는 법 | 안내 | A | 장 구성, 여덟 판단 이름, 근거 층(응답·고른 근거·결과물·기록·2차 출처), 검증 5단계 | report3 · words.ts | `GENERAL` | `NOW` | — | 재사용: v3 차례·용어 |
| 3 | 한눈에 보기 | 요약 | A | 확인된 영역 수 · 고른 근거 수 · 경험 기록 수 · 본 기업 수, 핵심 문장 한 단락 | report3.overview | `MEASURED` | `NOW` | — | 재사용: v4 p1 하단 |
| 4 | 종합 의견 ① 지금 설명할 수 있는 것 | 분석 | A·C | 설명할 수 있는 영역 · 비어 있는 판단 · 먼저 할 일 셋(전략 행) | report3.points · strategy3 | `MEASURED` | `NOW` | — | 재사용: v3 01 |
| 5 | 종합 의견 ② 목표 직무 준비 상태와 한계 | 분석 | A·C | 목표 직무 준비 단계, 이 리포트가 말할 수 없는 것(점수·순위·합격 가능성 없음) | report3.points · directions | `MEASURED` | `NOW` | — | 재사용: v3 01 |

### 2. 개인 역량 (10쪽)

| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |
|---|---|---|---|---|---|---|---|---|---|
| 6 | 개인 역량 프로파일 | 그림 | A | 세 영역 레이더(여덟 판단 깊이) + 깊이별 판단 목록 | result_model.domains[].axes | `MEASURED` | `NOW` | — | 재사용: v4 p2 |
| 7 | 열두 영역 지도 | 그림 | A | 관심 × 해 본 횟수 × 배울 뜻 3열 표, 묻지 않은 영역 표시(0으로 적지 않음) | result_model.overview · zones | `MEASURED` | `CODE` | — | — |
| 8 | 영역마다 본 여덟 판단 | 표 | A | 영역 × 판단 깊이 눈금 표(세 단계) | result_model.domains[].axes | `MEASURED` | `NOW` | — | 재사용: v4 p2 하단 |
| 9 | 근거가 선 영역 ① 심층 | 분석 | A | 여덟 단계 흐름 · 체크리스트 인용 · 뜻 · 한계 | analysis3.domainRead | `MEASURED` | `NOW` | — | 언제: Z1 영역이 1개 이상 · 재사용: v4 p3 |
| 10 | 근거가 선 영역 ② 심층 | 분석 | A | 같은 구성, 둘째 영역 | analysis3.domainRead | `MEASURED` | `NOW` | — | 언제: Z1 영역이 2개 이상 (없으면 이 쪽을 세우지 않는다) · 재사용: v3 03 |
| 11 | 해 봤고 정리가 남은 영역 | 분석 | A | Z2 영역의 해 본 단계 · 빠진 결과물 · 정리할 것 | analysis3.domainRead | `MEASURED` | `NOW` | — | 언제: Z2 영역이 있을 때 · 재사용: v3 03 |
| 12 | 관심은 있고 아직 해 보지 않은 영역 | 분석 | A·C | 짧게 겪어 볼 수 있는 과제(직무 일반 안내)와 배울 순서 | zones Z4 · biz-role-guide.learnOrder | `MEASURED·GENERAL` | `CODE` | — | — |
| 13 | 응답을 어떻게 읽었나 | 분석 | A | 응답 품질 표시(고르게 답함 · 과대 보고 어긋남 · 모르겠다 수), 강제 선택 둘의 결과 | result_model.quality · forced choice | `MEASURED` | `CODE` | — | — |
| 14 | 강점 활용 전략 | 전략 | C | 확인된 판단을 목표 직무의 장면으로 옮기는 법 | report3.strengths | `MEASURED·GENERAL` | `NOW` | — | 재사용: v3 05 |
| 15 | 역량 개발 우선순위 | 전략 | C | 목표 직무에서 거꾸로 세운 실행 과제 셋과 연결 이유 | strategy3 | `MEASURED·GENERAL` | `NOW` | — | 재사용: v3 06 · v4 p5 상단 |

### 3. Evidence (9쪽)

| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |
|---|---|---|---|---|---|---|---|---|---|
| 16 | 근거 원장 ① 직접 정한 것 · 해 본 일 | 원장 | A | 학생이 고른 체크리스트 문장 그대로, 영역별 | v3_evidence_picks · checklists | `MEASURED` | `NOW` | — | 재사용: v4 p3 원장 |
| 17 | 근거 원장 ② 결과물 · 비교 대상과 증거 사다리 | 원장 | A | 남긴 결과물 · 견준 대상 · E0~E5 사다리 위치(건너뛰지 않음) | v3_evidence_picks · value-engine ladder | `MEASURED` | `CODE` | — | — |
| 18 | 경험 기록과 응답 ① 같은 곳을 가리키는 기록 | 교차 | A | 기록별 직접 정한 것 · 결과물 · 응답과 겹치는 영역 | v3 experiences · report3.cross | `STUDENT_RECORD` | `NOW` | — | 언제: 경험 기록이 있을 때 · 재사용: v3 04 |
| 19 | 경험 기록과 응답 ② 서로 다른 곳 | 교차 | A | 응답과 기록이 엇갈리는 영역과 확인 방법(억지 연결 없음) | report3.cross (CONTRA) | `STUDENT_RECORD` | `NOW` | — | 언제: 엇갈림이 있을 때 · 재사용: v3 04 |
| 20 | 행동에서 결과물까지 | 사슬 | A | 경험마다 한 일 → 직접 정한 것 → 남은 결과 → 지원서에서 쓸 부분 | result_model did/decided/artifacts/verifications | `MEASURED` | `CODE` | — | — |
| 21 | 아직 말로 옮기지 않은 경험 | 분석 | A·C | 적었지만 빈칸이 있는 경험 · 되묻는 질문(고르기형) | experiences · followups.json | `STUDENT_RECORD` | `CODE` | — | 언제: 빈칸 있는 기록이 있을 때 |
| 22 | 빈자리 지도 ① 목표 직무 기준 | 분석 | C | 목표 직무 업무 영역 안의 빈 판단과 그 까닭 | strategy3.rows | `MEASURED` | `NOW` | — | 재사용: LINKAGE_AUDIT |
| 23 | 빈자리 지도 ② 이번 전략에서 뺀 것 | 분석 | C | 목표 밖 빈자리와 그 영역을 쓰는 직무 | strategy3.outside | `MEASURED` | `NOW` | — | — |
| 24 | 지금 말할 수 있는 범위 | 원장 | A | 주장 가능 / 직접 기입 필요(수치·기간·성과) / 말할 수 없음 | report3.limits | `MEASURED` | `NOW` | — | — |

### 4. 전공 직무 심층 (10쪽)

| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |
|---|---|---|---|---|---|---|---|---|---|
| 25 | 경영학 직무 지도 | 구조도 | B | 일곱 직무(경영기획·마케팅·인사·재무회계·사업개발·운영관리·데이터 기반 경영) × 열두 영역 연결 | biz-role-guide.lens · relations | `GENERAL` | `CODE` | R12, R13 | — |
| 26 | 직무 간 차이: 같은 판단, 다른 결과물 | 비교표 | B | 같은 여덟 판단이 직무마다 무엇을 만드는지(practice.output) | biz-role-guide.practice | `GENERAL` | `CODE` | R12 | — |
| 27 | 목표 직무 실무 가이드 ① 하는 일과 차례 | 가이드 | B | 책임 · 프로세스 · 산출물 · 도구 · 지식(직무 일반 표시) | biz-role-guide[goal] | `GENERAL` | `NOW` | R12 | 재사용: v3 07 |
| 28 | 목표 직무 실무 가이드 ② 사업보고서로 산업·경쟁 읽기 | 가이드 | B·C | 실제 공시 원문(사업의 개요) 한 단락을 놓고 읽는 법 — 무엇을 보고 무엇을 적는가 | dart-overview.v1 · 가이드 본문(작성 필요) | `OFFICIAL_DIRECT·GENERAL` | `CODE` | R12, R14 | — |
| 29 | 목표 직무 실무 가이드 ③ 재무제표와 지표 읽기 | 가이드 | B·C | 공시 주요 계정(매출·영업이익·순이익)으로 계산해 보는 지표, 목표·지표 정의표 만들기 | dart-checks.v1.financials · 가이드 본문(작성 필요) | `OFFICIAL_DIRECT·GENERAL` | `CODE` | R12, R14 | — |
| 30 | 목표 직무 실무 가이드 ④ 사업계획서 · 지표 설계 · 포트폴리오로 | 가이드 | B·C | 사업계획서 구조, 지표 설계, 프로젝트를 포트폴리오와 면접 답변으로 옮기기 | biz-role-guide.firstProject/portfolio/interview | `GENERAL` | `CODE` | R12 | — |
| 31 | 둘째로 볼 직무 ① 하는 일과 차례 | 가이드 | B | 둘째 방향 직무의 같은 구성 | biz-role-guide · directions[1] | `GENERAL` | `NOW` | — | 재사용: v3 07 |
| 32 | 둘째로 볼 직무 ② 첫 실무 과제 | 가이드 | B·C | firstProject 와 지금 근거의 연결 | biz-role-guide.firstProject | `GENERAL` | `CODE` | — | — |
| 33 | 나머지 직무 개관 ① | 가이드 | B | 마케팅 · 인사 · 재무회계 — 한 직무 반 쪽(하는 일 · 결과물 · 첫 과제) | biz-role-guide | `GENERAL` | `CODE` | R12 | — |
| 34 | 나머지 직무 개관 ② 와 학과 수업 | 가이드 | B | 사업개발 · 운영관리 · 데이터 기반 경영, 수업 연결 칸(공식 교육과정 확보 전에는 과목 이름을 쓰지 않는다) | biz-role-guide · (배재대 교육과정 미확보) | `GENERAL·NEEDS_OFFICIAL` | `RESEARCH` | R1, R12 | — |

### 5. 지역 산업 (6쪽)

| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |
|---|---|---|---|---|---|---|---|---|---|
| 35 | 대전·세종·충청권 경제 구조 | 통계 | B | 경제활동별 지역내총생산 · 산업별 사업체·종사자 수(출처·기준 연도 표시) | region_facts(보도) → KOSIS 공식 통계 필요 | `SEARCH_ONLY → NEEDS_OFFICIAL` | `RESEARCH` | R2, R3 | — |
| 36 | 산업 구조도: 전략산업 → 기업 → 경영 직무 | 구조도 | B·C | 지역 전략산업에서 기업과 경영 직무로 이어지는 그림 | region_facts · dart-checks · biz-role-guide | `SEARCH_ONLY·OFFICIAL_DIRECT` | `CODE` | R6 | — |
| 37 | 대전: 연구·바이오·제조 기업군 | 표 | B | DART 상장사 개황 표(업종·설립·본점·최근 매출·사업부문별 직원) | dart-checks.v1 | `OFFICIAL_DIRECT` | `CODE` | — | — |
| 38 | 세종: 행정·공공기관과 경영·행정 직무 | 표 | B | 이전 기관 목록, 공공기관 경영 직무의 채용 방식 | 공공기관 목록(ALIO) 필요 | `NEEDS_OFFICIAL` | `RESEARCH` | R5 | — |
| 39 | 충남·충북: 본점과 사업장 | 표 | B | 사업장 거점과 본점 소재지를 가른 표(DART 본점 대조) | dart-checks.v1 · orgs v2 | `OFFICIAL_DIRECT·THIRD_PARTY` | `CODE` | — | — |
| 40 | 지역 일자리 현실 | 통계 | B | 지역 구인 직종 · 신입 채용 경로(채용 여부는 단정하지 않음) | 고용행정통계 · 공고 원문 필요 | `NEEDS_OFFICIAL` | `RESEARCH` | R4, R8 | — |

### 6. 기업 분석 (14쪽)

| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |
|---|---|---|---|---|---|---|---|---|---|
| 41 | 기업 후보를 고른 까닭 | 안내 | C | 이어지는 까닭 넷(목표 산업·관심 직무·확인된 경험·조직 유형), 적합도 숫자 없음 | companies.ts | `MEASURED·MIXED` | `NOW` | — | 재사용: v3 08 |
| 42 | 후보 비교 | 비교표 | B·C | 산업 · 규모(공시 매출·직원) · 직무 · 확인 수준 한 표 | dart-checks.v1 · orgs v2 | `OFFICIAL_DIRECT·THIRD_PARTY` | `CODE` | — | — |
| 43 | 기업 ① 지역 상장사(예: (주)리가켐바이오사이언스) — 사업과 위치 | 기업 | B | ① 사업과 위치 ② 제품·서비스: 공시 개황, ‘사업의 개요’ 원문 인용, 최근 주요 계정 | dart-checks · dart-overview · orgs v2 | `OFFICIAL_DIRECT·SEARCH_ONLY` | `CODE` | R7, R8 | — |
| 44 | 기업 ① 지역 상장사(예: (주)리가켐바이오사이언스) — 일의 체계와 실제 업무 | 기업 | B·C | ③ 사업부문별 인원(공시) ④ 연결 직무 ⑤ 실제 업무(공고에서 본 것과 직무 일반을 가름) ⑥ 학생 검사 연결 | dart-checks.staff · orgs v2.jobs · biz-role-guide · report3 | `OFFICIAL_DIRECT·SEARCH_ONLY` | `CODE` | R7, R8 | — |
| 45 | 기업 ① 지역 상장사(예: (주)리가켐바이오사이언스) — 준비 상태와 확인할 것 | 기업 | C | ⑦ 지금 경험 ⑧ 부족한 준비 ⑨ 할 수 있는 프로젝트 ⑪ 공식 채용 정보 확인 방법(채용 여부 미확인 표시) | report3.companies · biz-company-guide | `OFFICIAL_DIRECT·SEARCH_ONLY` | `CODE` | R7, R8 | — |
| 46 | 기업 ② 지역 상장사 다른 산업(예: 계룡건설산업) — 사업과 위치 | 기업 | B | ① 사업과 위치 ② 제품·서비스: 공시 개황, ‘사업의 개요’ 원문 인용, 최근 주요 계정 | dart-checks · dart-overview · orgs v2 | `OFFICIAL_DIRECT·SEARCH_ONLY` | `CODE` | R7, R8 | — |
| 47 | 기업 ② 지역 상장사 다른 산업(예: 계룡건설산업) — 일의 체계와 실제 업무 | 기업 | B·C | ③ 사업부문별 인원(공시) ④ 연결 직무 ⑤ 실제 업무(공고에서 본 것과 직무 일반을 가름) ⑥ 학생 검사 연결 | dart-checks.staff · orgs v2.jobs · biz-role-guide · report3 | `OFFICIAL_DIRECT·SEARCH_ONLY` | `CODE` | R7, R8 | — |
| 48 | 기업 ② 지역 상장사 다른 산업(예: 계룡건설산업) — 준비 상태와 확인할 것 | 기업 | C | ⑦ 지금 경험 ⑧ 부족한 준비 ⑨ 할 수 있는 프로젝트 ⑪ 공식 채용 정보 확인 방법(채용 여부 미확인 표시) | report3.companies · biz-company-guide | `OFFICIAL_DIRECT·SEARCH_ONLY` | `CODE` | R7, R8 | — |
| 49 | 기업 ③ 공공기관(예: 한국철도공사) — 사업과 위치 | 기업 | B | ① 사업과 위치 ② 제품·서비스: 공시 개황, ‘사업의 개요’ 원문 인용, 최근 주요 계정 | dart-checks · dart-overview · orgs v2 | `OFFICIAL_DIRECT(개황)·NEEDS_OFFICIAL` | `CODE` | R5, R8 | — |
| 50 | 기업 ③ 공공기관(예: 한국철도공사) — 일의 체계와 실제 업무 | 기업 | B·C | ③ 사업부문별 인원(공시) ④ 연결 직무 ⑤ 실제 업무(공고에서 본 것과 직무 일반을 가름) ⑥ 학생 검사 연결 | dart-checks.staff · orgs v2.jobs · biz-role-guide · report3 | `OFFICIAL_DIRECT(개황)·NEEDS_OFFICIAL` | `CODE` | R5, R8 | — |
| 51 | 기업 ③ 공공기관(예: 한국철도공사) — 준비 상태와 확인할 것 | 기업 | C | ⑦ 지금 경험 ⑧ 부족한 준비 ⑨ 할 수 있는 프로젝트 ⑪ 공식 채용 정보 확인 방법(채용 여부 미확인 표시) | report3.companies · biz-company-guide | `OFFICIAL_DIRECT(개황)·NEEDS_OFFICIAL` | `CODE` | R5, R8 | — |
| 52 | 기업 ④ 비상장 지역기업(예: (주)플랜아이) — 사업과 위치 | 기업 | B | ① 사업과 위치 ② 제품·서비스: 공시 개황, ‘사업의 개요’ 원문 인용, 최근 주요 계정 | dart-checks · dart-overview · orgs v2 | `THIRD_PARTY` | `CODE` | R10, R7, R8 | — |
| 53 | 기업 ④ 비상장 지역기업(예: (주)플랜아이) — 일의 체계와 실제 업무 | 기업 | B·C | ③ 사업부문별 인원(공시) ④ 연결 직무 ⑤ 실제 업무(공고에서 본 것과 직무 일반을 가름) ⑥ 학생 검사 연결 | dart-checks.staff · orgs v2.jobs · biz-role-guide · report3 | `THIRD_PARTY` | `CODE` | R10, R7, R8 | — |
| 54 | 기업 ④ 비상장 지역기업(예: (주)플랜아이) — 준비 상태와 확인할 것 | 기업 | C | ⑦ 지금 경험 ⑧ 부족한 준비 ⑨ 할 수 있는 프로젝트 ⑪ 공식 채용 정보 확인 방법(채용 여부 미확인 표시) | report3.companies · biz-company-guide | `THIRD_PARTY` | `CODE` | R10, R7, R8 | 언제: KODATA 배포 권리 확정 전에는 학생 배포본에 싣지 않는다 |

### 7. 기업별 전략 (10쪽)

| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |
|---|---|---|---|---|---|---|---|---|---|
| 55 | 지원 전략 개관 | 전략 | C | 네 곳 × 시기(3 · 6 · 12개월) — 공식 채용 확인 전에는 ‘미확인’ | report3 · plan | `MEASURED·MIXED` | `CODE` | — | — |
| 56 | 기업 ① 전략 — 서류와 면접에서 쓰는 법 | 전략 | C | ⑩ 자소서 문단 재료 · 포트폴리오 한 건 · 받을 질문(그 회사 장면으로) | report3.companies.jobs · stories | `MEASURED·GENERAL` | `CODE` | — | — |
| 57 | 기업 ① 전략 — 3~12개월 | 전략 | C | ⑫ 3 · 6 · 12개월 할 일, 공식 자료 확인 시점 | plan · companies | `MEASURED·GENERAL` | `CODE` | — | — |
| 58 | 기업 ② 전략 — 서류와 면접에서 쓰는 법 | 전략 | C | ⑩ 자소서 문단 재료 · 포트폴리오 한 건 · 받을 질문(그 회사 장면으로) | report3.companies.jobs · stories | `MEASURED·GENERAL` | `CODE` | — | — |
| 59 | 기업 ② 전략 — 3~12개월 | 전략 | C | ⑫ 3 · 6 · 12개월 할 일, 공식 자료 확인 시점 | plan · companies | `MEASURED·GENERAL` | `CODE` | — | — |
| 60 | 기업 ③ 전략 — 서류와 면접에서 쓰는 법 | 전략 | C | ⑩ 자소서 문단 재료 · 포트폴리오 한 건 · 받을 질문(그 회사 장면으로) | report3.companies.jobs · stories | `MEASURED·GENERAL` | `CODE` | — | — |
| 61 | 기업 ③ 전략 — 3~12개월 | 전략 | C | ⑫ 3 · 6 · 12개월 할 일, 공식 자료 확인 시점 | plan · companies | `MEASURED·GENERAL` | `CODE` | — | — |
| 62 | 기업 ④ 전략 — 서류와 면접에서 쓰는 법 | 전략 | C | ⑩ 자소서 문단 재료 · 포트폴리오 한 건 · 받을 질문(그 회사 장면으로) | report3.companies.jobs · stories | `MEASURED·GENERAL` | `CODE` | — | — |
| 63 | 기업 ④ 전략 — 3~12개월 | 전략 | C | ⑫ 3 · 6 · 12개월 할 일, 공식 자료 확인 시점 | plan · companies | `MEASURED·GENERAL` | `CODE` | — | — |
| 64 | 여러 회사에 함께 쓰는 근거 · 회사마다 갈리는 근거 | 비교표 | C | 공통 근거와 회사별 근거를 가른 표(같은 문단을 회사 이름만 바꿔 쓰지 않게) | report3.companies | `MEASURED` | `CODE` | — | — |

### 8. 자소서·면접·포트폴리오 (9쪽)

| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |
|---|---|---|---|---|---|---|---|---|---|
| 65 | 자기소개서 구성 | 가이드 | C | 네 칸(역할·상황 → 행동 → 판단 → 결과), 수치·기간은 학생이 적는다 | report3.stories | `MEASURED` | `NOW` | — | 재사용: v3 10 |
| 66 | 자기소개서 문단 재료 ① | 워크시트 | C | 근거가 선 영역의 고른 문장을 네 칸에 나눈 것 + 직접 기입 칸 | report3.stories[0] | `MEASURED` | `NOW` | — | 언제: 고른 근거가 있을 때 |
| 67 | 자기소개서 문단 재료 ② | 워크시트 | C | 둘째 경험 | report3.stories[1] | `MEASURED` | `NOW` | — | 언제: 둘째 근거가 있을 때 |
| 68 | 포트폴리오 구성 | 목록 | C | 가진 결과물 / 새로 만들 결과물 | report3.portfolio | `MEASURED` | `NOW` | — | 재사용: v3 10 |
| 69 | 포트폴리오 한 건 설계 | 가이드 | C | 90일 프로젝트를 포트폴리오 한 건으로: 문제 · 판단 · 결과물 · 비교 | plan[90일] · biz-company-guide.project | `GENERAL` | `CODE` | — | — |
| 70 | 면접 질문 ① 확인된 경험에서 | 목록 | C | 응답에서 확인된 장면이 받을 질문과 답의 재료 | report3.interview | `MEASURED` | `NOW` | — | 재사용: v3 10 |
| 71 | 면접 질문 ② 빈자리에서 | 목록 | C | 목표 직무의 빈 판단에서 나올 질문과 준비 방법 | report3.interview(gap) | `MEASURED` | `NOW` | — | — |
| 72 | 면접 질문 ③ 직무·기업 장면에서 | 목록 | C | 목표 직무와 깊게 본 기업의 장면 질문 | biz-role-guide.interview · companies.jobs.interview | `GENERAL` | `CODE` | — | — |
| 73 | 지원 전 점검표 | 점검표 | C | 서류마다 확인할 것(직접 정한 것 · 비교 결과 · 수치 · 공식 공고 대조) | report3 · plan | `MEASURED` | `CODE` | — | — |

### 9. 계획·워크시트·출처 (7쪽)

| 쪽 | 제목 | 유형 | 층 | 담는 것 | 입력(파일·칸) | 검증 | 작성 | 부족 자료 | 언제 · 재사용 |
|---|---|---|---|---|---|---|---|---|---|
| 74 | 실행 로드맵 30 · 60 · 90일 | 계획 | C | 전략 행에서 온 과제 · 기록 · 기업 확인 세 갈래 시간표 | report3.plan · strategy3 | `MEASURED` | `NOW` | — | 재사용: v4 p5 |
| 75 | 6 · 12개월 계획과 다시 검사할 때 | 계획 | C | 6·12개월 할 일, 다시 검사하면 무엇이 달라질 수 있는가 | report3.plan | `MEASURED` | `CODE` | — | — |
| 76 | 워크시트: 경험 기록 빈칸 채우기 | 워크시트 | A·C | 학생의 기록 제목과 빈칸이 미리 채워진 기록지(빈 양식이 아님) | experiences · followups | `STUDENT_RECORD` | `NOW` | — | 언제: 경험 기록이 있을 때 · 없으면 첫 기록 쓰기 한 장 · 재사용: v3 12 |
| 77 | 워크시트: 기업 공식 자료 확인 기록지 | 워크시트 | B·C | 깊게 본 기업 이름 · 공시 접수번호 · 확인할 것 목록이 미리 적힌 기록지 | dart-checks · orgs v2.to_check | `OFFICIAL_DIRECT` | `CODE` | — | — |
| 78 | 근거와 출처 ① 학생 응답 | 출처 | A | 결론마다 어느 응답 · 근거 · 기록에서 왔는가 | gm-trace | `MEASURED` | `NOW` | — | 재사용: v3 13 |
| 79 | 근거와 출처 ② 기업 · 지역 | 출처 | B | 출처 목록 · 확인 수준 5단계 · 확인일 · 콘텐츠 판본 | dart-checks · orgs v2 · region_facts | `MIXED` | `CODE` | — | — |
| 80 | 이 리포트가 하지 않는 것 | 안내 | A·B·C | 점수·순위·합격 가능성·채용 여부를 내지 않음, 판본 표 | version.ts | `GENERAL` | `NOW` | — | 재사용: v3 13 |

## 5. 부족한 조사 자료

| 번호 | 무엇 | 왜 | 어디서 | 상태 | 걸린 쪽 |
|---|---|---|---|---|---|
| R1 | 배재대 경영학과 공식 교육과정표·전공 트랙(2026·2027) | 수업 과제와 직무를 잇는 칸. 확인되지 않은 과목 이름을 만들지 않는다 | pcu.ac.kr 학과 쪽 · 학과 요람 | `BLOCKED_NETWORK` | 34 |
| R2 | 대전·세종·충남·충북 산업별 사업체·종사자 수(전국사업체조사) | 지역 산업 구조를 공식 통계로 적기 위해 | KOSIS | `BLOCKED_NETWORK` | 35 |
| R3 | 경제활동별 지역내총생산(GRDP) | 보도 인용(유성구 33.2% 등)을 공식 통계로 바꾸기 위해 | KOSIS 지역계정 | `BLOCKED_NETWORK` | 35 |
| R4 | 지역 구인 직종·신입 채용 통계 | 지역 일자리 현실 쪽 | 고용24 고용행정통계 | `BLOCKED_NETWORK` | 40 |
| R5 | 세종·대전 공공기관 목록과 채용 방식(NCS 블라인드 등) | 공공기관 쪽과 기업 ③ | ALIO · 기관 채용 쪽 | `BLOCKED_NETWORK` | 38, 49, 50, 51 |
| R6 | 대전시 전략산업 공식 정책 문서 | 산업 구조도의 첫 칸(지금은 보도 인용) | 대전광역시 누리집 | `BLOCKED_NETWORK` | 36 |
| R7 | 기업 공식 홈페이지의 조직·직무 소개 | 일의 체계 쪽(공시 사업부문 인원 다음 단계) | 각 기업 누리집 | `BLOCKED_NETWORK` | 44, 47, 50, 53 |
| R8 | 공식 채용 공고 원문 | 공고에서 본 직무를 확인하기 위해. 채용 여부는 그래도 단정하지 않는다 | 기업 채용 쪽 · 잡알리오 | `BLOCKED_NETWORK` | 40, 45, 48, 51, 54 |
| R10 | KODATA 기업정보의 학생 배포 권리 | 비상장 기업 쪽은 KODATA 외 근거가 없다 | 계약(사업주) | `PENDING_RIGHTS` | 52, 53, 54 |
| R12 | 경영 직무 가이드 전문가 검토 | biz-role-guide 는 PREVIEW · 직무 일반이다. 실무 가이드 본문의 정확성 | 현직자·교수 검토 | `PENDING_REVIEW` | 25, 26, 27, 28, 29, 30, 33, 34 |
| R13 | NCS 경영 직무 정의 대조 | 직무 지도를 공공 표준과 맞춰 보기 위해 | ncs.go.kr | `BLOCKED_NETWORK` | 25 |
| R14 | 실무 가이드 ②③ 본문(사업보고서·재무제표 읽는 법) | 공시 자료는 받았다. 읽는 순서 네 단계는 이 회차의 초안이고 현직자·교수 검토 전이다 | R12 와 함께 검토 | `DRAFT_UNREVIEWED` | 28, 29 |
