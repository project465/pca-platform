"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { tx } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { contractCreateSchema, fieldErrors, type FieldErrors } from "@/lib/validation";

export type ContractState = { errors?: FieldErrors; message?: string };

/**
 * 계약 등록. 응시권(seats)은 계약을 만들 때 seat_count 만큼 미리 만든다
 * (db/schema.sql 의 주석). 나중에 세어서 만들면 "몇 장 남았나"를 계산으로
 * 답해야 하는데, 행으로 두면 배정·소진이 행 하나의 상태 변화가 된다.
 */
export async function createContractAction(
  _prev: ContractState,
  formData: FormData,
): Promise<ContractState> {
  await requireRole(["superadmin"]);

  const parsed = contractCreateSchema.safeParse({
    orgId: formData.get("orgId"),
    title: formData.get("title"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
    seatCount: formData.get("seatCount"),
    memo: formData.get("memo") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const c = parsed.data;

  if (c.endsOn < c.startsOn) {
    return { errors: { endsOn: "종료일이 시작일보다 앞설 수 없습니다." } };
  }

  await tx(async (client) => {
    const r = await client.query<{ id: string }>(
      `INSERT INTO contracts (org_id, title, starts_on, ends_on, seat_count, memo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [c.orgId, c.title, c.startsOn, c.endsOn, c.seatCount, c.memo || null],
    );
    // 한 장씩 INSERT 하면 20,000개에서 느려진다. generate_series 로 한 번에 만든다.
    await client.query(
      `INSERT INTO seats (contract_id, expires_at)
       SELECT $1, ($2::date + 1)::timestamptz FROM generate_series(1, $3)`,
      [r.rows[0].id, c.endsOn, c.seatCount],
    );
  });

  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}
