import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { packList, packUses } from "@/lib/pack";
import { namesOf } from "@/lib/i18n";
import AdminShell from "@/components/admin-shell";

export const metadata = { title: "이용권 내역 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

const STATUS: Record<string, string> = {
  requested: "응답 대기",
  accepted: "확정",
  declined: "거절",
  cancelled: "취소",
  expired: "기한 초과",
  completed: "완료",
  no_show: "노쇼 확인 중",
};

/**
 * 한 묶음이 어디에 쓰였는지. 기관이 "우리 돈이 어디에 나갔냐"고 물을 때 주는 화면이다.
 * 학생 실명이 보인다 — 기관이 자기 소속 학생에게 쓴 예산의 내역이기 때문이고,
 * 멘토는 여전히 별명으로만 나온다.
 */
export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ packId: string }>;
}) {
  const user = await requireRole(["superadmin"]);
  const { packId } = await params;

  const pack = (await packList()).find((p) => p.id === packId);
  if (!pack) notFound();

  const [uses, names] = await Promise.all([
    packUses(pack.id),
    namesOf("organizations", [pack.org_id], user.locale),
  ]);

  /** 되돌아온 장은 여기 안 보인다. 실제로 깎인 것만 센다 */
  const spent = uses.reduce((a, u) => a + (u.amount ?? 0) - (u.refunded_amount ?? 0), 0);

  return (
    <AdminShell user={user} current="/admin/mentoring-packs">
      <div className="page-head">
        <h1>{pack.title}</h1>
        <span className="count">{names.get(pack.org_id) ?? `#${pack.org_id}`}</span>
        <div className="right">
          <Link className="act" href="/admin/mentoring-packs">
            목록으로
          </Link>
        </div>
      </div>

      <dl className="stat-row">
        <div>
          <dt>산 장수</dt>
          <dd>{pack.total}장</dd>
        </div>
        <div>
          <dt>쓴 장수</dt>
          <dd>{pack.used}장</dd>
        </div>
        <div>
          <dt>남은 장</dt>
          <dd className={pack.remain === 0 ? "warn" : ""}>{pack.remain}장</dd>
        </div>
        <div>
          <dt>멘토에게 나간 값</dt>
          <dd>{won(spent)}</dd>
        </div>
      </dl>

      <p className="lede">
        한 장 한도 {won(pack.unit_price)} · 기간 {pack.starts_on} ~ {pack.ends_on}
        {pack.expired ? " (지남)" : ""}
        {pack.memo ? ` · ${pack.memo}` : ""}
      </p>

      {uses.length === 0 ? (
        <div className="empty">
          <b>아직 쓴 장이 없습니다</b>이 기관 소속 계정으로 신청이 들어오면 한 장씩 깎입니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>세션</th>
                <th>신청자</th>
                <th>멘토</th>
                <th>상태</th>
                <th className="num">세션 값</th>
                <th className="num">환불</th>
              </tr>
            </thead>
            <tbody>
              {uses.map((u, i) => (
                <tr key={`${u.starts_at}-${i}`}>
                  <td className="mono">{u.starts_at}</td>
                  <td>{u.applicant_name}</td>
                  <td className="mono">{u.handle}</td>
                  <td>{STATUS[u.status] ?? u.status}</td>
                  <td className="num">{won(u.amount ?? 0)}</td>
                  <td className="num muted">
                    {u.refunded_amount ? `−${won(u.refunded_amount)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="foot-note">
        전액 환불된 건은 이용권이 되돌아가므로 이 목록에 남지 않습니다. 부분 환불된 건은
        남고, 환불된 만큼은 멘토에게 가지 않습니다.
      </p>
    </AdminShell>
  );
}
