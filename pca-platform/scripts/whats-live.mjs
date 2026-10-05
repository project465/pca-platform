/**
 * 지금 그 주소에 **무엇이 떠 있는가.**
 *
 * 도메인이 열린다는 것과 우리 플랫폼이 운영 배포돼 있다는 것은 다른
 * 말이다. 한 번 그 둘을 섞어서 틀렸다. 이 스크립트는 **열어 보고 적는다.**
 *
 * 묻는 것 아홉 가지가 그대로 줄로 나온다: DNS 가 어디를 가리키는가 ·
 * 무엇이 응답하는가 · 정적인가 Next 앱인가 · 우리 코드인가 · 인증서는
 * 정상인가 · www 와 루트 중 어느 쪽이 정규인가.
 *
 * **의존성이 없다.** node 만 있으면 어디서나 돈다. 개발 컨테이너는 바깥
 * 망이 막혀 있으므로 **운영 망이 있는 자리에서 돌린다.**
 *
 *   node scripts/whats-live.mjs
 *   node scripts/whats-live.mjs careermatri.com careermatri.co.kr
 */
import { resolve4, resolveCname } from "node:dns/promises";
import { request } from "node:https";
import { connect } from "node:tls";

const HOSTS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["careermatri.com", "www.careermatri.com", "app.careermatri.com"];

/** 우리 플랫폼이면 반드시 있는 자리들 */
const PROBES = [
  { path: "/api/health", means: "플랫폼 API (Next.js 앱)" },
  { path: "/pricing", means: "가격표" },
  { path: "/login", means: "로그인" },
  { path: "/product", means: "상품 쪽 (Phase 2.2)" },
  { path: "/support", means: "지원 화면 (Phase 2.2)" },
  { path: "/pca/v2.html", means: "플랫폼이 내주는 정적 결과지 엔진" },
];

function head(host, path = "/", followHost = null) {
  return new Promise((done) => {
    const req = request(
      { host: followHost ?? host, servername: host, path, method: "GET",
        headers: { host, "user-agent": "careermatri-whats-live" },
        timeout: 10000 },
      (res) => {
        let body = "";
        res.on("data", (c) => { if (body.length < 20000) body += c; });
        res.on("end", () => done({
          status: res.statusCode,
          headers: res.headers,
          body,
        }));
      },
    );
    req.on("timeout", () => { req.destroy(); done(null); });
    req.on("error", (e) => done({ error: e.code ?? e.message }));
    req.end();
  });
}

function cert(host) {
  return new Promise((done) => {
    const s = connect({ host, port: 443, servername: host, timeout: 10000 }, () => {
      const c = s.getPeerCertificate();
      done({
        issuer: c.issuer?.O ?? c.issuer?.CN ?? "?",
        subject: c.subject?.CN ?? "?",
        alt: (c.subjectaltname ?? "").replace(/DNS:/g, ""),
        from: c.valid_from, to: c.valid_to,
        authorized: s.authorized, why: s.authorizationError ?? null,
      });
      s.end();
    });
    s.on("timeout", () => { s.destroy(); done(null); });
    s.on("error", (e) => done({ error: e.code ?? e.message }));
  });
}

/** 응답 한 장에서 무엇을 만든 것인지 읽는다 */
function fingerprint(r) {
  if (!r || r.error) return [];
  const h = r.headers ?? {};
  const out = [];
  const say = (k) => { if (!out.includes(k)) out.push(k); };
  const server = String(h.server ?? "");
  if (/vercel/i.test(server) || h["x-vercel-id"]) say("Vercel");
  if (/github\.com|GitHub\.com/i.test(server)) say("GitHub Pages");
  if (/cloudflare/i.test(server)) say("Cloudflare 앞단");
  if (/netlify/i.test(server) || h["x-nf-request-id"]) say("Netlify");
  if (/imweb/i.test(server) || /imweb/i.test(JSON.stringify(h))) say("아임웹");
  if (h["x-powered-by"]) say(`x-powered-by: ${h["x-powered-by"]}`);
  if (h["x-nextjs-cache"] || h["x-nextjs-prerender"]) say("Next.js (헤더)");
  const b = r.body ?? "";
  if (b.includes("__NEXT_DATA__") || b.includes("/_next/static")) say("Next.js (본문)");
  if (b.includes("PCA · 진로직무진단")) say("정적 PCA 엔진 (gh-pages)");
  if (b.includes("CareerMatri") || b.includes("careermatri")) say("CareerMatri 글자 있음");
  if (/wordpress|wp-content/i.test(b)) say("WordPress");
  if (server) say(`server: ${server}`);
  return out;
}

const log = (...a) => console.log(...a);

/**
 * **이 자리가 바깥에 바로 닿는가.**
 *
 * 개발 컨테이너는 프록시를 거치고, 그 프록시는 자기 인증서로 TLS 를 다시
 * 맺는다. 그래서 인증서 발급자가 바깥 인증기관이 아니라 프록시 이름으로
 * 나오고, 허락되지 않은 호스트에는 몸통 없는 403 을 돌려준다. 그것을
 * 도메인의 대답으로 읽으면 **"careermatri.com 이 403 을 낸다"** 는 거짓이
 * 적힌다. 실제로 한 번 그랬다.
 */
const PROXY_ISSUERS = /anthropic|mitm|proxy|zscaler|netskope|bluecoat|forcepoint/i;
let proxySeen = false;

function proxyWarn(c) {
  if (!c || c.error || !c.issuer) return false;
  if (!PROXY_ISSUERS.test(c.issuer)) return false;
  proxySeen = true;
  return true;
}

for (const host of HOSTS) {
  log(`\n━━━ ${host} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  /* 1. DNS */
  let a = [], cn = [];
  try { a = await resolve4(host); } catch (e) { a = [`(없음: ${e.code})`]; }
  try { cn = await resolveCname(host); } catch { cn = []; }
  log(`DNS A      ${a.join(" ")}`);
  if (cn.length) log(`DNS CNAME  ${cn.join(" ")}`);
  if (String(a[0]).startsWith("(")) { log("닿을 주소가 없다. 다음 이름으로."); continue; }

  /* 2. 인증서 */
  const c = await cert(host);
  if (!c) log("인증서     응답 없음 (시간 초과)");
  else if (c.error) log(`인증서     ${c.error}`);
  else {
    if (proxyWarn(c)) {
      log(`인증서     **이 응답은 도메인이 아니라 중간 프록시가 만든 것이다.**`);
      log(`           발급자가 ${c.issuer} 다. 바깥 망이 있는 자리에서 다시 돌린다`);
    }
    log(`인증서     ${c.authorized ? "정상" : `**검증 실패: ${c.why}**`}`);
    log(`           발급 ${c.issuer} · 이름 ${c.subject}`);
    log(`           감싸는 이름 ${c.alt}`);
    log(`           ${c.from} ~ ${c.to}`);
  }

  /* 3. 루트가 무엇을 돌려주는가 */
  const root = await head(host, "/");
  if (!root) { log("HTTPS      응답 없음 (시간 초과)"); continue; }
  if (root.error) { log(`HTTPS      ${root.error}`); continue; }
  log(`HTTPS /    ${root.status}` +
    (root.headers.location ? ` → ${root.headers.location}` : ""));
  /* **프록시가 만든 몸통에서 정체를 읽지 않는다.** 프록시의 403 에도
     호스트 이름이 적혀 있어서 "CareerMatri 글자 있음" 이 나온다 */
  if (!proxySeen) {
    const fp = fingerprint(root);
    if (fp.length) log(`정체       ${fp.join(" · ")}`);
    const title = (root.body.match(/<title[^>]*>([^<]*)</i) ?? [])[1];
    if (title) log(`제목       ${title.trim()}`);
  } else {
    log("정체       읽지 않는다 (프록시가 만든 몸통이다)");
  }

  /* 4. 우리 플랫폼의 자리들이 있는가 */
  log(proxySeen
    ? "우리 플랫폼 자리: (프록시가 전부 막으므로 아래는 뜻이 없다)"
    : "우리 플랫폼 자리:");
  for (const p of PROBES) {
    const r = await head(host, p.path);
    const s = !r ? "시간 초과" : r.error ? r.error : String(r.status);
    const hit = r && !r.error && r.status < 400;
    log(`  ${hit ? "있음" : "없음"}  ${p.path.padEnd(16)} ${s.padEnd(12)} ${p.means}`);
  }
}

if (proxySeen || process.env.HTTPS_PROXY || process.env.https_proxy) {
  log(`
━━━ **이 자리에서 나온 값을 믿지 않는다** ━━━━━━━━━━━━
중간 프록시를 거쳤다. 위의 상태 코드와 인증서는 프록시의 것이고 도메인의
것이 아니다. 바깥 망이 있는 자리(노트북·운영 서버)에서 그대로 다시 돌린다:

  node scripts/whats-live.mjs`);
}

log(`
━━━ 읽는 법 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
· /api/health 와 /login 과 /pricing 이 **셋 다 200** 이면 우리 플랫폼이다
· 셋 다 404 면 다른 사이트다. 도메인이 열린다는 것과 우리 것이 떠 있다는
  것은 다른 말이다
· /product 와 /support 는 Phase 2.2 에서 생겼다. 이 둘이 없고 /login 만
  있으면 **옛 판이 떠 있는 것**이다
· www 와 루트 가운데 한쪽이 30x 로 다른 쪽을 가리켜야 정규 주소가 하나다.
  둘 다 200 이면 같은 내용이 두 주소에 있는 것이고, 검색과 쿠키가 갈린다`);
