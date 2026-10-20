import type { Result } from "@/sejong/lib/analysis";
import { STATE_LABEL } from "@/sejong/lib/analysis";
import {
  LOCATION_LABEL, ORG_TYPE_LABEL, VERIFY_LABEL, areaName, orgsForAreas, sejongContent,
} from "@/sejong/lib/content";
import type { ExperienceRow } from "@/sejong/lib/store";
import { StateBadge } from "./result-view";

const HORIZON: Record<string, string> = { D30: "30일 안에", D60: "60일 안에", D90: "90일 안에" };
const KIND: Record<string, string> = { evidence: "근거 남기기", growth: "채우기", region: "세종 탐색", apply: "지원" };

/**
 * 개인별 취업 전략 결과지. **웹 미리보기와 PDF 가 같은 이 컴포넌트를 그린다**:
 * PDF 는 이 쪽을 Chromium 으로 인쇄한 것이라 둘이 갈리지 않는다.
 * 읽는 값은 제출 때 굳힌 결과(`sj_attempts.result`) 하나다.
 *
 * **편집 짜임**(2026-10-20 사용자 제공 참고 보고서): 짙은 파랑 표지 · 장마다 아래를 파랑으로
 * 채운 구분 쪽 · 흰 본문 쪽의 파란 머리띠와 번호 붙은 절. 참고 문서의 내용·로고는 쓰지 않는다.
 * 구분 쪽에도 **그 사람의 값**이 한 줄 선다: 쪽 수를 채우는 빈 쪽을 두지 않는다.
 *
 * 종이 여백은 공통 엔진(`drawPagePdf`, 14mm · 머리말·꼬리말)이 정한다. 고치지 않았고,
 * 표지를 종이 끝까지 채우는 일은 `COMMON_CORE_CHANGE_REQUEST.md` CR-7 로 넘겼다.
 *
 * 화면 미리보기(`scripts/sejong/preview/app.js` 의 reportDoc)가 이 짜임을 옮겨 적는다.
 * 여기를 고치면 거기도 고친다.
 */
export function ReportDoc({
  r, name, participantNo, programName, scoredAt, experiences, auxAllowed,
}: {
  r: Result; name: string; participantNo: string | null; programName: string; scoredAt: string;
  experiences: ExperienceRow[]; auxAllowed: boolean;
}) {
  const { region, orgsMeta, instrument, links, levels } = sejongContent();
  const orgs = orgsForAreas(r.profile.job_areas, { reportableOnly: true });
  const sejong = orgs.filter((o) => o.region_scope === "SEJONG");
  const aux = auxAllowed ? orgs.filter((o) => o.region_scope !== "SEJONG") : [];
  const kindLabel = Object.fromEntries(instrument.experience_kinds.map((k) => [k.code, k.label]));
  const checkLabel = Object.fromEntries(instrument.experience_checks.map((c) => [c.code, c.label]));
  const regionLabel = instrument.region_ranges.options.find((o) => o.code === r.profile.region_range)?.label ?? "-";
  const audienceLabel = instrument.audiences.options.find((o) => o.code === r.profile.audience)?.label ?? "선택하지 않음";

  const strong = r.axes.filter((a) => a.state === "CONFIRMED" || a.state === "PARTIAL");
  const claimed = r.axes.filter((a) => a.state === "CLAIMED");
  const toFill = r.axes.filter((a) => a.state === "NONE" || a.state === "EXPOSED");
  const gapAxes = [...new Set(r.gaps.map((g) => g.axis))].map((x) => r.axes.find((a) => a.axis === x)!).filter(Boolean);
  const byH = (h: string) => r.actions.filter((x) => x.horizon === h);
  const areas = r.profile.job_areas.map(areaName).join(" · ");

  return (
    <article className="sj-paper sj-rp" id="sj-report">
      {/* ── 표지 ── */}
      <section className="rp-cover">
        <CoverArt />
        <div className="rp-cover-top">
          <span className="rp-kicker">SEJONG · CAREER STRATEGY REPORT</span>
          <span className="sj-badge demo">시연판 · DEMO 진단 결과지</span>
        </div>
        <div className="rp-cover-title">
          <h1>개인별 취업 전략 결과지</h1>
          <p>해 온 일로 다음 일을 찾습니다</p>
        </div>
        <dl className="rp-cover-meta">
          <div><dt>이름</dt><dd>{name}</dd></div>
          <div><dt>참여번호</dt><dd>{participantNo ?? "-"}</dd></div>
          <div><dt>참여 사업</dt><dd>{programName}</dd></div>
          <div><dt>진단 제출</dt><dd>{scoredAt.slice(0, 10)}</dd></div>
          <div className="wide"><dt>희망 직무</dt><dd>{areas}</dd></div>
        </dl>
        <div className="rp-cover-foot">
          <b>세종일자리경제진흥원 × CareerMatri</b>
          <span>진단 {r.instrument_version} · 분석 {r.analysis_version}</span>
          <span>검증 전 시연판 진단으로 만든 문서입니다. 총점·순위·적합도 숫자를 담지 않으며 선발·평가에 쓰지 않습니다.</span>
        </div>
      </section>

      {/* ── 차례 · 읽는 법 ── */}
      <section className="rp-page">
        <Band part="CONTENTS" title="차례와 읽는 법" />
        <div className="rp-toc">
          <TocPart no="01" title="지금의 나" items={["1.1 한눈에 보기", "1.2 희망 직무별 분석", "1.3 판단 여덟 갈래", "1.4 경험과 경력 근거"]} />
          <TocPart no="02" title="세종에서 찾기" items={["2.1 세종 산업 환경", "2.2 이어 볼 사업장", "2.3 보조 권역"]} />
          <TocPart no="03" title="다음 90일" items={["3.1 30·60·90일 실행 계획", "3.2 진흥원 지원사업 안내"]} />
          <TocPart no="부록" title="근거·출처·한계" items={["진단과 분석 규칙", "자료의 확인 상태"]} />
        </div>
        <h2 className="rp-h"><i>i</i>이 결과지를 읽는 법</h2>
        <p className="small">
          점수는 없습니다. 판단 여덟 갈래마다 <b>진단에서 고른 단계</b>와 <b>경험 기록이 받쳐 주는지</b>를 함께 보고 다섯 상태 가운데 하나를 적습니다.
        </p>
        <table className="sj-table rp-legend">
          <tbody>
            <tr><td><StateBadge state="CONFIRMED" /></td><td>두 문항 이상에서 &lsquo;직접 해 봤다&rsquo; 이상을 골랐고, 그 판단을 받치는 경험 기록이 둘 이상입니다.</td></tr>
            <tr><td><StateBadge state="PARTIAL" /></td><td>같은 조건에서 경험 근거가 하나입니다. 다른 경험에서 하나 더 찾으면 &lsquo;확인됨&rsquo;이 됩니다.</td></tr>
            <tr><td><StateBadge state="CLAIMED" /></td><td>직접 해 봤다고 답했지만 아직 경험 기록이 없습니다.</td></tr>
            <tr><td><StateBadge state="EXPOSED" /></td><td>옆에서 보거나 정해진 대로 따라 해 본 단계입니다.</td></tr>
            <tr><td><StateBadge state="NONE" /></td><td>아직 해 보지 않았다고 답했습니다.</td></tr>
          </tbody>
        </table>
        <p className="small muted">단계 뜻 — L1 {levels.L1} · L2 {levels.L2} · L3 {levels.L3}</p>
      </section>

      {/* ── 01 ── */}
      <Divider
        no="01" title="지금의 나"
        msg={`경험으로 받쳐진 판단 ${strong.length}갈래 · 희망 직무에서 채울 판단 ${gapAxes.length}갈래`}
        items={["한눈에 보기", "희망 직무별 분석", "판단 여덟 갈래", "경험과 경력 근거"]}
      />

      <section className="rp-page">
        <Band part="Part 01 · 지금의 나" title="1.1 한눈에 보기" />
        <div className="rp-kpis">
          <div className="ok"><b>{strong.length}<small> / 8</small></b><span>경험으로 받쳐진 판단</span></div>
          <div className="brand"><b>{claimed.length}<small> / 8</small></b><span>응답으로만 확인</span></div>
          <div><b>{toFill.length}<small> / 8</small></b><span>접해 봤거나 아직인 판단</span></div>
          <div><b>{experiences.length}<small>건</small></b><span>기록한 경험 (제출 당시 {r.evidence_count}건)</span></div>
        </div>
        <table className="sj-table rp-kv">
          <tbody>
            <tr><th>희망 직무</th><td>{areas}</td></tr>
            <tr><th>희망 지역 범위</th><td>{regionLabel}</td></tr>
            <tr><th>해당 구분</th><td>{audienceLabel}</td></tr>
            <tr><th>보유 기술·도구</th><td>{r.profile.skills.length ? r.profile.skills.join(", ") : "-"}</td></tr>
          </tbody>
        </table>
        <div className="rp-two">
          <div className="rp-box ok">
            <h3>지원서에 먼저 쓸 판단</h3>
            {strong.length ? (
              <ul>{strong.map((a) => <li key={a.axis}><b>{a.name}</b> — 근거: {a.evidence.map((e) => e.title).join(" · ")}</li>)}</ul>
            ) : <p className="small muted">아직 없습니다. 해 본 일을 경험 기록에 적으면 &lsquo;응답만&rsquo; 판단이 확인으로 바뀔 수 있습니다.</p>}
          </div>
          <div className="rp-box">
            <h3>희망 직무에서 먼저 채울 판단</h3>
            {gapAxes.length ? (
              <ul>{gapAxes.map((a) => <li key={a.axis}><b>{a.name}</b> — {a.question}</li>)}</ul>
            ) : <p className="small muted">고른 직무의 핵심 판단에 비어 있는 칸이 없습니다.</p>}
          </div>
        </div>

        <h2 className="rp-h"><i>1.2</i>희망 직무별 분석</h2>
        <div className="rp-two">
          {r.areas.map((ar) => (
            <div key={ar.code} className="rp-box">
              <h3>{ar.name}</h3>
              <p className="small muted">{ar.one_line}</p>
              <p className="small">
                <span className="sj-badge ok">확인 {ar.counts.confirmed}</span>{" "}
                <span className="sj-badge brand">응답만 {ar.counts.claimed}</span>{" "}
                <span className="sj-badge">채울 것 {ar.counts.to_fill}</span>
              </p>
              <ul className="small">
                {ar.key.map((k) => <li key={k.axis}>{k.name} — <StateBadge state={k.state} /></li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rp-page">
        <Band part="Part 01 · 지금의 나" title="1.3 판단 여덟 갈래" />
        <p className="small muted">막대는 진단에서 고른 단계(두 문항 이상이 닿은 단계), 초록은 경험 기록이 받친 칸입니다.</p>
        <table className="sj-table rp-axes">
          <thead><tr><th>판단</th><th>고른 단계</th><th>상태</th><th>근거 경험</th></tr></thead>
          <tbody>
            {r.axes.map((a) => (
              <tr key={a.axis}>
                <td><b>{a.name}</b><div className="small muted">{a.question}</div></td>
                <td><Steps level={a.level} ev={a.state === "CONFIRMED" || a.state === "PARTIAL"} /></td>
                <td><StateBadge state={a.state} /></td>
                <td className="small">
                  {a.evidence.length ? a.evidence.map((e) => e.title).join(" · ")
                    : a.evidence_possible ? "-" : <span className="muted">경험 기록으로 확인하는 칸이 없는 판단</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.quality.flat ? (
          <p className="sj-note warn">응답이 한 값에 몰려 있습니다. 결과를 해석하기 전에 상담사와 함께 다시 보기를 권합니다.</p>
        ) : null}

      </section>

      <section className="rp-page">
        <Band part="Part 01 · 지금의 나" title="1.4 경험과 경력 근거" />
        {experiences.length === 0 ? <p className="muted">기록한 경험이 없습니다.</p> : (
          <table className="sj-table">
            <thead><tr><th>종류</th><th>경험</th><th>말할 수 있는 것</th></tr></thead>
            <tbody>
              {experiences.map((e) => (
                <tr key={e.id}>
                  <td className="small">{kindLabel[e.kind] ?? e.kind}</td>
                  <td><b>{e.title}</b><div className="small muted">{[e.org_name, e.period_text].filter(Boolean).join(" · ")}</div></td>
                  <td className="small">{e.checks.map((c) => checkLabel[c] ?? c).join(" / ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="rp-box rp-tip">
          <h3>지원서·면접에서 이렇게 씁니다</h3>
          {strong.length ? (
            <>
              <ol className="small">
                {strong.map((a) => (
                  <li key={a.axis}>
                    <b>{a.name}</b>: &lsquo;{a.evidence[0]?.title}&rsquo;에서 &ldquo;{a.question}&rdquo;에 답하는 문장
                  </li>
                ))}
              </ol>
              <p className="small muted">문장에 들어갈 숫자·기간·결과는 본인이 직접 채웁니다. 이 문서는 문장을 대신 지어 주지 않습니다.</p>
            </>
          ) : <p className="small">&lsquo;응답만&rsquo; 판단부터 경험 하나씩 기록해 근거를 만듭니다. 이 문서는 문장을 대신 지어 주지 않습니다.</p>}
        </div>
      </section>

      {/* ── 02 ── */}
      <Divider
        no="02" title="세종에서 찾기"
        msg={`고른 직무와 이어지는 세종 사업장 ${sejong.length}곳 (공식 출처로 소재 확인) · 채용 여부는 확인하지 않았습니다`}
        items={["세종 산업 환경", "이어 볼 사업장", "보조 권역"]}
      />

      <section className="rp-page">
        <Band part="Part 02 · 세종에서 찾기" title="2.1 세종 산업 환경" />
        <div className="rp-clusters">
          {links.clusters.map((c) => (
            <div key={c.code}><b>{c.name}</b><span>{c.where}</span><em>{c.orgs.length}곳 조사</em></div>
          ))}
        </div>
        <ul className="small rp-facts">
          {region.facts.map((f, i) => (
            <li key={i}>{f.text} <span className="sj-badge part">{VERIFY_LABEL[f.verify]}</span> <span className="muted">{f.sources.map((s) => s.title).join(", ")}</span></li>
          ))}
        </ul>

        <h2 className="rp-h"><i>2.2</i>이어 볼 사업장</h2>
        <p className="small">{region.notices.info_only} {region.notices.hiring}</p>
        <p className="small muted">공식 출처로 세종 사업장 소재를 확인한 곳만 싣습니다. 순서는 자료 순서이고 점수로 줄 세우지 않았습니다.</p>
        <table className="sj-table rp-orgs">
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

        <h2 className="rp-h"><i>2.3</i>보조 권역 (대전·충남·충북)</h2>
        {auxAllowed
          ? (aux.length ? <p className="small">{aux.map((o) => o.name).join(", ")}</p> : <p className="small muted">{region.aux_status}</p>)
          : <p className="small muted">희망 지역 범위 또는 참여 사업의 지역 조건에 따라 싣지 않습니다.</p>}
      </section>

      {/* ── 03 ── */}
      <Divider
        no="03" title="다음 90일"
        msg={`할 일 ${r.actions.length}가지 · 30일 ${byH("D30").length} · 60일 ${byH("D60").length} · 90일 ${byH("D90").length}`}
        items={["30·60·90일 실행 계획", "진흥원 지원사업 안내"]}
      />

      <section className="rp-page">
        <Band part="Part 03 · 다음 90일" title="3.1 30·60·90일 실행 계획" />
        <p className="small">먼저 이미 한 일을 근거로 남기고, 희망 직무에서 비어 있는 판단을 채우고, 원 공고에 직접 지원합니다. 플랫폼이 대신 지원하지 않습니다.</p>
        <div className="rp-timeline">
          {(["D30", "D60", "D90"] as const).map((h) => (
            <div key={h}>
              <h3>{HORIZON[h]}</h3>
              <ol>
                {byH(h).map((x) => <li key={x.code}><span className="sj-badge">{KIND[x.kind]}</span> {x.text}</li>)}
              </ol>
            </div>
          ))}
        </div>
        <h2 className="rp-h"><i>3.2</i>진흥원 지원사업 안내</h2>
        <p className="small muted">진흥원과 사업 목록이 확정되면 이 자리에 연결합니다. 시연판에서는 비워 둡니다.</p>

        <h2 className="rp-h"><i>부록</i>근거·출처·한계</h2>
        <ul className="small">
          <li>진단 {r.instrument_version} 은 검증 전 시연판입니다. 문항 24개, 판단 여덟 갈래(CareerMatri ME_V3 의 판단 축 이름을 그대로 씀).</li>
          <li>상태 규칙({r.analysis_version}): 두 문항 이상이 &lsquo;직접 해 봤다&rsquo; 이상이고 경험 근거가 둘이면 &lsquo;{STATE_LABEL.CONFIRMED}&rsquo;, 하나면 &lsquo;{STATE_LABEL.PARTIAL}&rsquo;, 없으면 &lsquo;{STATE_LABEL.CLAIMED}&rsquo;.</li>
          <li>기업·기관 자료는 공식 출처의 검색 발췌로 확인했고 원문 재확인 전입니다(확인일 {orgsMeta.checked_on}). 직무 연결은 시연용 해석입니다.</li>
          <li>채용 여부, 취업 가능성, 지역 정주 결과를 이 문서가 산출하지 않습니다.</li>
        </ul>
      </section>
    </article>
  );
}

function Band({ part, title }: { part: string; title: string }) {
  return (
    <header className="rp-band">
      <span>{part}</span>
      <h2>{title}</h2>
    </header>
  );
}

function TocPart({ no, title, items }: { no: string; title: string; items: string[] }) {
  return (
    <div className="rp-toc-part">
      <b>{no}</b>
      <div><h3>{title}</h3><ul>{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
    </div>
  );
}

function Divider({ no, title, msg, items }: { no: string; title: string; msg: string; items: string[] }) {
  return (
    <section className="rp-divider">
      <div className="rp-div-top"><span>Part</span><b>{no}</b></div>
      <div className="rp-div-bottom">
        <CoverArt small />
        <h2>{title}</h2>
        <p className="rp-div-msg">{msg}</p>
        <ul>{items.map((i, k) => <li key={i}>{no}.{k + 1} {i}</li>)}</ul>
      </div>
    </section>
  );
}

function Steps({ level, ev }: { level: number; ev: boolean }) {
  return (
    <span className="sj-steps" aria-hidden>
      {[1, 2, 3].map((k) => <i key={k} className={k <= level ? (ev ? "ev" : "on") : ""} />)}
    </span>
  );
}

/** 추상 도형(원·곡선·점). 값을 그린 것이 아니다 */
function CoverArt({ small = false }: { small?: boolean }) {
  return (
    <svg className={small ? "rp-art small" : "rp-art"} viewBox="0 0 600 600" aria-hidden>
      <defs>
        <radialGradient id={small ? "rpg2" : "rpg1"} cx="35%" cy="35%" r="70%">
          <stop offset="0" stopColor="#6aa6ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#1d4fd8" stopOpacity="0" />
        </radialGradient>
        <pattern id={small ? "rpd2" : "rpd1"} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="#ffffff" fillOpacity="0.35" />
        </pattern>
      </defs>
      <circle cx="380" cy="300" r="190" fill={`url(#${small ? "rpg2" : "rpg1"})`} />
      <circle cx="380" cy="300" r="240" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M150 420 C 230 330, 330 300, 450 330" fill="none" stroke="#e3a73b" strokeWidth="10" strokeLinecap="round" />
      <path d="M420 150 C 470 175, 505 215, 520 265" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="9" strokeLinecap="round" />
      <path d="M110 200 C 140 160, 180 140, 225 135" fill="none" stroke="#e3a73b" strokeWidth="7" strokeLinecap="round" />
      <rect x="40" y="440" width="160" height="112" fill={`url(#${small ? "rpd2" : "rpd1"})`} />
    </svg>
  );
}
