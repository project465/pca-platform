import Link from "next/link";
import { currentUser, requireUser } from "@/lib/session";
import { majorNameOf } from "@/lib/me-v3/major-name";
import { currentState, latestResult, type ActionRow, activeCoreOrPick } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { domainName, majorNameIn } from "@/lib/me-v3/runtime/session";
import { domainArtifacts } from "@/lib/me-v3/runtime/domain-facts";
import { textFor } from "@/lib/me-v3/result/text";
import { localizeResult } from "@/lib/me-v3/result/localize";
import { coreOf } from "@/lib/me-v3/result/model";
import { wsLang } from "@/lib/me-v3/ws-lang";
import { wsSay, type WsSay } from "@/lib/me-v3/ws-say";
import { mark } from "@/lib/me-v3/workspace-events";
import { CmShell, CmHead } from "../shell";
import {
  EmptyState, PickCard, PickGrid, SectionHeader, StatHero,
} from "../ui";
import { moveAction, pullActions } from "./actions";

export async function generateMetadata() {
  const u = await currentUser().catch(() => null);
  const t = wsSay(u ? await wsLang(u.id) : "ko");
  return { title: `${t("지금 할 일")} · CareerMatri` };
}

/**
 * 다음 할 일.
 *
 * **긴 조언 문서가 아니라 할 수 있는 일 하나다**(규격 §9). 줄마다 넷이
 * 붙는다: 무엇을 할지 · 왜 필요한지 · 어느 빈자리와 이어지는지 · 어떤
 * 경험으로 메우는지. 앞엣것만 적으면 읽는 사람이 **그래서 이걸 왜
 * 하는가**에 스스로 답해야 하고, 그러면 안 한다.
 *
 * **첫 화면에서는 하나만 든다**(규격 §10). 나머지는 `다음에 할 수 있는
 * 것` 과 `나중에` 로 접어 둔다. 여섯 줄을 같은 무게로 세우면 읽는 사람이
 * 고르는 일부터 해야 하고, 고르는 일은 할 일이 아니다.
 *
 * **세 층을 그대로 둔다.** `30일 안` 은 읽는 사람에게 마감으로 읽히는데
 * 이 값은 마감이 아니라 **할 수 있는 때**다.
 */
const lanesOf = (t: WsSay) => [
  ["NEXT", t("다음에 할 수 있는 것"), t("맡는 일이 생겨야 합니다")],
  ["LATER", t("나중에"), t("앞의 둘이 끝난 뒤입니다")],
] as const;

const lane = (days: number): "NOW" | "NEXT" | "LATER" =>
  (days <= 30 ? "NOW" : days <= 90 ? "NEXT" : "LATER");

/**
 * 비어 있는 자리가 없는 할 일의 **왜 필요한가**(규격 §9).
 *
 * 빈자리에서 나온 할 일은 그 자리가 까닭을 들고 있다. 그런데 **근거가
 * 다 선 사람에게는 빈자리가 없고**, 그때 할 일은 `정리` 다. 까닭을
 * 빈자리에서만 찾으면 그 사람의 화면에서 `왜 필요한가` 가 영원히 서지
 * 않고, 할 일 하나만 덩그러니 남는다.
 *
 * **지어내지 않는다.** 여기 적는 것은 그 할 일을 고른 규칙이 이미 말한
 * 것이고, 코드에 없는 종류는 비워 둔다.
 */
const whyByCode = (t: WsSay): Record<string, string> => ({
  WRITE_UP: t("근거는 모였고, 남은 일은 그것을 지원서에서 설명할 문장으로"
    + " 만드는 것입니다."),
  DEEPEN_OWNERSHIP: t("해 본 것은 확인됐습니다. 남은 일은 그중 어디까지"
    + " 직접 정했는지를 적는 것입니다."),
  BUILD_OUTPUT: t("남긴 것이 없으면 해 봤다는 말을 지원서에서 설명할 수"
    + " 없습니다."),
  ADD_VERIFICATION: t("무엇과 비교해 확인했는지가 없으면 그 값이 맞다는"
    + " 말을 할 수 없습니다."),
  FILL_AXIS: t("그 영역에서 아직 확인되지 않은 판단이라, 채우면 설명할 수 있는"
    + " 범위가 넓어집니다."),
  TRY_SHORT_EXPERIENCE: t("관심은 있고 해 본 적이 없는 영역입니다. 짧게 한 번"
    + " 해 보면 판단할 재료가 생깁니다."),
  STUDY_NEXT: t("관심과 배울 뜻이 함께 높은 영역입니다."),
  RECHECK_DIRECTION: t("지금 응답만으로는 어느 영역이 앞선다고 보기"
    + " 어렵습니다."),
  EXPLORE_BROADLY: t("지금 응답만으로는 어느 영역이 앞선다고 보기"
    + " 어렵습니다."),
});

export default async function Next(
  { searchParams }: { searchParams: Promise<{ taken?: string }> },
) {
  const user = await requireUser();
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  const lang = await wsLang(user.id);
  const t = wsSay(lang);
  const TX = textFor(lang);
  const dn = (td: string) => domainName(core, td, lang);
  const LANES = lanesOf(t);
  /* 문장 가운데에 넣는 이름. 영어는 첫 글자를 작게 하되 약어는 그대로 둔다
     (`FEA report`). 한국어는 그대로다 */
  const inLine = (s: string): string => {
    if (lang !== "en" || !s) return s;
    const w = s.trim().split(/\s+/)[0] ?? "";
    if (w === "I" || /^[A-Z0-9]{2,}/.test(w) || /^[A-Z][a-z]*[A-Z]/.test(w)) return s;
    return s[0].toLowerCase() + s.slice(1);
  };
  const WHY_BY_CODE = whyByCode(t);
  /* 전공 이름. 영어면 그 언어의 이름이다(모르는 코드면 비운다) */
  const majorOf = (c: string | null | undefined): string | null => {
    const ko = majorNameOf(c);
    if (lang !== "en" || !ko || !c) return ko;
    try { return majorNameIn(c, "en"); } catch { return null; }
  };
  /* 결과지에서 담고 온 사람인가(규격 §16). **`0` 은 고장이 아니다**:
     담는 함수가 영역과 문장으로 보아 두 번 눌러도 늘지 않으므로, 이미
     담아 둔 사람이 다시 누르면 0 이 맞는 답이다. 그 사실을 적지 않으면
     누른 사람이 담기지 않은 줄 안다 */
  const taken = Number((await searchParams).taken);
  const came = Number.isFinite(taken) && taken >= 0;
  const [st, act, model0] = await Promise.all([
    currentState(user.id), openActions(user.id), latestResult(user.id),
  ]);
  /* 굳은 결과의 원고 글자(결과물 이름 · 견줄 대상)를 그 언어로 읽는다.
     판정 칸은 글자가 아니라 그대로 간다 */
  const model = model0 ? localizeResult(model0, coreOf(model0), lang) : null;
  const major = majorOf(st.core);
  /* **담아 둔 줄이 없으면 굳은 결과가 낸 할 일을 그대로 세운다**
     (`open-actions.ts`). 전에는 이 쪽만 표를 읽어서, PRO 를 끝내고
     들어온 사람이 홈에서 `지금 할 일` 을 누르면 **아직 담아 둔 할 일이
     없습니다** 를 받았다. 단추가 약속한 자리가 비어 있으면 그것은
     막다른 길보다 나쁘다 */
  const actions = act.rows;
  await mark("action_opened", user.id, { n: actions.length });

  const open = actions.filter((a) => a.state !== "done");
  const done = actions.filter((a) => a.state === "done");
  /* 지금 바로 할 수 있는 것 가운데 첫 줄. 없으면 열린 것 가운데 첫 줄.
     **빈 자리를 세우지 않는다**: 강조할 것이 없으면 그 칸을 안 그린다 */
  const first = open.find((a) => lane(a.horizon) === "NOW") ?? open[0] ?? null;
  const rest = open.filter((a) => a.id !== first?.id);

  /**
   * 그 할 일이 어느 빈자리에서 왔는가.
   *
   * **짐작하지 않는다.** 찾는 차례가 곧 근거의 세기다: 영역과 축이 둘 다
   * 맞는 자리 → 굳은 결과가 그 할 일에 적어 둔 빈자리 번호 → 같은 영역의
   * 첫 빈자리. 못 찾으면 그 줄을 적지 않는다: 지어낸 까닭은 그 자리에서
   * 가장 그럴듯하게 읽히고 가장 먼저 거짓이 된다.
   *
   * **축으로만 찾으면 늘 빈다.** 정리하는 할 일(`지원서에서 설명할 문장
   * 만들기`)은 축이 없어서 `axis_code` 가 비는데, 빈자리는 축을 들고
   * 있다. 그 둘을 글자로 견주면 **한 번도 맞지 않고**, 그러면 `왜
   * 필요한가` 가 영원히 서지 않는다.
   */
  /** 그 줄이 굳은 결과의 어느 할 일에서 왔는가 */
  /* 학생이 공고 화면에서 고른 줄(`manual`)은 담긴 문장 그대로 적는다 */
  const modelOf = (a: ActionRow) => a.source !== "result" ? null : (model?.actions ?? []).find((x) =>
    (x.domain ?? "") === (a.td_code ?? "") && (x.axis ?? "") === (a.axis_code ?? "")) ?? null;

  /**
   * 화면에 서는 말(규격 §9).
   *
   * **짧은 지시가 머리글이고 차례는 펼침 안이다.** 담아 둔 줄의 `body` 는
   * 담을 때의 문장이라 옛 판본에서는 화살표 넷짜리 체인이 들어 있다.
   * 굳은 결과에서 같은 할 일을 찾으면 지금 판본의 짧은 지시로 적고,
   * 못 찾으면 담아 둔 문장을 그대로 쓴다. **지어내지 않는다.**
   */
  const sayOf = (a: ActionRow): { head: string; guide: string[] } => {
    const x = modelOf(a);
    const k = x && model
      ? TX.actionKo(x, x.domain ? dn(x.domain) : "", model.stage) : null;
    return {
      head: k?.do ?? a.body,
      guide: [k?.guide, k?.note].filter((v): v is string => !!v),
    };
  };

  const gapOf = (a: ActionRow) => {
    const exact = st.gaps.find((g) =>
      g.domain === a.td_code && (g.axis ?? "") === (a.axis_code ?? ""));
    if (exact) return exact;
    const m = (model?.actions ?? []).find((x) =>
      (x.domain ?? "") === (a.td_code ?? "") && (x.axis ?? "") === (a.axis_code ?? ""));
    const byId = m?.from_gap ? st.gaps.find((g) => g.id === m.from_gap) : null;
    if (byId) return byId;
    return st.gaps.find((g) => g.domain === a.td_code) ?? null;
  };

  /**
   * 어떤 경험으로 메우는가.
   *
   * **두 자리에서 찾는다.** 먼저 굳은 결과가 그 할 일에 들고 있는 재료
   * (그 영역의 산출물과 견줄 대상)를 보고, 없으면 영역 사전의 산출물
   * 목록을 본다. 앞쪽만 보면 결과 밖에서 담긴 줄에서 그 칸이 비고,
   * 뒤쪽만 보면 영역이 없는 할 일에서 빈다. **지어내지 않는다**: 둘 다
   * 비면 그 줄을 적지 않는다.
   */
  const howOf = (a: ActionRow): string[] => {
    const m = (model?.actions ?? []).find((x) =>
      (x.domain ?? "") === (a.td_code ?? "") && (x.axis ?? "") === (a.axis_code ?? ""));
    const from = [
      ...(m?.material.artifacts ?? []),
      ...(m?.material.verify_targets ?? []),
      ...(a.td_code ? domainArtifacts(core, a.td_code, lang) : []),
    ];
    return [...new Set(from)].slice(0, 2);
  };

  return (
    <CmShell active="/me/next" title={t("지금 할 일")} read lang={lang}
      major={major}
      bar={st.model
        ? <Link className="cm-btn" href="/me/experience/new">{t("+ 경험 추가")}</Link>
        : null}>
      <CmHead
        title={first ? t("지금 할 한 가지") : t("무엇부터 할지")}
        lead={st.model
          ? t("급한 순서보다 할 수 있는 때로 묶었습니다. 하나를 끝내면 그다음이 나옵니다.")
          : t("검사를 한 번 끝내면 결과가 낸 할 일을 여기에 담을 수 있습니다.")}
        actions={st.model ? (
          /* **짙은 단추는 쪽에 하나다**(규격 §10). 담을 것이 이미 담겨
             있으면 그 단추를 세우지 않는다: 눌러도 아무 일이 없다 */
          act.fromResult && actions.length === 0 ? (
            <form action={pullActions}>
              <button className="cm-btn is-primary" type="submit">
                {t("결과의 할 일 담기")}
              </button>
            </form>
          ) : (
            <Link className="cm-btn" href="/me/state#gaps">{t("현재 상태 보기")}</Link>
          )
        ) : (
          <Link className="cm-btn is-primary" href="/cores">
            {major ? t("{major} 검사 시작", { major }) : t("검사 시작")}
          </Link>
        )}
      />

      {came ? (
        <p className="cm-done" role="status">
          {taken > 0
            ? (taken === 1
              ? t("결과에서 할 일 {n}가지를 담았습니다. 아래 첫 줄부터 하시면 됩니다.#one", { n: taken })
              : t("결과에서 할 일 {n}가지를 담았습니다. 아래 첫 줄부터 하시면 됩니다.", { n: taken }))
            : t("결과의 할 일은 이미 담겨 있습니다 · 같은 일이 두 번 쌓이지 않습니다.")}
        </p>
      ) : null}

      {!st.model ? (
        <EmptyState>
          <b>{t("아직 완료한 검사가 없습니다.")}</b> {t("할 일은 검사 결과의 비어 있는 부분에서 나옵니다.")}
          <p style={{ marginTop: 10 }}>
            <Link href="/cores">{t("검사 시작하기")}</Link>
          </p>
        </EmptyState>
      ) : actions.length === 0 ? (
      <>
      {/* **빈 상태에서도 제품 구조가 느껴져야 한다**(규격 §13). 꺼진 칸
          하나에 한 줄만 적으면 쪽이 덜 만들어진 것으로 읽힌다. Hero 하나와
          **실제 route 가 있는** 칸 넷을 세운다 */}
      <StatHero icon="check" label={t("지금 할 일")} value={t("없음")}
        note={t("할 일을 모두 치우셨습니다. 새 경험을 더하면 다음 할 일이 생길 수 있습니다.")}
        action={<Link className="cm-btn is-primary" href="/me/experience/new">{t("경험 추가")}</Link>} />
      <SectionHeader icon="compass" tone="c" title={t("다음에 할 수 있는 것")} />
      <PickGrid cols={3}>
        <PickCard href="/me/experience/new" icon="layers" tone="b"
          title={t("경험 추가")} lead={t("새로 겪은 일을 적으면 현재 상태가 다시 계산됩니다.")} cta={t("적으러 가기")} />
        <PickCard href="/me/state" icon="chart" tone="c"
          title={t("현재 상태 보기")} lead={t("지금 설명할 수 있는 영역을 확인합니다.")} cta={t("보러 가기")} />
        <PickCard href="/me/explore" icon="compass" tone="v"
          title={t("산업·직무 탐색")} lead={t("확인된 영역과 이어지는 쪽을 봅니다.")} cta={t("보러 가기")} />
        {/* 지역은 한국 자료라 영어 작업공간에 세우지 않는다(`WS_KR_ONLY`) */}
        {lang !== "en" ? (
          <PickCard href="/me/region" icon="globe" tone="w"
            title="지역·기관 보기" lead="일하고 싶은 권역과 기관 유형을 고릅니다." cta="보러 가기" />
        ) : null}
      </PickGrid>
      </>
      ) : !first ? (
      <>
      {/* **빈 상태에서도 제품 구조가 느껴져야 한다**(규격 §13). 꺼진 칸
          하나에 한 줄만 적으면 쪽이 덜 만들어진 것으로 읽힌다. Hero 하나와
          **실제 route 가 있는** 칸 넷을 세운다 */}
      <StatHero icon="check" label={t("지금 할 일")} value={t("없음")}
        note={t("담아 둔 일을 다 끝내셨습니다. 새 경험을 더하면 다음 할 일이 생길 수 있습니다.")}
        action={<Link className="cm-btn is-primary" href="/me/experience/new">{t("경험 추가")}</Link>} />
      <SectionHeader icon="compass" tone="c" title={t("다음에 할 수 있는 것")} />
      <PickGrid cols={3}>
        <PickCard href="/me/experience/new" icon="layers" tone="b"
          title={t("경험 추가")} lead={t("새로 겪은 일을 적으면 현재 상태가 다시 계산됩니다.")} cta={t("적으러 가기")} />
        <PickCard href="/me/state" icon="chart" tone="c"
          title={t("현재 상태 보기")} lead={t("지금 설명할 수 있는 영역을 확인합니다.")} cta={t("보러 가기")} />
        <PickCard href="/me/explore" icon="compass" tone="v"
          title={t("산업·직무 탐색")} lead={t("확인된 영역과 이어지는 쪽을 봅니다.")} cta={t("보러 가기")} />
        {/* 지역은 한국 자료라 영어 작업공간에 세우지 않는다(`WS_KR_ONLY`) */}
        {lang !== "en" ? (
          <PickCard href="/me/region" icon="globe" tone="w"
            title="지역·기관 보기" lead="일하고 싶은 권역과 기관 유형을 고릅니다." cta="보러 가기" />
        ) : null}
      </PickGrid>
      </>
      ) : (
        <>
          {/* ── 지금 할 한 가지 ──
              **넷을 한 묶음으로 적는다**(규격 §9). 그리고 이 칸에만 테를
              두른다: 아래 접힌 목록과 같은 생김새면 `하나만 강조한다` 가
              화면에서 지켜지지 않는다 */}
          <article className="cm-gap" style={{ marginBottom: 20 }}>
            <h3>{sayOf(first).head}</h3>
            {(() => {
              const g = gapOf(first);
              const k = g ? TX.gapKo(g, dn(g.domain)) : null;
              const how = howOf(first);
              /* 빈자리가 없으면 **그 할 일을 고른 규칙**이 까닭을 든다 */
              const code = modelOf(first)?.code ?? "";
              const why = k?.why ?? WHY_BY_CODE[code] ?? "";
              const guide = sayOf(first).guide;
              return (
                <>
                  {why ? <p><b>{t("왜 필요한가")}</b> {why}</p> : null}
                  {/* **상세 가이드는 펼침 안이다**(규격 §9). 적는 차례와
                      깊이는 할 때 읽는 글이지 고를 때 읽는 글이 아니다 */}
                  {guide.length ? (
                    <details className="cm-why is-fields">
                      <summary>{t("어떻게 적으면 되나요")}</summary>
                      {guide.map((x) => <p key={x}>{x}</p>)}
                    </details>
                  ) : null}
                  {k ? (
                    <p><b>{t("어느 부분")}</b> {k.title}</p>
                  ) : (
                    <p>
                      <b>{t("어느 부분")}</b>{" "}
                      {first.td_code
                        ? t("{name} · 지금 부족한 부분은 없습니다", { name: dn(first.td_code) })
                        : t("영역을 가리지 않는 할 일입니다")}
                    </p>
                  )}
                  {how.length ? (
                    <p>
                      <b>{t("어떤 경험으로")}</b>{" "}
                      {t("{list} 가운데 하나를 남기면 그 부분이 채워집니다.",
                        { list: how.map(inLine).join(t(" 또는 ")) })}
                    </p>
                  ) : null}
                </>
              );
            })()}
            {/* **여기서 루프가 이어진다**(규격 §9). 할 일을 읽은 사람이
                다음에 하는 일은 그것을 해 보고 경험으로 적는 것이다 */}
            <div className="cm-acts" style={{ marginTop: 12 }}>
              {/* **그 할 일의 기술영역을 들고 간다**(규격 §10). 이 줄을
                  읽고 누른 사람은 **그 영역의 일**을 적으러 가는 것이고,
                  들고 가지 않으면 열두 영역에서 그 하나를 다시 찾는다.
                  영역이 없는 할 일(정리 쪽)은 전처럼 빈 폼으로 간다 */}
              <Link className="cm-btn is-primary"
                href={first.td_code
                  ? `/me/experience/new?td=${encodeURIComponent(first.td_code)}`
                  : "/me/experience/new"}>
                {t("경험에 추가")}
              </Link>
              {/* **표에 없는 줄이면 담고 나서 바꾼다.** 번호가 없으므로
                  무엇을 바꾸는지를 영역과 문장으로 알려 준다 */}
              <form action={moveAction}>
                <input type="hidden" name="id" value={first.id} />
                <input type="hidden" name="state" value="done" />
                <input type="hidden" name="body" value={first.body} />
                <input type="hidden" name="td" value={first.td_code ?? ""} />
                <button className="cm-btn" type="submit">{t("끝냈습니다")}</button>
              </form>
            </div>
          </article>

          {/* ── 나머지 ──
              **파란 단추를 더 세우지 않는다**(규격 §10). 줄과 `끝냈습니다`
              까지다 */}
          {rest.length ? (
            <details className="cm-fold">
              <summary>{t("그 밖에 할 일 {n}가지", { n: rest.length })}</summary>
              {LANES.map(([key, title, hint]) => {
                const mine = rest.filter((a) => lane(a.horizon) === key);
                /* `지금` 칸에 남은 줄은 첫 묶음 바로 아래에 둔다 */
                const now = key === "NEXT"
                  ? rest.filter((a) => lane(a.horizon) === "NOW") : [];
                const list = [...now, ...mine];
                if (!list.length) return null;
                return (
                  <section className="cm-zone" key={key}>
                    <h3>{title} <em>{hint}</em></h3>
                    <div className="cm-rows">
                      {list.map((a) => (
                        <p className="cm-row" key={a.id}>
                          <b>{sayOf(a).head}</b>
                          <span className="cm-when">
                            {a.td_code ? dn(a.td_code) : ""}
                          </span>
                        </p>
                      ))}
                    </div>
                  </section>
                );
              })}
              <p className="cm-none">
                {t("하나를 끝내면 그다음 줄이 위로 올라옵니다. 지금은 첫 줄만 하시면 됩니다.")}
              </p>
            </details>
          ) : null}

          {done.length ? (
            <details className="cm-fold">
              <summary>{t("끝낸 일 {n}가지", { n: done.length })}</summary>
              <div className="cm-rows">
                {/*
                  **`p` 안에 `form` 을 두지 않는다.** `p` 는 문장 조각만 받는데
                  `form` 은 덩이라, 브라우저가 그것을 `p` 밖으로 끌어낸다.
                  서버가 보낸 것과 브라우저가 세운 것이 달라지고 React 가
                  `#418` 로 멈춘다(화면은 멀쩡해 보이고 눌리는 것만 안 된다).
                */}
                {done.map((a) => (
                  <div className="cm-row" key={a.id}>
                    {/* 담아 둔 문장은 한국어로 담겨 있다. 영어에서는 굳은 결과에서
                        같은 할 일을 찾아 그 언어로 적는다(못 찾으면 담아 둔 문장) */}
                    <b>{lang === "en" ? sayOf(a).head : a.body}</b>
                    <form action={moveAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="state" value="open" />
                      <button className="cm-btn" type="submit">{t("되돌리기")}</button>
                    </form>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {/* 굳은 결과가 낸 할 일을 더 담을 수 있는가. **머리에 두지
              않는다**: 지금 할 한 가지보다 큰 자리를 먹으면 안 된다 */}
          {model && !act.fromResult && model.actions.length > actions.length ? (
            <div className="cm-acts" style={{ marginTop: 20 }}>
              <form action={pullActions}>
                <button className="cm-btn" type="submit">{t("결과의 할 일 더 담기")}</button>
              </form>
            </div>
          ) : null}
        </>
      )}
    </CmShell>
  );
}
