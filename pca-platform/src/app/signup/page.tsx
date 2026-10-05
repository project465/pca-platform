import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getProduct } from "@/lib/orders";
import { t, productName } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import SignupForm from "./signup-form";
import { activeDocs } from "@/lib/consent";
import { toLang2, txer } from "@/lib/surface-text";

export const metadata = { title: "가입하고 시작 · Careermetri" };

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

  /* 동의문은 **그 언어의 줄**을 읽는다. 없는 언어를 한국어로 바꿔
     돌려주지 않으므로, 번역이 없으면 그 사실이 그대로 화면에 온다 */
  const L = toLang2(lang);
  const T = txer(L);
  const docs = await activeDocs(L);
  const items = docs.map((d) => ({
    id: d.id,
    title: d.title,
    required: d.required,
    href: d.body_path ? `/legal/${d.kind}?lang=${L}` : null,
    pending: d.translation_status === "pending",
  }));
  const labels = {
    title: T("cnTitle"), required: T("cnRequired"), optional: T("cnOptional"),
    view: T("cnView"), agreeAll: T("cnAgreeAll"),
    pending: T("cnPending"), pendingShort: T("cnPendingShort"),
  };

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
        <SignupForm next={safeNext} lang={lang}
          consent={items} consentLabels={labels} />
        <p className="panel-foot">
          {t("suHaveAccount", lang)}{" "}
          <Link href={`/login?next=${encodeURIComponent(safeNext)}`}>{t("signIn", lang)}</Link>
        </p>
        <p className="panel-foot">{t("suFromSchool", lang)}</p>
      </div>
    </div>
  );
}
