import { notFound, redirect } from "next/navigation";
import { BrandMark } from "@/components/sf/brand-mark";
import { Icon } from "@/components/sf/icon";
import { currentUser, requireUser } from "@/lib/session";
import { attemptOf, latestResult } from "@/lib/me-v3/runtime/session";
import { tierText } from "../../tier-text.i18n";
import { phrase } from "@/lib/me-v3/phrase";

/* 탭 제목도 그 응시의 언어다 */
export async function generateMetadata(
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  const u = await currentUser();
  const a = u ? await attemptOf(attemptId, u.id).catch(() => null) : null;
  return { title: phrase(a?.locale)("검사 완료 · CareerMatri") };
}

/**
 * 제출과 결과지 사이의 한 쪽.
 *
 * **결과지가 아니다.** 여기서 판정을 새로 하지도, 결과 모델을 읽어 값을
 * 적지도 않는다. 적는 것은 셋이다: 끝났다는 것 · 결과에 무엇이 들어
 * 있는가 · 다음에 누를 자리 하나.
 *
 * 전에는 제출이 끝나는 순간 결과지로 바로 보냈다. 그래서 백여 문항을 푼
 * 사람이 `다음` 을 누른 자리에서 곧바로 긴 결과지를 만났고, **끝났다는
 * 말을 어디에서도 듣지 못했다.**
 *
 * **결과가 만들어졌는지 먼저 본다.** 스냅샷이 없으면 그 사실을 적고 나갈
 * 길 둘을 준다. 안쪽 사정과 되짚을 번호는 적지 않는다.
 */

/** 결과지에 실제로 서는 세 자리. 여기서 값을 만들지 않는다(글은 `t()` 를 지난다) */
const PREVIEW: [string, string][] = [
  ["현재 확인된 영역", "지금 설명할 수 있는 기술과 경험"],
  ["먼저 보완할 부분", "근거가 부족하거나 아직 설명하기 어려운 영역"],
  ["다음 행동", "지금부터 준비하면 좋은 한 가지"],
];

export default async function V3Done({
  params,
}: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  const { attemptId } = await params;

  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();
  /* 아직 제출하지 않았으면 풀던 자리로 돌려보낸다 */
  if (a.status === "in_progress") redirect(`/v3/${attemptId}`);

  /* 응시 언어. 글만 고른다 */
  const lang = a.locale ?? "ko";
  const say = phrase(lang);
  const t = tierText(lang).TIER_WHAT[a.tier];
  const made = (await latestResult(attemptId)) !== null;

  return (
    <div className="qs is-calm">
      <header className="qs-head">
        <div className="qs-head-in">
          <div className="qs-top" style={{ paddingBottom: 14 }}>
            <span className="qs-brand"><BrandMark size={20} />CareerMatri</span>
            <span className="qs-tier">{a.tier} · <b>{t.label}</b></span>
          </div>
        </div>
      </header>

      <main className="qs-intro">
        {made ? (
          <>
            <span className="qs-done-ic" aria-hidden><Icon name="check" size={26} /></span>
            <h1 className="qs-h1">{say("검사가 완료되었습니다")}</h1>
            <p className="qs-lead">
              {say("답하신 내용에서 지금 설명할 수 있는 영역과 앞으로 보완할 부분을 정리했습니다.")}
            </p>

            <div className="qs-sect">
              <h2>{say("결과에서 확인할 수 있는 것")}</h2>
              <ul className="qs-summary">
                {PREVIEW.map(([label, note]) => (
                  <li key={label}>
                    <span>{say(label)}</span>
                    <b className="is-note">{say(note)}</b>
                  </li>
                ))}
              </ul>
            </div>

            <div className="qs-start-nav">
              <a className="qs-btn qs-btn-main qs-btn-go"
                href={`/v3/${attemptId}/result`}>{say("결과 보기 →")}</a>
              {/* 작업공간(`/me`)은 아직 한국어뿐이라 영어 응시에는 세우지 않는다 */}
              {lang === "ko"
                ? <a className="qs-btn qs-btn-ghost" href="/me">{say("내 CareerMatri로 이동")}</a>
                : null}
            </div>

            <p className="qs-fine">
              {lang === "ko"
                ? say("지금 받은 결과는 그대로 보관됩니다. 나중에 경험을 더 넣으시면 ‘현재 상태’만 새로 정리됩니다.")
                : say("지금 받은 결과는 그대로 보관됩니다.")}
            </p>
          </>
        ) : (
          <>
            <h1 className="qs-h1">{say("결과를 불러오지 못했습니다")}</h1>
            <p className="qs-lead">
              {say("응답은 그대로 저장되어 있습니다. 잠시 뒤에 다시 확인해주세요.")}
            </p>
            <div className="qs-start-nav">
              <a className="qs-btn qs-btn-main qs-btn-go"
                href={`/v3/${attemptId}/done`}>{say("다시 확인하기")}</a>
              <a className="qs-btn qs-btn-ghost" href="/me">{say("홈으로 돌아가기")}</a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
