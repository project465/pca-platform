/**
 * **PDF GOLD MASTER 4차 · 실행 전략 사슬 전수 점검.** 사례마다 실행 전략의 행을 사슬
 * (`학생 목표 → 실제 응답 → 확인된 근거 → 직무 요구 → 실행 과제 → 산출물`)로 찍고, 세 가지를 센다.
 *
 * ① 행의 영역이 목표 직무의 업무 영역이거나(`core_ref.td`), 직무 공통 역량(`SHARED`)이며 연결 이유가 적혀 있는가
 * ② 다른 직무에만 쓰는 말이 행의 문장에 섞이지 않았는가. 그 직무가 목표이거나, 행의 영역이 목표 직무의 업무
 *    영역이면서 그 직무의 중심 영역이면 허용한다(마케팅 목표의 마케팅·시장 행에 ‘캠페인’)
 * ③ 종합 의견 · 실행 계획 30·60일 · 마지막 할 일 · 면접 질문 · 90일 프로젝트가 전략 행(또는 목표 직무)에서 왔는가
 *
 * 그리고 렌더한 리포트 전체의 글자에서 학생 문장에 쓰지 않기로 한 말(Human Review 지시 2)을 센다.
 *
 *   CASES=RICH:1,POOR:2,CONTRA:3 npx tsx scripts/lab/gm-linkage.ts
 *     → docs/metri/review/pdf-gm/v4-sample/LINKAGE_AUDIT.md (걸린 줄이 있으면 1 로 끝난다)
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load3 } from "./gm-report3";
import { render3 } from "../../src/lib/me-v3/report-gm/render3";
import { rolePacks } from "../../src/lib/me-v3/report-gm/profile";
import { roleGuide } from "../../src/lib/me-v3/report-gm/guide";
import type { Report3 } from "../../src/lib/me-v3/report-gm/report3";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":"));
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/v4-sample";

/** 그 직무에만 쓰는 말(지시 4-1). 목표 직무가 아니면 행의 문장에 서지 않는다 */
const ROLE_WORDS: Record<string, string[]> = {
  ROLE_MKT_V1: ["캠페인", "채널", "홍보"],
  ROLE_CS_V1: ["응대", "민원"],
  ROLE_SALES_V1: ["제안서", "견적", "수주"],
  ROLE_HR_V1: ["채용", "면접관", "평가표"],
  ROLE_FINACC_V1: ["결산", "원가", "증빙"],
  ROLE_PLAN_V1: ["사업계획", "기획안"],
};
/** 학생 문장에 쓰지 않기로 한 말(지시 2)과, 같은 결의 측정 쪽 말 */
export const BANNED = [
  "기준을 두는지", "그 판단을 받치는", "목표 직무와의 거리", "가장 단단하게 확인된 부분",
  "다음 과제에서 내가 정한 것으로 만들어 보면", "‘내가 정한 것’으로 만들어 보면", "이 직무가 반드시 보는 판단",
  "판단 문항", "근거 항목", "단계로 답", "받치는", "단단하",
];

type Row = Report3["priorities"][number];
const esc = (s: string) => s.replace(/\|/g, "\\|");

function audit(tag: string, r: Report3) {
  const roles = rolePacks(r.core);
  const goal = roles.find((x) => x.code === r.strategy.roleCode);
  const tds = goal?.core_ref?.td ?? [];
  const fails: string[] = [];
  const lines: string[] = [];
  lines.push(`## ${tag} · 목표 직무 ${r.strategy.roleName} (업무 영역 ${tds.join(" · ")} · 핵심 판단 ${(goal?.required_axes ?? []).join(" · ")})`, "");
  lines.push("| # | 관계 | 영역 | 실제 응답 | 확인된 근거 | 직무 요구 | 실행 과제 | 산출물 | ① | ② |", "|---|---|---|---|---|---|---|---|---|---|");
  for (const x of r.priorities) {
    const inRole = tds.includes(x.code);
    const ok1 = (inRole && x.relation !== "SHARED") || (x.relation === "SHARED" && x.link.length > 10);
    const text = [x.title, x.task, x.todo, x.how, x.output, x.check, x.ask ?? ""].join(" ");
    const hits: string[] = [];
    for (const [code, words] of Object.entries(ROLE_WORDS)) {
      if (code === r.strategy.roleCode) continue;
      const center = roles.find((y) => y.code === code)?.core_ref?.td?.[0];
      if (inRole && x.relation !== "SHARED" && center === x.code) continue;
      for (const w of words) if (text.includes(w)) hits.push(w);
    }
    if (!ok1) fails.push(`${tag} ${x.order}: 영역 ${x.domain} 이 목표 직무 영역이 아니고 연결 이유도 없다`);
    if (hits.length) fails.push(`${tag} ${x.order}: 다른 직무의 말 ${hits.join(", ")}`);
    lines.push(`| ${x.order} | ${x.relationTag} | ${esc(x.domain)} | ${esc(x.chain.result.replace(`${x.domain} · `, ""))} | ${esc(x.chain.evidence)} | ${esc(x.chain.requirement)} | ${esc(x.todo)} | ${esc(x.output)} | ${ok1 ? "○" : "✕"} | ${hits.length ? "✕ " + hits.join(",") : "○"} |`);
  }
  lines.push("", "연결 이유(행마다 `link`):", "");
  for (const x of r.priorities) lines.push(`${x.order}. **${x.title}** — ${x.link}`);
  if (r.strategy.outside.length) {
    lines.push("", "이번 전략에서 뺀 빈자리(`outside`, 목표 직무의 업무 영역이 아님):", "");
    for (const o of r.strategy.outside) lines.push(`- ${o.domain} · ${o.what} (이 영역을 쓰는 직무: ${o.jobs.join(" · ") || "—"})`);
  }
  /* ③ 다른 장이 전략 행에서 왔는가 */
  const todos = new Set(r.priorities.map((x: Row) => x.todo));
  const checks: [string, boolean][] = [];
  const first = r.summary.points.find((p) => p.label === "먼저 채울 부분");
  if (r.priorities[0]) {
    checks.push(["종합 의견 ‘먼저 채울 부분’ = 전략 1행", !!first && first.fact === r.priorities[0].fact && first.action.startsWith(r.priorities[0].how)]);
    checks.push(["실행 계획 30일 첫 줄 = 전략 1행", r.plan.find((p) => p.period === "30일")?.what === r.priorities[0].todo]);
    checks.push(["마지막 할 일 첫 줄 = 전략 1행", r.final[0]?.text === r.priorities[0].todo]);
    checks.push(["한눈에 보기 ‘먼저 할 일’ = 전략 1행", r.summary.glance.some((g) => g.value === `${r.priorities[0].domain} · ${r.priorities[0].title}`)]);
  }
  if (r.priorities[1]) checks.push(["실행 계획 60일 과제 = 전략 2행", r.plan.some((p) => p.period === "60일" && p.what === r.priorities[1].todo)]);
  for (const p of r.plan.filter((x) => x.period === "30일" || x.period === "60일")) {
    if (/경험 기록|공식 홈페이지/.test(p.what)) continue;
    checks.push([`실행 계획 ${p.period} ‘${p.what.slice(0, 18)}…’ 은 전략 행`, todos.has(p.what)]);
  }
  const p90 = r.plan.find((p) => p.period === "90일" && p.what.startsWith("실무형 프로젝트"));
  const goalProj = r.companies.flatMap((c) => c.jobs).find((jb) => jb.role === r.strategy.roleCode)?.project.title
    ?? (r.strategy.roleCode ? roleGuide(r.strategy.roleCode)?.firstProject.title : undefined);
  checks.push(["90일 프로젝트 = 목표 직무의 일", !!p90 && !!goalProj && p90.what.includes(goalProj)]);
  const asks = r.priorities.slice(0, 2).map((x) => x.ask).filter(Boolean) as string[];
  checks.push(["면접 준비 질문(빈자리) = 목표 직무 문항", asks.every((a) => r.application.interview.some((q) => q.q === `“${a}”`))]);
  for (const c of r.companies) if (c.jobs.some((jb) => jb.role === r.strategy.roleCode)) checks.push([`기업 심층 ${c.name}: 목표 직무가 첫 직무`, c.jobs[0].role === r.strategy.roleCode]);
  lines.push("", "③ 다른 장이 전략 행에서 왔는가:", "");
  for (const [k, v] of checks) { lines.push(`- ${v ? "○" : "✕"} ${k}`); if (!v) fails.push(`${tag}: ${k}`); }
  /* 렌더한 글자 전체에서 쓰지 않기로 한 말 */
  const flat = render3(r, { fontsHref: "fonts/pretendard" }).replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
  const banned: string[] = [];
  for (const b of BANNED) { let k = flat.indexOf(b); while (k >= 0) { banned.push(`‘${b}’ … ${flat.slice(Math.max(0, k - 24), k + b.length + 24)}`); k = flat.indexOf(b, k + 1); } }
  lines.push("", `쓰지 않기로 한 말: ${banned.length ? `${banned.length}곳` : "0곳"}`, "");
  for (const b of banned) { lines.push(`- ✕ ${b}`); fails.push(`${tag}: ${b}`); }
  return { lines, fails };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const all: string[] = [], fails: string[] = [];
  for (const [tag, id] of CASES) {
    const r = await load3(id);
    const a = audit(`${tag}(응시 ${id})`, r);
    all.push(...a.lines, ""); fails.push(...a.fails);
  }
  const head = [
    "# 실행 전략 사슬 전수 점검 (BIZ PDF GOLD MASTER v4)", "",
    "`scripts/lab/gm-linkage.ts` 가 뽑았다. 손으로 고친 줄은 없다.", "",
    "- ① 영역이 목표 직무의 업무 영역이거나 직무 공통 역량이며 연결 이유가 있는가",
    "- ② 다른 직무에만 쓰는 말(마케팅 `캠페인·채널·홍보` · 고객운영 `응대·민원` · 영업 `제안서·견적·수주` · 인사 `채용·면접관·평가표` · 재무 `결산·원가·증빙` · 기획 `사업계획·기획안`)이 섞이지 않았는가. 목표 직무의 업무 영역이 그 직무의 중심 영역이면 허용",
    "- ③ 종합 의견 · 실행 계획 · 마지막 할 일 · 면접 질문 · 90일 프로젝트가 전략 행(또는 목표 직무)에서 왔는가",
    "- 렌더한 리포트 전체 글자에서 쓰지 않기로 한 말(지시 2)과 같은 결의 측정 쪽 말", "",
    `**결과: ${fails.length ? `걸린 줄 ${fails.length}` : "걸린 줄 없음"}**`, "",
    "사례는 새 컨테이너의 빈 DB 에서 `scripts/lab/gm-cases2.ts` 로 다시 굳힌 응시다(v3 의 462 · 463 · 464 와 같은 규칙, 응시 번호만 다르다).", "",
  ];
  writeFileSync(path.join(OUT, "LINKAGE_AUDIT.md"), [...head, ...all].join("\n"));
  console.log(fails.length ? fails.join("\n") : "걸린 줄 없음");
  console.log(`→ ${path.join(OUT, "LINKAGE_AUDIT.md")}`);
  process.exit(fails.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
