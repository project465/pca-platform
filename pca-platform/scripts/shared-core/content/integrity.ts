/**
 * R38 콘텐츠 무결성 벤치마크 — OUT-1 · OUT-2 · OUT-3 · OUT-5 (+ 결과 연결 그래프 검사).
 *
 *   node --no-warnings --experimental-strip-types \
 *     --import ./scripts/shared-core/test/register.mjs scripts/shared-core/content/integrity.ts
 *   OUT=docs/shared-core/evidence/R38/content  (기본값)
 *
 * **엔진을 고치지 않는다.** 제품과 같은 `load · score · buildResult` 와 결과지 문장 함수
 * (`headlineKo · actionKo · gapKo`)를 부르고 그 출력을 잰다. 기존 동결 fixture 를 쓰지 않고
 * R37 벤치마크 사례(`bench/cases.ts`)를 그대로 다시 쓴다.
 *
 * 판정은 셋이고 **섞지 않는다**:
 *   PASS   기대가 섰다
 *   FAIL   기대가 서지 않았다 (엔진 쪽이면 결함 후보 · 이 검사 쪽이면 고친다)
 *   XFAIL  지금 엔진의 알려진 설계 동작과 어긋난다는 것을 **기록만** 한다(변경 계약 대상 ·
 *          엔진 수정 금지). 합격 통계에 넣지 않는다
 *
 * 숫자는 합성 사례의 규칙 일치율이다. 실제 추천 정확성 · 학생 타당성이 아니다.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { registry, coreFile, CONTENT_DIR } from "../../../src/lib/me-v3/core-registry";
import { load, score, coreOnly, type Loaded } from "../../../src/lib/me-v3/scoring/engine";
import { expand, stable } from "../../../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../../../src/lib/me-v3/result/build";
import { actionKo, gapKo, headlineKo } from "../../../src/lib/me-v3/result/text.ko";
import type { Snapshot, Submission } from "../../../src/lib/me-v3/scoring/types";
import type { ResultModel } from "../../../src/lib/me-v3/result/model";
import { BENCH_CORES, casesFor, type CaseSpec } from "../bench/cases";
import { confirmedKeys, submittedKeys, tally } from "../bench/keys";
import { BIZ_CASE, all } from "../fixtures/evidence";

const OUT = process.env.OUT ?? "docs/shared-core/evidence/R38/content";
type Verdict = "PASS" | "FAIL" | "XFAIL";
type Check = { id: string; family: string; verdict: Verdict; detail: string; contract?: string };
const h = (v: unknown) => createHash("sha256").update(typeof v === "string" ? v : stable(v)).digest("hex").slice(0, 12);

/* 결과 문장에서 `능력 부족` 으로 읽히는 말. 미확인 · 미응답을 이 말로 적으면 FAIL 이다 */
const DEFICIT = /부족|약점|약하|모자라|역량이 낮|능력이 없|못 합니다|미흡/;

function say(x: unknown): string {
  if (typeof x === "string") return x;
  const o = x as { do?: string; note?: string; guide?: string[] };
  return [o.do ?? "", o.note ?? "", ...(o.guide ?? [])].filter(Boolean).join(" / ");
}
function names(core: string): (td: string) => string {
  const t = coreFile<{ technical_domains: { code: string; name: string }[] }>(core, "taxonomy");
  const m = new Map(t.technical_domains.map((d) => [d.code, d.name]));
  return (td) => m.get(td) ?? td;
}

type Run = {
  spec: CaseSpec; sub: Submission; snap: Snapshot; model: ResultModel;
  headline: string; actions: string[]; gaps: string[];
};
function runOne(core: string, loaded: Loaded, spec: CaseSpec): Run {
  const sub = expand(spec.fixture, core);
  const snap = score(sub, loaded);
  const model = buildResult(snap, loaded);
  const name = names(core);
  const hl = headlineKo(model, name);
  return {
    spec, sub, snap, model,
    headline: `${hl.title} / ${hl.lead}`,
    actions: model.actions.map((a) => say(actionKo(a, a.domain ? name(a.domain) : "", snap.stage))),
    gaps: model.gaps.map((g) => { const t = gapKo(g, name(g.domain)); return `${t.title} / ${t.why} / ${t.detail}`; }),
  };
}

/* ── 사례마다의 검사 ─────────────────────────────────────────────── */

function candidateTexts(r: Run): Map<string, Set<string>> {
  const conf = new Set(confirmedKeys(r.snap));
  const confText = new Map<string, Set<string>>();
  for (const k of conf) {
    const [td, , ...t] = k.split("|");
    if (!confText.has(td)) confText.set(td, new Set());
    confText.get(td)!.add(t.join("|"));
  }
  const out = new Map<string, Set<string>>();
  for (const k of submittedKeys(r.sub)) {
    if (conf.has(k)) continue;
    const [td, , ...t] = k.split("|");
    const text = t.join("|");
    if (confText.get(td)?.has(text)) continue; // 같은 글이 다른 칸에서 확인됐다(E5 꼴)
    if (!out.has(td)) out.set(td, new Set());
    out.get(td)!.add(text);
  }
  return out;
}

function checksFor(core: string, r: Run, c01: Run | undefined): Check[] {
  const out: Check[] = [];
  const add = (id: string, family: string, ok: boolean | "x", detail: string, contract?: string) =>
    out.push({ id, family, verdict: ok === "x" ? "XFAIL" : ok ? "PASS" : "FAIL", detail, contract });
  const m = r.model;

  /* OUT-2 후보 근거를 확인된 경험처럼 쓰지 않는다 */
  const cand = candidateTexts(r);
  const leaked: string[] = [];
  for (const d of m.domains) {
    for (const t of [...d.did, ...d.decided]) if (cand.get(d.code)?.has(t)) leaked.push(`${d.code}:${t}`);
  }
  add("E-CAND-MODEL", "OUT-2", leaked.length === 0, `후보 ${[...cand.values()].reduce((n, s) => n + s.size, 0)} · did/decided 로 샌 것 ${leaked.length}`);
  const candAll = [...cand.values()].flatMap((s) => [...s]);
  const inHead = candAll.filter((t) => r.headline.includes(t));
  add("E-CAND-TEXT", "OUT-2", inHead.length === 0, `머리글에 선 후보 글 ${inHead.length}${inHead.length ? `: ${inHead.join(", ")}` : ""}`);
  const t = tally(r.sub, r.snap, m);
  add("E-PK", "OUT-2", t.unique_key === t.submitted && t.raw.sum4 >= t.raw.did,
    `고유(PK) ${t.unique_key} · did ${t.raw.did} · 네 목록 합 ${t.raw.sum4} · 확인 ${t.confirmed_keys} · 후보 ${t.candidates}`);

  /* 연결 그래프: Gap ↔ Action ↔ 영역이 서로 가리키는가 */
  const gapIds = new Set(m.gaps.map((g) => g.id));
  const actIds = new Set(m.actions.map((a) => a.id));
  const doms = new Set(m.domains.map((d) => d.code));
  const broken = [
    ...m.actions.filter((a) => a.from_gap && !gapIds.has(a.from_gap)).map((a) => `action ${a.id}→gap ${a.from_gap}`),
    ...m.gaps.filter((g) => g.action_id && !actIds.has(g.action_id)).map((g) => `gap ${g.id}→action ${g.action_id}`),
    ...m.gaps.filter((g) => !doms.has(g.domain)).map((g) => `gap ${g.id}→domain ${g.domain}`),
    ...m.actions.filter((a) => a.domain && !doms.has(a.domain)).map((a) => `action ${a.id}→domain ${a.domain}`),
  ];
  add("L-LINK", "LINEAGE", broken.length === 0, broken.join(" · ") || "끊긴 연결 0");

  /* Gap 의 종류가 그 축의 상태와 맞는가 */
  const bad: string[] = [];
  for (const g of m.gaps) {
    const d = m.domains.find((x) => x.code === g.domain);
    if (!d || !g.axis) continue;
    if ((g.kind === "REQUIRED_AXIS" || g.kind === "AXIS") && d.confirmed.includes(g.axis)) bad.push(`${g.id}:${g.kind} 인데 확인된 축`);
    if (g.kind === "PARTIAL_EVIDENCE" && (!d.confirmed.includes(g.axis) || d.owned.includes(g.axis))) bad.push(`${g.id}:PARTIAL 인데 확인 아님 또는 소유`);
  }
  add("L-GAPKIND", "LINEAGE", bad.length === 0, bad.join(" · ") || "종류와 축 상태가 맞다");

  /* OUT-1 미평가 · 미응답을 `능력 부족` 말로 적지 않는다 */
  const texts = [r.headline, ...r.actions, ...r.gaps];
  const deficit = texts.filter((x) => DEFICIT.test(x));
  add("C-NODEFICIT", "OUT-1", deficit.length === 0, deficit.length ? deficit.slice(0, 2).join(" | ") : "결핍 말 0");

  /* OUT-1 답하지 않은 축이 빈자리로 섰을 때 `없다` 와 같은 글로 서는가 → 미평가와 부재가 갈리지 않는다 */
  const sk: string[] = [];
  for (const g of m.gaps) {
    if (!g.axis) continue;
    const ax = r.snap.domains.find((x) => x.code === g.domain)?.axes[g.axis];
    if (ax && (ax.missing === "SKIPPED" || ax.missing === "NOT_ROUTED")) sk.push(`${g.domain}.${g.axis}:${ax.missing}`);
  }
  add("C-SKIP-CAL", "OUT-1", sk.length === 0 ? true : "x",
    sk.length ? `답하지 않은 축이 '아직 없습니다' 글로 선다: ${sk.join(", ")}` : "해당 없음", sk.length ? "CC-008" : undefined);

  /* OUT-1 C07 · C08: 스냅샷은 갈랐는데 결과 글이 C01 과 같다 */
  if (c01 && (r.spec.kind === "C07_PARTIAL_MISSING" || r.spec.kind === "C08_TOOL_MISMATCH")) {
    const d1 = r.spec.fixture.deep[0];
    const empty = r.snap.domains.find((x) => x.code === d1)!.empty;
    const inGaps = new Set(m.gaps.filter((g) => g.domain === d1).map((g) => g.axis));
    const unseen = empty.filter((a) => !inGaps.has(a));
    const same = r.headline === c01.headline && stable(r.actions) === stable(c01.actions);
    add("C-UNSEEN", "OUT-1", unseen.length && same ? "x" : true,
      `스냅샷 empty ${empty.join("+") || "-"} · 결과지 빈자리에 없음 ${unseen.join("+") || "-"} · C01 과 머리글·할 일 같음 ${same}`,
      unseen.length && same ? "CC-008" : undefined);
  }

  /* OUT-5 산업 · 역할 맥락이 등록부에 있는 팩에서만 온다 */
  for (const [kind, pv] of [["industry", m.industry_context], ["role", m.role_context]] as const) {
    if (!pv) continue;
    const file = (registry().cores.find((x) => x.code === core) as unknown as { packs: Record<string, string> }).packs[kind];
    const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
    const pack = (JSON.parse(raw).packs as { code: string }[]).find((p) => p.code === pv.code);
    const fabricated = pv.vocabulary.filter((v) => !raw.includes(JSON.stringify(v)));
    const domsBad = [...pv.established.map((e) => e.domain), ...pv.requested.map((e) => e.domain)].filter((x) => !doms.has(x));
    add(`P-${kind.toUpperCase()}`, "OUT-5", Boolean(pack) && fabricated.length === 0 && domsBad.length === 0,
      `${pv.code} · 팩 ${pack ? "있음" : "없음"} · 말 ${pv.vocabulary.length} 가운데 팩에 없는 것 ${fabricated.length} · 없는 영역 ${domsBad.length}`);
  }
  return out;
}

/* ── 짝: 같아야 할 때 같은가 · 달라야 할 때 다른가 (OUT-3) ───────────── */

type PairRow = {
  core: string; a: string; b: string; relation: string;
  core_same: boolean; text_same: boolean; axis_diff: string[];
  class: "SAME_AS_EXPECTED" | "DIFFERS_AS_EXPECTED" | "DISCREPANCY" | "TEXT_ONLY_DIFFERS";
  why: string;
};
function axisDiff(a: Snapshot, b: Snapshot): string[] {
  const out: string[] = [];
  for (const d of a.domains) {
    const e = b.domains.find((x) => x.code === d.code);
    if (!e) continue;
    for (const ax of Object.keys(d.axes) as (keyof typeof d.axes)[]) {
      if (d.axes[ax].state !== e.axes[ax].state) {
        out.push(`${d.code}.${ax}${d.required.includes(ax) ? "(필수)" : ""}:${e.axes[ax].state}→${d.axes[ax].state}`);
      }
    }
  }
  return out;
}
function why(kind: string, coreSame: boolean, textSame: boolean, headSame: boolean, diff: string[]): string {
  if (coreSame && textSame) {
    return ({
      C03_SAME_EXP_LOW_INTEREST: "관심만 다르다 — 관심은 축 판정을 바꾸지 않는다(설계 원칙: 합치지 않는다). 머리글 · 할 일이 같아도 된다",
      C05_ACTIVITY_OTHER_INDUSTRY: "산업 맥락만 다르다 — Core 판정이 같다. 산업 문장은 팩 절이 따로 든다",
      C06_REPEAT_REORDERED: "같은 응답 · 차례만 다르다 — 같아야 한다",
      C09_SAME_MAJOR_OTHER_GOAL: "목표 역할만 다르다 — Core 판정이 같다. 역할 문장은 팩 절이 따로 든다",
      C11_STAGE_POSTDOC: "학위만 다르다 — 학위는 판정을 바꾸지 않는다",
    } as Record<string, string>)[kind] ?? "Core 판정과 글이 함께 같다";
  }
  if (!coreSame && !textSame) return "판정이 달라 글도 다르다";
  if (!coreSame && textSame) {
    const req = diff.filter((x) => x.includes("(필수)"));
    return req.length
      ? `필수 축이 달라졌는데 글이 같다 — 결함 후보: ${req.join(", ")}`
      : `달라진 축이 전부 비필수 · 미요청이다(${diff.slice(0, 4).join(", ")}${diff.length > 4 ? " …" : ""}) — gapsOf 범위 밖이라 글에 안 선다 · CC-008`;
  }
  if (kind === "C11_STAGE_POSTDOC" && headSame) {
    return "학위만 다르다 — Core 판정과 머리글은 같고 할 일의 덧붙이는 줄만 학위에 맞게 갈린다(actionKo 의 stage · 설계된 동작)";
  }
  return "판정이 같은데 글이 다르다 — 확인 필요";
}

/* ── 실행 ────────────────────────────────────────────────────────── */

/* ── 자기 검사: 검사가 실제로 걸리는가 (`SELFTEST=1`) ──────────────────
   출력을 하나씩 일부러 망가뜨리고 그 자리를 맡은 검사가 FAIL 로 서는지 본다.
   걸리지 않는 검사는 아무것도 세지 않는다 */
function selftest(): void {
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  const loaded = load("BIZ_CORE_V1");
  const spec = { id: "ST-BIZ", core: "BIZ_CORE_V1", kind: "SELFTEST", fixture: BIZ_CASE } as unknown as CaseSpec;
  const base = runOne("BIZ_CORE_V1", loaded, spec);
  const cand = [...candidateTexts(base).entries()][0];
  const mut: [string, (r: Run) => void][] = [
    ["E-CAND-MODEL", (r) => { r.model.domains.find((d) => d.code === cand[0])!.did.push([...cand[1]][0]); }],
    ["E-CAND-TEXT", (r) => { r.headline += [...cand[1]][0]; }],
    ["L-LINK", (r) => { r.model.actions[0].from_gap = "없는-빈자리"; }],
    ["L-GAPKIND", (r) => { const d = r.model.domains.find((x) => x.confirmed.length)!; r.model.gaps.push({ ...r.model.gaps[0], id: "st", domain: d.code, axis: d.confirmed[0], kind: "REQUIRED_AXIS" }); }],
    ["C-NODEFICIT", (r) => { r.gaps.push("분석 능력이 부족합니다"); }],
    ["P-INDUSTRY", (r) => { r.model.industry_context!.vocabulary.push("지어낸 산업 용어"); }],
  ];
  /* 산업 맥락은 BIZ_CASE 에 없어 벤치마크 C01(산업 · 역할을 고른 사례)로 본다 */
  const withPack = runOne("BIZ_CORE_V1", loaded, casesFor("BIZ_CORE_V1")[0]);
  let ok = 0;
  for (const [id, f] of mut) {
    const r = clone(id === "P-INDUSTRY" ? withPack : base);
    f(r);
    const v = checksFor("BIZ_CORE_V1", r, undefined).find((c) => c.id === id);
    const caught = v?.verdict === "FAIL";
    if (caught) ok += 1;
    console.log(`  ${caught ? "잡음" : "놓침"}  ${id}  ${v?.detail ?? "(검사 없음)"}`);
  }
  console.log(`  자기 검사 ${ok}/${mut.length}`);
  process.exitCode = ok === mut.length ? 0 : 1;
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const rows: Record<string, unknown>[] = [];
  const pairs: PairRow[] = [];
  const counts = { PASS: 0, FAIL: 0, XFAIL: 0 } as Record<Verdict, number>;
  const byFamily: Record<string, Record<Verdict, number>> = {};

  for (const core of BENCH_CORES) {
    const loaded = load(core);
    const specs = casesFor(core);
    const runs = new Map(specs.map((s) => [s.id, runOne(core, loaded, s)]));
    const c01 = runs.get(`${specs[0].id.split("-")[0]}-C01`);
    for (const spec of specs) {
      const r = runs.get(spec.id)!;
      const cs = checksFor(core, r, c01);
      for (const c of cs) {
        counts[c.verdict] += 1;
        (byFamily[c.family] ??= { PASS: 0, FAIL: 0, XFAIL: 0 })[c.verdict] += 1;
      }
      const t = tally(r.sub, r.snap, r.model);
      const fails = cs.filter((c) => c.verdict === "FAIL");
      const xf = cs.filter((c) => c.verdict === "XFAIL");
      rows.push({
        case: spec.id, core, kind: spec.kind,
        input_hash: h(spec.fixture), snapshot_hash: h(coreOnly(r.snap)),
        evidence_refs: `PK ${t.unique_key} · 확인 ${t.confirmed_keys} · 후보 ${t.candidates}`,
        gap_types: [...new Set(r.model.gaps.map((g) => g.kind))].join("+") || "-",
        headline_action_hash: h([r.headline, r.actions]),
        discrepancy: xf.map((c) => c.id).join("+") || "-",
        expected_reason: xf.map((c) => `${c.id}→${c.contract}`).join(" · ") || "-",
        observed_output: r.headline,
        verdict: fails.length ? "FAIL" : xf.length ? "XFAIL" : "PASS",
        checks: cs,
      });
      if (spec.pair) {
        const b = runs.get(spec.pair.with)!;
        const coreSame = stable(coreOnly(r.snap)) === stable(coreOnly(b.snap));
        const textSame = r.headline === b.headline && stable(r.actions) === stable(b.actions);
        const diff = axisDiff(r.snap, b.snap);
        const cls: PairRow["class"] = coreSame && textSame ? "SAME_AS_EXPECTED"
          : !coreSame && !textSame ? "DIFFERS_AS_EXPECTED"
          : !coreSame && textSame ? "DISCREPANCY" : "TEXT_ONLY_DIFFERS";
        pairs.push({ core, a: spec.pair.with, b: spec.id, relation: spec.pair.relation, core_same: coreSame,
          text_same: textSame, axis_diff: diff, class: cls, why: why(spec.kind, coreSame, textSame, r.headline === b.headline, diff) });
      }
    }
  }

  /* R37 재현 사례 회귀(OUT-2): BIZ did 25 · 네 목록 합 32 · 고유 26 / CS 같은 글 두 칸 */
  const reg: Check[] = [];
  {
    const loaded = load("BIZ_CORE_V1");
    const sub = expand(BIZ_CASE, "BIZ_CORE_V1");
    const snap = score(sub, loaded);
    const t = tally(sub, snap, buildResult(snap, loaded));
    reg.push({ id: "R-BIZ", family: "OUT-2", verdict: t.raw.did === 25 && t.raw.sum4 === 32 && t.unique_key === 26 ? "PASS" : "FAIL",
      detail: `did ${t.raw.did} · 네 목록 합 ${t.raw.sum4} · 고유 ${t.unique_key} (R37: 25 · 32 · 26)` });
  }
  {
    const loaded = load("CS_CORE_V1");
    const f = { id: "E-CS", name: "같은 글 두 칸", tier: "PRO" as const, stage: "bachelor" as const, field: null,
      probe: ["TD01"], deep: ["TD01"], grid: { TD01: [5, 2, 5] as [number, number, number] },
      axes: { TD01: all(2) }, checklist: { TD01: { J5: 1, J6: 1 } }, answers: {} };
    const sub = expand(f, "CS_CORE_V1");
    sub.artifacts = { TD01: ["요구 목록"] }; sub.verifications = { TD01: ["요구 목록"] };
    const snap = score(sub, loaded);
    const m = buildResult(snap, loaded);
    const pk = submittedKeys(sub).filter((k) => k.endsWith("|요구 목록")).length;
    const did = m.domains.find((d) => d.code === "TD01")!.did.filter((x) => x === "요구 목록").length;
    reg.push({ id: "R-CS-SLOT", family: "OUT-2", verdict: pk === 2 && did === 1 ? "PASS" : "FAIL",
      detail: `PK 행 ${pk}(칸을 갈라 센다) · did ${did}(글로 합친다) — 고유 집계는 PK 로 해야 두 근거가 하나로 보이지 않는다` });
  }
  for (const c of reg) { counts[c.verdict] += 1; (byFamily[c.family] ??= { PASS: 0, FAIL: 0, XFAIL: 0 })[c.verdict] += 1; }

  const pc = pairs.reduce<Record<string, number>>((a, p) => { a[p.class] = (a[p.class] ?? 0) + 1; return a; }, {});
  const summary = { checks: counts, by_family: byFamily, cases: rows.length,
    case_verdicts: rows.reduce<Record<string, number>>((a, r) => { a[r.verdict as string] = (a[r.verdict as string] ?? 0) + 1; return a; }, {}),
    pairs: pc };
  writeFileSync(join(OUT, "integrity.json"), `${JSON.stringify({ summary, regression: reg, rows, pairs }, null, 2)}\n`);

  const md: string[] = [
    "# R38 콘텐츠 무결성 — 사례 표 (생성물 · 손으로 고치지 않는다)", "",
    "`node … scripts/shared-core/content/integrity.ts` 가 만든다. 합성 사례의 규칙 일치이고 실제 추천 정확성이 아니다.", "",
    "| case | core | input hash | snapshot hash | evidence refs | gap types | headline/action hash | discrepancy | expected_reason | observed_output | verdict |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${[r.case, r.core, r.input_hash, r.snapshot_hash, r.evidence_refs, r.gap_types, r.headline_action_hash, r.discrepancy, r.expected_reason, String(r.observed_output).replace(/\|/g, "\\|"), r.verdict].join(" | ")} |`),
    "", "## 짝 (OUT-3) — 같아야 할 때 같은가 · 다를 때 왜인가", "",
    "| core | a | b | 관계 | Core 같음 | 글 같음 | 분류 | 까닭(why_same / why_differs) |",
    "|---|---|---|---|---|---|---|---|",
    ...pairs.map((p) => `| ${p.core} | ${p.a} | ${p.b} | ${p.relation} | ${p.core_same} | ${p.text_same} | ${p.class} | ${p.why.replace(/\|/g, "\\|")} |`),
  ];
  writeFileSync(join(OUT, "integrity.md"), `${md.join("\n")}\n`);

  console.log(`  사례 ${rows.length} · 판정 ${JSON.stringify(summary.case_verdicts)}`);
  console.log(`  검사 PASS ${counts.PASS} · FAIL ${counts.FAIL} · XFAIL ${counts.XFAIL} (XFAIL 은 합격 통계에 넣지 않는다)`);
  for (const [f, v] of Object.entries(byFamily)) console.log(`    ${f.padEnd(8)} PASS ${v.PASS} · FAIL ${v.FAIL} · XFAIL ${v.XFAIL}`);
  for (const c of reg) console.log(`  ${c.verdict}  ${c.id}  ${c.detail}`);
  console.log(`  짝 ${pairs.length}: ${JSON.stringify(pc)}`);
  for (const r of rows) for (const c of (r.checks as Check[]).filter((x) => x.verdict === "FAIL")) console.log(`  FAIL ${r.case} ${c.id} ${c.detail}`);
  process.exitCode = counts.FAIL === 0 ? 0 : 1;
}

if (process.env.SELFTEST === "1") selftest(); else main();
