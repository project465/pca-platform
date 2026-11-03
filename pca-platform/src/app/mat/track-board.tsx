import Link from "next/link";
import type { Application } from "@/lib/me-v3/platform";
import type { PostingRow } from "@/lib/assistant/posting";
import { nextStep, TRACK_COL_EN, TRACK_COLS } from "@/lib/mat/heads-up";
import { sayOf, type MatUiLang } from "@/lib/mat/copy";
import { TRACK_TEXT as T } from "./mat-text";
import { matDropApp, matMoveApp } from "./actions";

/**
 * 지원 현황(관심 → 지원·서류 → 면접 → 결과). 390px 에서는 칸을 세로로 쌓는다.
 *
 * - 줄마다 **다음 할 일**이 저절로 선다(마감은 분석한 공고에서 읽는다)
 * - 옮기기는 앞 · 뒤 단추 둘. 끝난 지원은 `합격` · `끝남` 둘 중 하나
 * - 회사 이름 칸이 없다. 공고 이름만 보인다
 */
const NEXT: Record<string, { state: string; label: keyof typeof T }[]> = {
  watching: [{ state: "applied", label: "applied" }],
  applied: [{ state: "interview", label: "interview" }, { state: "closed", label: "closed" }],
  interview: [{ state: "offer", label: "offer" }, { state: "closed", label: "closed" }],
  offer: [],
  closed: [],
};

export function TrackBoard({ apps, postings, lang = "ko" }: { apps: Application[]; postings: PostingRow[]; lang?: MatUiLang }) {
  const t = sayOf(lang);
  const byLabel = new Map(postings.map((p) => [p.label, p]));
  return (
    <section id="track" aria-label={t(T.title)}>
      <h2 className="mt-h2">{t(T.title)}</h2>
      {apps.length ? (
        <div className="mt-board">
          {TRACK_COLS.map((c) => {
            const rows = apps.filter((a) => (c.states as readonly string[]).includes(a.state));
            return (
              <div key={c.key} className="mt-col">
                <p className="mt-col-h"><b>{lang === "en" ? TRACK_COL_EN[c.key] : c.label}</b><span>{rows.length}</span></p>
                {rows.map((a) => {
                  const p = byLabel.get(a.note_text ?? "") ?? null;
                  const step = nextStep(a, p?.deadline ?? null, p?.id ?? null, lang);
                  return (
                    <div key={a.id} className="mt-card">
                      <p>{p?.name ?? a.note_text ?? a.role_label ?? t(T.noName)}{a.state === "offer" ? ` · ${t(T.offer)}` : a.state === "closed" ? ` · ${t(T.closed)}` : ""}</p>
                      {step.href ? <Link className="mt-link" href={step.href}>{step.text}</Link> : <small>{step.text}</small>}
                      <div className="mt-acts">
                        {NEXT[a.state].map((n) => (
                          <form key={n.state} action={matMoveApp}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="state" value={n.state} />
                            <button type="submit" className="mt-btn is-small">{t(T[n.label])}</button>
                          </form>
                        ))}
                        <form action={matDropApp}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="mt-link mt-linkbtn" aria-label={t(T.dropAria, { name: p?.name ?? a.note_text ?? "" })}>{t(T.drop)}</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-empty">{t(T.empty)}</p>
      )}
    </section>
  );
}
