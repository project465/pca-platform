/**
 * 홈페이지 원고의 형태 (2026-10-21 판).
 *
 * 앞 판(`types.ts`)은 옛 검사(ME_V1)의 결과지 미리보기와 업무 성향 6축과
 * 직무 적합도 점수를 품고 있었다. 지금 제품은 그 가운데 어느 것도 내지
 * 않아서, 원고 모양부터 지금 제품이 하는 일에 맞춰 다시 짰다:
 *
 *   전공별 진단 검사 → 결과지(웹·PDF) → 내 CareerMatri 작업공간
 *
 * `types.ts` 는 kz·tr 원고가 아직 읽고 있어 남겨 둔다(현지 검수 전 초안이고
 * 이 판의 쪽에는 연결하지 않았다). 나라를 다시 붙일 때는 이 파일의 모양으로
 * 원고를 하나 더 쓴다.
 *
 * **앱으로 가는 주소는 원고에 상대 경로로 적는다**(`/cores`, `/login`).
 * 읽는 자리(`getSite()`)가 `withAppLinks` 로 한 번에 앱 주소로 돌린다.
 */

export type SiteKey = "kr" | "global";
export type Link = { label: string; href: string };
export type Titled = { title: string; body: string };

/**
 * 그 나라 말로 보인 검사지·결과지 한 벌. `status` 가 그 말의 상태를 정직하게
 * 적는다: 실제 문항이 있는 말과 번역 초안인 말을 같은 모양으로 두지 않는다
 */
export type GlobalSample = {
  /** 화면에 서는 언어 이름 (예: English · Türkçe · Русский) */
  lang: string;
  /** `lang` 속성 값 (en · tr · ru) */
  code: string;
  /** 한국어 언어 이름 */
  langKo: string;
  status: "live" | "draft";
  statusLabel: string;
  question: { label: string; area: string; text: string; scale: string[] };
  result: { label: string; areasLabel: string; areas: string[]; nextLabel: string; next: string };
};

/** 화면 예시. 실제 응시자의 자료가 아니라는 표시(`label`)를 늘 같이 든다 */
export type WorkspaceMock = {
  label: string;
  brandSub: string;
  nav: string[];
  title: string;
  meta: string;
  todoLabel: string;
  todoTitle: string;
  todoBody: string;
  todoCta: string;
  todoMore: string;
  stateLabel: string;
  stateSub: string;
  tiles: { name: string; sub: string }[];
  changeLabel: string;
  changes: { text: string; date: string }[];
};

export type ReportMock = {
  label: string;
  school: string;
  docTitle: string;
  docMeta: string;
  headline: string;
  headlineSub: string;
  cells: { label: string; title: string; body: string }[];
};

export type CampusMock = {
  label: string;
  title: string;
  meta: string;
  kpis: { label: string; value: string; note: string }[];
  tableTitle: string;
  head: string[];
  rows: string[][];
  hiddenNote: string;
  exportLabel: string;
};

export type LegalInfo = {
  company: string;
  ceo: string;
  address: string;
  tel: string;
  email: string;
  bizNo: string;
  /** 통신판매업 신고번호. 발급 전이면 비워 두고 화면이 `unset` 으로 적는다 */
  mailOrderNo: string;
  jobInfoNo: string;
  privacyOfficer: string;
  labels: {
    heading: string;
    company: string; ceo: string; address: string; tel: string; email: string;
    bizNo: string; mailOrderNo: string; jobInfoNo: string; privacyOfficer: string;
    unset: string;
  };
};

export type Faq = { q: string; a: string; link?: Link };

export type SiteContent = {
  key: SiteKey;
  lang: string;
  domain: string;
  brand: string;
  platformUrl: string;

  meta: { title: string; description: string; ogAlt: string };

  ui: {
    skip: string;
    menu: string;
    close: string;
    mockTag: string;
    copy: string;
    copied: string;
    external: string;
  };

  nav: {
    items: Link[];
    staffLogin: Link;
    login: Link;
    start: Link;
    /** 좁은 화면에서 메뉴 옆에 서는 단추의 짧은 이름 (주소는 start 와 같다) */
    startShort: string;
  };

  home: {
    hero: {
      eyebrow: string;
      title: string[];
      lead: string;
      primary: Link;
      secondary: Link;
      note: string;
      noteLink: Link;
    };
    mock: WorkspaceMock;
    how: {
      label: string;
      title: string;
      lead: string;
      steps: { no: string; title: string; body: string; points: string[] }[];
    };
    report: {
      label: string;
      title: string;
      lead: string;
      items: Titled[];
      note: string;
      mock: ReportMock;
    };
    majors: {
      label: string;
      title: string;
      lead: string;
      groups: { name: string; items: string[] }[];
      note: string;
      cta: Link;
    };
    /**
     * 해외 진행. 지도에 칠하는 나라는 `iso`(ISO 3166 숫자 코드, world-atlas 의
     * id)로 고른다. **확인된 자료가 있는 나라만 적는다**: 지어낸 나라 하나가
     * 지도 전체의 신뢰를 깎는다. 없는 원고(global)는 이 절을 세우지 않는다
     */
    global?: {
      label: string;
      title: string;
      lead: string;
      legend: { done: string; planned: string };
      countries: { iso: string; name: string; status: "done" | "planned"; schools?: string[] }[];
      source: string;
      samples: {
        title: string;
        lead: string;
        items: GlobalSample[];
      };
    };
    campus: {
      label: string;
      title: string;
      lead: string;
      points: Titled[];
      primary: Link;
      secondary: Link;
    };
    personal: {
      label: string;
      title: string;
      lead: string;
      cards: {
        tag: string;
        title: string;
        body: string;
        price?: string;
        priceNote?: string;
        points: string[];
        cta: Link;
      }[];
    };
    faq: { label: string; title: string; items: Faq[] };
    closing: { title: string; lead: string; primary: Link; secondary: Link };
  };

  universities: {
    meta: { title: string; description: string };
    hero: {
      eyebrow: string;
      title: string[];
      lead: string;
      primary: Link;
      secondary: Link;
    };
    mock: CampusMock;
    flow: { label: string; title: string; lead: string; steps: Titled[] };
    features: { label: string; title: string; items: Titled[] };
    access: {
      label: string;
      title: string;
      body: string;
      url: string;
      urlNote: string;
      login: Link;
    };
    privacy: { label: string; title: string; items: string[] };
    faq: { label: string; title: string; items: Faq[] };
    closing: { title: string; lead: string; primary: Link; secondary: Link };
  };

  /** 한국 시장에만 있는 상품. 없으면 메뉴에도 쪽에도 서지 않는다 */
  assistant?: {
    meta: { title: string; description: string };
    hero: {
      eyebrow: string;
      title: string[];
      lead: string;
      primary: Link;
      secondary: Link;
      note: string;
    };
    features: { label: string; title: string; items: Titled[]; planned: string; plannedNote: string };
    plans: {
      label: string;
      title: string;
      lead: string;
      items: { name: string; price: string; unit: string; body: string; featured?: boolean; cta: Link }[];
      notes: string[];
      trial: string;
    };
    faq: { label: string; title: string; items: Faq[] };
    closing: { title: string; lead: string; primary: Link; secondary: Link };
  };

  contact: {
    meta: { title: string; description: string };
    eyebrow: string;
    title: string;
    lead: string;
    direct: {
      title: string;
      emailLabel: string;
      telLabel: string;
      hoursNote: string;
    };
    company: { title: string };
    form: {
      title: string;
      lead: string;
      honest: string;
      fields: {
        org: string; orgHint: string;
        name: string; nameHint: string;
        reply: string; replyHint: string;
        type: string;
        size: string; sizeHint: string;
        message: string; messageHint: string;
      };
      types: string[];
      subject: string;
      bodyIntro: string;
      send: string;
      copy: string;
      opened: string;
      copiedAll: string;
      needOrg: string;
    };
    after: { title: string; items: string[] };
    others: { title: string; items: Link[] };
  };

  notFound: { title: string; body: string; home: Link; start: Link };

  legal: LegalInfo;

  footer: {
    tagline: string;
    columns: { title: string; links: Link[] }[];
    copyright: string;
  };
};
