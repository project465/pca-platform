/**
 * `/me/prep` 를 실제 브라우저로 밟고 찍는다. 답 하나를 적어 저장까지 한다.
 *
 *   UI_BASE=http://127.0.0.1:3100 OUT=docs/metri/shots/prep npx tsx scripts/lab/prep-shots.ts
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { loadEnv, BASE, makeStudent, cloneFinished, login, gateCreds } from "../_loop-fixture";

loadEnv();

async function main() {
  const { queryOne } = await import("../../src/lib/db");
  const OUT = process.env.OUT || "docs/metri/shots/prep";
  mkdirSync(OUT, { recursive: true });
  const who = "zz-prep-shot";
  const { id, pw } = await makeStudent(who);
  const att = await cloneFinished(id, "PRO");
  if (!att) throw new Error("베껴 올 끝낸 응시가 없습니다");

  const browser = await chromium.launch();
  let fail = 0;
  const check = (name: string, cond: boolean, note = "") => {
    if (!cond) fail += 1;
    console.log(`  ${cond ? "통과" : "걸림"}  ${name}${note ? ` — ${note}` : ""}`);
  };
  for (const [tag, width] of [["desktop", 1440], ["mobile", 390]] as const) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 }, httpCredentials: gateCreds() ?? undefined,
    });
    const p = await login(ctx, who, pw);
    const errs: string[] = [];
    p.on("pageerror", (e) => errs.push(String(e)));
    await p.goto(`${BASE}/me/prep`, { waitUntil: "networkidle" });
    check(`${tag} 쪽이 선다`, (await p.locator("h1").first().innerText()).includes("지원서·면접"));
    const nItems = await p.locator(".cm-item").count();
    check(`${tag} 문항과 질문이 선다`, nItems >= 5, `${nItems}칸`);
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    check(`${tag} 가로로 밀리지 않는다`, !over);
    const body = await p.locator("main, body").first().innerText();
    check(`${tag} 안쪽 코드가 보이지 않는다`,
      !/\b(TD\d{2}|SPEC_|ROLE_|INDUSTRY_|TR_T\d|_CORE_V\d)/.test(body));
    await p.screenshot({ path: `${OUT}/prep-${tag}.png`, fullPage: true });

    if (tag === "desktop") {
      /* 지원서 둘째 문항(직무 관련 경험)을 펴서 적고 저장한다 */
      const item = p.locator(".cm-item").nth(1);
      await item.locator("summary").click();
      await item.locator("textarea").fill(
        "경영전략·기획 수업 팀 과제에서 신규 서비스 안 세 가지를 같은 기준으로 비교해 하나를 골랐습니다. "
        + "(수치는 직접 적기)");
      await p.screenshot({ path: `${OUT}/prep-desktop-open.png`, fullPage: false,
        clip: { x: 0, y: 0, width: 1440, height: 900 } });
      await Promise.all([
        p.waitForURL(/saved=/, { timeout: 20000 }),
        item.locator('button[type="submit"]').click(),
      ]);
      await p.waitForLoadState("networkidle");
      const row = await queryOne<{ n: number }>(
        `SELECT count(*)::int AS n FROM v3_prep_answers WHERE user_id = $1`, [id]);
      check("저장하면 DB 에 한 줄이 선다", row?.n === 1, `${row?.n}줄`);
      const meta = await p.locator(".cm-item").nth(1).locator(".cm-dot").innerText();
      check("저장한 칸이 '적어 둠' 으로 바뀐다", meta.includes("적어 둠"), meta);
      const ta = await p.locator(".cm-item").nth(1).locator("textarea").inputValue();
      check("다시 열면 적은 답이 그대로 있다", ta.includes("신규 서비스"));
      await p.screenshot({ path: `${OUT}/prep-desktop-saved.png`, fullPage: true });
    }
    check(`${tag} 브라우저 오류가 없다`, errs.length === 0, errs[0] ?? "");
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `\n걸림 ${fail}` : "\n전부 통과");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
