/**
 * ME_V3 판단 엔진이 서 있는가. **한 명령으로 전체를 본다.**
 *
 * 묻는 것 셋이다. 같은 응답이면 늘 같은 판단이 나오는가. 왜 그 판단인지
 * 문항까지 되짚을 수 있는가. 들어가면 안 되는 넷(학위 · 전공계열 · 산업 ·
 * 역할)이 실제로 안 들어가는가.
 *
 *   npm run v3:scoring
 *   GOLDEN=update npm run v3:scoring   # 규칙을 일부러 바꿨을 때만
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { registry, CONTENT_DIR } from "../src/lib/me-v3/core-registry";
import { load, score, coreOnly } from "../src/lib/me-v3/scoring/engine";
import { expand, stable, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { REASON_CODES } from "../src/lib/me-v3/scoring/reason-codes";
import { OWNERSHIP } from "../src/lib/me-v3/scoring/ownership";
import { ITEM_BANK_VERSION, SCORING_VERSION } from "../src/lib/me-v3/scoring/version";
import type { Snapshot, Submission } from "../src/lib/me-v3/scoring/types";

const FIX = "sites/pca-platform/assessment/ME_V3/personas.json";
const LOCK = "sites/pca-platform/assessment/ME_V3/bank-lock.json";
const SCORING_DIR = "src/lib/me-v3/scoring";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const set = (a: string[]) => [...a].sort().join(",");

function pickCore(): string {
  if (process.env.CORE) return process.env.CORE;
  return registry().cores.filter((c) => c.status === "building")[0].code;
}

function main(): void {
  const core = pickCore();
  console.log(`  core  ${core} · ${SCORING_VERSION} · ${ITEM_BANK_VERSION}\n`);
  const loaded = load(core);
  const fx = JSON.parse(readFileSync(FIX, "utf8")) as
    { personas: Fixture[] };
  const update = process.env.GOLDEN === "update";

  /* 1. 문항 은행 1차 동결 */
  const lock = JSON.parse(readFileSync(LOCK, "utf8")) as
    { item_bank_version: string; files: Record<string, string> };
  const drift: string[] = [];
  const fresh: Record<string, string> = {};
  for (const file of Object.keys(lock.files)) {
    const got = createHash("sha256")
      .update(readFileSync(`${CONTENT_DIR}/${file}`)).digest("hex");
    fresh[file] = got;
    if (got !== lock.files[file]) drift.push(file);
  }
  /* **지문을 다시 적는 길을 둔다.** 전에는 손으로 고쳐야 했고, 손으로
     고치면 판본을 올리는 것을 빠뜨린다. 일부러 고쳤을 때만 쓴다 */
  if (process.env.BANK === "update") {
    lock.files = fresh;
    lock.item_bank_version = ITEM_BANK_VERSION;
    (lock as unknown as Record<string, unknown>).scoring_version = SCORING_VERSION;
    writeFileSync(LOCK, `${JSON.stringify(lock, null, 1)}\n`);
    console.log(`  적었다  ${LOCK} — ${Object.keys(fresh).length}벌 · ${ITEM_BANK_VERSION}`);
    drift.length = 0;
  }
  ok("문항 은행이 잠긴 판본과 같다", drift.length === 0 && lock.item_bank_version === ITEM_BANK_VERSION,
     drift.length ? `${drift.join(" ")} — 바꿨다면 판본을 올리고 ${LOCK} 을 다시 적는다`
                  : `${Object.keys(lock.files).length}벌 · ${lock.item_bank_version}`);

  /* 2. 사람 열두 벌 */
  const snaps = new Map<string, Snapshot>();
  const subs = new Map<string, Submission>();
  const bad: string[] = [];
  for (const f of fx.personas) {
    const sub = expand(f, core);
    const s = score(sub, loaded);
    snaps.set(f.id, s); subs.set(f.id, sub);
    for (const [td, want] of Object.entries(f.expect ?? {})) {
      const d = s.domains.find((x) => x.code === td);
      if (!d) { bad.push(`${f.id} ${td} 없음`); continue; }
      if (want.zone && d.zone !== want.zone) bad.push(`${f.id} ${td} zone=${d.zone}≠${want.zone}`);
      if (want.reasons && set(d.reasons) !== set(want.reasons)) {
        bad.push(`${f.id} ${td} reasons=${set(d.reasons)}≠${set(want.reasons)}`);
      }
      for (const a of want.owned_has ?? []) {
        if (!d.owned.includes(a as never)) bad.push(`${f.id} ${td} owned 에 ${a} 없음`);
      }
      if (want.confirmed_min !== undefined && d.confirmed.length < want.confirmed_min) {
        bad.push(`${f.id} ${td} confirmed=${d.confirmed.length}<${want.confirmed_min}`);
      }
      if (want.next && set(d.next) !== set(want.next)) {
        bad.push(`${f.id} ${td} next=${set(d.next)}≠${set(want.next)}`);
      }
      for (const n of want.next_has ?? []) {
        if (!d.next.includes(n as never)) bad.push(`${f.id} ${td} next 에 ${n} 없음`);
      }
      if (want.quadrant && d.quadrant !== want.quadrant) {
        bad.push(`${f.id} ${td} quadrant=${d.quadrant}≠${want.quadrant}`);
      }
    }
    if (f.expect_focus && set(s.focus) !== set(f.expect_focus)) {
      bad.push(`${f.id} focus=${set(s.focus)}≠${set(f.expect_focus)}`);
    }
    if (f.expect_quality && s.response_quality.flag !== f.expect_quality) {
      bad.push(`${f.id} quality=${s.response_quality.flag}≠${f.expect_quality}`);
    }
  }
  ok("사람 열두 벌이 기대한 묶음과 까닭을 낸다", bad.length === 0,
     bad.length ? bad.slice(0, 6).join(" · ") : `${fx.personas.length}벌`);

  /* 3. 같은 응답이면 같은 판단 */
  const twice = fx.personas.every((f) => {
    const a = stable(score(expand(f, core), loaded));
    const b = stable(score(expand(f, core), loaded));
    return a === b;
  });
  ok("두 번 돌려도 같은 값", twice);
  const shuffled = fx.personas.every((f) => {
    const sub = subs.get(f.id) as Submission;
    const keys = Object.keys(sub.answers).reverse();
    const flipped: Submission = {
      ...sub, answers: Object.fromEntries(keys.map((k) => [k, sub.answers[k]])),
    };
    return stable(coreOnly(score(flipped, loaded))) ===
      stable(coreOnly(snaps.get(f.id) as Snapshot));
  });
  ok("응답을 넣은 순서가 결과를 바꾸지 않는다", shuffled);

  /* 4. golden 지문 */
  const goldens: string[] = [];
  const changed: string[] = [];
  for (const f of fx.personas) {
    const g = sha(stable(coreOnly(snaps.get(f.id) as Snapshot)));
    goldens.push(`${f.id}:${g}`);
    if (f.golden && f.golden !== g) changed.push(`${f.id} ${f.golden}→${g}`);
    if (update) f.golden = g;
  }
  if (update) {
    writeFileSync(FIX, `${JSON.stringify(fx, null, 1)}\n`);
    console.log("  보고  golden 을 다시 적었다");
  }
  const missing = fx.personas.filter((f) => !f.golden).map((f) => f.id);
  ok("Core 판정 지문이 그대로다", changed.length === 0 && missing.length === 0,
     changed.length ? changed.join(" ")
       : missing.length ? `${missing.join(" ")} — GOLDEN=update 로 적는다`
       : `${goldens.length}벌`);

  /* 5. 변형 검사 A~G */
  const base = fx.personas.find((f) => f.id === "P12") as Fixture;
  const baseCore = stable(coreOnly(score(expand(base, core), loaded)));
  const variant = (over: Partial<Fixture>) =>
    stable(coreOnly(score(expand({ ...base, ...over }, core), loaded)));

  ok("A 학위만 바꿔도 Core 판정이 같다",
     ["bachelor", "master", "phd", "postdoc"].every((st) =>
       variant({ stage: st as Fixture["stage"] }) === baseCore), "학부·석사·박사·포닥");
  ok("B 전공계열만 바꿔도 Core 판정이 같다",
     ["STEM", "HUMANITIES_SOCIAL", "BUSINESS", "OTHER_INTERDISCIPLINARY"].every((fd) =>
       variant({ field: fd as Fixture["field"] }) === baseCore), "계열 넷");
  ok("C 산업팩만 바꿔도 Core 판정이 같다",
     ["INDUSTRY_SEMICON_V2", "INDUSTRY_DEFENSE_V2", "INDUSTRY_MOBILITY_V2", null]
       .every((ind) => variant({ industry: ind }) === baseCore), "반도체·방산·자동차·없음");
  ok("D 역할팩만 바꿔도 Core 판정이 같다",
     ["ROLE_CAE_V2", "ROLE_PM_V2", "ROLE_DESIGN_V2", null]
       .every((r) => variant({ role: r }) === baseCore), "CAE·PM·설계·없음");

  /* E 관심만 올리면 축 상태는 그대로다 */
  const low = fx.personas.find((f) => f.id === "P11") as Fixture;
  const lowSnap = score(expand(low, core), loaded);
  const upSnap = score(expand({
    ...low, grid: { ...(low.grid ?? {}), TD04: [5, 1, 5] },
  }, core), loaded);
  const axesSame = lowSnap.domains.every((d) => {
    const o = upSnap.domains.find((x) => x.code === d.code);
    return !!o && stable(d.axes) === stable(o.axes) &&
      set(d.confirmed) === set(o.confirmed) && set(d.owned) === set(o.owned);
  });
  const td04 = { before: lowSnap.domains.find((d) => d.code === "TD04")?.zone,
                 after: upSnap.domains.find((d) => d.code === "TD04")?.zone };
  ok("E 관심만 올려도 근거 상태가 그대로다", axesSame,
     `TD04 묶음은 ${td04.before}에서 ${td04.after}로 옮겨도 된다`);

  /* F 산출물 근거만 더하면 Z2 가 Z1 이 될 수 있다 */
  const f11 = fx.personas.find((f) => f.id === "P11") as Fixture;
  const withOutput = score(expand({
    ...f11,
    axes: { ...(f11.axes ?? {}), TD02: { ...(f11.axes?.TD02 ?? {}), J5: 2 } },
    checklist: { ...(f11.checklist ?? {}), TD02: { ...(f11.checklist?.TD02 ?? {}), J5: 2 } },
    artifacts: { ...(f11.artifacts ?? {}), TD02: 2 },
  }, core), loaded);
  const beforeZone = lowSnap.domains.find((d) => d.code === "TD02")?.zone;
  const afterZone = withOutput.domains.find((d) => d.code === "TD02")?.zone;
  ok("F 산출물을 더하면 근거가 선다",
     beforeZone === "Z2_EVIDENCE_INCOMPLETE" && afterZone === "Z1_EVIDENCE_ESTABLISHED",
     `TD02 ${beforeZone} → ${afterZone}`);

  /* G 검증만 더하면 그 축만 바뀐다 */
  const f10 = fx.personas.find((f) => f.id === "P10") as Fixture;
  const g0 = score(expand(f10, core), loaded);
  const g1 = score(expand({
    ...f10,
    axes: { ...(f10.axes ?? {}), TD06: { ...(f10.axes?.TD06 ?? {}), J6: 2 } },
  }, core), loaded);
  const d0 = g0.domains.find((d) => d.code === "TD06");
  const d1 = g1.domains.find((d) => d.code === "TD06");
  const onlyJ6 = !!d0 && !!d1 &&
    ["J1", "J2", "J3", "J4", "J5", "J7", "J8"].every((a) =>
      stable(d0.axes[a as never]) === stable(d1.axes[a as never])) &&
    d0.axes.J6.state !== d1.axes.J6.state && !d0.verification_ok && d1.verification_ok;
  ok("G 검증을 더하면 그 축만 바뀐다", onlyJ6,
     `TD06 J6 ${d0?.axes.J6.state} → ${d1?.axes.J6.state}`);

  /* 6. 다섯 신호를 합치지 않는다 */
  const noTotal = !fx.personas.some((f) => {
    const s = snaps.get(f.id) as Snapshot;
    return /"(total|fit|overall|composite)_?(score)?":/.test(JSON.stringify(s));
  });
  ok("종합 적합도 숫자를 만들지 않는다", noTotal, "관심·경험·학습·축이 따로 나간다");

  /* 7. BASIC 의 한계 */
  const basics = fx.personas.filter((f) => f.tier === "BASIC");
  const basicOk = basics.every((f) => {
    const s = snaps.get(f.id) as Snapshot;
    return s.zones.Z1_EVIDENCE_ESTABLISHED.length === 0 &&
      !s.tier_limits.allows_evidence_established &&
      s.domains.every((d) => d.confirmed_all === 0);
  });
  ok("BASIC 에는 근거가 섰다는 판정이 없다", basicOk, `${basics.length}벌`);

  /* 8. 소유는 응답만으로 서지 않는다 */
  const ownedNeedsEvidence = fx.personas.every((f) => {
    const s = snaps.get(f.id) as Snapshot;
    return s.domains.every((d) =>
      d.owned.every((a) => d.axes[a].evidence >= 2 &&
        d.axes[a].from.some((x) => x.ownership === "DECIDED_USED")));
  });
  ok("소유는 응답과 근거 둘을 함께 본다", ownedNeedsEvidence);
  /* 근거가 하나면 확인까지만.
     **선별 축은 문항이 둘이고 둘 다 수행 이상이면 그것이 근거 하나로
     센다.** 그래서 이 자리에서는 둘째 문항을 비워 둔다: 그러지 않으면
     체크리스트 하나만 골라도 근거가 둘이 되어 재려는 것을 못 잰다 */
  const one = score(expand({
    ...base, axes: { ...base.axes, TD02: { ...base.axes?.TD02, J3: [3, 0] } },
    checklist: { TD02: { J3: 1 } }, artifacts: {}, verify: {},
  }, core), loaded);
  const td02 = one.domains.find((d) => d.code === "TD02");
  ok("근거가 하나면 소유로 올리지 않는다",
     td02?.axes.J3.state === "CONFIRMED" && td02.axes.J3.evidence === 1,
     `J3 ${td02?.axes.J3.state} · 근거 ${td02?.axes.J3.evidence}`);
  /* 뒤집어도 같다: 선별 축의 두 문항을 다 채우면 근거 하나가 선다 */
  const two = score(expand({
    ...base, checklist: { TD02: { J3: 1 } }, artifacts: {}, verify: {},
  }, core), loaded);
  const td02b = two.domains.find((d) => d.code === "TD02");
  ok("선별 축의 두 문항을 다 채우면 근거 하나로 센다",
     td02b?.axes.J3.evidence === 2 && td02b.axes.J3.state === "OWNED" &&
     (td02b.axes.J3.evidence_keys ?? []).includes("second_item"),
     `근거 ${td02b?.axes.J3.evidence} (${(td02b?.axes.J3.evidence_keys ?? []).join(" · ")})`);

  /* 9. 받아 쓴 응답을 확인으로 세지 않는다 */
  const received = score(expand({
    ...base,
    axes: { TD02: Object.fromEntries(
      ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"].map((a) => [a, 1])) },
  }, core), loaded);
  const r02 = received.domains.find((d) => d.code === "TD02");
  ok("남이 정한 것을 받아 쓴 응답은 확인이 아니다",
     r02?.confirmed.length === 0 && r02.participated.length === 8 &&
     r02.zone === "Z4_INSUFFICIENT_EVIDENCE",
     `참여 ${r02?.participated.length}축 · 확인 ${r02?.confirmed.length}축`);

  /* 10. 빈 것의 뜻을 가른다 */
  const kinds = new Set<string>();
  for (const f of fx.personas) {
    const s = snaps.get(f.id) as Snapshot;
    for (const d of s.domains) for (const a of Object.values(d.axes)) kinds.add(a.missing);
  }
  ok("빈 것의 뜻을 하나로 뭉개지 않는다", kinds.size >= 3, [...kinds].sort().join(" · "));

  /* 11. reason code 가 목록 안에 있다 */
  const badCode: string[] = [];
  for (const f of fx.personas) {
    const s = snaps.get(f.id) as Snapshot;
    for (const d of s.domains) {
      for (const c of [...d.reasons, ...d.next]) {
        if (!(REASON_CODES as readonly string[]).includes(c)) badCode.push(c);
      }
    }
  }
  ok("reason code 가 목록 안에 있다", badCode.length === 0,
     badCode.length ? [...new Set(badCode)].join(" ") : `${REASON_CODES.length}가지`);

  /* 12. 엔진에 한국어 문면이 없다 */
  const files = ["engine.ts", "zones.ts", "axes.ts", "quality.ts", "packs.ts",
    "normalize.ts", "version.ts", "fixtures.ts"];
  const hangul: string[] = [];
  for (const f of files) {
    /* 주석과 개발자용 예외 문면을 걷어 낸다. 남은 자리의 한국어는
       결과에 실려 나간다 */
    const body = readFileSync(`${SCORING_DIR}/${f}`, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ")
      .replace(/throw new Error\([\s\S]*?\);/g, " ");
    for (const m of body.matchAll(/["'`][^"'`]*[가-힣][^"'`]*["'`]/g)) {
      hangul.push(`${f}:${m[0].slice(0, 24)}`);
    }
  }
  ok("엔진이 사람에게 나갈 한국어를 품지 않는다", hangul.length === 0,
     hangul.length ? hangul.slice(0, 4).join(" ") : `${files.length}벌`);
  const importsText = files.some((f) =>
    /from\s+["'].*text\.ko/.test(readFileSync(`${SCORING_DIR}/${f}`, "utf8")));
  ok("엔진이 번역표를 읽지 않는다", !importsText);

  /* 13. ME_V2 와 완전히 갈라져 있다 */
  const banned = [/me-v2/i, /ME_V2/, /decision-rules/, /career_family_weights/,
    /job_areas/, /v2_responses/, /interest\.score/];
  const leak: string[] = [];
  for (const f of [...files, "ownership.ts", "reason-codes.ts", "types.ts"]) {
    const body = readFileSync(`${SCORING_DIR}/${f}`, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    for (const re of banned) if (re.test(body)) leak.push(`${f}:${re}`);
  }
  ok("ME_V2 를 읽지 않는다", leak.length === 0, leak.join(" ") || "금지 낱말 일곱 갈래");

  /* 14. 같은 값이 나오게 하는 것 말고는 쓰지 않는다 */
  const nondet: string[] = [];
  for (const f of files) {
    const body = readFileSync(`${SCORING_DIR}/${f}`, "utf8");
    if (/Math\.random|Date\.now|new Date\(/.test(body)) nondet.push(f);
  }
  ok("무작위와 시각을 읽지 않는다", nondet.length === 0, nondet.join(" ") || `${files.length}벌`);

  /* 15. 산업·역할은 Core 를 다시 계산하지 않고 읽는 순서만 만든다 */
  const withPack = score(expand({
    ...base, industry: "INDUSTRY_MOBILITY_V2", role: "ROLE_CAE_V2",
  }, core), loaded);
  ok("팩을 골라도 Core 판정이 같다",
     stable(coreOnly(withPack)) === baseCore,
     `읽는 순서 ${withPack.context.industry?.explain_order.join("·")}`);
  ok("팩 판본이 스냅샷에 적힌다",
     withPack.module_versions.industry_pack_version === "INDUSTRY_MOBILITY_V2.v2" &&
     withPack.module_versions.role_pack_version === "ROLE_CAE_V2.v2");

  /* 16. 스냅샷에 판본 여섯 칸 */
  const v = (snaps.get("P12") as Snapshot).module_versions;
  ok("스냅샷에 판본 여섯 칸", Object.keys(v).length === 6 &&
     v.core_version === core && v.scoring_version === SCORING_VERSION,
     Object.keys(v).join(" · "));

  /* 17. 보기 넷의 뜻이 한 곳에 있다 */
  const bank = JSON.parse(readFileSync(`${CONTENT_DIR}/me-v3-items.json`, "utf8"));
  ok("보기 넷의 뜻이 한 곳에 있다",
     OWNERSHIP.length === bank.level_options.length,
     OWNERSHIP.map((o) => o.code).join(" · "));

  /* 18. 응답 품질이 Core 를 깎지 않는다 */
  const sloppy = score(expand({
    ...base,
    answers: { CN_1A: { kind: "level", index: 3 }, CN_1B: { kind: "level", index: 0 },
               CJ_PROBLEM: { kind: "level", index: 3 },
               CJ_ASSUME_REV: { kind: "scale5", value: 5 } },
  }, core), loaded);
  ok("응답 품질이 낮아도 Core 판정을 깎지 않는다",
     stable(coreOnly(sloppy)) === baseCore &&
     sloppy.response_quality.flag === "INCONSISTENT",
     `flag=${sloppy.response_quality.flag} · ${sloppy.response_quality.reasons.join(",")}`);

  /* 19. 동점을 오류로 보지 않는다 */
  const tiedPeople = fx.personas.filter((f) => (snaps.get(f.id) as Snapshot).tied.length);
  ok("같은 상태로 묶인 영역을 그대로 적는다", tiedPeople.length > 0,
     `${tiedPeople.length}벌에서 묶음이 생긴다`);

  /* 20. trace 가 문항까지 되짚는다 */
  const p12 = snaps.get("P12") as Snapshot;
  const t02 = p12.domains.find((d) => d.code === "TD02");
  const traceable = !!t02 && t02.trace.some((l) => l.startsWith("confirmed=")) &&
    t02.axes.J3.from.length > 0 && t02.axes.J3.from[0].item_id.startsWith("TD02_");
  ok("trace 가 문항 번호까지 되짚는다", traceable,
     t02?.axes.J3.from.map((x) => `${x.item_id}=${x.ownership}`).join(" "));

  /* --- 사람 열두 벌의 결과 --- */
  console.log("\n사람 열두 벌\n");
  for (const f of fx.personas) {
    const s = snaps.get(f.id) as Snapshot;
    const z1 = s.zones.Z1_EVIDENCE_ESTABLISHED.join(",") || "없음";
    const z2 = s.zones.Z2_EVIDENCE_INCOMPLETE.join(",") || "없음";
    const z4 = s.zones.Z4_INSUFFICIENT_EVIDENCE.length;
    console.log(`  ${f.id} ${f.name.padEnd(24)} ${f.tier.padEnd(8)} ` +
      `근거 ${z1.padEnd(14)} 덜 섬 ${z2.padEnd(14)} 부족 ${String(z4).padStart(2)}개 ` +
      `· ${s.response_quality.flag}`);
  }

  /* 되짚어 보는 자리. `TRACE=P12:TD02 npm run v3:scoring` */
  const want = process.env.TRACE;
  if (want) {
    const [pid, td] = want.split(":");
    const s = snaps.get(pid);
    const d = s?.domains.find((x) => x.code === td);
    console.log(`\ntrace ${pid} ${td}\n`);
    for (const line of d?.trace ?? ["없다"]) console.log(`  ${line}`);
    console.log(`\n  문항: ` + Object.values(d?.axes ?? {})
      .flatMap((a) => a.from.map((x) => `${x.item_id}=${x.ownership}`)).join(" "));
    console.log(`  근거: ` + Object.values(d?.axes ?? {})
      .filter((a) => a.evidence_keys.length)
      .map((a) => `${a.axis}[${a.evidence_keys.length}]`).join(" "));
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main();
