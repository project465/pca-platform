import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { activeDocs } from "@/lib/consent";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { PROVIDER_LABEL } from "@/lib/auth-accounts";
import { isPrivateRelay } from "@/lib/auth-oauth";
import { open as openPending } from "@/lib/oauth-pending";
import { safeNext } from "@/lib/safe-next";
import AuthBrand from "@/components/auth-brand";
import PublicFooter from "@/components/sf/public-footer";
import SocialSignupForm from "./social-form";

export const metadata = { title: "가입 마무리 · CareerMatri" };

/**
 * 소셜로 처음 들어온 사람의 **동의 한 걸음.**
 *
 * 구글이 확인해 준 것은 "이 사람이 이 계정의 주인이다" 까지이고, 우리
 * 약관에 동의했는지는 아무 말도 하지 않는다. 가입 화면이 받는 것을
 * 소셜이라고 건너뛰면 **동의 없는 계정**이 생긴다.
 *
 * **묻는 것은 동의뿐이다.** 이름과 메일은 공급자가 줬고, 비밀번호는
 * 만들지 않는다. 칸을 더 세우면 소셜 로그인을 붙인 까닭이 사라진다.
 */
export default async function SocialSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; next?: string }>;
}) {
  if (await currentUser()) redirect("/me");

  const sp = await searchParams;
  const pending = openPending(sp.t ?? "");
  /* 봉투가 상했거나 십 분이 지났다. **왜인지는 가르지 않는다** */
  if (!pending) redirect("/login?error=oauth_expired");

  const L = toLang2(await resolveLang());
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

  const who = PROVIDER_LABEL[pending.provider];
  const relay = isPrivateRelay(pending.email);

  return (
    <div className="center-wrap">
      <div className="authwrap">
        <AuthBrand name={BRAND.root} />
        <div className="panel narrow">
          <h1>{L === "en" ? "One more step" : "한 걸음 남았습니다"}</h1>
          <p className="sub">
            {L === "en"
              ? `${who} confirmed who you are. Agree to the terms below and your`
                + " CareerMatri account is ready."
              : `${who} 로 본인 확인이 끝났습니다. 아래 약관에 동의하시면`
                + " CareerMatri 계정이 만들어집니다."}
          </p>

          <dl className="sf-defs" style={{ marginTop: 18 }}>
            <div className="sf-def">
              <dt>{L === "en" ? "Signing in with" : "로그인 방법"}</dt>
              <dd>{who}</dd>
            </div>
            {pending.email ? (
              <div className="sf-def">
                <dt>{L === "en" ? "Email" : "이메일"}</dt>
                <dd>{pending.email}</dd>
              </div>
            ) : null}
          </dl>

          {/* **애플이 가려 준 주소라는 것을 적는다.** 적지 않으면 받은
              사람이 모르는 주소를 보고 자기 계정이 아니라고 생각한다 */}
          {relay ? (
            <p className="sub" style={{ marginTop: 12 }}>
              {L === "en"
                ? "Apple gave us a relay address instead of your own. Mail we send"
                  + " reaches you through it. It is not the same as an account you"
                  + " may already have under your real address."
                : "애플이 실제 주소 대신 가려 준 주소를 줬습니다. 저희가 보내는"
                  + " 메일은 그 주소를 거쳐 닿습니다. 실제 주소로 이미 계정이"
                  + " 있으시다면 그것과는 다른 계정입니다."}
            </p>
          ) : null}

          <SocialSignupForm
            token={sp.t ?? ""}
            next={safeNext(sp.next, "/me")}
            items={items}
            labels={labels}
            submitLabel={L === "en" ? "Agree and start" : "동의하고 시작하기"}
          />

          <div className="foot-links">
            <Link href="/login">{L === "en" ? "Back to sign in" : "로그인으로 돌아가기"}</Link>
          </div>
        </div>
        <PublicFooter lang={L} compact />
      </div>
    </div>
  );
}
