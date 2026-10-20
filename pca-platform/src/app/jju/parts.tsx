import {
  FACT_STATUS_KO, MODE_KO, MODE_NOTE, type OfficialProgram, type TrackMode,
} from "@/lib/jju/program";

/**
 * 시연 서버라는 표시. **운영에서는 서지 않는다**(부르는 쪽이 `demoServer()`
 * 로 가린다).
 *
 * 시연 화면은 운영 화면과 똑같이 생겨서, 눌러 본 사람이 합성 데이터의 수를
 * 실제 학생 수로 읽는다. 쪽마다 맨 위에 적는다.
 */
export function DemoRibbon() {
  return (
    <p className="jju-ribbon" role="note">
      <b>시연 환경</b>
      학생과 응시는 합성 데모 데이터입니다. 컴퓨터·소프트웨어 검사는 전공자
      검토 전이라 이 서버에서만 열었고, 결과를 실제 진단으로 쓰지 않습니다.
    </p>
  );
}

/** 학과·과정이 지금 어떻게 열리는가. **색만으로 말하지 않는다**: 글자가 먼저다 */
export function ModeChip({ mode }: { mode: TrackMode }) {
  return (
    <span className={`jju-mode is-${mode.toLowerCase()}`} title={MODE_NOTE[mode]}>
      {MODE_KO[mode]}
    </span>
  );
}

/**
 * 공식 출처가 붙은 사업 사실. **학과·과정 목록과 같은 모양으로 그리지
 * 않는다**: 같은 줄 모양이면 둘이 한 목록으로 읽힌다.
 *
 * 사실마다 출처 번호와 상태를 글자로 적고, 사업비 줄에는 그것이 CareerMatri
 * 계약 예산이 아니라는 단서를 바로 붙인다.
 */
export function OfficialFacts({ p, courses = true }: { p: OfficialProgram; courses?: boolean }) {
  const src = new Map(p.sources.map((s) => [s.id, s]));
  return (
    <div className="jju-official">
      <ul className="jju-facts">
        {p.facts.map((f) => (
          <li key={f.id}>
            <span className="jju-fact-t">{f.text}</span>
            {f.caution ? <span className="jju-fact-c">{f.caution}</span> : null}
            <span className="jju-fact-m">
              <span className={`jju-fs is-${f.status === "EXISTS_DETAIL_UNVERIFIED" ? "partial" : "ok"}`}>
                {FACT_STATUS_KO[f.status]}
              </span>
              <a href={src.get(f.source)?.url} rel="noopener noreferrer">출처 {f.source}</a>
            </span>
          </li>
        ))}
      </ul>
      {courses && p.courses.length ? (
        <div className="jju-courses">
          <h3>공식 과정</h3>
          {p.courses.map((c) => (
            <p key={c.code}>
              <strong>{c.name}</strong>
              {c.topics.length ? <span>{c.topics.join(" · ")}</span>
                : <span className="jju-fact-c">세부 내용은 확인하지 못했습니다</span>}
            </p>
          ))}
        </div>
      ) : null}
      <p className="jju-src">
        확인한 날 {p.checked_on} · {p.sources.map((s) => (
          <a key={s.id} href={s.url} rel="noopener noreferrer">{s.id} {s.title}</a>
        ))}
        <br />
        <span>{p.verification_note}</span>
      </p>
    </div>
  );
}

/**
 * 부트캠프 과정이 다루는 주제를 **이 검사가 실제로 묻는가.**
 *
 * 값은 `coverageOf()` 가 문항 번호로 센 것이고(리포트와 같은 함수), 여기서는
 * 상태 글자만 적는다. 과정에서 배운다고 검사가 그것을 재는 것은 아니다:
 * `교육과정만` 은 검사가 묻지 않는 주제이고, 그 주제를 이수했다는 사실로
 * 역량을 확인했다고 적지 않는다.
 */
export function CourseCoverage({ rows }: { rows: { topic: string; status: string; how: string }[] }) {
  return (
    <div className="jju-scroll">
      <table className="jju-matrix jju-cov">
        <thead><tr><th>과정 주제</th><th>이 검사에서</th><th>어떻게</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.topic}>
              <td>{r.topic}</td>
              <td><span className={`jju-cv is-${r.status}`}>{CAP_KO[r.status] ?? r.status}</span></td>
              <td>{r.how}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CAP_KO: Record<string, string> = {
  MEASURED: "판정 문항이 묻는다", SELF_REPORT: "스스로 답한 칸에만", CURRICULUM: "과정만 다룬다", NOT_MEASURED: "묻지 않는다",
};
