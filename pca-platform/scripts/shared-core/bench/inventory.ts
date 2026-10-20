/**
 * R37 §4-1 — Core 의 실제 현황을 저장소에서 센다(읽기만).
 *
 *   node --no-warnings --experimental-strip-types \
 *     --import ./scripts/shared-core/test/register.mjs scripts/shared-core/bench/inventory.ts
 *
 * 문서에 적힌 것을 옮기지 않는다. 등록부가 가리키는 파일을 열어 센다. 파일이
 * 없으면 0 으로 적지 않고 `missing` 으로 적는다.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { registry, CONTENT_DIR } from "../../../src/lib/me-v3/core-registry";

const OUT = process.env.OUT ?? "docs/shared-core/evidence/R37/bench";
type J = Record<string, unknown>;
const read = (f: string): J | null => {
  const p = join(CONTENT_DIR, f);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) as J : null;
};
const count = <T>(xs: T[], key: (x: T) => string) =>
  xs.reduce<Record<string, number>>((m, x) => { const k = key(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

const rows: J[] = [];
for (const c of registry().cores) {
  const f = (c.files ?? {}) as Record<string, string>;
  if (c.status === "planned") { rows.push({ code: c.code, status: c.status }); continue; }
  const items = (read(f.items ?? "")?.items ?? []) as { module: string; tier: string; technical_domain: string | null }[];
  const domains = (read(f.domains ?? "")?.domains ?? []) as { code: string; required_axes: string[]; artifacts: string[]; verify_targets: string[] }[];
  const lists = (read(f.checklists ?? "")?.domains ?? {}) as Record<string, Record<string, unknown[]>>;
  const rel = read(f.relations ?? "") as { td_industry?: { td: string; industry: string; strength: string }[]; td_role?: { td: string; role: string; strength: string }[] } | null;
  const packs = (c as unknown as { packs?: { industry?: string; role?: string } }).packs ?? {};
  const ind = ((read(packs.industry ?? "")?.packs ?? []) as { code: string }[]).map((p) => p.code);
  const rol = ((read(packs.role ?? "")?.packs ?? []) as { code: string }[]).map((p) => p.code);
  const tds = new Set(domains.map((d) => d.code));
  const ti = rel?.td_industry ?? [], tr = rel?.td_role ?? [];
  const broken = [
    ...ti.filter((r) => !tds.has(r.td) || !ind.includes(r.industry)).map((r) => `I:${r.td}/${r.industry}`),
    ...tr.filter((r) => !tds.has(r.td) || !rol.includes(r.role)).map((r) => `R:${r.td}/${r.role}`),
  ];
  const dupPairs = Object.entries(count(ti, (r) => `${r.td}|${r.industry}`)).filter(([, n]) => n > 1).length
    + Object.entries(count(tr, (r) => `${r.td}|${r.role}`)).filter(([, n]) => n > 1).length;
  const fx = (c as unknown as { fixtures?: Record<string, string> }).fixtures ?? {};
  rows.push({
    code: c.code, status: c.status, open_to_students: (c as unknown as { open_to_students?: boolean }).open_to_students ?? null,
    maturity: (c as unknown as { maturity?: string }).maturity ?? null,
    files_missing: Object.entries(f).filter(([, v]) => !existsSync(join(CONTENT_DIR, v))).map(([k]) => k),
    items: items.length, items_by_tier: count(items, (i) => i.tier), items_by_module: count(items, (i) => i.module),
    domains: domains.length, required_axes_per_domain: domains.map((d) => d.required_axes.length),
    checklist_items: Object.values(lists).reduce((n, byAx) => n + Object.values(byAx).reduce((m, l) => m + l.length, 0), 0),
    artifacts: domains.reduce((n, d) => n + d.artifacts.length, 0),
    verify_targets: domains.reduce((n, d) => n + d.verify_targets.length, 0),
    industry_packs: ind.length, role_packs: rol.length,
    relations: { td_industry: ti.length, td_role: tr.length, broken: broken.length, broken_sample: broken.slice(0, 3),
      duplicate_pairs: dupPairs, strength: count([...ti, ...tr], (r) => r.strength),
      domains_without_industry: [...tds].filter((t) => !ti.some((r) => r.td === t)).length,
      packs_without_domain: ind.filter((p) => !ti.some((r) => r.industry === p)).length + rol.filter((p) => !tr.some((r) => r.role === p)).length },
    fixtures: { personas: Boolean(fx.personas && existsSync(fx.personas)), bank_lock: Boolean(fx.bank_lock && existsSync(fx.bank_lock)) },
  });
}

/* 판정이 모델(LLM)을 부르는가 — me-v3 전체에서 센다 */
const src = walk("src/lib/me-v3");
const llm = src.filter((p) => /anthropic|openai|@ai-sdk|generateText|chat\.completions|messages\.create/i.test(readFileSync(p, "utf8")));
const net = src.filter((p) => /\bfetch\s*\(/.test(readFileSync(p, "utf8")));

mkdirSync(OUT, { recursive: true });
const out = { cores: rows, llm_calls_in_me_v3: llm, fetch_in_me_v3: net, me_v3_files: src.length };
writeFileSync(join(OUT, "inventory.json"), `${JSON.stringify(out, null, 2)}\n`);
const built = rows.filter((r) => r.status !== "planned");
console.log(`  Core ${rows.length} · 짓는 중/열림 ${built.length} · planned ${rows.length - built.length}`);
for (const r of built) {
  const rel = r.relations as { td_industry: number; td_role: number; broken: number; duplicate_pairs: number };
  console.log(`  ${String(r.code).padEnd(16)} 열림=${String(r.open_to_students).padEnd(5)} 문항 ${String(r.items).padStart(3)} · 영역 ${r.domains} · 체크 ${r.checklist_items} · 산업 ${r.industry_packs} · 역할 ${r.role_packs} · 관계 ${rel.td_industry}+${rel.td_role} 깨짐 ${rel.broken} 중복 ${rel.duplicate_pairs} · 빠진 파일 ${(r.files_missing as string[]).length}`);
}
console.log(`  me-v3 파일 ${src.length} · LLM 호출 ${llm.length} · fetch ${net.length}${net.length ? " (" + net.join(", ") + ")" : ""}`);
