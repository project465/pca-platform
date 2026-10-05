import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import { commercialReport } from "@/lib/commercial";

export const metadata = { title: "상용화 준비 · 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

/**
 * 상용화 준비 화면.
 *
 * 터미널의 `npm run commercial:check` 와 **같은 함수**를 부른다
 * (`src/lib/commercial.ts`). 두 곳에서 따로 세면 숫자가 갈리고, 갈리는
 * 순간 둘 다 못 믿는다(`/admin/ops` 와 같은 규칙).
 *
 * **[됨] 과 [블로커] 를 섞지 않는다.** 섞으면 화면이 늘 빨간불이어서
 * 아무도 보지 않게 되고, 그러면 진짜 회귀가 그 빨간불에 섞여 든다.
 * 막힌 것에는 **누가 정하는가**를 같이 적는다: 'TODO' 로 두면 개발이
 * 할 일로 읽히고, 그러면 아무도 결정하지 않는다.
 *
 * **여는 것만으로 아무것도 바꾸지 않는다.** 읽기만 한다.
 */
const PRICE_LABEL: Record<string, string> = {
  PRICE_APPROVED: "승인됨",
  FREE: "무료 (승인된 0원)",
  PRICE_NOT_APPROVED: "아직 승인되지 않음",
};

export default async function ReadinessPage() {
  const user = await requireRole(["superadmin"]);
  const r = await commercialReport();

  const live = r.payments.filter((p) => p.ready).length;
  const approved = r.prices.filter((p) => p.state === "PRICE_APPROVED").length;
  const translated = r.consent.filter((c) => c.translation_status === "translated").length;

  return (
    <AdminShell user={user} current="/admin/readiness">
      <h1>상용화 준비</h1>
      <p className="sub">
        터미널의 <code>npm run commercial:check</code> 와 같은 값을 읽습니다.
        여는 것만으로 아무것도 바꾸지 않습니다.
      </p>

      {/* 막힌 것을 맨 위에 둔다. 이 화면을 여는 이유가 그것이다 */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>상용화를 막는 것 {r.blockers.length}가지</h2>
        {r.blockers.length === 0 ? (
          <p className="sub">없습니다.</p>
        ) : (
          <div className="sf-tw"><table className="sf-table">
            <thead>
              <tr><th>무엇</th><th>왜</th><th>누가 정하는가</th></tr>
            </thead>
            <tbody>
              {r.blockers.map((b, i) => (
                <tr key={i}>
                  <td><b>{b.what}</b></td>
                  <td>{b.why}</td>
                  <td>{b.who}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <p className="sub">
          여기 있는 것은 <b>우리가 코드로 끝낼 수 없는 것</b>입니다. 개발이
          할 일로 두면 아무도 결정하지 않습니다.
        </p>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>가격 — 승인 {approved} / {r.prices.length}</h2>
        <div className="sf-tw"><table className="sf-table">
          <thead>
            <tr><th>상품</th><th>시장</th><th>등급</th><th>값</th><th>상태</th></tr>
          </thead>
          <tbody>
            {r.prices.map((p) => (
              <tr key={p.code}>
                <td><code>{p.code}</code></td>
                <td>{p.market ?? "—"}</td>
                <td>{p.tier ?? "—"}</td>
                {/* **0 을 '무료' 로 적지 않는다**: 승인된 0원과 아직 못
                    정한 것은 다른 상태다 */}
                <td>
                  {p.state === "PRICE_NOT_APPROVED"
                    ? "—"
                    : `${p.amount.toLocaleString()} ${p.currency}`}
                </td>
                <td>{PRICE_LABEL[p.state] ?? p.state}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>결제 — 받을 수 있는 시장 {live} / {r.payments.length}</h2>
        <div className="sf-tw"><table className="sf-table">
          <thead>
            <tr><th>시장</th><th>채널</th><th>대행사</th><th>지금</th></tr>
          </thead>
          <tbody>
            {r.payments.map((p) => (
              <tr key={p.market}>
                <td><b>{p.market}</b></td>
                <td>{p.region === "domestic" ? "국내 카드" : "해외 카드"}</td>
                <td>{p.provider ?? "아직 정하지 않음"}</td>
                <td>{p.ready ? "받을 수 있습니다" : p.blocker}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="sub">
          국내 PG 의 일반 카드결제로는 해외 발급 Visa·Mastercard 가 승인되지
          않습니다. 그래서 채널이 둘이고, <b>해외 쪽은 비어 있으면 닫혀
          있는 것이 맞습니다</b> — 누르면 오류가 나는 버튼은 안내가 아닙니다.
        </p>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>동의문 — 번역 {translated} / {r.consent.length}</h2>
        <div className="sf-tw"><table className="sf-table">
          <thead>
            <tr><th>종류</th><th>판</th><th>언어</th><th>필수</th><th>본문</th></tr>
          </thead>
          <tbody>
            {r.consent.map((c) => (
              <tr key={`${c.kind}-${c.locale}-${c.version}`}>
                <td>{c.kind}</td>
                <td>{c.version}</td>
                <td>{c.locale}</td>
                <td>{c.required ? "필수" : "선택"}</td>
                <td>
                  {c.translation_status === "translated"
                    ? "있습니다"
                    : `없습니다 — ${c.governing_locale ?? "?"} 본문이 기준`}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="sub">
          <b>약관을 기계로 옮겨 올리지 않았습니다.</b> 구속력 있는 문서를
          확인 없이 내놓으면 그걸 읽고 동의한 사람이 생깁니다. 영어 화면은
          번역이 준비 중이고 한국어 본문이 기준이라고 영어로 적습니다.
        </p>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>사이트와 도메인</h2>
        <div className="sf-tw"><table className="sf-table">
          <thead><tr><th>사이트</th><th>도메인</th><th>결제 시장</th></tr></thead>
          <tbody>
            {r.sites.map((s) => (
              <tr key={s.site_id}>
                <td>{s.site_id}</td>
                <td><code>{s.domain}</code></td>
                <td>{s.payment_market}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="sub">
          철자가 {r.oneSpelling ? "하나로 모여 있습니다" : "두 가지가 섞여 있습니다"}.
          도메인이 사는 자리는 이 표 한 곳이고, 소개 사이트 쪽은
          <code> marketing/src/lib/domains.ts</code> 한 곳입니다.
        </p>
      </section>
    </AdminShell>
  );
}
