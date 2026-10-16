/**
 * 결과 상세의 접힌 자리가 왜 하나 남는지 본다 (한 번 쓰는 probe).
 *
 * 눌러서 펴는 자리가 React 상태라 속성만 세워서는 열리지 않는다. 이
 * 스크립트는 라운드마다 단추의 이름과 `aria-expanded` 를 찍어, 어느
 * 자리가 다시 접히는지와 글자 수가 어떻게 늘어나는지를 적는다.
 */
import { chromium } from "playwright";
import {
  BASE, loadEnv, assertFreshServer, makeStudent, cloneFinished, login,
} from "../_loop-fixture";
import { query } from "../../src/lib/db";

loadEnv();

async function main(): Promise<void> {
  assertFreshServer();
  const who = `zzfold${Date.now().toString().slice(-7)}`;
  const stu = await makeStudent(who);
  const att = await cloneFinished(stu.id, "PRO");
  if (!att) throw new Error("베껴 올 응시가 없습니다");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const p = await login(ctx, who, stu.pw).catch(() => null);
    const page = p ?? (await ctx.newPage());
    await page.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    const sel = "button.rs-openbtn, button.rs-discbtn, button.rs-foldbtn";
    for (let r = 0; r < 8; r++) {
      const rows = await page.$$eval(sel, (els) => els.map((e) => ({
        cls: e.className,
        exp: e.getAttribute("aria-expanded"),
        txt: (e.textContent ?? "").replace(/\s+/g, " ").slice(0, 34),
      })));
      const len = (await page.locator("body").innerText()).replace(/\s+/g, " ").length;
      console.log(`[라운드 ${r}] 글자 ${len} · 단추 ${rows.length}`);
      for (const x of rows) console.log(`   ${x.exp} ${x.cls} ${x.txt}`);
      const clicked = await page.$$eval(
        'button.rs-openbtn[aria-expanded="false"], button.rs-discbtn[aria-expanded="false"], button.rs-foldbtn[aria-expanded="false"]',
        (els) => { for (const e of els) (e as HTMLButtonElement).click(); return els.length; },
      ).catch(() => 0);
      if (!clicked) break;
      await page.waitForTimeout(350);
    }
  } finally {
    await ctx.close(); await browser.close();
    await query(`DELETE FROM users WHERE id = $1::bigint`, [stu.id]).catch(() => undefined);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
