import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole, currentUser } from "@/lib/session";
import { openAttempt, pendingTrack, lastScoredAttempt, PAGE_SIZE } from "@/lib/attempts";
import { queryOne } from "@/lib/db";
import { t, UI, type UiKey } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";

/**
 * 제목은 응시자가 무엇을 사서 왔는지에 따라 갈린다. 고교판 응시자에게
 * "METRI" 를 띄우면 메트리 플러스로 들어온 사람이 다른 회사에 온 줄 안다
 * (설계 원칙 9 — 두 브랜드는 서로를 설명하지 않는다).
 */
export async function generateMetadata() {
    const user = await currentUser();
  const track = user ? await pendingTrack(user.id) : null;
  return { title: track === "HS" ? "검사 시작 — 메트리 플러스" : "검사 시작 — METRI" };
}

export default async function TestEntry({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);
    const attempt = await openAttempt(user.id);

  if (!attempt) {
    // 다 풀고 채점까지 끝난 사람이면 결제 안내가 아니라 결과지로 보낸다.
    const done = await lastScoredAttempt(user.id);
    if (done) redirect(`/report/${done}`);
    /**
     * 좌석이 없는 사람에게 무엇을 권하는가.
     *
     * 여기까지 온 고교 응시자에게 29,000원짜리 대학 상품을 내밀면 안 된다.
     * 무료 문(`/free`)이 그 사람이 갈 곳이다. 대학 쪽은 그대로 결제로 간다.
     */
        const fromPlus = (await pendingTrack(user.id)) === "HS";
    return (
      <div className="center-wrap">
        <div className="panel narrow">
          <h1>{t("noSeatTitle", lang)}</h1>
          <p className="sub">{t(fromPlus ? "noSeatBodyHs" : "noSeatBody", lang)}</p>
          <Link className="act solid" href={fromPlus ? "/free" : "/checkout?product=REPORT_UNIV"}>
            {t(fromPlus ? "startFree" : "startAsIndividual", lang)}
          </Link>
        </div>
      </div>
    );
  }

  // 고교판이면 "Hs" 가 붙은 문구를 고른다. 결과지와 같은 방식이다.
  const hs = attempt.trackCode === "HS";
  const tt = (key: UiKey, vars?: Record<string, string | number>) =>
    hs && `${key}Hs` in UI ? t(`${key}Hs` as UiKey, lang, vars) : t(key, lang, vars);
  const inst = await queryOne<{ item_count: number; est_minutes: number }>(
    `SELECT item_count, est_minutes FROM instruments WHERE id = $1`,
    [attempt.instrumentId],
  );
  const page = Math.floor((attempt.resumeOrderNo - 1) / PAGE_SIZE) + 1;

  return (
    <div className="center-wrap">
      <div className="panel narrow">
        <div className="panel-top">
          <LangSwitch current={lang} />
        </div>
                <h1>{tt("testTitle")}</h1>
        <p className="sub">
          {t("testMeta", lang, {
            n: inst?.item_count ?? attempt.total,
            m: inst?.est_minutes ?? 30,
          })}
        </p>
                <ul className="brief">
          <li>{t("testBrief1", lang)}</li>
          <li>{t("testBrief2", lang)}</li>
          <li>{tt("testBrief3")}</li>
        </ul>
        <Link className="act solid" href={`/test/${attempt.id}?p=${page}`}>
          {attempt.answered > 0
            ? t("testResume", lang, { n: attempt.resumeOrderNo })
            : t("testStart", lang)}
        </Link>
      </div>
    </div>
  );
}
