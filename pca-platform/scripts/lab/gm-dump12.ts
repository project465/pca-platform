/** R6 준비: 세 사례의 Report3 · Ed8 를 JSON 으로 떠 둔다(var/r6/). 저장소에 넣지 않는다. */
import { mkdirSync, writeFileSync } from "node:fs";
import { queryOne, query } from "../../src/lib/db";
import { coreOf, type ResultModel } from "../../src/lib/me-v3/result/model";
import { resultMeta } from "../../src/lib/me-v3/result/meta";
import { experiencesOf } from "../../src/lib/me-v3/platform";
import { build3 } from "../../src/lib/me-v3/report-gm/report3";
import { edit8 } from "../../src/lib/me-v3/report-gm/editorial8";
import type { OrgSet2 } from "../../src/lib/me-v3/report-gm/companies";
const EMPTY: OrgSet2 = { schema: "none", checked_on: "", status: "EXCLUDED", note: "", region_facts: [], orgs: [] };
(async () => {
  mkdirSync("var/r6", { recursive: true });
  for (const [tag, id] of [["RICH", "1"], ["POOR", "2"], ["CONTRA", "3"]]) {
    const row = await queryOne<{ result_model: ResultModel; tier: string; user_id: string }>(
      `SELECT s.result_model, a.tier, a.user_id::text FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id WHERE s.attempt_id = $1 ORDER BY s.created_at DESC LIMIT 1`, [id]);
    const core = coreOf(row!.result_model);
    const meta = await resultMeta(id, core);
    const exps = await experiencesOf(row!.user_id, core);
    const r = build3(row!.result_model, { ...meta, tier: row!.tier }, exps, EMPTY);
    const e = edit8(r);
    const resp = await query(`SELECT item_id, value, note_text IS NOT NULL AS has_note, answered_at FROM v3_responses WHERE attempt_id = $1 ORDER BY answered_at`, [id]).catch((x) => String(x));
    const picks = await query(`SELECT * FROM v3_evidence_picks WHERE attempt_id = $1`, [id]).catch((x) => String(x));
    writeFileSync(`var/r6/${tag}.json`, JSON.stringify({ r, e, model: row!.result_model, exps, resp, picks }, null, 1));
    console.log(tag, Object.keys(r), Object.keys(e));
  }
  process.exit(0);
})();
