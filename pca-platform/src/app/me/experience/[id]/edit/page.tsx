/**
 * 적어 둔 경험 고치기(규격 §9).
 *
 * **지우고 다시 적게 하지 않는다.** 그러면 그 기록의 번호가 바뀌고, 쌓여
 * 있던 다시 셀 일과 반영 기록이 사라진 기록을 가리킨다. 그리고 고치는
 * 사람은 손대지 않을 칸까지 전부 다시 고르게 된다.
 *
 * **남의 번호를 넣어도 열리지 않는다**: 읽는 자리가 `user_id` 로 거른다.
 */
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { experienceOf } from "@/lib/me-v3/platform";
import Compose from "../../compose";

export const metadata = { title: "경험 고치기 · 내 CareerMatri" };

export default async function EditExperience(
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ e?: string }>;
  },
) {
  const user = await requireUser();
  const { id } = await params;
  const row = await experienceOf(user.id, id);
  if (!row) notFound();
  return <Compose userId={user.id} value={row} e={(await searchParams).e} />;
}
