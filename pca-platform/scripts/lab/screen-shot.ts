/**
 * **자리 하나를 폭 둘로 찍는다**(FINAL POLISH 검수용).
 *
 * 학교 계정을 그 자리에서 만들어 응시를 열고, `PATHS` 에 적은 주소를
 * 차례로 찍는다. `{id}` 는 그 응시 번호로 바뀐다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     PATHS=/v3/{id}/intro OUT=docs/metri/shots/polish TAG=intro \
 *     npx tsx scripts/lab/screen-shot.ts
 */
import { loadEnv, BASE, assertFreshServer, gateCreds, login } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { queryOne, query } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const OUT = process.env.OUT ?? "docs/metri/shots/polish";
const TAG = process.env.TAG ?? "shot";
const PATHS = (process.env.PATHS ?? "/v3/{id}/intro").split(",");
const WIDTHS = (process.env.WIDTHS ?? "1440,390").split(",").map(Number);

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const u = university(UNI)!;
  const seat = allLeaves(u).find((r) => r.leaf.code === LEAF && coreOf(r.leaf)?.code === CORE)!;
  const sid = `zzsh${Date.now().toString().slice(-8)}`;
  const org = (await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]))!;
  const actor = (await queryOne<{ user_id: string; role: string; org_id: number }>(
    `SELECT m.user_id::text, m.role, m.org_id FROM memberships m
      WHERE m.org_id = $1::bigint AND m.role IN ('org_admin','org_manager') LIMIT 1`,
    [org.id]))!;
  const st = await addStudentAccount(UNI, org.id, {
    student_id: sid, name: "검수용 학생", email: null, login_id: sid,
    college_code: seat.college.code, department_code: seat.leaf.code,
  }, { userId: actor.user_id, role: actor.role, orgId: Number(actor.org_id) });
  if (!st.ok || !st.password) throw new Error(`계정 발급 ${st.why ?? ""}`);
  await query(`UPDATE users SET is_demo = FALSE WHERE login_id = $1`, [sid]);

  const browser = await chromium.launch();
  const gate = gateCreds();
  try {
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: 900 },
        ...(gate ? { httpCredentials: gate } : {}),
      });
      const p = await login(ctx, sid, st.password);
      await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`,
        { waitUntil: "networkidle" });
      for (let t = 0; t < 2 && !/\/v3\//.test(p.url()); t += 1) {
        await p.locator('form button[type="submit"]').first().click({ timeout: 5000 })
          .catch(() => undefined);
        await p.waitForURL((x) => !/\/campus\//.test(new URL(x).pathname), { timeout: 20000 })
          .catch(() => undefined);
        await p.waitForLoadState("networkidle").catch(() => undefined);
      }
      if (/\/v3\/start/.test(p.url())) {
        await p.getByText("학부", { exact: true }).click({ timeout: 5000 }).catch(() => undefined);
        await p.getByRole("button", { name: "검사 시작" }).click({ timeout: 5000 })
          .catch(() => undefined);
        await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
      }
      const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
      if (!att) { console.log(`  ${w}px 응시가 열리지 않았습니다 ${p.url()}`); continue; }
      for (const raw of PATHS) {
        const path = raw.replace("{id}", att);
        await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
        const name = path.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
        const file = `${OUT}/${TAG}-${name}-${w}.png`;
        await p.screenshot({ path: file, fullPage: true });
        const h = await p.evaluate(() => document.documentElement.scrollHeight);
        console.log(`  ${w}px ${path} → ${file}  docH=${h}`);
      }
      await ctx.close();
    }
  } finally { await browser.close(); }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
