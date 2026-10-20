/**
 * `docs/jju/qa/abc-results.json` 을 사람이 읽는 표로. **손으로 옮기지 않는다.**
 *   node scripts/jju-abc-doc.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
const d = JSON.parse(readFileSync("docs/jju/qa/abc-results.json", "utf8"));
const t = JSON.parse(readFileSync("docs/jju/qa/pdf/report-text.json", "utf8"));
const P = []; const ids = Object.keys(d.dump);
const cell = (v) => (Array.isArray(v) ? v.join(" / ") : typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")).replace(/\|/g, "\\|") || "—";
P.push("# 합성 QA 학생 A·B·C 비교 (같은 트랙 · 같은 검사 · 공통 엔진)", "");
P.push(`트랙 \`${d.track}\` · \`scripts/jju-verify.ts\` 가 제품 함수로 응시를 열고 답하고 제출한 굳은 결과를 \`scripts/jju-abc-doc.mjs\` 가 표로 옮겼다. 결과를 하드코딩하지 않았다.`, "");
P.push(`| 항목 | ${ids.map((k) => `${k} · ${d.dump[k].label}`).join(" | ")} |`, `|---|${ids.map(() => "---").join("|")}|`);
const rows = [["지금 상태", "badge"], ["머리글", "headline"], ["이끄는 줄", "lead"], ["먼저 볼 영역(강점 후보)", "focus"],
  ["근거가 선 영역", "evidence_ready"], ["정리가 남은 영역", "evidence_partial"], ["센 수", "counts"],
  ["채울 부분(Gap)", "gaps"], ["이어 볼 일", "roles"], ["이어 볼 산업", "industries"], ["응답 품질", "quality"]];
for (const [n, k] of rows) P.push(`| ${n} | ${ids.map((i) => cell(d.dump[i].read[k])).join(" | ")} |`);
P.push(`| 첫 할 일 | ${ids.map((i) => cell(d.dump[i].read.actions[0]?.do)).join(" | ")} |`);
P.push(`| 응시 화면 수 | ${ids.map((i) => d.dump[i].screens.length).join(" | ")} |`);
P.push(`| 판본 | ${ids.map((i) => `${d.dump[i].versions.item_bank_version} · ${d.dump[i].versions.scoring_version}`).join(" | ")} |`, "");
P.push("## 같은 문장이 둘 이상에게 나간 자리 (결함 후보)", "");
const keys = ["badge", "headline", "lead", "focus", "gaps", "roles", "industries"];
for (const k of keys) {
  const m = new Map(); for (const i of ids) { const v = JSON.stringify(d.dump[i].read[k]); m.set(v, [...(m.get(v) ?? []), i]); }
  for (const [v, who] of m) if (who.length > 1) P.push(`- \`${k}\` 가 ${who.join("·")} 에게 같다: ${cell(JSON.parse(v))}`);
}
const lines = Object.fromEntries(ids.map((i) => [i, new Set(t[i].split("\n").filter((l) => l.startsWith("- ")))]));
const shared = [...lines[ids[0]]].filter((l) => ids.every((i) => lines[i].has(l)));
P.push("", `PDF 본문 줄 가운데 셋 모두에 같은 줄: ${shared.length}줄 (출처·검증 절과 고정 안내가 대부분이다)`);
for (const l of shared) P.push(`  ${l.slice(0, 140)}`);
writeFileSync("docs/jju/ABC_COMPARISON.md", P.join("\n") + "\n");
console.log(P.join("\n"));
