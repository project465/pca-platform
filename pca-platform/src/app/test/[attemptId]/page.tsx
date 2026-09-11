import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { findAttempt, questionPage, PAGE_SIZE } from "@/lib/attempts";
import TestRunner from "./test-runner";

export const metadata = { title: "검사 응시 — METRI" };

export default async function TestPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ p?: string; lang?: string }>;
}) {
  const user = await requireRole(["student"]);
  const { attemptId } = await params;
  const { p, lang } = await searchParams;

  const attempt = await findAttempt(attemptId, user.id);
  if (!attempt) redirect("/test");
  if (attempt.status === "scored") redirect(`/report/${attemptId}`);

  const pages = Math.ceil(attempt.total / PAGE_SIZE);
  const page = Math.min(Math.max(1, Number(p) || 1), pages);
  const questions = await questionPage(attempt, page, lang ?? "ko");

  return (
    <TestRunner
      attemptId={attemptId}
      page={page}
      pages={pages}
      total={attempt.total}
      answered={attempt.answered}
      questions={questions}
      lang={lang ?? "ko"}
    />
  );
}
