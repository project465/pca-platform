import Link from "next/link";
import { requireUser } from "@/lib/session";
import { previewRecompute } from "@/lib/me-v3/recompute";
import { axisLabel, domainName } from "@/lib/me-v3/runtime/session";
import { CmShell, CmHead } from "../shell";
import { runRecompute } from "./actions";

export const metadata = { title: "새 경험 반영하기 · 내 CareerMatri" };

const STATE_KO: Record<string, string> = {
  NOT_OBSERVED: "아직 없음",
  PARTICIPATED: "받아서 수행",
  CONFIRMED: "직접 수행",
  OWNED: "직접 결정",
};
const ZONE_KO: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "근거가 선 영역",
  Z2_EVIDENCE_INCOMPLETE: "근거를 더 만들 영역",
  Z3_EVIDENCE_LOW_INTEREST: "근거는 있고 관심이 낮은 영역",
  Z4_INSUFFICIENT_EVIDENCE: "아직 판단하기 어려운 영역",
  NOT_EXPLORED: "이번에 보지 않은 영역",
};

/**
 * 새 경험 반영하기.
 *
 * **이름에 `재분석` 을 쓰지 않는다.** 그 말은 우리가 무엇을 다시 계산하는
 * 가를 가리키는데, 누르는 사람이 하는 일은 적어 둔 경험을 지금 상태에
 * 반영하는 것이다. 안쪽 이름이 단추에 그대로 나가면 읽는 사람이 무엇이
 * 달라지는지 짐작해야 한다.
 *
 * **무엇이 달라지는지 먼저 보여 준다.** 저장한 경험이 숫자만 바꿔 놓으면
 * 읽는 사람이 자기 기록과 결과를 잇지 못한다. 어느 경험이 어느 축으로
 * 갔고 그래서 묶음이 어떻게 달라지는지를 줄로 적고, 누르면 지금 값에
 * 적는다.
 *
 * **굳은 결과를 고치지 않는다.** 그때 낸 결과지는 그대로 열리고, 여기서
 * 바뀌는 것은 지금 값과 할 일뿐이다.
 */
export default async function Recompute() {
  const user = await requireUser();
  const plan = await previewRecompute(user.id);

  return (
    <CmShell active="/me/experience" title="새 경험 반영하기">
      <CmHead
        kicker="새 경험 반영하기"
        title="적어 두신 경험이 어디로 가는지"
        lead={"저장한 경험을 판단축으로 묶어 지금 값과 비교했습니다. "
          + "그때 낸 결과지는 그대로 남고, 여기서는 지금 값만 달라집니다."}
        actions={plan.base_attempt_id && !plan.empty ? (
          <form action={runRecompute}>
            <button className="cm-btn is-primary" type="submit">지금 값에 반영하기</button>
          </form>
        ) : null}
      />

      {!plan.base_attempt_id ? (
        <div className="cm-soon">
          <b>아직 바탕이 될 결과가 없습니다.</b> 검사를 한 번 끝내면 그 결과
          위에 경험을 쌓습니다.
          <p style={{ marginTop: 10 }}>
            <Link href="/cores">검사 시작하기</Link>
          </p>
        </div>
      ) : plan.empty ? (
        <div className="cm-soon">
          <b>다시 계산할 거리가 아직 없습니다.</b> 경험을 적을 때 기술영역과
          그 영역의 항목을 함께 고르면 그 자리가 판단축으로 들어갑니다.
          <p style={{ marginTop: 10 }}>
            <Link href="/me/experience/new">새 경험 추가</Link>
          </p>
        </div>
      ) : (
        <>
          <div className="cm-grid" style={{ marginBottom: 18 }}>
            <div className="cm-card">
              <h2>올라가는 판단축 <em>{plan.moved.length}개</em></h2>
              <p className="cm-num">{plan.moved.length}<small>개 축이 올라갑니다</small></p>
              <p>
                경험으로 올라갈 수 있는 가장 높은 자리는 <b>직접 수행</b>까지입니다.
                <b> 직접 결정</b>은 검사에서만 섭니다.
              </p>
            </div>
            <div className="cm-card">
              <h2>달라지는 묶음 <em>{plan.zone_moves.length}개</em></h2>
              {plan.zone_moves.length ? (
                <div className="cm-rows">
                  {plan.zone_moves.map((z) => (
                    <p className="cm-row" key={z.domain}>
                      <b>{domainName(z.domain)}</b>
                      <span>{ZONE_KO[z.before] ?? z.before} → {ZONE_KO[z.after] ?? z.after}</span>
                    </p>
                  ))}
                </div>
              ) : <p>묶음은 그대로입니다. 축만 올라갑니다.</p>}
            </div>
            <div className="cm-card">
              <h2>메워지는 자리 <em>{plan.closed_gaps.length}개</em></h2>
              {plan.closed_gaps.length ? (
                <div className="cm-chips">
                  {plan.closed_gaps.map((g) => (
                    <span className="cm-chip is-on" key={g.id}>
                      {domainName(g.domain)}{g.axis ? ` · ${axisLabel(g.axis)}` : ""}
                    </span>
                  ))}
                </div>
              ) : <p>지금 비어 있는 자리 가운데 메워지는 것은 없습니다.</p>}
            </div>
          </div>

          <h2 className="cm-h1" style={{ fontSize: 18, margin: "8px 0 12px" }}>
            어느 경험이 어느 판단으로 갔는지
          </h2>
          <div className="cm-tablewrap">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>기술영역</th><th>판단</th><th>지금</th><th>반영하면</th>
                  <th>고르신 항목</th><th>어느 경험에서</th>
                </tr>
              </thead>
              <tbody>
                {plan.candidates.map((c) => (
                  <tr key={`${c.domain}.${c.axis}`}>
                    <td><b>{domainName(c.domain)}</b></td>
                    <td>{axisLabel(c.axis)}</td>
                    <td>{STATE_KO[c.before] ?? c.before}</td>
                    <td>
                      {c.moved
                        ? <b>{STATE_KO[c.after] ?? c.after}</b>
                        : <span>그대로</span>}
                    </td>
                    <td>{c.picks.slice(0, 2).join(" · ")}
                      {c.picks.length > 2 ? ` 외 ${c.picks.length - 2}` : ""}</td>
                    <td>{[...new Set(c.from.map((f) => f.title))].join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cm-soon" style={{ marginTop: 18 }}>
            <b>그때 낸 결과지는 달라지지 않습니다.</b> 응시하신 시점의 문항과
            평가 기준으로 굳어 있고, 여기서 바뀌는 것은 내 CareerMatri의 지금
            값과 할 일입니다.
          </div>
        </>
      )}
    </CmShell>
  );
}
