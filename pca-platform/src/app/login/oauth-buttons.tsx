"use client";

import { useState } from "react";
import type { Provider } from "@/lib/auth-accounts";
import { startOauth } from "./oauth-actions";

/**
 * `Google 로 계속하기` · `Apple 로 계속하기`.
 *
 * **광고처럼 보이지 않게 한다.** 두 공급자의 브랜드 규칙이 요구하는 것은
 * 제 로고와 제 이름을 쓰고 고쳐 그리지 않는 것이다. 그래서 색칠한 큰
 * 띠가 아니라 **테만 두른 흰 단추**이고, 로고는 공식 모양을 그대로
 * 그린다(구글의 네 색 G, 애플의 사과). 글자는 `Google 로 계속하기` 로
 * 적는다: `Google 로 가입` 이라고 적으면 이미 계정이 있는 사람이 자기
 * 자리가 아니라고 읽는다.
 *
 * **아이콘을 남의 CDN 에서 불러오지 않는다.** 불러오면 로그인 화면이
 * 남의 서버가 사는 날 깨지고, 그 화면이 모든 길의 입구다. SVG 를 그대로
 * 그린다.
 *
 * **두 번 눌러도 두 번 가지 않는다.** 누른 뒤 공급자로 넘어가기까지
 * 한 박자가 있고, 그 사이에 또 누르면 창이 둘 열린다.
 */
export default function OauthButtons({
  providers, next, lang,
}: { providers: Provider[]; next: string; lang: "ko" | "en" }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  if (!providers.length) return null;

  const label = (p: Provider) =>
    lang === "en"
      ? `Continue with ${p === "google" ? "Google" : "Apple"}`
      : `${p === "google" ? "Google" : "Apple"}로 계속하기`;

  return (
    <div className="oauthbox">
      {providers.map((p) => (
        <form
          key={p}
          action={startOauth}
          onSubmit={() => setBusy(p)}
        >
          <input type="hidden" name="provider" value={p} />
          <input type="hidden" name="next" value={next} />
          <button className="oauthbtn" type="submit" disabled={busy !== null}>
            {p === "google" ? <GoogleMark /> : <AppleMark />}
            <span>{busy === p
              ? (lang === "en" ? "Opening…" : "여는 중…")
              : label(p)}</span>
          </button>
        </form>
      ))}
    </div>
  );
}

/** 구글 공식 `G`. 네 색을 고치지 않는다 */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/** 애플 공식 사과. 한 색이고 바탕에 따라 검정으로 둔다 */
function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.37 12.78c.02 2.6 2.28 3.47 2.3 3.48-.02.06-.36 1.23-1.19 2.44-.72 1.05-1.46 2.1-2.63 2.12-1.15.02-1.52-.68-2.83-.68-1.32 0-1.73.66-2.82.7-1.13.04-1.99-1.13-2.72-2.18-1.48-2.14-2.61-6.06-1.09-8.7.75-1.32 2.1-2.15 3.57-2.17 1.11-.02 2.15.74 2.83.74.67 0 1.94-.92 3.27-.79.56.03 2.13.23 3.14 1.7-.08.05-1.87 1.1-1.85 3.28M14.2 4.47c.6-.73 1.01-1.75.9-2.76-.87.03-1.92.58-2.55 1.3-.56.65-1.05 1.68-.92 2.68.97.07 1.96-.49 2.57-1.22" />
    </svg>
  );
}
