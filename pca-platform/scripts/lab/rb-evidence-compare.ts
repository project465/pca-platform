/**
 * **출시 차단 해소 · 근거를 고른 학생과 고르지 않은 학생을 나란히 놓는다.**
 *
 * 여섯 전공마다 같은 응답을 세 사람에게 적는다:
 *   NONE  근거를 하나도 고르지 않는다
 *   WITH  두 영역에서 체크리스트 · 결과물 · 견준 대상을 앞에서부터 고른다
 *   ALT   같은 두 영역에서 **다른 항목**(뒤에서부터)을 고른다
 * 셋을 제품의 `submit()` 으로 굳히고 Response → Evidence → Gap → Action →
 * PDF 를 견준다. **판정을 여기서 다시 하지 않는다**: 적는 값은 전부 굳은
 * 결과 모델과 그것을 읽는 문장 함수와 실제로 뽑은 종이에서 온다.
 *
 * 묻는 것은 셋이다.
 *   1. 근거를 고르면 결과가 실제로 달라지는가 (같으면 받고 쓰지 않는 자리)
 *   2. 다른 근거를 고르면 다른 글이 서는가 (같으면 고른 것을 읽지 않는 자리)
 *   3. 고른 근거를 **확인된 성과·검증된 근거**로 부풀려 적지 않는가
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' OUT=var/rb/evidence \
 *     npx tsx scripts/lab/rb-evidence-compare.ts
 */
import {
  loadEnv, BASE, assertFreshServer, gateCreds, login, makeStudent, registerCampusStudent,
} from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import { allLeaves, university } from "../../src/lib/campus/registry";
import {
  attemptOf, checklistFor, choosePack, domainName, moveTo, openAttempt, saveAnswer,
  savePicks, submit, viewOf, type CampusEntry, type V3Attempt,
} from "../../src/lib/me-v3/runtime/session";
import type { Answer } from "../../src/lib/me-v3/scoring/types";
import { coreOf, type ResultModel } from "../../src/lib/me-v3/result/model";
import { actionKo, gapKo, headlineKo } from "../../src/lib/me-v3/result/text.ko";

const OUT = process.env.OUT ?? "var/rb/evidence";
const CORES = (process.env.CORES ??
  "BIZ_CORE_V1,EE_CORE_V1,CS_CORE_V1,PUBADM_CORE_V1,NURSING_CORE_V1,MEDIA_CORE_V1").split(",");
const OVERCLAIM = /검증(?:된|되었|됨)\s*(?:근거|성과|경험)|증명(?:된|했)|입증(?:된|했)|인증된|확인된 성과|지원서에서 바로 꺼내/;

type Row = { item_id: string; kind: string; value_int: number | null; value_text: string | null };
type Mode = "NONE" | "WITH" | "ALT";

let pass = 0; const bad: string[] = []; const lines: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  const l = `${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`;
  (c ? pass++ : bad.push(w)); lines.push(l); console.log("  " + l);
};

async function sourceOf(core: string) {
  return queryOne<{ id: string; tier: string; education_stage: string; grad_field: string | null;
    department_code: string; industry_pack: string | null; role_pack: string | null }>(
    `SELECT a.id::text, a.tier, a.education_stage, a.grad_field, a.department_code,
            a.industry_pack, a.role_pack
       FROM v3_attempts a
      WHERE a.core_code = $1 AND a.status = 'scored' AND a.tier = 'PRO'
        AND a.university_code = 'PCU' AND a.department_code IS NOT NULL
        AND (SELECT count(*) FROM v3_responses r WHERE r.attempt_id = a.id) > 40
      ORDER BY a.id DESC LIMIT 1`, [core]);
}

async function build(core: string, mode: Mode, src: NonNullable<Awaited<ReturnType<typeof sourceOf>>>,
  rows: Row[], tag: string) {
  const loginId = `zzrbev-${tag}-${mode.toLowerCase()}`;
  const st = await makeStudent(loginId);
  await registerCampusStudent(st.id, "PCU", src.department_code);
  const u = university("PCU")!;
  const found = allLeaves(u).find((r) => r.leaf.code === src.department_code)!;
  const campus: CampusEntry = {
    university_code: "PCU", college_code: found.college.code,
    department_code: found.leaf.code, core_code: core,
    specialization: found.leaf.specialization ?? null,
  };
  const a0 = await openAttempt({
    userId: st.id, tier: "PRO", stage: src.education_stage as never,
    gradField: (src.grad_field ?? null) as never, campus,
  });
  if (a0.core_code !== core) throw new Error(`${core}: 응시가 ${a0.core_code} 로 열렸다`);
  for (const r of rows) {
    const ans: Answer | null =
      r.kind === "level" ? { kind: "level", index: r.value_int ?? 0 }
      : r.kind === "scale5" ? { kind: "scale5", value: r.value_int ?? 0 }
      : r.kind === "exposure" ? { kind: "exposure", value: r.value_int ?? 0 }
      : r.kind === "choice" ? { kind: "choice", value: r.value_text ?? "" }
      : null;
    if (ans) await saveAnswer(a0.id, r.item_id, ans);
  }
  /* 화면을 차례로 지나며 처음 만나는 두 영역의 근거 화면에서 고른다.
     **지어내지 않는다**: 그 영역의 체크리스트·결과물·견준 대상 목록에서 집는다 */
  let a = (await attemptOf(a0.id, st.id)) as V3Attempt;
  const picked: { domain: string; slot: string; item: string }[] = [];
  const domains: string[] = [];
  let want: string | null = null, guard = 0;
  for (;;) {
    if ((guard += 1) > 500) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    if (mode !== "NONE" && v.screen.kind === "checklist" && v.screen.domain
      && (domains.includes(v.screen.domain) || domains.length < 2)) {
      if (!domains.includes(v.screen.domain)) domains.push(v.screen.domain);
      for (const g of checklistFor(core, v.screen.domain)) {
        const n = g.slot === "ARTIFACT" || g.slot === "VERIFY" ? 1 : 2;
        const pool = mode === "WITH" ? g.items : [...g.items].reverse();
        const items = pool.slice(0, Math.min(n, pool.length));
        await savePicks(a.id, v.screen.domain, g.slot, items);
        for (const t of items) picked.push({ domain: v.screen.domain, slot: g.slot, item: t });
      }
    }
    if (v.screen.kind === "pick-industry" && src.industry_pack) {
      await choosePack(core, a.id, "industry", src.industry_pack);
    }
    if (v.screen.kind === "pick-role" && src.role_pack) {
      await choosePack(core, a.id, "role", src.role_pack);
    }
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, st.id)) as V3Attempt;
  }
  await submit((await attemptOf(a.id, st.id)) as V3Attempt);
  const snap = await queryOne<{ result_model: ResultModel }>(
    `SELECT result_model FROM v3_snapshots WHERE attempt_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [a.id]);
  return { loginId, pw: st.pw, userId: st.id, attempt: a.id, picked, model: snap!.result_model };
}

function summarize(m: ResultModel) {
  const core = coreOf(m);
  const name = (td: string) => domainName(core, td);
  return {
    headline: headlineKo(m, name),
    zones: Object.fromEntries(m.domains.map((d) => [d.code, d.zone])),
    axes: Object.fromEntries(m.domains.map((d) => [d.code,
      Object.fromEntries(Object.entries(d.axes ?? {}).map(([k, v]) => [k, (v as { state?: string }).state ?? v]))])),
    evidence: m.domains.map((d) => ({ code: d.code, decided: d.decided, did: d.did,
      artifacts: d.artifacts, verifications: d.verifications })).filter((d) =>
      d.decided.length || d.did.length || d.artifacts.length || d.verifications.length),
    gaps: m.gaps.map((g) => gapKo(g, name(g.domain))),
    actions: m.actions.map((x) => actionKo(x, x.domain ? name(x.domain) : "", m.stage).do),
  };
}

async function pdfText(loginId: string, pw: string, attempt: string, file: string): Promise<string> {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await b.newContext({ httpCredentials: gateCreds() ?? undefined });
  await login(ctx, loginId, pw);
  const r = await ctx.request.get(`${BASE}/v3/${attempt}/result/pdf`, { timeout: 120000 });
  const buf = await r.body();
  writeFileSync(file, buf);
  await b.close();
  if (r.status() !== 200) return `HTTP ${r.status()}`;
  return execFileSync("pdftotext", ["-layout", file, "-"]).toString();
}

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const table: string[] = [
    "| 전공 | 응답 | WITH 고른 근거 | 묶음 바뀐 영역 | 축 바뀐 칸 | 근거 줄 NONE→WITH | Gap NONE→WITH | Action 같음 | WITH≠ALT 근거 글 | 종이 쪽 NONE/WITH | 부풀림 |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  const all: Record<string, unknown> = {};
  for (const core of CORES) {
    console.log(`\n── ${core}`);
    const src = await sourceOf(core);
    if (!src) { ok(`${core}: 원본 응시가 있다`, false); continue; }
    const rows = await query<Row>(
      `SELECT item_id, kind, value_int, value_text FROM v3_responses
        WHERE attempt_id = $1 ORDER BY answered_at, item_id`, [src.id]);
    const tag = core.split("_")[0].toLowerCase();
    const res = {} as Record<Mode, Awaited<ReturnType<typeof build>>>;
    for (const mode of ["NONE", "WITH", "ALT"] as Mode[]) {
      res[mode] = await build(core, mode, src, rows, tag);
    }
    const S = { NONE: summarize(res.NONE.model), WITH: summarize(res.WITH.model),
      ALT: summarize(res.ALT.model) };
    const zoneDiff = Object.keys(S.NONE.zones).filter((k) => S.NONE.zones[k] !== S.WITH.zones[k]);
    let axisDiff = 0;
    for (const td of Object.keys(S.NONE.axes)) {
      for (const ax of Object.keys(S.NONE.axes[td] ?? {})) {
        if (JSON.stringify(S.NONE.axes[td][ax]) !== JSON.stringify(S.WITH.axes[td]?.[ax])) axisDiff += 1;
      }
    }
    const evLines = (s: typeof S.NONE) => s.evidence.reduce((n, d) =>
      n + d.decided.length + d.did.length + d.artifacts.length + d.verifications.length, 0);
    const withAltDiff = JSON.stringify(S.WITH.evidence) !== JSON.stringify(S.ALT.evidence);
    const pickedTexts = res.WITH.picked.map((p) => p.item);
    const reached = pickedTexts.filter((t) => JSON.stringify(S.WITH.evidence).includes(t)).length;

    const tn = await pdfText(res.NONE.loginId, res.NONE.pw, res.NONE.attempt, `${OUT}/${tag}-none.pdf`);
    const tw = await pdfText(res.WITH.loginId, res.WITH.pw, res.WITH.attempt, `${OUT}/${tag}-with.pdf`);
    const pages = (f: string) => {
      try {
        return Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [f]).toString())?.[1] ?? 0);
      } catch { return 0; }
    };
    const pn = pages(`${OUT}/${tag}-none.pdf`), pw2 = pages(`${OUT}/${tag}-with.pdf`);
    const flat = (t: string) => t.replace(/\s+/g, "");
    const inPdf = pickedTexts.filter((t) => flat(tw).includes(flat(t).slice(0, 12))).length;
    const over = [tw, JSON.stringify(S.WITH)].map((t) => (t.match(OVERCLAIM) ?? [])[0]).filter(Boolean);
    writeFileSync(`${OUT}/${tag}-none.txt`, tn);
    writeFileSync(`${OUT}/${tag}-with.txt`, tw);

    ok(`${core}: 근거를 고르면 결과 모델이 달라진다`, zoneDiff.length + axisDiff > 0
      || evLines(S.WITH) > evLines(S.NONE), `묶음 ${zoneDiff.length} · 축 ${axisDiff}`);
    ok(`${core}: 고른 근거가 결과 모델에 닿는다`, reached > 0, `${reached}/${pickedTexts.length}`);
    ok(`${core}: 다른 근거를 고르면 근거 글이 달라진다`, withAltDiff);
    ok(`${core}: 고른 근거가 종이에 선다`, inPdf > 0, `${inPdf}/${pickedTexts.length}`);
    ok(`${core}: 근거 없는 종이와 있는 종이가 다르다`, flat(tn) !== flat(tw));
    ok(`${core}: 고른 근거를 검증된 성과로 부풀리지 않는다`, over.length === 0, over.join(" / "));
    ok(`${core}: 종이가 둘 다 뽑힌다`, pn > 0 && pw2 > 0, `${pn} / ${pw2}`);

    table.push(`| ${core} | ${rows.length} | ${pickedTexts.length} | ${zoneDiff.length} | ${axisDiff} | `
      + `${evLines(S.NONE)}→${evLines(S.WITH)} | ${S.NONE.gaps.length}→${S.WITH.gaps.length} | `
      + `${JSON.stringify(S.NONE.actions) === JSON.stringify(S.WITH.actions) ? "같음" : "다름"} | `
      + `${withAltDiff ? "다름" : "같음"} | ${pn}/${pw2} | ${over.length ? over.join(",") : "0"} |`);
    all[core] = { source: src.id, attempts: { NONE: res.NONE.attempt, WITH: res.WITH.attempt,
      ALT: res.ALT.attempt }, picked: res.WITH.picked, picked_alt: res.ALT.picked,
      zoneDiff, axisDiff, NONE: S.NONE, WITH: S.WITH, ALT: S.ALT };
  }
  writeFileSync(`${OUT}/compare.json`, JSON.stringify(all, null, 2));
  writeFileSync(`${OUT}/compare.md`, [
    `# 근거 있음 · 없음 비교 (${new Date().toISOString()})`, "",
    `통과 ${pass} · 걸림 ${bad.length}`, "", ...table, "", ...lines,
  ].join("\n") + "\n");
  console.log(`\n${table.join("\n")}\n\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
