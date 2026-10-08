"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Answer } from "@/lib/me-v3/scoring/types";
import {
  answerAction, cursorAction, finishAction, noteAction, picksAction,
  picksAction3, profileAction,
} from "./actions";
import {
  FIELD_LABEL, STAGE_LABEL, UNDERGRAD_GLOSS, UNDERGRAD_LABEL,
} from "../tier-text";
import type { Field, ProgressModel, ScreenModel } from "./model";

/**
 * 고른 자리가 켜졌다는 것을 눈으로 본 뒤에 넘어가는 시간.
 *
 * **0 으로 두지 않는다.** 누른 즉시 넘어가면 응시자는 자기가 무엇을
 * 골랐는지 보지 못하고, 잘못 눌렀을 때 무엇이 눌렸는지도 모른다.
 */
const AUTO_MS = 250;

/**
 * 응시 화면 하나.
 *
 * **고르면 그 자리에서 보낸다.** 묶어서 보내면 창을 닫은 순간의 답이
 * 사라지고, 사라진 것을 응시자는 끝까지 모른다. 보기 하나는 작아서
 * 문항마다 보내도 느려지지 않는다(ME_V2 는 한 화면에 열 문항이라 묶어
 * 보냈다).
 *
 * **한 선택으로 끝나는 화면은 눌리면 넘어간다.** 전에는 모든 화면에서
 * `다음` 을 누르게 했고, 보기 하나를 고르고 단추를 또 누르는 동작이
 * 백 번 되풀이됐다. 긴 설문처럼 느껴진 까닭의 절반이 그 두 번째 누름이다.
 * 고른 자리가 켜진 것을 보고 0.25초 뒤에 넘어가고, `이전` 은 늘 열려
 * 있어서 잘못 누른 것을 고칠 수 있다.
 *
 * **훑기와 복수 선택과 근거 고르기와 적는 칸은 손으로 넘긴다.** 거기서
 * 자동으로 넘기면 나머지를 고를 수 없다.
 *
 * **뒤로 가서 고칠 수 있다.** 영역 훑기를 고치면 뒤에 묻는 영역이
 * 달라지므로 서버가 다시 센다(`recomputeRouting`). 이미 답한 심화 응답은
 * 지우지 않는다: 영역이 빠지면 읽히지 않을 뿐이고 되돌아오면 그대로 쓰인다.
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
  const [many, setMany] = useState<string[]>(s.pickedMany ?? []);
  /** 산업을 고르지 않겠다고 말한 자리. 빈 선택과 아직 안 고른 것을 가른다 */
  const [noPick, setNoPick] = useState(false);
  const [stage, setStage] = useState(s.profile?.stage ?? "bachelor");
  const [field, setField] = useState(s.profile?.field ?? "STEM");
  const [undergrad, setUndergrad] = useState(s.profile?.undergrad ?? "");
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
    /* 한 선택으로 끝나는 화면은 켜진 것을 보여 준 뒤에 넘어간다 */
    if (s.auto && s.fields.length === 1 && s.nextIndex !== null) {
      setMoving(true);
      window.setTimeout(() => { void go(s.nextIndex); }, AUTO_MS);
    }
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

  /**
   * 관심 산업과 역할과 조직. **둘까지 고르고 강제하지 않는다.**
   *
   * 셋째를 누르면 가장 먼저 고른 것이 빠진다. 꽉 찼다고 막으면 응시자는
   * 무엇을 지워야 하는지 모른 채 눌리지 않는 화면을 본다.
   */
  const toggleMany = (code: string) => {
    const max = s.max ?? 2;
    const next = many.includes(code)
      ? many.filter((x) => x !== code)
      : [...many, code].slice(-max);
    setMany(next);
    setNoPick(false);
    if (s.pickKind) push(() => picksAction3(s.attemptId, s.pickKind as string as "industry", next));
  };
  const clearMany = () => {
    setMany([]);
    setNoPick(true);
    if (s.pickKind) push(() => picksAction3(s.attemptId, s.pickKind as string as "industry", []));
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
    const r = await finishAction(s.attemptId);
    if (r.ok) { router.push(`/v3/${s.attemptId}/result`); return; }
    router.refresh();
    setMoving(false);
  };

  const mid = s.kind === "transition" || s.kind === "done" || s.kind === "scene";
  /* **폭을 화면 성격으로 가른다.** 질문은 좁게 모으고, 고르거나 훑거나
     쉬는 자리는 넓게 편다 */
  const wide = s.kind === "checklist" || s.kind === "sweep" || !!s.pickKind;
  const width = wide ? " is-explore"
    : (s.kind === "transition" || s.kind === "done") ? " is-calm" : "";

  return (
    <div className={`qs${width}`}>
      <header className="qs-head">
        <div className="qs-head-in">
          <div className="qs-top">
            <span className="qs-brand">CareerMatri</span>
            <span className="qs-tier">{tier} · <b>{tierLabel}</b></span>
          </div>
          <div className="qs-prog">
            <span className="qs-crumb">
              {prog.prev ? <><span className="prev">{prog.prev}</span><i>›</i></> : null}
              <span className="now">{prog.now}</span>
              {prog.next ? <><i>›</i><span className="next">{prog.next}</span></> : null}
            </span>
            <span className="qs-count">{prog.inStage.index} / {prog.inStage.total}</span>
          </div>
          <div className="qs-bar" role="progressbar" aria-valuenow={prog.percent}
            aria-valuemin={0} aria-valuemax={100}
            aria-label={`검사 진행 · ${prog.now}`}>
            <span style={{ width: `${prog.percent}%` }} />
          </div>
        </div>
      </header>

      <main className={`qs-main${mid ? " qs-mid" : ""}`}>
        {s.eyebrow ? <p className="qs-eyebrow">{s.eyebrow}</p> : null}
        {s.subject ? <p className="qs-subject">{s.subject}</p> : null}
        {s.question ? <h1 className="qs-q">{s.question}</h1> : null}
        {/* 전환 화면의 도움말은 **이제 볼 영역의 목록**이다. 한 줄로 이어
            붙이면 가운뎃점으로 묶인 긴 문장이 되고, 쉬는 자리가 빈 화면이
            된다. 줄로 세우면 무엇을 보러 가는지가 그대로 읽힌다 */}
        {s.kind === "transition" && s.help ? (
          <ul className="qs-strip">
            {s.help.split(" · ").map((x, i) => (
              <li key={x}><small>{i + 1}</small>{x}</li>
            ))}
          </ul>
        ) : s.help ? <p className="qs-help">{s.help}</p> : null}

        {/* 산업 장면. 한 절을 먼저 읽고 그 산업이 요구하는 것을 줄로 본다.
            **점수를 만들지 않는다**: 묻기 전에 읽히는 자리다 */}
        {s.kind === "scene" && s.body ? (
          <ul className="qs-scene">
            {s.body.map((x) => <li key={x}>{x}</li>)}
          </ul>
        ) : null}

        {/* ── 기본 정보를 고치는 자리 ── */}
        {s.profile ? (
          <>
            <fieldset className="qs-opts">
              <legend>현재 학업 단계</legend>
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
                            push(() => profileAction(s.attemptId, stage, v, undergrad || null));
                          }} />
                        <span className="qs-mark" aria-hidden />
                        <span className="qs-body"><span className="qs-label">{FIELD_LABEL[v]}</span></span>
                      </label>
                    ))}
                </div>
              </fieldset>
            ) : null}
            {/* 대학원이 인문사회나 경상 계열일 때만 묻는다. 이 검사는
                기계공학 경험을 읽으므로, 학부도 기계공학이 아니면 읽을
                것이 없다. 학부가 기계공학이면 경험이 실제로 있다 */}
            {stage !== "bachelor"
              && (field === "HUMANITIES_SOCIAL" || field === "BUSINESS") ? (
                <fieldset className="qs-opts">
                  <legend>학부 전공</legend>
                  <p className="qs-eyebrow" aria-hidden>학부 전공</p>
                  <div className="qs-list">
                    {(["ME", "OTHER"] as const).map((v) => (
                      <label key={v} className={`qs-opt${undergrad === v ? " is-on" : ""}`}>
                        <input type="radio" name="undergrad" checked={undergrad === v}
                          onChange={() => {
                            setUndergrad(v);
                            push(() => profileAction(s.attemptId, stage, field, v));
                          }} />
                        <span className="qs-mark" aria-hidden />
                        <span className="qs-body">
                          <span className="qs-label">{UNDERGRAD_LABEL[v]}</span>
                          <span className="qs-gloss">{UNDERGRAD_GLOSS[v]}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            {stage !== "bachelor" && undergrad === "OTHER"
              && (field === "HUMANITIES_SOCIAL" || field === "BUSINESS") ? (
                <p className="qs-need" style={{ marginTop: 16, display: "block" }}>
                  이 검사는 기계공학 경험을 읽습니다. 학부와 대학원 모두
                  기계공학 계열이 아니면 드릴 수 있는 결과가 없습니다.
                  전공별 검사가 준비되면 알려드리겠습니다.
                </p>
              ) : null}
          </>
        ) : null}

        {/* ── 열두 줄을 한 화면에서 훑는 자리 ──
            **한 영역씩 열두 화면으로 세우지 않는다.** 줄을 나란히 두어야
            서로 견주면서 빠르게 내려갈 수 있고, 같은 질문을 열두 번 보는
            느낌이 사라진다 */}
        {s.kind === "sweep" ? (
          <div className="qs-sweep">
            {s.fields.map((f) => (
              <Sweep key={f.itemId} f={f} value={vals[f.itemId]} onPick={setAnswer} />
            ))}
          </div>
        ) : null}

        {/* ── 보기 하나를 고르는 화면 ── */}
        {s.kind !== "sweep" && s.fields.length === 1 ? (
          <One f={s.fields[0]} value={vals[s.fields[0].itemId]}
            onPick={setAnswer} notes={notes} onNote={setNote} onNoteDone={flushNote} />
        ) : null}

        {s.kind !== "sweep" && s.fields.length > 1 ? (
          <div className="qs-rows">
            {s.fields.map((f) => (
              <Row key={f.itemId} f={f} value={vals[f.itemId]} onPick={setAnswer}
                notes={notes} onNote={setNote} onNoteDone={flushNote} />
            ))}
          </div>
        ) : null}

        {s.guide ? <p className="qs-guide">{s.guide}</p> : null}

        {/* ── 근거 고르기 ── **스무 줄짜리 목록으로 세우지 않는다** */}
        {s.groups ? (
          <>
            <p className="qs-picked">
              <span>선택한 항목 <b>{Object.values(picks).reduce((n, v) => n + v.length, 0)}</b>개</span>
              <span className="qs-grow" />
              <span>여러 개 선택할 수 있습니다</span>
            </p>
            {s.groups.map((g) => {
              const on = picks[g.slot] ?? [];
              return (
                <div className="qs-group" key={g.slot}>
                  <h3>
                    {g.label}
                    {on.length ? <em>{on.length}개</em> : null}
                  </h3>
                  <div className="qs-chips">
                    {g.items.map((it) => {
                      const checked = on.includes(it);
                      return (
                        <label key={it} className={`qs-chip${checked ? " is-on" : ""}`}>
                          <input type="checkbox" checked={checked}
                            onChange={() => toggle(g.slot, it)} />
                          {it}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : null}

        {/* ── 산업과 역할과 조직 고르기 ── **둘까지 고르고 강제하지 않는다** */}
        {s.packs ? (
          <>
            <p className="qs-picked">
              <span>선택 <b>{many.length}</b> / {s.max ?? 2}</span>
              <span className="qs-grow" />
              <span>{many.length >= (s.max ?? 2)
                ? "다른 것을 고르면 먼저 고른 것이 빠집니다"
                : "고르지 않고 넘어가셔도 됩니다"}</span>
            </p>
            <fieldset className="qs-opts" style={{ margin: 0, border: 0, padding: 0 }}>
              <legend>{s.question}</legend>
              <div className="qs-cards">
                {s.packs.map((p) => (
                  <label key={p.code} className={`qs-card${many.includes(p.code) ? " is-on" : ""}`}>
                    <input type="checkbox" value={p.code} checked={many.includes(p.code)}
                      onChange={() => toggleMany(p.code)} />
                    <b>{p.name}</b>
                    <span>{p.gloss}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button"
              className={`qs-none${noPick && !many.length ? " is-on" : ""}`}
              onClick={clearMany}>아직 잘 모르겠습니다</button>
          </>
        ) : null}

        {/* ── 완료 ── **판정을 적지 않는다.** 무엇을 물었고 무엇을 받았는가까지 */}
        {s.kind === "done" ? (
          <>
            {s.summary ? (
              <ul className="qs-summary">
                <li>
                  <span>확인한 기술영역</span>
                  <b>{s.summary.explored}개 영역</b>
                </li>
                {s.summary.deep.length ? (
                  <li>
                    <span>자세히 확인한 영역</span>
                    <b>{s.summary.deep.join(" · ")}</b>
                  </li>
                ) : null}
                <li>
                  <span>실제 판단을 물은 문항</span>
                  <b>{s.summary.judged}개</b>
                </li>
                <li>
                  <span>응답과 선택</span>
                  <b>답변 {s.answered}개
                    {s.summary.evidence ? <em> · 선택한 항목 {s.summary.evidence}개</em> : null}
                  </b>
                </li>
                {s.summary.industry || s.summary.role ? (
                  <li>
                    <span>산업·역할</span>
                    <b>{[s.summary.industry, s.summary.role].filter(Boolean).join(" · ")}</b>
                  </li>
                ) : null}
              </ul>
            ) : null}
            <p className="qs-help" style={{ marginTop: 24 }}>
              {s.done
                ? "결과를 저장했습니다. 아래에서 바로 보실 수 있습니다."
                : "답변을 바탕으로 결과를 정리합니다. 만든 뒤에도 이전으로 돌아가 고칠 수 있습니다."}
            </p>
          </>
        ) : null}
      </main>

      <nav className="qs-nav" aria-label="화면 이동">
        <div className="qs-nav-in">
          {s.prevIndex !== null ? (
            <button type="button" className="qs-btn qs-btn-ghost"
              onClick={() => go(s.prevIndex)} disabled={moving}>이전</button>
          ) : null}
          <span className="qs-grow" />
          {/* 전환과 완료에는 저장할 것이 없다. 거기 띄우면 뜻 없는 글자가
              다음 걸음 옆에 선다 */}
          {warn ? <span className="qs-need">답을 고른 뒤 다음으로 넘어가세요</span>
            : mid ? null
              : saving > 0 ? <span className="qs-save">저장 중</span>
                : sent ? <span className="qs-save">저장됨</span>
                  : <span className="qs-save">답변은 자동으로 저장됩니다</span>}
          {s.kind === "done" ? (
            s.done ? (
              <a className="qs-btn qs-btn-main" href={`/v3/${s.attemptId}/result`}>결과 보기</a>
            ) : (
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
              {/* 네 칸 눈금. **점수가 아니라 누가 정했는가의 단계다** */}
              {f.optionTag ? (
                <span className="qs-step" aria-hidden>
                  {[0, 1, 2, 3].map((k) => <i key={k} className={k <= i ? "on" : ""} />)}
                </span>
              ) : null}
              <span className="qs-body">
                <span className="qs-label">{label}</span>
                {f.optionHelp?.[i] ? <span className="qs-gloss">{f.optionHelp[i]}</span> : null}
              </span>
              {/* 두 번째와 세 번째가 끝까지 읽어야 갈리므로 네 글자를 옆에 적는다 */}
              {f.optionTag?.[i] ? <span className="qs-tag">{f.optionTag[i]}</span> : null}
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

/* ── 훑기 한 줄. 왼쪽에 영역, 오른쪽에 보기 셋 ──────────────────── */

function Sweep({
  f, value, onPick,
}: {
  f: Field; value: number | string | null;
  onPick: (f: Field, raw: number | string, a: Answer) => void;
}) {
  const c = f.control;
  if (c.kind !== "pick3") return null;
  return (
    <fieldset className="qs-sw">
      <legend>{f.label ?? ""}</legend>
      <span className="qs-sw-row" aria-hidden>{f.label}</span>
      <div className="qs-p3">
        {c.options.map((o) => {
          const on = value === o.value;
          return (
            <label key={o.value} className={`qs-p3b${on ? " is-on" : ""}`}>
              <input type="radio" name={f.itemId} checked={on}
                aria-label={`${f.label ?? ""} · ${o.label}`}
                onChange={() => onPick(f, o.value, c.answer === "exposure"
                  ? { kind: "exposure", value: o.value }
                  : { kind: "scale5", value: o.value })} />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

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
  if (c.kind === "pick3") {
    return <Sweep f={f} value={value} onPick={onPick} />;
  }
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
