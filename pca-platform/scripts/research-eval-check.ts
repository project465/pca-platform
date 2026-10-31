/**
 * 논문 읽기 채점표(2026-10-31).
 *
 *   npm run build && bash scripts/stage-serve.sh 3151
 *   UI_BASE=http://127.0.0.1:3151 npm run mat:eval
 *
 * 모델을 부르지 않는다. 재는 것은 채점표가 바르게 서는가다: 본인 자료에만 적히는가 ·
 * 엉뚱한 값을 받지 않는가 · 열 건 전에는 판정하지 않는가 · 합격선대로 가르는가 ·
 * 지어냄 한 건이 합격을 뒤집는가 · 운영 화면에 자료 제목이 새지 않는가 · 휴대폰에서
 * 누를 수 있는가.
 */
import { loadEnv, BASE, login, makeStudent, cloneFinished } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { chromium } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { GRADE_PARTS, MIN_DOCS, evalReport, saveFeedback } from "../src/lib/assistant/research-eval";

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};
const SECRET_TITLE = "zz-eval 비공개 제목 Cathode Coating";

async function addDoc(userId: string, i: number, lang: "en" | "ko"): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `INSERT INTO research_docs (user_id, core_code, sha256, file_kind, doc_type, lang, title, data, terms)
     VALUES ($1, 'ME_CORE_V3', $2, 'pdf', 'paper', $3, $4, $5::jsonb, '{}')
     RETURNING id::text`,
    [userId, `zz-eval-${i}`, lang, `${SECRET_TITLE} ${i}`,
      JSON.stringify({ summary: "양극재 코팅 두께를 최적화했습니다.", methods: ["실험계획법"],
        findings: [i % 2 ? "500사이클 뒤 용량 유지율 92.4% (그림 4)" : "코팅이 두꺼울수록 저항이 커졌다"],
        job_language: [{ skill: "공정 조건 최적화", evidence: "3장" }], interview: ["왜 3인자였나요?"] })]);
  return r?.id as string;
}

async function main(): Promise<void> {
  const a = await makeStudent("zz-eval-a");
  const b = await makeStudent("zz-eval-b");
  await cloneFinished(a.id, "BASIC");
  await query(`DELETE FROM research_docs WHERE user_id = ANY($1::bigint[])`, [[a.id, b.id]]);

  /* 1 — 적히는 자리 */
  const d0 = await addDoc(a.id, 0, "en");
  ok("본인 자료에는 적힌다", await saveFeedback(a.id, d0, "summary", "right"));
  ok("남의 자료에는 적히지 않는다", !(await saveFeedback(b.id, d0, "summary", "wrong")));
  ok("지어냄 칸은 맞음/틀림을 받지 않는다", !(await saveFeedback(a.id, d0, "invented", "right")));
  ok("요약 칸은 있음/없음을 받지 않는다", !(await saveFeedback(a.id, d0, "summary", "yes")));
  ok("모르는 칸은 받지 않는다", !(await saveFeedback(a.id, d0, "title", "right")));
  const v = await queryOne<{ verdict: string }>(`SELECT verdict FROM research_feedback WHERE doc_id = $1 AND part = 'summary'`, [d0]);
  ok("남이 누른 값이 덮어쓰지 않았다", v?.verdict === "right", v?.verdict);

  /* 2 — 열 건 전에는 판정하지 않는다 */
  const r1 = await evalReport({ demo: true });
  ok("열 건이 안 되면 판정 전이다", r1.verdict === "wait" && r1.parts.every((p) => p.status === "wait"), r1.verdict);

  /* 3 — 열 건을 다 맞음으로 */
  const ids = [d0];
  for (let i = 1; i < MIN_DOCS; i++) ids.push(await addDoc(a.id, i, i < 3 ? "en" : "ko"));
  for (const id of ids) {
    for (const g of GRADE_PARTS) await saveFeedback(a.id, id, g.key, "right");
    await saveFeedback(a.id, id, "invented", "no");
  }
  const r2 = await evalReport({ demo: true });
  ok("열 건이 다 맞으면 합격이다", r2.verdict === "pass" && r2.graded >= MIN_DOCS, `${r2.verdict} · ${r2.graded}`);
  ok("영어 자료를 따로 센다", r2.gradedEn >= 3, String(r2.gradedEn));
  ok("근거 위치가 붙은 결과 줄을 센다", r2.located.withPlace >= 5 && r2.located.lines >= 10,
    `${r2.located.withPlace}/${r2.located.lines}`);
  ok("시연 계정은 기본으로 빠진다", (await evalReport()).graded < r2.graded);

  /* 4 — 지어냄 한 건이 합격을 뒤집는다(10% > 5%) */
  await saveFeedback(a.id, ids[1], "invented", "yes");
  const r3 = await evalReport({ demo: true });
  ok("지어냄이 5% 를 넘으면 불합격이다", r3.verdict === "fail" && r3.invented.status === "fail", pct(r3.invented.rate));
  await saveFeedback(a.id, ids[1], "invented", "no");

  /* 5 — 핵심 결과가 셋 틀리면 그 칸만 불합격(70%) */
  for (const id of ids.slice(0, 4)) await saveFeedback(a.id, id, "findings", "wrong");
  const r4 = await evalReport({ demo: true });
  const f = r4.parts.find((p) => p.key === "findings");
  ok("핵심 결과 6/10 은 합격선 70% 아래다", f?.status === "fail" && r4.parts.filter((p) => p.status === "fail").length === 1,
    pct(f?.rate ?? null));
  ok("일부는 맞은 것으로 치지 않는다", await (async () => {
    await saveFeedback(a.id, ids[9], "summary", "partly");
    const s = (await evalReport({ demo: true })).parts.find((p) => p.key === "summary");
    return s?.right === 9 && s?.partly === 1;
  })());

  /* 6 — 화면 */
  const admin = await makeStudent("zz-eval-admin");
  const org = await queryOne<{ id: string }>(`SELECT org_id::text AS id FROM memberships WHERE role = 'superadmin' LIMIT 1`);
  await query(`DELETE FROM memberships WHERE user_id = $1`, [admin.id]);
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'superadmin')`, [admin.id, org?.id ?? null]);

  const br = await chromium.launch();
  try {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
    const p = await login(ctx, "zz-eval-a", a.pw);
    await p.goto(`${BASE}/me/track/research`, { waitUntil: "networkidle" });
    const t = await p.locator("body").innerText();
    ok("자료마다 채점표가 선다", (t.match(/이 정리가 맞나요\?/g) ?? []).length === MIN_DOCS, String((t.match(/이 정리가 맞나요\?/g) ?? []).length));
    /* 맨 위 자료(가장 최근)의 '면접 질문' 을 틀림으로 바꿔 누른다 */
    const form = p.locator('[data-part="interview"]').first();
    await form.locator("button", { hasText: "틀림" }).click();
    await p.waitForLoadState("networkidle");
    await p.locator('[data-part="interview"]').first()
      .locator('button[aria-pressed="true"]', { hasText: "틀림" }).waitFor({ timeout: 8000 }).catch(() => undefined);
    const top = await queryOne<{ verdict: string }>(
      `SELECT f.verdict FROM research_feedback f JOIN research_docs d ON d.id = f.doc_id
        WHERE d.user_id = $1 AND f.part = 'interview' ORDER BY d.created_at DESC, d.id DESC LIMIT 1`, [a.id]);
    ok("누른 값이 DB 에 적힌다", top?.verdict === "wrong", top?.verdict);
    const pressed = await p.locator('[data-part="interview"]').first()
      .locator('button[aria-pressed="true"]').innerText().catch(() => "");
    ok("누른 값이 그 자리에 켜진다", pressed.trim() === "틀림", pressed);
    const h = await p.locator('[data-part="interview"]').first()
      .locator("button").first().boundingBox();
    ok("휴대폰에서 누르는 자리가 32px 이상이다", (h?.height ?? 0) >= 32, String(h?.height));
    const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok("휴대폰 폭에서 가로 스크롤이 없다", sx <= 0, String(sx));
    await ctx.close();

    const actx = await br.newContext({ viewport: { width: 390, height: 844 } });
    const ap = await login(actx, "zz-eval-admin", admin.pw);
    await ap.goto(`${BASE}/admin/research-eval?demo=1`, { waitUntil: "networkidle" });
    const at = await ap.locator("body").innerText();
    ok("운영 화면이 칸마다 판정을 적는다", at.includes("논문 읽기 채점표") && at.includes("핵심 결과와 근거 위치") && at.includes("불합격"));
    ok("운영 화면에 자료 제목이 나오지 않는다", !at.includes("zz-eval 비공개 제목") && !at.includes("Cathode"));
    const asx = await ap.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok("운영 화면도 휴대폰 폭에서 가로로 밀리지 않는다", asx <= 0, String(asx));
    await actx.close();
  } finally {
    await br.close();
  }

  /* 7 — 자료를 지우면 채점도 같이 지워진다 */
  await query(`DELETE FROM research_docs WHERE user_id = $1`, [a.id]);
  const left = await queryOne<{ n: number }>(`SELECT count(*)::int n FROM research_feedback WHERE doc_id = ANY($1::bigint[])`, [ids]);
  ok("자료를 지우면 채점 줄도 지워진다", left?.n === 0, String(left?.n));

  console.log(`\n논문 읽기 채점표 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}

function pct(x: number | null): string { return x === null ? "—" : `${Math.round(x * 1000) / 10}%`; }

void main();
