"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { queryOne, tx } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { university } from "@/lib/campus/registry";

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

  /* **학교 전용 진입 기관에는 옛 검사 계약을 그냥 넣지 않는다**(2026-11-06). 한 줄이라도 생기면 담당자 메뉴가
     옛 화면(계약 · 좌석 · 회차)으로 바뀌고(`campusV3Only`), 학교 MAT 은 이 표와 상관없이 닫힌 채다.
     옛 검사 좌석이 정말 필요할 때만 확인 칸을 켜고 넣는다 */
  const org = await queryOne<{ code: string }>(`SELECT code FROM organizations WHERE id = $1`, [orgId]);
  const uni = org?.code ? university(org.code) : null;
  if (uni && String(form.get("legacy") ?? "") !== "1") {
    return {
      error: `${uni.university_name}는 학교 전용 진입으로 운영합니다. 학교 MAT 인원은 MAT 학교 이용권 화면(/admin/campus-mat)에서 넣습니다. `
        + "옛 검사 좌석이 꼭 필요하면 아래 확인 칸을 켜고 다시 등록하세요. 등록하면 담당자 메뉴가 옛 화면으로 바뀝니다.",
    };
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
