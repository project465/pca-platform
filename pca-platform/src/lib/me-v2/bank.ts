/**
 * ME_V2 문항 은행을 서버에서 읽는다.
 *
 * **검사지를 한 벌 더 만들지 않는다.** 원본은 `sites/pca-platform/assessment/
 * ME_V2/*.json` 이고, 정적 화면이 쓰는 `data/me-v2.js` 도 그 JSON 에서
 * 만들어진다(`npm run v2:build`). 서버가 그 JSON 을 그대로 읽으면 두 쪽이
 * 같은 문항을 본다. 여기서 문항을 고치거나 번역을 지어내지 않는다.
 *
 * **문항 본문은 한국어뿐이다.** 항목에 `ko-KR` 만 있고 영어 본문이 없다.
 * `textOf()` 가 언어를 받아도 영어가 없으면 한국어를 돌려주고, 그 사실을
 * `missingTranslations()` 가 세어 밖으로 알린다. 없는 번역을 만들어 내면
 * 영어권 응시자가 뜻이 다른 문항에 답하게 된다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "sites/pca-platform/assessment/ME_V2");

export type Tier = "BASIC" | "STANDARD" | "PRO";
export type Stage = "bachelor" | "master" | "phd" | "postdoc";

export type Item = {
  item_id: string;
  question_no: number;
  construct: string;
  scale: string;
  "ko-KR"?: string;
  semantic?: string;
  scored?: boolean;
  stage_adaptive?: boolean;
  options?: { value: string; "ko-KR"?: string }[];
  career_family_weights?: Record<string, number>;
  [k: string]: unknown;
};

export type Scale = {
  label: string;
  measures?: string;
  points?: string[];
  options?: { value: string; label: string }[];
};

type Bank = {
  items: Item[];
  byTier: Record<Tier, Item[]>;
  scales: Record<string, Scale>;
  variants: Record<string, Record<string, string>>;
  assessmentVersion: string;
};

let cached: Bank | null = null;

function read<T>(name: string): T {
  return JSON.parse(readFileSync(join(DIR, name), "utf8")) as T;
}

/**
 * 한 번만 읽고 쥐고 있는다. 문항은 배포 동안 바뀌지 않는다(설계 원칙 4:
 * 문항을 수정하지 않고 버전을 올린다).
 */
export function bank(): Bank {
  if (cached) return cached;

  const core = read<{ items: Item[]; assessment_version: string }>("items-core.json");
  const std = read<{ items: Item[] }>("items-standard.json");
  const pro = read<{ items: Item[] }>("items-pro.json");
  const scales = read<{ scales: Record<string, Scale> }>("response-scales.json");
  const variants = read<{ variants: Record<string, Record<string, string>> }>(
    "stage-variants.json",
  );

  const basic = core.items;
  const standard = [...core.items, ...std.items];
  const all = [...core.items, ...std.items, ...pro.items];

  cached = {
    items: all,
    byTier: { BASIC: basic, STANDARD: standard, PRO: all },
    scales: scales.scales,
    variants: variants.variants,
    assessmentVersion: core.assessment_version,
  };
  return cached;
}

export function itemsFor(tier: Tier): Item[] {
  return bank().byTier[tier];
}

export function itemById(id: string): Item | null {
  return bank().items.find((i) => i.item_id === id) ?? null;
}

/**
 * 이 문항의 본문.
 *
 * 학위 단계가 바뀌면 **묻는 장면**이 바뀐다(점수는 그대로다). 영어 본문이
 * 없으면 한국어를 돌려준다: 비워 두면 화면이 빈 문항을 그린다.
 */
export function textOf(item: Item, stage: Stage, lang: string): string {
  if (item.stage_adaptive) {
    const v = bank().variants[item.item_id];
    if (v && v[stage]) return v[stage];
  }
  const en = item[`en-US` as keyof Item];
  if (lang === "en" && typeof en === "string" && en) return en;
  return (item["ko-KR"] as string) ?? item.semantic ?? item.item_id;
}

/** 이 척도의 보기. 고르기형 문항은 자기 보기를 들고 있다. */
export function choicesOf(item: Item): { value: string; label: string }[] {
  if (Array.isArray(item.options)) {
    return item.options.map((o, i) => ({
      value: String(o.value ?? i + 1),
      label: (o["ko-KR"] as string) ?? String(o.value ?? i + 1),
    }));
  }
  const s = bank().scales[item.scale];
  if (s?.points) {
    return s.points.map((p, i) => ({ value: String(i + 1), label: p }));
  }
  return [];
}

export function scaleOf(item: Item): Scale | null {
  return bank().scales[item.scale] ?? null;
}

/**
 * 뜻이 같은 문항끼리 한 화면으로 묶는다.
 *
 * 정적 화면이 쓰는 묶음과 같은 규칙이다: 한 화면에 척도 하나라, 보기 읽는
 * 법을 다시 익히지 않아도 된다. 규격 §43 이 요구한 **뜻이 있는 단계 이름**이
 * 여기서 나온다. `43/92` 만 보여주지 않는다.
 */
export const SECTION_ORDER = [
  "actual_work_interest",
  "exposure",
  "decision_ownership",
  "work_mode",
  "learning_intent",
  "career_context",
] as const;

const SECTION_OF: Record<string, (typeof SECTION_ORDER)[number]> = {
  actual_work_interest: "actual_work_interest",
  exposure: "exposure",
  decision_ownership: "decision_ownership",
  work_mode: "work_mode",
  learning_intent: "learning_intent",
};

export type Section = {
  key: string;
  items: Item[];
};

export function sectionsFor(tier: Tier): Section[] {
  const groups = new Map<string, Item[]>();
  for (const it of itemsFor(tier)) {
    /* 점수에 안 들어가는 맥락 문항도 한 자리에 모은다. 구성개념대로
       쪼개면 한 문항짜리 화면이 네 번 나온다 */
    const key = SECTION_OF[it.construct] ?? "career_context";
    const g = groups.get(key);
    if (g) g.push(it);
    else groups.set(key, [it]);
  }
  return SECTION_ORDER.filter((k) => groups.has(k)).map((k) => ({
    key: k,
    items: groups.get(k)!,
  }));
}

/**
 * 번역이 빠진 문항을 센다.
 *
 * 규격 §27 이 "missing translation detectable in tests/build" 를 요구한다.
 * 검사가 이 수를 읽고, 0 이 아니면 그 언어로 파는 것을 막는다.
 */
export function missingTranslations(lang: string): string[] {
  if (lang === "ko") return [];
  return bank()
    .items.filter((i) => typeof i[`${lang === "en" ? "en-US" : lang}` as keyof Item] !== "string")
    .map((i) => i.item_id);
}
