/**
 * **학과마다 여덟 항목을 사람이 읽을 수 있는 말로 재는 자리**
 * (PCU 전 학과 콘텐츠 최종 QA §1 · §2 · §8~§14).
 *
 * `pcu:content` 가 묻는 것은 `그 자리가 Core 에 붙어 있고 층이 비지
 * 않았는가` 까지다. 여기서 묻는 것은 **학생이 실제로 읽는 여덟 자리가 그
 * 학과의 말인가**이고, 자리마다 넷으로 가른다.
 *
 *   PASS     그 학과 학생이 읽으면 자기 전공 이야기로 읽힌다
 *   WEAK     맞는 말인데 어느 학과에나 쓸 수 있는 깊이에서 멈췄다
 *   GENERIC  같은 Core 의 다른 자리와 글자까지 겹친다
 *   WRONG    없거나, 그 Core 에 없는 코드를 가리키거나, 금지한 말이 들어 있다
 *
 * 여덟 항목은 받은 규격의 차례 그대로다.
 *
 *   1 검사에서 학생이 읽는 경험 예시   `examples.scene`
 *   2 Domain 설명                      `domain_emphasis.lead`
 *   3 결과 headline 의 학과 맥락       학과 이름과 갈래 이름이 머리에 서는가
 *   4 확인된 경험 설명                 `examples.artifacts`
 *   5 Evidence 예시                    `examples.evidence`
 *   6 Gap 설명                         그 영역의 `verify_targets` 와 `artifacts`
 *   7 Action                           `evidence_action.first` · `next`
 *   8 Industry / Role 연결             `industry_mapping` · `role_mapping`
 *
 * **읽기만 한다.** 등록부도 DB 도 쓰지 않고 서버도 부르지 않는다. 그리고
 * **측정과 판정에 한 글자도 닿지 않는다**: 여기서 세는 것은 전부 사람이
 * 읽는 글이다.
 *
 *   npm run pcu:dept
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  allLeaves, offered, universities, visible, type CampusLeaf,
} from "../src/lib/campus/registry";
import {
  CONTENT_DIR, core as coreEntry, coreFile, packs as packsOf,
  specializationOf, type CoreEntry, type Specialization,
} from "../src/lib/me-v3/core-registry";

const OUT = process.env.OUT ?? "var/pcu-dept";
const UNIV = process.env.UNIV ?? "PCU";

type Verdict = "PASS" | "WEAK" | "GENERIC" | "WRONG";

/** 여덟 항목의 이름. **차례가 규격의 차례다** */
const ITEMS = [
  "검사 경험 예시", "Domain 설명", "결과 머리말", "확인된 경험 설명",
  "Evidence 예시", "Gap 설명", "Action", "Industry/Role",
] as const;

/* ──────────────────────────────────────────────────────────────────
   금지한 말. **한도를 0 으로 둔 말에는 자연스러운 자리가 없다**
   ────────────────────────────────────────────────────────────────── */

/** §8 추상명사는 Evidence 로 쓰지 않는다 */
const ABSTRACT = [
  "열심히", "성실", "자신감", "열정", "책임감", "적극적", "노력한",
  "관심이 많", "역량을 쌓", "소통 능력", "협업 능력", "문제해결 능력",
];

/** §9 Gap 에 쓰지 않는 말 */
const BAD_GAP = ["역량이 부족", "적합도가 낮", "경험이 부족", "능력이 부족", "미흡"];

/** §10 Action 에 쓰지 않는 말 */
const BAD_ACTION = [
  "경험을 더 쌓", "역량을 강화", "관련 활동을 해", "관심 분야를 탐색",
  "노력해 보", "열심히 해", "다양한 경험을", "꾸준히 준비",
];

/** §13 AI 가 쓴 티가 나는 말 */
const AI_TONE = [
  "종합적으로", "효과적으로", "체계적으로", "역량을 기반으로",
  "다양한 분야에서", "적극적으로", "다각도로", "극대화",
];

/** §10 Action 네 요소를 가리키는 말 */
const SITU = /수업|과제|캡스톤|실습|동아리|공모전|현장실습|프로젝트|학생회|대회|조별|스터디|봉사|인턴/;
/**
 * 기준을 가리키는 말.
 *
 * **낱말을 좁게 두면 멀쩡한 문장이 걸린다.** `적용할 조문의 문면` 과
 * `식재 지침의 간격 규정` 과 `틀어짐 허용 범위` 는 전부 대어 볼 자를 이름으로
 * 적은 것이고, 그것이 §10 이 요구하는 기준이다. 반대로 `골라` 와 `고른` 은
 * 넣지 않는다: 그 말은 **어느 경험을 적을지 고른다**는 뜻으로 거의 모든
 * 문장에 들어 있어서, 넣으면 이 줄이 아무것도 세지 않는다.
 */
const CRIT = /기준|근거|조건|요건|한계|규격|선을|목표|우선순위|허용|범위|지침|규정|조문|항목|가정|전제/;
/** 남기는 것. `적어 둔다` 와 `적는다` 와 `적고` 는 같은 일이다 */
const ARTI = /남긴|적어|적는|적고|표|문서|한 장|기록|보고서|자료|도면|코드|수업안|비교표|정리|대조/;
const ACT = /다$|본다$|쓴다$|만든다$|고른다$|정한다$|견준다$|남긴다$|적어 둔다$/;

function has(s: string, list: string[]): string[] {
  return list.filter((w) => s.includes(w));
}

/* ──────────────────────────────────────────────────────────────────
   그 자리가 받는 다섯 층. `result/spec-view.ts` 와 같은 자다
   ────────────────────────────────────────────────────────────────── */

type Layers = {
  scene: string[]; artifacts: string[]; evidence: string[];
  domainLead: string[]; industryLead: string[]; roleLead: string[];
  first: string; next: string;
  /** §11 지원서와 면접에서 꺼내는 재료. **아직 어느 자리에도 없다** */
  application: string[];
};

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function layersOf(s: Specialization | null, c: CoreEntry | null): Layers {
  const pick = (k: string) =>
    ((s as unknown as Record<string, unknown>)?.[k]
      ?? (c as unknown as Record<string, unknown>)?.[k]);
  const ex = obj(pick("examples")), ea = obj(pick("evidence_action"));
  const ap = pick("application");
  return {
    scene: list(ex.scene), artifacts: list(ex.artifacts), evidence: list(ex.evidence),
    domainLead: list(obj(pick("domain_emphasis")).lead),
    industryLead: list(obj(pick("industry_mapping")).lead),
    roleLead: list(obj(pick("role_mapping")).lead),
    first: typeof ea.first === "string" ? ea.first : "",
    next: typeof ea.next === "string" ? ea.next : "",
    application: Array.isArray(ap) ? list(ap)
      : [obj(ap).resume, ...list(obj(ap).interview)].filter((x): x is string => typeof x === "string"),
  };
}

/** 그 Core 의 영역 사전. 이름과 Gap 재료를 읽는다 */
type DomainRow = {
  code: string; name: string;
  artifacts?: string[]; verify_targets?: string[];
};
const domainCache = new Map<string, DomainRow[]>();
function domainsOf(core: string): DomainRow[] {
  if (domainCache.has(core)) return domainCache.get(core)!;
  let rows: DomainRow[] = [];
  try {
    rows = (coreFile<{ domains?: DomainRow[] }>(core, "domains").domains ?? []);
  } catch { rows = []; }
  domainCache.set(core, rows);
  return rows;
}

/** 그 Core 의 팩 코드와 이름. 읽지 못하면 비운다(세지 않는다) */
const packCache = new Map<string, Map<string, string>>();
function packNames(core: string, kind: "industry" | "role"): Map<string, string> {
  const key = `${core}/${kind}`;
  if (packCache.has(key)) return packCache.get(key)!;
  const m = new Map<string, string>();
  try {
    const p = packsOf<{ packs?: { code?: string; name_ko?: string; name?: string }[] }>(core, kind);
    for (const x of p.packs ?? []) {
      if (x.code) m.set(x.code, x.name_ko ?? x.name ?? x.code);
    }
  } catch { /* 팩 파일이 없으면 세지 않는다 */ }
  packCache.set(key, m);
  return m;
}

/* ──────────────────────────────────────────────────────────────────
   받고 쓰지 않는 자리. **적어 두고 읽지 않으면 적어 두지 않은 것과 같다**
   ────────────────────────────────────────────────────────────────── */

/** 읽는 층(`result/spec-view.ts`)이 그 층을 내놓는가 */
function exposed(field: string): boolean {
  const src = readFileSync("src/lib/me-v3/result/spec-view.ts", "utf8");
  return new RegExp(`^\\s*${field}:`, "m").test(src);
}

/** 그 층을 실제로 읽는 자리가 있는가. **읽는 층 자신은 세지 않는다** */
function read(field: string): string[] {
  try {
    const out = execFileSync("grep", [
      "-rn", "--include=*.ts", "--include=*.tsx", "-F", `sv.${field}`, "src",
    ], { encoding: "utf8" });
    return out.split("\n").filter((x) => x && !x.includes("spec-view.ts"));
  } catch { return []; }
}

type Reach = { layer: string; state: string };

function reachOf(): Reach[] {
  const fields = [
    ["scene", "검사 경험 예시"], ["domainLead", "Domain 설명"],
    ["artifacts", "확인된 경험 설명"], ["evidence", "Evidence 예시"],
    ["industryLead", "산업"], ["roleLead", "직무"],
    ["evidenceFirst", "Action(먼저)"], ["evidenceNext", "Action(다음)"],
    ["application", "지원서·면접 재료"],
  ] as [string, string][];
  return fields.map(([f, name]) => {
    if (!exposed(f)) return { layer: name, state: "읽는 층이 내놓지 않는다" };
    const hits = read(f);
    return {
      layer: name,
      state: hits.length ? `읽는 자리 ${hits.length}` : "내놓기만 하고 읽는 자리가 없다",
    };
  });
}

/* ──────────────────────────────────────────────────────────────────
   자리마다 여덟 판정
   ────────────────────────────────────────────────────────────────── */

type Row = {
  leaf: string; name: string; college: string; catalog: string;
  core: string; spec: string;
  v: Verdict[]; why: string[][];
  /** 묶음 열쇠. 같은 열쇠는 같은 글을 받는다 */
  key: string;
};

const NEED = { scene: 3, artifacts: 3, evidence: 5, domainLead: 3, industry: 2, role: 2 };

function worst(a: Verdict, b: Verdict): Verdict {
  const rank: Record<Verdict, number> = { PASS: 0, WEAK: 1, GENERIC: 2, WRONG: 3 };
  return rank[a] >= rank[b] ? a : b;
}

function main(): void {
  const u = universities().find((x) => x.university_code === UNIV);
  if (!u) { console.error(`${UNIV} 를 등록부에서 찾지 못했다`); process.exit(1); }
  const leaves = allLeaves(u).filter(offered).filter((r) => visible(r.leaf));

  /* ── §1 Coverage. **개수만 세지 않고 학과 이름까지 적는다** ── */
  const routing = leaves.filter((r) => r.leaf.routing_only);
  const noCore = leaves.filter((r) => !r.leaf.core_code && !r.leaf.routing_only);
  const withCore = leaves.filter((r) => r.leaf.core_code);

  /* 같은 (Core · 갈래) 묶음을 가리키는 자리. 글은 묶음마다 한 번만 잰다 */
  const bundle = new Map<string, CampusLeaf[]>();
  for (const r of withCore) {
    const k = `${r.leaf.core_code}/${r.leaf.specialization ?? "-"}`;
    bundle.set(k, [...(bundle.get(k) ?? []), r]);
  }
  const layers = new Map<string, Layers>();
  for (const [k, rs] of bundle) {
    const r = rs[0];
    layers.set(k, layersOf(
      r.leaf.specialization ? specializationOf(r.leaf.core_code!, r.leaf.specialization) : null,
      (() => { try { return coreEntry(r.leaf.core_code!); } catch { return null; } })(),
    ));
  }

  /* 서로 다른 학과가 한 묶음을 나눠 쓰는 자리. **같은 학과의 학년도 차이는 세지 않는다** */
  const shared: { key: string; names: string[] }[] = [];
  for (const [k, rs] of bundle) {
    const names = [...new Set(rs.map((r) => r.leaf.name))];
    if (names.length > 1) shared.push({ key: k, names });
  }

  /* 같은 이름의 학과가 두 Catalog 에서 다른 묶음을 가리키는 자리 */
  const byName = new Map<string, Set<string>>();
  for (const r of withCore) {
    const k = `${r.leaf.core_code}/${r.leaf.specialization ?? "-"}`;
    byName.set(r.leaf.name, new Set([...(byName.get(r.leaf.name) ?? []), k]));
  }
  const yearMismatch = [...byName.entries()].filter(([, ks]) => ks.size > 1);

  /* ── 묶음 사이 글자 겹침. 같은 Core 안에서만 본다 ── */
  const dupLine = new Map<string, string[]>();   // 글 한 줄 → 그 줄을 든 묶음
  for (const [k, l] of layers) {
    for (const t of [...l.scene, ...l.artifacts, ...l.evidence, l.first, l.next]) {
      if (!t) continue;
      dupLine.set(t, [...(dupLine.get(t) ?? []), k]);
    }
  }
  const dupOf = (k: string, xs: string[]) =>
    xs.filter((t) => (dupLine.get(t) ?? []).some((o) => o !== k));

  /* `(산업, 직무)` 와 `domain lead` 가 같은 Core 의 다른 갈래와 같으면 GENERIC(§3) */
  const sig = new Map<string, string[]>();
  for (const [k, l] of layers) {
    const core = k.split("/")[0];
    const s = `${core}|${l.industryLead.join(",")}|${l.roleLead.join(",")}|${l.domainLead.join(",")}`;
    sig.set(s, [...(sig.get(s) ?? []), k]);
  }
  const sigDup = new Set<string>();
  for (const [, ks] of sig) if (ks.length > 1) for (const k of ks) sigDup.add(k);

  /* Action 꼬리 겹침. 끝 24자가 같으면 틀을 돌려 쓴 것이다 */
  const tail = new Map<string, string[]>();
  for (const [k, l] of layers) {
    for (const t of [l.first, l.next]) {
      if (t.length < 24) continue;
      const e = t.slice(-24);
      tail.set(e, [...(tail.get(e) ?? []), k]);
    }
  }

  /** 그 Core 를 쓰는 **학과 이름**의 수. Catalog 쌍둥이를 둘로 세지 않는다 */
  const coreDepts = new Map<string, number>();
  for (const r of withCore) {
    const names = new Set(withCore.filter((x) => x.leaf.core_code === r.leaf.core_code)
      .map((x) => x.leaf.name));
    coreDepts.set(r.leaf.core_code!, names.size);
  }

  const rows: Row[] = [];
  for (const r of withCore) {
    const core = r.leaf.core_code!;
    const key = `${core}/${r.leaf.specialization ?? "-"}`;
    const l = layers.get(key)!;
    const v: Verdict[] = ITEMS.map(() => "PASS");
    const why: string[][] = ITEMS.map(() => []);
    const mark = (i: number, g: Verdict, msg: string) => {
      v[i] = worst(v[i], g); why[i].push(msg);
    };

    const codes = new Set(domainsOf(core).map((d) => d.code));
    const ind = packNames(core, "industry"), role = packNames(core, "role");

    /* 1 검사 경험 예시 */
    if (!l.scene.length) mark(0, "WRONG", "장면이 없다");
    else {
      if (l.scene.length < NEED.scene) mark(0, "WEAK", `장면 ${l.scene.length} / ${NEED.scene}`);
      const d = dupOf(key, l.scene);
      if (d.length) mark(0, "GENERIC", `다른 묶음과 같은 줄 ${d.length}`);
      for (const w of has(l.scene.join(" "), AI_TONE)) mark(0, "WEAK", `AI 식 말 ${w}`);
    }

    /* 2 Domain 설명 */
    if (!l.domainLead.length) mark(1, "WRONG", "강조 영역이 없다");
    else {
      if (l.domainLead.length < NEED.domainLead) {
        mark(1, "WEAK", `강조 영역 ${l.domainLead.length} / ${NEED.domainLead}`);
      }
      for (const c of l.domainLead) {
        if (codes.size && !codes.has(c)) mark(1, "WRONG", `${c} 가 이 Core 의 영역에 없다`);
      }
    }

    /**
     * 3 결과 머리말 — 그 학과의 이름이 선다.
     *
     * **갈래가 없는 것이 맞는 상태인 자리가 있다.** 학과 하나가 쓰는
     * Core(간호 · 생명공학 · 심리상담)에서 갈래를 따로 두는 것은 같은 말을
     * 두 자리에 적는 일이고, 그 자리의 머리말은 Core 이름만으로도 그 학과를
     * 가리킨다. 그래서 세는 것은 **그 Core 를 학과 여럿이 나눠 쓰는가**다.
     */
    if (!r.leaf.specialization) {
      const n = shared.find((s) => s.key === key);
      if (n) {
        mark(2, "WRONG", `갈래 없이 Core 를 바로 가리키고 그 묶음을 ${n.names.length}학과가 쓴다`);
      } else if (coreDepts.get(core)! > 1) {
        mark(2, "WEAK", `갈래가 없는데 이 Core 를 ${coreDepts.get(core)}학과가 쓴다`);
      }
    } else if (!specializationOf(core, r.leaf.specialization)) {
      mark(2, "WRONG", `갈래 ${r.leaf.specialization} 가 등록부에 없다`);
    }

    /* 4 확인된 경험 설명 */
    if (!l.artifacts.length) mark(3, "WRONG", "남기는 것이 없다");
    else {
      if (l.artifacts.length < NEED.artifacts) {
        mark(3, "WEAK", `남기는 것 ${l.artifacts.length} / ${NEED.artifacts}`);
      }
      const d = dupOf(key, l.artifacts);
      if (d.length) mark(3, "GENERIC", `다른 묶음과 같은 줄 ${d.length}`);
    }

    /* 5 Evidence 예시 */
    if (!l.evidence.length) mark(4, "WRONG", "근거 예시가 없다");
    else {
      if (l.evidence.length < NEED.evidence) {
        mark(4, "WEAK", `근거 예시 ${l.evidence.length} / ${NEED.evidence}`);
      }
      const d = dupOf(key, l.evidence);
      if (d.length) mark(4, "GENERIC", `다른 묶음과 같은 줄 ${d.length}`);
      for (const w of has(l.evidence.join(" "), ABSTRACT)) {
        mark(4, "WRONG", `추상명사 ${w} 를 근거로 썼다`);
      }
      /* 보이는 세 줄의 머리가 전부 같으면 그 학과의 장면이 안 보인다 */
      const open = l.evidence.slice(0, 3).map((t) => t.split(/\s+/)[0]);
      if (open.length === 3 && new Set(open).size === 1) {
        mark(4, "WEAK", `보이는 세 줄이 같은 말로 시작한다(${open[0]})`);
      }
    }

    /* 6 Gap 설명 — 그 영역의 재료가 있어야 무엇이 비었는지 적을 수 있다 */
    const lead = domainsOf(core).filter((d) => l.domainLead.includes(d.code));
    if (!lead.length) mark(5, "WRONG", "강조 영역의 사전을 찾지 못했다");
    else {
      for (const d of lead) {
        if (!(d.verify_targets ?? []).length) mark(5, "WEAK", `${d.name} 에 견줄 것이 없다`);
        if (!(d.artifacts ?? []).length) mark(5, "WEAK", `${d.name} 에 남길 것이 없다`);
      }
      const txt = lead.map((d) => `${(d.verify_targets ?? []).join(" ")} ${(d.artifacts ?? []).join(" ")}`).join(" ");
      for (const w of has(txt, BAD_GAP)) mark(5, "WRONG", `금지한 말 ${w}`);
    }

    /* 7 Action — 상황 · 행동 · 기준 · Evidence 넷이 보여야 한다 */
    if (!l.first || !l.next) mark(6, "WRONG", "다음에 할 일이 비어 있다");
    else {
      /**
       * **상황은 두 걸음을 묶어서 센다.**
       *
       * `먼저` 와 `다음` 은 한 Action 의 두 걸음이고 같은 자리에서 일어난다.
       * 걸음마다 `수업 과제에서` 를 요구하면 같은 말이 두 번 서고, 그
       * 되풀이가 바로 §13 이 막는 모양이다. 어디에서 하는 일인지는 한 번만
       * 서면 된다. 행동과 기준과 남기는 것은 걸음마다 센다: 그 셋 가운데
       * 하나가 빠진 걸음은 **그 걸음만으로는 무엇을 하라는 것인지 모른다.**
       */
      if (!SITU.test(`${l.first} ${l.next}`)) {
        mark(6, "WEAK", "두 걸음 어디에도 어디에서 하는 일인지가 없다");
      }
      for (const [name, t] of [["먼저", l.first], ["다음", l.next]] as [string, string][]) {
        for (const w of has(t, BAD_ACTION)) mark(6, "WRONG", `${name}: 금지한 말 ${w}`);
        for (const w of has(t, AI_TONE)) mark(6, "WEAK", `${name}: AI 식 말 ${w}`);
        const miss: string[] = [];
        if (!ACT.test(t)) miss.push("행동");
        if (!CRIT.test(t)) miss.push("기준");
        if (!ARTI.test(t)) miss.push("남기는 것");
        if (miss.length) mark(6, "WEAK", `${name}: ${miss.join("·")} 이 보이지 않는다`);
        if (t.length >= 24) {
          const o = (tail.get(t.slice(-24)) ?? []).filter((k2) => k2 !== key);
          if (o.length) mark(6, "GENERIC", `${name}: 끝이 다른 묶음 ${o.length}개와 같다`);
        }
      }
    }

    /* 8 Industry / Role */
    if (!l.industryLead.length) mark(7, "WRONG", "산업이 없다");
    if (!l.roleLead.length) mark(7, "WRONG", "직무가 없다");
    if (l.industryLead.length && l.industryLead.length < NEED.industry) {
      mark(7, "WEAK", `산업 ${l.industryLead.length} / ${NEED.industry}`);
    }
    if (l.roleLead.length && l.roleLead.length < NEED.role) {
      mark(7, "WEAK", `직무 ${l.roleLead.length} / ${NEED.role}`);
    }
    for (const c of l.industryLead) {
      if (ind.size && !ind.has(c)) mark(7, "WRONG", `산업 ${c} 가 이 Core 의 팩에 없다`);
    }
    for (const c of l.roleLead) {
      if (role.size && !role.has(c)) mark(7, "WRONG", `직무 ${c} 가 이 Core 의 팩에 없다`);
    }
    if (sigDup.has(key)) {
      const o = (sig.get(`${core}|${l.industryLead.join(",")}|${l.roleLead.join(",")}|${l.domainLead.join(",")}`) ?? [])
        .filter((k2) => k2 !== key);
      mark(7, "GENERIC", `산업·직무·영역 차례가 같은 Core 의 다른 묶음 ${o.length}개와 같다`);
    }

    rows.push({
      leaf: r.leaf.code, name: r.leaf.name, college: r.college.name,
      catalog: r.catalog.catalog_code, core, spec: r.leaf.specialization ?? "",
      v, why, key,
    });
  }

  /* ── 내보내기 ── */
  mkdirSync(OUT, { recursive: true });
  const head = ["자리", "이름", "단과대학", "Catalog", "Core", "갈래", ...ITEMS, "까닭"];
  writeFileSync(`${OUT}/dept.tsv`, `${head.join("\t")}\n` + rows.map((r) => [
    r.leaf, r.name, r.college, r.catalog, r.core, r.spec, ...r.v,
    r.v.map((g, i) => (g === "PASS" ? "" : `${ITEMS[i]}: ${r.why[i].join(" / ")}`))
      .filter(Boolean).join(" || "),
  ].join("\t")).join("\n") + "\n");

  /* ── 사람이 읽는 요약 ── */
  console.log(`PCU 학과 콘텐츠 QA — ${OUT}/dept.tsv`);
  console.log("\n[§1 Coverage]");
  console.log(`  전체 선택 자리        ${leaves.length}`);
  console.log(`  Assessment 대상       ${withCore.length}`);
  console.log(`  전공 고르는 자리      ${routing.length}  ${routing.map((r) => r.leaf.name).join(" · ")}`);
  console.log(`  Core 없음(고장)       ${noCore.length}${noCore.length ? `  ${noCore.map((r) => r.leaf.name).join(" · ")}` : ""}`);
  console.log(`  (Core · 갈래) 묶음    ${bundle.size}`);
  console.log(`  한 묶음을 나눠 쓰는 학과 ${shared.length}짝`);
  for (const s of shared) console.log(`    ${s.key.padEnd(34)} ${s.names.join(" · ")}`);
  console.log(`  학년도마다 다른 묶음  ${yearMismatch.length}`);
  for (const [n, ks] of yearMismatch) console.log(`    ${n.padEnd(20)} ${[...ks].join(" · ")}`);

  console.log("\n[§2 항목별 판정]");
  const counts = ITEMS.map((_, i) => {
    const c: Record<Verdict, number> = { PASS: 0, WEAK: 0, GENERIC: 0, WRONG: 0 };
    for (const r of rows) c[r.v[i]] += 1;
    return c;
  });
  console.log(`  ${"항목".padEnd(20)} PASS  WEAK  GENERIC  WRONG`);
  ITEMS.forEach((name, i) => {
    const c = counts[i];
    console.log(`  ${name.padEnd(20)}${String(c.PASS).padStart(5)}`
      + `${String(c.WEAK).padStart(6)}${String(c.GENERIC).padStart(9)}${String(c.WRONG).padStart(7)}`);
  });
  const total = { PASS: 0, WEAK: 0, GENERIC: 0, WRONG: 0 } as Record<Verdict, number>;
  for (const c of counts) for (const k of Object.keys(total) as Verdict[]) total[k] += c[k];
  console.log(`  ${"합계".padEnd(20)}${String(total.PASS).padStart(5)}`
    + `${String(total.WEAK).padStart(6)}${String(total.GENERIC).padStart(9)}${String(total.WRONG).padStart(7)}`);

  /* 가장 많이 걸린 자리 */
  const bad = rows.map((r) => ({
    r, n: r.v.filter((g) => g !== "PASS").length,
  })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  console.log(`\n[가장 많이 걸린 자리 ${Math.min(20, bad.length)} / 걸린 자리 ${bad.length}]`);
  for (const x of bad.slice(0, 20)) {
    const tags = x.r.v.map((g, i) => (g === "PASS" ? "" : `${ITEMS[i]}=${g}`)).filter(Boolean);
    console.log(`  ${x.r.name.padEnd(18)} ${x.r.catalog}  ${tags.join(" · ")}`);
  }

  /* §11 지원서와 면접 재료 */
  const noApp = [...layers.entries()].filter(([, l]) => !l.application.length);
  console.log(`\n[§11 지원서·면접 재료] 묶음 ${layers.size} 가운데 비어 있는 것 ${noApp.length}`);

  /* 받고 쓰지 않는 자리 */
  console.log("\n[학생이 읽는 자리에 닿는가]");
  for (const r of reachOf()) console.log(`  ${r.layer.padEnd(20)} ${r.state}`);

  /* 글자까지 같은 줄 */
  const dups = [...dupLine.entries()].filter(([, ks]) => new Set(ks).size > 1);
  console.log(`\n[글자까지 같은 줄] ${dups.length}줄`);
  for (const [t, ks] of dups.slice(0, 8)) {
    console.log(`  ${new Set(ks).size}묶음  ${t.slice(0, 44)}`);
  }
  const tails = [...tail.entries()].filter(([, ks]) => new Set(ks).size > 1);
  console.log(`[Action 끝 24자가 같은 틀] ${tails.length}가지`);
  for (const [t, ks] of tails.sort((a, b) => b[1].length - a[1].length).slice(0, 5)) {
    console.log(`  ${String(new Set(ks).size).padStart(3)}묶음  …${t}`);
  }

  if (total.WRONG || total.GENERIC) process.exitCode = 1;
}

main();
