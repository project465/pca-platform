import Link from "next/link";
import BrandHome from "./brand-home";
import type { Lang2 } from "@/lib/surface-text";

/**
 * 상거래 화면을 아직 열 수 없을 때 그 자리에 서는 쪽.
 *
 * **무엇이 비었는지 적지 않는다.** 사는 사람에게 `BUSINESS_REG_NO` 는
 * 할 일이 아니고, 적어 두면 아직 사업자 정보가 없는 가게라는 것을
 * 자세히 알리는 셈이다. 비어 있는 칸은 운영 화면이 센다.
 */
export default function NotOpen({ lang }: { lang: Lang2 }) {
  const L = lang;
  return (
    <div className="pub">
      <header className="pubtop">
        <BrandHome />
      </header>
      <div className="pubwrap" style={{ maxWidth: 640 }}>
        <div className="sf-head">
          <div className="sf-head-t">
            <h1 className="sf-h1">
              {L === "en" ? "Not open for sale yet" : "아직 판매를 열지 않았습니다"}
            </h1>
            <p className="sf-sub">
              {L === "en"
                ? "We are finishing the business details the law requires us to display before taking payment. The plans go on sale once that is done."
                : "결제를 받기 전에 법이 요구하는 사업자 표시를 마무리하고 있습니다. 끝나면 등급 판매를 엽니다."}
            </p>
          </div>
        </div>
        <p style={{ marginTop: 8 }}>
          <Link href="/login" className="sf-btn ghost">
            {L === "en" ? "Sign in" : "로그인"}
          </Link>
        </p>
      </div>
    </div>
  );
}
