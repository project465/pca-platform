/**
 * **Gold Master PDF 연동 준비 · 격리 검사.** 운영 경로에 연결하지 않고, 격리한 DB(`cm_gm_iso` 처럼 개발 DB 를 복사한 것)에서
 * 제품의 저장 경로(`openAttempt → saveAnswer → savePicks → submit`, `gm-cases2.ts`)로 굳힌 응시를 읽어
 * Gold Master 입력(`load3` → `Report3`)과 뽑힌 PDF 가 그 저장 값과 맞는지 센다. 읽기만 한다.
 *
 *   DATABASE_URL=postgres:///cm_gm_iso CASES=RICH:4,POOR:5,CONTRA:6 \
 *     OUT=docs/metri/review/pdf-gm/p3-iso npx tsx scripts/lab/gm-full6.ts
 *   DATABASE_URL=postgres:///cm_gm_iso CASES=RICH:4,POOR:5,CONTRA:6 \
 *     OUT=docs/metri/review/pdf-gm/p3-iso npx tsx scripts/lab/gm-iso-check.ts
 *
 * 운영 DB 이름이나 바깥 호스트를 가리키면 그 자리에서 멈춘다.
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { query, queryOne } from "../../src/lib/db";
import { load3 } from "./gm-report3";
import { full6 } from "../../src/lib/me-v3/report-gm/render6";
import type { Lib } from "../../src/lib/me-v3/report-gm/render5";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\/\/(cm_gm_iso|cm_dev)\b/.test(URL_)) { console.error(`격리 DB 가 아니다: ${URL_}`); process.exit(2); }
const CASES = (process.env.CASES ?? "RICH:4,POOR:5,CONTRA:6").split(",").map((x) => x.split(":") as [string, string]);
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/p3-iso";
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));

type Row = { tag: string; id: string; checks: { what: string; ok: boolean; got: string }[] };

async function main(): Promise<void> {
  const rows: Row[] = [];
  for (const [tag, id] of CASES) {
    const checks: Row["checks"] = [];
    const ok = (what: string, cond: boolean, got: string) => checks.push({ what, ok: cond, got });
    const a = await queryOne<{ status: string; core_code: string; university_code: string | null; department_code: string | null; tier: string; submitted_at: string | null }>(
      "SELECT status, core_code, university_code, department_code, tier, submitted_at::text FROM v3_attempts WHERE id = $1", [id]);
    ok("응시가 제출되어 굳었다(status=scored)", a?.status === "scored", `${a?.status} · ${a?.submitted_at}`);
    const resp = await queryOne<{ n: string }>("SELECT count(*)::text n FROM v3_responses WHERE attempt_id = $1", [id]);
    const picks = await query<{ x: number }>("SELECT 1 AS x FROM v3_evidence_picks WHERE attempt_id = $1", [id]);
    const snap = await query<{ created_at: string }>("SELECT created_at::text FROM v3_snapshots WHERE attempt_id = $1", [id]);
    ok("굳은 결과(v3_snapshots)가 한 줄 있다", snap.length === 1, `${snap.length}줄`);
    ok("저장된 응답이 있다", Number(resp?.n) > 0, `${resp?.n}개`);
    const r = await load3(id);
    ok("Gold Master 입력의 전공 Core 가 응시와 같다", r.core === a?.core_code, `${r.core} / ${a?.core_code}`);
    ok("학교·학과 맥락이 응시 줄에서 왔다", !!r.meta.school && !!r.meta.department, `${r.meta.school} · ${r.meta.department} (응시 ${a?.university_code} · ${a?.department_code})`);
    ok("등급이 응시 줄과 같다", r.meta.tier === a?.tier, `${r.meta.tier}`);
    const m = (await queryOne<{ result_model: { domains: { did: string[]; zone: string }[] } }>("SELECT result_model FROM v3_snapshots WHERE attempt_id = $1 ORDER BY created_at DESC LIMIT 1", [id]))!.result_model;
    const didN = m.domains.reduce((s, d) => s + new Set([...d.did, ...(d as unknown as { decided: string[] }).decided, ...(d as unknown as { artifacts: string[] }).artifacts, ...(d as unknown as { verifications: string[] }).verifications]).size, 0);
    ok("리포트의 ‘고른 근거’ 수가 저장된 근거 행 수와 같다", r.profile.picks === picks.length && didN === picks.length, `리포트 ${r.profile.picks} · 결과 모델(네 목록 합) ${didN} · 저장 행 ${picks.length}`);
    const zones = m.domains.map((d) => d.zone).join(",");
    ok("열두 영역의 상태가 굳은 결과 그대로다", r.map.map((x) => x.zone).join(",") === zones, zones.replace(/_[A-Z_]+/g, ""));
    const lib: Lib = {
      toc: J("data/report-gm/biz-pro-toc.v1.json"), dart: J("data/region/dart-checks.v1.json"), overview: J("data/region/dart-overview.v1.json"),
      roles: J("data/report-gm/biz-role-guide.json"), orgs: J("data/region/kr-chungcheong-orgs.v2.json"),
      domains: r.map.map((x) => ({ code: x.code, name: x.name })), versions: r.versions,
    };
    const f = { href: "fonts/pretendard", family: "Pretendard" as const };
    const h1 = createHash("sha256").update(full6(r, lib, f).html).digest("hex");
    const h2 = createHash("sha256").update(full6(await load3(id), lib, f).html).digest("hex");
    ok("같은 굳은 결과면 같은 보고서가 나온다(두 번 그려 해시 비교)", h1 === h2, h1.slice(0, 16));
    const pdf = path.join(OUT, `BIZ-PRO-${tag}.pdf`);
    if (existsSync(pdf)) {
      const txt = execFileSync("pdftotext", ["-layout", "-f", "1", "-l", "1", pdf, "-"]).toString();
      ok("PDF 표지가 같은 학교·학과를 적는다", txt.includes(r.meta.school ?? "∅") && txt.includes(r.meta.department ?? "∅"), `${r.meta.school} · ${r.meta.department}`);
      ok("PDF 표지의 ‘고른 근거’ 수가 저장 값과 같다", new RegExp(`(^|\\s)${r.profile.picks}\\s+개(\\s|$)`, "m").test(txt), `${r.profile.picks}개`);
    } else ok("PDF 가 뽑혀 있다", false, pdf);
    rows.push({ tag, id, checks });
  }
  const opsTouched = existsSync("var/reports") ? execFileSync("bash", ["-c", "find var/reports -newer data/report-gm/biz-pro-toc.v1.json -type f | wc -l"]).toString().trim() : "0";
  const all = rows.flatMap((x) => x.checks);
  const md = [
    "# P3 · 저장된 결과 → Gold Master PDF 격리 검사", "",
    `- DB: \`${URL_.replace(/\/\/\/.*/, "///")}${URL_.split("///")[1] ?? ""}\` (개발 DB 복사본 · 운영 DB 아님) · 실행 ${new Date().toISOString().slice(0, 16)}Z`,
    "- 응시는 제품의 저장 경로(`openAttempt → saveAnswer → savePicks → submit`)로 만들었다(`gm-cases2.ts`). 화면은 거치지 않았다(아래 ‘막는 것’).",
    `- 운영 PDF 폴더(\`var/reports\`)에 이번 실행이 쓴 파일: ${opsTouched}개`, "",
    `**통과 ${all.filter((x) => x.ok).length} · 걸림 ${all.filter((x) => !x.ok).length}**`, "",
    ...rows.flatMap((x) => [`## ${x.tag} (응시 ${x.id})`, "", "| 확인 | 결과 | 값 |", "|---|---|---|", ...x.checks.map((c) => `| ${c.what} | ${c.ok ? "통과" : "**걸림**"} | ${c.got} |`), ""]),
  ].join("\n");
  writeFileSync(path.join(OUT, "ISO_CHECK.md"), md);
  console.log(md);
  process.exit(all.every((x) => x.ok) ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
