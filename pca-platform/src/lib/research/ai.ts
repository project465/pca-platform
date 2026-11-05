import * as z from "zod/v4";
import { query, queryOne } from "@/lib/db";
import { askStructured, type AiFail } from "@/lib/assistant/claude";
import type { DegreeData, MethodData, PaperData, PatentData, ProjectData, ResearchItem } from "./profile";
import type { PostingForMatch } from "./match";

/**
 * **2차: 공고 요건을 하나씩, 입력한 연구 이력과 맞춰 읽는다**(AI, 본인이 누른 공고만).
 *
 * 문구 규칙(2026-11-05 대표 "AI 티 나면 안 되고 전문성이 보여야 한다"). 요건마다 네 가지를 적는다.
 *
 *   (가) 공고 원문 요건을 따옴표로 인용한다(`quote`). **원문에 없는 인용은 버린다**(`cleanReading`)
 *   (나) 필수인지 우대인지(`kind`)와, 그래서 지원할 수 있는지를 사실로 적는다(`eligibility`)
 *   (다) 입력한 논문 · 과제 · 특허를 이름 · 연도 · 역할 · 참여율 · 사업비 구간 그대로 적는다(`record`, 근거 번호 `evidence`)
 *   (라) 서류에 적을 사실 항목을 제시한다(`write`: 세부과제 총괄, 연차 · 단계 보고서 작성, 발명자 순서 등)
 *
 * 쓰지 않는 말: 강점 · 약점 딱지, `보완하세요` · `어필하세요`, 근거 없는 평가, 공고 전체를 한 줄로 단정하는 요약.
 * 모델이 그런 문장을 내면 그 문장만 걷는다(`stripBanned`). 합격 가능성 · 점수를 말하지 않는다.
 *
 * 비용: 공고 분석 칸(`assistant.posting`)으로 센다. 기간권 30일 칸 수와 하루 총액(`ai-budget.ts`) 안에서만 부른다.
 * **이용권이 없는 분은 1건 무료**(2026-11-05 대표 결정: 공고 1건 요건별 판단과 근거는 무료, 여러 공고 깊은 분석은 유료).
 */

export const OP = "assistant.posting.research";
/** 이용권 없이 볼 수 있는 요건 판단 공고 수(계정마다, 기간과 상관없이) */
export const FREE_READINGS = 1;

const Req = z.object({
  quote: z.string(),
  kind: z.enum(["required", "preferred", "unclear"]),
  eligibility: z.string(),
  record: z.string(),
  evidence: z.array(z.string()),
  write: z.array(z.string()),
});
const Out = z.object({ requirements: z.array(Req) });
export type AiRequirement = z.infer<typeof Req>;
export type AiReading = z.infer<typeof Out>;

const SYSTEM_KO = [
  "당신은 연구직 채용 공고를 읽고, 지원자가 입력한 연구 이력과 요건을 하나씩 대조해 사실을 정리합니다.",
  "1. 공고의 지원 자격 · 우대 사항 · 모집 분야에서 요건을 6개까지 고릅니다. quote 에는 공고 글을 한 글자도 바꾸지 않고 그대로 옮깁니다. 공고에 없는 요건을 만들지 않습니다.",
  "2. kind 는 required(필수) · preferred(우대) · unclear(공고에서 구분이 안 됨) 가운데 하나입니다. '우대', '가산' 이 붙은 요건은 preferred 입니다.",
  "3. eligibility 는 지원 가능 여부를 사실로 적는 한두 문장입니다. 우대 요건이면 '우대이므로 지원 자격에는 영향이 없습니다.' 로 시작합니다. 필수 요건이면 입력한 이력으로 요건을 채우는지, 이력만으로는 알 수 없는지를 적습니다.",
  "4. record 는 입력한 이력을 그대로 옮긴 문장입니다. 과제명 · 논문 제목 · 연도 · 역할(연구책임자 · 참여연구원 · 실무 담당 · 제1저자 · 교신저자 · 공저자) · 참여율 · 사업비 구간 · 발명자 순서를 목록에 적힌 값 그대로 씁니다. 목록에 없는 값은 쓰지 않습니다. 해당 이력이 없으면 '입력하신 이력에는 이 요건에 해당하는 항목이 없습니다.' 라고 씁니다.",
  "5. evidence 에는 근거가 된 이력 줄의 번호(예: R12)만 넣습니다.",
  "6. write 에는 지원서 · 연구 경력서에 적을 사실 항목을 0~2개 넣습니다. 예: '세부과제 총괄 여부', '연차 · 단계 보고서를 직접 작성했는지', '특허 발명자 순서'. 이력에서 확인되지 않은 일은 '…을 맡으셨다면 그 사실을 경력서에 적어 두세요.' 처럼 조건으로 씁니다.",
  "7. 쓰지 않는 말: 강점, 약점, 보완하세요, 어필하세요, 경쟁력, 돋보입니다, 훌륭합니다, 적합합니다, 가능성이 높습니다. 근거 없는 평가와 공고 전체를 한 줄로 단정하는 요약을 쓰지 않습니다.",
  "8. 존댓말 '-습니다' 체로, 짧은 문장으로 씁니다.",
  "예시(우대 요건): quote '국가R&D 연구책임자 수행 경험', kind preferred, eligibility '우대이므로 지원 자격에는 영향이 없습니다.', record '입력하신 과제 3건은 모두 참여연구원(참여율 30~50%)입니다.', write ['OO과제에서 2세부 실무를 맡고 단계평가 보고서를 직접 쓰셨다면 그 사실을 경력서에 적어 두세요.']",
].join("\n");
const SYSTEM_EN = SYSTEM_KO + "\n9. Write eligibility, record and write in plain English. Keep quote in the posting's original language.";

/* 모델에 넘길 때 값을 화면과 같은 말로(사업비 구간 · 역할을 그대로 인용하게) */
const KO = {
  budget: { lt1: "1억 원 미만", "1to5": "1억~5억 원", "5to10": "5억~10억 원", "10to50": "10억~50억 원", gte50: "50억 원 이상", unknown: "모름" },
  role: { lead: "연구책임자", member: "참여연구원", staff: "실무 담당" },
  author: { first: "제1저자", corresponding: "교신저자", co: "공저자" },
  patent: { filed: "출원", registered: "등록" },
  level: { use: "사용", operate: "운영", develop: "개발" },
  degree: { bachelor: "학사", master: "석사", phd: "박사", postdoc: "박사후" },
  dstatus: { done: "마침", in_progress: "과정 중" },
} as const;

/** 이력 줄 하나를 한 줄 글로. 번호(R + id)를 앞에 붙인다 */
export function itemLine(it: Pick<ResearchItem, "id" | "kind" | "data">): string {
  const f: string[] = [];
  const add = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== "") f.push(`${k}: ${v}`); };
  switch (it.kind) {
    case "paper": {
      const d = it.data as PaperData;
      add("논문", d.title); add("게재", d.venue); add("연도", d.year); add("저자 역할", d.authorRole && KO.author[d.authorRole]);
      add("분야 낱말", d.keywords?.join(", ")); break;
    }
    case "project": {
      const d = it.data as ProjectData;
      add("과제", d.title); add("부처·기관", d.agency); add("사업", d.program); add("기간", d.from || d.to ? `${d.from ?? ""}~${d.to ?? ""}` : "");
      add("총사업비", d.budget && KO.budget[d.budget]); add("역할", d.role && KO.role[d.role]);
      add("참여율", d.participation ? `${d.participation}%` : ""); add("맡은 일", d.tasks?.replace(/\n+/g, " / "));
      add("결과물", d.outputs); add("분야 낱말", d.keywords?.join(", ")); break;
    }
    case "patent": {
      const d = it.data as PatentData;
      add("특허", d.title); add("상태", d.status && KO.patent[d.status]); add("연도", d.year);
      add("발명자 순서", d.inventorOrder); add("분야 낱말", d.keywords?.join(", ")); break;
    }
    case "method": {
      const d = it.data as MethodData;
      add("장비·기법", d.name); add("다뤄 본 정도", d.level && KO.level[d.level]); add("메모", d.note); break;
    }
    case "degree": {
      const d = it.data as DegreeData;
      add("학위", KO.degree[d.level]); add("마침 여부", d.status && KO.dstatus[d.status]); add("전공", d.major);
      add("지도교수 분야", d.advisorField); add("학위논문", d.thesisTitle); add("연도", d.year); break;
    }
  }
  return `R${it.id} | ${f.join(" | ")}`.slice(0, 800);
}

export function postingBlock(p: PostingForMatch): string {
  const f = p.posting_fields ?? {};
  return [
    `제목: ${p.title ?? ""}`, p.category ? `분류: ${p.category}` : "", p.field ? `분야: ${p.field}` : "",
    p.degree_label ? `학위: ${p.degree_label}` : "",
    ...Object.entries(f).filter(([k]) => !/접수기간|근무지/.test(k)).map(([k, v]) => `${k}: ${v}`),
    ...(p.raw_requirements ?? []).slice(0, 30).map((x) => `- ${x}`),
  ].filter(Boolean).join("\n").slice(0, 6000);
}

/* ── 모델 답 거르기(순수) ───────────────────────────────── */

/** 쓰지 않는 말. 이 말이 든 문장은 걷는다 */
export const BANNED = /강점|약점|보완하(?:세요|십시오|시기)|어필|경쟁력|돋보|훌륭|탁월|적합합니다|적합한 인재|가능성이 높|유리합니다|불리합니다|strength|weakness|stand out|showcase|highlight your/i;

/** 문장으로 나눠 쓰지 않는 말이 든 문장만 뺀다 */
export function stripBanned(s: string): string {
  return (s ?? "").split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x && !BANNED.test(x)).join(" ").trim();
}

const norm = (s: string) => (s ?? "").replace(/[\s'"‘’“”「」『』]/g, "").toLowerCase();

/**
 * 모델 답을 저장할 꼴로 거른다.
 * - 인용이 공고 글에 그대로 없으면 그 요건을 버린다(지어낸 요건)
 * - 넘기지 않은 이력 번호는 버린다
 * - 쓰지 않는 말이 든 문장을 걷는다. 지원 가능 여부 문장이 비면 종류에 맞는 사실 문장으로 채운다
 */
export function cleanReading(r: AiReading, postingText: string, ids: string[]): AiReading {
  const ok = new Set(ids.map((x) => `R${x}`));
  const hay = norm(postingText);
  const out: AiRequirement[] = [];
  for (const q of r.requirements.slice(0, 6)) {
    const quote = (q.quote ?? "").replace(/^['"‘“]+|['"’”]+$/g, "").trim();
    if (!quote || !hay.includes(norm(quote))) continue;
    const eligibility = stripBanned(q.eligibility) || (q.kind === "preferred"
      ? "우대이므로 지원 자격에는 영향이 없습니다."
      : "입력하신 이력만으로는 이 요건을 채우는지 알 수 없습니다. 공고 원문의 기준을 확인하세요.");
    out.push({
      quote, kind: q.kind, eligibility, record: stripBanned(q.record),
      evidence: q.evidence.map((e) => e.trim()).filter((e) => ok.has(e)),
      write: q.write.map(stripBanned).filter(Boolean).slice(0, 2),
    });
  }
  return { requirements: out };
}

/** 지금까지 본 요건 판단 공고 수(성공한 호출만). 이용권이 없는 분의 무료 1건을 센다 */
export async function readingsUsed(userId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM assistant_ai_calls WHERE user_id = $1 AND op = $2 AND outcome = 'ok'`, [userId, OP]).catch(() => null);
  return r?.n ?? 0;
}

export async function readMatch(userId: string, postingId: string, items: ResearchItem[], lang: "ko" | "en"):
  Promise<{ ok: true } | { ok: false; reason: AiFail | "none" }> {
  const p = await queryOne<PostingForMatch>(
    `SELECT id::text, title, field, category, degree_min, degree_label, posting_kind, posting_fields, raw_requirements
       FROM v3_job_postings WHERE id = $1`, [postingId]).catch(() => null);
  if (!p || !items.length) return { ok: false, reason: "none" };
  const block = postingBlock(p);
  const r = await askStructured({
    op: OP, schema: Out, effort: "medium", userId, style: lang,
    system: lang === "en" ? SYSTEM_EN : SYSTEM_KO,
    user: `## 공고\n${block}\n\n## 입력한 연구 이력\n${items.slice(0, 40).map(itemLine).join("\n")}`,
    maxTokens: 3500,
  });
  if (!r.ok) return { ok: false, reason: r.reason };
  const clean = cleanReading(r.value, block, items.map((i) => i.id));
  await query(`UPDATE research_matches SET ai = $3, ai_at = now() WHERE user_id = $1 AND posting_id = $2`,
    [userId, postingId, JSON.stringify(clean)]);
  return { ok: true };
}
