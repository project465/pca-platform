/**
 * **레퍼런스에서 잰 값과 지금 그려진 값을 나란히 적는다**(R27 §1).
 *
 * 눈으로 고치면 다음 회차에 그대로 돌아온다. 재는 것은 `뜻`이 아니라
 * **실제로 그려진 상자**(`getBoundingClientRect`)와 계산된 활자다.
 *
 *   UI_BASE=http://127.0.0.1:3100 ATT=11104 npx tsx scripts/lab/r27-probe.ts
 */
import {
  loadEnv, BASE, assertFreshServer, gateCreds, login, makeStudent, cloneFinished,
} from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";

type Want = { what: string; sel: string; prop: string; ref: number };

const DESK: Want[] = [
  { what: "본문 글 폭", sel: ".rs-main", prop: "inner-w", ref: 1064 },
  { what: "절 머리 표시", sel: ".rs-st .rs-sh > i", prop: "w", ref: 41 },
  { what: "표시 → 이름", sel: ".rs-st .rs-sh", prop: "gap", ref: 31 },
  { what: "절 이름", sel: ".rs-st .rs-sh > h2", prop: "font", ref: 28.5 },
  { what: "오른쪽 링크", sel: ".rs-st .rs-sh > a", prop: "font", ref: 21 },
  { what: "거드는 줄 들여쓰기", sel: ".rs-sh-s", prop: "ml", ref: 72 },
  { what: "거드는 줄", sel: ".rs-sh-s", prop: "font", ref: 18.8 },
  { what: "카드 폭", sel: ".rs-tile a", prop: "w", ref: 344 },
  { what: "카드 높이", sel: ".rs-tile a", prop: "h", ref: 124 },
  { what: "카드 사이", sel: ".rs-tile", prop: "gap", ref: 15.7 },
  { what: "카드 안쪽 왼", sel: ".rs-tile a", prop: "pl", ref: 21 },
  { what: "카드 안쪽 오른", sel: ".rs-tile a", prop: "pr", ref: 17 },
  { what: "카드 둥글기", sel: ".rs-tile a", prop: "radius", ref: 17 },
  { what: "배지", sel: ".rs-tile i", prop: "w", ref: 78 },
  { what: "배지 둥글기", sel: ".rs-tile i", prop: "radius", ref: 28 },
  { what: "배지 안 그림", sel: ".rs-tile i svg", prop: "w", ref: 41 },
  { what: "배지 → 글", sel: ".rs-tile a", prop: "colgap", ref: 26 },
  { what: "카드 제목", sel: ".rs-tile b", prop: "font", ref: 22 },
  { what: "카드 세부", sel: ".rs-tile small", prop: "font", ref: 18.7 },
  { what: "꺾쇠 높이", sel: ".rs-tile em", prop: "h", ref: 18.5 },
];
const MOB: Want[] = [
  { what: "본문 글 폭", sel: ".rs-main", prop: "inner-w", ref: 346 },
  { what: "절 머리 표시", sel: ".rs-st .rs-sh > i", prop: "w", ref: 29 },
  { what: "표시 → 이름", sel: ".rs-st .rs-sh", prop: "gap", ref: 19 },
  { what: "절 이름", sel: ".rs-st .rs-sh > h2", prop: "font", ref: 19.6 },
  /* **두 가지로 재면 1px 이 벌어진다.** 글 왼쪽 잉크로 재면 49.7 이고
     표시 상자와 사이를 더하면 48.6 이다 — 레퍼런스의 표시가 제 상자
     안에서 1px 들어가 그려져 있기 때문이다. 우리가 정하는 값은 뒤엣것이라
     그 쪽을 적는다 */
  { what: "거드는 줄 들여쓰기", sel: ".rs-sh-s", prop: "ml", ref: 48.6 },
  { what: "거드는 줄", sel: ".rs-sh-s", prop: "font", ref: 13.5 },
  { what: "줄 높이", sel: ".rs-tile a", prop: "h", ref: 70 },
  { what: "줄 사이", sel: ".rs-tile", prop: "gap", ref: 8 },
  { what: "줄 안쪽 왼", sel: ".rs-tile a", prop: "pl", ref: 18 },
  { what: "배지", sel: ".rs-tile i", prop: "w", ref: 52 },
  { what: "배지 → 글", sel: ".rs-tile a", prop: "colgap", ref: 24 },
  { what: "카드 제목", sel: ".rs-tile b", prop: "font", ref: 16.5 },
  { what: "카드 세부", sel: ".rs-tile small", prop: "font", ref: 14.1 },
  { what: "꺾쇠 높이", sel: ".rs-tile em", prop: "h", ref: 15 },
];

async function main(): Promise<void> {
  assertFreshServer();
  /* **자리 목록을 주소로 열지 않는다.** 사람을 세우고 끝낸 응시를 베껴 와서
     제품이 그리는 그 쪽을 잰다 */
  const login0 = `zzr27${Date.now().toString().slice(-7)}`;
  const stu = await makeStudent(login0);
  const att = await cloneFinished(stu.id, "PRO");
  if (!att) throw new Error("베껴 올 끝난 응시가 없습니다");
  const browser = await chromium.launch();
  const gate = gateCreds();
  let bad = 0;
  for (const [tag, size, wants] of [
    ["Desktop 1440", { width: 1440, height: 900 }, DESK],
    ["Mobile 390", { width: 390, height: 844 }, MOB],
  ] as const) {
    const ctx = await browser.newContext({
      viewport: size, ...(gate ? { httpCredentials: gate } : {}) });
    const p = await login(ctx, login0, stu.pw);
    await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "networkidle" });
    console.log(`\n── ${tag} ──`);
    for (const w of wants) {
      const got = await p.evaluate(({ sel, prop }) => {
        const e = document.querySelector(sel) as HTMLElement | null;
        if (!e) return null;
        const r = e.getBoundingClientRect();
        const c = getComputedStyle(e);
        switch (prop) {
          case "w": return r.width;
          case "h": return r.height;
          case "inner-w":
            return r.width - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight);
          case "gap": return parseFloat(c.gap || c.columnGap || "0");
          case "colgap": return parseFloat(c.columnGap || "0");
          case "font": return parseFloat(c.fontSize);
          case "ml": return parseFloat(c.marginLeft);
          case "pl": return parseFloat(c.paddingLeft);
          case "pr": return parseFloat(c.paddingRight);
          case "radius": return parseFloat(c.borderTopLeftRadius);
          default: return null;
        }
      }, { sel: w.sel, prop: w.prop });
      const tol = Math.max(1, w.ref * 0.03);
      const ok = got !== null && Math.abs(got - w.ref) <= tol;
      if (!ok) bad += 1;
      console.log(`  ${ok ? "같다 " : "다르다"} ${w.what.padEnd(14)} `
        + `레퍼런스 ${String(w.ref).padStart(7)}  지금 ${got === null ? "없다" : got.toFixed(1)}`);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`\n벌어진 자리 ${bad}`);
  process.exit(bad ? 1 : 0);
}
void main();
