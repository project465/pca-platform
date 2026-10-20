/**
 * SC-1 기관 프로필 — 읽기 전용 인터페이스의 계약 검사 (R36).
 *
 * 실행 (npm 없이, Node 22 내장만):
 *   node --no-warnings --experimental-strip-types \
 *     --import ./scripts/shared-core/test/register.mjs \
 *     --test scripts/shared-core/tenant-profile.test.ts
 *
 * **새 기관 ID 를 만들지 않는다.** 기관 파일 fixture 는 전부 이미 있는 확인용
 * 코드 `ZZTEST` 를 쓰고 임시 디렉터리에만 놓는다. 운영 콘텐츠 디렉터리에는
 * 한 바이트도 쓰지 않으며, 끝에서 그 지문을 다시 잰다.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  TENANT_ERROR_CODES, TENANT_PROFILE_SCHEMA, TenantProfileError,
  canonicalProfileJson, findTenantProfile, listTenantProfiles, loadTenantProfile,
} from "@/lib/shared-core/tenant";

const REAL = "sites/pca-platform/content";
const REAL_CAMPUS = join(REAL, "campus-universities.json");
const FIXTURE = "scripts/fixtures/campus-zztest.json";

const sha = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex");
function dirPrint(dir: string): string {
  const h = createHash("sha256");
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".json")) continue;
    h.update(f).update(readFileSync(join(dir, f)));
  }
  return h.digest("hex");
}
const BEFORE = { campus: sha(REAL_CAMPUS), dir: dirPrint(REAL) };

const temps: string[] = [];
after(() => { for (const d of temps) rmSync(d, { recursive: true, force: true }); });

/** 참조 목록 셋만 복사한 임시 콘텐츠 디렉터리. 학교 등록부는 `campus` 로 받는다 */
function sandbox(campus: unknown | null = { universities: [] }): string {
  const d = mkdtempSync(join(tmpdir(), "sc1-"));
  temps.push(d);
  for (const f of ["major-cores.json", "markets.json", "region-layer.json"]) {
    copyFileSync(join(REAL, f), join(d, f));
  }
  if (campus !== null) writeFileSync(join(d, "campus-universities.json"), JSON.stringify(campus));
  return d;
}
function putTenant(dir: string, file: string, body: unknown | string): void {
  mkdirSync(join(dir, "tenants"), { recursive: true });
  writeFileSync(join(dir, "tenants", file), typeof body === "string" ? body : JSON.stringify(body, null, 2));
}
const VALID = {
  schema_version: TENANT_PROFILE_SCHEMA,
  code: "ZZTEST",
  name: "확인용 기관",
  kind: "public_agency",
  country: "KR",
  market: "KR",
  majors: { cores: ["ME_CORE_V3", "BIZ_CORE_V1"] },
  content: { region_codes: ["KR-CHUNGCHEONG", "KR-CAPITAL"], org_dataset: null },
  note: "R36 테스트 fixture",
};
function errCode(fn: () => unknown): string {
  try { fn(); } catch (e) {
    assert.ok(e instanceof TenantProfileError, `TenantProfileError 가 아니다: ${String(e)}`);
    return (e as TenantProfileError).code;
  }
  assert.fail("던지지 않았다");
}

/* ── 1. 실제 등록부의 PCU ─────────────────────────────────────────── */

test("T01 PCU 는 실제 학교 등록부에서 읽히고 값이 등록부와 맞는다", () => {
  const p = loadTenantProfile("PCU", { contentDir: REAL });
  const raw = JSON.parse(readFileSync(REAL_CAMPUS, "utf8"));
  const u = raw.universities.find((x: { university_code: string }) => x.university_code === "PCU");
  assert.equal(p.schema_version, TENANT_PROFILE_SCHEMA);
  assert.equal(p.code, "PCU");
  assert.equal(p.name, u.university_name);
  assert.equal(p.kind, "university");
  assert.equal(p.market, u.market_code);
  assert.equal(p.country, "KR");
  assert.deepEqual(p.content.region_codes, [u.region_hint]);
  assert.equal(p.content.org_dataset, null);
  assert.deepEqual(p.majors.catalogs, u.catalogs.map((c: { catalog_code: string }) => c.catalog_code).sort());
  assert.ok(p.majors.cores.length > 0);
  assert.deepEqual(p.majors.cores, [...p.majors.cores].sort(), "cores 는 정렬돼 있다");
  assert.equal(p.source.kind, "campus-registry");
  assert.equal(p.source.file, "campus-universities.json");
  assert.equal(p.source.sha256, BEFORE.campus, "source.sha256 은 원본 바이트의 지문이다");
});

test("T02 같은 입력이면 같은 정규화 출력이다 (두 번 읽기 · 목록과 단건)", () => {
  const a = canonicalProfileJson(loadTenantProfile("PCU", { contentDir: REAL }));
  const b = canonicalProfileJson(loadTenantProfile("PCU", { contentDir: REAL }));
  const c = canonicalProfileJson(listTenantProfiles({ contentDir: REAL }).find((x) => x.code === "PCU")!);
  assert.equal(a, b);
  assert.equal(a, c);
});

test("T03 프로필은 얼어 있다 — 받은 쪽이 고쳐도 다음 호출이 오염되지 않는다", () => {
  const p = loadTenantProfile("PCU", { contentDir: REAL });
  assert.ok(Object.isFrozen(p) && Object.isFrozen(p.majors) && Object.isFrozen(p.majors.cores));
  assert.throws(() => { (p.majors.cores as string[]).push("ZZ"); }, TypeError);
  assert.throws(() => { (p as { name: string }).name = "x"; }, TypeError);
  const q = loadTenantProfile("PCU", { contentDir: REAL });
  assert.notEqual(p, q, "호출마다 새 객체다 (캐시 없음)");
  assert.equal(canonicalProfileJson(p), canonicalProfileJson(q));
});

/* ── 2. fixture 학교: 명시해야만 읽힌다 ───────────────────────────── */

test("T04 ZZTEST 는 campusRegistryFile 로 넘길 때만 읽히고, V3_CAMPUS_FIXTURE 를 덧붙이지 않는다", () => {
  const prev = process.env.V3_CAMPUS_FIXTURE;
  process.env.V3_CAMPUS_FIXTURE = FIXTURE;
  try {
    assert.equal(errCode(() => loadTenantProfile("ZZTEST", { contentDir: REAL })), "TENANT_NOT_FOUND");
    assert.deepEqual(listTenantProfiles({ contentDir: REAL }).map((x) => x.code), ["PCU"]);
  } finally {
    if (prev === undefined) delete process.env.V3_CAMPUS_FIXTURE; else process.env.V3_CAMPUS_FIXTURE = prev;
  }
  const z = loadTenantProfile("ZZTEST", { contentDir: REAL, campusRegistryFile: FIXTURE });
  assert.equal(z.kind, "university");
  assert.equal(z.source.sha256, sha(FIXTURE));
  assert.equal(errCode(() => loadTenantProfile("PCU", { contentDir: REAL, campusRegistryFile: FIXTURE })),
    "TENANT_NOT_FOUND", "원천을 바꾸면 그 원천에 있는 것만 보인다");
});

/* ── 3. 모르는 코드 · 꼴이 아닌 코드 ─────────────────────────────── */

test("T05 등록되지 않은 코드는 TENANT_NOT_FOUND 를 명시적으로 돌려준다", () => {
  assert.equal(errCode(() => loadTenantProfile("JJU", { contentDir: REAL })), "TENANT_NOT_FOUND");
  const r = findTenantProfile("SJU", { contentDir: REAL });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, "TENANT_NOT_FOUND");
});

test("T06 코드 꼴이 아니면 원천을 읽기 전에 INVALID_CODE", () => {
  for (const bad of ["pcu", "", "P", "../PCU", "PCU.json", "P C U", "ＰＣＵ"]) {
    assert.equal(errCode(() => loadTenantProfile(bad, { contentDir: REAL })), "INVALID_CODE", bad);
  }
  assert.equal(errCode(() => loadTenantProfile(undefined as unknown as string, { contentDir: REAL })), "INVALID_CODE");
});

/* ── 4. 기관 파일 ─────────────────────────────────────────────────── */

test("T07 올바른 기관 파일 한 벌은 정규화된 프로필이 된다", () => {
  const d = sandbox();
  putTenant(d, "ZZTEST.json", { ...VALID, name: "  확인용 기관  " });
  const p = loadTenantProfile("ZZTEST", { contentDir: d });
  assert.equal(p.name, "확인용 기관", "앞뒤 공백을 걷는다");
  assert.deepEqual(p.majors.cores, ["BIZ_CORE_V1", "ME_CORE_V3"], "cores 는 정렬한다");
  assert.deepEqual(p.majors.catalogs, []);
  assert.deepEqual(p.content.region_codes, ["KR-CHUNGCHEONG", "KR-CAPITAL"], "권역은 적힌 차례(우선순위)를 지킨다");
  assert.equal(p.source.kind, "tenant-file");
  assert.equal(p.source.file, join("tenants", "ZZTEST.json"));
  assert.equal(p.source.sha256, sha(join(d, "tenants", "ZZTEST.json")));
});

test("T08 깨진 JSON 은 INVALID_JSON", () => {
  const d = sandbox();
  putTenant(d, "ZZTEST.json", '{ "schema_version": "cm-tenant-profile.1", ');
  assert.equal(errCode(() => loadTenantProfile("ZZTEST", { contentDir: d })), "INVALID_JSON");
  const d2 = sandbox();
  putTenant(d2, "ZZTEST.json", "[1,2]");
  assert.equal(errCode(() => loadTenantProfile("ZZTEST", { contentDir: d2 })), "INVALID_SCHEMA", "맨 위가 객체가 아니다");
});

test("T09 필수 칸이 빠지면 MISSING_FIELD — 칸마다", () => {
  for (const k of ["schema_version", "code", "name", "kind", "country", "market", "majors", "content"] as const) {
    const d = sandbox();
    const body: Record<string, unknown> = { ...VALID };
    delete body[k];
    putTenant(d, "ZZTEST.json", body);
    const got = errCode(() => loadTenantProfile("ZZTEST", { contentDir: d }));
    assert.equal(got, "MISSING_FIELD", k);
  }
  for (const [where, body] of [
    ["majors.cores", { ...VALID, majors: {} }],
    ["content.org_dataset", { ...VALID, content: { region_codes: [] } }],
    ["content.region_codes", { ...VALID, content: { org_dataset: null } }],
  ] as const) {
    const d = sandbox();
    putTenant(d, "ZZTEST.json", body);
    assert.equal(errCode(() => loadTenantProfile("ZZTEST", { contentDir: d })), "MISSING_FIELD", where);
  }
});

test("T10 모르는 칸은 조용히 버리지 않고 UNKNOWN_FIELD", () => {
  for (const body of [
    { ...VALID, region_code: "KR-CAPITAL" },
    { ...VALID, majors: { cores: [], core: ["X"] } },
    { ...VALID, content: { region_codes: [], org_dataset: null, regions: [] } },
  ]) {
    const d = sandbox();
    putTenant(d, "ZZTEST.json", body);
    assert.equal(errCode(() => loadTenantProfile("ZZTEST", { contentDir: d })), "UNKNOWN_FIELD");
  }
});

test("T11 schema_version 이 다르면 UNSUPPORTED_SCHEMA_VERSION", () => {
  for (const v of ["cm-tenant-profile.0", "cm-tenant-profile.2", 1]) {
    const d = sandbox();
    putTenant(d, "ZZTEST.json", { ...VALID, schema_version: v });
    assert.equal(errCode(() => loadTenantProfile("ZZTEST", { contentDir: d })), "UNSUPPORTED_SCHEMA_VERSION", String(v));
  }
});

test("T12 파일 이름과 code 가 다르면 CODE_MISMATCH", () => {
  const d = sandbox();
  putTenant(d, "ZZTEST_OLD.json", VALID);
  assert.equal(errCode(() => listTenantProfiles({ contentDir: d })), "CODE_MISMATCH");
});

test("T13 같은 코드를 두 원천이 들면 CODE_CONFLICT — 섞지 않는다", () => {
  const campus = JSON.parse(readFileSync(FIXTURE, "utf8"));
  const d = sandbox(campus);
  putTenant(d, "ZZTEST.json", VALID);
  assert.equal(errCode(() => loadTenantProfile("ZZTEST", { contentDir: d })), "CODE_CONFLICT");
  assert.equal(errCode(() => listTenantProfiles({ contentDir: d })), "CODE_CONFLICT");
  const d2 = sandbox({ universities: [campus.universities[0], campus.universities[0]] });
  assert.equal(errCode(() => listTenantProfiles({ contentDir: d2 })), "CODE_CONFLICT", "등록부 안의 중복");
});

test("T14 등록되지 않은 참조는 UNKNOWN_REFERENCE (Core · 권역 · 시장)", () => {
  for (const body of [
    { ...VALID, majors: { cores: ["NOPE_CORE_V9"] } },
    { ...VALID, content: { region_codes: ["KR-MARS"], org_dataset: null } },
    { ...VALID, market: "MARS" },
  ]) {
    const d = sandbox();
    putTenant(d, "ZZTEST.json", body);
    assert.equal(errCode(() => loadTenantProfile("ZZTEST", { contentDir: d })), "UNKNOWN_REFERENCE");
  }
});

test("T15 꼴이 틀린 값은 INVALID_SCHEMA (중복 · kind · country · dataset · 빈 이름)", () => {
  for (const body of [
    { ...VALID, majors: { cores: ["ME_CORE_V3", "ME_CORE_V3"] } },
    { ...VALID, content: { region_codes: ["KR-CAPITAL", "KR-CAPITAL"], org_dataset: null } },
    { ...VALID, kind: "company" },
    { ...VALID, country: "KOR" },
    { ...VALID, country: "kr" },
    { ...VALID, content: { region_codes: [], org_dataset: "../etc" } },
    { ...VALID, name: "   " },
    { ...VALID, majors: { cores: "ME_CORE_V3" } },
    { ...VALID, note: 3 },
  ]) {
    const d = sandbox();
    putTenant(d, "ZZTEST.json", body);
    assert.equal(errCode(() => loadTenantProfile("ZZTEST", { contentDir: d })), "INVALID_SCHEMA", JSON.stringify(body).slice(0, 80));
  }
  const d = sandbox();
  putTenant(d, "ZZTEST.json", { ...VALID, code: "zztest" });
  assert.equal(errCode(() => listTenantProfiles({ contentDir: d })), "INVALID_CODE");
});

test("T16 입력 차례가 달라도 정규화 출력이 같다", () => {
  const d1 = sandbox();
  const d2 = sandbox();
  putTenant(d1, "ZZTEST.json", VALID);
  putTenant(d2, "ZZTEST.json", {
    note: VALID.note,
    content: { org_dataset: null, region_codes: ["KR-CHUNGCHEONG", "KR-CAPITAL"] },
    majors: { cores: ["BIZ_CORE_V1", "ME_CORE_V3"] },
    market: "KR", country: "KR", kind: "public_agency", name: "확인용 기관", code: "ZZTEST",
    schema_version: TENANT_PROFILE_SCHEMA,
  });
  const a = loadTenantProfile("ZZTEST", { contentDir: d1 });
  const b = loadTenantProfile("ZZTEST", { contentDir: d2 });
  const strip = (p: typeof a) => canonicalProfileJson({ ...p, source: { ...p.source, sha256: "" } });
  assert.equal(strip(a), strip(b), "원본 바이트 지문만 다르다");
  assert.notEqual(a.source.sha256, b.source.sha256);
});

/* ── 5. 기관끼리 섞이지 않는다 ───────────────────────────────────── */

test("T17 두 기관의 프로필은 서로의 값을 들지 않는다", () => {
  const campus = JSON.parse(readFileSync(FIXTURE, "utf8"));
  const d = sandbox({ universities: [] });
  putTenant(d, "ZZTEST.json", { ...VALID, majors: { cores: ["LAW_CORE_V1"] } });
  copyFileSync(REAL_CAMPUS, join(d, "campus-universities.json"));
  const pcu = loadTenantProfile("PCU", { contentDir: d });
  const zz = loadTenantProfile("ZZTEST", { contentDir: d });
  assert.equal(pcu.source.kind, "campus-registry");
  assert.equal(zz.source.kind, "tenant-file");
  assert.deepEqual(zz.majors.cores, ["LAW_CORE_V1"]);
  assert.deepEqual(zz.majors.catalogs, []);
  assert.notEqual(pcu.majors.cores, zz.majors.cores);
  assert.ok(!pcu.majors.catalogs.some((c) => zz.majors.catalogs.includes(c)));
  assert.deepEqual(listTenantProfiles({ contentDir: d }).map((p) => p.code), ["PCU", "ZZTEST"]);
  void campus;
});

/* ── 6. 원천 ──────────────────────────────────────────────────────── */

test("T18 기관 파일 디렉터리가 없어도 된다 · 학교 등록부가 없으면 SOURCE_UNREADABLE", () => {
  const d = sandbox();
  assert.deepEqual(listTenantProfiles({ contentDir: d }), []);
  const d2 = sandbox(null);
  assert.equal(errCode(() => listTenantProfiles({ contentDir: d2 })), "SOURCE_UNREADABLE");
});

test("T19 학교 등록부의 시장이 나라 코드가 아니면 짐작하지 않고 거절한다", () => {
  const campus = JSON.parse(readFileSync(FIXTURE, "utf8"));
  campus.universities[0].market_code = "GLOBAL";
  const d = sandbox(campus);
  assert.equal(errCode(() => listTenantProfiles({ contentDir: d })), "INVALID_SCHEMA");
  const c2 = JSON.parse(readFileSync(FIXTURE, "utf8"));
  delete c2.universities[0].catalogs;
  const d2 = sandbox(c2);
  assert.equal(errCode(() => listTenantProfiles({ contentDir: d2 })), "MISSING_FIELD");
  const c3 = JSON.parse(readFileSync(FIXTURE, "utf8"));
  c3.universities[0].region_hint = "KR-MARS";
  const d3 = sandbox(c3);
  assert.equal(errCode(() => listTenantProfiles({ contentDir: d3 })), "UNKNOWN_REFERENCE");
});

test("T20 오류 코드는 계약에 적힌 열하나뿐이고 메시지가 코드를 든다", () => {
  assert.equal(TENANT_ERROR_CODES.length, 11);
  const e = new TenantProfileError("TENANT_NOT_FOUND", "x", { tenant: "ZZTEST" });
  assert.match(e.message, /^\[TENANT_NOT_FOUND\]/);
  assert.equal(e.name, "TenantProfileError");
});

/* ── 7. 운영 설정을 건드리지 않았다 ──────────────────────────────── */

test("T99 운영 콘텐츠 디렉터리와 PCU 등록부의 지문이 시작할 때와 같다", () => {
  assert.equal(sha(REAL_CAMPUS), BEFORE.campus);
  assert.equal(dirPrint(REAL), BEFORE.dir);
  console.log(`# campus-universities.json sha256 ${BEFORE.campus}`);
  console.log(`# content/*.json 묶음 sha256 ${BEFORE.dir}`);
});
