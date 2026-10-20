import { loadEnv } from "../_loop-fixture";
loadEnv();
import { writeFileSync } from "node:fs";
import { queryOne } from "../../src/lib/db";
import { coreOf, type ResultModel } from "../../src/lib/me-v3/result/model";
import { resultMeta } from "../../src/lib/me-v3/result/meta";
import { experiencesOf } from "../../src/lib/me-v3/platform";
import { build } from "../../src/lib/me-v3/report-gm/report2";
export async function load(id: string) {
  const row = await queryOne<{ result_model: ResultModel; tier: string; user_id: string }>(
    `SELECT s.result_model, a.tier, a.user_id::text FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
      WHERE s.attempt_id = $1 ORDER BY s.created_at DESC LIMIT 1`, [id]);
  if (!row) throw new Error(`${id}: 굳은 결과가 없다`);
  const core = coreOf(row.result_model);
  const meta = await resultMeta(id, core);
  const exps = await experiencesOf(row.user_id, core);
  return build(row.result_model, { ...meta, tier: row.tier }, exps);
}
if (process.argv[1]?.endsWith("gm-dump2.ts") && !process.env.NO_MAIN) (async () => {
  for (const [tag, id] of (process.env.CASES ?? "RICH:462,POOR:463,CONTRA:464").split(",").map((x) => x.split(":"))) {
    const r = await load(id);
    writeFileSync(`var/pdf-gm/${tag}.r2.json`, JSON.stringify(r, null, 1));
    console.log(tag, "opinion:", r.opinion.length, "str", r.strengths.map((s) => s.name), "pr", r.priorities.map((p) => p.domain + "/" + p.what), "dir", r.directions.map((d) => d.name + ":" + d.readiness),
      "deep", r.explore.deep.map((e) => e.org.name), "groups", r.explore.groups.map((g) => g.region + g.items.length), "cross", r.cross.domains.map((c) => c.name + c.kind));
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
