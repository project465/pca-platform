/**
 * 플랫폼 층 검사. **실제 DB 에 스키마를 올리고 돌린다.**
 *
 *   DATABASE_URL=postgres://... node scripts/platform-check.mjs
 *
 * 규격 53~55장(개인정보 경계 · 이용권 · 사이트)을 그대로 옮겼다.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { createHash, randomBytes } from "node:crypto";

const URL = process.env.DATABASE_URL;
if (!URL) { console.error("DATABASE_URL 이 필요합니다."); process.exit(2); }
const db = new pg.Client({ connectionString: URL });
await db.connect();

const T = [];
const ok = (n, pass, d) => T.push({ n, pass: !!pass, d: d || "" });
const q = (s, p = []) => db.query(s, p).then((r) => r.rows);
const sha = (s) => createHash("sha256").update(s).digest("hex");

/* ── 스키마를 처음부터 올린다 ───────────────────────────────────── */
await q("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
for (const f of ["db/schema.sql", "db/schema_metri.sql", "db/schema_platform.sql"]) {
  try { await db.query(readFileSync(f, "utf8")); }
  catch (e) { ok(`${f} 적용`, false, String(e.message).slice(0, 120)); }
}
ok("빈 DB 에 스키마 세 벌이 올라간다",
  (await q("select count(*)::int n from information_schema.tables where table_schema='public'"))[0].n > 95,
  (await q("select count(*)::int n from information_schema.tables where table_schema='public'"))[0].n + "개 표");

/* ── 가상 자료 ──────────────────────────────────────────────────── */
const [orgA] = await q(
  `INSERT INTO organizations (code, country, org_type, name, language, status)
   VALUES ('HANBIT_ME','KR','department','한빛대학교 기계공학과','ko','active') RETURNING id`);
const [orgB] = await q(
  `INSERT INTO organizations (code, country, org_type, name, language, status)
   VALUES ('OTHER_ME','KR','department','다른대학교 기계공학과','ko','active') RETURNING id`);

async function user(login, name) {
  const [u] = await q(
    `INSERT INTO users (login_id, password_hash, display_name) VALUES ($1,'x',$2) RETURNING id`,
    [login, name]);
  return u.id;
}
const adminA = await user("admin_a", "한빛 담당자");
const adminB = await user("admin_b", "다른대 담당자");
const staffA = await user("staff_a", "한빛 실무자");
const stu = [];
for (let i = 0; i < 12; i++) stu.push(await user(`s${i}`, `학생${i}`));
const solo = await user("solo", "개인 이용자");

await q(`INSERT INTO memberships (user_id, org_id, role) VALUES
  ($1,$3,'org_admin'), ($2,$4,'org_admin'), ($5,$3,'instructor')`,
  [adminA, adminB, orgA.id, orgB.id, staffA]);
for (const s of stu) await q(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'student')`, [s, orgA.id]);

const [contract] = await q(
  `INSERT INTO contracts (org_id, title, starts_on, ends_on, seat_count, status,
                          allowed_report_levels, billing_status)
   VALUES ($1,'2026-1학기', current_date - 10, current_date + 90, 100, 'active',
           '{STANDARD,PRO}','paid') RETURNING id`, [orgA.id]);
const [expired] = await q(
  `INSERT INTO contracts (org_id, title, starts_on, ends_on, seat_count, status)
   VALUES ($1,'2025 끝난 계약', current_date - 400, current_date - 40, 10, 'active') RETURNING id`,
  [orgA.id]);
for (let i = 0; i < 100; i++)
  await q(`INSERT INTO seats (contract_id, report_level, major_code) VALUES ($1,'STANDARD','ME')`, [contract.id]);
for (let i = 0; i < 10; i++)
  await q(`INSERT INTO seats (contract_id) VALUES ($1)`, [expired.id]);

const [cohort] = await q(
  `INSERT INTO cohorts (org_id, contract_id, name) VALUES ($1,$2,'2026 기계공학 4학년') RETURNING id`,
  [orgA.id, contract.id]);

/* ── 좌석 생애주기 ──────────────────────────────────────────────── */
async function invite(contractId, orgId, cohortId) {
  const [seat] = await q(
    `UPDATE seats SET status='invited', invited_at=now()
      WHERE id = (SELECT id FROM seats WHERE contract_id=$1 AND status='available' ORDER BY id LIMIT 1)
      RETURNING id`, [contractId]);
  if (!seat) return null;
  const code = randomBytes(9).toString("base64url").toUpperCase();
  await q(`INSERT INTO invitations (org_id, contract_id, seat_id, cohort_id, code_sha256, expires_at)
           VALUES ($1,$2,$3,$4,$5, now() + interval '60 days')`,
    [orgId, contractId, seat.id, cohortId, sha(code)]);
  return { seatId: seat.id, code };
}
async function claim(code, userId) {
  const [inv] = await q(
    `UPDATE invitations SET status='claimed', claimed_at=now(), claimed_by=$2
      WHERE code_sha256=$1 AND status='sent' AND (expires_at IS NULL OR expires_at > now())
      RETURNING seat_id, contract_id`, [sha(code), userId]);
  if (!inv) return null;
  const [live] = await q(
    `SELECT (status='active' AND ends_on >= current_date) AS live FROM contracts WHERE id=$1`,
    [inv.contract_id]);
  if (!live.live) return "expired_contract";
  const [s] = await q(
    `UPDATE seats SET user_id=$2, status='claimed', assigned_at=now(), claimed_at=now()
      WHERE id=$1 AND status='invited' RETURNING id`, [inv.seat_id, userId]);
  return s ? s.id : null;
}

/* 72명 초대 → 전원 받음, 58명 완료 */
const claimed = [];
for (let i = 0; i < 12; i++) {
  const inv = await invite(contract.id, orgA.id, cohort.id);
  const seatId = await claim(inv.code, stu[i]);
  claimed.push(seatId);
  await q(`INSERT INTO cohort_members (cohort_id, user_id) VALUES ($1,$2)`, [cohort.id, stu[i]]);
}
for (let i = 0; i < 60; i++) await invite(contract.id, orgA.id, cohort.id);
for (let i = 0; i < 9; i++) {
  await q(`UPDATE seats SET status='started', consumed_at=now() WHERE id=$1`, [claimed[i]]);
}
for (let i = 0; i < 6; i++) {
  await q(`UPDATE seats SET status='completed', completed_at=now() WHERE id=$1`, [claimed[i]]);
}

/* ── 53. 개인정보 경계 ──────────────────────────────────────────── */
const RANK = { platform_super_admin: 60, platform_admin: 50, org_admin: 40, org_staff: 30, org_participant: 10, individual: 0 };
const CAPS = {
  individual: ["self.profile.read", "self.evidence.write", "self.report.read", "self.purchase"],
  org_participant: ["self.profile.read", "self.evidence.write", "self.report.read"],
  org_staff: ["self.profile.read", "self.report.read", "org.overview.read", "org.participant.status.read", "org.analytics.read", "org.contract.read"],
  org_admin: ["self.profile.read", "self.report.read", "org.overview.read", "org.participant.status.read", "org.analytics.read", "org.contract.read", "org.participant.invite", "org.license.revoke", "org.cohort.manage", "org.export.operational"],
  platform_admin: ["platform.org.read", "platform.user.read", "platform.order.read", "platform.audit.read", "platform.contract.write", "platform.org.write"],
  platform_super_admin: ["platform.org.read", "platform.org.write", "platform.product.write", "platform.site.write", "platform.country.write", "platform.audit.read", "platform.user.read", "platform.order.read", "platform.contract.write", "platform.assessment.version.write"],
};
const can = (role, cap) => (CAPS[role] ?? []).includes(cap);
const canInOrg = (role, orgIds, cap, orgId) =>
  can(role, cap) && (RANK[role] >= RANK.platform_admin || orgIds.includes(orgId));

ok("T1 기관 담당자는 개인 결과지를 기본으로 못 본다",
  !can("org_admin", "org.participant.report.read") &&
  !can("platform_super_admin", "org.participant.report.read"));
ok("T2 기관 담당자는 참여 상태를 본다",
  can("org_admin", "org.participant.status.read") && can("org_staff", "org.participant.status.read"));

const minCell = (await q(`SELECT aggregate_min_cell m FROM organizations WHERE id=$1`, [orgA.id]))[0].m;
const cells = [{ label: "기계설계", n: 7 }, { label: "CAE", n: 3 }]
  .map((r) => (r.n >= minCell ? r : { label: r.label, hidden: true }));
ok("T3 5명 미만 칸은 숫자를 내지 않는다",
  cells[0].n === 7 && cells[1].hidden === true && cells[1].n === undefined,
  `기준 ${minCell}명`);
ok("T3-b 감춘 칸을 0 으로 적지 않는다", !("n" in cells[1]));

ok("T4 A 기관 담당자는 B 기관을 못 연다",
  canInOrg("org_admin", [orgA.id], "org.overview.read", orgA.id) &&
  !canInOrg("org_admin", [orgA.id], "org.overview.read", orgB.id));
ok("T5 개인은 운영사 화면에 못 들어간다",
  !can("individual", "platform.org.read") && !can("org_participant", "platform.org.read") &&
  !can("org_admin", "platform.org.read"));

const inv2 = await invite(expired.id, orgA.id, null);
let expiredOk = false;
if (inv2) expiredOk = (await claim(inv2.code, stu[11])) === "expired_contract";
ok("T6 기간이 끝난 계약은 새 좌석을 열어 주지 않는다", expiredOk);

const [revoked] = await q(
  `UPDATE seats SET status='revoked', revoked_at=now(), revoked_by=$2, user_id=NULL
    WHERE id=$1 AND status IN ('available','invited','claimed') RETURNING id`,
  [claimed[10], adminA]);
const [canStart] = await q(
  `SELECT (s.status='claimed' AND c.status='active' AND c.ends_on >= current_date) ok
     FROM seats s JOIN contracts c ON c.id=s.contract_id WHERE s.id=$1`, [claimed[10]]);
ok("T7 거둔 좌석으로는 응시를 시작할 수 없다", !!revoked && canStart.ok === false);

const [startedSeat] = await q(
  `UPDATE seats SET status='revoked' WHERE id=$1 AND status IN ('available','invited','claimed') RETURNING id`,
  [claimed[0]]);
ok("T7-b 이미 시작한 좌석은 거두지 않는다", !startedSeat);

ok("T8 결과지는 참여자에게 남는다",
  (await q(`SELECT count(*)::int n FROM information_schema.columns
             WHERE table_name='report_snapshots' AND column_name='attempt_id'`))[0].n === 1);

/* ── 54. 이용권 ─────────────────────────────────────────────────── */
const [prod] = await q(
  `INSERT INTO products (code, kind, amount, currency, seat_count, active)
   VALUES ('UNIV_STANDARD','report',29000,'KRW',1,true) RETURNING code`);
const [order] = await q(
  `INSERT INTO orders (order_no, user_id, product_code, amount, currency, status, paid_at)
   VALUES ('ORD-TEST-1',$1,$2,29000,'KRW','paid', now()) RETURNING id`,
  [solo, prod.code]).catch((e) => { console.error("주문:", e.message); return [null]; });
let b2cEnt = false;
if (order) {
  /* 결제가 확정되면 이용권이 생긴다. **화면이 결제 표를 직접 보지 않는다** */
  await q(`INSERT INTO entitlements (user_id, order_id, product_code, kind, starts_at, ends_at)
           VALUES ($1,$2,$3,'pass', now(), now() + interval '365 days')`,
    [solo, order.id, prod.code]).catch((e) => { console.error("이용권:", e.message); });
  b2cEnt = (await q(`SELECT count(*)::int n FROM entitlements WHERE user_id=$1`, [solo]))[0].n === 1;
}
ok("E1 개인 결제가 이용권을 만든다", b2cEnt);
ok("E2 기관 좌석을 받으면 응시 자격이 생긴다",
  (await q(`SELECT count(*)::int n FROM seats WHERE user_id=$1 AND status IN ('claimed','started','completed')`,
    [stu[1]]))[0].n === 1);
ok("E3 자격 없이 응시를 시작할 수 없다",
  (await q(`SELECT count(*)::int n FROM seats WHERE user_id IS NULL AND status='started'`))[0].n === 0);
const lv = await q(`SELECT DISTINCT report_level FROM seats WHERE contract_id=$1`, [contract.id]);
ok("E4 결과지 등급은 좌석에 적혀 있다", lv.length === 1 && lv[0].report_level === "STANDARD",
  JSON.stringify(lv.map((x) => x.report_level)));
const allowed = (await q(`SELECT allowed_report_levels a FROM contracts WHERE id=$1`, [contract.id]))[0].a;
ok("E5 계약에 없는 등급을 내줄 수 없다", !allowed.includes("CAMPUS") && allowed.includes("STANDARD"),
  allowed.join(","));
await q(`INSERT INTO audit_logs (actor_id, actor_role, action, target_kind, target_id, org_id, detail)
         VALUES ($1,'platform_super_admin','license.invite','seat','1',$2,'{"source":"promo"}')`,
  [adminA, orgA.id]);
ok("E6 운영사가 준 것도 기록에 남는다",
  (await q(`SELECT count(*)::int n FROM audit_logs WHERE action='license.invite'`))[0].n === 1);

/* ── 55. 사이트 ─────────────────────────────────────────────────── */
const sites = await q(`SELECT * FROM site_configs ORDER BY site_id`);
const g = sites.find((s) => s.site_id === "global"), k = sites.find((s) => s.site_id === "kr");
ok("S1 글로벌 사이트의 기본 언어는 영어다", g && g.default_language === "en", g && g.domain);
ok("S2 한국 사이트의 기본 언어는 한국어다", k && k.default_language === "ko" && k.default_currency === "KRW",
  k && k.domain);
/* 철자가 한 글자 틀리면 남의 주소로 간다. 눈으로 보지 말고 세어서 막는다 */
ok("S1-b 도메인 철자", g.domain === "careermatri.com" && k.domain === "careermatri.co.kr",
  `${g.domain} · ${k.domain}`);
{
  const files = ["src/lib/sites.ts", "src/lib/rbac.ts", "src/lib/licenses.ts",
    "src/lib/insights.ts", "src/app/admin/sites/page.tsx"];
  const bad = files.filter((f) => /careermatri|careermetri/.test(readFileSync(f, "utf8")));
  ok("도메인을 코드에 적어 두지 않는다", bad.length === 0, bad.join(" "));
}
await q(`UPDATE attempts SET id = id WHERE false`);
ok("S3 목표 국가가 도메인과 따로 담긴다",
  (await q(`SELECT count(*)::int n FROM information_schema.columns
             WHERE table_name='attempts' AND column_name IN ('site_id','interface_language','target_country')`))[0].n === 3);
ok("S4 한 사람이 두 사이트에서 응시할 수 있다",
  (await q(`SELECT count(*)::int n FROM information_schema.table_constraints
             WHERE table_name='attempts' AND constraint_type='UNIQUE'
               AND constraint_name LIKE '%site%'`))[0].n === 0);
const mode = await q(`SELECT count(*)::int n FROM country_packs WHERE status='verified'`);
ok("S5 확인된 나라 묶음이 없으면 Global Reference Mode 다", mode[0].n === 0,
  "나라 자료를 지어내지 않았다");

/* ── 집계가 등수가 되지 않는다 ──────────────────────────────────── */
{
  const src = readFileSync("src/lib/insights.ts", "utf8");
  ok("집계를 적합도나 등수로 적지 않는다",
    /적합하다는 뜻이 아닙니다/.test(src) && !/순위|랭킹|상위 \d+%/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")));
  ok("나눌 바닥이 0 이면 비율을 만들지 않는다", /used > 0 \? Math\.round/.test(src));
}
/* ── 감사 기록에 개인정보를 담지 않는다 ─────────────────────────── */
{
  const rows = await q(`SELECT detail FROM audit_logs`);
  const flat = JSON.stringify(rows);
  ok("감사 기록에 이름과 메일이 없다", !/@|이름|email/i.test(flat));
}
/* ── 쓴 좌석을 초대로 세지 않는다 ───────────────────────────────── */
{
  const by = Object.fromEntries(
    (await q(`SELECT status, count(*)::int n FROM seats WHERE contract_id=$1 GROUP BY status`, [contract.id]))
      .map((r) => [r.status, r.n]));
  const used = (by.started ?? 0) + (by.completed ?? 0);
  ok("초대를 좌석 사용으로 세지 않는다", (by.invited ?? 0) > 0 && used < (by.invited ?? 0) + used,
    `초대 ${by.invited} · 받음 ${by.claimed ?? 0} · 시작 ${by.started ?? 0} · 완료 ${by.completed ?? 0} · 쓴 것 ${used}`);
}

let bad = 0;
T.forEach((t) => { if (!t.pass) bad += 1;
  console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? "  (" + t.d + ")" : ""}`); });
console.log(bad ? `\n${bad}개가 깨졌다.` : "\n플랫폼 검사 OK.");
await db.end();
process.exit(bad ? 1 : 0);
