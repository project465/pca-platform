import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordSchema } from "@/lib/validation";
import { currentUser } from "@/lib/session";
import { homeFor, sejongActor } from "@/sejong/lib/session";

export const dynamic = "force-dynamic";

/**
 * 첫 로그인 비밀번호 변경. 공통 화면(`/password/change`)과 같은 규칙을 쓰되,
 * 바꾼 뒤 **세종 화면으로** 돌려보낸다. 공통 화면은 CareerMatri 작업공간으로 간다.
 */
async function change(formData: FormData) {
  "use server";
  const user = await currentUser();
  if (!user) redirect("/sejong/login");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) redirect(`/sejong/password?e=${encodeURIComponent(parsed.error.issues[0].message)}`);
  if (next !== confirm) redirect(`/sejong/password?e=${encodeURIComponent("새 비밀번호가 서로 다릅니다.")}`);
  const row = await queryOne<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [user.id]);
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    redirect(`/sejong/password?e=${encodeURIComponent("지금 쓰는 비밀번호가 올바르지 않습니다.")}`);
  }
  await query(`UPDATE users SET password_hash = $2, must_reset_pw = false, pw_login = true WHERE id = $1`,
    [user.id, await hashPassword(next)]);
  const a = await sejongActor();
  redirect(a ? homeFor(a.kinds) : "/sejong");
}

export default async function SejongPassword({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sejong/login");
  const sp = await searchParams;
  return (
    <div className="sj-card" style={{ maxWidth: 520 }}>
      <h1>비밀번호 바꾸기</h1>
      <p className="muted small">처음 받은 비밀번호는 바꾼 뒤에 씁니다. 10자 이상입니다.</p>
      {sp.e ? <p className="sj-error" role="alert">{sp.e}</p> : null}
      <form action={change} className="sj-form">
        <div className="sj-field"><label htmlFor="current">지금 비밀번호</label>
          <input id="current" name="current" type="password" autoComplete="current-password" required /></div>
        <div className="sj-field"><label htmlFor="next">새 비밀번호</label>
          <input id="next" name="next" type="password" autoComplete="new-password" required /></div>
        <div className="sj-field"><label htmlFor="confirm">새 비밀번호 확인</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></div>
        <button className="sj-btn" type="submit">바꾸기</button>
      </form>
    </div>
  );
}
