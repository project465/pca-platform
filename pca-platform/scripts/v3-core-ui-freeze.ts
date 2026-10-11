/**
 * Core 화면 여덟을 **한 묶음으로 얼었다고 선언하고 그 선언을 지킨다**
 * (`CAREERMATRI_CORE_UI_FREEZE_1`).
 *
 * 측정 동결(`ME_V3_MEASUREMENT_FREEZE_1`)과 **별개다.** 저쪽이 얼린 것은
 * 응답을 받는 방식과 판단으로 바꾸는 방식이고, 여기가 얼린 것은 그 판단을
 * 사람이 **어떤 화면으로 읽고 어떤 차례로 누르는가**다. 둘을 한 묶음으로
 * 두면 홈의 카드 하나를 옮긴 날 측정 동결이 깨지고, 그러면 사람이
 * `UI 때문이니 다시 적자` 로 넘긴다. 한 번 넘기면 그 동결은 아무것도 막지
 * 않는다.
 *
 * **판정을 두 곳에서 하지 않는다.** 파일이 바뀌었는지는 이미 세 동결이
 * 센다(`v3:freeze` · `v3:result:freeze` · `v3:workspace`). 여기가 세는
 * 것은 그 셋을 **묶는 자리**가 그대로인가다.
 *
 *   1. 세 동결 기록의 지문과 판본 여섯이 묶음 기록과 글자로 같다
 *   2. Core 화면 여덟이 **빠짐없이 어느 한 동결 안에** 들어 있다
 *   3. 세 동결 명령이 아직 사슬(`v3:all`)에 남아 있다
 *
 * 둘째가 이 파일을 두는 가장 큰 까닭이다. 쪽을 새 자리로 옮기면 파일
 * 이름이 바뀌고, 그러면 세 동결은 **그 파일을 모르는 채로 통과한다.**
 * 얼린 화면이 조용히 동결 밖으로 나가는 자리가 거기다.
 *
 * 이 묶음을 올린 뒤의 layout 대변경은 별도 STOP GATE 다: 고칠 때는 그
 * 화면의 판본을 올리고 세 동결을 다시 적은 다음 이 기록을 다시 적는다.
 *
 *   npm run v3:freeze:core
 *   CORE_UI_FREEZE=write npm run v3:freeze:core   묶음 기록을 다시 적는다
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const LABEL = "CAREERMATRI_CORE_UI_FREEZE_1";
const DIR = "sites/pca-platform/assessment/ME_V3";
const LOCK = `${DIR}/core-ui-lock.json`;

/** 묶는 세 동결. **파일 목록을 여기 다시 적지 않는다**: 적으면 어느 날 갈린다 */
const MEMBERS = [
  { key: "assessment", lock: `${DIR}/ui-lock.json`, cmd: "v3:freeze" },
  { key: "result", lock: `${DIR}/result-lock.json`, cmd: "v3:result:freeze" },
  { key: "workspace", lock: `${DIR}/workspace-lock.json`, cmd: "v3:workspace" },
] as const;

/**
 * 얼린 Core 화면 여덟과 그 쪽을 그리는 파일.
 *
 * **쪽 하나에 파일 하나만 적는다.** 그 쪽이 끌어다 쓰는 조각까지 적으면
 * 이 목록이 세 동결의 파일 목록을 베끼게 되고, 베낀 목록은 뒤처진다.
 * 여기가 묻는 것은 **그 쪽이 아직 동결 안에 있는가** 하나다.
 */
const SCREENS: [string, string][] = [
  ["Home", "src/app/me/page.tsx"],
  ["Assessment", "src/app/v3/[attemptId]/page.tsx"],
  ["Experience", "src/app/me/experience/new/page.tsx"],
  ["Current State", "src/app/me/state/page.tsx"],
  ["Next Action", "src/app/me/next/page.tsx"],
  /* Result Summary 와 Result Detail 은 한 쪽이다. 요약이 접힌 기본 상태이고
     상세는 그 안에서 펼치는 자리라, 둘을 가르는 것은 파일이 아니라 상태다 */
  ["Result Summary", "src/app/v3/[attemptId]/result/page.tsx"],
  ["Result Detail", "src/app/v3/[attemptId]/result/page.tsx"],
  ["Explore", "src/app/me/explore/page.tsx"],
];

let pass = 0, fail = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? ` — ${d}` : ""}`); }
}

const sha = (p: string): string =>
  createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);

type Lock = { versions: Record<string, string>; files: Record<string, string> };

const now: {
  label: string; locks: Record<string, string>;
  versions: Record<string, string>; screens: Record<string, string>;
} = { label: LABEL, locks: {}, versions: {}, screens: {} };

const missing: string[] = [];
for (const m of MEMBERS) {
  if (!existsSync(m.lock)) { missing.push(m.lock); continue; }
  now.locks[m.key] = sha(m.lock);
  const j = JSON.parse(readFileSync(m.lock, "utf8")) as Lock;
  for (const [k, v] of Object.entries(j.versions)) {
    /* 판본 이름이 셋에 걸쳐 겹치지 않아 그대로 한 자리에 모은다 */
    if (/_ui_version$|_copy_version$/.test(k)) now.versions[k] = v;
  }
}

/* ── 2. Core 화면 여덟이 동결 안에 있는가 ──────────────────────────── */
const covered = new Map<string, string>();
for (const m of MEMBERS) {
  if (!existsSync(m.lock)) continue;
  const j = JSON.parse(readFileSync(m.lock, "utf8")) as Lock;
  for (const f of Object.keys(j.files)) if (!covered.has(f)) covered.set(f, m.key);
}
const outside: string[] = [];
for (const [name, file] of SCREENS) {
  if (!existsSync(file)) { outside.push(`${name} — 파일이 없다 ${file}`); continue; }
  const inLock = covered.get(file);
  if (!inLock) outside.push(`${name} — 동결 밖 ${file}`);
  else now.screens[name] = `${inLock}:${sha(file)}`;
}

/* ── 3. 세 동결 명령이 사슬에 남아 있는가 ──────────────────────────── */
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as
  { scripts: Record<string, string> };
const chain = pkg.scripts["v3:all"] ?? "";
const dropped = MEMBERS.filter((m) => !chain.includes(`npm run ${m.cmd}`))
  .map((m) => m.cmd);

/* ── 기록을 적거나 견준다 ──────────────────────────────────────────── */
if (process.env.CORE_UI_FREEZE === "write") {
  writeFileSync(LOCK, `${JSON.stringify({
    schema_version: "careermatri-core-ui-lock.1",
    note: "Core 화면 여덟의 묶음 동결. 측정 동결과 별개다. layout 대변경은 별도 STOP GATE 이고, 고쳤으면 그 화면의 판본을 올리고 세 동결을 다시 적은 다음 `CORE_UI_FREEZE=write npm run v3:freeze:core`",
    ...now,
  }, null, 1)}\n`);
  console.log(`  적었다  ${LOCK} — 화면 ${Object.keys(now.screens).length}벌 · 동결 ${Object.keys(now.locks).length}벌`);
  for (const [k, v] of Object.entries(now.versions)) console.log(`  판본    ${k} = ${v}`);
  process.exit(0);
}

ok("세 동결 기록이 전부 있다", missing.length === 0, missing.join(" · ") || "3벌");
ok("Core 화면 여덟이 동결 안에 있다", outside.length === 0,
  outside.join(" · ") || `${SCREENS.length}자리`);
ok("세 동결 명령이 사슬에 남아 있다", dropped.length === 0,
  dropped.join(" · ") || MEMBERS.map((m) => m.cmd).join(" · "));

if (!existsSync(LOCK)) {
  console.log(`\n  ${LABEL} 기록이 없다. 처음이라면 \`CORE_UI_FREEZE=write npm run v3:freeze:core\`.`);
  process.exit(1);
}
const was = JSON.parse(readFileSync(LOCK, "utf8")) as typeof now;
const diffLock = Object.entries(now.locks)
  .filter(([k, v]) => was.locks?.[k] !== v).map(([k]) => k);
const diffVer = Object.entries(now.versions)
  .filter(([k, v]) => was.versions?.[k] !== v)
  .map(([k, v]) => `${k} ${was.versions?.[k] ?? "없음"} → ${v}`);
const diffScr = Object.entries(now.screens)
  .filter(([k, v]) => was.screens?.[k] !== v).map(([k]) => k);

ok("세 동결 기록이 묶음 기록과 같다", diffLock.length === 0,
  diffLock.join(" · ") || `${Object.keys(now.locks).length}벌`);
ok("판본 여섯이 묶음 기록과 같다", diffVer.length === 0,
  diffVer.join(" · ") || Object.values(now.versions).join(" · "));
ok("Core 화면 여덟의 지문이 묶음 기록과 같다", diffScr.length === 0,
  diffScr.join(" · ") || `${Object.keys(now.screens).length}자리`);

console.log(`\n  확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
if (fail) {
  console.log(`\n  일부러 고쳤다면 그 화면의 판본을 올리고 세 동결을 다시 적은 뒤`
    + ` \`CORE_UI_FREEZE=write npm run v3:freeze:core\`.`);
  process.exit(1);
}
console.log(`\n  ${LABEL} — Core 화면 여덟이 묶음 기록과 같다.`);
console.log("  측정 동결과 별개다. 파일이 바뀌었는지는 세 동결이 센다.");
