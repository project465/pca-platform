"use client";

import { useRouter } from "next/navigation";
import { LANGS, LANG_COOKIE, LANG_LABEL, type Lang } from "@/lib/locale";

/**
 * 언어 전환. 쿠키를 직접 쓰고 새로고침한다.
 * 서버 액션을 쓰지 않는 이유는 로그인 전 화면에서도 같은 것이 필요해서다.
 */
export default function LangSwitch({ current }: { current: Lang }) {
  const router = useRouter();
  const pick = (l: Lang) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="langsw" role="group" aria-label="Language">
      {LANGS.map((l) => (
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
