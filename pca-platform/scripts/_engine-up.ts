/**
 * 결과지 엔진이 그 주소에서 열리는지 먼저 본다.
 *
 * **우리도 자물쇠를 지난다.** 공개 전 배포본은 Basic 인증 뒤에 있어서
 * 맨 `fetch` 로 두드리면 401 이 오고, 그것이 "서버가 안 떠 있다" 로
 * 읽혔다. 서버는 멀쩡히 떠 있는데 검사가 그렇게 말하면 다음 사람이
 * 엉뚱한 데를 고친다. 열쇠를 지어내지 않고 서버가 들고 있는 것을 쓴다
 * (`stagingGate()` — 화면·미들웨어와 같은 자리).
 *
 * 두 검사(`phase2:report` · `global:check`)가 같은 줄을 따로 들고 있다가
 * 한쪽만 고쳐졌다. 그래서 한 곳으로 모은다.
 */
import { stagingGate } from "../src/lib/env";

export function engineHeaders(): Record<string, string> {
  const gate = stagingGate();
  if (!gate) return {};
  const key = Buffer.from(`${gate.user}:${gate.pass}`).toString("base64");
  return { authorization: `Basic ${key}` };
}

/** 안 열리면 까닭을 적고 그 자리에서 멈춘다 */
export async function requireEngine(base: string): Promise<void> {
  const probe = await fetch(`${base}/pca/v2.html`, { headers: engineHeaders() })
    .catch(() => null);
  if (probe?.ok) return;
  const code = probe ? ` (${probe.status})` : "";
  const lock = probe?.status === 401
    ? " 자물쇠가 걸려 있으면 STAGING_BASIC_AUTH 도 같이 주십시오." : "";
  console.error(
    `결과지 엔진을 ${base}/pca/v2.html 에서 열 수 없다${code}. ` +
    `서버를 띄우고 BASE_URL 을 맞춰 주십시오.${lock}`);
  process.exit(1);
}
