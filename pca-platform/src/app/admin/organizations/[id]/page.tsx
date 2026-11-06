import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "@/components/admin-shell";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { query, queryOne } from "@/lib/db";
import { nameOf } from "@/lib/i18n";
import { university } from "@/lib/campus/registry";
import { CAMPUS_MAT_NAME, poolsOf } from "@/lib/campus/mat";
import { campusV3 } from "@/lib/me-v3/campus";
import { orgTypeKo } from "@/lib/org-type";
import StaffPanel from "./staff-panel";

export const metadata = { title: "기관 · CareerMatri" };

/**
 * 기관 한 곳의 전부: 담당자, 계약, 회차.
 *
 * 계약을 맺은 학과를 실제로 굴리려면 세 가지가 차례로 있어야 한다.
 *   1. 기관        /admin/organizations/new
 *   2. 담당자 계정  여기
 *   3. 계약과 좌석  /admin/contracts/new
 * 2번이 없어서 지금까지는 SQL 을 직접 쳐야 학과가 로그인할 수 있었다.
 */
export default async function OrgDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["superadmin"]);
  const { id } = await params;

  const org = await queryOne<{
    id: string;
    code: string;
    country: string;
    org_type: string;
    status: string;
    parent_id: string | null;
  }>(
    `SELECT id, code, country, org_type, status, parent_id FROM organizations WHERE id = $1`,
    [id],
  );
  if (!org) notFound();

  const name = await nameOf("organizations", org.id, user.locale);
  const parent = org.parent_id ? await nameOf("organizations", org.parent_id, user.locale) : null;

  const staff = await query<{
    user_id: string;
    name: string;
    ident: string;
    role: string;
    must_reset: boolean;
    last_login: string | null;
  }>(
    `SELECT u.id AS user_id, u.display_name AS name,
            COALESCE(u.login_id, u.email) AS ident, m.role,
            u.must_reset_pw AS must_reset,
            to_char(u.last_login_at, 'YYYY-MM-DD') AS last_login
       FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.org_id = $1 AND m.role IN ('org_admin', 'instructor')
      ORDER BY (m.role = 'org_admin') DESC, u.display_name`,
    [id],
  );

  const contracts = await query<{
    id: string;
    title: string;
    seat_count: number;
    used: number;
    ends_on: string;
    status: string;
  }>(
    `SELECT c.id, c.title, c.seat_count, c.status,
            to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on,
            (SELECT count(*)::int FROM seats s WHERE s.contract_id = c.id AND s.user_id IS NOT NULL) AS used
       FROM contracts c WHERE c.org_id = $1 ORDER BY c.ends_on DESC`,
    [id],
  );

  const sessions = await query<{ id: string; name: string; enrolled: number; scored: number; released: boolean }>(
    `SELECT ts.id, ts.name,
            (SELECT count(*)::int FROM attempts a WHERE a.session_id = ts.id) AS enrolled,
            (SELECT count(*)::int FROM attempts a WHERE a.session_id = ts.id AND a.status = 'scored') AS scored,
            (ts.released_at IS NOT NULL OR ts.release_mode = 'instant') AS released
       FROM test_sessions ts WHERE ts.org_id = $1 ORDER BY ts.id DESC LIMIT 10`,
    [id],
  );

  const students = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM memberships WHERE org_id = $1 AND role = 'student'`,
    [id],
  );

  /**
   * **기관 화면과 같은 수를 보인다**(2026-11-01 배재대 운영 시험: 여기는 "학생 3명", 기관
   * 화면은 "대상자 2명"이었다). 위 `students` 는 이 기관에 붙은 학생 계정 전부(시연 · 끈
   * 계정 포함)이고, 기관 화면의 대상자는 `campusV3` 가 세는 명단 ∪ 학교 진입이다.
   * 학교 등록부의 기관이면 그 수를 같은 함수로 받아 함께 적고, 무엇을 센 수인지 적는다.
   */
  const v3 = org.code && university(org.code)
    ? await campusV3({ orgIds: [Number(org.id)], universityCode: org.code }).catch(() => null)
    : null;

  /**
   * **학교 등록부의 기관은 계약 표를 쓰지 않는다**(2026-11-06). 학교 MAT 은 `campus_mat_pools` 가 열고,
   * 검사 리포트는 학교 발급 계정이면 열린다. 옛 계약(`contracts`)은 옛 검사 좌석이고, 한 줄이라도 생기면
   * 담당자 메뉴가 옛 화면(계약 · 좌석 · 회차, 전부 0)으로 바뀐다(`campusV3Only`). 그래서 이 기관에서는
   * `계약 등록` 대신 `MAT 인원 넣기` 를 세운다
   */
  const campusUni = org.code ? university(org.code) : null;
  const campusCode = campusUni?.university_code ?? null;
  const pools = campusCode ? await poolsOf(campusCode).catch(() => []) : [];
  const matHref = campusCode ? `/admin/campus-mat?uni=${campusCode}` : "";


  return (
    <AdminShell user={user} current="/admin/organizations">
      <div className="page-head">
        <h1>{name}</h1>
        <span className="count mono">{org.code}</span>
        <div className="right">
          <Link className="act" href="/admin/organizations">
            목록
          </Link>
          {campusCode ? (
            <Link className="act solid" href={matHref}>
              MAT 인원 넣기
            </Link>
          ) : (
            <Link className="act solid" href={`/admin/contracts/new?org=${org.id}`}>
              계약 등록
            </Link>
          )}
        </div>
      </div>
      <p className="page-sub">
        {orgTypeKo(org.org_type)} · {org.country}
        {parent ? ` · ${parent} 소속` : ""}
        {v3
          ? ` · 대상자 ${v3.target}명(명단 ${v3.roster}명 + 학교 진입 ${v3.target - v3.roster}명, 기관 화면과 같은 수)`
          : ""}
        {` · 학생 계정 ${students?.n ?? 0}개(시연 · 끈 계정 포함)`}
      </p>

      <StaffPanel orgId={org.id} staff={staff} />

      {campusCode ? (
        <>
          <h2 className="page-h2">MAT 학교 이용권{campusUni?.demo ? " (데모 학교)" : ""}</h2>
          {pools.length ? (
            <div className="tablewrap">
              <table className="roster">
                <thead>
                  <tr>
                    <th>이용권</th>
                    <th>연 학생 / 인원</th>
                    <th>열 수 있는 날</th>
                    <th>상태</th>
                    <th>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((p) => (
                    <tr key={p.id}>
                      <td>{CAMPUS_MAT_NAME[p.product_code]}</td>
                      <td className="mono">{p.used} / {p.seats}</td>
                      <td className="mono">{p.grant_until}</td>
                      <td>{p.status === "closed" ? "닫힘" : p.open ? "열 수 있음" : p.left ? "기간 지남" : "인원 다 씀"}</td>
                      <td>{p.memo ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <b>MAT 인원이 없습니다</b>
              이 학교 학생은 지금 MAT 무료 분석만 씁니다. 계약한 인원과 기간을 넣으면 담당자가 학생 관리 화면에서 학생에게 엽니다.
              <Link className="act solid" href={matHref}>
                MAT 인원 넣기
              </Link>
            </div>
          )}
        </>
      ) : null}

      <h2 className="page-h2">{campusCode ? "옛 검사 계약과 좌석" : "계약과 좌석"}</h2>
      {contracts.length === 0 && campusCode ? (
        <div className="empty">
          <b>옛 검사 계약이 없습니다. 이 학교에는 없는 것이 맞습니다</b>
          이 학교는 학교 전용 진입으로 운영합니다. 여기 계약을 등록하면 담당자 메뉴가 옛 화면으로 바뀌고,
          학교 MAT 은 열리지 않습니다. MAT 은 위의 MAT 학교 이용권으로 엽니다.
        </div>
      ) : contracts.length === 0 ? (
        <div className="empty">
          <b>계약이 없습니다</b>
          좌석은 계약에서 나옵니다. 계약을 등록하면 좌석이 바로 만들어집니다.
          <Link className="act solid" href={`/admin/contracts/new?org=${org.id}`}>
            계약 등록
          </Link>
        </div>
      ) : (
        <div className="tablewrap">
          <table className="roster">
            <thead>
              <tr>
                <th>계약</th>
                <th>좌석</th>
                <th>종료일</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td className="mono">
                    {c.used} / {c.seat_count}
                  </td>
                  <td className="mono">{c.ends_on}</td>
                  <td>{c.status === "active" ? "활성" : c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="page-h2">회차</h2>
      {sessions.length === 0 ? (
        <div className="empty">
          <b>열린 회차가 없습니다</b>
          회차는 학과 담당자가 엽니다. 담당자 계정을 먼저 발급하세요.
        </div>
      ) : (
        <div className="tablewrap">
          <table className="roster">
            <thead>
              <tr>
                <th>회차</th>
                <th>명단</th>
                <th>채점</th>
                <th>공개</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="mono">{s.enrolled}</td>
                  <td className="mono">{s.scored}</td>
                  <td>
                    {s.released ? (
                      <span className="flag ok">공개됨</span>
                    ) : (
                      <span className="flag warn">공개 전</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
