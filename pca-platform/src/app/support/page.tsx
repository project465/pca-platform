import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import { currentUser, requireUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { toLang2, BRAND } from "@/lib/surface-text";
import { SUPPORT, PRODUCT } from "@/lib/product-copy";
import { supportConfig, myReferences } from "@/lib/support";
import { isVerified } from "@/lib/verify-email";
import { listRequests, REASONS, REASON_LABEL } from "@/lib/refund-requests";
import { money } from "@/lib/market";
import { amountLabel, orderStatusLabel, productLabel } from "@/lib/labels";
import { Empty, Pill } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";
import PublicFooter from "@/components/sf/public-footer";
import { ResendVerify, RefundForm } from "./support-forms";
import { withdrawAction } from "./actions";

export const metadata = { title: `문의 · ${BRAND.root}` };

/**
 * 지원 화면.
 *
 * **창업자가 DB 를 열어 보는 것으로 지원을 대신하지 않는다**(규격 §15).
 * 그래서 본인이 직접 보는 것을 먼저 둔다: 주문 번호 · 결제 상태 · 막힌
 * 것의 참조 번호. 사람이 받는 것은 그 아래 메일 한 줄이고, 주소가 비어
 * 있으면 비어 있다고 적는다.
 *
 * **본인 것만 보인다.** 주문 번호를 주소로 바꿔 넣어도 남의 것은 나오지
 * 않는다(`myReferences` 가 `user_id` 로 걸러 읽는다).
 *
 * **환불 규칙을 글로만 적어 두지 않는다**(규격 §10). 약관에 적어 놓고
 * 화면에 단추가 없으면, 그 규칙은 메일을 쓸 줄 아는 사람에게만 있는
 * 규칙이 된다.
 */
export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; verify?: string }>;
}) {
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const S = SUPPORT;
  const sup = await supportConfig();

  /**
   * **로그인 벽으로 끝내지 않는다.**
   *
   * 공개 꼬리말의 `고객지원` 이 이 주소를 가리킨다. 아직 사지 않은 사람이
   * 그것을 누르고 로그인 폼을 만나면, 묻고 싶던 것을 못 묻고 돌아간다.
   * 번호가 붙는 자리(주문 · 환불 · 막힌 것)는 그대로 본인에게만 보이고,
   * 사람에게 닿는 주소와 비밀번호 복구만 먼저 내놓는다.
   */
  const guest = await currentUser();
  if (!guest) {
    return (
      <div className="pub">
        <header className="pubtop">
          <BrandHome />
          <div className="pubtop-r">
            <LangSelect current={L} />
            <Link href="/login" className="sf-btn ghost sm">
              {L === "en" ? "Sign in" : "로그인"}
            </Link>
          </div>
        </header>

        <div className="pubwrap spwrap">
          <div className="sf-head">
            <div className="sf-head-t">
              <h1 className="sf-h1">{S.guestTitle[L]}</h1>
              <p className="sf-sub">{S.guestBody[L]}</p>
            </div>
          </div>

          <section className="pdsec">
            <h2>{S.mail[L]}</h2>
            {sup.email ? (
              <p>
                <a href={`mailto:${sup.email}`}>{sup.email}</a>
                {sup.hours ? ` · ${sup.hours}` : ""}
              </p>
            ) : (
              <Empty icon="box" title={S.mailOff[L]} body={S.mailOffBody[L]} tight />
            )}
            <div className="sf-row" style={{ marginTop: 16 }}>
              <Link href="/login" className="sf-btn sm">{S.guestSignIn[L]}</Link>
              <Link href="/password/forgot" className="sf-btn ghost sm">{S.pwLink[L]}</Link>
            </div>
          </section>
        </div>

        <PublicFooter lang={L} />
      </div>
    );
  }

  const user = await requireUser();
  const refs = await myReferences(user.id);
  const verified = await isVerified(user.id);
  const mine = await listRequests({ userId: user.id, limit: 10 });
  const open = mine.find((r) => r.status === "requested");

  /* 결제가 확정된 주문만 환불을 요청할 수 있다. 환불된 것과 아직 결제
     안 된 것을 목록에 두면 고를 수 있는 것처럼 보인다 */
  const refundable = refs.orders.filter((o) => o.status === "paid" && !o.refundRequested);

  return (
    <div className="pub">
      <header className="pubtop">
        {/* 로고와 브랜드 글자가 한 덩어리로 홈으로 간다. 로그인했으면 그
            역할의 첫 화면, 아니면 공개 홈이다 */}
        <BrandHome />
        <div className="pubtop-r">
          <LangSelect current={L} />
          <Link href="/my" className="sf-btn ghost sm">
            {L === "en" ? "My page" : "내 화면"}
          </Link>
        </div>
      </header>

      <div className="pubwrap spwrap">
        <div className="sf-head">
          <div className="sf-head-t">
            <h1 className="sf-h1">{S.title[L]}</h1>
            <p className="sf-sub">{S.body[L]}</p>
          </div>
        </div>

        {/* 주소 확인 결과가 링크를 타고 돌아온다 */}
        {sp.verify === "ok" ? (
          <p className="notice ok">{S.verifyOk[L]}</p>
        ) : sp.verify === "expired" ? (
          <p className="notice error">{S.verifyExpired[L]}</p>
        ) : null}

        {/* 1. 내 주문. **번호를 본인이 직접 본다** */}
        <section className="pdsec">
          <h2>{S.orders[L]}</h2>
          {refs.orders.length ? (
            <div className="sf-tw">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>{L === "en" ? "Order" : "주문 번호"}</th>
                    <th>{L === "en" ? "Plan" : "상품"}</th>
                    <th>{L === "en" ? "Amount" : "금액"}</th>
                    <th>{L === "en" ? "Status" : "상태"}</th>
                    <th>{L === "en" ? "Date" : "날짜"}</th>
                  </tr>
                </thead>
                <tbody>
                  {refs.orders.map((o) => (
                    <tr key={o.orderNo}>
                      <td className="sf-strong">{o.orderNo}</td>
                      {/* **안쪽 이름을 손님에게 보여 주지 않는다.** 원본
                          코드와 상태는 운영 화면에 그대로 남는다 */}
                      <td>{productLabel(o.productCode, L)}</td>
                      <td className="num">{amountLabel(o.amount, o.currency, L)}</td>
                      <td>
                        <Pill tone={o.status === "paid" ? "ok"
                          : o.status === "refunded" ? "not" : "part"}>
                          {orderStatusLabel(o.status, o.amount, L)}
                        </Pill>
                        {o.refundRequested ? ` · ${S.refundOpen[L]}` : ""}
                      </td>
                      <td>{o.paidAt ?? o.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="sf-meta">{S.noOrders[L]}</p>
          )}
        </section>

        {/* 2. 막혀 있는 것. **참조 번호가 여기 있다** */}
        <section className="pdsec">
          <h2>{S.refs[L]}</h2>
          <p>{S.refsBody[L]}</p>
          {refs.failures.length ? (
            <div className="sf-tw">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>{L === "en" ? "What" : "무엇"}</th>
                    <th>{L === "en" ? "Reference" : "참조 번호"}</th>
                    <th>{L === "en" ? "When" : "언제"}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {refs.failures.map((f) => (
                    <tr key={`${f.attemptId}-${f.at}`}>
                      <td>{f.kind}</td>
                      <td className="sf-strong">{f.traceId ?? "-"}</td>
                      <td>{f.at}</td>
                      <td>
                        {f.attemptId ? (
                          <Link href={`/assessment/${f.attemptId}/report`}
                            className="sf-btn ghost sm">
                            {L === "en" ? "Try again" : "다시 만들기"}
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="sf-meta">{S.noRefs[L]}</p>
          )}
        </section>

        {/* 3. 결제가 안 될 때. **두 번 결제하지 말라고 먼저 적는다** */}
        <section className="pdsec">
          <h2>{S.payTrouble[L]}</h2>
          <p>{S.payTroubleBody[L]}</p>
        </section>

        {/* 4. 환불 요청 */}
        <section className="pdsec">
          <h2>{S.refund[L]}</h2>
          <p>{S.refundBody[L]}</p>
          <div className="pdcta">
            <Link href="/legal/refund" className="sf-btn ghost sm">
              {PRODUCT.support.refundLink[L]}
            </Link>
          </div>

          {open ? (
            <div className="pdcard" style={{ marginTop: 16 }}>
              <h3>{S.refundOpen[L]}</h3>
              <p className="sf-meta">
                {open.orderNo} · {open.requestedAt} · {REASON_LABEL[open.reason][L]}
              </p>
              {!open.verdictOk ? (
                <p className="pxtbd" style={{ marginTop: 10 }}>{S.refundDenied[L]}</p>
              ) : null}
              <form action={withdrawAction} style={{ marginTop: 12 }}>
                <input type="hidden" name="request" value={open.id} />
                <button className="sf-btn ghost sm">{S.refundWithdraw[L]}</button>
              </form>
            </div>
          ) : (
            <RefundForm
              orders={refundable.map((o) => ({
                orderNo: o.orderNo,
                /* 고르는 자리에도 안쪽 코드를 적지 않는다 */
                label: `${o.orderNo} · ${productLabel(o.productCode, L)}`,
              }))}
              reasons={REASONS.map((c) => ({ code: c, label: REASON_LABEL[c][L] }))}
              labels={{
                ask: S.refundAsk[L], reason: S.refundReason[L],
                order: L === "en" ? "Order" : "주문",
                sent: S.refundSent[L], denied: S.refundDenied[L],
                open: S.refundOpen[L],
                /* 거절 이유마다 다른 문장을 준다. 하나로 뭉개면 이미 돈을
                   낸 사람이 자기를 의심한다(`redeem` 과 같은 규칙) */
                why: {
                  started: S.refundWhyStarted[L],
                  viewed: S.refundWhyViewed[L],
                  expired_window: S.refundWhyWindow[L],
                  not_paid: S.refundWhyNotPaid[L],
                  already: S.refundWhyAlready[L],
                },
              }}
            />
          )}
        </section>

        {/* 5. 메일 주소 확인. **응시를 막지 않는다** */}
        <section className="pdsec">
          <h2>{S.verify[L]}</h2>
          {verified === null ? (
            <p className="sf-meta">
              {L === "en"
                ? "This account has no email address on file."
                : "이 계정에는 메일 주소가 없습니다."}
            </p>
          ) : verified ? (
            <p className="sf-meta">{S.verifyDone[L]}</p>
          ) : (
            <>
              <p>{S.verifyPending[L]}</p>
              <ResendVerify labels={{
                send: S.verifySend[L], sent: S.refundSent[L], off: S.verifyMailOff[L],
              }} />
            </>
          )}
        </section>

        {/* 6. 비밀번호 */}
        <section className="pdsec">
          <h2>{S.pw[L]}</h2>
          <p>{S.pwBody[L]}</p>
          <div className="pdcta">
            <Link href="/password/forgot" className="sf-btn ghost sm">{S.pwLink[L]}</Link>
          </div>
        </section>

        {/* 7. 사람이 받는 자리 */}
        <section className="pdsec">
          <h2>{S.mail[L]}</h2>
          {sup.email ? (
            <p>
              <a href={`mailto:${sup.email}`}>{sup.email}</a>
              {sup.hours ? ` · ${sup.hours}` : ""}
            </p>
          ) : (
            <Empty icon="box" title={S.mailOff[L]} body={S.mailOffBody[L]} tight />
          )}
        </section>
      </div>
    </div>
  );
}
