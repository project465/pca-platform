"use client";

import { useEffect } from "react";

/**
 * 결과지에서 **지금 어느 절을 보고 있는지**를 머리띠에 켠다.
 *
 * 처음에는 절 목록을 알약 띠로 하나 더 세웠다. 그런데 머리띠에 이미 같은
 * 일을 하는 줄이 있었고, 둘이 위아래로 겹쳐 서면서 아래 띠가 넓은 화면에서
 * **가로로 넘쳤다.** 띠를 더하지 않고 있던 줄에 지금 자리를 켜는 쪽으로
 * 바꿨다.
 *
 * **목록을 손으로 적지 않는다.** 머리띠의 링크가 가리키는 자리를 그대로
 * 따라가므로, 절이 늘거나 이름이 바뀌어도 여기를 고치지 않는다.
 *
 * 종이에는 머리띠가 찍히지 않아 이 줄이 아무 일도 하지 않는다.
 */
export default function ResultNav() {
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.rs-head nav a[href^="#"]'));
    if (links.length < 2) return undefined;
    const bySection = new Map<Element, HTMLAnchorElement>();
    for (const a of links) {
      const el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (el) bySection.set(el, a);
    }
    if (!bySection.size) return undefined;

    const mark = (on: HTMLAnchorElement | null) => {
      for (const a of links) {
        if (a === on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      }
    };
    /* 화면 위쪽 띠 아래에서 보이기 시작하는 절을 지금 자리로 본다 */
    const seen = new Set<Element>();
    const io = new IntersectionObserver((rows) => {
      for (const r of rows) {
        if (r.isIntersecting) seen.add(r.target);
        else seen.delete(r.target);
      }
      const first = Array.from(bySection.keys()).find((el) => seen.has(el));
      mark(first ? bySection.get(first) ?? null : null);
    }, { rootMargin: "-72px 0px -70% 0px", threshold: 0 });
    for (const el of bySection.keys()) io.observe(el);
    return () => io.disconnect();
  }, []);

  return null;
}
