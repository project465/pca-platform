import type { Faq, Link } from "@/content/model";
import { Icon } from "./icons";

/** 절 머리. 작은 이름표 → 제목 → 한 줄 설명. 가운데 맞춤은 `center` 일 때만 */
export function SectionHead({
  label,
  title,
  lead,
  center,
  invert,
}: {
  label: string;
  title: string;
  lead?: string;
  center?: boolean;
  invert?: boolean;
}) {
  return (
    <div className={`sec-head${center ? " is-center" : ""}${invert ? " is-invert" : ""}`}>
      <span className="eyebrow">{label}</span>
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

/**
 * 단추. 앱으로 가는 주소인지는 `href` 가 이미 말한다(`withAppLinks` 가
 * 돌려 두었다). 같은 탭에서 간다: 새 탭이면 뒤로 가기가 끊긴다.
 */
export function Button({
  link,
  kind = "primary",
  size,
  arrow,
}: {
  link: Link;
  kind?: "primary" | "ghost" | "light" | "outline-light" | "text";
  size?: "lg" | "sm";
  arrow?: boolean;
}) {
  return (
    <a className={`btn btn-${kind}${size ? ` btn-${size}` : ""}`} href={link.href}>
      {link.label}
      {arrow && <Icon name="arrow" size={18} />}
    </a>
  );
}

/** 자주 묻는 질문. `details` 라 스크립트가 없어도 열리고 닫힌다 */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={f.q} open={i === 0}>
          <summary>
            <span>{f.q}</span>
            <Icon name="down" size={20} />
          </summary>
          <div className="faq-a">
            <p>{f.a}</p>
            {f.link && (
              <a className="text-link" href={f.link.href}>
                {f.link.label}
                <Icon name="arrow" size={16} />
              </a>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

/** 쪽 끝의 파란 띠. 단추는 둘이고 그 이상 두지 않는다 */
export function Closing({
  title,
  lead,
  primary,
  secondary,
}: {
  title: string;
  lead: string;
  primary: Link;
  secondary: Link;
}) {
  return (
    <section className="section closing-wrap">
      <div className="wrap">
        <div className="closing">
          <div>
            <h2>{title}</h2>
            <p>{lead}</p>
          </div>
          <div className="closing-acts">
            <Button link={primary} kind="light" size="lg" arrow />
            <Button link={secondary} kind="outline-light" size="lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
