import Link from "next/link";
import { notFound } from "next/navigation";
import "../../surface.css";
import "../../campus/campus.css";
import "../jju.css";
import { CampusShell } from "../../campus/shell";
import { domainNames } from "../../campus/domains";
import {
  cohortsOf, courseCoverage, demoServer, firstCohortTracks, jjuUniversity, MODE_NOTE, officialProgram,
} from "@/lib/jju/program";
import { CourseCoverage, DemoRibbon, ModeChip, OfficialFacts } from "../parts";

export const metadata = { title: "학과와 과정 · 전주대학교 CareerMatri" };

/**
 * 인공지능학과와 부트캠프 과정이 **어느 검사로, 어떤 영역을** 재는가.
 *
 * **학과와 과정이 무엇을 가르치는지 지어내지 않는다.** 우리가 아는 것은 그
 * 자리를 어느 전공 검사로 재는가까지이고, 적는 것은 **그 검사가 실제로 묻는
 * 영역의 이름**이다(그 Core 의 taxonomy · 학교 학과 화면과 같은 함수).
 * 과정은 공지에 적힌 주제와 검사의 문항을 나란히 놓는다(`courseCoverage`).
 */
export default async function JjuFields() {
  const u = jjuUniversity();
  if (!u) notFound();
  const rows = firstCohortTracks(u);
  const program = officialProgram(u);
  const cov = new Map(courseCoverage(u).map((c) => [c.course, c]));
  const code = u.university_code.toLowerCase();
  const cat = cohortsOf(u)[0];
  const groups = [
    { k: "DEPARTMENT", h: "학과", note: "학생의 소속입니다. 학과 페이지에 적힌 학과와 단과대학만 올렸습니다." },
    { k: "COURSE", h: "부트캠프 과정", note: "사업단이 운영하는 교육입니다. 학과가 아닙니다." },
  ] as const;

  return (
    <CampusShell u={u} wide>
      <div className="jju">
        {demoServer() ? <DemoRibbon /> : null}
        <div className="cm-cmp-sect-h">
          <h1 className="cm-cmp-title" style={{ color: "var(--pcu-ink)" }}>
            학과와 과정 · 검사 연결
          </h1>
          <p>{cat?.label}</p>
        </div>

        {groups.map((g) => (
          <section className="jju-field" key={g.k}>
            <h2>{g.h}</h2>
            <p className="cm-cmp-note">{g.note}</p>
            {rows.filter((t) => t.kind === g.k).map((t) => {
              const doms = t.core_code ? domainNames(t.core_code) : [];
              const c = cov.get(t.name);
              return (
                <article className="jju-track" id={t.code} key={t.code}>
                  <div className="jju-track-h">
                    <h3>{t.short}</h3>
                    <ModeChip mode={t.mode} />
                  </div>
                  <dl>
                    <dt>{t.kind === "DEPARTMENT" ? "단과대학" : "운영"}</dt>
                    <dd>{t.field.name}</dd>
                    <dt>재는 검사</dt>
                    <dd>
                      {t.core_name ?? "정해지지 않음"}
                      {t.spec_name ? ` · ${t.spec_name} 갈래` : ""}
                    </dd>
                    {doms.length ? (<><dt>묻는 영역</dt><dd>
                      <span className="jju-domains">{doms.map((d) => <span key={d}>{d}</span>)}</span>
                    </dd></>) : null}
                    {t.note ? (<><dt>연결 근거</dt><dd>{t.note}</dd></>) : null}
                  </dl>
                  {c ? <div style={{ marginTop: 12 }}><CourseCoverage rows={c.rows} /></div> : null}
                  <p className="jju-mode-note">{MODE_NOTE[t.mode]}</p>
                </article>
              );
            })}
          </section>
        ))}

        <section className="jju-field">
          <h2>등록 근거</h2>
          <p className="cm-cmp-note">{cat?.verification_note}</p>
          {cat?.sources?.length ? (
            <ul className="jju-flow">
              {cat.sources.map((s) => (
                <li key={s.url}><strong>{s.name}</strong><span>{s.note ?? ""}</span>
                  <span><a href={s.url} rel="noopener noreferrer">{s.url}</a></span></li>
              ))}
            </ul>
          ) : null}
        </section>

        {program ? (
          <section className="jju-field">
            <h2>부트캠프 공식 사실</h2>
            <OfficialFacts p={program} />
          </section>
        ) : null}

        <div className="cm-cmp-acts">
          <Link className="cm-cmp-btn is-primary" href={`/campus/${code}/majors`}>
            학과·과정 고르고 검사 시작
          </Link>
          <Link className="cm-cmp-btn" href="/jju">처음으로</Link>
        </div>
      </div>
    </CampusShell>
  );
}
