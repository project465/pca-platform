import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { SERVICE_LABEL, pushStats } from "@/lib/push-stats";

export const metadata = { title: "알림 켠 사람 · CareerMatri" };
export const dynamic = "force-dynamic";

/**
 * 알림을 켠 사람 수(2026-10-31).
 *
 * 스토어 앱을 만들지 정하는 자리다. 아이폰은 `홈 화면에 추가` 를 해야 알림을
 * 켤 수 있으므로, 애플 알림이 구글 알림보다 확연히 적으면 앱으로 감쌀 때다.
 *
 * **바닥이 0 이면 비율을 만들지 않는다**(퍼널과 같은 규칙).
 */
export default async function PushPage() {
  const user = await requireRole(["superadmin"]);
  const s = await pushStats();
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "—");
  const apple = s.byService.find((x) => x.service === "apple")?.people ?? 0;
  const google = s.byService.find((x) => x.service === "google")?.people ?? 0;

  return (
    <AdminShell user={user} current="/admin/push">
      <h1>알림 켠 사람</h1>
      <p className="sub">
        MAT 할 일과 공고 마감 알림을 켠 사람입니다. 한 사람이 휴대폰과 PC 에서 켜면 사람은 하나,
        기기는 둘로 셉니다. 시연 계정은 뺐습니다.
      </p>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>지금 알림이 나가는가</h2>
        <p className="sub" style={{ fontWeight: 600 }}>{s.state.on ? "켜짐" : "꺼짐"} · {s.state.why}</p>
      </section>

      {s.error ? (
        <section className="panel">
          <h2>읽지 못했습니다</h2>
          <p className="sub">알림 표를 읽다가 멈췄습니다. Railway 에서 npm run db:upgrade 를 돌렸는지 확인해 주세요.</p>
          <p className="sub">{s.error}</p>
        </section>
      ) : (
        <>
          <section className="panel" style={{ marginBottom: 20 }}>
            <h2>한눈에</h2>
            <div className="sf-tw">
              <table className="sf-table">
                <tbody>
                  <tr><td className="sf-strong">알림 켠 사람</td><td className="num">{s.people}명</td>
                    <td>개인 회원 {s.members}명 가운데 {pct(s.people, s.members)}</td></tr>
                  <tr><td className="sf-strong">알림 켠 기기</td><td className="num">{s.devices}대</td><td /></tr>
                  <tr><td className="sf-strong">최근 7일에 새로 켠 사람</td><td className="num">{s.new7}명</td><td /></tr>
                  <tr><td className="sf-strong">전달이 실패하고 있는 기기</td><td className="num">{s.failing}대</td>
                    <td>기기에서 알림을 끄면 다음 발송 때 저절로 지워집니다</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel" style={{ marginBottom: 20 }}>
            <h2>어느 기기에서 켰나</h2>
            <p className="sub">
              알림 주소의 앞부분(어느 회사의 알림 서버인가)으로만 가릅니다. 기기 이름이나 브라우저 종류는
              모으지 않기로 개인정보처리방침에 적었기 때문입니다. 그래서 애플 쪽에는 맥 사파리가,
              구글 쪽에는 PC 크롬이 함께 들어 있습니다. 한 사람이 아이폰과 PC 크롬에서 모두 켜면 양쪽에
              다 세어지므로 비율을 더하면 100% 를 넘을 수 있습니다.
            </p>
            {s.byService.length ? (
              <div className="sf-tw">
                <table className="sf-table">
                  <thead><tr><th>알림 서버</th><th>이런 기기</th><th className="num">사람</th><th className="num">기기</th><th className="num">비율(사람)</th></tr></thead>
                  <tbody>
                    {s.byService.map((r) => (
                      <tr key={r.service}>
                        <td className="sf-strong">{SERVICE_LABEL[r.service].name}</td>
                        <td>{SERVICE_LABEL[r.service].note}</td>
                        <td className="num">{r.people}</td>
                        <td className="num">{r.devices}</td>
                        <td className="num">{pct(r.people, s.people)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="sub">아직 알림을 켠 사람이 없습니다. 숫자를 지어내지 않습니다.</p>
            )}
            {apple + google > 0 ? (
              <p className="sub" style={{ marginTop: 12 }}>
                애플 {apple}명 · 구글 {google}명. 아이폰은 홈 화면에 추가해야 알림을 켤 수 있어서 애플 쪽이
                확연히 적게 나오면 스토어 앱으로 감쌀 때입니다.
              </p>
            ) : null}
          </section>

          <section className="panel">
            <h2>주별로 새로 켠 사람 (최근 8주)</h2>
            {s.weeks.length ? (
              <div className="sf-tw">
                <table className="sf-table">
                  <thead><tr><th>주 시작일</th><th className="num">애플</th><th className="num">구글</th><th className="num">그 밖</th></tr></thead>
                  <tbody>
                    {s.weeks.map((w) => (
                      <tr key={w.week}>
                        <td>{w.week}</td><td className="num">{w.apple}</td><td className="num">{w.google}</td><td className="num">{w.other}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="sub">최근 8주에 새로 켠 사람이 없습니다.</p>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
