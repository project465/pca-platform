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

/** 장 머리. 영어 소제목을 두지 않는다: 번호 동그라미 · 제목 · 한 줄 */
function opener(no: number, _kicker: string, title: string, thesis: string): string {
  return `<header class="op op-c${no % 4}"><p class="op-n">${pad2(no)}</p><div><h2>${esc(title)}</h2>${thesis ? `<p class="op-t">${esc(thesis)}</p>` : ""}</div></header>`;
}

/**
 * 표지의 동심원. 전주대 옛 보고서 표지의 원 무늬를 학교 색으로 옮긴 장식이고
 * 값을 담지 않는다. **학교 상징(JJ 표시 · 별)은 그리지 않는다**: 쓰려면 학교
 * 승인이 먼저다(JJU_MVP 8절 5).
 */
const RINGS = [[24, 34, 16], [52, 18, 11], [14, 70, 9], [40, 96, 13], [18, 128, 7], [30, 160, 10], [196, 214, 13], [203, 246, 8], [188, 279, 6]]
  .map(([x, y, r]) => `<g transform="translate(${x} ${y})">${[1, .78, .56, .34].map((k, i) => `<circle r="${(r * k).toFixed(1)}" fill="none" stroke="${i % 2 ? "#9cc8e6" : "#c9e1f2"}" stroke-width="${i === 3 ? 1.6 : .7}"/>`).join("")}<circle r="${(r * .14).toFixed(1)}" fill="#0084c0" opacity=".55"/></g>`).join("");
const SWASH = `<path d="M-10 118C40 104 90 112 140 96S200 70 230 74" fill="none" stroke="#d6e6f3" stroke-width="1.2"/>
<path d="M-10 124C46 112 100 120 150 104S206 82 232 86" fill="none" stroke="#e6f0f8" stroke-width=".8"/>`;

/** 한눈에 보기 칸의 표시. 흰 선 하나로 그린다 */
const TILE_IC = [
  `<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
  `<path d="M6 21V4h11l-2.5 4L17 12H6"/>`,
  `<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>`,
  `<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>`,
];

const DONUT_C: Record<string, string> = { OWNED: "#0c3060", CONFIRMED: "#1854a8", PARTICIPATED: "#7fc0e4", NOT_OBSERVED: "#e5e8eb" };

/**
 * 한눈에 보기 — 숫자 칸 넷 · 영역 막대 · 판단 도넛. **값을 새로 만들지 않는다**:
 * 칸은 `g.numbers`, 막대는 깊게 물은 영역의 확인된 축 수(0~8), 도넛은 그 영역들의
 * 축 판정 상태를 센 것이다. 깊게 묻지 않은 영역은 막대를 그리지 않는다(0 으로
 * 읽힌다).
 */
function glance(g: GoldDoc): string {
  const tiles = `<div class="tiles">${g.numbers.map((n, i) => `<div class="tile t${i % 4}"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">${TILE_IC[i % 4]}</svg></span><b>${esc(n.v)}</b><p>${esc(n.k)}</p><small>${esc(n.sub)}</small></div>`).join("")}</div>`;
  const rows = g.domains.filter((d) => d.explored).sort((a, b) => b.confirmed - a.confirmed);
  const bars = rows.length ? `<div class="bars">${rows.map((d) => `<div class="br"><span class="bl">${esc(d.name)}</span><span class="bt"><i style="width:${Math.round((d.confirmed / 8) * 100)}%"></i></span><b>${d.confirmed}<small>/8</small></b></div>`).join("")}</div>`
    : `<p class="none">이번에는 깊게 물은 영역이 없어 막대를 그리지 않았어요.</p>`;
  const order = ["OWNED", "CONFIRMED", "PARTICIPATED", "NOT_OBSERVED"];
  const cnt = order.map((k) => rows.reduce((a, d) => a + d.axes.filter((x) => x.state === k).length, 0));
  const total = cnt.reduce((a, b) => a + b, 0);
  let off = 0;
  const segs = total ? order.map((k, i) => {
    const len = (cnt[i] / total) * 100; const seg = `<circle r="15.915" cx="21" cy="21" fill="none" stroke="${DONUT_C[k]}" stroke-width="6" stroke-dasharray="${len.toFixed(2)} ${(100 - len).toFixed(2)}" stroke-dashoffset="${(25 - off).toFixed(2)}"/>`;
    off += len; return seg;
  }).join("") : "";
  const donut = total ? `<div class="donut"><svg viewBox="0 0 42 42" aria-hidden="true"><circle r="15.915" cx="21" cy="21" fill="none" stroke="#f2f4f6" stroke-width="6"/>${segs}<text x="21" y="20.5" text-anchor="middle" class="dn">${total}</text><text x="21" y="26" text-anchor="middle" class="dk">칸</text></svg>
<ul>${order.map((k, i) => `<li><i style="background:${DONUT_C[k]}"></i>${esc(STATE_KO[k])}<b>${cnt[i]}</b></li>`).join("")}</ul></div>`
    : `<p class="none">깊게 물은 영역이 없어 도넛을 그리지 않았어요.</p>`;
  return `${tiles}<div class="two vis"><div><h3>영역별로 확인된 판단 <small>여덟 축 가운데</small></h3>${bars}</div><div><h3>판단을 어디까지 했나 <small>깊게 물은 영역의 축</small></h3>${donut}</div></div>`;
}

const STATE_CLS: Record<string, string> = { OWNED: "s3", CONFIRMED: "s2", PARTICIPATED: "s1", NOT_OBSERVED: "s0" };
const STATE_KO: Record<string, string> = { OWNED: "직접 결정", CONFIRMED: "직접 수행", PARTICIPATED: "받아서 수행", NOT_OBSERVED: "아직 없음" };

function heatmap(g: GoldDoc): string {
  const rows = g.domains.filter((d) => d.explored);
  if (!rows.length) return `<p class="none">이번 검사에서 깊게 물은 영역이 없어 판정 지도를 그리지 않아요.</p>`;
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
${off.length ? `<p class="offx"><b>깊게 묻지 않은 영역</b> 판정이 없어 점을 찍지 않았어요. 관심만 답했어요. ${off.map(([b, n]) => `<span>관심 ${b}: ${esc(n.join(" · "))}</span>`).join("")}</p>` : ""}`;
}

/** 빈자리를 영역마다 한 번만 이름을 적고 그 아래에 묶는다 */
function gapList(g: GoldDoc): string {
  if (!g.gaps.length) return `<p class="none">결과 모델이 적은 빈자리가 없어요.</p>`;
  const by = new Map<string, { title: string; why: string }[]>();
  for (const x of g.gaps) { const k = x.domains.join(" · "); by.set(k, [...(by.get(k) ?? []), { title: x.title, why: x.why }]); }
  return `<div class="gaps">${[...by.entries()].map(([d, xs]) => `<div class="gd"><b>${esc(d)}</b><ol>${xs.map((x) => `<li><span>${esc(x.title)}</span><small>${esc(x.why)}</small></li>`).join("")}</ol></div>`).join("")}</div>`;
}

export function goldHtml(g: GoldDoc, w: Workbook): string {
  const P: string[] = [];

  /* ── 표지 ── 흰 바탕 · 동심원 · 오른쪽 위 학교 색 상자 · 큰 해와 제목 */
  P.push(`<section class="cover">
<svg class="rings" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">${SWASH}${RINGS}</svg>
<div class="cv-box"><b>전주대학교</b><span>JEONJU UNIVERSITY</span></div>
<div class="cv-mid"><p class="cv-k">${esc(g.program)}</p><p class="cv-y">${esc(g.submitted.slice(0, 4))}</p><p class="cv-t1">커리어 분석</p><p class="cv-t2">리포트</p><i class="cv-rule"></i>
<p class="cv-lead">${esc(g.title)}</p>${g.lead ? `<p class="cv-sub">${esc(g.lead)}</p>` : ""}</div>
<div class="cv-bot"><p class="cv-who">${esc(g.student.track)} · ${esc(g.student.field)}${g.student.spec ? ` · ${esc(g.student.spec)}` : ""}</p><p>${esc(g.id)} · 응답일 ${esc(g.submitted)} · 전주대학교 × CareerMatri</p>
${g.demo ? `<p class="cv-demo">시연 자료예요. 합성 학생이고, 컴퓨터·소프트웨어 검사는 전공자 검토 전이라 학생 진단이나 사업 성과로 쓰지 않아요.</p>` : ""}</div>
</section>`);

  /* ── 01 한눈에 보기 ── */
  P.push(`<section class="ch pg">${opener(1, "", "한눈에 보기", "숫자는 이번 응답에서 센 거예요. 점수나 순위가 아니에요.")}
${glance(g)}
<h3>다섯 줄 요약</h3>
<ol class="brief">${g.brief.map((b, i) => `<li><span class="bn">${i + 1}</span><div><p class="bk">${esc(b.k)} ${tag(b.layer)}</p><p class="bv">${esc(b.v)}</p>${b.note ? `<p class="bnote">${esc(b.note)}</p>` : ""}</div></li>`).join("")}</ol>
<p class="fine">${tag("JUDGED")} 검사가 판정한 것 · ${tag("SELF")} 스스로 답한 것 · ${tag("READ")} 직무·산업에 이어 읽은 것 · ${tag("ADVICE")} 결과에서 나온 할 일 · ${tag("SOURCE")} 바깥 출처</p></section>`);

  /* ── 03 전공·기술 프로필 ── */
  const tried = g.domains.filter((d) => d.experience !== "해 본 적 없음" && d.experience !== "답 없음").length;
  P.push(`<section class="ch">${opener(2, "", `${g.student.field}에서 해 본 판단`, `${g.domains.length}개 영역 가운데 ${g.domains.filter((d) => d.explored).length}곳을 깊게 물었고, ${tried}곳은 해 본 적이 있다고 답했어요.`)}
<h3>판정 지도 <small>깊게 물은 영역 × 여덟 축</small></h3>${heatmap(g)}
<h3>스스로 답한 관심·경험·학습 의향 ${tag("SELF")} <small>판정이 아닙니다 · 점 셋 = 높음 / 여러 번</small></h3>
<table class="tb self"><thead><tr><th>영역</th><th>관심</th><th>경험</th><th>배울 뜻</th></tr></thead><tbody>${g.domains.map((d) => `<tr><td>${esc(d.name)}${d.explored ? "" : ` <span class="nx">깊게 묻지 않음</span>`}</td><td>${dots(d.interest, "band")}</td><td>${dots(d.experience, "exp")}</td><td>${dots(d.learning, "band")}</td></tr>`).join("")}</tbody></table>
<h3>AI 역량, 검사가 묻는 것과 묻지 않는 것</h3>
<table class="tb aiT"><thead><tr><th>역량</th><th>이 검사</th><th>이 학생</th></tr></thead><tbody>${g.ai.map((a) => `<tr><td>${esc(a.name)}</td><td class="st st-${esc(a.status)}">${esc(a.status)}</td><td>${esc(a.how)}</td></tr>`).join("")}</tbody></table>
<p class="fine">미측정 역량에 점수를 매기지 않아요. 공식 과정이 다루더라도 문항이 없으면 확인된 역량으로 세지 않아요.</p>
${g.tools.length ? `<p class="tools"><b>그 영역에서 흔히 쓰는 도구</b> ${g.tools.map((t) => `${esc(t.domain)}: ${esc(t.tools.join(" · ") || "—")}`).join(" / ")}<br><small>전공 사전의 목록이에요. 이 학생이 다룬다는 뜻이 아닙니다.</small></p>` : ""}</section>`);

  /* ── 04 산업·직무 ── */
  P.push(`<section class="ch">${opener(3, "", "그 일은 무엇을 하고, 무엇을 볼까요", g.roles.length ? "고른 직무와 결과에서 이어진 직무만 적었어요. 그 일의 차례와 그 자리가 보는 판단을 내 결과와 나란히 놓았어요." : "고른 직무도, 결과에서 이어진 직무도 아직 없어요.")}
<div class="roles">${g.roles.slice(0, 2).map((r) => `<article class="role"><p class="rk">${tag(r.from)} ${r.from === "SELF" ? "학생이 고른 직무" : "판정에서 이은 직무"}</p><h3>${esc(r.name)}</h3>
<p class="rl">그 일이 하는 차례</p><ol class="work">${r.work.map((s) => `<li><b>${esc(s.name)}</b><span>${esc(s.detail)}</span></li>`).join("") || "<li>그 Core 사전에 업무 흐름이 없어요</li>"}</ol>
<p class="rl">그 자리가 보는 판단 · 이 학생</p><p class="watch">${r.watched.map((x) => `<span class="${x.hit ? "hit" : "miss"}">${x.hit ? "●" : "○"} ${esc(AXIS_KO[x.axis])}</span>`).join("")}</p>
<p class="rl">중심 영역</p><p class="ctr">${r.centers.map((c) => `<span class="${c.hit ? "hit" : "miss"}">${esc(c.name)}</span>`).join("")}</p>
<p class="cond">${tag("READ")} ${esc(r.condition)}</p></article>`).join("")}</div>
${g.industries.length ? `<h3>산업별 중심 영역과 내 결과</h3><table class="tb"><thead><tr><th>산업</th><th>어디서</th><th>그 산업의 중심 영역</th><th>이 학생</th></tr></thead><tbody>${g.industries.map((i) => `<tr><td><b>${esc(i.name)}</b></td><td>${tag(i.from)}</td><td>${esc(i.centers)}</td><td>${esc(i.status)}</td></tr>`).join("")}</tbody></table>` : ""}
<div class="keep"><h3>지역과 전국</h3>
${g.region.length ? `<ul class="region">${g.region.slice(0, 3).map((r) => `<li>${tag("SOURCE")} <b>${esc(r.label)}</b> ${esc(r.claim)} <small>[${esc(r.id)}]</small></li>`).join("")}</ul>` : `<p class="none">이 학과·과정에 걸리는 출처 확인된 지역 사실이 없어요.</p>`}
<p class="fine">전국 비교: 채용 공고·기업 자료를 아직 받지 않아 비교하지 않아요. 기업 이름을 추천하지 않아요.</p></div></section>`);

  /* ── 05 적합·준비·빈자리 ── */
  P.push(`<section class="ch pg">${opener(4, "", "끌리는 것과 준비된 것", "세로는 스스로 답한 관심, 가로는 확인된 판단의 수예요. 둘을 더해 점수로 만들지 않아요.")}
${fitChart(g)}
<p class="lg"><span><i class="pt p-on"></i>확인된 판단 있음</span><span><i class="pt p-zero"></i>깊게 물었으나 확인 0</span><em>${tag("JUDGED")} 가로 ${tag("SELF")} 세로</em></p>
<div class="two"><div><h3>가장 먼저 채울 빈자리 ${tag("JUDGED")}</h3>${gapList(g)}</div>
<div><h3>이 권고의 제약</h3><ul class="cons">${g.constraints.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div></div></section>`);

  /* ── 06 포트폴리오·프로젝트 ── */
  P.push(`<section class="ch">${opener(5, "", "다음에 남길 결과물", w.projects.length ? `할 일 ${w.projects.length}개를 과제로 풀었어요. 기간과 난이도는 답한 경험 수준에서 정했어요.` : "결과에서 나온 과제가 없어요.")}
<div class="proj">${w.projects.map((p, i) => `<article><p class="pj-k">${tag("ADVICE")} 과제 ${i + 1} · ${esc(p.horizon)} 안에 · ${esc(p.length)}</p><h3>${esc(p.title)}</h3>
<dl><dt>난이도</dt><dd>${esc(p.level)}</dd><dt>직접 정할 것</dt><dd>${esc(p.decide || "—")}</dd><dt>방법</dt><dd>${esc(p.method || "—")}</dd><dt>남길 결과물</dt><dd>${esc(p.outputs.join(" · ") || "—")}</dd><dt>무엇과 견주나</dt><dd>${esc(p.verify.join(" · ") || "—")}</dd><dt>막히면</dt><dd>${esc(p.onFail || "—")}</dd></dl></article>`).join("")}</div>
<h3>포트폴리오 정리표 <small>이미 고른 결과물은 채워 두었고, 빈칸은 직접 적어요</small></h3>
<table class="tb pf"><thead><tr><th>산출물</th><th>영역·내 역할</th><th>내가 정한 것</th><th>무엇과 견줬나</th><th>결과(수치)</th><th>남은 검증</th></tr></thead><tbody>${w.portfolio.map((r) => `<tr class="${r.filled ? "" : "blank"}"><td>${esc(r.item)}</td><td>${esc(r.role)}</td><td>${esc(r.decided)}</td><td>${esc(r.verified)}</td><td>${esc(r.result)}</td><td>${esc(r.next)}</td></tr>`).join("")}</tbody></table></section>`);

  /* ── 07 자소서·면접 스튜디오 ── */
  P.push(`<section class="ch">${opener(6, "", "지원서와 면접으로 옮기기", w.studio.length ? "확인된 영역에서만 문장을 만들었어요. 대괄호는 직접 채울 자리이고, 수치와 결과는 대신 적지 않아요." : "확인된 영역이 아직 없어 문장은 만들지 않았어요. 아래 질문으로 근거부터 모아 봐요.")}
${w.studio.map((s) => `<div class="studio"><p class="sd">${esc(s.domain)}</p><div class="conv"><div><p class="cl">근거 ${tag("SELF")}</p><p>${esc(s.evidence)}</p></div><div class="ar">→</div><div><p class="cl">역량 문장 ${tag("JUDGED")}</p><p>${esc(s.competence)}</p></div><div class="ar">→</div><div><p class="cl">직무 맞춤 표현</p><p>${esc(s.forRole)}</p></div></div>
<p class="q">예상 질문: ${esc(s.ask)}</p><p class="shape">${s.answerShape.map((x) => `<span>${esc(x)}</span>`).join("")}</p><p class="fine">더 확보할 것: ${esc(s.more)}</p></div>`).join("")}
<h3>예상 면접 질문과 준비 상태</h3><table class="tb qs"><thead><tr><th>질문</th><th>어디서</th><th>지금 답할 수 있나</th></tr></thead><tbody>${w.questions.map((q) => `<tr><td>${esc(q.q)}</td><td>${esc(q.from)}</td><td>${esc(q.need)}</td></tr>`).join("") || `<tr><td colspan="3">질문을 만들 판정·빈자리가 없어요</td></tr>`}</tbody></table></section>`);

  /* ── 08 30/90/180 ── */
  P.push(`<section class="ch">${opener(7, "", "30일 · 90일 · 180일 계획", "결과의 지금 · 다음 · 나중을 날짜로 옮겼어요. 읽기 쉽게 옮긴 거예요.")}
<div class="plan">${w.plan.map((c) => `<div class="col"><p class="ph"><b>${esc(c.label)}</b><span>${esc(c.days)}</span></p>${c.items.length ? c.items.map((it) => `<div class="it"><p class="iw"><span class="box"></span>${esc(it.what)}</p><p><small>남길 것</small>${esc(it.output)}</p><p><small>확인 기준</small>${esc(it.check)}</p></div>`).join("") : `<p class="none">이 때에 낸 할 일이 없어요</p>`}</div>`).join("")}</div>
${w.course ? `<p class="course">${tag("SOURCE")} 지금 열린 공식 과정: ${esc(w.course)}. 과제 하나를 끝까지 하고 무엇을 정하고 무엇과 견줬는지 적으면 위 계획의 근거가 됩니다. 과정 이수 자체를 역량 확인으로 세지 않아요.</p>` : ""}
<div class="write"><p class="cl">30일 안에 남길 경험 한 문단: 상황 · 내가 정한 것 · 견준 것 · 남은 결과(수치는 본인이)</p>${"<i></i>".repeat(5)}</div></section>`);

  /* ── 08 근거 장부 ── 부록 앞으로 옮겼다: 본문이 검수 문서로 읽히지 않게 */
  P.push(`<section class="ch">${opener(8, "", "이 리포트가 하는 말과 근거", `${g.ledger.length}가지를 근거와 함께 적었어요. 응답 품질: ${g.quality}.`)}
<table class="tb ledger"><thead><tr><th>주장</th><th>층</th><th>근거</th><th>상태</th></tr></thead><tbody>${g.ledger.map((c) => `<tr><td>${esc(c.text)}</td><td>${tag(c.layer)}</td><td>${esc(c.basis)}</td><td>${esc(c.status)}</td></tr>`).join("")}</tbody></table>
</section>`);

  /* ── 09 부록 ── */
  P.push(`<section class="ch app">${opener(9, "", "측정 범위와 출처", "")}
<div class="two"><div><h3>여덟 판단 축</h3><dl class="gl2">${AXES.map((a) => `<dt>${esc(AXIS_KO[a])}</dt><dd>${esc(({ J1: "무엇을 풀 문제로 잡았는가", J2: "받은 요구를 어떻게 읽었는가", J3: "직접 정한 조건과 기준", J4: "어떤 방법과 도구로 했는가", J5: "무엇이 결과물로 남았는가", J6: "무엇과 비교해 확인했는가", J7: "안 됐을 때 무엇을 고쳤는가", J8: "그 결과가 어디에 쓰였는가" } as Record<string, string>)[a])}</dd>`).join("")}</dl>
<h3>재지 않는 것</h3><p>${esc(g.notMeasured.join(" · ") || "—")}</p>
<h3>문서 정보</h3><dl class="gl2">${g.versions.map((v) => `<dt>${esc(v.k)}</dt><dd>${esc(v.v)}</dd>`).join("")}<dt>응답 품질</dt><dd>${esc(g.quality)}</dd></dl></div>
<div><h3>사업 사실과 검증 상태</h3><ul class="facts">${g.facts.map((f) => `<li><b>${esc(f.id)}</b> ${esc(f.text)} <small>${esc(f.status)} · [${esc(f.source)}]</small></li>`).join("")}</ul>
<h3>출처</h3><ul class="src">${g.sources.map((s) => `<li><b>${esc(s.label)}</b> <span>${esc(s.url)}</span></li>`).join("")}</ul>
<p class="fine">확인한 날 ${esc(g.checkedOn)}. 사업 내용은 사업단이 전해 준 전주대학교 뉴스·공지를 옮긴 거예요. 원문을 직접 대조하면 표시를 바꿔요.</p></div></div>
<p class="legal">CareerMatri 는 직업정보 제공까지 합니다. 채용 알선 · 추천서 발급을 하지 않고 기업을 추천하지 않아요. 이 검사는 규준과 인지 면접 전이라 검증된 검사가 아닙니다.</p></section>`);

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>전주대학교 · ${esc(g.id)} · CareerMatri 커리어 분석 리포트</title><style>${CSS}</style></head><body>${P.join("\n")}</body></html>`;
}

const CSS = `
@page{size:A4;margin:14mm 17mm 15mm;@top-left{content:"전주대학교 × CareerMatri · 커리어 분석 리포트";font-family:sans-serif;font-size:7.5pt;color:#8a94a6}@top-right{content:"본인만 보는 문서";font-family:sans-serif;font-size:7.5pt;color:#8a94a6}@bottom-left{content:"점수나 순위를 만들지 않는 리포트예요";font-family:sans-serif;font-size:7.5pt;color:#8a94a6}@bottom-right{content:counter(page) " / " counter(pages);font-family:sans-serif;font-size:7.5pt;color:#8a94a6}}
@page:first{margin:0;@top-left{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-right{content:none}}
:root{--royal:#1854a8;--blue2:#0084c0;--sky:#0084c0;--star:#e4c000;--ink:#111a2b;--ink2:#3f4a5e;--mute:#667085;--line:#d8dde6;--line2:#eceff4;--tint:#f4f6f9;--navy:#0c3060;--blue:#2457c5;--gap:#b4431b;--amber:#a15c07}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:"Noto Sans CJK KR","Noto Sans KR","Apple SD Gothic Neo","WenQuanYi Zen Hei",sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.62;word-break:keep-all;overflow-wrap:anywhere;background:#fff}
section{padding:0}
h1,h2,h3,p{margin:0}
.ch{padding-top:2mm;margin-top:11mm}.ch.pg{break-before:page;margin-top:0}
.op{break-inside:avoid;break-after:avoid}
h3{font-size:11.5pt;margin:7mm 0 2.5mm;font-weight:700;color:var(--royal);padding-left:3mm;border-left:1.2mm solid var(--royal);line-height:1.3}
h3{break-after:avoid}.keep{break-inside:avoid}
h3 small{font-weight:400;color:var(--mute);font-size:8.8pt;margin-left:6px}
.fine{font-size:8.7pt;color:var(--mute);margin-top:2.5mm}
.none{color:var(--mute);font-size:9.6pt}
.two{display:grid;grid-template-columns:1fr 1fr;gap:9mm}
/* 층 딱지 */
.tg{display:inline-block;font-size:7.6pt;font-weight:700;letter-spacing:.02em;padding:0 5px;border-radius:3px;line-height:15px;vertical-align:1px;white-space:nowrap}
.tg-JUDGED{background:var(--navy);color:#fff}.tg-SELF{border:1px solid var(--navy);color:var(--navy);line-height:13px}
.tg-READ{background:#e4e8ef;color:var(--ink2)}.tg-ADVICE{border:1px solid var(--blue);color:var(--blue);line-height:13px}.tg-SOURCE{border:1px solid var(--amber);color:var(--amber);line-height:13px}
/* 표지 — 흰 바탕 · 동심원 · 학교 색 상자 */
.cover{height:297mm;margin:0;padding:0 20mm 18mm;background:#fff;color:var(--ink);display:flex;flex-direction:column;break-after:page;position:relative;overflow:hidden}
.rings{position:absolute;inset:0;width:210mm;height:297mm;z-index:0}
.cv-box{position:absolute;right:20mm;top:0;z-index:1;width:40mm;height:44mm;background:var(--royal);color:#fff;display:flex;flex-direction:column;justify-content:flex-end;padding:0 4mm 4mm}
.cv-box::before{content:"";position:absolute;right:4mm;top:5mm;width:3.2mm;height:3.2mm;border-radius:50%;background:var(--star)}
.cv-box b{font-size:14pt;font-weight:800;letter-spacing:-.01em}.cv-box span{font-size:6.6pt;letter-spacing:.06em;opacity:.8;margin-top:.8mm}
.cv-mid{position:relative;z-index:1;margin-top:96mm;margin-left:42mm}
.cv-k{font-size:10pt;font-weight:700;color:var(--sky);margin-bottom:4mm}
.cv-y{font-size:50pt;line-height:1;font-weight:800;color:var(--sky)}
.cv-t1{font-size:34pt;line-height:1.15;font-weight:300;color:#33415c;margin-top:2mm}
.cv-t2{font-size:38pt;line-height:1.1;font-weight:800;color:var(--navy)}
.cv-rule{display:block;width:44mm;height:1.4mm;background:linear-gradient(90deg,var(--royal) 0 78%,var(--star) 78%);margin:7mm 0 6mm}
.cv-lead{font-size:13pt;line-height:1.5;font-weight:700;max-width:118mm;color:var(--ink)}
.cv-sub{font-size:10pt;line-height:1.6;color:var(--mute);max-width:112mm;margin-top:2mm}
.cv-bot{position:relative;z-index:1;margin-top:auto;margin-left:42mm;max-width:118mm;border-top:1px solid var(--line);padding-top:3mm}
.cv-bot p{font-size:8.6pt;color:var(--ink2)}.cv-who{font-size:10pt !important;font-weight:700;color:var(--navy) !important;margin-bottom:1mm}.cv-demo{margin-top:2mm;color:var(--mute) !important}
/* 장 머리 — 파란 띠 하나 · 큰 번호 · 제목 · 한 줄 */
.op{display:grid;grid-template-columns:20mm 1fr;gap:5mm;align-items:center;background:linear-gradient(100deg,var(--navy),var(--royal) 70%);color:#fff;border-radius:2.5mm;padding:5mm 7mm;margin-bottom:6mm;position:relative;overflow:hidden}
.op::after{content:"";position:absolute;right:-14mm;top:-18mm;width:52mm;height:52mm;border-radius:50%;border:7mm solid rgba(255,255,255,.08)}
.op-n{font-size:30pt;line-height:1;font-weight:800;color:var(--star)}
.op h2{font-size:17pt;line-height:1.3;letter-spacing:-.01em;color:#fff}
.op-t{font-size:9.8pt;color:#dbe7ff;margin-top:1.5mm;line-height:1.5}
/* 한눈에 보기 */
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;break-inside:avoid}
.tile{border-radius:3mm;background:var(--tint);padding:4mm 4mm 3.5mm}
.tile .ic{display:inline-flex;width:9mm;height:9mm;border-radius:50%;align-items:center;justify-content:center;background:var(--royal)}
.tile .ic svg{width:5mm;height:5mm;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.tile.t1 .ic{background:var(--sky)}.tile.t2 .ic{background:#d7a900}.tile.t3 .ic{background:var(--navy)}
.tile b{display:block;font-size:26pt;line-height:1;font-weight:800;margin-top:3mm;color:var(--ink)}
.tile p{font-size:10pt;font-weight:700;margin-top:1.5mm}.tile small{display:block;font-size:8pt;color:var(--mute);line-height:1.4;margin-top:.8mm}
.vis{margin-top:2mm;break-inside:avoid}
.bars{display:grid;gap:2.4mm}
.br{display:grid;grid-template-columns:30mm 1fr 11mm;gap:3mm;align-items:center;font-size:9.4pt}
.bl{line-height:1.3}.bt{height:4.2mm;border-radius:2.1mm;background:#edf1f7;overflow:hidden}.bt i{display:block;height:100%;border-radius:2.1mm;background:linear-gradient(90deg,var(--royal),var(--blue2))}
.br b{text-align:right;font-size:11pt}.br b small{font-size:8pt;color:var(--mute);font-weight:400}
.donut{display:grid;grid-template-columns:34mm 1fr;gap:5mm;align-items:center}
.donut svg{width:34mm;height:34mm}.donut .dn{font-size:8px;font-weight:800;fill:#111a2b}.donut .dk{font-size:3.6px;fill:#667085}
.donut ul{margin:0;padding:0;list-style:none;font-size:9.4pt}.donut li{display:flex;align-items:center;gap:2mm;padding:1.2mm 0;border-bottom:1px solid var(--line2)}
.donut li i{width:3mm;height:3mm;border-radius:50%;display:inline-block}.donut li b{margin-left:auto}
/* 요약 */
.brief{list-style:none;padding:0;margin:0}
.brief li{display:grid;grid-template-columns:14mm 1fr;gap:3mm;padding:4.2mm 0;border-bottom:1px solid var(--line);break-inside:avoid}
.bn{display:inline-flex;align-items:center;justify-content:center;width:8mm;height:8mm;border-radius:50%;background:var(--royal);color:#fff;font-size:11pt;font-weight:700;line-height:1}
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
@media screen{body{background:#e9ecf1;padding:24px 0}section{background:#fff;max-width:210mm;margin:0 auto 18px;padding:14mm 17mm;box-shadow:0 1px 3px rgba(17,26,43,.12)}.cover{height:297mm;padding:0 20mm 18mm}}
@media screen and (max-width:720px){section{padding:20px 16px !important}.two,.roles,.plan,.conv{grid-template-columns:1fr}.ar{transform:rotate(90deg)}.proj article{grid-template-columns:1fr}.tiles{grid-template-columns:1fr 1fr}.cover{height:auto;min-height:200mm}.cv-mid{margin-top:70mm;margin-left:0}.cv-bot{margin-left:0}.cv-y{font-size:34pt}.cv-t1{font-size:26pt}.cv-t2{font-size:28pt}.tb{display:block;overflow-x:auto}.hm{font-size:8pt}}
`;
