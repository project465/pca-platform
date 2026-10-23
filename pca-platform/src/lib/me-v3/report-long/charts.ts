/**
 * 긴 결과지의 그래프. 전부 SVG 글자로 돌려준다(인쇄에서 흐려지지 않고 글꼴을 따른다).
 *
 * `report-gm/charts.ts` 에서 옮겨 왔다. 그쪽은 미리보기 실험 자리라 형 검사 대상에서
 * 빠져 있고 다른 작업이 계속 고치는 파일이어서, 운영 경로가 거기에 기대지 않게 한 벌을
 * 여기 둔다. 그리는 값은 이미 정해진 값뿐이다(판단 단계 0~3 · 영역 묶음 · 센 개수 · 공시 금액).
 */

export const C = {
  ink: "#16202f", ink2: "#3b4556", ink3: "#6b7486", line: "#dfe3ea", line2: "#eef0f4", paper: "#ffffff",
  navy: "#1b2f57", blue: "#2c63d6", sky: "#8fb3ef", teal: "#14907f", amber: "#c9821a", rose: "#c2516b",
  l0: "#eceef3", l1: "#cddcf6", l2: "#86a9ea", l3: "#2c56b8",
};

export const LEVEL_KO = ["해 본 적 없음", "지시받아 수행", "직접 수행", "기준까지 직접 결정"];
export const LEVEL_COLOR = [C.l0, C.l1, C.l2, C.l3];

const esc = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f1 = (n: number) => Math.round(n * 10) / 10;

/** 글을 한 줄 최대 n 자로 끊는다(한글 기준). 낱말 경계를 먼저 본다 */
/* 라틴 글자와 숫자는 한글 폭의 절반 남짓이다. 글자 수로 재면 ‘CareerMatri’ 같은 낱말이 가운데서 잘린다 */
const vlen = (t: string) => [...t].reduce((a, ch) => a + (/[ -~]/.test(ch) ? 0.55 : 1), 0);

function wrap(text: string, n: number): string[] {
  /* 띄어쓰기에서 먼저 끊고, 한 낱말이 n 자를 넘으면 가운뎃점 뒤에서 끊는다. 그래도 길면 그때만 글자 수로 자른다 */
  const toks: { t: string; sp: boolean }[] = [];
  text.split(/\s+/).filter(Boolean).forEach((w, i) => {
    const parts = vlen(w) > n ? w.split(/(?<=·)/) : [w];
    parts.forEach((pt, k) => toks.push({ t: pt, sp: i > 0 && k === 0 }));
  });
  const out: string[] = [];
  let cur = "";
  for (const { t, sp } of toks) {
    const add = (cur && sp ? " " : "") + t;
    if (cur && vlen(cur + add) > n) { out.push(cur); cur = t; }
    else cur += add;
  }
  if (cur) out.push(cur);
  return out.flatMap((l) => (vlen(l) <= n + 1 ? [l] : l.match(new RegExp(`.{1,${n}}`, "g")) ?? [l]));
}

function multiText(x: number, y: number, text: string, n: number, opts: { size: number; anchor?: string; color?: string; weight?: number; lh?: number }): string {
  const lines = wrap(text, n);
  const lh = (opts.lh ?? 1.25) * opts.size;
  const y0 = y - ((lines.length - 1) * lh) / 2;
  return `<text x="${f1(x)}" y="${f1(y0)}" font-size="${opts.size}" text-anchor="${opts.anchor ?? "middle"}" fill="${opts.color ?? C.ink2}" font-weight="${opts.weight ?? 500}" dominant-baseline="middle">${lines
    .map((l, i) => `<tspan x="${f1(x)}" dy="${i ? f1(lh) : 0}">${esc(l)}</tspan>`).join("")}</text>`;
}

export type RadarSeries = { name: string; levels: (number | null)[]; color: string; dash?: boolean };

/**
 * 판단 여덟 가지의 방사형 그래프. 바깥 고리가 '기준까지 직접 정함'(3), 가운데가 '해 본 적 없음'(0)이다.
 * 묻지 않은 판단(null)은 꼭짓점을 찍지 않고 그 자리를 비운다: 0 으로 그리면 안 물어본 것이 '없다' 로 읽힌다.
 */
export function radar(labels: string[], series: RadarSeries[], o: { size?: number; label?: number; ring?: boolean } = {}): string {
  const S = o.size ?? 420, cx = S / 2, cy = S / 2, R = S * 0.33, n = labels.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * R * (v / 3), cy + Math.sin(a) * R * (v / 3)];
  };
  const rings = [1, 2, 3].map((k) => `<polygon points="${labels.map((_, i) => pt(i, k).map(f1).join(",")).join(" ")}" fill="${k === 3 ? "#f6f8fc" : "none"}" stroke="${C.line}" stroke-width="${k === 3 ? 1.2 : 0.8}"/>`).reverse().join("");
  const spokes = labels.map((_, i) => { const [x, y] = pt(i, 3); return `<line x1="${cx}" y1="${cy}" x2="${f1(x)}" y2="${f1(y)}" stroke="${C.line}" stroke-width="0.8"/>`; }).join("");
  const ringNames = o.ring === false ? "" : [1, 2, 3].map((k) => {
    const a = -Math.PI / 2 - Math.PI / n, rr = R * (k / 3) * Math.cos(Math.PI / n);
    return `<text x="${f1(cx + Math.cos(a) * rr)}" y="${f1(cy + Math.sin(a) * rr - 3)}" font-size="${S * 0.021}" text-anchor="middle" fill="${C.ink3}" font-weight="600">${LEVEL_KO[k]}</text>`;
  }).join("");
  const polys = series.map((s) => {
    const pts = s.levels.map((v, i) => pt(i, v ?? 0));
    return `<polygon points="${pts.map((p) => p.map(f1).join(",")).join(" ")}" fill="${s.color}" fill-opacity="${series.length > 1 ? 0.13 : 0.2}" stroke="${s.color}" stroke-width="${S * 0.0065}" stroke-linejoin="round" ${s.dash ? `stroke-dasharray="6 4"` : ""}/>` +
      pts.map((p, i) => (s.levels[i] == null ? "" : `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${S * 0.009}" fill="#fff" stroke="${s.color}" stroke-width="${S * 0.005}"/>`)).join("");
  }).join("");
  const ls = o.label ?? S * 0.031;
  const lab = labels.map((t, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = cx + Math.cos(a) * R * 1.26, y = cy + Math.sin(a) * R * 1.2;
    const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
    return multiText(x, y, t, 8, { size: ls, anchor, color: C.ink, weight: 600 });
  }).join("");
  const px = S * 0.17, py = S * 0.03;
  return `<svg viewBox="${f1(-px)} ${f1(-py)} ${f1(S + 2 * px)} ${f1(S + 2 * py)}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${rings}${spokes}${polys}${ringNames}${lab}</svg>`;
}

export type Sector = { name: string; fill: string; ring2?: string; mark?: string };

/** 열두 영역 고리. 안쪽 고리 색이 영역 묶음, 바깥 얇은 고리 색이 관심 정도다 */
export function ring(sectors: Sector[], o: { size?: number; center?: [string, string] } = {}): string {
  const S = o.size ?? 440, cx = S / 2, cy = S / 2, r1 = S * 0.2, r2 = S * 0.36, r3 = S * 0.385, n = sectors.length;
  const arc = (a0: number, a1: number, ra: number, rb: number) => {
    const p = (a: number, r: number) => `${f1(cx + Math.cos(a) * r)},${f1(cy + Math.sin(a) * r)}`;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    return `M${p(a0, rb)} A${rb},${rb} 0 ${big} 1 ${p(a1, rb)} L${p(a1, ra)} A${ra},${ra} 0 ${big} 0 ${p(a0, ra)} Z`;
  };
  const gap = 0.012;
  const body = sectors.map((s, i) => {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n + gap, a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n - gap;
    const am = (a0 + a1) / 2;
    const lx = cx + Math.cos(am) * S * 0.46, ly = cy + Math.sin(am) * S * 0.455;
    const anchor = Math.abs(Math.cos(am)) < 0.25 ? "middle" : Math.cos(am) > 0 ? "start" : "end";
    const nx = cx + Math.cos(am) * (r1 + r2) / 2, ny = cy + Math.sin(am) * (r1 + r2) / 2;
    return `<path d="${arc(a0, a1, r1, r2)}" fill="${s.fill}"/>` +
      (s.ring2 ? `<path d="${arc(a0, a1, r2 + S * 0.008, r3)}" fill="${s.ring2}"/>` : "") +
      `<text x="${f1(nx)}" y="${f1(ny)}" font-size="${S * 0.032}" text-anchor="middle" dominant-baseline="middle" fill="${s.mark ?? "#fff"}" font-weight="700">${i + 1}</text>` +
      multiText(lx, ly, s.name, 7, { size: S * 0.026, anchor, color: C.ink, weight: 600 });
  }).join("");
  const center = o.center ? `<text x="${cx}" y="${cy - S * 0.02}" text-anchor="middle" font-size="${S * 0.075}" font-weight="800" fill="${C.navy}">${esc(o.center[0])}</text><text x="${cx}" y="${cy + S * 0.05}" text-anchor="middle" font-size="${S * 0.03}" fill="${C.ink3}">${esc(o.center[1])}</text>` : "";
  return `<svg viewBox="0 0 ${S} ${S}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${body}${center}</svg>`;
}

export type Part = { label: string; value: number; color: string };

/** 도넛. 가운데에 큰 수와 작은 이름을 둔다. 값은 센 개수이고 비율 눈금을 붙이지 않는다 */
export function donut(parts: Part[], o: { size?: number; center?: [string, string] } = {}): string {
  const S = o.size ?? 240, cx = S / 2, cy = S / 2, R = S * 0.4, w = S * 0.14;
  const tot = parts.reduce((a, p) => a + p.value, 0) || 1;
  let a = -Math.PI / 2;
  const segs = parts.filter((p) => p.value > 0).map((p) => {
    const da = (p.value / tot) * 2 * Math.PI, a1 = a + da - (parts.length > 1 ? 0.025 : 0);
    const big = da > Math.PI ? 1 : 0;
    const x0 = cx + Math.cos(a) * R, y0 = cy + Math.sin(a) * R, x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
    const d = da >= 2 * Math.PI - 0.001
      ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${p.color}" stroke-width="${w}"/>`
      : `<path d="M${f1(x0)},${f1(y0)} A${R},${R} 0 ${big} 1 ${f1(x1)},${f1(y1)}" fill="none" stroke="${p.color}" stroke-width="${w}"/>`;
    a += da;
    return d;
  }).join("");
  const center = o.center ? `<text x="${cx}" y="${cy + S * 0.02}" text-anchor="middle" font-size="${S * 0.19}" font-weight="800" fill="${C.navy}">${esc(o.center[0])}</text><text x="${cx}" y="${cy + S * 0.15}" text-anchor="middle" font-size="${S * 0.065}" fill="${C.ink3}">${esc(o.center[1])}</text>` : "";
  return `<svg viewBox="0 0 ${S} ${S}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${C.line2}" stroke-width="${w}"/>${segs}${center}</svg>`;
}

export type Bar = { label: string; value: number; color?: string; note?: string; tag?: string };

/** 가로 막대. max 는 축의 끝값이고, ticks 가 있으면 그 이름을 눈금에 둔다(예: 단계 이름) */
export function hbars(rows: Bar[], o: { max: number; width?: number; label?: number; ticks?: string[]; row?: number; valueText?: (b: Bar) => string } = { max: 3 }): string {
  const W = o.width ?? 640, L = o.label ?? 190, rh = o.row ?? 34, top = o.ticks ? 26 : 6, H = top + rows.length * rh + 6;
  const x = (v: number) => L + ((W - L - 70) * v) / o.max;
  const grid = (o.ticks ?? []).map((t, k) => {
    const gx = x(k + (o.ticks!.length === o.max ? 1 : 0));
    return `<line x1="${f1(gx)}" y1="${top - 4}" x2="${f1(gx)}" y2="${H - 4}" stroke="${C.line}" stroke-dasharray="2 3"/><text x="${f1(gx)}" y="${top - 10}" font-size="10.5" text-anchor="middle" fill="${C.ink3}">${esc(t)}</text>`;
  }).join("");
  /* **막대 끝 글이 그림 밖으로 나가지 않게 한다.** 끝까지 찬 막대 뒤에 긴 글을
     붙이면 쪽 오른쪽 끝을 넘어 잘린다. 들어갈 자리가 없으면 막대 안쪽 끝에 흰
     글로 둔다 */
  const valueLabel = (b: Bar, end: number, y: number): string => {
    const t = o.valueText ? o.valueText(b) : String(b.value);
    const need = [...t].reduce((a, ch) => a + (/[\u3131-\uD7A3]/.test(ch) ? 11.5 : 6.6), 0);
    const room = W - (Math.max(end, L) + 8);
    if (need <= room || end - L < need + 16) {
      return `<text x="${f1(Math.max(end, L) + 8)}" y="${y + rh / 2}" font-size="11.5" dominant-baseline="middle" fill="${C.ink2}" font-weight="600">${esc(t)}</text>`;
    }
    return `<text x="${f1(end - 8)}" y="${y + rh / 2}" font-size="11.5" text-anchor="end" dominant-baseline="middle" fill="#fff" font-weight="700">${esc(t)}</text>`;
  };
  const bars = rows.map((b, i) => {
    const y = top + i * rh;
    const w = Math.max(0, x(b.value) - L);
    return `<text x="${L - 12}" y="${y + rh / 2}" font-size="12.5" text-anchor="end" dominant-baseline="middle" fill="${C.ink}" font-weight="600">${esc(b.label)}</text>` +
      `<rect x="${L}" y="${y + rh * 0.2}" width="${f1(W - L - 70)}" height="${f1(rh * 0.6)}" rx="3" fill="${C.line2}"/>` +
      (w > 0 ? `<rect x="${L}" y="${y + rh * 0.2}" width="${f1(w)}" height="${f1(rh * 0.6)}" rx="3" fill="${b.color ?? C.blue}"/>` : "") +
      valueLabel(b, x(b.value), y);
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${grid}${bars}</svg>`;
}

export type Cell = { fill: string; text?: string; ink?: string };

/** 히트맵. 행·열 이름과 칸마다의 색을 받는다 */
export function heat(rows: string[], cols: string[], cell: (r: number, c: number) => Cell, o: { width?: number; label?: number; head?: number; row?: number; colWrap?: number } = {}): string {
  const W = o.width ?? 680, L = o.label ?? 150, hh = o.head ?? 80, rh = o.row ?? 30;
  const cw = (W - L) / cols.length, H = hh + rows.length * rh + 4;
  const heads = cols.map((c, j) => multiText(L + cw * j + cw / 2, hh / 2 + 4, c, o.colWrap ?? 6, { size: 10.5, color: C.ink, weight: 600, lh: 1.2 })).join("");
  const body = rows.map((r, i) => {
    const y = hh + i * rh;
    return `<text x="${L - 10}" y="${y + rh / 2}" font-size="12" text-anchor="end" dominant-baseline="middle" fill="${C.ink}" font-weight="600">${esc(r)}</text>` +
      cols.map((_, j) => {
        const k = cell(i, j);
        return `<rect x="${f1(L + cw * j + 1.5)}" y="${y + 1.5}" width="${f1(cw - 3)}" height="${rh - 3}" rx="3" fill="${k.fill}"/>` +
          (k.text ? `<text x="${f1(L + cw * j + cw / 2)}" y="${y + rh / 2}" font-size="10.5" text-anchor="middle" dominant-baseline="middle" fill="${k.ink ?? "#fff"}" font-weight="700">${esc(k.text)}</text>` : "");
      }).join("");
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${heads}${body}</svg>`;
}

export type Dot = { label: string; x: number; y: number; color: string; n?: number };

/**
 * 관심(가로 0~2) × 해 본 정도(세로 0~3) 사분면. 같은 칸에 여럿이 겹치면 칸 안에서 나란히 놓는다.
 * 축은 이름이 붙은 단계이고 연속값이 아니다.
 */
export function quadrant(dots: Dot[], o: { width?: number; xNames: string[]; yNames: string[]; zones?: [string, string, string, string] }): string {
  const W = o.width ?? 640, H = W * 0.74, L = 104, B = 54, T = 16, R = 14;
  const nx = o.xNames.length, ny = o.yNames.length;
  const cw = (W - L - R) / nx, ch = (H - T - B) / ny;
  const grid = Array.from({ length: nx * ny }, (_, k) => {
    const i = k % nx, j = Math.floor(k / nx);
    const hot = i >= nx - 1 && j >= ny - 2, warm = i >= nx - 1 && j < ny - 2;
    return `<rect x="${f1(L + i * cw + 1)}" y="${f1(T + (ny - 1 - j) * ch + 1)}" width="${f1(cw - 2)}" height="${f1(ch - 2)}" rx="4" fill="${hot ? "#eaf1fd" : warm ? "#fdf5e8" : "#f6f7f9"}"/>`;
  }).join("");
  const xl = o.xNames.map((t, i) => `<text x="${f1(L + i * cw + cw / 2)}" y="${f1(H - B + 20)}" font-size="12" text-anchor="middle" fill="${C.ink}" font-weight="600">${esc(t)}</text>`).join("") +
    `<text x="${f1(L + (W - L - R) / 2)}" y="${f1(H - 8)}" font-size="11.5" text-anchor="middle" fill="${C.ink3}">관심 정도 →</text>`;
  const yl = o.yNames.map((t, j) => multiText(L - 10, T + (ny - 1 - j) * ch + ch / 2, t, 7, { size: 11.5, anchor: "end", color: C.ink, weight: 600 })).join("");
  const cells = new Map<string, Dot[]>();
  for (const d of dots) { const k = `${d.x}:${d.y}`; cells.set(k, [...(cells.get(k) ?? []), d]); }
  const pts = [...cells.values()].flatMap((g) => {
    const twoCol = g.length > 4, per = twoCol ? Math.ceil(g.length / 2) : g.length;
    const rowH = Math.min(24, (ch - 12) / per);
    return g.map((d, k) => {
      const col = twoCol ? Math.floor(k / per) : 0, row = twoCol ? k % per : k;
      const x0 = L + d.x * cw + 12 + col * (cw / 2 - 4);
      const y0 = T + (ny - 1 - d.y) * ch + (ch - per * rowH) / 2 + rowH * row + rowH / 2;
      const max = twoCol ? 6 : 11;
      return `<circle cx="${f1(x0 + 9)}" cy="${f1(y0)}" r="9" fill="${d.color}"/><text x="${f1(x0 + 9)}" y="${f1(y0 + 0.5)}" font-size="9.5" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-weight="800">${d.n ?? ""}</text>` +
        `<text x="${f1(x0 + 23)}" y="${f1(y0 + 0.5)}" font-size="10.5" dominant-baseline="middle" fill="${C.ink}" font-weight="600">${esc(d.label.length > max ? d.label.slice(0, max) + "…" : d.label)}</text>`;
    });
  }).join("");
  return `<svg viewBox="0 0 ${W} ${f1(H)}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${grid}${xl}${yl}${pts}</svg>`;
}

export type GanttRow = { label: string; from: number; to: number; color: string; note?: string };

/** 90일 실행 간트. from·to 는 날(1~90)이다 */
export function gantt(rows: GanttRow[], o: { width?: number; days?: number; label?: number } = {}): string {
  const W = o.width ?? 680, D = o.days ?? 90, L = o.label ?? 230, top = 34;
  /* 이름표는 잘라 붙이지 않고 두 줄까지 접는다. 접히는 줄이 있으면 줄 높이를 키운다 */
  const n = Math.max(4, Math.floor((L - 14) / 11.5));
  const lab = rows.map((r) => { const ls = wrap(r.label, n); return ls.length > 2 ? [ls[0], ls[1].slice(0, Math.max(1, n - 1)) + "…"] : ls; });
  const rh = lab.some((l) => l.length > 1) ? 40 : 32, H = top + rows.length * rh + 10;
  const x = (d: number) => L + ((W - L - 10) * d) / D;
  const marks = [0, 30, 60, 90].filter((d) => d <= D);
  const heads = marks.map((d) => `<line x1="${f1(x(d))}" y1="${top - 6}" x2="${f1(x(d))}" y2="${H - 4}" stroke="${C.line}"/>`).join("") +
    [["1~30일", 0, 30], ["31~60일", 30, 60], ["61~90일", 60, 90]].filter((m) => (m[2] as number) <= D)
      .map(([t, a, b]) => `<text x="${f1((x(a as number) + x(b as number)) / 2)}" y="${top - 14}" font-size="11.5" text-anchor="middle" fill="${C.ink}" font-weight="700">${t}</text>`).join("");
  const body = rows.map((r, i) => {
    const y = top + i * rh;
    const ls = lab[i], y0 = y + rh / 2 - ((ls.length - 1) * 13.5) / 2;
    return `<text x="${L - 10}" y="${f1(y0)}" font-size="11.5" text-anchor="end" dominant-baseline="middle" fill="${C.ink}" font-weight="600">${ls.map((l, k) => `<tspan x="${L - 10}" dy="${k ? 13.5 : 0}">${esc(l)}</tspan>`).join("")}</text>` +
      `<rect x="${f1(x(r.from - 1))}" y="${y + 6}" width="${f1(Math.max(6, x(r.to) - x(r.from - 1)))}" height="${rh - 12}" rx="5" fill="${r.color}"/>` +
      (r.note ? `<text x="${f1(x(r.from - 1) + 8)}" y="${y + rh / 2 + 0.5}" font-size="10" dominant-baseline="middle" fill="#fff" font-weight="700">${esc(r.note)}</text>` : "");
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${heads}${body}</svg>`;
}

/** 걸음 사슬. 칸마다 작은 머리와 본문을 두고 화살표로 잇는다 */
export function chain(steps: { head: string; body: string; color?: string }[], o: { width?: number; height?: number } = {}): string {
  const W = o.width ?? 680, H = o.height ?? 150, n = steps.length, gap = 22, bw = (W - gap * (n - 1)) / n;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${steps.map((s, i) => {
    const x = i * (bw + gap);
    return `<rect x="${f1(x)}" y="2" width="${f1(bw)}" height="${H - 4}" rx="8" fill="#fff" stroke="${s.color ?? C.line}" stroke-width="1.4"/>` +
      `<rect x="${f1(x)}" y="2" width="${f1(bw)}" height="30" rx="8" fill="${s.color ?? C.navy}"/><rect x="${f1(x)}" y="22" width="${f1(bw)}" height="10" fill="${s.color ?? C.navy}"/>` +
      `<text x="${f1(x + bw / 2)}" y="18" font-size="11.5" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-weight="700">${esc(s.head)}</text>` +
      multiText(x + bw / 2, (H + 30) / 2, s.body, Math.max(6, Math.floor(bw / 12.5)), { size: 11, color: C.ink, weight: 500, lh: 1.35 }) +
      (i < n - 1 ? `<path d="M${f1(x + bw + 4)},${H / 2} l${gap - 10},0 m-6,-5 l6,5 l-6,5" fill="none" stroke="${C.ink3}" stroke-width="1.6"/>` : "");
  }).join("")}</svg>`;
}

/** 경험 기록 시간축. 달 단위로 칸을 나눈다 */
export function timeline(items: { label: string; from: string; to: string; color: string }[], o: { width?: number } = {}): string {
  const W = o.width ?? 680;
  const months = (s: string) => { const [y, m] = s.split("-").map(Number); return y * 12 + (m - 1); };
  const lo = Math.min(...items.map((i) => months(i.from))) - 1, hi = Math.max(...items.map((i) => months(i.to))) + 1;
  const L = 12, R = 12, top = 34, rh = 46, H = top + items.length * rh + 8;
  const x = (m: number) => L + ((W - L - R) * (m - lo)) / (hi - lo + 1);
  const ticks = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).map((m) => {
    const y = Math.floor(m / 12), mm = (m % 12) + 1;
    return `<line x1="${f1(x(m))}" y1="${top - 8}" x2="${f1(x(m))}" y2="${H - 4}" stroke="${C.line2}"/><text x="${f1(x(m) + (x(m + 1) - x(m)) / 2)}" y="${top - 14}" font-size="9.5" text-anchor="middle" fill="${C.ink3}">${mm === 1 || m === lo ? `${y}.` : ""}${mm}월</text>`;
  }).join("");
  const body = items.map((it, i) => {
    const y = top + i * rh, a = x(months(it.from)), b = x(months(it.to) + 1);
    return `<rect x="${f1(a)}" y="${y + 6}" width="${f1(b - a)}" height="16" rx="5" fill="${it.color}"/>` +
      (() => { const t = it.label.length > 44 ? it.label.slice(0, 44) + "…" : it.label; const tw = [...t].reduce((n, ch) => n + (/[ -~]/.test(ch) ? 6.2 : 11), 0);
        /* 오른쪽 끝을 넘으면 막대 끝에 붙여 오른쪽 맞춤으로 쓴다 */
        return a + tw > W - R ? `<text x="${f1(Math.min(b, W - R))}" y="${y + 36}" font-size="11" fill="${C.ink}" font-weight="600" text-anchor="end">${esc(t)}</text>` : `<text x="${f1(a)}" y="${y + 36}" font-size="11" fill="${C.ink}" font-weight="600">${esc(t)}</text>`; })();
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${ticks}${body}</svg>`;
}

/** 공시 금액 막대(억 원). 음수는 왼쪽으로 그린다 */
export function moneyBars(rows: { label: string; values: { name: string; v: number | null; color: string }[] }[], o: { width?: number } = {}): string {
  const W = o.width ?? 680, L = 170, top = 30, gh = 22, gap = 16;
  const all = rows.flatMap((r) => r.values.map((v) => v.v ?? 0));
  const max = Math.max(1, ...all.map((v) => Math.abs(v)));
  const hasNeg = all.some((v) => v < 0);
  const zero = hasNeg ? L + (W - L - 90) * 0.3 : L;
  const span = (W - L - 90) * (hasNeg ? 0.7 : 1);
  const H = top + rows.length * (rows[0]?.values.length ?? 1) * gh + rows.length * gap + 10;
  let y = top;
  const names = rows[0]?.values ?? [];
  const legend = names.map((v, i) => `<rect x="${L + i * 120}" y="4" width="12" height="12" rx="2" fill="${v.color}"/><text x="${L + i * 120 + 18}" y="14" font-size="11" fill="${C.ink2}">${esc(v.name)}</text>`).join("");
  const body = rows.map((r) => {
    const y0 = y;
    const bars = r.values.map((v, k) => {
      const yy = y0 + k * gh, val = v.v ?? 0, w = (Math.abs(val) / max) * span;
      const bx = val < 0 ? zero - w : zero;
      const txt = v.v == null ? "공시 없음" : `${(val / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}억 원`;
      return `<rect x="${f1(bx)}" y="${yy + 3}" width="${f1(Math.max(1, w))}" height="${gh - 6}" rx="3" fill="${v.color}"/>` +
        `<text x="${f1(val < 0 ? bx - 6 : bx + w + 6)}" y="${yy + gh / 2 + 0.5}" font-size="10.5" text-anchor="${val < 0 ? "end" : "start"}" dominant-baseline="middle" fill="${C.ink2}">${txt}</text>`;
    }).join("");
    y += r.values.length * gh + gap;
    return `<text x="${L - 12}" y="${y0 + (r.values.length * gh) / 2}" font-size="12" text-anchor="end" dominant-baseline="middle" fill="${C.ink}" font-weight="700">${esc(r.label)}</text>${bars}`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${legend}<line x1="${f1(zero)}" y1="${top - 4}" x2="${f1(zero)}" y2="${H - 6}" stroke="${C.ink3}"/>${body}</svg>`;
}

/** 단계 칸 넷(0~3). 칸 수가 곧 단계라 숫자를 쓰지 않는다 */
export function pips(level: number | null, size = 11): string {
  const cells = [1, 2, 3].map((k) => `<span class="pip" style="width:${size}px;height:${size}px;background:${level != null && level >= k ? LEVEL_COLOR[Math.max(1, level)] : C.l0}"></span>`).join("");
  return `<span class="pips">${cells}</span>`;
}
