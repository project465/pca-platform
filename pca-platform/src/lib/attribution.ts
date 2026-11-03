import { cookies, headers } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { partnerFromCookie } from "@/lib/brand";
import { ipCountryFrom } from "@/lib/subscriptions/route";

/**
 * 한 사람이 어디서 왔는가(2026-11-03 대표 결정: 잡인더스트리 경로 결제는 유입 표시, 공고 ID · 유입 경로별 집계).
 *
 * **처음 온 길을 지킨다.** 이미 적힌 사람은 바꾸지 않는다. 다만 `직접` 으로 적힌 사람이 나중에 잡인더스트리
 * 공고 입구로 다시 오면 그 공고를 적는다(그 뒤의 결제가 그 공고 덕이다). 주문 · 정기결제가 이 줄을 베껴 간다.
 */
export const JI_POST_COOKIE = "cm_ji_post";
/** 잡인더스트리 공고 입구가 받는 게시판(출연연 · 교원 임용 · 공공기관 · 기업 R&D · 대학원) */
export const JI_BOARDS = ["430", "439", "486", "487", "488"] as const;

export function jiPost(board: unknown, idx: unknown): { board: string; idx: string; url: string } | null {
  const b = String(board ?? "");
  const i = String(idx ?? "");
  if (!(JI_BOARDS as readonly string[]).includes(b) || !/^\d{1,12}$/.test(i)) return null;
  /* 상세 주소는 서버가 만든다. 화면 · 주소창이 보낸 주소를 열지 않는다 */
  return { board: b, idx: i, url: `https://www.jobindustry.co.kr/${b}/?bmode=view&idx=${i}` };
}

export async function jiPostFromCookie(): Promise<{ board: string; idx: string; url: string } | null> {
  try {
    const v = (await cookies()).get(JI_POST_COOKIE)?.value ?? "";
    const [b, i] = v.split(":");
    return jiPost(b, i);
  } catch {
    return null;
  }
}

export async function recordAttribution(userId: string, a: {
  source: "jobindustry" | "careerpeak" | "school" | "direct"; board?: string | null; idx?: string | null; country?: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO user_attribution (user_id, source, board, posting_idx, signup_country)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       source = CASE WHEN user_attribution.source = 'direct' AND EXCLUDED.source = 'jobindustry' THEN 'jobindustry' ELSE user_attribution.source END,
       board = CASE WHEN EXCLUDED.source = 'jobindustry' AND user_attribution.source IN ('direct', 'jobindustry') THEN EXCLUDED.board ELSE user_attribution.board END,
       posting_idx = CASE WHEN EXCLUDED.source = 'jobindustry' AND user_attribution.source IN ('direct', 'jobindustry') THEN EXCLUDED.posting_idx ELSE user_attribution.posting_idx END,
       signup_country = coalesce(user_attribution.signup_country, EXCLUDED.signup_country),
       updated_at = now()`,
    [userId, a.source, a.board ?? null, a.idx ?? null, a.country ?? null],
  ).catch(() => undefined);
}

/** 가입하는 요청에서 부른다: 잡인더스트리 공고 쿠키 → 제휴 쿠키 → 직접, 그리고 접속 국가 머리글 */
export async function recordSignupAttribution(userId: string): Promise<"jobindustry" | "careerpeak" | "direct"> {
  const post = await jiPostFromCookie();
  const partner = await partnerFromCookie();
  const country = await headers().then((h) => ipCountryFrom(h)).catch(() => null);
  const source = post ? "jobindustry" : partner === "jobindustry" || partner === "careerpeak" ? partner : "direct";
  await recordAttribution(userId, { source, board: post?.board, idx: post?.idx, country });
  return source;
}

export async function attributionOf(userId: string): Promise<{ source: string; posting_idx: string | null } | null> {
  return queryOne<{ source: string; posting_idx: string | null }>(
    `SELECT source, posting_idx FROM user_attribution WHERE user_id = $1`, [userId]).catch(() => null);
}
