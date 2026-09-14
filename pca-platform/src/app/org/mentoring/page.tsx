import Link from "next/link";
import { requireRole } from "@/lib/session";
import { myOrgIds, orgNameOf } from "@/lib/org";
import { packsOfOrgs, packUsageByMonth } from "@/lib/pack";
import { namesOf } from "@/lib/i18n";
import OrgShell from "@/components/org-shell";

export const metadata = { title: "멘토링 이용권 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/**
 * 학과 담당자가 보는 멘토링 이용권.
 *
 * 담당자가 알아야 하는 것은 **몇 장 남았는지와 언제 끝나는지**다. 떨어지면 학생이
 * 결제창을 보게 되고, 그건 학생이 어떻게 할 수 있는 일이 아니다.
 *
 * 누가 썼는지는 보여주지 않는다. 학과가 돈을 냈다는 것과 학생의 진로 상담 내용을
 * 볼 권리는 다른 이야기다. 담당자가 본다는 것을 알면 학생은 진짜 고민을 쓰지 않는다.
 */
export default async function OrgMentoringPage() {
  const user = await requireRole(["org_admin", "instructor"]);
  const orgIds = myOrgIds(user);

  const [packs, months, orgName] = await Promise.all([
    packsOfOrgs(orgIds),
    packUsageByMonth(orgIds),
    orgIds[0] ? orgNameOf(orgIds[0], user.locale) : Promise.resolve(null),
  ]);
  const names = await namesOf("organizations", [...new Set(packs.map((p) => p.org_id))], user.locale);

  const live = packs.filter((p) => p.status === "active" && !p.expired);
  const remain = live.reduce((a, p) => a + p.remain, 0);
  const bought = live.reduce((a, p) => a + p.total, 0);
  /** 가장 먼저 끝나는 묶음. 담당자가 갱신 시점을 잡는 기준이 된다 */
  const nextEnd = live.filter((p) => p.remain > 0).map((p) => p.ends_on).sort()[0] ?? null;
  /**
   * '이번 달'은 실제로 이번 달이어야 한다. months[0] 은 가장 최근에 쓴 달이라,
   * 지난달에 마지막으로 썼으면 그 숫자가 이번 달로 둔갑한다.
   */
  const thisMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const recent = months.find((m) => m.month === thisMonth);
  const recentNet = recent ? recent.used - recent.returned : 0;

  return (
    <OrgShell user={user} orgName={orgName} current="/org/mentoring">
      <div className="page-head">
        <h1>멘토링 이용권</h1>
        <span className="count">{packs.length}건</span>
      </div>

      <dl className="stat-row">
        <div>
          <dt>남은 장</dt>
          <dd className={remain === 0 ? "warn" : ""}>{remain.toLocaleString("ko-KR")}장</dd>
        </div>
        <div>
          <dt>산 장수</dt>
          <dd>{bought.toLocaleString("ko-KR")}장</dd>
        </div>
        <div>
          <dt>이번 달 사용</dt>
          <dd>{recentNet}장</dd>
        </div>
        <div>
          <dt>가장 먼저 끝나는 날</dt>
          <dd style={{ fontSize: 16 }}>{nextEnd ?? "—"}</dd>
        </div>
      </dl>

      {remain === 0 ? (
        <div className="notice error" style={{ marginBottom: 18 }}>
          <b>남은 이용권이 없습니다.</b> 지금 학생이 멘토링을 신청하면 본인 결제로
          넘어갑니다. 신청이 막히지는 않지만, 무료인 줄 알았던 학생이 결제창을 보게
          됩니다. 더 필요하시면 운영사에 알려주세요.
        </div>
      ) : remain <= 5 ? (
        <div className="notice warn" style={{ marginBottom: 18 }}>
          <b>이용권이 {remain}장 남았습니다.</b> 다 쓰면 학생 본인 결제로 넘어갑니다.
        </div>
      ) : null}

      <p className="lede">
        학과가 미리 사둔 멘토링 이용권입니다. 학생이 신청할 때마다 한 장씩 빠지고,
        시작 48시간 전까지 취소하면 되돌아옵니다. 그보다 늦은 취소는 돌아오지 않습니다 —
        멘토가 그 시간을 이미 비워둔 뒤이기 때문입니다.{" "}
        <b>5장 남았을 때와 다 썼을 때 담당자 이메일로 알려드립니다.</b>
      </p>

      {packs.length === 0 ? (
        <div className="empty">
          <b>등록된 이용권이 없습니다</b>
          운영사가 등록하면 여기에 표시됩니다. 그전까지 학생은 본인 결제로 신청합니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>이용권</th>
                <th className="num">산 장수</th>
                <th className="num">쓴 장수</th>
                <th className="num">남은 장</th>
                <th className="num">한 장 한도</th>
                <th>기간</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => {
                const dead = p.expired || p.status !== "active";
                return (
                  <tr key={p.id}>
                    <td>
                      {p.title}
                      {orgIds.length > 1 ? (
                        <span className="sub">{names.get(p.org_id) ?? ""}</span>
                      ) : null}
                    </td>
                    <td className="num">{p.total}</td>
                    <td className="num muted">{p.used}</td>
                    <td className="num">
                      {dead ? (
                        <span className="muted">—</span>
                      ) : (
                        <b className={p.remain === 0 ? "warn" : ""}>{p.remain}</b>
                      )}
                    </td>
                    <td className="num muted">{won(p.unit_price)}</td>
                    <td className="mono">
                      {p.starts_on} ~ {p.ends_on}
                      {p.expired ? <span className="sub">기간 지남</span> : null}
                      {p.status !== "active" ? <span className="sub">중지됨</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="sec-h">월별 사용</h2>
      {months.length === 0 ? (
        <div className="empty">
          <b>아직 쓴 장이 없습니다</b>
          학생이 신청하면 여기에 쌓입니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>월</th>
                <th className="num">나간 장</th>
                <th className="num">되돌아온 장</th>
                <th className="num">실제 사용</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <td className="mono">{m.month}</td>
                  <td className="num">{m.used}</td>
                  <td className="num muted">{m.returned || "—"}</td>
                  <td className="num">
                    <b>{m.used - m.returned}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="policy" style={{ marginTop: 22 }}>
        <b>누가 썼는지는 보여드리지 않습니다</b>
        <ul>
          <li>학생 이름, 어느 멘토를 만났는지, 무엇을 물었는지는 표시하지 않습니다</li>
          <li>담당자가 볼 수 있다는 것을 알면 학생은 진짜 고민을 쓰지 않습니다</li>
          <li>멘토도 학생에게 익명입니다 — 익명은 한쪽만의 문제가 아닙니다</li>
        </ul>
        <span>
          집행 내역 확인이 필요하시면 운영사로 문의해 주세요. 개인이 드러나지 않는
          형태로 정리해 드립니다. <Link href="/mentoring/contact">문의하기</Link>
        </span>
      </div>
    </OrgShell>
  );
}
