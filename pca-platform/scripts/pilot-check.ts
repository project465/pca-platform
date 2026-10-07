/**
 * 파일럿을 **받을 수 있는 상태인가.**
 *
 * 20~30명을 불러 놓고 설문이 반만 돌면 그 회차는 다시 못 한다. 사람을
 * 부르기 전에 묻는 것과 받는 것을 한 번 돌려 본다.
 *
 * 보는 것이 셋이다.
 *
 *   1. **여덟 가지를 실제로 묻는가.** 이번 파일럿이 받아 와야 하는 칸이
 *      여덟이고, 그것이 `pilot_items.topic` 으로 덮여 있는지 센다
 *   2. **받은 적 없는 것을 견주게 하지 않는가.** 무료만 받으신 분께
 *      '유료와의 차이' 를 묻지 않는다
 *   3. **적게 모인 칸을 숫자로 내놓지 않는가.** 다섯 명 미만은 평균도
 *      자유입력도 내지 않는다(기관 집계와 같은 규칙)
 *
 * **점수를 건드리지 않는다.** 이 표의 어느 값도 적합도에 들어가지 않고,
 * 그것을 읽는 코드가 없는지도 여기서 본다.
 *
 *   DATABASE_URL=... npx tsx scripts/pilot-check.ts
 */
import { readFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { items, save, summary, uncovered, REQUIRED_TOPICS, MIN_CELL } from "../src/lib/pilot";
import { reportLevel } from "../src/lib/entitlement";
import { attemptOf } from "../src/lib/me-v2/attempt";

const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });
/** 못 본 자리를 통과로 적지 않는다. 왜 못 봤는지를 같이 적는다 */
const SKIP: string[] = [];
const unknown = (n: string, why: string) => SKIP.push(`${n} — ${why}`);

type At = { id: string; user_id: string; tier: string };

async function main() {
  /* ── 1. 묻는 자리 ─────────────────────────────────────────────── */
  const cols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pilot_items' AND column_name IN ('topic', 'cohort')`);
  ok("pilot_items 에 칸 이름과 대상이 있다", cols.length === 2,
    cols.map((c) => c.column_name).join(" · "));

  const missing = await uncovered();
  ok(`여덟 가지를 전부 묻는다`, missing.length === 0,
    missing.length ? `빠진 것: ${missing.join(" · ")}` : `${REQUIRED_TOPICS.length}가지`);

  const all = await items("ko", { paid: true });
  const en = await items("en", { paid: true });
  ok("문항이 비어 있지 않다", all.length > 0 && all.every((i) => i.text.trim().length > 3),
    `${all.length}문항`);
  ok("영어 문면도 비어 있지 않다",
    en.length === all.length && en.every((i) => i.text.trim().length > 3));

  const scales = all.filter((i) => i.kind === "scale");
  const texts = all.filter((i) => i.kind === "text");
  ok("고르는 문항이 적는 칸보다 앞에 선다",
    scales.length > 0 && texts.length > 0 &&
    Math.max(...scales.map((i) => i.orderNo)) < Math.min(...texts.map((i) => i.orderNo)),
    `고르기 ${scales.length} · 적기 ${texts.length}`);

  /* ── 2. 등급에 따라 갈리는가 ──────────────────────────────────── */
  const free = await queryOne<At>(
    `SELECT a.id::text, a.user_id::text, a.tier FROM attempts a
      WHERE a.assessment_version = 'ME_V2' AND a.status = 'scored' AND a.tier = 'BASIC'
        AND NOT EXISTS (SELECT 1 FROM report_grants g WHERE g.attempt_id = a.id)
      ORDER BY a.id DESC LIMIT 1`);
  const paid = await queryOne<At>(
    `SELECT a.id::text, a.user_id::text, a.tier FROM attempts a
      WHERE a.assessment_version = 'ME_V2' AND a.status = 'scored' AND a.tier = 'PRO'
      ORDER BY a.id DESC LIMIT 1`);

  if (free && paid) {
    /* **ME_V2 는 등급이 문항 수를 정한다**(48 · 68 · 92). 그래서 유료
       여부는 `attempts.tier` 가 들고 있고, 학교 좌석과 기간권으로 열린
       경우만 `reportLevel()` 이 더한다 */
    const isPaid = async (a: At) =>
      a.tier !== "BASIC" || (await reportLevel(a.id).catch(() => null)) === "full";
    ok("무료 BASIC 은 유료로 세지 않는다", (await isPaid(free)) === false, free.tier);
    ok("유료 등급은 유료로 센다", (await isPaid(paid)) === true, paid.tier);

    const shownFree = await items("ko", { paid: await isPaid(free) });
    const shownPaid = await items("ko", { paid: await isPaid(paid) });
    const tier = (xs: { topic: string | null }[]) => xs.some((i) => i.topic === "tier_value");
    ok("무료만 받으신 분께 유료 전용 문항을 띄우지 않는다", !tier(shownFree));
    ok("유료 결과를 받으신 분께는 띄운다", tier(shownPaid));

    /* 남의 응시 번호를 주소에 넣어도 열리지 않는다 */
    const mine = await attemptOf(free.id, free.user_id);
    const notMine = await attemptOf(free.id, paid.user_id);
    ok("본인 응시만 열린다", !!mine && notMine === null);
  } else {
    SKIP.push("등급에 따라 갈리는가 — 채점을 끝낸 BASIC·PRO 응시가 둘 다 있어야 본다");
  }

  /* ── 3. 받는 자리 ─────────────────────────────────────────────── */
  const before = (await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM pilot_feedback`))?.n ?? 0;

  if (free && before === 0) {
    const code = scales[0]?.code ?? "P11_FIT";
    const tcode = texts[0]?.code ?? "P02_GAP";

    await save({ attemptId: free.id, userId: free.user_id, answers: [
      { code, value: 4 },
      { code: tcode, text: "   " },
      { code: "ZZ_OUT_LOW", value: 0 },
      { code: "ZZ_OUT_HIGH", value: 6 },
    ] });
    const rows = await query<{ item_code: string; value: number | null; text: string | null }>(
      `SELECT item_code, value, text FROM pilot_feedback WHERE attempt_id = $1`, [free.id]);
    ok("고른 값이 들어간다", rows.some((r) => r.item_code === code && r.value === 4));
    ok("빈칸은 적지 않는다", !rows.some((r) => r.item_code === tcode));
    ok("1~5 밖의 값은 버린다",
      !rows.some((r) => r.item_code.startsWith("ZZ_OUT")), `${rows.length}줄`);

    await save({ attemptId: free.id, userId: free.user_id, answers: [{ code, value: 2 }] });
    const again = await query<{ value: number | null }>(
      `SELECT value FROM pilot_feedback WHERE attempt_id = $1 AND item_code = $2`,
      [free.id, code]);
    ok("두 번 답하면 줄이 하나다", again.length === 1 && again[0]?.value === 2);

    await save({ attemptId: free.id, userId: free.user_id, answers: [
      { code: tcode, text: "가".repeat(900) }] });
    const long = await queryOne<{ len: number }>(
      `SELECT length(text)::int AS len FROM pilot_feedback
        WHERE attempt_id = $1 AND item_code = $2`, [free.id, tcode]);
    ok("자유입력은 600자에서 자른다", long?.len === 600, `${long?.len}자`);

    /* ── 4. 적게 모인 칸 ────────────────────────────────────────── */
    const four = await query<At>(
      `SELECT a.id::text, a.user_id::text, a.tier FROM attempts a
        WHERE a.assessment_version = 'ME_V2' AND a.status = 'scored' AND a.id <> $1
        ORDER BY a.id DESC LIMIT 4`, [free.id]);
    if (four.length === 4) {
      for (const a of four.slice(0, 3)) {
        await save({ attemptId: a.id, userId: a.user_id,
          answers: [{ code, value: 5 }, { code: tcode, text: "읽기 어려운 말이 있었습니다" }] });
      }
      const s4 = await summary("ko");
      const row4 = s4.scales.find((r) => r.code === code);
      const t4 = s4.texts.find((r) => r.code === tcode);
      ok(`${MIN_CELL}명 미만이면 평균을 내지 않는다`,
        (row4?.n ?? 0) === 4 && row4?.avg === null, `${row4?.n}명`);
      ok(`${MIN_CELL}명 미만이면 적어 주신 글을 내놓지 않는다`,
        (t4?.n ?? 0) === 4 && (t4?.answers.length ?? 1) === 0, `${t4?.n}명`);

      const fifth = four[3];
      await save({ attemptId: fifth.id, userId: fifth.user_id,
        answers: [{ code, value: 5 }, { code: tcode, text: "다섯 번째" }] });
      const s5 = await summary("ko");
      const row5 = s5.scales.find((r) => r.code === code);
      const t5 = s5.texts.find((r) => r.code === tcode);
      ok(`${MIN_CELL}명이 되면 평균이 나온다`,
        (row5?.n ?? 0) === 5 && typeof row5?.avg === "number", `평균 ${row5?.avg}`);
      ok(`${MIN_CELL}명이 되면 적어 주신 글이 나온다`,
        (t5?.answers.length ?? 0) > 0, `${t5?.answers.length}줄`);
      ok("끝까지 답한 사람 수를 센다", s5.people === 5, `${s5.people}명`);
    } else {
      SKIP.push("적게 모인 칸을 가리는가 — 채점을 끝낸 응시가 다섯 벌 있어야 본다");
    }

    /* 넣은 것을 전부 치운다. 이 DB 에는 원래 한 줄도 없었다 */
    await query(`DELETE FROM pilot_feedback`);
    const left = (await queryOne<{ n: number }>(
      `SELECT count(*)::int AS n FROM pilot_feedback`))?.n ?? 0;
    ok("시험으로 넣은 줄을 치웠다", left === 0, `${left}줄`);
  } else {
    SKIP.push(before > 0
      ? `받는 자리를 쓰지 않았다 — 이 DB 에 이미 파일럿 응답 ${before}줄이 있어 건드리지 않는다`
      : "받는 자리를 쓰지 않았다 — 채점을 끝낸 BASIC 응시가 있어야 본다");
  }

  /**
   * ── 5. 경계 ───────────────────────────────────────────────────
   *
   * 여기 몇 줄은 **소스를 읽어** 본다. 배포본 안에는 소스가 없으므로
   * 그때는 `못 봄` 이다: 없는 파일을 실패로 적으면 컨테이너에서 돌린
   * 사람이 고칠 것 없는 빨간 줄을 받는다.
   */
  const src = (p: string) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
  const srcOk = (n: string, path: string, pass: (t: string) => boolean, d?: string) => {
    const t = src(path);
    if (!t) { unknown(n, `${path} 가 없다. 저장소에서 돌릴 때 본다`); return; }
    ok(n, pass(t), d);
  };

  const scoring = src("src/lib/scoring.ts") + src("src/lib/report.ts")
    + src("src/lib/me-v2/render.ts") + src("src/lib/entitlement.ts");
  if (scoring) {
    ok("채점과 등급이 이 표를 읽지 않는다", !scoring.includes("pilot_feedback"));
  } else {
    unknown("채점과 등급이 이 표를 읽지 않는다", "배포본 안에는 소스가 없다");
  }

  const RP = "src/app/assessment/[attemptId]/report/page.tsx";
  srcOk("결과지가 설문을 요구하지 않는다", RP,
    (t) => !/pilot[^/]*\b(done|required)/.test(t));
  srcOk("파일럿 길은 PILOT_OPEN=yes 에서만 뜬다", RP,
    (t) => t.includes('process.env.PILOT_OPEN === "yes"'));
  srcOk("파기가 자유입력을 지운다", "src/lib/erasure.ts",
    (t) => t.includes("pilot_feedback"));
  const PP = "src/app/pilot/[attemptId]/page.tsx";
  srcOk("끝내지 않은 응시로는 답할 수 없다", PP, (t) => t.includes("a.submitted_at"));
  srcOk("등급은 응시 등급과 reportLevel 이 함께 정한다", PP,
    (t) => t.includes("reportLevel(") && t.includes('a.tier !== "BASIC"'));

  /* ── 결과 ─────────────────────────────────────────────────────── */
  const bad = T.filter((t) => !t.pass);
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  for (const s of SKIP) console.log(`  못 봄 ${s}`);
  console.log(`\n파일럿 준비 ${T.length}가지 가운데 ${bad.length}가지가 걸렸다.` +
    (SKIP.length ? ` 못 본 것 ${SKIP.length}가지.` : ""));
  if (!bad.length) {
    console.log("묻는 여덟 가지:");
    for (const r of REQUIRED_TOPICS) console.log(`  · ${r.what}`);
  }
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
