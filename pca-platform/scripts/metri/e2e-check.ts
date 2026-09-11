/** 결제 → 응시 → 채점 → 결과지까지 실제 DB 로 한 바퀴 돈다. */
import { query, queryOne } from "../../src/lib/db";
import { openAttempt, questionPage, saveResponse, submitAttempt, PAGE_SIZE } from "../../src/lib/attempts";
import { score } from "../../src/lib/scoring";
import { buildReport } from "../../src/lib/report";
import { hashPassword } from "../../src/lib/password";

async function main() {
  const pw = await hashPassword("test-pass-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ('e2e@example.com','테스트 학생',$1,'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id`, [pw]);
  const userId = u!.id;

  const o = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, status, paid_at)
     VALUES ('E2E-0001',$1,'REPORT_UNIV',29000,'paid',now())
     ON CONFLICT (order_no) DO UPDATE SET status='paid' RETURNING id`, [userId]);
  await query(`INSERT INTO seats (contract_id, order_id, user_id, assigned_at)
               SELECT NULL,$1,$2,now()
               WHERE NOT EXISTS (SELECT 1 FROM seats WHERE order_id=$1)`, [o!.id, userId]);

  // 이 스크립트는 몇 번을 돌려도 같은 결과가 나와야 한다. 앞선 판을 지운다.
  await query(`DELETE FROM attempts WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM test_sessions WHERE kind = 'solo' AND order_id = $1`, [o!.id]);

  const attempt = await openAttempt(userId);
  if (!attempt) throw new Error("좌석이 있는데 응시가 열리지 않았습니다");
  console.log(`응시 열림 id=${attempt.id} 문항=${attempt.total}`);

  // 설계·해석 쪽에 높게, 현장·공공 쪽에 낮게 답하는 가상 응시자
  const HIGH = new Set(["DESIGN_DEV", "AUTO_AERO", "RND_EDU"]);
  const LOW = new Set(["PUBLIC_ETC", "CONSTR_FACIL", "BIO_HEALTH"]);
  let answered = 0;
  for (let p = 1; p <= Math.ceil(attempt.total / PAGE_SIZE); p++) {
    for (const q of await questionPage(attempt, p)) {
      let v: number;
      if (q.itemKind === "attention") {
        const exp = await queryOne<{ e: number }>(
          `SELECT attention_expect AS e FROM questions WHERE id=$1`, [q.id]);
        v = exp!.e;                                   // 성실도 문항은 지시대로
      } else v = HIGH.has(q.areaCode!) ? 5 : LOW.has(q.areaCode!) ? 2 : 3;
      const opt = q.options.find((o) => o.orderNo === v)!;
      const r = await saveResponse(attempt.id, userId, q.id, opt.id, 4200 + (q.orderNo % 7) * 300);
      answered = r.answered;
    }
  }
  console.log(`응답 저장 ${answered}건`);

  const sub = await submitAttempt(attempt.id, userId);
  if (!sub.ok) throw new Error(`빠진 문항: ${sub.missing.join(",")}`);
  const s = await score(attempt.id);

  console.log("\n직무분야 상위 4");
  for (const a of s.areas.slice(0, 4)) console.log(`  ${a.rank}. ${a.code} ${a.scaled}`);
  console.log("직무분야 하위 2");
  for (const a of s.areas.slice(-2)) console.log(`  ${a.rank}. ${a.code} ${a.scaled}`);
  console.log("\n활동 8축");
  for (const a of [...s.axes].sort((x,y)=>y.scaled-x.scaled)) console.log(`  ${a.code} ${a.scaled}`);
  console.log("\n직무 적합 상위 3");
  for (const j of s.jobs.slice(0, 3))
    console.log(`  ${j.rank}. ${j.code} ${j.fit} (A ${j.a} / P ${j.p}) 구간 ${j.band[0]}–${j.band[1]}`);
  console.log("\n업무성향");
  for (const t of [...s.traits].sort((x,y)=>y.scaled-x.scaled)) console.log(`  ${t.code} ${t.scaled}`);
  console.log("\n품질", JSON.stringify(s.quality));

  const rep = await buildReport(attempt.id, userId);
  if (!rep) throw new Error("결과지를 만들 수 없습니다");
  if (rep === "pending") throw new Error("개인 결제 응시는 승인 없이 바로 열려야 합니다");
  console.log(`\n결과지 OK — 분야 ${rep.areas.length} · 성향 ${rep.traits.length} · 축 ${rep.axes.length} · 직무 ${rep.jobs.length} · 요구역량 ${rep.gaps.length}`);
  console.log(`  1순위 "${rep.jobs[0].name}" (${rep.jobs[0].areaName}) ${rep.jobs[0].fit}`);
  console.log(`  1순위 분야 "${rep.areas[0].name}" ${rep.areas[0].scaled}`);
  console.log(`  성향 최고 "${[...rep.traits].sort((a,b)=>b.scaled-a.scaled)[0].name}"`);
  console.log(`  요구역량 예시 "${rep.gaps[0]?.name}" 요구 ${rep.gaps[0]?.required} 보유 ${rep.gaps[0]?.held ?? "미확인"}`);

  // ---- 두 번째 응시자: 성향에 뚜렷한 색이 있는 사람 ----
  // 첫 응시자는 분야로만 갈려서 여섯 성향이 전부 같게 나왔다(P 가 50 으로
  // 평평해지는 것이 정답인 경우). 성향이 실제로 갈릴 때 P 가 직무마다
  // 달라지는지를 여기서 확인한다.
  await query(`DELETE FROM attempts WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM test_sessions WHERE kind = 'solo' AND order_id = $1`, [o!.id]);
  const a2 = await openAttempt(userId);
  const TRAIT_PICK: Record<string, number> = {
    INDEP: 5, QUALITY: 5, CHALLENGE: 4, SPEED: 2, COLLAB: 2, STABLE: 3,
  };
  for (let p = 1; p <= Math.ceil(a2!.total / PAGE_SIZE); p++) {
    for (const q of await questionPage(a2!, p)) {
      let v: number;
      if (q.itemKind === "attention") {
        const exp = await queryOne<{ e: number }>(
          `SELECT attention_expect AS e FROM questions WHERE id=$1`, [q.id]);
        v = exp!.e;
      } else {
        const ax = await queryOne<{ a: string | null }>(
          `SELECT axis_code AS a FROM questions WHERE id=$1`, [q.id]);
        v = ax!.a ? TRAIT_PICK[ax!.a] : HIGH.has(q.areaCode!) ? 5 : LOW.has(q.areaCode!) ? 2 : 3;
      }
      const opt = q.options.find((o) => o.orderNo === v)!;
      await saveResponse(a2!.id, userId, q.id, opt.id, 5200);
    }
  }
  const sub2 = await submitAttempt(a2!.id, userId);
  if (!sub2.ok) throw new Error("두 번째 응시가 덜 찼습니다");
  const s2 = await score(a2!.id);
  console.log("\n--- 성향이 뚜렷한 응시자 ---");
  console.log("성향 " + [...s2.traits].sort((x,y)=>y.scaled-x.scaled)
    .map(t=>`${t.code} ${t.scaled}`).join(" · "));
  console.log("직무 P 가 갈리는지");
  for (const j of s2.jobs) console.log(`  ${j.rank}. ${j.code} fit ${j.fit} (A ${j.a} / P ${j.p})`);
  const ps = new Set(s2.jobs.map((j) => j.p));
  console.log(ps.size > 1 ? `OK — P 가 ${ps.size}가지로 갈렸다` : "문제 — P 가 모든 직무에서 같다");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
