/**
 * MAT 이 사람 없이 먼저 말을 거는가(2026-10-31 · 100% 자동화).
 *
 *   npm run mat:auto
 *
 * 기간권 끝 알림(10일 · 3일 · 당일)과 새로 겹치는 공고 알림이 쌓이는지, 같은 일로
 * 두 번 쌓이지 않는지, 기간권이 없는 분에게도 겹치는 공고 알림이 가는지, 기한이
 * 지난 자료 정리를 지우는지를 실제 DB 로 센다. 서버를 띄울 필요가 없다.
 */
import { loadEnv, makeStudent, cloneFinished } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { query, queryOne } from "../src/lib/db";
import { autoNudges, runAssistantTick } from "../src/lib/assistant/nudges";

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};
const count = async (u: string, kind: string) => (await queryOne<{ n: number }>(
  `SELECT count(*)::int n FROM assistant_nudges WHERE user_id = $1 AND kind = $2`, [u, kind]))?.n ?? 0;

async function main(): Promise<void> {
  /* 기간권이 3일 남은 분 */
  const a = await makeStudent("zz-auto-paid");
  await cloneFinished(a.id, "BASIC");
  await query(`DELETE FROM assistant_nudges WHERE user_id = $1`, [a.id]);
  await query(`DELETE FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [a.id]);
  await query(
    `INSERT INTO entitlements (user_id, kind, product_code, starts_at, ends_at, status)
     VALUES ($1, 'track', 'TRACK_30D', now() - interval '27 days', now() + interval '3 days', 'active')`, [a.id]);
  const r1 = await autoNudges(a.id, { paid: true });
  ok("끝나기 3일 전 알림이 쌓인다", r1.renew === 1 && await count(a.id, "renew") === 1);
  const r2 = await autoNudges(a.id, { paid: true });
  ok("같은 단계는 두 번 쌓이지 않는다", r2.renew === 0 && await count(a.id, "renew") === 1);
  const t = await queryOne<{ title: string; href: string }>(
    `SELECT title, href FROM assistant_nudges WHERE user_id = $1 AND kind = 'renew'`, [a.id]);
  ok("알림 문장과 가는 곳", /3일 남았습니다/.test(t?.title ?? "") && t?.href === "/me/track#plans", t?.title);

  /* 기간권이 없고 자료를 올린 분 + 이번 주에 새로 모인 겹치는 공고 */
  const b = await makeStudent("zz-auto-free");
  await cloneFinished(b.id, "BASIC");
  await query(`DELETE FROM assistant_nudges WHERE user_id = $1`, [b.id]);
  await query(`DELETE FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [b.id]);
  await query(`DELETE FROM research_docs WHERE user_id = $1`, [b.id]);
  await query(
    `INSERT INTO research_docs (user_id, core_code, sha256, file_kind, doc_type, title, data, terms)
     VALUES ($1, 'ME_CORE_V3', 'zz-auto-sha', 'pdf', 'paper', '양극재 코팅', '{"roles":[]}'::jsonb, $2::text[])`,
    [b.id, ["양극재", "실험계획법"]]);
  await query(`DELETE FROM v3_job_postings WHERE source = 'zz-auto'`);
  await query(
    `INSERT INTO v3_job_postings (source, source_ref, raw_requirements, mapping_grade)
     VALUES ('zz-auto', 'a1', ARRAY['양극재 공정 개발', '실험계획법 경험'], '보통')`);
  const tick = await runAssistantTick();
  ok("밤 당번이 기간권 없는 분에게도 겹치는 공고를 알린다", await count(b.id, "match") === 1, JSON.stringify(tick));
  const again = await autoNudges(b.id, { paid: false });
  ok("같은 주에는 다시 쌓이지 않는다", again.match === 0 && await count(b.id, "match") === 1);
  ok("기간권 없는 분에게 기간권 끝 알림은 가지 않는다", await count(b.id, "renew") === 0);

  /* 기한이 지난 자료 정리는 지운다 */
  await query(`UPDATE research_docs SET purge_after = now()::date - 1 WHERE user_id = $1`, [b.id]);
  await runAssistantTick();
  const left = (await queryOne<{ n: number }>(`SELECT count(*)::int n FROM research_docs WHERE user_id = $1`, [b.id]))?.n;
  ok("보관 기한이 지난 자료 정리를 지운다", left === 0, String(left));

  await query(`DELETE FROM v3_job_postings WHERE source = 'zz-auto'`);
  console.log(`\nMAT 자동 알림 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

void main();
