import { devPassword } from "./dev-credentials.mjs";
/**
 * 화면을 눈으로만 보고 넘기지 않는다.
 *
 * 규격 §44 가 요구하는 것 가운데 **기계로 셀 수 있는 것**만 센다:
 * 글자 대비 · 눌리는 자리의 크기 · 눌린 자리가 보이는가 · 그림에 대체
 * 글이 있는가 · 머리글 차례가 건너뛰지 않는가 · 입력칸에 이름표가
 * 붙어 있는가.
 *
 * **색만으로 말하지 않는가**는 여기서 못 센다. 그것은 화면마다 사람이
 * 본다(상태 알약에 글자를 적어 두는 규칙으로 지킨다).
 *
 * 먼저 띄워 두어야 한다:
 *   npx next dev -p 3100
 *   node scripts/a11y-check.mjs
 */
const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";

const WHO = {
  guest: null,
  admin: { id: "admin", pw: devPassword("admin") },
};

/** [누구로, 주소, 이름, 화면 폭] */
const PAGES = [
  ["guest", "/pricing?market=KR", "가격표 (한국)", 1440],
  ["guest", "/pricing?market=GLOBAL&lang=en", "가격표 (글로벌)", 1440],
  ["guest", "/pricing?market=KR", "가격표 (손전화)", 390],
  ["guest", "/product", "상품 쪽", 1440],
  ["guest", "/login", "로그인", 1440],
  ["guest", "/signup", "가입", 1440],
  ["admin", "/admin", "운영 한눈에", 1440],
  ["admin", "/admin/business", "사업자 표시", 1440],
  ["admin", "/admin/business", "사업자 표시 (손전화)", 390],
  ["admin", "/admin/launch", "런칭 준비", 1440],
];

/* ── 대비 ──────────────────────────────────────────────────────────
   WCAG 2.1 의 상대 휘도. 큰 글자(18.66px 이상 굵게 · 24px 이상)는 3:1,
   나머지는 4.5:1 이다 */
function lum([r, g, b]) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function rgb(s) {
  const m = String(s).match(/-?[\d.]+/g);
  return m ? [Number(m[0]), Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])] : null;
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function login(ctx, who) {
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "networkidle" });
  await p.fill('input[name="identifier"], input[type="text"]', who.id);
  await p.fill('input[type="password"]', who.pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
    .catch(() => {});
  await p.close();
}

const problems = [];
const rows = [];
const ctxs = {};

for (const [role, path, name, width] of PAGES) {
  if (!ctxs[role]) {
    ctxs[role] = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (WHO[role]) await login(ctxs[role], WHO[role]);
  }
  const p = await ctxs[role].newPage();
  await p.setViewportSize({ width, height: 900 });
  await p.goto(B + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(200);

  const found = await p.evaluate(() => {
    const out = { text: [], taps: [], imgs: 0, labels: [], heads: [], focus: 0 };
    const seen = new Set();
    /** 뒤에 깔린 바탕색을 찾는다. 투명한 칸은 부모로 올라간다 */
    const bgOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
        n = n.parentElement;
      }
      return "rgb(255,255,255)";
    };
    document.querySelectorAll("body *").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;

      /* 제 글자를 가진 칸만 본다. 부모를 또 세면 같은 글을 여러 번 센다 */
      const own = [...el.childNodes].some(
        (n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (own) {
        const size = parseFloat(cs.fontSize);
        const w = Number(cs.fontWeight) || 400;
        const key = `${cs.color}|${bgOf(el)}|${size}|${w}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.text.push({
            color: cs.color, bg: bgOf(el), size, weight: w,
            sample: el.textContent.trim().slice(0, 24),
          });
        }
      }
      /* 눌리는 자리. **WCAG 2.2 의 24px 를 기준으로 하고 두 가지를
         빼 둔다**: 글 한가운데 있는 링크(2.5.8 의 inline 예외)와,
         이름표가 감싸고 있어 **실제로 눌리는 자리는 그 이름표**인
         체크상자다 */
      if (el.matches("a, button, [role=button], input[type=checkbox], input[type=radio], summary")) {
        const inline = getComputedStyle(el).display.startsWith("inline")
          && el.parentElement
          && /^(P|LI|SPAN|TD|DD|LABEL)$/.test(el.parentElement.tagName)
          && el.parentElement.textContent.trim().length > (el.textContent || "").trim().length + 2;
        const lab = el.closest("label");
        const box = lab && el.matches("input") ? lab.getBoundingClientRect() : r;
        if (!inline && (box.width < 24 || box.height < 24)) {
          out.taps.push({ tag: el.tagName, t: (el.textContent || "").trim().slice(0, 20),
            w: Math.round(box.width), h: Math.round(box.height) });
        }
      }
      if (el.tagName === "IMG" && !el.hasAttribute("alt")) out.imgs++;
      if (el.matches("input:not([type=hidden]), select, textarea")) {
        const id = el.id;
        const has = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`))
          || el.closest("label")
          || el.getAttribute("aria-label")
          || el.getAttribute("aria-labelledby")
          || el.getAttribute("title");
        if (!has) out.labels.push(el.name || el.type);
      }
      if (/^H[1-6]$/.test(el.tagName)) out.heads.push(Number(el.tagName[1]));
    });
    return out;
  });

  /* 대비 */
  const bad = [];
  for (const t of found.text) {
    const fg = rgb(t.color), bg = rgb(t.bg);
    if (!fg || !bg || fg[3] === 0) continue;
    const big = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
    const need = big ? 3 : 4.5;
    const got = ratio(fg.slice(0, 3), bg.slice(0, 3));
    if (got < need - 0.02) {
      bad.push(`${t.sample} (${t.size}px ${got.toFixed(2)}:1, ${need} 필요)`);
    }
  }

  /* 머리글이 두 단계를 건너뛰는가 */
  let jump = null;
  for (let i = 1; i < found.heads.length; i++) {
    if (found.heads[i] - found.heads[i - 1] > 1) {
      jump = `h${found.heads[i - 1]} 다음에 h${found.heads[i]}`;
      break;
    }
  }

  /* 눌린 자리가 보이는가. 첫 단추에 키보드 초점을 준다 */
  const focusOk = await p.evaluate(() => {
    const el = document.querySelector("a, button");
    if (!el) return true;
    el.focus();
    const cs = getComputedStyle(el);
    return (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0)
      || cs.boxShadow !== "none";
  });

  const tag = `${name} ${width}`;
  rows.push(
    `${tag.padEnd(28)} 글 ${String(found.text.length).padStart(3)}칸 ` +
    `대비미달 ${bad.length} · 작은단추 ${found.taps.length} · ` +
    `이름표없음 ${found.labels.length} · alt없음 ${found.imgs}` +
    `${jump ? ` · 머리글 ${jump}` : ""}${focusOk ? "" : " · 초점표시없음"}`);

  for (const b of bad) problems.push(`${tag}: 대비 ${b}`);
  for (const t of found.taps) problems.push(`${tag}: 누르는 자리가 작다 ${t.tag} "${t.t}" ${t.w}x${t.h}`);
  for (const l of found.labels) problems.push(`${tag}: 입력칸에 이름표가 없다 (${l})`);
  if (found.imgs) problems.push(`${tag}: alt 없는 그림 ${found.imgs}개`);
  if (jump) problems.push(`${tag}: 머리글이 건너뛴다 (${jump})`);
  if (!focusOk) problems.push(`${tag}: 키보드 초점이 보이지 않는다`);
  await p.close();
}

for (const c of Object.values(ctxs)) await c.close();
await browser.close();

console.log(rows.join("\n"));
if (problems.length) {
  console.log(`\n${problems.length}개가 걸렸다.`);
  for (const x of problems) console.log("  " + x);
  process.exitCode = 1;
} else {
  console.log(`\n접근성 기본 ${PAGES.length}쪽 OK.`);
}
