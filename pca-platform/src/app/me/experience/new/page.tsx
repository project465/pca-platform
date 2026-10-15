/**
 * 새 경험 하나(규격 §9).
 *
 * **적는 자리는 한 벌이다**(`../compose`). 고치는 쪽과 두 벌로 적어 두면
 * 걸음이 한 번 바뀐 날 한 곳만 고쳐지고, 그러면 고치러 들어온 사람이 새로
 * 적을 때와 다른 칸을 본다.
 */
import { requireUser } from "@/lib/session";
import { mark } from "@/lib/me-v3/workspace-events";
import Compose from "../compose";

export const metadata = { title: "경험 추가 · 내 CareerMatri" };

export default async function NewExperience(
  { searchParams }: { searchParams: Promise<{ e?: string; td?: string }> },
) {
  const user = await requireUser();
  const sp = await searchParams;
  /* **적기 시작한 사람과 저장한 사람을 가른다.** 둘이 크게 벌어지면
     고칠 자리는 결과가 아니라 이 화면이다 */
  await mark("experience_add_started", user.id);
  return <Compose userId={user.id} e={sp.e} td={sp.td} />;
}
