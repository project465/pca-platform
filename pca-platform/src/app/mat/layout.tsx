import "./mat.css";
import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { matVisible } from "@/lib/mat-public";
import { MatTabs } from "./tabs";

/**
 * MAT 화면(`/mat`, 2026-11-01 대표 결정: 예상 화면 7장 · CareerMatri 앱과 같은 색 · AI 느낌 금지).
 *
 * **서버가 막는다.** 메뉴를 숨기는 것만으로 두지 않는다: 로그인하지 않았으면 로그인으로,
 * MAT 을 볼 수 없는 사람(MAT_PUBLIC 이 꺼져 있고 이용권도 없고 운영자도 아닌 사람)은 주소를
 * 직접 쳐도 404 다(`matVisible`). 검색에도 잡히지 않게 noindex.
 *
 * 화면 안쪽만 CareerMatri 앱과 같은 색이다(`mat.css`). 커리어피크 · 잡인더스트리 안의 입구 카드는 그 사이트
 * 색을 따른다.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };

export default async function MatLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  if (!user) redirect("/login?next=/mat");
  if (user.mustResetPw) redirect("/password/change");
  if (!(await matVisible(user.id))) notFound();
  /* **운영자(담당자 로그인)는 MAT 을 쓰는 사람이 아니다.** 검사 결과 · 전공이 없어 홈이 학생 화면으로
     넘기고, 그 화면은 담당자 로그인을 받지 않아 로그인으로 돌아갔다(2026-11-02 운영 시험). 안내를 세운다 */
  if (user.scope === "staff") {
    return (
      <div className="mt"><div className="mt-frame">
        <h1 className="mt-h1">MAT은 학생 · 개인 계정 화면입니다</h1>
        <p className="mt-lead">지금은 운영자(담당자) 계정으로 들어와 있습니다. MAT은 검사 결과가 있는 학생 · 개인 계정으로 봅니다.
          공개 전 확인은 운영자 화면에서 넣은 미리보기 계정으로 로그인해 주세요.</p>
        <a className="mt-btn is-block" href="/login?switch=1&next=/mat" style={{ marginTop: 12 }}>미리보기 계정으로 로그인</a>
        <a className="mt-btn is-block" href="/admin/partners" style={{ marginTop: 10 }}>미리보기 계정 · 제휴 연결 관리</a>
      </div></div>
    );
  }
  return (
    <div className="mt">
      <div className="mt-frame">
        {children}
        <MatTabs />
      </div>
    </div>
  );
}
