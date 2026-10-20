import type { Result } from "@/sejong/lib/analysis";
import { STATE_LABEL } from "@/sejong/lib/analysis";
import {
  LOCATION_LABEL, ORG_TYPE_LABEL, VERIFY_LABEL, areaName, orgsForAreas, reportable, sejongContent,
} from "@/sejong/lib/content";
import type { ExperienceRow } from "@/sejong/lib/store";
import { ResultView } from "./result-view";

const HORIZON: Record<string, string> = { D30: "30일", D60: "60일", D90: "90일" };

/**
 * 개인별 취업 전략 결과지. **웹 미리보기와 PDF 가 같은 이 컴포넌트를 그린다**:
 * PDF 는 이 쪽을 Chromium 으로 인쇄한 것이라 둘이 갈리지 않는다.
 * 읽는 값은 제출 때 굳힌 결과(`sj_attempts.result`) 하나다.
 */
export function ReportDoc({
  r, name, participantNo, programName, scoredAt, experiences, auxAllowed,
}: {
  r: Result; name: string; participantNo: string | null; programName: string; scoredAt: string;
  experiences: ExperienceRow[]; auxAllowed: boolean;
}) {
  const { region, orgsMeta, instrument } = sejongContent();
  const orgs = orgsForAreas(r.profile.job_areas, { reportableOnly: true });
  const sejong = orgs.filter((o) => o.region_scope === "SEJONG");
  const aux = auxAllowed ? orgs.filter((o) => o.region_scope !== "SEJONG") : [];
  const kindLabel = Object.fromEntries(instrument.experience_kinds.map((k) => [k.code, k.label]));
  const checkLabel = Object.fromEntries(instrument.experience_checks.map((c) => [c.code, c.label]));

  return (
    <article className="sj-paper" id="sj-report">
      <section className="cover">
        <span className="sj-badge demo">시연판 · DEMO 진단 결과지</span>
        <h1>개인별 취업 전략 결과지</h1>
        <p className="lead">{name} · 참여번호 {participantNo ?? "-"}</p>
        <p className="small">{programName} · 진단 제출 {scoredAt.slice(0, 10)}</p>
        <p className="small muted">세종일자리경제진흥원 × CareerMatri · 진단 {r.instrument_version} · 분석 {r.analysis_version}</p>
        <p className="small muted">
          이 문서는 검증 전 시연판 진단으로 만든 것입니다. 총점·순위·적합도 숫자를 담지 않으며 선발·평가에 쓰지 않습니다.
        </p>
      </section>

      <section>
        <h2>1. 한눈에 보기</h2>
        <ul>
          <li>희망 직무: {r.profile.job_areas.map(areaName).join(", ")}</li>
          <li>경험으로 받쳐진 판단: {r.strengths.length ? r.axes.filter((a) => r.strengths.includes(a.axis)).map((a) => a.name).join(", ") : "아직 없음"}</li>
          <li>희망 직무에서 채울 판단: {[...new Set(r.gaps.map((g) => g.axis))].map((x) => r.axes.find((a) => a.axis === x)?.name).join(", ") || "없음"}</li>
          <li>기록한 경험: {experiences.length}건 (제출 당시 {r.evidence_count}건)</li>
        </ul>
      </section>

      <section>
        <h2>2. 역량 분석</h2>
        <ResultView r={r} />
      </section>

      <section className="pb">
        <h2>3. 경험과 경력 근거</h2>
        {experiences.length === 0 ? <p className="muted">기록한 경험이 없습니다.</p> : (
          <table className="sj-table">
            <thead><tr><th>종류</th><th>경험</th><th>말할 수 있는 것</th></tr></thead>
            <tbody>
              {experiences.map((e) => (
                <tr key={e.id}>
                  <td>{kindLabel[e.kind] ?? e.kind}</td>
                  <td><b>{e.title}</b><div className="small muted">{[e.org_name, e.period_text].filter(Boolean).join(" · ")}</div></td>
                  <td className="small">{e.checks.map((c) => checkLabel[c] ?? c).join(" / ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="small muted">지원서·면접에서는 '경험으로 확인됨' 판단의 근거 경험부터 구체적인 숫자·기간·결과와 함께 말하세요. 숫자와 결과는 본인이 직접 적습니다.</p>
      </section>

      <section>
        <h2>4. 세종 산업 환경</h2>
        <ul className="small">
          {sejongContent().links.clusters.map((c) => <li key={c.code}><b>{c.name}</b> — {c.where} ({c.orgs.length}곳 조사)</li>)}
        </ul>
        <ul className="small">
          {region.facts.map((f, i) => <li key={i}>{f.text} [{VERIFY_LABEL[f.verify]} · {f.sources.map((s) => s.title).join(", ")}]</li>)}
        </ul>
      </section>

      <section className="pb">
        <h2>5. 세종 사업장 기업·기관 탐색</h2>
        <p className="small">{region.notices.info_only} {region.notices.hiring}</p>
        <p className="small muted">공식 출처로 세종 사업장 소재를 확인한 곳만 싣습니다. {orgsMeta.access_note}</p>
        <table className="sj-table">
          <thead><tr><th>기업·기관</th><th>세종 사업장</th><th>업종·사업</th><th>확인 상태</th><th>채용</th></tr></thead>
          <tbody>
            {sejong.map((o) => (
              <tr key={o.id}>
                <td><b>{o.name}</b><div className="small muted">{ORG_TYPE_LABEL[o.org_type]} · {LOCATION_LABEL[o.location_basis]}</div></td>
                <td className="small">{o.sejong_sites[0]?.address}</td>
                <td className="small">{o.industry_text}</td>
                <td className="small">{VERIFY_LABEL[o.verify]}<div className="muted">{o.sources[0]?.checked_on}</div></td>
                <td className="small">미확인</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sejong.length === 0 ? <p className="muted">고른 직무와 이어지는 확인된 곳이 아직 없습니다.</p> : null}
      </section>

      <section>
        <h2>6. 보조 권역 (대전·충남·충북)</h2>
        {auxAllowed
          ? (aux.length ? <p className="small">{aux.map((o) => o.name).join(", ")}</p> : <p className="small muted">{region.aux_status}</p>)
          : <p className="small muted">희망 지역 범위 또는 참여 사업의 지역 조건에 따라 싣지 않습니다.</p>}
      </section>

      <section className="pb">
        <h2>7. 30·60·90일 실행 계획</h2>
        <table className="sj-table">
          <thead><tr><th>기한</th><th>할 일</th></tr></thead>
          <tbody>
            {r.actions.map((x) => <tr key={x.code}><td>{HORIZON[x.horizon]}</td><td>{x.text}</td></tr>)}
          </tbody>
        </table>
      </section>

      <section>
        <h2>8. 진흥원 지원사업 안내</h2>
        <p className="small muted">진흥원과 사업 목록이 확정되면 이 자리에 연결합니다. 시연판에서는 비워 둡니다.</p>
      </section>

      <section>
        <h2>9. 근거·출처·한계</h2>
        <ul className="small">
          <li>진단 {r.instrument_version} 은 검증 전 시연판입니다. 문항 24개, 판단 여덟 갈래(CareerMatri ME_V3 의 판단 축 이름을 그대로 씀).</li>
          <li>상태 규칙({r.analysis_version}): 두 문항 이상이 '직접 해 봤다' 이상이고 경험 근거가 둘이면 '{STATE_LABEL.CONFIRMED}', 하나면 '{STATE_LABEL.PARTIAL}', 없으면 '{STATE_LABEL.CLAIMED}'.</li>
          <li>기업·기관 자료는 공식 출처의 검색 발췌로 확인했고 원문 재확인 전입니다(확인일 {orgsMeta.checked_on}). 직무 연결은 시연용 해석입니다.</li>
          <li>채용 여부, 취업 가능성, 지역 정주 결과를 이 문서가 산출하지 않습니다.</li>
        </ul>
      </section>
    </article>
  );
}
