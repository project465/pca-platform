/**
 * 코드가 가리키는 주소가 우리 것인지 본다.
 *
 * **DNS 가 뜬다고 남의 것은 아니고, 안 뜬다고 빈 것도 아니다.** 등록만 해
 * 두고 레코드를 안 건 도메인은 조용하다. 그래서 이 스크립트가 말하는 것은
 * 딱 하나다 — "지금 누군가 이 주소로 서버를 띄워 두었는가".
 *
 * 그것만으로 충분한 판정이 하나 있다. **우리가 아직 사지 않았는데 응답이
 * 온다면 그건 남의 서버다.** 그 상태로 배포하면 우리 사이트의 "시작하기"
 * 버튼이 남의 집으로 학생을 보낸다.
 *
 * 실제 소유 여부는 WHOIS 로 확인해야 하고, 이 컨테이너에서는 whois·rdap
 * 이 막혀 있다. 그래서 여기서는 DNS 만 본다.
 *
 *   node scripts/domains-check.mjs
 */
import { lookup } from "node:dns/promises";

/** 코드가 실제로 가리키는 주소. marketing/src/content/*.ts 와 맞춰 둔다. */
const USED = [
  { host: "metri.io", why: "인터내셔널 사이트 도메인 (global.ts)" },
  { host: "app.metri.io", why: "플랫폼 — 네 사이트의 '시작하기' 가 모두 여기로 간다" },
  { host: "metri.co.kr", why: "한국 사이트 도메인 (kr.ts)" },
];

/** 아직 안 쓰지만 같이 잡아 둘 만한 이름. */
const CANDIDATES = [
  "metri.kr", "metriplus.co.kr", "metriplus.kr", "metri.com", "metri.app", "metri.co",
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
    ? `\n${bad}개 주소에 이미 남이 있다. 그 주소로 배포하면 학생이 남의 집으로 간다.\n` +
      "무엇을 사고 무엇을 고쳐야 하는지는 docs/metri/20_domains.md."
    : "\n코드가 가리키는 주소 중 남이 쓰고 있는 것은 없다.",
);
process.exit(bad ? 1 : 0);
