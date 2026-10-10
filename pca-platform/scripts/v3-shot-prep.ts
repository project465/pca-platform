/**
 * 검사 화면을 찍기 전에 **실제 응시 다섯 벌을 DB 에 만든다.**
 *
 * 화면만 그려 놓고 찍으면 그 그림은 자료 없이 세운 화면이고, 다음에
 * 깨졌을 때 아무것도 못 찾는다. 사람 다섯 벌을 끝까지 걸어 두고 **보고
 * 싶은 자리의 번호**를 돌려주면, 찍는 쪽은 로그인해서 그 주소로 가면
 * 된다.
 *
 * 응답은 **화면이 내놓는 보기 값 그대로** 넣는다(`controlOf`). 검사용
 * 값을 따로 쓰면 고른 자리가 화면에 안 나타나고, 그 어긋남을 찍은 그림이
 * 가려 준다.
 *
 *   npx tsx scripts/v3-shot-prep.ts        # 자리 목록을 JSON 으로
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

import { query, queryOne } from "../src/lib/db";
import { controlOf } from "../src/lib/me-v3/runtime/menus";
import {
  attemptOf, checklistFor, content, itemOf, menuContextOf, savePicks3, setProfile,
  moveTo, planFor, saveAnswer, savePicks, submit, viewOf, wordingOf,
  type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import type { Answer, GradField, Stage, Tier } from "../src/lib/me-v3/scoring/types";

if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error("운영에서는 돌리지 않습니다.");
  process.exit(2);
}

/** 화면을 찍을 계정. `scripts/seed.ts` 가 만든 개발용이다 */
const SHOT_LOGIN = "me-admin";
/** 시작 화면을 찍을 계정. **이어 볼 응시가 없어야 그 화면이 뜬다** */
const START_LOGIN = "admin";

type Level = "none" | "mid" | "strong";

/** 응답 하나. 화면이 내놓는 보기 가운데 고른다 */
async function pick(a: V3Attempt, id: string, lv: Level): Promise<Answer | null> {
  const it = itemOf(id);
  if (!it) return null;
  const c = controlOf(it, await menuContextOf(a));
  if (c.kind === "level") {
    return { kind: "level", index: lv === "none" ? 0 : lv === "mid" ? 2 : 3 };
  }
  if (c.kind === "scale5") {
    return { kind: "scale5", value: lv === "none" ? 2 : lv === "mid" ? 4 : 5 };
  }
  if (c.kind === "exposure") {
    return { kind: "exposure", value: lv === "none" ? 0 : lv === "mid" ? 1 : 2 };
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
    /* 학습 의향은 선별된 영역에만 묻는다. 걸어 들어가며 받는다 */
  }
}

/** 처음부터 끝까지 넘기며 답한다. 이미 답한 자리는 덮지 않는다 */
async function walk(a0: V3Attempt, userId: string, lv: Level, picks = true) {
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = null;
  for (let guard = 0; guard < 400; guard += 1) {
    const v = await viewOf(a, want);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const ans = await pick(a, id, lv);
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain && picks) {
      for (const g of checklistFor(v.screen.domain)) {
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, 2));
      }
    }
    if (v.screen.kind === "pick-industry") {
      await savePicks3(a.id, "industry", ["INDUSTRY_SEMICON_V2", "INDUSTRY_ROBOT_V2"]);
    }
    if (v.screen.kind === "pick-role") {
      await savePicks3(a.id, "role", ["ROLE_CAE_V2", "ROLE_DESIGN_V2"]);
    }
    if (v.screen.kind === "pick-org") await savePicks3(a.id, "org", ["OC1", "OC2"]);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
  return (await attemptOf(a0.id, userId)) as V3Attempt;
}

async function userId(login: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [login]);
  if (!r) throw new Error(`계정이 없습니다: ${login}. npm run db:seed 를 먼저 돌리십시오`);
  return r.id;
}

/**
 * 화면 이름으로 번호를 찾는다. **번호는 routing 으로 달라진다**
 *
 * **못 찾으면 그 자리에서 멈춘다.** 전에는 `-1` 을 그대로 돌려줬고,
 * `?s=-1` 은 응시 화면이 마지막 화면으로 끌어다 붙여 **완료 화면이 200
 * 으로 멀쩡히 떴다.** 그래서 `실제 판단` 과 `심화` 와 `소유` 세 자리가
 * 셋 다 완료 화면을 찍고 있었고 찍는 검사는 초록이었다. 화면 이름이
 * `probe-TD01_J3_1` 에서 `probe-TD01-J3` 으로 바뀐 날 조용히 그렇게 됐다.
 */
async function at(
  a: V3Attempt, match: (id: string, kind: string) => boolean, what = "",
): Promise<number> {
  const plan = await planFor(a);
  const i = plan.screens.findIndex((s) => match(s.id, s.kind));
  if (i < 0) {
    throw new Error(`찍을 화면을 못 찾았습니다${what ? `: ${what}` : ""}. `
      + `응시 ${a.id} 의 화면 ${plan.screens.length}개 — `
      + `${plan.screens.map((s) => s.id).join(" ")}`);
  }
  return i;
}

/**
 * 그 자리의 화면이 무엇을 세우는지 미리 꺼내 둔다.
 *
 * 문항 문면은 **은행에서 그대로** 읽는다. 화면에는 내부 코드가 한 글자도
 * 나가지 않으므로(설계), 찍은 그림이 그 문항의 화면인지는 문면으로만
 * 되짚을 수 있다.
 */
async function expectOf(
  a: V3Attempt, idx: number, path: string,
): Promise<{ route: string; heading?: string; itemText?: string }> {
  const plan = await planFor(a);
  const sc = plan.screens[idx];
  if (!sc) return { route: path };
  const first = sc.items[0];
  const raw = first ? wordingOf(first, a.education_stage) : "";
  /* 너무 긴 문면은 줄바꿈과 공백이 화면에서 달라질 수 있어 앞 토막만 쓴다 */
  const itemText = raw ? raw.replace(/\s+/g, " ").trim().slice(0, 24) : undefined;
  /* **완료 화면의 머리글은 제출 전과 뒤가 다르다.** 계획은 제출 전 문장을
     들고 있으므로, 이미 낸 응시에서는 화면이 실제로 세우는 쪽을 적는다 */
  const heading = sc.kind === "done" && a.status !== "in_progress"
    ? "내 CareerMatri가 만들어졌습니다" : sc.question;
  return { route: path, heading, itemText };
}

/**
 * 자리 하나를 가리키는 `path` 와 그 자리의 기대값을 함께 만든다.
 *
 * 둘을 따로 적으면 한쪽만 고치는 날이 오고, 그날부터 기대값이 다른
 * 화면을 가리킨 채 초록으로 선다.
 */
async function shot(
  a: V3Attempt, match: (id: string, kind: string) => boolean, what: string,
): Promise<{ path: string; expect: { route: string; heading?: string; itemText?: string } }> {
  const i = await at(a, match, what);
  const path = `/v3/${a.id}?s=${i}`;
  return { path, expect: await expectOf(a, i, path) };
}

async function main() {
  const shots = await userId(SHOT_LOGIN);
  const starter = await userId(START_LOGIN);
  /* 같은 계정에 응시가 쌓이면 어느 것을 보는지 알 수 없다 */
  await query(`DELETE FROM v3_attempts WHERE user_id = ANY($1)`, [[shots, starter]]);

  /**
   * **찍은 그림이 그 화면이라는 증거를 함께 적는다.**
   *
   * 200 하나로는 모자란다. 자리를 못 찾아 `?s=-1` 이 된 날에도 응시
   * 화면은 마지막 화면으로 끌어다 붙여 **완료 화면이 200 으로 멀쩡히
   * 떴고**, 그래서 `실제 판단` 과 `심화` 와 `소유` 세 자리가 셋 다 같은
   * 그림을 찍고 있었다. 이제 자리마다 셋을 적어 두고 찍는 쪽이 대조한다:
   * 주소 · 화면의 큰 글씨 · 그 화면이 묻는 문항의 문면 한 토막.
   */
  const out: {
    name: string; path: string; note: string;
    full?: boolean; who: string; pdf?: boolean;
    expect?: { route: string; heading?: string; itemText?: string };
  }[] = [];
  out.push({
    name: "00_start", path: "/v3/start", who: "starter", full: true,
    note: "검사 시작",
  });
  /* 전공 Core 고르기. **검사 앞에 선다**: 사용자가 CareerMatri 를 기계공학
     검사 한 벌로 읽지 않게 하려는 자리다 */
  out.push({
    name: "00b_cores", path: "/cores", who: "starter", full: true,
    note: "전공 Core 고르기",
  });

  /* 열두 자리를 찍는다. 승인받을 것은 보고서가 아니라 **화면**이고, 화면에
     실제 문항 글이 읽혀야 한다. 그래서 사람 넷을 만들어 각자 끝까지 걸어
     둔 뒤 그 응시의 자리를 가리킨다: 빈 화면을 찍으면 흐름은 보여도 묻는
     것이 안 보인다 */

  /* P01 경험 거의 없는 학부생 · BASIC. 앞쪽 다섯 자리 */
  const p01 = await freshAttempt(shots, "BASIC", "bachelor", null);
  await fillGrid(p01, { TD01: [5, 2, 5], TD05: [4, 1, 4], TD02: [3, 0, 3] });
  const a01 = await walk(p01, shots, "mid");
  out.push({ name: "01_profile", who: "shots", note: "기본 정보",
    ...(await shot(a01, (_id, k) => k === "profile", "기본 정보")) });
  out.push({ name: "02_industry_pick", who: "shots", note: "관심 산업 고르기",
    ...(await shot(a01, (_id, k) => k === "pick-industry", "관심 산업")) });
  out.push({ name: "03_industry_scene", who: "shots", note: "산업 장면",
    ...(await shot(a01, (_id, k) => k === "scene", "산업 장면")) });
  out.push({ name: "04_screening", who: "shots", note: "영역 훑기",
    ...(await shot(a01, (id) => id === "sweep-interest", "영역 훑기 · 관심")) });
  out.push({ name: "04b_screening_exp", who: "shots", note: "영역 훑기 · 경험",
    ...(await shot(a01, (id) => id === "sweep-exposure", "영역 훑기 · 경험")) });
  /* **배우고 싶은 정도를 따로 찍는다**(규격 §19). 관심과 같은 격자를
     쓰지만 다섯 칸의 밝혀 적는 말이 다르다(`1 전혀 배우고 싶지 않음` ~
     `5 매우 배우고 싶음`). 한 장만 찍으면 그 차이를 아무도 안 본다 */
  out.push({ name: "04c_screening_learn", who: "shots", note: "영역 훑기 · 배울 뜻",
    ...(await shot(a01, (id) => id === "sweep-learning", "영역 훑기 · 배울 뜻")) });

  /* P03 캡스톤 학생 · STANDARD */
  const p03 = await freshAttempt(shots, "STANDARD", "bachelor", null);
  await fillGrid(p03, { TD01: [5, 2, 5], TD08: [4, 1, 4], TD02: [4, 1, 3] });
  const a03 = await walk(p03, shots, "mid");
  /* **묶음 전환이 이 화면 안으로 들어왔다**(규격 §12). `t-judge` 전환
     화면을 걷고 첫 질문 위의 맥락 한 줄로 얹었으므로, 찍는 자리도 그
     첫 질문이다. 전에는 두 장이었고 뒤엣것에 읽을 것이 없었다 */
  out.push({ name: "05_core_probe", who: "shots", note: "실제 업무 판단 · 묶음 맥락 한 줄",
    ...(await shot(a03, (id) => /^probe-.+-J3$/.test(id), "실제 업무 판단")) });

  /* P04 구조해석 석사 · PRO. 뒤쪽 자리 전부 */
  const p04 = await freshAttempt(shots, "PRO", "master", "STEM");
  await fillGrid(p04, { TD02: [5, 2, 5], TD01: [5, 2, 4], TD11: [4, 1, 4] });
  const a04 = await walk(p04, shots, "strong");
  out.push({ name: "06_deep_dive", who: "shots", note: "심화 네 축",
    ...(await shot(a04, (id) => /^deep-.+-1$/.test(id), "심화 네 축")) });
  out.push({ name: "06b_grad_branch", who: "shots", note: "대학원 장면",
    ...(await shot(a04, (id) => id === "branch-1", "대학원 장면")) });
  /* **남겨 둔 전환 화면.** 한 경험을 네 화면에 나누어 묻는다는 것은 한
     줄로 줄이면 뜻이 사라진다: 없으면 네 화면에서 서로 다른 경험을
     떠올려 적는다(규격 §12) */
  out.push({ name: "06c_transition", who: "shots", note: "남겨 둔 전환 화면",
    ...(await shot(a04, (id) => id === "t-trans", "경험 번역 안내")) });
  /* **강제 선택 두 화면은 보기가 같다.** 그래서 나란히 찍어, 두 화면이
     서로 다른 것을 묻는다는 것이 글로 읽히는지 눈으로 본다. 이 둘은
     훑기에서 묶인 영역이 있을 때만 서므로 PRO 응시에서 찾는다 */
  out.push({ name: "06c_force_a", who: "shots", note: "강제 선택 · 먼저 해 볼 쪽",
    ...(await shot(a04, (id) => id === "force-CF_PAIR_1", "강제 선택 1")) });
  out.push({ name: "06d_force_b", who: "shots", note: "강제 선택 · 더 알아보고 싶은 쪽",
    ...(await shot(a04, (id) => id === "force-CF_PAIR_2", "강제 선택 2")) });
  out.push({ name: "07_evidence", who: "shots", note: "근거 고르기",
    ...(await shot(a04, (_id, k) => k === "checklist", "근거 고르기")) });
  out.push({ name: "08_role_pick", who: "shots", note: "관심 직무 고르기",
    ...(await shot(a04, (_id, k) => k === "pick-role", "직무 고르기")) });
  out.push({ name: "08b_org_pick", who: "shots", note: "선호 조직 고르기",
    ...(await shot(a04, (_id, k) => k === "pick-org", "조직 고르기")) });
  out.push({ name: "09_role_item", who: "shots", note: "역할 판단 문항",
    ...(await shot(a04, (id) => id.startsWith("role-"), "역할 문항")) });
  out.push({ name: "10_industry_item", who: "shots", note: "산업 판단 문항",
    ...(await shot(a04, (id) => id.startsWith("ind-"), "산업 문항")) });
  out.push({ name: "11_translate", who: "shots", note: "경험 번역",
    ...(await shot(a04, (id) => id.startsWith("trans-"), "경험 번역")) });
  out.push({ name: "12_done", who: "shots", note: "완료 · 제출 전",
    ...(await shot(a04, (_id, k) => k === "done", "완료")) });
  out.push({ name: "13_ownership", who: "shots", note: "소유 보기 넷",
    ...(await shot(a04, (id) => /^probe-.+-J5$/.test(id), "소유 보기 넷")) });

  /* P09 재료 박사 · PRO. 끝까지 제출해 둔다 */
  const p09 = await freshAttempt(shots, "PRO", "phd", "STEM");
  await fillGrid(p09, { TD06: [5, 2, 5], TD07: [5, 2, 4], TD02: [4, 1, 3] });
  const a09 = await walk(p09, shots, "strong");
  await submit(a09);
  /* **낸 뒤의 줄을 다시 읽는다.** 손에 든 객체는 아직 `in_progress` 라,
     그대로 쓰면 완료 화면의 머리글을 제출 전 문장으로 적게 된다 */
  const a09done = (await attemptOf(a09.id, shots)) as V3Attempt;
  out.push({ name: "14_submitted", who: "shots", note: "완료 · 제출 뒤",
    ...(await shot(a09done, (_id, k) => k === "done", "제출 뒤 완료")) });

  /* 학부 기계공학 + 타계열 대학원. **이 경로를 눈으로 본 적이 없다** */
  const px = await freshAttempt(shots, "STANDARD", "master", "HUMANITIES_SOCIAL");
  await setProfile(px.id, "master", "HUMANITIES_SOCIAL", "ME");
  const pxa = (await attemptOf(px.id, shots)) as V3Attempt;
  await fillGrid(pxa, { TD11: [5, 2, 5], TD12: [4, 1, 4], TD01: [3, 1, 3] });
  const ax = await walk(pxa, shots, "mid");
  out.push({ name: "15_xfield", who: "shots", note: "타계열 대학원 · 번역 맥락",
    ...(await shot(ax, (id) => id.startsWith("xfield-"), "타계열 맥락")) });

  /* ── 결과지 다섯 자리. **제출해 둔 응시의 실제 결과다** ──
     굳혀 둔 결과를 읽으므로 빈 쪽이 찍히지 않는다 */
  out.push({ name: "16_result_top", who: "shots", note: "결과 첫 화면", full: true,
    path: `/v3/${a09.id}/result` });
  out.push({ name: "17_result_domains", who: "shots", note: "기술영역 상세",
    path: `/v3/${a09.id}/result#zones` });
  out.push({ name: "18_result_industry", who: "shots", note: "산업 결과",
    path: `/v3/${a09.id}/result#industry` });
  out.push({ name: "19_result_role", who: "shots", note: "직무 결과",
    path: `/v3/${a09.id}/result#role` });
  out.push({ name: "20_result_evidence", who: "shots", note: "Evidence 와 Gap",
    path: `/v3/${a09.id}/result#evidence` });
  out.push({ name: "20b_result_gap", who: "shots", note: "앞으로 채울 것",
    path: `/v3/${a09.id}/result#gaps` });
  out.push({ name: "20c_result_action", who: "shots", note: "다음에 할 일",
    path: `/v3/${a09.id}/result#plan` });
  out.push({ name: "21_result_region", who: "shots", note: "결과의 지역·기관 절",
    path: `/v3/${a09.id}/result#region` });
  out.push({ name: "21b_result_howto", who: "shots", note: "결과를 어떻게 읽을 것인가",
    path: `/v3/${a09.id}/result#howto` });
  /* **결과지는 한 쪽이 길다.** 절 목록은 머리띠에 붙어 있어 아래 결과지
     그림 전부에 찍히고, 지금 보는 절이 켜진 모습은 `17_result_domains`
     에서 보인다. 여기서 따로 찍는 것은 PRO 에만 서는 번역 절과 맨 아래의
     나갈 길이다 */
  out.push({ name: "16b_result_translation", who: "shots", note: "경험 번역 (PRO)",
    path: `/v3/${a09.id}/result#translation` });
  out.push({ name: "21c_result_cta", who: "shots", note: "결과지 맨 아래 · 다음으로",
    path: `/v3/${a09.id}/result#next` });
  /* 종이로 가는 길. **쪽 하나를 그림으로 떠서 같이 본다** */
  out.push({ name: "30_pdf", who: "shots", note: "결과 PDF",
    path: `/v3/${a09.id}/result/pdf`, pdf: true });

  /* ── 내 CareerMatri 여섯 자리 ──
     **검사를 끝낸 사람이 다시 들어오는 자리다.** 여기가 비면 결과 PDF 를
     받은 날 이 서비스가 끝난다 */
  out.push({ name: "22_dashboard", who: "shots", note: "내 CareerMatri", full: true,
    path: "/me" });
  out.push({ name: "23_experience_new", who: "shots", note: "경험 추가", full: true,
    path: "/me/experience/new" });
  out.push({ name: "24_experience_list", who: "shots", note: "적어 둔 경험",
    path: "/me/experience" });
  out.push({ name: "25_gap", who: "shots", note: "Gap 과 할 일", full: true,
    path: "/me/gap" });
  out.push({ name: "26_explore", who: "shots", note: "산업·직무·지역 탐색", full: true,
    path: "/me/explore" });
  out.push({ name: "27_region", who: "shots", note: "지역과 기관", full: true,
    path: "/me/region" });
  out.push({ name: "28_track", who: "shots", note: "CareerMatri Track", full: true,
    path: "/me/track" });
  out.push({ name: "29_jobs", who: "shots", note: "공고 비교 (자료 없음)", full: true,
    path: "/me/jobs" });
  out.push({ name: "29b_apply", who: "shots", note: "직접 지원한 곳", full: true,
    path: "/me/apply" });
  out.push({ name: "29c_recompute", who: "shots", note: "재분석 미리 보기", full: true,
    path: "/me/recompute" });

  console.log(JSON.stringify({
    users: { shots: SHOT_LOGIN, starter: START_LOGIN },
    targets: out,
  }));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
