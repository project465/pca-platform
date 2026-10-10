import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { query } from "@/lib/db";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { itemsFor } from "@/lib/me-v2/bank";
import { isTier } from "@/lib/me-v2/attempt";
import { isLegacyV2, resumePathFor } from "@/lib/engine-entry";
import { CmShell, CmHead } from "@/app/me/shell";
import OlderNote from "@/components/sf/older-note";

export const metadata = { title: `옛 검사 · ${BRAND.root}` };

const STATUS: Record<string, { ko: string }> = {
  scored: { ko: "채점 완료" },
  submitted: { ko: "제출됨" },
  in_progress: { ko: "응시 중" },
  ready: { ko: "시작 전" },
};

/** 응시 목록. **한 줄에 상태 하나**이고 지금 누를 것이 오른쪽에 있다. */
export default async function MyAssessments({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  /**
   * **검사가 두 벌이라 세는 자리도 두 벌이다.**
   *
   * ME_V2 는 `v2_responses` 에 쌓이고 몇 문항짜리인지는 **산 등급**이
   * 정한다(BASIC 48 · STANDARD 68 · PRO 92). 옛 검사(ME_V1)는
   * `responses` 에 쌓이고 검사지에 달린 문항 수가 전부다.
   *
   * 한동안 이 쪽이 옛 검사 쪽만 세고 있었다. 그래서 ME_V2 응시가
   * **`0 / 253`** 으로 나왔다: 답은 저쪽 표에 없고, 문항 수는 검사지에
   * 달린 253개를 읽었다. 끝낸 응시가 0 으로 보이는 것이 가장 나쁘다 —
   * 상태는 '채점 완료' 인데 진행이 0 이면 둘 중 하나는 거짓이다.
   */
  const rows = await query<{
    id: string; status: string; started: string | null; submitted: string | null;
    answered: number; total: number; track: string | null;
    version: string | null; tier: string | null;
  }>(
    `SELECT a.id, a.status,
            to_char(a.started_at, 'YYYY-MM-DD') AS started,
            to_char(a.submitted_at, 'YYYY-MM-DD') AS submitted,
            a.assessment_version AS version, a.tier,
            CASE WHEN a.assessment_version = 'ME_V2'
                 THEN (SELECT count(*) FROM v2_responses vr WHERE vr.attempt_id = a.id)::int
                 ELSE (SELECT count(*) FROM responses r WHERE r.attempt_id = a.id)::int
            END AS answered,
            (SELECT count(*) FROM questions qq WHERE qq.instrument_id = ts.instrument_id)::int AS total,
            (SELECT i.track_code FROM instruments i WHERE i.id = ts.instrument_id) AS track
       FROM attempts a JOIN test_sessions ts ON ts.id = a.session_id
      WHERE a.user_id = $1 ORDER BY a.id DESC`,
    [user.id],
  ).catch(() => []);

  return (
    <CmShell active="/my" title={T("acOld")}>
      {/* **여기서 검사를 시작하지 않는다.** `/test` 는 옛 검사를 여는
          자리이고 지금 파는 검사는 `/cores` 에서 시작한다 */}
      <CmHead kicker="계정" title={T("acOld")}
        lead="그보다 전에 보신 검사와 그때의 진행 상태입니다." />
      <OlderNote lang={L} />

      {rows.length ? (
        <div className="cm-tablewrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>검사</th><th>상태</th><th>진행</th><th>시작</th><th>제출</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = STATUS[r.status] ?? { ko: r.status };
                /* 판본 판단은 한 자리에서만 한다(`engine-entry.ts`) */
                const v2 = isLegacyV2(r.version);
                const tier = isTier(r.tier) ? r.tier : null;
                /* 몇 문항짜리인지는 산 등급이 정한다(설계 원칙 10의 사슬:
                   products.tier → entitlements.tier → attempts.tier) */
                const total = v2 ? (tier ? itemsFor(tier).length : 0) : r.total;
                /* **끝낸 응시는 다 푼 것이다.** 채점까지 끝났는데 진행이
                   모자라 보이면 둘 중 하나가 거짓이고, 읽는 사람은 자기
                   결과를 의심한다 */
                const done = r.status === "scored" || r.status === "submitted";
                const answered = done && total > 0 ? total : r.answered;
                return (
                  <tr key={r.id}>
                    <td>
                      <b>
                        {v2
                          ? `${BRAND.root}${tier ? ` ${tier}` : ""}`
                          : r.track === "HS" ? "고교 진로 진단" : "공학 진로 진단"}
                      </b>
                    </td>
                    <td>{s.ko}</td>
                    <td>{total > 0 ? `${answered} / ${total}` : "—"}</td>
                    <td>{r.started ?? "—"}</td>
                    <td>{r.submitted ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      {done ? (
                        <Link
                          href={v2 ? `/assessment/${r.id}/report` : `/report/${r.id}`}
                          className="cm-btn">
                          {T("myOpenReport")}
                        </Link>
                      ) : (
                        <Link href={v2
                          ? `/assessment/${r.id}`
                          : (resumePathFor("ME_V1") ?? "/my")}
                          className="cm-btn">{T("myContinue")}</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="cm-card is-empty is-wide">
          <h2>{T("acOldNone")}</h2>
          <p>{T("acOldNoneBody")}</p>
          <div className="cm-acts">
            <Link href="/cores" className="cm-btn is-primary">검사 시작하기</Link>
          </div>
        </section>
      )}
    </CmShell>
  );
}
