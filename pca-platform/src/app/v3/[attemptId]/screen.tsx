"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UNKNOWN, type Answer } from "@/lib/me-v3/scoring/types";
import type { GradField, Stage, UndergradCore } from "@/lib/me-v3/scoring/types";
import { eligible } from "@/lib/me-v3/runtime/routing";
import {
  answerAction, cursorAction, finishAction, noteAction, picksAction,
  picksAction3, profileAction,
} from "./actions";
import {
  FIELD_LABEL, STAGE_LABEL, UNDERGRAD_ASK, UNDERGRAD_GLOSS, UNDERGRAD_HELP,
  UNDERGRAD_LABEL,
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
  /**
   * 관심 산업과 역할과 조직. **둘까지다.**
   *
   * 전에는 셋째를 누르면 가장 먼저 고른 것이 **조용히 빠졌다.** 자동으로
   * 빠지는 것은 예상할 수 없고, 빠진 뒤에 무엇이 빠졌는지도 알 수 없다.
   * 꽉 차면 나머지를 못 누르게 하고 **무엇을 지우면 되는지** 적는다.
   */
  const toggleMany = (code: string) => {
    const max = s.max ?? 2;
    const on = many.includes(code);
    if (!on && many.length >= max) return;
    const next = on ? many.filter((x) => x !== code) : [...many, code];
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

  /**
   * 기본 정보 화면에서 **이 Core 를 받을 수 있는가.**
   *
   * `eligible()` 은 전부터 이 규칙을 들고 있었는데 **부르는 자리가 한
   * 곳도 없었다.** 그래서 학부와 대학원이 모두 비기계인 분에게 경고만
   * 띄우고 마흔 문항을 끝까지 받았고, 그 끝에 드릴 수 있는 결과가 없다.
   * 묻기 전에 막는 자리가 여기다.
   *
   * **임의로 좁히지 않는다.** 막는 경우는 `eligible()` 이 적어 둔 하나뿐
   * 이다(대학원이 인문·사회나 경상이고 학부도 기계공학이 아닌 경우).
   * 학부생과 이공계·융합 대학원생은 그대로 지나간다.
   */
  const gate = s.profile
    ? eligible(
        (stage || null) as Stage | null,
        stage === "bachelor" ? null : ((field || null) as GradField | null),
        (undergrad || null) as UndergradCore | null)
    : { ok: true, reason: null };
  const needMore = s.profile ? gate.reason === "NEED_PROFILE" : false;
  const offCore = s.profile ? gate.reason === "NON_ME_GRADUATE" : false;
  const blocked = (s.required && !filled) || needMore || offCore;

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
        {/* 완료 화면의 머리글은 제출 전과 뒤가 다르다. **다 푼 사람에게
            `준비가 됐습니다` 를 그대로 두면** 아직 할 일이 남은 줄 안다 */}
        {s.question ? (
          <h1 className="qs-q">
            {s.kind === "done" && s.done ? "내 CareerMatri가 만들어졌습니다" : s.question}
          </h1>
        ) : null}
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
            {/* **대학원생 전부에게 묻는다.** 학부 전공과 대학원 전공계열은
                다른 값이고, 대학원 경험을 번역할 때 학부에서 무엇을 했는지가
                그 번역의 출발점이다. 대학원이 인문·사회나 경상 계열이면 이
                값이 응시 자격까지 가른다 */}
            {stage !== "bachelor" && field ? (
                <fieldset className="qs-opts">
                  <legend>{UNDERGRAD_ASK}</legend>
                  <p className="qs-eyebrow" aria-hidden>{UNDERGRAD_ASK}</p>
                  <p className="qs-gloss" aria-hidden>{UNDERGRAD_HELP}</p>
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
            {/* **경고만 띄우고 통과시키지 않는다.** 전에는 같은 문장을
                적어 두고 `다음` 이 그대로 눌렸다. 끝까지 풀고 나서
                드릴 결과가 없다고 말하는 것이 가장 나쁜 순서다. 여기서
                멈추고 전공 고르는 자리로 돌려보낸다 */}
            {offCore ? (
              <div className="qs-stop" role="alert">
                <b>이 검사는 기계공학 경험을 읽습니다.</b>
                <p>
                  학부와 대학원이 모두 기계공학 계열이 아니면 지금 드릴 수
                  있는 결과가 없습니다. 끝까지 답하셔도 결과가 비어 있어
                  여기서 멈춥니다.
                </p>
                <p>
                  학부가 기계공학 계열이면 위에서 다시 골라주세요. 전공별
                  검사는 준비되는 대로 전공 목록에 열립니다.
                </p>
                <a className="qs-btn qs-btn-main" href="/cores">전공 목록으로</a>
              </div>
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
            <p className="qs-picked is-lead">
              <span>고른 항목 <b>{Object.values(picks).reduce((n, v) => n + v.length, 0)}</b>개</span>
              <span className="qs-grow" />
              <span className="qs-hint">해당하는 것만 골라주세요. 없으면 넘어가도 됩니다</span>
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
            <p className="qs-picked is-lead">
              <span><b>{many.length}</b> / {s.max ?? 2} 선택</span>
              <span className="qs-grow" />
              <span className="qs-hint">{many.length >= (s.max ?? 2)
                ? "둘까지 고를 수 있습니다. 바꾸려면 고른 것을 한 번 더 누르세요"
                : "고르지 않고 넘어가셔도 됩니다"}</span>
            </p>
            <fieldset className="qs-opts" style={{ margin: 0, border: 0, padding: 0 }}>
              <legend>{s.question}</legend>
              <div className="qs-cards">
                {s.packs.map((p) => {
                  const on = many.includes(p.code);
                  const off = !on && many.length >= (s.max ?? 2);
                  return (
                  <label key={p.code}
                    className={`qs-card${on ? " is-on" : ""}${off ? " is-off" : ""}`}>
                    <input type="checkbox" value={p.code} checked={on} disabled={off}
                      onChange={() => toggleMany(p.code)} />
                    <b>{p.name}</b>
                    <span>{p.gloss}</span>
                  </label>
                  );
                })}
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
                ? "검사는 끝이 아니라 시작입니다. 경험이 늘면 근거와 Gap을 다시 계산합니다."
                : "지금까지 답하신 것으로 결과를 정리합니다. 만든 뒤에도 이전으로 돌아가 고칠 수 있습니다."}
            </p>
            {/* **PDF 하나로 끝내지 않는다.** 결과를 받은 사람이 다음에 갈
                자리가 여섯이다. 하나만 두면 그 하나를 누른 날 끝난다 */}
            {s.done ? (
              <ul className="qs-done-next">
                {[
                  [`/v3/${s.attemptId}/result`, "결과 보기", "기술영역과 산업과 직무를 이어 읽습니다"],
                  ["/me", "내 CareerMatri", "지금 방향과 근거와 Gap을 한 쪽에 둡니다"],
                  [`/v3/${s.attemptId}/result#evidence`, "내 Evidence", "확인된 판단과 고른 근거"],
                  ["/me/gap", "내 Gap", "비어 있는 자리와 그것을 메우는 일"],
                  ["/me/explore", "관심 산업과 직무", "여덟 산업과 여덟 직무를 다시 봅니다"],
                  ["/me/experience/new", "새 경험 추가", "다음 재분석에 들어갑니다"],
                ].map(([href, label, note]) => (
                  <li key={href}>
                    <a href={href}>
                      <b>{label}</b>
                      <small>{note}</small>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
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
          {warn && !offCore
            ? <span className="qs-need">답을 고른 뒤 다음으로 넘어가세요</span>
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
            /* **멈추는 자리에서는 단추도 멈춘다.** `next()` 가 거절하는
               것만으로는 눌러 본 사람이 고장으로 읽는다. 답을 아직 안
               고른 경우는 끄지 않는다: 그때는 끄는 것보다 왜 못 넘어가는지
               한 줄 적는 쪽이 낫다 */
            <button type="button" className="qs-btn qs-btn-main"
              onClick={next} disabled={moving || s.nextIndex === null || offCore}>
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
              {/* **눈금을 두지 않는다.** 한 칸씩 올라가는 막대를 보기 옆에
                  두니 `1점 · 2점 · 3점 · 4점` 으로 읽혔다. 이 넷은 누가
                  정했는가의 단계이고 점수가 아니다. 그 단계를 말하는 것은
                  보기 문면과 오른쪽 네 글자 꼬리표다 */}
              <span className="qs-body">
                <span className="qs-label">{label}</span>
                {f.optionHelp?.[i] ? <span className="qs-gloss">{f.optionHelp[i]}</span> : null}
              </span>
              {/* 두 번째와 세 번째가 끝까지 읽어야 갈리므로 네 글자를 옆에 적는다 */}
              {f.optionTag?.[i] ? <span className="qs-tag">{f.optionTag[i]}</span> : null}
            </label>
          ))}
        </div>
        {/* **뜻풀이를 보기마다 깔지 않는다.** 처음 만나는 화면에서 한 번
            펼치고 그 뒤에는 접어 둔다. 개념은 그대로이고 매번 다시 읽지
            않게 하는 자리다 */}
        {f.optionHelpFold ? (
          <details className="qs-optfold">
            <summary>보기가 어떻게 갈리나요</summary>
            <ul>
              {c.options.map((label, i) => (
                <li key={i}><b>{label}</b>{f.optionHelpFold?.[i]}</li>
              ))}
            </ul>
          </details>
        ) : null}
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
  if (c.kind !== "steps") return null;
  /**
   * **척도와 척도 밖을 가른다.**
   *
   * 다섯 단계는 한 줄에 붙여 세우고 `잘 모르겠다` 는 그 뒤에 작게 둔다.
   * 둘을 같은 줄에 나란히 두면 `별로 관심 없다` 와 `잘 모르겠다` 가 같은
   * 축의 이웃처럼 읽히는데, 앞엣것은 관심 수준이고 뒷엣것은 정보가 없다는
   * 뜻이다.
   */
  const steps = c.options.filter((o) => o.value !== null);
  const esc = c.options.find((o) => o.value === null);
  const pick = (o: { value: number | null }) => () => onPick(
    f, o.value === null ? UNKNOWN : o.value,
    o.value === null ? { kind: "choice", value: UNKNOWN }
      : c.answer === "exposure"
      ? { kind: "exposure", value: o.value }
      : { kind: "scale5", value: o.value });
  return (
    <fieldset className="qs-sw">
      <legend>{f.label ?? ""}</legend>
      <span className="qs-sw-row" aria-hidden>{f.label}</span>
      <div className="qs-steps" data-n={steps.length}>
        {steps.map((o) => {
          const on = value === o.value;
          return (
            /* **숫자를 적지 않는다.** 1에서 5를 그리면 심리검사 표가 되고,
               뜻은 격자 머리에 한 번 적혀 있다 */
            <label key={o.label} className={`qs-step${on ? " is-on" : ""}`}
              title={o.label}>
              <input type="radio" name={f.itemId} checked={on}
                aria-label={`${f.label ?? ""} · ${o.label}`} onChange={pick(o)} />
              <span>{o.short}</span>
            </label>
          );
        })}
      </div>
      {esc ? (
        <label className={`qs-esc${value === UNKNOWN ? " is-on" : ""}`} title={esc.label}>
          <input type="radio" name={f.itemId} checked={value === UNKNOWN}
            aria-label={`${f.label ?? ""} · ${esc.label}`} onChange={pick(esc)} />
          {esc.short}
        </label>
      ) : null}
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
  if (c.kind === "steps") {
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
    /* **각 상자의 질문을 눈에 보이게 세운다.** `One` 의 `legend` 는 보조
       기기용으로 숨겨져 있어서, 이 줄이 없으면 보기 넷만 둘 나란히 서고
       무엇에 답하는지가 화면에 없다. 보조 기기는 `legend` 로 같은 말을
       한 번 받으므로 여기서는 `aria-hidden` 으로 되풀이를 막는다 */
    return (
      <div className="qs-row">
        {f.label ? <span aria-hidden>{f.label}</span> : null}
        <One f={f} value={value} onPick={onPick}
          notes={notes} onNote={onNote} onNoteDone={onNoteDone} />
      </div>
    );
  }
  return null;
}
