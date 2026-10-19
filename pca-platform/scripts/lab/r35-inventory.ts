/**
 * **R35 · 전체 제품 인벤토리.** 학생과 학교 담당자가 실제로 닿는 주요 경로를
 * 한 계정씩 들고 데스크톱과 모바일로 열어, 자리마다 **실제로 무엇이 서는지**를
 * 적는다. 고치지 않는다: 읽고 찍고 센다.
 *
 * 자리마다 적는 것: 상태코드 · 최종 주소(돌려보냈는가) · 큰 글씨 · 가로 넘침 ·
 * 안쪽 코드 · `준비 중` 표시 · 브라우저 오류 · 그림. 분류(작동 · 준비 중 · 오류 ·
 * 연결 누락)는 이 값으로 사람이 정한다: `준비 중` 은 그 화면이 스스로 그렇게
 * 적는 자리이고, 돌려보낸 자리는 어디로 갔는지까지 적는다.
 *
 * **운영 자료를 건드리지 않는다.** 로컬 DB 에서만 돌고 만든 사람은 끝에서 치운다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     OUT=var/r35/inventory npx tsx scripts/lab/r35-inventory.ts
 */
import { loadEnv, BASE, assertFreshServer, login, makeStudent, registerCampusStudent, fillExperience } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { query, queryOne } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/password";
import { appEnv } from "../../src/lib/env";

const OUT = process.env.OUT ?? "var/r35/inventory";
const SRC = process.env.SRC_ATTEMPT ?? "244";
const LEAF = process.env.LEAF ?? "PCU26_BIZ";
const VIEWS = { d: { width: 1440, height: 900 }, m: { width: 390, height: 844 } } as const;
const CODES: [RegExp, string][] = [
  [/\bZ[1-5]_[A-Z]/, "zone"], [/\bNOT_EXPLORED\b/, "NOT_EXPLORED"], [/\bTD\d{2}\b/, "TD"],
  [/_CORE_V\d/, "core"], [/\bPCU2[67]_[A-Z]/, "leaf"], [/\bSPEC_[A-Z]/, "spec"],
  [/\bINDUSTRY_[A-Z]/, "pack"], [/\bROLE_[A-Z]+_V\d/, "role"], [/\bJ[1-8]\b/, "J-axis"],
  [/undefined|NaN|\[object Object\]/, "raw"],
];
const SOON = /준비 중|아직 열려 있지 않|열리면 알려|준비하고 있|Coming soon/;

type Row = {
  who: string; route: string; view: string; status: number; final: string;
  h1: string; over: number; codes: string; soon: boolean; errors: number; shot: string;
  len: number; note: string;
};
const rows: Row[] = [];

async function staff(login_id: string): Promise<string> {
  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code='PCU'`);
  if (!org) throw new Error("PCU 기관 줄이 없습니다");
  const pw = "r35-" + Math.random().toString(36).slice(2, 12);
  const old = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [login_id]);
  let id = old?.id;
  if (id) {
    await query(`UPDATE users SET password_hash=$2, status='active' WHERE id=$1`, [id, await hashPassword(pw)]);
    await query(`DELETE FROM memberships WHERE user_id=$1`, [id]);
  } else {
    id = (await queryOne<{ id: string }>(
      `INSERT INTO users (login_id,email,display_name,password_hash,status,locale,is_demo,must_reset_pw)
       VALUES ($1,$1,'학과 담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [login_id, await hashPassword(pw)]))?.id;
  }
  await query(`INSERT INTO memberships (user_id,org_id,role) VALUES ($1,$2,'org_admin')`, [id, org.id]);
  return pw;
}

async function cloneCampus(userId: string): Promise<string> {
  const cols = `tier, core_code, market_code, education_stage, grad_field, assessment_version,
    item_bank_version, scoring_version, status, current_screen, opened_probe, opened_deep,
    fourth_reason, industry_pack, role_pack, started_at, last_saved_at, submitted_at,
    undergrad_core, industry_interest, role_interest, org_interest, university_code,
    college_code, department_code, specialization_code`;
  const id = (await queryOne<{ id: string }>(
    `INSERT INTO v3_attempts (user_id, ${cols}) SELECT $1, ${cols} FROM v3_attempts WHERE id=$2::bigint RETURNING id::text`,
    [userId, SRC]))?.id as string;
  for (const [t, c] of [
    ["v3_responses", "item_id, kind, value_int, value_text, answered_at, note_text"],
    ["v3_evidence_picks", "domain_code, slot, item_text"],
    ["v3_snapshots", "module_versions, response_quality, payload, result_model, result_model_version, result_copy_version"],
  ] as const) {
    await query(`INSERT INTO ${t} (attempt_id, ${c}) SELECT $1::bigint, ${c} FROM ${t} WHERE attempt_id=$2::bigint`, [id, SRC]);
  }
  await query(`UPDATE v3_snapshots SET result_model = jsonb_set(result_model,'{attempt_id}',to_jsonb($1::text))
                WHERE attempt_id=$1::bigint AND result_model IS NOT NULL`, [id]);
  return id;
}

async function visit(ctx: BrowserContext, who: string, route: string, view: "d" | "m", note = ""): Promise<void> {
  const p: Page = await ctx.newPage();
  await p.setViewportSize(VIEWS[view]);
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  let status = 0;
  try {
    const r = await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45000 });
    status = r?.status() ?? 0;
    await p.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
  } catch (e) { errs.push("goto: " + String(e).slice(0, 120)); }
  const final = new URL(p.url()).pathname + new URL(p.url()).search;
  const info = await p.evaluate(() => {
    const h = document.querySelector("h1")?.textContent?.trim()
      || document.querySelector("h2")?.textContent?.trim() || document.title;
    return {
      h1: (h ?? "").replace(/\s+/g, " ").slice(0, 70),
      over: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body?.innerText ?? "",
      len: document.documentElement.scrollHeight,
    };
  }).catch(() => ({ h1: "", over: 0, body: "", len: 0 }));
  const codes = CODES.filter(([re]) => re.test(info.body)).map(([, n]) => n).join(" ");
  const slug = (who + route).replace(/[^a-z0-9가-힣]+/gi, "_").slice(0, 80);
  const shot = `${slug}-${view}.png`;
  mkdirSync(OUT, { recursive: true });
  const ct = await p.evaluate(() => document.contentType).catch(() => "");
  if (ct.startsWith("text/html")) {
    await p.screenshot({ path: path.join(OUT, shot), fullPage: false }).catch(() => undefined);
  }
  rows.push({ who, route, view, status, final, h1: info.h1, over: info.over, codes,
    soon: SOON.test(info.body), errors: errs.length, shot, len: info.len, note });
  console.log(`  ${who.padEnd(7)} ${view} ${String(status).padEnd(3)} ${route.padEnd(36)} → ${final.slice(0, 40).padEnd(40)} ${info.h1.slice(0, 30)}${codes ? "  [코드 " + codes + "]" : ""}${info.over > 1 ? "  [넘침 " + info.over + "]" : ""}${errs.length ? "  [오류 " + errs.length + "]" : ""}`);
  if (errs.length) console.log("        " + errs.slice(0, 2).join(" | "));
  await p.close();
}

async function fetchBin(ctx: BrowserContext, who: string, route: string): Promise<void> {
  const r = await ctx.request.get(BASE + route, { timeout: 90000 }).catch(() => null);
  const ct = r?.headers()["content-type"] ?? "";
  const body = r ? await r.body() : Buffer.alloc(0);
  if (r && r.ok()) { mkdirSync(OUT, { recursive: true }); writeFileSync(path.join(OUT, (who + route).replace(/[^a-z0-9]+/gi, "_")), body); }
  rows.push({ who, route, view: "file", status: r?.status() ?? 0, final: route, h1: ct, over: 0, codes: "",
    soon: false, errors: 0, shot: "", len: body.length, note: "" });
  console.log(`  ${who.padEnd(7)} f ${String(r?.status() ?? 0).padEnd(3)} ${route.padEnd(36)} ${ct} ${body.length}B`);
}

async function main(): Promise<void> {
  if (appEnv() === "production") throw new Error("운영에서는 돌리지 않습니다");
  assertFreshServer();
  const stamp = Date.now().toString().slice(-6);
  const st = await makeStudent(`zzr35s${stamp}`);
  await registerCampusStudent(st.id, "PCU", LEAF);
  const att = await cloneCampus(st.id);
  const adminLogin = `zzr35a${stamp}`;
  const apw = await staff(adminLogin);
  const fresh = await makeStudent(`zzr35f${stamp}`);
  await registerCampusStudent(fresh.id, "PCU", LEAF);
  console.log(`\n── R35 인벤토리 · 학생 ${st.id}(응시 ${att}) · 새 학생 ${fresh.id} · 담당자 ${adminLogin}\n`);

  const b = await chromium.launch();
  try {
    /* 0. 로그인 전 */
    const anon = await b.newContext({ locale: "ko-KR" });
    for (const r of ["/", "/login", "/campus/pcu", "/campus/pcu/majors", `/campus/pcu/d/${LEAF}`,
                     "/campus/pcu/login", "/cores", "/pricing", "/sample", "/support",
                     "/legal/terms", "/legal/privacy", "/me", "/org/v3", `/v3/${att}/result`]) {
      for (const v of ["d", "m"] as const) await visit(anon, "anon", r, v);
    }
    await anon.close();

    /* 1. 결과까지 끝낸 학교 학생 */
    const sc = await b.newContext({ locale: "ko-KR" });
    const lp = await login(sc, `zzr35s${stamp}`, st.pw); await lp.close();
    {
      const p = await sc.newPage(); await p.setViewportSize(VIEWS.d);
      await fillExperience(p, "R35 인벤토리 경험").catch((e) => console.log("  경험 적기 실패", String(e).slice(0, 120)));
      await p.close();
    }
    const exp = await queryOne<{ id: string }>(`SELECT id::text FROM v3_experiences WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [st.id]);
    const STUDENT = ["/me", "/me/state", "/me/next", "/me/experience", "/me/experience/new",
      exp ? `/me/experience/${exp.id}/edit` : "", "/me/results", "/me/explore", "/me/region",
      "/me/apply", "/me/track", "/me/jobs", "/me/gap", "/my", "/my/account", "/my/results",
      "/my/assessments", "/my/evidence", "/my/applications", "/cores", "/v3/start",
      `/v3/${att}`, `/v3/${att}/intro`, `/v3/${att}/done`, `/v3/${att}/result`,
      "/campus/pcu", `/campus/pcu/d/${LEAF}`, "/campus/pcu/start", "/org/v3"].filter(Boolean);
    for (const r of STUDENT) for (const v of ["d", "m"] as const) await visit(sc, "student", r, v);
    await fetchBin(sc, "student", `/v3/${att}/result/pdf`);
    await sc.close();

    /* 2. 아직 검사 전인 학교 학생 */
    const fc = await b.newContext({ locale: "ko-KR" });
    const fp = await login(fc, `zzr35f${stamp}`, fresh.pw); await fp.close();
    for (const r of ["/me", "/me/state", "/me/next", "/me/experience", "/me/results", "/my", "/cores", "/v3/start", `/campus/pcu/d/${LEAF}`]) {
      for (const v of ["d", "m"] as const) await visit(fc, "fresh", r, v);
    }
    await fc.close();

    /* 3. 학교 담당자 */
    const ac = await b.newContext({ locale: "ko-KR" });
    const ap = await login(ac, adminLogin, apw); console.log(`  담당자 로그인 뒤 → ${new URL(ap.url()).pathname}`); await ap.close();
    for (const r of ["/org", "/org/v3", "/org/v3?college=", "/org/v3/students", "/org/v3/students/import",
                     "/org/v3/report", "/org/participants", "/org/cohorts", "/org/licenses",
                     "/org/insights", "/org/evidence-insights", "/org/reports", "/org/contract",
                     "/org/settings", "/me", `/v3/${att}/result`, "/admin"]) {
      for (const v of ["d", "m"] as const) await visit(ac, "admin", r, v);
    }
    for (const r of ["/org/v3/report.pdf", "/org/v3/export/students.csv", "/org/v3/export/departments.csv", `/v3/${att}/result/pdf`]) {
      await fetchBin(ac, "admin", r);
    }
    await ac.close();
  } finally {
    await b.close();
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "inventory.json"), JSON.stringify(rows, null, 1));
  const md = ["| 누구 | 경로 | 폭 | 상태 | 도착 | 큰 글씨 | 넘침 | 코드 | 준비중 | 오류 |", "|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.who} | \`${r.route}\` | ${r.view} | ${r.status} | \`${r.final}\` | ${r.h1.replace(/\|/g, "/")} | ${r.over > 1 ? r.over : ""} | ${r.codes} | ${r.soon ? "예" : ""} | ${r.errors || ""} |`)];
  writeFileSync(path.join(OUT, "inventory.md"), md.join("\n") + "\n");
  console.log(`\n  ${rows.length}줄 · ${path.join(OUT, "inventory.md")}`);
  /* 치운다 */
  for (const id of [st.id, fresh.id]) {
    await query(`DELETE FROM campus_students WHERE user_id=$1`, [id]).catch(() => undefined);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
