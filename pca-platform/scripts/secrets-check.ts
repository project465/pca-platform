/**
 * **로그인 가능한 평문이 저장소에 없는가.**
 *
 * 전에는 여섯 값이 소스 열 벌과 README 와 QA 문서에 평문으로 적혀 있었다
 * (`pca-dev-admin-1234` · `TempPass2026` …). 운영 secret 은 아니지만 그
 * 값으로 **실제로 로그인이 된다**: 개발 DB 가 잠깐 열린 날 저장소를 읽은
 * 사람이 그대로 들어온다.
 *
 * 전수로 한 번 지우는 것으로는 돌아온다. 다음 사람이 급할 때 한 줄
 * 적어 넣고, 그 줄은 아무 검사도 걸리지 않는다. 그래서 센다.
 *
 * **세는 것을 좁게 잡는다.** 넓게 잡으면 주석과 설명문이 줄줄이 걸리고,
 * 거짓 경보를 내는 검사는 그 다음부터 아무도 안 본다. 보는 것은 셋이다.
 *
 *   ① 지웠던 값이 돌아왔는가      이름을 알고 있으니 글자로 찾는다
 *   ② 비밀번호 자리에 평문이 있는가  `pw: "..."` 같은 모양
 *   ③ 운영 열쇠가 적혔는가        PG · 메일 · OAuth · AUTH_SECRET
 *
 *   npm run secrets:check
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
}

/** 저장소가 들고 있는 파일만 본다. `node_modules` 와 빌드 산출물은 뺀다 */
function tracked(): string[] {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n").filter(Boolean)
    .filter((f) => !/\.(png|jpg|jpeg|gif|webp|pdf|ico|woff2?|ttf|otf|xlsx)$/i.test(f));
}

/**
 * ① 지웠던 값. **목록을 지우지 않는다**: 다음 사람이 옛 문서에서
 * 그대로 복사해 올 수 있고, 그때 걸려야 한다.
 */
const RETIRED = [
  "pca-dev-admin-1234", "pca-dev-org-1234", "TempPass2026",
  "ShotPass-2026!", "ProbePass-2026!", "Phase2-Shots-2026!", "erase-pass-1234",
];

/**
 * ② 비밀번호 자리에 글자가 박힌 모양.
 *
 * `password_hash` 와 bcrypt 해시와 `process.env` 는 뺀다. 해시는 평문이
 * 아니고, 환경변수를 읽는 줄은 **적어 두지 않는 쪽**이다.
 */
const INLINE = /\b(pw|pw2|pass|passwd|password|secret|token|apikey|api_key)\s*[:=]\s*["'`]([^"'`\n]{6,})["'`]/gi;
const INLINE_OK = /process\.env|password_hash|\$2[aby]\$|devPassword|randomBytes|<[^>]+>|\.\.\.|예:|예시|여기에|your-|xxx|\*{3,}/i;

/**
 * ③ 운영 열쇠의 모양.
 *
 * **값이 비어 있는 `.env.example` 은 지나간다.** 거기 적는 것은 이름뿐이다.
 * `\s*` 로 쓰면 줄바꿈까지 먹어서 **다음 줄의 이름**을 값으로 본다 —
 * 처음에 그렇게 짜서 멀쩡한 `.env.example` 넷이 걸렸다. 같은 줄에
 * 묶는다(`[^\S\n]`).
 */
const EQ = String.raw`[^\S\n]*=[^\S\n]*`;
const PROD_KEYS = [
  new RegExp(String.raw`AUTH_SECRET${EQ}\S+`, "m"),
  new RegExp(String.raw`PORTONE_API_SECRET${EQ}\S+`, "m"),
  new RegExp(String.raw`PORTONE_WEBHOOK_SECRET${EQ}\S+`, "m"),
  new RegExp(String.raw`AUTH_GOOGLE_SECRET${EQ}\S+`, "m"),
  new RegExp(String.raw`AUTH_APPLE_SECRET${EQ}\S+`, "m"),
  new RegExp(String.raw`MAIL_PASS(WORD)?${EQ}\S+`, "m"),
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

/** 값 자리에 들어간 자리표시. 실제 열쇠가 아니다 */
const PLACEHOLDER = /^(\.{2,}|\$\(|#|<|\{|"\{|your[-_]|xxx|\*{3,}|여기|비밀|\$\{)/i;

/** 이 파일 자신은 금지한 값을 예시로 적어 두므로 뺀다 */
const SELF = ["scripts/secrets-check.ts"];

/**
 * 코드에서 **주석을 걷어 낸다.**
 *
 * 이 저장소는 `왜 지웠는가` 를 주석으로 남기는 쪽을 택했고, 그 기록에는
 * 지운 값이 그대로 들어 있다. 그것까지 세면 **맞는 기록을 지우라고
 * 요구하게 되고**, 그러면 다음 사람이 같은 실수를 되돌릴 때 막아 줄
 * 설명이 남지 않는다. `launch:check` 가 옛 법인 표시를 셀 때 같은 판단을
 * 했다.
 *
 * **주석 밖은 그대로 센다.** 주석에 적힌 값으로는 로그인이 되지 않지만
 * 코드에 적힌 값으로는 된다. 가르는 선이 거기다.
 *
 * 문서(`.md`)는 걷어 내지 않는다: 거기는 전부가 사람이 읽는 글이라
 * 주석과 본문의 구별이 없고, **값을 적어 두면 읽은 사람이 그대로 쓴다.**
 *
 * 지우지 않고 공백으로 덮는다. 줄 번호가 밀리면 걸린 자리를 적어 줘도
 * 그 줄에 아무것도 없다.
 */
const CODE = /\.(ts|tsx|mjs|cjs|js|jsx)$/;
function body(f: string): string {
  let raw = "";
  try { raw = readFileSync(f, "utf8"); } catch { return ""; }
  if (!CODE.test(f)) return raw;
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + blank(m.slice(p1.length)));
}

function main(): void {
  console.log("\n로그인 가능한 평문이 저장소에 없는가\n");
  const files = tracked();

  /* ① */
  const back: string[] = [];
  for (const f of files) {
    if (SELF.includes(f)) continue;
    const text = body(f);
    for (const v of RETIRED) if (text.includes(v)) back.push(`${f} → ${v}`);
  }
  ok(`지웠던 개발용 비밀번호가 돌아오지 않았다 — 값 ${RETIRED.length}개`,
    back.length === 0, back.slice(0, 4).join(" / "));

  /* ② */
  const inline: string[] = [];
  for (const f of files) {
    if (SELF.includes(f)) continue;
    const text = body(f);
    for (const m of text.matchAll(INLINE)) {
      const line = text.slice(0, m.index ?? 0).split("\n").length;
      const whole = text.split("\n")[line - 1] ?? "";
      if (INLINE_OK.test(whole)) continue;
      inline.push(`${f}:${line}`);
    }
  }
  ok("비밀번호 자리에 글자가 박힌 곳이 없다",
    inline.length === 0, inline.slice(0, 5).join(" / "));

  /* ③ */
  const prod: string[] = [];
  for (const f of files) {
    if (SELF.includes(f)) continue;
    const text = body(f);
    for (const re of PROD_KEYS) {
      const m = re.exec(text);
      if (!m) continue;
      /* **자리표시와 명령은 열쇠가 아니다.** 문서가 적어 두는 것은
         `AUTH_SECRET=$(openssl rand ...)` 이나 `=...` 이나 주석이고,
         그것을 열쇠로 세면 멀쩡한 문서 셋이 걸린다 */
      const val = m[0].slice(m[0].indexOf("=") + 1).trim();
      if (!val || PLACEHOLDER.test(val)) continue;
      /* **그 줄 전체를 한 번 더 본다.** 값만 보면 `\$(openssl ...)` 처럼
         한 글자 앞에 이스케이프가 붙은 것과 주석과 `process.env` 에
         넣는 줄이 걸린다. 셋 다 적어 둔 열쇠가 아니다 */
      const line = text.split("\n")[text.slice(0, m.index).split("\n").length - 1] ?? "";
      if (INLINE_OK.test(line) || /openssl|\$\(|^\s*[*#/]|`/.test(line)) continue;
      prod.push(`${f} → ${m[0].split("=")[0]}`);
    }
  }
  ok("운영 열쇠가 적힌 파일이 없다", prod.length === 0, prod.slice(0, 4).join(" / "));

  /* ④ 열쇠를 담는 파일이 git 에 들어오지 않는가 */
  const ignored = readFileSync(".gitignore", "utf8");
  ok("`.dev-credentials.json` 이 gitignore 에 있다",
    ignored.includes(".dev-credentials.json"));
  ok("`.dev-credentials.json` 이 저장소에 들어 있지 않다",
    !files.includes(".dev-credentials.json"));

  /* ⑤ 개발용 열쇠를 한 자리에서만 만든다 */
  const users = files.filter((f) => f.startsWith("scripts/")
    && /\.(ts|mjs)$/.test(f) && /devPassword\(/.test(safeRead(f)));
  ok(`개발용 계정을 쓰는 스크립트가 한 자리에서 열쇠를 받는다 — ${users.length}벌`,
    users.length >= 9, `${users.length}벌`);

  /* ⑥ 운영에서는 그 함수가 멈춘다 */
  const mod = readFileSync("scripts/dev-credentials.mjs", "utf8");
  ok("운영에서는 개발용 열쇠를 내주지 않는다",
    /APP_ENV.*production/.test(mod) && /throw new Error/.test(mod));
}

function safeRead(f: string): string {
  try { return readFileSync(f, "utf8"); } catch { return ""; }
}

main();
console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
