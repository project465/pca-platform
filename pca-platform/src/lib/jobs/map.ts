import { registry, coreFile } from "@/lib/me-v3/core-registry";
import { catalog, wordsOf } from "@/lib/assistant/catalog";

/**
 * 공고 한 건을 전공(Core)과 기술영역에 단다. **점수를 만들지 않는다.**
 *
 * 차례가 둘이다. 먼저 공고 제목을 각 전공 사전의 `job_aliases`(공고에 쓰이는
 * 직무명)에 대 본다. 거기서 한 전공만 걸리면 그 전공이다. 제목으로 갈리지
 * 않으면 본문의 낱말을 영역 사전에 대어, 한 전공이 뚜렷하게 앞설 때만 그
 * 전공으로 둔다. **둘 다 아니면 비운다**: 짐작으로 채운 전공은 그 전공의
 * 통계를 조용히 흐린다.
 *
 * 규칙으로 단 것이라 등급은 늘 `약함` 이다. 사람이 확인한 표본이 생기기
 * 전에는 올리지 않는다.
 */

export type Mapped = {
  core: string | null;
  /** {TD01: 3, TD08: 1} 처럼 영역마다 걸린 정도. 공고 하나 안에서만 뜻이 있다 */
  td: Record<string, number>;
  role: string | null;
  how: "title" | "content" | "none";
  requirements: string[];
};

type Alias = { posting_name: string; td: string[]; rf?: string[] };

function openCores(): string[] {
  return registry().cores
    .filter((c) => c.status === "building" || c.status === "live")
    .map((c) => c.code);
}

const ALIAS = new Map<string, Alias[]>();
function aliasesOf(core: string): Alias[] {
  const hit = ALIAS.get(core);
  if (hit) return hit;
  const t = coreFile<{ job_aliases?: Alias[] }>(core, "taxonomy");
  const out = (t.job_aliases ?? []).filter((a) => a.posting_name && a.td?.length);
  ALIAS.set(core, out);
  return out;
}

/**
 * `경영기획` · `전략기획·신사업` 의 낱말이 제목에 얼마나 들었는가.
 *
 * **맞은 글자 수로 센다.** 낱말 개수로 세면 다른 전공의 `기획` 한 낱말과
 * 이 전공의 `경영기획` 이 같은 1 이 되어 둘이 비기고, 그러면 분명한 공고가
 * 비워진다. 더 길게 맞은 쪽이 더 구체적인 직무명이다.
 */
/* 어느 직무명에나 붙는 말. 이것으로 맞으면 전공이 갈리지 않는다 */
const GENERIC = new Set(["담당", "담당자", "총괄", "직원", "사원", "관리자", "전문가", "연구원", "(MD)"]);
function titleHit(title: string, alias: string): number {
  const t = title.replace(/\s+/g, "");
  const parts = alias.split(/[·/,\s]+/).filter((p) => p.length >= 2 && !GENERIC.has(p));
  if (!parts.length) return 0;
  const got = parts.filter((p) => t.includes(p));
  /* 낱말 하나짜리 직무명(`간호`)은 그 하나가 맞아야 하고, 여럿이면 절반 넘게 맞아야 한다 */
  if (got.length < Math.max(1, Math.ceil(parts.length / 2))) return 0;
  const score = got.reduce((n, p) => n + p.length, 0);
  /* 두 글자 한 낱말(`보조` · `기획`)만 맞은 것은 전공을 가르지 못한다. 직무명이
     통째로 맞았을 때만 그 짧은 맞음을 받는다 */
  return score >= 3 || got.length === parts.length ? score : 0;
}

/** 본문에서 요구 문장을 끊는다. 학력·연차·자격 같은 조건 줄도 남긴다 */
export function requirementLines(text: string): string[] {
  return text
    .split(/\n|(?<=[.!?。])\s+|·\s|•|▶|■|◆|○|-\s|\d+\)\s/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 6 && s.length <= 160);
}

function contentHits(core: string, lines: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of catalog(core)) {
    let n = 0;
    for (const line of lines) {
      const w = new Set(wordsOf(line));
      if (d.words.some((x) => w.has(x) || line.includes(x))) n += 1;
    }
    if (n) out[d.code] = n;
  }
  return out;
}

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

export function mapPosting(title: string, body: string): Mapped {
  const lines = requirementLines(`${body}`);
  const cores = openCores();

  /* ① 제목 */
  const byTitle: { core: string; alias: Alias; hit: number }[] = [];
  for (const core of cores) {
    for (const a of aliasesOf(core)) {
      const hit = titleHit(title, a.posting_name);
      if (hit) byTitle.push({ core, alias: a, hit });
    }
  }
  byTitle.sort((x, y) => y.hit - x.hit);
  const topHit = byTitle[0]?.hit ?? 0;
  const tops = byTitle.filter((x) => x.hit === topHit);
  const topCores = [...new Set(tops.map((x) => x.core))];
  if (topHit && topCores.length === 1) {
    const core = topCores[0];
    const td: Record<string, number> = {};
    for (const x of tops) for (const c of x.alias.td) td[c] = (td[c] ?? 0) + 2;
    for (const [c, n] of Object.entries(contentHits(core, lines))) td[c] = (td[c] ?? 0) + n;
    return { core, td, role: tops[0].alias.posting_name, how: "title", requirements: pick(core, lines) };
  }

  /* ② 본문. 제목이 여러 전공에 걸렸으면 그 전공들 안에서만 고른다 */
  const pool = topCores.length > 1 ? topCores : cores;
  const scored = pool
    .map((core) => ({ core, td: contentHits(core, lines) }))
    .map((x) => ({ ...x, n: sum(x.td) }))
    .sort((a, b) => b.n - a.n);
  const [a, b] = scored;
  if (a && a.n >= 3 && a.n >= 1.5 * (b?.n ?? 0)) {
    return { core: a.core, td: a.td, role: null, how: "content", requirements: pick(a.core, lines) };
  }
  return { core: null, td: {}, role: null, how: "none", requirements: lines.slice(0, 12) };
}

/** 그 전공의 영역 낱말에 걸리거나 조건을 적은 줄만 남긴다. 최대 열둘 */
function pick(core: string, lines: string[]): string[] {
  const cat = catalog(core);
  const out: string[] = [];
  for (const line of lines) {
    const w = new Set(wordsOf(line));
    const cond = /(학사|석사|박사|경력|년 이상|토익|TOEIC|어학|자격증|면허)/.test(line);
    if (cond || cat.some((d) => d.words.some((x) => w.has(x) || line.includes(x)))) {
      out.push(line.length > 120 ? `${line.slice(0, 118)}…` : line);
    }
    if (out.length >= 12) break;
  }
  return out;
}

/** 근무지 주소의 앞머리로 권역을 가른다. 모르면 비운다 */
export function regionOf(addr: string | null | undefined): string | null {
  const s = (addr ?? "").trim();
  if (!s) return null;
  if (/^(서울|경기|인천)/.test(s)) return "KR-CAPITAL";
  if (/^(대전|세종|충북|충남|충청)/.test(s)) return "KR-CHUNGCHEONG";
  if (/^(부산|대구|울산|경북|경남|경상)/.test(s)) return "KR-YEONGNAM";
  if (/^(광주|전북|전남|전라)/.test(s)) return "KR-HONAM";
  if (/^(강원|제주)/.test(s)) return "KR-ETC";
  return null;
}
