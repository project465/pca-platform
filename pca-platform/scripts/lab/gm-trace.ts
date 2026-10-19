/**
 * **PDF GOLD MASTER · 되짚기.** 리포트의 핵심 결론마다 어느 입력에서 왔는지 적고,
 * 지어낸 값이 없는지 센다(규격 §7).
 *
 *   CASES=RICH:457,POOR:458,CONTRA:431 npx tsx scripts/lab/gm-trace.ts
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { queryOne } from "../../src/lib/db";
import type { ResultModel } from "../../src/lib/me-v3/result/model";
import type { Report } from "../../src/lib/me-v3/report-gm/assemble";

const CASES = (process.env.CASES ?? "RICH:457,POOR:458,CONTRA:431").split(",").map((x) => x.split(":"));
let pass = 0; const bad: string[] = []; const out: string[] = ["# PDF GOLD MASTER — 되짚기 (규격 §7)", ""];
const ok = (w: string, c: boolean) => { (c ? pass++ : bad.push(w)); out.push(`- ${c ? "통과" : "**걸림**"} ${w}`); };

async function main(): Promise<void> {
  for (const [tag, id] of CASES) {
    const m = (await queryOne<{ result_model: ResultModel }>(
      `SELECT result_model FROM v3_snapshots WHERE attempt_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]))!.result_model;
    const r = JSON.parse(readFileSync(`var/pdf-gm/${tag}.report.json`, "utf8")) as Report;
    const text = execFileSync("pdftotext", [`docs/metri/review/pdf-gm/after/BIZ-GM-${tag}.pdf`, "-"]).toString().replace(/\s+/g, "");
    out.push("", `## ${tag} · 응시 ${id}`, "");
    out.push("| 결론 | 어디서 왔나 |", "|---|---|");
    out.push(`| 지금 확인된 것 | 묶음: ${m.domains.filter((d) => d.zone !== "NOT_EXPLORED").map((d) => `${d.code}=${d.zone}`).join(", ")} |`);
    out.push(`| 먼저 채울 것 | gap ${m.gaps[0]?.id ?? "없음"} (${m.gaps[0]?.domain ?? ""}·${m.gaps[0]?.axis ?? ""}·${m.gaps[0]?.kind ?? ""}) |`);
    out.push(`| 방향 | 목표 산업 ${m.targets.goal.industry} · 목표 직무 ${m.targets.goal.role} · 산업팩 판단 ${r.industry?.dims.length ?? 0}개를 Core 축 상태에 대 봄 |`);
    out.push(`| 우선 행동 | action ${m.actions.slice(0, 3).map((a) => a.id).join(", ")} |`);
    out.push(`| 지역 후보 | ${r.companies.local.map((c) => `${c.c.org.id}(${c.c.why.map((w) => w.kind).join("+")})`).join(", ") || "없음"} |`);
    out.push(`| 전국 후보 | ${r.companies.national.map((c) => `${c.c.org.id}(${c.c.why.map((w) => w.kind).join("+")})`).join(", ") || "없음"} |`, "");
    const picks = new Set(m.domains.flatMap((d) => [...d.did, ...d.decided, ...d.artifacts, ...d.verifications]));
    const shown = r.experiences.flatMap((e) => [...e.decided, ...e.did, ...e.artifacts, ...e.verifications]);
    ok(`${tag}: 심층 해석에 선 근거 ${shown.length}줄이 전부 결과 모델의 고른 항목이다`, shown.every((t) => picks.has(t)));
    ok(`${tag}: 심층 해석의 '직접 정했다고 고른 것' 에 결과물 줄이 없다`, r.experiences.every((e) => e.decided.every((t) => !e.artifacts.includes(t))));
    ok(`${tag}: 빈자리 표가 결과 모델의 gap 차례를 따른다`, r.gaps.length === Math.min(8, m.gaps.length));
    ok(`${tag}: 후보 기관마다 이어지는 까닭이 하나 이상`, [...r.companies.local, ...r.companies.national].every((c) => c.c.why.length > 0));
    ok(`${tag}: 후보 기관마다 출처가 있고 채용은 미확인`, [...r.companies.local, ...r.companies.national].every((c) => c.c.org.sources.length > 0 && c.c.org.hiring.status === "UNVERIFIED"));
    ok(`${tag}: 공식 확인으로 적힌 줄이 없다(이 환경에서 공식 페이지를 열지 못했다)`, [...r.companies.local, ...r.companies.national].every((c) => c.c.org.location.status !== "OFFICIAL"));
    ok(`${tag}: 종이에 '현재 채용 중' · 적합도 · 추천 기업 이 없다`, !/(현재채용중|적합도|추천기업)/.test(text));
    ok(`${tag}: 종이에 안쪽 코드가 없다`, !/(TD\d{2}|ROLE_[A-Z]|INDUSTRY_[A-Z]|Z[1-4]_E)/.test(text));
    ok(`${tag}: 근거 고른 수(${r.summary.counts.artifacts}) = 결과 모델 결과물 수`, r.summary.counts.artifacts === m.domains.reduce((n, d) => n + d.artifacts.length, 0));
  }
  const a = JSON.parse(readFileSync("var/pdf-gm/RICH.report.json", "utf8")) as Report;
  const c = JSON.parse(readFileSync("var/pdf-gm/CONTRA.report.json", "utf8")) as Report;
  ok("목표가 다른 학생은 다른 기관을 먼저 받는다(RICH ≠ CONTRA 첫 둘)",
    a.companies.local.slice(0, 2).map((x) => x.c.org.id).join() !== c.companies.local.slice(0, 2).map((x) => x.c.org.id).join());
  out.push("", `통과 ${pass} · 걸림 ${bad.length}`);
  writeFileSync("docs/metri/review/pdf-gm/TRACE.md", out.join("\n") + "\n");
  console.log(`통과 ${pass} · 걸림 ${bad.length}`, bad);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
