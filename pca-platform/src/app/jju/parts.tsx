import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/sf/brand-mark";
import { jjuUniversity, MODE_KO, MODE_NOTE, type OfficialProgram, type TrackMode } from "@/lib/jju/program";

/**
 * 전주대 화면의 틀. **학교 진입 화면의 남색 띠(`CampusShell`)를 쓰지 않는다.**
 * 그 띠는 공통 파일이라 고칠 수 없고, 이 쪽은 흰 바탕에 글이 먼저 서는
 * 생김새(토스·카카오 쪽)로 간다. 틀이 하는 일은 셋뿐이다: 학교 이름 · 상표 ·
 * 오른쪽 한 자리.
 */
export function JjuFrame({ right, children, narrow }: {
  right?: ReactNode; children: ReactNode; narrow?: boolean;
}) {
  const logo = jjuUniversity()?.brand_asset ?? null;
  return (
    <div className="jju-app" data-school="jju">
      <header className="jju-top">
        <div className="jju-top-in">
          <Link className="jju-top-id" href="/jju">
            {logo
              ? <img className="jju-top-logo" src={logo} alt="전주대학교" />
              : <span>전주대학교</span>}
            <span className="jju-top-cm"><BrandMark size={18} />CareerMatri</span>
          </Link>
          {right ? <div className="jju-top-r">{right}</div> : null}
        </div>
      </header>
      <main className={`jju-main${narrow ? " is-narrow" : ""}`}>{children}</main>
      <footer className="jju-foot">
        담당자는 학과·과정별 인원만 봐요. 내 답과 결과는 나만 볼 수 있어요.
      </footer>
    </div>
  );
}

/**
 * 시연 서버라는 표시. **운영에서는 서지 않는다**(부르는 쪽이 `demoServer()`
 * 로 가린다). 시연 화면은 운영 화면과 똑같이 생겨서 합성 데이터의 수를 실제
 * 학생 수로 읽는다. 그래서 한 줄로라도 쪽마다 적는다.
 */
export function DemoRibbon() {
  return (
    <p className="jju-ribbon" role="note">
      시연용 화면이에요. 학생과 응시는 만든 데이터이고, 결과는 실제 진단으로 쓰지 않아요.
    </p>
  );
}

/** 학과·과정이 지금 어떻게 열리는가. 글자가 먼저고 색은 거든다 */
export function ModeChip({ mode }: { mode: TrackMode }) {
  return (
    <span className={`jju-mode is-${mode.toLowerCase()}`} title={MODE_NOTE[mode]}>
      {MODE_KO[mode]}
    </span>
  );
}

/** 오른쪽 꺾쇠. 글자(`›`)로 두지 않는다: 활자마다 자리와 키가 다르다 */
export function Chev() {
  return (
    <svg className="jju-chev" width="8" height="14" viewBox="0 0 8 14" aria-hidden="true">
      <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 공식 출처가 붙은 사업 사실.
 *
 * **학생에게는 사실과 출처만 보인다.** 원문 대조 여부 같은 검수 기록은
 * fixture 의 `verification_note` · `caution` 이 그대로 들고 있고, 사업단
 * 화면의 `자료 출처` 펼침에서 읽는다. 학생 화면에 검수 기록을 적으면 그 쪽이
 * 검수 문서로 읽힌다.
 *
 * 화면 문장은 `say` 를 쓰고(해요체), 없으면 원문(`text`)을 쓴다. 세부가
 * 확인되지 않은 사실과 사업비 줄에는 `note` 를 바로 붙인다.
 */
export function OfficialFacts({ p }: { p: OfficialProgram }) {
  const src = new Map(p.sources.map((s) => [s.id, s]));
  return (
    <div className="jju-card">
      <ul className="jju-facts">
        {p.facts.map((f) => (
          <li key={f.id}>
            <span className="jju-fact-t">{f.say ?? f.text}</span>
            {f.note ? <span className="jju-fact-n">{f.note}</span> : null}
          </li>
        ))}
      </ul>
      <p className="jju-src">
        {p.checked_on.replaceAll("-", ".")} 전주대학교 {p.sources.map((s, i) => (
          <span key={s.id}>{i ? " · " : ""}
            <a href={src.get(s.id)?.url} rel="noopener noreferrer">{s.kind === "official_notice" ? "공지" : "뉴스"}</a>
          </span>
        ))} 기준
      </p>
    </div>
  );
}

/**
 * 부트캠프 과정이 다루는 주제를 **이 검사가 실제로 묻는가.**
 *
 * 값은 `coverageOf()` 가 문항 번호로 센 것이다(리포트와 같은 함수). 여기서는
 * 상태를 사람의 말 한 마디로 적는다. 과정에서 배운다고 검사가 그것을 재는
 * 것은 아니다: 그 사실은 표 아래 한 번만 적는다(줄마다 되풀이하지 않는다).
 */
export function CourseCoverage({ rows }: { rows: { topic: string; status: string; how: string }[] }) {
  return (
    <ul className="jju-cov">
      {rows.map((r) => (
        <li key={r.topic}>
          <span>{r.topic}</span>
          <span className={`jju-cv is-${r.status}`}>{CAP_KO[r.status] ?? r.status}</span>
        </li>
      ))}
    </ul>
  );
}

const CAP_KO: Record<string, string> = {
  MEASURED: "검사에서 물어봐요",
  SELF_REPORT: "스스로 답하는 칸에만 있어요",
  CURRICULUM: "검사에서는 묻지 않아요",
  NOT_MEASURED: "검사에서는 묻지 않아요",
};
