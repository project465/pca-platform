/**
 * KUS 34자리 × Core 호환성. **판정을 손으로 적지 않는다.**
 *
 * 입력은 둘이다: 과목 이름을 Core 기술영역 하나에 대어 둔 자료
 * (`docs/kus/data/kus-core-compat.json`)와 그 Core 의 갈래 정의
 * (`major-cores.json` 의 `domain_emphasis`). 이 스크립트가 거기서
 * 등급과 갈래를 계산하고, KUS fixture 가 그 계산과 같은지 센다.
 *
 *   A 검증된 Core 바로 사용 — 공식 쪽 발췌 · 2025 이후 · 과목 10개 이상 · 코드가 붙어 있음 · 한 Core 에 70% 이상
 *   B 제한된 보완 후 사용   — 한 Core 에 60% 이상이지만 근거가 얇다(옛 쪽 · 연도 불명 · 과목 적음)
 *   C 신규 전공 데이터 필요 — 덮는 Core 가 없거나, 교육과정을 확보하지 못해 판단할 수 없다
 *   D 검사 제공 불가       — 기존 Core 범위 밖이고 열면 오해를 부르는 자리(까닭을 자료에 적는다)
 *   R 전공 선택 경로       — 자유전공. 고른 전공이 Core 를 정한다(A~D 밖)
 *
 * **`검증된` 은 교육과정 대조까지의 뜻이다.** 측정 타당도 검증이 아니고, 어느 Core 도
 * `validated` 가 아니다. **학과 이름으로 잇지 않는다**: 과목 자료가 없는 자리는 C 다.
 *
 *   npx tsx scripts/kus/core-compat.ts            # docs/kus/CORE_COMPAT.md 를 다시 만든다
 *   CHECK=1 npx tsx scripts/kus/core-compat.ts    # fixture 가 계산과 다르면 1 로 끝난다
 */
import { readFileSync, writeFileSync } from "node:fs";

type Course = { name: string; code: string | null; required: string | null; td: string | null; why_none?: string };
type Row = {
  leaf: string; name: string; candidate_core: string;
  evidence: { type: string; url: string; year: string | null; note: string };
  courses: Course[];
};
type Compat = { departments: Row[]; not_offered: Record<string, string> };
type Leaf = { code: string; name: string; core_code: string | null; specialization: string | null; routing_only?: boolean; compat?: string; note?: string };
type Spec = { code: string; name_ko: string; authored: boolean; domain_emphasis?: { lead: string[]; support: string[] } };

const ROOT = process.cwd();
const compat = JSON.parse(readFileSync(`${ROOT}/docs/kus/data/kus-core-compat.json`, "utf8")) as Compat;
const fx = JSON.parse(readFileSync(`${ROOT}/scripts/fixtures/campus-kus.json`, "utf8"));
const reg = JSON.parse(readFileSync(`${ROOT}/sites/pca-platform/content/major-cores.json`, "utf8"));
const cores: { code: string; name_ko: string; status: string; maturity?: string; specializations?: Spec[] }[] =
  Array.isArray(reg.cores) ? reg.cores : Object.values(reg.cores ?? reg);
const coreOf = (c: string) => cores.find((x) => x.code === c);

const leaves: { college: string; unit: string; leaf: Leaf }[] = [];
for (const col of fx.universities[0].catalogs[0].colleges) {
  for (const u of col.units) {
    for (const l of (u.majors?.length ? u.majors : [u]) as Leaf[]) leaves.push({ college: col.name, unit: u.name, leaf: l });
  }
}
const openLeaves = new Set<string>(fx.universities[0].student_open?.leaves ?? []);

type Verdict = {
  leaf: string; name: string; college: string; cls: "A" | "B" | "C" | "D" | "R";
  core: string | null; spec: string | null; coverage: string; why: string; need: string;
};

function pickSpec(core: string, tds: string[]): string | null {
  const sp = (coreOf(core)?.specializations ?? []).filter((s) => s.authored && s.domain_emphasis);
  let best: { code: string; score: number } | null = null;
  for (const s of sp) {
    const lead = new Set(s.domain_emphasis!.lead), sup = new Set(s.domain_emphasis!.support);
    const score = tds.reduce((n, t) => n + (lead.has(t) ? 2 : sup.has(t) ? 1 : 0), 0);
    if (!best || score > best.score) best = { code: s.code, score };
  }
  return best?.code ?? null;
}

const verdicts: Verdict[] = leaves.map(({ college, leaf }) => {
  const base = { leaf: leaf.code, name: leaf.name, college };
  if (leaf.routing_only) {
    return { ...base, cls: "R", core: null, spec: null, coverage: "—", why: "전공을 고르는 모집단위다. 고른 전공의 자리가 Core 를 정한다", need: "—" };
  }
  if (compat.not_offered[leaf.code]) {
    return { ...base, cls: "D", core: null, spec: null, coverage: "—", why: compat.not_offered[leaf.code], need: "새 Core 와 그 전공자 검수" };
  }
  const row = compat.departments.find((d) => d.leaf === leaf.code);
  if (!row) {
    return { ...base, cls: "C", core: null, spec: null, coverage: "—",
      why: "교육과정을 확보하지 못했다(공식 쪽 접근 막힘 · 검색 발췌에도 과목 목록이 없음). 학과 이름으로는 잇지 않는다",
      need: "2026 교육과정편람에서 과목 목록 확보 → 이 표를 다시 계산" };
  }
  const mapped = row.courses.filter((c) => c.td);
  const cov = mapped.length / row.courses.length;
  const yr = row.evidence.year ?? "";
  const coded = row.courses.filter((c) => c.code).length / row.courses.length;
  const strong = row.evidence.type === "SEARCH_EXCERPT_OF_OFFICIAL_URL" && /202[5-9]/.test(yr)
    && row.courses.length >= 10 && coded >= 0.8;
  const cls = cov >= 0.7 && strong ? "A" : cov >= 0.6 && row.courses.length >= 3 ? "B" : "C";
  const coverage = `${mapped.length}/${row.courses.length} (${Math.round(cov * 100)}%)`;
  const tds = mapped.map((c) => c.td!);
  const spec = cls === "C" ? null : pickSpec(row.candidate_core, tds);
  const thin = [
    !/202[5-9]/.test(yr) ? `교육과정 연도 ${yr || "불명"}` : "",
    row.courses.length < 10 ? `과목 ${row.courses.length}개뿐` : "",
    coded < 0.8 ? "과목 코드 없음" : "",
  ].filter(Boolean).join(" · ");
  return {
    ...base, cls, core: cls === "C" ? null : row.candidate_core, spec, coverage,
    why: cls === "C"
      ? `${row.candidate_core} 영역에 닿는 과목이 ${coverage} 라 한 Core 로 덮이지 않는다`
      : `${row.candidate_core} 영역에 ${coverage} 가 닿는다${cls === "B" ? ` · 근거가 얇다(${thin})` : ""}`,
    need: cls === "A" ? "전공자 검수(측정 타당도는 미검증)" : cls === "B" ? `${thin} 보완 · 전공자 검수` : "전공 데이터(새 Core 또는 기존 Core 의 영역 보완)",
  };
});

/* fixture 가 계산과 같은가. A·B 는 Core 와 갈래가 같아야 하고, C·D·R 은 Core 를 들지 않아야 한다 */
const drift: string[] = [];
for (const v of verdicts) {
  const l = leaves.find((x) => x.leaf.code === v.leaf)!.leaf;
  if ((l.core_code ?? null) !== v.core) drift.push(`${v.leaf} core ${l.core_code ?? "-"} ≠ ${v.core ?? "-"}`);
  if (v.core && (l.specialization ?? null) !== v.spec) drift.push(`${v.leaf} spec ${l.specialization ?? "-"} ≠ ${v.spec ?? "-"}`);
  if (l.compat !== v.cls) drift.push(`${v.leaf} compat ${l.compat ?? "-"} ≠ ${v.cls}`);
  /* 운영 등록부의 campus:check 와 같은 규칙: `확인 전` · `후보` 를 적은 자리는 Core 를 들지 않는다 */
  if (l.core_code && /확인 전|확인하지 못|후보/.test(l.note ?? "")) drift.push(`${v.leaf} note 가 확인 전이라고 적으면서 Core 를 든다`);
}

const count = (c: string) => verdicts.filter((v) => v.cls === c).length;
const md = [
  "# KUS 34자리 × Core 호환성 (`scripts/kus/core-compat.ts` 가 만든다 · 손으로 고치지 않는다)",
  "",
  `A ${count("A")} · B ${count("B")} · C ${count("C")} · D ${count("D")} · R(전공 선택 경로) ${count("R")} · 합 ${verdicts.length}`,
  "",
  "- **A 검증된 Core 바로 사용** — 공식 쪽 발췌 · 2025 이후 · 과목 10개 이상 · 코드 있음 · 한 Core 의 영역에 70% 이상이 닿는다",
  "- **B 제한된 보완 후 사용** — 60% 이상이 닿지만 근거가 얇다. Core 는 잇되 학생에게 열지 않는다",
  "- **C 신규 전공 데이터 필요** — 덮는 Core 가 없거나 교육과정을 확보하지 못했다. **학과 이름으로 잇지 않는다**",
  "- **D 검사 제공 불가** — 기존 Core 범위 밖이고, 열면 그 학과 학생이 남의 전공 기준으로 재어진다",
  "",
  "`검증된` 은 **교육과정 대조까지**의 뜻이다. 측정 타당도 검증이 아니고, 등록부의 어느 Core 도 `validated` 가 아니다.",
  "과목 근거는 전부 korea.ac.kr 공식 쪽의 **검색 발췌**이고(공식 쪽을 직접 열지 못했다) 목록은 부분이다.",
  "",
  "| 자리 | 학과 | 등급 | Core · 갈래 | 과목 대조 | 까닭 | 열기 전에 필요한 것 | 학생 공개 |",
  "|---|---|---|---|---|---|---|---|",
  ...verdicts.map((v) => {
    const c = v.core ? coreOf(v.core) : null;
    const sp = v.spec ? c?.specializations?.find((s) => s.code === v.spec)?.name_ko ?? v.spec : "";
    const core = v.core ? `${c?.name_ko ?? v.core}${sp ? ` · ${sp}` : ""} (${c?.maturity ?? c?.status})` : "—";
    return `| ${v.leaf} | ${v.college} ${v.name} | **${v.cls}** | ${core} | ${v.coverage} | ${v.why} | ${v.need} | ${openLeaves.has(v.leaf) ? "열림(LEAF)" : "닫힘"} |`;
  }),
  "",
  "## 과목 대조 전문",
  "",
  ...compat.departments.flatMap((d) => [
    `### ${d.name} → ${d.candidate_core}`,
    "",
    `근거: ${d.evidence.type} · ${d.evidence.year ?? "연도 불명"} · ${d.evidence.url}`,
    "",
    "| 과목 | 코드 | 필수 | 영역 |",
    "|---|---|---|---|",
    ...d.courses.map((c) => `| ${c.name} | ${c.code ?? ""} | ${c.required ?? ""} | ${c.td ?? `— ${c.why_none ?? ""}`} |`),
    "",
  ]),
].join("\n");
writeFileSync(`${ROOT}/docs/kus/CORE_COMPAT.md`, md + "\n");
writeFileSync(`${ROOT}/docs/kus/data/kus-core-compat.result.json`, JSON.stringify(verdicts, null, 1) + "\n");

console.log(`A ${count("A")} · B ${count("B")} · C ${count("C")} · D ${count("D")} · R ${count("R")} = ${verdicts.length}`);
for (const v of verdicts.filter((x) => x.cls !== "C")) console.log(`  ${v.cls} ${v.leaf} ${v.core ?? "-"} ${v.spec ?? ""} ${v.coverage}`);
if (drift.length) console.log(`\n  fixture 가 계산과 다르다 ${drift.length}:\n   ` + drift.join("\n   "));
else console.log("\n  fixture 가 계산과 같다");
if (process.env.CHECK && drift.length) process.exit(1);
