import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { attemptOf } from "@/lib/me-v3/runtime/session";
import { phrase } from "@/lib/me-v3/phrase";
import { V3ResultBody } from "./body";

/* 탭 제목도 그 응시의 언어다 */
export async function generateMetadata(
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  const u = await currentUser();
  /* 처음 비밀번호(학번 · 전화번호)를 아직 안 바꿨으면 바꾸는 화면만(2026-11-02 대표 결정 "첫 로그인 때 꼭 바꾸게") */
  if (u?.mustResetPw) redirect("/password/change");
  const a = u ? await attemptOf(attemptId, u.id).catch(() => null) : null;
  return { title: phrase(a?.locale)("결과 · CareerMatri") };
}

/**
 * 산 사람의 결과지. 본문은 `body.tsx` 한 벌이고 견본(`/sample`)도 그것을
 * 그린다. 여기서 하는 일은 주소에서 응시 번호를 꺼내 넘기는 것뿐이다.
 */
export default async function V3Result({
  params, searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ again?: string }>;
}) {
  const { attemptId } = await params;
  const { again } = await searchParams;
  return <V3ResultBody attemptId={attemptId} again={again} />;
}
