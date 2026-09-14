/**
 * Artifact 미리보기용 한 장 묶음.
 *
 * **왜 한 장인가.** Artifact 호스트는 올려 둔 파일을 하위 리소스로는 내주지만
 * (CSS·글꼴·이미지) **문서로 이동하는 것은 보장하지 않는다.** 그래서 여러
 * 페이지를 올려 두고 메뉴에서 pca.html 로 넘기면 화면에 "not found" 만 뜬다.
 * 파일은 멀쩡히 올라가 있는데 이동이 막히는 것이라 파일 목록만 봐서는 안
 * 잡힌다.
 *
 * 그래서 **이동을 아예 하지 않는다.** 내보낸 페이지들의 <body> 를 한 문서
 * 안에 나란히 넣고, 메뉴를 누르면 보이는 쪽을 바꾼다. 주소는 #/pca 처럼
 * 해시로만 움직이므로 뒤로가기도 그대로 산다.
 *
 * **스크립트는 전부 뺀다.** 이 사이트에서 클라이언트 컴포넌트는 문의 폼
 * 하나뿐이고 정적 미리보기에서는 그마저 보내지 않는 대체본이다. 나머지는
 * 서버에서 찍힌 HTML 과 CSS 로 끝난다. 스크립트를 두면 React 가 자기가
 * 찍지 않은 형제 노드를 보고 hydration 에서 화면을 헤집는다 — 얻을 것이
 * 없으니 빼는 쪽이 맞다. 결과지 탭은 radio + :checked 라 JS 없이도 돈다.
 *
 * 쓰는 법: static-fix.mjs 를 돌린 다음에 같은 폴더를 넘긴다.
 */
import { readdirSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: artifact-bundle.mjs <out-dir>");

const strip = (s) =>
  s
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*\brel="preload"[^>]*\bas="script"[^>]*>/gi, "");

const bodyOf = (s) => {
  const m = s.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!m) throw new Error("본문을 찾지 못했다");
  return m[1];
};

const files = readdirSync(dir).filter((f) => f.endsWith(".html"));
if (!files.includes("index.html")) throw new Error("index.html 이 없다");

// index 를 맨 앞에 둔다 — 스크립트가 없어도 첫 화면이 홈이어야 한다
const keys = ["index", ...files.map((f) => f.slice(0, -5)).filter((k) => k !== "index" && k !== "404")];

const src = readFileSync(join(dir, "index.html"), "utf8");
const htmlTag = (src.match(/<html[^>]*>/i) ?? ['<html lang="ko">'])[0];
const head = strip((src.match(/<head[^>]*>([\s\S]*?)<\/head>/i) ?? ["", ""])[1]);

/**
 * 페이지 사이를 잇던 링크를 해시로 바꾼다.
 *  about.html        → #/about
 *  index.html#faq    → #/index/faq
 *  #top              → 그대로 둔다 (지금 보고 있는 페이지 안에서 찾는다)
 * 바깥으로 나가는 링크는 새 탭으로 연다 — 미리보기는 iframe 안이라
 * 같은 창에서 나가려 하면 브라우저가 막는다.
 */
const relink = (s) => {
  let out = s;
  for (const k of keys) {
    out = out.replaceAll(`href="${k}.html#`, `href="#/${k}/`);
    out = out.replaceAll(`href="${k}.html"`, `href="#/${k}"`);
  }
  out = out.replace(/<a\s+([^>]*\bhref="https?:\/\/[^"]*"[^>]*)>/gi, (m, attrs) =>
    /\btarget=/.test(attrs) ? m : `<a ${attrs} target="_blank" rel="noopener">`,
  );
  return out;
};

const pages = keys
  .map((k) => {
    const body = relink(strip(bodyOf(readFileSync(join(dir, `${k}.html`), "utf8"))));
    return `<div class="xpage" data-page="${k}"${k === "index" ? "" : " hidden"}>${body}</div>`;
  })
  .join("\n");

const router = `<style>.xpage[hidden]{display:none!important}</style>
<script>
(function () {
  var pages = {};
  var list = document.querySelectorAll('.xpage');
  for (var i = 0; i < list.length; i++) pages[list[i].getAttribute('data-page')] = list[i];
  var cur = 'index';

  // 해시를 바꾸면 브라우저가 자기도 한 번 스크롤한다. 우리가 먼저 옮겨 놓으면
  // 그 뒤에 덮어써서 엉뚱한 높이에 멈춘다 — 그래서 한 프레임 뒤에 옮긴다.
  try { history.scrollRestoration = 'manual'; } catch (err) {}
  function scrollTo(page, anchor) {
    var go = function () {
      // 페이지를 바꾸는 것은 스크롤이 아니다. CSS 의 smooth 를 그대로 두면
      // 다른 페이지로 넘어가면서 이전 페이지 높이만큼 주르륵 내려간다.
      if (!anchor) { window.scrollTo({ top: 0, behavior: 'instant' }); return; }
      // 페이지마다 같은 id 가 있을 수 있다(#faq 는 두 곳에 있다).
      // 그래서 문서 전체가 아니라 **보이는 페이지 안에서만** 찾는다.
      var el = page.querySelector('[id="' + anchor + '"]');
      if (el) el.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
    };
    requestAnimationFrame(function () { requestAnimationFrame(go); });
  }

  function show(key, anchor) {
    if (!pages[key]) key = 'index';
    for (var k in pages) pages[k].hidden = k !== key;
    cur = key;
    scrollTo(pages[key], anchor);
  }

  function fromHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (h.charAt(0) === '/') {
      var parts = h.slice(1).split('/');
      show(parts[0] || 'index', parts[1] || '');
    } else if (h) {
      show(cur, h);
    } else {
      show('index', '');
    }
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank') return;
    var h = a.getAttribute('href');
    if (!h || /^[a-zA-Z]+:/.test(h)) return;
    if (h.charAt(0) !== '#') { e.preventDefault(); return; }   // 남은 파일 링크는 눌러도 나가지 않는다
    e.preventDefault();
    e.stopImmediatePropagation();
    if (location.hash === h) fromHash(); else location.hash = h;
  }, true);

  // 보내지지 않는 폼이 주소만 바꾸고 새로고침되는 것을 막는다.
  // 대체본이 화면에 적어 두는 문장과 같은 말을 여기서 띄운다.
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (!f || f.querySelector('.xnotice')) return;
    var p = document.createElement('p');
    p.className = 'notice err full xnotice';
    p.setAttribute('role', 'alert');
    p.textContent = ${JSON.stringify(
      "미리보기 화면이라 문의가 접수되지 않습니다. 실제 배포본에서는 이 폼이 그대로 동작합니다. / This is a static preview — the form does not submit here.",
    )};
    f.insertBefore(p, f.firstChild);
    p.scrollIntoView({ block: 'center' });
  }, true);

  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
</script>`;

writeFileSync(join(dir, "index.html"), `<!doctype html>${htmlTag}<head>${head}</head><body>${pages}${router}</body></html>`);

// 한 장으로 합쳤으니 나머지 문서와 이제 아무도 읽지 않는 청크를 지운다
for (const f of files) if (f !== "index.html") rmSync(join(dir, f));
try { rmSync(join(dir, "next", "static", "chunks"), { recursive: true }); } catch { /* 없으면 그만 */ }
// 라우터 매니페스트도 읽을 사람이 없다. og 이미지와 sitemap 은 실제 도메인을
// 가리키는 것이라 미리보기에서는 아무도 쓰지 않는다 — 올리는 파일 수를 줄인다.
for (const f of readdirSync(dir)) {
  if (f.startsWith("og-") || f === "sitemap.xml" || f === "robots.txt") rmSync(join(dir, f));
}
const keepOnly = (base, keep) => {
  for (const d of readdirSync(base, { withFileTypes: true })) {
    if (!keep.includes(d.name)) rmSync(join(base, d.name), { recursive: true });
  }
};
keepOnly(join(dir, "next"), ["static"]);
keepOnly(join(dir, "next", "static"), ["css", "media"]);

let bytes = 0, count = 0;
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else { bytes += statSync(p).size; count++; }
  }
};
walk(dir);
console.log(`${dir}: 페이지 ${keys.length}개를 한 장으로 · 파일 ${count}개 · ${(bytes / 1048576).toFixed(1)}MB`);
