"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { query, queryOne } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { currentUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { record as consentRecord } from "@/lib/consent";
import { isPartner, PARTNERS, recordBrand } from "@/lib/brand";
import { matVisible } from "@/lib/mat-public";
import { bindHandoff, openHandoff, partnerConfig } from "@/lib/partner/link";
import { ref, swallow } from "@/lib/oplog";

export type EnterState = { message?: string };

/**
 * 제휴 링크로 들어온 사람의 `동의하고 시작` · `지금 계정과 잇기` · `계속`.
 *
 * - **링크는 여기서 쓰지 않는다.** 사람을 정해(만들거나 잇고) 링크에 적은 뒤, 로그인 자리(`auth.ts` 의
 *   partner 공급자)가 링크를 한 번 쓴다. 그래서 링크를 연 것만으로(미리보기 등) 로그인되지 않는다
 * - **이미 있는 계정과는 그 계정으로 로그인한 상태에서만 잇는다.** 메일이 같다고 합치지 않는다
 * - 새 계정은 가입 화면과 같은 필수 동의를 받는다. 동의 저장이 실패하면 계정을 되돌린다
 * - 비밀번호를 만들어 주지 않는다(소셜 가입과 같다): 다음에도 제휴 사이트의 MAT 단추로 들어온다
 */
export async function enterAction(_prev: EnterState, form: FormData): Promise<EnterState> {
  const partner = String(form.get("partner") ?? "");
  const t = String(form.get("t") ?? "");
  const mode = String(form.get("mode") ?? "");
  if (!isPartner(partner)) redirect("/");
  const h = await openHandoff(partner, t);
  if (!h) redirect(`/from/${partner}/enter?e=expired`);

  let userId = h.linked_user;
  if (!userId && mode === "link") {
    const me = await currentUser();
    if (!me) redirect(`/login?next=${encodeURIComponent(`/from/${partner}/enter?t=${t}`)}`);
    /* 로그인한 계정에 잇는 것은 넘겨받는 항목에 대한 동의 칸을 체크했을 때만(화면이 막지만 서버도 본다) */
    if (String(form.get("link_ok") ?? "") !== "1") return { message: "넘겨받는 항목을 잇는 데 동의해 주세요." };
    userId = me.id;
  }
  if (!userId && mode === "new") {
    const unusable = await hashPassword(randomBytes(32).toString("base64url"));
    const name = (typeof h.profile.display_name === "string" && h.profile.display_name.trim()) || `${PARTNERS[partner].name} 회원`;
    const created = await queryOne<{ id: string }>(
      `INSERT INTO users (display_name, password_hash, must_reset_pw, status, pw_login)
       VALUES ($1, $2, false, 'active', false) RETURNING id::text`, [name, unusable]);
    if (!created) return { message: "계정을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
    const saved = await consentRecord({
      userId: created.id, locale: "ko", siteId: null, agreedIds: form.getAll("consent").map(String).filter(Boolean),
    });
    if (!saved.ok) {
      await query(`DELETE FROM users WHERE id = $1`, [created.id]).catch(swallow({
        operation: "partner.enter.rollback", ref: ref("user", created.id), step: "delete", category: "db",
        detail: "동의 저장이 실패해 계정을 되돌리는 중",
      }));
      return { message: saved.reason };
    }
    userId = created.id;
  }
  if (!userId) return { message: "시작할 방법을 골라 주세요." };

  const fields = Object.keys(h.profile);
  const bound = await bindHandoff(h, userId, fields);
  if (!bound.ok) {
    return { message: `이 ${PARTNERS[partner].name} 계정은 다른 CareerMatri 계정과 이미 이어져 있습니다. 그 계정으로 들어오시거나 고객센터에 알려 주세요.` };
  }
  await recordBrand(userId, partner).catch(() => null);
  /* 유입 경로(처음 온 길을 지킨다) · 보던 공고 */
  {
    const { recordAttribution } = await import("@/lib/attribution");
    await recordAttribution(userId, { source: partner, idx: h.posting_ref && /^\d{1,12}$/.test(h.posting_ref) ? h.posting_ref : null });
  }
  /* 연동이 `시험` 상태면(시험 키로만 링크가 나온다) 이 계정을 공개 전 시험 계정으로 둔다 */
  if ((await partnerConfig(partner))?.status === "test") {
    await query(`INSERT INTO mat_preview_users (user_id, note) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
      [userId, `${partner} 시험 연결`]).catch(() => null);
  }

  /* 보던 공고가 모아 둔 공고에 있으면 그 공고부터 보인다 */
  let dest = (await matVisible(userId)) ? "/mat" : "/me/track";
  if (h.posting_ref) {
    const p = await queryOne<{ id: string }>(
      `SELECT id::text FROM v3_job_postings WHERE source = $1 AND source_ref = $2`, [partner, h.posting_ref]).catch(() => null);
    if (p) dest = dest === "/mat" ? `/mat/jobs?from=${p.id}` : "/me/track/jobs";
  }
  try {
    await signIn("partner", { t, redirectTo: dest });
  } catch (e) {
    if (e instanceof AuthError) return { message: `로그인을 마치지 못했습니다. ${PARTNERS[partner].name}에서 MAT 단추를 다시 눌러 주세요.` };
    throw e;
  }
  return {};
}
