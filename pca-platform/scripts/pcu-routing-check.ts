/**
 * **자율전공학부 학생이 쓸 수 있는가**(규격 §32·§33).
 *
 * 그 자리는 우리가 아직 안 만든 자리가 아니라 **학생이 전공을 고르는
 * 자리**다. 그런데 계정을 발급하는 자리가 그 학과를 거절하고 있었다:
 * 명단을 올리면 줄마다 오류가 나고 **그 학부 학생에게는 계정이 나갈 길이
 * 아예 없었다.** 화면만 눌러 보면 드러나지 않는다 — 카드는 눌리고 전공
 * 목록도 서기 때문이다.
 *
 * 그래서 이 검사는 담당자가 하는 일부터 밟는다: 계정을 발급하고 · 그
 * 계정으로 들어가 · 전공을 고르고 · 응시가 열리는 자리까지.
 *
 * 세는 것 가운데 둘이 이 자리에서 가장 비싸다.
 *
 * - **자동으로 Core 를 배정하지 않는가.** 고르지 않았으면 Core 이름이
 *   화면에 서지 않고, 고른 전공이 바뀌면 응시의 Core 도 바뀐다
 * - **소속을 고친 전공으로 덮지 않는가.** 그 학생은 자율전공학부 소속이고
 *   고른 전공은 이 응시의 자다. 덮으면 담당자 명단에서 그 학부가 비고,
 *   **아직 전공을 고르지 않은 학생을 셀 자가 없어진다**
 *
 *   UI_BASE=http://127.0.0.1:3100 npm run pcu:routing
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
} from "./_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { clearCampusCohort, seedCampusCohort } from "./_campus-fixture";
import { hashPassword } from "../src/lib/password";
import { addStudentAccount } from "../src/lib/campus/manage";
import { campusStudentOf } from "../src/lib/campus/students";
import {
  allLeaves, coreOf, pickRequired, statusOf, university,
} from "../src/lib/campus/registry";
import { campusV3 } from "../src/lib/me-v3/campus";

const UNI = "PCU";
const REG = "sites/pca-platform/content/campus-universities.json";
const sha = (f: string) =>
  createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

/**
 * 감사 기록을 적을 담당자 하나.
 *
 * **`actor_id` 를 지어내지 않는다.** `audit_logs.actor_id` 가 `users` 를
 * 가리키는 외래키라, 없는 번호를 적으면 계정을 만드는 그 자리에서 터진다
 * (한 번 `0` 으로 적어 그렇게 멈췄다).
 */
async function auditActor(): Promise<{ id: string; login: string; pw: string }> {
  const name = "zzaudit-staff";
  const pw = "aud-" + Math.random().toString(36).slice(2, 12);
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다 (npm run pcu:org)`);
  const had = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [name]);
  const hash = await hashPassword(pw);
  let id = had?.id;
  if (id) {
    await query(`UPDATE users SET password_hash = $2, status = 'active' WHERE id = $1`,
      [id, hash]);
    await query(`DELETE FROM memberships WHERE user_id = $1`, [id]);
  } else {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'학과 담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [name, hash]);
    id = row?.id as string;
  }
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'org_admin')`,
    [id, org.id]);
  return { id: id as string, login: name, pw };
}

async function main(): Promise<void> {
  assertFreshServer();
  const before = sha(REG);
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);

  /* 전공을 고르는 자리와, 그 학생이 고를 수 있는 자리 둘 */
  const leaves = allLeaves(u);
  const route = leaves.find((r) => r.leaf.routing_only);
  if (!route) throw new Error("등록부에 전공을 고르는 자리가 없습니다");
  /* **Core 가 서로 다른 자리 둘을 고른다.** 앞에서 둘을 그냥 집으면 같은
     Core 를 쓰는 학과 둘이 걸려(국어국문과 일본학은 둘 다 어문 Core 다)
     `고른 전공이 다르면 Core 도 다르다` 가 아무것도 재지 못한다 */
  const ready = leaves.filter((r) => statusOf(u, r) === "READY" && coreOf(r.leaf));
  const picks: typeof ready = [];
  for (const r of ready) {
    if (picks.some((x) => x.leaf.core_code === r.leaf.core_code)) continue;
    picks.push(r);
    if (picks.length === 2) break;
  }
  if (picks.length < 2) {
    throw new Error("Core 가 서로 다른 자리가 둘 미만입니다"
      + " (V3_PREVIEW_OPEN 을 들고 띄운 서버가 필요합니다)");
  }
  for (const p of picks) assertPreviewServer(p.leaf.core_code ?? "");
  console.log(`\n  적어둠  고르는 자리 — ${route.college.name} ${route.leaf.name}`
    + ` (${route.leaf.code})`);
  console.log(`  적어둠  고를 자리 둘 — ${picks.map((p) => p.leaf.name).join(" · ")}`);

  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다 (npm run pcu:org)`);

  const boss = await auditActor();
  /**
   * **학교에 사람이 다섯은 있어야 학과 줄을 볼 수 있다**(§31).
   *
   * 집계는 학교 전체가 다섯에 못 미치면 아래 칸을 아예 만들지 않는다
   * (`too_few`). 그 상태로 `자율전공학부 줄이 선다` 를 재면 **가리는
   * 규칙이 맞게 돈 것을 집계의 잘못으로 적는다.** 그래서 작은 묶음을
   * 세우고 끝에서 치운다.
   */
  const cohort = await seedCampusCohort(UNI, "route");
  const sid = `zzroute${Date.now()}`;
  const made: string[] = [];
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    /* ── 1. 담당자가 자율전공학부 학생을 등록한다 ── */
    const r = await addStudentAccount(UNI, org.id, {
      student_id: sid, name: "자율전공 학생", email: null, login_id: sid,
      college_code: route.college.code, department_code: route.leaf.code,
    }, { userId: boss.id, role: "org_admin", orgId: Number(org.id) });
    ok("전공을 고르는 자리로도 계정이 발급된다", r.ok, r.why ?? "");
    if (!r.ok || !r.password) {
      throw new Error(`계정을 만들지 못했습니다: ${r.why ?? "까닭 없음"}`);
    }
    const who = await queryOne<{ id: string }>(
      `SELECT id::text FROM users WHERE login_id = $1`, [sid]);
    if (!who) throw new Error("발급한 계정을 찾지 못했습니다");
    made.push(who.id);
    /* 담당자 집계가 거르지 않게 — 시연 계정이면 명단에도 서지 않는다 */
    await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [who.id]);

    const mine = await campusStudentOf(who.id, UNI);
    ok("학교 안 신분이 적힌다", Boolean(mine), mine ? "적혔다" : "없다");
    ok("소속이 자율전공학부 그대로다",
      mine?.row.department_code === route.leaf.code,
      mine?.row.department_code ?? "없다");
    ok("Core 는 비어 있다 (자동 배정 0)",
      Boolean(mine && pickRequired(mine.ctx)), mine?.ctx.core_code || "비었다");

    /* ── 2. 그 계정으로 들어간 뒤의 화면 ── */
    const gate = gateCreds();
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...(gate ? { httpCredentials: gate } : {}),
    });
    const p = await login(ctx, sid, r.password);
    ok("발급한 계정으로 들어간다", !p.url().includes("/login"), p.url());

    const code = UNI.toLowerCase();
    await p.goto(`${BASE}/campus/${code}/start`, { waitUntil: "networkidle" });
    const body = (await p.locator("body").innerText()).replace(/\s+/g, " ");
    ok("전공을 고르라고 적는다", /전공을 고르|전공 고르기/.test(body));
    /* **`준비 중` 으로 적지 않는다**(§32). 그렇게 적으면 그 학부 학생이
       자기 차례를 기다리는 줄 알고 닫는다 */
    ok("준비 중으로 적지 않는다", !/준비 중|아직 검사를 시작할 수 없/.test(body));
    /* **`당신은 이 전공입니다` 로 정해 주지 않는다**(§33) */
    ok("전공을 정해 주지 않는다",
      !/당신은 .*전공|당신의 전공은|자동으로 배정/.test(body));
    ok("고른 전공이 정한다고 적는다", /고른 전공이 정합니다/.test(body));
    /* 아직 Core 이름이 서지 않는다 — 고르기 전에는 그 말을 할 수 없다 */
    const names = picks.map((x) => coreOf(x.leaf)?.name_ko ?? "");
    ok("고르기 전에는 Core 이름이 서지 않는다",
      names.every((n) => !n || !body.includes(`CareerMatri ${n}`)),
      names.join(" · "));

    /* ── 3. 전공을 고르고 응시를 연다 ── */
    const seen: string[] = [];
    for (const [i, want] of picks.entries()) {
      await p.goto(`${BASE}/campus/${code}/d/${want.leaf.code}`,
        { waitUntil: "networkidle" });
      const btn = p.locator('form button[type="submit"]').first();
      for (let t = 0; t < 2 && !/\/v3\//.test(p.url()); t += 1) {
        await btn.click({ timeout: 5000 }).catch(() => undefined);
        await p.waitForURL((x) => !/\/campus\//.test(new URL(x).pathname),
          { timeout: 20000 }).catch(() => undefined);
        await p.waitForLoadState("networkidle").catch(() => undefined);
      }
      /* **공통 시작 화면에서 학업 단계를 고른다.** 그 값은 routing 이 쓰는
         값이라 묻는 것이 맞고 등급과는 다른 자리다. 이 걸음을 모르고
         여기서 멈추면 **`응시가 열리지 않는다` 로 거꾸로 적게 된다** */
      if (/\/v3\/start/.test(p.url())) {
        await p.getByText("학부", { exact: true }).click({ timeout: 5000 })
          .catch(() => undefined);
        await p.getByRole("button", { name: "검사 시작" }).click({ timeout: 5000 })
          .catch(() => undefined);
        await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
        await p.waitForLoadState("networkidle").catch(() => undefined);
      }
      ok(`고른 전공으로 응시가 열린다 — ${want.leaf.name}`,
        /\/v3\/\d+/.test(p.url()), p.url());
      const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
      const row = await queryOne<{
        core: string; dept: string | null; col: string | null;
        uni: string | null; tier: string; spec: string | null;
      }>(`SELECT core_code core, department_code dept, college_code col,
                 university_code uni, tier, specialization_code spec
            FROM v3_attempts WHERE id = $1::bigint`, [att]);
      ok(`응시의 Core 가 고른 전공이다 — ${want.leaf.name}`,
        row?.core === want.leaf.core_code,
        `${row?.core ?? "없다"} / 고른 것 ${want.leaf.core_code}`);
      /* **소속은 자율전공학부 그대로다.** 고친 전공으로 덮으면 그 학부가
         담당자 명단에서 비고, 아직 안 고른 학생을 셀 자가 없어진다 */
      ok(`응시의 학과는 자율전공학부다 — ${want.leaf.name}`,
        row?.dept === route.leaf.code && row?.col === route.college.code
          && row?.uni === UNI,
        `${row?.dept ?? "없다"} · ${row?.col ?? "없다"}`);
      ok(`학교 응시라 PRO 로 열린다 — ${want.leaf.name}`,
        row?.tier === "PRO", row?.tier ?? "없다");
      ok(`고른 전공의 갈래가 적힌다 — ${want.leaf.name}`,
        (row?.spec ?? null) === (want.leaf.specialization ?? null),
        `${row?.spec ?? "없다"} / 등록부 ${want.leaf.specialization ?? "없다"}`);
      seen.push(row?.core ?? "");
      /* 다음 전공을 고를 수 있게 이 응시를 치운다: 끝내지 않은 응시가
         있으면 이어보기로 돌려보내는 것이 설계다(규격 §7) */
      if (i < picks.length - 1) {
        await query(`DELETE FROM v3_responses WHERE attempt_id = $1::bigint`, [att]);
        await query(`DELETE FROM v3_attempts WHERE id = $1::bigint`, [att]);
      }
    }
    /* **고른 것이 바뀌면 자도 바뀐다.** 같으면 어느 쪽이든 한 Core 로
       가는 것이고, 그것이 곧 자동 배정이다 */
    ok("고른 전공이 다르면 Core 도 다르다", seen[0] !== seen[1],
      seen.join(" · "));

    /* ── 4. 담당자 집계가 그 줄을 자율전공학부로 센다 ── */
    const v = await campusV3({ orgIds: [Number(org.id)], universityCode: UNI });
    const line = v.by_department.find((x) => x.key === route.leaf.code);
    ok("담당자 집계에 자율전공학부 줄이 선다", Boolean(line),
      line ? `${line.key} ${line.n ?? "가림"}` : "없다");
    await ctx.close();
  } finally {
    await browser.close();
    await clearCampusCohort(cohort.logins);
    for (const id of made) {
      await query(`DELETE FROM v3_responses WHERE attempt_id IN
        (SELECT id FROM v3_attempts WHERE user_id = $1::bigint)`, [id]);
      await query(`DELETE FROM v3_attempts WHERE user_id = $1::bigint`, [id]);
      await query(`DELETE FROM campus_students WHERE user_id = $1::bigint`, [id]);
      await query(`DELETE FROM memberships WHERE user_id = $1::bigint`, [id]);
      await query(`DELETE FROM entitlements WHERE user_id = $1::bigint`, [id]);
      await query(`DELETE FROM users WHERE id = $1::bigint`, [id]);
    }
  }
  /* **등록부를 한 바이트도 쓰지 않았다** */
  ok("등록부 지문이 그대로다", sha(REG) === before, `${before} → ${sha(REG)}`);

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) { for (const b of bad) console.log(`  - ${b}`); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
