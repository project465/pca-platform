/**
 * **영역 훑기 화면을 손전화 세 폭에서 재어 본다**(SIGN-OFF §10).
 *
 * 구조를 바꾸지 않는 회차라 **재어서** 고칠 자리만 고른다: 질문과 보기
 * 사이의 거리 · 보기 한 칸의 높이 · 고른 칸이 또렷한가 · `모르겠다` 가
 * 척도 밖에 서는가 · 바닥 띠가 마지막 보기를 덮는가.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     npx tsx scripts/lab/interest-metrics.ts
 */
import { loadEnv, BASE, assertFreshServer, gateCreds, login } from "../_loop-fixture";
loadEnv();
import { chromium, type Page } from "playwright";
import { queryOne, query } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";
import { attemptOf, planFor, type V3Attempt } from "../../src/lib/me-v3/runtime/session";
import { enterAssessment } from "../_v3-walk";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const WIDTHS = (process.env.WIDTHS ?? "360,390,430").split(",").map(Number);

type Row = Record<string, unknown>;

async function measure(p: Page, label: string): Promise<void> {
  const m = await p.evaluate(() => {
    const out: Record<string, unknown> = {};
    const nav = document.querySelector<HTMLElement>(".qs-nav");
    out.navH = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
    const rows = [...document.querySelectorAll<HTMLElement>("fieldset.qs-opts, .qs-sweep-row")]
      .filter((e) => e.checkVisibility?.() !== false);
    out.rows = rows.length;
    /* **접힌 줄을 따로 센다**(FINAL POLISH §1). 펴진 질문이 하나이고
       나머지가 요약 한 줄이어야 한다. `display: none` 인 자리는 자리를
       돌려주지 않으므로 `checkVisibility` 로 가른다 */
    const sums = [...document.querySelectorAll<HTMLElement>(".qs-sum")]
      .filter((e) => e.checkVisibility?.() !== false);
    out.folded = sums.length;
    out.foldH = sums.map((e) => Math.round(e.getBoundingClientRect().height));
    out.foldPicked = sums.filter((e) => e.className.includes("is-done")).length;
    const now = document.querySelector<HTMLElement>(".qs-fold.is-now");
    out.nowTop = now ? Math.round(now.getBoundingClientRect().top) : null;
    const q = document.querySelector<HTMLElement>(".qs-q");
    const first = rows[0];
    if (q && first) {
      out.qBottom = Math.round(q.getBoundingClientRect().bottom);
      out.firstTop = Math.round(first.getBoundingClientRect().top);
      out.gapQtoOpts = Math.round(
        first.getBoundingClientRect().top - q.getBoundingClientRect().bottom);
    }
    const labels = [...document.querySelectorAll<HTMLElement>(
      "fieldset.qs-opts label, .qs-sweep label, .qs-opt")];
    const hs = labels.map((e) => Math.round(e.getBoundingClientRect().height))
      .filter((h) => h > 0);
    out.optCount = hs.length;
    out.optMin = hs.length ? Math.min(...hs) : 0;
    out.optMax = hs.length ? Math.max(...hs) : 0;
    const unk = [...document.querySelectorAll<HTMLElement>("*")]
      .filter((e) => e.children.length === 0 && /모르겠|잘 모르/.test(e.textContent ?? ""));
    out.unknown = unk.length;
    if (unk[0]) {
      const r = unk[0].getBoundingClientRect();
      const box = unk[0].closest("label,button") as HTMLElement | null;
      const br = (box ?? unk[0]).getBoundingClientRect();
      out.unknownH = Math.round(br.height);
      out.unknownW = Math.round(br.width);
      out.unknownX = Math.round(r.left);
    }
    out.docH = Math.round(document.documentElement.scrollHeight);
    out.winH = window.innerHeight;
    out.overflowX = document.documentElement.scrollWidth > window.innerWidth + 2;
    return out;
  });
  console.log(`  ${label}`, JSON.stringify(m));
  const between = await p.evaluate(() => {
    const q = document.querySelector<HTMLElement>(".qs-q");
    const first = document.querySelector<HTMLElement>("fieldset.qs-opts, .qs-sweep-row");
    if (!q || !first) return [];
    const qb = q.getBoundingClientRect().bottom;
    const ft = first.getBoundingClientRect().top;
    const out: string[] = [];
    for (const e of document.querySelectorAll<HTMLElement>("main *")) {
      if (!e.checkVisibility?.()) continue;
      const r = e.getBoundingClientRect();
      if (r.top >= qb - 1 && r.bottom <= ft + 1 && r.height > 0) {
        const cs = getComputedStyle(e);
        out.push(`${e.tagName.toLowerCase()}.${e.className || "-"} h${Math.round(r.height)}`
          + ` mt${cs.marginTop} mb${cs.marginBottom}`);
      }
    }
    return out.slice(0, 14);
  });
  for (const b of between) console.log(`      ${b}`);
}

/** 마지막 보기가 바닥 띠에 가리는가. 쪽 맨 아래까지 내려서 잰다 */
async function footerClash(p: Page): Promise<unknown> {
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(250);
  return p.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(".qs-nav");
    if (!nav) return { nav: false };
    const top = nav.getBoundingClientRect().top;
    const hidden: string[] = [];
    for (const e of document.querySelectorAll<HTMLElement>(
      "fieldset.qs-opts label, .qs-sweep label, .qs-opt, .qs-unknown")) {
      if (!e.checkVisibility?.()) continue;
      const r = e.getBoundingClientRect();
      if (r.bottom > top + 1) hidden.push(`${(e.textContent ?? "").slice(0, 14)}@${Math.round(r.bottom - top)}px`);
    }
    return { navTop: Math.round(top), covered: hidden.slice(0, 5), n: hidden.length };
  });
}

async function main(): Promise<void> {
  assertFreshServer();
  const u = university(UNI)!;
  const seat = allLeaves(u).find((r) => r.leaf.code === LEAF && coreOf(r.leaf)?.code === CORE)!;
  const sid = `zzim${Date.now().toString().slice(-8)}`;
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
  const stu = (await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [sid]))!;
  await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [stu.id]);

  const browser = await chromium.launch();
  const gate = gateCreds();
  try {
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: 760 },
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
      await enterAssessment(p);
      const a = (await attemptOf(att, stu.id)) as V3Attempt;
      const plan = await planFor(a);
      const grid = plan.screens.findIndex((s) => s.kind === "sweep");
      const quest = plan.screens.findIndex((s) => /^(judge|probe|deep|branch)-/.test(s.id));
      console.log(`\n== ${w}px  (훑기 ${grid} · 판단 ${quest})`);
      await p.goto(`${BASE}/v3/${att}?s=${grid}`, { waitUntil: "networkidle" });
      await measure(p, "훑기");
      /* 재어 놓고 보지 않으면 숫자만 늘어난다. 눈으로 읽을 그림을 같이 둔다 */
      if (process.env.SHOT) {
        const dir = process.env.SHOT;
        await p.screenshot({ path: `${dir}/interest-${w}-a.png`, fullPage: true });
        await p.locator(".qs-fold.is-now .qs-opt").nth(3).click({ force: true })
          .catch(() => undefined);
        await p.waitForTimeout(600);
        await p.screenshot({ path: `${dir}/interest-${w}-b.png`, fullPage: true });
      }
      if (process.env.TREE) {
        console.log(await p.evaluate(() => {
          const lines: string[] = [];
          const stack: Array<[Element, number]> = [];
          const m = document.querySelector("main") ?? document.body;
          for (let i = m.children.length - 1; i >= 0; i -= 1) stack.push([m.children[i], 0]);
          while (stack.length) {
            const [e, d] = stack.pop()!;
            const el = e as HTMLElement;
            if (!el.checkVisibility?.()) continue;
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            lines.push(`${"  ".repeat(d)}${el.tagName.toLowerCase()}.`
              + `${(el.className || "").toString().slice(0, 26)} y${Math.round(r.top)}`
              + ` h${Math.round(r.height)} mt${cs.marginTop} mb${cs.marginBottom}`
              + ` pt${cs.paddingTop} pb${cs.paddingBottom}`);
            if (d < 4) {
              for (let i = el.children.length - 1; i >= 0; i -= 1) stack.push([el.children[i], d + 1]);
            }
          }
          return lines.slice(0, 60).join("\n");
        }));
      }
      console.log("  훑기 바닥띠", JSON.stringify(await footerClash(p)));
      /* 고른 칸이 또렷한가. 고르기 전과 후의 면과 테와 굵기를 견준다 */
      await p.evaluate(() => window.scrollTo(0, 0));
      const before = await p.evaluate(() => {
        const e = document.querySelector<HTMLElement>(".qs-row .qs-opt");
        if (!e) return null;
        const c = getComputedStyle(e);
        const l = e.querySelector<HTMLElement>(".qs-label");
        const m = e.querySelector<HTMLElement>(".qs-mark");
        return { bg: c.backgroundColor, bd: c.borderTopColor, sh: c.boxShadow.slice(0, 44),
          lw: l ? getComputedStyle(l).fontWeight : "", mk: m ? getComputedStyle(m).backgroundColor : "" };
      });
      await p.locator(".qs-row .qs-opt").nth(1).click({ force: true }).catch(() => undefined);
      await p.waitForTimeout(400);
      const after = await p.evaluate(() => {
        const e = document.querySelectorAll<HTMLElement>(".qs-row .qs-opt")[1];
        if (!e) return null;
        const c = getComputedStyle(e);
        const l = e.querySelector<HTMLElement>(".qs-label");
        const m = e.querySelector<HTMLElement>(".qs-mark");
        return { bg: c.backgroundColor, bd: c.borderTopColor, sh: c.boxShadow.slice(0, 44),
          lw: l ? getComputedStyle(l).fontWeight : "", mk: m ? getComputedStyle(m).backgroundColor : "",
          on: e.className };
      });
      console.log("  고르기 전", JSON.stringify(before));
      console.log("  고른 뒤  ", JSON.stringify(after));
      await p.goto(`${BASE}/v3/${att}?s=${quest}`, { waitUntil: "networkidle" });
      await measure(p, "판단");
      console.log("  판단 바닥띠", JSON.stringify(await footerClash(p)));
      await ctx.close();
    }
  } finally { await browser.close(); }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
