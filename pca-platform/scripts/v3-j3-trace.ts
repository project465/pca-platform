/**
 * J3(직접 판단) 가 올라가는 길을 **코드로 보여 준다.**
 *
 * 문서로 `선호만으로는 안 올라갑니다` 라고 적는 것과 그것이 실제로 그런
 * 것은 다른 질문이다. 그래서 사람 넷을 세워 raw 응답에서 축 상태까지
 * 한 줄씩 찍는다. 선호만 높은 사람이 J3 확인으로 올라가면 걸린다.
 *
 * 같은 자리에서 **독립 교차검증 지도**도 찍는다. 같은 construct 와 같은
 * response type 으로 같은 장면을 다시 묻는 자리는 되풀이라서 독립으로
 * 세지 않는다(`measurement/registry.ts` 의 `independent`).
 *
 *   npm run v3:j3
 *   J3_SNAP=write npm run v3:j3    사람 열두 벌 지문을 적어 둔다 (전후 대조용)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CONTENT_DIR, core as coreEntry, registry } from "../src/lib/me-v3/core-registry";
import { load, score, coreOnly } from "../src/lib/me-v3/scoring/engine";
import { expand, stable, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { routedFor, type BankItem } from "../src/lib/me-v3/scoring/normalize";
import { buildResult } from "../src/lib/me-v3/result/build";
import { headlineKo, FIRST_MOVE_KO } from "../src/lib/me-v3/result/text.ko";
import {
  constructRegistry, SCALE_TO_TYPE, independent,
  type Construct, type CrossSignal, type ResponseType,
} from "../src/lib/me-v3/measurement/registry";
import type { Answer, Axis, Submission } from "../src/lib/me-v3/scoring/types";
import { join } from "node:path";

const SNAP = "sites/pca-platform/assessment/ME_V3/j3-before.json";
let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const coreCode = process.env.CORE
  ?? registry().cores.filter((c) => c.status === "building")[0].code;
const loaded = load(coreCode);
type Item = {
  item_id: string; module: string; measurement_axis: string; tier: string;
  evidence_axis: string | null; response_scale: string | null;
  technical_domain: string | null; wording?: string; reverse_flag?: boolean;
};
const items = loaded.bank.items as unknown as Item[];
const reg = constructRegistry(coreCode);
const CON = new Map(reg.items.map((r) => [r.item_id, r.primary]));
type DomainData = { code: string; name: string; artifacts: string[]; verify_targets: string[] };
const domains = loaded.domains.domains as unknown as DomainData[];
const DOM = domains.map((d) => d.code);
const lists = JSON.parse(readFileSync(
  join(CONTENT_DIR, coreEntry(coreCode).files.checklists!), "utf8")) as
  { domains: Record<string, Record<string, { text: string }[]>> };

console.log(`  core  ${coreCode} · ${loaded.bank.assessment_version}\n`);

/* ────────────────────────────────────────────────────────────────────
 * 1. J3 를 올릴 수 있는 길. **은행에서 세어 적는다**
 * ──────────────────────────────────────────────────────────────── */
const TD = "TD01";
const j3 = items.filter((i) => i.evidence_axis === "J3");
const sceneOf = (i: Item) => i.module;
const sig = (i: Item): CrossSignal => ({
  construct: CON.get(i.item_id) as Construct,
  response_type: SCALE_TO_TYPE[i.response_scale ?? ""] as ResponseType,
  scene: sceneOf(i), axis: i.evidence_axis,
});

console.log("── J3 를 올릴 수 있는 입력 ──");
const common = j3.filter((i) => !i.technical_domain);
const perDomain = j3.filter((i) => i.technical_domain === TD);
for (const i of [...common, ...perDomain]) {
  const s = sig(i);
  console.log(`  ${i.item_id.padEnd(24)} ${i.module.padEnd(13)} ${String(s.construct).padEnd(12)} ${s.response_type.padEnd(16)} ${i.tier}`);
}
console.log(`  checklist:${TD}.J3        근거 고르기    EVIDENCE     EVIDENCE_PICK    항목 ${(lists.domains[TD]?.J3 ?? []).length}개`);

/* ────────────────────────────────────────────────────────────────────
 * 2. 사람 넷. raw → normalized → J3 상태
 * ──────────────────────────────────────────────────────────────── */
type Case = { id: string; name: string; build: () => Submission };

/** 열두 영역에 아무 경험도 없는 바닥 */
function floor(tier: Submission["tier"] = "PRO"): Submission {
  const answers: Record<string, Answer> = {};
  const base: Submission = {
    attempt_id: "j3", tier, stage: "master", grad_field: "STEM",
    undergrad_core: null, answers, checklists: {}, artifacts: {}, verifications: {},
    opened: { probe: [...DOM], deep: [...DOM] },
    industry_interest: [], role_interest: [], org_interest: [],
    industry_pack: null, role_pack: null, asked: [],
  };
  for (const i of items) {
    if (!routedFor(base, i as unknown as BankItem)) continue;
    switch (i.response_scale) {
      case "L0~L3": answers[i.item_id] = { kind: "level", index: 0 }; break;
      case "5보기": answers[i.item_id] = { kind: "scale5", value: 3 }; break;
      /* 해 본 정도는 열어 둔다: 0 으로 내리면 선별 둘째 문항이 routing 밖으로
         빠져서 재려던 문항이 애초에 서지 않는다 */
      case "3보기": answers[i.item_id] = { kind: "exposure", value: 2 }; break;
      default: break;
    }
  }
  return base;
}
const lvl = (s: Submission, ids: string[], n: number) => {
  for (const id of ids) s.answers[id] = { kind: "level", index: n };
  return s;
};
const j3Ids = (mod: string) => items
  .filter((i) => i.module === mod && i.evidence_axis === "J3"
    && (!i.technical_domain || i.technical_domain === TD)).map((i) => i.item_id);

const CASES: Case[] = [
  {
    id: "A", name: "선호만 (preference only)",
    build: () => {
      const s = floor();
      /**
       * **행동을 주장하지 않는 입력에만 맨 위를 고른다.**
       *
       * 선호와 routing 과 태도만 높이고 소유 사다리는 전부 바닥에 둔다.
       * 그래서 이 사람은 `해 본 일` 을 한 번도 주장하지 않는다. 아래
       * 성립 검사가 그것을 센다: 사다리 가운데 0 이 아닌 칸이 하나라도
       * 있으면 이 벌은 `선호만` 이 아니고 검사가 재려던 것을 못 잰다.
       */
      const soft = reg.items
        .filter((r) => r.primary === "PREFERENCE" || r.primary === "ROUTING_ONLY")
        .map((r) => r.item_id);
      for (const id of soft) {
        const i = items.find((x) => x.item_id === id);
        if (!i) continue;
        if (i.response_scale === "L0~L3") s.answers[id] = { kind: "level", index: 3 };
        else if (i.response_scale === "5보기") s.answers[id] = { kind: "scale5", value: 5 };
      }
      for (const i of items.filter((x) => x.measurement_axis === "interest"
        || x.measurement_axis === "learning_intent")) {
        s.answers[i.item_id] = { kind: "scale5", value: 5 };
      }
      return s;
    },
  },
  {
    id: "B", name: "소유만 (ownership only · 근거 0)",
    build: () => lvl(floor(), j3Ids("PROBE-S4"), 3),
  },
  {
    id: "C", name: "소유 + 근거",
    build: () => {
      const s = lvl(floor(), j3Ids("PROBE-S4"), 3);
      s.checklists = { [`${TD}.J3`]: (lists.domains[TD]?.J3 ?? []).slice(0, 2).map((x) => x.text) };
      return s;
    },
  },
  {
    id: "D", name: "판단 + 산출물 + 검증 전부",
    build: () => {
      const s = floor();
      for (const ax of ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"]) {
        lvl(s, items.filter((i) => (i.module === "PROBE-S4" || i.module === "DEEP-S8")
          && i.technical_domain === TD && i.evidence_axis === ax).map((i) => i.item_id), 3);
      }
      const cl: Record<string, string[]> = {};
      for (const ax of ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"]) {
        cl[`${TD}.${ax}`] = (lists.domains[TD]?.[ax] ?? []).slice(0, 2).map((x) => x.text);
      }
      s.checklists = cl;
      const d = domains.find((x) => x.code === TD)!;
      s.artifacts = { [TD]: d.artifacts.slice(0, 2) };
      s.verifications = { [TD]: d.verify_targets.slice(0, 2) };
      return s;
    },
  },
];

console.log("\n── 사람 넷의 J3 ──");
console.log(`  벌  이름                          J3 상태        확인  소유  근거  묶음(${TD})                공통 J3`);
type Seen = {
  state: string; confirmed: boolean; owned: boolean;
  /** 영역에 걸치지 않는 J3. **결과지가 `직접 정한 것으로 확인` 으로 적는 자리** */
  cConfirmed: boolean; cOwned: boolean; cFrom: string[];
};
const seen: Record<string, Seen> = {};
for (const c of CASES) {
  const sub = c.build();
  const s = score(sub, loaded);
  const d = s.domains.find((x) => x.code === TD)!;
  const a = d.axes.J3 as { state: string; evidence: number; from: { item_id: string }[] };
  const confirmed = a.state === "CONFIRMED" || a.state === "OWNED";
  /* **영역 축만 재면 새는 자리를 못 본다.** 공통 판단과 학위 묶음은 기술영역이
     없어서 영역 J3 에 들어가지 않고 `context.common` 으로 간다. 결과지가
     그것을 `영역을 가리지 않고 확인된 판단` 으로 적는다 */
  const cm = s.context.common.filter((r) => r.axis === "J3");
  seen[c.id] = {
    state: a.state, confirmed, owned: a.state === "OWNED",
    cConfirmed: cm.some((r) => r.confirmed),
    cOwned: cm.some((r) => r.ownership === "DECIDED_USED"),
    cFrom: cm.filter((r) => r.confirmed).map((r) => r.item_id),
  };
  const v = seen[c.id];
  console.log(`  ${c.id}   ${c.name.padEnd(30)} ${a.state.padEnd(14)} ${confirmed ? "예" : "아니오"}${confirmed ? "   " : " "} `
    + `${v.owned ? "예" : "아니오"}${v.owned ? "   " : " "} ${String(a.evidence).padStart(2)}   `
    + `${d.zone.padEnd(26)} 공통J3 ${v.cConfirmed ? "확인" : "아직"}${v.cOwned ? "·직접정함" : ""}`
    + `${v.cFrom.length ? " ← " + v.cFrom.join(",") : ""}`);
}

/**
 * **이 벌이 성립하는지 먼저 센다.**
 *
 * `선호만` 벌이 소유 사다리에서 한 칸이라도 올라가 있으면 그것은 선호만
 * 답한 사람이 아니고, 아래 검사가 통과해도 아무것도 증명하지 못한다.
 * 이 저장소에서 `한 번도 돌지 않은 검사` 가 두 번 나왔으므로 벌의 성립을
 * 먼저 센다.
 */
{
  const a = CASES.find((c) => c.id === "A")!.build();
  const claimed = Object.entries(a.answers)
    .filter(([id, v]) => {
      if (v.kind !== "level" || v.index === 0) return false;
      const it = items.find((x) => x.item_id === id);
      /* 선호·routing 으로 적힌 자리는 빼고 센다 */
      return CON.get(id) !== "PREFERENCE" && CON.get(id) !== "ROUTING_ONLY" && !!it;
    }).map(([id]) => id);
  ok("`선호만` 벌이 소유 사다리를 한 칸도 올리지 않는다", claimed.length === 0,
     claimed.length ? `올라간 자리 ${claimed.length}개: ${claimed.slice(0, 4).join(" ")}`
       : "사다리 전부 바닥");
}

ok("선호만 높은 사람의 영역 J3 가 확인으로 올라가지 않는다", !seen.A.confirmed,
   `A 영역 J3=${seen.A.state}`);
ok("선호만 높은 사람의 영역 J3 가 소유로 올라가지 않는다", !seen.A.owned,
   `A 영역 J3=${seen.A.state}`);
/* **여기가 실제로 새던 자리다.** 선호를 묻는 문항 하나가 공통 J3 를
   `직접 정한 것으로 확인` 까지 올릴 수 있었다 */
ok("선호만 높은 사람의 공통 J3 가 확인으로 올라가지 않는다", !seen.A.cConfirmed,
   seen.A.cFrom.length ? `올라간 자리: ${seen.A.cFrom.join(" ")}` : "공통 J3 아직");
ok("선호만 높은 사람의 공통 J3 가 `직접 정함` 으로 올라가지 않는다", !seen.A.cOwned,
   seen.A.cOwned ? `올라간 자리: ${seen.A.cFrom.join(" ")}` : "공통 J3 아직");
ok("소유만 주장하고 근거가 없으면 확인까지다", seen.B.confirmed && !seen.B.owned,
   `B J3=${seen.B.state}`);
ok("소유에 근거 둘이 붙으면 소유가 선다", seen.C.owned, `C J3=${seen.C.state}`);
ok("판단과 산출물과 검증이 다 있으면 근거가 선 영역이 된다", seen.D.owned,
   `D J3=${seen.D.state}`);

/* ────────────────────────────────────────────────────────────────────
 * 3. 독립 교차검증 지도. **같은 말을 다시 묻는 자리는 세지 않는다**
 * ──────────────────────────────────────────────────────────────── */
console.log("\n── J3 독립 교차검증 (한 응시 기준) ──");
/* 한 응시에서 실제로 서는 J3 입력. 학위 묶음은 하나만 받는다 */
const inOneAttempt = [
  ...common.filter((i) => i.module === "CORE-JUDGE" || i.module === "MS-CORE"
    || i.module === "CONSIST" || i.module === "TRANS-10"),
  ...perDomain,
];
const EV: CrossSignal = {
  construct: "EVIDENCE", response_type: "EVIDENCE_PICK",
  scene: "근거 고르기", axis: "J3",
};
const pool = [...inOneAttempt.map(sig), EV];
const groups: CrossSignal[][] = [];
for (const s of pool) {
  const g = groups.find((x) => !independent(x[0], s));
  if (g) g.push(s); else groups.push([s]);
}
console.log("  독립으로 세는 묶음:");
for (const g of groups) {
  console.log(`    ${g[0].construct} × ${g[0].response_type} @ ${g[0].scene} (문항 ${g.length})`);
}
ok("J3 가 독립 신호 둘 이상에서 받쳐진다", groups.length >= 2,
   `독립 묶음 ${groups.length}개`);
ok("J3 가 한 문항에만 매달리지 않는다", inOneAttempt.length >= 3,
   `한 응시에 서는 J3 입력 ${inOneAttempt.length}개 + 근거 고르기`);
/* **같은 construct·같은 척도·같은 장면은 하나로 센다** */
const repeats = groups.filter((g) => g.length > 1);
console.log(`  되풀이로 묶인 자리 ${repeats.length}곳: `
  + (repeats.map((g) => `${g[0].scene}×${g.length}`).join(" ") || "없음"));

/* ────────────────────────────────────────────────────────────────────
 * 4. 사람 열두 벌 지문. 전후 대조용
 * ──────────────────────────────────────────────────────────────── */
const fx = JSON.parse(readFileSync(
  "sites/pca-platform/assessment/ME_V3/personas.json", "utf8")) as { personas: Fixture[] };
const now: Record<string, unknown> = {};
for (const f of fx.personas) {
  const s = score(expand(f, coreCode), loaded);
  const m = buildResult(s, loaded, { packs: { industries: [], roles: [] } });
  now[f.id] = {
    core: stable(coreOnly(s)),
    quality: s.response_quality.flag,
    headline: headlineKo(m).title,
    first: FIRST_MOVE_KO[m.overview.first_move],
    gaps: m.gaps.length, actions: m.actions.length,
  };
}
if (process.env.J3_SNAP === "write") {
  writeFileSync(SNAP, JSON.stringify({
    note: "사람 열두 벌의 Core 지문 기준선. v3:j3 가 매번 이것과 글자로 견주어"
      + " 의도한 변화 밖의 차이를 잡는다. 처음 적은 때는 2026-10-10 이고"
      + " CJ_GIVEN_REV 의 문면을 고치기 직전 상태다. 판정을 일부러 바꾼 회차에만"
      + " J3_SNAP=write 로 다시 적는다. 그렇지 않은 변화는 걸려야 한다.",
    bank: loaded.bank.assessment_version, at: new Date().toISOString().slice(0, 10),
    personas: now,
  }, null, 2) + "\n");
  console.log(`\n  적었다  ${SNAP} — 사람 ${Object.keys(now).length}벌`);
} else if (existsSync(SNAP)) {
  const was = JSON.parse(readFileSync(SNAP, "utf8")) as { personas: Record<string, unknown> };
  const diff: string[] = [];
  for (const id of Object.keys(now)) {
    const a = JSON.stringify(was.personas[id]), b = JSON.stringify(now[id]);
    if (a !== b) diff.push(id);
  }
  console.log("");
  ok("사람 열두 벌의 Core 결과가 고치기 전과 같다", diff.length === 0,
     diff.length ? `달라진 벌: ${diff.join(" ")}` : `열두 벌 지문 그대로`);
} else {
  console.log(`\n  (지문이 없다. \`J3_SNAP=write npm run v3:j3\` 로 먼저 적는다)`);
}

console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
process.exit(fail ? 1 : 0);
