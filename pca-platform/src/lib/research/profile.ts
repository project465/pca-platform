import { query, queryOne } from "@/lib/db";
import type { ResearchDoc } from "@/lib/assistant/research-docs";

/**
 * **MAT 연구 이력**(2026-11-05 대표 "MAT의 성능이 석박사들 커버해야돼").
 *
 * 논문 · 연구과제 · 특허 · 장비/기법 · 학위를 한 줄씩 적는다. `research_items` 한 표에 종류(`kind`)와
 * 칸 값(`data`)으로 둔다.
 *
 * - **본인만 본다.** 읽고 쓰는 함수는 모두 `user_id` 로 거른다. 기관 화면 · 운영자 화면에서 읽지 않는다
 * - **사람이 확인해야 저장한다.** 파일(내 자료 읽기)로 칸을 미리 채워도 그것은 입력 칸의 기본값일 뿐이고,
 *   `확인했습니다` 칸을 누르고 저장해야 줄이 선다(`parseItem` 이 확인 칸 없는 저장을 받지 않는다)
 * - **공고와 맞출 낱말(`terms`)은 사람이 적은 칸에서만 나온다**: 분야어 · 기법 이름 · 전공.
 *   제목 글자를 쪼개 짐작하지 않는다
 * - 금액은 구간으로만 받는다(총사업비). 정확한 금액 · 과제 번호는 받지 않는다
 *
 * DB 를 읽지 않는 순수 함수(`parseItem` · `termsOf` · `prefillFromDoc` · `degreeLevelOf`)는
 * `npm run research:check` 가 직접 부른다.
 */

export const ITEM_KINDS = ["paper", "project", "patent", "method", "degree"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const AUTHOR_ROLES = ["first", "corresponding", "co"] as const;
export const PROJECT_ROLES = ["lead", "member", "staff"] as const;
/** 총사업비 구간. 값 그대로 저장하고 화면이 글자로 바꾼다 */
export const BUDGET_BANDS = ["lt1", "1to5", "5to10", "10to50", "gte50", "unknown"] as const;
export const PATENT_STATUS = ["filed", "registered"] as const;
export const METHOD_LEVELS = ["use", "operate", "develop"] as const;
export const DEGREE_LEVELS = ["bachelor", "master", "phd", "postdoc"] as const;
export const DEGREE_STATUS = ["done", "in_progress"] as const;

export type PaperData = { title: string; venue?: string; year?: number; authorRole?: (typeof AUTHOR_ROLES)[number]; doi?: string; keywords: string[] };
export type ProjectData = {
  title: string; agency?: string; program?: string; from?: string; to?: string;
  budget?: (typeof BUDGET_BANDS)[number]; role?: (typeof PROJECT_ROLES)[number]; participation?: number; tasks?: string; outputs?: string; keywords: string[];
};
export type PatentData = { title: string; status?: (typeof PATENT_STATUS)[number]; year?: number; inventorOrder?: number; keywords: string[] };
export type MethodData = { name: string; level?: (typeof METHOD_LEVELS)[number]; note?: string };
export type DegreeData = {
  level: (typeof DEGREE_LEVELS)[number]; status?: (typeof DEGREE_STATUS)[number]; major: string;
  advisorField?: string; thesisTitle?: string; year?: number; keywords: string[];
};
export type ItemData = PaperData | ProjectData | PatentData | MethodData | DegreeData;

export type ResearchItem = { id: string; kind: ItemKind; data: ItemData; terms: string[]; source_doc_id: string | null; updated_at: string };

/* ── 입력 받기(순수) ─────────────────────────────────────── */

type Form = { get(name: string): FormDataEntryValue | null };
const str = (f: Form, k: string, max: number): string | undefined => {
  const v = String(f.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return v || undefined;
};
const text = (f: Form, k: string, max: number): string | undefined => {
  const v = String(f.get(k) ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
  return v || undefined;
};
const pick = <T extends readonly string[]>(f: Form, k: string, list: T): T[number] | undefined => {
  const v = String(f.get(k) ?? "");
  return (list as readonly string[]).includes(v) ? (v as T[number]) : undefined;
};
const int = (f: Form, k: string, min: number, max: number): number | undefined => {
  const n = Number(String(f.get(k) ?? "").trim());
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
};
const month = (f: Form, k: string): string | undefined => {
  const v = String(f.get(k) ?? "").trim();
  return /^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(v) ? v : undefined;
};

/** 쉼표 · 줄바꿈으로 나눈 낱말. 2~40자, 15개까지, 같은 말은 한 번 */
export function splitKeywords(raw: string): string[] {
  const out: string[] = [];
  for (const p of String(raw ?? "").split(/[,\n;·]+/)) {
    const t = p.replace(/\s+/g, " ").trim();
    if (t.length < 2 || t.length > 40) continue;
    if (!out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= 15) break;
  }
  return out;
}

export type ParseResult = { ok: true; kind: ItemKind; data: ItemData } | { ok: false; why: "kind" | "confirm" | "required" };

/** 입력 칸 → 저장할 값. 확인 칸(`confirm=1`)이 없으면 받지 않는다 */
export function parseItem(f: Form): ParseResult {
  const kind = pick(f, "kind", ITEM_KINDS);
  if (!kind) return { ok: false, why: "kind" };
  if (String(f.get("confirm") ?? "") !== "1") return { ok: false, why: "confirm" };
  const keywords = splitKeywords(String(f.get("keywords") ?? ""));
  const year = int(f, "year", 1950, 2100);
  switch (kind) {
    case "paper": {
      const title = str(f, "title", 300);
      if (!title) return { ok: false, why: "required" };
      return { ok: true, kind, data: { title, venue: str(f, "venue", 200), year, authorRole: pick(f, "authorRole", AUTHOR_ROLES), doi: str(f, "doi", 200), keywords } };
    }
    case "project": {
      const title = str(f, "title", 300);
      if (!title) return { ok: false, why: "required" };
      return { ok: true, kind, data: {
        title, agency: str(f, "agency", 120), program: str(f, "program", 200), from: month(f, "from"), to: month(f, "to"),
        budget: pick(f, "budget", BUDGET_BANDS), role: pick(f, "role", PROJECT_ROLES), participation: int(f, "participation", 1, 100), tasks: text(f, "tasks", 600),
        outputs: str(f, "outputs", 300), keywords,
      } };
    }
    case "patent": {
      const title = str(f, "title", 300);
      if (!title) return { ok: false, why: "required" };
      return { ok: true, kind, data: { title, status: pick(f, "status", PATENT_STATUS), year, inventorOrder: int(f, "inventorOrder", 1, 50), keywords } };
    }
    case "method": {
      const name = str(f, "name", 80);
      if (!name) return { ok: false, why: "required" };
      return { ok: true, kind, data: { name, level: pick(f, "level", METHOD_LEVELS), note: str(f, "note", 200) } };
    }
    case "degree": {
      const level = pick(f, "level", DEGREE_LEVELS);
      const major = str(f, "major", 80);
      if (!level || !major) return { ok: false, why: "required" };
      return { ok: true, kind, data: {
        level, status: pick(f, "status", DEGREE_STATUS), major, advisorField: str(f, "advisorField", 80),
        thesisTitle: str(f, "thesisTitle", 300), year, keywords,
      } };
    }
  }
}

/** 공고와 맞출 낱말. 사람이 적은 분야어 · 기법 이름 · 전공 · 지도교수 분야만 */
export function termsOf(kind: ItemKind, d: ItemData): string[] {
  const list: string[] = [];
  if (kind === "method") list.push((d as MethodData).name);
  else if (kind === "degree") {
    const g = d as DegreeData;
    list.push(g.major, ...(g.advisorField ? [g.advisorField] : []), ...g.keywords);
  } else list.push(...((d as PaperData | ProjectData | PatentData).keywords ?? []));
  return splitKeywords(list.join(","));
}

/* ── 학위 단계 ──────────────────────────────────────────── */

export type Level = "bachelor" | "master" | "phd";
const RANK: Record<Level, number> = { bachelor: 1, master: 2, phd: 3 };

/** 적어 둔 학위 가운데 가장 높은 **마친** 단계. 과정 중이면 한 단계 아래로 친다. 학위 줄이 없으면 null */
export function degreeLevelOf(items: Pick<ResearchItem, "kind" | "data">[]): Level | null {
  let best: Level | null = null;
  for (const it of items) {
    if (it.kind !== "degree") continue;
    const d = it.data as DegreeData;
    const done = d.status !== "in_progress";
    const lv: Level | null = d.level === "postdoc" ? "phd"
      : d.level === "phd" ? (done ? "phd" : "master")
        : d.level === "master" ? (done ? "master" : "bachelor")
          : "bachelor";
    if (lv && (!best || RANK[lv] > RANK[best])) best = lv;
  }
  return best;
}
export const levelRank = (l: Level) => RANK[l];

/* ── 파일로 미리 채우기(순수) ─────────────────────────────── */

export type Prefill = { kind: ItemKind; values: Record<string, string> };

/**
 * 내 자료 읽기(`research_docs`) 한 건 → 입력 칸의 기본값. **저장하지 않는다**: 사람이 칸을 보고 고친 뒤
 * 확인하고 저장한다. 저자 순서 · 역할 · 총사업비처럼 자료에서 확실히 알 수 없는 칸은 비운다
 */
export function prefillFromDoc(doc: Pick<ResearchDoc, "doc_type" | "title" | "venue" | "year" | "doi" | "terms" | "data">): Prefill {
  const kw = (doc.terms ?? []).slice(0, 8).join(", ");
  const year = doc.year ? String(doc.year) : "";
  switch (doc.doc_type) {
    case "thesis":
      return { kind: "degree", values: { thesisTitle: doc.title, year, keywords: kw } };
    case "patent":
      return { kind: "patent", values: { title: doc.title, year, keywords: kw } };
    case "report":
      return { kind: "project", values: { title: doc.title, keywords: kw } };
    default:
      return { kind: "paper", values: { title: doc.title, venue: doc.venue ?? "", year, doi: doc.doi ?? "", keywords: kw } };
  }
}

/** 자료의 방법(`data.methods`)에서 장비 · 기법 줄로 옮길 이름. 사람이 골라서 저장한다 */
export function methodNamesFromDoc(doc: Pick<ResearchDoc, "data">): string[] {
  return splitKeywords((doc.data?.methods ?? []).filter((m) => m.length <= 40).join(",")).slice(0, 8);
}

/* ── DB ─────────────────────────────────────────────────── */

export async function itemsOf(userId: string): Promise<ResearchItem[]> {
  return query<ResearchItem>(
    `SELECT id::text, kind, data, terms, source_doc_id::text, updated_at::text
       FROM research_items WHERE user_id = $1 ORDER BY kind, updated_at DESC LIMIT 300`, [userId]).catch(() => []);
}

export async function itemOf(userId: string, id: string): Promise<ResearchItem | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  return queryOne<ResearchItem>(
    `SELECT id::text, kind, data, terms, source_doc_id::text, updated_at::text
       FROM research_items WHERE user_id = $1 AND id = $2`, [userId, id]).catch(() => null);
}

/** 새로 적거나(`id` 없음) 고친다. 남의 줄은 고치지 못한다(`user_id` 로 거른다) */
export async function saveItem(userId: string, p: { id?: string; kind: ItemKind; data: ItemData; sourceDocId?: string | null }): Promise<string | null> {
  const terms = termsOf(p.kind, p.data);
  if (p.id) {
    const r = await queryOne<{ id: string }>(
      `UPDATE research_items SET data = $3, terms = $4, updated_at = now()
        WHERE user_id = $1 AND id = $2 AND kind = $5 RETURNING id::text`,
      [userId, p.id, JSON.stringify(p.data), terms, p.kind]);
    return r?.id ?? null;
  }
  const doc = p.sourceDocId && /^\d{1,18}$/.test(p.sourceDocId)
    ? await queryOne<{ id: string }>(`SELECT id::text FROM research_docs WHERE user_id = $1 AND id = $2`, [userId, p.sourceDocId]).catch(() => null)
    : null;
  const r = await queryOne<{ id: string }>(
    `INSERT INTO research_items (user_id, kind, data, terms, source_doc_id) VALUES ($1, $2, $3, $4, $5) RETURNING id::text`,
    [userId, p.kind, JSON.stringify(p.data), terms, doc?.id ?? null]);
  return r?.id ?? null;
}

export async function deleteItem(userId: string, id: string): Promise<void> {
  if (!/^\d{1,18}$/.test(id)) return;
  await query(`DELETE FROM research_items WHERE user_id = $1 AND id = $2`, [userId, id]);
}

/* ── 알림 설정 ──────────────────────────────────────────── */

export const WATCH_CATEGORIES = ["출연연", "정출연", "기업 R&D", "공공기관", "대학원", "교원 임용"] as const;
export type AlertPrefs = { screen: boolean; email_daily: boolean; categories: string[]; min_score: number };
export const DEFAULT_PREFS: AlertPrefs = { screen: true, email_daily: true, categories: [], min_score: 40 };

export async function prefsOf(userId: string): Promise<AlertPrefs> {
  const r = await queryOne<AlertPrefs>(
    `SELECT screen, email_daily, categories, min_score FROM research_alert_prefs WHERE user_id = $1`, [userId]).catch(() => null);
  return r ?? DEFAULT_PREFS;
}

export async function savePrefs(userId: string, p: AlertPrefs): Promise<void> {
  const cats = p.categories.filter((c) => (WATCH_CATEGORIES as readonly string[]).includes(c));
  const min = Math.max(0, Math.min(100, Math.round(p.min_score)));
  await query(
    `INSERT INTO research_alert_prefs (user_id, screen, email_daily, categories, min_score) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET screen = $2, email_daily = $3, categories = $4, min_score = $5, updated_at = now()`,
    [userId, p.screen, p.email_daily, cats, min]);
}
