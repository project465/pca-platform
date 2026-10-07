/**
 * Major Core 의 **판단 체크리스트**를 만든다.
 *
 * `CORE` 로 어느 core 를 만들지 고른다. 기본값은 등록부에서 짓고 있는
 * core 하나다. **파일 이름을 이 스크립트에 적지 않는다**: 등록부가
 * 가리키는 것만 읽는다(`src/lib/me-v3/core-registry.ts`).
 *
 *   taxonomy · domains · evidence_remap · checklist_additions · common_additions
 *     ↓
 *   checklists (생성물. 직접 고치지 않는다)
 *
 *   npm run v3:build
 *   CORE=EE_CORE_V1 npm run v3:build
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT_DIR, core, coreFile, hasCoreFile, registry,
} from "../src/lib/me-v3/core-registry";

const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"] as const;

type Remap = {
  rows: { evidence_id: string; label: string; bucket: string;
          targets: string[]; axis: string }[];
};
type Add = { items: { td: string; axis: string; text: string }[] };
type CommonAdd = { items: { axis: string; text: string }[] };
type Domains = { domains: { code: string; name: string; required_axes: string[] }[] };

function pickCore(): string {
  const want = process.env.CORE;
  if (want) return want;
  const building = registry().cores.filter((c) => c.status === "building");
  if (building.length !== 1) {
    throw new Error(
      `CORE 를 적어 주십시오. 짓고 있는 core 가 ${building.length}개입니다`);
  }
  return building[0].code;
}

function main(): void {
  const code = pickCore();
  const c = core(code);
  const dom = coreFile<Domains>(code, "domains");

  const byDomain: Record<string, Record<string, { text: string; from: string }[]>> = {};
  for (const d of dom.domains) {
    byDomain[d.code] = {};
    for (const a of AX) byDomain[d.code][a] = [];
  }
  const common: Record<string, { text: string; from: string }[]> = {};
  for (const a of AX) common[a] = [];

  if (hasCoreFile(code, "evidence_remap")) {
    const remap = coreFile<Remap>(code, "evidence_remap");
    for (const r of remap.rows) {
      if (r.bucket === "TD") {
        for (const t of r.targets) {
          byDomain[t]?.[r.axis]?.push({ text: r.label, from: r.evidence_id });
        }
      } else if (r.bucket === "COMMON") {
        common[r.axis]?.push({ text: r.label, from: r.evidence_id });
      }
    }
  }
  if (hasCoreFile(code, "checklist_additions")) {
    for (const it of coreFile<Add>(code, "checklist_additions").items) {
      byDomain[it.td]?.[it.axis]?.push({ text: it.text, from: "new" });
    }
  }
  if (hasCoreFile(code, "common_additions")) {
    for (const it of coreFile<CommonAdd>(code, "common_additions").items) {
      common[it.axis]?.push({ text: it.text, from: "new" });
    }
  }

  const name = c.files.checklists;
  if (!name) throw new Error(`${code} 에 checklists 파일 이름이 등록되지 않았습니다`);
  writeFileSync(join(CONTENT_DIR, name), JSON.stringify({
    schema_version: "core-checklists.1",
    core: code,
    generated_note: "`npm run v3:build` 가 만든다. 직접 고치지 말고 원본을 고친다",
    domains: byDomain,
    common,
  }, null, 1) + "\n");

  let n = 0;
  for (const d of Object.values(byDomain)) for (const v of Object.values(d)) n += v.length;
  const cn = Object.values(common).reduce((a, v) => a + v.length, 0);
  console.log(`  만들었다 ${name} — ${code} · 영역 항목 ${n}개 · 공통 ${cn}개`);
}

main();
