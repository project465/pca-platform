/**
 * 이 배포본이 무엇인가.
 *
 * **'운영처럼 보이는 것' 과 '운영' 을 이름으로 가른다.** 지금까지는
 * `NODE_ENV=production` 하나로 판단했는데, 그 값은 **빌드가 최적화됐다는
 * 뜻**이지 손님이 돈을 내는 자리라는 뜻이 아니다. staging 도 똑같이
 * `production` 으로 빌드된다.
 *
 *   dev         손에서 띄운 것
 *   staging     밖에서 열리지만 손님에게 열지 않은 것. 가짜 결제를 쓴다
 *   production  손님이 돈을 내는 자리. **가짜 결제가 금지된다**
 *
 * 값이 비어 있으면 `dev` 다. **모르면 덜 준다**: 모르는 배포본을 운영으로
 * 보면 가짜 결제가 막혀 아무도 못 사고, 그건 그날 바로 드러난다.
 * 반대로 모르는 것을 staging 으로 보면 운영에서 가짜 결제가 열린 채로
 * 몇 달이 간다.
 */
export type AppEnv = "dev" | "staging" | "production";

export function appEnv(): AppEnv {
  const v = (process.env.APP_ENV ?? "").trim().toLowerCase();
  if (v === "production" || v === "prod") return "production";
  if (v === "staging" || v === "stage") return "staging";
  return "dev";
}

export const isStaging = () => appEnv() === "staging";
export const isProduction = () => appEnv() === "production";

/**
 * 가짜 결제를 켜도 되는가.
 *
 * **운영에서는 어떤 환경변수로도 열리지 않는다.** 전에는
 * `ALLOW_MOCK_PAYMENTS=yes` 가 그 문을 열 수 있었는데, 그 한 줄이
 * 운영에 섞여 들어가면 **돈을 안 받고 이용권이 나간다.** 문을 아예
 * 없앴다.
 */
export function mockPaymentsAllowed(): boolean {
  return appEnv() !== "production";
}

/**
 * 공개 전 자물쇠. `아이디:비밀번호` 한 줄이다.
 *
 * staging 에만 건다. **운영에 걸면 손님이 못 들어온다.**
 */
export function stagingGate(): { user: string; pass: string } | null {
  const raw = (process.env.STAGING_BASIC_AUTH ?? "").trim();
  if (!raw || !raw.includes(":")) return null;
  const i = raw.indexOf(":");
  return { user: raw.slice(0, i), pass: raw.slice(i + 1) };
}
