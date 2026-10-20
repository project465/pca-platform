/**
 * **Track C · 플랫폼 안정성 (서버 레벨).** 응시 화면이 서버에 쓰는 자리
 * (`src/app/v3/[attemptId]/actions.ts`)를 **그대로** 부르고, DB 를 같이 센다.
 *
 * 브라우저를 쓰지 않는다. 이 환경에서 Next 를 빌드할 수 없어서(npm 레지스트리
 * 막힘) 화면 쪽은 NOT VERIFIED 로 남기고, 그 화면이 부르는 서버 함수가 맞게
 * 도는지를 여기서 본다. 로그인 세션만 바꿔 끼운다: `@/lib/session` 을 이
 * 파일이 정한 사람으로 답하게 하고, 나머지(주인 확인 · 상태 확인 · 잠금 ·
 * 채점 · 결과 모델)는 제품 코드가 그대로 돈다.
 *
 *   DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' \
 *     OUT=docs/metri/review/tracks/C npx tsx scripts/lab/trackC-stability.ts
 *
 * **운영 DB 에 대고 돌리지 않는다.** 로컬 소켓 DB 가 아니면 그 자리에서 멈춘다.
 */
import { loadEnv, makeStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\/\/(cm_dev|cm_gm_iso)\b/.test(URL_)) {
  console.error(`로컬 개발 DB 가 아니다: ${URL_}`); process.exit(2);
}

/* ── 로그인 세션을 바꿔 끼운다 ─────────────────────────────────────── */
type Who = { id: string; name: string; locale: string; mustResetPw: boolean; role: string; memberships: unknown[] };
let WHO: Who | null = null;
class Redirect extends Error { constructor(public to: string) { super(`redirect ${to}`); } }
const sessionFile = require.resolve(path.resolve("src/lib/session.ts"));
require.cache[sessionFile] = {
  id: sessionFile, filename: sessionFile, loaded: true,
  exports: {
    currentUser: async () => WHO,
    requireUser: async () => { if (!WHO) throw new Redirect("/login"); return WHO; },
    requireRole: async () => { if (!WHO) throw new Redirect("/login"); return WHO; },
    roleInOrg: () => null,
  },
} as unknown as NodeModule;

/* eslint-disable @typescript-eslint/no-require-imports */
const { query, queryOne } = require("../../src/lib/db") as typeof import("../../src/lib/db");
const S = require("../../src/lib/me-v3/runtime/session") as typeof import("../../src/lib/me-v3/runtime/session");
const ACT = require("../../src/app/v3/[attemptId]/actions") as typeof import("../../src/app/v3/[attemptId]/actions");
const P = require("../../src/lib/me-v3/platform") as typeof import("../../src/lib/me-v3/platform");
const { answerAll, PEOPLE } = require("../_v3-answer") as typeof import("../_v3-answer");

const OUT = process.env.OUT ?? "docs/metri/review/tracks/C";
const rows: string[] = []; let pass = 0; const bad: string[] = [];
const ok = (what: string, cond: boolean, got = ""): void => {
  rows.push(`| ${cond ? "PASS" : "**FAIL**"} | ${what} | ${got.replace(/\|/g, "/")} |`);
  if (cond) pass++; else bad.push(what);
  console.log(`  ${cond ? "통과" : "걸림"}  ${what}${got ? " — " + got : ""}`);
};
const head = (t: string): void => { rows.push(`| | **${t}** | |`); console.log(`\n── ${t}`); };
const n = async (sql: string, p: unknown[]): Promise<number> =>
  Number((await queryOne<{ n: string }>(sql, p))?.n ?? 0);
const as = (u: { id: string }): void => {
  WHO = { id: u.id, name: "시험", locale: "ko", mustResetPw: false, role: "student", memberships: [] };
};

async function main(): Promise<void> {
  const A = await makeStudent("zztc-a"); const B = await makeStudent("zztc-b");
  const CORE = "BIZ_CORE_V1";

  head("C1 응시 열기 · 중복 응시 없음");
  const a1 = await S.openAttempt({ userId: A.id, tier: "PRO", stage: "bachelor", gradField: null, core: CORE });
  const a2 = await S.openAttempt({ userId: A.id, tier: "PRO", stage: "bachelor", gradField: null, core: CORE });
  ok("같은 사람이 두 번 열어도 같은 응시다(이어보기)", a1.id === a2.id, `${a1.id} / ${a2.id}`);
  ok("열린 응시가 한 줄이다", await n(`SELECT count(*)::text n FROM v3_attempts WHERE user_id=$1 AND status='in_progress'`, [A.id]) === 1);
  ok("고른 전공으로 열렸다", a1.core_code === CORE, a1.core_code);

  head("C2 저장 · 덮어쓰기 · 동시 저장");
  const item = `G_TD01_INT`;
  as(A);
  const s1 = await ACT.answerAction(a1.id, item, { kind: "scale5", value: 2 });
  const s2 = await ACT.answerAction(a1.id, item, { kind: "scale5", value: 5 });
  const r = await queryOne<{ v: number; c: string }>(
    `SELECT max(value_int) v, count(*)::text c FROM v3_responses WHERE attempt_id=$1 AND item_id=$2`, [a1.id, item]);
  ok("두 번 저장하면 줄은 하나, 값은 나중 값이다", s1.ok && s2.ok && r?.c === "1" && Number(r?.v) === 5, `줄 ${r?.c} · 값 ${r?.v}`);
  /* 빠르게 고쳐 누른 다섯 번이 같은 순간에 들어와도 줄이 하나다 */
  await Promise.all([1, 2, 3, 4, 5].map((v) => ACT.answerAction(a1.id, "G_TD02_INT", { kind: "scale5", value: v })));
  ok("같은 문항 동시 저장 다섯 번 → 줄 하나", await n(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id=$1 AND item_id='G_TD02_INT'`, [a1.id]) === 1);

  head("C3 남의 응시에 쓰지 못한다");
  as(B);
  const sb = await ACT.answerAction(a1.id, item, { kind: "scale5", value: 1 });
  const v3 = await queryOne<{ v: number }>(`SELECT value_int v FROM v3_responses WHERE attempt_id=$1 AND item_id=$2`, [a1.id, item]);
  ok("B 가 A 의 응시 번호로 저장 → 거절, 값 그대로", !sb.ok && Number(v3?.v) === 5, `ok=${sb.ok} · 값 ${v3?.v}`);
  const fb = await ACT.finishAction(a1.id);
  ok("B 가 A 의 응시를 제출 → 거절", !fb.ok && (await S.attemptOf(a1.id, A.id))?.status === "in_progress");
  ok("B 에게 A 의 응시가 보이지 않는다", (await S.attemptOf(a1.id, B.id)) === null);
  WHO = null;
  let redirected = "";
  try { await ACT.answerAction(a1.id, item, { kind: "scale5", value: 1 }); } catch (e) { redirected = (e as Redirect).to ?? String(e); }
  ok("로그인하지 않으면 로그인으로 보낸다", redirected === "/login", redirected);

  head("C4 이어하기 (중간에 닫고 다시 들어옴)");
  as(A);
  const cur = await ACT.cursorAction(a1.id, 3);
  const back = await S.currentAttempt(A.id);
  const ans = back ? await S.answersOf(back.id) : {};
  ok("다시 들어오면 같은 응시가 열린다", back?.id === a1.id);
  ok("저장한 답이 그대로 있다", (ans[item] as { value?: number })?.value === 5, JSON.stringify(ans[item]));
  ok("멈춘 화면이 저장된다", cur.ok && !!back?.current_screen && back.current_screen !== "profile", back?.current_screen ?? "");

  head("C5 끝까지 답하고 제출 · 동시 제출 다섯");
  await answerAll(CORE, (await S.attemptOf(a1.id, A.id))!, A.id, PEOPLE[2]);
  const before = await n(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id=$1`, [a1.id]);
  const res = await Promise.all([1, 2, 3, 4, 5].map(() => ACT.finishAction(a1.id).catch((e) => ({ ok: false, err: String(e) }))));
  const snaps = await n(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id=$1`, [a1.id]);
  const st = (await S.attemptOf(a1.id, A.id))?.status;
  ok("동시 제출 다섯 번 → 결과 한 벌", snaps === 1, `스냅샷 ${snaps} · 응답 ${before}`);
  ok("응시가 굳었다(scored)", st === "scored", String(st));
  ok("다섯 요청이 오류 없이 끝난다", res.every((x) => !("err" in x)), res.map((x) => ("err" in x ? "ERR" : x.ok)).join(","));
  ok("결과 모델이 같은 줄에 굳어 있다", (await S.latestResult(a1.id)) !== null);

  head("C6 끝난 응시는 쓰지 않는다");
  const late = await ACT.answerAction(a1.id, item, { kind: "scale5", value: 1 });
  const v6 = await queryOne<{ v: number }>(`SELECT value_int v FROM v3_responses WHERE attempt_id=$1 AND item_id=$2`, [a1.id, item]);
  ok("제출 뒤 저장 → 거절, 답 그대로", !late.ok && Number(v6?.v) === 5);
  const re = await ACT.finishAction(a1.id);
  ok("제출 뒤 다시 제출 → 거절, 결과 한 벌 그대로", !re.ok && await n(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id=$1`, [a1.id]) === 1);

  head("C7 결과 조회와 사용자별 보호");
  ok("A 의 최근 결과가 A 에게 읽힌다", (await P.latestResult(A.id)) !== null);
  ok("B 의 최근 결과로 A 의 것이 나오지 않는다", (await P.latestResult(B.id)) === null);
  const eid = await P.addExperience(A.id, { kind: "course", title: "트랙C 시험 경험", td_codes: ["TD01"] });
  ok("A 가 적은 경험이 A 목록에 있다", (await P.experiencesOf(A.id, CORE)).some((x) => x.id === eid));
  ok("A 가 적은 경험이 B 목록에 없다", !(await P.experiencesOf(B.id, CORE)).some((x) => x.id === eid));

  head("C8 결과의 재현성");
  /* 저장된 응답으로 다시 채점하면 굳은 판정과 같은 값이 나와야 한다(설계 원칙 6) */
  const E = require("../../src/lib/me-v3/scoring/engine") as typeof import("../../src/lib/me-v3/scoring/engine");
  const at = (await S.attemptOf(a1.id, A.id))!;
  const sub = await S.submissionOf(at);
  const re1 = E.score(sub, E.load(CORE)); const re2 = E.score(sub, E.load(CORE));
  const stored = await queryOne<{ p: { domains?: unknown; core?: unknown } }>(`SELECT payload p FROM v3_snapshots WHERE attempt_id=$1`, [a1.id]);
  /* jsonb 는 열쇠 차례를 다시 세운다. 값을 견주려면 열쇠를 세운 꼴로 적는다 */
  const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon)
    : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]))
    : v;
  const pick = (x: unknown) => JSON.stringify(canon((x as { domains?: unknown }).domains ?? null));
  ok("같은 응답을 두 번 채점하면 같은 판정이다", pick(re1) === pick(re2));
  ok("다시 채점한 영역 판정이 굳은 결과와 같다", pick(re1) === pick(stored?.p), `${pick(re1).length}자`);

  head("C9 DB 연결이 끊겨도 다음 저장이 이어진다");
  /* 이 과정이 쥔 연결만 끊는다(다른 작업의 연결은 건드리지 않는다).
     같은 순간에 질의 열을 띄워 풀이 든 연결의 서버 쪽 번호를 모은다 */
  const Cc = await makeStudent("zztc-c");
  const ac = await S.openAttempt({ userId: Cc.id, tier: "PRO", stage: "bachelor", gradField: null, core: CORE });
  const pids = new Set((await Promise.all(Array.from({ length: 10 }, () =>
    queryOne<{ p: number }>(`SELECT pg_backend_pid() p, pg_sleep(0.3)`, [])))).map((x) => Number(x?.p)));
  const { execFileSync } = require("node:child_process") as typeof import("node:child_process");
  const killed = execFileSync("psql", ["-tA", "-d", "cm_dev", "-c",
    `SELECT count(*) FROM (SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid IN (${[...pids].join(",")})) t`]).toString().trim();
  as(Cc);
  let saved = false, err = "";
  try { saved = (await ACT.answerAction(ac.id, "G_TD01_INT", { kind: "scale5", value: 4 })).ok; } catch (e) { err = String(e).slice(0, 120); }
  const kept = await queryOne<{ v: number }>(`SELECT value_int v FROM v3_responses WHERE attempt_id=$1 AND item_id='G_TD01_INT'`, [ac.id]);
  ok("연결을 끊은 직후 저장이 다시 붙어 성공한다", saved && Number(kept?.v) === 4, `끊은 연결 ${killed}/${pids.size} · ${err || "ok"}`);
  ok("앞서 저장한 A 의 응답 수가 그대로다", await n(`SELECT count(*)::text n FROM v3_responses WHERE attempt_id=$1`, [a1.id]) === before);
  await query(`DELETE FROM v3_attempts WHERE user_id=$1`, [Cc.id]).catch(() => undefined);

  /* 치운다: 시험 사용자 둘의 줄 */
  for (const u of [A, B]) {
    await query(`DELETE FROM v3_experiences WHERE user_id=$1`, [u.id]).catch(() => undefined);
  }

  const total = pass + bad.length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "STABILITY.md"), [
    "# Track C · 플랫폼 안정성 (서버 레벨)", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · DB \`${URL_}\` (로컬 개발 DB · 운영 아님)`,
    "- 응시 화면이 부르는 서버 액션(`src/app/v3/[attemptId]/actions.ts`)과 세션 함수를 그대로 부른다. 로그인 세션만 바꿔 끼운다.",
    "- **브라우저 검증이 아니다**: 이 환경에서 Next 를 빌드할 수 없어 화면·모바일 UX·세션 쿠키 유지는 NOT VERIFIED.", "",
    `**통과 ${pass} · 걸림 ${bad.length} / ${total}**`, "",
    "| 판정 | 확인 | 값 |", "|---|---|---|", ...rows, "",
  ].join("\n"));
  console.log(`\n확인 ${total}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
