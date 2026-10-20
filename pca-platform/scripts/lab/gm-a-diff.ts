/**
 * **Track A · 사례 사이에 같은 글이 서는 쪽을 센다.** 세 사례(RICH · POOR · CONTRA)를 `full6` 로 그려
 * 설계 쪽마다 보이는 글자를 꺼내고, 두 사례 이상에 서는 쪽끼리 글자 3-gram 자카드로 견준다.
 * 학생마다 달라야 하는 쪽(설계표의 층에 A 나 C 가 든 쪽)에서 0.85 이상이면 이름을 올린다.
 * 한 보고서 안에서 글자까지 같은 문장이 몇 번 되풀이되는지도 사례마다 센다. 읽기만 한다.
 *
 *   DATABASE_URL=postgres:///cm_dev CASES=RICH:1,POOR:2,CONTRA:3 OUT=var/gm-a npx tsx scripts/lab/gm-a-diff.ts
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load3 } from "./gm-report3";
import { full6 } from "../../src/lib/me-v3/report-gm/render6";
import type { Lib } from "../../src/lib/me-v3/report-gm/render5";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":") as [string, string]);
const OUT = process.env.OUT ?? "var/gm-a";
const THRESH = Number(process.env.THRESH ?? 0.85);
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));

/** 보이는 글자: 스타일·태그를 걷고 공백을 하나로. 쪽 머리·꼬리는 사례마다 같으므로 뺀다 */
function textOf(sec: string): string {
  return sec
    .replace(/<header class="rh">[\s\S]*?<\/header>/, "").replace(/<footer class="rf">[\s\S]*?<\/footer>/, "")
    .replace(/<style[\s\S]*?<\/style>/g, "").replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}
function grams(s: string): Set<string> {
  const t = s.replace(/\s+/g, "");
  const g = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i++) g.add(t.slice(i, i + 3));
  return g;
}
function jac(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
}
/** 문장: 마침표·물음표로 끊고 20자 이상만 센다(이름표·칸 머리는 문장이 아니다) */
function sentences(s: string): string[] {
  return s.split(/(?<=[.?!다요])\s+/).map((x) => x.trim()).filter((x) => x.length >= 20);
}

export type DiffReport = {
  flagged: { n: number; title: string; layer: string; pair: string; sim: number }[];
  pages: { n: number; title: string; layer: string; personal: boolean; sims: Record<string, number>; max: number }[];
  repeats: Record<string, { total: number; repeated: number; top: { s: string; times: number }[] }>;
  defects: Record<string, { rule: string; n: number; page: number; at: string }[]>;
  usage: Record<string, { picks: number; pagesWithPick: number; pickUses: number; slots: number }>;
  mean: { personal: number; all: number };
};

async function main(): Promise<void> {
  const toc = J("data/report-gm/biz-pro-toc.v1.json") as Lib["toc"];
  const per: Record<string, Map<number, string>> = {};
  const picksOf: Record<string, string[]> = {};
  for (const [tag, id] of CASES) {
    const r = await load3(id);
    const lib: Lib = {
      toc, dart: J("data/region/dart-checks.v1.json"), overview: J("data/region/dart-overview.v1.json"),
      roles: J("data/report-gm/biz-role-guide.json"), orgs: J("data/region/kr-chungcheong-orgs.v2.json"),
      domains: r.map.map((m) => ({ code: m.code, name: m.name })), versions: r.versions,
    };
    const out = full6(r, lib, { href: "fonts/pretendard", family: "Pretendard" });
    picksOf[tag] = [...new Set(r.domains.flatMap((d) => [...d.decisions, ...d.acts, ...d.artifacts, ...d.comparisons]))];
    const m = new Map<number, string>();
    for (const sec of out.html.split(/(?=<section class="pg)/).slice(1)) {
      const n = Number(/data-page="(\d+)"/.exec(sec)?.[1]);
      if (n) m.set(n, textOf(sec));
    }
    per[tag] = m;
  }
  const tags = CASES.map((c) => c[0]);
  const pages: DiffReport["pages"] = [];
  const flagged: DiffReport["flagged"] = [];
  for (const p of toc.pages) {
    const has = tags.filter((t) => per[t].has(p.n));
    if (has.length < 2) continue;
    const personal = /[AC]/.test(p.layer);
    const sims: Record<string, number> = {};
    for (let i = 0; i < has.length; i++) for (let j = i + 1; j < has.length; j++) {
      const k = `${has[i]}-${has[j]}`;
      sims[k] = Math.round(jac(grams(per[has[i]].get(p.n)!), grams(per[has[j]].get(p.n)!)) * 1000) / 1000;
    }
    const max = Math.max(...Object.values(sims));
    pages.push({ n: p.n, title: p.title, layer: p.layer, personal, sims, max });
    if (personal && max >= THRESH) {
      const [pair, sim] = Object.entries(sims).sort((a, b) => b[1] - a[1])[0];
      flagged.push({ n: p.n, title: p.title, layer: p.layer, pair, sim });
    }
  }
  const repeats: DiffReport["repeats"] = {};
  for (const t of tags) {
    const cnt = new Map<string, number>();
    for (const txt of per[t].values()) for (const s of sentences(txt)) cnt.set(s, (cnt.get(s) ?? 0) + 1);
    const rep = [...cnt.entries()].filter(([, v]) => v >= 2).sort((a, b) => b[1] - a[1]);
    repeats[t] = { total: [...cnt.values()].reduce((a, b) => a + b, 0), repeated: rep.reduce((a, [, v]) => a + v - 1, 0), top: rep.slice(0, 8).map(([s, times]) => ({ s: s.slice(0, 90), times })) };
  }
  /* 글자 결함: 안쪽 코드 · 빈 값 · 빈 괄호 · 조사 자리표 · 받침과 맞지 않는 조사(자주 나는 꼴만) */
  const RULES: [string, RegExp][] = [
    ["빈 값", /undefined|null|NaN|\[object/],
    ["안쪽 코드", /\b(TD\d{2}|ROLE_[A-Z]+|INDUSTRY_[A-Z_]+|Z\d_[A-Z_]+|OC\d)\b/],
    ["빈 괄호", /\(\s*\)|‘\s*’/],
    ["조사 자리표", /[을이은과]\/[를가는와]|\((?:을|이|은|과)\)[를가는와]/],
    ["받침 없는 말 + 은/이/을/과", /[가-힣](?<=[개게기네니대도라래로리마매모미바배보비사새소시아애오이자재조지차채초치카코키타태토티파패포피하해호히])(?:은|을|과) (?!재료)/],
  ];
  const defects: DiffReport["defects"] = {};
  for (const t of tags) {
    defects[t] = [];
    for (const [n, txt] of per[t]) for (const [rule, re] of RULES) { const m = re.exec(txt); if (m) defects[t].push({ rule, n: 1, page: n, at: txt.slice(Math.max(0, m.index - 18), m.index + 18) }); }
  }
  /* 학생이 고른 문장이 몇 쪽에 서는가 · ‘직접 기입’ 칸이 몇 개인가 */
  const usage: DiffReport["usage"] = {};
  for (const t of tags) {
    const ps = picksOf[t].filter((x) => x.length >= 6);
    let pages = 0, uses = 0, slots = 0;
    for (const txt of per[t].values()) {
      const u = ps.filter((x) => txt.includes(x)).length; if (u) pages++; uses += u;
      slots += (txt.match(/직접 기입/g) ?? []).length;
    }
    usage[t] = { picks: ps.length, pagesWithPick: pages, pickUses: uses, slots };
  }
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1000) / 1000 : 0);
  const rep: DiffReport = { flagged, pages, repeats, defects, usage, mean: { personal: avg(pages.filter((p) => p.personal).map((p) => p.max)), all: avg(pages.map((p) => p.max)) } };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "diff.json"), JSON.stringify(rep, null, 2));
  const md = [
    `# 사례 사이 쪽 유사도 (3-gram 자카드, 기준 ${THRESH})`, "",
    `- 견준 쪽 ${pages.length} · 학생별 쪽 ${pages.filter((p) => p.personal).length} · 기준 넘은 학생별 쪽 **${flagged.length}**`,
    `- 학생별 쪽의 최대 유사도 평균 ${rep.mean.personal} · 전체 ${rep.mean.all}`, "",
    "## 기준을 넘은 학생별 쪽", "", "| 설계 | 제목 | 층 | 짝 | 유사도 |", "|---|---|---|---|---|",
    ...flagged.map((f) => `| ${f.n} | ${f.title} | ${f.layer} | ${f.pair} | ${f.sim} |`), "",
    "## 되풀이된 문장(한 보고서 안, 20자 이상)", "",
    ...tags.flatMap((t) => [`### ${t} — 문장 ${repeats[t].total} · 되풀이 ${repeats[t].repeated}`, ...repeats[t].top.map((x) => `- ×${x.times} ${x.s}`), ""]),
    "## 학생이 고른 문장의 쓰임", "", "| 사례 | 고른 문장 | 그 문장이 서는 쪽 | 쓰인 횟수 | ‘직접 기입’ 칸 |", "|---|---|---|---|---|",
    ...tags.map((t) => `| ${t} | ${usage[t].picks} | ${usage[t].pagesWithPick} | ${usage[t].pickUses} | ${usage[t].slots} |`), "",
    "## 글자 결함 후보", "",
    ...tags.flatMap((t) => [`### ${t} — ${defects[t].length}건`, ...defects[t].slice(0, 20).map((d) => `- 설계 ${d.page} · ${d.rule} · …${d.at}…`), ""]),
    "## 쪽마다", "", "| 설계 | 층 | 학생별 | 최대 | 짝별 |", "|---|---|---|---|---|",
    ...pages.map((p) => `| ${p.n} | ${p.layer} | ${p.personal ? "예" : ""} | ${p.max} | ${Object.entries(p.sims).map(([k, v]) => `${k} ${v}`).join(" · ")} |`),
  ].join("\n");
  writeFileSync(path.join(OUT, "DIFF.md"), md);
  console.log(md.split("\n## 쪽마다")[0]);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
