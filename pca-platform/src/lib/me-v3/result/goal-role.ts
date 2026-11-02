import { coreFile, packs as readPacks } from "../core-registry";
import type { Axis } from "../scoring/types";
import type { PackView, ResultModel } from "./model";

type RolePack = {
  code: string; version: number; core_ref: { td: string[] }; required_axes: Axis[];
  compare_with: string[]; application_material?: string[];
};

/**
 * **학생이 고른 목표 직무를 첫째로 잇는다**(2026-11-02 배재대 · 고려대 세종 · 진흥원 시험: 목표 직무는
 * `데이터·분석` 인데 웹은 `경영기획` 으로 잇고 목표 직무는 `같이 놓고 보실 직무` 에만 있었다. 책은 목표 직무를 썼다).
 *
 * 굳은 결과의 `role_context` 는 검사 때 고른 관심 직무에서 왔다. 목표 직무가 따로 있고 그것과 다르면, 같은 역할팩과
 * **굳은 영역 판정**(`confirmed`)으로 그 직무의 읽는 층을 다시 짠다. **판정을 새로 만들지 않는다**: 영역 축 수준은
 * 그대로이고, 어느 영역 · 축을 먼저 읽을지만 그 직무 팩을 따른다. 원래 직무는 `같이 놓고 보실 직무` 맨 앞에 둔다
 */
export function roleForGoal(core: string, m: ResultModel): ResultModel["role_context"] {
  const goal = m.targets.goal?.role ?? null;
  const cur = m.role_context;
  if (!goal || cur?.code === goal) return cur;
  let p: RolePack | undefined;
  try { p = readPacks<{ packs: RolePack[] }>(core, "role").packs.find((x) => x.code === goal); } catch { p = undefined; }
  if (!p) return cur;
  const byCode = new Map(m.domains.map((d) => [d.code, d]));
  const established = p.core_ref.td.map((td) => ({ domain: td, axes: (byCode.get(td)?.confirmed ?? []) as Axis[] }))
    .filter((x) => x.axes.length > 0);
  const requested = p.core_ref.td.flatMap((td) => p!.required_axes
    .filter((ax) => !(byCode.get(td)?.confirmed ?? []).includes(ax)).map((axis) => ({ domain: td, axis })));
  const view: PackView = {
    ...(cur ?? ({} as PackView)),
    code: goal, version: `${goal}.v${p.version}`,
    explain_order: p.required_axes, established, requested,
    compare_with: [...(cur ? [cur.code] : []), ...p.compare_with.filter((c) => c !== cur?.code && c !== goal)],
    vocabulary: p.application_material ?? [],
    others: (cur?.others ?? []).filter((c) => c !== goal),
    /* 그 직무 문항에 답한 것은 검사 때 직무 팩 기준이라 옮기지 않는다 */
    answered: [], not_yet: [], overlap: [], domains: [...p.core_ref.td],
  } as PackView;
  return view as ResultModel["role_context"];
}

/**
 * **모자란 것을 그 산업 · 직무의 중심 영역부터**(2026-11-02 진흥원 시험 N7 · PB4). 엔진의 `requested` 는 영역 코드
 * 차례라, 웹이 첫 줄로 고르는 영역이 그 산업이 `있음` 으로만 쓰는 영역일 수 있었다(책은 `주로 중심 영역 쪽 일` 이라고
 * 적는다). 판정 값은 그대로 두고 **읽는 차례만** 관계표의 `중심 → 있음 → 나머지` 로 바꾼다
 */
export function centerFirst<P extends PackView | null | undefined>(core: string, pack: P): P {
  if (!pack) return pack;
  let rel: { td_industry: { industry: string; td: string; strength: string }[]; td_role: { role: string; td: string; strength: string }[] };
  try { rel = coreFile(core, "relations"); } catch { return pack; }
  const rows = pack.code.startsWith("ROLE_")
    ? rel.td_role.filter((r) => r.role === pack.code)
    : rel.td_industry.filter((r) => r.industry === pack.code);
  const rank = (td: string) => {
    const s = rows.find((r) => r.td === td)?.strength;
    return s === "중심" ? 0 : s === "있음" ? 1 : 2;
  };
  const requested = pack.requested.map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r.domain) - rank(b.r.domain) || a.i - b.i).map((v) => v.r);
  return { ...pack, requested };
}
