/**
 * 글로벌 한 바퀴 — 영어로 사고 · 영어로 풀고 · 영어 결과지와 영어 PDF 까지.
 *
 * `phase2-report.ts` 가 한국어로 같은 길을 돈다. 여기서 더 보는 것은 셋이다.
 *
 *   1. 영어로 연 응시가 **영어 결과지**를 낸다(`report_language`·스냅샷 언어)
 *   2. 그 본문에 한국어가 **응시자가 적은 글 말고는** 남지 않는다
 *   3. 같은 응답이 두 언어에서 **같은 판정**을 낸다(§16: 글자만 갈린다)
 *
 * 그리고 싣는 순서를 정적으로 한 번 더 본다. 결과지 틀이 사전을 엔진보다
 * 뒤에 올리면 엔진 파일들이 번역 없는 함수를 붙들어 그 자리만 한국어로
 * 나가는데, 화면으로는 "거기만 한국어" 라서 눈에 잘 띄지 않는다.
 *
 *   BASE_URL=http://localhost:3100 DATABASE_URL=... npx tsx scripts/global-check.ts
 */
import { readFile } from "node:fs/promises";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { settlePayment, startCheckout } from "../src/lib/orders";
import { openGrants, openV2Attempt, saveAnswers, submitV2 } from "../src/lib/me-v2/attempt";
import { itemsFor, missingTranslations, missingScaleTranslations,
  missingFamilyTranslations } from "../src/lib/me-v2/bank";
import { saveProfile } from "../src/lib/me-v2/evidence";
import { generateReport, latestSnapshot } from "../src/lib/me-v2/render";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });

/** 한쪽으로 기울인 결정적인 응시자. 두 언어를 견주려면 같은 응답이어야 한다 */
const FILL = (it: { construct?: string; career_family_weights?: Record<string, number> }) => {
  const fam = Object.keys(it.career_family_weights ?? {});
  const hit = fam.includes("ME_DESIGN_PRODUCT") || fam.includes("ME_CAE_SIM");
  if (it.construct === "actual_work_interest") return hit ? 5 : 2;
  if (it.construct === "exposure") return hit ? 4 : 2;
  if (it.construct === "learning_intent") return hit ? 5 : 2;
  return 4;
};

/* **응시자가 적은 글은 영어판에서도 그대로 남는다.** 그것을 지키는지 보려고
   한국어 과목 이름 하나를 일부러 섞어 둔다. 이 이름은 사전에도 들어 있는
   낱말이라(전공지식 갈래 이름과 같다), 사전을 아무 데나 들이대면 영어
   결과지에서 'Mechanics of materials' 로 바뀌어 버린다 */
const MINE = "재료역학";

const EVIDENCE = {
  kinds: ["course", "project", "tool"],
  courses: ["Statics", MINE, "Finite element analysis"].map((n) => ({ n })),
  projects: [{
    id: "p1", title: "bracket weight reduction capstone", type: "capstone",
    period: { start: "2025-03", end: "2025-12" }, team_size: "4",
    my_role: "structural review", objective: "cut weight while holding stiffness",
    what_i_did: "turned the requirements into dimensions and compared three design options",
    decisions_i_made: "picked the rib layout and thickness that cost less to machine",
    tools: ["SolidWorks"], methods: ["load path", "mesh sensitivity"],
    outputs: ["drawing", "analysis report"], result: "",
    measurable_result: "15% margin against the allowable stress in test",
    difficulty: "", what_changed: "adopted as the final design", what_i_learned: "",
  }],
  tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used", where: "",
    why: "compare design options", exp_id: "p1", decision: "rib layout",
    output: "analysis report", validation: "compared against the allowable stress" }],
};

async function freshUser(email: string): Promise<string> {
  const pw = await hashPassword("global-dev-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`,
    [email, "global check", pw],
  );
  const id = u!.id;
  await query(`DELETE FROM attempts WHERE user_id = $1`, [id]);
  await query(`DELETE FROM entitlements WHERE user_id = $1`, [id]);
  await query(`DELETE FROM payments WHERE order_id IN
                 (SELECT id FROM orders WHERE user_id = $1)`, [id]);
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
    raw: { by: "global-check" },
  });
  const r = await settlePayment(ticket.providerPaymentId);
  if (!r.ok) throw new Error(`결제가 확정되지 않았다: ${r.reason}`);
}

/** 사고 · 열고 · 풀고 · 내는 한 바퀴. `lang` 이 응시에 적히는 글 언어다 */
async function playThrough(opts: {
  userId: string; code: string; site: string; lang: string;
  stage: "bachelor" | "master" | "phd" | "postdoc";
}): Promise<string> {
  await buy(opts.userId, opts.code);
  const g = (await openGrants(opts.userId))[0];
  if (!g) throw new Error("이용권이 없다");
  const a = await openV2Attempt({
    userId: opts.userId, entitlementId: g.entitlement_id, stage: opts.stage,
    siteId: opts.site, lang: opts.lang, targetCountry: null,
  });
  if (!a) throw new Error("응시가 열리지 않았다");
  const items = itemsFor(a.tier);
  const batch: Record<string, unknown> = {};
  for (const it of items) batch[it.item_id] = FILL(it);
  await saveAnswers(a.id, opts.userId, batch);
  if (!(await submitV2(a.id, opts.userId))) throw new Error("제출이 되지 않았다");
  return a.id;
}

type Judged = {
  lang: string; roles: string[]; states: string[]; coverage: string[];
  html: string; sheets: number; pdf: string | null; snapLang: string | null;
};

async function runOne(opts: {
  email: string; code: string; site: string; lang: string;
  stage: "bachelor" | "master" | "phd" | "postdoc"; withEvidence: boolean;
}): Promise<Judged> {
  const u = await freshUser(opts.email);
  const at = await playThrough({ userId: u, code: opts.code, site: opts.site,
    lang: opts.lang, stage: opts.stage });
  if (opts.withEvidence) {
    await saveProfile(u, {
      evidence: EVIDENCE as never,
      research: [],
      target: { target_org_type: "private_company" },
    });
  }
  const r = await generateReport({ attemptId: at, userId: u, baseUrl: BASE });
  if (!r.ok) throw new Error(`결과지를 만들지 못했다: ${r.reason}`);
  const snap = await latestSnapshot(at);
  const p = (snap?.payload ?? {}) as {
    result?: { report_language?: string; decision_table?: Record<string, string>[];
      role_evidence_coverage?: Record<string, unknown> };
    sheets?: number;
  };
  const res = p.result ?? {};
  return {
    lang: res.report_language ?? "", snapLang: snap?.interface_language ?? null,
    roles: (res.decision_table ?? []).map((x) => x.career_family_id),
    states: (res.decision_table ?? []).map((x) => x.status ?? x.decision_status ?? ""),
    coverage: Object.keys(res.role_evidence_coverage ?? {}).sort(),
    html: JSON.stringify(res), sheets: p.sheets ?? 0, pdf: r.pdfPath,
  };
}

/** 사전을 엔진보다 먼저 올리는가. 순서가 틀리면 그 자리만 한국어로 나간다 */
async function checkOrder(file: string, label: string): Promise<void> {
  const s = await readFile(file, "utf8");
  const at = (needle: string) => s.indexOf(needle);
  const i18n = at("assets/i18n.js");
  const dict = at("data/report-i18n.js");
  const engines = ["assets/stage.js", "assets/country.js", "assets/research.js",
    "assets/readiness.js", "assets/value-engine.js", "assets/coverage-engine.js",
    "assets/v2-report.js"].map(at).filter((x) => x >= 0);
  const first = Math.min(...engines);
  ok(`${label} 가 사전을 엔진보다 먼저 올린다`,
    i18n >= 0 && dict >= 0 && i18n < first && dict < first,
    `i18n ${i18n} · 사전 ${dict} · 첫 엔진 ${first}`);
}

async function main() {
  process.env.PAYMENTS_PROVIDER ??= "mock";

  const probe = await fetch(`${BASE}/pca/v2.html`).catch(() => null);
  if (!probe?.ok) {
    console.error(`결과지 엔진을 ${BASE}/pca/v2.html 에서 열 수 없다. ` +
      `서버를 띄우고 BASE_URL 을 맞춰 주십시오.`);
    process.exit(1);
  }

  /* ── 0. 문항 은행이 두 언어인가 ──────────────────────────────────── */
  ok("92문항 전부 영어판이 있다", missingTranslations("en").length === 0,
    `빠진 문항 ${missingTranslations("en").length}`);
  ok("척도 보기 전부 영어판이 있다", missingScaleTranslations("en").length === 0,
    `빠진 척도 ${missingScaleTranslations("en").length}`);
  ok("직무군 열여섯 전부 영어 이름이 있다", missingFamilyTranslations("en").length === 0,
    `빠진 직무군 ${missingFamilyTranslations("en").length}`);

  /* ── 1. 싣는 순서 ───────────────────────────────────────────────── */
  await checkOrder("public/me-v2/report-host.html", "플랫폼 결과지 틀");
  await checkOrder("sites/pca-platform/v2.html", "정적 결과지");

  /* ── 2. 글로벌 영어 한 바퀴 ─────────────────────────────────────── */
  const en = await runOne({ email: "global.en@example.test", code: "ME_V2_PRO_GL",
    site: "global", lang: "en", stage: "phd", withEvidence: true });

  ok("영어로 연 응시가 영어 결과지를 낸다", en.lang === "en", `report_language=${en.lang}`);
  ok("스냅샷이 그 언어를 적어 둔다", en.snapLang === "en", String(en.snapLang));
  ok("PDF 가 나온다", !!en.pdf && en.sheets > 0, `${en.sheets}장`);

  /* 결과 객체에 한국어가 남았는가. 응시자가 적은 글은 세지 않는다 */
  const text = en.html.split(MINE).join(" ");
  const han = [...new Set(text.match(/[가-힣][가-힣\s·]{0,24}/g) ?? [])];
  ok("영어 결과 객체에 한국어가 남지 않는다", han.length === 0,
    han.length ? han.slice(0, 4).map((x) => x.trim()).join(" | ") : "0군데");
  ok("응시자가 적은 과목 이름은 그대로 남는다", en.html.includes(MINE), MINE);

  /* ── 3. 한국 한 바퀴와 판정이 같은가 ───────────────────────────── */
  const ko = await runOne({ email: "global.ko@example.test", code: "ME_V2_PRO_KR",
    site: "kr", lang: "ko", stage: "phd", withEvidence: true });

  ok("한국어로 연 응시가 한국어 결과지를 낸다", ko.lang === "ko", `report_language=${ko.lang}`);
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  ok("직무 순서가 두 언어에서 같다", same(ko.roles, en.roles),
    `${ko.roles[0]} / ${en.roles[0]}`);
  ok("결정 상태가 두 언어에서 같다", same(ko.states, en.states), ko.states[0]);
  ok("증거 범위 키가 두 언어에서 같다", same(ko.coverage, en.coverage),
    `${ko.coverage.length}칸`);
  ok("쪽수가 두 언어에서 같은 범위다", Math.abs(ko.sheets - en.sheets) <= 2,
    `ko ${ko.sheets}장 · en ${en.sheets}장`);

  /* ── 4. 경험을 안 적은 영어 응시자 ─────────────────────────────── */
  const bare = await runOne({ email: "global.bare@example.test",
    code: "ME_V2_BASIC_GL", site: "global", lang: "en", stage: "bachelor",
    withEvidence: false });
  ok("경험이 없어도 영어 결과지가 나온다", bare.lang === "en" && bare.sheets > 0,
    `${bare.sheets}장`);
  const bareHan = [...new Set(bare.html.match(/[가-힣][가-힣\s·]{0,24}/g) ?? [])];
  ok("경험 없는 영어 결과지에도 한국어가 없다", bareHan.length === 0,
    bareHan.length ? bareHan.slice(0, 3).map((x) => x.trim()).join(" | ") : "0군데");

  report();
}

function report(): void {
  const bad = T.filter((x) => !x.pass);
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  console.log(bad.length ? `\n${bad.length}개가 걸렸다.` : "\n글로벌 한 바퀴 OK.");
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
