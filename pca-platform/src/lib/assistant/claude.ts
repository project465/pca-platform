import Anthropic from "@anthropic-ai/sdk";
import { withStyle } from "./style";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type * as z from "zod/v4";
import { opFail } from "@/lib/oplog";
import { aiAllowance, recordAiCall, type AiUsage } from "./ai-budget";

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

/*
 * **기능마다 모델을 고른다**(2026-11-02 대표 "1로 진행해").
 * - `claude-sonnet-5-5`: 공고 나누기 · 파일 뽑기 · 메모 초안 · 공고와 근거 맞춰 보기 · 할 일 · 브리핑 · 자유 질문
 * - `claude-opus-5-5`: 지원서 문장 만들기 · 고치기, 면접 질문 · 답 돌려주기
 * 한 기능만 바꾸려면 배포 없이 `MAT_AI_MODELS` 한 줄로(예: `posting=claude-opus-5-5,draft=claude-opus-5-5`).
 * 두 값 밖의 모델 이름은 받지 않는다(날짜 꼬리표를 붙인 이름도).
 */
export const SONNET = "claude-sonnet-5-5";
export const OPUS = "claude-opus-5-5";
export const ASSISTANT_MODEL = OPUS;
const MODELS = new Set([SONNET, OPUS]);

/** `op` 이름의 앞부분(가장 긴 것부터 맞춘다) → 기본 모델 */
const DEFAULT_MODEL: Record<string, string> = {
  "assistant.posting": SONNET,
  "assistant.draft": SONNET,
  "assistant.upload": SONNET,
  "assistant.research": SONNET,
  "mat.brief": SONNET,
  "mat.ask": SONNET,
  "mat.ask.draft": OPUS,
  "mat.ask.interview": OPUS,
};

function overrides(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const kv of (process.env.MAT_AI_MODELS ?? "").split(",")) {
    const [k, v] = kv.split("=").map((x) => x?.trim() ?? "");
    if (!k || !MODELS.has(v)) continue;
    out[k.startsWith("assistant.") || k.startsWith("mat.") ? k : k === "ask" || k.startsWith("ask.") ? `mat.${k}` : `assistant.${k}`] = v;
  }
  return out;
}

/** 이 기능이 쓸 모델. 설정값이 먼저, 없으면 위 기본 */
export function modelFor(op: string): string {
  const table = { ...DEFAULT_MODEL, ...overrides() };
  const key = Object.keys(table).filter((k) => op === k || op.startsWith(`${k}.`)).sort((x, y) => y.length - x.length)[0];
  return key ? table[key] : SONNET;
}

/** 문서·그림 블록. 올린 파일을 그대로 넘길 때만 쓴다 */
export type AiBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp"; data: string } };

/** `cap` = 기간권 한 장의 횟수를 다 씀(`reopen` 에 다시 열리는 날) · `day` = 서버 하루 총액을 넘음 */
export type AiFail = "off" | "refusal" | "rate" | "timeout" | "error" | "parse" | "cap" | "day";

export type AiResult<T> =
  | { ok: true; value: T; model: string; usage?: { input: number; output: number } }
  | { ok: false; reason: AiFail; reopen?: string };

export type Effort = "low" | "medium" | "high";

/** 시스템 글에 캐시 표시를 단다. 같은 기능의 다음 부름은 이 앞부분을 다시 읽지 않는다 */
function systemBlocks(system: string, style?: "ko" | "en") {
  /* 글쓰기 규칙(짧은 문장 · AI 말투 금지)을 모든 부름에 같이 붙인다(`style.ts`) */
  return [{ type: "text" as const, text: withStyle(system, style), cache_control: { type: "ephemeral" as const } }];
}

function usageOf(u: {
  input_tokens: number; output_tokens: number;
  cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null;
}): AiUsage {
  return {
    input: u.input_tokens, output: u.output_tokens,
    cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0,
  };
}

function billingError(e: unknown): boolean {
  const status = e instanceof Anthropic.APIError ? e.status : undefined;
  return status === 402 || /billing|credit balance|spend limit|usage limit/i.test(e instanceof Error ? e.message : "");
}

/** 부르기 전 상한. 넘었으면 실패 까닭으로 돌려준다 */
async function gate(userId: string | undefined, op: string): Promise<{ ok: true } | { ok: false; reason: AiFail; reopen?: string }> {
  const a = await aiAllowance(userId, op);
  if (a.ok) return { ok: true };
  return a.why === "cap" ? { ok: false, reason: "cap", reopen: a.reopen } : { ok: false, reason: "day" };
}

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
  /** 기본은 `modelFor(op)`. 시험 때만 넘긴다 */
  model?: string;
  maxTokens?: number;
  /**
   * **기능마다 적는다**(Opus 5.5 의 기본은 medium). low = 글을 나누고 칸을 채우는 일,
   * medium = 근거를 찾아 대는 일, high = 문장을 고치고 답을 돌려주는 일
   */
  effort: Effort;
  /** 원가 기록과 기간권 상한을 세는 사람 */
  userId?: string;
  /**
   * 바뀌지 않는 앞부분(전공 보기 목록 · 학생 묶음). 캐시 표시를 달아 `user` 앞에 둔다.
   * 날짜 · 요청 번호처럼 바뀌는 값은 넣지 않는다
   */
  prefix?: string;
  /** 기본 60초. 긴 논문은 읽는 데 그보다 오래 걸린다 */
  timeoutMs?: number;
  /** 답의 언어(글쓰기 규칙을 고른다). 비우면 시스템 글의 언어 */
  style?: "ko" | "en";
}): Promise<AiResult<z.infer<S>>> {
  if (!aiReady()) return { ok: false, reason: "off" };
  const g = await gate(opts.userId, opts.op);
  if (!g.ok) return g;
  const model = opts.model ?? modelFor(opts.op);
  const rec = (outcome: string, usage?: AiUsage) =>
    recordAiCall({ userId: opts.userId, op: opts.op, model, effort: opts.effort, outcome, usage });
  /* 거절이 나면 서버 쪽 대체 모델로 한 번 더(Sonnet 5.5 · Opus 5.5 모두 `default` 를 받는다) */
  const fallback = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
  try {
    const res = await client().beta.messages.parse({
      model,
      max_tokens: opts.maxTokens ?? 4000,
      ...fallback,
      thinking: { type: "adaptive" },
      system: systemBlocks(opts.system, opts.style),
      messages: [{
        role: "user",
        content: [
          ...(opts.blocks ?? []),
          ...(opts.prefix ? [{ type: "text" as const, text: opts.prefix, cache_control: { type: "ephemeral" as const } }] : []),
          { type: "text" as const, text: opts.user },
        ],
      }],
      output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    }, opts.timeoutMs ? { timeout: opts.timeoutMs } : undefined);
    const usage = usageOf(res.usage);
    if (res.stop_reason === "refusal") { await rec("refusal", usage); return { ok: false, reason: "refusal" }; }
    if (res.parsed_output == null) { await rec("parse", usage); return { ok: false, reason: "parse" }; }
    await rec("ok", usage);
    return {
      ok: true, value: res.parsed_output as z.infer<S>, model: res.model,
      usage: { input: usage.input, output: usage.output },
    };
  } catch (e) {
    const reason: AiFail =
      e instanceof Anthropic.RateLimitError ? "rate"
        : e instanceof Anthropic.APIConnectionTimeoutError ? "timeout"
          : "error";
    /* 결제 · 크레딧 · 콘솔 월 한도 거절(402, 또는 billing · credit 말이 든 오류)은 따로 적는다.
       화면은 어느 쪽이든 규칙으로 읽는다 */
    await rec(billingError(e) ? "billing" : reason);
    /* **까닭을 삼키지 않는다.** 화면은 규칙으로 읽은 결과를 보여 주고,
       왜 Claude 쪽이 안 됐는지는 고치는 사람이 읽는 자리에 한 줄 남긴다.
       열쇠와 붙여 넣은 글은 적지 않는다 */
    opFail({ operation: opts.op, step: "claude", category: "upstream" }, e);
    return { ok: false, reason };
  }
}

/**
 * 글로 답하고, 쓰는 대로 흘려 보낸다(2026-11-02 MAT 질문 입력창).
 *
 * 글 조각을 하나씩 내고, 끝나면 어떻게 끝났는지를 돌려준다. **거절이면 그때까지 낸 글을
 * 버리라고 알린다**(`refusal`): 부르는 쪽은 화면에서 지운다. 열쇠가 없으면 아무것도
 * 내지 않고 `off` 로 끝난다. 기록에는 까닭만 남고 묻는 글과 답은 남기지 않는다.
 */
export async function* askStream(opts: {
  op: string;
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  effort: Effort;
  userId?: string;
  /** 바뀌지 않는 앞부분(학생 묶음). 캐시 표시를 단다 */
  prefix?: string;
  /** 답의 언어(글쓰기 규칙을 고른다). 비우면 시스템 글의 언어 */
  style?: "ko" | "en";
}): AsyncGenerator<string, { ok: true } | { ok: false; reason: AiFail; reopen?: string }> {
  if (!aiReady()) return { ok: false, reason: "off" };
  const g = await gate(opts.userId, opts.op);
  if (!g.ok) return g;
  const model = opts.model ?? modelFor(opts.op);
  const rec = (outcome: string, usage?: AiUsage) =>
    recordAiCall({ userId: opts.userId, op: opts.op, model, effort: opts.effort, outcome, usage });
  const fallback = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
  try {
    const stream = client().beta.messages.stream({
      model,
      max_tokens: opts.maxTokens ?? 2000,
      ...fallback,
      thinking: { type: "adaptive" },
      system: systemBlocks(opts.system, opts.style),
      messages: [{
        role: "user",
        content: [
          ...(opts.prefix ? [{ type: "text" as const, text: opts.prefix, cache_control: { type: "ephemeral" as const } }] : []),
          { type: "text" as const, text: opts.user },
        ],
      }],
      output_config: { effort: opts.effort },
    });
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
    }
    const fin = await stream.finalMessage();
    const usage = usageOf(fin.usage);
    if (fin.stop_reason === "refusal") { await rec("refusal", usage); return { ok: false, reason: "refusal" }; }
    await rec("ok", usage);
    return { ok: true };
  } catch (e) {
    const reason: AiFail =
      e instanceof Anthropic.RateLimitError ? "rate"
        : e instanceof Anthropic.APIConnectionTimeoutError ? "timeout"
          : "error";
    /* 결제 · 크레딧 · 콘솔 월 한도 거절(402, 또는 billing · credit 말이 든 오류)은 따로 적는다.
       화면은 어느 쪽이든 규칙으로 읽는다 */
    await rec(billingError(e) ? "billing" : reason);
    opFail({ operation: opts.op, step: "claude", category: "upstream" }, e);
    return { ok: false, reason };
  }
}
