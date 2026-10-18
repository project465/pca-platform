/**
 * CareerMatri Workspace 의 껍데기. **사용자 화면의 껍데기는 이 하나다.**
 *
 * **들어오면 하나의 앱 안이라는 느낌이 나야 한다.** 넓은 화면은 왼쪽에
 * 늘 보이는 띠, 손전화는 아래 띠와 서랍이다. 쪽을 옮겨도 띠가 그대로
 * 있어서 `지금 어디인지` 가 끊기지 않는다.
 *
 * 계정 쪽(`/my/*`)도 이 껍데기를 쓴다. 전에는 저쪽이 `components/sf/shell`
 * 의 껍데기를 써서, 로그인 방법을 보러 들어간 사람이 **머리띠와 왼쪽 띠와
 * 브랜드 글자가 전부 다른 화면**을 받았다. 한 제품 안에서 껍데기가 둘이면
 * 쪽을 이어서 누를 때만 그 어긋남이 보인다.
 *
 * `components/sf/shell` 은 Campus 와 Admin 이 계속 쓴다. 저쪽은 파는
 * 제품의 화면이 아니라 **일하는 화면**이고, 메뉴가 열다섯 줄이라 같은
 * 띠에 담기지 않는다.
 *
 * **권한 판단이 한 줄도 없다.** 메뉴를 숨기는 것은 안내이고 막는 것은
 * 각 쪽의 `requireUser()` 다.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/sf/icon";
import { BrandMark } from "@/components/sf/brand-mark";
import { CM_GROUPS, CM_TABS, CM_NAV, navOn } from "./nav";
import { CmFind, type FindItem } from "./find";

/**
 * 지금 어느 전공인가. **쪽이 넘겨 준다.**
 *
 * 전에는 이 자리에 `기계공학` 이 글자로 박혀 있어서, 다른 전공을 친
 * 사람의 작업공간이 전부 기계공학으로 적혔다. 모르면 전공 이름을 적지
 * 않는다: 아무 이름이나 적으면 그 사람은 자기가 그 검사를 친 줄 안다.
 */
const MAJOR_FALLBACK = "전공 진단";

/**
 * 바로가기 찾기가 뒤지는 목록.
 *
 * **메뉴 정본에서 만든다.** 여기 손으로 적어 두면 메뉴에 줄이 하나 늘 때
 * 이쪽이 뒤처지고, 뒤처진 그 줄은 찾아도 안 나온다. 묶음 이름이 그대로
 * 거드는 글이 되어 `현재 상태` 가 어디에 속한 줄인지 같이 읽힌다.
 *
 * 메뉴에 제 줄이 없는 **실제로 도는 세 곳**을 뒤에 더한다. 메뉴에 두면
 * 띠가 열네 줄이 되는데, 찾는 사람은 그 이름으로 찾는다.
 */
const FIND_BASE: FindItem[] = [
  ...CM_GROUPS.flatMap((g) =>
    g.items.map((it) => ({ label: it.label, sub: g.title, href: it.href }))),
  { label: "경험 추가", sub: "내 커리어", href: "/me/experience/new" },
  { label: "새 경험 더하기", sub: "내 커리어", href: "/me/recompute" },
  { label: "부족한 부분", sub: "내 커리어", href: "/me/state#gaps" },
];

function NavRow({ it, active }: { it: typeof CM_NAV[number]; active: string }) {
  const on = navOn(it.href, active);
  return (
    <Link href={it.href}
      className={`cm-nav${on ? " is-on" : ""}`}
      aria-current={on ? "page" : undefined}>
      <Icon name={it.icon} />
      <span>{it.label}{it.hint ? <small>{it.hint}</small> : null}</span>
    </Link>
  );
}

/**
 * 작업공간 오른쪽 위의 **실용 줄** 가운데 계정 한 칸.
 *
 * **목표 화면이 이름을 적는다.** 첫 글자 한 자만 서면 그것이 무엇을
 * 여는 칸인지 눌러 보고서야 알고, 넓은 화면의 오른쪽 위는 계정으로
 * 들어가는 길이 서는 곳이다. 적는 것은 **로그인한 본인의 이름**이고
 * 지어낸 값이 아니다. 좁은 화면에서는 첫 글자만 남는다.
 */
/**
 * 최근 변화로 가는 길 하나.
 *
 * 목표 화면의 알림 종 자리다. **가짜 배지를 달지 않는다**: CareerMatri
 * 에는 알림 대기열이 없고, 세어 둔 수가 없는데 빨간 점을 찍으면 그것이
 * 가짜 기능이 된다. 눌러서 가는 곳은 `현재 상태` 의 최근 변화이고,
 * **그 쪽은 이미 도는 쪽이다.**
 *
 * `aria-label` 이 `최근 변화` 인 까닭은 종 그림만으로는 무엇이 열리는지
 * 보조기기에 전해지지 않기 때문이다.
 */
function CmBell() {
  return (
    <Link className="cm-util-bell" href="/me/state#changes" aria-label="최근 변화">
      <Icon name="bell" size={17} />
    </Link>
  );
}

function CmUtil({ name }: { name: string }) {
  const initial = name.trim().slice(0, 1) || "나";
  return (
    <Link className="cm-util-me" href="/my" aria-label="계정">
      <span className="cm-util-av" aria-hidden>{initial}</span>
      <b>{name.trim() || "계정"}</b>
      <Icon name="chev" size={13} />
    </Link>
  );
}

export function CmShell({
  active, title, form, read, hold, bar, who, major, finds, children,
}: {
  active: string; title?: string;
  /**
   * 이 쪽이 더 찾게 해 줄 것. 지금 넘기는 곳은 홈이고 넘기는 값은
   * **그 사람이 설명할 수 있는 기술영역 이름**이다. 쪽이 이미 들고 있는
   * 값이라 서버를 한 번도 더 부르지 않는다.
   */
  finds?: FindItem[];
  /** 이 사람이 쓰고 있는 전공 이름. 모르면 비운다 */
  major?: string | null;
  /** 쪽 머리 오른쪽에 서는 **한 가지**. 둘을 세우면 도구막대가 된다 */
  bar?: ReactNode;
  /** 로그인한 사람의 이름. 주면 오른쪽 위에 계정 한 자리가 선다 */
  who?: string;
  /**
   * 적는 자리인가(규격 §17).
   *
   * 작업공간의 기본 폭은 1100 이고 그것은 **견주고 훑는 자리**의 폭이다.
   * 칸에 적는 자리는 840 으로 좁힌다: 1100 에서 폼을 그리면 이름표와
   * 입력칸이 한 화면 너비로 벌어져 눈이 왼쪽 끝과 오른쪽 끝을 오간다.
   */
  form?: boolean;
  /**
   * 읽고 한 가지를 누르는 자리인가(규격 §30).
   *
   * 1100 은 견주는 폭이다. 담긴 글이 몇 줄뿐인 쪽을 그 폭에 세우면 오른쪽
   * 절반이 비고, 그 빈 면이 덜 만들어진 화면으로 읽힌다.
   */
  read?: boolean;
  /**
   * 아직 켜지지 않은 자리인가(규격 §18).
   *
   * 담긴 글이 몇 줄뿐인데 넓은 화면을 꼭대기부터 쓰면 **아래 절반이
   * 통째로 비어** 자료를 못 받아 온 화면처럼 읽힌다. 빈 카드를 만들어
   * 채우지 않고, 있는 글을 읽는 폭으로 모아 가운데에 세운다.
   */
  hold?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="cm">
      {/* 손전화 위 띠. 넓은 화면에서는 왼쪽 띠가 그 일을 한다.
          **이름을 쪽마다 따로 적지 않는다**: 아래 띠와 왼쪽 띠가 쓰는
          그 줄의 이름을 그대로 쓴다. 따로 적어 두면 `탐색` 과
          `산업·직무` 처럼 같은 자리가 화면마다 다른 이름으로 불린다 */}
      <div className="cm-topbar">
        <Link className="cm-topbar-brand" href="/me">
          {/* **28px 그대로다**(규격 §5). 전에 이 자리를 차지하던 네모가
              28px 이라, 상표만 갈아 끼우고 크기를 줄이면 머리띠가 2px
              낮아지고 **아래 모든 줄이 함께 올라간다.** 상표를 바꾸는
              일이 쪽 전체를 움직이는 일이 되면 안 된다 */}
          <BrandMark size={28} />CareerMatri
        </Link>
        {/* **지금 자리를 머리띠에 또 적지 않는다**(목표 화면 기준).
            아래 띠가 그 줄을 켜서 이미 말하고 있고, 머리띠에 한 번 더
            적으면 띠가 이름표 두 개를 든 웹사이트 머리글로 읽힌다 */}
        {/* **둘 다 실제로 도는 칸이다**(규격 §9). 목표 화면의 좁은
            머리띠는 종과 서랍을 드는데, 서랍은 아래 띠의 `더보기` 가
            이미 들고 있다. 그래서 여기 서는 것은 최근 변화와 계정이다 */}
        {who ? (
          <span className="cm-topbar-acts">
            <CmBell />
            <Link className="cm-topbar-me" href="/my" aria-label="계정">
              <span className="cm-util-av" aria-hidden>
                {who.trim().slice(0, 1) || "나"}
              </span>
            </Link>
          </span>
        ) : null}
      </div>

      <div className="cm-wrap">
        <nav className="cm-rail" aria-label="CareerMatri 메뉴">
          <Link className="cm-rail-brand" href="/me">
            {/* **공식 상표 하나만 쓴다**(규격 §4). 임시 아이콘과 네모를
                쓰던 자리가 셋이었고 셋이 서로 달랐다. 출처는
                `public/brand/careermatri/mark.svg` 파일 하나다 */}
            <BrandMark size={39} className="cm-rail-mark" />
            <span className="cm-rail-name">
              <b>CareerMatri</b>
              <small>{major ?? MAJOR_FALLBACK}</small>
            </span>
          </Link>

          <div className="cm-rail-scroll">
            {CM_GROUPS.map((g) => (
              <section className="cm-group" key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it) => <NavRow key={it.href} it={it} active={active} />)}
              </section>
            ))}
          </div>
        </nav>

        <main className="cm-main">
          <div className="cm-canvas">
            <div className={`cm-in${form ? " is-form" : ""}${read ? " is-read" : ""}${hold ? " is-hold" : ""}`}>
              {/*
                목표 화면의 머리 오른쪽 줄. **셋 다 실제로 도는 칸이다**:
                바로가기 찾기 · 최근 변화 · 계정. 눌러도 아무 일이 없는
                칸을 두면 그것이 가짜 기능이 된다(규격 §9).

                쪽 제목보다 먼저 흐름에 넣고 오른쪽으로 띄우면, 제목이 그
                왼쪽으로 흘러들어 한 줄이 된다.
              */}
              {who || bar ? (
                <div className="cm-utilrow">
                  {bar}
                  {who ? (
                    <>
                      <CmFind items={finds?.length ? [...FIND_BASE, ...finds] : FIND_BASE} />
                      <CmBell />
                    </>
                  ) : null}
                  {who ? <CmUtil name={who} /> : null}
                </div>
              ) : null}
              {children}
            </div>
          </div>
        </main>
      </div>

      {/*
        손전화 아래 띠. **셋을 세우고 넷째가 서랍이다**(규격 §13).
        **`details` 하나로 연다**: 자바스크립트가 꺼져 있어도 열리고,
        닫는 상태를 브라우저가 들고 있어 쪽을 옮기면 저절로 닫힌다.
      */}
      <nav className="cm-tabs" aria-label="아래 메뉴">
        {CM_TABS.map((it) => (
          <Link key={it.href} href={it.href}
            className={navOn(it.href, active) ? "is-on" : ""}
            aria-label={it.label}
            aria-current={navOn(it.href, active) ? "page" : undefined}>
            <Icon name={it.icon} />
            <span>{it.tabLabel ?? it.label}</span>
          </Link>
        ))}
        <details className="cm-more">
          <summary aria-label="메뉴 전체 보기">
            <Icon name="grid" />
            <span>더보기</span>
          </summary>
          <div className="cm-sheet">
            <p className="cm-sheet-head">CareerMatri · {major ?? MAJOR_FALLBACK}</p>
            {CM_GROUPS.map((g) => (
              <section className="cm-group" key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it) => <NavRow key={it.href} it={it} active={active} />)}
              </section>
            ))}
          </div>
        </details>
      </nav>
    </div>
  );
}

/** 쪽 머리. 모든 쪽이 같은 모양으로 선다 */
export function CmHead({
  kicker, title, meta, lead, actions, narrowActions,
}: {
  kicker?: string; title: string; lead?: string; actions?: ReactNode;
  /**
   * 제목 **아래**에 서는 한 줄(규격 §4). 목표 화면의
   * `기계공학 · 최근 업데이트 2024.10.07` 자리다. `kicker` 는 제목 위라
   * 같은 값을 두 자리에 둘 수 없다.
   */
  meta?: string;
  /** 띠가 같은 단추를 들고 있을 때. 손전화에서만 선다 */
  narrowActions?: boolean;
}) {
  return (
    <header className="cm-head">
      {kicker ? <p className="cm-kicker">{kicker}</p> : null}
      <h1 className="cm-h1">{title}</h1>
      {meta ? <p className="cm-meta">{meta}</p> : null}
      {lead ? <p className="cm-lead">{lead}</p> : null}
      {actions ? (
        <div className={`cm-acts${narrowActions ? " is-narrow" : ""}`}
          style={{ marginTop: 14 }}>{actions}</div>
      ) : null}
    </header>
  );
}
