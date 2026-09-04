import { requireRole } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 운영사 관리자 화면은 superadmin 만 들어온다.
  await requireRole(["superadmin"]);
  return children;
}
