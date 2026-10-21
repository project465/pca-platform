"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/sf/brand-mark";
import { useRouter } from "next/navigation";
import { UNKNOWN, type Answer } from "@/lib/me-v3/scoring/types";
import type { GradField, Stage, UndergradCore } from "@/lib/me-v3/scoring/types";
import { eligible } from "@/lib/me-v3/runtime/routing";
import {
  answerAction, cursorAction, finishAction, noteAction, picksAction,
  picksAction3, profileAction,
} from "./actions";
import {
  FIELD_LABEL, STAGE_LABEL, UNDERGRAD_ASK, UNDERGRAD_HELP,
  undergradGloss, undergradLabel,
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
 * 화면을 옮기지 못했을 때 단추를 다시 켜는 때.
 *
 * 옮겨 갔으면 이 컴포넌트가 사라져 이 시간 재기는 울리지 않는다. 울리는
 * 것은 **옮겨 가지 못한 경우**뿐이고, 그때 꺼진 단추를 그대로 두면 응시가
 * 그 자리에서 끝난다.
 */
const MOVE_TIMEOUT_MS = 8000;
/** 고르는 칸만 서는 화면. 다 채우면 저절로 다음으로 간다 */
const AUTO_KINDS = new Set(["single", "pair", "sweep", "group"]);

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
  s, prog, tier, tierLabel, school, department, major, majorExamples,
}: {
  s: ScreenModel; prog: ProgressModel; tier: string;
  /** 산 등급. **학교 진입이면 `null`** 이고 그때는 머리띠에 서지 않는다 */
  tierLabel: string | null;
  /** 학교 진입으로 들어온 응시면 그 학교와 학과. 아니면 둘 다 `null` */
  school?: string | null;
  department?: string | null;
  /** 이 응시가 읽는 전공 이름. **글자로 적지 않는다**: 전공이 늘면 이
      화면이 다른 전공 이름을 적는다 */
  major: string;
  /** 그 계열에 드는 학과 보기. 등록부의 별칭에서 온다 */
  majorExamples: string;
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
  /**
   * 저장이 실패한 자리. **조용히 지나가지 않는다**(규격 §39).
   *
   * 앞 판본은 `.finally` 로 `저장됨` 을 늘 켰다. 서버가 거절해도 머리띠는
   * `저장됨` 이었고, 응시자는 끝까지 풀고 나서 답이 비어 있는 결과를
   * 받는다. 지금은 실패한 호출을 들고 있다가 눌러서 다시 보낸다.
   */
  const [failed, setFailed] = useState(false);
  const lastRun = useRef<(() => Promise<unknown>) | null>(null);
  const [moving, setMoving] = useState(false);
  const [warn, setWarn] = useState(false);
  /**
   * 영역 훑기에서 **지금 펴 둔 질문**. `null` 이면 아직 답하지 않은 첫
   * 질문이 선다(FINAL POLISH §1).
   *
   * **쪽 나누기도 저장도 건드리지 않는다**: 한 화면에 받는 문항은 그대로
   * 넷이고 고르면 그 자리에서 보낸다. 바뀌는 것은 넷 가운데 어느 줄이
   * 펴져 있는가뿐이고, 그 판단은 넓은 화면에서 쓰이지 않는다(아래
   * `assessment.css` 의 `@media` 가 넓은 화면에서는 넷을 다 펴 둔다).
   */
  const [openAt, setOpenAt] = useState<number | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /** 읽는 법 한 줄이 붙을 질문. **첫 사다리 하나뿐이다**: 화면마다 깔면
   *  같은 네 줄이 스물여덟 번 서고, 질문보다 센 설명문이 된다 */
  const guideAt = s.fields.findIndex((f) => f.control.kind === "level");

  /**
   * 보내는 것을 줄 세운다. 둘이 겹치면 늦게 끝난 쪽이 먼저 끝난 쪽을 덮는다.
   *
   * **`{ ok: false }` 도 실패다.** 서버 동작은 거절할 때 던지지 않고 거짓을
   * 돌려준다(다른 탭에서 이미 제출했거나 남의 응시일 때). 전에는 던진 것만
   * 실패로 세서, 거절된 저장에도 머리띠가 `저장됨` 을 적었다(Track C 3차).
   */
  const push = useCallback((run: () => Promise<unknown>) => {
    setSaving((n) => n + 1);
    const refused = (r: unknown) =>
      !!r && typeof r === "object" && (r as { ok?: unknown }).ok === false;
    queue.current = queue.current
      .then(run)
      .then((r) => {
        if (refused(r)) { lastRun.current = run; setFailed(true); return; }
        setFailed(false); setSent(true);
      },
        () => { lastRun.current = run; setFailed(true); })
      .finally(() => setSaving((n) => n - 1));
    return queue.current;
  }, []);

  /** 실패한 저장을 다시 보낸다. 같은 호출을 그대로 쓴다 */
  const retrySave = useCallback(() => {
    const run = lastRun.current;
    if (!run) { setFailed(false); return; }
    push(run);
  }, [push]);

  const setAnswer = (f: Field, raw: number | string, a: Answer) => {
    setVals((v) => ({ ...v, [f.itemId]: raw }));
    setWarn(false);
    push(() => answerAction(s.attemptId, f.itemId, a));
    /* **누르면 저장하고 넘어간다**(전 기관·전 학과 공통). 한 선택으로
       끝나는 화면은 그 자리에서, 질문이 여럿인 화면은 **마지막 빈 칸을
       채운 순간** 넘어간다. 켜진 것을 잠깐 보여 준 뒤에 옮긴다 */
    const done = s.fields.every((g) => g.itemId === f.itemId || !empty(g));
    if (s.nextIndex !== null && (s.auto && s.fields.length === 1 || autoAll && done)) {
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

  const empty = (f: Field): boolean =>
    vals[f.itemId] === null || vals[f.itemId] === undefined;
  /**
   * 질문이 여럿인 화면도 저절로 넘어가는가. 고르는 칸만 있는 화면이다.
   * **직접 적는 칸이 붙은 화면은 손으로 넘긴다**: 고르자마자 넘어가면
   * 그 칸에 한 줄을 적을 틈이 없다.
   */
  const autoAll = AUTO_KINDS.has(s.kind) && s.fields.length > 0
    && s.fields.every((f) => !(f.control.kind === "choice" && f.control.note));
  const filled = s.fields.every((f) => !empty(f));
  /**
   * **무엇이 비었는지를 질문 옆에 적는다**(규격 §4).
   *
   * 한 화면에 질문이 둘인 자리가 검사의 절반이다. 거기서 하나만 답하고
   * `다음` 을 누르면 띠에 한 줄이 떴는데, 그 줄은 **어느 질문이 비었는지
   * 말하지 않는다.** 답한 사람은 자기가 답했다고 알고 있으므로 그 줄을
   * 고장으로 읽는다. 그래서 비어 있는 질문을 그 자리에서 짚는다.
   *
   * **단추를 끄지 않는다**: 끄면 왜 못 넘어가는지가 화면에서 사라진다.
   */
  const missing = s.fields.filter(empty);

  /**
   * 영역 훑기에서 **지금 답할 질문이 어느 줄인가.**
   *
   * 고른 줄이 있으면 그 줄이고, 없으면 아직 답하지 않은 첫 줄이다. 넷을
   * 다 답했으면 `-1` 이라 넷이 모두 요약 한 줄로 서고 **고친 것을 다시
   * 훑어보는 자리**가 된다. 넓은 화면은 이 값을 쓰지 않는다.
   */
  const firstEmpty = s.fields.findIndex(empty);
  const focusAt = s.kind !== "sweep" ? -1
    : openAt !== null && openAt < s.fields.length ? openAt
    : firstEmpty;

  /**
   * 훑기에서 하나를 고른다. **저장은 `setAnswer` 하나가 그대로 한다.**
   *
   * 고른 뒤에 **아직 답하지 않은 다음 줄**로 옮긴다: 고른 줄은 그 자리에서
   * 고른 말을 단 요약 한 줄이 되고 다음 질문이 펴진다. 남은 줄이 없으면
   * 자동 판단으로 되돌려(`null`) 넷이 모두 요약으로 선다.
   */
  /**
   * 펴진 질문이 **엄지로 닿는 자리에 오게** 한다(FINAL POLISH §1).
   *
   * 접힌 줄이 위에 쌓이므로 넷째 질문이 펴지면 그 보기 다섯이 화면
   * 아래쪽에 선다. 고른 사람이 그때마다 손으로 쓸어 내리게 두면 접은
   * 보람이 없다. **창 안에 이미 들어와 있으면 움직이지 않는다**: 까닥하면
   * 고르는 자리가 매번 흔들린다. 넓은 화면은 접지 않으므로 지나간다.
   */
  const first = useRef(true);
  useEffect(() => {
    if (s.kind !== "sweep") return;
    if (first.current) { first.current = false; return; }
    if (window.innerWidth > 719) return;
    const el = document.querySelector<HTMLElement>(".qs-fold.is-now");
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight - 88) return;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
  }, [focusAt, s.kind]);

  const pickSweep = (f: Field, raw: number | string, a: Answer) => {
    setAnswer(f, raw, a);
    const i = s.fields.indexOf(f);
    const to = s.fields.findIndex((g, k) => k > i && empty(g));
    setOpenAt(to >= 0 ? to : null);
  };

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

  /**
   * 다음 화면으로 옮긴다.
   *
   * **거절당한 호출이 화면을 영원히 잠그지 않게 한다.** `moving` 은 다음
   * 화면이 뜰 때 `key` 로 다시 마운트되며 풀리는데, 커서를 적는 호출이
   * 거절되면 그 자리에서 던지고 `moving` 이 `true` 로 남는다. 그러면
   * `다음` 과 `이전` 이 둘 다 꺼진 화면이 서고, 백여 문항을 푼 사람이
   * 새로 고치는 것 말고는 할 수 있는 일이 없다. 실패한 호출은 들고
   * 있다가 다시 보내는 자리가 이미 있으므로(`retrySave`) 거기로 넘긴다.
   *
   * 끝의 시간 재기는 **옮겨 가지 못한 경우의 그물**이다. 옮겨 갔으면 이
   * 컴포넌트가 이미 사라졌으니 아무 일도 하지 않는다.
   */
  const go = async (to: number | null) => {
    if (to === null) return;
    setMoving(true);
    try {
      await queue.current;
      const r = await cursorAction(s.attemptId, to);
      if (!r.ok) { setMoving(false); setWarn(true); return; }
    } catch {
      lastRun.current = () => cursorAction(s.attemptId, to);
      setFailed(true);
      setMoving(false);
      return;
    }
    router.push(`/v3/${s.attemptId}?s=${to}`);
    window.setTimeout(() => setMoving(false), MOVE_TIMEOUT_MS);
  };

  const next = async () => {
    if (blocked) {
      setWarn(true);
      /* **접힌 줄에 `아직 답하지 않았습니다` 를 적어도 보이지 않는다.**
         좁은 화면에서는 넷 가운데 하나만 펴져 있으므로, 비어 있는 첫
         질문을 그 자리에서 펴 준다 */
      if (s.kind === "sweep" && missing.length) {
        setOpenAt(s.fields.indexOf(missing[0]));
      }
      return;
    }
    await go(s.nextIndex);
  };

  const finish = async () => {
    setMoving(true);
    let r: { ok: boolean };
    try {
      await queue.current;
      r = await finishAction(s.attemptId);
    } catch {
      /* 제출이 거절되면 다시 누를 수 있어야 한다 */
      lastRun.current = () => finishAction(s.attemptId);
      setFailed(true);
      setMoving(false);
      return;
    }
    /* **결과지로 바로 보내지 않는다.** 백여 문항을 푼 사람이 `다음` 을
       누른 자리에서 곧바로 긴 결과지를 만나면 끝났다는 말을 어디에서도
       듣지 못한다. 완료 브리지가 그 한 쪽이다 */
    if (r.ok) { router.push(`/v3/${s.attemptId}/done`); return; }
    router.refresh();
    setMoving(false);
  };

  const mid = s.kind === "transition" || s.kind === "done" || s.kind === "scene";
  /* **한 판에 올리는 것은 쉬는 자리뿐이다.** 산업 장면은 그 아래에 카드
     둘이 서므로 머리글까지 판에 올리면 흰 상자가 셋이 된다 */
  const brief = s.kind === "transition" || s.kind === "done";
  /* **폭 토큰은 셋뿐이다**(규격 §29): 읽는 자리 760 · 견주는 자리 920 ·
     근거를 훑는 자리 1040. 질문과 전환은 760 에서 시작하므로 글이 시작하는
     자리가 같고, 넓어지는 것은 한눈에 견주어야 하는 자리뿐이다 */
  const width = s.kind === "checklist" ? " is-evidence"
    : (s.kind === "sweep" || !!s.pickKind) ? " is-explore"
    : (s.kind === "transition" || s.kind === "done") ? " is-calm" : "";

  return (
    <div className={`qs${width}`}>
      {/* **머리띠는 한 줄과 막대 하나다**(규격 §13).
          브랜드 · 지나온 단계와 지금 · 등급과 몇째인가가 한 줄에 서고 그
          아래에 2px 막대가 눕는다. 한동안 세 줄이었다: 브랜드와 등급 ·
          단계와 번호 · 막대. 질문 위에 띠가 세 겹 눕고 질문이 화면의
          절반 아래로 밀렸다. **탭 밑줄과 진행 막대를 같이 두지 않는다**:
          가로선이 둘이면 어느 것이 진행인지 읽히지 않는다 */}
      <header className="qs-head">
        <div className="qs-head-in">
          <div className="qs-top">
            <span className="qs-brand"><BrandMark size={20} />CareerMatri</span>
            {/* **어느 학과 기준으로 묻는지가 끊기지 않는다**(규격 §6).
                학교에서 받은 검사를 푸는 사람이 가장 먼저 확인하는 것이
                `내 학과 기준으로 묻고 있는가` 이고, 그 줄이 없으면 공통
                검사를 풀고 있는 것으로 읽힌다. 학교 진입이 아니면 전공
                이름이 그 자리를 든다 */}
            <span className="qs-where">
              {/* 학교와 학과 사이를 띄운다. 붙여 두면 `배재대학교경영학과`
                  로 한 낱말처럼 읽혔다(R35 인벤토리) */}
              {school ? <><b>{school}</b>{" "}</> : null}
              {department ?? major}
            </span>
            <span className="qs-crumb">
              {prog.prev ? <><span className="prev">{prog.prev}</span><i>›</i></> : null}
              <span className="now">{prog.now}</span>
              {prog.next ? <><i>›</i><span className="next">{prog.next}</span></> : null}
            </span>
            {/* **저장 상태는 머리띠에 둔다**(§14). 아래 단추 띠에 두면
                `답변은 자동으로 저장됩니다` 가 다음 걸음 바로 옆에서
                쪽마다 읽히고, 그 자리의 한 가지 행동이 흐려진다. 여기서는
                움직일 때만 글자가 바뀌고 평소에는 `저장됨` 한 마디다 */}
            {mid ? null : failed ? (
              <button type="button" className="qs-save is-bad" onClick={retrySave}>
                저장 실패 · 다시 시도
              </button>
            ) : (
              <small className="qs-save">
                {saving > 0 ? "저장 중…" : sent ? "저장됨" : "자동 저장"}
              </small>
            )}
            {/* **오른쪽은 산 등급과 몇째인가 한 묶음이다**(규격 §5).
                전에는 등급 자리에 별명(`경험 번역`)을 적었는데, 바로 왼쪽
                breadcrumb 의 단계 이름(`경험 심화`)과 생김새가 같아서 둘
                가운데 무엇이 진행인지 읽히지 않았다. 산 것의 이름은
                가격표와 결제와 같은 말(BASIC · STANDARD · PRO)이다 */}
            {/* **진행을 수로도 적는다**(규격 §6). 막대만으로는 얼마나
                남았는지 가늠이 안 되고, `1 / 1` 만 적혀 있으면 끝난 것으로
                읽힌다. 백분율이 먼저고 묶음 안의 몇째인가가 거든다 */}
            <span className="qs-tier">
              {tierLabel ? <em>{tierLabel}</em> : null}
              <span className="qs-step">{prog.inStage.index} / {prog.inStage.total}</span>
              <b>{prog.percent}%</b>
            </span>
          </div>
          <div className="qs-bar" role="progressbar" aria-valuenow={prog.percent}
            aria-valuemin={0} aria-valuemax={100}
            aria-label={`검사 진행 · ${prog.now}`}>
            <span style={{ width: `${prog.percent}%` }} />
          </div>
        </div>
      </header>

      <main className={`qs-main${mid ? " qs-mid" : ""}${brief ? " is-rest" : ""}`}>
        {/* **쉬는 자리는 한 판 위에 올린다.** 전환과 완료는 글이 네 줄이라
            넓은 바탕 위에 떠 있으면 덜 그린 화면으로 읽힌다. 테와 안쪽
            여백을 두르면 같은 글이 **의도한 한 걸음**으로 읽히고, 그 판의
            높이가 질문 화면의 절반을 넘지 않는다(규격 §5·§25) */}
        <div className={brief ? "qs-brief" : "qs-plain"}>
        {/* **묶음이 바뀐 것을 질문 위 한 줄로 적는다**(규격 §12).
            전에는 묶음마다 전환 화면을 한 장 세웠고, 그 가운데 셋은 담은
            것이 `이제 ~를 묻습니다` 와 영역 이름 목록뿐이었다. 영역 이름은
            **바로 다음 화면의 머리말에 다시 적혀 있어서**, 읽을 것이 없는
            화면에 `계속` 을 세 번 더 누르게 했다. 묶음의 첫 질문에만 선다 */}
        {/* **단계가 바뀐 자리를 한 줄로 잇는다**(GOLD MASTER §3).
            관심을 묻다가 경험을 묻는 자리에서 화면만 바뀌면 응시자는
            다른 검사가 시작된 줄 안다. 그 단계의 첫 화면에만 선다 */}
        {s.stageLead ? <p className="qs-stagelead">{s.stageLead}</p> : null}
        {s.strip ? <p className="qs-ctx">{s.strip}</p> : null}
        {s.eyebrow ? <p className="qs-eyebrow">{s.eyebrow}</p> : null}
        {s.subject ? <p className="qs-subject">{s.subject}</p> : null}
        {/* 완료 화면의 머리글은 제출 전과 뒤가 다르다. **다 푼 사람에게
            `준비가 됐습니다` 를 그대로 두면** 아직 할 일이 남은 줄 안다 */}
        {s.question ? (
          <h1 className="qs-q">
            {s.kind === "done" && s.done ? "내 CareerMatri가 만들어졌습니다" : s.question}
          </h1>
        ) : null}
        {/* 전환 화면은 **한 줄 설명과 칩 한 줄**이다.
            앞 판본은 영역 이름을 가운뎃점으로 이어 붙여 긴 설명문을
            만들었고, 그 뒤에는 번호를 붙인 칸 셋을 세웠다. 번호를 큼직하게
            세우면 안쪽에서 정해 둔 순서가 그대로 화면이 되고 응시자는
            그것을 할 일 목록으로 읽는다. 지금은 설명 한 줄과 **읽기만 하는
            칩**이고, 쉬는 자리가 질문 화면의 절반을 넘지 않는다 */}
        {s.help ? <p className="qs-help">{s.help}</p> : null}
        {/* **낱말의 뜻은 안내가 아니다.** 답하는 법을 적는 `qs-help` 와
            같은 모양으로 세워 두면 여덟 자 질문 아래 서른 자 회색 글이
            서서 그 줄이 질문보다 세게 읽힌다. `예` 줄과 같은 꼴로 받친다 */}
        {s.term ? <p className="qs-term"><span>뜻</span>{s.term}</p> : null}
        {s.chips?.length ? (
          <ul className="qs-next">
            {s.chips.map((x) => <li key={x}>{x}</li>)}
          </ul>
        ) : null}
        </div>

        {/* 산업 장면. 한 절을 먼저 읽고 그 산업이 요구하는 것을 줄로 본다.
            **점수를 만들지 않는다**: 묻기 전에 읽히는 자리다 */}
        {s.kind === "scene" && (s.sections?.length || s.body?.length) ? (
          <div className="qs-scene">
            {(s.sections ?? [{ name: "", lines: s.body ?? [] }]).map((g) => (
              <section key={g.name}>
                {g.name ? <h2>{g.name}</h2> : null}
                <ul>{g.lines.map((x) => <li key={x}>{x}</li>)}</ul>
              </section>
            ))}
          </div>
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
                          <span className="qs-label">{undergradLabel(major)[v]}</span>
                          <span className="qs-gloss">
                            {undergradGloss(major, majorExamples)[v]}
                          </span>
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
                <b>이 검사는 {major} 경험을 읽습니다.</b>
                <p>
                  학부와 대학원이 모두 {major} 계열이 아니면 지금 드릴 수
                  있는 결과가 없습니다. 끝까지 답하셔도 결과가 비어 있어
                  여기서 멈춥니다.
                </p>
                <p>
                  학부가 {major} 계열이면 위에서 다시 골라주세요. 전공별
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
        {/* ── 영역 훑기 ──
            **열두 줄을 한 화면에 쌓지 않는다**(COMMERCIAL GOLD MASTER §5).
            쌓으면 `문장 + 보기 + 모르겠다` 가 열두 번 되풀이되는 설문표가
            되고, 보기에 낱말이 설 자리가 없어 숫자만 남는다. 넷씩 끊어
            **질문 하나와 뜻이 적힌 보기**로 세운다: 실제 판단을 묻는
            화면과 같은 모양이라 검사 전체가 한 제품으로 읽힌다.
            끊는 자리는 `blocks.ts` 이고 묻는 문항과 저장되는 값은 그대로다 */}
        {/* **좁은 화면에서는 한 번에 한 질문만 펴 둔다**(FINAL POLISH §1).
            넷을 다 펴 두면 같은 보기 다섯이 네 번 세로로 쌓여, 문항 넷이
            아니라 **스무 줄짜리 설문지**로 읽힌다. 답한 줄은 고른 말을 단
            요약 한 줄로 접히고(그래서 **무엇을 골랐는지가 그 자리에
            남는다**) 아직 답하지 않은 줄은 한 단 흐린 한 줄로 기다린다.
            넓은 화면은 보기 다섯이 한 행에 서서 넷이 이미 짧으므로
            그대로 넷을 다 펴 둔다: 가르는 자리는 `assessment.css` 의
            `@media` 하나이고 **문항 수와 저장과 쪽 나누기는 그대로다** */}
        {s.kind === "sweep" ? (
          <div className="qs-rows qs-sweep">
            {s.fields.map((f, i) => (
              <div key={f.itemId}
                className={`qs-fold${i === focusAt ? " is-now"
                  : empty(f) ? " is-later" : " is-done"}`}>
                <Sum f={f} value={vals[f.itemId]} n={i + 1} of={s.fields.length}
                  miss={warn && empty(f)} onOpen={() => setOpenAt(i)} />
                <Row f={f} value={vals[f.itemId]}
                  n={i + 1} of={s.fields.length} miss={warn && empty(f)}
                  onPick={pickSweep}
                  notes={notes} onNote={setNote} onNoteDone={flushNote} />
              </div>
            ))}
          </div>
        ) : null}

        {/* ── 보기 하나를 고르는 화면 ── */}
        {s.kind !== "sweep" && s.fields.length === 1 ? (
          <One f={s.fields[0]} value={vals[s.fields[0].itemId]} guide={s.guide}
            onPick={setAnswer} notes={notes} onNote={setNote} onNoteDone={flushNote} />
        ) : null}

        {s.kind !== "sweep" && s.fields.length > 1 ? (
          <div className="qs-rows">
            {/* **한 화면에 질문이 둘이라는 것을 적는다**(규격 §6). 적지
                않으면 첫 질문의 뜻풀이를 펼친 사람에게 둘째 질문이
                화면 밖으로 밀리고, 그 사람은 한 문항만 답한 채 `다음` 을
                누른다. 묶어 세우는 것 자체는 그대로다: 하나씩 끊으면
                화면이 예순여섯에서 백을 넘는다 */}
            {s.fields.map((f, i) => (
              <Row key={f.itemId} f={f} value={vals[f.itemId]} onPick={setAnswer}
                n={i + 1} of={s.fields.length} miss={warn && empty(f)}
                guide={i === guideAt ? s.guide : undefined}
                notes={notes} onNote={setNote} onNoteDone={flushNote} />
            ))}
          </div>
        ) : null}

        {/* **어디에서 해 본 것이든 괜찮다는 한 줄**(묶음의 첫 질문에만).
            학부생이 `해본 적 없음` 을 고르는 까닭 가운데 하나가 그
            판단을 직장에서만 하는 일로 읽는 것이다 */}
        {s.scenes ? <p className="qs-anywhere">{s.scenes}</p> : null}

        {/* ── 근거 고르기 ──
            **접었다가 펼친다**(규격 §16). 여덟 묶음을 전부 펼쳐 두면 쪽이
            네 뼘이 되고, 그 상태가 운영자가 쓰는 입력 양식으로 읽혔다.
            그런데 접어 버리면 고르는 수가 줄고, **고른 항목이 소유 판정의
            근거라서 접는 쪽이 판정을 바꾼다.** 그래서 고른 것이 있는
            묶음은 펼쳐 두고 **0개인 묶음만 접는다**: 한 번도 안 본 묶음은
            제목이 눈에 들어오고, 손 댄 묶음은 그대로 남는다 */}
        {s.groups ? (
          <>
            <p className="qs-picked is-lead">
              <span>지금까지 확인된 경험</span>
              <span className="qs-grow" />
              <span>선택한 근거 <b>{Object.values(picks).reduce((n, v) => n + v.length, 0)}</b>개</span>
            </p>
            <div className="qs-groups">
            {s.groups.map((g) => {
              const on = picks[g.slot] ?? [];
              return (
                <details className="qs-group" key={g.slot} open={on.length > 0}>
                  <summary>
                    <span className="qs-group-name">{g.label}</span>
                    <em>{on.length ? `${on.length}개` : "선택 없음"}</em>
                  </summary>
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
                </details>
              );
            })}
            </div>
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
            {/* ── 제출 전 검토(규격 §6) ──
                **아직 비어 있는 자리를 적고 그리로 보낸다.** 전에는 다 풀지
                않고도 제출 단추가 그대로 섰고, 어디가 비었는지는 아무 화면도
                말하지 않았다. **제출을 막지는 않는다**: 묻지 않은 자리와
                답하지 않은 자리를 가르는 일은 채점이 이미 하고, 여기서 막으면
                답할 수 없는 문항 하나에 사람이 갇힌다 */}
            {!s.done && s.gaps?.length ? (
              <div className="qs-review">
                <h2>아직 답하지 않은 문항이 {s.gaps.length}개 있습니다</h2>
                <p>눌러서 그 문항으로 돌아가 고칠 수 있습니다. 비워 둔 채로
                  제출해도 됩니다 — 답하지 않은 문항은 결과에서 그 사실을
                  그대로 적습니다.</p>
                <ul>
                  {s.gaps.map((g) => (
                    <li key={g.index}>
                      <button type="button" onClick={() => go(g.index)}
                        disabled={moving}>{g.label}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!s.done && s.gaps && !s.gaps.length ? (
              <p className="qs-review-ok" role="status">
                답해야 하는 문항을 모두 채우셨습니다.
              </p>
            ) : null}
            <p className="qs-help" style={{ marginTop: 24 }}>
              {s.done
                ? "검사는 시작일 뿐입니다. 경험이 늘면 근거와 부족한 부분을 다시 계산합니다."
                : "지금까지 답하신 것으로 결과를 정리합니다. 만든 뒤에도 이전으로 돌아가 고칠 수 있습니다."}
            </p>
            {/* **PDF 하나로 끝내지 않는다.** 결과를 받은 사람이 다음에 갈
                자리가 여섯이다. 하나만 두면 그 하나를 누른 날 끝난다 */}
            {s.done ? (
              <ul className="qs-done-next">
                {[
                  [`/v3/${s.attemptId}/result`, "결과 보기", "기술영역과 산업과 직무를 이어 읽습니다"],
                  ["/me", "내 CareerMatri", "지금 방향과 근거와 부족한 부분을 한 쪽에 둡니다"],
                  [`/v3/${s.attemptId}/result#evidence`, "내가 가진 근거", "확인된 판단과 고른 근거"],
                  ["/me/state#gaps", "아직 부족한 것", "무엇이 모자라고 무엇을 하면 메워지는지"],
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
        {/* **답안 현황**(화면 시안 2026-10-20). 지금 묶음의 칸을 번호로
            늘어놓고 지난 칸은 채우고 지금 칸은 테를 두른다. 묶음 안에서만
            세는 까닭은 `progress.ts` 와 같다: 전체 분모는 routing 으로
            늘어날 수 있어서 거꾸로 가는 것처럼 읽힌다 */}
        {!mid && prog.inStage.total > 1 ? (
          <aside className="qs-omr" aria-label="이번 문항 그룹 답안 현황">
            <p className="qs-omr-h">답안 현황</p>
            <p className="qs-omr-sum">
              <b>{prog.now}</b> {prog.inStage.index} / {prog.inStage.total}
            </p>
            <ol className="qs-omr-grid">
              {Array.from({ length: prog.inStage.total }, (_, i) => (
                <li key={i}
                  className={i + 1 < prog.inStage.index ? "is-done"
                    : i + 1 === prog.inStage.index ? "is-now" : undefined}
                  aria-current={i + 1 === prog.inStage.index ? "step" : undefined}>
                  {i + 1}
                </li>
              ))}
            </ol>
            <p className="qs-omr-note">답은 고를 때마다 저장됩니다. 창을 닫아도 이어서 풀 수 있습니다.</p>
          </aside>
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
            ? (
              <span className="qs-need" role="status">
                {s.fields.length > 1 && missing.length
                  ? `아직 답하지 않은 질문이 ${missing.length}개 있습니다`
                  : "답을 고른 뒤 다음으로 넘어가세요"}
              </span>
            )
            : null}
          {s.kind === "done" ? (
            s.done ? (
              <a className="qs-btn qs-btn-main" href={`/v3/${s.attemptId}/result`}>결과 보기</a>
            ) : (
              /* **가짜 퍼센트를 적지 않는다**(규격 §9). 몇 초가 걸릴지
                 모르는 일에 73% 를 적으면 그 수가 근거처럼 읽힌다. 지금
                 무슨 일이 도는지 한 마디만 적는다 */
              <button type="button" className="qs-btn qs-btn-main"
                onClick={finish} disabled={moving}>
                {moving ? "결과를 정리하고 있습니다" : "결과 만들기"}
              </button>
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
  f, value, onPick, notes, onNote, onNoteDone, guide,
}: {
  f: Field; value: number | string | null;
  /** 보기 둘째와 넷째를 가르는 한 줄. 이 응시에서 **처음 만나는 사다리
   *  문항에만** 선다(`ScreenModel.guide`) */
  guide?: string;
  onPick: (f: Field, raw: number | string, a: Answer) => void;
  notes: Record<string, string>;
  onNote: (f: Field, t: string) => void;
  onNoteDone: (f: Field) => void;
}) {
  const c = f.control;
  if (c.kind === "steps") {
    return <Steps f={f} value={value} onPick={onPick} />;
  }
  if (c.kind === "level") {
    /* **화면에 세우는 말은 줄인 쪽이다.** 은행 문면은 둘째와 넷째가
       끝까지 읽어야 갈리는데 응시자는 이 보기를 백 번 가까이 본다.
       긴 뜻풀이는 아래 `보기가 어떻게 갈리나요` 안에 있고, 은행과
       채점은 한 글자도 바뀌지 않는다 */
    const labels = f.optionLabel ?? c.options;
    return (
      <fieldset className="qs-opts">
        <legend>{f.label ?? "보기"}</legend>
        {/* **넓은 화면에서는 보기 넷이 한 행에 선다**(규격 §4).
            세로로 쌓으면 상자 하나가 85px 이라 한 문항이 340px 을 먹고,
            한 화면에 문항이 둘인 자리에서는 같은 네 줄이 여덟 번 읽힌다.
            넷은 서로 견주어 고르는 보기라 **나란히 놓는 쪽이 고르기 쉽다.**
            좁은 화면에서는 한 줄짜리 네 칸으로 다시 쌓인다 */}
        <div className="qs-list qs-own">
          {labels.map((label, i) => (
            <label key={i} className={`qs-opt${value === i ? " is-on" : ""}`}>
              <input type="radio" name={f.itemId} checked={value === i}
                onChange={() => onPick(f, i, { kind: "level", index: i })} />
              <span className="qs-mark" aria-hidden />
              {/* **눈금을 두지 않는다.** 한 칸씩 올라가는 막대를 보기 옆에
                  두니 `1점 · 2점 · 3점 · 4점` 으로 읽혔다. 이 넷은 누가
                  정했는가의 단계이고 점수가 아니다 */}
              {/* **긴 뜻풀이를 질문마다 되풀이하지 않는다**(GOLD MASTER §6).
                  한 화면에 질문이 둘이면 같은 네 줄이 여덟 번 서고, 응시자는
                  이 보기를 백 번 가까이 본다. 처음 만나는 사다리 화면에서만
                  보기 옆에 세우고 그 뒤에는 **짧은 꼬리표만** 남긴다.
                  자세한 뜻은 아래 `보기가 어떻게 갈리나요` 가 늘 들고 있고,
                  줄인 말과 긴 말이 같은 자리(`해본 적 없음`)에서는 긴 쪽을
                  적지 않는다 */}
              <span className="qs-body">
                <span className="qs-label">{label}</span>
                {f.optionFoldOpen && f.optionHelp?.[i] && f.optionHelp[i] !== label
                  ? <span className="qs-gloss">{f.optionHelp[i]}</span> : null}
              </span>
            </label>
          ))}
        </div>
        {/* **뜻풀이를 보기마다 깔지 않는다.** 처음 만나는 화면에서 한 번
            펼치고 그 뒤에는 접어 둔다. 개념은 그대로이고 매번 다시 읽지
            않게 하는 자리다 */}
        {f.optionHelpFold ? (
          <details className="qs-optfold" open={f.optionFoldOpen}>
            <summary>보기가 어떻게 갈리나요</summary>
            {/* **읽는 법을 한 자리에 모은다.** 전에는 같은 내용이 보기
                아래 줄글로 한 번 더 섰다. 접힌 `보기가 어떻게 갈리나요`
                와 같은 말을 하는 자리라, 한 화면에 설명이 두 번 서고
                그 줄글이 질문보다 긴 덩이가 됐다. 접는 자리 안으로
                넣으면 둘이 한 자리가 된다(규격: 긴 안내는 접거나 제거) */}
            {guide ? <p className="qs-optlead">{guide}</p> : null}
            <ul>
              {c.options.map((label, i) => (
                <li key={i}><b>{labels[i] ?? label}</b>{f.optionHelpFold?.[i]}</li>
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

/* ── 다섯 칸(관심·배울 뜻)과 셋(해 본 적) 척도 ──────────────────── */

/**
 * 척도 문항 하나. **보기에 낱말을 적는다**(COMMERCIAL GOLD MASTER §5).
 *
 * 전에는 열두 줄을 한 화면에 쌓느라 보기 자리가 칸 다섯으로 좁았고,
 * 그 칸에 들어갈 수 있는 것이 번호뿐이었다. 그래서 화면이 `문장 +
 * 1 2 3 4 5 + 모르겠다` 가 열두 번 되풀이되는 **설문표**로 읽혔다. 넷씩
 * 끊고 나니 보기마다 **그 단계의 말**이 설 자리가 생긴다: 숫자를 세지
 * 않아도 무엇을 고르는지가 그 자리에서 읽힌다.
 *
 * **문항 은행과 저장되는 값은 한 글자도 바뀌지 않는다.** 여기 적히는
 * 말은 은행의 보기 문면(`options`)이고 자리는 `option_values` 가 정한다.
 *
 * **`잘 모르겠다` 를 보기 다섯 옆에 나란히 두지 않는다.** 저것은 척도
 * 밖이고 값이 비어 있다는 뜻이라, 같은 줄에 세우면 여섯째 단계로 읽힌다.
 */
function Steps({
  f, value, onPick,
}: {
  f: Field; value: number | string | null;
  onPick: (f: Field, raw: number | string, a: Answer) => void;
}) {
  const c = f.control;
  if (c.kind !== "steps") return null;
  const steps = c.options.filter((o) => o.value !== null);
  const esc = c.options.find((o) => o.value === null);
  const pick = (o: { value: number | null }) => () => onPick(
    f, o.value === null ? UNKNOWN : o.value,
    o.value === null ? { kind: "choice", value: UNKNOWN }
      : c.answer === "exposure"
      ? { kind: "exposure", value: o.value }
      : { kind: "scale5", value: o.value });
  return (
    <fieldset className="qs-opts">
      <legend>{f.label ?? "보기"}</legend>
      {/* 보기 다섯(해 본 적은 셋)이 한 행에 선다. 서로 견주어 고르는
          말이라 나란히 놓으면 눈이 한 번에 훑는다. 좁은 화면에서는
          아래 `@media` 가 한 줄짜리 칸으로 다시 쌓는다 */}
      <div className={`qs-list qs-own qs-scale-${steps.length}`}>
        {steps.map((o) => (
          <label key={o.label}
            className={`qs-opt${value === o.value ? " is-on" : ""}`}>
            <input type="radio" name={f.itemId} checked={value === o.value}
              aria-label={`${f.label ?? ""} · ${o.full}`} onChange={pick(o)} />
            <span className="qs-mark" aria-hidden />
            {/* R34 §6: 한 화면에 질문이 넷이면 같은 다섯 낱말이 스무 번 선다.
                번호를 같이 적고, 첫 질문 뒤의 줄에서는 CSS 가 낱말을 접어
                번호와 고른 칸의 낱말만 남긴다(넓은 화면). **보기 문면과
                저장되는 값은 그대로다**: 첫 줄이 그 화면의 범례가 되고,
                보조 기기는 `aria-label` 로 밝혀 적는 말을 그대로 받는다 */}
            <span className="qs-body">
              {c.answer === "exposure" ? null : <i className="qs-sn" aria-hidden>{o.value}</i>}
              <span className="qs-label">{o.short}</span>
            </span>
          </label>
        ))}
      </div>
      {esc ? (
        <label className={`qs-escape${value === UNKNOWN ? " is-on" : ""}`}>
          <input type="radio" name={f.itemId} checked={value === UNKNOWN}
            aria-label={`${f.label ?? ""} · ${esc.label}`} onChange={pick(esc)} />
          {esc.short}
        </label>
      ) : null}
    </fieldset>
  );
}

/**
 * 고른 답을 그 보기의 **말로** 돌려준다. 값이 없으면 `null`.
 *
 * **문항 은행이 유일한 출처다**: 여기서 낱말을 새로 적지 않고 그 보기의
 * 밝혀 적는 말(`full`)을 그대로 쓴다. 번호가 앞에 붙어 있어 `2` 와 `4`
 * 사이가 몇 칸인지도 같이 읽힌다.
 */
function pickedLabel(f: Field, value: number | string | null): string | null {
  if (value === null || value === undefined) return null;
  const c = f.control;
  if (c.kind === "steps") {
    const o = c.options.find((x) =>
      (x.value === null ? UNKNOWN : x.value) === value);
    return o ? o.full : null;
  }
  if (c.kind === "scale5") return c.labels[Number(value) - 1] ?? null;
  if (c.kind === "exposure") return c.options[Number(value)] ?? null;
  if (c.kind === "level") return (f.optionLabel ?? c.options)[Number(value)] ?? null;
  if (c.kind === "choice") return c.options.find((o) => o.value === value)?.label ?? null;
  return null;
}

/**
 * 접힌 질문 한 줄(FINAL POLISH §1).
 *
 * **고른 말을 그 자리에 남긴다.** 접었다고 질문만 적으면 응시자는 자기가
 * 무엇을 골랐는지 확인하러 다시 펴야 하고, 그러면 접은 것이 일을 하나 더
 * 만든 셈이 된다. 답한 줄은 `질문 — 고른 말`, 아직인 줄은 한 단 흐린
 * 질문 한 줄이다.
 *
 * **단추로 둔다.** 눌러서 펴지는 자리라 키보드로 닿아야 하고, 접힌
 * 상태라는 것을 보조 기기에도 적어야 한다(`aria-expanded`).
 */
function Sum({
  f, value, n, of, miss, onOpen,
}: {
  f: Field; value: number | string | null;
  n: number; of: number; miss?: boolean;
  onOpen: () => void;
}) {
  const label = pickedLabel(f, value);
  return (
    <button type="button" onClick={onOpen} aria-expanded={false}
      className={`qs-sum${label ? " is-done" : ""}${miss ? " is-miss" : ""}`}>
      <span className="qs-sum-n" aria-hidden>{n} / {of}</span>
      <span className="qs-sum-q">{f.label}</span>
      <span className="qs-sum-a">
        {label ?? (miss ? "아직 답하지 않았습니다" : "답할 차례")}
      </span>
    </button>
  );
}

function Row({
  f, value, onPick, n, of, miss, notes, onNote, onNoteDone, guide,
}: {
  f: Field; value: number | string | null;
  /** 이 화면에서 읽는 법 한 줄을 받는 질문인가 (첫 사다리 하나뿐) */
  guide?: string;
  /** 이 화면의 몇째 질문인가. 둘 이상일 때만 적는다 */
  n?: number; of?: number;
  /** 아직 답하지 않은 자리인가. `다음` 을 누른 뒤에만 켜진다 */
  miss?: boolean;
  onPick: (f: Field, raw: number | string, a: Answer) => void;
  notes: Record<string, string>;
  onNote: (f: Field, t: string) => void;
  onNoteDone: (f: Field) => void;
}) {
  const c = f.control;
  if (c.kind === "scale5" || c.kind === "exposure") {
    const labels = c.kind === "scale5" ? c.labels : c.options;
    /* 1 에서 5 · 없음에서 3회 이상. **값의 뜻을 양 끝에만 적지 않는다**:
       가운데 칸이 무엇인지 모르면 사람들은 가운데를 누른다 */
    return (
      <fieldset className={`qs-row qs-opts${miss ? " is-miss" : ""}`}>
        <legend>{f.label ?? "척도"}</legend>
        {f.label ? <span aria-hidden>{f.label}</span> : null}
        {miss ? <span className="qs-miss">아직 답하지 않았습니다</span> : null}
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
  if (c.kind === "level" || c.kind === "choice" || c.kind === "steps") {
    /* **각 상자의 질문을 눈에 보이게 세운다.** `One` 의 `legend` 는 보조
       기기용으로 숨겨져 있어서, 이 줄이 없으면 보기 넷만 둘 나란히 서고
       무엇에 답하는지가 화면에 없다. 보조 기기는 `legend` 로 같은 말을
       한 번 받으므로 여기서는 `aria-hidden` 으로 되풀이를 막는다 */
    return (
      <div className={`qs-row${miss ? " is-miss" : ""}`} data-n={n ?? 1}>
        {f.label ? (
          <span aria-hidden>
            {of && of > 1 ? <i className="qs-n">{n} / {of}</i> : null}
            {f.label}
          </span>
        ) : null}
        {miss ? <span className="qs-miss">아직 답하지 않았습니다</span> : null}
        {/* **질문 → 예시 → 선택**(규격). 지어낸 문장이 아니라 그 영역의
            체크리스트나 그 산업팩의 쉬운 말 풀이에서 온 한 줄이다.
            `aria-hidden` 을 두지 않는다: 보조 기기로 읽는 사람에게도
            이 줄이 질문을 자기 경험에 대 보게 하는 자리다 */}
        {f.example ? <p className="qs-ex"><span>예</span>{f.example}</p> : null}
        <One f={f} value={value} onPick={onPick} guide={guide}
          notes={notes} onNote={onNote} onNoteDone={onNoteDone} />
      </div>
    );
  }
  return null;
}
