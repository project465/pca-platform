import { signOut } from "@/lib/auth";

export default function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button type="submit">로그아웃</button>
    </form>
  );
}
