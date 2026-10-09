/**
 * **DB 를 올리는 차례가 한 벌인가.**
 *
 * 이 검사를 만든 까닭. 운영에서 `/me` 가
 * `relation "career_profiles" does not exist` 로 죽었다. 스키마 파일은
 * 저장소에 있었고 `npm run db:upgrade` 는 끝까지 돌았다. 까닭은 **올리는
 * 차례가 두 벌**이었다는 것이다.
 *
 *   scripts/db-upgrade.sh      개발 PC 에서 `npm run db:upgrade` 가 부르는 것
 *   deploy/ops/db-upgrade.sh   **운영 컨테이너에서** 같은 명령이 부르는 것
 *
 * 운영 이미지의 `package.json` 은 `deploy/ops/package.json` 이라
 * `npm run db:upgrade` 가 뒤엣것을 가리킨다. 앞엣것에 ME_V3 네 줄을 더한
 * 날 뒤엣것은 둘만 받았고(`runtime` · `pilot`), `arch`(`career_profiles`)
 * 와 `platform`(`v3_experiences` · `v3_actions` …)이 **운영에 선 적이
 * 없다.** `db:migration` 은 앞엣것을 돌리므로 그동안 푸른색이었다.
 *
 * 그래서 목록을 `deploy/db-chain.json` 하나로 옮기고, 여기서 셋을 센다.
 *
 *   1. 네 runner 가 그 목록만 읽는가 (손으로 적은 `-f db/...` 가 0건)
 *   2. `db/schema*.sql` 과 올리는 시드가 전부 목록에 있는가
 *   3. 안내문이 **그 컨테이너에 실제로 있는 스크립트**만 가리키는가
 *
 * DB 없이 돈다.
 *
 *   npm run db:chain
 */
import { readFileSync, readdirSync } from "node:fs";

/** 운영 이미지 안의 `db:verify`. 세는 표와 칸의 **유일한 목록**이다 */
const VERIFY = "deploy/ops/db-verify.sh";
/** DB 를 세우고 올리는 **유일한 목록** */
const CHAIN = "deploy/db-chain.json";

let fail = 0, pass = 0;
const ok = (n: string, good: boolean, d = ""): void => {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
};

type Chain = {
  base: string[]; upgrade: string[];
  not_in_chain: Record<string, string>;
};
const chain = JSON.parse(readFileSync(CHAIN, "utf8")) as Chain;
const all = [...chain.base, ...chain.upgrade];

/** 주석을 걷어 낸다. 왜 그렇게 두었는지는 주석에 적을 수 있어야 한다 */
const code = (p: string): string =>
  readFileSync(p, "utf8").replace(/^\s*#.*$/gm, " ");

const RUNNERS = [
  "scripts/db-init.sh", "scripts/db-upgrade.sh",
  "deploy/ops/db-init.sh", "deploy/ops/db-upgrade.sh",
];

/* ── 1. 네 runner 가 목록만 읽는다 ─────────────────────────────── */
{
  const bad: string[] = [];
  for (const r of RUNNERS) {
    const src = code(r);
    /* 손으로 적은 SQL 경로. `-f "$f"` 는 목록에서 온 것이라 괜찮다 */
    for (const m of src.matchAll(/-f\s+(db\/[^\s"']+)/g)) bad.push(`${r}: ${m[1]}`);
    /* 옛 방식. `npm run -s db:xxx` 로 SQL 을 올리면 운영 이미지에 그
       스크립트가 없어서 그 자리에서 멈춘다 */
    for (const m of src.matchAll(/npm run -s (db:[a-z0-9:_]+)/g)) bad.push(`${r}: ${m[1]}`);
    if (!src.includes(CHAIN)) bad.push(`${r}: 목록을 읽지 않는다`);
  }
  ok(`네 runner 가 ${CHAIN} 만 읽는다`, bad.length === 0,
     bad.length ? bad.join(" / ") : `파일 ${RUNNERS.length}벌`);
}

/* ── 2. 올려야 하는 SQL 이 전부 목록에 있다 ───────────────────── */
{
  const onDisk = [
    ...readdirSync("db").filter((f) => f.endsWith(".sql")).map((f) => `db/${f}`),
    ...readdirSync("db/seed").filter((f) => f.endsWith(".sql")).map((f) => `db/seed/${f}`),
  ];
  const known = new Set([...all, ...Object.keys(chain.not_in_chain)]);
  const orphan = onDisk.filter((f) => !known.has(f));
  ok("db 의 SQL 이 전부 목록에 있거나 까닭이 적혀 있다", orphan.length === 0,
     orphan.length ? orphan.join(" / ") : `${onDisk.length}벌`);

  const gone = all.filter((f) => {
    try { readFileSync(f); return false; } catch { return true; }
  });
  ok("목록의 파일이 전부 있다", gone.length === 0,
     gone.length ? gone.join(" / ") : `${all.length}벌`);

  /* 차례가 곧 조건이다. arch 가 platform 보다 먼저, 시드가 그 뒤 */
  const at = (f: string) => chain.upgrade.indexOf(f);
  const order = at("db/schema_v3_arch.sql") < at("db/schema_v3_platform.sql")
    && at("db/schema_v3_arch.sql") < at("db/seed/v3_regions.sql");
  ok("arch 가 platform 과 지역 시드보다 먼저다", order,
     `arch ${at("db/schema_v3_arch.sql")} · platform ${at("db/schema_v3_platform.sql")}`
     + ` · 시드 ${at("db/seed/v3_regions.sql")}`);
}

/* ── 3. 내 CareerMatri 표 다섯이 목록 안에서 만들어진다 ───────── */
{
  /** `db:verify` 가 세는 다섯. **여기 적어 두지 않고 그 파일에서 읽는다** */
  const verify = readFileSync(VERIFY, "utf8");
  const block = /내 CareerMatri 표 다섯[\s\S]*?table_name IN \(([^)]*)\)/.exec(verify);
  const want = block
    ? [...block[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]) : [];
  const sql = all.map((f) => readFileSync(f, "utf8")).join("\n");
  const missing = want.filter((t) =>
    !new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?${t}\\b`).test(sql));
  ok("db:verify 가 세는 다섯 표가 목록 안에서 만들어진다",
     want.length === 5 && missing.length === 0,
     want.length !== 5 ? `세는 표를 ${want.length}개로 읽었다`
       : missing.length ? `빠진 표 ${missing.join(" ")}` : want.join(" "));
}

/* ── 4. 안내문이 그 컨테이너에 있는 스크립트만 가리킨다 ───────── */
{
  const ops = JSON.parse(readFileSync("deploy/ops/package.json", "utf8")) as
    { scripts: Record<string, string> };
  const have = new Set(Object.keys(ops.scripts));
  const bad: string[] = [];
  /*
   * **찍히는 글만 본다.** `echo` 로 나가는 줄이 사람이 읽는 안내이고,
   * 주석은 왜 그 명령을 치웠는지 적어 두는 자리다. 주석까지 세면 맞는
   * 기록을 지우라고 요구하게 되고, 그러면 다음 사람이 같은 실수를
   * 되돌릴 때 막아 줄 설명이 남지 않는다(`launch:check` 에서 같은 선을
   * 그었다).
   */
  for (const f of [VERIFY, "deploy/ops/db-init.sh",
                   "deploy/ops/db-upgrade.sh"]) {
    const printed = readFileSync(f, "utf8").split("\n")
      .filter((l) => /^\s*echo\b/.test(l)).join("\n");
    for (const m of printed.matchAll(/npm run ([a-z0-9:_]+)/g)) {
      if (!have.has(m[1])) bad.push(`${f}: npm run ${m[1]}`);
    }
  }
  ok("컨테이너 안내문이 없는 스크립트를 가리키지 않는다", bad.length === 0,
     bad.length ? bad.join(" / ") : `스크립트 ${have.size}개`);
}

/* ── 5. `/me` 가 읽는 칸이 career_profiles 에 적혀 있다 ───────── */
{
  const sql = readFileSync("db/schema_v3_arch.sql", "utf8");
  /* **칸 목록을 여기 적지 않는다.** `db:verify` 가 운영에서 세는 것과
     여기서 세는 것이 두 벌이면, 한쪽에 칸을 더한 날 다른 쪽이 안 늘고,
     그 차이가 바로 이번 장애를 만든 모양이다. `db-verify.sh` 의
     `for C in ...` 한 줄이 유일한 목록이다 */
  const vf = readFileSync(VERIFY, "utf8");
  const blk = vf.match(/for C in ([\s\S]*?); do/);
  const want = blk ? blk[1].replace(/\\\n/g, " ").trim().split(/\s+/) : [];
  const missing = want.filter((c) => !new RegExp(`\\b${c}\\b`).test(sql));
  ok("career_profiles 에 /me 가 읽는 칸이 전부 적혀 있다",
     want.length >= 14 && missing.length === 0,
     missing.length ? `${missing.join(" ")} 가 schema_v3_arch.sql 에 없다`
       : want.length < 14 ? `db-verify.sh 에서 칸 목록을 못 읽었다 (${want.length}개)`
       : `칸 ${want.length}개 — db-verify.sh 에서 읽었다`);
}

/* ── 6. 그 목록이 운영 이미지 안에 들어간다 ──────────────────── */
{
  /* 목록을 한 자리로 모아 놓고 **이미지에 담지 않으면** 컨테이너의
     `npm run db:upgrade` 가 `목록이 없습니다` 로 첫 줄에서 멈춘다.
     `image:check` 와 `ops:check` 가 보는 목록은 `runtime-needs.json`
     하나이므로, 거기 적혀 있는지만 여기서 센다 */
  const needs = JSON.parse(readFileSync("deploy/runtime-needs.json", "utf8")) as
    { needs: [string, string][] };
  const listed = needs.needs.some(([p]) => p === CHAIN);
  ok("목록이 운영 이미지가 들고 있어야 하는 자리에 적혀 있다", listed,
     listed ? `runtime-needs.json 에 ${CHAIN}`
       : `runtime-needs.json 에 ${CHAIN} 이 없다 — 컨테이너에서 db:upgrade 가 멈춘다`);
}

console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
process.exitCode = fail ? 1 : 0;
