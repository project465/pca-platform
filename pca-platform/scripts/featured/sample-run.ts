/**
 * **중점 기업 카드 견본.** 학교 · 기관이 발급한 계정으로 사람처럼 끝까지 풀고, 웹 결과 ·
 * `/me/region` · PDF 에서 그 회사 카드가 지역 부분 맨 위에 서는지 글자로 확인한다.
 *
 *   bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 OUT=<저장소 밖> npx tsx scripts/featured/sample-run.ts
 *   RUNS="KUS:KUS26_ELECMECH:KUS26_VISIONSEMI_TOUR,SJEPA:SJEPA26_MECH:SJEPA26_JOBTALK11_TOUR"
 *
 * 참여자는 지어낸 예시다(이름 `예시 참여자`). 계정 열쇠는 OUT 의 accounts.csv 에만 적는다.
 * 프로그램에 넣지 않은 대조군(`:none`)은 카드가 **서지 않는지** 본다.
 */
import { chromium, type Page } from "playwright";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BASE, assertFreshServer, gateCreds, loadEnv } from "../_loop-fixture";
import { walk } from "../_v3-walk";
import { query, queryOne } from "../../src/lib/db";
import { checkStudent, loginModeOf, provisionStudent } from "../../src/lib/campus/students";
import { allLeaves, university } from "../../src/lib/campus/registry";
import { programByCode } from "../../src/lib/featured";
import { SCHOOL_WORDS } from "../../src/lib/featured/text";

loadEnv();
const OUT = process.env.OUT ?? "";
if (!OUT || path.resolve(OUT).startsWith(path.resolve("."))) throw new Error("OUT 에 저장소 밖 자리를 적으십시오(열쇠가 적힌다)");
const RUNS = (process.env.RUNS ?? [
  "KUS:KUS26_ELECMECH:KUS26_VISIONSEMI_TOUR",
  "KUS:KUS26_EIE:KUS26_VISIONSEMI_TOUR",
  "KUS:KUS26_SEMIPHYS:KUS26_VISIONSEMI_TOUR",
  "KUS:KUS26_AICYBER:KUS26_VISIONSEMI_TOUR",
  "SJEPA:SJEPA26_MECH:SJEPA26_JOBTALK11_TOUR",
  "KUS:KUS26_EIE:none",
].join(",")).split(",").map((s) => { const [uni, leaf, prog] = s.split(":"); return { uni, leaf, prog }; });

/**
 * `RECHECK=<accounts.csv>`: 이미 풀어 둔 견본 계정으로 들어가 결과 쪽만 다시 본다(빌드를 고친 뒤).
 * 비밀번호는 첫 로그인에서 바꾼 값(`<임시>A1x`)이다. 검사를 다시 풀지 않는다
 */
const RECHECK = process.env.RECHECK ?? "";
async function recheck(browser: import("playwright").Browser) {
  const rows = readFileSync(RECHECK, "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
  for (const [uni, leaf, progCode, id, pw] of rows) {
    const prog = progCode === "none" ? null : programByCode(progCode);
    lines.push(`\n## 다시 보기 · ${uni} · ${leaf} · ${prog ? prog.title : "프로그램 없음(대조군)"}`);
    console.log(`\n── 다시 보기 · ${uni} · ${leaf} · ${progCode}`);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (gateCreds()) await ctx.setHTTPCredentials(gateCreds()!);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/campus/${uni.toLowerCase()}/login`, { waitUntil: "domcontentloaded" });
    await p.fill('input[name="identifier"]', id);
    await p.fill('input[name="password"]', `${pw}A1x`);
    await p.click('button[type="submit"]');
    await p.waitForURL((x) => !new URL(x).pathname.endsWith("/login"), { timeout: 30000 }).catch(() => undefined);
    const att = (await (await p.request.get(`${BASE}/me`)).text()).match(/\/v3\/(\d+)\/result/)?.[1] ?? "";
    if (!ok("로그인하고 굳은 결과를 찾았다", !!att, `응시 ${att}`)) { await ctx.close(); continue; }
    const dir = path.join(OUT, `${uni}-${leaf}-${progCode}-${att}`); mkdirSync(dir, { recursive: true });
    await checkResult(p, att, prog, dir).catch((e) => ok("다시 보기", false, String(e).slice(0, 200)));
    await ctx.close();
  }
}

/** 검사 전에 적는 경험(지어낸 예시). `kind` 는 경험 종류 보기 차례, `tds` 는 영역 보기 차례 */
const EXPS: Record<string, { kind: number; title: string; tds: number[] }[]> = {
  KUS26_ELECMECH: [
    { kind: 1, title: "캡스톤디자인: 웨이퍼 이송용 소형 리니어 스테이지 설계와 시제품", tds: [0, 3] },
    { kind: 0, title: "열유체 실험: 히터 블록 온도 분포 측정과 해석 비교", tds: [2, 6] },
  ],
  KUS26_EIE: [
    { kind: 0, title: "회로설계 실습: 온도 센서 신호 증폭 회로 설계와 측정", tds: [0, 2] },
    { kind: 1, title: "임베디드 프로젝트: 소형 오븐 온도 제어 펌웨어", tds: [3, 5] },
  ],
  KUS26_SEMIPHYS: [
    { kind: 0, title: "반도체공정실험: 박막 증착 후 두께 측정과 조건별 비교", tds: [6, 7] },
    { kind: 1, title: "학부연구생: 소자 전류-전압 특성 측정 자동화 스크립트", tds: [2, 0] },
  ],
  KUS26_AICYBER: [
    { kind: 1, title: "팀 프로젝트: 장비 로그 이상 탐지 모델과 경보 기준 정하기", tds: [0, 4] },
  ],
  SJEPA26_MECH: [
    { kind: 1, title: "직업훈련 과정: 자동화 설비 유지보수 실습과 고장 기록", tds: [0, 3] },
  ],
};

const lines: string[] = [];
const ok = (label: string, pass: boolean, note = "") => {
  const s = `${pass ? "  통과" : "  실패"}  ${label}${note ? ` · ${note}` : ""}`;
  console.log(s); lines.push(s); return pass;
};

async function addExperience(p: Page, e: { kind: number; title: string; tds: number[] }) {
  await p.goto(`${BASE}/me/experience/new`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.locator('label.cm-pick:has(input[name="kind"])').nth(e.kind).click();
  await p.fill('input[name="title"]', e.title);
  await p.getByRole("button", { name: "다음", exact: true }).click();
  for (const i of e.tds) await p.locator('label.cm-pick:has(input[name="td"])').nth(i).click().catch(() => undefined);
  await p.getByRole("button", { name: "다음", exact: true }).click();
  const subs = p.locator(".cm-sub");
  for (let k = 0; k < await subs.count(); k += 1) {
    const picks = subs.nth(k).locator("label.cm-pick");
    for (let j = 0; j < Math.min(2, await picks.count()); j += 1) await picks.nth(j).click().catch(() => undefined);
  }
  await Promise.all([
    p.waitForURL((u) => !u.pathname.endsWith("/new"), { timeout: 30000 }).catch(() => undefined),
    p.getByRole("button", { name: "저장", exact: true }).click(),
  ]);
  await p.waitForLoadState("networkidle").catch(() => undefined);
}

/** 기계가 쓴 냄새: `아직 ~ 없습니다` · `~하지 않습니다` 로 끝나는 줄이 겹치는지와 그림 글자 */
function aiSmell(t: string): string[] {
  const out: string[] = [];
  const sents = t.split(/(?<=[.다요])\s+/);
  const neg = sents.filter((s) => /^아직 .*없습니다/.test(s.trim()) || /하지 않습니다\.?$/.test(s.trim()));
  if (neg.length >= 2) out.push(`부정 종결 ${neg.length}줄`);
  if (/\p{Extended_Pictographic}/u.test(t)) out.push("그림 글자");
  if (/—/.test(t)) out.push("대시");
  return out;
}

/** 지역 절의 h2 바로 다음 덩이가 카드인가. 화면은 `#region-screen`(요약 화면의 지역 부분), 종이 · `/me/region` 은 `#region-orgs` */
async function cardAtTop(p: Page, sel = "#region-orgs"): Promise<{ top: boolean; text: string }> {
  return p.evaluate((sel) => {
    const sec = document.querySelector(sel);
    if (!sec) return { top: false, text: "" };
    const h2 = sec.querySelector(":scope > h2");
    const next = h2?.nextElementSibling;
    const card = sec.querySelector("#featured-company") as HTMLElement | null;
    return { top: !!card && next === card, text: card ? (card.innerText || card.textContent || "") : "" };
  }, sel);
}

async function one(run: { uni: string; leaf: string; prog: string }, browser: import("playwright").Browser) {
  const u = university(run.uni)!;
  const seat = allLeaves(u).find((r) => r.leaf.code === run.leaf);
  if (!seat) throw new Error(`${run.uni} 에 ${run.leaf} 가 없습니다`);
  const prog = run.prog === "none" ? null : programByCode(run.prog);
  const code = u.university_code.toLowerCase();
  lines.push(`\n## ${u.university_name} · ${seat.leaf.name} · ${prog ? prog.title : "프로그램 없음(대조군)"}`);
  console.log(`\n── ${u.university_name} · ${seat.leaf.name} · ${run.prog}`);
  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [run.uni]);
  if (!org) throw new Error(`${run.uni} 기관 줄이 없습니다`);
  const n = String(Date.now()).slice(-7);
  const sid = loginModeOf(u) === "phone" ? `0109${n}` : `2099${n}`;
  const c = checkStudent(run.uni, { student_id: sid, name: "예시 참여자", department_code: seat.leaf.code, college_code: seat.college.code });
  if (!c.ok) throw new Error(c.why);
  const prov = await provisionStudent(org.id, c.value);
  ok("명단으로 계정 발급", prov.created && Boolean(prov.password));
  appendFileSync(path.join(OUT, "accounts.csv"), `${run.uni},${seat.leaf.name},${run.prog},${c.value.loginId},${prov.password}\n`);
  if (prog) {
    /* `scripts/featured/enroll.ts` 와 같은 자리: 프로그램 기수에 넣는다 */
    let co = await queryOne<{ id: string }>(`SELECT id::text FROM cohorts WHERE org_id=$1::bigint AND program_code=$2 LIMIT 1`, [org.id, prog.code]);
    if (!co) co = await queryOne<{ id: string }>(`INSERT INTO cohorts (org_id, name, description, program_code) VALUES ($1::bigint,$2,$3,$4) RETURNING id::text`, [org.id, prog.cohort_name, prog.title, prog.code]);
    await query(`INSERT INTO cohort_members (cohort_id, user_id) VALUES ($1::bigint,$2::bigint) ON CONFLICT DO NOTHING`, [co!.id, prov.userId]);
    ok("프로그램 기수에 넣었다", true, prog.code);
  }

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  if (gateCreds()) await ctx.setHTTPCredentials(gateCreds()!);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/campus/${code}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"]', c.value.loginId);
  await p.fill('input[name="password"]', prov.password as string);
  await p.click('button[type="submit"]');
  await p.waitForURL((x) => !new URL(x).pathname.endsWith("/login"), { timeout: 30000 }).catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  /* 임시 비밀번호는 첫 로그인에만 쓴다. 새 비밀번호를 정하고 학교 입구로 돌아간다 */
  if (new URL(p.url()).pathname.startsWith("/password/change")) {
    const np = `${prov.password}A1x`;
    await p.fill('input[name="current"]', prov.password as string);
    await p.fill('input[name="next"]', np);
    await p.fill('input[name="confirm"]', np);
    await Promise.all([
      p.waitForURL((x) => !new URL(x).pathname.startsWith("/password/change"), { timeout: 30000 }).catch(() => undefined),
      p.getByRole("button", { name: "비밀번호 변경" }).click(),
    ]);
    await p.goto(`${BASE}/campus/${code}/start`, { waitUntil: "domcontentloaded" });
    await p.waitForLoadState("networkidle").catch(() => undefined);
  }
  await p.getByRole("button", { name: /검사 시작하기/ }).first().click();
  await p.waitForURL(/\/v3\/start/, { timeout: 30000 }).catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.getByText("학부", { exact: true }).click().catch(() => undefined);
  await p.getByRole("button", { name: "검사 시작" }).click();
  await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
  const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
  ok("검사가 열린다", Boolean(att), `응시 ${att}`);
  for (const e of EXPS[run.leaf] ?? []) await addExperience(p, e);
  await p.goto(`${BASE}/v3/${att}`, { waitUntil: "domcontentloaded" });
  const w = await walk(p, 260);
  ok("끝까지 풀었다", w.done, `화면 ${w.screens}개`);

  const dir = path.join(OUT, `${run.uni}-${run.leaf}-${run.prog}-${att}`); mkdirSync(dir, { recursive: true });
  await checkResult(p, att, prog, dir);
  await ctx.close();
}

/** 결과 쪽 셋(웹 화면 · /me/region · PDF)에서 카드 자리와 글자를 본다. 다시 보기(`RECHECK`)도 이것을 쓴다 */
async function checkResult(p: Page, att: string, prog: ReturnType<typeof programByCode>, dir: string) {
  await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(() => undefined);
  const web = await cardAtTop(p, "#region-screen");
  const print = await cardAtTop(p, "#region-orgs");
  writeFileSync(path.join(dir, "web-card.txt"), web.text);
  if (prog) {
    ok("웹 결과(화면): 지역 부분 맨 위에 카드", web.top);
    ok("웹 결과(인쇄판 지역 절): 맨 위에 카드", print.top);
    ok("웹 결과: 회사 · 프로그램 · 준비 · 현장 칸", ["비전세미콘", prog.title, "방문 전에 준비할 것", "현장에서 확인할 것", "출처:"].every((k) => web.text.includes(k)));
    const smell = aiSmell(web.text);
    ok("웹 결과: 기계 문체 없음", smell.length === 0, smell.join(" "));
    if (prog.audience === "agency") ok("웹 결과: 학교 말 없음(기관)", !SCHOOL_WORDS.test(web.text), (web.text.match(SCHOOL_WORDS) ?? []).join(" "));
    const el = p.locator("#featured-company");
    if (await el.count()) await el.screenshot({ path: path.join(dir, "web-card.png") }).catch(() => undefined);
  } else ok("대조군: 카드가 서지 않는다", !web.text);

  await p.goto(`${BASE}/me/region`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(() => undefined);
  const me = await cardAtTop(p);
  if (prog) ok("/me/region: 지역 절 맨 위에 카드", me.top && me.text.includes("비전세미콘"));
  else ok("/me/region 대조군: 카드 없음", !me.text);

  const r = await p.request.get(`${BASE}/v3/${att}/result/pdf`, { timeout: 240000 });
  const isPdf = r.status() === 200 && (r.headers()["content-type"] ?? "").includes("pdf");
  ok("PDF 가 내려왔다", isPdf, `${r.status()}`);
  if (isPdf) {
    const pdfPath = path.join(dir, "result.pdf");
    writeFileSync(pdfPath, await r.body());
    const txt = execFileSync("pdftotext", ["-layout", pdfPath, "-"]).toString();
    writeFileSync(path.join(dir, "result.txt"), txt);
    const pages = txt.split("\f");
    /* 차례 쪽에도 같은 제목이 적히므로 본문 쪽만 본다: 장 표지는 `이 장에 담은 것`, 회사 쪽은 `방문 전에 준비할 것` */
    const chap = pages.findIndex((pg) => /기업 살펴보기/.test(pg) && pg.includes("이 장에 담은 것"));
    const feat = pages.findIndex((pg) => pg.includes("자세히 보기") && pg.includes("방문 전에 준비할 것"));
    const firstRegion = pages.findIndex((pg, i) => i > chap && i !== feat && /기업 살펴보기/.test(pg));
    if (prog) {
      ok("PDF: 지역 장 맨 앞(장 표지 바로 다음)에 회사 쪽", chap >= 0 && feat === chap + 1 && (firstRegion < 0 || feat < firstRegion), `장 표지 ${chap + 1}쪽 · 회사 쪽 ${feat + 1}쪽 · 장 다음 쪽 ${firstRegion + 1}쪽`);
      const fp = feat >= 0 ? pages[feat] : "";
      /* 한 쪽에 다 들어갔는가: 마지막 줄(출처)까지 같은 쪽에 있다 */
      ok("PDF: 준비 · 현장 · 출처가 한 쪽에", ["방문 전에 준비할 것", "현장에서 확인할 것", "출처와 기준일"].every((k) => fp.replace(/\s+/g, " ").includes(k)));
      if (prog.audience === "agency") ok("PDF: 학교 말 없음(기관)", !SCHOOL_WORDS.test(fp), (fp.match(SCHOOL_WORDS) ?? []).join(" "));
      if (feat >= 0) execFileSync("pdftoppm", ["-r", "70", "-png", "-f", String(feat + 1), "-l", String(feat + 1), pdfPath, path.join(dir, "pdf-card")]);
    } else ok("PDF 대조군: 회사 쪽 없음", feat < 0);
  }
}

async function main() {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  if (!RECHECK) writeFileSync(path.join(OUT, "accounts.csv"), "기관,학과,프로그램,아이디,비밀번호\n");
  const browser = await chromium.launch({ args: ["--no-sandbox"], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    if (RECHECK) await recheck(browser);
    else for (const r of RUNS) await one(r, browser).catch((e) => ok(`${r.uni} ${r.leaf} 진행`, false, String(e).slice(0, 300)));
  } finally { await browser.close(); }
  writeFileSync(path.join(OUT, "RUN.md"), `# 중점 기업 카드 견본 (${new Date().toISOString()})\n${lines.join("\n")}\n`);
  process.exit(lines.some((l) => l.includes("실패")) ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
