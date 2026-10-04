"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE } from "@/lib/locale";
import { SURFACE_LANGS, type Lang2 } from "@/lib/surface-text";

const LABEL: Record<Lang2, string> = { ko: "한국어", en: "English" };

/**
 * 언어를 고르는 상자.
 *
 * **그냥 늘어놓은 작은 링크를 쓰지 않는다.** 예전 전환기는
 * `한국어 | English | Türkçe` 였는데, 운영 화면 오른쪽 위에 그렇게 두면
 * 고르는 곳인지 상태 표시인지 구별되지 않는다.
 *
 * 내놓는 언어는 `ko` 와 `en` 둘이다. 셋째 언어는 실제 번역이 승인되는 날
 * `SURFACE_LANGS` 에 더하면 여기가 같이 늘어난다. **지금 헤더에 튀르키예어
 * 탭이 떠 있다는 이유로 켜지 않는다**: 화면 문구는 번역돼 있어도 결과지와
 * 직무 분류가 아직 그 언어로 검수되지 않았다.
 */
export default function LangSelect({ current }: { current: Lang2 }) {
  const router = useRouter();
  if (SURFACE_LANGS.length < 2) return null;
  return (
    <label className="sf-lang">
      <span className="sr-only">Language</span>
      <select
        className="sf-select"
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          document.cookie =
            `${LANG_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          router.refresh();
        }}
      >
        {SURFACE_LANGS.map((l) => (
          <option key={l} value={l}>{LABEL[l]}</option>
        ))}
      </select>
    </label>
  );
}
