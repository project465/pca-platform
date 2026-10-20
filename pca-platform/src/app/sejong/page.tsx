import Link from "next/link";
import { sejongContent, ORG_TYPE_LABEL, reportable } from "@/sejong/lib/content";

export const dynamic = "force-dynamic";

export default function SejongHome() {
  const { instrument, orgs, links, region } = sejongContent();
  const seen = orgs.filter((o) => o.region_scope === "SEJONG");
  const ready = seen.filter(reportable);
  return (
    <>
      <section className="sj-hero">
        <div>
          <span className="sj-badge demo">시연판 · DEMO</span>
          <h1 style={{ marginTop: 12 }}>해 온 일로 다음 일을 찾습니다</h1>
          <p className="lead">
            학과가 아니라 <b>직무와 경험</b>에서 시작하는 세종 구직자용 진단입니다.
            일하면서 해 본 것과 남긴 기록을 함께 보고, 세종의 사업장과 직무를 이어
            30·60·90일 실행 계획과 개인별 취업 전략 결과지를 드립니다.
          </p>
          <div className="sj-actions">
            <Link className="sj-btn" href="/sejong/login">참여자 로그인</Link>
            <Link className="sj-btn ghost" href="/sejong/explore">세종 기업·기관 둘러보기</Link>
          </div>
        </div>
        <div className="sj-hero-side">
          <b>이렇게 진행합니다</b>
          <ol>
            <li>진흥원이 발급한 계정으로 로그인</li>
            <li>희망 직무와 근무 지역 범위 고르기</li>
            <li>직무 경험 진단 24문항 (약 10분, 바로 저장)</li>
            <li>경력·아르바이트·훈련·자격을 경험으로 기록</li>
            <li>결과 확인 → 세종 사업장 탐색 → 실행 계획</li>
            <li>취업 전략 결과지 PDF 내려받기</li>
          </ol>
        </div>
      </section>

      <section className="sj-section sj-grid c3">
        <div className="sj-card">
          <h3>직무·경험 중심 진단</h3>
          <p className="small muted">
            판단 여덟 갈래(문제 정의·기준 해석·직접 판단·도구·결과물·검증·수정·조직 활용)를
            경력과 실무 장면으로 묻습니다. 높은 단계는 <b>응답과 경험 기록이 함께 있을 때만</b> 섭니다.
          </p>
        </div>
        <div className="sj-card">
          <h3>세종 사업장 기준</h3>
          <p className="small muted">
            본사와 실제 사업장을 구분합니다. 세종 {seen.length}곳을 조사했고 공식 출처로 소재를 확인한 곳은 {ready.length}곳입니다.
            대전·충남·충북은 통근권으로만 보조 표시합니다.
          </p>
        </div>
        <div className="sj-card">
          <h3>점수·순위를 만들지 않습니다</h3>
          <p className="small muted">
            총점이나 적합도 숫자 대신, 무엇이 확인됐고 무엇을 채우면 되는지를 적습니다.
            채용 여부는 확인하지 않으며 지원은 원 공고에서 직접 합니다.
          </p>
        </div>
      </section>

      <section className="sj-section sj-card">
        <h2>세종의 일자리 지형 (시연 자료)</h2>
        <div className="sj-grid c2">
          {links.clusters.map((c) => (
            <div key={c.code}>
              <h3>{c.name}</h3>
              <p className="small muted">{c.where} · {c.orgs.length}곳</p>
              <p className="small">
                {c.orgs.map((id) => orgs.find((o) => o.id === id))
                  .filter(Boolean).slice(0, 5)
                  .map((o) => `${o!.name} (${ORG_TYPE_LABEL[o!.org_type]})`).join(" · ")}
                {c.orgs.length > 5 ? " 외" : ""}
              </p>
            </div>
          ))}
        </div>
        <p className="sj-note warn" style={{ marginTop: 12 }}>{region.notices.preview} {region.notices.hiring}</p>
      </section>

      <section className="sj-section sj-card">
        <h2>진단 대상</h2>
        <p className="small">{instrument.audiences.note}</p>
        <div className="sj-choices">
          {instrument.audiences.options.filter((o) => o.code !== "none").map((o) => (
            <span key={o.code} className="sj-badge">{o.label}</span>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          진단판 {instrument.instrument_version} · {instrument.status_note}
        </p>
      </section>
    </>
  );
}
