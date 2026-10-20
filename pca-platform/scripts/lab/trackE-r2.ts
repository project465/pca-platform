/**
 * **Track E 2차 · 입력 고정 정책 · 파기 · 파일 접근 · 패키징.**
 *
 * 1차(`trackE-check.ts`)는 생성 · 권한 · 재현성 · 실패 복구를 셌다. 이번에는
 * PM 이 짚은 넷을 센다:
 *
 *   P1 제출 시점 스냅샷과 GM 입력 고정 기준 시각이 같은 값인가
 *   P2 등급을 올려 다시 굳으면 입력도 새 기준으로 다시 고정되는가(옛 파일을 쓰지 않는다)
 *   P3 파기: 응시 하나 · 사람 하나의 입력 파일과 PDF 를 지운다 · 운영 PDF 폴더는 건드리지 않는다
 *   P4 파일 접근: 화면 · 라우트 · public 어디에서도 GM 파일에 닿는 길이 없다 · 경로 넘기기 막힘
 *   P5 패키징: 운영 이미지의 마지막 단계가 GM 실행 파일을 담는가(정적 · 고치지 않는다)
 *
 *   PGPORT=5433 DATABASE_URL=postgres:///cm_iso_c V3_PREVIEW_OPEN='*' \
 *     GM_INPUT_DIR=var/gm-r2/inputs GM_OUT=var/gm-r2/out \
 *     OUT=docs/metri/review/tracks-r2/E npx tsx scripts/lab/trackE-r2.ts
 */
import { loadEnv, makeStudent, registerCampusStudent } from "../_loop-fixture";
loadEnv();
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { query, queryOne } from "../../src/lib/db";
import * as S from "../../src/lib/me-v3/runtime/session";
import { addExperience } from "../../src/lib/me-v3/platform";
import { campusStudentContext } from "../../src/lib/campus/students";
import { collectInput, frozenInput, gmOutDir, inputFile, purgeGm, purgeGmForUser } from "../../src/lib/me-v3/report-gm/inputs";
import { generate, requesterOf } from "./gm-student";
import { answerAll, PEOPLE } from "../_v3-answer";

const URL_ = process.env.DATABASE_URL ?? "";
if (process.env.PGPORT !== "5433" || !/^postgres(ql)?:\/\/\/cm_iso_c\b/.test(URL_)) {
  console.error(`격리 클러스터(5433 · cm_iso_c)가 아니다: ${URL_}`); process.exit(2);
}
if (!process.env.GM_INPUT_DIR || !process.env.GM_OUT) { console.error("GM_INPUT_DIR · GM_OUT 를 따로 둔다(1차 파일과 섞지 않는다)"); process.exit(2); }
const OUT = process.env.OUT ?? "docs/metri/review/tracks-r2/E";
const rows: string[] = []; let pass = 0; const bad: string[] = [];
const ok = (what: string, cond: boolean, got = ""): void => {
  rows.push(`| ${cond ? "PASS" : "**FAIL**"} | ${what} | ${got.replace(/\|/g, "/")} |`);
  if (cond) pass++; else bad.push(what);
  console.log(`  ${cond ? "통과" : "걸림"}  ${what}${got ? " — " + got : ""}`);
};
const head = (t: string): void => { rows.push(`| | **${t}** | |`); console.log(`\n── ${t}`); };
const count = (d: string): number => (existsSync(d) ? Number(execFileSync("bash", ["-c", `find '${d}' -type f | wc -l`]).toString().trim()) : 0);
const throws = (f: () => unknown): boolean => { try { f(); return false; } catch { return true; } };

async function main(): Promise<void> {
  const reports0 = count("var/reports");

  head("준비");
  const st = await makeStudent("zzte2-student");
  await query(`UPDATE users SET is_demo=FALSE WHERE id=$1`, [st.id]);
  await registerCampusStudent(st.id, "PCU", "PCU26_BIZ");
  const ctx = (await campusStudentContext(st.id))!.ctx;
  const a = await S.openAttempt({ userId: st.id, tier: "PRO", stage: "bachelor", gradField: null, campus: ctx });
  await addExperience(st.id, { kind: "course", title: "검사 전에 적은 경험", td_codes: ["TD01"], decisions: ["다룰 것과 다루지 않을 것을 갈라 적었다"], note_text: "자유입력 한 줄(파일에 남으면 안 된다)" } as never);
  await answerAll(a.core_code, a, st.id, PEOPLE[2]);
  await S.submit((await S.attemptOf(a.id, st.id))!);
  ok("응시가 굳었다", (await S.attemptOf(a.id, st.id))?.status === "scored", `응시 ${a.id}`);

  head("P1 제출 시점과 입력 고정 기준 시각");
  const t = await queryOne<{ sub: string; snap: string; n: string }>(
    `SELECT to_char(a.submitted_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') sub,
            to_char(max(s.created_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') snap, count(s.id)::text n
       FROM v3_attempts a JOIN v3_snapshots s ON s.attempt_id=a.id WHERE a.id=$1 GROUP BY a.submitted_at`, [a.id]);
  const f1 = await frozenInput(a.id);
  ok("스냅샷이 한 줄이다", t?.n === "1");
  ok("제출 시각 = 스냅샷 시각 = GM 기준 시각", !!t && t.sub === t.snap && f1.input.frozen_at === t.snap, `${t?.sub} · ${f1.input.frozen_at}`);
  await new Promise((r) => setTimeout(r, 30));
  const late = await addExperience(st.id, { kind: "assignment", title: "제출 뒤에 더한 경험", td_codes: ["TD02"] });
  const f1b = await frozenInput(a.id);
  ok("제출 뒤에 더한 기록은 굳힌 입력에 들어가지 않는다", f1b.reused && !f1b.input.experiences.some((e) => e.id === late));
  const raw = readFileSync(inputFile(a.id), "utf8");
  const dbNote = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_experiences WHERE user_id=$1 AND note_text LIKE '자유입력%'`, [st.id]);
  ok("(전제) DB 에는 그 자유입력이 적혀 있다", dbNote?.n === "1", dbNote?.n);
  ok("굳힌 입력에 자유입력 한 줄(note_text)이 없다 · 판본 gm-input.2", !/note_text/.test(raw) && f1.input.version === "gm-input.2", f1.input.version);

  head("P2 등급을 올려 다시 굳으면 입력도 새 기준으로");
  const b = await makeStudent("zzte2-upgrade");
  await query(`UPDATE users SET is_demo=FALSE WHERE id=$1`, [b.id]);
  const ab = await S.openAttempt({ userId: b.id, tier: "BASIC", stage: "bachelor", gradField: null, core: "BIZ_CORE_V1" });
  await answerAll(ab.core_code, ab, b.id, PEOPLE[1]);
  await S.submit((await S.attemptOf(ab.id, b.id))!);
  const g1 = await frozenInput(ab.id);
  await new Promise((r) => setTimeout(r, 30));
  const between = await addExperience(b.id, { kind: "project", title: "BASIC 제출과 STANDARD 제출 사이에 적은 경험", td_codes: ["TD01"] });
  await S.upgradeTier(ab.id, b.id, "STANDARD");
  const up = (await S.attemptOf(ab.id, b.id))!;
  await answerAll(up.core_code, up, b.id, PEOPLE[1]);
  await S.submit((await S.attemptOf(ab.id, b.id))!);
  const g2 = await frozenInput(ab.id);
  ok("다시 굳은 뒤에는 옛 입력 파일을 쓰지 않는다", g2.reused === false && g2.input.frozen_at > g1.input.frozen_at, `${g1.input.frozen_at} → ${g2.input.frozen_at}`);
  ok("새 기준 시각 앞에 적은 기록은 새 입력에 들어간다", g2.input.experiences.some((e) => e.id === between) && !g1.input.experiences.some((e) => e.id === between));
  ok("등급이 새 입력에 적힌다", g2.input.tier === "STANDARD", g2.input.tier);

  head("P3 파기");
  const me = await requesterOf(st.id);
  const gen = await generate(a.id, me);
  ok("지울 파일이 실제로 있다(입력 · PDF)", gen.ok && existsSync(inputFile(a.id)) && existsSync(path.join(gmOutDir(), a.id)), gen.ok ? gen.pdf : `${gen.step}: ${gen.reason}`);
  const p1 = purgeGm(a.id);
  ok("응시 하나를 지우면 입력과 PDF 폴더가 사라진다", p1.input && p1.output && !existsSync(inputFile(a.id)) && !existsSync(path.join(gmOutDir(), a.id)));
  const p1b = purgeGm(a.id);
  ok("다시 불러도 오류 없이 지울 것이 없다고 답한다", !p1b.input && !p1b.output);
  ok("응시 번호 꼴이 아니면 지우지 않는다(경로 넘기기)", throws(() => purgeGm("../gm-inputs")) && throws(() => purgeGm("1/../2")) && throws(() => inputFile("..%2F1")));
  await frozenInput(ab.id);
  const pu = await purgeGmForUser(b.id);
  ok("사람 하나를 지우면 그 사람의 응시 파일이 전부 사라진다", pu.input === 1 && !existsSync(inputFile(ab.id)), JSON.stringify(pu));
  ok("운영 PDF 폴더(var/reports)는 그대로다", count("var/reports") === reports0, `${reports0} → ${count("var/reports")}`);
  const regen = await collectInput(a.id);
  ok("파기 뒤 다시 모으면 지금 DB 기준이다(지운 파일을 되살리지 않는다)", regen.attempt_id === a.id && !existsSync(inputFile(a.id)));

  head("P4 파일 접근 차단 (정적)");
  const appRefs = execFileSync("bash", ["-c", "grep -rlE 'gm-inputs|gm-out|report-gm/inputs|gm-student' src/app src/middleware.ts 2>/dev/null | wc -l"]).toString().trim();
  ok("화면 · 라우트 · 미들웨어가 GM 파일을 읽지 않는다", appRefs === "0", `${appRefs}개 파일`);
  const pub = execFileSync("bash", ["-c", "find public -iname '*gm*' -o -iname '*.pdf' | wc -l"]).toString().trim();
  ok("public 에 GM 파일이나 PDF 가 없다", pub === "0", pub);
  const inDir = path.resolve(process.env.GM_INPUT_DIR!); const outDir = gmOutDir();
  ok("GM 폴더는 public 과 .next 밖이다", ![inDir, outDir].some((d) => d.startsWith(path.resolve("public")) || d.startsWith(path.resolve(".next"))), `${path.relative(".", inDir)} · ${path.relative(".", outDir)}`);
  const gi = readFileSync(".gitignore", "utf8");
  ok("GM 폴더는 저장소에 들어가지 않는다(.gitignore)", /var\/gm-inputs\//.test(gi) && /var\/gm-out\//.test(gi));
  const pdfRoute = readFileSync("src/app/v3/[attemptId]/result/pdf/route.ts", "utf8");
  ok("운영 결과 PDF 경로는 GM 을 부르지 않는다", !/report-gm|gm-student/.test(pdfRoute));

  head("P5 운영 이미지 패키징 (정적 · Dockerfile 고치지 않음)");
  const need = ["data/report-gm", "data/region", "var/pdf-gm/fonts/pretendard"];
  const docker = readFileSync("Dockerfile", "utf8");
  const run = docker.slice(docker.lastIndexOf("FROM "));
  const missing = need.filter((p) => !new RegExp(`COPY[^\\n]*${p.replace(/\//g, "\\/")}`).test(run));
  rows.push(`| ${missing.length ? "**FAIL**" : "PASS"} | 운영 이미지 마지막 단계가 GM 실행 파일을 담는다 | 빠진 자리 ${missing.length}: ${missing.join(" · ")} |`);
  if (missing.length) bad.push("운영 이미지 패키징(승인 전이라 고치지 않음 · 예상된 FAIL)"); else pass++;
  console.log(`  ${missing.length ? "걸림(예상)" : "통과"}  패키징 — 빠진 자리 ${missing.join(" · ")}`);
  const fonts = existsSync("var/pdf-gm/fonts/pretendard") ? readdirSync("var/pdf-gm/fonts/pretendard").filter((f) => f.endsWith(".woff2")).length : 0;
  ok("이 기계에 Pretendard woff2 다섯 벌이 있다(저장소 밖)", fonts === 5, `${fonts}벌`);
  const sizes = need.slice(0, 2).map((d) => `${d}: ${readdirSync(d).length}파일 · ${readdirSync(d).reduce((s, f) => s + statSync(path.join(d, f)).size, 0)}B`);

  /* 치운다 */
  for (const u of [st.id, b.id]) {
    for (const t2 of ["v3_experiences", "v3_attempts", "memberships", "campus_students"]) await query(`DELETE FROM ${t2} WHERE user_id=$1`, [u]).catch(() => undefined);
  }

  const total = pass + bad.length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "CHECKS.md"), [
    "# Track E 2차 · 입력 고정 정책 · 파기 · 파일 접근 · 패키징", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · DB \`${URL_}\` (격리 5433) · GM 파일 자리 \`${process.env.GM_INPUT_DIR}\` · \`${process.env.GM_OUT}\` (1차 파일과 따로)`,
    "- 운영 PDF 경로 · Dockerfile · `erasure.ts` · DB 는 고치지 않았다. 파기 함수는 GM 입력 모듈(`report-gm/inputs.ts`) 안에 두었다.",
    `- 패키징 대상 크기: ${sizes.join(" · ")}`, "",
    `**통과 ${pass} · 걸림 ${bad.length} / ${total}** (걸림 가운데 패키징 한 줄은 승인 전이라 예상된 FAIL)`, "",
    "| 판정 | 확인 | 값 |", "|---|---|---|", ...rows, "",
    ...(bad.length ? ["## 걸린 것", "", ...bad.map((x) => `- ${x}`), ""] : []),
  ].join("\n"));
  console.log(`\n확인 ${total}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.filter((x) => !x.startsWith("운영 이미지 패키징")).length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
