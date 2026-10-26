import * as z from "zod/v4";
import { query, queryOne } from "@/lib/db";
import { EXPERIENCE_KINDS, EXPERIENCE_KINDS_EN, activeCoreOrPick } from "@/lib/me-v3/platform";
import { wsLang } from "@/lib/me-v3/ws-lang";
import { aiFailEn, aiFailKo, askStructured, type AiFail } from "./claude";
import { catalog, type MatLang } from "./catalog";
import { draftByRules } from "./rules";
import { aiConsented } from "./settings";

/**
 * 적어 주신 메모를 경험 추가 폼의 **보기**로 옮긴다.
 *
 * **저장하지 않는다.** 여기서 나오는 것은 미리 켜 둘 칸의 묶음이고, 사람이
 * 경험 추가 화면에서 보고 고친 뒤 직접 저장한다. 그래서 저장 경로와
 * 판정은 그대로다(`saveExperience` · `autoRecompute`).
 *
 * **보기 밖의 말을 만들지 않는다.** 커리어메트리는 고른 것으로 판단하는
 * 서비스라, 문제와 판단과 결과물과 견준 대상은 **그 영역의 체크리스트에
 * 있는 문장**만 남긴다. 경험 추가 화면이 세우는 것과 같은 범위(문제 6 ·
 * 판단 8)만 건네서, 켜 둔 칸이 화면에 없어 조용히 빠지는 일이 없다.
 *
 * **모자란 것을 지어내지 않는다.** 메모에 없는 것은 비워 두고, 무엇을
 * 더 적으면 좋은지를 질문으로 돌려준다.
 */

export type DraftValue = {
  kind: string | null;
  title: string;
  td: string[];
  problems: string[];
  decisions: string[];
  artifacts: string[];
  verifications: string[];
  /** 메모에 없어 사람이 채워야 하는 것 */
  ask: string[];
  /** 어디서 옮겨 왔나. 비어 있으면 메모다 */
  from?: "memo" | "file";
};

export const KINDS = EXPERIENCE_KINDS.map((k) => k.code) as [string, ...string[]];

export const Out = z.object({
  kind: z.enum(KINDS).nullable(),
  title: z.string(),
  domains: z.array(z.string()),
  problems: z.array(z.string()),
  decisions: z.array(z.string()),
  artifacts: z.array(z.string()),
  verifications: z.array(z.string()),
  ask: z.array(z.string()),
});

const SYSTEM =
  "당신은 대학생이 자기 경험을 정리하도록 돕는 진로 상담사입니다. 학생이 편하게 적은 " +
  "메모를 읽고, 아래 보기 목록에서 그 메모와 맞는 것만 고릅니다.\n규칙:\n" +
  "1. domains 는 기술영역 코드 가운데 가장 가까운 것 최대 2개입니다.\n" +
  "2. problems·decisions·artifacts·verifications 는 고른 영역의 보기 문장을 글자 그대로 " +
  "옮겨 적습니다. 메모에 근거가 없는 보기는 고르지 않습니다. 비어 있어도 됩니다.\n" +
  "3. kind 는 종류 코드 하나입니다. 알 수 없으면 null 입니다.\n" +
  "4. title 은 학생이 나중에 알아볼 수 있는 한 줄(30자 안)입니다. 메모에 없는 수치나 " +
  "성과를 만들지 않습니다.\n" +
  "5. ask 는 메모에 빠져 있어 학생에게 되물을 짧은 질문 최대 3개입니다. 존댓말로 적습니다.";

/** 영어 작업공간. 보기 문장은 영어 원고 그대로 옮겨 적게 한다(경험 추가 화면의 보기와 같은 글) */
const SYSTEM_EN =
  "You help university students organize their own experience. Read the student's informal " +
  "note and pick only the options from the list below that match it.\n" +
  "Rules:\n" +
  "1. domains: up to 2 of the closest technical-area codes.\n" +
  "2. problems, decisions, artifacts, verifications: copy option sentences from the chosen areas " +
  "exactly as written. Do not pick an option the note gives no basis for. Empty is fine.\n" +
  "3. kind: one kind code, or null if unclear.\n" +
  "4. title: one line (under 60 characters) the student will recognize later. Do not invent " +
  "numbers or results that are not in the note.\n" +
  "5. ask: up to 3 short, polite questions about what the note leaves out.";

export function menu(core: string, lang: MatLang = "ko"): string {
  if (lang === "en") {
    return catalog(core, "en").map((d) => [
      `## ${d.code} ${d.name}`,
      `Problem: ${d.checklist.J1.slice(0, 6).join(" | ")}`,
      `Decision: ${d.checklist.J3.slice(0, 8).join(" | ")}`,
      `Deliverable: ${d.artifacts.join(" | ")}`,
      `Checked against: ${d.verify.join(" | ")}`,
    ].join("\n")).join("\n\n");
  }
  return catalog(core).map((d) => [
    `## ${d.code} ${d.name}`,
    `문제: ${d.checklist.J1.slice(0, 6).join(" | ")}`,
    `판단: ${d.checklist.J3.slice(0, 8).join(" | ")}`,
    `결과물: ${d.artifacts.join(" | ")}`,
    `견준 대상: ${d.verify.join(" | ")}`,
  ].join("\n")).join("\n\n");
}

/** 목록에 있는 것만 남긴다. **Claude 가 고른 것을 그대로 믿지 않는다** */
export function clamp(core: string, raw: z.infer<typeof Out>, lang: MatLang = "ko"): DraftValue {
  const cat = catalog(core, lang);
  const td = raw.domains.filter((c) => cat.some((d) => d.code === c)).slice(0, 2);
  const ds = cat.filter((d) => td.includes(d.code));
  const keep = (xs: string[], pool: string[]) =>
    [...new Set(xs.filter((x) => pool.includes(x)))];
  return {
    kind: raw.kind && (KINDS as string[]).includes(raw.kind) ? raw.kind : null,
    title: raw.title.replace(/\s+/g, " ").trim().slice(0, 60),
    td,
    problems: keep(raw.problems, ds.flatMap((d) => d.checklist.J1.slice(0, 6))),
    decisions: keep(raw.decisions, ds.flatMap((d) => d.checklist.J3.slice(0, 8))),
    artifacts: keep(raw.artifacts, ds.flatMap((d) => d.artifacts)),
    verifications: keep(raw.verifications, ds.flatMap((d) => d.verify)),
    ask: raw.ask.map((q) => q.trim()).filter(Boolean).slice(0, 3).map((q) => q.slice(0, 80)),
  };
}

/**
 * 규칙으로 옮긴다. 읽는 법은 `rules.ts` 한 곳에 있다: 확신이 설 때만 보기를 켜고,
 * 정한 것이나 남은 것을 보기에 대지 못하면 그 사람이 쓴 말을 돌려주며 묻는다.
 */
function byRules(core: string, note: string, lang: MatLang = "ko"): DraftValue {
  return draftByRules(core, note, lang);
}

export async function draftExperience(userId: string, note: string): Promise<{
  id: string; by: "claude" | "rules"; reason: string | null;
}> {
  const core = await activeCoreOrPick(userId);
  const text = note.slice(0, 1500);
  let value: DraftValue;
  let by: "claude" | "rules" = "rules";
  let model: string | null = null;
  let reason: string | null = null;
  const lang: MatLang = await wsLang(userId).catch(() => "ko" as const);
  const failText = lang === "en" ? aiFailEn : aiFailKo;
  if (!(await aiConsented(userId))) {
    value = byRules(core, text, lang);
    reason = failText("consent");
  } else {
    const r = await askStructured(lang === "en" ? {
      op: "assistant.draft", schema: Out, system: SYSTEM_EN,
      user: `Kind codes: ${EXPERIENCE_KINDS.map((k) => `${k.code}(${EXPERIENCE_KINDS_EN[k.code].label})`).join(", ")}\n\n` +
        `${menu(core, "en")}\n\n<note>\n${text}\n</note>`,
    } : {
      op: "assistant.draft", schema: Out, system: SYSTEM,
      user: `종류 코드: ${EXPERIENCE_KINDS.map((k) => `${k.code}(${k.label})`).join(", ")}\n\n` +
        `${menu(core)}\n\n<메모>\n${text}\n</메모>`,
    });
    if (r.ok) { value = clamp(core, r.value, lang); by = "claude"; model = r.model; }
    else { value = byRules(core, text, lang); reason = failText(r.reason as AiFail); }
  }
  const row = await queryOne<{ id: string }>(
    `INSERT INTO assistant_drafts (user_id, core_code, note_text, draft, drafted_by, model)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6) RETURNING id::text`,
    [userId, core, text, JSON.stringify(value), by, model]);
  return { id: row!.id, by, reason };
}

/** 초안 한 벌. **남의 것은 열리지 않는다** */
export async function draftOf(userId: string, id: string): Promise<{
  value: DraftValue; by: "claude" | "rules"; core: string;
} | null> {
  if (!/^\d+$/.test(id)) return null;
  const r = await queryOne<{ draft: DraftValue; drafted_by: "claude" | "rules"; core_code: string }>(
    `SELECT draft, drafted_by, core_code FROM assistant_drafts
      WHERE user_id = $1 AND id = $2 AND used_at IS NULL`, [userId, id]);
  return r ? { value: r.draft, by: r.drafted_by, core: r.core_code } : null;
}

/** 저장으로 이어졌으면 메모를 비운다. 메모는 남겨 둘 이유가 끝났다 */
export async function markDraftUsed(userId: string, id: string): Promise<void> {
  if (!/^\d+$/.test(id)) return;
  await query(
    `UPDATE assistant_drafts SET used_at = now(), note_text = NULL
      WHERE user_id = $1 AND id = $2`, [userId, id]).catch(() => undefined);
}
