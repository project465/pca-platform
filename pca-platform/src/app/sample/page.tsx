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
 * 견본 결과지.
 *
 * **지금은 옛 판본의 견본을 내놓지 않는다.** 이 틀 안에서 도는 것은
 * `PCAV2Report.render`, 즉 앞 판본(ME_V2)의 결과지다. 지금 파는 것은
 * ME_V3 이고 절도 읽는 차례도 다르다. 그대로 두면 사는 사람이 **받지
 * 않을 결과지**를 보고 결제한다. 그래서 신규 고객 쪽에서 이 자리를
 * 닫고, 옛 판본으로 응시하신 분이 주소를 들고 오시면 그것이 옛 판본의
 * 견본이라는 것을 적고 보여 드린다.
 *
 * **지어내서 메우지 않는다.** ME_V3 견본을 만들려면 합성 응시 하나를
 * 실제 엔진으로 끝까지 돌려 그 결과 모델을 떠 두어야 하고, 그 전까지는
 * 비어 있다고 적는 것이 맞다. 실제 응시자의 자료는 어느 경우에도 쓰지
 * 않는다.
 *
 * **띠를 작게 두지 않는다.** 견본이라는 것이 작게 적혀 있으면 받은
 * 사람이 자기 결과지로 읽는다.
 */

/**
 * 옛 판본 견본을 그대로 보고 싶을 때만 켠다.
 *
 * 기본값은 꺼짐이다. **값을 지어내지 않는 것과 같은 규칙이다**: 받지
 * 않을 결과지를 사기 전에 보여 주면 그것이 약속이 된다.
 */
const SHOW_LEGACY = process.env.SAMPLE_LEGACY_V2 === "yes";
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

        {SHOW_LEGACY ? (
          <>
            <p className="pdsample">
              <b>{L === "en" ? "Previous edition." : "앞 판본의 견본입니다."}</b>
              {L === "en"
                ? " This is the report of the previous edition, kept for people who"
                  + " took that edition. It is not what you receive today."
                : " 앞 판본으로 응시하신 분을 위해 남겨 둔 결과지이고,"
                  + " 지금 받으시는 것과는 다릅니다."}
            </p>
            <SampleFrame lang={L} />
          </>
        ) : (
          /* **없는 것을 비어 있다고 적는다.** 옛 결과지를 내놓는 것보다
             아직 없다고 적는 쪽이 사는 사람에게 덜 틀린 말이다 */
          <div className="pdsample" style={{ display: "block" }}>
            <b>
              {L === "en" ? "The sample is being prepared." : "견본을 준비하고 있습니다."}
            </b>
            <p style={{ marginTop: 10 }}>
              {L === "en"
                ? "The report was rebuilt, and the old sample no longer shows what you"
                  + " would receive. We would rather say it is not ready than show you"
                  + " a report you will not get. What the report contains is written out"
                  + " on the product page."
                : "결과지를 다시 만들면서 옛 견본이 지금 받으시는 것과 달라졌습니다."
                  + " 받지 않으실 결과지를 보여 드리느니 아직 없다고 적습니다."
                  + " 결과지에 무엇이 담기는지는 상품 소개에 적어 두었습니다."}
            </p>
            <p style={{ marginTop: 12 }}>
              <Link className="sf-btn ghost sm" href={`/product${q}`}>
                {L === "en" ? "What the report contains" : "결과지에 담기는 것"}
              </Link>
            </p>
          </div>
        )}

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
