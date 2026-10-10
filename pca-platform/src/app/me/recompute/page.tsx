import Link from "next/link";
import { requireUser } from "@/lib/session";
import { previewRecompute, type Candidate } from "@/lib/me-v3/recompute";
import { axisLabel, domainName } from "@/lib/me-v3/runtime/session";
import { experiencesOf, latestResult } from "@/lib/me-v3/platform";
import { actionKo, gapKo } from "@/lib/me-v3/result/text.ko";
import {
  NO_CHANGE_KO, noChangeWhy, raisedKo, zoneMovedKo,
} from "@/lib/me-v3/change-text.ko";
import { CmShell, CmHead } from "../shell";
import ApplyButton from "./apply";
import { runRecompute } from "./actions";

export const metadata = { title: "저장한 경험 · 내 CareerMatri" };

const STATE_KO: Record<string, string> = {
  NOT_OBSERVED: "아직 없음",
  PARTICIPATED: "받아서 수행",
  CONFIRMED: "직접 수행",
  OWNED: "직접 결정",
};

/** `문제로 잡은 것` 처럼 그 축이 묻는 자리의 말. **축 코드를 적지 않는다** */
const AXIS_SLOT_KO: Record<string, string> = {
  J1: "문제로 잡은 것", J2: "받은 요구를 읽은 것", J3: "직접 정한 것",
  J4: "쓴 방법", J5: "남긴 것", J6: "비교해 확인한 것",
  J7: "어긋났을 때 고친 것", J8: "쓰인 곳",
};

/**
 * 저장한 경험이 어디로 가는지.
 *
 * **저장과 반영은 다른 일이다**(규격 §6). 저장하는 순간 자동으로 돌리지
 * 않는 까닭이 둘이다: 계산이 깨진 날 저장까지 막히지 않게 하려는 것이
 * 하나이고, 무엇이 달라지는지 먼저 보고 누르게 하려는 것이 둘이다.
 * 그래서 이 화면이 사이에 선다. **그 구조를 이번 회차에서 바꾸지
 * 않았다.**
 *
 * **다섯을 차례로 적는다**(규격 §5): 저장됐다 · 이번 경험에서 새로
 * 연결된 것 · 현재 상태에서 달라지는 것 · 다음 행동 · 그래서 어디로.
 * 전에는 머리에 숫자 카드 셋(`올라가는 판단 2개` 같은)과 여섯 칸짜리
 * 표가 먼저 섰고, **적은 사람이 묻는 것에 그 수가 답하지 않았다.**
 *
 * **달라지는 것이 없으면 그 사실과 까닭을 적는다**(규격 §13). `경험이
 * 추가되었습니다` 로 끝내면 적은 사람이 자기 기록이 버려진 줄 안다.
 *
 * **굳은 결과를 고치지 않는다.** 그때 낸 결과지는 그대로 열리고, 여기서
 * 바뀌는 것은 지금 값과 할 일뿐이다.
 */
export default async function Recompute(
  { searchParams }: { searchParams: Promise<{ new?: string; e?: string }> },
) {
  const user = await requireUser();
  const sp = await searchParams;
  /* 방금 저장하고 온 사람인가. 번호가 있으면 **이번 경험**으로 좁혀 적고,
     없으면(띠에서 바로 들어온 사람) 쌓인 것 전부를 적는다 */
  const newId = sp.new ?? "";
  /* 반영을 눌렀는데 계산이 안 된 사람인가(규격 §19) */
  const failed = sp.e === "recompute";
  const [plan, exps, model] = await Promise.all([
    previewRecompute(user.id), experiencesOf(user.id), latestResult(user.id),
  ]);
  const fresh = newId ? exps.find((e) => e.id === newId) ?? null : null;

  /* 이번 경험이 만든 자리만. **쌓인 것과 섞지 않는다**: 섞으면 어제 적은
     경험이 올린 자리를 오늘 적은 것이 올린 줄로 읽는다 */
  const mine: Candidate[] = fresh
    ? plan.candidates.filter((c) => c.from.some((f) => f.id === fresh.id))
    : plan.candidates;
  const mineMoved = mine.filter((c) => c.moved);

  /* 달라지는 것. 문장은 **세 화면이 같이 쓰는 자리**가 든다(규격 §12) */
  const changes = [
    ...plan.zone_moves.map((z) => zoneMovedKo(z, domainName(z.domain))),
    ...mineMoved.map((c) =>
      raisedKo({ domain: c.domain, axis: c.axis, state: c.after }, domainName(c.domain))),
  ];
  const why = noChangeWhy({
    candidates: mine.length,
    alreadyHigh: mine.filter((c) => !c.moved).length,
  });

  /* 다음 행동 하나. **메워질 자리의 할 일은 내지 않는다**: 반영하면
     닫히는 일을 다음 할 일로 적으면 그 자리에서 루프가 끊긴다 */
  const closed = new Set(plan.closed_gaps.map((g) => `${g.domain}.${g.axis ?? ""}`));
  const nextGap = (model?.gaps ?? [])
    .find((g) => !closed.has(`${g.domain}.${g.axis ?? ""}`)) ?? null;
  const nextAction = (model?.actions ?? [])
    .find((a) => !closed.has(`${a.domain ?? ""}.${a.axis ?? ""}`)) ?? null;

  return (
    <CmShell active="/me/experience" title="저장한 경험">
      <CmHead
        kicker="경험 저장"
        /* 상태 말은 제품 전체가 같은 마디를 쓴다(규격 §21) */
        title={fresh ? "경험을 저장했습니다" : "적어 두신 경험이 어디로 가는지"}
        lead={fresh
          ? `${fresh.title} · 아래를 보시고 더하시면 현재 상태에 들어갑니다.`
          : "저장한 경험이 어느 판단으로 가는지 묶어 현재 상태와 맞춰 봤습니다."}
      />

      {/* **저장 실패와 반영 실패를 가른다**(규격 §19). 여기 선 사람의
          경험은 이미 저장돼 있다. `경험을 저장하지 못했습니다` 로 적으면
          그 사람이 처음부터 다시 적고, 그러면 같은 기록이 두 벌 쌓인다 */}
      {failed ? (
        <p className="cm-fail" role="alert">
          경험은 저장했지만 현재 상태를 갱신하지 못했습니다. 적어 주신
          기록은 그대로 있으니 다시 적지 않으셔도 됩니다. 아래에서
          `다시 시도` 를 눌러 주세요.
        </p>
      ) : null}

      {!plan.base_attempt_id ? (
        <div className="cm-soon">
          <b>아직 바탕이 될 결과가 없습니다.</b> 경험은 저장됐습니다. 검사를
          한 번 끝내면 그 결과 위에 이 기록이 쌓입니다.
          <p style={{ marginTop: 10 }}>
            <Link href="/cores">검사 시작하기</Link>
          </p>
        </div>
      ) : (
        <>
          {/* ── 1. 이번 경험에서 새로 연결된 것 ──
              **`경험이 추가되었습니다` 로 적지 않는다**(규격 §12). 적은
              사람이 알고 싶은 것은 그 기록이 어느 자리에 붙었는가다 */}
          <h2 className="cm-sect">이번 경험에서 새로 연결된 것</h2>
          <div className="cm-panel">
            {mine.length ? (
              <div className="cm-pane">
                <div className="cm-rows">
                  {mine.map((c) => (
                    <p className="cm-row" key={`${c.domain}.${c.axis}`}>
                      <b>{domainName(c.domain)} · {AXIS_SLOT_KO[c.axis] ?? axisLabel(c.axis)}</b>
                      <span>경험 근거 {c.picks.length}개</span>
                    </p>
                  ))}
                </div>
                <p className="cm-none">
                  고르신 항목이 그 영역의 그 자리로 들어갑니다. 같은 자리에서
                  고른 항목이 둘이 되면 그때 직접 수행으로 올라갑니다.
                </p>
              </div>
            ) : (
              <div className="cm-pane">
                <h3>아직 어느 판단으로도 가지 않았습니다</h3>
                <p>{NO_CHANGE_KO.NO_DOMAIN_PICK.why}</p>
                <div className="cm-acts">
                  <Link className="cm-btn" href="/me/experience">경험 기록 보기</Link>
                </div>
              </div>
            )}
          </div>

          {/* ── 2. 현재 상태에서 달라지는 것 ──
              **점수처럼 적지 않는다**(규격 §8). `+1점` 도 `2 → 3` 도
              쓰지 않고, 올라간 자리를 **그 축이 무엇을 묻는 자리인지**로
              적는다. 상세한 전후는 아래 접힌 표가 든다 */}
          <h2 className="cm-sect">현재 상태에서 달라지는 것</h2>
          <div className="cm-panel">
            <div className="cm-pane">
              {changes.length ? (
                <div className="cm-rows">
                  {changes.map((line) => (
                    <p className="cm-row" key={line}><b>{line}</b></p>
                  ))}
                </div>
              ) : (
                <>
                  <h3>{NO_CHANGE_KO[why].title}</h3>
                  <p>{NO_CHANGE_KO[why].why}</p>
                </>
              )}
              {plan.closed_gaps.length ? (
                <p className="cm-none">
                  부족했던 부분 {plan.closed_gaps.length}곳이 메워집니다 ·{" "}
                  {plan.closed_gaps
                    .map((g) => domainName(g.domain)).join(" · ")}
                </p>
              ) : null}
              <p className="cm-none">
                검사 당시 결과는 그대로 남습니다. 응시하신 시점의 문항과 기준으로
                굳어 있어 경험을 더해도 그 줄은 달라지지 않습니다.
              </p>
            </div>
          </div>

          {/* ── 3. 다음 행동 하나 ──
              **여러 개를 세우지 않는다**(규격 §10). 반영한 뒤에 할 일은
              `지금 할 일` 쪽이 전부 든다 */}
          <h2 className="cm-sect">그다음에 할 일</h2>
          <div className="cm-panel">
            <div className="cm-pane">
              {nextAction ? (
                <>
                  <p>
                    {actionKo(
                      nextAction,
                      nextAction.domain ? domainName(nextAction.domain) : "",
                      model?.stage,
                    ).do}
                  </p>
                  {nextGap ? (
                    <p className="cm-none">
                      {gapKo(nextGap, domainName(nextGap.domain)).title} 자리를 메우는 일입니다.
                    </p>
                  ) : null}
                </>
              ) : (
                <p>
                  지금 부족한 부분 가운데 다음으로 할 일이 잡히지 않았습니다.
                  남은 일은 가진 근거를 지원서에서 설명할 문장으로 만드는
                  것입니다.
                </p>
              )}
            </div>
          </div>

          {/* ── 4. 어디로 가는가 ──
              **짙은 단추는 하나다**(규격 §10). 그리고 **`보기` 라고 적지
              않는다**: 이 단추가 하는 일은 지금 값에 적는 것이고, 말이
              약속하지 않은 일을 하는 단추는 막다른 길보다 나쁘다 */}
          <div className="cm-acts" style={{ marginTop: 20 }}>
            {plan.empty ? (
              <Link className="cm-btn is-primary" href="/me/state">현재 상태 보기</Link>
            ) : (
              <form action={runRecompute}>
                <ApplyButton retry={failed} />
              </form>
            )}
            <Link className="cm-btn" href="/me/experience">경험 기록으로 돌아가기</Link>
          </div>

          {/* ── 상세는 눌러서 ──
              되짚을 사람에게만 필요한 표다. 늘 펼쳐 두면 이 화면에서 가장
              큰 덩이가 되고, 적은 사람이 묻는 넷이 그 아래로 밀린다 */}
          {plan.candidates.length ? (
            <details className="cm-fold">
              <summary>어느 경험이 어느 판단으로 갔는지 보기</summary>
              <div className="cm-tablewrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>기술영역</th><th>판단</th><th>지금</th><th>더하면</th>
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
              <p className="cm-none" style={{ marginTop: 10 }}>
                경험으로 올라갈 수 있는 가장 높은 자리는 직접 수행까지입니다.
                직접 결정은 검사에서만 섭니다.
              </p>
            </details>
          ) : null}
        </>
      )}
    </CmShell>
  );
}
