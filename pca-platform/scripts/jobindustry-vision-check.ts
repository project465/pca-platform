/**
 * 통이미지 공고 읽기 시험(`npm run jobindustry:vision`). 네트워크 · DB · Claude 없이 돈다.
 *
 * - 본문 그림 주소는 잡인더스트리 · 아임웹의 https 그림만, 같은 것은 한 번
 * - 글자가 거의 없고 그림이 있을 때만 그림 공고로 본다
 * - Claude 열쇠가 없거나 `JOBINDUSTRY_VISION=off` 면 읽지 않는다. 한 번에 읽는 몫은 기본 10
 */
import { imagesOf, parseView } from "../src/lib/jobs/jobindustry-parse";
import { needsVision, visionEnabled, visionMax } from "../src/lib/jobs/jobindustry-vision";

let bad = 0;
function check(name: string, ok: boolean, got?: unknown) {
  console.log(`  ${ok ? "통과" : "걸림"}  ${name}${ok ? "" : ` — ${JSON.stringify(got)}`}`);
  if (!ok) bad += 1;
}

const AREA = `
  <p><img src="https://cdn.imweb.me/upload/S2024/abc.png" alt=""></p>
  <p><img src="https://cdn.imweb.me/upload/S2024/abc.png"></p>
  <img src='/upload/local.jpg'>
  <img src="http://cdn.imweb.me/plain.png">
  <img src="https://evil.example.com/x.png">
  <img data-src="https://cdn.imweb.me/lazy.png">
  <img src="https://cdn.imweb.me/a.png?w=800&amp;h=600">`;
const imgs = imagesOf(AREA);
check("아임웹 · 잡인더스트리 https 그림만(늦게 불러오는 data-src 포함), 같은 것은 한 번",
  JSON.stringify(imgs) === JSON.stringify([
    "https://cdn.imweb.me/upload/S2024/abc.png",
    "https://www.jobindustry.co.kr/upload/local.jpg",
    "https://cdn.imweb.me/lazy.png",
    "https://cdn.imweb.me/a.png?w=800&h=600",
  ]), imgs);

const VIEW = `<html><head><meta property="og:title" content="재료 연구원 채용 : 기업 R&amp;D" /></head><body>
<div class="board_txt_area"><p>아래 공고를 확인해 주세요.</p><p><img src="https://cdn.imweb.me/upload/p.jpg"></p></div></body></html>`;
const v = parseView(VIEW);
check("상세에서 그림 주소를 함께 읽는다", v.images.length === 1 && v.images[0] === "https://cdn.imweb.me/upload/p.jpg", v);
check("글이 거의 없고 그림이 있으면 그림 공고", needsVision(v.body, v.images), v.body);
check("그림이 없으면 그림 공고가 아니다", !needsVision("", []));
check("글이 넉넉하면 그림이 있어도 읽지 않는다", !needsVision("자격 요건과 우대 사항 ".repeat(30), ["https://cdn.imweb.me/x.png"]));

const keep = { ai: process.env.ANTHROPIC_API_KEY, on: process.env.JOBINDUSTRY_VISION, max: process.env.JOBINDUSTRY_VISION_MAX };
delete process.env.ANTHROPIC_API_KEY;
check("Claude 열쇠가 없으면 읽지 않는다", !visionEnabled());
process.env.ANTHROPIC_API_KEY = "시험용";
process.env.JOBINDUSTRY_VISION = "off";
check("JOBINDUSTRY_VISION=off 면 읽지 않는다", !visionEnabled());
delete process.env.JOBINDUSTRY_VISION;
check("열쇠가 있으면 읽는다", visionEnabled());
delete process.env.JOBINDUSTRY_VISION_MAX;
check("한 번에 읽는 몫은 기본 10", visionMax() === 10, visionMax());
process.env.JOBINDUSTRY_VISION_MAX = "3";
check("몫은 변수로 바꾼다", visionMax() === 3, visionMax());
for (const [k, val] of [["ANTHROPIC_API_KEY", keep.ai], ["JOBINDUSTRY_VISION", keep.on], ["JOBINDUSTRY_VISION_MAX", keep.max]] as const) {
  if (val === undefined) delete process.env[k]; else process.env[k] = val;
}

console.log(`\n  확인 10가지 — 걸림 ${bad}`);
process.exit(bad ? 1 : 0);
