import Link from "next/link";
import { requireUser } from "@/lib/session";
import { erasurePlan } from "@/lib/erasure";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import EraseForm from "./erase-form";

export const metadata = { title: "계정 — METRI" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireUser();
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);
  const plan = erasurePlan();

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/my">
          METRI
        </Link>
        <div className="who">
          <LangSwitch current={lang} />
          <span>{user.name}</span>
        </div>
      </header>

      <main className="main">
        <h1 className="page-h1">{t("erTitle", lang)}</h1>
        <p className="page-sub">{t("erLead", lang)}</p>
        <p className="notice warn">{t("erWhyKeep", lang)}</p>

        <div className="erasecols">
          <section>
            <h2 className="page-h2">{t("erRemoveTitle", lang)}</h2>
            <ul className="eraselist">
              {plan.remove.map((r) => (
                <li key={r.table}>
                  <code>{r.table}</code>
                  <span>{r.why}</span>
                </li>
              ))}
              <li>
                <code>users</code>
                <span>이름 · 이메일 · 아이디 · 비밀번호</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="page-h2">{t("erKeepTitle", lang)}</h2>
            <ul className="eraselist keep">
              {Object.entries(plan.keep).map(([table, why]) => (
                <li key={table}>
                  <code>{table}</code>
                  <span>{why}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <EraseForm lang={lang} />
      </main>
    </div>
  );
}
