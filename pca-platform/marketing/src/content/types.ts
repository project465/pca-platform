/**
 * 나라별 원고의 형태. 카자흐스탄·터키를 추가할 때는 코드를 고치는 것이 아니라
 * 이 형태를 채운 파일을 하나 더 만든다.
 *
 * 검사 플랫폼의 translations 테이블과 같은 사고방식이다.
 * 나라가 늘어날 때 늘어나는 것은 구조가 아니라 내용이어야 한다.
 */

export type SiteKey = "global" | "kr" | "kz" | "tr";

export type Link = { label: string; href: string };

export type Named = { title: string; body: string };

/** 히어로의 검사 → 처방 흐름 한 칸 */
export type PipelineStep = {
  stage: string;
  value: string;
  body: string;
  /** 이 단계가 만들어내는 데이터. 제품이 실제로 무엇을 남기는지 보여준다 */
  source: string;
};

export type Faq = { q: string; a: string };

/**
 * 결과지 미리보기에 쓰는 예시 값.
 * 실제 응시 데이터가 아니라 설명용이라는 것을 화면에서 밝힌다.
 */
export type JobFit = { name: string; score: number };
export type CompetencyGap = { name: string; required: number; held: number };
export type CohortBar = { name: string; pct: number };

/** 지도에 칠할 상태. 색만으로 구분하지 않고 모양과 라벨을 함께 준다 */
export type DeployStatus = "live" | "progress" | "planned";

export type MapContent = {
  heading: string;
  lead: string;
  /** 지도 위 라벨과 옆 목록에 함께 쓰인다 */
  countries: {
    code: string;
    name: string;
    status: DeployStatus;
    note: string;
    /** 라벨이 서로 겹칠 때만 쓴다. 지도 좌표 기준 어긋냄 */
    labelDx?: number;
    labelDy?: number;
  }[];
  statusLabel: Record<DeployStatus, string>;
  footnote: string;
};


export type SiteContent = {
  key: SiteKey;
  /** <html lang> */
  lang: string;
  /** 표시용 도메인. 실제 도메인은 아직 정해지지 않았다 */
  domain: string;
  /** TODO: 브랜드명 미정. CLAUDE.md 의 "아직 정해지지 않은 것" 에 있다 */
  brand: string;
  /** 검사 플랫폼 주소. 나라가 달라도 이 값은 같다 (설계 원칙 5) */
  platformUrl: string;

  meta: { title: string; description: string };

  nav: {
    items: Link[];
    login: string;
    contact: string;
    /** 좁은 화면에서 메뉴를 여는 버튼 */
    menu: string;
  };

  hero: {
    eyebrow: string;
    title: string[];
    lead: string;
    primary: Link;
    secondary: Link;
  };

  pipeline: {
    heading: string;
    lead: string;
    steps: PipelineStep[];
    /** 역량 갭 막대에 붙는 설명 */
    gapCaption: string;
    footnote: string;
  };

  problem: {
    heading: string;
    lead: string;
    items: Named[];
  };

  outputs: {
    heading: string;
    lead: string;
    cards: {
      kind: "student" | "cohort";
      tag: string;
      title: string;
      body: string;
      bullets: string[];
    }[];
    /** 예시 값이라는 표시 */
    exampleLabel: string;
    student: {
      fitHeading: string;
      jobs: JobFit[];
      gapHeading: string;
      gaps: CompetencyGap[];
      /** 요구 수준 / 보유 수준 을 가리키는 말 */
      requiredLabel: string;
      heldLabel: string;
    };
    cohort: {
      heading: string;
      bars: CohortBar[];
      unit: string;
      /** 학과가 가장 먼저 보는 항목. 교과 개편의 근거가 된다 */
      missingHeading: string;
      missing: string[];
    };
  };

  process: {
    heading: string;
    lead: string;
    steps: Named[];
    note: string;
  };

  faq: {
    heading: string;
    items: Faq[];
  };

  /** 세계지도. 글로벌판에만 둔다 */
  map?: MapContent;

  contact: {
    heading: string;
    lead: string;
    fields: {
      org: string;
      name: string;
      email: string;
      size: string;
      sizeHint: string;
      message: string;
      messageHint: string;
    };
    submit: string;
    sending: string;
    success: string;
    successBody: string;
    error: string;
  };

  footer: {
    note: string;
    sitesLabel: string;
    sites: { label: string; href: string; ready: boolean }[];
    /** 아직 열지 않은 나라에 붙는 말 */
    soonLabel: string;
    platformNote: string;
  };
};
