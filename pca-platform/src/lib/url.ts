/**
 * 메일에 넣을 링크의 앞부분.
 *
 * 예전에는 부르는 쪽마다 `process.env.AUTH_URL ?? "http://localhost:3000"` 를 썼다.
 * 개발에서는 편한데, 운영에서 AUTH_URL 을 빠뜨리면 **확인 메일과 비밀번호 재설정
 * 링크가 localhost 를 가리킨 채로 나간다.** 받는 사람은 열 수 없고, 우리는 보낸 줄
 * 안다. 그래서 운영에서는 조용히 넘어가지 않고 멈춘다.
 *
 * 계정은 만들어졌는데 확인 링크가 깨진 상태보다, 가입이 실패하는 편이 낫다.
 * 앞의 것은 사람이 손으로 고쳐야 하고, 뒤의 것은 값 하나 넣으면 끝난다.
 */
export function baseUrl(): string {
  const url = process.env.AUTH_URL;
  if (url) return url.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_URL 이 없습니다. 메일 속 링크를 만들 수 없어 멈춥니다. " +
        "실제 서비스 주소를 넣고 다시 띄우세요 (npm run check:env 로 확인).",
    );
  }
  return "http://localhost:3000";
}
