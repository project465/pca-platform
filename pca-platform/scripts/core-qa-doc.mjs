/**
 * 그 Core 의 검토표를 **은행에서 읽어** 만든다. 전공 이름과 파일 이름은
 * 등록부에서 끌어온다: 적어 두면 Core 를 하나 더 만드는 일이 베끼는 일이 된다.
 *
 * 손으로 적으면 문면을 고친 날 표가 조용히 옛 문장을 들고 있다. 그래서
 * 사람이 적는 자리는 원본 JSON 하나고 여기서 나오는 것은 생성물이다.
 *
 *   CORE=CS_CORE_V1 npm run core:qa
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "sites/pca-platform/content";
const CORE = process.env.CORE ?? "ME_CORE_V3";
const read = (n) => JSON.parse(readFileSync(join(DIR, n), "utf8"));
const reg = read("major-cores.json");
const entry = reg.cores.find((c) => c.code === CORE);
if (!entry) throw new Error(`등록부에 ${CORE} 가 없습니다`);
const NM = entry.name_ko ?? CORE;

const tax = read(entry.files.taxonomy);
const dom = read(entry.files.domains);
const lists = read(entry.files.checklists);
const bank = read(entry.files.items);
const bp = read(entry.files.items_blueprint);
const rel = read(entry.files.relations);
const ind = read(entry.packs.industry);
const role = read(entry.packs.role);
const con = read(entry.files.constructs);

const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
const axName = (a) => tax.axes[a].name;
const dName = Object.fromEntries(dom.domains.map((d) => [d.code, d.name]));
const conOf = Object.fromEntries(con.items.map((r) => [r.item_id, r]));
const slotOf = Object.fromEntries(bp.slots.map((s) => [s.id, s]));
const secName = bp.result_sections;

/* ── 영역별 검토표 ───────────────────────────────────────────────── */
const L = [];
L.push(`# ${NM} Core 영역별 검토표 (${entry.assessment_version} · ${bank.item_bank_version})`);
L.push("");
L.push("이 파일은 **생성물이다**. 고칠 곳은 `" + entry.files.items + "` 와"
  + " `" + entry.files.domains + "` 이고, 고친 뒤 `CORE=" + CORE
  + " npm run core:qa` 를 돌린다.");
L.push("");
L.push(`영역 ${dom.domains.length} · 축 ${AX.length} · 체크리스트 `
  + `${Object.values(lists.domains).reduce((a, d) => a + Object.values(d).reduce((x, v) => x + v.length, 0), 0)}`
  + ` · 문항 자리 ${bp.slots.length} · 문항 은행 ${bank.items.length}`);
L.push("");

for (const d of dom.domains) {
  L.push(`## ${d.code} ${d.name}`);
  L.push("");
  L.push(`책임지는 판단: ${tax.technical_domains.find((t) => t.code === d.code).owns}`);
  L.push("");
  L.push(`꼭 보는 축: ${d.required_axes.map((a) => `${a} ${axName(a)}`).join(" · ")}`);
  L.push("");
  L.push("| 축 | 수행 조건 | 소유 조건 | 고를 항목 | 문항 | 결과 절 |");
  L.push("|---|---|---|---|---|---|");
  for (const a of AX) {
    const items = bank.items.filter((i) => i.technical_domain === d.code
      && i.evidence_axis === a && !["INDUSTRY", "ROLE"].includes(i.module));
    const secs = [...new Set(items.flatMap((i) => {
      const s = slotOf[i.item_id] ?? bp.slots.find((x) => x.block === i.module && x.axis === a);
      return s ? s.result_sections : [];
    }))];
    L.push(`| ${a} ${axName(a)} | ${d.axes[a].l2} | ${d.axes[a].l3}`
      + ` | ${(lists.domains[d.code]?.[a] ?? []).length}개`
      + ` | ${items.map((i) => i.item_id).join(" ") || "-"}`
      + ` | ${secs.sort().join(" ") || "-"} |`);
  }
  L.push("");
  L.push(`산출물: ${d.artifacts.join(" · ")}`);
  L.push("");
  L.push(`견주는 대상: ${d.verify_targets.join(" · ")}`);
  L.push("");
}
writeFileSync(`docs/metri/${CORE}_DOMAINS.md`, L.join("\n") + "\n");
console.log(`  docs/metri/${CORE}_DOMAINS.md · 영역 ${dom.domains.length} · 줄 ${L.length}`);

/* ── 문항 추적표 ─────────────────────────────────────────────────── */
const T = [];
T.push(`# ${NM} Core 문항 추적표 (${bank.item_bank_version})`);
T.push("");
T.push("문항마다 **무엇을 재는가 · 어느 영역 · 어느 판단 축 · 어느 결과 절 ·"
  + " 어떻게 받는가**를 적는다. 빈칸이 있으면 그 문항은 받고 쓰지 않는 자리다.");
T.push("");
T.push("| 문항 | 묶음 | 등급 | 재는 것 | 받는 법 | 영역 | 판단 축 | 산업·역할 | 결과 절 |");
T.push("|---|---|---|---|---|---|---|---|---|");
for (const i of bank.items) {
  const s = slotOf[i.item_id]
    ?? bp.slots.find((x) => x.block === i.module && x.axis === i.evidence_axis);
  const secs = i.module === "INDUSTRY" || i.module === "ROLE"
    ? ["A", "D", "E", "F", "G"] : (s ? s.result_sections : []);
  const c = conOf[i.item_id] ?? {};
  T.push(`| ${i.item_id} | ${i.module} | ${i.tier} | ${c.primary ?? "-"}`
    + ` | ${c.response_type ?? "-"}`
    + ` | ${i.technical_domain ? `${i.technical_domain} ${dName[i.technical_domain]}` : "-"}`
    + ` | ${i.evidence_axis ? `${i.evidence_axis} ${axName(i.evidence_axis)}` : "-"}`
    + ` | ${i.industry_pack ?? i.role_function ?? "-"}`
    + ` | ${secs.join(" ") || "-"} |`);
}
T.push("");
T.push("결과 절: " + Object.entries(secName).map(([k, v]) => `${k} ${v}`).join(" · "));
writeFileSync(`docs/metri/${CORE}_ITEMS.md`, T.join("\n") + "\n");
console.log(`  docs/metri/${CORE}_ITEMS.md · 문항 ${bank.items.length} · 줄 ${T.length}`);

/* ── 팩과 관계표 ─────────────────────────────────────────────────── */
const P = [];
P.push(`# ${NM} Core 산업팩과 역할팩 (${CORE})`);
P.push("");
P.push(`산업 ${ind.packs.length} · 역할 ${role.packs.length}`
  + ` · 관계표 영역×산업 ${rel.td_industry.length} · 영역×역할 ${rel.td_role.length}`);
P.push("");
P.push("팩은 **Core 판정을 바꾸지 않는다**. 바꾸는 것은 설명하는 차례와"
  + " 그 산업의 말로 다시 읽어 주는 문장이다.");
P.push("");
for (const p of ind.packs) {
  P.push(`## ${p.name_ko} (${p.code})`);
  P.push("");
  P.push("이 산업이 요구하는 것");
  P.push("");
  for (const x of p.demands) P.push(`- ${x}`);
  P.push("");
  P.push("| 문항 | 축 | 영역 | 묻는 것 | 쉬운 말 |");
  P.push("|---|---|---|---|---|");
  for (const it of p.items) {
    P.push(`| ${it.id} | ${it.axis} ${axName(it.axis)} | ${it.domain} ${dName[it.domain]}`
      + ` | ${it.ask} | ${it.gloss} |`);
  }
  P.push("");
  P.push(`가는 직무: ${p.job_aliases.join(" · ")}`);
  P.push("");
}
for (const p of role.packs) {
  P.push(`## ${p.name_ko} (${p.code})`);
  P.push("");
  P.push(`가리키는 자리: ${p.core_ref.td.map((t) => `${t} ${dName[t]}`).join(" · ")}`
    + ` · ${p.core_ref.rf[0]} ${tax.role_functions.find((r) => r.code === p.core_ref.rf[0]).name}`);
  P.push("");
  P.push(`책임지는 것: ${p.owns}`);
  P.push("");
  P.push("| 문항 | 축 | 영역 | 묻는 것 |");
  P.push("|---|---|---|---|");
  for (const it of p.items) {
    P.push(`| ${it.id} | ${it.axis} ${axName(it.axis)} | ${it.domain} ${dName[it.domain]}`
      + ` | ${it.ask} |`);
  }
  P.push("");
  P.push("이웃 역할과 다른 점");
  P.push("");
  for (const x of p.differs_from) P.push(`- ${x.vs}: ${x.line}`);
  P.push("");
  P.push(`지원 자료: ${p.application_material.join(" · ")}`);
  P.push("");
}
writeFileSync(`docs/metri/${CORE}_PACKS.md`, P.join("\n") + "\n");
console.log(`  docs/metri/${CORE}_PACKS.md · 팩 ${ind.packs.length + role.packs.length} · 줄 ${P.length}`);
