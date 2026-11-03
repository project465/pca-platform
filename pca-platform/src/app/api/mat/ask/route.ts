import { AI_TOOLS_OPEN_KO } from "@/lib/mat/open-dates";
import { currentUser } from "@/lib/session";
import { matVisible } from "@/lib/mat-public";
import { askOpenFor } from "@/lib/mat/ask-open";
import { aiConsented } from "@/lib/assistant/settings";
import { askStream } from "@/lib/assistant/claude";
import { aiAllowance, canBuyRefill, capLine } from "@/lib/assistant/ai-budget";
import { askContextOf } from "@/lib/mat/ask-context";
import { matLang } from "@/lib/mat/lang";
import { kstDayEn } from "@/lib/mat/open-dates";
import { ASK_OPEN_FROM } from "@/lib/mat/ask-open";

export const dynamic = "force-dynamic";

/**
 * MAT 질문 입력창(2026-11-02 대표 "다 진행해": MAT 를 도우미처럼).
 *
 * 지키는 것
 * 1. **같은 사이트에서 온 JSON 만** 받는다(검사 저장 길 `api/v3/save` 와 같은 검사)
 * 2. **MAT 이 열린 사람만**(이용권 · 학교 좌석). 화면을 볼 수 없는 사람은 404 와 같게 막는다
 * 3. **AI 분석에 동의한 사람만.** 동의하지 않았으면 Claude 를 부르지 않고 그렇게 알린다
 * 4. **묻는 글과 답을 저장하지 않는다.** 기록에는 실패 까닭만(처리방침 9절 초안). 학교 · 제휴사는 볼 수 없다
 * 5. **처리방침 개정(11월 10일 적용) 전에는 운영자만** 쓴다. 고지 없이 새 항목을 국외로 보내지 않는다
 * 6. 한 사람 하루 30번(서버 한 대 기준의 메모리 한도. 넘으면 내일 다시)
 *
 * 답은 근거를 칩 자리(`[경험: 제목]` 등)로 적고, 쓸 수 있는 칩 목록은 `x-mat-evidence` 머리로
 * 함께 보낸다. 화면은 목록에 없는 칩을 그리지 않는다.
 */
const DAILY = 30;
const used = new Map<string, { day: string; n: number }>();

function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return site === "same-origin";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return Boolean(host) && new URL(origin).host === host; } catch { return false; }
}

const SYSTEM = [
  "너는 CareerMatri 의 취업 도우미 MAT 이다. 한국어로, 짧고 구체적으로 답한다.",
  "답은 4~6문장 또는 3개 이하의 짧은 목록. 인사 · 칭찬 · 과장 · 다짐 문장을 쓰지 않는다.",
  "<자료> 에 있는 것만 근거로 쓴다. 근거를 댈 때는 자료에 대괄호로 적힌 칩을 글자 그대로 옮겨 적는다(예: [경험: 현장실습]).",
  "자료에 없는 사실은 지어내지 않는다. 기록이 없으면 [기록 없음], 공고에 적혀 있지 않으면 [공고에 없음] 이라고 적는다.",
  "합격 가능성 · 점수 · 확률을 말하지 않는다. 회사 이름을 추측하거나 적지 않는다.",
  "할 일을 말할 때는 이번 주 안에 끝낼 수 있는 결과물 하나와 확인 방법 하나로 적는다.",
  "지원서 문장을 고쳐 달라고 하면, 문장마다 고칠 점 한 줄과 고친 문장을 낸다. 사람이 쓰지 않은 경험을 문장에 넣지 않는다.",
  "면접 연습을 원하면 질문 하나를 내고, 답이 오면 구체성 · 근거 · 길이 셋으로 짧게 돌려준다.",
  "자료 밖의 일(법률 · 의료 · 개인 신상)이나 취업과 무관한 요청은 한 문장으로 사양한다.",
].join("\n");

/**
 * 영어 답(2026-11-03 "AI 답은 사용자 언어로"). 규칙은 위와 같다. 자료(`<자료>`)는 한국어 이름표로 적혀 있고,
 * 칩은 **자료에 적힌 글자 그대로** 옮긴다(화면이 칩 목록과 글자로 맞춰 본다. 화면이 머리말만 영어로 바꿔 그린다)
 */
const SYSTEM_EN = [
  "You are MAT, the job-search assistant of CareerMatri. Answer in English. Be short and concrete.",
  "Answer in 4 to 6 sentences or a list of up to 3 short items. No greetings, praise, exaggeration or promises.",
  "Use only what is in <자료> (the user's data, written with Korean labels) as evidence. To cite evidence, copy a chip in square brackets exactly as written in the data, including its Korean label (for example [경험: Field trip]).",
  "Do not invent facts that are not in the data. If there is no record, write [기록 없음]. If the posting does not say it, write [공고에 없음].",
  "Do not talk about the chance of passing, scores or probabilities. Do not guess or write company names.",
  "When you suggest a task, give one output the user can finish this week and one way to check it.",
  "If the user asks to edit application sentences, give one line on what to fix and the fixed sentence for each sentence. Do not add experience the user did not write.",
  "If the user asks for a Korean self-introduction (자기소개서) sentence, write the sentence in Korean and add the English meaning on the next line.",
  "For interview practice, ask one question. When an answer comes, give short feedback on specificity, evidence and length.",
  "Decline in one sentence any request outside the data (law, medicine, personal matters) or unrelated to job search.",
].join("\n");

/** 면접 연습을 한국어로 고른 영어 화면 사용자 · 그 반대: 답의 언어만 바꾼다 */
const ANSWER_IN = {
  ko: "이번 답은 한국어로 한다. 면접 질문과 돌려주는 말 모두 한국어다.",
  en: "Answer in English this time. The interview question and the feedback are both in English.",
} as const;

const say = (text: string, status = 200) =>
  new Response(text, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return say("", 415);
  if (!sameOrigin(req)) return say("", 403);
  const user = await currentUser();
  if (!user) return say("", 401);
  if (!(await matVisible(user.id))) return say("", 404);

  let q = "";
  let want: unknown = null;
  try {
    const body = (await req.json()) as { q?: unknown; lang?: unknown };
    q = String(body.q ?? "").trim();
    want = body.lang;
  } catch { return say("", 400); }
  /* 화면 언어(쿠키 → 계정 → 브라우저, 기본 한국어). 면접 연습은 고른 언어(`lang`)로 답한다 */
  const ui = await matLang();
  const answer: "ko" | "en" = want === "en" || want === "ko" ? want : ui;
  const en = ui === "en";
  if (q.length < 2 || q.length > 1700) return say(en ? "Write a question of 2 to 1,500 characters." : "질문은 2자 이상 1,500자 이하로 적어 주세요.", 400);

  const open = await askOpenFor(user.id);
  if (!open.ok) {
    /* 다른 화면과 같은 말투로, 지금 쓸 수 있는 것을 함께 알린다(MAT 시험 P2) */
    return say(en
      ? (open.why === "date"
        ? `Questions open on ${kstDayEn(ASK_OPEN_FROM)}. Until then, you can use posting comparison, the sentence outline and the weekly briefing.`
        : "Questions are available with a pass.")
      : open.why === "date"
        ? `질문하기는 ${AI_TOOLS_OPEN_KO}부터 열려요. 그 전에는 공고 맞춰 보기 · 문장 뼈대 · 이번 주 브리핑을 쓸 수 있어요.`
        : "질문하기는 이용권이 있을 때 쓸 수 있어요.", 403);
  }
  if (!(await aiConsented(user.id))) {
    return say(en
      ? "Turn on AI reading to ask questions. Then your question and a short summary of your records are sent to Claude by Anthropic (USA). You can turn it on in MAT settings."
      : "질문하기는 AI 분석을 켜야 쓸 수 있습니다. 켜면 질문과 필요한 내 기록 요약이 Anthropic(미국)의 Claude로 보내져 읽힙니다. MAT 설정에서 켤 수 있습니다.", 403);
  }
  const day = new Date().toISOString().slice(0, 10);
  const u = used.get(user.id);
  const n = u && u.day === day ? u.n : 0;
  if (n >= DAILY) return say(en ? `You used all ${DAILY} questions for today. Ask again tomorrow.` : `오늘 질문 ${DAILY}번을 다 썼습니다. 내일 다시 물어봐 주세요.`, 429);
  /* 기간권 한 장의 횟수 · 서버 하루 총액(`ai-budget.ts`). 넘었으면 부르지 않고 다시 열리는 날을 적는다 */
  /* 화면이 붙인 머리말로 칸을 가른다: 지원서 문장 · 면접 연습은 Opus(high), 나머지는 Sonnet(medium) */
  const kind = q.startsWith("[지원서 문장 첨삭]") ? "draft" : q.startsWith("[면접 연습]") ? "interview" : "free";
  const op = `mat.ask.${kind}`;
  const allow = await aiAllowance(user.id, op);
  if (!allow.ok) {
    if (allow.why !== "cap") return say(en ? "No more questions today. Ask again tomorrow." : "오늘은 질문을 더 받지 못해요. 내일 다시 물어봐 주세요.", 429);
    /* 개인 이용권이면 화면이 `모두 다시 채우기` 단추를 단다(학교 좌석에는 팔지 않는다) */
    return new Response(capLine(allow.reopen, ui), { status: 429, headers: {
      "content-type": "text/plain; charset=utf-8", "cache-control": "no-store",
      ...((await canBuyRefill(user.id)) ? { "x-mat-refill": "1" } : {}),
    } });
  }
  used.set(user.id, { day, n: n + 1 });

  const ctx = await askContextOf(user.id);
  /* 한국어가 기본이다. 영어 화면이면 영어 규칙, 면접 연습에서 고른 언어가 화면과 다르면 그 언어로 답하라고 한 줄 더 */
  const system = (answer === "en" ? SYSTEM_EN : SYSTEM) + (answer !== ui || kind === "interview" ? `\n${ANSWER_IN[answer]}` : "");
  const gen = askStream({
    op, system, userId: user.id, style: answer,
    /* 학생 묶음은 같은 사람이 이어 물으면 같다: 캐시 앞부분. 질문만 뒤에 붙인다 */
    prefix: `<자료>\n${ctx.text}\n</자료>`,
    user: `<질문>\n${q}\n</질문>`,
    maxTokens: 1500, effort: kind === "free" ? "medium" : "high",
  });
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      const r = await gen.next();
      if (!r.done) { ctrl.enqueue(enc.encode(r.value)); return; }
      /* 끝 표시: 화면이 성공과 실패를 가른다. 거절이면 그때까지 쓴 글을 지운다 */
      ctrl.enqueue(enc.encode(r.value.ok ? "\u0000ok" : `\u0000${r.value.reason}`));
      ctrl.close();
    },
    async cancel() { await gen.return({ ok: false, reason: "error" }); },
  });
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-mat-evidence": encodeURIComponent(JSON.stringify(ctx.evidence)),
    },
  });
}
