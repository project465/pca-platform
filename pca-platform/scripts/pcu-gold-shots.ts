/**
 * **Gold Master 묶음을 사람이 읽을 수 있게 찍는다**(PCU GOLD MASTER §21·§35).
 *
 * 한 Core(기본 `BIZ_CORE_V1` · 자리 `PCU26_BIZ`)를 **밟는 차례 그대로**
 * 지나며 열 자리를 Desktop(1440)과 Mobile(390) 두 벌로 찍고, 종이는
 * 쪽을 그림으로 떠 둔다. `TAG=before` 로 한 번, 고친 뒤 `TAG=after` 로
 * 한 번 찍어 **같은 자리끼리 나란히** 놓는 것이 이 하네스의 목적이다.
 *
 * **자리 목록을 주소로 열어 찍지 않는다.** 그렇게 찍으면 그 쪽의 상태가
 * 지난번 눌러 둔 것에 달려 있다. 학과 자리에서 계정을 발급하고 학교
 * 길로 응시를 열어 실제로 누르면서 찍는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' TAG=before \
 *     npx tsx scripts/pcu-gold-shots.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
} from "./_loop-fixture";
loadEnv();
import { chromium, type BrowserContext, type Page } from "playwright";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { addStudentAccount } from "../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../src/lib/campus/registry";
import { attemptOf, planFor, type V3Attempt } from "../src/lib/me-v3/runtime/session";
import { core as coreEntry } from "../src/lib/me-v3/core-registry";
import { walk, enterAssessment, pickOne } from "./_v3-walk";
import { PEOPLE, answerAll } from "./_v3-answer";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const TAG = process.env.TAG ?? "after";
/**
 * **결과를 읽으려면 결과가 있어야 한다**(GOLD MASTER §21).
 *
 * 눌러 보는 걸음은 보기를 흔들어 고르므로 경험이 거의 없는 응답이 되고,
 * 그 응시의 결과지는 `아직 없습니다` 로 가득 찬다. 그 그림으로는 `대학이
 * 학생에게 돈 주고 제공할 것인가` 를 가릴 수 없다. `PERSON=C` 를 주면
 * **검사 화면은 그대로 눌러서 찍고**, 남은 문항은 사람 셋의 규칙으로
 * 채운다(`_v3-answer.ts`, 콘텐츠 QA 가 쓰는 같은 자리). 지어낸 값이
 * 아니라 그 Core 의 체크리스트에서 세어 고른다
 */
const PERSON = process.env.PERSON ?? "";
const OUT = process.env.OUT ?? `docs/metri/shots/pcu-gold/${TAG}`;

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};
const CODE = /\bTD\d\d\b|\b[A-Z]{2,6}_CORE_V\d\b|\bSPEC_[A-Z_]+\b|\bPCU2[67]_[A-Z_]+\b|\bZ[1-4]_[A-Z_]+\b/;
const seen = new Map<string, string>();

/** 그림 한 장. 지문이 겹치면(같은 자리를 두 번 찍었으면) 걸린다 */
async function snap(p: Page, id: string, full = false): Promise<void> {
  const file = `${OUT}/${id}.png`;
  await p.screenshot({ path: file, fullPage: full });
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  ok(`${id} 다른 자리와 같은 그림이 아니다`, !had, had ?? "");
  seen.set(sum, id);
  const body = (await p.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
  const hit = CODE.exec(body);
  ok(`${id} 안쪽 코드가 없다`, !hit, hit ? hit[0] : "");
  const over = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 2);
  ok(`${id} 가로로 밀리지 않는다`, !over);
}

/** 그 절의 머리로 옮겨 놓고 창을 찍는다. 학생이 실제로 보는 한 창이다 */
async function section(p: Page, id: string, head: RegExp): Promise<void> {
  /* **`scrollIntoViewIfNeeded` 로는 모자란다.** 그 머리가 이미 창 안에
     들어와 있으면 아무것도 하지 않아서, 절을 가리킨 그림 둘이 첫 화면과
     바이트까지 같게 저장된다(한 번 그렇게 찍혔다). 머리의 자리를 재서
     그 자리로 옮긴다 */
  const h = p.locator("h2, h3").filter({ hasText: head }).first();
  const found = await h.count();
  ok(`${id} 그 절을 찾는다`, Boolean(found), String(head));
  if (found) {
    const y = await h.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    await p.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }),
      Math.max(0, y - 80));
    await p.waitForTimeout(300);
  }
  await snap(p, id);
}

/** 접는 자리를 전부 편다. 단추를 눌러야 열리는 React 상태다 */
async function openAll(p: Page): Promise<void> {
  const SHUT = 'button.rs-openbtn[aria-expanded="false"],'
    + ' button.rs-discbtn[aria-expanded="false"],'
    + ' button.rs-foldbtn[aria-expanded="false"]';
  for (let r = 0; r < 8; r += 1) {
    const hit = await p.$$eval(SHUT, (els) => {
      for (const e of els) (e as HTMLButtonElement).click();
      return els.length;
    }).catch(() => 0);
    if (!hit) break;
    await p.waitForTimeout(220);
  }
}

async function main(): Promise<void> {
  assertFreshServer();
  assertPreviewServer(CORE);
  mkdirSync(OUT, { recursive: true });
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);
  const seat = allLeaves(u).find(
    (r) => r.leaf.code === LEAF && coreOf(r.leaf)?.code === CORE);
  if (!seat) throw new Error(`${LEAF} 자리가 ${CORE} 를 가리키지 않습니다`);
  const name = coreEntry(CORE).name_ko;

  const sid = `zzgm${Date.now().toString().slice(-8)}`;
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error("PCU 기관 줄이 없습니다 (npm run pcu:org)");
  const actor = await queryOne<{ user_id: string; role: string; org_id: number }>(
    `SELECT m.user_id::text, m.role, m.org_id FROM memberships m
      WHERE m.org_id = $1::bigint AND m.role IN ('org_admin','org_manager')
      LIMIT 1`, [org.id]);
  if (!actor) throw new Error("PCU 담당자 줄이 없습니다 (npm run pcu:org)");
  const st = await addStudentAccount(UNI, org.id, {
    student_id: sid, name: "검수용 학생", email: null, login_id: sid,
    college_code: seat.college.code, department_code: seat.leaf.code,
  }, { userId: actor.user_id, role: actor.role, orgId: Number(actor.org_id) });
  if (!st.ok || !st.password) throw new Error(`계정 발급 ${st.why ?? ""}`);
  const stu = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [sid]);
  if (!stu) throw new Error("발급한 계정을 찾지 못했습니다");
  await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [stu.id]);

  const browser = await chromium.launch();
  const gate = gateCreds();
  const ctx: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...(gate ? { httpCredentials: gate } : {}),
  });
  try {
    const p = await login(ctx, sid, st.password);
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`,
      { waitUntil: "networkidle" });
    for (let t = 0; t < 2 && !/\/v3\//.test(p.url()); t += 1) {
      await p.locator('form button[type="submit"]').first().click({ timeout: 5000 })
        .catch(() => undefined);
      await p.waitForURL((x) => !/\/campus\//.test(new URL(x).pathname),
        { timeout: 20000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (/\/v3\/start/.test(p.url())) {
      await p.getByText("학부", { exact: true }).click({ timeout: 5000 })
        .catch(() => undefined);
      await p.getByRole("button", { name: "검사 시작" }).click({ timeout: 5000 })
        .catch(() => undefined);
      await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
    ok(`${name} 응시가 학교 길로 열린다`, Boolean(att), p.url());
    if (!att) return;

    /* ① 검사 시작 안내 */
    await snap(p, "01-start", true);
    await enterAssessment(p);

    const a = (await attemptOf(att, stu.id)) as V3Attempt;
    const plan = await planFor(a);
    const grid = plan.screens.findIndex((s) => s.kind === "sweep");
    const quest = plan.screens.findIndex((s) => /^(judge|probe|deep|branch)-/.test(s.id));
    ok(`${name} 찍을 자리를 찾는다`, grid >= 0 && quest > grid, `${grid} · ${quest}`);

    /* ② Interest(영역 훑기) · ③ Experience(보기 넷) · ④ 고른 뒤 */
    await p.goto(`${BASE}/v3/${att}?s=${grid}`, { waitUntil: "networkidle" });
    await snap(p, "02-interest", true);
    await p.goto(`${BASE}/v3/${att}?s=${quest}`, { waitUntil: "networkidle" });
    await snap(p, "03-experience", true);
    const rows = p.locator("fieldset.qs-opts");
    const n = await rows.count();
    for (let i = 0; i < n; i += 1) await pickOne(rows.nth(i), 2);
    await p.waitForTimeout(500);
    await snap(p, "04-selected", true);

    /* 끝까지 답하고 제출한다 */
    let done: boolean; let how: string;
    if (PERSON) {
      const pol = PEOPLE.find((x) => x.id === PERSON);
      if (!pol) throw new Error(`사람 ${PERSON} 이 없습니다`);
      await answerAll(CORE, a, stu.id, pol);
      await p.goto(`${BASE}/v3/${att}`, { waitUntil: "networkidle" });
      for (let t = 0; t < 3 && !/\/(done|result)$/.test(p.url()); t += 1) {
        const btn = p.locator("button.qs-btn-main, a.qs-btn-main").first();
        if (!(await btn.count())) break;
        const was = p.url();
        await btn.click({ force: true }).catch(() => undefined);
        await p.waitForURL((u) => u.href !== was, { timeout: 30000 })
          .catch(() => undefined);
        await p.waitForLoadState("networkidle").catch(() => undefined);
      }
      done = /\/(done|result)/.test(p.url());
      how = `사람 ${pol.id} · ${pol.name}`;
    } else {
      const out = await walk(p, plan.screens.length + 20);
      done = out.done; how = `${out.screens}화면`;
    }
    ok(`${name} 끝까지 답하고 제출한다`, done, how);

    /* ⑤~⑦ 결과 */
    await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await snap(p, "05-result-hero");
    await openAll(p);
    await p.waitForTimeout(300);
    await section(p, "06-result-evidence", /내가 이미 가진 근거|근거가 어디에/);
    await section(p, "07-result-action", /다음에 할 일/);
    await snap(p, "08-result-full", true);

    /* ⑧⑨ 종이 — 쪽을 그림으로 뜬다 */
    const pdf = await ctx.request.get(`${BASE}/v3/${att}/result/pdf`);
    ok(`${name} 종이가 뽑힌다`, pdf.ok(), String(pdf.status()));
    if (pdf.ok()) {
      const f = `${OUT}/09-report.pdf`;
      writeFileSync(f, await pdf.body());
      const txt = execFileSync("pdftotext", [f, "-"], { encoding: "utf8" });
      const pages = txt.split("\f");
      ok(`${name} 종이에 쪽이 선다`, pages.length > 2, `${pages.length - 1}쪽`);
      execFileSync("pdftoppm", ["-png", "-r", "110", "-f", "1", "-l", "4", f, `${OUT}/09-report`]);
    }

    /* ⑩ 작업공간 */
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    await snap(p, "10-me", true);

    /* 손전화 — 규격 §31 이 이름을 댄 다섯 */
    const m = await ctx.newPage();
    await m.setViewportSize({ width: 390, height: 844 });
    for (const [id, url] of [
      ["m1-interest", `/v3/${att}?s=${grid}`],
      ["m2-experience", `/v3/${att}?s=${quest}`],
      ["m3-result", `/v3/${att}/result`],
      ["m4-me", "/me"],
    ] as const) {
      await m.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      await snap(m, id, true);
    }
    await m.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await openAll(m);
    await m.waitForTimeout(300);
    await snap(m, "m5-result-detail", true);
  } finally {
    await ctx.close(); await browser.close();
    await query(`DELETE FROM users WHERE id = $1::bigint`, [stu.id])
      .catch(() => undefined);
  }

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  console.log(`  그림 — ${OUT}`);
  if (bad.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
