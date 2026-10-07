/**
 * 수동 검토용 표를 문항 은행에서 만든다.
 *
 * 기술영역 열둘마다 **문항 하나가 어디로 가는지**를 한 줄로 적는다:
 * 문면 · 그 축에서 확인으로 치는 판단 · 소유로 치는 판단 · 걸리는 증거
 * 항목 · 그 응답이 쓰이는 결과 절이다. 받고 쓰지 않는 자리가 있으면 이
 * 표의 마지막 칸이 빈다.
 *
 * **손으로 적지 않는 까닭**은 문면을 고치는 날 표가 조용히 옛 문장을
 * 들고 있기 때문이다. 고칠 곳은 `sites/pca-platform/content/` 의 원본이고
 * 이 문서는 생성물이다.
 *
 *   npm run v3:qa
 */
import { readFileSync, writeFileSync } from "node:fs";

const DIR = process.env.CONTENT_DIR ?? "sites/pca-platform/content";
const OUT = "docs/metri/55_items_02_domain_qa.md";
const OUT_PACKS = "docs/metri/55_items_03_packs.md";
const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

const read = (f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
const taxonomy = read("me-v3-taxonomy.json");
const domains = read("me-v3-domains.json");
const checks = read("me-v3-checklists.json");
const blueprint = read("me-v3-items-blueprint.json");
const bank = read("me-v3-items.json");
const industry = read("industry-packs.json");
const roles = read("role-packs.json");

const axisName = Object.fromEntries(
  Object.entries(taxonomy.axes).map(([code, a]) => [code, a.name]));
const axisQ = Object.fromEntries(
  Object.entries(taxonomy.axes).map(([code, a]) => [code, a.question]));

/** 축마다 blueprint 가 적어 둔 결과 절 */
const sections = {};
for (const s of blueprint.slots) {
  if (s.construct !== "axis_level" || !s.axis) continue;
  sections[s.axis] = s.result_sections.join("");
}
const label = blueprint.result_sections;

const byId = Object.fromEntries(bank.items.map((i) => [i.item_id, i]));
const gridRow = (td) => byId[`G_${td}_INT`]?.grid_row ?? "";

const lines = [];
const put = (s = "") => lines.push(s);

put("# 수동 검토표 · 기술영역 열둘");
put();
put("`npm run v3:qa` 가 만든다. **직접 고치지 말고 문항 은행을 고친다**");
put("(`sites/pca-platform/content/me-v3-items.json`).");
put();
put("읽는 법은 한 줄에 다섯 칸이다. 문면이 묻는 **행동**, 그 축에서");
put("확인으로 치는 **판단**, 소유로 올라가는 판단, 같은 축에 붙은 **증거**");
put("항목 수, 그 응답이 쓰이는 **결과 절**이다. 마지막 칸이 비면 받고 쓰지");
put("않는 문항이라는 뜻이고, 그런 자리는 묻지 않는 것이 맞다.");
put();
put("| 결과 절 | 이름 |");
put("|---|---|");
for (const [k, v] of Object.entries(label)) put(`| ${k} | ${v} |`);
put();
put("| 축 | 이름 | 묻는 것 | 등급 | 결과 절 |");
put("|---|---|---|---|---|");
for (const ax of AX) {
  const tier = ["J3", "J5", "J6", "J8"].includes(ax) ? "BASIC 선별" : "STANDARD 심화";
  put(`| ${ax} | ${axisName[ax] ?? ""} | ${axisQ[ax] ?? ""} | ${tier} | ${sections[ax] ?? ""} |`);
}
put();

for (const d of domains.domains) {
  const need = d.required_axes.join(" · ");
  put(`## ${d.code} ${d.name}`);
  put();
  put(`**필수 축 ${need}.** 이 둘이 L2 미만이면 확인된 축이 넷이어도`);
  put("근거가 선 영역으로 적지 않는다.");
  put();
  put(`| | |`);
  put(`|---|---|`);
  put(`| 격자 줄 | ${gridRow(d.code)} |`);
  put(`| 내놓는 산출물 | ${d.artifacts.join(" · ")} |`);
  put(`| 무엇과 견주는가 | ${d.verify_targets.join(" · ")} |`);
  put();
  put("| 축 | 문면 (`id`) | 확인 L2 | 소유 L3 | 증거 | 결과 절 |");
  put("|---|---|---|---|---|---|");
  for (const ax of AX) {
    const it = byId[`${d.code}_${ax}`];
    const cell = d.axes[ax] ?? {};
    const list = (checks.domains[d.code]?.[ax] ?? []);
    const ev = list.length
      ? `${list.length}개 · 예: ${list[0].text}`
      : "**없다**";
    put(`| ${ax} | ${it ? it.wording : "**없다**"} (\`${d.code}_${ax}\`) `
      + `| ${cell.l2 ?? ""} | ${cell.l3 ?? ""} | ${ev} `
      + `| ${sections[ax] ?? ""} |`);
  }
  put();
}

const n = domains.domains.length;
put("## 세어 본 것");
put();
put(`| | |`);
put(`|---|---|`);
put(`| 기술영역 | ${n} |`);
put(`| 영역 깊이 문항 | ${n * AX.length} |`);
put(`| 증거 항목이 없는 칸 | ${
  domains.domains.reduce((s, d) =>
    s + AX.filter((ax) => !(checks.domains[d.code]?.[ax] ?? []).length).length, 0)} |`);
put(`| 문항이 없는 칸 | ${
  domains.domains.reduce((s, d) =>
    s + AX.filter((ax) => !byId[`${d.code}_${ax}`]).length, 0)} |`);
put();

writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`  ${OUT} · 영역 ${n} · 줄 ${lines.length}`);

/* ---------- 팩 문서 ---------- */

const pk = [];
const say = (s = "") => pk.push(s);
const domName = Object.fromEntries(domains.domains.map((d) => [d.code, d.name]));
const rfName = Object.fromEntries(
  taxonomy.role_functions.map((r) => [r.code, r.name]));

say("# 산업팩 여덟 · 역할팩 일곱");
say();
say("`npm run v3:qa` 가 만든다. **직접 고치지 말고 팩 원본을 고친다**");
say("(`industry-packs.json` · `role-packs.json`).");
say();
say("**팩은 점수를 바꾸지 않는다.** 하는 일은 셋이다: 그 산업이나 역할이");
say("더 보는 축을 **먼저 설명하고**, 비어 있는 축을 그 분야의 말로 다시");
say("읽어 주고, 견줄 직무를 좁힌다. 축 수준과 영역 묶음과 확인된 축의");
say("개수에는 들어가지 않고, 그것을 `v3:arch` 가 팩 전체에서 `weight` 와");
say("`가중치` 와 `score_delta` 와 `multiplier` 를 찾아 센다.");
say();
say("**한 응시에 산업 하나와 역할 하나까지다.** 그래서 더해지는 응답이");
say("최대 열둘이고, 쉰여섯 조합마다 문항 세트를 만들지 않는다.");
say();

say("## 1. 산업팩 여덟");
say();
for (const p of industry.packs) {
  say(`### ${p.name_ko} (\`${p.code}\`)`);
  say();
  say(`**더 보는 축** ${Object.entries(p.axis_emphasis)
    .map(([td, axs]) => `${td} ${axs.join("·")}`).join(" · ")}`);
  say();
  say("| 영역 | 축 | 문면 |");
  say("|---|---|---|");
  for (const i of p.items) {
    say(`| ${i.domain} ${domName[i.domain] ?? ""} | ${i.axis} `
      + `| ${byId[i.id]?.wording ?? ""} |`);
  }
  say();
}

say("## 2. 역할팩 일곱");
say();
say("**역할팩은 기술영역이 아니다.** 역할은 `core_ref` 로 Core 의 영역과");
say("역할기능을 가리키고, 새 축을 만들지 않는다. PM 을 열셋째 기술영역으로");
say("두지 않는 까닭이 그것이다: PM 이 쓰는 판단은 요구 분해(TD11)와 기준");
say("적합(TD10)이고, 역할팩이 더 묻는 것은 **그 자리에서 가진 권한과");
say("범위**다.");
say();
for (const p of roles.packs) {
  const ref = `${p.core_ref.td.join(" · ")} / `
    + p.core_ref.rf.map((r) => `${r} ${rfName[r] ?? ""}`).join(" · ");
  say(`### ${p.name_ko} (\`${p.code}\`)`);
  say();
  say(`| | |`);
  say(`|---|---|`);
  say(`| Core 참조 | ${ref} |`);
  say(`| 필수 축 | ${p.required_axes.join(" · ")} |`);
  say(`| 견줄 역할 | ${p.compare_with.join(" · ")} |`);
  say(`| 지원 자료 | ${p.application_material.join(" · ")} |`);
  say();
  say("| 축 | 문면 | 필수 |");
  say("|---|---|---|");
  for (const i of p.items) {
    say(`| ${i.axis} | ${byId[i.id]?.wording ?? ""} `
      + `| ${p.required_axes.includes(i.axis) ? "필수" : ""} |`);
  }
  say();
}

say("## 3. 세어 본 것");
say();
say(`| | |`);
say(`|---|---|`);
say(`| 산업팩 | ${industry.packs.length} × ${industry.caps.industry_items_max} = `
  + `${industry.packs.reduce((s, p) => s + p.items.length, 0)} |`);
say(`| 역할팩 | ${roles.packs.length} × ${roles.caps.role_items_max} = `
  + `${roles.packs.reduce((s, p) => s + p.items.length, 0)} |`);
say(`| 한 응시에 더해지는 응답 | 최대 ${industry.caps.deep_industry_max * industry.caps.industry_items_max
  + roles.caps.deep_role_max * roles.caps.role_items_max} |`);
say(`| 조합마다 복제했다면 | ${industry.packs.length * roles.packs.length} 조합 · `
  + `${industry.packs.length * roles.packs.length * 12} 문항 |`);
say();

writeFileSync(OUT_PACKS, pk.join("\n") + "\n");
console.log(`  ${OUT_PACKS} · 팩 ${industry.packs.length + roles.packs.length} · 줄 ${pk.length}`);
