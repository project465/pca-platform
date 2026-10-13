# 배재대 전체 전공 검사 가능 계획 (2026-10-13)

학생 화면에 서는 **모든** 선택 자리가 검사로 이어지게 하는 일의 설계다.
Source of Truth 는 지금 등록부(`campus-universities.json`)이고, **학과
이름을 새로 지어내지 않는다.**

- 선택 자리 **117**(재학생 Catalog 57 · 2027 Catalog 60)
- 서로 다른 이름 **69**(두 Catalog 에 같은 이름이 서는 자리가 많다)
- 전부 `student_visible`

---

## 1. 분류

| 분류 | 뜻 | 자리 |
|---|---|---|
| **A. EXISTING_CORE** | 이미 쓴 Core 로 바로 이어진다 | **24** |
| **B. SPECIALIZATION_ONLY** | 이미 쓴 Core 에 갈래만 더하면 된다 | **18** |
| **C. NEW_CORE_REQUIRED** | 새 Canonical Core 가 필요하다 | **73** |
| **D. ROUTING_MAJOR** | 아직 전공이 정해지지 않은 자리 | **2** |

**B 는 2026-10-13 에 닫혔다**(`docs/metri/PCU_PHASE1_SPECIALIZATION.md`).
처음 적을 때 B 를 17 로 세었는데 자리마다 다시 세니 **열여덟**이다:
Core 별로는 EE 넷 · CS 둘 · BIZ 열둘이고, 합이 42 = A 24 + B 18 이다.
지금 `자료가 다 선 자리` 가 **42 / 117** 이다.

**D 에 가짜 Core 를 만들지 않는다.** 자율전공학부(재학생·2027 각 하나)는
전공 탐색 route 로 보내고, 전공이 정해지면 그 Core 로 이어진다.

---

## 2. Canonical Core 스무 개

**학과 수만큼 Core 를 만들지 않는다.** 69개 이름이 **20개 Core** 로
들어가고, 그 가운데 넷은 이미 있다.

| # | Core | 이름 | 자리 | 갈래 | 상태 |
|---|---|---|---|---|---|
| 1 | `BIZ_CORE_V1` | 경영 | 23 | GENERAL · MIS · GLOBAL · TOURISM · HOTEL_AIR · AIR_SERVICE **+ LOCAL_SME · REALESTATE · SPORTS_MKT · CULTURE_BIZ** | **있음** |
| 2 | `CS_CORE_V1` | 컴퓨터·소프트웨어 | 12 | COMPUTER · SOFTWARE · SECURITY · GAME · AI **+ GLOBAL_IT** | **있음** |
| 3 | `EE_CORE_V1` | 전기전자공학 | 7 | POWER · ELEC **+ BATTERY · ROBOT** | **있음** |
| 4 | `ME_CORE_V3` | 기계공학 | 0 | — | **있음**(배재대 자리 없음) |
| 5 | `LANG_CORE_V1` | 언어·문화 | 9 | KOREAN · JAPAN · TRANSLATION · HUMAN_ARTS | 새로 |
| 6 | `LAW_CORE_V1` | 법·공공안전 | 4 | POLICE · LAW | 새로 |
| 7 | `PUBADM_CORE_V1` | 행정 | 4 | GENERAL_ADMIN · FIRE_ADMIN | 새로 |
| 8 | `PSY_CORE_V1` | 상담심리 | 3 | COUNSELING · SOCIAL_WELFARE | 새로 |
| 9 | `EDU_CORE_V1` | 교육 | 2 | EARLY_CHILDHOOD | 새로 |
| 10 | `BT_CORE_V1` | 생명공학 | 2 | BIOTECH | 새로 |
| 11 | `AGRI_CORE_V1` | 원예·산림 | 3 | HORTICULTURE · AGRI_BIZ | 새로 |
| 12 | `FOOD_CORE_V1` | 식품·영양·조리 | 5 | NUTRITION · CULINARY · FOODTECH | 새로 |
| 13 | `HEALTH_CORE_V1` | 보건·복지 | 3 | HEALTH_WELFARE · LIFE_CARE | 새로 |
| 14 | `NURSING_CORE_V1` | 간호 | 2 | NURSING | 새로 |
| 15 | `SPORTS_CORE_V1` | 운동·재활 | 7 | REHAB · COACHING · SENIOR | 새로 |
| 16 | `ARCH_CORE_V1` | 건축·공간 | 6 | ARCHITECTURE · INTERIOR · LANDSCAPE | 새로 |
| 17 | `VISUAL_CORE_V1` | 디자인·시각 | 8 | COMMUNICATION · INDUSTRIAL · WEBTOON · GAME_ANIM | 새로 |
| 18 | `MEDIA_CORE_V1` | 미디어·콘텐츠 | 8 | AD_PHOTO · CONTENT · FILM · MUSIC | 새로 |
| 19 | `STYLE_CORE_V1` | 뷰티·패션 | 8 | FASHION · BEAUTY · STYLING · BEAUTY_BIZ | 새로 |
| 20 | `CIV_CORE_V1` | 토목·인프라 | 2 | RAIL · CIVIL | 새로 |

**새로 쓸 Core 는 열여섯**이고 자리 합은 117(ROUTING 2 포함)이다.

### 묶은 자리와 그 까닭

- **드론로봇 → `EE_CORE_V1` 의 `SPEC_EE_ROBOT`**(§7). 구동과 센서와 제어와
  전원이 전기전자 영역 안에 이미 있다. **판단 Domain 자체가 다르다는 것이
  전공자 검토에서 확인되면** 그때 `ROBOT_CORE` 를 만든다.
- **스마트배터리 → `SPEC_EE_BATTERY`**(§7). 셀·모듈·충방전·보호회로가
  전력전자와 에너지 영역 안이다.
- **실용음악과 영화영상 → `MEDIA_CORE_V1` 의 갈래**. 기획 → 제작 → 편집 →
  검토 → 배포라는 판단 차례가 같다. 공연 전용 Core 를 따로 두면 자리
  둘짜리 Core 가 하나 더 생긴다.
- **아트앤웹툰·게임애니메이션 → `VISUAL_CORE_V1`**(디자인과 한 Core).
  요구 해석 → 시안 → 제작 → 검토 → 산출물이 같고, 갈리는 것은 산출물의
  종류다. 사업주 안의 `DESIGN_CORE` 와 `ART_ANIMATION_CORE` 를 하나로 묶은
  자리이고, **갈라야 한다는 판단이 서면 갈래를 Core 로 올린다.**
- **스포츠마케팅 → `BIZ_CORE_V1` 의 갈래**(§8). 묻는 것이 고객·채널·가격·
  성과라 경영 영역 안이다. **건강재활은 `SPORTS_CORE_V1` 이 든다.**
- **지역소상공·부동산재테크·농산업비즈니스·아트컬처/K컬처 → `BIZ_CORE_V1`**.
  판단 단위가 사업 기획과 원가와 고객이다.
- **국제의료관광 → `BIZ_CORE_V1` 의 `TOURISM`**. 이미 있는 갈래다.
- **직무한국어번역·인문예술창작 → `LANG_CORE_V1`**. 텍스트 해석과 표현과
  근거 구성이 같은 자리다.
- **원예산림을 `BT_CORE_V1` 에 넣지 않는다.** 실험실에서 재는 일과 현장에서
  기르는 일은 **보는 것과 남기는 것이 다르다.** 자리가 셋뿐이어도 따로 둔다.

### 금지한 묶음

- 철도건설을 전기전자에 붙이지 않는다(§7). 구조·토질·시공·공정·안전이
  전기전자 영역에 한 자리도 없다.
- 간호를 보건·복지에 붙이지 않는다(§6). 관찰과 우선순위와 기록과 안전이
  그 전공의 판단 단위이고, 복지 행정과 다르다.

---

## 3. 검사가 아닌 것 (Core 마다 적어 둔다)

| Core | **되지 않게 할 것** | 실제로 묻는 것 |
|---|---|---|
| LANG | 어학 능력 시험 | 텍스트 해석 · 문화 비교 · 자료 조사 · 글쓰기 · 교육/콘텐츠 변환 · 근거 구성 |
| LAW | 법률 지식 시험 | 사실관계 정리 · 규정 적용 · 쟁점 구분 · 근거 확인 · 절차 판단 · 문서화 |
| PSY | 성격 검사 | 관찰 · 질문 · 기록 · 자료 해석 · 상담 구조 · 개입 계획 · 사례 검토 · 윤리 판단 |
| EDU | 교사 적성 검사 | 수업 계획 · 학습자 관찰 · 활동 설계 · 평가 · 피드백 · 기록 · 소통 |
| NURSING | 의학 지식 시험 | 관찰 · 우선순위 · 기록 · 안전 · 의사소통 · 절차 수행 · 변화 확인 |
| SPORTS | 스포츠 선호 검사 | 상태 확인 · 프로그램 설계 · 수행 · 기록 · 변화 비교 · 안전 판단 |
| FOOD | 요리 선호 검사 | 메뉴 · 조리공정 · 원가 · 위생 · 품질 · 운영 · 서비스 |
| VISUAL · MEDIA · STYLE | 감각·취향 검사 | 요구 해석 · 표현 결정 · 제작 · 검토 · 산출물 · 배포 |

---

## 4. 만드는 차례 (§22)

1. **EE · CS · BIZ 공개 준비** ← 지금 하는 자리
2. PUBADM · 3. BT · 4. LANG · 5. LAW · 6. PSY · 7. EDU · 8. FOOD ·
9. AGRI · 10. HEALTH · 11. NURSING · 12. SPORTS · 13. ARCH ·
14. VISUAL · 15. MEDIA · 16. STYLE · 17. CIV

Core 하나가 끝나면 **그 자리에서 등록부에 연결하고** QA 와 PDF 를 돌린다.
한 Core 의 분량은 영역 11~12 · 문항 340~360 · 체크리스트 200~220 ·
산업팩 7~8 · 역할팩 8 · 사람 열두 벌이고, 앞 넷(ME·EE·CS·BIZ)이 그
분량이었다.

---

## 5. 공통 엔진 규칙

데이터만 더해서 돈다. 새 전공 하나 때문에 채점·결과 모델·Workspace·PDF
엔진·DB 를 고치지 않는다. **고쳐야 하면 그 Core 제작을 멈추고 보고한다.**

지금까지 공통 층에 손댄 자리는 둘이고 둘 다 전공 하나 때문이 아니다.

- `result/chains.ts` 에 Core 마다 영역 차례를 **더한다**(자료 표).
- 전공 이름을 화면에 적던 자리를 **등록부에서 읽게 바꿨다**(이번 회차).

---

## 6. 상태 말 (§17)

`ASSESSMENT_READY` 와 `VALIDATED` 를 가른다. 이번 목표는 앞엣것이고,
학술적 신뢰도·타당도 검증은 따로다. **`검증된 심리검사`·`적성검사`·
`직무 적합도 검사` 라는 말을 쓰지 않는다.**
