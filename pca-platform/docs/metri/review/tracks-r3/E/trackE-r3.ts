/**
 * **Track E 3차 · GM 연동 승인 패키지의 패치 넷을 격리 DB 에서 센다.**
 *
 * 패치(`docs/metri/review/tracks-r3/E/patches/01~04`)를 적용한 작업 트리에서 돈다.
 *
 *   S1 제출이 같은 트랜잭션에서 `v3_snapshots.gm_inputs` 를 적는다 · `note_text` 재유입 회귀
 *   S2 GM 입력은 굳은 줄이 먼저다 · 굳은 줄이 있으면 파일을 만들지 않는다
 *   S3 탈퇴(`anonymizeUser`)가 그 사람의 GM 파일과 굳은 입력을 지운다 · 남의 것과 var/reports 는 그대로
 *   S4 권한 표(본인 · 남 · 담당자 · 플래그 · BIZ/PRO · 학생 배포 플래그)
 *   S5 입구(`GET /v3/{id}/report/gm`)와 실패: 덜 만든 PDF · 그리던 HTML 이 남지 않는다
 *   S6 패키징 · DB 차례 (정적)
 *
 *   PGPORT=5433 DATABASE_URL=postgres:///cm_iso_e3 V3_PREVIEW_OPEN='*' \
 *     GM_INPUT_DIR=var/tmp/gm-r3/inputs GM_OUT=var/tmp/gm-r3/out REPORT_PDF_DIR=var/tmp/gm-r3/reports \
 *     CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *     OUT=docs/metri/review/tracks-r3/E npx tsx scripts/lab/trackE-r3.ts
 *
 * `ONLY=S1` 이면 S1 만 돈다(음성 대조: `GM_EXPERIENCE_COLUMNS` 에 `note_text` 를 넣고 돌리면 S1 이 걸려야 한다).
 * 세션은 `@/lib/session` 하나만 바꿔 끼운다(`trackC-race.ts` 와 같은 방법). 권한 · 주인 확인 · 생성은 제품 코드가 그대로 돈다.
 */
import { loadEnv, makeStudent, registerCampusStudent } from "../_loop-fixture";
loadEnv();
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const URL_ = process.env.DATABASE_URL ?? "";
if (process.env.PGPORT !== "5433" || !/^postgres(ql)?:\/\/\/cm_iso_e3\b/.test(URL_)) {
  console.error(`격리 클러스터(5433 · cm_iso_e3)가 아니다: ${URL_}`); process.exit(2);
}
if (!process.env.GM_INPUT_DIR || !process.env.GM_OUT || !process.env.REPORT_PDF_DIR) {
  console.error("GM_INPUT_DIR · GM_OUT · REPORT_PDF_DIR 를 이 검사 전용 자리로 둔다"); process.exit(2);
}
type Who = { id: string; name: string; locale: string; mustResetPw: boolean; role: string; memberships: { orgId: string | null; role: string }[] };
let WHO: Who | null = null;
let authCalls = 0;
const sessionFile = require.resolve(path.resolve("src/lib/session.ts"));
require.cache[sessionFile] = { id: sessionFile, filename: sessionFile, loaded: true, exports: {
  currentUser: async () => WHO,
  requireUser: async () => { authCalls++; if (!WHO) throw new Error("NEXT_REDIRECT /login"); return WHO; },
  requireRole: async () => WHO, roleInOrg: () => null,
} } as unknown as NodeModule;
/* eslint-disable @typescript-eslint/no-require-imports */
const { query, queryOne } = require("../../src/lib/db") as typeof import("../../src/lib/db");
const S = require("../../src/lib/me-v3/runtime/session") as typeof import("../../src/lib/me-v3/runtime/session");
const { addExperience, updateExperience, removeExperience } = require("../../src/lib/me-v3/platform") as typeof import("../../src/lib/me-v3/platform");
const { campusStudentContext } = require("../../src/lib/campus/students") as typeof import("../../src/lib/campus/students");
const SI = require("../../src/lib/me-v3/report-gm/snapshot-inputs") as typeof import("../../src/lib/me-v3/report-gm/snapshot-inputs");
const IN = require("../../src/lib/me-v3/report-gm/inputs") as typeof import("../../src/lib/me-v3/report-gm/inputs");
const { canDownloadGm } = require("../../src/lib/me-v3/report-gm/access") as typeof import("../../src/lib/me-v3/report-gm/access");
const { generateGm } = require("../../src/lib/me-v3/report-gm/generate") as typeof import("../../src/lib/me-v3/report-gm/generate");
const { anonymizeUser } = require("../../src/lib/erasure") as typeof import("../../src/lib/erasure");
const ROUTE = require("../../src/app/v3/[attemptId]/report/gm/route") as typeof import("../../src/app/v3/[attemptId]/report/gm/route");
const { answerAll, PEOPLE } = require("../_v3-answer") as typeof import("../_v3-answer");

const ONLY = process.env.ONLY ?? "";
const OUT = process.env.OUT ?? "docs/metri/review/tracks-r3/E";
const NOTE = "자유입력 한 줄 — 굳은 줄에 남으면 안 된다 R3";
const rows: string[] = []; let pass = 0; const bad: string[] = []; const info: string[] = [];
const ok = (what: string, cond: boolean, got = ""): void => {
  rows.push(`| ${cond ? "PASS" : "**FAIL**"} | ${what} | ${got.replace(/\|/g, "/").replace(/\n/g, " ")} |`);
  if (cond) pass++; else bad.push(what);
  console.log(`  ${cond ? "통과" : "걸림"}  ${what}${got ? " — " + got : ""}`);
};
const note = (what: string, got: string): void => {
  rows.push(`| INFO | ${what} | ${got.replace(/\|/g, "/")} |`); info.push(`${what}: ${got}`);
  console.log(`  관찰  ${what} — ${got}`);
};
const head = (t: string): void => { rows.push(`| | **${t}** | |`); console.log(`\n── ${t}`); };
const files = (d: string): string[] => (existsSync(d)
  ? execFileSync("bash", ["-c", `cd '${d}' && find . -type f | sort`]).toString().trim().split("\n").filter(Boolean) : []);
/** 모든 깊이의 열쇠 */
const keysDeep = (v: unknown, out = new Set<string>()): Set<string> => {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.add(k); keysDeep(x, out); }
  return out;
};
const ISO = `'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'`;

async function student(login: string, opts: { demo: boolean; campus: boolean }): Promise<string> {
  const st = await makeStudent(login);
  await query(`UPDATE users SET is_demo=$2 WHERE id=$1`, [st.id, opts.demo]);
  if (opts.campus) await registerCampusStudent(st.id, "PCU", "PCU26_BIZ");
  return st.id;
}
async function proAttempt(uid: string, exp?: (uid: string) => Promise<void>): Promise<string> {
  const ctx = (await campusStudentContext(uid))!.ctx;
  const a = await S.openAttempt({ userId: uid, tier: "PRO", stage: "bachelor", gradField: null, campus: ctx });
  if (exp) await exp(uid);
  await answerAll(a.core_code, a, uid, PEOPLE[2]);
  await S.submit((await S.attemptOf(a.id, uid))!);
  return a.id;
}
const gmOf = async (attemptId: string) => (await queryOne<{ g: Record<string, unknown> | null }>(
  `SELECT gm_inputs g FROM v3_snapshots WHERE attempt_id=$1 ORDER BY created_at DESC, id DESC LIMIT 1`, [attemptId]))?.g ?? null;
const viewer = (id: string, role = "student", memberships: Who["memberships"] = []): Who =>
  ({ id, name: "검사", locale: "ko", mustResetPw: false, role, memberships });
async function get(attemptId: string, who: Who | null): Promise<Response> {
  WHO = who;
  return ROUTE.GET(new Request(`http://127.0.0.1/v3/${attemptId}/report/gm`), { params: Promise.resolve({ attemptId }) });
}

async function main(): Promise<void> {
  const OUTD = IN.gmOutDir();
  const INDIR = path.resolve(process.env.GM_INPUT_DIR!);
  const REPORTS = path.resolve(process.env.REPORT_PDF_DIR!);
  for (const d of [OUTD, INDIR, REPORTS]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
  /* 운영 PDF 폴더에 남의 파일이 있다고 치고 그대로인지 본다 */
  mkdirSync(path.join(REPORTS, "v3"), { recursive: true });
  writeFileSync(path.join(REPORTS, "v3", "sentinel-999.pdf"), "%PDF-sentinel");

  head("S1 제출 = 같은 트랜잭션의 GM 입력 · note_text 재유입 회귀");
  const u1 = await student("zzte3-s1", { demo: true, campus: true });
  let e1 = "";
  const a1 = await proAttempt(u1, async (uid) => {
    e1 = await addExperience(uid, { kind: "course", title: "제출 전에 적은 경험 R3", td_codes: ["TD01"],
      decisions: ["다룰 것과 다루지 않을 것을 갈라 적었다"], note_text: NOTE });
  });
  const t = await queryOne<{ snap: string; sub: string; same_tx: boolean; n: string }>(
    `SELECT to_char(s.created_at AT TIME ZONE 'UTC', ${ISO}) snap,
            to_char(a.submitted_at AT TIME ZONE 'UTC', ${ISO}) sub,
            (s.xmin::text = a.xmin::text) same_tx,
            (SELECT count(*) FROM v3_snapshots WHERE attempt_id=a.id)::text n
       FROM v3_snapshots s JOIN v3_attempts a ON a.id=s.attempt_id WHERE a.id=$1`, [a1]);
  const g1 = await gmOf(a1);
  ok("BIZ PRO 제출이 굳은 줄에 gm_inputs 를 적는다", !!g1 && g1.version === SI.GM_SNAPSHOT_VERSION, String(g1?.version));
  ok("스냅샷 created_at = gm_inputs.frozen_at = submitted_at", !!t && !!g1 && t.snap === g1.frozen_at && t.sub === t.snap, `${t?.snap} · ${g1?.frozen_at} · ${t?.sub}`);
  ok("스냅샷 줄과 응시 줄을 같은 트랜잭션이 썼다(xmin 같음)", t?.same_tx === true, String(t?.same_tx));
  const dbNote = await queryOne<{ n: string }>(`SELECT note_text n FROM v3_experiences WHERE id=$1`, [e1]);
  ok("(전제) DB 경험 기록에는 note_text 가 적혀 있다", dbNote?.n === NOTE, dbNote?.n ?? "");
  const k1 = keysDeep(g1);
  const raw1 = JSON.stringify(g1);
  ok("gm_inputs 어디에도 note_text 열쇠가 없다(재유입 회귀)", !k1.has("note_text"), [...k1].filter((k) => /note|purge|user/.test(k)).join(",") || "없음");
  ok("gm_inputs 글 어디에도 그 자유입력 값이 없다", !raw1.includes(NOTE));
  ok("gm_inputs 에 purge_after · user_id 가 없다", !k1.has("purge_after") && !k1.has("user_id"));
  const expKeys = new Set(Object.keys(((g1?.experiences as Record<string, unknown>[]) ?? [])[0] ?? {}));
  const want = new Set(SI.GM_EXPERIENCE_COLUMNS.map((c) => c.split(/\s+AS\s+/i).pop()!.replace(/::.*/, "")));
  ok("경험 한 줄의 칸 = 허용 목록(GM_EXPERIENCE_COLUMNS)과 정확히 같다", [...expKeys].sort().join(",") === [...want].sort().join(","), [...expKeys].sort().join(","));
  ok("허용 목록 자체에 note_text 가 없다", !SI.GM_EXPERIENCE_COLUMNS.some((c) => /note_text/.test(c)), SI.GM_EXPERIENCE_COLUMNS.join(" "));
  if (ONLY === "S1") return finish();

  const sha1 = IN.shaOf(g1);
  await new Promise((r) => setTimeout(r, 30));
  const late = await addExperience(u1, { kind: "assignment", title: "제출 뒤에 더한 경험 R3", td_codes: ["TD02"] });
  await updateExperience(u1, e1, { kind: "course", title: "제출 뒤에 고친 제목 R3", td_codes: ["TD01"], note_text: NOTE });
  const g1b = await gmOf(a1);
  const ids1b = ((g1b?.experiences as { id: string }[]) ?? []).map((e) => e.id);
  ok("제출 뒤에 더하고 고쳐도 굳은 줄은 그대로다", IN.shaOf(g1b) === sha1 && !ids1b.includes(late) && ids1b.includes(e1) && !JSON.stringify(g1b).includes("고친 제목"), `굳은 줄 경험 ${ids1b.join(",")} · 뒤에 더한 ${late}`);
  const u1b = await student("zzte3-basic", { demo: true, campus: false });
  const ab = await S.openAttempt({ userId: u1b, tier: "BASIC", stage: "bachelor", gradField: null, core: "BIZ_CORE_V1" });
  await addExperience(u1b, { kind: "course", title: "BASIC 학생 경험", note_text: NOTE });
  await answerAll(ab.core_code, ab, u1b, PEOPLE[1]);
  await S.submit((await S.attemptOf(ab.id, u1b))!);
  ok("GM 을 못 받는 응시(BIZ BASIC)에는 적지 않는다(NULL · 최소화)", (await gmOf(ab.id)) === null);
  /* 원자성: GM 입력을 적다 실패하면 스냅샷도 응시 상태도 남지 않는다(같은 트랜잭션) */
  const uT = await student("zzte3-atomic", { demo: true, campus: true });
  const aT = await S.openAttempt({ userId: uT, tier: "PRO", stage: "bachelor", gradField: null, campus: (await campusStudentContext(uT))!.ctx });
  await answerAll(aT.core_code, aT, uT, PEOPLE[2]);
  const real = SI.gmInputsInTx;
  (SI as { gmInputsInTx: unknown }).gmInputsInTx = async () => { throw new Error("GM 입력 적기 실패(검사)"); };
  let subErr = ""; try { await S.submit((await S.attemptOf(aT.id, uT))!); } catch (e) { subErr = String((e as Error).message); }
  (SI as { gmInputsInTx: unknown }).gmInputsInTx = real;
  const afterFail = await queryOne<{ st: string; n: string }>(
    `SELECT a.status st, (SELECT count(*) FROM v3_snapshots WHERE attempt_id=a.id)::text n FROM v3_attempts a WHERE a.id=$1`, [aT.id]);
  ok("GM 입력 적기가 실패하면 스냅샷 0줄 · 응시는 in_progress 그대로(되돌림)", /검사/.test(subErr) && afterFail?.st === "in_progress" && afterFail?.n === "0", `${afterFail?.st} · ${afterFail?.n}줄`);
  await S.submit((await S.attemptOf(aT.id, uT))!);
  ok("다시 제출하면 스냅샷과 gm_inputs 가 함께 선다", (await gmOf(aT.id)) !== null);

  head("S2 굳은 줄이 먼저 · 파일을 만들지 않는다");
  const decoyFile = IN.inputFile(a1);
  const fresh = await IN.collectInput(a1);
  ok("collectInput 이 굳은 줄을 읽는다(source=snapshot)", fresh.source === "snapshot" && fresh.frozen_at === g1!.frozen_at, String(fresh.source));
  ok("그 경험 목록 = gm_inputs 경험 목록", IN.shaOf(fresh.experiences) === IN.shaOf(g1!.experiences));
  /* 같은 기준 시각 · 바른 해시를 단 미끼 파일. 옛 규칙이면 이것을 썼다 */
  const decoyBody = { ...fresh, source: undefined, experiences: [], excluded: [], made_at: "x" } as Record<string, unknown>;
  delete decoyBody.sha256; delete decoyBody.source;
  const { made_at: _m, ...hashed } = decoyBody;
  mkdirSync(path.dirname(decoyFile), { recursive: true });
  writeFileSync(decoyFile, JSON.stringify({ ...decoyBody, sha256: IN.shaOf(hashed) }));
  const f2 = await IN.frozenInput(a1);
  ok("파일이 있어도 굳은 줄을 쓴다(미끼 파일 무시)", f2.input.source === "snapshot" && f2.input.experiences.length === (g1!.experiences as unknown[]).length && f2.input.experiences.length > 0, `${f2.input.experiences.length}건`);
  rmSync(decoyFile, { force: true });
  const f3 = await IN.frozenInput(a1);
  ok("굳은 줄이 있으면 입력 파일을 만들지 않는다", f3.reused && !existsSync(decoyFile) && files(INDIR).length === 0, `${files(INDIR).length}개`);
  await removeExperience(u1, e1);
  const f4 = await IN.frozenInput(a1);
  ok("DB 에서 기록을 지운 뒤에도 같은 입력(재현)", IN.shaOf(f4.input.experiences) === IN.shaOf(f3.input.experiences));
  /* 이 변경 전에 굳은 응시: gm_inputs 를 비워 흉내 낸다 */
  const u2 = await student("zzte3-legacy", { demo: true, campus: true });
  const a2 = await proAttempt(u2, async (uid) => { await addExperience(uid, { kind: "project", title: "옛 응시 경험 R3", note_text: NOTE }); });
  await query(`UPDATE v3_snapshots SET gm_inputs=NULL WHERE attempt_id=$1`, [a2]);
  let threw = false; try { await IN.frozenInput(a2, { allowFile: false }); } catch { threw = true; }
  ok("옛 응시 + allowFile:false 는 던지고 파일을 만들지 않는다", threw && !existsSync(IN.inputFile(a2)));
  const f5 = await IN.frozenInput(a2);
  ok("옛 응시 기본값은 예전처럼 파일로 굳힌다(실험 경로 호환) · note_text 없음", f5.input.source === "file" && existsSync(IN.inputFile(a2)) && !readFileSync(IN.inputFile(a2), "utf8").includes("note_text"));

  head("S4 권한 표 (canDownloadGm)");
  const ON = { FEATURE_GM_REPORT: "yes" } as NodeJS.ProcessEnv;
  const DIST = { FEATURE_GM_REPORT: "yes", GM_STUDENT_DISTRIBUTION: "yes" } as NodeJS.ProcessEnv;
  const uReal = await student("zzte3-real", { demo: false, campus: true });
  const aReal = await proAttempt(uReal);
  const uOther = await student("zzte3-other", { demo: true, campus: true });
  const uMe = await student("zzte3-me", { demo: true, campus: false });
  const aMe = await S.openAttempt({ userId: uMe, tier: "PRO", stage: "bachelor", gradField: null, core: "ME_CORE_V3" });
  const uOpen = await student("zzte3-open", { demo: true, campus: true });
  const aOpen = await S.openAttempt({ userId: uOpen, tier: "PRO", stage: "bachelor", gradField: null, campus: (await campusStudentContext(uOpen))!.ctx });
  const M = [
    ["플래그 꺼짐 · 본인", viewer(u1), a1, {} as NodeJS.ProcessEnv, "flag_off"],
    ["플래그 켜짐 · 본인(시험 계정) · 학생 배포 꺼짐", viewer(u1), a1, ON, "ok"],
    ["플래그 켜짐 · 본인(실제 학생) · 학생 배포 꺼짐", viewer(uReal), aReal, ON, "distribution_off"],
    ["플래그 켜짐 · 본인(실제 학생) · 학생 배포 켜짐", viewer(uReal), aReal, DIST, "ok"],
    ["다른 학생", viewer(uOther), a1, DIST, "not_owner"],
    ["학과 담당자(org_admin) · 같은 학교", viewer(uOther, "org_admin", [{ orgId: "1", role: "org_admin" }]), aReal, DIST, "org_default_deny"],
    ["교수(instructor)", viewer(uOther, "student", [{ orgId: "1", role: "instructor" }]), aReal, DIST, "org_default_deny"],
    ["운영사(superadmin)", viewer(uOther, "superadmin"), aReal, DIST, "org_default_deny"],
    ["BIZ 아닌 Core(ME_CORE_V3 PRO)", viewer(uMe), aMe.id, DIST, "not_biz_pro"],
    ["PRO 아닌 등급(BIZ BASIC)", viewer(u1b), ab.id, DIST, "not_biz_pro"],
    ["굳은 결과 없음(BIZ PRO 진행 중)", viewer(uOpen), aOpen.id, DIST, "no_result"],
    ["번호 꼴 아님(../1)", viewer(u1), "../1", DIST, "bad_id"],
    ["없는 응시", viewer(u1), "987654321", DIST, "no_attempt"],
  ] as const;
  for (const [what, v, id, env, code] of M) {
    const r = await canDownloadGm(v, id, env);
    ok(`${what} → ${code}`, r.code === code && (code === "ok") === r.ok && (r.ok || r.status === 404), r.code);
  }

  head("S5 입구 GET · 실패에서 남는 것");
  process.env.FEATURE_GM_REPORT = ""; authCalls = 0;
  const r0 = await get(a1, null);
  ok("플래그 꺼짐 → 404 · 로그인도 묻지 않는다", r0.status === 404 && authCalls === 0, `${r0.status} · requireUser ${authCalls}회`);
  process.env.FEATURE_GM_REPORT = "yes"; delete process.env.GM_STUDENT_DISTRIBUTION;
  for (const [what, who] of [["다른 학생", viewer(uOther)], ["학과 담당자", viewer(uOther, "org_admin", [{ orgId: "1", role: "org_admin" }])]] as const) {
    const r = await get(a1, who);
    ok(`${what} → 404`, r.status === 404, String(r.status));
  }
  const rReal = await get(aReal, viewer(uReal));
  ok("실제 학생 본인 · 학생 배포 꺼짐 → 404", rReal.status === 404, String(rReal.status));
  const pdfgm0 = files(path.resolve("var/pdf-gm")).filter((f) => f.endsWith(".html")).length;
  const t0 = Date.now();
  const rOk = await get(a1, viewer(u1));
  const body = Buffer.from(await rOk.arrayBuffer());
  ok("본인(시험 계정) → 200 PDF", rOk.status === 200 && rOk.headers.get("content-type") === "application/pdf" && body.subarray(0, 5).toString() === "%PDF-", `${rOk.status} · ${body.length}B · ${Date.now() - t0}ms`);
  ok("attachment · no-store", /^attachment;/.test(rOk.headers.get("content-disposition") ?? "") && /no-store/.test(rOk.headers.get("cache-control") ?? ""), `${rOk.headers.get("content-disposition")} · ${rOk.headers.get("cache-control")}`);
  const left = files(path.join(OUTD, a1));
  ok("응시 폴더에는 PDF 와 MANIFEST 만 남는다(.part · 그리던 HTML 없음)", left.join(",") === "./BIZ-PRO.pdf,./MANIFEST.json", left.join(","));
  const man = readFileSync(path.join(OUTD, a1, "MANIFEST.json"), "utf8");
  ok("MANIFEST 에 경험 제목 · user_id · note_text 가 없다", !/제출 전에 적은 경험|user_id|note_text/.test(man) && JSON.parse(man).input_source === "snapshot");
  ok("실험 작업 폴더(var/pdf-gm)에 그리던 HTML 을 더하지 않는다", files(path.resolve("var/pdf-gm")).filter((f) => f.endsWith(".html")).length === pdfgm0);
  ok("운영 입구는 입력 파일을 만들지 않는다", !existsSync(IN.inputFile(a1)));

  /* 실패 1: 브라우저가 뜨지 않는다(실제 입구). 성공한 PDF 가 없는 응시로 */
  const chrom = process.env.CHROMIUM_PATH;
  process.env.CHROMIUM_PATH = "/etc/hostname";
  const jf0 = Number((await queryOne<{ n: string }>(`SELECT count(*)::text n FROM job_failures WHERE kind='gm_pdf_fail'`))?.n);
  const rFail = await get(aReal, viewer(uReal)); // 배포 꺼짐이라 404 여야 한다 — 먼저 권한
  process.env.GM_STUDENT_DISTRIBUTION = "yes";
  const rFail2 = await get(aReal, viewer(uReal));
  process.env.CHROMIUM_PATH = chrom; delete process.env.GM_STUDENT_DISTRIBUTION;
  const jf = await queryOne<{ n: string; trace: string; msg: string }>(
    `SELECT count(*) OVER ()::text n, trace_id trace, message msg FROM job_failures WHERE kind='gm_pdf_fail' ORDER BY id DESC LIMIT 1`);
  const leftF = files(path.join(OUTD, aReal));
  ok("브라우저 실패 → 503 안내 쪽(웹 결과 링크)", rFail.status === 404 && rFail2.status === 503 && (await rFail2.text()).includes(`/v3/${aReal}/result`), `${rFail.status} → ${rFail2.status}`);
  ok("job_failures 에 gm_pdf_fail 한 줄(걸음 browser)", Number(jf?.n) === jf0 + 1 && jf?.trace === `gm-pdf-browser-${aReal}`, `${jf?.trace}`);
  ok("실패 뒤 남는 것은 FAIL.json 하나(PDF · .part · HTML 없음)", leftF.join(",") === "./FAIL.json", leftF.join(","));
  ok("FAIL.json · 운영 표 줄에 경험 제목이나 note_text 가 없다", !/R3|note_text|자유입력/.test(readFileSync(path.join(OUTD, aReal, "FAIL.json"), "utf8") + (jf?.msg ?? "")));
  /* 실패 2: 인쇄가 반쯤 쓰다 죽는다(바꿔 끼운 인쇄기) */
  const half = await generateGm(a1, { print: async (_h, pdf) => { writeFileSync(pdf, "%PDF-1.7 반쪽"); throw new Error("인쇄 중 끊김(검사)"); } });
  const leftH = files(path.join(OUTD, a1));
  ok("인쇄 중 끊김 → 실패 · .part 와 HTML 이 지워진다", !half.ok && half.step === "print" && !leftH.some((f) => /\.part$|\.html$/.test(f)), leftH.join(","));
  ok("앞서 완성된 PDF 는 반쪽으로 덮이지 않는다", readFileSync(path.join(OUTD, a1, "BIZ-PRO.pdf")).equals(body));
  /* 실패 3: 넘친 쪽 */
  rmSync(path.join(OUTD, a1), { recursive: true, force: true });
  const over = await generateGm(a1, { print: async (_h, pdf) => { writeFileSync(pdf, "%PDF-1.7 넘침"); return [0, 4, 0]; } });
  ok("쪽이 넘치면 PDF 를 남기지 않는다", !over.ok && over.step === "layout" && files(path.join(OUTD, a1)).join(",") === "./FAIL.json", files(path.join(OUTD, a1)).join(","));
  /* 실패 4: 글꼴 없음 */
  const fd = process.env.GM_FONT_DIR; process.env.GM_FONT_DIR = path.join(OUTD, "no-fonts");
  const nf = await generateGm(a1);
  if (fd === undefined) delete process.env.GM_FONT_DIR; else process.env.GM_FONT_DIR = fd;
  ok("글꼴이 없으면 찍지 않는다(fonts)", !nf.ok && nf.step === "fonts", nf.ok ? "" : nf.reason.slice(0, 80));
  /* 실패 5: 옛 응시 — 입구는 입력 파일을 만들지 않는다 */
  rmSync(IN.inputFile(a2), { force: true });
  process.env.GM_STUDENT_DISTRIBUTION = "yes";
  const rLeg = await get(a2, viewer(u2));
  delete process.env.GM_STUDENT_DISTRIBUTION;
  ok("옛 응시(gm_inputs NULL) → 503 · 입력 파일을 만들지 않는다", rLeg.status === 503 && !existsSync(IN.inputFile(a2)));
  /* DB: 새 값을 받고 모르는 값은 막는다 · 차례대로 다시 부어도 멈추지 않는다 */
  let junk = false; try { await query(`INSERT INTO job_failures (kind, message) VALUES ('gm_junk','x')`); } catch { junk = true; }
  ok("job_failures 가 모르는 kind 는 막는다", junk);
  let reapply = ""; try {
    reapply = execFileSync("psql", [URL_, "-q", "-v", "ON_ERROR_STOP=1", "--single-transaction", "-f", "db/schema_phase2_2.sql"], { stdio: ["ignore", "pipe", "pipe"] }).toString();
    ok("gm_pdf_fail 줄이 있는 채로 schema_phase2_2.sql 을 다시 부어도 멈추지 않는다", true);
  } catch (e) { ok("gm_pdf_fail 줄이 있는 채로 schema_phase2_2.sql 을 다시 부어도 멈추지 않는다", false, String((e as { stderr?: Buffer }).stderr ?? e).slice(0, 200)); }
  void reapply;
  /* 음성 대조: 제약을 옛 목록으로 다시 걸면(값을 다른 파일에서 더했다면 생기는 일) 멈춘다 */
  const neg = execFileSync("bash", ["-c", `psql '${URL_}' -v ON_ERROR_STOP=1 -c "BEGIN; ALTER TABLE job_failures DROP CONSTRAINT job_failures_kind_chk; ALTER TABLE job_failures ADD CONSTRAINT job_failures_kind_chk CHECK (kind IN ('result','pdf','mail','payment','entitlement','webhook')); ROLLBACK;" 2>&1 || true`]).toString();
  ok("(음성 대조) 옛 목록으로 다시 걸면 기존 gm_pdf_fail 줄 때문에 멈춘다 → 값은 phase2_2 한 자리에서만 더한다", /violated|위반/.test(neg), neg.split("\n").find((l) => /ERROR|오류/.test(l))?.slice(0, 120) ?? neg.slice(0, 120));

  head("S3 탈퇴 파기(erasure.ts → purgeGmForUser · gm_inputs NULL)");
  const uX = await student("zzte3-erase-x", { demo: true, campus: true });
  const aX = await proAttempt(uX, async (uid) => { await addExperience(uid, { kind: "course", title: "지워질 사람의 경험 R3", note_text: NOTE }); });
  const gX = await generateGm(aX);
  /* 이 변경 전 실험 경로가 남긴 입력 고정 파일을 흉내 낸다(같은 응시 번호) */
  writeFileSync(IN.inputFile(aX), JSON.stringify({ version: "gm-input.2", attempt_id: aX, experiences: [{ title: "지워질 사람의 경험 R3" }] }));
  const uY = await student("zzte3-erase-y", { demo: true, campus: true });
  const aY = await proAttempt(uY);
  mkdirSync(path.join(OUTD, aY), { recursive: true }); writeFileSync(path.join(OUTD, aY, "BIZ-PRO.pdf"), "%PDF-y");
  writeFileSync(IN.inputFile(aY), JSON.stringify({ version: "gm-input.2", attempt_id: aY }));
  const before = { x: [...files(path.join(OUTD, aX)), existsSync(IN.inputFile(aX))], y: files(path.join(OUTD, aY)).length, rep: files(REPORTS).join(",") };
  ok("(전제) X 의 GM PDF · 옛 입력 파일 · Y 의 파일이 실제로 있다", gX.ok && before.x.includes("./BIZ-PRO.pdf") && before.x.includes(true) && before.y === 1 && existsSync(IN.inputFile(aY)), JSON.stringify(before.x));
  const er = await anonymizeUser(uX, { requestedBy: "self", reason: "withdraw" });
  const gmLeft = await queryOne<{ n: string; rm: string }>(
    `SELECT count(*) FILTER (WHERE s.gm_inputs IS NOT NULL)::text n, count(*) FILTER (WHERE s.result_model IS NOT NULL)::text rm
       FROM v3_snapshots s JOIN v3_attempts a ON a.id=s.attempt_id WHERE a.user_id=$1`, [uX]);
  ok("X 의 GM 폴더와 입력 파일이 사라진다", !existsSync(path.join(OUTD, aX)) && !existsSync(IN.inputFile(aX)), JSON.stringify(er.removed));
  ok("X 의 굳은 줄 gm_inputs 가 NULL 이 된다 · 결과 모델은 남는다(KEEP)", gmLeft?.n === "0" && Number(gmLeft?.rm) >= 1, `gm_inputs ${gmLeft?.n} · result_model ${gmLeft?.rm}`);
  ok("파기 기록에 gm 두 갈래가 적힌다", er.removed["v3_snapshots.gm_inputs"] === 1 && (er.removed["gm_files"] ?? 0) >= 2, JSON.stringify(er.removed));
  ok("Y 의 파일과 굳은 줄은 그대로다", files(path.join(OUTD, aY)).length === 1 && existsSync(IN.inputFile(aY)) && (await gmOf(aY)) !== null);
  ok("운영 PDF 폴더(REPORT_PDF_DIR)는 그대로다", files(REPORTS).join(",") === before.rep, files(REPORTS).join(","));
  const er2 = await anonymizeUser(uX);
  ok("두 번 불러도 탈이 없고 지울 것이 없다", Object.keys(er2.removed).length === 0, JSON.stringify(er2.removed));
  /* 앞선 파기가 DB 확정 뒤 · 파일 지우기 전에 끊긴 것을 흉내 낸다 */
  mkdirSync(path.join(OUTD, aX), { recursive: true }); writeFileSync(path.join(OUTD, aX, "BIZ-PRO.pdf"), "%PDF-left");
  const er3 = await anonymizeUser(uX);
  ok("이미 익명화된 계정이어도 남은 GM 파일을 지운다(끊긴 파기 회복)", !existsSync(path.join(OUTD, aX)) && er3.removed["gm_files"] === 1, JSON.stringify(er3.removed));
  const leftExp = await queryOne<{ n: string; notes: string }>(
    `SELECT count(*)::text n, count(note_text)::text notes FROM v3_experiences WHERE user_id=$1`, [uX]);
  note("탈퇴 뒤에도 v3_experiences 줄이 남는다(이 패치 범위 밖 · 기존 erasure REMOVE 목록에 없음)", `${leftExp?.n}줄 · note_text ${leftExp?.notes}줄`);

  head("S6 패키징 · DB 차례 (정적)");
  const docker = readFileSync("Dockerfile", "utf8");
  const run = docker.slice(docker.lastIndexOf("\nFROM "));
  for (const p of ["data/report-gm", "data/region"]) ok(`운영 이미지 마지막 단계가 ${p} 를 담는다`, new RegExp(`COPY[^\\n]*/app/${p.replace("/", "\\/")} \\./${p.replace("/", "\\/")}`).test(run));
  ok("GM 볼륨 자리 /app/var/gm/out 를 미리 만들고 환경값이 가리킨다", /mkdir -p[^\n]*\/app\/var\/gm\/out/.test(run) && /GM_OUT=\/app\/var\/gm\/out/.test(run) && /GM_INPUT_DIR=\/app\/var\/gm\/inputs/.test(run));
  ok("GM 볼륨은 운영 PDF 볼륨과 다른 자리다", !/GM_OUT=\/app\/var\/reports/.test(run));
  const fontsIn = /COPY[^\n#]*fonts\/pretendard/.test(run.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n"));
  note("글꼴(Pretendard)은 이미지에 담지 않았다 — 결정 대기(BLOCKED) · 없으면 입구가 fonts 걸음에서 멈춘다(S5 실패 4)", fontsIn ? "담김" : "안 담김 · GM_FONT_DIR=/app/fonts/pretendard 만 적음");
  const needs = (JSON.parse(readFileSync("deploy/runtime-needs.json", "utf8")).needs as [string, string][]).map((n) => n[0]);
  const gmNeeds = needs.filter((n) => /^data\/(report-gm|region)\//.test(n));
  ok("runtime-needs 에 GM 자료 여섯이 있고 저장소에 다 있다", gmNeeds.length === 6 && gmNeeds.every((n) => existsSync(n)), gmNeeds.join(" · "));
  let img = ""; let imgOk = true;
  try { img = execFileSync("node", ["scripts/image-check.mjs"]).toString(); } catch (e) { imgOk = false; img = String((e as { stdout?: Buffer }).stdout ?? e); }
  ok("image:check 가 통과한다", imgOk && /이미지 구성 OK/.test(img), img.trim().split("\n").pop() ?? "");
  ok(".dockerignore 가 var/ 를 빌드 컨텍스트에서 뺀다(개인정보 파일)", /^var\/?$/m.test(readFileSync(".dockerignore", "utf8")));
  const compose = readFileSync("deploy/docker-compose.prod.yml", "utf8");
  ok("운영 compose 에 gm 볼륨이 붙고 백업 대상이 아니다", /- gm:\/app\/var\/gm/.test(compose) && !/backups?:[^\n]*gm|gm:\/var\/backups/.test(compose));
  ok("entrypoint 가 GM 볼륨 주인을 고친다(못 써도 멈추지 않는다)", /chown -R metri:nodejs "\$GM"/.test(readFileSync("deploy/entrypoint.sh", "utf8")));
  const chain = JSON.parse(readFileSync("deploy/db-chain.json", "utf8")) as { upgrade: string[] };
  ok("db-chain: schema_v3_gm.sql 이 schema_v3_runtime.sql 뒤에 있다", chain.upgrade.indexOf("db/schema_v3_gm.sql") > chain.upgrade.indexOf("db/schema_v3_runtime.sql") && chain.upgrade.indexOf("db/schema_v3_runtime.sql") >= 0);
  const kindDefs = execFileSync("bash", ["-c", "grep -rl 'ADD CONSTRAINT job_failures_kind_chk' db | sort"]).toString().trim();
  ok("job_failures_kind_chk 를 거는 파일은 schema_phase2_2.sql 하나다", kindDefs === "db/schema_phase2_2.sql", kindDefs);
  const appRefs = execFileSync("bash", ["-c", "grep -rlE 'report-gm|gm-student|gm-inputs|gm-out' src/app src/middleware.ts 2>/dev/null | sort"]).toString().trim();
  ok("화면 · 라우트 가운데 GM 을 읽는 것은 새 입구 하나다", appRefs === "src/app/v3/[attemptId]/report/gm/route.ts", appRefs);
  ok("운영 결과 PDF 경로는 GM 을 부르지 않는다", !/report-gm|gm-student/.test(readFileSync("src/app/v3/[attemptId]/result/pdf/route.ts", "utf8")));

  return finish();
}

function finish(): void {
  const total = pass + bad.length;
  mkdirSync(OUT, { recursive: true });
  const name = ONLY ? `CHECKS-${ONLY}.md` : "CHECKS.md";
  writeFileSync(path.join(OUT, name), [
    "# Track E 3차 · GM 연동 승인 패키지 검사", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · DB \`${URL_}\` (격리 5433) · 패치 01~04 를 적용한 작업 트리 · GM 자리 \`${process.env.GM_INPUT_DIR}\` · \`${process.env.GM_OUT}\` · REPORT_PDF_DIR \`${process.env.REPORT_PDF_DIR}\``,
    `- note_text 허용 목록: \`${SI.GM_EXPERIENCE_COLUMNS.join(" · ")}\``, "",
    `**통과 ${pass} · 걸림 ${bad.length} / ${total}** · 관찰 ${info.length}`, "",
    "| 판정 | 확인 | 값 |", "|---|---|---|", ...rows, "",
    ...(bad.length ? ["## 걸린 것", "", ...bad.map((x) => `- ${x}`), ""] : []),
  ].join("\n"));
  console.log(`\n확인 ${total}가지 — 통과 ${pass} · 걸림 ${bad.length} · 관찰 ${info.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
