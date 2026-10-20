/**
 * Track B 4차 · 배재대 지원 학과 행렬 (읽기 전용).
 *
 * 등록부(`src/lib/campus/registry.ts`)의 내보낸 함수만 부른다. DB 에 닿지 않고 파일을 고치지 않는다.
 * 쓰는 것은 OUT 의 `SUPPORT_MATRIX.md` · `support-matrix.json` 둘뿐이다.
 * 같은 폴더의 `dept-content.json`(trackB-content.ts 출력)이 있으면 학과 층(먼저 읽는 영역 · 역할 · 도구·기술 ·
 * 근거 예시 · 행동 제안)을 잇는다.
 *
 * 상태는 **미리보기 없이** 잰다(`{ preview: false }` · V3_PREVIEW_OPEN 을 주지 않는다): 학생이 지금 보는 상태다.
 *
 *   OUT=docs/metri/review/tracks-r4/B <runner> docs/metri/review/tracks-r4/B/matrix.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  university, catalogsOf, leavesOf, mappingStatusOf, readinessOf, statusOf, offered,
  specializationName, provenanceOf, replacesOf, coreOf,
} from "@/lib/campus/registry";

const OUT = process.env.OUT ?? "docs/metri/review/tracks-r4/B";
if ((process.env.V3_PREVIEW_OPEN ?? "").trim()) {
  console.error("V3_PREVIEW_OPEN 없이 돌린다(학생이 보는 상태를 잰다)"); process.exit(2);
}
const u = university("PCU");
if (!u) { console.error("PCU 없음"); process.exit(2); }

type Card = { leaf: { code: string }; knowledge?: string[]; tools?: string[]; industry?: string[];
  role?: string[]; evidenceEx?: string[]; action?: string[] };
const contentFile = path.join(OUT, "dept-content.json");
const cards = new Map<string, Card>();
if (existsSync(contentFile)) {
  const d = JSON.parse(readFileSync(contentFile, "utf8")) as { cards: Card[] };
  for (const c of d.cards ?? []) cards.set(c.leaf.code, c);
}

const esc = (s: string) => s.replace(/\|/g, "／").replace(/\n/g, " ");
const j = (a?: string[], n = 3) => (a ?? []).slice(0, n).join(" · ");

const rows: Record<string, unknown>[] = [];
const md: string[] = [];
md.push("# 배재대 지원 학과 행렬 (Track B 4차)", "");
md.push(`- 생성: ${new Date().toISOString()} · 등록부 \`sites/pca-platform/content/campus-universities.json\` · 함수 \`src/lib/campus/registry.ts\``);
md.push("- 상태 · 준비도는 **미리보기 없이**(학생이 지금 보는 상태) 잰다. `student_open` = LEAF `" + (u.student_open?.leaves ?? []).join(",") + "`.");
md.push("- 학과 층은 `dept-content.json`(같은 회차 `trackB-content.ts` 출력 · 결과지가 읽는 `specView()`)에서 잇는다. 학과 층은 판정을 바꾸지 않는다(측정 동결).");
md.push("- **공식 교육과정 대조: NOT VERIFIED** — 두 Catalog 모두 `verification = SECONDARY_EVIDENCE` · `verified_at` 없음 · `www.pcu.ac.kr` 접근 불가(`logs/pcu-reach.log`).", "");

const totals: Record<string, Record<string, number>> = {};
for (const cat of catalogsOf(u)) {
  md.push(`## ${cat.catalog_code} · ${cat.catalog_year} · ${cat.label} · ${cat.status}`, "");
  md.push(`- 출처: ${cat.source_name} · 확인 단계 \`${cat.verification}\` · verified_at \`${cat.verified_at ?? "없음"}\``);
  if (cat.evidence_file) md.push(`- 2차 근거 파일: \`${cat.evidence_file}\``);
  md.push("");
  md.push("| 단과대학 | 코드 | 이름 | Core | 갈래 | 매핑 | 준비도 | 학생 상태 | 비고 | 먼저 읽는 영역 | 역할(직무) | 도구·기술(근거 행동) |");
  md.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  const t: Record<string, number> = { leaves: 0, offered: 0, routing: 0, exact: 0, READY: 0,
    RESULT_READY: 0, ASSESSMENT_READY: 0, CORE_LINKED: 0, CATALOG_ONLY: 0, withContent: 0, hidden: 0 };
  for (const row of leavesOf(cat)) {
    const L = row.leaf;
    const map = mappingStatusOf(L);
    const ready = readinessOf(u, row, undefined, { preview: false });
    const st = statusOf(u, row, undefined, { preview: false });
    const prov = provenanceOf(row.catalog, L);
    const spec = L.specialization ?? null;
    const specName = specializationName(L);
    const c = cards.get(L.code);
    const notes: string[] = [];
    if (L.routing_only) notes.push("전공 고르기(자율전공)");
    if (L.student_visible === false) notes.push("학생 비노출");
    if (L.audience) notes.push(L.audience);
    if (L.carried_over) notes.push("앞 Catalog 에서 옮김");
    if (L.unverified_majors) notes.push("전공 목록 미확인");
    const rep = replacesOf(u, L).map((r) => r.leaf.code);
    if (rep.length) notes.push("이어받음 " + rep.join(","));
    if (row.unit.code !== L.code) notes.push("학부 " + row.unit.name);
    t.leaves++; if (offered(row)) t.offered++; else t.hidden++;
    if (L.routing_only) t.routing++;
    if (map === "EXACT") t.exact++;
    t[ready]++; if (st === "READY") t.READY++;
    if (c) t.withContent++;
    rows.push({ catalog: cat.catalog_code, year: cat.catalog_year, college: row.college.name,
      unit: row.unit.code, code: L.code, name: L.name, kind: L.kind, core: L.core_code ?? null,
      core_status: coreOf(L)?.status ?? null, specialization: spec, specialization_name: specName,
      mapping: map, readiness: ready, student_status: st, offered: offered(row),
      provenance_status: prov.status, notes,
      knowledge: c?.knowledge ?? null, role: c?.role ?? null, industry: c?.industry ?? null,
      tools: c?.tools ?? null, evidence_examples: c?.evidenceEx ?? null, actions: c?.action ?? null });
    md.push(`| ${esc(row.college.name)} | \`${L.code}\` | ${esc(L.name)} | ${L.core_code ? "`" + L.core_code + "`" : "—"} | ${spec ? "`" + spec + "`" + (specName ? " " + esc(specName) : "") : "—"} | ${map} | ${ready} | ${st} | ${esc(notes.join(" · ")) || ""} | ${esc(j(c?.knowledge))} | ${esc(j(c?.role))} | ${esc(j(c?.tools, 2))} |`);
  }
  totals[cat.catalog_code] = t;
  md.push("", `합계: 자리 ${t.leaves} · 학생 목록에 서는 자리 ${t.offered} · 전공 고르기 ${t.routing} · 매핑 EXACT ${t.exact} · ` +
    `준비도 RESULT_READY ${t.RESULT_READY} / ASSESSMENT_READY ${t.ASSESSMENT_READY} / CORE_LINKED ${t.CORE_LINKED} / CATALOG_ONLY ${t.CATALOG_ONLY} · ` +
    `학생 상태 READY ${t.READY} · 학과 층 있음 ${t.withContent}`, "");
}

md.push("## 차별화 · 근거 예시 · 행동 제안 (학과별 한 줄씩)", "");
md.push("같은 Core 안에서 학과마다 갈리는 것은 갈래 다섯 층이다. 첫 근거 예시 · 첫 행동 제안을 그대로 옮긴다(전공자 검토 NOT VERIFIED).", "");
md.push("| 코드 | 이름 | 산업 | 근거 예시(첫 줄) | 행동 제안(첫 줄) |", "|---|---|---|---|---|");
for (const r of rows) {
  if (!r.evidence_examples) continue;
  md.push(`| \`${r.code}\` | ${esc(String(r.name))} | ${esc(j(r.industry as string[]))} | ${esc(((r.evidence_examples as string[])[0] ?? ""))} | ${esc(((r.actions as string[])[0] ?? ""))} |`);
}
md.push("", "## 자율전공 경로", "");
for (const r of rows.filter((x) => (x.notes as string[]).includes("전공 고르기(자율전공)"))) {
  md.push(`- \`${r.code}\` ${r.name} (${r.catalog}): Core 없음 · 학생이 전공을 고른 뒤 그 전공의 Core 로 잰다(\`routingContextOf\` · \`pickRequired\`). 서버 검사: \`logs/trackB-routing.log\`.`);
}

writeFileSync(path.join(OUT, "SUPPORT_MATRIX.md"), md.join("\n") + "\n");
writeFileSync(path.join(OUT, "support-matrix.json"), JSON.stringify({ totals, rows }, null, 2) + "\n");
console.log("학과 층 파일", existsSync(contentFile) ? contentFile : "없음", "· 카드", cards.size);
for (const [k, t] of Object.entries(totals)) console.log(k, JSON.stringify(t));
console.log("행", rows.length, "→", path.join(OUT, "SUPPORT_MATRIX.md"));
