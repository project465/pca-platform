/**
 * **모든 버튼을 실제로 눌러 본다.** 쪽이 200 으로 서는 것과 그 쪽의 단추가
 * 눌려서 어딘가로 가는 것은 다른 질문이다.
 *
 * 사람 다섯(로그인 전 · 결과를 받은 학생 · 검사 전 학생 · 학과 담당자 ·
 * 운영자)을 들고, 각자 첫 화면에서 쪽 안의 링크를 따라가며 쪽마다 넷을 센다.
 *
 *   1. 쪽 자체: 상태코드 · 오류 화면 · 브라우저 오류 · 하위 요청 5xx
 *   2. 링크: 가리키는 주소가 4xx·5xx 인가(로그인한 그 사람의 쿠키로 두드린다)
 *   3. 단추: 눌렀을 때 **아무 일도 일어나지 않는가**(주소 · 화면 · 요청 · 펼침
 *      어느 것도 바뀌지 않으면 무반응), 다른 것에 가려 **눌리지 않는가**,
 *      눌러서 오류 화면이나 브라우저 오류가 나는가
 *   4. 좁은 화면(390)에서도 같은 쪽을 한 번 더 연다
 *
 * **위험한 단추는 누르지 않고 적어만 둔다**(로그아웃 · 탈퇴 · 삭제 · 재발급 ·
 * 결제 · 제출 …). 그 길은 각자의 흐름 검사(`v3:loop` · `campus:export` 등)가
 * 실제 DB 로 센다. 여기서 누르면 다음 단추가 남의 상태 위에 선다.
 *
 * **폼 검증에 걸린 것은 무반응으로 세지 않는다**: 필수 칸이 비어 브라우저가
 * 막은 것은 정상이다.
 *
 * 로컬 DB 에서만 돈다.
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     OUT=var/click-all npx tsx scripts/lab/click-all.ts
 */
import { loadEnv, BASE, assertFreshServer, login, makeStudent, cloneFinished, registerCampusStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";
import { query, queryOne } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/password";

const OUT = process.env.OUT ?? "var/click-all";
const ONLY = (process.env.WHO ?? "").split(",").filter(Boolean);
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 70);
const MAX_BTN = Number(process.env.MAX_BTN ?? 30);
const MOBILE = process.env.MOBILE !== "0";

/** 누르지 않는 단추. 상태를 바꾸거나 되돌릴 수 없는 일을 한다 */
const DANGER = /로그아웃|나가기|탈퇴|삭제|지우|재발급|비밀번호 (바꾸|재설정|변경)|멈추|멈춤|중지|비활성|결제|구매|환불|취소|초기화|제출|결과 만들기|발급|파기|적용|등록하기|추가하기|저장|보내기|내보내|다시 열어|열어 주기|담아|끝냈|완료|반영|업로드|가입|시작하기|검사 시작|다시 시작|이어하기|업그레이드|신청|요청|승인|거절|공개|해지|만들기|복구|교환|쓰기|켜기|끄기|동의/;
/** 따라가지 않는 주소 */
const SKIP_HREF = /^\/(api|_next|pca)\/|\/logout|signout|\.pdf$|\/pdf(\?|$)|\.csv(\?|$)|^mailto:|^tel:|^#|^javascript:/;
const ERROR_TEXT = /문제가 생겼습니다|Application error|This page could not be found|Internal Server Error|잠시 문제가|오류가 발생/;

type Finding = { who: string; view: string; page: string; kind: string; target: string; detail: string };
const findings: Finding[] = [];
const visited: { who: string; view: string; page: string; status: number; final: string; buttons: number; clicked: number; links: number }[] = [];
const add = (f: Finding) => { findings.push(f); console.log(`  ✗ [${f.who}/${f.view}] ${f.page} · ${f.kind} · ${f.target} · ${f.detail}`); };

const patternOf = (p: string) => p.replace(/\/\d+(?=\/|$|\?)/g, "/:id").replace(/[?#].*$/, "");

async function staffUser(login_id: string, role: "org_admin" | "superadmin", orgCode?: string): Promise<string> {
  const pw = "ca-" + Math.random().toString(36).slice(2, 12);
  const old = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [login_id]);
  let id = old?.id;
  if (id) {
    await query(`UPDATE users SET password_hash=$2, status='active', must_reset_pw=FALSE WHERE id=$1`, [id, await hashPassword(pw)]);
    await query(`DELETE FROM memberships WHERE user_id=$1`, [id]);
  } else {
    id = (await queryOne<{ id: string }>(
      `INSERT INTO users (login_id,email,display_name,password_hash,status,locale,is_demo,must_reset_pw)
       VALUES ($1,$1,'점검 담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [login_id, await hashPassword(pw)]))?.id;
  }
  /* 운영자는 운영사 기관에 묶인다(make-admin 과 같은 자리). org_id 는 비울 수 없다 */
  const org = orgCode
    ? await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code=$1`, [orgCode])
    : await queryOne<{ id: string }>(
      `INSERT INTO organizations (code, country, org_type, status, name)
       VALUES ('VENDOR','KR','company','active','커리어메트리 운영사')
       ON CONFLICT (code) DO UPDATE SET status = organizations.status RETURNING id::text`);
  await query(`INSERT INTO memberships (user_id,org_id,role) VALUES ($1,$2,$3)`, [id, org?.id ?? null, role]);
  return pw;
}

async function settle(p: Page) {
  await p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
}

async function snapshot(p: Page) {
  return p.evaluate(() => {
    const body = document.body;
    const open = [...document.querySelectorAll("details")].map((d) => (d as HTMLDetailsElement).open ? 1 : 0).join("");
    const exp = [...document.querySelectorAll("[aria-expanded],[aria-pressed],[aria-checked],[aria-selected]")]
      .map((e) => (e.getAttribute("aria-expanded") ?? "") + (e.getAttribute("aria-pressed") ?? "") + (e.getAttribute("aria-checked") ?? "") + (e.getAttribute("aria-selected") ?? "")).join("");
    const checked = [...document.querySelectorAll("input")].map((i) => ((i as HTMLInputElement).checked ? 1 : 0)).join("");
    const hidden = [...document.querySelectorAll("[hidden]")].length;
    const vis = [...body.querySelectorAll("*")].filter((e) => (e as HTMLElement).offsetParent !== null).length;
    return `${location.href}|${body.innerText.length}|${open}|${exp}|${checked}|${hidden}|${vis}|${document.activeElement?.tagName}`;
  });
}

type Btn = { i: number; text: string; type: string; inForm: boolean; disabled: boolean };

async function buttons(p: Page): Promise<Btn[]> {
  return p.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>("button, [role=button], summary, input[type=submit], input[type=button]")];
    return els.map((e, i) => {
      const r = e.getBoundingClientRect();
      const st = getComputedStyle(e);
      /* 닫힌 details 안의 단추는 content-visibility:hidden 이라 자리는 돌려주면서 글자는 비어 있다.
         눈에 안 보이는 단추를 '이름 없는 단추' 로 세지 않는다 */
      const vis = (e as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility?.() ?? true;
      const shown = vis && r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none" && e.offsetParent !== null;
      const text = (e.getAttribute("aria-label") || e.innerText || (e as HTMLInputElement).value || "").trim().replace(/\s+/g, " ").slice(0, 60);
      return { i, text, shown, type: (e as HTMLButtonElement).type || e.tagName.toLowerCase(),
        inForm: !!e.closest("form"), disabled: (e as HTMLButtonElement).disabled === true || e.getAttribute("aria-disabled") === "true" };
    }).filter((b) => b.shown).map(({ shown, ...b }) => { void shown; return b; });
  });
}

async function crawl(ctx: BrowserContext, who: string, starts: string[], view: "d" | "m") {
  const queue = [...starts];
  const seen = new Set<string>();
  const perPattern = new Map<string, number>();
  const checkedLinks = new Set<string>();
  const clickedKeys = new Set<string>();
  let pages = 0;
  while (queue.length && pages < MAX_PAGES) {
    const path = queue.shift() as string;
    if (seen.has(path)) continue;
    seen.add(path);
    const pat = patternOf(path);
    const n = perPattern.get(pat) ?? 0;
    if (n >= 2) continue;
    perPattern.set(pat, n + 1);
    pages += 1;

    const p = await ctx.newPage();
    const errs: string[] = [];
    const bad: string[] = [];
    p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|ERR_ABORTED|net::ERR/.test(m.text())) errs.push(m.text().slice(0, 200)); });
    p.on("response", (r) => { if (r.status() >= 500) bad.push(`${r.status()} ${new URL(r.url()).pathname}`); });
    let status = 0;
    try {
      const r = await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
      status = r?.status() ?? 0;
    } catch (e) {
      add({ who, view, page: path, kind: "열리지 않음", target: path, detail: String(e).slice(0, 120) });
      await p.close(); continue;
    }
    await settle(p);
    const final = new URL(p.url()).pathname + new URL(p.url()).search;
    const text = await p.locator("body").innerText().catch(() => "");
    if (status >= 400) add({ who, view, page: path, kind: `쪽 ${status}`, target: path, detail: text.slice(0, 80).replace(/\s+/g, " ") });
    if (ERROR_TEXT.test(text)) add({ who, view, page: path, kind: "오류 화면", target: path, detail: (text.match(ERROR_TEXT) ?? [""])[0] });
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 2) add({ who, view, page: path, kind: "가로 넘침", target: path, detail: `${over}px` });

    /* 링크 */
    const hrefs = await p.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
      .filter((a) => a.offsetParent !== null || a.closest("details"))
      .map((a) => ({ href: a.getAttribute("href") ?? "", abs: a.href, text: (a.innerText || a.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40) })));
    for (const h of hrefs) {
      if (!h.href || /^(mailto|tel|javascript):/.test(h.href)) continue;
      let u: URL;
      try { u = new URL(h.abs); } catch { add({ who, view, page: final, kind: "깨진 링크", target: h.href, detail: h.text }); continue; }
      if (u.origin !== new URL(BASE).origin) continue;
      if (h.href === "#" || (h.href.startsWith("#") && h.href.length > 1 && !(await p.$(h.href.replace(/^#/, "#").replace(/([:.])/g, "\\$1")).catch(() => null)))) {
        if (h.href === "#") add({ who, view, page: final, kind: "빈 링크(#)", target: h.href, detail: h.text });
        else add({ who, view, page: final, kind: "없는 자리 링크", target: h.href, detail: h.text });
        continue;
      }
      const rel = u.pathname + u.search;
      if (h.href.startsWith("#")) continue;
      if (!checkedLinks.has(rel) && !/\/logout|signout/.test(rel)) {
        checkedLinks.add(rel);
        if (!/^\/(api|_next)\//.test(u.pathname)) {
          const res = await ctx.request.get(BASE + rel, { maxRedirects: 5, timeout: 60000 }).catch(() => null);
          const st = res?.status() ?? 0;
          if (!res || st >= 400) add({ who, view, page: final, kind: `링크 ${st || "실패"}`, target: rel, detail: h.text });
        }
      }
      if (!SKIP_HREF.test(rel) && !seen.has(rel)) queue.push(rel);
    }

    /* 단추 */
    const list = await buttons(p);
    let clicked = 0;
    for (const b of list.slice(0, 200)) {
      if (clicked >= MAX_BTN) break;
      const key = `${patternOf(final)}|${b.text}`;
      if (clickedKeys.has(key)) continue;
      clickedKeys.add(key);
      if (b.disabled) continue;
      if (!b.text) { add({ who, view, page: final, kind: "이름 없는 단추", target: `#${b.i}`, detail: b.type }); continue; }
      if (DANGER.test(b.text)) continue;
      clicked += 1;
      /* 매번 새로 연다: 앞 단추가 바꾼 화면 위에서 다음 단추를 누르지 않는다 */
      const q = await ctx.newPage();
      const qerr: string[] = [];
      const qbad: string[] = [];
      let reqs = 0;
      q.on("pageerror", (e) => qerr.push(String(e).slice(0, 200)));
      q.on("response", (r) => { if (r.status() >= 500) qbad.push(`${r.status()} ${new URL(r.url()).pathname}`); });
      try {
        await q.goto(BASE + final, { waitUntil: "domcontentloaded", timeout: 45000 });
        await settle(q);
        const now = await buttons(q);
        const hit = now.find((x) => x.text === b.text && x.i === b.i) ?? now.find((x) => x.text === b.text);
        if (!hit) { await q.close(); continue; }
        const loc = q.locator("button, [role=button], summary, input[type=submit], input[type=button]").nth(hit.i);
        const invalid = await loc.evaluate((e) => {
          const f = e.closest("form");
          return !!f && (e as HTMLButtonElement).type === "submit" && !f.checkValidity();
        }).catch(() => false);
        const before = await snapshot(q);
        q.on("request", (r) => { if (!/\/_next\/static|favicon/.test(r.url())) reqs += 1; });
        try {
          await loc.click({ timeout: 4000 });
        } catch (e) {
          const msg = String(e);
          add({ who, view, page: final, kind: /intercepts pointer|not receive pointer/.test(msg) ? "가려져 눌리지 않음" : "눌리지 않음", target: b.text, detail: msg.split("\n").find((l) => /intercepts|Timeout|not visible|outside/.test(l))?.trim().slice(0, 140) ?? msg.slice(0, 140) });
          await q.close(); continue;
        }
        await q.waitForTimeout(1200);
        await settle(q);
        const after = await snapshot(q).catch(() => "navigated");
        const atext = await q.locator("body").innerText().catch(() => "");
        if (ERROR_TEXT.test(atext)) add({ who, view, page: final, kind: "누르면 오류 화면", target: b.text, detail: (atext.match(ERROR_TEXT) ?? [""])[0] });
        if (qbad.length) add({ who, view, page: final, kind: "누르면 5xx", target: b.text, detail: qbad.slice(0, 2).join(", ") });
        if (qerr.length) add({ who, view, page: final, kind: "누르면 브라우저 오류", target: b.text, detail: qerr[0] });
        if (after === before && reqs === 0 && !invalid) add({ who, view, page: final, kind: "무반응", target: b.text, detail: b.type });
      } catch (e) {
        add({ who, view, page: final, kind: "점검 실패", target: b.text, detail: String(e).slice(0, 120) });
      }
      await q.close();
    }
    if (errs.length) add({ who, view, page: final, kind: "브라우저 오류", target: path, detail: errs[0] });
    if (bad.length) add({ who, view, page: final, kind: "하위 요청 5xx", target: path, detail: bad.slice(0, 2).join(", ") });
    visited.push({ who, view, page: path, status, final, buttons: list.length, clicked, links: hrefs.length });
    console.log(`  · [${who}/${view}] ${path}${final !== path ? ` → ${final}` : ""} ${status} · 단추 ${list.length} 눌러 봄 ${clicked} · 링크 ${hrefs.length}`);
    await p.close();
  }
}

async function main() {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const stamp = Date.now().toString(36).slice(-5);

  const personas: { who: string; starts: string[]; make: () => Promise<{ login?: string; pw?: string }> }[] = [
    { who: "anon", starts: ["/", "/start", "/pricing", "/product", "/sample", "/login", "/signup", "/support", "/password/forgot", "/legal/terms", "/campus/pcu", "/campus/sjepa", "/campus/jju", "/campus/ku", "/campus/kus", "/cores", "/free"],
      make: async () => ({}) },
    { who: "student", starts: ["/me", "/my", "/cores"],
      make: async () => {
        const login_id = `zzca-s${stamp}`;
        const st = await makeStudent(login_id);
        await cloneFinished(st.id, "PRO");
        return { login: login_id, pw: st.pw };
      } },
    { who: "fresh", starts: ["/me", "/my", "/cores", "/v3/start"],
      make: async () => {
        const login_id = `zzca-f${stamp}`;
        const st = await makeStudent(login_id);
        return { login: login_id, pw: st.pw };
      } },
    { who: "campus", starts: ["/me", "/campus/pcu", "/v3/start"],
      make: async () => {
        const login_id = `zzca-c${stamp}`;
        const st = await makeStudent(login_id);
        await registerCampusStudent(st.id, "PCU", process.env.LEAF ?? "PCU26_BIZ");
        return { login: login_id, pw: st.pw };
      } },
    { who: "orgadmin", starts: ["/org", "/org/v3", "/org/v3/students"],
      make: async () => ({ login: `zzca-o${stamp}`, pw: await staffUser(`zzca-o${stamp}`, "org_admin", "PCU") }) },
    { who: "admin", starts: ["/admin"],
      make: async () => ({ login: `zzca-a${stamp}`, pw: await staffUser(`zzca-a${stamp}`, "superadmin") }) },
  ];

  for (const per of personas) {
    if (ONLY.length && !ONLY.includes(per.who)) continue;
    const cred = await per.make();
    for (const view of (MOBILE ? ["d", "m"] : ["d"]) as ("d" | "m")[]) {
      const ctx = await browser.newContext({
        viewport: view === "d" ? { width: 1440, height: 900 } : { width: 390, height: 844 },
        ...(view === "m" ? { isMobile: true, hasTouch: true } : {}),
      });
      if (cred.login && cred.pw) { const lp = await login(ctx, cred.login, cred.pw); console.log(`[${per.who}/${view}] 로그인 → ${new URL(lp.url()).pathname}`); await lp.close(); }
      await crawl(ctx, per.who, per.starts, view);
      await ctx.close();
    }
    writeFileSync(`${OUT}/findings.json`, JSON.stringify({ findings, visited }, null, 1));
  }
  await browser.close();

  /* 같은 단추가 여러 쪽에서 같은 탈을 내면 한 줄로 묶는다 */
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const k = `${f.kind}|${f.target}|${patternOf(f.page)}`;
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  const md = [
    `# 모든 단추 눌러 보기 · ${new Date().toISOString().slice(0, 16)}`,
    "",
    `쪽 ${visited.length} · 눌러 본 단추 ${visited.reduce((a, v) => a + v.clicked, 0)} · 걸림 ${groups.size}(원본 ${findings.length})`,
    "",
    "| 누구/폭 | 쪽 | 종류 | 대상 | 내용 |",
    "|---|---|---|---|---|",
    ...[...groups.values()].map((fs) => {
      const f = fs[0];
      const whos = [...new Set(fs.map((x) => `${x.who}/${x.view}`))].join(" ");
      return `| ${whos} | ${f.page} | ${f.kind} | ${f.target.replace(/\|/g, "/")} | ${f.detail.replace(/\|/g, "/").replace(/\n/g, " ")} |`;
    }),
  ];
  writeFileSync(`${OUT}/REPORT.md`, md.join("\n"));
  console.log(`\n쪽 ${visited.length} · 걸림 ${groups.size} → ${OUT}/REPORT.md`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
