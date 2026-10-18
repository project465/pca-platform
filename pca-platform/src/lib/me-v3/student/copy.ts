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
 * 적었고 규칙은 넷이다.
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
  TD08: { activity: "숫자를 견주어 결론 내기", evidence: "분석 보고서", family: "decide" },
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
  TD06: { activity: "남길 것과 넘길 것 가르기", evidence: "인계 노트", family: "data" },
  /* 감염관리·무균술 */
  TD07: { activity: "옮는 길을 끊어 두기", evidence: "점검 기록", family: "rule" },
  /* 환자안전·사고 예방 */
  TD08: { activity: "넘어질 자리를 미리 막기", evidence: "위험 평가 기록", family: "site" },
  /* 환자·가족 교육·상담 */
  TD09: { activity: "환자가 알아듣게 설명하기", evidence: "교육 기록", family: "talk" },
  /* 중증도 분류·우선 배정 */
  TD10: { activity: "누구를 먼저 볼지 가르기", evidence: "분류 기록", family: "decide" },
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
  TD04: { activity: "요건을 보고 처리 여부 가르기", evidence: "처리 기록", family: "decide" },
  /* 인사·조직 운영 */
  TD05: { activity: "자리를 나누고 기준 정하기", evidence: "직무 기준", family: "people" },
  /* 성과 관리·평가 */
  TD06: { activity: "무엇을 셀지 정하고 재 보기", evidence: "성과 보고서", family: "compare" },
  /* 공공데이터·통계 분석 */
  TD07: { activity: "자료를 모아 견주어 읽기", evidence: "분석 보고", family: "data" },
  /* 회계·감사 */
  TD08: { activity: "쓴 돈이 규정에 맞는지 보기", evidence: "감사 조서", family: "verify" },
  /* 주민 참여·협력 */
  TD09: { activity: "의견을 듣고 반영 범위 정하기", evidence: "의견 분류표", family: "talk" },
  /* 재난·안전 관리 */
  TD10: { activity: "위험한 자리를 찾아 손보기", evidence: "점검 조서", family: "site" },
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
  TD08: { activity: "뚫릴 자리를 찾아 막기", evidence: "권한 설계표", family: "rule" },
  /* 기계학습·데이터 분석 */
  TD09: { activity: "자료로 모형을 만들고 재 보기", evidence: "평가 결과표", family: "decide" },
  /* 테스트·품질·배포 운영 */
  TD10: { activity: "고장 날 곳을 미리 시험하기", evidence: "시험 묶음", family: "verify" },
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

export const STUDENT_COPY: Record<string, Record<string, StudentDomain>> = {
  BIZ_CORE_V1: BIZ,
  NURSING_CORE_V1: NURSING,
  PUBADM_CORE_V1: PUBADM,
  CS_CORE_V1: CS,
  EE_CORE_V1: EE,
  MEDIA_CORE_V1: MEDIA,
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
};

/** 아직 사전을 적지 않은 Core 가 드는 예시. **전공을 가리키지 않는다** */
export const EXAMPLE_FALLBACK = "예: 수업 과제에서 직접 맡았던 일 하나";
