/**
 * 운영 배포본을 밖에서 한 번 훑는다.
 *
 *   node scripts/prod-check.mjs                       # app.careermatri.com
 *   BASE=https://app.careermatri.com node scripts/prod-check.mjs
 *
 * **이 저장소의 코드를 보지 않는다.** 실제로 떠 있는 것만 두드려서, 코드가
 * 그렇게 짜여 있다는 것과 거기서 그렇게 돈다는 것을 가른다. `launch:check`
 * 는 앞엣것을 묻고 이것은 뒤엣것을 묻는다.
 *
 * **세션 컨테이너에서는 못 돌 수 있다.** 바깥으로 나가는 길이 막혀 있으면
 * CONNECT 가 403 으로 끊기는데, 그것은 운영이 죽었다는 뜻이 아니다. 그
 * 경우를 `프록시 막힘` 으로 따로 적는다: 모르는 것을 모른다고 적어야
 * 다음 사람이 엉뚱한 데를 고치지 않는다.
 */
import { lookup } from "node:dns/promises";
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "https://app.careermatri.com").replace(/\/$/, "");
const HOST = new URL(BASE).host;

/* 공개 쪽과 로그인 쪽을 나눠 둔다. 뒤엣것은 로그인 화면으로 가는 것이 정상이다 */
const PUBLIC = ["/start", "/pricing", "/product", "/login", "/signup",
  "/support", "/legal/terms", "/legal/privacy", "/legal/refund", "/sample"];
const PRIVATE = ["/my"];

/** 사업자 표시. 값은 운영 화면(`/admin/business`)이 들고 있으므로 라벨만 센다 */
const BIZ = ["상호", "대표자", "주소", "전화", "이메일", "사업자등록번호",
  "통신판매업 신고번호"];

const line = (s) => console.log("  " + s);

async function dns() {
  console.log("\n── DNS");
  for (const h of [HOST, "careermatri.com"]) {
    try {
      const { address, family } = await lookup(h);
      line(`${h.padEnd(22)} ${address} (IPv${family})`);
    } catch (e) {
      line(`${h.padEnd(22)} 못 찾음 — ${e.code ?? e.message}`);
    }
  }
}

async function main() {
  await dns();

  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });

  console.log("\n── HTTPS · 인증서 · 상태코드");
  let proxyBlocked = false;
  for (const path of [...PUBLIC, ...PRIVATE]) {
    const p = await ctx.newPage();
    let res = null, err = null;
    try {
      res = await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 25000 });
    } catch (e) { err = e; }
    if (!res) {
      proxyBlocked = true;
      line(`!!  ${path.padEnd(16)} 열리지 않음 — ${String(err?.message ?? "").split("\n")[0]}`);
      await p.close();
      continue;
    }
    const end = new URL(p.url());
    const code = res.status();
    const moved = end.pathname !== path ? ` → ${end.pathname}` : "";
    const sec = end.protocol === "https:" ? "https" : `!!${end.protocol}`;
    const m = await p.evaluate(() => ({
      c: document.documentElement.clientWidth,
      s: document.documentElement.scrollWidth,
    }));
    const over = m.s > m.c ? ` !!가로넘침 ${m.s}>${m.c}` : "";
    const html = await p.content();
    const biz = BIZ.filter((k) => html.includes(k)).length;
    const foot = html.includes("pfoot") ? "푸터O" : "푸터X";
    const bad5 = code >= 500 ? " !!5xx" : "";
    line(`${code} ${sec} ${path.padEnd(16)}${moved.padEnd(14)} ${foot} · 사업자라벨 ${biz}/7${over}${bad5}`);
    await p.close();
  }

  if (proxyBlocked) {
    console.log("\n  열리지 않은 쪽이 있다. 이 자리에서 바깥으로 못 나가는 것인지" +
      " 운영이 죽은 것인지는 **밖에서 한 번 더** 봐야 가른다.");
  }

  console.log("\n── 리디렉션");
  for (const [from, why] of [["http://" + HOST + "/start", "http → https"],
                             [BASE, "뿌리"]]) {
    const r = await ctx.request.get(from, { maxRedirects: 0 }).catch(() => null);
    line(`${why.padEnd(12)} ${r ? `${r.status()} ${r.headers()["location"] ?? ""}` : "열리지 않음"}`);
  }

  console.log("\n── 세션 쿠키 (로그인 쪽을 열었을 때)");
  const cookies = await ctx.cookies();
  if (!cookies.length) line("쿠키 없음");
  for (const c of cookies) {
    line(`${c.name} · httpOnly=${c.httpOnly} · secure=${c.secure} · sameSite=${c.sameSite}`);
  }

  console.log("\n── 헬스체크");
  const h = await ctx.request.get(`${BASE}/api/health`).catch(() => null);
  line(h ? `${h.status()} ${(await h.text()).slice(0, 160)}` : "열리지 않음");

  await br.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
