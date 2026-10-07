/**
 * ME_V3 영역 사전에서 **판단 체크리스트**를 만든다.
 *
 * 세 파일을 읽어 하나로 묶는다. 손으로 고치는 곳은 앞의 셋이고
 * 생성물은 고치지 않는다(`value:build` 와 같은 규칙이다).
 *
 *   me-v3-taxonomy.json            축 셋과 별칭과 경계
 *   me-v3-domains.json             영역별 흐름과 축의 수행·소유 조건
 *   me-v3-evidence-remap.json      199영역의 재배치
 *   me-v3-checklist-additions.json 영역 빈 칸을 메우려고 새로 쓴 항목
 *   me-v3-common-additions.json    공통 판단의 빈 칸
 *     ↓
 *   me-v3-checklists.json          영역 × 축 → 고를 항목 (생성물)
 *
 *   npm run v3:build
 */
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "sites/pca-platform/content";
const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"] as const;

type Remap = {
  rows: {
    evidence_id: string; label: string; bucket: string; targets: string[];
    axis: string; verdict: string; description: string; keywords: string[];
  }[];
};
type Add = { items: { td: string; axis: string; text: string; source: string }[] };
type Domains = { domains: { code: string; name: string; required_axes: string[] }[] };

function read<T>(name: string): T {
  return JSON.parse(readFileSync(`${DIR}/${name}`, "utf8")) as T;
}

function main(): void {
  const dom = read<Domains>("me-v3-domains.json");
  const remap = read<Remap>("me-v3-evidence-remap.json");
  const add = read<Add>("me-v3-checklist-additions.json");

  const byDomain: Record<string, Record<string, { text: string; from: string }[]>> = {};
  for (const d of dom.domains) {
    byDomain[d.code] = {};
    for (const a of AX) byDomain[d.code][a] = [];
  }

  for (const r of remap.rows) {
    if (r.bucket !== "TD") continue;
    for (const t of r.targets) {
      if (!byDomain[t]) continue;
      byDomain[t][r.axis].push({ text: r.label, from: r.evidence_id });
    }
  }
  for (const it of add.items) {
    if (!byDomain[it.td]) continue;
    byDomain[it.td][it.axis].push({ text: it.text, from: "new" });
  }

  /* 공통 판단은 영역에 붙지 않는다. 번역 layer 와 공통 문항이 읽는다 */
  const common: Record<string, { text: string; from: string }[]> = {};
  for (const a of AX) common[a] = [];
  for (const r of remap.rows) {
    if (r.bucket !== "COMMON") continue;
    common[r.axis].push({ text: r.label, from: r.evidence_id });
  }
  const commonAdd = read<{ items: { axis: string; text: string }[] }>(
    "me-v3-common-additions.json");
  for (const it of commonAdd.items) common[it.axis]?.push({ text: it.text, from: "new" });

  const out = {
    schema_version: "me-v3-checklists.1",
    generated_note:
      "`npm run v3:build` 가 만든다. 직접 고치지 말고 원본 셋을 고친다",
    domains: byDomain,
    common,
  };
  writeFileSync(`${DIR}/me-v3-checklists.json`,
    JSON.stringify(out, null, 1) + "\n");

  let n = 0;
  for (const d of Object.values(byDomain)) for (const v of Object.values(d)) n += v.length;
  const c = Object.values(common).reduce((a, v) => a + v.length, 0);
  console.log(`  만들었다 me-v3-checklists.json — 영역 항목 ${n}개 · 공통 ${c}개`);
}

main();
