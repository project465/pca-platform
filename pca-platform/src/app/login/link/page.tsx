import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { BRAND, toLang2 } from "@/lib/surface-text";
import { isProvider, PROVIDER_LABEL } from "@/lib/auth-accounts";
import AuthBrand from "@/components/auth-brand";
import PublicFooter from "@/components/sf/public-footer";

export const metadata = { title: "계정 연결 · CareerMatri" };

/**
 * 같은 주소의 계정이 **이미 있을 때.**
 *
 * 이 쪽이 있는 까닭이 이번 작업에서 가장 중요한 결정이다. 구글이 준
 * 주소와 같은 주소로 이미 계정이 있을 때, 그냥 합쳐서 들여보내면 편하다.
 * 그런데 그러면 **남의 주소를 공급자에 등록한 사람이 남의 계정을
 * 가져간다.** 구글이 확인해 준 것은 "이 구글 계정의 주인" 이지 "그
 * 주소로 만든 CareerMatri 계정의 주인" 이 아니다.
 *
 * 그래서 멈추고, **그 계정으로 들어와서** 연결하게 한다. 비밀번호를
 * 아는 것이 소유를 증명하는 유일한 길이다.
 *
 * **어느 주소인지 화면에 적지 않는다.** 주소를 적으면 아무 구글 계정으로
 * 눌러 보는 것만으로 "그 주소로 가입한 사람이 있다" 를 알아낼 수 있다.
 * 알려 드릴 분은 이미 그 주소를 알고 계신다.
 */
export default async function LinkPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  if (await currentUser()) redirect("/my");

  const sp = await searchParams;
  const pv = (sp.p ?? "").trim();
  const who = isProvider(pv) ? PROVIDER_LABEL[pv] : "소셜";
  const L = toLang2(await resolveLang());

  return (
    <main className="center-wrap">
      <div className="authwrap">
        <AuthBrand name={BRAND.root} />
        <div className="panel narrow">
          <h1>{L === "en" ? "This email already has an account" : "이미 계정이 있습니다"}</h1>
          <p className="sub">
            {L === "en"
              ? `The email ${who} gave us already belongs to a CareerMatri account.`
                + " We do not merge two accounts on a matching email alone, because"
                + " that would let anyone who registers your address elsewhere take"
                + " your account."
              : `${who} 가 알려 준 이메일로 만들어진 CareerMatri 계정이 이미 있습니다.`
                + " 이메일이 같다는 것만으로 두 계정을 합치지는 않습니다."
                + " 합치면 그 주소를 다른 곳에 등록한 사람이 남의 계정을"
                + " 가져갈 수 있기 때문입니다."}
          </p>

          <ol className="pdsteps" style={{ marginTop: 18 }}>
            <li>
              {L === "en"
                ? "Sign in with the password you already use."
                : "쓰시던 비밀번호로 로그인하십시오."}
            </li>
            <li>
              {L === "en"
                ? `In your account page, connect ${who}.`
                : `계정 화면에서 ${who} 를 연결하십시오.`}
            </li>
            <li>
              {L === "en"
                ? `After that, ${who} signs you into the same account.`
                : `그 다음부터는 ${who} 로도 같은 계정으로 들어오십니다.`}
            </li>
          </ol>

          <div className="pdcta" style={{ marginTop: 20 }}>
            <Link href="/login?next=%2Fmy" className="sf-btn accent">
              {L === "en" ? "Sign in with a password" : "비밀번호로 로그인"}
            </Link>
            <Link href="/password/forgot" className="sf-btn ghost">
              {L === "en" ? "I forgot it" : "비밀번호를 잊었습니다"}
            </Link>
          </div>

          <p className="sub" style={{ marginTop: 18 }}>
            {L === "en"
              ? "If you never made that account, tell us and we will look into it."
              : "그런 계정을 만드신 적이 없다면 알려 주십시오. 저희가 확인합니다."}
            {" "}
            <Link href="/support">{L === "en" ? "Support" : "고객지원"}</Link>
          </p>
        </div>
        <PublicFooter lang={L} compact />
      </div>
    </main>
  );
}
