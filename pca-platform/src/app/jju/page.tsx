import Link from "next/link";
import { notFound } from "next/navigation";
import "../surface.css";
import "../campus/campus.css";
import "./jju.css";
import { CampusShell } from "../campus/shell";
import {
  demoServer, firstCohortTracks, jjuUniversity, MODE_KO, officialProgram,
} from "@/lib/jju/program";
import { DemoRibbon, ModeChip, OfficialFacts } from "./parts";
import { currentUser } from "@/lib/session";
import { jjuStudentStatus } from "@/lib/jju/student";

export const metadata = { title: "전주대학교 AI 부트캠프 · CareerMatri" };

/**
 * 전주대학교 AI·첨단산업 부트캠프의 첫 화면.
 *
 * **학교 진입 화면(`/campus/jju`)을 베끼지 않는다.** 저쪽은 학과를 고르는
 * 공통 길이고 이 쪽은 사업단이 학생과 담당자에게 먼저 보여 주는 소개다.
 * 검사를 시작하는 단추는 저쪽으로 보낸다: 시작하는 길이 둘이면 어느 날
 * 한쪽만 고쳐진다.
 *
 * **공식 사실과 시연 분류를 두 절로 가른다.** 사업 선정·기간·운영 방식·실제
 * 과정은 출처가 붙은 절에 서고, 트랙·기수는 CareerMatri 가 검사를 잇기 위해
 * 만든 시연용 분류라 따로 선다. 사업비는 사업단 전체 금액이고 CareerMatri
 * 계약 예산으로 적지 않는다.
 */
const STEPS = [
  { t: "트랙 선택과 검사", d: "트랙에 맞는 전공 검사로 해 본 일과 직접 정한 것을 묻습니다." },
  { t: "결과 확인", d: "근거가 있는 영역과 아직 비어 있는 부분, 다음에 할 일 하나를 받습니다." },
  { t: "프로젝트 기록", d: "부트캠프에서 한 프로젝트를 경험으로 적으면 현재 상태에 더해집니다." },
  { t: "개인 PDF", d: "응답으로 만든 결과를 PDF 로 받아 상담이나 지원서 정리에 씁니다." },
];

export default async function JjuHome() {
  const u = jjuUniversity();
  if (!u) notFound();
  const tracks = firstCohortTracks(u);
  const program = officialProgram(u);
  /* 로그인한 전주대 학생이면 지금 상태와 다음 한 걸음을 맨 위에 둔다 */
  const user = await currentUser();
  const me = user ? await jjuStudentStatus(user.id) : null;
  const code = u.university_code.toLowerCase();

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
            <p className="cm-cmp-eyebrow">{u.university_name} {program?.name ?? "AI 부트캠프"}</p>
            <h1 className="cm-cmp-title">부트캠프에서 한 일을 설명할 수 있는 경험으로</h1>
            <p className="cm-cmp-lead">
              트랙에 맞는 전공 검사로 지금 가진 근거를 확인하고, 프로젝트를
              기록해 다음에 채울 부분을 정합니다.
            </p>
            <div className="cm-cmp-cta-row">
              <Link className="cm-cmp-cta" href={`/campus/${code}/majors`}>
                내 트랙 고르기<span aria-hidden="true">→</span>
              </Link>
              <Link className="cm-cmp-cta-2" href={`/campus/${code}/login`}>
                학교 계정으로 로그인
              </Link>
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

        {program ? (
          <section className="cm-cmp-sect">
            <div className="cm-cmp-sect-h">
              <h2>사업 개요</h2>
              <p>공식 출처가 있는 사실만 적습니다</p>
            </div>
            <OfficialFacts p={program} />
          </section>
        ) : null}

        <section className="cm-cmp-sect">
          <div className="cm-cmp-sect-h">
            <h2>검사 연결 트랙<span className="jju-demo-h">시연용 분류</span></h2>
            <p>사업단 공식 트랙이 아닙니다</p>
          </div>
          <nav className="cm-cmp-list">
            {tracks.map((t) => (
              <Link className="cm-cmp-row" key={t.code} href={`/jju/fields#${t.code}`}>
                <span className="cm-cmp-row-main">
                  <span className="cm-cmp-row-name">{t.short}</span>
                  <span className="cm-cmp-row-sub">
                    {t.field.name} · {t.core_name ?? "검사 미정"}
                    {t.spec_name ? ` (${t.spec_name})` : ""}
                  </span>
                </span>
                <ModeChip mode={t.mode} />
                <span className="cm-cmp-arrow" aria-hidden="true">›</span>
              </Link>
            ))}
          </nav>
          <p className="cm-cmp-note">
            이 트랙들은 공식 과정을 CareerMatri 전공 검사에 잇기 위해 만든 시연용
            분류입니다. {MODE_KO.DEMO} 표시가 붙은 트랙은 전공자 검수가 끝나지 않은 검사를
            시연 서버에서만 연 것입니다. 그 결과를 실제 진단으로 쓰지 않습니다.
          </p>
          <div className="cm-cmp-acts">
            <Link className="cm-cmp-btn" href="/jju/fields">교육 분야 자세히 보기</Link>
          </div>
        </section>

        <section className="cm-cmp-sect">
          <div className="cm-cmp-sect-h">
            <h2>사업단 담당자</h2>
            <p>기수·트랙·검사 현황</p>
          </div>
          <div className="jju-staff">
            <p>
              담당자 계정으로 로그인하면 기수와 트랙별 응시 현황, 학생 명단과
              계정 발급, 집계 내려받기를 볼 수 있습니다. 개별 학생의 응답과
              결과는 담당자에게 열리지 않습니다.
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
