/** 응시 하나의 계획(화면마다 묻는 문항)과 실제 저장된 답을 대조한다. ATT=45 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { queryOne, query } from "../../src/lib/db";
import { planFor, type V3Attempt } from "../../src/lib/me-v3/runtime/session";
async function main() {
  const att = process.env.ATT ?? "45";
  const a = (await queryOne<V3Attempt>(`SELECT * FROM v3_attempts WHERE id = $1`, [att]))!;
  const plan = await planFor(a);
  const planned: { item: string; screen: string; kind: string }[] = [];
  for (const sc of plan.screens) for (const it of sc.items) planned.push({ item: it, screen: sc.id, kind: sc.kind });
  const stored = new Set((await query<{ item_id: string }>(`SELECT item_id FROM v3_responses WHERE attempt_id = $1`, [att])).map((r) => r.item_id));
  const uniq = new Set(planned.map((p) => p.item));
  console.log(`계획 화면 ${plan.screens.length} · 계획 문항(중복 제외) ${uniq.size} · 저장 ${stored.size}`);
  const missing = planned.filter((p) => !stored.has(p.item));
  console.log("계획에 있고 저장 안 됨:", JSON.stringify(missing));
  const extra = [...stored].filter((s) => !uniq.has(s));
  console.log("저장됐고 계획에 없음:", extra);
  const kinds: Record<string, number> = {};
  for (const sc of plan.screens) kinds[sc.kind] = (kinds[sc.kind] ?? 0) + sc.items.length;
  console.log("화면 종류별 문항 수:", kinds);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
