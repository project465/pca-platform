import { query, queryOne } from "@/lib/db";
import { postingsForMe, type MatchedPosting } from "@/lib/assistant/match";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { isGrad } from "@/lib/assistant/research";
import { stageOf } from "@/lib/assistant/stage";
import { activeCoreOrPick } from "@/lib/me-v3/platform";
import { isEntryJob, isSeniorJob, jobTitle } from "./job-title";
import { matchDomains } from "@/lib/assistant/rules";
import { fitOf, profileOf } from "./job-fit";
import { kindOf, RESEARCH_EXTRA_KINDS, type PostingKind } from "@/lib/jobs/meta";

/**
 * MAT 이 보여 줄 공고를 고른다(2026-11-02 운영 시험: 인공지능학과 학생에게 대학원 연구실 모집 8건만 보였다).
 *
 * - **학부생에게는 대학원 · 연구실 모집을 따로 묶는다.** 묶음은 공고의 종류(`posting_kind = 'grad'`)로만 정한다:
 *   **잡인더스트리 `대학원`(488) 게시판에서 온 것만**, 그리고 고용 형태가 정규직 · 계약직이면 채용으로 본다
 *   (`meta.ts` 의 `kindOf`). **요구 줄의 `석사` · `박사` 말로 묶지 않는다**(2026-11-03 버그 ③: 기업 경력 채용
 *   "생체신호처리 엔지니어(2년 이상) 채용" 이 학력 줄 때문에 대학원 묶음에 들어갔다). 석사 이상이면 묶지 않는다
 * - **교원 임용**(`faculty`)은 석사 이상에게만 보인다. **연구비 · 평가위원 · 교육**은 채용이 아니라 보이지 않는다
 *   (연구자 플랜이 `RESEARCH_EXTRA_KINDS` 로 따로 꺼낸다)
 * - **제목이 없는 공고 · 마감이 지난 공고는 보이지 않는다**(버그 ④: "제목을 읽지 못한 공고" 카드가 섰다).
 *   저장한 제목(`title`)이 먼저이고, 그 칸이 빈 옛 줄은 본문 첫 줄에서 읽는다(`jobTitle`)
 * - 커리어피크 캘린더 공고가 잡인더스트리에도 있으면(`verified_ref`) 잡인더스트리 줄만 세운다
 * - 위에 오는 차례: 내 자료 · 경험과 겹친 분야어 수(`postingsForMe`) + **전공 이름이 요구에 있음** + **신입 · 인턴 공고**
 * - **다른 전공 공고는 따로 묶는다**(2026-11-02 운영 시험: 인공지능학과 학생에게 화학시험보조 · 임상개발이 섞였다).
 *   모을 때 다른 전공으로 단 공고, 전공을 못 단 공고 가운데 내 자료 · 전공 이름과 겹치는 것이 없는 공고
 * - 점수를 화면에 내지 않는다. 왜 위에 왔는지는 칩(겹친 분야어 · 전공 · 신입)으로 보인다
 * - 회사 이름은 다루지 않는다(표에 없다)
 */
/*
 * 칸이 빈 옛 줄(`db/schema_jobs_meta.sql` 전에 담은 것)의 종류. 원문 주소의 게시판과, 488 이면 본문의
 * `고용 형태:` 줄로만 정한다(요구 줄의 학위 말은 보지 않는다). 새 줄은 모을 때 정한 `posting_kind` 를 쓴다
 */
const BOARD_KIND: Record<string, PostingKind> = {
  "488": "grad", "439": "faculty", "research-funding": "funding", "evaluator-recruitment": "evaluator", "505": "education",
};
export function legacyKind(url: string | null, lines: string[] = []): PostingKind {
  const b = (url ?? "").match(/jobindustry\.co\.kr\/([^/?#]+)\//)?.[1] ?? "";
  const emp = lines.map((l) => l.match(/고용\s?형태\s*[:：]\s*(\S+)/)?.[1]).find(Boolean) ?? null;
  return kindOf(BOARD_KIND[b] ?? "job", emp);
}

/**
 * 한 줄을 화면에 세울지와 어느 묶음인지. **제목이 없으면 null**(세우지 않는다).
 * `research` 는 "대학원 · 연구실 모집" 묶음, `hidden` 은 이 사람에게 보이지 않는 줄(연구비 · 학부생의 교원 임용).
 */
export function shownAs(
  p: { title?: string | null; raw_requirements?: string[] | null; role_code?: string | null; posting_kind?: string | null; source_url?: string | null },
  grad: boolean,
): { title: string; kind: PostingKind; research: boolean; hidden: boolean } | null {
  const title = p.title?.trim() || jobTitle(p.raw_requirements ?? [], p.role_code).title;
  if (!title) return null;
  const kind = (p.posting_kind as PostingKind | null) ?? legacyKind(p.source_url ?? null, p.raw_requirements ?? []);
  return { title, kind, research: kind === "grad", hidden: RESEARCH_EXTRA_KINDS.includes(kind) || (kind === "faculty" && !grad) };
}

const stem = (m: string | null) => (m ?? "").replace(/\s+/g, "").replace(/(공학과|공학부|학과|학부|전공|과)$/, "");

export type PickedJobs = {
  main: MatchedPosting[]; grad: MatchedPosting[]; other: MatchedPosting[]; matched: boolean;
  /**
   * 내 전공으로 단 공고지만 전공 사전 낱말 · 내 자료와 겹치는 것이 없는 공고(2026-11-02 운영 시험: 인공지능학과에
   * "과제계약직" · "육아휴직 대체인력" 이 맞는 공고로 섰다). 맞는 공고가 없을 때만 "조건을 넓힌 공고" 로 밝혀 보인다
   */
  broad: MatchedPosting[];
  /**
   * 이번 주(7일)에 들어온 공고 가운데 **내 자료 · 경험 · 전공 이름과 실제로 겹친** 것의 수. 홈 알림과 브리핑이
   * 이 한 값을 읽는다(2026-11-02 운영 시험: 홈은 "새로 맞는 공고가 있어요", 브리핑은 "아직 없어요"였다.
   * 홈은 `신입 · 인턴` 칩까지 겹침으로 셌다)
   */
  fresh: number;
  /** 모아 둔 공고(마감 전) 수. 0 이면 "아직 모으지 않았다", 아니면 "모았는데 내 전공과 맞는 것이 없다" 로 다르게 적는다 */
  pooled?: number;
};

/** 공고 표 한 줄(`v3_job_postings` 에서 MAT 이 읽는 칸). 점검 명령(`npm run mat:match`)이 견본으로 같은 꼴을 만든다 */
export type PoolRow = {
  id: string; source: string; source_url: string | null; closes_on: string | null; captured_at: string;
  region_code: string | null; raw_requirements: string[]; core_code: string | null; role_code: string | null;
  title: string | null; category: string | null; field: string | null; degree_label: string | null;
  region_label: string | null; abroad: boolean | null; posting_kind: string | null;
  /** 잡인더스트리 본문의 `모집 분야` 칸(`posting_fields->>'모집분야'`). 칸이 없는 DB 에서는 null */
  recruit_field?: string | null;
  /** 커리어피크 직군(`연구·행정`) */
  job_family?: string | null;
};

/** 공고를 고르는 데 쓰는 그 사람의 값. DB 에서 읽는 것은 `pickJobs` 가 하고, 고르기는 `rankJobs` 가 DB 없이 한다 */
export type RankCtx = {
  /** 내 자료 · 경험과 겹친 공고(`postingsForMe`). 자료가 없으면 null */
  mine: { rows: MatchedPosting[] } | null;
  /** 전공 이름(`인공지능`) */
  major: string | null;
  core: string | null;
  grad: boolean;
  /** 학과 등록부의 갈래(`SPEC_AI_DATA`)와 학과 자리(`JJU26_AI`). 모르면 비운다 */
  spec?: string | null;
  unit?: string | null;
  now?: number;
};

/** MAT 이 고르는 공고 묶음(최근 180일 · 마감 전 · 1,500건). 점검 명령도 DB 로 돌릴 때 이것을 읽는다 */
export async function jobPool(): Promise<PoolRow[]> {
  /* 카드 칸이 없는 DB(`db/schema_jobs_meta.sql` 전)에서는 빈 값으로 읽는다 */
  const sql = (meta: boolean) => `
    SELECT id::text, source, source_url, closes_on::text, captured_at::text, region_code, raw_requirements, core_code, role_code,
           ${meta ? "title, category, field, degree_label, region_label, abroad, posting_kind, posting_fields->>'모집분야' AS recruit_field, job_family"
             : "NULL::text AS title, NULL::text AS category, NULL::text AS field, NULL::text AS degree_label, NULL::text AS region_label, NULL::boolean AS abroad, NULL::text AS posting_kind, NULL::text AS recruit_field, NULL::text AS job_family"}
       FROM v3_job_postings
      WHERE captured_at > now() - interval '180 days'
        AND (closes_on IS NULL OR closes_on >= (now() AT TIME ZONE 'Asia/Seoul')::date)
        ${meta ? `AND NOT (source = 'careerpeak' AND source_ref IN (
              SELECT verified_ref FROM v3_job_postings WHERE source = 'jobindustry' AND verified_source = 'careerpeak'))` : ""}
      ORDER BY captured_at DESC LIMIT 1500`;
  return query<PoolRow>(sql(true), []).catch(() => query<PoolRow>(sql(false), [])).catch(() => [] as PoolRow[]);
}

/**
 * 학과 등록부의 갈래와 학과 자리. 마지막 응시가 그 Core 이면 그 응시에 적힌 값, 없으면 학교가 발급한 계정의 값.
 * 칸이 없는 DB(`schema_campus_entry.sql` 전)에서는 비운다
 */
async function specOf(userId: string, core: string | null): Promise<{ spec: string | null; unit: string | null }> {
  const a = await queryOne<{ core: string | null; spec: string | null; unit: string | null }>(
    `SELECT core_code AS core, specialization_code AS spec, department_code AS unit
       FROM v3_attempts WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [userId]).catch(() => null);
  if (a && a.core === core && (a.spec || a.unit)) return { spec: a.spec, unit: a.unit };
  const c = await queryOne<{ spec: string | null; unit: string | null }>(
    `SELECT specialization AS spec, department_code AS unit FROM campus_students WHERE user_id = $1::bigint`, [userId]).catch(() => null);
  return { spec: c?.spec ?? null, unit: c?.unit ?? null };
}

export async function pickJobs(userId: string, limit = 20): Promise<PickedJobs> {
  const [mine, major, stage, core] = await Promise.all([
    postingsForMe(userId, 300).catch(() => null),
    activeMajorName(userId).catch(() => null),
    stageOf(userId).catch(() => null),
    activeCoreOrPick(userId).catch(() => null),
  ]);
  const [pool, where] = await Promise.all([jobPool(), specOf(userId, core).catch(() => ({ spec: null, unit: null }))]);
  return { ...rankJobs(pool, { mine, major, core, grad: isGrad(stage), ...where }, limit), pooled: pool.length };
}

/**
 * 모아 둔 공고에서 이 사람에게 보일 것을 고른다. **DB 를 읽지 않는다**(같은 입력이면 같은 답).
 *
 * **맞는 공고는 제목 · 모집 분야로 정한다**(`job-fit.ts`): 학과의 Core · 갈래에서 온 분야어가 걸리고, 그 낱말이 공고 분류를
 * 가진 다른 전공의 낱말이 아니고, 공학 · 보건 계열에게 행정 · 사무 일자리가 아닐 때. 본문에만 나온 낱말 · 전공 이름은
 * 차례만 조금 올린다. 갈래가 정한 낱말(피지컬 AI 면 로봇 · 자율주행 · 자동화)이 걸린 공고가 맞춤 안에서 위로 온다.
 */
export function rankJobs(pool: PoolRow[], ctx: RankCtx, limit = 20): PickedJobs {
  const { mine, major, core, grad } = ctx;
  const now = ctx.now ?? Date.now();
  const prof = profileOf(core, ctx.spec ?? null, ctx.unit ?? null);
  const hitsOf = new Map((mine?.rows ?? []).map((r) => [r.id, r]));
  const st = stem(major);
  const stemTerm = st.length >= 2 ? st : null;
  /* 전공 이름의 토막(`건축·실내건축` → 건축 · 실내건축, `기계공학` → 기계). 제목 · 모집 분야에 있으면 사전 이름처럼 센다 */
  const stems = [...new Set((major ?? "").split(/[·\s]+/).map((x) => x.replace(/공학$/, "")).filter((x) => x.length >= 2))];

  const shown = pool
    .map((p) => ({ p, as: shownAs(p, grad) }))
    .filter((x): x is { p: PoolRow; as: NonNullable<ReturnType<typeof shownAs>> } => !!x.as && !x.as.hidden);
  const scored = shown.map(({ p, as: { title, kind, research } }) => {
    const text = (p.raw_requirements ?? []).join(" ");
    const m = hitsOf.get(p.id);
    const fit = fitOf(prof, { title, recruit_field: p.recruit_field, field: p.field, job_family: p.job_family },
      { personal: m?.hits ?? [], stems });
    const hits = [...fit.terms];
    let score = (m?.hits.length ?? 0) + (m?.tdHits.length ?? 0);
    /* 본문에만 나온 전공 이름 · 사전 낱말은 맞춤으로 치지 않고 차례만 올린다(2026-11-02 운영 시험: 본문의 "인공지능" 한 번으로
       "과제계약직" 공고가 인공지능학과의 첫 줄에 섰다) */
    if (stemTerm && text.includes(stemTerm)) score += 1;
    if (core && fit.real) score += Math.min(matchDomains(core, text).filter((x) => x.score >= 3).length, 2);
    score += (fit.lead ? 20 + fit.lead * 2 : 0) + fit.strong * 4 + fit.weak + (fit.owned ? 1 : 0);
    const entry = isEntryJob(text);
    if (entry) { score += 2; if (!hits.includes("신입 · 인턴")) hits.push("신입 · 인턴"); }
    /* 경력 채용은 표를 달고 뒤로(2026-11-02 운영 시험: 경력직이 학부생에게 표시 없이 섰다) */
    else if (isSeniorJob(text)) { score -= 3; hits.unshift("경력 채용"); }
    const row: MatchedPosting = {
      id: p.id, source: p.source, source_url: p.source_url, closes_on: p.closes_on, captured_at: p.captured_at,
      region_code: p.region_code, requirements: (p.raw_requirements ?? []).slice(0, 8), hits: hits.slice(0, 7), tdHits: m?.tdHits ?? [],
      role: p.role_code, title, category: p.category, field: p.field, degree_label: p.degree_label,
      region_label: p.region_label, abroad: p.abroad, posting_kind: kind,
    };
    /* 넓힌 공고: 모을 때 내 전공으로 단 공고 가운데 분류가 다른 쪽이 아니고 행정 일자리가 아닌 것 */
    const near = !fit.real && !fit.admin && fit.owned !== false && !!core && p.core_code === core;
    return { row, score, research, real: fit.real, near };
  });
  const order = (a: typeof scored[number], b: typeof scored[number]) =>
    b.score - a.score || (a.row.closes_on ?? "9999").localeCompare(b.row.closes_on ?? "9999");
  const main = scored.filter((x) => (grad || !x.research) && x.real).sort(order);
  const broad = scored.filter((x) => (grad || !x.research) && x.near).sort(order);
  const gradRows = grad ? [] : scored.filter((x) => x.research && x.real).sort(order);
  /* **무관한 공고는 보이지 않는다**(2026-11-02 운영 시험: 대웅제약 임상개발 · PCB 설계가 인공지능학과 화면에 섰다) */
  const other: typeof scored = [];
  return {
    main: main.slice(0, limit).map((x) => x.row),
    broad: main.length ? [] : broad.slice(0, limit).map((x) => x.row),
    grad: gradRows.slice(0, 10).map((x) => x.row),
    other: other.map((x) => x.row),
    matched: main.some((x) => x.score > 0),
    fresh: main.filter((x) => Date.parse(x.row.captured_at) >= now - 7 * 86_400_000).length,
  };
}
