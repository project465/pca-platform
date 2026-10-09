/**
 * 공개 전 배포본이 공개 전답게 서 있는가.
 *
 * **"staging 입니다" 라고 적어 두는 것으로는 부족하다.** 자물쇠가 비어
 * 있거나, 색인이 열려 있거나, 운영 설정으로 가짜 결제가 켜져 있으면
 * 그것은 그냥 **덜 만든 운영**이다. 그 셋을 여기서 센다.
 *
 * 띄워 둔 배포본에 대고 돌린다:
 *
 *   STAGING_BASE=https://app.careermatri.com \
 *   STAGING_BASIC_AUTH=qa:... npx tsx scripts/staging-check.ts
 *
 * 환경변수만 보는 검사는 서버 안에서도 돌릴 수 있다(주소를 비우면 된다).
 */
import { appEnv, mockPaymentsAllowed, stagingGate } from "../src/lib/env";

const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });

const BASE = (process.env.STAGING_BASE ?? "").replace(/\/$/, "");

async function main() {
  /* ── 1. 이 배포본이 무엇이라고 말하는가 ───────────────────────── */
  const env = appEnv();
  ok("APP_ENV 가 staging", env === "staging", env);

  /* ── 2. 자물쇠 ────────────────────────────────────────────────── */
  const gate = stagingGate();
  ok("공개 전 자물쇠가 있다", gate !== null,
    gate ? `아이디 ${gate.user}` : "STAGING_BASIC_AUTH 가 비어 있다");
  ok("자물쇠 비밀번호가 짧지 않다", (gate?.pass.length ?? 0) >= 12,
    gate ? `${gate.pass.length}자` : "없음");

  /* ── 3. 결제 ──────────────────────────────────────────────────── */
  ok("staging 에서는 가짜 결제가 열린다", mockPaymentsAllowed());

  /* **운영으로 바꿔 놓고 거절하는지 본다.** 열쇠가 있는 자물쇠는
     언젠가 열리므로, 옛 열쇠를 꽂아 두고도 거절해야 한다 */
  const save = { app: process.env.APP_ENV, allow: process.env.ALLOW_MOCK_PAYMENTS };
  let refused = false;
  try {
    const e = process.env as Record<string, string | undefined>;
    e.APP_ENV = "production";
    e.ALLOW_MOCK_PAYMENTS = "yes";
    const { paymentProvider } = await import("../src/lib/payments");
    try { refused = paymentProvider().name !== "mock"; } catch { refused = true; }
  } finally {
    const e = process.env as Record<string, string | undefined>;
    if (save.app === undefined) delete e.APP_ENV; else e.APP_ENV = save.app;
    if (save.allow === undefined) delete e.ALLOW_MOCK_PAYMENTS;
    else e.ALLOW_MOCK_PAYMENTS = save.allow;
  }
  ok("운영에서는 가짜 결제가 거절된다", refused);

  /* ── 4. 밖에서 보이는 주소 ────────────────────────────────────── */
  const url = (process.env.PLATFORM_URL ?? "").trim();
  ok("이 배포본의 주소가 적혀 있다", /^https:\/\/\S+$/.test(url), url || "PLATFORM_URL 이 비어 있다");
  ok("주소가 소개 사이트가 아니다",
    !/^https:\/\/(www\.)?careermatri\.(com|co\.kr)\/?$/.test(url),
    "소개 사이트 자리에 플랫폼을 올리지 않는다");

  /* ── 4-2. 결과지 파일이 사라지지 않는 자리에 있는가 ──────────── */
  const dir = (process.env.REPORT_PDF_DIR ?? "").trim();
  ok("결과지 폴더가 환경변수로 정해져 있다", dir.length > 0,
    dir || "REPORT_PDF_DIR 이 비어 있다");
  /* **다시 띄우면 사라지는 자리에 두지 않는다.** 컨테이너 안의 임시
     폴더에 쓰면 배포 한 번에 산 사람의 결과지가 없어진다 */
  ok("결과지 폴더가 임시 자리가 아니다",
    dir.length > 0 && !/^\/tmp|^\/var\/tmp/.test(dir), dir);

  /* ── 5. 실제로 떠 있는가 ──────────────────────────────────────── */
  if (!BASE) {
    ok("띄워 둔 배포본 확인", false, "STAGING_BASE 가 없어 건너뛴다");
  } else {
    const auth = (process.env.STAGING_BASIC_AUTH ?? "").trim();
    const head = auth
      ? { authorization: "Basic " + Buffer.from(auth).toString("base64") }
      : undefined;

    /* 자물쇠 없이 열리면 안 된다 */
    try {
      const bare = await fetch(`${BASE}/pricing`, { redirect: "manual" });
      ok("자물쇠 없이는 막힌다", bare.status === 401, `HTTP ${bare.status}`);
      ok("색인하지 말라고 적혀 있다",
        (bare.headers.get("x-robots-tag") ?? "").includes("noindex"),
        bare.headers.get("x-robots-tag") ?? "없음");
    } catch (e) {
      ok("자물쇠 없이는 막힌다", false, String(e).slice(0, 80));
    }

    /* 자물쇠를 풀면 열린다 */
    try {
      const r = await fetch(`${BASE}/pricing?market=KR`, { headers: head });
      const body = await r.text();
      ok("열쇠를 주면 열린다", r.ok, `HTTP ${r.status}`);
      ok("한국 가격표가 원화로 나온다", body.includes("14,900원"));
      /* 손님 화면에는 개발용 문구를 두지 않는다. 공개 전이라는 사실을
         적는 띠는 운영자 화면(`/admin/*`)에만 선다. 눌러 본 사람이
         "결제가 됐다" 를 진짜로 읽는 것을 막는 자리는 띠가 아니라 셋이다:
         자물쇠(위의 401) · 가짜 결제창 자신의 머리글 · 운영에서 가짜
         결제를 아예 거절하는 규칙 */
      ok("손님 화면에 개발용 문구가 없다", !body.includes("공개 전 시험 배포"));
    } catch (e) {
      ok("열쇠를 주면 열린다", false, String(e).slice(0, 80));
    }

    /* HTTPS 인가 */
    ok("HTTPS 로 연다", BASE.startsWith("https://"), BASE);
  }

  const bad = T.filter((t) => !t.pass);
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  console.log(`\n공개 전 배포 ${T.length}가지 가운데 ${bad.length}가지가 걸렸다.`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
