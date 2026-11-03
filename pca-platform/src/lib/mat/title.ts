import type { Metadata } from "next";
import { currentUser } from "@/lib/session";
import { matVisible } from "@/lib/mat-public";
import { matLang } from "./lang";

/**
 * MAT 쪽 탭 제목. **MAT 을 볼 수 없는 사람에게는 앱의 404 제목을 낸다**(2026-11-02 운영 시험: 404 화면인데도
 * 탭에 "MAT 홈" · "공고 · MAT" 가 남아 숨겨 둔 MAT 이 있다는 것이 드러났다). 검색 제외(noindex)는 레이아웃이 단다.
 */
export async function matTitle(name: string | { ko: string; en?: string }): Promise<Metadata> {
  const u = await currentUser().catch(() => null);
  const ok = Boolean(u) && (await matVisible(u!.id).catch(() => false)) && u!.scope !== "staff";
  const en = (await matLang()) === "en";
  const label = typeof name === "string" ? name : (en ? name.en : undefined) ?? name.ko;
  return { title: ok ? `${label} · MAT` : en ? "Page not found · CareerMatri" : "없는 쪽입니다 · CareerMatri" };
}
