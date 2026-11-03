/**
 * 기관 프로그램의 중점 기업 한 쪽(책 · PRO 종이). 지역 장의 첫 쪽(장 표지) 바로 뒤에 선다.
 * 웹 카드(`result/featured.tsx`)와 같은 `featuredView` 를 읽어 같은 글자를 낸다.
 * 프로그램에 든 사람이 아니면 아무것도 만들지 않는다.
 */
import type { Inputs } from "./types";
import type { X } from "./derive";
import type { RegionView } from "./region";
import { E, T, note, ul, type Page } from "./kit";
import { factRows, featuredView } from "@/lib/featured";
import { featuredText } from "@/lib/featured/text";

export function featuredPage(x: Inputs, d: X, rv: RegionView): Page | null {
  if (!x.featured) return null;
  const f = featuredView(x, d, rv, x.featured);
  if (!f) return null;
  const co = f.company;
  const tx = featuredText(f.program.audience);
  const l = f.link;
  const row = (k: string, v: string, s: string) => `<tr><td><b>${E(k)}</b></td><td>${E(v)}</td><td class="mut">${E(s)}</td></tr>`;
  const rows = factRows(co).map((r) => row(r.label, r.value, r.src)).join("");
  const linkItems = [
    ...l.z1.map((z) => E(tx.linkZ1(z.name, z.picks))),
    ...l.z2.map((z) => E(tx.linkZ2(z.name, z.picks))),
    ...(!l.z1.length && !l.z2.length && l.pack && l.uses.length ? [E(`${l.pack} 산업이 주로 쓰는 영역: ${l.uses.join(" · ")}`)] : []),
    ...(l.chosen ? [E(tx.chosen)] : []),
  ];
  const body =
    `<p class="k">${E(f.program.title)}</p>` +
    T(`${E(co.name)} 자세히 보기`, E(f.lead)) +
    `<table class="tb tb-xs"><thead><tr><th class="w30">항목</th><th>내용</th><th class="w30">출처 · 기준일</th></tr></thead><tbody>${rows}</tbody></table>` +
    `<div class="two">${note(linkItems.length ? `내 결과에서 이어지는 영역${l.pack ? ` · ${E(l.pack)}` : ""}` : "이 회사와 닿는 직무", linkItems.length ? ul(linkItems) : `<p>${E(co.jobs.map((jb) => jb.name).join(" · "))}</p>`)}` +
    `${note("방문 전에 준비할 것", ul(f.prep.map(E)), true)}</div>` +
    (f.onsite.length ? note("현장에서 확인할 것", ul(f.onsite.map(E)) + `<p class="mut sm">${E(f.onsiteSrc)}</p>`) : "") +
    `<p class="mut sm">${E(tx.law)} ${E(f.sourceLine)}</p>`;
  return { part: "05", partName: "", title: `${co.short} 자세히 보기`, body, keep: true };
}
