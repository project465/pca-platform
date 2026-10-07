/**
 * ME_V3 1~4단계 데이터가 설 수 있는 상태인가. **데이터만 읽는다.**
 *
 * 열두 가지를 센다. 끝났다고 말할 조건이 이 목록이고, 하나라도 깨지면
 * 문항을 쓰기 시작하지 않는다. 지금 제품이 어긋난 자리가 여기였다:
 * 증거 신호 표가 열여섯 직무 가운데 여덟에만 있어서 판정 경로가 직무에
 * 따라 갈렸다.
 *
 *   npm run v3:domains
 */
import { readFileSync, existsSync } from "node:fs";
import {
  CONTENT_DIR as DIR, core, coreFile, hasCoreFile, contractGaps, registry,
} from "../src/lib/me-v3/core-registry";

const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"] as const;

function pickCore(): string {
  if (process.env.CORE) return process.env.CORE;
  const b = registry().cores.filter((c) => c.status === "building");
  if (b.length !== 1) throw new Error(`CORE 를 적어 주십시오. 짓고 있는 core ${b.length}개`);
  return b[0].code;
}

let fail = 0;
let pass = 0;
function ok(name: string, good: boolean, detail = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${name}${detail ? " — " + detail : ""}`); }
  else { fail += 1; console.log(`  걸림  ${name}${detail ? " — " + detail : ""}`); }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function main(): void {
  const code = pickCore();
  console.log(`  core  ${code} — ${core(code).name_ko}\n`);

  const gaps = contractGaps(code);
  ok("core 가 등록부 계약을 지킨다", gaps.length === 0,
     gaps.length ? gaps.join(" · ") : "required 파일과 열쇠");
  if (gaps.length) { console.log("\n계약을 먼저 맞추십시오"); process.exit(1); }

  const tax = coreFile<any>(code, "taxonomy");
  const dom = coreFile<any>(code, "domains");
  const lists = coreFile<any>(code, "checklists");
  const remap = hasCoreFile(code, "evidence_remap")
    ? coreFile<any>(code, "evidence_remap") : { rows: [] };
  const src = hasCoreFile(code, "legacy_evidence_map")
    ? coreFile<any>(code, "legacy_evidence_map") : null;
  const TD: string[] = dom.domains.map((d: any) => d.code);

  // 1. 축 셋이 비어 있지 않고 등록부에 적힌 수와 맞는다
  const want = core(code).domain_count;
  ok("축 셋의 개수", tax.technical_domains.length > 0 &&
     tax.role_functions.length > 0 && tax.org_contexts.length > 0 &&
     (want === null || tax.technical_domains.length === want),
     `TD ${tax.technical_domains.length} · RF ${tax.role_functions.length} · OC ${tax.org_contexts.length}`);

  // 2. 별칭이 조합으로 풀린다
  const tdSet = new Set<string>(tax.technical_domains.map((d: any) => d.code));
  const rfSet = new Set<string>(tax.role_functions.map((d: any) => d.code));
  const ocSet = new Set<string>(tax.org_contexts.map((d: any) => d.code));
  const badAlias = tax.job_aliases.filter((a: any) =>
    a.td.some((x: string) => !tdSet.has(x)) ||
    a.rf.some((x: string) => !rfSet.has(x)) ||
    a.oc.some((x: string) => !ocSet.has(x)));
  ok("별칭이 조합으로 풀린다", badAlias.length === 0,
     `${tax.job_aliases.length}줄 · 못 푼 줄 ${badAlias.length}`);

  // 3. 경계표의 구분 질문. 영역 수에 비례해 요구한다
  const badB = tax.boundaries.filter((b: any) => !b.a_question || !b.b_question);
  const needB = Math.max(5, Math.ceil(tax.technical_domains.length * 0.8));
  ok("경계 쌍마다 구분 질문 둘", tax.boundaries.length >= needB && badB.length === 0,
     `${tax.boundaries.length}쌍 (최소 ${needB})`);

  // 4. 필수 축이 둘이고 축 목록 안에 있다
  const badReq = dom.domains.filter((d: any) =>
    d.required_axes.length !== 2 || d.required_axes.some((a: string) => !AX.includes(a as any)));
  ok("영역마다 필수 축 둘", badReq.length === 0);

  // 5. 흐름 여덟 걸음
  const badW = dom.domains.filter((d: any) =>
    d.workflow.length !== 8 || d.workflow.some((w: any) => !w.detail));
  ok("영역마다 업무 흐름 여덟 걸음", badW.length === 0);

  // 6. 축 칸이 전부 채워져 있다 (영역 수 × 축 수)
  const emptyCell: string[] = [];
  for (const d of dom.domains) {
    for (const a of AX) {
      const c = d.axes[a];
      if (!c || !c.l2 || !c.l3) emptyCell.push(`${d.code}.${a}`);
    }
  }
  ok("축 칸마다 수행과 소유 조건", emptyCell.length === 0,
     emptyCell.length ? emptyCell.join(" ") : `${dom.domains.length * AX.length} / ${dom.domains.length * AX.length}`);

  // 7. 조직별 성과 이름이 조직 수만큼
  const ocN = tax.org_contexts.length;
  const badOC = dom.domains.filter((d: any) => Object.keys(d.org_outcomes).length !== ocN);
  ok("영역 × 조직환경 성과 이름", badOC.length === 0,
     `${dom.domains.length * ocN}칸`);

  // 8. 기관 이름을 적지 않았다
  const named = /서울대|포스텍|삼성|현대|한국항공우주|ETRI|코레일|원자력/;
  const hitNamed = dom.domains.filter((d: any) =>
    Object.values(d.org_outcomes).some((v: any) => named.test(String(v))));
  ok("조직은 유형까지만 적는다", hitNamed.length === 0);

  // 9. 옛 증거 지도가 있으면 고아가 없다. 없는 core 는 지나간다
  if (src) {
    const srcIds = new Set<string>();
    for (const f of src.families) for (const r of f.evidence_requirements) srcIds.add(r.evidence_id);
    const mapped = new Set<string>(remap.rows.map((r: any) => r.evidence_id));
    const orphan = [...srcIds].filter((i) => !mapped.has(i));
    ok("옛 증거 지도의 고아", orphan.length === 0,
       `원본 ${srcIds.size} · 재배치 ${mapped.size} · 고아 ${orphan.length}`);
  } else {
    pass += 1;
    console.log("  지나감 옛 증거 지도 — 이 core 에는 재배치할 옛 자산이 없다");
  }

  // 10. 버킷과 판정 값이 정해진 것 안에 있다
  const BK = new Set(["TD", "COMMON", "RF", "OC", "DROP"]);
  const VD = new Set(["유지", "이동", "병합", "분리", "삭제", "승격"]);
  const badRow = remap.rows.filter((r: any) =>
    !BK.has(r.bucket) || !VD.has(r.verdict) || !AX.includes(r.axis) ||
    (r.bucket === "TD" && r.targets.length === 0));
  ok("재배치 줄의 값이 정해진 것 안", badRow.length === 0);

  // 11. 영역 × 축 체크리스트가 비어 있지 않다
  const holes: string[] = [];
  for (const c of TD) for (const a of AX) {
    if ((lists.domains[c]?.[a] ?? []).length === 0) holes.push(`${c}.${a}`);
  }
  ok("영역 × 축 칸마다 고를 항목", holes.length === 0,
     holes.length ? holes.join(" ") : `${TD.length * AX.length} / ${TD.length * AX.length}`);

  // 12. 필수 축에 항목이 둘 이상
  const thin: string[] = [];
  for (const d of dom.domains) {
    for (const a of d.required_axes) {
      if ((lists.domains[d.code]?.[a] ?? []).length < 2) thin.push(`${d.code}.${a}`);
    }
  }
  ok("필수 축마다 항목 둘 이상", thin.length === 0,
     thin.length ? thin.join(" ") : `${dom.domains.length * 2} / ${dom.domains.length * 2}`);

  // --- coverage matrix ---
  console.log("\n영역 × 측정축 coverage (고를 항목 수. * 는 필수 축)\n");
  console.log("      " + AX.map((a) => a.padStart(5)).join("") + "   합");
  for (const d of dom.domains) {
    const cells = AX.map((a) => {
      const n = (lists.domains[d.code]?.[a] ?? []).length;
      const star = d.required_axes.includes(a) ? "*" : " ";
      return `${String(n).padStart(4)}${star}`;
    });
    const sum = AX.reduce((x, a) => x + (lists.domains[d.code]?.[a] ?? []).length, 0);
    console.log(`${d.code} ` + cells.join("") + `  ${String(sum).padStart(4)}`);
  }
  const commonSum = AX.reduce((x, a) => x + (lists.common[a] ?? []).length, 0);
  console.log("\n공통 판단 " + AX.map((a) => `${a} ${(lists.common[a] ?? []).length}`).join(" · ") +
              `  합 ${commonSum}`);

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main();
