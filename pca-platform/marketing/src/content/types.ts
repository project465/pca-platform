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

export type SiteContent = {
  key: SiteKey;
  lang: string;
  domain: string;
  brand: string;
  org: string;
  orgTagline: string;
  platformUrl: string;

  meta: { title: string; description: string };

  nav: { items: Link[]; contact: string; menu: string; floating: string };

  hero: {
    eyebrow: string;
    /** 제목. gold 로 강조할 부분은 {} 로 감싼다 */
    title: string[];
    lead: string;
    primary: Link;
    secondary: Link;
    watermark: string;
  };

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

  contact: {
    heading: string;
    lead: string;
    quickHeading: string;
    quickNote: string;
    quickSubmit: string;
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
