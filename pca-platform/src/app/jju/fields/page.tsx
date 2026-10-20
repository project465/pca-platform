import Link from "next/link";
import { notFound } from "next/navigation";
import "../../surface.css";
import "../../campus/campus.css";
import "../jju.css";
import { CampusShell } from "../../campus/shell";
import { domainNames } from "../../campus/domains";
import {
  cohortsOf, demoServer, firstCohortTracks, jjuUniversity, MODE_NOTE, officialProgram,
} from "@/lib/jju/program";
import { DemoRibbon, ModeChip, OfficialFacts } from "../parts";

export const metadata = { title: "교육과정과 트랙 · 전주대학교 CareerMatri" };

/**
 * AI·첨단산업 교육 분야 소개.
 *
 * **트랙이 무엇을 가르치는지 지어내지 않는다.** 우리가 아는 것은 그 트랙을
 * 어느 전공 검사로 재는가까지이고, 교육 내용은 사업단이 적는 글이다. 여기
 * 적는 것은 **그 검사가 실제로 묻는 영역의 이름**이고 그 값은 그 Core 의
 * taxonomy 가 들고 있다(학교 학과 화면과 같은 함수다).
 */
export default async function JjuFields() {
  const u = jjuUniversity();
  if (!u) notFound();
  const tracks = firstCohortTracks(u);
  const cohorts = cohortsOf(u);
  const program = officialProgram(u);
  const fields = [...new Map(tracks.map((t) => [t.field.code, t.field])).values()];
  const code = u.university_code.toLowerCase();

  return (
    <CampusShell u={u} wide>
      <div className="jju">
        {demoServer() ? <DemoRibbon /> : null}
        <div className="cm-cmp-sect-h">
          <h1 className="cm-cmp-title" style={{ color: "var(--pcu-ink)" }}>
            교육과정과 검사 연결
          </h1>
          <p>
            {cohorts.map((c) => c.label).join(" · ")} 같은 트랙 가정
          </p>
        </div>
        {program ? (
          <section className="jju-field">
            <h2>공식 교육과정</h2>
            <OfficialFacts p={program} />
          </section>
        ) : null}

        <h2 className="jju-split">검사 연결 트랙<span className="jju-demo-h">시연용 분류</span></h2>
        <p className="cm-cmp-note">
          아래 트랙은 사업단의 공식 트랙이 아니라, 공식 과정을 CareerMatri 전공
          검사에 잇기 위해 만든 시연용 분류입니다. 트랙마다 새 검사를 만들지
          않고 공통 전공 검사로 잇습니다. 적힌 영역은 그 검사가 실제로 묻는
          영역입니다.
        </p>

        {fields.map((f) => (
          <section className="jju-field" key={f.code}>
            <h2>{f.name}</h2>
            {tracks.filter((t) => t.field.code === f.code).map((t) => {
              const doms = t.core_code ? domainNames(t.core_code) : [];
              return (
                <article className="jju-track" id={t.code} key={t.code}>
                  <div className="jju-track-h">
                    <h3>{t.short}</h3>
                    <ModeChip mode={t.mode} />
                  </div>
                  <dl>
                    <dt>재는 검사</dt>
                    <dd>
                      {t.core_name ?? "정해지지 않음"}
                      {t.spec_name ? ` · ${t.spec_name} 갈래` : ""}
                    </dd>
                    <dt>묻는 영역</dt>
                    <dd>
                      {doms.length ? (
                        <span className="jju-domains">
                          {doms.map((d) => <span key={d}>{d}</span>)}
                        </span>
                      ) : "자료 없음"}
                    </dd>
                    <dt>구분</dt>
                    <dd>{t.official ? "공식 과정" : "시연용 분류 · 공식 트랙 아님"}</dd>
                    {t.note ? (<><dt>매핑 근거</dt><dd>{t.note}</dd></>) : null}
                  </dl>
                  <p className="jju-mode-note">{MODE_NOTE[t.mode]}</p>
                </article>
              );
            })}
          </section>
        ))}

        <div className="cm-cmp-acts">
          <Link className="cm-cmp-btn is-primary" href={`/campus/${code}/majors`}>
            내 트랙 고르고 검사 시작
          </Link>
          <Link className="cm-cmp-btn" href="/jju">처음으로</Link>
        </div>
      </div>
    </CampusShell>
  );
}
