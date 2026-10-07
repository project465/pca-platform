/**
 * **사람 입장에서 결과가 납득되는가.**
 *
 * 검사가 통과하는지가 아니라, 돈을 낸 사람이 결과지를 읽고 "그래서 이게
 * 왜 나왔는지" 를 스스로 설명할 수 있는지를 본다. 그래서 가짜 응시자를
 * 성격대로 여럿 만들어 **실제 엔진으로 끝까지 돌리고**, 나온 값을 그대로
 * 찍는다. 눈으로 읽고 판단하는 것이 이 스크립트의 목적이다.
 *
 * **점수를 고치지 않는다.** 여기는 읽는 자리다.
 *
 *   BASE_URL=http://127.0.0.1:3200 DATABASE_URL=... npx tsx scripts/persona-check.ts
 *   PERSONAS=A,B TIERS=BASIC ... 로 좁힐 수 있다
 */
import { writeFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { settlePayment, startCheckout } from "../src/lib/orders";
import { openGrants, openV2Attempt, saveAnswers, submitV2 } from "../src/lib/me-v2/attempt";
import { itemsFor } from "../src/lib/me-v2/bank";
import { saveProfile } from "../src/lib/me-v2/evidence";
import { generateReport, latestSnapshot } from "../src/lib/me-v2/render";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3200";
type Stage = "bachelor" | "master" | "phd" | "postdoc";
type Item = { item_id: string; construct?: string; scale?: string;
  career_family_weights?: Record<string, number> };

/**
 * 한 사람의 성격.
 *
 * `likes` 는 그 사람이 끌리는 직무군이고, `did` 는 실제로 해 본 것이다.
 * **둘을 따로 둔 것이 요점이다**: 관심과 경험이 갈리는 사람이 가장 흔하고,
 * 결과지가 그 둘을 구별해 적는지가 이 검사가 보는 것이다.
 */
type Persona = {
  key: string; name: string; stage: Stage;
  likes: string[];
  did: string[];
  /** 결정 소유 · 업무 방식 · 증거 품질의 기본 눈금 (1~5) */
  own: number; mode: number; evq: number;
  /** 경험을 적었는가. 적은 사람만 `evidence` 를 넘긴다 */
  /** `{evidence,research,target}` 의 `evidence` 칸에 들어가는 것 */
  evidence?: Record<string, unknown> | null;
  expect: string;
};

const EV_RICH = {
  kinds: ["course", "project", "tool"],
  courses: ["정역학", "재료역학", "기계요소설계", "유한요소해석"].map((n) => ({ n })),
  projects: [{
    id: "p1", title: "브래킷 경량화 캡스톤", type: "capstone",
    period: { start: "2025-03", end: "2025-12" }, team_size: "4",
    my_role: "구조 검토", objective: "강성 유지하며 무게 줄이기",
    what_i_did: "요구조건을 치수로 옮기고 하중 경로를 나눠 설계안 세 개를 비교했습니다",
    decisions_i_made: "가공비가 덜 오르는 쪽으로 리브 배치와 두께를 골랐습니다",
    tools: ["SolidWorks"], methods: ["하중 경로 분석", "메시 민감도", "수렴 확인"],
    outputs: ["도면", "해석 리포트"], result: "",
    measurable_result: "시험 결과 허용 응력 기준 대비 15% 여유",
    difficulty: "", what_changed: "최종 설계안으로 채택됐습니다", what_i_learned: "",
  }],
  tools: [{ cat: "cad", name: "SolidWorks", level: "used", where: "",
    why: "형상안 비교", exp_id: "p1", decision: "리브 배치 선택",
    output: "도면", validation: "허용 응력 기준과 비교" }],
};

const PERSONAS: Persona[] = [
  { key: "A", name: "CAD·기계요소설계 관심 + 설계 경험", stage: "bachelor",
    likes: ["ME_DESIGN_PRODUCT"], did: ["ME_DESIGN_PRODUCT"],
    own: 4, mode: 3, evq: 4, evidence: EV_RICH, expect: "기계설계" },
  { key: "B", name: "해석·시뮬레이션 관심 + 모델링 경험", stage: "master",
    likes: ["ME_CAE_SIM"], did: ["ME_CAE_SIM"],
    own: 4, mode: 3, evq: 4, evidence: EV_RICH, expect: "CAE·해석" },
  { key: "C", name: "열·유체·에너지 관심 + 실험/계산 경험", stage: "bachelor",
    likes: ["ME_THERMAL_FLUID"], did: ["ME_THERMAL_FLUID"],
    own: 3, mode: 3, evq: 3, evidence: EV_RICH, expect: "열·유체·에너지" },
  { key: "D", name: "재료·파손·물성 관심", stage: "master",
    likes: ["ME_MATERIALS"], did: ["ME_MATERIALS"],
    own: 3, mode: 3, evq: 3, evidence: EV_RICH, expect: "재료·파손" },
  { key: "E", name: "생산·공정·현장 개선 경험 많음", stage: "bachelor",
    likes: ["ME_PROCESS", "ME_MANUFACTURING"], did: ["ME_PROCESS", "ME_MANUFACTURING"],
    own: 4, mode: 2, evq: 4, evidence: EV_RICH, expect: "생산기술·공정기술" },
  { key: "F", name: "연구·논문 중심 대학원생", stage: "phd",
    likes: ["ME_RESEARCH_SCIENTIST", "ME_RND"], did: ["ME_RESEARCH_SCIENTIST", "ME_RND"],
    own: 5, mode: 4, evq: 5, evidence: EV_RICH, expect: "연구·R&D" },
  { key: "G", name: "관심은 높은데 경험이 거의 없는 학부생", stage: "bachelor",
    likes: ["ME_DESIGN_PRODUCT", "ME_CAE_SIM"], did: [],
    own: 1, mode: 3, evq: 1, evidence: null, expect: "관심과 경험 격차가 갈려 보여야" },
  { key: "H", name: "전 영역 중립 — 억지 추천이 없어야", stage: "bachelor",
    likes: [], did: [],
    own: 3, mode: 3, evq: 3, evidence: null, expect: "가짜 확신 없음" },
  /* 아래 넷은 STANDARD·PRO 에서만 의미가 있는 경계 사례다 */
  { key: "I", name: "경험은 많은데 관심이 낮음 (엇갈림)", stage: "master",
    likes: [], did: ["ME_MANUFACTURING", "ME_QUALITY_RELIABILITY"],
    own: 4, mode: 2, evq: 4, evidence: EV_RICH, expect: "관심-경험 엇갈림을 적어야" },
  { key: "J", name: "두 갈래가 똑같이 높음 (동률)", stage: "bachelor",
    likes: ["ME_DESIGN_PRODUCT", "ME_CAE_SIM"], did: ["ME_DESIGN_PRODUCT", "ME_CAE_SIM"],
    own: 3, mode: 3, evq: 3, evidence: EV_RICH, expect: "동률을 등수로 적지 않아야" },
  { key: "K", name: "모든 문항에 5 (묵종 응답)", stage: "bachelor",
    likes: ["*"], did: ["*"], own: 5, mode: 5, evq: 5, evidence: EV_RICH,
    expect: "전부 1군이 되면 쓸모가 없다" },
  { key: "M", name: "모든 문항에 1 (전부 아니라고)", stage: "bachelor",
    likes: [], did: [], own: 1, mode: 1, evq: 1, evidence: null,
    expect: "억지 추천 없음 + 응답 품질 안내" },
  { key: "L", name: "박사후연구원 · 응답은 학부생 G 와 같음", stage: "postdoc",
    likes: ["ME_DESIGN_PRODUCT", "ME_CAE_SIM"], did: [],
    own: 1, mode: 3, evq: 1, evidence: null,
    expect: "학위 때문에 Evidence 가 오르지 않아야" },
];

/** 그 사람이면 이 문항에 몇 점을 줄까 */
function answerOf(p: Persona, it: Item): unknown {
  const fams = Object.keys(it.career_family_weights ?? {});
  const hitLike = p.likes.includes("*") || fams.some((f) => p.likes.includes(f));
  const hitDid = p.did.includes("*") || fams.some((f) => p.did.includes(f));
  /* M 은 전 문항 1. 묵종(K)의 거울이다 */
  if (p.key === "M") return it.scale === "choice_multi2" ? [1] : it.scale === "choice_one" ? 1 : 1;
  switch (it.construct) {
    case "actual_work_interest": return hitLike ? 5 : p.likes.length ? 2 : 3;
    case "learning_intent": return hitLike ? 5 : p.likes.length ? 2 : 3;
    case "exposure": return hitDid ? 5 : p.did.length ? 2 : 1;
    case "decision_ownership":
    case "research_project_evidence": return p.own;
    case "work_mode": return p.mode;
    case "evidence_quality": return p.evq;
    default:
      /* 고르는 문항. 첫 보기를 고른다 — 여기서 재는 것은 적합도가 아니다 */
      return it.scale === "choice_multi2" ? [1] : 1;
  }
}

async function freshUser(email: string): Promise<string> {
  const pw = await hashPassword("persona-check-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status, locale)
     VALUES ($1,$2,$3,'active','ko')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`, [email, "페르소나", pw]);
  const id = u!.id;
  for (const q of [
    `DELETE FROM report_snapshots WHERE attempt_id IN (SELECT id FROM attempts WHERE user_id=$1)`,
    `DELETE FROM v2_responses WHERE attempt_id IN (SELECT id FROM attempts WHERE user_id=$1)`,
    `DELETE FROM attempts WHERE user_id=$1`,
    `DELETE FROM entitlements WHERE user_id=$1`,
    `DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id=$1)`,
    `DELETE FROM test_sessions WHERE order_id IN (SELECT id FROM orders WHERE user_id=$1)`,
    `DELETE FROM orders WHERE user_id=$1`,
    `DELETE FROM evidence_profiles WHERE user_id=$1`,
  ]) await query(q, [id]).catch(() => undefined);
  return id;
}

async function run(p: Persona, code: string): Promise<Record<string, unknown>> {
  const uid = await freshUser(`persona.${p.key.toLowerCase()}.${code}@example.test`);
  const { ticket } = await startCheckout(uid, code, BASE, "domestic");
  const { markMockPaid } = await import("../src/lib/payments");
  await markMockPaid({ providerPaymentId: ticket.providerPaymentId, status: "paid",
    amount: ticket.amount, currency: ticket.currency, orderNo: ticket.orderNo,
    raw: { by: "persona-check" } });
  const s = await settlePayment(ticket.providerPaymentId);
  if (!s.ok) throw new Error(`결제 실패 ${s.reason}`);
  const g = (await openGrants(uid))[0];
  const a = await openV2Attempt({ userId: uid, entitlementId: g.entitlement_id,
    stage: p.stage, siteId: "kr", lang: "ko", targetCountry: null });
  if (!a) throw new Error("응시가 열리지 않았다");
  const batch: Record<string, unknown> = {};
  for (const it of itemsFor(a.tier) as Item[]) batch[it.item_id] = answerOf(p, it);
  await saveAnswers(a.id, uid, batch);
  const sub = await submitV2(a.id, uid);
  if (!sub.ok) throw new Error(`제출 실패 ${JSON.stringify(sub)}`);
  if (p.evidence) await saveProfile(uid, { evidence: p.evidence, research: [], target: {} } as never);
  const r = await generateReport({ attemptId: a.id, userId: uid, baseUrl: BASE });
  if (!r.ok) throw new Error(`결과지 실패 ${r.reason}`);
  const snap = await latestSnapshot(a.id);
  const pay = snap!.payload as Record<string, unknown>;
  const sum = pay.summary as Record<string, unknown>;
  return { persona: p, tier: a.tier, attemptId: a.id,
    summary: sum, spread: sum.spread, result: pay.result, sheets: r.sheets };
}

async function main() {
  process.env.PAYMENTS_PROVIDER ??= "mock";
  const only = (process.env.PERSONAS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const tiers = (process.env.TIERS ?? "BASIC,STANDARD,PRO").split(",").map((x) => x.trim());
  const CODE: Record<string, string> = {
    BASIC: "ME_V2_BASIC_KR", STANDARD: "ME_V2_STANDARD_KR", PRO: "ME_V2_PRO_KR",
  };
  const out: Record<string, unknown>[] = [];
  for (const p of PERSONAS) {
    if (only.length && !only.includes(p.key)) continue;
    for (const t of tiers) {
      try {
        const got = await run(p, CODE[t]);
        out.push(got);
        console.log(`  ${p.key} ${t.padEnd(8)} OK  ${got.sheets}장`);
      } catch (e) {
        console.log(`  ${p.key} ${t.padEnd(8)} 실패  ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  const file = process.env.OUT ?? "/tmp/claude-0/personas.json";
  writeFileSync(file, JSON.stringify(out, null, 1));
  console.log(`\n${out.length}벌을 ${file} 에 적었다.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
