import Link from "next/link";
import { requireUser } from "@/lib/session";
import { currentState, profileOf } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { domainName, industryChoices, roleName } from "@/lib/me-v3/runtime/session";
import { moveLabel, orgLabel, regionName } from "@/lib/me-v3/region";
import {
  AXIS_KO, ZONE_TITLE_KO, actionKo, bridgeKo, gapKo,
} from "@/lib/me-v3/result/text.ko";
import { recentChangeKo } from "@/lib/me-v3/change-text.ko";
import { CmShell, CmHead } from "../shell";

export const metadata = { title: "현재 상태 · CareerMatri" };

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
  Z2_EVIDENCE_INCOMPLETE: "남긴 것을 더 붙일 자리가 있습니다",
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
  /* 방금 반영하고 온 사람인가. **반영 화면에 세워 두지 않고 여기로
     보내되**, 무엇 때문에 이 화면이 열렸는지는 적어 준다 */
  const justApplied = (await searchParams).r === "1";
  const [st, profile, actions] = await Promise.all([
    currentState(user.id), profileOf(user.id), openActions(user.id),
  ]);

  if (!st.model) {
    return (
      <CmShell active="/me/state" title="현재 상태">
        <CmHead kicker="현재 상태" title="아직 볼 것이 없습니다"
          lead="검사를 한 번 끝내면 확인된 근거와 아직 부족한 부분이 여기에 섭니다." />
        <div className="cm-soon">
          <b>완료한 검사가 없습니다.</b>
          <p style={{ marginTop: 10 }}>
            {st.open
              ? <Link href={`/v3/${st.open.id}`}>풀던 검사 이어하기</Link>
              : <Link href="/cores">기계공학 검사 시작</Link>}
          </p>
        </div>
      </CmShell>
    );
  }

  const m = st.model;
  const raisedSet = new Set(st.raised.map((r) => `${r.domain}.${r.axis}`));
  /* **이름을 못 찾은 코드는 버린다.** 코드를 그대로 적으면 화면에 `OC1`
     이 선다 */
  const orgNames = (profile?.target_org ?? [])
    .map((c) => orgLabel(c)).filter((x): x is string => !!x);
  const indName = (c: string) => industryChoices().find((x) => x.code === c)?.name ?? c;

  /* ③ 지금 설명할 수 있는 영역. 근거가 선 쪽이 먼저고 셋까지다 */
  const ready = READY.flatMap((z) =>
    Object.entries(st.zoneOf).filter(([, v]) => v === z).map(([d]) => ({ domain: d, zone: z })))
    .slice(0, TOP);
  /* ④ 최근 달라진 것. **실제 변화만**(규격 §7). 문장은 세 화면이 같이
     쓰는 자리가 든다(규격 §12) */
  const change = recentChangeKo(st, domainName, 3);
  /* 첫 화면에 서는 **한 줄**(규격 §5). 나머지는 `달라진 것 모두` 가 든다 */
  const one = recentChangeKo(st, domainName, 1);
  const realChange = st.recomputed_at && (st.raised.length || st.zoneMoved.length);
  /* ⑤ 아직 부족한 것 · ⑥ 다음 행동 하나 */
  const gaps = st.gaps.slice(0, TOP_GAPS);
  const open = actions.rows.filter((a) => a.state !== "done");
  const nextOne = open[0] ?? null;
  const fallback = m.actions[0] ?? null;

  return (
    <CmShell active="/me/state" title="현재 상태">
      {/* ①② 제목과 최근 반영 날짜.

          **설명은 한 번만 적는다**(규격 §7). 검사 당시 결과와 지금 값이
          서로를 덮지 않는다는 말은 아래 `검사 당시 결과와 지금` 묶음이
          한 번 든다. 여기 머리에 또 적으면 같은 말이 한 쪽에 세 번 선다.

          **머리에 단추를 세우지 않는다**(규격 §19). 이 쪽을 읽은 사람이
          다음에 하는 일은 실행이고, 그 단추는 `지금 할 일` 칸이 든다 */}
      <CmHead
        kicker={st.recomputed_at
          ? `${st.recomputed_at} 기준`
          : `검사 ${st.result_at} 기준 · 아직 더한 경험 없음`}
        title="현재 상태"
        lead={st.recomputed_at
          ? `검사 ${st.result_at} 결과에 그 뒤의 경험을 얹은 값입니다.`
          : "아직 새 경험을 더한 적이 없어 검사 당시 결과와 같습니다."}
        /* **짙은 단추는 쪽에 하나다**(규격 §19). 아래 `지금 할 일` 칸이
           `경험에 추가` 를 들고 있으므로 머리에는 아무것도 세우지 않는다.
           전에는 둘이 서서 같은 화면의 짙은 단추가 둘이었고, 둘이 **서로
           다른 쪽으로** 갔다 */
      />

      {justApplied ? (
        <p className="cm-done" role="status">
          {realChange
            ? "새 경험을 더했습니다. 아래 `최근 달라진 것` 에 무엇이 달라졌는지 적혀 있습니다."
            : "새 경험을 더했습니다. 달라진 것은 없습니다 · 같은 영역의 근거가 둘이 되면 그때 올라갑니다."}
        </p>
      ) : null}

      {/* ③ 지금 설명할 수 있는 영역 ── 최대 셋(규격 §5).

          **같은 문장을 영역마다 되풀이하지 않는다**(규격 §7). 전에는
          `지원서에서 설명할 경험이 확인됐습니다` 가 영역 카드마다 한 번씩
          서서, 셋이면 같은 줄이 셋 섰다. 뜻은 묶음 머리에 한 번 적고
          아래에는 영역 이름만 세운다.

          **카드 격자로 세우지 않는다**(규격 §18). 두 칸 격자에 셋을
          담으면 넷째 칸이 비어 오른쪽에 큰 빈 면이 남는다 */}
      <h2 className="cm-sect" id="ready">지금 설명할 수 있는 영역</h2>
      <div className="cm-panel is-one">
        <div className="cm-pane">
          {ready.length ? (
            <>
              <p className="cm-none">지원서에서 설명할 경험이 확인된 영역입니다.</p>
              <div className="cm-rows">
                {ready.map((r) => (
                  <p className="cm-row" key={r.domain}>
                    <b>{domainName(r.domain)}</b>
                    {SAY_READY[r.zone] ? <span>{SAY_READY[r.zone]}</span> : null}
                    {st.raised.some((x) => x.domain === r.domain)
                      ? <span className="cm-lockmark">경험 더함</span> : null}
                  </p>
                ))}
              </div>
              {Object.keys(st.zoneOf).length > ready.length ? (
                <div className="cm-acts">
                  <Link className="cm-btn" href="#domains">전체 기술영역 보기</Link>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <h3>지원서에서 설명할 만한 경험이 아직 없습니다</h3>
              <p>
                관심이 높은 영역에서 짧게 한 번 해 보고 그것을 경험으로 적으면
                이 자리가 섭니다.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ④ 지금 할 일 하나 ── **첫 화면 안에, 변화보다 먼저 선다**(규격 §5).

          전에는 이 묶음이 `최근 달라진 것` 아래였다. 그러면 첫 화면이
          **상태 → 지난 일 → 할 일** 차례로 읽히고, 가운데에서 한 번
          끊긴다. 지난 일은 할 일을 정하고 나서 봐도 되는 것이라 뒤로
          보냈다 */}
      {/* **이 쪽에서 가장 센 자리는 하나다**(규격 §18 · 시각 규격 §2).
          묶음 여섯이 전부 같은 흰 판으로 서면 차례를 세워 둔 뜻이 화면에
          남지 않는다. 읽는 자리와 누르는 자리를 무게로 가른다: 이 묶음만
          왼쪽에 선을 세우고 짙은 단추를 든다 */}
      <h2 className="cm-sect">지금 할 일</h2>
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
                ? actionKo(x, x.domain ? domainName(x.domain) : "", m.stage).do
                : nextOne.body;
            })()}</p>
          ) : fallback ? (
            <p>
              {actionKo(
                fallback,
                fallback.domain ? domainName(fallback.domain) : "",
                m.stage,
              ).do}
            </p>
          ) : (
            <p>
              지금 꼭 해야 하는 일은 없습니다. 새 경험을 적어 현재 상태를 다시
              세우면 그다음 할 일이 나옵니다.
            </p>
          )}
          {/* **읽는 쪽으로 보내지 않는다**(규격 §7). 할 일이 적는 일이면
              적는 자리로 바로 보낸다. `할 일 모두 보기` 는 곁딸린 자리라
              테를 두르지 않는다(규격 §12) */}
          <div className="cm-acts">
            <Link className="cm-btn is-primary" href="/me/experience/new">
              경험에 추가
            </Link>
            {open.length > 1 ? (
              <Link className="cm-btn is-ghost" href="/me/next">
                할 일 {open.length}가지 모두 보기
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
          <h2 className="cm-sect">최근 달라진 것</h2>
          <div className="cm-panel is-one">
            <div className="cm-pane">
              <p><b>{one.lines[0]}</b></p>
              {one.more ? (
                <div className="cm-acts">
                  <Link className="cm-btn" href="#changes">
                    달라진 것 {one.more + 1}가지 모두 보기
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {/* ── 여기부터가 세부다(규격 §6) ──
          비어 있는 자리 전부 · 달라진 것 전부 · 전체 기술영역 · 검사 당시
          결과와 지금 · 산업과 직무 · 지역을 첫 화면 아래로 내린다 */}

      {/* 아직 부족한 것 ── 하나에 늘 셋이 붙는다 */}
      <h2 className="cm-sect" id="gaps">아직 부족한 것</h2>
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
            const ks = gaps.map((g) => gapKo(g, domainName(g.domain)));
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
                          <p><b>왜 필요한가</b> {ks[i].why}</p>
                          <p><b>그렇게 본 까닭</b> {ks[i].detail}</p>
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
              그 밖에 {st.gaps.length - gaps.length}곳이 더 있습니다. 급한
              차례대로 위에 셋을 적었습니다.
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
              지금 바로 보완할 부분은 없습니다. 남은 일은 가진 근거를
              지원서에서 설명할 문장으로 만드는 것입니다.
            </p>
          </div>
        </div>
      )}

      {/* 달라진 것 모두 ── 첫 화면의 한 줄이 가리키는 자리 */}
      {st.recomputed_at ? (
        <>
          <h2 className="cm-sect" id="changes">달라진 것 모두</h2>
          <div className="cm-panel is-one">
            <div className="cm-pane">
              <h3>{st.recomputed_at} 에 더한 경험</h3>
              <div className="cm-rows">
                {change.lines.map((line) => (
                  <p className="cm-row" key={line}><b>{line}</b></p>
                ))}
              </div>
              {change.more ? (
                <p className="cm-none">그 밖에 {change.more}가지가 더 달라졌습니다.</p>
              ) : null}
              {!realChange ? (
                <p className="cm-none">
                  이미 확인된 범위의 경험이 더해졌습니다. 지원서에서 설명할
                  재료는 그만큼 늘었습니다.
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
      <h2 className="cm-sect">검사 당시 결과와 지금</h2>
      <div className="cm-panel">
        <div className="cm-pane">
          <h3>검사 당시 결과 <span className="cm-lockmark">고정됨</span></h3>
          <p>
            {st.result_at} · {m.tier} · 그날의 문항과 기준으로 굳어 있습니다.
            경험을 더해도 이 줄은 한 글자도 달라지지 않습니다.
          </p>
          <div className="cm-acts">
            <Link className="cm-btn" href={`/v3/${m.attempt_id}/result`}>결과 보기</Link>
          </div>
        </div>
        <div className="cm-pane">
          <h3>현재 상태</h3>
          <p>
            {st.recomputed_at
              ? `${st.recomputed_at} 기준 · 그 결과 위에 새 경험을 얹은 값입니다.`
              : "아직 새 경험을 더한 적이 없어 왼쪽과 같습니다."}
          </p>
          {st.zoneMoved.length ? (
            <div className="cm-chips">
              {st.zoneMoved.map((z) => (
                <span className="cm-chip is-on" key={z.domain}>
                  {domainName(z.domain)} 달라짐
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <p className="cm-lead" style={{ marginTop: 10 }}>
        두 값은 서로를 덮지 않습니다. 지원서에 적을 때는 검사 당시 결과를
        근거로 쓰고, 다음에 무엇을 할지는 현재 상태를 보시면 됩니다.
      </p>

      {/* ── 여기부터가 세부다 ──
          첫 화면이 답한 여섯 아래에 둔다. **접지 않는 까닭**은 이 쪽이
          `현재 상태` 를 다 보여 주는 자리이기도 해서다 */}
      <h2 className="cm-sect" id="domains">전체 기술영역</h2>
      {ORDER.map((z) => {
        const list = Object.entries(st.zoneOf).filter(([, v]) => v === z).map(([d]) => d);
        if (!list.length) return null;
        return (
          <section className="cm-zone" key={z}>
            <h3>{ZONE_TITLE_KO[z]} <em>{list.length}곳</em></h3>
            {/* **칩을 벽으로 쌓지 않는다**(규격 §13). 한 묶음에 아홉이
                깔리면 읽는 자리가 아니라 지나치는 자리가 된다. 다섯까지
                세우고 나머지는 수로 적는다: 이 자리는 고르는 자리가
                아니라 어디에 몇이 있는지를 보는 자리다 */}
            <div className="cm-chips">
              {list.slice(0, CHIP_MAX).map((d) => {
                const up = st.raised.some((r) => r.domain === d);
                return (
                  <span className={`cm-chip${z === ORDER[0] ? " is-on" : ""}`} key={d}>
                    {domainName(d)}
                    {up ? <small> · 경험 더함</small> : null}
                  </span>
                );
              })}
              {list.length > CHIP_MAX ? (
                <span className="cm-chip is-more">외 {list.length - CHIP_MAX}곳</span>
              ) : null}
            </div>
          </section>
        );
      })}

      <details className="cm-fold">
        <summary>설명할 수 있는 경험을 영역별로 보기</summary>
        {m.evidence.ready.length ? (
          <div className="cm-grid">
            {m.evidence.ready.slice(0, 6).map((g) => (
              <div className="cm-card" key={`${g.domain}.${g.axis}`}>
                <h2>
                  {domainName(g.domain)}
                  <em>{AXIS_KO[g.axis]}</em>
                  {raisedSet.has(`${g.domain}.${g.axis}`)
                    ? <span className="cm-lockmark">경험 더함</span> : null}
                </h2>
                {g.picks.length ? (
                  <div className="cm-chips">
                    {g.picks.slice(0, 4).map((x) => (
                      <span className="cm-chip" key={x}>{x}</span>
                    ))}
                  </div>
                ) : <p>그 영역에서 직접 정한 것이 확인됐습니다.</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="cm-soon">
            <b>지원서에서 설명할 수 있는 근거가 아직 없습니다.</b>
            관심이 높은 영역에서 짧게 한 번 해 보고 그것을 적으면 이 자리가 섭니다.
          </div>
        )}
        {m.evidence.partial.length ? (
          <div className="cm-grid" style={{ marginTop: 14 }}>
            {m.evidence.partial.slice(0, 4).map((g) => (
              <div className="cm-card" key={`p-${g.domain}.${g.axis}`}>
                <h2>{domainName(g.domain)} <em>{AXIS_KO[g.axis]}</em></h2>
                <p>해 본 것은 확인됐습니다. 여기서 무엇을 직접 정했는지까지
                  적으면 지원서에서 쓸 수 있습니다.</p>
              </div>
            ))}
          </div>
        ) : null}
      </details>

      {/* 보고 있는 산업과 직무. **고른 것만 적는다** */}
      {m.industry_context || m.role_context ? (
        <details className="cm-fold">
          <summary>보고 있는 산업과 직무</summary>
          <div className="cm-grid">
            {([
              [m.industry_context, indName(m.industry_context?.code ?? ""), "산업"],
              [m.role_context, roleName(m.role_context?.code ?? ""), "직무"],
            ] as const).map(([pack, nm, kind]) => pack ? (
              <div className="cm-card" key={kind}>
                <h2>{nm} <em>{kind}</em></h2>
                {bridgeKo(pack, nm, domainName,
                  m.actions.find((a) => a.domain === pack.requested[0]?.domain) ?? null,
                  m.stage).map((line) => <p key={line}>{line}</p>)}
              </div>
            ) : null)}
          </div>
          <p className="cm-lead" style={{ marginTop: 12 }}>
            산업과 직무는 같은 근거를 그쪽 말로 다시 읽어 주는 곳입니다.
            고른 산업이나 직무가 기술영역 결과를 바꾸지는 않습니다.
          </p>
        </details>
      ) : null}

      {/* 관심 지역과 기관 유형. 기관 수를 적지 않는다 */}
      {profile?.home_region || orgNames.length ? (
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
