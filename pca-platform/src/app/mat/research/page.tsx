import Link from "next/link";
import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { mailReady } from "@/lib/outbox";
import { researchDocsOf, DOC_TYPE_KO } from "@/lib/assistant/research-docs";
import { ITEM_KINDS, WATCH_CATEGORIES, itemsOf, prefsOf, type ItemKind, type ResearchItem } from "@/lib/research/profile";
import { matchesOf } from "@/lib/research/match";
import { saveResearchPrefs } from "./actions";
import { R } from "./research-text";
import { itemHead, itemSub } from "./item-line";

export const generateMetadata = () => matTitle(R.title);

const OK = { saved: R.saved, deleted: R.deleted, prefs: R.prefsSaved } as const;

/**
 * 연구 이력(2026-11-05). 다섯 종류를 한 화면에 모으고, 파일로 채우기 · 맞는 공고 · 알림 설정으로 잇는다.
 * **본인만 본다**: 이 화면과 입력 화면은 로그인한 사람의 줄만 읽는다.
 */
export default async function ResearchHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const ok = (await searchParams).ok;
  const [items, prefs, docs, matches] = await Promise.all([
    itemsOf(user.id), prefsOf(user.id), researchDocsOf(user.id), matchesOf(user.id, 0, 500),
  ]);
  const by = (k: ItemKind) => items.filter((i) => i.kind === k);
  const mailOn = mailReady();
  return (
    <main>
      <h1 className="mt-h1">{t(R.title)}</h1>
      <p className="mt-lead">{t(R.lead)} {t(R.private)}</p>
      {ok && ok in OK ? <p className="mt-alert" role="status">{t(OK[ok as keyof typeof OK])}</p> : null}

      <Link href="/mat/research/matches" className="mt-btn is-main is-block">
        {matches.length ? t(R.matches, { n: matches.length }) : t(R.mTitle)}
      </Link>
      {!matches.length && items.length ? <p className="mt-note">{t(R.matchesNone)}</p> : null}

      {ITEM_KINDS.map((k) => (
        <section key={k} id={k}>
          <h2 className="mt-h2">{t(R.kinds[k])} <small><Link href={`/mat/research/item?kind=${k}`}>{t(R.add)}</Link></small></h2>
          {by(k).length ? (
            <div className="mt-list">
              {by(k).map((it: ResearchItem) => (
                <div className="mt-row" key={it.id}>
                  <div className="mt-row-b">
                    <p>{itemHead(it, lang)}</p>
                    <small>{itemSub(it, lang)}</small>
                    {it.terms.length ? <div className="mt-chips">{it.terms.slice(0, 6).map((x) => <span className="mt-chip" key={x}>{x}</span>)}</div> : null}
                  </div>
                  <Link className="mt-btn is-small" href={`/mat/research/item?id=${it.id}`}>{t(R.edit)}</Link>
                </div>
              ))}
            </div>
          ) : <p className="mt-note">{t(R.empty)}</p>}
        </section>
      ))}

      <section id="files">
        <h2 className="mt-h2">{t(R.fromFile)} <small><Link href="/me/track/research">{t(R.fromFileUpload)}</Link></small></h2>
        <p className="mt-note" style={{ marginTop: 0, marginBottom: 10 }}>{t(R.fromFileLead)}</p>
        {docs.length ? (
          <div className="mt-list">
            {docs.slice(0, 12).map((d) => (
              <div className="mt-row" key={d.id}>
                <div className="mt-row-b"><p>{d.title}</p><small>{DOC_TYPE_KO[d.doc_type]}{d.year ? ` · ${d.year}` : ""}</small></div>
                <Link className="mt-btn is-small" href={`/mat/research/item?from=${d.id}`}>{t(R.fromFileGo)}</Link>
              </div>
            ))}
          </div>
        ) : <p className="mt-note">{t(R.fromFileNone)}</p>}
      </section>

      <section id="alerts">
        <h2 className="mt-h2">{t(R.alerts)}</h2>
        <form action={saveResearchPrefs} className="mt-form">
          <label className="mt-opt"><input type="checkbox" name="screen" value="1" defaultChecked={prefs.screen} /><b>{t(R.alertScreen)}</b></label>
          <label className="mt-opt"><input type="checkbox" name="email_daily" value="1" defaultChecked={prefs.email_daily} />
            <span><b>{t(R.alertEmail)}</b>{mailOn ? null : <span>{t(R.alertEmailOff)}</span>}</span></label>
          <fieldset className="mt-opts">
            <legend className="mt-meta">{t(R.alertCats)}</legend>
            <div className="mt-chips">
              {WATCH_CATEGORIES.map((c) => (
                <label key={c} className="mt-chip"><input type="checkbox" name="categories" value={c} defaultChecked={prefs.categories.includes(c)} /> {c}</label>
              ))}
            </div>
          </fieldset>
          <label className="mt-field"><span>{t(R.alertMin)}</span>
            <select name="min_score" defaultValue={String(prefs.min_score)}>
              {[30, 40, 60].map((n) => <option key={n} value={n}>{t(R.mScore, { n })}</option>)}
            </select>
          </label>
          <button type="submit" className="mt-btn is-block">{t(R.alertSave)}</button>
        </form>
      </section>
    </main>
  );
}
