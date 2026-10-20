/**
 * **Track B 2차 · 자율전공학부 두 갈래를 실제 시작 동작으로 밟는다.**
 *
 * 2026(`PCU26_SELFDESIGN`)과 2027(`PCU27_SELFDESIGN`) 두 자리다. 화면을 띄울
 * 수 없으므로(Next 빌드 불가) 시작 폼이 부르는 **서버 액션 `startV3` 를 그대로**
 * 부르고 `next/navigation` 의 `redirect` 와 `next/headers` 의 `cookies` 만
 * 바꿔 끼운다. 학교 학생 확인 · 쿠키를 등록부로 다시 맞추기 · Core 를 고른
 * 전공에서 가져오기 · PRO 고정은 전부 제품 코드가 그대로 돈다.
 *
 *   PGPORT=5433 DATABASE_URL=postgres:///cm_iso_c V3_PREVIEW_OPEN='*' \
 *     V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json \
 *     OUT=docs/metri/review/tracks-r2/B npx tsx scripts/lab/trackB-routing.ts
 *
 * 세는 것(갈래마다):
 *   R1 전공을 고르기 전에는 응시가 열리지 않고 전공 고르기로 보낸다
 *   R2 고른 전공(쿠키)으로 열면 Core 는 고른 전공 · 학과는 자율전공학부 그대로 · PRO
 *   R3 자율전공 자리 자체를 고른 쿠키는 받지 않는다(다시 고르기로)
 *   R4 끝까지 풀고 제출하면 학교 집계의 자율전공학부 줄에 선다
 *   R5 고른 값을 바꿔 다시 눌러도 열린 응시의 전공은 바뀌지 않는다
 */
import { loadEnv, makeStudent, registerCampusStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const URL_ = process.env.DATABASE_URL ?? "";
if (process.env.PGPORT !== "5433" || !/^postgres(ql)?:\/\/\/cm_iso_c\b/.test(URL_)) {
  console.error(`격리 클러스터(5433 · cm_iso_c)가 아니다: ${URL_}`); process.exit(2);
}

type Who = { id: string; name: string; locale: string; mustResetPw: boolean; role: string; memberships: unknown[] };
let WHO: Who | null = null;
class Redirect extends Error { digest = "NEXT_REDIRECT"; constructor(public to: string) { super(`redirect ${to}`); } }
const jar = new Map<string, string>();
const fake = (file: string, exports: Record<string, unknown>): void => {
  const id = require.resolve(path.resolve(file));
  require.cache[id] = { id, filename: id, loaded: true, exports } as unknown as NodeModule;
};
fake("src/lib/session.ts", {
  currentUser: async () => WHO,
  requireUser: async () => { if (!WHO) throw new Redirect("/login"); return WHO; },
  requireRole: async () => WHO,
  roleInOrg: () => null,
});
const Module = require("node:module") as { _load: (r: string, ...a: unknown[]) => unknown };
const load0 = Module._load;
Module._load = function (req: string, ...rest: unknown[]) {
  if (req === "next/navigation") return { redirect: (to: string) => { throw new Redirect(to); }, notFound: () => { throw new Redirect("404"); } };
  if (req === "next/headers") {
    return {
      cookies: async () => ({
        get: (k: string) => (jar.has(k) ? { name: k, value: jar.get(k)! } : undefined),
        set: (k: string, v: string, o?: { maxAge?: number }) => { if (o?.maxAge === 0 || v === "") jar.delete(k); else jar.set(k, v); },
        delete: (k: string) => jar.delete(k),
      }),
      headers: async () => new Headers(),
    };
  }
  if (req === "next/cache") return { revalidatePath() {}, revalidateTag() {} };
  return load0.call(this, req, ...rest);
};

/* eslint-disable @typescript-eslint/no-require-imports */
const { query, queryOne } = require("../../src/lib/db") as typeof import("../../src/lib/db");
const S = require("../../src/lib/me-v3/runtime/session") as typeof import("../../src/lib/me-v3/runtime/session");
const START = require("../../src/app/v3/start/actions") as typeof import("../../src/app/v3/start/actions");
const C = require("../../src/lib/me-v3/campus") as typeof import("../../src/lib/me-v3/campus");
const { answerAll, PEOPLE } = require("../_v3-answer") as typeof import("../_v3-answer");

const OUT = process.env.OUT ?? "docs/metri/review/tracks-r2/B";
const rows: string[] = []; let pass = 0; const bad: string[] = [];
const ok = (what: string, cond: boolean, got = ""): void => {
  rows.push(`| ${cond ? "PASS" : "**FAIL**"} | ${what} | ${got.replace(/\|/g, "/")} |`);
  if (cond) pass++; else bad.push(what);
  console.log(`  ${cond ? "통과" : "걸림"}  ${what}${got ? " — " + got : ""}`);
};
const head = (t: string): void => { rows.push(`| | **${t}** | |`); console.log(`\n── ${t}`); };
const start = async (): Promise<string> => {
  const f = new FormData(); f.set("stage", "bachelor");
  try { await START.startV3(f); return "(돌려보내지 않음)"; } catch (e) { if (e instanceof Redirect) return e.to; throw e; }
};

async function branch(leaf: string, pickDept: string, pickCore: string, otherDept: string): Promise<void> {
  head(`${leaf} → 고른 전공 ${pickDept}`);
  const u = await makeStudent(`zztb-route-${leaf.toLowerCase()}`);
  await query(`UPDATE users SET is_demo=FALSE WHERE id=$1`, [u.id]);
  await registerCampusStudent(u.id, "PCU", leaf);
  WHO = { id: u.id, name: "자율", locale: "ko", mustResetPw: false, role: "student", memberships: [] };
  jar.clear();

  const to1 = await start();
  const n1 = Number((await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_attempts WHERE user_id=$1`, [u.id]))?.n);
  /* 학교 쿠키가 없으면 `startGate` 가 학교 시작 쪽으로 보내고, 그 쪽이
     자율전공 학생에게 `majors?pick=1` 을 세운다(`campus/[u]/start/page.tsx:69`) */
  ok("R1 전공을 고르기 전에는 응시를 열지 않고 학교 시작 쪽(전공 고르기 단추)으로 보낸다", to1 === "/campus/pcu/start" && n1 === 0, `${to1} · 응시 ${n1}`);

  jar.set("cm_campus", `PCU:${leaf}`);
  const to3 = await start();
  const n3 = Number((await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_attempts WHERE user_id=$1`, [u.id]))?.n);
  ok("R3 자율전공 자리 자체를 고른 쿠키는 받지 않는다(등록부가 응시 가능 자리로 보지 않는다)", to3 === "/campus/pcu/start" && n3 === 0, `${to3} · 응시 ${n3}`);

  jar.set("cm_campus", `PCU:${pickDept}`);
  const to2 = await start();
  const a = await queryOne<{ id: string; core_code: string; department_code: string; college_code: string; tier: string; university_code: string; specialization_code: string | null }>(
    `SELECT id::text, core_code, department_code, college_code, tier, university_code, specialization_code FROM v3_attempts WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [u.id]);
  ok("R2 고른 전공으로 응시가 열린다(시작 안내로 간다)", !!a && to2 === `/v3/${a.id}/intro`, to2);
  ok("R2 Core 는 고른 전공의 Core 다", a?.core_code === pickCore, `${a?.core_code}`);
  ok("R2 소속 학과는 자율전공학부 그대로 · 단과대학 APPENZELLER", a?.department_code === leaf && a?.college_code === "APPENZELLER", `${a?.college_code} · ${a?.department_code}`);
  ok("R2 학교 응시라 PRO 로 열린다", a?.tier === "PRO" && a?.university_code === "PCU", `${a?.tier} · ${a?.university_code}`);
  ok("R2 쿠키는 응시에 적힌 뒤 지워진다", !jar.has("cm_campus"));

  jar.set("cm_campus", `PCU:${otherDept}`);
  const to5 = await start();
  const a5 = await queryOne<{ n: string; c: string }>(`SELECT count(*)::text n, max(core_code) c FROM v3_attempts WHERE user_id=$1`, [u.id]);
  ok("R5 다른 전공을 다시 골라 눌러도 열린 응시의 전공은 그대로다", to5 === `/v3/${a!.id}` && a5?.n === "1" && a5?.c === pickCore, `${to5} · 응시 ${a5?.n} · ${a5?.c}`);

  const att = (await S.attemptOf(a!.id, u.id))!;
  await answerAll(att.core_code, att, u.id, PEOPLE[1]);
  await S.submit((await S.attemptOf(a!.id, u.id))!);
  const st = (await queryOne<{ s: string }>(`SELECT status s FROM v3_attempts WHERE id=$1`, [a!.id]))?.s;
  ok("R4 끝까지 풀고 제출하면 결과가 선다", st === "scored", st);
}

async function main(): Promise<void> {
  /* 지난 회차의 같은 계정을 치운다(시험 계정만) */
  await query(`DELETE FROM v3_attempts WHERE user_id IN (SELECT id FROM users WHERE login_id LIKE 'zztb-route-%')`);
  await query(`DELETE FROM campus_students WHERE user_id IN (SELECT id FROM users WHERE login_id LIKE 'zztb-route-%')`);
  await branch("PCU26_SELFDESIGN", "PCU26_BIZ", "BIZ_CORE_V1", "PCU26_EE");
  await branch("PCU27_SELFDESIGN", "PCU27_AISW_SOFTWARE", "CS_CORE_V1", "PCU27_NURSING");

  head("집계: 두 학생이 각자 자율전공학부 줄에 선다");
  const agg = await C.campusV3({ orgIds: [], universityCode: "PCU", withDemo: false });
  const sql26 = Number((await queryOne<{ n: string }>(`SELECT count(DISTINCT user_id)::text n FROM v3_attempts WHERE university_code='PCU' AND department_code='PCU26_SELFDESIGN'`))?.n);
  const sql27 = Number((await queryOne<{ n: string }>(`SELECT count(DISTINCT user_id)::text n FROM v3_attempts WHERE university_code='PCU' AND department_code='PCU27_SELFDESIGN'`))?.n);
  ok("자율전공학부 응시가 학교 집계에 들어간다(전체 시작 수 ≥ 2)", agg.started >= 2, `시작 ${agg.started}`);
  ok("두 자율전공 자리는 각각 한 사람이다(SQL)", sql26 === 1 && sql27 === 1, `2026 ${sql26} · 2027 ${sql27}`);
  ok("한 사람짜리 학과 칸은 수를 내지 않는다", agg.by_department.filter((d) => /SELFDESIGN/.test(d.key)).every((d) => d.n === null), JSON.stringify(agg.by_department.filter((d) => /SELFDESIGN/.test(d.key))));

  const total = pass + bad.length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "ROUTING_SELFDESIGN.md"), [
    "# Track B 2차 · 자율전공학부 두 갈래 (서버 액션 `startV3` 그대로)", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · DB \`${URL_}\` (격리 클러스터 5433)`,
    "- 바꿔 끼운 것: 로그인 세션 · `next/navigation` redirect · `next/headers` cookies(메모리). 나머지는 제품 코드.",
    "- 전공 목록 화면(`/campus/pcu/majors?pick=1`)의 모양과 쿠키를 적는 학과 쪽 화면은 **NOT VERIFIED**(Next 빌드 불가).", "",
    `**통과 ${pass} · 걸림 ${bad.length} / ${total}**`, "", "| 판정 | 확인 | 값 |", "|---|---|---|", ...rows, "",
    ...(bad.length ? ["## 걸린 것", "", ...bad.map((b) => `- ${b}`), ""] : []),
  ].join("\n"));
  console.log(`\n확인 ${total}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
