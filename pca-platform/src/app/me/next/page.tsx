import Link from "next/link";
import { requireUser } from "@/lib/session";
import { actionsOf, currentState } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { HORIZON_KO } from "@/lib/me-v3/result/text.ko";
import { CmShell, CmHead } from "../shell";
import { moveAction, pullActions } from "./actions";

export const metadata = { title: "다음 할 일 · CareerMatri" };

/**
 * 다음 할 일.
 *
 * **세 층을 그대로 둔다.** 지금 · 다음 과제에서 · 나중에. `30일 안` 은
 * 읽는 사람에게 마감으로 읽히는데 이 값은 마감이 아니라 **할 수 있는
 * 때**다. 지금 바로 할 수 있는 것과 맡는 일이 생겨야 하는 것은 준비가
 * 다르다.
 *
 * **비어 있는 자리는 여기 적지 않는다.** 그쪽은 `지금 상태` 가 맡는다.
 * 한 쪽에 두면 긴 목록 둘이 세로로 쌓이고, 읽는 사람이 묻는 것이 서로
 * 다르다: 상태는 `나는 지금 어디인가`, 할 일은 `무엇부터 하면 되는가`.
 */
const LANES = [
  ["NOW", "지금 할 일", "오늘 앉아서 시작할 수 있습니다"],
  ["NEXT", "다음 과제에서", "맡는 일이 생겨야 합니다"],
  ["LATER", "한 번 더 볼 것", "앞의 둘이 끝난 뒤입니다"],
] as const;

const lane = (days: number): "NOW" | "NEXT" | "LATER" =>
  (days <= 30 ? "NOW" : days <= 90 ? "NEXT" : "LATER");

export default async function Next() {
  const user = await requireUser();
  const [st, actions] = await Promise.all([currentState(user.id), actionsOf(user.id)]);
  const open = actions.filter((a) => a.state !== "done");
  const done = actions.filter((a) => a.state === "done");

  return (
    <CmShell active="/me/next" title="다음 할 일">
      <CmHead
        kicker="다음 할 일"
        title={open.length ? `지금 남은 일 ${open.length}가지` : "무엇부터 할지"}
        lead={st.model
          ? "급한 차례가 아니라 할 수 있는 때로 묶었습니다. 지금 앉아서 할 수 있는 것부터 섭니다."
          : "검사를 한 번 끝내면 결과가 낸 할 일을 여기로 가져올 수 있습니다."}
        actions={st.model ? (
          <>
            <form action={pullActions}>
              <button className="cm-btn is-primary" type="submit">
                결과에서 할 일 가져오기
              </button>
            </form>
            <Link className="cm-btn" href="/me/state#gaps">왜 필요한지 보기</Link>
          </>
        ) : (
          <Link className="cm-btn is-primary" href="/cores">기계공학 검사 시작</Link>
        )}
      />

      {!st.model ? (
        <div className="cm-soon">
          <b>아직 완료한 검사가 없습니다.</b> 할 일은 검사 결과의 비어 있는
          자리에서 나옵니다.
        </div>
      ) : actions.length === 0 ? (
        <div className="cm-soon">
          <b>아직 옮겨 둔 할 일이 없습니다.</b> 위에서 결과의 할 일을
          가져오면 세 층으로 나뉘어 섭니다.
        </div>
      ) : (
        <div className="cm-lanes">
          {LANES.map(([key, title, hint]) => {
            const mine = open.filter((a) => lane(a.horizon) === key);
            return (
              <section key={key}>
                <h3>{title}<small>{hint}</small></h3>
                {mine.length ? (
                  <ul>
                    {mine.map((a) => (
                      <li key={a.id}>
                        <span>{a.body}</span>
                        {a.td_code ? <em>{domainName(a.td_code)}</em> : null}
                        <form action={moveAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="state" value="done" />
                          <button className="cm-btn" type="submit">끝냈습니다</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : <p className="cm-none">여기에 올 일은 아직 없습니다</p>}
              </section>
            );
          })}
        </div>
      )}

      {done.length ? (
        <details className="cm-fold" style={{ marginTop: 22 }}>
          <summary>끝낸 일 {done.length}가지</summary>
          <div className="cm-rows">
            {done.map((a) => (
              <p className="cm-row" key={a.id}>
                <b>{a.body}</b>
                <form action={moveAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="state" value="open" />
                  <button className="cm-btn" type="submit">되돌리기</button>
                </form>
              </p>
            ))}
          </div>
        </details>
      ) : null}

      <p className="cm-lead" style={{ marginTop: 22 }}>
        {HORIZON_KO.NOW} 칸이 비어 있어도 괜찮습니다. 맡는 일이 생길 때
        하면 되는 것은 아래 칸에 둡니다.
      </p>
    </CmShell>
  );
}
