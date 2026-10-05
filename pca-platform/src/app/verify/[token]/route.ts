/**
 * 메일 확인 링크.
 *
 * **GET 으로 처리한다.** 메일 클라이언트는 POST 를 보낼 수 없고, 이 길로
 * 바뀌는 것은 '이 주소가 닿는다' 한 칸뿐이라 되돌릴 것이 없다.
 *
 * 결과를 주소에 담아 지원 화면으로 보낸다. 성공과 실패를 같은 화면에서
 * 말해야 **링크가 만료된 사람이 다시 보내는 단추를 바로 찾는다.**
 */
import { redirect } from "next/navigation";
import { confirm } from "@/lib/verify-email";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const ok = await confirm(token);
  redirect(`/support?verify=${ok ? "ok" : "expired"}`);
}
