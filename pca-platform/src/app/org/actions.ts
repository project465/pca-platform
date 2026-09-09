"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { tx } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { newLinkToken } from "@/lib/applications";
import { adminOrgIds, linkOwnedBy, seatsOf } from "@/lib/org-links";
import { fieldErrors, type FieldErrors } from "@/lib/validation";

export type LinkState = { errors?: FieldErrors; message?: string; ok?: string };

const createSchema = z.object({
  orgId: z.string().trim().min(1),
  label: z.string().trim().min(1, "링크 이름을 입력하세요.").max(200),
  /** 비우면 남은 좌석 전부를 상한으로 삼는다 */
  maxUses: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(100_000)])
    .optional(),
  days: z.coerce
    .number()
    .int()
    .min(1, "기간은 1일 이상이어야 합니다.")
    .max(730, "기간이 너무 깁니다."),
});

/**
 * 담당자가 새 전용 링크를 만든다.
 *
 * 회차마다 링크를 따로 두고 싶을 때가 있어서다 — 3학년용과 4학년용을
 * 나눠 뿌리면 어느 쪽이 얼마나 들어왔는지 링크별로 보인다.
 *
 * 폼에서 온 orgId 는 믿지 않는다. 이 사람이 담당자로 있는 기관인지
 * 세션의 소속으로 다시 확인한다.
 */
export async function createLinkAction(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const user = await requireRole(["org_admin"]);

  const parsed = createSchema.safeParse({
    orgId: formData.get("orgId"),
    label: formData.get("label"),
    maxUses: formData.get("maxUses") ?? "",
    days: formData.get("days"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const mine = adminOrgIds(user);
  if (!mine.includes(v.orgId)) return { message: "권한이 없습니다." };

  const seats = await seatsOf(v.orgId);
  if (seats.free === 0) {
    return { message: "남은 응시권이 없습니다. 계약을 늘려야 새 링크가 의미가 있습니다." };
  }

  /* 남은 좌석보다 큰 상한은 뜻이 없다. 좌석이 없으면 등록이 어차피 막힌다 */
  const asked = v.maxUses === "" || v.maxUses === undefined ? seats.free : v.maxUses;
  const maxUses = Math.min(asked, seats.free);

  await tx(async (c) => {
    await c.query(
      `INSERT INTO org_links (org_id, token, label, max_uses, expires_at, created_by)
       VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval, $6)`,
      [v.orgId, newLinkToken(), v.label, maxUses, String(v.days), user.id],
    );
  });

  revalidatePath("/org");
  return { ok: `새 링크를 만들었습니다. ${maxUses.toLocaleString("ko-KR")}명까지 등록할 수 있습니다.` };
}

/**
 * 링크 회수.
 *
 * 이미 등록한 학생은 그대로 두고 링크만 닫는다. 잘못 뿌렸거나 기간이
 * 끝났을 때 쓴다. 되돌리는 기능은 두지 않았다 — 새로 만들면 되고,
 * 회수한 링크가 다시 살아나는 편이 더 위험하다.
 */
export async function revokeLinkAction(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const user = await requireRole(["org_admin"]);
  const linkId = String(formData.get("linkId") ?? "").trim();

  const owned = await linkOwnedBy(linkId, adminOrgIds(user));
  // 남의 링크는 없는 링크와 똑같이 다룬다. 존재 여부조차 알려주지 않는다
  if (!owned) return { message: "링크를 찾을 수 없습니다." };

  const done = await tx(async (c) => {
    const r = await c.query(
      `UPDATE org_links SET revoked_at = now()
        WHERE id = $1 AND revoked_at IS NULL`,
      [owned.id],
    );
    return r.rowCount ?? 0;
  });

  revalidatePath("/org");
  return done > 0 ? { ok: "링크를 회수했습니다." } : { message: "이미 회수된 링크입니다." };
}
