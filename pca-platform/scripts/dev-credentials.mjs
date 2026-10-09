/**
 * 개발용 계정의 열쇠. **저장소에 적지 않는다.**
 *
 * 전에는 여섯 값이 소스 열 벌에 **평문으로** 적혀 있었다
 * (`pca-dev-admin-1234` · `TempPass2026` …). 운영 secret 은 아니지만,
 * 그 값으로 **실제로 로그인이 된다**: 누군가 개발 DB 를 잠깐 열어 두거나
 * 시드를 밖에서 돌린 날, 저장소를 읽은 사람이 그대로 들어온다. 그리고
 * 같은 값이 README 와 QA 문서에도 적혀 있었다.
 *
 * 고치는 방향은 "값을 바꾸기" 가 아니라 **"저장소에서 없애기"** 다.
 *
 *   ① 환경변수가 있으면 그것을 쓴다        CI 와 사람이 정하는 자리
 *   ② 없으면 `.dev-credentials.json` 에서  이 기계에서만 사는 파일
 *   ③ 그것도 없으면 **그 자리에서 만든다**  임의의 24바이트
 *
 * ②의 파일은 `.gitignore` 에 있다. 만들어 두는 까닭은 시드와 캡처가
 * **다른 프로세스**라서다: 시드가 만든 계정으로 캡처가 로그인해야 하는데,
 * 매번 새로 만들면 둘이 영원히 어긋난다.
 *
 * **값을 화면에 찍지 않는다.** 시드가 끝나면 "어디서 볼 수 있다" 만
 * 알리고, 값 자체는 그 파일을 열어야 보인다. 터미널 기록과 CI 로그에
 * 남는 것이 평문으로 적어 두는 것과 같은 일이기 때문이다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const CRED_FILE = resolve(ROOT, ".dev-credentials.json");

/**
 * 쓰는 자리. **이름을 늘리기 전에 정말 다른 계정인지 본다.**
 *
 * `student2` 는 첫 로그인 비밀번호 변경을 **거친 뒤**의 값이다. 한
 * 계정에 값이 둘인 자리가 여기뿐이라 이름으로 적어 둔다.
 */
export const ROLES = ["admin", "org", "student", "student2", "probe", "erase"];

const ENV_KEY = (role) => `DEV_SEED_PW_${role.toUpperCase()}`;

function load() {
  if (!existsSync(CRED_FILE)) return {};
  try {
    const j = JSON.parse(readFileSync(CRED_FILE, "utf8"));
    return j && typeof j === "object" ? j : {};
  } catch {
    /* 파일이 상했으면 새로 만든다. **조용히 지나가지 않는다** */
    console.error(`[dev-credentials] ${CRED_FILE} 를 읽지 못해 새로 만듭니다.`);
    return {};
  }
}

let cache = null;

/**
 * 이 역할의 열쇠.
 *
 * **운영에서는 부르지 않는다.** 부르면 그 자리에서 멈춘다: 개발용 값을
 * 운영 DB 에 심는 길이 실수로도 열리면 안 된다.
 */
export function devPassword(role) {
  if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
    throw new Error("운영에서는 개발용 계정 열쇠를 쓰지 않습니다.");
  }
  if (!ROLES.includes(role)) throw new Error(`모르는 역할입니다: ${role}`);

  const fromEnv = (process.env[ENV_KEY(role)] ?? "").trim();
  if (fromEnv) return fromEnv;

  if (!cache) cache = load();
  if (typeof cache[role] === "string" && cache[role]) return cache[role];

  /* 그 자리에서 만든다. 사람이 외울 값이 아니라 길이를 아끼지 않는다 */
  cache[role] = randomBytes(18).toString("base64url");
  mkdirSync(dirname(CRED_FILE), { recursive: true });
  writeFileSync(CRED_FILE, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 });
  return cache[role];
}

/** 시드가 끝나고 적는 안내. **값을 찍지 않는다** */
export function whereToLook() {
  return `개발용 계정의 비밀번호는 ${CRED_FILE} 에 있습니다.`
    + ` (환경변수 ${ROLES.map(ENV_KEY).join(" · ")} 로 덮어쓸 수 있습니다)`;
}
