import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getProduct } from "@/lib/orders";
import { t, productName } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import SignupForm from "./signup-form";

export const metadata = { title: "가입하고 시작 — METRI" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; product?: string; lang?: string }>;
}) {
  const user = await currentUser();
  const { next, product: code, lang: q } = await searchParams;
  const lang = await resolveLang(q);
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/my";
  if (user) redirect(safeNext);

  // 결제하러 왔다면 값을 먼저 보여 준다. 가입부터 시키고 나중에 값을
  // 들이밀면 그때 되돌아 나간다.
  const product = code ? await getProduct(code) : null;

  return (
    <div className="center-wrap">
      <div className="panel narrow">
        <div className="panel-top">
          <LangSwitch current={lang} />
        </div>
        <h1>{t("suTitle", lang)}</h1>
        <p className="sub">
          {product
            ? t("suLeadPaid", lang, {
                item: productName(product.code, lang),
                price: `${product.amount.toLocaleString("ko-KR")} KRW`,
              })
            : t("suLead", lang)}
        </p>
        <SignupForm next={safeNext} lang={lang} />
        <p className="panel-foot">
          {t("suHaveAccount", lang)}{" "}
          <Link href={`/login?next=${encodeURIComponent(safeNext)}`}>{t("signIn", lang)}</Link>
        </p>
        <p className="panel-foot">{t("suFromSchool", lang)}</p>
      </div>
    </div>
  );
}
