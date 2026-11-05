import { query, queryOne } from "@/lib/db";
import { enqueue, mailReady } from "@/lib/outbox";
import { opFail, ref } from "@/lib/oplog";
import { degreeLevelOf, itemsOf, levelRank, prefsOf, DEFAULT_PREFS, type AlertPrefs, type Level, type ResearchItem } from "./profile";

/**
 * **연구 이력 ↔ 잡인더 · 커리어피크 공고 1차 맞춤**(AI 없음).
 *
 * 점수(0~100)는 셋을 더한다.
 *
 * | 칸 | 값 |
 * |---|---|
 * | 겹친 낱말 | 1개 25 · 2개 45 · 3개 60 · 4개 이상 70 |
 * | 학위 | 공고가 요구하는 학위를 갖췄으면 15, 공고에 학위 요구가 없으면 5. **요구보다 낮으면 뺀다** |
 * | 공고 종류 | 알림 설정에서 고른 종류면 15, 고른 것이 없으면 10. **고른 종류가 아니면 뺀다** |
 *
 * - 겹친 낱말이 하나도 없으면 맞춤이 아니다(줄을 세우지 않는다)
 * - 학위 줄을 적지 않은 사람은 학위로 빼지 않고 학위 칸 점수도 없다
 * - 낱말은 사람이 적은 분야 낱말 · 기법 이름 · 전공뿐이다(`profile.ts termsOf`). 공고 쪽은 제목 · 분야 ·
 *   분류 · 모집 분야 · 지원 자격 · 요구 줄을 본다. 영문 3자 이하 낱말(AI · CFD)은 낱말 경계로만 맞춘다
 * - 연구비 · 평가위원 · 교육 게시판, 마감 지난 공고, 제목 없는 공고는 보지 않는다
 *
 * **합격 가능성을 말하지 않는다.** 점수는 겹친 정도이고, 화면은 무엇이 겹쳤는지를 함께 보인다.
 */

export type PostingForMatch = {
  id: string; title: string | null; field: string | null; category: string | null; degree_min: string | null;
  degree_label: string | null; posting_kind: string | null; posting_fields: Record<string, string> | null;
  raw_requirements: string[] | null;
};

export type MatchReasons = {
  terms: { term: string; items: string[] }[];
  degree: "fit" | "none" | "unknown";
  category: "picked" | "any";
};
export type MatchScore = { score: number; reasons: MatchReasons } | null;

const RANK_OF: Record<string, number> = { bachelor: 1, master: 2, phd: 3 };

/** 공고에서 맞출 글자 한 덩이(소문자) */
export function postingText(p: PostingForMatch): string {
  const fields = p.posting_fields ? Object.entries(p.posting_fields)
    .filter(([k]) => /모집분야|지원자격|분야|자격|우대/.test(k)).map(([, v]) => v) : [];
  return [p.title, p.field, p.category, p.degree_label, ...fields, ...(p.raw_requirements ?? [])]
    .filter(Boolean).join("\n").toLowerCase();
}

/** 낱말 하나가 글에 있는가. 영문 3자 이하는 낱말 경계로만(`AI` 가 `MAIL` 에 맞지 않게) */
export function hasTerm(textLower: string, term: string): boolean {
  const t = term.toLowerCase().trim();
  if (!t) return false;
  if (/^[a-z0-9+#.\- ]+$/.test(t) && t.replace(/\s/g, "").length <= 3) {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(textLower);
  }
  return textLower.includes(t);
}

/** 한 사람 × 공고 하나. 맞지 않으면 null */
export function scorePosting(
  p: PostingForMatch,
  me: { items: Pick<ResearchItem, "id" | "terms">[]; level: Level | null; categories: string[] },
): MatchScore {
  const hay = postingText(p);
  const hit = new Map<string, string[]>();
  for (const it of me.items) {
    for (const term of it.terms) {
      if (!hasTerm(hay, term)) continue;
      const k = term.toLowerCase();
      const at = [...hit.keys()].find((x) => x.toLowerCase() === k) ?? term;
      hit.set(at, [...new Set([...(hit.get(at) ?? []), it.id])]);
    }
  }
  if (!hit.size) return null;
  /* 학위: 공고 요구보다 낮으면 뺀다. 학위 줄이 없으면 빼지 않는다 */
  const need = p.degree_min && p.degree_min !== "any" ? RANK_OF[p.degree_min] ?? 0 : 0;
  let degree: MatchReasons["degree"] = "unknown";
  if (me.level) {
    if (need && levelRank(me.level) < need) return null;
    degree = need ? "fit" : "none";
  }
  /* 종류: 고른 것이 있으면 그 종류만 */
  const picked = me.categories.length > 0;
  if (picked && !me.categories.includes(p.category ?? "")) return null;
  const n = hit.size;
  const termPart = n >= 4 ? 70 : n === 3 ? 60 : n === 2 ? 45 : 25;
  const score = Math.min(100, termPart + (degree === "fit" ? 15 : degree === "none" ? 5 : 0) + (picked ? 15 : 10));
  return {
    score,
    reasons: { terms: [...hit.entries()].map(([term, items]) => ({ term, items })), degree, category: picked ? "picked" : "any" },
  };
}

/* ── DB ─────────────────────────────────────────────────── */

/* 연구 이력과 맞출 공고: 우리 두 사이트, 채용 · 대학원 · 교원(연구비 · 평가위원 · 교육 빼고), 마감 전, 제목 있음 */
const CANDIDATES = `
  SELECT id::text, title, field, category, degree_min, degree_label, posting_kind, posting_fields, raw_requirements
    FROM v3_job_postings
   WHERE source IN ('jobindustry', 'careerpeak') AND title IS NOT NULL
     AND (posting_kind IS NULL OR posting_kind IN ('job', 'grad', 'faculty'))
     AND (closes_on IS NULL OR closes_on >= (now() AT TIME ZONE 'Asia/Seoul')::date)`;

async function upsert(userId: string, postingId: string, m: NonNullable<MatchScore>, quiet: boolean): Promise<boolean> {
  const r = await queryOne<{ fresh: boolean }>(
    `INSERT INTO research_matches (user_id, posting_id, score, reasons, notified_at, mailed_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $5 THEN now() END, CASE WHEN $5 THEN now() END)
     ON CONFLICT (user_id, posting_id) DO UPDATE SET score = EXCLUDED.score, reasons = EXCLUDED.reasons, updated_at = now()
     RETURNING (xmax = 0) AS fresh`,
    [userId, postingId, m.score, JSON.stringify(m.reasons), quiet]);
  return Boolean(r?.fresh);
}

/**
 * 한 사람의 맞춤을 처음부터 다시 센다(연구 이력 · 알림 설정을 저장한 뒤). **이때 새로 맞은 공고는 알림을
 * 만들지 않는다**: 그 사람이 지금 화면에서 보고 있다. 더 맞지 않는 공고 줄은 지운다
 */
export async function refreshMatches(userId: string): Promise<{ matched: number }> {
  const [items, prefs, postings] = await Promise.all([
    itemsOf(userId), prefsOf(userId), query<PostingForMatch>(CANDIDATES).catch(() => []),
  ]);
  const me = { items, level: degreeLevelOf(items), categories: prefs.categories };
  const keep: string[] = [];
  for (const p of postings) {
    const m = scorePosting(p, me);
    if (!m) continue;
    await upsert(userId, p.id, m, true);
    keep.push(p.id);
  }
  await query(`DELETE FROM research_matches WHERE user_id = $1 AND NOT (posting_id = ANY($2::bigint[]))`, [userId, keep]);
  return { matched: keep.length };
}

/**
 * **새로 가져온 공고를 연구 이력이 있는 사람마다 맞춘다**(공고 가져오기 당번 뒤, `jobs/tick.ts`).
 * 새로 맞은 줄이 기준 점수를 넘고 화면 알림을 켠 사람에게 MAT 알림 한 줄을 쌓는다(공고 이름은 적지 않는다:
 * 같은 줄이 기기 알림 · 메일의 근거가 된다). 표가 없으면(DB 를 올리기 전) 조용히 0
 */
export async function matchNewPostings(since: Date): Promise<{ users: number; fresh: number; nudged: number }> {
  const postings = await query<PostingForMatch>(`${CANDIDATES} AND captured_at >= $1`, [since.toISOString()]).catch(() => null);
  if (!postings?.length) return { users: 0, fresh: 0, nudged: 0 };
  const users = await query<{ id: string }>(
    `SELECT DISTINCT r.user_id::text AS id FROM research_items r JOIN users u ON u.id = r.user_id WHERE u.status = 'active'`).catch(() => []);
  let fresh = 0, nudged = 0;
  for (const u of users) {
    try {
      const [items, prefs] = await Promise.all([itemsOf(u.id), prefsOf(u.id)]);
      const me = { items, level: degreeLevelOf(items), categories: prefs.categories };
      const got: string[] = [];
      for (const p of postings) {
        const m = scorePosting(p, me);
        if (m && (await upsert(u.id, p.id, m, false)) && m.score >= prefs.min_score) got.push(p.id);
      }
      fresh += got.length;
      if (got.length && (await nudgeFresh(u.id, prefs))) nudged += 1;
    } catch (e) {
      opFail({ operation: "research.match", ref: ref("user", u.id), step: "new", category: "db" }, e);
    }
  }
  return { users: users.length, fresh, nudged };
}

/** 알림을 아직 쌓지 않은 새 맞춤을 한 줄로 묶어 쌓는다. 화면 알림을 끈 사람은 표시만 하고 쌓지 않는다 */
async function nudgeFresh(userId: string, prefs: AlertPrefs): Promise<boolean> {
  const rows = await query<{ posting_id: string }>(
    `UPDATE research_matches SET notified_at = now()
      WHERE user_id = $1 AND notified_at IS NULL AND score >= $2 RETURNING posting_id::text`,
    [userId, prefs.min_score]);
  if (!rows.length || !prefs.screen) return false;
  const en = await queryOne<{ en: boolean }>(`SELECT (locale = 'en') AS en FROM users WHERE id = $1`, [userId]).catch(() => null);
  const n = rows.length;
  const first = rows.map((r) => r.posting_id).sort()[0];
  const r = await query<{ id: string }>(
    `INSERT INTO assistant_nudges (user_id, kind, title, body, href, dedupe_key)
     VALUES ($1, 'match', $2, $3, '/mat/research/matches', $4)
     ON CONFLICT (user_id, dedupe_key) DO NOTHING RETURNING id::text`,
    [userId,
      en?.en ? `${n} new posting${n === 1 ? "" : "s"} match your research record` : `내 연구 이력과 맞는 새 공고 ${n}건`,
      en?.en ? "See which keywords matched. Check each posting on its original page." : "어떤 낱말이 맞았는지 보세요. 지원은 원문에서 하세요.",
      `research:${first}:${n}`]).catch(() => []);
  return r.length > 0;
}

/** 한국 시각 날짜 · 시 */
function kst(now: Date): { day: string; hour: number } {
  const k = new Date(now.getTime() + 9 * 3600_000);
  return { day: k.toISOString().slice(0, 10), hour: k.getUTCHours() };
}

/** 하루 한 번 메일을 보내는 시각(한국 시각). 이 시각 뒤 첫 당번이 보낸다 */
export const DAILY_MAIL_HOUR = 8;

/**
 * **하루 한 번 모아 보내는 메일**(밤 당번이 5분마다 부른다, 하루 한 통은 `dedupe_key` 가 지킨다).
 *
 * - 운영 메일 설정이 없으면(`mailReady()` 거짓) 아무것도 쌓지 않는다. 화면 알림만 돈다. 나중에 설정이 붙어도
 *   지난 맞춤이 한꺼번에 나가지 않게 이틀 안의 맞춤만 담는다
 * - 메일을 끈 사람(`email_daily`)과 주소가 없는 사람은 빼고, 기준 점수를 넘는 새 맞춤만 센다
 * - 메일에는 몇 건인지만 적는다(공고 이름 · 낱말을 적지 않는다: 메일은 남의 눈에 띌 수 있다)
 */
export async function researchDailyMail(now = new Date()): Promise<{ mailed: number; skipped?: "mail" | "hour" }> {
  if (!mailReady()) return { mailed: 0, skipped: "mail" };
  const { day, hour } = kst(now);
  if (hour < DAILY_MAIL_HOUR) return { mailed: 0, skipped: "hour" };
  const users = await query<{ id: string; locale: string | null; email_daily: boolean | null; min_score: number | null }>(
    `SELECT DISTINCT m.user_id::text AS id, u.locale, p.email_daily, p.min_score
       FROM research_matches m JOIN users u ON u.id = m.user_id
       LEFT JOIN research_alert_prefs p ON p.user_id = m.user_id
      WHERE m.mailed_at IS NULL AND m.created_at > now() - interval '2 days'
        AND u.status = 'active' AND u.email IS NOT NULL`).catch(() => []);
  let mailed = 0;
  for (const u of users) {
    if (!(u.email_daily ?? DEFAULT_PREFS.email_daily)) continue;
    const key = `research_daily:${u.id}:${day}`;
    const sent = await queryOne<{ id: string }>(`SELECT id::text FROM outbox WHERE dedupe_key = $1`, [key]).catch(() => null);
    if (sent) continue;
    const rows = await query<{ posting_id: string }>(
      `UPDATE research_matches SET mailed_at = now()
        WHERE user_id = $1 AND mailed_at IS NULL AND created_at > now() - interval '2 days' AND score >= $2
        RETURNING posting_id::text`,
      [u.id, u.min_score ?? DEFAULT_PREFS.min_score]);
    if (!rows.length) continue;
    await enqueue({
      kind: "assistant_digest", userId: u.id, payload: { research: "1", n: String(rows.length) },
      dedupeKey: key, locale: u.locale === "en" ? "en" : "ko",
    });
    mailed += 1;
  }
  return { mailed };
}

/* ── 화면이 읽는 것 ─────────────────────────────────────── */

export type MatchRow = {
  posting_id: string; score: number; reasons: MatchReasons; ai: unknown; ai_at: string | null;
  title: string; category: string | null; degree_label: string | null; region_label: string | null;
  closes_on: string | null; source: string; source_url: string | null; created_at: string;
};

export async function matchesOf(userId: string, minScore = 0, limit = 60): Promise<MatchRow[]> {
  return query<MatchRow>(
    `SELECT m.posting_id::text, m.score, m.reasons, m.ai, m.ai_at::text, p.title, p.category, p.degree_label, p.region_label,
            p.closes_on::text, p.source, p.source_url, m.created_at::text
       FROM research_matches m JOIN v3_job_postings p ON p.id = m.posting_id
      WHERE m.user_id = $1 AND m.score >= $2
        AND (p.closes_on IS NULL OR p.closes_on >= (now() AT TIME ZONE 'Asia/Seoul')::date)
      ORDER BY m.score DESC, m.created_at DESC LIMIT $3`, [userId, minScore, limit]).catch(() => []);
}

export async function matchOf(userId: string, postingId: string): Promise<MatchRow | null> {
  if (!/^\d{1,18}$/.test(postingId)) return null;
  return queryOne<MatchRow>(
    `SELECT m.posting_id::text, m.score, m.reasons, m.ai, m.ai_at::text, p.title, p.category, p.degree_label, p.region_label,
            p.closes_on::text, p.source, p.source_url, m.created_at::text
       FROM research_matches m JOIN v3_job_postings p ON p.id = m.posting_id
      WHERE m.user_id = $1 AND m.posting_id = $2`, [userId, postingId]).catch(() => null);
}
