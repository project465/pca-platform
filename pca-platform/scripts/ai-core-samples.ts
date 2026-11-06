/**
 * 인공지능 Core(AI_CORE_V1) 견본 세 벌. **제품과 같은 길**로 응시를 세우고 결과 책자(PDF)를 뽑는다.
 *
 * 전주대 인공지능학과 학생 줄을 **운영과 같은 모양**으로 적는다: 학과 JJU26_AI · 갈래 칸은 옛 값 SPEC_CS_AI.
 * 응시를 여는 맥락은 그 줄이 아니라 등록부에서 다시 읽은 값이라(`campusStudentContext`) AI_CORE_V1 ·
 * SPEC_AI_DATA 로 열려야 한다. 11/03 전에 컴퓨터 묶음으로 낸 결과가 그대로 남는지도 한 사람으로 본다.
 *
 * 로컬 DB 에만 쓴다. 운영 · 미리보기 DB 에 쓰지 않는다(주소가 127.0.0.1 · localhost 가 아니면 멈춘다).
 *
 *   DATABASE_URL=postgres://...@127.0.0.1:.../db CHROME=<chrome.exe> npx tsx scripts/ai-core-samples.ts
 *   OUT=docs/ai-core-samples-1106   SETS=A,B,C
 *   WEB=http://127.0.0.1:3100        띄운 서버(`scripts/stage-serve.sh`, 같은 DB)가 있으면 웹 결과 화면 글자와 그림도 남긴다.
 *                                    견본 계정에 그 자리에서 만든 비밀번호를 걸고 로그인한다(값은 어디에도 적지 않는다)
 *
 * 답안(전부 지어낸 것):
 *   A 강함   관심 높음 · 여러 번 해 봄 · 판단은 `기준까지 직접 정함` · 체크리스트 둘씩 · 제조 AI · ML 엔지니어
 *   B 섞임   문제 정의 · 정제 · 평가 · 통계 쪽은 높고 비전 · 로봇 · 경량화는 낮음 · 판단 단계 섞음 · 플랫폼·추천 · 데이터 사이언티스트
 *   C 모름   관심 · 배울 뜻 대부분 `모르겠다` · 해 본 적 거의 없음 · 직접 쓴 문장 다섯 · 공공·행정 AI · AI 서비스 기획
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { controlOf } from "../src/lib/me-v3/runtime/menus";
import {
  attemptOf, checklistFor, choosePack, content, itemOf, menuContextOf, moveTo, openAttempt, saveAnswer, saveNote,
  savePicks, submit, viewOf, industryChoices, roleChoices, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import { UNKNOWN, type Answer } from "../src/lib/me-v3/scoring/types";
import { buildLongReport } from "../src/lib/me-v3/report-long";
import { isNoneChoice } from "../src/lib/me-v3/result/text.ko";
import { coreFile } from "../src/lib/me-v3/core-registry";
import { campusStudentContext } from "../src/lib/campus/students";
import { campusAttemptState } from "../src/lib/campus/attempt-state";
import { findLeaf, university } from "../src/lib/campus/registry";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { randomBytes } from "node:crypto";

const DB = process.env.DATABASE_URL ?? "";
if (!/@(127\.0\.0\.1|localhost)(:\d+)?\//.test(DB)) throw new Error("로컬 DB 에서만 돈다");

const OUT = path.resolve(process.env.OUT ?? "docs/ai-core-samples-1106");
const SETS = (process.env.SETS ?? "A,B,C").split(",") as Set[];
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FONT = `file:///${path.resolve("public/fonts/cm-book").replace(/\\/g, "/")}/`;
type Set = "A" | "B" | "C";
const AI = "AI_CORE_V1";

/** B 가 높게 · 낮게 답하는 영역 */
const B_HIGH = new Set(["TD01", "TD03", "TD05", "TD11"]);
const B_LOW = new Set(["TD07", "TD08", "TD10"]);
/**
 * B 가 판단까지 물린 영역에서 답하는 깊이. 관심이 높아도 해 본 깊이는 영역마다 다르다:
 * 문제 정의는 기준까지 · 정제는 직접 · 평가는 시킨 대로와 직접 · 통계는 거의 없음
 */
const B_DEPTH: Record<string, { level: (n: number) => number; picks: number; none: boolean }> = {
  TD01: { level: () => 3, picks: 2, none: false },
  TD03: { level: () => 2, picks: 1, none: false },
  TD05: { level: (n) => [1, 2][n % 2], picks: 1, none: false },
  TD11: { level: (n) => n % 3 === 0 ? 1 : 0, picks: 0, none: true },
};

/** C 가 직접 쓴 문장(학생 말투). 칸 이름은 `TRANS_NOTE_KO` */
const C_NOTES: Record<string, string> = {
  TR_T1: "수업 과제로 상품 리뷰를 긍정과 부정으로 나누는 모델을 만들었습니다",
  TR_T2: "정확도는 높게 나왔는데 부정 리뷰를 많이 놓쳤습니다",
  TR_T3: "리뷰를 더 모으는 방법도 생각했지만 시간이 없어서 못 했습니다",
  TR_T4: "조교님이 정해 준 데이터 나누는 방식은 그대로 썼습니다",
  TR_T5: "두 번 정도 고쳐서 다시 돌려 봤습니다",
};
const C_JUDGE_NOTE = "기준은 제가 정했다기보다 팀원과 같이 정했습니다";

const PACKS: Record<Set, { industry: string; role: string }> = {
  A: { industry: "INDUSTRY_SMARTFAC_V1", role: "ROLE_MLENG_V1" },
  B: { industry: "INDUSTRY_RECSYS_V1", role: "ROLE_DATASCI_V1" },
  C: { industry: "INDUSTRY_GOVAI_V1", role: "ROLE_AIPM_V1" },
};

async function student(tag: string, specialization: string | null): Promise<string> {
  const id = (await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash) VALUES ($1,$2,'x') RETURNING id::text`,
    [`ai-sample-${tag}-${Date.now()}@example.invalid`, `견본 ${tag}`]))!.id;
  await query(`INSERT INTO entitlements (user_id, product_code, kind, tier, major_code, assessment_version, status)
               VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [id]);
  const u = university("JJU")!;
  const leaf = findLeaf(u, "JJU26_AI")!;
  await query(`INSERT INTO campus_students (user_id, university_code, student_id, college_code, department_code, specialization)
               VALUES ($1::bigint,'JJU',$2,$3,'JJU26_AI',$4)`,
  [id, `2026${tag}${String(Date.now()).slice(-4)}`, leaf.college.code, specialization]);
  return id;
}

/** 영역 순번 i 의 첫 세 칸(관심 · 해 본 정도 · 배울 뜻) */
function grid(set: Set, td: string, i: number): [Answer, Answer, Answer] {
  if (set === "A") return [{ kind: "scale5", value: 5 }, { kind: "exposure", value: 2 }, { kind: "scale5", value: 5 }];
  if (set === "B") {
    const v = B_HIGH.has(td) ? 5 : B_LOW.has(td) ? 1 : 3;
    const e = B_HIGH.has(td) ? 2 : B_LOW.has(td) ? 0 : 1;
    return [{ kind: "scale5", value: v }, { kind: "exposure", value: e }, { kind: "scale5", value: B_LOW.has(td) ? 2 : 4 }];
  }
  const unk: Answer = { kind: "choice", value: UNKNOWN };
  return [i % 3 === 2 ? { kind: "scale5", value: 3 } : unk, { kind: "exposure", value: i % 4 === 0 ? 1 : 0 },
    i % 4 === 3 ? { kind: "scale5", value: 3 } : unk];
}

async function walk(a0: V3Attempt, userId: string, set: Set): Promise<void> {
  const tds = content(AI).domains.domains.map((d) => d.code);
  for (const [i, td] of tds.entries()) {
    const [int, exp] = grid(set, td, i);
    await saveAnswer(a0.id, `G_${td}_INT`, int);
    await saveAnswer(a0.id, `G_${td}_EXP`, exp);
  }
  /* 배울 뜻은 선별된 영역에만 화면이 묻는다. 그 칸이 화면에 설 때 답한다 */
  const leaOf = new Map(tds.map((td, i) => [`G_${td}_LEA`, grid(set, td, i)[2]]));
  /* 목표 직무 · 산업을 묻는 보기는 이 답안이 고른 팩과 같은 이름으로 답한다 */
  const want = new Set([
    industryChoices(AI).find((x) => x.code === PACKS[set].industry)?.name,
    roleChoices(AI).find((x) => x.code === PACKS[set].role)?.name,
  ].filter(Boolean) as string[]);
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let next: string | null = null, guard = 0, n = 0, judgeNoted = false;
  for (;;) {
    if ((guard += 1) > 500) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, next);
    const ctx = await menuContextOf(a);
    const td = v.screen.domain ?? null;
    const bd = set === "B" && td ? B_DEPTH[td] : undefined;
    const hi = set === "A" || (!!bd && bd.picks >= 2);
    const lo = set === "C" || (set === "B" && !!td && B_LOW.has(td)) || (!!bd && bd.none);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const it = itemOf(AI, id);
      if (!it) continue;
      const control = controlOf(it, ctx);
      n += 1;
      let ans: Answer | null = leaOf.get(id) ?? null;
      if (ans) { /* 배울 뜻 칸 */ } else if (control.kind === "level") {
        const idx = bd ? bd.level(n) : hi ? 3 : lo ? (set === "C" ? n % 2 : 0) : [1, 2][n % 2];
        ans = { kind: "level", index: Math.min(idx, control.options.length - 1) };
      } else if (control.kind === "scale5") {
        ans = set === "C" && n % 2 === 0 ? { kind: "choice", value: UNKNOWN } : { kind: "scale5", value: hi ? 5 : lo ? 2 : 3 };
      } else if (control.kind === "exposure") {
        ans = { kind: "exposure", value: hi ? 2 : lo ? 0 : 1 };
      } else if (control.kind === "steps") {
        const real = control.options.filter((o) => o.value !== null);
        const unknown = control.options.find((o) => o.value === null);
        if (set === "C" && unknown) ans = { kind: "choice", value: UNKNOWN };
        else {
          const pick = hi ? real[real.length - 1] : lo ? real[0] : real[Math.floor(real.length / 2)];
          ans = control.answer === "exposure" ? { kind: "exposure", value: pick.value as number } : { kind: "scale5", value: pick.value as number };
        }
      } else if (control.kind === "choice" && control.options.length) {
        const none = control.options.find((o) => isNoneChoice(o.label));
        const some = control.options.filter((o) => !isNoneChoice(o.label));
        let o = some.find((x) => want.has(x.label)) ?? some[0] ?? control.options[0];
        if (want.has(o.label)) { await saveAnswer(a.id, id, { kind: "choice", value: o.value }); continue; }
        if (lo && none && set !== "C") o = none;
        if (set === "C") o = none && n % 2 === 0 ? none : some[n % Math.max(1, some.length)] ?? o;
        ans = { kind: "choice", value: o.value };
      }
      if (ans) await saveAnswer(a.id, id, ans);
      if (set === "C") {
        if (C_NOTES[id]) await saveNote(a.id, id, C_NOTES[id]);
        else if (!judgeNoted && control.kind === "level") { await saveNote(a.id, id, C_JUDGE_NOTE); judgeNoted = true; }
      }
    }
    if (v.screen.kind === "checklist" && v.screen.domain) {
      for (const g of checklistFor(AI, v.screen.domain)) {
        const k = bd ? bd.picks : hi ? 2 : lo ? 0 : 1;
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, k));
      }
    }
    if (v.screen.kind === "pick-industry") await choosePack(AI, a.id, "industry", PACKS[set].industry);
    if (v.screen.kind === "pick-role") await choosePack(AI, a.id, "role", PACKS[set].role);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    next = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
}

/** 웹 결과 화면(`/v3/{id}/result`)의 글자와 전체 그림. 로그인은 그 자리에서 만든 비밀번호로 한다 */
async function web(uid: string, attemptId: string, dir: string): Promise<string[]> {
  const base = (process.env.WEB ?? "").replace(/\/$/, "");
  const login = `ai-sample-${attemptId}`;
  const pw = randomBytes(18).toString("base64url");
  await query(`UPDATE users SET login_id = $2, password_hash = $3, status = 'active', must_reset_pw = false WHERE id = $1`,
    [uid, login, await hashPassword(pw)]);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  try {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
    await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', login);
    await p.fill('input[type="password"]', pw);
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 }).catch(() => undefined);
    const res = await p.goto(`${base}/v3/${attemptId}/result`, { waitUntil: "networkidle" });
    /* 접힌 자리를 모두 펴고 읽는다 */
    await p.evaluate(`document.querySelectorAll("details").forEach((d) => { d.open = true; })`);
    const text = await p.evaluate("document.querySelector('main')?.innerText ?? document.body.innerText") as string;
    writeFileSync(path.join(dir, "web.txt"), `상태 ${res?.status()} · ${new URL(p.url()).pathname}\n\n${text.replace(/\n{2,}/g, "\n").trim()}\n`);
    await p.screenshot({ path: path.join(dir, "web.png"), fullPage: true });
    return scan(text);
  } finally { await b.close(); }
}

/** 인공지능 학생 책자에 서면 안 되는 말. 다른 Core 의 영역 이름과 안쪽 코드와 쓰지 않는 말 */
function scan(text: string): string[] {
  const flat = text.replace(/\s+/g, " ");
  const out: string[] = [];
  const cs = coreFile<{ domains: { name: string }[] }>("CS_CORE_V1", "domains").domains.map((d) => d.name);
  const ai = new Set(coreFile<{ domains: { name: string }[] }>(AI, "domains").domains.map((d) => d.name));
  const rules: [string, RegExp][] = [
    ...cs.filter((n) => !ai.has(n)).map((n) => [`컴퓨터 영역 '${n}'`, new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))] as [string, RegExp]),
    ["게임", /게임/], ["컴퓨터·소프트웨어", /컴퓨터·소프트웨어|컴퓨터 ?소프트웨어 진로/],
    ["강점/약점", /강점|약점/], ["보완하세요", /보완하세요|보완해야/],
    ["안쪽 코드", /\bTD\d{2}\b|ROLE_|INDUSTRY_|_CORE_V\d|undefined|NaN|\bnull\b/],
    ["대시", /[—–]/],
  ];
  for (const [name, re] of rules) {
    const g = new RegExp(re.source, "g");
    for (const m of flat.matchAll(g)) out.push(`${name}: …${flat.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + 40)}…`);
  }
  return out;
}

async function book(attemptId: string, dir: string): Promise<{ pages: number; hits: string[]; core: string }> {
  const rep = await buildLongReport(attemptId, { fontBase: FONT });
  mkdirSync(dir, { recursive: true });
  /* 책 HTML 은 PDF 와 같은 내용이라 견본 자리에 두지 않는다 */
  const hf = path.join(tmpdir(), `ai-core-book-${attemptId}.html`);
  writeFileSync(hf, rep.html);
  const b = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  let text = "", pages = 0;
  try {
    const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
    await p.goto("file:///" + hf.replace(/\\/g, "/"), { waitUntil: "load" });
    await p.evaluate("document.fonts.ready");
    await p.emulateMedia({ media: "print" });
    await p.waitForSelector("html[data-packed]", { timeout: 30000 });
    /* 쪽마다 보이는 글자. PDF 에서 글자를 뽑으면 한글 글꼴 조각이 깨져 나와 그린 쪽에서 직접 읽는다 */
    const texts = await p.evaluate(`[...document.querySelectorAll("section.pg")].map((s) => s.innerText)`) as string[];
    text = texts.map((t, i) => `==== ${i + 1}쪽 ====\n${t.replace(/\n{2,}/g, "\n").trim()}`).join("\n\n");
    pages = texts.length;
    await p.pdf({ path: path.join(dir, "book.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally { await b.close(); }
  writeFileSync(path.join(dir, "book.txt"), text + "\n");
  return { pages, hits: scan(text), core: rep.core };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const lines: string[] = [];

  /* 11/03 전에 컴퓨터 묶음으로 끝낸 학생 한 사람: 그 결과가 그대로인가, 다시 열면 어디로 가는가 */
  const oldUid = await student("OLD", "SPEC_CS_AI");
  const oldCtx = (await campusStudentContext(oldUid))!.ctx;
  const old = await openAttempt({ userId: oldUid, tier: "PRO", stage: "bachelor", gradField: null,
    campus: { ...oldCtx, core_code: "CS_CORE_V1", specialization: "SPEC_CS_AI" } });
  const oldRow = await queryOne<{ core_code: string; specialization_code: string | null }>(
    `SELECT core_code, specialization_code FROM v3_attempts WHERE id = $1`, [old.id]);
  /* 판단 단계까지 다 밟지 않아도 채점은 선다. 첫 격자만 답하고 낸다 */
  for (const d of content("CS_CORE_V1").domains.domains) {
    await saveAnswer(old.id, `G_${d.code}_INT`, { kind: "scale5", value: 3 });
    await saveAnswer(old.id, `G_${d.code}_EXP`, { kind: "exposure", value: 1 });
    await saveAnswer(old.id, `G_${d.code}_LEA`, { kind: "scale5", value: 3 });
  }
  await submit((await attemptOf(old.id, oldUid)) as V3Attempt);
  const st = await campusAttemptState(oldUid, { universityCode: "JJU", code: "JJU26_AI" });
  const oldBook = await buildLongReport(old.id, { fontBase: FONT });
  const oldTitle = /<h1 class="cv-t">([\s\S]*?)<\/h1>/.exec(oldBook.html)?.[1].replace(/<br>/g, " ") ?? "";
  lines.push("## 11/03 전 컴퓨터 묶음 응시(옛 학생 한 사람)", "",
    `- 등록 줄: 학과 JJU26_AI · 갈래 칸 SPEC_CS_AI`,
    `- 그 응시 줄: ${oldRow?.core_code} · ${oldRow?.specialization_code}`,
    `- 학과 쪽 단추 상태: ${st.kind}${"attemptId" in st ? ` (응시 ${st.attemptId})` : ""}`,
    `- 다시 뽑은 결과 책자의 Core: ${oldBook.core} · 표지 제목: ${oldTitle.trim()}`, "");

  lines.push("## 새 응시 세 벌", "", "| 답안 | 응시 줄 Core · 갈래 | 선별 · 심화 영역 | 산업 · 직무 | 쪽 | 걸린 말 |", "|---|---|---|---|---|---|");
  for (const set of SETS) {
    const uid = await student(set, "SPEC_CS_AI");
    const ctx = (await campusStudentContext(uid))!.ctx;
    const a0 = await openAttempt({ userId: uid, tier: "PRO", stage: "bachelor", gradField: null, campus: ctx });
    await walk(a0, uid, set);
    await submit((await attemptOf(a0.id, uid)) as V3Attempt);
    const r = (await queryOne<{ core_code: string; specialization_code: string; p: string[] | null; d: string[] | null; i: string | null; ro: string | null }>(
      `SELECT core_code, specialization_code, opened_probe AS p, opened_deep AS d, industry_pack AS i, role_pack AS ro FROM v3_attempts WHERE id = $1`, [a0.id]))!;
    const names = new Map(content(AI).domains.domains.map((d) => [d.code, d.name]));
    const nm = (xs: string[] | null) => (xs ?? []).map((x) => names.get(x) ?? x).join(" · ");
    const res = await book(a0.id, path.join(OUT, set));
    const webHits = process.env.WEB ? await web(uid, a0.id, path.join(OUT, set)) : [];
    writeFileSync(path.join(OUT, set, "hits.txt"), [...res.hits, ...webHits.map((h) => `웹 ${h}`)].join("\n") + "\n");
    lines.push(`| ${set} | ${r.core_code} · ${r.specialization_code} | ${nm(r.p)} / ${nm(r.d)} | ${r.i} · ${r.ro} | ${res.pages} | ${res.hits.length} |`);
    console.log(`${set} 응시 ${a0.id} ${r.core_code} ${res.pages}쪽 걸린 말 ${res.hits.length}`);
  }
  const sets = [
    "## 답안(전부 지어낸 것)", "",
    "- **A 강함**: 열두 영역 관심 높음 · 여러 번 해 봄 · 판단 단계는 모두 `기준까지 직접 정함` · 체크리스트 둘씩 · 제조 AI·스마트팩토리 · ML 엔지니어",
    "- **B 섞임**: 문제 정의 · 정제 · 평가 · 통계는 관심 높음, 비전 · 로봇 · 경량화는 낮음. 판단 깊이는 문제 정의 `기준까지` · 정제 `직접` · 평가 `시킨 대로`와 `직접` · 통계 거의 `없음` · 플랫폼·추천 · 데이터 사이언티스트",
    "- **C 모름**: 관심과 배울 뜻 대부분 `모르겠다` · 해 본 적 거의 없음 · 판단은 `없음`과 `시킨 대로` · 직접 쓴 문장 다섯(리뷰 감정 분류 수업 과제) · 공공·행정 AI · AI 서비스 기획",
    "", "파일: `<답안>/book.pdf`(PRO 책자) · `book.txt`(쪽마다 글자) · `hits.txt`(걸린 말, 비어 있으면 0)" + (process.env.WEB ? " · `web.txt` · `web.png`(웹 결과 화면)" : ""), "",
  ];
  writeFileSync(path.join(OUT, "run.md"), `# 인공지능 Core 견본(2026-11-06)\n\n${sets.join("\n")}\n${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
