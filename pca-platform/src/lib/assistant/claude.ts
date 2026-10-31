import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type * as z from "zod/v4";
import { opFail } from "@/lib/oplog";

/**
 * MAT이 Claude 를 부르는 유일한 자리.
 *
 * **점수를 만들지 않는다**(설계 원칙 6). 여기서 나오는 것은 붙여 넣은
 * 공고에서 뽑은 요구 항목과, 적어 주신 메모를 그 Core 의 보기로 옮긴
 * 초안뿐이다. 둘 다 사람이 확인한 뒤에야 쓰이고, 채점과 결과 모델은 이
 * 파일을 들여오지 않는다.
 *
 * **열쇠가 없으면 끈 채로 돈다.** `ANTHROPIC_API_KEY` 가 비어 있으면
 * `{ ok: false, reason: "off" }` 를 돌려주고, 부르는 쪽은 규칙으로 읽는
 * 길로 내려간다. 열쇠가 없다고 화면이 오류가 되면 안 된다.
 *
 * **돌려주는 값의 꼴을 Claude 에게 맡기지 않는다.** 구조화 출력
 * (`output_config.format`)으로 받고, 받은 뒤에도 부르는 쪽이 그 Core 의
 * 목록에 있는 코드와 문장만 남긴다. 목록 밖의 말은 버린다.
 *
 * **거절은 값이다.** `stop_reason === "refusal"` 이면 내용을 읽지 않고
 * 규칙으로 내려간다. 서버 쪽 대체 모델(`fallbacks: "default"`)을 켜 두어
 * 거절이 생기면 Anthropic 이 권하는 모델로 한 번 더 해 본다.
 */

export const ASSISTANT_MODEL = "claude-opus-5-5";
/**
 * 올린 파일(성적증명서·수료증·상장)을 읽는 모델. 하는 일이 문서에서 과목과
 * 활동 이름을 뽑아 정해진 보기로 옮기는 것이라 가장 싼 모델로 충분하다.
 * 월 6,900원 안에서 한 사람이 열 건을 올려도 남도록 고른 값이다.
 * **서버 쪽 대체 모델이 없다**: 이 모델에는 `fallbacks` 를 보내지 않는다.
 */
export const UPLOAD_MODEL = "claude-haiku-5-5";
/**
 * 논문 · 학위논문 · 발표 자료 · 이력서 · 자기소개서를 읽는 모델(2026-10-31).
 * 영어 논문을 끝까지 읽고 방법 · 결과 · 기여를 직무 말로 옮겨야 해서 성적증명서
 * 읽기보다 한 단계 위를 쓴다. `MAT_RESEARCH_MODEL` 로 바꿀 수 있다(배포 없이).
 */
export const RESEARCH_MODEL = process.env.MAT_RESEARCH_MODEL?.trim() || "claude-sonnet-5-5";

/** 문서·그림 블록. 올린 파일을 그대로 넘길 때만 쓴다 */
export type AiBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp"; data: string } };

export type AiFail = "off" | "refusal" | "rate" | "timeout" | "error" | "parse";

export type AiResult<T> =
  | { ok: true; value: T; model: string; usage?: { input: number; output: number } }
  | { ok: false; reason: AiFail };

export function aiReady(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let cached: Anthropic | null = null;
function client(): Anthropic {
  /* 열쇠는 SDK 가 `ANTHROPIC_API_KEY` 에서 읽는다. **코드에 적지 않는다** */
  if (!cached) cached = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return cached;
}

/**
 * 한 번 묻고 한 번 받는다.
 *
 * `effort: "low"` 인 까닭: 하는 일이 긴 글에서 항목을 골라내는 것이라
 * 깊게 생각할수록 기다리는 사람만 늘고 답은 크게 달라지지 않는다.
 */
export async function askStructured<S extends z.ZodType>(opts: {
  /** 무엇을 하다 실패했는지 로그에 남길 이름 */
  op: string;
  schema: S;
  system: string;
  /** 글 한 덩이. `blocks` 를 주면 그 뒤에 붙는다 */
  user: string;
  /** 올린 파일. 글보다 먼저 둔다(문서를 먼저 읽고 지시를 읽는 차례) */
  blocks?: AiBlock[];
  /** 기본은 `ASSISTANT_MODEL`. 파일 읽기는 `UPLOAD_MODEL` */
  model?: string;
  maxTokens?: number;
  /** 기본 `low`. 논문처럼 끝까지 읽고 이어 생각해야 하는 일은 `medium` */
  effort?: "low" | "medium" | "high";
  /** 기본 60초. 긴 논문은 읽는 데 그보다 오래 걸린다 */
  timeoutMs?: number;
}): Promise<AiResult<z.infer<S>>> {
  if (!aiReady()) return { ok: false, reason: "off" };
  const model = opts.model ?? ASSISTANT_MODEL;
  /* 대체 모델은 Opus 쪽에만 있다. Haiku 에 보내면 400 이다 */
  const fallback = model === ASSISTANT_MODEL
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
    : {};
  try {
    const res = await client().beta.messages.parse({
      model,
      max_tokens: opts.maxTokens ?? 4000,
      ...fallback,
      system: opts.system,
      messages: [{
        role: "user",
        content: opts.blocks?.length
          ? [...opts.blocks, { type: "text" as const, text: opts.user }]
          : opts.user,
      }],
      output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
    }, opts.timeoutMs ? { timeout: opts.timeoutMs } : undefined);
    if (res.stop_reason === "refusal") return { ok: false, reason: "refusal" };
    if (res.parsed_output == null) return { ok: false, reason: "parse" };
    return {
      ok: true, value: res.parsed_output as z.infer<S>, model: res.model,
      usage: { input: res.usage.input_tokens, output: res.usage.output_tokens },
    };
  } catch (e) {
    const reason: AiFail =
      e instanceof Anthropic.RateLimitError ? "rate"
        : e instanceof Anthropic.APIConnectionTimeoutError ? "timeout"
          : "error";
    /* **까닭을 삼키지 않는다.** 화면은 규칙으로 읽은 결과를 보여 주고,
       왜 Claude 쪽이 안 됐는지는 고치는 사람이 읽는 자리에 한 줄 남긴다.
       열쇠와 붙여 넣은 글은 적지 않는다 */
    opFail({ operation: opts.op, step: "claude", category: "upstream" }, e);
    return { ok: false, reason };
  }
}

/** 화면에 적을 한 줄. 왜 규칙으로 읽었는지를 사람의 말로 */
/** 같은 까닭의 영어. 영어 작업공간의 공고 · 메모에 남는다 */
export function aiFailEn(r: AiFail | "consent"): string {
  switch (r) {
    case "off": return "AI reading is off right now, so this was read with rules.";
    case "consent": return "You haven't turned on AI reading, so this was read with rules.";
    case "refusal": return "The AI didn't read this text, so it was read with rules.";
    case "rate": return "Too many requests right now, so this was read with rules.";
    case "timeout": return "The AI took too long, so this was read with rules.";
    default: return "AI reading wasn't available, so this was read with rules.";
  }
}

export function aiFailKo(r: AiFail | "consent"): string {
  switch (r) {
    case "off": return "지금은 AI 분석이 꺼져 있어 규칙으로 읽었습니다.";
    case "consent": return "AI 분석에 동의하지 않으셔서 규칙으로 읽었습니다.";
    case "refusal": return "AI가 이 글을 읽지 않아 규칙으로 읽었습니다.";
    case "rate": return "요청이 몰려 이번에는 규칙으로 읽었습니다.";
    case "timeout": return "응답이 늦어 이번에는 규칙으로 읽었습니다.";
    default: return "AI 분석이 잠시 되지 않아 규칙으로 읽었습니다.";
  }
}
