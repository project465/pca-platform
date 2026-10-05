/**
 * 지역화가 **다 덮였는가**. 브라우저로 한 번 그려 보는 것만으로는 모른다.
 *
 * 패리티 검사(`i18n:parity`)는 정해진 응시자 하나를 그려서 그 화면에 한글이
 * 남았는지 본다. 그런데 직무군이 열여섯이고 조직 유형이 일곱이라, 한 사람을
 * 그리면 데이터 파일의 일부만 지나간다. 나머지는 **다른 응시자가 왔을 때**
 * 처음 한국어로 샌다. 그러면 그 사람이 첫 발견자가 된다.
 *
 * 그래서 여기서는 화면을 그리지 않고 **데이터 파일에서 사람이 읽는 칸만**
 * 뽑아 사전과 대조한다. 어느 응시자가 와도 나올 수 있는 글자 전부다.
 *
 *   node scripts/i18n-coverage.mjs           대조
 *   node scripts/i18n-coverage.mjs --dump    빠진 것을 파일로
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const ROOT = "sites/pca-platform";
const DICT = `${ROOT}/content/report-i18n.json`;
const OUT = "docs/metri/generated/i18n-uncovered.json";

const J = (p) => JSON.parse(readFileSync(`${ROOT}/${p}`, "utf8"));
const HAN = /[가-힣]/;

/* 사람이 읽는 칸만 적는다. **맞추기에만 쓰는 칸은 넣지 않는다**: 별칭·
   검색어·과목 목록은 응시자가 적은 글과 견주는 자료라 화면에 나가지 않고,
   그것을 번역하면 맞추기가 조용히 깨진다 */
const SPECS = [
  {
    file: "content/me-knowledge.json", where: "전공지식 28갈래",
    pick: (d) => d.domains.flatMap((x) => [
      x.name_ko, ...(x.work || []), ...(x.decisions || []),
      ...(x.outputs || []), ...(x.performance || []),
    ]),
  },
  {
    file: "content/me-tools.json", where: "도구 갈래",
    /* 도구 **이름**(SolidWorks · ANSYS)은 고유명사라 옮기지 않는다 */
    pick: (d) => [
      ...d.categories.map((c) => c.n),
      ...(d.usage_levels || []).map((u) => u.n),
    ],
  },
  {
    file: "content/me-value-paths.json", where: "직무군 가치 사슬",
    pick: (d) => d.families.flatMap((f) => [
      f.problem, ...(f.work || []), ...(f.decisions || []), ...(f.outputs || []),
      ...(f.performance || []), ...(f.evidence_you_can_show || []),
      ...(f.check_missing || []),
      ...Object.values(f.org_variants || {}).flatMap((v) => [v.output, v.performance]),
    ]),
  },
  {
    file: "content/org-types.json", where: "조직 유형 일곱",
    pick: (d) => d.organization_types.flatMap((o) => [
      o.name_ko, o.one_line, o.reads_your_work_as,
      ...(o.output_types || []), ...(o.performance_criteria || []),
      ...(o.what_counts_as_value || []),
    ]),
  },
  {
    file: "content/followups.json", where: "되묻는 말",
    pick: (d) => [
      d.answer_note,
      ...d.gaps.flatMap((g) => [
        g.title, g.why,
        ...(g.questions || []).flatMap((q) => [q.q, ...(q.options || [])]),
      ]),
    ],
  },
  {
    file: "content/me-evidence-map.json", where: "증거 지도 199영역",
    pick: (d) => d.families.flatMap((f) =>
      (f.evidence_requirements || []).flatMap((r) => [r.label, r.description])),
  },
  {
    file: "content/evidence-rules.json", where: "준비도 신호",
    /* `outputs` · `methods` · `courses` 는 응시자가 적은 글에서 찾는
       검색어다. 번역하면 찾는 쪽이 조용히 깨진다 */
    pick: (d) => (d.families || []).flatMap((f) =>
      (f.signals || []).map((g) => g.label)),
  },
  {
    file: "assessment/ME_V2/decision-rules.json", where: "결정 상태와 업무 방식",
    pick: (d) => [
      ...Object.values(d.statuses || {}).flatMap((s) => [s.label, s.line]),
      ...Object.entries(d.work_mode_labels || {})
        .filter(([k]) => k !== "note").map(([, v]) => v),
    ],
  },
  {
    file: "assessment/ME_V2/family-names.json", where: "직무군 이름",
    /* 여기만 **사전을 거치지 않는다**: `names-en` 이 짝으로 들어 있어서
       PCAI18N.family() 가 그쪽을 직접 읽는다. 짝이 비었는지만 본다 */
    pair: (d) => Object.keys(d.names || d).filter((k) => k !== "note" && k !== "names-en"),
    pairOf: (d) => d["names-en"] || {},
  },
];

/* 맞추기 어휘는 **화면 글자와 따로 센다.** 여기 빠진 것은 영어로 적어
   주신 경험이 걸리지 않는 자리이고, 화면에 한국어가 보이는 것과 달리
   눈에 띄지 않는다: 같은 내용을 적었는데 공백만 더 받는다 */
const GLOS = `${ROOT}/content/match-glossary.json`;
const MATCHERS = [
  {
    file: "content/me-evidence-map.json", where: "증거 지도 검색어",
    pick: (d) => (d.families || []).flatMap((f) =>
      (f.evidence_requirements || []).flatMap((r) => [
        ...((r.match || {}).keywords || []),
        ...((r.match || {}).courses || []),
      ])),
  },
  {
    file: "content/evidence-rules.json", where: "준비도 신호 매처",
    pick: (d) => (d.families || []).flatMap((f) =>
      (f.signals || []).flatMap((g) => [
        ...(g.methods || []), ...(g.outputs || []), ...(g.courses || []),
      ])),
  },
];

const dict = JSON.parse(readFileSync(DICT, "utf8")).en;
const bad = [];
const uncovered = [];
const rows = [];

for (const sp of SPECS) {
  const d = J(sp.file);
  if (sp.pair) {
    const keys = sp.pair(d);
    const en = sp.pairOf(d);
    const miss = keys.filter((k) => !en[k]);
    rows.push(`${sp.file.padEnd(44)} 짝 ${keys.length - miss.length}/${keys.length}`);
    if (miss.length) bad.push(`${sp.file} 영어 이름이 빠진 직무군 ${miss.length}: ${miss.slice(0, 3).join(" · ")}`);
    continue;
  }
  const all = [...new Set(sp.pick(d).filter((x) => typeof x === "string" && HAN.test(x)))];
  const miss = all.filter((x) => !dict[x]);
  rows.push(`${sp.file.padEnd(44)} ${all.length - miss.length}/${all.length}  ${sp.where}`);
  if (miss.length) {
    bad.push(`${sp.where} 영어판이 없는 문구 ${miss.length}가지 (${sp.file})`);
    for (const m of miss) uncovered.push(m);
  }
}

/* ── 맞추기 어휘 ──────────────────────────────────────────────────── */
const glos = JSON.parse(readFileSync(GLOS, "utf8")).en || {};
const noWord = [];
for (const sp of MATCHERS) {
  const d = J(sp.file);
  /* 이미 라틴 글자인 검색어(ansys · cad · fmea)는 양쪽에서 그대로
     걸리므로 셀 것이 없다 */
  const all = [...new Set(sp.pick(d)
    .filter((x) => typeof x === "string" && HAN.test(x)))];
  const miss = all.filter((x) => !(glos[x] && glos[x].length));
  rows.push(`${sp.file.padEnd(44)} ${all.length - miss.length}/${all.length}  ${sp.where}`);
  if (miss.length) {
    bad.push(`${sp.where} 영어로 찾을 말이 없는 검색어 ${miss.length}가지 (${sp.file})`);
    for (const m of miss) noWord.push(m);
  }
}

console.log(rows.join("\n"));

if (process.argv.includes("--dump")) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify([...new Set(uncovered)].sort(), null, 1) + "\n");
  console.log(`\n덮이지 않은 것 ${new Set(uncovered).size}가지 → ${OUT}`);
  const O2 = "docs/metri/generated/i18n-nomatch.json";
  writeFileSync(O2, JSON.stringify([...new Set(noWord)].sort(), null, 1) + "\n");
  console.log(`영어로 찾을 말이 없는 검색어 ${new Set(noWord).size}가지 → ${O2}`);
}

if (bad.length) {
  console.error("\n" + bad.length + "개가 걸렸다.");
  for (const b of bad) console.error("  " + b);
  process.exit(1);
}
console.log("\n사람이 읽는 칸과 경험에서 찾는 말이 전부 두 언어로 있다.");
