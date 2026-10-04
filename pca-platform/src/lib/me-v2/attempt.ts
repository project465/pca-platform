/**
 * ME_V2 응시를 서버가 들고 있는다.
 *
 * **브라우저 저장소가 진실이면 기기를 바꾸는 순간 사라진다.** 규격 §13·§56 이
 * 막는 것이 그것이다. 여기서 서버가 진실이 되고, 브라우저 저장소는 복구용
 * 사본으로만 남는다.
 *
 * **이용권이 문을 연다**(규격 §11). 응시를 만들 수 있는지, 어느 등급으로
 * 만들 수 있는지는 전부 `entitlements` 가 정한다. 주소의 `?tier=PRO` 는
 * 여기까지 오지 못한다.
 */
import { query, queryOne } from "@/lib/db";
import { itemsFor, type Stage, type Tier, bank } from "./bank";

export type V2Attempt = {
  id: string;
  user_id: string;
  tier: Tier;
  education_stage: Stage;
  status: string;
  site_id: string | null;
  interface_language: string | null;
  target_country: string | null;
  assessment_version: string;
  started_at: string | null;
  submitted_at: string | null;
  last_saved_at: string | null;
};

const TIERS: Tier[] = ["BASIC", "STANDARD", "PRO"];
export function isTier(v: string | null | undefined): v is Tier {
  return !!v && (TIERS as string[]).includes(v);
}
const STAGES: Stage[] = ["bachelor", "master", "phd", "postdoc"];
export function isStage(v: string | null | undefined): v is Stage {
  return !!v && (STAGES as string[]).includes(v);
}

/* ── 이용권 ─────────────────────────────────────────────────────────── */

export type Grant = {
  entitlement_id: string;
  tier: Tier;
  product_code: string;
  major_code: string | null;
  ends_at: string | null;
};

/**
 * 이 사람이 지금 쓸 수 있는 ME_V2 이용권.
 *
 * **아직 응시로 바뀌지 않은 것만** 돌려준다. 하나를 두 번 쓰면 같은 사람의
 * 응답이 두 벌 쌓여 규준이 오염된다(좌석 하나 = 응시 하나와 같은 규칙).
 */
export async function openGrants(userId: string): Promise<Grant[]> {
  return query<Grant>(
    `SELECT e.id::text AS entitlement_id, e.tier, e.product_code,
            e.major_code, e.ends_at::text
       FROM entitlements e
      WHERE e.user_id = $1
        AND e.status = 'active'
        AND e.assessment_version = 'ME_V2'
        AND (e.ends_at IS NULL OR e.ends_at > now())
        AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.entitlement_id = e.id)
      ORDER BY e.created_at`,
    [userId],
  ).catch(() => [] as Grant[]);
}

/**
 * 이 응시를 열 권리가 있는가. **주인 확인이 먼저다**(규격 §54 S1·S2).
 */
export async function attemptOf(attemptId: string, userId: string): Promise<V2Attempt | null> {
  return queryOne<V2Attempt>(
    `SELECT a.id::text, a.user_id::text, a.tier, a.education_stage, a.status,
            a.site_id, a.interface_language, a.target_country,
            a.assessment_version,
            a.started_at::text, a.submitted_at::text, a.last_saved_at::text
       FROM attempts a
      WHERE a.id = $1 AND a.user_id = $2 AND a.assessment_version = 'ME_V2'`,
    [attemptId, userId],
  ).catch(() => null);
}

/** 이어서 볼 응시 하나. 없으면 null 이고, 그때 화면이 '시작' 을 보여준다. */
export async function currentV2(userId: string): Promise<V2Attempt | null> {
  return queryOne<V2Attempt>(
    `SELECT a.id::text, a.user_id::text, a.tier, a.education_stage, a.status,
            a.site_id, a.interface_language, a.target_country,
            a.assessment_version,
            a.started_at::text, a.submitted_at::text, a.last_saved_at::text
       FROM attempts a
      WHERE a.user_id = $1 AND a.assessment_version = 'ME_V2'
        AND a.submitted_at IS NULL
      ORDER BY a.id DESC LIMIT 1`,
    [userId],
  ).catch(() => null);
}

/**
 * 응시를 연다.
 *
 * **이용권이 정한 등급으로만 연다.** 부르는 쪽이 등급을 넘기지 않는 것이
 * 일부러다: 넘길 수 있으면 언젠가 화면이 넘기고, 그러면 주소로 올리는 길이
 * 생긴다.
 *
 * 같은 이용권으로 두 번 부르면 **이미 만든 응시를 돌려준다**(규격 §10:
 * 중복 리다이렉트가 응시를 두 개 만들지 않는다).
 */
export async function openV2Attempt(opts: {
  userId: string;
  entitlementId: string;
  stage: Stage;
  siteId: string;
  lang: string;
  targetCountry: string | null;
}): Promise<V2Attempt | null> {
  const dup = await queryOne<{ id: string }>(
    `SELECT id::text FROM attempts WHERE entitlement_id = $1 AND user_id = $2`,
    [opts.entitlementId, opts.userId],
  ).catch(() => null);
  if (dup) return attemptOf(dup.id, opts.userId);

  const g = await queryOne<{ tier: string; order_id: string | null }>(
    `SELECT tier, order_id::text FROM entitlements
      WHERE id = $1 AND user_id = $2 AND status = 'active'
        AND assessment_version = 'ME_V2'
        AND (ends_at IS NULL OR ends_at > now())`,
    [opts.entitlementId, opts.userId],
  ).catch(() => null);
  if (!g || !isTier(g.tier) || !g.order_id) return null;

  /* 개인 응시는 주문 하나에 회차 하나다(기존 `attempts.ts` 와 같은 규칙).
     표의 제약이 그렇게 못 박혀 있다: `kind='solo'` 면 주문이 있어야 한다 */
  const session = await soloSession(g.order_id);
  if (!session) return null;

  const row = await queryOne<{ id: string }>(
    `INSERT INTO attempts
       (session_id, user_id, status, started_at, site_id, interface_language,
        target_country, entitlement_id, tier, education_stage, assessment_version,
        last_saved_at)
     VALUES ($1, $2, 'in_progress', now(), $3, $4, $5, $6, $7, $8, 'ME_V2', now())
     RETURNING id::text`,
    [session, opts.userId, opts.siteId, opts.lang, opts.targetCountry,
     opts.entitlementId, g.tier, opts.stage],
  ).catch(() => null);
  if (!row) return null;
  return attemptOf(row.id, opts.userId);
}

/**
 * 개인 응시가 걸리는 회차. 주문 하나에 하나이고 없으면 만든다.
 *
 * **공개 승인을 걸지 않는다**(`instant`). 개인이 자기 돈으로 산 결과지를
 * 누가 열어 줄 때까지 기다릴 이유가 없다. 기관 회차만 승인제다.
 */
async function soloSession(orderId: string): Promise<string | null> {
  const found = await queryOne<{ id: string }>(
    `SELECT id::text FROM test_sessions WHERE kind = 'solo' AND order_id = $1`,
    [orderId],
  ).catch(() => null);
  if (found) return found.id;

  const inst = await queryOne<{ id: string }>(
    `SELECT id::text FROM instruments ORDER BY id DESC LIMIT 1`,
  ).catch(() => null);
  if (!inst) return null;

  const made = await queryOne<{ id: string }>(
    `INSERT INTO test_sessions
       (org_id, contract_id, order_id, kind, instrument_id, name,
        opens_at, closes_at, release_mode, released_at)
     VALUES (NULL, NULL, $1, 'solo', $2, $3, now(),
             now() + interval '10 years', 'instant', now())
     RETURNING id::text`,
    [orderId, inst.id, `ME_V2 개인 응시 #${orderId}`],
  ).catch(() => null);
  return made?.id ?? null;
}

/* ── 응답 ───────────────────────────────────────────────────────────── */

/**
 * 답 묶음을 저장한다.
 *
 * **묶어서 보낸다**(규격 §58): 문항마다 한 번씩 왕복하면 92번 쓰고, 그
 * 가운데 하나가 늦으면 응시자가 멈춘 것으로 본다. 화면이 바뀔 때와 잠깐
 * 쉴 때 한 번씩 보낸다.
 *
 * **같은 문항을 다시 보내면 덮어쓴다.** 뒤로 돌아가 고치는 것이 정상이고,
 * 줄을 쌓아 두면 어느 것이 마지막인지를 다시 판단해야 한다.
 */
export async function saveAnswers(
  attemptId: string,
  userId: string,
  answers: Record<string, unknown>,
): Promise<{ saved: number } | null> {
  const a = await attemptOf(attemptId, userId);
  if (!a || a.submitted_at) return null;

  const valid = new Set(itemsFor(a.tier).map((i) => i.item_id));
  const rows = Object.entries(answers).filter(([k]) => valid.has(k));
  if (!rows.length) return { saved: 0 };

  await query(
    `INSERT INTO v2_responses (attempt_id, item_id, value, answered_at)
     SELECT $1, k, v, now()
       FROM jsonb_each($2::jsonb) AS t(k, v)
     ON CONFLICT (attempt_id, item_id)
       DO UPDATE SET value = EXCLUDED.value, answered_at = EXCLUDED.answered_at`,
    [attemptId, JSON.stringify(Object.fromEntries(rows))],
  );
  await query(`UPDATE attempts SET last_saved_at = now() WHERE id = $1`, [attemptId]);
  return { saved: rows.length };
}

export async function answersOf(attemptId: string): Promise<Record<string, unknown>> {
  const rows = await query<{ item_id: string; value: unknown }>(
    `SELECT item_id, value FROM v2_responses WHERE attempt_id = $1`,
    [attemptId],
  ).catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.item_id, r.value]));
}

export type Progress = {
  answered: number;
  total: number;
  percent: number;
  /** 뜻이 있는 단계 이름. `43/92` 만 보여주지 않는다(규격 §43) */
  sections: { key: string; answered: number; total: number }[];
  /** 아직 다 안 찬 첫 묶음. 이어서 가면 여기로 돌아온다 */
  resumeSection: number;
};

export async function progressOf(a: V2Attempt): Promise<Progress> {
  const { sectionsFor } = await import("./bank");
  const answered = await answersOf(a.id);
  const secs = sectionsFor(a.tier).map((s) => ({
    key: s.key,
    answered: s.items.filter((i) => answered[i.item_id] !== undefined).length,
    total: s.items.length,
  }));
  const total = secs.reduce((x, s) => x + s.total, 0);
  const done = secs.reduce((x, s) => x + s.answered, 0);
  const idx = secs.findIndex((s) => s.answered < s.total);
  return {
    answered: done,
    total,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
    sections: secs,
    resumeSection: idx < 0 ? Math.max(0, secs.length - 1) : idx,
  };
}

/**
 * 다 풀었으면 닫는다.
 *
 * **덜 푼 응시를 닫지 않는다**: 닫히면 응답을 더 받지 않으므로, 빠진 문항이
 * 있는 채로 결과가 나간다.
 */
export async function submitV2(attemptId: string, userId: string): Promise<boolean> {
  const a = await attemptOf(attemptId, userId);
  if (!a || a.submitted_at) return false;
  const p = await progressOf(a);
  if (p.answered < p.total) return false;
  await query(
    `UPDATE attempts SET status = 'submitted', submitted_at = now(),
            last_saved_at = now()
      WHERE id = $1 AND user_id = $2 AND submitted_at IS NULL`,
    [attemptId, userId],
  );
  return true;
}

export function assessmentVersion(): string {
  return bank().assessmentVersion;
}
