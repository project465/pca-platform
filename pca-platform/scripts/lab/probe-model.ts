import { loadEnv } from "../_loop-fixture";
loadEnv();
import { queryOne, query } from "../../src/lib/db";
(async () => {
  const rows = await query<Record<string, unknown>>(
    `SELECT a.id, a.core_code, a.tier, a.university_code, a.department_code
       FROM v3_snapshots y JOIN v3_attempts a ON a.id=y.attempt_id
      WHERE a.core_code='BIZ_CORE_V1' ORDER BY y.id DESC LIMIT 12`, []);
  console.log(rows);
  const r = await queryOne<{ k: string }>(
    `SELECT jsonb_pretty(jsonb_object_agg(k, jsonb_typeof(v))) AS k
       FROM v3_snapshots y, jsonb_each(y.result_model) AS e(k,v)
      WHERE y.attempt_id=$1::bigint`, [process.env.ATT ?? "9715"]);
  console.log(r?.k);
})();
