import Link from "next/link";
import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { matAccess } from "@/lib/mat-access";
import { aiConsented } from "@/lib/assistant/settings";
import { aiReady } from "@/lib/assistant/claude";
import { outLink } from "@/lib/mat/out-link";
import { PRICING_HREF } from "@/lib/pricing/config";
import { itemsOf } from "@/lib/research/profile";
import { matchesOf } from "@/lib/research/match";
import { FREE_READINGS, readingsUsed, type AiReading } from "@/lib/research/ai";
import { readResearchMatch } from "../actions";
import { R } from "../research-text";
import { itemHead, itemSub } from "../item-line";

export const generateMetadata = () => matTitle(R.mTitle);

const ERR = { off: R.mReadOff, pass: R.mReadNeedPass, consent: R.mReadNeedConsent, cap: R.mReadCap, fail: R.mReadFail } as const;

/**
 * 연구 이력과 맞는 공고(2026-11-05).
 *
 * **무료**: 맞는 공고 전부와 점수 · 겹친 분야어, 공고 1건의 요건별 판단과 근거.
 * **이용권**: 여러 공고의 요건별 판단(2026-11-05 대표 결정). 지원은 원문에서 한다.
 *
 * 요건별 판단은 요건마다 (가) 공고 원문 인용 (나) 필수 · 우대와 지원 가능 여부 (다) 입력한 이력 그대로
 * (라) 서류에 적을 사실을 한 문단으로 보인다(`research/ai.ts`). 강점 · 약점 딱지를 달지 않는다.
 */
export default async function ResearchMatches({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const e = (await searchParams).e;
  const [rows, items, access, consent, used] = await Promise.all([
    matchesOf(user.id, 0, 100), itemsOf(user.id), matAccess(user.id), aiConsented(user.id), readingsUsed(user.id),
  ]);
  const name = new Map(items.map((i) => [i.id, `${itemHead(i, lang)}${itemSub(i, lang) ? ` (${itemSub(i, lang)})` : ""}`]));
  const freeLeft = access.paid ? Infinity : Math.max(0, FREE_READINGS - used);
  const canRead = freeLeft > 0 && consent && aiReady();
  const KIND = { required: R.kRequired, preferred: R.kPreferred, unclear: R.kUnclear } as const;
  return (
    <main>
      <p className="mt-meta"><Link href="/mat/research">{t(R.mBack)}</Link></p>
      <h1 className="mt-h1">{t(R.mTitle)}</h1>
      <p className="mt-lead">{t(R.mLead)}</p>
      {e && e in ERR ? <p className="mt-alert" role="alert">{t(ERR[e as keyof typeof ERR])}</p> : null}
      {!rows.length ? <p className="mt-note">{items.length ? t(R.matchesNone) : t(R.lead)}</p> : null}
      {!access.paid && rows.length ? <p className="mt-note" style={{ marginTop: 0, marginBottom: 10 }}>{freeLeft > 0 ? t(R.mReadFree) : t(R.mReadNeedPass)}</p> : null}
      <div className="mt-list">
        {rows.map((m) => {
          const ai = m.ai as AiReading | null;
          const link = outLink(m.source_url, m.source);
          return (
            <div className="mt-row" key={m.posting_id} id={`p${m.posting_id}`} style={{ flexWrap: "wrap" }}>
              <div className="mt-row-b">
                <p>{m.title}</p>
                <small>
                  {[m.category, m.degree_label, m.region_label, m.closes_on ? t(R.mCloses, { d: m.closes_on.slice(0, 10) }) : null]
                    .filter(Boolean).join(" · ")}
                </small>
                <small><b>{t(R.mScore, { n: m.score })}</b> · {t(R.mTerms)}</small>
                <div className="mt-chips">
                  {m.reasons.terms.map((x) => <span className="mt-chip" key={x.term}>{x.term}</span>)}
                </div>
                <small>{t(m.reasons.degree === "fit" ? R.mDegreeFit : m.reasons.degree === "none" ? R.mDegreeNone : R.mDegreeUnknown)}</small>
              </div>
              {link ? <a className="mt-btn is-small" href={link} target="_blank" rel="noopener noreferrer">{t(R.mOpen)}</a> : null}
              {ai?.requirements?.length ? (
                <div style={{ flexBasis: "100%", display: "grid", gap: 10, marginTop: 4 }}>
                  {ai.requirements.map((q, i) => (
                    <div className="mt-box" key={i}>
                      <p style={{ color: "var(--mt-ink)" }}>
                        {t(KIND[q.kind])} &lsquo;{q.quote}&rsquo;. {q.eligibility} {q.record}
                      </p>
                      {q.write.length ? (
                        <ul>{q.write.map((w, j) => <li key={j}>{w}</li>)}</ul>
                      ) : null}
                      {q.evidence.length ? (
                        <p className="mt-meta" style={{ marginTop: 6 }}>{t(R.mEvidence)}: {q.evidence.map((x) => name.get(x.replace(/^R/, "")) ?? x).join(" · ")}</p>
                      ) : null}
                    </div>
                  ))}
                  <p className="mt-note" style={{ margin: 0 }}>{t(R.mAiNote)}</p>
                </div>
              ) : canRead ? (
                <form action={readResearchMatch} style={{ flexBasis: "100%" }}>
                  <input type="hidden" name="posting" value={m.posting_id} />
                  <button type="submit" className="mt-btn is-small">{t(R.mRead)}</button>
                  <span className="mt-meta"> {t(R.mReadNote)}</span>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>
      {!access.paid && freeLeft === 0 && rows.length ? (
        <Link className="mt-btn is-block" href={PRICING_HREF} style={{ marginTop: 16 }}>{t(R.mPass)}</Link>
      ) : null}
      {freeLeft > 0 && !consent && rows.length ? <p className="mt-note">{t(R.mReadNeedConsent)}</p> : null}
    </main>
  );
}
