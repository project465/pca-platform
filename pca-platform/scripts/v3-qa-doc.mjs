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
const OUT_EXPERT = "docs/metri/56_me_v3_expert_review.md";
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
    const cell = d.axes[ax] ?? {};
    const list = (checks.domains[d.code]?.[ax] ?? []);
    const ev = list.length
      ? `${list.length}개 · 예: ${list[0].text}`
      : "**없다**";
    /* 한 칸에 문항이 둘인 자리가 있다. 높은 응답을 축 수준으로 쓴다 */
    const items = bank.items.filter((i) => i.technical_domain === d.code &&
      i.evidence_axis === ax && ["PROBE-J4", "DEEP-J8"].includes(i.module));
    if (!items.length) {
      put(`| ${ax} | **없다** | ${cell.l2 ?? ""} | ${cell.l3 ?? ""} | ${ev} `
        + `| ${sections[ax] ?? ""} |`);
      continue;
    }
    for (const it of items) {
      put(`| ${ax} | ${it.wording} (\`${it.item_id}\`) `
        + `| ${cell.l2 ?? ""} | ${cell.l3 ?? ""} | ${ev} `
        + `| ${sections[ax] ?? ""} |`);
    }
  }
  put();
}

const n = domains.domains.length;
put("## 세어 본 것");
put();
put(`| | |`);
put(`|---|---|`);
put(`| 기술영역 | ${n} |`);
put(`| 영역 깊이 문항 | ${bank.items.filter((i) =>
  ["PROBE-J4", "DEEP-J8"].includes(i.module)).length} |`);
put(`| 증거 항목이 없는 칸 | ${
  domains.domains.reduce((s, d) =>
    s + AX.filter((ax) => !(checks.domains[d.code]?.[ax] ?? []).length).length, 0)} |`);
put(`| 항목이 하나뿐인 칸 | ${
  domains.domains.reduce((s, d) =>
    s + AX.filter((ax) => (checks.domains[d.code]?.[ax] ?? []).length === 1).length, 0)} |`);
put(`| 문항이 없는 칸 | ${
  domains.domains.reduce((s, d) => s + AX.filter((ax) => !bank.items.some((i) =>
    i.technical_domain === d.code && i.evidence_axis === ax &&
    ["PROBE-J4", "DEEP-J8"].includes(i.module))).length, 0)} |`);
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

/* ---------- 전공자 검토용 묶음 ---------- */

const ex = [];
const w = (s = "") => ex.push(s);
const CHECK = "| | | | | | |";

w("# ME_V3 문항 전공자 검토");
w();
w("`npm run v3:qa` 가 만든다. **읽고 판단하기 위한 문서**라 코드 설명을 두지");
w("않았다. 고칠 곳은 문항 은행과 팩 원본이다.");
w();
w("## 읽는 법");
w();
w("| 보기 | 뜻 |");
w("|---|---|");
w("| 없다 | 그 일을 해 본 적이 없다 |");
w("| 남이 한 것을 받아 썼다 | 남이 정한 조건이나 결과를 받아 썼다 |");
w("| 내가 했다 | 내가 그 일을 했다 |");
w("| 내가 정하고 그 결과가 쓰였다 | 조건이나 기준을 내가 정했고 그 결과가 다음 작업에 쓰였다 |");
w();
w("**문면은 `확인(L2)` 줄의 행동을 묻는다.** 소유는 보기 넷이 가르고,");
w("`소유(L3)` 줄은 체크리스트 근거가 받쳐야 결과지에 적힌다. 문면에 소유를");
w("적으면 도면을 그렸지만 제작에 나가지 않은 학부생이 `없다` 로 떨어진다.");
w();
w("검토할 때 보실 것 일곱입니다.");
w();
w("1. 기계공학 현장에 **실제로 있는 행동**인가");
w("2. 도구를 썼다와 기술 판단을 했다를 섞지 않았는가");
w("3. 학부생이 겪지 않았다는 이유로 불리해지지 않는가");
w("4. 석·박사가 참여만 하고도 소유로 읽히지 않는가");
w("5. 확인과 소유의 차이가 또렷한가");
w("6. 다른 영역의 문항과 사실상 같지 않은가");
w("7. 읽고 **자기 경험 하나가 떠오르는가**");
w();
w("## Part 1. 기술영역 열둘 × 여덟 축");
w();
for (const d of domains.domains) {
  w(`### ${d.code} ${d.name}`);
  w();
  w(`필수 축 **${d.required_axes.join(" · ")}**. 격자 줄은 \`${gridRow(d.code)}\` 입니다.`);
  w();
  w("| 축 | 문항 | 무엇을 확인하려는지 | 확인 L2 | 소유 L3 | 현장과 맞음 | 표현 수정 | 기술적으로 틀림 | 두 가지를 동시에 물음 | 다른 영역과 중복 | 삭제 필요 |");
  w("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const ax of AX) {
    const list = bank.items.filter((i) => i.technical_domain === d.code &&
      i.evidence_axis === ax && ["PROBE-J4", "DEEP-J8"].includes(i.module));
    const cell = d.axes[ax] ?? {};
    for (const it of list) {
      w(`| ${ax} ${axisName[ax] ?? ""} | ${it.wording} | ${axisQ[ax] ?? ""} `
        + `| ${cell.l2 ?? ""} | ${cell.l3 ?? ""} |  |  |  |  |  |  |`);
    }
  }
  w();
}

w("## Part 2. 산업팩 여덟 × 여섯");
w();
w("산업팩은 산업 상식 퀴즈가 아닙니다. 보는 것은 **기존 기계공학 경험을 그");
w("산업의 문제 상황에서 알아보고 이을 수 있는가**입니다. 그래서 문항마다");
w("쉬운 말 풀이를 함께 띄웁니다. 용어를 모른다고 부적합으로 적지 않습니다.");
w();
for (const p of industry.packs) {
  w(`### ${p.name_ko}`);
  w();
  w("| 영역 | 축 | 문항 | 쉬운 말 풀이 | 현장과 맞음 | 표현 수정 | 기술적으로 틀림 | 두 가지를 동시에 물음 | 다른 영역과 중복 | 삭제 필요 |");
  w("|---|---|---|---|---|---|---|---|---|---|");
  for (const i of p.items) {
    w(`| ${i.domain} ${domName[i.domain] ?? ""} | ${i.axis} `
      + `| ${byId[i.id]?.wording ?? ""} | ${i.gloss ?? ""} |  |  |  |  |  |  |`);
  }
  w();
}

w("## Part 3. 역할팩 일곱 × 여섯");
w();
w("역할팩은 기술영역이 아닙니다. 역할이 더 묻는 것은 **그 자리에서 가진");
w("권한과 범위**이고, 영역과 축은 Core 것을 가리킵니다.");
w();
for (const p of roles.packs) {
  w(`### ${p.name_ko}`);
  w();
  w(`Core 참조 **${p.core_ref.td.join(" · ")}** · 필수 축 **${p.required_axes.join(" · ")}**`);
  w();
  w("| 축 | 문항 | 필수 | 현장과 맞음 | 표현 수정 | 기술적으로 틀림 | 두 가지를 동시에 물음 | 다른 영역과 중복 | 삭제 필요 |");
  w("|---|---|---|---|---|---|---|---|---|");
  for (const i of p.items) {
    w(`| ${i.axis} | ${byId[i.id]?.wording ?? ""} `
      + `| ${p.required_axes.includes(i.axis) ? "필수" : ""} |  |  |  |  |  |  |`);
  }
  w();
}

w("## Part 4. 검토 칸 쓰는 법");
w();
w("| 칸 | 언제 표시합니까 |");
w("|---|---|");
w("| 현장과 맞음 | 그대로 둬도 되는 문항 |");
w("| 표현 수정 | 묻는 것은 맞고 말이 어색한 문항. 고칠 문장을 적어 주십시오 |");
w("| 기술적으로 틀림 | 그 영역에서 그렇게 하지 않는 문항 |");
w("| 두 가지를 동시에 물음 | 행동이나 판단이 둘인 문항. 어떻게 나눌지 적어 주십시오 |");
w("| 다른 영역과 중복 | 어느 영역의 어느 축과 겹치는지 적어 주십시오 |");
w("| 삭제 필요 | 빼야 하는 문항. 그 축이 비게 되므로 까닭을 적어 주십시오 |");
w();
w("**빈칸은 검토 안 됨으로 읽습니다.** 맞는 문항에도 표시를 남겨 주십시오.");
w();
w("| | 수 |");
w("|---|---|");
w(`| 영역 문항 | ${bank.items.filter((i) => ["PROBE-J4", "DEEP-J8"].includes(i.module)).length} |`);
w(`| 산업팩 문항 | ${industry.packs.reduce((s, p) => s + p.items.length, 0)} |`);
w(`| 역할팩 문항 | ${roles.packs.reduce((s, p) => s + p.items.length, 0)} |`);
w();

writeFileSync(OUT_EXPERT, ex.join("\n") + "\n");
console.log(`  ${OUT_EXPERT} · 줄 ${ex.length}`);
