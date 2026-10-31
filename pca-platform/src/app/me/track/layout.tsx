import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { matVisible } from "@/lib/mat-public";

/**
 * MAT 을 가려 둔 동안(`lib/mat-public.ts`) 이 아래 화면은 운영자와 이미 이용 기간이 있는
 * 사람에게만 열린다. 그 밖의 사람은 작업공간 홈으로 돌아간다.
 */
export default async function TrackLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!(await matVisible(user.id))) redirect("/me");
  return children;
}
