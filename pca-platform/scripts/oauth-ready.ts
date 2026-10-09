/**
 * **Google · Apple 로그인이 켤 준비가 됐는가 — 코드 쪽에서.**
 *
 * 이 명령이 **하지 않는 것**을 먼저 적는다. 구글과 애플에 한 번도 붙지
 * 않는다. 붙으려면 자격증명이 있어야 하고, 있어도 사람이 브라우저에서
 * 동의를 눌러야 한다. 그래서 여기서 나오는 어떤 줄도
 * **"실제 로그인이 됐다" 는 뜻이 아니다.**
 *
 * 묻는 것은 셋이다.
 *
 *   ① 코드가 준비돼 있는가      값이 꽂히면 그대로 서는가
 *   ② 이 배포본에 값이 있는가   없으면 **UNKNOWN 이 아니라 안 꽂힘**이다
 *   ③ 사람이 할 일이 무엇인가   공급자 콘솔에 등록할 주소까지
 *
 * **`UNKNOWN` 과 `BLOCKED` 를 섞지 않는다**(`ops:check` 와 같은 규칙).
 * 개발 PC 에서 돌리면 값이 비어 있는데, 그것은 운영이 비어 있다는 뜻이
 * 아니고 **내가 그 값을 안 들고 있다는 뜻**이다. 섞으면 둘 다 쓸모가
 * 없어진다.
 *
 *   npm run oauth:ready
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { appDomain } from "../src/lib/app-domain";
import { enabledProviders, oauthProviders } from "../src/lib/auth-oauth";

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
}

const read = (f: string): string => {
  try { return readFileSync(f, "utf8"); } catch { return ""; }
};

/** 배포본 안에서 돌고 있는가. 밖이면 값이 없는 것이 당연하다 */
function inDeployment(): boolean {
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME
    || process.env.PLATFORM_URL || process.env.APP_ENV);
}

/** 공급자마다 꽂혀야 하는 이름. **값은 적지 않는다** */
const NEEDS: Record<"google" | "apple", string[]> = {
  google: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
  apple: ["AUTH_APPLE_ID", "AUTH_APPLE_SECRET"],
};

const CONSOLE_STEP: Record<"google" | "apple", string> = {
  google: "Google Cloud Console → API 및 서비스 → 사용자 인증 정보"
    + " → OAuth 2.0 클라이언트 ID → 승인된 리디렉션 URI 에 아래 주소를 등록",
  apple: "Apple Developer → Identifiers → Services ID → Configure"
    + " → Return URLs 에 아래 주소를 등록 (App ID 가 아니라 Services ID 다)",
};

function main(): void {
  console.log("\nGoogle · Apple 로그인이 켤 준비가 됐는가 — 코드 쪽에서\n");
  console.log("  이 명령은 구글·애플에 붙지 않습니다. 실제 로그인 확인이 아닙니다.\n");

  const oauth = read("src/lib/auth-oauth.ts");
  const auth = read("src/lib/auth.ts");
  const example = read(".env.example");

  /* ── ① 코드 쪽 ─────────────────────────────────────────────── */

  /** 요구 범위. **로그인에 필요한 것만** */
  const WIDE = /drive|calendar|contacts|gmail|photos|youtube|spreadsheets|cloud-platform/i;
  ok("요구 범위가 로그인에 필요한 것뿐이다",
    /scope:\s*"openid email profile"/.test(oauth) && !WIDE.test(oauth));

  ok("꽂히지 않은 공급자는 NextAuth 에 등록도 하지 않는다",
    /const on = enabledProviders\(\)/.test(oauth)
    && /if \(on\.includes\("google"\)\)/.test(oauth)
    && /if \(on\.includes\("apple"\)\)/.test(oauth));

  /* 값을 빼고 실제로 불러 본다. 글자로만 재지 않는다 */
  const keep = { ...process.env };
  for (const k of [...NEEDS.google, ...NEEDS.apple]) delete process.env[k];
  const none = enabledProviders().length === 0 && oauthProviders().length === 0;
  /* 한 짝만 꽂아 본다 — **하나라도 비면 켜지지 않아야 한다** */
  process.env.AUTH_GOOGLE_ID = "x";
  const half = enabledProviders().length === 0;
  /* **되돌릴 때 지우는 것부터 한다.** `Object.assign` 은 덮어쓰기만
     하므로, 없던 이름을 넣어 본 뒤 그대로 두면 아래 상태 표가 **꽂혀
     있다고 적는다.** 한 번 그렇게 적혔다 */
  for (const k of [...NEEDS.google, ...NEEDS.apple]) delete process.env[k];
  for (const k of [...NEEDS.google, ...NEEDS.apple]) {
    if (keep[k] !== undefined) process.env[k] = keep[k];
  }
  ok("값이 없으면 공급자가 하나도 서지 않는다", none);
  ok("값이 반만 꽂히면 켜지지 않는다 (`invalid_client` 를 손님이 받지 않는다)", half);

  ok("비밀번호 로그인이 공급자와 무관하게 남는다",
    /\.\.\.oauthProviders\(\),\s*\n\s*Credentials\(/.test(auth));

  ok("신원을 찾는 열쇠가 `sub` 이다 (이메일로 찾지 않는다)",
    /provider_account_id = \$2/.test(read("src/lib/auth-accounts.ts")));

  ok("환경변수 이름 넷이 `.env.example` 에 적혀 있다",
    [...NEEDS.google, ...NEEDS.apple].every((k) => new RegExp(`^${k}=`, "m").test(example)),
    [...NEEDS.google, ...NEEDS.apple].filter((k) => !new RegExp(`^${k}=`, "m").test(example))
      .join(" "));

  ok("`.env.example` 에 값이 들어 있지 않다",
    [...NEEDS.google, ...NEEDS.apple]
      .every((k) => new RegExp(`^${k}=\\s*$`, "m").test(example)));

  /* 운영 문서가 서 있는가. **애플은 열쇠가 만료된다** */
  const ops = read("docs/metri/77_oauth_ops.md");
  ok("애플 secret 갱신 절차가 적혀 있다 (만료가 있는 열쇠다)",
    /6개월|180일/.test(ops) && /AUTH_APPLE_SECRET/.test(ops) && ops.length > 1500);
  ok("운영 문서에 실제 열쇠가 적혀 있지 않다",
    !/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(ops)
    && !/^AUTH_(GOOGLE|APPLE)_(ID|SECRET)=\S/m.test(ops));

  /* ── ③ 저장소에 열쇠가 들어오지 않는가 ───────────────────────── */
  const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n").filter(Boolean);
  const leak = tracked.filter((f) => /\.p8$/.test(f));
  ok("애플 `.p8` 개인키가 저장소에 없다", leak.length === 0, leak.join(" / "));

  /* ── ② 이 배포본 ───────────────────────────────────────────── */
  const on = enabledProviders();
  const dep = inDeployment();
  console.log("\n  이 배포본의 상태\n");
  const d = appDomain();
  for (const p of ["google", "apple"] as const) {
    const miss = NEEDS[p].filter((k) => !(process.env[k] ?? "").trim());
    const state = miss.length === 0 ? "READY"
      : dep ? "BLOCKED" : "UNKNOWN";
    const say = miss.length === 0
      ? "값이 꽂혀 있습니다. **공급자 콘솔 등록은 사람이 확인합니다**"
      : dep ? `이 배포본에 ${miss.join(" · ")} 가 없습니다`
        : `이 기계에서는 값을 들고 있지 않습니다 (${miss.join(" · ")})`;
    console.log(`  ${state.padEnd(8)} ${p.padEnd(7)} ${say}`);
    if (miss.length) {
      console.log(`           ${CONSOLE_STEP[p]}`);
      console.log(`           ${d.ok ? `${d.url}/api/auth/callback/${p}`
        : `<앱 주소>/api/auth/callback/${p}  (PLATFORM_URL 이 비어 있습니다)`}`);
    }
  }
  if (!dep) {
    console.log("\n  **배포본 밖입니다.** 위의 UNKNOWN 은 '운영에 값이 없다' 가 아니라"
      + "\n  '이 기계가 그 값을 안 들고 있다' 는 뜻입니다. 답을 바꾸는 길은"
      + "\n  Railway → 서비스 → Variables 를 꽂고 그 컨테이너에서 다시 돌리는 것입니다.");
  }

  console.log(`\n  켜진 공급자 ${on.length} — ${on.length ? on.join(" · ") : "없음"}`
    + ` · 코드 쪽 확인 ${pass + bad.length}가지`);
}

main();
console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
