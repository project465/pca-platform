/**
 * 앱이 실제로 서 있는 주소.
 *
 * **소개 사이트 도메인과 앱 도메인은 다른 물건이다.**
 *
 * ```
 * careermatri.com      소개·마케팅 사이트
 * careermatri.co.kr    한국 소개 사이트 (살 수도 있고 안 살 수도 있다)
 * app.careermatri.com  CareerMatri 플랫폼 — 손님이 가입하고 결제하고 응시하는 자리
 * ```
 *
 * 플랫폼은 전 세계 하나다(설계 원칙 5). KR 과 GLOBAL 은 **호스트로
 * 갈리지 않고** `market`·`locale` 로 갈린다. 그래서 시장마다 앱 도메인을
 * 따로 두지 않고, 두 시장이 같은 한 주소를 본다.
 *
 * **정본은 `PLATFORM_URL` 하나다.** 메일 링크·결제 콜백·결과지 주소가
 * 이미 그 값을 쓰고(`urls.ts`), 런칭 준비 화면도 같은 값을 본다. 두
 * 곳에서 따로 정하면 어느 날 화면은 초록인데 결제를 끝낸 사람이 빈
 * 도메인에 떨어진다.
 */
export type AppDomain =
  | { ok: true; url: string; host: string }
  | { ok: false; url: string | null; reason: string };

/**
 * `PLATFORM_URL` 을 읽어 앱 주소를 돌려준다. 네트워크를 쓰지 않는다.
 *
 * 거절하는 것 넷이다: 비어 있음 · `https` 가 아님 · 주소 꼴이 아님 ·
 * 바깥에서 못 여는 자리(`localhost` · 사설 주소 · `staging`). **공개 전
 * 배포본의 주소를 운영 준비로 세지 않는다**: 그 주소는 손님이 못 연다.
 */
export function appDomain(): AppDomain {
  const raw = (process.env.PLATFORM_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) {
    return { ok: false, url: null, reason: "PLATFORM_URL 이 비어 있습니다." };
  }
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, url: raw, reason: `PLATFORM_URL 이 주소 꼴이 아닙니다: ${raw}` };
  }
  if (u.protocol !== "https:") {
    return { ok: false, url: raw, reason: `PLATFORM_URL 이 https 가 아닙니다: ${u.protocol}//` };
  }
  if (/^(localhost|127\.|0\.|10\.|192\.168\.|\[::1\])/i.test(u.hostname)
      || /\.local$/i.test(u.hostname)) {
    return { ok: false, url: raw, reason: `${u.hostname} 는 바깥에서 열리지 않습니다.` };
  }
  if (/staging/i.test(u.hostname)) {
    return { ok: false, url: raw, reason: `${u.hostname} 는 공개 전 배포본입니다.` };
  }
  return { ok: true, url: `${u.protocol}//${u.host}`, host: u.host };
}

export type AppProbe = {
  /** 두드린 주소 */
  url: string;
  /** `null` 은 **아직 모른다**는 뜻이다. 거짓과 섞지 않는다 */
  ok: boolean | null;
  status: number | null;
  detail: string;
};

/**
 * 이 자리가 바깥 인터넷에 바로 닿는가.
 *
 * **개발 컨테이너는 프록시를 거친다.** 그 프록시는 허락되지 않은
 * 호스트에 몸통 없는 403 을 돌려주는데, 그것을 도메인의 대답으로 읽으면
 * "app.careermatri.com 이 403 을 낸다" 는 거짓이 적힌다
 * (`domains-verify.ts` 가 같은 자리에서 한 번 겪었다).
 */
const VIA_PROXY = Boolean(process.env.HTTPS_PROXY || process.env.https_proxy);

let cached: { at: number; probe: AppProbe } | null = null;
const TTL = 5 * 60_000;

/**
 * 앱 주소를 실제로 열어 본다.
 *
 * `/api/health` 는 공개 전 자물쇠에서도 빠져 있는 유일한 길이고, DB 까지
 * 물어본 뒤에 200 을 낸다. 그래서 이 한 번으로 **DNS · TLS · 인증서 ·
 * 앱 · DB** 가 한 줄에 선다. 인증서가 틀어지면 `fetch` 가 던지므로 따로
 * 검사하지 않는다.
 *
 * **못 열었다고 거짓을 적지 않는다**: 시간이 넘거나 프록시가 막으면
 * `ok: null`(모름)이다. 화면을 여는 것만으로 밖에 요청이 나가므로 5분
 * 동안 기억한다.
 */
export async function probeAppDomain(timeoutMs = 5000): Promise<AppProbe> {
  const d = appDomain();
  if (!d.ok) return { url: d.url ?? "", ok: false, status: null, detail: d.reason };
  if (cached && Date.now() - cached.at < TTL && cached.probe.url === d.url) {
    return cached.probe;
  }

  const url = `${d.url}/api/health`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const began = Date.now();
  let probe: AppProbe;
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    const body = await r.text().catch(() => "");
    const ms = Date.now() - began;
    const blocked = VIA_PROXY && (r.status === 403 || r.status === 407)
      && body.length < 200 && !r.headers.get("server");
    probe = blocked
      ? { url: d.url, ok: null, status: null,
        detail: "이 자리에서 바깥으로 못 나갑니다(프록시). 밖에서 열어 확인하십시오." }
      : r.ok
        ? { url: d.url, ok: true, status: r.status,
          detail: `${d.host} 가 ${ms}ms 만에 ${r.status} 를 냈습니다. DNS·HTTPS·인증서·앱·DB 가 한 줄로 섭니다.` }
        : { url: d.url, ok: false, status: r.status,
          detail: `${d.host}/api/health 가 ${r.status} 를 냈습니다.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    probe = /abort/i.test(msg)
      ? { url: d.url, ok: null, status: null, detail: `${d.host} 가 ${timeoutMs}ms 안에 답하지 않았습니다.` }
      : { url: d.url, ok: false, status: null, detail: `${d.host} 에 닿지 못했습니다: ${msg}` };
  } finally {
    clearTimeout(t);
  }
  cached = { at: Date.now(), probe };
  return probe;
}

/** 고친 직후에 옛 답을 보여 주지 않으려고 비운다 */
export function forgetAppProbe(): void {
  cached = null;
}

/**
 * 이 주소가 **오래 가는 주소인가.**
 *
 * 메일 링크·결제 콜백은 받는 사람이 **다른 날** 연다. 그래서 지금 열리는
 * 것으로는 모자라고, **그때도 그 자리에 있어야 한다.**
 *
 * 오래 가지 않는 자리가 넷이다.
 *
 *   localhost·사설 주소     밖에서 아예 안 열린다
 *   staging 호스트          공개 전 배포본. 손님에게 보낼 자리가 아니다
 *   `*.up.railway.app`      **관리형 플랫폼이 붙여 주는 임시 주소.**
 *                           서비스를 다시 만들거나 도메인을 붙이면 바뀐다.
 *                           바뀐 뒤에 열린 메일 링크는 아무 데도 닿지 않고,
 *                           그 메일은 되돌릴 수 없다
 *   `*.vercel.app` 미리보기 커밋마다 새로 생긴다
 *
 * `appDomain()` 이 앞의 둘을 막는다. 임시 주소는 **막지 않고 이름을
 * 돌려준다**: 도메인을 붙이기 전까지는 그 주소로 띄워 보는 것이 맞고,
 * 그 상태로 손님에게 메일을 보내지 않는 것이 요점이다.
 */
export function ephemeralHost(url: string | null | undefined): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  let host: string;
  try { host = new URL(raw).hostname; } catch { return null; }
  if (/\.up\.railway\.app$/i.test(host)) {
    return "Railway 가 붙여 주는 임시 주소입니다. 도메인을 붙이거나 서비스를 " +
      "다시 만들면 바뀌고, 그 뒤에 열린 메일 링크는 아무 데도 닿지 않습니다.";
  }
  if (/\.vercel\.app$/i.test(host)) return "커밋마다 새로 생기는 미리보기 주소입니다.";
  if (/\.onrender\.com$/i.test(host) || /\.fly\.dev$/i.test(host)) {
    return "관리형 플랫폼이 붙여 주는 임시 주소입니다.";
  }
  return null;
}
