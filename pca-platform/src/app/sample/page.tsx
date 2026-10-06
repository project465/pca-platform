import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import PublicFooter from "@/components/sf/public-footer";
import { resolveLang } from "@/lib/locale-server";
import { toLang2, BRAND } from "@/lib/surface-text";
import { PRODUCT } from "@/lib/product-copy";
import LangSelect from "@/components/sf/lang-select";
import { SampleFrame } from "./sample-frame";

export const metadata = { title: `견본 결과지 · ${BRAND.root}` };

/**
 * 견본 결과지. 사기 전에 결과지가 어떻게 생겼는지 보는 자리다.
 *
 * **실제 엔진으로 그린다.** 틀 안에서 도는 것이 산 사람의 결과지와 같은
 * `PCAV2Report.render` 다. 견본을 따로 손으로 만들면 제품을 고친 날
 * 견본만 옛것으로 남고, 그 차이를 아무도 세지 않는다.
 *
 * **담긴 값은 전부 지어낸 것이다.** 실제 응시자의 자료를 쓰지 않는다
 * (규격 §7). 그래서 로그인 없이 열린다.
 *
 * **띠를 작게 두지 않는다.** 견본이라는 것이 작게 적혀 있으면 받은
 * 사람이 자기 결과지로 읽는다.
 */
export default async function SamplePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const q = sp.lang ? `?lang=${sp.lang}` : "";

  return (
    <div className="pub">
      <header className="pubtop">
        {/* 로고와 브랜드 글자가 한 덩어리로 홈으로 간다. 로그인했으면 그
            역할의 첫 화면, 아니면 공개 홈이다 */}
        <BrandHome />
        <div className="pubtop-r">
          <LangSelect current={L} />
          <Link href={`/product${q}`} className="sf-btn ghost sm">
            {L === "en" ? "About" : "상품 소개"}
          </Link>
          <Link href={`/pricing${q}`} className="sf-btn accent sm">
            {PRODUCT.nav.pricing[L]}
          </Link>
        </div>
      </header>

      <div className="pubwrap" style={{ maxWidth: 1040 }}>
        <div className="sf-head">
          <div className="sf-head-t">
            <div className="sf-eyebrow">STANDARD</div>
            <h1 className="sf-h1">{PRODUCT.sample.title[L]}</h1>
            <p className="sf-sub">{PRODUCT.sample.body[L]}</p>
          </div>
        </div>

        <p className="pdsample">
          <b>{L === "en" ? "Sample report." : "견본 결과지입니다."}</b>
          {L === "en"
            ? " Every value in it belongs to a fictional respondent. "
              + "Your own report is drawn from your answers and your experience."
            : " 담긴 값은 지어낸 응시자의 것입니다. "
              + "사신 분의 결과지는 그분의 답과 경험으로 그려집니다."}
        </p>

        <SampleFrame lang={L} />

        <div className="pdcta">
          <Link href={`/pricing${q}`} className="sf-btn accent">
            {PRODUCT.hero.cta[L]}
          </Link>
          <Link href={`/product${q}`} className="sf-btn ghost">
            {L === "en" ? "Back to the product page" : "상품 소개로"}
          </Link>
        </div>
      </div>

      <PublicFooter lang={L} />
    </div>
  );
}
