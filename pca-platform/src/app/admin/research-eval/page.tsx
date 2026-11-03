import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { INVENTED_MAX, MIN_DOCS, MIN_EN, evalReport, type PartStat } from "@/lib/assistant/research-eval";
import { DOC_TYPE_KO, type DocType } from "@/lib/assistant/research-docs";

export const metadata = { title: "논문 읽기 채점표 · CareerMatri" };
export const dynamic = "force-dynamic";

/**
 * 논문 읽기 채점표(2026-10-31). "석·박사가 MAT 으로 충분히 도움을 받는가" 를
 * 숫자로 답하는 자리다. 자료를 쓴 본인이 `/me/track/research` 에서 누른 칸을 센다.
 *
 * **합격선은 자료보다 먼저 적었다**(`research-eval.ts`). **열 건이 안 되면 판정하지
 * 않는다.** **자료 제목을 보이지 않는다**: 논문 제목만으로 사람이 특정된다.
 */
const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 1000) / 10}%`);
const STATUS = { pass: "합격", fail: "불합격", wait: "판정 전" } as const;

export default async function ResearchEvalPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;
  const r = await evalReport({ demo: sp.demo === "1" });
  const row = (p: PartStat) => (
    <tr key={p.key}>
      <td className="sf-strong">{p.label}</td>
      <td className="num">{p.n}</td>
      <td className="num">{p.right} · {p.partly} · {p.wrong}</td>
      <td className="num">{pct(p.rate)}</td>
      <td className="num">{pct(p.pass)} 이상</td>
      <td>{STATUS[p.status]}</td>
    </tr>
  );

  return (
    <AdminShell user={user} current="/admin/research-eval">
      <h1>논문 읽기 채점표</h1>
      <p className="sub">
        MAT 이 논문·발표 자료·이력서를 바르게 읽는지, 자료를 쓴 본인이 칸마다 누른 값을 셉니다.
        채점된 자료가 {MIN_DOCS}건이 되기 전에는 판정하지 않습니다. 자료 제목은 보이지 않습니다.
        {sp.demo === "1" ? " 시연 계정을 섞어서 셉니다." : " 시연 계정은 뺐습니다."}
      </p>

      {r.error ? (
        <section className="panel">
          <h2>읽지 못했습니다</h2>
          <p className="sub">채점표를 읽다가 멈췄습니다. Railway 에서 npm run db:upgrade 를 돌렸는지 확인해 주세요.</p>
          <p className="sub">{r.error}</p>
        </section>
      ) : (
        <>
          <section className="panel" style={{ marginBottom: 20 }}>
            <h2>한눈에</h2>
            <p className="sub" style={{ fontWeight: 600 }}>
              {r.verdict === "pass" ? "합격 · 모든 칸이 합격선을 넘었습니다"
                : r.verdict === "fail" ? "불합격 · 합격선에 못 미친 칸이 있습니다"
                : `판정 전 · 채점된 자료 ${r.graded}건 / ${MIN_DOCS}건`}
            </p>
            <div className="sf-tw">
              <table className="sf-table">
                <tbody>
                  <tr><td className="sf-strong">읽은 자료</td><td className="num">{r.docs}건</td><td /></tr>
                  <tr><td className="sf-strong">채점된 자료</td><td className="num">{r.graded}건</td>
                    <td>한 칸이라도 누른 자료</td></tr>
                  <tr><td className="sf-strong">그 가운데 영어 자료</td><td className="num">{r.gradedEn}건</td>
                    <td>{r.gradedEn < MIN_EN ? `${MIN_EN}건이 안 되어 영어 논문에 대해서는 말할 수 없습니다` : "영어 논문도 판정에 들어갑니다"}</td></tr>
                  <tr><td className="sf-strong">지어낸 곳이 있다는 자료</td><td className="num">{r.invented.yes} / {r.invented.n}</td>
                    <td>{pct(r.invented.rate)} · {pct(INVENTED_MAX)} 이하여야 합격 · {STATUS[r.invented.status]}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel" style={{ marginBottom: 20 }}>
            <h2>칸마다</h2>
            <p className="sub">맞음 · 일부 · 틀림을 센 뒤 맞음만 맞은 비율로 셉니다. 일부는 맞은 것으로 치지 않습니다.</p>
            <div className="sf-tw">
              <table className="sf-table">
                <thead><tr><th>칸</th><th className="num">채점</th><th className="num">맞음 · 일부 · 틀림</th>
                  <th className="num">맞은 비율</th><th className="num">합격선</th><th>판정</th></tr></thead>
                <tbody>{r.parts.map(row)}</tbody>
              </table>
            </div>
          </section>

          <section className="panel" style={{ marginBottom: 20 }}>
            <h2>근거 위치가 붙은 결과</h2>
            <p className="sub">
              사람 채점 없이 셉니다. MAT 이 적은 핵심 결과 {r.located.lines}줄 가운데 그림·표·쪽 같은 위치가
              붙은 줄이 {r.located.withPlace}줄({pct(r.located.rate)})입니다. 위치가 맞는지는 위의
              &lsquo;핵심 결과와 근거 위치&rsquo; 칸이 봅니다.
            </p>
          </section>

          <section className="panel">
            <h2>어떤 자료를 읽었나</h2>
            {r.byType.length ? (
              <div className="sf-tw">
                <table className="sf-table">
                  <thead><tr><th>종류</th><th>언어</th><th className="num">건수</th></tr></thead>
                  <tbody>
                    {r.byType.map((t) => (
                      <tr key={`${t.doc_type}-${t.lang}`}>
                        <td>{DOC_TYPE_KO[t.doc_type as DocType] ?? t.doc_type}</td>
                        <td>{t.lang === "en" ? "영어" : t.lang === "ko" ? "한국어" : "그 밖"}</td>
                        <td className="num">{t.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="sub">아직 읽은 자료가 없습니다.</p>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
