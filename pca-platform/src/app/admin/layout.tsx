import StagingMark from "@/components/staging-mark";
import { requireRole } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 운영사 관리자 화면은 superadmin 만 들어온다.
  await requireRole(["superadmin"]);
  return (
    <>
      {/* 이 배포본이 공개 전인지 운영인지를 운영자 화면에만 적는다 */}
      <StagingMark />
      {children}
    </>
  );
}
