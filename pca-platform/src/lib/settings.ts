/**
 * 운영 설정.
 *
 * 사업자 표시처럼 **사업자가 직접 넣어야 하는 값**이다. 환경변수에만
 * 두면 한 글자를 고치는 데 배포가 필요하고, 그러면 런칭이 개발 일정에
 * 묶인다.
 *
 * **읽는 자리는 하나다.** `get()` 이 표를 먼저 보고 없으면 환경변수를
 * 본다. 두 곳을 각각 읽으면 화면과 검사가 다른 답을 낸다(설계 원칙 10).
 *
 * **비밀은 여기 담지 않는다.** 결제 열쇠와 메일 비밀번호는 환경변수에
 * 남는다: 운영 화면에서 고칠 수 있게 두면 그 화면이 열쇠 보관함이 되고,
 * 운영자 계정 하나가 새면 돈길이 통째로 열린다.
 */
import { query, queryOne } from "./db";

let cache: Map<string, string> | null = null;
let at = 0;
const TTL = 30_000;

async function load(): Promise<Map<string, string>> {
  if (cache && Date.now() - at < TTL) return cache;
  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM site_settings`,
  ).catch(() => []);
  cache = new Map(rows.map((r) => [r.key, r.value]));
  at = Date.now();
  return cache;
}

/** 고친 직후에 옛 값을 보여 주지 않으려고 비운다 */
export function forget(): void {
  cache = null;
  at = 0;
}

/**
 * 표 → 환경변수 → 없음.
 *
 * **빈 문자열은 없는 것으로 본다.** 운영 화면에서 지운 값이 남아 있으면
 * 비었다고 말해야 `launch:check` 가 그것을 막는다.
 */
export async function get(key: string, envName?: string): Promise<string | null> {
  const m = await load();
  const v = (m.get(key) ?? "").trim();
  if (v) return v;
  const e = (process.env[envName ?? key] ?? "").trim();
  return e || null;
}

export async function getAll(
  keys: { key: string; env?: string }[],
): Promise<Record<string, string | null>> {
  const m = await load();
  const out: Record<string, string | null> = {};
  for (const k of keys) {
    const v = (m.get(k.key) ?? "").trim();
    out[k.key] = v || (process.env[k.env ?? k.key] ?? "").trim() || null;
  }
  return out;
}

/** 어디서 온 값인가. 운영 화면이 이것을 적는다 */
export async function sourceOf(key: string, envName?: string):
  Promise<"settings" | "env" | "none"> {
  const m = await load();
  if ((m.get(key) ?? "").trim()) return "settings";
  if ((process.env[envName ?? key] ?? "").trim()) return "env";
  return "none";
}

/**
 * 값을 넣는다. **빈 값은 줄을 지운다**: 그래야 환경변수로 되돌아간다.
 *
 * 누가 언제 고쳤는지를 적는다. 사업자 표시는 법이 요구하는 값이라,
 * 틀린 값이 올라간 날 누가 넣었는지 물어볼 수 있어야 한다.
 */
export async function set(key: string, value: string, by: string): Promise<void> {
  const v = value.trim();
  if (!v) {
    await query(`DELETE FROM site_settings WHERE key = $1`, [key]);
  } else {
    await query(
      `INSERT INTO site_settings (key, value, updated_by, updated_at)
       VALUES ($1,$2,$3, now())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by,
             updated_at = now()`,
      [key, v, by],
    );
  }
  forget();
}

export type SettingRow = { key: string; value: string; updatedAt: string };

export async function listSettings(): Promise<SettingRow[]> {
  const rows = await query<{ key: string; value: string; updated_at: string }>(
    `SELECT key, value, updated_at::text FROM site_settings ORDER BY key`,
  ).catch(() => []);
  return rows.map((r) => ({
    key: r.key, value: r.value, updatedAt: r.updated_at.slice(0, 16),
  }));
}

/** 한 줄만 읽는다. 검사에서 쓴다 */
export async function rawOf(key: string): Promise<string | null> {
  const r = await queryOne<{ value: string }>(
    `SELECT value FROM site_settings WHERE key = $1`, [key],
  ).catch(() => null);
  return r?.value ?? null;
}
