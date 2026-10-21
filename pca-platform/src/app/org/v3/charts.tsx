import "./charts.css";

/*
 * 담당자 화면의 그림 넷.
 *
 * **새 지표를 만들지 않는다.** 여기 그려지는 값은 전부 `campusV3` 와
 * `studentCounts` 가 이미 세어 둔 수이고, 그림은 그 수의 모양만 바꾼다.
 * **5명 규칙은 그림에서도 그대로다**: 값이 `null` 인 칸은 빗금으로 그리고
 * 숫자를 적지 않는다. 빈 막대로 두면 0 으로 읽힌다.
 */

const PALETTE = ["#2f6bff", "#14907f", "#f08c2e", "#8a5cf6", "#e0527a", "#1aa3c9", "#c9a227", "#5b7083"];

/** 대상자 → 시작 → 완료. 막대 길이는 대상자에 대한 몫이다 */
export function Progress({ target, started, scored }: { target: number; started: number; scored: number }) {
  const base = Math.max(1, target);
  const rows = [
    { label: "대상자", n: target, cls: "is-t" },
    { label: "검사 시작", n: started, cls: "is-s" },
    { label: "결과 받음", n: scored, cls: "is-d" },
  ];
  return (
    <div className="cvx-prog">
      {rows.map((r) => (
        <div className="cvx-prog-r" key={r.label}>
          <span className="cvx-prog-l">{r.label}</span>
          <span className="cvx-prog-t"><i className={r.cls} style={{ width: `${Math.round((r.n / base) * 100)}%` }} /></span>
          <span className="cvx-prog-v"><b>{r.n.toLocaleString()}</b>명{target > 0 && r.cls !== "is-t" ? <em>{Math.round((r.n / base) * 100)}%</em> : null}</span>
        </div>
      ))}
    </div>
  );
}

/** 명단 학생의 응시 상태 도넛. 가운데 수는 결과를 받은 학생이다 */
export function StatusDonut({ parts }: { parts: { label: string; n: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0);
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  const done = parts.find((p) => p.label === "결과 받음")?.n ?? 0;
  return (
    <div className="cvx-donut">
      <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="응시 상태 분포">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#eef1f6" strokeWidth="18" />
        {total > 0 ? parts.filter((p) => p.n > 0).map((p) => {
          const len = (p.n / total) * C;
          const el = (
            <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="18"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />
          );
          off += len;
          return el;
        }) : null}
        <text x="70" y="68" textAnchor="middle" className="cvx-donut-n">{done.toLocaleString()}</text>
        <text x="70" y="88" textAnchor="middle" className="cvx-donut-c">결과 받음</text>
      </svg>
      <ul className="cvx-legend">
        {parts.map((p) => (
          <li key={p.label}><i style={{ background: p.color }} />{p.label}<b>{p.n.toLocaleString()}명</b>
            <em>{total ? `${Math.round((p.n / total) * 100)}%` : ""}</em></li>
        ))}
      </ul>
    </div>
  );
}

export type CollegeBar = { name: string; target: number | null; started: number | null; scored: number | null; rate: number | null };

/** 단과대학마다 한 줄: 완료 · 진행 · 아직 시작 전 을 대상자 안에서 쌓는다 */
export function CollegeStack({ rows, minCell }: { rows: CollegeBar[]; minCell: number }) {
  return (
    <div className="cvx-stack">
      <div className="cvx-stack-key"><span><i className="is-d" />결과 받음</span><span><i className="is-s" />푸는 중</span><span><i className="is-n" />시작 전</span></div>
      {rows.map((r) => {
        const hidden = r.target === null || r.started === null || r.scored === null;
        const t = Math.max(1, r.target ?? 1);
        const d = hidden ? 0 : (r.scored as number), s = hidden ? 0 : Math.max(0, (r.started as number) - d);
        return (
          <div className="cvx-stack-r" key={r.name}>
            <span className="cvx-stack-l">{r.name}</span>
            <span className={hidden ? "cvx-stack-t is-hidden" : "cvx-stack-t"}>
              {hidden ? null : <>
                <i className="is-d" style={{ width: `${(d / t) * 100}%` }} />
                <i className="is-s" style={{ width: `${(s / t) * 100}%` }} />
              </>}
            </span>
            <span className="cvx-stack-v">{hidden ? `${minCell}명 미만` : `${r.rate ?? 0}%`}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 색이 다른 막대 묶음. 관심 분포(산업 · 직무 · 영역)를 나란히 놓는 자리 */
export function ColorBars({ title, note, rows, minCell }: {
  title: string; note: string; rows: { label: string; n: number | null }[]; minCell: number;
}) {
  /* 많은 쪽부터. 숫자를 내지 않는 칸은 뒤로 */
  rows = [...rows].sort((p, q) => (q.n ?? -1) - (p.n ?? -1));
  const top = Math.max(1, ...rows.map((r) => r.n ?? 0));
  return (
    <div className="cvx-card">
      <h3>{title}</h3>
      <p className="cvx-note">{note}</p>
      {rows.length ? (
        <div className="cvx-cbars">
          {rows.slice(0, 6).map((r, i) => (
            <div className="cvx-cbar" key={`${r.label}-${i}`}>
              <span className="cvx-cbar-l">{r.label}</span>
              <span className={r.n === null ? "cvx-cbar-t is-hidden" : "cvx-cbar-t"}>
                {r.n === null ? null : <i style={{ width: `${Math.round((r.n / top) * 100)}%`, background: PALETTE[i % PALETTE.length] }} />}
              </span>
              <span className="cvx-cbar-v">{r.n === null ? `${minCell}명 미만` : r.n.toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : <p className="cvx-note">아직 없습니다</p>}
    </div>
  );
}
