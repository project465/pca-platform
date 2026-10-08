/**
 * 보존 기한이 지난 준식별자를 지운다.
 *
 * **지우는 일을 사람 손에 맡기지 않는다.** `90일 뒤에 지우기로 했다` 는
 * 문서에만 남고, 그 사이에 파일럿이 끝나고 담당이 바뀌고 표는 그대로
 * 남는다. 지우는 코드가 있어야 지운다.
 *
 * 지우는 것은 둘이다 — 전공명과 가고 싶은 쪽(자유입력), 그리고 의견의
 * 자유입력. **척도 응답과 응시 기록은 남긴다**: 그 둘로는 사람이 좁혀지지
 * 않고, 결과를 되짚는 근거이기 때문이다.
 *
 *   npx tsx scripts/v3-pilot-purge.ts            # 무엇이 지워질지만 본다
 *   PURGE=yes npx tsx scripts/v3-pilot-purge.ts  # 실제로 지운다
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

import { query } from "../src/lib/db";

async function main() {
  const due = await query<{ id: string; code: string; purge_after: string }>(
    `SELECT id::text, code, purge_after::text
       FROM v3_pilot_participants
      WHERE purged_at IS NULL
        AND purge_after <= CURRENT_DATE
        AND (major_name IS NOT NULL OR career_interest IS NOT NULL)
      ORDER BY purge_after`);

  if (!due.length) {
    console.log("  지울 것이 없습니다.");
    return;
  }
  console.log(`  기한이 지난 참가자 ${due.length}명`);
  for (const d of due) console.log(`    ${d.code} · ${d.purge_after}`);

  const texts = await query<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM v3_pilot_feedback f
       JOIN v3_attempts a ON a.id = f.attempt_id
      WHERE f.text IS NOT NULL
        AND a.user_id IN (SELECT user_id FROM v3_pilot_participants WHERE id = ANY($1::bigint[]))`,
    [due.map((d) => d.id)]);
  console.log(`  함께 지울 자유입력 ${texts[0]?.n ?? 0}줄`);

  if (process.env.PURGE !== "yes") {
    console.log("\n  실제로 지우려면 `PURGE=yes` 를 붙여 다시 돌리세요.");
    return;
  }

  const ids = due.map((d) => d.id);
  await query(
    `UPDATE v3_pilot_feedback f
        SET text = NULL
       FROM v3_attempts a
      WHERE a.id = f.attempt_id
        AND f.text IS NOT NULL
        AND a.user_id IN (SELECT user_id FROM v3_pilot_participants WHERE id = ANY($1::bigint[]))`,
    [ids]);
  await query(
    `UPDATE v3_pilot_participants
        SET major_name = NULL, career_interest = NULL, purged_at = now()
      WHERE id = ANY($1::bigint[])`,
    [ids]);
  console.log(`\n  지웠습니다 — 참가자 ${ids.length}명. 가명과 척도 응답은 남습니다.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
