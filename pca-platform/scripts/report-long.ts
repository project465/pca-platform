/**
 * 긴 결과지(PRO 책자)를 뽑아 세고 읽는다.
 *
 *   ATTEMPT=300 npm run report:long            응시 하나(쉼표로 여럿)
 *   CORES=all npm run report:long              짓고 있는 Core 마다 응시 하나씩
 *   CORES=EE_CORE_V1,CS_CORE_V1 npm run report:long
 *   REGION=off|sejong|jeonbuk|chungcheong ATTEMPT=300 npm run report:long
 *                                              지역 장을 끄거나 다른 권역 자료로 그려 본다(점검용)
 *   EXPERIENCES=all ATTEMPT=300 npm run report:long
 *                                              결과를 굳힌 뒤에 저장한 경험 기록까지 실어 본다(점검용)
 *   GUIDE=off ATTEMPT=257 npm run report:long  직무 안내가 없는 Core 처럼 그려 본다(점검용)
 *
 * 응시마다 `var/report-long/<응시>/` 에 book.html · book.pdf · pages/p-NN.png ·
 * contact.png · REPORT.md 를 남긴다. 세는 것은 다섯이다: 넘친 쪽, 쪽 수(PRO 는 70~80쪽),
 * 빈 쪽(70dpi 그림에서 흰 띠가 쪽 높이의 22% 를 넘는 쪽, 표지·장 첫 쪽·쓰는 칸 쪽은 뺀다),
 * 뽑은 PDF 의 글자에서 걸리는 말(대시 · 쓰지 않는 말 · 안쪽 코드 · 법적 범위 · 다른
 * 전공의 말), 그리고 제목과 이름표의 외톨이 줄(보고만 한다). 하나라도 걸리면 1 로 끝난다.
 */
import { loadEnv } from "./_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildLongReport } from "../src/lib/me-v3/report-long";
import { scoredAttempts } from "../src/lib/me-v3/report-long/data";
import { coreFile, registry } from "../src/lib/me-v3/core-registry";

const OUT = path.resolve(process.env.OUT ?? "var/report-long");
const FONT = `file://${path.resolve("public/fonts/cm-book")}/`;
const MIN_PRO = Number(process.env.MIN_PAGES ?? 66);
const MAX_PRO = Number(process.env.MAX_PAGES ?? 84);
/** 쪽 높이에서 흰 띠가 이만큼을 넘으면 빈 쪽으로 센다 */
const BLANK_MAX = Number(process.env.BLANK_MAX ?? 0.22);
const CHAPTER_END_MAX = Number(process.env.CHAPTER_END_MAX ?? 0.32);
/** 흰 띠를 세지 않는 쪽: 겉표지 · 표지 · 장 첫 쪽 · 쪽 전체가 쓰는 칸인 쪽 */
const BLANK_EXEMPT = new Set(["outer", "cover", "chapter", "sheet"]);

/**
 * 쪽마다 가장 긴 흰 띠. 70dpi 회색 그림에서 폭 8~92% 를 훑어 245 보다 밝은 줄만
 * 이어진 구간을 높이 10~92% 안에서 찾는다. 쓰는 칸의 줄(점선)은 그보다 어둡게 그려
 * 내용으로 센다.
 */
function blankBands(pdf: string, dir: string): number[] {
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  execFileSync("pdftoppm", ["-r", "70", "-gray", pdf, path.join(dir, "g")]);
  const files = readdirSync(dir).filter((f) => f.endsWith(".pgm")).sort((a, b) => Number(/(\d+)\.pgm$/.exec(a)![1]) - Number(/(\d+)\.pgm$/.exec(b)![1]));
  const out = files.map((f) => {
    const buf = readFileSync(path.join(dir, f));
    let pos = 0; const tok: string[] = [];
    while (tok.length < 4) {
      while (/\s/.test(String.fromCharCode(buf[pos]))) pos++;
      if (buf[pos] === 35) { while (buf[pos] !== 10) pos++; continue; }
      let t = ""; while (!/\s/.test(String.fromCharCode(buf[pos]))) t += String.fromCharCode(buf[pos++]);
      tok.push(t);
    }
    pos++;
    const w = Number(tok[1]), h = Number(tok[2]);
    const x0 = Math.floor(w * 0.08), x1 = Math.ceil(w * 0.92), y0 = Math.floor(h * 0.10), y1 = Math.ceil(h * 0.92);
    let run = 0, best = 0;
    for (let y = y0; y < y1; y++) {
      let white = true;
      for (let x = x0; x < x1; x += 2) if (buf[pos + y * w + x] <= 245) { white = false; break; }
      run = white ? run + 1 : 0; best = Math.max(best, run);
    }
    return Math.round((best / h) * 1000) / 1000;
  });
  rmSync(dir, { recursive: true, force: true });
  return out;
}

/** 직무 안내 검사의 쓰지 않는 말을 그대로 읽는다. 두 벌로 적어 두면 한쪽만 늘어난다 */
function bannedFromGuideCheck(): RegExp[] {
  const src = readFileSync("scripts/role-guide-check.mjs", "utf8");
  const m = /const BANNED = \[([\s\S]*?)\];/.exec(src);
  if (!m) throw new Error("role-guide-check.mjs 에서 BANNED 를 찾지 못했습니다");
  return [...m[1].matchAll(/\/((?:\\\/|[^/\n])+)\/([a-z]*)/g)].map((x) => new RegExp(x[1], x[2]));
}

type Hit = { rule: string; at: string };
/**
 * 전공 사전이 이름으로 쓰는 기술 용어(`구조 최적화` · 도구 `최적화`)는 쓰지 않는 말 검사에서 뺀다.
 * 그 낱말을 막으면 영역의 세부 이름을 지워야 한다. 뺀 낱말은 보고에 적는다.
 */
function dictTerms(core: string): string[] {
  const tax = coreFile<{ technical_domains: { subareas: string[] }[] }>(core, "taxonomy");
  const dom = coreFile<{ domains: { tools: string[]; artifacts: string[]; verify_targets: string[] }[] }>(core, "domains");
  const all = [...tax.technical_domains.flatMap((t) => t.subareas), ...dom.domains.flatMap((d) => [...d.tools, ...d.artifacts, ...d.verify_targets])];
  const bad = bannedFromGuideCheck().filter((r) => r.source !== "—");
  return [...new Set(all.filter((t) => bad.some((r) => r.test(t))))];
}

function scan(text: string, core: string, allow: string[]): Hit[] {
  const terms = dictTerms(core);
  const t = text.replace(/­/g, "").replace(/[ \t]+/g, " ");
  const flat = t.replace(/\s*\n\s*/g, " ");
  const hits: Hit[] = [];
  const near = (i: number, s: string) => s.slice(Math.max(0, i - 24), i + 30).replace(/\s+/g, " ");
  const find = (rule: string, re: RegExp, keep?: (ctx: string, before: string) => boolean) => {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const mm of flat.matchAll(g)) {
      const ctx = flat.slice(Math.max(0, (mm.index ?? 0) - 40), (mm.index ?? 0) + mm[0].length + 40);
      if (keep && keep(ctx, flat.charAt((mm.index ?? 0) - 1))) continue;
      hits.push({ rule, at: near(mm.index ?? 0, flat) });
    }
  };
  find("대시(—)", /[—–]/);
  for (const re of bannedFromGuideCheck()) if (re.source !== "—") find(`쓰지 않는 말 /${re.source}/`, re, (c, before) =>
    terms.some((w) => re.test(w) && c.includes(w))
    /* 회사 이름 같은 고유명사 안의 글자(유저인사이트)는 문장이 아니다. 명사형 낱말만 앞 글자를 본다 */
    || (/^(인사이트|시너지)$/.test(re.source) && /[가-힣]/.test(before)));
  find("'A가 아니라 B'", /(?:이|가|은|는|을|를)\s*아니라/);
  find("잠언 종결 '~이유다'", /이유(?:다|입니다)[.\s]/);
  find("hype 어휘", /압도적|파격적|폭발적|전례 없|시사하는 바|주목할 만|매우 중요/);
  find("자리표시 조사", /\(으\)|\(와\)|\(를\)|\(가\)|\(이\)|\(은\)/);
  find("안쪽 코드", /\bTD\d{2}\b|\bJ[1-8]\b|ROLE_|INDUSTRY_|\bZ[1-4]_|NOT_EXPLORED|NOT_ROUTED|ANSWERED_NONE|NONE_MISSING|_CORE_V\d|\bOC\d\b|\bRF\d\b|\bTR_[A-Z0-9]|\bCJ_|\bUG_|\bPR_|undefined|NaN|\[object/);
  find("빈 값", /\bnull\b/);
  find("'추천 기업'", /추천\s?기업/);
  find("'추천' (권하는 말)", /추천합니다|추천드|추천하는 (기업|회사|곳)|추천 회사|추천 직무/);
  find("'합격 가능성'", /합격\s?가능성/, (c) => /합격 가능성[^.]{0,6}(계산하지 않|내지 않|계산하지 않았)/.test(c));
  find("'알선'", /알선/, (c) => /알선(을|은)? ?하지 않|알선이 아닙|알선하지 않/.test(c));
  find("'대신 지원'", /대신\s?지원/);
  if (core !== "BIZ_CORE_V1") find("경영 쪽 말", /경영기획|경영계열|경영 계열|경영 직무|경영직|경영학/, (c) => allow.some((a) => c.includes(a)));
  if (core !== "ME_CORE_V3") find("기계공학 쪽 말", /기계공학/, (c) => allow.some((a) => c.includes(a)));
  return hits;
}

const OVER_JS = `(() => [...document.querySelectorAll(".pg")].map((pg, i) => {
  const bd = pg.querySelector(".bd") || pg; const box = bd.getBoundingClientRect(); let max = 0, right = 0;
  for (const e of bd.querySelectorAll("*")) { if (e.closest(".bleed")) continue; const b = e.getBoundingClientRect(); if (b.height && b.width) { max = Math.max(max, b.bottom); right = Math.max(right, b.right); } }
  const pb = pg.getBoundingClientRect();
  return { i: i + 1, title: pg.getAttribute("data-title") || "", over: Math.round(max - box.bottom), side: Math.round(right - pb.right), fill: Math.round(((max - box.top) / box.height) * 100) };
}))()`;

/* 제목과 이름표에서 마지막 줄에 글자 셋 이하가 혼자 떨어진 자리 */
const WRAP_JS = `(() => {
  const out = [];
  [...document.querySelectorAll(".pg")].forEach((pg, i) => {
    for (const e of pg.querySelectorAll("h1,h3,h4,.k,.tag,.ztag,b,th,.toc-b b,.f5 b,.prio-h b")) {
      if (e.closest("svg")) continue;
      const txt = e.textContent.replace(/\\s+/g, " ").trim(); if (!txt) continue;
      const boxes = []; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) for (let k = 0; k < n.length; k++) { if (/\\s/.test(n.data[k])) continue; const r = document.createRange(); r.setStart(n, k); r.setEnd(n, k + 1); const b = r.getBoundingClientRect(); if (b.height) boxes.push((b.top + b.bottom) / 2); }
      if (boxes.length < 4) continue;
      const lines = []; for (const c of boxes) { const l = lines.find((y) => Math.abs(y.c - c) < 4); if (l) l.n++; else lines.push({ c, n: 1 }); }
      if (lines.length < 2) continue; lines.sort((a, b) => a.c - b.c);
      if (lines[lines.length - 1].n <= 2) out.push({ i: i + 1, txt: txt.slice(-30) });
    }
  });
  return out;
})()`;

type Row = { id: string; core: string; tier: string; org: string; region: string | null; pages: number; designed: number; over: string[]; hits: Hit[]; wraps: number; notes: string[]; ms: number; blank: string[]; maxBlank: number; bytes: number };

async function one(id: string, uni: string | null): Promise<Row> {
  const t0 = Date.now();
  const REGION = process.env.REGION as "off" | "sejong" | "jeonbuk" | "chungcheong" | undefined;
  const EXPS = process.env.EXPERIENCES === "all" ? "all" as const : undefined;
  const GUIDE = process.env.GUIDE === "off" ? "off" as const : undefined;
  const rep = await buildLongReport(id, { fontBase: FONT, region: REGION, experiences: EXPS, guide: GUIDE });
  const dir = path.join(OUT, [id, REGION, EXPS && "exps", GUIDE && "noguide"].filter(Boolean).join("-"));
  rmSync(dir, { recursive: true, force: true }); mkdirSync(path.join(dir, "pages"), { recursive: true });
  const hf = path.join(dir, "book.html"); writeFileSync(hf, rep.html);
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
  await p.goto("file://" + hf, { waitUntil: "load" });
  await p.evaluate("document.fonts.ready");
  await p.emulateMedia({ media: "print" });
  /* 쪽 모으기가 끝난 뒤에 잰다. 쪽 크기를 mm 로 박아 두어 화면과 인쇄에서 쪽 높이가 같다 */
  await p.waitForSelector("html[data-packed]", { timeout: 30000 });
  const kinds = await p.evaluate(`[...document.querySelectorAll("section.pg")].map((s) => s.getAttribute("data-kind") || "plain")`) as string[];
  const titles = await p.evaluate(`[...document.querySelectorAll("section.pg")].map((s) => [...s.querySelectorAll(":scope .bd > .seg")].map((g, k) => k ? "+" : "").length > 1 ? s.getAttribute("data-title") + " 외 " + (s.querySelectorAll(".bd > .seg").length - 1) : s.getAttribute("data-title"))`) as string[];
  const over = await p.evaluate(OVER_JS) as { i: number; title: string; over: number; side: number; fill: number }[];
  const wraps = await p.evaluate(WRAP_JS) as { i: number; txt: string }[];
  const pdf = path.join(dir, "book.pdf");
  await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await b.close();
  const n = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())![1]);
  execFileSync("pdftoppm", ["-r", "40", "-png", pdf, path.join(dir, "pages", "p")]);
  for (const fn of readdirSync(path.join(dir, "pages"))) { const mm = /^p-0*(\d+)\.png$/.exec(fn); if (mm) renameSync(path.join(dir, "pages", fn), path.join(dir, "pages", `p-${mm[1].padStart(3, "0")}.png`)); }
  try {
    execFileSync("montage", [...readdirSync(path.join(dir, "pages")).sort().map((f) => path.join(dir, "pages", f)), "-tile", "10x", "-geometry", "+4+4", "-background", "#cfd5df", path.join(dir, "contact.png")], { stdio: "ignore" });
  } catch { /* 이음 그림이 없어도 검사는 이어 간다 */ }
  const text = execFileSync("pdftotext", ["-layout", pdf, "-"]).toString();
  writeFileSync(path.join(dir, "book.txt"), text);
  const bands = blankBands(pdf, path.join(dir, "gray"));
  const counted = bands.map((b, i) => ({ i: i + 1, b, title: titles[i] ?? "", kind: kinds[i] ?? "plain" })).filter((x) => !BLANK_EXEMPT.has(x.kind));
  /* 장의 마지막 쪽(다음이 장 표지이거나 책 끝)은 장 끝 여백을 32% 까지 둔다. 나머지 쪽은 22% 그대로다 */
  const endOfPart = (i: number) => i === kinds.length || kinds[i] === "chapter";
  const blank = counted.filter((x) => x.b > (endOfPart(x.i) ? CHAPTER_END_MAX : BLANK_MAX));
  const maxBlank = counted.reduce((a, x) => Math.max(a, x.b), 0);
  const bytes = Number(execFileSync("stat", ["-c", "%s", pdf]).toString().trim());
  const reg = registry().cores.find((c) => c.code === rep.core);
  const hits = scan(text, rep.core, [reg?.name_ko ?? "", ...(reg?.aliases ?? [])].filter(Boolean));
  const bad = over.filter((o) => o.over > 1 || o.side > 1);
  const row: Row = { id, core: rep.core, tier: rep.tier, org: uni ?? "", region: rep.region, pages: n, designed: rep.pages.length, over: bad.map((o) => `${o.i}쪽(${o.title}) 아래 ${o.over}px 옆 ${o.side}px`), hits, wraps: wraps.length, notes: rep.notes, ms: Date.now() - t0, blank: blank.map((x) => `${x.i}쪽(${x.title}) ${Math.round(x.b * 100)}%`), maxBlank, bytes };
  writeFileSync(path.join(dir, "REPORT.md"), [
    `# 긴 결과지 점검 · 응시 ${id}${REGION ? ` · 지역 ${REGION}` : ""}`, "",
    `- Core ${rep.core} · ${rep.tier} · 기관 ${uni ?? "없음"} · 지역 ${rep.region ?? "없음"}`,
    `- 쪽 수 **${n}** (설계 ${rep.pages.length}) · 넘친 쪽 ${bad.length} · 걸린 말 ${hits.length} · 빈 쪽 ${blank.length} (가장 긴 흰 띠 ${Math.round(maxBlank * 100)}%) · PDF ${(bytes / 1048576).toFixed(2)}MB · 외톨이 줄 ${wraps.length}`,
    ...rep.notes.map((x) => `- 사정: ${x}`), "",
    "## 넘친 쪽", ...(bad.length ? bad.map((o) => `- ${o.i}쪽 ${o.title} · 아래 ${o.over}px · 옆 ${o.side}px`) : ["- 없음"]), "",
    `## 빈 쪽 (흰 띠 > ${Math.round(BLANK_MAX * 100)}%)`, ...(blank.length ? blank.map((x) => `- ${x.i}쪽 ${x.title} · ${Math.round(x.b * 100)}%`) : ["- 없음"]), "",
    "## 걸린 말", ...(hits.length ? hits.map((h) => `- ${h.rule} · …${h.at}…`) : ["- 없음"]), "",
    "## 외톨이 줄(보고만)", ...(wraps.length ? wraps.slice(0, 80).map((w) => `- ${w.i}쪽 · ${w.txt}`) : ["- 없음"]), "",
    "## 쪽", "| 쪽 | 제목 | 종류 | 채움 | 흰 띠 |", "|---|---|---|---|---|", ...over.map((o) => `| ${o.i} | ${o.title} | ${kinds[o.i - 1] ?? ""} | ${o.fill}% | ${Math.round((bands[o.i - 1] ?? 0) * 100)}% |`), "",
  ].join("\n"));
  return row;
}

/** 걸리는 것: 넘친 쪽 · 걸린 말 · 빈 쪽 · PRO 쪽 수가 범위 밖 */
const bad = (r: Row) => !!(r.over.length || r.hits.length || r.blank.length || (r.tier === "PRO" && (r.pages < MIN_PRO || r.pages > MAX_PRO)));

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const all = await scoredAttempts();
  let picks: { id: string; uni: string | null }[] = [];
  if (process.env.ATTEMPT) {
    picks = process.env.ATTEMPT.split(",").map((s) => s.trim()).filter(Boolean).map((id) => ({ id, uni: all.find((a) => a.id === id)?.university_code ?? null }));
  } else {
    const want = (process.env.CORES ?? "all").split(",").map((s) => s.trim());
    const cores = registry().cores.filter((c) => c.status === "building" && (want.includes("all") || want.includes(c.code))).map((c) => c.code);
    const ORGS = ["PCU", "KUS", "SJEPA"];
    cores.forEach((c, i) => {
      const mine = all.filter((a) => a.core_code === c && a.tier === "PRO");
      const pick = mine.find((a) => a.university_code === ORGS[i % 3]) ?? mine[0];
      if (pick) picks.push({ id: pick.id, uni: pick.university_code });
      else console.log(`  ${c}: 굳은 PRO 응시 없음`);
    });
  }
  const rows: Row[] = [];
  for (const p of picks) {
    try {
      const r = await one(p.id, p.uni);
      rows.push(r);
      console.log(`${bad(r) ? "  걸림" : "  통과"}  ${p.id} ${r.core} ${r.org} → ${r.pages}쪽 · 넘침 ${r.over.length} · 걸린 말 ${r.hits.length} · 빈 쪽 ${r.blank.length} (최대 흰 띠 ${Math.round(r.maxBlank * 100)}%) · ${(r.bytes / 1048576).toFixed(2)}MB · 외톨이 ${r.wraps} · ${r.ms}ms${r.notes.length ? ` · ${r.notes.join(" / ")}` : ""}`);
      for (const o of r.over.slice(0, 6)) console.log(`        넘침 ${o}`);
      for (const o of r.blank.slice(0, 12)) console.log(`        빈 쪽 ${o}`);
      for (const h of r.hits.slice(0, 8)) console.log(`        ${h.rule} · …${h.at}…`);
    } catch (e) {
      console.log(`  실패  ${p.id}: ${(e as Error).stack?.split("\n").slice(0, 3).join(" | ")}`);
      rows.push({ id: p.id, core: "?", tier: "?", org: p.uni ?? "", region: null, pages: 0, designed: 0, over: ["실패"], hits: [], wraps: 0, notes: [String((e as Error).message)], ms: 0, blank: [], maxBlank: 0, bytes: 0 });
    }
  }
  const md = ["# 긴 결과지 점검 요약", "", "| 응시 | Core | 기관 | 지역 | 쪽 | 최대 흰 띠 | 빈 쪽 | 넘침 | 걸린 말 | PDF | 외톨이 | 사정 |", "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.id} | ${r.core} | ${r.org} | ${r.region ?? "-"} | ${r.pages} | ${Math.round(r.maxBlank * 100)}% | ${r.blank.length} | ${r.over.length} | ${r.hits.length} | ${(r.bytes / 1048576).toFixed(2)}MB | ${r.wraps} | ${r.notes.join("; ")} |`)].join("\n");
  writeFileSync(path.join(OUT, "SUMMARY.md"), md + "\n");
  writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(rows, null, 1));
  const failed = rows.filter(bad);
  console.log(`\n${rows.length}권 · 걸림 ${failed.length} → ${path.join(OUT, "SUMMARY.md")}`);
  process.exit(failed.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
