/**
 * 돌고 있는 사이트를 링크 하나로 열리는 정적 HTML 한 장으로 뽑는다.
 *
 * 이 페이지는 원래 서버 렌더링 결과가 거의 전부 정적이다. FAQ 접기는 <details>,
 * 메뉴 이동은 앵커라 자바스크립트 없이도 그대로 동작한다. 그래서 번들을 걷어내고
 * CSS 와 실제로 쓰인 폰트 조각만 인라인해 한 파일로 만든다.
 *
 * 문의 폼만 서버가 필요하므로, 미리보기에서는 접수되지 않는다는 것을
 * 화면에서 밝히고 확인 문구까지만 보여준다.
 *
 *   SITE=kr npm start                        (다른 창에서)
 *   node scripts/export-preview.mjs kr out.html
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const site = process.argv[2] ?? "global";
const out = process.argv[3] ?? `/tmp/preview-${site}.html`;
const BASE = "http://localhost:3100";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

/** 응답을 받아 두었다가 인라인에 쓴다 */
const css = [];
const fonts = new Map(); // url -> base64

page.on("response", async (res) => {
  const url = res.url();
  try {
    if (url.endsWith(".css")) css.push(await res.text());
    else if (url.endsWith(".woff2")) {
      const buf = await res.body();
      fonts.set(new URL(url).pathname, buf.toString("base64"));
    }
  } catch {
    /* 본문을 못 읽는 응답은 넘어간다 */
  }
});

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(800); // 폰트 요청이 끝나기를 기다린다

const title = await page.title();
const lang = await page.getAttribute("html", "lang");
const body = await page.evaluate(() => document.body.innerHTML);

await browser.close();

// ---- CSS 안의 폰트 경로를 데이터 URI 로 바꾼다 ----
let sheet = css.join("\n");

// 실제로 받아온 조각만 남기고, 쓰이지 않은 subset 의 @font-face 는 지운다.
sheet = sheet.replace(/@font-face\s*\{[^}]*\}/g, (rule) => {
  const m = /url\(([^)]+)\)/.exec(rule);
  if (!m) return rule;
  const raw = m[1].replace(/["']/g, "");
  const path = raw.startsWith("http") ? new URL(raw).pathname : raw;
  const b64 = fonts.get(path);
  if (!b64) return ""; // 이 글자 범위는 이 페이지에 안 쓰였다
  return rule.replace(m[0], `url(data:font/woff2;base64,${b64})`);
});

// 남은 절대 경로(이미지 등)는 원본 서버를 가리키므로 지운다
sheet = sheet.replace(/url\(\/_next\/[^)]*\)/g, "none");

const bodyClean = body
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<template[\s\S]*?<\/template>/g, "");

const previewNote =
  lang === "ko"
    ? {
        badge: "미리보기",
        text: "실제 사이트를 그대로 뽑아낸 정적 미리보기입니다. 문의 폼은 접수되지 않습니다.",
        sent: "미리보기라 실제로 접수되지는 않았습니다.",
      }
    : {
        badge: "Preview",
        text: "A static capture of the live site. The contact form does not submit here.",
        sent: "This is a preview — nothing was actually sent.",
      };

const html = `<title>${title}</title>
<style>
${sheet}

/* ── 정적 미리보기에만 붙는 것 ── */
.preview-bar {
  position: sticky; top: 0; z-index: 50;
  background: #16232E; color: #E8EDF0;
  font-size: 12.5px; padding: 7px 20px;
  display: flex; align-items: center; gap: 10px; justify-content: center;
  text-align: center;
}
.preview-bar b {
  font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
  border: 1px solid #4A5F6C; padding: 2px 7px; flex: none;
}
.site-header { top: 32px; }
</style>

<div class="preview-bar"><b>${previewNote.badge}</b><span>${previewNote.text}</span></div>
${bodyClean}

<script>
// 미리보기에서는 서버가 없다. 폼을 보내면 실제 확인 화면과 같은 자리에
// 같은 문구를 보여주되, 접수되지 않았다는 사실을 함께 밝힌다.
document.addEventListener("submit", function (e) {
  var form = e.target.closest("form");
  if (!form) return;
  e.preventDefault();
  var section = form.closest(".contact");
  var ok = document.createElement("p");
  ok.className = "notice ok";
  ok.style.maxWidth = "720px";
  ok.innerHTML = "<b>" + (${JSON.stringify(lang)} === "ko" ? "문의가 접수되었습니다" : "Thanks — we have it") +
                 "</b>" + ${JSON.stringify(previewNote.sent)};
  form.replaceWith(ok);
  section.scrollIntoView({ behavior: "smooth", block: "center" });
});
</script>
`;

writeFileSync(out, html, "utf8");
console.log("wrote", out, Math.round(html.length / 1024) + "KB",
            "· fonts inlined:", fonts.size, "· css blocks:", css.length);
