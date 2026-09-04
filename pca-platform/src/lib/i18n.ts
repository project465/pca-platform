import type { PoolClient } from "pg";
import { query } from "@/lib/db";

/**
 * 사람이 읽는 이름은 전부 translations 에 있다 (설계 원칙 2).
 * 요청한 언어에 행이 없으면 ko 로, 그것도 없으면 아무 언어로 떨어진다.
 * 화면에 빈 칸이 뜨는 것보다는 다른 언어라도 보이는 편이 낫다.
 */
export async function namesOf(
  tableName: string,
  rowIds: string[],
  lang: string,
  field = "name",
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (rowIds.length === 0) return out;

  const rows = await query<{ row_id: string; lang: string; value: string }>(
    `SELECT row_id, lang, value
       FROM translations
      WHERE table_name = $1 AND field = $2 AND row_id = ANY($3::bigint[])`,
    [tableName, field, rowIds],
  );

  const rank = (l: string) => (l === lang ? 0 : l === "ko" ? 1 : 2);
  for (const r of rows) {
    const cur = out.get(r.row_id);
    if (cur === undefined) {
      out.set(r.row_id, r.value);
      continue;
    }
    const curRank = rows
      .filter((x) => x.row_id === r.row_id && x.value === cur)
      .map((x) => rank(x.lang))[0];
    if (rank(r.lang) < (curRank ?? 9)) out.set(r.row_id, r.value);
  }
  return out;
}

export async function nameOf(
  tableName: string,
  rowId: string,
  lang: string,
  field = "name",
): Promise<string | null> {
  const m = await namesOf(tableName, [rowId], lang, field);
  return m.get(rowId) ?? null;
}

/** 같은 (table,row,lang,field) 가 있으면 덮어쓴다. */
export async function setTranslation(
  client: PoolClient,
  tableName: string,
  rowId: string,
  lang: string,
  field: string,
  value: string,
): Promise<void> {
  await client.query(
    `INSERT INTO translations (table_name, row_id, lang, field, value)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (table_name, row_id, lang, field)
     DO UPDATE SET value = EXCLUDED.value`,
    [tableName, rowId, lang, field, value],
  );
}
