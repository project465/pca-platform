/**
 * **질문과 그 아래 예시 줄이 같은 일을 말하는가**(2026-11-02 대표 지시: 질문과 보기 문장 짝 전수 검사).
 *
 * 짓고 있거나 연 Core 마다, 보기 넷으로 받는 문항(L0~L3) 전부에 대해 화면이 세울 예시 줄(`exampleMatch`)을 뽑는다.
 * 걸리는 것: 세운 줄의 겹침이 `MIN_EXAMPLE_MATCH` 보다 작다(그런 줄은 세우지 않아야 한다). 그리고 사람이 찾은
 * 틀린 짝(아래 `KNOWN_BAD`)이 다시 서면 걸린다. 새 학과 · Core 를 넣어도 이 검사가 같은 자로 거른다.
 *
 *   npm run v3:example-pairs              검사(걸리면 1)
 *   REPORT=var/example-pairs.csv npm run v3:example-pairs   전수 표를 CSV 로(Core · 문항 · 질문 · 예시 · 겹침 · 세움)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { registry, coreFile } from "../src/lib/me-v3/core-registry";
import { exampleMatch, exampleOverride, MIN_EXAMPLE_MATCH } from "../src/lib/me-v3/runtime/examples";
import { readFileSync } from "node:fs";

type Item = { item_id: string; wording?: string | null; response_scale?: string | null; evidence_axis?: string | null; technical_domain?: string | null; industry_pack?: string | null };

/* 운영 시험(배재대 · 진흥원 · 고려대 세종 · 전주대)에서 사람이 찾은 틀린 짝: 질문 앞부분 ↔ 예시 앞부분 */
const KNOWN_BAD: [string, string][] = [
  ["처음에 주어진 조건을 근거를 들어 바꿔", "여러 안 가운데 하나를 골라"],
  ["말로 받은 요구를 숫자로 바꿔", "관련된 사람들의 요구를 지켜야 할 조건으로"],
  ["치수나 조건을 내가 정해 계산에", "판단 기준을 내가 세워 적용했다"],
  ["협찬사와 합의한 내용을 계약서처럼", "제안서를 문서로 남겼다"],
  ["내가 만든 자료를 다른 팀원이 받아", "회의에서 내 생각을 설명하고 동의를 얻었다"],
  ["어떤 방법을 쓸지 고른 이유를 글로", "쓸 방법을 스스로 찾아 익혀 적용했다"],
];

const cores = registry().cores.filter((c) => c.status === "building" || c.status === "live").map((c) => c.code);
const rows: string[][] = [["core", "item_id", "질문", "예시", "겹침", "세움"]];
let bad = 0, shown = 0, hidden = 0;
for (const core of cores) {
  let items: Item[] = [];
  try { items = coreFile<{ items: Item[] }>(core, "items").items ?? []; } catch { continue; }
  for (const it of items) {
    if (it.response_scale !== "L0~L3" || it.industry_pack) continue;
    const m = exampleMatch(core, it);
    const show = !!m && m.score >= MIN_EXAMPLE_MATCH;
    if (show) shown += 1; else hidden += 1;
    rows.push([core, it.item_id, it.wording ?? "", m?.text ?? "", m ? m.score.toFixed(2) : "", show ? "Y" : "N"]);
    if (m && !show) { bad += 1; console.log(`  걸림  ${core} ${it.item_id} 겹침 ${m.score.toFixed(2)} 이 기준보다 작은데 세움: ${it.wording} ↔ ${m.text}`); }
    for (const [q, e] of KNOWN_BAD) {
      if ((it.wording ?? "").includes(q) && m && m.text.includes(e)) { bad += 1; console.log(`  걸림  ${core} ${it.item_id} 알려진 틀린 짝이 다시 섰다: ${q} ↔ ${e}`); }
    }
  }
}
/* 사람이 정한 짝의 글자가 그 Core 체크리스트에 실제로 있는가(오타면 조용히 겹침 자로 돌아간다) */
const ovr = (JSON.parse(readFileSync("sites/pca-platform/content/me-v3-example-overrides.json", "utf8")) as { cores: Record<string, Record<string, string | null>> }).cores;
for (const [core, m] of Object.entries(ovr)) {
  const items = coreFile<{ items: Item[] }>(core, "items").items ?? [];
  const cl = coreFile<{ domains: Record<string, Record<string, { text: string }[]>>; common: Record<string, { text: string }[]> }>(core, "checklists");
  for (const [id, text] of Object.entries(m)) {
    const it = items.find((x) => x.item_id === id);
    if (!it) { bad += 1; console.log(`  걸림  예시 덮어쓰기: ${core} 에 ${id} 문항이 없습니다`); continue; }
    if (text === null) continue;
    const list = it.technical_domain ? cl.domains[it.technical_domain]?.[it.evidence_axis ?? ""] ?? [] : cl.common[it.evidence_axis ?? ""] ?? [];
    if (!list.some((x) => x.text === text) || exampleOverride(core, id) !== text) { bad += 1; console.log(`  걸림  예시 덮어쓰기: ${core} ${id} 의 글자가 같은 축 체크리스트에 없습니다`); }
  }
}
if (process.env.REPORT) {
  const out = path.resolve(process.env.REPORT);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `﻿${rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n")}\r\n`);
  console.log(`전수 표 → ${out}`);
}
console.log(`Core ${cores.length}개 · 예시를 세운 문항 ${shown} · 맞는 줄이 없어 세우지 않은 문항 ${hidden} · 걸림 ${bad}`);
process.exit(bad ? 1 : 0);
