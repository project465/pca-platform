import Link from "next/link";
import { requireRole } from "@/lib/session";
import { packList } from "@/lib/pack";
import { namesOf } from "@/lib/i18n";
import AdminShell from "@/components/admin-shell";

export const metadata = { title: "기관 이용권 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/**
 * 기관이 선불로 사둔 멘토링 이용권.
 *
 * 남은 장수를 크게 보여준다. 떨어지면 그 학과 학생들은 본인 결제로 넘어가고,
 * 그건 학생이 할 수 있는 일이 아니다 — 운영사가 먼저 알고 연락해야 한다.
 */
export default async function PacksPage() {
  const user = await requireRole(["superadmin"]);
  const rows = await packList();
  const names = await namesOf("organizations", [...new Set(rows.map((r) => r.org_id))], user.locale);

  const live = rows.filter((r) => r.status === "active" && !r.expired);
  const remain = live.reduce((a, r) => a + r.remain, 0);
  /** 남은 장이 다섯 이하인 묶음. 여기서 놓치면 학생이 결제창을 보게 된다 */
  const lowPacks = live.filter((r) => r.remain > 0 && r.remain <= 5);
  const emptyPacks = live.filter((r) => r.remain === 0);

  return (
    <AdminShell user={user} current="/admin/mentoring-packs">
      <div className="page-head">
        <h1>기관 이용권</h1>
        <span className="count">{rows.length}건</span>
        <div className="right">
          <Link className="act solid" href="/admin/mentoring-packs/new">
            이용권 발급
          </Link>
        </div>
      </div>

      <dl className="stat-row">
        <div>
          <dt>쓸 수 있는 남은 장</dt>
          <dd>{remain.toLocaleString("ko-KR")}장</dd>
        </div>
        <div>
          <dt>다 쓴 묶음</dt>
          <dd className={emptyPacks.length > 0 ? "warn" : ""}>{emptyPacks.length}건</dd>
        </div>
        <div>
          <dt>5장 이하로 남은 묶음</dt>
          <dd className={lowPacks.length > 0 ? "warn" : ""}>{lowPacks.length}건</dd>
        </div>
      </dl>

      {emptyPacks.length > 0 || lowPacks.length > 0 ? (
        <div className="notice warn" style={{ marginBottom: 18 }}>
          <b>이용권이 떨어진 기관이 있습니다.</b> 다 쓰면 그 기관 학생의 신청은 본인
          결제로 넘어갑니다. 신청이 막히지는 않지만, 무료인 줄 알았던 학생이 결제창을
          보게 되므로 먼저 연락하는 편이 낫습니다.
        </div>
      ) : null}

      <p className="lede">
        기관이 N건을 미리 사두고, 소속 학생의 신청에서 한 장씩 깎습니다. 멘토에게는
        개인 결제 건과 똑같이 <Link href="/admin/payouts">정산</Link>됩니다. 한 장이 덮는
        한도보다 비싼 세션은 덮이지 않고 본인 결제로 넘어갑니다.
      </p>

      {rows.length === 0 ? (
        <div className="empty">
          <b>발급한 이용권이 없습니다</b>
          기관이 사면 여기서 발급합니다. 그전까지 소속 학생도 본인 결제입니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>기관</th>
                <th>이용권</th>
                <th className="num">한도</th>
                <th className="num">산 장수</th>
                <th className="num">쓴 장수</th>
                <th className="num">남은 장</th>
                <th>기간</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const dead = r.expired || r.status !== "active";
                return (
                  <tr key={r.id}>
                    <td>{names.get(r.org_id) ?? `#${r.org_id}`}</td>
                    <td>
                      <Link href={`/admin/mentoring-packs/${r.id}`}>{r.title}</Link>
                      {r.memo ? <span className="sub">{r.memo}</span> : null}
                    </td>
                    <td className="num">{won(r.unit_price)}</td>
                    <td className="num">{r.total}</td>
                    <td className="num muted">{r.used}</td>
                    <td className="num">
                      {dead ? (
                        <span className="muted">—</span>
                      ) : (
                        <b className={r.remain === 0 ? "warn" : ""}>{r.remain}</b>
                      )}
                    </td>
                    <td className="mono">
                      {r.starts_on} ~ {r.ends_on}
                      {r.expired ? <span className="sub">기간 지남</span> : null}
                      {r.status !== "active" ? <span className="sub">중지됨</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="foot-note">
        기간이 지나면 남은 장은 쓸 수 없습니다. 쓸 수 있는 묶음이 여럿이면 먼저 끝나는
        것부터 깎습니다 — 그러지 않으면 기간이 짧은 묶음이 남은 채로 만료됩니다.
        전액 환불되는 취소(시작 48시간 전까지)는 이용권이 되돌아오고, 부분 환불은
        되돌아오지 않습니다. 장 단위라 반 장을 돌려줄 방법이 없습니다.
      </p>
    </AdminShell>
  );
}
