import "../surface.css";
import "./platform.css";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { explicitLang } from "@/lib/locale-server";

export const metadata = { title: "내 CareerMatri" };

/**
 * **영어로 응시한 사람을 한국어 작업공간에 내려놓지 않는다**(영어판 1단계).
 *
 * 작업공간은 아직 한국어 한 벌이다. 로그인한 사람의 첫 화면이 여기라서,
 * 그대로 두면 영어로 검사를 끝낸 사람이 다시 들어온 순간 한국어 화면을
 * 받는다. 번역이 끝나기 전까지는 **그 사람이 읽을 수 있는 자리로** 보낸다:
 * 푸는 중이면 그 응시, 끝냈으면 그 결과, 아직 없고 영어를 고른 사람이면
 * 전공 고르기다. 판단은 가장 최근 응시의 언어 하나로 한다(응시 줄이 언어를
 * 들고 다닌다). 작업공간을 영어로 옮기는 날 이 자리를 지운다.
 */
export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser().catch(() => null);
  if (u) {
    const last = await queryOne<{ id: string; status: string; locale: string | null }>(
      `SELECT id::text, status, locale FROM v3_attempts
        WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`, [u.id]).catch(() => null);
    if (last?.locale === "en") {
      redirect(last.status === "in_progress" ? `/v3/${last.id}` : `/v3/${last.id}/result`);
    }
    if (!last && (await explicitLang(null).catch(() => null)) === "en") redirect("/cores");
  }
  return children;
}
