/**
 * 전주대 트랙이 잇는 Major Core 가 AI 역량을 **문항 번호 단위로** 얼마나 재는가 (R2 Track B).
 *
 * 세 가지를 섞지 않는다.
 *
 * `MEASURED`      판정 문항(`axis_level`)이 그 역량을 직접 묻는다. 문항 번호를 적는다
 * `SELF_REPORT`   격자의 `해 본 적 있다` · 체크리스트에서 고르는 항목에만 나온다. 판정 근거가 아니다
 * `CURRICULUM`    공식 교육과정이 다루지만 어느 문항도 묻지 않는다(교육과정 추천으로만 쓸 수 있다)
 * `NOT_MEASURED`  어디에도 없다
 *
 * **점수를 만들지 않는다.** 이 표는 문항이 있는가를 세는 것이고, 없는 영역에 역량 값을 만들지 않는다.
 * 묶는 규칙(역량 → 영역 · 열쇠말)은 아래 `CAPS` 에 드러내 적었다: 사람이 고칠 자리다.
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json npx tsx scripts/jju-coverage.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { jjuUniversity, officialProgram, tracksOf } from "../src/lib/jju/program";
import { CAPS, CAP_STATUS_KO as KO, coverageOf, type CapCell } from "../src/lib/jju/coverage";

const C = "sites/pca-platform/content";
type Core = { code: string; name_ko: string; files: Record<string, string>; specializations?: { code: string; name_ko: string; domain_emphasis?: { lead: string[]; support: string[] } }[] };
const reg = JSON.parse(readFileSync(`${C}/major-cores.json`, "utf8")) as { cores: Core[] };
const items = (core: Core) => (JSON.parse(readFileSync(`${C}/${core.files.items}`, "utf8")) as { items: { technical_domain: string | null; measurement_axis: string }[] }).items;
const taxOf = (core: Core) => (JSON.parse(readFileSync(`${C}/${core.files.taxonomy}`, "utf8")) as { technical_domains: { code: string; name_ko?: string; name?: string }[] }).technical_domains;

const u = jjuUniversity();
if (!u) throw new Error("V3_CAMPUS_FIXTURE 가 없다(전주대는 시연 fixture 로만 선다)");
const prog = officialProgram(u);
const courseTopics = new Set(prog?.courses.flatMap((c) => c.topics) ?? []);
const tracks = tracksOf(u).filter((t) => t.cohort.code === "JJU_BC1");
const cores = new Map<string, { core: Core; items: ReturnType<typeof items>; tax: ReturnType<typeof taxOf> }>();
for (const t of tracks) if (t.core_code && !cores.has(t.core_code)) {
  const core = reg.cores.find((c) => c.code === t.core_code)!;
  cores.set(core.code, { core, items: items(core), tax: taxOf(core) });
}
const cov: Record<string, Record<string, CapCell>> = {};
for (const code of cores.keys()) cov[code] = Object.fromEntries(coverageOf(code, courseTopics).map((c) => [c.cap.id, c]));

const out: string[] = []; const P = (s = "") => out.push(s);
P("# Track B — 트랙 × 검사 적합성과 AI 커버리지 (문항 번호 기준)");
P("");
P("`npx tsx scripts/jju-coverage.ts` 가 만든다. **손으로 고치지 않는다.** 묶는 규칙은 스크립트의 `CAPS` 에 드러나 있다.");
P("");
P("세 층을 섞지 않는다: **측정**(판정 문항 `axis_level` 이 직접 묻는다 · 문항 번호를 적는다) · **자기보고만**(격자·체크리스트·경험 기록에만 나온다 · 판정 근거가 아니다) · **교육과정만**(공식 과정이 다루지만 문항이 없다 · 추천으로만 쓴다).");
P("");
P("## 1. 트랙 매핑");
P("");
P("| 트랙(시연용 분류) | 검사 | 갈래 | 갈래가 먼저 설명하는 영역 | 그 영역의 판정 문항 수 |");
P("|---|---|---|---|---|");
for (const t of tracks) {
  const c = cores.get(t.core_code ?? "")!;
  const spec = c.core.specializations?.find((s) => s.name_ko === t.spec_name);
  const lead = spec?.domain_emphasis?.lead ?? [];
  const n = c.items.filter((i) => i.measurement_axis === "axis_level" && lead.includes(i.technical_domain ?? "")).length;
  const nm = (td: string) => { const d = c.tax.find((x) => x.code === td); return `${td} ${d?.name_ko ?? d?.name ?? ""}`; };
  P(`| ${t.short} | ${c.core.name_ko} | ${t.spec_name ?? "없음"} | ${lead.map(nm).join(" · ") || "(갈래 없음 · 열두 영역 같은 무게)"} | ${lead.length ? n : "—"} |`);
}
P("");
P("## 2. AI 역량 커버리지");
P("");
P(`| 역량 | 공식 과정 주제 | ${[...cores.keys()].join(" | ")} |`);
P(`|---|---|${[...cores.keys()].map(() => "---").join("|")}|`);
for (const cap of CAPS) {
  P(`| ${cap.name} | ${cap.course && courseTopics.has(cap.course) ? `AI 기초 과정: ${cap.course}` : "—"} | ${[...cores.keys()].map((k) => {
    const x = cov[k][cap.id];
    return `**${KO[x.status]}**${x.core.length + x.pack.length ? ` (Core ${x.core.length} · 팩 ${x.pack.length})` : ""}`;
  }).join(" | ")} |`);
}
P("");
P("## 3. 측정 근거가 되는 문항 번호");
P("");
for (const [code] of cores) {
  P(`### ${code}`);
  for (const cap of CAPS) {
    const x = cov[code][cap.id];
    if (x.core.length + x.pack.length) P(`- ${cap.name}: Core 문항 ${x.core.join(", ") || "없음"}${x.pack.length ? ` · 팩 문항(그 산업·직무를 고른 사람만) ${x.pack.join(", ")}` : ""}`);
    else if (x.self.length) P(`- ${cap.name}: 판정 문항 없음 · 자기보고 자리 ${x.self.join(", ")}`);
  }
  P("");
}
P("`통계` 는 EE·ME 에서 측정 분포·규격 한계 대조 수준이고 통계 분석 방법을 묻지 않는다. `팩 문항` 은 그 산업·직무 팩을 고른 학생에게만 나온다.");
P("");
P("## 4. 트랙별 판정");
P("");
P("| 트랙 | 판정 | 까닭 |");
P("|---|---|---|");
const verdict = (code: string, need: string[]) => {
  const m = need.filter((id) => cov[code][id].status === "MEASURED");
  const miss = need.filter((id) => cov[code][id].status !== "MEASURED").map((id) => CAPS.find((c) => c.id === id)!.name);
  return { v: m.length === need.length ? "적합" : m.length ? "부분 적합" : "부적합", miss };
};
const NEED: Record<string, string[]> = {
  JJU1_AI: ["DATA", "STAT", "ML", "DL"], JJU1_LLM: ["LLM", "MLOPS"], JJU1_AIOT: ["SENSOR", "EDGE", "ML"],
  JJU1_PHYAI: ["SENSOR", "ROBOT", "CV", "ML"], JJU1_SF: ["DATA", "ML", "SENSOR"],
};
for (const t of tracks) {
  const need = NEED[t.code] ?? [];
  const r = verdict(t.core_code ?? "", need);
  P(`| ${t.short} | **${r.v}** | 트랙 이름이 약속하는 역량 ${need.length}개 가운데 미측정·자기보고만: ${r.miss.join(" · ") || "없음"} |`);
}
P("");
P("트랙이 약속하는 역량(`NEED`)은 트랙 이름에서 읽은 **이 문서의 가정**이다. 사업단이 공식 트랙을 정하면 그 과정의 학습 목표로 바꾼다.");
P("");
P("## 5. 공식 교육과정 출처");
P("");
for (const c of prog?.courses ?? []) P(`- ${c.name} · ${c.topics.join("·") || "세부 미확인"} · 출처 ${c.source} · 상태 \`${c.status}\``);
P(`- 확인일 ${prog?.checked_on} · ${prog?.verification}. 이 세션에서는 www.jj.ac.kr 가 CONNECT 403 이라 원문을 다시 수집하지 못했다(\`docs/jju/r2/evidence/network.txt\`).`);
mkdirSync("docs/jju/r2", { recursive: true });
writeFileSync("docs/jju/r2/TRACK_B_COVERAGE.md", out.join("\n") + "\n");
writeFileSync("docs/jju/r2/coverage.json", JSON.stringify(cov, null, 1));
console.log(out.join("\n"));
