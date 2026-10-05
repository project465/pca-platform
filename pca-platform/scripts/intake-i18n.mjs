/**
 * 응시 화면과 경험 입력 화면의 두 언어.
 *
 * 결과지만 옮기면 **반만 팔린다**: 영어로 산 사람이 한국어 문항 화면에서
 * 92문항을 푼다. 그래서 여기서 보는 것은 셋이다.
 *
 *   1. 한국어 화면이 **예전과 한 글자도 다르지 않은가**(코드모드 회귀)
 *   2. 영어 화면에 한글이 새지 않는가
 *   3. 사전에 없는 문구가 몇 가지인가
 *
 *   node scripts/intake-i18n.mjs            대조
 *   node scripts/intake-i18n.mjs --bless    지금 한국어를 기준으로 굳힌다
 *   node scripts/intake-i18n.mjs --dump     빠진 것을 파일로
 */
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";

const ROOT = "sites/pca-platform";
const BASE = "docs/metri/generated/intake-baseline.json";
const PORT = 8252;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png",
};

const srv = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = normalize(decodeURIComponent(req.url.split("?")[0]))
      .replace(/^(\.\.[/\\])+/, "");
    let f = join(ROOT, rel === "/" ? "index.html" : rel);
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) { res.writeHead(404); res.end("no"); return; }
    res.writeHead(200, { "content-type": MIME[extname(f)] || "text/plain; charset=utf-8" });
    res.end(readFileSync(f));
  });
  s.listen(PORT, "127.0.0.1", () => ok(s));
});

const { chromium } = await import("playwright");
const browser = await chromium.launch({
  args: ["--no-sandbox"],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});

/** 한 등급 · 한 언어의 응시 화면과 경험 입력 첫 걸음을 그린다 */
async function render(tier, stage, lang) {
  const c = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(
    `http://127.0.0.1:${PORT}/v2.html?fresh=1&tier=${tier}&stage=${stage}&lang=${lang}`,
    { waitUntil: "networkidle" });
  /* 학위 단계 화면 → 문항 화면 */
  await p.click("#v2ToStage").catch(() => {});
  await p.click("#v2ToQ").catch(() => {});
  await p.waitForTimeout(260);

  const got = await p.evaluate(() => {
    const scr = document.querySelector(".screen.active");
    const q = document.getElementById("v2QBody");
    const ask = (scr ? scr.innerHTML : "") + "||" + (q ? q.innerHTML : "");
    let ev = "";
    try {
      /* 호스트가 넘기는 것과 같은 말을 넘긴다. 여기서 한국어를 그대로
         넣으면 **검사가 자기가 넣은 글자를 샌 것으로 센다** */
      const T = window.PCAI18N ? window.PCAI18N.T : (x) => x;
      window.PCAEvidenceUI.open({
        stage: "master", cancelLabel: T("그만두기"), onDone() {},
      });
      const n = document.querySelector("#evBody, .evwrap, .evhost");
      ev = n ? n.innerHTML : "(없음)";
    } catch (e) { ev = "오류: " + e.message; }
    return {
      ask, ev,
      missing: window.PCAI18N ? window.PCAI18N.missing() : [],
    };
  });
  await c.close();
  return { ...got, errs };
}

const CASES = [["BASIC", "bachelor"], ["STANDARD", "master"], ["PRO", "phd"]];
const baseline = existsSync(BASE) ? JSON.parse(readFileSync(BASE, "utf8")) : {};
const fresh = {};
const bad = [];
const out = [];
const missingAll = new Set();
const leaked = new Set();
const h = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

for (const [tier, stage] of CASES) {
  const ko = await render(tier, stage, "ko");
  const en = await render(tier, stage, "en");
  const key = `${tier}_${stage}`;
  fresh[key] = { ask: h(ko.ask), ev: h(ko.ev) };

  if (ko.errs.length) bad.push(`${key} 한국어 화면에서 오류: ${ko.errs[0].slice(0, 80)}`);
  if (en.errs.length) bad.push(`${key} 영어 화면에서 오류: ${en.errs[0].slice(0, 80)}`);

  /* 1. 한국어가 예전과 같은가 */
  const b = baseline[key];
  if (b && b.ask !== fresh[key].ask) {
    bad.push(`${key} 한국어 응시 화면이 달라졌다 (${b.ask} → ${fresh[key].ask})`);
  }
  if (b && b.ev !== fresh[key].ev) {
    bad.push(`${key} 한국어 경험 입력 화면이 달라졌다 (${b.ev} → ${fresh[key].ev})`);
  }

  /* 2. 영어에 한글이 새지 않는가 */
  const text = (en.ask + " " + en.ev).replace(/<[^>]*>/g, " ");
  const han = [...new Set(text.match(/[가-힣][가-힣\s·]{0,24}/g) || [])];
  if (han.length) {
    bad.push(`${key} 영어 화면에 한글이 ${han.length}군데 남았다: ` +
      han.slice(0, 4).map((x) => x.trim()).join(" | "));
  }
  for (const x of han) leaked.add(x.trim());
  for (const m of en.missing || []) missingAll.add(m);

  out.push(`${key.padEnd(18)} ko 응시 ${fresh[key].ask} · 경험 ${fresh[key].ev} · ` +
    `영어 한글 ${han.length}`);
}

await browser.close();
srv.close();

console.log(out.join("\n"));

if (process.argv.includes("--dump")) {
  mkdirSync("docs/metri/generated", { recursive: true });
  writeFileSync("docs/metri/generated/intake-missing.json",
    JSON.stringify([...missingAll].sort(), null, 1) + "\n");
  writeFileSync("docs/metri/generated/intake-leaked.json",
    JSON.stringify([...leaked].sort(), null, 1) + "\n");
  console.log(`\n사전에 없는 문구 ${missingAll.size}가지 · 샌 글자 ${leaked.size}가지`);
}

if (process.argv.includes("--bless")) {
  mkdirSync(dirname(BASE), { recursive: true });
  writeFileSync(BASE, JSON.stringify(fresh, null, 1) + "\n");
  console.log("한국어 기준을 굳혔다:", BASE);
}

if (bad.length) {
  console.error(`\n${bad.length}개가 걸렸다.`);
  for (const x of bad) console.error("  " + x);
  process.exit(1);
}
console.log("\n응시·경험 화면 두 언어 대조 OK.");
