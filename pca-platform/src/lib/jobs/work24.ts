import { opFail, ref } from "@/lib/oplog";
import { ingest, knownRefs, type RawPosting } from "./ingest";

/**
 * 고용24(옛 워크넷) 채용정보 오픈 API 에서 공고를 받아 온다.
 *
 * **열쇠가 없으면 아무것도 하지 않는다**(`WORK24_AUTH_KEY`). 열쇠는 고용24
 * 기업회원으로 로그인해 `OPEN-API 서비스 소개 및 신청` 에서 받는다. 그
 * 신청이 이용 조건에 동의하는 자리라, 열쇠가 있다는 것이 곧 사람이 조건을
 * 읽고 받았다는 뜻이 된다.
 *
 * **응답 칸 이름을 확인하지 못했다.** 이 코드를 쓴 환경에서는 고용24 안내
 * 쪽이 열리지 않았다. 그래서 칸 이름을 한 가지로 못 박지 않고 후보를
 * 차례로 찾는다(`FIELD`). 처음 돌린 날 `seenFields` 가 실제로 온 칸 이름을
 * 돌려주므로 그것을 보고 후보를 줄인다. 확인한 것은 요청 주소의 꼴뿐이다:
 * `callOpenApiSvcInfo210L01.do?authKey=…&callTp=L&returnType=XML&startPage=…&display=…`.
 *
 * **회사 이름을 읽지 않는다.** 후보 목록에 그 칸이 없다.
 */

const BASE = process.env.WORK24_BASE ?? "https://www.work24.go.kr/cm/openApi/call/wk";
const SOURCE = "work24";

/* 칸마다 찾아볼 이름. 앞에 있는 것이 먼저다 */
const FIELD = {
  ref: ["wantedAuthNo", "wantedNo", "empSeqno"],
  title: ["title", "wantedTitle", "recrutPbancTtl"],
  address: ["region", "basicAddr", "workRegion", "workArea"],
  posted: ["regDt", "regDate", "wantedRegDt"],
  closes: ["closeDt", "receiptCloseDt", "closeDate"],
  url: ["wantedInfoUrl", "wantedMobileInfoUrl", "infoUrl"],
  /* 상세에서 읽는 본문. 여럿이 오면 이어 붙인다 */
  body: ["jobCont", "jobsNm", "relJobsNm", "srchKeywordNm", "compAbl", "pfCond",
    "etcPfCond", "certificate", "major", "eduNm", "career", "minEdubg"],
} as const;

function tagValues(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out.push(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "")
      .replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim());
  }
  return out;
}

function first(xml: string, names: readonly string[], seen: Set<string>): string {
  for (const n of names) {
    const v = tagValues(xml, n)[0];
    if (v !== undefined) { seen.add(n); return v; }
  }
  return "";
}

async function call(path: string, params: Record<string, string>): Promise<string> {
  const key = process.env.WORK24_AUTH_KEY ?? "";
  const qs = new URLSearchParams({ authKey: key, returnType: "XML", ...params });
  const res = await fetch(`${BASE}/${path}?${qs}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function work24Ready(): boolean {
  return (process.env.WORK24_AUTH_KEY ?? "").length >= 8;
}

/**
 * 한 번 돈다. 새 공고만 상세를 부른다. 상한은 환경변수로 둔다:
 * 목록 쪽수(`WORK24_MAX_PAGES`, 기본 3 · 쪽마다 100건)와 상세 호출
 * (`WORK24_MAX_DETAIL`, 기본 150). 하루 호출 한도를 넘기지 않으려는 것이다.
 */
export async function runWork24(now = new Date()): Promise<{
  ok: boolean; listed: number; fresh: number; ingested: number; mapped: number;
  seenFields: string[]; error?: string;
}> {
  if (!work24Ready()) return { ok: false, listed: 0, fresh: 0, ingested: 0, mapped: 0, seenFields: [], error: "no-key" };
  const seen = new Set<string>();
  const pages = Number(process.env.WORK24_MAX_PAGES ?? 3);
  const maxDetail = Number(process.env.WORK24_MAX_DETAIL ?? 150);
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const from = new Date(now.getTime() - 7 * 86400_000);
  try {
    const list: { ref: string; title: string; address: string; posted: string; closes: string; url: string }[] = [];
    for (let p = 1; p <= pages; p += 1) {
      const xml = await call("callOpenApiSvcInfo210L01.do", {
        callTp: "L", startPage: String(p), display: "100",
        srchBgnDt: ymd(from), srchEndDt: ymd(now),
      });
      const items = xml.split(/<\/wanted>/).filter((s) => s.includes("<wanted>"));
      if (!items.length) break;
      for (const it of items) {
        const r = first(it, FIELD.ref, seen);
        if (!r) continue;
        list.push({
          ref: r, title: first(it, FIELD.title, seen), address: first(it, FIELD.address, seen),
          posted: first(it, FIELD.posted, seen), closes: first(it, FIELD.closes, seen),
          url: first(it, FIELD.url, seen),
        });
      }
    }
    const known = await knownRefs(SOURCE, list.map((x) => x.ref));
    const fresh = list.filter((x) => !known.has(x.ref)).slice(0, maxDetail);
    const rows: RawPosting[] = [];
    for (const x of fresh) {
      let body = "";
      try {
        const xml = await call("callOpenApiSvcInfo210D01.do", {
          callTp: "D", wantedAuthNo: x.ref, infoSvc: "VALIDATION",
        });
        body = FIELD.body.map((n) => {
          const v = tagValues(xml, n).join("\n");
          if (v) seen.add(n);
          return v;
        }).filter(Boolean).join("\n");
      } catch (e) {
        /* 한 건의 상세가 실패해도 나머지는 넣는다. 본문 없이 제목만으로 단다 */
        opFail({ operation: "jobs.work24", ref: ref("posting", x.ref), step: "detail", category: "upstream" }, e);
      }
      rows.push({
        source: SOURCE, sourceRef: x.ref, url: x.url || null, title: x.title, body,
        address: x.address, postedOn: x.posted, closesOn: x.closes,
      });
    }
    const r = await ingest(rows);
    return { ok: true, listed: list.length, fresh: fresh.length, ingested: r.seen, mapped: r.mapped, seenFields: [...seen] };
  } catch (e) {
    opFail({ operation: "jobs.work24", ref: ref("source", SOURCE), step: "list", category: "upstream" }, e);
    return { ok: false, listed: 0, fresh: 0, ingested: 0, mapped: 0, seenFields: [...seen], error: String((e as Error).message ?? e).slice(0, 120) };
  }
}
