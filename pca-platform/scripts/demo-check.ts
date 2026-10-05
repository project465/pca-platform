/**
 * 시연 자료가 운영 지표에 섞이지 않는가.
 *
 * 운영 첫 화면이 `가입 48 · 매출 107,499원` 을 적고 있었는데 그 가운데
 * 한 줄도 손님이 아니었다. **첫 손님이 들어온 날 그 한 사람이 48명 뒤에
 * 숨는다.** 그래서 사람에게 칸을 하나 붙이고(`users.is_demo`), 지표를
 * 내는 자리가 전부 그 칸을 거르는지를 여기서 센다.
 *
 * **규칙을 사람 손에 맡기지 않았다**: 사용자를 만드는 스크립트가 스무
 * 개가 넘어서, 들어올 때 트리거가 한 번 본다. 그 트리거가 살아 있는지도
 * 여기서 확인한다.
 *
 *   DATABASE_URL=... npx tsx scripts/demo-check.ts
 */
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { adminOverview } from "../src/lib/admin-overview";
import { funnelReport, track } from "../src/lib/funnel";
import { briefing } from "../src/lib/ops";

const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });

async function main() {
  /* ── 1. 칸과 트리거가 있는가 ──────────────────────────────────── */
  const col = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_demo'`);
  ok("users.is_demo 칸", col?.n === "1");

  const trg = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM pg_trigger
      WHERE tgname = 'users_mark_demo' AND NOT tgisinternal`);
  ok("들어올 때 보는 트리거", trg?.n === "1");

  /* ── 2. 트리거가 실제로 표시하는가 ────────────────────────────── */
  const pw = await hashPassword("demo-check-1234");
  const mk = async (email: string | null, login: string | null) => {
    const r = await queryOne<{ id: string; is_demo: boolean }>(
      `INSERT INTO users (email, login_id, display_name, password_hash, status)
       VALUES ($1,$2,'시연검사',$3,'active')
       ON CONFLICT DO NOTHING
       RETURNING id::text, is_demo`, [email, login, pw]);
    return r;
  };
  await query(`DELETE FROM users WHERE display_name = '시연검사'`).catch(() => null);

  const seeded = await mk("demo-check@example.test", null);
  ok("시험용 주소는 시연으로 표시된다", seeded?.is_demo === true);

  const real = await mk("first.customer@gmail.test.kr", null);
  /* `.test.kr` 은 예약된 이름이 아니다. **진짜 손님의 주소가 걸리면 안 된다** */
  ok("손님 주소는 표시되지 않는다", real?.is_demo === false,
    real ? `is_demo=${real.is_demo}` : "만들지 못했다");

  const byId = await mk(null, "demo-999");
  ok("시드 아이디는 시연으로 표시된다", byId?.is_demo === true);

  /* ── 3. 지표가 그 칸을 거르는가 ───────────────────────────────── */
  const demoUsers = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM users WHERE is_demo`);
  const realUsers = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM users WHERE NOT is_demo
       AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = users.id)`);
  ok("DB 에 시연 자료가 있다", Number(demoUsers?.n ?? 0) > 0, `${demoUsers?.n}명`);

  const ov = await adminOverview("all");
  ok("한눈에: 가입이 시연을 빼고 센다",
    ov.b2c.signups === Number(realUsers?.n ?? 0),
    `화면 ${ov.b2c.signups} · 진짜 ${realUsers?.n}`);

  const demoPaid = await queryOne<{ n: string; sum: string }>(
    `SELECT count(*)::text AS n, coalesce(sum(o.amount),0)::text AS sum
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.status = 'paid' AND u.is_demo`);
  ok("DB 에 시연 결제가 있다", Number(demoPaid?.n ?? 0) > 0,
    `${demoPaid?.n}건 ${demoPaid?.sum}`);

  const realPaid = await queryOne<{ n: string; sum: string }>(
    `SELECT count(*)::text AS n, coalesce(sum(o.amount),0)::text AS sum
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.status = 'paid' AND NOT u.is_demo`);
  ok("한눈에: 결제 건수가 시연을 빼고 센다",
    ov.b2c.purchases === Number(realPaid?.n ?? 0),
    `화면 ${ov.b2c.purchases} · 진짜 ${realPaid?.n}`);
  ok("한눈에: 매출이 시연을 빼고 센다",
    ov.b2c.revenue === Number(realPaid?.sum ?? 0),
    `화면 ${ov.b2c.revenue} · 진짜 ${realPaid?.sum}`);

  /* ── 4. 퍼널도 거르는가 ──────────────────────────────────────── */
  const demoUser = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE is_demo LIMIT 1`);
  if (demoUser) {
    const before = (await funnelReport(365)).steps.find((s) => s.step === "pricing")?.people ?? 0;
    await track("pricing", { userId: demoUser.id });
    await track("pricing", { userId: demoUser.id });
    const after = (await funnelReport(365)).steps.find((s) => s.step === "pricing")?.people ?? 0;
    ok("퍼널: 시연 사람의 방문이 안 세어진다", before === after, `${before} → ${after}`);
  }

  /* ── 5. 아침 브리핑도 거르는가 ───────────────────────────────── */
  const br = await briefing(3650);
  ok("브리핑: 가입이 시연을 빼고 센다",
    br.people.signups <= Number(realUsers?.n ?? 0),
    `${br.people.signups}명`);
  ok("브리핑: 매출이 시연을 빼고 센다",
    br.sales.reduce((a, b) => a + b.sum, 0) === Number(realPaid?.sum ?? 0),
    `${br.sales.reduce((a, b) => a + b.sum, 0)}`);

  /* ── 6. 섞어 보기는 일부러 열 때만 ───────────────────────────── */
  const withDemo = await adminOverview("all", true);
  ok("일부러 켜면 시연까지 보인다",
    withDemo.b2c.signups > ov.b2c.signups,
    `${ov.b2c.signups} → ${withDemo.b2c.signups}`);

  await query(`DELETE FROM users WHERE display_name = '시연검사'`).catch(() => null);

  const bad = T.filter((t) => !t.pass);
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  console.log(`\n시연 자료 격리 ${T.length}가지 가운데 ${bad.length}가지가 걸렸다.`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
