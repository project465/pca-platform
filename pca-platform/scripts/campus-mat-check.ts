/**
 * MAT 학교 단체 이용권이 약속대로 도는가. 실제 DB 로 센다.
 *
 *   npm run campus:mat
 *
 * 세는 것: 인원을 넘겨 열지 않는다 · 다른 학교 학생에게 열지 않는다 ·
 * 한 사람에게 두 번 열지 않는다 · 두 담당자가 같은 순간에 눌러도 인원을
 * 넘지 않는다 · 연 학생의 MAT 쪽이 실제로 열린다 · 개인으로 산 기간 뒤에
 * 이어 붙는다 · 닫힌 묶음과 기간이 지난 묶음으로는 열지 않는다 · 감사
 * 기록이 남는다. **끝에서 만든 줄을 지운다.**
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
import { query, queryOne } from "../src/lib/db";
import { closePool, createPool, grantMat, matUntilOf, poolsOf } from "../src/lib/campus/mat";
import { activeTrack } from "../src/lib/track";

let pass = 0, fail = 0;
const ok = (n: string, good: boolean, d = "") => {
  if (good) { pass++; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail++; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
};

async function studentsOf(uni: string, n: number): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT cs.user_id::text AS id FROM campus_students cs JOIN users u ON u.id = cs.user_id
      WHERE cs.university_code = $1 AND u.status = 'active'
        AND NOT EXISTS (SELECT 1 FROM entitlements e WHERE e.user_id = cs.user_id AND e.kind = 'track')
      ORDER BY cs.user_id LIMIT $2`, [uni, n]);
  return rows.map((r) => r.id);
}

async function main(): Promise<void> {
  const admin = await queryOne<{ id: string }>(
    `SELECT user_id::text AS id FROM memberships WHERE role = 'superadmin' ORDER BY user_id LIMIT 1`);
  if (!admin) throw new Error("superadmin 이 없습니다");
  const actor = { userId: admin.id, role: "org_admin", orgId: null };
  const UNI = process.env.UNI ?? "JJU";
  const OTHER = process.env.OTHER ?? "PCU";
  const mine = await studentsOf(UNI, 6);
  const other = await studentsOf(OTHER, 1);
  if (mine.length < 6 || !other.length) throw new Error(`학생이 모자랍니다 (${UNI} ${mine.length} · ${OTHER} ${other.length})`);
  const pools: string[] = [];
  const touched = [...mine, ...other];
  const until = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

  try {
    const bad = await createPool({ universityCode: "ZZNOPE", productCode: "CAMPUS_MAT_6M", seats: 3, grantUntil: until }, admin.id);
    ok("등록부에 없는 학교에는 인원을 넣지 않는다", !bad.ok, bad.why);
    const badP = await createPool({ universityCode: UNI, productCode: "TRACK_30D", seats: 3, grantUntil: until }, admin.id);
    ok("학교 이용권이 아닌 상품으로는 넣지 않는다", !badP.ok, badP.why);

    const a = await createPool({ universityCode: UNI, productCode: "CAMPUS_MAT_6M", seats: 2, grantUntil: until, memo: "검사" }, admin.id);
    ok("인원 2명 묶음을 만든다", a.ok && !!a.id);
    pools.push(a.id!);

    /* 개인으로 산 기간이 남은 학생: 그 뒤에 이어 붙어야 한다 */
    await query(
      `INSERT INTO entitlements (user_id, product_code, kind, status, starts_at, ends_at)
       VALUES ($1::bigint, 'TRACK_30D', 'track', 'active', now(), now() + interval '30 days')`, [mine[0]]);

    const g = await grantMat(UNI, a.id!, [mine[0], mine[1], mine[2], other[0]], actor);
    ok("인원만큼만 연다", g.ok && g.opened === 2 && g.short === 1, JSON.stringify(g));
    ok("다른 학교 학생은 건너뛴다", g.foreign === 1);
    const t0 = await activeTrack(mine[0]);
    const t1 = await activeTrack(mine[1]);
    ok("연 학생의 MAT 이 열린다", t1.on && t0.on);
    const ends = await query<{ product_code: string; s: string; e: string }>(
      `SELECT product_code, starts_at::text s, ends_at::text e FROM entitlements
        WHERE user_id = $1::bigint AND kind = 'track' ORDER BY starts_at`, [mine[0]]);
    const camp = ends.find((r) => r.product_code === "CAMPUS_MAT_6M");
    const own = ends.find((r) => r.product_code === "TRACK_30D");
    ok("개인으로 산 기간 뒤에 이어 붙는다", !!camp && !!own && Date.parse(camp.s) >= Date.parse(own.e) - 1000,
      camp && own ? `${own.e.slice(0, 10)} → ${camp.s.slice(0, 10)}` : "");
    const days = camp ? Math.round((Date.parse(camp.e) - Date.parse(camp.s)) / 86400_000) : 0;
    ok("6개월은 183일이다", days === 183, `${days}일`);
    const oth = await activeTrack(other[0]);
    ok("다른 학교 학생에게는 열리지 않는다", !oth.on);

    const again = await grantMat(UNI, a.id!, [mine[1]], actor);
    ok("같은 묶음으로 두 번 열지 않는다", again.opened === 0 && again.already === 1, JSON.stringify(again));
    const cnt = await queryOne<{ n: number }>(
      `SELECT count(*)::int n FROM entitlements WHERE campus_pool_id = $1::bigint`, [a.id]);
    ok("묶음의 줄 수가 인원을 넘지 않는다", cnt?.n === 2, `${cnt?.n}`);

    /* 두 담당자가 같은 순간에: 인원 1명에 서로 다른 두 학생 */
    const b = await createPool({ universityCode: UNI, productCode: "CAMPUS_MAT_12M", seats: 1, grantUntil: until }, admin.id);
    pools.push(b.id!);
    const [x, y] = await Promise.all([
      grantMat(UNI, b.id!, [mine[3]], actor), grantMat(UNI, b.id!, [mine[4]], actor)]);
    const nb = await queryOne<{ n: number }>(
      `SELECT count(*)::int n FROM entitlements WHERE campus_pool_id = $1::bigint`, [b.id]);
    ok("같은 순간에 눌러도 인원을 넘지 않는다", nb?.n === 1 && x.opened + y.opened === 1,
      `${x.opened}+${y.opened} · 줄 ${nb?.n}`);

    const left = (await poolsOf(UNI)).find((p) => p.id === b.id);
    ok("인원을 다 쓴 묶음은 열 수 없음으로 읽힌다", !!left && !left.open && left.left === 0);

    const c = await createPool({ universityCode: UNI, productCode: "CAMPUS_MAT_6M", seats: 5, grantUntil: until }, admin.id);
    pools.push(c.id!);
    await closePool(c.id!, admin.id);
    const closed = await grantMat(UNI, c.id!, [mine[5]], actor);
    ok("닫힌 묶음으로는 열지 않는다", !closed.ok, closed.why);
    await query(`UPDATE campus_mat_pools SET status = 'active', grant_until = current_date - 1 WHERE id = $1::bigint`, [c.id]);
    const old = await grantMat(UNI, c.id!, [mine[5]], actor);
    ok("열 수 있는 날이 지난 묶음으로는 열지 않는다", !old.ok, old.why);

    const wrong = await grantMat(OTHER, a.id!, [other[0]], actor);
    ok("다른 학교 이름으로 이 묶음을 쓰지 못한다", !wrong.ok, wrong.why);

    const until2 = await matUntilOf([mine[1], mine[5]]);
    ok("명단 칸이 연 학생만 날짜를 적는다", !!until2[mine[1]] && !until2[mine[5]]);

    const logs = await queryOne<{ n: number }>(
      `SELECT count(*)::int n FROM audit_logs WHERE action = 'campus.mat.grant'
        AND target_id = ANY($1::text[])`, [pools]);
    ok("연 일이 감사 기록에 남는다", (logs?.n ?? 0) >= 2, `${logs?.n}건`);
  } finally {
    await query(`DELETE FROM entitlements WHERE campus_pool_id = ANY($1::bigint[])`, [pools]);
    await query(`DELETE FROM entitlements WHERE user_id = ANY($1::bigint[]) AND product_code = 'TRACK_30D'
                  AND order_id IS NULL AND created_at > now() - interval '1 hour'`, [touched]);
    await query(`DELETE FROM audit_logs WHERE action LIKE 'campus.mat.%' AND target_id = ANY($1::text[])`, [pools]);
    await query(`DELETE FROM campus_mat_pools WHERE id = ANY($1::bigint[])`, [pools]);
  }
  console.log(`\nMAT 학교 이용권 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
