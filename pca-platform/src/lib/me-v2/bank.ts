/**
 * ME_V2 문항 은행을 서버에서 읽는다.
 *
 * **검사지를 한 벌 더 만들지 않는다.** 원본은 `sites/pca-platform/assessment/
 * ME_V2/*.json` 이고, 정적 화면이 쓰는 `data/me-v2.js` 도 그 JSON 에서
 * 만들어진다(`npm run v2:build`). 서버가 그 JSON 을 그대로 읽으면 두 쪽이
 * 같은 문항을 본다. 여기서 문항을 고치거나 번역을 지어내지 않는다.
 *
 * **두 언어가 한 문항을 공유한다.** 항목 하나에 `ko-KR` 과 `en-US` 가 같이
 * 있고 `item_id` 는 하나다. 영어판을 따로 만들면 문항이 두 벌이 되고, 그러면
 * 한쪽을 고칠 때 다른 쪽이 뒤처져 같은 번호가 다른 것을 묻게 된다.
 *
 * **없는 번역을 만들어 내지 않는다.** 영어가 빠진 문항은 `textOf()` 가
 * 한국어를 돌려주고 `missingTranslations()` 가 세어 밖으로 알린다. 그 수가
 * 0 이 아니면 그 언어로 파는 것을 검사가 막는다.
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
  "en-US"?: string;
  semantic?: string;
  scored?: boolean;
  stage_adaptive?: boolean;
  /** 고르기형 문항의 보기. 원본은 글자 배열이고 `options-en` 이 짝이다 */
  options?: (string | { value?: string; "ko-KR"?: string })[];
  "options-en"?: string[];
  career_family_weights?: Record<string, number>;
  [k: string]: unknown;
};

export type Scale = {
  label: string;
  measures?: string;
  points?: string[];
  "label-en"?: string;
  "measures-en"?: string;
  "points-en"?: string[];
};

/** 내놓는 언어 둘. 셋째는 승인된 번역이 생기는 날 늘린다 */
export type Lang = "ko" | "en";
export function isLang2(v: string | null | undefined): v is Lang {
  return v === "ko" || v === "en";
}

type Bank = {
  items: Item[];
  byTier: Record<Tier, Item[]>;
  scales: Record<string, Scale>;
  variants: Record<string, Record<string, string | Record<string, string>>>;
  families: Record<string, string>;
  familiesEn: Record<string, string>;
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
  const variants = read<{
    variants: Record<string, Record<string, string | Record<string, string>>>;
  }>("stage-variants.json");
  const fam = read<{ names: Record<string, string>; "names-en"?: Record<string, string> }>(
    "family-names.json",
  );

  const basic = core.items;
  const standard = [...core.items, ...std.items];
  const all = [...core.items, ...std.items, ...pro.items];

  cached = {
    items: all,
    byTier: { BASIC: basic, STANDARD: standard, PRO: all },
    scales: scales.scales,
    variants: variants.variants,
    families: fam.names,
    familiesEn: fam["names-en"] ?? {},
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
  const en = lang === "en";
  if (item.stage_adaptive) {
    const v = bank().variants[item.item_id];
    if (en) {
      const block = v?.en;
      if (block && typeof block === "object" && typeof block[stage] === "string") {
        return block[stage];
      }
    }
    const ko = v?.[stage];
    if (typeof ko === "string" && ko) return ko;
  }
  if (en && item["en-US"]) return item["en-US"];
  return item["ko-KR"] ?? item.semantic ?? item.item_id;
}

/**
 * 이 문항의 보기.
 *
 * **날 번호를 내보내지 않는다.** 고르기형 문항의 원본 보기는 글자 배열인데,
 * 예전에는 그것을 `{value, "ko-KR"}` 로 보고 있어서 `1 2 3 …` 이 화면에
 * 찍혔다. 규격이 막는 것이 그것이다: 응시자는 번호를 고를 수 없다.
 *
 * 값은 두 언어가 같다(`"1"`, `"2"` …). **바뀌는 것은 글자뿐이라** 같은
 * 응답이 같은 점수를 받는다.
 */
export function choicesOf(item: Item, lang: string = "ko"): { value: string; label: string }[] {
  if (Array.isArray(item.options)) {
    const en = lang === "en" ? item["options-en"] : undefined;
    return item.options.map((o, i) => {
      const ko = typeof o === "string" ? o : (o["ko-KR"] ?? o.value ?? "");
      const val = typeof o === "string" ? String(i + 1) : String(o.value ?? i + 1);
      return { value: val, label: (en?.[i] ?? ko) || val };
    });
  }
  const s = bank().scales[item.scale];
  const pts = (lang === "en" ? s?.["points-en"] : undefined) ?? s?.points;
  if (pts) return pts.map((p, i) => ({ value: String(i + 1), label: p }));
  return [];
}

export function scaleOf(item: Item): Scale | null {
  return bank().scales[item.scale] ?? null;
}

/** 척도 이름. 화면이 보기 묶음의 머리말로 쓴다 */
export function scaleLabel(item: Item, lang: string = "ko"): string {
  const s = scaleOf(item);
  if (!s) return "";
  return (lang === "en" ? s["label-en"] : undefined) ?? s.label ?? "";
}

/** 직무군 이름. **키는 두 언어가 같다**: 갈리는 것은 글자뿐이다 */
export function familyName(code: string, lang: string = "ko"): string {
  const b = bank();
  return (lang === "en" ? b.familiesEn[code] : undefined) ?? b.families[code] ?? code;
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
  const b = bank();
  const out: string[] = [];
  const STAGES: Stage[] = ["bachelor", "master", "phd", "postdoc"];
  for (const i of b.items) {
    if (i.stage_adaptive) {
      /* 단계마다 묻는 장면이 달라지므로 넷이 다 있어야 한 문항이 번역된
         것이다. 하나만 있으면 박사 응시자가 학부 문장을 받는다 */
      const en = b.variants[i.item_id]?.en;
      const ok = en && typeof en === "object"
        && STAGES.every((st) => typeof en[st] === "string" && en[st]);
      if (!ok) out.push(i.item_id);
      continue;
    }
    if (typeof i["en-US"] !== "string" || !i["en-US"]) { out.push(i.item_id); continue; }
    /* **보기도 문항의 일부다.** 본문만 영어고 보기가 한국어면 영어권
       응시자는 읽을 수 없는 것을 고르게 된다 */
    if (Array.isArray(i.options)) {
      const en = i["options-en"];
      if (!Array.isArray(en) || en.length !== i.options.length) {
        out.push(`${i.item_id}:options`);
      }
    }
  }
  return out;
}

/** 척도 쪽에 빠진 번역. 문항과 따로 센다: 고치는 자리가 다르다 */
export function missingScaleTranslations(lang: string): string[] {
  if (lang === "ko") return [];
  const out: string[] = [];
  for (const [key, s] of Object.entries(bank().scales)) {
    if (!s["label-en"]) out.push(`${key}:label`);
    if (s.points && (s["points-en"] ?? []).length !== s.points.length) {
      out.push(`${key}:points`);
    }
  }
  return out;
}

/** 직무군 이름 쪽에 빠진 번역 */
export function missingFamilyTranslations(lang: string): string[] {
  if (lang === "ko") return [];
  const b = bank();
  return Object.keys(b.families).filter((k) => !b.familiesEn[k]);
}
