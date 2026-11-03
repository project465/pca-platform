/**
 * **기관 · 프로그램(기수)의 중점 기업.**
 *
 * 기관이 기업탐방 같은 프로그램을 돌리면, 그 프로그램에 든 참여자의 결과 지역
 * 부분 맨 위에 그 회사를 자세히 세운다(2026-11-03 대표 지시: 고려대 세종 ·
 * 세종일자리경제진흥원의 비전세미콘). 회사 하나를 모든 결과에 크게 띄우던 옛
 * 자리(`result/sejong.ts` 의 focus)와 다르다: **프로그램에 든 사람에게만** 선다.
 *
 * 지키는 것.
 *  - **사실은 데이터 파일에만 있다**(`featured-companies.v1.json`). 숫자마다 출처와
 *    기준일이 붙고 화면은 그대로 옮긴다. 여기서 회사 사실을 만들지 않는다
 *  - **누가 프로그램에 드는지는 DB 가 정한다**(`cohorts.program_code` → `cohort_members`).
 *    저장소에 명단을 두지 않는다
 *  - **이어 주는 규칙은 지역 절과 같다.** 회사가 이 전공의 어느 산업 묶음에 드는지는
 *    `regionView` 가 이미 가른 묶음을 그대로 읽고, 그 산업이 쓰는 영역은 관계표의
 *    `중심` · `있음` 이다. 점수를 만들지 않는다
 *  - **추천이 아니다.** 채용 여부를 확인하지 않았고 지원은 본인이 한다(`REGION_LAW`)
 *  - **판정에 들어가지 않는다.** 굳은 결과를 읽기만 한다
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTENT_DIR } from "@/lib/me-v3/core-registry";
import type { Inputs } from "@/lib/me-v3/report-long/types";
import type { X } from "@/lib/me-v3/report-long/derive";
import { packHeadThemes, type RegionView } from "@/lib/me-v3/report-long/region";
import { featuredText, type Audience } from "./text";

export type Fact = {
  key: string; label: string; value: string; year?: string;
  src: string; on: string; official: boolean; review?: string;
};
export type Company = {
  name: string; short: string; match_name: string; sector: string; product: string;
  themes: string[]; region: string; listed: string | null;
  facts: Fact[]; process: string; process_src: string;
  jobs: { name: string; cores: string[]; what: string; src: string; on: string }[];
  talent: { lines: string[]; src: string; on: string; official: boolean; review?: string } | null;
  news: { what: string; on: string; src: string }[];
  prep_company: string;
  sources: string[];
};
export type OnsiteTopic = { id: string; when: string; ask: string };
export type Program = {
  code: string; org_code: string; audience: Audience; title: string; cohort_name: string;
  company: string; onsite_src: string; onsite: OnsiteTopic[];
};

function readContent<T>(file: string): T | null {
  try { return JSON.parse(readFileSync(path.join(CONTENT_DIR, file), "utf8")) as T; } catch { return null; }
}
export const programs = (): Program[] =>
  readContent<{ programs: Program[] }>("featured-programs.v1.json")?.programs ?? [];
export const companies = (): Record<string, Company> =>
  readContent<{ companies: Record<string, Company> }>("featured-companies.v1.json")?.companies ?? {};
export const programByCode = (code: string): Program | null => programs().find((p) => p.code === code) ?? null;

/**
 * 이 사람이 든 프로그램. 기수의 `program_code` 가 먼저이고, 그 칸이 아직 없는 DB
 * (db:upgrade 전)에서는 기수 이름으로 찾는다. **못 찾으면 null**: 카드가 서지 않는다.
 * 학교 · 기관 코드가 프로그램의 기관과 같아야 한다(다른 학교 기수에 든 사람에게
 * 이 학교 카드가 서지 않게).
 */
export async function programOfUser(userId: string, issuerCode: string | null): Promise<Program | null> {
  const ps = programs();
  if (!ps.length) return null;
  const { query } = await import("@/lib/db");
  type Row = { org_code: string; program_code: string | null; name: string };
  const sql = (withCode: boolean) => `
    SELECT o.code AS org_code, ${withCode ? "c.program_code" : "NULL::text AS program_code"}, c.name
      FROM cohort_members cm JOIN cohorts c ON c.id = cm.cohort_id JOIN organizations o ON o.id = c.org_id
     WHERE cm.user_id = $1::bigint`;
  let rows: Row[] = [];
  try { rows = await query<Row>(sql(true), [userId]); }
  catch {
    /* `program_code` 칸이 없는 DB. 이름으로만 찾는다 */
    try { rows = await query<Row>(sql(false), [userId]); } catch { return null; }
  }
  for (const r of rows) {
    const p = ps.find((q) => q.org_code === r.org_code
      && (r.program_code ? r.program_code === q.code : r.name.trim() === q.cohort_name));
    if (p && (!issuerCode || issuerCode === p.org_code)) return p;
  }
  return null;
}

const bare = (n: string) => n.replace(/주식회사|\(주\)|㈜|\s/g, "");
const Z1 = "Z1_EVIDENCE_ESTABLISHED";
const Z2 = new Set(["Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST"]);

export type FeaturedLink = {
  /** 이 전공의 산업 묶음 가운데 회사가 든 곳. 없으면 null */
  pack: string | null;
  /** 지역 절의 회사 목록에서 그 묶음으로 갈렸는가(아니면 업종 낱말로 찾은 묶음) */
  viaRegion: boolean;
  /** 검사에서 고른 산업인가 */
  chosen: boolean;
  /** 그 산업이 주로 쓰는 영역(관계표 `중심` 먼저) */
  uses: string[];
  /** 근거가 선 영역과 그 영역에서 고른 항목 */
  z1: { name: string; picks: string[] }[];
  /** 해 본 일이 확인된 영역 */
  z2: { name: string; picks: string[] }[];
  /** 이 전공과 닿는 채용 직무 */
  jobs: Company["jobs"];
};
export type FeaturedView = {
  program: { code: string; title: string; audience: Audience };
  company: Company;
  link: FeaturedLink;
  /** 방문 전에 확인하거나 준비할 것(2~3) */
  prep: string[];
  /** 현장에서 확인할 것(3) */
  onsite: string[];
  onsiteSrc: string;
  /** 머리 한 줄: 이 결과와 회사가 어디서 만나는가 */
  lead: string;
  /** 출처 줄 */
  sourceLine: string;
};

/**
 * 굳은 결과 · 지역 묶음 · 프로그램으로 카드 한 장을 만든다. **새 판단을 하지 않는다**:
 * 영역 묶음은 결과 모델의 것이고, 회사가 든 산업은 지역 절이 가른 것이다.
 */
export function featuredView(x: Inputs, d: X, rv: RegionView | null, prog: Program): FeaturedView | null {
  const co = companies()[prog.company];
  if (!co) return null;
  const tx = featuredText(prog.audience);

  /* 1) 회사가 든 산업 묶음. 지역 절이 이미 가른 묶음이 먼저다(같은 규칙) */
  const g = rv?.groups.find((gr) => gr.orgs.some((o) => bare(o.name).includes(co.match_name)));
  let packCode: string | null = g?.pack.code ?? null;
  /* 회사가 지역 명단에 있는데 묶음에 없으면, 지역 규칙이 `이 전공의 산업이 아니다` 라고 본 것이다.
     그 판단을 따른다(2026-11-03 견본: 보조 규칙이 컴퓨터 전공에서 이 회사를 `자동차·모빌리티
     소프트웨어` 에 붙였다. 묶음 이름의 `자동차` 가 `기계·장비` 낱말이라서다) */
  const inList = !!rv?.all.some((o) => bare(o.name).includes(co.match_name));
  if (!packCode && !inList) {
    /* 지역 명단에 없는 회사만: 회사의 첫 업종(`themes[0]`)이 묶음 이름에 걸린 곳 */
    const hit = x.inds.find((p) => packHeadThemes(p).includes(co.themes[0]));
    packCode = hit?.code ?? null;
  }
  const pack = packCode ? x.inds.find((p) => p.code === packCode) ?? null : null;
  const rows = pack ? x.rel.td_industry.filter((r) => r.industry === pack.code && r.strength !== "드묾") : [];
  const useCodes = [...rows.filter((r) => r.strength === "중심"), ...rows.filter((r) => r.strength === "있음")].map((r) => r.td);
  const picksOf = (code: string): string[] => {
    const dm = d.dom(code);
    if (!dm) return [];
    const ev = d.evidenceOf(dm);
    return [...new Set([...ev.decisions.slice(0, 1), ...ev.artifacts.slice(0, 1), ...(ev.decisions.length ? [] : ev.acts.slice(0, 1))])]
      .filter((s) => !s.startsWith("‘")).slice(0, 2);
  };
  const zoneOf = (code: string) => d.dom(code)?.zone ?? "";
  const z1c = useCodes.filter((c) => zoneOf(c) === Z1);
  const z2c = useCodes.filter((c) => Z2.has(zoneOf(c)) || (zoneOf(c) !== Z1 && (d.dom(c)?.confirmed.length ?? 0) > 0));
  const chosenSet = new Set([x.m.targets.goal?.industry, ...x.m.targets.industries].filter(Boolean) as string[]);
  const jobs = [...co.jobs.filter((jb) => jb.cores.includes(x.coreCode)), ...co.jobs.filter((jb) => jb.cores.includes("*"))];
  const link: FeaturedLink = {
    pack: pack?.name_ko ?? null, viaRegion: !!g, chosen: !!pack && chosenSet.has(pack.code),
    uses: useCodes.slice(0, 4).map(d.name),
    z1: z1c.slice(0, 2).map((c) => ({ name: d.name(c), picks: picksOf(c) })),
    z2: z2c.slice(0, 2).map((c) => ({ name: d.name(c), picks: picksOf(c) })),
    jobs,
  };

  /* 2) 방문 전에 할 것. 회사 쪽 하나 · 내 결과 쪽 하나 · 채용 쪽 하나 */
  const anyZ1 = x.m.domains.filter((dm) => dm.zone === Z1);
  const mine = link.z1[0] ?? null;
  const tried = link.z2[0] ?? null;
  const strong = !mine && !tried && anyZ1[0] ? { name: d.name(anyZ1[0].code), picks: picksOf(anyZ1[0].code) } : null;
  const prep = [
    co.prep_company,
    mine ? tx.prepMine(mine.name, mine.picks[0] ?? null)
      : tried ? tx.prepTried(tried.name)
      : strong ? tx.prepStrong(strong.name, strong.picks[0] ?? null)
      : link.uses[0] ? tx.prepUses(link.uses[0])
      : null,
    jobs[0] ? tx.prepJob(jobs[0].name) : null,
  ].filter((s): s is string => !!s).slice(0, 3);

  /* 3) 현장에서 확인할 것. 차례가 곧 우선순위이고 조건에 맞는 셋 */
  const ok = (w: string) => w === "any"
    || (w === "z1" && anyZ1.length > 0) || (w === "no_z1" && !anyZ1.length)
    || (w === "school" && prog.audience === "school")
    || (w.startsWith("core:") && w.slice(5) === x.coreCode);
  const onsite = prog.onsite.filter((t) => ok(t.when)).slice(0, 3).map((t) => t.ask);

  const factOn = [...new Set(co.facts.map((f) => f.on))];
  return {
    program: { code: prog.code, title: prog.title, audience: prog.audience },
    company: co, link, prep, onsite, onsiteSrc: prog.onsite_src,
    /* 응시한 학과(기관은 계열) 이름. 학교 진입이 아니면 Core 이름 */
    lead: tx.lead(co, link, x.department ?? x.major),
    sourceLine: `출처: ${co.sources.join(" · ")}${factOn.length ? ` · 숫자마다 출처와 기준일을 옆에 적었습니다` : ""}`,
  };
}

/** 숫자 한 칸을 `값 (연도 · 출처, 기준일)` 꼴로. 화면과 종이가 같은 글자를 쓴다 */
export const factLine = (f: Fact): string =>
  `${f.value}${f.year ? ` (${f.year})` : ""}`;
export const factSrc = (f: Fact): string =>
  `${f.src} · ${f.on}${f.official ? "" : " · 공시 대조 전"}`;

/**
 * 카드 · 종이의 사실 줄. **화면과 종이가 같은 줄을 쓴다.** 한 장에 들어가게 업종 · 소재지를
 * 한 줄로, 규모(매출 · 이익 · 직원)를 한 줄로 묶는다. 값과 출처는 데이터 그대로다.
 */
export function factRows(co: Company): { label: string; value: string; src: string }[] {
  const by = (keys: string[]) => co.facts.filter((fc) => keys.includes(fc.key));
  const join = (label: string, fs: Fact[]) => (fs.length
    ? [{ label, value: fs.map((fc) => `${fc.label} ${factLine(fc)}`).join(" · "), src: [...new Set(fs.flatMap((fc) => factSrc(fc).split(" · ")))].join(" · ") }] : []);
  const grouped = new Set(["industry", "location", "sales", "op", "staff"]);
  return [
    ...co.facts.filter((fc) => !grouped.has(fc.key)).map((fc) => ({ label: fc.label, value: factLine(fc), src: factSrc(fc) })),
    { label: "쓰이는 자리", value: co.process, src: co.process_src },
    ...join("업종 · 소재지", by(["industry", "location"])),
    ...join("규모", by(["sales", "op", "staff"])),
    { label: "뽑는 직무", value: co.jobs.map((jb) => jb.name).join(" · "), src: [...new Set(co.jobs.map((jb) => jb.src))].join(" · ") },
    ...(co.talent ? [{ label: "인재상", value: co.talent.lines.join(" · "), src: `${co.talent.src} · ${co.talent.on}` }] : []),
  ];
}
