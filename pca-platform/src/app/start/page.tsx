import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { homePathFor } from "@/lib/roles";
import { resolveLang } from "@/lib/locale-server";
import { toLang2 } from "@/lib/surface-text";
import { START } from "@/lib/start-copy";
import BrandHome from "@/components/sf/brand-home";
import PublicFooter from "@/components/sf/public-footer";
import LangSwitch from "@/components/lang-switch";

export const metadata = { title: "CareerMatri" };

/**
 * 공개 홈. 로그인하지 않은 사람이 처음 닿는 자리다.
 *
 * **갈리는 길은 둘이다.** 개인은 가격표로 가서 등급을 고르고 바로
 * 응시로 들어가고, 대학·기관은 계약으로 받은 계정으로 Campus 에
 * 들어온다. 옛 판은 문패가 다섯이었는데(교수 · 인재개발원 ·
 * 대학일자리플러스 · 해외 대학 담당자까지) 그 넷이 전부 같은 로그인으로
 * 들어가서, 고르는 사람만 다섯 번 재고 길은 하나였다.
 *
 * 원고와 지운 내력은 `src/lib/start-copy.ts` 에 적어 뒀다.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await currentUser();
  if (user) redirect(homePathFor(user.role));

  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);
  const L = toLang2(lang);

  const doors = [
    {
      key: "individual",
      /* 개인은 **지금 파는 것**으로 보낸다. 가격표가 등급 셋과 들어 있는
         것을 먼저 보여 주고, 고른 뒤에 가입으로 간다. 로그인을 먼저
         요구하면 처음 온 사람은 거기서 나간다.

         옛 검사의 무료 구간(`/free`)은 그대로 열려 있다. 길을 없애지
         않았고, 첫 문패가 가리키는 곳만 바뀌었다. */
      href: "/pricing",
      title: START.individual[L],
      note: START.individualNote[L],
      primary: true,
    },
    {
      key: "campus",
      /* 기관 화면은 계약이 먼저다. 공개 가입이 없으므로 문패가 가리키는
         곳은 로그인이고, 받은 계정으로 들어오면 Campus 가 열린다 */
      href: "/login",
      title: START.campus[L],
      note: START.campusNote[L],
    },
  ];

  return (
    <div className="door">
      <header className="door-bar">
        <BrandHome />
        <LangSwitch current={lang} />
      </header>

      <main className="door-main">
        <h1>{START.title[L]}</h1>
        <p className="door-sub">{START.sub[L]}</p>

        <ul className="doors">
          {doors.map((dr) => (
            <li key={dr.key}>
              <Link href={dr.href} className={`door-card${dr.primary ? " primary" : ""}`}>
                <b>{dr.title}</b>
                <span>{dr.note}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="door-foot">
          {START.hasAccount[L]} <Link href="/login">{START.signIn[L]}</Link>
          {" · "}
          <Link href="/product">{START.about[L]}</Link>
        </p>
      </main>

      <PublicFooter lang={L} />
    </div>
  );
}
