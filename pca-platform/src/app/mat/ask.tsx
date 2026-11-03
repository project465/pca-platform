"use client";

import { useRef, useState } from "react";
import { splitChips } from "@/lib/mat/chips";
import { sayOf, type MatUiLang } from "@/lib/mat/copy";
import { ASK_TEXT as A, CHIP_HEAD_EN } from "./mat-text";

/**
 * MAT 홈 아래의 질문 입력창.
 *
 * - 답은 오는 대로 흘러나온다. 근거 자리는 칩으로 그리되, 서버가 보낸 목록에 없는 칩은 그리지 않는다
 * - **대화를 저장하지 않는다.** 이 화면 안에만 있고, 새로 고치면 사라진다
 * - 거절 · 실패면 그때까지 쓴 글을 지우고 한 줄로 알린다
 */
/** 입력창의 쓰임. 지원서 화면은 `draft`(문장 첨삭) · `interview`(면접 연습)로 같은 길을 쓴다 */
export type AskMode = "free" | "draft" | "interview";
/** 머리말(`prefix`)은 서버가 칸을 가르는 열쇠라 한국어 그대로 둔다. 화면 글자와 답의 언어는 `lang` 이 정한다 */
const modesOf = (t: ReturnType<typeof sayOf>): Record<AskMode, { title: string; examples: string[]; holder: string; prefix: string; max: number }> => ({
  free: {
    title: t(A.freeTitle), examples: [t(A.freeEx1), t(A.freeEx2), t(A.freeEx3)],
    holder: t(A.freeHolder), prefix: "", max: 600,
  },
  draft: {
    title: t(A.draftTitle), examples: [],
    holder: t(A.draftHolder), prefix: "[지원서 문장 첨삭] 문장마다 고칠 점 한 줄과 고친 문장을 주세요. 내 기록에 없는 경험은 넣지 마세요.\n", max: 1500,
  },
  interview: {
    title: t(A.ivTitle), examples: [],
    holder: t(A.ivHolder), prefix: "[면접 연습] ", max: 1200,
  },
});
const failOf = (t: ReturnType<typeof sayOf>): Record<string, string> => ({
  off: t(A.failOff), refusal: t(A.failRefusal), rate: t(A.failRate), timeout: t(A.failTimeout),
  error: t(A.failError), cap: t(A.failCap), day: t(A.failDay),
});

type Turn = { q: string; a: string; allowed: string[]; state: "run" | "done" | "fail"; refill?: boolean };

export function MatAsk({ mode = "free", examples, lang = "ko", answerLang }: {
  mode?: AskMode; examples?: string[];
  /** 화면 언어 */
  lang?: MatUiLang;
  /** 답의 언어(면접 연습에서 고른 언어). 비우면 화면 언어 */
  answerLang?: MatUiLang;
}) {
  const tx = sayOf(lang);
  const M = modesOf(tx)[mode];
  const FAIL = failOf(tx);
  const said = answerLang ?? lang;
  /* 칩 머리말은 화면에만 그 언어로(칩 열쇠는 한국어 그대로) */
  const chipLabel = (c: string) => (lang === "en" ? c.replace(/^(검사|경험|할 일|공고|기록 없음|공고에 없음)/, (h) => CHIP_HEAD_EN[h] ?? h) : c);
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
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: said, q: mode === "interview" && picked
          ? (said === "en"
            ? `${M.prefix}Question: ${picked}\nMy answer: ${question}\nGive short feedback on specificity, evidence and length. Then give one line that outlines a better answer.`
            : `${M.prefix}질문: ${picked}\n내 답: ${question}\n구체성 · 근거 · 길이 셋으로 짧게 돌려주고, 더 나은 답의 뼈대 한 줄을 주세요.`)
          : M.prefix + question }),
      });
      if (!res.ok || !res.body) {
        const msg = (await res.text().catch(() => "")) || FAIL.error;
        put((t) => ({ ...t, a: msg, state: "fail", refill: res.headers.get("x-mat-refill") === "1" }));
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
                  ? <><p>{t.a}</p>{t.refill ? <a className="mt-btn is-block" href="/checkout?product=MAT_REFILL" style={{ marginTop: 8 }}>{tx(A.refill)}</a> : null}</>
                  : t.a
                    ? t.a.split(/\n+/).map((line, j) => (
                      <p key={j}>{splitChips(line, new Set(t.allowed)).map((p, n) => ("chip" in p
                        ? <span key={n} className={`mt-chip${p.none ? " is-none" : ""}`}>{chipLabel(p.chip)}</span>
                        : <span key={n}>{p.text}</span>))}</p>
                    ))
                    : <p className="mt-typing" aria-label={tx(A.typing)}>···</p>}
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
      {mode === "interview" ? <p className="mt-note" style={{ margin: "0 0 8px" }}>{picked ? tx(A.picked, { q: picked }) : tx(A.pickFirst)}</p> : null}
      <form className="mt-askbar" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <label className="mt-sr" htmlFor={`mt-ask-${mode}`}>{M.title}</label>
        <textarea id={`mt-ask-${mode}`} ref={box} rows={mode === "draft" ? 4 : 1} maxLength={M.max} value={q} placeholder={M.holder}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (mode !== "draft" && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(q); } }} />
        <button type="submit" className="mt-btn is-ink" disabled={busy || q.trim().length < 2}>{busy ? tx(A.busy) : tx(A.go)}</button>
      </form>
      <p className="mt-note">{tx(A.note)}</p>
    </section>
  );
}
