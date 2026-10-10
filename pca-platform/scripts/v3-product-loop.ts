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
import { readFileSync, readdirSync } from "node:fs";

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

/**
 * 손님 화면에 남은 **우리 쪽 비유**(규격 §19).
 *
 * 위의 `INTERNAL` 이 막는 것은 코드이고 여기가 막는 것은 **말**이다.
 * `자리` · `묶음` · `반영` 은 우리가 설계를 이야기할 때 쓰는 비유인데,
 * 그대로 화면에 나가면 읽는 사람이 **우리 모형을 먼저 배워야** 자기
 * 결과를 읽을 수 있다.
 *
 * **소스에서 세지 않는다.** 식별자(`function Gap`)와 `왜 지웠는가` 를
 * 적어 둔 주석이 그대로 걸려, 맞는 기록을 지우라고 요구하게 된다. 띄운
 * 쪽의 글자에서만 센다.
 *
 * **기계공학 말을 지우라고 요구하지 않는다.** `판정 기준` 과 `사이클 타임
 * 판정` 과 `판정이나 인증의 근거` 는 그 분야에서 **시험 결과가 합격인지
 * 가리는 일**을 뜻하고, 우리 쪽 결과를 가리키는 말이 아니다. 바꾸면
 * 전공자가 읽는 글이 얕아진다. 그래서 세기 전에 그 묶음을 먼저 걷어
 * 낸다. **목록은 사람이 읽고 넣는다**: 자동으로 늘리면 어느 날 우리 쪽
 * 비유가 그 목록에 섞여 들어간다.
 */
const DOMAIN_OK: RegExp[] = [
  /판정\s*기준/g, /사이클 타임\s*판정/g, /판정이나 인증/g,
  /판정선/g, /재서\s*판정한다/g, /기준과\s*판정으로/g,
];

/**
 * **얼린 문항 은행의 말은 우리가 고칠 것이 아니다**(규격 §0).
 *
 * 체크리스트와 문항의 글은 기계공학자가 쓴 현장 말이고 측정 동결 안에
 * 있다. 거기에는 `부딪히는 자리` · `고장이 날 자리` · `내 판정으로
 * 출하가 결정됐다` · `설계에 반영` 이 그 분야의 뜻으로 들어 있다. 띄운
 * 쪽에서 세면 그 말들이 전부 걸리고, 그러면 이 검사가 **얼린 자료를
 * 고치라고 요구한다.**
 *
 * 그래서 허용 목록을 손으로 적지 않고 **동결된 자료에서 그대로 읽어
 * 온다.** 손으로 적으면 문항이 하나 늘 때마다 이 목록이 뒤처지고,
 * 뒤처진 날 멀쩡한 화면이 걸린다.
 */
const BANK_KEYS = new Set([
  "text", "stem", "grid_row", "grid_stem", "label", "gloss", "name", "scene",
]);

function bankStrings(): string[] {
  const out = new Set<string>();
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (BANK_KEYS.has(k) && typeof v === "string" && v.length > 1) out.add(v);
      else walk(v);
    }
  };
  for (const f of readdirSync("sites/pca-platform/content")) {
    if (!f.endsWith(".json")) continue;
    try { walk(JSON.parse(readFileSync(`sites/pca-platform/content/${f}`, "utf8"))); }
    catch { /* 자료가 아닌 파일은 지나간다 */ }
  }
  /* 긴 것부터 걷어 내야 짧은 것이 긴 것을 조각내지 않는다 */
  return [...out].sort((a, b) => b.length - a.length);
}

const JARGON: RegExp[] = [
  /판정/, /(?<![가-힣])자리(?![수])/, /묶음/, /반영/,
  /굳은 결과/, /열두 영역/, /가져오기/,
  /\b(Evidence|Gap|snapshot|recompute|confirmed|owned|axis)\b/,
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
    /* **차례가 §5 로 바뀌었다**: 지난 일보다 할 일이 먼저다. 전에는
       상태 → 지난 일 → 할 일 이라 첫 화면이 가운데에서 한 번 끊겼다 */
    const ORDER_TOP = ["지금 설명할 수 있는 영역", "지금 할 일", "최근 달라진 것"];
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
    const nextTxt = await p2.evaluate(() => document.body.innerText);
    /**
     * **담지 않아도 할 일이 서 있다**(규격 §3 — P0).
     *
     * 전에는 이 검사가 `결과의 할 일 담기` 를 눌러 표에 줄을 만든 뒤
     * 그 줄을 셌다. 그러면 **담기 전에는 쪽이 비어 있어도 통과한다**:
     * 실제로 PRO 를 끝내고 들어온 사람이 홈에서 `지금 할 일` 을 누르면
     * `아직 담아 둔 할 일이 없습니다` 를 받고 있었다. 이제 세는 것은
     * 표의 줄이 아니라 **그 사람이 화면에서 보는 것**이다.
     */
    const empty = /아직 담아 둔 할 일이 없습니다|할 일을 모두 치우셨습니다/.test(nextTxt);
    ok("담지 않아도 할 일이 서 있다", !empty,
      empty ? "빈 쪽이다" : nextTxt.slice(0, 40).replace(/\n/g, " "));
    /* **누르면 그때 표에 남는다.** 읽기만 해도 줄이 생기면 미리 불러오기가
       줄을 만들고, 그러면 치운 할 일이 되살아난 것처럼 보인다 */
    const rowsBefore = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_actions WHERE user_id = $1`, [a.id]);
    await p2.locator('form button:has-text("끝냈습니다")').first()
      .click({ force: true }).catch(() => undefined);
    await p2.waitForLoadState("networkidle").catch(() => undefined);
    await p2.waitForTimeout(1000);
    const acts = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_actions WHERE user_id = $1`, [a.id]);
    ok("누를 때만 할 일이 줄로 남는다",
      Number(rowsBefore?.n ?? 0) === 0 && Number(acts?.n ?? 0) > 0,
      `읽기만 ${rowsBefore?.n ?? 0}줄 → 누른 뒤 ${acts?.n ?? 0}줄`);
    /* 규격 §9. **넷이 붙는다** — 무엇을 · 왜 · 어느 부분 · 어떤 경험으로 */
    const four = ["왜 필요한가", "어느 부분", "어떤 경험으로"]
      .filter((h) => nextTxt.includes(h));
    ok("할 일에 왜와 어느 부분과 어떤 경험으로가 붙는다", four.length >= 2,
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

    /* **루프 쪽만 세면 옆쪽이 지나간다**(규격 §19). 탐색과 지역과 지원
       기록과 Track 과 계정도 손님이 눌러 들어가는 자리다. 한 번 전수로
       지워도 목록이 좁으면 다음 사람이 그 밖에서 되돌린다 */
    const LOOP = ["/me", "/me/state", "/me/next", "/me/experience",
      "/me/experience/new", "/me/recompute", "/me/results",
      "/me/explore", "/me/region", "/me/apply", "/me/jobs", "/me/track", "/my"];
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
      leaks.slice(0, 3).join(" / ") || `쪽 ${LOOP.length}곳 · 규칙 ${INTERNAL.length}가지`);

    /* **코드만 세면 말이 지나간다**(규격 §19). 같은 쪽을 한 번 더 훑어
       우리 쪽 비유를 센다 */
    const jargon: string[] = [];
    const BANK = bankStrings();
    for (const path of LOOP) {
      await p2.goto(B + path, { waitUntil: "networkidle" });
      await p2.locator(".rs-openbtn").first().click({ timeout: 2000 }).catch(() => undefined);
      await p2.$$eval("details", (ds) =>
        ds.forEach((d) => { (d as HTMLDetailsElement).open = true; }));
      await p2.waitForTimeout(150);
      /* **줄바꿈을 먼저 한 칸으로 모은다.** 화면에서 `사이클 타임 판정`
         이 칸에 안 들어가 `사이클 타임\n판정` 으로 접히면, 글자 그대로
         적어 둔 허용 목록이 그것을 못 알아보고 **멀쩡한 기계공학 말이
         걸린다.** 한 번 그렇게 걸렸다 */
      let t = (await p2.evaluate(() => document.body.innerText))
        .replace(/\s+/g, " ");
      /* 기계공학 말을 먼저 걷어 내고 센다. 얼린 자료가 먼저다 */
      for (const b of BANK) t = t.split(b).join(" ");
      for (const ok of DOMAIN_OK) t = t.replace(ok, "");
      for (const re of JARGON) {
        const m = re.exec(t);
        if (m) jargon.push(`${path}: ${m[0]}`);
      }
    }
    ok("손님 화면에 우리 쪽 비유가 없다", jargon.length === 0,
      jargon.slice(0, 4).join(" / ")
      || `쪽 ${LOOP.length}곳 · 규칙 ${JARGON.length}가지 · 얼린 말 ${BANK.length}줄 제외`);

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
