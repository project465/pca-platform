"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { tx } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { newLinkToken } from "@/lib/applications";
import { adminOrgIds, linkOwnedBy, seatsOf } from "@/lib/org-links";
import { fieldErrors, type FieldErrors } from "@/lib/validation";
import { isValidDomain, isValidMask, parseDomains } from "@/lib/join-rules";

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
  /* 등록 조건. 비우면 조건 없음 */
  loginIdMask: z.string().trim().max(40).optional(),
  emailDomains: z.string().trim().max(300).optional(),
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
    loginIdMask: formData.get("loginIdMask") ?? "",
    emailDomains: formData.get("emailDomains") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const mine = adminOrgIds(user);
  if (!mine.includes(v.orgId)) return { message: "권한이 없습니다." };

  /* 조건을 알아볼 수 없으면 만들지 않는다. 잘못 저장하면 아무도 못 들어온다 */
  const mask = v.loginIdMask || "";
  if (mask && !isValidMask(mask)) {
    return { errors: { loginIdMask: "9 는 숫자, A 는 영문, * 는 숫자나 영문입니다. 그 밖의 기호는 쓸 수 없습니다." } };
  }
  const domains = parseDomains(v.emailDomains || "");
  const badDomain = domains.find((d) => !isValidDomain(d));
  if (badDomain) {
    return { errors: { emailDomains: `도메인 형식이 아닙니다: ${badDomain}` } };
  }

  const seats = await seatsOf(v.orgId);
  if (seats.free === 0) {
    return { message: "남은 응시권이 없습니다. 계약을 늘려야 새 링크가 의미가 있습니다." };
  }

  /* 남은 좌석보다 큰 상한은 뜻이 없다. 좌석이 없으면 등록이 어차피 막힌다 */
  const asked = v.maxUses === "" || v.maxUses === undefined ? seats.free : v.maxUses;
  const maxUses = Math.min(asked, seats.free);

  await tx(async (c) => {
    await c.query(
      `INSERT INTO org_links
         (org_id, token, label, max_uses, expires_at, created_by, login_id_mask, email_domains)
       VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval, $6, $7, $8)`,
      [v.orgId, newLinkToken(), v.label, maxUses, String(v.days), user.id,
       mask || null, domains.length ? domains.join(", ") : null],
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

/* ── 회차 ────────────────────────────────────────────── */

const sessionSchema = z.object({
  orgId: z.string().trim().min(1),
  instrumentId: z.string().trim().min(1, "검사지를 고르세요."),
  name: z.string().trim().min(1, "회차 이름을 입력하세요.").max(200),
  opensOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식입니다."),
  closesOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식입니다."),
});

/**
 * 회차를 연다.
 *
 * 회차가 있어야 학생이 응시할 수 있다. 계약을 함께 묶는 이유는 응시권이
 * 계약에 달려 있기 때문이다 — 어느 계약의 좌석을 쓰는 회차인지 정해야 한다.
 *
 * 폼에서 온 orgId 는 여기서도 믿지 않는다. 세션의 소속으로 다시 확인한다.
 */
export async function createSessionAction(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const user = await requireRole(["org_admin"]);

  const parsed = sessionSchema.safeParse({
    orgId: formData.get("orgId"),
    instrumentId: formData.get("instrumentId"),
    name: formData.get("name"),
    opensOn: formData.get("opensOn"),
    closesOn: formData.get("closesOn"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  if (!adminOrgIds(user).includes(v.orgId)) return { message: "권한이 없습니다." };
  if (v.closesOn < v.opensOn) return { errors: { closesOn: "종료일이 시작일보다 앞설 수 없습니다." } };

  try {
    await tx(async (c) => {
      const contract = await c.query<{ id: string }>(
        `SELECT id FROM contracts
          WHERE org_id = $1 AND status = 'active'
          ORDER BY ends_on DESC LIMIT 1`,
        [v.orgId],
      );
      if (contract.rowCount === 0) throw new Error("NO_CONTRACT");

      // 문항이 없는 검사지로 회차를 열면 학생이 빈 화면을 만난다
      const q = await c.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM questions WHERE instrument_id = $1`,
        [v.instrumentId],
      );
      if (Number(q.rows[0].n) === 0) throw new Error("NO_QUESTIONS");

      await c.query(
        `INSERT INTO test_sessions (org_id, contract_id, instrument_id, name, opens_at, closes_at)
         VALUES ($1, $2, $3, $4, $5::date, $6::date + interval '1 day' - interval '1 second')`,
        [v.orgId, contract.rows[0].id, v.instrumentId, v.name, v.opensOn, v.closesOn],
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("NO_CONTRACT")) return { message: "계약이 없습니다. 운영사에 문의해 주세요." };
    if (msg.includes("NO_QUESTIONS")) return { message: "그 검사지에는 아직 문항이 없습니다." };
    throw e;
  }

  revalidatePath("/org");
  return { ok: "회차를 열었습니다. 이제 학생이 전용 링크로 들어와 응시할 수 있습니다." };
}

/**
 * 결과 공개.
 *
 * 확정된 결정이다 — 결과는 학과 담당자가 확인한 뒤 공개된다. 그전까지
 * 학생 화면은 "아직 공개되지 않았습니다" 로 막힌다.
 *
 * 되돌리는 기능은 두지 않았다. 한 번 본 결과를 도로 감추는 것은 학생에게
 * 더 나쁘고, 잘못 공개했다면 회차를 닫는 편이 낫다.
 */
export async function releaseSessionAction(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const user = await requireRole(["org_admin"]);
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  const done = await tx(async (c) => {
    /* 폼에서 온 회차 id 를 믿지 않는다. 이 사람이 담당자인 기관의 것인지
       되짚어 확인한다. 아니면 없는 회차와 똑같이 답한다 */
    const r = await c.query(
      `UPDATE test_sessions SET released_at = now()
        WHERE id = $1 AND released_at IS NULL
          AND org_id = ANY($2::bigint[])`,
      [sessionId, adminOrgIds(user)],
    );
    return r.rowCount ?? 0;
  });

  revalidatePath("/org");
  return done > 0
    ? { ok: "결과를 공개했습니다. 학생이 결과지를 볼 수 있습니다." }
    : { message: "회차를 찾을 수 없거나 이미 공개했습니다." };
}
