import { requireUser } from "@/lib/session";

/**
 * 현멘은 로그인한 사람만 들어온다. 역할 제한은 두지 않는다 —
 * 학생·개인회원·멘토가 같은 갤러리를 본다 (설계 원칙 1).
 */
export default async function MentoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return children;
}
