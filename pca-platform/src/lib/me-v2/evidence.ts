/**
 * 경험을 서버가 들고 있는다.
 *
 * 정적 결과지에서는 경험이 브라우저 저장소(`pca_evidence_v1` 외 둘)에만
 * 있었다. 기기를 바꾸면 사라지고, 결과지를 다시 뽑을 때 무엇을 보고
 * 뽑았는지 되짚을 수 없다. 플랫폼에서는 `evidence_profiles` 한 줄이 그
 * 사람의 지금 경험이고, 결과지를 만들 때 그 순간의 사본을 굳힌다.
 *
 * **모양을 새로 정하지 않는다.** 담는 것은 정적 엔진이 쓰는 그 JSON 그대로다
 * (`assets/evidence.js` 의 `emptyEvidence` · `loadResearch` · `loadTarget`).
 * 서버가 자기 모양으로 옮겨 적으면 엔진에 넣을 때 다시 옮겨야 하고, 옮기는
 * 자리가 둘이면 한쪽이 뒤처진다.
 *
 * **경험은 적합도에 들어가지 않는다.** 여기 한 줄이 늘거나 줄어도 관심 ·
 * 경험 · 결정 소유 · 업무 방식 · 학습 의향 점수는 한 값도 바뀌지 않는다.
 * 바뀌는 것은 증거 사다리와 역할별 범위, 그리고 문장이다.
 */
import { query, queryOne } from "@/lib/db";
import { track } from "@/lib/funnel";

/** 정적 엔진이 쓰는 세 묶음. 서버는 담아 두기만 한다 */
export type EvidencePayload = {
  evidence: Record<string, unknown>;
  research: unknown[];
  target: Record<string, unknown>;
};

export const EMPTY: EvidencePayload = { evidence: {}, research: [], target: {} };

/** 비어 있는지. **'안 적었다' 와 '적었는데 걸리는 신호가 없다' 는 다른 상태다** */
export function isEmpty(p: EvidencePayload): boolean {
  const e = p.evidence as Record<string, unknown[]>;
  const lists = ["courses", "projects", "tools", "certifications", "publications",
    "patents", "presentations", "awards", "leadership", "mentoring",
    "internships", "employment"];
  const any = lists.some((k) => Array.isArray(e?.[k]) && e[k].length > 0);
  return !any && (p.research ?? []).length === 0;
}

export async function profileOf(userId: string): Promise<EvidencePayload & { version: number }> {
  const row = await queryOne<{ payload: EvidencePayload; version: number }>(
    `SELECT payload, version FROM evidence_profiles WHERE user_id = $1`,
    [userId],
  ).catch(() => null);
  if (!row?.payload) return { ...EMPTY, version: 0 };
  return {
    evidence: row.payload.evidence ?? {},
    research: row.payload.research ?? [],
    target: row.payload.target ?? {},
    version: row.version,
  };
}

/**
 * 적어 주신 것을 저장한다.
 *
 * **판본을 올린다.** 결과지가 어느 경험을 보고 나왔는지를 되짚으려면 그때의
 * 판본 번호가 필요하다. 덮어쓰기만 하면 "결과지와 지금 화면이 다르다" 는
 * 문의에 답할 수 없다.
 */
export async function saveProfile(
  userId: string, p: EvidencePayload,
): Promise<{ version: number }> {
  const row = await queryOne<{ version: number }>(
    `INSERT INTO evidence_profiles (user_id, payload, version, updated_at)
     VALUES ($1, $2::jsonb, 1, now())
     ON CONFLICT (user_id) DO UPDATE
       SET payload = EXCLUDED.payload,
           version = evidence_profiles.version + 1,
           updated_at = now()
     RETURNING version`,
    [userId, JSON.stringify({
      evidence: p.evidence ?? {},
      research: p.research ?? [],
      target: p.target ?? {},
    })],
  );
  /* **처음 적으신 때만 센다.** 고칠 때마다 세면 한 사람이 열 명으로
     보이고, 그러면 '경험을 적는 비율' 이 백 퍼센트를 넘는다 */
  if ((row?.version ?? 1) === 1) await track("evidence_complete", { userId });
  return { version: row?.version ?? 1 };
}

export type Frozen = {
  snapshotId: string;
  profileId: string | null;
  profileVersion: number | null;
  payload: EvidencePayload;
};

/**
 * 결과지를 만들기 직전에 지금 경험을 굳힌다.
 *
 * 결과지 한 장이 어느 경험을 보고 나왔는지가 여기서 정해진다. 굳히지 않고
 * 그때그때 `evidence_profiles` 를 읽으면, 경험을 한 줄 더 적은 다음 날 같은
 * 결과지가 다른 글을 보여 주고도 **생성 시각은 그대로** 라서 어느 쪽이
 * 맞는지 가릴 수 없다.
 *
 * 한 응시에 사본 하나다(`evidence_snapshots_attempt_id_key`). 다시 만들면
 * 그 사본이 지금 것으로 바뀌고, 이미 나간 결과지는 자기 `payload` 안에
 * 그때의 경험을 품고 있어 흔들리지 않는다.
 */
export async function freezeForAttempt(
  attemptId: string, userId: string,
): Promise<Frozen | null> {
  const prof = await queryOne<{ id: string; version: number; payload: EvidencePayload }>(
    `SELECT id::text, version, payload FROM evidence_profiles WHERE user_id = $1`,
    [userId],
  ).catch(() => null);

  const payload: EvidencePayload = prof?.payload
    ? {
        evidence: prof.payload.evidence ?? {},
        research: prof.payload.research ?? [],
        target: prof.payload.target ?? {},
      }
    : EMPTY;

  const snap = await queryOne<{ id: string }>(
    `INSERT INTO evidence_snapshots (attempt_id, profile_id, profile_version, payload, taken_at)
     VALUES ($1, $2, $3, $4::jsonb, now())
     ON CONFLICT (attempt_id) DO UPDATE
       SET profile_id = EXCLUDED.profile_id,
           profile_version = EXCLUDED.profile_version,
           payload = EXCLUDED.payload,
           taken_at = now()
     RETURNING id::text`,
    [attemptId, prof?.id ?? null, prof?.version ?? null, JSON.stringify(payload)],
  ).catch(() => null);
  if (!snap) return null;

  return {
    snapshotId: snap.id,
    profileId: prof?.id ?? null,
    profileVersion: prof?.version ?? null,
    payload,
  };
}

/** 이 응시가 보고 있던 경험 사본. 없으면 null */
export async function frozenOf(attemptId: string): Promise<Frozen | null> {
  const row = await queryOne<{
    id: string; profile_id: string | null; profile_version: number | null;
    payload: EvidencePayload;
  }>(
    `SELECT id::text, profile_id::text, profile_version, payload
       FROM evidence_snapshots WHERE attempt_id = $1`,
    [attemptId],
  ).catch(() => null);
  if (!row) return null;
  return {
    snapshotId: row.id,
    profileId: row.profile_id,
    profileVersion: row.profile_version,
    payload: {
      evidence: row.payload?.evidence ?? {},
      research: row.payload?.research ?? [],
      target: row.payload?.target ?? {},
    },
  };
}

/** 적어 주신 경험 줄 수. 화면이 '몇 건' 을 적을 때만 쓴다 */
export function countOf(p: EvidencePayload): { items: number; research: number } {
  const e = p.evidence as Record<string, unknown[]>;
  const items = ["courses", "projects", "tools", "certifications", "publications",
    "patents", "presentations", "awards", "leadership", "mentoring",
    "internships", "employment"]
    .reduce((n, k) => n + (Array.isArray(e?.[k]) ? e[k].length : 0), 0);
  return { items, research: (p.research ?? []).length };
}

/** 적어 주신 경험이 있는지 확인만 한다 */
export async function hasEvidence(userId: string): Promise<boolean> {
  const p = await profileOf(userId);
  return !isEmpty(p);
}

/** 응시 하나가 걸려 있는 사람. 결과 생성 작업이 주인을 다시 확인할 때 쓴다 */
export async function ownerOf(attemptId: string): Promise<string | null> {
  const r = await queryOne<{ user_id: string }>(
    `SELECT user_id::text FROM attempts WHERE id = $1`, [attemptId],
  ).catch(() => null);
  return r?.user_id ?? null;
}

/** 쓰이지 않는 자리를 비워 두지 않기 위해 둔 한 줄. 표가 비면 0 이다 */
export async function profileCount(): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM evidence_profiles`,
  ).catch(() => null);
  return Number(r?.n ?? 0);
}
