/**
 * 런칭 가드 — **오늘 켤 수 있는가.**
 *
 * `commercial:check` 가 "팔 수 있는 상태인가" 를 보고, 여기는 켜는 것을
 * 막는 자리를 본다. 규격 §32 가 요구한 열두 가지에 운영 보안(§30)과
 * 개인정보(§31)를 더했다.
 *
 * **두 가지를 섞지 않는다**(`commercial:check` 와 같은 규칙).
 *
 *   [깨짐]    우리가 끝낼 수 있는데 깨져 있다. 실패다
 *   [막힘]    우리 밖에서 정해져야 한다. 실패로 세지 않고 적는다
 *
 * 그리고 **실행할 수 있는 말로 적는다**: 무엇이 비었는지와 어디를 고치면
 * 되는지를 같은 줄에 둔다. "가격 미승인" 만 적으면 읽은 사람이 그다음에
 * 무엇을 할지 모른다.
 *
 *   DATABASE_URL=... npx tsx scripts/launch-check.ts
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { launchReport, AREAS, AREA_LABEL, type Area } from "../src/lib/launch";
import { tiersDistinct } from "../src/lib/tiers";
import { businessInfo } from "../src/lib/business";
import { supportConfig } from "../src/lib/support";

const T: { n: string; pass: boolean; fix?: string }[] = [];
const B: { area: Area; n: string; why: string; who: string }[] = [];
const ok = (n: string, pass: boolean, fix?: string) => T.push({ n, pass, fix });
/** **갈래를 붙여서 적는다**(규격 §9): 누가 고칠지가 갈래로 갈린다 */
const blocked = (area: Area, n: string, why: string, who: string) => {
  /* **같은 까닭을 두 번 적지 않는다.** 사업자 표시 한 가지가 시장마다
     한 줄씩 더 나오면 "스물한 가지" 가 되고, 읽은 사람은 할 일이 그만큼
     있는 줄 안다. 고칠 자리가 같으면 한 줄이다 */
  if (B.some((b) => b.area === area && b.why === why)) return;
  B.push({ area, n, why, who });
};

/** 파일을 통째로 훑어 금지한 것을 찾는다 */
function filesUnder(dir: string, ext: string[]): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => ext.some((e) => f.endsWith(e)))
    .map((f) => `${dir}/${f}`);
}

async function main() {
  /* ── 1. 런칭 표가 그대로 서는가 ─────────────────────────────────── */
  const r = await launchReport();
  ok("런칭 표가 두 시장을 따로 센다", r.markets.length === 2,
    "src/lib/launch.ts 의 markets");

  for (const m of r.markets) {
    for (const x of m.rows) {
      if (x.status !== "BLOCKED") continue;
      /* 우리가 못 끝내는 것은 막힘으로, 끝낼 수 있는데 깨진 것은 실패로 */
      if (x.who) blocked(x.area, `${m.market} ${x.label}`, x.detail, x.who);
      else ok(`${m.market} ${x.label}`, false, x.detail);
    }
  }

  /* ── 2. 가격: 지어낸 값이 없는가 ───────────────────────────────── */
  const prices = await query<{ code: string; amount: number; price_status: string }>(
    `SELECT code, amount, price_status FROM products WHERE assessment_version = 'ME_V2'`,
  ).catch(() => []);
  const lying = prices.filter((p) => p.price_status === "not_approved" && p.amount !== 0);
  ok("승인되지 않은 가격에 금액이 적혀 있지 않다", lying.length === 0,
    lying.map((p) => p.code).join(" · "));

  const approved = prices.filter((p) => p.price_status === "approved" && p.amount > 0);
  if (!approved.length) {
    blocked("PRICE", "가격 승인",
      `ME_V2 ${prices.length}개 등급의 값이 승인되지 않았습니다. ` +
      `db/schema_phase2_3.sql 에서 amount 와 price_status 를 함께 고칩니다.`,
      "사업 결정");
  }

  /* ── 3. 결제: 운영에서 가짜가 켜지지 않는가 ─────────────────────── */
  const provider = process.env.PAYMENTS_PROVIDER ?? "mock";
  /* **운영에서 mock 이 켜지면 서버가 뜨지 않아야 한다.** 코드가 그렇게
     짜여 있는지 여기서 실제로 불러 본다 */
  /* 판단은 `APP_ENV` 가 한다. **`NODE_ENV` 가 아니다**: 그 값은 빌드가
     최적화됐다는 뜻이고 staging 도 똑같이 production 으로 빌드된다 */
  const save = { app: process.env.APP_ENV, allow: process.env.ALLOW_MOCK_PAYMENTS };
  let refused = false;
  let stagingOpen = false;
  try {
    const env = process.env as Record<string, string | undefined>;
    env.APP_ENV = "production";
    /* **열쇠가 있는 자물쇠는 언젠가 열린다.** 옛 열쇠를 꽂아 두고도
       거절하는지 본다 */
    env.ALLOW_MOCK_PAYMENTS = "yes";
    const { paymentProvider } = await import("../src/lib/payments");
    try {
      const p = paymentProvider();
      refused = p.name !== "mock";
    } catch { refused = true; }

    /* staging 에서는 열려야 한다. 안 열리면 공개 전 QA 를 못 한다 */
    env.APP_ENV = "staging";
    try { stagingOpen = paymentProvider().name === "mock"; } catch { stagingOpen = false; }
  } finally {
    const env = process.env as Record<string, string | undefined>;
    if (save.app === undefined) delete env.APP_ENV; else env.APP_ENV = save.app;
    if (save.allow === undefined) delete env.ALLOW_MOCK_PAYMENTS;
    else env.ALLOW_MOCK_PAYMENTS = save.allow;
  }
  ok("운영에서 가짜 결제가 거절된다", refused,
    "APP_ENV=production 에서는 옛 열쇠(ALLOW_MOCK_PAYMENTS)로도 안 열린다");
  ok("staging 에서는 가짜 결제가 열린다", stagingOpen,
    "공개 전 QA 가 막히면 안 된다");

  if (provider === "mock") {
    blocked("PAYMENT", "결제 대행사",
      "PAYMENTS_PROVIDER 가 mock 입니다. 가맹점 심사가 끝나면 " +
      "LAUNCH.md 의 다섯 줄을 .env 에 넣습니다.",
      "결제 대행사·심사");
  }

  /* ── 4. 도메인: 한 철자이고 staging 이 메일에 안 들어가는가 ──────── */
  const sites = await query<{ domain: string }>(
    `SELECT domain FROM site_configs WHERE active`,
  ).catch(() => []);
  const spells = new Set(
    sites.map((s) => (s.domain.match(/careerm[ae]tri/) ?? [""])[0]).filter(Boolean),
  );
  ok("도메인 철자가 하나다", spells.size <= 1, [...spells].join(" + "));

  const mailFrom = (process.env.MAIL_FROM ?? "").trim();
  ok("보내는 주소에 staging·localhost 가 없다",
    !/staging|localhost|127\.0\.0\.1|vercel\.app/i.test(mailFrom),
    `MAIL_FROM=${mailFrom || "(비어 있음)"}`);

  const platformUrl = (process.env.PLATFORM_URL ?? "").trim();
  ok("메일 링크의 바탕 주소에 localhost 가 없다",
    !/localhost|127\.0\.0\.1/i.test(platformUrl),
    `PLATFORM_URL=${platformUrl || "(비어 있음)"}`);

  /* 결제 콜백이 localhost 로 적혀 있지 않은가. 주문을 만드는 쪽이
     요청 호스트에서 가져오므로 코드에 박힌 것이 없어야 한다 */
  const hard = filesUnder("src", [".ts", ".tsx"])
    .filter((f) => {
      const t = readFileSync(f, "utf8");
      return /["'`]https?:\/\/(localhost|127\.0\.0\.1)/.test(t)
        && !/localhost:3000"\s*;?\s*$/m.test(t);
    });
  ok("결제·메일 주소가 코드에 박혀 있지 않다", hard.length === 0, hard.join(" · "));

  /* ── 5. 메일 ────────────────────────────────────────────────────── */
  const { mailReady, renderMail } = await import("../src/lib/outbox");
  ok("거래 메일 여섯 가지가 두 언어로 있다",
    (["signup", "purchase_done", "report_ready", "upgrade_done",
      "refund_requested", "refund_done"] as const)
      .every((k) => renderMail(k, "ko") && renderMail(k, "en")),
    "src/lib/outbox.ts 의 MAIL");
  /**
   * 코드가 늘린 종류를 DB 가 받는가.
   *
   * **이것이 한 번 조용히 깨졌다.** `outbox.kind` 에 CHECK 가 걸려 있어
   * 코드에서 종류를 늘려도 INSERT 가 거절됐고, `enqueue()` 는 실패해도
   * 던지지 않으므로(돈길에 메일을 끼우지 않으려고 그렇게 두었다) 아무
   * 표시 없이 한 통도 쌓이지 않았다. 종류를 늘릴 때 제약도 같이 늘린다.
   */
  const kinds = ["signup", "report_ready", "upgrade_done", "code_low",
    "purchase_done", "refund_requested", "refund_done"];
  const probe = await query<{ kind: string }>(
    `SELECT k AS kind FROM unnest($1::text[]) AS k
      WHERE NOT (SELECT pg_get_constraintdef(oid) FROM pg_constraint
                  WHERE conname = 'outbox_kind_check') LIKE '%' || k || '%'`,
    [kinds],
  ).catch(() => [{ kind: "제약을 읽지 못했다" }]);
  ok("DB 가 거래 메일 종류를 전부 받는다", probe.length === 0,
    `${probe.map((p) => p.kind).join(" · ")} — npm run db:phase2_2`);

  if (!mailReady()) {
    blocked("EMAIL", "거래 메일",
      "MAIL_HOST · MAIL_FROM 이 비어 있어 한 통도 나가지 않습니다. " +
      "메일 대행사를 붙이고 보내는 주소를 우리 도메인으로 맞춥니다.",
      "운영 담당");
  }

  /* ── 6. 법적 본문과 사업자 표시 ─────────────────────────────────── */
  const biz = await businessInfo();
  if (!biz.complete) {
    blocked("BUSINESS_INFO", "사업자 표시",
      `전자상거래법 제10조 표시가 ${biz.missing.length}칸 비어 있습니다 ` +
      `(${biz.missing.join(" · ")}). BUSINESS_* 환경변수에 넣습니다. ` +
      `지어내지 않았습니다.`,
      "사업자 등록");
  }
  const docs = await query<{ kind: string; locale: string; translation_status: string }>(
    `SELECT kind, locale, translation_status FROM consent_documents
      WHERE retired_at IS NULL AND required`,
  ).catch(() => []);
  ok("필수 동의문이 두 언어로 들어 있다",
    ["ko", "en"].every((l) => docs.some((d) => d.locale === l)),
    `${docs.length}개`);
  const pending = docs.filter((d) => d.translation_status === "pending");
  if (pending.length) {
    blocked("LEGAL", "영문 약관 본문",
      `${pending.length}개 문서가 번역 전입니다. 지금은 한국어가 기준이라고 ` +
      `영어로 적어 두었고, 기계로 번역해 두지 않았습니다.`,
      "법률 검토·번역");
  }

  /* ── 7. 지원 경로 ───────────────────────────────────────────────── */
  const sup = supportConfig();
  if (!sup.ready) {
    blocked("SUPPORT", "지원 메일",
      "SUPPORT_EMAIL 이 비어 있습니다. 주소를 지어내지 않았습니다.",
      "사업 결정");
  }
  ok("지원 화면이 본인 것만 읽는다",
    readFileSync("src/lib/support.ts", "utf8").includes("WHERE o.user_id = $1"),
    "src/lib/support.ts");

  /* ── 8. 백업 ────────────────────────────────────────────────────── */
  ok("백업 스크립트와 복구 절차가 저장소에 있다",
    existsSync("deploy/backup.sh") && existsSync("docs/metri/44_production_infra.md"),
    "deploy/backup.sh · docs/metri/44_production_infra.md");
  /* **사람이 적는 날짜를 믿지 않는다.** 기록은 `backup:restore` 가 끝까지
     돈 자리에서만 생긴다 */
  const { get } = await import("../src/lib/settings");
  const restoredAt = await get("backup_restore_verified_at").catch(() => null);
  ok("복구 시험 기록이 손으로 적는 값이 아니다",
    readFileSync("src/lib/launch.ts", "utf8").includes("backup_restore_verified_at"),
    "src/lib/launch.ts 의 backupRow");
  if (!restoredAt) {
    blocked("BACKUP_RESTORE", "복구 시험",
      "복구를 한 번도 해 보지 않았습니다. `npm run backup:restore` 를 " +
      "돌리면 받고 · 붓고 · 세고 · 기록까지 남깁니다.",
      "운영 담당");
  }

  /* ── 9. 영어 덮임 (글로벌만) ───────────────────────────────────── */
  const { localizationReport } = await import("../src/lib/localization");
  const loc = localizationReport();
  ok("사람이 읽는 칸이 전부 영어로 있다",
    loc.screen.every((x) => !x.missing.length),
    loc.screen.flatMap((x) => x.missing).slice(0, 3).join(" · "));
  ok("경험에서 찾는 말이 전부 영어로 있다",
    loc.matchers.every((x) => !x.missing.length),
    loc.matchers.flatMap((x) => x.missing).slice(0, 3).join(" · "));

  /* ── 10. 결과지와 PDF 가 실제로 나간 적이 있는가 ─────────────────── */
  const made = await queryOne<{ snaps: number; pdfs: number }>(
    `SELECT count(*)::int AS snaps,
            count(*) FILTER (WHERE pdf_path IS NOT NULL)::int AS pdfs
       FROM report_snapshots`,
  ).catch(() => null);
  ok("결과지가 실제로 나간 적이 있다", (made?.snaps ?? 0) > 0,
    "npm run phase2:report 또는 global:check 를 한 번 돌립니다");
  ok("PDF 가 실제로 나간 적이 있다", (made?.pdfs ?? 0) > 0,
    "같음. PDF 는 머리 없는 브라우저가 만듭니다");

  /* 견본 결과지가 있는가. **사기 전에 보여 줄 것이 없으면 §7 이 빈다** */
  ok("견본 결과지가 두 언어로 떠 있다",
    existsSync("public/me-v2/sample.ko.json") && existsSync("public/me-v2/sample.en.json"),
    "node scripts/sample-report.mjs");

  /* ── 11. 등급이 서로 구별되는가 (규격 §24) ─────────────────────── */
  for (const l of ["ko", "en"] as const) {
    const d = tiersDistinct(l);
    ok(`등급 셋이 ${l} 에서 받는 것으로 갈린다`, d.ok, d.why.join(" "));
  }

  /* ── 12. 운영 보안 (규격 §30) ──────────────────────────────────── */
  const envFiles = [".env", ".env.local", ".env.production"].filter(existsSync);
  const devCreds = envFiles.filter((f) => /pca-dev-|TempPass|ShotPass/.test(
    readFileSync(f, "utf8")));
  ok("환경 파일에 개발용 자격증명이 없다", devCreds.length === 0, devCreds.join(" · "));

  ok("운영 토큰이 비면 운영 주소가 열리지 않는다",
    readFileSync("src/app/api/ops/tick/route.ts", "utf8").includes("length < 16"),
    "src/app/api/ops/tick/route.ts");

  /* 등급을 주소로 올리는 길이 없는가. `openV2Attempt` 가 등급을 인자로
     받지 않는 것이 그 가드다 */
  const attemptSrc = readFileSync("src/lib/me-v2/attempt.ts", "utf8");
  const sig = attemptSrc.slice(attemptSrc.indexOf("export async function openV2Attempt"),
    attemptSrc.indexOf("export async function openV2Attempt") + 400);
  ok("응시를 열 때 등급을 화면에서 받지 않는다", !/\btier\s*[?:]/.test(sig),
    "src/lib/me-v2/attempt.ts 의 openV2Attempt");

  ok("웹훅이 서명을 확인한다",
    readFileSync("src/lib/payments/portone.ts", "utf8").includes("WEBHOOK_SECRET"),
    "src/lib/payments/portone.ts");

  /* 운영자 화면이 전부 역할을 본다. 하나라도 빠지면 그 주소는 공개다 */
  const adminPages = filesUnder("src/app/admin", ["page.tsx"]);
  const openAdmin = adminPages.filter(
    (f) => !readFileSync(f, "utf8").includes("requireRole"));
  ok("운영자 화면이 모두 역할을 확인한다", openAdmin.length === 0,
    openAdmin.join(" · "));

  /* ── 13. 개인정보 (규격 §31) ───────────────────────────────────── */
  ok("결과지 자료가 본인 확인을 거친다",
    readFileSync("src/app/assessment/[attemptId]/report/data/route.ts", "utf8")
      .includes("attemptOf(attemptId, user.id)"),
    "src/app/assessment/[attemptId]/report/data/route.ts");

  ok("PDF 내려받기가 본인 확인을 거친다",
    readFileSync("src/app/assessment/[attemptId]/report/pdf/route.ts", "utf8")
      .includes("attemptOf(attemptId, user.id)"),
    "src/app/assessment/[attemptId]/report/pdf/route.ts");

  /* 기관이 개인 결과지를 기본으로 보지 못하는가 */
  const rbac = readFileSync("src/lib/rbac.ts", "utf8");
  const grants = rbac.slice(rbac.indexOf("ROLE_PERMS"));
  ok("기관 역할에 개인 결과지 읽기가 없다",
    !grants.includes("org.participant.report.read"),
    "src/lib/rbac.ts");

  /* 퍼널에 자유입력이 들어가지 않는가 */
  const fn = readFileSync("src/lib/funnel.ts", "utf8");
  ok("퍼널이 적는 열쇠가 좁혀져 있다", fn.includes("const ALLOWED"),
    "src/lib/funnel.ts 의 ALLOWED");

  /* 환불 요청에 자유입력 칸이 없는가 */
  const rr = readFileSync("db/schema_phase2_2.sql", "utf8");
  ok("환불 요청에 자유입력 칸이 없다",
    !/refund_requests[\s\S]{0,1200}?\bnote\s+TEXT/.test(rr),
    "db/schema_phase2_2.sql");

  /* 파기 목록이 새 표를 품는가 */
  const er = readFileSync("src/lib/erasure.ts", "utf8");
  ok("파기 목록이 파일럿 자유입력과 확인 링크를 품는다",
    er.includes("pilot_feedback") && er.includes("email_verify_tokens"),
    "src/lib/erasure.ts 의 REMOVE");

  report();
}

function report(): void {
  const bad = T.filter((x) => !x.pass);
  console.log("── 켜는 것을 막지 않는 것 ────────────────────────");
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "깨짐"} ${t.n}` +
      `${!t.pass && t.fix ? `\n       고칠 곳: ${t.fix}` : ""}`);
  }
  console.log("\n── 켜기 전에 밖에서 정해져야 하는 것 ─────────────");
  if (!B.length) console.log("  없음");
  /* **갈래로 모아서 적는다.** "스물한 가지" 는 읽은 사람이 무엇부터
     할지 모르고, 갈래로 나누면 전화 두 통과 서류 한 장으로 갈린다 */
  for (const a of AREAS) {
    const mine = B.filter((b) => b.area === a);
    if (!mine.length) continue;
    console.log(`\n  [${a}] ${AREA_LABEL[a]} — ${mine.length}가지`);
    for (const b of mine) console.log(`    · ${b.n}  [${b.who}]\n        ${b.why}`);
  }

  const openAreas = [...new Set(B.map((b) => b.area))];
  const clear = AREAS.filter((a) => !openAreas.includes(a));
  console.log(`\n  막힌 갈래 ${openAreas.length} / ${AREAS.length}` +
    `  ·  열린 갈래: ${clear.join(" ") || "없음"}`);

  console.log(bad.length
    ? `\n${bad.length}개가 깨져 있다. 켜지 않는다.`
    : `\n런칭 가드 OK — 끝낸 것 ${T.length}가지 · 막힌 것 ${B.length}가지.`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
