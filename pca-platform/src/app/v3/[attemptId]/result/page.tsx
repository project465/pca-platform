import Link from "next/link";
import { BrandMark } from "@/components/sf/brand-mark";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { RETAKE_BLOCKED_KO } from "@/lib/me-v3/retake";
import { mark } from "@/lib/me-v3/workspace-events";
import {
  attemptOf, domainName, industryChoices, latestResult, orgChoices, roleChoices,
  industriesFromDomains, rolesFromDomains,
} from "@/lib/me-v3/runtime/session";
import { domainArtifacts } from "@/lib/me-v3/runtime/domain-facts";
import type { Axis } from "@/lib/me-v3/scoring/types";
import {
  coreOf,
  type Action, type Gap, type PackView, type ResultDomain,
  type ResultModel, type TranslationView,
} from "@/lib/me-v3/result/model";
import {
  actionBriefKo, actionHeadKo, actionKo, axisStateKo, AXIS_KO, AXIS_WHAT_KO,
  BASIC_GROUP_KO, bridgeKo,
  commonKo, domainChainKo, draftKo, gapCellKo, gapKo, gapNeedKo, gapNeedShortKo, gapShortKo,
  actionWhyKo, AXIS_DID_KO, headlineBadgeKo, headlineKo, needSentenceKo,
  pickSentenceKo,
  evidenceUseKo, evidenceUsePartsKo, keptLineKo, decidedLineKo,
  keptNoteKo, moreReadyKo, saidKo,
  HORIZON_KO, QUALITY_KO, TIER_NOTE_KO, TRANS_ORDER, TRANS_STEP_KO,
  XFIELD_ORDER, xfieldKo, ZONE_LEAD_KO, ZONE_TITLE_KO,
} from "@/lib/me-v3/result/text.ko";
import {
  orgTypesFor, regionLayer, regionOrganizations, regionOrgCount,
} from "@/lib/me-v3/region";
import { core as coreEntry } from "@/lib/me-v3/core-registry";
import { profileOf } from "@/lib/me-v3/platform";
import { chainFor } from "@/lib/me-v3/result/chains";
import { nextStepKo, sayKo, thingKo } from "@/lib/me-v3/result/say";
import { withJosa } from "@/lib/me-v3/result/josa";
import { resultMeta } from "@/lib/me-v3/result/meta";
import { leadFirst, specView } from "@/lib/me-v3/result/spec-view";
import { participantOf, savedActions } from "@/lib/me-v3/pilot/store";
import { takeActionsFromResult } from "@/app/me/next/actions";
import {
  ActionRoadmap, ChartNote, EvidenceMatrix, Radar, StageBars,
} from "./charts";
import { HeroVisual, hasHeroAsset, Ic, type IcName } from "./art";
import ResultNav from "./result-nav";
import "../../result.css";
import { barRows, canRadar } from "@/lib/me-v3/result/chart-data";
import Detail from "./detail";
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
      {/* **칩 벽을 기본으로 세우지 않는다**(규격 §42). 다섯 묶음에 담긴
          칩이 서른을 넘고, 산업 절과 직무 절에 한 번씩 서면 결과지의
          가장 큰 덩이가 **고른 항목 목록**이 된다. 읽는 사람이 여기서
          정해야 하는 것은 다음 한 걸음이지 목록이 아니다. 묶음은
          [상세 보기] 안에 둔다(규격 §10) */}
      <Disclose label="확인된 경험 전부 보기">
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
        {/* **축 이름은 되짚는 자리에 둔다**(SIGN-OFF §9). `요구 해석` 과
            `직접 판단` 과 `산출물` 은 우리 쪽 분류를 줄인 말이라, 절의
            본문에 서면 읽는 사람이 자기 결과 대신 분류표를 읽는다.
            지우지는 않는다: 어느 판단을 먼저 보는 자리인지는 되짚어
            보실 값이다 */}
        {v.explain_order.length ? (
          <div>
            <dt>{name} 쪽에서 먼저 보는 판단</dt>
            <dd>{v.explain_order.map((x) => AXIS_KO[x]).join(" · ")}</dd>
          </div>
        ) : null}
      </dl>
      </Disclose>
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
  /* **응시 화면과 같은 세 낱말이다**(규격 §7). 전에는 첫 칸만
     `해 본 적 없음` 이라, 응시할 때 읽은 척도(`없음 · 1~2회 · 3회 이상`)와
     결과지의 척도가 한 칸 어긋났다. 같은 값을 두 이름으로 적으면 읽는
     사람이 둘을 다른 척도로 읽는다 */
  NONE: "없음", ONCE_OR_TWICE: "1~2회", SEVERAL: "3회 이상",
} as const;

/**
 * 여덟 축을 묻지 않은 응시(BASIC)의 영역 한 자리.
 *
 * **안 물어본 것을 `아직 고른 것이 없습니다` 로 적지 않는다.** 근거를 고르는
 * 화면이 없었는데 빈 칸 셋을 띄우면, 읽는 사람은 자기가 빠뜨린 줄 안다.
 * 받은 것만 적는다: 관심과 경험과 배울 뜻.
 */
function Basic({ core, d }: { core: string; d: ResultDomain }) {
  const chain = domainChainKo(core, d.code);
  const made = domainArtifacts(core, d.code);
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

/**
 * **한 칸에 같은 항목을 두 번 적지 않는다**(규격 §10).
 *
 * 산출물 축을 직접 정한 사람의 카드에서 `지형도` 가 `직접 정한 것` 과
 * `남긴 것` 에 나란히 섰다. 둘 다 맞는 말인데, 바로 아래 줄이 그것을 제
 * 이름으로 다시 적으므로 위에서는 뺀다. 스무 Core 의 사람 C 에서 영역
 * 80자리가 그 모양이었다.
 *
 * **빼서 빈 칸이 되면 빼지 않는다**: `Picks` 가 빈 목록에 `아직 고른 것이
 * 없습니다` 를 적는데, 직접 정한 것이 있는 사람에게 그 문장은 거짓이다.
 * 되풀이를 없애되 정보를 지우지 않는다.
 *
 * **판정에 닿지 않는다**: 결과 모델의 `decided` 와 `artifacts` 는 그대로고
 * 여기서 고르는 것은 어느 줄에 적을지뿐이다.
 */
function evidenceRows(d: ResultDomain): { decided: string[]; did: string[] } {
  const named = new Set([...d.artifacts, ...d.verifications]);
  const trimmed = d.decided.filter((x) => !named.has(x));
  return {
    decided: trimmed.length ? trimmed : d.decided,
    did: d.did.filter((x) => !d.decided.includes(x) && !named.has(x)),
  };
}

/** 왜 이 결과인가. **해석보다 그 사람이 고른 항목이 큰 자리를 차지한다** */
function Why({ d }: { d: ResultDomain }) {
  const { decided, did } = evidenceRows(d);
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

/**
 * 영역 한 자리. **기본 보기가 다섯 줄이다**(규격 §14).
 *
 *   영역명 · 현재 상태 한 줄 · 가장 강한 근거 둘셋 · 부족한 것 하나 ·
 *   다음 행동 하나
 *
 * 전에는 기본 보기가 `직접 정한 것 / 해 본 일 / 남긴 것 / 비교한 것`
 * 네 칸이었고 칸마다 여섯 항목까지 깔렸다. 읽는 사람이 자기 답을 다시
 * 알아보는 자리로는 맞지만, **그 영역에서 무엇이 모자라고 다음에 무엇을
 * 하면 되는지가 그 아래 다른 절로 흩어져 있었다.** 그래서 영역 하나를
 * 한 자리에서 끝내도록 빈자리 하나와 할 일 하나를 여기로 올리고, 목록
 * 전체와 여덟 축은 `상세 근거 보기` 안으로 내렸다.
 *
 * **확인된 판단 수와 직접 정한 것의 수를 머리에서 걷었다**(규격 §15).
 * `확인된 판단 5 · 직접 정한 것 2` 는 다음에 무엇을 할지 정하는 데 쓰이지
 * 않는 수인데 영역 이름 옆에서 가장 먼저 읽혔다. 상세 안으로 내렸다.
 */
function DomainPanel(
  { core, d, showAxes, gap, action, stage, sameZone }: {
    core: string; d: ResultDomain; showAxes: boolean;
    /** 이 영역에서 가장 급한 빈자리 하나 */
    gap?: Gap; action?: Action; stage?: ResultModel["stage"];
    /** 바로 앞 카드와 같은 묶음인가. 같으면 상태 문장을 비운다 */
    sameZone?: boolean;
  },
) {
  const name = domainName(core, d.code);
  const g = gap ? gapKo(gap, name) : null;
  const gapCell = gap ? gapCellKo(gap) : "";
  /* 할 일 문장은 이 카드에서 적지 않는다(아래 주석). 인자는 그대로 받아
     둔다: 부르는 자리가 그 영역의 할 일을 이미 골라 넘기고 있어서, 여기서
     빼면 고르는 코드가 두 벌이 된다 */
  void action; void stage;
  return (
    <article className="rs-domain">
      <header>
        <h3>{name}</h3>
        {/* **네 축만 물은 응시에 묶음 딱지를 붙이지 않는다.** 딱지에
            `근거를 더 만들어야 하는 영역` 이 적혀 있어서, 근거를 묻지 않은
            응시에 그대로 붙이면 재지 않은 것을 판정으로 적는 셈이다 */}
        {showAxes ? (
          <span className={`rs-zone ${ZONE_CLASS[d.zone]}`}>{ZONE_TITLE_KO[d.zone]}</span>
        ) : null}
      </header>
      {showAxes ? (<>
        {/* 현재 상태 한 줄. 묶음 딱지가 말하는 것을 문장으로 한 번.
            **같은 묶음이 잇따르면 비운다**(규격 §10). 같은 상태의 영역은
            이 문장이 글자까지 같아서, 카드 넷에 네 번 서면 읽는 사람이
            같은 데를 또 도는 줄 안다. 딱지는 카드마다 그대로 선다: 그것은
            이름표이고 되풀이되는 것이 맞다 */}
        {sameZone ? null : <p className="rs-dstate">{ZONE_LEAD_KO[d.zone]}</p>}
        <Strongest d={d} />
        {g ? (
          <div className="rs-dgap">
            <h4>여기서 더 보여줄 것</h4>
            {/* **카드에는 칸의 말을 적는다**(규격 §10). 긴 문장은 아래
                `앞으로 채울 것` 절이 들고, 영역 이름은 카드 머리가 든다 */}
            <p>{gapCell}</p>
          </div>
        ) : null}
        {/* **할 일을 카드마다 다시 적지 않는다**(규격 §10·§12).
            같은 문장이 아래 `앞으로 채울 것` 의 그 빈자리 칸과 `다음에 할
            일` 목록에 글자까지 같게 선다. 한 종이에서 같은 줄을 세 번
            읽으면 그것이 할 일로 읽히지 않는다. 할 일이 서는 자리는
            규격이 정한 차례대로 **빈자리 절과 할 일 절**이고, 영역 카드가
            맡는 것은 그 영역에서 무엇이 확인됐는가다 */}
      </>) : <Basic core={core} d={d} />}
      {showAxes ? (
        /* **여덟 축을 기본으로 펼치지 않는다**(규격 §14). 여덟 줄이
           기본으로 서면 그 목록이 영역 한 자리에서 가장 큰 덩이가 되고,
           읽는 사람이 자기 상태를 여덟 개의 판정으로 읽는다 */
        <Fold label="상세 근거 보기">
          <Why d={d} />
          <p className="rs-meta">
            확인된 판단 {d.confirmed.length} · 직접 정한 것 {d.owned.length}
          </p>
          <Axes d={d} />
        </Fold>
      ) : null}
    </article>
  );
}

/**
 * 기본 보기의 근거 두 묶음(규격 §12).
 *
 * **묶음으로 세우고 이름표를 줄마다 되풀이하지 않는다.** 전에는 넷을 한
 * 줄기로 훑어 셋을 뽑았는데, 직접 정한 것이 셋 이상이면 **`직접 정한 것`
 * 이라는 이름표가 세 줄에 그대로 세 번 섰고** 남긴 결과물은 한 줄도
 * 서지 않았다. 지원서에서 읽히는 둘은 그 둘이라, 각각 셋까지 따로 세운다.
 *
 * **비교한 것과 해 본 일은 `상세 근거 보기` 안이다.** 여기서 줄이는 것은
 * 보이는 수이고 담긴 자료가 아니다.
 */
function Strongest({ d }: { d: ResultDomain }) {
  const seen = new Set<string>();
  /**
   * **묶음마다 셋까지다**(규격 §9).
   *
   * 한동안 둘을 합쳐 셋으로 묶어 두었는데, 그러면 직접 판단한 것이 셋인
   * 사람에게 **남긴 결과가 한 줄도 서지 않는다.** 지원서에서 읽히는 둘이
   * 그 둘이라 각각 셋까지 따로 세운다. 나머지는 `상세 근거 보기` 안에
   * 그대로 있다.
   */
  const take = (list: string[]) => {
    const out: string[] = [];
    for (const t of list) {
      if (out.length >= 3 || seen.has(t)) continue;
      seen.add(t); out.push(t);
    }
    return out;
  };
  /* **이름표를 줄마다 되풀이하지 않는다**(규격 §11). 묶음 머리에 한 번
     적고 아래에는 행동만 선다 */
  const groups = [
    /* 산출물 이름은 아래 줄이 제 이름으로 적는다(`evidenceRows`) */
    { label: "직접 정한 것", items: take(evidenceRows(d).decided) },
    { label: "남긴 결과", items: take(d.artifacts) },
  ].filter((g) => g.items.length);
  if (!groups.length) {
    return (
      /* **카드마다 같은 문장을 되풀이하지 않는다**(규격 §10). 근거를
         고르지 않은 영역이 넷이면 이 문장이 네 번 선다. 그 영역의 상태와
         빈자리는 바로 위와 아래가 이미 적고 있으므로, 여기는 **고른 것이
         없다는 사실**만 칸의 말로 적는다 */
      <p className="rs-dnone">아직 고른 근거 없음</p>
    );
  }
  return (
    <>
      {groups.map((g) => (
        <div className="rs-dgroup" key={g.label}>
          <h4>{g.label}</h4>
          <ul className="rs-dstrong">
            {g.items.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      ))}
    </>
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
  { core, domain, axis, state, picks, own }: {
    core: string; domain: string; axis: Axis;
    state: Parameters<typeof axisStateKo>[1];
    picks: string[]; own?: boolean;
  },
) {
  return (
    <div className="row">
      <p className="judge">
        <b>{domainName(core, domain)}</b>
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
  { core, actions, stage, attemptId, saved, where }: {
    core: string; actions: Action[]; stage: ResultModel["stage"];
    /** 파일럿 참가자일 때만 담아두기 단추가 선다 */
    attemptId: string; saved: string[] | null;
    /** 넓게 살펴보라는 할 일이 가리킬 영역 이름(규격 §16) */
    where: string[];
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
              /**
               * **영역만 바뀐 같은 할 일을 줄마다 다시 적지 않는다**(규격 §10).
               *
               * 같은 빈자리가 영역 셋에 있으면 `~에서 어느 값을 직접 정했는지
               * 적어보세요` 가 세 줄에 글자까지 같게 선다(한 결과지에서 일곱
               * 번까지 봤다). **정보를 지우지 않는다**: 한 줄로 묶고 영역
               * 이름을 나란히 적는다. 담아두기 단추는 묶인 할 일마다 그대로
               * 선다 — 그 줄은 사람이 하나씩 고르는 자리다.
               *
               * 묶는 기준은 **영역 이름을 뺀 문장**이다. 영역 이름 자리에
               * 자리표를 넣어 문장을 만들고, 같은 문장이면 같은 할 일로 본다.
               */
              const MARK = "\u0000";
              const key = (a: Action) => (
                a.code === "EXPLORE_BROADLY"
                  ? `explore:${a.id}`
                  : actionKo(a, MARK, stage).do + (actionKo(a, MARK, stage).guide ?? ""));
              const merged: { key: string; list: Action[] }[] = [];
              for (const a of list) {
                const k = key(a);
                const hit = merged.find((m) => m.key === k);
                if (hit) hit.list.push(a);
                else merged.push({ key: k, list: [a] });
              }
              /* **같은 덧말을 줄마다 되풀이하지 않는다.** 학위에 따라 붙는
                 줄은 한 사람에게 늘 같아서, 세 줄이면 세 번 똑같이 적힌다.
                 처음 나올 때 한 번만 적고 그다음부터는 줄인다 */
              let last = "";
              return merged.map(({ list: same }) => {
                const a = same[0];
                const names = same.map((x) => (x.domain ? domainName(core, x.domain) : "전체"));
                const t = actionKo(
                  a, same.every((x) => x.domain) ? names.join(" · ") : "",
                  stage,
                  a.code === "EXPLORE_BROADLY" ? where : undefined);
                const note = t.note && t.note !== last ? t.note : "";
                if (t.note) last = t.note;
                return (
                  <li key={a.id} data-action-id={a.id}>
                    <span>{names.join(" · ")}</span>
                    <div className="rs-doit">
                      <b>{t.do}</b>
                      {note ? <i>{note}</i> : null}
                    </div>
                    {saved ? same.map((x) => (
                      <SaveAction key={x.id} attemptId={attemptId} actionId={x.id}
                        saved={saved.includes(x.id)} />
                    )) : null}
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
function Translation({ view, major }: { view: TranslationView; major: string }) {
  /* 열 단계만 세운다. 꼬리표(`TR_TAG_*`)는 이야기의 한 마디가 아니다 */
  const rows = TRANS_ORDER
    .map((id) => view.steps.find((s) => s.item_id === id))
    .filter((s): s is TranslationView["steps"][number] => !!s && !!TRANS_STEP_KO[s.item_id]);
  /* 타계열 대학원 맥락. **열 단계가 없어도 이 절을 세운다**: 적어 주신 것이
     어디로도 가지 않으면 받고 쓰지 않은 응답이 된다 */
  const xf = XFIELD_ORDER
    .map((id) => view.xfield.find((x) => x.item_id === id))
    .filter((x): x is TranslationView["xfield"][number] => !!x && !!xfieldKo(x.item_id, major));
  if (!rows.length && !xf.length) return null;
  const draft = draftKo(view.steps);
  return (
    <section className="rs-sect" id="translation">
      <h2>연구·프로젝트를 직무 언어로</h2>
      <p className="rs-note">
        적어주신 과제를 지원서와 면접에서 말하는 차례로 나눴습니다.
      </p>
      {/* **긴 문단을 기본 화면의 큰 박스로 두지 않는다**(규격 §5).
          전에는 열 단계 목록과 이어 붙인 문단이 함께 펼쳐져 이 절 하나가
          쪽에서 둘째로 큰 덩이였다. 기본으로 보이는 것은 **첫 문장 한
          줄**이고, 그것을 어떻게 이었는지는 아래에서 펴 본다.
          **새 문장을 만들지 않는다**: 고르신 답을 이은 것을 그대로 자른다 */}
      {draft.length >= 3 ? (
        <div className="rs-draft is-pre">
          <h3>지원서에서 이렇게 묶어볼 수 있습니다</h3>
          <p className="rs-draft-pre">{draft[0]}</p>
        </div>
      ) : null}
      <Disclose label="작성 근거 자세히 보기">
      {/* **대학원 전공이 다른 분의 경험을 기계공학 판단으로 세지 않는다.**
          여기 적는 것은 그 경험을 직무 말로 옮길 때 읽는 맥락이고, 위의
          영역별 판정에는 한 글자도 들어가지 않는다 */}
      {xf.length ? (
        <div className="rs-pack">
          <h3>대학원 경험을 어디에 걸칠지</h3>
          <p>
            학부에서 {major}을(를) 하시고 대학원은 다른 분야를 하셨다고 답해주셨습니다.
            대학원 경험은 {major} 영역 확인과 따로 보고, 아래 번역에서 읽었습니다.
          </p>
          <dl>
            {xf.map((x) => (
              <div key={x.item_id}>
                <dt>{xfieldKo(x.item_id, major)}</dt>
                <dd>{x.choice}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {/* **빈 표를 통째로 싣지 않는다.** 열 줄이 전부 `적지 않으셨습니다`
          이면 그 표는 한 쪽을 먹으면서 아무것도 말하지 않는다. 적어 주신
          줄만 세우고, 비어 있는 줄은 **수와 이름으로** 한 줄에 모은다 */}
      {rows.some((s) => s.choice) ? (
        <ol className="rs-steps">
          {rows.filter((s) => s.choice).map((s) => (
            <li key={s.item_id}>
              <span>{TRANS_STEP_KO[s.item_id]}</span>
              <b>{s.choice}</b>
            </li>
          ))}
        </ol>
      ) : null}
      {rows.some((s) => !s.choice) ? (
        <p className="rs-note">
          아직 적지 않으신 단계 {rows.filter((s) => !s.choice).length}개 ·{" "}
          {rows.filter((s) => !s.choice)
            .map((s) => TRANS_STEP_KO[s.item_id]).join(" · ")}
        </p>
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
      </Disclose>
    </section>
  );
}

export default async function V3Result({
  params, searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ again?: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  /* 재응시를 누르고 여기로 돌아온 사람(규격 §7). **왜 돌아왔는지를
     적는다**: 아무 말 없이 결과로 보내면 단추가 고장 난 줄 안다 */
  const { again } = await searchParams;
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
  const regionCode = profile?.home_region ?? null;
  const regionPicked = profile?.home_region
    ? regionLayer().regions.find((r) => r.code === profile.home_region)?.name ?? null
    : null;

  /* **결과를 열었다는 것만 센다.** 어느 절을 얼마나 읽었는지는 재지
     않는다. 그것을 재려면 화면에 코드를 심어야 하고, 그러면 파일럿
     참가자와 일반 응시자가 다른 화면을 받는다 */
  await mark("result_opened", user.id, { tier: m.tier });

  const model: ResultModel = m;
  /* **어느 전공의 사전을 읽을지는 굳은 결과가 들고 있다.** 결과지는 그때
     낸 값을 그리는 자리라 지금 그 사람의 core 가 아니라 **그 결과의
     core** 를 읽어야 한다. 전공을 바꿔 다시 응시한 사람의 옛 결과지가
     새 전공 이름으로 그려지면 그 종이는 거짓이 된다 */
  const core = coreOf(model);
  /* **첫 쪽의 머리 한 줄**(규격 §15): 학교 · 학과 · 전공 · 등급 · 응답일.
     전공 이름을 글자로 적지 않는다: 그 결과의 Core 에서 읽는다 */
  const meta = await resultMeta(attemptId, core);
  /* **첫 줄에서 무엇이 있는지까지 말한다**(SIGN-OFF §2). 이름을 넘기면
     머리글이 떠받치는 영역의 이름을 적고, 그 묶음이 비어 있으면 전과 같은
     문장이 선다. 영역 이름은 **그 결과의 Core 사전**에서 온다 */
  const h = headlineKo(model, (td: string) => domainName(core, td));
  /* **확인된 영역에서 거꾸로 읽는다**(규격 Reverse Mapping). 고른 산업
     하나와 직무 하나만 적으면, 아직 아무것도 고르지 않은 사람에게
     `어떤 산업과 연결되는가` 가 결과지에서 답해지지 않는다.
     **새 점수를 만들지 않는다**: `relations` 표의 강도를 그대로 읽는다 */
  const confirmedDomains = model.domains
    .filter((d) => d.confirmed.length > 0).map((d) => d.code);
  /**
   * **그 학과의 읽는 차례로 세운다**(갈래 계약의 `industry_mapping` ·
   * `role_mapping`).
   *
   * 걸린 자리는 응답이 정한 그대로이고 **빼거나 더하지 않는다.** 바뀌는
   * 것은 차례뿐이다: 같은 Core 를 쓰는 학과 둘이 같은 목록을 받더라도
   * 자기 전공이 자주 서는 자리를 먼저 읽는다. 자르기 전에 세워야 **그
   * 학과의 자리가 넷 밖으로 밀리지 않는다.**
   */
  const sv = specView(core, meta.specializationCode);
  const revIndustry = leadFirst(
    industriesFromDomains(core, confirmedDomains), sv.industryLead, (r) => r.code,
  ).slice(0, 4);
  const revRole = leadFirst(
    rolesFromDomains(core, confirmedDomains), sv.roleLead, (r) => r.code,
  ).slice(0, 4);
  /* **기관은 확인된 줄만 선다.** 출처 없는 줄은 DB 가 거절하므로 여기서
     걸러낼 일이 없고, 비면 비었다고 적는다 */
  const [regionOrgs, regionOrgN] = await Promise.all([
    regionOrganizations(regionCode, [coreEntry(core).major], 5),
    regionOrgCount(regionCode),
  ]);
  /**
   * Evidence 사슬 네 칸(규격 §11).
   *
   * **새 값을 만들지 않는다.** 네 칸이 전부 결과 모델이 이미 들고 있는
   * `did` · `decided` · `artifacts` · `verifications` 에서 그대로 온다.
   * 세우는 영역은 **지원서에서 먼저 쓸 자리로 이미 선 영역**이고, 여기서
   * 순위를 다시 매기지 않는다.
   */
  const chains = [...new Set(model.evidence.ready.map((e) => e.domain))]
    .slice(0, 2)
    .map((code) => {
      const d = model.domains.find((x) => x.code === code);
      return {
        code,
        did: d?.did[0] ?? null,
        decided: d?.decided[0] ?? null,
        left: d?.artifacts[0] ?? d?.verifications[0] ?? null,
      };
    });
  /* 네 단계에 세우지 못한 나머지 영역. **차례를 다시 매기지 않는다** */
  const readyDomains = [...new Set(model.evidence.ready.map((e) => e.domain))];
  const restReady = readyDomains.slice(2).map((c) => domainName(core, c));
  const focus = model.domains.filter((d) => model.overview.focus.includes(d.code));
  const compare = model.domains.filter((d) => model.overview.compare.includes(d.code));
  const deep = model.limits.deep_axes;
  /* 첫 칸이 비었을 때 돌려줄 자리. **지어내지 않는다**: 그 영역에서
     `해 본 적이 있다` 고 고르신 줄만 모은다 */
  const tried = model.domains.filter(
    (d) => d.experience && d.experience !== "NONE");
  /* **그릴 것이 없으면 그 절의 머리와 안내도 세우지 않는다.** `Radar` 는
     판단을 물은 영역이 셋 미만이면 `null` 이고 `StageBars` 는 줄이 없으면
     `null` 인데, 머리글과 `막대의 길이는 …` 안내는 그대로 서 있었다.
     그러면 읽는 사람은 그래프가 안 그려진 고장으로 읽는다 */
  const hasRadar = canRadar(model);
  const hasBars = barRows(model).length > 0;

  /**
   * 영역 한 자리에서 끝내기 위해 그 영역의 **빈자리 하나와 할 일 하나**를
   * 고른다(규격 §14).
   *
   * **차례를 여기서 만들지 않는다.** `model.gaps` 는 이미 `rank` 로 서 있고
   * `model.actions` 도 모델이 정한 차례라, 그 가운데 그 영역의 첫 줄을
   * 집는다. 영역이 정해지지 않은 할 일(`domain === null`)은 이 자리에
   * 올리지 않는다: 어느 영역의 일인지 모르는 문장이 영역 칸 안에 서면
   * 읽는 사람이 그것을 그 영역의 일로 읽는다.
   *
   * **아래 `앞으로 채울 것` 과 `다음에 할 일` 절을 걷지 않았다.** 저쪽은
   * 영역을 가리지 않고 전부를 급한 차례로 보여 주는 자리이고, 여기는 한
   * 영역 안에서 무엇이 모자란지를 보여 주는 자리다. 같은 줄이 두 곳에
   * 서는 것은 되풀이가 아니라 **차례가 다른 두 읽기**다.
   */
  const gapFor = (code: string): Gap | undefined =>
    model.gaps.find((g) => g.domain === code);
  const actionFor = (code: string): Action | undefined =>
    model.actions.find((a) => a.domain === code);
  const stage = model.stage;
  const counts = model.overview.counts;
  const industryName = (c: string) =>
    industryChoices(core).find((x) => x.code === c)?.name ?? c;
  const roleName = (c: string) => roleChoices(core).find((x) => x.code === c)?.name ?? c;
  /**
   * 넓게 살펴보라는 할 일이 **어느 영역에서**인가(규격 §16).
   *
   * 고르신 산업과 이어지는 영역을 먼저 쓰고, 고르지 않으셨으면 결과 모델이
   * 적은 영역 차례를 쓴다. **새로 판정하지 않는다**: 둘 다 모델이 이미
   * 들고 있는 값이고, 차례도 모델이 적은 그대로다
   */
  const exploreWhere = (): string[] => [
    ...(model.industry_context?.domains ?? []),
    ...(model.role_context?.domains ?? []),
    ...model.domains.map((d) => d.code),
  ].filter((c, i, xs) => xs.indexOf(c) === i).slice(0, 2).map((c) => domainName(core, c));
  const say = (x: Action) => actionKo(
    x, x.domain ? domainName(core, x.domain) : "", stage,
    x.code === "EXPLORE_BROADLY" ? exploreWhere() : undefined).do;
  const gapTile = (g: Gap) => gapShortKo(g, domainName(core, g.domain));

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
   * 할 일 칸의 둘째 줄. **그래서 지금 무엇을 하면 되는가**(규격 §8).
   *
   * `FILL_GAP` 일 때 이 칸이 들고 있던 것은 빈자리의 이름이었다
   * (`경영전략·기획 · 어디까지 직접 정했는지`). 칸 제목이 `가장 먼저
   * 채울 것` 이므로 틀린 말은 아니지만, 그러면 첫 화면 넷 가운데 셋이
   * **비어 있는 것**을 적고 행동을 적는 칸이 한 자리도 없다. 그 빈자리에
   * 붙은 할 일은 모델이 이미 들고 있다(`gap.action_id`).
   */
  const moveNext = move === "FILL_GAP" && topGap
    ? model.actions.find((x) => x.id === topGap.action_id)
    : null;

  /**
   * 첫 화면 둘째 칸. **보고 있는 산업과 직무를 기준으로 적는다.**
   *
   * 고르신 산업·직무가 있으면 그쪽에서 한 번 더 확인하는 자리를 적고,
   * 없으면 Core 에서 비어 있는 자리를 적는다. **없는 것을 지어내지
   * 않는다**: 둘 다 없으면 그 사실을 적는다.
   */
  const packLack = model.industry_context ?? model.role_context;
  /**
   * 셋째 칸의 이름은 `더 채울 부분` 하나다(규격 §3).
   *
   * 전에는 고르신 산업 이름을 머리에 달아 `정보기술·플랫폼 쪽에서 비어
   * 있는 것` 으로 섰다. 넷을 나란히 놓고 보면 이 칸만 이름이 길고 매번
   * 달라서, 네 칸이 같은 자리에서 같은 일을 한다는 것이 읽히지 않는다.
   * 어느 쪽에서 본 것인지는 아래 한 줄이 그대로 든다.
   */
  const lackTitle = "다음에 채울 부분";
  /* **영역 이름을 축마다 다시 적지 않는다.** 둘을 `영역 · 축` 으로
     만들어 또 `·` 로 이으면 같은 영역이 두 번 서고 가운뎃점이 넷이
     되어, 읽는 사람이 어디까지가 한 자리인지 가를 수 없다
     (`인사·조직 · 요구 해석 · 인사·조직 · 직접 판단`). 영역으로 묶어
     한 번만 적는다 */
  /**
   * **첫 줄은 영역이고 비어 있는 자리는 그 아래 줄이 든다**
   * (COMMERCIAL FINAL §5).
   *
   * 전에는 이 칸이 `경영전략·기획에서 요구 해석 · 직접 판단` 으로 섰다.
   * 축 이름은 우리 쪽 분류이고, 그것이 칸의 첫 줄에 서면 읽는 사람이 자기
   * 결과 대신 분류표를 읽는다. 데이터 구조는 그대로 두고 **읽는 자리에서만**
   * 학생의 말로 내린다(`needSentenceKo`).
   */
  /* 손에 남은 것. 첫 화면 둘째 칸이 든다. **결과 모델이 준 그대로다** */
  const left = [...new Set(focus.flatMap((d) => d.artifacts))];
  /*
   * 첫 화면의 큰 글씨(R5 Skeleton Reset).
   *
   * **그 사람이 고른 문장이다.** 깊게 물은 응시에서는 직접 정한 것(없으면
   * 한 일)을 그대로 세우고, 네 축만 물은 응시처럼 고른 문장이 없는
   * 자리에서는 판정 한 줄로 내려간다. **새로 짓지 않는다**: 둘 다 결과
   * 모델이 이미 들고 있는 값이다
   */
  /* **한 화면에 같은 문장을 두 번 세우지 않는다.** 고르신 문장을 길이로
     세워 **짧은 쪽이 hero 의 큰 글씨**로 가고 그다음 것이 아래 카드로
     간다. 짧은 쪽을 올리는 까닭은 큰 글씨가 네 줄로 벌어지면 한눈에
     들어오지 않아서다. **새로 짓지 않는다**: 둘 다 결과 모델이 이미
     들고 있는 값이다 */
  const says = deep && focus.length
    ? [...new Set([...focus[0].decided, ...focus[0].did])].filter(Boolean)
    : [];
  /*
   * 첫 화면의 큰 글씨.
   *
   * **학생이 자기 경험을 말하는 문장만 올린다.** 고르신 항목에는 문장
   * (`~다`)과 이름표(`전사 목표`)가 섞여 있는데, 이름표를 올리면
   * `전사 목표를 다뤄 보셨어요` 처럼 **무슨 과제였는지 알 수 없는 판정형
   * 한 줄**이 된다. 그래서 큰 글씨는 문장만 받고, 문장이 하나도 없으면
   * 판정 한 줄로 내려간다(이름표는 아래 카드와 칩이 그대로 든다).
   *
   * **직접 정한 것이 먼저다**: 서류와 면접에서 읽히는 쪽이 그쪽이다.
   * 길이는 스물여덟 자 안팎이 한 줄 반이고, 더 길면 네 줄로 벌어져
   * 한눈에 들어오지 않는다.
   */
  const toldAll = (xs: string[]): string[] => xs.filter((x) => x.endsWith("다"));
  const told = (focus.length && toldAll(focus[0].decided).length)
    ? toldAll(focus[0].decided) : toldAll(says);
  const best = [...told].sort(
    (a, b) => Math.abs(a.length - 28) - Math.abs(b.length - 28))[0] ?? "";
  /* **짧으면 한 토막 더 잇는다.** 고르신 문장 둘을 `~고, ~어요` 로 이으면
     한 일과 그때 정한 것이 한 호흡에 들어온다. 서른네 자를 넘기면 잇지
     않는다: 그 위로는 큰 글씨가 세 줄로 벌어져 한눈에 안 들어온다 */
  const more = best
    ? [...told].filter((x) => x !== best).sort((a, b) => a.length - b.length)
      .find((x) => best.length + x.length <= 34) ?? ""
    : "";
  const openQuote = best ? pickSentenceKo(more ? [best, more] : [best]) : "";
  /* 카드는 **다른 문장**을 든다. 아래 목록이 이미 적는 이름을 다시
     문장으로 세우지 않는다 */
  const cardPick = says.find(
    (x) => x !== best && !left.some((a) => x.includes(a))) ?? "";
  const cardSay = cardPick ? pickSentenceKo([cardPick]) : "";
  const openLine = openQuote || h.title;
  /* 공식 Hero 그림이 들어와 있는가. 없으면 글이 hero 폭을 다 쓴다 */
  const heroArt = hasHeroAsset();
  /*
   * 분류 이름은 문장 **아래** 칩이다(§15). **셋까지**.
   *
   * 넷을 세우면 390px 에서 두 줄로 쌓이고, 흰 알약 넷이 큰 글씨 바로
   * 아래에 깔리면 먼저 읽히는 것이 그 사람의 경험이 아니라 우리 쪽
   * 분류가 된다. 나머지 영역은 아래 `이런 직무와 잘 이어져요` 와 열두
   * 영역 절이 그대로 든다.
   */
  const openTags = (focus.length ? focus : tried)
    .slice(0, 3).map((d) => domainName(core, d.code));
  /*
   * 카드 B `이 경험에서 쓸 수 있는 것`.
   *
   * **없는 역량을 적지 않는다.** 여기 서는 칩은 전부 그 응시에서 **확인된
   * 판단축**이고, 이름은 학생이 읽는 말로 적는다(`AXIS_KO`). 재지 않은
   * 역량 보유를 단정하는 말을 쓰지 않는 것은 전과 같다 */
  /**
   * 확인된 판단축. 칩은 축 이름이고 **그 위 한 줄은 학생의 말**이다
   * (`AXIS_DID_KO`). 소유까지 간 축을 먼저 세워, 그 사람이 가장 깊게
   * 들어간 자리가 한 줄로 선다. **새로 판정하지 않는다.**
   */
  const useAxes = [...focus.flatMap((d) => d.axes)]
    .filter((a) => a.state === "CONFIRMED" || a.state === "OWNED")
    .sort((a, b) => (b.state === "OWNED" ? 1 : 0) - (a.state === "OWNED" ? 1 : 0));
  /* **판정을 설명하지 않는다**(Gate §2). `~ 경험이에요` 는 우리가 그렇게
     읽었다는 말이고, 학생이 듣고 싶은 것은 **그래서 지원서에서 무슨 말을
     할 수 있는가**다. 말끝도 윗줄과 갈라 리듬을 만든다(Gate §4) */
  const useWhy = useAxes.length
    ? `그 과정에서 ${AXIS_DID_KO[useAxes[0].axis]} 경험도 있어요.` : "";
  /*
   * `이런 쪽과 이어져요` 세 칸.
   *
   * **새로 순위를 만들지 않는다**: 결과 모델이 적은 `focus` 차례 그대로이고,
   * 한 줄 설명은 그 Core 사전의 **먼저 정하는 것**(`chainFor` 둘째 토막)이다 */
  const PATH_IC: IcName[] = ["brief", "chart", "hands"];
  const pathCards = (focus.length ? focus : tried).slice(0, 3).map((d, i) => {
    /* 토막만 세우면 `하지 않을 것과 먼저 할 것` 처럼 끊긴 말이 된다.
       **낱말을 더하지 않고** 한 마디로 문장을 닫는다 */
    const first = chainFor(core, d.code)[1] ?? "";
    /* **왜 이 경험과 이어지는가**는 그 영역에서 확인된 축이 말한다.
       태그도 같은 축이라 둘이 서로를 받친다 */
    const on = d.axes.filter((a) => a.state === "CONFIRMED" || a.state === "OWNED");
    return {
      code: d.code,
      icon: PATH_IC[i] ?? "brief",
      name: domainName(core, d.code),
      why: on.length ? `${AXIS_DID_KO[on[0].axis]} 경험과 이어져요.` : "",
      what: first ? `${withJosa(first, "이가")} 먼저인 쪽이에요.` : "",
      tags: [...new Set(on.map((a) => AXIS_KO[a.axis]))].slice(0, 3),
    };
  });
  const lackBy = new Map<string, Axis[]>();
  for (const r of packLack?.requested.slice(0, 2) ?? []) {
    const d = domainName(core, r.domain);
    lackBy.set(d, [...(lackBy.get(d) ?? []), r.axis]);
  }
  const lackWhat = lackBy.size
    ? [...lackBy.keys()].join(" · ")
    : topGap ? domainName(core, topGap.domain) : "";
  const lackNeed = lackBy.size
    ? needSentenceKo([...lackBy.values()].flat())
    : topGap ? gapNeedShortKo(topGap) : "";

  /**
   * 첫 화면 넷째 칸. **산업·직무 연결 맥락**(규격 §13).
   *
   * 앞의 셋은 Core 안에서 끝나는 말이다: 무엇이 확인됐고 무엇이 비었고
   * 지금 무엇을 하면 되는가. 넷째 칸이 하는 일은 **그것이 어디로 가는
   * 이야기인지**를 적는 것이다. 보고 있는 산업과 직무가 없으면 이 칸이
   * 첫 화면에서 가장 많이 묻는 것(`그래서 어디에 쓰는가`)에 답하지 못한다.
   *
   * **없는 것을 지어내지 않는다.** 고르지 않으셨으면 그 사실과 어디서
   * 고를 수 있는지를 적고, 고르셨으면 그쪽에서 **이미 이어지는 영역**을
   * 적는다. 비어 있는 자리는 둘째 칸이 이미 들고 있으므로 되풀이하지
   * 않는다.
   */
  const linkNames = [
    model.industry_context ? industryName(model.industry_context.code) : null,
    model.role_context ? roleName(model.role_context.code) : null,
  ].filter((x): x is string => Boolean(x));
  const linkReady = [
    ...(model.industry_context?.established ?? []),
    ...(model.role_context?.established ?? []),
  ].map((e) => domainName(core, e.domain));
  /* **상담 자리에서 그대로 말할 수 있는 문장만 쓴다**(COMMERCIAL FINAL §4).
     전에는 `지금 확인된 것으로는 아직 이어지는 영역이 없습니다` 였다.
     뜻은 맞지만 사람이 학생을 앞에 두고 그렇게 말하지 않는다 */
  const linkText = linkNames.length
    ? (linkReady.length
      ? `${[...new Set(linkReady)].slice(0, 2).join(" · ")}에서 해 본 일이 이어져요`
      : "아직 이쪽으로 이어지는 경험은 보이지 않습니다")
    : "";

  /**
   * 산업 절과 직무 절이 닫는 할 일.
   *
   * **두 절이 같은 문장으로 닫지 않는다**(규격 §10). 고르신 산업과 직무가
   * 같은 영역의 빈자리를 가리키면 `model.actions.find` 가 같은 할 일을
   * 돌려주고, 그러면 한 종이에서 같은 줄을 두 번 읽는다. 직무 절은 그
   * 직무가 가리키는 다른 할 일을 먼저 찾고, 없을 때만 같은 것을 쓴다.
   */
  const packAction = (v: PackView | null, used: (Action | null)[]): Action | null => {
    if (!v) return null;
    const ids = new Set(used.filter(Boolean).map((a) => (a as Action).id));
    const mine = model.actions.filter((a) => v.requested.some((r) => r.domain === a.domain));
    /* **이미 적은 할 일을 다시 적지 않는다.** 쓸 수 있는 할 일이 하나뿐이면
       이 절은 할 일 없이 닫는다: 그 한 줄은 첫 화면과 `다음에 할 일` 이
       이미 들고 있고, 한 종이에서 같은 줄을 네 번 읽게 된다 */
    return mine.find((a) => !ids.has(a.id))
      ?? model.actions.find((a) => !ids.has(a.id)) ?? null;
  };
  /** 첫 화면 할 일 칸이 이미 적은 것 */
  const shownAction = moveNext
    ?? (move === "WRITE_UP" ? writeUp : null)
    ?? (move === "FILL_GAP" ? null : model.actions[0] ?? null);
  /**
   * `지금 할 일` 칸은 **머리 한 줄과 설명 두 줄까지다**(COMMERCIAL FINAL §7).
   *
   * 전에는 이 칸이 할 일 문장 하나를 그대로 들어서, 영역 이름과 재료가
   * 붙은 긴 줄이 세 줄로 벌어졌다. 네 칸 가운데 가장 중요한 칸이 가장
   * 읽기 어려운 칸이 되는 자리다. 세부 차례는 `다음에 할 일` 절이 든다.
   */
  const doHead = shownAction ? actionHeadKo(shownAction)
    : topGap ? "먼저 적어 두기" : moveText;
  const doDetail = shownAction
    ? actionBriefKo(
      shownAction, shownAction.domain ? domainName(core, shownAction.domain) : "",
      shownAction.code === "EXPLORE_BROADLY" ? exploreWhere() : undefined)
    : topGap ? gapNeedKo(topGap, domainName(core, topGap.domain)) : null;
  /**
   * 할 일을 **대상 · 행동 · 남길 결과** 세 문장으로(Gate §6).
   *
   * 전에는 이 칸이 머리 한 줄(`그때 직접 정한 것을 적어 두기`)과 그 영역이
   * 일하는 차례를 이름씨로 늘어놓은 목록을 들었다. 머리는 무엇을 하라는
   * 것인지 말하지 않고, 이름씨 목록은 **명사 나열**이라 할 일로 읽히지
   * 않는다. `actionKo` 가 이미 그 셋을 문장으로 들고 있으므로 여기서는
   * 끊어서 세우기만 한다. **새 문장을 짓지 않는다**
   */
  const doSay = shownAction
    ? actionKo(
      shownAction, shownAction.domain ? domainName(core, shownAction.domain) : "",
      model.stage,
      shownAction.code === "EXPLORE_BROADLY" ? exploreWhere() : undefined).do
      .split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean)
    : [];
  /* 할 일이 있을 때만 적는다. 없는 자리에 이유를 적으면 그 줄이 거짓이 된다 */
  const doWhy = shownAction ? actionWhyKo(shownAction) : null;
  const indAction = packAction(model.industry_context, [shownAction]);
  const roleAction = packAction(model.role_context, [shownAction, indAction]);

  /**
   * **산업 절과 직무 절이 같은 문장으로 열지 않는다**(규격 §10).
   *
   * 두 다리 문장이 모두 `확인된 것 → 이 자리에서 모자란 것` 으로 서는데,
   * 앞엣것이 같은 영역을 가리키면 **첫 문장이 글자까지 같다.** 산업 절을
   * 읽고 바로 직무 절을 읽는 사람이 같은 줄을 두 번 읽는다. 뒤에 서는
   * 절에서 **이미 적은 줄만** 걷는다: 모자란 것은 자리마다 다르므로 그
   * 줄은 그대로 선다.
   */
  const indBridge = model.industry_context
    ? bridgeKo(model.industry_context, industryName(model.industry_context.code),
      (td: string) => domainName(core, td), null, model.stage)
    : [];
  const roleBridge = model.role_context
    ? bridgeKo(model.role_context, roleName(model.role_context.code),
      (td: string) => domainName(core, td), null, model.stage)
      .filter((l) => !indBridge.includes(l))
    : [];

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
  const orgName = (c: string) => orgChoices(core).find((x) => x.code === c)?.name ?? c;
  /* **조직환경(OC)과 기관 유형(ORG)은 다른 층이다.** 앞엣것은 그 일을
     하는 자리의 성격이고 뒤엣것은 그 자리를 가진 기관의 종류다 */
  const orgTypeName = (c: string) =>
    regionLayer().org_types.find((x) => x.code === c)?.label ?? c;
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
    /* **학교가 전달하는 리포트일 때만 장을 나눈다.** 표지와 장 바뀜은
       학교가 보관·전달하는 종이의 모양이고(규격 §14), 개인 결제 종이는
       전과 같은 이어지는 문서다. 한 벌로 묶었더니 선별 등급 종이의
       마지막 장이 16% 만 찼다 */
    <div className={`rs${meta.school ? " is-report" : ""}`}>
      {pilot ? <Track attemptId={attemptId} /> : null}
      <header className="rs-head">
        <div className="rs-head-in">
          {/* **돌아가는 길을 머리에 둔다.** 전에는 맨 아래에만 있어서,
              작업공간에서 결과지로 들어온 사람이 끝까지 내려가야 돌아갈
              수 있었다. 종이에서는 이 줄이 찍히지 않는다(`.rs-back`) */}
          <BrandMark size={20} className="rs-mark" />
          <Link className="rs-back" href="/me">내 CareerMatri</Link>
          {/* **산 것의 이름을 적는다.** 별명(`경험 번역`)은 가격표에도
              결제에도 없는 말이라, 받은 사람이 자기가 무엇을 샀는지
              되짚을 수 없다(규격 §24).
              **학교 진입에는 적지 않는다**: 학생이 고른 값이 아니고 학교가
              산 것이므로, 종이에 상품명처럼 서면 사지 않은 등급 이름으로
              읽힌다. 응시 줄과 스냅샷에는 PRO 가 그대로 적힌다 */}
          {meta.school ? null : <span className="rs-tier">{model.tier}</span>}
          {/* **절 목록을 여기 두지 않는다.** 본문 아홉 절은 아래
              `자세한 내용 보기` 안에 접혀 있어(규격 §9), 접힌 동안 이
              링크들은 눌러도 아무 일이 없다. 절 목록은 펼친 자리 안에
              `ResultNav` 가 들고 있다 */}
        </div>
      </header>

      <main className="rs-main">
        {/*
            ── 종이 표지 ── **화면에는 서지 않는다**(규격 §14).

            전까지 종이는 웹 결과지를 그대로 찍은 것이었다. 받은 학생이
            보관하고 학교가 결과물로 전달하는 자리인데, 첫 장이 바로
            본문이라 **그 종이가 어느 학교의 무슨 문서인지** 혼자서는
            말하지 못했다. 표지가 드는 것은 넷뿐이다: 학교 · 문서 이름 ·
            누구의 어느 학과 · 언제 친 것인가.

            **지어낸 값을 두지 않는다.** 로고도 사진도 점수도 없고, 적는
            것은 전부 응시 줄과 등록부가 이미 들고 있는 값이다.
        */}
        {meta.school ? (
          <section className="rs-cover" aria-hidden="true">
            <div className="rs-cover-top">
              <b>{meta.school}</b>
              <span>CareerMatri</span>
            </div>
            <div className="rs-cover-band">
              <div className="rs-cover-mid">
                <h2>진로 분석 리포트</h2>
                {/* **같은 말을 두 번 적지 않는다.** 갈래 이름이 있으면 전공
                    이름은 그 안에 들어 있다(`경영학과 · 경영 일반 · 경영`) */}
                <p className="rs-cover-who">
                  {[meta.department, meta.specialization ?? meta.major]
                    .filter(Boolean).join(" · ")}
                </p>
                <p className="rs-cover-day">
                  {[`CareerMatri ${model.tier}`,
                    meta.answeredOn ? `${meta.answeredOn} 응답` : null]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>
              {/* **표지에서 Radar 를 뺐다**(규격 §16).
                  앞 판본은 결과지가 쓰는 열두 꼭짓점 격자를 표지에 그대로
                  올렸다. 값이 한 점도 없는 빈 격자인데도, 본문의 Radar 와
                  같은 모양이라 **받은 사람이 거기서 자기 점수를 읽으려
                  했다.** 표지가 먼저 말할 것은 신분이고 그림은 그 뒤다.

                  대신 선 것은 **길 motif** 하나다: 한 행동에서 지원서
                  문장까지 네 마디로 간다는 이 제품의 읽는 차례를 그린
                  것이고, 눈금도 축도 값도 없어서 수로 읽히지 않는다.
                  사진을 쓰지 않는 까닭은 그대로다: 사용권이 확인된 배재대
                  사진이 없고, 사람이 찍힌 사진은 그 자리에서 Evidence 로
                  오해된다 */}
              <svg className="rs-cover-art" viewBox="0 0 200 200" aria-hidden="true">
                <path d="M24 164 C 64 164, 54 112, 94 112 S 136 60, 176 44"
                  fill="none" stroke="#c9d4e3" strokeWidth="1.6"
                  strokeLinecap="round" />
                {[[24, 164], [94, 112], [176, 44]].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={i === 2 ? 5.2 : 3.4}
                    fill={i === 2 ? "#2d6cdf" : "#ffffff"}
                    stroke={i === 2 ? "#2d6cdf" : "#9fb0c7"} strokeWidth="1.4" />
                ))}
                <path d="M24 186 H 176" stroke="#e2e9f2" strokeWidth="1" />
              </svg>
            </div>
            {/* **표지 가운데를 비워 두지 않는다**(규격 §18). 앞 판본은
                제목과 차례 사이가 통째로 비어 덜 만든 종이로 읽혔다.
                여기 적는 셋은 본문이 실제로 답하는 것이고, **값을 적지
                않는다**: 표지에서 결과를 먼저 읽게 하지 않는다 */}
            <ol className="rs-cover-asks">
              <li>지금 무엇이 확인됐는가</li>
              <li>무엇이 더 필요한가</li>
              <li>다음에 무엇을 하면 되는가</li>
            </ol>

            {/* 차례. **쪽 번호를 적지 않는다**: 담긴 양에 따라 밀리는데,
                적어 두면 어긋난 번호가 찍힌다 */}
            {/* **차례가 핵심과 부록을 가른다**(FINAL POLISH §3).
                앞의 여덟이 지금 상태와 다음 행동을 읽는 자리이고, 뒤의 넷은
                되짚어 볼 자료다. 한 줄로 늘어놓으면 열둘이 같은 무게로
                서서, 받은 사람이 **어디까지 읽으면 되는지**를 모른다 */}
            <ol className="rs-cover-toc">
              <li>한눈에 보는 결과</li>
              <li>내가 이미 가진 근거</li>
              <li>먼저 볼 영역</li>
              <li>앞으로 채울 것</li>
              <li>산업·직무 연결</li>
              <li>다음에 할 일</li>
              <li>지원서·면접에서 쓸 문장</li>
            </ol>
            <p className="rs-cover-appx">부록</p>
            <ol className="rs-cover-toc is-appx">
              {/* **그리지 않은 절을 차례에 적지 않는다.** 판단을 물은 영역이
                  셋 미만이면 그래프가 서지 않는다 */}
              <li>전체 기술영역{hasRadar || hasBars ? "과 경험·근거 분포" : ""}</li>
              <li>이 경험을 쓸 곳</li>
              <li>검사에서 고르신 목표</li>
              <li>이 결과를 읽는 기준</li>
            </ol>
            <p className="rs-cover-foot">
              이 리포트는 응답한 내용만으로 만들어집니다. 적성이나 합격
              가능성을 내지 않고, 순위도 매기지 않습니다.
            </p>
          </section>
        ) : null}

        {again ? (
          /* **막는 말만 적지 않는다**(규격 §21). 무슨 일이 일어났는지와
             무엇을 하면 되는지를 함께 적는다 */
          <p className="rs-again" role="status">
            <b>{RETAKE_BLOCKED_KO.title}</b>
            <span>{RETAKE_BLOCKED_KO.body}</span>
            <span>{RETAKE_BLOCKED_KO.how}</span>
          </p>
        ) : null}

        {/* ══════════════════════════════════════════════════════════
            1. HERO — 학생이 쓰고 싶어지는 서비스 화면의 첫 자리.

            리포트의 머리가 아니다. 캐릭터 그림과 큰 한 줄과 칩이 먼저
            보이고, 판정은 작은 알약 하나로 내려간다. 큰 글씨는 **그 사람이
            고른 문장**이고, 분류 이름은 그 아래 칩이다.
            ══════════════════════════════════════════════════════════ */}
        <section className={`rs-hero${heroArt ? "" : " is-noart"}`}>
          <div className="rs-hero-say">
            <p className="rs-who">
              {[meta.school,
                [meta.department, meta.specialization].filter(Boolean).join(" · "),
                meta.answeredOn ? `${meta.answeredOn}` : null]
                .filter(Boolean).join(" · ")}
            </p>
            <p className="rs-badge">{headlineBadgeKo(model)}</p>
            <h1 className="rs-quote">{openLine}</h1>
            {openTags.length ? (
              <ul className="rs-tags">
                {openTags.map((t) => <li key={t}>{t}</li>)}
              </ul>
            ) : null}
            {/* 종이에서만 서는 판정 한 줄 */}
            <p className="rs-verdict">{h.title}</p>
          </div>
          {/* 오른쪽은 그림이다. **왼쪽 큰 글과 한 쌍이고 장식이 아니다.**
              공식 그림을 아직 받지 못했으면 그 칸을 세우지 않는다: 빈
              칸을 남기거나 임시 그림으로 메우면 그것이 제품으로 읽힌다 */}
          {heroArt
            ? <div className="rs-hero-art" aria-hidden="true"><HeroVisual /></div>
            : null}
        </section>

        {/* ══ 2. 지금, 이렇게 활용해보세요 ══
            **같은 크기의 파스텔 카드 셋을 늘어놓지 않는다.** 셋이 같은
            무게로 서면 읽는 사람이 셋을 다 읽고 나서 무엇이 먼저인지
            스스로 정해야 하고, 그 꼴이 곧 대시보드다. 차례는 셋이다:
            ① 내가 해본 경험(글 중심) ② 지금 할 일(이 절에서 **면을 가진
            유일한 자리**) ③ 남긴 근거와 더 채울 부분(작은 보조 정보).
            색도 셋으로 가르지 않는다 — hero 와 같은 말(흰 면 · 찬 회색 ·
            navy · muted cyan)만 쓴다 */}
        <h2 className="rs-band">지금, 이렇게 활용해보세요</h2>
        <section className="rs-use">
          {/* ① 내가 해본 경험. **면도 테도 없다**: 글이 먼저 읽힌다 */}
          <article className="rs-card is-did">
            <p className="rs-card-l">내가 해본 경험</p>
            <p className="rs-card-h">{cardSay || openLine}</p>
            {useWhy ? <p className="rs-card-p">{useWhy}</p> : null}
            {/* **축 이름을 칩으로 깔지 않는다**(Gate §5). `직접 판단 ·
                산출물 · 문제 정의` 는 우리 쪽 분류이고, hero 의 영역 태그
                바로 아래에 또 한 줄이 서면 이 화면의 주인공이 학생의
                경험이 아니라 taxonomy 가 된다. 같은 내용은 윗줄이 말로
                들고, 축마다의 상태는 아래 열두 영역 절이 그대로 든다 */}
          </article>

          {/* ② 지금 할 일. 이 절에서 **면과 테를 가진 자리는 여기 하나**다.
              담는 것은 셋이다: 어떤 경험을 가져올지 · 무엇을 적을지 ·
              적어 두면 무엇이 남는지(Gate §6) */}
          <article className="rs-card is-next">
            <p className="rs-card-l"><i className="rs-ic"><Ic name="list" /></i>지금 할 일</p>
            {doSay.length ? (<>
              <p className="rs-card-h">{doSay[0]}</p>
              {doSay.slice(1).map((x) => <p className="rs-card-p" key={x}>{x}</p>)}
            </>) : (<>
              <p className="rs-card-h">{doHead}</p>
              {doDetail ? <p className="rs-card-p">{doDetail}</p> : null}
            </>)}
            {doWhy ? <p className="rs-gain">{doWhy}</p> : null}
            {/* **단추의 말이 약속한 일을 그 자리에서 한다**(규격 §16) */}
            <form action={takeActionsFromResult}>
              <button className="rs-go" type="submit">
                지금 할 일에 담아두기<Ic name="pen" />
              </button>
            </form>
            {/* **세부 차례를 종이에 한 번 더 적지 않는다.** 아래 `다음에
                할 일` 절이 그 차례를 그대로 들고, 여기 또 적으면 같은 줄이
                한 종이에 두 번 선다 */}
          </article>

          {/* ③ 남긴 근거 · 더 채울 부분. **작은 보조 정보다**: 금 한 줄
              아래에 작은 글로 서고, 위의 둘과 무게를 겨루지 않는다 */}
          <article className="rs-card is-use">
            <div className="rs-sup">
              <p className="rs-card-s">남긴 근거</p>
              {left.length ? (
                <ul className="rs-files">
                  {left.slice(0, 3).map((x) => <li key={x}>{thingKo(x)}</li>)}
                </ul>
              ) : (
                <p className="rs-card-p">남은 결과물을 적어두면 여기가 채워져요.</p>
              )}
            </div>
            <div className="rs-sup">
              <p className="rs-card-s">더 채울 부분</p>
              {/* **모자람을 적지 않는다**(Gate §8). 같은 사실을 다음에 할
                  일로 적는다. 판정은 그대로이고 적는 꼴만 바뀐다 */}
              <p className="rs-card-p">
                {nextStepKo(lackNeed)
                  || "다음 과제에서는 직접 정한 기준을 한 줄만 적어두면 좋아요."}
              </p>
            </div>
          </article>
        </section>

        {/* ══ 3. 이런 직무와 잘 이어져요 ══
            직무명과 한 줄로 끝내지 않는다: 아이콘 · 이름 · **왜 이 경험과
            이어지는지** · 그 쪽이 먼저 정하는 것 · 확인된 축 태그다 */}
        {pathCards.length ? (<>
          <h2 className="rs-band">이런 직무와 잘 이어져요</h2>
          <section className="rs-paths">
            {pathCards.map((c, i) => (
              <article key={c.code} className={`rs-path p${i + 1}`}>
                <span className="rs-path-ic" aria-hidden="true"><Ic name={c.icon} /></span>
                <h3>{c.name}</h3>
                {c.why ? <p className="rs-path-why">{c.why}</p> : null}
                {c.what ? <p>{c.what}</p> : null}
                {c.tags.length ? (
                  <ul className="rs-path-tags">
                    {c.tags.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                ) : null}
              </article>
            ))}
          </section>
          {/* 아직 채울 곳 한 줄은 **위의 `더 채울 부분` 이 든다.** 한
              화면에 같은 문장을 두 번 세우지 않는다 */}
        </>) : null}

        {/* ══ 4. 더 알아보고 싶은 정보 ══
            **기능 이름이 아니라 눌렀을 때 얻는 것을 적는다.** 그리고 여기
            서는 넷은 전부 지금 열려 있는 자리다 */}
        <h2 className="rs-band">더 알아보고 싶은 정보</h2>
        <section className="rs-explore">
          <Link className="rs-ex-a m1" href="/me/experience/new">
            <span className="rs-ex-ic" aria-hidden="true"><Ic name="plus" /></span>
            <b>경험 더 적어보기</b>
            <i>내 결과를 더 구체적으로 만들어요</i>
          </Link>
          <Link className="rs-ex-a m2" href="/me/next">
            <span className="rs-ex-ic" aria-hidden="true"><Ic name="list" /></span>
            <b>할 일 이어서 하기</b>
            <i>오늘 하나만 끝내도 기록이 남아요</i>
          </Link>
          <Link className="rs-ex-a m3" href="/me/explore">
            <span className="rs-ex-ic" aria-hidden="true"><Ic name="compass" /></span>
            <b>산업·직무 둘러보기</b>
            <i>내 경험이 어디에서 쓰이는지 확인해요</i>
          </Link>
          {/* **종이 길은 `Link` 로 걸지 않는다.** Next 가 미리 불러오면
              머리 없는 브라우저가 떠서 종이가 한 벌씩 만들어진다 */}
          <a className="rs-ex-a m4" href={`/v3/${attemptId}/result/pdf`}>
            <span className="rs-ex-ic" aria-hidden="true"><Ic name="file" /></span>
            <b>PDF 로 저장하기</b>
            <i>상담이나 포트폴리오 준비에 써요</i>
          </a>
        </section>

        <section className="rs-banner">
          <div>
            <p className="rs-banner-l">{meta.school ?? "CareerMatri"}</p>
            <p className="rs-banner-h">결과는 저장돼요. 언제든 다시 열어보세요.</p>
            <p className="rs-banner-p">
              경험을 더 적으면 지금 상태가 다시 계산돼요.
            </p>
          </div>
          <Link className="rs-banner-a" href="/me">내 CareerMatri 열기</Link>
        </section>

        {/* 산업·직무 한 줄은 **종이에만** 선다 */}
        <p className="rs-link">
          {linkNames.length ? (<>
            {linkNames.map((x) => <b key={x}>{x}</b>)}
            <span>{linkText}</span>
          </>) : (
            <span>보실 산업과 직무를 아직 고르지 않으셨어요.</span>
          )}
        </p>

        {/* ── 내가 이미 가진 근거 ── **접은 자리 안에 두지 않는다**(규격 §10).
            이 절은 읽는 사람이 결과지에서 가장 먼저 자기를 알아보는
            자리다. 본문 아홉 절과 함께 `자세한 내용 보기` 안에 접어 두면,
            펼치지 않은 사람은 **자기가 이미 가진 것을 한 줄도 못 보고**
            비어 있는 자리와 할 일만 읽는다 */}
        {deep ? (
          <section className="rs-sect" id="evidence">
            {/* **쪽마다 답하는 질문 하나**(COMMERCIAL FINAL §10). 종이에서만 선다:
              화면은 절 머리와 첫 화면 넷이 그 일을 이미 하고 있어서, 여기에
              한 줄을 더 세우면 같은 말이 두 번 선다 */}
            <p className="rs-q">지원서에서 꺼내 쓸 경험은 무엇인가</p>
            <h2>내가 이미 가진 근거</h2>
            {/* **기본은 먼저 쓸 것 셋까지다**(규격 §13). 전에는 큰 카드 둘에
                긴 설명과 고르신 항목이 여섯씩 깔려 이 절 하나가 종이 반 장을
                먹었다. 바로 꺼내 쓸 수 있는 쪽만 한 줄씩 적고, 갈라 보는
                자리는 아래로 접는다 */}
            {model.evidence.ready.length ? (
              /* **축 목록을 이 절의 첫 줄에 두지 않는다**(R2 §9·§18).
                 전에는 `경영전략·기획 조건과 기준값을 직접 정함` 처럼 축
                 이름을 풀어 쓴 세 줄이 먼저 섰다. 그 셋은 우리 쪽 분류를
                 문장으로 바꾼 것이라, 이 절에서 가장 먼저 읽히는 자리가
                 **학생의 경험이 아니라 taxonomy** 였다. 바로 아래 네 단계가
                 같은 영역을 그 사람이 고른 말로 풀고 있으므로 이 자리는
                 그 넷으로 들어가는 한 줄만 든다. 축마다의 상태는 아래 열두
                 영역 절이 한 자리에서 그대로 든다 */
              /* **결과지가 자기 구조를 설명하지 않는다**(Gate §2). 몇
                 줄인지 · 어떤 차례로 만들어졌는지는 우리 쪽 사정이고,
                 학생이 알아야 하는 것은 이 자리에서 무엇을 얻는가다 */
              /* **전부 왼쪽으로만 흐르지 않게 한다**(R6 §7). 들머리 한
                 줄은 가운데에 넓게 서고, 본문은 왼쪽으로 읽힌다 */
              <p className="rs-ev-intro">
                여기 있는 건 전부 직접 하신 일이에요. 지원서 쓸 때
                여기서 꺼내 쓰면 돼요.
              </p>
            ) : (
              <>
                {/* **가리키는 줄이고 할 일이 아니다.** `…부터 보세요` 로 적어
                    두었더니 `할 일에 남길 결과물이 적혀 있다` 를 세는 자리가
                    이 줄을 할 일로 보고 결과지 마흔 벌에서 걸었다. 여기서
                    남길 것을 적을 수는 없다: 어느 영역인지가 아직 없다 */}
                <p className="rs-note">
                  지금 바로 꺼내 쓸 경험은 아직 없어요. 아래 &lsquo;다음에 할
                  일&rsquo;부터 보시면 돼요.
                </p>
                {/* **그 학과 학생이 낼 수 있는 근거를 적는다**(갈래 계약의
                    `examples.evidence`). 아직 아무것도 확인되지 않은 사람에게
                    `없습니다` 만 적으면 **무엇을 하면 적히는지**가 종이
                    어디에도 없다. 지어내지 않는다: 등록부에 그 학과로 적어 둔
                    목록이고, 여기서 판정에 넣지 않는다 */}
                {sv.evidence.length ? (
                  <>
                    <p className="rs-note">이런 걸 해보면 여기에 적혀요.</p>
                    <ul className="rs-first">
                      {sv.evidence.slice(0, 3).map((t) => <li key={t}>{t}</li>)}
                    </ul>
                  </>
                ) : null}
              </>
            )}
            {/* ── Evidence 사슬(규격 §11) ──
                **항목을 늘어놓는 것으로는 차별점이 서지 않는다.** 이
                제품이 파는 자리는 한 행동이 지원서 문장이 되기까지의
                이음매라서, 네 칸을 그 차례 그대로 세운다:
                한 행동 → 직접 정한 기준 → 남긴 결과 → 지원서·면접 활용.
                **새 값을 만들지 않는다**: 네 칸이 전부 결과 모델의
                `did` · `decided` · `artifacts` · `verifications` 에서
                그대로 오고, 비어 있는 칸은 비었다고 적는다 */}
            {chains.length ? (
              <div className="rs-chain">
                {chains.map((c, i) => {
                  /* **경험 둘을 같은 틀로 복사하지 않는다**(R6 §6 · R7
                     PRIORITY 3). 자료 구조는 같아도 **읽는 리듬은 같을
                     까닭이 없다.**

                       경험 1  한 일 + 직접 정한 것을 한 문장 → 남은 것
                               한 줄 → 둥근 cyan 면에 쓰는 자리 둘
                       경험 2  한 일 한 문장 → **남긴 것을 가운데 크게**
                               → 직접 정한 것 한 줄 → 금 아래 짧은 두 줄

                     문장 골격도 자리마다 다르다(`evidenceUsePartsKo` 의
                     `slot`): 시작도 끝도 갈려서 명사만 바꾼 같은 문장으로
                     읽히지 않는다 */
                  const lead = i === 0;
                  const use = c.decided || c.left
                    ? evidenceUsePartsKo(core, c.code, c, lead ? "lead" : "second")
                    : null;
                  /* **한 경험이 한 이야기로 읽혀야 한다**(R6 §3·§11). 첫
                     경험은 `A고, B어요` 로 한 장면을 만들고, 둘째 경험은
                     한 일 한 문장만 세운다. 말끝도 갈라 둔다: 둘 다
                     `~적었어요` 로 닫히면 한 틀을 찍은 것으로 읽힌다 */
                  const story = lead
                    ? pickSentenceKo([c.did, c.decided].filter(Boolean) as string[])
                    : c.did ? `${sayKo(c.did, "kept")}.`
                      : c.decided ? decidedLineKo(c.decided) : "";
                  const keep = c.left ? thingKo(c.left) : null;
                  return (
                  <article key={c.code} className={`rs-ev-x${lead ? " is-lead" : " is-second"}`}>
                    {/* 작은 metadata. **머리글이 아니다**: 이 묶음에서 가장
                        먼저 읽히는 것은 그 사람의 경험 한 문장이다 */}
                    <p className="rs-ev-of">
                      {domainName(core, c.code)}
                      {lead ? <i>지원서에 먼저 쓸 경험</i> : null}
                    </p>
                    {story ? <p className="rs-ev-story">{story}</p> : null}
                    {lead ? (
                      /* **이름표를 세우지 않는다**(R7). `남은 결과 /
                         목표와 지표를 정리한 표` 두 줄이던 것을 **무엇이
                         남아 있는가** 한 줄로 적는다 */
                      <p className="rs-ev-kept">
                        {c.left ? keptLineKo(c.left)
                          : "지금은 남은 게 없어요. 다음 과제에서 한 장만 남겨두면 좋아요."}
                      </p>
                    ) : (<>
                      {/* 둘째 경험의 주인공은 **남긴 것**이다. 가운데로
                          들어 첫 경험과 읽는 결을 가른다(R6 §6·§7) */}
                      {keep ? <p className="rs-ev-keep"><b>{keep}</b></p> : null}
                      {c.decided ? (
                        <p className="rs-ev-line">{decidedLineKo(c.decided)}</p>
                      ) : null}
                    </>)}
                    {/* **쓰는 자리를 한 단 세게 둔다**(R6 §5). 다만 같은
                        cyan 상자를 경험마다 복사하지 않는다: 첫 경험은
                        둥근 면이고 둘째 경험은 금 한 줄 아래 눕는다 */}
                    <div className={`rs-ev-use${lead ? "" : " is-flat"}${use ? "" : " is-empty"}`}>
                      {lead ? (
                        <p className="rs-ev-ul">이 경험을 이렇게 써볼 수 있어요</p>
                      ) : null}
                      {use ? (
                        <dl className="rs-ev-two">
                          <div><dt>지원서</dt><dd>{use.resume}</dd></div>
                          <div><dt>면접</dt><dd>{use.interview}</dd></div>
                        </dl>
                      ) : (
                        <p className="rs-ev-p">
                          {!c.decided ? "그때 무엇을 직접 골랐는지" : "무엇이 남았는지"}
                          {" "}한 줄만 더 적으면 지원서에서 이 이야기를 쓸 수 있어요.
                        </p>
                      )}
                    </div>
                  </article>
                  );
                })}
                {restReady.length ? (
                  <p className="rs-note">{moreReadyKo(restReady)}</p>
                ) : null}
                <p className="rs-note">
                  문장으로 옮길 때는 아래 <a href="#translation">지원서·면접에서 쓸 문장</a>을
                  같이 펼쳐 두면 좋아요.
                </p>
              </div>
            ) : null}
            {/* **그 전공에서 흔히 남기는 것**(갈래 계약의 `examples.artifacts`).
                등록부에 적혀 있었고 어느 화면도 읽지 않았다. 적어 두고 읽지
                않으면 적어 두지 않은 것과 같다.
                **판정에 넣지 않는다**: 위 네 단계의 `남아 있는 결과` 는 그
                사람이 고른 항목이고, 이 줄은 **그 학과라면 무엇이 그 칸에
                들어가는가**를 적은 보기다. 그래서 묶음을 따로 두고 이름도
                갈라 둔다. 네 단계 뒤에 두는 까닭은 **그 넷이 한 이야기로
                이어져 읽혀야** 하기 때문이다(COMMERCIAL FINAL §9) */}
            {sv.artifacts.length ? (
              <div className="rs-pack" id="deptartifacts">
                <h3>{meta.specialization ?? meta.major} 쪽에서 흔히 남기는 것</h3>
                <p className="rs-note">
                  이 가운데 하나라도 손에 있으면 위의 ‘남아 있는 결과’ 가
                  채워집니다.
                </p>
                <ul className="rs-first">
                  {sv.artifacts.slice(0, 4).map((t) => <li key={t}>{thingKo(t)}</li>)}
                </ul>
              </div>
            ) : null}
            <Disclose label="전체 보기">
            <div className="rs-ev">
              <section>
                <h3>지원서에서 설명할 수 있는 경험</h3>
                <p>직접 정한 것으로 확인됐고, 고르신 근거가 함께 있는 자리입니다.</p>
                {model.evidence.ready.length ? (<>
                  {model.evidence.ready.slice(0, 6).map((e) => (
                    <EvidenceRow key={`${e.domain}.${e.axis}`} core={core} domain={e.domain}
                      axis={e.axis} state={e.state} picks={e.picks} own />
                  ))}
                  {model.evidence.ready.length > 6 ? (
                    <p className="rs-none rs-evmore">
                      이 밖에 {model.evidence.ready.length - 6}가지가 더 확인됐습니다.
                      위의 영역별 설명에서 보실 수 있어요.
                    </p>
                  ) : null}
                {/* **`아직 없습니다` 로 끝내지 않는다**(COMMERCIAL GOLD
                    MASTER §11). 사실은 그대로 적되 그 자리에서 무엇을
                    하면 채워지는지로 잇는다 */}
                </>) : (
                  <p>
                    지금 바로 꺼내 쓸 자리는 아직 없습니다. 아래
                    ‘다음에 할 일’ 가운데 하나를 끝내면 이 칸이 먼저
                    채워집니다.
                  </p>
                )}
              </section>
              <section>
                <h3>경험은 있지만 설명 근거를 더 붙일 부분</h3>
                <p>해 본 것은 확인됐고, 어디까지 직접 정했는지가 덜 적힌 자리입니다.</p>
                {model.evidence.partial.length ? (<>
                  {model.evidence.partial.slice(0, 6).map((e) => (
                    <EvidenceRow key={`${e.domain}.${e.axis}`} core={core} domain={e.domain}
                      axis={e.axis} state={e.state} picks={e.picks} />
                  ))}
                  {model.evidence.partial.length > 6 ? (
                    <p className="rs-none rs-evmore">
                      이 밖에 {model.evidence.partial.length - 6}가지가 더 있어요.
                    </p>
                  ) : null}
                </>) : (
                  <p>
                    여기에 걸린 자리는 지금 없습니다. 해 본 일이 확인된
                    영역에서 어디까지 직접 정했는지를 적으면 이 칸이
                    생깁니다.
                  </p>
                )}
              </section>
            </div>
            </Disclose>
            {/* **같은 사실을 두 번 적지 않는다**(§A-6). 위가 꺼내 쓸 자리를
                문장으로 적고, 이 표는 그 자리가 어느 영역에서 무엇으로
                섰는지를 한 눈에 보인다. 개수를 더하거나 점수로 바꾸지
                않는다 */}
            {/* **열두 줄짜리 표를 기본으로 펼쳐 두지 않는다**(규격 §10).
                이 표가 드는 것은 **되짚어 보실 자리**이고, 손전화에서
                펼쳐 두면 첫 화면이 창의 여섯 배를 넘는다(`v3:result:height`
                가 그 자리에서 걸렸다). 담긴 것은 그대로고 종이에서는
                펴진다 */}
            <Disclose label="근거가 어디에 어떻게 남아 있는가">
              <EvidenceMatrix model={model} name={(c) => domainName(core, c)} />
            </Disclose>
          </section>
        ) : null}


        {model.response_quality.flag !== "OK" ? (
          <p className="rs-flag">
            {QUALITY_KO[model.response_quality.flag as keyof typeof QUALITY_KO]}
          </p>
        ) : null}

        {/* ── 여기부터가 근거다 ──
            **웹 결과지는 행동 화면이고 그 아래가 문서다**(규격 §9).
            전에는 이 자리부터 아홉 절이 늘 펼쳐져 있어 쪽이 1만 px 을
            넘었고, 첫 화면에서 답한 셋을 다시 확인하려면 그 열 뼘을 지나야
            했다. 종이에서는 이 자리가 저절로 펴진다 */}
        {/* **첫 화면에서 수를 세워 두지 않는다**(규격 §11).
            `확인된 판단 24 · 직접 정한 것 24 · 고르신 근거 60` 은 다음에
            무엇을 할지 정하는 데 쓰이지 않는 수인데, 접힌 줄의 오른쪽에
            적어 두면 첫 화면에서 가장 큰 숫자가 된다. 수는 펼친 안쪽
            첫 줄이 든다 */}
        <Detail
          label="자세한 내용 보기"
          note="전체 기술영역과 근거와 다음에 할 일">

        <ResultNav />

        {/* ── 먼저 볼 영역 ── 그 영역을 한 자리에서 끝낸다 */}
        <section className="rs-sect" id="focus">
          <h2>먼저 볼 영역</h2>
          <p className="rs-note">
            {focus.length
              ? "응답에서 확인된 내용만 정리했습니다."
              : "지금 응답만으로는 어느 영역이 앞선다고 보기 어렵습니다. 아래 전체 영역에서 한 가지를 골라 짧게 해 보고, 무엇을 했고 무엇을 정했는지 다섯 줄로 적어보세요."}
          </p>
          {focus.map((d, i) => (
            <DomainPanel key={d.code} core={core} d={d} showAxes={deep}
              sameZone={i > 0 && focus[i - 1].zone === d.zone}
              gap={gapFor(d.code)} action={actionFor(d.code)} stage={model.stage} />
          ))}
          {compare.length ? (
            <>
              <h2 className="rs-h2b">같이 놓고 볼 영역</h2>
              <p className="rs-note">
                먼저 볼 영역과 같은 상태이거나 바로 다음입니다. 차례를 매기지 않았습니다.
              </p>
              {compare.map((d, i) => (
                <DomainPanel key={d.code} core={core} d={d} showAxes={deep}
                  sameZone={i > 0 && compare[i - 1].zone === d.zone}
                  gap={gapFor(d.code)} action={actionFor(d.code)} stage={model.stage} />
              ))}
            </>
          ) : null}
        </section>


        {/* ── 비어 있는 자리 ── 빨간 목록으로 만들지 않는다.
            **여덟 축을 묻지 않은 응시에는 이 절을 두지 않는다**: 안 물어본
            것을 `비어 있지 않습니다` 라고 적으면 거짓이 된다 */}
        {deep ? (
          <section className="rs-sect" id="gaps">
            {/* **쪽마다 답하는 질문 하나**(COMMERCIAL FINAL §10). 종이에서만 선다:
              화면은 절 머리와 첫 화면 넷이 그 일을 이미 하고 있어서, 여기에
              한 줄을 더 세우면 같은 말이 두 번 선다 */}
            <p className="rs-q">무엇을 더 채우면 되는가</p>
            <h2>앞으로 채울 것</h2>
            {/* **빈자리가 0 인 까닭이 둘이다**(규격 §8).
                하나는 다 채운 사람이고, 하나는 **빈자리를 셀 만큼 해 본
                일이 아직 없는 사람**이다. 전에는 둘을 한 문장으로 적어서,
                경험이 하나도 없는 응시자가 `완전히 비어 있는 축은
                없습니다. 남은 일은 확인된 경험을 설명 문장으로 만드는
                쪽입니다` 를 받았다. 바로 위 절은 같은 사람에게 `지금 바로
                꺼내 쓸 경험은 아직 없습니다` 를 적고 있었다 — 한 종이에서
                두 문장이 서로를 부순다.
                까닭은 모델이 이미 들고 있다(`first_move`). 여기서 다시
                판정하지 않고 그 값을 읽는다 */}
            <p className="rs-note">
              {model.gaps.length
                ? "무엇이 비었는지와 그것이 왜 필요한지를 적었습니다."
                  + " 할 일은 아래 ‘다음에 할 일’ 에 영역별로 모았습니다."
                : move === "WRITE_UP"
                  ? "완전히 비어 있는 축은 없습니다. 남은 일은 확인된 경험을 설명 문장으로 만드는 쪽입니다."
                  : "지금 응답만으로는 비어 있는 축을 셀 만큼의 경험이 모이지 않았습니다."
                    + " 아래 ‘다음에 할 일’ 의 첫 줄부터 해 보시면 됩니다."}
            </p>
            {/* **같은 까닭을 세 번 적지 않는다**(규격 §4). 같은 종류의
                빈자리는 까닭이 글자까지 같고, 카드마다 되풀이되면 세 칸이
                기계가 찍어 낸 표로 읽힌다. 바로 앞 카드와 같으면 비운다 */}
            {(() => {
              /**
               * **영역만 바뀐 같은 빈자리를 칸마다 다시 적지 않는다**(규격 §10).
               *
               * 같은 종류의 빈자리가 영역 셋에 있으면 제목과 까닭과 할 일이
               * 셋 다 글자까지 같다. 전에는 까닭만 비웠는데, 그러면 제목과
               * 할 일이 그대로 세 번 서서 **기계가 찍어 낸 표**로 읽힌다.
               * 한 칸으로 묶고 영역 이름을 나란히 적는다: 정보는 그대로다.
               */
              const MARK = "\u0000";
              const key = (g: Gap) => {
                const k = gapKo(g, MARK);
                const act = model.actions.find((x) => x.id === g.action_id);
                return `${k.title}|${k.why}|${act ? actionKo(act, MARK, stage).do : ""}`;
              };
              const merged: { key: string; list: Gap[] }[] = [];
              for (const g of model.gaps.slice(0, 8)) {
                const k = key(g);
                const hit = merged.find((m) => m.key === k);
                if (hit) hit.list.push(g);
                else merged.push({ key: k, list: [g] });
              }
              /* **같은 까닭은 그 절에서 한 번만 적는다**(규격 §10).
                 바로 앞 칸과만 견주던 것을 절 전체로 넓혔다: 종류가 다른
                 빈자리 둘이 같은 까닭을 들고 있으면(남은 결과물 · 비교와
                 검증) 사이에 다른 칸이 끼어 **같은 문장이 두 번** 섰다 */
              const saidWhy = new Set<string>();
              return merged.map(({ list }) => {
                const g = list[0];
                const names = list.map((x) => domainName(core, x.domain)).join(" · ");
                const k = gapKo(g, names);
                const sameWhy = saidWhy.has(k.why);
                saidWhy.add(k.why);
                return (
                  <article className="rs-gap" key={g.id}>
                    <h3>{k.title}</h3>
                    {sameWhy ? null : <p>{k.why}</p>}
                    {/* **할 일 문장은 이 절에 적지 않는다**(규격 §10).
                        바로 아래 `다음에 할 일` 이 영역마다 같은 문장을
                        들고 있고, 첫 화면과 산업·직무 절도 하나씩 든다.
                        그대로 두면 한 종이에서 같은 줄을 세 번 읽는다.
                        **칸마다 `아래에 있습니다` 를 적지도 않는다**: 그
                        안내가 빈자리 수만큼 서면 그것이 또 되풀이다. 절
                        머리에 한 번 적는다. 이 절이 맡는 것은 무엇이
                        비었는지와 왜 필요한지까지다 */}
                  </article>
                );
              });
            })()}
          </section>
        ) : null}

        {/* ── 산업과 역할 ──
            같은 근거를 그 말로 다시 읽는다. **설명을 한 번 더 하지 않는다**:
            제목이 이미 `연결하면` 이라고 말하고 있다 */}
        {model.industry_context ? (
          <section className="rs-sect" id="industry">
            {/* **쪽마다 답하는 질문 하나**(COMMERCIAL FINAL §10). 종이에서만 선다:
              화면은 절 머리와 첫 화면 넷이 그 일을 이미 하고 있어서, 여기에
              한 줄을 더 세우면 같은 말이 두 번 선다 */}
            <p className="rs-q">이 경험이 어느 산업으로 이어지는가</p>
            {/* **산업을 직무라고 적지 않는다.** 반도체는 산업이고 설계는
                직무다. 한 말로 적으면 둘의 층이 같아 보인다 */}
            <h2>{industryName(model.industry_context.code)} 쪽에 연결하면</h2>
            {/* **네 카드를 한 이야기로 잇는다.** 확인된 것 → 이 산업을
                보려면 모자란 것 → 다음에 할 일이 한 문단이다. 전에는 넷이
                따로 서서, 네 번 읽고도 `그래서 무엇이 더 필요한가` 가 한
                문장으로 서지 않았다 */}
            {/* **할 일을 이 문단에 한 번 더 넣지 않는다**(규격 §10).
                바로 아래 `다음에 만들 근거` 가 같은 문장을 글자까지 같게
                들고 있어서, 한 절에서 같은 할 일을 두 번 읽게 됐다. 이
                문단이 맡는 것은 확인된 것과 이 산업에서 모자란 것까지다 */}
            <p className="rs-bridge">{indBridge.join(" ")}</p>
            <p className="rs-note">
              같은 경험을 {industryName(model.industry_context.code)}에서 쓰는
              표현으로 놓았습니다. 맞는다거나 맞지 않는다고 판정하지 않습니다.
            </p>
            <PackBody v={model.industry_context}
              name={industryName(model.industry_context.code)}
              domainName={(td: string) => domainName(core, td)} say={say}
              action={indAction} />
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
            {roleBridge.length
              ? <p className="rs-bridge">{roleBridge.join(" ")}</p> : null}
            <p className="rs-note">
              같은 경험을 {roleName(model.role_context.code)}에서 먼저 읽는 차례로
              놓았습니다. 기술영역 결과는 그대로입니다.
            </p>
            <PackBody v={model.role_context}
              name={roleName(model.role_context.code)}
              domainName={(td: string) => domainName(core, td)} say={say}
              action={roleAction} />
            {model.role_context.compare_with.length ? (
              <p className="rs-others">
                같이 놓고 보실 직무 {model.role_context.compare_with
                  .map((c) => roleName(c)).join(" · ")}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* ── 다음에 할 일 ── */}
        <section className="rs-sect" id="plan">
            {/* **쪽마다 답하는 질문 하나**(COMMERCIAL FINAL §10). 종이에서만 선다:
              화면은 절 머리와 첫 화면 넷이 그 일을 이미 하고 있어서, 여기에
              한 줄을 더 세우면 같은 말이 두 번 선다 */}
            <p className="rs-q">지금 무엇부터 하면 되는가</p>
          <h2>다음에 할 일</h2>
          {model.actions.length ? (<>
            <p className="rs-note">
              그 영역에서 실제로 할 수 있는 한 걸음으로 적었습니다.
            </p>
            {/* **새 Action 을 만들지 않는다**(§13). 네 칸이 전부 위
                목록과 같은 할 일에서 오고, 다른 것은 **언제 할 수 있는
                일인가**로 묶어 차례를 보인 것뿐이다 */}
            <ActionRoadmap model={model} name={(c) => domainName(core, c)} />
            <Plan core={core} actions={model.actions} stage={model.stage}
              attemptId={attemptId} saved={saved} where={exploreWhere()} />
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

          {/* ── 그 전공의 한 걸음과 지원서·면접(갈래 계약 · 규격 §10·§11) ──
              **위의 할 일을 덮지 않는다.** 저쪽은 응답이 가리킨 영역에서
              나온 것이고 이 묶음은 **그 학과라면 어디에서 무엇을 정하고
              무엇을 남기면 되는지**다. 둘을 한 자리에 섞으면 어느 것이 내
              응답에서 나온 말인지 읽는 사람이 가를 수 없어서, 묶음을 따로
              두고 머리에 전공 이름을 적는다.
              **면접 답을 적어 주지 않는다**: 적는 것은 무엇을 묻는 자리인가
              까지이고 거기 들어갈 말은 그 사람이 고른 항목에서 나온다 */}
          {(sv.evidenceFirst || sv.application.resume) ? (
            <div className="rs-pack" id="deptnext">
              <h3>{meta.specialization ?? meta.major} 쪽에서 지금 할 수 있는 한 걸음</h3>
              {sv.evidenceFirst ? (
                <ul className="rs-first">
                  <li>{sv.evidenceFirst}</li>
                  {sv.evidenceNext ? <li>{sv.evidenceNext}</li> : null}
                </ul>
              ) : null}
              {sv.application.resume ? (
                <>
                  <h3>그 경험을 지원서에서 꺼내는 자리</h3>
                  <p className="rs-note">{sv.application.resume}</p>
                </>
              ) : null}
              {sv.application.interview.length ? (
                <>
                  <h3>면접에서 같은 구조로 되묻는 자리</h3>
                  <ul className="rs-first">
                    {sv.application.interview.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* **지원서·면접은 할 일 다음이다**(COMMERCIAL GOLD MASTER §15).
            읽는 차례가 `연결해볼 산업·직무 → 지금 할 일 → 지원서·면접에서
            활용하기` 라, 문장 만드는 자리를 할 일 앞에 두면 아직 하지도
            않은 일을 적는 차례가 된다 */}
        {model.translation
          ? <Translation view={model.translation} major={meta.major ?? "이 전공"} />
          : null}

        {/* ── 결과 다음에 갈 자리 ──
            **이어지는 자리를 여섯 장짜리 메뉴판으로 두지 않는다**(규격 §7).
            전에는 같은 무게의 카드 여섯이 격자로 서서, 다 읽은 사람이
            **어디를 먼저 누를지 고르는 일**을 한 번 더 했다. 그 자리는
            결과지의 마지막 인상이라 메뉴판이 서면 이 제품이 결과를 나눠
            주는 곳으로 읽힌다. 이어지는 자리는 하나다 */}
        {/* **종이에는 이어지는 길을 세우지 않는다**(상용화 PHASE 0).
            여기 선 것은 전부 눌러서 가는 자리라 뽑아 둔 종이에서는 밑줄
            친 글자 목록으로만 남고, 마지막 쪽을 한 장 더 늘린다. 종이가
            끝나는 자리는 해석 기준이다 */}
        <section className="rs-sect rs-webonly" id="next">
          <h2>이 다음에</h2>
          <div className="rs-cta">
            <p>
              이 결과는 그날의 기록으로 굳어 있습니다. 여기서부터는 경험을
              더하면서 현재 상태를 이어서 보실 수 있습니다.
            </p>
            <Link className="rs-cta-main" href="/me">내 CareerMatri에서 계속하기</Link>
            {/* **거드는 길은 줄로 적는다.** 테를 두르고 설명을 붙이면 그
                순간 주된 길과 같은 무게가 된다. 담긴 자리는 그대로고
                무게만 내려간다 */}
            <ul className="rs-cta-sub">
              <li><Link href="/me/state">현재 상태</Link></li>
              <li><Link href="/me/experience/new">경험 추가</Link></li>
              <li><Link href="/me/next">지금 할 일</Link></li>
              <li><Link href="/me/explore">산업·직무</Link></li>
              {/* **종이 길은 `Link` 로 걸지 않는다.** Next 가 화면에 들어온
                  `Link` 를 미리 불러오는데, 그 길은 머리 없는 브라우저를
                  띄워 종이를 만드는 자리다. 아래까지 내려 읽기만 해도
                  종이가 한 벌씩 만들어졌다 */}
              <li><a href={`/v3/${attemptId}/result/pdf`}>PDF 저장</a></li>
            </ul>
            {/* **준비 중인 것을 카드로 세우지 않는다**(규격 §7). 테를
                두르면 그 순간 있는 기능처럼 보인다 */}
            <p className="rs-cta-note">CareerMatri Track 은 준비 중입니다.</p>
          </div>
        </section>

        {/* ══ 여기서 핵심 리포트가 끝난다 ══
            **지우지 않고 뒤로 보낸다**(FINAL POLISH §3).

            앞까지가 학생이 자기 상태와 다음 행동을 읽는 자리이고, 여기부터는
            **되짚어 볼 자료**다. 전에는 열두 영역 전체와 지역·기관 목록이
            본문 한가운데에 있어서, 결과를 연 사람이 `그래서 무엇을 하면
            되는가` 에 닿기까지 가장 긴 두 덩이를 지나야 했다.

            **담긴 글을 한 줄도 덜어내지 않았다.** 차례만 바뀌고 종이에서는
            이 머리가 부록의 시작을 적는다 */}
        <section className="rs-sect rs-appx-head" id="appendix">
          <h2>부록</h2>
          <p className="rs-note">
            여기서부터는 참고 자료입니다. 앞의 내용만으로도 지금 상태와 다음
            행동을 확인하실 수 있습니다.
          </p>
        </section>

        {/* ── 경험·근거 분포 ──
            **그래프는 재는 층이 아니라 읽기 쉽게 다시 그리는 층이다**(§0).
            축마다 표시값이 무엇을 뜻하는지는 `PCU_PREMIUM_VISUAL.md` A절에
            먼저 적었고, 여기 서는 값은 전부 결과 모델이 이미 들고 있는
            상태와 개수다. 적성 순위도 직무 적합도도 만들지 않는다 */}
        {deep ? (
          <section className="rs-sect" id="spread">
            {/* **쪽마다 답하는 질문 하나**(COMMERCIAL FINAL §10). 종이에서만 선다:
              화면은 절 머리와 첫 화면 넷이 그 일을 이미 하고 있어서, 여기에
              한 줄을 더 세우면 같은 말이 두 번 선다 */}
            <p className="rs-q">이번 응답에서 무엇이 확인됐는가</p>
          {/* **글이 먼저고 그림이 뒤다**(GOLD MASTER §14·§15).
              전에는 이 절이 레이더로 열려서, 결과를 연 사람이 가장
              먼저 보는 본문이 **분포 그림**이었다. 그림은 재는 층이
              아니라 읽기 쉽게 다시 그리는 층이라 주인공이 아니다.
              지금 차례는 열두 영역이 지금 어디에 있는가를 글로 먼저
              적고, 그 다음에 같은 것을 그림으로 되짚는다 */}
          {/* ── 열두 영역 ──
              **네 축만 물은 응시에 근거 묶음을 보여주지 않는다.** 묶음 이름에
              `근거를 더 만들어야 하는 영역` 이 들어 있어서, 근거를 묻지 않은
              응시에 그대로 세우면 재지 않은 것을 판정으로 적는 셈이다 */}
          <div className="rs-sub" id="zones">
            {/* **절을 둘로 읽히게 두지 않는다.** 아래 그림이 이 덩이를
                그림으로 되짚는 자리라, 둘이 한 절 안에 선다 */}
            {/* 이 절의 머리다. **그림이 아니라 글이 절을 연다**(§15) */}
            <h2>전체 기술영역이 지금 어디에 있는가</h2>
            <p className="rs-note">
              {deep
                ? "순위가 아니라 현재 상태를 보여드립니다."
                : "관심과 배울 뜻에 답하신 내용으로만 묶었습니다."}
            </p>
            {/* **기본 Reading Path 를 다섯으로 제한한다**(규격 §2).
                기본 화면이 답하는 것은 지금 확인된 것 · 지금 할 일 · 먼저
                채울 것 · 산업·직무 연결 · 먼저 볼 기술영역까지다. 열두 영역을
                묶음별로 늘어놓은 이 목록은 **되짚어 보실 자리**라, 펼쳐 두면
                읽는 흐름이 여기서 한 번 끊긴다. 담긴 것은 그대로고 종이에서는
                펴진다 */}
            <Disclose label="전체 기술영역 상태 보기">
            <div className="rs-zones">
              {deep ? zoneRows.filter((r) => r.list.length).map(({ z, list }) => (
                <section key={z}>
                  <h3>{ZONE_TITLE_KO[z]}</h3>
                  <p>{ZONE_LEAD_KO[z]}</p>
                  <ul>{list.map((c) => <li key={c}>{domainName(core, c)}</li>)}</ul>
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
                          <b>{domainName(core, c)}</b>
                          <span>{domainChainKo(core, c).join(" → ")}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul>{bg![k].map((c) => <li key={c}>{domainName(core, c)}</li>)}</ul>
                  )}
                </section>
              ))}
              {/* **빈 묶음의 이름을 늘어놓지 않는다**(COMMERCIAL GOLD
                  MASTER §11). 한 줄로 모으기는 했는데, 그 한 줄이 `경험은
                  있고 근거가 더 필요한 영역 · 해 봤지만 지금 관심이 낮은
                  영역 · 아직 이야기할 재료가 적은 영역 — 해당하는 영역이
                  없습니다` 였다. 읽는 사람이 받는 것은 **자기 결과가 아니라
                  우리 분류표**이고, 끝이 `없습니다` 라 빈손으로 읽힌다.
                  **사실은 숨기지 않는다**: 걸린 곳이 없다는 것을 적고 그
                  다음에 볼 자리로 잇는다 */}
              {deep && zoneRows.some((r) => !r.list.length) ? (
                <p className="rs-zempty">
                  나머지 묶음에 걸린 영역은 지금 없습니다.
                  더 채울 곳은 ‘앞으로 채울 것’ 에 적혀 있습니다.
                </p>
              ) : null}
              {deep && model.overview.not_explored.length ? (
                <section>
                  <h3>{ZONE_TITLE_KO.NOT_EXPLORED}</h3>
                  <p>이번 응시에서 묻지 않은 영역입니다. 경험이 없다는 뜻이 아닙니다.</p>
                  <ul>{model.overview.not_explored.map((c) => <li key={c}>{domainName(core, c)}</li>)}</ul>
                </section>
              ) : null}
            </div>
            </Disclose>
            {/* **고르신 쪽을 돌려드린다.** 격자에 고르게 답하신 분께는
                `차이가 없습니다` 만 남는데, 그 분이 묶인 둘 가운데 한쪽을
                두 번 고르셨다. 차례로 적지 않고 고른 것으로 적는다 */}
            {model.overview.tied_pick.length ? (
              <p className="rs-zempty">
                {`영역 훑기에서 같은 값으로 답하신 둘을 놓고 ${model.overview.tied_pick
                  .map((c) => domainName(core, c)).join(" · ")} 쪽을 고르셨습니다. `}
                위의 묶음은 그 선택과 상관없이 응답에서 나온 것입니다.
              </p>
            ) : null}
            {/* **영역에 걸치지 않는 판단을 버리지 않는다.** 공통 판단과 학위
                묶음은 기술영역이 없어서 위의 열두 영역에 들어갈 자리가 없다.
                그렇다고 떨어뜨리면 박사와 포닥이 가장 많이 답한 자리가 결과지에
                한 글자도 나오지 않는다 */}
            {cm.owned.length || cm.confirmed.length ? (
              /* **기본 본문에서 내린다**(규격 §12). 이 묶음은 핵심 결과가
                 아니라 영역을 가로지르는 단서이고, 긴 목록이 펼쳐져 있으면
                 결과를 읽어 내려가는 흐름이 거기서 끊긴다 */
              <Disclose label="여러 영역에서 공통으로 확인된 판단">
              <div className="rs-pack">
                {/* **우리 쪽 비유(`자리`)와 판정이라는 말을 걷는다**
                    (COMMERCIAL FINAL §4·§5). 사람이 학생에게 하는 말은
                    `어느 영역에서 한 일인지까지는 묻지 않았습니다` 다 */}
                <p>
                  어느 기술영역에서 한 일인지까지는 묻지 않았습니다. 그래서
                  위의 영역별 결과에는 들어가지 않습니다.
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
                {/* **축 이름만 적으면 응시자가 자기 답을 못 알아본다.** 공통
                    판단 여섯과 학위 묶음 여섯이 축 여덟으로 접히면, 한 축에
                    문항이 둘인 자리에서 짝이 가려 답 하나가 아예 안 보인다.
                    고르신 판단을 그대로 되돌려 준다(규격 §18) */}
                {cm.didOwn.length || cm.didConfirm.length ? (
                  /* **열두 줄짜리 목록을 펼쳐 두지 않는다**(규격 §26).
                     이 자리는 축 이름만 적으면 자기 답을 못 알아보는 자리라
                     고르신 판단을 그대로 돌려주는데, 그 목록이 스물넷까지
                     간다. 바로 위의 두 줄(`직접 정한 것으로 확인` ·
                     `해 본 것으로 확인`)이 이미 무엇이 확인됐는지를 말하므로
                     목록은 **되짚어 보실 자리**다. 접어도 담긴 것은 그대로고
                     종이에서는 펴진다 */
                  <Fold label="고르신 판단 모두 보기">
                    <div className="rs-cmitems">
                      {cm.didOwn.length ? (
                        <section>
                          <h4>직접 정하고 그 결과가 쓰였다고 답하신 것</h4>
                          <ul>{cm.didOwn.map((t) => <li key={t}>{t}</li>)}</ul>
                        </section>
                      ) : null}
                      {cm.didConfirm.length ? (
                        <section>
                          <h4>직접 해 보셨다고 답하신 것</h4>
                          <ul>{cm.didConfirm.map((t) => <li key={t}>{t}</li>)}</ul>
                        </section>
                      ) : null}
                    </div>
                  </Fold>
                ) : null}
              </div>
              </Disclose>
            ) : null}
          </div>
            {/* **그 전공이 먼저 보는 영역**(갈래 계약의 `domain_emphasis.lead`).
                등록부에 적혀 있고 **읽는 자리에 한 글자도 닿지 않던 층**이다.
                적는 것은 읽는 차례까지이고 축 수준과 묶음과 확인된 축 개수에
                들어가지 않는다: 이 줄이 없으면 같은 Core 를 쓰는 학과 둘이
                열두 영역을 같은 무게로 읽는다 */}
            {sv.domainLead.length ? (
              <p className="rs-note">
                <b>{meta.specialization ?? meta.major} 쪽에서 먼저 보는 영역</b>
                {" · "}
                {sv.domainLead.map((c) => domainName(core, c)).join(" · ")}
                {hasBars ? ". 아래 막대에서 그 영역을 먼저 보시면 됩니다."
                  : ". 위 묶음에서 그 영역을 먼저 보시면 됩니다."}
              </p>
            ) : null}
            {/* ── 그림은 보조 정보다(COMMERCIAL FINAL §11) ──
                **Radar 를 주인공으로 키우지 않는다.** 전에는 그림 묶음이
                레이더로 열렸고, 꼭짓점이 바깥으로 뻗은 그림은 읽는 쪽에서
                점수로 읽힌다. 지금 차례는 막대가 먼저다: 막대는 영역마다
                어느 단계까지 확인됐는지를 한 줄씩 그대로 보여 주고, 레이더는
                그 열두 줄을 한 장으로 되짚는 자리라 뒤에 작게 선다.
                **종이에서 제 쪽을 열지는 않는다**: `break-before: page` 로
                재어 보니 그 쪽이 20%만 차고 학교 종이가 한 쪽 늘었다 */}
            {hasRadar || hasBars ? (
              <div className="rs-figs">
                {/* **쪽 질문 줄(`rs-q`)을 여기 두지 않는다**(SIGN-OFF §13).
                    이 묶음은 종이에서 제 쪽을 열지 않아서(`break-before: page`
                    를 재어 보고 걷었다) 한 쪽에 질문 줄이 둘 서게 된다.
                    이 묶음이 답하는 질문은 아래 머리글이 든다 */}
                {/* **제목이 그 쪽의 핵심 질문이다**(§12). 전에는
                    `같은 것을 그림으로` 였다. 무엇을 보는 자리인지는 말하지만
                    **읽는 사람이 거기서 무엇을 알게 되는지**를 말하지 않아,
                    종이에서 그 쪽이 보조 자료로 읽혔다 */}
                <h3 className="pv-h3">내 경험은 어느 단계까지 와 있는가</h3>
                {hasBars ? (
                  <>
                    {/* **설명이 그림보다 먼저 서면 안 된다**(§13).
                        차례는 머리글 → 그림 → 설명이다: 설명을 앞에 두면
                        읽는 사람이 자기 그림을 보기 전에 읽는 법을 먼저
                        읽는다 */}
                    <h4 className="pv-h4">영역별 경험 단계</h4>
                    <StageBars model={model} name={(c) => domainName(core, c)} />
                    <p className="rs-note">
                      이번 응시에서 판단을 물은 영역입니다. 막대의 길이는 물은
                      축의 수이고, 영역마다 물은 축의 수가 달라 비율로 바꾸지
                      않습니다.
                    </p>
                  </>
                ) : null}
                {hasRadar ? (
                  <div className="rs-fig-aside">
                    {/* **머리를 하나 더 세우지 않는다.** 레이더는 제 범례에
                        축 이름과 상태를 글자로 적고 있어서, 위에 이름을 또
                        붙이면 그림 하나에 머리가 둘이 된다. 종이에서는 그
                        한 줄이 쪽을 하나 더 열 수 있다 */}
                    <Radar model={model} name={(c) => domainName(core, c)} />
                    {/* **경고는 그대로 둔다**(SIGN-OFF §14). 레이더는 적성도
                        역량 순위도 직무 적합도가 아니고, 그 줄이 빠지면
                        꼭짓점이 뻗은 그림이 점수로 읽힌다 */}
                    <ChartNote />
                  </div>
                ) : null}
                {/* 그림 묶음을 닫는 한 줄. **그림 뒤에 둔다**(§13) */}
                <p className="rs-note">
                  위에 적은 상태를 그림으로 되짚는 자리입니다. 점수도
                  순위도 아닙니다.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
        {/* ── 8. 지역과 기관 탐색 ──
            **기업 이름을 담지 않는다.** 직업정보제공사업으로 할 수 있는
            것은 공고를 띄우는 데까지다. 그리고 기관 수를 짐작으로 채우지
            않는다: 그 수가 근거처럼 읽힌다 */}
        <section className="rs-sect" id="region">
          {/* **제목이 그 절이 답하는 질문이다**(SIGN-OFF §12). 전에는
              `어디에서 찾을지` 였다. 무엇을 찾는 자리인지가 빠져 있어서
              읽는 사람이 제목만으로는 이 절을 건너뛸지 정할 수 없었다 */}
          <h2>이 경험을 쓸 곳은 어디에 있는가</h2>

          {/* ── 확인된 영역에서 이어 볼 산업과 직무 ──
              **고르신 하나만 적지 않는다**(규격 Reverse Mapping). 세는
              것은 `relations` 표에서 그 영역이 `중심`이나 `있음`으로
              걸리는가뿐이고, **새 점수를 만들지 않는다.** 그래서 순위도
              적합도도 없고 걸린 영역 이름만 적는다 */}
          {revIndustry.length || revRole.length ? (
            <div className="rs-pack" id="nearby">
              {/* **직무를 권하지 않는다**(규격 §11). `추천 직무` 와
                  `잘 맞는 직무` 와 `적합 직무` 는 이 검사가 계산하지 않는
                  값이고, 그렇게 적으면 읽는 사람이 그 줄을 결론으로 읽는다.
                  적는 것은 **확인된 경험이 어디에서 쓰이는가**까지다 */}
              <h3>이 경험이 활용될 수 있는 일</h3>
              <p className="rs-note">
                확인된 기술영역이 어느 산업과 직무에서 자주 쓰이는지를 적은
                것입니다. 적합도나 합격 가능성이 아니고, 함께 살펴볼 자리를
                가리킵니다.
              </p>
              {revIndustry.length ? (
                <dl>
                  {revIndustry.map((r) => (
                    <div key={r.code}>
                      <dt>{industryName(r.code)}</dt>
                      <dd>
                        {[...r.core_domains, ...r.seen_domains]
                          .slice(0, 3).map((td) => domainName(core, td)).join(" · ")}
                        {r.core_domains.length
                          ? ` · 이 산업이 중심으로 보는 영역 ${r.core_domains.length}곳`
                          : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {revRole.length ? (
                <dl>
                  {revRole.map((r) => (
                    <div key={r.code}>
                      <dt>{roleName(r.code)}</dt>
                      <dd>
                        {[...r.core_domains, ...r.seen_domains]
                          .slice(0, 3).map((td) => domainName(core, td)).join(" · ")}
                        {r.core_domains.length
                          ? ` · 이 직무가 중심으로 쓰는 영역 ${r.core_domains.length}곳`
                          : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <p className="rs-others">
                순위가 아닙니다. 같은 수로 걸린 자리는 차례를 만들지 않습니다.
              </p>
            </div>
          ) : null}

          {/* ── 이 지역에서 함께 볼 곳 ──
              **추천이 아니다.** 적합도·합격 가능성·취업 확률을 뜻하지
              않는다. 그리고 **짐작으로 채우지 않는다**: 출처 없는 줄은
              DB 가 거절하고, 비어 있으면 비었다고 적는다 */}
          {regionOrgs.length ? (
            <div className="rs-pack">
              <h3>이 지역에서 함께 볼 곳</h3>
              <p className="rs-note">
                {regionPicked} 기준으로 함께 탐색해 볼 수 있는 기관입니다.
                채용 여부나 합격 가능성과는 관계가 없습니다.
              </p>
              <dl>
                {regionOrgs.map((o) => (
                  <div key={o.organization_id}>
                    <dt>
                      <a href={o.homepage_url} rel="noreferrer">{o.name}</a>
                    </dt>
                    <dd>
                      {[orgTypeName(o.org_type_code), o.city,
                        o.roles.map(roleName).filter(Boolean).slice(0, 2).join(" · ")]
                        .filter(Boolean).join(" · ")}
                      <br />
                      {o.related_majors.length
                        ? `${o.related_majors.join(" · ")} 전공에서 이어 볼 수 있습니다`
                        : "전공 연결은 아직 적히지 않았습니다"}
                    </dd>
                  </div>
                ))}
              </dl>
              {regionOrgN > regionOrgs.length ? (
                <p className="rs-others">
                  <Link href="/me/region">지역 기업·기관 더 보기 →</Link>
                </p>
              ) : null}
            </div>
          ) : regionPicked ? (
            <div className="rs-pack">
              <h3>이 지역의 기관 목록은 아직 비어 있습니다</h3>
              <p className="rs-others">
                기관은 공식 홈페이지와 공공데이터에서 확인한 것만 적습니다.
                확인되기 전까지 짐작으로 채우지 않습니다.
              </p>
            </div>
          ) : null}

          <p className="rs-note">
            {regionPicked
              ? `지금 ${regionPicked} 기준으로 보고 계십니다. 이 선택은 기술영역 결과를 바꾸지 않습니다.`
              : "희망 지역을 고르면 산업과 직무를 읽는 순서가 그 권역 기준으로 바뀝니다. 기술영역 결과는 그대로입니다."}
          </p>
          {/* **참고 자료를 기본으로 펼치지 않는다**(규격 §3 B · §4).
              권역 다섯과 조합 넷과 고르신 자리를 한꺼번에 펼치면 이 절
              하나가 1,441px 이고, 결과지에서 둘째로 큰 덩이가 **다음에
              무엇을 할지와 상관없는 참고 목록**이 된다. 기본으로 서는
              것은 지역 선택이 무엇을 바꾸고 무엇을 바꾸지 않는가 한 줄과
              고르러 가는 길이다 */}
          <Disclose label="권역과 고르신 것 보기">
          {/* **종이에서는 권역 다섯 설명을 싣지 않는다**(상용화 PHASE 0).
              어느 응시에서나 같은 글이고, 종이에서 읽는 사람이 다음에 할
              일을 정하는 데 쓰이지 않는다. 고른 권역과 그 지역의 기관
              상태는 위에 그대로 선다 */}
          <div className="rs-pack rs-webonly">
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
          <div className="rs-pack" id="fourkeys">
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
          </Disclose>
          {/* **종이에는 누를 자리를 두지 않는다**(상용화 PHASE 0). 링크는
              화면에서만 선다: 뽑아 둔 종이에서는 눌리지 않고, 마지막 쪽에
              혼자 서면 밑줄 친 글자 한 줄이 남는다 */}
          <p className="rs-note rs-webonly">
            <Link href="/me/region">희망 지역 고르기</Link>
          </p>
        </section>


        </Detail>

        {/* ── 닫는 부록 ──
            **읽는 기준과 고르신 자리를 한 묶음으로 둔다.**
            둘 다 판정이 아니다: 하나는 무엇을 재고 무엇을 재지 않았는지이고
            하나는 그 사람이 응시 중에 고른 것이다. 본문이 끝난 뒤에 함께
            읽는 자리라 한 덩이로 묶었고, 종이에서는 그 덩이가 쪼개지지 않게
            둔다(`result.css` 의 `.rs-fine { break-inside: avoid }`).
            전에는 `고르신 자리` 가 지역 절 안에 있고 읽는 기준만 마지막에
            남아서, **마지막 쪽에 221자(13%)만 선 종이**가 여섯 벌 나왔다 */}
        <div className="rs-fine">
          {/* **고르신 것을 돌려드린다.** 관심 기관 유형과 목표는 응시 중에
              받아 두고 결과지에 한 글자도 나오지 않았다. 판정에 들어가지
              않는다는 것도 함께 적는다 */}
          {model.targets.orgs.length || goal.role || goal.industry || goal.org ? (
            <div className="rs-pack">
              {/* **`고른 자리` 는 우리 쪽 말이다**(FINAL POLISH §2).
                  이 묶음이 드는 것은 응시 중에 고르신 목표 산업·직무·조직
                  이고, 그 자리를 부르는 자연스러운 말이 `목표` 다. 담는
                  값과 쓰이지 않는다는 설명은 그대로다 */}
              <h3>검사에서 고르신 목표</h3>
              <p>
                응시하면서 고르신 것입니다. 기술영역 결과에는 들어가지 않고,
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
          {/* **장문 해설을 본문에 두지 않는다**(규격 §6).
              `이 결과를 어떻게 읽을 것인가` 는 네 칸짜리 긴 해설이라 본문
              아래에 늘 펼쳐 두면 결과의 마지막 인상이 그 해설이 된다.
              **지우지 않았다**: 무엇을 재고 무엇을 재지 않았는지는 결과의
              일부라, 읽는 기준을 모아 둔 이 자리로 옮기고 종이에서는 펴진다 */}
          <Disclose label="결과 읽는 기준">
            <p>{TIER_NOTE_KO[model.tier]}</p>
            <div className="rs-pack" id="howto">
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
                    응시하신 시점의 문항과 기준으로 굳어 있습니다. 나중에
                    기준이 바뀌어도 이 결과는 달라지지 않습니다.
                  </dd>
                </div>
              </dl>
            </div>
            {/* **같은 사실을 두 번 적지 않는다.** `재지 않는 것` 과
                `고정되어 있습니다` 가 바로 위에 섰으므로, 전에 여기 있던
                두 문장을 걷었다. 종이에서는 이 자리가 전부 펴지는데,
                접힌 화면에서는 겹침이 보이지 않아 같은 두 문장이 나란히
                뽑히던 일이 있었다 */}
            {/* **수는 여기까지 내린다**(규격 §14). `확인된 판단 24 · 직접
                정한 것 24` 는 다음에 무엇을 할지 정하는 데 쓰이지 않는데,
                본문 첫 줄에 두면 **점수처럼 읽힌다.** 되짚어 보실 자리에
                한 줄로 둔다 */}
            {deep ? (
              /* **종이에서는 이 줄을 세우지 않는다.** 되짚어 보실 자리이고,
                 마지막 쪽에 홀로 서면 숫자 한 줄이 결과의 마지막 인상이
                 된다. 같은 수는 영역마다 제자리에 적혀 있다 */
              <p className="rs-note rs-webonly">
                확인된 판단 {counts.confirmed_axes} · 직접 정한 것 {counts.owned_axes}
                {" · "}고르신 근거 {counts.evidence_items}
              </p>
            ) : null}
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
