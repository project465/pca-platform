/**
 * 나라별 원고의 형태.
 *
 * 구조는 ACADEMIX 의 PCA 제안서를 그대로 따른다. 카자흐스탄·터키를 추가할 때는
 * 코드를 고치는 것이 아니라 이 형태를 채운 파일을 하나 더 만든다.
 * 검사 플랫폼의 translations 테이블과 같은 사고방식이다.
 */

export type SiteKey = "global" | "kr" | "kz" | "tr";

export type Link = { label: string; href: string };
export type Named = { title: string; body: string };

/* ── 업무 성향 육각형 ────────────────────────────── */
export type Trait = {
  code: string;
  name: string;
  body: string;
  /** 예시 점수(0~100). 실제 응시 결과가 아니라 설명용이다 */
  score: number;
};

/* ── 리포트 목차 ────────────────────────────────── */
export type ReportSection = { no: string; title: string; body: string };

/* ── 지도 ───────────────────────────────────────── */
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

export type Faq = { q: string; a: string };

export type SiteContent = {
  key: SiteKey;
  lang: string;
  domain: string;
  /** 제품명 */
  brand: string;
  /** 제품을 만든 기관 */
  org: string;
  platformUrl: string;

  meta: { title: string; description: string };

  nav: { items: Link[]; login: string; contact: string; menu: string };

  hero: {
    eyebrow: string;
    /** 히어로 옆 리포트 축소판에 붙는 말 */
    coverKicker: string;
    coverNote: string;
    /** 제안서 표지의 영문 제목. 줄바꿈은 원고가 정한다 */
    display: string[];
    title: string;
    lead: string;
    primary: Link;
    secondary: Link;
  };

  /** 기관 소개와 신뢰 근거 */
  about: {
    label: string;
    heading: string;
    body: string;
    highlight: string;
    services: Named[];
    brandsLabel: string;
    brands: { name: string; note: string }[];
    partnersLabel: string;
    partners: string[];
  };

  /** 개발 근거 숫자 */
  evidence: {
    heading: string;
    lead: string;
    stats: { value: string; label: string }[];
  };

  /** 전공을 정하고도 남는 질문들 */
  questions: {
    heading: string;
    lead: string;
    items: string[];
    note: string;
  };

  /** PCA 가 분석하는 세 가지 */
  analysis: {
    heading: string;
    lead: string;
    pillars: Named[];
    note: string;
  };

  /** 2축 분석 — 직무 영역과 업무 성향 */
  traits: {
    heading: string;
    lead: string;
    /** 왼쪽(직무 영역) 칸 제목 */
    fitTitle: string;
    /** 2·3순위를 어떻게 쓰는지 */
    fitNote: string;
    scaleNote: string;
    exampleLabel: string;
    chartTitle: string;
    items: Trait[];
  };

  /** 기존 검사와의 차이 */
  compare: {
    heading: string;
    lead: string;
    before: { tag: string; title: string; steps: string[]; verdict: string };
    after: { tag: string; title: string; steps: string[]; verdict: string };
  };

  /** 리포트 구성 */
  report: {
    heading: string;
    lead: string;
    volume: string;
    sections: ReportSection[];
    /** 결과지 축소판에 쓰는 예시 */
    exampleLabel: string;
    rankTitle: string;
    ranks: { name: string; score: number }[];
  };

  /** 지역 연계 · 정주형 (핵심 차별점) */
  region: {
    label: string;
    heading: string;
    lead: string;
    beforeValue: string;
    beforeLabel: string;
    afterValue: string;
    afterLabel: string;
    clustersLabel: string;
    clusters: string[];
    points: Named[];
    quote: string;
    quoteSource: string;
  };

  /** 대학이 이 진단을 고르는 이유 */
  university: {
    label: string;
    heading: string;
    lead: string;
    points: Named[];
    closing: string;
  };

  /** 도입 절차 */
  process: {
    heading: string;
    lead: string;
    steps: Named[];
    note: string;
  };

  /** 이런 분들께 추천 */
  audience: {
    heading: string;
    items: string[];
  };

  faq: { heading: string; items: Faq[] };

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
    soonLabel: string;
    platformNote: string;
    closing: string;
  };

  /** 세계지도. 글로벌판에만 둔다 */
  map?: MapContent;
};
