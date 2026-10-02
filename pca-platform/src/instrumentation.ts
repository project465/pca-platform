/**
 * 서버가 뜰 때 딱 한 번 도는 자리 (Next.js instrumentation).
 *
 * 운영에서 설정이 잘못돼 있으면 여기서 멈춘다. 조용히 잘못된 채로 도는
 * 것보다 안 뜨는 편이 낫다 — verify.sh 의 포트 검사와 같은 이유다.
 *
 * 여기서 던지면 프로세스가 죽지는 않고 모든 요청이 500 으로 떨어진다.
 * 배포처의 상태 검사(/api/health)가 실패하므로 새 판이 올라가지 않는다.
 *
 * 실제로 겪게 되는 사고는 이런 모양이다.
 *   · MAIL_TRANSPORT 가 log 인 채로 배포 → 승인 메일이 아무 데도 안 가고,
 *     담당자는 링크를 못 받는다. 화면에는 "보냈습니다" 가 뜬다
 *   · AUTH_SECRET 이 검사용 기본값 → 그 값을 아는 사람이 세션을 위조한다
 *   · AUTH_URL 이 localhost → 비밀번호 설정 메일의 링크가 열리지 않는다
 *
 * 셋 다 배포하고 며칠 뒤에야 드러나고, 그때는 이미 학교에 나간 뒤다.
 */

const BAD_SECRETS = new Set([
  "verify-only-secret-not-for-production",
  "verify-intake-secret",
  "changeme",
  "secret",
]);

/** 내 컴퓨터에서 확인하려고 띄운 것인가. `next start` 는 NODE_ENV 를
 *  production 으로 놓으므로 그것만으로는 갈라낼 수 없다 */
function isLocal(url: string | undefined): boolean {
  return !!url && (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1"));
}

export async function register() {
  if (process.env.NODE_ENV !== "production") return;
  // 빌드 중에도 이 파일이 실행된다. 빌드는 접속 정보 없이 돌 수 있어야 한다
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // npm run verify 처럼 로컬에서 띄운 것은 검사하지 않는다.
  // 바깥에서 닿을 수 없는 주소이므로 여기서 막을 사고가 없다
  if (isLocal(process.env.AUTH_URL)) return;

  const problems: string[] = [];
  const env = process.env;

  if (!env.DATABASE_URL) problems.push("DATABASE_URL 이 없습니다.");

  if (!env.AUTH_SECRET) {
    problems.push("AUTH_SECRET 이 없습니다. openssl rand -base64 32 로 만드세요.");
  } else if (BAD_SECRETS.has(env.AUTH_SECRET) || env.AUTH_SECRET.length < 32) {
    problems.push("AUTH_SECRET 이 검사용 기본값이거나 너무 짧습니다 (32자 이상).");
  }

  if (!env.AUTH_URL) {
    problems.push("AUTH_URL 이 없습니다. 메일에 들어가는 링크를 만들 수 없습니다.");
  } else if (!env.AUTH_URL.startsWith("https://")) {
    problems.push(`AUTH_URL 이 https 가 아닙니다: ${env.AUTH_URL}`);
  }

  if (!env.INTAKE_SECRET) {
    problems.push("INTAKE_SECRET 이 없습니다. 소개 사이트가 신청을 넘길 수 없습니다.");
  } else if (BAD_SECRETS.has(env.INTAKE_SECRET) || env.INTAKE_SECRET.length < 16) {
    problems.push("INTAKE_SECRET 이 검사용 기본값이거나 너무 짧습니다 (16자 이상).");
  }

  if (env.MAIL_TRANSPORT !== "smtp") {
    problems.push(
      "MAIL_TRANSPORT 가 smtp 가 아닙니다. 승인 메일이 파일에만 쌓이고 담당자에게 가지 않습니다.",
    );
  } else {
    for (const k of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"]) {
      if (!env[k]) problems.push(`${k} 가 없습니다.`);
    }
  }

  if (problems.length === 0) return;

  const lines = [
    "",
    "운영 설정이 갖춰지지 않았습니다. 이 상태로는 요청을 받지 않습니다 (모두 500).",
    "",
    ...problems.map((p) => `  · ${p}`),
    "",
    "docs/DEPLOY.md 를 보세요.",
    "",
  ].join("\n");
  console.error(lines);
  throw new Error("운영 설정 확인 실패");
}
