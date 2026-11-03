import "./mat.css";
import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { matVisible } from "@/lib/mat-public";
import { MatTabs } from "./tabs";
import Link from "next/link";
import { BrandMark } from "@/components/sf/brand-mark";
import LangSwitch from "@/components/lang-switch";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { SHELL_TEXT as T } from "./mat-text";

/**
 * CareerMatri 머리띠(2026-11-02 대표 "MAT도 커리어매트리 느낌 나도록"): 로그인 화면과 같은 남색 띠 ·
 * 파란 M 로고 · CareerMatri 글자. MAT 은 그 아래 구역 이름으로만 작게 선다
 */
function MatHead({ lang }: { lang: "ko" | "en" }) {
  return (
    <header className="mt-head">
      <div className="mt-head-in">
        <Link href="/me" className="mt-brand"><BrandMark size={28} className="sf-brand-mark" /><span>CareerMatri</span></Link>
        <Link href="/mat" className="mt-zone">MAT</Link>
        {/* 언어 고르기(2026-11-03 영어 화면). 고르면 계정 언어도 바뀐다 */}
        <span className="mt-lang"><LangSwitch current={lang} /></span>
      </div>
    </header>
  );
}

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
  const lang = await matLang();
  const t = sayOf(lang);
  /* **운영자(담당자 로그인)는 MAT 을 쓰는 사람이 아니다.** 검사 결과 · 전공이 없어 홈이 학생 화면으로
     넘기고, 그 화면은 담당자 로그인을 받지 않아 로그인으로 돌아갔다(2026-11-02 운영 시험). 안내를 세운다 */
  if (user.scope === "staff") {
    return (
      <div className="mt"><MatHead lang={lang} /><div className="mt-frame">
        <h1 className="mt-h1">{t(T.staffTitle)}</h1>
        <p className="mt-lead">{t(T.staffLead)}</p>
        <a className="mt-btn is-block" href="/login?switch=1&next=/mat" style={{ marginTop: 12 }}>{t(T.staffLogin)}</a>
        <a className="mt-btn is-block" href="/admin/partners" style={{ marginTop: 10 }}>{t(T.staffPartners)}</a>
      </div></div>
    );
  }
  return (
    <div className="mt" lang={lang}>
      <MatHead lang={lang} />
      <div className="mt-frame">
        {children}
        <MatTabs labels={[t(T.tabHome), t(T.tabJobs), t(T.tabDraft), t(T.tabConsult), t(T.tabPass), t(T.tabSettings)]} aria={t(T.menu)} />
      </div>
    </div>
  );
}
