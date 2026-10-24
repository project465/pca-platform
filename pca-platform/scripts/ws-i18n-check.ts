/**
 * **작업공간 영어 사전에 빠진 열쇠가 없는가**(영어판 2단계b).
 *
 * 작업공간(`src/app/me/**` 과 거기에 글을 대는 라이브러리)에서 `t("…")` 로
 * 부르는 한국어 원문을 전부 뽑아 `wsSay` 사전과 견준다. 빠진 열쇠는 화면에
 * 한국어가 그대로 서므로 그 자리를 이름까지 적는다.
 *
 * 함께 보는 것:
 * - **꼬리표 짝**: `{이름}` 자리표시가 한국어와 영어에서 같은 이름인가
 *   (영어에서 빠지면 값이 사라지고, 남으면 `{n}` 이 글자로 선다)
 * - **영어 쪽에 한글이 섞였는가**
 * - **영어에 쓰지 않는 버릇**: 엠 대시 · 느낌표 · 광고 말(unlock · leverage …)
 *
 *   npx tsx scripts/ws-i18n-check.ts
 *
 * 영어 작업공간에 서지 않는 쪽(`WS_KR_ONLY`)은 세지 않는다.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { wsMissing } from "../src/lib/me-v3/ws-say";
import { WS_EN_SHELL } from "../src/lib/me-v3/ws-en/shell";
import { WS_EN_HOME } from "../src/lib/me-v3/ws-en/home";
import { WS_EN_STATE } from "../src/lib/me-v3/ws-en/state";
import { WS_EN_NEXT } from "../src/lib/me-v3/ws-en/next";
import { WS_EN_EXPERIENCE } from "../src/lib/me-v3/ws-en/experience";
import { WS_EN_RECOMPUTE } from "../src/lib/me-v3/ws-en/recompute";
import { WS_EN_RESULTS } from "../src/lib/me-v3/ws-en/results";
import { WS_EN_EXPLORE } from "../src/lib/me-v3/ws-en/explore";
import { WS_EN_PREP } from "../src/lib/me-v3/ws-en/prep";

const KR_ONLY = ["src/app/me/region", "src/app/me/jobs", "src/app/me/apply", "src/app/me/track"];
const LIBS = [
  "src/lib/me-v3/platform.ts", "src/lib/me-v3/change-text.ko.ts",
  "src/lib/me-v3/prep.ts", "src/lib/me-v3/recompute.ts",
  "src/lib/me-v3/workspace-events.ts",
];

function walk(d: string, out: string[]): string[] {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(f);
  }
  return out;
}

const files = [...walk("src/app/me", []), ...LIBS]
  .filter((f) => !KR_ONLY.some((p) => f.startsWith(p)));

/** `t("…")` · `t('…')` 의 첫 인자. 이어 붙인 문자열(`"a" + "b"`)도 한 열쇠로 읽는다 */
const CALL = /\bt\(\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)/g;
const keys = new Map<string, string>();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(CALL)) {
    const parts = [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => JSON.parse(`"${x[1]}"`));
    const k = parts.join("");
    if (/[가-힯]/.test(k)) keys.set(k, f);
  }
}

const dict: Record<string, string> = {
  ...WS_EN_SHELL, ...WS_EN_HOME, ...WS_EN_STATE, ...WS_EN_NEXT, ...WS_EN_EXPERIENCE,
  ...WS_EN_RECOMPUTE, ...WS_EN_RESULTS, ...WS_EN_EXPLORE, ...WS_EN_PREP,
};

let bad = 0;
const missing = wsMissing([...keys.keys()]);
for (const k of missing) { bad++; console.log(`  빠짐   ${keys.get(k)}: ${k.slice(0, 70)}`); }

/* **이름의 모임으로 견준다.** 영어는 같은 수를 두 번 쓰기도 한다
   (`{n} {n|item|items}`). 몇 번 나오는지가 아니라 빠지거나 남는 이름이 걸림이다 */
const vars = (s: string) => [...new Set([...s.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)(?:\|[^}]*)?\}/g)].map((m) => m[1]))].sort().join(",");
const AD = /\b(unlock|leverage|empower|seamless|journey|delve|elevate|supercharge|game-?changer)\b/i;
for (const [ko, en] of Object.entries(dict)) {
  const at = ko.slice(0, 50);
  if (vars(ko.replace(/#[a-z0-9_]+$/i, "")) !== vars(en)) { bad++; console.log(`  자리표시 다름  ${at} → ${en.slice(0, 50)}`); }
  if (/[가-힯]/.test(en)) { bad++; console.log(`  영어에 한글   ${at}`); }
  if (/—/.test(en)) { bad++; console.log(`  엠 대시       ${en.slice(0, 60)}`); }
  if (/!/.test(en)) { bad++; console.log(`  느낌표       ${en.slice(0, 60)}`); }
  if (AD.test(en)) { bad++; console.log(`  광고 말       ${en.slice(0, 60)}`); }
}

console.log(`\n열쇠 ${keys.size}개 · 사전 ${Object.keys(dict).length}줄 · 걸림 ${bad}`);
process.exit(bad ? 1 : 0);
