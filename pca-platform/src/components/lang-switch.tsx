"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANG_LABEL, OFFERED_LANGS, type Lang } from "@/lib/locale";

/**
 * 언어 전환. 쿠키를 직접 쓰고 새로고침한다.
 * 서버 액션을 쓰지 않는 이유는 로그인 전 화면에서도 같은 것이 필요해서다.
 */
export default function LangSwitch({ current }: { current: Lang }) {
  const router = useRouter();
  // 고를 것이 하나뿐이면 전환기는 고르는 곳이 아니라 장식이다.
  if (OFFERED_LANGS.length < 2) return null;
  const pick = (l: Lang) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="langsw" role="group" aria-label="Language">
      {OFFERED_LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={l === current ? "on" : ""}
          aria-pressed={l === current}
          onClick={() => pick(l)}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
