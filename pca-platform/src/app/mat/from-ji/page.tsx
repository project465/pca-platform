import { sellableCores } from "@/lib/me-v3/core-registry";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { jiPostFromCookie } from "@/lib/attribution";
import { matAccess } from "@/lib/mat-access";
import { moneyText } from "@/lib/mat/money-text";
import { matLang } from "@/lib/mat/lang";
import { TITLE_TEXT } from "../mat-text";
import { jiPosting } from "@/lib/mat/ji-posting";
import { matJiAnalyze } from "./actions";

export const generateMetadata = () => matTitle(TITLE_TEXT.fromJi);

/**
 * 잡인더스트리 공고 입구의 도착 자리(`/from/jobindustry?board=…&idx=…` 다음).
 *
 * **여는 것만으로 분석하지 않는다.** 링크 미리보기 · 새로고침이 무료 1회를 쓰면 안 된다(`/me/track` 가져오기와
 * 같은 규칙). 단추를 누르면 그 공고를 분석하고 결과 아래에 결제 입구가 선다.
 */
export default async function FromJi() {
  const user = await requireUser();
  const lang = await matLang();
  const JI_TEXT = moneyText(lang).JI_TEXT;
  const post = await jiPostFromCookie();
  const [acc, row] = await Promise.all([matAccess(user.id), post ? jiPosting(post.idx) : Promise.resolve(null)]);
  const needCore = !acc.core && !(row?.core && sellableCores("KR").some((c) => c.code === row.core));
  return (
    <main>
      <div className="mt-top"><span className="mt-week">{JI_TEXT.kicker}</span></div>
      <h1 className="mt-h1">{row?.title ?? JI_TEXT.title}</h1>
      {post ? (
        <>
          <p className="mt-lead">{JI_TEXT.lead}</p>
          <form action={matJiAnalyze} className="mt-form">
            {/* **전공이 없고 공고에도 전공이 안 달렸으면 여기서 고른다**(2026-11-06 끝까지 점검: 가입 뒤 무료 분석을 누르면
                전공 고르기 화면으로 튕기고 그 공고 분석이 사라졌다). 고르면 같은 단추가 전공을 적고 그 공고를 분석한다 */}
            {needCore ? (
              <label className="mt-field">
                <span>{JI_TEXT.pickCore}</span>
                <select name="core" required defaultValue="">
                  <option value="" disabled>-</option>
                  {sellableCores("KR").map((c) => <option key={c.code} value={c.code}>{lang === "en" ? c.name_en ?? c.name_ko : c.name_ko}</option>)}
                </select>
              </label>
            ) : null}
            <button type="submit" className="mt-btn is-main is-block">
              {acc.paid ? JI_TEXT.go : acc.freeLeft > 0 ? JI_TEXT.goFree : JI_TEXT.goPay}
            </button>
          </form>
          <p className="mt-note"><a className="mt-link" href={post.url} target="_blank" rel="noopener noreferrer">{JI_TEXT.source}</a></p>
        </>
      ) : (
        <p className="mt-empty">{JI_TEXT.none} <Link href="/mat/jobs">{JI_TEXT.jobs}</Link></p>
      )}
    </main>
  );
}
