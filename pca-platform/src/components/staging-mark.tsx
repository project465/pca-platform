import { appEnv } from "@/lib/env";
import { paymentProvider } from "@/lib/payments";

/**
 * 이 배포본이 무엇인지 **운영자 화면에** 적는다.
 *
 * 전에는 `app/layout.tsx` 에서 쪽마다 띠를 세웠다. 공개 전 배포본이
 * 손님 화면과 똑같이 생겨서, 눌러 본 사람이 "결제가 됐다" 를 진짜로
 * 읽는 것을 막으려는 자리였다. 그런데 그 띠가 **파는 제품의 모든
 * 화면에 개발용 문구를 얹는다.** 학생이 검사를 푸는 쪽과 결과지를 읽는
 * 쪽에도 선다.
 *
 * 그래서 띠를 운영자 화면(`src/app/admin/layout.tsx`)으로 옮겼다.
 * 가짜 결제를 진짜로 읽는 것을 막는 자리는 **그대로 셋이다**: 공개 전
 * 배포본은 `STAGING_BASIC_AUTH` 자물쇠 뒤에 있어 아는 사람만 열고 ·
 * 가짜 결제창이 제 머리글에 그것이 가짜라고 적고 · 운영에서는
 * `ALLOW_MOCK_PAYMENTS` 를 꽂아도 거절한다. 띠는 그 셋 가운데 하나가
 * 아니었고, 운영자에게는 지금도 쓸모가 있다.
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
          ? "결제가 실제로 이루어지지 않습니다"
          : "결제 대행사가 붙어 있어 실제로 결제될 수 있습니다"}
      </span>
    </div>
  );
}
