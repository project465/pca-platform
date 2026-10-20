/**
 * **Track B 2차 · 학과마다 결과 내용이 실제로 갈리는가.**
 *
 * 서버 PASS(115/115)는 길이 열렸다는 뜻이고 그 학과의 말로 읽힌다는 뜻이
 * 아니다. 그래서 배재대 자리마다 학생이 받는 일곱 칸을 꺼내 견준다:
 *
 *   전공지식(먼저 읽는 영역) · 도구·방법(J4 근거 항목) · 산업 · 역할 ·
 *   기업 · Evidence/Gap · 행동 제안
 *
 * 앞의 넷과 행동 제안은 **학과 층**(`specView` · 등록부 갈래)에서 오고,
 * Evidence/Gap 은 **대표 입력**(`_v3-answer.ts` 의 사람 B · C)으로 Core 마다
 * 실제로 제출해 굳은 결과 모델에서 꺼낸다. 같은 Core 안에서 Evidence/Gap
 * 판정이 학과에 따라 갈리지 않는 것은 **설계다**(판정 불변 · 측정 동결).
 *
 *   PGPORT=5433 DATABASE_URL=postgres:///cm_iso_c V3_PREVIEW_OPEN='*' \
 *     OUT=docs/metri/review/tracks-r2/B npx tsx scripts/lab/trackB-content.ts
 */
import { loadEnv, makeStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { query, queryOne } from "../../src/lib/db";
import * as S from "../../src/lib/me-v3/runtime/session";
import { allLeaves, university } from "../../src/lib/campus/registry";
import { packs } from "../../src/lib/me-v3/core-registry";
import { specView } from "../../src/lib/me-v3/result/spec-view";
import type { ResultModel } from "../../src/lib/me-v3/result/model";
import { answerAll, PEOPLE } from "../_v3-answer";

const URL_ = process.env.DATABASE_URL ?? "";
if (process.env.PGPORT !== "5433" || !/^postgres(ql)?:\/\/\/cm_iso_c\b/.test(URL_)) {
  console.error(`격리 클러스터(5433 · cm_iso_c)가 아니다: ${URL_}`); process.exit(2);
}
const OUT = process.env.OUT ?? "docs/metri/review/tracks-r2/B";

type Leaf = { code: string; name: string; core: string; spec: string | null; catalog: string };
type Pack = { code: string; name_ko: string };

const AX: Record<string, string> = {
  J1: "문제 정의", J2: "요구 해석", J3: "직접 판단", J4: "방법·도구",
  J5: "산출물", J6: "비교·검증", J7: "실패·수정", J8: "조직 활용",
};

function names(core: string, codes: string[], kind: "industry" | "role"): string[] {
  try {
    const p = packs<{ packs: Pack[] }>(core, kind).packs;
    return codes.map((c) => p.find((x) => x.code === c)?.name_ko ?? c);
  } catch { return codes; }
}
function domainNames(core: string, codes: string[]): string[] {
  const ds = S.content(core).domains.domains;
  return codes.map((c) => ds.find((d) => d.code === c)?.name ?? c);
}

async function representative(core: string, who: number): Promise<ResultModel> {
  const u = await makeStudent(`zztb-rep-${core.toLowerCase()}-${who}`);
  const a = await S.openAttempt({ userId: u.id, tier: "PRO", stage: "bachelor", gradField: null, core });
  await answerAll(core, a, u.id, PEOPLE[who]);
  await S.submit((await S.attemptOf(a.id, u.id))!);
  const r = await queryOne<{ m: ResultModel }>(`SELECT result_model m FROM v3_snapshots WHERE attempt_id=$1 ORDER BY id DESC LIMIT 1`, [a.id]);
  return r!.m;
}

const jac = (a: string[], b: string[]): number => {
  const A = new Set(a), B = new Set(b);
  if (!A.size && !B.size) return 1;
  let i = 0; for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i);
};

async function main(): Promise<void> {
  const u = university("PCU")!;
  const leaves: Leaf[] = allLeaves(u)
    .filter((r) => r.leaf.core_code && !r.leaf.routing_only)
    .map((r) => ({ code: r.leaf.code, name: r.leaf.name, core: r.leaf.core_code!, spec: r.leaf.specialization ?? null, catalog: r.catalog.catalog_code }));
  const cores = [...new Set(leaves.map((l) => l.core))].sort();
  console.log(`자리 ${leaves.length} · Core ${cores.length}`);

  /* 대표 입력: Core 마다 사람 B(해 봤고 정리 안 됨) · C(직접 수행 + 증거) */
  const rep = new Map<string, { B: ResultModel; C: ResultModel }>();
  for (const c of cores) {
    rep.set(c, { B: await representative(c, 1), C: await representative(c, 2) });
    process.stdout.write(`  대표 입력 ${c}\n`);
  }

  type Card = {
    leaf: Leaf; knowledge: string[]; tools: string[]; industry: string[]; role: string[];
    companies: string; evidenceEx: string[]; gapB: string[]; action: string[];
  };
  const cards: Card[] = leaves.map((l) => {
    const sv = specView(l.core, l.spec);
    const tax = S.content(l.core).domains.domains.map((d) => d.code);
    const lead = sv.domainLead.length ? sv.domainLead : tax.slice(0, 3);
    const td = lead[0];
    const j4 = (S.content(l.core).checklists.domains[td]?.J4 ?? []).slice(0, 2).map((x) => x.text);
    const R = rep.get(l.core)!;
    return {
      leaf: l,
      knowledge: domainNames(l.core, lead.slice(0, 3)),
      tools: j4,
      industry: names(l.core, sv.industryLead.slice(0, 3), "industry"),
      role: names(l.core, sv.roleLead.slice(0, 3), "role"),
      companies: "학생 결과지에 기업 칸 없음(지역 기관 0줄) · BIZ GM 미리보기만",
      evidenceEx: sv.evidence.slice(0, 2),
      gapB: R.B.gaps.slice(0, 3).map((g) => `${domainNames(l.core, [g.domain])[0]}·${g.axis ? AX[g.axis] : g.kind}`),
      action: [sv.evidenceFirst, sv.application.resume].filter(Boolean),
    };
  });

  /* 같은 Core 안의 서로 다른 학과 짝: 일곱 칸 가운데 몇 칸이 같은가 */
  const FIELDS: (keyof Card)[] = ["knowledge", "tools", "industry", "role", "evidenceEx", "action"];
  const pairs: string[] = ["| Core | 학과 A | 학과 B | 같은 칸(6) | 같은 칸 이름 | 판정 |", "|---|---|---|---|---|---|"];
  let generic = 0; let pairN = 0; let lineageN = 0;
  const flagged = new Set<string>();
  for (const c of cores) {
    const cs = cards.filter((x) => x.leaf.core === c);
    const byName = new Map<string, Card>();
    for (const x of cs) if (!byName.has(x.leaf.name)) byName.set(x.leaf.name, x);
    const uniq = [...byName.values()];
    for (let i = 0; i < uniq.length; i++) for (let j = i + 1; j < uniq.length; j++) {
      const a = uniq[i], b = uniq[j];
      const same = FIELDS.filter((f) => JSON.stringify(a[f]) === JSON.stringify(b[f]));
      pairN++;
      /* 학년도가 다르고 같은 갈래면 **개편 계보 후보**다(등록부 `lineage_candidates`).
         같은 학과가 이름만 바뀐 자리라 같은 내용이 맞다. 계보 자체는 확정되지 않았다 */
      const lineage = a.leaf.catalog !== b.leaf.catalog && !!a.leaf.spec && a.leaf.spec === b.leaf.spec;
      const bad = same.length >= 5 && !lineage;
      if (lineage) lineageN++;
      if (bad) { generic++; flagged.add(a.leaf.name); flagged.add(b.leaf.name); }
      pairs.push(`| ${c} | ${a.leaf.name} | ${b.leaf.name} | ${same.length} | ${same.join(" · ") || "-"} | ${bad ? "**GENERIC**" : lineage ? "개편 계보 후보(같은 갈래 · 계보 미확정)" : "PASS"} |`);
    }
  }

  /* 같은 사람(B)의 Gap 이 Core 마다 갈리는가 */
  const gapSig = cores.map((c) => ({ c, s: rep.get(c)!.B.gaps.map((g) => `${g.domain}:${g.axis}`).join(",") }));
  const coreGapDistinct = new Set(gapSig.map((x) => x.s)).size;
  /* 같은 Core 에서 사람 B 와 C 의 결과가 갈리는가 */
  const personSplit = cores.filter((c) => {
    const R = rep.get(c)!;
    return JSON.stringify(R.B.overview) !== JSON.stringify(R.C.overview) || R.B.gaps.length !== R.C.gaps.length;
  }).length;

  const matrix: string[] = ["| 학과(Catalog) | Core | 전공지식 · 먼저 읽는 영역 | 도구·방법 근거 항목 | 산업(읽는 차례) | 역할(읽는 차례) | 근거 예시 | 행동 제안 |", "|---|---|---|---|---|---|---|---|"];
  for (const x of cards) {
    const cell = (v: string[]) => (v.length ? v.join(" / ") : "(없음)").replace(/\|/g, "/").slice(0, 140);
    matrix.push(`| ${x.leaf.name} (${x.leaf.catalog === "PCU_2027" ? "2027" : "2026"}) | ${x.leaf.core.replace("_CORE_V1", "").replace("_CORE_V3", "")} | ${cell(x.knowledge)} | ${cell(x.tools)} | ${cell(x.industry)} | ${cell(x.role)} | ${cell(x.evidenceEx)} | ${cell(x.action)} |`);
  }

  const showcase = ["PCU26_BIZ", "PCU26_TOURISM", "PCU26_NURSING", "PCU26_EE", "PCU26_BATTERY"]
    .map((code) => cards.find((x) => x.leaf.code === code)).filter(Boolean) as Card[];
  const sc: string[] = [];
  for (const x of showcase) {
    const R = rep.get(x.leaf.core)!;
    sc.push(`### ${x.leaf.name} · ${x.leaf.core} · 갈래 ${x.leaf.spec ?? "(Core 가 든다)"}`, "",
      `- 대표 입력: 사람 B(${PEOPLE[1].name}) · 사람 C(${PEOPLE[2].name}) — \`scripts/_v3-answer.ts\``,
      `- 전공지식(먼저 읽는 영역): ${x.knowledge.join(" · ")}`,
      `- 산업: ${x.industry.join(" · ") || "(없음)"} / 역할: ${x.role.join(" · ") || "(없음)"}`,
      `- 사람 B 의 Gap 상위 셋: ${x.gapB.join(" · ") || "(없음)"}`,
      `- 사람 C 의 근거가 선 영역: ${R.C.domains.filter((d) => d.zone.startsWith("Z1")).map((d) => domainNames(x.leaf.core, [d.code])[0]).join(" · ") || "(없음)"}`,
      `- 사람 B 의 근거가 선 영역: ${R.B.domains.filter((d) => d.zone.startsWith("Z1")).map((d) => domainNames(x.leaf.core, [d.code])[0]).join(" · ") || "(없음)"} · 정리만 남은 영역: ${R.B.domains.filter((d) => d.zone.startsWith("Z2")).length}`,
      `- 사람 B 의 할 일 첫 줄: ${R.B.actions[0] ? `${domainNames(x.leaf.core, [R.B.actions[0].domain ?? ""])[0]} · ${R.B.actions[0].code}` : "(없음)"}`,
      `- 근거 예시: ${x.evidenceEx.join(" / ") || "(없음)"}`,
      `- 행동 제안: ${x.action.join(" / ") || "(없음)"}`, "");
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "DEPT_CONTENT.md"), [
    "# Track B 2차 · 학과마다 결과 내용이 실제로 갈리는가", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · DB \`${URL_}\` (격리 5433) · 자리 ${leaves.length} · Core ${cores.length}`,
    "- 학과 층(먼저 읽는 영역 · 산업 · 역할 · 근거 예시 · 행동 제안)은 결과지가 읽는 `specView()` 를 그대로 부른다.",
    "- Evidence/Gap 은 Core 마다 대표 입력 둘을 실제로 제출해 굳은 결과 모델에서 꺼냈다. **같은 Core 안에서 학과에 따라 판정이 갈리지 않는 것은 설계다**(측정 동결).",
    "- 기업 칸: 학생 결과지에는 기업 후보 칸이 없다(지역 기관 자료 0줄 · 채용 미확인). BIZ GM 미리보기에만 있다 → **NOT AVAILABLE**.",
    "- 2026/2027 공식 교육과정 원문 대조: **NOT VERIFIED** (`www.pcu.ac.kr` CONNECT 403 · `logs/pcu-reach.log`).", "",
    "## 요약", "",
    `- 같은 Core 의 서로 다른 이름 짝 ${pairN} 가운데 여섯 칸 중 다섯 칸 이상이 같은 짝(GENERIC): **${generic}**`,
    `- 학년도가 달라 같은 갈래를 쓰는 개편 계보 후보 짝: ${lineageN} (같은 내용이 맞다 · 계보 확정은 공식 원문 확인 뒤)`,
    `- 같은 사람(B)의 Gap 이 Core 마다 갈린다: 서로 다른 Gap 묶음 ${coreGapDistinct} / Core ${cores.length}`,
    `- 같은 Core 에서 사람 B 와 C 의 결과가 갈린다: ${personSplit} / ${cores.length}`,
    flagged.size ? `- GENERIC 으로 걸린 학과: ${[...flagged].join(" · ")}` : "- GENERIC 으로 걸린 학과: 없음", "",
    "## 대표 학과 다섯", "", ...sc,
    "## 같은 Core 안 학과 짝", "", ...pairs, "",
    "## 자리별 일곱 칸", "", ...matrix, "",
  ].join("\n"));
  writeFileSync(path.join(OUT, "dept-content.json"), JSON.stringify({ cards, pairs: pairN, generic, coreGapDistinct, personSplit }, null, 1));

  /* 시험 계정 치우기 */
  await query(`DELETE FROM v3_attempts WHERE user_id IN (SELECT id FROM users WHERE login_id LIKE 'zztb-rep-%')`).catch(() => undefined);
  console.log(`\n짝 ${pairN} · GENERIC ${generic} · Gap 갈림 ${coreGapDistinct}/${cores.length} · 사람 갈림 ${personSplit}/${cores.length}`);
  process.exit(generic ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
