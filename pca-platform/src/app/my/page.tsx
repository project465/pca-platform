import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { requireRole } from "@/lib/session";
import { query, queryOne } from "@/lib/db";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";

export const metadata = { title: "내 검사 — METRI" };

/**
 * 학생의 첫 화면. 지금 눌러야 할 것 하나를 맨 위에 둔다 —
 * 응시 전이면 검사, 응시 후면 결과지, 결과지를 봤으면 증거 채우기.
 */
export default async function StudentHome({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);

  const attempts = await query<{ id: string; status: string; scored_at: string | null }>(
    `SELECT id, status, scored_at FROM attempts WHERE user_id = $1 ORDER BY id DESC`,
    [user.id],
  );
  const scored = attempts.find((a) => a.status === "scored");
  const open = attempts.find((a) => a.status !== "scored");

  const seatFree = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seats s
      WHERE s.user_id = $1 AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.seat_id = s.id)`,
    [user.id],
  );
  const evidence = await queryOne<{ n: number }>(
    `SELECT count(DISTINCT competency_id)::int AS n FROM learner_evidence WHERE user_id = $1`,
    [user.id],
  );

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">{t("brand", lang)}</span>
        <div className="who">
          <LangSwitch current={lang} />
          <Link href="/my/account">{t("erAccount", lang)}</Link>
          <span>{user.name}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="main">
        {!scored && !open && (seatFree?.n ?? 0) === 0 ? (
          <div className="empty">
            <b>{t("noSeatTitle", lang)}</b>
            {t("noSeatBody", lang)}
            <Link className="act solid" href="/checkout?product=REPORT_UNIV">
              {t("startAsIndividual", lang)}
            </Link>
          </div>
        ) : (
          <ul className="tasklist">
            {(open || (seatFree?.n ?? 0) > 0) && (
              <li>
                <b>{t("testTitle", lang)}</b>
                <span>{open ? t("testBrief2", lang) : t("testBrief1", lang)}</span>
                <Link className="act solid" href="/test">
                  {open ? t("testResume", lang, { n: "" }).trim() : t("testStart", lang)}
                </Link>
              </li>
            )}
            {scored && (
              <li>
                <b>{t("repTitle", lang)}</b>
                <span>{t("repLead", lang)}</span>
                <Link className="act solid" href={`/report/${scored.id}`}>
                  {t("repTitle", lang)}
                </Link>
              </li>
            )}
            {scored && (
              <li>
                <b>{t("evTitle", lang)}</b>
                <span>
                  {(evidence?.n ?? 0) > 0
                    ? t("evCount", lang, { n: evidence!.n })
                    : t("repNoEvidence", lang)}
                </span>
                <Link className="act" href="/evidence">
                  {t("evOpen", lang)}
                </Link>
              </li>
            )}
          </ul>
        )}
      </main>
    </div>
  );
}
