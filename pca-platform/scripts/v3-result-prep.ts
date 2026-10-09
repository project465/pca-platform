/**
 * 결과지를 찍기 전에 **사람 셋을 실제로 끝까지 응시시킨다.**
 *
 * 쓰는 사람은 셋이다. 관심만 높고 겪어 본 것이 거의 없는 학부생(P02) ·
 * 구조해석 석사(P04) · 근거가 강한 포닥(P12). 셋이 서로 **다른 결과지**를
 * 받아야 결과 엔진이 일을 한 것이다. 같은 화면이 세 번 나오면 그 결과지는
 * 사람을 가르지 못한다.
 *
 *   npx tsx scripts/v3-result-prep.ts      # 자리 목록을 JSON 으로
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { randomBytes } from "node:crypto";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { controlOf } from "../src/lib/me-v3/runtime/menus";
import {
  attemptOf, checklistFor, choosePack, content, itemOf, menuContextOf,
  moveTo, saveAnswer, savePicks, submit, viewOf, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import type { Answer, GradField, Stage, Tier } from "../src/lib/me-v3/scoring/types";

if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error("운영에서는 돌리지 않습니다.");
  process.exit(2);
}

/**
 * 찍는 사람은 **학생 계정이다.**
 *
 * 전에는 `me-admin` 을 썼는데 그 계정은 기관 담당자(`org_admin`)라
 * `homePathFor` 가 `/org` 로 보낸다. 작업공간을 찍으면서 작업공간이
 * 기본 화면이 아닌 사람으로 찍고 있었던 셈이다. 그리고 **비밀번호를
 * 다른 스크립트의 소스에서 긁어 오지 않는다**: 여기서 만들어 여기서
 * 돌려준다. 긁어 오던 쪽이 첫 로그인 강제 변경을 모르고 비밀번호 변경
 * 화면을 스물한 장 찍었다.
 */
const LOGIN = "cmshots-work@example.com";
type Level = "none" | "mid" | "strong";

async function pick(a: V3Attempt, id: string, lv: Level): Promise<Answer | null> {
  const it = itemOf(id);
  if (!it) return null;
  /* **뒤집어 묻는 문항은 뒤집어 답한다.** `강하게` 로 전부 밀면 반대
     방향 문항까지 높게 답한 꼴이 되고, 응답 품질 검사가 `다시 볼 것` 을
     붙인다. 사람이 그렇게 답하지도 않는다 */
  const lvl: Level = (it as { reverse_flag?: boolean }).reverse_flag
    ? (lv === "strong" ? "none" : lv === "none" ? "strong" : "mid")
    : lv;
  const c = controlOf(it, await menuContextOf(a));
  if (c.kind === "level") {
    return { kind: "level", index: lvl === "none" ? 0 : lvl === "mid" ? 2 : 3 };
  }
  if (c.kind === "scale5") {
    return { kind: "scale5", value: lvl === "none" ? 2 : lvl === "mid" ? 4 : 5 };
  }
  if (c.kind === "exposure") {
    return { kind: "exposure", value: lvl === "none" ? 0 : lvl === "mid" ? 1 : 2 };
  }
  /* 한 줄짜리 단계. 값은 은행이 들고 있고 여기서 만들지 않는다 */
  if (c.kind === "steps") {
    /* `잘 모르겠다` 자리를 빼고 고른다. 그 보기는 값이 `null` 이라 수로
       저장되지 않고, 사람 벌을 만들 때 쓰면 그 사람이 관심을 안 고른 것이
       된다 */
    const vs = c.options.map((o) => o.value)
      .filter((v): v is number => typeof v === "number")
      .sort((a, b) => a - b);
    /* **차례가 아니라 값으로 고른다.** 보기 차례를 쓰면 은행의 보기 순서가
       낮은 쪽부터로 바뀐 날 `높음` 이 가장 낮은 값을 집는다 */
    const got = lv === "none" ? vs[0] : lv === "mid" ? vs[Math.floor(vs.length / 2)]
      : vs[vs.length - 1];
    return c.answer === "exposure"
      ? { kind: "exposure", value: got }
      : { kind: "scale5", value: got };
  }
  const o = c.options[0];
  return o ? { kind: "choice", value: o.value } : null;
}

async function freshAttempt(
  userId: string, tier: Tier, stage: Stage, field: GradField | null,
): Promise<V3Attempt> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO v3_attempts
       (user_id, tier, market_code, education_stage, grad_field,
        item_bank_version, scoring_version, current_screen)
     VALUES ($1,$2,'KR',$3,$4,'ME_V3_ITEM_BANK_V2','me-v3-scoring.2','profile')
     RETURNING id::text`,
    [userId, tier, stage, field]);
  return (await attemptOf(row?.id as string, userId)) as V3Attempt;
}

async function fillGrid(a: V3Attempt, want: Record<string, [number, number, number]>) {
  for (const d of content().domains.domains) {
    const g = want[d.code] ?? [3, 0, 3];
    await saveAnswer(a.id, `G_${d.code}_INT`, { kind: "scale5", value: g[0] });
    await saveAnswer(a.id, `G_${d.code}_EXP`, { kind: "exposure", value: g[1] });
    await saveAnswer(a.id, `G_${d.code}_LEA`, { kind: "scale5", value: g[2] });
  }
}

async function walk(
  a0: V3Attempt, userId: string, lv: Level,
  opt: { picks?: boolean; industry?: string; role?: string } = {},
) {
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = null;
  for (let guard = 0; guard < 400; guard += 1) {
    const v = await viewOf(a, want);
    /* **선별 문항까지 전부 `내가 정했다` 로 답하지 않는다.** 그 영역에는
       근거를 고르는 화면이 없어서, 고른 항목 없이 소유만 높으면 응답 품질
       검사가 `다시 볼 것` 으로 적는다. 사람이 실제로 그렇게 답하지도 않는다 */
    const lvl: Level = v.screen.id.startsWith("probe-") && lv === "strong" ? "mid" : lv;
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const ans = await pick(a, id, lvl);
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain && opt.picks !== false) {
      for (const g of checklistFor(v.screen.domain)) {
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, 2));
      }
    }
    if (v.screen.kind === "pick-industry" && opt.industry) {
      await choosePack(a.id, "industry", opt.industry);
    }
    if (v.screen.kind === "pick-role" && opt.role) {
      await choosePack(a.id, "role", opt.role);
    }
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
  return (await attemptOf(a0.id, userId)) as V3Attempt;
}

/**
 * 찍을 학생 계정을 그 자리에서 만든다. **열쇠는 해시만 남는다.**
 *
 * 있으면 비밀번호만 새로 적는다(쌓인 응시는 부르는 쪽이 지운다).
 * `must_reset_pw` 를 반드시 `FALSE` 로 둔다: `true` 면 어느 주소를
 * 열어도 비밀번호 변경 화면으로 떨어지고, 그 화면은 200 이라 찍는
 * 쪽에서 통과로 세어진다.
 */
async function ensureStudent(login: string): Promise<{ id: string; pw: string }> {
  const pw = randomBytes(18).toString("base64url");
  const hash = await hashPassword(pw);
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1 OR lower(email) = lower($1)`,
    [login]);
  if (old) {
    await query(
      `UPDATE users SET password_hash = $2, must_reset_pw = FALSE,
              status = 'active', is_demo = TRUE WHERE id = $1`,
      [old.id, hash]);
    return { id: old.id, pw };
  }
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, is_demo, must_reset_pw)
     VALUES ($1,$1,'김담당',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
    [login, hash]);
  if (!row) throw new Error(`계정을 만들지 못했습니다: ${login}`);
  return { id: row.id, pw };
}

async function main() {
  const me = await ensureStudent(LOGIN);
  const uid = me.id;
  await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [uid]);
  const out: { name: string; path: string; note: string; who: string; full?: boolean }[] = [];

  /* P02 관심만 높은 학부생 · BASIC. **무료도 완성형 화면이어야 한다** */
  const p02 = await freshAttempt(uid, "BASIC", "bachelor", null);
  await fillGrid(p02, { TD01: [5, 0, 5], TD02: [5, 0, 5], TD03: [4, 0, 4] });
  const a02 = await walk(p02, uid, "none", { picks: false });
  await submit(a02);
  out.push({ name: "r1_basic", who: "shots", full: true, note: "BASIC · 관심만 높은 학부생",
    path: `/v3/${a02.id}/result` });

  /* P04 구조해석 석사 · STANDARD */
  const p04 = await freshAttempt(uid, "STANDARD", "master", "STEM");
  await fillGrid(p04, { TD02: [5, 2, 5], TD01: [4, 1, 4], TD11: [4, 1, 4] });
  const a04 = await walk(p04, uid, "strong");
  await submit(a04);
  out.push({ name: "r2_standard", who: "shots", full: true, note: "STANDARD · 구조해석 석사",
    path: `/v3/${a04.id}/result` });

  /* P12 근거가 강한 포닥 · PRO. 산업과 역할을 고른다 */
  const p12 = await freshAttempt(uid, "PRO", "postdoc", "STEM");
  await fillGrid(p12, { TD02: [5, 2, 5], TD04: [5, 2, 5], TD07: [5, 2, 4] });
  const a12 = await walk(p12, uid, "strong", {
    industry: "INDUSTRY_SEMICON_V2", role: "ROLE_CAE_V2",
  });
  await submit(a12);
  out.push({ name: "r3_pro", who: "shots", full: true, note: "PRO · 근거가 강한 포닥",
    path: `/v3/${a12.id}/result` });
  out.push({ name: "r4_pro_top", who: "shots", note: "PRO · 첫 화면",
    path: `/v3/${a12.id}/result` });
  out.push({ name: "r5_pro_focus", who: "shots", note: "PRO · 먼저 볼 영역",
    path: `/v3/${a12.id}/result#focus` });
  out.push({ name: "r6_pro_evidence", who: "shots", note: "PRO · 근거",
    path: `/v3/${a12.id}/result#evidence` });
  out.push({ name: "r7_pro_gaps", who: "shots", note: "PRO · 채울 것",
    path: `/v3/${a12.id}/result#gaps` });
  out.push({ name: "r8_pro_industry", who: "shots", note: "PRO · 산업",
    path: `/v3/${a12.id}/result#industry` });
  out.push({ name: "r9_pro_role", who: "shots", note: "PRO · 역할",
    path: `/v3/${a12.id}/result#role` });
  out.push({ name: "r10_pro_plan", who: "shots", note: "PRO · 다음에 할 일",
    path: `/v3/${a12.id}/result#plan` });
  out.push({ name: "r11_pro_translation", who: "shots", note: "PRO · 연구 번역",
    path: `/v3/${a12.id}/result#translation` });
  out.push({ name: "r12_standard_focus", who: "shots", note: "STANDARD · 먼저 볼 영역",
    path: `/v3/${a04.id}/result#focus` });
  out.push({ name: "r13_standard_evidence", who: "shots", note: "STANDARD · 근거",
    path: `/v3/${a04.id}/result#evidence` });
  out.push({ name: "r14_standard_plan", who: "shots", note: "STANDARD · 다음에 할 일",
    path: `/v3/${a04.id}/result#plan` });
  out.push({ name: "r15_basic_zones", who: "shots", note: "BASIC · 열두 영역",
    path: `/v3/${a02.id}/result#zones` });
  out.push({ name: "r16_basic_plan", who: "shots", note: "BASIC · 다음에 할 일",
    path: `/v3/${a02.id}/result#plan` });

  /* **비밀번호를 파일에 적지 않는다.** 이 줄은 찍는 쪽으로 바로
     흘러가는 표준출력이고 저장소에 남지 않는다 */
  console.log(JSON.stringify({
    users: { shots: { id: LOGIN, pw: me.pw } }, targets: out,
  }));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
