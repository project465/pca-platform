import { currentUser } from "@/lib/session";
import { matVisible } from "@/lib/mat-public";
import { askOpenFor } from "@/lib/mat/ask-open";
import { aiConsented } from "@/lib/assistant/settings";
import { askStream } from "@/lib/assistant/claude";
import { aiAllowance, capLine } from "@/lib/assistant/ai-budget";
import { askContextOf } from "@/lib/mat/ask-context";

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

const say = (text: string, status = 200) =>
  new Response(text, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return say("", 415);
  if (!sameOrigin(req)) return say("", 403);
  const user = await currentUser();
  if (!user) return say("", 401);
  if (!(await matVisible(user.id))) return say("", 404);

  let q = "";
  try { q = String(((await req.json()) as { q?: unknown }).q ?? "").trim(); } catch { return say("", 400); }
  if (q.length < 2 || q.length > 1700) return say("질문은 2자 이상 1,500자 이하로 적어 주세요.", 400);

  const open = await askOpenFor(user.id);
  if (!open.ok) {
    return say(open.why === "date" ? "질문하기는 11월 10일부터 열립니다." : "질문하기는 이용권이 있을 때 쓸 수 있습니다.", 403);
  }
  if (!(await aiConsented(user.id))) {
    return say("질문하기는 AI 분석을 켜야 쓸 수 있습니다. 켜면 질문과 필요한 내 기록 요약이 Anthropic(미국)의 Claude로 보내져 읽힙니다. MAT 설정에서 켤 수 있습니다.", 403);
  }
  const day = new Date().toISOString().slice(0, 10);
  const u = used.get(user.id);
  const n = u && u.day === day ? u.n : 0;
  if (n >= DAILY) return say(`오늘 질문 ${DAILY}번을 다 썼습니다. 내일 다시 물어봐 주세요.`, 429);
  /* 기간권 한 장의 횟수 · 서버 하루 총액(`ai-budget.ts`). 넘었으면 부르지 않고 다시 열리는 날을 적는다 */
  /* 화면이 붙인 머리말로 칸을 가른다: 지원서 문장 · 면접 연습은 Opus(high), 나머지는 Sonnet(medium) */
  const kind = q.startsWith("[지원서 문장 첨삭]") ? "draft" : q.startsWith("[면접 연습]") ? "interview" : "free";
  const op = `mat.ask.${kind}`;
  const allow = await aiAllowance(user.id, op);
  if (!allow.ok) {
    return say(allow.why === "cap" ? capLine(allow.reopen) : "오늘은 질문을 더 받지 못해요. 내일 다시 물어봐 주세요.", 429);
  }
  used.set(user.id, { day, n: n + 1 });

  const ctx = await askContextOf(user.id);
  const gen = askStream({
    op, system: SYSTEM, userId: user.id,
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
