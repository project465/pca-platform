/**
 * 골든 테스트 — 규격이 "이것만은 깨지면 안 된다" 고 적은 것들.
 *
 * 문체 검사(`writing:check`)가 **어떻게 썼는가**를 본다면 이쪽은 **무엇이
 * 달라지면 안 되는가**를 본다. 둘은 다른 종류의 고장을 잡는다. 문장을 아무리
 * 곱게 써도 학위 단계를 바꿨는데 같은 글이 나오면 그 제품은 실패다.
 *
 * 여기 있는 여섯은 전부 한 번씩 실제로 깨져 본 적이 있거나, 깨지면 제품을
 * 못 파는 것들이다.
 *
 *   node scripts/golden-check.mjs
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = "sites/pca-platform";
const PORT = 8232;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
};
function serve() {
  return new Promise((ok) => {
    const s = createServer((req, res) => {
      const rel = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
      let f = join(ROOT, rel === "/" ? "index.html" : rel);
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
      if (!existsSync(f)) { res.writeHead(404); res.end("no"); return; }
      res.writeHead(200, { "content-type": MIME[extname(f)] || "text/plain; charset=utf-8" });
      res.end(readFileSync(f));
    });
    s.listen(PORT, "127.0.0.1", () => ok(s));
  });
}

/* 같은 답을 넣어야 비교가 성립한다. 보기 번호를 문항 순서로 고정한다. */
const PATTERN = (i) => 1 + ((i * 7) % 5);

async function take(browser, { stage, form }) {
  const c = await browser.newContext({ viewport: { width: 1100, height: 980 } });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  const at = () => p.evaluate(() =>
    [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
  const B = `http://127.0.0.1:${PORT}/index.html`;
  await p.goto(B, { waitUntil: "networkidle" });
  await p.evaluate(() => { try { localStorage.clear(); } catch {} });
  await p.goto(`${B}?major=ME&form=${form}&fresh=1`, { waitUntil: "networkidle" });
  if ((await at()) === "s-stage") {
    await p.click(`#stageList .major[data-code="${stage}"]`).catch(() => p.click("#stageList .major"));
    await p.click("#btnStageNext");
  }
  if ((await at()) === "s-major") {
    await p.click("#majorList .major:not([disabled])"); await p.click("#btnMajorNext");
  }
  await p.fill("#pfName", "이수민"); await p.click('#pfGender .seg[data-v="F"]');
  await p.fill("#pfSid", "20231234"); await p.check("#pfAgree"); await p.click("#btnProfileNext");
  /* **문항 번호로 고른다.** 반복 횟수로 고르면 클릭이 늦게 먹힌 날 같은
     문항에 다른 보기를 눌러 응답 묶음이 통째로 달라진다. */
  const qidx = () => p.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("pca_session_v1")).idx; } catch { return -1; }
  });
  for (let guard = 0; guard < 600; guard++) {
    if ((await at()) === "s-result") break;
    const n = await p.$$eval("#opts .opt", (e) => e.length).catch(() => 0);
    if (!n) break;
    const at0 = await qidx();
    await p.click(`#opts .opt:nth-child(${Math.min(n, PATTERN(at0))})`).catch(() => {});
    for (let w = 0; w < 40; w++) {
      if ((await qidx()) !== at0 || (await at()) === "s-result") break;
      await p.waitForTimeout(25);
    }
  }
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const J = window.PCA_RESULT_JSON;
    return {
      json: J,
      text: document.getElementById("resultBody")?.innerText || "",
      /* 짧은 화면과 긴 결과지는 절 표시가 다르다. 둘 다 센다 */
      /* 짧은 화면은 `.section`, 긴 결과지는 `.rp-sub` 가 한 절이다 */
      heads: [...document.querySelectorAll("#resultBody .section h2.sect, #resultBody .rp-sub h3")]
        .map((x) => x.textContent.replace(/^\d+\.\s*/, "").trim()),
    };
  });
  await c.close();
  return { ...r, errs };
}

const T = [];
const ok = (name, pass, detail) => { T.push({ name, pass, detail }); };

const srv = await serve();
const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

const undergrad = await take(browser, { stage: "UNDERGRAD", form: "QUICK" });
const phd = await take(browser, { stage: "PHD", form: "QUICK" });
const std = await take(browser, { stage: "UNDERGRAD", form: "STANDARD" });

/* 1. 적합도는 취업 가능성이 아니다 */
{
  const bad = /합격\s*가능성|취업\s*확률|성공\s*가능성/;
  const claim = undergrad.text.split(/(?<=[.!?])\s+|\n+/)
    .filter((s) => bad.test(s) && !/아니|않|없|못/.test(s));
  ok("적합도를 합격 가능성으로 쓰지 않는다", claim.length === 0, claim[0] || "");
}

/* 2. 국적은 점수에 닿지 않는다 — 받지도 않고 담지도 않는다 */
{
  const J = undergrad.json;
  const clean = J && J.profile.citizenship_country === null;
  const noField = !/국적|nationality/i.test(
    readFileSync(join(ROOT, "index.html"), "utf8"));
  ok("국적을 받지 않고 결과에도 담지 않는다", !!clean && noField,
    clean ? "" : "profile.citizenship_country 가 비어 있지 않다");
}

/* 3. 학위 단계가 다르면 결과지가 실제로 달라진다 */
{
  const a = undergrad.json?.education_stage_lens;
  const b = phd.json?.education_stage_lens;
  const diffLens = a && b && a.question !== b.question;
  const diffSecs = undergrad.heads.join("|") !== phd.heads.join("|");
  ok("학부와 박사가 다른 질문·다른 절을 받는다", !!(diffLens && diffSecs),
    diffLens ? (diffSecs ? "" : "절 구성이 같다") : "질문이 같다");
}

/* 4. 측정 오차 안에 든 직무는 한 묶음으로 간다 */
{
  const J = undergrad.json;
  const se = J?.assessment.measurement_error;
  const g1 = (J?.job_fit || []).filter((x) => x.group === 1);
  const inside = g1.every((x) => g1[0].fit - x.fit <= se);
  const outside = (J?.job_fit || []).filter((x) => x.group > 1)
    .every((x) => g1[0].fit - x.fit > se);
  ok("오차 안의 직무만 1군에 든다", inside && outside,
    `1군 ${g1.length}개 · 오차 ±${se}`);
}

/* 5. 낸 적 없는 경험을 만들어 내지 않는다 */
{
  const J = undergrad.json;
  const empty = J && Object.values(J.evidence).every((v) => Array.isArray(v) && !v.length);
  /* 지어낸 경험은 "하셨습니다 / 하신 경험" 처럼 **과거형 단정**으로 나타난다 */
  const invented = undergrad.text.split(/(?<=[.!?])\s+|\n+/)
    .filter((s) => /(?:프로젝트|연구|인턴)[^.]{0,12}(?:하셨|해 오셨|보유하고)/.test(s));
  ok("낸 적 없는 경험을 지어내지 않는다", !!empty && invented.length === 0,
    invented[0] || "");
}

/* 6. 측정 오차와 정보량은 다른 칸이다 */
{
  const J = undergrad.json;
  const hasBoth = J && typeof J.assessment.measurement_error === "number" &&
    J.information_coverage && typeof J.information_coverage.level === "string";
  ok("오차와 정보량을 따로 담는다", !!hasBoth,
    hasBoth ? `±${J.assessment.measurement_error} · 정보량 ${J.information_coverage.level}` : "");
}

/* 7. 나라 자료가 없으면 없다고 적고 지어내지 않는다 */
{
  const J = undergrad.json;
  const said = J?.country_context && J.country_context.available === false &&
    !!J.country_context.notice;
  /* 낱말이 아니라 **주장**을 센다. "연봉보다 장비를 먼저 보라" 는 시장
     자료가 아니고, "초봉 4,200만 원" 은 자료다. 뒤엣것만 금지한다. */
  const claims = undergrad.text.split(/(?<=[.!?])\s+|\n+/).filter((x) =>
    /* 없다고 적은 문장까지 세면 고치는 쪽이 안내문을 지우게 된다 */
    !/아니|않|없|못|넣지/.test(x) && (
      /(?:연봉|초봉|임금)[^.]{0,20}(?:\d|천만|억)/.test(x) ||
      /취업\s*비자|비자\s*(?:발급|요건|문제|스폰)|취업\s*허가/.test(x) ||
      /면허[^.]{0,16}(?:필수|있어야)/.test(x)));
  ok("목표 국가가 없으면 나라별 주장을 하지 않는다", !!said && claims.length === 0,
    claims[0] || (said ? "" : "country_context 가 비어 있다"));
}

/* 8. 상품이 깊이로 갈린다 */
{
  /* 길이만 보면 같은 말을 늘려 놓아도 통과한다. BASIC 에 **없는 절**이
     실제로 생겼는지를 함께 본다(규격 20장: PRO 는 STANDARD 를 늘린 것이
     아니어야 한다. 같은 요구가 STANDARD 에도 걸린다). */
  const onlyStd = std.heads.filter((h) => !undergrad.heads.includes(h));
  const longer = std.text.length > undergrad.text.length * 3;
  ok("STANDARD 가 BASIC 에 없는 절을 더한다", onlyStd.length >= 8 && longer,
    `절 ${undergrad.heads.length} → ${std.heads.length} (새 절 ${onlyStd.length}) · ` +
    `글자 ${undergrad.text.length} → ${std.text.length}`);
}

const jsErr = [...undergrad.errs, ...phd.errs, ...std.errs];
ok("JS 오류 없음", jsErr.length === 0, jsErr[0] || "");

await browser.close();
srv.close();

let bad = 0;
for (const t of T) {
  console.log(`  ${t.pass ? "OK  " : "실패"} ${t.name}${t.detail ? `  (${t.detail})` : ""}`);
  if (!t.pass) bad++;
}
console.log(bad ? `\n${bad}개가 깨졌다.` : "\n골든 테스트 OK.");
process.exit(bad ? 1 : 0);
