/**
 * **최종 BIZ 제출 그림 열둘**(BIZ FINAL COMMERCIAL SIGN-OFF §17).
 *
 * 규격이 이름을 댄 열둘만 찍는다. 더 찍지 않는 까닭은 **읽는 쪽이 보는
 * 수를 늘리면 어느 것을 보고 판정했는지가 흐려지기** 때문이다. 자리마다
 * 그 쪽이 맞는지를 **가르는 신호 하나**로 대조하고, 같은 그림이 두 이름으로
 * 저장되면 걸린다.
 *
 *   Start · Interest Desktop · Interest Mobile 390 · Experience ·
 *   Result Summary · Evidence Story · Action · /me ·
 *   PDF Cover · PDF Summary · PDF Experience · PDF Action
 *
 * **자리 목록을 주소로 열어 찍지 않는다**: 학과 자리에서 계정을 발급하고
 * 학교 길로 응시를 열어 실제로 누르면서 찍는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' PERSON=C \
 *     npx tsx scripts/pcu-signoff-shots.ts
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
import { walk, enterAssessment, pickOne } from "./_v3-walk";
import { PEOPLE, answerAll } from "./_v3-answer";
/* **보기 넷의 꼬리표를 글자로 적어 두지 않는다.** 적어 두면 화면이 그 말을
   한 번 고친 날 **멀쩡한 화면이 걸린다**(이 회차에 한 번 그랬다) */
import { OWNERSHIP_SHORT } from "../src/app/v3/tier-text";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const PERSON = process.env.PERSON ?? "C";
const OUT = process.env.OUT ?? "docs/metri/shots/signoff";

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  if (c) { pass += 1; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};
/** 손님 화면에 서면 안 되는 안쪽 코드 */
const CODE = /\bTD\d\d\b|\b[A-Z]{2,6}_CORE_V\d\b|\bSPEC_[A-Z_]+\b|\bPCU2[67]_[A-Z_]+\b|\bZ[1-4]_[A-Z_]+\b/;
const seen = new Map<string, string>();

/**
 * 그림 한 장.
 *
 * **그 자리라는 증거를 함께 센다**: 주소와 **가르는 신호 하나**다. 신호
 * 없이 찍으면 자리를 잘못 찾아 같은 쪽을 열두 번 찍어 두어도 아무것도
 * 걸리지 않는다(이 저장소에서 두 번 그랬다).
 */
async function snap(p: Page, id: string, mark: RegExp, full = true): Promise<void> {
  const file = `${OUT}/${id}.png`;
  await p.screenshot({ path: file, fullPage: full });
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  ok(`${id} 다른 자리와 같은 그림이 아니다`, !had, had ?? "");
  seen.set(sum, id);
  const body = (await p.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
  ok(`${id} 그 자리를 가르는 신호가 있다`, mark.test(body), String(mark));
  const hit = CODE.exec(body);
  ok(`${id} 안쪽 코드가 없다`, !hit, hit ? hit[0] : "");
  const over = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 2);
  ok(`${id} 가로로 밀리지 않는다`, !over);
}

/** 그 절의 머리로 옮겨 놓고 창을 찍는다. 학생이 실제로 보는 한 창이다 */
async function section(p: Page, id: string, head: RegExp, mark: RegExp): Promise<void> {
  const h = p.locator("h2, h3").filter({ hasText: head }).first();
  const found = await h.count();
  ok(`${id} 그 절을 찾는다`, Boolean(found), String(head));
  if (found) {
    const y = await h.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    await p.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }),
      Math.max(0, y - 70));
    await p.waitForTimeout(300);
  }
  await snap(p, id, mark, false);
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

  const sid = `zzso${Date.now().toString().slice(-8)}`;
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
      await p.waitForURL((x) => !/\/campus\//.test(new URL(x).pathname), { timeout: 20000 })
        .catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    if (/\/v3\/start/.test(p.url())) {
      await p.getByText("학부", { exact: true }).click({ timeout: 5000 }).catch(() => undefined);
      await p.getByRole("button", { name: "검사 시작" }).click({ timeout: 5000 })
        .catch(() => undefined);
      await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
    ok("응시가 학교 길로 열린다", Boolean(att), p.url());
    if (!att) return;

    /* ① Start — 검사 시작 안내 */
    await snap(p, "01-start", /이렇게 차례로 묻습니다|시작하기/);
    await enterAssessment(p);

    const a = (await attemptOf(att, stu.id)) as V3Attempt;
    const plan = await planFor(a);
    const grid = plan.screens.findIndex((s) => s.kind === "sweep");
    const quest = plan.screens.findIndex((s) => /^(judge|probe|deep|branch)-/.test(s.id));
    ok("찍을 자리를 찾는다", grid >= 0 && quest > grid, `${grid} · ${quest}`);
    if (grid < 0 || quest < 0) return;

    /* ② Interest Desktop */
    await p.goto(`${BASE}/v3/${att}?s=${grid}`, { waitUntil: "networkidle" });
    await snap(p, "02-interest-desktop", /관심|해 본 적/);

    /* ④ Experience — 보기 넷으로 받는 실제 판단. 고른 상태로 찍는다 */
    await p.goto(`${BASE}/v3/${att}?s=${quest}`, { waitUntil: "networkidle" });
    const rows = p.locator("fieldset.qs-opts");
    const n = await rows.count();
    for (let i = 0; i < n; i += 1) await pickOne(rows.nth(i), 2);
    await p.waitForTimeout(400);
    const own = new RegExp(OWNERSHIP_SHORT.map((x) =>
      x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
    await snap(p, "04-experience", own);

    /* ③ Interest Mobile 390 */
    const m = await ctx.newPage();
    await m.setViewportSize({ width: 390, height: 844 });
    await m.goto(`${BASE}/v3/${att}?s=${grid}`, { waitUntil: "networkidle" });
    await snap(m, "03-interest-mobile-390", /관심|해 본 적/);
    await m.close();

    /* 끝까지 답하고 제출한다 */
    const pol = PEOPLE.find((x) => x.id === PERSON);
    if (!pol) throw new Error(`사람 ${PERSON} 이 없습니다`);
    await answerAll(CORE, a, stu.id, pol);
    await p.goto(`${BASE}/v3/${att}`, { waitUntil: "networkidle" });
    for (let t = 0; t < 4 && !/\/(done|result)$/.test(p.url()); t += 1) {
      const btn = p.locator("button.qs-btn-main, a.qs-btn-main").first();
      if (!(await btn.count())) break;
      const was = p.url();
      await btn.click({ force: true }).catch(() => undefined);
      await p.waitForURL((x) => x.href !== was, { timeout: 30000 }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
    }
    ok("끝까지 답하고 제출한다", /\/(done|result)/.test(p.url()), p.url());

    /* ⑤ Result Summary — 첫 화면 넷 */
    await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    await snap(p, "05-result-summary", /확인된 경험[\s\S]*지금 할 일/, false);
    await openAll(p);
    await p.waitForTimeout(300);
    /* ⑥ Evidence Story — 네 단계 */
    await section(p, "06-evidence-story", /내가 이미 가진 근거/,
      /내가 한 일[\s\S]*내가 직접 정한 것[\s\S]*남아 있는 결과/);
    /* ⑦ Action */
    await section(p, "07-action", /다음에 할 일/, /다음에 할 일/);

    /* ⑧ /me */
    await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    await snap(p, "08-me", /지금 할 일/, false);

    /* ⑨~⑫ 종이 네 쪽 */
    const pdf = await ctx.request.get(`${BASE}/v3/${att}/result/pdf`);
    ok("종이가 뽑힌다", pdf.ok(), String(pdf.status()));
    if (pdf.ok()) {
      const f = `${OUT}/report.pdf`;
      writeFileSync(f, await pdf.body());
      const txt = execFileSync("pdftotext", [f, "-"], { encoding: "utf8" });
      const pages = txt.split("\f");
      ok("종이에 쪽이 선다", pages.length > 4, `${pages.length - 1}쪽`);
      /*
       * 쪽마다 무엇이 적혀 있는지로 이름을 붙인다. **쪽 번호를 짐작하지
       * 않는다**: 응답에 따라 절이 밀린다.
       *
       * **표지를 찾는 자리에서 뺀다.** 표지는 아홉 절의 차례를 적으므로
       * 절 이름이 전부 그 쪽에 있다. 그 쪽을 같이 보면 넷이 모두 1쪽으로
       * 잡히고, **같은 그림이 네 이름으로 저장된다**(한 번 그랬다).
       */
      const find = (re: RegExp, from = 1): number => {
        for (let i = from; i < pages.length; i += 1) {
          if (re.test(pages[i].replace(/\s+/g, " "))) return i + 1;
        }
        return 0;
      };
      const want: [string, number][] = [
        ["09-pdf-cover", 1],
        ["10-pdf-summary", find(/확인된 경험[\s\S]*지금 할 일/, 1)],
        ["11-pdf-experience", find(/내가 이미 가진 근거/, 1)],
        ["12-pdf-action", find(/지금 무엇부터 하면 되는가[\s\S]*다음에 할 일/, 1)],
      ];
      const nos = new Set<number>();
      for (const [id, no] of want) {
        ok(`${id} 그 쪽을 찾는다`, no > 0, String(no));
        ok(`${id} 다른 쪽과 같은 쪽이 아니다`, no > 0 && !nos.has(no), String(no));
        nos.add(no);
        if (no > 0) {
          execFileSync("pdftoppm",
            ["-png", "-r", "110", "-f", String(no), "-l", String(no), f, `${OUT}/${id}`]);
        }
      }
      console.log(`  종이 쪽 — ${want.map(([i, n]) => `${i}=${n}`).join(" · ")}`);
    }
  } finally {
    await ctx.close(); await browser.close();
    console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
    console.log(`그림은 ${OUT}/`);
  }
  if (bad.length) process.exit(1);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
