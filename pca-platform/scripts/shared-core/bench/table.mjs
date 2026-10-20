/**
 * R37 — results.json 을 사람이 읽는 표로 옮긴다(손으로 적지 않는다).
 *   node scripts/shared-core/bench/table.mjs [results.json] > cases.md
 */
import { readFileSync } from "node:fs";
const f = process.argv[2] ?? "docs/shared-core/evidence/R37/bench/results.json";
const d = JSON.parse(readFileSync(f, "utf8"));
const cell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const out = [];
out.push("# R37 Core 품질 벤치마크 v1 — 사례 표", "",
  `생성: \`node scripts/shared-core/bench/table.mjs\` · 원자료 \`${f}\``, "",
  "합성 사례다. 통과가 학술적 타당성이나 실제 직무 추천 정확성을 뜻하지 않는다.", "",
  "| 사례 | 입력 | 기대 특성 | 필수 근거 | 금지 과장 | 빈자리 조건 | 실제 출력 | 판정 |",
  "|---|---|---|---|---|---|---|---|");
for (const c of d.cases) {
  const a = c.actual;
  const act = [
    `${a.d1} ${a.zone}`,
    `확인 ${a.confirmed.length ? a.confirmed.join("+") : "-"}`,
    `소유 ${a.owned.length ? a.owned.join("+") : "-"}`,
    a.reasons.length ? `까닭 ${a.reasons.join("+")}` : "",
    `품질 ${a.quality}`,
    `결과지 빈자리(d1) ${a.gaps_d1.length ? a.gaps_d1.join(",") : "-"}`,
    `스냅샷 empty(d1) ${a.empty_d1.length ? a.empty_d1.join("+") : "-"}`,
    `머리글 「${a.headline}」`,
    `근거 did ${a.tally.raw.did} · 고유 ${a.tally.unique_key} · 네 목록 합 ${a.tally.raw.sum4}`,
  ].filter(Boolean).join(" · ");
  out.push(`| ${cell(c.id)} | ${cell(c.input)} | ${cell(c.expect.join(" / "))} | ${cell(c.must_ground.join(" / "))} | ${cell(c.forbidden.join(" / "))} | ${cell(c.gap_condition)} | ${cell(act)} | ${c.verdict} (${c.checks.filter((x) => x.ok).length}/${c.checks.length}) |`);
}
console.log(out.join("\n"));
