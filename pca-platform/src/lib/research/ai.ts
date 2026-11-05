import * as z from "zod/v4";
import { query, queryOne } from "@/lib/db";
import { askStructured, type AiFail } from "@/lib/assistant/claude";
import type { ItemData, ItemKind, ResearchItem } from "./profile";
import type { PostingForMatch } from "./match";

/**
 * **2차: 공고 요건을 내 연구 이력과 하나씩 맞춰 읽는다**(AI, 본인이 누른 공고만).
 *
 * - 비용 한도: 공고 분석 칸(`assistant.posting`)과 같이 센다. 기간권 30일 칸 수와 하루 총액(`ai-budget.ts`)을
 *   넘으면 부르지 않는다. 기간권이 있고 AI 동의를 한 사람만 부른다(화면 · 동작이 막는다)
 * - **지어내지 않는다.** 근거는 넘긴 이력 줄의 번호로만 대고, 넘기지 않은 번호는 버린다.
 *   합격 가능성 · 점수를 말하지 않는다. 공고 글에 없는 요건을 만들지 않는다
 * - 넘기는 것: 공고 제목 · 분류 · 학위 · 모집 분야 · 지원 자격 · 요구 줄, 이력 줄의 칸 값.
 *   이름 · 연락처는 이력 칸에 없다(받지 않는다)
 */

export const OP = "assistant.posting.research";

const Out = z.object({
  requirements: z.array(z.object({
    text: z.string(),
    status: z.enum(["met", "partial", "missing"]),
    evidence: z.array(z.string()),
    note: z.string(),
  })),
  summary: z.string(),
});
export type AiReading = z.infer<typeof Out>;

const SYSTEM_KO = [
  "당신은 석사 · 박사 연구자의 채용 공고 요건을 읽어 주는 도우미입니다.",
  "1. 공고 글에 적힌 지원 자격 · 우대 사항 · 모집 분야만 요건으로 나눕니다. 공고에 없는 요건을 만들지 않습니다. 요건은 8개까지입니다.",
  "2. 요건마다 내 연구 이력 줄과 맞춰 met(충족) · partial(일부) · missing(부족) 가운데 하나를 고릅니다.",
  "3. evidence 에는 근거가 된 이력 줄의 번호(예: R12)만 넣습니다. 근거가 없으면 비웁니다. 목록에 없는 번호를 쓰지 않습니다.",
  "4. note 는 한 문장입니다. 충족이면 어느 이력이 어떻게 맞는지, 부족이면 지원 전에 확인하거나 보탤 것을 적습니다.",
  "5. 합격 가능성 · 점수 · 순위를 말하지 않습니다. 이력에 없는 경력 · 실적 · 숫자를 짐작해 넣지 않습니다.",
  "6. summary 는 두 문장입니다. 맞는 점 하나와 확인할 점 하나를 적습니다.",
  "7. 짧은 문장으로 씁니다. 비유와 관용구를 쓰지 않습니다.",
].join("\n");
const SYSTEM_EN = SYSTEM_KO + "\n8. Write text, note and summary in plain English.";

const KIND_KO: Record<ItemKind, string> = { paper: "논문", project: "연구과제", patent: "특허", method: "장비·기법", degree: "학위" };

/** 이력 줄 하나를 한 줄 글로. 번호(R + id)를 앞에 붙인다 */
export function itemLine(it: Pick<ResearchItem, "id" | "kind" | "data">): string {
  const d = it.data as ItemData & Record<string, unknown>;
  const parts = Object.entries(d)
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(", ") : String(v)}`);
  return `R${it.id} [${KIND_KO[it.kind]}] ${parts.join("; ")}`.slice(0, 700);
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

/** 넘기지 않은 번호를 버린다 */
export function keepKnownEvidence(r: AiReading, ids: string[]): AiReading {
  const ok = new Set(ids.map((x) => `R${x}`));
  return { ...r, requirements: r.requirements.slice(0, 8).map((q) => ({ ...q, evidence: q.evidence.filter((e) => ok.has(e.trim())) })) };
}

export async function readMatch(userId: string, postingId: string, items: ResearchItem[], lang: "ko" | "en"):
  Promise<{ ok: true } | { ok: false; reason: AiFail | "none" }> {
  const p = await queryOne<PostingForMatch>(
    `SELECT id::text, title, field, category, degree_min, degree_label, posting_kind, posting_fields, raw_requirements
       FROM v3_job_postings WHERE id = $1`, [postingId]).catch(() => null);
  if (!p || !items.length) return { ok: false, reason: "none" };
  const r = await askStructured({
    op: OP, schema: Out, effort: "medium", userId, style: lang,
    system: lang === "en" ? SYSTEM_EN : SYSTEM_KO,
    user: `## 공고\n${postingBlock(p)}\n\n## 내 연구 이력\n${items.slice(0, 40).map(itemLine).join("\n")}`,
    maxTokens: 3000,
  });
  if (!r.ok) return { ok: false, reason: r.reason };
  const clean = keepKnownEvidence(r.value, items.map((i) => i.id));
  await query(`UPDATE research_matches SET ai = $3, ai_at = now() WHERE user_id = $1 AND posting_id = $2`,
    [userId, postingId, JSON.stringify(clean)]);
  return { ok: true };
}
