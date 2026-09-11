/**
 * 증거 → 레벨 계산을 문서의 예제와 맞춰 본다.
 *   docs/metri/04_matching.md 3장
 *   「전산구조해석」 A+  →  2.0 × 1.00 × 0.95 = 1.90
 *   자기보고 "ANSYS 좀 함" →  1.5 × 0.60      = 0.90
 *                                        합 2.80
 */
import { query, queryOne } from "../../src/lib/db";
import { addEvidence, competencies, evidenceOf, removeEvidence } from "../../src/lib/evidence";

async function main() {
  const u = await queryOne<{ id: string }>(`SELECT id FROM users WHERE email = 'e2e@example.com'`);
  if (!u) throw new Error("테스트 사용자가 없습니다. metri:check 를 먼저 돌리세요.");
  await query(`DELETE FROM learner_evidence WHERE user_id = $1`, [u.id]);
  await query(`DELETE FROM learner_competency_levels WHERE user_id = $1`, [u.id]);

  const all = await competencies(u.id);
  console.log(`역량 ${all.length}개 · 1순위 직무 요구 ${all.filter((c) => c.required !== null).length}개`);
  console.log(`맨 위: ${all[0].name} (요구 ${all[0].required} · 중요도 ${all[0].criticality})`);

  const target = all[0];
  await addEvidence(u.id, {
    competencyId: target.id,
    sourceCode: "COURSE",
    refLabel: "전산구조해석 (ME412)",
    grade: "A+",
  });
  let now = (await competencies(u.id)).find((c) => c.id === target.id)!;
  console.log(`\n과목 A+ 하나 → 합 ${now.heldRaw} · 레벨 ${now.heldLevel}   (기대 1.9 / 2)`);

  await addEvidence(u.id, {
    competencyId: target.id,
    sourceCode: "SOFTWARE",
    refLabel: "ANSYS",
    grade: null,
  });
  now = (await competencies(u.id)).find((c) => c.id === target.id)!;
  console.log(`자기보고 추가 → 합 ${now.heldRaw} · 레벨 ${now.heldLevel}   (기대 2.8 / 3)`);

  // 성적을 비운 과목은 가장 낮은 계수여야 한다
  const other = all[1];
  await addEvidence(u.id, {
    competencyId: other.id,
    sourceCode: "COURSE",
    refLabel: "성적 안 적은 과목",
    grade: null,
  });
  const o = (await competencies(u.id)).find((c) => c.id === other.id)!;
  console.log(`\n성적 비운 과목 → 합 ${o.heldRaw}   (기대 2.0 × 0.35 × 0.95 = 0.66)`);

  // 상한 확인 — 같은 역량에 자격증을 여러 개 밀어 넣어도 6.0 을 안 넘는다
  for (let i = 0; i < 5; i++) {
    await addEvidence(u.id, {
      competencyId: target.id,
      sourceCode: "CERT",
      refLabel: `자격증 ${i + 1}`,
      grade: null,
    });
  }
  now = (await competencies(u.id)).find((c) => c.id === target.id)!;
  console.log(`\n자격증 5개 더 → 합 ${now.heldRaw} · 레벨 ${now.heldLevel}   (상한 6.0 / 레벨 5)`);

  // 지우면 되돌아가는지
  const rows = await evidenceOf(u.id);
  for (const r of rows.filter((r) => r.sourceCode === "CERT")) await removeEvidence(u.id, r.id);
  now = (await competencies(u.id)).find((c) => c.id === target.id)!;
  console.log(`자격증 전부 삭제 → 합 ${now.heldRaw} · 레벨 ${now.heldLevel}   (다시 2.8 / 3)`);

  // 증거가 0이 되면 행 자체가 사라져야 한다 — 0레벨과 "모름" 은 다르다
  for (const r of await evidenceOf(u.id)) await removeEvidence(u.id, r.id);
  const gone = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM learner_competency_levels WHERE user_id = $1`, [u.id]);
  console.log(`\n증거 전부 삭제 → 레벨 행 ${gone!.n}개   (기대 0 — 0레벨이 아니라 '모름')`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
