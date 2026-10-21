import type { CampusMock, ReportMock, WorkspaceMock } from "@/content/model";
import { BrandMark, Icon, type IconName } from "./icons";

/**
 * 화면 예시.
 *
 * 앱의 실제 화면 짜임(작업공간 홈 · 결과지 첫 화면 · 담당자 집계)을 HTML 로
 * 줄여 그린 것이다. 캡처를 쓰지 않은 까닭은 둘이다: 캡처는 앱이 바뀐 날
 * 옛 모습으로 남고, 실제 학교 이름과 학생 자료가 섞일 수 있다.
 *
 * **예시라는 표시를 지우지 않는다.** 모든 예시가 `label` 을 머리에 달고
 * 있고, 담긴 값은 지어낸 것이다. 화면을 읽어 주는 기기에는 예시 전체를
 * 그림 하나로 알린다(`role="img"` + `aria-label`).
 */

const TILE_ICON: IconName[] = ["cube", "layers", "wave"];

export function WorkspaceMockView({ m }: { m: WorkspaceMock }) {
  return (
    <div className="mock mock-ws" role="img" aria-label={`${m.label}: ${m.title}`}>
      <div className="mock-chrome" aria-hidden="true">
        <span />
        <span />
        <span />
        <em>{m.label}</em>
      </div>
      <div className="mock-ws-body" aria-hidden="true">
        <aside className="mock-rail">
          <div className="mock-rail-brand">
            <BrandMark size={22} />
            <div>
              <b>CareerMatri</b>
              <small>{m.brandSub}</small>
            </div>
          </div>
          <ul>
            {m.nav.map((n, i) => (
              <li key={n} className={i === 0 ? "is-on" : undefined}>
                <Icon name={(["home", "doc", "sparkle", "chart", "layers", "list"] as IconName[])[i] ?? "doc"} size={14} />
                {n}
              </li>
            ))}
          </ul>
        </aside>
        <div className="mock-ws-main">
          <div className="mock-ws-head">
            <b>{m.title}</b>
            <small>{m.meta}</small>
          </div>
          <div className="mock-todo">
            <span className="mock-todo-label">
              <Icon name="target" size={14} />
              {m.todoLabel}
            </span>
            <strong>{m.todoTitle}</strong>
            <p>{m.todoBody}</p>
            <div className="mock-todo-acts">
              <span className="mock-btn">
                {m.todoCta}
                <Icon name="arrow" size={12} />
              </span>
              <span className="mock-more">{m.todoMore}</span>
            </div>
            <div className="mock-todo-art">
              <Icon name="clipboard" size={46} stroke={1.4} />
              <span className="mock-todo-check">
                <Icon name="check" size={16} stroke={2.6} />
              </span>
            </div>
          </div>
          <div className="mock-sec">
            <span>
              <Icon name="chart" size={14} />
              {m.stateLabel}
            </span>
            <small>{m.stateSub}</small>
          </div>
          <div className="mock-tiles">
            {m.tiles.map((t, i) => (
              <div className="mock-tile" key={t.name}>
                <i>
                  <Icon name={TILE_ICON[i % TILE_ICON.length]} size={16} />
                </i>
                <div>
                  <b>{t.name}</b>
                  <small>{t.sub}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="mock-sec">
            <span>
              <Icon name="spark" size={14} />
              {m.changeLabel}
            </span>
          </div>
          <ul className="mock-changes">
            {m.changes.map((c) => (
              <li key={c.text}>
                <span>{c.text}</span>
                <time>{c.date}</time>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ReportMockView({ m }: { m: ReportMock }) {
  return (
    <div className="mock mock-report" role="img" aria-label={`${m.label}: ${m.headline}`}>
      <div className="mock-paper" aria-hidden="true">
        <div className="mock-paper-top">
          <span>{m.label}</span>
          <b>CareerMatri</b>
        </div>
        <div className="mock-paper-id">
          <b>{m.school}</b>
          <span>{m.docTitle}</span>
          <small>{m.docMeta}</small>
        </div>
        <div className="mock-paper-head">
          <strong>{m.headline}</strong>
          <p>{m.headlineSub}</p>
        </div>
        <div className="mock-paper-grid">
          {m.cells.map((c, i) => (
            <div key={c.label} className={i === 1 ? "is-now" : i > 1 ? "is-sub" : undefined}>
              <small>{c.label}</small>
              <b>{c.title}</b>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mock-paper mock-paper-back" aria-hidden="true" />
    </div>
  );
}

export function CampusMockView({ m }: { m: CampusMock }) {
  return (
    <div className="mock mock-campus" role="img" aria-label={`${m.label}: ${m.title}`}>
      <div className="mock-chrome" aria-hidden="true">
        <span />
        <span />
        <span />
        <em>{m.label}</em>
      </div>
      <div className="mock-campus-body" aria-hidden="true">
        <div className="mock-campus-head">
          <div>
            <b>{m.title}</b>
            <small>{m.meta}</small>
          </div>
          <span className="mock-btn mock-btn-ghost">
            <Icon name="download" size={12} />
            {m.exportLabel}
          </span>
        </div>
        <div className="mock-kpis">
          {m.kpis.map((k) => (
            <div key={k.label}>
              <small>{k.label}</small>
              <b>{k.value}</b>
              <span>{k.note}</span>
            </div>
          ))}
        </div>
        <div className="mock-table">
          <b>{m.tableTitle}</b>
          <table>
            <thead>
              <tr>
                {m.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.rows.map((r) => (
                <tr key={r[0]}>
                  {r.map((c, i) => (
                    <td key={i} className={/^\d+$/.test(c) || i === 0 ? undefined : "is-hidden"}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <small className="mock-hidden-note">
            <Icon name="shield" size={12} />
            {m.hiddenNote}
          </small>
        </div>
      </div>
    </div>
  );
}
