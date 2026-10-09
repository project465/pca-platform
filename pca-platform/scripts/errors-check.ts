/**
 * **오류를 조용히 성공으로 바꾸지 않는가.**
 *
 * 이 검사가 생긴 까닭은 운영에서 한 번 당해서다. `catch {}` 한 줄이
 * PDF 가 안 뽑히는 진짜 까닭을 숨겼고, 밖에서는 브라우저가 안 뜬 것과
 * 결과 쪽이 500 인 것과 시간 초과가 **전부 같은 상태로 보였다.** 셋은
 * 고치는 사람이 다르다.
 *
 * **모든 catch 를 throw 로 바꾸는 검사가 아니다.** 그러면 메일 서버가
 * 느린 날 결제가 같이 멈춘다. 자리마다 판단이 다르고, 이 파일이 그
 * 판단을 **적어 두는 곳**이다.
 *
 *   SAFE           정말 무시해도 되는 선택적 실패 (보여 주는 값이 빈다)
 *   NEEDS_LOGGING  기능은 계속되지만 운영 로그가 있어야 한다
 *   MUST_FAIL      데이터 정합성·사용자 결과에 걸린다. 삼키면 안 된다
 *
 * 세는 것 넷.
 *
 *   ① 까닭 없이 비운 `catch {}` 가 없는가
 *   ② MUST_FAIL 자리에 삼키는 줄이 없는가
 *   ③ NEEDS_LOGGING 자리가 실제로 남기는가
 *   ④ 로그에 개인정보가 들어가지 않는가
 *
 *   npm run errors:check
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
}

const files = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
  .split("\n").filter((f) => /\.(ts|tsx)$/.test(f));

const read = (f: string): string => {
  try { return readFileSync(f, "utf8"); } catch { return ""; }
};

/**
 * 주석을 걷어 낸다. **까닭을 적어 둔 줄이 검사에 걸리면 안 된다.**
 *
 * **지우지 않고 공백으로 덮는다.** 지우면 글자 자리가 밀려서 줄 번호가
 * 틀어지고, 그러면 걸린 자리를 적어 줘도 그 줄에 아무것도 없다 — 처음에
 * 그렇게 짜서 엉뚱한 다섯 줄을 가리켰다. 줄바꿈은 그대로 둔다.
 */
function code(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + blank(m.slice(p1.length)));
}

/**
 * **SAFE 자리.** 삼키는 것이 **설계**인 자리를 여기 적고 까닭을 함께 적는다.
 *
 * 비워 두는 것이 맞는 자리가 있다. 브라우저 저장소는 꺼져 있을 수 있고,
 * 계측이 응시나 결제를 되돌리면 안 된다. 그런 자리를 **목록에 적어 두는**
 * 까닭은 다음 사람이 "이건 왜 비어 있지" 를 매번 다시 판단하지 않게 하는
 * 것이고, 적어 둔 까닭이 **지워지지 않았는지**를 ⑦ 이 센다.
 *
 * 세 묶음으로 갈린다.
 *
 *   저장소  localStorage 는 사생활 창·차단·용량에서 던진다. 못 적어도 서버가 진실이다
 *   계측    남기는 일이 재는 일을 되돌리면 안 된다
 *   정리    이미 닫힌 것을 또 닫는다
 */
const SAFE_BY_DESIGN: { at: string; why: string }[] = [
  {
    at: "src/app/assessment/[attemptId]/section-form.tsx",
    why: "저장소. 복구용 사본이라 못 적어도 서버가 진실이다",
  },
  {
    at: "src/app/v3/[attemptId]/result/save.tsx",
    why: "계측. 담아두기를 못 적었다고 화면을 되돌리지 않는다",
  },
  {
    at: "src/lib/funnel.ts",
    why: "계측. 퍼널이 응시나 결제를 되돌리면 안 된다",
  },
  {
    at: "src/lib/db.ts",
    why: "정리. 끊긴 풀을 닫는 것이고 이미 닫혔으면 할 일이 없다",
  },
  {
    at: "src/lib/me-v2/render.ts",
    why: "저장소. 머리 없는 브라우저 안에서 지우는 것이라 꺼져 있을 수 있다",
  },
];

/**
 * **MUST FAIL 자리.**
 *
 * 여기서 오류를 기본값으로 바꾸면 사람이 손해를 본다. 돈 · 신원 ·
 * 동의 · 채점 · 굳은 결과다. 삼키는 줄이 하나도 없어야 한다.
 */
const MUST_FAIL = [
  { path: "src/lib/me-v3/scoring/", why: "채점. 삼키면 틀린 판정이 굳는다" },
  { path: "src/lib/me-v3/result/build.ts", why: "결과 모델. 같은 까닭" },
  { path: "src/lib/me-v3/recompute.ts", why: "재분석. 지금 값이 조용히 어긋난다" },
  { path: "src/lib/entitlement.ts", why: "등급. 산 사람이 못 보거나 안 산 사람이 본다" },
  { path: "src/lib/payments/", why: "결제 확정. 돈이 걸린다" },
  { path: "src/lib/refund.ts", why: "환불 판정. 같은 까닭" },
  { path: "src/lib/auth.ts", why: "로그인 판정. 삼키면 남의 계정으로 들어간다" },
  { path: "src/lib/oauth-pending.ts", why: "봉투. 상한 봉투가 지나가면 안 된다" },
  { path: "src/lib/oauth-link-intent.ts", why: "연결 쪽지. 같은 까닭" },
];

/**
 * **MUST FAIL 자리에서 허락한 것.**
 *
 * 비워 두는 것이 맞는 자리는 여기 적고 **까닭을 함께 적는다.** 까닭 없이
 * 늘어나기 시작하면 이 목록이 곧 예외 목록이 된다.
 */
const MUST_FAIL_OK: { at: string; why: string }[] = [
  {
    at: "src/lib/oauth-pending.ts",
    why: "봉투가 상한 것과 시간이 지난 것을 화면에서 가르지 않는다."
      + " 가르면 공격하는 쪽에만 쓸모가 있다. 돌려주는 것은 `null` 이고"
      + " 부르는 쪽이 그것을 실패로 받는다",
  },
  {
    at: "src/lib/oauth-link-intent.ts",
    why: "같은 까닭. 고친 쪽지는 `null` 이고 연결이 일어나지 않는다",
  },
];

/**
 * **NEEDS LOGGING 자리.**
 *
 * 삼켜도 되지만 남겨야 한다. 파일마다 `oplog` 를 부르는 줄이 하나라도
 * 있어야 한다 — 줄 단위로 재면 거짓 경보가 쏟아지고, 그러면 아무도 안
 * 본다. 보는 것은 **그 파일이 남기는 습관이 있는가**다.
 */
const NEEDS_LOGGING = [
  { path: "src/lib/consent.ts", why: "동의를 못 적으면 분쟁에서 댈 것이 없다" },
  { path: "src/lib/pilot.ts", why: "파일럿은 한 번뿐이라 잃은 줄을 다시 못 받는다" },
  { path: "src/lib/orders.ts", why: "결제를 마친 사람이 다른 도메인으로 돌아온다" },
  { path: "src/app/signup/actions.ts", why: "되돌리기가 실패하면 동의 없는 계정이 남는다" },
  { path: "src/app/signup/social/actions.ts", why: "같은 까닭" },
  { path: "src/app/v3/[attemptId]/result/pdf/route.ts", why: "못 뽑은 까닭을 버리지 않는다" },
];

/** 로그에 넣으면 안 되는 것. **적는 사람이 실수해도 여기서 걸린다** */
const PII_IN_LOG = /\b(email|e_mail|mail_addr|display_name|user_name|password|passwd|token|secret|note_text|free_text|body_text)\b/;

function main(): void {
  console.log("\n오류를 조용히 성공으로 바꾸지 않는가\n");

  /**
   * ① **까닭 없이 비운 `catch {}`.**
   *
   * 글자가 하나도 없는 것만 센다. **까닭을 적어 둔 catch 는 비운 것이
   * 아니다**: `catch { /* 꺼져 있을 수 있다 *\/ }` 는 다음 사람에게
   * 판단을 넘겨 준 자리이고, 그것까지 세면 고치는 쪽이 **까닭을 지우고
   * `console.error` 를 적어** 통과시킨다. 그 거래는 손해다.
   *
   * 그래서 자리는 주석을 지운 쪽에서 찾고(주석 안의 `catch` 를 세지
   * 않으려고) **몸통은 원본에서 읽는다.** `code()` 가 길이를 지키며
   * 공백으로 덮으므로 두 글자 자리가 같다.
   */
  const empty: string[] = [];
  for (const f of files) {
    const src = read(f);
    const c = code(src);
    for (const m of c.matchAll(/catch\s*(\([^)]*\))?\s*\{([^{}]*)\}/g)) {
      const at = m.index ?? 0;
      const body = src.slice(at, at + m[0].length).replace(/^[^{]*\{/, "").replace(/\}$/, "");
      if (body.trim()) continue;   /* 까닭이 적혀 있다 */
      empty.push(`${f}:${c.slice(0, at).split("\n").length}`);
    }
  }
  ok("까닭 없이 비운 `catch {}` 가 없다", empty.length === 0, empty.slice(0, 5).join(" / "));

  /* ② MUST FAIL 자리에 삼키는 줄 */
  const swallowed: string[] = [];
  for (const z of MUST_FAIL) {
    for (const f of files.filter((x) => x.startsWith(z.path))) {
      const c = code(read(f));
      for (const m of c.matchAll(/\.catch\(\s*\(\s*\)?\s*[^)]*\)?\s*=>/g)) {
        if (MUST_FAIL_OK.some((a) => f.startsWith(a.at))) continue;
        swallowed.push(`${f}:${c.slice(0, m.index).split("\n").length} (${z.why})`);
      }
      /* `catch (e) { return 기본값 }` — 던지지도 로그도 없는 모양 */
      for (const m of c.matchAll(/catch\s*\([^)]*\)\s*\{([^{}]{0,160})\}/g)) {
        const body = m[1];
        if (MUST_FAIL_OK.some((a) => f.startsWith(a.at))) continue;
        if (/throw|opFail|console\.|return \{\s*ok:\s*false/.test(body)) continue;
        swallowed.push(`${f}:${c.slice(0, m.index).split("\n").length} 조용한 되돌림`);
      }
    }
  }
  ok(`MUST FAIL 자리에 삼키는 줄이 없다 — 자리 ${MUST_FAIL.length}곳`,
    swallowed.length === 0, swallowed.slice(0, 5).join(" / "));

  /* ③ NEEDS LOGGING 자리가 실제로 남기는가 */
  const quiet = NEEDS_LOGGING.filter((z) => {
    const f = files.find((x) => x === z.path) ?? z.path;
    const c = read(f);
    return !/opFail|swallow\(|console\.error/.test(c);
  }).map((z) => z.path);
  ok(`NEEDS LOGGING 자리가 전부 남긴다 — 자리 ${NEEDS_LOGGING.length}곳`,
    quiet.length === 0, quiet.join(" / "));

  /* ④ 로그에 개인정보 */
  const leaky: string[] = [];
  for (const f of files) {
    const c = code(read(f));
    for (const m of c.matchAll(/(opFail|swallow)\(\{([\s\S]{0,400}?)\}/g)) {
      if (PII_IN_LOG.test(m[2])) {
        leaky.push(`${f}:${c.slice(0, m.index).split("\n").length}`);
      }
    }
  }
  ok("로그에 개인정보를 적지 않는다", leaky.length === 0, leaky.slice(0, 5).join(" / "));

  /* ⑤ 기록 모양이 한 벌인가 */
  const mod = read("src/lib/oplog.ts");
  const fields = ["operation", "ref", "step", "category", "at="];
  const miss = fields.filter((x) => !mod.includes(x));
  ok(`오류 한 줄이 다섯을 적는다 — ${fields.join(" · ")}`,
    miss.length === 0, miss.join(" "));
  ok("`ref()` 가 이메일과 긴 글자를 통과시키지 않는다",
    /includes\("@"\)/.test(mod) && /자>/.test(mod));

  /* ⑥ 사용자 화면에 stack 을 내보내지 않는가 */
  const stacky: string[] = [];
  for (const f of files.filter((x) => x.startsWith("src/app/"))) {
    const c = code(read(f));
    if (/\{\s*(e|err|error)\s*\.stack\s*\}/.test(c)) stacky.push(f);
  }
  ok("사용자 화면에 stack 을 그리지 않는다", stacky.length === 0, stacky.join(" / "));

  /**
   * ⑦ **SAFE 로 적어 둔 자리의 까닭이 아직 거기 있는가.**
   *
   * 목록만 두면 다음 사람이 그 파일의 주석을 지우고, 그러면 비어 있는
   * 까닭을 아무도 모르는 상태로 돌아간다. 파일이 있고 그 안에 삼키는
   * 자리가 있고 **그 자리에 적어 둔 글이 있는지**까지 본다.
   */
  const mute: string[] = [];
  for (const z of SAFE_BY_DESIGN) {
    const src = read(z.at);
    if (!src) { mute.push(`${z.at} 없다`); continue; }
    const c = code(src);
    let found = false;
    for (const m of c.matchAll(/catch\s*(\([^)]*\))?\s*\{([^{}]*)\}/g)) {
      const at = m.index ?? 0;
      const body = src.slice(at, at + m[0].length).replace(/^[^{]*\{/, "").replace(/\}$/, "");
      if (body.trim()) { found = true; break; }
    }
    if (!found) mute.push(`${z.at} 까닭이 지워졌다`);
  }
  ok(`SAFE 로 적어 둔 자리에 까닭이 남아 있다 — 자리 ${SAFE_BY_DESIGN.length}곳`,
    mute.length === 0, mute.join(" / "));

  /* 세어서 적는다. **줄이는 것이 목표가 아니라 아는 것이 목표다** */
  let total = 0;
  for (const f of files) {
    total += [...code(read(f)).matchAll(/\.catch\(/g)].length;
  }
  console.log(`\n  삼키는 자리 ${total}곳 — MUST FAIL ${MUST_FAIL.length}구역 0건 ·`
    + ` NEEDS LOGGING ${NEEDS_LOGGING.length}자리 전부 기록 ·`
    + ` SAFE 로 적어 둔 자리 ${SAFE_BY_DESIGN.length}곳 · 나머지는 선택적 실패`);
}

main();
console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
