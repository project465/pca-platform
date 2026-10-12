/**
 * 작업공간이 되풀이해 쓰는 조각.
 *
 * **화면마다 다시 디자인하지 않는다**(규격 §3). Home 이 쓰는 모양을 여기
 * 한 번 적어 두고, `현재 상태`·`다음 할 일`·`경험`·`결과 기록`·`산업·직무`·
 * `지역·기관`·`지원 기록`·`Track`·`계정` 이 같은 조각을 **가져다 쓴다**.
 * 쪽마다 비슷한 markup 을 다시 적으면 어느 날 한 쪽만 고쳐지고, 그 어긋남은
 * 쪽을 이어서 누를 때만 보인다.
 *
 * **껍데기는 여기 없다.** `WorkspaceShell`·`WorkspaceSidebar`·
 * `WorkspaceHeader`·`WorkspacePageTitle`·`MobileHeader`·`MobileBottomNav` 는
 * 전부 `./shell` 의 `CmShell` 과 `CmHead` 안에 이미 있다. 같은 일을 하는
 * 조각을 여기 또 만들면 띠가 두 벌이 된다(규격 §3).
 *
 * **값을 여기서 만들지 않는다.** 조각은 받은 것을 그리기만 하고, 판단도
 * 문장도 부르는 쪽이 `currentState()` 와 `text.ko` 에서 가져온다.
 *
 * **숫자를 여기 적지 않는다**(규격 §2). 색과 여백과 둥글기와 활자는 전부
 * `workspace.tokens.css` 의 `--cm-*` 이고, 이 파일이 드는 것은 class 이름뿐이다.
 */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "@/components/sf/icon";

/**
 * 쪽에서 가장 강한 자리(규격 §3 · §5).
 *
 * 옅은 파란 면 하나에 꼬리표와 할 일과 까닭과 **주된 단추 하나**를 담는다.
 * **짙은 단추는 쪽에 하나다**: 이 칸이 그것을 들고 있으므로 쪽 머리에 또
 * 세우지 않는다.
 */
export function PrimaryActionHero({
  tag, tagIcon = "target", title, why, action, more,
}: {
  tag: string;
  tagIcon?: IconName;
  /** **문장을 여기서 짓지 않는다**: 부르는 쪽이 `text.ko` 에서 가져온다.
   *  자료가 없어 빈 줄이 오면 그 자리를 비운다 */
  title: string | null;
  /** 그렇게 본 까닭. **못 찾으면 적지 않는다**: 지어낸 까닭이 가장 먼저 거짓이 된다 */
  why?: string;
  action: ReactNode;
  /** 주된 단추 옆의 거드는 길 */
  more?: ReactNode;
}) {
  return (
    <section className="cm-hero">
      {/* 오른쪽의 가벼운 표시. **새 그림 파일을 만들지 않는다**
          (규격 §5): 네모와 선과 동그라미뿐이고 값도 상태도 적지 않는다 */}
      <div className="cm-hero-art" aria-hidden>
        <svg width="200" height="162" viewBox="0 0 200 162" fill="none">
          {/* 흰 판 하나가 그림을 담는다. Hero 의 파란 면 위에서 한
              단 떠 보이게 하는 자리라 **값도 상태도 적지 않는다** */}
          <rect x="26" y="10" width="168" height="134" rx="18"
            fill="#fff" stroke="#d8e5f7" />
          <rect x="48" y="30" width="124" height="98" rx="13"
            fill="#f4f9ff" stroke="#dde8f8" />
          <rect x="88" y="21" width="44" height="17" rx="7"
            fill="#dce9fa" stroke="#c6dbf3" />
          {[48, 72, 96].map((y, i) => (
            <g key={y}>
              <rect x="61" y={y} width="17" height="17" rx="5"
                fill="#dceafb" stroke="#bcd6f2" />
              <path d={`M65 ${y + 8.5}l3.1 3.1 5.6 -6`} stroke="#1c5fb0"
                strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="86" y={y + 5} width={i === 2 ? 44 : 70} height="7" rx="3.5"
                fill={i === 2 ? "#dce7f6" : "#cfe0f5"} />
            </g>
          ))}
          {/* 판의 왼쪽 아래 모서리에 **걸친** 동그라미 하나.
              떨어져 서면 떠 있는 표시가 되고, 걸쳐야 두 면이 앞뒤로 선다 */}
          <circle cx="44" cy="122" r="31" fill="#fff" />
          <circle cx="44" cy="122" r="25" fill="url(#cmHeroG)" />
          <path d="M33 122l7.5 7.5 14.5 -15.5" stroke="#fff" strokeWidth="3.6"
            strokeLinecap="round" strokeLinejoin="round" />
          {/* 거드는 모양 둘. 담긴 뜻이 없고 면의 깊이를 만든다 */}
          <circle cx="186" cy="34" r="8" stroke="#c6dbf3" strokeWidth="2" />
          <circle cx="16" cy="56" r="4.5" fill="#c6dbf3" />
          <defs>
            <linearGradient id="cmHeroG" x1="19" y1="97" x2="69" y2="147"
              gradientUnits="userSpaceOnUse">
              <stop stopColor="#2f7ad6" />
              <stop offset="1" stopColor="#1b5aa8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="cm-hero-txt">
        <p className="cm-hero-tag"><Icon name={tagIcon} size={17} />{tag}</p>
        <h2 className="cm-hero-h">{title}</h2>
        {why ? <p className="cm-hero-why">{why}</p> : null}
        <div className="cm-hero-acts">
          {action}
          {more}
        </div>
      </div>
    </section>
  );
}

/**
 * 묶음 머리(규격 §3).
 *
 * 표시 하나와 이름과 전체로 가는 길이다. **색은 뜻을 갖지 않는다**:
 * `tone` 은 묶음 셋이 한 덩이로 읽히지 않게 하는 자리이고, 어느 색이 더
 * 급하다는 뜻이 없다.
 */
export function SectionHeader({
  icon, tone, title, moreHref, moreLabel, sub,
}: {
  icon: IconName;
  /** 표시의 색조. 적지 않으면 기본(파랑) */
  tone?: "b" | "c";
  title: string;
  moreHref?: string;
  moreLabel?: string;
  /** 머리 아래 한 줄 */
  sub?: ReactNode;
}) {
  return (
    <>
      <h2 className={`cm-sh${tone ? ` is-${tone}` : ""}`}>
        <Icon name={icon} size={18} />
        {title}
        {moreHref ? <Link href={moreHref}>{moreLabel}</Link> : null}
      </h2>
      {sub ? <SectionNote>{sub}</SectionNote> : null}
    </>
  );
}

/**
 * 묶음 머리 아래의 한 줄.
 *
 * **머리와 떼어 둔 까닭**은 한 묶음이 상태마다 다른 줄을 들기 때문이다.
 * `최근 변화` 는 굳은 결과에서 온 줄과 아직 더하지 않은 경험에서 온 줄을
 * 따로 세운다.
 */
export function SectionNote({ children }: { children: ReactNode }) {
  return <p className="cm-shsub">{children}</p>;
}

/**
 * 영역 한 칸(규격 §3 · §6).
 *
 * **큰 dashboard tile 로 만들지 않는다.** 담는 것은 이름과 그 영역이 일하는
 * 차례 한 줄이고, 수를 적지 않는다.
 */
export function DomainTile({
  href, icon, title, sub,
}: {
  href: string; icon: IconName; title: string; sub?: string;
}) {
  return (
    <Link className="cm-tile" href={href}>
      <span className="cm-tile-ico"><Icon name={icon} size={18} /></span>
      <span className="cm-tile-txt">
        <b>{title}</b>
        {sub ? <small>{sub}</small> : null}
      </span>
      <Icon name="chev" size={16} />
    </Link>
  );
}

/**
 * 지나간 일 한 줄(규격 §3 · §7).
 *
 * **줄마다 카드를 만들지 않는다.** 줄 넷이 한 덩이로 읽히지 않게 하는 것은
 * 표시의 색조뿐이고, 그 색은 뜻을 갖지 않는다.
 */
export function ActivityRow({
  icon, tint, text, time, actions, rest,
}: {
  icon: IconName;
  /** 표시의 색조(`t-2`·`t-3`·`t-4`). 적지 않으면 기본 */
  tint?: string;
  text: ReactNode;
  /** **`null` 과 빠뜨린 것을 가른다**: `null` 은 `자리는 있고 값이 없다`
   *  이고 빠뜨린 것은 `그 줄에 때가 없다` 다 */
  time?: string | null;
  actions?: ReactNode;
  /** 나머지 수를 적는 마지막 줄인가 */
  rest?: boolean;
}) {
  return (
    <li className={rest ? "is-rest" : undefined}>
      <span className={`cm-feed-ico${tint ? ` ${tint}` : ""}`}>
        <Icon name={icon} size={15} />
      </span>
      <p className="cm-feed-txt">{text}</p>
      {time ? <time>{time}</time> : null}
      {actions ? <span className="cm-feed-acts">{actions}</span> : null}
    </li>
  );
}

/**
 * 쌓여 있는 기록 한 줄(규격 §3 · §8).
 *
 * `ActivityRow` 와 따로 둔 까닭은 드는 것이 달라서다. 저쪽은 **일어난 일
 * 한 문장**이고 이쪽은 **이름과 그 이름이 무엇인지**다. 한 조각에 담으면
 * 부르는 쪽이 문장과 이름을 같은 칸에 넣게 된다.
 */
export function RecordRow({
  icon, tint, title, note, time, actions,
}: {
  icon: IconName;
  tint?: string;
  title: string;
  note?: string;
  time?: string | null;
  actions?: ReactNode;
}) {
  return (
    <li>
      <span className={`cm-feed-ico${tint ? ` ${tint}` : ""}`}>
        <Icon name={icon} size={15} />
      </span>
      <p className="cm-feed-txt">
        <b>{title}</b>
        {note ? <small>{note}</small> : null}
      </p>
      {time !== undefined ? <time>{time}</time> : null}
      {actions ? <span className="cm-feed-acts">{actions}</span> : null}
    </li>
  );
}

/**
 * 아직 담긴 것이 없는 자리(규격 §3).
 *
 * **점선 테두리에 `아직 없습니다` 를 적은 칸을 쌓지 않는다.** 꺼진 면
 * 하나에 무엇이 없는지와 그 까닭을 적는다. 빈 카드가 넷까지 서면 읽는
 * 사람은 자기 결과가 덜 만들어진 줄 안다.
 */
export function EmptyState({
  children, style,
}: { children: ReactNode; style?: CSSProperties }) {
  return <div className="cm-soon" style={style}>{children}</div>;
}

/**
 * 요약 Hero(규격 §2 B).
 *
 * `PrimaryActionHero` 와 따로 둔 까닭은 드는 것이 달라서다. 저쪽은 **다음
 * 행동 하나**를 크게 들고, 이쪽은 **지금 상태 한 값**을 들고 그 뒤에
 * 행동을 둔다. 하나로 묶으면 부르는 쪽이 상태와 행동을 같은 칸에 넣는다.
 *
 * **새 지표를 만들지 않는다.** `value` 는 부르는 쪽이 이미 세어 둔 값이고
 * 여기서 더하거나 비율로 바꾸지 않는다.
 */
export function StatHero({
  icon = "target", label, value, unit, note, action, more,
}: {
  icon?: IconName;
  label: string;
  value: string | number;
  unit?: string;
  /** 그 값이 무엇을 뜻하는지 한 줄. **못 찾으면 적지 않는다** */
  note?: ReactNode;
  action?: ReactNode;
  more?: ReactNode;
}) {
  return (
    <section className="cm-stat">
      <span className="cm-stat-ico"><Icon name={icon} size={20} /></span>
      <div className="cm-stat-txt">
        <p className="cm-stat-l">{label}</p>
        <p className="cm-stat-v">
          {value}{unit ? <em>{unit}</em> : null}
        </p>
        {note ? <p className="cm-stat-n">{note}</p> : null}
      </div>
      {action || more ? (
        <div className="cm-stat-acts">{action}{more}</div>
      ) : null}
    </section>
  );
}

/**
 * 고르거나 들여다보는 칸 하나(규격 §2 C · §6 · §8 · §9).
 *
 * 산업과 직무와 전공과 기관이 **같은 모양으로 선다.** 쪽마다 다른 카드를
 * 만들면 같은 제품의 화면이 넷으로 갈리고, 그 어긋남은 쪽을 이어서 누를
 * 때만 보인다.
 *
 * **순위를 담지 않는다.** `tag` 는 상태(`지금 응시할 수 있습니다` ·
 * `준비 중`)이고 점수나 등수가 아니다.
 */
export function PickCard({
  href, icon, tone, title, tag, lead, meta, cta, disabled, strong,
}: {
  href?: string;
  icon: IconName;
  /** 표시의 색조. **뜻을 갖지 않는다**: 칸 넷이 한 덩이로 읽히지 않게 한다 */
  tone?: "b" | "c" | "v" | "w";
  title: string;
  tag?: string;
  /** 한두 줄. **문단을 넣지 않는다** */
  lead?: string;
  /** 그 아래 작은 줄. 이어지는 영역 같은 것 */
  meta?: ReactNode;
  cta?: string;
  /** 아직 열리지 않은 칸. 누를 수 없고 그 사실이 보인다 */
  disabled?: boolean;
  /**
   * 이 칸이 그 화면의 주된 행동일 때(규격 §2 E).
   *
   * **단추를 칸 안에 넣지 않는다**: 칸 전체가 이미 링크라 그 안에 링크나
   * 단추를 또 두면 안에 든 것이 바깥을 삼킨다. 그려지는 것은 단추처럼
   * 보이는 글줄 하나이고 누르는 자리는 칸 하나 그대로다.
   */
  strong?: boolean;
}) {
  const body = (
    <>
      <span className={`cm-pc-ico${tone ? ` is-${tone}` : ""}`}>
        <Icon name={icon} size={19} />
      </span>
      <span className="cm-pc-h">
        <b>{title}</b>
        {tag ? <em>{tag}</em> : null}
      </span>
      {lead ? <span className="cm-pc-lead">{lead}</span> : null}
      {meta ? <span className="cm-pc-meta">{meta}</span> : null}
      {cta && !disabled ? (
        <span className={`cm-pc-cta${strong ? " is-strong" : ""}`}>
          {cta}<Icon name="chev" size={15} />
        </span>
      ) : null}
    </>
  );
  if (disabled || !href) {
    return <div className="cm-pc is-off">{body}</div>;
  }
  return <Link className="cm-pc" href={href}>{body}</Link>;
}

/** 칸을 거는 격자. 좁은 화면에서 한 줄이 된다 */
export function PickGrid({ children, cols }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return <div className={`cm-pcs${cols ? ` is-${cols}` : ""}`}>{children}</div>;
}
