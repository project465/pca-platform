import Link from "next/link";
import { requireUser } from "@/lib/session";
import {
  EXPERIENCE_KINDS, experiencesOf, pendingRecompute, reflectedExperiences,
} from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { CmShell, CmHead } from "../shell";
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
  const [rows, pending, done] = await Promise.all([
    experiencesOf(user.id), pendingRecompute(user.id), reflectedExperiences(user.id),
  ]);

  return (
    <CmShell active="/me/experience" title="경험">
      <CmHead
        kicker="경험 기록"
        title="적어 둔 경험"
        lead={"수업과 캡스톤과 연구와 인턴에서 직접 정한 것을 적어 둡니다. "
          + "반영하실 때 이 기록이 근거로 들어갑니다."}
        actions={<Link className="cm-btn is-primary" href="/me/experience/new">새 경험 추가</Link>}
      />

      {pending > 0 ? (
        <div className="cm-soon" style={{ marginBottom: 18 }}>
          <b>아직 반영하지 않은 경험이 {pending}건 있습니다.</b> 적어 두신
          경험이 어느 판단으로 가고 무엇이 달라지는지 먼저 보시고 반영하실
          수 있습니다.
          <p style={{ marginTop: 10 }}>
            <Link href="/me/recompute">새 경험 반영하기</Link>
          </p>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="cm-soon">
          <b>아직 적어 둔 경험이 없습니다.</b> 검사에서 고른 근거와 별개로,
          새로 겪은 일을 여기에 쌓습니다. 하나만 적어도 현재 상태에
          반영할 수 있습니다.
        </div>
      ) : (
        <div className="cm-snaps">
          {rows.map((e) => {
            /* 날짜는 **겪은 때**가 먼저다. 안 적으셨으면 적어 둔 날로
               적고, 둘을 섞어 한 칸에 두므로 어느 쪽인지 밑에 적는다 */
            const at = e.started_on ?? e.created_at.slice(0, 10);
            const tds = e.td_codes.map((c) => domainName(c));
            const picks: [string, string[]][] = [
              ["문제로 잡은 것", e.problems ?? []],
              ["직접 정한 것", e.decisions],
              ["남긴 것", e.artifacts],
              ["비교해 확인한 것", e.verifications],
              ["쓰인 자리", e.used_where ?? []],
            ];
            const any = picks.some(([, v]) => v.length);
            return (
              <article className="cm-snap" key={e.id}>
                <div className="cm-snap-date">
                  <b>{at.slice(5)}</b>
                  <small>{at.slice(0, 4)}</small>
                </div>
                <div className="cm-snap-body">
                  <h3>
                    {e.title}
                    <span className="cm-lockmark">{KIND.get(e.kind) ?? "경험"}</span>
                  </h3>
                  {/* 연결된 기술영역. **고르지 않으셨으면 그 사실을
                      적는다**: 그 경우 이 경험은 판단으로 가지 않는다 */}
                  {tds.length ? (
                    <div className="cm-chips">
                      {tds.map((n) => <span className="cm-chip" key={n}>{n}</span>)}
                    </div>
                  ) : (
                    <p className="cm-none">
                      기술영역을 고르지 않으셔서 아직 어느 판단으로도 가지
                      않았습니다.
                    </p>
                  )}
                  {/* 반영 여부. **`반영됨` 이 `판정이 올라갔다` 는 뜻은
                      아니다**: 함께 세어졌다는 것까지다 */}
                  <p className="cm-none">
                    {done.has(e.id)
                      ? "현재 상태에 반영됨"
                      : "아직 반영하지 않음 · 반영하면 현재 상태에 들어갑니다"}
                    {e.started_on ? "" : " · 날짜는 적어 둔 날입니다"}
                  </p>

                  {/* **상세는 눌러서 본다**(규격 §14). 고른 항목을 늘
                      펼쳐 두면 경험 하나가 쪽 한 뼘을 먹고, 경험이 다섯만
                      되어도 목록을 훑을 수 없다 */}
                  <details className="cm-fold">
                    <summary>자세히 보기</summary>
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
                    <div className="cm-acts" style={{ marginTop: 12 }}>
                      {/* **지우기를 줄 머리에 두지 않는다**: 훑는 자리에서
                          가장 되돌리기 어려운 단추가 가장 먼저 눌린다 */}
                      <form action={dropExperience}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="cm-btn" type="submit">이 기록 지우기</button>
                      </form>
                    </div>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CmShell>
  );
}
