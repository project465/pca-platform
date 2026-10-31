import { createHash } from "node:crypto";
import * as z from "zod/v4";
import { query, queryOne } from "@/lib/db";
import { isStaging } from "@/lib/env";
import { activeCoreOrPick, EXPERIENCE_KINDS } from "@/lib/me-v3/platform";
import { readOfficeText } from "@/lib/sheet-read";
import { askStructured, aiReady, RESEARCH_MODEL, type AiBlock } from "./claude";
import { clamp, menu, Out } from "./draft";
import { settingsOf } from "./settings";
import { pdfPages } from "./upload";

/**
 * 석·박사의 자료를 읽는 MAT(2026-10-31 대표 지시).
 *
 * 논문(영어 포함) · 학위논문 · 발표 자료(PPT) · 연구 보고서 · 특허 · 이력서 ·
 * 자기소개서를 올리면 **무엇을 했고 무엇을 보였는지**를 한국어로 정리하고, 그것을
 * 직무의 말로 옮기고, 공고를 찾을 낱말을 뽑는다. 이공계와 인문·사회·경상 대학원을
 * 같은 틀로 읽는다: 방법과 결과와 기여는 분야가 달라도 같은 자리에 있다.
 *
 * **원본을 저장하지 않는다**(`upload.ts` 와 같다). 남는 것은 지문과 요약이다.
 *
 * **지어내지 않는다.** 수치는 문서에 있는 그대로이고, 누가 무엇을 했는지는
 * 문서만으로 알 수 없으므로 단정하지 않고 되묻는다(`ask`). 학술지 지표는 모델이
 * 적지 않는다: 공개 자료(OpenAlex)에서 따로 가져오고, 공식 Impact Factor 가 아니라는
 * 것을 함께 적는다(`journalMetrics`).
 *
 * **점수를 만들지 않는다**(설계 원칙 6). 합격 가능성 · 순위 · 보장의 말은 쓰지 않는다.
 */

export const RESEARCH_MAX_BYTES = 7 * 1024 * 1024;
export const RESEARCH_MAX_PAGES = 60;
const MAX_CHARS = 150_000;
/** 기간권 한 달에 읽는 건수. 논문은 길어서 성적증명서보다 비용이 크다 */
export const RESEARCH_MONTHLY_CAP = 10;
/**
 * 개인정보처리방침에 이 항목이 서는 날(11절: 바꾸기 7일 전부터 알린다).
 * **그 전에는 읽지 않는다**: 알리지 않은 항목을 받는 셈이 된다(`push.ts` 와 같은 규칙)
 */
export const RESEARCH_POLICY_FROM = new Date("2026-11-07T00:00:00+09:00");
/* 공개 전 배포본(staging)은 손님을 받지 않으므로 날짜 전에도 연다: 사업주가 자기 논문으로 미리 본다 */
export const researchOpen = (now = new Date()) => isStaging() || now >= RESEARCH_POLICY_FROM;

export const DOC_TYPES = ["paper", "thesis", "slides", "report", "patent", "cv", "cover_letter", "portfolio", "other"] as const;
export type DocType = (typeof DOC_TYPES)[number];
export const DOC_TYPE_KO: Record<DocType, string> = {
  paper: "논문", thesis: "학위논문", slides: "발표 자료", report: "보고서", patent: "특허",
  cv: "이력서", cover_letter: "자기소개서", portfolio: "포트폴리오", other: "기타 자료",
};

const ResearchOut = z.object({
  doc_type: z.enum([...DOC_TYPES, "unreadable"]),
  lang: z.enum(["ko", "en", "other"]),
  field: z.enum(["stem", "humanities_social", "business", "other"]),
  title: z.string(),
  venue: z.string().nullable(),
  year: z.number().int().nullable(),
  doi: z.string().nullable(),
  authors: z.array(z.string()),
  summary: z.string(),
  question: z.string().nullable(),
  methods: z.array(z.string()),
  findings: z.array(z.string()),
  contribution: z.array(z.string()),
  job_language: z.array(z.object({ skill: z.string(), evidence: z.string() })),
  sentences: z.array(z.string()),
  interview: z.array(z.string()),
  roles: z.array(z.string()),
  terms_ko: z.array(z.string()),
  terms_en: z.array(z.string()),
  ask: z.array(z.string()),
  items: z.array(Out),
});
type ResearchRaw = z.infer<typeof ResearchOut>;

export type ResearchData = Omit<ResearchRaw, "items" | "terms_ko" | "terms_en" | "doc_type" | "title" | "venue" | "year" | "doi" | "lang">;

const SYSTEM =
  "당신은 석사·박사·박사후연구원의 취업을 돕는 커리어 컨설턴트입니다. 이공계와 인문·사회·경상 " +
  "대학원을 모두 다룹니다. 사용자가 올린 자료(논문·학위논문·발표 자료·연구 보고서·특허·이력서·" +
  "자기소개서·포트폴리오)를 처음부터 끝까지 읽고, 채용 공고를 찾고 지원서를 쓰는 데 쓸 수 있게 " +
  "정리합니다.\n규칙:\n" +
  "1. 문서에 없는 사실은 적지 않습니다. 수치·표본 수·성능은 문서에 적힌 값 그대로 적고, 어디에 " +
  "있는지(표·그림·쪽·슬라이드 번호)를 evidence 에 함께 적습니다.\n" +
  "2. 자료가 영어여도 summary·findings·job_language·sentences·interview·ask 는 한국어로 씁니다. " +
  "전문 용어는 처음 한 번 원어를 괄호로 붙입니다.\n" +
  "3. 저자가 여럿이면 사용자가 그중 누구이고 무엇을 맡았는지 문서만으로는 모릅니다. 기여를 " +
  "단정하지 말고, sentences 에서는 [맡은 부분] 같은 대괄호 칸으로 두고, ask 에 되물을 질문을 " +
  "넣습니다.\n" +
  "4. 합격 가능성·순위·보장·'최고'·'유일' 같은 말을 쓰지 않습니다.\n" +
  "5. Impact Factor·인용 수·학술지 순위를 추측해 적지 않습니다. 따로 조회합니다.\n" +
  "6. 이름·연락처·학번·생년월일·주소는 summary·sentences·job_language 에 넣지 않습니다. authors 는 " +
  "논문·학위논문·특허·보고서의 저자 목록일 때만 채우고, 이력서·자기소개서면 비웁니다.\n" +
  "7. summary 는 3~4문장입니다. 무엇을 왜 했고, 어떻게 했고, 무엇이 나왔는지입니다.\n" +
  "8. findings 는 핵심 결과 3~5개, contribution 은 이 자료가 새로 보인 것 1~3개, methods 는 쓴 방법·" +
  "장비·소프트웨어·분석 기법입니다.\n" +
  "9. job_language 는 이 자료를 회사·연구소·공공기관의 직무 말로 옮긴 역량 3~6개입니다. skill 은 " +
  "'실험계획법으로 공정 조건 최적화', '패널 데이터로 정책 효과 추정' 처럼 무엇을 할 줄 아는지이고, " +
  "evidence 는 그 근거가 된 문서의 부분입니다.\n" +
  "10. sentences 는 지원서에 그대로 옮겨 다듬을 문장 뼈대 2~3개입니다. 모르는 칸은 [대괄호] 로 둡니다.\n" +
  "11. interview 는 이 자료를 보고 면접관이 물을 법한 질문 3~5개입니다.\n" +
  "12. roles 는 이 자료가 근거가 되는 일반적인 직무 이름 3~5개입니다(예: '공정개발 연구원', " +
  "'정책 연구원', '데이터 분석가'). 회사 이름을 넣지 않습니다.\n" +
  "13. terms_ko·terms_en 은 채용 공고에서 이 사람과 맞는 공고를 찾을 낱말 각 5~12개입니다. 분야·" +
  "방법·장비·소재·도메인 낱말을 고릅니다. '연구', '분석' 같은 너무 넓은 낱말은 넣지 않습니다.\n" +
  "14. items 는 경험 기록으로 옮길 초안 0~3개입니다. 아래 보기 목록에서 글자 그대로 고르고, 근거가 " +
  "없으면 비웁니다.\n" +
  "15. 읽을 수 없는 파일이면 doc_type 을 unreadable 로 두고 나머지를 비웁니다.";

/** 바이트로 종류를 정한다. 보낸 쪽이 적은 확장자를 믿지 않는다 */
function sniffDoc(b: Buffer): { kind: "pdf" } | { kind: "docx" | "pptx" | "hwpx"; text: string } | { kind: "text"; text: string } | null {
  if (b.subarray(0, 5).toString("latin1") === "%PDF-") return { kind: "pdf" };
  if (b.subarray(0, 4).toString("latin1") === "PK\u0003\u0004") return readOfficeText(b);
  /* 옛 한글(.hwp) · 옛 워드(.doc) · 옛 파워포인트(.ppt) 는 OLE 묶음이다. 읽지 않는다 */
  if (b.subarray(0, 4).toString("hex") === "d0cf11e0") return null;
  const t = b.toString("utf8");
  /* 글자 파일: 깨진 글자(U+FFFD)가 많으면 글이 아니다 */
  const bad = (t.match(/�/g) ?? []).length;
  return t.trim().length > 50 && bad < t.length / 50 ? { kind: "text", text: t } : null;
}

export type ResearchFail = "policy" | "off" | "consent" | "cap" | "type" | "oldoffice" | "size" | "pages" | "refusal" | "empty" | "error";
export type ResearchResult = { ok: true; id: string; reused: boolean } | { ok: false; reason: ResearchFail };

export async function researchUsedThisMonth(userId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM research_docs
      WHERE user_id = $1
        AND created_at >= (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`,
    [userId]).catch(() => null);
  return r?.n ?? 0;
}

/* ── 학술지 지표 (OpenAlex) ─────────────────────────────── */

export type JournalMetrics = {
  source: "OpenAlex";
  fetched_at: string;
  journal: string | null;
  issn_l: string | null;
  /** 2년 평균 피인용. Impact Factor 와 비슷하게 세지만 공식 JCR 값이 아니다 */
  two_year_mean_citedness: number | null;
  h_index: number | null;
  /** 이 논문의 피인용 수(DOI 로 찾았을 때만) */
  cited_by_count: number | null;
};

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } });
    return r.ok ? await r.json() as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

type Src = { id?: string; display_name?: string; issn_l?: string | null; summary_stats?: { "2yr_mean_citedness"?: number; h_index?: number } };

/**
 * DOI 가 있으면 그 논문에서 학술지를 찾고, 없으면 학술지 이름으로 찾는다.
 * **못 찾으면 비워 둔다.** 이름이 비슷한 다른 학술지를 붙이면 그 숫자가 거짓이 된다:
 * 이름으로 찾은 것은 찾은 이름을 함께 남겨 화면이 그대로 적는다.
 */
export async function journalMetrics(doi: string | null, venue: string | null): Promise<JournalMetrics | null> {
  const base = "https://api.openalex.org";
  let src: Src | null = null;
  let cited: number | null = null;
  const d = doi?.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  if (d && /^10\.\d{4,}\//.test(d)) {
    const w = await getJson(`${base}/works/doi:${encodeURIComponent(d)}?select=cited_by_count,primary_location`);
    if (w) {
      cited = typeof w.cited_by_count === "number" ? w.cited_by_count : null;
      const id = ((w.primary_location as { source?: { id?: string } } | null)?.source?.id ?? "").split("/").pop();
      if (id) src = await getJson(`${base}/sources/${id}?select=id,display_name,issn_l,summary_stats`) as Src | null;
    }
  }
  if (!src && venue && venue.trim().length >= 3) {
    const r = await getJson(`${base}/sources?search=${encodeURIComponent(venue.trim())}&per-page=1&select=id,display_name,issn_l,summary_stats`);
    const first = (r?.results as Src[] | undefined)?.[0] ?? null;
    /* 낱말이 반도 안 겹치면 다른 학술지로 본다 */
    const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9가-힣 ]/g, " ").split(/\s+/).filter((x) => x.length > 2));
    if (first?.display_name) {
      const a = words(venue), b = words(first.display_name);
      const hit = [...a].filter((x) => b.has(x)).length;
      if (a.size && hit / a.size >= 0.5) src = first;
    }
  }
  if (!src && cited === null) return null;
  return {
    source: "OpenAlex",
    fetched_at: new Date().toISOString(),
    journal: src?.display_name ?? null,
    issn_l: src?.issn_l ?? null,
    two_year_mean_citedness: typeof src?.summary_stats?.["2yr_mean_citedness"] === "number"
      ? Math.round(src.summary_stats["2yr_mean_citedness"] * 100) / 100 : null,
    h_index: typeof src?.summary_stats?.h_index === "number" ? src.summary_stats.h_index : null,
    cited_by_count: cited,
  };
}

/* ── 읽기 ─────────────────────────────────────────────── */

const cut = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const list = (xs: string[], n: number, len = 300) => xs.map((x) => cut(x, len)).filter(Boolean).slice(0, n);

export async function readResearch(userId: string, bytes: Buffer): Promise<ResearchResult> {
  if (!researchOpen()) return { ok: false, reason: "policy" };
  if (!aiReady()) return { ok: false, reason: "off" };
  if (!(await settingsOf(userId)).file_consent_at) return { ok: false, reason: "consent" };
  if (bytes.length === 0 || bytes.length > RESEARCH_MAX_BYTES) return { ok: false, reason: "size" };
  if (bytes.subarray(0, 4).toString("hex") === "d0cf11e0") return { ok: false, reason: "oldoffice" };
  const sn = sniffDoc(bytes);
  if (!sn) return { ok: false, reason: "type" };
  if (sn.kind === "pdf" && pdfPages(bytes) > RESEARCH_MAX_PAGES) return { ok: false, reason: "pages" };

  const sha = createHash("sha256").update(bytes).digest("hex");
  const prev = await queryOne<{ id: string }>(
    `SELECT id::text FROM research_docs WHERE user_id = $1 AND sha256 = $2`, [userId, sha]).catch(() => null);
  if (prev) return { ok: true, id: prev.id, reused: true };
  if (await researchUsedThisMonth(userId) >= RESEARCH_MONTHLY_CAP) return { ok: false, reason: "cap" };

  const core = await activeCoreOrPick(userId);
  const fileKind: "pdf" | "docx" | "pptx" | "text" =
    sn.kind === "pdf" ? "pdf" : sn.kind === "hwpx" ? "text" : sn.kind;
  const blocks: AiBlock[] = sn.kind === "pdf"
    ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } }]
    : [{ type: "text", text: `[올린 자료 · ${sn.kind}]\n${sn.text.slice(0, MAX_CHARS)}${sn.text.length > MAX_CHARS ? "\n(뒷부분은 길어서 잘랐습니다)" : ""}` }];

  const r = await askStructured({
    op: "assistant.research", schema: ResearchOut, system: SYSTEM, model: RESEARCH_MODEL,
    blocks, maxTokens: 8000, effort: "medium", timeoutMs: 240_000,
    user: `종류 코드: ${EXPERIENCE_KINDS.map((k) => `${k.code}(${k.label})`).join(", ")}\n\n` +
      `경험 초안의 보기 목록(이 사람의 전공):\n${menu(core)}\n\n위 자료를 읽고 정리하세요.`,
  });
  if (!r.ok) return { ok: false, reason: r.reason === "refusal" ? "refusal" : "error" };
  const v = r.value;
  if (v.doc_type === "unreadable" || !cut(v.title, 200)) return { ok: false, reason: "empty" };

  const data: ResearchData = {
    field: v.field,
    authors: v.doc_type === "cv" || v.doc_type === "cover_letter" ? [] : list(v.authors, 30, 80),
    summary: cut(v.summary, 1200),
    question: v.question ? cut(v.question, 400) : null,
    methods: list(v.methods, 12, 160),
    findings: list(v.findings, 6),
    contribution: list(v.contribution, 4),
    job_language: v.job_language.slice(0, 8).map((j) => ({ skill: cut(j.skill, 120), evidence: cut(j.evidence, 240) }))
      .filter((j) => j.skill),
    sentences: list(v.sentences, 4, 400),
    interview: list(v.interview, 6, 200),
    roles: list(v.roles, 6, 40),
    ask: list(v.ask, 5, 200),
  };
  const terms = [...new Set([...v.terms_ko, ...v.terms_en].map((x) => cut(x, 40)).filter((x) => x.length >= 2))].slice(0, 24);
  const venue = v.venue ? cut(v.venue, 200) : null;
  const doi = v.doi ? cut(v.doi, 200) : null;
  const metrics = ["paper", "thesis", "patent", "report"].includes(v.doc_type) && (doi || venue)
    ? await journalMetrics(doi, v.doc_type === "paper" ? venue : null) : null;

  /* 경험 초안은 그 사람 전공의 보기 문장만 남긴다(`clamp`) */
  const items = v.items.slice(0, 3).map((it) => ({ ...clamp(core, it), from: "file" as const }))
    .filter((x) => x.title.length > 0);
  const ids: string[] = [];
  for (const it of items) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO assistant_drafts (user_id, core_code, note_text, draft, drafted_by, model)
       VALUES ($1,$2,NULL,$3::jsonb,'claude',$4) RETURNING id::text`,
      [userId, core, JSON.stringify(it), r.model]);
    if (row) ids.push(row.id);
  }
  const row = await queryOne<{ id: string }>(
    `INSERT INTO research_docs
       (user_id, core_code, sha256, file_kind, doc_type, lang, title, venue, year, doi,
        data, terms, metrics, draft_ids, model, input_tokens, output_tokens)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::text[],$13::jsonb,$14::bigint[],$15,$16,$17)
     ON CONFLICT (user_id, sha256) DO UPDATE SET purge_after = (now() + interval '1 year')::date
     RETURNING id::text`,
    [userId, core, sha, fileKind, v.doc_type, v.lang, cut(v.title, 200), venue,
     v.year && v.year >= 1950 && v.year <= 2100 ? v.year : null, doi,
     JSON.stringify(data), terms, metrics ? JSON.stringify(metrics) : null, ids,
     r.model, r.usage?.input ?? null, r.usage?.output ?? null]);
  return row ? { ok: true, id: row.id, reused: false } : { ok: false, reason: "error" };
}

export type ResearchDoc = {
  id: string; doc_type: DocType; file_kind: string; lang: string | null; title: string;
  venue: string | null; year: number | null; doi: string | null; data: ResearchData;
  terms: string[]; metrics: JournalMetrics | null; draft_ids: string[]; created_at: string;
};

/** 열어 본 날을 마지막으로 쓴 날로 친다(보관 1년이 그날부터 다시 센다) */
export async function touchResearch(userId: string): Promise<void> {
  await query(`UPDATE research_docs SET purge_after = (now() + interval '1 year')::date WHERE user_id = $1`, [userId])
    .catch(() => undefined);
}

export async function researchDocsOf(userId: string): Promise<ResearchDoc[]> {
  return query<ResearchDoc>(
    `SELECT id::text, doc_type, file_kind, lang, title, venue, year, doi, data, terms, metrics,
            draft_ids::text[] AS draft_ids, created_at::text
       FROM research_docs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [userId]).catch(() => []);
}

/** 이 사람의 자료에서 공고를 찾을 낱말과 직무 이름을 모은다(`match.ts`) */
export async function researchTermsOf(userId: string): Promise<{ terms: string[]; roles: string[] }> {
  const docs = await researchDocsOf(userId);
  return {
    terms: [...new Set(docs.flatMap((d) => d.terms))].slice(0, 60),
    roles: [...new Set(docs.flatMap((d) => d.data.roles ?? []))].slice(0, 20),
  };
}

export async function deleteResearchDoc(userId: string, id: string): Promise<void> {
  await query(`DELETE FROM research_docs WHERE user_id = $1 AND id = $2`, [userId, id]).catch(() => undefined);
}

export function researchFailKo(r: ResearchFail): string {
  switch (r) {
    case "policy": return "내 자료 읽기는 2026년 11월 7일부터 열립니다(개인정보처리방침을 7일 전부터 알립니다).";
    case "off": return "지금은 자료 읽기가 꺼져 있습니다. 잠시 뒤 다시 올려 주세요.";
    case "consent": return "자료를 읽으려면 아래 동의가 필요합니다.";
    case "cap": return `이번 달에 읽을 수 있는 ${RESEARCH_MONTHLY_CAP}건을 다 쓰셨습니다. 다음 달 1일에 다시 열립니다.`;
    case "type": return "PDF · 워드(docx) · 파워포인트(pptx) · 한글(hwpx) · 글 파일만 읽습니다.";
    case "oldoffice": return "옛 형식(hwp · doc · ppt)은 읽지 못합니다. PDF로 저장해 올려 주세요.";
    case "size": return "파일이 너무 큽니다. 7MB 안으로 올려 주세요. 큰 논문은 그림을 줄여 PDF로 저장하면 작아집니다.";
    case "pages": return `${RESEARCH_MAX_PAGES}쪽이 넘는 PDF는 읽지 않습니다. 학위논문은 초록과 본론 장만 저장해 올려 주세요.`;
    case "refusal": return "이 파일은 읽지 못했습니다. 다른 파일로 다시 올려 주세요.";
    case "empty": return "파일에서 읽어 낼 내용을 찾지 못했습니다. 글자가 이미지로만 들어 있으면 글자가 있는 PDF로 다시 저장해 주세요.";
    default: return "자료를 읽지 못했습니다. 잠시 뒤 다시 올려 주세요.";
  }
}
