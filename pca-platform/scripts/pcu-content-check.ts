/**
 * **학과마다 제 전공의 말로 읽히는가**(PCU 학과 콘텐츠 완성 §2 · §15 · §19).
 *
 * 묻는 것은 `Core 에 붙어 있는가` 가 아니다. 그것은 `campus:check` 가 이미
 * 센다. 여기서 묻는 것은 **그 학과 학생이 받은 결과가 그 학과의 것인가**다.
 * 같은 Core 를 쓰는 자리 둘이 학과 이름만 바꾸면 같은 글이면, 그 둘 가운데
 * 하나는 남의 결과를 받은 것이다.
 *
 * 자리마다 셋으로 가른다.
 *
 *   COMPLETE  그대로 쓸 수 있다
 *   THIN      Core 는 붙었는데 그 학과의 맥락이 얕다
 *   GENERIC   같은 Core 의 다른 자리와 학생에게 보이는 글이 거의 같다
 *
 * **읽기만 한다.** 등록부도 DB 도 쓰지 않고 서버도 부르지 않는다.
 *
 *   npm run pcu:content
 */
import { writeFileSync, mkdirSync } from "node:fs";
import {
  allLeaves, offered, universities, visible, type CampusLeaf,
} from "../src/lib/campus/registry";
import {
  core as coreEntry, packs as packsOf, specializationOf,
  type CoreEntry, type Specialization,
} from "../src/lib/me-v3/core-registry";

const OUT = process.env.OUT ?? "var/pcu-content";
const UNIV = process.env.UNIV ?? "PCU";

/** 갈래가 들고 있어야 하는 것. **수는 받은 규격이 적어 준 선이다**(§9) */
const NEED = {
  domainLead: 3, scene: 3, artifacts: 3, evidence: 5, industryLead: 2, roleLead: 2,
};

type Layers = {
  domainLead: string[]; industryLead: string[]; roleLead: string[];
  scene: string[]; artifacts: string[]; evidence: string[];
  first: string; next: string;
};

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/**
 * 그 자리가 받는 다섯 층.
 *
 * **갈래가 없으면 Core 가 들고 있는 것을 받는다.** 학과 하나가 쓰는
 * Core(간호 · 생명공학 · 심리상담)에서는 갈래를 따로 두는 것이 같은 말을
 * 두 자리에 적는 일이다. 갈래는 **한 Core 를 여러 학과가 나눠 쓸 때**
 * 그 차이를 적는 자리다.
 */
function layersOf(s: Specialization | null, c: CoreEntry | null): Layers {
  const pick = (k: keyof Specialization) =>
    (s?.[k] as unknown) ?? (c as unknown as Record<string, unknown>)?.[k];
  const de = obj(pick("domain_emphasis")), im = obj(pick("industry_mapping"));
  const rm = obj(pick("role_mapping")), ex = obj(pick("examples")),
    ea = obj(pick("evidence_action"));
  return {
    domainLead: list(de.lead), industryLead: list(im.lead), roleLead: list(rm.lead),
    scene: list(ex.scene), artifacts: list(ex.artifacts), evidence: list(ex.evidence),
    first: typeof ea.first === "string" ? ea.first : "",
    next: typeof ea.next === "string" ? ea.next : "",
  };
}

/** 학생에게 보이는 글만 모은다. **코드는 섞지 않는다**: 코드가 달라도 글이 같으면 같은 결과다 */
function prose(l: Layers): string[] {
  return [...l.scene, ...l.artifacts, ...l.evidence, l.first, l.next].filter(Boolean);
}

/** 세 글자 묶음 겹침. `v3:wording` 과 같은 자다 */
function grams(s: string): Set<string> {
  const t = s.replace(/\s+/g, "");
  const out = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i += 1) out.add(t.slice(i, i + 3));
  return out;
}
function jaccard(a: string, b: string): number {
  const A = grams(a), B = grams(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const g of A) if (B.has(g)) hit += 1;
  return hit / (A.size + B.size - hit);
}

/** 그 Core 의 팩이 들고 있는 코드. 읽지 못하면 비운다(세지 않는다) */
function packCodes(core: string, kind: "industry" | "role"): Set<string> {
  try {
    const p = packsOf<{ packs?: { code?: string }[] }>(core, kind);
    return new Set((p.packs ?? []).map((x) => x.code ?? "").filter(Boolean));
  } catch { return new Set(); }
}

type Row = {
  leaf: string; name: string; college: string; catalog: string;
  core: string | null; spec: string | null;
  grade: "COMPLETE" | "THIN" | "GENERIC" | "NO_CORE" | "ROUTING";
  why: string[];
};

function main(): void {
  const u = universities().find((x) => x.university_code === UNIV);
  if (!u) { console.error(`${UNIV} 를 등록부에서 찾지 못했다`); process.exit(1); }
  const leaves = allLeaves(u).filter(offered).filter((r) => visible(r.leaf));

  /* 같은 (Core · 갈래) 를 가리키는 자리는 같은 글을 받는다. 글은 한 번만 잰다 */
  const seenPair = new Map<string, Layers>();
  const pairLeaves = new Map<string, CampusLeaf[]>();
  for (const r of leaves) {
    const key = `${r.leaf.core_code ?? "-"}/${r.leaf.specialization ?? "-"}`;
    pairLeaves.set(key, [...(pairLeaves.get(key) ?? []), r]);
    if (!seenPair.has(key) && r.leaf.core_code) {
      seenPair.set(key, layersOf(r.leaf.specialization
        ? specializationOf(r.leaf.core_code, r.leaf.specialization) : null,
      coreEntry(r.leaf.core_code)));
    }
  }

  /* ── 같은 Core 안에서 글이 겹치는 짝 ── */
  const generic = new Set<string>();
  const pairs = [...seenPair.entries()];
  const overlap: string[] = [];
  for (let i = 0; i < pairs.length; i += 1) {
    for (let j = i + 1; j < pairs.length; j += 1) {
      const [ka, la] = pairs[i], [kb, lb] = pairs[j];
      if (ka.split("/")[0] !== kb.split("/")[0]) continue;
      const a = prose(la).join(" "), b = prose(lb).join(" ");
      if (!a && !b) { generic.add(ka); generic.add(kb); continue; }
      const jac = jaccard(a, b);
      if (jac >= 0.6) {
        generic.add(ka); generic.add(kb);
        overlap.push(`${ka} · ${kb} — 학생에게 보이는 글 겹침 ${jac.toFixed(2)}`);
      }
    }
  }

  const rows: Row[] = [];
  for (const r of leaves) {
    const key = `${r.leaf.core_code ?? "-"}/${r.leaf.specialization ?? "-"}`;
    const why: string[] = [];
    if (!r.leaf.core_code) {
      /**
       * **전공을 고르는 자리는 콘텐츠를 받는 자리가 아니다.**
       *
       * 자율전공학부처럼 `routing_only` 인 칸은 고르면 전공 목록으로
       * 돌려보낸다. 그 자리에 Core 를 붙이면 아직 전공을 고르지 않은
       * 학생이 **남의 전공의 자로 재어진다.** 그래서 `Core 없음` 이 맞는
       * 상태이고, 세는 자리에서 뺀다.
       */
      rows.push({
        leaf: r.leaf.code, name: r.leaf.name, college: r.college.name,
        catalog: r.catalog.catalog_code, core: null, spec: null,
        grade: r.leaf.routing_only ? "ROUTING" : "NO_CORE",
        why: r.leaf.routing_only ? [] : ["Core 가 붙어 있지 않다"],
      });
      continue;
    }
    const c = coreEntry(r.leaf.core_code);
    const l = seenPair.get(key)!;
    /**
     * 한 Core 를 **학과 여럿**이 나눠 쓰는데 갈래가 없으면 그 자리는 남의
     * 글을 받는다.
     *
     * **Catalog 쌍둥이를 둘로 세지 않는다**: 2026 과 2027 에 같은 이름으로
     * 선 자리는 같은 학과이고, 그것을 둘로 세면 **학과 하나가 쓰는 Core**
     * 까지 갈래를 요구하게 된다.
     */
    const shareCore = new Set(leaves
      .filter((x) => x.leaf.core_code === r.leaf.core_code)
      .map((x) => x.leaf.name)).size;
    if (!r.leaf.specialization && shareCore > 1) why.push("갈래 없이 Core 를 바로 가리킨다");
    if (l.domainLead.length < NEED.domainLead) why.push(`강조 영역 ${l.domainLead.length} / ${NEED.domainLead}`);
    if (l.scene.length < NEED.scene) why.push(`장면 ${l.scene.length} / ${NEED.scene}`);
    if (l.artifacts.length < NEED.artifacts) why.push(`산출물 예시 ${l.artifacts.length} / ${NEED.artifacts}`);
    if (l.evidence.length < NEED.evidence) why.push(`학생이 낼 수 있는 근거 ${l.evidence.length} / ${NEED.evidence}`);
    if (!l.first || !l.next) why.push("다음에 할 일이 비어 있다");
    if (l.industryLead.length < NEED.industryLead) why.push(`산업 ${l.industryLead.length} / ${NEED.industryLead}`);
    if (l.roleLead.length < NEED.roleLead) why.push(`직무 ${l.roleLead.length} / ${NEED.roleLead}`);
    /**
     * 가리키는 코드가 그 Core 의 팩 안에 있는가(§12).
     *
     * **파일 이름을 세지 않는다**: 등록부의 `packs.industry` 는 파일 이름
     * 이고 코드 목록이 아니다. 처음에 그것을 코드로 읽어 **이 검사가 한
     * 번도 걸리지 않는 줄**이 됐다. 팩을 열어 코드를 읽는다.
     */
    for (const [kind, codes] of [
      ["산업", l.industryLead], ["직무", l.roleLead],
    ] as [string, string[]][]) {
      const have = packCodes(r.leaf.core_code, kind === "산업" ? "industry" : "role");
      if (!have.size) continue;
      for (const code of codes) {
        if (!have.has(code)) why.push(`${kind} ${code} 가 이 Core 의 팩에 없다`);
      }
    }
    const grade: Row["grade"] = generic.has(key) ? "GENERIC" : (why.length ? "THIN" : "COMPLETE");
    rows.push({
      leaf: r.leaf.code, name: r.leaf.name, college: r.college.name,
      catalog: r.catalog.catalog_code, core: r.leaf.core_code,
      spec: r.leaf.specialization ?? null, grade, why,
    });
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/content.tsv`,
    `${["자리", "이름", "단과대학", "Catalog", "Core", "갈래", "판정", "까닭"].join("\t")}\n`
    + rows.map((r) => [r.leaf, r.name, r.college, r.catalog, r.core ?? "", r.spec ?? "",
      r.grade, r.why.join(" / ")].join("\t")).join("\n") + "\n");

  const by = (g: Row["grade"]) => rows.filter((r) => r.grade === g);
  console.log(`PCU 학과 콘텐츠 — 자리 ${rows.length} · ${OUT}/content.tsv`);
  console.log(`  COMPLETE ${by("COMPLETE").length} · THIN ${by("THIN").length}`
    + ` · GENERIC ${by("GENERIC").length} · Core 없음 ${by("NO_CORE").length}`
    + ` · 전공 고르는 자리 ${by("ROUTING").length}`);

  const byCollege = new Map<string, Row[]>();
  for (const r of rows) byCollege.set(r.college, [...(byCollege.get(r.college) ?? []), r]);
  console.log("\n  단과대학별");
  for (const [name, list0] of byCollege) {
    const n = (g: Row["grade"]) => list0.filter((r) => r.grade === g).length;
    console.log(`    ${name.padEnd(16)} 자리 ${String(list0.length).padStart(3)}`
      + ` · COMPLETE ${n("COMPLETE")} · THIN ${n("THIN")} · GENERIC ${n("GENERIC")}`);
  }
  if (overlap.length) {
    console.log(`\n  학과 이름만 바꾸면 같은 글 — ${overlap.length}짝`);
    for (const o of overlap.slice(0, 10)) console.log(`    ${o}`);
    if (overlap.length > 10) console.log(`    … 그 밖에 ${overlap.length - 10}짝`);
  }
  const bad = rows.filter((r) => r.grade !== "COMPLETE" && r.grade !== "ROUTING");
  if (bad.length) {
    console.log(`\n  얕은 자리 ${bad.length}`);
    for (const r of bad.slice(0, 12)) {
      console.log(`    ${r.leaf.padEnd(22)} ${r.name.padEnd(18)} ${r.grade} — ${r.why[0] ?? ""}`);
    }
    if (bad.length > 12) console.log(`    … 그 밖에 ${bad.length - 12}자리`);
    process.exitCode = 1;
  }
}

main();
