/**
 * **R31 · 실제 브라우저 E2E.** 학교가 발급한 BIZ 학생 계정 하나로 로그인 →
 * 학과 진입 → 검사 시작 → **모든 문항을 실제로 눌러** 답하고 → 제출 →
 * 결과 생성 → 결과 화면의 값과 굳은 결과 모델을 대조 → PDF 를 실제로 내려받아
 * 쪽마다 그림으로 뜨고 글자를 꺼내 결과 화면과 대조 → 손전화 폭에서도
 * 내려받고 → 다른 학생이 그 PDF 와 결과를 열 수 없는지 본다.
 *
 * **API 로 답을 채우지 않는다**(`answerAll` 을 쓰지 않는다). 그래서 응답은
 * `walk()` 가 화면 차례로 조금씩 흔들어 고른 값이고, 결과지에 근거가 많이
 * 서지는 않는다. 묻는 것은 **길이 끊기지 않는가**와 **화면 · 모델 · 종이가 같은
 * 값을 적는가**다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     CORE=BIZ_CORE_V1 LEAF=PCU26_BIZ OUT=docs/metri/review/r31/e2e \
 *     npx tsx scripts/lab/r31-e2e.ts
 *
 * 쓴 계정은 **지우지 않는다**(`KEEP=1` 기본): 같은 응시를 R31-3 캡처가 다시
 * 연다. 아이디만 적고 비밀번호는 어디에도 적지 않는다.
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
  makeStudent,
} from "../_loop-fixture";
loadEnv();
import { chromium, type Page } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { addStudentAccount } from "../../src/lib/campus/manage";
import { allLeaves, coreOf, university } from "../../src/lib/campus/registry";
import { domainName, latestResult } from "../../src/lib/me-v3/runtime/session";
import { enterAssessment, walk } from "../_v3-walk";
import { headlineKo } from "../../src/lib/me-v3/result/text.ko";
import { studentStateView } from "../../src/lib/me-v3/student";
import type { Zone } from "../../src/lib/me-v3/scoring/types";

const UNI = "PCU";
const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const OUT = process.env.OUT ?? "var/r31/e2e";
const INNER = new RegExp(`${CORE}|\\bTD\\d\\d\\b|\\bJ[1-8]\\b|INDUSTRY_|ROLE_`);

let pass = 0; const bad: string[] = []; const rows: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  const line = `${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`;
  (c ? pass++ : bad.push(w)); rows.push(line); console.log("  " + line);
};
const note = (w: string): void => { rows.push(`적어둠  ${w}`); console.log(`  적어둠  ${w}`); };

async function main(): Promise<void> {
  assertFreshServer();
  assertPreviewServer(CORE);
  mkdirSync(`${OUT}/pdf`, { recursive: true });
  const u = university(UNI);
  if (!u) throw new Error("등록부에 PCU 가 없습니다");
  const seat = allLeaves(u).find(
    (r) => r.leaf.code === LEAF && coreOf(r.leaf)?.code === CORE);
  if (!seat) throw new Error(`${LEAF} 자리가 ${CORE} 를 가리키지 않습니다`);

  /* 1. 학교가 발급한 계정. **운영과 같은 함수**로 만든다 */
  const sid = `zzr31e${Date.now().toString().slice(-7)}`;
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error("PCU 기관 줄이 없습니다");
  const actor = await queryOne<{ user_id: string; role: string; org_id: number }>(
    `SELECT m.user_id::text, m.role, m.org_id FROM memberships m
      WHERE m.org_id = $1::bigint AND m.role IN ('org_admin','org_manager') LIMIT 1`,
    [org.id]);
  if (!actor) throw new Error("PCU 담당자 줄이 없습니다");
  const st = await addStudentAccount(UNI, org.id, {
    student_id: sid, name: "E2E 학생", email: null, login_id: sid,
    college_code: seat.college.code, department_code: seat.leaf.code,
  }, { userId: actor.user_id, role: actor.role, orgId: Number(actor.org_id) });
  if (!st.ok || !st.password) throw new Error(`계정 발급 ${st.why ?? ""}`);
  const stu = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [sid]);
  if (!stu) throw new Error("발급한 계정을 찾지 못했습니다");
  await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [stu.id]);
  ok("학교가 발급한 학생 계정으로 시작한다", true, `아이디 ${sid}`);

  const browser = await chromium.launch();
  const gate = gateCreds();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, acceptDownloads: true,
    ...(gate ? { httpCredentials: gate } : {}),
  });
  const errs: string[] = [];
  let att = "";
  try {
    /* 2. 로그인 → 학과 상세 → 검사 시작 (실제 클릭) */
    const p: Page = await login(ctx, sid, st.password);
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
    p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
    ok("브라우저에서 로그인된다", !/\/login/.test(p.url()), new URL(p.url()).pathname);
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`,
      { waitUntil: "networkidle" });
    const detail = await p.locator("body").innerText();
    ok("학과 상세가 그 학과 이름을 적는다", detail.includes(seat.leaf.name), seat.leaf.name);
    await p.getByRole("button", { name: "검사 시작하기" }).click();
    await p.waitForURL(/\/v3\/start/, { timeout: 30000 });
    await p.waitForLoadState("networkidle");
    await p.getByText("학부", { exact: true }).click();
    await p.getByRole("button", { name: "검사 시작" }).click();
    await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    await enterAssessment(p);
    att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
    ok("응시가 열린다", !!att, new URL(p.url()).pathname);
    if (!att) throw new Error("응시가 열리지 않았습니다");
    const arow = await queryOne<{ core_code: string; tier: string; department_code: string | null }>(
      `SELECT core_code, tier, department_code FROM v3_attempts WHERE id = $1`, [att]);
    ok("응시 줄이 이 Core 와 학과를 든다",
      arow?.core_code === CORE && arow?.department_code === seat.leaf.code,
      `${arow?.core_code} · ${arow?.department_code}`);
    ok("학교 진입은 등급을 고르지 않고 PRO 로 선다 (Campus PRO 계약)",
      arow?.tier === "PRO", `${arow?.tier}`);

    /* 3. 모든 문항을 실제로 눌러 끝까지.
       **걸음에 시간 예산을 둔다.** 한 번은 제출까지 끝나고 `scored` 로 굳은
       뒤에 마지막 이동의 `networkidle` 이 돌아오지 않아 스무 분을 멈춰 섰다
       (결과 쪽은 `Link` 미리 불러오기로 조용해지지 않는 때가 있다). 걸음이
       돌아오지 않으면 **DB 가 적은 상태**로 이어 간다: 답은 서버에 있다 */
    p.setDefaultTimeout(20000); p.setDefaultNavigationTimeout(45000);
    const t0 = Date.now();
    const w = await Promise.race([
      walk(p, 400),
      new Promise<null>((r) => setTimeout(() => r(null), 14 * 60 * 1000)),
    ]);
    const stt = await queryOne<{ status: string; screen: string | null }>(
      `SELECT status, current_screen AS screen FROM v3_attempts WHERE id = $1`, [att]);
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    if (w) ok("모든 화면을 눌러 끝까지 간다", w.done, `화면 ${w.screens} · ${mins}분`);
    else note(`걸음이 14분 안에 돌아오지 않았다 — DB 상태 ${stt?.status} / ${stt?.screen} 로 이어 간다`);
    ok("응시가 제출돼 채점됐다", stt?.status === "scored", `${stt?.status} · 화면 ${stt?.screen}`);
    const answers = Number((await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1`, [att]))?.n ?? 0);
    ok("답이 서버에 쌓인다", answers > 30, `${answers}개`);
    const landed = new URL(p.url()).pathname;
    ok("제출 뒤 완료 브리지나 결과에 선다", /\/(done|result)$/.test(landed), landed);
    await p.close().catch(() => undefined);
    /* 결과 쪽은 **본문이 섰는지**로 기다린다. `networkidle` 은 여기서 영원히
       오지 않을 수 있다 */
    const open = async (url: string): Promise<Page> => {
      const q = await ctx.newPage();
      q.setDefaultTimeout(20000);
      q.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
      q.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
      await q.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await q.locator("h1").first().waitFor({ timeout: 20000 }).catch(() => undefined);
      await q.waitForTimeout(600);
      return q;
    };

    /* 4. 결과가 만들어졌다 — 굳은 결과 모델 */
    const model = await latestResult(att);
    ok("결과 모델이 굳어 있다", !!model, model ? `영역 ${model.domains.length}` : "없다");
    if (!model) throw new Error("결과 모델이 없습니다");
    const name = (td: string) => domainName(CORE, td);
    const head = headlineKo(model, name);
    const zoneOf: Record<string, Zone> = {};
    for (const d of model.domains) zoneOf[d.code] = d.zone;
    const view = studentStateView(CORE, model, zoneOf, 3);
    const sumC = model.domains.reduce((s, d) => s + d.confirmed.length, 0);
    const sumO = model.domains.reduce((s, d) => s + d.owned.length, 0);

    /* 5. 결과 화면과 대조 */
    const rp = await open(`${BASE}/v3/${att}/result`);
    const fold = rp.locator("button.rs-foldbtn, button.rs-more, button.rs-openbtn, button.rs-discbtn, .rs-disc > summary");
    for (let i = 0; i < await fold.count(); i += 1) await fold.nth(i).click({ timeout: 3000 }).catch(() => undefined);
    await rp.waitForTimeout(400);
    const body = await rp.locator("body").innerText();
    const h1 = (await rp.locator("h1").first().innerText().catch(() => "")).trim();
    ok("결과 화면의 머리글이 모델에서 만든 글과 같다", h1 === head.title,
      `화면 "${h1.slice(0, 30)}" / 모델 "${head.title.slice(0, 30)}"`);
    const tilesOn = view.tiles.filter((t) => body.includes(name(t.code)) && body.includes(t.sub));
    ok("현재 상태 카드 셋이 화면에 그대로 선다", tilesOn.length === view.tiles.length,
      `${tilesOn.length} / ${view.tiles.length} · 종류 ${view.kind}`);
    /* **화면이 실제로 적는 칸과 견준다.** 전체 수는 `overview.counts` 이고
       영역마다의 수는 그 영역의 `confirmed · owned` 다. 둘을 섞어 더하면 맞는
       화면이 걸린다(한 번 그랬다) */
    const norm = (x: string) => x.replace(/[\s·,.]/g, "");
    const cnt = model.overview.counts;
    const allLine = `확인된 판단 ${cnt.confirmed_axes} · 직접 정한 것 ${cnt.owned_axes}`;
    ok("화면의 전체 판단 수가 모델(overview.counts)과 같다", body.includes(allLine), allLine);
    /* 그 줄은 **판단을 실제로 물은 영역**에만 선다. 묻지 않은 영역은
       `이번에 묻지 않음` 으로 서고, 거기에 수를 요구하면 멀쩡한 화면이 걸린다 */
    const probed = model.domains.filter((d) => d.opened.probe || d.opened.deep);
    const perDom = probed.map((d) =>
      `확인된 판단 ${d.confirmed.length} · 직접 정한 것 ${d.owned.length}`);
    const webDom = perDom.filter((l) => body.includes(l));
    ok("영역마다의 판단 수가 화면에 그대로 선다", webDom.length === perDom.length,
      `${webDom.length} / ${perDom.length} (깊게 물은 영역 ${probed.length} · 영역별 합 ${sumC}·${sumO})`);
    const saidDom = model.domains.map((d) => name(d.code)).filter((n) => body.includes(n));
    ok("열두 영역 이름이 전부 화면에 선다", saidDom.length === model.domains.length,
      `${saidDom.length} / ${model.domains.length}`);
    ok("결과 화면에 안쪽 코드가 없다", !INNER.test(body), (body.match(INNER) ?? ["없다"])[0]);
    ok("결과 화면에 점수·퍼센트·순위가 없다", !/\d+점|\d+%|\d+위\b/.test(body),
      (body.match(/\d+점|\d+%|\d+위\b/) ?? ["없다"])[0]);

    /* 6. PDF 를 실제로 내려받아 저장 · 쪽마다 뜨기 · 글자 대조 */
    const pdf = await rp.request.get(`${BASE}/v3/${att}/result/pdf`, { timeout: 180000 });
    const ct = pdf.headers()["content-type"] ?? "";
    ok("PDF 가 내려온다 (Desktop)", pdf.status() === 200 && ct.includes("pdf"), `${pdf.status()} ${ct}`);
    const buf = Buffer.from(await pdf.body());
    writeFileSync(`${OUT}/result.pdf`, buf);
    ok("PDF 파일이 비어 있지 않다", buf.length > 50_000, `${buf.length} 바이트`);
    const dispo = pdf.headers()["content-disposition"] ?? "";
    ok("내려받기 이름이 붙는다", /attachment/.test(dispo), dispo.slice(0, 60));
    execFileSync("pdftoppm", ["-r", "96", "-png", `${OUT}/result.pdf`, `${OUT}/pdf/page`]);
    const pages = readdirSync(`${OUT}/pdf`).filter((f) => /^page-\d+\.png$/.test(f)).sort();
    ok("모든 쪽을 그림으로 떴다", pages.length >= 4, `${pages.length}쪽`);
    const text = execFileSync("pdftotext", ["-layout", `${OUT}/result.pdf`, "-"]).toString("utf8");
    writeFileSync(`${OUT}/result.txt`, text);
    const hangul = (text.match(/[가-힣]/g) ?? []).length;
    ok("종이의 한글이 글자로 꺼내진다 (글꼴 깨짐 없음)", hangul > 2000, `한글 ${hangul}자`);
    ok("종이에 깨진 글자(□·?)가 없다", !/[�□]/.test(text) && !/\?{3,}/.test(text));
    /* pdftotext 가 가운뎃점과 쉼표를 떨어뜨리므로 그 부호는 빼고 견준다 */
    const nflat = norm(text);
    ok("종이에 결과 머리글이 그대로 선다", nflat.includes(norm(head.title)), head.title.slice(0, 30));
    const pdfDomCnt = perDom.filter((l) => nflat.includes(norm(l)));
    ok("영역마다의 판단 수가 종이에 그대로 선다 (화면과 같은 값)", pdfDomCnt.length === perDom.length,
      `${pdfDomCnt.length} / ${perDom.length}`);
    const pdfDom = model.domains.map((d) => name(d.code)).filter((n) => nflat.includes(norm(n)));
    ok("종이에 열두 영역 이름이 전부 선다", pdfDom.length === model.domains.length,
      `${pdfDom.length} / ${model.domains.length}`);
    ok("종이에 학교와 학과가 선다", nflat.includes("배재대학교") && nflat.includes(norm(seat.leaf.name)));
    ok("종이에 안쪽 코드가 없다", !INNER.test(text), (text.match(INNER) ?? ["없다"])[0]);
    ok("종이에 점수·퍼센트·순위가 없다", !/\d+점|\d+%|\d+위\b/.test(text),
      (text.match(/\d+점|\d+%|\d+위\b/) ?? ["없다"])[0]);
    ok("브라우저 오류 0", errs.length === 0, errs[0] ?? "없음");

    /* 7. 손전화 폭에서도 내려받는다 */
    const m = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true,
      ...(gate ? { httpCredentials: gate } : {}),
    });
    for (const c of await ctx.cookies()) await m.addCookies([c]);
    const mp = await m.newPage();
    mp.setDefaultTimeout(20000);
    await mp.goto(`${BASE}/v3/${att}/result`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await mp.locator("h1").first().waitFor({ timeout: 20000 }).catch(() => undefined);
    await mp.waitForTimeout(600);
    const over = await mp.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("390px 결과 화면이 가로로 밀리지 않는다", over <= 1, `+${over}px`);
    const pdfLink = mp.locator('a[href$="/result/pdf"]').first();
    ok("390px 에 PDF 내려받기 길이 있다", (await pdfLink.count()) > 0);
    const mpdf = await mp.request.get(`${BASE}/v3/${att}/result/pdf`, { timeout: 180000 });
    ok("PDF 가 내려온다 (Mobile)", mpdf.status() === 200
      && (mpdf.headers()["content-type"] ?? "").includes("pdf"), `${mpdf.status()}`);
    await m.close();

    /* 8. 다른 학생은 이 결과와 PDF 를 열 수 없다 */
    const otherLogin = `r31-other-${Date.now().toString().slice(-7)}`;
    const other = await makeStudent(otherLogin);
    const octx2 = await browser.newContext({ ...(gate ? { httpCredentials: gate } : {}) });
    const op2 = await login(octx2, otherLogin, other.pw);
    const r1 = await op2.request.get(`${BASE}/v3/${att}/result/pdf`, { maxRedirects: 0 }).catch(() => null);
    ok("다른 학생에게 PDF 가 막힌다", !!r1 && r1.status() !== 200
      && !(r1.headers()["content-type"] ?? "").includes("pdf"), `${r1?.status()}`);
    op2.setDefaultTimeout(20000);
    await op2.goto(`${BASE}/v3/${att}/result`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => undefined);
    await op2.waitForTimeout(800);
    const ob = await op2.locator("body").innerText().catch(() => "");
    ok("다른 학생에게 결과 화면이 막힌다", !ob.includes(head.title) && !ob.includes(seat.leaf.name),
      new URL(op2.url()).pathname);
    const anon = await browser.newContext({ ...(gate ? { httpCredentials: gate } : {}) });
    const ap = await anon.newPage();
    const r2 = await ap.request.get(`${BASE}/v3/${att}/result/pdf`, { maxRedirects: 0 }).catch(() => null);
    ok("로그인하지 않으면 PDF 가 막힌다", !!r2 && [302, 307, 401, 404].includes(r2.status()), `${r2?.status()}`);
    await anon.close(); await octx2.close();
    for (const t of ["entitlements", "memberships", "analytics_events", "v3_attempts"]) {
      await query(`DELETE FROM ${t} WHERE user_id = $1`, [other.id]).catch(() => undefined);
    }
    await query(`DELETE FROM users WHERE id = $1`, [other.id]).catch(() => undefined);
    await ctx.close();
  } finally {
    await browser.close();
  }

  note(`응시 ${att} · 아이디 ${sid} (비밀번호는 적지 않는다) · 계정과 응시를 남겨 둔다`);
  writeFileSync(`${OUT}/e2e.json`, JSON.stringify({
    core: CORE, leaf: LEAF, attempt: att, login_id: sid, base: BASE,
    at: new Date().toISOString(), pass, fail: bad,
  }, null, 2));
  writeFileSync(`${OUT}/e2e.md`, [
    `# R31 브라우저 E2E (${CORE} · ${LEAF})`, "",
    `- 서버: ${BASE} · 응시 ${att} · 아이디 ${sid}`, `- 날짜: ${new Date().toISOString()}`,
    "- 방식: 실제 브라우저(Chromium · Playwright). 문항은 전부 화면에서 눌러 답했다. API 로 채운 답은 없다.",
    "", ...rows.map((r) => `- ${r}`), "",
    `확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`,
  ].join("\n"));
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
void main();
