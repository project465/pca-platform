import { isProduction } from "@/lib/env";

/**
 * 잡인더스트리에서 보던 공고를 MAT 으로 가져오기(2026-10-31 대표 지시).
 *
 * 하이브레인넷 · 김박사넷처럼 석·박사 공고를 모아 둔 곳은 있지만, 그 공고를
 * 내 연구 기록과 비교해 주는 곳은 없다. 잡인더스트리 공고 화면의 단추가
 * `/from/jobindustry?job=<그 화면 주소>` 를 부르면, 여기서 주소를 기억했다가
 * 로그인한 뒤 그 공고를 읽어 비교한다.
 *
 * **아무 주소나 열지 않는다.** 서버가 남의 주소를 대신 여는 자리는 안쪽망을
 * 두드리는 통로가 되기 쉽다(SSRF). 그래서 잡인더스트리 호스트만 받고, https 만
 * 받고, 넘겨받는 주소(리디렉션)도 한 번씩 다시 본다. 시험용 호스트는 운영이 아닌
 * 배포본에서 `JOBINDUSTRY_TEST_HOSTS` 로만 더한다.
 *
 * **가져온 본문은 저장하지 않는다.** 공고 분석(`analyzePosting`)이 늘 하던 대로
 * 읽어 낸 요구 항목만 남는다.
 */

export const JOB_COOKIE = "cm_job";
export const JOB_COOKIE_DAYS = 7;

const HOSTS = ["jobindustry.co.kr", "www.jobindustry.co.kr", "m.jobindustry.co.kr"];

function testHosts(): string[] {
  if (isProduction()) return [];
  return (process.env.JOBINDUSTRY_TEST_HOSTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** 받아도 되는 주소면 정리해서 돌려준다. 아니면 null */
export function safeJobUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 600) return null;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.username || u.password) return null;
  const test = testHosts().includes(u.host);
  if (u.protocol === "https:" ? !(HOSTS.includes(u.hostname) || test) : !(u.protocol === "http:" && test)) return null;
  u.hash = "";
  return u.toString();
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", middot: "·" };

/**
 * HTML 을 읽을 수 있는 글로 바꾼다. 스크립트 · 스타일 · 머리말 · 꼬리말 · 메뉴는
 * 걷어 내고, 덩어리가 끝나는 자리에서 줄을 바꾼다. **정규식은 되돌아가지 않는
 * 꼴만 쓴다**: 남의 화면을 받는 자리라 입력이 무엇이든 한 번 훑고 끝나야 한다.
 */
export function htmlToText(html: string): { title: string; text: string } {
  const og = /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']{1,200})["']/i.exec(html)?.[1];
  const tt = /<title[^>]*>([^<]{1,200})<\/title>/i.exec(html)?.[1];
  let s = html;
  for (const tag of ["script", "style", "noscript", "svg", "header", "footer", "nav", "iframe"]) {
    s = s.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, "gi"), " ");
  }
  s = s.replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/li|\/div|\/tr|\/h[1-6]|\/dt|\/dd|\/section|\/article|\/table)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#\d{1,6}|#x[0-9a-f]{1,6}|[a-z]{2,8});/gi, (m, e: string) => {
      if (e[0] === "#") {
        const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " ";
      }
      return ENT[e.toLowerCase()] ?? m;
    });
  const text = s.split("\n").map((l) => l.replace(/[ \t ]+/g, " ").trim()).filter(Boolean).join("\n");
  const title = (og ?? tt ?? "").replace(/\s+/g, " ").trim();
  return { title, text: text.slice(0, 12000) };
}

export type JobFetch = { ok: true; title: string; text: string } | { ok: false; why: "url" | "net" | "type" | "short" };

/** 허용된 주소만 연다. 넘겨받는 주소도 다시 보고, 세 번까지만 따라간다 */
export async function fetchJobPage(raw: string): Promise<JobFetch> {
  let url = safeJobUrl(raw);
  for (let hop = 0; hop < 4 && url; hop++) {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: { "user-agent": "CareerMatri-MAT/1.0 (+https://careermatri.com)", accept: "text/html" },
      });
    } catch {
      return { ok: false, why: "net" };
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      url = loc ? safeJobUrl(new URL(loc, url).toString()) : null;
      continue;
    }
    if (!res.ok) return { ok: false, why: "net" };
    if (!/text\/html|text\/plain/i.test(res.headers.get("content-type") ?? "")) return { ok: false, why: "type" };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 2_000_000) return { ok: false, why: "type" };
    const { title, text } = htmlToText(new TextDecoder("utf-8").decode(buf));
    if (text.length < 30) return { ok: false, why: "short" };
    return { ok: true, title, text };
  }
  return { ok: false, why: "url" };
}
