import { requireUser } from "@/lib/session";
import { ERASE_GROUPS, KEEP_GROUPS } from "@/lib/erasure";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import { CmShell, CmHead } from "@/app/me/shell";
import EraseForm from "./erase-form";

export const metadata = { title: "계정 설정 · CareerMatri" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  await requireUser();
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);
  const en = lang === "en";

  return (
    <CmShell active="/my" title={t("erTitle", lang)}>
      <CmHead kicker="계정" title={t("erTitle", lang)} lead={t("erLead", lang)} />
      <p className="cm-note">{t("erWhyKeep", lang)}</p>

      {/* **표 이름을 손님에게 보여 주지 않는다.** 되돌릴 수 없는 단추
          앞에서 `jd_match_scores` 를 읽게 하면, 무엇을 잃는지 모른 채
          누르거나 무서워서 못 누른다. 묶음은 사람이 무엇을 잃는가로
          가르고, 표 이름은 지우는 코드와 감사 기록에만 남는다 */}
      <div className="cm-grid">
        <section className="cm-card">
          <h2>{t("erRemoveTitle", lang)}</h2>
          <div className="cm-rows">
            {ERASE_GROUPS.map((g) => (
              <p className="cm-row" key={g.ko}>
                <b>{en ? g.en : g.ko}</b>
                <span>{en ? g.detail.en : g.detail.ko}</span>
              </p>
            ))}
          </div>
        </section>

        <section className="cm-card">
          <h2>{t("erKeepTitle", lang)}</h2>
          <div className="cm-rows">
            {KEEP_GROUPS.map((g) => (
              <p className="cm-row" key={g.ko}>
                <b>{en ? g.en : g.ko}</b>
                <span>{en ? g.detail.en : g.detail.ko}</span>
              </p>
            ))}
          </div>
        </section>
      </div>

      <div className="cm-card is-wide">
        <EraseForm lang={lang} />
      </div>
    </CmShell>
  );
}
