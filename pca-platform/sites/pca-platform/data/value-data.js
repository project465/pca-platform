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
