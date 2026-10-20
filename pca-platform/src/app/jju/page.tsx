import Link from "next/link";
import { notFound } from "next/navigation";
import "../surface.css";
import "../campus/campus.css";
import "./jju.css";
import { CampusShell } from "../campus/shell";
import {
  courseCoverage, demoServer, firstCohortTracks, jjuUniversity, officialProgram,
} from "@/lib/jju/program";
import { CourseCoverage, DemoRibbon, ModeChip, OfficialFacts } from "./parts";
import { currentUser } from "@/lib/session";
import { jjuStudentStatus } from "@/lib/jju/student";
import { withJosa } from "@/lib/me-v3/result/josa";

export const metadata = { title: "전주대학교 인공지능학과 × AI 부트캠프 · CareerMatri" };

/**
 * 전주대학교 인공지능학과 × AI 분야 첨단산업 인재양성 부트캠프의 첫 화면.
 *
 * **학교 진입 화면(`/campus/jju`)을 베끼지 않는다.** 저쪽은 학과·과정을 고르는
 * 공통 길이고 이 쪽은 학생과 사업단이 먼저 보는 소개다. 검사를 시작하는
 * 단추는 저쪽으로 보낸다: 시작하는 길이 둘이면 어느 날 한쪽만 고쳐진다.
 *
 * **학과와 과정을 두 칸으로 가른다.** 인공지능학과는 학생의 소속이고 부트캠프
 * 과정은 사업단의 교육이다. 둘 다 같은 검사(컴퓨터·소프트웨어의 인공지능·데이터
 * 갈래)로 재지만, 한 목록에 섞으면 과정이 학과처럼 읽힌다.
 *
 * **과정에서 배우는 것과 검사가 묻는 것을 가른다.** 과정 주제마다 검사가
 * 실제로 묻는지를 문항 번호로 센 값(`courseCoverage`)을 그대로 적는다.
 * 사업비는 사업단 전체 금액이고 CareerMatri 계약 예산으로 적지 않는다.
 */
const STEPS = [
  { t: "학과·과정 고르고 검사", d: "인공지능·데이터 쪽 판단을 해 본 일과 직접 정한 것으로 묻습니다." },
  { t: "결과 확인", d: "근거가 있는 영역과 아직 비어 있는 부분, 다음에 할 일 하나를 받습니다." },
  { t: "과제·프로젝트 기록", d: "학과 과제나 부트캠프 PBL 을 경험으로 적으면 현재 상태에 더해집니다." },
  { t: "개인 리포트 PDF", d: "응답으로 만든 결과를 PDF 로 받아 상담이나 지원서 정리에 씁니다." },
];

export default async function JjuHome() {
  const u = jjuUniversity();
  if (!u) notFound();
  const rows = firstCohortTracks(u);
  const dept = rows.filter((t) => t.kind === "DEPARTMENT");
  const course = rows.filter((t) => t.kind === "COURSE");
  const program = officialProgram(u);
  const cov = courseCoverage(u);
  /* 로그인한 전주대 학생이면 지금 상태와 다음 한 걸음을 맨 위에 둔다 */
  const user = await currentUser();
  const me = user ? await jjuStudentStatus(user.id) : null;
  const code = u.university_code.toLowerCase();
  const who = (t: (typeof rows)[number]) => (
    <Link key={t.code} href={`/jju/fields#${t.code}`}>
      <span className="jju-who-k">{t.kind === "DEPARTMENT" ? `${t.field.name} · 학과` : "부트캠프 과정"}</span>
      <strong>{t.short}</strong>
      <span className="jju-who-d">{t.kind === "DEPARTMENT"
        ? "인공지능학과 학생이 수업 과제와 프로젝트에서 직접 정한 것을 확인합니다."
        : "부트캠프에서 한 실습과 PBL 을 설명할 수 있는 경험으로 정리합니다."}</span>
      <span className="jju-who-f">
        <span>{t.core_name ?? "검사 미정"}{t.spec_name ? ` · ${t.spec_name}` : ""}</span>
        <ModeChip mode={t.mode} />
      </span>
    </Link>
  );

  return (
    <CampusShell u={u} wide>
      <div className="jju">
        {demoServer() ? <DemoRibbon /> : null}

        {me ? (
          <section className="jju-me" aria-label="내 진행 상태">
            <p className="jju-me-k">{me.track} · <ModeChip mode={me.mode} /></p>
            <h2>{me.headline}</h2>
            <p className="jju-me-n">{me.note}</p>
            <div className="jju-me-acts">
              {me.primary ? <Link className="cm-cmp-btn is-primary" href={me.primary.href}>{me.primary.label}</Link> : null}
              {me.more.map((l) => <a key={l.href} className="cm-cmp-btn" href={l.href}>{l.label}</a>)}
            </div>
          </section>
        ) : null}

        <section className="cm-cmp-hero has-flow">
          <div>
            <p className="cm-cmp-eyebrow">{u.university_name} 인공지능학과 × {program?.name ?? "AI 부트캠프"}</p>
            <h1 className="cm-cmp-title">학과 수업과 부트캠프에서 한 일을 설명할 수 있는 경험으로</h1>
            <p className="cm-cmp-lead">
              인공지능·데이터 쪽 전공 검사로 지금 가진 근거를 확인하고, 과제와
              프로젝트를 기록해 다음에 채울 부분을 정합니다.
            </p>
            <div className="cm-cmp-cta-row">
              <Link className="cm-cmp-cta" href={`/campus/${code}/majors`}>
                학과·과정 고르기<span aria-hidden="true">→</span>
              </Link>
              {/* 이미 들어와 있는 사람에게 로그인 단추를 세우지 않는다 */}
              {user ? null : (
                <Link className="cm-cmp-cta-2" href={`/campus/${code}/login`}>
                  학교 계정으로 로그인
                </Link>
              )}
            </div>
          </div>
          <ol className="cm-cmp-flow">
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <b>STEP {i + 1}</b>
                <strong>{s.t}</strong>
                <span>{s.d}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="cm-cmp-sect">
          <div className="cm-cmp-sect-h">
            <h2>누가 쓰나</h2>
            <p>학과 학생과 부트캠프 참여자가 같은 검사로 잽니다</p>
          </div>
          <div className="jju-who">
            {dept.map(who)}
            {course.filter((t) => t.core_code).map(who)}
          </div>
          {course.some((t) => !t.core_code) ? (
            <p className="cm-cmp-note">
              {withJosa(course.filter((t) => !t.core_code).map((t) => t.short).join(" · "), "은는")} 과정이 있다는 것만
              확인돼 아직 검사를 잇지 않았습니다. 내용이 확인되면 이 자리에 섭니다.
            </p>
          ) : null}
        </section>

        {cov.map((c) => (
          <section className="cm-cmp-sect" key={c.course}>
            <div className="cm-cmp-sect-h">
              <h2>{c.course} 주제와 검사</h2>
              <p>과정에서 배우는 것과 검사가 실제로 묻는 것을 가릅니다</p>
            </div>
            <CourseCoverage rows={c.rows} />
            <p className="cm-cmp-note">
              {c.core_name}{c.spec_name ? ` · ${c.spec_name} 갈래` : ""}의 문항을 하나하나 세어 적었습니다.
              과정을 이수했다는 사실만으로 역량을 확인했다고 적지 않습니다.
            </p>
          </section>
        ))}

        {program ? (
          <section className="cm-cmp-sect">
            <div className="cm-cmp-sect-h">
              <h2>부트캠프 사업 개요</h2>
              <p>공식 출처가 있는 사실만 적습니다</p>
            </div>
            <OfficialFacts p={program} />
          </section>
        ) : null}

        <section className="cm-cmp-sect">
          <div className="cm-cmp-sect-h">
            <h2>학과·사업단 담당자</h2>
            <p>학과·과정별 검사 현황</p>
          </div>
          <div className="jju-staff">
            <p>
              담당자 계정으로 로그인하면 인공지능학과와 부트캠프 과정별 응시 현황,
              학생 명단과 계정 발급, 집계 내려받기를 볼 수 있습니다. 개별 학생의
              응답과 결과는 담당자에게 열리지 않습니다.
            </p>
            <Link className="cm-cmp-btn" href="/login?next=/jju/admin">
              담당자 로그인
            </Link>
          </div>
        </section>
      </div>
    </CampusShell>
  );
}
