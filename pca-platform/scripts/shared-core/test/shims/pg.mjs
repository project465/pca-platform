/**
 * 검사용 `pg` 대체. **제품에 들어가지 않는다**(로더가 `SC_SHIMS=1` 일 때만
 * 돌린다). 의존성을 설치할 수 없는 자리에서 **실제 제품 함수**를 일회용
 * PostgreSQL 에 대고 돌리려고 둔다.
 *
 * `psql` 을 질의마다 한 번 띄운다. 파라미터는 달러 인용 리터럴로 넣는다
 * (`$1` → `$p$값$p$`). `pg` 가 파라미터를 text 로 보내고 타입을 서버에
 * 맡기는 것과 같은 효과이고, NULL 도 그대로 넣을 수 있다.
 *
 * 결과는 서버 쪽 도움 함수 `sc_shim.run()` 이 JSON 으로 돌려준다
 * (`FOR r IN EXECUTE` 는 INSERT … RETURNING 과 `WITH … INSERT` 도 받는다).
 *
 * **다른 점을 적어 둔다**: ① BIGINT 가 문자열이 아니라 JSON 수로 온다
 * (제품 질의는 id 를 `::text` 로 꺼내므로 이 검사의 경로에서는 차이가 없다)
 * ② 시각이 Date 가 아니라 ISO 문자열로 온다 ③ `connect()`/트랜잭션을
 * 받지 않는다 — 부르면 던진다. 쓰는 경로가 그것을 부르면 그 사실이 드러난다.
 */
import { spawn } from "node:child_process";

const HELPER = `
CREATE SCHEMA IF NOT EXISTS sc_shim;
CREATE OR REPLACE FUNCTION sc_shim.run(q text, returns_rows boolean)
RETURNS json LANGUAGE plpgsql AS $f$
DECLARE r record; acc json[] := '{}'; n bigint := 0;
BEGIN
  IF returns_rows THEN
    FOR r IN EXECUTE q LOOP acc := acc || to_json(r); n := n + 1; END LOOP;
  ELSE
    EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  RETURN json_build_object('rows', coalesce(array_to_json(acc), '[]'::json), 'count', n);
END $f$;`;

function dollar(s) {
  let tag = "p";
  while (s.includes(`$${tag}$`)) tag += "x";
  return `$${tag}$${s}$${tag}$`;
}

function arrayLiteral(a) {
  return `{${a.map((x) => (x === null || x === undefined
    ? "NULL" : `"${String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)).join(",")}}`;
}

export function literal(v) {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Date) return dollar(v.toISOString());
  if (Array.isArray(v)) return dollar(arrayLiteral(v));
  if (typeof v === "object") return dollar(JSON.stringify(v));
  return dollar(String(v));
}

export function bind(text, params = []) {
  return text.replace(/\$(\d+)/g, (m, n) => {
    const i = Number(n) - 1;
    if (i < 0 || i >= params.length) throw new Error(`shim: 파라미터 ${m} 가 없습니다`);
    return literal(params[i]);
  });
}

function returnsRows(sql) {
  const s = sql.replace(/^\s*(--[^\n]*\n\s*)*/g, "").trim().toLowerCase();
  return /^(select|with|values|table|show)\b/.test(s) || /\breturning\b/.test(s);
}

function psql(url, script) {
  return new Promise((res, rej) => {
    const p = spawn("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", url],
      { stdio: ["pipe", "pipe", "pipe"] });
    let out = ""; let err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    p.on("error", rej);
    p.on("close", (code) => (code === 0 ? res(out) : rej(Object.assign(
      new Error(err.trim() || `psql exit ${code}`),
      { code: /ERROR:\s+([0-9A-Z]{5}):/.exec(err)?.[1] }))));
    p.stdin.end(script);
  });
}

const ready = new Map();

export class Pool {
  constructor(opts = {}) {
    this.url = opts.connectionString ?? process.env.DATABASE_URL;
    if (!this.url) throw new Error("shim: DATABASE_URL 이 없습니다");
  }

  on() { return this; }

  async query(text, params = []) {
    if (!ready.has(this.url)) ready.set(this.url, psql(this.url, HELPER));
    await ready.get(this.url);
    const sql = bind(String(text), params).replace(/;\s*$/, "");
    const script = "\\set VERBOSITY verbose\n"
      + `SELECT sc_shim.run(${dollar(sql)}, ${returnsRows(sql) ? "true" : "false"});\n`;
    const out = (await psql(this.url, script)).trim();
    const j = JSON.parse(out || '{"rows":[],"count":0}');
    return { rows: j.rows, rowCount: j.count };
  }

  /**
   * 기본은 던진다. `SC_SHIM_TX=autocommit` 일 때만 **원자성 없는** 클라이언트를
   * 준다(R38): BEGIN · COMMIT 은 아무것도 하지 않고 문장마다 따로 커밋된다.
   * ROLLBACK 은 되돌리지 못하므로 경고만 남긴다. 그래서 이 길로 센 결과는
   * **성공 경로의 효과**까지이고, 실패할 때 되돌아가는지는 NOT VERIFIED 다.
   */
  async connect() {
    if (process.env.SC_SHIM_TX !== "autocommit") {
      throw new Error("shim: connect()/트랜잭션은 이 대체 모듈이 받지 않습니다");
    }
    return {
      query: (text, params = []) => {
        const s = String(text).trim().toUpperCase();
        if (s === "BEGIN" || s === "COMMIT") return Promise.resolve({ rows: [], rowCount: 0 });
        if (s === "ROLLBACK") {
          console.warn("shim: ROLLBACK 을 되돌리지 못한다(autocommit) — 앞 문장은 이미 적혔다");
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return this.query(text, params);
      },
      release: () => {},
    };
  }

  async end() { /* 띄워 둔 연결이 없다 */ }
}

export default { Pool };
