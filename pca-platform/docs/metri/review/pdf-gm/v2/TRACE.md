# Evidence → 직무 → 기업 → 준비 연결 검증표 (BIZ GM v2)

세 사례의 `var/pdf-gm/<사례>.r2.json` 에서 만든다. 줄마다 보고서의 주장이 어느 입력에서 왔는지 적는다. DB 는 바꾸지 않았다.

## RICH (응시 462)

### 심층 분석 기업

| 기업 | 연결 근거 | 직무(확인 상태) | 지금 가진 근거 | 추가로 필요한 것 | 1개월 → 2~3개월 → 4~6개월 |
|---|---|---|---|---|---|
| (주)리가켐바이오사이언스 | GOAL_INDUSTRY · GOAL_ROLE · EVIDENCE | 경영기획(채용 공고에서 본 직무) | 여러 안 가운데 하나를 근거를 들어 골랐다 · 목표와 지표 표 · 분석 방법을 골라 적용했다 | 이 직무가 요구하는 판단은 응답에서 확인됐습니다. 남은 것은 그 판단을 신약 기술이전(바이오) 쪽 사례 하나에 대어 설명하는 일입니다 | (주)리가켐바이오사이언스의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, 경영기획 쪽 공고 이력을 찾아본다 → 확인된 경험 하나를 경영기획의 일에 대어 다시 정리한다 → 현장실습·공모전·학회 가운데 하나에서 신약 기술이전(바이오) 쪽 문제를 다뤄 본다 |
| (주)플랜아이 | GOAL_ROLE · DIRECTION · EVIDENCE | 경영기획(채용 공고에서 본 직무) · 마케팅(채용 공고에서 본 직무) | 여러 안 가운데 하나를 근거를 들어 골랐다 · 목표와 지표 표 · 분석 방법을 골라 적용했다 | 이 직무가 요구하는 판단은 응답에서 확인됐습니다. 남은 것은 그 판단을 공공기관 대상 소프트웨어 구축·운영 쪽 사례 하나에 대어 설명하는 일입니다 | (주)플랜아이의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, 경영기획 쪽 공고 이력을 찾아본다 → 확인된 경험 하나를 경영기획의 일에 대어 다시 정리한다 → 현장실습·공모전·학회 가운데 하나에서 공공기관 대상 소프트웨어 구축·운영 쪽 문제를 다뤄 본다 |
| (주)엠티지 | GOAL_INDUSTRY · GOAL_ROLE · EVIDENCE | 경영기획(채용 공고에서 본 직무) | 여러 안 가운데 하나를 근거를 들어 골랐다 · 목표와 지표 표 · 분석 방법을 골라 적용했다 | 이 직무가 요구하는 판단은 응답에서 확인됐습니다. 남은 것은 그 판단을 방산 안테나·전파 측정 장비 제조 쪽 사례 하나에 대어 설명하는 일입니다 | (주)엠티지의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, 경영기획 쪽 공고 이력을 찾아본다 → 확인된 경험 하나를 경영기획의 일에 대어 다시 정리한다 → 현장실습·공모전·학회 가운데 하나에서 방산 안테나·전파 측정 장비 제조 쪽 문제를 다뤄 본다 |

### 주장 → 출처

| 장 | 주장 | 입력 |
|---|---|---|
| A 종합 의견 | 근거가 단단한 영역 | domains[경영전략·기획].zone=Z1 · domains[데이터·의사결정].zone=Z1 · domains[TD01].decided · domains[TD01].artifacts |
| A 종합 의견 | 우선순위 1 데이터·의사결정/기준·배분 직접 결정 | gaps[rank] · targets.goal.role · role.required_axes |
| A 종합 의견 | 방향 경영기획 준비 현황 | targets.goal.role · role.required_axes × domains.axes |
| 기업·직무 탐색 분석 | (주)리가켐바이오사이언스 심층 | GOAL_INDUSTRY · GOAL_ROLE · EVIDENCE |
| 기업·직무 탐색 분석 | (주)플랜아이 심층 | GOAL_ROLE · DIRECTION · EVIDENCE |
| 기업·직무 탐색 분석 | (주)엠티지 심층 | GOAL_INDUSTRY · GOAL_ROLE · EVIDENCE |
| 역량 개발 우선순위 | 1. 데이터·의사결정/기준·배분 직접 결정 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 2. 마케팅·시장/실적·대안과 비교 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 3. 경영전략·기획/목표를 지표·조건으로 옮기기 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 4. 데이터·의사결정/과제 범위 정하기 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 강점 활용 전략 | 경영전략·기획 | domains[TD01].zone=Z1_EVIDENCE_ESTABLISHED · domains[TD01].decided · domains[TD01].artifacts |
| 강점 활용 전략 | 데이터·의사결정 | domains[TD08].zone=Z1_EVIDENCE_ESTABLISHED · domains[TD08].decided · domains[TD08].artifacts |
| 강점 활용 전략 | 마케팅·시장 | domains[TD02].zone=Z2_EVIDENCE_INCOMPLETE · domains[TD02].decided · domains[TD02].artifacts |
| 진로 탐색 방향 | 경영기획 근거 있음 | role.core_ref.td × domains.zone · role.required_axes × axes |
| 진로 탐색 방향 | 데이터·분석 근거 있음 | role.core_ref.td × domains.zone · role.required_axes × axes |
| 진로 탐색 방향 | 마케팅 근거 있음 | role.core_ref.td × domains.zone · role.required_axes × axes |
| 검사×경험 교차 | 경영전략·기획 BOTH | domains[TD01] · v3_experiences.td_codes |
| 검사×경험 교차 | 마케팅·시장 TEST_ONLY | domains[TD02] · v3_experiences.td_codes |
| 검사×경험 교차 | 회계·원가 RECORD_ONLY | domains[TD05] · v3_experiences.td_codes |
| 검사×경험 교차 | 데이터·의사결정 BOTH | domains[TD08] · v3_experiences.td_codes |
| 실행 계획 | 30일 다음 데이터·의사결정 과제 하나. 기준이 되는 값을 직 | priorities · explore.deep · experiences |
| 실행 계획 | 30일 (주)리가켐바이오사이언스 공식 홈페이지와 공시에서 사업 | priorities · explore.deep · experiences |
| 실행 계획 | 60일 다음 마케팅·시장 과제 하나. 낸 결과를 지난 캠페인  | priorities · explore.deep · experiences |
| 실행 계획 | 60일 적어 둔 경험 2건의 빈칸(결과를 무엇과 견줬는지)을  | priorities · explore.deep · experiences |
| 실행 계획 | 90일 최근 경영전략·기획 과제 하나. 받은 요구가 어떤 조건 | priorities · explore.deep · experiences |
| 실행 계획 | 90일 경영전략·기획 경험을 부록 워크시트에 옮겨 지원서 문단 | priorities · explore.deep · experiences |
| 실행 계획 | 6개월 현장실습·공모전·학회 가운데 하나에서 신약 기술이전(바 | priorities · explore.deep · experiences |
| 실행 계획 | 6개월 결과물 6개를 골라 한 묶음의 포트폴리오로 정리 | priorities · explore.deep · experiences |
| 실행 계획 | 12개월 경영기획과 데이터·분석 가운데 어느 쪽으로 지원할지 정 | priorities · explore.deep · experiences |
| 실행 계획 | 12개월 CareerMatri 검사를 다시 보고 이번 결과와 견 | priorities · explore.deep · experiences |

## POOR (응시 463)

### 심층 분석 기업

| 기업 | 연결 근거 | 직무(확인 상태) | 지금 가진 근거 | 추가로 필요한 것 | 1개월 → 2~3개월 → 4~6개월 |
|---|---|---|---|---|---|
| (주)플랜아이 | GOAL_ROLE | 마케팅(채용 공고에서 본 직무) | 이 직무와 이어지는 영역에서 확인된 판단이 아직 없습니다 | 기준·배분 직접 결정 · 실적·대안과 비교 — 마케팅·시장 · 데이터·의사결정 쪽에서 아직 확인되지 않음 | (주)플랜아이의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, 마케팅 쪽 공고 이력을 찾아본다 → ‘기준·배분 직접 결정 · 실적·대안과 비교’를 다음 수업 과제에서 맡아 본다 → 현장실습·공모전·학회 가운데 하나에서 공공기관 대상 소프트웨어 구축·운영 쪽 문제를 다뤄 본다 |
| 라미랩(주) | GOAL_ROLE | 마케팅(채용 공고에서 본 직무) | 이 직무와 이어지는 영역에서 확인된 판단이 아직 없습니다 | 기준·배분 직접 결정 · 실적·대안과 비교 — 마케팅·시장 · 데이터·의사결정 쪽에서 아직 확인되지 않음 | 라미랩(주)의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, 마케팅 쪽 공고 이력을 찾아본다 → ‘기준·배분 직접 결정 · 실적·대안과 비교’를 다음 수업 과제에서 맡아 본다 → 현장실습·공모전·학회 가운데 하나에서 공공 재난·공간정보 소프트웨어 쪽 문제를 다뤄 본다 |
| (주)제이오텍 | GOAL_ROLE | 마케팅(산업 일반 예시) | 이 직무와 이어지는 영역에서 확인된 판단이 아직 없습니다 | 기준·배분 직접 결정 · 실적·대안과 비교 — 마케팅·시장 · 데이터·의사결정 쪽에서 아직 확인되지 않음 | (주)제이오텍의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, 마케팅 쪽 공고 이력을 찾아본다 → ‘기준·배분 직접 결정 · 실적·대안과 비교’를 다음 수업 과제에서 맡아 본다 → 현장실습·공모전·학회 가운데 하나에서 실험·시험장비 제조와 공공조달 쪽 문제를 다뤄 본다 |

### 주장 → 출처

| 장 | 주장 | 입력 |
|---|---|---|
| A 종합 의견 | 관심은 높고 근거가 적은 영역 | domains[마케팅·시장].zone=Z4 · domains[고객·서비스 운영].zone=Z4 · domains[수요·예약·가격 관리].zone=Z4 |
| A 종합 의견 | 우선순위 1 고객·서비스 운영/기준·배분 직접 결정 | gaps[rank] · targets.goal.role · role.required_axes |
| A 종합 의견 | 방향 마케팅 준비 현황 | targets.goal.role · role.required_axes × domains.axes |
| 기업·직무 탐색 분석 | (주)플랜아이 심층 | GOAL_ROLE |
| 기업·직무 탐색 분석 | 라미랩(주) 심층 | GOAL_ROLE |
| 기업·직무 탐색 분석 | (주)제이오텍 심층 | GOAL_ROLE |
| 역량 개발 우선순위 | 1. 고객·서비스 운영/기준·배분 직접 결정 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 2. 마케팅·시장/실적·대안과 비교 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 3. 마케팅·시장/기준·배분 직접 결정 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 4. 수요·예약·가격 관리/기준·배분 직접 결정 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 5. 고객·서비스 운영/실적·대안과 비교 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 6. 고객·서비스 운영/원인 파악과 수정 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 진로 탐색 방향 | 마케팅 아직 적음 | role.core_ref.td × domains.zone · role.required_axes × axes |
| 진로 탐색 방향 | 데이터·분석 아직 적음 | role.core_ref.td × domains.zone · role.required_axes × axes |
| 진로 탐색 방향 | 서비스·고객운영 아직 적음 | role.core_ref.td × domains.zone · role.required_axes × axes |
| 실행 계획 | 30일 다음 고객·서비스 운영 과제 하나. 기준이 되는 값을  | priorities · explore.deep · experiences |
| 실행 계획 | 30일 (주)플랜아이 공식 홈페이지와 공시에서 사업·조직·채용 | priorities · explore.deep · experiences |
| 실행 계획 | 60일 다음 마케팅·시장 과제 하나. 낸 결과를 지난 캠페인  | priorities · explore.deep · experiences |
| 실행 계획 | 60일 적어 둔 경험 1건의 빈칸(남은 결과물)을 채워 경험  | priorities · explore.deep · experiences |
| 실행 계획 | 90일 다음 마케팅·시장 과제 하나. 기준이 되는 값을 직접  | priorities · explore.deep · experiences |
| 실행 계획 | 90일 새로 해 본 경험을 워크시트에 옮겨 문단 하나로 정리 | priorities · explore.deep · experiences |
| 실행 계획 | 6개월 현장실습·공모전·학회 가운데 하나에서 공공기관 대상 소 | priorities · explore.deep · experiences |
| 실행 계획 | 6개월 결과물 2개를 골라 한 묶음의 포트폴리오로 정리 | priorities · explore.deep · experiences |
| 실행 계획 | 12개월 마케팅과 데이터·분석 가운데 어느 쪽으로 지원할지 정하 | priorities · explore.deep · experiences |
| 실행 계획 | 12개월 CareerMatri 검사를 다시 보고 이번 결과와 견 | priorities · explore.deep · experiences |

## CONTRA (응시 464)

### 심층 분석 기업

| 기업 | 연결 근거 | 직무(확인 상태) | 지금 가진 근거 | 추가로 필요한 것 | 1개월 → 2~3개월 → 4~6개월 |
|---|---|---|---|---|---|
| (주)플랜아이 | GOAL_INDUSTRY · DIRECTION · EVIDENCE | 영업·사업개발(채용 공고에서 본 직무) · 마케팅(채용 공고에서 본 직무) | 응답으로 확인: 기준·배분 직접 결정 · 문서·결과물 작성 · 실적·대안과 비교 — 영업·사업개발에서 직접 해 봤다고 답함 (고른 근거 항목은 없음) | 이 직무가 요구하는 판단은 응답에서 확인됐습니다. 남은 것은 그 판단을 공공기관 대상 소프트웨어 구축·운영 쪽 사례 하나에 대어 설명하는 일입니다 | (주)플랜아이의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, 영업·사업개발 쪽 공고 이력을 찾아본다 → 확인된 경험 하나를 영업·사업개발의 일에 대어 다시 정리한다 → 현장실습·공모전·학회 가운데 하나에서 공공기관 대상 소프트웨어 구축·운영 쪽 문제를 다뤄 본다 |
| 라미랩(주) | GOAL_INDUSTRY · DIRECTION · EVIDENCE | 마케팅(채용 공고에서 본 직무) · 영업·사업개발(산업 일반 예시) | 응답으로 확인: 기준·배분 직접 결정 · 실적·대안과 비교 · 문서·결과물 작성 — 마케팅·시장에서 직접 해 봤다고 답함 (고른 근거 항목은 없음) | 이 직무가 요구하는 판단은 응답에서 확인됐습니다. 남은 것은 그 판단을 공공 재난·공간정보 소프트웨어 쪽 사례 하나에 대어 설명하는 일입니다 | 라미랩(주)의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, 마케팅 쪽 공고 이력을 찾아본다 → 확인된 경험 하나를 마케팅의 일에 대어 다시 정리한다 → 현장실습·공모전·학회 가운데 하나에서 공공 재난·공간정보 소프트웨어 쪽 문제를 다뤄 본다 |
| (주)엠티지 | GOAL_ROLE | 인사(채용 공고에서 본 직무) | 이 직무와 이어지는 영역에서 확인된 판단이 아직 없습니다 | 목표를 지표·조건으로 옮기기 · 기준·배분 직접 결정 — 인사·조직 · 운영·프로세스 쪽에서 아직 확인되지 않음 | (주)엠티지의 공식 홈페이지·공시에서 사업과 조직을 직접 확인하고, 인사 쪽 공고 이력을 찾아본다 → ‘목표를 지표·조건으로 옮기기 · 기준·배분 직접 결정’를 다음 수업 과제에서 맡아 본다 → 현장실습·공모전·학회 가운데 하나에서 방산 안테나·전파 측정 장비 제조 쪽 문제를 다뤄 본다 |

### 주장 → 출처

| 장 | 주장 | 입력 |
|---|---|---|
| A 종합 의견 | 해 봤지만 근거가 빈 영역 | domains[마케팅·시장].zone · domains[영업·사업개발].zone · domains[회계·원가].zone · domains[고객·서비스 운영].zone |
| A 종합 의견 | 우선순위 1 고객·서비스 운영/기준·배분 직접 결정 | gaps[rank] · targets.goal.role · role.required_axes |
| A 종합 의견 | 방향 인사 준비 현황 | targets.goal.role · role.required_axes × domains.axes |
| 기업·직무 탐색 분석 | (주)플랜아이 심층 | GOAL_INDUSTRY · DIRECTION · EVIDENCE |
| 기업·직무 탐색 분석 | 라미랩(주) 심층 | GOAL_INDUSTRY · DIRECTION · EVIDENCE |
| 기업·직무 탐색 분석 | (주)엠티지 심층 | GOAL_ROLE |
| 역량 개발 우선순위 | 1. 고객·서비스 운영/기준·배분 직접 결정 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 2. 영업·사업개발/문서·결과물 작성 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 3. 회계·원가/문서·결과물 작성 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 4. 고객·서비스 운영/원인 파악과 수정 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 5. 고객·서비스 운영/문서·결과물 작성 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 역량 개발 우선순위 | 6. 마케팅·시장/문서·결과물 작성 | gaps · actions · role.required_axes · industry.judgement_dimensions |
| 강점 활용 전략 | 고객·서비스 운영 | domains[TD09].zone=Z2_EVIDENCE_INCOMPLETE · domains[TD09].decided · domains[TD09].artifacts |
| 강점 활용 전략 | 마케팅·시장 | domains[TD02].zone=Z3_EVIDENCE_LOW_INTEREST · domains[TD02].decided · domains[TD02].artifacts |
| 강점 활용 전략 | 영업·사업개발 | domains[TD03].zone=Z3_EVIDENCE_LOW_INTEREST · domains[TD03].decided · domains[TD03].artifacts |
| 진로 탐색 방향 | 인사 아직 적음 | role.core_ref.td × domains.zone · role.required_axes × axes |
| 진로 탐색 방향 | 영업·사업개발 근거 있음 | role.core_ref.td × domains.zone · role.required_axes × axes |
| 진로 탐색 방향 | 마케팅 근거 있음 | role.core_ref.td × domains.zone · role.required_axes × axes |
| 검사×경험 교차 | 마케팅·시장 CHECK | domains[TD02] · v3_experiences.td_codes |
| 검사×경험 교차 | 영업·사업개발 CHECK | domains[TD03] · v3_experiences.td_codes |
| 검사×경험 교차 | 회계·원가 CHECK | domains[TD05] · v3_experiences.td_codes |
| 검사×경험 교차 | 인사·조직 CONFLICT | domains[TD06] · v3_experiences.td_codes |
| 검사×경험 교차 | 고객·서비스 운영 BOTH | domains[TD09] · v3_experiences.td_codes |
| 실행 계획 | 30일 최근 고객·서비스 운영 과제 하나. 어디까지 그 자리에 | priorities · explore.deep · experiences |
| 실행 계획 | 30일 (주)플랜아이 공식 홈페이지와 공시에서 사업·조직·채용 | priorities · explore.deep · experiences |
| 실행 계획 | 60일 다음 영업·사업개발 과제 하나. 끝까지 가서 제안서나  | priorities · explore.deep · experiences |
| 실행 계획 | 60일 적어 둔 경험 1건의 빈칸(결과를 무엇과 견줬는지)을  | priorities · explore.deep · experiences |
| 실행 계획 | 90일 다음 회계·원가 과제 하나. 끝까지 가서 결산 자료나  | priorities · explore.deep · experiences |
| 실행 계획 | 90일 고객·서비스 운영 경험을 부록 워크시트에 옮겨 지원서  | priorities · explore.deep · experiences |
| 실행 계획 | 6개월 현장실습·공모전·학회 가운데 하나에서 공공기관 대상 소 | priorities · explore.deep · experiences |
| 실행 계획 | 6개월 결과물 2개를 골라 한 묶음의 포트폴리오로 정리 | priorities · explore.deep · experiences |
| 실행 계획 | 12개월 인사과 영업·사업개발 가운데 어느 쪽으로 지원할지 정하 | priorities · explore.deep · experiences |
| 실행 계획 | 12개월 CareerMatri 검사를 다시 보고 이번 결과와 견 | priorities · explore.deep · experiences |
