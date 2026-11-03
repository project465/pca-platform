import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { attemptOf } from "@/lib/me-v3/runtime/session";

/**
 * 첫 문항 앞 안내 쪽. **이제 따로 세우지 않는다**(2026-11-03 대표 "절차가 많다" · "여기 ai티 난다"): 시작 화면이 한 줄로
 * 같은 것을 말하므로 두 번 하지 않는다. 옛 주소로 들어오면 그 응시로 보낸다(푸는 중이면 문항, 끝났으면 결과).
 */
export default async function V3Intro({
  params,
}: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  const { attemptId } = await params;
  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();
  redirect(a.status === "in_progress" ? `/v3/${attemptId}` : `/v3/${attemptId}/result`);
}
