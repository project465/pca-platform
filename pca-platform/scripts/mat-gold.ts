/**
 * **MAT 이 AI 없이 공고와 메모를 얼마나 바르게 읽는가.**
 *
 *   npm run mat:gold                      # 시험지 셋을 차례로 (A 개발용 · B · C 따로 쓴 것)
 *   FILE=<시험지> npm run mat:gold         # 하나만
 *   SHOW=1 npm run mat:gold               # 틀린 줄을 전부 찍는다
 *
 * DB 를 쓰지 않는다. 규칙(`src/lib/assistant/rules.ts`)에 글을 넣고 나온 값을
 * 시험지의 정답과 견준다. 시험지의 정답은 규칙을 고치기 **전에** 적었다.
 *
 * **개발용 시험지만 통과하는 것은 증거가 아니다.** 고치면서 계속 들여다본
 * 시험지라 거기에 맞춰졌을 수 있다. 그래서 다른 사람이 따로 쓴 시험지를 같은
 * 자로 잰다. 둘의 점수가 크게 갈리면 규칙이 시험지에 맞춰진 것이다.
 *
 * 재는 것:
 * - 공고: 요구 항목을 빠뜨리지 않았는가 · 필수/우대 · 영역 · 요구 항목이 아닌
 *   줄(머리말·마감·근무조건)을 항목으로 세우지 않았는가 · 마감일
 * - 메모: 영역 · 경험 종류 · 직접 정한 것을 알아보았는가(보기를 켰거나, 그 문장을
 *   돌려주며 물었거나) · **정한 것이 없는 메모에 정한 것을 켜지 않았는가** ·
 *   남은 것 · 제목이 말 중간에서 끊기지 않았는가
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { decidedClausesOf, draftByRules, readPosting } from "../src/lib/assistant/rules";

/* 시험지를 고르지 않으면 셋을 차례로 돈다. 하나라도 걸리면 실패다 */
if (!process.env.FILE) {
  let failed = 0;
  for (const f of ["mat-gold.json", "mat-gold-b.json", "mat-gold-c.json"]) {
    const r = spawnSync(process.execPath, [...process.execArgv, process.argv[1]], {
      env: { ...process.env, FILE: `scripts/fixtures/${f}` }, stdio: "inherit",
    });
    if (r.status !== 0) failed += 1;
  }
  console.log(`\n시험지 3벌 가운데 걸린 것 ${failed}`);
  process.exit(failed ? 1 : 0);
}

type GoldItem = { snippet: string; kind: "must" | "nice"; domain: string | null; alt?: (string | null)[] };
type GoldPosting = {
  id: string; core: string; text: string; deadline: string | null;
  items: GoldItem[]; not_items: string[];
};
type GoldMemo = {
  id: string; core: string; text: string; kind: string | null;
  domains: string[]; has_decision: boolean; has_artifact: boolean;
};
type Gold = {
  today?: string; postings: GoldPosting[]; memos: GoldMemo[];
  thresholds?: Record<string, number>;
};

const FILE = process.env.FILE!;
const SHOW = process.env.SHOW === "1";
const gold = JSON.parse(readFileSync(FILE, "utf8")) as Gold;
const DEV = JSON.parse(readFileSync("scripts/fixtures/mat-gold.json", "utf8")) as Gold;
const TH = gold.thresholds ?? DEV.thresholds ?? {};
const today = new Date(`${gold.today ?? "2026-10-24"}T00:00:00Z`);

const notes: string[] = [];
const say = (s: string) => { if (SHOW) console.log(s); else notes.push(s); };

/* ── 공고 ── */
let itemsTotal = 0, itemsFound = 0, kindOk = 0, domainOk = 0, junk = 0, dlOk = 0, extra = 0;
for (const p of gold.postings) {
  const r = readPosting(p.core, p.text, today);
  const used = new Set<number>();
  for (const g of p.items) {
    itemsTotal += 1;
    const i = r.requirements.findIndex((x, k) => !used.has(k) && (x.text.includes(g.snippet) || g.snippet.includes(x.text.replace(/…$/, ""))));
    if (i < 0) { say(`  [${p.id}] 빠짐      ${g.snippet}`); continue; }
    used.add(i);
    itemsFound += 1;
    const x = r.requirements[i];
    if (x.kind === g.kind) kindOk += 1; else say(`  [${p.id}] 필수/우대 ${g.snippet} — ${x.kind} (정답 ${g.kind})`);
    const okDom = x.domain === g.domain || (g.alt ?? []).includes(x.domain);
    if (okDom) domainOk += 1; else say(`  [${p.id}] 영역      ${g.snippet} — ${x.domain ?? "없음"} (정답 ${g.domain ?? "없음"}${g.alt?.length ? ` · ${g.alt.join("/")}` : ""})`);
  }
  /* **덤 줄은 시험지가 요구 항목이 아니라고 적은 줄만 센다.** 정답에도 덤 목록에도
     없는 줄은 시험지 쓴 사람이 비워 둔 줄이라 틀렸다고 하지 않고 따로 센다 */
  r.requirements.forEach((x, k) => {
    if (used.has(k)) return;
    const bare = x.text.replace(/…$/, "");
    if (p.not_items.some((n) => bare.includes(n) || n.includes(bare))) {
      junk += 1;
      say(`  [${p.id}] 덤 줄     ${x.text}`);
    } else extra += 1;
  });
  if (r.deadline === p.deadline) dlOk += 1;
  else say(`  [${p.id}] 마감      ${r.deadline ?? "없음"} (정답 ${p.deadline ?? "없음"})`);
}

/* ── 메모 ── */
let mDom = 0, mKind = 0, mDecTot = 0, mDecOk = 0, mFalseDec = 0, mArtTot = 0, mArtOk = 0, mFalseArt = 0, mTitle = 0;
for (const m of gold.memos) {
  const d = draftByRules(m.core, m.text);
  if (d.td.some((x) => m.domains.includes(x)) && m.domains.includes(d.td[0])) mDom += 1;
  else say(`  [${m.id}] 영역      ${d.td.join(",") || "없음"} (정답 ${m.domains.join("/")})`);
  if (d.kind === m.kind) mKind += 1; else say(`  [${m.id}] 종류      ${d.kind ?? "없음"} (정답 ${m.kind ?? "없음"})`);
  /* 정한 것을 말하는 마디가 있을 때만 그 말을 돌려주며 묻는다 */
  const quoted = d.ask.some((q) => q.includes("부분이 직접 정한 것으로 보입니다"))
    && decidedClausesOf(m.text).length > 0;
  if (m.has_decision) {
    mDecTot += 1;
    if (d.decisions.length || quoted) mDecOk += 1;
    else say(`  [${m.id}] 정한 것   알아보지 못함`);
  } else if (d.decisions.length || quoted) {
    mFalseDec += 1;
    say(`  [${m.id}] 정한 것   없는데 켰다 — ${d.decisions.join(" | ") || "(질문으로 되물음)"}`);
  }
  /* 남은 것: 보기를 켰거나, 메모에 적힌 이름을 돌려주며 물었으면 알아본 것이다 */
  const artQuoted = d.ask.some((q) => q.includes("에 가장 가까운 것을 마지막 단계에서"));
  if (m.has_artifact) {
    mArtTot += 1;
    if (d.artifacts.length || artQuoted) mArtOk += 1; else say(`  [${m.id}] 남은 것   못 찾음`);
  } else if (d.artifacts.length) {
    mFalseArt += 1;
    say(`  [${m.id}] 남은 것   없는데 켰다 — ${d.artifacts.join(" | ")}`);
  }
  const t = d.title;
  const clean = t.length >= 4 && t.length <= 48 && !/[\s,]$/.test(t)
    && !/(을|를|이|가|은|는|의|에|와|과|로|에서|하고)$/.test(t);
  if (clean) mTitle += 1; else say(`  [${m.id}] 제목      "${t}"`);
  if (SHOW) {
    console.log(`  [${m.id}] → ${d.kind ?? "-"} · ${d.td.join(",")} · 정한 것 ${d.decisions.length} · 남은 것 ${d.artifacts.join("/") || "-"} · 견준 것 ${d.verifications.length}`);
    for (const q of d.ask) console.log(`           ? ${q}`);
  }
}

const ratio = (a: number, b: number) => (b ? a / b : 1);
const rows: [string, number, string, boolean][] = [];
const row = (k: string, v: number, fmt: string, pass: boolean) => rows.push([k, v, fmt, pass]);
const ge = (k: string, v: number) => row(k, v, `${(v * 100).toFixed(0)}%  (하한 ${((TH[k] ?? 0) * 100).toFixed(0)}%)`, v >= (TH[k] ?? 0));
const le = (k: string, v: number) => row(k, v, `${v}  (상한 ${TH[k] ?? 0})`, v <= (TH[k] ?? 0));

ge("posting_item_recall", ratio(itemsFound, itemsTotal));
ge("posting_kind_accuracy", ratio(kindOk, itemsFound));
ge("posting_domain_accuracy", ratio(domainOk, itemsFound));
le("posting_junk_max", junk);
ge("deadline_accuracy", ratio(dlOk, gold.postings.length));
ge("memo_domain_hit", ratio(mDom, gold.memos.length));
ge("memo_kind_accuracy", ratio(mKind, gold.memos.length));
ge("memo_decision_quoted", ratio(mDecOk, mDecTot));
le("memo_false_decision_max", mFalseDec);
ge("memo_artifact_hit", ratio(mArtOk, mArtTot));
le("memo_false_artifact_max", mFalseArt);
ge("memo_title_clean", ratio(mTitle, gold.memos.length));

console.log(`\nMAT 규칙 읽기 · ${FILE} · 공고 ${gold.postings.length} (항목 ${itemsTotal}) · 메모 ${gold.memos.length}\n`);
if (extra) console.log(`  (시험지에 표시가 없는 줄 ${extra}개는 맞고 틀림을 세지 않았다)\n`);
const NAME: Record<string, string> = {
  posting_item_recall: "공고 요구 항목을 찾았다",
  posting_kind_accuracy: "필수/우대를 맞게 갈랐다",
  posting_domain_accuracy: "업무 영역을 맞게 이었다",
  posting_junk_max: "요구 항목이 아닌 줄을 세웠다",
  deadline_accuracy: "마감일을 맞게 읽었다",
  memo_domain_hit: "메모 영역이 맞다",
  memo_kind_accuracy: "경험 종류가 맞다",
  memo_decision_quoted: "직접 정한 것을 알아보았다",
  memo_false_decision_max: "정한 것이 없는데 켰다",
  memo_artifact_hit: "남은 것을 알아보았다",
  memo_false_artifact_max: "남은 것이 없는데 켰다",
  memo_title_clean: "제목이 말 중간에서 끊기지 않았다",
};
for (const [k, , fmt, pass] of rows) console.log(`  ${pass ? "통과" : "걸림"}  ${NAME[k].padEnd(18)} ${fmt}`);
const bad = rows.filter((r) => !r[3]).length;
if (!SHOW && notes.length) {
  console.log(`\n틀린 줄 ${notes.length}개 (전부 보려면 SHOW=1):`);
  console.log(notes.slice(0, 25).join("\n"));
}
console.log(`\n통과 ${rows.length - bad} · 걸림 ${bad}`);
process.exit(bad ? 1 : 0);
