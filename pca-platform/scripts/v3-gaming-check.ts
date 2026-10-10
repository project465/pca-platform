/**
 * 응답을 꾸며 낸 사람과 솔직하게 답한 사람이 갈리는가.
 *
 * 묻는 것이 둘이다. **전부 최고로 답한 사람이 가장 좋은 결과를 받지 않는가**
 * 와 **고르게 답한 사람에게 없는 방향을 만들어 주지 않는가.**
 *
 * 이 검사가 세는 것은 점수가 아니라 **말**이다. 열두 벌의 결과지에서 묶음과
 * 머리글과 첫 걸음과 품질 flag 를 꺼내 서로 다른지 본다. 같은 말이 두 벌에
 * 나오면 그 둘을 가르는 신호가 제품에 없는 것이다.
 *
 *   npm run v3:gaming
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { coreFile, registry } from "../src/lib/me-v3/core-registry";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { routedFor, type BankItem as CoreItem } from "../src/lib/me-v3/scoring/normalize";
import { buildResult } from "../src/lib/me-v3/result/build";
import {
  actionKo, axisStateKo, commonKo, gapKo, headlineKo,
  BASIC_GROUP_KO, FIRST_MOVE_KO, QUALITY_KO, ZONE_TITLE_KO,
} from "../src/lib/me-v3/result/text.ko";
import type { ResultModel } from "../src/lib/me-v3/result/model";
import type {
  Answer, Axis, Snapshot, Submission, Tier,
} from "../src/lib/me-v3/scoring/types";
import { UNKNOWN } from "../src/lib/me-v3/scoring/types";

const OUT = "docs/metri/85_persona_gaming.md";
type BankItem = CoreItem & { options?: string[] | null; wording?: string | null };

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const core = process.env.CORE
  ?? registry().cores.filter((c) => c.status === "building")[0].code;
const loaded = load(core);
const bank = loaded.bank as unknown as { items: BankItem[] };
type DomainData = {
  code: string; name: string; required_axes: Axis[];
  artifacts: string[]; verify_targets: string[];
};
const domains = loaded.domains.domains as unknown as DomainData[];
const DOM = domains.map((d) => d.code);
const NAME = new Map(domains.map((d) => [d.code, d.name]));
const lists = coreFile<{ domains: Record<string, Record<string, { text: string }[]>> }>(
  core, "checklists");
const AXES: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

console.log(`  core  ${core} · 영역 ${DOM.length}개\n`);

/* ────────────────────────────────────────────────────────────────────
 * 사람 한 벌을 적는 법. **문항 번호로 적지 않는다**
 * ──────────────────────────────────────────────────────────────── */
type Spec = {
  id: string; name: string; what: string;
  tier?: Tier;
  /** 관심 1~5 또는 `모르겠다` */
  interest: number | "unknown";
  /** 해 본 정도 0~2 */
  exposure: number;
  /** 배울 뜻 1~5 또는 `모르겠다` */
  learning: number | "unknown";
  /** 선별·심화 보기 넷에서 고르는 자리(0~3). 축마다 다르게 둘 수 있다 */
  level: number | Partial<Record<Axis, number>>;
  /** 축마다 고른 체크리스트 수 */
  checklist: number;
  /** 영역마다 고른 산출물·검증 수 */
  artifacts: number;
  verify: number;
  /** 일관성 짝을 어긋나게 답한다 */
  clash?: boolean;
};

const LVL = (s: Spec, ax: Axis): number =>
  typeof s.level === "number" ? s.level : (s.level[ax] ?? 0);

function build(s: Spec): Submission {
  const tier = s.tier ?? "PRO";
  const answers: Record<string, Answer> = {};
  const base: Submission = {
    attempt_id: s.id, tier, stage: "master", grad_field: "STEM",
    undergrad_core: null, answers,
    checklists: {}, artifacts: {}, verifications: {},
    opened: { probe: [...DOM], deep: [...DOM] },
    industry_interest: [], role_interest: [], org_interest: [],
    industry_pack: null, role_pack: null, asked: [],
  };
  for (const i of bank.items) {
    if (!routedFor(base, i)) continue;
    switch (i.response_scale) {
      case "5보기":
        if (i.measurement_axis === "interest") {
          answers[i.item_id] = s.interest === "unknown"
            ? { kind: "choice", value: UNKNOWN }
            : { kind: "scale5", value: s.interest };
        } else {
          answers[i.item_id] = s.learning === "unknown"
            ? { kind: "choice", value: UNKNOWN }
            : { kind: "scale5", value: s.learning };
        }
        break;
      case "3보기":
        answers[i.item_id] = { kind: "exposure", value: s.exposure };
        break;
      case "L0~L3": {
        const ax = (i.evidence_axis ?? "J1") as Axis;
        /* 일관성 짝을 어긋나게. **점수를 깎는 자리가 아니라 flag 가 서는 자리다** */
        const n = s.clash && i.consistency_pair
          ? (i.item_id.endsWith("A") ? 3 : 0) : LVL(s, ax);
        answers[i.item_id] = { kind: "level", index: n };
        break;
      }
      case "둘 중 하나":
        answers[i.item_id] = { kind: "choice", value: DOM[0] };
        break;
      default: break;
    }
  }
  const checklists: Record<string, string[]> = {};
  if (s.checklist > 0) {
    for (const td of DOM) {
      for (const ax of AXES) {
        const pool = (lists.domains[td]?.[ax] ?? []).map((x) => x.text);
        if (pool.length) checklists[`${td}.${ax}`] = pool.slice(0, s.checklist);
      }
    }
  }
  const artifacts: Record<string, string[]> = {};
  const verifications: Record<string, string[]> = {};
  for (const td of DOM) {
    const d = domains.find((x) => x.code === td)!;
    if (s.artifacts > 0) artifacts[td] = d.artifacts.slice(0, s.artifacts);
    if (s.verify > 0) verifications[td] = d.verify_targets.slice(0, s.verify);
  }
  return { ...base, checklists, artifacts, verifications };
}

/* ────────────────────────────────────────────────────────────────────
 * §7 꾸며 낸 사람 여덟 벌과 §8 고르게 답한 사람 넷
 * ──────────────────────────────────────────────────────────────── */
const SPECS: Spec[] = [
  { id: "A", name: "전부 최고로 답한 사람",
    what: "관심 5 · 해 본 정도 여러 번 · 보기 넷의 맨 위 · 고른 근거는 없다",
    interest: 5, exposure: 2, learning: 5, level: 3,
    checklist: 0, artifacts: 0, verify: 0 },
  { id: "B", name: "관심만 높은 사람",
    what: "관심 5 · 해 본 적 없음 · 보기 넷의 맨 아래",
    interest: 5, exposure: 0, learning: 5, level: 0,
    checklist: 0, artifacts: 0, verify: 0 },
  { id: "C", name: "경험은 많고 관심이 낮은 사람",
    what: "관심 2 · 여러 번 · 직접 수행과 직접 결정 · 근거도 있다",
    interest: 2, exposure: 2, learning: 2, level: 3,
    checklist: 2, artifacts: 2, verify: 2 },
  { id: "D", name: "직접 수행은 많고 직접 판단이 적은 사람",
    what: "판단 축은 받아 쓴 자리 · 산출물과 검증은 직접",
    interest: 4, exposure: 2, learning: 4,
    level: { J1: 1, J2: 1, J3: 1, J4: 1, J5: 2, J6: 2, J7: 2, J8: 1 },
    checklist: 1, artifacts: 2, verify: 2 },
  { id: "E", name: "직접 판단을 주장하고 근거가 없는 사람",
    what: "판단 축(문제·요구·결정·방법)만 맨 위 · 남은 것과 견준 것은 없다 · 근거 0",
    interest: 4, exposure: 2, learning: 4,
    level: { J1: 3, J2: 3, J3: 3, J4: 3, J5: 0, J6: 0, J7: 0, J8: 0 },
    checklist: 0, artifacts: 0, verify: 0 },
  { id: "F", name: "근거는 많고 소유가 낮은 사람",
    what: "보기 넷의 받아 쓴 자리 · 체크리스트와 산출물과 검증은 가득",
    interest: 4, exposure: 2, learning: 4, level: 1,
    checklist: 2, artifacts: 2, verify: 2 },
  { id: "G", name: "응답이 서로 어긋나는 사람",
    what: "일관성 짝을 맨 위와 맨 아래로 갈라 답한다",
    interest: 4, exposure: 2, learning: 4, level: 2,
    checklist: 1, artifacts: 1, verify: 1, clash: true },
  { id: "H", name: "전부 가운데로 답한 사람",
    what: "관심 3 · 한두 번 · 보기 넷의 둘째",
    interest: 3, exposure: 1, learning: 3, level: 1,
    checklist: 0, artifacts: 0, verify: 0 },
  /* §8 고르게 답한 사람 */
  { id: "N1", name: "전부 3점", what: "관심 3 · 배울 뜻 3 · 해 본 적 없음 · 보기 넷의 맨 아래",
    interest: 3, exposure: 0, learning: 3, level: 0,
    checklist: 0, artifacts: 0, verify: 0 },
  { id: "N2", name: "관심만 3점", what: "관심 3 · 배울 뜻 5",
    interest: 3, exposure: 0, learning: 5, level: 0,
    checklist: 0, artifacts: 0, verify: 0 },
  { id: "N3", name: "배울 뜻만 3점", what: "관심 5 · 배울 뜻 3",
    interest: 5, exposure: 0, learning: 3, level: 0,
    checklist: 0, artifacts: 0, verify: 0 },
  { id: "N4", name: "3점과 모르겠다", what: "관심 모르겠다 · 배울 뜻 3",
    interest: "unknown", exposure: 0, learning: 3, level: 0,
    checklist: 0, artifacts: 0, verify: 0 },
  /* 견줄 자리. **막는 것만 세면 산 사람도 막는다** */
  { id: "T", name: "솔직하게 답한 사람 (견줄 자리)",
    what: "직접 결정과 체크리스트와 산출물과 검증이 함께 있다",
    interest: 4, exposure: 2, learning: 4, level: 3,
    checklist: 2, artifacts: 2, verify: 2 },
];

type Row = {
  spec: Spec; snap: Snapshot; model: ResultModel;
  z1: string[]; z2: string[]; owned: number; confirmed: number;
  headline: string; first: string; flag: string;
  gaps: number; actions: number; words: string;
};

const rows: Row[] = SPECS.map((spec) => {
  const sub = build(spec);
  const snap = score(sub, loaded);
  const model = buildResult(snap, loaded, { packs: { industries: [], roles: [] } });
  const owned = snap.domains.reduce((n, d) => n + d.owned.length, 0);
  const confirmed = snap.domains.reduce((n, d) => n + d.confirmed.length, 0);
  const cm = commonKo(model.common);
  /**
   * **사람이 읽는 말로 견준다.**
   *
   * 내부 코드나 숫자로 견주면 숫자는 언제나 달라서 검사가 늘 통과한다.
   * 그래서 결과지가 실제로 세우는 문장을 모은다: 머리글과 이끄는 줄 ·
   * 첫 걸음 · 응답 품질 한 줄 · 영역마다의 묶음 이름과 해 본 정도와 관심
   * 구간과 여덟 축의 상태 · 비어 있는 자리 · 할 일 · 영역에 걸치지 않는
   * 판단. **처음에는 일곱 칸만 모았다가 두 쌍이 같은 말을 받는 것으로
   * 걸렸는데, 갈리는 자리가 축 상태와 해 본 정도여서 그 칸이 빠져 있던
   * 것이었다.**
   */
  const words = [
    headlineKo(model).title, headlineKo(model).lead,
    FIRST_MOVE_KO[model.overview.first_move],
    QUALITY_KO[snap.response_quality.flag as keyof typeof QUALITY_KO] ?? "",
    model.overview.basic_groups
      ? Object.entries(model.overview.basic_groups)
        .map(([k, v]) => `${BASIC_GROUP_KO[k as keyof typeof BASIC_GROUP_KO]?.title}:${(v as string[]).length}`)
        .join(",") : "",
    ...model.domains.map((d) => [
      NAME.get(d.code) ?? d.code,
      ZONE_TITLE_KO[d.zone],
      `관심 ${d.interest ?? "아직"}`,
      `해 본 정도 ${d.experience ?? "아직"}`,
      ...d.axes.map((ax) => axisStateKo(ax.axis, ax.state)),
      d.did.join("·"), d.decided.join("·"),
      d.artifacts.join("·"), d.verifications.join("·"),
    ].join("/")),
    ...model.gaps.map((g) => gapKo(g, NAME.get(g.domain) ?? g.domain).title),
    ...model.actions.map((a) =>
      actionKo(a, (a.domain && NAME.get(a.domain)) ?? "", model.stage).do),
    cm.didOwn.join("·"), cm.didConfirm.join("·"),
  ].join(" | ");
  return {
    spec, snap, model,
    z1: snap.zones.Z1_EVIDENCE_ESTABLISHED, z2: snap.zones.Z2_EVIDENCE_INCOMPLETE,
    owned, confirmed,
    headline: model.overview.headline,
    first: model.overview.first_move,
    flag: snap.response_quality.flag,
    gaps: model.gaps.length, actions: model.actions.length,
    words,
  };
});
const by = new Map(rows.map((r) => [r.spec.id, r]));
const R = (id: string) => by.get(id)!;

/* ── §7 A 가 가장 좋은 결과가 되지 않는다 ─────────────────────── */
ok("A 전부 최고로 답해도 근거가 선 영역이 생기지 않는다",
   R("A").z1.length === 0, `Z1 ${R("A").z1.length}개 · 소유 ${R("A").owned}칸`);
ok("A 전부 최고로 답해도 소유가 서지 않는다", R("A").owned === 0,
   `소유 ${R("A").owned}칸 (근거 둘이 없으면 확인까지다)`);
ok("A 의 머리글이 `근거가 섰다` 가 아니다",
   R("A").headline !== "EVIDENCE_READY", `머리글 ${R("A").headline}`);
ok("A 에게 다음 할 일이 남는다", R("A").gaps > 0 && R("A").actions > 0,
   `비어 있는 자리 ${R("A").gaps}개 · 할 일 ${R("A").actions}개`);
ok("A 에 응답 품질 표시가 선다", R("A").flag !== "OK", `flag ${R("A").flag}`);
ok("A 가 솔직하게 답한 사람보다 앞서지 않는다",
   R("T").z1.length > R("A").z1.length && R("T").owned > R("A").owned,
   `A Z1 ${R("A").z1.length}·소유 ${R("A").owned} / T Z1 ${R("T").z1.length}·소유 ${R("T").owned}`);
ok("E 직접 판단만 주장하고 근거가 없으면 근거가 서지 않는다",
   R("E").z1.length === 0, `Z1 ${R("E").z1.length}개`);
ok("F 근거만 많고 소유가 낮으면 소유가 서지 않는다",
   R("F").owned === 0, `소유 ${R("F").owned}칸 · 확인 ${R("F").confirmed}칸`);
ok("G 응답이 어긋나면 그 사실이 표시로 남는다",
   R("G").flag === "INCONSISTENT", `flag ${R("G").flag}`);

/* ── 여덟 벌이 서로 다른 말을 받는다 ───────────────────────────── */
const GAMING = ["A", "B", "C", "D", "E", "F", "G", "H"];
const same: string[] = [];
for (let n = 0; n < GAMING.length; n += 1) {
  for (let m = n + 1; m < GAMING.length; m += 1) {
    if (R(GAMING[n]).words === R(GAMING[m]).words) {
      same.push(`${GAMING[n]}~${GAMING[m]}`);
    }
  }
}
ok("여덟 벌이 서로 다른 결과 문장을 받는다", same.length === 0, same.join(" "));

/* ── §4 관심과 근거를 한 총점으로 합치지 않는다 ───────────────── */
{
  /* 관심 5 · 경험 없음 과 관심 2 · 직접 판단 충분 이 서로 다른 칸에 선다 */
  const b = R("B"), c = R("C");
  const bq = b.snap.domains.map((d) => d.quadrant);
  const cq = c.snap.domains.map((d) => d.quadrant);
  ok("관심 5·경험 없음 과 관심 2·근거 있음 이 다른 칸에 선다",
     new Set(bq).size === 1 && new Set(cq).size === 1 && bq[0] !== cq[0],
     `B ${bq[0]} / C ${cq[0]}`);
  ok("관심 5·경험 없음 이 근거가 선 영역으로 올라가지 않는다",
     b.z1.length === 0, `Z1 ${b.z1.length}개`);
  ok("관심 2·근거 있음 이 관심 낮음 묶음으로 간다",
     c.snap.zones.Z3_EVIDENCE_LOW_INTEREST.length > 0,
     `Z3 ${c.snap.zones.Z3_EVIDENCE_LOW_INTEREST.length}개`);
  /* **머리글이 묶음을 따라가는지 본다.** 전에는 Z3 을 건너뛰어서 근거가
     전부 확인된 사람이 `아직 판단할 재료가 모이지 않았습니다` 를 받았다 */
  ok("관심 2·근거 있음 에게 `재료가 모이지 않았다` 고 적지 않는다",
     c.headline === "EVIDENCE_LOW_INTEREST",
     `머리글 ${headlineKo(c.model).title}`);
  ok("관심 2·근거 있음 에게 `지금 해볼 것` 을 먼저 적지 않는다",
     c.first !== "TRY" && c.first !== "NONE",
     `첫 걸음 ${FIRST_MOVE_KO[c.model.overview.first_move]}`);
  ok("관심 5·경험 없음 에게 근거가 확인됐다고 적지 않는다",
     b.headline === "EXPLORING", `머리글 ${headlineKo(b.model).title}`);
}

/* ── §8 고르게 답한 사람에게 방향을 만들어 주지 않는다 ────────── */
for (const id of ["N1", "N2", "N3", "N4"]) {
  const r = R(id);
  ok(`${id} 고르게 답한 사람에게 근거가 선 영역을 만들지 않는다`,
     r.z1.length === 0 && r.owned === 0,
     `Z1 ${r.z1.length} · 소유 ${r.owned}`);
}
ok("N1 전부 3점이면 먼저 볼 영역을 찍지 않는다",
   R("N1").snap.focus.length === 0 || R("N1").model.overview.no_basis,
   `먼저 볼 영역 ${R("N1").snap.focus.length}개 · 응답만으로 앞서지 않음 ${R("N1").model.overview.no_basis}`);
ok("N1 전부 3점에 응답 품질 표시가 선다", R("N1").flag !== "OK",
   `flag ${R("N1").flag}`);
{
  const diff = R("N4").words !== R("N1").words;
  ok("N4 `모르겠다` 가 3점과 다른 결과를 낸다", diff,
     diff ? "결과 문장이 갈린다" : "결과 문장이 글자까지 같다");
}
ok("고르게 답한 넷이 묶여 있다는 것을 적는다",
   R("N1").snap.tied.length > 0, `묶인 묶음 ${R("N1").snap.tied.length}개`);

/* ── 등급이 올라간다고 묶음이 오르지 않는다 ───────────────────── */
{
  const a = score(build({ ...SPECS[0], tier: "BASIC" }), loaded);
  const b = score(build({ ...SPECS[0], tier: "PRO" }), loaded);
  ok("전부 최고로 답한 사람은 등급을 올려도 근거가 서지 않는다",
     a.zones.Z1_EVIDENCE_ESTABLISHED.length === 0
     && b.zones.Z1_EVIDENCE_ESTABLISHED.length === 0,
     `BASIC ${a.zones.Z1_EVIDENCE_ESTABLISHED.length} · PRO ${b.zones.Z1_EVIDENCE_ESTABLISHED.length}`);
}

/* ── §12 학위가 결과를 올리지 않는다 ──────────────────────────── */
{
  const stages = ["bachelor", "master", "phd", "postdoc"] as const;
  const seen = stages.map((st) => {
    const sub = { ...build(SPECS[SPECS.length - 1]), stage: st,
      grad_field: st === "bachelor" ? null : ("STEM" as const) };
    const s = score(sub, loaded);
    return `${s.zones.Z1_EVIDENCE_ESTABLISHED.join(",")}|${s.domains.reduce((n, d) => n + d.owned.length, 0)}`;
  });
  ok("같은 응답이면 네 학위의 근거 판정이 같다", new Set(seen).size === 1,
     seen.join(" / "));
}

/* ────────────────────────────────────────────────────────────────────
 * 보고서
 * ──────────────────────────────────────────────────────────────── */
const L: string[] = [];
L.push("# 꾸며 낸 응답과 고르게 답한 응답");
L.push("");
L.push(`core \`${core}\` · 사람 ${SPECS.length}벌. 이 문서는 \`npm run v3:gaming\` 이 만든다.`);
L.push("");
L.push("판정 규칙을 고치면 다음 실행에서 이 표가 따라온다. 손으로 고치지 않는다.");
L.push("");
L.push("## 열세 벌이 받는 결과");
L.push("");
L.push("| 벌 | 어떻게 답했나 | 근거가 선 영역 | 덜 선 영역 | 확인된 축 | 소유 축 | 머리글 | 첫 걸음 | 응답 품질 | 비어 있는 자리 | 할 일 |");
L.push("|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows) {
  L.push(`| ${r.spec.id} ${r.spec.name} | ${r.spec.what} | ${r.z1.length} | ${r.z2.length} | ${r.confirmed} | ${r.owned} | ${headlineKo(r.model).title} | ${FIRST_MOVE_KO[r.model.overview.first_move]} | ${QUALITY_KO[r.flag as keyof typeof QUALITY_KO] ?? r.flag} | ${r.gaps} | ${r.actions} |`);
}
L.push("");
L.push("## 전부 최고로 답한 사람(A)이 받는 말");
L.push("");
const a = R("A");
L.push(`- 머리글: **${headlineKo(a.model).title}**`);
L.push(`- 이끄는 줄: ${headlineKo(a.model).lead}`);
L.push(`- 첫 걸음: ${FIRST_MOVE_KO[a.model.overview.first_move]}`);
L.push(`- 응답 품질: ${QUALITY_KO[a.flag as keyof typeof QUALITY_KO] ?? a.flag}`);
L.push(`- 근거가 선 영역 ${a.z1.length}개 · 소유 축 ${a.owned}칸 · 비어 있는 자리 ${a.gaps}개`);
L.push("");
L.push("보기 넷의 맨 위를 전부 골라도 소유가 서지 않는 까닭은, 소유가 **응답과 고른 근거 둘**을 함께 보기 때문이다(`scoring/axes.ts` 의 `OWNED_EVIDENCE_MIN`). 근거가 하나도 없으면 확인까지 올라가고 거기서 멈춘다.");
L.push("");
L.push("## 고르게 답한 사람이 받는 말");
L.push("");
L.push("| 벌 | 머리글 | 이끄는 줄 |");
L.push("|---|---|---|");
for (const id of ["N1", "N2", "N3", "N4", "H"]) {
  const r = R(id);
  L.push(`| ${id} ${r.spec.name} | ${headlineKo(r.model).title} | ${headlineKo(r.model).lead} |`);
}
L.push("");
mkdirSync("docs/metri", { recursive: true });
writeFileSync(OUT, L.join("\n") + "\n");
console.log(`\n  ${OUT} 에 적었다`);
console.log(`\n  통과 ${pass} · 걸림 ${fail}`);
process.exit(fail ? 1 : 0);
