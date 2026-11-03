import { queryOne } from "@/lib/db";

/** 모아 둔 잡인더스트리 공고 가운데 이 idx(`source_ref`). 없으면 null */
export async function jiPosting(idx: string): Promise<{ id: string; title: string | null; core: string | null; req: string[] } | null> {
  if (!/^\d{1,12}$/.test(idx)) return null;
  return queryOne<{ id: string; title: string | null; core: string | null; req: string[] }>(
    `SELECT id::text, title, core_code AS core, coalesce(raw_requirements, '{}') AS req FROM v3_job_postings
      WHERE source = 'jobindustry' AND source_ref = $1 ORDER BY id DESC LIMIT 1`, [idx]).catch(() => null);
}
