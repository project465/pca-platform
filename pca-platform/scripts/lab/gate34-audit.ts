/**
 * **Gate 3·4 의 금지 틀을 떠 둔 글에서 센다**(R2 §2·§12·§13).
 *
 * 자동 검사는 후보만 잡는다. 여기서 세는 것은 셋이다: 규격 §2 가 이름을
 * 댄 AI 틀 · §12 가 이름을 댄 내부 용어 · 같은 문장이 Core 를 건너
 * 서는가. 세는 자리는 `v3:content:qa` 가 **제품과 같은 길로** 떠 둔
 * 결과 쪽 글(`*.web.txt`)이고, 그 가운데 Gate 3(첫 화면)과 Gate 4(근거
 * 절)에 드는 줄만 본다.
 *
 *   DUMP=var/content-qa-r2 npx tsx scripts/lab/gate34-audit.ts
 */
import { readFileSync, readdirSync } from "node:fs";

const DUMP = process.env.DUMP ?? "var/content-qa-r2";
/* 규격 §2 가 이름을 댄 틀 */
const BAN = [
  "이 확인되었습니다", "가 확인되었습니다", "이 확인되지 않았습니다",
  "영역이 있습니다", "영역이 없습니다", "으로 이어집니다",
  "을 통해 확인할 수 있습니다", "를 통해 확인할 수 있습니다",
  "할 수 있는 경험이 있습니다", "에 꺼내 쓸 수 있습니다",
  "을 중심으로 볼 수 있습니다", "를 중심으로 볼 수 있습니다",
  "한 것으로 나타났습니다", "쪽에서 봅니다", "재료가 있습니다",
  "판단이 확인됩니다", "함께 확인됐습니다",
];
/* 규격 §12 가 이름을 댄 내부 용어. **그 분야의 말은 세지 않는다** */
const INNER = ["요구 해석", "직접 판단 경험", "근거 수준", "상태값",
  "산출물", "판정값", "taxonomy"];

/** Gate 3·4 구간만 잘라 온다. 열두 영역 절과 부록은 이 회차 밖이다 */
function slice(text: string): string {
  const a = text.indexOf("진로 진단 결과");
  const b = text.indexOf("무엇을 더 채우면 되는가");
  return text.slice(a < 0 ? 0 : a, b < 0 ? text.length : b);
}

const rows: { core: string; who: string; text: string }[] = [];
for (const f of readdirSync(DUMP).filter((x) => x.endsWith(".web.txt"))) {
  const [core, who] = f.replace(".web.txt", "").split("-");
  rows.push({ core, who, text: slice(readFileSync(`${DUMP}/${f}`, "utf8")) });
}

let bad = 0;
console.log(`\n세는 자리 ${rows.length}벌 (${DUMP})`);
console.log(`\n[§2 금지 틀]`);
for (const b of BAN) {
  const hit = rows.filter((r) => r.text.includes(b));
  if (hit.length) {
    bad += 1;
    console.log(`  걸림  ${b} — ${hit.map((h) => `${h.core}.${h.who}`).join(" ")}`);
  }
}
if (!bad) console.log(`  통과  ${BAN.length}가지 모두 0건`);

console.log(`\n[§12 내부 용어]`);
let inner = 0;
for (const b of INNER) {
  const hit = rows.filter((r) => r.text.includes(b));
  if (hit.length) {
    inner += 1;
    console.log(`  걸림  ${b} — ${hit.map((h) => `${h.core}.${h.who}`).join(" ")}`);
  }
}
if (!inner) console.log(`  통과  ${INNER.length}가지 모두 0건`);

/* ── §13 Core 를 건너 같은 문장이 서는가 ───────────────────────────── */
console.log(`\n[§13 Core 를 건너 같은 문장]`);
const byLine = new Map<string, Set<string>>();
for (const r of rows) {
  for (const raw of r.text.split("\n")) {
    const t = raw.trim();
    /* 짧은 줄과 틀(머리글·단추)은 세지 않는다 */
    if (t.length < 14) continue;
    if (!byLine.has(t)) byLine.set(t, new Set());
    byLine.get(t)!.add(r.core);
  }
}
const shared = [...byLine.entries()]
  .filter(([, cs]) => cs.size > 1)
  .map(([t, cs]) => ({ t, cs: [...cs] }));
/* 세 Core 모두에 서는 줄은 제품의 틀(안내·단추·머리)이다 */
const all = shared.filter((x) => x.cs.length === rows.length / 3 + 1);
const pair = shared.filter((x) => x.cs.length === 2);
console.log(`  Core 둘에만 서는 줄 ${pair.length}개`);
for (const x of pair.slice(0, 12)) console.log(`    ${x.cs.join(" = ")} :: ${x.t}`);
console.log(`  Core 셋에 다 서는 줄 ${shared.length - pair.length}개 (제품 틀)`);
