"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Answer } from "@/lib/me-v3/scoring/types";
import {
  answerAction, cursorAction, finishAction, noteAction, packAction, picksAction,
  profileAction,
} from "./actions";
import { FIELD_LABEL, STAGE_LABEL } from "../tier-text";
import type { Field, ProgressModel, ScreenModel } from "./model";

/**
 * 응시 화면 하나.
 *
 * **고르면 그 자리에서 보낸다.** 묶어서 보내면 창을 닫은 순간의 답이
 * 사라지고, 사라진 것을 응시자는 끝까지 모른다. 보기 하나는 작아서
 * 문항마다 보내도 느려지지 않는다(ME_V2 는 한 화면에 열 문항이라 묶어
 * 보냈다).
 *
 * **자동으로 다음 화면으로 넘기지 않는다.** 고르는 순간 넘어가면 잘못
 * 누른 것을 고칠 자리가 없고, 그 오선택이 그대로 판정에 들어간다.
 *
 * **뒤로 가서 고칠 수 있다.** 격자를 고치면 뒤에 묻는 영역이 달라지므로
 * 서버가 다시 센다(`recomputeRouting`). 이미 답한 심화 응답은 지우지
 * 않는다: 영역이 빠지면 읽히지 않을 뿐이고 되돌아오면 그대로 쓰인다.
 */
export default function Screen({
  s, prog, tier, tierLabel,
}: {
  s: ScreenModel; prog: ProgressModel; tier: string; tierLabel: string;
}) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, number | string | null>>(
    Object.fromEntries(s.fields.map((f) => [f.itemId, f.value])));
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(s.fields.map((f) => [f.itemId, f.note ?? ""])));
  const [picks, setPicks] = useState<Record<string, string[]>>(
    Object.fromEntries((s.groups ?? []).map((g) => [g.slot, g.picked])));
  const [pack, setPack] = useState<string | null>(s.picked ?? null);
  const [stage, setStage] = useState(s.profile?.stage ?? "bachelor");
  const [field, setField] = useState(s.profile?.field ?? "STEM");
  const [saving, setSaving] = useState(0);
  /* 한 번도 보내지 않았는데 `저장됨` 이라고 적지 않는다 */
  const [sent, setSent] = useState(false);
  const [moving, setMoving] = useState(false);
  const [warn, setWarn] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /** 보내는 것을 줄 세운다. 둘이 겹치면 늦게 끝난 쪽이 먼저 끝난 쪽을 덮는다 */
  const push = useCallback((run: () => Promise<unknown>) => {
    setSaving((n) => n + 1);
    queue.current = queue.current.then(run)
      .finally(() => { setSaving((n) => n - 1); setSent(true); });
    return queue.current;
  }, []);

  const setAnswer = (f: Field, raw: number | string, a: Answer) => {
    setVals((v) => ({ ...v, [f.itemId]: raw }));
    setWarn(false);
    push(() => answerAction(s.attemptId, f.itemId, a));
  };

  const setNote = (f: Field, text: string) => {
    setNotes((n) => ({ ...n, [f.itemId]: text }));
  };
  const flushNote = (f: Field) => {
    push(() => noteAction(s.attemptId, f.itemId, notes[f.itemId] ?? ""));
  };

  const toggle = (slot: string, item: string) => {
    const now = picks[slot] ?? [];
    const next = now.includes(item) ? now.filter((x) => x !== item) : [...now, item];
    setPicks((p) => ({ ...p, [slot]: next }));
    /* 영역은 화면이 들고 있다. 묶음 이름으로 영역을 짐작하지 않는다 */
    if (s.domain) push(() => picksAction(s.attemptId, s.domain as string, slot, next));
  };

  const choosePack = (kind: "industry" | "role", code: string) => {
    setPack(code);
    push(() => packAction(s.attemptId, kind, code));
  };

  const filled = s.fields.every((f) => vals[f.itemId] !== null && vals[f.itemId] !== undefined);
  const blocked = s.required && !filled;

  const go = async (to: number | null) => {
    if (to === null) return;
    setMoving(true);
    await queue.current;
    await cursorAction(s.attemptId, to);
    router.push(`/v3/${s.attemptId}?s=${to}`);
  };

  const next = async () => {
    if (blocked) { setWarn(true); return; }
    await go(s.nextIndex);
  };

  const finish = async () => {
    setMoving(true);
    await queue.current;
    await finishAction(s.attemptId);
    router.refresh();
    setMoving(false);
  };

  const mid = s.kind === "transition" || s.kind === "done";

  return (
    <div className="qs">
      <header className="qs-top">
        <span className="qs-brand">CareerMatri</span>
        <span className="qs-tier">{tier} · <b>{tierLabel}</b></span>
      </header>

      <div className="qs-prog">
        <ol className="qs-stages">
          {prog.stages.map((st) => (
            <li key={st.label} className={`is-${st.state}`}
              aria-current={st.state === "current" ? "step" : undefined}>{st.label}</li>
          ))}
        </ol>
        <span className="qs-stage-now">{prog.inStage.label}</span>
        <span className="qs-inblock">{prog.inStage.index} / {prog.inStage.total}</span>
        <div className="qs-bar" role="progressbar" aria-valuenow={prog.percent}
          aria-valuemin={0} aria-valuemax={100} aria-label="검사 진행">
          <span style={{ width: `${prog.percent}%` }} />
        </div>
      </div>

      <main className={`qs-main${mid ? " qs-mid" : ""}`}>
        {s.eyebrow ? <p className="qs-eyebrow">{s.eyebrow}</p> : null}
        {s.subject ? <p className="qs-subject">{s.subject}</p> : null}
        {s.question ? <h1 className="qs-q">{s.question}</h1> : null}
        {s.help ? <p className="qs-help">{s.help}</p> : null}

        {/* ── 기본 정보를 고치는 자리 ── */}
        {s.profile ? (
          <>
            <fieldset className="qs-opts">
              <legend>지금 학업 단계</legend>
              <div className="qs-list">
                {(["bachelor", "master", "phd", "postdoc"] as const).map((v) => (
                  <label key={v} className={`qs-opt${stage === v ? " is-on" : ""}`}>
                    <input type="radio" name="stage" checked={stage === v}
                      onChange={() => {
                        setStage(v);
                        push(() => profileAction(s.attemptId, v,
                          v === "bachelor" ? null : field));
                      }} />
                    <span className="qs-mark" aria-hidden />
                    <span className="qs-body"><span className="qs-label">{STAGE_LABEL[v]}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            {stage !== "bachelor" ? (
              <fieldset className="qs-opts">
                <legend>대학원 전공계열</legend>
                <p className="qs-eyebrow" aria-hidden>대학원 전공계열</p>
                <div className="qs-list">
                  {(["STEM", "HUMANITIES_SOCIAL", "BUSINESS", "OTHER_INTERDISCIPLINARY"] as const)
                    .map((v) => (
                      <label key={v} className={`qs-opt${field === v ? " is-on" : ""}`}>
                        <input type="radio" name="field" checked={field === v}
                          onChange={() => {
                            setField(v);
                            push(() => profileAction(s.attemptId, stage, v));
                          }} />
                        <span className="qs-mark" aria-hidden />
                        <span className="qs-body"><span className="qs-label">{FIELD_LABEL[v]}</span></span>
                      </label>
                    ))}
                </div>
              </fieldset>
            ) : null}
          </>
        ) : null}

        {/* ── 보기 하나를 고르는 화면 ── */}
        {s.fields.length === 1 && s.fields[0].control.kind !== "scale5"
          && s.fields[0].control.kind !== "exposure" ? (
            <One f={s.fields[0]} value={vals[s.fields[0].itemId]}
              onPick={setAnswer} notes={notes} onNote={setNote} onNoteDone={flushNote} />
          ) : null}

        {/* ── 척도가 여럿 서는 화면(격자 · 선호 · 목표) ── */}
        {s.fields.length > 1 || (s.fields.length === 1
          && (s.fields[0].control.kind === "scale5" || s.fields[0].control.kind === "exposure")) ? (
            <div className="qs-rows">
              {s.fields.map((f) => (
                <Row key={f.itemId} f={f} value={vals[f.itemId]} onPick={setAnswer}
                  notes={notes} onNote={setNote} onNoteDone={flushNote} />
              ))}
            </div>
          ) : null}

        {s.guide ? <p className="qs-guide">{s.guide}</p> : null}

        {/* ── 근거 고르기 ── */}
        {s.groups?.map((g) => (
          <div className="qs-group" key={g.slot}>
            <h3>{g.label}</h3>
            <div className="qs-chips">
              {g.items.map((it) => {
                const on = (picks[g.slot] ?? []).includes(it);
                return (
                  <label key={it} className={`qs-opt is-box${on ? " is-on" : ""}`}>
                    <input type="checkbox" checked={on}
                      onChange={() => toggle(g.slot, it)} />
                    <span className="qs-mark" aria-hidden />
                    <span className="qs-body"><span className="qs-label">{it}</span></span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── 산업과 역할 고르기 ── */}
        {s.packs ? (
          <div className="qs-list" style={{ marginTop: 24 }}>
            {s.packs.map((p) => (
              <label key={p.code} className={`qs-opt${pack === p.code ? " is-on" : ""}`}>
                <input type="radio" name="pack" value={p.code} checked={pack === p.code}
                  onChange={() => choosePack(s.kind === "pick-industry" ? "industry" : "role", p.code)} />
                <span className="qs-mark" aria-hidden />
                <span className="qs-body">
                  <span className="qs-label">{p.name}</span>
                  <span className="qs-gloss">{p.gloss}</span>
                </span>
              </label>
            ))}
          </div>
        ) : null}

        {/* ── 완료 ── */}
        {s.kind === "done" ? (
          <div style={{ marginTop: 28 }}>
            {s.done ? (
              <p className="qs-lead">
                답하신 {s.answered}개를 받아 결과를 만들어 두었습니다. 읽는 화면은
                준비되는 대로 이 자리에서 열립니다.
              </p>
            ) : (
              <p className="qs-lead">
                답하신 {s.answered}개로 결과를 만듭니다. 만든 뒤에도 이전으로
                돌아가 고치실 수 있고, 고치면 다시 만듭니다.
              </p>
            )}
          </div>
        ) : null}
      </main>

      <nav className="qs-nav" aria-label="화면 이동">
        <div className="qs-nav-in">
          {s.prevIndex !== null ? (
            <button type="button" className="qs-btn qs-btn-ghost"
              onClick={() => go(s.prevIndex)} disabled={moving}>이전</button>
          ) : null}
          <span className="qs-grow" />
          {warn ? <span className="qs-need">답을 고르신 뒤 넘어갑니다</span>
            : saving > 0 ? <span className="qs-save">저장 중</span>
              : sent ? <span className="qs-save">저장됨</span>
                : <span className="qs-save">문항마다 저장됩니다</span>}
          {s.kind === "done" ? (
            s.done ? null : (
              <button type="button" className="qs-btn qs-btn-main"
                onClick={finish} disabled={moving}>결과 만들기</button>
            )
          ) : (
            <button type="button" className="qs-btn qs-btn-main"
              onClick={next} disabled={moving || s.nextIndex === null}>
              {s.kind === "transition" ? "계속" : "다음"}
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

/* ── 보기 하나를 고르는 자리 ───────────────────────────────────────── */

function One({
  f, value, onPick, notes, onNote, onNoteDone,
}: {
  f: Field; value: number | string | null;
  onPick: (f: Field, raw: number | string, a: Answer) => void;
  notes: Record<string, string>;
  onNote: (f: Field, t: string) => void;
  onNoteDone: (f: Field) => void;
}) {
  const c = f.control;
  if (c.kind === "level") {
    return (
      <fieldset className="qs-opts">
        <legend>{f.label ?? "보기"}</legend>
        <div className="qs-list">
          {c.options.map((label, i) => (
            <label key={i} className={`qs-opt${value === i ? " is-on" : ""}`}>
              <input type="radio" name={f.itemId} checked={value === i}
                onChange={() => onPick(f, i, { kind: "level", index: i })} />
              <span className="qs-mark" aria-hidden />
              <span className="qs-body">
                <span className="qs-label">{label}</span>
                {f.optionHelp?.[i] ? <span className="qs-gloss">{f.optionHelp[i]}</span> : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (c.kind === "choice") {
    return (
      <>
        <fieldset className="qs-opts">
          <legend>{f.label ?? "보기"}</legend>
          <div className="qs-list">
            {c.options.map((o) => (
              <label key={o.value} className={`qs-opt${value === o.value ? " is-on" : ""}`}>
                <input type="radio" name={f.itemId} checked={value === o.value}
                  onChange={() => onPick(f, o.value, { kind: "choice", value: o.value })} />
                <span className="qs-mark" aria-hidden />
                <span className="qs-body"><span className="qs-label">{o.label}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        {c.note ? (
          <div className="qs-note">
            <label htmlFor={`n-${f.itemId}`}>{c.note.label}</label>
            <input id={`n-${f.itemId}`} value={notes[f.itemId] ?? ""}
              onChange={(e) => onNote(f, e.target.value)}
              onBlur={() => onNoteDone(f)} maxLength={200} />
          </div>
        ) : null}
      </>
    );
  }
  return <Row f={f} value={value} onPick={onPick}
    notes={notes} onNote={onNote} onNoteDone={onNoteDone} />;
}

/* ── 한 줄짜리 척도. 격자와 선호 화면이 쓴다 ───────────────────────── */

function Row({
  f, value, onPick, notes, onNote, onNoteDone,
}: {
  f: Field; value: number | string | null;
  onPick: (f: Field, raw: number | string, a: Answer) => void;
  notes: Record<string, string>;
  onNote: (f: Field, t: string) => void;
  onNoteDone: (f: Field) => void;
}) {
  const c = f.control;
  if (c.kind === "scale5" || c.kind === "exposure") {
    const labels = c.kind === "scale5" ? c.labels : c.options;
    /* 1 에서 5 · 없다에서 여러 번. **값의 뜻을 양 끝에만 적지 않는다**:
       가운데 칸이 무엇인지 모르면 사람들은 가운데를 누른다 */
    return (
      <fieldset className="qs-row qs-opts">
        <legend>{f.label ?? "척도"}</legend>
        {f.label ? <span aria-hidden>{f.label}</span> : null}
        <div className="qs-scale">
          {labels.map((label, i) => {
            const v = c.kind === "scale5" ? i + 1 : i;
            const on = value === v;
            return (
              <label key={i} className={`qs-cell${on ? " is-on" : ""}`}>
                <input type="radio" name={f.itemId} checked={on}
                  aria-label={`${f.label ?? ""} ${label}`}
                  onChange={() => onPick(f, v, c.kind === "scale5"
                    ? { kind: "scale5", value: v } : { kind: "exposure", value: v })} />
                {c.kind === "scale5" ? <b>{v}</b> : null}
                <i>{label}</i>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }
  if (c.kind === "level" || c.kind === "choice") {
    return (
      <div className="qs-row">
        {f.label ? <span>{f.label}</span> : null}
        <One f={f} value={value} onPick={onPick}
          notes={notes} onNote={onNote} onNoteDone={onNoteDone} />
      </div>
    );
  }
  return null;
}
