/**
 * **학과 전부를 한 번에 대어 보는 로컬 점검**(2026-11-02 대표 "전체 학과 다 확인해야지").
 *
 * 운영 · 미리보기 DB 에는 쓰지 않는다. 로컬 DB 에 지어낸 응시자를 세우고 책을 그린 뒤 표 한 장을 낸다.
 *
 *   STEP=make npx tsx scripts/local-book-batch.ts      응시를 세우고 OUT/attempts.json 을 적는다
 *   ATTEMPT=$(…) npm run report:long                   책을 그린다(이 파일 밖)
 *   STEP=table npx tsx scripts/local-book-batch.ts     책 글과 결과 모델을 읽어 표를 낸다
 *
 * 답안 두 벌(시험 세션 요청):
 *   A = 깊게 연 영역의 모든 판단을 `기준까지 직접 정함` 으로, 체크리스트 · 결과물 · 비교 대상을 채움
 *   B = 같은 영역을 `시킨 대로` 로, 체크리스트 · 결과물 · 비교 대상을 비움
 * 같은 기관 · 같은 Core 의 학과는 결과가 같으므로 한 벌씩만 세우고 학과 줄마다 그 결과를 붙인다.
 * 한계: 지원서 문항(번역 단계)과 자유 서술은 채우지 않는다(엔진 입력에 없는 칸).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { universities, university, allLeaves, statusOf } from "../src/lib/campus/registry";
import { core as coreEntry, coreFile } from "../src/lib/me-v3/core-registry";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { expand, AXES, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../src/lib/me-v3/result/build";
import { industryChoices, roleChoices } from "../src/lib/me-v3/runtime/session";
import { RESULT_MODEL_VERSION } from "../src/lib/me-v3/result/version";
import { roleForGoal } from "../src/lib/me-v3/result/goal-role";
import { query, queryOne } from "../src/lib/db";

const OUT = path.resolve(process.env.OUT ?? "var/book-batch");
const UNIS = (process.env.UNIS ?? "PCU,KUS,JJU,SJEPA").split(",");
type Row = { uni: string; uniName: string; leaf: string; leafName: string; core: string };
type Made = { key: string; uni: string; core: string; style: "A" | "B"; attempt: string; goalRole: string | null; goalInd: string | null; error?: string };

function rows(): Row[] {
  const out: Row[] = [];
  for (const u0 of universities()) {
    if (!UNIS.includes(u0.university_code)) continue;
    const u = university(u0.university_code)!;
    const seen = new Set<string>();
    for (const r of allLeaves(u)) {
      if (seen.has(r.leaf.code) || r.catalog.catalog_year > 2026) continue;
      seen.add(r.leaf.code);
      if (statusOf(u, r) !== "READY" || !r.leaf.core_code) continue;
      out.push({ uni: u.university_code, uniName: u.university_name, leaf: r.leaf.code, leafName: r.leaf.name, core: r.leaf.core_code });
    }
  }
  return out;
}

function persona(core: string, style: "A" | "B"): Fixture {
  const dom = coreFile<{ domains: { code: string; artifacts: string[]; verify_targets: string[] }[] }>(core, "domains");
  const lists = coreFile<{ domains: Record<string, Record<string, { text: string }[]>> }>(core, "checklists");
  const codes = dom.domains.map((d) => d.code);
  const deep = codes.slice(0, 3);
  const probe = codes.slice(0, 6);
  const lv = style === "A" ? 3 : 1;
  const axes: Fixture["axes"] = {};
  const checklist: Fixture["checklist"] = {};
  const grid: Fixture["grid"] = {};
  for (const td of probe) {
    grid[td] = deep.includes(td) ? [5, 3, 5] : [4, 2, 4];
    axes[td] = Object.fromEntries(AXES.map((a) => [a, lv]));
    if (style === "A" && deep.includes(td)) {
      checklist[td] = Object.fromEntries(AXES.map((a) => [a, Math.min(2, lists.domains[td]?.[a]?.length ?? 0)]).filter(([, n]) => (n as number) > 0));
    }
  }
  const ind = industryChoices(core).map((x) => x.code);
  const rol = roleChoices(core).map((x) => x.code);
  return {
    id: `B${style}`, name: style === "A" ? "직접 정함 위주" : "시킨 대로 위주", tier: "PRO", stage: "bachelor", field: null,
    probe, deep, grid, axes, checklist: style === "A" ? checklist : undefined,
    artifacts: style === "A" ? Object.fromEntries(deep.map((td) => [td, 2])) : undefined,
    verify: style === "A" ? Object.fromEntries(deep.map((td) => [td, 2])) : undefined,
    industry: ind[0] ?? null, role: rol[0] ?? null,
  };
}

async function make(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const rs = rows();
  const combos = [...new Map(rs.map((r) => [`${r.uni}:${r.core}`, r])).values()];
  const made: Made[] = [];
  for (const c of combos) {
    for (const style of ["A", "B"] as const) {
      const key = `${c.uni}:${c.core}:${style}`;
      try {
        if (!coreEntry(c.core).fixtures) throw new Error("이 Core 에 fixture 등록이 없음");
        const f = persona(c.core, style);
        const loaded = load(c.core);
        const snapshot = score(expand(f, c.core), loaded);
        const model = buildResult(snapshot, loaded, { packs: { industries: industryChoices(c.core).map((x) => x.code), roles: roleChoices(c.core).map((x) => x.code) } });
        /* 목표 직무는 관심 직무와 다른 것으로(웹이 목표 직무를 첫째로 잇는지 본다). 목표 산업은 지역 장에 회사가 있을 법한 첫 산업 */
        const rol = roleChoices(c.core).map((x) => x.code);
        const goalRole = rol[1] ?? rol[0] ?? null;
        const goalInd = industryChoices(c.core)[0]?.code ?? null;
        const m = { ...model, targets: { ...model.targets, goal: { ...model.targets.goal, role: goalRole, industry: goalInd } } };
        const u = (await queryOne<{ id: string }>(`INSERT INTO users (email, display_name, password_hash) VALUES ($1,'점검 학생','x') RETURNING id::text`, [`batch-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`]))!.id;
        const a = (await queryOne<{ id: string }>(`INSERT INTO v3_attempts (user_id, tier, core_code, education_stage, item_bank_version, scoring_version, status, university_code) VALUES ($1,'PRO',$2,'bachelor','x','x','scored',$3) RETURNING id::text`, [u, c.core, c.uni]))!.id;
        await query(`INSERT INTO v3_snapshots (attempt_id, module_versions, response_quality, payload, result_model, result_model_version, result_copy_version) VALUES ($1,'{}',$2,$3,$4,$5,'x')`, [a, snapshot.response_quality.flag, JSON.stringify(snapshot), JSON.stringify(m), RESULT_MODEL_VERSION]);
        made.push({ key, uni: c.uni, core: c.core, style, attempt: a, goalRole, goalInd });
      } catch (e) {
        made.push({ key, uni: c.uni, core: c.core, style, attempt: "", goalRole: null, goalInd: null, error: String((e as Error).message).slice(0, 160) });
      }
    }
  }
  writeFileSync(path.join(OUT, "attempts.json"), JSON.stringify({ rows: rs, made }, null, 1));
  console.log(`학과 ${rs.length} · 기관×Core ${combos.length} · 응시 ${made.filter((m) => m.attempt).length} · 오류 ${made.filter((m) => m.error).length}`);
  console.log(made.filter((m) => m.attempt).map((m) => m.attempt).join(","));
}

async function table(): Promise<void> {
  const { rows: rs, made } = JSON.parse(readFileSync(path.join(OUT, "attempts.json"), "utf8")) as { rows: Row[]; made: Made[] };
  const books = process.env.BOOKS ? path.resolve(process.env.BOOKS) : OUT;
  const summ = existsSync(path.join(books, "summary.json")) ? JSON.parse(readFileSync(path.join(books, "summary.json"), "utf8")) : [];
  const pagesOf = new Map<string, { pages?: number; problem?: string }>((Array.isArray(summ) ? summ : summ.books ?? []).map((b: { attempt?: string | number; id?: string | number; pages?: number; problem?: string; error?: string }) => [String(b.attempt ?? b.id), { pages: b.pages, problem: b.problem ?? b.error }]));
  const metric = async (m: Made) => {
    if (!m.attempt) return null;
    const f = path.join(books, m.attempt, "book.txt");
    const txt = existsSync(f) ? readFileSync(f, "utf8") : "";
    const snap = await queryOne<{ m: never }>(`SELECT result_model AS m FROM v3_snapshots WHERE attempt_id = $1`, [m.attempt]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model: any = snap?.m;
    const region = /PART 0?1 ([^\n]*?) 기업 살펴보기/.exec(txt)?.[1] ?? "";
    const chapter = txt.split(/PART 0?2 /)[0] ?? "";
    const groups = [...chapter.matchAll(/^\s*([^\n·]+?·?[^\n·]*?) · (\d+)곳\s*$/gm)].map((g) => `${g[1].trim()} ${g[2]}`);
    const uniqGroups = [...new Set(groups)];
    const firstGroup = /고르신 산업 ([^\n]*?)의 [^\n]* 회사 (\d+)곳/.exec(chapter);
    const goalIndName = m.goalInd ? industryChoices(m.core).find((x) => x.code === m.goalInd)?.name ?? m.goalInd : "";
    const rv = roleForGoal(m.core, model);
    const evMore = (k: "ready" | "partial") => Math.max(0, (model?.evidence?.[k] ?? []).filter((e: { picks: string[] }) => e.picks.length).length - 6);
    return {
      domains: (model?.domains ?? []).map((d: { code: string }) => d.code).length,
      region,
      orgs: uniqGroups.join(" / "),
      publicN: (/공공·공기관 · (\d+)곳/.exec(chapter)?.[1]) ?? "0",
      chosenFirst: firstGroup ? `예(${firstGroup[1]})` : goalIndName ? `아니오 · 고른 산업 ${goalIndName} 회사 없음` : "고른 산업 없음",
      goalFirst: rv?.code === m.goalRole ? "예" : "아니오",
      never: (txt.match(/아직 해 본 적이 없(어요|다고)/g) ?? []).length,
      more: `${evMore("ready")}/${evMore("partial")}`,
      ent: /&(apos|amp|quot|lt|gt|#\d+);/.test(txt) ? "있음" : "없음",
      pages: pagesOf.get(m.attempt)?.pages ?? (txt ? (txt.match(/\f/g) ?? []).length : 0),
      err: m.error ?? pagesOf.get(m.attempt)?.problem ?? (txt ? "" : "책 없음"),
    };
  };
  const byKey = new Map<string, Awaited<ReturnType<typeof metric>>>();
  for (const m of made) byKey.set(m.key, m.error ? null : await metric(m));
  const head = ["기관", "학과", "Core", "답안", "영역 수", "01장 지역", "01장 산업별 회사 수", "공공기관 수", "고른 산업이 첫 산업", "목표 직무가 첫째", "'해 본 적 없' 횟수", "이 밖에 N(ready/partial)", "HTML 엔티티", "쪽수", "오류"];
  const lines: string[][] = [];
  for (const r of rs) for (const style of ["A", "B"] as const) {
    const m = made.find((x) => x.key === `${r.uni}:${r.core}:${style}`);
    const v = m ? byKey.get(m.key) : null;
    lines.push([r.uniName, r.leafName, coreEntry(r.core).major ?? r.core, style, String(v?.domains ?? ""), v?.region ?? "", v?.orgs ?? "", v?.publicN ?? "", v?.chosenFirst ?? "", v?.goalFirst ?? "", String(v?.never ?? ""), v?.more ?? "", v?.ent ?? "", String(v?.pages ?? ""), m?.error ?? v?.err ?? ""]);
  }
  const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  writeFileSync(path.join(OUT, "학과별-점검표.csv"), "﻿" + csv);
  const md = [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...lines.map((l) => `| ${l.map((c) => String(c).replace(/\|/g, "/")).join(" | ")} |`)].join("\n");
  writeFileSync(path.join(OUT, "학과별-점검표.md"), `# 학과별 결과 점검표(로컬 · 지어낸 답안)\n\n${md}\n`);
  console.log(`표 ${lines.length}줄 → ${OUT}`);
}

(process.env.STEP === "table" ? table() : make()).then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
