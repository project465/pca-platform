/**
 * 목표 화면의 자리와 우리 자리를 같은 자로 견준다(R23).
 *
 * **눈으로 재지 않는다.** 목표 화면 쪽은 `scripts/lab/ref-geom.py` 가
 * 화소로 재어 1440 짜리 창으로 옮긴 값이고, 이쪽은 **실제로 그려진**
 * 상자(`getBoundingClientRect`)와 계산된 활자다. 둘을 나란히 적는다.
 */
import { loadEnv, BASE, makeStudent, cloneFinished, login } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { query } from "../../src/lib/db";

/** 목표 화면에서 잰 값(1440 환산). `ref-geom.py` 의 셈이 출처다. */
const REF: Record<string, number> = {
  "띠 폭": 309,
  "띠 상표": 35,
  "띠 제품 이름": 26.3,
  "띠 전공": 18,
  "묶음 머리": 20,
  "줄 글자": 20.7,
  "줄 표시": 26,
  "줄 높이(pill)": 58,
  "줄 간격(pitch)": 54,
  "줄 글자 왼쪽(띠에서)": 93,
  "줄 표시 왼쪽(띠에서)": 40,
  "본문 왼쪽 여백": 38,
  "쪽 제목": 32.3,
  "쪽 메타": 18.2,
  "찾기 칸 너비": 289,
  "찾기 칸 높이": 58,
  "종 표시": 30,
  "계정 동그라미": 46,
  "계정 이름": 18.2,
  "Hero 너비": 1063,
  "Hero 높이": 329,
  "절 머리 표시": 40,
  "절 머리 글자": 28,
  "절 머리 사이": 29,
  "절 오른쪽 링크": 19.8,
  "절 거드는 줄": 19,
  "타일 너비": 348,
  "타일 높이": 108,
  "타일 사이": 12.6,
  "타일 배지": 80,
  "타일 왼쪽 여백": 25,
  "배지와 글 사이": 30,
  "타일 제목": 21.4,
  "타일 거드는 줄": 18.4,
};

async function main() {
  const who = `r23-${Date.now().toString(36)}`;
  const { id, pw } = await makeStudent(who);
  const att = await cloneFinished(id, "PRO");
  if (!att) throw new Error("끝낸 응시를 못 만들었다");
  await query(
    `INSERT INTO v3_experiences (user_id, core_code, kind, title, started_on, td_codes, decisions)
     VALUES ($1,'BIZ_CORE_V1','project','학생회 예산 배분 회의 정리','2025-09-01',
             ARRAY['TD01'], ARRAY['쓸 돈과 안 쓸 돈을 갈라 적었다'])`, [id]);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await login(c, who, pw);
  await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);

  const mine = (await p.evaluate(`(() => {
    const R = (s) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; };
    const F = (s) => { const e = document.querySelector(s); if (!e) return null;
      return parseFloat(getComputedStyle(e).fontSize); };
    const rail = R(".cm-rail"), navs = [...document.querySelectorAll("a.cm-nav")]
      .map(e => { const r = e.getBoundingClientRect(); return {y:r.y,h:r.height}; });
    const tiles = [...document.querySelectorAll("a.cm-tile")]
      .map(e => { const r = e.getBoundingClientRect(); return {x:r.x,w:r.width,h:r.height}; });
    const navIco = R("a.cm-nav > svg"), navTxt = R("a.cm-nav > span");
    const shIco = R(".cm-sh > svg"), sh = document.querySelector(".cm-sh");
    const shTxtX = sh ? (() => { const rg=document.createRange();
      const n=[...sh.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
      if(!n) return null; rg.selectNodeContents(n); return rg.getBoundingClientRect().x; })() : null;
    const ico = R(".cm-tile-ico"), ttl = R(".cm-tile-txt b");
    const o = {};
    o["띠 폭"] = rail && rail.w;
    o["띠 상표"] = R(".cm-rail-mark") && R(".cm-rail-mark").w;
    o["띠 제품 이름"] = F(".cm-rail-name > b");
    o["띠 전공"] = F(".cm-rail-name small");
    o["묶음 머리"] = F(".cm-group > h2");
    o["줄 글자"] = F("a.cm-nav");
    o["줄 표시"] = navIco && navIco.w;
    o["줄 높이(pill)"] = navs[0] && navs[0].h;
    o["줄 간격(pitch)"] = navs[1] && navs[0] ? navs[1].y - navs[0].y : null;
    o["줄 글자 왼쪽(띠에서)"] = navTxt && rail ? navTxt.x - rail.x : null;
    o["줄 표시 왼쪽(띠에서)"] = navIco && rail ? navIco.x - rail.x : null;
    const h1 = R(".cm-h1"), hero = R(".cm-hero");
    o["본문 왼쪽 여백"] = h1 && rail ? h1.x - (rail.x + rail.w) : null;
    o["쪽 제목"] = F(".cm-h1");
    o["쪽 메타"] = F(".cm-meta");
    const find = R(".cm-find");
    o["찾기 칸 너비"] = find && find.w;
    o["찾기 칸 높이"] = find && find.h;
    o["종 표시"] = R(".cm-utilrow .cm-util-bell > svg") && R(".cm-utilrow .cm-util-bell > svg").w;
    o["계정 동그라미"] = R(".cm-utilrow .cm-util-av") && R(".cm-utilrow .cm-util-av").w;
    o["계정 이름"] = F(".cm-utilrow .cm-util-me > b");
    o["Hero 너비"] = hero && hero.w;
    o["Hero 높이"] = hero && hero.h;
    o["절 머리 표시"] = shIco && shIco.w;
    o["절 머리 글자"] = F(".cm-sh");
    o["절 머리 사이"] = shIco && shTxtX ? shTxtX - (shIco.x + shIco.w) : null;
    o["절 오른쪽 링크"] = F(".cm-sh > a");
    o["절 거드는 줄"] = F(".cm-shsub");
    o["타일 너비"] = tiles[0] && tiles[0].w;
    o["타일 높이"] = tiles[0] && tiles[0].h;
    o["타일 사이"] = tiles[1] && tiles[0] ? tiles[1].x - (tiles[0].x + tiles[0].w) : null;
    o["타일 배지"] = ico && ico.w;
    o["타일 왼쪽 여백"] = ico && tiles[0] ? ico.x - tiles[0].x : null;
    o["배지와 글 사이"] = ico && ttl ? ttl.x - (ico.x + ico.w) : null;
    o["타일 제목"] = F(".cm-tile-txt b");
    o["타일 거드는 줄"] = F(".cm-tile-txt small");
    o["문서 높이"] = document.documentElement.scrollHeight;
    return o;
  })()`)) as Record<string, number | null>;

  let worst = 0;
  console.log("\n  자리                      목표     지금     차이");
  for (const k of Object.keys(REF)) {
    const got = mine[k];
    if (got == null) { console.log(`  ${k.padEnd(22)}  ${String(REF[k]).padStart(6)}   없음`); continue; }
    const d = got - REF[k];
    if (Math.abs(d) > Math.abs(worst)) worst = d;
    const mark = Math.abs(d) <= 2 ? "  " : Math.abs(d) <= 5 ? " ~" : " ✗";
    console.log(`  ${k.padEnd(22)}  ${REF[k].toFixed(1).padStart(6)}  ${got.toFixed(1).padStart(6)}  ${d >= 0 ? "+" : ""}${d.toFixed(1).padStart(6)}${mark}`);
  }
  console.log(`\n  문서 높이 ${mine["문서 높이"]} (창 900)\n`);
  await b.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
