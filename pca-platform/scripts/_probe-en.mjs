import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
const ROOT = "sites/pca-platform", PORT = 8247;
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css",".json":"application/json"};
const srv = await new Promise((ok)=>{const s=createServer((q,r)=>{const rel=normalize(decodeURIComponent(q.url.split("?")[0])).replace(/^(\.\.[/\\])+/,"");let f=join(ROOT,rel==="/"?"index.html":rel);if(existsSync(f)&&statSync(f).isDirectory())f=join(f,"index.html");if(!existsSync(f)){r.writeHead(404);r.end("no");return;}r.writeHead(200,{"content-type":MIME[extname(f)]||"text/plain; charset=utf-8"});r.end(readFileSync(f));});s.listen(PORT,"127.0.0.1",()=>ok(s));});
const { chromium } = await import("playwright");
const b = await chromium.launch({ args:["--no-sandbox"] });
const p = await (await b.newContext()).newPage();
p.on("pageerror", e => console.log("ERR", e.message));
await p.goto(`http://127.0.0.1:${PORT}/v2.html`, { waitUntil:"networkidle" });
const out = await p.evaluate(() => {
  window.PCAI18N.setLang("en");
  const bk = window.PCA_V2_ITEMS.ME;
  const all = [].concat(bk.core.items, bk.standard.items, bk.pro.items);
  const V2 = window.PCAV2;
  const answers = {};
  for (const it of V2.itemsFor("PRO")) {
    const src = all.find(x => x.item_id === it.item_id) || it;
    const fam = Object.keys(src.career_family_weights || {});
    const hit = fam.includes("ME_DESIGN_PRODUCT");
    answers[it.item_id] = hit ? 5 : 2;
  }
  const v2 = V2.score("PRO","phd",answers);
  const J = window.PCAV2ResultJSON.build(v2, {tier:"PRO",stage:"phd",answers,profile:{name:""}});
  return {
    lang: J.report_language,
    famEnLoaded: Object.keys(window.PCA_V2_FAMILY_NAMES_EN||{}).length,
    row0: J.decision_table[0],
    covKeys: Object.keys(J.role_evidence_coverage||{}).slice(0,2),
    cov0: JSON.stringify(Object.values(J.role_evidence_coverage||{})[0]||{}).slice(0,220),
  };
});
console.log(JSON.stringify(out, null, 1).slice(0, 1400));
await b.close(); srv.close();
