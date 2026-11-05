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
import type { AiReading } from "@/lib/research/ai";
import { readResearchMatch } from "../actions";
import { R } from "../research-text";
import { itemHead } from "../item-line";

export const generateMetadata = () => matTitle(R.mTitle);

/** 이용권이 없는 분에게 보이는 맞는 공고 수(자료 알림 · `/me/track/jobs` 와 같다) */
const FREE_SHOWN = 3;

const ERR = { off: R.mReadOff, pass: R.mReadNeedPass, consent: R.mReadNeedConsent, cap: R.mReadCap, fail: R.mReadFail } as const;

/**
 * 연구 이력과 맞는 공고(2026-11-05). 1차 점수와 **무엇이 겹쳤는지**를 보이고, 이용권이 있는 분은
 * 공고마다 2차 요건 맞춰 보기를 누를 수 있다. 지원은 원문에서 한다.
 */
export default async function ResearchMatches({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const e = (await searchParams).e;
  const [rows, items, access, consent] = await Promise.all([
    matchesOf(user.id, 0, 100), itemsOf(user.id), matAccess(user.id), aiConsented(user.id),
  ]);
  const name = new Map(items.map((i) => [i.id, itemHead(i, lang)]));
  const shown = access.paid ? rows : rows.slice(0, FREE_SHOWN);
  const canRead = access.paid && consent && aiReady();
  const STATUS = { met: R.mMet, partial: R.mPartial, missing: R.mMissing } as const;
  return (
    <main>
      <p className="mt-meta"><Link href="/mat/research">{t(R.mBack)}</Link></p>
      <h1 className="mt-h1">{t(R.mTitle)}</h1>
      <p className="mt-lead">{t(R.mLead)}</p>
      {e && e in ERR ? <p className="mt-alert" role="alert">{t(ERR[e as keyof typeof ERR])}</p> : null}
      {!rows.length ? <p className="mt-note">{items.length ? t(R.matchesNone) : t(R.lead)}</p> : null}
      <div className="mt-list">
        {shown.map((m) => {
          const ai = m.ai as AiReading | null;
          const link = outLink(m.source_url, m.source);
          return (
            <div className="mt-row" key={m.posting_id} id={`p${m.posting_id}`}>
              <div className="mt-row-b">
                <p>{m.title}</p>
                <small>
                  {[m.category, m.degree_label, m.region_label, m.closes_on ? t(R.mCloses, { d: m.closes_on.slice(0, 10) }) : null]
                    .filter(Boolean).join(" · ")}
                </small>
                <small><b>{t(R.mScore, { n: m.score })}</b> · {t(R.mTerms)}</small>
                <div className="mt-chips">
                  {m.reasons.terms.map((x) => (
                    <span className="mt-chip" key={x.term} title={x.items.map((i) => name.get(i) ?? "").filter(Boolean).join(", ")}>{x.term}</span>
                  ))}
                </div>
                <small>{t(m.reasons.degree === "fit" ? R.mDegreeFit : m.reasons.degree === "none" ? R.mDegreeNone : R.mDegreeUnknown)}</small>
                {ai ? (
                  <div className="mt-box" style={{ marginTop: 10 }}>
                    <p>{ai.summary}</p>
                    <ul>
                      {ai.requirements.map((q, i) => (
                        <li key={i}>
                          <b>{t(STATUS[q.status])}</b> {q.text}. {q.note}
                          {q.evidence.length ? ` (${t(R.mEvidence)}: ${q.evidence.map((x) => name.get(x.replace(/^R/, "")) ?? x).join(", ")})` : ""}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-note">{t(R.mAiNote)}</p>
                  </div>
                ) : canRead ? (
                  <form action={readResearchMatch} style={{ marginTop: 10 }}>
                    <input type="hidden" name="posting" value={m.posting_id} />
                    <button type="submit" className="mt-btn is-small">{t(R.mRead)}</button>
                    <span className="mt-meta"> {t(R.mReadNote)}</span>
                  </form>
                ) : null}
              </div>
              {link ? <a className="mt-btn is-small" href={link} target="_blank" rel="noopener noreferrer">{t(R.mOpen)}</a> : null}
            </div>
          );
        })}
      </div>
      {!access.paid && rows.length > FREE_SHOWN ? (
        <div className="mt-box" style={{ marginTop: 16 }}>
          <p>{t(R.mLocked, { n: rows.length - FREE_SHOWN })}</p>
          <Link className="mt-btn is-block" href={PRICING_HREF} style={{ marginTop: 10 }}>{t(R.mPass)}</Link>
        </div>
      ) : null}
      {!access.paid && rows.length ? <p className="mt-note">{t(R.mReadNeedPass)}</p> : null}
      {access.paid && !consent && rows.length ? <p className="mt-note">{t(R.mReadNeedConsent)}</p> : null}
    </main>
  );
}
