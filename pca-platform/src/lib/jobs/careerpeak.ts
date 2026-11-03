import { isProduction } from "@/lib/env";
import { query } from "@/lib/db";
import { opFail } from "@/lib/oplog";
import { ingest, type IngestResult, type RawPosting } from "./ingest";
import { envInt } from "./imweb";
import { fieldOf, regionLabelOf, todayKst, type DegreeMin } from "./meta";

/**
 * 커리어피크 **정출연 채용 캘린더**를 공고로 받는다(2026-11-03 대표 결정 "정출연 채용 캘린더(매일 아침 7시,
 * 학위 · 직군 · 고용 형태 · 날짜를 원문에서 확인한 공고)도 가져온다").
 *
 * **화면을 긁지 않고 공개 JSON 을 읽는다**(2026-11-03 시험 세션 확인). 캘린더 화면이 읽는 파일이
 * GitHub Pages 에 로그인 없이 열려 있다: `CP_URL`. 칸은 `id · org · org_short · title · url(공고 원문) ·
 * start · end · status · category(정규직 · 비정규 · 기타) · job_types(연구 · 기술 · 행정) · degrees(학사 · 석사 ·
 * 박사) · degree_note · evidence`, 전체에 `updated_at`. **이 컨테이너에서는 github.io 가 막혀 있어(403) 칸 구조를
 * 따른 흉내 파일로만 시험했다.** 운영에서 `npm run jobs:probe` 로 실제 파일을 읽어 본다.
 *
 * - **학위 · 직군은 사람이 확인한 값이다.** 같은 공고가 잡인더스트리 `/430` 에도 있으면 그 줄의 학위 · 직군 ·
 *   고용 형태를 이 값으로 덮고(`verified_source`), 화면에는 잡인더스트리 줄만 세운다(`verified_ref`).
 *   같은 공고인지는 원문 주소가 그 줄 본문에 있거나, 기관 이름과 제목이 같은지로 맞춘다
 * - **그 파일 주소만 연다**(`partner-job.ts` 와 같은 까닭: 서버가 남의 주소를 대신 여는 자리는 안쪽망을 두드리는
 *   통로가 된다). https · 그 호스트 · 그 경로만. 시험 주소는 운영이 아닐 때만 `CAREERPEAK_CALENDAR_URL` 로
 *   바꾸고, 그 호스트도 `CAREERPEAK_TEST_HOSTS` 에 있어야 한다. 넘겨받는 주소(리디렉션)는 따라가지 않는다
 * - **매일 아침 7시**(`CAREERPEAK_HOUR`, 서울 시각) 뒤 첫 당번에 한 번. 끄려면 `CAREERPEAK_SYNC=off`
 * - `updated_at` 이 하루 넘게 지났으면 운영 기록에 남기고 읽기는 계속한다(캘린더 쪽 갱신이 멈춘 것을 알아차리게)
 */

export const CP_SOURCE = "careerpeak";
export const CP_URL = "https://hari7211.github.io/careerpeak-calendar/data/jcy_calendar.json";
const CP_HOST = "hari7211.github.io";
const CP_PATH = "/careerpeak-calendar/";

function testHosts(): string[] {
  if (isProduction()) return [];
  return (process.env.CAREERPEAK_TEST_HOSTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** 열어도 되는 주소인가. 캘린더 파일 호스트 · 경로 · https 만(시험 호스트는 운영이 아닐 때만, http 도 받는다) */
export function cpUrlOk(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.username || u.password) return false;
  if (testHosts().includes(u.host)) return u.protocol === "https:" || u.protocol === "http:";
  return u.protocol === "https:" && u.hostname === CP_HOST && u.pathname.startsWith(CP_PATH) && !u.port;
}

export function cpUrl(): string {
  const t = (process.env.CAREERPEAK_CALENDAR_URL ?? "").trim();
  return t && !isProduction() && cpUrlOk(t) ? t : CP_URL;
}

export function cpEnabled(): boolean {
  return (process.env.CAREERPEAK_SYNC ?? "").trim().toLowerCase() !== "off";
}
/** 하루에 한 번 도는 시각(서울). 기본 7시 */
export const cpHour = () => envInt("CAREERPEAK_HOUR", 7, 0, 23);

export async function get(url: string): Promise<string> {
  if (!cpUrlOk(url)) throw new Error("host");
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
    headers: { "user-agent": "CareerMatri-MAT/1.0 (+https://app.careermatri.com)", accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export type CpItem = {
  id: string; org: string; org_short: string; title: string; url: string | null;
  start: string | null; end: string | null; status: string;
  category: string; job_types: string[]; degrees: string[]; degree_note: string; evidence: string;
};

const str = (v: unknown, n = 300): string => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, n) : "");
/* 배열로 오든 `연구·기술` 같은 글로 오든 받는다(파일 꼴을 직접 못 봤다) */
const list = (v: unknown): string[] =>
  (Array.isArray(v) ? v.map((x) => str(x, 20)) : str(v, 80).split(/[·,/|\s]+/)).filter(Boolean);

/**
 * 파일을 읽는다. 맨 위가 배열이어도, `{ updated_at, items: [...] }` 처럼 배열 칸 하나를 든 객체여도 받는다.
 * id · 제목이 없는 줄은 버린다.
 */
export function parseCalendar(text: string): { updatedAt: string | null; items: CpItem[] } {
  const j = JSON.parse(text) as unknown;
  const obj = (j && typeof j === "object" && !Array.isArray(j) ? j : {}) as Record<string, unknown>;
  const arr = Array.isArray(j) ? j
    : (["items", "postings", "events", "data", "list", "calendar"].map((k) => obj[k]).find(Array.isArray)
      ?? Object.values(obj).find(Array.isArray) ?? []) as unknown[];
  const items: CpItem[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = str(r.id, 80), title = str(r.title);
    if (!id || !title) continue;
    const url = str(r.url, 600);
    items.push({
      id, title, org: str(r.org, 80), org_short: str(r.org_short, 40), url: /^https?:\/\//i.test(url) ? url : null,
      start: str(r.start, 40) || null, end: str(r.end, 40) || null, status: str(r.status, 20),
      category: str(r.category, 20), job_types: list(r.job_types), degrees: list(r.degrees),
      degree_note: str(r.degree_note, 200), evidence: str(r.evidence, 1000),
    });
  }
  return { updatedAt: str(obj.updated_at, 40) || null, items };
}

const RANK: Record<string, number> = { 학사: 1, 석사: 2, 박사: 3 };
const MIN: Record<string, DegreeMin> = { 학사: "bachelor", 석사: "master", 박사: "phd" };

/** 학위 표시와 가장 낮은 학위. `degrees` 가 하나이고 `degree_note` 에 `이상` 이 있으면 `석사 이상` 꼴 */
export function cpDegree(it: Pick<CpItem, "degrees" | "degree_note">): { label: string | null; min: DegreeMin | null } {
  const ds = [...new Set(it.degrees.map((d) => d.replace(/학위$/, "")).filter((d) => RANK[d]))].sort((a, b) => RANK[a] - RANK[b]);
  if (!ds.length) return { label: null, min: null };
  const label = ds.length === 1 && new RegExp(`${ds[0]}\\s?(학위\\s?)?(소지자?\\s?)?이상`).test(it.degree_note) ? `${ds[0]} 이상` : ds.join("·");
  return { label, min: MIN[ds[0]] };
}

/** 마감 · 종료로 적힌 줄인가(날짜가 지났는지는 `ingest` 가 다시 본다) */
const CLOSED = /마감|종료|closed|ended/i;

export function cpRows(items: CpItem[]): RawPosting[] {
  return items.filter((it) => !CLOSED.test(it.status)).map((it) => {
    const org = it.org_short || it.org;
    /* 캘린더 제목에 기관 이름이 없으면 앞에 붙인다(카드에서 어느 기관 공고인지 보이게) */
    const title = org && !it.title.includes(org) && !(it.org && it.title.includes(it.org)) ? `${org} ${it.title}` : it.title;
    const body = [it.degree_note, it.evidence].filter(Boolean).join("\n");
    const deg = cpDegree(it);
    const reg = regionLabelOf(title, body);
    return {
      source: CP_SOURCE, sourceRef: it.id, url: it.url, title, body,
      address: null, postedOn: it.start, closesOn: it.end,
      meta: {
        category: "정출연", field: fieldOf(title, body), degreeLabel: deg.label, degreeMin: deg.min, kind: "job",
        regionLabel: reg.label, abroad: reg.abroad,
        jobFamily: it.job_types.join("·") || null, employmentType: it.category || null,
      },
    };
  });
}

/**
 * 잡인더스트리에 같은 공고가 있으면 그 줄에 사람이 확인한 학위 · 직군 · 고용 형태를 덮는다.
 * 같은 공고: 그 줄 본문 줄에 원문 주소가 있거나, 제목(글자만 남긴 것)에 캘린더 제목과 기관 이름이 다 들어 있다.
 * 칸이 없는 DB 에서는 아무것도 하지 않는다. 몇 줄을 덮었는지 돌려준다.
 */
export async function applyVerified(items: CpItem[]): Promise<number> {
  let n = 0;
  const norm = (s: string) => s.replace(/[^가-힣A-Za-z0-9]/g, "");
  for (const it of items) {
    if (CLOSED.test(it.status)) continue;
    const deg = cpDegree(it);
    const orgs = [it.org, it.org_short].map(norm).filter((x) => x.length >= 2);
    const t = norm(it.title);
    if (t.length < 4 && !it.url) continue;
    const r = await query<{ id: string }>(
      `UPDATE v3_job_postings SET
         degree_label = COALESCE($1, degree_label), degree_min = COALESCE($2, degree_min),
         job_family = COALESCE($3, job_family), employment_type = COALESCE($4, employment_type),
         verified_source = 'careerpeak', verified_ref = $5
       WHERE source = 'jobindustry' AND posting_kind IS DISTINCT FROM 'funding'
         AND (
           ($6::text IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(raw_requirements) l WHERE strpos(l, $6) > 0))
           OR (length($7) >= 4 AND strpos(regexp_replace(coalesce(title, ''), '[^가-힣A-Za-z0-9]', '', 'g'), $7) > 0
               AND EXISTS (SELECT 1 FROM unnest($8::text[]) o WHERE strpos(regexp_replace(coalesce(title, ''), '[^가-힣A-Za-z0-9]', '', 'g'), o) > 0))
         )
       RETURNING id::text`,
      [deg.label, deg.min, it.job_types.join("·") || null, it.category || null, it.id, it.url, t, orgs],
    ).catch(() => []);
    n += r.length;
  }
  return n;
}

let ranDay = "";

/** 오늘 돌 차례인가: 서울 시각 7시가 지났고 오늘 아직 안 돌았을 때 */
export function cpDue(now = new Date()): boolean {
  if (!cpEnabled()) return false;
  const kstHour = new Date(now.getTime() + 9 * 3600_000).getUTCHours();
  return ranDay !== todayKst(now) && kstHour >= cpHour();
}

export type CpResult = {
  ok: boolean; items: number; ingested: number; verified: number; stale: boolean;
  skipped: IngestResult["skipped"] & { status: number }; error?: string;
};

export async function runCareerpeak(opts: {
  now?: Date; get?: (url: string) => Promise<string>;
  test?: { save?: (rows: RawPosting[]) => Promise<IngestResult>; verify?: (items: CpItem[]) => Promise<number> };
} = {}): Promise<CpResult> {
  const now = opts.now ?? new Date();
  ranDay = todayKst(now);
  let cal: ReturnType<typeof parseCalendar>;
  try {
    cal = parseCalendar(await (opts.get ?? get)(cpUrl()));
  } catch (e) {
    opFail({ operation: "jobs.careerpeak", step: "fetch", category: "upstream" }, e);
    return { ok: false, items: 0, ingested: 0, verified: 0, stale: false, skipped: { noTitle: 0, closed: 0, status: 0 }, error: "fetch" };
  }
  const upd = cal.updatedAt ? Date.parse(cal.updatedAt) : NaN;
  const stale = !Number.isFinite(upd) || now.getTime() - upd > 24 * 3600_000;
  if (stale) {
    opFail({ operation: "jobs.careerpeak", step: "stale", category: "upstream", detail: `updated_at=${cal.updatedAt ?? "없음"}` });
  }
  const rows = cpRows(cal.items);
  const r = rows.length ? await (opts.test?.save ?? ingest)(rows)
    : { seen: 0, mapped: 0, unmapped: 0, stored: 0, skipped: { noTitle: 0, closed: 0 } };
  const verified = await (opts.test?.verify ?? applyVerified)(cal.items);
  return {
    ok: true, items: cal.items.length, ingested: r.stored, verified, stale,
    skipped: { ...r.skipped, status: cal.items.length - rows.length },
  };
}
