import "../surface.css";
import "./platform.css";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { explicitLang } from "@/lib/locale-server";
import { pageTitle } from "@/lib/page-title";

export async function generateMetadata() {
  return pageTitle("내 CareerMatri");
}

/**
 * **영어를 고른 사람이 아직 응시가 없으면 전공 고르기로 보낸다.** 작업공간에
 * 보일 것이 아직 없고, 영어 전공 고르기(`/cores`)가 그 사람의 첫 걸음이다.
 * 응시가 있으면 작업공간이 그 응시의 언어로 선다(`wsLang`).
 */
export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser().catch(() => null);
  if (u) {
    const last = await queryOne<{ id: string }>(
      `SELECT id::text FROM v3_attempts WHERE user_id = $1 LIMIT 1`, [u.id]).catch(() => null);
    if (!last && (await explicitLang(null).catch(() => null)) === "en") redirect("/cores");
  }
  return children;
}
