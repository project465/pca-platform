import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { openGrants, currentV2 } from "@/lib/me-v2/attempt";
import { productByCode } from "@/lib/catalog";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { startAttemptAction } from "./actions";

export const metadata = { title: `검사 시작 · ${BRAND.root}` };

/**
 * 응시를 열기 전에 묻는 것 둘.
 *
 * 학위 단계는 **묻는 장면**을 바꾸고 점수를 바꾸지 않는다. 목표 국가는
 * 글로벌 상품에서만 묻는다: 한국 상품을 산 사람에게 나라를 물으면 아직
 * 자료가 없는 칸을 채우게 만드는 셈이다.
 */
export default async function AssessmentStart({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireUser();
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  /* 이미 보고 있던 응시가 있으면 거기로 돌려보낸다. 다시 시작시키지 않는다 */
  const open = await currentV2(user.id);
  if (open) redirect(`/assessment/${open.id}`);

  const grants = await openGrants(user.id);
  if (!grants.length) redirect("/pricing");

  const g = grants[0];
  const p = await productByCode(g.product_code);
  const isGlobal = p?.market === "GLOBAL";

  return (
    <div className="aswrap">
      <header className="astop">
        <span className="asbrand">{BRAND.root}</span>
        <span className="asmeta">{g.tier}</span>
      </header>
      <main className="asdone">
        <h1 className="asH1">{T("asStageTitle")}</h1>
        <p className="sf-sub">{T("asStageBody")}</p>

        <form action={startAttemptAction} className="asform">
          <input type="hidden" name="entitlement" value={g.entitlement_id} />
          <fieldset className="asq-opts" style={{ marginTop: 20 }}>
            <legend className="sr-only">{T("asStageTitle")}</legend>
            {([["bachelor", T("asStageBachelor")], ["master", T("asStageMaster")],
               ["phd", T("asStagePhd")], ["postdoc", T("asStagePostdoc")]] as const)
              .map(([v, label], i) => (
                <label key={v}>
                  <input type="radio" name="stage" value={v} defaultChecked={i === 0} />
                  <span>{label}</span>
                </label>
              ))}
          </fieldset>

          {isGlobal ? (
            <div style={{ marginTop: 28 }}>
              <h2 className="sf-h2">{T("asTargetTitle")}</h2>
              <p className="sf-sub" style={{ fontSize: 13.5 }}>{T("asTargetBody")}</p>
              <select name="target" className="sf-select" defaultValue="NONE"
                style={{ marginTop: 12 }}>
                <option value="NONE">{T("asTargetSkip")}</option>
                <option value="US">United States</option>
                <option value="DE">Germany</option>
                <option value="JP">Japan</option>
                <option value="KR">Korea</option>
              </select>
            </div>
          ) : null}

          <div style={{ marginTop: 32, display: "flex", gap: 10 }}>
            <button type="submit" className="sf-btn accent">{T("asStart")}</button>
            <Link href="/my" className="sf-btn ghost">{T("navHome")}</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
