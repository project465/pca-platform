"use client";

import { useRef, useState } from "react";
import { splitChips } from "@/lib/mat/chips";

/**
 * MAT 홈 아래의 질문 입력창.
 *
 * - 답은 오는 대로 흘러나온다. 근거 자리는 칩으로 그리되, 서버가 보낸 목록에 없는 칩은 그리지 않는다
 * - **대화를 저장하지 않는다.** 이 화면 안에만 있고, 새로 고치면 사라진다
 * - 거절 · 실패면 그때까지 쓴 글을 지우고 한 줄로 알린다
 */
/** 입력창의 쓰임. 지원서 화면은 `draft`(문장 첨삭) · `interview`(면접 연습)로 같은 길을 쓴다 */
export type AskMode = "free" | "draft" | "interview";
const MODES: Record<AskMode, { title: string; examples: string[]; holder: string; prefix: string; max: number }> = {
  free: {
    title: "물어보기", examples: ["이번 주 뭐 하면 돼?", "어느 공고부터 준비할까?", "면접 질문 하나 내 줘"],
    holder: "공고 · 할 일 · 지원서 · 면접", prefix: "", max: 600,
  },
  draft: {
    title: "문장 고치기", examples: [],
    holder: "고칠 지원서 문장을 붙여 넣으세요(한 번에 1,500자까지)", prefix: "[지원서 문장 첨삭] 문장마다 고칠 점 한 줄과 고친 문장을 주세요. 내 기록에 없는 경험은 넣지 마세요.\n", max: 1500,
  },
  interview: {
    title: "면접 연습", examples: [],
    holder: "질문을 고르거나, 고른 질문에 대한 내 답을 적으세요", prefix: "[면접 연습] ", max: 1200,
  },
};
const FAIL: Record<string, string> = {
  off: "지금은 답할 수 없어요. 잠시 뒤 다시 물어봐 주세요.",
  refusal: "취업 준비에 관한 질문으로 다시 물어봐 주세요.",
  rate: "지금 묻는 사람이 많아요. 1분 뒤 다시 물어봐 주세요.",
  timeout: "답이 늦어졌어요. 질문을 짧게 나눠 다시 물어봐 주세요.",
  error: "답하지 못했어요. 잠시 뒤 다시 물어봐 주세요.",
  cap: "이번 기간 횟수를 다 썼어요.",
  day: "오늘은 질문을 더 받지 못해요. 내일 다시 물어봐 주세요.",
};

type Turn = { q: string; a: string; allowed: string[]; state: "run" | "done" | "fail" };

export function MatAsk({ mode = "free", examples }: { mode?: AskMode; examples?: string[] }) {
  const M = MODES[mode];
  const ex = examples ?? M.examples;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  /* 면접 연습: 고른 질문을 들고 있다가 답과 함께 보낸다(대화를 저장하지 않으므로 매번 같이 보낸다) */
  const [picked, setPicked] = useState<string | null>(null);
  const busy = turns.some((t) => t.state === "run");
  const box = useRef<HTMLTextAreaElement>(null);

  const ask = async (text: string) => {
    const question = text.trim();
    if (question.length < 2 || busy) return;
    setQ("");
    const i = turns.length;
    setTurns((x) => [...x, { q: question, a: "", allowed: [], state: "run" }]);
    const put = (f: (t: Turn) => Turn) => setTurns((x) => x.map((t, k) => (k === i ? f(t) : t)));
    try {
      const res = await fetch("/api/mat/ask", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: mode === "interview" && picked
          ? `${M.prefix}질문: ${picked}\n내 답: ${question}\n구체성 · 근거 · 길이 셋으로 짧게 돌려주고, 더 나은 답의 뼈대 한 줄을 주세요.`
          : M.prefix + question }),
      });
      if (!res.ok || !res.body) {
        const msg = (await res.text().catch(() => "")) || FAIL.error;
        put((t) => ({ ...t, a: msg, state: "fail" }));
        return;
      }
      let allowed: string[] = [];
      try { allowed = JSON.parse(decodeURIComponent(res.headers.get("x-mat-evidence") ?? "%5B%5D")); } catch { allowed = []; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const end = acc.indexOf("\u0000");
        const shown = end >= 0 ? acc.slice(0, end) : acc;
        put((t) => ({ ...t, a: shown, allowed }));
      }
      const end = acc.indexOf("\u0000");
      const how = end >= 0 ? acc.slice(end + 1) : "error";
      if (how === "ok") put((t) => ({ ...t, a: acc.slice(0, end), allowed, state: "done" }));
      else put((t) => ({ ...t, a: FAIL[how] ?? FAIL.error, allowed: [], state: "fail" }));
    } catch {
      put((t) => ({ ...t, a: FAIL.error, state: "fail" }));
    }
  };

  return (
    <section className="mt-ask" aria-label={M.title}>
      <h2 className="mt-h2">{M.title}</h2>
      {turns.length ? (
        <div className="mt-thread" aria-live="polite">
          {turns.map((t, k) => (
            <div key={k} className="mt-turn">
              <p className="mt-q">{t.q}</p>
              <div className={`mt-a${t.state === "fail" ? " is-fail" : ""}`}>
                {t.state === "fail"
                  ? <p>{t.a}</p>
                  : t.a
                    ? t.a.split(/\n+/).map((line, j) => (
                      <p key={j}>{splitChips(line, new Set(t.allowed)).map((p, n) => ("chip" in p
                        ? <span key={n} className={`mt-chip${p.none ? " is-none" : ""}`}>{p.chip}</span>
                        : <span key={n}>{p.text}</span>))}</p>
                    ))
                    : <p className="mt-typing" aria-label="답을 쓰는 중">···</p>}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {ex.length && (!turns.length || mode === "interview") ? (
        <div className={`mt-chips${mode === "interview" ? " mt-qpick" : ""}`} style={{ marginBottom: 10 }}>
          {ex.map((e) => (
            <button key={e} type="button" className={`mt-chip mt-chip-btn${picked === e ? " is-on" : ""}`}
              onClick={() => (mode === "interview" ? (setPicked(e), box.current?.focus()) : void ask(e))}>{e}</button>
          ))}
        </div>
      ) : null}
      {mode === "interview" ? <p className="mt-note" style={{ margin: "0 0 8px" }}>{picked ? `고른 질문: ${picked}` : "위에서 질문을 하나 고른 뒤 답을 적으세요."}</p> : null}
      <form className="mt-askbar" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <label className="mt-sr" htmlFor={`mt-ask-${mode}`}>{M.title}</label>
        <textarea id={`mt-ask-${mode}`} ref={box} rows={mode === "draft" ? 4 : 1} maxLength={M.max} value={q} placeholder={M.holder}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (mode !== "draft" && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(q); } }} />
        <button type="submit" className="mt-btn is-ink" disabled={busy || q.trim().length < 2}>{busy ? "답하는 중" : "묻기"}</button>
      </form>
      <p className="mt-note">내 검사 결과 · 경험 · 공고만 근거로 답해요. 질문과 답은 저장하지 않아요. AI 분석을 켠 경우 Anthropic(미국)의 Claude가 읽어요.</p>
    </section>
  );
}
