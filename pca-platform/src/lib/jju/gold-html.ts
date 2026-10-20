/**
 * 전주대 개인 리포트 Gold Master — **편집 디자인**(Track A).
 *
 * 무엇을 말할지는 `gold.ts`(분석)와 `gold-workbook.ts`(워크북)가 정하고, 여기는
 * 그것을 A4 종이 위에 앉힌다. 값을 새로 만들지 않는다.
 *
 * 설계 규칙
 * - 장(章)마다 새 쪽에서 시작하고 쪽 안에서는 흐른다. 쪽 높이를 못 박지 않는다:
 *   못 박으면 긴 학생의 글이 쪽 끝에서 잘린다. 표의 줄 하나 · 카드 하나는
 *   쪽을 넘지 않게(`break-inside: avoid`) 하되 한 쪽을 넘는 덩이에는 걸지 않는다.
 * - 장마다 정보 리듬이 다르다: 요약은 큰 숫자와 다섯 줄 · 장부는 표 · 프로필은
 *   도표 · 직무는 카드 · 워크북은 기입란. 같은 카드를 쪽마다 되풀이하지 않는다.
 * - 색은 넷만: 남색(판정) · 파랑(권고·강조) · 주황(빈자리) · 회색. 층 딱지는
 *   색만으로 말하지 않고 글자를 든다.
 * - 본문 10.5pt · 표 9.6pt · 각주 8.6pt. 쪽 번호와 머리말은 브라우저 인쇄의
 *   머리/꼬리 틀이 그린다(`report-pdf.ts`).
 */
import type { GoldDoc, Layer } from "@/lib/jju/gold";
import { AXES, AXIS_KO, LAYER_KO } from "@/lib/jju/gold";
import type { Workbook } from "@/lib/jju/gold-workbook";

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tag = (l: Layer) => `<span class="tg tg-${l}">${LAYER_KO[l]}</span>`;
const pad2 = (n: number) => String(n).padStart(2, "0");

function opener(no: number, kicker: string, title: string, thesis: string): string {
  return `<header class="op"><p class="op-k"><b>${pad2(no)}</b><span>${esc(kicker)}</span></p><h2>${esc(title)}</h2>${thesis ? `<p class="op-t">${esc(thesis)}</p>` : ""}</header>`;
}

const STATE_CLS: Record<string, string> = { OWNED: "s3", CONFIRMED: "s2", PARTICIPATED: "s1", NOT_OBSERVED: "s0" };
const STATE_KO: Record<string, string> = { OWNED: "직접 결정", CONFIRMED: "직접 수행", PARTICIPATED: "받아서 수행", NOT_OBSERVED: "아직 없음" };

function heatmap(g: GoldDoc): string {
  const rows = g.domains.filter((d) => d.explored);
  if (!rows.length) return `<p class="none">이번 검사에서 깊게 물은 영역이 없어 판정 지도를 그리지 않습니다.</p>`;
  return `<table class="hm"><thead><tr><th class="hm-d">영역</th>${AXES.map((a) => `<th><span>${esc(AXIS_KO[a])}</span></th>`).join("")}<th class="hm-n">확인</th></tr></thead><tbody>${rows.map((d) =>
    `<tr><td class="hm-d"><b>${esc(d.name)}</b><small>${esc(d.zoneKo)}</small></td>${d.axes.map((x) => `<td class="hc ${STATE_CLS[x.state] ?? "s0"}" title="${esc(STATE_KO[x.state] ?? "")}"><i></i></td>`).join("")}<td class="hm-n"><b>${d.confirmed}</b>/8</td></tr>`).join("")}</tbody></table>
  <p class="lg"><span><i class="hc s3"></i>직접 결정</span><span><i class="hc s2"></i>직접 수행</span><span><i class="hc s1"></i>받아서 수행</span><span><i class="hc s0"></i>아직 없음</span><em>${tag("JUDGED")} 칸 하나 = 축 하나의 판정. 점수가 아닙니다.</em></p>`;
}

function dots(level: string, kind: "band" | "exp"): string {
  const n = kind === "band" ? ({ "높음": 3, "보통": 2, "낮음": 1 } as Record<string, number>)[level] ?? 0
    : ({ "여러 번": 3, "1~2회": 2, "해 본 적 없음": 1 } as Record<string, number>)[level] ?? 0;
  return `<span class="dt" aria-label="${esc(level)}">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}<em>${esc(level)}</em></span>`;
}

/**
 * 관심(세로) × 확인된 판단(가로). **깊게 물은 영역만 점으로 찍는다.** 깊게 묻지 않은
 * 영역은 판정이 없으므로 가로 위치가 없고, 점으로 찍으면 `확인 0` 으로 읽힌다.
 * 그 영역들은 도표 아래에 관심 단계별 이름으로만 적는다.
 * 이름표는 단(관심 단계) 안에서 한 줄씩 내려 겹치지 않게 한다.
 */
function fitChart(g: GoldDoc): string {
  const bands = ["높음", "보통", "낮음"];
  const pts = g.domains.filter((d) => d.explored && bands.includes(d.interest));
  const per = bands.map((b) => pts.filter((d) => d.interest === b));
  const rowsOf = per.map((p) => Math.max(1, p.length));
  const RH = 26, W = 620, L = 96, R = 24, T = 14, B = 40;
  const bandH = rowsOf.map((n) => n * RH + 18);
  const H = T + bandH.reduce((a, b) => a + b, 0) + B;
  const xOf = (n: number) => L + 22 + (n / 8) * (W - L - R - 40);
  let y0 = T; const parts: string[] = []; const bg: string[] = []; const spans: [number, number][] = [];
  bands.forEach((b, bi) => {
    const h = bandH[bi];
    bg.push(`<rect x="${L}" y="${y0}" width="${W - L - R}" height="${h}" class="${bi % 2 ? "bb" : "ba"}"/>`); parts.push(`<text x="${L - 10}" y="${y0 + h / 2 + 4}" class="ax" text-anchor="end">관심 ${b}</text>`);
    per[bi].forEach((d, i) => {
      const x = xOf(d.confirmed), y = y0 + 12 + i * RH + RH / 2;
      parts.push(`<line x1="${xOf(0)}" x2="${x}" y1="${y}" y2="${y}" class="lead"/><circle cx="${x}" cy="${y}" r="6" class="${d.confirmed ? "p-on" : "p-zero"}"/><text x="${d.confirmed >= 5 ? x - 11 : x + 11}" y="${y + 4}" class="pl"${d.confirmed >= 5 ? ' text-anchor="end"' : ""}>${esc(d.name)} · ${d.confirmed}</text>`);
    });
    if (per[bi].length) spans.push([y0, y0 + h]);
    if (!per[bi].length) parts.push(`<text x="${xOf(0)}" y="${y0 + h / 2 + 4}" class="ax halo">이 단계에 깊게 물은 영역 없음</text>`);
    y0 += h;
  });
  const xt = [0, 2, 4, 6, 8].map((n) => `${spans.map(([a, b]) => `<line x1="${xOf(n)}" x2="${xOf(n)}" y1="${a}" y2="${b}" class="gl"/>`).join("")}<text x="${xOf(n)}" y="${y0 + 15}" class="ax" text-anchor="middle">${n}</text>`).join("");
  const off = bands.map((b) => [b, g.domains.filter((d) => !d.explored && d.interest === b).map((d) => d.name)] as const).filter(([, n]) => n.length);
  return `<svg class="fit" viewBox="0 0 ${W} ${H}" role="img" aria-label="관심과 확인된 판단">${bg.join("")}${xt}${parts.join("")}
<text x="${xOf(4)}" y="${H - 6}" class="ax" text-anchor="middle">확인된 판단 · 여덟 축 가운데 몇 칸 →</text></svg>
${off.length ? `<p class="offx"><b>깊게 묻지 않은 영역</b> — 판정이 없어 점을 찍지 않았습니다. 관심만 답했습니다. ${off.map(([b, n]) => `<span>관심 ${b}: ${esc(n.join(" · "))}</span>`).join("")}</p>` : ""}`;
}

/** 빈자리를 영역마다 한 번만 이름을 적고 그 아래에 묶는다 */
function gapList(g: GoldDoc): string {
  if (!g.gaps.length) return `<p class="none">결과 모델이 적은 빈자리가 없습니다.</p>`;
  const by = new Map<string, { title: string; why: string }[]>();
  for (const x of g.gaps) { const k = x.domains.join(" · "); by.set(k, [...(by.get(k) ?? []), { title: x.title, why: x.why }]); }
  return `<div class="gaps">${[...by.entries()].map(([d, xs]) => `<div class="gd"><b>${esc(d)}</b><ol>${xs.map((x) => `<li><span>${esc(x.title)}</span><small>${esc(x.why)}</small></li>`).join("")}</ol></div>`).join("")}</div>`;
}

export function goldHtml(g: GoldDoc, w: Workbook): string {
  const P: string[] = [];

  /* ── 표지 ── */
  P.push(`<section class="cover">
<div class="cv-top"><p class="cv-k">JEONJU UNIVERSITY × CareerMatri</p><p class="cv-p">${esc(g.program)}</p></div>
<div class="cv-mid"><p class="cv-badge">${esc(g.badge)}</p><h1>${esc(g.title)}</h1>${g.lead ? `<p class="cv-lead">${esc(g.lead)}</p>` : ""}</div>
<div class="cv-num">${g.numbers.map((n) => `<div><b>${esc(n.v)}</b><span>${esc(n.k)}</span><small>${esc(n.sub)}</small></div>`).join("")}</div>
<dl class="cv-meta"><div><dt>학생 식별</dt><dd>${esc(g.id)}</dd></div><div><dt>학과·과정</dt><dd>${esc(g.student.track)}</dd></div><div><dt>전공 검사</dt><dd>${esc(g.student.field)}${g.student.spec ? ` · ${esc(g.student.spec)}` : ""}</dd></div><div><dt>소속·운영</dt><dd>${esc(g.student.cohort)}</dd></div><div><dt>응답일</dt><dd>${esc(g.submitted)}</dd></div><div><dt>문서</dt><dd>${esc(g.version)}</dd></div></dl>
${g.demo ? `<p class="cv-demo">시연 자료 · 합성 학생 · 컴퓨터·소프트웨어 검사는 전공자 검수 전입니다. 학생 진단이나 사업 성과로 쓰지 않습니다.</p>` : ""}
</section>`);

  /* ── 01 요약 ── */
  P.push(`<section class="ch pg">${opener(1, "Executive Brief", "지금 어디에 있고, 다음에 무엇을 할까", "다섯 줄로 읽는 이 학생의 현재. 줄마다 그 말이 검사 판정인지, 스스로 답한 것인지, 해석이나 권고인지 딱지를 붙였습니다.")}
<ol class="brief">${g.brief.map((b, i) => `<li><span class="bn">${i + 1}</span><div><p class="bk">${esc(b.k)} ${tag(b.layer)}</p><p class="bv">${esc(b.v)}</p>${b.note ? `<p class="bnote">${esc(b.note)}</p>` : ""}</div></li>`).join("")}</ol>
<aside class="legend"><p><b>이 리포트를 읽는 법</b></p><ul>
<li>${tag("JUDGED")} 문항 응답을 공통 검사 엔진이 판정한 것</li><li>${tag("SELF")} 학생이 스스로 고르거나 답한 것 — 판정이 아님</li>
<li>${tag("READ")} 판정을 관계표로 직무·산업에 이은 것</li><li>${tag("ADVICE")} 결과에서 나온 할 일</li><li>${tag("SOURCE")} 바깥 출처 — 검증 상태를 함께 적음</li></ul>
<p class="fine">적합도 · 합격 가능성 · 순위 · 백분위를 만들지 않습니다.</p></aside></section>`);

  /* ── 02 근거 장부 ── */
  P.push(`<section class="ch">${opener(2, "Evidence Ledger", "이 리포트가 하는 주장과 그 근거", `주장 ${g.ledger.length}개. 근거가 판정인지 자기보고인지, 출처는 원문을 확인했는지를 줄마다 적었습니다. 문항 번호와 판정 경로는 별도 대조표에 둡니다. 응답 품질: ${g.quality}.`)}
<table class="tb ledger"><thead><tr><th>주장</th><th>층</th><th>근거</th><th>상태</th></tr></thead><tbody>${g.ledger.map((c) => `<tr><td>${esc(c.text)}</td><td>${tag(c.layer)}</td><td>${esc(c.basis)}</td><td>${esc(c.status)}</td></tr>`).join("")}</tbody></table>
</section>`);

  /* ── 03 전공·기술 프로필 ── */
  const tried = g.domains.filter((d) => d.experience !== "해 본 적 없음" && d.experience !== "답 없음").length;
  P.push(`<section class="ch">${opener(3, "Major & Technical Profile", `${g.student.field} — 무엇을 판단해 봤나`, `${g.domains.length}개 영역 가운데 ${g.domains.filter((d) => d.explored).length}곳을 깊게 물었고, ${tried}곳을 해 본 적이 있다고 답했습니다.`)}
<h3>판정 지도 <small>깊게 물은 영역 × 여덟 판단 축</small></h3>${heatmap(g)}
<h3>스스로 답한 관심·경험·학습 의향 ${tag("SELF")} <small>판정이 아닙니다 · 점 셋 = 높음 / 여러 번</small></h3>
<table class="tb self"><thead><tr><th>영역</th><th>관심</th><th>경험</th><th>배울 뜻</th></tr></thead><tbody>${g.domains.map((d) => `<tr><td>${esc(d.name)}${d.explored ? "" : ` <span class="nx">깊게 묻지 않음</span>`}</td><td>${dots(d.interest, "band")}</td><td>${dots(d.experience, "exp")}</td><td>${dots(d.learning, "band")}</td></tr>`).join("")}</tbody></table>
<h3>AI 역량 — 무엇을 재고 무엇을 재지 않나</h3>
<table class="tb aiT"><thead><tr><th>역량</th><th>이 검사</th><th>이 학생</th></tr></thead><tbody>${g.ai.map((a) => `<tr><td>${esc(a.name)}</td><td class="st st-${esc(a.status)}">${esc(a.status)}</td><td>${esc(a.how)}</td></tr>`).join("")}</tbody></table>
<p class="fine">미측정 역량에 점수를 매기지 않습니다. 공식 과정이 다루더라도 문항이 없으면 확인된 역량으로 세지 않습니다.</p>
${g.tools.length ? `<p class="tools"><b>그 영역에서 흔히 쓰는 도구</b> ${g.tools.map((t) => `${esc(t.domain)}: ${esc(t.tools.join(" · ") || "—")}`).join(" / ")}<br><small>전공 사전의 목록입니다. 이 학생이 다룬다는 뜻이 아닙니다.</small></p>` : ""}</section>`);

  /* ── 04 산업·직무 ── */
  P.push(`<section class="ch">${opener(4, "Industry & Role Intelligence", "그 일은 무엇을 하고, 무엇을 보는가", g.roles.length ? "직무는 학생이 고른 것과 판정에서 관계표로 이은 것만 적습니다. 그 일이 실제로 하는 차례와 그 자리가 보는 판단을 이 학생의 판정과 나란히 놓습니다." : "고른 직무도, 판정에서 이어진 직무도 아직 없습니다.")}
<div class="roles">${g.roles.slice(0, 2).map((r) => `<article class="role"><p class="rk">${tag(r.from)} ${r.from === "SELF" ? "학생이 고른 직무" : "판정에서 이은 직무"}</p><h3>${esc(r.name)}</h3>
<p class="rl">그 일이 하는 차례</p><ol class="work">${r.work.map((s) => `<li><b>${esc(s.name)}</b><span>${esc(s.detail)}</span></li>`).join("") || "<li>그 Core 사전에 업무 흐름이 없습니다</li>"}</ol>
<p class="rl">그 자리가 보는 판단 · 이 학생</p><p class="watch">${r.watched.map((x) => `<span class="${x.hit ? "hit" : "miss"}">${x.hit ? "●" : "○"} ${esc(AXIS_KO[x.axis])}</span>`).join("")}</p>
<p class="rl">중심 영역</p><p class="ctr">${r.centers.map((c) => `<span class="${c.hit ? "hit" : "miss"}">${esc(c.name)}</span>`).join("")}</p>
<p class="cond">${tag("READ")} ${esc(r.condition)}</p></article>`).join("")}</div>
${g.industries.length ? `<h3>산업 — 중심 영역과 이 학생</h3><table class="tb"><thead><tr><th>산업</th><th>어디서</th><th>그 산업의 중심 영역</th><th>이 학생</th></tr></thead><tbody>${g.industries.map((i) => `<tr><td><b>${esc(i.name)}</b></td><td>${tag(i.from)}</td><td>${esc(i.centers)}</td><td>${esc(i.status)}</td></tr>`).join("")}</tbody></table>` : ""}
<div class="keep"><h3>지역과 전국</h3>
${g.region.length ? `<ul class="region">${g.region.slice(0, 3).map((r) => `<li>${tag("SOURCE")} <b>${esc(r.label)}</b> ${esc(r.claim)} <small>[${esc(r.id)}]</small></li>`).join("")}</ul>` : `<p class="none">이 학과·과정에 걸리는 출처 확인된 지역 사실이 없습니다.</p>`}
<p class="fine">전국 비교: 채용 공고·기업 자료를 아직 받지 않아 비교하지 않습니다. 기업 이름을 추천하지 않습니다.</p></div></section>`);

  /* ── 05 적합·준비·빈자리 ── */
  P.push(`<section class="ch pg">${opener(5, "Fit · Readiness · Gap", "끌리는 것과 준비된 것은 다르다", "세로는 스스로 답한 관심, 가로는 판정으로 확인된 축의 수입니다. 둘을 더해 한 점수로 만들지 않습니다.")}
${fitChart(g)}
<p class="lg"><span><i class="pt p-on"></i>확인된 판단 있음</span><span><i class="pt p-zero"></i>깊게 물었으나 확인 0</span><em>${tag("JUDGED")} 가로 ${tag("SELF")} 세로</em></p>
<div class="two"><div><h3>가장 먼저 채울 빈자리 ${tag("JUDGED")}</h3>${gapList(g)}</div>
<div><h3>이 권고의 제약</h3><ul class="cons">${g.constraints.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div></div></section>`);

  /* ── 06 포트폴리오·프로젝트 ── */
  P.push(`<section class="ch">${opener(6, "Portfolio & Project Strategy", "검증할 수 있는 결과물을 남기는 다음 과제", w.projects.length ? `결과에서 나온 할 일 ${w.projects.length}개를 과제로 풀었습니다. 기간·난이도는 학생이 답한 경험 수준에서 왔고, 결과물과 검증 대상은 그 영역의 업무 흐름에서 왔습니다.` : "결과에서 나온 과제가 없습니다.")}
<div class="proj">${w.projects.map((p, i) => `<article><p class="pj-k">${tag("ADVICE")} 과제 ${i + 1} · ${esc(p.horizon)} 안에 · ${esc(p.length)}</p><h3>${esc(p.title)}</h3>
<dl><dt>난이도</dt><dd>${esc(p.level)}</dd><dt>직접 정할 것</dt><dd>${esc(p.decide || "—")}</dd><dt>방법</dt><dd>${esc(p.method || "—")}</dd><dt>남길 결과물</dt><dd>${esc(p.outputs.join(" · ") || "—")}</dd><dt>무엇과 견주나</dt><dd>${esc(p.verify.join(" · ") || "—")}</dd><dt>막히면</dt><dd>${esc(p.onFail || "—")}</dd></dl></article>`).join("")}</div>
<h3>포트폴리오 정리표 <small>이미 고른 결과물은 채워 두었고, 빈칸은 직접 적습니다</small></h3>
<table class="tb pf"><thead><tr><th>산출물</th><th>영역·내 역할</th><th>내가 정한 것</th><th>무엇과 견줬나</th><th>결과(수치)</th><th>남은 검증</th></tr></thead><tbody>${w.portfolio.map((r) => `<tr class="${r.filled ? "" : "blank"}"><td>${esc(r.item)}</td><td>${esc(r.role)}</td><td>${esc(r.decided)}</td><td>${esc(r.verified)}</td><td>${esc(r.result)}</td><td>${esc(r.next)}</td></tr>`).join("")}</tbody></table></section>`);

  /* ── 07 자소서·면접 스튜디오 ── */
  P.push(`<section class="ch">${opener(7, "Resume · Statement · Interview Studio", "근거 → 역량 문장 → 직무 맞춤 표현", w.studio.length ? "판정으로 확인된 영역에서만 문장을 만듭니다. 대괄호는 본인이 사실대로 채울 자리입니다. 수치와 결과를 대신 적지 않습니다." : "판정으로 확인된 영역이 아직 없어 문장을 만들지 않습니다. 아래 질문과 기입란으로 근거부터 모읍니다.")}
${w.studio.map((s) => `<div class="studio"><p class="sd">${esc(s.domain)}</p><div class="conv"><div><p class="cl">근거 ${tag("SELF")}</p><p>${esc(s.evidence)}</p></div><div class="ar">→</div><div><p class="cl">역량 문장 ${tag("JUDGED")}</p><p>${esc(s.competence)}</p></div><div class="ar">→</div><div><p class="cl">직무 맞춤 표현</p><p>${esc(s.forRole)}</p></div></div>
<p class="q">예상 질문: ${esc(s.ask)}</p><p class="shape">${s.answerShape.map((x) => `<span>${esc(x)}</span>`).join("")}</p><p class="fine">더 확보할 것: ${esc(s.more)}</p></div>`).join("")}
<h3>예상 면접 질문과 준비 상태</h3><table class="tb qs"><thead><tr><th>질문</th><th>어디서</th><th>지금 답할 수 있나</th></tr></thead><tbody>${w.questions.map((q) => `<tr><td>${esc(q.q)}</td><td>${esc(q.from)}</td><td>${esc(q.need)}</td></tr>`).join("") || `<tr><td colspan="3">질문을 만들 판정·빈자리가 없습니다</td></tr>`}</tbody></table></section>`);

  /* ── 08 30/90/180 ── */
  P.push(`<section class="ch">${opener(8, "30 · 90 · 180 Day Action Plan", "언제, 무엇을 남기고, 어떻게 확인하나", "결과 모델의 때(지금 · 다음 · 나중)를 30·90·180일로 옮겼습니다. 날짜는 엔진이 정한 것이 아니라 읽기 쉽게 옮긴 것입니다.")}
<div class="plan">${w.plan.map((c) => `<div class="col"><p class="ph"><b>${esc(c.label)}</b><span>${esc(c.days)}</span></p>${c.items.length ? c.items.map((it) => `<div class="it"><p class="iw"><span class="box"></span>${esc(it.what)}</p><p><small>남길 것</small>${esc(it.output)}</p><p><small>확인 기준</small>${esc(it.check)}</p></div>`).join("") : `<p class="none">이 때에 낸 할 일이 없습니다</p>`}</div>`).join("")}</div>
${w.course ? `<p class="course">${tag("SOURCE")} 지금 열린 공식 과정: ${esc(w.course)} — 과제 하나를 끝까지 하고 무엇을 정하고 무엇과 견줬는지 적으면 위 계획의 근거가 됩니다. 과정 이수 자체를 역량 확인으로 세지 않습니다.</p>` : ""}
<div class="write"><p class="cl">30일 안에 남길 경험 한 문단 — 상황 · 내가 정한 것 · 견준 것 · 남은 결과(수치는 본인이)</p>${"<i></i>".repeat(5)}</div></section>`);

  /* ── 09 부록 ── */
  P.push(`<section class="ch app">${opener(9, "Appendix & Sources", "측정의 경계와 출처", "")}
<div class="two"><div><h3>여덟 판단 축</h3><dl class="gl2">${AXES.map((a) => `<dt>${esc(AXIS_KO[a])}</dt><dd>${esc(({ J1: "무엇을 풀 문제로 잡았는가", J2: "받은 요구를 어떻게 읽었는가", J3: "직접 정한 조건과 기준", J4: "어떤 방법과 도구로 했는가", J5: "무엇이 결과물로 남았는가", J6: "무엇과 비교해 확인했는가", J7: "안 됐을 때 무엇을 고쳤는가", J8: "그 결과가 어디에 쓰였는가" } as Record<string, string>)[a])}</dd>`).join("")}</dl>
<h3>재지 않는 것</h3><p>${esc(g.notMeasured.join(" · ") || "—")}</p>
<h3>문서 정보</h3><dl class="gl2">${g.versions.map((v) => `<dt>${esc(v.k)}</dt><dd>${esc(v.v)}</dd>`).join("")}<dt>응답 품질</dt><dd>${esc(g.quality)}</dd></dl></div>
<div><h3>사업 사실과 검증 상태</h3><ul class="facts">${g.facts.map((f) => `<li><b>${esc(f.id)}</b> ${esc(f.text)} <small>${esc(f.status)} · [${esc(f.source)}]${f.caution ? ` · ${esc(f.caution)}` : ""}</small></li>`).join("")}</ul>
<h3>출처</h3><ul class="src">${g.sources.map((s) => `<li><b>${esc(s.label)}</b> <span>${esc(s.url)}</span></li>`).join("")}</ul>
<p class="fine">확인한 날 ${esc(g.checkedOn)}. ${esc(g.verificationNote)}</p></div></div>
<p class="legal">CareerMatri 는 직업정보 제공까지 합니다. 채용 알선 · 추천서 발급을 하지 않고 기업을 추천하지 않습니다. 이 검사는 규준과 인지 면접 전이라 검증된 검사가 아닙니다.</p></section>`);

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>전주대학교 · ${esc(g.id)} · CareerMatri 개인 리포트</title><style>${CSS}</style></head><body>${P.join("\n")}</body></html>`;
}

const CSS = `
@page{size:A4;margin:14mm 17mm 15mm;@top-left{content:"전주대학교 × CareerMatri · 학생 개인 리포트";font-family:sans-serif;font-size:7.5pt;color:#8a94a6}@top-right{content:"비공개 · 본인 열람용";font-family:sans-serif;font-size:7.5pt;color:#8a94a6}@bottom-left{content:"점수 · 적합도 · 합격 가능성을 만들지 않습니다";font-family:sans-serif;font-size:7.5pt;color:#8a94a6}@bottom-right{content:counter(page) " / " counter(pages);font-family:sans-serif;font-size:7.5pt;color:#8a94a6}}
@page:first{margin:0;@top-left{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-right{content:none}}
:root{--ink:#111a2b;--ink2:#3f4a5e;--mute:#667085;--line:#d8dde6;--line2:#eceff4;--tint:#f4f6f9;--navy:#132a4d;--blue:#2457c5;--gap:#b4431b;--amber:#a15c07}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:"Noto Sans CJK KR","Noto Sans KR","Apple SD Gothic Neo","WenQuanYi Zen Hei",sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.62;word-break:keep-all;overflow-wrap:anywhere;background:#fff}
section{padding:0}
h1,h2,h3,p{margin:0}
.ch{padding-top:2mm;margin-top:11mm}.ch.pg{break-before:page;margin-top:0}
.op{break-inside:avoid;break-after:avoid}
h3{font-size:11.5pt;margin:7mm 0 2.5mm;font-weight:700;color:var(--navy)}
h3{break-after:avoid}.keep{break-inside:avoid}
h3 small{font-weight:400;color:var(--mute);font-size:8.8pt;margin-left:6px}
.fine{font-size:8.7pt;color:var(--mute);margin-top:2.5mm}
.none{color:var(--mute);font-size:9.6pt}
.two{display:grid;grid-template-columns:1fr 1fr;gap:9mm}
/* 층 딱지 */
.tg{display:inline-block;font-size:7.6pt;font-weight:700;letter-spacing:.02em;padding:0 5px;border-radius:3px;line-height:15px;vertical-align:1px;white-space:nowrap}
.tg-JUDGED{background:var(--navy);color:#fff}.tg-SELF{border:1px solid var(--navy);color:var(--navy);line-height:13px}
.tg-READ{background:#e4e8ef;color:var(--ink2)}.tg-ADVICE{border:1px solid var(--blue);color:var(--blue);line-height:13px}.tg-SOURCE{border:1px solid var(--amber);color:var(--amber);line-height:13px}
/* 표지 */
.cover{height:297mm;margin:0;padding:26mm 17mm 22mm;background:var(--navy);color:#fff;display:flex;flex-direction:column;break-after:page;position:relative;overflow:hidden}
.cover::after{content:"";position:absolute;right:-40mm;top:-40mm;width:150mm;height:150mm;border-radius:50%;background:radial-gradient(circle,rgba(66,120,230,.35),rgba(19,42,77,0) 70%)}
.cv-k{font-size:9pt;letter-spacing:.18em;font-weight:700;opacity:.8}.cv-p{font-size:10.5pt;margin-top:2mm;opacity:.92}
.cv-mid{margin-top:auto;position:relative;z-index:1}
.cv-badge{display:inline-block;border:1px solid rgba(255,255,255,.5);border-radius:3px;padding:1px 8px;font-size:9pt;margin-bottom:5mm}
.cover h1{font-size:27pt;line-height:1.28;font-weight:700;letter-spacing:-.01em;max-width:160mm}
.cv-lead{font-size:11.5pt;line-height:1.6;margin-top:5mm;max-width:150mm;opacity:.9}
.cv-num{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:12mm;border-top:1px solid rgba(255,255,255,.35);position:relative;z-index:1}
.cv-num div{padding:4mm 4mm 0 0;border-right:1px solid rgba(255,255,255,.18);margin-right:4mm}.cv-num div:last-child{border-right:0}
.cv-num b{display:block;font-size:34pt;line-height:1;font-weight:700}.cv-num span{display:block;font-size:10pt;margin-top:2mm;font-weight:700}.cv-num small{display:block;font-size:8.2pt;opacity:.75;line-height:1.4;margin-top:1mm}
.cv-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm 6mm;margin:10mm 0 0;font-size:9pt;position:relative;z-index:1}
.cv-meta dt{opacity:.65;font-size:8pt}.cv-meta dd{margin:0;font-weight:700}
.cv-demo{margin-top:6mm;font-size:8.6pt;background:rgba(255,196,87,.16);border-left:3px solid #ffc457;padding:2mm 3mm;position:relative;z-index:1}
/* 장 머리 */
.op{border-top:3px solid var(--navy);padding-top:4mm;margin-bottom:6mm}
.op-k{display:flex;align-items:baseline;gap:4mm;color:var(--blue);font-weight:700;font-size:9pt;letter-spacing:.12em;text-transform:uppercase}
.op-k b{font-size:30pt;line-height:1;letter-spacing:0;color:var(--navy)}
.op h2{font-size:20pt;line-height:1.3;margin-top:2mm;letter-spacing:-.01em}
.op-t{font-size:11pt;color:var(--ink2);margin-top:2.5mm;max-width:160mm}
/* 요약 */
.brief{list-style:none;padding:0;margin:0}
.brief li{display:grid;grid-template-columns:14mm 1fr;gap:3mm;padding:4.2mm 0;border-bottom:1px solid var(--line);break-inside:avoid}
.bn{font-size:22pt;font-weight:700;color:var(--blue);line-height:1}
.bk{font-size:9.4pt;font-weight:700;color:var(--mute);letter-spacing:.02em}.bv{font-size:12pt;line-height:1.55;margin-top:1mm}.bnote{font-size:8.7pt;color:var(--mute);margin-top:1mm}
.legend{margin-top:7mm;background:var(--tint);padding:4mm 5mm;border-radius:2px;font-size:9.6pt;break-inside:avoid}
.legend ul{margin:2mm 0 0;padding:0;list-style:none;columns:2;column-gap:8mm}.legend li{margin:0 0 1.5mm;break-inside:avoid}
/* 표 */
.tb{width:100%;border-collapse:collapse;font-size:9.6pt;line-height:1.5}
.tb th{text-align:left;font-weight:700;color:var(--mute);font-size:8.8pt;border-bottom:1.5px solid var(--navy);padding:1.6mm 2mm}
.tb td{border-bottom:1px solid var(--line2);padding:1.8mm 2mm;vertical-align:top}
.qs td:nth-child(2){white-space:nowrap}.tb tr{break-inside:avoid}.tb thead{display:table-header-group}
.ledger td:nth-child(1){width:38%;font-weight:600}.ledger td:nth-child(2){width:13%}.ledger td:nth-child(3){width:30%;color:var(--ink2)}.ledger td:nth-child(4){color:var(--ink2)}
/* 판정 지도 */
.hm{width:100%;border-collapse:separate;border-spacing:2px;font-size:9pt}
.hm th{font-weight:700;color:var(--mute);font-size:8pt;vertical-align:bottom;padding:0 0 1mm;text-align:center}
.hm th span{display:block;line-height:1.25}
.hm .hm-d{text-align:left;width:34mm}.hm td.hm-d b{display:block;font-size:9.6pt}.hm td.hm-d small{color:var(--mute);font-size:8pt}
.hm .hm-n{width:13mm;text-align:right;color:var(--mute)}.hm .hm-n b{color:var(--ink);font-size:12pt}
.hc{height:9mm;border-radius:2px;border:1px solid var(--line)}
.hc.s0{background:#fff}.hc.s1{background:#e3e7ee;border-color:#e3e7ee}.hc.s2{background:#7d9be0;border-color:#7d9be0}.hc.s3{background:var(--navy);border-color:var(--navy)}
.lg{display:flex;flex-wrap:wrap;gap:4mm;align-items:center;font-size:8.8pt;color:var(--ink2);margin-top:2mm}
.lg span{display:inline-flex;align-items:center;gap:1.5mm}.lg i.hc{display:inline-block;width:4mm;height:4mm}.lg em{font-style:normal;color:var(--mute);margin-left:auto}
.self td{padding:1.1mm 2mm}
.dt{display:inline-flex;align-items:center;gap:2px;white-space:nowrap}.dt i{width:2.3mm;height:2.3mm;border-radius:50%;border:1px solid #9aa6ba;display:inline-block}.dt i.on{background:var(--navy);border-color:var(--navy)}.dt em{font-style:normal;color:var(--mute);font-size:8pt;margin-left:4px}
.aiT td.st{font-weight:700;white-space:nowrap}.st-측정{color:var(--navy)}.st-미측정{color:var(--gap)}.st-교육과정만{color:var(--amber)}.st-자기보고만{color:var(--mute)}
.tools{font-size:9.4pt;margin-top:4mm;color:var(--ink2)}.tools small{color:var(--mute);font-size:8.4pt}
/* 직무 */
.roles{display:grid;grid-template-columns:1fr 1fr;gap:7mm;break-inside:avoid}
.role{border-top:2px solid var(--navy);padding-top:3mm}
.role h3{margin:1.5mm 0 3mm;font-size:14pt;color:var(--ink)}
.rk{font-size:8.6pt;color:var(--mute)}
.rl{font-size:8.6pt;font-weight:700;color:var(--mute);margin:3mm 0 1mm;letter-spacing:.02em}
.work{margin:0;padding:0 0 0 5mm;font-size:9.6pt}.work li{margin-bottom:1.6mm}.work b{display:block}.work span{color:var(--ink2);font-size:9.2pt}
.watch span,.ctr span{display:inline-block;margin:0 2.5mm 1.2mm 0;font-size:9.4pt}
.watch .hit{color:var(--navy);font-weight:700}.watch .miss{color:var(--mute)}
.ctr span{padding:0 6px;border-radius:3px;border:1px solid var(--line)}.ctr .hit{background:var(--navy);color:#fff;border-color:var(--navy)}
.cond{font-size:9.4pt;margin-top:3mm;color:var(--ink2);background:var(--tint);padding:2.5mm 3mm}
.region{margin:0;padding:0;list-style:none;font-size:9.6pt}.region li{padding:1.6mm 0;border-bottom:1px solid var(--line2);break-inside:avoid}.region small{color:var(--mute)}
/* 적합·준비 */
svg.fit{width:100%;height:auto;margin-top:2mm}
.fit .ba{fill:#f6f7fa}.fit .bb{fill:#fff}.fit .gl{stroke:#e2e6ed}.fit .ax{font-size:11px;fill:#667085}.fit .pl{font-size:12px;fill:#111a2b;font-weight:600;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}.fit .halo{paint-order:stroke;stroke:#fff;stroke-width:4px}.fit .lead{stroke:#c3cad6;stroke-dasharray:2 3}
.offx{font-size:9.2pt;color:var(--ink2);margin-top:2mm}.offx span{display:block;margin-top:.6mm;color:var(--mute)}
.nx{font-size:7.6pt;color:var(--mute);border:1px solid var(--line);border-radius:3px;padding:0 4px;margin-left:4px;white-space:nowrap}
.p-on{fill:#132a4d}.p-zero{fill:#fff;stroke:#132a4d;stroke-width:2}.p-off{fill:#fff;stroke:#9aa6ba;stroke-width:1.5;stroke-dasharray:2 2}
.lg i.pt{display:inline-block;width:3.2mm;height:3.2mm;border-radius:50%}.lg i.p-on{background:var(--navy)}.lg i.p-zero{border:2px solid var(--navy)}.lg i.p-off{border:1.5px dashed #9aa6ba}
.gd{margin-bottom:3mm;break-inside:avoid}.gd>b{display:block;color:var(--gap);font-size:10.5pt}.gd ol{margin:1mm 0 0;padding:0 0 0 5mm}.gd li{margin-bottom:1.6mm}.gd span{display:block}.gd small{display:block;color:var(--mute);font-size:8.8pt;line-height:1.45}
.cons{margin:0;padding:0 0 0 4mm;font-size:9.6pt;color:var(--ink2)}.cons li{margin-bottom:1.6mm}
/* 프로젝트 */
.proj{display:grid;grid-template-columns:1fr;gap:3.5mm}
.proj article{display:grid;grid-template-columns:50mm 1fr;gap:1mm 6mm;border-top:1px solid var(--navy);padding-top:2.2mm;break-inside:avoid}
.proj .pj-k{grid-column:1/-1;font-size:8.8pt;color:var(--mute)}
.proj h3{margin:0;font-size:12.5pt;color:var(--ink)}
.proj dl{margin:0;display:grid;grid-template-columns:22mm 1fr;gap:.6mm 3mm;font-size:9.4pt;line-height:1.45}.proj dt{color:var(--mute);font-size:8.8pt}.proj dd{margin:0}
.pf td{height:8mm}.pf tr.blank td{border-bottom:1px solid #c9d0db}
/* 스튜디오 */
.studio{border-top:1px solid var(--navy);padding-top:3mm;margin-bottom:5mm;break-inside:avoid}
.sd{font-weight:700;font-size:11pt}
.conv{display:grid;grid-template-columns:1fr 6mm 1fr 6mm 1.25fr;gap:2mm;margin-top:2mm;font-size:9.6pt}
.conv>div:not(.ar){background:var(--tint);padding:2.5mm 3mm}.ar{align-self:center;text-align:center;color:var(--blue);font-weight:700}
.cl{font-size:8.6pt;font-weight:700;color:var(--mute);margin-bottom:1mm}
.q{margin-top:2.5mm;font-weight:600}
.shape{display:flex;gap:2mm;flex-wrap:wrap;margin-top:1.5mm}.shape span{font-size:8.8pt;border:1px solid var(--line);padding:0 6px;border-radius:3px}
.write{margin-top:6mm;break-inside:avoid}.write i{display:block;height:8.5mm;border-bottom:1px solid #c9d0db}
/* 계획 */
.plan{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}
.col{border-top:3px solid var(--blue);padding-top:2mm}.col:nth-child(2){border-color:var(--navy)}.col:nth-child(3){border-color:#8a96ab}
.ph b{font-size:20pt;line-height:1;margin-right:2mm}.ph span{color:var(--mute);font-size:8.8pt}
.it{margin-top:3.5mm;padding-bottom:3mm;border-bottom:1px solid var(--line2);font-size:9.5pt;break-inside:avoid}
.it p{margin-top:1mm}.it small{display:block;color:var(--mute);font-size:8.2pt}
.iw{font-weight:600}.box{display:inline-block;width:3.2mm;height:3.2mm;border:1.4px solid var(--navy);margin-right:2mm;vertical-align:-1px}
.course{margin-top:6mm;font-size:9.6pt;color:var(--ink2)}
/* 부록 */
.gl2{display:grid;grid-template-columns:22mm 1fr;gap:1mm 3mm;margin:0;font-size:9.4pt}.gl2 dt{font-weight:700}.gl2 dd{margin:0;color:var(--ink2)}
.facts,.src{margin:0;padding:0;list-style:none;font-size:9.2pt}.facts li,.src li{padding:1mm 0;border-bottom:1px solid var(--line2);break-inside:avoid}
.facts small{display:block;color:var(--mute);font-size:8.4pt}.src span{display:block;color:var(--mute);font-size:8.3pt;word-break:break-all}
.legal{margin-top:6mm;font-size:8.8pt;color:var(--mute);border-top:1px solid var(--line);padding-top:2.5mm}
@media screen{body{background:#e9ecf1;padding:24px 0}section{background:#fff;max-width:210mm;margin:0 auto 18px;padding:14mm 17mm;box-shadow:0 1px 3px rgba(17,26,43,.12)}.cover{height:auto;min-height:250mm;padding:16mm 17mm}}
@media screen and (max-width:720px){section{padding:20px 16px !important}.two,.roles,.plan,.conv{grid-template-columns:1fr}.ar{transform:rotate(90deg)}.proj article{grid-template-columns:1fr}.cv-num{grid-template-columns:1fr 1fr}.cv-meta{grid-template-columns:1fr 1fr}.cover h1{font-size:20pt}.tb{display:block;overflow-x:auto}.hm{font-size:8pt}}
`;
