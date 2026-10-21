/**
 * **PDF 전용 출력 템플릿.** 웹 결과지의 컴포넌트를 쓰지 않는다(규격 §5).
 *
 * 종이는 화면과 읽는 법이 다르다: 쪽이 고정이고, 넘겨 가며 읽고, 보관된다.
 * 그래서 장(章) 단위로 쪽을 열고, 표는 머리줄이 쪽마다 다시 서고, 카드와 줄은
 * 쪽 경계에서 쪼개지지 않는다. 쪽 머리말과 쪽 번호는 뽑는 쪽(Chromium 의
 * header/footer)이 그린다.
 *
 * **근거의 층을 글자로 표시한다.** `응답` · `고른 근거` · `고른 결과물` ·
 * `권장` · `2차 출처` 다섯 표시가 줄마다 붙는다. 색으로만 가르지 않는다.
 */
import type { Report, Layer, CompanyCard } from "./assemble";

const esc = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LAYER_KO: Record<Layer, string> = {
  RESPONSE: "응답", PICK: "고른 근거", ARTIFACT: "고른 결과물", ADVICE: "권장", SOURCE2: "2차 출처",
};
const tag = (l: Layer | null) => l ? `<span class="tg tg-${l.toLowerCase()}">${LAYER_KO[l]}</span>` : `<span class="tg tg-none">묻지 않음</span>`;
const VER_KO: Record<string, string> = {
  OFFICIAL: "공식 확인", SECONDARY_DIRECTORY: "기업정보 사이트", SECONDARY_NEWS: "언론 보도",
  SECONDARY_COMMUNITY: "커뮤니티 글", CONFLICTING: "출처끼리 다름", UNVERIFIED: "미확인",
};
const KIND_KO = { HQ: "본사", SITE: "사업장", BASE: "거점" } as const;
const TYPE_KO = { PUBLIC_CORP: "공기업·공공기관", LOCAL_PUBLIC: "지방공기업", LARGE: "대기업", MID: "중견·중소", SME: "중소" } as const;

const list = (xs: string[], cls = "ul") => xs.length
  ? `<ul class="${cls}">${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted">—</p>`;

function chapter(no: string, title: string, lead: string, body: string, opts: { page?: boolean } = {}): string {
  return `<section class="ch${opts.page === false ? " flow" : " pg"}" data-ch="${no}">
  <div class="ch-top"><header class="ch-h"><span class="ch-no">${no}</span><h1>${esc(title)}</h1></header>
  ${lead ? `<p class="ch-lead">${esc(lead)}</p>` : ""}</div>
  ${body}
</section>`;
}

export const CHAPTERS = [
  ["01", "Executive Summary"],
  ["02", "전공 역량 및 경험 분석"],
  ["03", "핵심 수행 경험의 심층 해석"],
  ["04", "Evidence와 Gap 분석"],
  ["05", "산업 및 직무 연결"],
  ["06", "지역 산업환경과 기업 후보"],
  ["07", "자기소개서·포트폴리오 활용 전략"],
  ["08", "경험 기반 면접 질문과 답변 준비"],
  ["09", "30·60·90일 실행 계획"],
  ["10", "분석 근거·한계 및 부록"],
] as const;

function cover(r: Report, pages: Record<string, number>): string {
  const m = r.meta;
  return `<section class="cover">
  <p class="cv-kind">CareerMatri PRO · 진로·직무 분석 리포트</p>
  <div class="cv-id">
    <h1 class="cv-title">${esc(m.department ?? m.major ?? "")}</h1>
    <p class="cv-sub">${esc(m.major ?? "")} 전공 기준${m.specialization ? ` · ${esc(m.specialization)}` : ""}</p>
    <dl class="cv-dl">
      <div><dt>응답일</dt><dd>${esc(m.answeredOn ?? "—")}</dd></div>
      <div><dt>분석 범위</dt><dd>기술·업무 영역 ${r.domains.length}개 가운데 판단을 물은 ${r.summary.counts.explored}개</dd></div>
      <div><dt>지역 자료 기준일</dt><dd>${esc(r.region.checkedOn)} (2차 출처)</dd></div>
    </dl>
  </div>
  <div class="cv-key">
    <p class="cv-key-h">이 리포트의 결론</p>
    <ol>
      <li><b>지금 확인된 것</b><span>${esc(r.summary.confirmed)}</span></li>
      <li><b>먼저 채울 것</b><span>${esc(r.summary.gap.split(". ")[0])}.</span></li>
      <li><b>지금 할 일</b><span>${esc(r.summary.actions[0]?.text ?? "—")}</span></li>
    </ol>
  </div>
  <nav class="toc"><p class="toc-h">차례</p><ol>
    ${CHAPTERS.map(([no, t]) => `<li><span class="toc-no">${no}</span><span class="toc-t">${esc(t)}</span><span class="toc-p">${pages[no] ?? ""}</span></li>`).join("")}
  </ol></nav>
  <p class="cv-foot">이 리포트는 검사에서 직접 고른 답과 근거 항목으로 만들었습니다. 적성·합격 가능성·순위를 판정하지 않고,
  답에 없는 성과·수치·역량을 짐작해 적지 않습니다. 근거마다 어디서 왔는지(<b>응답 · 고른 근거 · 고른 결과물 · 권장 · 2차 출처</b>)를 표시했습니다.</p>
</section>`;
}

function summary(r: Report): string {
  const s = r.summary;
  return chapter("01", "Executive Summary", "지금 확인된 것 · 먼저 채울 것 · 방향을 한 쪽에 모았습니다. 자세한 근거는 뒤의 장에 있습니다.", `
  <div class="es">
    <div class="es-c es-1"><p class="es-k">지금 확인된 것 ${tag("RESPONSE")}${tag("PICK")}</p><p class="es-v">${esc(s.confirmed)}</p></div>
    <div class="es-c es-2"><p class="es-k">먼저 채울 것</p><p class="es-v">${esc(s.gap)}</p></div>
    <div class="es-c es-3"><p class="es-k">방향</p><p class="es-v">${esc(s.direction)}</p></div>
  </div>
  <h2>우선 행동 셋 ${tag("ADVICE")}</h2>
  <table class="tb tb-act"><thead><tr><th class="w-when">언제까지</th><th>할 일</th></tr></thead><tbody>
  ${s.actions.map((a) => `<tr><td class="w-when">${esc(a.when)}</td><td>${esc(a.text)}</td></tr>`).join("")}
  </tbody></table>
  <h2>영역 한눈에 ${tag("RESPONSE")}</h2>
  <table class="tb tb-zone"><tbody>
  ${(["Z1_EVIDENCE_ESTABLISHED", "Z2_EVIDENCE_INCOMPLETE", "Z3_EVIDENCE_LOW_INTEREST", "Z4_INSUFFICIENT_EVIDENCE"] as const)
    .map((z) => [z, r.domains.filter((d) => d.zoneCode === z)] as const).filter(([, ds]) => ds.length)
    .map(([, ds]) => `<tr><th>${esc(ds[0].zone)}</th><td>${esc(ds.map((d) => d.name).join(" / "))}</td></tr>`).join("")}
  ${r.notExplored.length ? `<tr><th>이번에 판단을 묻지 않은 영역</th><td class="muted">${esc(r.notExplored.join(" / "))}</td></tr>` : ""}
  </tbody></table>
  <h2>숫자로 본 이번 응답</h2>
  <div class="nums">
    <div><b>${s.counts.explored}</b><span>판단을 물은 영역</span></div>
    <div><b>${s.counts.confirmed}</b><span>해 봤다고 답한 판단</span></div>
    <div><b>${s.counts.owned}</b><span>직접 정했다고 답한 판단</span></div>
    <div><b>${s.counts.artifacts}</b><span>남겼다고 고른 결과물</span></div>
  </div>
  <p class="note">수는 응답과 고른 항목을 센 것입니다. 점수가 아니고, 더하거나 다른 학생과 비교하지 않습니다.</p>
  ${r.quality ? `<p class="warn">${esc(r.quality)}</p>` : ""}
  <div class="legend"><p class="legend-h">근거 표시 읽는 법</p>
    <p>${tag("RESPONSE")} 검사 문항에 스스로 답한 수준 · ${tag("PICK")} 체크리스트에서 직접 고른 항목 · ${tag("ARTIFACT")} 남겼다고 고른 결과물(파일을 확인한 것은 아님) · ${tag("ADVICE")} 이 리포트가 권하는 행동 · ${tag("SOURCE2")} 공식 확인 전의 외부 자료</p>
  </div>`);
}

function competence(r: Report): string {
  const asked = r.domains.filter((d) => d.depth !== "NONE");
  return chapter("02", "전공 역량 및 경험 분석", "판단을 깊게 물은 영역은 무엇을 직접 정했는지까지, 나머지 영역은 관심·경험·배울 뜻까지 적었습니다.", `
  <h2>판단을 물은 영역 ${tag("RESPONSE")}</h2>
  <table class="tb"><thead><tr><th class="w-dom">영역</th><th class="w-zone">지금 상태</th><th>직접 정했다고 답한 판단</th><th>해 봤다고 답한 판단</th><th class="w-empty">아직 비어 있는 판단</th></tr></thead><tbody>
  ${asked.map((d) => `<tr><td class="w-dom"><b>${esc(d.name)}</b></td><td class="w-zone">${esc(d.zone)}</td><td>${esc(d.owned.join(", ") || "—")}</td><td>${esc(d.confirmed.join(", ") || "—")}</td><td class="w-empty muted">${esc(d.empty.join(", ") || "없음")}</td></tr>`).join("")}
  </tbody></table>
  <h2>열두 영역의 관심과 경험 ${tag("RESPONSE")}</h2>
  <table class="tb tb-scan"><thead><tr><th class="w-dom">영역</th><th>관심</th><th>해 본 횟수</th><th>배울 뜻</th><th>이번 검사</th></tr></thead><tbody>
  ${r.domains.map((d) => `<tr><td class="w-dom">${esc(d.name)}</td><td>${esc(d.interest)}</td><td>${esc(d.experience)}</td><td>${esc(d.learning)}</td><td class="muted">${d.depth === "DEEP" ? "판단까지 깊게 물음" : d.depth === "PROBE" ? "판단을 짧게 물음" : "관심·경험만 물음"}</td></tr>`).join("")}
  </tbody></table>
  <p class="note">‘관심·경험만 물음’은 그 영역의 경험이 없다는 뜻이 아닙니다. 이번 응시에서 판단을 묻지 않았을 뿐입니다.</p>`);
}

function experiences(r: Report): string {
  if (!r.experiences.length) {
    return chapter("03", "핵심 수행 경험의 심층 해석", "", `<p class="empty">이번 응답에서 근거 항목을 고른 영역이 없어 심층 해석을 쓰지 않았습니다. 근거를 하나 이상 고르면 이 장에 그 경험의 상황 · 직접 정한 것 · 남긴 것이 정리됩니다. <b>지금 비어 있다는 뜻이고, 경험이 없다는 판정이 아닙니다.</b></p>`, { page: false });
  }
  return chapter("03", "핵심 수행 경험의 심층 해석", "먼저 볼 영역에서 근거를 고르신 경험 둘을 지원서에서 말하는 차례로 풀었습니다.", r.experiences.map((e, i) => `
  <article class="xp">
    <header class="xp-h"><span class="xp-no">경험 ${i + 1}</span><h2>${esc(e.name)}</h2><span class="xp-z">${esc(e.zone)}</span></header>
    <p class="xp-scene"><span class="lbl">이 영역에서 흔한 장면</span>${esc(e.scene)} <span class="muted">— 실제 과제 이름은 직접 기입</span></p>
    <div class="xp-g">
      <div><p class="lbl">직접 정했다고 고른 것 ${tag("PICK")}</p>${list(e.decided)}</div>
      <div><p class="lbl">해 봤다고 고른 것 ${tag("PICK")}</p>${list(e.did)}</div>
      <div><p class="lbl">남겼다고 고른 결과물 ${tag("ARTIFACT")}</p>${list(e.artifacts)}</div>
      <div><p class="lbl">비교했다고 고른 대상 ${tag("PICK")}</p>${list(e.verifications)}</div>
    </div>
    <p class="xp-miss"><span class="lbl">응답에서 아직 확인되지 않은 판단</span>${esc(e.missing.join(" · ") || "없음")}
    ${e.partial.length ? `<br><span class="lbl">해 봤고, 어디까지 직접 정했는지는 아직인 판단</span>${esc(e.partial.join(" · "))}` : ""}</p>
  </article>`).join(""), { page: false });
}

function evidenceGap(r: Report): string {
  return chapter("04", "Evidence와 Gap 분석", "무엇이 비었는지 · 왜 필요한지 · 어떻게 채우는지 · 무엇을 남기면 되는지를 한 줄에 적었습니다.", `
  ${r.gaps.length ? `<table class="tb tb-gap"><thead><tr><th class="w-dom">영역</th><th class="w-what">비어 있는 판단</th><th>왜 필요한가</th><th>어떻게 채우나 ${tag("ADVICE")}</th><th class="w-keep">남길 것</th><th class="w-when">기간</th></tr></thead><tbody>
  ${r.gaps.map((g) => `<tr><td class="w-dom"><b>${esc(g.domain)}</b></td><td class="w-what">${esc(g.what)}</td><td>${esc(g.why)}</td><td>${esc(g.how)}</td><td class="w-keep">${esc(g.keep)}</td><td class="w-when">${esc(g.horizon)}</td></tr>`).join("")}
  </tbody></table>` : `<p class="empty">응답에서 먼저 채울 빈칸이 잡히지 않았습니다.</p>`}
  <p class="note">비어 있다는 것은 이번 응답에서 확인되지 않았다는 뜻입니다. 할 수 없다는 판정이 아닙니다. 남길 것은 그 영역에서 흔히 쓰는 결과물 이름이고, 실제 이름은 과제에 맞게 바꿔 적습니다.</p>`, { page: false });
}

function industryRole(r: Report): string {
  const i = r.industry, ro = r.role;
  return chapter("05", "산업 및 직무 연결", "목표로 고른 산업과 직무가 실제로 보는 판단에 이번 응답을 대 보았습니다. 맞는다·맞지 않는다고 판정하지 않습니다.", `
  ${i ? `<h2>${esc(i.name)} — 이 산업이 보는 판단</h2>
  <p class="demands">${i.demands.map((d) => `<span>${esc(d)}</span>`).join("")}</p>
  <table class="tb tb-dim"><thead><tr><th>판단</th><th>왜 중요한가</th><th class="w-dom">이어지는 영역</th><th class="w-zone">이번 응답</th></tr></thead><tbody>
  ${i.dims.map((d) => `<tr><td><b>${esc(d.name)}</b></td><td class="muted">${esc(d.why)}</td><td class="w-dom">${esc(d.domain)}</td><td class="w-zone">${d.layer ? `${tag(d.layer)} ${esc(d.state)}` : `<span class="muted">${esc(d.state)}</span>`}</td></tr>`).join("")}
  </tbody></table>` : `<p class="empty">목표 산업을 고르지 않으셨습니다.</p>`}
  ${r.otherIndustries.length ? `<p class="note">함께 고르신 산업: ${esc(r.otherIndustries.join(" · "))}. 산업을 바꿔도 위 영역 판정은 그대로입니다.</p>` : ""}
  ${ro ? `<h2>${esc(ro.name)} — 이 직무가 정하는 것</h2>
  <div class="role">
    <div><p class="lbl">이 직무가 확정하는 것</p><p>${esc(ro.owns)}</p><p class="lbl">직접 정하는 항목</p>${list(ro.decides)}</div>
    <div><p class="lbl">이 직무의 필수 판단 ${tag("RESPONSE")}</p>${list(ro.required.map((x) => `${x.axis} — ${x.state}`))}<p class="lbl">지원서에 갖출 자료 ${tag("ADVICE")}</p>${list(ro.material)}</div>
  </div>
  ${ro.differs.length ? `<p class="note">${esc(ro.differs.join(" · "))}</p>` : ""}` : ""}`, { page: false });
}

function companyRow(c: CompanyCard): string {
  const o = c.c.org;
  return `<tr><td class="w-org"><b>${esc(o.name)}</b><br><span class="muted">${esc(TYPE_KO[o.org_type])}</span></td>
  <td class="w-loc">${esc(KIND_KO[o.location.kind])} · ${esc(o.location.text)}<br><span class="tg tg-source2">${esc(VER_KO[o.location.status])}</span></td>
  <td>${esc(c.roles.join(" · "))}</td>
  <td>${c.whyText.map((w) => esc(w)).join("<br>")}</td>
  <td class="w-hire">미확인</td></tr>`;
}

function region(r: Report): string {
  const g = r.region, co = r.companies;
  const deep = co.local.slice(0, 2);
  return chapter("06", "지역 산업환경과 기업 후보", `캠퍼스 권역(${g.cities.join("·")})과 인접 권역(${g.adjacent.join(" · ")})을 먼저 봅니다. 기업 이름은 출처가 있는 것만 적었고, 이 장의 모든 기업 정보는 공식 확인 전의 2차 출처입니다.`, `
  <h2>A. 지역 산업환경 ${tag("SOURCE2")}</h2>
  <table class="tb tb-fact"><thead><tr><th class="w-reg">권역</th><th>확인된 사실</th><th class="w-src">출처</th></tr></thead><tbody>
  ${g.facts.map((f) => `<tr><td class="w-reg">${esc({ DAEJEON: "대전", SEJONG: "세종", CHUNGNAM: "충남" }[f.region] ?? f.region)}</td><td>${esc(f.fact)}</td><td class="w-src">${esc(f.source.title)}</td></tr>`).join("")}
  </tbody></table>
  <h3>경영학과 학생이 읽을 지점</h3>
  <ul class="ul">${g.readings.map((x) => `<li>${tag(x.layer)} ${esc(x.text)}</li>`).join("")}</ul>
  <p class="note">희망 지역은 검사에서 묻지 않았습니다. 캠퍼스 권역을 기준으로 골랐고, 희망 지역을 정하면 그 지역 기준으로 다시 고를 수 있습니다.</p>

  <h2>B. 검토할 직무·기업 후보 — 지역 ${co.local.length}곳</h2>
  <p class="legal">${esc(co.note)}</p>
  ${co.local.length ? `<table class="tb tb-org"><thead><tr><th class="w-org">기관·기업</th><th class="w-loc">위치 (확인 수준)</th><th>검토 직무 후보</th><th>이 학생에게 이어지는 까닭</th><th class="w-hire">채용</th></tr></thead><tbody>
  ${co.local.map(companyRow).join("")}</tbody></table>` : `<p class="empty">응답과 이어지는 지역 기관이 이 자료에 없습니다.</p>`}

  <h2>C. 전국 단위로 함께 볼 곳 — ${co.national.length}곳</h2>
  ${co.national.length ? `<table class="tb tb-org"><thead><tr><th class="w-org">기관·기업</th><th class="w-loc">위치 (확인 수준)</th><th>검토 직무 후보</th><th>이 학생에게 이어지는 까닭</th><th class="w-hire">채용</th></tr></thead><tbody>
  ${co.national.map(companyRow).join("")}</tbody></table>` : `<p class="empty">응답과 이어지는 전국 단위 기관이 이 자료에 없습니다.</p>`}

  <h2>D. 먼저 살펴볼 두 곳</h2>
  ${deep.map((c) => {
    const o = c.c.org;
    return `<article class="org">
    <header><h3>${esc(o.name)}</h3><span class="muted">${esc(KIND_KO[o.location.kind])} · ${esc(o.location.text)} · ${esc(VER_KO[o.location.status])}</span></header>
    <div class="org-g">
      <div><p class="lbl">하는 일 ${tag("SOURCE2")}</p><p>${esc(o.business.text)}</p>
        ${o.workplace.note ? `<p class="lbl">근무지</p><p class="muted">${esc(o.workplace.note)}</p>` : `<p class="lbl">근무지</p><p class="muted">확인하지 않았습니다. 본사 위치를 근무지로 적지 않습니다.</p>`}
        <p class="lbl">검토 직무 후보 (우리 쪽 분류)</p><p>${esc(c.roles.join(" · "))}</p></div>
      <div><p class="lbl">지금 가진 것 ${tag("RESPONSE")}</p>${list(c.strengths)}
        <p class="lbl">아직 비어 있는 것</p>${list(c.lacks)}</div>
      <div><p class="lbl">준비할 결과물 ${tag("ADVICE")}</p>${list(c.prepare)}
        <p class="lbl">지원·면접에서 말할 것 (그 산업이 보는 것)</p>${list(c.points)}</div>
    </div>
    <p class="src">출처: ${o.sources.map((s) => `${esc(VER_KO[s.kind])} — ${esc(s.what)}`).join(" · ")} · 확인 ${esc(r.region.checkedOn)} · 채용 여부 미확인</p>
  </article>`;
  }).join("")}`, { page: false });
}

function resume(r: Report): string {
  const f = r.resume;
  return chapter("07", "자기소개서·포트폴리오 활용 전략", "한 경험을 한 문단으로 쓰는 차례입니다. 칸 안의 문장은 고르신 답 그대로이고, 수치·기간·결과는 직접 채웁니다.", `
  ${f.paragraphs.map((p) => `<h2>${esc(p.domain)} 경험으로 쓰는 문단</h2>
  <table class="tb tb-para"><tbody>${p.lines.map((l) => `<tr><th>${esc(l.label)}</th><td>${esc(l.text)}</td></tr>`).join("")}</tbody></table>`).join("")}
  ${f.frame.length ? `<h2>연구·프로젝트 하나를 네 칸으로 ${tag("RESPONSE")}</h2>
  <table class="tb tb-para"><tbody>${f.frame.map((x) => `<tr><th>${esc(x.label)}<br><span class="muted">${esc(x.hint)}</span></th><td>${esc(x.items.join(" / "))}</td></tr>`).join("")}</tbody></table>
  <p class="note">이 네 칸은 ‘경험 번역’ 문항에서 고르신 보기입니다. 위의 영역 근거와 다른 과제를 떠올리고 답하셨다면 두 쪽이 서로 다를 수 있습니다. 지원서에는 한 과제로 맞춰 씁니다.</p>` : ""}
  <h2>포트폴리오로 갖춰 둘 결과물 ${tag("ARTIFACT")}</h2>
  ${f.portfolio.length ? `<table class="tb"><thead><tr><th>결과물</th><th class="w-dom">영역</th><th>갖춰 둘 상태 ${tag("ADVICE")}</th></tr></thead><tbody>
  ${f.portfolio.map((p) => `<tr><td>${esc(p.name)}</td><td class="w-dom">${esc(p.domain)}</td><td class="muted">파일 · 작성일 · 내가 맡은 부분을 한 줄로</td></tr>`).join("")}
  </tbody></table>` : `<p class="empty">남겼다고 고른 결과물이 아직 없습니다. 04장의 ‘남길 것’이 첫 결과물 후보입니다.</p>`}`, { page: false });
}

function interviews(r: Report): string {
  if (!r.interviews.length) {
    return chapter("08", "경험 기반 면접 질문과 답변 준비", "", `<p class="empty">근거를 고른 경험이 아직 없어 경험 기반 질문을 만들지 않았습니다. 지어낸 경험으로 질문을 만들지 않습니다.</p>`, { page: false });
  }
  return chapter("08", "경험 기반 면접 질문과 답변 준비", "질문은 고르신 판단 · 비교 대상 · 목표 산업이 보는 판단 · 아직 비어 있는 부분에서 나왔습니다. 답의 내용은 직접 채웁니다.", r.interviews.map((it) => `
  <article class="iv">
    <h2>${esc(it.domain)}</h2>
    <ol class="iv-q">${it.questions.map((q) => `<li><p>${esc(q.q)}</p><span class="muted">${esc(q.from)}</span></li>`).join("")}</ol>
    <table class="tb tb-star"><thead><tr><th class="w-star">STAR</th><th>이번 응답에서 온 재료</th><th class="w-fill">직접 채울 것</th></tr></thead><tbody>
      <tr><td class="w-star"><b>상황</b></td><td>${esc(it.star.s)} <span class="muted">(흔한 장면)</span></td><td class="w-fill">수업·과제 이름 · 기간 · 팀 규모</td></tr>
      <tr><td class="w-star"><b>과제</b></td><td>${esc(it.star.t.join(" / ") || "—")}</td><td class="w-fill">내가 맡은 범위</td></tr>
      <tr><td class="w-star"><b>행동</b></td><td>${esc(it.star.a.join(" / ") || "—")}</td><td class="w-fill">그렇게 한 까닭 한 줄</td></tr>
      <tr><td class="w-star"><b>결과</b></td><td>${esc(it.star.r.join(" / ") || "—")}</td><td class="w-fill">수치 · 비교 전후 · 쓰인 곳</td></tr>
    </tbody></table>
  </article>`).join(""), { page: false });
}

function plan(r: Report): string {
  return chapter("09", "30·60·90일 실행 계획", "04장의 빈칸과 06장의 기업 확인을 기간으로 나눴습니다. 끝낸 것은 내 CareerMatri 경험 기록에 적으면 현재 상태에 반영됩니다.", `
  <table class="tb tb-plan"><thead><tr><th class="w-when">기간</th><th>할 일 ${tag("ADVICE")}</th><th class="w-keep">남길 것</th><th class="w-chk">확인 기준</th></tr></thead><tbody>
  ${r.plan.map((p) => `<tr><td class="w-when"><b>${esc(p.when)}</b></td><td>${esc(p.what)}</td><td class="w-keep">${esc(p.keep)}</td><td class="w-chk">${esc(p.check)}</td></tr>`).join("")}
  </tbody></table>`, { page: false });
}

function appendix(r: Report): string {
  const a = r.appendix;
  return chapter("10", "분석 근거·한계 및 부록", "", `
  <p class="ver">작성 판본 — ${(["core_version", "item_bank_version", "scoring_version", "result_model"] as const)
    .filter((k) => a.versions[k] && a.versions[k] !== "null")
    .map((k) => `${{ core_version: "전공 Core", item_bank_version: "문항", scoring_version: "판단 규칙", result_model: "결과 모델" }[k]} ${esc(a.versions[k])}`).join(" · ")} · 같은 응답이면 같은 결과가 나옵니다.</p>
  <h2>이 리포트가 재는 것과 재지 않는 것</h2>
  <div class="two">
    <div><p class="lbl">재는 것</p>${list(["해 본 일에서 무엇을 직접 정했는지 (검사 응답)", "그 판단을 뒷받침하는 항목을 직접 골랐는지 (체크리스트)", "남겼다고 고른 결과물과 비교 대상"])}</div>
    <div><p class="lbl">재지 않는 것</p>${list(["적성 · 성격 · 능력의 높낮이", "합격 가능성 · 연봉 · 순위", "결과물 파일의 실제 내용 (확인하지 않음)", "기업의 채용 여부 (확인하지 않음)"])}</div>
  </div>
  <h2>고르신 근거 원문 ${tag("PICK")}</h2>
  ${a.picks.length ? `<table class="tb tb-raw"><colgroup><col style="width:22mm"><col style="width:30%"><col><col style="width:30mm"></colgroup><thead><tr><th>영역</th><th>직접 정함</th><th>해 봄</th><th>결과물 · 비교 대상</th></tr></thead><tbody>
  ${a.picks.map((p) => `<tr><td class="w-dom">${esc(p.domain)}</td><td>${esc(p.decided.join(" / ") || "—")}</td><td>${esc(p.did.slice(0, 8).join(" / ") || "—")}</td><td>${esc([...p.artifacts, ...p.verifications].join(" / ") || "—")}</td></tr>`).join("")}
  </tbody></table>` : `<p class="empty">고르신 근거 항목이 없습니다.</p>`}
  <h2>지역·기업 자료의 출처 (확인 ${esc(r.region.checkedOn)})</h2>
  <ol class="srcs">${a.sources.map((s) => `<li><span class="tg tg-source2">${esc(VER_KO[s.kind] ?? s.kind)}</span> ${esc(s.title)}<br><span class="url">${esc((() => { try { return decodeURI(s.url); } catch { return s.url; } })())}</span></li>`).join("")}</ol>
  <p class="note">공식 홈페이지 · 전자공시 · 공공기관 경영정보 공개시스템에서 직접 확인한 줄은 아직 없습니다. 지원 전에 각 기관의 공식 채용 페이지를 직접 확인하십시오.</p>
`, { page: false });
}

export function renderReport(r: Report, opts: { fontsHref?: string; pages?: Record<string, number> } = {}): string {
  const pages = opts.pages ?? {};
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CareerMatri 진로·직무 분석 리포트</title>
${opts.fontsHref ? ["400", "500", "700"].map((w) => `<link rel="stylesheet" href="${opts.fontsHref}/${w}.css">`).join("") : ""}
<style>${CSS}</style></head><body>
${cover(r, pages)}
${summary(r)}
${competence(r)}
${experiences(r)}
${evidenceGap(r)}
${industryRole(r)}
${region(r)}
${resume(r)}
${interviews(r)}
${plan(r)}
${appendix(r)}
</body></html>`;
}

/** 머리말·쪽 번호. Chromium 의 headerTemplate/footerTemplate 에 넣는다 */
export function headerHtml(r: Report): string {
  const m = r.meta;
  return `<div style="width:100%;font-family:'Noto Sans KR','Noto Sans CJK KR',sans-serif;font-size:7.5pt;color:#6b7482;padding:0 17mm;display:flex;justify-content:space-between">
  <span>${esc([m.school, m.department].filter(Boolean).join(" · "))}</span><span>CareerMatri 진로·직무 분석 리포트</span></div>`;
}
export function footerHtml(): string {
  return `<div style="width:100%;font-family:'Noto Sans KR','Noto Sans CJK KR',sans-serif;font-size:7.5pt;color:#6b7482;padding:0 17mm;display:flex;justify-content:space-between">
  <span>검사 응답 기반 · 판정이 아닌 분석</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
}

const CSS = `
@page { size: A4; margin: 19mm 17mm 17mm 17mm; }
@page :first { margin-top: 17mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: 'Noto Sans KR','Noto Sans CJK KR',sans-serif; font-size: 9.4pt; line-height: 1.62;
  color: #1c2533; word-break: keep-all; overflow-wrap: anywhere; }
b { font-weight: 700; }
h1, h2, h3 { margin: 0; font-weight: 700; color: #10233f; line-height: 1.35; break-after: avoid; }
h2 { font-size: 11.5pt; margin: 16pt 0 6pt; }
h3 { font-size: 10pt; margin: 10pt 0 4pt; }
p { margin: 0 0 4pt; }
.muted { color: #687284; }
.lbl { display: block; font-size: 8pt; font-weight: 700; color: #5a6578; letter-spacing: .01em; margin: 6pt 0 2pt; }
.note { font-size: 8.2pt; color: #687284; margin-top: 6pt; }
.empty { padding: 10pt 12pt; border: 1px dashed #c8cfd9; color: #4a5568; }
.warn { margin-top: 8pt; padding: 6pt 10pt; background: #fbf4e4; border-left: 3px solid #c9952c; font-size: 8.6pt; }
.legal { font-size: 8.3pt; padding: 6pt 10pt; background: #f1f4f8; border-left: 3px solid #10233f; margin-bottom: 8pt; }

/* 근거 표시 — 색만으로 가르지 않는다(글자가 먼저다) */
.tg { display: inline-block; font-size: 6.8pt; font-weight: 700; line-height: 1; padding: 2.2pt 4pt; border-radius: 2pt;
  border: .7pt solid currentColor; vertical-align: 1pt; margin-right: 2pt; white-space: nowrap; }
.tg-response { color: #1d4f91; } .tg-pick { color: #0b6b72; } .tg-artifact { color: #6b4fa0; }
.tg-advice { color: #8a5a00; } .tg-source2 { color: #7a3b3b; } .tg-none { color: #8a93a2; }

/* 표지 */
.cover { height: 263mm; display: flex; flex-direction: column; break-after: page; }
.cv-top { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.4pt solid #10233f; padding-bottom: 6pt; }
.cv-brand { font-size: 9pt; font-weight: 700; color: #10233f; margin: 0; }
.cv-kind { font-size: 9pt; color: #10233f; margin: 0; }
.cv-kind span { font-weight: 700; color: #0b6b72; margin-left: 4pt; }
.cv-kind { border-bottom: 1.4pt solid #10233f; padding-bottom: 6pt; font-weight: 700; }
.cv-id { margin-top: 24mm; }
.cv-key { margin-top: 12mm; border-top: .6pt solid #c8cfd9; }
.cv-key-h { font-size: 8.2pt; font-weight: 700; color: #687284; margin: 7pt 0 3pt; }
.cv-key ol { list-style: none; margin: 0; padding: 0; }
.cv-key li { display: grid; grid-template-columns: 30mm 1fr; padding: 5pt 0; border-bottom: .5pt solid #e3e7ed; font-size: 9.6pt; }
.cv-key li b { color: #10233f; font-size: 8.6pt; padding-top: 1pt; }
.w-empty { width: 26mm; }
.tb-zone th { width: 52mm; background: #f4f6f9; font-size: 8.2pt; border-bottom: .5pt solid #dde2e9; }
.cv-title { font-size: 25pt; letter-spacing: -.01em; }
.cv-sub { font-size: 11pt; color: #3a4658; margin-top: 4pt; }
.cv-dl { margin: 14mm 0 0; display: grid; grid-template-columns: 1fr; gap: 3pt; }
.cv-dl div { display: grid; grid-template-columns: 30mm 1fr; border-top: .5pt solid #d9dee6; padding-top: 3pt; }
.cv-dl dt { font-size: 8.2pt; color: #687284; } .cv-dl dd { margin: 0; font-size: 9pt; }
.toc { margin-top: 14mm; }
.toc-h { font-size: 8.2pt; font-weight: 700; color: #687284; margin-bottom: 4pt; }
.toc ol { list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 10mm; }
.toc li { display: grid; grid-template-columns: 8mm 1fr 8mm; padding: 3.2pt 0; border-bottom: .5pt solid #e3e7ed; break-inside: avoid; font-size: 9pt; }
.toc-no { color: #0b6b72; font-weight: 700; } .toc-p { text-align: right; color: #687284; }
.cv-foot { margin-top: auto; font-size: 7.8pt; color: #687284; line-height: 1.55; }

/* 장 */
.ch.pg { break-before: page; }
.ch.flow { margin-top: 22pt; }
.ch-top { break-inside: avoid; break-after: avoid; }
.ch.flow { break-before: auto; }
.ch-h { display: flex; align-items: baseline; gap: 8pt; border-bottom: 1.2pt solid #10233f; padding-bottom: 5pt; margin-bottom: 7pt; }
.ch-no { font-size: 10pt; font-weight: 700; color: #0b6b72; }
.ch-h h1 { font-size: 16pt; }
.ch-lead { color: #3a4658; font-size: 9.2pt; margin-bottom: 8pt; }

/* 요약 */
.es { display: grid; grid-template-columns: 1fr; gap: 0; border-top: .6pt solid #c8cfd9; }
.es-c { display: grid; grid-template-columns: 34mm 1fr; padding: 8pt 0; border-bottom: .6pt solid #c8cfd9; break-inside: avoid; }
.es-k { font-size: 8.4pt; font-weight: 700; color: #10233f; margin: 1pt 0 0; }
.es-v { font-size: 10.6pt; line-height: 1.55; margin: 0; }
.es-1 .es-v { font-weight: 500; }
.nums { display: grid; grid-template-columns: repeat(4, 1fr); border: .6pt solid #c8cfd9; }
.nums div { padding: 7pt 9pt; border-right: .6pt solid #c8cfd9; } .nums div:last-child { border-right: 0; }
.nums b { display: block; font-size: 16pt; color: #10233f; line-height: 1.1; }
.nums span { font-size: 7.8pt; color: #5a6578; }
.legend { margin-top: 12pt; padding: 7pt 10pt; background: #f4f6f9; font-size: 8pt; break-inside: avoid; }
.legend-h { font-weight: 700; margin-bottom: 2pt; }

/* 표 */
.tb { width: 100%; border-collapse: collapse; font-size: 8.5pt; line-height: 1.5; }
.tb thead { display: table-header-group; }
.tb th { text-align: left; font-weight: 700; font-size: 7.9pt; color: #3a4658; background: #eef1f5; padding: 4pt 5pt; border-bottom: .8pt solid #9aa5b5; vertical-align: bottom; }
.tb td { padding: 4.5pt 5pt; border-bottom: .5pt solid #dde2e9; vertical-align: top; }
.tb tr { break-inside: avoid; }
.w-dom { width: 26mm; } .w-zone { width: 34mm; } .w-when { width: 13mm; white-space: nowrap; }
.w-what { width: 27mm; } .w-keep { width: 28mm; } .w-chk { width: 30mm; } .w-reg { width: 11mm; }
.w-src { width: 38mm; font-size: 7.6pt; color: #687284; } .w-org { width: 30mm; } .w-loc { width: 40mm; font-size: 8pt; }
.w-hire { width: 13mm; white-space: nowrap; font-size: 7.8pt; color: #7a3b3b; } .w-star { width: 12mm; } .w-fill { width: 38mm; color: #8a5a00; font-size: 8pt; }
.tb-scan td, .tb-scan th { padding-top: 3pt; padding-bottom: 3pt; }
.tb-para { break-inside: avoid; }
.tb-para th { width: 34mm; background: #f4f6f9; font-size: 8.2pt; vertical-align: top; border-bottom: .5pt solid #dde2e9; }

/* 경험 */
.xp { border-top: 1pt solid #10233f; padding-top: 7pt; margin-top: 10pt; break-inside: avoid; }
.xp-h { display: flex; align-items: baseline; gap: 7pt; }
.xp-h h2 { margin: 0; font-size: 12pt; }
.xp-no { font-size: 8pt; font-weight: 700; color: #0b6b72; }
.xp-z { margin-left: auto; font-size: 7.8pt; color: #5a6578; }
.xp-scene { margin-top: 5pt; font-size: 9pt; }
.xp-scene .lbl { display: inline; margin-right: 6pt; }
.xp-g { display: grid; grid-template-columns: 1fr 1fr; column-gap: 9mm; }
.xp-miss { margin-top: 6pt; font-size: 8.6pt; color: #4a5568; background: #f6f7f9; padding: 5pt 8pt; }
.xp-miss .lbl { display: inline; margin-right: 6pt; }
.ul { margin: 0; padding: 0; list-style: none; }
.ul li { margin: 1.5pt 0; padding-left: 9pt; position: relative; }
.ul li::before { content: ""; position: absolute; left: 1pt; top: .62em; width: 3.2pt; height: 3.2pt; background: #0b6b72; }

.demands { display: flex; flex-wrap: wrap; gap: 4pt; margin-bottom: 6pt; }
.demands span { font-size: 8.2pt; padding: 2pt 6pt; border: .6pt solid #c8cfd9; border-radius: 2pt; }
.role, .two { display: grid; grid-template-columns: 1fr 1fr; column-gap: 9mm; break-inside: avoid; }

/* 기업 */
.brk { break-before: page; }
.org { border: .7pt solid #c8cfd9; padding: 8pt 10pt; margin-top: 8pt; break-inside: avoid; }
.org header { display: flex; gap: 8pt; align-items: baseline; flex-wrap: wrap; border-bottom: .5pt solid #dde2e9; padding-bottom: 4pt; }
.org header h3 { margin: 0; font-size: 11pt; }
.org header .muted { font-size: 8pt; }
.org-g { display: grid; grid-template-columns: 1fr 1fr 1fr; column-gap: 6mm; font-size: 8.6pt; }
.src { font-size: 7.4pt; color: #7a3b3b; margin-top: 6pt; }

.iv { margin-top: 8pt; break-inside: avoid; }
.iv h2 { margin-top: 8pt; }
.iv-q { margin: 0 0 6pt; padding-left: 14pt; } .iv-q li { margin: 3pt 0; }
.iv-q li p { margin: 0; font-weight: 500; } .iv-q li .muted { font-size: 7.6pt; }

.srcs { font-size: 7.3pt; padding-left: 14pt; columns: 2; column-gap: 8mm; } .srcs li { margin: 2pt 0; break-inside: avoid; }
.url { color: #687284; word-break: break-all; }
.ver { font-size: 7.6pt; color: #687284; }
`;
