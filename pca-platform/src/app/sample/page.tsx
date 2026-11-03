import Link from "next/link";
import PublicFooter from "@/components/sf/public-footer";
import { resolveLang } from "@/lib/locale-server";
import { toLang2, BRAND } from "@/lib/surface-text";
import { PRODUCT } from "@/lib/product-copy";
import { core as coreEntry } from "@/lib/me-v3/core-registry";
import { hasEdition } from "@/lib/me-v3/i18n";
import type { ResultModel } from "@/lib/me-v3/result/model";
import { V3ResultBody } from "@/app/v3/[attemptId]/result/body";
import SAMPLE from "@/lib/me-v3/sample/standard.json";
import { SampleFrame } from "./sample-frame";
import { pageTitle } from "@/lib/page-title";

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  return pageTitle("견본 결과지 · CareerMatri", searchParams);
}

/**
 * 견본 결과지.
 *
 * **산 사람의 결과지와 같은 한 벌로 그린다**(`v3/[attemptId]/result/body.tsx`).
 * 담긴 값은 지어낸 응시자 한 사람(설계 캡스톤을 한 기계공학 학부생, STANDARD)의
 * 답을 지금 파는 검사의 채점 엔진과 결과 엔진에 끝까지 돌린 것이고
 * (`npm run v3:sample`), 실제 응시자의 자료는 어느 경우에도 쓰지 않는다.
 * 손으로 적어 두지 않는 까닭은 제품을 고친 날 견본만 옛것으로 남기 때문이다.
 * `CHECK=1 npm run v3:sample` 이 견본이 지금 엔진과 같은지 센다.
 *
 * **띠를 작게 두지 않는다.** 견본이라는 것이 작게 적혀 있으면 받은 사람이
 * 자기 결과지로 읽는다. 그래서 띠가 쪽 맨 위에 붙어 따라 내려온다.
 *
 * 견본에는 로그인한 사람이 없다. 작업공간 · 할 일 담기 · 종이 길은 본문이
 * 세우지 않는다(`sample` 을 넘기면 `ws` 가 꺼진다).
 */

/**
 * 앞 판본(ME_V2) 견본을 그대로 보고 싶을 때만 켠다. 옛 판본으로 응시하신
 * 분을 위해 남겨 둔 길이고 기본값은 꺼짐이다.
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
  const model = SAMPLE.model as unknown as ResultModel;
  const core = SAMPLE.core;
  /* 영어 원고가 없는 전공이면 한국어로 그린다. 반쯤 번역된 견본은 받는 사람이
     자기 결과지도 그렇게 나올 줄 안다 */
  const lang = L === "en" && hasEdition(core, "en") ? "en" : "ko";
  const c = coreEntry(core);
  const en = L === "en";

  if (SHOW_LEGACY) {
    return (
      <div className="pub">
        <div className="pubwrap" style={{ maxWidth: 1040 }}>
          <p className="pdsample">
            <b>{en ? "Previous edition." : "앞 판본의 견본입니다."}</b>
            {en
              ? " This is the report of the previous edition, kept for people who took"
                + " that edition. It is not what you receive today."
              : " 앞 판본으로 응시하신 분을 위해 남겨 둔 결과지이고, 지금 받으시는 것과는 다릅니다."}
          </p>
          <SampleFrame lang={L} />
        </div>
        <PublicFooter lang={L} />
      </div>
    );
  }

  return (
    <>
      <div className="smpbar" role="note">
        <div className="smpbar-in">
          <p>
            <b>{en ? "Sample report" : "견본 결과지입니다"}</b>
            <span>
              {en
                ? "The answers belong to a made-up mechanical engineering student who did a"
                  + " design capstone (STANDARD). They were run through the same engine you"
                  + " would take. No real person's data is used."
                : "설계 캡스톤을 해 본 기계공학 학부생을 지어내, 그 답을 실제 검사와 같은 엔진으로"
                  + " 돌린 결과입니다(STANDARD). 실제 응시자의 자료는 쓰지 않았습니다."}
            </span>
          </p>
          <div className="smpbar-a">
            <Link href={`/product${q}`} className="sf-btn ghost sm">
              {en ? "About" : "상품 소개"}
            </Link>
            <Link href={`/pricing${q}`} className="sf-btn accent sm">
              {PRODUCT.nav.pricing[L]}
            </Link>
          </div>
        </div>
      </div>
      <V3ResultBody sample={{
        model,
        lang,
        meta: {
          major: (lang === "en" ? c.name_en : c.name_ko) ?? null,
          school: null, department: null, specialization: null,
          specializationCode: null, universityCode: null, answeredOn: null,
        },
      }} />
      <PublicFooter lang={L} />
    </>
  );
}
