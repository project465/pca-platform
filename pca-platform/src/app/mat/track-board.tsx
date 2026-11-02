import Link from "next/link";
import type { Application } from "@/lib/me-v3/platform";
import type { PostingRow } from "@/lib/assistant/posting";
import { nextStep, TRACK_COLS } from "@/lib/mat/heads-up";
import { matDropApp, matMoveApp } from "./actions";

/**
 * 지원 현황(관심 → 지원·서류 → 면접 → 결과). 390px 에서는 칸을 세로로 쌓는다.
 *
 * - 줄마다 **다음 할 일**이 저절로 선다(마감은 분석한 공고에서 읽는다)
 * - 옮기기는 앞 · 뒤 단추 둘. 끝난 지원은 `합격` · `끝남` 둘 중 하나
 * - 회사 이름 칸이 없다. 공고 이름만 보인다
 */
const NEXT: Record<string, { state: string; label: string }[]> = {
  watching: [{ state: "applied", label: "지원했어요" }],
  applied: [{ state: "interview", label: "면접 잡혔어요" }, { state: "closed", label: "끝남" }],
  interview: [{ state: "offer", label: "합격" }, { state: "closed", label: "끝남" }],
  offer: [],
  closed: [],
};

export function TrackBoard({ apps, postings }: { apps: Application[]; postings: PostingRow[] }) {
  const byLabel = new Map(postings.map((p) => [p.label, p]));
  return (
    <section id="track" aria-label="지원 현황">
      <h2 className="mt-h2">지원 현황</h2>
      {apps.length ? (
        <div className="mt-board">
          {TRACK_COLS.map((c) => {
            const rows = apps.filter((a) => (c.states as readonly string[]).includes(a.state));
            return (
              <div key={c.key} className="mt-col">
                <p className="mt-col-h"><b>{c.label}</b><span>{rows.length}</span></p>
                {rows.map((a) => {
                  const p = byLabel.get(a.note_text ?? "") ?? null;
                  const step = nextStep(a, p?.deadline ?? null, p?.id ?? null);
                  return (
                    <div key={a.id} className="mt-card">
                      <p>{p?.name ?? a.note_text ?? a.role_label ?? "이름 없는 지원"}{a.state === "offer" ? " · 합격" : a.state === "closed" ? " · 끝남" : ""}</p>
                      {step.href ? <Link className="mt-link" href={step.href}>{step.text}</Link> : <small>{step.text}</small>}
                      <div className="mt-acts">
                        {NEXT[a.state].map((n) => (
                          <form key={n.state} action={matMoveApp}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="state" value={n.state} />
                            <button type="submit" className="mt-btn is-small">{n.label}</button>
                          </form>
                        ))}
                        <form action={matDropApp}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="mt-link mt-linkbtn" aria-label={`지우기: ${p?.name ?? a.note_text ?? ""}`}>지우기</button>
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
        <p className="mt-empty">분석한 공고를 담으면 마감과 다음 할 일을 챙겨 드려요.</p>
      )}
    </section>
  );
}
