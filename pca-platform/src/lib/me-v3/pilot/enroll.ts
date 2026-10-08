/**
 * 초대와 등록.
 *
 * **가명과 초대 열쇠를 가른다.** 링크에 `V3-A0001` 을 그대로 싣고 그것으로
 * 등록이 되면, 다음 번호를 눌러 본 사람이 남의 자리에 들어앉는다. 그래서
 * 링크가 싣는 것은 한 번 보여 주고 버리는 임의의 열쇠이고, 가명은 운영자가
 * 보는 이름이다. 둘이 한 줄에 같이 있지만 쓰이는 자리가 다르다.
 *
 * 열쇠는 **해시만 저장한다**(응시권 코드와 같은 규칙). DB 가 새도 그것으로
 * 남의 자리에 들어갈 수 없다.
 *
 * **한 번만 쓰인다.** `WHERE used_at IS NULL` 이 붙은 UPDATE 가 보장한다.
 * 읽고 판단한 뒤 쓰면 동시에 누른 두 사람이 둘 다 통과한다.
 */
import { createHash, randomBytes, randomInt } from "node:crypto";
import { query, queryOne } from "@/lib/db";

export const COHORT = "V3_PILOT_1";

/** 0 내부 확인 · 1 첫 사용자 · 2 추가 · 3 최종 */
export const WAVES = [0, 1, 2, 3] as const;
export type Wave = typeof WAVES[number];

export const WAVE_KO: Record<number, string> = {
  0: "Wave 0 · 내부 확인",
  1: "Wave 1 · 첫 사용자",
  2: "Wave 2 · 추가",
  3: "Wave 3 · 최종",
};

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** 헷갈리는 글자를 뺀 자모. 받아 적는 사람이 있다 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function token(): string {
  /* 24자. 눌러 보고 맞힐 수 있는 길이가 아니다 */
  const raw = randomBytes(24);
  let out = "";
  for (const b of raw) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/**
 * 가명을 wave 안에서 차례로 짓는다.
 *
 * `V3-A0001` 의 글자가 wave 이고 숫자가 그 wave 의 몇째인가다. 운영자가
 * 표에서 한 줄을 집을 때 wave 를 따로 보지 않아도 된다.
 */
const WAVE_LETTER = ["Z", "A", "B", "C"];

async function nextCode(wave: number): Promise<string> {
  const letter = WAVE_LETTER[wave] ?? "X";
  const row = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_pilot_enrollments WHERE wave = $1`, [wave]);
  let n = Number(row?.n ?? 0) + 1;
  for (let i = 0; i < 50; i += 1) {
    const code = `V3-${letter}${String(n).padStart(4, "0")}`;
    const had = await queryOne<{ code: string }>(
      `SELECT code FROM v3_pilot_enrollments WHERE code = $1`, [code]);
    if (!had) return code;
    n += 1;
  }
  return `V3-${letter}${String(randomInt(10000, 99999))}`;
}

export const TIERS = ["BASIC", "STANDARD", "PRO"] as const;
export type PilotTier = typeof TIERS[number];

/** 이용권이 가리킬 자리. **꺼 둔 상품이라** 가격표에 나오지 않는다 */
const PRODUCT: Record<PilotTier, string> = {
  BASIC: "ME_V3_BASIC_KR",
  STANDARD: "ME_V3_STANDARD_KR",
  PRO: "ME_V3_PRO_KR",
};

export type Invite = {
  id: string; code: string; token: string; wave: number; tier: PilotTier;
};

/**
 * 초대 자리를 만든다. **열쇠는 여기서 한 번만 돌려준다.**
 *
 * 다시 보여주기는 없다. 잃어버리면 그 자리를 버리고 새로 만든다: 다시
 * 보여줄 수 있게 두려면 열쇠를 날것으로 저장해야 하고, 그러면 DB 가
 * 새는 순간 전부가 샌다.
 */
export async function createInvites(
  wave: number, count: number, note?: string, tier: PilotTier = "BASIC",
): Promise<Invite[]> {
  const out: Invite[] = [];
  for (let i = 0; i < Math.max(1, Math.min(50, count)); i += 1) {
    const t = token();
    const code = await nextCode(wave);
    const row = await queryOne<{ id: string }>(
      `INSERT INTO v3_pilot_enrollments (code, token_hash, cohort, wave, note, tier)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::text`,
      [code, sha(t), COHORT, wave, note ?? null, tier]);
    out.push({ id: row?.id as string, code, token: t, wave, tier });
  }
  return out;
}

export type Enrollment = {
  id: string; code: string; wave: number; cohort: string; tier: PilotTier;
  used_at: string | null; used_by: string | null; expires_at: string | null;
};

export async function enrollmentByToken(t: string): Promise<Enrollment | null> {
  if (!t || t.length < 8) return null;
  return queryOne<Enrollment>(
    `SELECT id::text, code, wave, cohort, tier, used_at::text, used_by::text,
            expires_at::text
       FROM v3_pilot_enrollments WHERE token_hash = $1`,
    [sha(t)]);
}

export type RedeemResult =
  | { ok: true; code: string; wave: number; tier: PilotTier; already: boolean }
  /* **거절 이유를 뭉개지 않는다.** 하나로 뭉개면 이미 초대를 받은 사람이
     자기를 의심한다 */
  | { ok: false; reason: "unknown" | "used" | "expired" };

/**
 * 열쇠를 자리로 바꾼다.
 *
 * 같은 사람이 같은 링크를 다시 눌러도 거절하지 않는다(`already`): 메일을
 * 다시 열어 누르는 일이 가장 흔하고, 거기서 막으면 그 사람은 자기가
 * 뭔가 잘못한 줄 안다.
 */
export async function redeem(t: string, userId: string): Promise<RedeemResult> {
  const e = await enrollmentByToken(t);
  if (!e) return { ok: false, reason: "unknown" };
  if (e.expires_at && new Date(e.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (e.used_at && e.used_by && e.used_by !== userId) return { ok: false, reason: "used" };

  const already = !!e.used_at;
  if (!already) {
    const got = await query<{ id: string }>(
      `UPDATE v3_pilot_enrollments SET used_by = $2, used_at = now()
        WHERE id = $1 AND used_at IS NULL RETURNING id::text`,
      [e.id, userId]);
    if (!got.length) return { ok: false, reason: "used" };
  }

  /* 참가자 줄을 만들거나, 이미 있으면 wave 와 초대만 잇는다 */
  await query(
    `INSERT INTO v3_pilot_participants
       (user_id, code, cohort, education_stage, purge_after, enrollment_id, wave)
     VALUES ($1,$2,$3,'bachelor', (now() + interval '90 days')::date, $4, $5)
     ON CONFLICT (user_id, cohort)
       DO UPDATE SET enrollment_id = EXCLUDED.enrollment_id, wave = EXCLUDED.wave`,
    [userId, e.code, e.cohort, e.id, e.wave]);

  /* 등급을 열어 주는 이용권. **주문을 만들지 않는다.** 돈은 한 푼도
     움직이지 않았고, 주문을 지어 적으면 매상이 그만큼 늘어난다.
     다시 눌러도 한 줄만 생긴다: 이용권이 늘면 같은 사람이 한 번 더 풀 수
     있고, 그러면 스무 명짜리 표본에 같은 사람이 두 번 서서 규준이 오염된다 */
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     SELECT $1, $2, 'report', $3, 'ME', 'ME_V3_2', 'active'
      WHERE NOT EXISTS (
        SELECT 1 FROM entitlements x
         WHERE x.user_id = $1 AND x.assessment_version = 'ME_V3_2'
           AND x.status = 'active')`,
    [userId, PRODUCT[e.tier], e.tier]);

  return { ok: true, code: e.code, wave: e.wave, tier: e.tier, already };
}

/** 초대 한 줄의 링크. 열쇠는 만들 때만 손에 있다 */
export function inviteLink(base: string, t: string): string {
  return `${base.replace(/\/$/, "")}/v3/pilot?t=${encodeURIComponent(t)}`;
}
