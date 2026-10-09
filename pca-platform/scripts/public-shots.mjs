/**
 * 공개 쪽을 찍는다. **로그인하지 않은 사람이 보는 자리다.**
 *
 * 작업공간 캡처가 보는 것은 로그인한 뒤이고, 그 앞의 네 쪽(로그인 ·
 * 가입 · 가격표 · 상품 소개)은 아무도 찍고 있지 않았다. 그 넷이 사는
 * 사람이 처음 만나는 화면이다.
 *
 * **찍은 그림이 그 화면이라는 증거를 같이 본다**(`_shot-identity.mjs`).
 * 상태 코드만 보면 떨어지는 자리가 그대로 통과한다 — 작업공간 쪽에서
 * 일곱 자리 스물한 장이 그렇게 찍혔다.
 *
 *   npm run build && bash scripts/stage-serve.sh 3330
 *   UI_BASE=http://127.0.0.1:3330 node scripts/public-shots.mjs
 */
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { makeDupeWatch, verifyScreen } from "./_shot-identity.mjs";

const B = (process.env.UI_BASE || "http://127.0.0.1:3100").replace(/\/$/, "");
const OUT = "docs/metri/shots/public";
mkdirSync(OUT, { recursive: true });

const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  narrow: { width: 320, height: 720 },
};

/**
 * 자리마다 주소와 큰 글씨와 **그 쪽에만 있는 글귀**를 적는다.
 *
 * 셋째가 가장 중요하다. 가격표와 상품 소개는 머리띠가 같아서 주소와
 * 머리글만으로는 바꿔 찍어도 지나간다.
 */
const TARGETS = [
  { name: "p1_login", path: "/login", note: "로그인 · 소셜과 이메일",
    heading: "다시 오셨군요", must: ["학교에서 받은 아이디", "비밀번호를 잊으셨나요"] },
  { name: "p2_signup", path: "/signup", note: "개인 가입",
    heading: "", must: ["이미 계정이 있으신가요"] },
  { name: "p3_pricing", path: "/pricing", note: "가격표",
    heading: "", must: [] },
  { name: "p4_product", path: "/product", note: "상품 소개",
    heading: "", must: ["커리어메트리가 하는 일"] },
  { name: "p5_sample", path: "/sample", note: "견본 — 지금은 준비 중",
    heading: "", must: ["견본"] },
];

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const ctx = await browser.newContext({ viewport: SIZES.desktop });

const log = [];
const problems = [];
const dupe = makeDupeWatch();

for (const t of TARGETS) {
  for (const size of ["desktop", "mobile", "narrow"]) {
    const p = await ctx.newPage();
    await p.setViewportSize(SIZES[size]);
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });

    const r = await p.goto(B + t.path, { waitUntil: "networkidle" });
    await p.waitForTimeout(200);
    const code = r ? r.status() : 0;

    const id = await verifyScreen(p, {
      route: t.path, heading: t.heading || undefined, must: t.must,
    });
    const overflow = await p.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);

    const file = `${OUT}/${t.name}__${size}.png`;
    await p.screenshot({ path: file, fullPage: size === "desktop" });
    const sameAs = dupe.add(`${t.name}__${size}`,
      statSync(file).size, createHash("sha256").update(readFileSync(file)).digest("hex"));

    const tag = `${t.name} ${size}`;
    log.push(`${tag.padEnd(24)} ${code}`
      + `${id.ok ? "" : " 다른화면"}${sameAs ? " 같은그림" : ""}`
      + `${overflow ? " 가로스크롤" : ""}${errs.length ? ` 오류 ${errs.length}` : ""}`);
    if (code !== 200) problems.push(`${tag}: ${code}`);
    if (!id.ok) problems.push(`${tag}: 그 화면이 아니다 — ${id.miss.join(" / ")}`);
    if (sameAs) problems.push(`${tag}: ${sameAs}`);
    if (overflow) problems.push(`${tag}: 가로 스크롤이 생긴다`);
    if (errs.length) problems.push(`${tag}: ${errs[0]}`);
    await p.close();
  }
}

/* ── 로그인 화면이 공급자 단추를 **켜진 것만** 세우는가 ──
   꽂히지 않은 공급자를 세우면 누른 사람이 공급자 쪽 오류 화면에서 끝난다 */
{
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "networkidle" });
  const btns = await p.locator(".oauthbtn").count();
  const pwForm = await p.locator('input[name="identifier"]').count();
  log.push(`로그인 단추`.padEnd(24) + ` 소셜 ${btns}개 · 이메일 칸 ${pwForm}개`);
  /* **비밀번호 로그인은 어느 경우에도 선다.** 학과가 발급한 학번 계정은
     소셜이 없고, 그 계정이 지금 돌고 있는 계약의 전부다 */
  if (pwForm !== 1) problems.push(`로그인 화면에 이메일 칸이 ${pwForm}개다`);
  await p.close();
}

await browser.close();
console.log(log.join("\n"));
console.log(`\n자리 ${TARGETS.length}곳 × 폭 3 — 그림 ${OUT} 에 남았다.`);
if (problems.length) {
  console.log(`\n걸린 것 ${problems.length}가지`);
  for (const x of problems) console.log(`  걸림  ${x}`);
} else {
  console.log("\n그 화면이 맞는가 · 열리는가 · 가로 스크롤 · 오류 전부 OK.");
}
process.exitCode = problems.length ? 1 : 0;
