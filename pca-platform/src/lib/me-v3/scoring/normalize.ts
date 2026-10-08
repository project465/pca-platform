/**
 * 응답을 읽을 수 있는 모양으로 바꾼다. **빈 것의 뜻을 다섯으로 가른다.**
 *
 * `null` 하나로 뭉개면 결과지가 **안 물어본 것을 `없다` 로 적는다.** 다섯은
 * 이렇다: routing 상 열리지 않았다 · 봤는데 답하지 않았다 · 겪은 적이
 * 없다고 답했다 · **모른다고 답했다** · 답은 있고 근거가 확인되지 않았다.
 */
import { coreFile } from "../core-registry";
import { UNKNOWN, type Answer, type Axis, type MissingKind, type Submission } from "./types";

export { UNKNOWN };

export type BankItem = {
  item_id: string; module: string; tier: string;
  technical_domain: string | null; evidence_axis: Axis | null;
  industry_pack: string | null; role_function: string | null;
  measurement_axis: string; education_routing: string;
  response_scale: string | null; reverse_flag: boolean;
  consistency_pair: string | null;
  /** 어디서 온 문항인가. `me-v3-2-migration.json` 이 이 값을 센다 */
  origin?: string; old_item_id?: string | null; change_reason?: string | null;
};

/** 선별 네 축을 묻는 묶음과 심화 네 축을 묻는 묶음 */
export const PROBE_BLOCK = "PROBE-S4";
export const DEEP_BLOCK = "DEEP-S8";

export type Bank = {
  items: BankItem[];
  level_options: string[];
  assessment_version: string;
};

export function loadBank(core: string, dir?: string): Bank {
  return coreFile<Bank>(core, "items", dir);
}

/** 보기 넷을 쓰는 문항인가 */
export function isLevelItem(i: BankItem): boolean {
  return i.response_scale === "L0~L3";
}

export type Reading = {
  answer: Answer | null;
  missing: MissingKind;
};

/**
 * 한 문항의 응답을 읽는다.
 *
 * `opened` 에 없는 영역의 문항은 **열리지 않은 것**이고, 열렸는데 키가
 * 없으면 봤는데 답하지 않은 것이다.
 */
export function read(sub: Submission, item: BankItem, routed: boolean): Reading {
  if (!routed) return { answer: null, missing: "NOT_ROUTED" };
  const a = sub.answers[item.item_id];
  if (!a) return { answer: null, missing: "SKIPPED" };
  if (a.kind === "skipped") return { answer: null, missing: "SKIPPED" };
  if (a.kind === "level" && a.index === 0) return { answer: a, missing: "ANSWERED_NONE" };
  if (a.kind === "exposure" && a.value === 0) return { answer: a, missing: "ANSWERED_NONE" };
  /* `잘 모르겠다`. **수로 바꾸지 않는다**: 가운데 값으로 두면 아직 모르는
     사람이 보통 관심으로 판정된다 */
  if (a.kind === "choice" && a.value === UNKNOWN) {
    return { answer: null, missing: "ANSWERED_UNKNOWN" };
  }
  return { answer: a, missing: "NONE_MISSING" };
}

/** 학위 묶음 넷. `runtime/routing.ts` 의 `branchBlock` 과 같은 규칙이다 */
const DEGREE_ROUTES = new Set(["ug-core", "ms-core", "phd-core", "postdoc-core"]);

/**
 * 이 응시가 받는 학위 묶음.
 *
 * **`runtime/routing.ts` 의 `branchBlock` 과 한 글자도 다르면 안 된다.**
 * 화면이 묻지 않은 묶음의 응답을 채점이 세거나, 받은 응답을 채점이 버리면
 * 둘 중 하나가 거짓말을 한다. 그래서 `v3:runtime` 이 두 함수를 네 학위
 * 전부로 돌려 같은 값인지 센다.
 */
function degreeRoute(sub: Submission): string {
  if (sub.stage === "bachelor" || crossField(sub)) return "ug-core";
  if (sub.stage === "master") return "ms-core";
  if (sub.stage === "phd") return "phd-core";
  return "postdoc-core";
}

/** 그 영역을 해 본 적이 있다고 답했는가 */
function touched(sub: Submission, td: string): boolean {
  const a = sub.answers[`G_${td}_EXP`];
  return !!a && a.kind === "exposure" && a.value >= 1;
}

/**
 * 대학원이 타계열인가. **학부 기계공학인 사람만 여기까지 온다**
 * (`profileReady` 가 앞에서 거른다).
 */
function crossField(sub: Submission): boolean {
  if (sub.stage === "bachelor") return false;
  return sub.grad_field === "HUMANITIES_SOCIAL" || sub.grad_field === "BUSINESS";
}

/** 그 문항이 이 응시에서 열리는가 */
export function routedFor(sub: Submission, item: BankItem): boolean {
  const rank = { BASIC: 0, STANDARD: 1, PRO: 2 };
  if (rank[item.tier as keyof typeof rank] > rank[sub.tier]) return false;
  /* 학위 묶음. **계열 코드로 가중치를 걸지 않는다**: 어느 묶음을 받는지만
     달라지고 같은 응답이면 축 수준이 같다 */
  const r = item.education_routing;
  if (DEGREE_ROUTES.has(r) && r !== degreeRoute(sub)) return false;
  if (r === "xfield" && !crossField(sub)) return false;
  /* 영역 훑기의 학습 의향은 **선별된 영역에만** 묻는다. 열두 영역에 다
     물으면 같은 칸을 세 번 지난다. 묻지 않은 것을 `없다` 로 적지 않으려고
     여기서 routing 밖으로 내린다 */
  if (item.module === "CORE-GRID" && item.measurement_axis === "learning_intent") {
    return (sub.opened?.probe ?? []).includes(String(item.technical_domain));
  }
  if (item.technical_domain && item.module === PROBE_BLOCK) {
    if (!(sub.opened?.probe ?? []).includes(item.technical_domain)) return false;
    /* 선별 축의 **둘째 문항**은 해 본 적이 있다고 답한 영역에서만 뜬다.
       `runtime/blocks.ts` 와 같은 규칙이고, 여기서도 같이 거르지 않으면
       묻지 않은 문항이 `답하지 않았다` 로 남아 결과지가 공백으로 적는다 */
    if (/_2$/.test(item.item_id)) return touched(sub, item.technical_domain);
    return true;
  }
  if (item.technical_domain && item.module === DEEP_BLOCK) {
    return (sub.opened?.deep ?? []).includes(item.technical_domain);
  }
  /* 팩은 **묻은 것만** 센다. 화면이 상한을 두는데 채점이 전부 센다면,
     묻지 않은 문항이 `답하지 않았다` 로 남아 결과지가 그것을 공백으로
     적는다. 실제로 열린 문항 목록을 응시가 들고 다닌다 */
  if (item.module === "INDUSTRY") {
    if (!sub.industry_pack) return false;
    if (!item.item_id.startsWith(`${sub.industry_pack}_`)) return false;
    return sub.asked ? sub.asked.includes(item.item_id) : true;
  }
  if (item.module === "ROLE") {
    const picked = sub.role_interest?.length
      ? sub.role_interest : [sub.role_pack ?? ""];
    if (!picked.some((c) => c && item.item_id.startsWith(`${c}_`))) return false;
    return sub.asked ? sub.asked.includes(item.item_id) : true;
  }
  return true;
}

export function band(v: number): "LOW" | "MID" | "HIGH" {
  return v >= 4 ? "HIGH" : v <= 2 ? "LOW" : "MID";
}
