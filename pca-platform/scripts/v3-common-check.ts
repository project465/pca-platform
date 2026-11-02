/**
 * **공통 자동 점검**(2026-11-02 대표 "제안순서대로 해" 1번). 기관마다 따로 보지 않고, 모든 기관 ·
 * 모든 과목 묶음(Core) · 갈래에 같은 답안 세 벌을 **제품과 같은 길**로 밟게 한 뒤 책(PDF 재료)을 엮어
 * 모순을 센다. 고칠 때마다 이것을 돌린다.
 *
 * 로컬 DB 에만 쓴다. 운영 · 미리보기 DB 에는 쓰지 않는다.
 *
 *   npx tsx scripts/v3-common-check.ts                 전부(UNIS=PCU,KUS,JJU,SJEPA · SETS=A,B,C)
 *   UNIS=JJU SETS=C npx tsx scripts/v3-common-check.ts
 *   OUT=var/common-check                               표(md · csv)와 응시 번호를 적는 자리
 *
 * 답안 세 벌(제품 화면을 그대로 지난다: 격자 → 실제 영역 고르기 → 판단 · 체크리스트 · 지원서 문장 단계):
 *   A = 관심 높음 · 해 봄 여러 번 · 모든 판단 `기준까지 직접 정함` · 체크리스트 · 결과물 · 비교 대상 채움
 *   B = 관심 모두 낮음 · 해 본 적 없음 · 판단 `시킨 대로` · 아무것도 고르지 않음
 *   C = 관심 칸 셋 중 하나 `모르겠다` · 학습 의향 일부 `모르겠다` · 판단 단계 섞음(정함 · 없음 · 직접 · 시킨 대로) ·
 *       `모르겠다` 보기 섞음 · 직접 쓴 문장(문제 · 바꾸지 않은 것 · 쓰지 않은 방법 · 횟수 · 판단 덧말) ·
 *       `없다` 는 보기 하나
 *
 * 판정(걸리면 표의 `걸림` 칸에 이름이 남는다):
 *   a  심화 영역이 0곳 열림
 *   b  판단을 `직접 해 봄` 이상으로 답했는데 06장이 그 판단을 `해 본 적이 없다고 답했어요` 라고 적음
 *   c  판단까지 물은 영역이 없는데 07장이 `빈 판단이 없다` 고 적음
 *   d  직접 쓴 문장이 그 칸 이름표(TRANS_NOTE_KO) 없이 실리거나 다른 이름표로 실림
 *   e  빈 판단이 없다고 적고 06장이 `07장 할 일에서 채워요` 를 냄(할 일 모순 · PB2)
 *   f  결과물을 고른 영역에 `결과물을 아직 고르지 않았습니다`(PB3)
 *   g  관심이 모두 낮은데 `관심이 높은 · 보통 이상인 영역 · 관심 있는 쪽` 을 권함(PB1)
 *   h  `없다` 는 답이 06 · 07장 문단 재료로 들어감(PK2)
 *   k  준비 중 학과로 응시가 열림(KM1) — 기관마다 한 줄
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { universities, university, allLeaves, statusOf } from "../src/lib/campus/registry";
import { coreFile } from "../src/lib/me-v3/core-registry";
import { controlOf } from "../src/lib/me-v3/runtime/menus";
import {
  attemptOf, checklistFor, choosePack, content, itemOf, menuContextOf, moveTo, openAttempt, saveAnswer, saveNote,
  savePicks, submit, viewOf, industryChoices, roleChoices, type CampusEntry, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import { UNKNOWN, type Answer } from "../src/lib/me-v3/scoring/types";
import { loadInputs } from "../src/lib/me-v3/report-long/data";
import { assemble } from "../src/lib/me-v3/report-long";
import { derive } from "../src/lib/me-v3/report-long/derive";
import { TRANS_NOTE_KO, isNoneChoice } from "../src/lib/me-v3/result/text.ko";
import { query, queryOne } from "../src/lib/db";

const OUT = path.resolve(process.env.OUT ?? "var/common-check");
const UNIS = (process.env.UNIS ?? "PCU,KUS,JJU,SJEPA").split(",");
const SETS = (process.env.SETS ?? "A,B,C").split(",") as Set[];
type Set = "A" | "B" | "C";

/** 직접 쓴 문장. 책에서 찾을 수 있게 칸마다 다른 글로 쓴다 */
const NOTES: Record<string, string> = {
  TR_T1: "점검C 문제 두 줄 메모",
  TR_T2: "점검C 무엇이 문제였나 메모",
  TR_T3: "점검C 검토했지만 쓰지 않은 방법 메모",
  TR_T4: "점검C 끝까지 바꾸지 않은 것 메모",
  TR_T5: "점검C 세 번 되풀이",
  TR_T10: "점검C 다음 학기 후배가 활용",
};
const JUDGE_NOTE = "점검C 판단 덧말";

type Row = { uni: string; uniName: string; core: string; spec: string | null; leaf: string; leafName: string; college: string };

function combos(): Row[] {
  const out = new Map<string, Row>();
  for (const u0 of universities()) {
    if (!UNIS.includes(u0.university_code)) continue;
    const u = university(u0.university_code)!;
    for (const r of allLeaves(u)) {
      if (r.catalog.catalog_year > 2026 || statusOf(u, r) !== "READY" || !r.leaf.core_code) continue;
      const spec = (r.leaf as { specialization?: string | null }).specialization ?? null;
      const key = `${u.university_code}:${r.leaf.core_code}:${spec ?? "-"}`;
      if (!out.has(key)) {
        out.set(key, { uni: u.university_code, uniName: u.university_name, core: r.leaf.core_code, spec,
          leaf: r.leaf.code, leafName: r.leaf.name, college: r.college.code });
      }
    }
  }
  return [...out.values()];
}

async function student(tag: string): Promise<string> {
  const id = (await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash) VALUES ($1,'점검 학생','x') RETURNING id::text`,
    [`common-${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`]))!.id;
  await query(`INSERT INTO entitlements (user_id, product_code, kind, tier, major_code, assessment_version, status)
               VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [id]);
  return id;
}

/** C 의 판단 단계 순환(0 해 본 적 없음 · 1 시킨 대로 · 2 직접 해 봄 · 3 기준까지 직접 정함) */
const C_LEVELS = [3, 0, 2, 1, 3, 2];

async function walk(core: string, a0: V3Attempt, userId: string, set: Set): Promise<void> {
  const tds = content(core).domains.domains.map((d) => d.code);
  for (const [i, td] of tds.entries()) {
    const int: Answer = set === "A" ? { kind: "scale5", value: 5 } : set === "B" ? { kind: "scale5", value: 1 + (i % 2) }
      : i % 3 === 0 ? { kind: "choice", value: UNKNOWN } : { kind: "scale5", value: [5, 4, 2][i % 3] };
    const exp: Answer = { kind: "exposure", value: set === "A" ? 2 : set === "B" ? 0 : [2, 1, 0, 1][i % 4] };
    const lea: Answer = set === "C" && i % 4 === 1 ? { kind: "choice", value: UNKNOWN } : { kind: "scale5", value: set === "B" ? 2 : 4 };
    await saveAnswer(a0.id, `G_${td}_INT`, int);
    await saveAnswer(a0.id, `G_${td}_EXP`, exp);
    await saveAnswer(a0.id, `G_${td}_LEA`, lea);
  }
  const ind = industryChoices(core)[0]?.code ?? null;
  const rol = roleChoices(core)[0]?.code ?? null;
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = null, guard = 0, n = 0, judgeNoted = false, noneUsed = false;
  for (;;) {
    if ((guard += 1) > 500) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    const ctx = await menuContextOf(a);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const it = itemOf(core, id);
      if (!it) continue;
      const control = controlOf(it, ctx);
      n += 1;
      let ans: Answer | null = null;
      if (control.kind === "level") {
        const idx = set === "A" ? 3 : set === "B" ? 1 : C_LEVELS[n % C_LEVELS.length];
        ans = { kind: "level", index: Math.min(idx, control.options.length - 1) };
      } else if (control.kind === "scale5") {
        ans = { kind: "scale5", value: set === "A" ? 5 : set === "B" ? 2 : 3 + (n % 3) };
      } else if (control.kind === "exposure") {
        ans = { kind: "exposure", value: set === "A" ? 2 : set === "B" ? 0 : n % 3 };
      } else if (control.kind === "steps") {
        const opts = control.options;
        const real = opts.filter((o) => o.value !== null);
        const unknown = opts.find((o) => o.value === null);
        if (set === "C" && unknown && n % 3 === 0) ans = { kind: "choice", value: UNKNOWN };
        else {
          const pick = set === "A" ? real[real.length - 1] : set === "B" ? real[0] : real[n % real.length];
          ans = control.answer === "exposure" ? { kind: "exposure", value: pick.value as number } : { kind: "scale5", value: pick.value as number };
        }
      } else if (control.kind === "choice" && control.options.length) {
        const none = control.options.find((o) => isNoneChoice(o.label));
        const some = control.options.filter((o) => !isNoneChoice(o.label));
        let o = some[0] ?? control.options[0];
        if (set === "B" && none) o = none;
        if (set === "C") {
          if (none && !noneUsed) { o = none; noneUsed = true; } else o = some[n % Math.max(1, some.length)] ?? o;
        }
        ans = { kind: "choice", value: o.value };
      }
      if (ans) await saveAnswer(a.id, id, ans);
      if (set === "C") {
        if (NOTES[id]) await saveNote(a.id, id, NOTES[id]);
        else if (!judgeNoted && control.kind === "level") { await saveNote(a.id, id, JUDGE_NOTE); judgeNoted = true; }
      }
    }
    if (v.screen.kind === "checklist" && v.screen.domain) {
      const di = tds.indexOf(v.screen.domain);
      for (const g of checklistFor(core, v.screen.domain)) {
        const k = set === "A" ? 2 : set === "B" ? 0 : di % 2 === 0 ? 1 : 0;
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, k));
      }
    }
    if (v.screen.kind === "pick-industry" && ind) await choosePack(core, a.id, "industry", ind);
    if (v.screen.kind === "pick-role" && rol) await choosePack(core, a.id, "role", rol);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
}

const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ");

type Verdict = { opened: number; deep: number; fails: string[]; detail: string[] };

async function judge(attemptId: string, core: string): Promise<Verdict> {
  const at = (await queryOne<{ p: string[] | null; d: string[] | null }>(
    `SELECT opened_probe AS p, opened_deep AS d FROM v3_attempts WHERE id = $1`, [attemptId]))!;
  const x = await loadInputs(attemptId);
  const { pages } = assemble(x);
  const d = derive(x);
  const fails: string[] = [], detail: string[] = [];
  const fail = (k: string, why: string) => { if (!fails.includes(k)) fails.push(k); detail.push(`${k}: ${why}`); };
  const byPart = (p: string) => pages.filter((g) => g.part === p).map((g) => strip(`${g.title} ${g.body}`)).join(" \n ");
  const all = pages.map((g) => strip(`${g.title} ${g.body}`)).join(" \n ");
  const ch6 = byPart("06"), ch7 = byPart("07");

  /* a */
  if (!(at.d ?? []).length && !(at.p ?? []).length) fail("a", "심화 · 선별 영역 0곳");

  /* b: 응답 그대로(원 응답 표)에서 축마다 가장 높은 단계 */
  const bank = coreFile<{ items: { item_id: string; technical_domain?: string; evidence_axis?: string; module?: string }[] }>(core, "items");
  const meta = new Map(bank.items.map((i) => [i.item_id, i]));
  const raw = await query<{ item_id: string; v: number | null; kind: string }>(
    `SELECT item_id, value_int AS v, kind FROM v3_responses WHERE attempt_id = $1`, [attemptId]);
  const maxLv = new Map<string, number>();
  for (const r of raw) {
    const mi = meta.get(r.item_id);
    /* 산업 · 직무팩 문항은 그 영역의 Core 판정에 들지 않는다(엔진이 Core 문항으로 축을 정한다) */
    if (r.kind !== "level" || r.v == null || !mi?.technical_domain || !mi.evidence_axis || /^(INDUSTRY|ROLE)/.test(mi.module ?? "")) continue;
    const k = `${mi.technical_domain}:${mi.evidence_axis}`;
    maxLv.set(k, Math.max(maxLv.get(k) ?? -1, r.v));
  }
  for (const def of x.defs) {
    const nm = d.name(def.code);
    for (const [ax, a] of Object.entries(def.axes ?? {})) {
      const l2 = (a as { l2?: string }).l2;
      if (!l2 || (maxLv.get(`${def.code}:${ax}`) ?? -1) < 1) continue;
      const i = ch6.indexOf(`${nm}에서 ‘${l2}’`) >= 0 ? ch6.indexOf(`${nm}에서 ‘${l2}’`) : ch6.indexOf(`${nm}에서 '${l2}'`);
      if (i >= 0 && /아직 해 본 적이 없다고 답했어요/.test(ch6.slice(i, i + 500).split(/면접 질문|스스로 묻기/)[0])) {
        fail("b", `${nm} ${ax} 응답 ${maxLv.get(`${def.code}:${ax}`)} 단계인데 06장 '해 본 적 없다'`);
      }
    }
  }

  /* c · e */
  const asked = x.m.domains.some((z) => d.asked(z));
  const saysNoGap = /지금 바로 메워야 할 판단은 나오지 않았습니다/.test(ch7);
  if (!asked && saysNoGap) fail("c", "물은 영역 0곳인데 '빈 판단 없음'");
  if (saysNoGap && (/07장 할 일[^.]*에서 채워요/.test(ch6) || d.gaps.length > 0)) fail("e", `빈 판단 없음이라 적고 빈 판단 ${d.gaps.length} · 06장 '채워요'`);

  /* d: 직접 쓴 문장은 그 칸 이름표와 함께만 */
  for (const [id, note] of Object.entries(NOTES)) {
    let from = 0;
    for (;;) {
      const i = all.indexOf(note, from);
      if (i < 0) break;
      const before = all.slice(Math.max(0, i - 40), i);
      const lab = TRANS_NOTE_KO[id];
      if (lab && !before.includes(lab)) fail("d", `${id} 문장 앞 이름표 '${lab}' 없음: …${before.slice(-25)}`);
      for (const [oid, other] of Object.entries(TRANS_NOTE_KO)) {
        if (oid !== id && before.endsWith(`${other}: “`)) fail("d", `${id} 문장이 '${other}' 이름표로 실림`);
      }
      from = i + note.length;
    }
  }

  /* f: 결과물을 고른 영역 */
  const picks = await query<{ td: string; slot: string; n: number }>(
    `SELECT domain_code AS td, slot, count(*)::int AS n FROM v3_evidence_picks WHERE attempt_id = $1 GROUP BY 1, 2`, [attemptId]);
  for (const p of picks.filter((r) => r.slot === "ARTIFACT" && r.n > 0)) {
    const nm = d.name(p.td);
    for (const pg of pages) {
      for (const tr of pg.body.split(/<\/tr>/)) {
        const t = strip(tr);
        if (t.includes(nm) && /결과물을 아직 고르지 않았습니다|결과물을 아직 고르지 않으셨습니다/.test(t)) fail("f", `${nm} 결과물 ${p.n}개 골랐는데 '${pg.title}' 줄이 '아직 고르지 않음'`);
      }
    }
  }

  /* g */
  if (!x.m.domains.some((z) => z.interest === "HIGH" || z.interest === "MID")) {
    const m = /관심이 (높은|보통 이상인) 영역[^.]{0,30}(골라|부터)|관심 있는 쪽은|관심 영역을 골라/.exec(all);
    if (m) fail("g", `관심 모두 낮은데 '${m[0]}'`);
  }

  /* h: `없다` 는 답이 문단 재료로 */
  const chosen = await query<{ t: string }>(
    `SELECT value_text AS t FROM v3_responses WHERE attempt_id = $1 AND kind = 'choice' AND value_text IS NOT NULL`, [attemptId]);
  for (const r of chosen) {
    const label = r.t;
    if (!isNoneChoice(label)) continue;
    for (const [nm, txt] of [["06", ch6], ["07", ch7]] as const) {
      if (txt.includes(`“${label}`) || txt.includes(`${label}”`)) fail("h", `'${label}' 이 ${nm}장 문단 재료`);
    }
  }
  return { opened: (at.p ?? []).length, deep: (at.d ?? []).length, fails, detail };
}

async function km1(): Promise<string[][]> {
  const lines: string[][] = [];
  for (const u0 of universities()) {
    if (!UNIS.includes(u0.university_code)) continue;
    const u = university(u0.university_code)!;
    /* 전공을 고르는 자리(`routing_only` · 미네르바학부 같은 곳)는 학과가 아니다: 고르면 전공 목록으로 돌려보낸다 */
    const held = allLeaves(u).filter((r) => r.catalog.catalog_year <= 2026 && !r.leaf.routing_only && statusOf(u, r) !== "READY");
    let opened = 0;
    const names: string[] = [];
    for (const r of held) {
      const uid = await student("km1");
      const entry: CampusEntry = { university_code: u.university_code, college_code: r.college.code, department_code: r.leaf.code,
        core_code: r.leaf.core_code ?? "CS_CORE_V1", specialization: (r.leaf as { specialization?: string | null }).specialization ?? null };
      try {
        const a = await openAttempt({ userId: uid, tier: "PRO", stage: "bachelor", gradField: null, campus: entry });
        if (a.department_code === r.leaf.code) { opened += 1; names.push(r.leaf.name); }
      } catch { /* 막혔다: 기대한 대로 */ }
    }
    lines.push([u.university_name, String(held.length), String(opened), names.slice(0, 6).join(" · ")]);
  }
  return lines;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const rs = combos();
  const head = ["기관", "Core", "갈래", "대표 학과", "답안", "선별/심화", "걸림", "자세히", "응시"];
  const lines: string[][] = [];
  let i = 0;
  for (const r of rs) {
    for (const set of SETS) {
      i += 1;
      let attempt = "", v: Verdict | null = null, err = "";
      try {
        const uid = await student(set);
        const entry: CampusEntry = { university_code: r.uni, college_code: r.college, department_code: r.leaf, core_code: r.core, specialization: r.spec };
        const a0 = await openAttempt({ userId: uid, tier: "PRO", stage: "bachelor", gradField: null, campus: entry });
        attempt = a0.id;
        await walk(r.core, a0, uid, set);
        await submit((await attemptOf(a0.id, uid)) as V3Attempt);
        v = await judge(a0.id, r.core);
      } catch (e) { err = String((e as Error).message).slice(0, 140); }
      lines.push([r.uniName, r.core.replace(/_CORE_V1$/, ""), r.spec ?? "", r.leafName, set,
        v ? `${v.opened}/${v.deep}` : "", err ? "오류" : (v!.fails.join(",") || "통과"), err || (v?.detail.slice(0, 3).join(" / ") ?? ""), attempt]);
      process.stdout.write(`\r${i}/${rs.length * SETS.length}`);
    }
  }
  const k = await km1();
  const pass = lines.filter((l) => l[6] === "통과").length;
  const tally = (key: string) => lines.filter((l) => l[6].split(",").includes(key)).length;
  const sum = `세운 응시 ${lines.length} · 통과 ${pass} · 오류 ${lines.filter((l) => l[6] === "오류").length} · ` +
    ["a", "b", "c", "d", "e", "f", "g", "h"].map((x) => `${x} ${tally(x)}`).join(" · ");
  const md = (h: string[], ls: string[][]) => [`| ${h.join(" | ")} |`, `|${h.map(() => "---").join("|")}|`, ...ls.map((l) => `| ${l.map((c) => c.replace(/\|/g, "/")).join(" | ")} |`)].join("\n");
  writeFileSync(path.join(OUT, "공통점검.md"), `# 공통 자동 점검\n\n${sum}\n\n${md(head, lines)}\n\n## 준비 중 학과 응시(KM1)\n\n${md(["기관", "준비 중 학과", "열린 응시", "열린 학과(앞 6)"], k)}\n`);
  writeFileSync(path.join(OUT, "공통점검.csv"), "﻿" + [head, ...lines].map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n"));
  console.log(`\n${sum}`);
  console.log(`KM1 ${k.map((l) => `${l[0]} ${l[2]}/${l[1]}`).join(" · ")}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
