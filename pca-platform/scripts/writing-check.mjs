/**
 * 마스터 문체·해석 규칙 자체검수 (CareerMetri Master Writing Spec v2.0 §29).
 *
 * `copy:audit` 와 무엇이 다른가. 저쪽은 **기계가 쓴 냄새**를 센다(대시·대구·
 * 토막 문단). 이쪽은 **검사가 재지 않은 것을 단정했는가**를 본다. 둘은 겹치지
 * 않는다. "강점을 발휘합니다" 는 한국어로 자연스러워서 copy:audit 을 그냥
 * 통과하지만, 검사가 재지 않은 역량 보유를 단정하므로 여기서 걸린다.
 *
 * 세는 대상은 **화면에 실제로 찍힌 글**이다. 소스 문자열만 보면 조건에 따라
 * 안 나가는 문장까지 세고, 반대로 조각을 이어 붙여 만드는 문장은 못 본다.
 * 그래서 세 상품을 실제로 끝까지 풀어 본문을 긁어 온다.
 *
 *   node scripts/writing-check.mjs            세 상품 전부
 *   node scripts/writing-check.mjs QUICK      하나만
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = "sites/pca-platform";
const PORT = 8231;

/* CHECK A. 금지어 (§3-1 · §3-2 · §29) */
const BANNED = [
  "종합적으로", "전반적으로", "유의미", "시사", "로 해석됩니다", "로 판단됩니다",
  "라고 볼 수 있", "한 것으로 보", "경향을 보", "가능성이 높", "두드러",
  "관찰됩니다", "을 기반으로", "높은 연관", "적합한 성향", "높은 적합",
  "에 적합", "잘 맞습니다", "잘 맞는", "강점을 발휘", "강점이 드러",
  "강점이 커", "강점으로 작용", "경쟁력", "역량을 강화", "적합도를 높",
  "방향성을 설정", "효과적으로", "긍정적인 영향", "잠재력", "성장 가능성",
  "뛰어난", "탁월한", "우수한", "남보다", "성공 가능성", "합격 가능성",
  "하는 힘", "하는 유형입니다", "곧 성과가", "에서 값이 큽니다",
  "유형의 실제 값", "보는 것이 적절", "에서 강점", "업무에 잘",
  "이 절의 목적", "읽는 순서를 제안", "현실적입니다",
  "하는 편이 낫", "하는 편이 안전", "라고 보아도 됩니다", "안전합니다",
  "천직", "최적의 직무", "최고의 선택", "가장 잘할 수 있",
];

/* CHECK B. 과잉 단정 — 검사가 재지 않은 것을 사실로 적은 자리 */
const OVERCLAIM = [
  [/당신은\s*[가-힣]+형입니다/, "성향을 성격처럼 규정했다"],
  [/[가-힣]+형은\s[^.]*?(?:유형|성과를 내)/, "성향을 사람 유형으로 규정했다"],
  [/(?:FIT|적합도)[^.]{0,30}(?:합격|성공|채용)\s*(?:가능성|확률)/, "FIT 을 합격 가능성으로 썼다"],
  [/(?:보유하고 있|갖추고 있)[^.]{0,6}(?:역량|능력)/, "검사가 재지 않은 역량 보유를 단정했다"],
  [/(?:역량|능력)[^.]{0,6}(?:부족|미흡)합니다/, "낮은 점수를 능력 부족으로 읽었다"],
  [/추천(?:합니다|드립니다|해 드립니다)/, "직업정보제공사업 범위 밖의 '추천' 이다"],
];

/* CHECK F. 지어낸 수치와 시장 사실 (규격 16·35장).
   임금·비자·면허·수요는 확인된 자료가 있을 때만 적을 수 있다. 지금 이
   플랫폼에는 그 자료가 없으므로 **한 줄도 나오면 안 된다.** 이 셋은 틀리면
   사람이 그걸 믿고 움직인다. */
const INVENTED = [
  [/상위\s*\d+\s*%/, "규준이 없는데 상위 몇 %를 썼다"],
  [/\d+\s*%\s*(?:의?\s*)?(?:확률|가능성)/, "확률을 지어냈다"],
  [/취업률|합격률|채용\s*규모가\s*\d/, "시장 통계를 지어냈다"],
  [/(?:연봉|초봉|임금)[^.]{0,20}(?:\d|천만|억)/, "임금 자료가 없는데 금액을 적었다"],
  [/비자|워크퍼밋|취업\s*허가[^.]{0,20}(?:받|필요|요건)/, "취업 허가 요건을 지어냈다"],
  [/(?:면허|licen[sc]e)[^.]{0,20}(?:필수|있어야)/, "면허 요건을 지어냈다"],
  [/대부분의?\s*(?:기업|회사)(?:는|가|에서)[^.]{0,20}(?:요구|필요)/, "'대부분의 기업은' 은 출처 없는 시장 주장이다"],
];

/* CHECK G. 영문 금지 표현 (규격 26장). 영어판을 낼 때를 대비해 지금부터 센다. */
const BANNED_EN = [
  "best fit", "perfect fit", "ideal career", "natural talent",
  "exceptional strength", "competitive advantage", "unlock your potential",
  "maximize your potential", "destined for", "highly likely to succeed",
  "this clearly shows", "career success", "leverage your strengths",
  "highly suited for", "strong potential",
];

/* CHECK D. 행동성 — 조언이 추상어로 끝나는 자리 */
const VAGUE_ACTION = [
  /역량을?\s*(?:강화|키우|기르)/, /실무\s*경험을?\s*쌓/, /네트워킹을?\s*강화/,
  /꾸준히\s*노력/, /적극적으로\s*(?:준비|참여)/, /열심히/,
];

/* CHECK C. 두 번까지만 직접 반복할 수 있는 결론 (§22) */
const REPEATABLE = [
  [/직무\s*확정/, "직무 확정이 아니다"],
  [/합격\s*가능성(?:이|은)?\s*아니/, "점수는 합격 가능성이 아니다"],
  /* 공고를 **보라는 권유**만 센다. 공고가 주제인 절에서 '채용공고' 라는
     낱말이 나오는 것은 반복이 아니라 그 절의 내용이다. */
  [/채용공고[^.]{0,30}(?:보세요|확인해|읽어|찾아)/, "채용공고를 보라"],
  [/실제\s*경험이\s*(?:중요|필요)/, "실제 경험이 중요하다"],
];
/* §27 이 막는 것은 "이 결과가 OOO로 나왔다는 것은" 이라는 틀이다. */
const OVERCLAIM_EXTRA = [[/이 결과가[^.]{0,24}나왔다는 것은/, "§27 의 '이 결과가 ~ 나왔다는 것은' 틀"]];

/* ── 정적 서버. 외부로 나가지 않는 플랫폼이라 파일만 내주면 된다 ────────── */
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

/* ── 한 상품을 끝까지 풀고 본문을 긁는다 ──────────────────────────────── */
async function render(browser, form) {
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
    await p.click('#stageList .major[data-code="EARLY"]').catch(() => p.click("#stageList .major"));
    await p.click("#btnStageNext");
  }
  if ((await at()) === "s-major") {
    await p.click("#majorList .major:not([disabled])"); await p.click("#btnMajorNext");
  }
  await p.fill("#pfName", "이수민"); await p.click('#pfGender .seg[data-v="F"]');
  await p.fill("#pfSid", "20231234"); await p.check("#pfAgree"); await p.click("#btnProfileNext");
  for (let i = 0; i < 500; i++) {
    if ((await at()) === "s-result") break;
    const n = await p.$$eval("#opts .opt", (e) => e.length).catch(() => 0);
    if (!n) break;
    await p.click(`#opts .opt:nth-child(${Math.min(n, 2 + (i % 4))})`).catch(() => {});
    await p.waitForTimeout(45);
  }
  await p.waitForTimeout(900);
  const out = await p.evaluate(() => ({
    body: document.getElementById("resultBody")?.innerText || "",
    json: window.PCA_RESULT_JSON || null,
    paras: [...document.querySelectorAll("#resultBody p, #resultBody li")]
      .map((e) => e.innerText.trim()).filter(Boolean),
  }));
  await c.close();
  return { ...out, errs };
}

/* ── 검수 ─────────────────────────────────────────────────────────────── */
function sentences(t) {
  return t.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 4);
}

function inspect(form, r) {
  const rows = [];
  const text = r.body;

  /* 부정문은 지나간다. 규격이 막는 것은 **결론**이지 그 결론을 막는
     문장이 아니다. "합격 가능성을 잰 값이 아닙니다" 는 규격이 시킨 문장이라,
     이것까지 세면 고치는 쪽이 경고문을 지우게 된다. */
  const NEG = /아니|않|없|못|말고|막|넘어가지/;
  for (const w of BANNED) {
    const hits = sentences(text).filter((s) => s.includes(w) && !NEG.test(s));
    if (!hits.length) continue;
    rows.push(["A 금지어", `"${w}" ${hits.length}회`, hits[0].slice(0, 70)]);
  }
  for (const [re, why] of OVERCLAIM.concat(OVERCLAIM_EXTRA)) {
    const m = text.match(re);
    if (m) rows.push(["B 과잉 단정", why, m[0].slice(0, 70)]);
  }
  const seen = new Map();
  for (const s of sentences(text)) {
    const k = s.replace(/\s+/g, "");
    if (k.length < 20) continue;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const [k, n] of seen) if (n > 1) rows.push(["C 반복", `같은 문장 ${n}회`, k.slice(0, 70)]);
  for (const [re, label] of REPEATABLE) {
    const n = sentences(text).filter((s) => re.test(s)).length;
    if (n > 2) rows.push(["C 반복", `"${label}" ${n}회 (2회까지)`, ""]);
  }
  for (const re of VAGUE_ACTION) {
    const s = sentences(text).find((x) => re.test(x));
    if (s) rows.push(["D 행동성", "조언이 추상어로 끝난다", s.slice(0, 70)]);
  }
  for (const [re, why] of INVENTED) {
    const hit = sentences(text).find((x) => re.test(x) && !/아니|않|없|못/.test(x));
    if (hit) rows.push(["F 지어낸 사실", why, hit.slice(0, 70)]);
  }
  const low = text.toLowerCase();
  for (const w of BANNED_EN) {
    if (low.includes(w)) rows.push(["G 영문 금지어", `"${w}"`, ""]);
  }
  /* E. BASIC 은 한 문단 1~3문장 (§17) */
  if (form === "QUICK") {
    const long = r.paras.filter((t) => sentences(t).length > 3);
    for (const t of long.slice(0, 3)) rows.push(["E 등급", "BASIC 문단이 3문장을 넘는다", t.slice(0, 70)]);
  }
  return rows;
}

const only = process.argv.slice(2);
const forms = (only.length ? only : ["QUICK", "STANDARD", "PRO"]);
const srv = await serve();
const { chromium: cr } = await import("playwright");
const browser = await cr.launch({ args: ["--no-sandbox"] });
let failed = 0;
for (const form of forms) {
  const r = await render(browser, form);
  const rows = inspect(form, r);
  const head = `${form}  (본문 ${r.body.replace(/\s+/g, "").length}자${r.json ? " · JSON 있음" : ""})`;
  if (r.errs.length) { console.log(`\n  JS 오류 ${form}`, r.errs.slice(0, 2)); failed++; }
  if (!rows.length) { console.log(`  OK  ${head}`); continue; }
  console.log(`\n  넘침 ${head}`);
  const by = {};
  for (const [k, what, ex] of rows) (by[k] ||= []).push([what, ex]);
  for (const k of Object.keys(by).sort()) {
    console.log(`      ${k} — ${by[k].length}건`);
    for (const [what, ex] of by[k].slice(0, 12)) console.log(`        ${what}${ex ? `  ← ${ex}` : ""}`);
    if (by[k].length > 12) console.log(`        … ${by[k].length - 12}건 더`);
  }
  failed += rows.length;
}
await browser.close();
srv.close();
console.log(failed ? `\n${failed}건이 규칙을 어겼다.` : "\n문체 규칙 OK.");
process.exit(failed ? 1 : 0);
