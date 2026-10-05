/**
 * 화면을 짜는 기본형.
 *
 * 숫자 칸 · 가로 막대 · 흐름 · 표 · 빈 자리 · 알약. 세 화면이 이것만
 * 가져다 쓰고, **DB 칸을 그대로 표로 뱉는 화면을 만들지 않는다.**
 *
 * 규칙 둘을 여기서 못 박는다.
 *   - **감춘 칸은 0 으로 적지 않는다**(`BarList` 의 `hidden`). 빈 막대는
 *     0 으로 읽히므로 빗금으로 그린다.
 *   - **나눌 바닥이 0 이면 비율을 만들지 않는다**(`pct`). 아무도 시작하지
 *     않았는데 0% 를 찍으면 거짓말이다.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icon";

/** 바닥이 0 이면 `null`. 화면은 그때 아무 비율도 그리지 않는다. */
export function pct(part: number, whole: number): number | null {
  if (!whole || whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

export function Kpi({
  label, value, unit, note, fill, accent, icon,
}: {
  label: string;
  value: number | string;
  unit?: string;
  note?: string;
  /** 0~100. 이 숫자가 무엇의 몇 할인지 보여주는 줄. `null` 이면 안 그린다 */
  fill?: number | null;
  accent?: boolean;
  icon?: IconName;
}) {
  return (
    <div className={accent ? "sf-kpi is-accent" : "sf-kpi"}>
      <div className="sf-kpi-l">
        {icon ? <Icon name={icon} size={14} /> : null}
        {label}
      </div>
      <div className="sf-kpi-v">
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit ? <small>{unit}</small> : null}
      </div>
      {typeof fill === "number" ? (
        <div className="sf-kpi-bar"><i style={{ width: `${Math.min(100, Math.max(0, fill))}%` }} /></div>
      ) : null}
      {note ? <div className="sf-kpi-n">{note}</div> : null}
    </div>
  );
}

export type BarRow = {
  label: string;
  value?: number;
  /** 다섯 명 미만이라 숫자를 내지 않는 칸 */
  hidden?: boolean;
  tone?: "ok" | "part" | "not";
  suffix?: string;
};

export function BarList({
  rows, max, hiddenLabel, emptyLabel,
}: { rows: BarRow[]; max?: number; hiddenLabel: string; emptyLabel?: string }) {
  const shown = rows.filter((r) => !r.hidden && typeof r.value === "number");
  const top = max ?? Math.max(1, ...shown.map((r) => r.value ?? 0));
  if (!rows.length) {
    return <p className="sf-meta" style={{ margin: 0 }}>{emptyLabel ?? ""}</p>;
  }
  return (
    <div className="sf-bars">
      {rows.map((r, i) => (
        <div
          key={`${r.label}-${i}`}
          className={[
            "sf-bar",
            r.hidden ? "is-hidden" : "",
            r.tone ? `is-${r.tone}` : "",
          ].filter(Boolean).join(" ")}
        >
          <span className="sf-bar-l">{r.label}</span>
          <span className="sf-bar-v">
            {r.hidden ? hiddenLabel : `${(r.value ?? 0).toLocaleString()}${r.suffix ?? ""}`}
          </span>
          <span className="sf-bar-t">
            {r.hidden ? null : <i style={{ width: `${Math.round(((r.value ?? 0) / top) * 100)}%` }} />}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Funnel({
  steps,
}: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="sf-funnel">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const drop = prev !== null ? pct(s.value, prev) : null;
        return (
          <div key={s.label} className="sf-fn">
            <span className="sf-fn-l">
              {s.label}
              {drop !== null ? <span className="sf-fn-d"> {drop}%</span> : null}
            </span>
            <span className="sf-fn-t">
              <i style={{ width: `${Math.round((s.value / top) * 100)}%` }} />
            </span>
            <span className="sf-fn-v">{s.value.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Pill({
  tone, plain, children,
}: {
  tone?: "ok" | "part" | "not" | "accent" | "warn" | "gold";
  /** 앞의 점을 뗀다. 상태가 아니라 이름표로 쓰는 자리 */
  plain?: boolean;
  children: ReactNode;
}) {
  const cls = ["sf-pill", tone, plain ? "plain" : null].filter(Boolean).join(" ");
  return <span className={cls}>{children}</span>;
}

export function Card({
  title, note, actions, pad = true, children,
}: { title?: string; note?: string; actions?: ReactNode; pad?: boolean; children: ReactNode }) {
  if (!title && pad) return <div className="sf-card">{children}</div>;
  return (
    <div className={pad ? "sf-card" : "sf-card sf-card-q"}>
      {title ? (
        <div className={pad ? "sf-section-h" : "sf-card-h"}>
          <h2 className="sf-h2">{title}</h2>
          {actions}
          {note ? <span className="sf-meta">{note}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/**
 * 빈 자리.
 *
 * 규격이 넷을 요구한다: 그림 · 제목 · 설명 · 할 일. 넷 중 하나라도
 * 빠지면 화면 칠 할이 흰 사각형으로 남는다.
 */
export function Empty({
  icon = "spark", title, body, cta, tight,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  cta?: { href: string; label: string } | ReactNode;
  tight?: boolean;
}) {
  return (
    <div className={tight ? "sf-empty tight" : "sf-empty"}>
      <span className="sf-empty-ic"><Icon name={icon} size={20} /></span>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {cta && typeof cta === "object" && "href" in (cta as object) ? (
        <Link href={(cta as { href: string }).href} className="sf-btn accent">
          {(cta as { label: string }).label}
        </Link>
      ) : (cta as ReactNode)}
    </div>
  );
}

export function Defs({ rows }: { rows: { k: string; v: ReactNode }[] }) {
  return (
    <dl className="sf-defs">
      {rows.map((r) => (
        <div className="sf-def" key={r.k}>
          <dt>{r.k}</dt>
          <dd>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Todo({
  items, emptyLabel,
}: { items: { text: string; note?: string; warn?: boolean; cta?: { href: string; label: string } }[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="sf-meta" style={{ margin: 0 }}>{emptyLabel}</p>;
  }
  return (
    <div className="sf-todo">
      {items.map((it, i) => (
        <div key={i} className={it.warn ? "sf-todo-i warn" : "sf-todo-i"}>
          <i />
          <span className="sf-todo-t">
            {it.text}
            {it.note ? <em>{it.note}</em> : null}
          </span>
          {it.cta ? (
            <Link href={it.cta.href} className="sf-btn ghost sm">{it.cta.label}</Link>
          ) : <span />}
        </div>
      ))}
    </div>
  );
}

/** 아직 자료가 없어 열지 않은 쪽. **없는 숫자를 지어내 채우지 않는다.** */
export function NotOpen({ title, body }: { title: string; body: string }) {
  return <Empty icon="lock" title={title} body={body} />;
}
