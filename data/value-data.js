/* 전공지식 → 조직 성과 번역에 쓰는 참조 자료.
   content/me-knowledge.json · me-tools.json · me-value-paths.json ·
   org-types.json 에서 만든다. 화면은 fetch 를 쓰지 않으므로 같은 내용을
   전역에 담아 둔다. **고칠 곳은 json 쪽이고 이 파일은 손대지 않는다**
   (scripts/build-value-data.mjs 가 다시 만든다). */
window.PCA_KNOWLEDGE = {
 "schema_version": "1.0",
 "major_id": "ME",
 "note": "전공지식 28갈래. **과목을 들었다는 것은 학문 노출(academic_exposure)이고 역량이 아니다.** 여기 적힌 work·decisions·outputs·performance 는 그 지식이 실제 업무에서 쓰이는 자리이지, 수강생이 그것을 할 수 있다는 뜻이 아니다. 응시자의 증거가 걸릴 때만 그 자리를 켠다. aliases 는 수강과목 입력과 맞춰 보는 말이고, 한 과목이 여러 갈래에 걸릴 수 있다.",
 "domains": [
  {
   "id": "statics",
   "name_ko": "정역학",
   "aliases": [
    "정역학",
    "statics",
    "공업역학",
    "응용역학"
   ],
   "work": [
    "하중 경로를 따라가며 힘이 어디로 가는지 보는 일",
    "지지 조건과 반력을 세우는 일",
    "구조 개념안을 거르는 일"
   ],
   "decisions": [
    "하중 가정",
    "지지 방식",
    "단면과 부재 배치"
   ],
   "outputs": [
    "하중 조건표",
    "개념 설계안",
    "설계 계산서"
   ],
   "performance": [
    "강도",
    "안전율",
    "무게"
   ],
   "families": [
    "ME_DESIGN_PRODUCT",
    "ME_CAE_SIM",
    "ME_MATERIALS",
    "ME_TEST_VV"
   ]
  },
  {
   "id": "dynamics",
   "name_ko": "동역학",
   "aliases": [
    "동역학",
    "dynamics",
    "기구학",
    "kinematics",
    "메커니즘"
   ],
   "work": [
    "움직이는 부분의 속도와 가속도를 보는 일",
    "링크와 기구를 설계하는 일",
    "관성 하중을 따지는 일"
   ],
   "decisions": [
    "기구 방식",
    "구동 조건",
    "관성 하중 가정"
   ],
   "outputs": [
    "운동 해석 결과",
    "기구 설계안",
    "구동 사양"
   ],
   "performance": [
    "동작 정밀도",
    "속도",
    "내구"
   ],
   "families": [
    "ME_DESIGN_PRODUCT",
    "ME_AUTOMATION",
    "ME_CAE_SIM"
   ]
  },
  {
   "id": "solid_mechanics",
   "name_ko": "재료역학",
   "aliases": [
    "재료역학",
    "고체역학",
    "mechanics of materials",
    "solid mechanics",
    "강도학"
   ],
   "work": [
    "응력과 변형을 계산하는 일",
    "하중을 고려한 구조 설계",
    "파손 원인을 되짚는 일",
    "설계 검토"
   ],
   "decisions": [
    "두께",
    "형상",
    "재질",
    "안전 여유",
    "보강 위치",
    "하중 가정"
   ],
   "outputs": [
    "설계 계산서",
    "해석 결과",
    "도면 개정",
    "시험 계획",
    "기술 보고서"
   ],
   "performance": [
    "강도",
    "강성",
    "무게",
    "안전",
    "신뢰성",
    "제조 가능성"
   ],
   "families": [
    "ME_DESIGN_PRODUCT",
    "ME_CAE_SIM",
    "ME_MATERIALS",
    "ME_TEST_VV",
    "ME_QUALITY_RELIABILITY"
   ]
  },
  {
   "id": "thermodynamics",
   "name_ko": "열역학",
   "aliases": [
    "열역학",
    "thermodynamics",
    "응용열역학"
   ],
   "work": [
    "에너지 수지를 맞추는 일",
    "사이클을 해석하는 일",
    "효율을 따지는 일",
    "에너지 시스템 설계"
   ],
   "decisions": [
    "운전 조건",
    "시스템 구성",
    "효율과 비용의 맞바꿈",
    "열용량"
   ],
   "outputs": [
    "계산서",
    "성능 모델",
    "사양서",
    "시험 결과"
   ],
   "performance": [
    "효율",
    "출력",
    "에너지 비용"
   ],
   "families": [
    "ME_THERMAL_FLUID",
    "ME_RND",
    "ME_PROCESS",
    "ME_RESEARCH_SCIENTIST"
   ]
  },
  {
   "id": "fluid_mechanics",
   "name_ko": "유체역학",
   "aliases": [
    "유체역학",
    "fluid mechanics",
    "유체기계",
    "수력학"
   ],
   "work": [
    "압력 손실을 보는 일",
    "유량 분배를 맞추는 일",
    "펌프와 팬 계통을 고르는 일",
    "냉각 설계",
    "공력·수력 설계"
   ],
   "decisions": [
    "유로 형상",
    "펌프·팬 사양",
    "작동점",
    "유량 배분"
   ],
   "outputs": [
    "유동 해석 결과",
    "계통도",
    "사양서",
    "시험 결과"
   ],
   "performance": [
    "유량",
    "압력 손실",
    "열 관리",
    "효율",
    "안정성",
    "소음"
   ],
   "families": [
    "ME_THERMAL_FLUID",
    "ME_CAE_SIM",
    "ME_PROCESS",
    "ME_RND"
   ]
  },
  {
   "id": "heat_transfer",
   "name_ko": "열전달",
   "aliases": [
    "열전달",
    "heat transfer",
    "전열"
   ],
   "work": [
    "냉각 설계",
    "열저항을 쌓아 온도를 보는 일",
    "열 성능을 검토하는 일"
   ],
   "decisions": [
    "냉각 방식",
    "방열 면적",
    "재질과 계면",
    "유량과 온도 조건"
   ],
   "outputs": [
    "열 해석 결과",
    "냉각 설계안",
    "시험 결과",
    "기술 보고서"
   ],
   "performance": [
    "온도",
    "열저항",
    "신뢰성",
    "소비 전력",
    "원가"
   ],
   "families": [
    "ME_THERMAL_FLUID",
    "ME_CAE_SIM",
    "ME_DESIGN_PRODUCT",
    "ME_RND"
   ]
  },
  {
   "id": "machine_design",
   "name_ko": "기계요소설계",
   "aliases": [
    "기계요소설계",
    "기계설계",
    "machine design",
    "기계요소"
   ],
   "work": [
    "요구조건을 치수와 공차로 옮기는 일",
    "요소를 고르고 조합하는 일",
    "설계 검토"
   ],
   "decisions": [
    "요소 선정",
    "공차",
    "체결 방식",
    "안전 여유",
    "수명 가정"
   ],
   "outputs": [
    "도면",
    "사양서",
    "설계 계산서",
    "부품표"
   ],
   "performance": [
    "성능",
    "수명",
    "조립성",
    "원가"
   ],
   "families": [
    "ME_DESIGN_PRODUCT",
    "ME_EQUIPMENT_MAINT",
    "ME_MANUFACTURING"
   ]
  },
  {
   "id": "cad_drawing",
   "name_ko": "CAD · 도면",
   "aliases": [
    "기계제도",
    "cad",
    "도면",
    "제도",
    "기하공차",
    "gd&t",
    "3d모델링"
   ],
   "work": [
    "형상을 모델로 만드는 일",
    "도면으로 뜻을 전달하는 일",
    "설계 변경을 이력으로 남기는 일"
   ],
   "decisions": [
    "기준면",
    "공차 배분",
    "분할과 조립 순서"
   ],
   "outputs": [
    "3D 모델",
    "도면",
    "부품표",
    "변경 이력"
   ],
   "performance": [
    "해석 없이도 읽히는가",
    "제조 가능성",
    "재작업"
   ],
   "families": [
    "ME_DESIGN_PRODUCT",
    "ME_MANUFACTURING",
    "ME_DIGITAL"
   ]
  },
  {
   "id": "manufacturing",
   "name_ko": "제조공학",
   "aliases": [
    "제조공학",
    "생산공학",
    "가공학",
    "manufacturing",
    "기계가공",
    "소성가공",
    "용접"
   ],
   "work": [
    "공정을 고르는 일",
    "공정을 다듬는 일",
    "라인을 설계하는 일",
    "제조 가능성 검토",
    "현장 문제 해결"
   ],
   "decisions": [
    "공정 조건",
    "작업 순서",
    "치공구",
    "검사 지점",
    "공정 창"
   ],
   "outputs": [
    "공정도",
    "작업 표준",
    "검사 기준",
    "개선 보고"
   ],
   "performance": [
    "수율",
    "생산량",
    "불량",
    "원가",
    "사이클 타임",
    "재현성"
   ],
   "families": [
    "ME_MANUFACTURING",
    "ME_PROCESS",
    "ME_QUALITY_RELIABILITY",
    "ME_DESIGN_PRODUCT"
   ]
  },
  {
   "id": "materials",
   "name_ko": "재료공학",
   "aliases": [
    "기계재료",
    "재료공학",
    "재료과학",
    "금속재료",
    "복합재료",
    "열처리"
   ],
   "work": [
    "재질을 고르는 일",
    "파면을 보고 원인을 찾는 일",
    "열처리와 표면 처리를 정하는 일"
   ],
   "decisions": [
    "재질",
    "열처리 조건",
    "표면 처리",
    "대체재"
   ],
   "outputs": [
    "재질 선정 근거",
    "파손 분석 보고",
    "시험 결과"
   ],
   "performance": [
    "강도",
    "내식",
    "내마모",
    "원가",
    "수급"
   ],
   "families": [
    "ME_MATERIALS",
    "ME_QUALITY_RELIABILITY",
    "ME_DESIGN_PRODUCT",
    "ME_RESEARCH_SCIENTIST"
   ]
  },
  {
   "id": "vibration_nvh",
   "name_ko": "기계진동 · NVH",
   "aliases": [
    "기계진동",
    "진동학",
    "nvh",
    "소음진동",
    "vibration"
   ],
   "work": [
    "고유진동수를 보는 일",
    "공진을 피하는 일",
    "소음과 진동을 줄이는 일"
   ],
   "decisions": [
    "강성 배분",
    "감쇠 방식",
    "지지 위치",
    "운전 영역"
   ],
   "outputs": [
    "모달 해석 결과",
    "진동 측정 보고",
    "대책안"
   ],
   "performance": [
    "진동 수준",
    "소음",
    "내구",
    "승차감"
   ],
   "families": [
    "ME_CAE_SIM",
    "ME_TEST_VV",
    "ME_DESIGN_PRODUCT",
    "ME_EQUIPMENT_MAINT"
   ]
  },
  {
   "id": "control",
   "name_ko": "제어",
   "aliases": [
    "자동제어",
    "제어공학",
    "control",
    "선형제어",
    "현대제어"
   ],
   "work": [
    "제어기를 설계하는 일",
    "응답을 맞추는 일",
    "모델을 세워 거동을 보는 일"
   ],
   "decisions": [
    "제어 구조",
    "이득",
    "센서와 구동기 선정",
    "안전 로직"
   ],
   "outputs": [
    "제어 설계안",
    "시뮬레이션 결과",
    "시운전 기록"
   ],
   "performance": [
    "응답성",
    "안정성",
    "정밀도",
    "안전"
   ],
   "families": [
    "ME_AUTOMATION",
    "ME_RND",
    "ME_CAE_SIM"
   ]
  },
  {
   "id": "mechatronics",
   "name_ko": "메카트로닉스",
   "aliases": [
    "메카트로닉스",
    "mechatronics",
    "센서공학",
    "구동기",
    "액추에이터"
   ],
   "work": [
    "기구와 전장을 맞물리게 하는 일",
    "센서와 구동기를 붙이는 일",
    "통합 시운전"
   ],
   "decisions": [
    "부품 선정",
    "인터페이스",
    "신호 처리 방식"
   ],
   "outputs": [
    "시작품",
    "회로와 배선 자료",
    "시운전 기록"
   ],
   "performance": [
    "동작 신뢰성",
    "정밀도",
    "원가"
   ],
   "families": [
    "ME_AUTOMATION",
    "ME_RND",
    "ME_DESIGN_PRODUCT"
   ]
  },
  {
   "id": "robotics",
   "name_ko": "로봇",
   "aliases": [
    "로봇공학",
    "robotics",
    "로봇",
    "매니퓰레이터"
   ],
   "work": [
    "로봇 작업을 설계하는 일",
    "경로를 만드는 일",
    "셀을 구성하는 일"
   ],
   "decisions": [
    "로봇 선정",
    "배치",
    "경로와 속도",
    "안전 울타리"
   ],
   "outputs": [
    "셀 레이아웃",
    "로봇 프로그램",
    "검증 기록"
   ],
   "performance": [
    "사이클 타임",
    "반복 정밀도",
    "안전",
    "가동률"
   ],
   "families": [
    "ME_AUTOMATION",
    "ME_MANUFACTURING",
    "ME_RND"
   ]
  },
  {
   "id": "numerical",
   "name_ko": "수치해석",
   "aliases": [
    "수치해석",
    "numerical methods",
    "공업수학",
    "전산해석"
   ],
   "work": [
    "방정식을 수치로 푸는 일",
    "수렴을 확인하는 일",
    "격자와 시간 간격을 정하는 일"
   ],
   "decisions": [
    "해법 선택",
    "격자 크기",
    "수렴 기준",
    "경계 조건"
   ],
   "outputs": [
    "해석 스크립트",
    "수렴 검토 자료"
   ],
   "performance": [
    "정확도",
    "계산 비용",
    "재현성"
   ],
   "families": [
    "ME_CAE_SIM",
    "ME_RESEARCH_SCIENTIST",
    "ME_DIGITAL"
   ]
  },
  {
   "id": "fea",
   "name_ko": "유한요소해석",
   "aliases": [
    "유한요소해석",
    "fea",
    "유한요소법",
    "구조해석",
    "fem"
   ],
   "work": [
    "구조 해석 모델을 세우는 일",
    "설계안을 견주는 일",
    "시험값과 맞춰 보는 일"
   ],
   "decisions": [
    "요소와 격자",
    "경계 조건과 하중",
    "재료 모델",
    "설계안 선택"
   ],
   "outputs": [
    "해석 결과",
    "설계 검토 자료",
    "해석 보고서"
   ],
   "performance": [
    "응력과 변형 기준 충족",
    "시험과의 차이",
    "설계 결정 기여"
   ],
   "families": [
    "ME_CAE_SIM",
    "ME_DESIGN_PRODUCT",
    "ME_MATERIALS",
    "ME_RESEARCH_SCIENTIST"
   ]
  },
  {
   "id": "cfd",
   "name_ko": "전산유체해석",
   "aliases": [
    "전산유체",
    "cfd",
    "유동해석",
    "열유동해석"
   ],
   "work": [
    "유동과 열 해석 모델을 세우는 일",
    "조건을 바꿔 견주는 일",
    "실험과 맞춰 보는 일"
   ],
   "decisions": [
    "난류 모델",
    "격자",
    "경계 조건",
    "형상안 선택"
   ],
   "outputs": [
    "해석 결과",
    "설계 검토 자료",
    "보고서"
   ],
   "performance": [
    "압력 손실과 온도 기준 충족",
    "실험과의 차이",
    "설계 결정 기여"
   ],
   "families": [
    "ME_CAE_SIM",
    "ME_THERMAL_FLUID",
    "ME_RND",
    "ME_RESEARCH_SCIENTIST"
   ]
  },
  {
   "id": "experiment",
   "name_ko": "실험방법",
   "aliases": [
    "기계공학실험",
    "실험계획법",
    "doe",
    "실험방법",
    "계측실험"
   ],
   "work": [
    "시험을 설계하는 일",
    "조건을 통제하는 일",
    "결과를 판정하는 일"
   ],
   "decisions": [
    "시험 조건",
    "반복 수",
    "판정 기준",
    "계측 지점"
   ],
   "outputs": [
    "시험 계획서",
    "시험 결과",
    "판정 보고"
   ],
   "performance": [
    "재현성",
    "불확도",
    "기준 부합"
   ],
   "families": [
    "ME_TEST_VV",
    "ME_RESEARCH_SCIENTIST",
    "ME_QUALITY_RELIABILITY"
   ]
  },
  {
   "id": "statistics",
   "name_ko": "통계 · 데이터 분석",
   "aliases": [
    "공업통계",
    "통계",
    "데이터분석",
    "statistics",
    "품질통계",
    "spc"
   ],
   "work": [
    "산포를 보는 일",
    "공정을 통계로 보는 일",
    "요인을 가려내는 일"
   ],
   "decisions": [
    "표본 수",
    "관리 한계",
    "유의 판단",
    "모델 선택"
   ],
   "outputs": [
    "관리도",
    "분석 보고",
    "요인 분석 결과"
   ],
   "performance": [
    "공정 능력",
    "불량률",
    "예측 정확도"
   ],
   "families": [
    "ME_QUALITY_RELIABILITY",
    "ME_DIGITAL",
    "ME_PROCESS",
    "ME_RESEARCH_SCIENTIST"
   ]
  },
  {
   "id": "programming",
   "name_ko": "프로그래밍",
   "aliases": [
    "프로그래밍",
    "python",
    "matlab",
    "c++",
    "전산",
    "컴퓨터프로그래밍"
   ],
   "work": [
    "계산을 자동으로 돌리는 일",
    "데이터를 다루는 일",
    "해석을 묶어 반복하는 일"
   ],
   "decisions": [
    "자동화 범위",
    "자료 구조",
    "검증 방법"
   ],
   "outputs": [
    "스크립트",
    "도구",
    "데이터 처리 결과"
   ],
   "performance": [
    "시간 절감",
    "재사용",
    "오류 감소"
   ],
   "families": [
    "ME_DIGITAL",
    "ME_CAE_SIM",
    "ME_RESEARCH_SCIENTIST",
    "ME_AUTOMATION"
   ]
  },
  {
   "id": "optimization",
   "name_ko": "최적화",
   "aliases": [
    "최적설계",
    "최적화",
    "optimization",
    "설계최적화"
   ],
   "work": [
    "목적과 제약을 세우는 일",
    "설계 변수를 훑는 일",
    "맞바꿈을 보는 일"
   ],
   "decisions": [
    "목적 함수",
    "제약 조건",
    "탐색 범위",
    "최종안"
   ],
   "outputs": [
    "최적화 결과",
    "설계안 비교표",
    "민감도 분석"
   ],
   "performance": [
    "무게",
    "원가",
    "성능",
    "맞바꿈의 근거"
   ],
   "families": [
    "ME_CAE_SIM",
    "ME_DESIGN_PRODUCT",
    "ME_RND",
    "ME_RESEARCH_SCIENTIST"
   ]
  },
  {
   "id": "systems_engineering",
   "name_ko": "시스템공학",
   "aliases": [
    "시스템공학",
    "systems engineering",
    "요구공학",
    "형상관리"
   ],
   "work": [
    "요구사항을 나누고 추적하는 일",
    "인터페이스를 정하는 일",
    "검증 계획을 세우는 일"
   ],
   "decisions": [
    "요구 배분",
    "인터페이스 규정",
    "검증 방법",
    "변경 승인"
   ],
   "outputs": [
    "요구사항 문서",
    "추적표",
    "검증 계획",
    "변경 이력"
   ],
   "performance": [
    "요구 충족",
    "추적 가능성",
    "일정",
    "재작업"
   ],
   "families": [
    "ME_SYSTEMS_TPM",
    "ME_TEST_VV",
    "ME_DESIGN_PRODUCT"
   ]
  },
  {
   "id": "reliability",
   "name_ko": "신뢰성",
   "aliases": [
    "신뢰성공학",
    "reliability",
    "수명시험",
    "fmea",
    "내구"
   ],
   "work": [
    "고장 모드를 뽑는 일",
    "수명을 보는 일",
    "가속 시험을 설계하는 일"
   ],
   "decisions": [
    "고장 기준",
    "시험 조건",
    "설계 여유",
    "보증 수준"
   ],
   "outputs": [
    "FMEA",
    "수명 시험 결과",
    "신뢰성 보고"
   ],
   "performance": [
    "고장률",
    "수명",
    "보증 비용"
   ],
   "families": [
    "ME_QUALITY_RELIABILITY",
    "ME_TEST_VV",
    "ME_DESIGN_PRODUCT",
    "ME_EQUIPMENT_MAINT"
   ]
  },
  {
   "id": "quality",
   "name_ko": "품질",
   "aliases": [
    "품질공학",
    "품질관리",
    "quality",
    "검사",
    "측정시스템"
   ],
   "work": [
    "검사 기준을 세우는 일",
    "불량 원인을 찾는 일",
    "공정을 지키는 일"
   ],
   "decisions": [
    "검사 항목과 주기",
    "합격 기준",
    "시정 조치"
   ],
   "outputs": [
    "검사 기준서",
    "부적합 보고",
    "시정 조치 기록"
   ],
   "performance": [
    "불량률",
    "고객 클레임",
    "공정 능력"
   ],
   "families": [
    "ME_QUALITY_RELIABILITY",
    "ME_MANUFACTURING",
    "ME_PROCESS"
   ]
  },
  {
   "id": "tribology",
   "name_ko": "트라이볼로지",
   "aliases": [
    "트라이볼로지",
    "tribology",
    "윤활",
    "마찰",
    "마모"
   ],
   "work": [
    "마찰과 마모를 보는 일",
    "윤활 방식을 정하는 일",
    "접촉면을 설계하는 일"
   ],
   "decisions": [
    "윤활 방식",
    "표면 거칠기",
    "접촉 압력",
    "소재 조합"
   ],
   "outputs": [
    "마모 시험 결과",
    "윤활 사양",
    "설계 개선안"
   ],
   "performance": [
    "수명",
    "마찰 손실",
    "유지보수 주기"
   ],
   "families": [
    "ME_MATERIALS",
    "ME_EQUIPMENT_MAINT",
    "ME_DESIGN_PRODUCT"
   ]
  },
  {
   "id": "energy_systems",
   "name_ko": "에너지 시스템",
   "aliases": [
    "에너지시스템",
    "발전공학",
    "신재생에너지",
    "energy systems",
    "열기관"
   ],
   "work": [
    "에너지 계통을 설계하는 일",
    "운전 효율을 보는 일",
    "설비를 고르는 일"
   ],
   "decisions": [
    "계통 구성",
    "용량",
    "운전 전략",
    "연료와 열원"
   ],
   "outputs": [
    "계통 설계안",
    "성능 모델",
    "운전 기준"
   ],
   "performance": [
    "효율",
    "연간 에너지 비용",
    "배출",
    "가동률"
   ],
   "families": [
    "ME_THERMAL_FLUID",
    "ME_PROCESS",
    "ME_RND",
    "ME_CONSULTING"
   ]
  },
  {
   "id": "hvac",
   "name_ko": "공조 · 열시스템",
   "aliases": [
    "공기조화",
    "hvac",
    "냉동공학",
    "공조",
    "열시스템"
   ],
   "work": [
    "부하를 계산하는 일",
    "공조 계통을 설계하는 일",
    "운전 조건을 맞추는 일"
   ],
   "decisions": [
    "장비 용량",
    "덕트와 배관",
    "제어 방식",
    "운전 설정"
   ],
   "outputs": [
    "부하 계산서",
    "계통도",
    "장비 사양",
    "시운전 기록"
   ],
   "performance": [
    "온습도 유지",
    "에너지 사용량",
    "소음",
    "초기 비용"
   ],
   "families": [
    "ME_THERMAL_FLUID",
    "ME_APPLICATIONS_FIELD",
    "ME_CONSULTING",
    "ME_EQUIPMENT_MAINT"
   ]
  },
  {
   "id": "measurement",
   "name_ko": "계측",
   "aliases": [
    "계측공학",
    "센서",
    "measurement",
    "instrumentation",
    "정밀측정"
   ],
   "work": [
    "무엇을 어떻게 잴지 정하는 일",
    "센서를 붙이는 일",
    "불확도를 따지는 일"
   ],
   "decisions": [
    "센서 선정",
    "측정 지점",
    "교정 주기",
    "불확도 허용"
   ],
   "outputs": [
    "계측 계획",
    "측정 데이터",
    "교정 기록"
   ],
   "performance": [
    "정확도",
    "불확도",
    "추적성"
   ],
   "families": [
    "ME_TEST_VV",
    "ME_QUALITY_RELIABILITY",
    "ME_EQUIPMENT_MAINT",
    "ME_RESEARCH_SCIENTIST"
   ]
  }
 ]
};
window.PCA_TOOLS = {
 "schema_version": "1.0",
 "major_id": "ME",
 "note": "도구·기술 목록. **이 목록은 고르기 쉬우라고 있는 것이지 이 안에 들어야 인정된다는 뜻이 아니다.** 직접 적은 이름도 같은 자리에 들어간다. 도구 이름만으로는 활동(E0)까지만 확인되고, 숙련으로 읽지 않는다. 개수를 점수로 쓰지 않는다.",
 "usage_levels": [
  {
   "id": "exposed",
   "n": "접해봤습니다",
   "ladder": "E0"
  },
  {
   "id": "basic",
   "n": "기본적으로 씁니다",
   "ladder": "E0"
  },
  {
   "id": "project",
   "n": "프로젝트에서 직접 썼습니다",
   "ladder": "E0"
  },
  {
   "id": "repeated",
   "n": "여러 프로젝트에서 반복해 썼습니다",
   "ladder": "E0"
  }
 ],
 "level_note": "사용 수준은 **얼마나 자주 썼는가**이지 증거 단계가 아니다. 단계는 그 도구로 무엇을 판단하고 무엇을 남겼는지에서 올라간다.",
 "categories": [
  {
   "id": "cad",
   "n": "설계 · CAD",
   "families": [
    "ME_DESIGN_PRODUCT",
    "ME_MANUFACTURING",
    "ME_EQUIPMENT_MAINT"
   ],
   "domains": [
    "cad_drawing",
    "machine_design"
   ],
   "tools": [
    "SolidWorks",
    "CATIA",
    "Creo",
    "NX",
    "AutoCAD",
    "Fusion 360",
    "Inventor"
   ],
   "intake": [
    "cad"
   ]
  },
  {
   "id": "fea",
   "n": "CAE · 구조해석",
   "families": [
    "ME_CAE_SIM",
    "ME_DESIGN_PRODUCT",
    "ME_MATERIALS"
   ],
   "domains": [
    "fea",
    "solid_mechanics",
    "numerical"
   ],
   "tools": [
    "ANSYS Mechanical",
    "Abaqus",
    "Nastran",
    "LS-DYNA",
    "Altair HyperWorks",
    "COMSOL",
    "Simcenter 3D"
   ],
   "intake": [
    "cae"
   ]
  },
  {
   "id": "cfd",
   "n": "유동 · 열해석",
   "families": [
    "ME_CAE_SIM",
    "ME_THERMAL_FLUID"
   ],
   "domains": [
    "cfd",
    "fluid_mechanics",
    "heat_transfer"
   ],
   "tools": [
    "ANSYS Fluent",
    "ANSYS CFX",
    "STAR-CCM+",
    "OpenFOAM",
    "COMSOL",
    "Icepak"
   ],
   "intake": [
    "cfd"
   ]
  },
  {
   "id": "sim_control",
   "n": "제어 · 시뮬레이션",
   "families": [
    "ME_AUTOMATION",
    "ME_RND",
    "ME_DIGITAL"
   ],
   "domains": [
    "control",
    "mechatronics",
    "numerical"
   ],
   "tools": [
    "MATLAB",
    "Simulink",
    "LabVIEW",
    "Modelica",
    "Amesim",
    "Adams"
   ],
   "intake": [
    "num"
   ]
  },
  {
   "id": "code",
   "n": "프로그래밍 · 데이터",
   "families": [
    "ME_DIGITAL",
    "ME_RESEARCH_SCIENTIST",
    "ME_QUALITY_RELIABILITY"
   ],
   "domains": [
    "programming",
    "statistics",
    "numerical"
   ],
   "tools": [
    "Python",
    "C",
    "C++",
    "MATLAB",
    "R",
    "SQL",
    "Excel · VBA",
    "Minitab"
   ],
   "intake": [
    "code",
    "data"
   ]
  },
  {
   "id": "manufacturing",
   "n": "제조 · 생산",
   "families": [
    "ME_MANUFACTURING",
    "ME_PROCESS",
    "ME_AUTOMATION"
   ],
   "domains": [
    "manufacturing",
    "robotics"
   ],
   "tools": [
    "CAM",
    "CNC",
    "3D 프린팅",
    "PLC",
    "MES",
    "로봇 티칭",
    "용접"
   ],
   "intake": [
    "cam"
   ]
  },
  {
   "id": "test",
   "n": "시험 · 계측",
   "families": [
    "ME_TEST_VV",
    "ME_QUALITY_RELIABILITY",
    "ME_EQUIPMENT_MAINT"
   ],
   "domains": [
    "measurement",
    "experiment",
    "vibration_nvh"
   ],
   "tools": [
    "DAQ",
    "스트레인 게이지",
    "열화상 카메라",
    "진동 측정",
    "오실로스코프",
    "만능시험기",
    "3차원 측정기"
   ],
   "intake": [
    "test"
   ]
  },
  {
   "id": "plm",
   "n": "형상관리 · 협업",
   "families": [
    "ME_SYSTEMS_TPM",
    "ME_DESIGN_PRODUCT",
    "ME_DIGITAL"
   ],
   "domains": [
    "systems_engineering",
    "cad_drawing"
   ],
   "tools": [
    "Teamcenter",
    "Windchill",
    "3DEXPERIENCE",
    "Jira",
    "Confluence",
    "Git"
   ],
   "intake": [
    "plm",
    "doc"
   ]
  }
 ],
 "intake_note": "경험 입력 화면의 도구 갈래 코드(evidence-rules.json 의 tool_categories)와 여기 갈래를 잇는다. 두 목록이 따로 자란 것이라 한쪽을 고치면 이 줄이 끊긴다."
};
window.PCA_VALUE_PATHS = {
 "schema_version": "1.0",
 "major_id": "ME",
 "note": "직무군 열여섯 × 가치 사슬. 전공지식 → 실제 업무 → 기술 판단 → 산출물 → 성과 기준 → 조직 가치 순서다. org_variants 는 **같은 지식이 조직에 따라 무엇으로 읽히는가**이고, 특정 기관의 평가 지표가 아니다. check_missing 은 비어 있는 자리를 응시자에게 되묻는 말이다.",
 "families": [
  {
   "career_family_id": "ME_DESIGN_PRODUCT",
   "problem": "요구조건이 서로 부딪히는 가운데 만들 수 있는 형상 하나를 정하는 일",
   "knowledge": [
    "solid_mechanics",
    "machine_design",
    "cad_drawing",
    "statics",
    "materials",
    "manufacturing"
   ],
   "work": [
    "요구조건을 치수와 공차로 옮긴다",
    "하중을 고려해 구조를 잡는다",
    "설계안을 견주고 하나를 고른다",
    "설계 검토를 받는다"
   ],
   "decisions": [
    "두께와 형상",
    "재질",
    "안전 여유",
    "공차 배분",
    "체결 방식"
   ],
   "outputs": [
    "3D 모델과 도면",
    "설계 계산서",
    "설계 검토 자료",
    "부품표",
    "변경 이력"
   ],
   "performance": [
    "성능",
    "안전",
    "무게",
    "원가",
    "제조 가능성",
    "일정"
   ],
   "tool_categories": [
    "cad",
    "fea",
    "plm"
   ],
   "evidence_you_can_show": [
    "끝까지 만든 도면이나 3D 모델",
    "설계안을 견준 비교표",
    "치수를 그렇게 정한 계산 근거",
    "만들어 보고 고친 기록"
   ],
   "check_missing": [
    "몇 가지 안을 두고 무엇을 기준으로 골랐습니까",
    "그 치수를 정할 때 쓴 하중과 재질은 무엇이었습니까",
    "최종안이 요구조건을 만족한다는 것을 무엇으로 확인했습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "양산으로 넘어가는 설계안과 도면",
     "performance": "성능 · 원가 · 제조 가능성 · 납기"
    },
    "government_research_institute": {
     "output": "시작품과 과제 산출물로서의 설계",
     "performance": "과제 목표 달성 · 기술 수준 · 이전 가능성"
    },
    "university_lab": {
     "output": "개념을 보이는 시작품과 그 설계 근거",
     "performance": "새로움 · 재현성 · 학술적 기여"
    },
    "engineering_consulting": {
     "output": "고객이 결정에 쓰는 설계 대안 비교",
     "performance": "고객 요구 충족 · 일정 · 재의뢰"
    }
   }
  },
  {
   "career_family_id": "ME_CAE_SIM",
   "problem": "만들어 보기 전에 계산으로 설계안을 가려내는 일",
   "knowledge": [
    "fea",
    "cfd",
    "numerical",
    "solid_mechanics",
    "heat_transfer",
    "optimization"
   ],
   "work": [
    "해석 모델을 세운다",
    "경계 조건과 하중을 정한다",
    "설계안을 견준다",
    "시험값과 맞춰 본다"
   ],
   "decisions": [
    "요소와 격자",
    "재료 모델",
    "경계 조건",
    "수렴 기준",
    "설계안 선택"
   ],
   "outputs": [
    "해석 결과",
    "설계 검토 자료",
    "해석 보고서",
    "해석 절차서"
   ],
   "performance": [
    "기준 충족 여부",
    "시험과의 차이",
    "설계 결정에 쓰였는가",
    "해석 시간"
   ],
   "tool_categories": [
    "fea",
    "cfd",
    "code"
   ],
   "evidence_you_can_show": [
    "무엇을 왜 해석했는지 적은 모델 설정",
    "조건을 바꿔 견준 결과",
    "시험값과 맞춰 본 기록",
    "해석 보고서"
   ],
   "check_missing": [
    "무엇을 해석했습니까",
    "어떤 조건을 바꿔 가며 견주었습니까",
    "그 결과로 무엇을 정했습니까",
    "결과가 맞다는 것을 무엇으로 확인했습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "설계안 선택을 뒷받침하는 해석 결과",
     "performance": "설계 기준 충족 · 시험 일치 · 개발 기간 단축"
    },
    "government_research_institute": {
     "output": "검증된 해석 방법과 과제 보고서",
     "performance": "재현성 · 과제 목표 · 다른 과제로의 이전"
    },
    "university_lab": {
     "output": "논문에 실리는 수치 결과와 방법",
     "performance": "새로움 · 검증 · 재현 가능성"
    },
    "engineering_consulting": {
     "output": "고객 과제에 대한 해석 보고서",
     "performance": "납기 · 가정의 타당성 · 재의뢰"
    }
   }
  },
  {
   "career_family_id": "ME_RND",
   "problem": "아직 제품이 아닌 것을 제품이 될 수 있는지까지 끌고 가는 일",
   "knowledge": [
    "thermodynamics",
    "heat_transfer",
    "fluid_mechanics",
    "control",
    "materials",
    "optimization",
    "experiment"
   ],
   "work": [
    "개념을 세운다",
    "되는지 작게 확인한다",
    "시작품을 만든다",
    "양산으로 넘길 수 있는지 본다"
   ],
   "decisions": [
    "기술 방식 선택",
    "검증 범위",
    "시작품 사양",
    "중단과 계속"
   ],
   "outputs": [
    "개념 검증 결과",
    "시작품",
    "기술 보고서",
    "특허",
    "선행 개발 자료"
   ],
   "performance": [
    "되는지 여부를 가린 속도",
    "기술 수준",
    "양산 이관 가능성",
    "지식재산"
   ],
   "tool_categories": [
    "fea",
    "cfd",
    "sim_control",
    "test"
   ],
   "evidence_you_can_show": [
    "작게 확인해 본 실험 결과",
    "방식을 견준 기록",
    "시작품과 그 한계",
    "특허나 기술 보고서"
   ],
   "check_missing": [
    "무엇을 먼저 확인해야 한다고 보았습니까",
    "되는지 안 되는지를 무엇으로 갈랐습니까",
    "그 결과가 다음 단계로 넘어갔습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "양산으로 넘길 수 있는 선행 개발 결과",
     "performance": "사업성 · 기술 난도 해소 · 일정"
    },
    "government_research_institute": {
     "output": "과제 산출물과 기술이전 자료",
     "performance": "과제 목표 · 기술 성숙도 · 이전 실적"
    },
    "university_lab": {
     "output": "논문과 개념 증명",
     "performance": "새로움 · 영향력"
    }
   }
  },
  {
   "career_family_id": "ME_TEST_VV",
   "problem": "만든 것이 요구대로 되는지를 정해진 방법으로 확인하는 일",
   "knowledge": [
    "experiment",
    "measurement",
    "systems_engineering",
    "reliability",
    "vibration_nvh"
   ],
   "work": [
    "시험을 설계한다",
    "지그와 계측을 붙인다",
    "조건을 통제해 시험한다",
    "합격 여부를 판정한다"
   ],
   "decisions": [
    "시험 조건",
    "판정 기준",
    "계측 지점",
    "반복 수",
    "재시험 여부"
   ],
   "outputs": [
    "시험 계획서",
    "시험 결과",
    "판정 보고",
    "불확도 평가"
   ],
   "performance": [
    "재현성",
    "불확도",
    "기준 부합",
    "시험 기간"
   ],
   "tool_categories": [
    "test",
    "code"
   ],
   "evidence_you_can_show": [
    "시험 계획과 그 조건을 고른 이유",
    "측정 데이터",
    "합격과 불합격을 가른 기준",
    "시험과 해석을 맞춰 본 기록"
   ],
   "check_missing": [
    "무엇을 기준으로 합격을 판정했습니까",
    "그 조건을 고른 이유는 무엇입니까",
    "결과가 설계로 돌아갔습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "양산 승인에 쓰이는 검증 결과",
     "performance": "기준 충족 · 재시험 횟수 · 일정"
    },
    "regulator_technical_body": {
     "output": "기준에 따른 시험·평가 보고서",
     "performance": "정확성 · 추적 가능성 · 일관성"
    },
    "government_research_institute": {
     "output": "과제 성능 검증 자료",
     "performance": "과제 목표 · 재현성"
    }
   }
  },
  {
   "career_family_id": "ME_MANUFACTURING",
   "problem": "설계를 실제로 만들 수 있는 순서와 조건으로 바꾸는 일",
   "knowledge": [
    "manufacturing",
    "machine_design",
    "cad_drawing",
    "quality",
    "robotics"
   ],
   "work": [
    "공정을 고른다",
    "치공구를 설계한다",
    "라인을 짠다",
    "양산 이관을 맡는다"
   ],
   "decisions": [
    "공정 순서",
    "설비와 치공구",
    "가공 조건",
    "검사 지점"
   ],
   "outputs": [
    "공정도",
    "작업 표준",
    "치공구 도면",
    "이관 자료"
   ],
   "performance": [
    "수율",
    "사이클 타임",
    "원가",
    "불량",
    "안전"
   ],
   "tool_categories": [
    "manufacturing",
    "cad",
    "code"
   ],
   "evidence_you_can_show": [
    "직접 돌려 본 공정과 조건",
    "바꿔서 좋아진 수치",
    "작업 표준으로 남긴 것"
   ],
   "check_missing": [
    "어떤 조건을 바꿔 보았습니까",
    "그 전후로 무엇이 얼마나 달라졌습니까",
    "그 조건이 표준으로 남았습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "안정적으로 도는 라인과 작업 표준",
     "performance": "수율 · 생산량 · 원가 · 안전"
    },
    "public_execution_agency": {
     "output": "설비 도입과 공정 개선 사업 결과",
     "performance": "집행률 · 수혜 기업 성과"
    }
   }
  },
  {
   "career_family_id": "ME_PROCESS",
   "problem": "이미 돌고 있는 공정의 데이터를 보고 조건을 다시 정하는 일",
   "knowledge": [
    "manufacturing",
    "statistics",
    "thermodynamics",
    "fluid_mechanics",
    "quality"
   ],
   "work": [
    "공정 데이터를 본다",
    "원인을 가려낸다",
    "조건을 바꿔 본다",
    "공정 창을 정한다"
   ],
   "decisions": [
    "어느 인자를 볼 것인가",
    "조건 범위",
    "변경 적용 시점"
   ],
   "outputs": [
    "분석 보고",
    "개선된 공정 조건",
    "관리 기준",
    "실험 계획과 결과"
   ],
   "performance": [
    "수율",
    "산포",
    "에너지 사용량",
    "불량 비용"
   ],
   "tool_categories": [
    "code",
    "manufacturing",
    "test"
   ],
   "evidence_you_can_show": [
    "본 데이터와 거기서 세운 가설",
    "조건을 바꾼 실험",
    "전후 비교 수치"
   ],
   "check_missing": [
    "어떤 데이터를 보고 원인을 좁혔습니까",
    "바꾼 조건과 그 근거는 무엇입니까",
    "바뀐 것을 어떻게 지켰습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "개선된 공정 조건과 관리 기준",
     "performance": "수율 · 원가 · 산포"
    },
    "government_research_institute": {
     "output": "공정 기술 개발 결과",
     "performance": "과제 목표 · 기업 적용 가능성"
    }
   }
  },
  {
   "career_family_id": "ME_QUALITY_RELIABILITY",
   "problem": "무엇이 언제 어떻게 고장 나는지를 미리 보고 막는 일",
   "knowledge": [
    "reliability",
    "quality",
    "statistics",
    "materials",
    "experiment"
   ],
   "work": [
    "고장 모드를 뽑는다",
    "수명과 가속 시험을 설계한다",
    "불량 원인을 되짚는다",
    "검사 기준을 세운다"
   ],
   "decisions": [
    "고장 기준",
    "시험 조건",
    "검사 항목과 주기",
    "시정 조치"
   ],
   "outputs": [
    "FMEA",
    "신뢰성 시험 결과",
    "부적합 보고",
    "검사 기준서"
   ],
   "performance": [
    "고장률",
    "보증 비용",
    "불량률",
    "공정 능력"
   ],
   "tool_categories": [
    "test",
    "code"
   ],
   "evidence_you_can_show": [
    "실제로 돌린 FMEA",
    "수명 시험 데이터",
    "원인을 끝까지 따라간 기록",
    "재발을 막은 조치"
   ],
   "check_missing": [
    "어떤 고장을 보았습니까",
    "원인을 무엇으로 좁혔습니까",
    "그 뒤로 같은 일이 다시 생기지 않았습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "고장을 줄인 설계와 공정 변경",
     "performance": "고장률 · 클레임 · 보증 비용"
    },
    "regulator_technical_body": {
     "output": "안전성 평가와 기준 해석",
     "performance": "정확성 · 추적성 · 안전"
    }
   }
  },
  {
   "career_family_id": "ME_EQUIPMENT_MAINT",
   "problem": "설비가 멈추지 않게 하고 멈췄을 때 빨리 살리는 일",
   "knowledge": [
    "machine_design",
    "vibration_nvh",
    "tribology",
    "measurement",
    "reliability",
    "hvac"
   ],
   "work": [
    "설비 상태를 본다",
    "고장을 진단한다",
    "예방 보전을 계획한다",
    "개조하고 개선한다"
   ],
   "decisions": [
    "교체와 수리",
    "점검 주기",
    "예비품 수준",
    "개조 범위"
   ],
   "outputs": [
    "정비 이력",
    "진단 보고",
    "보전 계획",
    "개선 자료"
   ],
   "performance": [
    "가동률",
    "평균 수리 시간",
    "고장 정지",
    "보전 비용"
   ],
   "tool_categories": [
    "test",
    "manufacturing",
    "cad"
   ],
   "evidence_you_can_show": [
    "진단한 고장과 그 근거",
    "줄인 정지 시간",
    "바꾼 점검 주기와 그 이유"
   ],
   "check_missing": [
    "무엇을 보고 그 원인이라고 판단했습니까",
    "그 뒤 정지 시간이나 주기가 달라졌습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "가동을 지키는 보전 체계",
     "performance": "가동률 · 정지 시간 · 보전 비용"
    },
    "public_execution_agency": {
     "output": "시설 관리 실적과 점검 기록",
     "performance": "안전 · 절차 준수 · 예산 집행"
    }
   }
  },
  {
   "career_family_id": "ME_AUTOMATION",
   "problem": "사람이 하던 것을 기계가 반복해서 하게 만드는 일",
   "knowledge": [
    "control",
    "mechatronics",
    "robotics",
    "dynamics",
    "programming"
   ],
   "work": [
    "자동화 범위를 정한다",
    "셀과 장치를 설계한다",
    "제어를 짠다",
    "시운전한다"
   ],
   "decisions": [
    "자동화 범위",
    "구동과 센서 선정",
    "경로와 속도",
    "안전 설계"
   ],
   "outputs": [
    "셀 레이아웃",
    "제어 프로그램",
    "시운전 기록",
    "작업 표준"
   ],
   "performance": [
    "사이클 타임",
    "반복 정밀도",
    "가동률",
    "안전",
    "투자 회수"
   ],
   "tool_categories": [
    "sim_control",
    "manufacturing",
    "code"
   ],
   "evidence_you_can_show": [
    "직접 돌린 장치와 그 조건",
    "줄인 사이클 타임",
    "안전을 어떻게 걸었는지"
   ],
   "check_missing": [
    "무엇을 자동화 대상으로 골랐고 그 이유는 무엇입니까",
    "전후 사이클 타임이나 불량이 달라졌습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "돌아가는 자동화 설비",
     "performance": "사이클 타임 · 가동률 · 투자 회수"
    },
    "government_research_institute": {
     "output": "자동화 기술 과제 산출물",
     "performance": "과제 목표 · 현장 적용 가능성"
    }
   }
  },
  {
   "career_family_id": "ME_THERMAL_FLUID",
   "problem": "열과 유체가 지나가는 길을 설계해 온도와 압력을 맞추는 일",
   "knowledge": [
    "heat_transfer",
    "fluid_mechanics",
    "thermodynamics",
    "cfd",
    "energy_systems",
    "hvac"
   ],
   "work": [
    "열과 유동 부하를 계산한다",
    "냉각과 계통을 설계한다",
    "운전 조건을 정한다",
    "성능을 검증한다"
   ],
   "decisions": [
    "냉각 방식",
    "유량과 온도 조건",
    "장비 용량",
    "계통 구성"
   ],
   "outputs": [
    "부하 계산서",
    "계통도",
    "해석 결과",
    "성능 시험 결과"
   ],
   "performance": [
    "온도",
    "압력 손실",
    "효율",
    "에너지 비용",
    "소음"
   ],
   "tool_categories": [
    "cfd",
    "code",
    "test"
   ],
   "evidence_you_can_show": [
    "직접 세운 계산과 가정",
    "조건을 바꿔 견준 결과",
    "측정값과 맞춰 본 기록"
   ],
   "check_missing": [
    "어떤 조건에서 계산했습니까",
    "그 결과로 무엇을 정했습니까",
    "실제 측정과 비교해 보셨습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "제품 냉각 성능과 그 설계 근거",
     "performance": "온도 · 신뢰성 · 소비 전력 · 원가"
    },
    "government_research_institute": {
     "output": "열·유동 기술 과제 산출물",
     "performance": "과제 목표 · 기술성 · 이전 가능성"
    },
    "university_lab": {
     "output": "논문과 방법론, 데이터",
     "performance": "새로움 · 재현성 · 학술적 기여"
    },
    "regulator_technical_body": {
     "output": "안전·기술 검토 보고서",
     "performance": "정확성 · 추적성 · 기준 부합"
    }
   }
  },
  {
   "career_family_id": "ME_MATERIALS",
   "problem": "무엇으로 만들지 고르고 왜 깨졌는지 밝히는 일",
   "knowledge": [
    "materials",
    "solid_mechanics",
    "tribology",
    "fea",
    "experiment"
   ],
   "work": [
    "재질을 고른다",
    "파면을 본다",
    "열처리와 표면 처리를 정한다",
    "대체재를 검토한다"
   ],
   "decisions": [
    "재질",
    "열처리 조건",
    "표면 처리",
    "대체 여부"
   ],
   "outputs": [
    "재질 선정 근거",
    "파손 분석 보고",
    "재료 시험 결과"
   ],
   "performance": [
    "강도",
    "내식과 내마모",
    "원가",
    "수급",
    "재발 방지"
   ],
   "tool_categories": [
    "test",
    "fea"
   ],
   "evidence_you_can_show": [
    "재질을 고른 근거",
    "직접 본 파면과 거기서 읽은 것",
    "시험으로 확인한 물성"
   ],
   "check_missing": [
    "무엇을 보고 그 재질을 골랐습니까",
    "파손 원인을 무엇으로 확인했습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "재질 변경과 재발 방지 대책",
     "performance": "원가 · 품질 · 수급"
    },
    "university_lab": {
     "output": "재료 거동에 대한 논문과 데이터",
     "performance": "새로움 · 재현성"
    },
    "regulator_technical_body": {
     "output": "파손 원인에 대한 기술 판단",
     "performance": "정확성 · 추적성"
    }
   }
  },
  {
   "career_family_id": "ME_SYSTEMS_TPM",
   "problem": "여러 사람이 만드는 것을 하나로 맞물리게 하고 일정 안에 끝내는 일",
   "knowledge": [
    "systems_engineering",
    "reliability",
    "statistics",
    "machine_design"
   ],
   "work": [
    "요구사항을 나눈다",
    "인터페이스를 정한다",
    "일정과 자원을 짠다",
    "변경을 관리한다"
   ],
   "decisions": [
    "요구 배분",
    "우선순위",
    "변경 승인",
    "위험 대응"
   ],
   "outputs": [
    "요구사항 문서",
    "추적표",
    "일정과 마일스톤",
    "변경 이력",
    "검토 회의록"
   ],
   "performance": [
    "요구 충족",
    "일정",
    "재작업",
    "추적 가능성"
   ],
   "tool_categories": [
    "plm",
    "code"
   ],
   "evidence_you_can_show": [
    "직접 쪼갠 일감과 그 근거",
    "지킨 마일스톤",
    "조정한 변경과 그 영향"
   ],
   "check_missing": [
    "무엇을 직접 정했습니까",
    "일정이 밀렸을 때 무엇을 버렸습니까",
    "그 결정의 근거를 어디에 남겼습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "일정 안에 끝난 개발 과제",
     "performance": "일정 · 요구 충족 · 재작업"
    },
    "government_research_institute": {
     "output": "과제 계획과 마일스톤 달성",
     "performance": "과제 목표 · 집행 · 후속 연결"
    },
    "public_execution_agency": {
     "output": "사업 기획과 집행 실적",
     "performance": "집행률 · 절차 · 일정"
    }
   }
  },
  {
   "career_family_id": "ME_APPLICATIONS_FIELD",
   "problem": "고객 현장에서 안 되는 것을 되게 만드는 일",
   "knowledge": [
    "hvac",
    "machine_design",
    "measurement",
    "manufacturing",
    "control"
   ],
   "work": [
    "현장 조건을 본다",
    "장비를 맞춘다",
    "시운전하고 교육한다",
    "문제를 받아 되짚는다"
   ],
   "decisions": [
    "설치와 운전 조건",
    "사양 조정",
    "현장 대응 범위"
   ],
   "outputs": [
    "시운전 기록",
    "현장 보고",
    "운전 지침",
    "개선 요청"
   ],
   "performance": [
    "현장 가동",
    "고객 응답 시간",
    "재방문",
    "재구매"
   ],
   "tool_categories": [
    "test",
    "cad",
    "manufacturing"
   ],
   "evidence_you_can_show": [
    "직접 다룬 장비와 조건",
    "해결한 현장 문제",
    "남긴 지침"
   ],
   "check_missing": [
    "현장에서 무엇이 문제였고 무엇을 바꿨습니까",
    "그 뒤로 같은 문제가 줄었습니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "현장에서 도는 장비와 고객 만족",
     "performance": "가동 · 응답 시간 · 재구매"
    },
    "public_execution_agency": {
     "output": "기술 지원 실적",
     "performance": "수혜자 성과 · 집행"
    }
   }
  },
  {
   "career_family_id": "ME_CONSULTING",
   "problem": "남의 기술 문제를 받아 기한 안에 결정에 쓸 답을 내는 일",
   "knowledge": [
    "energy_systems",
    "hvac",
    "systems_engineering",
    "statistics",
    "fea"
   ],
   "work": [
    "문제를 풀 수 있는 형태로 바꾼다",
    "대안을 견준다",
    "타당성을 본다",
    "보고하고 설득한다"
   ],
   "decisions": [
    "분석 범위",
    "비교 기준",
    "권고안",
    "가정의 공개 수준"
   ],
   "outputs": [
    "기술 검토서",
    "대안 비교표",
    "타당성 보고",
    "발표 자료"
   ],
   "performance": [
    "고객 요구 충족",
    "일정",
    "가정의 타당성",
    "재의뢰"
   ],
   "tool_categories": [
    "code",
    "fea",
    "cfd"
   ],
   "evidence_you_can_show": [
    "받은 질문을 다시 세운 기록",
    "대안을 견준 기준",
    "고객이 그 결과로 정한 것"
   ],
   "check_missing": [
    "무엇을 비교 기준으로 세웠습니까",
    "그 결과로 상대가 무엇을 정했습니까"
   ],
   "org_variants": {
    "engineering_consulting": {
     "output": "고객 결정에 쓰이는 기술 검토서",
     "performance": "납기 · 재의뢰 · 수주"
    },
    "think_tank": {
     "output": "정책 판단에 쓰이는 기술 분석",
     "performance": "추적 가능성 · 중립성 · 시의성"
    },
    "public_execution_agency": {
     "output": "사업 타당성 검토",
     "performance": "절차 · 근거 · 일정"
    }
   }
  },
  {
   "career_family_id": "ME_RESEARCH_SCIENTIST",
   "problem": "아직 답이 없는 질문을 세우고 방법으로 답하는 일",
   "knowledge": [
    "experiment",
    "numerical",
    "statistics",
    "optimization",
    "materials",
    "cfd",
    "fea"
   ],
   "work": [
    "연구 질문을 세운다",
    "방법을 고른다",
    "실험하고 해석한다",
    "쓰고 발표한다"
   ],
   "decisions": [
    "연구 질문",
    "방법과 모델",
    "실험 설계",
    "해석의 범위"
   ],
   "outputs": [
    "논문",
    "학위 논문",
    "데이터셋",
    "코드",
    "학회 발표",
    "특허"
   ],
   "performance": [
    "새로움",
    "방법의 타당성",
    "재현성",
    "학술적 기여",
    "과제 목표"
   ],
   "tool_categories": [
    "code",
    "fea",
    "cfd",
    "test"
   ],
   "evidence_you_can_show": [
    "스스로 세운 질문",
    "고른 방법과 그 근거",
    "재현할 수 있게 적은 절차",
    "논문과 데이터"
   ],
   "check_missing": [
    "그 질문을 누가 세웠습니까",
    "방법을 고른 근거는 무엇입니까",
    "다른 사람이 그대로 따라 할 수 있게 남겼습니까"
   ],
   "org_variants": {
    "university_lab": {
     "output": "논문 · 방법 · 데이터",
     "performance": "새로움 · 재현성 · 학술적 기여"
    },
    "government_research_institute": {
     "output": "과제 보고서 · 특허 · 검증된 방법",
     "performance": "과제 목표 · 기술 수준 · 이전 가능성"
    },
    "private_company": {
     "output": "선행 기술 검토와 개념 검증",
     "performance": "사업성 · 기술 난도 해소"
    }
   }
  },
  {
   "career_family_id": "ME_DIGITAL",
   "problem": "엔지니어링에서 나오는 데이터를 다음 사람이 쓸 수 있게 만드는 일",
   "knowledge": [
    "programming",
    "statistics",
    "numerical",
    "cad_drawing",
    "systems_engineering"
   ],
   "work": [
    "반복 계산을 자동으로 돌린다",
    "데이터를 모으고 잇는다",
    "해석과 설계 도구를 만든다",
    "이력을 남긴다"
   ],
   "decisions": [
    "자동화 범위",
    "데이터 구조",
    "검증 방법",
    "도구를 쓸 사람"
   ],
   "outputs": [
    "스크립트와 도구",
    "데이터 파이프라인",
    "대시보드",
    "사용 설명"
   ],
   "performance": [
    "시간 절감",
    "오류 감소",
    "다른 사람의 재사용",
    "데이터 신뢰"
   ],
   "tool_categories": [
    "code",
    "plm",
    "sim_control"
   ],
   "evidence_you_can_show": [
    "직접 만든 도구와 그것이 줄인 시간",
    "다른 사람이 쓴 기록",
    "검증 방법"
   ],
   "check_missing": [
    "그 도구를 누가 썼습니까",
    "쓰기 전과 후에 무엇이 달라졌습니까",
    "결과가 맞다는 것을 어떻게 확인합니까"
   ],
   "org_variants": {
    "private_company": {
     "output": "설계·해석 업무를 줄이는 도구",
     "performance": "시간 절감 · 오류 · 재사용"
    },
    "government_research_institute": {
     "output": "연구 데이터와 분석 도구",
     "performance": "재현성 · 공유 · 과제 목표"
    },
    "university_lab": {
     "output": "공개 코드와 데이터",
     "performance": "재현성 · 인용"
    }
   }
  }
 ]
};
window.PCA_ORG_TYPES = {
 "schema_version": "1.0",
 "note": "조직 유형별 성과 모형. 여기 적힌 것은 **그 유형이 대체로 무엇을 결과로 치는가**이고, 특정 기관의 KPI가 아니다. 특정 기관의 평가 지표는 검증된 자료가 있을 때만 target_organization 쪽에 따로 담는다. 조직 유형은 적합도를 바꾸지 않는다. 같은 응답이면 어느 조직을 골라도 관심·경험·결정 소유·업무 방식·학습 의향이 그대로고, 갈리는 것은 같은 지식이 어떤 산출물로 읽히는가다.",
 "organization_types": [
  {
   "id": "private_company",
   "name_ko": "민간기업",
   "one_line": "제품이나 설비가 시장에서 팔리고 돌아가게 만드는 곳",
   "mission": "정해진 원가와 일정 안에서 성능·품질·납기를 맞춘 제품을 낸다",
   "output_types": [
    "설계안",
    "도면과 사양",
    "해석·시험 결과",
    "설계 검토 자료",
    "공정 조건",
    "불량 대책",
    "양산 이관 자료"
   ],
   "performance_criteria": [
    "성능",
    "품질",
    "신뢰성",
    "원가",
    "납기",
    "제조 가능성",
    "수율"
   ],
   "what_counts_as_value": [
    "판단을 뒷받침해 설계안이나 조건을 고르게 한 것",
    "되돌아가는 일을 줄인 것",
    "다음 사람이 그대로 쓸 수 있게 남긴 것"
   ],
   "reads_your_work_as": "그 결정이 제품의 무엇을 바꿨는가",
   "common_titles": [
    "설계 엔지니어",
    "해석 엔지니어",
    "생산기술",
    "품질 엔지니어"
   ]
  },
  {
   "id": "government_research_institute",
   "name_ko": "정부출연연구기관",
   "one_line": "국가 과제를 받아 기술을 만들고 넘기는 곳",
   "mission": "기관 임무와 과제 목표에 맞는 기술을 개발해 성과로 남긴다",
   "output_types": [
    "과제 보고서",
    "논문",
    "특허",
    "시작품",
    "검증된 방법",
    "데이터셋",
    "기술이전 자료",
    "표준 기여"
   ],
   "performance_criteria": [
    "과제 목표 달성",
    "기술 수준",
    "재현성",
    "이전 가능성",
    "기관 임무 부합",
    "후속 과제 연결"
   ],
   "what_counts_as_value": [
    "과제 목표 가운데 한 덩어리를 맡아 끝낸 것",
    "다른 사람이 쓸 수 있게 방법을 정리한 것",
    "결과가 다음 과제나 기업으로 넘어간 것"
   ],
   "reads_your_work_as": "그 결과가 어느 과제 목표에 붙는가",
   "common_titles": [
    "연구원",
    "선임연구원",
    "과제 책임자"
   ]
  },
  {
   "id": "university_lab",
   "name_ko": "대학 · 연구실",
   "one_line": "새로운 것을 묻고 학계가 쓸 수 있게 내놓는 곳",
   "mission": "연구 질문을 세우고 방법으로 답해 학계에 내놓는다",
   "output_types": [
    "논문",
    "학위 논문",
    "방법론",
    "데이터",
    "코드",
    "학회 발표"
   ],
   "performance_criteria": [
    "새로움",
    "방법의 타당성",
    "재현성",
    "학술적 기여",
    "후속 연구 인용"
   ],
   "what_creates_value_note": "지도 교수의 과제와 학생 지도도 함께 읽힌다",
   "what_counts_as_value": [
    "질문을 스스로 세운 것",
    "방법을 고르고 그 선택을 지킨 것",
    "다른 사람이 따라 할 수 있게 적은 것"
   ],
   "reads_your_work_as": "그 결과가 무엇을 처음 보였는가",
   "common_titles": [
    "대학원생",
    "박사후연구원",
    "연구교수"
   ]
  },
  {
   "id": "think_tank",
   "name_ko": "싱크탱크 · 정책연구기관",
   "one_line": "기술을 정책 판단에 쓸 수 있는 말로 옮기는 곳",
   "mission": "기술과 산업을 분석해 정책 결정에 쓸 근거를 낸다",
   "output_types": [
    "정책 보고서",
    "기술 동향 분석",
    "타당성 검토",
    "지표 설계",
    "자문 의견"
   ],
   "performance_criteria": [
    "근거의 추적 가능성",
    "분석의 중립성",
    "정책 적용 가능성",
    "시의성"
   ],
   "what_counts_as_value": [
    "숫자와 출처를 끝까지 따라갈 수 있게 적은 것",
    "기술 내용을 비전공 결정권자가 읽을 수 있게 옮긴 것",
    "비교 기준을 먼저 세운 것"
   ],
   "reads_your_work_as": "그 분석이 어떤 결정을 가능하게 했는가",
   "common_titles": [
    "연구위원",
    "부연구위원",
    "정책연구원"
   ]
  },
  {
   "id": "public_execution_agency",
   "name_ko": "위탁 · 집행형 공공기관",
   "one_line": "정해진 사업을 기한 안에 집행하는 곳",
   "mission": "사업을 기획하고 평가하고 집행해 예산 안에서 끝낸다",
   "output_types": [
    "사업 기획서",
    "공고와 과제 평가 자료",
    "집행 실적",
    "점검 보고",
    "정산 자료"
   ],
   "performance_criteria": [
    "집행률",
    "일정 준수",
    "절차 적법성",
    "수혜자 성과",
    "감사 대응"
   ],
   "what_counts_as_value": [
    "일정과 자원을 맞춰 끝낸 것",
    "근거를 남겨 나중에 설명할 수 있게 한 것",
    "여러 기관을 맞물리게 조정한 것"
   ],
   "reads_your_work_as": "그 일을 기한과 절차 안에서 끝냈는가",
   "common_titles": [
    "사업 담당",
    "평가 담당",
    "기술 전문위원"
   ]
  },
  {
   "id": "regulator_technical_body",
   "name_ko": "규제 · 기술지원기관",
   "one_line": "기준에 맞는지를 보고 판단을 남기는 곳",
   "mission": "기준과 규격에 따라 기술을 검토하고 판단 근거를 남긴다",
   "output_types": [
    "기술 검토 보고서",
    "시험·인증 결과",
    "기준 해석",
    "안전성 평가",
    "지침"
   ],
   "performance_criteria": [
    "정확성",
    "추적 가능성",
    "기준 부합",
    "안전",
    "일관성"
   ],
   "what_counts_as_value": [
    "판단의 근거를 기준 조항까지 이어 적은 것",
    "같은 사안에 같은 판단이 나오게 한 것",
    "놓치면 안 되는 것을 미리 걸러낸 것"
   ],
   "reads_your_work_as": "그 판단을 다른 사람이 다시 따라갈 수 있는가",
   "common_titles": [
    "심사원",
    "시험평가원",
    "기술위원"
   ]
  },
  {
   "id": "engineering_consulting",
   "name_ko": "엔지니어링 · 기술 컨설팅",
   "one_line": "남의 문제를 받아 기한 안에 답을 내는 곳",
   "mission": "고객의 기술 문제를 맡아 분석하고 안을 내놓는다",
   "output_types": [
    "기술 검토서",
    "해석 보고서",
    "설계 대안 비교",
    "타당성 검토",
    "현장 진단"
   ],
   "performance_criteria": [
    "고객 요구 충족",
    "일정",
    "재작업 없음",
    "수주로 이어짐",
    "재의뢰"
   ],
   "what_counts_as_value": [
    "받은 질문을 풀 수 있는 문제로 바꾼 것",
    "고객이 그대로 결정에 쓸 수 있게 낸 것",
    "같은 방법을 다른 건에도 쓴 것"
   ],
   "reads_your_work_as": "그 결과물로 고객이 무엇을 결정했는가",
   "common_titles": [
    "컨설턴트",
    "해석 엔지니어",
    "기술 자문"
   ]
  }
 ]
};
window.PCA_EVIDENCE_MAP = {
 "schema_version": "1.0",
 "major_id": "ME",
 "note": "직무군마다 '무엇을 확인해야 그 직무를 설명할 수 있는가' 를 적어 둔 표. 증거 사다리(E0~E5)가 경험 하나의 깊이를 보는 것과 달리 여기는 **그 직무에 필요한 영역을 얼마나 넓게 확인했는가**를 본다. 둘을 합쳐 하나의 점수로 만들지 않는다. importance 가 optional 인 것이 비어 있다고 불리하게 읽지 않는다. minimum_depth 는 그 영역을 '확인' 으로 올리기 위해 걸린 경험이 닿아야 하는 사다리 칸이고, 임의로 올리지 않는다.",
 "depth_note": "E0 활동 · E1 판단 · E2 산출물 · E3 성과 · E4 조직 가치 · E5 반복 가능성.",
 "matching_note": "keywords 는 응시자가 **직접 적은 글**에서 찾는다. tool_categories 는 tool_only_ok 가 true 인 영역에서만 쓴다. 도구 이름 하나가 핵심 영역을 채우지 않는다.",
 "families": [
  {
   "career_family_id": "ME_DESIGN_PRODUCT",
   "evidence_requirements": [
    {
     "evidence_id": "MD_REQUIREMENT",
     "label": "요구사항 해석",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "주어진 조건을 치수·하중·성능처럼 따질 수 있는 값으로 옮겨 본 것",
     "match": {
      "keywords": [
       "요구조건",
       "요구사항",
       "사양",
       "스펙",
       "제약",
       "목표 성능",
       "설계 조건"
      ],
      "courses": [
       "기계요소설계",
       "기구학"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MD_ALTERNATIVES",
     "label": "설계안 생성과 비교",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "안을 둘 이상 놓고 기준을 세워 하나를 고른 것",
     "match": {
      "keywords": [
       "설계안",
       "대안",
       "안을 비교",
       "형상안",
       "비교",
       "트레이드오프",
       "선정"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "MD_SIZING",
     "label": "형상·치수·재질 판단",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "하중과 재질을 근거로 두께·형상·재질을 정한 것",
     "match": {
      "keywords": [
       "두께",
       "치수",
       "형상",
       "재질",
       "소재",
       "단면",
       "리브",
       "보강",
       "안전율"
      ],
      "courses": [
       "정역학",
       "재료역학",
       "기계요소설계"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MD_CAD_OUTPUT",
     "label": "CAD·도면 산출물",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "도면이나 3D 모델을 끝까지 만들어 남긴 것",
     "match": {
      "keywords": [
       "도면",
       "3d 모델",
       "모델링",
       "cad",
       "조립도",
       "부품표"
      ],
      "courses": [],
      "tool_categories": [
       "cad"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MD_REVIEW",
     "label": "구조·기능 검토",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "설계안이 버티는지 작동하는지를 계산이나 검토로 확인한 것",
     "match": {
      "keywords": [
       "구조 검토",
       "설계 검토",
       "해석",
       "검도",
       "강도 검토",
       "간섭"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "MD_VALIDATION",
     "label": "검증 또는 설계 리뷰",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "최종안을 기준이나 시험과 견주어 확인한 것",
     "match": {
      "keywords": [
       "검증",
       "시험",
       "리뷰",
       "기준과 비교",
       "합격",
       "통과",
       "실험값"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "MD_TOLERANCE",
     "label": "공차",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "조립과 가공을 생각해 공차를 배분한 것",
     "match": {
      "keywords": [
       "공차",
       "기하공차",
       "gd&t",
       "끼워맞춤",
       "조립성"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MD_DFM",
     "label": "제조 가능성",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "만들 수 있는지를 설계 단계에서 함께 본 것",
     "match": {
      "keywords": [
       "제조성",
       "가공성",
       "양산",
       "금형",
       "사출",
       "용접",
       "dfm"
      ],
      "courses": [
       "제조공학 · 가공"
      ],
      "tool_categories": [
       "manufacturing"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MD_COST",
     "label": "원가",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "원가나 수급을 설계 판단에 넣은 것",
     "match": {
      "keywords": [
       "원가",
       "비용",
       "단가",
       "수급",
       "표준품"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MD_CHANGE",
     "label": "변경 관리",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "설계 변경을 이력으로 남긴 것",
     "match": {
      "keywords": [
       "설계변경",
       "개정",
       "리비전",
       "형상관리",
       "eco"
      ],
      "courses": [],
      "tool_categories": [
       "plm"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MD_INTERFACE",
     "label": "인터페이스",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "다른 부품이나 다른 담당과 맞물리는 자리를 정한 것",
     "match": {
      "keywords": [
       "인터페이스",
       "체결",
       "결합",
       "경계",
       "협의"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MD_BUILD_FEEDBACK",
     "label": "실제 제작·시험 되먹임",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "만들어 보고 나온 문제를 설계로 되돌린 것",
     "match": {
      "keywords": [
       "시제품",
       "프로토타입",
       "제작",
       "조립",
       "되먹임",
       "재설계"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "MD_STANDARD",
     "label": "산업 규격",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "그 산업의 규격이나 인증 요건을 설계에 넣은 것",
     "match": {
      "keywords": [
       "규격",
       "표준",
       "iso",
       "ks",
       "인증",
       "법규"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MD_TOOL",
     "label": "설계 도구 사용",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E0",
     "description": "CAD 계열 도구를 써 본 것",
     "match": {
      "keywords": [
       "solidworks",
       "catia",
       "creo",
       "nx",
       "autocad",
       "inventor",
       "fusion"
      ],
      "courses": [],
      "tool_categories": [
       "cad"
      ],
      "tool_only_ok": true
     },
     "gap_kind": "tool_purpose"
    }
   ]
  },
  {
   "career_family_id": "ME_CAE_SIM",
   "evidence_requirements": [
    {
     "evidence_id": "CAE_PROBLEM",
     "label": "문제 정의",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇을 왜 해석해야 하는지를 스스로 세운 것",
     "match": {
      "keywords": [
       "문제 정의",
       "해석 목적",
       "무엇을 해석",
       "검토 대상",
       "해석 범위"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "CAE_MODEL_SETUP",
     "label": "모델 생성",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "형상을 단순화하고 요소와 격자를 정한 것",
     "match": {
      "keywords": [
       "모델링",
       "메시",
       "격자",
       "요소",
       "단순화",
       "모델 구축"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "tool_purpose"
    },
    {
     "evidence_id": "CAE_ASSUMPTION",
     "label": "가정 정리",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "어떤 가정을 두고 풀었는지를 적어 둔 것",
     "match": {
      "keywords": [
       "가정",
       "단순화 조건",
       "이상화",
       "assumption"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "CAE_BOUNDARY",
     "label": "경계 조건과 하중",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "구속과 하중을 실제와 맞춰 정한 것",
     "match": {
      "keywords": [
       "경계 조건",
       "구속",
       "하중 조건",
       "boundary",
       "고정단",
       "입력 조건"
      ],
      "courses": [
       "정역학",
       "재료역학"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "CAE_MATERIAL",
     "label": "재료·모델 변수",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "재료 모델과 변수를 근거를 두고 고른 것",
     "match": {
      "keywords": [
       "재료 모델",
       "물성",
       "탄성",
       "소성",
       "난류 모델",
       "모델 변수"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "CAE_RUN",
     "label": "해석 수행",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "실제로 돌려 결과를 낸 것",
     "match": {
      "keywords": [
       "해석 수행",
       "해석 결과",
       "시뮬레이션",
       "계산 결과",
       "응력",
       "변형",
       "온도 분포"
      ],
      "courses": [],
      "tool_categories": [
       "fea",
       "cfd"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "CAE_INTERPRET",
     "label": "결과 해석",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "나온 값이 무엇을 뜻하는지 읽어 낸 것",
     "match": {
      "keywords": [
       "결과 해석",
       "원인",
       "집중",
       "분포",
       "경향",
       "판독"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "CAE_VALIDATION",
     "label": "검증",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "결과를 시험값·이론·다른 방법과 견주어 맞는지 본 것",
     "match": {
      "keywords": [
       "검증",
       "실험값",
       "시험 결과",
       "이론값",
       "비교",
       "오차",
       "correlation"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "CAE_DECISION_LINK",
     "label": "설계 판단 연결",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "해석 결과가 실제로 어떤 결정에 쓰였는지",
     "match": {
      "keywords": [
       "설계안 선택",
       "치수 변경",
       "재질 변경",
       "설계 반영",
       "개선안",
       "결정에 사용"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "CAE_CONVERGENCE",
     "label": "수렴 확인",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "수렴했는지를 보고 기준을 정한 것",
     "match": {
      "keywords": [
       "수렴",
       "convergence",
       "잔차",
       "residual"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "CAE_MESH_INDEP",
     "label": "격자 독립성",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "격자를 바꿔 가며 결과가 안 변하는 지점을 찾은 것",
     "match": {
      "keywords": [
       "격자 독립",
       "메시 민감도",
       "mesh independence",
       "격자 크기 비교"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "CAE_PARAM_STUDY",
     "label": "변수 연구",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "조건을 바꿔 가며 경향을 본 것",
     "match": {
      "keywords": [
       "민감도",
       "파라미터",
       "변수 연구",
       "조건을 바꿔",
       "케이스 비교"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "CAE_AUTOMATION",
     "label": "자동화·스크립트",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "반복 해석을 스크립트로 돌린 것",
     "match": {
      "keywords": [
       "스크립트",
       "자동화",
       "apdl",
       "python",
       "매크로",
       "배치"
      ],
      "courses": [],
      "tool_categories": [
       "code"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "CAE_DOC",
     "label": "해석 문서화",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "다른 사람이 따라 할 수 있게 적어 둔 것",
     "match": {
      "keywords": [
       "해석 보고서",
       "절차서",
       "리포트",
       "문서화",
       "기록"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "CAE_HPC",
     "label": "대규모 계산",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "클러스터나 병렬 계산을 써 본 것",
     "match": {
      "keywords": [
       "hpc",
       "클러스터",
       "병렬",
       "슈퍼컴"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "tool_purpose"
    },
    {
     "evidence_id": "CAE_OPT",
     "label": "최적화",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "목적과 제약을 세워 설계 변수를 훑은 것",
     "match": {
      "keywords": [
       "최적화",
       "optimization",
       "형상 최적",
       "위상 최적"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "CAE_TOOL",
     "label": "해석 도구 사용",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E0",
     "description": "상용 해석 도구를 써 본 것",
     "match": {
      "keywords": [
       "ansys",
       "abaqus",
       "nastran",
       "fluent",
       "comsol",
       "star-ccm",
       "openfoam",
       "ls-dyna"
      ],
      "courses": [],
      "tool_categories": [
       "fea",
       "cfd"
      ],
      "tool_only_ok": true
     },
     "gap_kind": "tool_purpose"
    }
   ]
  },
  {
   "career_family_id": "ME_RND",
   "evidence_requirements": [
    {
     "evidence_id": "RND_QUESTION",
     "label": "연구 문제 정의",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇을 먼저 풀어야 하는지를 스스로 좁힌 것",
     "match": {
      "keywords": [
       "연구 문제",
       "과제 정의",
       "무엇을 먼저",
       "핵심 난제",
       "주제 선정"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "RND_HYPOTHESIS",
     "label": "가설과 목표",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "되는지 안 되는지를 가를 기준을 미리 세운 것",
     "match": {
      "keywords": [
       "가설",
       "목표치",
       "성공 기준",
       "판단 기준",
       "목표 성능"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "RND_METHOD",
     "label": "방법 선택",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "여러 방법 가운데 하나를 고르고 그 까닭을 댄 것",
     "match": {
      "keywords": [
       "방법 선택",
       "접근 방식",
       "기법",
       "방식 비교",
       "방법론"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "RND_DESIGN",
     "label": "실험·모델 설계",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "무엇을 어떻게 확인할지 설계한 것",
     "match": {
      "keywords": [
       "실험 설계",
       "시험 계획",
       "모델 설계",
       "doe",
       "조건 설계"
      ],
      "courses": [
       "실험계획법",
       "기계공학실험"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RND_DATA",
     "label": "데이터 해석",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "나온 값을 읽어 결론을 낸 것",
     "match": {
      "keywords": [
       "데이터 분석",
       "결과 분석",
       "경향",
       "통계",
       "해석 결과"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RND_VALIDATION",
     "label": "검증",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "결과가 맞다는 것을 다른 방법이나 기준으로 확인한 것",
     "match": {
      "keywords": [
       "검증",
       "재현",
       "반복 실험",
       "비교 검증",
       "오차"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "RND_JUDGEMENT",
     "label": "결과 판단",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "계속할지 접을지를 근거를 들어 정한 것",
     "match": {
      "keywords": [
       "중단",
       "계속",
       "판단",
       "채택",
       "기각",
       "다음 단계"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "RND_OUTPUT",
     "label": "산출물",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "시작품·보고서·논문·특허 가운데 남은 것",
     "match": {
      "keywords": [
       "시작품",
       "프로토타입",
       "보고서",
       "논문",
       "특허",
       "poc",
       "개념 검증"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RND_PROPOSAL",
     "label": "제안서·공고 해석",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "과제 공고나 제안서를 읽고 할 일을 나눈 것",
     "match": {
      "keywords": [
       "제안서",
       "공고",
       "rfp",
       "과제요청서",
       "기획"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "RND_KPI",
     "label": "성과지표",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇으로 성과를 잴지 정한 것",
     "match": {
      "keywords": [
       "kpi",
       "성과지표",
       "정량 목표",
       "달성률"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "RND_MILESTONE",
     "label": "중간 점검",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "마일스톤을 두고 일정 안에서 끌고 간 것",
     "match": {
      "keywords": [
       "마일스톤",
       "중간 점검",
       "일정",
       "단계 평가"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RND_RESOURCE",
     "label": "예산·자원",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "사람과 돈과 장비를 배치해 본 것",
     "match": {
      "keywords": [
       "예산",
       "자원",
       "장비 확보",
       "인력",
       "집행"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "RND_COLLAB",
     "label": "협업",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "다른 기관이나 다른 분야와 맞물려 일한 것",
     "match": {
      "keywords": [
       "공동연구",
       "산학",
       "협업",
       "컨소시엄",
       "타 기관"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RND_TRANSFER",
     "label": "기술이전",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "결과가 다음 단계나 바깥으로 넘어간 것",
     "match": {
      "keywords": [
       "기술이전",
       "이관",
       "상용화",
       "사업화",
       "양산 이관"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "RND_OWNERSHIP",
     "label": "과제 소유",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E4",
     "description": "과제의 한 덩어리를 끝까지 맡아 본 것",
     "match": {
      "keywords": [
       "과제 책임",
       "총괄",
       "세부 과제",
       "wp",
       "주관"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    }
   ]
  },
  {
   "career_family_id": "ME_TEST_VV",
   "evidence_requirements": [
    {
     "evidence_id": "TV_REQUIREMENT",
     "label": "검증 대상 정의",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇이 만족돼야 합격인지를 요구사항에서 끌어낸 것",
     "match": {
      "keywords": [
       "요구사항",
       "합격 기준",
       "규격",
       "판정 기준",
       "검증 항목"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "TV_PLAN",
     "label": "시험 계획",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "조건·반복 수·측정 지점을 정해 계획으로 남긴 것",
     "match": {
      "keywords": [
       "시험 계획",
       "시험 조건",
       "반복",
       "측정 지점",
       "시나리오"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "TV_SETUP",
     "label": "지그·계측 구성",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇으로 어디를 잴지 정하고 붙여 본 것",
     "match": {
      "keywords": [
       "지그",
       "센서",
       "계측",
       "daq",
       "스트레인",
       "가속도계",
       "열전대"
      ],
      "courses": [],
      "tool_categories": [
       "test"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "tool_purpose"
    },
    {
     "evidence_id": "TV_EXECUTE",
     "label": "시험 수행",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "조건을 통제하며 실제로 돌려 데이터를 낸 것",
     "match": {
      "keywords": [
       "시험 수행",
       "측정 데이터",
       "계측 결과",
       "시험 결과"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "TV_JUDGE",
     "label": "판정",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "기준과 견주어 합격과 불합격을 가른 것",
     "match": {
      "keywords": [
       "판정",
       "합격",
       "불합격",
       "기준 대비",
       "통과"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "TV_REPORT",
     "label": "시험 보고",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "다른 사람이 읽고 따라갈 수 있게 남긴 것",
     "match": {
      "keywords": [
       "시험 보고서",
       "성적서",
       "결과 보고",
       "기록"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "TV_UNCERTAINTY",
     "label": "불확도",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "측정이 얼마나 흔들리는지를 따져 본 것",
     "match": {
      "keywords": [
       "불확도",
       "오차",
       "반복성",
       "재현성",
       "교정"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "TV_CORRELATION",
     "label": "해석과 맞춰 보기",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "시험값과 해석값을 맞춰 모델을 고친 것",
     "match": {
      "keywords": [
       "correlation",
       "해석과 비교",
       "모델 보정",
       "시험 해석 비교"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "TV_FEEDBACK",
     "label": "설계 되먹임",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "시험에서 나온 것이 설계로 돌아간 것",
     "match": {
      "keywords": [
       "설계 반영",
       "재설계",
       "개선",
       "되먹임",
       "시정"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "TV_AUTOMATION",
     "label": "시험 자동화",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "데이터 수집과 처리를 자동으로 돌린 것",
     "match": {
      "keywords": [
       "자동 측정",
       "스크립트",
       "labview",
       "데이터 처리 자동화"
      ],
      "courses": [],
      "tool_categories": [
       "code",
       "test"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "TV_STANDARD",
     "label": "시험 규격",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "그 산업의 시험 규격을 따라 해 본 것",
     "match": {
      "keywords": [
       "규격 시험",
       "iso",
       "astm",
       "ks",
       "인증 시험"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "TV_ENV",
     "label": "환경 시험",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "온습도·진동·충격 같은 환경 조건에서 시험한 것",
     "match": {
      "keywords": [
       "환경 시험",
       "진동 시험",
       "충격",
       "항온항습",
       "염수분무"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    }
   ]
  },
  {
   "career_family_id": "ME_MANUFACTURING",
   "evidence_requirements": [
    {
     "evidence_id": "MF_PROCESS_SELECT",
     "label": "공정 선정",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "어떤 방법으로 만들지 고르고 그 까닭을 댄 것",
     "match": {
      "keywords": [
       "공정 선정",
       "가공 방법",
       "제조 방식",
       "공법",
       "공정 비교"
      ],
      "courses": [
       "제조공학 · 가공"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "MF_SEQUENCE",
     "label": "작업 순서",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇을 먼저 하고 무엇을 나중에 할지 정한 것",
     "match": {
      "keywords": [
       "작업 순서",
       "공정 순서",
       "라인 구성",
       "흐름",
       "레이아웃"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MF_CONDITION",
     "label": "가공 조건",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "속도·이송·온도 같은 조건을 정해 본 것",
     "match": {
      "keywords": [
       "가공 조건",
       "절삭 조건",
       "성형 조건",
       "용접 조건",
       "파라미터"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MF_TOOLING",
     "label": "치공구·설비",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "지그나 금형이나 설비를 고르거나 설계한 것",
     "match": {
      "keywords": [
       "치공구",
       "지그",
       "금형",
       "설비",
       "고정구",
       "툴링"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MF_STANDARD_DOC",
     "label": "작업 표준",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "현장이 그대로 따라 할 수 있게 남긴 것",
     "match": {
      "keywords": [
       "작업 표준",
       "작업 지시",
       "sop",
       "표준서",
       "공정도"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MF_RESULT",
     "label": "개선 결과",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "바꾼 뒤 수율·시간·불량이 어떻게 달라졌는지",
     "match": {
      "keywords": [
       "수율",
       "사이클 타임",
       "불량률",
       "생산량",
       "개선 전후",
       "감소",
       "단축"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "MF_INSPECTION",
     "label": "검사 지점",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "어디서 무엇을 봐야 하는지 정한 것",
     "match": {
      "keywords": [
       "검사",
       "측정 지점",
       "품질 포인트",
       "관리 항목"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MF_DFM_REVIEW",
     "label": "제조 가능성 검토",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "설계를 받아 만들 수 있는지 되돌려 본 것",
     "match": {
      "keywords": [
       "제조성 검토",
       "양산성",
       "dfm",
       "설계 피드백"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MF_SAFETY",
     "label": "안전",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "작업 안전을 설비와 절차에 넣은 것",
     "match": {
      "keywords": [
       "안전",
       "방호",
       "위험성 평가",
       "리스크"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MF_TRANSFER",
     "label": "양산 이관",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "시작 단계에서 양산으로 넘긴 것",
     "match": {
      "keywords": [
       "양산 이관",
       "p1",
       "양산 준비",
       "초도",
       "이관"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "MF_CAM",
     "label": "CAM·CNC",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "가공 경로를 직접 만들어 돌려 본 것",
     "match": {
      "keywords": [
       "cam",
       "cnc",
       "g코드",
       "가공 경로",
       "머시닝"
      ],
      "courses": [],
      "tool_categories": [
       "manufacturing"
      ],
      "tool_only_ok": true
     },
     "gap_kind": "tool_purpose"
    },
    {
     "evidence_id": "MF_MES",
     "label": "생산 정보 시스템",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "MES·ERP 같은 시스템을 써 본 것",
     "match": {
      "keywords": [
       "mes",
       "erp",
       "생산 관리 시스템",
       "실적 집계"
      ],
      "courses": [],
      "tool_categories": [
       "manufacturing",
       "plm"
      ],
      "tool_only_ok": true
     },
     "gap_kind": "tool_purpose"
    }
   ]
  },
  {
   "career_family_id": "ME_PROCESS",
   "evidence_requirements": [
    {
     "evidence_id": "PR_DATA_READ",
     "label": "공정 데이터 읽기",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "돌고 있는 공정의 데이터를 보고 무엇이 문제인지 좁힌 것",
     "match": {
      "keywords": [
       "공정 데이터",
       "실적",
       "추이",
       "산포",
       "이상",
       "트렌드"
      ],
      "courses": [
       "공업통계",
       "통계"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "PR_FACTOR",
     "label": "원인 인자 가려내기",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "여러 인자 가운데 무엇이 영향을 주는지 가른 것",
     "match": {
      "keywords": [
       "인자",
       "요인",
       "원인 분석",
       "상관",
       "기여도",
       "주효과"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "PR_EXPERIMENT",
     "label": "조건 실험",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "조건을 바꿔 돌려 본 것",
     "match": {
      "keywords": [
       "조건 변경",
       "실험",
       "doe",
       "시험 생산",
       "파일럿",
       "조건 비교"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "PR_WINDOW",
     "label": "공정 창 설정",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "어디부터 어디까지가 되는 범위인지 정한 것",
     "match": {
      "keywords": [
       "공정 창",
       "관리 범위",
       "허용 범위",
       "상하한",
       "스펙 범위"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "PR_RESULT",
     "label": "전후 비교",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "바꾸기 전과 후를 숫자로 견준 것",
     "match": {
      "keywords": [
       "전후 비교",
       "개선 효과",
       "수율",
       "산포 감소",
       "불량 감소",
       "절감"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "PR_CONTROL",
     "label": "관리 기준화",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "바뀐 조건을 지키도록 기준으로 남긴 것",
     "match": {
      "keywords": [
       "관리 기준",
       "관리도",
       "spc",
       "표준화",
       "관리 계획"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "PR_ENERGY",
     "label": "에너지·원가",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "에너지나 원가를 함께 따진 것",
     "match": {
      "keywords": [
       "에너지",
       "전력",
       "원가",
       "용수",
       "스팀",
       "절감"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "PR_SCALEUP",
     "label": "확대 적용",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "한 라인에서 된 것을 다른 라인으로 넓힌 것",
     "match": {
      "keywords": [
       "수평 전개",
       "확대 적용",
       "타 라인",
       "스케일업"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "PR_MODEL",
     "label": "공정 모델",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "공정을 식이나 모델로 옮겨 본 것",
     "match": {
      "keywords": [
       "공정 모델",
       "회귀",
       "예측 모델",
       "시뮬레이션"
      ],
      "courses": [],
      "tool_categories": [
       "code",
       "cfd"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "PR_ANALYTICS",
     "label": "데이터 도구",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "통계·분석 도구를 써 본 것",
     "match": {
      "keywords": [
       "minitab",
       "jmp",
       "python",
       "spc 도구",
       "pandas"
      ],
      "courses": [],
      "tool_categories": [
       "code"
      ],
      "tool_only_ok": true
     },
     "gap_kind": "tool_purpose"
    },
    {
     "evidence_id": "PR_INDUSTRY",
     "label": "산업 특성",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "그 산업 고유의 공정을 다뤄 본 것",
     "match": {
      "keywords": [
       "반도체",
       "이차전지",
       "디스플레이",
       "화학",
       "식품",
       "제약"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    }
   ]
  },
  {
   "career_family_id": "ME_QUALITY_RELIABILITY",
   "evidence_requirements": [
    {
     "evidence_id": "QR_FAILURE_MODE",
     "label": "고장 모드 도출",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇이 어떻게 고장 날 수 있는지 뽑아 본 것",
     "match": {
      "keywords": [
       "고장 모드",
       "fmea",
       "위험 분석",
       "결함 유형",
       "불량 유형"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "QR_ROOT_CAUSE",
     "label": "원인 추적",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "불량의 원인을 끝까지 따라가 본 것",
     "match": {
      "keywords": [
       "원인 분석",
       "근본 원인",
       "5why",
       "특성요인",
       "파면",
       "분석 결과"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "QR_CRITERIA",
     "label": "판정 기준",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇을 불량으로 볼지 기준을 정한 것",
     "match": {
      "keywords": [
       "합격 기준",
       "판정 기준",
       "규격 한계",
       "허용",
       "관리 한계"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "QR_TEST",
     "label": "신뢰성 시험",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "수명이나 가속 시험을 설계해 돌린 것",
     "match": {
      "keywords": [
       "수명 시험",
       "가속 시험",
       "내구",
       "신뢰성 시험",
       "반복 시험"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "QR_DATA",
     "label": "불량 데이터 분석",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "불량 자료를 통계로 본 것",
     "match": {
      "keywords": [
       "불량률",
       "공정 능력",
       "cpk",
       "관리도",
       "산포",
       "분포"
      ],
      "courses": [
       "공업통계",
       "품질공학"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "QR_ACTION",
     "label": "시정 조치와 확인",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "조치하고 그 뒤 재발하지 않았는지 확인한 것",
     "match": {
      "keywords": [
       "시정",
       "대책",
       "재발 방지",
       "유효성 확인",
       "개선 후"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "QR_INSPECTION",
     "label": "검사 체계",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "검사 항목과 주기를 세워 남긴 것",
     "match": {
      "keywords": [
       "검사 기준서",
       "검사 주기",
       "샘플링",
       "수입 검사",
       "출하 검사"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "QR_MSA",
     "label": "측정 시스템",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "재는 도구 자체가 믿을 만한지 본 것",
     "match": {
      "keywords": [
       "msa",
       "gage r&r",
       "교정",
       "측정 시스템"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "QR_SUPPLIER",
     "label": "협력사 품질",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "밖에서 들어오는 것의 품질을 본 것",
     "match": {
      "keywords": [
       "협력사",
       "공급사",
       "수입 검사",
       "외주",
       "sqe"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "QR_CLAIM",
     "label": "고객 클레임",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "현장에서 들어온 문제를 처리한 것",
     "match": {
      "keywords": [
       "클레임",
       "고객 불만",
       "필드 불량",
       "반품",
       "a/s"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "QR_SYSTEM",
     "label": "품질 경영 체계",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "ISO 같은 체계 안에서 일해 본 것",
     "match": {
      "keywords": [
       "iso 9001",
       "iatf",
       "품질 시스템",
       "심사",
       "인증"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "QR_INDUSTRY_STD",
     "label": "산업 규격",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "그 산업의 품질 규격을 다뤄 본 것",
     "match": {
      "keywords": [
       "ppap",
       "apqp",
       "gmp",
       "의료기기",
       "항공 규격"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    }
   ]
  },
  {
   "career_family_id": "ME_EQUIPMENT_MAINT",
   "evidence_requirements": [
    {
     "evidence_id": "EQ_CONDITION",
     "label": "설비 상태 파악",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "설비가 지금 어떤 상태인지 보고 읽은 것",
     "match": {
      "keywords": [
       "설비 상태",
       "점검",
       "진동 측정",
       "온도 측정",
       "소음",
       "이상 징후"
      ],
      "courses": [],
      "tool_categories": [
       "test"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "tool_purpose"
    },
    {
     "evidence_id": "EQ_DIAGNOSIS",
     "label": "고장 진단",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "멈춘 원인을 찾아 짚어 낸 것",
     "match": {
      "keywords": [
       "고장 진단",
       "원인",
       "트러블",
       "정지 원인",
       "분해 점검"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "EQ_DECISION",
     "label": "수리·교체 판단",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "고칠지 바꿀지를 근거를 들어 정한 것",
     "match": {
      "keywords": [
       "교체",
       "수리",
       "오버홀",
       "판단",
       "예비품"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "EQ_PLAN",
     "label": "보전 계획",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "점검 주기와 항목을 세워 남긴 것",
     "match": {
      "keywords": [
       "보전 계획",
       "점검 주기",
       "예방 보전",
       "tbm",
       "cbm",
       "정비 계획"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "EQ_RESULT",
     "label": "가동 결과",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "가동률이나 정지 시간이 어떻게 달라졌는지",
     "match": {
      "keywords": [
       "가동률",
       "정지 시간",
       "mtbf",
       "mttr",
       "고장 건수",
       "감소"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "EQ_RECORD",
     "label": "정비 이력",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "무엇을 언제 어떻게 했는지 남긴 것",
     "match": {
      "keywords": [
       "정비 이력",
       "작업 기록",
       "이력 관리",
       "cmms"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "EQ_IMPROVE",
     "label": "설비 개조",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "설비 자체를 고쳐 좋아지게 한 것",
     "match": {
      "keywords": [
       "개조",
       "개선",
       "설비 변경",
       "자동화 추가",
       "레트로핏"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "EQ_SPARE",
     "label": "예비품 관리",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇을 얼마나 쟁여 둘지 정한 것",
     "match": {
      "keywords": [
       "예비품",
       "자재",
       "재고",
       "구매",
       "리드타임"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "EQ_SAFETY",
     "label": "안전·법정 점검",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "법으로 정해진 점검과 안전을 다룬 것",
     "match": {
      "keywords": [
       "안전 점검",
       "법정 검사",
       "lockout",
       "밀폐 공간",
       "위험 작업"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "EQ_UTILITY",
     "label": "유틸리티",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "공조·압축공기·용수 같은 계통을 다룬 것",
     "match": {
      "keywords": [
       "유틸리티",
       "공조",
       "압축공기",
       "냉각수",
       "보일러",
       "hvac"
      ],
      "courses": [
       "공기조화",
       "냉동공학"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "EQ_PREDICT",
     "label": "예지 보전",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "데이터로 고장을 미리 본 것",
     "match": {
      "keywords": [
       "예지 보전",
       "이상 감지",
       "센서 데이터",
       "예측"
      ],
      "courses": [],
      "tool_categories": [
       "code"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    }
   ]
  },
  {
   "career_family_id": "ME_AUTOMATION",
   "evidence_requirements": [
    {
     "evidence_id": "AU_SCOPE",
     "label": "자동화 범위 결정",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇을 자동화하고 무엇을 사람이 할지 가른 것",
     "match": {
      "keywords": [
       "자동화 범위",
       "대상 선정",
       "수작업",
       "자동화 검토",
       "타당성"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "AU_MECH",
     "label": "기구·셀 설계",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "움직이는 부분과 배치를 설계한 것",
     "match": {
      "keywords": [
       "셀",
       "레이아웃",
       "기구 설계",
       "이송",
       "핸들링",
       "그리퍼"
      ],
      "courses": [
       "동역학",
       "로봇공학"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "AU_COMPONENT",
     "label": "구동기·센서 선정",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "모터와 센서를 조건에 맞춰 고른 것",
     "match": {
      "keywords": [
       "모터",
       "액추에이터",
       "센서",
       "서보",
       "실린더",
       "선정"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "AU_CONTROL",
     "label": "제어 구현",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "제어 로직이나 프로그램을 직접 짠 것",
     "match": {
      "keywords": [
       "plc",
       "제어 로직",
       "시퀀스",
       "래더",
       "로봇 프로그램",
       "티칭"
      ],
      "courses": [],
      "tool_categories": [
       "sim_control",
       "manufacturing"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "AU_COMMISSION",
     "label": "시운전",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "실제로 돌려 조건을 맞춘 것",
     "match": {
      "keywords": [
       "시운전",
       "시험 가동",
       "튜닝",
       "디버깅",
       "현장 조정"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "AU_RESULT",
     "label": "자동화 결과",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "사이클 타임이나 불량이 어떻게 달라졌는지",
     "match": {
      "keywords": [
       "사이클 타임",
       "택트",
       "가동률",
       "생산량",
       "불량",
       "단축"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "AU_SAFETY",
     "label": "안전 설계",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "사람이 다치지 않게 걸어 둔 것",
     "match": {
      "keywords": [
       "안전",
       "인터록",
       "방호",
       "비상 정지",
       "안전 등급",
       "라이트 커튼"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "AU_VISION",
     "label": "비전·검사",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "카메라나 센서로 판정하게 만든 것",
     "match": {
      "keywords": [
       "비전",
       "카메라",
       "영상 검사",
       "판정",
       "이미지"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "AU_SIM",
     "label": "오프라인 검증",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "돌리기 전에 모델로 확인한 것",
     "match": {
      "keywords": [
       "시뮬레이션",
       "오프라인 프로그래밍",
       "디지털 트윈",
       "간섭 확인"
      ],
      "courses": [],
      "tool_categories": [
       "sim_control"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "AU_ROI",
     "label": "투자 회수",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "들인 돈과 얻은 것을 견준 것",
     "match": {
      "keywords": [
       "투자",
       "roi",
       "회수",
       "비용 대비",
       "절감액"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "AU_ROBOT_BRAND",
     "label": "특정 로봇·PLC",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E0",
     "description": "특정 제조사의 로봇이나 PLC 를 다뤄 본 것",
     "match": {
      "keywords": [
       "fanuc",
       "abb",
       "kuka",
       "yaskawa",
       "유니버설",
       "siemens",
       "mitsubishi",
       "ls plc"
      ],
      "courses": [],
      "tool_categories": [
       "manufacturing",
       "sim_control"
      ],
      "tool_only_ok": true
     },
     "gap_kind": "tool_purpose"
    },
    {
     "evidence_id": "AU_AGV",
     "label": "물류 자동화",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "AGV·컨베이어 같은 물류 쪽을 다뤄 본 것",
     "match": {
      "keywords": [
       "agv",
       "amr",
       "컨베이어",
       "창고 자동화",
       "물류"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    }
   ]
  },
  {
   "career_family_id": "ME_THERMAL_FLUID",
   "evidence_requirements": [
    {
     "evidence_id": "TF_LOAD",
     "label": "부하 계산",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "열이나 유량이 얼마나 필요한지 계산한 것",
     "match": {
      "keywords": [
       "부하 계산",
       "열량",
       "유량 계산",
       "발열",
       "용량 산정"
      ],
      "courses": [
       "열역학",
       "열전달",
       "유체역학"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "TF_CONCEPT",
     "label": "계통 구성",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "어떤 방식으로 흐르게 할지 구조를 정한 것",
     "match": {
      "keywords": [
       "계통",
       "유로",
       "냉각 방식",
       "사이클",
       "배관",
       "구성"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "TF_SIZING",
     "label": "장비·조건 선정",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "용량과 운전 조건을 정한 것",
     "match": {
      "keywords": [
       "용량",
       "펌프",
       "팬",
       "열교환기",
       "운전 조건",
       "작동점",
       "선정"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "TF_ANALYSIS",
     "label": "해석·계산 결과",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "계산이나 해석으로 결과를 낸 것",
     "match": {
      "keywords": [
       "열해석",
       "유동해석",
       "cfd",
       "압력 손실",
       "온도 분포",
       "계산 결과"
      ],
      "courses": [],
      "tool_categories": [
       "cfd"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "TF_VALIDATION",
     "label": "성능 확인",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "측정이나 기준과 견주어 맞는지 본 것",
     "match": {
      "keywords": [
       "성능 시험",
       "측정값",
       "실측",
       "기준 대비",
       "검증",
       "오차"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "TF_DECISION",
     "label": "설계 반영",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "결과가 어떤 결정으로 이어졌는지",
     "match": {
      "keywords": [
       "설계 반영",
       "형상 변경",
       "조건 변경",
       "개선안",
       "채택"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "TF_EFFICIENCY",
     "label": "효율·에너지",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "효율이나 에너지 사용량을 따진 것",
     "match": {
      "keywords": [
       "효율",
       "cop",
       "에너지 사용량",
       "절감",
       "손실"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "TF_TRANSIENT",
     "label": "과도 상태",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "시간에 따라 변하는 거동을 본 것",
     "match": {
      "keywords": [
       "과도",
       "transient",
       "기동",
       "정지",
       "시간 응답"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "TF_CONTROL",
     "label": "운전 제어",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "어떻게 운전할지 제어 쪽을 정한 것",
     "match": {
      "keywords": [
       "제어",
       "운전 전략",
       "설정값",
       "인버터",
       "밸브 제어"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "TF_EXPERIMENT",
     "label": "실험 장치",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "직접 실험 장치를 꾸려 재 본 것",
     "match": {
      "keywords": [
       "실험 장치",
       "루프",
       "시험대",
       "열전대",
       "유량계"
      ],
      "courses": [],
      "tool_categories": [
       "test"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "TF_RENEWABLE",
     "label": "신재생·발전",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "발전이나 신재생 계통을 다뤄 본 것",
     "match": {
      "keywords": [
       "발전",
       "신재생",
       "태양열",
       "연료전지",
       "수소",
       "지열"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "TF_HVAC",
     "label": "공조 설계",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "건물이나 설비 공조를 설계해 본 것",
     "match": {
      "keywords": [
       "공조",
       "hvac",
       "덕트",
       "항온항습",
       "클린룸"
      ],
      "courses": [
       "공기조화"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    }
   ]
  },
  {
   "career_family_id": "ME_MATERIALS",
   "evidence_requirements": [
    {
     "evidence_id": "MT_SELECTION",
     "label": "재질 선정",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇으로 만들지 근거를 들어 고른 것",
     "match": {
      "keywords": [
       "재질 선정",
       "소재 선택",
       "재료 비교",
       "물성 비교",
       "대체재"
      ],
      "courses": [
       "기계재료",
       "재료공학"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "MT_PROPERTY",
     "label": "물성 확인",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "쓰려는 물성을 자료나 시험으로 확인한 것",
     "match": {
      "keywords": [
       "물성",
       "인장",
       "경도",
       "피로",
       "크리프",
       "시편",
       "시험 결과"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MT_FAILURE",
     "label": "파손 분석",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "왜 깨졌는지를 파면이나 데이터로 읽은 것",
     "match": {
      "keywords": [
       "파손",
       "파면",
       "균열",
       "파단",
       "fractography",
       "원인 분석"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MT_MECHANISM",
     "label": "손상 기구 판단",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "피로인지 부식인지 과부하인지 가른 것",
     "match": {
      "keywords": [
       "피로",
       "부식",
       "마모",
       "과부하",
       "응력 부식",
       "손상 기구"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MT_COUNTERMEASURE",
     "label": "대책과 확인",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "바꾼 뒤 같은 일이 다시 생기지 않았는지",
     "match": {
      "keywords": [
       "대책",
       "재발 방지",
       "개선 후",
       "효과 확인",
       "적용 결과"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "MT_PROCESS",
     "label": "열처리·표면 처리",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "열처리나 표면 처리 조건을 정한 것",
     "match": {
      "keywords": [
       "열처리",
       "담금질",
       "도금",
       "코팅",
       "표면 처리",
       "침탄"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "MT_MICRO",
     "label": "조직 관찰",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "현미경으로 조직을 보고 읽은 것",
     "match": {
      "keywords": [
       "조직",
       "현미경",
       "sem",
       "eds",
       "미세조직",
       "결정립"
      ],
      "courses": [],
      "tool_categories": [
       "test"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MT_SIM",
     "label": "재료 모델링",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "재료 거동을 모델로 옮겨 본 것",
     "match": {
      "keywords": [
       "재료 모델",
       "소성 모델",
       "피로 수명 해석",
       "손상 모델"
      ],
      "courses": [],
      "tool_categories": [
       "fea"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MT_TRIBOLOGY",
     "label": "마찰·윤활",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "마찰과 마모와 윤활을 다룬 것",
     "match": {
      "keywords": [
       "마찰",
       "마모",
       "윤활",
       "트라이볼로지",
       "접촉"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MT_COMPOSITE",
     "label": "복합재·신소재",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "복합재나 새 소재를 다뤄 본 것",
     "match": {
      "keywords": [
       "복합재",
       "cfrp",
       "적층",
       "신소재",
       "경량화 소재"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "MT_CERT",
     "label": "재료 규격",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "재료 규격이나 인증 자료를 다룬 것",
     "match": {
      "keywords": [
       "재료 규격",
       "astm",
       "mill sheet",
       "성적서",
       "인증"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    }
   ]
  },
  {
   "career_family_id": "ME_SYSTEMS_TPM",
   "evidence_requirements": [
    {
     "evidence_id": "PM_REQUIREMENT",
     "label": "요구사항 분해",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "큰 요구를 담당별로 쪼개 배분한 것",
     "match": {
      "keywords": [
       "요구사항",
       "분해",
       "배분",
       "spec",
       "요건 정의"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "PM_INTERFACE",
     "label": "인터페이스 정의",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "서로 맞물리는 자리를 문서로 정한 것",
     "match": {
      "keywords": [
       "인터페이스",
       "icd",
       "경계 정의",
       "연계",
       "협의서"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "PM_PLAN",
     "label": "일정과 자원",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "일정과 사람과 돈을 짜 본 것",
     "match": {
      "keywords": [
       "일정",
       "wbs",
       "마일스톤",
       "자원",
       "공수",
       "계획 수립"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "PM_TRADEOFF",
     "label": "우선순위 판단",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "다 못 할 때 무엇을 버릴지 정한 것",
     "match": {
      "keywords": [
       "우선순위",
       "트레이드오프",
       "범위 조정",
       "버린 것",
       "선택과 집중"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "PM_CHANGE",
     "label": "변경 관리",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "바뀐 것을 승인하고 이력으로 남긴 것",
     "match": {
      "keywords": [
       "변경 관리",
       "형상 관리",
       "승인",
       "이력",
       "변경 영향"
      ],
      "courses": [],
      "tool_categories": [
       "plm"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "PM_DELIVERY",
     "label": "일정 안에 끝냄",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "계획과 견주어 실제로 어떻게 됐는지",
     "match": {
      "keywords": [
       "납기",
       "일정 준수",
       "지연",
       "완료",
       "계획 대비"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "PM_RISK",
     "label": "위험 관리",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇이 틀어질 수 있는지 미리 본 것",
     "match": {
      "keywords": [
       "위험",
       "리스크",
       "대응 계획",
       "컨틴전시"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "PM_VERIFICATION",
     "label": "검증 계획",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "요구가 충족됐는지 어떻게 확인할지 정한 것",
     "match": {
      "keywords": [
       "검증 계획",
       "추적표",
       "매트릭스",
       "v&v",
       "요구 추적"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "PM_STAKEHOLDER",
     "label": "이해관계 조율",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "서로 다른 쪽을 맞물리게 조정한 것",
     "match": {
      "keywords": [
       "협의",
       "조율",
       "회의체",
       "고객 대응",
       "부서 간"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "PM_COST",
     "label": "원가·예산",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "돈을 세워 보고 지켜 본 것",
     "match": {
      "keywords": [
       "예산",
       "원가",
       "집행",
       "비용 관리"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "PM_PORTFOLIO",
     "label": "과제 포트폴리오",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "여러 과제를 함께 놓고 고른 것",
     "match": {
      "keywords": [
       "포트폴리오",
       "과제 선정",
       "로드맵",
       "기획"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "PM_TOOL",
     "label": "협업 도구",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E0",
     "description": "협업·형상 관리 도구를 써 본 것",
     "match": {
      "keywords": [
       "jira",
       "confluence",
       "teamcenter",
       "windchill",
       "git",
       "redmine"
      ],
      "courses": [],
      "tool_categories": [
       "plm"
      ],
      "tool_only_ok": true
     },
     "gap_kind": "tool_purpose"
    }
   ]
  },
  {
   "career_family_id": "ME_APPLICATIONS_FIELD",
   "evidence_requirements": [
    {
     "evidence_id": "AF_SITE",
     "label": "현장 조건 파악",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "현장이 실제로 어떤지 보고 조건을 적은 것",
     "match": {
      "keywords": [
       "현장",
       "설치 조건",
       "환경",
       "실사",
       "방문",
       "사용 조건"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "AF_FIT",
     "label": "장비·사양 조정",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "현장에 맞게 사양이나 설정을 바꾼 것",
     "match": {
      "keywords": [
       "사양 조정",
       "옵션",
       "맞춤",
       "설정 변경",
       "적용 사양"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "AF_COMMISSION",
     "label": "설치·시운전",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "직접 설치하고 돌려 본 것",
     "match": {
      "keywords": [
       "설치",
       "시운전",
       "셋업",
       "초기 조정",
       "가동"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "AF_TROUBLE",
     "label": "현장 문제 해결",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "안 되던 것을 되게 만든 것",
     "match": {
      "keywords": [
       "트러블",
       "문제 해결",
       "불량 대응",
       "복구",
       "원인 조치"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "AF_RECORD",
     "label": "현장 기록",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "무엇을 했는지 남겨 다음 사람이 보게 한 것",
     "match": {
      "keywords": [
       "현장 보고",
       "작업 기록",
       "운전 지침",
       "매뉴얼",
       "체크리스트"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "AF_TRAINING",
     "label": "교육·인수인계",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "고객이나 현장 인원에게 넘겨 준 것",
     "match": {
      "keywords": [
       "교육",
       "인수인계",
       "사용 교육",
       "설명",
       "트레이닝"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "AF_FEEDBACK",
     "label": "본사 되먹임",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "현장에서 나온 것을 설계나 개발로 돌려보낸 것",
     "match": {
      "keywords": [
       "개선 요청",
       "되먹임",
       "설계 반영 요청",
       "vo c",
       "현장 의견"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "AF_SAFETY",
     "label": "현장 안전",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "현장 안전 규정을 지켜 일한 것",
     "match": {
      "keywords": [
       "안전 교육",
       "작업 허가",
       "보호구",
       "위험 작업"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "AF_CUSTOMER",
     "label": "고객 응대",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "기술 내용을 고객이 알아듣게 옮긴 것",
     "match": {
      "keywords": [
       "고객 응대",
       "기술 설명",
       "제안",
       "상담",
       "클레임 대응"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "AF_SPARE",
     "label": "부품·서비스 체계",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "예비품이나 서비스 체계를 다룬 것",
     "match": {
      "keywords": [
       "예비품",
       "서비스",
       "정비 계약",
       "a/s 체계"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "AF_OVERSEAS",
     "label": "해외 현장",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "해외 현장에서 일해 본 것",
     "match": {
      "keywords": [
       "해외",
       "출장",
       "현지",
       "영어 대응",
       "글로벌 고객"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    }
   ]
  },
  {
   "career_family_id": "ME_CONSULTING",
   "evidence_requirements": [
    {
     "evidence_id": "CS_REFRAME",
     "label": "질문 다시 세우기",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "받은 물음을 풀 수 있는 문제로 바꾼 것",
     "match": {
      "keywords": [
       "문제 정의",
       "범위",
       "질문",
       "과업 범위",
       "재정의",
       "scope"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "CS_CRITERIA",
     "label": "비교 기준 설정",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇을 기준으로 견줄지 먼저 정한 것",
     "match": {
      "keywords": [
       "평가 기준",
       "비교 기준",
       "지표",
       "가중치",
       "항목"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "CS_ANALYSIS",
     "label": "대안 분석",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "대안을 놓고 분석해 결과를 낸 것",
     "match": {
      "keywords": [
       "대안 비교",
       "분석",
       "검토",
       "시나리오",
       "타당성"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "CS_ASSUMPTION",
     "label": "가정 공개",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "어떤 가정 위에 선 결과인지 드러낸 것",
     "match": {
      "keywords": [
       "가정",
       "전제",
       "한계",
       "불확실성",
       "범위 밖"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "CS_DELIVERABLE",
     "label": "보고서·발표",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "고객이 읽고 쓸 수 있는 형태로 낸 것",
     "match": {
      "keywords": [
       "보고서",
       "검토서",
       "발표",
       "제안서",
       "자료"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "CS_DECISION",
     "label": "고객 결정 연결",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "그 결과로 상대가 무엇을 정했는지",
     "match": {
      "keywords": [
       "채택",
       "결정",
       "반영",
       "수주",
       "승인",
       "의사결정"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "CS_SCHEDULE",
     "label": "납기",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "정해진 기한 안에 냈는지",
     "match": {
      "keywords": [
       "납기",
       "기한",
       "일정 준수",
       "마감"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "CS_DOMAIN",
     "label": "분야 지식",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "그 분야를 알고 들어간 것",
     "match": {
      "keywords": [
       "업계",
       "산업 이해",
       "도메인",
       "규제 환경",
       "시장"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "CS_COMMUNICATION",
     "label": "비전공자 설명",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "기술 내용을 결정권자가 읽게 옮긴 것",
     "match": {
      "keywords": [
       "설명",
       "요약",
       "경영진",
       "비전공",
       "브리핑"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "CS_REUSE",
     "label": "방법 재사용",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "같은 방법을 다른 건에도 쓴 것",
     "match": {
      "keywords": [
       "재사용",
       "템플릿",
       "표준화",
       "다른 과제에도"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "CS_TOOL",
     "label": "분석 도구",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "분석에 쓰는 도구를 다룬 것",
     "match": {
      "keywords": [
       "엑셀",
       "python",
       "해석 도구",
       "모델링 도구",
       "통계 도구"
      ],
      "courses": [],
      "tool_categories": [
       "code",
       "fea",
       "cfd"
      ],
      "tool_only_ok": true
     },
     "gap_kind": "tool_purpose"
    },
    {
     "evidence_id": "CS_POLICY",
     "label": "정책·공공 과제",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "정책이나 공공 쪽 과제를 다뤄 본 것",
     "match": {
      "keywords": [
       "정책",
       "공공",
       "지자체",
       "국책",
       "제도"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    }
   ]
  },
  {
   "career_family_id": "ME_RESEARCH_SCIENTIST",
   "evidence_requirements": [
    {
     "evidence_id": "RS_QUESTION",
     "label": "연구 질문",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "아직 답이 없는 질문을 스스로 세운 것",
     "match": {
      "keywords": [
       "연구 질문",
       "주제 선정",
       "문제 제기",
       "가설",
       "무엇을 묻"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "RS_LITERATURE",
     "label": "선행 연구 정리",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "무엇이 이미 됐고 무엇이 안 됐는지 정리한 것",
     "match": {
      "keywords": [
       "선행 연구",
       "문헌",
       "리뷰",
       "기존 연구",
       "동향"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RS_METHOD",
     "label": "방법 선택",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "그 질문에 맞는 방법을 고르고 까닭을 댄 것",
     "match": {
      "keywords": [
       "방법 선택",
       "실험 방법",
       "수치 기법",
       "모델 선택",
       "접근"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "comparison"
    },
    {
     "evidence_id": "RS_EXECUTE",
     "label": "실험·해석 수행",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "직접 돌려 자료를 만든 것",
     "match": {
      "keywords": [
       "실험",
       "측정",
       "해석 수행",
       "데이터 수집",
       "시편"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RS_ANALYSIS",
     "label": "자료 해석",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "자료에서 결론을 끌어낸 것",
     "match": {
      "keywords": [
       "데이터 분석",
       "통계",
       "결과 해석",
       "경향",
       "유의"
      ],
      "courses": [
       "공업통계",
       "통계"
      ],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RS_VALIDATION",
     "label": "타당성 확인",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "결론이 맞다는 것을 다른 근거로 받친 것",
     "match": {
      "keywords": [
       "검증",
       "재현",
       "대조군",
       "반복",
       "교차 확인",
       "오차"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "RS_OUTPUT",
     "label": "논문·발표",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "밖에 내놓은 형태로 남은 것",
     "match": {
      "keywords": [
       "논문",
       "학위 논문",
       "학회",
       "발표",
       "포스터",
       "프로시딩"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RS_REPRODUCIBLE",
     "label": "재현 가능하게 남기기",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "다른 사람이 그대로 따라 할 수 있게 적은 것",
     "match": {
      "keywords": [
       "절차",
       "코드 공개",
       "데이터셋",
       "프로토콜",
       "재현"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "RS_COLLAB",
     "label": "공동 연구",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "다른 사람이나 기관과 함께 한 것",
     "match": {
      "keywords": [
       "공동연구",
       "협력",
       "공저",
       "타 기관",
       "국제 협력"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RS_FUNDING",
     "label": "과제 수행",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "연구비가 붙은 과제 안에서 한 것",
     "match": {
      "keywords": [
       "과제",
       "연구비",
       "국가과제",
       "사업",
       "수탁"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RS_MENTOR",
     "label": "지도·전달",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "후배나 동료에게 방법을 넘긴 것",
     "match": {
      "keywords": [
       "지도",
       "멘토링",
       "교육",
       "인수인계",
       "후배"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "RS_PATENT",
     "label": "특허",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "특허로 남긴 것",
     "match": {
      "keywords": [
       "특허",
       "출원",
       "등록",
       "ip"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "RS_INDUSTRY_LINK",
     "label": "산업 연결",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "결과가 산업 쪽으로 넘어간 것",
     "match": {
      "keywords": [
       "기술이전",
       "산학",
       "상용화",
       "기업 적용"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    }
   ]
  },
  {
   "career_family_id": "ME_DIGITAL",
   "evidence_requirements": [
    {
     "evidence_id": "DG_PROBLEM",
     "label": "무엇을 자동화할지 고르기",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "손으로 하던 것 가운데 무엇을 바꿀지 정한 것",
     "match": {
      "keywords": [
       "반복 작업",
       "자동화 대상",
       "수작업",
       "병목",
       "개선 지점"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "DG_DATA",
     "label": "데이터 구조 설계",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E1",
     "description": "무엇을 어떤 모양으로 담을지 정한 것",
     "match": {
      "keywords": [
       "데이터 구조",
       "스키마",
       "포맷",
       "테이블",
       "정규화",
       "메타데이터"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "DG_BUILD",
     "label": "도구·스크립트 제작",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "실제로 도는 것을 만든 것",
     "match": {
      "keywords": [
       "스크립트",
       "도구 개발",
       "자동화 코드",
       "파이프라인",
       "대시보드"
      ],
      "courses": [],
      "tool_categories": [
       "code"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "DG_VERIFY",
     "label": "결과 검증",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "자동으로 낸 값이 맞다는 것을 확인한 것",
     "match": {
      "keywords": [
       "검증",
       "손계산과 비교",
       "테스트",
       "검사",
       "교차 확인"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "DG_IMPACT",
     "label": "쓰인 결과",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E3",
     "description": "그 도구로 무엇이 얼마나 줄었는지",
     "match": {
      "keywords": [
       "시간 단축",
       "절감",
       "오류 감소",
       "처리량",
       "사용 건수"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "validation"
    },
    {
     "evidence_id": "DG_USERS",
     "label": "다른 사람이 씀",
     "importance": "core",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E4",
     "description": "만든 사람 말고 다른 사람이 쓴 것",
     "match": {
      "keywords": [
       "배포",
       "공유",
       "사내 사용",
       "사용자",
       "인수인계"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "decision_use"
    },
    {
     "evidence_id": "DG_DOC",
     "label": "사용 설명",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "쓰는 법을 남긴 것",
     "match": {
      "keywords": [
       "사용 설명",
       "readme",
       "매뉴얼",
       "문서화",
       "가이드"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "DG_VERSION",
     "label": "이력 관리",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "버전과 변경을 남긴 것",
     "match": {
      "keywords": [
       "git",
       "버전",
       "형상 관리",
       "브랜치",
       "이력"
      ],
      "courses": [],
      "tool_categories": [
       "plm",
       "code"
      ],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "DG_INTEGRATION",
     "label": "기존 체계와 잇기",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "이미 쓰는 시스템과 맞물리게 한 것",
     "match": {
      "keywords": [
       "연동",
       "api",
       "plm 연계",
       "erp",
       "통합"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "DG_VIS",
     "label": "시각화",
     "importance": "supporting",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "읽을 수 있게 그려 낸 것",
     "match": {
      "keywords": [
       "시각화",
       "그래프",
       "대시보드",
       "리포트 자동 생성"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "DG_ML",
     "label": "예측 모델",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E2",
     "description": "자료로 모델을 학습시켜 본 것",
     "match": {
      "keywords": [
       "머신러닝",
       "예측 모델",
       "학습",
       "회귀",
       "분류"
      ],
      "courses": [],
      "tool_categories": [],
      "tool_only_ok": false
     },
     "gap_kind": "output"
    },
    {
     "evidence_id": "DG_TOOL",
     "label": "프로그래밍 언어",
     "importance": "optional",
     "evidence_types": [
      "project",
      "research",
      "internship",
      "work",
      "course",
      "tool",
      "paper",
      "patent"
     ],
     "minimum_depth": "E0",
     "description": "언어나 분석 도구를 써 본 것",
     "match": {
      "keywords": [
       "python",
       "matlab",
       "c++",
       "sql",
       "vba",
       "r"
      ],
      "courses": [],
      "tool_categories": [
       "code"
      ],
      "tool_only_ok": true
     },
     "gap_kind": "tool_purpose"
    }
   ]
  }
 ]
};
window.PCA_FOLLOWUPS = {
 "schema_version": "1.0",
 "note": "비어 있는 칸을 되묻는 말. **긴 주관식을 요구하지 않는다.** 고르기만 해도 증거 단계가 올라가도록 보기를 먼저 주고, 자유 입력은 '그 밖에' 한 칸으로만 둔다. 적는 일이 길어지면 거기서 닫고 나간다.",
 "answer_note": "여기서 고르신 것은 적합도에 들어가지 않습니다. 증거가 어디까지 확인되는지만 달라집니다.",
 "gaps": [
  {
   "id": "tool_purpose",
   "title": "그 도구를 무엇에 쓰셨습니까",
   "why": "도구 이름만으로는 활동까지밖에 확인되지 않습니다.",
   "questions": [
    {
     "id": "purpose",
     "kind": "multi",
     "fills": "why",
     "q": "어떤 목적으로 쓰셨습니까",
     "options": [
      "구조 응력·변형",
      "열",
      "진동",
      "유동",
      "접촉",
      "피로·수명",
      "형상 모델링",
      "도면 작성",
      "데이터 처리",
      "제어·시뮬레이션",
      "측정·계측",
      "그 밖에"
     ]
    },
    {
     "id": "scope",
     "kind": "one",
     "fills": "where",
     "q": "어디에서 쓰셨습니까",
     "options": [
      "수업 과제",
      "졸업 과제·캡스톤",
      "공모전",
      "연구실",
      "인턴",
      "직장",
      "개인 프로젝트",
      "그 밖에"
     ]
    }
   ]
  },
  {
   "id": "comparison",
   "title": "무엇과 견주어 고르셨습니까",
   "why": "견준 기준이 있어야 직접 정한 것으로 읽힙니다.",
   "questions": [
    {
     "id": "compared",
     "kind": "multi",
     "fills": "validation",
     "q": "결과를 무엇과 비교하셨습니까",
     "options": [
      "설계 기준",
      "실험값",
      "기존 제품",
      "다른 설계안",
      "이론값",
      "다른 해석 방법",
      "규격·표준",
      "비교하지 않았습니다"
     ]
    },
    {
     "id": "criterion",
     "kind": "multi",
     "fills": "decision",
     "q": "무엇을 기준으로 고르셨습니까",
     "options": [
      "성능",
      "무게",
      "원가",
      "제작 난도",
      "일정",
      "안전 여유",
      "신뢰성",
      "정해져 있어서 고를 수 없었습니다",
      "그 밖에"
     ]
    }
   ]
  },
  {
   "id": "decision_use",
   "title": "그 결과가 어떤 판단에 쓰였습니까",
   "why": "결과가 결정으로 이어졌는지가 서류와 면접에서 읽히는 자리입니다.",
   "questions": [
    {
     "id": "used_for",
     "kind": "multi",
     "fills": "decision",
     "q": "결과가 어떤 판단에 쓰였습니까",
     "options": [
      "설계안 선택",
      "치수 변경",
      "재질 변경",
      "조건·설정 변경",
      "시험 조건 결정",
      "원인 분석",
      "계속할지 접을지 결정",
      "판단에 직접 쓰이지는 않았습니다"
     ]
    },
    {
     "id": "who",
     "kind": "one",
     "fills": "decision",
     "q": "그 결정을 누가 했습니까",
     "options": [
      "제가 정했습니다",
      "제가 제안하고 함께 정했습니다",
      "다른 사람이 정했습니다",
      "정해져 있었습니다"
     ]
    }
   ]
  },
  {
   "id": "output",
   "title": "무엇이 남았습니까",
   "why": "남은 것이 있어야 밖에 보여 줄 수 있습니다.",
   "questions": [
    {
     "id": "artifacts",
     "kind": "multi",
     "fills": "output",
     "q": "결과물로 남은 것을 고르십시오",
     "options": [
      "도면·3D 모델",
      "해석 결과",
      "시험 결과",
      "보고서",
      "발표 자료",
      "코드·스크립트",
      "데이터",
      "시작품",
      "작업 표준·절차서",
      "논문·특허",
      "남은 것이 없습니다"
     ]
    },
    {
     "id": "keep",
     "kind": "one",
     "fills": "output",
     "q": "지금도 꺼내 보실 수 있습니까",
     "options": [
      "있습니다",
      "일부 있습니다",
      "없습니다"
     ]
    }
   ]
  },
  {
   "id": "validation",
   "title": "결과가 맞다는 것을 어떻게 확인하셨습니까",
   "why": "견준 기준이 있어야 성과로 읽힙니다.",
   "questions": [
    {
     "id": "method",
     "kind": "multi",
     "fills": "validation",
     "q": "무엇으로 확인하셨습니까",
     "options": [
      "시험·측정값과 비교",
      "이론값과 비교",
      "기준·규격과 비교",
      "다른 방법으로 다시 계산",
      "기존 결과와 비교",
      "현장에서 돌려 봄",
      "확인하지 못했습니다"
     ]
    },
    {
     "id": "gapsize",
     "kind": "one",
     "fills": "validation",
     "q": "기준과 얼마나 차이가 났습니까",
     "options": [
      "기준 안에 들어왔습니다",
      "차이가 있었지만 설명할 수 있었습니다",
      "차이가 커서 다시 했습니다",
      "숫자로 보지는 않았습니다",
      "기억나지 않습니다"
     ]
    }
   ]
  }
 ]
};
