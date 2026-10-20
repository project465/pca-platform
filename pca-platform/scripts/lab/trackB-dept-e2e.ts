/**
 * **Track B · 배재대 학과 자리마다 검사 → 결과를 서버 레벨로 끝까지.**
 *
 * 등록부(`content/campus-universities.json`)의 PCU 자리 가운데 Core 가 붙은
 * 자리 전부를 제품과 같은 길로 지난다: 학교 학생으로 등록 → 학교 맥락으로
 * 응시 열기 → 끝까지 답하기(`_v3-answer.ts` 의 사람 B) → 제출 → 굳은 결과와
 * 판본과 학교·학과 표시를 센다. 그리고 Core 마다 사람 A 와 C 를 한 번 더
 * 돌려 **학생에 따라 결과가 갈리는지**를 본다.
 *
 * 브라우저를 쓰지 않는다(이 환경에서 Next 를 빌드할 수 없다). 화면까지 가는
 * 길은 `pcu:coverage` 가 브라우저로 세던 것이고 이번 회차에서는 NOT VERIFIED.
 *
 *   DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' WORKERS=4 \
 *     OUT=docs/metri/review/tracks/B npx tsx scripts/lab/trackB-dept-e2e.ts
 */
import { loadEnv, makeStudent, registerCampusStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { query, queryOne } from "../../src/lib/db";
import * as S from "../../src/lib/me-v3/runtime/session";
import { allLeaves, university } from "../../src/lib/campus/registry";
import { campusStudentContext } from "../../src/lib/campus/students";
import { resultMeta } from "../../src/lib/me-v3/result/meta";
import { bankVersionOf } from "../../src/lib/me-v3/scoring/version";
import { answerAll, PEOPLE, type Policy } from "../_v3-answer";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\/\/(cm_dev|cm_gm_iso)\b/.test(URL_)) { console.error(`로컬 개발 DB 가 아니다: ${URL_}`); process.exit(2); }
const OUT = process.env.OUT ?? "docs/metri/review/tracks/B";
const WORKERS = Number(process.env.WORKERS ?? 4);
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

type Row = {
  leaf: string; name: string; core: string; spec: string | null; person: string;
  ok: boolean; why: string[]; attempt?: string; dept?: string; zones?: string; ms: number;
};

async function one(leafCode: string, name: string, core: string, spec: string | null, pol: Policy): Promise<Row> {
  const t0 = Date.now(); const why: string[] = [];
  const login = `zztb-${pol.id.toLowerCase()}-${leafCode.toLowerCase()}`;
  const st = await makeStudent(login);
  await registerCampusStudent(st.id, "PCU", leafCode);
  const c = await campusStudentContext(st.id);
  if (!c) return { leaf: leafCode, name, core, spec, person: pol.id, ok: false, why: ["학교 맥락이 서지 않는다"], ms: Date.now() - t0 };
  const a = await S.openAttempt({ userId: st.id, tier: "BASIC", stage: "bachelor", gradField: null, campus: c.ctx });
  if (a.core_code !== core) why.push(`Core 가 다르다: ${a.core_code}`);
  if (a.tier !== "PRO") why.push(`학교 응시가 PRO 가 아니다: ${a.tier}`);
  if (a.department_code !== leafCode) why.push(`학과가 적히지 않았다: ${a.department_code}`);
  if ((a.specialization_code ?? null) !== spec) why.push(`갈래가 다르다: ${a.specialization_code}`);
  await answerAll(core, a, st.id, pol);
  await S.submit((await S.attemptOf(a.id, st.id))!);
  const done = await S.attemptOf(a.id, st.id);
  if (done?.status !== "scored") why.push(`굳지 않았다: ${done?.status}`);
  const snaps = await queryOne<{ n: string; v: Record<string, unknown> | null }>(
    `SELECT count(*)::text n, max(module_versions::text)::jsonb v FROM v3_snapshots WHERE attempt_id=$1`, [a.id]);
  if (snaps?.n !== "1") why.push(`결과 줄이 ${snaps?.n}`);
  const v = snaps?.v ?? {};
  if (v.core_code !== core) why.push(`판본의 Core 가 다르다: ${String(v.core_code)}`);
  const bank = await queryOne<{ b: string }>(`SELECT item_bank_version b FROM v3_attempts WHERE id=$1`, [a.id]);
  if (bank?.b !== bankVersionOf(core)) why.push(`문항 은행 판본이 다르다: ${bank?.b}`);
  const m = await S.latestResult(a.id);
  if (!m) why.push("결과 모델이 없다");
  const meta = await resultMeta(a.id, core);
  if (meta.school !== "배재대학교") why.push(`학교 표시: ${meta.school}`);
  if (!meta.department?.includes(name)) why.push(`학과 표시: ${meta.department}`);
  const zones = m ? m.domains.map((d) => `${d.code}:${d.zone}`).join(",") : "";
  /* 치운다(시험 계정만) */
  await query(`DELETE FROM v3_attempts WHERE user_id=$1`, [st.id]).catch(() => undefined);
  await query(`DELETE FROM campus_students WHERE user_id=$1`, [st.id]).catch(() => undefined);
  return { leaf: leafCode, name, core, spec, person: pol.id, ok: !why.length, why, attempt: a.id, dept: meta.department ?? "", zones, ms: Date.now() - t0 };
}

async function pool<T, R>(xs: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < xs.length) { const k = i++; out[k] = await f(xs[k]); }
  }));
  return out;
}

async function main(): Promise<void> {
  const u = university("PCU")!;
  const leaves = allLeaves(u);
  const seats = leaves.filter((l) => l.leaf.core_code && !l.leaf.routing_only && (!ONLY || ONLY.has(l.leaf.code)));
  const routing = leaves.filter((l) => l.leaf.routing_only);
  const noCore = leaves.filter((l) => !l.leaf.core_code && !l.leaf.routing_only);
  console.log(`PCU 자리 ${leaves.length} · 검사 대상 ${seats.length} · 전공 고르기 ${routing.length} · Core 없음 ${noCore.length}`);

  const jobs: [string, string, string, string | null, Policy][] = seats.map((l) =>
    [l.leaf.code, l.leaf.name, l.leaf.core_code!, l.leaf.specialization ?? null, PEOPLE[1]]);
  /* Core 마다 첫 자리 하나로 사람 A 와 C 를 더 돌린다 */
  const firstOf = new Map<string, (typeof seats)[number]>();
  for (const l of seats) if (!firstOf.has(l.leaf.core_code!)) firstOf.set(l.leaf.core_code!, l);
  for (const l of firstOf.values()) for (const pol of [PEOPLE[0], PEOPLE[2]]) {
    jobs.push([l.leaf.code, l.leaf.name, l.leaf.core_code!, l.leaf.specialization ?? null, pol]);
  }
  let k = 0;
  const rows = await pool(jobs, WORKERS, async (j) => {
    const r = await one(...j).catch((e) => ({ leaf: j[0], name: j[1], core: j[2], spec: j[3], person: j[4].id, ok: false, why: [String(e).slice(0, 160)], ms: 0 } as Row));
    k++; console.log(`  ${r.ok ? "통과" : "걸림"} ${String(k).padStart(3)}/${jobs.length} ${r.person} ${r.leaf} ${r.name} → ${r.core}${r.ok ? "" : " — " + r.why.join(" · ")}`);
    return r;
  });

  /* 학생에 따라 갈리는가: 같은 자리에서 사람 A · B · C 의 영역 판정이 서로 달라야 한다 */
  const diff: { core: string; leaf: string; ab: boolean; bc: boolean; ac: boolean }[] = [];
  for (const [core, l] of firstOf) {
    const z = (p: string) => rows.find((r) => r.leaf === l.leaf.code && r.person === p)?.zones ?? "";
    diff.push({ core, leaf: l.leaf.code, ab: z("A") !== z("B"), bc: z("B") !== z("C"), ac: z("A") !== z("C") });
  }
  const seatRows = rows.filter((r) => r.person === "B");
  const passSeats = seatRows.filter((r) => r.ok).length;
  const passAll = rows.filter((r) => r.ok).length;
  const diffOk = diff.filter((d) => d.ab && d.bc && d.ac).length;

  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "DEPT_E2E.md"), [
    "# Track B · 배재대 학과 자리별 검사 → 결과 (서버 레벨)", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · DB \`${URL_}\` (로컬 개발 DB · 운영 아님) · 동시 ${WORKERS}`,
    "- 길: 학교 학생 등록 → 학교 맥락 응시 → 끝까지 답함 → 제출 → 결과 모델 · 판본 · 학교/학과 표시. **브라우저 아님** (화면은 NOT VERIFIED).",
    `- PCU 자리 ${leaves.length} = 검사 대상 ${seats.length} + 전공 고르기 ${routing.length} + Core 없음 ${noCore.length}`, "",
    `**학과 자리 통과 ${passSeats} / ${seatRows.length}** · 전체 실행 통과 ${passAll} / ${rows.length} · 학생별 결과 갈림 ${diffOk} / ${diff.length} Core`, "",
    "## 학생에 따라 결과가 갈리는가 (Core 마다 첫 자리 · 사람 A/B/C 의 영역 판정)", "",
    "| Core | 자리 | A≠B | B≠C | A≠C |", "|---|---|---|---|---|",
    ...diff.map((d) => `| ${d.core} | ${d.leaf} | ${d.ab ? "다름" : "**같음**"} | ${d.bc ? "다름" : "**같음**"} | ${d.ac ? "다름" : "**같음**"} |`), "",
    "## 자리마다 (사람 B)", "",
    "| 판정 | 자리 | 학과 | Core | 갈래 | 결과에 적힌 학과 | 걸린 까닭 | 초 |", "|---|---|---|---|---|---|---|---|",
    ...seatRows.map((r) => `| ${r.ok ? "PASS" : "**FAIL**"} | ${r.leaf} | ${r.name} | ${r.core} | ${r.spec ?? "—"} | ${r.dept ?? ""} | ${r.why.join(" · ")} | ${Math.round(r.ms / 1000)} |`), "",
    "## 전공 고르기 자리 (Core 를 학생이 고른다)", "",
    ...routing.map((l) => `- ${l.leaf.code} ${l.leaf.name} — 이 검사에서 열지 않음. 학생이 고른 전공으로 열리는 길은 \`pcu:routing\`(브라우저)이 센다: NOT VERIFIED`), "",
    ...(noCore.length ? ["## Core 가 없는 자리", "", ...noCore.map((l) => `- ${l.leaf.code} ${l.leaf.name}`)] : []), "",
  ].join("\n"));
  console.log(`\n학과 자리 통과 ${passSeats} / ${seatRows.length} · 전체 ${passAll} / ${rows.length} · 학생별 갈림 ${diffOk} / ${diff.length}`);
  process.exit(passAll === rows.length && diffOk === diff.length ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
