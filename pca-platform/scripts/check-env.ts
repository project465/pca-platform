/**
 * 배포 전 점검. 올리기 전에 무엇이 비었는지 여기서 알아야 한다.
 *
 *   npm run check:env
 *
 * 없으면 서비스가 멈추는 것과, 없어도 도는 것을 나눠서 말한다.
 * "권장" 목록을 길게 늘어놓으면 정작 치명적인 것이 묻힌다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(process.argv[2] ?? ".env.local");

type Check = {
  keys: string[];
  what: string;
  /** 없으면 무슨 일이 일어나는가 */
  without: string;
  level: "stop" | "degrade" | "optional";
};

const CHECKS: Check[] = [
  {
    keys: ["DATABASE_URL"],
    what: "데이터베이스",
    without: "아무 화면도 열리지 않는다",
    level: "stop",
  },
  {
    keys: ["AUTH_SECRET"],
    what: "세션 서명 키",
    without: "로그인이 되지 않는다. 값이 바뀌면 모든 세션이 끊긴다",
    level: "stop",
  },
  {
    keys: ["AUTH_URL"],
    what: "서비스 주소",
    without: "소셜 로그인 리다이렉트와 메일 속 링크가 엉뚱한 곳을 가리킨다",
    level: "stop",
  },
  {
    keys: ["NEXT_PUBLIC_TOSS_CLIENT_KEY", "TOSS_SECRET_KEY"],
    what: "결제 (토스페이먼츠)",
    without: "개인 회원이 신청을 마칠 수 없다",
    level: "stop",
  },
  {
    keys: ["ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"],
    what: "줌 회의 생성",
    without: "멘토가 승낙해도 회의가 만들어지지 않아 승낙 자체가 실패한다",
    level: "stop",
  },
  {
    keys: ["MAIL_WEBHOOK_URL"],
    what: "알림 발송",
    without: "확정 안내와 리마인더가 큐에 쌓이기만 한다 — 보낸 척하지는 않는다",
    level: "degrade",
  },
  {
    keys: ["PAYOUT_SECRET"],
    what: "멘토 주민등록번호 암호화 키",
    without: "주민등록번호를 아예 받지 않는다. 계좌 이체는 되지만 원천징수 신고가 늦어진다",
    level: "degrade",
  },
  {
    keys: ["KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET"],
    what: "카카오 로그인",
    without: "버튼이 뜨지 않는다. 이메일 가입은 그대로 된다",
    level: "optional",
  },
  {
    keys: ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],
    what: "네이버 로그인",
    without: "버튼이 뜨지 않는다. 이메일 가입은 그대로 된다",
    level: "optional",
  },
  {
    keys: ["MEETING_TIMEZONE"],
    what: "회의 시간대",
    without: "Asia/Seoul 로 본다",
    level: "optional",
  },
];

const has = (k: string) => (process.env[k] ?? "").trim().length > 0;
const MARK = { stop: "없으면 멈춤", degrade: "없으면 반쪽", optional: "선택" };

let stopMissing = 0;
let degradeMissing = 0;

console.log("");
for (const level of ["stop", "degrade", "optional"] as const) {
  const group = CHECKS.filter((c) => c.level === level);
  console.log(`[${MARK[level]}]`);
  for (const c of group) {
    const missing = c.keys.filter((k) => !has(k));
    const ok = missing.length === 0;
    if (!ok && level === "stop") stopMissing++;
    if (!ok && level === "degrade") degradeMissing++;
    console.log(`  ${ok ? "있음" : "없음"}  ${c.what}`);
    if (!ok) {
      console.log(`        ${missing.join(", ")}`);
      console.log(`        → ${c.without}`);
    }
  }
  console.log("");
}

/* 값이 있어도 틀릴 수 있는 것들 */
const warn: string[] = [];
const url = process.env.AUTH_URL ?? "";
if (url && !/^https:\/\//.test(url) && !/localhost/.test(url)) {
  warn.push("AUTH_URL 이 https 가 아니다. 쿠키가 붙지 않을 수 있다");
}
if ((process.env.AUTH_SECRET ?? "").length > 0 && (process.env.AUTH_SECRET ?? "").length < 32) {
  warn.push("AUTH_SECRET 이 32자보다 짧다. openssl rand -base64 32 로 만들자");
}
if ((process.env.PAYOUT_SECRET ?? "").length > 0 && (process.env.PAYOUT_SECRET ?? "").length < 16) {
  warn.push("PAYOUT_SECRET 이 16자보다 짧아 무시된다");
}
if (process.env.PAYMENTS_DRY_RUN === "1") {
  warn.push("PAYMENTS_DRY_RUN=1 — 실제 결제가 일어나지 않는다. 운영에서는 지워야 한다");
}
if (process.env.ZOOM_DRY_RUN === "1") {
  warn.push("ZOOM_DRY_RUN=1 — 가짜 회의 링크가 발송된다. 운영에서는 지워야 한다");
}
if ((process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "").startsWith("test_")) {
  warn.push("토스 키가 test_ 로 시작한다. 실제 결제가 되지 않는다");
}

if (warn.length > 0) {
  console.log("[값은 있지만 확인할 것]");
  for (const w of warn) console.log("  " + w);
  console.log("");
}

if (stopMissing > 0) {
  console.log(`올릴 수 없습니다. 없으면 멈추는 항목 ${stopMissing}개가 비어 있습니다.`);
  process.exit(1);
}
console.log(
  degradeMissing > 0
    ? `올릴 수는 있습니다. 다만 반쪽으로 도는 항목이 ${degradeMissing}개 있습니다.`
    : "필요한 값이 모두 있습니다.",
);
