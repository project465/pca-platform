import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { homePathFor } from "@/lib/roles";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";

export const metadata = { title: "Careermetri" };

/**
 * 문 고르는 화면.
 *
 * 다섯 부류가 온다. 개인, 학교 소속 학생, 학과 교수, 인재개발원·대학일자리플러스
 * 담당자, 해외 대학 담당자. 뒤의 셋은 결국 같은 로그인으로 들어가지만, 화면에
 * 자기 이름이 없으면 사람은 자기가 맞게 온 것인지 모른다. 그래서 길은 셋이되
 * 문패는 다섯 개를 단다.
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

  const doors = [
    {
      key: "individual",
      // 개인은 **지금 파는 것**으로 보낸다. 가격표가 등급 셋과 들어 있는
      // 것을 먼저 보여 주고, 고른 뒤에 가입으로 간다. 로그인을 먼저
      // 요구하면 처음 온 사람은 거기서 나간다.
      //
      // 전자상거래법 제17조 제6항은 제공 개시 뒤 철회를 제한하려면 ①
      // 불가 사실 표시와 ② 시험 사용을 둘 다 하라고 한다. ME_V2 는 둘째
      // 대신 **첫 문항에 답하기 전까지 기간 제한 없이 환불**하는 쪽으로
      // 간다(법보다 넓게 준다). 그 문장이 가격표에 적혀 있다.
      //
      // 옛 검사의 무료 구간(`/free`)은 그대로 열려 있다. 길을 없애지
      // 않았고, 첫 문패가 가리키는 곳만 바뀌었다.
      href: "/pricing",
      title: t("doorIndividual", lang),
      note: t("doorIndividualNote", lang),
      primary: true,
    },
    { key: "student", href: "/login", title: t("doorStudent", lang), note: t("doorStudentNote", lang) },
    { key: "professor", href: "/login", title: t("doorProfessor", lang), note: t("doorProfessorNote", lang) },
    { key: "center", href: "/login", title: t("doorCenter", lang), note: t("doorCenterNote", lang) },
    { key: "intl", href: "/login", title: t("doorIntl", lang), note: t("doorIntlNote", lang) },
  ];

  return (
    <div className="door">
      <header className="door-bar">
        <span className="brand">{t("brand", lang)}</span>
        <LangSwitch current={lang} />
      </header>

      <main className="door-main">
        <h1>{t("doorTitle", lang)}</h1>
        <p className="door-sub">{t("doorSub", lang)}</p>

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
          {t("doorHasAccount", lang)} <Link href="/login">{t("signIn", lang)}</Link>
        </p>
      </main>
    </div>
  );
}
