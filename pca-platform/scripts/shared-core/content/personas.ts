/**
 * R38 사람 검수용 비교표 — 합성 페르소나 넷 × Core 넷 (OUT-3 · CC-008 실험).
 *
 *   node --no-warnings --experimental-strip-types \
 *     --import ./scripts/shared-core/test/register.mjs scripts/shared-core/content/personas.ts
 *
 * 페르소나는 R37 벤치마크 사례를 그대로 쓴다(새 정답을 만들지 않는다):
 *   RICH    C01  한 영역 여덟 축 직접 수행 · 근거 둘씩
 *   POOR    C02  같은 전공 · 경험 없음
 *   CONTRA  C04  근거 없이 `직접 결정` 주장
 *   PARTIAL C07  심화 축 넷에 답하지 않음 · 그 축의 체크리스트는 고른 채
 *
 * 왼쪽은 **지금 엔진의 결과지 문장**(바꾸지 않는다), 오른쪽은 `three-way.ts` 의 **독립 실험**이다.
 * 실험 출력에 세 규칙을 걸고 어기면 FAIL 이다: 결핍 말 · 후보를 강점 근거로 · 답하지 않은 축을 개선 과제로.
 * 실제 학생 · 실제 PDF 가 아니다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { coreFile } from "../../../src/lib/me-v3/core-registry";
import { load, score } from "../../../src/lib/me-v3/scoring/engine";
import { expand } from "../../../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../../../src/lib/me-v3/result/build";
import { actionKo, gapKo, headlineKo } from "../../../src/lib/me-v3/result/text.ko";
import { BENCH_CORES, casesFor } from "../bench/cases";
import { confirmedKeys } from "../bench/keys";
import { threeWay } from "./three-way";

const OUT = process.env.OUT ?? "docs/shared-core/evidence/R38/content";
const PERSONAS = [["RICH", "C01"], ["POOR", "C02"], ["CONTRA", "C04"], ["PARTIAL", "C07"]] as const;
const DEFICIT = /부족|약점|약하|모자라|역량이 낮|능력이 없|미흡/;
const say = (x: unknown) => (typeof x === "string" ? x : [(x as { do?: string }).do ?? "", (x as { note?: string }).note ?? ""].filter(Boolean).join(" / "));

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const md: string[] = ["# R38 페르소나 × Core 비교 (생성물 · 손으로 고치지 않는다)", "",
    "합성 사례다. 왼쪽은 지금 엔진 문장(그대로), 오른쪽은 CC-008 독립 실험(`three-way.ts`, 제품에 연결 안 함).", ""];
  const json: Record<string, unknown>[] = [];
  let pass = 0, fail = 0;
  for (const core of BENCH_CORES) {
    const loaded = load(core);
    const tax = coreFile<{ technical_domains: { code: string; name: string }[] }>(core, "taxonomy");
    const nm = new Map(tax.technical_domains.map((d) => [d.code, d.name]));
    const name = (td: string) => nm.get(td) ?? td;
    md.push(`## ${core}`, "");
    for (const [p, k] of PERSONAS) {
      const spec = casesFor(core).find((s) => s.kind.startsWith(k))!;
      const sub = expand(spec.fixture, core);
      const s = score(sub, loaded);
      const m = buildResult(s, loaded);
      const hl = headlineKo(m, name);
      const tw = threeWay(sub, s, m, name);
      /* 규칙 셋 */
      const conf = new Set(confirmedKeys(s).map((x) => x.split("|").slice(2).join("|")));
      const all = [...tw.strengths, ...tw.improve, ...tw.unverified].map((x) => x.sentence);
      const r1 = all.filter((x) => DEFICIT.test(x)).length === 0;
      const r2 = tw.strengths.every((x) => x.evidence.every((e) => conf.has(e.text)));
      const r3 = tw.improve.every((x) => {
        const ax = x.axis ? s.domains.find((d) => d.code === x.domain)?.axes[x.axis] : undefined;
        return !ax || !["SKIPPED", "NOT_ROUTED", "ANSWERED_UNKNOWN"].includes(ax.missing);
      });
      /* r4 문장의 수는 스냅샷의 수와 같다 · `근거 N건` 과 `응답으로만` 이 같은 강점에 함께 서지 않는다 */
      const r4 = tw.improve.every((x) => {
        const n = /근거\(고른 항목 · 두 번째 문항\)가 (\d+)건/.exec(x.sentence)?.[1];
        if (/근거/.test(x.sentence) && /\d+건/.test(x.sentence) && n === undefined) return false; // 수를 적었는데 못 읽으면 걸린다
        const ax = x.axis ? s.domains.find((d) => d.code === x.domain)?.axes[x.axis] : undefined;
        return n === undefined || Number(n) === ax?.evidence;
      }) && tw.strengths.every((x) => !(x.evidence.length && /자기보고/.test(x.sentence)) && !(!x.evidence.length && /고른 근거로/.test(x.sentence)));
      const ok = r1 && r2 && r3 && r4;
      if (ok) pass += 1; else fail += 1;
      json.push({ core, persona: p, case: spec.id, rules: { no_deficit: r1, strengths_confirmed_only: r2, unanswered_not_improve: r3, numbers_match: r4 },
        engine: { title: hl.title, lead: hl.lead, gaps: m.gaps.map((g) => gapKo(g, name(g.domain)).title),
          actions: m.actions.slice(0, 2).map((a) => say(actionKo(a, a.domain ? name(a.domain) : "", s.stage))) },
        three_way: tw });
      md.push(`### ${p} · ${spec.id} — 규칙 ${ok ? "PASS" : "FAIL"} (결핍 말 없음 ${r1} · 강점은 확인 근거만 ${r2} · 미응답은 개선 과제 아님 ${r3} · 수와 근거 표시가 스냅샷과 같음 ${r4})`, "",
        "| 지금 엔진 (그대로) | CC-008 실험 (독립) |", "|---|---|",
        `| **머리글** ${hl.title} — ${hl.lead} | **확인된 강점** ${tw.strengths.map((x) => x.sentence).join("<br>") || "없음"} |`,
        `| **빈자리** ${m.gaps.map((g) => gapKo(g, name(g.domain)).title).join("<br>") || "없음"} | **확인된 개선 과제** ${tw.improve.map((x) => x.sentence).join("<br>") || "없음"} |`,
        `| **할 일** ${m.actions.slice(0, 2).map((a) => say(actionKo(a, a.domain ? name(a.domain) : "", s.stage))).join("<br>") || "없음"} | **미확인 · 추가 검증 권고** ${tw.unverified.map((x) => x.sentence).join("<br>") || "없음"} |`, "");
    }
  }
  writeFileSync(join(OUT, "personas.json"), `${JSON.stringify(json, null, 2)}\n`);
  writeFileSync(join(OUT, "personas.md"), `${md.join("\n").replace(/\|(?!\s*-)([^\n]*?)\n/g, (x) => x)}\n`);
  console.log(`  r4 가 수를 읽은 문장 ${json.reduce((n, r) => n + ((r.three_way as { improve: { sentence: string }[] }).improve.filter((x) => /두 번째 문항\)가 \d+건/.test(x.sentence)).length), 0)}개`);
  console.log(`  페르소나 ${PERSONAS.length} × Core ${BENCH_CORES.length} = ${pass + fail} · 실험 규칙 PASS ${pass} · FAIL ${fail}`);
  process.exitCode = fail ? 1 : 0;
}

main();
