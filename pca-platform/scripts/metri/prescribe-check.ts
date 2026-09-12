/**
 * 과목 처방을 실제 DB 로 확인한다.
 *
 *   npm run metri:prescribe
 *
 * 보는 것 세 가지.
 *   1. 계열이 다른 학생에게 실제로 다른 과목이 나가는가
 *   2. 선수과목이 빠진 목록이 나오지 않는가 (신청할 수 없는 처방)
 *   3. 학점 합계가 학생이 실제로 신청할 수 있는 분량인가
 */
import { query, queryOne } from "../../src/lib/db";
import { prescribe } from "../../src/lib/prescribe";

async function show(attemptId: string, who: string) {
  const p = await prescribe(attemptId);
  if (!p) throw new Error(`${who}: 처방이 비었습니다`);
  console.log(`\n${"═".repeat(64)}\n${who} — 1군 ${p.majors.map(m => m.name).join(" · ")}`);
  console.log(`${"─".repeat(64)}`);

  console.log(`■ 1군 전부에 필요 (${p.shared.length}과목)`);
  for (const s of p.shared) {
    const tag = s.necessity === 3 ? "필수" : "권장";
    const flags = [s.csat ? "수능" : null, s.absoluteOnly ? "절대평가" : null,
                   s.addedForPrereq ? "선수" : null].filter(Boolean).join("·");
    console.log(`   [${tag}] ${s.name.padEnd(14)} ${s.groupName.padEnd(7)} ${s.credit}학점 ` +
                `${s.grade}학년 ${flags ? "("+flags+")" : ""}`);
    if (s.why) console.log(`          ${s.why}`);
  }
  if (p.split.length) {
    console.log(`\n■ 여기서 갈린다 (${p.split.length}과목)`);
    for (const s of p.split) {
      console.log(`   [${s.necessity === 3 ? "필수" : "권장"}] ${s.name.padEnd(14)} ` +
                  `→ ${s.forMajors.join(" · ")}`);
    }
  }
  console.log(`\n■ 학년별 (정원 학년당 ${p.byGrade[0]?.budget ?? 0}학점)`);
  for (const g of p.byGrade) {
    const over = g.credits > g.budget ? "  ← 정원 초과" : "";
    console.log(`   ${g.grade}학년  ${g.subjects.length}과목 ${g.credits}학점${over}  ` +
                g.subjects.map(s => s.name).join(", "));
    if (g.overflow.length) console.log(`          밀림: ${g.overflow.map(s=>s.name).join(", ")}`);
  }
  console.log(`   합계 ${p.totalCredits}학점${p.tooMany ? "  ← 계열을 먼저 좁혀야 한다" : ""}`);
  console.log(`\n■ 대학 권장`);
  for (const s of p.univPicks) {
    console.log(`   ${s.univ.map(u => u.univ).join(",")} — ${s.name}`);
  }
  for (const c of p.univChecks) {
    console.log(`   ${c.univ} — ${c.rule}: 지금 ${c.have}과목 ${c.met ? "✓ 충족" : `(${c.need - c.have}과목 더 필요)`}`);
  }

  // 신청할 수 없는 처방이 아닌지 확인한다
  const codes = new Set([...p.shared, ...p.split].map(s => s.code));
  const bad = [...p.shared, ...p.split].filter(s => s.prereq && !codes.has(s.prereq.code));
  if (bad.length) {
    throw new Error(`선수과목이 빠졌습니다: ` +
      bad.map(s => `${s.name}←${s.prereq!.name}`).join(", "));
  }
  return p;
}

async function main() {
  const attempts = await query<{ id: string; name: string; major: string }>(
    `SELECT a.id, u.display_name AS name,
            (SELECT mj.code FROM major_fit_scores f JOIN majors mj ON mj.id=f.major_id
              WHERE f.attempt_id=a.id ORDER BY f.rank_no LIMIT 1) AS major
       FROM attempts a JOIN users u ON u.id=a.user_id
       JOIN test_sessions ts ON ts.id=a.session_id
       JOIN instruments i ON i.id=ts.instrument_id
      WHERE i.instrument_key='HS_V1' AND a.status='scored'
      ORDER BY a.id DESC LIMIT 400`);
  if (!attempts.length) throw new Error("채점된 고교 응시가 없습니다. npm run metri:hs 를 먼저 돌리세요.");

  // 1군이 좁게 나온 응시자를 계열별로 하나씩, 그리고 1군이 넓은(계열이
  // 안 갈린) 응시자를 하나 골라 본다. 뒤엣것이 진짜 시험대다.
  const tier1 = await query<{ id: string; n: number }>(
    `SELECT attempt_id AS id, count(*)::int AS n FROM major_fit_scores
      WHERE COALESCE(tier, rank_no) = 1 GROUP BY attempt_id`);
  const width = new Map(tier1.map(r => [r.id, r.n]));
  const seen = new Set<string>();
  const picks: typeof attempts = [];
  for (const a of attempts) {
    if (!a.major || seen.has(a.major) || (width.get(a.id) ?? 9) > 3) continue;
    seen.add(a.major); picks.push(a);
    if (picks.length >= 3) break;
  }
  const flat = attempts.find(a => (width.get(a.id) ?? 0) >= 6);
  if (flat) picks.push(flat);

  const sets: string[][] = [];
  for (const a of picks) {
    const p = await show(a.id, `${a.name} (1순위 ${a.major})`);
    sets.push([...p.shared, ...p.split].map(s => s.code).sort());
  }

  console.log(`\n${"═".repeat(64)}\n판정`);
  const uniq = new Set(sets.map(s => s.join("|")));
  console.log(`  서로 다른 처방 ${uniq.size} / ${sets.length}  ` +
    (uniq.size === sets.length ? "✓ 계열마다 다른 과목이 나간다" : "✗ 계열이 달라도 같은 과목이 나간다"));
  if (uniq.size !== sets.length) throw new Error("처방이 계열을 가르지 못합니다");

  const q = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM hs_subjects`);
  console.log(`  과목표 ${q!.n}개 적재됨`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
