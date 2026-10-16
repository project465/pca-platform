/**
 * **마지막 UI 문제 셋이 돌아오지 않게 센다**(규격 §11).
 *
 * 앞 회차들이 고친 자리는 전부 **상태코드도 가로 넘침도 멀쩡한 자리**였다.
 * 쪽은 200 으로 뜨고 글자도 다 있는데 쓸 수 없는 모양이라, 세는 자를
 * 따로 만들지 않으면 다음 사람이 모르고 되돌린다.
 *
 *   A 검사 affordance   미선택 1~5 가 **누를 수 있는 요소로 보이는가**
 *   B 결과 기본 깊이    기본 상태에 **장문 참고자료가 여러 절 연속으로**
 *                       펼쳐져 있지 않은가
 *   C 결과 이어지는 길  마지막에 **같은 무게의 카드가 넷 이상** 서지 않는가
 *   D CTA 위계          한 창에 **짙은 단추가 하나**인가(규격 §8)
 *
 * **눈으로 재지 않는다.** A 는 계산된 테와 면과 누르는 자리의 높이를
 * 재고, B 는 접힌 자리와 절 높이를 세고, C 는 테를 두른 링크를 세고,
 * D 는 창을 한 칸씩 내리며 배경 밝기로 짙은 단추를 센다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/v3-ui-delta.ts
 */
import {
  BASE as B, cloneFinished, gateCreds, grantRetake, login, makeStudent,
} from "./_loop-fixture";
import { chromium, type Browser, type Page } from "playwright";
import { enterAssessment } from "./_v3-walk";

const WHO = "v3delta@example.com";

let pass = 0, fail = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? ` — ${d}` : ""}`); }
}

/** 검사 격자가 설 때까지 밟는다. **주소로 열면 그 화면이 서지 않는다** */
async function walkToGrid(p: Page): Promise<boolean> {
  await p.goto(`${B}/v3/start`, { waitUntil: "networkidle" });
  if (!/\/v3\/\d+/.test(p.url())) {
    await p.locator('.qs-opt:has(input[name="stage"])').first()
      .click({ timeout: 8000 }).catch(() => undefined);
    await p.locator('button[type="submit"]').first()
      .click({ timeout: 10000 }).catch(() => undefined);
    await p.waitForURL(/\/v3\/\d+/, { timeout: 20000 }).catch(() => undefined);
  }
  await enterAssessment(p);
  for (let i = 0; i < 14; i += 1) {
    if (await p.locator(".qs-sweep").count()) return true;
    const sets = p.locator("fieldset.qs-opts");
    const m = await sets.count();
    for (let j = 0; j < m; j += 1) {
      await sets.nth(j).locator("label.qs-opt").nth(1)
        .click({ timeout: 2500 }).catch(() => undefined);
    }
    const go = p.locator(".qs-nav button").filter({ hasText: /다음|계속/ }).first();
    if (!(await go.count())) return false;
    await go.click({ timeout: 6000 }).catch(() => undefined);
    await p.waitForTimeout(500);
  }
  return false;
}

/**
 * A. 고르기 전의 보기가 **누를 수 있는 것으로 보이는가.**
 *
 * 영역 훑기가 넷씩 끊긴 질문이 되면서 보기는 낱말이 적힌 칸이다
 * (COMMERCIAL GOLD MASTER §5). 그래서 세는 것이 바뀌었다: 번호가 아니라
 * **말이 적혀 있는가**와, 그 칸이 라디오를 품은 누르는 자리인가와,
 * 누르는 자리가 44px 이상인가다. 숫자를 세던 줄은 지웠다 — 숫자가 없는
 * 것이 지금의 설계라 그대로 두면 멀쩡한 화면이 걸린다.
 */
async function affordance(p: Page, label: string): Promise<void> {
  const r = await p.evaluate(() => {
    const box = document.querySelector("fieldset.qs-opts .qs-own");
    if (!box) return null;
    const cells = [...box.querySelectorAll("label.qs-opt")];
    const cs = cells.map((c) => getComputedStyle(c));
    const heights = cells.map((c) => c.getBoundingClientRect().height);
    return {
      n: cells.length,
      control: cells.every((c) => c.tagName === "LABEL"
        && !!c.querySelector('input[type="radio"]')),
      worded: cells.every((c) =>
        ((c.querySelector(".qs-label")?.textContent ?? "").trim().length >= 2)),
      border: Math.min(...cs.map((s) => parseFloat(s.borderTopWidth) || 0)),
      boxBorder: parseFloat(getComputedStyle(box).borderTopWidth) || 0,
      minH: Math.min(...heights),
    };
  });
  if (!r) { ok(`A ${label} 보기가 선다`, false, "보기를 찾지 못했다"); return; }
  ok(`A ${label} 보기가 누를 수 있는 요소다`, r.control && r.n >= 3, `${r.n}칸`);
  ok(`A ${label} 보기마다 뜻이 적혀 있다`, r.worded);
  /* **좁은 화면에서는 칸마다 테를 두르지 않는다.** 거기서는 다섯 칸이
     한 덩이 안에 줄로 서고 테는 덩이에 한 겹이다(`.qs-list`). 칸마다
     테를 요구하면 그 모양이 걸리는데, 그것이 승인된 손전화 모양이다 */
  ok(`A ${label} 보기가 테로 묶인다`, r.border >= 1 || r.boxBorder >= 1,
     `칸 ${r.border}px · 덩이 ${r.boxBorder}px`);
  ok(`A ${label} 누르는 자리가 44px 이상이다`, r.minH >= 44, `${Math.round(r.minH)}px`);
}

/**
 * B. 기본 상태의 깊이.
 *
 * **접힌 자리를 세는 것이 요지다.** 참고자료를 지우는 것이 아니라 펼침
 * 안으로 옮기는 것이라(규격 §4), 담긴 것은 그대로고 기본 화면에서만
 * 빠진다. 그리고 **장문 절이 둘 연속으로 서지 않는지**를 함께 본다:
 * 한 절이 길어도 그 아래가 짧으면 읽는 흐름이 끊기지 않는다.
 */
async function depth(p: Page): Promise<void> {
  const r = await p.evaluate(() => {
    const discs = [...document.querySelectorAll(".rs-disc")];
    const open = discs.filter((d) => {
      const box = d.querySelector(":scope > div");
      return box && !box.hasAttribute("hidden");
    }).length;
    const LONG = 700;
    const secs = [...document.querySelectorAll("section.rs-sect")]
      .map((s) => ({
        id: s.id, h: Math.round(s.getBoundingClientRect().height),
      }));
    let run = 0, worst = 0, pair = "";
    for (let i = 0; i < secs.length; i += 1) {
      if (secs[i].h > LONG) {
        run += 1;
        if (run > worst) { worst = run; pair = secs.slice(i - run + 1, i + 1)
          .map((x) => `${x.id} ${x.h}px`).join(" → "); }
      } else run = 0;
    }
    return {
      discs: discs.length, open,
      total: document.documentElement.scrollHeight,
      worst, pair,
      long: secs.filter((s) => s.h > LONG).map((s) => `${s.id} ${s.h}px`),
    };
  });
  ok("B 참고자료가 기본으로 접혀 있다", r.discs >= 4 && r.open === 0,
    `접는 자리 ${r.discs} · 펼쳐진 것 ${r.open}`);
  ok("B 장문 절이 둘 연속으로 서지 않는다", r.worst <= 1,
    r.worst > 1 ? r.pair : `가장 긴 줄 ${r.worst}절 · ${r.long.join(" · ") || "없음"}`);
}

/**
 * C. 이어지는 길.
 *
 * **테를 두른 링크를 센다.** 카드인지 아닌지는 사람이 적은 이름이 아니라
 * 테와 높이가 정한다: 이름만 바꾸고 생김새를 그대로 두면 읽는 사람에게는
 * 같은 메뉴판이다.
 */
async function continuation(p: Page): Promise<void> {
  const r = await p.evaluate(() => {
    const sec = document.querySelector("#next");
    if (!sec) return null;
    const links = [...sec.querySelectorAll("a, button")];
    const card = links.filter((el) => {
      const s = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return (parseFloat(s.borderTopWidth) || 0) >= 1 && b.height >= 44;
    });
    /* **이름 붙인 함수를 여기 두지 않는다.** tsx 가 그것을 `__name` 으로
       감싸는데 그 도우미는 브라우저 안에 없어서 `ReferenceError` 가 난다.
       이 저장소에서 같은 자리가 세 번 났다 */
    const dark: Element[] = [];
    for (const el of links) {
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (!m || m.length < 3) continue;
      if (m.length >= 4 && Number(m[3]) < 0.5) continue;
      const L = (0.2126 * Number(m[0]) + 0.7152 * Number(m[1])
        + 0.0722 * Number(m[2])) / 255;
      if (L < 0.55) dark.push(el);
    }
    return {
      cards: card.length,
      cardNames: card.map((el) => (el.textContent || "").trim().slice(0, 14)),
      dark: dark.map((el) => (el.textContent || "").trim().slice(0, 18)),
      links: links.length,
    };
  });
  if (!r) { ok("C 이어지는 자리가 선다", false, "#next 를 찾지 못했다"); return; }
  ok("C 같은 무게의 카드가 넷 이상 서지 않는다", r.cards < 4,
    `테 두른 것 ${r.cards}${r.cards ? ` (${r.cardNames.join(" · ")})` : ""}`);
  ok("C 이어지는 길의 주된 단추가 하나다", r.dark.length === 1,
    r.dark.join(" · ") || "없음");
}

/**
 * D. CTA 위계(규격 §8).
 *
 * **한 창에 짙은 단추가 하나다.** 쪽 전체에서 세면 위아래로 멀리 떨어진
 * 둘이 걸리고, 그 둘은 같은 순간에 보이지 않으므로 고르는 일을 만들지
 * 않는다. 창을 한 칸씩 내리며 **그 창 안에서** 센다.
 */
async function hierarchy(p: Page): Promise<void> {
  const vh = p.viewportSize()?.height ?? 900;
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  let worst = 0; let at = "";
  for (let y = 0; y < h; y += Math.floor(vh / 2)) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(90);
    const seen = await p.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll("button, a")) {
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || s.display === "none") continue;
        if (el.closest("[hidden]")) continue;
        const r = el.getBoundingClientRect();
        if (r.height < 36 || r.width < 60) continue;
        if (r.top >= window.innerHeight || r.bottom <= 0) continue;
        const m = s.backgroundColor.match(/[\d.]+/g);
        if (!m || m.length < 3) continue;
        if (m.length >= 4 && Number(m[3]) < 0.5) continue;
        const L = (0.2126 * Number(m[0]) + 0.7152 * Number(m[1])
          + 0.0722 * Number(m[2])) / 255;
        if (L < 0.55) out.push((el.textContent || "").trim().slice(0, 18));
      }
      return out;
    });
    if (seen.length > worst) { worst = seen.length; at = `${y}px · ${seen.join(" · ")}`; }
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  ok("D 한 창에 짙은 단추가 하나를 넘지 않는다", worst <= 1, at || "0개");
}

async function main(): Promise<void> {
  const me = await makeStudent(WHO);
  const at = await cloneFinished(me.id, "PRO");
  if (!at) throw new Error("끝낸 응시를 베끼지 못했습니다");
  /**
   * **끝낸 사람은 기본적으로 다시 못 연다**(규격 §7). 이 검사는 결과지와
   * 검사 격자를 **한 사람으로** 봐야 하므로, 담당자가 하는 일을 그대로
   * 해 둔다: 쓰지 않은 이용권 한 줄.
   *
   * 막는 자리를 끄지 않는다. 끄면 그 자리가 언젠가 운영에서 켜지고,
   * 같은 사람의 응답이 두 벌 쌓인다.
   */
  await grantRetake(me.id);
  const b: Browser = await chromium.launch({ args: ["--no-sandbox"] });

  for (const [name, w, hh] of [["데스크톱", 1440, 900], ["손전화", 390, 844]] as const) {
    const ctx = await b.newContext({
      viewport: { width: w, height: hh }, httpCredentials: gateCreds() ?? undefined,
    });
    const p = await login(ctx, WHO, me.pw);

    /* ── A 검사 격자 ─────────────────────────────────────────────── */
    if (await walkToGrid(p)) await affordance(p, name);
    else ok(`A ${name} 격자까지 간다`, false, p.url());

    /* ── B·C·D 결과 ──────────────────────────────────────────────── */
    await p.goto(`${B}/v3/${at}/result`, { waitUntil: "networkidle" });
    await p.locator(".rs-openbtn").click({ timeout: 6000 }).catch(() => undefined);
    await p.waitForTimeout(700);
    if (name === "데스크톱") { await depth(p); await continuation(p); }
    await hierarchy(p);
    await ctx.close();
  }
  await b.close();
  console.log(`\n  통과 ${pass} · 걸림 ${fail}`);
  if (fail) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
