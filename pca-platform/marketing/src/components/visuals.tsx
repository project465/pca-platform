import type { SiteContent } from "@/content";

/**
 * 페이지 머리. 각 페이지가 어디인지 한 줄로 알려준다.
 */
export function PageHead({
  label,
  title,
  lead,
}: {
  label: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="pagehead">
      <div className="wrap">
        <span className="label-sm">{label}</span>
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
    </div>
  );
}

/**
 * 사진 자리.
 *
 * ACADEMIX 는 특강·멘토링·채용박람회를 직접 운영하므로 현장 사진이 있다.
 * 여기에 그 사진을 넣으면 된다. 넣기 전까지는 어떤 사진이 들어갈 자리인지
 * 화면에서 밝혀 둔다. 아무 스톡 사진이나 채워 넣지 않는다.
 */
export function PhotoSlot({
  caption,
  src,
  ratio = "16 / 9",
  tone = "brand",
}: {
  caption: string;
  /** 그림 주소. 없으면 빈 칸이 그대로 나간다 */
  src?: string;
  ratio?: string;
  tone?: "brand" | "ink";
}) {
  /* 그림이 있으면 그림을 건다. 설명은 alt 로 넘어간다 — 화면에 겹쳐
     띄우지 않는다. 이 그림들은 AI 로 만든 것이고, 그 사실은 꼬리에서
     한 번 밝힌다. 장마다 적으면 읽는 사람이 그것만 보게 된다 */
  if (src) {
    return (
      <figure className="photoslot filled" style={{ aspectRatio: ratio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={caption} loading="lazy" decoding="async" />
      </figure>
    );
  }

  return (
    <figure className={`photoslot ${tone}`} style={{ aspectRatio: ratio }}>
      <div className="inner">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2.5" y="4.5" width="19" height="15" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8.5" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 17l5.2-4.4 4 3.2 3.4-2.6L21 17" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <figcaption>{caption}</figcaption>
      </div>
    </figure>
  );
}

/** 검사에서 실행까지 한 줄로 보여주는 흐름도 */
export function FlowDiagram({ steps }: { steps: { k: string; v: string }[] }) {
  return (
    <ol className="flow">
      {steps.map((s, i) => (
        <li key={s.k}>
          <span className="k">{s.k}</span>
          <span className="v">{s.v}</span>
          {i < steps.length - 1 ? (
            <span className="arrow" aria-hidden="true">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** 결과지 축소판. 실제 목차 데이터를 줄여 그린다 */
export function ReportMini({ site }: { site: SiteContent }) {
  const toc = site.sheet.tabs.slice(2, 8);
  return (
    <div className="cover" aria-hidden="true">
      <div className="sheet back">
        <span className="k">{site.brand}</span>
        <ul>
          {toc.map((s) => (
            <li key={s.no}>
              <b>{s.no}</b>
              <i>{s.nav}</i>
            </li>
          ))}
        </ul>
      </div>
      <div className="sheet front">
        <span className="k">{site.sheet.label}</span>
        <strong>
          {site.hero.title.map((l) => (
            <span key={l}>{l.replace(/[{}]/g, "")}</span>
          ))}
        </strong>
        <span className="n">{site.sheet.heading}</span>
      </div>
    </div>
  );
}

/** 큰 문장 하나만 놓는 자리. 글이 길게 이어질 때 숨을 준다 */
export function PullQuote({ children, source }: { children: React.ReactNode; source?: string }) {
  return (
    <blockquote className="pull">
      <p>{children}</p>
      {source ? <cite>{source}</cite> : null}
    </blockquote>
  );
}

/** 다음 페이지로 넘기는 띠 */
export function NextLink({ label, title, href }: { label: string; title: string; href: string }) {
  return (
    <a className="nextlink" href={href}>
      <span className="l">{label}</span>
      <span className="t">{title}</span>
      <span className="a" aria-hidden="true">→</span>
    </a>
  );
}
