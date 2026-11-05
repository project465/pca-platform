import type { DegreeData, MethodData, PaperData, PatentData, ProjectData, ResearchItem } from "@/lib/research/profile";
import { R } from "./research-text";

type L = "ko" | "en";
const say = (x: { ko: string; en: string }, lang: L) => (lang === "en" ? x.en : x.ko);

/** 목록 한 줄의 굵은 글자 */
export function itemHead(it: Pick<ResearchItem, "kind" | "data">, lang: L = "ko"): string {
  switch (it.kind) {
    case "method": return (it.data as MethodData).name;
    case "degree": {
      const d = it.data as DegreeData;
      return `${say(R.opt.degree[d.level], lang)} · ${d.major}`;
    }
    default: return (it.data as PaperData | ProjectData | PatentData).title;
  }
}

/** 목록 한 줄의 작은 글자(연도 · 역할 · 구간 같은 칸) */
export function itemSub(it: Pick<ResearchItem, "kind" | "data">, lang: L): string {
  const out: string[] = [];
  switch (it.kind) {
    case "paper": {
      const d = it.data as PaperData;
      if (d.venue) out.push(d.venue);
      if (d.year) out.push(String(d.year));
      if (d.authorRole) out.push(say(R.opt.authorRole[d.authorRole], lang));
      break;
    }
    case "project": {
      const d = it.data as ProjectData;
      if (d.agency) out.push(d.agency);
      if (d.from || d.to) out.push(`${d.from ?? ""}~${d.to ?? ""}`);
      if (d.budget) out.push(say(R.opt.budget[d.budget], lang));
      if (d.role) out.push(say(R.opt.role[d.role], lang));
      if (d.participation) out.push(say(R.f.participationShort, lang).replace("{n}", String(d.participation)));
      break;
    }
    case "patent": {
      const d = it.data as PatentData;
      if (d.status) out.push(say(R.opt.patentStatus[d.status], lang));
      if (d.year) out.push(String(d.year));
      if (d.inventorOrder) out.push(`#${d.inventorOrder}`);
      break;
    }
    case "method": {
      const d = it.data as MethodData;
      if (d.level) out.push(say(R.opt.level[d.level], lang));
      if (d.note) out.push(d.note);
      break;
    }
    case "degree": {
      const d = it.data as DegreeData;
      if (d.status) out.push(say(R.opt.degreeStatus[d.status], lang));
      if (d.year) out.push(String(d.year));
      if (d.thesisTitle) out.push(d.thesisTitle);
      break;
    }
  }
  return out.join(" · ");
}
