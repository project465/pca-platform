import { STATE_LABEL, type AxisState, type Result } from "@/sejong/lib/analysis";
import { sejongContent } from "@/sejong/lib/content";

/** 상태를 색 대신 글자로 먼저 읽게 한다. 색은 거든다 */
export function StateBadge({ state }: { state: AxisState }) {
  const cls = state === "CONFIRMED" ? "ok" : state === "PARTIAL" ? "part" : state === "CLAIMED" ? "brand" : "";
  return <span className={`sj-badge ${cls}`}>{STATE_LABEL[state]}</span>;
}

/** 0~3 단계를 네 칸으로. 근거가 받친 칸은 초록이다. 숫자를 적지 않는다 */
function Steps({ level, confirmed }: { level: number; confirmed: boolean }) {
  return (
    <span className="sj-steps" aria-hidden>
      {[1, 2, 3].map((k) => <i key={k} className={k <= level ? (confirmed ? "ev" : "on") : ""} />)}
    </span>
  );
}

export function ResultView({ r }: { r: Result }) {
  const { levels, instrument } = sejongContent();
  const regionLabel = instrument.region_ranges.options.find((o) => o.code === r.profile.region_range)?.label;
  return (
    <>
      <section className="sj-card">
        <h2>희망 직무에서 본 지금의 나</h2>
        <p className="small muted">
          총점이나 적합도 숫자는 없습니다. 고른 직무에서 자주 쓰는 판단마다 지금 어디까지 확인됐는지를 적습니다.
          {regionLabel ? ` 희망 지역 범위: ${regionLabel}.` : ""}
        </p>
        <div className="sj-grid c2">
          {r.areas.map((ar) => (
            <div key={ar.code} className="sj-card" style={{ background: "#fbfcfd" }}>
              <h3>{ar.name}</h3>
              <p className="small muted">{ar.one_line}</p>
              <p className="small">
                <span className="sj-badge ok">확인 {ar.counts.confirmed}</span>{" "}
                <span className="sj-badge brand">응답만 {ar.counts.claimed}</span>{" "}
                <span className="sj-badge">채울 것 {ar.counts.to_fill}</span>
              </p>
              <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {ar.key.map((k) => (
                  <li key={k.axis}>{k.name} — <StateBadge state={k.state} /></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="sj-card">
        <h2>판단 여덟 갈래</h2>
        <p className="small muted">
          막대는 진단에서 고른 단계(두 문항 이상이 닿은 단계)이고, 초록은 경험 기록이 받친 칸입니다.
          단계 뜻: L1 {levels.L1} · L2 {levels.L2} · L3 {levels.L3}
        </p>
        {r.axes.map((a) => (
          <div key={a.axis} className="sj-axis">
            <div><b>{a.name}</b><div className="small muted">{a.question}</div></div>
            <div>
              <Steps level={a.level} confirmed={a.state === "CONFIRMED" || a.state === "PARTIAL"} />
              {a.evidence.length ? (
                <div className="small muted" style={{ marginTop: 4 }}>근거: {a.evidence.map((e) => e.title).join(" · ")}</div>
              ) : !a.evidence_possible ? (
                <div className="small muted" style={{ marginTop: 4 }}>경험 기록으로 확인하는 칸이 없는 판단입니다</div>
              ) : null}
            </div>
            <div><StateBadge state={a.state} /></div>
          </div>
        ))}
      </section>

      {r.quality.flat ? (
        <p className="sj-note warn">응답이 한 값에 몰려 있습니다. 결과를 해석하기 전에 상담사와 함께 다시 보기를 권합니다.</p>
      ) : null}
    </>
  );
}
