import { resolveTxt } from "node:dns/promises";

/**
 * 보내는 주소가 실제로 도착하는가.
 *
 * **브랜드 도메인과 같은지로 판단하지 않는다.** 전에는 `MAIL_FROM` 의
 * 도메인이 소개 사이트 도메인과 다르면 경고를 냈는데, 그 규칙이 재는
 * 것은 이름이 같은가일 뿐이다. 받는 쪽 메일 서버는 이름을 보지 않고
 * **그 도메인이 이 발신을 허락했는가**를 본다. 같은 브랜드 도메인이어도
 * SPF 가 없으면 스팸으로 떨어지고, 다른 도메인이어도 SPF·DKIM·DMARC 가
 * 서 있으면 들어간다.
 *
 * 그래서 판단을 DNS 로 옮겼다.
 *
 * ```
 * SPF    보내는 서버 목록. 도메인의 TXT 에 v=spf1 이 있는가
 * DMARC  SPF·DKIM 이 어긋났을 때의 처리. _dmarc.<도메인> 의 TXT
 * DKIM   보내는 쪽 서명. **여기서 조회하지 않는다**
 * ```
 *
 * **DKIM 을 조회하지 않는 것이 일부러다.** 셀렉터 이름을 대행사가 정해서
 * (`google._domainkey` · `work._domainkey` · 임의 문자열) 밖에서 찍어
 * 볼 수 없다. 없는 것을 '없다' 고 적으면 멀쩡한 설정을 틀렸다고 말하게
 * 된다. DKIM 은 한 통 보내 보고 받은 쪽 헤더에서 확인한다.
 */
export type MailDns = {
  domain: string;
  /** `null` 은 **아직 모른다**는 뜻이다. 거짓과 섞지 않는다 */
  spf: boolean | null;
  dmarc: boolean | null;
  /** DMARC 가 감시만 하는가(`p=none`). 틀렸다는 뜻은 아니다 */
  dmarcMonitorOnly: boolean;
  detail: string;
};

/** `MAIL_FROM` 에서 도메인만 꺼낸다. `이름 <주소>` 꼴도 받는다 */
export function mailFromDomain(): string | null {
  const raw = (process.env.MAIL_FROM ?? "").trim();
  const m = raw.match(/<([^>]+)>/);
  const addr = (m ? m[1] : raw).trim();
  const at = addr.lastIndexOf("@");
  if (at < 0) return null;
  const d = addr.slice(at + 1).trim().toLowerCase();
  return d || null;
}

let cached: { at: number; dns: MailDns } | null = null;
const TTL = 10 * 60_000;

async function txt(name: string, timeoutMs: number): Promise<string[] | null> {
  try {
    const rows = await Promise.race([
      resolveTxt(name),
      new Promise<never>((_, bad) =>
        setTimeout(() => bad(new Error("시간 초과")), timeoutMs)),
    ]);
    return rows.map((r) => r.join(""));
  } catch (e) {
    /* 줄이 없는 것과 못 물어본 것을 가른다. 앞은 '없다', 뒤는 '모른다' */
    const code = (e as { code?: string }).code;
    if (code === "ENODATA" || code === "ENOTFOUND") return [];
    return null;
  }
}

/**
 * 보내는 도메인의 SPF·DMARC 를 찾아본다.
 *
 * 화면을 여는 것만으로 조회가 나가므로 10분 동안 기억한다. DNS 를 못
 * 물어보는 자리(막힌 망)에서는 `null` 이고, 그것을 실패로 세지 않는다.
 */
export async function mailDns(timeoutMs = 4000): Promise<MailDns | null> {
  const domain = mailFromDomain();
  if (!domain) return null;
  if (cached && cached.dns.domain === domain && Date.now() - cached.at < TTL) {
    return cached.dns;
  }

  const [root, dmarc] = await Promise.all([
    txt(domain, timeoutMs),
    txt(`_dmarc.${domain}`, timeoutMs),
  ]);
  const spfRow = root?.find((r) => /^v=spf1\b/i.test(r.trim())) ?? null;
  const dmarcRow = dmarc?.find((r) => /^v=DMARC1\b/i.test(r.trim())) ?? null;

  const spf = root === null ? null : Boolean(spfRow);
  const dm = dmarc === null ? null : Boolean(dmarcRow);
  const monitorOnly = Boolean(dmarcRow && /\bp\s*=\s*none\b/i.test(dmarcRow));

  const say = (v: boolean | null, yes: string, no: string) =>
    v === null ? "모름" : v ? yes : no;
  const out: MailDns = {
    domain, spf, dmarc: dm, dmarcMonitorOnly: monitorOnly,
    detail: `${domain} · SPF ${say(spf, "있음", "없음")} · `
      + `DMARC ${say(dm, monitorOnly ? "있음(p=none, 감시만)" : "있음", "없음")}`
      + ` · DKIM 은 셀렉터를 알아야 조회되므로 한 통 보내 확인합니다`,
  };
  cached = { at: Date.now(), dns: out };
  return out;
}

/** 고친 직후에 옛 답을 보여 주지 않으려고 비운다 */
export function forgetMailDns(): void {
  cached = null;
}
