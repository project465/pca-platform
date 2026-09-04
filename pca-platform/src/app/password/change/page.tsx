import { requireUser } from "@/lib/session";
import ChangeForm from "./change-form";

export const metadata = { title: "비밀번호 변경 — 단체 PCA 플랫폼" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ skipPasswordGate: true });
  const forced = user.mustResetPw;

  return (
    <main className="center-wrap">
      <div className="panel narrow">
        <h1>{forced ? "비밀번호를 정해주세요" : "비밀번호 변경"}</h1>
        <p className="sub">
          {forced
            ? "발급받은 임시 비밀번호는 첫 로그인에만 쓸 수 있습니다. 새 비밀번호를 정해야 검사에 들어갈 수 있습니다."
            : `${user.name} 님의 비밀번호를 변경합니다.`}
        </p>

        <ChangeForm forced={forced} />
      </div>
    </main>
  );
}
