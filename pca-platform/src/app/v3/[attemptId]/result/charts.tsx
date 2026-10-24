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
  barRows, canRadar, matrixRows, radarPoints, roadmap,
  type BarRow, type MatrixRow, type RadarPoint, type Roadmap,
} from "@/lib/me-v3/result/chart-data";
import { tierText } from "@/app/v3/tier-text.i18n";
import { phrase } from "@/lib/me-v3/phrase";
import { renderLang } from "@/lib/me-v3/result/render-lang";

/* 그 응시의 언어(요청마다). 결과지 쪽과 같은 자리를 읽는다 */
const tr = (ko: string, vars?: Record<string, string | number>) => phrase(renderLang())(ko, vars);


/** Radar 눈금 넷의 이름. **수를 적지 않는다**: 적는 순간 점수로 읽힌다 */
/* 함수로 둔다: 모듈을 읽는 순간이 아니라 그리는 순간의 언어로 고른다 */
const LEVEL_KO = () => [
  tr("해본 적 없음"),
  tr("경험이 있다고 답함"),
  tr("응답에서 확인됨"),
  tr("조건·기준까지 직접 정함"),
];
/* 보기 넷의 꼬리표. 검사 화면과 같은 벌을 그 응시 언어로 읽는다 */
const ownershipLabel = () => tierText(renderLang()).OWNERSHIP_LABEL;

/** 상태 넷을 화면에 적는 말. 검사 화면이 쓰는 말과 같은 자다 */
const STATE_KO = (): Record<AxisState, string> => ({
  NOT_OBSERVED: ownershipLabel()[0],
  PARTICIPATED: ownershipLabel()[1],
  CONFIRMED: ownershipLabel()[2],
  OWNED: ownershipLabel()[3],
});

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
  /* 한국어는 위 상수 그대로이고, 다른 언어는 같은 문장을 사전에서 읽는다 */
  return <p className="pv-note">{children ?? (renderLang() === "ko" ? CHART_NOTE : tr(CHART_NOTE))}</p>;
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
 * **이번 응시에서 실제로 판단한 영역만 축으로 선다**(§8).
 *
 * 열두 영역을 전부 꼭짓점으로 두면 **묻지 않은 영역이 중심에 찍히고 그
 * 점은 0점으로 읽힌다.** routing 이 축을 묻는 영역은 두셋에서 네댓이고
 * 나머지는 이번에 보지 않은 영역이다. 전체 영역은 아래 Evidence Matrix
 * 와 영역 목록이 글자로 들고, 거기에 `이번에 묻지 않음` 이 적힌다.
 *
 * **반지름의 뜻은 하나다**(§9): 중심에서 바깥으로 가는 거리는 그 영역의
 * 응답이 어느 단계까지 확인됐는가다. 관심도도 학습 의향도 적합도도 들어
 * 가지 않고, 서로 다른 개념을 합친 composite score 가 아니다.
 *
 * **꼭짓점에 이름을 두지 않고 번호를 둔다.** 영역 이름이
 * `수요·예약·가격 관리` 처럼 긴 자리가 있어서 꼭짓점마다 이름을 적으면
 * 위아래에서 글자가 겹친다. 번호를 두고 아래 표가 번호와 이름과 단계를
 * 글자로 적으면 **그 표가 곧 그래프의 글 대체물**이다(§27).
 */
export function Radar(
  { model, name }: { model: ResultModel; name: (c: string) => string },
): React.JSX.Element | null {
  const pts: RadarPoint[] = radarPoints(model);
  const n = pts.length;
  /* 꼭짓점이 셋 미만이면 다각형이 서지 않는다. 억지로 그리지 않는다 */
  if (!canRadar(model)) return null;
  const poly = pts.map((p, i) => at(i, n, (R * p.level) / 3).join(",")).join(" ");

  return (
    <div className="pv-radar">
      <svg viewBox="0 0 320 300" className="pv-radar-svg" role="img"
        aria-label={tr("이번 응시에서 판단을 물은 영역 {n}개의 확인 단계.", { n })}>
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
          return <circle key={p.code} cx={x} cy={y} r="3.4" fill="#0a1b31" />;
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
            <em>{LEVEL_KO()[p.level]}</em>
          </li>
        ))}
      </ol>
      <p className="pv-sub">
        {tr("이번 응시에서 판단을 물은 영역만 축으로 나옵니다. 눈금 셋은 바깥으로 갈수록 확인된 단계가 높다는 뜻이고, 묻지 않은 영역은 아래 표가 글자로 적습니다.")}
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
            <span>{tr("물은 축 {n}개", { n: r.asked })}</span>
          </div>
          {/* **막대는 HTML 로 그린다.** SVG 로 그리면 폭에 맞춰 통째로
              커져서 넓은 화면에서 막대 하나가 66px 로 섰다. 높이를 고정
              하려고 `preserveAspectRatio` 를 끄면 안의 숫자가 늘어난다.
              여기는 좌표 계산이 없고 네 토막의 너비뿐이라 HTML 이 맞다 */}
          <div className="pv-bar-track"
            role="img"
            aria-label={r.counts.map((c, i) => tr("{label} {n}개", { label: ownershipLabel()[i], n: c }))
              .join(", ")}>
            {r.counts.map((c, i) => (c ? (
              <span key={i} className={`pv-seg is-${i}`}
                style={{ flexGrow: c }}>{c}</span>
            ) : null))}
          </div>
        </div>
      ))}
      <ul className="pv-key">
        {ownershipLabel().map((l, i) => (
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
  /* `아직` 은 한 단 옅게 둔다. 칸 스무 개가 같은 무게로 서면 수가 있는
     칸이 그 사이에 묻힌다. 글자는 그대로 남아 흑백 종이에서도 읽힌다 */
  const cell = (v: number) => (v ? String(v) : <span className="pv-nil">{tr("아직")}</span>);
  return (
    <div className="pv-matrix">
      <table>
        <thead>
          <tr>
            <th scope="col">{tr("영역")}</th>
            <th scope="col">{tr("확인된 판단")}</th>
            <th scope="col">{tr("직접 정한 판단")}</th>
            <th scope="col">{tr("남겼다고 고른 것")}</th>
            <th scope="col">{tr("비교했다고 고른 것")}</th>
            <th scope="col">{tr("단계")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className={r.asked ? undefined : "is-unasked"}>
              <th scope="row">{name(r.code)}</th>
              {/* **묻지 않은 줄에 0 을 적지 않는다.** 0 은 `없다` 로 읽히고,
                  안 물어본 것을 없다고 적으면 응시자가 자기가 빠뜨린 줄
                  안다. 칸을 합쳐 한 번만 적는다 */}
              {r.asked ? (<>
                <td>{cell(r.did)}</td>
                <td>{cell(r.decided)}</td>
                <td>{cell(r.artifacts)}</td>
                <td>{cell(r.verifications)}</td>
                <td>{r.verify ? STATE_KO()[r.verify] : tr("묻지 않음")}</td>
              </>) : (
                <td colSpan={5}>{tr("이번에 묻지 않음")}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pv-sub">
        {tr("열두 영역이 모두 한 줄씩 나옵니다. 앞의 두 칸은 응답에서 확인된 판단축의 개수이고, 뒤의 두 칸은 응답에서 고른 항목의 개수입니다. 모두 스스로 답한 것이고, 밖에서 확인한 기록은 아닙니다. 개수를 더하거나 점수로 바꾸지 않습니다. 이번 응시에서 판단을 묻지 않은 영역은 그 사실을 그대로 적습니다.")}
      </p>
    </div>
  );
}

/* **네 칸짜리 흐름 표(`ActionRoadmap`)를 걷었다**(R18 §5).
   `지금 · 다음 경험 · 남길 근거 · 지원서·면접` 은 전부 할 일 목록과 같은
   값을 묶어 다시 그린 것이고, Action 절에서 가장 큰 덩이가 그 표였다.
   목록이 이미 언제 할 일인지로 나뉘어 있어 담긴 것이 줄지 않는다 */
