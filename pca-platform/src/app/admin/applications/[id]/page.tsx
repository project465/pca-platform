import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { suggestOrgCode } from "@/lib/applications";
import ApproveForm from "./approve-form";

export const metadata = { title: "신청 검토 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

type App = {
  id: string;
  ref_code: string;
  site: string;
  country: string;
  org_name: string;
  dept_name: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  expected_size: string | null;
  plan: string | null;
  message: string | null;
  status: string;
  org_id: string | null;
  review_memo: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(["superadmin"]);

  const app = await queryOne<App>(
    `SELECT id, ref_code, site, country, org_name, dept_name,
            contact_name, contact_email, contact_phone,
            expected_size::text AS expected_size, plan, message, status, org_id::text AS org_id,
            review_memo,
            to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
            to_char(reviewed_at, 'YYYY-MM-DD HH24:MI') AS reviewed_at
       FROM org_applications WHERE id = $1`,
    [id],
  );
  if (!app) notFound();

  /* 학과로 승인할 때 고를 상위 대학 목록 */
  const universities = await query<{ id: string; code: string }>(
    `SELECT id, code FROM organizations WHERE org_type = 'university' ORDER BY code`,
  );
  const uniNames = await namesOf(
    "organizations",
    universities.map((u) => u.id),
    user.locale,
  );
  const parents = universities.map((u) => ({
    id: u.id,
    label: `${uniNames.get(u.id) ?? u.code} (${u.code})`,
  }));

  /* 승인이 끝난 신청서는 그때 발급된 링크를 다시 보여준다.
     임시 비밀번호는 해시만 남으므로 여기서 다시 볼 수 없다 */
  const links = app.org_id
    ? await query<{ token: string; label: string; used_count: string; max_uses: string | null }>(
        `SELECT token, label, used_count::text AS used_count, max_uses::text AS max_uses
           FROM org_links WHERE org_id = $1 AND revoked_at IS NULL ORDER BY created_at`,
        [app.org_id],
      )
    : [];

  return (
    <AdminShell user={user} current="/admin/applications">
      <div className="page-head">
        <h1>{app.org_name}</h1>
        <span className="count mono">{app.ref_code}</span>
        <div className="right">
          <Link className="act" href="/admin/applications">
            목록
          </Link>
        </div>
      </div>

      <section className="card" style={{ maxWidth: 720, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>신청 내용</h2>
        <dl className="kv">
          <dt>기관</dt>
          <dd>
            {app.org_name}
            {app.dept_name ? ` · ${app.dept_name}` : ""}
          </dd>
          <dt>담당자</dt>
          <dd>
            {app.contact_name} · {app.contact_email}
            {app.contact_phone ? ` · ${app.contact_phone}` : ""}
          </dd>
          <dt>예상 인원</dt>
          <dd>{app.expected_size ? `${Number(app.expected_size).toLocaleString("ko-KR")}명` : "—"}</dd>
          <dt>요금제</dt>
          <dd>{app.plan || "—"}</dd>
          <dt>출처</dt>
          <dd className="mono">
            {app.site} / {app.country}
          </dd>
          <dt>접수일</dt>
          <dd className="mono">{app.created_at}</dd>
          {app.message ? (
            <>
              <dt>남긴 말</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{app.message}</dd>
            </>
          ) : null}
        </dl>
      </section>

      {app.status === "received" ? (
        <ApproveForm
          applicationId={app.id}
          parents={parents}
          defaults={{
            code: suggestOrgCode(app.org_name, app.dept_name),
            nameKo: app.dept_name ? `${app.org_name} ${app.dept_name}` : app.org_name,
            adminName: app.contact_name,
            adminEmail: app.contact_email,
            seatCount: app.expected_size ?? "",
            orgLabel: app.dept_name ?? app.org_name,
            country: app.country === "XX" ? "" : app.country,
          }}
        />
      ) : (
        <section className="card" style={{ maxWidth: 720 }}>
          <h2 style={{ fontSize: 14, marginTop: 0 }}>
            {app.status === "approved" ? "승인됨" : "반려됨"}
          </h2>
          <p className="help" style={{ marginTop: 0 }}>
            {app.reviewed_at} 에 처리되었습니다.
            {app.review_memo ? ` 사유: ${app.review_memo}` : ""}
          </p>

          <p className="help">
            담당자 임시 비밀번호는 승인 직후 한 번만 보입니다. 놓쳤다면 비밀번호
            재설정 링크를 새로 발급해 전달하세요.
          </p>

          {links.length > 0 ? (
            <>
              <h3 style={{ fontSize: 13 }}>전용 링크</h3>
              {links.map((l) => (
                <p key={l.token} style={{ margin: "6px 0" }}>
                  <b>{l.label}</b>
                  <br />
                  <code className="mono" style={{ wordBreak: "break-all" }}>
                    /join/{l.token}
                  </code>
                  <br />
                  <span className="help">
                    {Number(l.used_count).toLocaleString("ko-KR")}명 사용
                    {l.max_uses ? ` / ${Number(l.max_uses).toLocaleString("ko-KR")}` : ""}
                  </span>
                </p>
              ))}
            </>
          ) : null}
        </section>
      )}
    </AdminShell>
  );
}
