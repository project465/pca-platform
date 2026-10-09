import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { mark } from "@/lib/me-v3/workspace-events";
import {
  attemptOf, domainName, industryChoices, latestResult, orgChoices, roleChoices,
} from "@/lib/me-v3/runtime/session";
import { domainArtifacts } from "@/lib/me-v3/runtime/domain-facts";
import type { Axis } from "@/lib/me-v3/scoring/types";
import type {
  Action, Gap, PackView, ResultDomain, ResultModel, TranslationView,
} from "@/lib/me-v3/result/model";
import {
  actionKo, axisStateKo, AXIS_KO, AXIS_WHAT_KO, BASIC_GROUP_KO, bridgeKo,
  commonKo, domainChainKo, draftKo, FIRST_MOVE_KO, gapKo, gapShortKo, headlineKo,
  HORIZON_KO, QUALITY_KO, TIER_NOTE_KO, TRANS_ORDER, TRANS_STEP_KO, XFIELD_KO,
  XFIELD_ORDER, ZONE_LEAD_KO, ZONE_TITLE_KO,
} from "@/lib/me-v3/result/text.ko";
import { orgTypesFor, regionLayer } from "@/lib/me-v3/region";
import { profileOf } from "@/lib/me-v3/platform";
import { participantOf, savedActions } from "@/lib/me-v3/pilot/store";
import ResultNav from "./result-nav";
import { TIER_WHAT } from "../../tier-text";
import "../../result.css";
import Disclose from "./disclose";
import Fold from "./fold";
import SaveAction from "./save";
import Track from "./track";

export const metadata = { title: "결과 · CareerMatri" };

const AX: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
const ZONE_CLASS: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "z1", Z2_EVIDENCE_INCOMPLETE: "z2",
  Z3_EVIDENCE_LOW_INTEREST: "z3", Z4_INSUFFICIENT_EVIDENCE: "z4",
  NOT_EXPLORED: "z4",
};
const BASIC_GROUPS = ["do_now", "scan", "low", "unseen"] as const;

/**
 * 산업과 직무 절의 본문.
 *
 * **두 절이 같은 함수를 쓴다.** 전에는 산업과 직무가 거의 같은 markup 을
 * 두 벌 들고 있었고, 한쪽에 줄을 더하면 다른 쪽이 조용히 뒤처졌다. 갈리는
 * 것은 머리글과 한 줄짜리 설명과 끝의 안내뿐이다.
 */
function PackBody(
  { v, name, domainName: dn, action, say }: {
    v: PackView; name: string;
    domainName: (c: string) => string;
    action: Action | null;
    say: (a: Action) => string;
  },
) {
  const cell = (d: string | null, ax: Axis | null) =>
    [d ? dn(d) : null, ax ? AXIS_KO[ax] : null].filter(Boolean).join(" · ")
      || "이 자리에서 맡는 범위";
  const uniq = (xs: string[]) => [...new Set(xs)].slice(0, 8);
  return (
    <div className="rs-pack">
      <h3>이 자리에서 자주 묻는 것</h3>
      <p>{v.vocabulary.slice(0, 6).join(" · ")}</p>
      <dl>
        {/* **둘 다 확인된 자리를 맨 위에 둔다.** 기술영역에서도 확인됐고
            이 자리가 묻는 말로도 확인된 경험이라, 지원서에서 가장 먼저 쓸
            수 있다 */}
        {v.overlap.length ? (
          <div>
            <dt>기술영역과 {name} 양쪽에서 확인된 경험</dt>
            <dd><Picks items={uniq(v.overlap.map((o) => cell(o.domain, o.axis)))} own /></dd>
          </div>
        ) : null}
        <div>
          <dt>기술영역 결과에서 확인된 경험</dt>
          <dd>
            <Picks items={v.established.map((e) =>
              `${dn(e.domain)} · ${e.axes.slice(0, 3).map((x) => AXIS_KO[x]).join(", ")}`
              + `${e.axes.length > 3 ? " 외" : ""}`)} own />
          </dd>
        </div>
        {v.answered.length ? (
          <div>
            <dt>{name} 문항에서 확인된 판단</dt>
            <dd><Picks items={uniq(v.answered.map((a) => cell(a.domain, a.axis)))} own /></dd>
          </div>
        ) : null}
        {/* **`없다` 로 답하신 자리와 안 물어본 자리를 가른다.** 한 칸에
            담으면 묻지 않은 것이 `없다` 로 적힌다 */}
        {v.not_yet.length ? (
          <div>
            <dt>{name} 문항에서 아직 없다고 답하신 판단</dt>
            <dd><Picks items={uniq(v.not_yet.map((a) => cell(a.domain, a.axis)))} /></dd>
          </div>
        ) : null}
        <div>
          <dt>여기서 한 번 더 확인하는 경험</dt>
          <dd>
            <Picks items={v.requested.slice(0, 8)
              .map((r) => `${dn(r.domain)} · ${AXIS_KO[r.axis]}`)} />
          </dd>
        </div>
        {v.domains.length ? (
          <div>
            <dt>관련된 기술영역</dt>
            <dd>{v.domains.map((c) => dn(c)).join(" · ")}</dd>
          </div>
        ) : null}
      </dl>
      {/* **절마다 다음 한 걸음으로 닫는다.** 확인된 것과 비어 있는 것만
          적고 끝내면 읽는 사람이 그래서 무엇을 하라는 것인지 모른다 */}
      {action ? (
        <p className="rs-do">
          <b>다음에 만들 근거</b>
          {say(action)}
        </p>
      ) : null}
    </div>
  );
}

/** 고른 항목. **스무 개를 한 줄에 깔면 그 가운데 무엇도 안 읽힌다** */
function Picks(
  { items, own, max = 8, none = "아직 고른 것이 없습니다" }:
  { items: string[]; own?: boolean; max?: number; none?: string },
) {
  if (!items.length) return <span className="rs-none">{none}</span>;
  const head = items.slice(0, max);
  return (
    <>
      {head.map((t) => <span key={t} className={`rs-pick${own ? " own" : ""}`}>{t}</span>)}
      {items.length > head.length
        ? <span className="rs-more">외 {items.length - head.length}개</span> : null}
    </>
  );
}

/**
 * 여덟 축.
 *
 * **칸 셋에 색을 채우지 않는다.** 네 상태 가운데 몇 번째인지를 칸으로
 * 그리면 `3점 가운데 2점` 으로 읽히고, 그다음에는 평균과 합계를 찾는다.
 * 재는 것은 점수가 아니라 누가 정했는지라서, 주인공은 문장 쪽이다.
 */
function Axes({ d }: { d: ResultDomain }) {
  return (
    <ul className="rs-axes">
      {AX.map((ax) => {
        const a = d.axes.find((x) => x.axis === ax)!;
        return (
          <li key={ax} className={`rs-axis s-${a.state.toLowerCase()}`}>
            <p className="rs-axis-s">{axisStateKo(ax, a.state)}</p>
            <p className="rs-axis-q">{AXIS_WHAT_KO[ax]}</p>
          </li>
        );
      })}
    </ul>
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
  const chain = domainChainKo(d.code);
  const made = domainArtifacts(d.code);
  return (
    <>
      <div className="rs-why rs-why3">
        <dl>
          <dt>관심</dt>
          <dd><span className="rs-pick">{d.interest ? BAND_KO[d.interest] : "답하지 않음"}</span></dd>
          <dt>해 본 횟수</dt>
          <dd><span className="rs-pick">{d.experience ? EXP_KO[d.experience] : "답하지 않음"}</span></dd>
          <dt>배울 뜻</dt>
          <dd><span className="rs-pick">{d.learning ? BAND_KO[d.learning] : "답하지 않음"}</span></dd>
        </dl>
      </div>
      {/* **아직 해 보지 않은 사람에게 가장 먼저 필요한 것.** 어느 쪽부터
          보라는 말만으로는 무엇을 향해 가는지 알 수 없다. 이 영역이 일하는
          차례와 흔히 남기는 결과물이 보이면, 짧은 과제 하나도 겨냥할
          자리가 생긴다. 응답에서 온 값이 아니라 **영역 설명**이다 */}
      {chain.length ? (
        <div className="rs-intro">
          <dl>
            <dt>이 영역이 일하는 차례</dt>
            <dd>{chain.join(" → ")}</dd>
            {made.length ? (<>
              <dt>흔히 남기는 결과물</dt>
              <dd>{made.join(" · ")}</dd>
            </>) : null}
          </dl>
        </div>
      ) : null}
    </>
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
        {/* **네 축만 물은 응시에 묶음 딱지를 붙이지 않는다.** 딱지에
            `근거를 더 만들어야 하는 영역` 이 적혀 있어서, 근거를 묻지 않은
            응시에 그대로 붙이면 재지 않은 것을 판정으로 적는 셈이다 */}
        {showAxes ? (<>
          <span className={`rs-zone ${ZONE_CLASS[d.zone]}`}>{ZONE_TITLE_KO[d.zone]}</span>
          <span className="rs-meta">
            확인된 판단 {d.confirmed.length} · 직접 정한 것 {d.owned.length}
          </span>
        </>) : null}
      </header>
      {showAxes ? <Why d={d} /> : <Basic d={d} />}
      {showAxes ? (
        <Fold label="여덟 가지 관점 보기"><Axes d={d} /></Fold>
      ) : null}
    </article>
  );
}

/**
 * 근거 한 줄.
 *
 * **판단과 근거를 같은 층에 두지 않는다.** 축 이름과 그 사람이 고른 항목이
 * 같은 모양의 알약으로 섞여 있으면, 어느 쪽이 우리 판단이고 어느 쪽이
 * 자기 답인지 구별되지 않는다. 위에 문장, 아래에 그 사람의 글자다.
 */
function EvidenceRow(
  { domain, axis, state, picks, own }: {
    domain: string; axis: Axis;
    state: Parameters<typeof axisStateKo>[1];
    picks: string[]; own?: boolean;
  },
) {
  return (
    <div className="row">
      <p className="judge">
        <b>{domainName(domain)}</b>
        {" — "}{axisStateKo(axis, state)}
      </p>
      <div className="keys">
        <span className="rs-keylabel">고르신 항목</span>
        {/* **`아직 고른 것이 없습니다` 를 여기 그대로 쓰지 않는다.** 바로
            위에 `확인됐습니다` 가 적혀 있어서 두 줄이 서로를 부순다.
            이 자리에서 비어 있다는 것은 **설명할 재료가 없다**는 뜻이다 */}
        <Picks items={picks} max={4} own={own}
          none="고르신 근거 항목이 없어, 지금은 설명할 재료가 없습니다" />
      </div>
    </div>
  );
}

function Plan(
  { actions, stage, attemptId, saved }: {
    actions: Action[]; stage: ResultModel["stage"];
    /** 파일럿 참가자일 때만 담아두기 단추가 선다 */
    attemptId: string; saved: string[] | null;
  },
) {
  const groups = (["NOW", "NEXT", "LATER"] as const)
    .map((h) => ({ h, list: actions.filter((a) => a.horizon === h) }))
    .filter((g) => g.list.length);
  return (
    <div className="rs-plan">
      {groups.map(({ h, list }) => (
        <section className="rs-when" key={h}>
          <h3>{HORIZON_KO[h]}</h3>
          <ol>
            {(() => {
              /* **같은 덧말을 줄마다 되풀이하지 않는다.** 학위에 따라 붙는
                 줄은 한 사람에게 늘 같아서, 세 줄이면 세 번 똑같이 적힌다.
                 처음 나올 때 한 번만 적고 그다음부터는 줄인다 */
              let last = "";
              return list.map((a) => {
                const t = actionKo(a, a.domain ? domainName(a.domain) : "", stage);
                const note = t.note && t.note !== last ? t.note : "";
                if (t.note) last = t.note;
                return (
                  <li key={a.id} data-action-id={a.id}>
                    <span>{a.domain ? domainName(a.domain) : "전체"}</span>
                    <div className="rs-doit">
                      <b>{t.do}</b>
                      {note ? <i>{note}</i> : null}
                    </div>
                    {saved ? (
                      <SaveAction attemptId={attemptId} actionId={a.id}
                        saved={saved.includes(a.id)} />
                    ) : null}
                  </li>
                );
              });
            })()}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * 적어주신 과제를 지원서에서 말하는 차례로 돌려 놓는다.
 *
 * **이름 없는 단계를 세우지 않는다.** 번역표에 없는 문항이 들어오면 문항
 * 번호가 그대로 화면과 종이에 나갔다(`TR_TAG_1`). 응시자에게 문항 번호를
 * 보여 줄 자리는 하나도 없어서, 여기서는 아예 줄을 만들지 않는다.
 */
function Translation({ view }: { view: TranslationView }) {
  /* 열 단계만 세운다. 꼬리표(`TR_TAG_*`)는 이야기의 한 마디가 아니다 */
  const rows = TRANS_ORDER
    .map((id) => view.steps.find((s) => s.item_id === id))
    .filter((s): s is TranslationView["steps"][number] => !!s && !!TRANS_STEP_KO[s.item_id]);
  /* 타계열 대학원 맥락. **열 단계가 없어도 이 절을 세운다**: 적어 주신 것이
     어디로도 가지 않으면 받고 쓰지 않은 응답이 된다 */
  const xf = XFIELD_ORDER
    .map((id) => view.xfield.find((x) => x.item_id === id))
    .filter((x): x is TranslationView["xfield"][number] => !!x && !!XFIELD_KO[x.item_id]);
  if (!rows.length && !xf.length) return null;
  const draft = draftKo(view.steps);
  return (
    <section className="rs-sect" id="translation">
      <h2>연구·프로젝트를 직무 언어로</h2>
      <p className="rs-note">
        적어주신 과제를 지원서와 면접에서 말하는 차례로 나눴습니다.
      </p>
      {/* **대학원 전공이 다른 분의 경험을 기계공학 판단으로 세지 않는다.**
          여기 적는 것은 그 경험을 직무 말로 옮길 때 읽는 맥락이고, 위의
          영역별 판정에는 한 글자도 들어가지 않는다 */}
      {xf.length ? (
        <div className="rs-pack">
          <h3>대학원 경험을 어디에 걸칠지</h3>
          <p>
            학부에서 기계공학을 하시고 대학원은 다른 분야를 하셨다고 답해주셨습니다.
            대학원 경험은 기계공학 영역 확인과 따로 보고, 아래 번역에서 읽었습니다.
          </p>
          <dl>
            {xf.map((x) => (
              <div key={x.item_id}>
                <dt>{XFIELD_KO[x.item_id]}</dt>
                <dd>{x.choice}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {rows.length ? (
      <ol className="rs-steps">
        {rows.map((s) => (
          <li key={s.item_id}>
            <span>{TRANS_STEP_KO[s.item_id]}</span>
            <b>{s.choice ?? "적지 않으셨습니다"}</b>
          </li>
        ))}
      </ol>
      ) : null}
      {draft.length >= 3 ? (
        <div className="rs-draft">
          <h3>지원서에서 이렇게 묶어볼 수 있습니다</h3>
          <p>{draft.join(" ")}</p>
          <p className="rs-note">
            고르신 답을 차례대로 이은 것입니다. 수치와 결과는 직접 채워주세요.
          </p>
        </div>
      ) : null}
    </section>
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

  /* **파일럿 참가자에게만 재는 자리가 선다.** 모두를 재면 그것은
     파일럿이 아니라 추적이다 */
  const pilot = await participantOf(user.id);
  const saved = pilot ? await savedActions(attemptId) : null;
  /* 희망 지역은 **굳은 결과가 아니라 지금 값**이다. 결과지가 바뀌는 것이
     아니라 이 절이 그 권역 기준으로 읽힌다 */
  const profile = await profileOf(user.id);
  const regionPicked = profile?.home_region
    ? regionLayer().regions.find((r) => r.code === profile.home_region)?.name ?? null
    : null;

  /* **결과를 열었다는 것만 센다.** 어느 절을 얼마나 읽었는지는 재지
     않는다. 그것을 재려면 화면에 코드를 심어야 하고, 그러면 파일럿
     참가자와 일반 응시자가 다른 화면을 받는다 */
  await mark("result_opened", user.id, { tier: m.tier });

  const model: ResultModel = m;
  const h = headlineKo(model);
  const tier = TIER_WHAT[model.tier];
  const focus = model.domains.filter((d) => model.overview.focus.includes(d.code));
  const compare = model.domains.filter((d) => model.overview.compare.includes(d.code));
  const deep = model.limits.deep_axes;
  const stage = model.stage;
  const counts = model.overview.counts;
  const industryName = (c: string) =>
    industryChoices().find((x) => x.code === c)?.name ?? c;
  const roleName = (c: string) => roleChoices().find((x) => x.code === c)?.name ?? c;
  const say = (x: Action) => actionKo(x, x.domain ? domainName(x.domain) : "", stage).do;
  const gapTile = (g: Gap) => gapShortKo(g, domainName(g.domain));

  /**
   * 첫 화면 세 번째 칸.
   *
   * 모델이 정한 차례를 그대로 읽는다: 비어 있는 자리 → (없으면) 정리할 것
   * → (깊게 묻지 않았으면) 지금 해볼 것. **`비어 있는 자리가 없다` 를
   * `더 할 것이 없다` 로 바꿔 적지 않는다.**
   */
  const move = model.overview.first_move;
  const writeUp = model.actions.find((x) => x.code === "WRITE_UP");
  const topGap = model.gaps[0];
  const moveOf = (): { text: string; usedId: string | null } => {
    if (move === "FILL_GAP" && topGap) return { text: gapTile(topGap), usedId: topGap.action_id };
    if (move === "WRITE_UP" && writeUp) return { text: say(writeUp), usedId: writeUp.id };
    const first = model.actions[0];
    if (first) return { text: say(first), usedId: first.id };
    return { text: "응답이 적어 다음 걸음까지 적지 못했습니다.", usedId: null };
  };
  const { text: moveText } = moveOf();

  /**
   * 첫 화면 둘째 칸. **보고 있는 산업과 직무를 기준으로 적는다.**
   *
   * 고르신 산업·직무가 있으면 그쪽에서 한 번 더 확인하는 자리를 적고,
   * 없으면 Core 에서 비어 있는 자리를 적는다. **없는 것을 지어내지
   * 않는다**: 둘 다 없으면 그 사실을 적는다.
   */
  const packLack = model.industry_context ?? model.role_context;
  const packLackName = model.industry_context
    ? industryName(model.industry_context.code)
    : model.role_context ? roleName(model.role_context.code) : null;
  const lackTitle = packLackName
    ? `${packLackName} 쪽에서 비어 있는 것` : "아직 비어 있는 것";
  const lackText = packLack && packLack.requested.length
    ? packLack.requested.slice(0, 2)
      .map((r) => `${domainName(r.domain)} · ${AXIS_KO[r.axis]}`).join(" · ")
    : topGap ? gapTile(topGap) : "";

  const zoneRows = ([
    "Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE",
    "Z3_EVIDENCE_LOW_INTEREST", "Z4_INSUFFICIENT_EVIDENCE",
  ] as const)
    .filter((z) => !(z === "Z1_EVIDENCE_ESTABLISHED" && !model.limits.allows_evidence_established))
    .map((z) => ({ z, list: model.domains.filter((d) => d.zone === z).map((d) => d.code) }));
  const bg = model.overview.basic_groups;
  /* 영역에 걸치지 않는 판단. **열두 영역에 넣지 않는다**: 기술영역을 묻지
     않은 자리라 영역별 판정과 섞이면 안 된다 */
  const cm = commonKo(model.common);
  const orgName = (c: string) => orgChoices().find((x) => x.code === c)?.name ?? c;
  const orgKinds = [...new Set(model.targets.orgs
    .flatMap((oc) => orgTypesFor(oc).map((o) => o.label)))];
  const goal = model.targets.goal;
  /* 넷이 모이면 물어볼 수 있는 것. **자료가 0줄이어도 열쇠는 보여 준다**:
     무엇이 모이면 답이 나오는지 알아야 비어 있는 것이 아직으로 읽힌다 */
  const exploreKey: [string, string][] = [
    ["산업", model.industry_context ? industryName(model.industry_context.code)
      : (model.targets.industries.map(industryName).join(" · ") || "아직 없음")],
    ["직무", model.role_context ? roleName(model.role_context.code)
      : (model.targets.roles.map(roleName).join(" · ") || "아직 없음")],
    ["권역", regionPicked ?? "아직 고르지 않으셨습니다"],
    ["기관 유형", orgKinds.join(" · ") || "아직 고르지 않으셨습니다"],
  ];

  return (
    <div className="rs">
      {pilot ? <Track attemptId={attemptId} /> : null}
      <header className="rs-head">
        <div className="rs-head-in">
          {/* **돌아가는 길을 머리에 둔다.** 전에는 맨 아래에만 있어서,
              작업공간에서 결과지로 들어온 사람이 끝까지 내려가야 돌아갈
              수 있었다. 종이에서는 이 줄이 찍히지 않는다(`.rs-back`) */}
          <Link className="rs-back" href="/me">내 CareerMatri</Link>
          <span className="rs-tier">{tier.label}</span>
          <nav>
            <a href="#focus">먼저 볼 영역</a>
            <a href="#zones">열두 영역</a>
            {deep ? <a href="#evidence">근거</a> : null}
            {deep ? <a href="#gaps">채울 것</a> : null}
            <a href="#plan">다음에 할 일</a>
          </nav>
        </div>
      </header>

      <main className="rs-main">
        <section className="rs-hero">
          <p className="rs-kicker">기계공학 진로 진단 결과</p>
          <h1 className="rs-h1">{h.title}</h1>
          <p className="rs-lead">{h.lead}</p>
          {/* **첫 서른 초에 무엇까지 봤는지가 보여야 한다.** 깊게 물은
              응시에서만 센 숫자라, 네 축만 물은 응시에는 두지 않는다 */}
          {/* **종이로 가는 길을 결과 안에 둔다.** 전에는 스크립트로만
              뽑혔고, 사업주가 직접 눌러 볼 자리가 없었다. 웹과 종이가 같은
              결과 모델을 읽으므로 둘의 판단이 갈리지 않는다 */}
          <p className="rs-pdf">
            <a href={`/v3/${attemptId}/result/pdf`}>결과 PDF 저장</a>
            <small>만드는 데 몇 초 걸립니다</small>
          </p>
          {deep ? (
            <ul className="rs-count">
              <li><b>{counts.confirmed_axes}</b>직접 해 본 것으로 확인된 판단</li>
              <li><b>{counts.owned_axes}</b>직접 정한 것으로 확인된 판단</li>
              <li><b>{counts.evidence_items}</b>근거로 고르신 항목</li>
            </ul>
          ) : null}
        </section>

        {/* 열 초 안에 셋을 답한다: 어디부터 · 왜 · 지금 무엇을 */}
        {/* ── 첫 화면 세 칸 ──
            **읽는 사람이 열 초 안에 답해야 하는 것이 셋이다**: 지금 무엇이
            확인됐는가 · 보고 있는 산업과 직무에서 무엇이 비어 있는가 · 지금
            무엇을 하면 되는가. 전에는 넷이었고 둘째 칸이 `그렇게 본 까닭`
            이었다. 까닭은 아래 영역 절이 한 자리에서 말하므로, 첫 화면의
            자리는 **비어 있는 것**에 내준다 */}
        <div className="rs-top">
          <div>
            <h3>지금 확인된 것</h3>
            {focus.length ? (<>
              <p>{focus.map((d) => domainName(d.code)).join(" · ")}</p>
              {deep ? (
                <p style={{ fontWeight: 400 }}>
                  {(focus[0].decided.length ? focus[0].decided : focus[0].did)
                    .slice(0, 2).join(" · ") || "해 본 일이 확인됐습니다"}
                </p>
              ) : (
                /* 여덟 축을 묻지 않은 응시에서 `직접 정한 것` 을 적지 않는다.
                   받은 것은 관심과 경험과 배울 뜻 셋뿐이다 */
                <p style={{ fontWeight: 400 }}>
                  {focus[0].interest === "HIGH" ? "관심이 높고 " : "관심이 보통이고 "}
                  {focus[0].experience === "NONE" ? "아직 해 본 적이 없습니다"
                    : "해 본 적이 있습니다"}
                </p>
              )}
            </>) : <p className="none">응답만으로는 영역 사이에 차이가 생기지 않았습니다</p>}
          </div>
          <div>
            <h3>{lackTitle}</h3>
            {lackText
              ? <p>{lackText}</p>
              : <p className="none">지금 응답에서 비어 있다고 적을 자리가 없습니다</p>}
          </div>
          <div>
            <h3>{FIRST_MOVE_KO[move]}</h3>
            <p>{moveText}</p>
          </div>
        </div>

        {model.response_quality.flag !== "OK" ? (
          <p className="rs-flag">
            {QUALITY_KO[model.response_quality.flag as keyof typeof QUALITY_KO]}
          </p>
        ) : null}

        <ResultNav />

        {/* ── 먼저 볼 영역 ── 그 영역을 한 자리에서 끝낸다 */}
        <section className="rs-sect" id="focus">
          <h2>먼저 볼 영역</h2>
          <p className="rs-note">
            {focus.length
              ? "응답에서 확인된 내용만 정리했습니다."
              : "지금 응답만으로는 어느 영역이 앞선다고 보기 어렵습니다. 아래 열두 영역을 보시고 한 가지부터 해보세요."}
          </p>
          {focus.map((d) => <DomainPanel key={d.code} d={d} showAxes={deep} />)}
          {compare.length ? (
            <>
              <h2 className="rs-h2b">같이 놓고 볼 영역</h2>
              <p className="rs-note">
                먼저 볼 영역과 같은 상태이거나 바로 다음입니다. 차례를 매기지 않았습니다.
              </p>
              {compare.map((d) => <DomainPanel key={d.code} d={d} showAxes={deep} />)}
            </>
          ) : null}
        </section>

        {/* ── 열두 영역 ──
            **네 축만 물은 응시에 근거 묶음을 보여주지 않는다.** 묶음 이름에
            `근거를 더 만들어야 하는 영역` 이 들어 있어서, 근거를 묻지 않은
            응시에 그대로 세우면 재지 않은 것을 판정으로 적는 셈이다 */}
        <section className="rs-sect" id="zones">
          <h2>열두 기술영역이 지금 어디에 있는가</h2>
          <p className="rs-note">
            {deep
              ? "순위가 아니라 현재 상태를 보여드립니다."
              : "관심과 배울 뜻에 답하신 내용으로만 묶었습니다."}
          </p>
          <div className="rs-zones">
            {deep ? zoneRows.filter((r) => r.list.length).map(({ z, list }) => (
              <section key={z}>
                <h3>{ZONE_TITLE_KO[z]}</h3>
                <p>{ZONE_LEAD_KO[z]}</p>
                <ul>{list.map((c) => <li key={c}>{domainName(c)}</li>)}</ul>
              </section>
            )) : BASIC_GROUPS.filter((k) => (bg?.[k].length ?? 0) > 0).map((k) => (
              <section key={k}>
                <h3>{BASIC_GROUP_KO[k].title}</h3>
                <p>{BASIC_GROUP_KO[k].lead}</p>
                {/* **이름만 늘어놓으면 고를 수가 없다.** `동역학·진동·NVH`
                    가 무슨 일인지 모르는 사람에게 영역 이름 열둘은 고를
                    거리가 아니라 외울 거리다. 해 볼지 말지 정하라고 적은
                    두 묶음에는 그 영역이 일하는 차례를 한 줄씩 붙인다 */}
                {k === "do_now" || k === "scan" ? (
                  <ul className="rs-rows">
                    {bg![k].map((c) => (
                      <li key={c}>
                        <b>{domainName(c)}</b>
                        <span>{domainChainKo(c).join(" → ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul>{bg![k].map((c) => <li key={c}>{domainName(c)}</li>)}</ul>
                )}
              </section>
            ))}
            {/* **빈 묶음마다 한 자리씩 내주지 않는다.** 근거가 고르게 선
                사람에게는 빈 묶음이 셋이고, 그 셋이 `해당하는 영역이
                없습니다` 로 종이 한 쪽을 가져갔다. 한 줄로 모은다 */}
            {deep && zoneRows.some((r) => !r.list.length) ? (
              <p className="rs-zempty">
                {zoneRows.filter((r) => !r.list.length)
                  .map((r) => ZONE_TITLE_KO[r.z]).join(" · ")}
                {" — 해당하는 영역이 없습니다"}
              </p>
            ) : null}
            {deep && model.overview.not_explored.length ? (
              <section>
                <h3>{ZONE_TITLE_KO.NOT_EXPLORED}</h3>
                <p>이번 응시에서 묻지 않은 영역입니다. 경험이 없다는 뜻이 아닙니다.</p>
                <ul>{model.overview.not_explored.map((c) => <li key={c}>{domainName(c)}</li>)}</ul>
              </section>
            ) : null}
          </div>
          {/* **고르신 쪽을 돌려드린다.** 격자에 고르게 답하신 분께는
              `차이가 없습니다` 만 남는데, 그 분이 묶인 둘 가운데 한쪽을
              두 번 고르셨다. 차례로 적지 않고 고른 것으로 적는다 */}
          {model.overview.tied_pick.length ? (
            <p className="rs-zempty">
              {`영역 훑기에서 같은 값으로 답하신 둘을 놓고 ${model.overview.tied_pick
                .map((c) => domainName(c)).join(" · ")} 쪽을 고르셨습니다. `}
              위의 묶음은 그 선택과 상관없이 응답에서 나온 것입니다.
            </p>
          ) : null}
          {/* **영역에 걸치지 않는 판단을 버리지 않는다.** 공통 판단과 학위
              묶음은 기술영역이 없어서 위의 열두 영역에 들어갈 자리가 없다.
              그렇다고 떨어뜨리면 박사와 포닥이 가장 많이 답한 자리가 결과지에
              한 글자도 나오지 않는다 */}
          {cm.owned.length || cm.confirmed.length ? (
            <div className="rs-pack">
              <h3>영역을 가리지 않고 확인된 판단</h3>
              <p>
                어느 기술영역에서 한 일인지는 묻지 않은 자리입니다. 위의 영역별
                판정에는 들어가지 않습니다.
              </p>
              <dl>
                {cm.owned.length ? (
                  <div>
                    <dt>직접 정한 것으로 확인</dt>
                    <dd>{cm.owned.join(" · ")}</dd>
                  </div>
                ) : null}
                {cm.confirmed.length ? (
                  <div>
                    <dt>해 본 것으로 확인</dt>
                    <dd>{cm.confirmed.join(" · ")}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </section>

        {/* ── 근거 두 층 ── */}
        {deep ? (
          <section className="rs-sect" id="evidence">
            <h2>지원서에 연결할 수 있는 경험</h2>
            <p className="rs-note">
              정리해두면 바로 꺼내 쓸 수 있는 쪽과, 설명 근거를 한 줄 더 붙여야
              하는 쪽을 갈라 적었습니다.
            </p>
            <div className="rs-ev">
              <section>
                <h3>정리해두면 바로 쓸 수 있는 경험</h3>
                <p>직접 정한 것으로 확인됐고, 고르신 근거가 함께 있는 자리입니다.</p>
                {model.evidence.ready.length ? (<>
                  {model.evidence.ready.slice(0, 6).map((e) => (
                    <EvidenceRow key={`${e.domain}.${e.axis}`} domain={e.domain}
                      axis={e.axis} state={e.state} picks={e.picks} own />
                  ))}
                  {model.evidence.ready.length > 6 ? (
                    <p className="rs-none rs-evmore">
                      이 밖에 {model.evidence.ready.length - 6}가지가 더 확인됐습니다.
                      위의 영역별 설명에서 보실 수 있습니다.
                    </p>
                  ) : null}
                </>) : <p>아직 없습니다. 아래 &lsquo;다음에 할 일&rsquo;부터 보세요.</p>}
              </section>
              <section>
                <h3>경험은 있지만 설명 근거를 더 붙일 부분</h3>
                <p>해 본 것은 확인됐고, 어디까지 직접 정했는지가 덜 적힌 자리입니다.</p>
                {model.evidence.partial.length ? (<>
                  {model.evidence.partial.slice(0, 6).map((e) => (
                    <EvidenceRow key={`${e.domain}.${e.axis}`} domain={e.domain}
                      axis={e.axis} state={e.state} picks={e.picks} />
                  ))}
                  {model.evidence.partial.length > 6 ? (
                    <p className="rs-none rs-evmore">
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
        {deep ? (
          <section className="rs-sect" id="gaps">
            <h2>앞으로 채울 것</h2>
            <p className="rs-note">
              {model.gaps.length
                ? "무엇이 비었는지와 그 자리가 왜 필요한지, 다음에 무엇을 하면 되는지를 한 묶음으로 적었습니다."
                : "완전히 비어 있는 축은 없습니다. 남은 일은 확인된 경험을 설명 문장으로 만드는 쪽입니다."}
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
                      {say(act)}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : null}

        {/* ── 산업과 역할 ──
            같은 근거를 그 말로 다시 읽는다. **설명을 한 번 더 하지 않는다**:
            제목이 이미 `연결하면` 이라고 말하고 있다 */}
        {model.industry_context ? (
          <section className="rs-sect" id="industry">
            {/* **산업을 직무라고 적지 않는다.** 반도체는 산업이고 설계는
                직무다. 한 말로 적으면 둘의 층이 같아 보인다 */}
            <h2>{industryName(model.industry_context.code)} 쪽에 연결하면</h2>
            {/* **네 카드를 한 이야기로 잇는다.** 확인된 것 → 이 산업을
                보려면 모자란 것 → 다음에 할 일이 한 문단이다. 전에는 넷이
                따로 서서, 네 번 읽고도 `그래서 무엇이 더 필요한가` 가 한
                문장으로 서지 않았다 */}
            <p className="rs-bridge">
              {bridgeKo(model.industry_context,
                industryName(model.industry_context.code), domainName,
                model.actions.find((a) => model.industry_context?.requested
                  .some((r) => r.domain === a.domain)) ?? model.actions[0] ?? null,
                model.stage).join(" ")}
            </p>
            <p className="rs-note">
              같은 경험을 {industryName(model.industry_context.code)}에서 쓰는
              표현으로 놓았습니다. 맞는다거나 맞지 않는다고 판정하지 않습니다.
            </p>
            <PackBody v={model.industry_context}
              name={industryName(model.industry_context.code)}
              domainName={domainName} say={say}
              action={model.actions.find((a) => model.industry_context?.requested
                .some((r) => r.domain === a.domain)) ?? model.actions[0] ?? null} />
            {model.industry_context.others.length ? (
              <p className="rs-others">
                다른 산업에서 보시려면 다시 응시하지 않아도 됩니다. 기술영역
                결과는 산업을 바꿔도 그대로입니다.
              </p>
            ) : null}
          </section>
        ) : null}

        {model.role_context ? (
          <section className="rs-sect" id="role">
            <h2>{roleName(model.role_context.code)} 직무에 연결하면</h2>
            <p className="rs-bridge">
              {bridgeKo(model.role_context, roleName(model.role_context.code),
                domainName,
                model.actions.find((a) => model.role_context?.requested
                  .some((r) => r.domain === a.domain)) ?? model.actions[0] ?? null,
                model.stage).join(" ")}
            </p>
            <p className="rs-note">
              같은 경험을 {roleName(model.role_context.code)}에서 먼저 읽는 차례로
              놓았습니다. 기술영역 결과는 그대로입니다.
            </p>
            <p className="rs-note">
              이 직무가 먼저 보는 판단 {model.role_context.explain_order
                .map((x) => AXIS_KO[x]).join(" · ")}
            </p>
            <PackBody v={model.role_context}
              name={roleName(model.role_context.code)}
              domainName={domainName} say={say}
              action={model.actions.find((a) => model.role_context?.requested
                .some((r) => r.domain === a.domain)) ?? model.actions[0] ?? null} />
            {model.role_context.compare_with.length ? (
              <p className="rs-others">
                같이 놓고 보실 직무 {model.role_context.compare_with
                  .map((c) => roleName(c)).join(" · ")}
              </p>
            ) : null}
          </section>
        ) : null}

        {model.translation ? <Translation view={model.translation} /> : null}

        {/* ── 다음에 할 일 ── */}
        <section className="rs-sect" id="plan">
          <h2>다음에 할 일</h2>
          {model.actions.length ? (<>
            <p className="rs-note">
              그 영역에서 실제로 할 수 있는 한 걸음으로 적었습니다.
            </p>
            <Plan actions={model.actions} stage={model.stage}
              attemptId={attemptId} saved={saved} />
          </>) : (
            /* **머리글만 세워 두지 않는다.** 할 일이 없는 응시에서 약속하는
               문장 아래가 비어 있었다. 빈 자리는 고장으로 읽히고, 읽는
               사람은 자기 결과가 덜 만들어졌다고 본다. 까닭을 적는다 */
            <p className="rs-note">
              지금 응답만으로는 다음 한 걸음을 적을 만큼 영역 사이에 차이가
              생기지 않았습니다. 위의 영역 가운데 하나를 짧은 과제로 한 번
              해보신 뒤에 다시 보시면 그 자리에 적힙니다.
            </p>
          )}
        </section>

        {/* ── 8. 지역과 기관 탐색 ──
            **기업 이름을 담지 않는다.** 직업정보제공사업으로 할 수 있는
            것은 공고를 띄우는 데까지다. 그리고 기관 수를 짐작으로 채우지
            않는다: 그 수가 근거처럼 읽힌다 */}
        <section className="rs-sect" id="region">
          <h2>어디에서 찾을지</h2>
          <p className="rs-note">
            {regionPicked
              ? `지금 ${regionPicked} 기준으로 보고 계십니다. 이 선택은 기술영역 판정에 들어가지 않습니다.`
              : "희망 지역을 고르면 산업과 직무를 읽는 순서가 그 권역 기준으로 바뀝니다. 기술영역 판정은 그대로입니다."}
          </p>
          <div className="rs-pack">
            <h3>권역마다 자리의 성격이 다릅니다</h3>
            <dl>
              {regionLayer().regions.map((r) => (
                <div key={r.code}>
                  <dt>{r.name}</dt>
                  <dd>{r.scene}</dd>
                </div>
              ))}
            </dl>
            <p className="rs-others">
              기관 수와 기업 목록은 아직 담지 않았습니다. 공개 통계를 붙이기
              전까지 짐작으로 채우지 않습니다.
            </p>
          </div>
          <div className="rs-pack">
            <h3>이 넷이 모이면 그 조합을 물어볼 수 있습니다</h3>
            <dl>
              {exploreKey.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            <p className="rs-others">
              지금은 물어볼 자료가 없어서 답을 내지 않습니다. 고르신 넷은
              내 CareerMatri에 남아 있고, 공고와 기관 자료가 들어오면 그
              조합부터 보여드립니다.
            </p>
          </div>
          {/* **고르신 것을 돌려드린다.** 관심 기관 유형과 목표는 응시 중에
              받아 두고 결과지에 한 글자도 나오지 않았다. 판정에 들어가지
              않는다는 것도 함께 적는다 */}
          {model.targets.orgs.length || goal.role || goal.industry || goal.org ? (
            <div className="rs-pack">
              <h3>고르신 자리</h3>
              <p>
                응시하면서 고르신 것입니다. 기술영역 판정에는 들어가지 않고,
                산업과 직무를 읽는 순서에만 쓰입니다.
              </p>
              <dl>
                {model.targets.orgs.length ? (
                  <div>
                    <dt>고르신 조직환경</dt>
                    <dd>{model.targets.orgs.map(orgName).join(" · ")}</dd>
                  </div>
                ) : null}
                {/* **조직환경과 기관 유형은 다른 층이다.** 앞엣것은 그 일을
                    하는 자리의 성격이고 뒤엣것은 그 자리를 가진 기관의
                    종류다. 하나로 못 박지 않는다: 완성품 기업은 대기업에도
                    중견기업에도 있다 */}
                {orgKinds.length ? (
                  <div>
                    <dt>그런 자리가 있는 기관</dt>
                    <dd>{orgKinds.join(" · ")}</dd>
                  </div>
                ) : null}
                {goal.industry ? (
                  <div>
                    <dt>목표 산업</dt>
                    <dd>{industryName(goal.industry)}</dd>
                  </div>
                ) : null}
                {goal.role ? (
                  <div>
                    <dt>목표 직무</dt>
                    <dd>{roleName(goal.role)}</dd>
                  </div>
                ) : null}
                {goal.org ? (
                  <div>
                    <dt>가고 싶은 조직</dt>
                    <dd>{orgName(goal.org)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          <p className="rs-note">
            <Link href="/me/region">희망 지역 고르기</Link>
          </p>
        </section>

        {/* ── 9. 이 결과를 어떻게 읽을 것인가 ──
            **단서를 접어 두기만 하지 않는다.** 무엇을 재고 무엇을 재지
            않았는지는 결과의 일부다. 접어 두면 필요한 사람이 못 찾는다 */}
        <section className="rs-sect" id="howto">
          <h2>이 결과를 어떻게 읽을 것인가</h2>
          <div className="rs-pack">
            <dl>
              <div>
                <dt>재는 것</dt>
                <dd>
                  해 본 일에서 무엇을 직접 정했는지입니다. 적성이나 성격이
                  아니고, 능력의 높낮이도 아닙니다.
                </dd>
              </div>
              <div>
                <dt>재지 않는 것</dt>
                <dd>
                  합격 가능성과 연봉과 순위입니다. 그 셋은 이 응답으로 알 수
                  없고, 적어 두면 그걸 믿고 움직이는 사람이 생깁니다.
                </dd>
              </div>
              <div>
                <dt>‘아직’의 뜻</dt>
                <dd>
                  못 한다는 뜻이 아닙니다. 지금 응답에서 그 자리의 근거를
                  찾지 못했다는 뜻이고, 경험을 하나 적으면 달라집니다.
                </dd>
              </div>
              <div>
                <dt>고정되어 있습니다</dt>
                <dd>
                  응시하신 시점의 문항과 판정 기준으로 굳어 있습니다. 나중에
                  기준이 바뀌어도 이 결과는 달라지지 않습니다.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── 결과 다음에 갈 자리 ──
            **PDF 하나로 끝내지 않는다.** 받은 사람이 다음에 갈 자리가
            다섯이고, 하나만 두면 그 하나를 누른 날 이 서비스가 끝난다 */}
        <section className="rs-sect" id="next">
          <h2>이 다음에</h2>
          {/* **가장 먼저 할 일 하나를 정한다.** 여섯 줄을 같은 무게로 두면
              다 읽은 사람이 어디를 먼저 누를지 모른 채 종이만 받고 끝낸다.
              결과는 시작점이고, 이어지는 자리는 내 CareerMatri 다 */}
          <div className="rs-cta">
            <p>
              이 결과는 그날의 기록으로 굳어 있습니다. 여기서부터는 경험을
              더하면서 지금 상태를 이어서 보실 수 있습니다.
            </p>
            <Link href="/me">내 CareerMatri에서 계속하기</Link>
          </div>
          <ul className="rs-next">
            {[
              ["/me/state", "지금 상태 보기", "설명할 수 있는 경험과 보완할 부분"],
              ["/me/experience/new", "새로운 경험 추가", "반영하면 지금 상태가 달라집니다"],
              ["/me/next", "다음 할 일", "할 수 있는 때로 묶어서 봅니다"],
              ["/me/explore", "산업과 직무 다시 보기", "관심 산업과 직무를 둘러봅니다"],
              ["/me/track", "CareerMatri Track", "준비 중입니다"],
              [`/v3/${attemptId}/result/pdf`, "결과 PDF 저장", "웹과 같은 내용을 종이로"],
            ].map(([href, label, note]) => (
              <li key={href}>
                {/* **종이 길은 `Link` 로 걸지 않는다.** Next 가 화면에 들어온
                    `Link` 를 미리 불러오는데, 그 길은 머리 없는 브라우저를
                    띄워 종이를 만드는 자리다. 아래까지 내려 읽기만 해도
                    종이가 한 벌씩 만들어졌다 */}
                {href.endsWith("/pdf")
                  ? <a href={href}><b>{label}</b><small>{note}</small></a>
                  : <Link href={href}><b>{label}</b><small>{note}</small></Link>}
              </li>
            ))}
          </ul>
        </section>

        <div className="rs-fine">
          <Disclose label="결과 기준 보기">
            <p>{TIER_NOTE_KO[model.tier]}</p>
            {/* **같은 사실을 두 번 적지 않는다.** 결과가 굳어 있다는 말은
                위의 `읽는 법` 에 이미 한 줄로 서 있고, 화면에서는 이 자리가
                접혀 있어 겹침이 안 보인다. 종이에서는 둘 다 펴지므로 같은
                두 문장이 나란히 뽑혔다 */}
            <p>
              응답하신 내용에서 확인된 것만 담았습니다. 합격 가능성이나 순위를
              뜻하지 않습니다.
            </p>
          </Disclose>
          {/* **의견을 받는 자리를 결과 앞에 두지 않는다.** 결과를 먼저
              보여 주고 여기로 오는 길만 둔다. 답하지 않아도 잃는 것이 없다 */}
          {/* **나가는 길을 두 번 적지 않는다.** 바로 위 `이 다음에` 에
              주된 길이 서 있고, 머리띠에도 돌아가는 길이 있다. 여기 또
              두면 같은 자리로 가는 링크가 한 쪽에 셋이다 */}
          {pilot ? (
            <p><Link href={`/v3/${attemptId}/feedback`}>파일럿 의견 적기</Link></p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
