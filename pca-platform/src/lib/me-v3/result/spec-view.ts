/**
 * **그 학과가 받는 다섯 층.** 결과지가 읽는 쪽이다.
 *
 * 갈래(`major-cores.json` 의 `specializations`)는 등록부에 적혀 있었는데
 * **결과지가 그 이름만 읽고 있었다**(`result/meta.ts`). 그러면 같은 Core 를
 * 쓰는 학과 둘이 머리말의 학과 이름만 다르고 나머지가 글자까지 같은 결과를
 * 받는다. 받고 쓰지 않는 자리를 그대로 두지 않는다.
 *
 * **판정에 닿지 않는다.** 여기서 나오는 것은 전부 **사례와 읽는 차례**이고,
 * 축 수준과 묶음과 빈자리와 할 일은 결과 모델이 정한 그대로다. 그래서 이
 * 파일은 채점 모듈을 하나도 들여오지 않는다(`v3:extend` 가 센다).
 *
 * **갈래가 없으면 Core 가 들고 있는 것을 받는다.** 학과 하나가 쓰는
 * Core(간호 · 생명공학 · 심리상담)에서 갈래를 따로 두는 것은 같은 말을 두
 * 자리에 적는 일이다. 갈래는 **한 Core 를 여러 학과가 나눠 쓸 때** 그 차이를
 * 적는 자리다.
 */
import { core as coreEntry, specializationOf } from "@/lib/me-v3/core-registry";

export type SpecView = {
  /** 그 전공에서 자주 서는 장면 */
  scene: string[];
  /** 그 전공에서 흔히 남기는 것 */
  artifacts: string[];
  /** 학생이 실제로 낼 수 있는 근거 */
  evidence: string[];
  /** 읽는 차례를 정하는 코드. **점수를 만들지 않는다** */
  domainLead: string[];
  industryLead: string[];
  roleLead: string[];
};

const EMPTY: SpecView = {
  scene: [], artifacts: [], evidence: [],
  domainLead: [], industryLead: [], roleLead: [],
};

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function specView(core: string, spec: string | null): SpecView {
  let c: Record<string, unknown> | null = null;
  try { c = coreEntry(core) as unknown as Record<string, unknown>; } catch { c = null; }
  const s = spec ? (specializationOf(core, spec) as unknown as Record<string, unknown> | null) : null;
  if (!c && !s) return EMPTY;
  const pick = (k: string) => (s?.[k] ?? c?.[k]);
  const ex = obj(pick("examples"));
  return {
    scene: list(ex.scene),
    artifacts: list(ex.artifacts),
    evidence: list(ex.evidence),
    domainLead: list(obj(pick("domain_emphasis")).lead),
    industryLead: list(obj(pick("industry_mapping")).lead),
    roleLead: list(obj(pick("role_mapping")).lead),
  };
}

/**
 * 그 전공의 읽는 차례로 목록을 세운다.
 *
 * **고른 것과 걸린 것은 그대로 두고 차례만 바꾼다.** 빼거나 더하지 않는다:
 * 빼면 그 학생의 결과에서 자료가 사라지고, 더하면 응답이 가리키지 않은
 * 자리가 선다.
 */
export function leadFirst<T>(xs: T[], lead: string[], codeOf: (x: T) => string): T[] {
  if (!lead.length) return xs;
  const rank = (x: T) => {
    const i = lead.indexOf(codeOf(x));
    return i < 0 ? lead.length : i;
  };
  return xs.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i)
    .map((p) => p.x);
}
