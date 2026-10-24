import Link from "next/link";
import { currentUser, requireUser } from "@/lib/session";
import { majorNameOf } from "@/lib/me-v3/major-name";
import { currentState, profileOf, activeCoreOrPick } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import {
  axisLabel, domainName, industryChoices, majorNameIn, roleName,
} from "@/lib/me-v3/runtime/session";
import { moveLabel, orgLabel, regionName } from "@/lib/me-v3/region";
import { textFor } from "@/lib/me-v3/result/text";
import { localizeResult } from "@/lib/me-v3/result/localize";
import { coreOf } from "@/lib/me-v3/result/model";
import { recentChangeKo } from "@/lib/me-v3/change-text.ko";
import { wsLang } from "@/lib/me-v3/ws-lang";
import { wsSay } from "@/lib/me-v3/ws-say";
import { CmShell, CmHead } from "../shell";
import { DomainTile, SectionHeader, StatHero } from "../ui";

export async function generateMetadata() {
  const u = await currentUser().catch(() => null);
  const t = wsSay(u ? await wsLang(u.id) : "ko");
  return { title: `${t("현재 상태")} · CareerMatri` };
}

/** 읽는 차례. **아직 판단하기 어려운 영역을 맨 위에 두지 않는다** */
const ORDER = [
  "Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE",
  "Z3_EVIDENCE_LOW_INTEREST", "Z4_INSUFFICIENT_EVIDENCE", "NOT_EXPLORED",
] as const;

/**
 * 첫 화면에 올리는 묶음과 그 묶음을 읽는 말.
 *
 * **묶음 머리가 이미 한 말은 줄에서 뺀다**(규격 §7). 머리에 `지원서에서
 * 설명할 경험이 확인된 영역입니다` 를 한 번 적으므로, 그 묶음(Z1)의 줄에는
 * 영역 이름만 선다. 둘째 묶음(Z2)만 머리와 다른 상태라 한 마디를 붙인다.
 */
const SAY_READY: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "",
  /* **칸 세부가 두 줄을 넘지 않게 짧게 적는다**(R35 인벤토리). 스무 자로
     두었더니 1440 에서 `남긴 것을 더 붙이면 설명이…` 로 잘렸다. 말줄임은
     줄인 것이 아니라 가린 것이다. 위 한 줄이 쓰는 말과 같은 말이다 */
  Z2_EVIDENCE_INCOMPLETE: "정리만 남은 영역",
};
const READY = ["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE"];
/** 첫 화면이 드는 줄 수. **요약이 세부를 대신하면 세부가 죽는다** */
const TOP = 3;
/** 한 묶음에 세우는 칩 수(규격 §13). 나머지는 수로 적는다 */
const CHIP_MAX = 5;
const TOP_GAPS = 3;

/**
 * 현재 상태.
 *
 * **검사 당시 결과가 아니다.** 여기 선 값은 그 결과 위에 새 경험을 얹은
 * 지금 값이고, 경험을 더하면 달라진다. 그 사실을 머리에 적는다.
 *
 * **첫 화면의 차례를 규격 §7 이 정한다**: 현재 상태 → 최근 반영 →
 * 지금 설명할 수 있는 영역 → 최근 달라진 것 → 아직 부족한 것 → 다음
 * 행동. 전에는 열두 영역이 묶음마다 칩으로 깔리고 그 아래 카드 여섯이
 * 섰다. 그러면 **읽는 사람이 자기 상태를 묶음 목록으로 읽고**, 그래서
 * 무엇을 하면 되는가는 쪽 끝까지 내려가야 나왔다.
 *
 * **굳은 결과와 지금 값을 점수처럼 견주지 않는다**(규격 §8). `+1점` 도
 * `2 → 3` 도 쓰지 않는다. 두 값이 **서로를 덮지 않는다**는 것과 무엇이
 * 달라졌는지를 문장으로 적는다.
 *
 * **Gap 하나에 늘 셋이 붙는다**: 무엇이 비었는가 · 왜 그 자리가 필요한가 ·
 * 무엇을 하면 채울 수 있는가.
 *
 * **축 코드와 소유 코드를 내보내지 않는다.** `J3` 도 `OWNED` 도 없다.
 */
export default async function State(
  { searchParams }: { searchParams: Promise<{ r?: string }> },
) {
  const user = await requireUser();
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  const lang = await wsLang(user.id);
  const t = wsSay(lang);
  const TX = textFor(lang);
  const dn = (td: string) => domainName(core, td, lang);
  /* 전공 이름. 영어면 그 언어의 이름이다(모르는 코드면 비운다) */
  const majorOf = (c: string | null | undefined): string | null => {
    const ko = majorNameOf(c);
    if (lang !== "en" || !ko || !c) return ko;
    try { return majorNameIn(c, "en"); } catch { return null; }
  };
  /* 날짜. 한국어는 `YYYY-MM-DD` 그대로다 */
  const day = (s: string | null | undefined): string => {
    if (!s || lang !== "en") return s ?? "";
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    });
  };
  /* 방금 반영하고 온 사람인가. **반영 화면에 세워 두지 않고 여기로
     보내되**, 무엇 때문에 이 화면이 열렸는지는 적어 준다 */
  const justApplied = (await searchParams).r === "1";
  const [st, profile, actions] = await Promise.all([
    currentState(user.id), profileOf(user.id), openActions(user.id),
  ]);
  const major = majorOf(st.core);

  if (!st.model) {
    return (
      <CmShell active="/me/state" title={t("현재 상태")} major={major} lang={lang}
      bar={<Link className="cm-btn" href="/me/experience/new">{t("+ 경험 추가")}</Link>}>
        <CmHead title={t("아직 볼 것이 없습니다")}
          lead={t("검사를 한 번 끝내면 확인된 근거와 아직 부족한 부분이 여기에 나옵니다.")} />
        <div className="cm-soon">
          <b>{t("완료한 검사가 없습니다.")}</b>
          <p style={{ marginTop: 10 }}>
            {st.open
              ? <Link href={`/v3/${st.open.id}`}>{t("풀던 검사 이어하기")}</Link>
              : <Link href="/cores">{major ? t("{major} 검사 시작", { major }) : t("검사 시작")}</Link>}
          </p>
        </div>
      </CmShell>
    );
  }

  /* 굳은 결과의 원고 글자(고른 항목 · 결과물 이름)를 그 언어로 읽는다.
     판정 칸은 글자가 아니라 그대로 간다 */
  const m = localizeResult(st.model, coreOf(st.model), lang);
  const raisedSet = new Set(st.raised.map((r) => `${r.domain}.${r.axis}`));
  /* **이름을 못 찾은 코드는 버린다.** 코드를 그대로 적으면 화면에 `OC1`
     이 선다 */
  const orgNames = (profile?.target_org ?? [])
    .map((c) => orgLabel(c)).filter((x): x is string => !!x);
  const indName = (c: string) => industryChoices(core, lang).find((x) => x.code === c)?.name ?? c;

  /* ③ 지금 설명할 수 있는 영역. 근거가 선 쪽이 먼저고 셋까지다 */
  const ready = READY.flatMap((z) =>
    Object.entries(st.zoneOf).filter(([, v]) => v === z).map(([d]) => ({ domain: d, zone: z })))
    .slice(0, TOP);
  /* ④ 최근 달라진 것. **실제 변화만**(규격 §7). 문장은 세 화면이 같이
     쓰는 자리가 든다(규격 §12) */
  const change = recentChangeKo(st, dn, 3, lang);
  /* 첫 화면에 서는 **한 줄**(규격 §5). 나머지는 `달라진 것 모두` 가 든다 */
  const one = recentChangeKo(st, dn, 1, lang);
  const realChange = st.recomputed_at && (st.raised.length || st.zoneMoved.length);
  /* ⑤ 아직 부족한 것 · ⑥ 다음 행동 하나 */
  const gaps = st.gaps.slice(0, TOP_GAPS);
  const open = actions.rows.filter((a) => a.state !== "done");
  const nextOne = open[0] ?? null;
  const fallback = m.actions[0] ?? null;

  return (
    <CmShell active="/me/state" title={t("현재 상태")} major={major} lang={lang}
      bar={<Link className="cm-btn" href="/me/experience/new">{t("+ 경험 추가")}</Link>}>
      {/* ①② 제목과 최근 반영 날짜.

          **설명은 한 번만 적는다**(규격 §7). 검사 당시 결과와 지금 값이
          서로를 덮지 않는다는 말은 아래 `검사 당시 결과와 지금` 묶음이
          한 번 든다. 여기 머리에 또 적으면 같은 말이 한 쪽에 세 번 선다.

          **머리에 단추를 세우지 않는다**(규격 §19). 이 쪽을 읽은 사람이
          다음에 하는 일은 실행이고, 그 단추는 `지금 할 일` 칸이 든다 */}
      <CmHead
        kicker={st.recomputed_at
          ? t("{at} 기준", { at: day(st.recomputed_at) })
          : t("검사 {at} 기준 · 아직 더한 경험 없음", { at: day(st.result_at) })}
        title={t("현재 상태")}
        lead={st.recomputed_at
          ? t("검사 {at} 결과에 그 뒤의 경험을 얹은 값입니다.", { at: day(st.result_at) })
          : t("아직 새 경험을 더한 적이 없어 검사 당시 결과와 같습니다.")}
        /* **짙은 단추는 쪽에 하나다**(규격 §19). 아래 `지금 할 일` 칸이
           `경험에 추가` 를 들고 있으므로 머리에는 아무것도 세우지 않는다.
           전에는 둘이 서서 같은 화면의 짙은 단추가 둘이었고, 둘이 **서로
           다른 쪽으로** 갔다 */
      />

      {justApplied ? (
        <p className="cm-done" role="status">
          {realChange
            ? t("새 경험을 더했습니다. 아래 `최근 달라진 것` 에 무엇이 달라졌는지 적혀 있습니다.")
            : t("새 경험을 더했습니다. 달라진 것은 없습니다 · 같은 영역의 근거가 둘이 되면 그때 올라갑니다.")}
        </p>
      ) : null}

      {/* ③ 지금 설명할 수 있는 영역 ── 최대 셋(규격 §5).

          **같은 문장을 영역마다 되풀이하지 않는다**(규격 §7). 전에는
          `지원서에서 설명할 경험이 확인됐습니다` 가 영역 카드마다 한 번씩
          서서, 셋이면 같은 줄이 셋 섰다. 뜻은 묶음 머리에 한 번 적고
          아래에는 영역 이름만 세운다.

          **카드 격자로 세우지 않는다**(규격 §18). 두 칸 격자에 셋을
          담으면 넷째 칸이 비어 오른쪽에 큰 빈 면이 남는다 */}
      {/* ③ Summary Hero(규격 §7). **한 값과 그 뒤의 행동**이다. 전에는
          이 자리가 흰 상자에 영역 이름 셋을 굵게 적은 글이라, 쪽의 목적이
          3초 안에 읽히지 않았다 */}
      <StatHero
        icon="layers"
        label={t("현재 설명할 수 있는 영역")}
        /* **묶음이 말하는 것만 센다**(R30). 전에는 정리가 덜 된 영역(Z2)
           까지 `설명할 수 있는` 수에 넣었다. 그 수는 근거가 선 영역(Z1)
           이고, 해 봤고 정리만 남은 쪽은 아래 한 줄이 따로 센다 */
        value={ready.filter((r) => r.zone === "Z1_EVIDENCE_ESTABLISHED").length}
        unit={t("개#unit")}
        /* **0개와 변화 있음을 나란히 두지 않는다**(규격 §3). 아래 `최근
           달라진 것` 에 올라간 축이 적혀 있는데 이 값이 0 이면, 두 칸이
           서로 어긋난 말을 하는 것으로 읽힌다. 축이 올라간 것과 영역이
           설명할 수 있는 상태로 선 것은 다른 일이라, 그 사이를 한 줄로
           잇는다. **판정 기준은 그대로다**: 세는 값도 묶음 조건도 한 줄도
           바뀌지 않았고, 바뀐 것은 그 0 을 어떻게 적는가뿐이다 */
        note={ready.length
          ? [
            ready[0].zone === "Z1_EVIDENCE_ESTABLISHED"
              ? t("가장 근거가 잘 잡힌 곳은 {name}입니다.", { name: dn(ready[0].domain) })
              : t("{name}은 해 봤고 정리만 남았습니다.", { name: dn(ready[0].domain) }),
            ready.some((r) => r.zone === "Z2_EVIDENCE_INCOMPLETE")
              && ready[0].zone === "Z1_EVIDENCE_ESTABLISHED"
              ? (() => {
                const n = ready.filter((r) => r.zone === "Z2_EVIDENCE_INCOMPLETE").length;
                return n === 1
                  ? t("정리만 남은 영역이 {n}개 더 있습니다.#one", { n })
                  : t("정리만 남은 영역이 {n}개 더 있습니다.", { n });
              })()
              : "",
          ].filter(Boolean).join(" ")
          : realChange
            ? t("변화는 생겼지만 아직 설명할 수 있는 기준까지는 올라오지 않았습니다. 무엇이 올라갔는지는 아래 `최근 달라진 것` 에 적혀 있습니다.")
            : t("관심이 높은 영역에서 짧게 한 번 해 보고 그것을 경험으로 적으면 여기에 나옵니다.")}
        action={Object.keys(st.zoneOf).length > ready.length ? (
          <Link className="cm-btn" href="#domains">{t("전체 기술영역 보기")}</Link>
        ) : undefined}
      />

      {/* **영역을 굵은 글줄로 쌓지 않는다**(규격 §7). 칸마다 표시와 이름과
          짧은 줄이 서고, 그 모양은 Home 의 영역 칸과 같다 */}
      {ready.length ? (
        <>
          <div className="cm-tiles cm-mb">
            {ready.map((r) => (
              <DomainTile
                key={r.domain}
                href="#domains"
                icon="check"
                title={dn(r.domain)}
                sub={[SAY_READY[r.zone] ? t(SAY_READY[r.zone]) : "",
                  st.raised.some((x) => x.domain === r.domain) ? t("경험 더함") : null]
                  .filter(Boolean).join(" · ") || undefined}
              />
            ))}
          </div>
        </>
      ) : null}

      <SectionHeader icon="bolt" tone="c" title={t("지금 할 일")} />
      <div className="cm-panel is-one is-lead">
        <div className="cm-pane">
          {nextOne ? (
            /* **담을 때의 문장이 아니라 지금 판본의 짧은 지시를 적는다**
               (규격 §9). 굳은 결과에서 같은 할 일을 찾으면 그쪽을 쓰고,
               못 찾으면 담아 둔 문장을 그대로 쓴다 */
            <p>{(() => {
              const x = m.actions.find((a) =>
                (a.domain ?? "") === (nextOne.td_code ?? "")
                && (a.axis ?? "") === (nextOne.axis_code ?? ""));
              return x
                ? TX.actionKo(x, x.domain ? dn(x.domain) : "", m.stage).do
                : nextOne.body;
            })()}</p>
          ) : fallback ? (
            <p>
              {TX.actionKo(
                fallback,
                fallback.domain ? dn(fallback.domain) : "",
                m.stage,
              ).do}
            </p>
          ) : (
            <p>
              {t("지금 꼭 해야 하는 일은 없습니다. 새 경험을 적어 현재 상태를 다시 세우면 그다음 할 일이 나옵니다.")}
            </p>
          )}
          {/* **읽는 쪽으로 보내지 않는다**(규격 §7). 할 일이 적는 일이면
              적는 자리로 바로 보낸다. `할 일 모두 보기` 는 곁딸린 자리라
              테를 두르지 않는다(규격 §12) */}
          <div className="cm-acts">
            <Link className="cm-btn is-primary" href="/me/experience/new">
              {t("경험에 추가")}
            </Link>
            {open.length > 1 ? (
              <Link className="cm-btn is-ghost" href="/me/next">
                {t("할 일 {n}가지 모두 보기", { n: open.length })}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* ⑤ 최근 달라진 것 ── **첫 화면에는 한 줄이다**(규격 §5).

          전에는 세 줄에 `그 밖에 2가지` 까지 붙어서, 첫 화면에서 가장 긴
          묶음이 **지난 일을 돌아보는 자리**가 됐다. 나머지는 아래 `달라진
          것 모두` 가 든다. 반영한 적이 없으면 이 묶음을 세우지 않는다:
          빈 카드를 세우면 읽는 사람은 자기 결과가 덜 만들어진 줄 안다 */}
      {st.recomputed_at ? (
        <>
          <SectionHeader icon="spark" title={t("최근 달라진 것")} />
          <div className="cm-panel is-one">
            <div className="cm-pane">
              <p><b>{one.lines[0]}</b></p>
              {one.more ? (
                <div className="cm-acts">
                  <Link className="cm-btn" href="#changes">
                    {t("달라진 것 {n}가지 모두 보기", { n: one.more + 1 })}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {/* ── 여기부터가 세부다(규격 §23) ──
          비어 있는 자리 전부 · 달라진 것 전부 · 전체 기술영역 · 검사 당시
          결과와 지금 · 산업과 직무 · 지역은 **첫 화면과 겨루지 않는다.**
          차례만 뒤로 미루면 머리글이 같은 크기라 화면에서는 여섯 묶음이
          나란히 선다. 선 하나로 경계를 긋고 아래 머리글을 한 단 내린다 */}
      <p className="cm-more-mark"><span>{t("여기부터 자세한 내용")}</span></p>

      {/* 아직 부족한 것 ── 하나에 늘 셋이 붙는다 */}
      <h2 className="cm-sub-h" id="gaps">{t("아직 부족한 것")}</h2>
      {gaps.length ? (
        <>
          {/* **같은 말을 세 번 적지 않는다**(규격 §14).
              빈자리 셋이 같은 종류면 `왜 필요한가` 와 그렇게 본 까닭이
              **글자까지 같다.** 같은 상태니까 같은 것이 맞는데, 카드마다
              되풀이하면 세 칸이 기계가 찍어 낸 표로 읽히고 정작 다른
              부분(어느 영역의 어느 판단인가)이 묻힌다. 셋이 같으면 한 번만
              위에 적고 카드는 다른 것만 든다.

              **`무엇을 하면` 이라고 적지 않는다.** 이 자리에 오는 값은
              `REASON_KO` 즉 **그렇게 본 까닭**이지 할 일이 아니다.
              `확인된 판단이 아직 넷에 못 미칩니다` 앞에 `무엇을 하면` 이
              붙으면 앞뒤가 맞지 않는다. 할 일은 위의 `지금 할 일` 이 든다 */}
          {(() => {
            const ks = gaps.map((g) => TX.gapKo(g, dn(g.domain)));
            const same = ks.length > 1
              && ks.every((k) => k.why === ks[0].why && k.detail === ks[0].detail);
            return (
              <>
                {same ? (
                  <p className="cm-lead" style={{ marginTop: 0 }}>
                    {ks[0].why} {ks[0].detail}
                  </p>
                ) : null}
                <div className="cm-gaps">
                  {gaps.map((g, i) => (
                    <article className="cm-gap" key={g.id}>
                      <h3>{ks[i].title}</h3>
                      {same ? null : (
                        <>
                          <p><b>{t("왜 필요한가")}</b> {ks[i].why}</p>
                          <p><b>{t("그렇게 본 까닭")}</b> {ks[i].detail}</p>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </>
            );
          })()}
          {st.gaps.length > gaps.length ? (
            <p className="cm-none" style={{ marginTop: 10 }}>
              {st.gaps.length - gaps.length === 1
                ? t("그 밖에 {n}곳이 더 있습니다. 급한 차례대로 위에 셋을 적었습니다.#one",
                  { n: st.gaps.length - gaps.length })
                : t("그 밖에 {n}곳이 더 있습니다. 급한 차례대로 위에 셋을 적었습니다.",
                  { n: st.gaps.length - gaps.length })}
            </p>
          ) : null}
        </>
      ) : (
        /* **비었다고 면까지 없애지 않는다**(규격 §42). 위아래 묶음이 전부
           판 위에 서 있는데 이 묶음만 쪽 바탕에 글자 두 줄로 서면, 읽는
           사람에게는 그 자리가 **아직 안 그려진 칸**으로 보인다 */
        <div className="cm-panel is-one is-soft">
          <div className="cm-pane">
            <p>
              {t("지금 바로 보완할 부분은 없습니다. 남은 일은 가진 근거를 지원서에서 설명할 문장으로 만드는 것입니다.")}
            </p>
          </div>
        </div>
      )}

      {/* 달라진 것 모두 ── 첫 화면의 한 줄이 가리키는 자리 */}
      {st.recomputed_at ? (
        <>
          <h2 className="cm-sub-h" id="changes">{t("달라진 것 모두")}</h2>
          <div className="cm-panel is-one">
            <div className="cm-pane">
              <h3>{t("{at} 에 더한 경험", { at: day(st.recomputed_at) })}</h3>
              <div className="cm-rows">
                {change.lines.map((line) => (
                  <p className="cm-row" key={line}><b>{line}</b></p>
                ))}
              </div>
              {change.more ? (
                <p className="cm-none">
                  {change.more === 1
                    ? t("그 밖에 {n}가지가 더 달라졌습니다.#one", { n: change.more })
                    : t("그 밖에 {n}가지가 더 달라졌습니다.", { n: change.more })}
                </p>
              ) : null}
              {!realChange ? (
                <p className="cm-none">
                  {t("이미 확인된 범위의 경험이 더해졌습니다. 지원서에서 설명할 재료는 그만큼 늘었습니다.")}
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {/* ── 검사 당시 결과와 지금 ──(규격 §8)
          **점수 비교처럼 보이지 않게 한다.** 두 칸을 나란히 두고 각
          칸이 무엇인지와 서로를 덮지 않는다는 것을 적는다. 숫자를 빼고
          적는 까닭은, 수를 둘 세우면 그 사이의 차이가 곧 성장으로
          읽히는데 **경험으로 올라갈 수 있는 자리는 `직접 수행` 까지**라
          그 차이가 재는 것이 다르기 때문이다 */}
      <h2 className="cm-sub-h">{t("검사 당시 결과와 지금")}</h2>
      <div className="cm-panel">
        <div className="cm-pane">
          <h3>{t("검사 당시 결과")} <span className="cm-lockmark">{t("고정됨")}</span></h3>
          <p>
            {t("{at} · {tier} · 그날의 문항과 기준으로 고정되어 있습니다. 경험을 더해도 이 줄은 한 글자도 달라지지 않습니다.", {
              at: day(st.result_at),
              tier: lang === "en"
                ? m.tier.charAt(0) + m.tier.slice(1).toLowerCase()
                : m.tier,
            })}
          </p>
          <div className="cm-acts">
            <Link className="cm-btn" href={`/v3/${m.attempt_id}/result`}>{t("결과 보기")}</Link>
          </div>
        </div>
        <div className="cm-pane">
          <h3>{t("현재 상태")}</h3>
          <p>
            {st.recomputed_at
              ? t("{at} 기준 · 그 결과 위에 새 경험을 얹은 값입니다.", { at: day(st.recomputed_at) })
              : t("아직 새 경험을 더한 적이 없어 왼쪽과 같습니다.")}
          </p>
          {st.zoneMoved.length ? (
            <div className="cm-chips">
              {st.zoneMoved.map((z) => (
                <span className="cm-chip is-on" key={z.domain}>
                  {t("{name} 달라짐", { name: dn(z.domain) })}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <p className="cm-lead" style={{ marginTop: 10 }}>
        {t("두 값은 서로를 덮지 않습니다. 지원서에 적을 때는 검사 당시 결과를 근거로 쓰고, 다음에 무엇을 할지는 현재 상태를 보시면 됩니다.")}
      </p>

      {/* ── 여기부터가 세부다 ──
          첫 화면이 답한 여섯 아래에 둔다. **접지 않는 까닭**은 이 쪽이
          `현재 상태` 를 다 보여 주는 자리이기도 해서다 */}
      <h2 className="cm-sub-h" id="domains">{t("전체 기술영역")}</h2>
      {ORDER.map((z) => {
        const list = Object.entries(st.zoneOf).filter(([, v]) => v === z).map(([d]) => d);
        if (!list.length) return null;
        return (
          <section className="cm-zone" key={z}>
            <h3>{TX.ZONE_TITLE_KO[z]} <em>{t("{n}곳", { n: list.length })}</em></h3>
            {/* **칩을 벽으로 쌓지 않는다**(규격 §13). 한 묶음에 아홉이
                깔리면 읽는 자리가 아니라 지나치는 자리가 된다. 다섯까지
                세우고 나머지는 수로 적는다: 이 자리는 고르는 자리가
                아니라 어디에 몇이 있는지를 보는 자리다 */}
            <div className="cm-chips">
              {list.slice(0, CHIP_MAX).map((d) => {
                const up = st.raised.some((r) => r.domain === d);
                return (
                  <span className={`cm-chip${z === ORDER[0] ? " is-on" : ""}`} key={d}>
                    {dn(d)}
                    {up ? <small>{t(" · 경험 더함")}</small> : null}
                  </span>
                );
              })}
              {list.length > CHIP_MAX ? (
                <span className="cm-chip is-more">{t("외 {n}곳", { n: list.length - CHIP_MAX })}</span>
              ) : null}
            </div>
          </section>
        );
      })}

      <details className="cm-fold">
        <summary>{t("설명할 수 있는 경험을 영역별로 보기")}</summary>
        {m.evidence.ready.length ? (
          <div className="cm-grid">
            {m.evidence.ready.slice(0, 6).map((g) => (
              <div className="cm-card" key={`${g.domain}.${g.axis}`}>
                <h2>
                  {dn(g.domain)}
                  <em>{axisLabel(g.axis, lang)}</em>
                  {raisedSet.has(`${g.domain}.${g.axis}`)
                    ? <span className="cm-lockmark">{t("경험 더함")}</span> : null}
                </h2>
                {g.picks.length ? (
                  <div className="cm-chips">
                    {g.picks.slice(0, 4).map((x) => (
                      <span className="cm-chip" key={x}>{x}</span>
                    ))}
                  </div>
                ) : <p>{t("그 영역에서 직접 정한 것이 확인됐습니다.")}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="cm-soon">
            <b>{t("지원서에서 설명할 수 있는 근거가 아직 없습니다.")}</b>{" "}
            {t("관심이 높은 영역에서 짧게 한 번 해 보고 그것을 적으면 여기에 그 경험이 쌓입니다.")}
          </div>
        )}
        {m.evidence.partial.length ? (
          <div className="cm-grid" style={{ marginTop: 14 }}>
            {m.evidence.partial.slice(0, 4).map((g) => (
              <div className="cm-card" key={`p-${g.domain}.${g.axis}`}>
                <h2>{dn(g.domain)} <em>{axisLabel(g.axis, lang)}</em></h2>
                <p>{t("해 본 것은 확인됐습니다. 여기서 무엇을 직접 정했는지까지 적으면 지원서에서 쓸 수 있습니다.")}</p>
              </div>
            ))}
          </div>
        ) : null}
      </details>

      {/* 보고 있는 산업과 직무. **고른 것만 적는다** */}
      {m.industry_context || m.role_context ? (
        <details className="cm-fold">
          <summary>{t("보고 있는 산업과 직무")}</summary>
          <div className="cm-grid">
            {([
              [m.industry_context, indName(m.industry_context?.code ?? ""), "산업"],
              [m.role_context, roleName(core, m.role_context?.code ?? "", lang), "직무"],
            ] as const).map(([pack, nm, kind]) => pack ? (
              <div className="cm-card" key={kind}>
                <h2>{nm} <em>{kind === "산업" ? t("산업#kind") : t("직무#kind")}</em></h2>
                {TX.bridgeKo(pack, nm, dn,
                  m.actions.find((a) => a.domain === pack.requested[0]?.domain) ?? null,
                  m.stage).map((line) => <p key={line}>{line}</p>)}
              </div>
            ) : null)}
          </div>
          <p className="cm-lead" style={{ marginTop: 12 }}>
            {t("산업과 직무는 같은 근거를 그쪽 말로 다시 읽어 주는 곳입니다. 고른 산업이나 직무가 기술영역 결과를 바꾸지는 않습니다.")}
          </p>
        </details>
      ) : null}

      {/* 관심 지역과 기관 유형. 기관 수를 적지 않는다.
          **영어 작업공간에 세우지 않는다**: 권역과 기관 유형이 한국 자료이고
          고치러 가는 쪽(`/me/region`)도 영어에서는 닫혀 있다 */}
      {lang !== "en" && (profile?.home_region || orgNames.length) ? (
        <details className="cm-fold">
          <summary>관심 지역과 기관 유형</summary>
          <div className="cm-rows">
            {profile?.home_region ? (
              <p className="cm-row"><b>권역</b>
                <span>
                  {regionName(profile.home_region)}
                  {profile.move_range ? ` · ${moveLabel(profile.move_range)}` : ""}
                </span></p>
            ) : null}
            {orgNames.length ? (
              <p className="cm-row"><b>기관 유형</b>
                <span>{orgNames.join(" · ")}</span></p>
            ) : null}
          </div>
          <p className="cm-lead" style={{ marginTop: 10 }}>
            고른 것만 적었습니다. 이 선택이 기술영역 결과를 바꾸지는
            않습니다.
          </p>
          <div className="cm-acts" style={{ marginTop: 12 }}>
            <Link className="cm-btn" href="/me/region">지역과 기관 다시 고르기</Link>
          </div>
        </details>
      ) : null}
    </CmShell>
  );
}
