import { signOut } from "@/lib/auth";

/**
 * 로그아웃.
 *
 * `className` 을 받는 이유는 옛 화면과 새 화면이 둘 다 이 단추를 쓰기
 * 때문이다. 기본값을 비워 두면 옛 화면에서 모양이 바뀌지 않고, 새 화면은
 * `sf-btn ghost sm` 을 넘겨 쓴다. 문구는 사전에서 받는다: **재사용하는
 * 컴포넌트에 한국어를 박지 않는다.**
 */
export default function LogoutButton({
  className, label = "로그아웃", redirectTo = "/login",
}: { className?: string; label?: string; redirectTo?: string }) {
  /* 나간 뒤 돌아갈 곳. 학교 전용 진입으로 들어온 학생은 그 학교의
     로그인으로 돌아가야 다음 사람이 같은 문으로 들어온다. 이 단추가 받는
     값은 화면이 정한 우리 쪽 주소뿐이다 */
  const to = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/login";
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: to });
      }}
    >
      <button type="submit" className={className}>{label}</button>
    </form>
  );
}
