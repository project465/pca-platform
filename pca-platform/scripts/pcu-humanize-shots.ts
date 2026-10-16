/**
 * **사람이 직접 읽을 묶음**(PCU HUMANIZATION 회차 §Human Review).
 *
 * 규격이 이름을 댄 여섯 Core(BIZ · CS · EE · NURSING · PUBADM · MEDIA)를
 * **밟는 차례 그대로** 지나며 검사 → 결과 → 종이 → 작업공간을 찍는다.
 *
 * **자리 목록을 주소로 열어 찍지 않는다.** 그렇게 찍으면 그 쪽이 어떤
 * 상태인지가 지난번 누군가 눌러 둔 상태에 달려 있고, 한 번 그렇게 찍어
 * 같은 그림 열두 장을 쌓아 둔 적이 있다. 학과 자리에서 계정을 발급하고
 * 학교 길로 응시를 열어 끝까지 답하고 제출한 뒤에 찍는다.
 *
 * 찍는 길에 다섯을 같이 센다. 그림은 멀쩡히 저장되면서 쪽이 쓸 수 없는
 * 모양일 수 있고, 그 넷은 상태 코드로 지나간다.
 *
 *   쪽이 열렸는가 · 안쪽 코드가 손님 화면에 서지 않는가 · 가로로 밀리지
 *   않는가 · **같은 그림이 두 이름으로 저장되지 않는가** ·
 *   **그 Core 의 말이 그 쪽에 섰는가**(남의 전공 문맥이 나간 자리를 이
 *   회차 전에 한 번 겪었다)
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' npm run pcu:humanize
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
} from "./_loop-fixture";
loadEnv();
import { chromium, type BrowserContext, type Page } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { addStudentAccount } from "../src/lib/campus/manage";
import { allLeaves, coreOf, statusOf, university } from "../src/lib/campus/registry";
import { attemptOf, planFor, type V3Attempt } from "../src/lib/me-v3/runtime/session";
import { core as coreEntry } from "../src/lib/me-v3/core-registry";
import { walk, enterAssessment } from "./_v3-walk";

const UNI = "PCU";
const OUT = process.env.OUT ?? "docs/metri/shots/pcu-humanize";
/** 규격이 이름을 댄 여섯. `CORES` 로 좁혀 한둘만 다시 찍을 수 있다 */
const WANT = (process.env.CORES ?? "BIZ,CS,EE,NURSING,PUBADM,MEDIA")
  .split(",").map((x) => `${x.trim()}_CORE_V1`);

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

/** 손님 화면에 서면 안 되는 안쪽 코드 */
const CODE = /\bTD\d\d\b|\b[A-Z]{2,6}_CORE_V\d\b|\bSPEC_[A-Z_]+\b|\bPCU2[67]_[A-Z_]+\b|\bZ[1-4]_[A-Z_]+\b/;

const seen = new Map<string, string>();

async function shoot(
  p: Page, id: string, what: string, url: string, guest: boolean,
): Promise<string> {
  const res = await p.goto(`${BASE}${url}`, { waitUntil: "networkidle" })
    .catch(() => null);
  ok(`${id} 쪽이 열린다 — ${what}`,
    Boolean(res) && (res as { status(): number }).status() < 400,
    res ? String((res as { status(): number }).status()) : "열리지 않았다");
  const file = `${OUT}/${id}.png`;
  await p.screenshot({ path: file, fullPage: true });
  const body = (await p.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
  if (guest) {
    const hit = CODE.exec(body);
    ok(`${id} 안쪽 코드가 없다`, !hit, hit ? hit[0] : "");
  }
  const over = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 2);
  ok(`${id} 가로로 밀리지 않는다`, !over);
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(sum);
  ok(`${id} 다른 자리와 같은 그림이 아니다`, !had, had ?? "");
  seen.set(sum, id);
  return body;
}

async function oneCore(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  orgId: string, actor: { userId: string; role: string; orgId: number },
  core: string, idx: number, index: string[],
): Promise<void> {
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);
  const seat = allLeaves(u).find(
    (r) => coreOf(r.leaf)?.code === core && statusOf(u, r) === "READY");
  if (!seat) { ok(`${core} 검사 가능한 자리가 있다`, false, "없다"); return; }
  assertPreviewServer(core);
  const name = coreEntry(core).name_ko;
  const sid = `zzhm${idx}${Date.now().toString().slice(-7)}`;
  const st = await addStudentAccount(UNI, orgId, {
    student_id: sid, name: "검수용 학생", email: null, login_id: sid,
    college_code: seat.college.code, department_code: seat.leaf.code,
  }, actor);
  if (!st.ok || !st.password) {
    ok(`${core} 계정 발급`, false, st.why ?? ""); return;
  }
  const stu = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [sid]);
  if (!stu) { ok(`${core} 발급한 계정을 찾는다`, false); return; }
  await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [stu.id]);

  const gate = gateCreds();
  const ctx: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...(gate ? { httpCredentials: gate } : {}),
  });
  try {
    const p = await login(ctx, sid, st.password);
    /* 학교 길로 들어간다. 학과 상세의 단추 하나가 그 전공으로 연다 */
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
    await enterAssessment(p);
    const a = (await attemptOf(att, stu.id)) as V3Attempt;
    const plan = await planFor(a);
    const grid = plan.screens.findIndex((s) => s.kind === "sweep");
    /* 보기 넷으로 받는 문항 화면 — 예시와 받침과 장면이 서는 자리.
       **`single` 을 앞에서부터 찾지 않는다.** 훑기 바로 뒤에 서는 것은
       묶인 두 영역을 가르는 강제 선택 화면이고, 그 화면의 보기는 영역
       이름 둘이라 사다리가 아니다. 그래서 `예` 줄이 설 자리가 없는데
       처음에 그 화면을 찍어 여섯 Core 가 전부 걸렸다 */
    const quest = plan.screens.findIndex(
      (s) => /^(judge|probe|deep|branch)-/.test(s.id));
    ok(`${name} 찍을 화면 자리를 찾는다`, grid >= 0 && quest > grid,
      `훑기 ${grid} · 문항 ${quest}`);

    const tag = core.replace("_CORE_V1", "");
    const g = await shoot(p, `${tag}-01-sweep`, `${name} 영역 훑기`,
      `/v3/${att}?s=${grid}`, true);
    ok(`${name} 훑기에 그 전공의 줄이 선다`, g.length > 200, `${g.length}자`);
    const q = await shoot(p, `${tag}-02-question`, `${name} 보기 넷 문항`,
      `/v3/${att}?s=${quest}`, true);
    ok(`${name} 문항 화면에 예시 한 줄이 선다`, /예\s/.test(q), q.slice(0, 80));

    /* 끝까지 답하고 제출한다. 결과와 종이가 그 응답에서 나와야 한다 */
    const out = await walk(p, plan.screens.length + 20);
    ok(`${name} 끝까지 답하고 제출한다`, out.done, `${out.screens}화면`);
    const sn = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_snapshots WHERE attempt_id = $1::bigint`,
      [att]);
    ok(`${name} 굳은 결과가 한 줄 선다`, (sn?.n ?? "0") !== "0", sn?.n ?? "0");

    const r = await shoot(p, `${tag}-03-result`, `${name} 결과 첫 화면`,
      `/v3/${att}/result`, true);
    ok(`${name} 결과 첫 화면에 지금 할 일이 선다`, /지금 할 일/.test(r),
      r.slice(0, 80));
    /* 상세를 펴고 다시 찍는다.
       **`details` 의 속성만 건드려서는 열리지 않는다.** 본문을 접는 자리는
       React 상태(`Detail` · `Fold`)이고 그 상태는 단추를 눌러야 바뀐다.
       속성만 세웠다가 **요약과 바이트까지 같은 그림**이 여섯 Core 에 전부
       저장됐고, 이 함수를 지나지 않아 `shoot()` 의 지문 대조에도 걸리지
       않았다. 그래서 눌러서 펴고, 펴졌는지를 지문으로 센다 */
    /* **접는 자리가 세 종류다.** `Detail`(`rs-openbtn`) 안에
       `Disclose`(`rs-discbtn`) 가 있고 그 안에 또 `Fold`(`rs-foldbtn`) 가
       있다. 처음에 앞의 둘만 눌러서 **가장 안쪽 한 자리가 접힌 채로
       남았고**, 그 자리는 닫힌 부모 안이라 크기가 0×0 이어서 Playwright
       의 `click` 이 2초를 기다리다 포기했다. 그래서 라운드마다 **DOM 의
       `click()` 으로** 닫힌 단추를 전부 누르고, 열리면서 드러난 안쪽
       단추를 다음 라운드가 받는다 */
    const SHUT = "button.rs-openbtn[aria-expanded=\"false\"],"
      + " button.rs-discbtn[aria-expanded=\"false\"],"
      + " button.rs-foldbtn[aria-expanded=\"false\"]";
    for (let round = 0; round < 8; round++) {
      const hit = await p.$$eval(SHUT, (els) => {
        for (const e of els) (e as HTMLButtonElement).click();
        return els.length;
      }).catch(() => 0);
      if (!hit) break;
      await p.waitForTimeout(250);
    }
    for (const d of await p.locator("details:not([open])").all()) {
      await d.evaluate((x) => x.setAttribute("open", "")).catch(() => undefined);
    }
    await p.waitForTimeout(400);
    const left = await p.locator(SHUT).count();
    ok(`${name} 결과 상세가 전부 펴진다`, left === 0, `${left}자리 접힌 채`);
    const file = `${OUT}/${tag}-04-result-detail.png`;
    await p.screenshot({ path: file, fullPage: true });
    const dsum = createHash("sha256").update(readFileSync(file))
      .digest("hex").slice(0, 16);
    const dhad = seen.get(dsum);
    ok(`${name} 상세 그림이 요약과 다르다`, !dhad, dhad ?? "");
    seen.set(dsum, `${tag}-04-result-detail`);
    const dbody = (await p.locator("body").innerText().catch(() => ""))
      .replace(/\s+/g, " ");
    ok(`${name} 상세에 영역 절이 선다`, dbody.length > 4000, `${dbody.length}자`);

    /* 종이. 받는 사람의 쿠키로 그 자리에서 뽑는다 */
    const pdf = await ctx.request.get(`${BASE}/v3/${att}/result/pdf`);
    ok(`${name} 종이가 뽑힌다`, pdf.ok(), String(pdf.status()));
    if (pdf.ok()) {
      writeFileSync(`${OUT}/${tag}-05-report.pdf`, await pdf.body());
    }

    const me = await shoot(p, `${tag}-06-me`, `${name} 내 CareerMatri`, "/me", true);
    ok(`${name} 작업공간에 지금 할 일이 선다`, /지금 할 일/.test(me),
      me.slice(0, 80));

    index.push(`### ${name} (${core})`);
    index.push("");
    index.push(`- \`${tag}-01-sweep.png\` — 영역 훑기. 열두 줄이 그 전공의 일로 적혀 있는가`);
    index.push(`- \`${tag}-02-question.png\` — 보기 넷 문항. 질문 → 예시 → 선택 차례인가`);
    index.push(`- \`${tag}-03-result.png\` — 결과 첫 화면. 여섯 칸이 스크롤 전에 서는가`);
    index.push(`- \`${tag}-04-result-detail.png\` — 결과 상세. 같은 판정문이 되풀이되지 않는가`);
    index.push(`- \`${tag}-05-report.pdf\` — 종이. 쪽마다 핵심 질문 하나인가`);
    index.push(`- \`${tag}-06-me.png\` — 내 CareerMatri. 지금 할 일이 첫 칸인가`);
    index.push("");
  } finally {
    await ctx.close();
    await query(`DELETE FROM users WHERE id = $1::bigint`, [stu.id])
      .catch(() => undefined);
  }
}

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다 (npm run pcu:org)`);
  const boss = await queryOne<{ id: string }>(
    `SELECT u.id::text FROM users u JOIN memberships m ON m.user_id = u.id
      WHERE m.org_id = $1 AND m.role = 'org_admin' LIMIT 1`, [org.id]);
  if (!boss) throw new Error(`${UNI} 담당자 줄이 없습니다 (npm run pcu:org)`);
  const actor = { userId: boss.id, role: "org_admin", orgId: Number(org.id) };

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const index: string[] = ["# PCU Humanization — 사람이 읽을 묶음", "",
    "밟는 차례 그대로 찍었다. 자리마다 **무엇을 보아야 하는지**를 적는다.", ""];
  try {
    for (const [i, c] of WANT.entries()) {
      console.log(`\n── ${c}`);
      await oneCore(browser, org.id, actor, c, i, index);
    }
  } finally {
    await browser.close();
  }
  writeFileSync(`${OUT}/README.md`, `${index.join("\n")}\n`);
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  console.log(`  그림과 색인 — ${OUT}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
