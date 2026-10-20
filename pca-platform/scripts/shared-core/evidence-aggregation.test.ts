/**
 * Track D — Evidence 집계의 뜻을 코드로 확인한다 (R37 §5 요청 2).
 *
 * 배재대 Gold Master 세션이 물은 것: `v3_evidence_picks` 27 행인데 결과 모델의
 * `did` 는 26. 빠진 한 줄은 VERIFY 이고 `verifications` 에는 있다.
 *
 * **엔진을 고치지 않는다.** 실제 `score` · `buildResult` 를 부르고 무엇이 어느
 * 목록에 들어가는지 센다. DB 없이 돈다.
 *
 * 근거의 안정 열쇠는 DB PK 와 같은 (domain_code, slot, item_text) 다.
 * slot: J1~J8(판단 체크리스트) · ARTIFACT · VERIFY.
 *
 *   node --no-warnings --experimental-strip-types \
 *     --import ./scripts/shared-core/test/register.mjs \
 *     --test scripts/shared-core/evidence-aggregation.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { coreFile } from "@/lib/me-v3/core-registry";
import { load, score } from "@/lib/me-v3/scoring/engine";
import { expand, type Fixture } from "@/lib/me-v3/scoring/fixtures";
import { buildResult } from "@/lib/me-v3/result/build";
import type { Snapshot, Submission } from "@/lib/me-v3/scoring/types";
import type { ResultModel } from "@/lib/me-v3/result/model";
import { BIZ_CASE } from "./fixtures/evidence";

type Key = string;
import { all } from "./fixtures/evidence";

function submitted(sub: Submission): Key[] {
  const out: Key[] = [];
  for (const [k, l] of Object.entries(sub.checklists ?? {})) {
    const [td, ax] = k.split(".");
    for (const t of l) out.push(`${td}|${ax}|${t}`);
  }
  for (const [td, l] of Object.entries(sub.artifacts ?? {})) for (const t of l) out.push(`${td}|ARTIFACT|${t}`);
  for (const [td, l] of Object.entries(sub.verifications ?? {})) for (const t of l) out.push(`${td}|VERIFY|${t}`);
  return out;
}
/** 확인된 축이 근거로 쓴 고르기 — `did` 를 열쇠로 되짚은 것 */
function confirmedKeys(s: Snapshot): Key[] {
  const out: Key[] = [];
  for (const d of s.domains) for (const ax of d.confirmed) for (const k of d.axes[ax as "J1"].evidence_keys) {
    if (!k.includes(":")) continue;
    const [kind, ...r] = k.split(":");
    out.push(`${d.code}|${kind === "artifact" ? "ARTIFACT" : kind === "verify" ? "VERIFY" : ax}|${r.join(":")}`);
  }
  return [...new Set(out)];
}
function counts(sub: Submission, s: Snapshot, m: ResultModel) {
  const sum = (f: (d: ResultModel["domains"][number]) => string[]) =>
    m.domains.reduce((n, d) => n + f(d).length, 0);
  const did = sum((d) => d.did), decided = sum((d) => d.decided);
  const artifacts = sum((d) => d.artifacts), verifications = sum((d) => d.verifications);
  const keys = submitted(sub);
  return {
    picks_rows: keys.length,
    unique_pk: new Set(keys).size,
    did, decided, artifacts, verifications, sum_of_four: did + decided + artifacts + verifications,
    confirmed_pk: confirmedKeys(s).length,
    candidate_pk: new Set(keys).size - confirmedKeys(s).length,
  };
}
function run(core: string, f: Fixture) {
  const loaded = load(core);
  const sub = expand(f, core);
  const s = score(sub, loaded);
  return { sub, s, m: buildResult(s, loaded) };
}
const log = (name: string, v: unknown) => console.log(`# ${name} ${JSON.stringify(v)}`);

test("E1 did 는 확인된 축의 근거만 담는다 — VERIFY 하나가 빠지는 것은 의도된 동작이다", () => {
  const { sub, s, m } = run("BIZ_CORE_V1", BIZ_CASE);
  const c = counts(sub, s, m);
  log("BIZ", c);
  const td02 = s.domains.find((d) => d.code === "TD02")!;
  const md02 = m.domains.find((d) => d.code === "TD02")!;
  assert.equal(td02.axes.J6.state, "PARTICIPATED", "TD02 J6 는 받아서만 해 봤다");
  const v = sub.verifications!.TD02[0];
  assert.ok(md02.verifications.includes(v), "verifications 는 확인 여부와 상관없이 고른 VERIFY 전부");
  assert.ok(!md02.did.includes(v), "did 에는 확인된 축의 근거만 — J6 가 확인되지 않아 빠진다");
  assert.equal(c.picks_rows - c.confirmed_pk, c.candidate_pk);
  assert.ok(c.candidate_pk >= 1);
});

test("E2 verifications · artifacts 는 축 상태를 보지 않는다", () => {
  const { sub, m } = run("BIZ_CORE_V1", BIZ_CASE);
  for (const d of m.domains) {
    assert.deepEqual([...d.artifacts].sort(), [...(sub.artifacts?.[d.code] ?? [])].sort(), d.code);
    assert.deepEqual([...d.verifications].sort(), [...(sub.verifications?.[d.code] ?? [])].sort(), d.code);
  }
});

test("E3 네 목록의 합은 같은 근거를 두 번 이상 센다", () => {
  const { sub, s, m } = run("BIZ_CORE_V1", BIZ_CASE);
  const c = counts(sub, s, m);
  let decidedInDid = 0, artInDid = 0, verInDid = 0;
  for (const d of m.domains) {
    const did = new Set(d.did);
    decidedInDid += d.decided.filter((x) => did.has(x)).length;
    artInDid += d.artifacts.filter((x) => did.has(x)).length;
    verInDid += d.verifications.filter((x) => did.has(x)).length;
  }
  log("BIZ overlap", { decidedInDid, artInDid, verInDid, sum_of_four: c.sum_of_four, unique_pk: c.unique_pk });
  assert.ok(artInDid > 0 && verInDid > 0, "확인된 J5 · J6 의 산출물 · 검증 고르기는 did 와 겹친다");
  assert.ok(c.sum_of_four > c.unique_pk, "합이 고유 근거 수보다 크다 = 중복 집계");
  assert.equal(c.unique_pk, c.picks_rows, "고유 근거 수 = v3_evidence_picks 행 수(PK)");
});

test("E4 decided 는 did 의 부분집합이다", () => {
  const f: Fixture = { ...BIZ_CASE, id: "E-BIZ-OWN", axes: { ...BIZ_CASE.axes, TD01: all(3) } };
  const { m } = run("BIZ_CORE_V1", f);
  for (const d of m.domains) for (const x of d.decided) assert.ok(d.did.includes(x), `${d.code}:${x}`);
  assert.ok(m.domains.some((d) => d.decided.length > 0), "근거 둘 이상인 축이 OWNED 로 서서 decided 가 비지 않는다");
});

test("E5 같은 글이 ARTIFACT 와 VERIFY 에 다 있으면 did 가 하나로 합친다 (CS TD01 '요구 목록')", () => {
  const dom = coreFile<{ domains: { code: string; artifacts: string[]; verify_targets: string[] }[] }>("CS_CORE_V1", "domains")
    .domains.find((d) => d.code === "TD01")!;
  const t = "요구 목록";
  assert.ok(dom.artifacts.includes(t) && dom.verify_targets.includes(t), "자료에 두 칸 모두 있다");
  const f: Fixture = {
    id: "E-CS", name: "같은 글 두 칸", tier: "PRO", stage: "bachelor", field: null,
    probe: ["TD01"], deep: ["TD01"], grid: { TD01: [5, 2, 5] },
    axes: { TD01: all(2) }, checklist: { TD01: { J5: 1, J6: 1 } },
    answers: {},
  };
  const loaded = load("CS_CORE_V1");
  const sub = expand(f, "CS_CORE_V1");
  sub.artifacts = { TD01: [t] };
  sub.verifications = { TD01: [t] };
  const s = score(sub, loaded);
  const m = buildResult(s, loaded);
  const d = m.domains.find((x) => x.code === "TD01")!;
  const pk = submitted(sub).filter((k) => k.endsWith(`|${t}`));
  log("CS collision", { pk_rows: pk.length, did_hits: d.did.filter((x) => x === t).length,
    artifacts: d.artifacts.filter((x) => x === t).length, verifications: d.verifications.filter((x) => x === t).length });
  assert.equal(pk.length, 2, "DB 에는 두 행: (TD01, ARTIFACT, 요구 목록) · (TD01, VERIFY, 요구 목록)");
  assert.equal(d.did.filter((x) => x === t).length, 1, "did 는 글만 보고 하나로 합친다 — 뜻이 다른 두 근거가 하나로 보인다");
});
