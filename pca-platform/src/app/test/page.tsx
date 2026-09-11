import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { openAttempt, PAGE_SIZE } from "@/lib/attempts";
import { queryOne } from "@/lib/db";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";

export const metadata = { title: "검사 시작 — METRI" };

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
    return (
      <div className="center-wrap">
        <div className="panel narrow">
          <h1>{t("noSeatTitle", lang)}</h1>
          <p className="sub">{t("noSeatBody", lang)}</p>
          <Link className="act solid" href="/checkout?product=REPORT_UNIV">
            {t("startAsIndividual", lang)}
          </Link>
        </div>
      </div>
    );
  }
  if (attempt.status === "scored") redirect(`/report/${attempt.id}`);

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
        <h1>{t("testTitle", lang)}</h1>
        <p className="sub">
          {t("testMeta", lang, {
            n: inst?.item_count ?? attempt.total,
            m: inst?.est_minutes ?? 30,
          })}
        </p>
        <ul className="brief">
          <li>{t("testBrief1", lang)}</li>
          <li>{t("testBrief2", lang)}</li>
          <li>{t("testBrief3", lang)}</li>
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
