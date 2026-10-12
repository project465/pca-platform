/**
 * Authoring Kit 이 **실제 runtime 구조**를 적고 있는가.
 *
 * 문서는 손으로 적으면 어느 날 코드와 갈린다. 갈린 날 새 전공을 만드는
 * 사람은 문서를 믿고 쓰고, 엔진은 그것을 읽지 못한다. 그래서 Kit 이
 * 가리키는 열쇠 목록을 **기준 core 의 실제 파일에서 떠서** 적어 두고
 * 매번 대조한다. 기준은 지금 돌고 있는 `ME_CORE_V3` 다.
 *
 *   npm run major:kit            대조
 *   KIT=write npm run major:kit  다시 적는다 (schema 가 일부러 바뀐 날)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CONTENT = "sites/pca-platform/content";
const KIT = "docs/metri/major-authoring";
const SRC = "src";
const SCHEMA = join(KIT, "schema.json");
const BASE = "ME_CORE_V3";

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass += 1; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
}

const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const reg = read(join(CONTENT, "major-cores.json"));
const base = reg.cores.find((c: { code: string }) => c.code === BASE);
if (!base) { console.error(`기준 core 가 없습니다: ${BASE}`); process.exit(1); }

/** 그 파일이 내놓는 **바로 위 열쇠**. 값은 적지 않는다: 값은 콘텐츠다 */
function topKeys(name: string): string[] {
  const at = join(CONTENT, name);
  if (!existsSync(at)) return [];
  const j = read(at);
  return Array.isArray(j) ? ["(배열)"] : Object.keys(j).sort();
}

/** 한 칸 더 들어가야 뜻이 서는 자리. 전공을 쓰는 사람이 채우는 칸이다 */
function itemKeys(name: string, path: string[]): string[] {
  const at = join(CONTENT, name);
  if (!existsSync(at)) return [];
  let node = read(at);
  for (const p of path) node = node?.[p];
  if (Array.isArray(node)) node = node[0];
  else if (node && typeof node === "object") node = Object.values(node)[0];
  if (Array.isArray(node)) node = node[0];
  return node && typeof node === "object" ? Object.keys(node).sort() : [];
}

const built = {
  note: "손으로 적지 않는다. `KIT=write npm run major:kit` 이 기준 core 에서 떠서 적는다",
  base_core: BASE,
  contract: reg.contract,
  files: Object.fromEntries(
    Object.entries(base.files).map(([k, v]) => [k, { file: v, top_keys: topKeys(v as string) }]),
  ),
  packs: Object.fromEntries(
    Object.entries(base.packs ?? {}).map(([k, v]) => [k, { file: v, top_keys: topKeys(v as string) }]),
  ),
  authoring_units: {
    registry_entry: Object.keys(base).sort(),
    technical_domain: itemKeys(base.files.taxonomy, ["technical_domains"]),
    role_function: itemKeys(base.files.taxonomy, ["role_functions"]),
    org_context: itemKeys(base.files.taxonomy, ["org_contexts"]),
    job_alias: itemKeys(base.files.taxonomy, ["job_aliases"]),
    boundary: itemKeys(base.files.taxonomy, ["boundaries"]),
    domain: itemKeys(base.files.domains, ["domains"]),
    domain_workflow_step: itemKeys(base.files.domains, ["domains", "0", "workflow"]),
    /* 체크리스트는 `domains[TD][J축] = [{text, from}]` 이다. 한 칸 더
       들어가야 **쓰는 사람이 채우는 칸**이 나온다 */
    checklist_item: (() => {
      const j = read(join(CONTENT, base.files.checklists as string));
      const byAxis = Object.values(j.domains)[0] as Record<string, object[]>;
      const first = Object.values(byAxis)[0]?.[0];
      return first ? Object.keys(first).sort() : [];
    })(),
    blueprint_slot: itemKeys(base.files.items_blueprint, ["slots"]),
    item: (() => {
      const j = read(join(CONTENT, base.files.items as string));
      return [...new Set(j.items.flatMap((i: object) => Object.keys(i)))].sort();
    })(),
    relation_td_industry: itemKeys(base.files.relations as string, ["td_industry"]),
    relation_td_role: itemKeys(base.files.relations as string, ["td_role"]),
    industry_pack: itemKeys(base.packs.industry, ["packs"]),
    role_pack: itemKeys(base.packs.role, ["packs"]),
  },
  /** 전공이 늘어도 바뀌지 않는 것. Kit 이 `공통` 으로 적는 자리다 */
  shared: {
    axes: Object.keys(read(join(CONTENT, base.files.taxonomy)).axes),
    levels: read(join(CONTENT, base.files.taxonomy)).levels,
    scales: Object.keys(read(join(CONTENT, base.files.taxonomy)).scales),
    /**
     * **화면에 적는 말을 읽는다.** 문항 은행의 `options` 는 그 판본의
     * 기록이라 동결돼 있고(`ME_V3_ITEM_BANK_V2.5`), 응시자가 보는 세
     * 낱말은 `runtime/menus.ts` 의 `EXPOSURE` 가 든다. Kit 이 `공통` 으로
     * 적어야 하는 것은 **전공이 늘어도 그대로여야 하는 화면의 말**이다.
     */
    exposure_labels: (() => {
      const src = readFileSync(join(SRC, "lib/me-v3/runtime/menus.ts"), "utf8");
      const m = /export const EXPOSURE = \[([^\]]+)\]/.exec(src);
      return m ? m[1].split(",").map((x) => x.trim().replace(/^"|"$/g, "")) : [];
    })(),
    level_options: read(join(CONTENT, base.files.items as string)).level_options,
    result_sections: read(join(CONTENT, base.files.items_blueprint)).result_sections,
  },
};

if (process.env.KIT === "write") {
  writeFileSync(SCHEMA, `${JSON.stringify(built, null, 2)}\n`);
  console.log(`  적었다  ${SCHEMA}`);
  process.exit(0);
}

ok("Kit 이 적어 둔 schema 가 있다", existsSync(SCHEMA));
if (existsSync(SCHEMA)) {
  const saved = read(SCHEMA);
  ok("Kit 의 schema 가 기준 core 의 실제 구조와 같다",
    JSON.stringify(saved) === JSON.stringify(built),
    "일부러 바꿨다면 `KIT=write npm run major:kit`");
}

/* **템플릿이 빠짐없이 있는가.** 하나가 없으면 그 자리를 쓰는 사람이
   기계공학 파일을 열어 베끼게 되고, 그 순간 복붙이 시작된다 */
const WANT = [
  "README.md", "01-major-core.md", "02-domain.md", "03-checklist.md",
  "04-assessment-items.md", "05-industry-pack.md", "06-role-pack.md",
  "07-relations.md", "08-result-copy.md", "09-qa-checklist.md",
];
const missing = WANT.filter((f) => !existsSync(join(KIT, f)));
ok("템플릿 열 벌이 전부 있다", missing.length === 0, missing.join(" "));

/* **빈도 척도는 공통이다**(Contract §6) */
ok("경험 빈도 라벨이 공통 셋이다",
  JSON.stringify(built.shared.exposure_labels) === JSON.stringify(["없음", "1~2회", "3회 이상"]),
  built.shared.exposure_labels.join(" · "));

/* **판단축은 공통 엔진이다**(Contract §3). 전공마다 축을 늘리지 않는다 */
ok("판단축이 여덟 그대로다", built.shared.axes.length === 8, built.shared.axes.join(","));
ok("소유 네 단계가 그대로다", built.shared.level_options.length === 4);

console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
