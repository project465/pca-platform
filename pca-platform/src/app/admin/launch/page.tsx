import Link from "next/link";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { launchReport, type Status } from "@/lib/launch";
import { Pill } from "@/components/sf/parts";

export const metadata = { title: "런칭 준비 · 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

/**
 * 런칭 준비 화면.
 *
 * `npm run launch:check` 와 **같은 함수**를 부른다(`src/lib/launch.ts`).
 * 두 곳에서 따로 세면 숫자가 갈리고, 갈리는 순간 둘 다 못 믿는다.
 *
 * **시장을 나란히 둔다.** 한국은 켤 수 있고 글로벌은 아닌 상태가 정상인
 * 순서다(규격 §1). 한 줄로 합치면 한국 런칭이 글로벌 블로커에 막힌다.
 *
 * **여는 것만으로 아무것도 바꾸지 않는다.**
 */
const TONE: Record<Status, "ok" | "part" | "warn"> = {
  READY: "ok", WARNING: "part", BLOCKED: "warn",
};

export default async function LaunchPage() {
  const user = await requireRole(["superadmin"]);
  const r = await launchReport();

  return (
    <AdminShell user={user} current="/admin/launch">
      <h1>런칭 준비</h1>
      <p className="sub">
        터미널의 <code>npm run launch:check</code> 와 같은 값을 읽습니다.
        {" "}{r.checkedAt} 기준이고, 여는 것만으로 아무것도 바꾸지 않습니다.
      </p>

      {/* 갈래 묶음을 맨 위에 둔다. **누가 고칠지가 갈래로 갈린다** */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>갈래별</h2>
        <div className="sf-tw">
          <table className="sf-table">
            <thead>
              <tr><th>갈래</th><th>상태</th><th>막혀 있는 자리</th></tr>
            </thead>
            <tbody>
              {r.areas.map((a) => (
                <tr key={a.area}>
                  <td className="sf-strong">
                    {a.label}
                    <div className="sf-meta">{a.area}</div>
                  </td>
                  <td><Pill tone={TONE[a.status]}>{a.status}</Pill></td>
                  <td>{a.blocked.join(" · ") || "없습니다"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {r.markets.map((m) => {
        const blocked = m.rows.filter((x) => x.status === "BLOCKED");
        return (
          <section key={m.market} className="panel" style={{ marginBottom: 20 }}>
            <h2>
              {m.market} · <Pill tone={TONE[m.status]}>{m.status}</Pill>
              {m.domain ? <span className="sub"> {m.domain}</span> : null}
            </h2>

            {/* 막는 것을 먼저 센다. 이 화면을 여는 이유가 그것이다 */}
            <p className="sub">
              {blocked.length
                ? `지금 켜면 사고가 나는 자리 ${blocked.length}가지: ` +
                  blocked.map((x) => x.label).join(" · ")
                : "켜는 것을 막는 자리는 없습니다."}
            </p>

            <div className="sf-tw">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>갈래</th>
                    <th>상태</th>
                    <th>무엇이 남았는가</th>
                    <th>누가 정하는가</th>
                  </tr>
                </thead>
                <tbody>
                  {m.rows.map((x) => (
                    <tr key={`${m.market}-${x.key}`}>
                      <td className="sf-strong">{x.label}</td>
                      <td className="sf-meta">{x.area}</td>
                      <td><Pill tone={TONE[x.status]}>{x.status}</Pill></td>
                      <td>{x.detail}</td>
                      {/* **'개발' 이 아니다.** 우리가 끝낼 수 있는 것은 이
                          칸이 비고, 그러면 그것은 우리 일이다 */}
                      <td>{x.who ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section className="panel">
        <h2>옆에 있는 화면</h2>
        <p className="sub">
          <Link href="/admin/readiness">상용화 준비</Link>
          {" · "}
          <Link href="/admin/localization">지역화 덮임</Link>
          {" · "}
          <Link href="/admin/incidents">사고</Link>
          {" · "}
          <Link href="/admin/refunds">환불 요청</Link>
          {" · "}
          <Link href="/admin/funnel">퍼널</Link>
        </p>
      </section>
    </AdminShell>
  );
}
