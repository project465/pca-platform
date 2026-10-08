/**
 * 산업과 역할은 **읽는 층이다.** Core 판정을 다시 계산하지 않는다.
 *
 * 반도체를 고르든 방산을 고르든 강하게 드러난 기술영역은 같아야 한다.
 * 달라지는 것은 설명하는 순서와 비어 있는 축을 그 분야 말로 다시 읽어
 * 주는 문장과 견줄 직무뿐이다. 그래서 이 파일은 **입력을 읽고 context 를
 * 만들어 돌려주기만 한다.**
 */
import { readFileSync } from "node:fs";
import { CONTENT_DIR } from "../core-registry";
import type { Axis, DomainResult, PackContext } from "./types";
import { isConfirmed } from "./axes";

type IndustryPack = {
  code: string; version: number; name_ko: string;
  axis_emphasis: Record<string, Axis[]>;
  vocabulary?: string[];
};
type RolePack = {
  code: string; version: number; name_ko: string;
  core_ref: { td: string[]; rf: string[] };
  required_axes: Axis[];
  compare_with: string[];
  application_material?: string[];
};

function load<T>(file: string, dir: string): { packs: T[] } {
  return JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
}

export function industryContext(
  code: string | null, domains: DomainResult[], dir = CONTENT_DIR,
): PackContext | null {
  if (!code) return null;
  const p = load<IndustryPack>("industry-packs.json", dir).packs
    .find((x) => x.code === code);
  if (!p) throw new Error(`없는 산업팩이다: ${code}`);
  const byCode = new Map(domains.map((d) => [d.code, d]));
  const focus = Object.keys(p.axis_emphasis).sort();
  const requested: { domain: string; axis: Axis }[] = [];
  for (const td of focus) {
    for (const ax of p.axis_emphasis[td]) {
      const d = byCode.get(td);
      if (!d || !isConfirmed(d.axes[ax].state)) requested.push({ domain: td, axis: ax });
    }
  }
  /* 설명하는 순서. 그 산업이 더 보는 축을 앞에 둔다 */
  const order = [...new Set(focus.flatMap((td) => p.axis_emphasis[td]))];
  return {
    code, version: `${code}.v${p.version}`,
    explain_order: order,
    domains_in_focus: focus,
    requested_evidence: requested,
    compare_with: [],
    vocabulary: p.vocabulary ?? [],
  };
}

export function roleContext(
  code: string | null, domains: DomainResult[], dir = CONTENT_DIR,
): PackContext | null {
  if (!code) return null;
  const p = load<RolePack>("role-packs.json", dir).packs.find((x) => x.code === code);
  if (!p) throw new Error(`없는 역할팩이다: ${code}`);
  const byCode = new Map(domains.map((d) => [d.code, d]));
  const requested: { domain: string; axis: Axis }[] = [];
  for (const td of p.core_ref.td) {
    for (const ax of p.required_axes) {
      const d = byCode.get(td);
      if (!d || !isConfirmed(d.axes[ax].state)) requested.push({ domain: td, axis: ax });
    }
  }
  return {
    code, version: `${code}.v${p.version}`,
    explain_order: p.required_axes,
    domains_in_focus: [...p.core_ref.td].sort(),
    requested_evidence: requested,
    compare_with: p.compare_with,
    vocabulary: p.application_material ?? [],
  };
}
