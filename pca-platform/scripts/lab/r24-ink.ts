/* 우리 글꼴이 같은 글자를 어떤 폭과 어떤 짙기로 그리는지 잰다.
   **목표 화면과 견주려면 자가 같아야 한다**: 목표 쪽은 올려 그린 그림이라
   가장자리가 번지고, 우리 쪽은 또렷하다. 그래서 폭은 그대로 견주되
   짙기는 굵기를 갈아 끼우며 재어 "굵기가 먹히는가" 만 본다. */
import { chromium } from "playwright";

const STACK =
  '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,-apple-system,sans-serif';

const WORDS = [
  "내 커리어", "현재 상태", "최근 변화", "구조·내구 해석", "기계공학",
  "지금 할 일", "CareerMatri", "2024.10.05", "결과 보기",
];

async function main() {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent("<canvas id=c width=1400 height=200></canvas>");
  const out = await p.evaluate(`(() => {
    const STACK = ${JSON.stringify(STACK)};
    const WORDS = ${JSON.stringify(WORDS)};
    const c = document.getElementById("c");
    const g = c.getContext("2d");
    const rows = [];
    for (const w of [400, 500, 600, 700]) {
      for (const s of WORDS) {
        g.fillStyle = "#fff"; g.fillRect(0, 0, 1400, 200);
        g.fillStyle = "#000";
        g.font = w + " 100px " + STACK;
        g.textBaseline = "alphabetic";
        g.fillText(s, 20, 140);
        const d = g.getImageData(0, 0, 1400, 200).data;
        let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, ink = 0;
        for (let y = 0; y < 200; y++) {
          for (let x = 0; x < 1400; x++) {
            const i = (y * 1400 + x) * 4;
            const l = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
            if (l < 150) {
              ink++;
              if (x < x0) x0 = x; if (x > x1) x1 = x;
              if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
        }
        const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
        rows.push({ w, s, bw, bh, d: ink / (bw * bh) });
      }
    }
    return rows;
  })()`);
  for (const r of out as any[]) {
    console.log(
      String(r.w).padEnd(5),
      r.s.padEnd(16),
      ("잉크 " + r.bw + "x" + r.bh).padEnd(16),
      "채움 " + r.d.toFixed(3),
    );
  }
  await b.close();
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
