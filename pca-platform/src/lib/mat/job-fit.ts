import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_DIR, registry } from "@/lib/me-v3/core-registry";
import { dictTerms } from "@/lib/assistant/rules";

/**
 * **이 공고가 이 학과 학생의 분야 공고인가**(2026-11-06 전주대 인공지능학과에 무관한 공고가 섞이고 맞는 공고가 1건뿐이었다).
 *
 * 학과 → Core · 갈래 → 공고 분야 → 공고 제목 · 모집 분야로 잇는다. 점수를 만들지 않고 **무엇이 겹쳤는지**를 돌려준다
 * (`pick-jobs.ts` 가 그 수로 차례를 정하고 겹친 분야어를 칩으로 세운다). DB 를 읽지 않는다.
 *
 * 고친 까닭 다섯(`docs/mat-match-1106.md`):
 * 1. 인공지능 Core(`AI_CORE_V1`)는 전공 사전(`mat-terms.json`)에 줄이 없어 제목에 걸릴 낱말이 하나도 없었다.
 *    그래서 `AI Engineer` · `머신러닝 엔지니어` 가 인공지능학과 맞춤에서 빠졌다. 공고 맞춤용 낱말을 `mat-job-fields.json` 에 둔다
 * 2. 제목 옆에 모을 때 단 직무 이름(`role_code`)을 붙여 읽었는데, 그 이름은 **다른 전공 사전**에서 온 것일 수 있다.
 *    이제 제목과 잡인더스트리 본문의 `모집 분야` 칸만 읽는다
 * 3. 한국어 두 글자 낱말이 다른 낱말 속에서 걸렸다(`자동차부품사` 의 `품사`, `기술기획` 의 `술기`). 두 글자는 낱말 앞머리에서만 센다
 * 4. 잡인더스트리 분류(`IT/AI/빅데이터/블록체인` · `기계/모빌리티/로봇/조선` …)를 보지 않아, 진동·음향 시험 공고의 `음향` 이
 *    영화방송학과에, 바이오 회사 공고의 `생산관리` 가 경영학과에 맞춤으로 섰다. 그 분류를 가진 다른 전공 사전에도 있는 낱말이면
 *    그 낱말로는 맞춤으로 치지 않는다
 * 5. 공학 · 보건 계열 학생에게 행정 · 사무 · 시설 관리 일자리가 연구기관 이름 하나로 섰다(`한국생산기술연구원 … 직원(제한경쟁)`).
 *    모집 분야가 행정이고 전공 낱말이 없으면 세우지 않는다. 제목 앞의 기관 이름은 낱말을 대기 전에 뗀다
 */

type Term = { term: string; low: string; latin: RegExp | null };
type CoreCfg = { groups?: string[]; tech?: boolean; strong?: string[]; weak?: string[]; pair?: string[] };
type SpecCfg = { groups?: string[]; lead?: string[]; also?: string[] };
type Cfg = {
  tags: Record<string, string>;
  orgs: { names: string[]; groups: string[] }[];
  generic: string[];
  claims?: Record<string, string[]>;
  admin: string;
  cores: Record<string, CoreCfg>;
  specs: Record<string, SpecCfg>;
  units: Record<string, SpecCfg>;
};

let CFG: Cfg | null = null;
function cfg(): Cfg {
  if (!CFG) {
    const f = join(process.cwd(), CONTENT_DIR, "mat-job-fields.json");
    CFG = existsSync(f)
      ? (JSON.parse(readFileSync(f, "utf8")) as Cfg)
      : { tags: {}, orgs: [], generic: [], admin: "$^", cores: {}, specs: {}, units: {} };
  }
  return CFG;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function mk(term: string, latin?: RegExp | null): Term {
  const t = term.trim();
  const lat = latin !== undefined ? latin
    : /^[\x20-\x7e]+$/.test(t) ? new RegExp(`(^|[^A-Za-z0-9+#])${esc(t)}(?![A-Za-z0-9+#])`, "i") : null;
  return { term: t, low: t.toLowerCase(), latin: lat };
}

/**
 * 글에 그 낱말이 있는가. 로마자는 낱말 경계로 잰다. 한국어는 **첫 토막이 두 글자 이하면 낱말 앞머리에서만** 센다
 * (`부품사` 안의 `품사` · `섬유기계` 안의 `기계` · `품질 관리` 안의 `질 관리` · `임상시험 계획` 안의 `시험 계획` 은 그 낱말이 아니다).
 * 첫 토막이 세 글자 이상이면 붙여 쓴 말 속에서도 센다(`실내자율주행` 의 `자율주행`)
 */
export function termIn(text: string, t: Term): boolean {
  if (t.latin) return t.latin.test(text);
  const low = text.toLowerCase();
  if ((t.low.split(/\s/)[0] ?? "").length >= 3) return low.includes(t.low);
  for (let i = low.indexOf(t.low); i >= 0; i = low.indexOf(t.low, i + 1)) {
    if (i === 0 || !/[가-힣]/.test(low[i - 1])) return true;
  }
  return false;
}

/** 다른 분야 공고에서도 받을 만큼 긴 낱말인가. 한국어 세 글자 · 로마자 세 글자 이상(`음향` · `QC` · `AI` 는 아니다) */
const long = (t: Term) => t.low.replace(/[^가-힣a-z0-9+#]/g, "").length >= 3;

/* ── 전공마다 낱말 ─────────────────────────────────────────────── */

const DICT = new Map<string, Term[]>();
function dictOf(core: string): Term[] {
  let v = DICT.get(core);
  if (!v) {
    let list: { term: string; latin: RegExp | null }[] = [];
    try { list = dictTerms(core); } catch { list = []; }
    const extra = cfg().cores[core]?.strong ?? [];
    const seen = new Set<string>();
    v = [...list.map((x) => mk(x.term, x.latin)), ...extra.map((x) => mk(x))]
      .filter((x) => x.term.length >= 2 && !seen.has(x.low) && (seen.add(x.low), true));
    DICT.set(core, v);
  }
  return v;
}

/** 묶음(`IT` …)을 가진 Core 마다 그 사전의 낱말(소문자). 다른 분야 공고에서 걸린 낱말이 누구 낱말인지 가른다 */
let OWNERS: Map<string, { core: string; words: Set<string> }[]> | null = null;
function owners(group: string): { core: string; words: Set<string> }[] {
  if (!OWNERS) {
    OWNERS = new Map();
    const open = registry().cores.filter((c) => c.status === "building" || c.status === "live").map((c) => c.code);
    for (const core of open) {
      const c = cfg().cores[core];
      if (!c) continue;
      const words = new Set([...dictOf(core), ...[...(c.weak ?? []), ...(c.pair ?? [])].map((x) => mk(x))].map((x) => x.low));
      for (const g of c.groups ?? []) OWNERS.set(g, [...(OWNERS.get(g) ?? []), { core, words }]);
    }
    for (const [g, list] of Object.entries(cfg().claims ?? {})) {
      OWNERS.set(g, [...(OWNERS.get(g) ?? []), { core: `claims:${g}`, words: new Set(list.map((x) => mk(x).low)) }]);
    }
  }
  return OWNERS.get(group) ?? [];
}

/* ── 그 학생의 맞춤 기준 ───────────────────────────────────────── */

export type FitProfile = {
  core: string | null;
  /** 이 학생 쪽 공고 묶음 */
  groups: Set<string>;
  /** 행정 · 사무 일자리를 거르는 계열인가 */
  tech: boolean;
  strong: Term[];
  weak: Term[];
  /** `weak` 하나와 함께 걸릴 때만 세는 낱말 */
  pair: Term[];
  /** 맞춤 안에서 위로 올리는 낱말(갈래 · 학과 자리) */
  lead: Term[];
  /** 같은 묶음을 가진 Core 로 치는 자기 쪽(다른 분야 낱말 가르기에서 뺀다) */
  mine: Set<string>;
};

const PROFILES = new Map<string, FitProfile>();

/** 학과의 Core · 갈래 · 자리에서 맞춤 기준을 세운다. 같은 셋이면 같은 기준이다 */
export function profileOf(core: string | null, spec?: string | null, unit?: string | null): FitProfile {
  const key = `${core}|${spec ?? ""}|${unit ?? ""}`;
  const hit = PROFILES.get(key);
  if (hit) return hit;
  const c = cfg();
  const cores = new Set<string>(core ? [core] : []);
  const specs: SpecCfg[] = [];
  const add = (s: SpecCfg | undefined) => {
    if (!s) return;
    specs.push(s);
    for (const a of s.also ?? []) {
      if (c.specs[a]) { if (!specs.includes(c.specs[a])) specs.push(c.specs[a]); } else cores.add(a);
    }
  };
  add(spec ? c.specs[spec] : undefined);
  add(unit ? c.units[unit] : undefined);
  const groups = new Set<string>();
  const strong: Term[] = [], weak: Term[] = [], pair: Term[] = [], lead: Term[] = [];
  let tech = false;
  for (const k of cores) {
    const cc = c.cores[k];
    for (const g of cc?.groups ?? []) groups.add(g);
    tech = tech || !!cc?.tech;
    strong.push(...dictOf(k));
    weak.push(...(cc?.weak ?? []).map((x) => mk(x)));
    pair.push(...(cc?.pair ?? []).map((x) => mk(x)));
  }
  for (const s of specs) {
    for (const g of s.groups ?? []) groups.add(g);
    lead.push(...(s.lead ?? []).map((x) => mk(x)));
  }
  const uniq = (xs: Term[], not: Set<string> = new Set()) => {
    const seen = new Set(not);
    return xs.filter((x) => !seen.has(x.low) && (seen.add(x.low), true));
  };
  const leadU = uniq(lead);
  const strongU = uniq(strong, new Set(leadU.map((x) => x.low)));
  const weakU = uniq(weak, new Set([...leadU, ...strongU].map((x) => x.low)));
  const p: FitProfile = {
    core, groups, tech, lead: leadU, strong: strongU, weak: weakU,
    pair: uniq(pair, new Set([...leadU, ...strongU, ...weakU].map((x) => x.low))),
    mine: cores,
  };
  PROFILES.set(key, p);
  return p;
}

/* ── 공고 한 건 ────────────────────────────────────────────────── */

export type FitPosting = {
  title: string;
  /** 잡인더스트리 본문의 `모집 분야` 칸 */
  recruit_field?: string | null;
  /** 잡인더스트리 분류 · `fieldOf` 이름 */
  field?: string | null;
  /** 커리어피크 직군(`연구·행정`) */
  job_family?: string | null;
};

export type Fit = {
  /** 제목 · 모집 분야에서 겹친 분야어(화면 칩) */
  terms: string[];
  strong: number;
  weak: number;
  lead: number;
  /** 공고 묶음이 이 학생 쪽인가. 묶음을 모르면 null */
  owned: boolean | null;
  /** 이 학생 계열이 보지 않는 행정 · 사무 일자리 */
  admin: boolean;
  /** 맞는 공고로 세울 만한가 */
  real: boolean;
};

/*
 * 제목 앞머리의 해(`2026년도`)와 공공기관 이름. 기관 이름은 로마자가 없고 세 글자 이상이며 `연구원 · 진흥원 · 공사 · 공단 ·
 * 재단 · 대학교 · 청 · 부 · 처` 로 끝나는 토막이다. 회사 연구소(`AI로봇연구소` · `자율주행연구소`)는 떼지 않는다:
 * 그 이름이 곧 분야다
 */
const ORG_HEAD = /^(\d{4}년도?|[가-힣]{2,}(연구원|진흥원|공사|공단|재단|대학교|청|부|처)(\([^)]*\))?)\s+/;

/** 제목 앞의 해 · 기관 이름(약칭 포함)을 뗀다. 기관 이름 속 낱말(`한국생산기술연구원` 의 `생산기술`)로 맞추지 않으려고 */
export function stripOrg(title: string): string {
  const short = new Set(cfg().orgs.flatMap((o) => o.names).filter((n) => /^[A-Z]+$/.test(n)).concat(["KIST", "KAIST", "GIST", "DGIST", "UNIST"]));
  let t = title.trim();
  for (let i = 0; i < 4; i += 1) {
    const m = t.match(ORG_HEAD);
    const first = t.split(/\s+/)[0] ?? "";
    const cut = m ? m[0].length : short.has(first) ? first.length + 1 : 0;
    if (!cut || cut >= t.length) break;
    t = t.slice(cut).trimStart();
  }
  return t;
}

/** 공고의 묶음. 분류 칸이 먼저이고, 비어 있으면 제목의 기관 이름으로 */
export function groupsOf(p: FitPosting): string[] {
  const c = cfg();
  const tag = p.field ? c.tags[p.field.trim()] : undefined;
  if (tag) return [tag];
  if (p.field) return [];
  const org = c.orgs.find((o) => o.names.some((n) => p.title.includes(n)));
  return org?.groups ?? [];
}

let ADMIN: RegExp | null = null;
let GENERIC: Set<string> | null = null;

export function fitOf(prof: FitProfile, p: FitPosting, extra: { personal?: string[]; stems?: string[] } = {}): Fit {
  const c = cfg();
  ADMIN ??= new RegExp(c.admin);
  GENERIC ??= new Set(c.generic.map((x) => x.toLowerCase().replace(/\s+/g, "")));
  const field = (p.recruit_field ?? "").trim();
  const title = stripOrg(p.title);
  const family = (p.job_family ?? "").split(/[·,\s]+/).filter(Boolean);
  const adminJob = ADMIN.test(field || title) || (family.length > 0 && family.every((x) => x === "행정"));
  /* 행정 · 사무 일자리는 그 기관이 어느 산업이든 행정 쪽 공고다(분류 칸은 기관의 산업이고 이것은 일의 종류다) */
  const groups = adminJob ? ["ADMIN", ...groupsOf(p)] : groupsOf(p);
  const owned = groups.length ? groups.some((g) => prof.groups.has(g)) : null;
  /*
   * **다른 분야 공고**(분류가 이 학생 쪽이 아니다)는 제목에 걸린 긴 낱말만 센다. 모집 분야 칸은 공고마다 `시스템 구축` ·
   * `품질 관리` 같은 일 말을 늘어놓아서, 그 말로 다른 분야 공고가 맞춤에 섰다. 그 낱말이 그 분류를 가진 다른 전공
   * 사전(또는 그 산업의 직무 말)에도 있으면 그것도 세지 않는다
   */
  const off = owned === false;
  const head = off ? title : `${title} ${field}`;
  const foreign = (low: string) => off
    && groups.some((g) => owners(g).some((o) => !prof.mine.has(o.core) && o.words.has(low)));
  /* 다른 분야 공고에서도 받는 짧은 낱말: 로마자 약어(`AI` · `SW`)와 갈래 · 짝 낱말(`로봇`) */
  const shortOk = (t: Term) => !!t.latin || prof.lead.includes(t) || prof.pair.includes(t);
  const got = (list: Term[]) => list.filter((t) =>
    !GENERIC!.has(t.low.replace(/\s+/g, "")) && (!off || long(t) || shortOk(t)) && termIn(head, t) && !foreign(t.low));
  const keep = (xs: Term[]) => xs.filter((a) => !xs.some((b) => b !== a && b.low.includes(a.low)));
  const lead = keep(got(prof.lead));
  const above = (xs: Term[]) => (t: Term) => !xs.some((l) => l.low.includes(t.low));
  /* 전공 이름(`건축` · `인공지능`)도 사전 이름과 같이 센다 */
  const stem = (extra.stems ?? []).filter((x) => x.length >= 2).map((x) => mk(x));
  const strong = keep(got([...prof.strong, ...stem])).filter(above(lead));
  const pair = keep(got(prof.pair)).filter(above([...lead, ...strong]));
  /* `Physical AI` 안의 `AI` 는 따로 세지 않는다 */
  const weak = keep(got(prof.weak)).filter(above([...lead, ...strong, ...pair]));
  /* 내 자료 · 경험에서 온 낱말은 분류와 상관없이 그 사람의 근거다 */
  const personal = (extra.personal ?? []).filter((x) => x.length >= 2 && head.toLowerCase().includes(x.toLowerCase()));
  /* 모집 분야에 전공 낱말이 있으면 행정 일자리가 아니다. 그 낱말이 행정 말 자체(`시설 관리`)면 치지 않는다 */
  const fieldHit = field ? [...prof.lead, ...prof.strong].some((t) => termIn(field, t) && !ADMIN!.test(t.term)) : false;
  const admin = prof.tech && adminJob && !fieldHit && !personal.length;
  const nLead = lead.length, nStrong = strong.length + personal.length, nWeak = weak.length, nPair = pair.length;
  /* 분류를 모르는 기관 공고(커리어피크 · 430)는 기관 묶음이 내 쪽이면 낱말 하나 없이도 넓게 맞춘다(공학 · 보건 계열만) */
  const orgOnly = !p.field && owned === true && prof.tech && !admin;
  const real = !admin && (nLead + nStrong > 0
    || (nWeak >= 1 && (nWeak + nPair >= 2 || owned === true))
    || orgOnly);
  const terms = [...new Set([...personal, ...[...lead, ...strong, ...weak, ...pair].map((t) => t.term)])];
  return { terms, strong: nStrong, weak: nWeak + nPair, lead: nLead, owned, admin, real };
}

/** 시험에서 표를 바꿔 넣을 때 */
export function resetJobFields(): void { CFG = null; DICT.clear(); OWNERS = null; PROFILES.clear(); ADMIN = null; GENERIC = null; }
