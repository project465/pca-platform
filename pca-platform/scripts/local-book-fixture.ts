/* 로컬 점검용(운영 · 미리보기 DB 에 쓰지 않는다): 지어낸 응시자 한 명을 엔진에 돌려 굳은 결과 한 벌을 로컬 DB 에 세운다. CORE= UNI= PERSONA= npx tsx scripts/local-book-fixture.ts */
import { readFileSync } from "node:fs";
import { core as coreEntry } from "../src/lib/me-v3/core-registry";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { expand, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../src/lib/me-v3/result/build";
import { industryChoices, roleChoices } from "../src/lib/me-v3/runtime/session";
import { RESULT_MODEL_VERSION } from "../src/lib/me-v3/result/version";
import { queryOne } from "../src/lib/db";
async function main() {
  const core = process.env.CORE ?? "BIZ_CORE_V1";
  const uni = process.env.UNI ?? "PCU";
  const fx = JSON.parse(readFileSync(coreEntry(core).fixtures!.personas!, "utf8")) as { personas: Fixture[]; cases?: { pack?: { industry?: string; role?: string } } };
  const f = fx.personas.find((p) => p.id === (process.env.PERSONA ?? fx.personas[0].id))!;
  const person: Fixture = { ...f, industry: f.industry ?? fx.cases?.pack?.industry ?? null, role: f.role ?? fx.cases?.pack?.role ?? null };
  const loaded = load(core);
  const snapshot = score(expand(person, core), loaded);
  const model = buildResult(snapshot, loaded, { packs: { industries: industryChoices(core).map((x) => x.code), roles: roleChoices(core).map((x) => x.code) } });
  const u = (await queryOne<{ id: string }>(`INSERT INTO users (email, display_name, password_hash) VALUES ($1,'시험 학생','x') RETURNING id::text`, [`fx-${Date.now()}@example.invalid`]))!.id;
  const a = (await queryOne<{ id: string }>(`INSERT INTO v3_attempts (user_id, tier, core_code, education_stage, item_bank_version, scoring_version, status, university_code) VALUES ($1,$2,$3,'bachelor','x','x','scored',$4) RETURNING id::text`, [u, model.tier, core, uni]))!.id;
  await queryOne(`INSERT INTO v3_snapshots (attempt_id, module_versions, response_quality, payload, result_model, result_model_version, result_copy_version) VALUES ($1,'{}',$2,$3,$4,$5,'x') RETURNING id`, [a, snapshot.response_quality.flag, JSON.stringify(snapshot), JSON.stringify(model), RESULT_MODEL_VERSION]);
  console.log(`attempt=${a} user=${u} persona=${f.id} tier=${model.tier} roles=${model.targets.roles.join(",")} goal=${JSON.stringify(model.targets.goal)?.slice(0, 120)}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
