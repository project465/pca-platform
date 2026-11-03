/**
 * PWA 화면 두 자리를 찍는다: MAT 설정의 `이 기기로 알림 받기` 와 홈의 설치 안내.
 * 설치 안내는 브라우저가 `beforeinstallprompt` 를 줄 때만 서므로, 머리 없는
 * 브라우저에서는 그 사건을 흉내 내 띄운다.
 *
 *   UI_BASE=http://127.0.0.1:3100 OUT=<저장소 밖> npx tsx scripts/lab/pwa-shots.ts
 */
import { BASE, cloneFinished, login, makeStudent } from "../_loop-fixture";
import { chromium } from "playwright";
import { query } from "../../src/lib/db";

const OUT = process.env.OUT ?? "var/pwa-shots";

async function main() {
  const who = `pwa-shot-${Date.now()}`;
  const { id, pw } = await makeStudent(who);
  await cloneFinished(id, "PRO");
  await query(`INSERT INTO entitlements (user_id, product_code, kind, status, starts_at, ends_at)
               VALUES ($1,'TRACK_30D','track','active',now(),now()+interval '30 days')`, [id]);
  /* 머리 없는 기본 브라우저는 알림을 늘 막아 두어 `막혀 있음` 만 찍힌다. 전체 크로뮴은 처음 상태(묻기 전)로 선다 */
  const br = await chromium.launch({ channel: "chromium" });
  for (const vp of [{ width: 1280, height: 900, n: "pc" }, { width: 390, height: 844, n: "m" }]) {
    const ctx = await br.newContext({ viewport: vp });
    const p = await login(ctx, who, pw);
    await p.goto(`${BASE}/me/track#settings`, { waitUntil: "networkidle" });
    const set = p.locator("#settings");
    await set.scrollIntoViewIfNeeded();
    await p.waitForTimeout(800);
    await set.screenshot({ path: `${OUT}/${vp.n}-mat-settings.png` });
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    await p.evaluate(() => {
      const e = new Event("beforeinstallprompt") as Event & { prompt?: () => Promise<void>; userChoice?: Promise<unknown> };
      e.prompt = async () => undefined; e.userChoice = Promise.resolve({ outcome: "dismissed" });
      window.dispatchEvent(e);
    });
    const card = p.locator("[data-install]");
    await card.waitFor({ timeout: 5000 });
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: `${OUT}/${vp.n}-install-card.png` });
    await ctx.close();
  }
  await br.close();
  console.log("찍었다:", OUT);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
