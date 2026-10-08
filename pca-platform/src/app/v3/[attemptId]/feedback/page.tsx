import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { attemptOf } from "@/lib/me-v3/runtime/session";
import { feedbackItems, feedbackOf, participantOf } from "@/lib/me-v3/pilot/store";
import { submitFeedback } from "./actions";
import "../../result.css";

export const metadata = { title: "파일럿 의견 · CareerMatri" };

/** 1 에서 5 까지. **양 끝에만 말을 붙인다** — 가운데를 설명하면 답이 쏠린다 */
const SCALE = [
  [1, "전혀 아니다"], [2, ""], [3, ""], [4, ""], [5, "매우 그렇다"],
] as const;

/**
 * 파일럿 의견 여덟 가지.
 *
 * **결과지를 설문으로 막지 않는다.** 결과를 먼저 보여 주고 여기로 오는
 * 길만 둔다. 답하지 않아도 잃는 것이 없고, 빈칸으로 두신 문항은 그대로
 * 빈칸으로 센다.
 *
 * 묻는 것은 넷이다 — 문항 · 결과 · 상품 · 화면. 만족도 하나로 줄이면
 * 무엇을 고쳐야 할지 알 수 없다.
 */
export default async function Feedback({
  params, searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  const sp = await searchParams;

  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();
  /* 끝내지 않은 응시로는 답할 수 없다. 묻는 것이 결과를 읽은 뒤의 일이다 */
  if (a.status === "in_progress") notFound();
  const p = await participantOf(user.id);
  if (!p) notFound();

  const items = await feedbackItems(a.tier);
  const mine = await feedbackOf(attemptId);
  const done = Object.keys(mine).length;

  return (
    <div className="rs">
      <header className="rs-head">
        <div className="rs-head-in">
          <span className="rs-brand">CareerMatri</span>
          <span className="rs-tier">파일럿 · {p.code}</span>
          <nav><Link href={`/v3/${attemptId}/result`}>결과로 돌아가기</Link></nav>
        </div>
      </header>
      <main className="rs-main" style={{ maxWidth: 760 }}>
        <section className="rs-hero">
          <p className="rs-kicker">파일럿 의견</p>
          <h1 className="rs-h1">여덟 가지만 여쭙습니다</h1>
          <p className="rs-lead">
            검사와 결과지를 고치는 데만 씁니다. 답하기 어려운 문항은 비워
            두셔도 됩니다.
          </p>
        </section>

        {sp.ok ? <p className="rs-flag">보내주셔서 고맙습니다. 고쳐 적으셔도 됩니다.</p> : null}
        {!sp.ok && done ? (
          <p className="rs-flag">{done}개를 이미 적어주셨습니다. 고쳐 적으셔도 됩니다.</p>
        ) : null}

        <section className="rs-sect">
          <form action={submitFeedback} className="rs-fb">
            <input type="hidden" name="attemptId" value={attemptId} />
            {items.map((it, i) => (
              <fieldset key={it.code}>
                <legend><b>{i + 1}</b>{it.ko}</legend>
                {it.hint ? <p className="rs-note">{it.hint}</p> : null}
                {it.kind === "scale" ? (
                  <div className="rs-scale">
                    {SCALE.map(([n, label]) => (
                      <label key={n}>
                        <input type="radio" name={it.code} value={n}
                          defaultChecked={mine[it.code]?.value === n} />
                        <span>{n}</span>
                        {label ? <i>{label}</i> : null}
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea name={it.code} rows={3} maxLength={500}
                    defaultValue={mine[it.code]?.text ?? ""} />
                )}
              </fieldset>
            ))}
            <button type="submit" className="rs-go">보내기</button>
          </form>
        </section>

        <div className="rs-fine">
          <p>
            적어주신 글은 {p.purge_after} 에 지웁니다. 운영 화면에는 참가자
            이름 {p.code} 로만 나갑니다.
          </p>
          <p><Link href={`/v3/${attemptId}/result`}>결과로 돌아가기</Link></p>
        </div>
      </main>
    </div>
  );
}
