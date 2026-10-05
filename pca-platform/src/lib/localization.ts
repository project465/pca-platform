/**
 * 지역화가 **다 덮였는가**.
 *
 * 화면 하나를 그려 보는 것만으로는 모른다. 직무군이 열여섯이고 조직
 * 유형이 일곱이라, 응시자 하나를 그리면 데이터 파일의 일부만 지나간다.
 * 나머지는 다른 응시자가 왔을 때 처음 한국어로 샌다. 그러면 그 사람이
 * 첫 발견자가 된다.
 *
 * 그래서 여기서는 화면을 그리지 않고 **데이터 파일에서 사람이 읽는 칸만**
 * 뽑아 사전과 대조한다. 어느 응시자가 와도 나올 수 있는 글자 전부다.
 *
 * **한 구현을 두 곳이 읽는다.** 운영 화면(`/admin/localization`)과
 * 검사(`npm run i18n:coverage`)가 같은 함수를 부른다. 두 곳에서 따로
 * 세면 숫자가 갈리고, 갈리는 순간 둘 다 못 믿는다.
 */
import { readFileSync } from "node:fs";

const ROOT = "sites/pca-platform";
const HAN = /[가-힣]/;

type Json = Record<string, unknown>;
const read = (p: string): Json => JSON.parse(readFileSync(`${ROOT}/${p}`, "utf8"));
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * 사람이 읽는 칸만 적는다.
 *
 * **맞추기에만 쓰는 칸은 넣지 않는다**: 별칭·검색어·과목 목록은 응시자가
 * 적은 글과 견주는 자료라 화면에 나가지 않고, 그것을 번역하면 맞추기가
 * 조용히 깨진다.
 */
const SPECS: { file: string; where: string; pick: (d: Json) => string[] }[] = [
  {
    file: "content/me-knowledge.json", where: "전공지식 28갈래",
    pick: (d) => arr(d.domains).flatMap((x) => {
      const o = obj(x);
      return [str(o.name_ko), ...arr(o.work).map(str), ...arr(o.decisions).map(str),
        ...arr(o.outputs).map(str), ...arr(o.performance).map(str)];
    }),
  },
  {
    file: "content/me-tools.json", where: "도구 갈래",
    /* 도구 **이름**(SolidWorks · ANSYS)은 고유명사라 옮기지 않는다 */
    pick: (d) => [
      ...arr(d.categories).map((c) => str(obj(c).n)),
      ...arr(d.usage_levels).map((u) => str(obj(u).n)),
    ],
  },
  {
    file: "content/me-value-paths.json", where: "직무군 가치 사슬",
    pick: (d) => arr(d.families).flatMap((f) => {
      const o = obj(f);
      return [
        str(o.problem), ...arr(o.work).map(str), ...arr(o.decisions).map(str),
        ...arr(o.outputs).map(str), ...arr(o.performance).map(str),
        ...arr(o.evidence_you_can_show).map(str), ...arr(o.check_missing).map(str),
        ...Object.values(obj(o.org_variants)).flatMap((v) =>
          [str(obj(v).output), str(obj(v).performance)]),
      ];
    }),
  },
  {
    file: "content/org-types.json", where: "조직 유형 일곱",
    pick: (d) => arr(d.organization_types).flatMap((x) => {
      const o = obj(x);
      return [str(o.name_ko), str(o.one_line), str(o.reads_your_work_as),
        ...arr(o.output_types).map(str), ...arr(o.performance_criteria).map(str),
        ...arr(o.what_counts_as_value).map(str)];
    }),
  },
  {
    file: "content/followups.json", where: "되묻는 말",
    pick: (d) => [
      str(d.answer_note),
      ...arr(d.gaps).flatMap((g) => {
        const o = obj(g);
        return [str(o.title), str(o.why), ...arr(o.questions).flatMap((q) => {
          const r = obj(q);
          return [str(r.q), ...arr(r.options).map(str)];
        })];
      }),
    ],
  },
  {
    file: "content/me-evidence-map.json", where: "증거 지도 199영역",
    pick: (d) => arr(d.families).flatMap((f) =>
      arr(obj(f).evidence_requirements).flatMap((r) =>
        [str(obj(r).label), str(obj(r).description)])),
  },
  {
    file: "content/evidence-rules.json", where: "준비도 신호",
    pick: (d) => arr(d.families).flatMap((f) =>
      arr(obj(f).signals).map((g) => str(obj(g).label))),
  },
  {
    file: "assessment/ME_V2/decision-rules.json", where: "결정 상태와 업무 방식",
    pick: (d) => [
      ...Object.values(obj(d.statuses)).flatMap((s) =>
        [str(obj(s).label), str(obj(s).line)]),
      ...Object.entries(obj(d.work_mode_labels))
        .filter(([k]) => k !== "note").map(([, v]) => str(v)),
    ],
  },
];

/**
 * 경험에서 **무엇을 찾을지**를 늘리는 어휘.
 *
 * 사전과 다른 물건이다. 여기 빠진 것은 영어로 적어 주신 경험이 걸리지
 * 않는 자리이고, 화면에 한국어가 보이는 것과 달리 **눈에 띄지 않는다**:
 * 같은 내용을 적었는데 공백만 더 받는다.
 */
const MATCHERS: { file: string; where: string; pick: (d: Json) => string[] }[] = [
  {
    file: "content/me-evidence-map.json", where: "증거 지도 검색어",
    pick: (d) => arr(d.families).flatMap((f) =>
      arr(obj(f).evidence_requirements).flatMap((r) => {
        const m = obj(obj(r).match);
        return [...arr(m.keywords).map(str), ...arr(m.courses).map(str)];
      })),
  },
  {
    file: "content/evidence-rules.json", where: "준비도 신호 매처",
    pick: (d) => arr(d.families).flatMap((f) =>
      arr(obj(f).signals).flatMap((g) => {
        const o = obj(g);
        return [...arr(o.methods).map(str), ...arr(o.outputs).map(str),
          ...arr(o.courses).map(str)];
      })),
  },
];

export type CoverageRow = {
  file: string;
  where: string;
  total: number;
  covered: number;
  missing: string[];
};

export type LocalizationReport = {
  /** 화면에 나가는 글자 */
  screen: CoverageRow[];
  /** 경험에서 찾는 말 */
  matchers: CoverageRow[];
  /** 직무군 영어 이름 짝 */
  families: { total: number; covered: number; missing: string[] };
  dictEntries: number;
  glossaryTerms: number;
  glossaryWords: number;
  /** 다 덮였는가 */
  ok: boolean;
};

export function localizationReport(): LocalizationReport {
  const dict = obj(obj(read("content/report-i18n.json")).en);
  const glos = obj(obj(read("content/match-glossary.json")).en);

  const run = (
    specs: typeof SPECS, has: (k: string) => boolean,
  ): CoverageRow[] => specs.map((sp) => {
    const all = [...new Set(sp.pick(read(sp.file)).filter((x) => x && HAN.test(x)))];
    const missing = all.filter((x) => !has(x));
    return {
      file: sp.file, where: sp.where,
      total: all.length, covered: all.length - missing.length, missing,
    };
  });

  const screen = run(SPECS, (k) => typeof dict[k] === "string" && !!dict[k]);
  const matchers = run(MATCHERS, (k) => Array.isArray(glos[k]) && arr(glos[k]).length > 0);

  /* 직무군 이름만 **사전을 거치지 않는다**: `names-en` 이 짝으로 들어
     있어서 `PCAI18N.family()` 가 그쪽을 직접 읽는다. 짝이 비었는지만 본다 */
  const fam = read("assessment/ME_V2/family-names.json");
  const names = obj(fam.names ?? fam);
  const en = obj(fam["names-en"]);
  const keys = Object.keys(names).filter((k) => k !== "note" && k !== "names-en");
  const famMissing = keys.filter((k) => !en[k]);

  const glossaryWords = Object.values(glos)
    .reduce((a: number, v) => a + arr(v).length, 0);

  return {
    screen, matchers,
    families: {
      total: keys.length, covered: keys.length - famMissing.length,
      missing: famMissing,
    },
    dictEntries: Object.keys(dict).length,
    glossaryTerms: Object.keys(glos).length,
    glossaryWords,
    ok: screen.every((r) => !r.missing.length)
      && matchers.every((r) => !r.missing.length)
      && !famMissing.length,
  };
}
