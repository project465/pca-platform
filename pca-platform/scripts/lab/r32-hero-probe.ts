/** 홈 Hero 의 자식 상자를 재어 어디서 높이가 나오는지 적는다 */
import { loadEnv, BASE, makeStudent, cloneFinished, login } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { query } from "../../src/lib/db";
async function main() {
  const who = `r32h-${Date.now().toString(36)}`;
  const { id, pw } = await makeStudent(who);
  const att = await cloneFinished(id, "PRO");
  if (!att) throw new Error("끝낸 응시를 못 만들었다");
  await query(`INSERT INTO v3_experiences (user_id, core_code, kind, title, started_on, td_codes, decisions)
     VALUES ($1,'BIZ_CORE_V1','project','학생회 예산 배분 회의 정리','2025-09-01', ARRAY['TD01'], ARRAY['쓸 돈과 안 쓸 돈을 갈라 적었다'])`, [id]);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: Number(process.env.W ?? 1440), height: 900 } });
  const p = await login(c, who, pw);
  await p.goto(`${BASE}/me`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  const out = await p.evaluate(`(() => {
    const R = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { top: Math.round(r.top), h: +r.height.toFixed(1), w: +r.width.toFixed(1), pt: cs.paddingTop, pb: cs.paddingBottom, mt: cs.marginTop, mb: cs.marginBottom, fs: cs.fontSize, lh: cs.lineHeight, lines: Math.round(r.height / parseFloat(cs.lineHeight || "1")) }; };
    return { hero: R(".cm-hero"), txt: R(".cm-hero-txt"), tag: R(".cm-hero-tag"), h: R(".cm-hero-h"), why: R(".cm-hero-why"), acts: R(".cm-hero-acts"), btn: R(".cm-hero-acts .cm-btn"), more: R(".cm-hero-more"), art: R(".cm-hero-art"), artsvg: R(".cm-hero-art > svg"), h1: R(".cm-h1"), sect: R(".cm-sh"), main: R(".cm-main") };
  })()`) as Record<string, unknown>;
  for (const [k, v] of Object.entries(out)) console.log(k.padEnd(7), JSON.stringify(v));
  await p.screenshot({ path: "var/r32/hero-before.png", clip: { x: 300, y: 0, width: 1140, height: 560 } }).catch(() => undefined);
  await b.close(); process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
