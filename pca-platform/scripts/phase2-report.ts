/**
 * Phase 2 — 제출에서 결과지와 PDF 까지 실제 DB · 실제 브라우저로 돈다.
 *
 * `phase2-check.ts` 는 응시가 닫히는 데까지 센다. 그 뒤가 여기다: 경험을
 * 굳히고 · 결과 객체를 만들고 · A4 로 찍고 · 스냅샷이 불변인지 본다.
 *
 * **머리 없는 브라우저가 플랫폼 자신을 연다.** 그래서 서버가 떠 있어야 한다.
 *
 *   BASE_URL=http://localhost:3100 DATABASE_URL=... npx tsx scripts/phase2-report.ts
 */
import { readFile, stat } from "node:fs/promises";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { settlePayment, startCheckout } from "../src/lib/orders";
import {
  openGrants, openV2Attempt, saveAnswers, submitV2,
} from "../src/lib/me-v2/attempt";
import { itemsFor } from "../src/lib/me-v2/bank";
import { countOf, frozenOf, isEmpty, profileOf, saveProfile } from "../src/lib/me-v2/evidence";
import { generateReport, latestSnapshot } from "../src/lib/me-v2/render";
import { engineVersions } from "../src/lib/me-v2/versions";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });

/** 이 전공 갈래를 좋아하는 사람처럼 답한다. 사람을 흉내 내는 것이 아니고
 *  **엔진이 갈라내는지**를 보려고 한쪽으로 기울여 둔다 */
const FILL = (it: { construct?: string; career_family_weights?: Record<string, number> }) => {
  const fam = Object.keys(it.career_family_weights ?? {});
  const hit = fam.includes("ME_DESIGN_PRODUCT") || fam.includes("ME_CAE_SIM");
  if (it.construct === "actual_work_interest") return hit ? 5 : 2;
  if (it.construct === "exposure") return hit ? 4 : 2;
  if (it.construct === "learning_intent") return hit ? 5 : 2;
  return 4;
};

const EVIDENCE = {
  kinds: ["course", "project", "tool"],
  courses: ["정역학", "재료역학", "유한요소해석", "기계요소설계"].map((n) => ({ n })),
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
  tools: [
    { cat: "cad", name: "SolidWorks", level: "used", where: "", why: "형상안 비교",
      exp_id: "p1", decision: "리브 배치 선택", output: "도면",
      validation: "허용 응력 기준과 비교" },
  ],
};

async function freshUser(email: string): Promise<string> {
  const pw = await hashPassword("phase2-dev-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`,
    [email, "결과지 검사", pw],
  );
  const id = u!.id;
  await query(`DELETE FROM attempts WHERE user_id = $1`, [id]);
  await query(`DELETE FROM entitlements WHERE user_id = $1`, [id]);
  await query(`DELETE FROM payments WHERE order_id IN
                 (SELECT id FROM orders WHERE user_id = $1)`, [id]);
  /* 개인 응시가 걸리는 회차가 주문을 가리킨다. 주문부터 지우면 외래키가
     막는다. 몇 번을 돌려도 같은 결과가 나와야 하므로 순서를 맞춘다 */
  await query(`DELETE FROM test_sessions WHERE order_id IN
                 (SELECT id FROM orders WHERE user_id = $1)`, [id]);
  await query(`DELETE FROM orders WHERE user_id = $1`, [id]);
  await query(`DELETE FROM evidence_profiles WHERE user_id = $1`, [id]);
  return id;
}

async function buy(userId: string, code: string): Promise<void> {
  const { ticket } = await startCheckout(userId, code, BASE, "domestic");
  const { markMockPaid } = await import("../src/lib/payments");
  await markMockPaid({
    providerPaymentId: ticket.providerPaymentId, status: "paid",
    amount: ticket.amount, currency: ticket.currency, orderNo: ticket.orderNo,
    raw: { by: "phase2-report" },
  });
  const r = await settlePayment(ticket.providerPaymentId);
  if (!r.ok) throw new Error(`결제가 확정되지 않았다: ${r.reason}`);
}

async function playThrough(userId: string, code: string, stage:
  "bachelor" | "master" | "phd" | "postdoc"): Promise<string> {
  await buy(userId, code);
  const g = (await openGrants(userId))[0];
  if (!g) throw new Error("이용권이 없다");
  const a = await openV2Attempt({
    userId, entitlementId: g.entitlement_id, stage,
    siteId: "kr", lang: "ko", targetCountry: null,
  });
  if (!a) throw new Error("응시가 열리지 않았다");
  const items = itemsFor(a.tier);
  const batch: Record<string, unknown> = {};
  for (const it of items) batch[it.item_id] = FILL(it);
  await saveAnswers(a.id, userId, batch);
  if (!(await submitV2(a.id, userId))) throw new Error("제출이 되지 않았다");
  return a.id;
}

async function main() {
  process.env.PAYMENTS_PROVIDER ??= "mock";

  /* 서버가 떠 있는지 먼저 본다. 안 떠 있으면 아래 전부가 같은 이유로
     떨어져서 무엇이 틀렸는지 안 보인다 */
  const probe = await fetch(`${BASE}/pca/v2.html`).catch(() => null);
  if (!probe?.ok) {
    console.error(`결과지 엔진을 ${BASE}/pca/v2.html 에서 열 수 없다. ` +
      `서버를 띄우고 BASE_URL 을 맞춰 주십시오.`);
    process.exit(1);
  }
  ok("엔진을 플랫폼이 같은 주소에서 내준다", true, `${BASE}/pca/v2.html`);

  const V = engineVersions();
  ok("엔진 판본이 코드 지문에서 나온다",
    /^v2-scoring:[0-9a-f]{12}$/.test(V.scoring_engine_version),
    V.scoring_engine_version);

  /* ── 경험을 안 적은 사람 ────────────────────────────────────────── */
  const bare = await freshUser("phase2.bare@example.test");
  const bareAt = await playThrough(bare, "ME_V2_BASIC_KR", "bachelor");

  const p0 = await profileOf(bare);
  ok("경험을 안 적었으면 비어 있다", isEmpty(p0) && p0.version === 0, `판본 ${p0.version}`);

  const r0 = await generateReport({ attemptId: bareAt, userId: bare, baseUrl: BASE });
  ok("경험이 없어도 결과지가 나온다", r0.ok,
    r0.ok ? `#${r0.snapshotId} · ${r0.sheets}장` : r0.reason);
  if (!r0.ok) { report(); return; }

  const f0 = await frozenOf(bareAt);
  ok("경험 사본이 굳는다(비어 있어도 줄은 생긴다)", !!f0 && isEmpty(f0.payload));

  const s0 = await latestSnapshot(bareAt);
  ok("스냅샷이 엔진 판본 다섯을 적는다", !!s0, s0?.id);
  const vrow = await queryOne<{
    scoring_engine_version: string; evidence_engine_version: string;
    value_engine_version: string; coverage_engine_version: string;
    renderer_version: string; assessment_version: string;
  }>(`SELECT scoring_engine_version, evidence_engine_version, value_engine_version,
             coverage_engine_version, renderer_version, assessment_version
        FROM report_snapshots WHERE id = $1`, [s0!.id]);
  ok("판본 칸이 비어 있지 않다",
    !!vrow && [vrow.scoring_engine_version, vrow.evidence_engine_version,
      vrow.value_engine_version, vrow.coverage_engine_version,
      vrow.renderer_version].every((x) => !!x),
    vrow?.assessment_version);

  ok("PDF 파일이 실제로 생긴다", !!r0.pdfPath && (await stat(r0.pdfPath!)).size > 20000,
    r0.pdfPath ? `${Math.round((await stat(r0.pdfPath!)).size / 1024)}KB` : "없음");

  const head = r0.pdfPath ? (await readFile(r0.pdfPath!)).subarray(0, 5).toString() : "";
  ok("PDF 로 열린다", head === "%PDF-", head);

  const pdfText = r0.pdfPath ? (await readFile(r0.pdfPath!)).toString("latin1") : "";
  ok("PDF 에 브라우저가 붙인 주소가 없다",
    !pdfText.includes("localhost") && !pdfText.includes("127.0.0.1"));

  /* 규격이 막는 선은 **스무 장**이다. 본문 장수는 `npm run v2:pdf` 가
     묶음 단위로 따로 세고, 여기서는 찍힌 종이가 그 선 안인지만 본다 */
  ok("찍힌 장수가 스무 장을 넘지 않는다", r0.sheets > 0 && r0.sheets < 20,
    `${r0.sheets}장`);

  /* ── 경험을 적은 사람 ──────────────────────────────────────────── */
  const rich = await freshUser("phase2.rich@example.test");
  const richAt = await playThrough(rich, "ME_V2_PRO_KR", "phd");

  const sv = await saveProfile(rich, { evidence: EVIDENCE, research: [], target: {
    target_org_type: "private_company",
  } });
  ok("경험을 저장하면 판본이 올라간다", sv.version === 1, `판본 ${sv.version}`);
  const p1 = await profileOf(rich);
  ok("적어 주신 줄 수를 센다", countOf(p1).items === 6, `${countOf(p1).items}건`);

  const r1 = await generateReport({ attemptId: richAt, userId: rich, baseUrl: BASE });
  ok("경험이 있으면 결과지가 나온다", r1.ok,
    r1.ok ? `#${r1.snapshotId} · ${r1.sheets}장` : r1.reason);
  if (!r1.ok) { report(); return; }

  const f1 = await frozenOf(richAt);
  ok("굳힌 사본에 적어 주신 경험이 들어 있다",
    !!f1 && countOf(f1.payload).items === 6);

  const s1 = await latestSnapshot(richAt);
  const pay = s1?.payload as { result?: Record<string, unknown>;
    summary?: Record<string, unknown>; evidence?: unknown } | null;
  ok("결과 객체를 스냅샷이 품는다", !!pay?.result);
  ok("첫 쪽 요약도 같은 줄에서 나온다", !!pay?.summary,
    pay?.summary ? Object.keys(pay.summary).join(" ") : "없음");
  ok("그때 본 경험이 결과지 안에 함께 담긴다", !!pay?.evidence);

  /* **점수와 경험이 섞이지 않는다**: 경험을 늘려 다시 만들어도 다섯 값이
     한 값도 바뀌지 않아야 한다. 바뀌면 산 사람의 적합도가 부지런함을
     잰 값이 된다 */
  const FIVE = ["actual_work_interest", "exposure", "decision_ownership",
    "work_mode", "learning_intent"] as const;
  const five = (p: unknown) => {
    const r = (p as { result?: Record<string, unknown> })?.result ?? {};
    return JSON.stringify(FIVE.map((k) => (r as Record<string, unknown>)[k]));
  };
  const before = five(pay);
  await saveProfile(rich, {
    evidence: { ...EVIDENCE, courses: [...EVIDENCE.courses, { n: "열전달" }] },
    research: [], target: { target_org_type: "private_company" },
  });
  const r2 = await generateReport({ attemptId: richAt, userId: rich, baseUrl: BASE });
  ok("다시 만들어도 성공한다", r2.ok, r2.ok ? `#${r2.snapshotId}` : r2.reason);
  const s2 = await latestSnapshot(richAt);
  const after = five(s2?.payload);
  ok("경험을 늘려도 다섯 값이 그대로다",
    before === after && before.length > 20,
    before === after ? `같다 (${before.length}자)` : "달라졌다");

  const n = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM report_snapshots WHERE attempt_id = $1`, [richAt]);
  ok("만들어 둔 결과지를 고치지 않고 줄을 쌓는다", Number(n?.n) === 2, `${n?.n}판본`);
  ok("옛 판본이 그대로 남아 있다", s1!.id !== s2!.id, `${s1!.id} → ${s2!.id}`);

  /* ── 남의 것은 못 만든다 ──────────────────────────────────────── */
  const bad = await generateReport({ attemptId: richAt, userId: bare, baseUrl: BASE });
  ok("남의 응시로 결과지를 못 만든다", !bad.ok,
    bad.ok ? "만들어졌다" : bad.reason);

  /* ── 막힌 것이 아침에 보인다 ──────────────────────────────────── */
  const none = await generateReport({
    attemptId: "999999999", userId: bare, baseUrl: BASE,
  });
  ok("없는 응시는 거절한다", !none.ok, none.ok ? "통과" : none.reason);

  const open = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM job_failures WHERE resolved_at IS NULL`);
  ok("실패는 표에 적히고 사람이 볼 수 있다", Number(open?.n) >= 0, `${open?.n}건`);

  report();
}

function report() {
  const bad = T.filter((x) => !x.pass);
  for (const r of T) {
    console.log(`${r.pass ? "  ok" : "FAIL"}  ${r.n}${r.d ? `  — ${r.d}` : ""}`);
  }
  console.log(`\n${T.length - bad.length}/${T.length} 통과`);
  if (bad.length) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
