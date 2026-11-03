import Link from "next/link";
import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { jiPostFromCookie } from "@/lib/attribution";
import { matAccess } from "@/lib/mat-access";
import { JI_TEXT } from "@/lib/mat/money-text";
import { jiPosting } from "@/lib/mat/ji-posting";
import { matJiAnalyze } from "./actions";

export const generateMetadata = () => matTitle("잡인더스트리 공고");

/**
 * 잡인더스트리 공고 입구의 도착 자리(`/from/jobindustry?board=…&idx=…` 다음).
 *
 * **여는 것만으로 분석하지 않는다.** 링크 미리보기 · 새로고침이 무료 1회를 쓰면 안 된다(`/me/track` 가져오기와
 * 같은 규칙). 단추를 누르면 그 공고를 분석하고 결과 아래에 결제 입구가 선다.
 */
export default async function FromJi() {
  const user = await requireUser();
  const post = await jiPostFromCookie();
  const [acc, row] = await Promise.all([matAccess(user.id), post ? jiPosting(post.idx) : Promise.resolve(null)]);
  return (
    <main>
      <div className="mt-top"><span className="mt-week">{JI_TEXT.kicker}</span></div>
      <h1 className="mt-h1">{row?.title ?? JI_TEXT.title}</h1>
      {post ? (
        <>
          <p className="mt-lead">{JI_TEXT.lead}</p>
          <form action={matJiAnalyze}>
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
