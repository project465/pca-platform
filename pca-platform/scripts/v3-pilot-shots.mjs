/**
 * 파일럿 화면 셋을 눈으로 본다.
 *
 * 참가 등록 · 의견 · 운영 한 표. 셋 다 **글자가 사람 말인지**와 **내부
 * 코드가 새지 않는지**를 같이 센다. 결과지 캡처와 같은 그림을 쓴다.
 *
 *   node scripts/v3-pilot-shots.mjs <plan.json>
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/metri/shots/v3p";
mkdirSync(OUT, { recursive: true });

const plan = JSON.parse(readFileSync(process.argv[2], "utf8"));
const attempt = plan.targets.find((t) => t.name === "r3_pro").path.split("/")[2];
const PW = { "me-admin": "pca-dev-org-1234", admin: "pca-dev-admin-1234" };

const INTERNAL = [
  /\bTD\d{2}\b/, /\bJ[1-8]\b/, /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/,
  /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/,
  /\b(?:undefined|null|NaN|TODO|TBD)\b/,
];
/* 가명은 `V3-XXXXX` 라 내부 코드 그림에 걸리지 않는다. 그래도 한 번 적어 둔다 */
const ALLOW = /^V3-[A-Z0-9]{5}$/;

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function shoot(who, path, name, size) {
  const ctx = await browser.newContext({
    viewport: size === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  });
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "networkidle" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', who);
  await p.fill('input[type="password"]', PW[who]);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
    .catch(() => {});
  const r = await p.goto(B + path, { waitUntil: "networkidle" });
  const code = r ? r.status() : 0;
  const text = await p.evaluate(() => document.body.innerText);
  const leaked = INTERNAL
    .map((re) => (text.match(re) ?? [])[0])
    .filter((x) => x && !ALLOW.test(x));
  const overflow = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1);
  await p.screenshot({ path: `${OUT}/${name}__${size}.png`, fullPage: true });
  await ctx.close();
  return { code, leaked, overflow };
}

const problems = [];
const jobs = [
  ["me-admin", "/v3/pilot", "p1_join"],
  ["me-admin", `/v3/${attempt}/feedback`, "p2_feedback"],
  ["admin", "/admin/v3-pilot", "p3_admin"],
];
for (const [who, path, name] of jobs) {
  for (const size of ["desktop", "mobile"]) {
    const r = await shoot(who, path, name, size);
    console.log(`${name.padEnd(12)} ${size.padEnd(8)} ${r.code}`);
    if (r.code !== 200) problems.push(`${name} ${size}: ${r.code}`);
    if (r.leaked.length) problems.push(`${name} ${size}: 내부 코드 ${r.leaked.join(" ")}`);
    if (r.overflow) problems.push(`${name} ${size}: 가로로 밀린다`);
  }
}

await browser.close();
if (problems.length) {
  console.log(`\n${problems.length}개가 걸렸다.`);
  for (const x of problems) console.log("  " + x);
  process.exitCode = 1;
} else {
  console.log(`\n파일럿 화면 ${jobs.length * 2}자리 OK. ${OUT} 에 남았다.`);
}
void execFileSync;
