import Link from "next/link";
import { requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import { trackInterest } from "@/lib/me-v3/platform";
import { getProduct } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import {
  TRACK_PRODUCTS, TRACK_TRIAL, activeTrack, proTrialClaimable, trackHistory,
} from "@/lib/track";
import { CmShell, CmHead } from "../shell";
import { SectionHeader } from "../ui";
import { claimTrial, toggleInterest } from "./actions";

export const metadata = { title: "CareerMatri Track" };

/**
 * CareerMatri Track · 내 구독.
 *
 * **산업팩을 더 여는 상품이 아니다.** 여덟 산업과 여덟 역할은 진단에
 * 포함되고 탐색에서 전부 볼 수 있다. Track 이 파는 것은 **내 커리어
 * 상황이 바뀔 때 다시 견주는 일**이다.
 *
 * **1단계는 기간권이다.** 30일권과 365일권을 한 번씩 팔고 자동으로 갱신하지
 * 않는다. 기간이 끝나면 저절로 닫히고 카드가 다시 긁히지 않는다. 정기결제는
 * PG 계약과 중도 해지·정산 규칙이 정해진 뒤에 연다.
 *
 * **지금 열리는 것과 준비 중인 것을 가른다.** 준비 중인 것을 산 것처럼
 * 적으면 그것이 약속이 된다. 열리는 것은 제자리로 보내는 링크로, 준비 중인
 * 것은 줄로만 적는다(테를 두르고 아이콘을 붙이면 있는 기능처럼 보인다).
 */

/** 표시를 받는 열쇠 하나. 줄마다 따로 받지 않는다 */
const WAIT = "track";

/** Track 으로 지금 열리는 것. **Track 안에 두지 않고 제자리를 가리킨다** */
const OPEN: { href: string; title: string; body: string }[] = [
  {
    href: "/me/explore",
    title: "관심 산업·직무 바꿔 다시 비교하기",
    body: "산업과 직무를 둘씩 골라 그쪽 기준으로 내 경험을 다시 세웁니다. 횟수 제한이 없습니다.",
  },
  {
    href: "/me/apply",
    title: "지원한 곳과 내 근거 나란히 보기",
    body: "적어 두신 지원 직무마다 설명할 수 있는 영역과 비어 있는 영역을 가릅니다.",
  },
];

/** 준비 중. **넷을 넘기지 않고 날짜를 적지 않는다** */
const PLANNED: string[] = [
  "달라진 것만 모은 월간 변화 리포트 PDF",
  "분기마다 한 번 다른 전공 기준으로 보기",
];

const day = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
  }).format(new Date(iso));

const NAME: Record<string, string> = {
  TRACK_30D: "30일권",
  TRACK_365D: "365일권",
  [TRACK_TRIAL]: "PRO 구매 첫 1개월",
};

export default async function Track({
  searchParams,
}: {
  searchParams: Promise<{ trial?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const [major, wait, state, history, claimable, prods] = await Promise.all([
    activeMajorName(user.id),
    trackInterest(user.id),
    activeTrack(user.id),
    trackHistory(user.id),
    proTrialClaimable(user.id),
    Promise.all(TRACK_PRODUCTS.map((c) => getProduct(c))),
  ]);
  const on = wait.length > 0;
  const sale = prods.filter((p): p is NonNullable<typeof p> => !!p);
  const p30 = sale.find((p) => p.code === "TRACK_30D");
  const p365 = sale.find((p) => p.code === "TRACK_365D");
  /* 1년치를 30일권으로 사면 얼마인지와 견준다. **지어낸 할인율이 아니고**
     두 상품의 값으로 그 자리에서 센 수다 */
  const save = p30 && p365 ? p30.amount * 12 - p365.amount : 0;

  return (
    <CmShell active="/me/track" title="Track" major={major}>
      <CmHead
        kicker={state.on ? "구독 중" : "기간권"}
        title="경험이 늘고 목표가 바뀔 때마다 다시 견줍니다"
        lead={"검사 결과는 응시한 날의 상태로 굳어 있습니다. Track 이 열려 있는 "
          + "동안에는 관심 산업과 직무를 바꿔 보고, 지원한 곳과 내 근거를 나란히 "
          + "놓아 볼 수 있습니다. 자동으로 갱신되지 않습니다."}
      />

      {sp.trial === "1" ? (
        <p className="cm-none" role="status" style={{ marginBottom: 12 }}>
          {state.on ? "첫 1개월이 열렸습니다." : "이미 받으셨거나 받을 수 있는 결제가 없습니다."}
        </p>
      ) : null}

      <SectionHeader icon="clock" title="지금 상태" />
      <div className="cm-panel is-one">
        <div className="cm-pane">
          {state.on && state.until ? (
            <>
              <p className="cm-row">
                <b>{day(state.until)}까지 열려 있습니다</b>
                <span>{NAME[state.product ?? ""] ?? "Track"}{state.queued ? " · 이어서 산 기간 포함" : ""}</span>
              </p>
              <p className="cm-none">
                기간이 끝나면 저절로 닫히고 결제가 다시 이뤄지지 않습니다. 남은
                기간은 지원 화면에서 일할로 환불을 요청할 수 있습니다.
              </p>
            </>
          ) : (
            <p className="cm-row">
              <b>열려 있지 않습니다</b>
              <span>아래에서 기간권을 고르시면 바로 열립니다.</span>
            </p>
          )}
          {claimable ? (
            <form action={claimTrial} className="cm-acts">
              <span className="cm-none">PRO 결과지를 사셨습니다. Track 첫 1개월을 받으실 수 있습니다.</span>
              <button className="cm-btn is-primary" type="submit">첫 1개월 받기</button>
            </form>
          ) : null}
        </div>
      </div>

      {sale.length ? (
        <>
          <SectionHeader icon="box" title={state.on ? "기간 늘리기" : "기간권 고르기"}
            sub={state.on ? "지금 기간이 끝나는 날에서 이어 붙습니다." : "PRO 결과지를 사시면 첫 1개월이 함께 열립니다."} />
          <div className="cm-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {sale.map((p) => (
              <div className="cm-panel is-one" key={p.code}>
                <div className="cm-pane">
                  <p className="cm-row">
                    <b>{NAME[p.code]}</b>
                    <span>{formatMoney(p.amount, p.currency, "ko") ?? "—"} · 한 번 결제 · 부가세 포함</span>
                  </p>
                  <p className="cm-none">
                    {p.code === "TRACK_365D" && save > 0
                      ? `30일권을 열두 번 사는 것보다 ${formatMoney(save, p.currency, "ko")} 적습니다.`
                      : "한 달만 써 보고 정해도 됩니다."}
                  </p>
                  <div className="cm-acts">
                    <Link className={`cm-btn${p.code === "TRACK_365D" ? " is-primary" : ""}`}
                      href={`/checkout?product=${encodeURIComponent(p.code)}`}>
                      {state.on ? "이어서 사기" : "결제하기"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <SectionHeader icon="check" title="Track 으로 열리는 것" />
      <div className="cm-panel is-one">
        <div className="cm-pane">
          <div className="cm-rows">
            {OPEN.map((a) => (
              <p className="cm-row" key={a.href}>
                <b>{a.title}</b>
                <span>{a.body}</span>
              </p>
            ))}
          </div>
          <div className="cm-acts">
            {OPEN.map((a) => (
              <Link className="cm-btn" href={a.href} key={a.href}>
                {a.href === "/me/explore" ? "산업·직무" : "지원 기록"}
              </Link>
            ))}
          </div>
          <p className="cm-none">
            새 경험을 적고 현재 상태에 더하는 일은 Track 없이도 됩니다. 학교에서
            받은 검사와 결과도 그대로입니다.
          </p>
        </div>
      </div>

      <SectionHeader icon="spark" title="준비 중" />
      <div className="cm-panel is-one">
        <div className="cm-pane">
          <div className="cm-rows">
            {PLANNED.map((t) => (
              <p className="cm-row" key={t}><b>{t}</b></p>
            ))}
          </div>
          <p className="cm-none">여는 날은 아직 정해지지 않았습니다.</p>
          <form action={toggleInterest} className="cm-acts">
            <input type="hidden" name="feature" value={WAIT} />
            <input type="hidden" name="on" value={on ? "0" : "1"} />
            <button className="cm-btn" type="submit">
              {on ? "알림 끄기" : "열리면 알려주세요"}
            </button>
          </form>
        </div>
      </div>

      {history.length ? (
        <>
          <SectionHeader icon="log" title="구독 기록" />
          <div className="cm-tablewrap">
            <table className="cm-table">
              <thead>
                <tr><th>기간권</th><th>시작</th><th>끝</th><th>주문</th></tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={`${h.order_no ?? "t"}-${i}`}>
                    <td><b>{NAME[h.product_code] ?? h.product_code}</b></td>
                    <td>{day(h.starts_at)}</td>
                    <td>{day(h.ends_at)}</td>
                    <td>{h.order_no ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </CmShell>
  );
}
