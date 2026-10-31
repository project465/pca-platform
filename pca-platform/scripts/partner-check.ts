/**
 * 잡인더스트리 입구를 실제 브라우저로 끝까지 누른다(2026-10-30).
 *
 *   npm run build && bash scripts/stage-serve.sh 3150
 *   PARTNER_BASE=http://127.0.0.1:3150 npm run partner:check
 *
 * **올리기 전의 DB 에서도 돌린다.** `db:upgrade` 는 대표가 Railway 에서
 * 따로 누르므로, 새 코드가 먼저 서고 DB 가 나중에 오는 몇 시간이 생긴다.
 * 그 사이에 가입이 멈추면 안 되므로, `brand_touches` 표가 없는 DB 에 붙은
 * 서버에서도 같은 검사를 지나야 한다(표가 없으면 기록 칸만 건너뛴다).
 */
import { readFileSync } from "node:fs";
for (const line of (() => { try { return readFileSync(".env.local", "utf8").split("\n"); } catch { return []; } })()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
/* eslint-disable import/first */
import { chromium } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { PARTNERS_PUBLIC } from "../src/lib/brand";

const BASE = process.env.PARTNER_BASE ?? "http://127.0.0.1:3150";
const OUT = process.env.PARTNER_SHOTS ?? "";
let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

async function main(): Promise<void> {
  /* 제휴를 내려 둔 동안(`PARTNERS_PUBLIC`)에는 닫혀 있는지만 센다. 로그인하지 않은 손님은
     제휴 사이트 첫 화면으로 돌아가고, 입구 쿠키가 심기지 않아야 한다 */
  if (!PARTNERS_PUBLIC) {
    for (const [b, home] of [["jobindustry", "https://www.jobindustry.co.kr"], ["careerpeak", "https://www.careerpeak.co.kr"]] as const) {
      const f = await fetch(`${BASE}/from/${b}`, { redirect: "manual" });
      ok(`[닫힘] /from/${b} 는 ${home} 로 돌려보낸다`, f.status === 302 && f.headers.get("location") === home, `${f.status} ${f.headers.get("location")}`);
      ok(`[닫힘] /from/${b} 는 입구 쿠키를 심지 않는다`, !/cm_brand/.test(f.headers.get("set-cookie") ?? ""));
      const p = await fetch(`${BASE}/partner/${b}`, { redirect: "manual" });
      ok(`[닫힘] /partner/${b} 는 ${home} 로 돌려보낸다`, [302, 303, 307, 308].includes(p.status) && (p.headers.get("location") ?? "").startsWith(home), `${p.status} ${p.headers.get("location")}`);
    }
    console.log(bad ? `\n걸림 ${bad}` : "\n제휴 화면 닫힘 OK");
    process.exit(bad ? 1 : 0);
  }
  const hasTable = Boolean((await queryOne<{ t: string | null }>(
    `SELECT to_regclass('public.brand_touches')::text AS t`, []))?.t);
  console.log(`  DB: brand_touches 표 ${hasTable ? "있음 (올린 뒤)" : "없음 (올리기 전)"}`);

  /* 1 · 2 — 넘겨주는 자리 */
  const r1 = await fetch(`${BASE}/from/jobindustry`, { redirect: "manual" });
  ok("/from/jobindustry 가 제휴 쪽으로 넘긴다", r1.status === 302
    && r1.headers.get("location") === "/partner/jobindustry", `${r1.status} ${r1.headers.get("location")}`);
  ok("입구 쿠키를 심는다", /cm_brand=jobindustry/.test(r1.headers.get("set-cookie") ?? ""));
  /* 커리어피크도 같은 틀이다. 이름은 MAT 그대로 쓴다 */
  const rc = await fetch(`${BASE}/from/careerpeak`, { redirect: "manual" });
  ok("/from/careerpeak 가 제휴 쪽으로 넘긴다", rc.status === 302
    && rc.headers.get("location") === "/partner/careerpeak"
    && /cm_brand=careerpeak/.test(rc.headers.get("set-cookie") ?? ""), `${rc.status} ${rc.headers.get("location")}`);
  const cp = await (await fetch(`${BASE}/partner/careerpeak`)).text();
  ok("커리어피크 쪽 제목이 커리어피크 AI 취업 비서이고 '석·박사 자료' 를 말한다",
    cp.includes("커리어피크 AI 취업 비서") && cp.includes("논문") && cp.includes("AI 취업 비서가 하는 일") && !cp.includes("AI 취업 도우미"));
  ok("커리어피크 쪽이 연구자 흐름(한 장 요약 → 연구직 · R&D 공고 → 커리어피크 상담)을 말한다",
    cp.includes("한 장 요약") && cp.includes("R&amp;D 공고") && cp.includes("커리어피크 상담으로 이어집니다")
    && cp.includes("자료 올리기로 시작하기") && cp.includes("next=%2Fme%2Ftrack%2Fresearch"));
  /* 잡인더스트리에서 남은 `cm_job` 쿠키가 있어도 커리어피크 쪽은 "보던 공고" 를 말하지 않는다 */
  const cpJob = await (await fetch(`${BASE}/partner/careerpeak`, {
    headers: { cookie: "cm_job=https%3A%2F%2Fwww.jobindustry.co.kr%2F487%2F%3Fbmode%3Dview%26idx%3D1" },
  })).text();
  ok("커리어피크 쪽에는 잡인더스트리 '보던 공고' 안내가 없다", !cpJob.includes("보던 공고") && !cpJob.includes("기억해 두었습니다"));
  const r2 = await fetch(`${BASE}/from/nope`, { redirect: "manual" });
  ok("모르는 이름은 홈으로 보내고 쿠키를 심지 않는다", r2.status === 302
    && r2.headers.get("location") === "/" && !/cm_brand/.test(r2.headers.get("set-cookie") ?? ""));

  const email = `zz-ji-${Date.now()}@example.test`;
  const b = await chromium.launch();
  try {
    for (const [name, vp] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const) {
      const ctx = await b.newContext({ viewport: vp });
      const p = await ctx.newPage();
      const errs: string[] = [];
      p.on("pageerror", (e) => errs.push(String(e)));
      await p.goto(`${BASE}/from/jobindustry`, { waitUntil: "networkidle" });
      ok(`[${name}] 단추를 누르면 제휴 쪽이 열린다`, p.url().endsWith("/partner/jobindustry"), p.url());
      const h1 = (await p.locator("h1").first().innerText().catch(() => "")).trim();
      ok(`[${name}] 제목이 잡인더스트리 AI 취업 도우미다`, h1 === "잡인더스트리 AI 취업 도우미", h1);
      const body = await p.locator("body").innerText();
      ok(`[${name}] 1년권·365 가 없다`, !/365|1년|연간|12개월|6개월/.test(body));
      ok(`[${name}] 합격을 약속하지 않는다`, !/합격 보장|합격을 보장|합격률/.test(body));
      const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`[${name}] 가로 스크롤이 없다`, sx <= 0, String(sx));
      if (OUT) await p.screenshot({ path: `${OUT}/partner__${name}.png`, fullPage: true });
      if (name === "mobile") { ok(`[${name}] 브라우저 오류가 없다`, errs.length === 0, errs[0] ?? ""); await ctx.close(); continue; }

      /* 3 — 그 길로 가입한다 */
      await p.getByRole("link", { name: "무료 검사로 시작하기" }).click();
      await p.waitForURL(/\/signup/);
      await p.fill("input[name=name]", "잡인더스트리 시험");
      await p.fill("input[name=email]", email);
      await p.fill("input[name=password]", "Ji-check-2026!");
      for (const c of await p.locator("input[name=consent]").all()) await c.check();
      await Promise.all([p.waitForURL((u) => !/\/signup/.test(u.pathname), { timeout: 30000 }),
        p.locator("form button[type=submit]").first().click()]);
      const u = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE email = $1`, [email]);
      ok("[desktop] 가입이 끝까지 간다", Boolean(u), p.url());
      if (hasTable && u) {
        const row = await queryOne<{ n: string }>(
          `SELECT count(*)::text n FROM brand_touches WHERE user_id = $1 AND brand = 'jobindustry'`, [u.id]);
        ok("[desktop] 잡인더스트리로 들어왔다고 한 줄 남는다", row?.n === "1", row?.n);
      }

      /* 4 — MAT 머리에 입구 이름이 선다 */
      await p.goto(`${BASE}/me/track`, { waitUntil: "networkidle" });
      const t = await p.locator("body").innerText();
      ok("[desktop] MAT 이 열린다", /MAT/.test(t) && !/오류|문제가 생겼/.test(t));
      ok("[desktop] MAT 머리에 잡인더스트리 한 줄이 선다", t.includes("잡인더스트리 AI 취업 도우미로 들어오셨습니다"));
      if (OUT) await p.screenshot({ path: `${OUT}/partner-mat__${name}.png`, fullPage: false });
      ok("[desktop] 브라우저 오류가 없다", errs.length === 0, errs[0] ?? "");
      await ctx.close();
      if (u) await query(`DELETE FROM users WHERE id = $1`, [u.id]).catch(() => undefined);
    }
  } finally {
    await b.close();
  }
  console.log(bad ? `\n걸림 ${bad}` : "\n잡인더스트리 입구 OK");
  process.exit(bad ? 1 : 0);
}

void main();
