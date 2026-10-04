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
  className, label = "로그아웃",
}: { className?: string; label?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button type="submit" className={className}>{label}</button>
    </form>
  );
}
