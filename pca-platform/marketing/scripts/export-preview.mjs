/**
 * 돌고 있는 사이트를 링크 하나로 열리는 정적 HTML 한 장으로 뽑는다.
 *
 * 사이트는 여러 페이지지만 아티팩트는 파일 하나다. 그래서 각 페이지의 <main>
 * 을 한 문서에 모아 두고 :target 으로 하나씩 보여준다. 라디오도 자바스크립트도
 * 쓰지 않으므로 주소창의 해시가 그대로 페이지 주소 노릇을 한다.
 *
 *   SITE=kr npm start                     (다른 창에서)
 *   node scripts/export-preview.mjs kr out.html
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const site = process.argv[2] ?? "global";
const out = process.argv[3] ?? `/tmp/preview-${site}.html`;
const BASE = "http://localhost:3100";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const css = [];
const fonts = new Map();
page.on("response", async (res) => {
  const url = res.url();
  try {
    if (url.endsWith(".css")) css.push(await res.text());
    else if (url.endsWith(".woff2")) fonts.set(new URL(url).pathname, (await res.body()).toString("base64"));
  } catch {
    /* 본문을 못 읽는 응답은 넘어간다 */
  }
});

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

const title = await page.title();
const lang = await page.getAttribute("html", "lang");

/** 내비에 있는 경로 + 홈 */
const routes = await page.evaluate(() => {
  const hrefs = [...document.querySelectorAll(".site-header nav.wide a")]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h.startsWith("/"));
  return ["/", ...new Set(hrefs)];
});

/**
 * 페이지를 감싸는 칸의 id.
 *
 * 접두사를 붙이는 이유가 있다. 사이트 본문에는 이미 id="pricing" 같은
 * 한 페이지 안 앵커가 있고, 거기에 같은 이름을 또 쓰면 :target 이
 * 문서에서 먼저 나오는 쪽(숨어 있는 본문 절)을 잡아 페이지가 넘어가지 않는다.
 */
const idOf = (r) => "page-" + (r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "-"));

const header = await page.evaluate(() => document.querySelector(".site-header")?.outerHTML ?? "");
const footer = await page.evaluate(() => document.querySelector(".site-footer")?.outerHTML ?? "");
const floating = await page.evaluate(() => document.querySelector(".floating")?.outerHTML ?? "");

const mains = [];
for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: "networkidle" });
  await page.waitForTimeout(450);
  const main = await page.evaluate(() => document.querySelector("main")?.innerHTML ?? "");
  mains.push({ id: idOf(r), route: r, main });
  console.log("captured", r, Math.round(main.length / 1024) + "KB");
}
await browser.close();

// ---- CSS: 폰트를 데이터 URI 로 ----
let sheet = css.join("\n");
sheet = sheet.replace(/@font-face\s*\{[^}]*\}/g, (rule) => {
  const m = /url\(([^)]+)\)/.exec(rule);
  if (!m) return rule;
  const raw = m[1].replace(/["']/g, "");
  const path = raw.startsWith("http") ? new URL(raw).pathname : raw;
  const b64 = fonts.get(path);
  if (!b64) return "";
  return rule.replace(m[0], `url(data:font/woff2;base64,${b64})`);
});
sheet = sheet.replace(/url\(\/_next\/[^)]*\)/g, "none");

/** /pca 같은 내부 링크를 해시로 바꾼다 */
const toHash = (html) =>
  html
    .replace(/href="\/"/g, 'href="#page-home"')
    .replace(/href="\/([a-z0-9-]+)"/g, 'href="#page-$1"');

const note =
  lang === "ko"
    ? {
        badge: "미리보기",
        text: "실제 사이트를 그대로 뽑아낸 정적 미리보기입니다. 메뉴는 동작하고, 문의 폼만 접수되지 않습니다.",
        sent: "미리보기라 실제로 접수되지는 않았습니다.",
        ok: "문의가 접수되었습니다",
      }
    : {
        badge: "Preview",
        text: "A static capture of the live site. The menu works; only the contact form does not submit.",
        sent: "This is a preview — nothing was actually sent.",
        ok: "Thanks — we have it",
      };

const html = `<title>${title}</title>
<style>
${sheet}

/* ── 정적 미리보기에만 붙는 것 ── */
.preview-bar {
  position: sticky; top: 0; z-index: 90;
  background: #0F1B2D; color: #E7ECF3;
  font-size: 12.5px; padding: 7px 20px;
  display: flex; align-items: center; gap: 10px; justify-content: center; text-align: center;
}
.preview-bar b {
  font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
  border: 1px solid #3A4A60; padding: 2px 7px; flex: none; color: #C6A163;
}
.site-header { top: 32px; }

/* 페이지 전환. 자바스크립트 없이 해시로 바꾼다 */
.route { display: none; }
.route:target { display: block; }
body:not(:has(.route:target)) #page-home { display: block; }
</style>

<div class="preview-bar"><b>${note.badge}</b><span>${note.text}</span></div>
${toHash(header)}
<main>
${mains.map((m) => `<div class="route" id="${m.id}">${toHash(m.main)}</div>`).join("\n")}
</main>
${toHash(footer)}
${toHash(floating)}

<script>
// 미리보기에는 서버가 없다. 폼을 보내면 실제 확인 화면과 같은 자리에
// 같은 문구를 보여주되, 접수되지 않았다는 사실을 함께 밝힌다.
document.addEventListener("submit", function (e) {
  var form = e.target.closest("form");
  if (!form) return;
  e.preventDefault();
  var ok = document.createElement("p");
  ok.className = "notice ok";
  ok.innerHTML = "<b>" + ${JSON.stringify(note.ok)} + "</b>" + ${JSON.stringify(note.sent)};
  form.replaceWith(ok);
  ok.scrollIntoView({ behavior: "smooth", block: "center" });
});
// 페이지를 넘기면 맨 위로
window.addEventListener("hashchange", function () { window.scrollTo(0, 0); });
</script>
`;

writeFileSync(out, html, "utf8");
console.log("wrote", out, Math.round(html.length / 1024) + "KB",
            "· routes:", mains.length, "· fonts:", fonts.size);
