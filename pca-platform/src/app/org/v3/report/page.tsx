/**
 * 대학 운영 요약(규격 §19).
 *
 * **개인 응답이 한 칸도 들어가지 않는다.** 여기 서는 것은 전부 세는
 * 값이고, `5명 미만` 칸은 가리는 것이 아니라 **값이 만들어지지 않는다**
 * (집계 함수가 `null` 로 돌려준다). 가리는 자리를 이 쪽에 또 두지 않는다:
 * 가리는 자리가 둘이면 어느 날 한쪽만 고쳐지고, 그날 뽑은 종이에서 네
 * 명짜리 학과가 드러난다.
 *
 * **새 지표를 만들지 않는다.** 숫자는 담당자 집계 화면이 쓰는 함수가 낸
 * 것 그대로다. 두 자리에서 따로 세면 담당자가 어느 쪽을 믿어야 할지
 * 모른다(설계 원칙 10).
 */
import Link from "next/link";
import { MIN_CELL } from "@/lib/org";
import { campusV3 } from "@/lib/me-v3/campus";
import { studentCounts } from "@/lib/campus/manage";
import { campusNames } from "@/lib/campus/labels";
import {
  campusQuery, campusQueryKo, campusQueryString, campusViewer,
} from "@/lib/campus/viewer";
import "../report.css";

export const metadata = { title: "대학 운영 요약 · CareerMatri Campus" };

function num(n: number | null): React.ReactNode {
  return n === null
    ? <span className="hid">{MIN_CELL}명 미만</span>
    : n.toLocaleString("ko-KR");
}

export default async function OrgReport({
  searchParams,
}: {
  searchParams: Promise<{
    demo?: string; from?: string; to?: string;
    college?: string; department?: string;
  }>;
}) {
  const sp = await searchParams;
  const view = await campusViewer();
  const { org, uni } = view;
  const name = campusNames(uni);
  const q = campusQuery(sp);
  const withDemo = sp.demo === "1";
  const v3 = await campusV3({
    orgIds: view.orgIds, universityCode: uni, withDemo,
    from: q.from, to: q.to, college: q.college, department: q.department,
  });
  const counts = uni
    ? await studentCounts({
      universityCode: uni, withDemo,
      college: q.college ?? undefined, department: q.department ?? undefined,
    })
    : null;
  const now = new Date().toISOString().slice(0, 10);

  return (
    <main className="og">
      {/* **표지가 혼자 말해야 한다**(규격 §19). 담당자는 이 종이를 회의
          자료에 붙이고, 한 장만 떨어져 나와도 그 장이 어느 학교의 어느
          기간 자료인지 스스로 적어야 한다 */}
      <header className="og-cover">
        <p className="og-kicker">CareerMatri Campus · 대학 운영 요약</p>
        <h1>{org ? org.name : "기관"} 진로 진단 운영 현황</h1>
        <p className="og-meta">
          <b>범위</b> {campusQueryKo(q, name)} · <b>뽑은 날</b> {now}
          {withDemo ? " · 시연·검사 계정을 섞어서 본 자료입니다" : ""}
        </p>
        <p className="og-meta" style={{ marginTop: 6 }}>
          개인 응답과 개별 결과지는 들어 있지 않습니다. 사람이 {MIN_CELL}명이
          안 되는 칸은 숫자를 만들지 않습니다.
        </p>
      </header>

      <section className="og-sect">
        <h2>한눈에</h2>
        <div className="og-kpis">
          <div className="og-kpi">
            <span>대상자</span><b>{v3.target}</b>
            <i>{v3.target > v3.roster
              ? `명단 ${v3.roster} + 학교 진입 ${v3.target - v3.roster}`
              : "학교가 계정을 발급한 학생"}</i>
          </div>
          <div className="og-kpi">
            <span>검사를 시작한 학생</span><b>{v3.started}</b>
            <i>지금 푸는 중 {v3.in_progress}명</i>
          </div>
          <div className="og-kpi">
            <span>결과를 받은 학생</span><b>{v3.scored}</b>
            <i>경험을 더해 갱신 {v3.recomputed}명</i>
          </div>
          <div className="og-kpi">
            <span>완료율</span>
            <b>{v3.completion === null ? "—" : `${v3.completion}%`}</b>
            <i>대상자 기준</i>
          </div>
        </div>
      </section>

      {counts ? (
        <section className="og-sect">
          <h2>응시 상태별 학생</h2>
          <p className="og-note">
            학교가 발급한 명단 기준입니다. 기간으로 좁히지 않습니다.
          </p>
          <div className="og-tw"><table className="og-table">
            <thead>
              <tr>
                <th scope="col">상태</th>
                <th scope="col" className="num">학생</th>
              </tr>
            </thead>
            <tbody>
              <tr><th scope="row">아직 시작하지 않음</th>
                <td className="num">{counts.none}</td></tr>
              <tr><th scope="row">푸는 중</th>
                <td className="num">{counts.in_progress}</td></tr>
              <tr><th scope="row">결과를 받음</th>
                <td className="num">{counts.scored}</td></tr>
              <tr><th scope="row">이용이 멈춘 계정</th>
                <td className="num">{counts.disabled}</td></tr>
            </tbody>
          </table></div>
        </section>
      ) : null}

      {v3.college_rows.length ? (
        <section className="og-sect">
          <h2>단과대학별 응시 현황</h2>
          <p className="og-note">
            학교 전용 진입으로 들어온 응시입니다. 단과대학끼리 줄을 세우지
            않습니다.
          </p>
          <div className="og-tw"><table className="og-table">
            <thead>
              <tr>
                <th scope="col">단과대학</th>
                <th scope="col" className="num">대상자</th>
                <th scope="col" className="num">시작</th>
                <th scope="col" className="num">완료</th>
                <th scope="col" className="num">완료율</th>
              </tr>
            </thead>
            <tbody>
              {v3.college_rows.map((r) => (
                <tr key={r.code}>
                  <th scope="row">{name.college(r.code)}</th>
                  <td className="num">{num(r.target)}</td>
                  <td className="num">{num(r.started)}</td>
                  <td className="num">{num(r.scored)}</td>
                  <td className="num">{r.rate === null ? "—" : `${r.rate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      ) : null}

      {v3.by_department.length ? (
        <section className="og-sect">
          <h2>학과별 응시</h2>
          <div className="og-tw"><table className="og-table">
            <thead>
              <tr>
                <th scope="col">학과</th>
                <th scope="col" className="num">검사를 시작한 학생</th>
              </tr>
            </thead>
            <tbody>
              {v3.by_department.map((c) => (
                <tr key={c.key}>
                  <th scope="row">{name.dept(c.key)}</th>
                  <td className="num">{num(c.n)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      ) : null}

      {v3.attention.length ? (
        <section className="og-sect">
          <h2>안내를 한 번 더 보낼 학과</h2>
          <p className="og-note">
            시작한 학생이 {MIN_CELL}명 이상인 학과 가운데 아직 결과를 받지
            않은 학생이 남은 곳입니다. 학과끼리 줄을 세우지 않습니다.
          </p>
          <ul className="og-list">
            {v3.attention.slice(0, 8).map((r) => (
              <li key={r.code}>
                {name.dept(r.code)} — 시작 {r.started}명 가운데 {r.open}명이
                아직 결과를 받지 않았습니다
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="og-sect">
        <h2>이 자료로 하지 않는 것</h2>
        {/* **없는 기능을 있다고 적지 않는다.** 이 종이를 받은 사람이 가장
            먼저 묻는 것이 `그래서 누가 잘하나요` 이고, 그 물음에 이 제품은
            답하지 않는다. 답하지 않는다는 것을 종이가 먼저 적는다 */}
        <ul className="og-list">
          <li>학생끼리 줄을 세우지 않습니다. 등수도 백분위도 내지 않습니다.</li>
          <li>종합 점수나 대학 KPI 를 만들지 않습니다.</li>
          <li>합격 가능성이나 취업 확률을 내지 않습니다.</li>
          <li>
            개별 학생의 응답과 결과지는 이 자료에 들어 있지 않고, 본인 동의와
            계약에 적힌 범위 안에서만 열립니다.
          </li>
          <li>
            사람이 {MIN_CELL}명이 안 되는 칸은 숫자를 만들지 않습니다. 0 으로
            적지도 않습니다.
          </li>
        </ul>
      </section>

      <p className="og-noprint" style={{ marginTop: 28 }}>
        <a href={`/org/v3/report.pdf${campusQueryString(q, withDemo ? { demo: "1" } : {})}`}>
          이 쪽을 PDF 로 받기
        </a>{" · "}
        <Link href="/org/v3">집계 화면으로</Link>
      </p>
    </main>
  );
}
