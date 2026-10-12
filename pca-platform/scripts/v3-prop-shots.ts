/**
 * **Visual Propagation 캡처.** 아홉 화면을 Desktop 1440 과 Mobile 390 으로
 * 같은 길에서 찍는다.
 *
 * 자리 목록을 주소로 열기만 하지 않고 **자료를 먼저 만든다**: 빈 사람으로
 * 찍으면 아홉 장이 전부 빈 상태라 위계를 볼 수 없다.
 *
 *   OUT=docs/metri/shots/prop npm run v3:prop:shots
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import {
  BASE, assertFreshServer, cloneFinished, loadEnv, login, makeStudent,
} from "./_loop-fixture";
import { query } from "../src/lib/db";

loadEnv();
const OUT = process.env.OUT || "docs/metri/shots/prop";
let fail = 0;

const SCREENS: [string, string][] = [
  ["01-assessment-start", "/cores"],
  ["02-current-state", "/me/state"],
  ["03-industry-role", "/me/explore"],
  ["04-region", "/me/region"],
  ["05-application", "/me/apply"],
  ["06-result-history", "/me/results"],
  ["07-account", "/my"],
  ["08-next-action", "/me/next"],
  ["09-experience", "/me/experience"],
  ["00-home", "/me"],
];

type Check = { status: number; h: number; over: number; prim: number; hide: number; hid: string[] };

/**
 * 찍으면서 **규격 §21 을 기계가 센다.** 눈으로만 보면 쪽이 아홉이라
 * 어느 하나는 반드시 빠진다.
 */
async function shoot(p: Page, dir: string, name: string, path: string): Promise<Check> {
  const r = await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(350);
  await p.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
  /* **아래 띠가 글을 덮는가**(규격 §18). 쪽 맨 아래까지 내려서 잰다:
     위에서 재면 띠 아래에 글이 아직 오지 않아 늘 0 이 나온다 */
  const v = await p.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    /* **보이는 띠만 잰다.** 넓은 화면에서 아래 띠는 `display:none` 이고
       그때 `getBoundingClientRect()` 는 0 을 돌려준다. 그 0 을 띠의
       윗선으로 쓰면 쪽의 모든 글이 `가려졌다` 로 세어진다 */
    const navEl = document.querySelector(".cm-tabs");
    const nav = navEl && getComputedStyle(navEl).display !== "none" ? navEl : null;
    const top = nav ? nav.getBoundingClientRect().top : Infinity;
    let hide = 0;
    if (nav) {
      for (const el of document.querySelectorAll("main a, main button, main p, main h2")) {
        /* **접힌 자리의 글을 세지 않는다.** 크로뮴은 닫힌 `<details>` 의
           안쪽을 `display:none` 이 아니라 `content-visibility:hidden` 으로
           두고, 그러면 **보이지 않는 줄에도 `getBoundingClientRect` 가
           자리를 돌려준다**. 그 자리를 세면 접어 둔 줄이 쪽 맨 아래에서
           띠와 겹쳐 보여 멀쩡한 화면이 걸린다. `offsetParent` 로는
           갈리지 않는다(접힌 줄도 부모를 들고 있다) */
        if (!(el as HTMLElement).checkVisibility({ contentVisibilityAuto: true })) continue;
        /* **띠 아래로 내려간 것을 전부 센다.** 걸치는 것만 세면
           (`top < 띠`) **띠에 통째로 가린 줄**이 빠진다: 그 줄은
           `top` 이 이미 띠보다 아래라 걸침 조건에 걸리지 않는다. 여백을
           0 으로 두고 돌려 보니 가장 아래 줄이 그 모양으로 빠졌다.
           창 밖으로 내려간 것은 세지 않는다(스크롤이 남은 자리다) */
        const b = el.getBoundingClientRect();
        if (b.height && b.bottom > top && b.top < window.innerHeight) {
          hide += 1;
          (window as unknown as { __hid: string[] }).__hid =
            [...((window as unknown as { __hid?: string[] }).__hid ?? []),
             `${el.tagName}.${(el as HTMLElement).className}`
             + `:${(el.textContent ?? "").trim().slice(0, 24)}`];
        }
      }
    }
    return {
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h: document.documentElement.scrollHeight,
      /* **짙은 단추는 한 화면에 하나다**(규격 §2 E). **보이는 것만
         센다**: 띠의 단추와 쪽 머리의 단추가 폭에 따라 번갈아 서므로,
         DOM 으로 세면 늘 둘이고 멀쩡한 화면이 걸린다 */
      prim: [...document.querySelectorAll(".cm-btn.is-primary")]
        .filter((e) => (e as HTMLElement).offsetParent !== null).length,
      hide,
      hid: (window as unknown as { __hid?: string[] }).__hid ?? [],
    };
  });
  return { status: r?.status() ?? 0, ...v };
}

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(OUT, "m"), { recursive: true });

  const LOGIN = `prop-${Date.now()}`;
  const a = await makeStudent(LOGIN);
  await cloneFinished(a.id);
  const b = await chromium.launch();

  for (const [kind, size] of [["", { width: 1440, height: 900 }],
                              ["m", { width: 390, height: 844 }]] as const) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 1 });
    const p = await login(ctx, LOGIN, a.pw);
    const dir = kind ? join(OUT, kind) : OUT;
    console.log(`\n── ${kind ? "Mobile 390" : "Desktop 1440"}\n`);
    for (const [name, path] of SCREENS) {
      const c = await shoot(p, dir, name, path);
      const bad = [
        c.status !== 200 ? `상태 ${c.status}` : "",
        c.over > 0 ? `가로넘침 ${c.over}px` : "",
        c.prim > 1 ? `짙은 단추 ${c.prim}개` : "",
        c.hide > 0 ? `띠가 가린 것 ${c.hide} · ${c.hid.join(" / ")}` : "",
      ].filter(Boolean);
      if (bad.length) fail += 1;
      console.log(`  ${bad.length ? "걸림" : "통과"}  ${name.padEnd(22)}`
        + `${String(c.h).padStart(5)}px  ${bad.join(" · ")}`);
    }
    await ctx.close();
  }
  await b.close();
  await query("DELETE FROM users WHERE id = $1", [a.id]).catch(() => undefined);
  console.log(`\n  찍었다 — ${OUT} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

void main();
