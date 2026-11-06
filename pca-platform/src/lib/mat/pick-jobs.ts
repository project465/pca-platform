import { query } from "@/lib/db";
import { postingsForMe, type MatchedPosting } from "@/lib/assistant/match";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { isGrad } from "@/lib/assistant/research";
import { stageOf } from "@/lib/assistant/stage";
import { activeCoreOrPick } from "@/lib/me-v3/platform";
import { isEntryJob, isSeniorJob, jobTitle } from "./job-title";
import { matchDomains } from "@/lib/assistant/rules";
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
 * - 위에 오는 차례: 내 자료 · 경험과 겹친 낱말 수(`postingsForMe`) + **전공 이름이 요구에 있음** + **신입 · 인턴 공고**
 * - **다른 전공 공고는 따로 묶는다**(2026-11-02 운영 시험: 인공지능학과 학생에게 화학시험보조 · 임상개발이 섞였다).
 *   모을 때 다른 전공으로 단 공고, 전공을 못 단 공고 가운데 내 자료 · 전공 이름과 겹치는 것이 없는 공고
 * - 점수를 화면에 내지 않는다. 왜 위에 왔는지는 칩(겹친 낱말 · 전공 · 신입)으로 보인다
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
};

/** 공고 표 한 줄(`v3_job_postings` 에서 MAT 이 읽는 칸). 점검 명령(`npm run mat:match`)이 견본으로 같은 꼴을 만든다 */
export type PoolRow = {
  id: string; source: string; source_url: string | null; closes_on: string | null; captured_at: string;
  region_code: string | null; raw_requirements: string[]; core_code: string | null; role_code: string | null;
  title: string | null; category: string | null; field: string | null; degree_label: string | null;
  region_label: string | null; abroad: boolean | null; posting_kind: string | null;
};

/** 공고를 고르는 데 쓰는 그 사람의 값. DB 에서 읽는 것은 `pickJobs` 가 하고, 고르기는 `rankJobs` 가 DB 없이 한다 */
export type RankCtx = {
  /** 내 자료 · 경험과 겹친 공고(`postingsForMe`). 자료가 없으면 null */
  mine: { rows: MatchedPosting[] } | null;
  /** 전공 이름(`인공지능`) */
  major: string | null;
  core: string | null;
  grad: boolean;
  now?: number;
};

/** MAT 이 고르는 공고 묶음(최근 180일 · 마감 전 · 1,500건). 점검 명령도 DB 로 돌릴 때 이것을 읽는다 */
export async function jobPool(): Promise<PoolRow[]> {
  /* 카드 칸이 없는 DB(`db/schema_jobs_meta.sql` 전)에서는 빈 값으로 읽는다 */
  const sql = (meta: boolean) => `
    SELECT id::text, source, source_url, closes_on::text, captured_at::text, region_code, raw_requirements, core_code, role_code,
           ${meta ? "title, category, field, degree_label, region_label, abroad, posting_kind"
             : "NULL::text AS title, NULL::text AS category, NULL::text AS field, NULL::text AS degree_label, NULL::text AS region_label, NULL::boolean AS abroad, NULL::text AS posting_kind"}
       FROM v3_job_postings
      WHERE captured_at > now() - interval '180 days'
        AND (closes_on IS NULL OR closes_on >= (now() AT TIME ZONE 'Asia/Seoul')::date)
        ${meta ? `AND NOT (source = 'careerpeak' AND source_ref IN (
              SELECT verified_ref FROM v3_job_postings WHERE source = 'jobindustry' AND verified_source = 'careerpeak'))` : ""}
      ORDER BY captured_at DESC LIMIT 1500`;
  return query<PoolRow>(sql(true), []).catch(() => query<PoolRow>(sql(false), [])).catch(() => [] as PoolRow[]);
}

export async function pickJobs(userId: string, limit = 20): Promise<PickedJobs> {
  const [mine, major, stage, core] = await Promise.all([
    postingsForMe(userId, 300).catch(() => null),
    activeMajorName(userId).catch(() => null),
    stageOf(userId).catch(() => null),
    activeCoreOrPick(userId).catch(() => null),
  ]);
  const pool = await jobPool();
  return rankJobs(pool, { mine, major, core, grad: isGrad(stage) }, limit);
}

/** 모아 둔 공고에서 이 사람에게 보일 것을 고른다. **DB 를 읽지 않는다**(같은 입력이면 같은 답) */
export function rankJobs(pool: PoolRow[], ctx: RankCtx, limit = 20): PickedJobs {
  const { mine, major, core, grad } = ctx;
  const now = ctx.now ?? Date.now();
  type Row = PoolRow;
  const hitsOf = new Map((mine?.rows ?? []).map((r) => [r.id, r]));
  const st = stem(major);

  const shown = pool
    .map((p) => ({ p, as: shownAs(p, grad) }))
    .filter((x): x is { p: Row; as: NonNullable<ReturnType<typeof shownAs>> } => !!x.as && !x.as.hidden);
  const scored = shown.map(({ p, as: { title, kind, research } }) => {
    const text = (p.raw_requirements ?? []).join(" ");
    const m = hitsOf.get(p.id);
    const hits = [...(m?.hits ?? [])];
    let score = (m?.hits.length ?? 0) + (m?.tdHits.length ?? 0);
    const majorHit = st.length >= 2 && text.includes(st);
    if (majorHit) { score += 3; if (!hits.includes(st)) hits.unshift(st); }
    /* 아래에서 제목 · 모집 분야로 다시 정한다 */
    let mineField = p.core_code ? p.core_code === core : (m?.hits.length ?? 0) > 0 || majorHit;
    /* **전공 관련도가 먼저다**: 내 전공 사전의 낱말(예: 딥러닝 · PyTorch · AI 엔지니어)이 **제목 · 모집 분야**에 나오는가.
       본문에 한 번 나온 것만으로는 맞춤으로 치지 않고 순위만 조금 올린다(2026-11-02 운영 시험: 본문의 "인공지능" 한 번으로
       "과제계약직" 공고가 인공지능학과의 첫 줄에 섰다) */
    const head = [title, p.role_code ?? ""].join(" ");
    const dictHead = core ? matchDomains(core, head).filter((x) => x.score >= 3) : [];
    const dictBody = core ? matchDomains(core, text).filter((x) => x.score >= 3) : [];
    const rel = dictHead.reduce((n, x) => n + x.terms.length, 0);
    const relBody = dictBody.reduce((n, x) => n + x.terms.length, 0);
    score += rel * 4 + Math.min(relBody, 2);
    for (const x of dictHead) for (const t of x.terms) if (hits.length < 6 && !hits.includes(t)) hits.push(t);
    /* **제목 · 모집 분야가 내 전공 말이면 내 전공 공고다**(2026-11-02 운영 시험: 모을 때 다른 전공으로 단 "AI Engineer" 가
       인공지능학과의 "다른 전공 공고" 에 들어갔다). 내 자료 · 전공 이름도 제목에 있어야 맞춤으로 친다(본문에만 있으면 순위만) */
    const headLow = head.toLowerCase();
    const headUser = (m?.hits ?? []).some((h) => headLow.includes(h.toLowerCase())) || (st.length >= 2 && head.includes(st));
    if (rel > 0) mineField = true;
    const entry = isEntryJob(text);
    if (entry) { score += 2; if (!hits.includes("신입 · 인턴")) hits.push("신입 · 인턴"); }
    /* 경력 채용은 표를 달고 뒤로(2026-11-02 운영 시험: 경력직이 학부생에게 표시 없이 섰다) */
    else if (isSeniorJob(text)) { score -= 3; hits.unshift("경력 채용"); }
    const row: MatchedPosting = {
      id: p.id, source: p.source, source_url: p.source_url, closes_on: p.closes_on, captured_at: p.captured_at,
      region_code: p.region_code, requirements: (p.raw_requirements ?? []).slice(0, 8), hits, tdHits: m?.tdHits ?? [],
      role: p.role_code, title, category: p.category, field: p.field, degree_label: p.degree_label,
      region_label: p.region_label, abroad: p.abroad, posting_kind: kind,
    };
    const real = rel > 0 || headUser;
    return { row, score, research, mineField, real };
  });
  const order = (a: typeof scored[number], b: typeof scored[number]) =>
    b.score - a.score || (a.row.closes_on ?? "9999").localeCompare(b.row.closes_on ?? "9999");
  const field = scored.filter((x) => (grad || !x.research) && x.mineField);
  const main = field.filter((x) => x.real).sort(order);
  const broad = field.filter((x) => !x.real).sort(order);
  const gradRows = grad ? [] : scored.filter((x) => x.research && x.mineField).sort(order);
  /* **무관한 공고는 보이지 않는다**(2026-11-02 운영 시험: 대웅제약 임상개발 · PCB 설계가 인공지능학과 화면에 섰다) */
  const other: typeof scored = [];
  return {
    main: main.slice(0, limit).map((x) => x.row),
    broad: main.length ? [] : broad.slice(0, limit).map((x) => x.row),
    grad: gradRows.slice(0, 10).map((x) => x.row),
    other: other.map((x) => x.row),
    matched: main.some((x) => x.score > 0),
    fresh: main.filter((x) => x.real && Date.parse(x.row.captured_at) >= now - 7 * 86_400_000).length,
  };
}
