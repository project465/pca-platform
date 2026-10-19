/** R34 lab: 결과 쪽에서 page.pdf 를 두 번(둘째는 scale) 불러 본다 */
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { BASE, gateCreds, loadEnv, login } from "../_loop-fixture";
import { query } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/password";
loadEnv();
async function main() {
  const [attempt, email] = process.argv.slice(2);
  const pw = randomBytes(18).toString("base64url");
  await query(`UPDATE users SET password_hash = $2 WHERE login_id = $1`, [email, await hashPassword(pw)]);
  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ ...(gate ? { httpCredentials: gate } : {}) });
  const p = await login(ctx, email, pw);
  await p.goto(`${BASE}/v3/${attempt}/result`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector(".rs-main .rs-sect", { state: "attached", timeout: 20000 });
  await p.locator(".rs-openbtn").first().click({ timeout: 3000 }).catch(() => undefined);
  await p.emulateMedia({ media: "print" });
  const o = { format: "A4" as const, printBackground: true, displayHeaderFooter: true,
    headerTemplate: "<div>h</div>", footerTemplate: "<div>f</div>",
    margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" } };
  for (const [i, extra] of [[1, {}], [2, { scale: 0.985 }], [3, { scale: 0.97 }], [4, {}]] as const) {
    const t = Date.now();
    try { const b = await p.pdf({ ...o, ...extra }); console.log(i, "ok", b.length, Date.now() - t, "ms"); }
    catch (e) { console.log(i, "FAIL", (e as Error).message.split("\n")[0], Date.now() - t, "ms"); }
  }
  await browser.close(); process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
