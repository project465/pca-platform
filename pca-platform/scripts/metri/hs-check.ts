/**
 * 메트리 플러스 한 바퀴 — 결제 → 응시 → 채점 → 결과지.
 *
 * 대학판(metri:check)과 같은 길을 고교 상품으로 걷는다. 여기서 확인하는
 * 것은 두 가지다.
 *   1. REPORT_HS 를 산 사람에게 고교 문항 115개가 나가는가
 *      (대학판 253개가 나가면 상품·검사지 연결이 끊어진 것이다)
 *   2. 결과지가 직무가 아니라 전공으로 내려가는가
 *
 *   npm run metri:hs
 */
import { query, queryOne } from "../../src/lib/db";
import { openAttempt, questionPage, saveResponse, submitAttempt, PAGE_SIZE } from "../../src/lib/attempts";
import { score } from "../../src/lib/scoring";
import { buildReport } from "../../src/lib/report";
import { hashPassword } from "../../src/lib/password";

async function main() {
  const pw = await hashPassword("test-pass-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ('hs@example.com','테스트 고등학생',$1,'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id`, [pw]);
  const userId = u!.id;

  const o = await queryOne<{ id: string }>(
    `INSERT INTO orders (order_no, user_id, product_code, amount, status, paid_at)
     VALUES ('HS-0001',$1,'REPORT_HS',19000,'paid',now())
     ON CONFLICT (order_no) DO UPDATE SET status='paid' RETURNING id`, [userId]);
  await query(`INSERT INTO seats (contract_id, order_id, user_id, assigned_at)
               SELECT NULL,$1,$2,now()
               WHERE NOT EXISTS (SELECT 1 FROM seats WHERE order_id=$1)`, [o!.id, userId]);

  await query(`DELETE FROM attempts WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM test_sessions WHERE kind = 'solo' AND order_id = $1`, [o!.id]);

  const attempt = await openAttempt(userId);
  if (!attempt) throw new Error("좌석이 있는데 응시가 열리지 않았습니다");
  const key = await queryOne<{ k: string; n: number }>(
    `SELECT i.instrument_key AS k, i.item_count AS n
       FROM test_sessions ts JOIN instruments i ON i.id = ts.instrument_id
      WHERE ts.id = (SELECT session_id FROM attempts WHERE id = $1)`, [attempt.id]);
  console.log(`응시 열림 — 검사지 ${key!.k} · 문항 ${attempt.total}개`);
  if (key!.k !== "HS_V1") {
    throw new Error(`고교 상품을 샀는데 ${key!.k} 가 나왔습니다. products.track_code 를 확인하세요.`);
  }

  // 만들기를 좋아하고 꼼꼼한 학생. 기계·신소재에 높게, 코딩·산업에 낮게.
  const HIGH = new Set(["HS.ME", "HS.MSE"]);
  const LOW = new Set(["HS.CE", "HS.IE"]);
  const TRAIT: Record<string, number> = {
    QUALITY: 5, CHALLENGE: 4, INDEP: 4, STABLE: 3, COLLAB: 2, SPEED: 2,
  };
  for (let p = 1; p <= Math.ceil(attempt.total / PAGE_SIZE); p++) {
    for (const q of await questionPage(attempt, p)) {
      let v: number;
      if (q.itemKind === "attention") {
        const exp = await queryOne<{ e: number }>(
          `SELECT attention_expect AS e FROM questions WHERE id=$1`, [q.id]);
        v = exp!.e;
      } else {
        const ax = await queryOne<{ a: string | null }>(
          `SELECT axis_code AS a FROM questions WHERE id=$1`, [q.id]);
        const base = HIGH.has(q.areaCode!) ? 5 : LOW.has(q.areaCode!) ? 2 : 3;
        v = ax!.a ? Math.max(1, Math.min(5, Math.round((base + TRAIT[ax!.a]) / 2))) : base;
      }
      const opt = q.options.find((x) => x.orderNo === v)!;
      await saveResponse(attempt.id, userId, q.id, opt.id, 4200 + (q.orderNo % 7) * 300);
    }
  }

  const sub = await submitAttempt(attempt.id, userId);
  if (!sub.ok) throw new Error(`빠진 문항: ${sub.missing.join(",")}`);
  const s = await score(attempt.id);
  if (s.kind !== "major") throw new Error(`고교 응시인데 kind=${s.kind} 입니다`);

  console.log("\n계열 (문항이 직접 잰 것)");
  for (const a of s.areas) console.log(`  ${a.rank}. ${a.code} ${a.scaled}`);
  console.log("\n활동 8축 — 대학판과 같은 축이다");
  for (const a of [...s.axes].sort((x, y) => y.scaled - x.scaled)) console.log(`  ${a.code} ${a.scaled}`);
  console.log("\n업무성향");
  for (const t of [...s.traits].sort((x, y) => y.scaled - x.scaled)) console.log(`  ${t.code} ${t.scaled}`);
  console.log("\n전공 적합");
  for (const j of s.jobs)
    console.log(`  ${j.tier}군 ${j.code} ${j.fit} (A ${j.a} / P ${j.p}) 구간 ${j.band[0]}–${j.band[1]}`);
  console.log("\n품질", JSON.stringify(s.quality));

  const rep = await buildReport(attempt.id, userId);
  if (!rep) throw new Error("결과지를 만들 수 없습니다");
  if (rep === "pending") throw new Error("개인 결제 응시는 승인 없이 바로 열려야 합니다");
  if (rep.kind !== "major") throw new Error(`결과지 kind=${rep.kind}`);
  console.log(
    `\n결과지 OK — 계열 ${rep.areas.length} · 성향 ${rep.traits.length} · 축 ${rep.axes.length} · ` +
      `전공 ${rep.jobs.length} · 요구역량 ${rep.gaps.length}(고교판은 0이어야 한다)`);
  if (rep.gaps.length) throw new Error("고교판에 역량 격차가 나왔습니다");
  const tier1 = rep.jobs.filter((j) => j.tier === 1);
  console.log(`  1군 ${tier1.length}개: ${tier1.map((j) => `${j.name} ${j.fit}`).join(" · ")}`);
  console.log(`  1순위 계열 "${rep.areas[0].name}" ${rep.areas[0].scaled}`);
  console.log(`  성향 최고 "${[...rep.traits].sort((a, b) => b.scaled - a.scaled)[0].name}"`);

  // 영어 결과지도 이름이 코드로 새지 않는지
  const en = await buildReport(attempt.id, userId, "en");
  if (en === "pending" || !en) throw new Error("영어 결과지 실패");
  console.log(`  영어 1순위 "${en.jobs[0].name}" · 계열 "${en.areas[0].name}"`);
  // 코드가 새는 것만 보면 부족하다. 번역이 없으면 한국어로 떨어지는데,
  // 그것도 영문 결과지에서는 버그다. 한글이 섞여 있으면 실패로 본다.
  for (const [what, name] of [["전공", en.jobs[0].name], ["계열", en.areas[0].name],
                              ["성향", en.traits[0].name]] as const) {
    if (/[\uac00-\ud7a3]/.test(name)) throw new Error(`영문 결과지의 ${what} 이름이 한국어입니다: "${name}"`);
    if (/^HS\.|^[A-Z_.]{2,20}$/.test(name)) throw new Error(`영문 결과지에 코드가 그대로: "${name}"`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
