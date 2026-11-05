import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { queryOne } from "@/lib/db";
import type { ResearchDoc } from "@/lib/assistant/research-docs";
import {
  AUTHOR_ROLES, BUDGET_BANDS, DEGREE_LEVELS, DEGREE_STATUS, ITEM_KINDS, METHOD_LEVELS, PATENT_STATUS, PROJECT_ROLES,
  itemOf, methodNamesFromDoc, prefillFromDoc, type ItemKind,
} from "@/lib/research/profile";
import { deleteResearchItem, saveResearchItem } from "../actions";
import { R } from "../research-text";

export const generateMetadata = () => matTitle(R.title);

const ERR = { confirm: R.errConfirm, required: R.errRequired, save: R.errSave } as const;

/** 저장된 값 · 파일에서 채운 값을 입력 칸 기본값(글자)으로 */
function flat(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return out;
}

/**
 * 연구 이력 한 줄 적기 · 고치기. `?kind=` 새로 적기, `?id=` 고치기, `?from=` 내 자료로 미리 채우기.
 * **확인 칸을 눌러야 저장된다**(`parseItem`). 파일에서 채운 값은 기본값일 뿐이다.
 */
export default async function ResearchItemPage({ searchParams }: { searchParams: Promise<{ kind?: string; id?: string; from?: string; e?: string }> }) {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const sp = await searchParams;
  const item = sp.id ? await itemOf(user.id, sp.id) : null;
  if (sp.id && !item) redirect("/mat/research");
  const doc = !item && sp.from && /^\d{1,18}$/.test(sp.from)
    ? await queryOne<Pick<ResearchDoc, "id" | "doc_type" | "title" | "venue" | "year" | "doi" | "terms" | "data">>(
      `SELECT id::text, doc_type, title, venue, year, doi, terms, data FROM research_docs WHERE user_id = $1 AND id = $2`,
      [user.id, sp.from]).catch(() => null)
    : null;
  const pre = doc ? prefillFromDoc(doc) : null;
  const askKind = (ITEM_KINDS as readonly string[]).includes(sp.kind ?? "") ? (sp.kind as ItemKind) : null;
  const kind: ItemKind = item?.kind ?? askKind ?? pre?.kind ?? "paper";
  const v: Record<string, string> = item ? flat(item.data as Record<string, unknown>)
    : pre && pre.kind === kind ? pre.values : {};
  const methods = doc ? methodNamesFromDoc(doc) : [];

  const input = (name: string, label: { ko: string; en: string }, o: { required?: boolean; type?: string; placeholder?: string; min?: number; max?: number } = {}) => (
    <label className="mt-field"><span>{t(label)}</span>
      <input name={name} type={o.type ?? "text"} defaultValue={v[name] ?? ""} required={o.required} placeholder={o.placeholder}
        min={o.min} max={o.max} inputMode={o.type === "number" ? "numeric" : undefined} />
    </label>
  );
  const select = <T extends string>(name: string, label: { ko: string; en: string }, list: readonly T[], labels: Record<T, { ko: string; en: string }>, required = false) => (
    <label className="mt-field"><span>{t(label)}</span>
      <select name={name} defaultValue={v[name] ?? ""} required={required}>
        {required ? null : <option value="">{t(R.f.pickNone)}</option>}
        {list.map((x) => <option key={x} value={x}>{t(labels[x])}</option>)}
      </select>
    </label>
  );
  const keywords = input("keywords", R.f.keywords, { placeholder: t(R.f.keywordsHint) });
  const year = input("year", R.f.year, { type: "number", min: 1950, max: 2100 });

  return (
    <main>
      <p className="mt-meta"><Link href="/mat/research">{t(R.title)}</Link></p>
      <h1 className="mt-h1">{t(R.kinds[kind])}</h1>
      {sp.e && sp.e in ERR ? <p className="mt-alert" role="alert">{t(ERR[sp.e as keyof typeof ERR])}</p> : null}
      {pre ? <p className="mt-alert" role="status">{t(R.prefilled)}</p> : null}
      <form action={saveResearchItem} className="mt-form">
        <input type="hidden" name="kind" value={kind} />
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        {doc ? <input type="hidden" name="from" value={doc.id} /> : null}
        {kind === "paper" ? <>
          {input("title", R.f.title, { required: true })}
          {input("venue", R.f.venue)}
          {year}
          {select("authorRole", R.f.authorRole, AUTHOR_ROLES, R.opt.authorRole)}
          {input("doi", R.f.doi)}
          {keywords}
        </> : null}
        {kind === "project" ? <>
          {input("title", R.f.projectTitle, { required: true })}
          {input("agency", R.f.agency)}
          {input("program", R.f.program)}
          {input("from", R.f.from, { type: "month" })}
          {input("to", R.f.to, { type: "month" })}
          {select("budget", R.f.budget, BUDGET_BANDS, R.opt.budget)}
          {select("role", R.f.role, PROJECT_ROLES, R.opt.role)}
          <label className="mt-field"><span>{t(R.f.tasks)}</span><textarea name="tasks" rows={3} maxLength={600} defaultValue={v.tasks ?? ""} /></label>
          {input("outputs", R.f.outputs)}
          {keywords}
        </> : null}
        {kind === "patent" ? <>
          {input("title", R.f.patentTitle, { required: true })}
          {select("status", R.f.status, PATENT_STATUS, R.opt.patentStatus)}
          {year}
          {input("inventorOrder", R.f.inventorOrder, { type: "number", min: 1, max: 50 })}
          {keywords}
        </> : null}
        {kind === "method" ? <>
          {input("name", R.f.methodName, { required: true })}
          {select("level", R.f.level, METHOD_LEVELS, R.opt.level)}
          {input("note", R.f.note)}
        </> : null}
        {kind === "degree" ? <>
          {select("level", R.f.degreeLevel, DEGREE_LEVELS, R.opt.degree, true)}
          {select("status", R.f.degreeStatus, DEGREE_STATUS, R.opt.degreeStatus)}
          {input("major", R.f.major, { required: true })}
          {input("advisorField", R.f.advisorField)}
          {input("thesisTitle", R.f.thesisTitle)}
          {year}
          {keywords}
        </> : null}
        <label className="mt-opt"><input type="checkbox" name="confirm" value="1" required /><b>{t(R.f.confirm)}</b></label>
        <button type="submit" className="mt-btn is-main is-block">{t(R.f.save)}</button>
      </form>
      {methods.length ? (
        <section>
          <h2 className="mt-h2">{t(R.methodsFound)}</h2>
          <div className="mt-list">
            {methods.map((m) => (
              <form key={m} action={saveResearchItem} className="mt-row">
                <input type="hidden" name="kind" value="method" />
                <input type="hidden" name="name" value={m} />
                <input type="hidden" name="from" value={doc!.id} />
                <div className="mt-row-b">
                  <p>{m}</p>
                  <label className="mt-meta"><input type="checkbox" name="confirm" value="1" required /> {t(R.f.confirmShort)}</label>
                </div>
                <button type="submit" className="mt-btn is-small">{t(R.methodAdd)}</button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
      {item ? (
        <form action={deleteResearchItem} style={{ marginTop: 24 }}>
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="mt-btn is-block">{t(R.f.del)}</button>
        </form>
      ) : null}
    </main>
  );
}
