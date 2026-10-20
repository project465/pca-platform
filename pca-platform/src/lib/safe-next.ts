/**
 * 로그인하러 가기 전에 들고 있던 자리.
 *
 * **열린 리다이렉트를 막는 자리를 하나로 둔다.** 전에는 로그인 화면과
 * 가입 화면과 가입 동작이 각각 같은 두 줄을 들고 있었고, 소셜 로그인이
 * 붙으면서 그 자리가 넷이 될 참이었다. 네 벌이면 어느 날 한 벌이
 * 안 고쳐진다.
 *
 * 막는 것은 둘이다.
 *
 *   `//evil.com`      브라우저가 **바깥 주소**로 읽는다(프로토콜 상대 주소)
 *   `https://...`     말할 것도 없이 바깥이다
 *
 * 그래서 **우리 쪽 경로 하나**만 지나간다: `/` 로 시작하고 `//` 로
 * 시작하지 않으며 `\` 가 없는 것. 역슬래시를 빼는 까닭은 브라우저마다
 * `/\evil.com` 을 `//evil.com` 으로 읽는 것이 있어서다.
 */
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  const s = String(raw ?? "").trim();
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//")) return fallback;
  if (s.includes("\\")) return fallback;
  /* **제어문자를 받지 않는다.** URL 파서는 탭과 줄바꿈을 지우고 읽으므로
     `/<탭>/evil.com` 이 위의 세 줄을 지나 `//evil.com` 이 된다 */
  if (/[\u0000-\u001f\u007f]/.test(s)) return fallback;
  /* 마지막으로 파서에게 묻는다: 우리 쪽 바탕에 붙였을 때 바깥으로 나가면 버린다 */
  try {
    const base = "http://same.invalid";
    if (new URL(s, base).origin !== base) return fallback;
  } catch {
    return fallback;
  }
  return s;
}
