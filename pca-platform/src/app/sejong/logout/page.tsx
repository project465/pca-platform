import { signOut } from "@/lib/auth";

export default function SejongLogout() {
  return (
    <div className="sj-card" style={{ maxWidth: 480 }}>
      <h1>로그아웃</h1>
      <p className="muted">이 기기에서 로그아웃합니다.</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/sejong" });
        }}
      >
        <button className="sj-btn" type="submit">로그아웃</button>
      </form>
    </div>
  );
}
