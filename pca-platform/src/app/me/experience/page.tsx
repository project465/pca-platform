import Link from "next/link";
import { requireUser } from "@/lib/session";
import { EXPERIENCE_KINDS, experiencesOf, pendingRecompute } from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { CmShell, CmHead } from "../shell";
import { dropExperience } from "./actions";

export const metadata = { title: "경험 · 내 CareerMatri" };

const KIND = new Map(EXPERIENCE_KINDS.map((k) => [k.code as string, k.label]));

export default async function Experiences() {
  const user = await requireUser();
  const [rows, pending] = await Promise.all([
    experiencesOf(user.id), pendingRecompute(user.id),
  ]);

  return (
    <CmShell active="/me/experience" title="경험">
      <CmHead
        kicker="경험 기록"
        title="적어 둔 경험"
        lead={"수업과 캡스톤과 연구와 인턴에서 직접 정한 것을 적어 둡니다. "
          + "다음 재분석에서 이 기록이 근거로 들어갑니다."}
        actions={<Link className="cm-btn is-primary" href="/me/experience/new">새 경험 추가</Link>}
      />

      {pending > 0 ? (
        <div className="cm-soon" style={{ marginBottom: 18 }}>
          <b>다시 계산할 일이 {pending}건 쌓여 있습니다.</b> 적어 두신 경험이
          어느 판단축으로 가고 묶음이 어떻게 달라지는지 먼저 보시고 반영하실
          수 있습니다.
          <p style={{ marginTop: 10 }}>
            <Link href="/me/recompute">재분석 보기</Link>
          </p>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="cm-soon">
          <b>아직 적어 둔 경험이 없습니다.</b> 검사에서 고른 근거와 별개로,
          새로 겪은 일을 여기에 쌓습니다. 하나만 적어도 다음 재분석에
          들어갑니다.
        </div>
      ) : (
        <div className="cm-tablewrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>경험</th><th>종류</th><th>기술영역</th>
                <th>문제</th><th>직접 정한 것</th><th>남긴 것</th>
                <th>확인</th><th>쓰인 자리</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.title}</b></td>
                  <td>{KIND.get(e.kind) ?? e.kind}</td>
                  <td>{e.td_codes.map((c) => domainName(c)).join(" · ") || "—"}</td>
                  <td>{(e.problems ?? []).length}개</td>
                  <td>{e.decisions.length}개</td>
                  <td>{e.artifacts.length}개</td>
                  <td>{e.verifications.length}개</td>
                  <td>{(e.used_where ?? []).length}개</td>
                  <td>
                    <form action={dropExperience}>
                      <input type="hidden" name="id" value={e.id} />
                      <button className="cm-btn" type="submit">지우기</button>
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
