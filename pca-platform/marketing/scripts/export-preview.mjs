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
import { writeFileSync, readFileSync } from "node:fs";

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

/* 미리보기 한 장의 이름.
   사이트의 meta title 은 검색 결과용이라 길다. 미리보기는 목록에서 골라
   여는 것이므로 짧고 구별되는 이름이 낫다 */
const PREVIEW_NAME = {
  global: "METRI Global",
  kr: "METRI 코리아",
  kz: "METRI Қазақстан",
};
const title = PREVIEW_NAME[site] ?? (await page.title());
const lang = await page.getAttribute("html", "lang");
/* 색과 결은 <html data-theme> 에 걸려 있다. 뽑아낸 한 장에는 그 html 이
   없으므로 토큰을 :root 로 옮겨 심어야 한다. 이걸 빼먹으면 어두운 판
   사이트가 미리보기에서만 흰 판으로 나온다 */
const theme = await page.getAttribute("html", "data-theme");

/**
 * 뽑아낼 경로 — 홈 + 머리 내비 + 꼬리의 안쪽 링크.
 *
 * 꼬리까지 보는 이유가 있다. 처리방침은 내비에 없고 꼬리에만 있는데,
 * 그것을 빼먹으면 미리보기에서 그 링크만 갈 곳이 없어진다. 실제로 그랬다.
 */
const routes = await page.evaluate(() => {
  const pick = (sel) =>
    [...document.querySelectorAll(sel)]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.startsWith("/"));
  return ["/", ...new Set([...pick(".site-header nav.wide a"), ...pick(".site-footer a")])];
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

/* ---- 그림을 데이터 URI 로 ----
   뽑아낸 한 장은 파일 하나다. /photos/01.jpg 처럼 서버에서 받아 오는
   주소는 그 한 장 안에서 갈 곳이 없다. 넣어 두지 않으면 미리보기에서만
   그림이 전부 깨진다 — 폰트에서 겪은 것과 같은 문제다 */
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", svg: "image/svg+xml", webp: "image/webp" };
const inlined = new Map();
const inlineImages = (html) =>
  html.replace(/src="(\/[^"]+\.(?:jpg|jpeg|png|svg|webp))"/gi, (whole, url) => {
    if (!inlined.has(url)) {
      try {
        const ext = url.split(".").pop().toLowerCase();
        const buf = readFileSync(new URL("../public" + url, import.meta.url));
        inlined.set(url, `data:${MIME[ext]};base64,${buf.toString("base64")}`);
      } catch {
        inlined.set(url, null);
      }
    }
    const d = inlined.get(url);
    return d ? `src="${d}"` : whole;
  });

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
  inlineImages(html)
    .replace(/href="\/"/g, 'href="#page-home"')
    .replace(/href="\/([a-z0-9-]+)"/g, 'href="#page-$1"');

/* 미리보기 띠와 폼 응답. 사이트의 말로 적어야 한다 —
   카자흐어 사이트에 영어 띠가 붙어 있으면 그것부터 눈에 걸린다 */
const NOTES = {
  ko: {
    badge: "미리보기",
    text: "실제 사이트를 그대로 뽑아낸 정적 미리보기입니다. 메뉴는 동작하고, 문의 폼만 접수되지 않습니다.",
    sent: "미리보기라 실제로 접수되지는 않았습니다.",
    ok: "문의가 접수되었습니다",
  },
  kk: {
    badge: "АЛДЫН АЛА ҚАРАУ",
    text: "Бұл — сайттың статикалық көшірмесі. Мәзір жұмыс істейді, тек сұрау формасы жіберілмейді.",
    sent: "Бұл алдын ала қарау — шын мәнінде ештеңе жіберілген жоқ.",
    ok: "Сұрауыңыз қабылданды",
  },
};

const note = NOTES[lang ?? ""] ?? {
  badge: "Preview",
  text: "A static capture of the live site. The menu works; only the contact form does not submit.",
  sent: "This is a preview — nothing was actually sent.",
  ok: "Thanks — we have it",
};

/* [data-theme="x"]{…} 의 토큰을 :root 에도 심는다. body 배경처럼 감싸는
   칸 바깥에서 읽히는 것들이 있기 때문이다 */
let themeRoot = "";
if (theme) {
  // 빌드가 CSS 를 눌러 놓으므로 따옴표가 있을 수도 없을 수도 있다
  const m = new RegExp(`\\[data-theme=["']?${theme}["']?\\]\\s*\\{([^}]*)\\}`).exec(sheet);
  if (m) themeRoot = `:root{${m[1]}}`;
  else console.warn(`data-theme="${theme}" 의 토큰 블록을 찾지 못했습니다`);
}

const html = `<title>${title}</title>
<style>
${sheet}
${themeRoot}

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

<div${theme ? ` data-theme="${theme}"` : ""}>
<div class="preview-bar"><b>${note.badge}</b><span>${note.text}</span></div>
${toHash(header)}
<main>
${mains.map((m) => `<div class="route" id="${m.id}">${toHash(m.main)}</div>`).join("\n")}
</main>
${toHash(footer)}
${toHash(floating)}
</div>

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
