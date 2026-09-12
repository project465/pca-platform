/**
 * 정적 미리보기 보정.
 *
 * Artifact 호스트는 published path 를 그대로만 서빙한다 — 루트로 시작하는
 * 경로(/about)도, 확장자 없는 깔끔한 주소도 열리지 않는다. 그래서
 *   · /_next/… → _next/…   (내보내기가 평평한 구조라 상대경로로 충분하다)
 *   · /about   → about.html
 * 로 바꾸고, Next 의 클라이언트 라우터가 이 링크를 가로채 soft navigation 을
 * 시도하지 못하도록 캡처 단계에서 먼저 잡아 하드 이동시킨다.
 * 라우터만 막고 나머지 상호작용(결과지 탭·FAQ·폼)은 그대로 살린다.
 */
import { readdirSync, readFileSync, writeFileSync, rmSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: static-fix.mjs <out-dir>");

// Artifact 호스트는 "_" 로 시작하는 경로를 자기 것으로 예약해 뒀다.
// _next 를 next 로 바꾸고 HTML·JS 안의 참조를 모두 따라 고친다.
try { renameSync(join(dir, "_next"), join(dir, "next")); } catch { /* 이미 바꿨다 */ }

const files = readdirSync(dir);
const routes = files.filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5));

// RSC 프리페치 페이로드는 클라이언트 라우터를 끄면 쓰이지 않는다. 지운다.
for (const f of files) if (f.endsWith(".txt")) rmSync(join(dir, f));

const shim = `<script>
/* 정적 미리보기: 클라이언트 라우터 대신 하드 이동 */
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
  if (!a || a.target === '_blank') return;
  var h = a.getAttribute('href');
  if (!h || h.charAt(0) === '#' || /^[a-zA-Z]+:/.test(h)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  window.location.assign(h);
}, true);
</script>`;

let n = 0;
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".html")) continue;
  const p = join(dir, f);
  let s = readFileSync(p, "utf8");

  s = s.replaceAll("/_next/", "next/").replaceAll('"_next/', '"next/');
  s = s.replace(/(href|src)="\/(icon\.svg|[\w-]+\.png)/g, '$1="$2');

  for (const r of routes) {
    if (r === "index" || r === "404") continue;
    s = s.replaceAll(`href="/${r}"`, `href="${r}.html"`);
    s = s.replaceAll(`href="/${r}#`, `href="${r}.html#`);
  }
  s = s.replaceAll('href="/"', 'href="index.html"').replaceAll('href="/#', 'href="index.html#');
  s = s.replaceAll('href="/sitemap.xml"', 'href="sitemap.xml"');

  // Next 의 polyfills 청크는 Artifact 업로드에서 거부된다 — 안에 U+FFFD
  // 치환문자가 들어 있어 표준 텍스트 파일로 통과하지 못한다. noModule 스크립트라
  // 최신 브라우저는 애초에 읽지 않으므로 태그째 뺀다(미리보기 전용 처리다).
  s = s.replace(/<script[^>]*polyfills-[^>]*><\/script>/g, "");

  s = s.includes("</body>") ? s.replace("</body>", shim + "</body>") : s + shim;
  writeFileSync(p, s);
  n++;
}

/**
 * JS·CSS 안에 남은 "/_next/" 도 고친다.
 *
 * **JS 와 CSS 의 기준점이 다르다.** JS 의 webpack publicPath 는 문서(HTML)
 * 기준이라 "next/" 로 두면 되는데, CSS 의 url() 은 **그 CSS 파일** 기준이다.
 * 같이 "next/" 로 바꾸면 next/static/css/ 안에서 다시 next/ 를 찾아
 * next/static/css/next/static/media/... 가 되고 웹폰트가 404 로 떨어진다.
 * 글꼴이 없어도 화면은 그려지니 조용히 기본 글꼴로 나온다 — 그래서
 * 눈으로는 안 잡히고, 여기서 막아야 한다.
 */
const fixJs = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) fixJs(p);
    else if (e.name.endsWith(".js") || e.name.endsWith(".css")) {
      const t = readFileSync(p, "utf8");
      if (!t.includes("/_next/")) continue;
      if (e.name.endsWith(".css")) {
        // 이 CSS 에서 내보내기 루트까지 거슬러 올라가는 만큼 ../ 를 쌓는다
        const depth = p.slice(dir.length).replace(/^[/\\]/, "").split(/[/\\]/).length - 1;
        const up = "../".repeat(depth);
        writeFileSync(p, t.replaceAll("/_next/", `${up}next/`));
      } else {
        writeFileSync(p, t.replaceAll("/_next/", "next/"));
      }
    }
  }
};
fixJs(join(dir, "next"));

// 태그를 뺐으니 파일도 지운다
const dropPolyfills = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) dropPolyfills(p);
    else if (e.name.startsWith("polyfills-")) rmSync(p);
  }
};
dropPolyfills(join(dir, "next"));

let bytes = 0, count = 0;
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else { bytes += statSync(p).size; count++; }
  }
};
walk(dir);
console.log(`${dir}: html ${n}개 보정 · 파일 ${count}개 · ${(bytes / 1048576).toFixed(1)}MB`);
