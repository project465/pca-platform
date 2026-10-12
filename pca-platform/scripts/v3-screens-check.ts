/**
 * **작업공간 화면을 찍고 기계가 센다.** 아홉 화면과 홈을 Desktop 1440 과
 * Mobile 390 으로 **같은 길에서** 찍는다.
 *
 * 자리 목록을 주소로 열기만 하지 않고 **자료를 먼저 만든다**: 빈 사람으로
 * 찍으면 열 장이 전부 빈 상태라 위계를 볼 수 없다.
 *
 * 세는 것은 일곱이다: 열리는가 · 가로로 밀리는가 · 짙은 단추가 둘인가 ·
 * 아래 띠가 글을 덮는가 · **구성 요소의 종류가 셋에 못 미치는가** ·
 * 쓰지 않기로 한 표시 색조가 섞였는가 · **손전화가 데스크톱을 줄인
 * 것인가**.
 *
 * **사람 눈이 먼저다.** 여기서 세는 것은 한 번 고친 모양이 다음 회차에
 * 조용히 돌아오는 것을 막는 데까지다.
 *
 *   OUT=docs/metri/shots/prop npm run v3:screens
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import {
  BASE, assertFreshServer, cloneFinished, fillExperience, loadEnv, login, makeStudent,
} from "./_loop-fixture";
import { query } from "../src/lib/db";
import { addApplication } from "../src/lib/me-v3/platform";

loadEnv();
const OUT = process.env.OUT || "docs/metri/shots/prop";
let fail = 0;

/** 쓰기로 한 표시 색조 넷. blue · cyan · violet · warm */
const TONES = new Set(["is-b", "is-c", "is-v", "is-w"]);

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

type Check = {
  status: number; h: number; over: number; prim: number; hide: number; hid: string[];
  /** 그 화면이 쓴 구성 요소의 **종류** 수(규격 Visual Reference) */
  kinds: number; kindList: string[];
  /** 표시의 색조. blue · cyan · violet · warm 넷만 쓴다 */
  tones: string[];
  /** 왼쪽 띠와 아래 띠. 손전화가 데스크톱을 줄인 것이 아니라는 증거다 */
  rail: boolean; tabs: boolean;
};

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
    /* **한 화면이 한 가지 모양만 쓰면 긴 글을 담은 흰 상자가 된다**
       (규격 Visual Reference). 종류를 센다: 요약 · 눈에 띄는 칸 · 촘촘한
       칸 · 표시가 붙은 묶음 머리 · 줄 · 빈 상태 · 접은 자세한 내용 ·
       보조 정보 · 주된 행동. **개수가 아니라 종류다**: 같은 카드를 여섯
       장 세우는 것은 한 가지다 */
    /* **이름 붙은 화살표 함수를 여기 두지 않는다.** 번들러가 이름을
       지키려고 `__name` 을 끼워 넣는데 그 이름은 브라우저 쪽에 없어서
       `ReferenceError` 로 끝난다. 조건을 그 자리에 편다 */
    const KIND: [string, string][] = [
      ["요약", ".cm-stat, .cm-hero"],
      ["강조", ".cm-panel.is-lead, .cm-card, .cm-why"],
      ["칸", ".cm-tiles, .cm-pcs"],
      ["표시머리", ".cm-sh > svg, .cm-card h2 > svg"],
      ["줄", ".cm-list, .cm-rows, .cm-table, .cm-zone"],
      ["빈상태", ".cm-empty, .cm-soon"],
      ["접음", "details.cm-fold"],
      ["보조", ".cm-pc-meta, .cm-item-meta, .cm-stat-n"],
      ["행동", ".cm-btn.is-primary, .cm-pc-cta.is-strong"],
    ];
    const kindList = KIND.filter(([, sel]) => [...document.querySelectorAll(sel)]
      .some((e) => (e as HTMLElement).checkVisibility({ contentVisibilityAuto: true })))
      .map(([k]) => k);

    return {
      kindList, kinds: kindList.length,
      /* 표시의 색조. 쓰지 않기로 한 색이 섞이면 칸 넷이 한 덩이로 안 읽힌다 */
      tones: [...new Set([...document.querySelectorAll(".cm-pc-ico")]
        .flatMap((e) => [...e.classList].filter((c) => c.startsWith("is-"))))],
      rail: [...document.querySelectorAll(".cm-rail")]
        .some((e) => (e as HTMLElement).checkVisibility({ contentVisibilityAuto: true })),
      tabs: [...document.querySelectorAll(".cm-tabs")]
        .some((e) => (e as HTMLElement).checkVisibility({ contentVisibilityAuto: true })),
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

  /* **빈 쪽을 재면 그 쪽의 구성이 아니라 빈 상태를 재게 된다.** 경험 하나와
     지원 하나를 먼저 적어 둔다. 빈 상태는 따로 두는 규칙이 있고, 그것을
     채우려고 쓰지 않는 칸을 세우면 바로 그 규칙이 막는 모양이 된다 */
  {
    const c0 = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p0 = await login(c0, LOGIN, a.pw);
    await fillExperience(p0, "구조해석 캡스톤");
    await c0.close();
    await addApplication(a.id, {
      org_name: "한국기계연구원", applied_on: "2026-09-01", state: "applied",
    });
  }

  for (const [kind, size] of [["", { width: 1440, height: 900 }],
                              ["m", { width: 390, height: 844 }]] as const) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 1 });
    const p = await login(ctx, LOGIN, a.pw);
    const dir = kind ? join(OUT, kind) : OUT;
    console.log(`\n── ${kind ? "Mobile 390" : "Desktop 1440"}\n`);
    for (const [name, path] of SCREENS) {
      const c = await shoot(p, dir, name, path);
      const odd = c.tones.filter((t) => !TONES.has(t));
      const bad = [
        c.status !== 200 ? `상태 ${c.status}` : "",
        c.over > 0 ? `가로넘침 ${c.over}px` : "",
        c.prim > 1 ? `짙은 단추 ${c.prim}개` : "",
        c.hide > 0 ? `띠가 가린 것 ${c.hide} · ${c.hid.join(" / ")}` : "",
        c.kinds < 3 ? `구성 종류 ${c.kinds}가지 (${c.kindList.join(",")})` : "",
        odd.length ? `쓰지 않는 색조 ${odd.join(",")}` : "",
        /* **손전화가 데스크톱을 줄인 것이 아니다.** 넓은 화면은 왼쪽 띠로
           옮겨 다니고 좁은 화면은 아래 띠로 옮겨 다닌다. 한쪽 규칙이
           빠지면 390 에서 왼쪽 띠가 폭을 먹거나 옮겨 갈 길이 사라진다 */
        kind === "m" && (c.rail || !c.tabs) ? "손전화에서 띠가 바뀌지 않았다" : "",
        kind === "" && (!c.rail || c.tabs) ? "넓은 화면에서 띠가 바뀌지 않았다" : "",
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
