/**
 * 옛 DB 가 `db:upgrade` 한 번으로 최신 코드까지 오는가.
 *
 * **이 검사를 만든 까닭.** 운영에서 `column "undergrad_core" does not exist`
 * 가 났다. 스키마 파일에는 그 칸을 더하는 `ALTER` 가 있었고, 저장소 안의
 * 어느 검사도 **옛 DB 에서 올려 보지 않았다.** 개발 DB 는 칸이 생길 때마다
 * 손으로 올려 와서 늘 최신이고, 그래서 빠진 것이 보이지 않는다.
 *
 * 여기서 하는 일은 셋이다.
 *
 *   1. 옛 판본의 스키마 파일로 DB 를 하나 세운다(운영의 처지).
 *   2. 지금 `db:upgrade` 를 **두 번** 돌린다. 두 번째가 깨지면 idempotent 가
 *      아니다. 운영에서는 배포마다 돌아가므로 두 번째가 늘 있다.
 *   3. 빈 DB 에 지금 `db:init` 으로 세운 것과 **칸·제약·인덱스를 글자까지
 *      대조한다.** 다르면 올라온 DB 가 새로 세운 DB 와 다른 제품이다.
 *
 * 그리고 넷째로 **코드가 부르는 칸**을 센다. 스키마끼리 같아도, 코드가
 * 쓰는 칸이 어느 스키마에도 없으면 운영에서만 터진다.
 *
 *   DATABASE_URL=... npx tsx scripts/db-migration-check.ts [옛판본]
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const URL = process.env.DATABASE_URL;
if (!URL) { console.error("DATABASE_URL 을 정하십시오"); process.exit(1); }
const BASE = URL.slice(0, URL.lastIndexOf("/"));
/** 옛 운영의 처지를 흉내낼 판본. 기본값은 ME_V3_2 바로 앞이다 */
const OLD_REF = process.argv[2] ?? process.env.OLD_REF ?? "8d2cd87";

const TMP = mkdtempSync(join(tmpdir(), "cm-mig-"));
const sh = (cmd: string, args: string[], env?: Record<string, string>): string =>
  execFileSync(cmd, args, {
    encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024,
  });

function psql(db: string, sql: string): string {
  return sh("psql", [`${BASE}/${db}`, "-tA", "-v", "ON_ERROR_STOP=1", "-c", sql]);
}
function makeDb(name: string): void {
  sh("psql", [`${BASE}/postgres`, "-q", "-c", `DROP DATABASE IF EXISTS ${name}`]);
  sh("psql", [`${BASE}/postgres`, "-q", "-c", `CREATE DATABASE ${name}`]);
}
function dropDb(name: string): void {
  try { sh("psql", [`${BASE}/postgres`, "-q", "-c", `DROP DATABASE IF EXISTS ${name}`]); }
  catch { /* 남겨 두어도 다음 판에 다시 지운다 */ }
}

/**
 * 그 판본의 `db:init` 이 올리는 SQL 파일을 차례대로 뽑는다.
 *
 * **파일 목록을 여기 적어 두지 않는다.** 적어 두면 스키마가 하나 늘 때 이
 * 검사를 같이 고쳐야 하고, 어느 날 안 고치고 넘어간다. `package.json` 의
 * `psql ... -f <파일>` 과 `db-init.sh` 의 차례를 그대로 읽는다.
 */
function initFiles(ref: string | null): string[] {
  const at = (p: string) => ref
    ? sh("git", ["show", `${ref}:./${p}`]) : readFileSync(p, "utf8");
  const pkg = JSON.parse(at("package.json")) as { scripts: Record<string, string> };
  const fileOf = (name: string): string[] => {
    const s = pkg.scripts[name];
    if (!s) return [];
    return [...s.matchAll(/-f\s+(\S+)/g)].map((m) => m[1]);
  };
  const init = at("scripts/db-init.sh");
  const order = [...init.matchAll(/npm run -s ([a-z0-9:_]+)/g)].map((m) => m[1]);
  return order.flatMap(fileOf);
}

/** 그 판본의 파일을 임시 자리에 풀고 한 벌씩 붓는다 */
function apply(db: string, ref: string | null, files: string[], label: string): void {
  for (const f of files) {
    const body = ref ? sh("git", ["show", `${ref}:./${f}`]) : readFileSync(f, "utf8");
    const path = join(TMP, `${label}-${f.replace(/\//g, "_")}`);
    writeFileSync(path, body);
    sh("psql", [`${BASE}/${db}`, "-q", "-v", "ON_ERROR_STOP=1",
      "--single-transaction", "-f", path]);
  }
}

/**
 * 칸과 제약과 인덱스를 한 덩이 글자로 뜬다.
 *
 * `pg_dump` 를 쓰지 않는 까닭은 그쪽이 소유자와 차례와 주석까지 담아서,
 * 뜻이 같은 DB 가 다르게 보이기 때문이다. 여기서 재는 것은 **코드가 부딪히는
 * 모양**이다: 어떤 표에 어떤 칸이 어떤 꼴로 있고, 무엇이 막혀 있는가.
 */
function shape(db: string): { cols: string; cons: string; idx: string } {
  const cols = psql(db, `
    SELECT table_name||'.'||column_name||' '||data_type
           ||' null='||is_nullable||' def='||coalesce(column_default,'-')
      FROM information_schema.columns
     WHERE table_schema='public'
     ORDER BY 1`);
  const cons = psql(db, `
    SELECT c.conrelid::regclass::text||' '||c.contype::text||' '||c.conname
           ||' '||pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace
     WHERE n.nspname='public'
     ORDER BY 1`);
  const idx = psql(db, `
    SELECT tablename||' '||indexdef FROM pg_indexes
     WHERE schemaname='public' ORDER BY 1`);
  return { cols, cons, idx };
}

/**
 * 코드가 부르는 표와 칸.
 *
 * SQL 을 완전히 파싱하지 않는다. **거짓 경보를 내는 검사는 그 다음부터
 * 아무도 안 본다**(`mail:check` 의 링크 검사에서 한 번 겪었다). 그래서 둘을
 * 좁힌다.
 *
 * 먼저 **SQL 로 보이는 글자만** 꺼낸다. 처음에는 파일 전체에서 `표.칸` 을
 * 찾았는데 `attempts.find` 와 `contracts.map` 이 줄줄이 걸렸다. 자바스크립트의
 * 점과 SQL 의 점은 같은 글자고 뜻이 다르다. 백틱 안에서 SQL 낱말이 보이는
 * 덩이만 본다.
 *
 * 그 안에서 세는 모양은 셋이다: `INSERT INTO 표 (칸, 칸, ...)` 의 칸 목록과,
 * `표.칸` 처럼 표 이름을 앞에 붙여 적은 자리와, **표 하나만 나오는 SQL 의
 * `SET` 과 `WHERE` 에 적힌 이름**이다.
 *
 * 셋째를 뒤늦게 더했다. `career_events` 에 없는 `processed_at` 을 쓰는 줄이
 * 있었는데, 표 이름을 앞에 안 붙였다는 이유로 이 검사를 그대로 지나갔다.
 * 운영에서 500 이 나고서야 보였다. **표가 하나뿐인 SQL 에서는 앞에 붙이지
 * 않은 이름도 그 표의 칸이다.**
 */
function codeRefs(tables: Set<string>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (t: string, c: string) => {
    if (!tables.has(t)) return;
    if (!out.has(t)) out.set(t, new Set());
    out.get(t)!.add(c);
  };
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
      return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
    });
  const SQL = /\b(select|insert\s+into|update|delete\s+from)\b/i;
  for (const file of [...walk("src"), ...walk("scripts")]) {
    const body = readFileSync(file, "utf8");
    const chunks = [...body.matchAll(/`([^`]*)`/g)].map((m) => m[1]).filter((t) => SQL.test(t));
    for (const sql of chunks) {
      for (const m of sql.matchAll(/INSERT\s+INTO\s+([a-z0-9_]+)\s*\(([^)]*)\)/gi)) {
        const t = m[1].toLowerCase();
        for (const raw of m[2].split(",")) {
          const c = raw.trim().replace(/^"|"$/g, "").toLowerCase();
          if (/^[a-z0-9_]+$/.test(c)) add(t, c);
        }
      }
      for (const m of sql.matchAll(/\b([a-z][a-z0-9_]{3,})\.([a-z][a-z0-9_]*)\b/g)) {
        add(m[1].toLowerCase(), m[2].toLowerCase());
      }
      /* 표가 하나뿐인 SQL 에서는 앞에 안 붙인 이름도 그 표의 칸이다.
         **둘 이상 나오면 건너뛴다**: 어느 표의 칸인지 알 수 없고, 짐작해서
         세면 거짓 경보가 난다 */
      const named = [...new Set([...sql.matchAll(
        /\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-z][a-z0-9_]*)/gi)].map((x) => x[1].toLowerCase()))]
        .filter((t) => tables.has(t));
      if (named.length !== 1) continue;
      const only = named[0];
      /* **`IN` 과 `IS` 에 낱말 경계를 붙인다.** 안 붙이면 `i` 깃발 때문에
         `straightline_run` 한가운데의 `in` 이 연산자로 잡혀서, 칸 이름이
         `straightl` 로 잘린 채 `없는 칸` 으로 걸린다. 멀쩡한 칸 스물한
         개가 그렇게 걸렸다.

         **그런데 쉼표 앞에 낱말 경계를 두면 안 된다.** 앞엣것이 따옴표면
         (`SET state='done', done_at=now()`) 따옴표와 쉼표가 둘 다 낱말이
         아니라서 경계가 없고, 그 쉼표 뒤의 칸이 통째로 안 세어졌다.
         `v3_actions` 에 없는 칸을 쓰는 줄이 그렇게 이 검사를 지나갔다.
         낱말 경계는 **낱말인 쪽에만** 붙인다 */
      for (const m of sql.matchAll(
        /(?:\bWHERE\b|\bAND\b|\bOR\b|\bSET\b|,)\s*([a-z][a-z0-9_]{2,})\s*(?:=|<>|>=|<=|>|<|\bIS\b|\bIN\b)/gi)) {
        const c = m[1].toLowerCase();
        if (["and", "or", "not", "null", "true", "false", "select", "where", "set"].includes(c)) continue;
        add(only, c);
      }
    }
  }
  return out;
}

const OLD_DB = "cm_mig_old", NEW_DB = "cm_mig_new";
console.log(`  옛 판본 ${OLD_REF}\n`);

try {
  /* 1. 옛 판본으로 세운다. 운영이 서 있던 자리다 */
  makeDb(OLD_DB);
  const oldFiles = initFiles(OLD_REF);
  apply(OLD_DB, OLD_REF, oldFiles, "old");
  const beforeCols = shape(OLD_DB).cols.split("\n").filter(Boolean).length;

  /* 2. 지금 db:upgrade 를 두 번 돌린다 */
  let upOk = true, upErr = "";
  for (const n of [1, 2]) {
    try {
      sh("bash", ["scripts/db-upgrade.sh"], { DATABASE_URL: `${BASE}/${OLD_DB}` });
    } catch (e) {
      upOk = false;
      upErr = `${n}번째에서 멈췄다: ${String((e as Error).message).slice(-400)}`;
      break;
    }
  }
  ok("옛 DB 에서 db:upgrade 가 두 번 돈다", upOk, upOk ? "두 번 다 끝까지" : upErr);

  /* 3. 빈 DB 에 지금 db:init 으로 세운 것과 대조한다 */
  makeDb(NEW_DB);
  apply(NEW_DB, null, initFiles(null), "new");

  const a = shape(OLD_DB), b = shape(NEW_DB);
  const diff = (x: string, y: string) => {
    const sx = new Set(x.split("\n").filter(Boolean));
    const sy = new Set(y.split("\n").filter(Boolean));
    const only = (p: Set<string>, q: Set<string>) => [...p].filter((v) => !q.has(v));
    return { missing: only(sy, sx), extra: only(sx, sy) };
  };

  const dc = diff(a.cols, b.cols);
  ok("올린 DB 에 새로 세운 DB 의 칸이 전부 있다", dc.missing.length === 0,
     dc.missing.length ? `${dc.missing.length}개: ${dc.missing.slice(0, 4).join(" / ")}`
       : `칸 ${b.cols.split("\n").filter(Boolean).length}개 (옛 DB 는 ${beforeCols}개로 시작했다)`);
  /* **남는 칸은 걸지 않는다.** 옛 판본에만 있던 칸은 지우지 않는 것이 맞다:
     지우면 그 칸을 읽는 옛 줄이 사라진다. 적어만 둔다 */
  if (dc.extra.length) {
    console.log(`  적어둠  옛 판본에만 있는 칸 ${dc.extra.length}개 — ${dc.extra.slice(0, 3).join(" / ")}`);
  }

  const dk = diff(a.cons, b.cons);
  ok("막는 것(PK·FK·UNIQUE·CHECK)이 전부 있다", dk.missing.length === 0,
     dk.missing.length ? `${dk.missing.length}개: ${dk.missing.slice(0, 3).join(" / ")}`
       : `${b.cons.split("\n").filter(Boolean).length}개`);

  const di = diff(a.idx, b.idx);
  ok("인덱스가 전부 있다", di.missing.length === 0,
     di.missing.length ? `${di.missing.length}개: ${di.missing.slice(0, 3).join(" / ")}`
       : `${b.idx.split("\n").filter(Boolean).length}개`);

  /* 4. 코드가 부르는 칸이 전부 서 있는가 */
  const tables = new Set(psql(NEW_DB,
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)
    .split("\n").filter(Boolean));
  const have = new Set(psql(NEW_DB,
    `SELECT table_name||'.'||column_name FROM information_schema.columns
      WHERE table_schema='public'`).split("\n").filter(Boolean));
  const refs = codeRefs(tables);
  const ghost: string[] = [];
  for (const [t, cols] of refs) {
    for (const c of cols) if (!have.has(`${t}.${c}`)) ghost.push(`${t}.${c}`);
  }
  ok("코드가 부르는 칸이 전부 서 있다", ghost.length === 0,
     ghost.length ? `${ghost.length}개: ${ghost.sort().slice(0, 8).join(" ")}`
       : `표 ${refs.size}곳 · 칸 ${[...refs.values()].reduce((n, s) => n + s.size, 0)}개`);

  /* 5. 올린 DB 로 실제 응시가 서는가. 모양이 같아도 쓰다 터지는 자리가 있다 */
  let live = true, liveErr = "";
  try {
    sh("npx", ["tsx", "scripts/v3-runtime-check.ts"], { DATABASE_URL: `${BASE}/${OLD_DB}` });
  } catch (e) {
    live = false;
    liveErr = String((e as Error).message).slice(-300);
  }
  ok("올린 DB 에서 ME_V3 응시가 끝까지 돈다", live, live ? "v3:runtime" : liveErr);
} finally {
  dropDb(OLD_DB);
  dropDb(NEW_DB);
}

console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
process.exitCode = fail ? 1 : 0;
