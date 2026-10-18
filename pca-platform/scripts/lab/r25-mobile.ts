/** 손전화 폭에서 공통 단이 실제로 몇 px 로 풀리는지 잰다 (R25 검산). */
import { loadEnv, BASE } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
const JS = `(() => {
  const names = ["--ui-t-page","--ui-t-section","--ui-t-q","--ui-t-body","--ui-t-sub","--ui-t-cap"];
  const out = {};
  for (const host of ["root", "cm"]) {
    const box = document.createElement("div");
    if (host === "cm") box.className = "cm";
    document.body.appendChild(box);
    const el = document.createElement("div");
    box.appendChild(el);
    const got = {};
    for (const n of names) { el.style.fontSize = "var(" + n + ")"; got[n] = getComputedStyle(el).fontSize; }
    out[host] = got;
    box.remove();
  }
  return out;
})()`;
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1440]) {
    const p = await b.newPage({ viewport: { width: w, height: 800 } });
    await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    const v = await p.evaluate(JS);
    console.log(w, JSON.stringify(v, null, 0));
    await p.close();
  }
  await b.close();
})();
