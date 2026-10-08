/**
 * ME_V3 판단 엔진. **같은 응답이면 늘 같은 판단이 나온다.**
 *
 * 들어가지 않는 것이 넷이다: 학위 · 전공계열 · 산업팩 · 역할팩. 그 넷은
 * 묻는 장면과 읽는 법만 바꾸고 축 수준과 영역 묶음에는 한 칸도 들어가지
 * 않는다(`v3:scoring` 의 변형 검사가 센다).
 *
 * **ME_V2 를 읽지 않는다.** 직무군 열여섯과 관심 점수 정렬과 역할 점수는
 * 저쪽 물건이고, 섞으면 어느 쪽도 아닌 값이 나온다. 저쪽은 읽기 전용으로
 * 잠겨 있다.
 *
 * 내놓는 것은 점수가 아니라 **상태와 까닭**이다. 82점과 76점을 주는 대신
 * 근거가 선 영역과 아직 덜 선 영역과 그 까닭을 코드로 돌려준다.
 */
import { coreFile } from "../core-registry";
import { axisResult, isConfirmed } from "./axes";
import { ownershipIndex, ownershipOf, type Ownership } from "./ownership";
import {
  loadBank, band, routedFor, read, DEEP_BLOCK, PROBE_BLOCK,
  type Bank, type BankItem,
} from "./normalize";
import { industryContext, roleContext } from "./packs";
import { quality } from "./quality";
import type {
  Axis, DomainResult, PackAnswer, Snapshot, Submission, TierLimits, Zone,
} from "./types";
import { decide, nextSteps, quadrant, Z1_CONFIRMED_MIN } from "./zones";
import {
  ITEM_BANK_VERSION, SCORING_VERSION, packVersion, type ModuleVersions,
} from "./version";

const AX: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
/**
 * 선별 네 축. **조직 활용을 넷째에서 뺐다.**
 *
 * `내가 낸 것이 조직에 쓰였는가` 는 들어간 자리가 있어야 답할 수 있다.
 * 수업과 캡스톤만 한 학부생은 판단을 했어도 그 칸이 비고, 그래서 선별
 * 등급에서 **학위가 묶음 판정을 가르는** 길이 생겼다. 실패·수정은 학부
 * 과제에서도 답할 수 있으면서 참여와 소유를 똑같이 잘 가른다.
 */
const SCREEN: Axis[] = ["J3", "J5", "J6", "J7"];
const ZONES: Zone[] = [
  "Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE",
  "Z3_EVIDENCE_LOW_INTEREST", "Z4_INSUFFICIENT_EVIDENCE", "NOT_EXPLORED",
];

type Domains = {
  domains: { code: string; name: string; required_axes: Axis[] }[];
};

export type Loaded = {
  core: string;
  bank: Bank;
  domains: Domains;
  dir?: string;
};

export function load(core: string, dir?: string): Loaded {
  return { core, bank: loadBank(core, dir), domains: coreFile<Domains>(core, "domains", dir), dir };
}

function limitsFor(tier: Submission["tier"]): TierLimits {
  return {
    /* BASIC 은 선별 네 축만 묻는다. 그것으로 근거가 섰다고 적지 않는다 */
    allows_evidence_established: tier !== "BASIC",
    allows_axis_names: tier !== "BASIC",
    allows_translation: tier === "PRO",
    deep_axes: tier !== "BASIC",
  };
}

/** 영역에 붙지 않는 **판단**을 재는 축. 번역과 목표와 맥락은 여기 없다 */
const COMMON_MEASURE = new Set(["common_judgement", "experience_translation"]);

export function score(sub: Submission, loaded: Loaded): Snapshot {
  const { bank, domains } = loaded;
  const items = bank.items;
  const trace: string[] = [`scoring=${SCORING_VERSION}`, `bank=${ITEM_BANK_VERSION}`];

  const deepItems = new Map<string, BankItem[]>();
  for (const i of items) {
    if (!i.technical_domain || !i.evidence_axis) continue;
    if (i.module !== PROBE_BLOCK && i.module !== DEEP_BLOCK) continue;
    const key = `${i.technical_domain}.${i.evidence_axis}`;
    deepItems.set(key, [...(deepItems.get(key) ?? []), i]);
  }

  const out: DomainResult[] = [];
  for (const d of domains.domains) {
    const td = d.code;
    const axes = {} as Record<Axis, DomainResult["axes"][Axis]>;
    for (const ax of AX) {
      axes[ax] = axisResult(sub, td, ax, deepItems.get(`${td}.${ax}`) ?? []);
    }
    const g = (id: string) => {
      const it = items.find((x) => x.item_id === id);
      if (!it) return { raw: null, missing: "NOT_ROUTED" as const };
      const r = read(sub, it, routedFor(sub, it));
      const v = r.answer && r.answer.kind !== "choice" && r.answer.kind !== "skipped"
        ? ("index" in r.answer ? r.answer.index : r.answer.value) : null;
      return { raw: v, missing: r.missing };
    };
    const gi = g(`G_${td}_INT`), ge = g(`G_${td}_EXP`), gl = g(`G_${td}_LEA`);
    const confirmed = AX.filter((a) => isConfirmed(axes[a].state));
    const owned = AX.filter((a) => axes[a].state === "OWNED");
    const participated = AX.filter((a) => axes[a].state === "PARTICIPATED");
    const empty = AX.filter((a) => axes[a].state === "NOT_OBSERVED");
    const openedProbe = (sub.opened?.probe ?? []).includes(td);
    const openedDeep = (sub.opened?.deep ?? []).includes(td);
    const requiredOk = d.required_axes.every((a) => isConfirmed(axes[a].state));
    const outputOk = isConfirmed(axes.J5.state);
    const outputEvidenceOk = (sub.artifacts?.[td] ?? []).length > 0;
    const verificationOk = isConfirmed(axes.J6.state);
    const confirmedScreen = SCREEN.filter((a) => isConfirmed(axes[a].state)).length;
    /* BASIC 은 여덟 축을 묻지 않는다. 묻지 않은 축을 센 것으로 적지 않는다 */
    const confirmedAll = sub.tier === "BASIC" ? 0 : confirmed.length;
    const anyAnswer = AX.some((a) => axes[a].from.length > 0);
    const interestBand = gi.raw === null ? null : band(gi.raw);

    const z = decide({
      tier: sub.tier, openedDeep, openedProbe, interest: interestBand,
      confirmedAll, confirmedScreen, requiredOk,
      missingRequired: d.required_axes.filter((a) => !isConfirmed(axes[a].state)),
      outputOk, outputEvidenceOk, verificationOk, anyAnswer,
    });
    const expLabel = ge.raw === null ? null
      : ge.raw === 0 ? "NONE" as const : ge.raw === 1 ? "ONCE_OR_TWICE" as const : "SEVERAL" as const;
    const evidenceHigh = sub.tier === "BASIC"
      ? confirmedScreen >= 2 : confirmedAll >= Z1_CONFIRMED_MIN;

    const dTrace = [
      `${td} zone=${z.zone}`,
      `confirmed=${confirmed.join("+") || "-"}`,
      `owned=${owned.join("+") || "-"}`,
      `required=${d.required_axes.join("+")} ok=${requiredOk}`,
      `output(J5)=${axes.J5.state} evidence=${outputEvidenceOk}`,
      `verify(J6)=${axes.J6.state}`,
      `interest=${interestBand ?? "-"} learning=${gl.raw === null ? "-" : band(gl.raw)}`,
      ...AX.map((a) => `${a}:${axes[a].state} (${axes[a].rule}, evidence=${axes[a].evidence})`),
      `reasons=${z.reasons.join(",") || "-"}`,
    ];

    out.push({
      code: td,
      interest: { raw: gi.raw, band: interestBand, missing: gi.missing },
      experience: { raw: ge.raw, label: expLabel, missing: ge.missing },
      learning: { raw: gl.raw, band: gl.raw === null ? null : band(gl.raw), missing: gl.missing },
      axes, confirmed, owned, participated, empty,
      required: d.required_axes, required_ok: requiredOk,
      output_ok: outputOk, output_evidence_ok: outputEvidenceOk,
      verification_ok: verificationOk,
      confirmed_screen: confirmedScreen, confirmed_all: confirmedAll,
      opened: { probe: openedProbe, deep: openedDeep },
      zone: z.zone, reasons: z.reasons,
      next: nextSteps({
        zone: z.zone, interest: interestBand,
        learning: gl.raw === null ? null : band(gl.raw),
        experience: expLabel, confirmedAll: sub.tier === "BASIC" ? confirmedScreen : confirmedAll,
        outputOk, verificationOk,
      }),
      quadrant: quadrant(interestBand, evidenceHigh),
      trace: dTrace,
    });
  }

  const zones = {} as Record<Zone, string[]>;
  for (const z of ZONES) zones[z] = out.filter((d) => d.zone === z).map((d) => d.code);

  /* 같은 상태로 묶인 영역. **차례를 만들지 않는다** */
  const tiedMap = new Map<string, string[]>();
  for (const d of out) {
    if (d.zone === "NOT_EXPLORED") continue;
    const key = `${d.zone}|${d.confirmed_all}|${d.confirmed_screen}|${d.owned.length}|${d.interest.band}`;
    tiedMap.set(key, [...(tiedMap.get(key) ?? []), d.code]);
  }
  const tied = [...tiedMap.values()].filter((g) => g.length > 1);

  /* 첫 쪽에 올리는 영역. 근거가 선 쪽이 먼저고, 없으면 덜 선 쪽,
     그것도 없으면 관심이 높은 쪽이다. 아무 경험이 없는 사람도 방향은
     받아야 하므로 마지막 칸을 둔다 */
  const focus = zones.Z1_EVIDENCE_ESTABLISHED.length
    ? zones.Z1_EVIDENCE_ESTABLISHED
    : zones.Z2_EVIDENCE_INCOMPLETE.length
      ? zones.Z2_EVIDENCE_INCOMPLETE
      : out.filter((d) => d.interest.band === "HIGH" &&
          d.zone === "Z4_INSUFFICIENT_EVIDENCE").map((d) => d.code);

  const peek = (td: string, axis: string) => {
    const d = out.find((x) => x.code === td);
    const a = d?.axes[axis as Axis];
    const claimed = a?.from.length
      ? a.from.map((x) => x.ownership).sort((p, q) =>
          ownershipIndex(q) - ownershipIndex(p))[0]
      : null;
    return {
      confirmed: !!a && isConfirmed(a.state),
      claimed: claimed ?? null,
      evidence: a?.evidence ?? 0,
    };
  };
  const rq = quality(sub, items, peek);

  const target: Record<string, string> = {};
  for (const id of ["TG_ROLE", "TG_INDUSTRY", "TG_OC"]) {
    const a = sub.answers[id];
    if (a && a.kind === "choice") target[id] = a.value;
  }
  /* **영역에 붙지 않는 판단을 모은다.**
     공통 판단 여섯과 학위 묶음 여섯은 기술영역이 없어서 영역 판정에
     들어가지 않는다. 들어갈 자리도 없었다: 응답을 받아 두고 어느 코드도
     읽지 않았다. 여기서 축마다의 소유 수준으로 떠내고 결과지가 읽는다.
     **영역 판정에는 한 글자도 들어가지 않는다** */
  const common = items
    .filter((i) => !i.technical_domain && i.evidence_axis
      /* **묶음 이름으로 고르지 않고 재는 축으로 고른다.** 영역 없이 축을
         들고 있는 문항에는 번역 열 단계도 있는데, 그쪽의 척도는 보기 넷이
         없는 고르기라서 소유가 늘 `없다` 로 떨어진다. 그대로 담으면 묻지도 않은
         산출물 축이 `확인되지 않음` 으로 결과지에 선다. 번역은 번역 절이
         따로 읽는다 */
      && COMMON_MEASURE.has(i.measurement_axis))
    .map((i) => {
      const r = read(sub, i, routedFor(sub, i));
      const own: Ownership = r.answer && r.answer.kind === "level"
        ? ownershipOf(r.answer.index) : "NONE";
      return {
        item_id: i.item_id, block: i.module, axis: i.evidence_axis as Axis,
        ownership: own, confirmed: own === "DID" || own === "DECIDED_USED",
        missing: r.missing,
      };
    })
    .filter((x) => x.missing !== "NOT_ROUTED");

  /* **팩 문항의 응답을 버리지 않는다.**
     산업 문항 여든과 역할 문항 쉰여섯은 영역 축 수준을 만들지 않는다(위에서
     선별·심화 묶음만 센다). 그런데 그 응답을 담는 자리도 없어서 고르고
     답한 것이 결과지에 한 글자도 돌아오지 않았다. 여기 떠서 산업·역할 절이
     읽고, **Core 판정에는 들어가지 않는다** */
  const packAnswers = (mod: "INDUSTRY" | "ROLE"): PackAnswer[] => items
    .filter((i) => i.module === mod)
    .map((i) => {
      const r = read(sub, i, routedFor(sub, i));
      const own: Ownership = r.answer && r.answer.kind === "level"
        ? ownershipOf(r.answer.index) : "NONE";
      return {
        item_id: i.item_id,
        domain: i.technical_domain ?? null,
        axis: (i.evidence_axis as Axis) ?? null,
        ownership: own, confirmed: own === "DID" || own === "DECIDED_USED",
        missing: r.missing,
      };
    })
    .filter((x) => x.missing !== "NOT_ROUTED");

  /* 강제 선택 둘. 격자에서 묶인 영역 가운데 고르신 쪽이다.
     **묶음 안에 차례를 만들지 않는다**: 고른 것을 돌려주는 자리고,
     영역 축 수준과 묶음 판정에는 들어가지 않는다 */
  const forced = items.filter((i) => i.module === "CORE-FORCE")
    .map((i) => {
      const a = routedFor(sub, i) ? sub.answers[i.item_id] : undefined;
      return a && a.kind === "choice"
        ? { item_id: i.item_id, choice: a.value } : null;
    })
    .filter((x): x is { item_id: string; choice: string } => !!x);

  /* 타계열 대학원의 번역 맥락 넷. **축 수준에 들어가지 않는다** */
  const xfield = items.filter((i) => i.module === "GRAD-XFIELD")
    .map((i) => {
      const a = routedFor(sub, i) ? sub.answers[i.item_id] : undefined;
      return a && a.kind === "choice"
        ? { item_id: i.item_id, choice: a.value } : null;
    })
    .filter((x): x is { item_id: string; choice: string } => !!x);

  const translation = items.filter((i) => i.module === "TRANS-10")
    .filter((i) => {
      const a = sub.answers[i.item_id];
      return !!a && a.kind === "choice";
    }).map((i) => i.item_id);

  const versions: ModuleVersions = {
    core_version: loaded.core,
    item_bank_version: ITEM_BANK_VERSION,
    scoring_version: SCORING_VERSION,
    industry_pack_version: packVersion(loaded.core, "industry", sub.industry_pack ?? null, loaded.dir),
    role_pack_version: packVersion(loaded.core, "role", sub.role_pack ?? null, loaded.dir),
    region_layer_version: null,
  };

  trace.push(`domains=${out.length}`, `quality=${rq.flag}`,
    ...ZONES.map((z) => `${z}=${zones[z].join(",") || "-"}`));

  return {
    attempt_id: sub.attempt_id,
    tier: sub.tier, stage: sub.stage, grad_field: sub.grad_field,
    undergrad_core: sub.undergrad_core ?? null,
    module_versions: versions,
    tier_limits: limitsFor(sub.tier),
    domains: out, zones, tied, focus,
    response_quality: rq,
    context: {
      /* 고른 것을 그대로 들고 다닌다. **점수를 만들지 않는다** */
      role_interest: sub.role_interest ?? [],
      org_interest: sub.org_interest ?? [],
      industry_interest: sub.industry_interest ?? [],
      target,
      translation_steps: translation,
      /* 산업과 역할은 Core 를 다시 계산하지 않는다. 읽는 순서만 만든다 */
      industry: industryContext(sub.industry_pack ?? null, out, loaded.dir,
        loaded.core, packAnswers("INDUSTRY")),
      role: roleContext(sub.role_pack ?? null, out, loaded.dir,
        loaded.core, packAnswers("ROLE")),
      common, xfield, forced,
    },
    trace,
  };
}

/** Core 판정만 떠낸다. 변형 검사가 이 값을 견준다 */
export function coreOnly(s: Snapshot): unknown {
  return {
    zones: s.zones,
    focus: s.focus,
    domains: s.domains.map((d) => ({
      code: d.code, zone: d.zone, reasons: d.reasons,
      confirmed: d.confirmed, owned: d.owned, participated: d.participated,
      empty: d.empty, required_ok: d.required_ok,
      output_ok: d.output_ok, verification_ok: d.verification_ok,
      confirmed_screen: d.confirmed_screen, confirmed_all: d.confirmed_all,
      interest: d.interest.raw, experience: d.experience.raw, learning: d.learning.raw,
      quadrant: d.quadrant,
    })),
  };
}
