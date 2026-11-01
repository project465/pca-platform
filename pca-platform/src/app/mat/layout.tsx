import "./mat.css";
import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { matVisible } from "@/lib/mat-public";
import { MatTabs } from "./tabs";

/**
 * MAT 화면(`/mat`, 2026-11-01 대표 결정: 예상 화면 7장 · 흑백 + 라임 · AI 느낌 금지).
 *
 * **서버가 막는다.** 메뉴를 숨기는 것만으로 두지 않는다: 로그인하지 않았으면 로그인으로,
 * MAT 을 볼 수 없는 사람(MAT_PUBLIC 이 꺼져 있고 이용권도 없고 운영자도 아닌 사람)은 주소를
 * 직접 쳐도 404 다(`matVisible`). 검색에도 잡히지 않게 noindex.
 *
 * 화면 안쪽만 흑백 + 라임이다(`mat.css`). 커리어피크 · 잡인더스트리 안의 입구 카드는 그 사이트
 * 색을 따른다.
 */
export const metadata: Metadata = {
  title: "MAT · CareerMatri",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };

export default async function MatLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  if (!user) redirect("/login?next=/mat");
  if (user.mustResetPw) redirect("/password/change");
  if (!(await matVisible(user.id))) notFound();
  return (
    <div className="mt">
      <div className="mt-frame">
        {children}
        <MatTabs />
      </div>
    </div>
  );
}
