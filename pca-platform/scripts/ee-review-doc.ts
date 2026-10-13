/**
 * 전기전자 전공자가 **코드를 열지 않고** 검토할 자료를 만든다.
 *
 * 손으로 적으면 문면을 고친 날 검토표가 조용히 옛 문장을 들고 있다.
 * 그래서 사람이 적는 자리는 원본 JSON 이고 여기서 나오는 것은 생성물이다.
 * 판정 칸은 비워 두고 검토자가 채운다.
 *
 *   npm run ee:review
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { core as coreEntry, CONTENT_DIR } from "../src/lib/me-v3/core-registry";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { expand, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../src/lib/me-v3/result/build";
import {
  actionKo, gapKo, headlineKo, ZONE_TITLE_KO,
} from "../src/lib/me-v3/result/text.ko";
import type { Submission } from "../src/lib/me-v3/scoring/types";

const CORE = process.env.CORE ?? "EE_CORE_V1";
const entry = coreEntry(CORE);
const read = <T>(n: string): T =>
  JSON.parse(readFileSync(join(CONTENT_DIR, n), "utf8")) as T;

type Dom = {
  code: string; name: string; required_axes: string[];
  artifacts: string[]; verify_targets: string[];
  axes: Record<string, { l2: string; l3: string }>;
};
type Item = {
  item_id: string; module: string; technical_domain: string | null;
  evidence_axis: string | null; wording: string; grid_row?: string | null;
};
type Pack = Record<string, unknown>;

const dom = read<{ domains: Dom[] }>(entry.files.domains!);
const lists = read<{ domains: Record<string, Record<string, { text: string }[]>> }>(
  entry.files.checklists!);
const bank = read<{ items: Item[]; level_options: string[]; item_bank_version: string }>(
  entry.files.items!);
const tax = read<{ axes: Record<string, { name: string }>;
                   role_functions: { code: string; name: string }[] }>(entry.files.taxonomy!);
const ind = read<{ packs: Pack[] }>(entry.packs!.industry!);
const role = read<{ packs: Pack[] }>(entry.packs!.role!);

const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
const axName = (a: string) => `${a} ${tax.axes[a].name}`;
const rfName = (c: string) =>
  tax.role_functions.find((r) => r.code === c)?.name ?? c;
const domName = (c: string) =>
  dom.domains.find((d) => d.code === c)?.name ?? c;

/** 검토자가 채우는 칸. **우리가 미리 고르지 않는다** */
const MARK = "- 판정: `[ ] 유지`  `[ ] 수정 필요`  `[ ] 삭제`  `[ ] 표현 수정`\n- 의견:";

const csv: string[][] = [["구분", "코드", "항목", "내용", "판정", "의견"]];
const row = (kind: string, code: string, label: string, text: string) =>
  csv.push([kind, code, label, text.replace(/"/g, "'"), "", ""]);

const L: string[] = [];
const p = (s = "") => L.push(s);

/* ── 머리말 ─────────────────────────────────────────────── */
p(`# 전기전자 Core 전공자 검토표 (${CORE} · ${bank.item_bank_version})`);
p();
p("이 문서는 전기전자공학 전공자와 현직자가 읽고 판정하는 자료입니다.");
p("코드를 열지 않고 읽을 수 있게 만들었고, 항목마다 판정 칸이 비어 있습니다.");
p("표시는 네 가지입니다.");
p();
p("| 표시 | 뜻 |");
p("|---|---|");
p("| 유지 | 그대로 둡니다 |");
p("| 수정 필요 | 내용이 전기전자에서 하는 판단과 어긋납니다 |");
p("| 삭제 | 이 항목이 재는 것이 없습니다 |");
p("| 표현 수정 | 재는 것은 맞고 문장만 고칩니다 |");
p();
p("판정은 이 문서에 바로 적어도 되고, 표로 모아 적으시려면 같은 폴더의");
p("`EE_CORE_V1_REVIEW.csv` 를 쓰시면 됩니다. 두 파일의 코드가 같습니다.");
p();
p("## 검토하실 때 묻는 열 가지");
p();
p("항목마다 아래 열 가지를 보시면 됩니다. 한 항목이 전부에 걸리지는 않습니다.");
p();
[
  "전기전자 학부생이 읽고 뜻을 알 수 있는 문장인가",
  "실제 전기전자에서 하는 판단인가",
  "지나치게 세부 전공에 치우치지 않았는가",
  "학부와 석사와 박사의 수준 표현이 알맞은가",
  "관심과 경험을 한 문항에서 섞어 묻지 않았는가",
  "직접 수행과 직접 판단이 갈리는가",
  "산업 용어가 실제 현장에서 쓰이는 말인가",
  "역할 설명이 실제 직무와 맞는가",
  "Evidence 가 실제로 남길 수 있는 산출물인가",
  "Action 이 학생이 실제로 할 수 있는 행동인가",
].forEach((q, n) => p(`${n + 1}. ${q}`));
p();
p("## 먼저 아셔야 하는 것 둘");
p();
p("**첫째, 문항은 소유를 묻지 않고 행동을 묻습니다.** 어디까지 직접 정했는지는");
p("보기 넷이 가릅니다.");
p();
bank.level_options.forEach((o, n) => p(`${n}. ${o}`));
p();
p("그래서 문면에 `내가 정한 값이 실제로 쓰였다` 를 적지 않습니다. 그렇게 적으면");
p("계산해서 검토에 올렸지만 아직 적용되지 않은 학부생이 `없다` 로 떨어집니다.");
p();
p("**둘째, 이 검사는 적합도나 합격 가능성을 계산하지 않습니다.** 내놓는 것은");
p("확인된 판단축과 비어 있는 자리와 다음에 할 일입니다. 점수나 순위를 기대하고");
p("읽으시면 빠진 것으로 보입니다.");
p();

/* ── 1절. 영역 열둘 ──────────────────────────────────────── */
p("---");
p();
p(`## 1. 기술영역 ${dom.domains.length}개`);
p();
p("영역마다 필수 축 둘이 있습니다. 그 둘이 비면 근거가 섰다고 적지 않습니다.");
p("대표 문항은 선별 축과 심화 축에서 하나씩 뽑았습니다.");
p();
for (const d of dom.domains) {
  p(`### ${d.code} ${d.name}`);
  p();
  p(`- 필수 축: ${d.required_axes.map(axName).join(" · ")}`);
  p(`- 남기는 산출물: ${d.artifacts.slice(0, 4).join(" · ")}`);
  p(`- 무엇과 견주는가: ${d.verify_targets.slice(0, 4).join(" · ")}`);
  p();
  p("**대표 문항**");
  p();
  p("| 묶음 | 축 | 문항 |");
  p("|---|---|---|");
  for (const mod of ["PROBE-S4", "DEEP-S8"]) {
    const it = bank.items.find((i) => i.technical_domain === d.code && i.module === mod);
    if (!it) continue;
    p(`| ${mod === "PROBE-S4" ? "선별" : "심화"} | ${it.evidence_axis} | ${it.wording} |`);
    row("문항", it.item_id, `${d.code} ${d.name}`, it.wording);
  }
  const grid = bank.items.find((i) => i.technical_domain === d.code && i.module === "CORE-GRID");
  if (grid?.grid_row) {
    p(`| 훑기 | 관심·경험·배울 뜻 | ${grid.grid_row} |`);
    row("문항", grid.item_id, `${d.code} 훑기 줄`, grid.grid_row);
  }
  p();
  p("**필수 축의 수행 조건과 소유 조건**");
  p();
  p("| 축 | 수행했다고 보는 조건 | 직접 정했다고 보는 조건 |");
  p("|---|---|---|");
  for (const a of d.required_axes) {
    p(`| ${axName(a)} | ${d.axes[a].l2} | ${d.axes[a].l3} |`);
    row("축 조건", `${d.code}.${a}`, `${d.code} ${axName(a)}`,
      `수행 ${d.axes[a].l2} / 소유 ${d.axes[a].l3}`);
  }
  p();
  p("**고르는 근거 항목 (필수 축에서 셋까지)**");
  p();
  for (const a of d.required_axes) {
    const picks = (lists.domains[d.code]?.[a] ?? []).slice(0, 3);
    p(`- ${axName(a)}`);
    for (const x of picks) p(`  - ${x.text}`);
    picks.forEach((x, n) => row("근거 항목", `${d.code}.${a}.${n + 1}`,
      `${d.code} ${axName(a)}`, x.text));
  }
  p();
  p(MARK);
  p();
  row("영역", d.code, d.name,
    `필수 축 ${d.required_axes.join("·")} / 산출물 ${d.artifacts.slice(0, 3).join("·")}`);
}

/* ── 2절. 산업팩 여덟 ────────────────────────────────────── */
p("---");
p();
p(`## 2. 산업팩 ${ind.packs.length}개`);
p();
p("산업팩이 하는 일은 그 산업이 더 보는 축을 먼저 설명하는 것입니다.");
p("점수를 바꾸지 않습니다. 용어를 모르셔도 같은 판단이면 걸리게 하려고 문항마다");
p("쉬운 말 풀이를 붙였습니다.");
p();
for (const k of ind.packs) {
  const q = k as {
    code: string; name_ko: string; demands: string[]; scene: string;
    judgement_dimensions: { name: string; axis: string; domain: string; why: string }[];
    items: { id: string; axis: string; domain: string; ask: string; gloss: string }[];
    gap_language: Record<string, string>; vocabulary: string[];
    evidence_reading: { same: string; reads_as: string }[];
  };
  p(`### ${q.code} ${q.name_ko}`);
  p();
  p(`${q.scene}`);
  p();
  p("**이 산업이 요구하는 것**");
  p();
  for (const d of q.demands) p(`- ${d}`);
  p();
  p("**어떤 전기전자 판단을 보는가**");
  p();
  p("| 보는 판단 | 영역 | 축 | 왜 |");
  p("|---|---|---|---|");
  for (const j of q.judgement_dimensions.slice(0, 6)) {
    p(`| ${j.name} | ${j.domain} ${domName(j.domain)} | ${j.axis} | ${j.why} |`);
    row("산업 판단", `${q.code}.${j.axis}.${j.domain}`, q.name_ko, `${j.name} (${j.why})`);
  }
  p();
  p("**대표 문항과 쉬운 말 풀이**");
  p();
  p("| 문항 | 쉬운 말 풀이 |");
  p("|---|---|");
  for (const it of q.items.slice(0, 4)) {
    p(`| ${it.ask} | ${it.gloss} |`);
    row("산업 문항", it.id, q.name_ko, `${it.ask} // ${it.gloss}`);
  }
  p();
  p(`**현장 용어**: ${q.vocabulary.join(" · ")}`);
  p();
  p("**비어 있는 자리를 이 산업 말로 적으면**");
  p();
  for (const [a, t] of Object.entries(q.gap_language)) {
    p(`- ${axName(a)}: ${t}`);
    row("산업 Gap 문장", `${q.code}.gap.${a}`, q.name_ko, t);
  }
  p();
  p("**같은 경험이 이 산업에서 어떻게 읽히는가**");
  p();
  p("| 적어 주신 것 | 이 산업에서 읽히는 뜻 |");
  p("|---|---|");
  for (const e of q.evidence_reading) p(`| ${e.same} | ${e.reads_as} |`);
  p();
  p(MARK);
  p();
  row("산업팩", q.code, q.name_ko, `용어 ${q.vocabulary.join("·")}`);
}

/* ── 3절. 역할팩 여덟 ────────────────────────────────────── */
p("---");
p();
p(`## 3. 역할팩 ${role.packs.length}개`);
p();
p("역할팩이 묻는 것은 그 자리에서 가진 권한과 범위입니다. 기술영역을 다시 묻지");
p("않습니다. 그래서 설계와 해석이 같은 회로를 놓고도 다른 것을 결정합니다.");
p();
for (const k of role.packs) {
  const q = k as {
    code: string; name_ko: string; core_ref: { td: string[]; rf: string[] };
    required_axes: string[]; owns: string; decides: string[];
    differs_from: { vs: string; line: string }[];
    items: { id: string; axis: string; domain: string; ask: string }[];
    application_material: string[];
  };
  p(`### ${q.code} ${q.name_ko}`);
  p();
  p(`- 무엇을 확정하는 자리인가: ${q.owns}`);
  p(`- 직접 정하는 것: ${q.decides.join(" · ")}`);
  p(`- 보는 영역: ${q.core_ref.td.map((t) => `${t} ${domName(t)}`).join(" · ")}`);
  p(`- 역할기능: ${q.core_ref.rf.map((r) => `${r} ${rfName(r)}`).join(" · ")}`);
  p(`- 보는 축: ${q.required_axes.map(axName).join(" · ")}`);
  p();
  p("**대표 문항**");
  p();
  p("| 축 | 영역 | 문항 |");
  p("|---|---|---|");
  for (const it of q.items.slice(0, 4)) {
    p(`| ${it.axis} | ${it.domain} ${domName(it.domain)} | ${it.ask} |`);
    row("역할 문항", it.id, q.name_ko, it.ask);
  }
  p();
  p(`**지원서에 넣을 산출물 예시**: ${q.application_material.join(" · ")}`);
  p();
  p("**옆 역할과 갈리는 자리**");
  p();
  for (const d of q.differs_from) p(`- ${d.vs}: ${d.line}`);
  p();
  p(MARK);
  p();
  row("역할팩", q.code, q.name_ko,
    `${q.owns} / 산출물 ${q.application_material.join("·")}`);
}

/* ── 4절. 결과 예시 셋 ───────────────────────────────────── */
p("---");
p();
p("## 4. 결과 예시");
p();
p("아래 셋은 실제 엔진이 낸 결과입니다. 손으로 적은 예시가 아닙니다.");
p("가상의 응답자 셋을 등급마다 하나씩 골라 돌렸습니다.");
p();
const loaded = load(CORE);
const fx = JSON.parse(readFileSync(entry.fixtures!.personas!, "utf8")) as
  { personas: Fixture[] };
const SAMPLE: { tier: Submission["tier"]; id: string; why: string }[] = [
  { tier: "BASIC", id: "P04", why: "선별 네 축을 다 확인했고 빈자리가 없는 사람" },
  { tier: "STANDARD", id: "P08", why: "확인된 영역과 아직 얕은 영역이 함께 있는 사람" },
  { tier: "PRO", id: "P12", why: "석사 경험을 직무 말로 옮기는 자리까지 간 사람" },
];
for (const s of SAMPLE) {
  const f = fx.personas.find((x) => x.id === s.id);
  if (!f) continue;
  const snap = score({ ...expand(f, CORE), tier: s.tier }, loaded);
  const m = buildResult(snap, loaded, { packs: { industries: [], roles: [] } });
  p(`### ${s.tier} · ${f.name}`);
  p();
  p(`${s.why}.`);
  p();
  const h = headlineKo(m);
  p(`- 첫 줄: **${h.title}**`);
  p(`- 이어지는 줄: ${h.lead}`);
  p(`- 먼저 볼 영역: ${m.overview.focus.map((c) => `${c} ${domName(c)}`).join(" · ") || "없다"}`);
  p();
  p("**확인된 영역**");
  p();
  p("| 영역 | 묶음 | 확인된 축 |");
  p("|---|---|---|");
  for (const d of m.domains.filter((x) => x.confirmed.length)) {
    p(`| ${d.code} ${domName(d.code)} | ${ZONE_TITLE_KO[d.zone]} `
      + `| ${d.confirmed.map(axName).join(" · ")} |`);
  }
  p();
  if (m.gaps.length) {
    p("**아직 비어 있는 자리**");
    p();
    for (const g of m.gaps.slice(0, 4)) {
      const t = gapKo(g, domName(g.domain));
      p(`- ${g.domain} ${domName(g.domain)} · ${t.title}: ${t.detail} (${t.why})`);
      row("결과 Gap", `${s.tier}.${g.id}`, `${s.tier} ${f.name}`,
        `${t.title} / ${t.detail}`);
    }
    p();
  } else {
    p("비어 있는 자리가 잡히지 않은 응답입니다.");
    p();
  }
  p("**다음에 할 일**");
  p();
  for (const a of m.actions.slice(0, 4)) {
    const t = actionKo(a, a.domain ? domName(a.domain) : "", snap.stage);
    p(`- ${t.do}${t.guide ? ` (${t.guide})` : ""}`);
    row("결과 Action", `${s.tier}.${a.id}`, `${s.tier} ${f.name}`, t.do);
  }
  p();
  p(MARK);
  p();
}

/* ── 꼬리말 ─────────────────────────────────────────────── */
p("---");
p();
p("## 검토가 끝난 뒤");
p();
p("판정이 돌아오면 원본 JSON 을 고치고 `npm run ee:all` 을 돌립니다. 문면을");
p("고치면 문항 은행 판본을 올리고 지문을 다시 적습니다. 학생에게 여는 것은 그");
p("다음이고, 지금은 등록부에서 닫혀 있습니다.");
p();
p("이 검사는 아직 실제 응답으로 신뢰도와 타당도를 재지 않았습니다. 그래서 어느");
p("자리에서도 `검증된 검사` 로 적지 않습니다.");

const md = `docs/metri/${CORE === "EE_CORE_V1" ? "EE_CORE_V1" : CORE}_REVIEW.md`;
const cs = md.replace(/\.md$/, ".csv");
writeFileSync(md, `${L.join("\n")}\n`);
writeFileSync(cs, `${csv.map((r) =>
  r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")}\n`);
console.log(`  적었다  ${md} — ${L.length}줄`);
console.log(`  적었다  ${cs} — 항목 ${csv.length - 1}개`);
