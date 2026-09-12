import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import FreeForm from "./free-form";

export const metadata = { title: "무료 진단 — 메트리 플러스" };

/**
 * 무료 구간으로 들어오는 문.
 *
 * 결제 화면과 나란한 자리다. 다른 점 하나 — **어디까지 무료인지 먼저
 * 적는다.** 무료를 누르게 하는 것은 쉽고, 그 뒤에 "이건 유료입니다" 가
 * 나오면 무료로 얻은 신뢰가 그 자리에서 사라진다. 그래서 무료로 나오는
 * 것과 나오지 않는 것을 같은 크기로 나란히 둔다.
 */
export default async function FreePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);

  // 결제 화면과 같은 이유로 로그인 폼으로 막지 않는다 — 처음 온 사람은
  // 계정이 없다. 가입이 끝나면 이 화면으로 돌아온다.
  const user = await currentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent("/free")}`);
  if (user.mustResetPw) redirect("/password/change");

  return (
    <main className="main">
      <div className="paywrap">
        <div className="panel-top">
          <LangSwitch current={lang} />
        </div>
        <h1>{t("freeTitle", lang)}</h1>
        <p className="paylead">{t("freeSub", lang)}</p>

        <div className="freesplit">
          <section>
            <h2>{t("freeIncHead", lang)}</h2>
            <ul className="freeyes">
              <li>{t("freeInc1", lang)}</li>
              <li>{t("freeInc2", lang)}</li>
              <li>{t("freeInc3", lang)}</li>
            </ul>
          </section>
          <section>
            <h2>{t("freeExcHead", lang)}</h2>
            <ul className="freeno">
              <li>{t("freeExc1", lang)}</li>
              <li>{t("freeExc2", lang)}</li>
            </ul>
          </section>
        </div>

        <FreeForm lang={lang} />

        <ul className="paynote">
          <li>{t("freeOnce", lang)}</li>
          <li>{t("freeSchool", lang)}</li>
        </ul>

      </div>
    </main>
  );
}
