/**
 * **학과마다 MAT 공고 맞춤이 몇 건이고 그중 무관한 공고가 몇 %인가**(2026-11-06 대표 "MAT 기능을 완벽하게":
 * 전주대 인공지능학과 학생에게 관련 없는 공고가 섞여 나왔다).
 *
 * 학교 등록부(`campus-universities.json`)의 학과 → Core · 갈래 → MAT 공고 고르기(`rankJobs`, 화면과 같은 함수)를
 * 학과마다 한 번씩 돌린다. 공고는 두 가지 가운데 하나다.
 *
 * - 기본: 고정 견본(`scripts/fixtures/mat-match-postings.json`). 잡인더스트리 채용 게시판 430 · 439 · 486 · 487 · 488 과
 *   커리어피크 캘린더 꼴을 따른 공고에 **사람이 따로 적은 정답**(`fit`: 어느 전공에 맞는 공고인가)이 붙어 있다.
 *   모을 때와 같은 길(`mapPosting` · `kindOf` · `cpRows`)로 표 한 줄을 만든 뒤 고른다. DB 가 없어도 돈다
 * - `MAT_MATCH_DB=1`: 로컬 DB 의 `v3_job_postings`(`jobPool`, 화면과 같은 묶음). 정답이 없어 수만 센다
 *
 * 학생은 자료 · 경험을 아직 올리지 않은 학부생이다(학교 계정으로 처음 들어온 사람). 무관 비율은 맞는 공고로 선 것
 * 가운데 그 학과 정답에 없는 공고의 비율이다. 놓친 공고는 그 학과 정답인데 맞는 공고로 서지 않은 채용 공고다.
 *
 *   npm run mat:match                     PCU · KUS · SJEPA · JJU 학과 전체
 *   UNI=JJU npm run mat:match             한 기관만
 *   MAT_MATCH_JSON=out.json npm run mat:match   결과를 JSON 으로도 남긴다
 *
 * **걸리는 조건**: 전주대 인공지능학과(`JJU26_AI`) 맞는 공고 위 열 건에 무관한 공고가 있거나, AI 부트캠프(피지컬 AI)
 * 위 다섯 건에 로봇 · 자동화 공고가 없거나, 견본 기준 전체 무관 비율이 10%를 넘으면 실패한다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { universities, allLeaves, leafOpen, type CampusUniversity } from "../src/lib/campus/registry";
import { mapPosting } from "../src/lib/jobs/map";
import { employmentOf, kindOf, splitFields, type PostingKind } from "../src/lib/jobs/meta";
import { JI_BOARDS } from "../src/lib/jobs/jobindustry-parse";
import { cpRows, type CpItem } from "../src/lib/jobs/careerpeak";
import { majorNameOf } from "../src/lib/me-v3/major-name";
import { rankJobs, jobPool, type PoolRow, type RankCtx } from "../src/lib/mat/pick-jobs";

type Fit = string[];
type JiItem = { b: string; tag: string; t: string; f: string; q: string; e: string; w: string; fit: Fit };
type CpFix = Partial<CpItem> & { id: string; title: string; fit: Fit };
type Fixture = { jobindustry: JiItem[]; careerpeak: CpFix[] };

/* 정답 약칭 → Core 코드. PHYS 는 피지컬 AI · 로봇 공고(Core 가 아니라 갈래 하나) */
const SHORT: Record<string, string> = { ME: "ME_CORE_V3", PHYS: "SPEC_AI_PHYSICAL" };
const codeOf = (s: string) => SHORT[s] ?? `${s}_CORE_V1`;

/**
 * 그 학과 학생에게 맞는 공고로 치는 정답 묶음. **사람이 정한 것이다**(맞춤 사전을 보지 않는다):
 * 그 Core, 갈래가 피지컬 AI 면 로봇 공고, 컴퓨터 Core 의 인공지능 갈래면 인공지능 공고.
 * 전주대 AI 부트캠프(피지컬 AI)는 컴퓨터 Core 로 재지만 과정이 인공지능 · 피지컬 AI 라 둘 다 맞는 공고다
 */
function accepts(core: string, spec: string | null, unit: string): Set<string> {
  const out = new Set([core]);
  if (spec === "SPEC_AI_PHYSICAL") out.add("SPEC_AI_PHYSICAL");
  if (spec === "SPEC_CS_AI") out.add("AI_CORE_V1");
  if (unit === "JJU26_BOOTCAMP_AI") { out.add("AI_CORE_V1"); out.add("SPEC_AI_PHYSICAL"); }
  return out;
}

const NOW = Date.parse("2026-11-06T09:00:00+09:00");
const CAPTURED = new Date(NOW - 86_400_000).toISOString();

function fixturePool(): { pool: PoolRow[]; fit: Map<string, Set<string>> } {
  const fx = JSON.parse(readFileSync(join(__dirname, "fixtures", "mat-match-postings.json"), "utf8")) as Fixture;
  const pool: PoolRow[] = [];
  const fit = new Map<string, Set<string>>();
  fx.jobindustry.forEach((x, i) => {
    const board = JI_BOARDS.find((b) => b.path === x.b);
    const body = [`모집 분야: ${x.f}`, `지원 자격: ${x.q}`, x.e ? `고용 형태: ${x.e}` : "", `근무지: ${x.w}`, "접수 기간: 2026.11.01 ~ 2026.12.31"]
      .filter(Boolean).join("\n");
    const m = mapPosting(x.t, body);
    const id = `ji-${x.b}-${i + 1}`;
    pool.push({
      id, source: "jobindustry", source_url: `https://www.jobindustry.co.kr/${x.b}/?bmode=view&idx=${9000 + i}&t=board`,
      closes_on: "2026-12-31", captured_at: CAPTURED, region_code: null, raw_requirements: m.requirements,
      core_code: m.core, role_code: m.role, title: x.t, category: board?.label ?? null, field: x.tag,
      degree_label: null, region_label: null, abroad: false,
      posting_kind: kindOf((board?.kind ?? "job") as PostingKind, employmentOf(x.e)),
      recruit_field: splitFields(body).모집분야 ?? null,
    } as PoolRow);
    fit.set(id, new Set(x.fit.map(codeOf)));
  });
  const cpItems = fx.careerpeak.map((c) => ({
    org: "", org_short: "", url: null, start: "2026-11-01", end: "2026-12-31", status: "접수 중", category: "",
    job_types: [], degrees: [], degree_note: "", evidence: "", ...c,
  })) as CpItem[];
  cpRows(cpItems).forEach((r, i) => {
    const m = mapPosting(r.title, r.body);
    const id = `cp-${i + 1}`;
    pool.push({
      id, source: "careerpeak", source_url: r.url ?? null, closes_on: "2026-12-31", captured_at: CAPTURED, region_code: null,
      raw_requirements: m.requirements, core_code: m.core, role_code: m.role, title: r.title,
      category: r.meta?.category ?? null, field: r.meta?.field ?? null, degree_label: r.meta?.degreeLabel ?? null,
      region_label: r.meta?.regionLabel ?? null, abroad: r.meta?.abroad ?? null, posting_kind: r.meta?.kind ?? "job",
      job_family: r.meta?.jobFamily ?? null,
    } as PoolRow);
    fit.set(id, new Set(fx.careerpeak[i].fit.map(codeOf)));
  });
  return { pool, fit };
}

type DeptRow = {
  uni: string; unit: string; name: string; core: string; spec: string | null;
  main: number; wrong: number; missed: number; grad: number; gradWrong: number; broad: number;
  top: { title: string; ok: boolean | null }[];
};

async function main(): Promise<void> {
  const useDb = process.env.MAT_MATCH_DB === "1";
  const { pool, fit } = useDb ? { pool: await jobPool(), fit: new Map<string, Set<string>>() } : fixturePool();
  const want = (process.env.UNI ?? "").toUpperCase();
  const unis = universities().filter((u) => ["PCU", "KUS", "SJEPA", "JJU"].includes(u.university_code))
    .filter((u) => !want || u.university_code === want);
  console.log(`공고 ${pool.length}건(${useDb ? "로컬 DB" : "고정 견본"}) · 기관 ${unis.map((u) => u.university_code).join(" · ")}`);

  const rows: DeptRow[] = [];
  for (const u of unis as CampusUniversity[]) {
    const seen = new Set<string>();
    for (const r of allLeaves(u)) {
      const leaf = r.leaf;
      if (!leaf.core_code || !leafOpen(u, leaf) || seen.has(leaf.code)) continue;
      seen.add(leaf.code);
      const ctx = {
        mine: null, major: majorNameOf(leaf.core_code), core: leaf.core_code, grad: false, now: NOW,
        spec: leaf.specialization ?? null, unit: leaf.code,
      } as RankCtx;
      const picked = rankJobs(pool, ctx, 1000);
      const ok = accepts(leaf.core_code, leaf.specialization ?? null, leaf.code);
      const isOk = (id: string): boolean | null => {
        const f = fit.get(id);
        return f ? [...f].some((c) => ok.has(c)) : null;
      };
      const shownIds = new Set(picked.main.map((p) => p.id));
      /* MAT_MATCH_SHOW=JJU26_AI,PCU26_BIZ 처럼 주면 그 학과의 맞는 공고와 겹친 분야어를 다 적는다 */
      if ((process.env.MAT_MATCH_SHOW ?? "").split(",").includes(leaf.code)) {
        console.log(`
-- ${leaf.code} ${leaf.name}`);
        for (const p of picked.main) console.log(`  ${isOk(p.id) === false ? "무관" : "맞음"}  ${p.title}  [${p.hits.join(", ")}]`);
        for (const p of pool) {
          if ((p.posting_kind ?? "job") === "job" && isOk(p.id) && !picked.main.some((x) => x.id === p.id)) console.log(`  놓침  ${p.title}`);
        }
      }
      const missed = useDb ? 0 : pool.filter((p) => (p.posting_kind ?? "job") === "job" && isOk(p.id) && !shownIds.has(p.id)).length;
      rows.push({
        uni: u.university_code, unit: leaf.code, name: leaf.name, core: leaf.core_code, spec: leaf.specialization ?? null,
        main: picked.main.length,
        wrong: picked.main.filter((p) => isOk(p.id) === false).length,
        missed,
        grad: picked.grad.length,
        gradWrong: picked.grad.filter((p) => isOk(p.id) === false).length,
        broad: picked.broad.length,
        top: picked.main.slice(0, 10).map((p) => ({ title: p.title ?? "", ok: isOk(p.id) })),
      });
    }
  }

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "-");
  for (const u of unis) {
    const list = rows.filter((r) => r.uni === u.university_code);
    const main = list.reduce((n, r) => n + r.main, 0), wrong = list.reduce((n, r) => n + r.wrong, 0);
    console.log(`\n## ${u.university_code} ${u.university_name} · 학과 ${list.length} · 맞는 공고 0건인 학과 ${list.filter((r) => !r.main).length}`
      + (useDb ? "" : ` · 무관 ${wrong}/${main} (${pct(wrong, main)})`));
    console.log(useDb ? "학과\tCore\t맞는 공고\t대학원 묶음" : "학과\tCore\t맞는 공고\t무관\t무관 비율\t놓친 공고\t대학원 묶음(무관)\t넓힌 공고");
    for (const r of list) {
      console.log(useDb
        ? `${r.name}\t${r.core}\t${r.main}\t${r.grad}`
        : `${r.name}\t${r.core}${r.spec ? `/${r.spec}` : ""}\t${r.main}\t${r.wrong}\t${pct(r.wrong, r.main)}\t${r.missed}\t${r.grad}(${r.gradWrong})\t${r.broad}`);
    }
  }

  const show = (unit: string, label: string) => {
    const r = rows.find((x) => x.unit === unit);
    if (!r) return;
    console.log(`\n### ${label} 맞는 공고 위 10건`);
    r.top.forEach((x, i) => console.log(`${i + 1}. ${x.ok === null ? "" : x.ok ? "[맞음] " : "[무관] "}${x.title}`));
    if (!r.top.length) console.log("(없음)");
  };
  show("JJU26_AI", "전주대 인공지능학과");
  show("JJU26_BOOTCAMP_AI", "전주대 AI 부트캠프(피지컬 AI)");

  /*
   * 전주대 인공지능학과는 2026-11-03 부터 AI_CORE_V1 / SPEC_AI_DATA 로 응시하지만, 그 전 응시와 학교 계정 줄에는
   * CS_CORE_V1 · SPEC_CS_AI 가 남아 있다(`specOf` 가 응시 Core 와 다르면 학교 계정 값을 읽는다). 어느 짝으로 읽혀도
   * 인공지능 공고가 위에 서고 무관 공고가 없어야 한다
   */
  const variants: { core: string; spec: string | null }[] = [
    { core: "AI_CORE_V1", spec: "SPEC_AI_DATA" }, { core: "AI_CORE_V1", spec: "SPEC_CS_AI" },
    { core: "CS_CORE_V1", spec: "SPEC_CS_AI" }, { core: "AI_CORE_V1", spec: null },
  ];
  const aiIds = new Set(pool.filter((p) => fit.get(p.id)?.has("AI_CORE_V1")).map((p) => p.id));
  const variantFails: string[] = [];
  if (!useDb && (!want || want === "JJU")) {
    console.log("\n### 전주대 인공지능학과 · 응시 Core / 갈래 짝마다(위 10건 중 인공지능 공고 · 무관)");
    for (const v of variants) {
      const picked = rankJobs(pool, { mine: null, major: majorNameOf(v.core), core: v.core, grad: false, now: NOW, spec: v.spec, unit: "JJU26_AI" } as RankCtx, 1000);
      const ok = accepts(v.core, v.spec, "JJU26_AI");
      const top = picked.main.slice(0, 10);
      const wrongTop = top.filter((p) => { const f = fit.get(p.id); return f ? ![...f].some((c) => ok.has(c)) : false; }).length;
      const aiTop = top.filter((p) => aiIds.has(p.id)).length;
      console.log(`${v.core} / ${v.spec ?? "(갈래 없음)"}\t맞는 공고 ${picked.main.length}\t위 10건 인공지능 ${aiTop}\t위 10건 무관 ${wrongTop}`);
      if (wrongTop) variantFails.push(`인공지능학과(${v.core} / ${v.spec ?? "-"}) 위 열 건에 무관한 공고가 있다`);
      if (aiTop < 5) variantFails.push(`인공지능학과(${v.core} / ${v.spec ?? "-"}) 위 열 건에 인공지능 공고가 ${aiTop}건뿐이다`);
    }
  }

  const out = process.env.MAT_MATCH_JSON;
  if (out) writeFileSync(out, JSON.stringify({ source: useDb ? "db" : "fixture", pool: pool.length, rows }, null, 1));

  if (useDb) return;
  const fails: string[] = [...variantFails];
  const ai = rows.find((r) => r.unit === "JJU26_AI");
  if (ai && ai.top.some((x) => x.ok === false)) fails.push("전주대 인공지능학과 위 열 건에 무관한 공고가 있다");
  if (ai && ai.main < 5) fails.push(`전주대 인공지능학과 맞는 공고가 ${ai.main}건뿐이다`);
  const boot = rows.find((r) => r.unit === "JJU26_BOOTCAMP_AI");
  const robot = new Set(pool.filter((p) => fit.get(p.id)?.has("SPEC_AI_PHYSICAL")).map((p) => p.title));
  if (boot && !boot.top.slice(0, 5).some((x) => robot.has(x.title))) fails.push("AI 부트캠프(피지컬 AI) 위 다섯 건에 로봇 · 자동화 공고가 없다");
  const main = rows.reduce((n, r) => n + r.main, 0), wrong = rows.reduce((n, r) => n + r.wrong, 0);
  console.log(`\n전체: 학과 ${rows.length} · 맞는 공고 ${main} · 무관 ${wrong} (${pct(wrong, main)}) · 맞는 공고 0건인 학과 ${rows.filter((r) => !r.main).length}`);
  if (main && wrong / main > 0.1) fails.push(`전체 무관 비율이 ${pct(wrong, main)} 다(10% 까지)`);
  if (fails.length) { for (const f of fails) console.log(`  걸림  ${f}`); process.exit(1); }
  console.log("  통과");
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
