/**
 * **종이 조판을 고치는 동안 쓰는 작업대.**
 *
 * 결과지 한 쪽을 그대로 떠서(`var/pdf-lab/*.html`) 스타일시트를 안에
 * 넣어 둔다. 그 다음부터는 Next 를 다시 굽지 않고 그 파일의 `<style>`
 * 만 갈아 끼워 종이를 뽑아 볼 수 있다. **제품 CSS 를 고치는 자리가
 * 아니다**: 여기서 재어 보고 맞는 값을 `result.css` 에 적는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/lab/pdf-snap.ts <attemptId> <name> <email>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { randomBytes } from "node:crypto";
import { BASE, gateCreds, loadEnv, login } from "../_loop-fixture";
import { query } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/password";

loadEnv();

async function main(): Promise<void> {
  const [attempt, name, email] = process.argv.slice(2);
  if (!attempt || !name || !email) throw new Error("응시번호 · 이름 · 메일이 필요하다");
  mkdirSync("var/pdf-lab", { recursive: true });
  /* **그 사람의 응시를 지우지 않는다.** `makeStudent` 는 같은 아이디가
     있으면 응시까지 지우고 다시 만든다. 여기서 보려는 것이 그 응시의
     결과지라 그 길로는 갈 수 없다. 비밀번호만 그 자리에서 다시 적는다 */
  const pw = randomBytes(18).toString("base64url");
  await query(`UPDATE users SET password_hash = $2 WHERE login_id = $1`,
    [email, await hashPassword(pw)]);
  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    ...(gate ? { httpCredentials: gate } : {}),
  });
  const p = await login(ctx, email, pw);
  await p.goto(`${BASE}/v3/${attempt}/result`, { waitUntil: "networkidle" });
  /* 스타일시트를 전부 받아 `<style>` 로 넣는다. 파일로 열면 상대 주소가
     깨져서, 넣지 않으면 조판이 통째로 사라진다 */
  const html = await p.evaluate(async () => {
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const css: string[] = [];
    for (const l of links) {
      const href = (l as HTMLLinkElement).href;
      try { css.push(await (await fetch(href)).text()); } catch { /* 받지 못하면 건너뛴다 */ }
      l.remove();
    }
    const s = document.createElement("style");
    s.id = "lab-css";
    s.textContent = css.join("\n");
    document.head.appendChild(s);
    document.querySelectorAll("script").forEach((x) => x.remove());
    return `<!doctype html>\n${document.documentElement.outerHTML}`;
  });
  writeFileSync(`var/pdf-lab/${name}.html`, html);
  console.log(`var/pdf-lab/${name}.html — ${Math.round(html.length / 1024)}KB`);
  await ctx.close();
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
