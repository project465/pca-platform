import { redirect } from "next/navigation";
import { requireRole, currentUser } from "@/lib/session";
import { findAttempt, questionPage, PAGE_SIZE } from "@/lib/attempts";
import { resolveLang } from "@/lib/locale-server";
import TestRunner from "./test-runner";

/** 탭 제목도 브랜드를 따라간다. 고교 응시자에게 METRI 를 띄우지 않는다. */
export async function generateMetadata({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await currentUser();
  const a = user ? await findAttempt(attemptId, user.id) : null;
  return { title: a?.trackCode === "HS" ? "검사 응시 — 메트리 플러스" : "검사 응시 — METRI" };
}

export default async function TestPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ p?: string; lang?: string }>;
}) {
  const user = await requireRole(["student"]);
  const { attemptId } = await params;
  const { p, lang: q } = await searchParams;
  const lang = await resolveLang(q);

  const attempt = await findAttempt(attemptId, user.id);
  if (!attempt) redirect("/test");
  if (attempt.status === "scored") redirect(`/report/${attemptId}`);

  const pages = Math.ceil(attempt.total / PAGE_SIZE);
  const page = Math.min(Math.max(1, Number(p) || 1), pages);
  const questions = await questionPage(attempt, page, lang);

  return (
    <TestRunner
      attemptId={attemptId}
      page={page}
      pages={pages}
      total={attempt.total}
      answered={attempt.answered}
      questions={questions}
      lang={lang}
    />
  );
}
