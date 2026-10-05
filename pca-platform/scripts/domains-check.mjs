/**
 * 코드가 가리키는 주소가 우리 것인지 본다.
 *
 * **DNS 가 뜬다고 남의 것은 아니고, 안 뜬다고 빈 것도 아니다.** 등록만 해
 * 두고 레코드를 안 건 도메인은 조용하다. 그래서 이 스크립트가 말하는 것은
 * 딱 하나다. "지금 누군가 이 주소로 서버를 띄워 두었는가".
 *
 * **응답이 온다고 남의 것이라고 적지 않는다.** 한 번 그렇게 적었다가
 * 틀렸다: `careermatri.com` 에 모르는 IP 가 응답한다는 것만 보고 제3자
 * 소유라고 문서에 남겼는데, 그 도메인은 우리 것이었다. 사 둔 도메인을
 * 등록대행자의 주차 페이지나 CDN 에 걸어 두면 모르는 IP 가 응답한다.
 *
 * 소유는 **소유자가 확인해 준다**(`site_configs.ownership`). 이 스크립트가
 * 할 수 있는 말은 "지금 그 주소에 무엇이 떠 있다" 까지다. 배포한 뒤에
 * 실제로 우리 운영이 떠 있는지는 `npm run domains:verify` 가 본다.
 *
 *   node scripts/domains-check.mjs
 */
import { lookup } from "node:dns/promises";

/** 코드가 실제로 가리키는 주소. marketing/src/content/*.ts 와 맞춰 둔다. */
const USED = [
  { host: "careermatri.com", why: "인터내셔널 사이트 도메인 (global.ts)" },
  { host: "app.careermatri.com", why: "플랫폼 — 네 사이트의 '시작하기' 가 모두 여기로 간다" },
  { host: "careermatri.co.kr", why: "한국 사이트 도메인 (kr.ts)" },
];

/** 아직 안 쓰지만 같이 잡아 둘 만한 이름. */
const CANDIDATES = [
  "careermatri.kr", "careermatri.io", "careermatri.net",
  "careermatriplus.co.kr", "careermatri.app",
];

async function probe(host) {
  try {
    const { address } = await lookup(host);
    return { host, live: true, address };
  } catch (e) {
    return { host, live: false, code: e.code ?? "ENOTFOUND" };
  }
}

const used = await Promise.all(USED.map((u) => probe(u.host).then((r) => ({ ...r, why: u.why }))));
const cand = await Promise.all(CANDIDATES.map(probe));

console.log("── 코드가 가리키는 주소 ──────────────────────────");
let bad = 0;
for (const r of used) {
  if (r.live) {
    bad++;
    console.log(`  남의 서버가 응답함  ${r.host.padEnd(16)} → ${r.address}`);
    console.log(`      ${r.why}`);
  } else {
    console.log(`  응답 없음           ${r.host.padEnd(16)} (${r.code})`);
    console.log(`      ${r.why}`);
  }
}

console.log("\n── 같이 살펴본 이름 ────────────────────────────");
for (const r of cand) {
  console.log(r.live
    ? `  쓰이는 중   ${r.host.padEnd(16)} → ${r.address}`
    : `  조용함      ${r.host.padEnd(16)} (등록 여부는 WHOIS 로 확인할 것)`);
}

console.log(
  bad
    ? `\n${bad}개 주소에 지금 무언가 떠 있다. **그것이 누구 것인지는 이 조회로\n` +
      "알 수 없다**: 우리가 사 둔 도메인의 주차 페이지일 수도 있고 남의\n" +
      "서버일 수도 있다. 소유는 site_configs.ownership 에 적고, 우리 운영이\n" +
      "실제로 떠 있는지는 npm run domains:verify 로 본다."
    : "\n코드가 가리키는 주소에 지금 떠 있는 것은 없다.",
);
/* **뜬다는 것만으로 실패로 세지 않는다.** 우리 것이 떠 있는 날에도
   빨갛게 되면 이 검사를 아무도 안 보게 된다 */
process.exit(0);
