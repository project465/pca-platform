import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/session";
import { FREE_TOTAL, matAccess } from "@/lib/mat-access";
import { JOB_COOKIE } from "@/lib/partner-job";
import { CmShell, CmHead } from "../../shell";
import { importJob } from "../actions";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: "보던 공고 맞대 보기 · MAT · CareerMatri" };
}

const ERR: Record<string, string> = {
  net: "잡인더스트리 공고 화면을 열지 못했습니다. 잠시 뒤 다시 누르시거나, 공고 본문을 복사해 붙여 넣어 주세요.",
  type: "공고 화면이 아닌 것 같습니다. 공고 본문을 복사해 붙여 넣어 주세요.",
  short: "공고 화면에서 읽을 글이 거의 없었습니다. 공고 본문을 복사해 붙여 넣어 주세요.",
  url: "잡인더스트리 주소가 아니어서 열지 않았습니다.",
  save: "공고를 읽었지만 저장하지 못했습니다. 잠시 뒤 다시 눌러 주세요.",
};

/**
 * 잡인더스트리 공고 화면에서 넘어온 사람이 그 공고를 MAT 으로 맞대 보는 자리
 * (`partner-job.ts`). **여기 들어온다고 가져오지 않는다**: 단추를 눌러야 열고 읽는다.
 */
export default async function ImportPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await requireUser();
  const [sp, jar, acc] = await Promise.all([searchParams, cookies(), matAccess(user.id)]);
  const url = jar.get(JOB_COOKIE)?.value ?? "";
  let where = "";
  try { const u = new URL(url); where = `${u.host}${u.pathname}`.slice(0, 80); } catch { /* 없음 */ }

  return (
    <CmShell active="/me/track" title="MAT">
      <CmHead kicker="잡인더스트리 AI취업지원도우미" title="보던 공고 맞대 보기"
        lead="잡인더스트리에서 보시던 공고를 읽고, 요구 항목마다 내 경험과 연구 기록이 있는지 맞대어 보여 드립니다." />
      {sp.e && ERR[sp.e] ? <p className="cm-fail">{ERR[sp.e]}</p> : null}
      {!url ? (
        <div className="cm-panel is-one"><div className="cm-pane">
          <p className="cm-row"><b>기억해 둔 공고가 없습니다</b>
            <span>잡인더스트리 공고 화면의 AI취업지원도우미 단추를 누르면 그 공고가 여기로 옵니다. 공고 본문을 직접 붙여 넣어도 됩니다.</span></p>
          <div className="cm-acts"><Link className="cm-btn is-primary" href="/me/track#posting">공고 붙여 넣기</Link></div>
        </div></div>
      ) : !acc.ready && !acc.paid ? (
        <div className="cm-panel is-one"><div className="cm-pane">
          <p className="cm-row"><b>먼저 무료 검사부터</b>
            <span>MAT 은 검사 결과에서 시작합니다. 검사를 마치고 이 화면으로 돌아오시면 보던 공고를 바로 맞대 봅니다. 공고는 7일 동안 기억해 둡니다.</span></p>
          <div className="cm-acts"><Link className="cm-btn is-primary" href="/cores">무료 검사 시작</Link></div>
        </div></div>
      ) : (
        <div className="cm-panel is-one"><div className="cm-pane">
          <p className="cm-row"><b>보시던 공고</b><span>{where}</span></p>
          <p className="cm-none">
            {acc.paid ? "기간권으로 횟수 걱정 없이 맞대 봅니다." : acc.left.posting > 0
              ? `무료 ${acc.freeLeft}번 가운데 1번을 씁니다(아무 도구나 합쳐 ${FREE_TOTAL}번).`
              : `무료 ${FREE_TOTAL}번을 이미 다 쓰셨습니다. 기간권을 고르시면 이어서 맞대 봅니다.`}
          </p>
          <div className="cm-acts">
            {acc.paid || acc.left.posting > 0 ? (
              <form action={importJob}><button className="cm-btn is-primary" type="submit">이 공고 맞대 보기</button></form>
            ) : (
              <Link className="cm-btn is-primary" href="/me/track#plans">기간권 보기</Link>
            )}
            <Link className="cm-btn" href="/me/track#posting">본문을 직접 붙여 넣기</Link>
          </div>
        </div></div>
      )}
    </CmShell>
  );
}
