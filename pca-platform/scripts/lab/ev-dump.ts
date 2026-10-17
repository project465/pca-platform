import { loadEnv } from "../_loop-fixture";
loadEnv();
import { queryOne } from "../../src/lib/db";
async function main() {
  const att = Number(process.env.ATT ?? 10122);
  const row = await queryOne<{ result_model: any; core_code: string }>(
    `select s.result_model, a.core_code from v3_snapshots s join v3_attempts a on a.id = s.attempt_id
     where s.attempt_id=$1 order by s.id desc limit 1`, [att]);
  const m = row!.result_model;
  const codes = [...new Set((m.evidence.ready as any[]).map((e) => e.domain))].slice(0, 2);
  for (const c of codes) {
    const d = m.domains.find((x: any) => x.code === c);
    console.log("=== ", c, d.name);
    for (const k of ["did", "decided", "artifacts", "verifications", "confirmed", "owned"]) {
      console.log(`  ${k.padEnd(14)}`, JSON.stringify(d[k]));
    }
  }
}
main().then(() => process.exit(0));
