import { requireUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import ChangeForm from "./change-form";
import { pageTitle } from "@/lib/page-title";

export async function generateMetadata() {
  return pageTitle("비밀번호 변경 · CareerMatri");
}

export default async function ChangePasswordPage() {
  const user = await requireUser({ skipPasswordGate: true });
  const forced = user.mustResetPw;
  /* **어느 계정을 바꾸는지 적는다**(2026-11-03 진흥원 첫 로그인: 같은 브라우저에 담당자도 들어와 있었다). 아이디까지 보이면
     엉뚱한 계정이 열렸을 때 바로 안다 */
  const who = await queryOne<{ login_id: string | null; email: string | null }>(
    `SELECT login_id, email FROM users WHERE id = $1`, [user.id]).catch(() => null);
  const idText = who?.login_id || who?.email || "";

  return (
    <main className="center-wrap">
      <div className="panel narrow">
        <h1>{forced ? "비밀번호를 정해주세요" : "비밀번호 변경"}</h1>
        <p className="sub">
          {forced
            ? "발급받은 임시 비밀번호는 첫 로그인에만 쓸 수 있습니다. 새 비밀번호를 정해야 검사에 들어갈 수 있습니다."
            : `${user.name} 님의 비밀번호를 변경합니다.`}
        </p>

        <p className="sub" data-account={idText}>
          바꾸는 계정: <b>{user.name}</b>{idText ? ` (${idText})` : ""}
        </p>

        <ChangeForm forced={forced} uid={user.id} />
      </div>
    </main>
  );
}
