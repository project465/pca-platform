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
 * 화면에 박혀 있던 문구를 원고로 끌어낸 것.
 *
 * 나라가 둘일 때는 `kr ? "…" : "…"` 로 버틸 수 있었지만 셋이 되는 순간
 * 그 방식은 무너진다 — 새 나라가 영어판 문구를 뒤집어쓴다. 나라를 더할 때
 * 코드를 고치지 않는다는 원칙(index.ts)을 지키려면 여기 있어야 한다.
 */
export type Ui = {
  /** 홈 — 한눈에 보는 흐름 */
  glanceLabel: string;
  glanceHeading: string;
  /** 흐름 다섯 칸 */
  flow: string[];
  sheetCta: string;
  moreLabel: string;
  moreHeading: string;
  /** /metri 아래쪽 이어보기 */
  nextLabel: string;
  nextHeading: string;
  /** 브라우저 탭에 뜨는 이름 */
  pageTitles: Record<string, string>;
  /** 페이지 끝의 이어보기 카드 제목 */
  linkTitles: Record<string, string>;
  /** 사진이 들어갈 자리에 적어 두는 설명 */
  photos: {
    home: string[];
    about: string[];
    metri: string;
    adopt: string;
    localisation: string;
  };
};

export type SiteContent = {
  key: SiteKey;
  lang: string;
  domain: string;
  /**
   * 화면의 색과 결. 비우면 기본(밝은 바탕 · 잉크 · 금색)이다.
   * globals.css 의 [data-theme="…"] 와 이름이 맞아야 한다.
   */
  theme?: string;
  brand: string;
  org: string;
  orgTagline: string;
  platformUrl: string;

  meta: { title: string; description: string };

  ui: Ui;

  nav: {
    items: Link[];
    contact: string;
    menu: string;
    floating: string;
    /** 플랫폼으로 넘어가는 단추. 나라가 달라도 가리키는 곳은 한 군데다 (설계 원칙 5) */
    login: string;
    /** 로그인 옆에 붙는 한 줄. 계정이 어디서 나오는지 알려 준다 */
    loginNote: string;
  };

  hero: {
    eyebrow: string;
    /** 제목. gold 로 강조할 부분은 {} 로 감싼다 */
    title: string[];
    lead: string;
    primary: Link;
    secondary: Link;
    watermark: string;
  };

  /** 예시 결과지 — 홈에서 설명보다 먼저 나온다 */
  sample: Sample;

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
    /* 보내기 전에 무엇이 어디로 가는지 알리는 한 줄. 방침이 그 말로
       준비된 나라에서만 채운다 */
    privacyNote?: { text: string; linkLabel: string };
  };

  footer: {
    note: string;
    sitesLabel: string;
    sites: { label: string; href: string; ready: boolean }[];
    soonLabel: string;
    closing: string;
    /* 처리방침은 플랫폼에 있다. 아직 그 나라 말로 된 판이 없으면 비워 둔다 —
       없는 문서로 링크를 걸어 두는 것보다 링크가 없는 편이 낫다 */
    privacyLabel?: string;
  };

  map?: MapContent;
};
