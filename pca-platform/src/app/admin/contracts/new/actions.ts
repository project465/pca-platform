"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { tx } from "@/lib/db";
import { requireRole } from "@/lib/session";

export type ContractState = { error?: string };

/**
 * 계약을 만들면 좌석을 그 자리에서 seat_count 만큼 만든다.
 * 좌석을 나중에 만들면 "계약은 있는데 좌석이 없다" 라는 상태가 생기고,
 * 명단을 올리던 담당자가 이유를 알 수 없는 실패를 본다.
 */
export async function createContract(
  _prev: ContractState,
  form: FormData,
): Promise<ContractState> {
  await requireRole(["superadmin"]);

  const orgId = String(form.get("orgId") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const startsOn = String(form.get("startsOn") ?? "");
  const endsOn = String(form.get("endsOn") ?? "");
  const seatCount = Number(form.get("seatCount") ?? 0);

  if (!orgId || !title) return { error: "기관과 계약명을 적어 주세요." };
  if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 20000) {
    return { error: "좌석 수는 1 이상 20,000 이하의 정수여야 합니다." };
  }
  if (new Date(endsOn) <= new Date(startsOn)) {
    return { error: "종료일이 시작일보다 빨라서는 안 됩니다." };
  }

  try {
    await tx(async (c) => {
      const row = await c.query<{ id: string }>(
        `INSERT INTO contracts (org_id, title, starts_on, ends_on, seat_count)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [orgId, title, startsOn, endsOn, seatCount],
      );
      await c.query(
        `INSERT INTO seats (contract_id, expires_at)
         SELECT $1, $2::date + 1 FROM generate_series(1, $3)`,
        [row.rows[0].id, endsOn, seatCount],
      );
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "계약을 만들지 못했습니다." };
  }

  revalidatePath("/admin/organizations");
  redirect("/admin/organizations");
}
