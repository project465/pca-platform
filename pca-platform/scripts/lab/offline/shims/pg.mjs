// Verification-harness-only stand-in for the `pg` package.
// Speaks the PostgreSQL v3 wire protocol over a local TCP socket with
// trust auth. It exists because the npm registry is unreachable in this
// session; it is NOT shipped and never touches a remote database.
import net from "node:net";
import { EventEmitter } from "node:events";

const PARSERS = {};
const int = (s) => parseInt(s, 10);
const flt = (s) => parseFloat(s);
const bool = (s) => s === "t" || s === "true";
const json = (s) => JSON.parse(s);
function tsParse(s) {
  if (s === "infinity" || s === "-infinity") return s;
  // timestamptz has an offset; timestamp without tz is local time
  let iso = s.replace(" ", "T");
  if (/[+-]\d\d$/.test(iso)) iso += ":00";
  return new Date(iso);
}
function dateParse(s) {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s);
  if (!m) return s;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
function arrParse(item) {
  return (s) => parseArray(s).map((v) => deep(v, item));
}
function deep(v, item) {
  if (v === null) return null;
  if (Array.isArray(v)) return v.map((x) => deep(x, item));
  return item(v);
}
function parseArray(s) {
  let i = 0;
  function parse() {
    const out = [];
    if (s[i] !== "{") throw new Error("bad array " + s);
    i++;
    if (s[i] === "}") { i++; return out; }
    for (;;) {
      if (s[i] === "{") out.push(parse());
      else if (s[i] === '"') {
        i++;
        let v = "";
        while (s[i] !== '"') {
          if (s[i] === "\\") i++;
          v += s[i++];
        }
        i++;
        out.push(v);
      } else {
        let v = "";
        while (s[i] !== "," && s[i] !== "}") v += s[i++];
        out.push(v === "NULL" ? null : v);
      }
      if (s[i] === ",") { i++; continue; }
      if (s[i] === "}") { i++; return out; }
      throw new Error("bad array " + s);
    }
  }
  return parse();
}
const id = (s) => s;
Object.assign(PARSERS, {
  16: bool, 21: int, 23: int, 26: int, 700: flt, 701: flt,
  114: json, 3802: json, 1082: dateParse, 1114: tsParse, 1184: tsParse,
  1000: arrParse(bool), 1005: arrParse(int), 1007: arrParse(int), 1016: arrParse(id),
  1009: arrParse(id), 1015: arrParse(id), 1014: arrParse(id), 2951: arrParse(id),
  1021: arrParse(flt), 1022: arrParse(flt), 1231: arrParse(id),
  199: arrParse(json), 3807: arrParse(json), 1182: arrParse(dateParse),
  1115: arrParse(tsParse), 1185: arrParse(tsParse),
});

function pad(n, w = 2) { return String(n).padStart(w, "0"); }
function dateToPg(d) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const a = Math.abs(off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}
function arrToPg(a) {
  return "{" + a.map((v) => {
    if (v === null || v === undefined) return "NULL";
    if (Array.isArray(v)) return arrToPg(v);
    if (v instanceof Date) v = dateToPg(v);
    else if (typeof v === "object") v = JSON.stringify(v);
    return '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }).join(",") + "}";
}
function prepare(v) {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Date) return dateToPg(v);
  if (Array.isArray(v)) return arrToPg(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function cstr(s) { return Buffer.concat([Buffer.from(s, "utf8"), Buffer.from([0])]); }
function msg(type, body) {
  const head = Buffer.alloc(5);
  head.write(type, 0, "ascii");
  head.writeInt32BE(body.length + 4, 1);
  return Buffer.concat([head, body]);
}
function i16(n) { const b = Buffer.alloc(2); b.writeInt16BE(n); return b; }
function i32(n) { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; }

export class Client extends EventEmitter {
  constructor(cfg = {}) {
    super();
    const url = new URL(cfg.connectionString ?? process.env.DATABASE_URL);
    this.host = url.hostname || "127.0.0.1";
    this.port = +(url.port || 5432);
    this.user = decodeURIComponent(url.username || "postgres");
    this.database = url.pathname.replace(/^\//, "") || this.user;
    this.buf = Buffer.alloc(0);
    this.chain = Promise.resolve();
    this.waiter = null;
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.sock = net.connect(this.port, this.host);
      this.sock.on("error", (e) => { if (this.waiter) this.waiter.fail(e); else this.emit("error", e); });
      this.sock.on("data", (d) => { this.buf = Buffer.concat([this.buf, d]); this.pump(); });
      this.sock.on("connect", () => {
        const body = Buffer.concat([i32(196608), cstr("user"), cstr(this.user), cstr("database"), cstr(this.database), Buffer.from([0])]);
        this.sock.write(Buffer.concat([i32(body.length + 4), body]));
      });
      this.waiter = { msgs: [], done: () => resolve(this), fail: reject, startup: true };
    });
  }
  pump() {
    while (this.buf.length >= 5) {
      const len = this.buf.readInt32BE(1);
      if (this.buf.length < len + 1) return;
      const type = String.fromCharCode(this.buf[0]);
      const body = this.buf.subarray(5, len + 1);
      this.buf = this.buf.subarray(len + 1);
      this.onMsg(type, body);
    }
  }
  onMsg(type, body) {
    const w = this.waiter;
    if (type === "R") {
      const code = body.readInt32BE(0);
      if (code !== 0) w?.fail(new Error("auth method " + code + " unsupported by harness shim (use trust)"));
      return;
    }
    if (type === "S" || type === "K" || type === "N") return;
    if (type === "E") {
      const err = parseError(body);
      if (w) w.error = err;
      return;
    }
    if (type === "Z") {
      this.waiter = null;
      if (!w) return;
      if (w.error) w.fail(w.error); else w.done();
      return;
    }
    if (w) w.msgs.push([type, body]);
  }
  query(text, values) {
    if (typeof text === "object" && text) { values = text.values; text = text.text; }
    const run = () => new Promise((resolve, reject) => {
      const res = { rows: [], fields: [], rowCount: null, command: null };
      const results = [];
      this.waiter = {
        msgs: [],
        fail: reject,
        done: () => {
          let cur = null;
          for (const [type, body] of this.waiter2.msgs) {
            if (type === "T") { cur = { rows: [], fields: parseFields(body), rowCount: null, command: null }; }
            else if (type === "D") { if (!cur) cur = { rows: [], fields: [], rowCount: null, command: null }; cur.rows.push(parseRow(body, cur.fields)); }
            else if (type === "C") {
              if (!cur) cur = { rows: [], fields: [], rowCount: null, command: null };
              const tag = body.subarray(0, body.length - 1).toString("utf8");
              cur.command = tag.split(" ")[0];
              const n = parseInt(tag.split(" ").pop(), 10);
              cur.rowCount = Number.isFinite(n) ? n : null;
              results.push(cur); cur = null;
            }
          }
          const last = results[results.length - 1] ?? res;
          resolve(last);
        },
      };
      this.waiter2 = this.waiter;
      if (!values || values.length === 0) {
        this.sock.write(msg("Q", cstr(text)));
      } else {
        const params = values.map(prepare);
        const parts = [cstr(""), cstr(""), i16(0), i16(params.length)];
        for (const p of params) {
          if (p === null) parts.push(i32(-1));
          else { const b = Buffer.isBuffer(p) ? p : Buffer.from(p, "utf8"); parts.push(i32(b.length), b); }
        }
        parts.push(i16(1), i16(0));
        this.sock.write(Buffer.concat([
          msg("P", Buffer.concat([cstr(""), cstr(text), i16(0)])),
          msg("B", Buffer.concat(parts)),
          msg("D", Buffer.concat([Buffer.from("P"), cstr("")])),
          msg("E", Buffer.concat([cstr(""), i32(0)])),
          msg("S", Buffer.alloc(0)),
        ]));
      }
    });
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }
  end() { try { this.sock?.write(msg("X", Buffer.alloc(0))); this.sock?.end(); } catch {} return Promise.resolve(); }
}

function parseError(body) {
  const f = {};
  let i = 0;
  while (i < body.length && body[i] !== 0) {
    const k = String.fromCharCode(body[i]); i++;
    const e = body.indexOf(0, i);
    f[k] = body.subarray(i, e).toString("utf8"); i = e + 1;
  }
  const err = new Error(f.M);
  Object.assign(err, { severity: f.S, code: f.C, detail: f.D, hint: f.H, position: f.P, schema: f.s, table: f.t, column: f.c, constraint: f.n, where: f.W });
  return err;
}
function parseFields(body) {
  const n = body.readInt16BE(0);
  let i = 2;
  const out = [];
  for (let k = 0; k < n; k++) {
    const e = body.indexOf(0, i);
    const name = body.subarray(i, e).toString("utf8"); i = e + 1;
    const dataTypeID = body.readInt32BE(i + 6);
    i += 18;
    out.push({ name, dataTypeID });
  }
  return out;
}
function parseRow(body, fields) {
  const n = body.readInt16BE(0);
  let i = 2;
  const row = {};
  for (let k = 0; k < n; k++) {
    const len = body.readInt32BE(i); i += 4;
    const f = fields[k] ?? { name: "?" + k, dataTypeID: 25 };
    if (len === -1) { row[f.name] = null; continue; }
    const s = body.subarray(i, i + len).toString("utf8"); i += len;
    const p = PARSERS[f.dataTypeID];
    row[f.name] = p ? p(s) : s;
  }
  return row;
}

export class Pool extends EventEmitter {
  constructor(cfg = {}) { super(); this.cfg = cfg; this.idle = []; this.all = []; }
  async connect() {
    let c = this.idle.pop();
    if (!c) {
      c = new Client(this.cfg);
      await c.connect();
      c.on("error", (e) => this.emit("error", e, c));
      this.all.push(c);
    }
    c.release = () => { this.idle.push(c); };
    return c;
  }
  async query(text, values) {
    const c = await this.connect();
    try { return await c.query(text, values); } finally { c.release(); }
  }
  async end() { await Promise.all(this.all.map((c) => c.end())); this.all = []; this.idle = []; }
}
export const types = { setTypeParser(oid, fn) { PARSERS[oid] = typeof fn === "function" ? fn : arguments[2]; }, getTypeParser: (oid) => PARSERS[oid] ?? id };
export default { Pool, Client, types };
