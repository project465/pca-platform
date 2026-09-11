/**
 * 결과지 그래프. 전부 서버에서 SVG 로 그린다.
 *
 * 차트 라이브러리를 쓰지 않는 이유는 두 가지다. 결과지는 인쇄되고,
 * 인쇄물에서 자바스크립트는 돌지 않는다. 그리고 축 라벨이 잘리면 결과지가
 * 통째로 신뢰를 잃는다 — viewBox 를 직접 잡아야 그걸 막을 수 있다.
 */
type Item = { name: string; scaled: number };

/** 축 라벨이 바깥으로 나가므로 viewBox 를 음수에서 시작해 여백을 연다. */
export function Radar({ items, size = 260 }: { items: Item[]; size?: number }) {
  const n = items.length;
  if (n < 3) return null;
  const r = size / 2;
  // 라벨 여백을 상수로 두면 축 이름이 길어질 때마다 조용히 잘린다. 가장 긴
  // 이름에서 계산한다 — 한글 한 글자 ≈ 12, 뒤에 붙는 점수 ≈ 34.
  const m = Math.max(60, Math.max(...items.map((i) => i.name.length)) * 12 + 34);
  const pt = (i: number, frac: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [r + Math.cos(a) * r * frac, r + Math.sin(a) * r * frac];
  };
  const poly = items.map((it, i) => pt(i, Math.max(0.04, it.scaled / 100)).join(",")).join(" ");

  return (
    <svg
      className="chart radar"
      viewBox={`${-m} ${-m} ${size + m * 2} ${size + m * 2}`}
      role="img"
      aria-label={items.map((i) => `${i.name} ${i.scaled}점`).join(", ")}
    >
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={items.map((_, i) => pt(i, f).join(",")).join(" ")}
          fill="none"
          stroke="var(--rule)"
          strokeWidth={f === 1 ? 1.2 : 0.8}
        />
      ))}
      {items.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={r} y1={r} x2={x} y2={y} stroke="var(--rule)" strokeWidth={0.8} />;
      })}
      <polygon points={poly} fill="rgba(22,35,46,0.14)" stroke="var(--ink)" strokeWidth={1.8} />
      {items.map((it, i) => {
        const [x, y] = pt(i, it.scaled / 100);
        return <circle key={it.name} cx={x} cy={y} r={3} fill="var(--ink)" />;
      })}
      {items.map((it, i) => {
        const [x, y] = pt(i, 1.14);
        const anchor = Math.abs(x - r) < 12 ? "middle" : x > r ? "start" : "end";
        return (
          <text
            key={it.name}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="radar-label"
          >
            {it.name}
            <tspan className="radar-num" dx="5">
              {Math.round(it.scaled)}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

/** 순위 막대. 1위만 진하게 — 결과지에서 눈이 먼저 가야 하는 곳은 하나다. */
export function RankBars({ items, max = 100 }: { items: Item[]; max?: number }) {
  return (
    <ul className="rankbars">
      {items.map((it, i) => (
        <li key={it.name} className={i === 0 ? "top" : ""}>
          <span className="rb-rank">{i + 1}</span>
          <span className="rb-name">{it.name}</span>
          <span className="rb-track">
            <span className="rb-fill" style={{ width: `${(it.scaled / max) * 100}%` }} />
          </span>
          <span className="rb-num">{it.scaled.toFixed(1)}</span>
        </li>
      ))}
    </ul>
  );
}

/** 적합도와 신뢰구간. 점 하나가 아니라 구간으로 보여야 정직하다. */
export function BandBars({
  items,
}: {
  items: { name: string; fit: number; band: [number, number]; sub?: string | null }[];
}) {
  return (
    <ul className="bandbars">
      {items.map((it, i) => (
        <li key={it.name} className={i === 0 ? "top" : ""}>
          <span className="bb-rank">{i + 1}</span>
          <span className="bb-name">
            {it.name}
            {it.sub && <em>{it.sub}</em>}
          </span>
          <span className="bb-track">
            <span
              className="bb-band"
              style={{ left: `${it.band[0]}%`, width: `${Math.max(1, it.band[1] - it.band[0])}%` }}
            />
            <span className="bb-dot" style={{ left: `${it.fit}%` }} />
          </span>
          <span className="bb-num">
            {it.fit.toFixed(1)}
            <em>
              ±{((it.band[1] - it.band[0]) / 2).toFixed(1)}
            </em>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 요구 수준과 보유 수준의 아령 그래프. 보유가 없으면 비워 둔다. */
export function GapChart({
  rows,
}: {
  rows: { name: string; required: number; held: number | null; criticality: number }[];
}) {
  const pos = (lv: number) => (lv / 5) * 100;
  return (
    <ul className="gapchart">
      {rows.map((r) => (
        <li key={r.name}>
          <span className="gc-name">
            {r.name}
            {r.criticality === 3 && <em className="gc-must">필수</em>}
          </span>
          <span className="gc-track">
            {[1, 2, 3, 4, 5].map((t) => (
              <span key={t} className="gc-tick" style={{ left: `${pos(t)}%` }} />
            ))}
            {r.held !== null && (
              <span
                className="gc-bar"
                style={{
                  left: `${pos(Math.min(r.held, r.required))}%`,
                  width: `${Math.max(0, pos(r.required) - pos(r.held))}%`,
                }}
              />
            )}
            {r.held !== null && <span className="gc-held" style={{ left: `${pos(r.held)}%` }} />}
            <span className="gc-req" style={{ left: `${pos(r.required)}%` }} />
          </span>
          <span className="gc-num">
            {r.held === null ? "—" : r.held} / {r.required}
          </span>
        </li>
      ))}
    </ul>
  );
}
