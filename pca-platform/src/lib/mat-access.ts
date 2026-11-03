import { createHash } from "node:crypto";
import { query, queryOne, tx } from "@/lib/db";
import { activeTrack, hasV3Result } from "@/lib/track";

/**
 * MAT 을 **무엇까지 무료로 쓰는가**(2026-11-03 대표 결정 "무료 범위", `docs/assistant/monetization-decisions.md`).
 *
 * - 무료: 내 결과 · 전공에 맞는 공고 목록(회사 · 직무 · 마감, 갯수), **공고 AI 분석 검사 없이 1회 + 검사를 끝내면
 *   1회 더**, 이번 주 할 일 1개
 * - 유료: 나머지 공고 분석 · 지원서 초안 · 면접 연습 · 파일 읽고 반영 · 마감 알림 · 할 일 전체
 * - 학교 · 기관 이용권이 있는 학생은 그대로 전부(`activeTrack` 이 학교 줄도 연다)
 * - 개인은 **검사 없이 가입해 MAT 을 바로 쓴다**(전공 하나만 고르면 된다)
 *
 * 전에는(2026-10-31) 검사 결과가 있는 사람에게 아무 도구나 합쳐 두 번이었다. 이 파일이 그 판단의 유일한 자리다.
 *
 * **무료 분석은 계정이 아니라 사람에 붙는다**(재가입 악용 막기). 쓴 기록(`mat_free_claims`)은 그 사람의
 * 열쇠들(소셜 계정 번호 · 정규화한 메일 · 학교 아이디)의 해시에 붙고, 계정을 지워도 남는다. 같은 메일 · 같은
 * 소셜 계정으로 다시 가입하면 이미 쓴 것으로 센다. 메일 주소를 새로 만들어 오는 것까지는 막지 못한다:
 * 그걸 막으려면 휴대폰 본인확인이 있어야 하고 지금 가입에는 없다. `FREE_SCOPE.requireVerified` 를 켜면
 * 메일 확인을 끝낸 계정(또는 소셜 가입)에만 무료 분석을 연다(지금은 꺼 둔다: 메일 발송이 서기 전이다).
 *
 * **판단은 서버가 한다.** 화면이 단추를 꺼 두는 것은 안내이고, 폼을 직접 보내도 `canUseMat` 이 돌려보낸다.
 */
export const FREE_SCOPE = {
  /** 검사 없이 쓰는 무료 공고 분석 */
  analysesBeforeTest: 1,
  /** 검사를 끝내면 더 쓰는 무료 공고 분석 */
  analysesAfterTest: 1,
  /** 무료로 보이는 이번 주 할 일 수 */
  weekTasks: 1,
  /** 메일 확인(또는 소셜 가입)을 끝낸 계정에만 무료 분석을 연다 */
  requireVerified: false,
} as const;

/** 옛 이름. 검사를 끝낸 사람의 무료 분석 합계(1 + 1) */
export const FREE_TOTAL = FREE_SCOPE.analysesBeforeTest + FREE_SCOPE.analysesAfterTest;

const USES = ["posting", "draft", "upload", "research"] as const;
export type MatUse = (typeof USES)[number];

export type MatAccess = {
  /** 기간권(개인 · 학교 · 기관)이 열려 있다 */
  paid: boolean;
  /** 검사 결과가 있다 */
  ready: boolean;
  /** 전공(공고를 읽을 사전)이 정해져 있다. 검사 · 학교 계정 · MAT 에서 고른 전공 가운데 하나 */
  core: boolean;
  used: Record<MatUse, number>;
  /** 도구마다 지금 쓸 수 있는 무료 횟수. 무료는 공고 분석뿐이다 */
  left: Record<MatUse, number>;
  /** 남은 무료 공고 분석 */
  freeLeft: number;
  /** 무료 분석 두 칸의 상태. `locked` = 검사를 끝내야 열린다 */
  slots: { notest: "open" | "used"; aftertest: "open" | "used" | "locked" };
  /** 보이는 이번 주 할 일 수(기간권이면 제한 없음) */
  weekTasks: number;
  /** 화면을 세운다: 기간권이 있거나, 전공이 정해져 무료로 써 볼 수 있다 */
  open: boolean;
  /** 옛 칸(커리어피크 연구자 자료 먼저). 자료 읽기가 유료가 되어 늘 false */
  researchFirst: boolean;
};

const COUNT: Record<MatUse, string> = {
  posting: `SELECT count(*)::int AS n FROM assistant_postings WHERE user_id = $1`,
  draft: `SELECT count(*)::int AS n FROM assistant_drafts WHERE user_id = $1 AND note_text IS NOT NULL`,
  upload: `SELECT count(*)::int AS n FROM assistant_uploads WHERE user_id = $1 AND status IN ('read', 'empty')`,
  research: `SELECT count(*)::int AS n FROM research_docs WHERE user_id = $1`,
};

export async function freeUsed(userId: string): Promise<Record<MatUse, number>> {
  const out = { posting: 0, draft: 0, upload: 0, research: 0 } as Record<MatUse, number>;
  await Promise.all((Object.keys(COUNT) as MatUse[]).map(async (k) => {
    out[k] = (await queryOne<{ n: number }>(COUNT[k], [userId]).catch(() => null))?.n ?? 0;
  }));
  return out;
}

function secret(): string {
  return process.env.AUTH_SECRET || "cm-free-dev";
}
const h = (s: string) => createHash("sha256").update(`${secret()}:free:${s}`).digest("hex").slice(0, 32);

/** 메일을 사람 하나로 모은다: 소문자 · `+` 뒤를 버림 · gmail 은 점도 버림 */
export function normalizeEmail(raw: string): string | null {
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(raw.trim().toLowerCase());
  if (!m) return null;
  let local = m[1].split("+")[0];
  let domain = m[2];
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return local ? `${local}@${domain}` : null;
}

/** 이 사람을 가리키는 열쇠들의 해시. 소셜 계정 · 제휴 회원 번호 · 메일 · 학교 아이디 */
export async function identityKeys(userId: string): Promise<string[]> {
  const u = await queryOne<{ email: string | null; login_id: string | null }>(
    `SELECT email, login_id FROM users WHERE id = $1`, [userId]).catch(() => null);
  const social = await query<{ provider: string; pid: string }>(
    `SELECT provider, provider_account_id AS pid FROM auth_accounts WHERE user_id = $1 ORDER BY id`, [userId],
  ).catch(() => []);
  /* 제휴 사이트 회원 번호(잡인더스트리 · 커리어피크 로그인 연동). 메일이 없는 계정이 여기로 온다 */
  const partner = await query<{ partner: string; pid: string }>(
    `SELECT partner, partner_user_id AS pid FROM partner_links WHERE user_id = $1`, [userId]).catch(() => []);
  const keys: string[] = [
    ...social.map((s) => h(`oauth:${s.provider}:${s.pid}`)),
    ...partner.map((s) => h(`partner:${s.partner}:${s.pid}`)),
  ];
  const em = u?.email ? normalizeEmail(u.email) : null;
  if (em) keys.push(h(`email:${em}`));
  if (u?.login_id && !em) keys.push(h(`login:${u.login_id.toLowerCase()}`));
  /* 열쇠가 하나도 없으면(있을 수 없지만) 계정 번호로 */
  if (!keys.length) keys.push(h(`user:${userId}`));
  return [...new Set(keys)];
}

async function claimedSlots(keys: string[]): Promise<Set<string>> {
  const rows = await query<{ slot: string }>(
    `SELECT DISTINCT slot FROM mat_free_claims WHERE identity_hash = ANY($1::text[])`, [keys]).catch(() => []);
  return new Set(rows.map((r) => r.slot));
}

/** 메일 확인 또는 소셜 가입을 끝냈는가(`FREE_SCOPE.requireVerified` 를 켰을 때만 본다) */
async function verified(userId: string): Promise<boolean> {
  const r = await queryOne<{ ok: boolean }>(
    `SELECT (u.email_verified_at IS NOT NULL OR EXISTS (SELECT 1 FROM auth_accounts a WHERE a.user_id = u.id)) AS ok
       FROM users u WHERE u.id = $1`, [userId]).catch(() => null);
  return Boolean(r?.ok);
}

/** 전공이 정해져 있는가(`activeCore` 와 같은 차례, 던지지 않는다) */
async function coreKnown(userId: string): Promise<boolean> {
  const r = await queryOne<{ ok: boolean }>(
    `SELECT (EXISTS (SELECT 1 FROM v3_attempts WHERE user_id = $1)
          OR EXISTS (SELECT 1 FROM career_profiles WHERE user_id = $1)
          OR EXISTS (SELECT 1 FROM campus_students WHERE user_id = $1)) AS ok`, [userId]).catch(() => null);
  if (r?.ok) return true;
  /* 열린 전공이 하나뿐인 배포본이면 그 전공이다 */
  const { sellableCores } = await import("@/lib/me-v3/core-registry");
  return sellableCores("KR").length === 1;
}

export async function matAccess(userId: string): Promise<MatAccess> {
  const [state, ready, used, keys, core] = await Promise.all([
    activeTrack(userId), hasV3Result(userId).catch(() => false), freeUsed(userId), identityKeys(userId),
    coreKnown(userId),
  ]);
  const paid = state.on;
  const claimed = await claimedSlots(keys);
  /* 이 기능 전에 쓴 분석(옛 무료 2번 · 지난 기간권)도 센다. 그래서 칸 수와 쓴 분석 수 가운데 큰 쪽이 쓴 것이다 */
  const before = FREE_SCOPE.analysesBeforeTest;
  const after = ready ? FREE_SCOPE.analysesAfterTest : 0;
  const usedN = Math.max(claimed.size, used.posting);
  const ok = !FREE_SCOPE.requireVerified || await verified(userId);
  const freeLeft = paid ? Infinity : ok ? Math.max(0, before + after - usedN) : 0;
  const notestUsed = claimed.has("notest") || usedN >= 1;
  const slots: MatAccess["slots"] = {
    notest: notestUsed ? "used" : "open",
    aftertest: !ready ? "locked" : (claimed.has("aftertest") || usedN >= 2) ? "used" : "open",
  };
  const left = { posting: freeLeft, draft: paid ? Infinity : 0, upload: paid ? Infinity : 0, research: paid ? Infinity : 0 };
  return {
    paid, ready, core, used, left, freeLeft, slots,
    weekTasks: paid ? Infinity : FREE_SCOPE.weekTasks,
    open: paid || ready || core,
    researchFirst: false,
  };
}

/** 이 사람이 지금 이 도구를 한 번 더 쓸 수 있는가와, 못 쓰면 그 까닭 */
export async function canUseMat(userId: string, use: MatUse): Promise<
  { ok: true; free: boolean } | { ok: false; why: "needtest" | "needcore" | "free" }
> {
  const a = await matAccess(userId);
  if (a.paid) return { ok: true, free: false };
  if (!a.core) return { ok: false, why: "needcore" };
  return a.left[use] > 0 ? { ok: true, free: true } : { ok: false, why: "free" };
}

export type FreeClaim = { slot: "notest" | "aftertest"; keys: string[] };

/**
 * 무료 분석 한 칸을 **먼저 잡는다**(분석 전에). 기간권이 있으면 잡을 것이 없다(`null`, 그대로 진행).
 * 잡지 못하면(다른 계정이 같은 열쇠로 이미 썼다 · 남은 칸이 없다) `false`: 부르는 쪽이 결제 입구로 보낸다.
 * 분석이 실패하면 `releaseFreeClaim` 으로 되돌린다
 */
export async function takeFreeAnalysis(userId: string): Promise<FreeClaim | null | false> {
  const a = await matAccess(userId);
  if (a.paid) return null;
  if (a.freeLeft <= 0) return false;
  const slot = a.slots.notest === "open" ? "notest" : a.slots.aftertest === "open" ? "aftertest" : null;
  if (!slot) return false;
  const keys = await identityKeys(userId);
  /* 첫 열쇠의 줄이 곧 자물쇠다(기본 키). 두 요청이 같이 와도 하나만 들어간다. 나머지 열쇠에도 같은 칸을 적는다 */
  const got = await tx(async (c) => {
    const r = await c.query(
      `INSERT INTO mat_free_claims (identity_hash, slot, user_id) VALUES ($1, $2, $3)
       ON CONFLICT (identity_hash, slot) DO NOTHING RETURNING identity_hash`, [keys[0], slot, userId]);
    if (!r.rowCount) return false;
    for (const k of keys.slice(1)) {
      await c.query(
        `INSERT INTO mat_free_claims (identity_hash, slot, user_id) VALUES ($1, $2, $3)
         ON CONFLICT (identity_hash, slot) DO NOTHING`, [k, slot, userId]);
    }
    return true;
  }).catch(() => false);
  return got ? { slot, keys } : false;
}

/** 분석이 끝나면 그 공고 번호를 적는다 */
export async function finishFreeAnalysis(c: FreeClaim, userId: string, postingId: string): Promise<void> {
  await query(
    `UPDATE mat_free_claims SET posting_id = $3 WHERE identity_hash = ANY($1::text[]) AND slot = $2 AND user_id = $4`,
    [c.keys, c.slot, postingId, userId]).catch(() => undefined);
  const { matStep } = await import("@/lib/funnel-v3");
  await matStep("free_analysis_used", userId);
}

/** 분석이 실패했으면 잡은 칸을 돌려준다 */
export async function releaseFreeClaim(c: FreeClaim, userId: string): Promise<void> {
  await query(
    `DELETE FROM mat_free_claims WHERE identity_hash = ANY($1::text[]) AND slot = $2 AND user_id = $3 AND posting_id IS NULL`,
    [c.keys, c.slot, userId]).catch(() => undefined);
}

/**
 * 새 공고 분석 하나를 **무료 칸과 함께** 만든다. 공고 분석을 새로 만드는 자리가 모두 이것을 지난다
 * (`/mat` 공고 · 붙여 넣기 · `/me/track` 붙여 넣기 · 가져오기 · 잡인더스트리 입구).
 *
 * 1. 기간권이면 그냥 만든다
 * 2. 아니면 무료 칸을 먼저 잡는다. 못 잡으면 `{ blocked }` 로 돌려 결제 입구로 보낸다
 * 3. 만들다 실패하면 잡은 칸을 돌려준다. 열쇠가 없어(AI 꺼짐) 규칙으로 읽은 것도 분석이고 칸을 쓴다
 */
export async function runAnalysis(
  userId: string, make: () => Promise<string>,
): Promise<{ id: string; free: boolean } | { blocked: "needcore" | "free" } | { failed: true }> {
  const can = await canUseMat(userId, "posting");
  if (!can.ok) return { blocked: can.why === "needcore" ? "needcore" : "free" };
  const claim = can.free ? await takeFreeAnalysis(userId) : null;
  if (claim === false) return { blocked: "free" };
  let id = "";
  try {
    id = await make();
  } catch {
    id = "";
  }
  if (!id) {
    if (claim) await releaseFreeClaim(claim, userId);
    return { failed: true };
  }
  if (claim) await finishFreeAnalysis(claim, userId, id);
  return { id, free: Boolean(claim) };
}
