import Link from "next/link";
import { redirect } from "next/navigation";
import EntryFrame from "@/components/sf/entry-frame";
import { currentUser } from "@/lib/session";
import { ROLE_LABEL, homePathFor } from "@/lib/roles";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "이 계정으로는 열 수 없는 화면 · CareerMatri" };

/**
 * 역할이 맞지 않는 화면에 왔을 때 서는 쪽(`requireRole`, 2026-11-01).
 *
 * 전에는 말 없이 첫 화면으로 보냈다. 한 브라우저의 담당자 로그인은 하나라서, 다른 탭에서
 * 다른 담당자로 들어가면 최고 관리자 탭도 그 계정으로 바뀌는데 화면이 그것을 알려 주지
 * 않았다. **지금 누구로 들어와 있는지, 어디로 갈 수 있는지**를 적는다.
 */
export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const who = await currentUser();
  if (!who) redirect("/login");
  const back = safeNext(from, "");
  const home = homePathFor(who.role);
  return (
    <EntryFrame lang="ko">
      <div className="authwrap">
        <div className="panel narrow">
          <h1>이 계정으로는 열 수 없는 화면입니다</h1>
          <p className="sub">
            지금 <b>{who.name}</b> ({ROLE_LABEL[who.role]}) 계정으로 로그인돼 있습니다.
            {back ? <> 열려던 화면(<code>{back.split("?")[0]}</code>)은 이 계정의 권한으로 열 수 없습니다.</> : null}
          </p>
          {who.scope === "staff" ? (
            <p className="sub">
              한 브라우저에서 담당자 로그인은 하나입니다. 다른 탭에서 다른 담당자 계정으로 로그인하면
              이 탭도 그 계정으로 바뀝니다.
            </p>
          ) : null}
          <div className="foot-links">
            <Link href={home}>이 계정의 첫 화면으로</Link>
            <Link href={`/login?switch=1${back ? `&next=${encodeURIComponent(back)}` : ""}`}>다른 계정으로 로그인</Link>
          </div>
        </div>
      </div>
    </EntryFrame>
  );
}
