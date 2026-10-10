/**
 * **제품 루프가 데이터까지 닿는가**(규격 §26).
 *
 * `v3:loop` 가 묻는 것은 `그 쪽에서 다음 쪽으로 갈 수 있는가` 다. 여기가
 * 묻는 것은 **`누른 일이 실제로 저장되고 그 저장이 다음 화면의 글자를
 * 바꿨는가`** 다. 둘은 다른 질문이다: 쪽이 전부 200 이고 링크가 전부
 * 살아 있으면서 **아무것도 저장되지 않을 수 있다.** 그래서 화면의 글자와
 * DB 의 줄을 같이 본다.
 *
 * 세는 열 가지가 규격 §26 의 순서 그대로다.
 *
 *    1. experience saved            저장 단추가 실제로 줄을 만든다
 *    2. experience persisted        다시 들어와도 그 줄이 있다
 *    3. recompute triggered         반영할 일이 쌓이고 사람이 누르면 돈다
 *    4. current state updated       `career_profiles` 가 갱신된다
 *    5. next action updated         할 일이 그 반영을 따라간다
 *    6. home recent change updated  홈의 `최근 변화` 가 문장으로 적는다
 *    7. frozen result invariant     굳은 결과가 한 글자도 바뀌지 않는다
 *    8. no dead-end CTA             루프의 단추가 전부 다음 자리를 연다
 *    9. no internal code leak       손님 화면에 축·묶음·판본 코드가 없다
 *   10. user isolation              남의 경험과 남의 지금 값이 보이지 않는다
 *
 * **일곱째가 이 검사의 중심이다.** 경험 기능 때문에 과거 결과가 다시
 * 쓰이면 그것은 제품의 신뢰가 깨지는 자리다. 그래서 반영 전후로 굳은
 * 결과를 글자째 떠 두고 견준다.
 *
 * **열쇠는 이 자리에서 만들고 해시만 남긴다.** 저장소에도 문서에도 로그에도
 * 적지 않는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/v3-product-loop.ts
 */
import { randomBytes, createHash } from "node:crypto";

import {
  BASE as B, cloneFinished, fillExperience, gateCreds, login, makeStudent,
} from "./_loop-fixture";
import { chromium, type Browser } from "playwright";
import { query, queryOne } from "../src/lib/db";

/** 둘을 띄운다. 격리는 **짝으로만** 셀 수 있다: 전부 막는 코드가 한쪽만
 *  보는 검사를 통과하면서 산 사람도 못 보게 한다 */
const WHO = ["v3ploopA@example.com", "v3ploopB@example.com"] as const;

/**
 * 손님 화면에 나가면 안 되는 안쪽 이름.
 *
 * **낱말 경계를 붙인다.** `J1` 을 날것으로 찾으면 평범한 글자에 걸리고,
 * 거짓 경보를 내는 검사는 그 다음부터 아무도 안 본다.
 */
const INTERNAL: RegExp[] = [
  /\bJ[1-8]\b/,
  /\b(TD|RF|OC|ORG)\d{1,2}\b/,
  /\b(NOT_OBSERVED|PARTICIPATED|CONFIRMED|OWNED)\b/,
  /\bZ[1-4]_[A-Z_]+\b/, /\bNOT_EXPLORED\b/,
  /* **판본 글자는 세지 않는다.** `당시 판본 보기` 가 일부러 그 값을
     보여 주는 자리라, 세면 고객지원에 적어 보낼 값을 지우라고 요구하게
     된다. 뜻이 없는 전공 코드만 막는다 */
  /\bME_CORE_V3\b/,
  /\b(MISSING_REQUIRED_AXIS|MISSING_OUTPUT|INSUFFICIENT_CONFIRMED_AXES)\b/,
  /\b(BUILD_OUTPUT|ADD_VERIFICATION|FILL_AXIS|TRY_SHORT_EXPERIENCE|WRITE_UP)\b/,
  /\b(evidence\.added|career_profiles|v3_experiences|v3_actions)\b/,
];

let pass = 0, fail = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? ` — ${d}` : ""}`); }
}

/** 굳은 결과를 글자째 뜬다. **견주는 자리가 지문이어야** 한 칸이 바뀐 것도 걸린다 */
async function frozenPrint(userId: string): Promise<string> {
  const rows = await query<{ id: string; model: unknown; v: string | null }>(
    `SELECT s.attempt_id::text AS id, s.result_model AS model,
            s.result_model_version AS v
       FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
      WHERE a.user_id = $1 ORDER BY s.attempt_id`, [userId]);
  return createHash("sha256")
    .update(JSON.stringify(rows.map((r) => [r.id, r.v, r.model])))
    .digest("hex");
}





async function main(): Promise<void> {
  const [a, b] = await Promise.all([makeStudent(WHO[0]), makeStudent(WHO[1])]);
  const attA = await cloneFinished(a.id);
  const attB = await cloneFinished(b.id);
  const browser: Browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const gate = gateCreds();
  const opts = gate ? { httpCredentials: gate } : {};

  try {
    ok("바탕이 될 굳은 결과가 둘 다 있다", !!attA && !!attB,
      `${attA ?? "없음"} / ${attB ?? "없음"}`);
    if (!attA || !attB) throw new Error("굳은 결과가 없어 루프를 셀 수 없다");

    const ctx = await browser.newContext({ ...opts, viewport: { width: 1440, height: 900 } });
    const p = await login(ctx, WHO[0], a.pw);
    const before = await frozenPrint(a.id);

    /* ── 1. experience saved ─────────────────────────────────────── */
    console.log("\n── 1. 경험이 저장된다");
    const title = `제품 루프 ${randomBytes(3).toString("hex")}`;
    const picked = await fillExperience(p, title);
    ok("기술영역이 실제로 골라졌다", picked > 0, `${picked}개`);
    const saved = await queryOne<{ n: string; td: string }>(
      `SELECT count(*)::text AS n,
              coalesce(max(array_length(td_codes,1)),0)::text AS td
         FROM v3_experiences WHERE user_id = $1 AND title = $2`, [a.id, title]);
    ok("저장 단추가 실제로 줄을 만든다", Number(saved?.n ?? 0) === 1,
      `${saved?.n ?? 0}줄 · 기술영역 ${saved?.td ?? 0}개`);
    const landed = new URL(p.url()).pathname + new URL(p.url()).search;
    ok("저장하면 달라진 것을 먼저 보여 준다",
      landed.startsWith("/me/recompute"), landed);
    ok("이번 경험으로 좁혀 적는다(`?new=`)", landed.includes("new="), landed);

    /* ── 2. experience persisted ─────────────────────────────────── */
    console.log("\n── 2. 다시 들어와도 남아 있다");
    await ctx.clearCookies();
    const p2 = await login(ctx, WHO[0], a.pw);
    await p2.goto(`${B}/me/experience`, { waitUntil: "networkidle" });
    const listTxt = await p2.evaluate(() => document.body.innerText);
    ok("다시 들어오면 그 경험이 목록에 있다", listTxt.includes(title));
    /* 규격 §14 의 다섯. **개수가 아니라 이 다섯이 보여야 한다** */
    ok("목록이 날짜와 기술영역과 더했는지를 적는다",
      /2025-03|2025/.test(listTxt) && /더함|더하지 않음/.test(listTxt));

    /* ── 3. recompute triggered ──────────────────────────────────── */
    console.log("\n── 3. 더하기가 돈다");
    const q = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM career_events
        WHERE user_id = $1 AND status IN ('queued','failed')`, [a.id]);
    ok("저장이 반영할 일을 쌓는다", Number(q?.n ?? 0) >= 1, `${q?.n ?? 0}건`);
    await p2.goto(`${B}/me/recompute`, { waitUntil: "networkidle" });
    const planTxt = await p2.evaluate(() => document.body.innerText);
    ok("이번 경험에서 새로 연결된 것을 적는다",
      /새로 연결된 것/.test(planTxt));
    ok("현재 상태에서 달라지는 것을 적는다",
      /현재 상태에서 달라지는 것/.test(planTxt));
    ok("그다음에 할 일을 적는다", /그다음에 할 일/.test(planTxt));
    /* **`보기` 라고 적힌 단추가 값을 바꾸지 않는다**(규격 §6) */
    const applyLabel = await p2.locator('.cm-acts form button[type="submit"]')
      .first().innerText().catch(() => "");
    ok("더하는 단추가 하는 일을 말로 적는다",
      /더하기|계산/.test(applyLabel), applyLabel);
    await p2.locator('.cm-acts form button[type="submit"]').first()
      .click({ force: true });
    await p2.waitForLoadState("networkidle").catch(() => undefined);
    await p2.waitForTimeout(1200);
    const at = new URL(p2.url()).pathname;
    ok("반영하면 현재 상태로 이어진다", at === "/me/state", at);
    const left = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM career_events
        WHERE user_id = $1 AND status IN ('queued','failed')`, [a.id]);
    ok("반영하면 쌓인 일이 처리된다", Number(left?.n ?? 0) === 0, `${left?.n ?? 0}건 남음`);

    /* ── 4. current state updated ────────────────────────────────── */
    console.log("\n── 4. 지금 값이 갱신된다");
    /* **갱신됐다는 것을 날짜 하나로 세지 않는다.** 줄은 있고 축이 비어
       있으면 화면은 빈 칸을 그리고 이 검사는 통과한다 */
    const prof = await queryOne<{ at: string | null; n: string }>(
      `SELECT recomputed_at::text AS at,
              (SELECT count(*)::text FROM jsonb_object_keys(axis_levels)) AS n
         FROM career_profiles WHERE user_id = $1`, [a.id]);
    ok("`career_profiles` 가 갱신된다", !!prof?.at, prof?.at ?? "없음");
    ok("지금 값에 영역이 적힌다", Number(prof?.n ?? 0) > 0, `영역 ${prof?.n ?? 0}곳`);
    const stateTxt = await p2.evaluate(() => document.body.innerText);
    ok("현재 상태가 기준 날짜를 적는다", /\d{4}-\d{2}-\d{2} 기준/.test(stateTxt));
    /**
     * 첫 화면의 차례(규격 §5)와 세부의 자리(규격 §6).
     *
     * **있는지만 세지 않고 차례까지 센다.** 넷이 다 있으면 통과하던
     * 검사는 `다음 행동` 이 Gap 목록 아래로 밀려 첫 화면 밖에 있어도
     * 통과했다. 실제로 그렇게 서 있었다.
     */
    /* **글자를 찾지 않고 묶음 머리를 읽는다.** 쪽 글 전체에서 찾으면
       머리의 단추(`지금 할 일 보기`)와 알림 문장이 먼저 걸려서, 차례가
       뒤집혀 있어도 통과하거나 멀쩡한데 걸린다 */
    const sects = await p2.$$eval("h2.cm-sect",
      (xs) => xs.map((x) => (x.firstChild?.textContent ?? x.textContent ?? "").trim()));
    const ORDER_TOP = ["지금 설명할 수 있는 영역", "최근 달라진 것", "지금 할 일"];
    const at5 = ORDER_TOP.map((h) => sects.findIndex((t) => t === h));
    ok("현재 상태 첫 화면의 차례가 규격 §5 다",
      at5.every((i) => i >= 0) && at5.every((v, i) => i === 0 || v > at5[i - 1]),
      sects.join(" / "));
    /* 규격 §6. 비어 있는 자리 전부와 전체 기술영역은 그 셋 **아래**다 */
    const below = ["아직 부족한 것", "전체 기술영역"]
      .map((h) => sects.findIndex((t) => t === h));
    ok("세부는 첫 화면 아래에 있다",
      below.every((i) => i > Math.max(...at5)),
      below.join(" / "));
    /* 규격 §8. **점수 비교처럼 보이지 않는다** */
    ok("점수처럼 견주지 않는다",
      !/\+\s?\d+\s?점/.test(stateTxt) && !/\d\s*→\s*\d/.test(stateTxt));
    ok("굳은 결과와 지금 값을 나란히 적는다",
      /검사 당시 결과와 지금/.test(stateTxt) && /서로를 덮지 않습니다/.test(stateTxt));

    /* ── 5. next action updated ──────────────────────────────────── */
    console.log("\n── 5. 다음 행동이 갱신된다");
    await p2.goto(`${B}/me/next`, { waitUntil: "networkidle" });
    let nextTxt = await p2.evaluate(() => document.body.innerText);
    if (/결과의 할 일 담기/.test(nextTxt)) {
      await p2.locator('form button:has-text("결과의 할 일 담기")').first()
        .click({ force: true }).catch(() => undefined);
      await p2.waitForLoadState("networkidle").catch(() => undefined);
      await p2.waitForTimeout(1000);
      nextTxt = await p2.evaluate(() => document.body.innerText);
    }
    const acts = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_actions WHERE user_id = $1`, [a.id]);
    ok("할 일이 줄로 남는다", Number(acts?.n ?? 0) > 0, `${acts?.n ?? 0}줄`);
    /* 규격 §9. **넷이 붙는다** — 무엇을 · 왜 · 어느 자리 · 어떤 경험으로 */
    const four = ["왜 필요한가", "어느 자리", "어떤 경험으로"]
      .filter((h) => nextTxt.includes(h));
    ok("할 일에 왜와 어느 자리와 어떤 경험으로가 붙는다", four.length >= 2,
      four.join(" / ") || "하나도 없다");
    ok("할 일에서 경험으로 돌아가는 길이 있다",
      (await p2.locator('a[href="/me/experience/new"]').count()) > 0);
    /* 규격 §10. **한 화면에 짙은 단추 하나** */
    const prim = await p2.locator(".cm-btn.is-primary").count();
    ok("할 일 쪽에 짙은 단추가 하나다", prim <= 1, `${prim}개`);

    /* ── 6. home recent change updated ───────────────────────────── */
    console.log("\n── 6. 홈의 최근 변화");
    await p2.goto(`${B}/me`, { waitUntil: "networkidle" });
    const homeTxt = await p2.evaluate(() => document.body.innerText);
    ok("홈이 최근 변화 묶음을 세운다", /최근 변화/.test(homeTxt));
    /* 규격 §12. **`경험이 추가되었습니다` 로 적지 않는다** */
    ok("홈이 무엇이 달라졌는지 문장으로 적는다",
      /확인됐습니다|또렷해졌습니다|더해졌습니다|옮겨 갔습니다|그대로입니다/.test(homeTxt));
    ok("홈이 `경험이 추가되었습니다` 로 끝내지 않는다",
      !/경험이 추가되었습니다/.test(homeTxt));
    ok("홈이 방금 적은 경험을 적는다", homeTxt.includes(title));

    /* ── 7. frozen result invariant ──────────────────────────────── */
    console.log("\n── 7. 굳은 결과가 그대로다");
    const after = await frozenPrint(a.id);
    ok("굳은 결과가 한 글자도 바뀌지 않았다", before === after,
      before === after ? before.slice(0, 16) : `${before.slice(0, 8)} → ${after.slice(0, 8)}`);
    const rr = await p2.goto(`${B}/v3/${attA}/result`, { waitUntil: "networkidle" });
    ok("굳은 결과지가 그대로 열린다", rr?.status() === 200, String(rr?.status()));

    /* ── 8. no dead-end CTA ─────────────────────────────────────── */
    console.log("\n── 8. 막다른 길 0");
    /* 결과지의 `지금 할 일로 담기` 가 실제로 담는가(규격 §16). **담은
       수를 주소에 싣는다**: 이미 담아 둔 사람에게는 0 이 맞는 답이라
       `0` 을 고장으로 적지 않는지도 함께 본다 */
    const n0 = Number((await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_actions WHERE user_id = $1`, [a.id]))?.n ?? 0);
    await p2.locator('.rs-do form button[type="submit"]').first()
      .click({ force: true }).catch(() => undefined);
    await p2.waitForLoadState("networkidle").catch(() => undefined);
    await p2.waitForTimeout(1000);
    const takenUrl = p2.url();
    ok("`지금 할 일로 담기` 가 할 일 쪽으로 담고 보낸다",
      /\/me\/next\?taken=\d+/.test(takenUrl), new URL(takenUrl).search || takenUrl);
    const takenTxt = await p2.evaluate(() => document.body.innerText);
    const n1 = Number((await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_actions WHERE user_id = $1`, [a.id]))?.n ?? 0);
    ok("담긴 수를 그 자리에서 적는다",
      /담았습니다|이미 담겨 있습니다/.test(takenTxt),
      `${n0} → ${n1}`);
    ok("두 번 눌러도 할 일이 늘지 않는다", n1 === n0 || n0 === 0, `${n0} → ${n1}`);

    const LOOP = ["/me", "/me/state", "/me/next", "/me/experience",
      "/me/experience/new", "/me/recompute", "/me/results"];
    const dead: string[] = [];
    for (const path of LOOP) {
      await p2.goto(B + path, { waitUntil: "networkidle" });
      const hrefs = await p2.$$eval(".cm-main a[href], .cm-acts a[href]", (as) =>
        as.map((x) => x.getAttribute("href") ?? "")
          .filter((h) => h.startsWith("/") && !h.startsWith("//") && !h.includes("/pdf")));
      for (const h of [...new Set(hrefs)]) {
        const r = await p2.request.get(B + h, { timeout: 30_000 }).catch(() => null);
        if (!r || r.status() >= 400) dead.push(`${path} → ${h} (${r?.status() ?? 0})`);
      }
    }
    ok("루프 안에 막다른 길이 없다", dead.length === 0,
      dead.slice(0, 3).join(" / ") || `쪽 ${LOOP.length}자리`);

    /* ── 8b. 적다 만 것을 들고 나가지 않는다 (규격 §4) ──────────── */
    console.log("\n── 8b. 적다 만 것을 들고 나가지 않는다");
    {
      const q = await ctx.newPage();
      await q.goto(`${B}/me/experience/new`, { waitUntil: "networkidle" });
      let asked = false;
      /* **띠를 누르면 묻는다.** 묻지 않으면 적던 것이 통째로 사라진다 */
      q.on("dialog", (d) => { asked = true; void d.dismiss(); });
      await q.fill('input[name="title"]', "떠나기 전 확인용");
      const bar = q.locator('nav.cm-rail a[href="/me"]').first();
      await bar.click({ timeout: 5000 }).catch(() => undefined);
      await q.waitForTimeout(800);
      ok("적다 말고 띠를 누르면 묻는다", asked, asked ? "묻는다" : "그냥 떠난다");
      ok("묻는 창에서 머무르면 적던 화면에 남는다",
        new URL(q.url()).pathname === "/me/experience/new", new URL(q.url()).pathname);
      /* **적은 것이 없으면 묻지 않는다.** 아무 때나 물으면 묻는 창이
         거드는 것이 아니라 거치적거리는 것이 된다 */
      const r = await ctx.newPage();
      let asked2 = false;
      r.on("dialog", (d) => { asked2 = true; void d.dismiss(); });
      await r.goto(`${B}/me/experience/new`, { waitUntil: "networkidle" });
      await r.locator('nav.cm-rail a[href="/me"]').first()
        .click({ timeout: 5000 }).catch(() => undefined);
      await r.waitForTimeout(800);
      ok("적은 것이 없으면 묻지 않는다", !asked2 && new URL(r.url()).pathname === "/me",
        `${asked2 ? "묻는다" : "안 묻는다"} · ${new URL(r.url()).pathname}`);
      await q.close(); await r.close();
    }

    /* ── 9. no internal code leak ───────────────────────────────── */
    console.log("\n── 9. 안쪽 이름 0");
    const leaks: string[] = [];
    for (const path of LOOP) {
      await p2.goto(B + path, { waitUntil: "networkidle" });
      /* **접힌 자리까지 펴고 본다.** 접힌 속은 `innerText` 에 안 잡혀서,
         접는 자리를 둔 날부터 이 검사가 거짓으로 통과한다 */
      await p2.$$eval("details", (ds) =>
        ds.forEach((d) => { (d as HTMLDetailsElement).open = true; }));
      await p2.waitForTimeout(150);
      const t = await p2.evaluate(() => document.body.innerText);
      for (const re of INTERNAL) {
        const m = re.exec(t);
        if (m) leaks.push(`${path}: ${m[0]}`);
      }
    }
    ok("손님 화면에 안쪽 이름이 없다", leaks.length === 0,
      leaks.slice(0, 3).join(" / ") || `쪽 ${LOOP.length}자리 · 규칙 ${INTERNAL.length}가지`);

    /* ── 10. user isolation ─────────────────────────────────────── */
    console.log("\n── 10. 남의 것이 보이지 않는다");
    const ctxB = await browser.newContext({ ...opts, viewport: { width: 1280, height: 900 } });
    const pb = await login(ctxB, WHO[1], b.pw);
    const bTitle = `남의 루프 ${randomBytes(3).toString("hex")}`;
    await fillExperience(pb, bTitle);
    await pb.goto(`${B}/me/experience`, { waitUntil: "networkidle" });
    const bList = await pb.evaluate(() => document.body.innerText);
    ok("B 는 자기 경험이 보인다", bList.includes(bTitle));
    ok("B 에게 A 의 경험이 보이지 않는다", !bList.includes(title));
    const bState = await pb.goto(`${B}/me/state`, { waitUntil: "networkidle" });
    ok("B 의 현재 상태가 열린다", bState?.status() === 200, String(bState?.status()));
    const other = await pb.goto(`${B}/v3/${attA}/result`,
      { waitUntil: "domcontentloaded" }).catch(() => null);
    const otherPath = new URL(pb.url()).pathname;
    ok("B 가 A 의 결과지를 열지 못한다",
      (other?.status() ?? 0) >= 400 || otherPath !== `/v3/${attA}/result`,
      `${other?.status() ?? 0} ${otherPath}`);
    /* **반영이 남의 지금 값을 건드리지 않는다** */
    const mine = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM career_profiles WHERE user_id = $1`, [b.id]);
    const theirs = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_experiences
        WHERE user_id = $1 AND title = $2`, [b.id, title]);
    ok("A 의 경험이 B 의 표에 들어가지 않았다", Number(theirs?.n ?? 0) === 0);
    ok("B 의 지금 값은 B 것만이다", Number(mine?.n ?? 0) <= 1, `${mine?.n ?? 0}줄`);
    await ctxB.close();
    await ctx.close();
  } finally {
    await browser.close();
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  if (fail) process.exit(1);
  console.log("\n  제품 루프 — 경험 → 저장 → 반영 → 지금 값 → 할 일 → 홈까지 이어진다.");
}

main().catch((e) => { console.error(e); process.exit(1); });
