/**
 * **PDF GOLD MASTER 3차 · 경영학과 편집 비주얼.** 손으로 그린 SVG 다. 사진을 쓰지
 * 않는다: 사용권이 확인된 사진이 없고, 사람이 찍힌 사진은 그 자리에서 근거로 읽힌다.
 *
 * 그림은 **정보 흐름을 돕는 자리**에만 둔다(표지 · 장 머리 · 기업 · 계획). 장 머리
 * 그림은 그 장이 다루는 경영 일의 장면(전략 회의 · 자료 분석 · 기획 문서 · 사업 흐름
 * · 지역 산업 지도)을 그린다. 값을 그리지 않는 그림에는 숫자·축·눈금을 두지 않는다.
 *
 * 색은 넷: 남색 #16284a · 파랑 #1c5fb0 · 옅은 파랑 #dbe7f6 · 강조 #c98a2b(한 자리).
 */
const N = "#16284a", B = "#1c5fb0", S = "#dbe7f6", P = "#eef3fa", A = "#c98a2b", G = "#9aa6b8", W = "#ffffff";
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 표지: 위에서 본 전략 회의 테이블 — 자료·차트·노트북이 놓여 있다 */
export function coverArt(): string {
  const chairs = [[120, 52], [220, 44], [320, 52], [120, 238], [220, 246], [320, 238], [42, 145], [398, 145]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="17" fill="${S}"/><circle cx="${x}" cy="${y}" r="8" fill="${B}" opacity=".55"/>`).join("");
  return `<svg viewBox="0 0 440 290" class="art" role="img" aria-label="전략 회의 테이블 그림">
  <rect x="0" y="0" width="440" height="290" fill="${P}" rx="6"/>
  <g stroke="${S}" stroke-width="1">${Array.from({ length: 10 }, (_, i) => `<line x1="${i * 44 + 22}" y1="0" x2="${i * 44 + 22}" y2="290"/>`).join("")}</g>
  ${chairs}
  <rect x="70" y="80" width="300" height="130" rx="65" fill="${W}" stroke="${S}" stroke-width="2"/>
  <g transform="translate(108,104) rotate(-6)"><rect width="78" height="56" rx="3" fill="${W}" stroke="${G}"/>
    <rect x="9" y="32" width="9" height="16" fill="${B}"/><rect x="22" y="24" width="9" height="24" fill="${B}"/><rect x="35" y="16" width="9" height="32" fill="${N}"/><rect x="48" y="27" width="9" height="21" fill="${B}" opacity=".6"/>
    <line x1="9" y1="10" x2="62" y2="10" stroke="${G}" stroke-width="2"/></g>
  <g transform="translate(196,96)"><rect width="66" height="46" rx="3" fill="${N}"/><rect x="4" y="4" width="58" height="34" fill="#21386a"/>
    <polyline points="10,30 22,22 32,26 44,14 56,10" fill="none" stroke="${S}" stroke-width="2"/><rect x="-6" y="46" width="78" height="5" rx="2" fill="${G}"/></g>
  <g transform="translate(274,108) rotate(5)"><rect width="66" height="74" rx="3" fill="${W}" stroke="${G}"/>
    ${[12, 20, 28, 36, 44].map((y, i) => `<line x1="8" y1="${y}" x2="${i % 2 ? 46 : 58}" y2="${y}" stroke="${G}" stroke-width="2"/>`).join("")}
    <circle cx="20" cy="60" r="8" fill="${S}"/><path d="M20 60 L20 52 A8 8 0 0 1 27 64 Z" fill="${A}"/></g>
  <g transform="translate(150,166)"><rect width="96" height="28" rx="3" fill="${W}" stroke="${G}"/>
    <line x1="8" y1="10" x2="70" y2="10" stroke="${B}" stroke-width="3"/><line x1="8" y1="19" x2="54" y2="19" stroke="${G}" stroke-width="2"/></g>
  <circle cx="262" cy="178" r="9" fill="${W}" stroke="${G}"/><circle cx="262" cy="178" r="4" fill="${S}"/>
  </svg>`;
}

type Band = "summary" | "profile" | "domain" | "record" | "job" | "region" | "company" | "apply" | "plan" | "sheet" | "source" | "growth" | "verify";
/** 장 머리 그림: 그 장에서 다루는 경영 일의 장면 */
export function bandArt(kind: Band): string {
  const box = (inner: string, label: string) => `<svg viewBox="0 0 200 110" class="band-art" role="img" aria-label="${esc(label)}"><rect width="200" height="110" rx="6" fill="${P}"/>${inner}</svg>`;
  switch (kind) {
    case "summary": return box(`<rect x="30" y="18" width="74" height="78" rx="3" fill="${W}" stroke="${G}"/>${[30, 40, 50].map((y) => `<line x1="40" y1="${y}" x2="94" y2="${y}" stroke="${G}" stroke-width="2"/>`).join("")}<rect x="40" y="62" width="30" height="22" fill="${S}"/><circle cx="140" cy="56" r="30" fill="${W}" stroke="${B}" stroke-width="2"/><path d="M140 56 L152 36 L146 58 Z" fill="${A}"/><path d="M140 56 L128 76 L134 54 Z" fill="${N}"/>`, "요약 문서와 방향 표시");
    case "profile": return box(`<polygon points="78,20 112,36 118,72 86,94 50,80 44,42" fill="${S}" stroke="${B}" stroke-width="1.5"/><polygon points="78,36 98,46 100,68 84,78 64,70 60,48" fill="${B}" opacity=".45"/><circle cx="148" cy="52" r="20" fill="none" stroke="${N}" stroke-width="4"/><line x1="162" y1="66" x2="180" y2="86" stroke="${N}" stroke-width="6" stroke-linecap="round"/>`, "판단 분포와 돋보기");
    case "domain": return box(`${[0, 1, 2, 3].map((i) => `<rect x="${18 + i * 44}" y="44" width="34" height="24" rx="4" fill="${i < 2 ? B : S}"/>${i < 3 ? `<path d="M${54 + i * 44} 56 l6 0" stroke="${N}" stroke-width="2"/><path d="M${58 + i * 44} 52 l4 4 -4 4" fill="none" stroke="${N}" stroke-width="2"/>` : ""}`).join("")}<rect x="62" y="80" width="76" height="16" rx="3" fill="${W}" stroke="${G}"/><line x1="70" y1="88" x2="120" y2="88" stroke="${G}" stroke-width="2"/>`, "일의 흐름");
    case "record": return box(`${[0, 1, 2].map((i) => `<rect x="${44 + i * 10}" y="${20 + i * 8}" width="80" height="62" rx="3" fill="${W}" stroke="${G}"/>`).join("")}${[44, 56, 68].map((y, i) => `<path d="M72 ${y + 4} l4 4 8 -8" fill="none" stroke="${i < 2 ? B : G}" stroke-width="2.5"/><line x1="90" y1="${y + 4}" x2="140" y2="${y + 4}" stroke="${G}" stroke-width="2"/>`).join("")}<rect x="150" y="62" width="30" height="34" rx="3" fill="${S}"/><path d="M158 86 l6 -14 6 14" fill="none" stroke="${N}" stroke-width="2"/>`, "경험 기록 문서");
    case "job": return box(`${["기획", "마케팅", "영업", "운영", "재무"].map((t, i) => `<path d="M${10 + i * 37} 40 h30 l8 15 -8 15 h-30 l8 -15 z" fill="${i === 0 ? N : i === 2 ? B : S}"/><text x="${28 + i * 37}" y="59" font-size="8.5" fill="${i === 0 || i === 2 ? W : N}" text-anchor="middle" font-family="Pretendard">${t}</text>`).join("")}<line x1="20" y1="88" x2="180" y2="88" stroke="${G}" stroke-width="1.5" stroke-dasharray="3 3"/>`, "경영 직무의 가치 사슬");
    case "region": return box(`<path d="M30 24 L84 16 L116 34 L108 64 L70 72 L36 58 Z" fill="${S}"/><path d="M116 34 L170 28 L178 70 L140 92 L108 64 Z" fill="#e6edf7"/><path d="M36 58 L70 72 L60 96 L24 88 Z" fill="#e6edf7"/><circle cx="84" cy="48" r="7" fill="${N}"/><circle cx="66" cy="34" r="4.5" fill="${B}"/><circle cx="138" cy="56" r="4.5" fill="${B}"/><circle cx="50" cy="80" r="4.5" fill="${B}"/><text x="94" y="52" font-size="8.5" fill="${N}" font-family="Pretendard">대전</text><text x="58" y="27" font-size="7.5" fill="${N}" font-family="Pretendard">세종</text><text x="146" y="54" font-size="7.5" fill="${N}" font-family="Pretendard">충북</text><text x="30" y="98" font-size="7.5" fill="${N}" font-family="Pretendard">충남</text>`, "대전·세종·충청권 산업 지도(개략)");
    case "company": return box(`<rect x="34" y="34" width="44" height="62" fill="${N}"/>${[42, 54, 66, 78].map((y) => `<rect x="40" y="${y}" width="8" height="6" fill="${S}"/><rect x="54" y="${y}" width="8" height="6" fill="${S}"/><rect x="66" y="${y}" width="6" height="6" fill="${S}"/>`).join("")}<rect x="84" y="54" width="28" height="42" fill="${B}"/><rect x="124" y="30" width="56" height="44" rx="3" fill="${W}" stroke="${G}"/><polyline points="130,64 142,56 152,60 164,44 174,40" fill="none" stroke="${A}" stroke-width="2.5"/><line x1="20" y1="96" x2="186" y2="96" stroke="${G}"/>`, "기업과 사업 지표");
    case "apply": return box(`<rect x="36" y="16" width="70" height="84" rx="3" fill="${W}" stroke="${G}"/><circle cx="56" cy="34" r="9" fill="${S}"/>${[54, 64, 74, 84].map((y, i) => `<line x1="46" y1="${y}" x2="${i % 2 ? 84 : 96}" y2="${y}" stroke="${G}" stroke-width="2"/>`).join("")}<path d="M120 28 h56 a6 6 0 0 1 6 6 v24 a6 6 0 0 1 -6 6 h-38 l-10 10 v-10 h-8 a6 6 0 0 1 -6 -6 v-24 a6 6 0 0 1 6 -6 z" fill="${B}"/><text x="149" y="51" font-size="13" fill="${W}" text-anchor="middle" font-family="Pretendard" font-weight="700">?</text><path d="M130 76 h44 a5 5 0 0 1 5 5 v12 a5 5 0 0 1 -5 5 h-30 l-8 7 v-7 h-6 a5 5 0 0 1 -5 -5 v-12 a5 5 0 0 1 5 -5 z" fill="${S}"/>`, "자기소개서와 면접");
    case "plan": return box(`<line x1="18" y1="58" x2="184" y2="58" stroke="${N}" stroke-width="2"/>${[30, 66, 102, 138, 172].map((x, i) => `<circle cx="${x}" cy="58" r="${i === 0 ? 7 : 5.5}" fill="${i === 0 ? A : i < 3 ? B : S}" stroke="${N}" stroke-width="${i < 3 ? 0 : 1}"/><rect x="${x - 14}" y="${i % 2 ? 68 : 26}" width="28" height="18" rx="3" fill="${W}" stroke="${G}"/>`).join("")}`, "실행 일정");
    case "growth": return box(`<rect x="24" y="78" width="26" height="18" fill="${S}"/><rect x="58" y="62" width="26" height="34" fill="${S}"/><rect x="92" y="46" width="26" height="50" fill="${B}" opacity=".6"/><rect x="126" y="28" width="26" height="68" fill="${B}"/><path d="M30 70 L72 54 L104 38 L150 18" fill="none" stroke="${A}" stroke-width="2.5"/><path d="M144 16 l8 2 -3 7" fill="none" stroke="${A}" stroke-width="2.5"/>`, "성장 단계");
    case "verify": return box(`<rect x="28" y="22" width="60" height="70" rx="3" fill="${W}" stroke="${G}"/><rect x="108" y="22" width="60" height="70" rx="3" fill="${W}" stroke="${G}"/>${[38, 52, 66].map((y) => `<line x1="38" y1="${y}" x2="78" y2="${y}" stroke="${G}" stroke-width="2"/><line x1="118" y1="${y}" x2="158" y2="${y}" stroke="${G}" stroke-width="2"/>`).join("")}<path d="M90 56 h16" stroke="${B}" stroke-width="2"/><path d="M100 50 l6 6 -6 6" fill="none" stroke="${B}" stroke-width="2"/><circle cx="160" cy="84" r="12" fill="${A}"/><path d="M154 84 l4 4 8 -8" fill="none" stroke="${W}" stroke-width="2.5"/>`, "응답과 기록 대조");
    case "sheet": return box(`<rect x="50" y="14" width="80" height="86" rx="3" fill="${W}" stroke="${G}"/>${[30, 44, 58, 72].map((y) => `<rect x="60" y="${y}" width="10" height="8" fill="none" stroke="${B}"/><line x1="76" y1="${y + 4}" x2="120" y2="${y + 4}" stroke="${G}" stroke-width="2"/>`).join("")}<path d="M142 86 l30 -44 8 6 -30 44 -10 4 z" fill="${A}"/>`, "정리 양식");
    default: return box(`${[24, 40, 56, 72, 88].map((y) => `<line x1="40" y1="${y}" x2="160" y2="${y}" stroke="${G}" stroke-width="2"/>`).join("")}<rect x="24" y="18" width="10" height="76" fill="${B}"/>`, "출처 목록");
  }
}

/** 영역의 일의 흐름 여덟 단계와, 학생이 응답으로 어디까지 해 봤는지 */
export function flowDiagram(flow: { step: number; name: string; cover: string }[]): string {
  const W0 = 680, H0 = 118, n = flow.length || 8, w = (W0 - 20) / n;
  const fill: Record<string, string> = { strong: B, partial: "#8fb2dd", none: W, unasked: P };
  const stroke: Record<string, string> = { strong: B, partial: "#8fb2dd", none: G, unasked: "#c9d2df" };
  const txt: Record<string, string> = { strong: W, partial: N, none: N, unasked: G };
  return `<svg viewBox="0 0 ${W0} ${H0}" class="flow" role="img" aria-label="일의 흐름과 응답 범위">
  ${flow.map((f, i) => {
    const x = 10 + i * w;
    const lines = f.name.length > 6 ? [f.name.slice(0, Math.ceil(f.name.length / 2)), f.name.slice(Math.ceil(f.name.length / 2))] : [f.name];
    return `<path d="M${x} 20 h${w - 10} l9 22 -9 22 h-${w - 10} l9 -22 z" fill="${fill[f.cover]}" stroke="${stroke[f.cover]}" stroke-width="1.2" ${f.cover === "unasked" ? 'stroke-dasharray="3 2"' : ""}/>
    <text x="${x + w / 2}" y="${lines.length > 1 ? 39 : 46}" font-size="10" fill="${txt[f.cover]}" text-anchor="middle" font-family="Pretendard" font-weight="600">${lines.map((l, k) => `<tspan x="${x + w / 2}" dy="${k ? 12 : 0}">${esc(l)}</tspan>`).join("")}</text>
    <text x="${x + w / 2}" y="82" font-size="9" fill="${G}" text-anchor="middle" font-family="Pretendard">${f.step}</text>`;
  }).join("")}
  <g font-family="Pretendard" font-size="9.5" fill="${N}" transform="translate(10,100)">
    <rect width="12" height="10" fill="${B}"/><text x="17" y="9">스스로 해 봄</text>
    <rect x="100" width="12" height="10" fill="#8fb2dd"/><text x="117" y="9">지시받아 해 봄</text>
    <rect x="212" width="12" height="10" fill="${W}" stroke="${G}"/><text x="229" y="9">해 본 적 없음</text>
    <rect x="320" width="12" height="10" fill="${P}" stroke="#c9d2df" stroke-dasharray="3 2"/><text x="337" y="9">이번에 묻지 않음</text>
  </g></svg>`;
}

/** 열두 영역의 관심과 경험: 가로는 관심, 세로는 해 본 단계 */
export function interestPlot(cells: { name: string; interest: string | null; depth: number | null }[]): string {
  const W0 = 680, H0 = 300, L = 120, T = 18, R = 20, Bm = 46;
  const cols = ["LOW", "MID", "HIGH"], rows = [3, 2, 1, 0, -1];
  const cw = (W0 - L - R) / 3, rh = (H0 - T - Bm) / 5;
  const rowName = ["기준까지 직접 결정", "직접 수행", "지시받아 수행", "해 본 적 없음", "이번에 묻지 않음"];
  const colName = ["관심 낮음", "관심 보통", "관심 높음"];
  const shade = (r: number, c: number) => (r <= 1 && c === 2 ? "#dce8f8" : r <= 1 ? "#eef3fa" : r >= 2 && r <= 3 && c === 2 ? "#fbf1e2" : W);
  const grid = rows.map((_, r) => cols.map((__, c) => `<rect x="${L + c * cw}" y="${T + r * rh}" width="${cw}" height="${rh}" fill="${shade(r, c)}" stroke="#d6dde8"/>`).join("")).join("");
  const labels = rowName.map((t, r) => `<text x="${L - 8}" y="${T + r * rh + rh / 2 + 4}" text-anchor="end" font-size="10" fill="${N}" font-family="Pretendard">${t}</text>`).join("")
    + colName.map((t, c) => `<text x="${L + c * cw + cw / 2}" y="${H0 - Bm + 18}" text-anchor="middle" font-size="10.5" fill="${N}" font-family="Pretendard" font-weight="600">${t}</text>`).join("");
  const groups = new Map<string, string[]>();
  for (const x of cells) {
    const c = cols.indexOf(x.interest ?? "MID"); const r = rows.indexOf(x.depth === null ? -1 : x.depth);
    const k = `${r}:${c < 0 ? 1 : c}`; groups.set(k, [...(groups.get(k) ?? []), x.name]);
  }
  const chips = [...groups].map(([k, names]) => {
    const [r, c] = k.split(":").map(Number);
    return names.map((nm, i) => {
      const per = 2, col = i % per, row = Math.floor(i / per);
      const x = L + c * cw + 8 + col * (cw / 2 - 4), y = T + r * rh + 8 + row * 15;
      return `<rect x="${x}" y="${y}" width="${cw / 2 - 10}" height="13" rx="6.5" fill="${r <= 1 ? B : r === 4 ? "#e8ecf2" : W}" stroke="${r <= 1 ? B : "#b8c3d4"}"/><text x="${x + (cw / 2 - 10) / 2}" y="${y + 9.6}" font-size="8.6" text-anchor="middle" fill="${r <= 1 ? W : N}" font-family="Pretendard">${esc(nm.length > 11 ? nm.slice(0, 10) + "…" : nm)}</text>`;
    }).join("");
  }).join("");
  return `<svg viewBox="0 0 ${W0} ${H0}" class="plot" role="img" aria-label="열두 영역의 관심과 해 본 단계">${grid}${labels}${chips}
  <text x="${L}" y="${H0 - 6}" font-size="9" fill="${G}" font-family="Pretendard">파란 칸: 지원서에서 꺼내 쓸 경험 · 노란 칸: 관심은 높고 먼저 해 볼 영역 · 회색 줄: 판단 문항을 묻지 않아 단계를 알 수 없음</text></svg>`;
}

/** 실행 계획 타임라인: 다섯 시점에 할 일 수 */
export function timelineSvg(rows: { period: string; what: string }[]): string {
  const periods = ["30일", "60일", "90일", "6개월", "12개월"];
  const W0 = 680, H0 = 96, x0 = 40, x1 = 640;
  const xs = periods.map((_, i) => x0 + (i * (x1 - x0)) / (periods.length - 1));
  return `<svg viewBox="0 0 ${W0} ${H0}" class="tl" role="img" aria-label="실행 일정">
  <line x1="${x0}" y1="40" x2="${x1}" y2="40" stroke="${N}" stroke-width="2"/>
  ${periods.map((p, i) => {
    const n = rows.filter((r) => r.period === p).length;
    return `<circle cx="${xs[i]}" cy="40" r="${i === 0 ? 10 : 8}" fill="${i === 0 ? A : i < 3 ? B : W}" stroke="${N}" stroke-width="${i < 3 ? 0 : 1.5}"/>
    <text x="${xs[i]}" y="20" text-anchor="middle" font-size="12" font-weight="700" fill="${N}" font-family="Pretendard">${p}</text>
    <text x="${xs[i]}" y="66" text-anchor="middle" font-size="10" fill="${N}" font-family="Pretendard">할 일 ${n}가지</text>`;
  }).join("")}
  <text x="${x0}" y="88" font-size="9" fill="${G}" font-family="Pretendard">기간은 보고서를 받은 날부터 셉니다</text></svg>`;
}

/** 지역별 진로 탐색 기업 수: 지도 대신 묶음 막대 — 위치를 정확히 그리지 않는다 */
export function regionBars(groups: { region: string; label: string; n: number; deep: number }[]): string {
  // 반 단짜리 자리에 서므로 좁은 판으로 그린다: 넓게 그리면 줄어들면서 글자가 읽히지 않는다
  const W0 = 330, H0 = 12 + groups.length * 34, max = Math.max(1, ...groups.map((g) => g.n));
  return `<svg viewBox="0 0 ${W0} ${H0}" class="rb" role="img" aria-label="지역별 진로 탐색 기업 수">
  ${groups.map((g, i) => {
    const y = 8 + i * 34, w = (g.n / max) * 170, wd = (g.deep / max) * 170;
    return `<text x="40" y="${y + 15}" text-anchor="end" font-size="12" fill="${N}" font-family="Pretendard" font-weight="600">${esc(g.label)}</text>
    <rect x="48" y="${y}" width="${Math.max(w, 2)}" height="22" rx="3" fill="${S}"/><rect x="48" y="${y}" width="${wd}" height="22" rx="3" fill="${B}"/>
    <text x="${56 + Math.max(w, 2)}" y="${y + 15}" font-size="11.5" fill="${N}" font-family="Pretendard">${g.n}곳${g.deep ? ` · 심층 ${g.deep}` : ""}</text>`;
  }).join("")}
  </svg>`;
}
