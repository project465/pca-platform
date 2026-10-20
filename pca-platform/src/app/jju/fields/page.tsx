import Link from "next/link";
import { notFound } from "next/navigation";
import "../jju.css";
import { domainNames } from "../../campus/domains";
import {
  courseCoverage, demoServer, firstCohortTracks, jjuUniversity,
} from "@/lib/jju/program";
import { CourseCoverage, DemoRibbon, JjuFrame } from "../parts";
import { currentUser } from "@/lib/session";

export const metadata = { title: "학과와 과정 · 전주대학교 CareerMatri" };

/**
 * 인공지능학과와 부트캠프 과정이 **어느 검사로, 어떤 영역을** 묻는가.
 *
 * **학과와 과정이 무엇을 가르치는지 지어내지 않는다.** 적는 것은 그 자리를
 * 재는 검사가 실제로 묻는 영역의 이름(그 Core 의 taxonomy)과, 과정이면
 * 공지에 적힌 주제와 검사 문항을 나란히 놓은 것(`courseCoverage`)이다.
 *
 * 등록 근거(원문 대조 여부)는 학생 화면에 두지 않고 사업단 화면의 `자료
 * 출처` 펼침이 든다.
 */
export default async function JjuFields() {
  const u = jjuUniversity();
  if (!u) notFound();
  const rows = firstCohortTracks(u);
  const cov = new Map(courseCoverage(u).map((c) => [c.course, c]));
  const code = u.university_code.toLowerCase();
  const user = await currentUser();

  return (
    <JjuFrame narrow right={user
      ? <Link href="/me">내 CareerMatri</Link>
      : <Link href={`/campus/${code}/login`}>로그인</Link>}>
      {demoServer() ? <DemoRibbon /> : null}
      <section className="jju-hero is-page">
        <h1>학과와 과정</h1>
        <p className="jju-hero-p">인공지능학과 학생과 부트캠프 참여자는 같은 검사를 봐요.</p>
      </section>

      {rows.map((t) => {
        const doms = t.core_code ? domainNames(t.core_code) : [];
        const c = cov.get(t.name);
        return (
          <article className="jju-track jju-card" id={t.code} key={t.code}>
            <p className="jju-track-k">{t.kind === "DEPARTMENT" ? t.field.name : "부트캠프 과정"}</p>
            <h2>{t.short}</h2>
            {t.core_code ? (
              <>
                <dl>
                  <dt>보는 검사</dt>
                  <dd>{t.core_name}{t.spec_name ? ` · ${t.spec_name}` : ""}</dd>
                  {doms.length ? (<><dt>묻는 영역</dt><dd>{doms.join(", ")}</dd></>) : null}
                </dl>
                {c ? (
                  <div className="jju-track-cov">
                    <h3>과정 주제별로 보면</h3>
                    <CourseCoverage rows={c.rows} />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="jju-track-off">어느 검사로 볼지 아직 정하지 않았어요. 정해지면 여기서 시작할 수 있어요.</p>
            )}
          </article>
        );
      })}

      <div className="jju-hero-acts is-end">
        <Link className="jju-btn" href={`/campus/${code}/majors`}>학과·과정 고르고 시작하기</Link>
      </div>
    </JjuFrame>
  );
}
