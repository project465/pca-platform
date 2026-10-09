/**
 * **런북이 가리키는 것이 실제로 있는가.**
 *
 * 운영 문서가 틀리는 방식은 거짓말이 아니라 **뒤처짐**이다. 명령 이름이
 * 바뀌고 문서가 안 바뀐다. 그러면 그 줄을 치는 사람이 `Missing script` 를
 * 받고, 급한 날에 받는다. 한 번 실제로 그랬다: 운영 안내가
 * `npm run db:v3:arch` 를 가리켰는데 **운영 이미지의 `package.json` 에는
 * 그 이름이 없었다**(거기 적힌 것은 여덟뿐이다).
 *
 * 세는 것 넷.
 *
 *   ① 적어 둔 `npm run` 이 전부 있는가
 *   ② 걸음마다 PASS 와 FAIL 이 적혀 있는가
 *   ③ 가리키는 문서가 실제로 있는가
 *   ④ 운영 컨테이너에서 치라고 적은 줄이 **그 안에 있는 명령**인가
 *
 *   npm run runbook:check
 */
import { readFileSync } from "node:fs";

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
}

const read = (f: string): string => {
  try { return readFileSync(f, "utf8"); } catch { return ""; }
};

const RUNBOOK = "docs/metri/78_production_runbook.md";

/** 운영 이미지의 `package.json`. **컨테이너에서 칠 수 있는 것은 이것뿐이다** */
const OPS_PKG = "deploy/ops/package.json";

/** 컨테이너에서 치라고 적은 절 */
const IN_CONTAINER = ["## 3.", "## 4."];

function main(): void {
  console.log("\n런북이 가리키는 것이 실제로 있는가\n");
  const md = read(RUNBOOK);
  ok(`런북이 있다 — ${RUNBOOK}`, md.length > 2000, `${md.length}자`);
  if (!md) { return; }

  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  const opsPkg = JSON.parse(read(OPS_PKG) || "{}") as { scripts?: Record<string, string> };

  /* ① 적어 둔 명령 */
  const named = [...new Set([...md.matchAll(/npm run ([a-z0-9:_-]+)/g)].map((m) => m[1]))];
  const gone = named.filter((n) => !(n in pkg.scripts));
  ok(`적어 둔 명령이 전부 있다 — ${named.length}개`, gone.length === 0, gone.join(" "));

  /* ② 걸음마다 PASS·FAIL */
  /** 표 줄만 본다. 머리글과 가름줄은 뺀다 */
  const rows = md.split("\n")
    .filter((l) => /^\| \d+-\d+ \|/.test(l))
    .map((l) => l.split("|").map((c) => c.trim()));
  const thin = rows.filter((c) => c.length < 6 || !c[3] || !c[4] || c[3] === "—");
  ok(`걸음마다 PASS 와 FAIL 이 적혀 있다 — 걸음 ${rows.length}개`,
    rows.length >= 20 && thin.length === 0,
    thin.map((c) => c[1]).join(" ") || `걸음 ${rows.length}`);

  /* ③ 가리키는 문서 */
  const docs = [...new Set([...md.matchAll(/`((?:docs\/metri\/|scripts\/)[^`]+?\.(?:md|sh))`/g)]
    .map((m) => m[1]))];
  const missing = docs.filter((d) => !read(d));
  ok(`가리키는 문서와 스크립트가 있다 — ${docs.length}개`, missing.length === 0,
    missing.join(" "));
  ok("`PRODUCTION_SWITCH.md` 가 있다", read("PRODUCTION_SWITCH.md").length > 1000);

  /**
   * ④ **컨테이너에서 치라고 적은 줄.**
   *
   * 운영 이미지의 `package.json` 은 저장소 것과 다르다(`Dockerfile` 이
   * `deploy/ops/package.json` 을 `/app/package.json` 으로 덮는다).
   * 거기 없는 이름을 적어 두면 Shell 에서 `Missing script` 가 난다.
   */
  const sect = IN_CONTAINER.map((h) => {
    const i = md.indexOf(h);
    if (i < 0) return "";
    const j = md.indexOf("\n## ", i + 1);
    return md.slice(i, j < 0 ? undefined : j);
  }).join("\n");
  const inside = [...new Set([...sect.matchAll(/npm run ([a-z0-9:_-]+)/g)].map((m) => m[1]))];
  const notThere = inside.filter((n) => !(n in (opsPkg.scripts ?? {})));
  ok(`컨테이너에서 치라고 적은 명령이 운영 이미지에 있다 — ${inside.length}개`,
    notThere.length === 0,
    notThere.length ? `${notThere.join(" ")} (${OPS_PKG} 에 없다)` : "");

  /**
   * ⑤ **못 본 것을 본 것으로 적지 않는가.**
   *
   * 이 런북의 0절이 하는 일이 그것이고, 그 절이 지워지면 다음 사람이
   * 로컬 통과를 운영 통과로 읽는다.
   */
  ok("`이 기계에서 확인할 수 없는 것` 절이 서 있다",
    /확인할 수 없는 것/.test(md) && /운영 컨테이너 Shell 뿐/.test(md)
    && /사람이 카드로/.test(md));

  console.log(`\n  명령 ${named.length}개 · 걸음 ${rows.length}개 ·`
    + ` 가리키는 문서 ${docs.length}개 · 컨테이너 명령 ${inside.length}개`);
}

main();
console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
