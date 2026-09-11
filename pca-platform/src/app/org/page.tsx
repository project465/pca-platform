import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";

export const metadata = { title: "기관 담당자 — METRI" };

/**
 * 교수와 담당자가 같은 문으로 들어오지만 할 일이 다르다.
 *
 *   담당자(org_admin) — 회차를 열고, 명단을 올리고, 결과 공개를 승인한다
 *   교수(instructor)  — 자기 과 학생들이 어디까지 왔는지 보고 단체 리포트를 읽는다
 *
 * 아직 안 만든 화면은 감추지 않고 "준비 중" 으로 남겨 둔다. 버튼이 없으면
 * 담당자는 기능이 없는 줄 알고 전화를 건다.
 */
export default async function OrgHome() {
  const user = await requireRole(["org_admin", "instructor"]);
  const isAdmin = user.role === "org_admin";

  const orgIds = user.memberships.map((m) => m.orgId);
  const stat = orgIds.length
    ? await query<{ sessions: number; seats: number; done: number }>(
        `SELECT
           (SELECT count(*) FROM test_sessions ts WHERE ts.org_id = ANY($1::bigint[]))::int AS sessions,
           (SELECT count(*) FROM seats s
              JOIN contracts c ON c.id = s.contract_id
             WHERE c.org_id = ANY($1::bigint[]))::int AS seats,
           (SELECT count(*) FROM attempts a
              JOIN test_sessions ts ON ts.id = a.session_id
             WHERE ts.org_id = ANY($1::bigint[]) AND a.status = 'scored')::int AS done`,
        [orgIds],
      )
    : [{ sessions: 0, seats: 0, done: 0 }];
  const { sessions, seats, done } = stat[0];

  const tasks = isAdmin
    ? [
        { t: "회차 열기", d: "응시 기간과 대상 검사지를 정합니다.", ready: false },
        { t: "명단 올리기", d: "엑셀로 올리면 계정이 한 번에 발급됩니다.", ready: false },
        { t: "응시 현황", d: "누가 어디까지 왔는지 봅니다.", ready: false },
        { t: "결과 공개 승인", d: "승인하기 전에는 학생에게 결과지가 보이지 않습니다.", ready: false },
        { t: "단체 리포트", d: "학과 전체의 직무 분포와 부족 역량입니다.", ready: false },
      ]
    : [
        { t: "우리 과 응시 현황", d: "담당자가 연 회차의 진행 상황입니다.", ready: false },
        { t: "단체 리포트", d: "학과 전체의 직무 분포와 부족 역량입니다.", ready: false },
        { t: "학생 결과지", d: "공개가 승인된 회차만 보입니다.", ready: false },
      ];

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">METRI</span>
        <div className="who">
          <span>
            {user.name} · {ROLE_LABEL[user.role]}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="main">
        <h1 className="page-h1">
          {isAdmin ? "인재개발원 · 대학일자리플러스 담당자" : "학과 교수"}
        </h1>
        <p className="page-sub">
          {isAdmin
            ? "회차를 열고 명단을 올리면 학생이 바로 응시합니다. 결과지는 승인하셔야 학생에게 보입니다."
            : "담당자가 연 회차의 진행 상황과 단체 리포트를 봅니다. 회차를 여는 것은 담당자 권한입니다."}
        </p>

        <div className="statrow">
          <div className="stat">
            <span>열린 회차</span>
            <b>{sessions}</b>
          </div>
          <div className="stat">
            <span>계약 좌석</span>
            <b>{seats}</b>
          </div>
          <div className="stat">
            <span>채점 완료</span>
            <b>{done}</b>
          </div>
        </div>

        <ul className="tasklist">
          {tasks.map((x) => (
            <li key={x.t} className={x.ready ? "" : "soon"}>
              <b>{x.t}</b>
              <span>{x.d}</span>
              {!x.ready && <em>준비 중</em>}
            </li>
          ))}
        </ul>

        <p className="page-note">
          검사가 실제로 어떻게 보이는지 먼저 확인하시려면{" "}
          <Link href="/test">응시 화면</Link>을 열어 보십시오.
        </p>
      </main>
    </div>
  );
}
