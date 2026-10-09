/**
 * 작업공간을 찍기 전에 **쓸 만한 상태를 실제로 만든다.**
 *
 * 빈 작업공간을 찍으면 그림 열두 장이 전부 `아직 없습니다` 다. 그것은
 * 상태 하나이고, 나머지 다섯 상태는 그렇게는 볼 수 없다. 그래서 결과지
 * 찍을 때 쓰는 준비를 그대로 부르고(응시 셋이 끝난 자리까지), 그 위에
 * 경험 한 줄과 할 일과 반영까지 얹는다.
 *
 * 사람이 둘이다. 응시를 끝내고 경험까지 반영한 사람(결과지 준비가 쓰는
 * 계정을 그대로 쓴다)과 **아직 한 번도 응시하지 않은 사람.** 빈 상태가
 * 상태 가운데 하나라 안 찍으면 그 다섯 쪽이 어떻게 서는지 아무도 모른다.
 *
 * **뒤엣사람을 여기서 만든다.** 전에는 시드의 학번 계정(`2021001234`)을
 * 빌려 썼는데 그 계정은 첫 로그인 비밀번호 변경이 걸려 있어서, 어느
 * 주소를 열어도 `비밀번호를 정해주세요` 로 떨어졌다. 그 화면은 200 이고
 * 내부 코드도 가로 스크롤도 없어서 **일곱 자리 스물한 장이 전부 그
 * 화면으로 찍히고도 검사를 통과했다.**
 *
 * **비밀번호는 그 자리에서 만들어 표준출력으로 넘긴다.** 저장소에 적지
 * 않고 해시만 DB 에 남는다.
 *
 *   npx tsx scripts/workspace-prep.ts      # 자리 목록을 JSON 으로
 */
import { execFileSync } from "node:child_process";
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
/* `addExperience` 가 다시 계산할 일을 스스로 쌓는다. **여기서 한 줄 더
   쌓지 않는다**: 표의 `kind` 가 정해진 목록이고, 거기 없는 이름을 적으면
   그 자리에서 거절된다 */
import {
  addExperience, importActions, latestResult,
} from "../src/lib/me-v3/platform";
import { applyRecompute } from "../src/lib/me-v3/recompute";
import { domainName } from "../src/lib/me-v3/runtime/session";
import { actionKo } from "../src/lib/me-v3/result/text.ko";

if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error("운영에서는 돌리지 않습니다.");
  process.exit(2);
}

/**
 * 자리마다 **그 화면이라는 증거**를 같이 적는다.
 *
 *   route    떨어져야 하는 주소
 *   heading  서야 하는 큰 글씨
 *   must     그 쪽에만 있는 글귀 (가르는 신호)
 *
 * 셋째가 가장 중요하다. 주소와 머리글만 맞추면 **떨어지는 자리**가 그대로
 * 통과한다: 비밀번호 변경 화면은 주소가 다르니 ① 에서 걸리지만, 비슷한
 * 두 쪽을 바꿔 찍으면 ①② 만으로는 안 걸린다.
 */
type Shot = {
  name: string; path: string; note: string; full?: boolean;
  heading: string; must: string[];
};

/** 작업공간 쪽. **띠의 줄과 같은 차례로 찍는다** */
const PATHS: Shot[] = [
  { name: "w01_cores", path: "/cores", note: "전공 Core 고르기", full: true,
    heading: "전공을 선택해주세요", must: ["검사는 시작점입니다", "준비 중인 전공"] },
  { name: "w02_home", path: "/me", note: "작업공간 홈 · 경험까지 반영한 상태", full: true,
    heading: "내 커리어", must: ["지금 상태", "다음 한 가지", "최근 변화"] },
  { name: "w03_results", path: "/me/results", note: "결과 기록 · 굳은 값과 지금 값",
    full: true, heading: "검사 당시 결과와 지금 상태", must: ["지금 상태"] },
  { name: "w04_state", path: "/me/state", note: "지금 상태 · 근거와 비어 있는 자리",
    full: true, heading: "지금 설명할 수 있는 것과 비어 있는 자리",
    must: ["설명할 수 있는 경험"] },
  { name: "w05_state_gaps", path: "/me/state#gaps", note: "비어 있는 자리",
    heading: "지금 설명할 수 있는 것과 비어 있는 자리",
    must: ["설명할 수 있는 경험"] },
  { name: "w06_next", path: "/me/next", note: "다음 할 일 · 할 수 있는 때로 묶음",
    full: true, heading: "지금 남은 일", must: ["지금 할 일"] },
  { name: "w07_experience", path: "/me/experience", note: "내 경험", full: true,
    heading: "적어 둔 경험", must: ["전동 스쿠터 프레임 경량화 캡스톤"] },
  { name: "w08_experience_new", path: "/me/experience/new", note: "경험 추가",
    full: true, heading: "새로 겪은 일을 적습니다", must: ["어느 판단에 걸리나요"] },
  { name: "w09_recompute", path: "/me/recompute", note: "새 경험 반영하기",
    full: true, heading: "적어 두신 경험이 어디로 가는지", must: [] },
  { name: "w10_explore", path: "/me/explore", note: "산업과 직무", full: true,
    heading: "산업과 직무와 지역", must: [] },
  { name: "w11_region", path: "/me/region", note: "지역과 기관", full: true,
    heading: "어디에서 일하고 싶은지", must: [] },
  { name: "w12_apply", path: "/me/apply", note: "지원한 곳", full: true,
    heading: "직접 지원하신 곳", must: ["어떤 직무로"] },
  { name: "w13_track", path: "/me/track", note: "Track", full: true,
    /* 아직 없는 기능 목록을 걷었다(규격 §22). 이 쪽이 적는 것은 한
       문장과 지금 되는 자리 둘이다 */
    heading: "상황이 바뀔 때 다시 계산해 주는 자리", must: ["지원 기록"] },
  { name: "w14_jobs", path: "/me/jobs", note: "Track · 공고", full: true,
    heading: "공고", must: [] },
];

/**
 * 계정 영역과 **검사 전 상태.**
 *
 * 두 사람으로 찍는 까닭. 한 사람에게는 검사 전과 검사 뒤가 같이 있을 수
 * 없고, **빈 상태가 상태 가운데 하나**라 안 찍으면 그 다섯 쪽이 어떻게
 * 서는지 아무도 모른다.
 */
const ACCOUNT: Shot[] = [
  { name: "w15_account", path: "/my", note: "계정 · 작업공간으로 돌아가는 길",
    full: true, heading: "", must: ["로그인 방법"] },
  { name: "w16_account_old", path: "/my/results", note: "옛 검사 결과 · 맨 위에 안내",
    full: true, heading: "", must: [] },
  { name: "w18_empty_home", path: "/me", note: "검사 전 · 받는 것 셋만", full: true,
    heading: "기계공학 진로 검사",
    must: ["무엇을 해 봤는지", "적성이나 성격은 묻지 않습니다"] },
  { name: "w19_empty_state", path: "/me/state", note: "검사 전 · 지금 상태",
    full: true, heading: "아직 볼 것이 없습니다", must: ["완료한 검사가 없습니다"] },
  { name: "w20_empty_next", path: "/me/next", note: "검사 전 · 다음 할 일",
    full: true, heading: "무엇부터 할지", must: ["아직 완료한 검사가 없습니다"] },
  { name: "w21_empty_results", path: "/me/results", note: "검사 전 · 결과 기록",
    full: true, heading: "검사 당시 결과와 지금 상태",
    must: ["아직 완료한 검사가 없습니다"] },
  { name: "w22_empty_experience", path: "/me/experience", note: "검사 전 · 내 경험",
    full: true, heading: "적어 둔 경험", must: ["아직 적어 둔 경험이 없습니다"] },
];

/**
 * 아직 응시하지 않은 사람을 **그 자리에서 만든다.**
 *
 * `must_reset_pw` 를 반드시 `FALSE` 로 둔다. `true` 면 어느 주소를 열어도
 * 비밀번호 변경 화면으로 떨어지고, 그 화면은 200 이라 찍는 쪽에서 통과로
 * 세어진다 — 실제로 일곱 자리가 그렇게 찍혀 있었다.
 */
async function ensureEmptyStudent(
  login: string,
): Promise<{ id: string; uid: string; pw: string }> {
  const pw = randomBytes(18).toString("base64url");
  const hash = await hashPassword(pw);
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1 OR lower(email) = lower($1)`,
    [login]);
  if (old) {
    /* 지난번에 눌러 둔 것이 남아 있으면 `검사 전` 이 아니게 된다 */
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [old.id]);
    await query(`DELETE FROM v3_experiences WHERE user_id = $1`, [old.id]);
    await query(`DELETE FROM v3_actions WHERE user_id = $1`, [old.id]);
    await query(`DELETE FROM career_events WHERE user_id = $1`, [old.id]);
    await query(`DELETE FROM career_profiles WHERE user_id = $1`, [old.id]);
    await query(
      `UPDATE users SET password_hash = $2, must_reset_pw = FALSE,
              status = 'active', is_demo = TRUE WHERE id = $1`,
      [old.id, hash]);
    return { id: login, uid: old.id, pw };
  }
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, is_demo, must_reset_pw)
     VALUES ($1,$1,'이신입',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
    [login, hash]);
  if (!row) throw new Error(`계정을 만들지 못했습니다: ${login}`);
  return { id: login, uid: row.id, pw };
}

/** 자리 하나가 통과하려면 맞아야 하는 것 */
function shape(t: Shot): { route: string; heading?: string; must: string[] } {
  return {
    route: t.path.split("#")[0],
    heading: t.heading || undefined,
    must: t.must,
  };
}

async function main(): Promise<void> {
  /* 응시 셋을 끝낸 자리까지는 결과지 준비가 만든다. **같은 일을 두 벌
     적지 않는다**: 저기를 고친 날 이쪽이 조용히 옛 응시를 찍는다 */
  const prep = JSON.parse(execFileSync(
    "npx", ["tsx", "scripts/v3-result-prep.ts"], { encoding: "utf8" },
  )) as { users: { shots: { id: string; pw: string } } };
  const work = prep.users.shots;
  const row = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1 OR lower(email) = lower($1)`,
    [work.id]);
  if (!row) throw new Error(`계정이 없습니다: ${work.id}`);
  const uid = row.id;

  /* 아직 응시하지 않은 사람. **빈 상태도 상태 가운데 하나다** */
  const empty = await ensureEmptyStudent("cmshots-new@example.com");

  /* 쌓인 것을 치우고 다시 만든다. 지난번에 찍을 때 눌러 둔 상태가 남아
     있으면 그림이 그 사람의 기록이 아닌 것을 보여 준다 */
  await query(`DELETE FROM v3_actions WHERE user_id = $1`, [uid]);
  await query(`DELETE FROM v3_experiences WHERE user_id = $1`, [uid]);
  await query(`DELETE FROM career_events WHERE user_id = $1`, [uid]);

  /* 할 일은 결과지가 낸 것을 그대로 옮긴다. 문장을 여기서 짓지 않는다 */
  const result = await latestResult(uid);
  if (result) {
    const H = { NOW: 30, NEXT: 90, LATER: 365 } as const;
    await importActions(uid, result.actions.map((a) => ({
      td: a.domain, axis: a.axis,
      body: actionKo(a, a.domain ? domainName(a.domain) : "", result.stage).do,
      horizon: H[a.horizon],
    })));
    /* 한 줄은 끝낸 것으로 둔다. **끝낸 일 접는 자리**가 그림에 서야 한다 */
    await query(
      `UPDATE v3_actions SET state='done', done_at=now()
        WHERE id = (SELECT id FROM v3_actions WHERE user_id=$1
                     ORDER BY horizon DESC LIMIT 1)`, [uid]);
  }

  /* 경험 한 줄. 고르는 칸만 채운다 */
  const td = result?.domains[0]?.code ?? "TD01";
  await addExperience(uid, {
    kind: "capstone",
    title: "전동 스쿠터 프레임 경량화 캡스톤",
    started_on: "2025-03", ended_on: "2025-06",
    td_codes: [td], axis_codes: ["J2", "J5", "J6"],
    problems: ["하중 조건을 직접 세웠다"],
    decisions: ["구속 조건과 하중 작용점을 직접 정했다"],
    artifacts: ["해석 보고서"],
    verifications: ["시험값과 대조했다"],
    used_where: ["수업이나 과제 평가에 들어갔다"],
  });
  /* 반영까지 눌러 둔다. **지금 값이 굳은 값과 갈린 상태**를 찍는다 */
  await applyRecompute(uid);

  /* 자리마다 **그 화면이라는 증거**를 같이 넘긴다. 찍는 쪽이 그림을
     남기기 전에 대조하고, 안 맞으면 그 자리에서 걸린다 */
  const targets = [
    ...PATHS.map((t) => ({ ...t, who: "work", expect: shape(t) })),
    ...ACCOUNT.map((t) => ({ ...t, who: "account", expect: shape(t) })),
  ];
  console.log(JSON.stringify({
    /* **비밀번호를 파일에 적지 않는다.** 이 줄은 찍는 쪽으로 바로
       흘러가는 표준출력이고 저장소에 남지 않는다 */
    users: { work, account: { id: empty.id, pw: empty.pw } },
    targets,
  }));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
