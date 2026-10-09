/**
 * ME_V3 검사 화면을 실제 브라우저로 찍는다.
 *
 * 그림만 남기지 않는다. 찍는 자리마다 넷을 같이 센다: **내부 코드가
 * 화면에 보이는가** · 가로 스크롤이 생기는가 · 브라우저 오류가 나는가 ·
 * 초점 표시가 보이는가. 눈으로 보면 넷 다 지나간다.
 *
 * 먼저 띄워 두어야 한다.
 *
 *   npx next build && npx next start -p 3100
 *   npx tsx scripts/v3-shot-prep.ts > /tmp/targets.json
 *   node scripts/v3-shots.mjs /tmp/targets.json
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/metri/shots/v3";
const FILE = process.argv[2];
mkdirSync(OUT, { recursive: true });

/**
 * **자리 목록을 직접 만든다.**
 *
 * 전에 만들어 둔 목록을 그대로 쓰면 그 응시는 지난번 키보드 점검이
 * 눌러 둔 상태로 남아 있다. 그러면 찍은 그림이 **그 사람의 응답이
 * 아닌 것**을 보여 주고, 보는 쪽은 그것을 설계로 읽는다.
 */
const plan = JSON.parse(FILE
  ? readFileSync(FILE, "utf8")
  : execFileSync("npx", ["tsx", "scripts/v3-shot-prep.ts"], { encoding: "utf8" }));
const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  narrow: { width: 320, height: 720 },
};
const PW = {
  "me-admin": "pca-dev-org-1234",
  admin: "pca-dev-admin-1234",
};

/** 응시자에게 보이면 안 되는 모양. 문항 번호와 영역 코드와 축 코드 */
const INTERNAL = [
  /\bTD\d{2}\b/, /\b[A-Z]{2,3}_[A-Z0-9]{2,}\b/, /\bJ[1-8]\b/,
  /ME_V3|ME_CORE|ITEM_BANK|INDUSTRY_[A-Z]|ROLE_[A-Z]+_V/,
  /\bZ[1-4]_[A-Z]/, /NOT_OBSERVED|PARTICIPATED|CONFIRMED|OWNED/,
];

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function login(ctx, who) {
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "networkidle" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', who);
  await p.fill('input[type="password"]', PW[who]);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
    .catch(() => {});
  const at = new URL(p.url()).pathname;
  await p.close();
  if (at.startsWith("/login")) throw new Error(`로그인이 안 됐습니다: ${who}`);
}

const ctx = {};
for (const [key, login_] of Object.entries(plan.users)) {
  ctx[key] = await browser.newContext({ viewport: SIZES.desktop });
  await login(ctx[key], login_);
}

/* 320px 은 일곱 자리에서 본다. 좁은 화면이 실제로 달라지는 곳은 머리띠가
   접히는 자리(시작) · 열두 줄이 깔리는 자리(훑기) · 눈금이 선 자리(소유) ·
   칩이 깔린 자리(근거)이고, 플랫폼 쪽에서는 카드 격자(대시보드)와 표가
   선 자리(Gap · 공고)다 */
const NARROW = new Set([
  "00_start", "04_screening", "07_evidence", "13_ownership",
  "22_dashboard", "25_gap", "29_jobs",
]);

const log = [];
const problems = [];
/**
 * **200 하나로 찍었다고 하지 않는다.**
 *
 * 자리를 못 찾아 `?s=-1` 이 된 날에도 응시 화면은 마지막 화면으로 끌어다
 * 붙여 **완료 화면이 200 으로 멀쩡히 떴다.** 그래서 `실제 판단` 과 `심화`
 * 와 `소유` 세 자리가 셋 다 같은 그림을 찍고 있었고 찍는 검사는 초록이었다.
 *
 * 이제 자리마다 셋 가운데 **둘 이상**이 맞아야 저장한 것으로 친다:
 * 주소 · 큰 글씨 · 그 화면이 묻는 문항의 문면 한 토막. 주소가 어긋난 것은
 * 그 자체로 걸린다(넘겨졌다는 뜻이다).
 */
function matchShot(expect, at, text) {
  const hit = [];
  const miss = [];
  const route = at === expect.route;
  (route ? hit : miss).push(`주소 ${route ? "" : `${expect.route} → ${at}`}`.trim());
  if (expect.heading) {
    const ok = text.includes(expect.heading);
    (ok ? hit : miss).push(`큰 글씨 ${ok ? "" : `"${expect.heading}"`}`.trim());
  }
  if (expect.itemText) {
    const ok = text.includes(expect.itemText);
    (ok ? hit : miss).push(`문항 ${ok ? "" : `"${expect.itemText}"`}`.trim());
  }
  /**
   * **가르는 신호가 맞아야 한다.**
   *
   * 둘 이상 맞으면 통과로 두었더니 빗나간 자리를 못 잡았다: 두 문항이 한
   * 화면에 선 자리는 큰 글씨가 `아래 두 가지에 각각 답해주세요` 로 전부
   * 같아서, 옆 화면을 찍어도 `주소 + 큰 글씨` 로 둘이 찬다. 그 자리에서
   * 화면을 가르는 것은 문항 문면 하나뿐이다. 일부러 한 칸 옆을 가리켜
   * 보고 그대로 통과하는 것을 보고 고쳤다.
   */
  const itemOk = !expect.itemText || text.includes(expect.itemText);
  return { ok: route && itemOk && hit.length >= 2, hit, miss };
}

/** 같은 그림이 두 이름으로 저장되면 자리 하나가 빗나간 것이다 */
const seenHash = new Map();
for (const t of plan.targets) {
  /* **종이는 화면으로 찍지 않는다.** PDF 길은 내려받기라 브라우저로 열면
     빈 쪽이 뜬다. 받아서 첫 쪽을 그림으로 떠 둔다: 빈 쪽과 잘린 카드는
     그림으로 봐야 보인다 */
  if (t.pdf) {
    const p = await ctx[t.who].newPage();
    const res = await p.request.get(B + t.path, { timeout: 120000 });
    const code = res.status();
    if (code === 200) {
      const buf = await res.body();
      const raw = `${OUT}/${t.name}.pdf`;
      writeFileSync(raw, buf);
      try {
        execFileSync("pdftoppm", ["-png", "-r", "80", "-f", "1", "-l", "2",
          raw, `${OUT}/${t.name}`]);
      } catch { problems.push(`${t.name}: pdftoppm 이 없습니다`); }
      /* **빈 쪽과 글자 없는 쪽을 센다.** 쪽수를 목표로 삼지 않는 대신
         빈 쪽이 없는지는 본다 */
      try {
        const txt = execFileSync("pdftotext", [raw, "-"], { encoding: "utf8" });
        const pages = txt.split("\f");
        const blank = pages.filter((x, i) => i < pages.length - 1 && x.trim().length < 20);
        const leaked = INTERNAL.map((re) => (txt.match(re) ?? [])[0]).filter(Boolean);
        log.push(`${t.name.padEnd(26)} ${code} 종이 ${pages.length - 1}쪽`
          + `${blank.length ? ` 빈쪽 ${blank.length}` : ""}`
          + `${leaked.length ? ` 내부코드 ${leaked.join(",")}` : ""}`);
        if (blank.length) problems.push(`${t.name}: 빈 쪽이 ${blank.length}장 있다`);
        if (leaked.length) problems.push(`${t.name}: 종이에 내부 코드 — ${leaked.join(", ")}`);
      } catch { problems.push(`${t.name}: pdftotext 가 없습니다`); }
    } else {
      log.push(`${t.name.padEnd(26)} ${code}`);
      problems.push(`${t.name}: ${code}`);
    }
    await p.close();
    continue;
  }
  const sizes = NARROW.has(t.name)
    ? ["desktop", "mobile", "narrow"] : ["desktop", "mobile"];
  for (const size of sizes) {
    const p = await ctx[t.who].newPage();
    await p.setViewportSize(SIZES[size]);
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
    const r = await p.goto(B + t.path, { waitUntil: "networkidle" });
    await p.waitForTimeout(250);
    const code = r ? r.status() : 0;

    const text = await p.evaluate(() => document.body.innerText);
    const leaked = INTERNAL.map((re) => (text.match(re) ?? [])[0]).filter(Boolean);
    const overflow = await p.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);

    /* 붙어 있는 띠를 그대로 두고 **보이는 만큼만** 찍는다. 쪽 전체를 찍으면
       fixed 띠가 굴러간 자리에 한 번 더 그려진다 */
    const file = `${OUT}/${t.name}__${size}.png`;
    const shot = await p.screenshot({ path: file, fullPage: !!t.full });

    const tag = `${t.name} ${size}`;
    /* 찍은 자리가 그 화면인가. 주소와 큰 글씨와 문항 문면으로 되짚는다 */
    let proof = "";
    if (t.expect) {
      const at = new URL(p.url()).pathname + new URL(p.url()).search;
      const m = matchShot(t.expect, at, text);
      proof = m.ok ? ` 확인 ${m.hit.length}` : "";
      if (!m.ok) {
        problems.push(`${tag}: 그 화면이 아니다 — 맞은 것 ${m.hit.length}`
          + `${m.miss.length ? ` · 어긋난 것 ${m.miss.join(" / ")}` : ""}`);
      }
    }
    /* **같은 그림이 두 이름으로 나오면 자리 하나가 빗나간 것이다.** 전에
       세 자리가 바이트까지 같은 완료 화면을 찍고 있었다 */
    const h = createHash("sha256").update(shot).digest("hex").slice(0, 16);
    const was = seenHash.get(`${size}:${h}`);
    if (was && was !== t.name) {
      problems.push(`${tag}: ${was} 와 그림이 똑같다 (같은 화면을 두 번 찍었다)`);
    }
    seenHash.set(`${size}:${h}`, t.name);
    log.push(`${tag.padEnd(26)} ${code}${proof} ${overflow ? "가로스크롤 " : ""}` +
      `${leaked.length ? `내부코드 ${leaked.join(",")} ` : ""}` +
      `${errs.length ? `오류 ${errs.length}` : ""}`.trim());
    if (code !== 200) problems.push(`${tag}: ${code}`);
    if (overflow) problems.push(`${tag}: 가로 스크롤이 생긴다`);
    if (leaked.length) problems.push(`${tag}: 내부 코드가 보인다 — ${leaked.join(", ")}`);
    if (errs.length) problems.push(`${tag}: ${errs[0]}`);
    await p.close();
  }
}

/* 320px 과 키보드 이동은 한 자리에서만 본다. 열다섯 자리를 다 보면
   컨테이너가 메모리에서 죽는다.
   **누르는 점검이라 응답이 바뀐다.** 그래서 다 찍은 뒤에 하고, 자리도
   맨 끝 것을 쓴다 */
const qa = [...plan.targets].reverse().find((t) => !t.pdf);
/**
 * **키보드 점검은 보기 넷이 있는 자리에서만 한다.**
 *
 * 전에는 목록의 맨 끝 자리를 썼는데, 플랫폼 쪽(내 CareerMatri · 공고)이
 * 목록에 들어오면서 맨 끝이 라디오가 없는 쪽이 됐고 **멀쩡한 화면이
 * `키보드로 보기에 닿지 않는다` 로 걸렸다.** 자리를 성격으로 고른다.
 */
const KB = [...plan.targets].filter((t) => !t.pdf).reverse()
  .find((t) => /^\/v3\/[^/]+\?s=/.test(t.path)) ?? qa;
{
  const p = await ctx[qa.who].newPage();
  await p.setViewportSize(SIZES.narrow);
  await p.goto(B + qa.path, { waitUntil: "networkidle" });
  const overflow = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) problems.push("320px: 가로 스크롤이 생긴다");
  await p.screenshot({ path: `${OUT}/${qa.name}__narrow.png` });

  /* 키보드만으로 보기를 고를 수 있는가. **보기 넷이 있는 자리로 옮긴다** */
  await p.goto(B + KB.path, { waitUntil: "networkidle" });
  await p.setViewportSize(SIZES.desktop);
  await p.keyboard.press("Tab");
  for (let i = 0; i < 12; i += 1) {
    const tag = await p.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.tagName}:${el.getAttribute("type") ?? ""}` : "";
    });
    if (tag === "INPUT:radio") break;
    await p.keyboard.press("Tab");
  }
  const onRadio = await p.evaluate(() =>
    document.activeElement?.tagName === "INPUT");
  if (!onRadio) problems.push("키보드로 보기에 닿지 않는다");
  else {
    await p.keyboard.press("ArrowDown");
    const picked = await p.evaluate(() =>
      document.querySelectorAll(".qs-opt.is-on").length);
    if (!picked) problems.push("키보드로 고른 것이 화면에 나타나지 않는다");
    const ring = await p.evaluate(() => {
      const el = document.activeElement?.closest(".qs-opt, .qs-cell");
      if (!el) return "";
      return getComputedStyle(el).outlineStyle;
    });
    if (ring === "none") problems.push("초점 표시가 없다");
    await p.screenshot({ path: `${OUT}/${KB.name}__focus.png` });
  }
  log.push(`${qa.name} 320px · ${KB.name} 키보드`.padEnd(26) + " 확인");
  await p.close();
}

/* ── 대비와 누르는 자리 ──
   눈으로는 다 괜찮아 보인다. 전에 `a11y:check` 를 처음 돌렸을 때 마흔
   가지가 걸린 자리가 그것이라, 검사 화면도 세어 둔다 */
{
  const ROLES = [".qs-q", ".qs-subject", ".qs-eyebrow", ".qs-label", ".qs-gloss",
    ".qs-tag", ".qs-save", ".qs-count", ".qs-crumb .now", ".qs-chip", ".qs-help",
    ".qs-guide", ".qs-btn-main", ".qs-btn-ghost", ".qs-next li"];
  const seen = new Map();
  for (const t of plan.targets.slice(1).filter((x) => !x.pdf)) {
    const p = await ctx[t.who].newPage();
    await p.setViewportSize(SIZES.desktop);
    await p.goto(B + t.path, { waitUntil: "networkidle" });
    const rows = await p.evaluate((sel) => {
      const lum = (c) => {
        const [r, g, b] = c.map((v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      /* **색 적는 법이 둘이다.** 크로뮴은 `color-mix` 를 거친 값을
         `color(srgb 1 1 1 / 0.94)` 로 돌려주는데, 거기서 숫자 셋을 그냥
         집으면 흰색이 `rgb(1,1,1)` 즉 검정이 된다. 그러면 멀쩡한 글자색이
         전부 대비 미달로 걸린다. 거짓 경보를 내는 검사는 그 다음부터
         아무도 안 본다 */
      const parse = (c) => {
        const n = (c.match(/-?\d*\.?\d+/g) ?? []).map(Number);
        if (n.length < 3) return null;
        const srgb = c.startsWith("color(");
        const v = n.slice(0, 3).map((x) => (srgb ? x * 255 : x));
        const a = n.length > 3 ? n[3] : 1;
        return { v, a };
      };
      /* 반투명이면 **아래와 섞어서** 본다. 머리띠와 바닥 띠가 그렇다 */
      const bgOf = (el) => {
        let acc = null, left = 1;
        for (let n = el; n && left > 0.01; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (!c || c.a <= 0.01) continue;
          const w = left * c.a;
          acc = acc ? acc.map((x, i) => x + c.v[i] * w) : c.v.map((x) => x * w);
          left -= w;
        }
        const base = acc ?? [0, 0, 0];
        return base.map((x) => x + 255 * left);
      };
      const out = [];
      for (const q of sel) {
        for (const el of document.querySelectorAll(q)) {
          const st = getComputedStyle(el);
          if (!el.textContent?.trim()) continue;
          const fgc = parse(st.color);
          if (!fgc) continue;
          const fg = fgc.v, bg = bgOf(el);
          const L1 = lum(fg), L2 = lum(bg);
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const px = parseFloat(st.fontSize);
          const big = px >= 24 || (px >= 18.66 && parseInt(st.fontWeight, 10) >= 700);
          const r = el.getBoundingClientRect();
          out.push({ q, ratio: Math.round(ratio * 100) / 100, need: big ? 3 : 4.5,
                     h: Math.round(r.height) });
          break;   /* 같은 꼴은 한 번만 */
        }
      }
      return out;
    }, ROLES);
    for (const r of rows) if (!seen.has(r.q) || seen.get(r.q).ratio > r.ratio) seen.set(r.q, r);
    await p.close();
  }
  const bad = [...seen.values()].filter((r) => r.ratio < r.need);
  for (const r of bad) problems.push(`대비 ${r.q} ${r.ratio}:1 (${r.need} 필요)`);
  log.push("대비".padEnd(26) + ` ${seen.size}꼴 · 가장 낮은 ` +
    `${Math.min(...[...seen.values()].map((r) => r.ratio))}:1`);

  /* 누르는 자리 */
  const p = await ctx[qa.who].newPage();
  await p.setViewportSize(SIZES.mobile);
  const hit = plan.targets.find((t) => t.name === "07_evidence") ?? qa;
  await p.goto(B + hit.path,
    { waitUntil: "networkidle" });
  const small = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".qs-opt, .qs-cell, .qs-chip, .qs-btn")) {
      const h = el.getBoundingClientRect().height;
      if (h < 40) out.push(`${el.className.split(" ")[0]} ${Math.round(h)}px`);
    }
    return out;
  });
  for (const x of small) problems.push(`누르는 자리가 40px 아래다 — ${x}`);
  log.push("누르는 자리".padEnd(26) + ` ${small.length ? small.join(",") : "40px 이상"}`);
  await p.close();
}

await browser.close();
console.log(log.join("\n"));
if (problems.length) {
  console.log(`\n${problems.length}개가 걸렸다.`);
  for (const x of problems) console.log("  " + x);
  process.exitCode = 1;
} else {
  console.log(`\n화면 ${log.length - 1}자리 OK. ${OUT} 에 남았다.`);
}
