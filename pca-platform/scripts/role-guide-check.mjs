/**
 * 긴 결과지 직무 안내 파일을 센다. 모양(열여섯 칸 · 직무 여덟 · 영역 코드)과 문장 규칙(AI 말투)을 함께 본다.
 *
 *   node scripts/role-guide-check.mjs data/report-gm/role-guide/EE_CORE_V1.json [...]
 */
import { readFileSync, existsSync } from "node:fs";

const reg = JSON.parse(readFileSync("sites/pca-platform/content/major-cores.json", "utf8"));
const FIELDS = ["summary", "practiceWhere", "lens", "practice", "responsibilities", "process", "knowledge", "tools",
  "experiences", "entry", "learnOrder", "firstProject", "portfolio", "interview", "postingCheck", "watch"];
const AXES = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
const BANNED = [/—/, /다양한/, /효과적으로/, /역량을 강화/, /핵심은/, /중요합니다/, /를 통해/, /을 통해/, /결국/, /혁신적/, /획기적/,
  /견줍니다/, /섭니다/, /세웠습니다/, /가지고 있/, /되어진/, /시너지/, /인사이트/, /차별화된/, /최적화/];
const packItems = (f) => { const d = JSON.parse(readFileSync(`sites/pca-platform/content/${f}`, "utf8")); const x = d.packs ?? d; return Array.isArray(x) ? x : Object.values(x); };

let bad = 0;
const fail = (f, m) => { bad += 1; console.log(`  걸림  ${f} — ${m}`); };
for (const file of process.argv.slice(2)) {
  if (!existsSync(file)) { fail(file, "파일 없음"); continue; }
  let g; try { g = JSON.parse(readFileSync(file, "utf8")); } catch (e) { fail(file, `JSON 아님: ${e.message}`); continue; }
  const core = reg.cores.find((c) => c.code === g.core);
  if (!core) { fail(file, `없는 core ${g.core}`); continue; }
  const roleCodes = packItems(core.packs.role).map((p) => p.code ?? p.pack_code);
  const dom = JSON.parse(readFileSync(`sites/pca-platform/content/${core.files.domains}`, "utf8"));
  const tds = (dom.domains ?? dom).map((d) => d.code);
  const keys = Object.keys(g.roles ?? {});
  const miss = roleCodes.filter((c) => !keys.includes(c)); const extra = keys.filter((c) => !roleCodes.includes(c));
  if (miss.length || extra.length) fail(file, `직무 코드 불일치 · 빠짐 ${miss.join(",")} · 남음 ${extra.join(",")}`);
  for (const [code, r] of Object.entries(g.roles ?? {})) {
    for (const f of FIELDS) if (r[f] == null || (Array.isArray(r[f]) && !r[f].length)) fail(file, `${code}.${f} 비어 있음`);
    for (const a of AXES) { const p = r.practice?.[a]; if (!p?.task || !p?.output || !p?.check) fail(file, `${code}.practice.${a} 칸 부족`); }
    for (const [td, l] of Object.entries(r.lens ?? {})) {
      if (!tds.includes(td)) fail(file, `${code}.lens 의 ${td} 는 이 전공 영역이 아님`);
      if (!l.why || !l.ctx || !["domain", "role"].includes(l.mode)) fail(file, `${code}.lens.${td} 칸 부족`);
    }
    if (Object.keys(r.lens ?? {}).length < 2) fail(file, `${code}.lens 가 둘 미만`);
    if ((r.interview ?? []).some((q) => !AXES.includes(q.axis) || !q.q || !q.why)) fail(file, `${code}.interview 칸 부족`);
    if (!r.firstProject?.title || (r.firstProject?.steps ?? []).length < 3) fail(file, `${code}.firstProject 부족`);
    const text = JSON.stringify(r);
    for (const re of BANNED) if (re.test(text)) fail(file, `${code} 에 쓰지 않는 말 ${re.source}`);
    const pairs = (text.match(/(?:이|가|은|는|을|를)\s*아니라/g) ?? []).length;
    if (pairs > 1) fail(file, `${code} 에 'A가 아니라 B' ${pairs}번`);
  }
  console.log(`${bad ? "" : "  통과  "}${file} · 직무 ${keys.length}`);
}
console.log(bad ? `\n걸림 ${bad}` : "\n직무 안내 검사 통과");
process.exitCode = bad ? 1 : 0;
