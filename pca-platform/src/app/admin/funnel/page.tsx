import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { funnelReport, STEP_LABEL } from "@/lib/funnel";
import { summary as pilotSummary, MIN_CELL } from "@/lib/pilot";
import { Funnel } from "@/components/sf/parts";

export const metadata = { title: "퍼널 · CareerMatri" };
export const dynamic = "force-dynamic";

/**
 * 상용 퍼널.
 *
 * 방문이 결제가 되는 비율을 본다. **표는 처음부터 있었고 적는 코드가
 * 없었다**: 그래서 지금까지 "몇 명이 가격표를 보고 몇 명이 샀는가" 에
 * 답할 수 없었다.
 *
 * **사람으로 센다, 사건으로 세지 않는다.** 가격표를 다섯 번 새로 고친
 * 사람이 다섯 명으로 세어지면 전환율이 바닥으로 보인다.
 *
 * **나눌 바닥이 0 이면 비율을 만들지 않는다.** 아무도 안 왔는데 0% 를
 * 찍으면 거짓말이다(기관 집계와 같은 규칙).
 */
export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;
  const days = Math.max(1, Math.min(365, Number(sp.days ?? 30) || 30));
  const r = await funnelReport(days);
  const pil = await pilotSummary();

  return (
    <AdminShell user={user} current="/admin/funnel">
      <h1>퍼널</h1>
      <p className="sub">최근 {r.days}일. 같은 사람이 여러 번 눌러도 한 번으로 셉니다.</p>

      {r.empty ? (
        <section className="panel">
          <h2>아직 쌓인 것이 없습니다</h2>
          <p className="sub">
            상품 쪽과 가격표를 아무도 열지 않았거나, 켠 뒤로 아직 사람이
            오지 않았습니다. 숫자를 지어내지 않습니다.
          </p>
        </section>
      ) : (
        <>
          <section className="panel" style={{ marginBottom: 20 }}>
            <h2>방문에서 PDF 까지</h2>
            <Funnel steps={r.steps.map((s) => ({
              label: STEP_LABEL[s.step].ko, value: s.people,
            }))} />
          </section>

          <section className="panel">
            <h2>비율</h2>
            <div className="sf-tw">
              <table className="sf-table">
                <thead><tr><th>무엇</th><th className="num">비율</th><th>한 줄</th></tr></thead>
                <tbody>
                  {r.ratios.map((x) => (
                    <tr key={x.label}>
                      <td className="sf-strong">{x.label}</td>
                      <td className="num">
                        {x.value === null ? "—" : `${Math.round(x.value * 1000) / 10}%`}
                      </td>
                      <td>{x.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* 파일럿. **만족도 하나만 재지 않는다**(규격 §20) */}
      <section className="panel" style={{ marginTop: 20 }}>
        <h2>파일럿 {pil.people} / {pil.target}명</h2>
        <p className="sub">
          끝내는 데 걸린 시간 가운데값{" "}
          {pil.medianMinutes === null ? "아직 없음" : `${pil.medianMinutes}분`}
          {" · "}시작했고 안 끝낸 사람 {pil.abandoned}명
          {pil.ofCompleted === null ? "" :
            ` · 끝낸 사람 가운데 ${Math.round(pil.ofCompleted * 100)}% 가 답했습니다`}
        </p>
        <div className="sf-tw">
          <table className="sf-table">
            <thead>
              <tr><th>물음</th><th className="num">답한 사람</th><th className="num">평균</th></tr>
            </thead>
            <tbody>
              {pil.scales.map((x) => (
                <tr key={x.code}>
                  <td>{x.text}</td>
                  <td className="num">{x.n}</td>
                  {/* **{MIN_CELL}명 미만은 숫자를 내지 않는다.** 네 사람의
                      평균은 사람을 가리킨다(기관 집계와 같은 규칙) */}
                  <td className="num">{x.avg ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sub" style={{ marginTop: 12 }}>
          자유입력은 {MIN_CELL}명이 넘을 때만 내놓습니다.
          {" "}
          {pil.texts.filter((t) => t.answers.length).length}개 물음이 그 선을
          넘었습니다.
        </p>
      </section>
    </AdminShell>
  );
}
