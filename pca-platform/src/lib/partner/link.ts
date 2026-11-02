import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { query, queryOne } from "@/lib/db";

/**
 * 제휴 사이트 계정 연결(캔버스 10번 "들어오는 곳은 넷, MAT 화면은 하나" · 2026-11-01 대표 결정: API 키 방식).
 * 표는 `db/schema_partner_link.sql`. **제휴마다 코드를 새로 짜지 않는다**: 키 · 정산 비율 · 넘겨받을 항목 ·
 * 허용 IP 는 `partner_configs` 한 줄이고, 이 파일은 제휴 이름을 가리지 않는다.
 *
 * 흐름
 *   1. 제휴 서버가 키를 들고 `POST /api/partner/{partner}/session` → 5분짜리 한 번 쓰는 링크
 *   2. 사람이 그 링크(`/from/{partner}/enter?t=…`)로 온다 → 동의 화면(넘겨받은 항목을 그대로 보인다)
 *   3. 동의하면 계정을 만들거나(처음) 지금 로그인한 계정과 잇고, 그 링크로 한 번 로그인한다
 *
 * **키는 해시만 둔다.** 키 = `cmk_{env}_{prefix}_{secret}`. prefix 로 줄을 찾고 secret 의 SHA-256 을
 * 같은 시간 비교로 맞댄다. 요청 서명(HMAC)은 쓰지 않는다: HMAC 은 서버가 비밀을 되살릴 수 있어야 해서
 * "해시만 둔다" 와 부딪힌다. 대신 TLS 위에서 키를 보내고, 시각(±5분)과 한 번 쓰는 nonce 로 다시 보내기를 막는다.
 */
export type PartnerConfig = {
  partner: string; status: "off" | "test" | "live";
  settlement_bps: number | null; share_fields: string[]; ip_allowlist: string[]; button_label: string;
};

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const b64u = (n: number) => randomBytes(n).toString("base64url");

export async function partnerConfig(partner: string): Promise<PartnerConfig | null> {
  return queryOne<PartnerConfig>(
    `SELECT partner, status, settlement_bps, share_fields, ip_allowlist::text[] AS ip_allowlist, button_label
       FROM partner_configs WHERE partner = $1`, [partner]).catch(() => null);
}

/** 새 키. **원래 키는 이 반환값에만 있다**: 화면이 한 번 보이고 버린다. 표에는 prefix 와 해시만 */
export async function issueKey(partner: string, env: "test" | "live", byUserId: string): Promise<{ key: string; id: string }> {
  const prefix = b64u(9).replace(/[-_]/g, "x").slice(0, 12);
  const secret = b64u(32);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO partner_keys (partner, env, key_prefix, key_hash, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id::text`, [partner, env, prefix, sha(secret), byUserId]);
  return { key: `cmk_${env}_${prefix}_${secret}`, id: row!.id };
}

/**
 * 키를 폐기한다. `graceHours` 가 있으면 그 시간 뒤에 폐기된다(키 교체: 새 키를 반영하는 동안 옛 키도 받는다).
 * 이미 예약된 키를 `지금 폐기` 하면 앞당긴다.
 */
export async function revokeKey(partner: string, id: string, graceHours = 0): Promise<void> {
  await query(
    `UPDATE partner_keys SET revoked_at = now() + make_interval(hours => $3)
      WHERE id = $1 AND partner = $2 AND (revoked_at IS NULL OR revoked_at > now())`, [id, partner, graceHours]);
}

export type KeyRow = { id: string; env: string; key_prefix: string; created_at: string; revoked_at: string | null };
export async function keysOf(partner: string): Promise<KeyRow[]> {
  return query<KeyRow>(`SELECT id::text, env, key_prefix, created_at::text, revoked_at::text FROM partner_keys
                 WHERE partner = $1 ORDER BY id DESC LIMIT 20`, [partner]).catch(() => []);
}

/** 키를 맞대 본다. 틀리면 null(왜 틀렸는지는 부르는 쪽에 알리지 않는다) */
export async function verifyKey(partner: string, raw: string): Promise<{ id: string; env: "test" | "live" } | null> {
  const m = /^cmk_(test|live)_([A-Za-z0-9]{12})_([A-Za-z0-9_-]{40,64})$/.exec(raw.trim());
  if (!m) return null;
  const row = await queryOne<{ id: string; env: "test" | "live"; key_hash: string }>(
    `SELECT id::text, env, key_hash FROM partner_keys
      WHERE partner = $1 AND key_prefix = $2 AND (revoked_at IS NULL OR revoked_at > now())`, [partner, m[2]]).catch(() => null);
  const want = Buffer.from(row?.key_hash ?? "0".repeat(64), "hex");
  const got = Buffer.from(sha(m[3]), "hex");
  const same = want.length === got.length && timingSafeEqual(want, got);
  if (!row || !same || row.env !== m[1]) return null;
  return { id: row.id, env: row.env };
}

/** nonce 를 처음 보는가. 처음이면 적고 true. 10분 지난 줄은 함께 지운다 */
export async function freshNonce(partner: string, nonce: string): Promise<boolean> {
  await query(`DELETE FROM partner_nonces WHERE seen_at < now() - interval '10 minutes'`, []).catch(() => null);
  const r = await queryOne<{ nonce: string }>(
    `INSERT INTO partner_nonces (partner, nonce) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING nonce`,
    [partner, nonce]).catch(() => null);
  return Boolean(r);
}

export async function logCall(c: { partner: string; keyId: string | null; endpoint: string; status: number; reason: string | null; ip: string | null }): Promise<void> {
  await query(`INSERT INTO partner_calls (partner, key_id, endpoint, status, reason, ip) VALUES ($1,$2,$3,$4,$5,$6::inet)`,
    [c.partner, c.keyId, c.endpoint, c.status, c.reason, c.ip && /^[0-9a-fA-F:.]+$/.test(c.ip) ? c.ip : null]).catch(() => null);
}

/* ── 넘겨받는 요약 ─────────────────────────────────────────────── */

/** 받을 수 있는 칸과 화면에 적는 이름. `share_fields` 에 없는 칸은 요청에 와도 버린다 */
export const FIELD_KO: Record<string, string> = {
  display_name: "이름 또는 별명",
  interest_jobs: "관심 직무",
  interest_regions: "관심 지역",
  education: "학력(학교 · 전공 · 졸업연도)",
  certificates: "자격증(이름 · 취득연월)",
  career_summary: "경력 요약(기간 · 직무)",
};

const s = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : "");
const list = (x: unknown, n: number) => (Array.isArray(x) ? x.slice(0, n) : []);

/** 요청의 profile 에서 허용된 칸만, 정해진 꼴로. 회사 이름 · 연락처 같은 칸은 꼴에 없으므로 남지 않는다 */
export function cleanProfile(raw: unknown, allowed: string[]): Record<string, unknown> {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const ok = new Set(allowed);
  if (ok.has("display_name") && s(p.display_name, 40)) out.display_name = s(p.display_name, 40);
  if (ok.has("interest_jobs")) { const v = list(p.interest_jobs, 5).map((x) => s(x, 40)).filter(Boolean); if (v.length) out.interest_jobs = v; }
  if (ok.has("interest_regions")) { const v = list(p.interest_regions, 5).map((x) => s(x, 20)).filter(Boolean); if (v.length) out.interest_regions = v; }
  if (ok.has("education")) {
    const v = list(p.education, 4).map((e) => { const o = (e ?? {}) as Record<string, unknown>;
      return { school: s(o.school, 60), major: s(o.major, 60), grad_year: s(String(o.grad_year ?? ""), 4) }; })
      .filter((e) => e.school || e.major);
    if (v.length) out.education = v;
  }
  if (ok.has("certificates")) {
    const v = list(p.certificates, 10).map((c) => { const o = (c ?? {}) as Record<string, unknown>;
      return { name: s(o.name, 60), acquired: s(o.acquired, 7) }; }).filter((c) => c.name);
    if (v.length) out.certificates = v;
  }
  if (ok.has("career_summary")) {
    const v = list(p.career_summary, 6).map((c) => { const o = (c ?? {}) as Record<string, unknown>;
      return { period: s(o.period, 30), role: s(o.role, 60) }; }).filter((c) => c.role);
    if (v.length) out.career_summary = v;
  }
  return out;
}

/* ── 한 번 쓰는 링크 ────────────────────────────────────────────── */

export const HANDOFF_MIN = 5;

export async function createHandoff(h: {
  partner: string; keyId: string; memberId: string; profile: Record<string, unknown>; postingRef: string | null;
}): Promise<{ token: string; expiresAt: string }> {
  const token = b64u(32);
  const row = await queryOne<{ exp: string }>(
    `INSERT INTO partner_handoffs (partner, key_id, token_hash, partner_user_id, profile, posting_ref, expires_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, now() + make_interval(mins => $7)) RETURNING expires_at::text AS exp`,
    [h.partner, h.keyId, sha(token), h.memberId, JSON.stringify(h.profile), h.postingRef, HANDOFF_MIN]);
  return { token, expiresAt: row!.exp };
}

export type Handoff = {
  id: string; partner: string; partner_user_id: string; profile: Record<string, unknown>;
  posting_ref: string | null; linked_user: string | null;
};

/** 아직 쓰지 않았고 만료 전인 링크. 읽기만 한다(링크 미리보기가 링크를 써 버리지 않게) */
export async function openHandoff(partner: string, token: string): Promise<Handoff | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  return queryOne<Handoff>(
    `SELECT h.id::text, h.partner, h.partner_user_id, h.profile, h.posting_ref, l.user_id::text AS linked_user
       FROM partner_handoffs h
       LEFT JOIN partner_links l ON l.partner = h.partner AND l.partner_user_id = h.partner_user_id
      WHERE h.partner = $1 AND h.token_hash = $2 AND h.used_at IS NULL AND h.expires_at > now()`,
    [partner, sha(token)]).catch(() => null);
}

/**
 * 동의를 받은 뒤: 제휴 회원과 계정을 잇고(처음이면 줄을 만들고), 이 링크로 로그인할 사람을 적는다.
 * **한 제휴 회원은 한 계정, 한 계정은 한 제휴 회원.** 다른 계정에 이미 이어진 회원이면 거절한다.
 */
export async function bindHandoff(h: Handoff, userId: string, fields: string[]): Promise<{ ok: true } | { ok: false; why: "taken" }> {
  if (h.linked_user && h.linked_user !== userId) return { ok: false, why: "taken" };
  const other = await queryOne<{ partner_user_id: string }>(
    `SELECT partner_user_id FROM partner_links WHERE partner = $1 AND user_id = $2`, [h.partner, userId]);
  if (other && other.partner_user_id !== h.partner_user_id) return { ok: false, why: "taken" };
  await query(
    `INSERT INTO partner_links (partner, partner_user_id, user_id, consented_fields)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (partner, partner_user_id) DO UPDATE SET last_seen_at = now()`,
    [h.partner, h.partner_user_id, userId, fields]);
  await query(`UPDATE partner_handoffs SET user_id = $2 WHERE id = $1 AND used_at IS NULL`, [h.id, userId]);
  return { ok: true };
}

/**
 * 로그인 자리(`auth.ts` 의 partner 공급자)가 부른다. **한 번만 성공한다**: 쓰는 순간 `used_at` 을 적고,
 * 넘겨받은 요약(`profile`)을 비운다. 동의를 거쳐 사람이 정해진 링크만 통과한다.
 */
export async function consumeHandoff(token: string): Promise<{ userId: string } | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const r = await queryOne<{ user_id: string }>(
    `UPDATE partner_handoffs SET used_at = now(), profile = '{}'::jsonb
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() AND user_id IS NOT NULL
      RETURNING user_id::text`, [sha(token)]).catch(() => null);
  return r ? { userId: r.user_id } : null;
}

/** 쓰지 않고 만료된 링크를 지운다(넘겨받은 요약이 남지 않게). 밤 당번이 부른다 */
export async function purgeHandoffs(): Promise<number> {
  const r = await query<{ id: string }>(
    `DELETE FROM partner_handoffs WHERE (used_at IS NULL AND expires_at < now() - interval '1 hour')
        OR (used_at IS NOT NULL AND used_at < now() - interval '30 days') RETURNING id::text`, []).catch(() => []);
  return r.length;
}

/** 허용 IP 를 바꾼다. 쉼표 · 줄바꿈으로 나눈 IP 나 CIDR. 비우면 제한 없이 받고 호출 기록에 IP 만 남긴다 */
export async function setAllowlist(partner: string, raw: string, byUserId: string): Promise<{ ok: true; n: number } | { ok: false; bad: string }> {
  const list = raw.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean).slice(0, 20);
  for (const ip of list) {
    const ok = await queryOne<{ ok: boolean }>(`SELECT ($1::cidr IS NOT NULL) AS ok`, [ip]).catch(() => null);
    if (!ok) return { ok: false, bad: ip };
  }
  await query(`UPDATE partner_configs SET ip_allowlist = $2::cidr[], updated_at = now(), updated_by = $3 WHERE partner = $1`,
    [partner, list, byUserId]);
  return { ok: true, n: list.length };
}
