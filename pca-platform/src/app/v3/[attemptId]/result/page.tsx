import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  attemptOf, domainName, industryChoices, latestResult, roleChoices,
} from "@/lib/me-v3/runtime/session";
import type { Axis } from "@/lib/me-v3/scoring/types";
import type { Action, Gap, ResultDomain, ResultModel } from "@/lib/me-v3/result/model";
import {
  actionKo, AXIS_KO, AXIS_STATE_SHORT_KO, AXIS_WHAT_KO, gapKo, headlineKo,
  HORIZON_KO, QUALITY_KO, TIER_NOTE_KO, TRANS_STEP_KO, ZONE_LEAD_KO, ZONE_TITLE_KO,
} from "@/lib/me-v3/result/text.ko";
import { TIER_WHAT } from "../../tier-text";
import "../../result.css";
import Fold from "./fold";

export const metadata = { title: "결과 · CareerMatri" };

const AX: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
const STEP = { NOT_OBSERVED: 0, PARTICIPATED: 1, CONFIRMED: 2, OWNED: 3 } as const;
const ZONE_CLASS: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "z1", Z2_EVIDENCE_INCOMPLETE: "z2",
  Z3_EVIDENCE_LOW_INTEREST: "z3", Z4_INSUFFICIENT_EVIDENCE: "z4",
  NOT_EXPLORED: "z4",
};

/** 고른 항목. **스무 개를 한 줄에 깔면 그 가운데 무엇도 안 읽힌다** */
function Picks(
  { items, own, max = 8 }: { items: string[]; own?: boolean; max?: number },
) {
  if (!items.length) return <span className="rs-none">아직 고른 것이 없습니다</span>;
  const head = items.slice(0, max);
  return (
    <>
      {head.map((t) => <span key={t} className={`rs-pick${own ? " own" : ""}`}>{t}</span>)}
      {items.length > head.length
        ? <span className="rs-more">외 {items.length - head.length}개</span> : null}
    </>
  );
}

/** 여덟 축. **네 칸 가운데 몇 칸인지만 적고 비율을 만들지 않는다** */
function Axes({ d }: { d: ResultDomain }) {
  return (
    <div className="rs-axes">
      {AX.map((ax) => {
        const a = d.axes.find((x) => x.axis === ax)!;
        const on = STEP[a.state];
        return (
          <div key={ax} className={`rs-axis s-${a.state.toLowerCase()}`}>
            <b>{AXIS_KO[ax]}</b>
            <span>{AXIS_WHAT_KO[ax]}</span>
            <span className="rs-step" aria-hidden>
              {[0, 1, 2].map((i) => <i key={i} className={i < on ? "on" : ""} />)}
            </span>
            <span className="state">{AXIS_STATE_SHORT_KO[a.state]}</span>
          </div>
        );
      })}
    </div>
  );
}

const BAND_KO = { HIGH: "높음", MID: "보통", LOW: "낮음" } as const;
const EXP_KO = {
  NONE: "해 본 적 없음", ONCE_OR_TWICE: "한두 번", SEVERAL: "여러 번",
} as const;

/**
 * 여덟 축을 묻지 않은 응시(BASIC)의 영역 한 자리.
 *
 * **안 물어본 것을 `아직 고른 것이 없습니다` 로 적지 않는다.** 근거를 고르는
 * 화면이 없었는데 빈 칸 셋을 띄우면, 읽는 사람은 자기가 빠뜨린 줄 안다.
 * 받은 것만 적는다: 관심과 경험과 배울 뜻.
 */
function Basic({ d }: { d: ResultDomain }) {
  return (
    <div className="rs-why">
      <dl>
        <dt>관심</dt>
        <dd><span className="rs-pick">{d.interest ? BAND_KO[d.interest] : "답하지 않음"}</span></dd>
        <dt>해 본 횟수</dt>
        <dd><span className="rs-pick">{d.experience ? EXP_KO[d.experience] : "답하지 않음"}</span></dd>
        <dt>배울 뜻</dt>
        <dd><span className="rs-pick">{d.learning ? BAND_KO[d.learning] : "답하지 않음"}</span></dd>
      </dl>
    </div>
  );
}

/** 왜 이 결과인가. **해석보다 그 사람이 고른 항목이 큰 자리를 차지한다** */
function Why({ d }: { d: ResultDomain }) {
  const decided = d.decided;
  const did = d.did.filter((x) => !decided.includes(x));
  return (
    <div className="rs-why">
      <dl>
        {decided.length ? (
          <>
            <dt>직접 정한 것</dt>
            <dd><Picks items={decided} own /></dd>
          </>
        ) : null}
        {/* 모두 직접 정한 것으로 확인된 사람에게 빈 칸을 띄우지 않는다.
            없는 문제를 만들어 보이게 된다 */}
        {did.length || !decided.length ? (
          <>
            <dt>해 본 일</dt>
            <dd><Picks items={did} /></dd>
          </>
        ) : null}
        <dt>남긴 것</dt>
        <dd><Picks items={d.artifacts} max={6} /></dd>
        <dt>비교한 것</dt>
        <dd><Picks items={d.verifications} max={6} /></dd>
      </dl>
    </div>
  );
}

function DomainPanel(
  { d, showAxes }: { d: ResultDomain; showAxes: boolean },
) {
  return (
    <article className="rs-domain">
      <header>
        <h3>{domainName(d.code)}</h3>
        <span className={`rs-zone ${ZONE_CLASS[d.zone]}`}>{ZONE_TITLE_KO[d.zone]}</span>
        {showAxes ? (
          <span className="rs-meta">
            확인된 판단 {d.confirmed.length} · 직접 정한 것 {d.owned.length}
          </span>
        ) : null}
      </header>
      {showAxes ? <Why d={d} /> : <Basic d={d} />}
      {showAxes ? (
        <Fold label="여덟 가지 관점 보기"><Axes d={d} /></Fold>
      ) : null}
    </article>
  );
}

function Plan({ actions, gaps }: { actions: Action[]; gaps: Gap[] }) {
  const byGap = new Map(gaps.map((g) => [g.action_id, g]));
  const groups = (["NOW", "NEXT", "LATER"] as const)
    .map((h) => ({ h, list: actions.filter((a) => a.horizon === h) }))
    .filter((g) => g.list.length);
  return (
    <div className="rs-plan">
      {groups.map(({ h, list }) => (
        <section className="rs-when" key={h}>
          <h3>{HORIZON_KO[h]}</h3>
          <ol>
            {list.map((a) => (
              <li key={a.id}>
                <span>{a.domain ? domainName(a.domain) : "전체"}</span>
                <span style={{ width: "auto", flex: 1, fontWeight: 400, color: "inherit", fontSize: "inherit", letterSpacing: 0 }}>
                  {actionKo(a, a.domain ? domainName(a.domain) : "")}
                  {byGap.get(a.id) ? null : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export default async function V3Result({
  params,
}: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  const { attemptId } = await params;
  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();
  if (a.status === "in_progress") redirect(`/v3/${attemptId}`);

  const m = await latestResult(attemptId);
  /* 굳혀 둔 결과가 없으면 다시 만들지 않는다. 다시 만들면 엔진이 바뀐 날
     그 사람의 결과지가 조용히 달라진다 */
  if (!m) notFound();

  const model: ResultModel = m;
  const h = headlineKo(model);
  const tier = TIER_WHAT[model.tier];
  const focus = model.domains.filter((d) => model.overview.focus.includes(d.code));
  const compare = model.domains.filter((d) => model.overview.compare.includes(d.code));
  const deep = model.limits.deep_axes;
  const topGap = model.gaps[0];
  const topAction = model.actions[0];
  const industryName = (c: string) =>
    industryChoices().find((x) => x.code === c)?.name ?? c;
  const roleName = (c: string) => roleChoices().find((x) => x.code === c)?.name ?? c;

  const zoneRows = ([
    "Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE",
    "Z3_EVIDENCE_LOW_INTEREST", "Z4_INSUFFICIENT_EVIDENCE",
  ] as const)
    .filter((z) => !(z === "Z1_EVIDENCE_ESTABLISHED" && !model.limits.allows_evidence_established))
    .map((z) => ({ z, list: model.domains.filter((d) => d.zone === z).map((d) => d.code) }));

  return (
    <div className="rs">
      <header className="rs-head">
        <div className="rs-head-in">
          <span className="rs-brand">CareerMatri</span>
          <span className="rs-tier">{model.tier} · <b>{tier.label}</b></span>
          <nav>
            <a href="#focus">먼저 볼 영역</a>
            <a href="#zones">열두 영역</a>
            {deep ? <a href="#evidence">근거</a> : null}
            <a href="#gaps">채울 것</a>
            <a href="#plan">다음에 할 일</a>
          </nav>
        </div>
      </header>

      <main className="rs-main">
        <section className="rs-hero">
          <p className="rs-kicker">기계공학 진로 진단 결과</p>
          <h1 className="rs-h1">{h.title}</h1>
          <p className="rs-lead">{h.lead}</p>
        </section>

        {/* 열 초 안에 넷을 답한다: 어디부터 · 왜 · 무엇이 비었나 · 다음에 뭘 */}
        <div className="rs-top">
          <div>
            <h3>먼저 볼 영역</h3>
            {focus.length
              ? <p>{focus.map((d) => domainName(d.code)).join(" · ")}</p>
              : <p className="none">아직 앞서는 영역이 없습니다</p>}
            {compare.length
              ? <p>같이 놓고 볼 영역 {compare.map((d) => domainName(d.code)).join(" · ")}</p>
              : null}
          </div>
          <div>
            <h3>그렇게 본 까닭</h3>
            {/* **조사를 문장으로 붙이지 않는다.** 뒤에 오는 것이 응시자가 고른
                항목이라 앞말이 늘 달라지고, 그때마다 `~다을` 이 나온다 */}
            {focus.length ? (deep ? (
              <>
                <p>{domainName(focus[0].code)}에서 직접 정한 것</p>
                <p>{(focus[0].decided.length ? focus[0].decided : focus[0].did)
                  .slice(0, 2).join(" · ") || "해 본 일이 확인됐습니다"}</p>
              </>
            ) : (
              /* 여덟 축을 묻지 않은 응시에서 `직접 정한 것` 을 적지 않는다.
                 받은 것은 관심과 경험과 배울 뜻 셋뿐이다 */
              <>
                <p>{domainName(focus[0].code)}</p>
                <p>{[
                  focus[0].interest === "HIGH" ? "관심이 높고" : "관심이 보통이고",
                  focus[0].experience === "NONE" ? "아직 해 본 적이 없습니다"
                    : "해 본 적이 있습니다",
                ].join(" ")}</p>
              </>
            )) : <p className="none">응답만으로는 영역 사이에 차이가 생기지 않았습니다</p>}
          </div>
          <div>
            <h3>가장 먼저 채울 것</h3>
            {topGap
              ? <p>{gapKo(topGap, domainName(topGap.domain)).title}</p>
              : <p className="none">지금 비어 있는 자리는 없습니다</p>}
          </div>
          <div>
            <h3>다음에 할 일</h3>
            {topAction
              ? <p style={{ fontWeight: 400 }}>
                  {actionKo(topAction, topAction.domain ? domainName(topAction.domain) : "")}
                </p>
              : <p className="none">—</p>}
          </div>
        </div>

        {model.response_quality.flag !== "OK" ? (
          <p className="rs-flag">
            {QUALITY_KO[model.response_quality.flag as keyof typeof QUALITY_KO]}
          </p>
        ) : null}

        {/* ── 먼저 볼 영역 ── 그 영역을 한 자리에서 끝낸다 */}
        <section className="rs-sect" id="focus">
          <h2>먼저 볼 영역</h2>
          <p className="rs-note">
            {focus.length
              ? "아래는 고르신 답에서 확인된 내용을 그대로 적은 것입니다. 우리가 새로 만든 평가가 아닙니다."
              : "지금 응답만으로는 어느 영역이 앞선다고 보기 어렵습니다. 아래 열두 영역을 보시고 한 가지부터 해보세요."}
          </p>
          {focus.map((d) => <DomainPanel key={d.code} d={d} showAxes={deep} />)}
          {compare.length ? (
            <>
              <h2 style={{ marginTop: 56 }}>같이 놓고 볼 영역</h2>
              <p className="rs-note">
                먼저 볼 영역과 같은 상태이거나 바로 다음입니다. 차례를 매기지 않았습니다.
              </p>
              {compare.map((d) => <DomainPanel key={d.code} d={d} showAxes={deep} />)}
            </>
          ) : null}
        </section>

        {/* ── 열두 영역 ── 표 하나로 한눈에. 등수를 매기지 않는다 */}
        <section className="rs-sect" id="zones">
          <h2>열두 기술영역이 지금 어디에 있는가</h2>
          <p className="rs-note">
            등수가 아니라 상태입니다. 같은 묶음 안에서는 차례를 두지 않았습니다.
          </p>
          <div className="rs-zones">
            {zoneRows.map(({ z, list }) => (
              <section key={z}>
                <h3>{ZONE_TITLE_KO[z]}</h3>
                <p>{ZONE_LEAD_KO[z]}</p>
                {list.length
                  ? <ul>{list.map((c) => <li key={c}>{domainName(c)}</li>)}</ul>
                  : <p className="none">해당하는 영역이 없습니다</p>}
              </section>
            ))}
            {model.overview.not_explored.length ? (
              <section>
                <h3>{ZONE_TITLE_KO.NOT_EXPLORED}</h3>
                <p>이번 응시에서 질문하지 않은 영역입니다. 경험이 없다는 뜻이 아닙니다.</p>
                <ul>{model.overview.not_explored.map((c) => <li key={c}>{domainName(c)}</li>)}</ul>
              </section>
            ) : null}
          </div>
        </section>

        {/* ── 근거 세 층 ── */}
        {deep ? (
          <section className="rs-sect" id="evidence">
            <h2>지금 쓸 수 있는 근거</h2>
            <p className="rs-note">
              지원서와 면접에서 바로 설명할 수 있는 것과, 경험은 있지만 설명 재료가
              아직 모자란 것을 갈라 적었습니다.
            </p>
            <div className="rs-ev">
              <section>
                <h3>바로 설명할 수 있는 것</h3>
                <p>직접 정한 것으로 확인됐고, 그 근거가 함께 있는 자리입니다.</p>
                {model.evidence.ready.length ? (<>
                  {model.evidence.ready.slice(0, 6).map((e) => (
                    <div className="row" key={`${e.domain}.${e.axis}`}>
                      <b>{domainName(e.domain)} · {AXIS_KO[e.axis]}</b>
                      <div><Picks items={e.picks} max={4} own /></div>
                    </div>
                  ))}
                  {model.evidence.ready.length > 6 ? (
                    <p className="rs-none" style={{ marginTop: 14 }}>
                      이 밖에 {model.evidence.ready.length - 6}가지가 더 확인됐습니다.
                      위의 영역별 설명에서 보실 수 있습니다.
                    </p>
                  ) : null}
                </>) : <p>아직 없습니다. 아래 &lsquo;다음에 할 일&rsquo;부터 보세요.</p>}
              </section>
              <section>
                <h3>조금 더 보완할 것</h3>
                <p>해 본 것은 확인됐고, 직접 정했다고 보기에는 근거가 모자란 자리입니다.</p>
                {model.evidence.partial.length ? (<>
                  {model.evidence.partial.slice(0, 6).map((e) => (
                    <div className="row" key={`${e.domain}.${e.axis}`}>
                      <b>{domainName(e.domain)} · {AXIS_KO[e.axis]}</b>
                      <div><Picks items={e.picks} max={4} /></div>
                    </div>
                  ))}
                  {model.evidence.partial.length > 6 ? (
                    <p className="rs-none" style={{ marginTop: 14 }}>
                      이 밖에 {model.evidence.partial.length - 6}가지가 더 있습니다.
                    </p>
                  ) : null}
                </>) : <p>해당하는 자리가 없습니다.</p>}
              </section>
            </div>
          </section>
        ) : null}

        {/* ── 비어 있는 자리 ── 빨간 목록으로 만들지 않는다.
            **여덟 축을 묻지 않은 응시에는 이 절을 두지 않는다**: 안 물어본
            것을 `비어 있지 않습니다` 라고 적으면 거짓이 된다 */}
        <section className="rs-sect" id="gaps">
          <h2>앞으로 채울 것</h2>
          <p className="rs-note">
            {!deep
              ? "이번 응시는 어느 쪽부터 살펴볼지를 정하는 데까지입니다. 경험을 자세히 확인하는 질문은 아직 받지 않았습니다."
              : model.gaps.length
                ? "무엇이 비었는지와 그 자리가 왜 필요한지, 다음에 무엇을 하면 되는지를 한 묶음으로 적었습니다."
                : "지금 비어 있는 자리는 없습니다. 아래 \u2018다음에 할 일\u2019 을 보세요."}
          </p>
          {model.gaps.slice(0, 8).map((g) => {
            const k = gapKo(g, domainName(g.domain));
            const act = model.actions.find((x) => x.id === g.action_id);
            return (
              <article className="rs-gap" key={g.id}>
                <h3>{k.title}</h3>
                <p>{k.why}</p>
                {act ? (
                  <p className="rs-do">
                    <b>다음에 이렇게</b>
                    {actionKo(act, domainName(act.domain ?? g.domain))}
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>

        {/* ── 산업과 역할 ── 같은 근거를 그 말로 다시 읽는다 */}
        {model.industry_context ? (
          <section className="rs-sect" id="industry">
            <h2>{industryName(model.industry_context.code)}에서는 이렇게 읽힙니다</h2>
            <p className="rs-note">
              같은 경험을 그 산업에서 쓰는 말로 다시 읽은 것입니다. 적합하다거나
              맞지 않는다고 판정하지 않습니다.
            </p>
            <div className="rs-pack">
              <h3>이 산업에서 특히 자주 묻는 것</h3>
              <p>{model.industry_context.vocabulary.slice(0, 6).join(" · ")}</p>
              <dl>
                <dt>이미 확인된 자리</dt>
                <dd>
                  <Picks items={model.industry_context.established
                    .map((e) => `${domainName(e.domain)} · ${e.axes.slice(0, 3)
                      .map((x) => AXIS_KO[x]).join(", ")}${e.axes.length > 3 ? " 외" : ""}`)} own />
                </dd>
                <dt>아직 비어 있는 자리</dt>
                <dd>
                  <Picks items={model.industry_context.requested.slice(0, 8)
                    .map((r) => `${domainName(r.domain)} · ${AXIS_KO[r.axis]}`)} />
                </dd>
              </dl>
              {model.industry_context.others.length ? (
                <p className="rs-others">
                  다른 산업에서 보시려면 다시 응시하지 않아도 됩니다. 핵심 결과는
                  산업을 바꿔도 그대로입니다.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {model.role_context ? (
          <section className="rs-sect" id="role">
            <h2>{roleName(model.role_context.code)} 역할에서는 이렇게 읽힙니다</h2>
            <p className="rs-note">
              역할을 바꿔도 기술영역 결과는 그대로입니다. 달라지는 것은 같은 경험을
              읽는 순서입니다.
            </p>
            <div className="rs-pack">
              <h3>이 역할이 먼저 보는 판단</h3>
              <p>{model.role_context.explain_order.map((x) => AXIS_KO[x]).join(" · ")}</p>
              <dl>
                <dt>이미 확인된 자리</dt>
                <dd>
                  <Picks items={model.role_context.established
                    .map((e) => `${domainName(e.domain)} · ${e.axes.slice(0, 3)
                      .map((x) => AXIS_KO[x]).join(", ")}${e.axes.length > 3 ? " 외" : ""}`)} own />
                </dd>
                <dt>아직 비어 있는 자리</dt>
                <dd>
                  <Picks items={model.role_context.requested.slice(0, 8)
                    .map((r) => `${domainName(r.domain)} · ${AXIS_KO[r.axis]}`)} />
                </dd>
              </dl>
              {model.role_context.compare_with.length ? (
                <p className="rs-others">
                  같이 놓고 보실 역할 {model.role_context.compare_with
                    .map((c) => roleName(c)).join(" · ")}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ── 연구·프로젝트 번역 ── */}
        {model.translation && model.translation.steps.length ? (
          <section className="rs-sect" id="translation">
            <h2>연구·프로젝트를 직무 언어로</h2>
            <p className="rs-note">
              적어주신 과제 하나를 열 단계로 나눈 것입니다. 지원서와 면접에서
              이 순서로 말하면 됩니다.
            </p>
            <ol className="rs-steps">
              {model.translation.steps.map((s) => (
                <li key={s.item_id}>
                  <span>{TRANS_STEP_KO[s.item_id] ?? s.item_id}</span>
                  <b>{s.choice ?? "적지 않으셨습니다"}</b>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* ── 다음에 할 일 ── */}
        <section className="rs-sect" id="plan">
          <h2>다음에 할 일</h2>
          <p className="rs-note">
            막연한 말 대신 그 영역에서 실제로 할 수 있는 한 걸음으로 적었습니다.
          </p>
          <Plan actions={model.actions} gaps={model.gaps} />
        </section>

        <p className="rs-fine">
          {TIER_NOTE_KO[model.tier]}
          {" "}이 결과는 응답하신 내용에서 확인된 것만 담았습니다. 합격 가능성이나
          순위를 뜻하지 않습니다.
          <br />
          {/* **판본 코드를 화면에 적지 않는다.** 되짚는 자리는 스냅샷이고,
              응시자에게 필요한 것은 이 결과가 고정돼 있다는 사실이다 */}
          이 결과는 응시하신 시점의 문항과 판정 기준으로 고정되어 있습니다.
          나중에 기준이 바뀌어도 이 결과는 달라지지 않습니다.
          <br />
          <Link href="/my">내 검사 목록으로</Link>
        </p>
      </main>
    </div>
  );
}
