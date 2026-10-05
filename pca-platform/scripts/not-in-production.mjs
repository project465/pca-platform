/**
 * 운영에서는 돌리지 않는다.
 *
 * 시연 자료를 넣는 명령 앞에 세운다. **지우는 것보다 안 넣는 것이
 * 싸다**: 한 번 들어가면 운영 DB 를 손으로 뒤져야 하고, 그 사이 지표가
 * 거짓말을 한다.
 */
const what = process.argv[2] ?? "이 작업";
const env = (process.env.APP_ENV ?? "").toLowerCase();
if (env === "production" || env === "prod") {
  console.error(`APP_ENV=production 에서는 ${what}를 넣지 않습니다.`);
  process.exit(2);
}
