/**
 * **갈래 예순셋의 아홉 자리를 그 전공 학생의 눈으로 재는 자리**
 * (PCU 62 SPECIALIZATION EXPERT-GRADE CONTENT REVIEW §1~§15).
 *
 * `pcu:dept` 가 묻는 것은 **학과 자리마다 여덟 자리가 그 학과의 말인가**
 * 까지다. 여기서 묻는 것은 **갈래 하나가 내놓는 글이 그 전공 학생의 수업과
 * 과제와 실습과 인턴에 닿고, 지원서와 면접까지 꺼내 쓸 수 있는가**이고,
 * 자리마다 여섯으로 가른다.
 *
 *   PASS           그 전공 학생이 읽으면 자기 이야기로 읽히고 꺼내 쓸 수 있다
 *   WEAK           맞는 말인데 재료가 모자라거나 네 요소 가운데 하나가 없다
 *   GENERIC        다른 갈래와 글자나 뜻이 겹친다 · 금지한 막연한 말을 쓴다
 *   UNREALISTIC    학부생이 겪을 수 없다(현업 경력자만 가능한 장면)
 *   TOO_ADVANCED   3~4학년도 한 학기에 끝낼 수 없는 크기다
 *   TOO_BASIC      1~2학년 수준에서 멈춰 기준을 정하는 자리가 없다
 *
 * 아홉 항목은 받은 규격의 차례 그대로다.
 *
 *   1 대표 경험              `examples.scene` · `examples.evidence`
 *   2 학생이 직접 정하는 기준 근거와 할 일에 **대어 볼 자**가 적혀 있는가
 *   3 남길 수 있는 Evidence  `examples.artifacts`
 *   4 Gap                    공통 `REASON_KO` + 그 영역의 `verify_targets`·`artifacts`
 *   5 Action                 `evidence_action.first` · `next`
 *   6 지원서 활용            `application.resume`
 *   7 면접 질문              `application.interview`
 *   8 Industry               `industry_mapping`
 *   9 Role                   `role_mapping`
 *
 * **읽기만 한다.** 등록부도 DB 도 쓰지 않고 서버도 부르지 않는다. 그리고
 * **측정과 판정에 한 글자도 닿지 않는다**(§19): 여기서 세는 것은 전부 사람이
 * 읽는 글이다.
 *
 * **비어 있는 자리를 작은 흠으로 적지 않는다.** 판정 여섯에 `없음` 이 없어서
 * 재료가 통째로 빈 자리는 `WEAK` 로 적히는데, 그러면 모자란 것과 아예 없는
 * 것이 표에서 같아 보인다. 그래서 **결손은 요약에서 따로 세어 이름까지
 * 적는다.**
 *
 *   npm run pcu:spec
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { registry, coreFile, packs as packsOf } from "../src/lib/me-v3/core-registry";
import { specView, type SpecView } from "../src/lib/me-v3/result/spec-view";
import { REASON_KO } from "../src/lib/me-v3/scoring/text.ko";

const OUT = process.env.OUT ?? "var/pcu-spec";

type Verdict = "PASS" | "WEAK" | "GENERIC" | "UNREALISTIC" | "TOO_ADVANCED" | "TOO_BASIC";

/** 아홉 항목의 이름. **차례가 규격의 차례다** */
const ITEMS = [
  "대표 경험", "직접 정하는 기준", "남길 Evidence", "Gap", "Action",
  "지원서 활용", "면접 질문", "Industry", "Role",
] as const;

/** 판정 다섯 줄(§18). 차례가 규격의 차례다 */
const YES = ["Reality", "Evidence", "Action", "Job application", "Interview"] as const;

const RANK: Record<Verdict, number> = {
  PASS: 0, WEAK: 1, GENERIC: 2, TOO_BASIC: 3, TOO_ADVANCED: 4, UNREALISTIC: 5,
};
function worst(a: Verdict, b: Verdict): Verdict { return RANK[a] >= RANK[b] ? a : b; }

/* ──────────────────────────────────────────────────────────────────
   금지한 말과 가리키는 말
   ────────────────────────────────────────────────────────────────── */

/** §5 추상명사는 Evidence 로 쓰지 않는다 */
const ABSTRACT = [
  "성실", "관심이 많", "협업능력", "협업 능력", "전문성", "역량", "열정",
  "책임감", "소통 능력", "문제해결 능력", "적극적", "노력한", "자신감",
];

/** §6 Gap 에 쓰지 않는 말 */
const BAD_GAP = ["경험이 부족", "역량이 부족", "능력이 부족", "적합도가 낮", "미흡"];

/** §7 Action 에 쓰지 않는 막연한 말 */
const BAD_ACTION = [
  "경험을 더 쌓", "역량을 강화", "관련 활동을 해", "관심 분야를 탐색",
  "노력해 보", "열심히", "다양한 경험을", "꾸준히",
];

/** §8 한 학기에 끝나지 않는 크기를 가리키는 말 */
const LONG_HORIZON = ["장기적으로", "졸업할 때까지", "지속적으로", "해마다", "매 학기", "평소에"];

/** §13 과다 사용 금지 */
const AI_TONE = [
  "체계적으로", "종합적으로", "효과적으로", "기반으로", "고도화",
  "적극적으로", "다각도로", "극대화", "다양한",
];

/** §11 · §14 과장. **직무를 추천하거나 취업을 단정하지 않는다** */
const HYPE = [
  "추천 직무", "잘 맞는 직무", "적합 직무", "에 적합합니다", "취업 가능성",
  "경쟁력이 높", "우수한 역량", "유망", "보장", "합격",
];

/** §2 학부생이 실제로 서는 자리 */
const SITE = /수업|과제|팀 프로젝트|조별|캡스톤|실습|현장실습|학회|동아리|공모전|대회|인턴|스터디|봉사|졸업작품|견학|실험|실기|모의|세미나|강의/;

/**
 * §2 현업 경력자만 서는 자리.
 *
 * **둘로 가른다.** `재직` 과 `결재` 와 `승인 권한` 은 소속이 있어야 쓸 수
 * 있는 말이라 어느 자리에 있어도 학부생의 경험이 아니다. 반대로 `거래처`
 * 와 `고객사` 와 `납품` 은 **현장실습과 공모전에도 나오는 말**이다: 그
 * 줄에 학부 자리가 함께 적혀 있으면 걸지 않는다. 가르지 않고 한 묶음으로
 * 세면 `현장실습에서 본국 거래처의 요구를 가려 적은 일` 이 걸리고, 그것은
 * 학부생이 실제로 하는 일이다.
 */
const PRO_HARD = /재직|사내|전사 |우리 회사|결재|승인 권한|담당자로서|실무에서|현업에서|부서장|임원|연봉/;
const PRO_SOFT = /고객사|거래처|양산|납품|출시한/;

/** 그 줄이 현업 경력자만 서는 자리인가. **학부 자리가 적혀 있으면 걸지 않는다** */
function proOnly(t: string): boolean {
  if (PRO_HARD.test(t)) return true;
  return PRO_SOFT.test(t) && !SITE.test(t);
}

/** §3 1~2학년이 할 수 있는 일 */
const BASIC_CUE = /관찰|조사|찾아|모은|모아|읽고|정리|적어 본|기초|따라가며|견학|둘러보|목록을 만들|견주어 본|정리해|적은 일/;

/** §3 3~4학년이 하는 일 */
const ADV_CUE = /기준을 정|직접 정|설계|검증|캡스톤|현장실습|인턴|제안|기획|한계|판정|개선|설정|계획을 세|대조|시험|보완/;

/**
 * §1 두 번째 항목. **학생이 직접 정하는 자리**를 가리키는 말.
 *
 * `정한` 과 `골라` 를 함께 넣는다: `누가 무엇을 맡을지 정한 일` 과
 * `품목을 골라 목록을 만든 일` 은 둘 다 그 학생이 고른 자리다. 반대로
 * `했다` 와 `만들었다` 는 넣지 않는다 — 그 말은 누가 정했는지를 말하지
 * 않는다.
 */
const OWN_CRIT = /직접 정|정한|정해|정하고|기준|근거|고른|골라|가른|가려|판단|견주|추린|맞춰 보/;

/** §7 Action 네 요소를 가리키는 말. `pcu:dept` 와 같은 자다 */
const CRIT = /기준|근거|조건|요건|한계|규격|선을|목표|우선순위|허용|범위|지침|규정|조문|항목|가정|전제/;
const ARTI = /남긴|남긴다|적어|적는|적고|표|문서|한 장|기록|보고서|자료|도면|코드|수업안|비교표|정리|대조|목록/;
const ACT = /다$|본다$|쓴다$|만든다$|고른다$|정한다$|견준다$|남긴다$|적어 둔다$|적는다$/;

/** §8 실행 기간을 가를 수 있는 말. **한 산출물로 묶인 일도 가를 수 있다** */
const HORIZON = /이번 주|이번 달|이번 학기|한 학기|다음 수업|다음 과제|방학|하나를 골라|하나를 고르|한 장|한 편|한 가지|사례 하나|사안 하나|주제 하나/;

function has(s: string, list: string[]): string[] {
  return list.filter((w) => s.includes(w));
}

/* ──────────────────────────────────────────────────────────────────
   겹침. **공통 구조까지 억지로 다르게 만들 필요는 없다**(§15)
   ────────────────────────────────────────────────────────────────── */

function grams(t: string): Set<string> {
  const s = t.replace(/\s+/g, "");
  const out = new Set<string>();
  for (let i = 0; i + 3 <= s.length; i += 1) out.add(s.slice(i, i + 3));
  return out;
}
function sim(a: string, b: string): number {
  const x = grams(a), y = grams(b);
  if (!x.size || !y.size) return 0;
  let hit = 0;
  for (const g of x) if (y.has(g)) hit += 1;
  return hit / (x.size + y.size - hit);
}

/** 꼬리 낱말을 떼어 낸 2자 이상 한글 낱말 */
const WORD = /[가-힣]{2,}/g;
function stem(w: string): string {
  return w.replace(/(으로|에서|에게|에는|이나|과의|와의|로서|까지|부터|보다|처럼|마다|이고|하고|라는|라고|들을|들이|들의|한다|했다|본다|합니다|하는|했던|이란|을|를|이|가|은|는|의|에|와|과|도|로|만|나)$/, "");
}
function words(t: string): string[] {
  return (t.match(WORD) ?? []).map(stem).filter((w) => w.length >= 2);
}

/* ──────────────────────────────────────────────────────────────────
   세트 모으기. **갈래가 없는 Core 도 한 세트다**
   ────────────────────────────────────────────────────────────────── */

type Row = {
  core: string; coreName: string; spec: string; name: string;
  sv: SpecView;
  v: Verdict[]; why: string[][];
  /** §18 다섯 줄 */
  yes: boolean[];
};

type DomainRow = {
  code: string; name: string; artifacts?: string[]; verify_targets?: string[];
};

const domainCache = new Map<string, DomainRow[]>();
function domainsOf(core: string): DomainRow[] {
  if (domainCache.has(core)) return domainCache.get(core)!;
  let rows: DomainRow[] = [];
  try { rows = coreFile<{ domains?: DomainRow[] }>(core, "domains").domains ?? []; }
  catch { rows = []; }
  domainCache.set(core, rows);
  return rows;
}

const packCache = new Map<string, Set<string>>();
function packCodes(core: string, kind: "industry" | "role"): Set<string> {
  const key = `${core}/${kind}`;
  if (packCache.has(key)) return packCache.get(key)!;
  const s = new Set<string>();
  try {
    const p = packsOf<{ packs?: { code?: string }[] }>(core, kind);
    for (const x of p.packs ?? []) if (x.code) s.add(x.code);
  } catch { /* 팩 파일이 없으면 세지 않는다 */ }
  packCache.set(key, s);
  return s;
}

function collect(): Row[] {
  const rows: Row[] = [];
  for (const c of registry().cores) {
    const raw = c as unknown as Record<string, unknown>;
    for (const s of c.specializations ?? []) {
      rows.push(blank(c.code, c.name_ko, s.code, s.name_ko, specView(c.code, s.code)));
    }
    /* 갈래 없이 Core 가 다섯 층을 드는 자리(간호 · 생명공학 · 심리상담) */
    if (raw.examples || raw.evidence_action || raw.application) {
      rows.push(blank(c.code, c.name_ko, "", `${c.name_ko}(Core)`, specView(c.code, null)));
    }
  }
  return rows;
}

function blank(core: string, coreName: string, spec: string, name: string, sv: SpecView): Row {
  return {
    core, coreName, spec, name, sv,
    v: ITEMS.map(() => "PASS" as Verdict),
    why: ITEMS.map(() => [] as string[]),
    yes: YES.map(() => true),
  };
}

/* ──────────────────────────────────────────────────────────────────
   §6 공통 Gap 문면. **한 자리에서 고치면 예순셋이 함께 고쳐진다**
   ────────────────────────────────────────────────────────────────── */

const GAP_REASONS = [
  "MISSING_REQUIRED_AXIS", "MISSING_OUTPUT", "MISSING_OUTPUT_EVIDENCE",
  "MISSING_VERIFICATION", "INSUFFICIENT_CONFIRMED_AXES", "NO_CONFIRMED_AXIS",
] as const;

/** 무엇은 확인됐고 무엇은 아직인지 **같이** 적혀 있는가 */
function gapShapeOf(t: string): { ok: boolean; why: string } {
  const good = /확인됐|답하셨|내셨|하셨는데|서 있|확인된 판단 (가운데 )?[^ ]*은/.test(t);
  const gap = /아직|비어/.test(t);
  if (!gap) return { ok: false, why: "무엇이 아직 없는지가 없다" };
  if (!good) return { ok: false, why: "무엇은 확인됐는지가 없다" };
  return { ok: true, why: "" };
}

/* ──────────────────────────────────────────────────────────────────
   재기
   ────────────────────────────────────────────────────────────────── */

function main(): void {
  const rows = collect();

  /* 글 한 줄 → 그 줄을 든 세트. 글자까지 같은 줄을 센다 */
  const line = new Map<string, string[]>();
  const keyOf = (r: Row) => `${r.core}/${r.spec || "-"}`;
  for (const r of rows) {
    const sv = r.sv;
    for (const t of [...sv.scene, ...sv.artifacts, ...sv.evidence,
      sv.evidenceFirst, sv.evidenceNext, sv.application.resume, ...sv.application.interview]) {
      if (t) line.set(t, [...(line.get(t) ?? []), keyOf(r)]);
    }
  }
  const dupOf = (r: Row, xs: string[]) =>
    xs.filter((t) => (line.get(t) ?? []).some((o) => o !== keyOf(r)));

  /** 낱말마다 그것을 든 세트 수. **흔한 말은 전공 맥락이 아니다** */
  const wordSets = new Map<string, Set<string>>();
  for (const r of rows) {
    const own = `${r.sv.scene.join(" ")} ${r.sv.artifacts.join(" ")} ${r.sv.evidence.join(" ")} ${r.sv.evidenceFirst} ${r.sv.evidenceNext}`;
    for (const w of new Set(words(own))) {
      wordSets.set(w, (wordSets.get(w) ?? new Set()).add(keyOf(r)));
    }
  }
  /** 그 전공의 말: 여덟 세트 이하가 드는 낱말 */
  const rare = (w: string) => (wordSets.get(w)?.size ?? 0) <= 8;

  /* §6 공통 문면 */
  const gapShape = GAP_REASONS.map((c) => ({ code: c, text: REASON_KO[c], ...gapShapeOf(REASON_KO[c]) }));
  const gapBad = gapShape.filter((g) => !g.ok);

  /* §15 cross-specialization similarity. 공통 줄은 빼고 본다 */
  const common = new Set([...line.entries()].filter(([, ks]) => new Set(ks).size >= 15).map(([t]) => t));
  const bodyOf = (r: Row) => [
    ...r.sv.evidence, r.sv.evidenceFirst, r.sv.evidenceNext,
    r.sv.application.resume, ...r.sv.application.interview,
  ].filter((t) => t && !common.has(t)).join(" ");
  const pairs: { a: Row; b: Row; s: number }[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const s = sim(bodyOf(rows[i]), bodyOf(rows[j]));
      if (s >= 0.6) pairs.push({ a: rows[i], b: rows[j], s });
    }
  }
  const nearDup = new Map<string, number>();
  for (const p of pairs.filter((x) => x.s >= 0.75)) {
    nearDup.set(keyOf(p.a), (nearDup.get(keyOf(p.a)) ?? 0) + 1);
    nearDup.set(keyOf(p.b), (nearDup.get(keyOf(p.b)) ?? 0) + 1);
  }

  /* §12 같은 Core 안의 차별화 */
  const inCore = new Map<string, Row[]>();
  for (const r of rows) inCore.set(r.core, [...(inCore.get(r.core) ?? []), r]);
  const sigDup = new Set<string>();
  for (const [, rs] of inCore) {
    const m = new Map<string, string[]>();
    for (const r of rs) {
      const s = `${r.sv.domainLead.join(",")}|${r.sv.industryLead.join(",")}|${r.sv.roleLead.join(",")}`;
      m.set(s, [...(m.get(s) ?? []), keyOf(r)]);
    }
    for (const [, ks] of m) if (ks.length > 1) for (const k of ks) sigDup.add(k);
  }

  /* Action 꼬리 겹침 */
  const tail = new Map<string, string[]>();
  for (const r of rows) {
    for (const t of [r.sv.evidenceFirst, r.sv.evidenceNext]) {
      if (t.length < 24) continue;
      tail.set(t.slice(-24), [...(tail.get(t.slice(-24)) ?? []), keyOf(r)]);
    }
  }

  const missing: { set: string; what: string }[] = [];
  const broken: string[] = [];

  for (const r of rows) {
    const sv = r.sv, k = keyOf(r);
    const mark = (i: number, g: Verdict, msg: string) => {
      r.v[i] = worst(r.v[i], g); r.why[i].push(msg);
    };
    const all = [...sv.scene, ...sv.artifacts, ...sv.evidence, sv.evidenceFirst,
      sv.evidenceNext, sv.application.resume, ...sv.application.interview].join(" ");

    /* 1 대표 경험 ───────────────────────────────────────────────── */
    if (!sv.scene.length || !sv.evidence.length) {
      mark(0, "WEAK", "장면이나 근거가 비어 있다");
      missing.push({ set: k, what: "대표 경험" });
    } else {
      if (sv.scene.length < 3) mark(0, "WEAK", `장면 ${sv.scene.length} / 3`);
      if (sv.evidence.length < 6) mark(0, "WEAK", `근거 ${sv.evidence.length} / 6`);
      const d = dupOf(r, [...sv.scene, ...sv.evidence]);
      if (d.length) mark(0, "GENERIC", `다른 갈래와 글자까지 같은 줄 ${d.length}`);
      if (nearDup.get(k)) mark(0, "GENERIC", `뜻이 거의 같은 갈래 ${nearDup.get(k)}개`);
      for (const w of has(sv.evidence.join(" "), AI_TONE)) mark(0, "WEAK", `AI 식 말 ${w}`);

      /* §2 학부 자리 */
      const noSite = sv.evidence.filter((t) => !SITE.test(t));
      if (noSite.length >= 2) {
        mark(0, "WEAK", `어디에서 생기는 경험인지 없는 줄 ${noSite.length} / ${sv.evidence.length}`);
      }
      const pro = sv.evidence.filter((t) => proOnly(t));
      if (pro.length) mark(0, "UNREALISTIC", `현업만 서는 자리 ${pro.length}줄`);

      /* §3 학년 난이도 양쪽 */
      const adv = sv.evidence.filter((t) => ADV_CUE.test(t)).length;
      const bas = sv.evidence.filter((t) => BASIC_CUE.test(t)).length;
      if (!adv) mark(0, "TOO_BASIC", "기준을 정하거나 검증하는 줄이 하나도 없다");
      if (!bas) mark(0, "TOO_ADVANCED", "1~2학년이 할 수 있는 줄이 하나도 없다");
    }

    /* 2 학생이 직접 정하는 기준 ─────────────────────────────────── */
    const own = sv.evidence.filter((t) => OWN_CRIT.test(t)).length;
    if (own < 2) mark(1, "WEAK", `직접 정한 자리가 보이는 줄 ${own} / 2`);
    if (!CRIT.test(`${sv.evidenceFirst} ${sv.evidenceNext}`)) {
      mark(1, "WEAK", "할 일에 대어 볼 자가 없다");
    }

    /* 3 남길 수 있는 Evidence ───────────────────────────────────── */
    if (!sv.artifacts.length) {
      mark(2, "WEAK", "남길 것이 비어 있다");
      missing.push({ set: k, what: "남길 Evidence" });
    } else {
      if (sv.artifacts.length < 4) mark(2, "WEAK", `남길 것 ${sv.artifacts.length} / 4`);
      const d = dupOf(r, sv.artifacts);
      if (d.length) mark(2, "GENERIC", `다른 갈래와 글자까지 같은 줄 ${d.length}`);
      for (const w of has(sv.artifacts.join(" "), ABSTRACT)) {
        mark(2, "GENERIC", `추상명사 ${w} 를 남길 것으로 적었다`);
      }
      const pro = sv.artifacts.filter((t) => PRO_HARD.test(t));
      if (pro.length) mark(2, "UNREALISTIC", `학부에서 나오지 않는 산출물 ${pro.length}`);
    }

    /* 4 Gap ────────────────────────────────────────────────────── */
    for (const g of gapBad) mark(3, "WEAK", `공통 문면 ${g.code}: ${g.why}`);
    const lead = domainsOf(r.core).filter((d) => sv.domainLead.includes(d.code));
    if (!sv.domainLead.length) {
      mark(3, "WEAK", "강조 영역이 없다");
      missing.push({ set: k, what: "Gap 재료" });
    } else if (!lead.length) {
      mark(3, "WEAK", "강조 영역의 사전을 찾지 못했다");
      broken.push(`${k}: 강조 영역 ${sv.domainLead.join(",")} 가 이 Core 의 영역 사전에 없다`);
    } else {
      for (const d of lead) {
        if (!(d.verify_targets ?? []).length) mark(3, "WEAK", `${d.name} 에 견줄 것이 없다`);
        if (!(d.artifacts ?? []).length) mark(3, "WEAK", `${d.name} 에 남길 것이 없다`);
      }
      const txt = lead.map((d) => `${(d.verify_targets ?? []).join(" ")} ${(d.artifacts ?? []).join(" ")}`).join(" ");
      for (const w of has(txt, BAD_GAP)) mark(3, "GENERIC", `금지한 말 ${w}`);
    }

    /* 5 Action ─────────────────────────────────────────────────── */
    if (!sv.evidenceFirst || !sv.evidenceNext) {
      mark(4, "WEAK", "할 일이 비어 있다");
      missing.push({ set: k, what: "Action" });
    } else {
      const both = `${sv.evidenceFirst} ${sv.evidenceNext}`;
      if (!SITE.test(both)) mark(4, "WEAK", "두 걸음 어디에도 어디에서 하는 일인지가 없다");
      if (!HORIZON.test(both)) mark(4, "WEAK", "이번 주·달·학기 가운데 어느 크기인지 가를 말이 없다");
      for (const [nm, t] of [["먼저", sv.evidenceFirst], ["다음", sv.evidenceNext]] as [string, string][]) {
        for (const w of has(t, BAD_ACTION)) mark(4, "GENERIC", `${nm}: 막연한 말 ${w}`);
        for (const w of has(t, LONG_HORIZON)) mark(4, "TOO_ADVANCED", `${nm}: 한 학기에 끝나지 않는 말 ${w}`);
        for (const w of has(t, AI_TONE)) mark(4, "WEAK", `${nm}: AI 식 말 ${w}`);
        const miss: string[] = [];
        if (!ACT.test(t)) miss.push("행동");
        if (!CRIT.test(t)) miss.push("기준");
        if (!ARTI.test(t)) miss.push("남기는 것");
        if (miss.length) mark(4, "WEAK", `${nm}: ${miss.join("·")} 이 보이지 않는다`);
        if (t.length >= 24) {
          const o = (tail.get(t.slice(-24)) ?? []).filter((x) => x !== k);
          if (o.length) mark(4, "GENERIC", `${nm}: 끝이 다른 갈래 ${o.length}개와 같다`);
        }
        if (proOnly(t)) mark(4, "UNREALISTIC", `${nm}: 현업만 서는 자리다`);
      }
    }

    /* 6 지원서 활용 ─────────────────────────────────────────────── */
    const res = sv.application.resume;
    if (!res) {
      mark(5, "WEAK", "지원서 재료가 비어 있다");
      missing.push({ set: k, what: "지원서 활용" });
    } else {
      /* §9 문제 → 기준 → 행동 → 결과 → 배운 점 으로 펼 수 있는가 */
      const need: [string, RegExp][] = [
        /* 어느 한 자리를 들고 있는가. `맡았던 한 모듈` 도 그 자리다 */
        ["상황", /사안|사례|과제|프로젝트|상황|문제|하나|맡았던|맡은|겪은|했던|한 [가-힣]{2,5}(을|를|에서|에게|에|의)/],
        ["기준", CRIT],
        ["한 일", /했|적었|정했|정했|만들|골라|고르|맡았|옮겼|갈랐|남겼/],
        ["남긴 것", /남긴|남겼|기록|표|보고|자료|문서|결과|한 장|목록|한 문단/],
        ["배운 점", /보완|바꾼|바꿨|달라|배운|다시|고친|되돌아|무엇을 더/],
      ];
      /**
       * **그 전공의 산출물 이름도 `남긴 것` 으로 센다.**
       *
       * `규약` 과 `콘티` 와 `지표 정의` 는 그 전공에서 남는 것인데 공통
       * 낱말 목록에는 없다. 목록만 보고 세면 그 전공의 말로 적은 자리가
       * 모자란 것으로 걸리고, 고치는 쪽이 전공 말을 공통 낱말로 바꾸게
       * 된다. 그러면 §12 가 막는 모양이 된다.
       */
      const artWords = new Set(sv.artifacts.flatMap((t) => words(t)));
      const miss = need.filter(([n, re]) => {
        if (re.test(res)) return false;
        if (n === "남긴 것") return !words(res).some((w) => artWords.has(w));
        return true;
      }).map(([n]) => n);
      if (miss.length) mark(5, "WEAK", `${miss.join("·")} 으로 펼 자리가 없다`);
      for (const w of has(res, HYPE)) mark(5, "GENERIC", `과장한 말 ${w}`);
      for (const w of has(res, AI_TONE)) mark(5, "WEAK", `AI 식 말 ${w}`);
      if (dupOf(r, [res]).length) mark(5, "GENERIC", "다른 갈래와 글자까지 같다");
    }

    /* 7 면접 질문 ──────────────────────────────────────────────── */
    const qs = sv.application.interview;
    if (!qs.length) {
      mark(6, "WEAK", "면접 질문이 비어 있다");
      missing.push({ set: k, what: "면접 질문" });
    } else {
      if (qs.length < 3) mark(6, "WEAK", `질문 ${qs.length} / 3`);
      const d = dupOf(r, qs);
      if (d.length) mark(6, "GENERIC", `다른 갈래와 글자까지 같은 질문 ${d.length}`);
      /* §10 전공 맥락. **묶음 전체에 그 전공 말이 하나는 있어야 한다** */
      if (!words(qs.join(" ")).some(rare)) {
        mark(6, "GENERIC", "질문 어디에도 그 전공의 말이 없다");
      }
      for (const w of has(qs.join(" "), HYPE)) mark(6, "GENERIC", `과장한 말 ${w}`);
    }

    /* 8 · 9 Industry · Role ───────────────────────────────────── */
    const packs: [number, string, string[], Set<string>][] = [
      [7, "산업", sv.industryLead, packCodes(r.core, "industry")],
      [8, "직무", sv.roleLead, packCodes(r.core, "role")],
    ];
    for (const [i, nm, lead2, codes] of packs) {
      if (!lead2.length) {
        mark(i, "WEAK", `${nm} 가 비어 있다`);
        missing.push({ set: k, what: nm });
        continue;
      }
      if (lead2.length < 2) mark(i, "WEAK", `${nm} ${lead2.length} / 2`);
      for (const c of lead2) {
        if (codes.size && !codes.has(c)) {
          mark(i, "WEAK", `${c} 가 이 Core 의 팩에 없다`);
          broken.push(`${k}: ${nm} ${c} 가 이 Core 의 팩에 없다`);
        }
      }
      if (sigDup.has(k)) mark(i, "GENERIC", "영역·산업·직무 차례가 같은 Core 의 다른 갈래와 같다");
      for (const w of has(all, HYPE)) mark(i, "GENERIC", `과장한 말 ${w}`);
    }

    /* §18 다섯 줄 */
    r.yes[0] = r.v[0] !== "UNREALISTIC" && r.v[2] !== "UNREALISTIC" && r.v[4] !== "UNREALISTIC"
      && r.v[0] !== "TOO_ADVANCED";
    r.yes[1] = r.v[2] === "PASS";
    r.yes[2] = r.v[4] === "PASS";
    r.yes[3] = r.v[5] === "PASS";
    r.yes[4] = r.v[6] === "PASS";
  }

  /* ── 내보내기 ── */
  mkdirSync(OUT, { recursive: true });
  const head = ["Core", "갈래", "이름", ...ITEMS, ...YES, "까닭"];
  writeFileSync(`${OUT}/spec.tsv`, `${head.join("\t")}\n` + rows.map((r) => [
    r.core, r.spec, r.name, ...r.v, ...r.yes.map((b) => (b ? "YES" : "NO")),
    r.v.map((g, i) => (g === "PASS" ? "" : `${ITEMS[i]}=${g}: ${r.why[i].join(" / ")}`))
      .filter(Boolean).join(" || "),
  ].join("\t")).join("\n") + "\n");

  /* ── 사람이 읽는 요약 ── */
  console.log(`PCU 갈래 콘텐츠 전문가 검토 — ${OUT}/spec.tsv`);
  console.log(`\n[§1 세트] ${rows.length}  (Core ${new Set(rows.map((r) => r.core)).size} · 갈래 ${rows.filter((r) => r.spec).length} · 갈래 없는 Core ${rows.filter((r) => !r.spec).length})`);

  console.log("\n[§1 항목별 판정]");
  const kinds: Verdict[] = ["PASS", "WEAK", "GENERIC", "UNREALISTIC", "TOO_ADVANCED", "TOO_BASIC"];
  console.log(`  ${"항목".padEnd(18)}` + kinds.map((x) => x.padStart(13)).join(""));
  const counts = ITEMS.map((_, i) => {
    const c = Object.fromEntries(kinds.map((x) => [x, 0])) as Record<Verdict, number>;
    for (const r of rows) c[r.v[i]] += 1;
    return c;
  });
  ITEMS.forEach((name, i) => {
    console.log(`  ${name.padEnd(18)}` + kinds.map((x) => String(counts[i][x]).padStart(13)).join(""));
  });
  const total = Object.fromEntries(kinds.map((x) => [x, 0])) as Record<Verdict, number>;
  for (const c of counts) for (const x of kinds) total[x] += c[x];
  console.log(`  ${"합계".padEnd(18)}` + kinds.map((x) => String(total[x]).padStart(13)).join(""));

  console.log("\n[§18 다섯 줄]");
  YES.forEach((name, i) => {
    const y = rows.filter((r) => r.yes[i]).length;
    console.log(`  ${name.padEnd(18)} ${y} / ${rows.length}${y === rows.length ? "" : "   ← NO " + rows.filter((r) => !r.yes[i]).length}`);
  });

  console.log(`\n[결손] 재료가 통째로 비어 있는 자리 ${missing.length}`);
  for (const m of missing) console.log(`  ${m.set.padEnd(34)} ${m.what}`);

  console.log(`\n[고장] 가리키는 코드가 그 Core 에 없는 자리 ${broken.length}`);
  for (const b of broken.slice(0, 12)) console.log(`  ${b}`);

  console.log(`\n[§6 공통 Gap 문면] ${GAP_REASONS.length} 가운데 모양이 어긋난 것 ${gapBad.length}`);
  for (const g of gapShape) {
    console.log(`  ${g.ok ? "ok  " : "NO  "}${g.code.padEnd(28)} ${g.ok ? "" : g.why}`);
  }

  console.log(`\n[§15 뜻이 겹치는 짝] 0.75 이상 ${pairs.filter((p) => p.s >= 0.75).length} · 0.6 이상 ${pairs.length}`);
  for (const p of pairs.sort((a, b) => b.s - a.s).slice(0, 10)) {
    console.log(`  ${p.s.toFixed(2)}  ${(p.a.spec || p.a.core).padEnd(26)} ↔ ${p.b.spec || p.b.core}`);
  }

  const bad = rows.map((r) => ({ r, n: r.v.filter((g) => g !== "PASS").length }))
    .filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  console.log(`\n[가장 많이 걸린 자리 ${Math.min(20, bad.length)} / 걸린 세트 ${bad.length} / ${rows.length}]`);
  for (const x of bad.slice(0, 20)) {
    const tags = x.r.v.map((g, i) => (g === "PASS" ? "" : `${ITEMS[i]}=${g}`)).filter(Boolean);
    console.log(`  ${(x.r.spec || x.r.core).padEnd(26)} ${tags.join(" · ")}`);
  }

  const fail = total.PASS !== rows.length * ITEMS.length;
  console.log(`\n확인 ${rows.length * ITEMS.length}가지 · PASS ${total.PASS} · 걸림 ${rows.length * ITEMS.length - total.PASS}`);
  if (fail) process.exitCode = 1;
}

main();
