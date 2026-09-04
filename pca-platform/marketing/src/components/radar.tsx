/**
 * 축이 몇 개든 그리는 레이더.
 *
 * 한 사람의 점수 한 벌이라 계열이 하나다. 색을 나누지 않고 한 가지로 칠하며,
 * 축 이름을 직접 붙인다. 점수는 옆이나 아래에 숫자로도 적혀 있어
 * 도형만으로 읽지 않아도 된다.
 */
export default function Radar({
  axes,
  scores,
  width = 460,
  height = 460,
  radius = 148,
  labelGap = 26,
  className,
  ariaLabel,
}: {
  axes: string[];
  scores: number[];
  width?: number;
  height?: number;
  radius?: number;
  labelGap?: number;
  className?: string;
  ariaLabel: string;
}) {
  const n = axes.length;
  const cx = width / 2;
  const cy = height / 2;
  const rings = [0.2, 0.4, 0.6, 0.8, 1];

  const at = (i: number, r: number): [number, number] => {
    const a = ((Math.PI * 2) / n) * i - Math.PI / 2;
    return [
      Math.round((cx + Math.cos(a) * r) * 10) / 10,
      Math.round((cy + Math.sin(a) * r) * 10) / 10,
    ];
  };
  const poly = (r: number) =>
    Array.from({ length: n }, (_, i) => at(i, r).join(",")).join(" ");
  const area = axes
    .map((_, i) => at(i, (Math.max(0, Math.min(100, scores[i] ?? 0)) / 100) * radius).join(","))
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label={ariaLabel}>
      {rings.map((f) => (
        <polygon key={f} className="ring" points={poly(radius * f)} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = at(i, radius);
        return <line key={i} className="spoke" x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      {[0.2, 0.4, 0.6, 0.8, 1].map((f) => (
        <text key={`t${f}`} className="num" x={cx + 6} y={cy - radius * f + 4}>
          {Math.round(f * 100)}
        </text>
      ))}
      <polygon className="area" points={area} />
      {axes.map((_, i) => {
        const [x, y] = at(i, (Math.max(0, Math.min(100, scores[i] ?? 0)) / 100) * radius);
        return <circle key={i} className="pt" cx={x} cy={y} r={4} />;
      })}
      {axes.map((label, i) => {
        const [x, y] = at(i, radius + labelGap);
        const anchor = x > cx + 6 ? "start" : x < cx - 6 ? "end" : "middle";
        return (
          <text key={label} className="axis" x={x} y={y + 4} textAnchor={anchor}>
            {label}
          </text>
        );
      })}
    </svg>
  );
}
