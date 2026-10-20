import Link from "next/link";
import { sejongActor } from "@/sejong/lib/session";
import { latestScored } from "@/sejong/lib/store";
import { sejongContent, reportable, VERIFY_LABEL, type Org } from "@/sejong/lib/content";
import { OrgCard } from "@/sejong/ui/org-card";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: { searchParams: Promise<{ area?: string; type?: string; v?: string; mine?: string }> }) {
  const sp = await searchParams;
  const { orgs, links, region, instrument, orgsMeta } = sejongContent();
  const actor = await sejongActor().catch(() => null);
  const mine = actor?.kinds.includes("participant") ? await latestScored(actor.userId) : null;
  const myAreas = sp.mine && mine?.result ? mine.result.profile.job_areas : [];
  const area = sp.area ?? "";

  const filtered = (scope: Org["region_scope"][]) => orgs.filter((o) => {
    if (!scope.includes(o.region_scope)) return false;
    const l = links.links[o.id] ?? [];
    if (area && !l.includes(area)) return false;
    if (myAreas.length && !l.some((c) => myAreas.includes(c))) return false;
    if (sp.type && o.org_type !== sp.type) return false;
    if (sp.v === "ready" && !reportable(o)) return false;
    return true;
  });
  const sejong = filtered(["SEJONG"]);
  const aux = filtered(["DAEJEON", "CHUNGNAM", "CHUNGBUK"]);
  const counts = {
    all: orgs.filter((o) => o.region_scope === "SEJONG").length,
    ready: orgs.filter((o) => o.region_scope === "SEJONG" && reportable(o)).length,
  };

  return (
    <>
      <h1>세종 산업·기업 탐색</h1>
      <p className="lead">
        세종에 <b>실제 사업장</b>이 있는 기업·기관입니다. 본사만 세종인지, 사업장만 세종인지 구분하고
        주소·업종·확인 상태·출처를 함께 적었습니다.
      </p>
      <div className="sj-note warn">
        {region.notices.info_only} {region.notices.hiring}
        <br />{orgsMeta.access_note}
      </div>

      <section className="sj-section sj-grid c4">
        <div className="sj-card sj-kpi"><b>{counts.all}곳</b><span>세종 조사 대상</span></div>
        <div className="sj-card sj-kpi"><b>{counts.ready}곳</b><span>공식 출처로 소재 확인</span></div>
        <div className="sj-card sj-kpi"><b>0곳</b><span>채용 중으로 표시한 곳 (확인 안 함)</span></div>
        <div className="sj-card sj-kpi"><b>{orgsMeta.checked_on}</b><span>자료 확인일</span></div>
      </section>

      <section className="sj-section sj-card">
        <h2>산업 묶음</h2>
        <div className="sj-grid c3">
          {links.clusters.map((c) => (
            <div key={c.code}>
              <b>{c.name}</b>
              <div className="small muted">{c.where} · {c.orgs.length}곳</div>
            </div>
          ))}
        </div>
        <h3 style={{ marginTop: 14 }}>지역 사실 (출처 표기)</h3>
        <ul className="small" style={{ paddingLeft: 18 }}>
          {region.facts.map((f, i) => (
            <li key={i}>
              {f.text} <span className="sj-badge part">{VERIFY_LABEL[f.verify]}</span>{" "}
              {f.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>)}
            </li>
          ))}
        </ul>
      </section>

      <form className="sj-section sj-card sj-form" method="get">
        <div className="sj-grid c4">
          <div className="sj-field">
            <label htmlFor="area">직무 영역</label>
            <select id="area" name="area" defaultValue={area}>
              <option value="">전체</option>
              {instrument.job_areas.map((j) => <option key={j.code} value={j.code}>{j.name}</option>)}
            </select>
          </div>
          <div className="sj-field">
            <label htmlFor="type">기관 유형</label>
            <select id="type" name="type" defaultValue={sp.type ?? ""}>
              <option value="">전체</option>
              <option value="PRIVATE">민간 기업</option>
              <option value="RESEARCH_INSTITUTE">국책연구기관</option>
              <option value="LOCAL_PUBLIC_CORP">지방 공기업·출연기관</option>
              <option value="PUBLIC_INSTITUTION">공공기관</option>
            </select>
          </div>
          <div className="sj-field">
            <label htmlFor="v">확인 상태</label>
            <select id="v" name="v" defaultValue={sp.v ?? ""}>
              <option value="">전체</option>
              <option value="ready">공식 출처로 소재 확인된 곳만</option>
            </select>
          </div>
          <div className="sj-field">
            <span className="lab">&nbsp;</span>
            <div style={{ display: "flex", gap: 8 }}>
              {mine?.result ? (
                <label className="sj-choice"><input type="checkbox" name="mine" value="1" defaultChecked={Boolean(sp.mine)} /> 내 희망 직무</label>
              ) : null}
              <button className="sj-btn small" type="submit">적용</button>
            </div>
          </div>
        </div>
      </form>

      <section className="sj-section">
        <h2>세종 · {sejong.length}곳</h2>
        <div className="sj-grid c2">
          {sejong.map((o) => <OrgCard key={o.id} o={o} />)}
        </div>
        {sejong.length === 0 ? <p className="muted">조건에 맞는 곳이 없습니다. <Link href="/sejong/explore">조건 지우기</Link></p> : null}
      </section>

      <section className="sj-section">
        <h2>보조 권역 (대전·충남·충북) · {aux.length}곳</h2>
        <p className="small muted">{region.aux_rule} {region.aux_status}</p>
        {mine?.result?.profile.region_range === "HOME_ONLY" ? (
          <p className="sj-note">희망 지역을 '세종 안에서만'으로 고르셔서 결과지에는 보조 권역을 넣지 않습니다.</p>
        ) : null}
        <div className="sj-grid c2">
          {aux.map((o) => <OrgCard key={o.id} o={o} />)}
        </div>
      </section>
    </>
  );
}
