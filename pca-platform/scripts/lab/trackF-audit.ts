/**
 * **Track F 3차 · 학교 담당자의 내려받기가 접근 기록을 남기는가.**
 *
 * 명단 CSV · 학과 집계 CSV 를 담당자 세션으로 실제 라우트 함수에 부르고
 * `audit_logs` 를 센다. 기록이 안 되는 자리(표를 잠시 다른 이름으로 옮긴다)에서는
 * **파일이 나가지 않는지**도 본다. 운영 요약 PDF 는 그리는 브라우저와 서버가
 * 있어야 해서 여기서는 부르지 않는다(NOT VERIFIED · 코드 자리만 확인).
 *
 *   PGPORT=5433 DATABASE_URL=postgres:///cm_pcu_seed V3_PREVIEW_OPEN='*' \
 *     V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json \
 *     npx tsx scripts/lab/trackF-audit.ts
 *
 * 앞서 `trackD-seed.ts` 가 세운 담당자(`seed-pcu-admin` · `seed-pcu-inst` ·
 * `seed-zz-admin`)를 쓴다.
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { readFileSync } from "node:fs";
import path from "node:path";

const URL_ = process.env.DATABASE_URL ?? "";
if (process.env.PGPORT !== "5433" || !/^postgres(ql)?:\/\/\/cm_pcu_seed\b/.test(URL_)) {
  console.error(`격리 시드 DB(5433 · cm_pcu_seed)가 아니다: ${URL_}`); process.exit(2);
}
type Who = { id: string; name: string; locale: string; mustResetPw: boolean; role: string; memberships: { orgId: string; role: string }[] };
let WHO: Who | null = null;
class Redirect extends Error { constructor(public to: string) { super(`redirect ${to}`); } }
const fake = (file: string, exports: Record<string, unknown>): void => {
  const id = require.resolve(path.resolve(file));
  require.cache[id] = { id, filename: id, loaded: true, exports } as unknown as NodeModule;
};
fake("src/lib/session.ts", {
  currentUser: async () => WHO,
  requireUser: async () => { if (!WHO) throw new Redirect("/login"); return WHO; },
  requireRole: async (allowed: string[]) => {
    if (!WHO) throw new Redirect("/login");
    if (!allowed.includes(WHO.role)) throw new Redirect("/");
    return WHO;
  },
  roleInOrg: () => null,
});
/* eslint-disable @typescript-eslint/no-require-imports */
const { query, queryOne } = require("../../src/lib/db") as typeof import("../../src/lib/db");
const STU = require("../../src/app/org/v3/export/students.csv/route") as { GET: (r: Request) => Promise<Response> };
const DEP = require("../../src/app/org/v3/export/departments.csv/route") as { GET: (r: Request) => Promise<Response> };

let pass = 0, fail = 0;
const ok = (c: boolean, m: string, v = ""): void => {
  if (c) pass++; else fail++;
  console.log(`  ${c ? "통과" : "걸림"}  ${m}${v ? " — " + v : ""}`);
};
async function who(login: string): Promise<Who> {
  const u = await queryOne<{ id: string; org: string; role: string }>(
    `SELECT u.id::text id, m.org_id::text org, m.role FROM users u JOIN memberships m ON m.user_id=u.id WHERE u.login_id=$1`, [login]);
  if (!u) throw new Error(`${login} 이 없다: trackD-seed.ts 를 먼저 돌린다`);
  return { id: u.id, name: login, locale: "ko", mustResetPw: false, role: u.role, memberships: [{ orgId: u.org, role: u.role }] };
}
const count = async (action: string, actor: string): Promise<number> =>
  Number((await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM audit_logs WHERE action=$1 AND actor_id=$2::bigint`, [action, actor]))?.n ?? 0);

async function main(): Promise<void> {
  const admin = await who("seed-pcu-admin");
  const inst = await who("seed-pcu-inst");
  const zz = await who("seed-zz-admin");

  console.log("\nF1 명단 CSV 가 기록을 남긴다");
  WHO = admin;
  let b = await count("campus.export.students", admin.id);
  const r1 = await STU.GET(new Request("http://127.0.0.1/org/v3/export/students.csv?state=none&department=PCU26_BIZ"));
  const t1 = await r1.text();
  ok(r1.status === 200 && /csv/.test(r1.headers.get("content-type") ?? ""), "CSV 가 나간다", `${r1.status} · ${t1.split("\n").length}줄`);
  ok((await count("campus.export.students", admin.id)) === b + 1, "기록이 한 줄 늘었다");
  const row = await queryOne<{ actor_role: string; target_id: string; org_id: string; detail: Record<string, unknown> }>(
    `SELECT actor_role, target_id, org_id::text, detail FROM audit_logs WHERE action='campus.export.students' AND actor_id=$1::bigint ORDER BY id DESC LIMIT 1`, [admin.id]);
  ok(row?.target_id === "PCU" && row?.actor_role === "org_admin", "누가 · 어느 학교인지 적혔다", `${row?.actor_role} · ${row?.target_id} · org ${row?.org_id}`);
  ok(row?.detail?.department === "PCU26_BIZ" && row?.detail?.state === "none", "받아 간 범위가 적혔다", JSON.stringify(row?.detail));
  ok(!/@|이름|name|email/i.test(JSON.stringify(row?.detail ?? {})), "기록에 이름 · 메일이 없다");

  console.log("\nF2 학과 집계 CSV · 조회 담당자 · 다른 학교");
  b = await count("campus.export.departments", inst.id);
  WHO = inst;
  const r2 = await DEP.GET(new Request("http://127.0.0.1/org/v3/export/departments.csv"));
  await r2.text();
  ok(r2.status === 200, "조회 담당자도 집계 CSV 를 받는다", String(r2.status));
  ok((await count("campus.export.departments", inst.id)) === b + 1, "그 사람 이름으로 기록이 남는다");
  WHO = zz;
  const bz = await count("campus.export.students", zz.id);
  const r3 = await STU.GET(new Request("http://127.0.0.1/org/v3/export/students.csv"));
  await r3.text();
  const zrow = await queryOne<{ target_id: string }>(
    `SELECT target_id FROM audit_logs WHERE action='campus.export.students' AND actor_id=$1::bigint ORDER BY id DESC LIMIT 1`, [zz.id]);
  ok((await count("campus.export.students", zz.id)) === bz + 1 && zrow?.target_id === "ZZTEST", "다른 학교 담당자는 자기 학교로 기록된다", zrow?.target_id ?? "");

  console.log("\nF3 기록이 안 되면 파일이 나가지 않는다");
  WHO = admin;
  await query(`ALTER TABLE audit_logs RENAME TO audit_logs_f3`);
  let threw = "";
  try {
    const r = await STU.GET(new Request("http://127.0.0.1/org/v3/export/students.csv"));
    threw = `응답 ${r.status}`;
  } catch (e) { threw = `던짐: ${String((e as Error).message).slice(0, 60)}`; }
  finally { await query(`ALTER TABLE audit_logs_f3 RENAME TO audit_logs`); }
  ok(threw.startsWith("던짐"), "기록 실패 때 CSV 응답을 만들지 않는다", threw);

  console.log("\nF4 운영 요약 PDF (코드 자리)");
  const pdfSrc = readFileSync("src/app/org/v3/report.pdf/route.ts", "utf8");
  const iDone = pdfSrc.indexOf("[org-pdf] done"); const iAud = pdfSrc.indexOf("campus.export.report");
  const iResp = pdfSrc.indexOf("new Response(new Uint8Array(pdf)");
  ok(iAud > iDone && iAud < iResp, "뽑은 뒤 · 건네기 전에 기록한다(못 뽑은 날은 적지 않는다)");
  console.log("  NOT VERIFIED  PDF 를 실제로 뽑아 기록이 남는지(그리는 브라우저 · 서버가 필요하다)");

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
