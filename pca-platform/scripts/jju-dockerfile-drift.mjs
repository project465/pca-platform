/**
 * 시연 이미지(`deploy/Dockerfile.jju-demo`)가 운영 `Dockerfile` 에서 얼마나
 * 벗어났는가. **표시한 덩이 밖은 한 글자도 다르면 안 된다.**
 *
 *   node scripts/jju-dockerfile-drift.mjs          # 센다
 */
import { readFileSync } from "node:fs";
const MAIN = "Dockerfile", DEMO = "deploy/Dockerfile.jju-demo";
const strip = (t) => {
  const out = []; let inBlock = false, blocks = 0, lines = 0;
  for (const l of t.split("\n")) {
    if (l === "# >>> JJU-DEMO") { inBlock = true; blocks++; continue; }
    if (l === "# <<< JJU-DEMO") { inBlock = false; continue; }
    if (inBlock) { lines++; continue; }
    out.push(l);
  }
  return { body: out.join("\n"), blocks, lines };
};
const main = readFileSync(MAIN, "utf8");
const demo = strip(readFileSync(DEMO, "utf8"));
const mainBody = main;
const same = demo.body === mainBody;
console.log(`표시한 덩이 ${demo.blocks}개 · 더한 줄 ${demo.lines}줄 · 그 밖 ${same ? "운영과 같다" : "운영과 다르다"}`);
if (!same) {
  const a = mainBody.split("\n"), b = demo.body.split("\n");
  for (let k = 0; k < Math.max(a.length, b.length); k++) if (a[k] !== b[k]) { console.log(`  첫 차이 ${k + 1}줄\n  운영: ${a[k]}\n  시연: ${b[k]}`); break; }
  process.exit(1);
}
console.log("운영 Dockerfile 이 바뀌면 그 차이를 시연 쪽에 손으로 옮긴다(자동 병합하지 않는다).");
