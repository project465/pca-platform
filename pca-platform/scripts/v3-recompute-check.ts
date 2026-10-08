/**
 * 새 경험이 지금 값에 실제로 들어가는가.
 *
 * **검사가 끝이 아니라는 말을 코드로 확인하는 자리다.** 경험을 적어도
 * 아무것도 달라지지 않으면 `다시 들어올 이유` 가 없고, 그러면 이 제품은
 * 잘 만든 검사 한 벌이다.
 *
 * 묻는 것 일곱이다.
 *
 *   1. 적은 경험이 (영역 · 축) 후보로 묶이는가
 *   2. 근거가 둘 이상이면 확인까지 올라가는가
 *   3. **경험만으로 `직접 결정` 이 서지 않는가** — 보기 넷은 검사에서만 받는다
 *   4. 이미 더 높이 선 축을 내리지 않는가
 *   5. 묶음과 비어 있는 자리가 다시 계산되는가
 *   6. **굳은 결과가 한 글자도 바뀌지 않는가**
 *   7. 두 번 돌려도 같은 자리에 서는가
 *
 *   DATABASE_URL=... npx tsx scripts/v3-recompute-check.ts
 */
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

import { coreFile } from "../src/lib/me-v3/core-registry";
import { query, queryOne } from "../src/lib/db";
import {
  addExperience, experiencesOf, latestResult, removeExperience,
} from "../src/lib/me-v3/platform";
import { applyRecompute, previewRecompute } from "../src/lib/me-v3/recompute";
import { stable } from "../src/lib/me-v3/scoring/fixtures";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

type Lists = { domains: Record<string, Record<string, { text: string }[]>> };
type Doms = { domains: { code: string; artifacts: string[]; verify_targets: string[] }[] };

async function main(): Promise<void> {
  const row = await queryOne<{ id: string }>(
    /* 스냅샷은 응시에 달려 있고 사람은 응시에 달려 있다. **스냅샷에
       사람 칸이 없다**: 한 다리를 건너야 한다 */
    `SELECT a.user_id::text AS id FROM v3_snapshots s
       JOIN v3_attempts a ON a.id = s.attempt_id
      ORDER BY s.id DESC LIMIT 1`);
  if (!row) {
    console.log("  못 봄  굳은 결과가 있는 사람이 없습니다. 먼저 `npm run v3:runtime` 을 돌리십시오.");
    process.exit(0);
  }
  const uid = row.id;
  const before = await latestResult(uid);
  if (!before) { console.log("  못 봄  결과 모델이 없습니다."); process.exit(0); }
  const beforePrint = stable(before);

  const lists = coreFile<Lists>("ME_CORE_V3", "checklists");
  const doms = coreFile<Doms>("ME_CORE_V3", "domains");

  /* **아직 아무것도 확인되지 않은 영역**에 적는다. 이미 선 영역에 적으면
     올라간 것이 경험 덕인지 검사 덕인지 갈리지 않는다 */
  const blank = before.domains.find((d) => d.axes.every((a) => a.state === "NOT_OBSERVED"));
  /* 그리고 **이미 높이 선 축**을 하나 골라 내려가지 않는지 본다 */
  const high = before.domains.find((d) => d.owned.length > 0);
  const td = blank?.code ?? before.domains[0].code;
  const dd = doms.domains.find((x) => x.code === td);

  const made: string[] = [];
  const add = async (target: string, picks: number) => {
    const L = lists.domains[target] ?? {};
    const d2 = doms.domains.find((x) => x.code === target);
    const id = await addExperience(uid, {
      kind: "capstone", title: `재분석 확인 ${target}`,
      td_codes: [target],
      problems: (L.J1 ?? []).slice(0, picks).map((x) => x.text),
      decisions: (L.J3 ?? []).slice(0, picks).map((x) => x.text),
      artifacts: (d2?.artifacts ?? []).slice(0, 1),
      verifications: (d2?.verify_targets ?? []).slice(0, 1),
      used_where: ["팀이나 다음 사람이 이어받았다"],
    });
    made.push(id);
    return id;
  };

  try {
    await add(td, 2);
    if (high) await add(high.code, 2);

    const plan = await previewRecompute(uid);

    ok("적은 경험이 판단축 후보로 묶인다", plan.candidates.length > 0,
       `후보 ${plan.candidates.length}칸 · 올라가는 축 ${plan.moved.length}개`);

    const mine = plan.candidates.filter((c) => c.domain === td);
    const confirmed = mine.filter((c) => c.after === "CONFIRMED");
    ok("근거가 둘이면 확인까지 올라간다", confirmed.length > 0,
       confirmed.map((c) => `${c.domain}.${c.axis}`).join(" ") || "0칸");

    const owned = plan.candidates.filter((c) => c.after === "OWNED" && c.before !== "OWNED");
    ok("경험만으로 `직접 결정` 이 서지 않는다", owned.length === 0,
       owned.length ? owned.map((c) => `${c.domain}.${c.axis}`).join(" ")
         : "보기 넷은 검사에서만 받는다");

    const RANK = { NOT_OBSERVED: 0, PARTICIPATED: 1, CONFIRMED: 2, OWNED: 3 } as const;
    const down = plan.candidates.filter((c) => RANK[c.after] < RANK[c.before]);
    ok("이미 더 높이 선 축을 내리지 않는다", down.length === 0,
       down.length ? down.map((c) => `${c.domain}.${c.axis}`).join(" ")
         : `대조한 칸 ${plan.candidates.length}개`);

    await applyRecompute(uid);
    const prof = await queryOne<{ levels: string; zones: string; gaps: string; at: string }>(
      `SELECT axis_levels::text AS levels, zones::text AS zones, gaps::text AS gaps,
              recomputed_at::text AS at
         FROM career_profiles WHERE user_id=$1`, [uid]);
    const levels = JSON.parse(prof?.levels ?? "{}") as Record<string, unknown>;
    ok("지금 값에 축 수준과 묶음이 적힌다",
       Object.keys(levels).length > 0 && (prof?.zones ?? "{}") !== "{}",
       `영역 ${Object.keys(levels).length}곳 · ${prof?.at?.slice(0, 16) ?? ""}`);

    const after = await latestResult(uid);
    ok("굳은 결과가 한 글자도 바뀌지 않는다", stable(after) === beforePrint,
       `확인된 축 ${after?.overview.counts.confirmed_axes} (전 ${before.overview.counts.confirmed_axes})`);

    /* 두 번 돌려도 같은 자리. 운영에서는 사람이 여러 번 누른다 */
    const again = await previewRecompute(uid);
    await applyRecompute(uid);
    const twice = await previewRecompute(uid);
    ok("두 번 돌려도 같은 자리에 선다",
       stable(again.candidates) === stable(twice.candidates),
       `후보 ${twice.candidates.length}칸`);
  } finally {
    for (const id of made) await removeExperience(uid, id).catch(() => undefined);
    const left = await experiencesOf(uid);
    console.log(`\n  치웠다  적어 둔 경험 ${left.length}개 남음`);
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  await query("SELECT 1");
  process.exit(fail ? 1 : 0);
}

void main();
