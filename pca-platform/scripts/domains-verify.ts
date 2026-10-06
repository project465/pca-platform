/**
 * 도메인을 **실제로 열어 본다.**
 *
 * `domains:audit` 은 저장소 안의 철자를 보고, `domains:check` 는 지금 그
 * 주소에 누가 응답하는지를 본다. 여기는 배포한 뒤에 돌리는 검사다:
 * 우리 운영을 가리키는가, 인증서가 정상인가, `www` 가 넘어오는가,
 * 정규 주소가 맞는가.
 *
 * **소유와 준비는 다른 문제다.** 도메인이 우리 것이라는 말은 소유자가
 * 해 주는 것이고(`site_configs.ownership`), 켤 수 있는지는 열어 봐야
 * 안다. 소유가 확인됐다고 READY 로 적으면, DNS 를 아직 안 돌린 날
 * 런칭 화면이 초록불인 채로 아무도 못 들어온다.
 *
 *   DATABASE_URL=... npx tsx scripts/domains-verify.ts
 *   DOMAINS_VERIFY_TIMEOUT=8000 npx tsx scripts/domains-verify.ts
 */
import { listSites } from "../src/lib/sites";
import { appDomain, probeAppDomain, forgetAppProbe } from "../src/lib/app-domain";

const TIMEOUT = Number(process.env.DOMAINS_VERIFY_TIMEOUT ?? 8000);

/**
 * 이 자리가 바깥 인터넷에 바로 닿는가.
 *
 * **개발 컨테이너는 프록시를 거친다.** 그 프록시는 허락되지 않은 호스트에
 * 몸통 없는 403 을 돌려주는데, 그것을 도메인의 대답으로 읽으면
 * "careermatri.com 이 403 을 낸다" 는 거짓이 적힌다. 실제로 한 번
 * 그랬다. 프록시가 켜져 있으면 4xx 를 **모름**으로 둔다.
 */
const VIA_PROXY = Boolean(process.env.HTTPS_PROXY || process.env.https_proxy);

export type Probe = {
  domain: string;
  canonical: string | null;
  ownership: string;
  checks: { name: string; ok: boolean | null; detail: string }[];
};

/** `null` 은 **아직 모른다**는 뜻이다. 거짓과 섞지 않는다 */
async function head(url: string): Promise<{
  status: number; location: string | null; proxied: boolean;
} | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { method: "GET", redirect: "manual", signal: ctrl.signal });
    const body = await r.text().catch(() => "");
    /* 프록시가 막은 대답은 몸통이 거의 없고 서버 이름도 없다 */
    const proxied = VIA_PROXY && (r.status === 403 || r.status === 407)
      && body.length < 200 && !r.headers.get("server");
    return { status: r.status, location: r.headers.get("location"), proxied };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function probe(domain: string, canonical: string | null, ownership: string):
  Promise<Probe> {
  const checks: Probe["checks"] = [];
  const https = `https://${domain}`;

  const root = await head(https);
  checks.push({
    name: "HTTPS 가 응답한다",
    ok: root === null ? null : root.proxied ? null : root.status > 0,
    detail: root === null
      ? "닿지 않습니다. DNS 가 아직 운영을 가리키지 않거나 인증서가 없습니다"
      : root.proxied
        ? `HTTP ${root.status} — 이 컨테이너의 프록시가 막은 것으로 보입니다. ` +
          `운영 망에서 다시 돌립니다`
        : `HTTP ${root.status}`,
  });

  /* 인증서가 깨져 있으면 `fetch` 가 그 자리에서 터진다. 그래서 위 줄이
     곧 인증서 검사이기도 하다. **따로 'ok' 라고 적지 않는다** */

  const www = await head(`https://www.${domain}`);
  checks.push({
    name: "www 가 정규 주소로 넘어온다",
    ok: www === null || www.proxied ? null : (www.status >= 300 && www.status < 400
      && (www.location ?? "").replace(/\/$/, "") === (canonical ?? https).replace(/\/$/, "")),
    detail: www === null ? "닿지 않습니다"
      : www.proxied ? `HTTP ${www.status} — 프록시가 막은 것으로 보입니다`
        : `HTTP ${www.status}${www.location ? ` → ${www.location}` : ""}`,
  });

  checks.push({
    name: "정규 주소가 적혀 있다",
    ok: Boolean(canonical),
    detail: canonical ?? "site_configs.canonical_url 이 비어 있습니다",
  });

  checks.push({
    name: "소유가 확인됐다",
    ok: ownership === "confirmed",
    detail: ownership === "confirmed"
      ? "소유자가 확인해 주었습니다"
      : "아직 확인되지 않았습니다",
  });

  return { domain, canonical, ownership, checks };
}

async function main() {
  const sites = await listSites();
  if (VIA_PROXY) {
    console.log("이 자리는 프록시를 거칩니다. 바깥에서 오는 대답과 다를 수 "
      + "있으니, 배포한 뒤 운영 망에서 한 번 더 돌립니다.");
  }
  /**
   * **앱 도메인을 먼저 본다.**
   *
   * `site_configs` 에 있는 것은 소개 사이트 도메인이고, 손님이 가입하고
   * 결제하고 응시하는 자리는 `PLATFORM_URL` 이 가리키는 한 곳이다. 그
   * 주소가 안 열리면 소개 도메인이 전부 초록이어도 아무도 못 산다.
   */
  const app = appDomain();
  const appChecks: Probe["checks"] = [];
  if (!app.ok) {
    appChecks.push({ name: "PLATFORM_URL 이 밖에서 열리는 https 다", ok: false, detail: app.reason });
  } else {
    forgetAppProbe();
    const pr = await probeAppDomain(TIMEOUT);
    appChecks.push({ name: "PLATFORM_URL 이 밖에서 열리는 https 다", ok: true, detail: app.url });
    appChecks.push({
      name: "DNS · HTTPS · 인증서 · /api/health 200",
      ok: pr.ok, detail: pr.detail,
    });
  }
  const out: Probe[] = [{
    domain: app.ok ? `${app.host} (앱)` : "PLATFORM_URL (앱)",
    canonical: app.ok ? app.url : null,
    ownership: "n/a",
    checks: appChecks,
  }];

  const live = sites.filter((s) => s.active);
  for (const s of live) {
    out.push(await probe(s.domain, s.canonical_url, s.ownership));
  }

  let bad = 0, unknown = 0;
  for (const p of out) {
    console.log(`\n${p.domain}`);
    for (const c of p.checks) {
      const mark = c.ok === null ? "모름" : c.ok ? "OK  " : "실패";
      if (c.ok === false) bad++;
      if (c.ok === null) unknown++;
      console.log(`  ${mark} ${c.name}  (${c.detail})`);
    }
  }

  console.log(
    `\n${bad}개가 걸렸고 ${unknown}개는 아직 모른다.`
    + (unknown ? " 배포한 뒤에 다시 돌린다." : ""),
  );
  /* **모르는 것을 실패로 세지 않는다.** 배포 전에는 닿지 않는 것이
     정상이고, 그것을 실패로 두면 이 검사가 늘 빨갛다 */
  process.exit(bad ? 1 : 0);
}

if (process.argv[1]?.endsWith("domains-verify.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
