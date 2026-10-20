// harness-only HTTP 서버. **Next.js 가 아니다.**
//
// npm 레지스트리가 막힌 세션에서 KUS 화면을 실제 브라우저로 밟아 보려고 둔다. 화면 파일
// (src/app/kus/**/*.tsx · 공통 학교 로그인)을 TypeScript 로 옮겨 서버에서 그리고, 폼의 서버
// 액션을 POST 로 잇고, 로그인은 DB 의 비밀번호 해시로 맞춰 본다. 데이터는 실제 PostgreSQL 이다.
//
// 이 서버로 찍은 그림은 **harness render** 로 적는다. Next 의 라우팅 · 미들웨어 · Auth.js 쿠키 ·
// 클라이언트 번들은 여기서 재지 않는다(그건 CI 의 next build + 브라우저 E2E 몫이다).
//
//   APP_ENV=dev DATABASE_URL=... V3_CAMPUS_FIXTURE=scripts/fixtures/campus-kus.json \
//     scripts/kus/lab/run scripts/kus/lab/server.mjs 3301
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve as r, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { als } from "./ctx.mjs";
import { renderToString } from "./shims/jsx-runtime.mjs";

const ROOT = process.cwd();
const APP = join(ROOT, "src/app");
const PORT = Number(process.argv[2] ?? 3301);
const { query, queryOne } = await import(pathToFileURL(join(ROOT, "src/lib/db.ts")).href);
const { verifyPassword } = await import(pathToFileURL(join(ROOT, "src/lib/password.ts")).href);

/* ── CSS: @import 를 펼쳐서 한 벌로 ─────────────────────────── */
function css(file, seen = new Set()) {
  if (seen.has(file) || !existsSync(file)) return "";
  seen.add(file);
  return readFileSync(file, "utf8").replace(/@import\s+"([^"]+)";/g, (_, p) => css(r(dirname(file), p), seen));
}
const BASE = ["globals.css", "surface.css"].map((f) => join(APP, f));
const KUS_CSS = [...BASE, join(APP, "me/platform.css"), join(APP, "kus/kus.css")];
const CAMPUS_CSS = [...BASE, join(APP, "campus/campus.css")];
const bundle = (files) => { const seen = new Set(); return files.map((f) => css(f, seen)).join("\n"); };

/* ── 서버 액션: 함수에 번호를 붙여 POST 로 잇는다 ─────────────── */
const fnId = new WeakMap(); const idFn = new Map(); let seq = 0;
globalThis.__kusRegisterAction = (fn) => {
  if (!fnId.has(fn)) { seq += 1; fnId.set(fn, String(seq)); idFn.set(String(seq), fn); }
  return fnId.get(fn);
};

/* ── 세션: 쿠키의 사용자 번호로 SessionUser 를 만든다 ─────────── */
globalThis.__harnessAuth = async () => {
  const s = als.getStore();
  const uid = s?.cookies.get("kush");
  if (!uid) return null;
  const u = await queryOne(`SELECT id::text, display_name, locale, must_reset_pw FROM users WHERE id = $1::bigint AND status = 'active'`, [uid]);
  if (!u) return null;
  const m = await query(`SELECT org_id::text AS "orgId", role FROM memberships WHERE user_id = $1::bigint`, [uid]);
  const role = m.some((x) => x.role === "org_admin") ? "org_admin" : "student";
  return { user: { id: u.id, name: u.display_name, locale: u.locale ?? "ko", mustResetPw: false, role, memberships: m } };
};

const ROUTES = [
  ["/kus", "kus/page.tsx", KUS_CSS],
  ["/kus/assessment", "kus/assessment/page.tsx", KUS_CSS],
  ["/kus/result", "kus/result/page.tsx", KUS_CSS],
  ["/kus/visits", "kus/visits/page.tsx", KUS_CSS],
  ["/kus/visits/new", "kus/visits/new/page.tsx", KUS_CSS],
  ["/kus/visits/:id", "kus/visits/[id]/page.tsx", KUS_CSS],
  ["/kus/plan", "kus/plan/page.tsx", KUS_CSS],
  ["/kus/report", "kus/report/page.tsx", KUS_CSS],
  ["/kus/report/:attemptId", "kus/report/[attemptId]/route.ts", null],
  ["/kus/report/:attemptId/pdf", "kus/report/[attemptId]/pdf/route.ts", null],
  ["/kus/admin", "kus/admin/page.tsx", KUS_CSS],
  ["/kus/denied", "kus/denied/page.tsx", KUS_CSS],
  ["/campus/:universityCode", "campus/[universityCode]/page.tsx", CAMPUS_CSS],
  ["/campus/:universityCode/majors", "campus/[universityCode]/majors/page.tsx", CAMPUS_CSS],
  ["/campus/:universityCode/login", "campus/[universityCode]/login/page.tsx", CAMPUS_CSS],
  ["/campus/:universityCode/start", "campus/[universityCode]/start/page.tsx", CAMPUS_CSS],
];
function match(path) {
  for (const [pat, file, styles] of ROUTES) {
    const a = pat.split("/"); const b = path.replace(/\/$/, "").split("/");
    if (a.length !== b.length) continue;
    const params = {};
    if (a.every((s, i) => s.startsWith(":") ? (params[s.slice(1)] = decodeURIComponent(b[i]), true) : s === b[i])) return { file, styles, params };
  }
  return null;
}

const page = (title, body, styles) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>${bundle(styles)}
.kus-harness{position:fixed;right:6px;bottom:4px;font:10px/1 monospace;color:#9aa5b5;z-index:99;pointer-events:none}</style></head>
<body>${body}<div class="kus-harness">harness render · not Next runtime</div></body></html>`;

function cookiesOf(req) {
  const m = new Map();
  for (const p of (req.headers.cookie ?? "").split(";")) { const i = p.indexOf("="); if (i > 0) m.set(p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())); }
  return m;
}
const body = (req) => new Promise((ok) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => ok(s)); });
const where = (e) => String(e?.digest ?? "").startsWith("NEXT_REDIRECT;") ? e.digest.slice(14) : null;

async function handle(req, res, store) {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const send = (code, type, data, extra = {}) => {
    const h = { "content-type": type, ...extra };
    const set = store.set.map(([n, v]) => `${n}=${encodeURIComponent(v)}; Path=/; HttpOnly${v ? "" : "; Max-Age=0"}`);
    if (set.length) h["set-cookie"] = set;
    res.writeHead(code, h); res.end(data);
  };
  const go = (to) => send(303, "text/plain", "", { location: to });

  if (url.pathname.startsWith("/brand/") || url.pathname.startsWith("/me-v2/")) {
    const f = join(ROOT, "public", url.pathname);
    if (existsSync(f)) return send(200, f.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream", readFileSync(f));
  }
  if (url.pathname === "/__login" && req.method === "POST") {
    const f = new URLSearchParams(await body(req));
    const u = await queryOne(`SELECT id::text, password_hash FROM users WHERE login_id = $1 AND status = 'active'`, [f.get("identifier") ?? ""]);
    const nx = (f.get("next") ?? "/kus").startsWith("/") ? f.get("next") : "/kus";
    if (!u || !(await verifyPassword(f.get("password") ?? "", u.password_hash))) return go(`${url.searchParams.get("back") ?? "/campus/kus/login"}?e=1`);
    store.set.push(["kush", u.id]);
    return go(nx);
  }
  if (url.pathname.startsWith("/__action/") && req.method === "POST") {
    const fn = idFn.get(url.pathname.slice(10));
    if (!fn) return send(404, "text/plain", "no action");
    const fd = new FormData();
    for (const [k, v] of new URLSearchParams(await body(req))) fd.append(k, v);
    try { await fn(fd); return go(req.headers.referer ?? "/kus"); }
    catch (e) {
      const to = where(e); if (to) return go(to);
      if (String(e?.message).includes("next-auth unavailable")) { store.set.push(["kush", ""]); return go("/campus/kus/login?next=%2Fkus"); }
      console.error("[action]", e); return send(500, "text/plain", String(e?.message ?? e));
    }
  }
  /* 공통 검사 화면은 이 하네스가 그리지 않는다. 그 자리는 CI 의 Next 런타임이 잰다 */
  if (url.pathname.startsWith("/v3/") || url.pathname.startsWith("/me")) {
    return send(200, "text/html; charset=utf-8", page("공통 화면", `<main style="max-width:640px;margin:60px auto;padding:16px;font-family:sans-serif"><h1>공통 화면(${url.pathname})</h1><p>공통 검사·결과·작업공간 화면은 Next 런타임에서만 섭니다. 이 하네스는 KUS 화면만 그립니다.</p><p><a href="/kus">KUS 홈</a></p></main>`, BASE));
  }
  const m = match(url.pathname);
  if (!m) return send(404, "text/plain", "not found");
  const mod = await import(pathToFileURL(join(APP, m.file)).href);
  try {
    if (!m.styles) {
      const resp = await mod.GET(new Request(url), { params: Promise.resolve(m.params) });
      const buf = Buffer.from(await resp.arrayBuffer());
      return send(resp.status, resp.headers.get("content-type") ?? "text/plain", buf,
        resp.headers.get("content-disposition") ? { "content-disposition": resp.headers.get("content-disposition") } : {});
    }
    const tree = await mod.default({ params: Promise.resolve(m.params), searchParams: Promise.resolve(Object.fromEntries(url.searchParams)) });
    let html = await renderToString(tree);
    /* 학교 로그인 폼은 Auth.js 를 부른다. 하네스에서는 같은 칸을 `/__login` 이 받는다 */
    if (m.file.endsWith("login/page.tsx")) html = html.replace(/action="\/__action\/\d+" method="post"/, `action="/__login?back=${encodeURIComponent(url.pathname)}" method="post"`)
      + (url.searchParams.get("e") ? "" : "");
    if (url.searchParams.get("e") === "1" && m.file.endsWith("login/page.tsx")) html = html.replace('<form', '<p class="notice error" role="alert">아이디 또는 비밀번호가 맞지 않습니다.</p><form');
    const title = mod.metadata?.title ?? "CareerMatri";
    return send(200, "text/html; charset=utf-8", page(typeof title === "string" ? title : "CareerMatri", html, m.styles));
  } catch (e) {
    const to = where(e); if (to) return go(to);
    if (e?.digest === "NEXT_NOT_FOUND") return send(404, "text/html; charset=utf-8", page("없음", "<main style='padding:40px'>찾을 수 없습니다(404)</main>", BASE));
    console.error("[render]", url.pathname, e); return send(500, "text/plain", String(e?.stack ?? e));
  }
}

http.createServer((req, res) => {
  const store = { cookies: cookiesOf(req), headers: new Map(Object.entries(req.headers)), set: [] };
  als.run(store, () => handle(req, res, store).catch((e) => { console.error(e); res.writeHead(500); res.end(String(e)); }));
}).listen(PORT, "127.0.0.1", () => console.log(`[kus-harness] http://127.0.0.1:${PORT}`));
