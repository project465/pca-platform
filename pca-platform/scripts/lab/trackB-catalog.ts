/**
 * **Track B · 배재대 2026 · 2027 Catalog 대조표를 등록부에서 만든다.**
 *
 * 손으로 적지 않는다: 등록부를 고친 날 표가 조용히 옛 구조를 들고 있게 된다.
 * 학과 이름으로 두 해를 맞춰 보고(이름이 같으면 같은 줄), 한 해에만 있는 자리를
 * 따로 적는다. **이름이 같다는 것을 계보로 읽지 않는다**: 이어받음은 등록부의
 * `replaces` 만 쓰고, 짐작되는 짝은 `lineage_candidates` 그대로 옮긴다.
 *
 *   npx tsx scripts/lab/trackB-catalog.ts   → docs/metri/review/tracks/B/CATALOG_2026_2027.md
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  catalogsOf, coreOf, leavesOf, mappingStatusOf, university,
  type CampusLeaf,
} from "../../src/lib/campus/registry";

const OUT = process.env.OUT ?? "docs/metri/review/tracks/B";
const u = university("PCU");
if (!u) throw new Error("등록부에 PCU 가 없다");
const cats = catalogsOf(u);
const by = cats.map((c) => ({ cat: c, leaves: leavesOf(c) }));
const label = (l: CampusLeaf) => (l.unit !== l.leaf ? `${l.unit.name} · ${l.leaf.name}` : l.leaf.name);
const coreName = (l: CampusLeaf) => (l.leaf.routing_only ? "학생이 고름" : coreOf(l.leaf)?.name_ko ?? "—");
const key = (l: CampusLeaf) => l.leaf.name.replace(/\s/g, "");

const names = new Map<string, Record<string, CampusLeaf>>();
for (const { cat, leaves } of by) for (const l of leaves) {
  const k = key(l); const m = names.get(k) ?? {}; m[cat.catalog_code] = l; names.set(k, m);
}
const [A, B] = by.map((x) => x.cat.catalog_code);
const both = [...names.entries()].filter(([, m]) => m[A] && m[B]);
const onlyA = [...names.entries()].filter(([, m]) => m[A] && !m[B]);
const onlyB = [...names.entries()].filter(([, m]) => !m[A] && m[B]);
const sameCore = both.filter(([, m]) => m[A].leaf.core_code === m[B].leaf.core_code);
const row = (l: CampusLeaf | undefined) => l
  ? `${l.college.name} | ${label(l)} | ${l.leaf.code} | ${coreName(l)} | ${l.leaf.specialization ?? "—"} | ${mappingStatusOf(l.leaf)}`
  : "— | — | — | — | — | —";
const ext = u as unknown as { lineage_candidates?: string[]; excluded_units?: { name?: string; why?: string }[]; open_questions?: string[] };

const md = [
  "# 배재대 2026 · 2027 Catalog 대조 (등록부에서 생성)", "",
  `- 등록부: \`sites/pca-platform/content/campus-universities.json\` · 만든 때 ${new Date().toISOString().slice(0, 10)}`,
  ...by.map(({ cat, leaves }) => `- **${cat.catalog_code}** (${cat.label ?? cat.catalog_year}) · 상태 ${cat.status} · 고르는 자리 ${leaves.length} · 확인 ${cat.verification ?? "—"}${cat.verified_at ? " · " + cat.verified_at : " · verified_at 비어 있음"}`),
  "- **공식 원문을 이 환경에서 직접 열지 못했다**(pcu.ac.kr CONNECT 403). 확인 수준은 등록부에 적힌 `SECONDARY_EVIDENCE` 그대로다.", "",
  `## 요약`, "",
  `| | 자리 |`, `|---|---|`,
  `| 두 해 모두 같은 이름 | ${both.length} (그중 같은 Core ${sameCore.length}) |`,
  `| ${A} 에만 | ${onlyA.length} |`, `| ${B} 에만 | ${onlyB.length} |`, "",
  `## 두 해 모두 있는 자리`, "",
  `| ${A} 단과대학 | 학과 | 코드 | Core | 갈래 | 매핑 | ${B} 단과대학 | 학과 | 코드 | Core | 갈래 | 매핑 |`,
  "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...both.map(([, m]) => `| ${row(m[A])} | ${row(m[B])} |`), "",
  `## ${A} 에만 있는 자리`, "", "| 단과대학 | 학과 | 코드 | Core | 갈래 | 매핑 |", "|---|---|---|---|---|---|",
  ...onlyA.map(([, m]) => `| ${row(m[A])} |`), "",
  `## ${B} 에만 있는 자리`, "", "| 단과대학 | 학과 | 코드 | Core | 갈래 | 매핑 |", "|---|---|---|---|---|---|",
  ...onlyB.map(([, m]) => `| ${row(m[B])} |`), "",
  "## 계보 후보 (등록부 `lineage_candidates` 그대로 · 확정 아님)", "",
  ...(ext.lineage_candidates ?? []).map((x) => `- ${x}`), "",
  "## 응시 목록에서 뺀 조직 (`excluded_units`)", "",
  ...(ext.excluded_units ?? []).map((x) => `- ${typeof x === "string" ? x : `${x.name ?? ""} — ${x.why ?? ""}`}`), "",
  "## 남은 물음 (`open_questions`)", "",
  ...(ext.open_questions ?? []).map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`), "",
].join("\n");
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "CATALOG_2026_2027.md"), md);
console.log(`두 해 모두 ${both.length} (같은 Core ${sameCore.length}) · ${A} 에만 ${onlyA.length} · ${B} 에만 ${onlyB.length}`);
