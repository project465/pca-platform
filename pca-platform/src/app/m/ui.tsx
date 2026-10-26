import Link from "next/link";
import { Icon, type IconName } from "@/components/sf/icon";

/**
 * 앱 화면이 같이 쓰는 조각. 이름이 전부 `ma-` 로 시작한다: 이 저장소에서
 * 이름이 겹쳐 생김새가 조용히 바뀐 일이 여섯 번 있었다(`.btn` · `.lg` ·
 * `empty` …).
 */

/** 쪽 머리. 큰 제목 하나와 오른쪽 아이콘 단추 하나까지 */
export function AppHead({ title, kicker, back, right }: {
  title: string;
  kicker?: string;
  /** 있으면 왼쪽에 돌아가기 */
  back?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="ma-head">
      <div className="ma-head-row">
        {back ? (
          <Link href={back} className="ma-icon-btn" aria-label="돌아가기">
            <Icon name="chev" size={20} style={{ transform: "rotate(180deg)" }} />
          </Link>
        ) : <span />}
        {right ?? <span />}
      </div>
      {kicker ? <p className="ma-kicker">{kicker}</p> : null}
      <h1 className="ma-title">{title}</h1>
    </header>
  );
}

export function Section({ title, more, children }: {
  title: string; more?: { href: string; label: string }; children: React.ReactNode;
}) {
  return (
    <section className="ma-sec">
      <div className="ma-sec-head">
        <h2>{title}</h2>
        {more ? <Link href={more.href}>{more.label}</Link> : null}
      </div>
      {children}
    </section>
  );
}

/** 누르면 다른 자리로 가는 한 줄 */
export function Row({ href, icon, title, sub, tail, plain, unread }: {
  href: string; icon?: IconName; title: string; sub?: string; tail?: React.ReactNode;
  /** 아직 읽지 않은 알림. 색 점 하나와 읽는 이름표로 알린다 */
  unread?: boolean;
  /** 파일을 내려주는 주소(달력 · PDF). `Link` 로 걸면 Next 가 미리 불러온다 */
  plain?: boolean;
}) {
  const Tag = plain ? "a" : Link;
  return (
    <Tag href={href} className="ma-row">
      {icon ? <span className="ma-row-ic"><Icon name={icon} size={18} /></span> : null}
      <span className="ma-row-body">
        <b>{unread ? <><span className="ma-dot" role="img" aria-label="읽지 않음" />{" "}</> : null}{title}</b>
        {sub ? <small>{sub}</small> : null}
      </span>
      {tail ?? <Icon name="chev" size={16} className="ma-row-chev" />}
    </Tag>
  );
}

export function Empty({ title, children, cta }: {
  title: string; children?: React.ReactNode; cta?: { href: string; label: string };
}) {
  return (
    <div className="ma-empty">
      <b>{title}</b>
      {children ? <p>{children}</p> : null}
      {cta ? <Link className="ma-btn is-primary" href={cta.href}>{cta.label}</Link> : null}
    </div>
  );
}

/** 마감까지 남은 날. 오늘이면 `D-day` */
export function Dday({ left }: { left: number }) {
  const tone = left <= 3 ? " is-hot" : left <= 7 ? " is-near" : "";
  return <span className={`ma-dday${tone}`}>{left === 0 ? "D-day" : `D-${left}`}</span>;
}
