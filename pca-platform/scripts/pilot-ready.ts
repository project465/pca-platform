/**
 * **파일럿이 받기로 한 것을 실제로 받는가.**
 *
 * `npm run v3:pilot` 은 **받을 자리가 서 있는가**를 센다(표의 칸 · 다섯 명
 * 규칙 · 준식별자 · 지우기). 이 검사가 묻는 것은 그다음이다: 한 사람이
 * 실제로 끝까지 풀었을 때 **그 줄에 무엇이 적히는가.**
 *
 * 묻는 것 셋.
 *
 *   ① 판본 열두 칸이 **값까지** 적히는가
 *   ② 세는 걸음에 적는 자리가 있는가 (빠짐 0 · 중복 0 · 이름 겹침 0)
 *   ③ 운영 화면이 그것을 보여 주는가
 *
 * **① 을 따로 두는 까닭.** `v3:owner` 가 이미 "칸이 열둘 있다" 를 세는데,
 * 그것은 `k in obj` 다. 칸이 있고 값이 `null` 이면 통과한다. 파일럿이
 * 끝난 뒤에 묻는 것은 칸의 수가 아니라 **그 사람이 어느 판본을 읽었는가**
 * 이고, 값이 비어 있으면 그 물음에 답할 수 없다. 끝난 뒤에는 되물을 수
 * 없다.
 *
 * **브라우저를 띄우지 않는다.** 실제 DB 로 함수를 부른다.
 *
 *   npm run pilot:ready
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* tsx 는 .env.local 을 자동으로 읽지 않는다 */
for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { query, queryOne } from "../src/lib/db";
import { content, openAttempt, saveAnswer, submit } from "../src/lib/me-v3/runtime/session";
import {
  ASSESSMENT_COPY_VERSION, ASSESSMENT_UI_VERSION,
} from "../src/lib/me-v3/runtime/ui-version";
import { ITEM_BANK_VERSION, SCORING_VERSION } from "../src/lib/me-v3/scoring/version";
import {
  RESULT_COPY_VERSION, RESULT_MODEL_VERSION, RESULT_UI_VERSION,
} from "../src/lib/me-v3/result/version";
import { WORKSPACE_UI_VERSION } from "../src/lib/me-v3/workspace-version";
import { FUNNEL, mark as pilotMark } from "../src/lib/me-v3/pilot/funnel";
import { WORKSPACE_EVENTS } from "../src/lib/me-v3/workspace-events";
import { FUNNEL_STEPS } from "../src/lib/funnel";

if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error("운영에서는 돌리지 않습니다.");
  process.exit(2);
}

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
}

const read = (f: string): string => {
  try { return readFileSync(f, "utf8"); } catch { return ""; }
};
const src = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
  .split("\n").filter((f) => /\.(ts|tsx)$/.test(f));

const LOGIN = "pilotready@example.com";

async function testUser(): Promise<string> {
  const found = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [LOGIN]);
  if (found) return found.id;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, is_demo)
     VALUES ($1,$1,'파일럿 기록 점검','x','active','ko',TRUE) RETURNING id::text`,
    [LOGIN]);
  return row?.id as string;
}

/**
 * 끝까지 푼 사람 하나를 만든다.
 *
 * **격자만 채우고 제출한다.** 여기서 묻는 것은 판정이 아니라 **적히는
 * 줄**이라, 답의 내용이 결과를 가르는지는 `v3:scoring` 이 본다.
 */
async function oneSubmission(userId: string): Promise<string> {
  await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [userId]);
  const a = await openAttempt({
    userId, tier: "BASIC", stage: "bachelor", gradField: null,
  });
  for (const d of content().domains.domains) {
    await saveAnswer(a.id, `G_${d.code}_INT`, { kind: "scale5", value: 3 });
    await saveAnswer(a.id, `G_${d.code}_EXP`, { kind: "exposure", value: 1 });
    await saveAnswer(a.id, `G_${d.code}_LEA`, { kind: "scale5", value: 3 });
  }
  const { id } = await submit(a);
  return id;
}

async function main(): Promise<void> {
  console.log("\n파일럿이 받기로 한 것을 실제로 받는가\n");

  /* ── ① 판본 열두 칸 ───────────────────────────────────────────── */
  const u = await testUser();
  const snapId = await oneSubmission(u);
  const row = await queryOne<{ j: string }>(
    `SELECT module_versions::text AS j FROM v3_snapshots WHERE id = $1`, [snapId]);
  const mv = JSON.parse(row?.j ?? "{}") as Record<string, unknown>;

  /**
   * 적혀야 하는 값. **코드의 상수와 글자까지 같아야 한다.**
   *
   * 상수만 올리고 적는 자리를 안 고치면, 올린 다음 응시가 **옛 판본으로
   * 적힌다.** 그러면 파일럿 분석이 두 묶음을 한 묶음으로 본다.
   */
  const WANT: Record<string, string | null> = {
    core_version: null,                /* 고른 core 라 값이 바뀐다 */
    item_bank_version: ITEM_BANK_VERSION,
    scoring_version: SCORING_VERSION,
    assessment_ui_version: ASSESSMENT_UI_VERSION,
    assessment_copy_version: ASSESSMENT_COPY_VERSION,
    result_model_version: RESULT_MODEL_VERSION,
    result_copy_version: RESULT_COPY_VERSION,
    result_ui_version: RESULT_UI_VERSION,
    workspace_ui_version: WORKSPACE_UI_VERSION,
  };
  /** 비어 있는 것이 **맞는** 칸. 까닭을 함께 적는다 */
  const MAY_BE_NULL: Record<string, string> = {
    industry_pack_version: "산업을 안 고른 응시다",
    role_pack_version: "역할을 안 고른 응시다",
    region_layer_version: "지역 층에 자료가 한 줄도 없다",
  };

  const miss = [...Object.keys(WANT), ...Object.keys(MAY_BE_NULL)]
    .filter((k) => !(k in mv));
  ok(`판본 칸 열둘이 적힌다 — 칸 ${Object.keys(WANT).length + Object.keys(MAY_BE_NULL).length}개`,
    miss.length === 0, miss.join(" "));

  const empty = Object.keys(WANT)
    .filter((k) => typeof mv[k] !== "string" || !(mv[k] as string).trim());
  ok("비어 있으면 안 되는 칸이 전부 차 있다", empty.length === 0,
    empty.map((k) => `${k}=${String(mv[k])}`).join(" "));

  const wrong = Object.entries(WANT)
    .filter(([k, v]) => v !== null && mv[k] !== v)
    .map(([k, v]) => `${k}: ${String(mv[k])} ≠ ${v}`);
  ok("적힌 값이 코드의 상수와 같다", wrong.length === 0, wrong.join(" / "));

  ok("비어 있는 것이 맞는 칸은 까닭이 적혀 있다 — 세 칸",
    Object.keys(MAY_BE_NULL).every((k) => k in mv),
    Object.entries(MAY_BE_NULL).map(([k]) => `${k}=${String(mv[k] ?? "없음")}`).join(" · "));

  /**
   * **굳었는가.** 다시 읽어도 그 줄이 그대로여야 한다. 읽는 쪽이 다시
   * 만들면 판본을 올린 날 그 사람의 결과가 조용히 달라진다.
   */
  const again = await queryOne<{ j: string; p: string }>(
    `SELECT module_versions::text AS j, payload::text AS p
       FROM v3_snapshots WHERE id = $1`, [snapId]);
  ok("다시 읽어도 같은 줄이다 (읽는 쪽이 다시 만들지 않는다)",
    again?.j === row?.j && (again?.p ?? "").length > 100);

  /* ── ② 세는 걸음 ─────────────────────────────────────────────── */

  /**
   * **이름이 겹치면 한 표에서 섞인다.** 세 목록이 `analytics_events` 를
   * 같이 쓰는데, 묻는 것이 다르다: 상용은 방문이 결제가 되는가, 작업공간은
   * 결과를 받은 사람이 다시 들어오는가, 파일럿은 어디서 멈췄는가다.
   * 한 이름이 둘에 있으면 어느 쪽 수도 못 믿는다.
   */
  const names = [
    ...FUNNEL_STEPS.map((s) => ({ ns: "상용", n: s as string })),
    ...WORKSPACE_EVENTS.map((s) => ({ ns: "작업공간", n: s as string })),
    /* 파일럿은 `v3_pilot.` 꼬리표가 붙어 저장되므로 그 모양으로 본다 */
    ...FUNNEL.map((s) => ({ ns: "파일럿", n: `v3_pilot.${s}` })),
  ];
  const seen = new Map<string, string>();
  const clash: string[] = [];
  for (const x of names) {
    const had = seen.get(x.n);
    if (had) clash.push(`${x.n} (${had} · ${x.ns})`);
    seen.set(x.n, x.ns);
  }
  ok(`세 목록의 이름이 겹치지 않는다 — 걸음 ${names.length}개`,
    clash.length === 0, clash.join(" / "));

  /**
   * **받고 적지 않는 걸음이 없다.** 목록에 이름만 적어 두면 운영 표에
   * 늘 0 으로 서고, 읽는 사람은 **아무도 거기까지 안 갔다**고 읽는다.
   * 실제로는 적는 코드가 없는 것이다.
   */
  const body = src.map(read).join("\n");
  const noSite = [
    ...FUNNEL.filter((s) => !body.includes(`"${s}"`) && !body.includes(`'${s}'`))
      .filter((s) => !/_completed$/.test(s))   /* `completedStep()` 이 고른다 */
      .map((s) => `파일럿:${s}`),
    ...WORKSPACE_EVENTS.filter((s) => !body.includes(`"${s}"`)).map((s) => `작업공간:${s}`),
    ...FUNNEL_STEPS.filter((s) => !body.includes(`"${s}"`)).map((s) => `상용:${s}`),
  ];
  ok("목록에 있는 걸음이 전부 적는 자리를 가진다", noSite.length === 0, noSite.join(" / "));

  ok("등급을 끝낸 걸음은 `completedStep()` 하나가 고른다",
    /function completedStep/.test(read("src/lib/me-v3/pilot/funnel.ts"))
    && /completedStep\(/.test(read("src/lib/me-v3/pilot/sync.ts")));

  /**
   * **같은 걸음을 두 번 적지 않는다.** 사람으로 세는 것이라, 결과지를
   * 다섯 번 새로 고친 사람이 다섯 명이 되면 전환율이 바닥으로 보인다.
   * 글자로 보지 않고 **실제로 두 번 불러 본다.**
   */
  const tag = `pilotready-${Date.now()}`;
  await pilotMark("result_opened", { participant: tag, wave: 0, tier: "BASIC" });
  await pilotMark("result_opened", { participant: tag, wave: 0, tier: "BASIC" });
  const dupe = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM analytics_events
      WHERE name = 'v3_pilot.result_opened' AND props->>'participant' = $1`, [tag]);
  ok("두 번 불러도 한 줄만 적힌다", Number(dupe[0]?.n ?? 0) === 1,
    `줄 ${dupe[0]?.n}`);
  await query(`DELETE FROM analytics_events WHERE props->>'participant' = $1`, [tag]);

  /* 작업공간 쪽은 **일부러 매번 적고** 읽을 때 사람으로 센다 */
  const wse = read("src/lib/me-v3/workspace-events.ts");
  ok("작업공간 쪽은 매번 적고 읽을 때 사람으로 센다",
    /count\(DISTINCT e\.user_id\)/.test(wse) && /count\(\*\)/.test(wse));

  ok("시연 자료가 작업공간 지표에 섞이지 않는다", /du\.is_demo/.test(wse));

  /* ── ③ 운영 화면 ─────────────────────────────────────────────── */
  const one = read("src/app/admin/v3-pilot/[attemptId]/page.tsx");
  const list = read("src/app/admin/v3-pilot/page.tsx");

  /**
   * **적어 두기만 하면 아무도 안 본다.** 판본이 줄에 들어 있어도 운영
   * 화면이 안 보여 주면, 파일럿 중에 판본이 올라간 것을 아무도 모른다.
   * 그러면 두 묶음을 한 묶음으로 분석한다.
   */
  ok("한 사람 화면이 판본을 보여 준다", /module_versions/.test(one));
  ok("판본 칸 이름을 사람 말로 적는다 (열쇠를 그대로 늘어놓지 않는다)",
    /VERSION_KO|판본/.test(one));
  ok("표가 wave 안에서 판본이 섞인 것을 적는다",
    /mixedVersions|섞/.test(list) || /mixedVersions/.test(read("src/lib/me-v3/pilot/analyze.ts")));
  ok("운영 화면에 전공명이 나가지 않는다",
    !/major_name/.test(one) && !/major_name/.test(list));

  console.log(`\n  판본 ${Object.keys(mv).length}칸 · 걸음 ${names.length}개`
    + ` (상용 ${FUNNEL_STEPS.length} · 작업공간 ${WORKSPACE_EVENTS.length}`
    + ` · 파일럿 ${FUNNEL.length})`);
}

main()
  .then(async () => {
    await query(`DELETE FROM v3_attempts WHERE user_id =
      (SELECT id FROM users WHERE login_id = $1)`, [LOGIN]).catch(() => undefined);
    console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
    process.exit(bad.length ? 1 : 0);
  })
  .catch((e) => { console.error(e); process.exit(1); });
