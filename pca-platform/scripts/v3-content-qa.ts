/**
 * **상용 콘텐츠 QA 하네스. 전 Core × 사람 셋을 실제 runtime 으로 돌린다.**
 *
 * 묻는 것은 `코드가 도는가` 가 아니다. **학생이 읽고 이해하는 글인가**와
 * **그 종이를 대학 담당자에게 그대로 건넬 수 있는가**다. 그래서 raw JSON 을
 * 보지 않고 제품과 똑같은 길을 지난다: 응시를 열고 사람 셋의 답을 넣고
 * 제출하고, 로그인한 본인으로 웹 결과와 종이를 받는다.
 *
 * 떠 두는 것이 넷이다(`var/content-qa/<core>-<사람>.*`).
 *
 *   `.screens.txt`  응시 화면에 **실제로 서는 글자**. 화면이 부르는 함수를
 *                   그대로 불러 적는다(`wordingOf` · `controlOf` ·
 *                   `checklistFor`). 캡처는 대표 Core 만 찍으므로, 전
 *                   Core 를 글자로 세는 자리가 여기다
 *   `.web.txt`      웹 결과 쪽의 그려진 글자
 *   `.pdf` · `.txt` 종이와 쪽마다 다시 꺼낸 글자
 *   `judgment.json` **판정 지문.** 채점 스냅샷과 결과 모델에서 판본 칸만
 *                   뺀 값이다. 문장을 고치는 회차에서 이 지문이 달라지면
 *                   그것은 카피 수정이 아니라 판정 변경이다
 *
 * **사람 셋을 fixture 로 두지 않는다.** 등록부의 열두 벌은 판정 회귀가
 * 쓰는 자리이고(`v3:scoring` 의 golden), 여기서 묻는 것은 카피다. 세 벌은
 * 받은 규격 §2 의 세 처지를 그대로 적은 **답하는 규칙**이고 Core 와
 * 무관하게 같다: 그래서 Core 사이의 결과 차이가 사람 차이에서 오지 않는다.
 *
 *   A  거의 경험이 없다
 *   B  일부 경험이 있고 증거가 일부만 있다
 *   C  여러 영역을 직접 수행했고 산출물·비교·검증 증거가 있다
 *
 *   V3_PREVIEW_OPEN='*' bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' npx tsx scripts/v3-content-qa.ts
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { chromium } from "playwright";
import {
  BASE, assertFreshServer, assertPreviewServer, gateCreds, loadEnv, login,
  makeStudent,
} from "./_loop-fixture";
import { controlOf } from "../src/lib/me-v3/runtime/menus";
import { PEOPLE, answerAll, firstPack, type Policy } from "./_v3-answer";
import { query, queryOne } from "../src/lib/db";
import { core as coreEntry, hasCoreFile, packs, registry } from "../src/lib/me-v3/core-registry";
import { allLeaves, university } from "../src/lib/campus/registry";
import {
  attemptOf, axisAsk, checklistFor, choosePack, content, domainName, gridRowOf,
  industryChoices, itemOf, levelOptions, menuContextOf, moveTo, openAttempt,
  optionGuidance, orgChoices, roleChoices, saveAnswer, savePicks, submit,
  viewOf, wordingOf, type CampusEntry,
} from "../src/lib/me-v3/runtime/session";
import { stable } from "../src/lib/me-v3/scoring/fixtures";
import type { Answer, Tier } from "../src/lib/me-v3/scoring/types";
import type { V3Attempt } from "../src/lib/me-v3/runtime/session";

loadEnv();

const BUILDING = registry().cores
  .filter((c: { status: string }) => c.status === "building")
  .map((c: { code: string }) => c.code)
  .filter((c: string) => hasCoreFile(c, "items"));
const CORES = (process.env.CORES ?? BUILDING.join(",")).split(",");
const OUT = process.env.OUT ?? "var/content-qa";

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

async function screenText(
  core: string, a: V3Attempt, v: Awaited<ReturnType<typeof viewOf>>,
): Promise<string> {
  const sc = v.screen;
  const out: string[] = [];
  out.push(`### [${sc.kind}] ${sc.id}`);
  if (sc.strip) out.push(`띠: ${sc.strip}`);
  if (sc.eyebrow) out.push(`머리말: ${sc.eyebrow}`);
  if (sc.subject) out.push(`주어: ${sc.subject}`);
  if (sc.question) out.push(`질문: ${sc.question}`);
  if (sc.help) out.push(`도움말: ${sc.help}`);
  for (const b of sc.body ?? []) out.push(`본문: ${b}`);
  for (const c of sc.chips ?? []) out.push(`칩: ${c}`);
  for (const s of sc.sections ?? []) {
    out.push(`묶음: ${s.name}`);
    for (const l of s.lines) out.push(`  - ${l}`);
  }
  const ctx = await menuContextOf(a);
  for (const id of sc.items) {
    const it = itemOf(core, id);
    if (!it) { out.push(`문항: ${id} — 은행에 없다`); continue; }
    const label = sc.kind === "sweep" ? gridRowOf(core, it.technical_domain ?? "")
      : sc.items.length > 1 ? wordingOf(core, id, a.education_stage) : null;
    const stem = wordingOf(core, id, a.education_stage);
    out.push(`문항 ${id} [${it.technical_domain ?? "-"}·${it.evidence_axis ?? "-"}]`);
    if (label && label !== stem) out.push(`  줄: ${label}`);
    out.push(`  문면: ${stem}`);
    const control = controlOf(it, ctx);
    if (control.kind === "level") {
      out.push(`  보기(은행): ${control.options.join(" | ")}`);
      out.push(`  보기 읽는 법: ${control.guide}`);
    } else if (control.kind === "scale5") {
      out.push(`  보기: ${control.labels.join(" | ")}`);
    } else if (control.kind === "exposure") {
      out.push(`  보기: ${control.options.join(" | ")}`);
    } else if (control.kind === "steps") {
      out.push(`  단계(${control.answer}): ${control.options.map((o) => o.full).join(" | ")}`);
    } else if (control.kind === "choice") {
      out.push(`  보기: ${control.options.map((o) => o.label).join(" | ")}`);
    }
  }
  if (sc.kind === "checklist" && sc.domain) {
    out.push(`근거 영역: ${domainName(core, sc.domain)}`);
    for (const g of checklistFor(core, sc.domain)) {
      const head = g.slot === "ARTIFACT" || g.slot === "VERIFY" ? g.label : axisAsk(g.slot);
      out.push(`  묶음: ${head}`);
      for (const t of g.items) out.push(`    · ${t}`);
    }
  }
  if (sc.kind === "pick-industry") {
    for (const p of industryChoices(core)) out.push(`  산업: ${p.name}`);
  }
  if (sc.kind === "pick-role") {
    for (const p of roleChoices(core)) out.push(`  역할: ${p.name}`);
  }
  if (sc.kind === "pick-org") {
    for (const p of orgChoices(core)) out.push(`  조직: ${p.name}`);
  }
  return out.join("\n");
}

/** 사람 하나의 답을 실제 runtime 에 넣는다. 지나온 화면 글자를 돌려준다 */

/** 쪽마다 세로로 어디까지 찼는지(0~100) */
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

function pageText(file: string, n: number): string {
  try {
    return execFileSync("pdftotext", ["-f", String(n), "-l", String(n), file, "-"],
      { encoding: "utf8" });
  } catch { return ""; }
}

/**
 * **판정 지문.** 판본 칸을 뺀 채점 스냅샷과 결과 모델.
 *
 * 판본은 이름표이고 판정이 아니다. 문면을 고치면 문항 은행 판본이 올라가야
 * 하는데(저장소 규칙), 그 값을 지문에 넣으면 **글자 하나 고친 회차가
 * 판정이 달라진 회차로 보인다.** 그래서 판본은 따로 적어 두고 견준다.
 */
const JUDGMENT_SKIP = /version/i;
/**
 * **지문에서 빼는 칸.**
 *
 * `module_versions` 와 판본 칸은 이름표다: 문면을 고치면 은행 판본이
 * 올라가야 하는데(저장소 규칙) 그 값을 지문에 넣으면 **글자 하나 고친
 * 회차가 판정이 달라진 회차로 보인다.**
 *
 * `attempt_id` 는 더 나쁘다. DB 가 매기는 수라 **같은 응답을 다시 돌릴
 * 때마다 달라진다.** 한 번 그것을 넣은 채로 전후를 견주어, 아무것도
 * 바뀌지 않은 Core 의 지문이 달라진 것으로 읽혔다.
 */
function stripJudgment(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(stripJudgment);
  if (x && typeof x === "object") {
    return Object.fromEntries(Object.entries(x as Record<string, unknown>)
      .filter(([k]) => !JUDGMENT_SKIP.test(k) && k !== "module_versions" && k !== "attempt_id")
      .map(([k, v]) => [k, stripJudgment(v)]));
  }
  return x;
}

function judgmentOf(snap: unknown, model: unknown): { fp: string; body: string } {
  const body = stable({ snap: stripJudgment(snap), model: stripJudgment(model) });
  return { fp: createHash("sha256").update(body).digest("hex").slice(0, 16), body };
}

type Row = {
  core: string; person: string; tier: Tier; pages: number; kb: number;
  perPage: number[]; pageFill: number[]; fp: string; versions: Record<string, string>;
  screens: number; problems: string[];
};

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const rows: Row[] = [];
  try {
    for (const core of CORES) {
      if (coreEntry(core).open_to_students === false) assertPreviewServer(core);
    }
    for (const core of CORES) {
      const leaf = leafOf(core);
      for (const pol of PEOPLE) {
        const problems: string[] = [];
        const tag = `${core.toLowerCase().replace(/_core_v\d$/, "").replace(/_/g, "-")}-${pol.id}`;
        const mail = `cqa-${tag}@test.invalid`;
        const st = await makeStudent(mail);
        await query(
          `INSERT INTO entitlements
             (user_id, product_code, kind, tier, major_code, assessment_version, status)
           VALUES ($1,$2,'report','PRO','ME','ME_V3_2','active')`,
          [st.id, "ME_V3_PRO_KR"]);
        const a = await openAttempt({
          userId: st.id, tier: "PRO", stage: "bachelor", gradField: null, campus: leaf,
        });
        if (a.core_code !== core) problems.push(`응시 줄의 Core 가 ${a.core_code} 다`);
        const screens = await answerAll(core, a, st.id, pol, screenText);
        writeFileSync(`${OUT}/${core}-${pol.id}.screens.txt`,
          `${core} · 사람 ${pol.id} — ${pol.name}\n\n${screens.join("\n\n")}\n`);
        const done = (await attemptOf(a.id, st.id)) as V3Attempt;
        const { snapshot } = await submit(done);
        if (!snapshot) problems.push("결과가 만들어지지 않았다");
        const snapRow = await queryOne<{
          payload: unknown; result_model: unknown; module_versions: Record<string, string>;
        }>(`SELECT payload, result_model, module_versions FROM v3_snapshots
              WHERE attempt_id=$1 ORDER BY id DESC LIMIT 1`, [a.id]);
        const { fp, body } = judgmentOf(snapRow?.payload, snapRow?.result_model);
        /* **지문만 적지 않는다.** 달라진 날 무엇이 달라졌는지 보려면 값이
           있어야 하고, 해시만으로는 `달라졌다` 까지만 알 수 있다 */
        writeFileSync(`${OUT}/${core}-${pol.id}.judgment.json`, `${body}\n`);

        const ctx = await browser.newContext({
          viewport: { width: 1200, height: 900 },
          ...(gate ? { httpCredentials: gate } : {}),
        });
        const p = await login(ctx, mail, st.pw);
        await p.goto(`${BASE}/v3/${a.id}/result`, { waitUntil: "domcontentloaded" });
        await p.locator(".rs-openbtn").first().click({ timeout: 3000 }).catch(() => undefined);
        await p.waitForTimeout(400);
        const web = await p.locator("body").innerText();
        writeFileSync(`${OUT}/${core}-${pol.id}.web.txt`, web);
        const res = await p.request.get(`${BASE}/v3/${a.id}/result/pdf`, { timeout: 180000 });
        const file = `${OUT}/${core}-${pol.id}.pdf`;
        let pages = 0, kb = 0; let pageFill: number[] = [];
        const perPage: number[] = [];
        if (res.status() !== 200 || !(res.headers()["content-type"] ?? "").includes("pdf")) {
          problems.push(`PDF ${res.status()} ${res.headers()["content-type"] ?? ""}`);
        } else {
          writeFileSync(file, await res.body());
          kb = Math.round(statSync(file).size / 1024);
          const raw = readFileSync(file, "latin1");
          pages = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
          const texts: string[] = [];
          for (let n = 1; n <= pages; n += 1) texts.push(pageText(file, n));
          writeFileSync(`${OUT}/${core}-${pol.id}.txt`, texts.join("\n\f\n"));
          for (const t of texts) perPage.push(t.replace(/\s+/g, "").length);
          pageFill = fillOf(file);
        }
        await ctx.close();
        rows.push({
          core, person: pol.id, tier: a.tier, pages, kb, perPage, pageFill, fp,
          versions: snapRow?.module_versions ?? {}, screens: screens.length, problems,
        });
        console.log(`  ${core} ${pol.id} — 화면 ${screens.length} · ${pages}쪽 · ${kb}KB `
          + `· 지문 ${fp}`
          + (problems.length ? ` · 걸림 ${problems.join(" / ")}` : ""));
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(`${OUT}/judgment.json`, `${JSON.stringify(rows, null, 1)}\n`);
  const bad = rows.filter((r) => r.problems.length);
  console.log(`\n${rows.length}벌 · 걸림 ${bad.length}벌 · ${OUT}/judgment.json 에 지문`);
  if (bad.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
