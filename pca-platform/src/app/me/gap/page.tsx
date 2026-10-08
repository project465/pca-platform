import Link from "next/link";
import { requireUser } from "@/lib/session";
import { actionsOf, latestResult } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { gapKo } from "@/lib/me-v3/result/text.ko";
import { CmShell, CmHead } from "../shell";
import { moveAction, pullActions } from "./actions";

export const metadata = { title: "Gap 관리 · 내 CareerMatri" };

/**
 * Gap 과 다음 행동.
 *
 * **빨간 목록으로 만들지 않는다.** 무엇이 비었는가 · 왜 그 자리가
 * 필요한가 · 다음에 무엇을 하면 되는가가 한 묶음이다. 비어 있는 자리만
 * 세면 읽는 사람은 자기가 못 한 것을 센 목록을 받는다.
 *
 * **할 일 문장을 여기서 짓지 않는다.** 결과지와 같은 함수(`actionKo`)를
 * 부른다: 두 곳에서 따로 적으면 어느 날 갈리고, 갈린 날 둘 다 못 믿는다.
 */
export default async function GapPage() {
  const user = await requireUser();
  const [result, actions] = await Promise.all([
    latestResult(user.id), actionsOf(user.id),
  ]);

  const gaps = result?.gaps ?? [];
  const open = actions.filter((a) => a.state !== "done");
  const done = actions.filter((a) => a.state === "done");

  return (
    <CmShell active="/me" title="Gap 관리">
      <CmHead
        kicker="Gap · 다음 행동"
        title="비어 있는 자리와 그것을 메우는 일"
        lead={result
          ? "무엇이 비었고 왜 그 자리가 필요하고 다음에 무엇을 하면 되는지를 한 줄로 둡니다."
          : "검사를 한 번 끝내면 이 자리에 비어 있는 축과 그것을 메우는 일이 섭니다."}
        actions={result ? (
          <form action={pullActions}>
            <button className="cm-btn is-primary" type="submit">결과에서 할 일 가져오기</button>
          </form>
        ) : (
          <Link className="cm-btn is-primary" href="/cores">검사 시작하기</Link>
        )}
      />

      {gaps.length ? (
        <>
          <h2 className="cm-h1" style={{ fontSize: 18, margin: "6px 0 12px" }}>
            먼저 채울 것
          </h2>
          <div className="cm-grid">
            {gaps.slice(0, 6).map((g) => {
              const k = gapKo(g, domainName(g.domain));
              return (
                <div className="cm-card" key={g.id}>
                  <h2>{k.title}</h2>
                  <p>{k.why}</p>
                  <p style={{ color: "var(--sf-ink-3)", fontSize: 13 }}>{k.detail}</p>
                </div>
              );
            })}
          </div>
        </>
      ) : result ? (
        <div className="cm-soon">
          <b>지금 비어 있는 자리가 잡히지 않았습니다.</b> 남은 일은 가진
          근거를 지원서와 면접에서 설명할 문장으로 만드는 것입니다.
        </div>
      ) : null}

      <h2 className="cm-h1" style={{ fontSize: 18, margin: "28px 0 12px" }}>
        할 일 <em style={{ fontSize: 13, fontWeight: 500, color: "var(--sf-ink-3)" }}>
          {open.length}개 남음</em>
      </h2>

      {actions.length === 0 ? (
        <div className="cm-soon">
          아직 옮겨 둔 할 일이 없습니다. 위에서 결과의 할 일을 가져오면
          이 자리에 섭니다.
        </div>
      ) : (
        <div className="cm-tablewrap">
          <table className="cm-table">
            <thead>
              <tr><th>할 일</th><th>영역</th><th>때</th><th>상태</th><th /></tr>
            </thead>
            <tbody>
              {[...open, ...done].map((a) => (
                <tr key={a.id}>
                  <td><b>{a.body}</b></td>
                  <td>{a.td_code ? domainName(a.td_code) : "—"}</td>
                  <td>{a.horizon}일 안</td>
                  <td>{a.state === "done" ? "끝냈습니다"
                    : a.state === "doing" ? "하는 중" : "아직"}</td>
                  <td>
                    <form action={moveAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="state"
                        value={a.state === "done" ? "open" : "done"} />
                      <button className="cm-btn" type="submit">
                        {a.state === "done" ? "되돌리기" : "끝냈습니다"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CmShell>
  );
}
