import Link from "next/link";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { briefing } from "@/lib/ops";

export const metadata = { title: "운영 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 대기열 상태는 영어 그대로 두면 읽는 사람이 추측해야 한다. */
const OUTBOX_LABEL: Record<string, string> = {
  queued: "나갈 차례",
  sent: "나갔음",
  skipped: "접었음 (보낼 곳이 없음)",
  failed: "세 번 실패해 포기",
};

/**
 * 아침에 여는 화면.
 *
 * 터미널의 `npm run metri:ops` 와 **같은 함수**를 부른다. 두 곳에서 따로
 * 세면 숫자가 갈리고, 갈리는 순간 둘 다 못 믿는다.
 *
 * **여는 것만으로는 아무것도 보내지 않는다.** 새로고침 한 번이 발송 한
 * 번이 되면 안 되기 때문이다. 내보내는 일은 밤 당번(`/api/ops/tick`)이
 * 몇 분에 한 번 한다.
 */
export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await requireRole(["superadmin"]);
  const { days } = await searchParams;
  const b = await briefing(Number(days ?? 1));

  const rate = b.funnel.free
    ? `${Math.round((b.funnel.upgraded / b.funnel.free) * 1000) / 10}%`
    : "—";
  const blocked = b.stale.length + b.orphan.length + b.waiting.length;

  return (
    <AdminShell user={user} current="/admin/ops">
      <div className="page-head">
        <h1>운영</h1>
        <span className="count">최근 {b.days}일</span>
        <div className="right">
          {[1, 7, 30].map((d) => (
            <Link
              key={d}
              className={`act${d === b.days ? " solid" : ""}`}
              href={`/admin/ops?days=${d}`}
            >
              {d}일
            </Link>
          ))}
        </div>
      </div>

      {/* 사람이 할 일이 맨 위다. 이 화면을 여는 이유가 그것이다 */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>사람이 할 일</h2>
        {b.todo.length === 0 ? (
          <p className="sub" style={{ margin: 0 }}>
            없습니다. 그대로 두셔도 됩니다.
          </p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            {b.todo.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        )}
      </section>

      <div className="ops-grid">
        <section className="panel">
          <h2>{b.days === 1 ? "어제" : `최근 ${b.days}일`} 들어온 사람</h2>
          <dl className="ops-stats">
            <div><dt>가입</dt><dd>{b.people.signups}명</dd></div>
            <div><dt>응시 시작</dt><dd>{b.people.started}</dd></div>
            <div><dt>채점 끝</dt><dd>{b.people.scored}</dd></div>
          </dl>
        </section>

        <section className="panel">
          <h2>돈</h2>
          <dl className="ops-stats">
            <div><dt>카드 결제 합계</dt><dd>{won(b.salesTotal)}</dd></div>
            <div><dt>응시권 코드 교환</dt><dd>{b.codesUsed}건</dd></div>
            <div><dt>무료 → 유료</dt><dd>{rate}</dd></div>
          </dl>
          <p className="sub" style={{ marginBottom: 0 }}>
            코드로 판 금액은 쇼핑몰 장부에 있습니다. 여기 또 적으면 같은 매출이 두 번
            잡힙니다. 전환율은 같은 구간 안에서만 센 값이라, 무료로 풀고 며칠 뒤 사는
            사람은 빠져 있습니다.
          </p>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <h2>막힌 것 {blocked > 0 && <span className="count">{blocked}건</span>}</h2>
        {blocked === 0 ? (
          <p className="sub" style={{ margin: 0 }}>없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>무엇</th>
                  <th>어느 것</th>
                  <th style={{ textAlign: "right" }}>금액·규모</th>
                  <th>왜 급한가</th>
                </tr>
              </thead>
              <tbody>
                {b.orphan.map((r) => (
                  <tr key={`o-${r.orderNo}`}>
                    <td>결제됐는데 안 열림</td>
                    <td>{r.orderNo} · {r.product}</td>
                    <td style={{ textAlign: "right" }}>{won(r.amount)}</td>
                    <td>돈을 받고 아무것도 주지 않은 상태입니다</td>
                  </tr>
                ))}
                {b.stale.map((r) => (
                  <tr key={`s-${r.orderNo}`}>
                    <td>확정 안 된 결제</td>
                    <td>{r.orderNo} · {r.product}</td>
                    <td style={{ textAlign: "right" }}>{won(r.amount)}</td>
                    <td>{r.age} 지났습니다. 웹훅 누락이면 좌석이 없습니다</td>
                  </tr>
                ))}
                {b.waiting.map((r) => (
                  <tr key={`w-${r.id}`}>
                    <td>공개 대기 회차</td>
                    <td>
                      <Link href={`/org/sessions/${r.id}`}>#{r.id} {r.name}</Link>
                    </td>
                    <td style={{ textAlign: "right" }}>채점 끝 {r.n}명</td>
                    <td>학생은 다 풀었고 담당자만 안 눌렀습니다</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="ops-grid" style={{ marginTop: 20 }}>
        <section className="panel">
          <h2>응시권 코드 재고</h2>
          {b.stock.length === 0 ? (
            <p className="sub">찍어 둔 코드가 없습니다.</p>
          ) : (
            <ul className="ops-rows">
              {b.stock.map((s) => (
                <li key={s.product}>
                  <span>{s.product}</span>
                  {s.left < b.stockMin ? (
                    <b className="warn">{s.left}장</b>
                  ) : (
                    <b>{s.left}장</b>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="sub" style={{ marginBottom: 0 }}>
            기준 {b.stockMin}장. 떨어지면 밤사이 구매가 조용히 멈춥니다.
          </p>
        </section>

        <section className="panel">
          <h2>보낼 것 대기열</h2>
          {b.outbox.length === 0 ? (
            <p className="sub">비어 있습니다.</p>
          ) : (
            <ul className="ops-rows">
              {b.outbox.map((o) => (
                <li key={o.status}>
                  <span>{OUTBOX_LABEL[o.status] ?? o.status}</span>
                  <b>{o.n}건</b>
                </li>
              ))}
            </ul>
          )}
          <p className="sub" style={{ marginBottom: 0 }}>
            {b.gates.mail
              ? "몇 분에 한 번 나갑니다."
              : "메일 자격증명이 없어 쌓아만 둡니다. 채우시면 순서대로 나갑니다."}
          </p>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <h2>팔 수 있는 상태인가</h2>
        <ul className="ops-gates">
          <li className={b.gates.card && !b.gates.mock ? "on" : "off"}>
            카드 결제 —{" "}
            {b.gates.card
              ? b.gates.mock
                ? "가짜 결제(mock)입니다. 돈은 들어오지 않습니다"
                : "열려 있습니다"
              : "PORTONE_* 가 비어 있습니다"}
          </li>
          <li className={b.gates.codes ? "on" : "off"}>
            코드 교환 — {b.gates.codes ? "열려 있습니다" : "쓸 수 있는 코드가 없습니다"}
          </li>
          <li className={b.gates.mail ? "on" : "off"}>
            알림 — {b.gates.mail ? "나갑니다" : "쌓기만 합니다"}
          </li>
          <li className="on">
            켜져 있는 상품 {b.products.length}개 — {b.products.map((p) => p.code).join(", ")}
          </li>
        </ul>
      </section>
    </AdminShell>
  );
}
