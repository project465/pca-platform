import Link from "next/link";
import { notFound } from "next/navigation";
import "./jju.css";
import {
  courseCoverage, demoServer, firstCohortTracks, jjuUniversity, officialProgram,
} from "@/lib/jju/program";
import { Chev, CourseCoverage, DemoRibbon, JjuFrame, OfficialFacts } from "./parts";
import { currentUser } from "@/lib/session";
import { jjuStudentStatus } from "@/lib/jju/student";

export const metadata = { title: "전주대학교 인공지능학과 × AI 부트캠프 · CareerMatri" };

/**
 * 전주대학교 인공지능학과 × AI 분야 첨단산업 인재양성 부트캠프의 첫 화면.
 *
 * **한 화면에 한 가지 말만 크게 한다.** 머리 한 줄 · 단추 하나 · 그 아래는
 * 줄로 된 목록이다. 단계 카드와 색면 띠와 상태 알약을 두지 않는다: 그 셋이
 * 겹치면 화면이 무엇을 하라는지보다 무엇을 만들었는지를 먼저 보여 준다.
 *
 * **검사를 시작하는 길은 학교 진입 화면 하나다.** 단추는 `/campus/jju/majors`
 * 로 보낸다: 시작하는 길이 둘이면 어느 날 한쪽만 고쳐진다.
 *
 * 과정에서 배우는 것과 검사가 묻는 것은 문항 번호로 센 값(`courseCoverage`)을
 * 그대로 쓴다. 사업비는 사업단 전체 금액이고 CareerMatri 비용으로 적지 않는다.
 */
export default async function JjuHome() {
  const u = jjuUniversity();
  if (!u) notFound();
  const rows = firstCohortTracks(u);
  const program = officialProgram(u);
  const cov = courseCoverage(u);
  const user = await currentUser();
  const me = user ? await jjuStudentStatus(user.id) : null;
  const code = u.university_code.toLowerCase();

  return (
    <JjuFrame right={user
      ? <Link href="/me">내 CareerMatri</Link>
      : <Link href={`/campus/${code}/login`}>로그인</Link>}>
      {demoServer() ? <DemoRibbon /> : null}

      {me ? (
        <section className="jju-me jju-card" aria-label="내 진행 상태">
          <p className="jju-me-k">{me.track}</p>
          <h2>{me.headline}</h2>
          {me.note ? <p className="jju-me-n">{me.note}</p> : null}
          {me.primary ? <Link className="jju-btn" href={me.primary.href}>{me.primary.label}</Link> : null}
          {me.more.length ? (
            <ul className="jju-rows is-flat">
              {me.more.map((l) => (
                <li key={l.href}><a href={l.href}><span>{l.label}</span><Chev /></a></li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="jju-hero">
        <p className="jju-hero-k">전주대학교 인공지능학과 · AI 부트캠프</p>
        <h1>수업과 부트캠프에서 한 일,<br />지원서에 쓸 수 있게 정리해요</h1>
        <p className="jju-hero-p">
          인공지능·데이터 쪽 전공 검사로 지금 가진 경험을 확인하고, 다음에 채울 부분을 하나 알려 드려요.
          중간에 닫아도 답한 데까지 저장돼요.
        </p>
        <div className="jju-hero-acts">
          <Link className="jju-btn" href={`/campus/${code}/majors`}>학과·과정 고르기</Link>
          {user ? null : (
            <Link className="jju-btn is-sub" href={`/campus/${code}/login`}>학교 계정으로 로그인</Link>
          )}
        </div>
      </section>

      <section className="jju-sect">
        <h2>어느 쪽이세요?</h2>
        <ul className="jju-rows jju-card">
          {rows.map((t) => t.core_code ? (
            <li key={t.code}>
              <Link href={`/jju/fields#${t.code}`}>
                <span className="jju-row-t">
                  <strong>{t.short}</strong>
                  <small>{t.kind === "DEPARTMENT" ? t.field.name : "부트캠프 과정"}</small>
                </span>
                <Chev />
              </Link>
            </li>
          ) : (
            <li key={t.code} className="is-off">
              <span className="jju-row-t">
                <strong>{t.short}</strong>
                <small>준비 중이에요</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {cov.map((c) => (
        <section className="jju-sect" key={c.course}>
          <h2>{c.course}, 검사에서는 이렇게 봐요</h2>
          <div className="jju-card">
            <CourseCoverage rows={c.rows} />
          </div>
          <p className="jju-note">
            과정을 들었다는 것만으로 할 줄 안다고 보지 않아요. 직접 해 본 일과 직접 정한 것으로 물어요.
          </p>
        </section>
      ))}

      {program ? (
        <section className="jju-sect">
          <h2>부트캠프 소개</h2>
          <OfficialFacts p={program} />
        </section>
      ) : null}

      <section className="jju-sect">
        <ul className="jju-rows jju-card">
          <li>
            <Link href="/login?next=/jju/admin">
              <span className="jju-row-t">
                <strong>학과·사업단 담당자예요</strong>
                <small>과정별 응시 현황과 학생 계정을 관리해요</small>
              </span>
              <Chev />
            </Link>
          </li>
        </ul>
      </section>
    </JjuFrame>
  );
}
