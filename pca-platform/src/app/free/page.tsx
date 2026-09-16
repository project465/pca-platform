import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { t, UI, type UiKey } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import FreeForm from "./free-form";
import { TRACKS, resolveTrack } from "./tracks";

/** 브랜드가 둘이라 제목도 둘이다. 커리어메트리 플러스로 온 학부모에게 Careermetri 를
 *  띄우지 않는다(설계 원칙 9). */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track } = await searchParams;
  return { title: `무료 진단 — ${TRACKS[resolveTrack(track)].brand}` };
}

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
    searchParams: Promise<{ lang?: string; track?: string }>;
}) {
  const { lang: q, track: rawTrack } = await searchParams;
  const lang = await resolveLang(q);
  /**
   * 고교판과 대학판이 같은 문을 쓴다. 구조가 같기 때문이다 — 문항을 무료로
   * 열고 지표까지 보여준 뒤 나머지를 판다. 문구만 갈린다.
   */
  const track = resolveTrack(rawTrack);
  const univ = track === "univ";
  const tt = (key: UiKey) =>
    univ && `${key}Univ` in UI ? t(`${key}Univ` as UiKey, lang) : t(key, lang);

  // 결제 화면과 같은 이유로 로그인 폼으로 막지 않는다 — 처음 온 사람은
  // 계정이 없다. 가입이 끝나면 이 화면으로 돌아온다.
    const user = await currentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/free?track=${track}`)}`);
  if (user.mustResetPw) redirect("/password/change");

  return (
    <main className="main">
      <div className="paywrap">
        <div className="panel-top">
          <LangSwitch current={lang} />
        </div>
                <h1>{tt("freeTitle")}</h1>
        <p className="paylead">{tt("freeSub")}</p>

        <div className="freesplit">
          <section>
            <h2>{t("freeIncHead", lang)}</h2>
            <ul className="freeyes">
                            <li>{tt("freeInc1")}</li>
              <li>{t("freeInc2", lang)}</li>
              <li>{t("freeInc3", lang)}</li>
            </ul>
          </section>
          <section>
            <h2>{t("freeExcHead", lang)}</h2>
            <ul className="freeno">
                            <li>{tt("freeExc1")}</li>
              <li>{tt("freeExc2")}</li>
            </ul>
          </section>
        </div>

                <FreeForm lang={lang} track={track} />

        <ul className="paynote">
          <li>{t("freeOnce", lang)}</li>
          <li>{t("freeSchool", lang)}</li>
        </ul>

      </div>
    </main>
  );
}
