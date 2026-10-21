/**
 * **학생이 읽는 말의 정본**(CROSS-CORE STUDENT LANGUAGE §1 · §3 · §6).
 *
 * R28 에서 드러난 B1 이 이 파일의 까닭이다. 학생 문구가 `BIZ_CORE_V1`
 * 한 Core 에만 있었고 나머지는 `domainSub` 로 떨어져, taxonomy 의
 * `subareas` 를 가운뎃점으로 잇고 열한 자에서 자른 값이 학생 화면에
 * 나갔다. `고객을 나누고 반응 비교하기` 옆에 `확인할 것·줄 방법` 이
 * 서는 자리가 그것이다.
 *
 * **안쪽과 바깥을 가른다.**
 *
 *   INTERNAL   domain id · taxonomy · scoring · evidence 분류 · 측정 용어
 *   STUDENT    activity · evidence · icon family
 *
 * 이 파일이 드는 것은 아래 줄뿐이다. **taxonomy key 와 측정 모델과
 * 채점과 문항 은행은 한 글자도 건드리지 않는다**: 영역을 고르는 일도
 * 차례도 판정도 그대로이고, 바뀌는 것은 그 판정을 어떤 말로 적는가다.
 *
 * **자동으로 만들지 않았다.** `subareas.join("·").slice(0,11)` 같은
 * 방식으로 지으면 그 줄이 다시 분류명이 된다. 일흔한 자리를 손으로
 * 적었고(지금은 스무 Core · 이백서른아홉 자리) 규칙은 넷이다.
 *
 * - 학생이 **자기가 한 일**을 떠올릴 수 있는 움직씨 구로 적는다
 * - 이름씨 둘을 가운뎃점으로 잇지 않는다(§4 금지 1)
 * - 한 Core 열둘이 같은 문법 틀로 끝나지 않게 어미를 돌려 쓴다(§4 금지 4)
 * - `evidence` 는 그 영역이 남기는 **것의 이름**이고 작업공간 타일 한
 *   줄에 들어가야 한다. 여덟 자 안짝이다
 *
 * **표시는 자리가 아니라 뜻이 고른다**(§5). `family` 가 열두 갈래이고
 * 같은 뜻이면 다른 Core 에서 같은 갈래를 써도 된다. `첫 칸이니까 막대`
 * 는 쓰지 않는다.
 */

/** 표시 갈래 열둘. 뜻이 같으면 Core 가 달라도 같은 갈래를 쓴다 */
export type IconFamily =
  | "plan" | "compare" | "structure" | "data" | "people" | "rule"
  | "verify" | "build" | "talk" | "cost" | "site" | "decide";

export type StudentDomain = {
  /** 학생이 자기 경험을 떠올리는 행동 구. 결과지 현재 상태 카드가 든다 */
  activity: string;
  /** 그 경험이 남기는 것의 이름. 작업공간 타일이 든다 */
  evidence: string;
  family: IconFamily;
};

/* ── 경영 ───────────────────────────────────────────────────────── */
const BIZ: Record<string, StudentDomain> = {
  /* 경영전략·기획 */
  TD01: { activity: "목표와 성과 기준 정하기", evidence: "사업계획서", family: "plan" },
  /* 마케팅·시장 */
  TD02: { activity: "고객을 나누고 반응 비교하기", evidence: "캠페인 기획서", family: "compare" },
  /* 영업·사업개발 */
  TD03: { activity: "고객을 찾고 제안 만들기", evidence: "제안서", family: "talk" },
  /* 재무·투자 판단 */
  TD04: { activity: "들어올 돈과 나갈 돈 따지기", evidence: "추정 손익표", family: "cost" },
  /* 회계·원가 */
  TD05: { activity: "쓴 돈을 증빙과 맞춰 보기", evidence: "결산 대조표", family: "data" },
  /* 인사·조직 */
  TD06: { activity: "사람을 뽑고 역할 나누기", evidence: "직무 기준표", family: "people" },
  /* 운영·프로세스 */
  TD07: { activity: "일하는 순서를 바꿔 보기", evidence: "업무 절차서", family: "site" },
  /* 데이터·의사결정 */
  TD08: { activity: "숫자를 비교해 결론 내기", evidence: "분석 보고서", family: "decide" },
  /* 고객·서비스 운영 */
  TD09: { activity: "응대 기준을 세우고 지키기", evidence: "응대 기준표", family: "rule" },
  /* 수요·예약·가격 관리 */
  TD10: { activity: "수요를 보고 값을 조정하기", evidence: "수요 추정표", family: "cost" },
  /* 글로벌 비즈니스 */
  TD11: { activity: "나갈 시장과 서류 챙기기", evidence: "수출입 서류", family: "rule" },
  /* 정보시스템·업무 요구 */
  TD12: { activity: "업무 흐름을 그리고 요구 적기", evidence: "요구사항 정의서", family: "structure" },
};

/* ── 간호 ───────────────────────────────────────────────────────── */
const NURSING: Record<string, StudentDomain> = {
  /* 간호 사정·간호진단 */
  TD01: { activity: "환자 상태를 살펴보고 판단하기", evidence: "사정 기록", family: "people" },
  /* 간호 계획·우선순위 */
  TD02: { activity: "해야 할 간호의 순서 정하기", evidence: "간호계획", family: "plan" },
  /* 투약·주사 관리 */
  TD03: { activity: "약을 주기 전후로 확인하기", evidence: "투약 기록", family: "verify" },
  /* 상태 변화 감지·보고 */
  TD04: { activity: "달라진 신호를 보고 알리기", evidence: "관찰 기록", family: "talk" },
  /* 처치·술기 수행 */
  TD05: { activity: "처치 방법을 골라 해 보기", evidence: "수행 기록", family: "build" },
  /* 기록·인계 */
  TD06: { activity: "남길 것과 넘길 것 나누기", evidence: "인계 노트", family: "data" },
  /* 감염관리·무균술 */
  TD07: { activity: "옮는 길을 끊어 두기", evidence: "점검 기록", family: "rule" },
  /* 환자안전·사고 예방 */
  TD08: { activity: "넘어질 곳을 미리 막기", evidence: "위험 평가 기록", family: "site" },
  /* 환자·가족 교육·상담 */
  TD09: { activity: "환자가 알아듣게 설명하기", evidence: "교육 기록", family: "talk" },
  /* 중증도 분류·우선 배정 */
  TD10: { activity: "누구를 먼저 볼지 정하기", evidence: "분류 기록", family: "decide" },
  /* 간호 인력·근무 운영 */
  TD11: { activity: "사람을 배치하고 범위 정하기", evidence: "근무표", family: "structure" },
  /* 간호 윤리·법규·동의 */
  TD12: { activity: "어디까지 알리고 받을지 정하기", evidence: "동의 기록", family: "compare" },
};

/* ── 행정 ───────────────────────────────────────────────────────── */
const PUBADM: Record<string, StudentDomain> = {
  /* 정책·사업 기획 */
  TD01: { activity: "어떤 사업을 할지 고르기", evidence: "추진계획서", family: "plan" },
  /* 법령·규정 해석 */
  TD02: { activity: "근거 조문을 찾아 판단하기", evidence: "검토 의견서", family: "rule" },
  /* 예산 편성·집행 */
  TD03: { activity: "필요한 돈을 셈해 나누기", evidence: "예산안", family: "cost" },
  /* 행정 절차·민원 처리 */
  TD04: { activity: "요건을 보고 처리 여부 정하기", evidence: "처리 기록", family: "decide" },
  /* 인사·조직 운영 */
  TD05: { activity: "직무를 나누고 기준 정하기", evidence: "직무 기준", family: "people" },
  /* 성과 관리·평가 */
  TD06: { activity: "무엇을 셀지 정하고 재 보기", evidence: "성과 보고서", family: "compare" },
  /* 공공데이터·통계 분석 */
  TD07: { activity: "자료를 모아 비교해 읽기", evidence: "분석 보고", family: "data" },
  /* 회계·감사 */
  TD08: { activity: "쓴 돈이 규정에 맞는지 보기", evidence: "감사 조서", family: "verify" },
  /* 주민 참여·협력 */
  TD09: { activity: "의견을 듣고 반영 범위 정하기", evidence: "의견 분류표", family: "talk" },
  /* 재난·안전 관리 */
  TD10: { activity: "위험한 곳을 찾아 손보기", evidence: "점검 조서", family: "site" },
  /* 공공사업 관리·조달 */
  TD11: { activity: "맡길 일을 적고 결과 받기", evidence: "과업지시서", family: "structure" },
  /* 디지털 행정·정보 공개 */
  TD12: { activity: "종이 절차를 온라인으로 옮기기", evidence: "업무 절차도", family: "build" },
};

/* ── 컴퓨터·소프트웨어 (영역 열하나) ─────────────────────────────── */
const CS: Record<string, StudentDomain> = {
  /* 소프트웨어 설계·구조 */
  TD01: { activity: "요구를 나누고 구조 잡기", evidence: "모듈 구조도", family: "structure" },
  /* 자료구조·알고리즘 */
  TD02: { activity: "자료 담을 모양 고르기", evidence: "구현 코드", family: "data" },
  /* 서버·API 구현 */
  TD03: { activity: "요청 받아 처리하는 길 만들기", evidence: "응답 규약", family: "build" },
  /* 데이터 저장·질의 설계 */
  TD04: { activity: "저장할 표를 짜고 빨리 찾기", evidence: "스키마 정의", family: "plan" },
  /* 사용자 인터페이스 구현 */
  TD05: { activity: "화면이 입력에 반응하게 만들기", evidence: "화면 코드", family: "people" },
  /* 시스템·동시성 프로그래밍 */
  TD06: { activity: "여러 일이 겹쳐도 버티게 하기", evidence: "자원 사용 측정", family: "site" },
  /* 네트워크·분산 시스템 */
  TD07: { activity: "끊겨도 다시 붙게 해 두기", evidence: "통신 설정표", family: "compare" },
  /* 정보보안 */
  TD08: { activity: "뚫릴 곳을 찾아 막기", evidence: "권한 설계표", family: "rule" },
  /* 기계학습·데이터 분석 */
  TD09: { activity: "자료로 모형을 만들고 재 보기", evidence: "평가 결과표", family: "decide" },
  /* 테스트·품질·배포 운영 */
  TD10: { activity: "고장 날 곳을 미리 시험하기", evidence: "테스트 모음", family: "verify" },
  /* 실시간 그래픽스·게임 구현 */
  TD11: { activity: "끊기지 않게 그려 내기", evidence: "프레임 시간 기록", family: "cost" },
};

/* ── 전기전자 ───────────────────────────────────────────────────── */
const EE: Record<string, StudentDomain> = {
  /* 아날로그 회로 설계 */
  TD01: { activity: "원하는 신호 나오게 회로 짜기", evidence: "회로도", family: "structure" },
  /* 디지털·논리 설계 */
  TD02: { activity: "논리 동작을 맞춰 기능 만들기", evidence: "논리 기술 코드", family: "build" },
  /* 임베디드·펌웨어 */
  TD03: { activity: "코드로 장치를 움직이기", evidence: "펌웨어 소스", family: "site" },
  /* 신호처리 */
  TD04: { activity: "잡음을 걷고 쓸 신호만 남기기", evidence: "필터 계수", family: "data" },
  /* 통신·네트워크 */
  TD05: { activity: "멀리까지 끊기지 않게 보내기", evidence: "링크 예산서", family: "talk" },
  /* 전자기·고주파 */
  TD06: { activity: "안테나와 선로를 맞춰 보기", evidence: "해석 모델", family: "compare" },
  /* 반도체 소자·공정 */
  TD07: { activity: "공정 조건을 바꿔 특성 재기", evidence: "공정 조건표", family: "verify" },
  /* 전력전자 */
  TD08: { activity: "전력을 원하는 모양으로 바꾸기", evidence: "변환 회로도", family: "cost" },
  /* 전기기기·전력시스템 */
  TD09: { activity: "용량을 셈하고 보호 장치 걸기", evidence: "단선도", family: "rule" },
  /* 에너지·신재생 시스템 */
  TD10: { activity: "발전과 저장 용량 잡아 보기", evidence: "용량 산정서", family: "plan" },
  /* 제어·자동화 */
  TD11: { activity: "값을 보고 움직임 잡아 주기", evidence: "이득 설정표", family: "decide" },
  /* 계측·시험·전자파 적합성 */
  TD12: { activity: "제대로 나오는지 재서 남기기", evidence: "시험 성적서", family: "people" },
};

/* ── 미디어·광고홍보·공연 ───────────────────────────────────────── */
const MEDIA: Record<string, StudentDomain> = {
  /* 기획·과제 정의 */
  TD01: { activity: "누구에게 무엇을 보일지 정하기", evidence: "기획서", family: "plan" },
  /* 메시지·콘셉트 */
  TD02: { activity: "전할 말을 한 문장으로 잡기", evidence: "메시지 한 줄", family: "talk" },
  /* 매체·채널 설계 */
  TD03: { activity: "어디에 얼마나 낼지 고르기", evidence: "매체 집행 계획", family: "structure" },
  /* 촬영·조명 설계 */
  TD04: { activity: "앵글과 빛을 잡아 담기", evidence: "촬영 계획", family: "site" },
  /* 사운드·음향 */
  TD05: { activity: "소리를 담고 크기 맞추기", evidence: "녹음 기록", family: "data" },
  /* 연출·구성·대본 */
  TD06: { activity: "이야기 차례를 짜고 대본 쓰기", evidence: "구성안", family: "build" },
  /* 편집·후반 */
  TD07: { activity: "쓸 장면을 골라 붙이기", evidence: "편집본", family: "decide" },
  /* 공연·현장 운영 */
  TD08: { activity: "진행 차례 짜고 사람 배치하기", evidence: "큐시트", family: "people" },
  /* 출연·연기·연주 지도 */
  TD09: { activity: "맡을 사람을 가리고 맞춰 보기", evidence: "연습 기록", family: "compare" },
  /* 성과·반응 측정 */
  TD10: { activity: "반응을 세어 다음에 반영하기", evidence: "지표 정의표", family: "verify" },
  /* 홍보·보도·위기 대응 */
  TD11: { activity: "내보낼 말을 고르고 답하기", evidence: "보도 자료", family: "cost" },
  /* 권리·심의·기록 */
  TD12: { activity: "쓸 수 있는 소재인지 챙기기", evidence: "권리 확인 기록", family: "rule" },
};

/* ── 아래 열넷은 PCU 다섯 트랙 회차(2026-10-20 · Track B)에서 더했다 ──
 * 규칙은 위 넷 그대로이고 영역마다 그 Core 의 `*-domains.json` 이 적은
 * 산출물과 일하는 차례를 보고 손으로 적었다. **taxonomy 토막을 잇지 않았다** */

/* ── 기계공학 ───────────────────────────────────────────────────────── */
const ME: Record<string, StudentDomain> = {
  /* 기구·제품 설계 */
  TD01: { activity: "부품 모양과 치수 정하기", evidence: "조립도", family: "structure" },
  /* 구조·내구 해석 */
  TD02: { activity: "하중을 걸고 버티는지 따지기", evidence: "해석 보고서", family: "compare" },
  /* 열·유체 시스템 */
  TD03: { activity: "열과 흐름을 계산해 보기", evidence: "열설계 사양", family: "data" },
  /* 동역학·진동·소음 */
  TD04: { activity: "흔들림을 재고 줄여 보기", evidence: "진동 측정 보고", family: "verify" },
  /* 구동·전달·동작 설계 */
  TD05: { activity: "모터를 고르고 움직임 짜기", evidence: "구동 선정 계산서", family: "build" },
  /* 재료·강도·파손 */
  TD06: { activity: "부러진 까닭 찾고 재질 고르기", evidence: "재질 사양", family: "decide" },
  /* 시험·계측 */
  TD07: { activity: "무엇을 어떻게 잴지 짜기", evidence: "시험 계획서", family: "verify" },
  /* 생산·공정기술 */
  TD08: { activity: "가공 조건을 찾아 맞추기", evidence: "작업 표준", family: "site" },
  /* 장비·설비 운용 */
  TD09: { activity: "장비를 점검하고 손보기", evidence: "설비 점검표", family: "site" },
  /* 품질·신뢰성 */
  TD10: { activity: "불량 원인을 좁혀 막기", evidence: "시정조치서", family: "rule" },
  /* 요구조건·제약·일정 */
  TD11: { activity: "요구를 쪼개 일정 세우기", evidence: "요구조건 표", family: "plan" },
  /* 반복작업 자동화·데이터 */
  TD12: { activity: "반복 일을 코드로 돌리기", evidence: "자동화 절차", family: "build" },
};

/* ── 건축·실내건축 ────────────────────────────────────────────────────── */
const ARCH: Record<string, StudentDomain> = {
  /* 대지·법규 검토 */
  TD01: { activity: "지을 수 있는 크기 셈하기", evidence: "법규 검토서", family: "rule" },
  /* 공간 계획·평면 설계 */
  TD02: { activity: "실을 나누고 동선 잇기", evidence: "평면도", family: "plan" },
  /* 형태·입면 설계 */
  TD03: { activity: "덩어리 비례와 창 위치 잡기", evidence: "입면도", family: "decide" },
  /* 구조 개념·안전 검토 */
  TD04: { activity: "기둥과 보의 틀 잡아 보기", evidence: "구조 개념도", family: "structure" },
  /* 설비·환경 성능 */
  TD05: { activity: "빛과 열 성능을 돌려 보기", evidence: "성능 검토서", family: "verify" },
  /* 재료·마감 선정 */
  TD06: { activity: "마감 재료를 비교해 고르기", evidence: "마감 일람표", family: "compare" },
  /* 실내 공간·동선 설계 */
  TD07: { activity: "가구 놓고 지나는 폭 맞추기", evidence: "실내 전개도", family: "people" },
  /* 도면·시공 상세 */
  TD08: { activity: "상세를 그리고 도면 맞추기", evidence: "상세도 세트", family: "data" },
  /* 공사비·수량 산출 */
  TD09: { activity: "수량 세고 공사비 뽑기", evidence: "수량 산출서", family: "cost" },
  /* 시공 관리·감리 */
  TD10: { activity: "현장을 돌며 맞는지 판정하기", evidence: "검사 조서", family: "site" },
  /* 인허가·협의 */
  TD11: { activity: "서류 갖춰 협의하고 보완하기", evidence: "인허가 서류", family: "talk" },
  /* 안전·유지 관리 */
  TD12: { activity: "위험한 곳을 찾고 닫기", evidence: "안전 점검표", family: "rule" },
};

/* ── 토목·철도건설 ────────────────────────────────────────────────────── */
const CIV: Record<string, StudentDomain> = {
  /* 조사·측량 */
  TD01: { activity: "기준점 잡고 지형 재기", evidence: "측량 성과표", family: "data" },
  /* 노선·배치 계획 */
  TD02: { activity: "지나갈 길을 여러 벌 그리기", evidence: "노선 계획도", family: "compare" },
  /* 구조 설계·해석 */
  TD03: { activity: "하중을 세우고 단면 고치기", evidence: "구조 계산서", family: "structure" },
  /* 지반·기초 판단 */
  TD04: { activity: "흙 시험값으로 기초 정하기", evidence: "기초 계산서", family: "decide" },
  /* 재료·배합 */
  TD05: { activity: "배합을 바꿔 가며 강도 보기", evidence: "배합 설계서", family: "verify" },
  /* 수리·배수 계획 */
  TD06: { activity: "물 빠질 길과 관 크기 잡기", evidence: "배수 계획도", family: "plan" },
  /* 궤도·선로 */
  TD07: { activity: "선로 틀어짐 재고 보정하기", evidence: "궤도 보정표", family: "site" },
  /* 시공 계획·공정 */
  TD08: { activity: "공정 차례와 장비 짜기", evidence: "공정표", family: "plan" },
  /* 현장 시공 관리 */
  TD09: { activity: "그날 작업 지시하고 맞추기", evidence: "작업 일지", family: "people" },
  /* 품질·시험 판정 */
  TD10: { activity: "시료 뽑아 기준과 비교하기", evidence: "검측 기록", family: "rule" },
  /* 안전·환경 관리 */
  TD11: { activity: "위험한 작업을 막아 두기", evidence: "위험성 평가표", family: "rule" },
  /* 유지관리·점검 */
  TD12: { activity: "상태를 매겨 보수 차례 정하기", evidence: "상태 평가표", family: "decide" },
};

/* ── 바이오·생명공학 ───────────────────────────────────────────────────── */
const BT: Record<string, StudentDomain> = {
  /* 분자생물 실험 */
  TD01: { activity: "유전자를 뽑아 늘려 보기", evidence: "실험 노트", family: "verify" },
  /* 세포·조직 배양 */
  TD02: { activity: "세포를 키우고 옮겨 심기", evidence: "배양 대장", family: "site" },
  /* 미생물·발효 */
  TD03: { activity: "균주를 골라 배양 조건 맞추기", evidence: "배지 조성표", family: "compare" },
  /* 단백질·효소 공학 */
  TD04: { activity: "단백질을 뽑아 순도 확인하기", evidence: "정제 절차", family: "build" },
  /* 유전자 조작·클로닝 */
  TD05: { activity: "유전자를 잘라 붙이고 확인하기", evidence: "클로닝 설계도", family: "structure" },
  /* 분석·기기 측정 */
  TD06: { activity: "기기로 재고 검량선 세우기", evidence: "검량선 자료", family: "data" },
  /* 생물정보·데이터 */
  TD07: { activity: "서열 자료를 걸러 비교하기", evidence: "분석 스크립트", family: "build" },
  /* 면역·진단 */
  TD08: { activity: "양성과 음성 판정 기준 정하기", evidence: "검출계 설계", family: "decide" },
  /* 생물공정·스케일업 */
  TD09: { activity: "배양 규모를 키워 수율 보기", evidence: "배치 기록", family: "site" },
  /* 품질관리·규격 */
  TD10: { activity: "기준대로 재고 합격 판정하기", evidence: "표준작업절차", family: "rule" },
  /* 연구 설계·통계 */
  TD11: { activity: "대조군을 두고 반복 수 정하기", evidence: "연구 계획서", family: "plan" },
  /* 생물안전·규제 */
  TD12: { activity: "다뤄도 되는 범위 챙기기", evidence: "위험 평가서", family: "rule" },
};

/* ── 체육·운동재활 ────────────────────────────────────────────────────── */
const SPORTS: Record<string, StudentDomain> = {
  /* 운동 수행력 측정·평가 */
  TD01: { activity: "체력을 재고 기준에 대기", evidence: "체력 측정표", family: "verify" },
  /* 운동 처방 설계 */
  TD02: { activity: "종목과 강도를 짜 주기", evidence: "운동 계획표", family: "plan" },
  /* 운동 지도·수업 운영 */
  TD03: { activity: "시범 보이고 동작 고쳐 주기", evidence: "수업 기록", family: "people" },
  /* 손상 평가·현장 응급 */
  TD04: { activity: "다친 부위를 보고 멈추게 하기", evidence: "응급 조치 기록", family: "decide" },
  /* 재활 단계 설정·복귀 판정 */
  TD05: { activity: "회복 단계를 올리고 되돌리기", evidence: "복귀 단계 기록", family: "compare" },
  /* 자세·동작 분석 */
  TD06: { activity: "자세를 찍어 어긋난 곳 찾기", evidence: "동작 분석표", family: "data" },
  /* 체력·건강 상담 */
  TD07: { activity: "생활 습관 듣고 하나 바꾸기", evidence: "건강 상담지", family: "talk" },
  /* 시설·장비 안전 관리 */
  TD08: { activity: "기구를 점검하고 닫을지 정하기", evidence: "시설 점검표", family: "site" },
  /* 경기·대회 운영 */
  TD09: { activity: "조 편성하고 대회 일정 짜기", evidence: "대회 운영안", family: "plan" },
  /* 생활체육·동호회 운영 */
  TD10: { activity: "동호회 회차를 열고 모으기", evidence: "참여 집계표", family: "people" },
  /* 선수 관리·훈련 계획 */
  TD11: { activity: "훈련량을 나누고 쉴 날 빼기", evidence: "훈련 계획표", family: "plan" },
  /* 규정·자격·윤리 */
  TD12: { activity: "할 수 있는 범위 알리기", evidence: "범위 동의서", family: "rule" },
};

/* ── 보건·의료복지 ────────────────────────────────────────────────────── */
const HEALTH: Record<string, StudentDomain> = {
  /* 보건사업 기획 */
  TD01: { activity: "먼저 할 보건사업 고르기", evidence: "보건사업 계획서", family: "plan" },
  /* 건강 자료 분석 */
  TD02: { activity: "건강 지표를 계산해 비교하기", evidence: "지표 산출표", family: "compare" },
  /* 건강 교육·캠페인 운영 */
  TD03: { activity: "캠페인을 열고 반응 보기", evidence: "캠페인 진행 기록", family: "talk" },
  /* 의료기관 원무·행정 */
  TD04: { activity: "접수와 배정 차례 짜기", evidence: "원무 절차서", family: "site" },
  /* 보험 청구·심사 대응 */
  TD05: { activity: "청구 코드 붙이고 삭감 답하기", evidence: "청구 자료", family: "cost" },
  /* 의무기록·보건정보 관리 */
  TD06: { activity: "기록을 점검하고 권한 주기", evidence: "기록 점검표", family: "data" },
  /* 대상자 평가·사정 */
  TD07: { activity: "대상자에게 필요한 것 재기", evidence: "대상자 사정지", family: "people" },
  /* 서비스 연계·자원 조정 */
  TD08: { activity: "보낼 곳 찾아 자원 잇기", evidence: "연계 기록", family: "talk" },
  /* 돌봄·재활 현장 운영 */
  TD09: { activity: "돌봄 일정 짜고 인계하기", evidence: "돌봄 운영 기록", family: "site" },
  /* 감염·안전 관리 */
  TD10: { activity: "감염 길목을 끊고 점검하기", evidence: "감염 점검표", family: "rule" },
  /* 질 관리·인증 평가 */
  TD11: { activity: "인증 기준에 맞춰 증빙 모으기", evidence: "증빙 자료", family: "verify" },
  /* 법규·기록·윤리 */
  TD12: { activity: "알릴 범위와 동의 챙기기", evidence: "보고 기록", family: "rule" },
};

/* ── 식품 ─────────────────────────────────────────────────────────── */
const FOOD: Record<string, StudentDomain> = {
  /* 식품 개발·배합 설계 */
  TD01: { activity: "원료 고르고 배합 잡기", evidence: "배합표", family: "build" },
  /* 가공·공정 설계 */
  TD02: { activity: "공정 온도와 시간 정하기", evidence: "공정 흐름도", family: "structure" },
  /* 품질관리·규격 판정 */
  TD03: { activity: "검사값 읽고 합격 판정하기", evidence: "검사 성적서", family: "verify" },
  /* 위생·안전관리 */
  TD04: { activity: "위해요소 끊을 지점 두기", evidence: "위해요소 목록", family: "rule" },
  /* 이화학·미생물 분석 */
  TD05: { activity: "시료를 다뤄 성분 재기", evidence: "분석 성적서", family: "data" },
  /* 저장·유통·포장 */
  TD06: { activity: "보관 조건과 기한 시험하기", evidence: "보관 조건표", family: "site" },
  /* 영양 평가·식단 설계 */
  TD07: { activity: "필요 영양량을 셈해 식단 짜기", evidence: "식단표", family: "plan" },
  /* 영양 상담·교육 */
  TD08: { activity: "식습관 하나 바꾸게 돕기", evidence: "영양 상담지", family: "talk" },
  /* 급식·점포 운영 */
  TD09: { activity: "식수 보고 발주량 잡기", evidence: "발주서", family: "cost" },
  /* 조리 공정 표준화 */
  TD10: { activity: "레시피 분량과 차례 맞추기", evidence: "표준 레시피", family: "rule" },
  /* 관능 평가·출시 판정 */
  TD11: { activity: "맛을 비교해 출시 정하기", evidence: "관능 평가표", family: "decide" },
  /* 표시·인증·법규 */
  TD12: { activity: "표시 문구와 값 정리하기", evidence: "표시 문안", family: "rule" },
};

/* ── 심리학 ────────────────────────────────────────────────────────── */
const PSY: Record<string, StudentDomain> = {
  /* 연구 설계 */
  TD01: { activity: "물음 좁히고 설계 고르기", evidence: "연구 계획안", family: "plan" },
  /* 측정·척도 */
  TD02: { activity: "문항을 쓰고 믿을 만한지 재기", evidence: "척도 문항표", family: "verify" },
  /* 자료 수집·실험 운영 */
  TD03: { activity: "절차대로 모으고 자료 정리하기", evidence: "수집 일지", family: "data" },
  /* 통계 분석 */
  TD04: { activity: "방법 골라 돌리고 말로 옮기기", evidence: "분석 결과표", family: "compare" },
  /* 심리 평가·검사 해석 */
  TD05: { activity: "검사를 묶어 실시하고 풀이하기", evidence: "평가 보고서", family: "decide" },
  /* 사례 개념화 */
  TD06: { activity: "문제가 이어지는 까닭 그리기", evidence: "사례 개념도", family: "structure" },
  /* 상담·개입 운영 */
  TD07: { activity: "회기마다 할 것 정해 이끌기", evidence: "회기 기록", family: "people" },
  /* 위기 대응·의뢰 */
  TD08: { activity: "위험을 먼저 끊고 알리기", evidence: "안전 계획", family: "rule" },
  /* 프로그램 설계·평가 */
  TD09: { activity: "회차를 짜고 전후로 재기", evidence: "프로그램 교안", family: "plan" },
  /* 조직·인사 심리 */
  TD10: { activity: "볼 항목 정하고 면접 채점하기", evidence: "면접 평가표", family: "decide" },
  /* 사용자·소비자 조사 */
  TD11: { activity: "써 보는 모습 보고 막힘 찾기", evidence: "막힘 목록", family: "people" },
  /* 윤리·기록·수퍼비전 */
  TD12: { activity: "알릴 범위 정하고 기록 남기기", evidence: "고지 기록", family: "rule" },
};

/* ── 국어·언어·문학 ───────────────────────────────────────────────────── */
const LANG: Record<string, StudentDomain> = {
  /* 문헌·자료 조사 */
  TD01: { activity: "찾을 자료 범위 정해 모으기", evidence: "자료 목록", family: "data" },
  /* 텍스트 분석·해석 */
  TD02: { activity: "작품을 읽고 근거 대목 뽑기", evidence: "분석 글", family: "compare" },
  /* 언어 구조 분석 */
  TD03: { activity: "예문 모아 규칙 찾아 적기", evidence: "규칙 정리", family: "structure" },
  /* 말뭉치·언어 자료 */
  TD04: { activity: "말뭉치에 주석 달고 검수하기", evidence: "주석 지침", family: "verify" },
  /* 번역·통역 */
  TD05: { activity: "옮길 말과 용어 맞춰 번역하기", evidence: "용어 대응표", family: "talk" },
  /* 글쓰기·편집 */
  TD06: { activity: "원고 구성 잡고 고쳐 쓰기", evidence: "완성 원고", family: "build" },
  /* 한국어 교육 설계 */
  TD07: { activity: "단원과 학습 자료 짜기", evidence: "수업 계획서", family: "plan" },
  /* 수업 운영·평가 */
  TD08: { activity: "평가 문항과 채점 기준 세우기", evidence: "채점 기준표", family: "decide" },
  /* 창작·구성 */
  TD09: { activity: "소재 고르고 구조 잡아 쓰기", evidence: "창작 개요", family: "plan" },
  /* 문화·지역 이해 */
  TD10: { activity: "그 사회의 맥락 찾아 비교하기", evidence: "맥락 정리", family: "people" },
  /* 조사·면담 설계 */
  TD11: { activity: "질문지 짜고 면담 옮겨 적기", evidence: "전사 자료", family: "talk" },
  /* 콘텐츠 기획·유통 */
  TD12: { activity: "채널마다 형식 맞춰 내보내기", evidence: "콘텐츠 기획안", family: "site" },
};

/* ── 법·경찰 ───────────────────────────────────────────────────────── */
const LAW: Record<string, StudentDomain> = {
  /* 법령·판례 조사 */
  TD01: { activity: "조문과 판례를 찾아 고르기", evidence: "판례 카드", family: "data" },
  /* 사실관계 정리 */
  TD02: { activity: "다툰 사실을 시간 순서로 잇기", evidence: "시간 순서표", family: "structure" },
  /* 요건 해석·적용 */
  TD03: { activity: "요건에 사실을 대어 보기", evidence: "요건 대비표", family: "decide" },
  /* 서면 작성 */
  TD04: { activity: "주장마다 근거 붙여 쓰기", evidence: "준비서면", family: "rule" },
  /* 계약·문서 검토 */
  TD05: { activity: "위험한 조항 찾아 고쳐 쓰기", evidence: "계약 수정안", family: "compare" },
  /* 분쟁 대응·협상 */
  TD06: { activity: "양보할 선 정하고 합의하기", evidence: "합의문", family: "talk" },
  /* 규제·준법 점검 */
  TD07: { activity: "규제 항목표 만들어 점검하기", evidence: "준법 점검표", family: "verify" },
  /* 수사·증거 수집 */
  TD08: { activity: "확보할 자료 절차대로 모으기", evidence: "수사 보고", family: "data" },
  /* 현장 대응·안전 */
  TD09: { activity: "현장에서 위험부터 끊기", evidence: "근무 일지", family: "site" },
  /* 피해자·민원 상담 */
  TD10: { activity: "민원 듣고 갈 곳 이어 주기", evidence: "민원 상담 기록", family: "people" },
  /* 범죄·안전 자료 분석 */
  TD11: { activity: "사건 자료로 지표 비교하기", evidence: "범죄 집계표", family: "compare" },
  /* 입법·내부규정 설계 */
  TD12: { activity: "규정 조문 쓰고 상위법 대기", evidence: "규정안", family: "rule" },
};

/* ── 교육 ─────────────────────────────────────────────────────────── */
const EDU: Record<string, StudentDomain> = {
  /* 교육과정 설계 */
  TD01: { activity: "넣을 것과 뺄 것 정하기", evidence: "교육과정 편성표", family: "plan" },
  /* 수업 설계 */
  TD02: { activity: "차시 목표 적고 활동 고르기", evidence: "교안", family: "structure" },
  /* 수업 운영 */
  TD03: { activity: "반응 보고 수업 바꿔 가기", evidence: "수업 운영 기록", family: "people" },
  /* 평가 설계·채점 */
  TD04: { activity: "문항 만들고 채점 기준 적기", evidence: "평가 도구", family: "verify" },
  /* 학습자 진단·개별화 */
  TD05: { activity: "막힌 부분 찾아 보충하기", evidence: "개별 지도 계획", family: "decide" },
  /* 생활지도·행동지원 */
  TD06: { activity: "행동 까닭을 좁혀 약속 정하기", evidence: "행동 관찰지", family: "data" },
  /* 상담·보호자 소통 */
  TD07: { activity: "보호자와 역할 나눠 알리기", evidence: "보호자 상담 기록", family: "talk" },
  /* 특수교육·통합지원 */
  TD08: { activity: "수업을 그 아이에게 맞추기", evidence: "개별화 계획", family: "people" },
  /* 교육자료·매체 제작 */
  TD09: { activity: "교재 만들어 써 보고 고치기", evidence: "학습 교재", family: "build" },
  /* 교육 프로그램·사업 운영 */
  TD10: { activity: "모집하고 강사 배정하기", evidence: "강사 배정표", family: "site" },
  /* 교육 자료 분석 */
  TD11: { activity: "성적 자료로 집단 비교하기", evidence: "집계 보고서", family: "compare" },
  /* 안전·기록·규정 */
  TD12: { activity: "안전 항목 점검하고 적기", evidence: "학교 안전 점검표", family: "rule" },
};

/* ── 원예·산림·조경 ───────────────────────────────────────────────────── */
const AGRI: Record<string, StudentDomain> = {
  /* 작물·수종 선정 */
  TD01: { activity: "심을 품목과 때 정하기", evidence: "재배 계획표", family: "plan" },
  /* 재배·생육 관리 */
  TD02: { activity: "생육 보고 물과 양분 맞추기", evidence: "생육 기록", family: "site" },
  /* 병해충·방제 판단 */
  TD03: { activity: "병해충 가리고 방제 정하기", evidence: "방제 기록", family: "decide" },
  /* 토양·양분 관리 */
  TD04: { activity: "흙을 재어 넣을 양 셈하기", evidence: "토양 분석표", family: "data" },
  /* 번식·육묘 */
  TD05: { activity: "모를 길러 낼 것 고르기", evidence: "육묘 기록", family: "compare" },
  /* 수확·수확 후 관리 */
  TD06: { activity: "익은 때 보고 등급 나누기", evidence: "선별 기록", family: "verify" },
  /* 시설·관수 환경 제어 */
  TD07: { activity: "온실 설정값 잡고 지켜보기", evidence: "환경 설정 기록", family: "build" },
  /* 조경 설계·식재 계획 */
  TD08: { activity: "위치마다 맞는 나무 고르기", evidence: "식재 설계도", family: "structure" },
  /* 녹지·수목 유지 관리 */
  TD09: { activity: "자를 가지 정해 손보기", evidence: "수목 작업 기록", family: "site" },
  /* 산림 자원 조사·경영 */
  TD10: { activity: "표준지 잡고 나무 세어 늘리기", evidence: "조사 야장", family: "data" },
  /* 공간·이용자 안전 관리 */
  TD11: { activity: "이용자 다칠 곳 점검하기", evidence: "공원 점검표", family: "rule" },
  /* 법규·인증·기록 */
  TD12: { activity: "이력 기록 갖춰 심사 받기", evidence: "이력 기록", family: "rule" },
};

/* ── 시각·디자인 ─────────────────────────────────────────────────────── */
const VISUAL: Record<string, StudentDomain> = {
  /* 과제 정의·리서치 */
  TD01: { activity: "받는 사람과 풀 문제 좁히기", evidence: "과제 정의서", family: "people" },
  /* 콘셉트·방향 설정 */
  TD02: { activity: "갈 방향을 한 줄로 고르기", evidence: "콘셉트 보드", family: "decide" },
  /* 조형·레이아웃 */
  TD03: { activity: "격자 잡고 요소 배치해 보기", evidence: "레이아웃 시안", family: "structure" },
  /* 타이포그래피 */
  TD04: { activity: "글꼴 고르고 크기 위계 잡기", evidence: "조판 규칙", family: "rule" },
  /* 색과 재질 */
  TD05: { activity: "색 조합 뽑아 매체에 맞추기", evidence: "색 조합표", family: "compare" },
  /* 캐릭터·세계관 설정 */
  TD06: { activity: "인물과 세계 규칙 짜기", evidence: "설정집", family: "people" },
  /* 서사·연출·콘티 */
  TD07: { activity: "장면 차례와 컷 끊기", evidence: "콘티", family: "plan" },
  /* 동작·애니메이션 */
  TD08: { activity: "키 동작 잡고 타이밍 고치기", evidence: "동작 파일", family: "build" },
  /* 제품 형태·사용 설계 */
  TD09: { activity: "쥐어 보며 치수 고치기", evidence: "형태 모델", family: "build" },
  /* 제작 사양·양산 검토 */
  TD10: { activity: "만들 수 있게 사양 맞추기", evidence: "제작 사양서", family: "site" },
  /* 사용자 반응·검증 */
  TD11: { activity: "보여 주고 고칠 곳 세기", evidence: "사용 시험 결과", family: "verify" },
  /* 저작권·납품·기록 */
  TD12: { activity: "쓸 권리 확인하고 파일 넘기기", evidence: "납품 파일 목록", family: "rule" },
};

/* ── 패션·뷰티·스타일 ──────────────────────────────────────────────────── */
const STYLE: Record<string, StudentDomain> = {
  /* 기획·대상 정의 */
  TD01: { activity: "입을 사람과 품목 정하기", evidence: "상품 기획서", family: "people" },
  /* 소재·성분 선정 */
  TD02: { activity: "원단 만져 보고 등급 고르기", evidence: "소재 목록", family: "compare" },
  /* 패턴·치수 설계 */
  TD03: { activity: "치수 세우고 조각 그리기", evidence: "패턴 한 벌", family: "structure" },
  /* 봉제·제작 공정 */
  TD04: { activity: "붙이는 차례 짜고 시제품 보기", evidence: "작업 지시서", family: "site" },
  /* 착용·피팅 보정 */
  TD05: { activity: "입혀 보고 고칠 치수 집기", evidence: "수선 기록", family: "verify" },
  /* 색채·톤 판단 */
  TD06: { activity: "빛 아래서 색 섞어 맞추기", evidence: "색 배합표", family: "data" },
  /* 스타일링·연출 */
  TD07: { activity: "입히는 차례와 조합 짜기", evidence: "스타일링 목록", family: "plan" },
  /* 두피·피부 상태 판단 */
  TD08: { activity: "두피와 피부 상태 재어 보기", evidence: "상태 등급 기록", family: "decide" },
  /* 시술 설계·수행 */
  TD09: { activity: "제품과 세기 정해 시술하기", evidence: "시술 기록", family: "build" },
  /* 위생·안전 관리 */
  TD10: { activity: "소독 주기 정해 돌아보기", evidence: "위생 점검표", family: "rule" },
  /* 상품 구성·진열 */
  TD11: { activity: "들일 품목과 진열 위치 짜기", evidence: "진열 도면", family: "cost" },
  /* 고객 상담·기록 */
  TD12: { activity: "권할 것과 안 권할 것 나누기", evidence: "고객 상담 기록", family: "talk" },
};

export const STUDENT_COPY: Record<string, Record<string, StudentDomain>> = {
  BIZ_CORE_V1: BIZ,
  NURSING_CORE_V1: NURSING,
  PUBADM_CORE_V1: PUBADM,
  CS_CORE_V1: CS,
  EE_CORE_V1: EE,
  MEDIA_CORE_V1: MEDIA,
  ME_CORE_V3: ME,
  ARCH_CORE_V1: ARCH,
  CIV_CORE_V1: CIV,
  BT_CORE_V1: BT,
  SPORTS_CORE_V1: SPORTS,
  HEALTH_CORE_V1: HEALTH,
  FOOD_CORE_V1: FOOD,
  PSY_CORE_V1: PSY,
  LANG_CORE_V1: LANG,
  LAW_CORE_V1: LAW,
  EDU_CORE_V1: EDU,
  AGRI_CORE_V1: AGRI,
  VISUAL_CORE_V1: VISUAL,
  STYLE_CORE_V1: STYLE,
};

/**
 * 경험 추가 1단의 **예시 한 줄**(§7).
 *
 * 전에는 `예: 전동 스쿠터 프레임 경량화 캡스톤` 하나가 공통 화면에 글자로
 * 박혀 있었다. 경영학과 학생이 기계공학 예시를 읽는 자리이고, 운영
 * Canary 의 `기계공학자` 와 같은 모양이다.
 *
 * **현업 경력을 전제하지 않는다**: 전부 수업과 과제와 실습과 동아리에서
 * 나올 수 있는 것이다.
 */
export const EXPERIENCE_EXAMPLE: Record<string, string> = {
  BIZ_CORE_V1: "예: 동아리 행사 예산과 홍보를 맡았던 경험",
  NURSING_CORE_V1: "예: 실습에서 환자 상태를 관찰하고 기록했던 경험",
  PUBADM_CORE_V1: "예: 정책 과제에서 자료를 찾아 기준을 정했던 경험",
  CS_CORE_V1: "예: 팀 프로젝트에서 로그인 기능을 만들었던 경험",
  EE_CORE_V1: "예: 회로 실습에서 센서 값이 흔들리지 않게 잡았던 경험",
  MEDIA_CORE_V1: "예: 팀 과제에서 카드뉴스나 영상을 기획했던 경험",
  ME_CORE_V3: "예: 캡스톤에서 프레임 무게를 줄였던 경험",
  ARCH_CORE_V1: "예: 설계 스튜디오에서 평면과 동선을 짰던 경험",
  CIV_CORE_V1: "예: 측량 실습에서 기준점을 잡고 지형을 쟀던 경험",
  BT_CORE_V1: "예: 실험 수업에서 배양 조건을 바꿔 봤던 경험",
  SPORTS_CORE_V1: "예: 지도 실습에서 수업 하나를 맡아 진행했던 경험",
  HEALTH_CORE_V1: "예: 보건 과제에서 지역 건강 자료를 정리했던 경험",
  FOOD_CORE_V1: "예: 조리 실습에서 레시피 분량을 맞춰 봤던 경험",
  PSY_CORE_V1: "예: 연구방법 수업에서 설문 문항을 만들었던 경험",
  LANG_CORE_V1: "예: 발표 과제에서 작품을 읽고 근거를 모았던 경험",
  LAW_CORE_V1: "예: 모의재판에서 사실관계를 정리했던 경험",
  EDU_CORE_V1: "예: 교육 실습에서 한 차시 수업을 짰던 경험",
  AGRI_CORE_V1: "예: 실습포에서 작물을 길러 생육을 기록했던 경험",
  VISUAL_CORE_V1: "예: 팀 과제에서 포스터 시안을 여러 벌 만들었던 경험",
  STYLE_CORE_V1: "예: 실습 수업에서 패턴을 뜨고 가봉했던 경험",
};

/** 아직 사전을 적지 않은 Core 가 드는 예시. **전공을 가리키지 않는다** */
export const EXAMPLE_FALLBACK = "예: 수업 과제에서 직접 맡았던 일 하나";

/**
 * 경험 추가 흐름이 **그 전공의 말**로 묻는 자리(R30 · PHASE 2).
 *
 * 전에는 2단의 이름이 `기술 판단` 이고 묻는 말이 `어느 기술영역의 일인가요`
 * 였다. 기계공학에서 온 말이라 경영학과 학생은 자기 과제를 `기술 판단` 으로
 * 읽지 못한다(사업주가 BIZ 에서 짚은 자리). 운영 Canary 의 `기계공학자` 와
 * 같은 모양이고, 그래서 화면에 글자로 박지 않고 사전이 든다.
 *
 * 드는 것은 넷이다. 걸음 이름 · 영역을 부르는 말 · 1단에서 다룬 것을 묻는
 * 말 · 직접 정한 것을 묻는 말. **고르는 값과 저장되는 칸은 그대로다**: 영역
 * 코드도 체크리스트도 판정도 이 표를 읽지 않는다.
 */
export type ExperienceFlow = {
  /** 2단의 걸음 이름. 짧게, 넉 자 안짝 */
  step2: string;
  /** 영역을 부르는 말. `어느 ${domainWord}의 일이었나요` 로 선다 */
  domainWord: string;
  /** 그 경험에서 다룬 것을 묻는 말(J1 의 자리) */
  problemQ: string;
  /** 직접 정한 것을 묻는 말(J3 의 자리) */
  decidedQ: string;
};

export const EXPERIENCE_FLOW: Record<string, ExperienceFlow> = {
  BIZ_CORE_V1: {
    step2: "업무 판단", domainWord: "업무 영역",
    problemQ: "어떤 문제를 다뤘나요", decidedQ: "무엇을 직접 정했나요",
  },
  NURSING_CORE_V1: {
    step2: "임상 판단", domainWord: "간호 영역",
    problemQ: "어떤 상황이었나요", decidedQ: "무엇을 직접 판단했나요",
  },
  PUBADM_CORE_V1: {
    step2: "행정 판단", domainWord: "행정 영역",
    problemQ: "어떤 사안을 다뤘나요", decidedQ: "무엇을 직접 정했나요",
  },
  CS_CORE_V1: {
    step2: "기술 판단", domainWord: "개발 영역",
    problemQ: "어떤 문제를 풀었나요", decidedQ: "무엇을 직접 정했나요",
  },
  EE_CORE_V1: {
    step2: "기술 판단", domainWord: "기술영역",
    problemQ: "어떤 문제를 다뤘나요", decidedQ: "무엇을 직접 정했나요",
  },
  MEDIA_CORE_V1: {
    step2: "제작 판단", domainWord: "제작 영역",
    problemQ: "어떤 과제였나요", decidedQ: "무엇을 직접 정했나요",
  },
  ME_CORE_V3: {
    step2: "기술 판단", domainWord: "기술영역",
    problemQ: "어떤 문제를 다뤘나요", decidedQ: "무엇을 직접 정했나요",
  },
  ARCH_CORE_V1: {
    step2: "설계 판단", domainWord: "설계 영역",
    problemQ: "어떤 과제였나요", decidedQ: "무엇을 직접 정했나요",
  },
  CIV_CORE_V1: {
    step2: "기술 판단", domainWord: "토목 분야",
    problemQ: "어떤 문제를 다뤘나요", decidedQ: "무엇을 직접 정했나요",
  },
  BT_CORE_V1: {
    step2: "실험 판단", domainWord: "실험 영역",
    problemQ: "어떤 실험이었나요", decidedQ: "무엇을 직접 정했나요",
  },
  SPORTS_CORE_V1: {
    step2: "지도 판단", domainWord: "운동 영역",
    problemQ: "어떤 대상과 상황이었나요", decidedQ: "무엇을 직접 정했나요",
  },
  HEALTH_CORE_V1: {
    step2: "현장 판단", domainWord: "보건 영역",
    problemQ: "어떤 대상과 사안이었나요", decidedQ: "무엇을 직접 판단했나요",
  },
  FOOD_CORE_V1: {
    step2: "식품 판단", domainWord: "식품 영역",
    problemQ: "어떤 과제였나요", decidedQ: "무엇을 직접 정했나요",
  },
  PSY_CORE_V1: {
    step2: "심리 판단", domainWord: "심리 영역",
    problemQ: "어떤 물음이나 사례였나요", decidedQ: "무엇을 직접 판단했나요",
  },
  LANG_CORE_V1: {
    step2: "작업 판단", domainWord: "언어 영역",
    problemQ: "어떤 글이나 자료를 다뤘나요", decidedQ: "무엇을 직접 정했나요",
  },
  LAW_CORE_V1: {
    step2: "법적 판단", domainWord: "법 영역",
    problemQ: "어떤 사안이었나요", decidedQ: "무엇을 직접 판단했나요",
  },
  EDU_CORE_V1: {
    step2: "수업 판단", domainWord: "교육 영역",
    problemQ: "어떤 수업이나 학생이었나요", decidedQ: "무엇을 직접 정했나요",
  },
  AGRI_CORE_V1: {
    step2: "재배 판단", domainWord: "작업 영역",
    problemQ: "어떤 작물이나 대상지였나요", decidedQ: "무엇을 직접 정했나요",
  },
  VISUAL_CORE_V1: {
    step2: "시안 판단", domainWord: "디자인 영역",
    problemQ: "어떤 과제였나요", decidedQ: "무엇을 직접 정했나요",
  },
  STYLE_CORE_V1: {
    step2: "제작 판단", domainWord: "스타일 영역",
    problemQ: "어떤 사람이나 과제였나요", decidedQ: "무엇을 직접 정했나요",
  },
};

/**
 * 아직 사전을 적지 않은 Core 가 드는 말. **전공을 가리키지 않는다**: 어느
 * 전공에서 읽어도 틀리지 않는 말로 두고, 그 Core 의 말은 사전을 쓰는 날 든다.
 */
export const FLOW_FALLBACK: ExperienceFlow = {
  step2: "직접 정한 것", domainWord: "영역",
  problemQ: "어떤 문제를 다뤘나요", decidedQ: "무엇을 직접 정했나요",
};
