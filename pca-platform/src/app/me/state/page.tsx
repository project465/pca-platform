import Link from "next/link";
import { requireUser } from "@/lib/session";
import { currentState, profileOf } from "@/lib/me-v3/platform";
import { domainName, industryChoices, roleName } from "@/lib/me-v3/runtime/session";
import { moveLabel, orgLabel, regionName } from "@/lib/me-v3/region";
import {
  AXIS_KO, ZONE_TITLE_KO, bridgeKo, gapKo,
} from "@/lib/me-v3/result/text.ko";
import { CmShell, CmHead } from "../shell";

export const metadata = { title: "지금 상태 · CareerMatri" };

/** 읽는 차례. **아직 판단하기 어려운 영역을 맨 위에 두지 않는다** */
const ORDER = [
  "Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE",
  "Z3_EVIDENCE_LOW_INTEREST", "Z4_INSUFFICIENT_EVIDENCE", "NOT_EXPLORED",
] as const;

/**
 * 지금 상태.
 *
 * **검사 당시 결과가 아니다.** 여기 선 값은 그 결과 위에 새 경험을 얹은
 * 지금 값이고, 경험을 더하면 달라진다. 그 사실을 머리에 적는다.
 *
 * **Gap 하나에 늘 셋이 붙는다**: 무엇이 비었는가 · 왜 그 자리가 필요한가 ·
 * 무엇을 하면 채울 수 있는가. 목록만 나열하면 읽은 사람이 무엇부터 할지
 * 모른다.
 *
 * **축 코드와 소유 코드를 내보내지 않는다.** `J3` 도 `OWNED` 도 없다.
 */
export default async function State() {
  const user = await requireUser();
  const [st, profile] = await Promise.all([currentState(user.id), profileOf(user.id)]);

  if (!st.model) {
    return (
      <CmShell active="/me/state" title="지금 상태">
        <CmHead kicker="지금 상태" title="아직 볼 것이 없습니다"
          lead="검사를 한 번 끝내면 확인된 근거와 비어 있는 자리가 여기에 섭니다." />
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
  const indName = (c: string) => industryChoices().find((x) => x.code === c)?.name ?? c;
  const say = (c: string) => c;
  void say;

  return (
    <CmShell active="/me/state" title="지금 상태">
      <CmHead
        kicker={st.recomputed_at ? `${st.recomputed_at} 기준` : `${st.result_at} 기준`}
        title="지금 설명할 수 있는 것과 비어 있는 자리"
        lead={st.recomputed_at
          ? "검사 결과에 그 뒤에 더한 경험까지 얹은 값입니다. 경험을 더하면 다시 달라집니다."
          : "아직 새 경험을 반영한 적이 없어 검사 당시 결과와 같습니다."}
        actions={
          <>
            <Link className="cm-btn is-primary" href="/me/experience/new">새 경험 추가</Link>
            <Link className="cm-btn" href={`/v3/${m.attempt_id}/result`}>
              검사 당시 결과 보기
            </Link>
          </>
        }
      />

      {/* ── 1. 기술영역 ── */}
      <h2 className="cm-sect" id="domains">기술영역</h2>
      {ORDER.map((z) => {
        const list = Object.entries(st.zoneOf).filter(([, v]) => v === z).map(([d]) => d);
        if (!list.length) return null;
        return (
          <section className="cm-zone" key={z}>
            <h3>{ZONE_TITLE_KO[z]} <em>{list.length}곳</em></h3>
            <div className="cm-chips">
              {list.map((d) => {
                const up = st.raised.some((r) => r.domain === d);
                return (
                  <span className={`cm-chip${z === ORDER[0] ? " is-on" : ""}`} key={d}>
                    {domainName(d)}
                    {up ? <small> · 경험 반영</small> : null}
                  </span>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ── 2. 설명할 수 있는 경험 ── */}
      <h2 className="cm-sect" id="evidence">설명할 수 있는 경험</h2>
      {m.evidence.ready.length ? (
        <div className="cm-grid">
          {m.evidence.ready.slice(0, 6).map((g) => (
            <div className="cm-card" key={`${g.domain}.${g.axis}`}>
              <h2>
                {domainName(g.domain)}
                <em>{AXIS_KO[g.axis]}</em>
                {raisedSet.has(`${g.domain}.${g.axis}`)
                  ? <span className="cm-lockmark">경험 반영</span> : null}
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
          <b>지원서에서 바로 쓸 수 있는 근거가 아직 잡히지 않았습니다.</b>
          관심이 높은 영역에서 짧게 한 번 해 보고 그것을 적으면 이 자리가 섭니다.
        </div>
      )}

      {/* ── 3. 더 붙이면 좋은 근거 ── */}
      {m.evidence.partial.length ? (
        <>
          <h2 className="cm-sect">더 붙이면 좋은 근거</h2>
          <div className="cm-grid">
            {m.evidence.partial.slice(0, 4).map((g) => (
              <div className="cm-card" key={`p-${g.domain}.${g.axis}`}>
                <h2>{domainName(g.domain)} <em>{AXIS_KO[g.axis]}</em></h2>
                <p>해 본 것은 확인됐습니다. 여기서 무엇을 직접 정했는지까지
                  적으면 지원서에서 쓸 수 있습니다.</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* ── 4. 아직 비어 있는 자리. 셋이 한 묶음이다 ── */}
      <h2 className="cm-sect" id="gaps">아직 비어 있는 자리</h2>
      {st.gaps.length ? (
        <div className="cm-gaps">
          {st.gaps.slice(0, 6).map((g) => {
            const k = gapKo(g, domainName(g.domain));
            return (
              <article className="cm-gap" key={g.id}>
                <h3>{k.title}</h3>
                <p><b>왜 필요한가</b> {k.why}</p>
                <p><b>무엇을 하면</b> {k.detail}</p>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="cm-lead">
          지금 비어 있는 자리가 잡히지 않았습니다. 남은 일은 가진 근거를
          지원서에서 설명할 문장으로 만드는 것입니다.
        </p>
      )}
      {st.gaps.length ? (
        <div className="cm-acts" style={{ marginTop: 14 }}>
          <Link className="cm-btn" href="/me/next">무엇부터 할지 보기</Link>
        </div>
      ) : null}

      {/* ── 5. 보고 있는 산업과 직무 ── */}
      {m.industry_context || m.role_context ? (
        <>
          <h2 className="cm-sect">보고 있는 산업과 직무</h2>
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
            산업과 직무는 같은 근거를 그쪽 말로 다시 읽어 주는 자리입니다.
            고른 산업이나 직무가 기술영역 판정을 바꾸지는 않습니다.
          </p>
        </>
      ) : null}

      {/* ── 6. 관심 지역과 기관 유형. 기관 수를 적지 않는다 ── */}
      {profile?.home_region || (profile?.target_org?.length ?? 0) > 0 ? (
        <>
          <h2 className="cm-sect">관심 지역과 기관 유형</h2>
          <div className="cm-rows">
            {profile?.home_region ? (
              <p className="cm-row"><b>권역</b>
                <span>
                  {regionName(profile.home_region)}
                  {profile.move_range ? ` · ${moveLabel(profile.move_range)}` : ""}
                </span></p>
            ) : null}
            {profile?.target_org?.length ? (
              <p className="cm-row"><b>기관 유형</b>
                <span>{profile.target_org.map((c) => orgLabel(c)).join(" · ")}</span></p>
            ) : null}
          </div>
          <p className="cm-lead" style={{ marginTop: 10 }}>
            고른 것만 적었습니다. 이 선택이 기술영역 결과를 바꾸지는
            않습니다.
          </p>
          <div className="cm-acts" style={{ marginTop: 12 }}>
            <Link className="cm-btn" href="/me/region">지역과 기관 다시 고르기</Link>
          </div>
        </>
      ) : null}
    </CmShell>
  );
}
