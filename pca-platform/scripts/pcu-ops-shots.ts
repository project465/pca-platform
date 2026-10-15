/**
 * 담당자 화면을 **밟는 차례 그대로** 찍는다.
 *
 * 자리 목록을 주소로 열어 찍으면 그 쪽이 어떤 상태인지는 지난번 누군가가
 * 눌러 둔 상태에 달려 있다. 그래서 로그인해서 집계 → 좁혀 보기 → 명단 →
 * CSV 등록 → 운영 요약까지 한 사람이 이어서 지난다.
 *
 * 찍으면서 셋을 센다: 가로로 밀리는가 · 안쪽 코드가 손님 화면에 서는가 ·
 * 브라우저 오류가 나는가.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/pcu-ops-shots.ts
 */
import { loadEnv, BASE, assertFreshServer, gateCreds, login } from "./_loop-fixture";
loadEnv();
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { clearCampusCohort, seedCampusCohort } from "./_campus-fixture";

const OUT = process.env.OUT ?? "docs/metri/shots/pcu-ops";
const WIDE = { width: 1440, height: 900 };
const NARROW = { width: 390, height: 844 };

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

/** 안쪽 코드가 담당자 화면에 서면 읽는 사람이 집계가 깨진 줄로 본다 */
const CODES = [/\bZ[1-5]_[A-Z]/, /\bNOT_EXPLORED\b/, /\bTD\d{2}\b/,
  /\bPCU2[67]_[A-Z]/, /_CORE_V\d/];

async function shoot(p: Page, name: string, tag: string): Promise<void> {
  await p.waitForLoadState("networkidle").catch(() => undefined);
  mkdirSync(OUT, { recursive: true });
  await p.screenshot({ path: path.join(OUT, `${name}-${tag}.png`), fullPage: true });
  const over = await p.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth);
  ok(`${name} ${tag} — 가로로 밀리지 않는다`, over <= 1, `${over}px`);
  const body = await p.evaluate(() => document.body.innerText);
  const hit = CODES.filter((re) => re.test(body)).map(String);
  ok(`${name} ${tag} — 안쪽 코드가 없다`, !hit.length, hit.join(" "));
}

async function main(): Promise<void> {
  assertFreshServer();
  const name = "zzops-staff";
  const pw = "ops-" + Math.random().toString(36).slice(2, 12);
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = 'PCU'`);
  if (!org) throw new Error("PCU 기관 줄이 없습니다 (npm run pcu:org)");
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [name]);
  const hash = await hashPassword(pw);
  let id = old?.id;
  if (id) {
    await query(`UPDATE users SET password_hash = $2, status='active' WHERE id = $1`,
      [id, hash]);
    await query(`DELETE FROM memberships WHERE user_id = $1`, [id]);
  } else {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'학과 담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [name, hash]);
    id = row?.id as string;
  }
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'org_admin')`,
    [id, org.id]);

  /* **빈 화면을 찍어 두지 않는다.** 명단과 응시가 비어 있으면 KPI 가
     전부 0 이고 표가 한 줄도 서지 않아, 그 그림으로는 담당자가 무엇을
     보는지 알 수 없다. 바탕은 내려받기 검사와 **같은 묶음**을 쓴다 */
  const cohort = await seedCampusCohort("PCU", "ops");

  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    for (const [tag, vp] of [["desktop", WIDE], ["mobile", NARROW]] as const) {
      const ctx = await browser.newContext({
        viewport: vp, deviceScaleFactor: 2,
        ...(gate ? { httpCredentials: gate } : {}),
      });
      const errs: string[] = [];
      const p = await login(ctx, name, pw);
      p.on("pageerror", (e) => errs.push(e.message.split("\n")[0]));

      await p.goto(`${BASE}/org/v3`, { waitUntil: "domcontentloaded" });
      await shoot(p, "01-insights", tag);
      /* 좁혀 보기를 **눌러서** 지난다. 주소로 열면 폼이 실제로 보내지는지
         알 수 없다 */
      const col = await p.locator('select[name="college"] option').nth(1)
        .getAttribute("value");
      if (col) {
        await p.selectOption('select[name="college"]', col);
        await p.click('form[action="/org/v3"] button[type="submit"]');
        await p.waitForLoadState("domcontentloaded");
        ok(`좁혀 보기가 주소에 적힌다 (${tag})`, p.url().includes("college="), p.url());
        await shoot(p, "02-insights-narrowed", tag);
      }

      await p.goto(`${BASE}/org/v3/students`, { waitUntil: "domcontentloaded" });
      await shoot(p, "03-students", tag);
      await p.goto(`${BASE}/org/v3/students/import`, { waitUntil: "domcontentloaded" });
      await shoot(p, "04-import", tag);
      await p.goto(`${BASE}/org/v3/report`, { waitUntil: "domcontentloaded" });
      await shoot(p, "05-report", tag);
      ok(`브라우저 오류가 없다 (${tag})`, !errs.length, errs.slice(0, 2).join(" | "));
      await ctx.close();
    }
  } finally {
    await browser.close();
    await clearCampusCohort(cohort.logins);
  }
  console.log(`\n그림을 ${OUT} 에 두었습니다`);
  console.log(`확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) process.exit(1);
}
void main();
