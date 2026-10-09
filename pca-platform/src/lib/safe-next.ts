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
  return s;
}
