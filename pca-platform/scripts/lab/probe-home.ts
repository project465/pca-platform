import { loadEnv, BASE, makeStudent, cloneFinished, login } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { query } from "../../src/lib/db";

async function main() {
  const who = `probe-${Date.now().toString(36)}`;
  const { id, pw } = await makeStudent(who);
  const att = await cloneFinished(id, "PRO");
  if (!att) throw new Error("no attempt");
  await query(
    `INSERT INTO v3_experiences (user_id, core_code, kind, title, started_on, td_codes, decisions)
     VALUES ($1,'BIZ_CORE_V1','project','학생회 예산 배분 회의 정리','2025-09-01',
             ARRAY['TD01'], ARRAY['쓸 돈과 안 쓸 돈을 갈라 적었다'])`, [id]);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await login(c, who, pw);
  await p.goto(`${BASE}/me`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  const out = await p.evaluate(`(() => {
    const rows = [
      [".cm-rail-name b", "띠 브랜드"],
      [".cm-group h2", "띠 묶음 머리"],
      [".cm-nav span", "띠 줄"],
      [".cm-h1", "쪽 제목"],
      [".cm-meta", "쪽 메타"],
      [".cm-hero-h", "Hero 머리"],
      [".cm-hero-why", "Hero 까닭"],
      [".cm-sh", "절 머리"],
      [".cm-shsub", "절 거드는 줄"],
      [".cm-tile-txt b", "영역 이름"],
      [".cm-tile-txt small", "영역 거드는 줄"],
      [".cm-feed-txt b", "기록 이름"],
      [".cm-feed-txt small", "기록 거드는 줄"],
      [".cm-btn", "단추"],
    ];
    const out = [];
    for (const r of rows) {
      const e = document.querySelector(r[0]);
      if (!e) { out.push(r[1] + ": 없음"); continue; }
      const st = getComputedStyle(e);
      out.push(r[1] + ": " + st.fontSize + " / w" + st.fontWeight
        + " / lh" + st.lineHeight);
    }
    // **표시의 크기도 함께 센다.** 활자만 재면 "글씨는 맞는데 그림이
    // 작다" 를 셈으로 가려낼 수 없다
    const boxes = [
      [".cm-sh > svg", "절 머리 표시"],
      [".cm-tile-ico", "영역 배지"],
      [".cm-tile-ico > svg", "영역 배지 글리프"],
      ["a.cm-tile", "영역 칸"],
      [".cm-feed-ico", "기록 표시"],
      [".cm-hero-art > svg", "Hero 그림"],
    ];
    for (const b of boxes) {
      const e = document.querySelector(b[0]);
      if (!e) { out.push(b[1] + ": 없음"); continue; }
      const r = e.getBoundingClientRect();
      out.push(b[1] + ": " + Math.round(r.width) + "x" + Math.round(r.height));
    }
    const mainEl = document.querySelector(".cm-main");
    if (mainEl) out.push("본문 폭: " + Math.round(mainEl.getBoundingClientRect().width));
    out.push("문서 높이: " + document.documentElement.scrollHeight + " (창 900)");
    const secs = [];
    for (const e of document.querySelectorAll(".cm-in > *")) secs.push(e.className || e.tagName);
    out.push("절: " + secs.join(" | "));
    return out.join("\\n");
  })()`);
  console.log(out);
  await b.close();
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
