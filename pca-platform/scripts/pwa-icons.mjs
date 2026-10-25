/**
 * 홈 화면 아이콘을 상표 한 벌(`public/brand/careermatri/mark.svg`)에서 뽑는다.
 * **손으로 그린 아이콘을 따로 두지 않는다**: 상표를 고친 날 아이콘만 옛것으로
 * 남는다. 상표를 고치면 `npm run pwa:icons` 를 다시 돌린다.
 *
 *   app-192 · app-512        둥근 네모 그대로(브라우저가 그대로 띄우는 자리)
 *   app-maskable-512          파란 바탕을 끝까지 채우고 상표를 그대로 얹는다. M 이 가운데 34% 안이라
 *                             (안드로이드가 원·물방울로 잘라 쓴다. 잘려도 M 이 남는다)
 *   apple-touch-180           maskable 과 같은 그림(아이폰이 제 둥글기를 씌운다)
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";

const DIR = "public/brand/careermatri";
const mark = readFileSync(`${DIR}/mark.svg`);
const BLUE = "#2F6BFF";

async function plain(size) {
  await sharp(mark, { density: 512 }).resize(size, size).png().toFile(`${DIR}/app-${size}.png`);
}
async function fullBleed(size, out) {
  const inner = size; // 상표의 M 이 가운데 34% 안에 있어 원으로 잘라도(안전 영역 80%) 남는다
  const m = await sharp(mark, { density: 512 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BLUE } })
    .composite([{ input: m, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }])
    .png().toFile(`${DIR}/${out}`);
}
await plain(192);
await plain(512);
await fullBleed(512, "app-maskable-512.png");
await fullBleed(180, "apple-touch-180.png");
console.log("아이콘 넷을 만들었다:", DIR);
