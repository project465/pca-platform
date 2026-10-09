/**
 * 작업공간을 찍기 전에 **쓸 만한 상태를 실제로 만든다.**
 *
 * 빈 작업공간을 찍으면 그림 열두 장이 전부 `아직 없습니다` 다. 그것은
 * 상태 하나이고, 나머지 다섯 상태는 그렇게는 볼 수 없다. 그래서 결과지
 * 찍을 때 쓰는 준비를 그대로 부르고(응시 셋이 끝난 자리까지), 그 위에
 * 경험 한 줄과 할 일과 반영까지 얹는다.
 *
 * **새 사람을 만들지 않는다.** 결과지 준비가 쓰는 계정을 그대로 쓴다:
 * 응시와 경험과 할 일이 한 사람에게 쌓여야 작업공간이 일을 한다.
 *
 * **비밀번호를 여기 적지 않는다.** 로그인은 찍는 쪽이 전부터 들고 있는
 * 자리에서 가져온다.
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

import { query, queryOne } from "../src/lib/db";
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

/** 작업공간 쪽. **띠의 줄과 같은 차례로 찍는다** */
const PATHS: [string, string, string, boolean?][] = [
  ["w01_cores", "/cores", "전공 Core 고르기", true],
  ["w02_home", "/me", "작업공간 홈 · 경험까지 반영한 상태", true],
  ["w03_results", "/me/results", "결과 기록 · 굳은 값과 지금 값", true],
  ["w04_state", "/me/state", "지금 상태 · 근거와 비어 있는 자리", true],
  ["w05_state_gaps", "/me/state#gaps", "비어 있는 자리"],
  ["w06_next", "/me/next", "다음 할 일 · 할 수 있는 때로 묶음", true],
  ["w07_experience", "/me/experience", "내 경험", true],
  ["w08_experience_new", "/me/experience/new", "경험 추가", true],
  ["w09_recompute", "/me/recompute", "새 경험 반영하기", true],
  ["w10_explore", "/me/explore", "산업과 직무", true],
  ["w11_region", "/me/region", "지역과 기관", true],
  ["w12_apply", "/me/apply", "지원한 곳", true],
  ["w13_track", "/me/track", "Track", true],
  ["w14_jobs", "/me/jobs", "Track · 공고", true],
];

/**
 * 계정 영역과 **검사 전 상태.**
 *
 * 두 사람으로 찍는 까닭. 한 사람에게는 검사 전과 검사 뒤가 같이 있을 수
 * 없고, **빈 상태가 상태 가운데 하나**라 안 찍으면 그 다섯 쪽이 어떻게
 * 서는지 아무도 모른다. 그리고 계정 영역은 학생 계정으로만 열린다.
 */
const ACCOUNT: [string, string, string, boolean?][] = [
  ["w15_account", "/my", "계정 · 작업공간으로 돌아가는 길", true],
  ["w16_account_old", "/my/results", "옛 검사 결과 · 맨 위에 안내", true],
  ["w18_empty_home", "/me", "검사 전 · 받는 것 셋만", true],
  ["w19_empty_state", "/me/state", "검사 전 · 지금 상태", true],
  ["w20_empty_next", "/me/next", "검사 전 · 다음 할 일", true],
  ["w21_empty_results", "/me/results", "검사 전 · 결과 기록", true],
  ["w22_empty_experience", "/me/experience", "검사 전 · 내 경험", true],
];

async function userId(login: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [login]);
  if (!r) throw new Error(`계정이 없습니다: ${login}`);
  return r.id;
}

async function main(): Promise<void> {
  /* 응시 셋을 끝낸 자리까지는 결과지 준비가 만든다. **같은 일을 두 벌
     적지 않는다**: 저기를 고친 날 이쪽이 조용히 옛 응시를 찍는다 */
  const prep = JSON.parse(execFileSync(
    "npx", ["tsx", "scripts/v3-result-prep.ts"], { encoding: "utf8" },
  )) as { users: Record<string, string> };
  const login = prep.users.shots;
  const uid = await userId(login);

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

  const targets = [
    ...PATHS.map(([name, path, note, full]) => ({ name, path, note, who: "work", full })),
    ...ACCOUNT.map(([name, path, note, full]) => ({ name, path, note, who: "account", full })),
  ];
  console.log(JSON.stringify({
    users: { work: login, account: "2021001234" },
    targets,
  }));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
