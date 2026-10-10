/**
 * 옛 판본 결과지와 지금 판본 결과지를 **같은 차례로 찍는다.**
 *
 * 이 회차가 고친 것은 `처음 로드된 화면이 종이 분량인가` 이고, 그것은
 * 상태코드로도 글자로도 안 보인다. 그래서 첫 창(1440 × 900)만 자른
 * 그림과 쪽 전체 그림을 나란히 남긴다.
 *
 * **밟는 차례 그대로 찍는다.** 자리 목록을 주소로 열어 찍으면 그 쪽이
 * 어떤 상태인지는 지난번 누군가가 눌러 둔 상태에 달려 있다. 여기서는
 * 열고 · 절을 펼치고 · 부록을 펼치는 순서로 한 길을 밟는다.
 *
 * **같은 그림이 두 이름으로 저장되면 걸린다.** 이 저장소에서 자리를 잘못
 * 찾아 같은 쪽을 열두 번 찍어 둔 적이 두 번 있다. 지문을 견주어 센다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/v3-legacy-shots.ts
 */
import { randomBytes, createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";

import { BASE, cloneFinished, gateCreds, login, makeStudent } from "./_loop-fixture";
import { chromium, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

const OUT = "docs/metri/shots/legacy";
const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const seen = new Map<string, string>();
let dup = 0;

/** 첫 창만 자른 그림과 쪽 전체 그림을 함께 남긴다 */
async function shoot(p: Page, name: string): Promise<void> {
  for (const [kind, full] of [["view", false], ["page", true]] as const) {
    const file = `${OUT}/${name}.${kind}.png`;
    await p.screenshot({ path: file, fullPage: full });
    /* **같은 자리의 두 그림끼리는 견주지 않는다.** 첫 창이 쪽 전체와
       같은 화면은 정상이다(지금 판본의 첫 화면이 딱 한 창이다). 겹침으로
       세야 하는 것은 **다른 자리가 같은 그림으로 저장된 경우**다 */
    const sum = createHash("sha256")
      .update(kind).update(readFileSync(file)).digest("hex");
    const old = seen.get(sum);
    if (old) { dup += 1; console.log(`  겹침  ${file} == ${old}`); }
    else seen.set(sum, file);
  }
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  console.log(`  찍음  ${name}  문서 ${h}px`);
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const gate = gateCreds();
  const extra = gate ? { httpCredentials: gate } : {};

  const lg = await queryOne<{ id: string; uid: string; login: string; tier: string }>(
    `SELECT a.id::text, a.user_id::text AS uid,
            COALESCE(u.login_id, u.email) AS login, a.tier
       FROM attempts a JOIN users u ON u.id = a.user_id
       JOIN report_snapshots rs ON rs.attempt_id = a.id
      WHERE a.status = 'scored' AND a.assessment_version = 'ME_V2'
        AND rs.payload IS NOT NULL
      ORDER BY a.id DESC LIMIT 1`);
  if (!lg) throw new Error("옛 판본 결과가 이 DB 에 없습니다");
  const pw = randomBytes(18).toString("base64url");
  await query(
    `UPDATE users SET password_hash = $2, must_reset_pw = FALSE WHERE id = $1`,
    [lg.uid, await hashPassword(pw)]);

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    /* ── 옛 판본. 열고 · 절을 펼치고 · 부록을 펼친다 ────────────── */
    for (const [sz, vp] of Object.entries(SIZES)) {
      const ctx = await browser.newContext({ viewport: vp, ...extra });
      const p = await login(ctx, lg.login, pw);
      await p.goto(`${BASE}/assessment/${lg.id}/report`, { waitUntil: "networkidle" });
      await p.frameLocator("iframe.rpframe").locator(".rpage").first()
        .waitFor({ timeout: 30000 });
      await p.waitForTimeout(1500);
      await shoot(p, `01_legacy_first_${sz}`);

      await p.frameLocator("iframe.rpframe").locator(".rpfoldbtn").first()
        .click({ timeout: 5000 });
      await p.waitForTimeout(900);
      await shoot(p, `02_legacy_section_${sz}`);

      await p.frameLocator("iframe.rpframe").locator("#apFold")
        .click({ timeout: 5000 });
      await p.waitForTimeout(900);
      await shoot(p, `03_legacy_appendix_${sz}`);
      await ctx.close();
    }

    /* ── 지금 판본. 같은 차례로 ────────────────────────────────── */
    const who = "v3shotA@example.com";
    const me = await makeStudent(who);
    const at = await cloneFinished(me.id, "PRO");
    if (!at) throw new Error("지금 판본 PRO 결과가 이 DB 에 없습니다");
    for (const [sz, vp] of Object.entries(SIZES)) {
      const ctx = await browser.newContext({ viewport: vp, ...extra });
      const p = await login(ctx, who, me.pw);
      await p.goto(`${BASE}/v3/${at}/result`, { waitUntil: "networkidle" });
      await p.waitForTimeout(800);
      await shoot(p, `04_v3_first_${sz}`);
      await p.locator(".rs-openbtn").click({ timeout: 5000 });
      await p.waitForTimeout(800);
      await shoot(p, `05_v3_detail_${sz}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n그림 ${seen.size + dup}장 · 겹침 ${dup}`);
  if (dup) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
