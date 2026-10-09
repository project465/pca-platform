/**
 * **신규 사용자가 옛 검사로 들어갈 길이 있는가.**
 *
 * 이 검사가 생긴 까닭. 감사에서 공개 진입 동선 네 자리가 전부 옛 검사를
 * 가리키고 있는 것이 나왔다(`/free → /test` · `/redeem → /test` ·
 * `/checkout/complete → /assessment/start`). 넷 다 **주소를 손으로 적어
 * 둔 자리**였고, 그래서 판본이 하나 올라갈 때마다 네 자리를 따로 고쳐야
 * 했고, 실제로 ME_V3 로 올라가면서 한 자리도 안 고쳐졌다.
 *
 * 고친 것은 `src/lib/engine-entry.ts` 한 자리로 모은 것이다. 그러나
 * **모으는 것만으로는 돌아온다**: 다음 사람이 급할 때 `href="/test"` 를
 * 한 줄 적고, 그 줄은 아무 검사도 걸리지 않는다. 그래서 센다.
 *
 * **DB 를 보지 않는다.** 묻는 것은 "그 상품이 지금 무엇을 가리키는가" 가
 * 아니고 **"코드에 그 길이 적혀 있는가"** 다. 상품 자료는 바뀌지만 적어
 * 둔 주소는 코드가 들고 있다.
 *
 * 세는 것 넷.
 *
 *   ① 표와 실제 쪽이 맞는가        미분류 0 · 중복 0 · 없는 쪽 0
 *   ② 신규 진입면에 옛 검사 주소가 있는가
 *   ③ 옛 검사 주소를 적어 둔 자리가 한 곳뿐인가
 *   ④ 표에 적어 둔 성격대로 도는가  REDIRECT 가 실제로 보내는가
 *
 *   npm run routes:check
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  CURRENT_ASSESSMENT, OWNED_SEGMENTS, ROUTE_TABLE,
  resumePathFor, startPathFor,
} from "../src/lib/engine-entry";

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
}

const read = (f: string): string => {
  try { return readFileSync(f, "utf8"); } catch { return ""; }
};

/** 주석을 **길이를 지키며** 공백으로 덮는다. 까닭을 적어 둔 줄이 걸리면 안 된다 */
function code(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + blank(m.slice(p1.length)));
}

const pages = execFileSync("git", ["ls-files", "src/app"], { encoding: "utf8" })
  .split("\n").filter((f) => /\/page\.tsx$/.test(f));

/** `src/app/v3/[attemptId]/result/page.tsx` → `/v3/[attemptId]/result` */
function routeOf(f: string): string {
  const r = f.replace(/^src\/app/, "").replace(/\/page\.tsx$/, "")
    .replace(/\/\([^/]*\)/g, "");
  return r || "/";
}
const fileOf = new Map<string, string>();
for (const f of pages) fileOf.set(routeOf(f), f);

/** 첫 칸이 소유 구역인가 */
const owned = (r: string): boolean => OWNED_SEGMENTS.includes(r.split("/")[1] ?? "");

/**
 * **옛 검사의 주소.**
 *
 * `/report/` 와 `/evidence` 는 빼 둔다: 옛 결과지는 **그 판본으로 응시한
 * 분이 메일로 받은 주소**라 작업공간이 그 줄을 가리키는 것이 맞다. 세는
 * 것은 **새로 시작하는 길**이다.
 */
const LEGACY_ENTRY = [
  { at: "/test", why: "ME_V1 응시 시작" },
  { at: "/assessment/start", why: "ME_V2 응시 시작" },
];

/** 옛 주소를 적어 둘 수 있는 유일한 자리 */
const LEGACY_HOME = "src/lib/engine-entry.ts";

function main(): void {
  console.log(`\n신규 사용자가 옛 검사로 들어갈 길이 있는가 — 지금 판본 ${CURRENT_ASSESSMENT}\n`);

  const cls = new Map<string, string>();
  const dupe: string[] = [];
  for (const row of ROUTE_TABLE) {
    if (cls.has(row.route)) dupe.push(row.route);
    cls.set(row.route, row.cls);
  }

  /* ① 표와 실제 쪽 */
  ok(`route 가 표에 한 번씩만 적혀 있다 — 줄 ${ROUTE_TABLE.length}개`,
    dupe.length === 0, dupe.join(" / "));

  const ghost = ROUTE_TABLE.map((r) => r.route).filter((r) => !fileOf.has(r));
  ok("표의 route 가 전부 실제 쪽이다", ghost.length === 0, ghost.join(" / "));

  const inScope = [...fileOf.keys()].filter(owned).sort();
  const unclassified = inScope.filter((r) => !cls.has(r));
  ok(`소유 구역의 쪽이 전부 분류돼 있다 — 쪽 ${inScope.length}개`,
    unclassified.length === 0, unclassified.join(" / "));

  /* ② 신규 진입면에서 옛 검사로 가는 길 */
  const entry = [...cls.entries()]
    .filter(([, c]) => c === "CURRENT" || c === "REDIRECT")
    .map(([r]) => fileOf.get(r) ?? "").filter(Boolean);
  /* 모든 쪽이 지나가는 자리도 함께 본다. 띠에 한 줄 적으면 전부에서 열린다 */
  const shared = execFileSync("git", ["ls-files", "src/components", "src/app/me", "src/lib"],
    { encoding: "utf8" }).split("\n").filter((f) => /\.(ts|tsx)$/.test(f) && f !== LEGACY_HOME);

  const edges: string[] = [];
  for (const f of [...new Set([...entry, ...shared])]) {
    const c = code(read(f));
    for (const L of LEGACY_ENTRY) {
      /* 주소 글자. 뒤에 글자가 더 붙는 것(`/testimonial`)은 세지 않는다 */
      const re = new RegExp(`["'\`]${L.at}(["'\`?#])`, "g");
      for (const m of c.matchAll(re)) {
        edges.push(`${f}:${c.slice(0, m.index).split("\n").length} → ${L.at} (${L.why})`);
      }
    }
  }
  ok("신규 진입면에 옛 검사로 가는 줄이 없다", edges.length === 0, edges.slice(0, 5).join(" / "));

  /**
   * ③ 옛 주소를 적어 둔 자리가 한 곳뿐.
   *
   * **제 구역 안을 가리키는 것은 뺀다.** 옛 검사 안의 쪽이 제 시작
   * 화면으로 돌려보내는 것(`/test/[id]` 이 응시를 못 찾으면 `/test` 로)은
   * 그 판본으로 응시하던 분을 제자리로 보내는 줄이고, 그것까지 세면
   * **보존하기로 한 길이 스스로 끊긴다.** 세는 것은 밖에서 거기로 들어가는
   * 길이다.
   */
  const own = new Map<string, string>();
  for (const [r, c] of cls) {
    if (c !== "COMPATIBILITY") continue;
    const f = fileOf.get(r);
    if (f) own.set(f, r.split("/")[1] ?? "");
  }
  const all = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
    .split("\n").filter((f) => /\.(ts|tsx)$/.test(f));
  const spelled: string[] = [];
  for (const f of all) {
    if (f === LEGACY_HOME) continue;
    const c = code(read(f));
    for (const L of LEGACY_ENTRY) {
      if (own.get(f) === L.at.split("/")[1]) continue;   /* 제 구역 안이다 */
      const re = new RegExp(`["'\`]${L.at}(["'\`?#])`, "g");
      for (const m of c.matchAll(re)) {
        spelled.push(`${f}:${c.slice(0, m.index).split("\n").length}`);
      }
    }
  }
  ok(`옛 검사 주소를 적어 둔 자리가 \`engine-entry.ts\` 하나뿐이다`,
    spelled.length === 0, spelled.slice(0, 6).join(" / "));

  /* ④ 함수가 실제로 그렇게 도는가 */
  ok("`startPathFor` 가 지금 판본에만 주소를 준다",
    startPathFor(CURRENT_ASSESSMENT) === "/cores"
    && startPathFor("ME_V2") === null && startPathFor("ME_V1") === null
    && startPathFor(null) === null,
    `${startPathFor("ME_V2")} / ${startPathFor("ME_V1")}`);
  ok("`resumePathFor` 는 옛 판본에만 주소를 준다",
    resumePathFor("ME_V2") === "/assessment/start" && resumePathFor("ME_V1") === "/test"
    && resumePathFor(CURRENT_ASSESSMENT) === null);

  /* ⑤ 공개 진입 쪽이 주소를 손으로 적지 않고 함수를 거친다 */
  const BUY = ["src/app/checkout/complete/page.tsx", "src/app/free/actions.ts",
    "src/app/free-start/actions.ts", "src/app/free-start/page.tsx",
    "src/app/redeem/actions.ts"];
  const hand = BUY.filter((f) => !/\bstartPathFor\(/.test(read(f)));
  ok(`산 뒤에 보내는 자리가 전부 \`startPathFor\` 를 거친다 — 자리 ${BUY.length}곳`,
    hand.length === 0, hand.join(" / "));

  /* ⑥ REDIRECT 로 적어 둔 쪽이 실제로 보낸다 */
  const still = ROUTE_TABLE.filter((r) => r.cls === "REDIRECT")
    .filter((r) => !/redirect\(/.test(read(fileOf.get(r.route) ?? "")))
    .map((r) => r.route);
  ok("REDIRECT 로 적어 둔 쪽이 실제로 보낸다", still.length === 0, still.join(" / "));

  /* ⑦ 카탈로그가 지금 판본만 내놓는다 */
  const cat = read("src/lib/catalog.ts");
  ok("가격표가 지금 판본만 읽는다 (`assessment_version` 으로 거른다)",
    /assessment_version\s*=/.test(cat) && /CURRENT_ASSESSMENT/.test(cat));

  const n = (c: string) => ROUTE_TABLE.filter((r) => r.cls === c).length;
  console.log(`\n  route ${ROUTE_TABLE.length}줄 — CURRENT ${n("CURRENT")} ·`
    + ` COMPATIBILITY ${n("COMPATIBILITY")} · REDIRECT ${n("REDIRECT")} ·`
    + ` DEPRECATED ${n("DEPRECATED")} · 소유 구역 밖 ${fileOf.size - inScope.length}쪽`);
}

main();
console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
