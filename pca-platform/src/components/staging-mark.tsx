import { appEnv } from "@/lib/env";
import { paymentProvider } from "@/lib/payments";

/**
 * 이 배포본이 무엇인지 화면에 적는다.
 *
 * **공개 전 배포본은 손님 화면과 똑같이 생겼다.** 그래서 눌러 보는
 * 사람이 "결제가 됐다" 를 진짜로 읽고, 나중에 그 주문을 찾는다. 가짜로
 * 받고 있다는 것을 **매 쪽에 적어 두는 쪽이 싸다.**
 *
 * 운영에서는 아무것도 그리지 않는다.
 */
export default function StagingMark() {
  if (appEnv() !== "staging") return null;
  let mock = true;
  try { mock = paymentProvider().name === "mock"; } catch { mock = true; }
  return (
    <div className="stgmark" role="note">
      <b>공개 전 시험 배포</b>
      <span>
        {mock
          ? "결제는 가짜입니다. 돈이 오가지 않고 카드 정보를 묻지 않습니다."
          : "결제 대행사가 붙어 있습니다. 실제로 결제될 수 있습니다."}
      </span>
    </div>
  );
}
