import { query } from "@/lib/db";

/**
 * 한국어 공고의 영어 요약(`job_posting_en`, 2026-11-03 영어 화면 · 국내 유학생).
 *
 * **공고 분석이 영어로 읽은 것만 담는다**(`assistant/posting.ts`): AI 가 영어로 읽은 직무 이름과 요구 줄이다.
 * 규칙으로 읽었으면(열쇠 없음 · 동의 안 함) 담지 않는다. 한국어 줄을 영어인 척 두지 않는다.
 * 표가 없는 DB(이 줄을 올리기 전)에서도 화면은 돈다: 읽기가 실패하면 빈 표로 본다
 */
export type PostingEn = { title: string; lines: string[] };

export async function enSummaries(ids: string[]): Promise<Map<string, PostingEn>> {
  const ok = [...new Set(ids.filter((x) => /^\d{1,18}$/.test(x)))];
  if (!ok.length) return new Map();
  const rows = await query<{ id: string; title: string; lines: string[] }>(
    `SELECT posting_id::text AS id, title, lines FROM job_posting_en WHERE posting_id = ANY($1::bigint[])`, [ok],
  ).catch(() => []);
  return new Map(rows.map((r) => [r.id, { title: r.title, lines: Array.isArray(r.lines) ? r.lines : [] }]));
}

/** 공고 하나의 영어 요약을 적는다. 같은 공고는 새 값으로 바꾼다. 실패해도 분석은 그대로다 */
export async function saveEnSummary(postingId: string, v: PostingEn, model: string | null): Promise<void> {
  const title = v.title.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!/^\d{1,18}$/.test(postingId) || !title || /[가-힣]/.test(title)) return;
  const lines = v.lines.map((x) => x.replace(/\s+/g, " ").trim().slice(0, 160)).filter((x) => x && !/[가-힣]{2}/.test(x)).slice(0, 12);
  await query(
    `INSERT INTO job_posting_en (posting_id, title, lines, model) VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (posting_id) DO UPDATE SET title = EXCLUDED.title, lines = EXCLUDED.lines, model = EXCLUDED.model, made_at = now()`,
    [postingId, title, JSON.stringify(lines), model]).catch(() => undefined);
}
