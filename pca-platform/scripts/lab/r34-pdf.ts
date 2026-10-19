/**
 * R34: 한 응시의 종이를 **제품의 길**(`/v3/<id>/result/pdf`)로 받아
 * 쪽마다 그림과 글자로 떠 둔다. 그 사람의 비밀번호만 그 자리에서 다시
 * 적는다(`pdf-snap.ts` 와 같은 까닭: 응시를 지우지 않는다).
 *
 *   UI_BASE=http://127.0.0.1:3100 OUT=var/r34/before \
 *     npx tsx scripts/lab/r34-pdf.ts <attemptId> <login_id> [tag]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { BASE, assertFreshServer, gateCreds, loadEnv, login } from "../_loop-fixture";
import { query } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/password";

loadEnv();

async function main(): Promise<void> {
  const [attempt, email, tag0] = process.argv.slice(2);
  if (!attempt || !email) throw new Error("응시번호 · 아이디가 필요하다");
  const tag = tag0 ?? `att${attempt}`;
  const OUT = process.env.OUT ?? "var/r34/before";
  mkdirSync(OUT, { recursive: true });
  await assertFreshServer();
  const pw = randomBytes(18).toString("base64url");
  await query(`UPDATE users SET password_hash = $2 WHERE login_id = $1`, [email, await hashPassword(pw)]);
  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, ...(gate ? { httpCredentials: gate } : {}),
  });
  const p = await login(ctx, email, pw);
  const res = await p.request.get(`${BASE}/v3/${attempt}/result/pdf`, { timeout: 180000 });
  const ct = res.headers()["content-type"] ?? "";
  if (res.status() !== 200 || !ct.includes("pdf")) throw new Error(`PDF ${res.status()} ${ct}`);
  const pdf = `${OUT}/${tag}.pdf`;
  writeFileSync(pdf, Buffer.from(await res.body()));
  execFileSync("pdftoppm", ["-r", "80", "-png", pdf, `${OUT}/${tag}-p`]);
  const text = execFileSync("pdftotext", ["-layout", pdf, "-"]).toString("utf8");
  writeFileSync(`${OUT}/${tag}.txt`, text);
  const pages = text.split("\f").filter((s) => s.trim().length);
  console.log(`${pdf} · ${pages.length}쪽`);
  await ctx.close();
  await browser.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
