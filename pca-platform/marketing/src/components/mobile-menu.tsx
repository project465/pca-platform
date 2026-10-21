"use client";

import { useEffect, useState } from "react";
import type { Link } from "@/content/model";
import { Icon } from "./icons";

/**
 * 좁은 화면의 메뉴.
 *
 * 머리띠에 다 들어가지 않는 폭(1040px 아래)에서만 보인다. 연 채로 다른 쪽으로
 * 넘어가면 닫히고, Esc 로도 닫힌다. 안의 단추는 넓은 화면의 머리띠와 같은
 * 주소를 가리킨다(원고 한 벌을 둘이 같이 읽는다).
 */
export default function MobileMenu({
  items,
  staffLogin,
  login,
  start,
  openLabel,
  closeLabel,
  langLabel,
  langs,
}: {
  items: Link[];
  staffLogin: Link;
  login: Link;
  start: Link;
  openLabel: string;
  closeLabel: string;
  langLabel: string;
  langs: { lang: string; label: string; href: string; htmlLang: string; current: boolean }[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.classList.add("menu-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("menu-open");
    };
  }, [open]);

  return (
    <div className="mmenu">
      <button
        type="button"
        className="mmenu-toggle"
        aria-expanded={open}
        aria-controls="mmenu-panel"
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "close" : "menu"} size={22} />
      </button>
      <div id="mmenu-panel" className="mmenu-panel" hidden={!open}>
        <nav aria-label="Main">
          {items.map((i) => (
            <a key={i.href + i.label} href={i.href} onClick={() => setOpen(false)}>
              {i.label}
              <Icon name="chevron" size={16} />
            </a>
          ))}
        </nav>
        <div className="mmenu-actions">
          <a className="btn btn-primary btn-block" href={start.href}>
            {start.label}
            <Icon name="arrow" size={18} />
          </a>
          <a className="btn btn-ghost btn-block" href={login.href}>
            {login.label}
          </a>
          <a className="mmenu-staff" href={staffLogin.href}>
            {staffLogin.label}
          </a>
        </div>
        {langs.length > 0 && (
          <div className="mmenu-langs" role="group" aria-label={langLabel}>
            {langs.map((l) => (
              <a key={l.lang} href={l.href} hrefLang={l.htmlLang} lang={l.htmlLang} aria-current={l.current ? "true" : undefined}>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
