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
const EXAMPLES = ["이번 주 뭐 하면 돼?", "분석한 공고 중 어디부터 준비할까?", "면접 질문 하나 내 줘"];
const FAIL: Record<string, string> = {
  off: "지금은 답을 만들 수 없습니다. 잠시 뒤 다시 물어봐 주세요.",
  refusal: "이 질문에는 답하지 않았습니다. 취업 준비에 관한 질문으로 다시 물어봐 주세요.",
  rate: "묻는 사람이 많아 잠시 막혔습니다. 1분 뒤 다시 물어봐 주세요.",
  timeout: "답이 늦어져 멈췄습니다. 질문을 짧게 나눠 다시 물어봐 주세요.",
  error: "답을 만들지 못했습니다. 잠시 뒤 다시 물어봐 주세요.",
};

type Turn = { q: string; a: string; allowed: string[]; state: "run" | "done" | "fail" };

export function MatAsk() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
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
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: question }),
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
    <section className="mt-ask" aria-label="MAT에게 묻기">
      <h2 className="mt-h2">MAT에게 묻기</h2>
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
      ) : (
        <div className="mt-chips" style={{ marginBottom: 10 }}>
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="mt-chip mt-chip-btn" onClick={() => void ask(e)}>{e}</button>
          ))}
        </div>
      )}
      <form className="mt-askbar" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <label className="mt-sr" htmlFor="mt-ask-q">질문</label>
        <textarea id="mt-ask-q" ref={box} rows={1} maxLength={600} value={q} placeholder="공고 · 할 일 · 지원서 문장 · 면접, 무엇이든 물어보세요"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(q); } }} />
        <button type="submit" className="mt-btn is-ink" disabled={busy || q.trim().length < 2}>{busy ? "답하는 중" : "묻기"}</button>
      </form>
      <p className="mt-note">답은 내 검사 결과 · 경험 기록 · 공고만 근거로 씁니다. 질문과 답은 저장하지 않고, 학교와 제휴사는 볼 수 없습니다.</p>
    </section>
  );
}
