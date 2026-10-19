/**
 * **출시 차단 해소 · 학교 계정의 개인 응시 차단과 상태별 단추.**
 *
 * 실제 브라우저와 실제 DB 로 센다. 자리마다 화면이 무엇을 말하고 누르면
 * 어디로 가는지와, **그 사이에 DB 에 응시 줄이 생겼는지**를 같이 본다.
 *
 *   A. 학교 학생이 학교 쿠키 없이 `/v3/start` 를 치면 학교 경로로 간다 · 응시 0
 *   B. 그 학생이 서버 액션을 직접 보내도(다른 사람의 폼에서 뽑은 액션 번호)
 *      응시가 열리지 않는다
 *   C. 학교 경로로 시작하면 학교 응시(PRO · 학교 · 학과)가 열린다
 *   D. 푸는 중이면 학교 쪽 단추가 `이어하기` 이고 그 응시로 간다
 *   E. 결과를 받았으면 `결과 보기` 이고 시작 단추가 서지 않는다 · 강제 시작 0
 *   F. 담당자가 다시 열어 주면 `다시 검사 시작하기` 와 `지난 결과 보기`
 *   G. 개인 이용권을 실제로 든 학교 학생은 개인 응시를 열 수 있다(학교 맥락 없음)
 *   H. 학교 학생이 아닌 개인 회원은 전과 같다(무료 등급)
 *   I. 다른 학과 쪽에서는 `등록된 학과로 가기` · 전공 목록에서는 상태대로
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' npx tsx scripts/lab/rb-start-gate.ts
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, cloneFinished, gateCreds,
  login, makeStudent, registerCampusStudent,
} from "../_loop-fixture";
loadEnv();
import { chromium, type BrowserContext, type Page } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";

const OUT = process.env.OUT ?? "var/rb/gate";
const UNI = "PCU";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const OTHER_LEAF = process.env.OTHER_LEAF ?? "PCU26_PUBADM_GENERAL";
let pass = 0; const bad: string[] = []; const rows: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  const line = `${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`;
  (c ? pass++ : bad.push(w)); rows.push(line); console.log("  " + line);
};
const head = (w: string): void => { rows.push("", `## ${w}`); console.log(`\n── ${w}`); };
const path = (p: Page) => new URL(p.url()).pathname;
const body = async (p: Page) => (await p.locator("body").innerText()).replace(/\s+/g, " ");
const nAttempts = async (uid: string) => Number((await queryOne<{ n: string }>(
  `SELECT count(*)::text n FROM v3_attempts WHERE user_id = $1`, [uid]))?.n ?? 0);

async function shot(p: Page, name: string): Promise<void> {
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }).catch(() => undefined);
}

/**
 * **남의 폼으로 서버 액션을 보낸다.** 개인 회원으로 들어가 `/v3/start` 의
 * 폼이 선 브라우저에서 세션 쿠키만 학교 학생의 것으로 갈아 끼우고 폼을
 * 보낸다. 서버 액션 번호와 머리글은 브라우저가 붙이므로 실제로 오가는 요청과
 * 같다(학교 학생은 그 폼을 받을 길이 없다: 화면이 먼저 돌려보낸다).
 */
async function forgedStart(
  newCtx: () => Promise<BrowserContext>, personal: { login: string; pw: string },
  victim: BrowserContext,
): Promise<string> {
  const c = await newCtx();
  const p = await login(c, personal.login, personal.pw);
  await p.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
  if (new URL(p.url()).pathname !== "/v3/start") { await c.close(); return "폼이 서지 않았다"; }
  await p.getByText("학부", { exact: true }).click();
  await c.clearCookies();
  await c.addCookies(await victim.cookies());
  await p.getByRole("button", { name: "검사 시작" }).click();
  await p.waitForURL((u) => new URL(u).pathname !== "/v3/start", { timeout: 20000 })
    .catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  const to = new URL(p.url()).pathname;
  await c.close();
  return to;
}

async function main(): Promise<void> {
  assertFreshServer();
  assertPreviewServer("BIZ_CORE_V1");
  mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const newCtx = () => b.newContext({
    viewport: { width: 1440, height: 900 }, httpCredentials: gateCreds() ?? undefined,
  });
  const code = UNI.toLowerCase();
  const stamp = String(Date.now()).slice(-7);

  /* 개인 회원 하나: 폼에서 액션 번호를 뽑는 자리이자 H 의 사람 */
  const P = await makeStudent(`zzrbp${stamp}`);
  const S1 = await makeStudent(`zzrbs1${stamp}`);
  await registerCampusStudent(S1.id, UNI, LEAF);
  const S2 = await makeStudent(`zzrbs2${stamp}`);
  await registerCampusStudent(S2.id, UNI, LEAF);
  const S3 = await makeStudent(`zzrbs3${stamp}`);
  await registerCampusStudent(S3.id, UNI, LEAF);

  head("A. 학교 쿠키 없이 /v3/start");
  const c1 = await newCtx();
  const p1 = await login(c1, `zzrbs1${stamp}`, S1.pw);
  await p1.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
  ok("학교 학생은 학교 경로로 간다", path(p1) === `/campus/${code}/start`, path(p1));
  ok("응시가 열리지 않았다", await nAttempts(S1.id) === 0, `${await nAttempts(S1.id)}`);
  const t1 = await body(p1);
  ok("학교 쪽 단추가 `검사 시작하기` 다",
    await p1.getByRole("button", { name: "검사 시작하기" }).count() === 1);
  ok("개인 응시의 등급 이름이 서지 않는다", !/BASIC|선별 등급/.test(t1));
  await shot(p1, "A-school-redirect");
  /* 주소에 전공을 실어도 같다 */
  await p1.goto(`${BASE}/v3/start?core=BIZ_CORE_V1`, { waitUntil: "networkidle" });
  ok("?core= 를 붙여도 학교 경로로 간다", path(p1) === `/campus/${code}/start`, path(p1));

  head("B. 서버 액션을 직접 보낸다");
  const cP = await newCtx();
  const pP = await login(cP, `zzrbp${stamp}`, P.pw);
  await pP.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
  ok("개인 회원에게는 시작 화면이 선다", path(pP) === "/v3/start", path(pP));
  const Pc = { login: `zzrbp${stamp}`, pw: P.pw };
  const forged = await forgedStart(newCtx, Pc, c1);
  ok("학교 학생의 강제 서버 액션이 응시를 열지 않는다", await nAttempts(S1.id) === 0,
    `${await nAttempts(S1.id)}`);
  ok("서버가 학교 경로로 돌려보낸다", forged === `/campus/${code}/start`, forged);

  head("C. 학교 경로로 시작한다");
  await p1.goto(`${BASE}/campus/${code}/start`, { waitUntil: "networkidle" });
  await p1.getByRole("button", { name: "검사 시작하기" }).click();
  await p1.waitForURL(/\/v3\/start/, { timeout: 30000 });
  await p1.waitForLoadState("networkidle");
  ok("공통 시작 화면이 학교와 학과를 적는다", (await body(p1)).includes("배재대학교"));
  await p1.getByText("학부", { exact: true }).click();
  await p1.getByRole("button", { name: "검사 시작" }).click();
  await p1.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
  const a1 = await queryOne<{ id: string; tier: string; university_code: string | null;
    department_code: string | null; entitlement_id: string | null }>(
    `SELECT id::text, tier, university_code, department_code, entitlement_id::text
       FROM v3_attempts WHERE user_id = $1`, [S1.id]);
  ok("학교 응시가 열린다", a1?.university_code === UNI && a1?.department_code === LEAF,
    `${a1?.university_code} · ${a1?.department_code}`);
  ok("학교 응시는 PRO 다", a1?.tier === "PRO", `${a1?.tier}`);

  head("D. 푸는 중");
  await p1.goto(`${BASE}/campus/${code}/start`, { waitUntil: "networkidle" });
  const resume = p1.getByRole("link", { name: /이어하기/ });
  ok("단추가 `이어하기` 다", await resume.count() === 1);
  ok("시작 단추가 서지 않는다",
    await p1.getByRole("button", { name: "검사 시작하기" }).count() === 0);
  await shot(p1, "D-resume");
  await resume.click();
  await p1.waitForURL(/\/v3\/\d+/, { timeout: 20000 }).catch(() => undefined);
  ok("누르면 그 응시로 간다", path(p1).startsWith(`/v3/${a1?.id}`), path(p1));
  await p1.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
  ok("/v3/start 도 그 응시로 보낸다", path(p1).startsWith(`/v3/${a1?.id}`), path(p1));
  ok("응시는 여전히 하나다", await nAttempts(S1.id) === 1, `${await nAttempts(S1.id)}`);

  head("E. 결과를 받았다");
  const fin = await cloneFinished(S2.id, "PRO");
  if (!fin) throw new Error("끝낸 응시를 베끼지 못했습니다");
  await query(`UPDATE v3_attempts SET university_code = $2, department_code = $3
                WHERE id = $1`, [fin, UNI, LEAF]);
  const c2 = await newCtx();
  const p2 = await login(c2, `zzrbs2${stamp}`, S2.pw);
  await p2.goto(`${BASE}/campus/${code}/start`, { waitUntil: "networkidle" });
  const see = p2.getByRole("link", { name: /^결과 보기/ });
  ok("단추가 `결과 보기` 다", await see.count() === 1);
  ok("시작 단추가 서지 않는다",
    await p2.getByRole("button", { name: /검사 시작/ }).count() === 0);
  const t2 = await body(p2);
  ok("다시 응시하는 방법을 적는다", t2.includes("학과 담당자"));
  await shot(p2, "E-result");
  await see.click();
  await p2.waitForURL(/\/result/, { timeout: 20000 }).catch(() => undefined);
  ok("누르면 그 결과로 간다", path(p2) === `/v3/${fin}/result`, path(p2));
  await p2.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
  ok("/v3/start 는 학교 경로로 보낸다", path(p2) === `/campus/${code}/start`, path(p2));
  const forged2 = await forgedStart(newCtx, Pc, c2);
  ok("강제 서버 액션이 새 응시를 열지 않는다", await nAttempts(S2.id) === 1,
    `${await nAttempts(S2.id)} · ${forged2}`);
  await p2.goto(`${BASE}/cores`, { waitUntil: "networkidle" });
  ok("전공 목록의 학교 카드도 `결과 보기` 다", (await body(p2)).includes("결과 보기"));

  head("F. 담당자가 다시 열어 주었다");
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     VALUES ($1,'CM_V3_CAMPUS_PRO','report','PRO','BIZ','ME_V3_2','active')`, [S2.id]);
  await p2.goto(`${BASE}/campus/${code}/start`, { waitUntil: "networkidle" });
  ok("단추가 `다시 검사 시작하기` 다",
    await p2.getByRole("button", { name: "다시 검사 시작하기" }).count() === 1);
  ok("`지난 결과 보기` 가 함께 선다",
    await p2.getByRole("link", { name: "지난 결과 보기" }).count() === 1);
  await shot(p2, "F-retake");
  await p2.getByRole("button", { name: "다시 검사 시작하기" }).click();
  await p2.waitForURL(/\/v3\/start/, { timeout: 30000 });
  await p2.waitForLoadState("networkidle");
  await p2.getByText("학부", { exact: true }).click();
  await p2.getByRole("button", { name: "검사 시작" }).click();
  await p2.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
  const a2 = await queryOne<{ id: string; university_code: string | null; ent: string | null }>(
    `SELECT a.id::text, a.university_code, e.product_code AS ent
       FROM v3_attempts a LEFT JOIN entitlements e ON e.id = a.entitlement_id
      WHERE a.user_id = $1 AND a.status = 'in_progress'`, [S2.id]);
  ok("다시 연 응시가 학교 응시이고 학교 이용권을 썼다",
    a2?.university_code === UNI && a2?.ent === "CM_V3_CAMPUS_PRO",
    `${a2?.university_code} · ${a2?.ent}`);

  head("G. 개인 이용권을 든 학교 학생");
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [S3.id]);
  const c3 = await newCtx();
  const p3 = await login(c3, `zzrbs3${stamp}`, S3.pw);
  await p3.goto(`${BASE}/v3/start`, { waitUntil: "networkidle" });
  ok("개인 시작 화면이 선다", path(p3) === "/v3/start", path(p3));
  await p3.getByText("학부", { exact: true }).click();
  await p3.getByRole("button", { name: "검사 시작" }).click();
  await p3.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
  const a3 = await queryOne<{ university_code: string | null; tier: string; ent: string | null }>(
    `SELECT a.university_code, a.tier, e.product_code AS ent
       FROM v3_attempts a LEFT JOIN entitlements e ON e.id = a.entitlement_id
      WHERE a.user_id = $1`, [S3.id]);
  ok("개인 응시이고 개인 이용권을 썼다",
    a3?.university_code === null && a3?.ent === "ME_V3_PRO_KR" && a3?.tier === "PRO",
    `${a3?.university_code} · ${a3?.ent} · ${a3?.tier}`);

  head("H. 개인 회원");
  await pP.getByText("학부", { exact: true }).click();
  await pP.getByRole("button", { name: "검사 시작" }).click();
  await pP.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
  const aP = await queryOne<{ university_code: string | null; tier: string }>(
    `SELECT university_code, tier FROM v3_attempts WHERE user_id = $1`, [P.id]);
  ok("개인 회원은 무료 등급 응시가 열린다", aP?.tier === "BASIC" && aP.university_code === null,
    `${aP?.tier} · ${aP?.university_code}`);

  head("I. 학과 쪽과 전공 목록");
  const c4 = await newCtx();
  const S4 = await makeStudent(`zzrbs4${stamp}`);
  await registerCampusStudent(S4.id, UNI, LEAF);
  const p4 = await login(c4, `zzrbs4${stamp}`, S4.pw);
  await p4.goto(`${BASE}/campus/${code}/d/${OTHER_LEAF}`, { waitUntil: "networkidle" });
  ok("다른 학과 쪽에서는 `등록된 학과로 가기`",
    await p4.getByRole("link", { name: /등록된 학과로 가기/ }).count() === 1);
  ok("다른 학과 쪽에 시작 단추가 서지 않는다",
    await p4.getByRole("button", { name: /검사 시작/ }).count() === 0);
  await shot(p4, "I-other-dept");
  await p4.goto(`${BASE}/campus/${code}/d/${LEAF}`, { waitUntil: "networkidle" });
  ok("등록된 학과 쪽에는 `검사 시작하기`",
    await p4.getByRole("button", { name: "검사 시작하기" }).count() === 1);
  await p1.goto(`${BASE}/campus/${code}/d/${LEAF}`, { waitUntil: "networkidle" });
  ok("푸는 중인 학생의 학과 쪽은 `이어하기`",
    await p1.getByRole("link", { name: /이어하기/ }).count() === 1);
  const c5 = await newCtx();
  const p5 = await c5.newPage();
  await p5.goto(`${BASE}/campus/${code}/login`, { waitUntil: "networkidle" });
  ok("학교 로그인 단추가 `로그인` 이다(누르면 로그인한다)",
    await p5.getByRole("button", { name: "로그인" }).count() === 1);

  await b.close();
  rows.unshift(`# 출시 차단 해소 · 학교 계정 시작 경로 (${new Date().toISOString()})`,
    `통과 ${pass} · 걸림 ${bad.length}`);
  writeFileSync(`${OUT}/report.md`, rows.join("\n") + "\n");
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
