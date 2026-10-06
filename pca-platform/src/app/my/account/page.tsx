import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ERASE_GROUPS, KEEP_GROUPS } from "@/lib/erasure";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import EraseForm from "./erase-form";

export const metadata = { title: "계정 · CareerMatri" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireUser();
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);
  const en = lang === "en";

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/my">
          CareerMatri
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

        {/* **표 이름을 손님에게 보여 주지 않는다.** 되돌릴 수 없는 단추
            앞에서 `jd_match_scores` 를 읽게 하면, 무엇을 잃는지 모른 채
            누르거나 무서워서 못 누른다. 묶음은 사람이 무엇을 잃는가로
            가르고, 표 이름은 지우는 코드와 감사 기록에만 남는다 */}
        <div className="erasecols">
          <section>
            <h2 className="page-h2">{t("erRemoveTitle", lang)}</h2>
            <ul className="eraselist">
              {ERASE_GROUPS.map((g) => (
                <li key={g.ko}>
                  <b>{en ? g.en : g.ko}</b>
                  <span>{en ? g.detail.en : g.detail.ko}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="page-h2">{t("erKeepTitle", lang)}</h2>
            <ul className="eraselist keep">
              {KEEP_GROUPS.map((g) => (
                <li key={g.ko}>
                  <b>{en ? g.en : g.ko}</b>
                  <span>{en ? g.detail.en : g.detail.ko}</span>
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
