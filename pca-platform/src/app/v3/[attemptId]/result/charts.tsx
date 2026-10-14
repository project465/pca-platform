/**
 * 결과지의 시각화 넷. **읽기 쉽게 다시 그리는 층이고 재는 층이 아니다.**
 *
 * 값은 전부 `result/chart-data.ts` 가 결과 모델에서 그대로 꺼내 온다.
 * 여기서 더하거나 평균 내거나 백분율로 바꾸지 않는다(§0).
 *
 * **큰 chart library 를 들이지 않았다.** 그릴 것이 열두 꼭짓점과 네 토막
 * 막대라 좌표 계산이 스무 줄이고, library 를 쓰면 번들이 수백 KB 늘고
 * 종이로 뽑을 때 글꼴과 색이 우리 토큰을 벗어난다.
 *
 * **색만으로 상태를 가르지 않는다**(§9·§27). 네 단계는 밝기가 차례로
 * 어두워지고, 둘째 칸에는 빗금이 더 들어가고, 글자로도 같은 자리에 적힌다.
 */
import type { ReactNode } from "react";
import type { AxisState } from "@/lib/me-v3/scoring/types";
import type { ResultModel } from "@/lib/me-v3/result/model";
import {
  barRows, matrixRows, radarPoints, roadmap,
  type BarRow, type MatrixRow, type RadarPoint, type Roadmap,
} from "@/lib/me-v3/result/chart-data";
import { OWNERSHIP_LABEL } from "@/app/v3/tier-text";

/** Radar 눈금 넷의 이름. **수를 적지 않는다**: 적는 순간 점수로 읽힌다 */
const LEVEL_KO = [
  "해본 적 없음",
  "경험이 있다고 답함",
  "응답에서 확인됨",
  "조건·기준까지 직접 정함",
];

/** 상태 넷을 화면에 적는 말. 검사 화면이 쓰는 말과 같은 자다 */
const STATE_KO: Record<AxisState, string> = {
  NOT_OBSERVED: OWNERSHIP_LABEL[0],
  PARTICIPATED: OWNERSHIP_LABEL[1],
  CONFIRMED: OWNERSHIP_LABEL[2],
  OWNED: OWNERSHIP_LABEL[3],
};

/**
 * 오해 방지 문구(§6). **글자 그대로 선다.**
 *
 * 한 자리에 적어 두고 웹과 종이가 같은 함수를 부른다. 두 곳에 따로 적으면
 * 어느 날 갈리고, 갈린 날 둘 중 하나가 거짓이 된다.
 */
export const CHART_NOTE =
  "이 그래프는 응답에서 확인된 경험과 근거의 분포를 시각화한 것입니다. "
  + "적성·역량 순위나 직무 적합도를 의미하지 않습니다.";

export function ChartNote({ children }: { children?: ReactNode }): React.JSX.Element {
  return <p className="pv-note">{children ?? CHART_NOTE}</p>;
}

/* ── A. Radar 「경험·근거 분포」 ─────────────────────────────── */

const R = 108;
const CX = 160;
const CY = 158;

function at(i: number, n: number, r: number): [number, number] {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function ring(n: number, r: number): string {
  return Array.from({ length: n }, (_, i) => at(i, n, r).join(",")).join(" ");
}

/**
 * **꼭짓점에 이름을 두지 않고 번호를 둔다.**
 *
 * 영역이 열둘이고 이름이 `수요·예약·가격 관리` 처럼 긴 자리가 있어서,
 * 꼭짓점마다 이름을 적으면 위아래에서 글자가 겹친다(§8). 손전화에서는
 * 데스크톱을 줄인 것이 되어 더 못 읽는다. 번호를 두고 아래 표가 번호와
 * 이름과 단계를 글자로 적으면 **그 표가 곧 그래프의 글 대체물**이다(§27).
 */
export function Radar(
  { model, name }: { model: ResultModel; name: (c: string) => string },
): React.JSX.Element {
  const pts: RadarPoint[] = radarPoints(model);
  const n = pts.length;
  const poly = pts.map((p, i) => at(i, n, (R * p.level) / 3).join(",")).join(" ");
  const askedN = pts.filter((p) => p.asked).length;

  return (
    <div className="pv-radar">
      <svg viewBox="0 0 320 300" className="pv-radar-svg" role="img"
        aria-label={`영역 ${n}개의 경험·근거 분포. 축을 물은 영역 ${askedN}개.`}>
        {[1, 2, 3].map((k) => (
          <polygon key={k} points={ring(n, (R * k) / 3)}
            fill="none" stroke="#d8e0ec" strokeWidth="1" />
        ))}
        {pts.map((p, i) => {
          const [x, y] = at(i, n, R);
          return <line key={p.code} x1={CX} y1={CY} x2={x} y2={y}
            stroke="#e6ecf5" strokeWidth="1" />;
        })}
        <polygon points={poly} fill="rgba(45,108,223,0.16)"
          stroke="#2d6cdf" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p, i) => {
          const [x, y] = at(i, n, (R * p.level) / 3);
          return p.asked
            ? <circle key={p.code} cx={x} cy={y} r="3.4" fill="#0a1b31" />
            : <circle key={p.code} cx={x} cy={y} r="3.4" fill="#ffffff"
              stroke="#8c9bb2" strokeWidth="1.2" strokeDasharray="2 2" />;
        })}
        {pts.map((p, i) => {
          const [x, y] = at(i, n, R + 20);
          return (
            <g key={p.code}>
              <circle cx={x} cy={y} r="9.5" fill="#ffffff" stroke="#c9d4e3" />
              <text x={x} y={y + 3.6} textAnchor="middle" fontSize="10"
                fill="#0a1b31">{i + 1}</text>
            </g>
          );
        })}
      </svg>

      <ol className="pv-legend">
        {pts.map((p, i) => (
          <li key={p.code}>
            <b>{i + 1}</b>
            <span>{name(p.code)}</span>
            <em>{p.asked ? LEVEL_KO[p.level] : "이번에 묻지 않음"}</em>
          </li>
        ))}
      </ol>
      <p className="pv-sub">
        눈금 셋은 바깥으로 갈수록 확인된 것이 많다는 뜻입니다.
        빈 점은 이번 응시에서 그 영역의 판단을 묻지 않았다는 표시입니다.
      </p>
    </div>
  );
}

/* ── B. Domain별 경험 단계 ──────────────────────────────────── */

export function StageBars(
  { model, name }: { model: ResultModel; name: (c: string) => string },
): React.JSX.Element | null {
  const rows: BarRow[] = barRows(model);
  if (!rows.length) return null;
  return (
    <div className="pv-bars">
      {rows.map((r) => (
        <div className="pv-bar" key={r.code}>
          <div className="pv-bar-h">
            <b>{name(r.code)}</b>
            <span>물은 축 {r.asked}개</span>
          </div>
          {/* **막대는 HTML 로 그린다.** SVG 로 그리면 폭에 맞춰 통째로
              커져서 넓은 화면에서 막대 하나가 66px 로 섰다. 높이를 고정
              하려고 `preserveAspectRatio` 를 끄면 안의 숫자가 늘어난다.
              여기는 좌표 계산이 없고 네 토막의 너비뿐이라 HTML 이 맞다 */}
          <div className="pv-bar-track"
            role="img"
            aria-label={r.counts.map((c, i) => `${OWNERSHIP_LABEL[i]} ${c}개`)
              .join(", ")}>
            {r.counts.map((c, i) => (c ? (
              <span key={i} className={`pv-seg is-${i}`}
                style={{ flexGrow: c }}>{c}</span>
            ) : null))}
          </div>
        </div>
      ))}
      <ul className="pv-key">
        {OWNERSHIP_LABEL.map((l, i) => (
          <li key={l}><i className={`pv-seg is-${i}`} />{l}</li>
        ))}
      </ul>
    </div>
  );
}

/* ── C. Evidence Matrix ─────────────────────────────────────── */

/**
 * **표로 그린다.** 행이 둘에서 넷이고 칸이 다섯이라 그림으로 그리면 수를
 * 읽으려고 눈이 범례를 왕복하게 된다. 표는 종이에서도 흑백에서도 그대로
 * 읽히고 화면 낭독기도 칸 이름을 읽는다.
 */
export function EvidenceMatrix(
  { model, name }: { model: ResultModel; name: (c: string) => string },
): React.JSX.Element | null {
  const rows: MatrixRow[] = matrixRows(model);
  if (!rows.length) return null;
  const cell = (v: number) => (v ? String(v) : "아직");
  return (
    <div className="pv-matrix">
      <table>
        <thead>
          <tr>
            <th scope="col">영역</th>
            <th scope="col">직접 수행</th>
            <th scope="col">기준 설정</th>
            <th scope="col">산출물</th>
            <th scope="col">비교</th>
            <th scope="col">검증</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <th scope="row">{name(r.code)}</th>
              <td>{cell(r.did)}</td>
              <td>{cell(r.decided)}</td>
              <td>{cell(r.artifacts)}</td>
              <td>{cell(r.verifications)}</td>
              <td>{r.verify ? STATE_KO[r.verify] : "묻지 않음"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pv-sub">
        직접 수행과 기준 설정은 확인된 판단축의 개수이고, 산출물과 비교는
        응답에서 고르신 항목의 개수입니다. 개수를 더하거나 점수로 바꾸지
        않습니다.
      </p>
    </div>
  );
}

/* ── D. Action Roadmap ──────────────────────────────────────── */

/**
 * **같은 문장을 두 번 적지 않는다**(§A-6).
 *
 * 카드에 할 일의 문장을 그대로 적었더니 바로 아래 표가 같은 문장을 다시
 * 적었다. 이 네 칸이 하는 일은 **차례를 보이는 것**이라 어느 영역의
 * 일인지까지면 되고, 무엇을 하라는 말은 아래 표가 한 자리에서 든다.
 */
export function ActionRoadmap(
  { model, name }: {
    model: ResultModel;
    name: (c: string) => string;
  },
): React.JSX.Element {
  const where = (a: ResultModel["actions"][number]) =>
    (a.domain ? name(a.domain) : "영역을 가리지 않는 할 일");
  const r: Roadmap = roadmap(model, where);
  const steps: [string, string[], string][] = [
    ["지금", [...new Set(r.now)], "이번 주에 손댈 수 있는 자리입니다"],
    ["다음 경험", [...new Set(r.next)], "그다음에 겪어 둘 자리입니다"],
    /* **손님 화면에 안쪽 이름을 적지 않는다.** 규격이 이 칸을
       `남길 Evidence` 로 적었지만, 이 제품은 학생 화면에서 그 말을 늘
       `근거` 로 적어 왔고 `v3:copy` 가 그것을 센다. 한 칸의 사정으로
       공통 검사를 느슨하게 하면 다음 화면이 그 느슨해진 줄을 물려받는다 */
    ["남길 근거", r.leave, "그 경험에서 남겨 둘 것입니다"],
    ["지원서·면접", r.use.map(name), "꺼내 쓸 수 있는 자리입니다"],
  ];
  return (
    <ol className="pv-road">
      {steps.map(([t, xs, sub], i) => (
        <li key={t}>
          <span className="pv-road-n">{i + 1}</span>
          <h4>{t}</h4>
          {xs.length ? (
            <ul>{xs.slice(0, 3).map((x) => <li key={x}>{x}</li>)}</ul>
          ) : (
            <p className="pv-road-none">
              {i === 3
                ? "지금 바로 꺼내 쓸 자리는 아직 확인되지 않았습니다"
                : "이 자리에 적을 것이 아직 없습니다"}
            </p>
          )}
          <p className="pv-road-s">{sub}</p>
        </li>
      ))}
    </ol>
  );
}
