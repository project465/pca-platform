/**
 * Core 품질 벤치마크 v1 러너 (R37 §4).
 *
 *   node --no-warnings --experimental-strip-types \
 *     --import ./scripts/shared-core/test/register.mjs \
 *     scripts/shared-core/bench/run.ts
 *   OUT=docs/shared-core/evidence/R37/bench  (기본값)
 *
 * **엔진을 고치지 않는다.** 부르는 것은 제품과 같은 `load · score · buildResult`
 * 와 결과지 문장 함수다. DB · 화면 · 네트워크에 닿지 않는다.
 *
 * 재는 것 다섯(§4-3): 정확성 · 근거성 · 개인화 · 데이터 품질 · 확장성.
 * **합격선을 만들지 않는다**: 기준값이 없으므로 이번 수치가 Baseline 이다.
 * 사례마다의 판정은 그 사례에 적어 둔 기대(cases.ts)가 섰는가이고, 걸린
 * 사례는 걸린 채로 적는다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { registry, coreFile } from "../../../src/lib/me-v3/core-registry";
import { load, score, coreOnly, type Loaded } from "../../../src/lib/me-v3/scoring/engine";
import { expand, stable } from "../../../src/lib/me-v3/scoring/fixtures";
import { OWNED_EVIDENCE_MIN } from "../../../src/lib/me-v3/scoring/axes";
import { Z1_CONFIRMED_MIN } from "../../../src/lib/me-v3/scoring/zones";
import { buildResult } from "../../../src/lib/me-v3/result/build";
import { actionKo, headlineKo } from "../../../src/lib/me-v3/result/text.ko";
import type { Snapshot, Submission } from "../../../src/lib/me-v3/scoring/types";
import type { ResultModel } from "../../../src/lib/me-v3/result/model";
import { BENCH_CORES, casesFor, type CaseSpec } from "./cases";

const OUT = process.env.OUT ?? "docs/shared-core/evidence/R37/bench";
type Check = { name: string; ok: boolean; detail?: string };

import { submittedKeys, tally } from "./keys";

/* ── 모순 · 지어냄 검사 (사례를 가리지 않는 불변식) ───────────────── */

function invariants(sub: Submission, s: Snapshot, m: ResultModel): Check[] {
  const out: Check[] = [];
  const bad = (name: string, list: string[]) =>
    out.push({ name, ok: list.length === 0, detail: list.slice(0, 4).join(" ; ") });
  const z1 = s.zones.Z1_EVIDENCE_ESTABLISHED;
  bad("K1 Z1 이면 확인 축 ≥4 · 필수 축 · 산출물 · 산출물 근거", s.domains
    .filter((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED" &&
      !(d.confirmed_all >= Z1_CONFIRMED_MIN && d.required_ok && d.output_ok && d.output_evidence_ok))
    .map((d) => d.code));
  bad("K2 required_ok 는 필수 축이 전부 확인일 때만", s.domains
    .filter((d) => d.required_ok !== d.required.every((a) => d.confirmed.includes(a))).map((d) => d.code));
  bad("K3 OWNED 축은 근거 ≥2", s.domains.flatMap((d) => d.owned
    .filter((a) => d.axes[a].evidence < OWNED_EVIDENCE_MIN).map((a) => `${d.code}.${a}`)));
  bad("K4 확인 축은 DID/DECIDED_USED 응답이 있다", s.domains.flatMap((d) => d.confirmed
    .filter((a) => !d.axes[a].from.some((f) => f.ownership === "DID" || f.ownership === "DECIDED_USED"))
    .map((a) => `${d.code}.${a}`)));
  /* K5 는 처음에 `NOT_EXPLORED 면 확인 축이 없다` 로 적었다가 틀렸다(run-v0 기록).
     심화 등급에서 NOT_EXPLORED 는 `선별만 하고 깊게 묻지 않았다` 이고 선별 축은
     확인될 수 있다(zones.ts decide). 그래서 열어 본 자리와 묶음이 맞는지를 잰다 */
  bad("K5 NOT_EXPLORED 는 그 등급이 깊게(BASIC 은 선별로) 열지 않은 영역이다", s.domains
    .filter((d) => d.zone === "NOT_EXPLORED" &&
      (s.tier === "BASIC" ? d.opened.probe : d.opened.deep)).map((d) => d.code));
  bad("K6 BASIC 에 Z1 이 없다", s.tier === "BASIC" ? z1 : []);
  bad("K7 focus 는 열어 본 영역이다", s.focus.filter((td) =>
    s.domains.find((d) => d.code === td)?.zone === "NOT_EXPLORED"));
  const sub2 = new Set(submittedKeys(sub).map((k) => { const [td, , ...t] = k.split("|"); return `${td}|${t.join("|")}`; }));
  bad("K8 결과의 근거 글은 전부 제출한 고르기에서 왔다(지어냄 0)", m.domains.flatMap((d) =>
    [...d.did, ...d.decided, ...d.artifacts, ...d.verifications]
      .filter((x) => !sub2.has(`${d.code}|${x}`)).map((x) => `${d.code}:${x.slice(0, 24)}`)));
  bad("K9 decided ⊆ did", m.domains.flatMap((d) => d.decided
    .filter((x) => !d.did.includes(x)).map((x) => `${d.code}:${x.slice(0, 24)}`)));
  return out;
}

/* ── 사례별 기대 ───────────────────────────────────────────────────── */

type Run = { spec: CaseSpec; sub: Submission; snap: Snapshot; model: ResultModel; again: string; first: string };
const dom = (s: Snapshot, td: string) => s.domains.find((d) => d.code === td)!;

function expectations(r: Run, base: Run | undefined, d1: string): Check[] {
  const c: Check[] = [];
  const s = r.snap, d = dom(s, d1), md = r.model.domains.find((x) => x.code === d1)!;
  const k = r.spec.kind;
  const eq = (a: unknown, b: unknown) => stable(a) === stable(b);
  if (k === "C01_STRONG") {
    c.push({ name: "d1 Z1", ok: d.zone === "Z1_EVIDENCE_ESTABLISHED", detail: d.zone });
    c.push({ name: "d1 confirmed_all=8", ok: d.confirmed_all === 8, detail: String(d.confirmed_all) });
    c.push({ name: "품질 OK", ok: s.response_quality.flag === "OK", detail: s.response_quality.flag });
    const odd = r.model.gaps.filter((g) => g.domain === d1 && g.axis && !d.confirmed.includes(g.axis));
    c.push({ name: "확인되지 않은 축의 빈자리가 서지 않는다(소유를 더 세우라는 빈자리는 설 수 있다)",
      ok: odd.length === 0, detail: odd.map((g) => `${g.axis}:${g.kind}`).join(",") || "-" });
  }
  if (k === "C02_SAME_MAJOR_NO_EXP") {
    c.push({ name: "d1 Z1 아님", ok: d.zone !== "Z1_EVIDENCE_ESTABLISHED", detail: d.zone });
    c.push({ name: "d1 confirmed_all=0", ok: d.confirmed_all === 0, detail: String(d.confirmed_all) });
    c.push({ name: "d1 did 비어 있음", ok: md.did.length === 0, detail: String(md.did.length) });
  }
  if (k === "C03_SAME_EXP_LOW_INTEREST" && base) {
    const b = dom(base.snap, d1);
    c.push({ name: "축 상태가 C01 과 같다", ok: eq(d.confirmed, b.confirmed) && eq(d.owned, b.owned) });
    c.push({ name: "d1 Z3", ok: d.zone === "Z3_EVIDENCE_LOW_INTEREST", detail: d.zone });
    c.push({ name: "근거 목록이 C01 과 같다", ok: eq(md.did, base.model.domains.find((x) => x.code === d1)!.did) });
  }
  if (k === "C04_CLAIM_WITHOUT_EVIDENCE") {
    c.push({ name: "OWNED 없음", ok: s.domains.every((x) => x.owned.length === 0),
      detail: s.domains.filter((x) => x.owned.length).map((x) => `${x.code}:${x.owned.join("+")}`).join(",") });
    c.push({ name: "d1 Z1 아님", ok: d.zone !== "Z1_EVIDENCE_ESTABLISHED", detail: d.zone });
    c.push({ name: "decided 비어 있음", ok: r.model.domains.every((x) => x.decided.length === 0) });
    c.push({ name: "산출물 근거 공백이 까닭으로 선다",
      ok: d.reasons.includes("MISSING_OUTPUT_EVIDENCE"), detail: d.reasons.join(",") });
  }
  if ((k === "C05_ACTIVITY_OTHER_INDUSTRY" || k === "C09_SAME_MAJOR_OTHER_GOAL" ||
       k === "C11_STAGE_POSTDOC") && base) {
    c.push({ name: "coreOnly 가 C01 과 같다", ok: eq(coreOnly(s), coreOnly(base.snap)) });
  }
  if (k === "C05_ACTIVITY_OTHER_INDUSTRY" && base) {
    c.push({ name: "산업 맥락은 다르다(팩이 둘 이상인 Core)",
      ok: (s.context.industry?.code ?? null) !== (base.snap.context.industry?.code ?? null),
      detail: `${s.context.industry?.code ?? "-"} vs ${base.snap.context.industry?.code ?? "-"}` });
  }
  if (k === "C09_SAME_MAJOR_OTHER_GOAL" && base) {
    c.push({ name: "역할 맥락이 다르다",
      ok: !eq(s.context.role_interest, base.snap.context.role_interest),
      detail: `${s.context.role_interest.join("+")} vs ${base.snap.context.role_interest.join("+")}` });
  }
  if (k === "C06_REPEAT_REORDERED" && base) {
    const strip = (x: Snapshot) => ({ ...x, attempt_id: "", trace: [] });
    c.push({ name: "스냅샷이 C01 과 글자까지 같다(attempt_id · trace 제외)", ok: eq(strip(s), strip(base.snap)) });
  }
  if (k === "C07_PARTIAL_MISSING") {
    const quiet = ["J1", "J2", "J4", "J8"] as const;
    c.push({ name: "답하지 않은 심화 축이 확인되지 않는다",
      ok: quiet.every((a) => !d.confirmed.includes(a)), detail: d.confirmed.join("+") });
    c.push({ name: "그 축의 missing 이 SKIPPED", ok: quiet.every((a) => d.axes[a].missing === "SKIPPED"),
      detail: quiet.map((a) => `${a}:${d.axes[a].missing}`).join(",") });
    const sk = submittedKeys(r.sub).filter((x) => quiet.some((a) => x.startsWith(`${d1}|${a}|`)));
    const did = new Set(md.did);
    c.push({ name: "그 축의 고르기가 did 에 없다(후보로 남는다)",
      ok: sk.every((x) => !did.has(x.split("|").slice(2).join("|"))), detail: `후보 ${sk.length}` });
  }
  if (k === "C08_TOOL_MISMATCH") {
    c.push({ name: "J4 확인 안 됨", ok: !d.confirmed.includes("J4"), detail: d.axes.J4.state });
    const j4 = submittedKeys(r.sub).filter((x) => x.startsWith(`${d1}|J4|`)).map((x) => x.split("|").slice(2).join("|"));
    c.push({ name: "J4 고르기가 did 에 없다", ok: j4.length > 0 && j4.every((t) => !md.did.includes(t)),
      detail: `J4 고르기 ${j4.length}` });
    /* 스냅샷 쪽만 검사한다. 결과지 빈자리(gapsOf)에 J4 가 서는가는 actual.gaps_d1 에
       관찰값으로 적는다 — R37 첫 판은 둘을 \`||\` 로 묶어 결과지 쪽이 비어도 통과시켰다 */
    c.push({ name: "스냅샷 empty 에 J4 가 선다", ok: d.empty.includes("J4"), detail: `empty=${d.empty.join("+")}` });
  }
  if (k === "C10_BASIC_TIER") {
    c.push({ name: "Z1 이 없다", ok: s.zones.Z1_EVIDENCE_ESTABLISHED.length === 0 });
    c.push({ name: "심화 축이 확인되지 않는다",
      ok: s.domains.every((x) => x.confirmed.every((a) => ["J3", "J5", "J6", "J7"].includes(a))),
      detail: s.domains.filter((x) => x.confirmed.length).map((x) => `${x.code}:${x.confirmed.join("+")}`).join(",") });
    c.push({ name: "BASIC 에서 빈자리(gaps)를 세지 않는다", ok: r.model.gaps.length === 0, detail: String(r.model.gaps.length) });
  }
  return c;
}

/** `actionKo` 는 `{ do, note }` 를 돌려준다. 견주는 것은 학생이 읽는 글이다 */
function sayAction(x: unknown): string {
  if (typeof x === "string") return x;
  const o = x as { do?: string; note?: string };
  return [o.do ?? "", o.note ?? ""].filter(Boolean).join(" / ");
}

/* ── 실행 ──────────────────────────────────────────────────────────── */

function names(core: string): (td: string) => string {
  const t = coreFile<{ technical_domains: { code: string; name: string }[] }>(core, "taxonomy");
  const m = new Map(t.technical_domains.map((d) => [d.code, d.name]));
  return (td: string) => m.get(td) ?? td;
}

function runCore(core: string, loaded: Loaded) {
  const specs = casesFor(core);
  const runs = new Map<string, Run>();
  for (const spec of specs) {
    const sub = expand(spec.fixture, core);
    const snap = score(sub, loaded);
    const first = stable({ ...snap, attempt_id: "" });
    const again = stable({ ...score(expand(spec.fixture, core), loaded), attempt_id: "" });
    const model = buildResult(snap, loaded);
    runs.set(spec.id, { spec, sub, snap, model, first, again });
  }
  return { specs, runs };
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const report: Record<string, unknown>[] = [];
  const totals = { cases: 0, cases_pass: 0, checks: 0, checks_pass: 0, det: 0, det_same: 0,
    inv: 0, inv_pass: 0 };
  const texts: { core: string; id: string; headline: string; actions: string[] }[] = [];
  const pairs: { core: string; a: string; b: string; relation: string; core_same: boolean; full_same: boolean; text_same: boolean; ok: boolean }[] = [];

  for (const core of BENCH_CORES) {
    const loaded = load(core);
    const { specs, runs } = runCore(core, loaded);
    const name = names(core);
    const d1 = casesFor(core)[0].fixture.deep[0];
    for (const spec of specs) {
      const r = runs.get(spec.id)!;
      const base = spec.pair ? runs.get(spec.pair.with) : undefined;
      const det = r.first === r.again;
      const inv = invariants(r.sub, r.snap, r.model);
      const exp = expectations(r, base ?? runs.get(`${spec.id.split("-")[0]}-C01`), d1);
      const all = [{ name: "D 같은 입력 두 번 = 같은 스냅샷", ok: det }, ...inv, ...exp];
      const pass = all.every((x) => x.ok);
      totals.cases += 1; if (pass) totals.cases_pass += 1;
      totals.checks += all.length; totals.checks_pass += all.filter((x) => x.ok).length;
      totals.det += 1; if (det) totals.det_same += 1;
      totals.inv += inv.length; totals.inv_pass += inv.filter((x) => x.ok).length;
      if (base && spec.pair) {
        const cs = stable(coreOnly(r.snap)) === stable(coreOnly(base.snap));
        const fs = stable({ ...r.model, attempt_id: "" }) === stable({ ...base.model, attempt_id: "" });
        const ok = spec.pair.relation === "CORE_SAME" ? cs
          : spec.pair.relation === "CORE_DIFFERS" ? !cs : cs && r.first.replace(/"trace":\[[^\]]*\]/g, "") === base.first.replace(/"trace":\[[^\]]*\]/g, "");
        const ta = texts.find((t) => t.id === spec.pair!.with);
        const hb = headlineKo(r.model, name).title;
        const ab = r.model.actions.map((a) => sayAction(actionKo(a, a.domain ? name(a.domain) : "", r.snap.stage)));
        const textSame = Boolean(ta) && ta!.headline === hb && stable(ta!.actions) === stable(ab);
        pairs.push({ core, a: spec.pair.with, b: spec.id, relation: spec.pair.relation, core_same: cs, full_same: fs, text_same: textSame, ok });
      }
      const h = headlineKo(r.model, name);
      const acts = r.model.actions.map((a) => sayAction(actionKo(a, a.domain ? name(a.domain) : "", r.snap.stage)));
      texts.push({ core, id: spec.id, headline: h.title, actions: acts });
      const md1 = r.model.domains.find((x) => x.code === d1)!;
      report.push({
        id: spec.id, core, kind: spec.kind, input: spec.input, expect: spec.expect,
        must_ground: spec.must_ground, forbidden: spec.forbidden, gap_condition: spec.gap_condition,
        actual: {
          d1, zone: md1.zone, confirmed: md1.confirmed, owned: md1.owned, reasons: md1.reasons,
          quality: r.snap.response_quality.flag, focus: r.snap.focus,
          gaps: r.model.gaps.length,
          /* 관찰값. gap_condition 가운데 결과지 쪽(gapsOf)은 검사하지 않고 적는다 —
             무엇이 빈자리로 서야 하는가는 결과 계약이고 이 벤치마크가 정하지 않는다 */
          gaps_d1: r.model.gaps.filter((g) => g.domain === d1).map((g) => `${g.axis ?? "-"}:${g.kind}`),
          empty_d1: dom(r.snap, d1).empty,
          actions: r.model.actions.map((a) => `${a.code}:${a.domain ?? "-"}:${a.axis ?? "-"}`),
          headline: h.title, tally: tally(r.sub, r.snap, r.model),
        },
        verdict: pass ? "PASS" : "FAIL",
        checks: all,
      });
    }
  }

  /* 개인화 · 문장 반복 */
  const allActs = texts.flatMap((t) => t.actions);
  const distinctActs = new Set(allActs).size;
  const headlines = texts.map((t) => t.headline);
  const actSets = new Map<string, string[]>();
  for (const t of texts) {
    const k = `${t.core}|${t.actions.join("\n")}`;
    actSets.set(k, [...(actSets.get(k) ?? []), t.id]);
  }
  const sameActionLists = [...actSets.values()].filter((v) => v.length > 1);

  /* 데이터 품질: 스무 Core 의 영역 사전 · 체크리스트 (읽기만) */
  const dq: Record<string, { domains: number; slot_text_collisions: string[]; dup_in_list: string[] }> = {};
  for (const c of registry().cores.filter((x) => x.status !== "planned")) {
    try {
      const domains = coreFile<{ domains: { code: string; artifacts: string[]; verify_targets: string[] }[] }>(c.code, "domains").domains;
      const lists = coreFile<{ domains: Record<string, Record<string, { text: string }[]>> }>(c.code, "checklists").domains;
      const col: string[] = [], dup: string[] = [];
      for (const d of domains) {
        const seen = new Map<string, string[]>();
        const add = (slot: string, t: string) => seen.set(t, [...(seen.get(t) ?? []), slot]);
        for (const [ax, items] of Object.entries(lists[d.code] ?? {})) for (const it of items) add(ax, it.text);
        for (const t of d.artifacts) add("ARTIFACT", t);
        for (const t of d.verify_targets) add("VERIFY", t);
        for (const [t, slots] of seen) {
          const uniq = [...new Set(slots)];
          if (uniq.length > 1) col.push(`${d.code}:${uniq.join("/")}:${t.slice(0, 20)}`);
          if (slots.length !== uniq.length) dup.push(`${d.code}:${slots.join("/")}:${t.slice(0, 20)}`);
        }
      }
      dq[c.code] = { domains: domains.length, slot_text_collisions: col, dup_in_list: dup };
    } catch { /* 파일이 없는 Core 는 세지 않는다 */ }
  }
  const diffButSameText = pairs.filter((p) => p.relation === "CORE_DIFFERS" && p.text_same);

  const metrics = {
    accuracy: {
      determinism: `${totals.det_same}/${totals.det}`,
      invariants: `${totals.inv_pass}/${totals.inv}`,
    },
    cases: `${totals.cases_pass}/${totals.cases}`,
    checks: `${totals.checks_pass}/${totals.checks}`,
    personalization: {
      pairs: `${pairs.filter((p) => p.ok).length}/${pairs.length}`,
      action_sentences: { total: allActs.length, distinct: distinctActs },
      headlines: { total: headlines.length, distinct: new Set(headlines).size },
      identical_action_lists_within_core: sameActionLists,
      core_differs_but_headline_and_actions_same: diffButSameText.map((p) => `${p.a}~${p.b}`),
    },
    data_quality: {
      cores_scanned: Object.keys(dq).length,
      slot_text_collisions: Object.fromEntries(Object.entries(dq).map(([k, v]) => [k, v.slot_text_collisions.length])),
      dup_in_same_slot: Object.fromEntries(Object.entries(dq).map(([k, v]) => [k, v.dup_in_list.length])),
    },
  };
  writeFileSync(join(OUT, "results.json"), `${JSON.stringify({ metrics, pairs, cases: report, texts, data_quality: dq }, null, 2)}\n`);

  console.log(`  사례 ${metrics.cases} · 확인 ${metrics.checks} · 결정성 ${metrics.accuracy.determinism} · 불변식 ${metrics.accuracy.invariants} · 짝 ${metrics.personalization.pairs}`);
  for (const c of report) {
    const fails = (c.checks as Check[]).filter((x) => !x.ok);
    console.log(`  ${c.verdict === "PASS" ? "통과" : "걸림"}  ${c.id} ${c.kind}${fails.length ? " — " + fails.map((f) => `${f.name}${f.detail ? `(${f.detail})` : ""}`).join(" | ") : ""}`);
  }
  console.log(`  문장  할 일 ${distinctActs}/${allActs.length} 서로 다름 · 머리글 ${new Set(headlines).size}/${headlines.length}`);
  for (const v of sameActionLists) console.log(`  같은 할 일 목록  ${v.join(" = ")}`);
  console.log(`  Core 판정은 다른데 머리글·할 일이 같은 짝 ${diffButSameText.length}/${pairs.filter((p) => p.relation === "CORE_DIFFERS").length}: ${diffButSameText.map((p) => `${p.a}~${p.b}`).join(" · ")}`);
  console.log(`  데이터  Core ${Object.keys(dq).length} · 칸이 다른데 글이 같은 고르기 ${Object.values(dq).reduce((n, v) => n + v.slot_text_collisions.length, 0)} · 같은 칸 중복 ${Object.values(dq).reduce((n, v) => n + v.dup_in_list.length, 0)}`);
  void registry;
  process.exitCode = totals.cases_pass === totals.cases ? 0 : 1;
}

main();
