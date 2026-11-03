/**
 * 떠 있는 홈페이지의 모든 링크와 단추 주소를 눌러 본다.
 *
 *   BASE=http://127.0.0.1:3200 node scripts/verify.mjs
 *   APP_LOCAL=http://127.0.0.1:3100 ...   (앱이 로컬에 떠 있으면 앱 경로도 두드린다)
 *
 * 세는 것:
 *   - 쪽 안의 주소(/…)는 200 이어야 한다. 301/308 이면 넘어간 자리까지 따라간다
 *   - 같은 쪽 안 앵커(#how)는 그 id 가 실제로 있어야 한다
 *   - 앱으로 가는 주소는 PLATFORM_URL(src/lib/domains.ts)/… 꼴이어야 하고 lang 을 들고 간다.
 *     APP_LOCAL 이 있으면 그 경로가 앱에서 404/5xx 가 아닌지 본다
 *   - mailto:/tel: 은 꼴만 본다
 *   - 그 밖의 바깥 주소는 하나도 없어야 한다 (있으면 실패로 적는다)
 * 사이트맵에 적힌 주소도 같은 자로 잰다.
 */
const BASE = (process.env.BASE ?? "http://127.0.0.1:3200").replace(/\/$/, "");
/* 도메인은 src/lib/domains.ts 한 곳에만 적는다. 그 줄을 읽어 온다 */
import { readFileSync } from "node:fs";
const APP = readFileSync(new URL("../src/lib/domains.ts", import.meta.url), "utf8")
  .match(/PLATFORM_URL = "([^"]+)"/)[1];
const APP_LOCAL = process.env.APP_LOCAL?.replace(/\/$/, "");
const START = (process.env.PAGES ?? "/").split(",");

const pages = new Map(); // path -> html
const links = []; // {from, href, kind}
const fails = [];
const ok = [];

async function get(url, redirect = "manual") {
  const r = await fetch(url, { redirect });
  return { status: r.status, location: r.headers.get("location"), body: r.status === 200 ? await r.text() : "" };
}

function hrefsOf(html) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)) out.push({ href: m[1], kind: "a" });
  for (const m of html.matchAll(/<form\b[^>]*?\saction="([^"]*)"/g)) out.push({ href: m[1], kind: "form" });
  return out.map((x) => ({ ...x, href: x.href.replace(/&amp;/g, "&") }));
}
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

async function crawl(path) {
  if (pages.has(path)) return;
  pages.set(path, null);
  const r = await get(BASE + path);
  if (r.status !== 200) {
    fails.push(`${path} → ${r.status}`);
    return;
  }
  pages.set(path, r.body);
  for (const h of hrefsOf(r.body)) {
    links.push({ from: path, ...h });
    if (h.href.startsWith("/") && !h.href.startsWith("//")) {
      const p = h.href.split("#")[0].split("?")[0] || "/";
      if (!/\.(png|svg|ico|xml|txt|woff2)$/.test(p)) await crawl(p);
    }
  }
}

for (const p of START) await crawl(p);
// 사이트맵
const sm = await get(BASE + "/sitemap.xml");
const smUrls = sm.status === 200 ? [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]) : [];
if (sm.status !== 200) fails.push(`/sitemap.xml → ${sm.status}`);
for (const u of smUrls) await crawl(new URL(u).pathname);

const seen = new Set();
const appChecked = new Map();
for (const l of links) {
  const key = l.from + "|" + l.href;
  if (seen.has(key)) continue;
  seen.add(key);
  const h = l.href;
  const tag = `${l.from} [${l.kind}] ${h}`;
  if (h.startsWith("#")) {
    const id = h.slice(1);
    if (!id) { fails.push(`${tag} 빈 앵커`); continue; }
    idsOf(pages.get(l.from) ?? "").has(id) ? ok.push(tag) : fails.push(`${tag} 앵커 없음`);
  } else if (h.startsWith("/") && !h.startsWith("//")) {
    const [pathq, frag] = h.split("#");
    let r = await get(BASE + pathq);
    if ([301, 302, 307, 308].includes(r.status)) {
      const loc = r.location ?? "";
      if (loc.startsWith(APP)) { ok.push(`${tag} → ${r.status} ${loc}`); await checkApp(loc, tag); continue; }
      r = await get(new URL(loc, BASE).href);
    }
    if (r.status !== 200) { fails.push(`${tag} → ${r.status}`); continue; }
    if (frag && !idsOf(r.body).has(frag)) { fails.push(`${tag} 앵커 없음`); continue; }
    ok.push(tag);
  } else if (h.startsWith(APP + "/") || h === APP) {
    const u = new URL(h);
    if (!u.searchParams.get("lang")) { fails.push(`${tag} lang 없음`); continue; }
    ok.push(tag);
    await checkApp(h, tag);
  } else if (/^mailto:[^@\s]+@[^@\s]+\.[a-z]+/i.test(h) || /^tel:\+?\d{6,}$/.test(h)) {
    ok.push(tag);
  } else {
    fails.push(`${tag} 모르는 바깥 주소`);
  }
}

async function checkApp(url, tag) {
  if (!APP_LOCAL) return;
  const u = new URL(url);
  const path = u.pathname;
  if (!appChecked.has(path)) {
    const r = await fetch(APP_LOCAL + path + u.search, { redirect: "manual" });
    appChecked.set(path, r.status);
  }
  const s = appChecked.get(path);
  if (s >= 400) fails.push(`${tag} 앱에서 ${s}`);
}

const uniqHrefs = new Set(links.map((l) => l.href));
console.log(`쪽 ${[...pages.keys()].length}개: ${[...pages.keys()].join(" ")}`);
console.log(`링크·단추 ${links.length}개 (서로 다른 주소 ${uniqHrefs.size}개) · 통과 ${ok.length} · 걸림 ${fails.length}`);
if (APP_LOCAL) console.log(`앱 경로 확인: ${[...appChecked].map(([p, s]) => `${p}=${s}`).join(" ")}`);
for (const f of fails) console.log("  걸림  " + f);
if (process.env.LIST) for (const h of [...uniqHrefs].sort()) console.log("  " + h);
process.exit(fails.length ? 1 : 0);
