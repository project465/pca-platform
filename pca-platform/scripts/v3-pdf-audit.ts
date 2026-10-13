/**
 * **네 Core × 세 등급의 실제 PDF 를 뽑아 종이로 센다.**
 *
 * 묻는 것은 `쪽이 서는가` 가 아니다. **학생이 내려받아 보관하고 대학이
 * 결과물로 전달할 수 있는 종이인가**다. 그래서 화면을 인쇄 매체로 접는
 * 길(`/v3/{id}/result/pdf`)을 **제품과 똑같이** 지난다: 미리 만들어 둔
 * 파일을 읽지 않고, 로그인한 본인으로 그 자리에서 뽑는다.
 *
 * 뽑은 종이는 `var/pdf-audit/<core>-<tier>.pdf` 에 남고, 쪽마다 글자를 다시
 * 꺼내(`pdftotext`) 쪽수와 빈 쪽과 내부 코드와 전공 이름을 센다. 웹 결과의
 * 글자도 같이 떠서 **웹과 종이가 다른 말을 하지 않는지** 본다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/v3-pdf-audit.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { chromium } from "playwright";
import {
  BASE, assertFreshServer, gateCreds, loadEnv, login, makeStudent,
} from "./_loop-fixture";
import { query } from "../src/lib/db";
import { coreFile, core as coreEntry, packs } from "../src/lib/me-v3/core-registry";
import { allLeaves, university } from "../src/lib/campus/registry";
import {
  attemptOf, checklistFor, choosePack, content, moveTo, openAttempt,
  saveAnswer, savePicks, submit, viewOf, type CampusEntry,
} from "../src/lib/me-v3/runtime/session";
import type { Answer, Tier } from "../src/lib/me-v3/scoring/types";
import type { V3Attempt } from "../src/lib/me-v3/runtime/session";

loadEnv();

const CORES = (process.env.CORES
  ?? "ME_CORE_V3,EE_CORE_V1,CS_CORE_V1,BIZ_CORE_V1").split(",");
const TIERS = ((process.env.TIERS ?? "BASIC,STANDARD,PRO").split(",")) as Tier[];
const OUT = "var/pdf-audit";
const REGS = [
  "sites/pca-platform/content/major-cores.json",
  ".next/standalone/sites/pca-platform/content/major-cores.json",
];

/** 손님 화면과 종이에 서면 안 되는 안쪽 코드 */
const INTERNAL = [
  /\bTD\d{2}\b/, /\bJ[1-8]\b/, /\bOC[1-7]\b/, /\bZ[1-4]\b/,
  /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/,
  /NOT_OBSERVED|PARTICIPATED|CONFIRMED|OWNED|NOT_EXPLORED/,
  /\b(?:undefined|null|NaN|TODO|TBD)\b/,
];
/** 쪽이 거의 비었다고 보는 선. 마지막 쪽은 남은 만큼만 찬다 */
const THIN = 120, THIN_LAST = 40;
/**
 * **마지막 쪽이 이만큼은 차야 한다**(상용화 P1, 백분율).
 *
 * 상단에 짧은 해석 안내만 있고 아래가 절반 넘게 빈 마지막 쪽은 기능
 * 실패가 아니지만 받은 사람에게는 덜 만든 종이로 읽힌다. 선을 50 으로
 * 두지 않고 45 로 둔 것은, 쪽 높이가 고정이고 종이에 세로 균형을 잡는
 * 수단이 없어서 **문서 길이가 쪽 경계에 어디쯤 떨어지는가**로 몇 %는
 * 늘 흔들리기 때문이다. 그 아래로 내려가면 여백과 배치에서 되찾는다.
 */
const LAST_FILL_MIN = 45;

type Row = {
  core: string; tier: Tier; pages: number; kb: number;
  perPage: number[]; pageFill: number[]; problems: string[]; heads: string[];
};

/**
 * **쪽마다 세로로 어디까지 찼는지**(0~100).
 *
 * 글자 수로는 알 수 없다: 활자가 큰 쪽은 글자가 적어도 꽉 차 있고,
 * 7.5pt 고지문만 든 쪽은 글자가 많아도 반이 빈다. 그래서 글자의 아래쪽
 * 좌표를 읽는다. 쪽머리와 쪽수는 여백 안에 찍히므로 글 자리 밖이다.
 */
function fillOf(file: string): number[] {
  let xml = "";
  try {
    xml = execFileSync("pdftotext", ["-bbox", file, "-"], { encoding: "utf8" });
  } catch { return []; }
  const out: number[] = [];
  for (const pg of xml.split("<page").slice(1)) {
    const h = Number(/height="([\d.]+)"/.exec(pg)?.[1] ?? 842);
    const top = h * 0.047, bot = h * 0.955;
    let low = top;
    for (const m of pg.matchAll(/yMax="([\d.]+)"/g)) {
      const y = Number(m[1]);
      if (y > top && y < bot && y > low) low = y;
    }
    out.push(Math.round(((low - top) / (bot - top)) * 100));
  }
  return out;
}

function setOpen(code: string, open: boolean): void {
  for (const f of REGS) {
    const reg = JSON.parse(readFileSync(f, "utf8")) as
      { cores: { code: string; open_to_students?: boolean }[] };
    const row = reg.cores.find((c) => c.code === code);
    if (row) { row.open_to_students = open; writeFileSync(f, `${JSON.stringify(reg, null, 1)}\n`); }
  }
}

/** 그 Core 를 가리키는 학교 자리 하나. 없으면 일반 응시다 */
function leafOf(core: string): CampusEntry | null {
  const u = university("PCU");
  if (!u) return null;
  const row = allLeaves(u).find((r) => r.leaf.core_code === core);
  if (!row) return null;
  return {
    university_code: u.university_code, college_code: row.college.code,
    department_code: row.leaf.code, core_code: core,
    specialization: row.leaf.specialization ?? null,
  };
}

function firstPack(core: string, kind: "industry" | "role"): string | null {
  try {
    const p = packs<{ packs: { code: string }[] }>(core, kind);
    return p.packs[0]?.code ?? null;
  } catch { return null; }
}

/** 영역을 전부 해 봤다고 답한 사람. 종이에 들어갈 것이 가장 많은 자리다 */
function answerOf(core: string) {
  const bank = content(core).bank.items;
  return (id: string): Answer | null => {
    const it = bank.find((x) => x.item_id === id);
    if (!it) return null;
    if (it.module === "CORE-FORCE") return { kind: "choice", value: "A" };
    if (it.module === "TRANS-10" || it.module === "TARGET") return { kind: "choice", value: "x" };
    if (it.response_scale === "L0~L3") return { kind: "level", index: 2 };
    if (it.response_scale === "4보기") return { kind: "level", index: 2 };
    if (it.response_scale === "5점") return { kind: "scale5", value: 4 };
    if (it.response_scale === "3보기") return { kind: "exposure", value: 2 };
    return null;
  };
}

async function fill(core: string, a0: V3Attempt, userId: string): Promise<number> {
  const answer = answerOf(core);
  const ind = firstPack(core, "industry");
  const role = firstPack(core, "role");
  for (const d of content(core).domains.domains) {
    await saveAnswer(a0.id, `G_${d.code}_INT`, { kind: "scale5", value: 4 });
    await saveAnswer(a0.id, `G_${d.code}_EXP`, { kind: "exposure", value: 2 });
    await saveAnswer(a0.id, `G_${d.code}_LEA`, { kind: "scale5", value: 4 });
  }
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = null, screens = 0, guard = 0;
  for (;;) {
    if ((guard += 1) > 400) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    screens += 1;
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const ans = answer(id);
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain) {
      for (const g of checklistFor(core, v.screen.domain)) {
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, 2));
      }
    }
    if (v.screen.kind === "pick-industry" && ind) await choosePack(core, a.id, "industry", ind);
    if (v.screen.kind === "pick-role" && role) await choosePack(core, a.id, "role", role);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
  return screens;
}

function pageText(file: string, n: number): string {
  try {
    return execFileSync("pdftotext", ["-f", String(n), "-l", String(n), file, "-"],
      { encoding: "utf8" });
  } catch { return ""; }
}

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const rows: Row[] = [];
  const opened: string[] = [];
  try {
    for (const core of CORES) {
      if (coreEntry(core).open_to_students === false) { setOpen(core, true); opened.push(core); }
    }
    const names = new Map(CORES.map((c) =>
      [c, coreFile<{ domains: { name: string }[] }>(c, "domains").domains.map((d) => d.name)]));

    for (const core of CORES) {
      /**
       * **학교 진입은 PRO 하나다**(추가 확정 1).
       *
       * 그래서 학교 자리를 가리키는 Core 는 종이도 **PRO 한 벌**만 센다.
       * BASIC·STANDARD 종이는 그 Core 에서 **설 수 없는 상태다**: 학교
       * 응시는 서버가 PRO 로 열고, 개인 B2C 는 그 Core 를 살 수 없다
       * (`open_to_students: false` 이고 이용권이 Core 를 가리키지 않는다).
       * 설 수 없는 상태의 종이를 세면 같은 종이를 세 번 세거나, 제품에
       * 없는 조합을 규격으로 굳히게 된다.
       *
       * 등급 셋은 **개인 B2C 가 실제로 파는 Core**(학교 자리가 없는 쪽)
       * 에서 그대로 센다.
       */
      const leaf = leafOf(core);
      const tiers = leaf ? TIERS.filter((t) => t === "PRO") : TIERS;
      if (leaf && tiers.length !== TIERS.length) {
        console.log(`  ${core} — 학교 자리를 가리키는 Core 라 PRO 한 벌만 센다`);
      }
      for (const tier of tiers) {
        const problems: string[] = [];
        const mail = `pdfaudit-${core.toLowerCase().replace(/_/g, "-")}-${tier.toLowerCase()}@test.invalid`;
        const st = await makeStudent(mail);
        await query(
          `INSERT INTO entitlements
             (user_id, product_code, kind, tier, major_code, assessment_version, status)
           VALUES ($1,$2,'report',$3,'ME','ME_V3_2','active')`,
          [st.id, `ME_V3_${tier}_KR`, tier]);
        const a = await openAttempt({
          userId: st.id, tier, stage: "bachelor", gradField: null, campus: leaf,
        });
        if (a.core_code !== core) problems.push(`응시 줄의 Core 가 ${a.core_code} 다`);
        /* **학교 응시가 선별 등급으로 열리면 걸린다.** 넘긴 등급이 PRO 라
           여기서 갈릴 일은 없지만, 막는 자리가 사라지면 그날 걸린다 */
        if (leaf && a.tier !== "PRO") problems.push(`학교 응시가 ${a.tier} 로 열렸다`);
        if (!leaf && a.tier !== tier) problems.push(`개인 응시가 ${a.tier} 로 열렸다`);
        await fill(core, a, st.id);
        const done = (await attemptOf(a.id, st.id)) as V3Attempt;
        const { snapshot } = await submit(done);
        if (!snapshot) problems.push("결과가 만들어지지 않았다");

        const ctx = await browser.newContext({
          viewport: { width: 1200, height: 900 },
          ...(gate ? { httpCredentials: gate } : {}),
        });
        const p = await login(ctx, mail, st.pw);
        await p.goto(`${BASE}/v3/${a.id}/result`, { waitUntil: "domcontentloaded" });
        await p.locator(".rs-openbtn").first().click({ timeout: 3000 }).catch(() => undefined);
        await p.waitForTimeout(400);
        const web = await p.locator("body").innerText();
        const res = await p.request.get(`${BASE}/v3/${a.id}/result/pdf`, { timeout: 180000 });
        const file = `${OUT}/${core}-${tier}.pdf`;
        let pages = 0; let kb = 0; let pageFill: number[] = [];
        const perPage: number[] = []; const heads: string[] = [];
        if (res.status() !== 200 || !(res.headers()["content-type"] ?? "").includes("pdf")) {
          problems.push(`PDF ${res.status()} ${res.headers()["content-type"] ?? ""}`);
        } else {
          writeFileSync(file, await res.body());
          writeFileSync(`${OUT}/${core}-${tier}.web.txt`, web);
          kb = Math.round(statSync(file).size / 1024);
          const raw = readFileSync(file, "latin1");
          pages = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
          const texts: string[] = [];
          for (let n = 1; n <= pages; n += 1) texts.push(pageText(file, n));
          writeFileSync(`${OUT}/${core}-${tier}.txt`, texts.join("\n\f\n"));
          for (const t of texts) {
            perPage.push(t.replace(/\s+/g, "").length);
            heads.push((t.split("\n").map((x) => x.trim()).filter(Boolean)[1] ?? "").slice(0, 28));
          }
          pageFill = fillOf(file);
          const lastFill = pageFill[pageFill.length - 1] ?? 100;
          if (pages > 1 && lastFill < LAST_FILL_MIN) {
            problems.push(`마지막 쪽이 ${lastFill}%만 찼다`);
          }
          const all = texts.join("\n");
          /* 1. 한글이 뽑히는가 (글꼴이 없으면 네모가 되어 글자가 0 이다) */
          const han = (all.match(/[가-힣]/g) ?? []).length;
          if (han < 200) problems.push(`한글이 ${han}자뿐이다 (글꼴 확인)`);
          if (/�/.test(all)) problems.push("깨진 글자(U+FFFD)가 있다");
          /* 2. 빈 쪽 */
          const thin = perPage
            .map((n, i) => [i + 1, n] as [number, number])
            .filter(([i, n]) => n < (i === perPage.length ? THIN_LAST : THIN))
            .map(([i]) => i);
          if (thin.length) problems.push(`${thin.join("·")}쪽이 거의 비어 있다`);
          /* 3. 내부 코드 */
          for (const re of INTERNAL) {
            const hit = (all.match(re) ?? [])[0];
            if (hit) problems.push(`내부 코드 — ${hit}`);
          }
          /* 4. 이 전공의 영역 이름이 적히는가 */
          const said = (names.get(core) ?? []).filter((n) => all.includes(n));
          if (!said.length) problems.push("이 전공의 영역 이름이 한 줄도 없다");
          /* 5. 갈래가 있으면 종이에 그 학과가 적히는가 */
          if (leaf && !all.includes("배재")) problems.push("학교 맥락이 종이에 없다");
          /* 6. 웹과 종이가 같은 말을 하는가 (첫 화면 네 칸) */
          for (const key of ["지금 확인된 것", "지금 할 일"]) {
            if (web.includes(key) && !all.includes(key)) {
              problems.push(`웹에는 있고 종이에 없다 — ${key}`);
            }
          }
          /* 7. 개인정보: 로그인 아이디와 메일이 종이에 적히지 않는다 */
          if (all.includes(mail)) problems.push("종이에 로그인 아이디가 적힌다");
          /* 8. 해석 안내 */
          if (!/적성|합격|순위/.test(all)) problems.push("해석 안내(적성검사 아님)가 없다");
        }
        await ctx.close();
        rows.push({ core, tier, pages, kb, perPage, pageFill, problems, heads });
        console.log(`  ${core} ${tier} — ${pages}쪽 · ${kb}KB · `
          + (problems.length ? `걸림 ${problems.length}: ${problems.join(" / ")}` : "걸림 0"));
      }
    }
  } finally {
    for (const c of opened) setOpen(c, false);
    await browser.close();
  }

  console.log("\n쪽별 글자 수와 찬 비율");
  for (const r of rows) {
    console.log(`  ${r.core.padEnd(12)} ${r.tier.padEnd(9)} ${String(r.pages).padStart(2)}쪽 `
      + `· ${r.perPage.join("/")}\n`
      + `  ${" ".repeat(22)} 찬 비율 ${r.pageFill.join("/")}% `
      + `· 마지막 ${r.pageFill[r.pageFill.length - 1] ?? 0}%`);
  }
  const bad = rows.filter((r) => r.problems.length);
  console.log(`\nPDF ${rows.length}벌 · 걸림 ${bad.length}벌`);
  writeFileSync(`${OUT}/summary.json`, `${JSON.stringify(rows, null, 1)}\n`);
  if (bad.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
