/**
 * **Track E · PDF 연동 검사.** 제품의 저장 경로로 응시를 굳히고
 * (`openAttempt → saveAnswer → savePicks → submit`), 그 학생의 Gold Master PDF
 * 를 `gm-student.ts` 로 뽑아 넷을 센다: 권한 · 경험 기록 고정 · 재현성 · 실패 복구.
 *
 *   DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' \
 *     OUT=docs/metri/review/tracks/E npx tsx scripts/lab/trackE-check.ts
 *
 * 운영 PDF 폴더(`var/reports`)를 쓰지 않는다는 것도 센다. 로컬 개발 DB 에서만 돈다.
 */
import { loadEnv, makeStudent, registerCampusStudent } from "../_loop-fixture";
loadEnv();
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { query, queryOne } from "../../src/lib/db";
import * as S from "../../src/lib/me-v3/runtime/session";
import { addExperience } from "../../src/lib/me-v3/platform";
import { campusStudentContext } from "../../src/lib/campus/students";
import { inputFile } from "../../src/lib/me-v3/report-gm/inputs";
import { generate, requesterOf } from "./gm-student";
import { answerAll, PEOPLE } from "../_v3-answer";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\/\/(cm_dev|cm_gm_iso)\b/.test(URL_)) { console.error(`로컬 개발 DB 가 아니다: ${URL_}`); process.exit(2); }
const OUT = process.env.OUT ?? "docs/metri/review/tracks/E";
const rows: string[] = []; let pass = 0; const bad: string[] = [];
const ok = (what: string, cond: boolean, got = ""): void => {
  rows.push(`| ${cond ? "PASS" : "**FAIL**"} | ${what} | ${got.replace(/\|/g, "/")} |`);
  if (cond) pass++; else bad.push(what);
  console.log(`  ${cond ? "통과" : "걸림"}  ${what}${got ? " — " + got : ""}`);
};
const head = (t: string): void => { rows.push(`| | **${t}** | |`); console.log(`\n── ${t}`); };
const reportsCount = (): number => existsSync("var/reports")
  ? Number(execFileSync("bash", ["-c", "find var/reports -type f | wc -l"]).toString().trim()) : 0;

async function main(): Promise<void> {
  const reports0 = reportsCount();
  const LEAF = "PCU26_BIZ";

  head("준비: 제품 저장 경로로 굳힌 응시 하나");
  const st = await makeStudent("zzte-student");
  await query(`UPDATE users SET is_demo = FALSE WHERE id = $1`, [st.id]);
  await registerCampusStudent(st.id, "PCU", LEAF);
  const ctx = (await campusStudentContext(st.id))!.ctx;
  /* 응시를 먼저 연다: 경험 기록은 그 사람의 전공(응시의 Core)으로 적힌다 */
  const a0 = await S.openAttempt({ userId: st.id, tier: "PRO", stage: "bachelor", gradField: null, campus: ctx });
  const e1 = await addExperience(st.id, { kind: "course", title: "검사 전에 적은 경험 하나", td_codes: ["TD01"], decisions: ["이번에 다룰 것과 다루지 않을 것을 갈라 적었다"] });
  const e2 = await addExperience(st.id, { kind: "project", title: "검사 전에 적고 뒤에 고친 경험", td_codes: ["TD08"] });
  await answerAll(a0.core_code, a0, st.id, PEOPLE[2]);
  await S.submit((await S.attemptOf(a0.id, st.id))!);
  const id = a0.id;
  await new Promise((r) => setTimeout(r, 50));
  const e3 = await addExperience(st.id, { kind: "assignment", title: "검사 뒤에 더한 경험", td_codes: ["TD02"] });
  await query(`UPDATE v3_experiences SET title = title || ' (고침)', updated_at = now() WHERE id = $1`, [e2]);
  ok("응시가 굳었다", (await S.attemptOf(id, st.id))?.status === "scored", `응시 ${id} · ${a0.core_code}`);
  try { execFileSync("rm", ["-f", inputFile(id)]); } catch { /* 없다 */ }

  head("E1 본인이 뽑는다 · 경험 기록은 응시 시점 기준");
  const me = await requesterOf(st.id);
  const g1 = await generate(id, me);
  ok("본인 요청으로 PDF 가 나온다", g1.ok, g1.ok ? `${g1.manifest.pages}쪽` : `${g1.step}: ${g1.reason}`);
  if (!g1.ok) throw new Error("첫 생성이 실패해 나머지를 볼 수 없다");
  const m1 = g1.manifest as { experiences_used: number; experiences_excluded: { id: string; why: string }[]; html_sha256: string; input_reused: boolean; input_sha256: string };
  ok("검사 전에 적고 그대로인 기록만 들어간다", m1.experiences_used === 1, `쓴 기록 ${m1.experiences_used}`);
  ok("검사 뒤에 더한 기록은 넣지 않는다", m1.experiences_excluded.some((x) => x.id === e3 && x.why === "created_after"));
  ok("검사 뒤에 고친 기록은 넣지 않는다", m1.experiences_excluded.some((x) => x.id === e2 && x.why === "edited_after"));
  const txt = execFileSync("pdftotext", ["-layout", "-f", "1", "-l", "1", g1.pdf, "-"]).toString();
  ok("PDF 표지에 학교와 학과가 적힌다", txt.includes("배재대학교") && /경영/.test(txt));

  head("E2 재현성 · 기록을 지워도 같은 PDF");
  const g2 = await generate(id, me);
  const m2 = (g2.ok ? g2.manifest : {}) as typeof m1;
  ok("두 번째는 굳혀 둔 입력을 다시 쓴다", g2.ok && m2.input_reused === true);
  ok("같은 입력이면 같은 HTML 이다", g2.ok && m2.html_sha256 === m1.html_sha256, String(m1.html_sha256).slice(0, 16));
  await query(`DELETE FROM v3_experiences WHERE id = $1`, [e1]);
  const g3 = await generate(id, me);
  const m3 = (g3.ok ? g3.manifest : {}) as typeof m1;
  ok("학생이 기록을 지운 뒤에도 같은 HTML 이 나온다", g3.ok && m3.html_sha256 === m1.html_sha256 && m3.input_sha256 === m1.input_sha256);

  head("E3 다운로드 권한");
  const other = await makeStudent("zzte-other");
  const r1 = await generate(id, await requesterOf(other.id));
  ok("다른 학생은 받지 못한다", !r1.ok && r1.step === "permission", !r1.ok ? r1.reason : "");
  const pcu = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code='PCU'`);
  const adm = await makeStudent("zzte-pcu-admin");
  await query(`DELETE FROM memberships WHERE user_id=$1`, [adm.id]);
  if (pcu) await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'org_admin')`, [adm.id, pcu.id]);
  const r2 = await generate(id, await requesterOf(adm.id));
  ok("같은 학교 담당자도 기본으로 받지 못한다(계약·동의 칸이 없다)", !r2.ok && r2.step === "permission" && /계약/.test(r2.reason), !r2.ok ? r2.reason : "");
  const zz = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code='ZZTEST'`);
  const zadm = await makeStudent("zzte-zz-admin");
  await query(`DELETE FROM memberships WHERE user_id=$1`, [zadm.id]);
  if (zz) await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'org_admin')`, [zadm.id, zz.id]);
  const r3 = await generate(id, await requesterOf(zadm.id));
  ok("다른 학교 담당자는 받지 못한다", !r3.ok && r3.step === "permission", !r3.ok ? r3.reason : "");

  head("E4 실패 복구");
  process.env.GM_CHROMIUM = "/nonexistent/chromium";
  const bad1 = await generate(id, me);
  delete process.env.GM_CHROMIUM;
  const dir = path.dirname(g1.pdf);
  ok("브라우저가 뜨지 않으면 걸음과 까닭을 남긴다", !bad1.ok && bad1.step === "print" && existsSync(path.join(dir, "FAIL.json")), !bad1.ok ? bad1.reason.slice(0, 80) : "");
  ok("덜 만든 파일을 남기지 않는다", !existsSync(path.join(dir, "BIZ-PRO.pdf.part")));
  ok("앞서 만든 PDF 는 그대로 남는다", existsSync(g1.pdf));
  const good = await generate(id, me);
  ok("다시 하면 성공하고 실패 기록을 치운다", good.ok && !existsSync(path.join(dir, "FAIL.json")));
  const f = inputFile(id);
  const kept = JSON.parse(readFileSync(f, "utf8")); kept.experiences = []; writeFileSync(f, JSON.stringify(kept));
  const g5 = await generate(id, me);
  ok("굳혀 둔 입력 파일이 고쳐졌으면 쓰지 않고 다시 모은다", g5.ok && (g5.manifest as { input_reused: boolean }).input_reused === false);

  head("E5 운영 PDF 경로");
  ok("운영 PDF 폴더(var/reports)에 쓴 파일이 없다", reportsCount() === reports0, `${reports0} → ${reportsCount()}`);

  /* 치운다 */
  for (const u of [st.id, other.id, adm.id, zadm.id]) {
    for (const t of ["v3_experiences", "v3_attempts", "memberships", "campus_students"]) await query(`DELETE FROM ${t} WHERE user_id=$1`, [u]).catch(() => undefined);
  }

  const total = pass + bad.length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "PDF_INTEGRATION.md"), [
    "# Track E · Gold Master PDF 연동 검사", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · DB \`${URL_}\` (로컬 개발 DB · 운영 아님)`,
    "- 응시는 제품의 저장 경로로 굳혔다. PDF 는 `scripts/lab/gm-student.ts` → `var/gm-out/<응시>/` (운영 경로 아님).",
    "- 경험 기록 고정: `src/lib/me-v3/report-gm/inputs.ts` (공통 DB 변경 없음 · Core 요청 1 의 임시 해법).", "",
    `**통과 ${pass} · 걸림 ${bad.length} / ${total}**`, "",
    "| 판정 | 확인 | 값 |", "|---|---|---|", ...rows, "",
  ].join("\n"));
  console.log(`\n확인 ${total}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
