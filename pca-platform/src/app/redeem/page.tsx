import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import RedeemForm from "./redeem-form";

export const metadata = { title: "응시권 코드 — Careermetri" };

/**
 * 밖에서 산 사람이 들어오는 문.
 *
 * 결제는 쇼핑몰이 받고 응시는 여기서 한다. 그 사이를 잇는 것이 코드 한
 * 줄이다. 결제 화면·무료 화면과 나란한 세 번째 문이다.
 *
 * 로그인으로 막지 않는다 — 코드를 손에 쥔 사람은 이미 돈을 낸 사람이고,
 * 그 사람에게 계정부터 만들라고 하면 거기서 나간다. 가입이 끝나면 이
 * 화면으로 돌아온다(`/free` 와 같은 규칙이다).
 */
export default async function RedeemPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);

  const user = await currentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent("/redeem")}`);
  if (user.mustResetPw) redirect("/password/change");

  return (
    <main className="main">
      <div className="paywrap">
        <div className="panel-top">
          <LangSwitch current={lang} />
        </div>
        <h1>{t("redeemTitle", lang)}</h1>
        <p className="paylead">{t("redeemSub", lang)}</p>
        <RedeemForm lang={lang} />
      </div>
    </main>
  );
}
