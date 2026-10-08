import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { attemptOf, domainName, latestResult } from "@/lib/me-v3/runtime/session";
import { actionKo } from "@/lib/me-v3/result/text.ko";
import type { Action } from "@/lib/me-v3/result/model";
import {
  feedbackItems, feedbackOf, participantOf, TOPIC_KO, TOPIC_ORDER,
  type Choice, type FeedbackItem,
} from "@/lib/me-v3/pilot/store";
import { mark } from "@/lib/me-v3/pilot/funnel";
import { submitFeedback } from "./actions";
import "../../result.css";
import "../../pilot.css";

export const metadata = { title: "파일럿 의견 · CareerMatri" };
export const dynamic = "force-dynamic";

/** 1 에서 5 까지. **양 끝에만 말을 붙인다** — 가운데를 설명하면 답이 쏠린다 */
const SCALE = [
  [1, "전혀 아니다"], [2, ""], [3, ""], [4, ""], [5, "매우 그렇다"],
] as const;

/** 고른 할 일의 보기. 결과지에 실제로 적혀 있던 문장을 그대로 쓴다 */
function actionChoices(actions: Action[], stage: string): Choice[] {
  return actions.slice(0, 8).map((a) => ({
    value: a.id,
    label: actionKo(a, a.domain ? domainName(a.domain) : "", stage as never).do,
  }));
}

/**
 * 파일럿 의견.
 *
 * **결과를 인질로 잡지 않는다.** 묻는 자리는 결과를 한 번 본 뒤이고, 답하지
 * 않아도 결과는 그대로 열려 있다. 결과 앞에 세우면 아직 보지 않은 것에 대한
 * 답을 받게 되고, 그 답은 없는 것만 못하다.
 *
 * **묶음으로 나눠 묻는다.** 문항 · 결과 · 화면 · 상품 · 값 다섯이고, 만족도
 * 하나로 줄이면 무엇을 고쳐야 할지 알 수 없다. 평균 하나로 합치지도 않는다.
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

  /* **결과를 한 번 본 뒤에만 묻는다.** 결과 화면이 그 발자국을 남긴다 */
  const seen = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_pilot_events
      WHERE attempt_id = $1 AND kind = 'result_open'`, [attemptId]);
  if (!Number(seen?.n ?? 0)) redirect(`/v3/${attemptId}/result`);

  const m = await latestResult(attemptId);
  const items = await feedbackItems(a.tier);
  const mine = await feedbackOf(attemptId);
  const done = Object.keys(mine).length;

  await mark("feedback_started", {
    userId: user.id, attemptId, participant: p.code, wave: p.wave, tier: a.tier,
  });

  /* 고를 것이 없는 문항은 세우지 않는다. 결과지에 할 일이 없는 응시가 있다 */
  const acts = m ? actionChoices(m.actions, m.stage) : [];
  const live = items.filter((it) => it.kind !== "action" || acts.length > 0);

  const groups = TOPIC_ORDER
    .map((t) => ({ topic: t, list: live.filter((it) => it.topic === t) }))
    .filter((g) => g.list.length > 0);

  const choicesOf = (it: FeedbackItem): Choice[] =>
    it.kind === "action" ? acts : (it.choices ?? []);

  let n = 0;

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
          <h1 className="rs-h1">읽어 보신 것을 여쭙습니다</h1>
          <p className="rs-lead">
            검사와 결과지를 고치는 데만 씁니다. 답하기 어려운 문항은 비워
            두셔도 되고, 비워 두셔도 결과는 그대로 보실 수 있습니다.
          </p>
        </section>

        {sp.ok ? <p className="rs-flag">보내주셔서 고맙습니다. 고쳐 적으셔도 됩니다.</p> : null}
        {!sp.ok && done ? (
          <p className="rs-flag">{done}개를 이미 적어주셨습니다. 고쳐 적으셔도 됩니다.</p>
        ) : null}

        <section className="rs-sect">
          <form action={submitFeedback} className="rs-fb">
            <input type="hidden" name="attemptId" value={attemptId} />
            {groups.map((g) => (
              <div key={g.topic} className="rs-fbg">
                <h3>{TOPIC_KO[g.topic] ?? g.topic}</h3>
                {g.list.map((it) => {
                  n += 1;
                  const picked = mine[it.code];
                  return (
                    <fieldset key={it.code}>
                      <legend><b>{n}</b>{it.ko}</legend>
                      {it.hint ? <p className="rs-note">{it.hint}</p> : null}
                      {it.kind === "scale" ? (
                        <div className="rs-scale">
                          {SCALE.map(([v, label]) => (
                            <label key={v}>
                              <input type="radio" name={it.code} value={v}
                                defaultChecked={picked?.value === v} />
                              <span>{v}</span>
                              {label ? <i>{label}</i> : null}
                            </label>
                          ))}
                        </div>
                      ) : it.kind === "text" ? (
                        <textarea name={it.code} rows={3} maxLength={500}
                          defaultValue={picked?.text ?? ""} />
                      ) : (
                        <div className="rs-pick">
                          {choicesOf(it).map((c) => (
                            <label key={c.value}>
                              <input type="radio" name={it.code} value={c.value}
                                defaultChecked={picked?.choice === c.value} />
                              <span />
                              <b>{c.label}</b>
                            </label>
                          ))}
                        </div>
                      )}
                    </fieldset>
                  );
                })}
              </div>
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
