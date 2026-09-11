"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import LangSwitch from "@/components/lang-switch";
import type { CompetencyRow, EvidenceRow, EvidenceSource } from "@/lib/evidence";
import { takesGrade } from "@/lib/evidence-shared";
import { sourceName, sourceNote } from "@/lib/evidence-labels";
import { t, type Lang } from "@/lib/locale";
import { add, remove, type EvidenceState } from "./actions";

/**
 * 역량 하나마다 접히는 폼을 둔다. 49개를 전부 펼쳐 두면 화면이 죽고,
 * 별도 페이지로 빼면 어느 역량에 넣는 중인지 잃어버린다.
 */
export default function EvidenceBoard({
  lang,
  rows,
  evidence,
  sources,
  grades,
}: {
  lang: Lang;
  rows: CompetencyRow[];
  evidence: EvidenceRow[];
  sources: EvidenceSource[];
  grades: string[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const required = rows.filter((r) => r.required !== null);
  const others = rows.filter((r) => r.required === null);
  const withEvidence = rows.filter((r) => r.evidenceCount > 0).length;

  const byCompetency = new Map<string, EvidenceRow[]>();
  for (const e of evidence) {
    if (!byCompetency.has(e.competencyId)) byCompetency.set(e.competencyId, []);
    byCompetency.get(e.competencyId)!.push(e);
  }

  const group = (list: CompetencyRow[], title: string) =>
    list.length > 0 && (
      <section className="ev-group" key={title}>
        <h2>{title}</h2>
        <ul className="ev-list">
          {list.map((c) => (
            <Row
              key={c.id}
              c={c}
              lang={lang}
              rows={byCompetency.get(c.id) ?? []}
              sources={sources}
              grades={grades}
              open={open === c.id}
              onToggle={() => setOpen(open === c.id ? null : c.id)}
            />
          ))}
        </ul>
      </section>
    );

  return (
    <div className="ev">
      <header className="ev-bar">
        <div className="ev-bar-in">
          <Link className="brand" href="/my">
            {t("brand", lang)}
          </Link>
          <LangSwitch current={lang} />
        </div>
      </header>

      <main className="ev-main">
        <h1>{t("evTitle", lang)}</h1>
        <p className="ev-lead">{t("evLead", lang)}</p>
        <p className="ev-aside">{t("evWhyNotAsk", lang)}</p>

        <p className="ev-count">
          {withEvidence > 0 ? t("evCount", lang, { n: withEvidence }) : t("evEmpty", lang)}
        </p>

        {group(required, t("evRequired", lang))}
        {group(others, t("evOthers", lang))}

        <p className="ev-foot">
          <Link className="act" href="/my">
            {t("evBackToReport", lang)}
          </Link>
        </p>
      </main>
    </div>
  );
}

function Row({
  c,
  lang,
  rows,
  sources,
  grades,
  open,
  onToggle,
}: {
  c: CompetencyRow;
  lang: Lang;
  rows: EvidenceRow[];
  sources: EvidenceSource[];
  grades: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const [state, formAction, pending] = useActionState<EvidenceState, FormData>(add, {});
  const [source, setSource] = useState(sources[0]?.code ?? "COURSE");
  const src = sources.find((s) => s.code === source);

  return (
    <li className={`ev-item${c.heldLevel !== null ? " has" : ""}`}>
      <div className="ev-head">
        <div className="ev-name">
          <b>{c.name}</b>
          {c.criticality === 3 && <em className="ev-must">{t("repMust", lang)}</em>}
          {c.required !== null && (
            <span className="ev-req">
              {t("repLegendReq", lang)} {c.required}
            </span>
          )}
        </div>

        <span className="ev-level">
          {c.heldLevel === null ? (
            <i>{t("evNone", lang)}</i>
          ) : (
            <>
              <b>
                {t("evHeld", lang)} {c.heldLevel}
              </b>
              <i>
                {t("evSum", lang, { raw: c.heldRaw?.toFixed(2) ?? "0", lv: c.heldLevel })}
              </i>
            </>
          )}
        </span>

        <button type="button" className="act small" onClick={onToggle} aria-expanded={open}>
          {open ? t("evCancel", lang) : t("evAdd", lang)}
        </button>
      </div>

      {rows.length > 0 && (
        <ul className="ev-chips">
          {rows.map((e) => (
            <li key={e.id}>
              <span className="ev-chip-src">{sourceName(e.sourceCode, lang)}</span>
              <span className="ev-chip-label">{e.refLabel}</span>
              {e.grade && <span className="ev-chip-grade">{e.grade}</span>}
              <span className="ev-chip-pt">
                {e.rawPoint.toFixed(2)}
                {t("evPoints", lang)}
              </span>
              <form action={remove}>
                <input type="hidden" name="evidenceId" value={e.id} />
                <button type="submit" className="ev-chip-del" aria-label={t("evDelete", lang)}>
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form className="ev-form" action={formAction}>
          <input type="hidden" name="competencyId" value={c.id} />

          <label className="ev-field">
            <span>{t("evSource", lang)}</span>
            <select name="sourceCode" value={source} onChange={(e) => setSource(e.target.value)}>
              {sources.map((s) => (
                <option key={s.code} value={s.code}>
                  {sourceName(s.code, lang)} · {s.maxPoint.toFixed(1)}
                  {t("evPoints", lang)} × {s.reliability.toFixed(2)}
                </option>
              ))}
            </select>
            <i className="ev-hint">
              {sourceNote(source, lang)}
              {src?.needsProof ? ` · ${t("evNeedsProof", lang)}` : ""}
            </i>
          </label>

          <label className="ev-field">
            <span>{t("evLabel", lang)}</span>
            <input
              name="refLabel"
              maxLength={120}
              required
              placeholder={t("evLabelHint", lang)}
              aria-invalid={state.error ? true : undefined}
            />
          </label>

          {takesGrade(source) && (
            <label className="ev-field narrow">
              <span>{t("evGrade", lang)}</span>
              <select name="grade" defaultValue="">
                <option value="">{t("evGradeBlank", lang)}</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <i className="ev-hint">{t("evGradeNote", lang)}</i>
            </label>
          )}

          <button type="submit" className="act solid" disabled={pending}>
            {t("evSave", lang)}
          </button>

          {state.error && (
            <p className="ev-error" role="alert">
              {state.error}
            </p>
          )}
        </form>
      )}
    </li>
  );
}
