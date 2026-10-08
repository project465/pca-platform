/**
 * fixture 를 실제 응답으로 펼친다.
 *
 * 사람 열두 벌을 문항 번호로 적으면 아무도 읽지 못한다. 그래서 fixture 는
 * 영역과 축으로 적고 여기서 문항 번호로 바꾼다. **체크리스트 항목은
 * 지어내지 않고** 실제 파일에서 앞에서부터 센다: 없는 항목을 근거로 세면
 * 검사가 제품보다 느슨해진다.
 */
import { coreFile } from "../core-registry";
import type { Answer, Axis, Submission } from "./types";
import { DEEP_BLOCK, PROBE_BLOCK, type Bank } from "./normalize";

export type Fixture = {
  id: string; name: string;
  tier: Submission["tier"]; stage: Submission["stage"];
  field: Submission["grad_field"];
  undergrad?: Submission["undergrad_core"];
  probe: string[]; deep: string[];
  grid?: Record<string, [number, number, number]>;
  axes?: Record<string, Record<string, number | number[]>>;
  checklist?: Record<string, Record<string, number>>;
  artifacts?: Record<string, number>;
  verify?: Record<string, number>;
  answers?: Record<string, Answer>;
  industry?: string | null;
  role?: string | null;
  roles?: string[];
  orgs?: string[];
  expect?: Record<string, {
    zone?: string; reasons?: string[]; owned_has?: string[];
    confirmed_min?: number; next?: string[]; next_has?: string[]; quadrant?: string;
  }>;
  expect_focus?: string[];
  expect_quality?: string;
  golden?: string;
};

type Checklists = { domains: Record<string, Record<string, { text: string }[]>> };
type Domains = { domains: { code: string; artifacts: string[]; verify_targets: string[] }[] };

export function expand(f: Fixture, core: string, dir?: string): Submission {
  const bank = coreFile<Bank>(core, "items", dir);
  const lists = coreFile<Checklists>(core, "checklists", dir);
  const dom = coreFile<Domains>(core, "domains", dir);

  const answers: Record<string, Answer> = { ...(f.answers ?? {}) };
  /* 심화를 연 영역은 선별 네 축도 함께 열린다 */
  const probe = [...new Set([...f.probe, ...f.deep])].sort();

  for (const [td, g] of Object.entries(f.grid ?? {})) {
    answers[`G_${td}_INT`] = { kind: "scale5", value: g[0] };
    answers[`G_${td}_EXP`] = { kind: "exposure", value: g[1] };
    answers[`G_${td}_LEA`] = { kind: "scale5", value: g[2] };
  }
  /* 관심과 경험은 열두 영역 전부가 받는다. 적지 않은 영역은 가운데 값이다.
     **학습 의향은 선별된 영역에만 둔다**: 화면이 그 영역만 묻는다 */
  for (const d of dom.domains) {
    if (!answers[`G_${d.code}_INT`]) {
      answers[`G_${d.code}_INT`] = { kind: "scale5", value: 3 };
      answers[`G_${d.code}_EXP`] = { kind: "exposure", value: 0 };
    }
    if (!probe.includes(d.code)) delete answers[`G_${d.code}_LEA`];
  }

  for (const [td, byAxis] of Object.entries(f.axes ?? {})) {
    for (const [ax, v] of Object.entries(byAxis)) {
      const ids = bank.items
        .filter((i) => i.technical_domain === td && i.evidence_axis === ax &&
          (i.module === PROBE_BLOCK || i.module === DEEP_BLOCK))
        .map((i) => i.item_id).sort();
      /* **수 하나를 적으면 그 칸의 문항 전부가 같은 값을 받는다.** 선별
         축은 영역마다 문항이 둘이고, 하나만 채우면 나머지가 `봤는데 답하지
         않았다` 로 남아 fixture 가 제품과 다른 상태를 만든다 */
      const vals = Array.isArray(v) ? v : ids.map(() => v);
      ids.forEach((id, n) => {
        if (vals[n] === undefined) return;
        answers[id] = { kind: "level", index: vals[n] };
      });
    }
  }

  const checklists: Record<string, string[]> = {};
  for (const [td, byAxis] of Object.entries(f.checklist ?? {})) {
    for (const [ax, n] of Object.entries(byAxis)) {
      const pool = (lists.domains[td]?.[ax] ?? []).map((x) => x.text);
      if (pool.length < n) {
        throw new Error(`${td}.${ax} 체크리스트가 ${pool.length}개인데 ${n}개를 고르라고 적혀 있다`);
      }
      checklists[`${td}.${ax}`] = pool.slice(0, n);
    }
  }
  const artifacts: Record<string, string[]> = {};
  for (const [td, n] of Object.entries(f.artifacts ?? {})) {
    const pool = dom.domains.find((d) => d.code === td)?.artifacts ?? [];
    artifacts[td] = pool.slice(0, n);
  }
  const verifications: Record<string, string[]> = {};
  for (const [td, n] of Object.entries(f.verify ?? {})) {
    const pool = dom.domains.find((d) => d.code === td)?.verify_targets ?? [];
    verifications[td] = pool.slice(0, n);
  }

  return {
    attempt_id: f.id, tier: f.tier, stage: f.stage, grad_field: f.field,
    undergrad_core: f.undergrad ?? null,
    answers, checklists, artifacts, verifications,
    opened: { probe, deep: [...f.deep].sort() },
    industry_interest: f.industry ? [f.industry] : [],
    role_interest: f.roles ?? (f.role ? [f.role] : []),
    org_interest: f.orgs ?? [],
    industry_pack: f.industry ?? null, role_pack: f.role ?? null,
  };
}

/** 키 순서를 고정해 지문을 뜬다. 순서가 바뀌어도 같은 값이 나와야 한다 */
export function stable(v: unknown): string {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") {
      return Object.fromEntries(Object.keys(x as Record<string, unknown>).sort()
        .map((k) => [k, walk((x as Record<string, unknown>)[k])]));
    }
    return x;
  };
  return JSON.stringify(walk(v));
}

/** 축 Jn 목록 */
export const AXES: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
