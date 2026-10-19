import Link from "next/link";
import { requireUser } from "@/lib/session";
import { activeMajorName } from "@/lib/me-v3/major-name";
import {
  EXPERIENCE_KINDS, experiencesOf, reflectedExperiences, activeCoreOrPick } from "@/lib/me-v3/platform";
import { experienceFlow } from "@/lib/me-v3/student";
import { recomputeStatus } from "@/lib/me-v3/recompute";
import { domainName } from "@/lib/me-v3/runtime/session";
import { CmShell, CmHead } from "../shell";
import { EmptyState } from "../ui";
import { dropExperience } from "./actions";

export const metadata = { title: "경험 · 내 CareerMatri" };

const KIND = new Map(EXPERIENCE_KINDS.map((k) => [k.code as string, k.label]));

/**
 * 적어 둔 경험.
 *
 * **한 줄에 다섯만 적는다**(규격 §14): 제목 · 유형 · 날짜 · 연결된
 * 기술영역 · 현재 상태에 반영됐는지. 전에는 한 줄이 아홉 칸이었고 그중
 * 다섯이 `문제 3개` · `직접 정한 것 2개` 같은 **개수**였다. 개수는 훑는
 * 사람에게 아무 말도 하지 않는다: 자기가 적은 것이 무엇이었는지는 세
 * 개인지가 아니라 어떤 항목이었는지로 알아본다. 그래서 고른 항목은
 * 눌러서 펼친다.
 *
 * **`반영됨` 을 경험 줄에 따로 저장하지 않는다.** 그 사실은 반영하는
 * 자리가 이미 `career_events` 에 적고 있고, 두 곳에 두면 어느 날 한 쪽만
 * 고쳐진다.
 */
export default async function Experiences() {
  const user = await requireUser();
  const major = await activeMajorName(user.id);
  /* 어느 전공의 사전을 읽을지는 **그 사람의 자료**가 정한다 */
  const core = await activeCoreOrPick(user.id);
  /* 영역을 부르는 말은 그 Core 의 사전이 든다(R30) */
  const flow = experienceFlow(core);
  const [rows, st, done] = await Promise.all([
    experiencesOf(user.id), recomputeStatus(user.id), reflectedExperiences(user.id),
  ]);

  return (
    <CmShell active="/me/experience" title="경험" major={major}
      bar={<Link className="cm-btn is-primary" href="/me/experience/new">새 경험 추가</Link>}>
      <CmHead
        title="경험"
        lead="적어 둔 것이 현재 상태에 더할 때 근거로 들어갑니다."
        actions={<Link className="cm-btn is-primary" href="/me/experience/new">+ 새 경험 추가</Link>}
        narrowActions
      />

      {/* **저장하면 저절로 들어간다**(규격 §1). 그래서 이 띠는 평소에
          서지 않고, 돌고 있거나 틀어졌을 때만 선다. 평소에도 세워 두면
          할 일이 아닌 것이 할 일처럼 보인다 */}
      {st.running ? (
        <div className="cm-state is-run" role="status" style={{ marginBottom: 18 }}>
          현재 상태를 다시 확인하고 있습니다. 끝나면 저절로 더해집니다.
        </div>
      ) : st.pending > 0 ? (
        /* **화면을 덮는 큰 빨간 상자를 두지 않는다**(규격 §14). 저장은
           끝났고 더하기만 남은 상태라, 한 줄과 다시 할 길이면 된다 */
        <div className="cm-state is-warn" role="alert" style={{ marginBottom: 18 }}>
          경험 {st.pending}건이 아직 현재 상태에 들어가지 못했습니다.
          {" "}<Link href="/me/recompute?e=recompute">다시 시도</Link>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState>
          <b>아직 적어 둔 경험이 없습니다.</b> 새로 겪은 일을 쌓으면 현재
          상태에 더할 수 있습니다.
          <p style={{ marginTop: 10 }}>
            <Link href="/me/experience/new">첫 경험 추가</Link>
          </p>
        </EmptyState>
      ) : (
        <>
          <p className="cm-listhead">
            적어 둔 경험<em>{rows.length}건</em>
          </p>
          {/**
            * **줄로 쌓는다**(규격 §5·§10).
            *
            * 전에는 경험 하나가 큰 카드였고 왼쪽에 날짜 칸이 따로 섰다.
            * 그러면 다섯 건만 되어도 목록을 훑을 수 없고, 쌓이는 자리가
            * 아니라 **기록 카드를 모아 둔 쪽**으로 읽힌다. 한 줄에 다섯을
            * 적고 자세한 것은 눌러서 편다.
            */}
          <ul className="cm-list">
            {rows.map((e) => {
              /* 날짜는 **겪은 때**가 먼저다. 안 적으셨으면 적어 둔 날이다 */
              const at = e.started_on ?? e.created_at.slice(0, 10);
              const tds = e.td_codes.map((c) => domainName(core, c));
              const picks: [string, string[]][] = [
                ["문제로 잡은 것", e.problems ?? []],
                ["직접 정한 것", e.decisions],
                ["남긴 것", e.artifacts],
                ["비교해 확인한 것", e.verifications],
                ["쓰인 곳", e.used_where ?? []],
              ];
              const any = picks.some(([, v]) => v.length);
              const on = done.has(e.id);
              return (
                <li className="cm-item" key={e.id}>
                  <details>
                    <summary>
                      <span className="cm-item-t">
                        <b>{e.title}</b>
                        <em>{KIND.get(e.kind) ?? "경험"}</em>
                      </span>
                      <span className="cm-item-meta">
                        {/* **반영 여부가 이 줄에서 가장 쓸모 있는 값이다**:
                            더하지 않은 경험은 현재 상태에 아직 없다 */}
                        <span className={`cm-dot${on ? " is-on" : ""}`}>
                          {on ? "현재 상태에 더함" : "아직 더하지 않음"}
                        </span>
                        <time dateTime={at}>{at.slice(0, 7)}</time>
                      </span>
                      {/* 연결된 기술영역. **고르지 않으셨으면 그 사실을
                          적는다**: 그 경우 이 경험은 판단으로 가지 않는다 */}
                      <span className="cm-item-sub">
                        {tds.length
                          ? tds.join(" · ")
                          : `${flow.domainWord}을 고르지 않으셔서 아직 어느 판단으로도 가지 않았습니다`}
                        {e.started_on ? "" : " · 날짜는 적어 둔 날입니다"}
                      </span>
                    </summary>
                    <div className="cm-item-more">
                      <div className="cm-rows">
                        {any ? picks.filter(([, v]) => v.length).map(([label, v]) => (
                          <p className="cm-row" key={label}>
                            <b>{label}</b>
                            <span>{v.join(" · ")}</span>
                          </p>
                        )) : (
                          <p className="cm-row">
                            <span>고른 항목 없이 제목만 적어 두셨습니다.</span>
                          </p>
                        )}
                        {e.ended_on ? (
                          <p className="cm-row">
                            <b>끝난 달</b><span>{e.ended_on.slice(0, 7)}</span>
                          </p>
                        ) : null}
                        {e.note_text ? (
                          <p className="cm-row">
                            <b>기억해 둘 한 줄</b><span>{e.note_text}</span>
                          </p>
                        ) : null}
                      </div>
                      <div className="cm-acts">
                        {/* **고치기가 먼저다**(규격 §9). 적어 둔 기록에서
                            가장 자주 하는 일이 한 칸을 더 고르는 것이고,
                            지우고 다시 적게 하면 그 사람이 손대지 않을
                            칸까지 전부 다시 고른다 */}
                        <Link className="cm-btn is-primary"
                          href={`/me/experience/${e.id}/edit`}>고치기</Link>
                        {/* **지우기를 줄 머리에 두지 않는다**: 훑는 자리에서
                            가장 되돌리기 어려운 단추가 가장 먼저 눌린다 */}
                        <form action={dropExperience}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className="cm-btn" type="submit">이 기록 지우기</button>
                        </form>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </CmShell>
  );
}
