import { LOCATION_LABEL, ORG_TYPE_LABEL, VERIFY_LABEL, areaName, reportable, sejongContent, type Org } from "@/sejong/lib/content";

function verifyClass(v: Org["verify"]): string {
  if (v === "OFFICIAL_CROSSCHECKED") return "ok";
  if (v === "OFFICIAL_SINGLE") return "brand";
  if (v === "CONFLICTING") return "warn";
  return "part";
}

/**
 * 기업·기관 한 곳. **채용 중이라고 쓰지 않는다**: 채용 칸은 늘 '미확인'이다.
 * 주소·업종·확인 상태·출처를 함께 보여 준다.
 */
export function OrgCard({ o, compact = false }: { o: Org; compact?: boolean }) {
  const { links } = sejongContent();
  const areas = links.links[o.id] ?? [];
  const site = o.sejong_sites[0];
  return (
    <div className="sj-card sj-org" data-org={o.id}>
      <div className="meta">
        <span className="sj-badge">{ORG_TYPE_LABEL[o.org_type]}</span>
        <span className="sj-badge">{LOCATION_LABEL[o.location_basis]}</span>
        <span className={`sj-badge ${verifyClass(o.verify)}`}>{VERIFY_LABEL[o.verify]}</span>
        <span className="sj-badge warn">채용 여부 미확인</span>
        {!reportable(o) ? <span className="sj-badge part">결과지 제외</span> : null}
      </div>
      <h3 style={{ marginTop: 4 }}>{o.name}</h3>
      <div className="addr">
        {site ? <>사업장: {site.address}{site.label ? ` (${site.label})` : ""}</> : "세종 사업장 주소 확인 안 됨"}
        {o.hq.address && o.location_basis !== "HQ_IN_SEJONG" ? <><br />본사: {o.hq.address}</> : null}
      </div>
      <div className="small">업종·사업: {o.industry_text}</div>
      {areas.length ? (
        <div className="small muted">이어 볼 직무(시연용 해석): {areas.map(areaName).join(" · ")}</div>
      ) : null}
      {o.location_note ? <div className="small muted">{o.location_note}</div> : null}
      {!compact ? (
        <details>
          <summary>출처 {o.sources.length}건 · 확인일 {o.sources[0]?.checked_on}</summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {o.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> ({s.kind}) — {s.confirms}
              </li>
            ))}
          </ul>
          {o.notes ? <p className="small muted" style={{ marginTop: 6 }}>{o.notes}</p> : null}
        </details>
      ) : null}
    </div>
  );
}
