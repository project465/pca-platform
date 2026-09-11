/**
 * 나라별 원고의 형태.
 *
 * 구조와 문구는 academix.co.kr 의 PCA 소개 페이지를 기준으로 한다.
 * 나라를 추가할 때는 코드가 아니라 이 형태를 채운 파일을 하나 더 만든다.
 */

export type SiteKey = "global" | "kr" | "kz" | "tr";
export type Link = { label: string; href: string };
export type Named = { title: string; body: string };

/* ── 결과지 뷰어 ────────────────────────────────── */

export type SheetTable = { head: string[]; rows: string[][] };

export type SheetBlock = {
  /** SUBSECTION 2-1 같은 표시 */
  sub?: string;
  title?: string;
  /** 문단. 줄바꿈은 배열로 나눈다 */
  body?: string[];
  bullets?: string[];
  table?: SheetTable;
  /** 라벨 + 값 형태의 작은 상자들 */
  fields?: { label: string; value: string }[];
};

export type SheetTab = {
  /** 00-1, 01 … */
  no: string;
  /** 왼쪽 목차에 쓰는 짧은 이름 */
  nav: string;
  /** 결과지 문서 안의 제목 */
  title: string;
  /** 레이더를 그릴지, 글 블록만 놓을지 */
  chart?: "jobs" | "styles";
  /** 레이더 위에 놓는 요약 상자 */
  meta?: { label: string; value: string }[];
  blocks?: SheetBlock[];
  /** 레이더 아래 한 줄 */
  chartNote?: string;
  /** 목차 아래 설명 상자 */
  capTitle: string;
  capBody: string;
  capArrow: string;
};

/* ── 지도 (글로벌판만) ──────────────────────────── */
export type DeployStatus = "live" | "progress" | "planned";
export type MapContent = {
  heading: string;
  lead: string;
  countries: {
    code: string;
    name: string;
    status: DeployStatus;
    note: string;
    labelDx?: number;
    labelDy?: number;
  }[];
  statusLabel: Record<DeployStatus, string>;
  footnote: string;
};

/* ── 홈페이지 절 ─────────────────────────────── */

export type About = {
  label: string;
  heading: string;
  body: string;
  highlight: string;
  brandsLabel: string;
  brands: { name: string; note: string }[];
  partnersLabel: string;
  partners: string[];
  partnersNote: string;
};

export type Program = { label: string; heading: string; lead: string; items: Named[] };

export type Process = {
  label: string;
  heading: string;
  lead: string;
  steps: Named[];
  note: string;
};

export type Faq = { q: string; a: string };
export type FaqBlock = { label: string; heading: string; items: Faq[] };

/** 한국 전용 — 대학이 이 진단을 고르는 이유 */
export type University = {
  label: string;
  heading: string;
  lead: string;
  /** 정책 수치. 출처를 반드시 함께 적는다 */
  facts: { label: string; value: string; unit: string }[];
  source: string;
  points: Named[];
  closing: string;
};

/** 글로벌 전용 — 새 나라에 들어갈 때 무엇이 공유되고 무엇을 새로 채우는가 */
export type Localisation = {
  label: string;
  heading: string;
  lead: string;
  layers: { tag: string; title: string; body: string; items: string[] }[];
  note: string;
};

/** 글로벌 전용 — 파트너십 */
export type Partnership = {
  label: string;
  heading: string;
  lead: string;
  columns: { title: string; items: string[] }[];
  steps: Named[];
};

/**
 * 세 개의 문 — 개인 · 기업 · 학교.
 *
 * 같은 엔진을 세 지갑에 판다. 지갑마다 사는 이유와 결재선이 다르므로
 * 진입 문구·구매 단위·다음 행동을 따로 적는다. 한 문으로 다 받으면
 * 학생이 "우리 학교가 계약했나?" 를 스스로 판단해야 하고, 대학 담당자는
 * 자기 얘기가 아닌 문구를 먼저 읽게 된다.
 */
export type Channels = {
  label: string;
  heading: string;
  lead: string;
  items: {
    key: "individual" | "campus";
    /** 문 위에 붙는 짧은 표시 */
    tag: string;
    title: string;
    /** 누가 이 문으로 들어오는가 */
    who: string;
    body: string;
    /** 이 문으로 들어오면 받는 것 */
    gets: string[];
    /** 구매 단위 — 좌석 1개 / 학과 좌석 / 구독 */
    unit: string;
    cta: Link;
  }[];
  note: string;
};

/** 나라별 사이트 진입 (글로벌판) */
export type Regions = {
  label: string;
  heading: string;
  lead: string;
  liveLabel: string;
  soonLabel: string;
  note: string;
  items: {
    code: string;
    name: string;
    native: string;
    domain: string;
    href: string;
    live: boolean;
  }[];
};

/** 요금제. price 가 비어 있으면 화면은 문의로 흐른다 */
export type Plan = {
  key: string;
  name: string;
  who: string;
  /** 값이 있으면 바로 신청, 없으면 가격 문의로 바뀐다 */
  price: string | null;
  unit: string;
  note: string;
  features: string[];
  cta: { ready: string; ask: string };
  featured?: boolean;
};

export type Pricing = {
  label: string;
  heading: string;
  lead: string;
  plans: Plan[];
  note: string;
  /** 문의 폼에서 고를 때 쓰는 라벨 */
  planLabel: string;
};

/**
 * 예시 결과지 한 장.
 *
 * 홈에서 방법론을 설명하기 전에 결과물을 먼저 보여주기 위한 자리다.
 * 실제 학생 자료가 아니므로 화면에 예시임을 분명히 밝힌다.
 */
export type Sample = {
  label: string;
  heading: string;
  lead: string;
  /** 예시임을 밝히는 한 줄. 화면에서 지우지 않는다 */
  disclaimer: string;
  docTag: string;
  page: string;
  person: { name: string; dept: string; meta: { l: string; v: string }[] };
  jobsLabel: string;
  jobsNote: string;
  jobs: { name: string; score: number }[];
  styleLabel: string;
  styleTypeLabel: string;
  styleType: string;
  styleVerdict: string;
  styleAxes: string[];
  styleScores: number[];
  planLabel: string;
  planNote: string;
  plan: { when: string; what: string; why: string }[];
  localLabel: string;
  localNote: string;
  local: { name: string; note: string }[];
  cta: { line: string; sub: string; primary: Link; secondary: Link };
};

/**
 * 법이 게시하라고 정한 것.
 *
 * 전자상거래법 제10조는 온라인으로 대금을 받는 사업자에게 상호·대표자·주소·
 * 전화·이메일·사업자등록번호·통신판매업 신고번호를 "소비자가 알아보기 쉽게"
 * 표시하도록 한다. 없으면 과태료 대상이고, PG 가맹점 심사에서도 이것부터 본다.
 *
 * 값을 지어내면 안 된다. 비어 있으면 화면이 "확인 필요" 로 표시해 눈에 띄게
 * 한다 — 조용히 빈칸으로 두면 그대로 런칭된다.
 */
export type LegalInfo = {
  /** 상호 */
  company: string;
  /** 대표자 성명 */
  ceo: string;
  /** 영업소 소재지 */
  address: string;
  tel: string;
  email: string;
  /** 사업자등록번호 */
  bizNo: string;
  /** 통신판매업 신고번호 */
  mailOrderNo: string;
  /** 직업정보제공사업 신고번호 */
  jobInfoNo: string;
  /** 개인정보 보호책임자 */
  privacyOfficer: string;
  labels: {
    company: string; ceo: string; address: string; tel: string; email: string;
    bizNo: string; mailOrderNo: string; jobInfoNo: string; privacyOfficer: string;
    heading: string; unset: string;
  };
  links: { terms: string; privacy: string; refund: string };
};

export type SiteContent = {
  key: SiteKey;
  lang: string;
  domain: string;
  brand: string;
  org: string;
  orgTagline: string;
  platformUrl: string;

  meta: { title: string; description: string };

  /** 전자상거래법 제10조 표시 의무. 결제를 받는 나라에서는 비워 두면 안 된다 */
  legal: LegalInfo;

  nav: {
    items: Link[];
    contact: string;
    menu: string;
    floating: string;
    /** 플랫폼으로 들어가는 버튼. 소개만 읽고 나가지 않게 헤더에 둔다 */
    start: string;
  };

  hero: {
    eyebrow: string;
    /** 제목. gold 로 강조할 부분은 {} 로 감싼다 */
    title: string[];
    lead: string;
    primary: Link;
    secondary: Link;
    watermark: string;
    /** 히어로 아래 한 줄. 근거 있는 숫자만 넣는다 */
    proof?: { value: string; label: string }[];
  };

  /** 예시 결과지 — 홈에서 설명보다 먼저 나온다 */
  sample: Sample;

  /** 개인 · 기업 · 학교 세 개의 문 */
  channels: Channels;

  /** 이런 고민, PCA가 방향을 잡아드립니다 */
  who: {
    label: string;
    heading: string;
    items: { no: string; title: string; body: string; tag: string }[];
  };

  /** PCA는 세 가지를 함께 분석합니다 */
  analyze: {
    label: string;
    heading: string;
    lead: string;
    items: { no: string; kicker: string; title: string; body: string }[];
  };

  /** 검사 결과가 진로 로드맵으로 바로 연결됩니다 */
  why: {
    label: string;
    heading: string;
    before: { tag: string; title: string; steps: string[]; verdict: string };
    after: { tag: string; title: string; steps: string[]; verdict: string };
    vs: string;
  };

  /** 결과지 구성 */
  sheet: {
    label: string;
    heading: string;
    lead: string[];
    tabs: SheetTab[];
    /** 결과지 하단의 이어보기 문구 */
    more: string;
    disclaimer: string;
    /** 레이더 축 이름 */
    jobAxes: string[];
    styleAxes: string[];
    /** 레이더 예시 값 */
    jobScores: number[];
    styleScores: number[];
  };

  /** 업무 성향 6유형 */
  styles: {
    label: string;
    heading: string;
    chartNote: string;
    items: { name: string; body: string }[];
  };

  /** 데이터로 설계한 진단 */
  evidence: {
    label: string;
    heading: string;
    lead: string;
    stats: { label: string; value: string; unit: string }[];
    copyright: {
      title: string;
      rows: { name: string; no: string }[];
      note: string;
    };
    standards: {
      title: string;
      head: string[];
      rows: string[][];
      note: string;
    };
  };

  /**
   * 진단 다음에 오는 것 — 이 사업이 서 있는 자리.
   *
   * 진단만 파는 회사로는 규모가 안 나온다(docs/metri/11_scale.md 의 나눗셈).
   * 학과가 큰돈을 쓰는 곳은 교육이고, 교육을 파는 쪽은 누구에게 무엇을
   * 팔아야 하는지 모른다. METRI 는 그 칸을 숫자로 짚는다. 홈에서 이 논지를
   * 빼면 "검사 하나 파는 회사" 로 읽힌다.
   */
  gap: {
    label: string;
    heading: string;
    lead: string;
    /** 학과 집계가 교육 수요로 좁혀지는 네 칸 */
    funnel: { value: string; label: string }[];
    funnelNote: string;
    /** 도구 갈래별로 가진 것과 없는 것. 회사 이름을 적지 않는다 */
    matrix: { head: string[]; rows: string[][]; note: string };
  };

  /** PCA가 선택받는 이유 */
  choose: {
    label: string;
    heading: string;
    items: Named[];
  };

  /** 마감 배너 */
  closing: {
    kicker: string;
    heading: string[];
    lead: string;
    primary: Link;
    secondary: Link;
  };

  about: About;
  program: Program;
  faq: FaqBlock;

  /** 한국 전용 */
  university?: University;
  process?: Process;

  /** 글로벌 전용 */
  localisation?: Localisation;
  partnership?: Partnership;

  pricing: Pricing;
  regions?: Regions;

  contact: {
    heading: string;
    lead: string;
    quickHeading: string;
    quickNote: string;
    quickSubmit: string;
    /** 단체 도입인지 개인 진단인지 */
    typeLabel: string;
    types: { value: string; label: string }[];
    /** 문의 뒤에 무엇이 일어나는지. 문턱을 낮추는 자리다 */
    afterLabel: string;
    after: string[];
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
    soonLabel: string;
    closing: string;
  };

  map?: MapContent;
};
