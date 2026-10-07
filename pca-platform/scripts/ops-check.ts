/**
 * 운영 환경 한 장.
 *
 * 검사 명령이 열 몇 개가 됐다. 그 하나하나는 제 질문에 정확히 답하는데,
 * **"오늘 Railway 가 들고 있는 것이 최신 코드와 맞는가"** 를 묻는 자리가
 * 없었다. 그래서 아침에 보는 사람이 열 번 쳐 보고 머릿속에서 합쳐야 했고,
 * 합치는 사람이 매번 달랐다.
 *
 * 여기는 **합친 한 장**이다. 새로 재지 않는다 — `launchReport()` ·
 * `appDomain()` · `businessInfo()` · `readLegalBody()` · `image:check` 가
 * 이미 재는 것을 그대로 읽는다(설계 원칙 10). 이 파일이 따로 재면 어느 날
 * 이 화면만 초록이 된다.
 *
 * **네 상태로 말한다. 그리고 UNKNOWN 을 BLOCKED 와 섞지 않는다.**
 *
 *   READY    맞다
 *   WARNING  돌아가는데 켜고 나서 물어볼 사람이 생긴다
 *   BLOCKED  **봤고, 틀렸다.** 이대로 올리면 그 자리가 깨진다
 *   UNKNOWN  **못 봤다.** 이 자리에서는 답할 수 없다
 *
 * 섞으면 둘 다 쓸모가 없어진다. 못 본 것을 BLOCKED 로 적으면 고칠 것이
 * 없는데 빨간 줄이 남아 다음부터 아무도 안 보고, 못 본 것을 READY 로
 * 적으면 안 본 자리가 초록으로 선다. 그래서 UNKNOWN 줄에는 **그것을
 * 답으로 바꾸는 방법**을 반드시 같이 적는다.
 *
 *   npm run ops:check
 *   DATABASE_URL=... npm run ops:check     # DB·백업까지 본다
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { appEnv, stagingGate, mockPaymentsAllowed } from "../src/lib/env";
import { appDomain, probeAppDomain } from "../src/lib/app-domain";
import { businessInfo } from "../src/lib/business";
import { mailReady } from "../src/lib/outbox";
import { readLegalBody, LEGAL_FILES } from "../src/lib/legal-doc";
import { marketReadiness } from "../src/lib/payments";
import { pdfVolume, inDeployment } from "../src/lib/pdf-volume";

export const OPS_AREAS = [
  "DEPLOY", "DOCKER_RUNTIME", "DOMAIN", "APP_ENV", "DATABASE", "PDF_VOLUME",
  "EMAIL", "LEGAL", "BUSINESS", "BACKUP", "PAYMENT",
] as const;
export type OpsArea = (typeof OPS_AREAS)[number];

export type OpsStatus = "READY" | "WARNING" | "BLOCKED" | "UNKNOWN";

export type OpsRow = {
  area: OpsArea;
  status: OpsStatus;
  /** 왜 그 상태인가 */
  detail: string;
  /**
   * UNKNOWN 을 답으로 바꾸는 방법. **UNKNOWN 이면 반드시 있다.**
   *
   * 없으면 그 줄은 "모른다" 로 끝나고, 모른다로 끝나는 줄은 다음 회차에
   * 또 모른다로 선다.
   */
  how?: string;
};

const rows: OpsRow[] = [];
const add = (area: OpsArea, status: OpsStatus, detail: string, how?: string) =>
  rows.push({ area, status, detail, how });

/**
 * 이 프로세스가 **그 배포본의 변수를 들고 있는가.**
 *
 * 환경변수를 읽는 줄 전부가 이 질문에 걸린다. 개발 PC 에서 돌리면
 * `PLATFORM_URL` 이 비어 있는데, 그것은 **운영이 비어 있다는 뜻이 아니다**
 * — 내가 그 값을 안 들고 있다는 뜻이다. 그 차이를 안 가르면 이 검사가
 * 매번 "운영 도메인이 비어 있다" 는 거짓을 적고, 거짓을 적는 검사는 그
 * 다음부터 아무도 안 본다.
 *
 * 그래서 **값이 틀린 것은 BLOCKED, 값을 못 본 것은 UNKNOWN** 이다.
 */
const IN_DEPLOYMENT = inDeployment();

/** 변수가 비어 있다. 배포본 안이면 틀린 것이고, 밖이면 못 본 것이다 */
const missingEnv = (area: OpsArea, name: string, wrong: string, how: string) =>
  IN_DEPLOYMENT
    ? add(area, "BLOCKED", `${name} 이 비어 있습니다. ${wrong}`)
    : add(area, "UNKNOWN", `이 자리가 ${name} 을 들고 있지 않습니다.`, how);

/* ── DEPLOY ─────────────────────────────────────────────────────────
   Railway 가 들고 있는 커밋과 이 저장소가 같은가.

   **Railway 가 어느 가지를 보는지는 코드가 알 수 없다.** 그 설정은
   Railway 쪽에 있다. 다만 Railway 는 컨테이너에 `RAILWAY_GIT_BRANCH` ·
   `RAILWAY_GIT_COMMIT_SHA` 를 꽂아 준다. 그래서 **컨테이너 안에서 돌면
   답할 수 있고, 밖에서 돌면 모른다.** 둘을 가른다. */
function git(...args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function deployRow() {
  const onRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_SERVICE_NAME);
  const liveSha = (process.env.RAILWAY_GIT_COMMIT_SHA ?? "").trim();
  const liveBranch = (process.env.RAILWAY_GIT_BRANCH ?? "").trim();
  const head = git("rev-parse", "HEAD");

  if (onRailway && liveSha) {
    /* 컨테이너 안이다. 이미지에는 `.git` 이 없으므로 HEAD 와 비교할 수
       없고, 비교할 필요도 없다 — 이 값이 곧 돌고 있는 커밋이다 */
    return add("DEPLOY", "READY",
      `Railway 가 ${liveBranch || "(가지 미표시)"} 의 ${liveSha.slice(0, 7)} 를 돌리고 있습니다.`);
  }
  if (onRailway) {
    return add("DEPLOY", "UNKNOWN",
      "Railway 안에서 도는데 RAILWAY_GIT_COMMIT_SHA 가 비어 있습니다.",
      "Railway → 서비스 → Settings → Source 가 GitHub 저장소로 연결돼 있는지 봅니다. " +
      "업로드나 이미지로 배포하면 이 값이 꽂히지 않습니다.");
  }

  if (!head) {
    return add("DEPLOY", "UNKNOWN", "git 저장소가 아닙니다.",
      "저장소 안에서 다시 돌립니다.");
  }
  const branch = git("rev-parse", "--abbrev-ref", "HEAD") ?? "?";
  const dirty = (git("status", "--porcelain") ?? "").length > 0;
  const up = git("rev-parse", `origin/${branch}`);
  const pushed = up === head;

  if (dirty) {
    return add("DEPLOY", "WARNING",
      `${branch} 에 올리지 않은 변경이 있습니다. Railway 는 올라간 것만 봅니다.`);
  }
  if (!up) {
    return add("DEPLOY", "WARNING",
      `origin/${branch} 가 없습니다. 밀어 올리기 전에는 Railway 가 볼 것이 없습니다.`);
  }
  if (!pushed) {
    const ahead = git("rev-list", "--count", `origin/${branch}..HEAD`) ?? "?";
    return add("DEPLOY", "WARNING",
      `${branch} 가 origin 보다 ${ahead}개 앞서 있습니다. 밀어 올리기 전에는 배포되지 않습니다.`);
  }
  /* 가지가 맞는지는 **여기서 알 수 없다.** 올라가 있다는 것까지가 답이다 */
  add("DEPLOY", "UNKNOWN",
    `${branch} 의 ${head.slice(0, 7)} 가 origin 에 올라가 있습니다. ` +
    `이 가지를 Railway 가 보는지는 이 자리에서 알 수 없습니다.`,
    "Railway → 서비스 → Settings → Source → Branch 가 이 가지인지, " +
    "Deployments 맨 위 줄의 커밋이 " + head.slice(0, 7) + " 인지 봅니다.");
}

/* ── DOCKER_RUNTIME ─────────────────────────────────────────────────
   **"저장소에 있음" 이 아니라 "최종 이미지에 있음" 을 본다.**

   재지 않고 `image:check` 를 그대로 부른다. 두 곳에서 따로 세면 어느 날
   한쪽만 고쳐진다. */
function dockerRow() {
  /**
   * **컨테이너 안에서는 Dockerfile 을 읽을 필요가 없다.**
   *
   * 거기서는 더 좋은 증거가 있다: 그 자리가 **실제로 있는지** 보면 된다.
   * Dockerfile 을 정적으로 읽는 것은 "들어올 것이다" 까지이고, 여기는
   * "들어와 있다" 다. 그래서 배포본 안에서는 이 줄이 UNKNOWN 이 아니라
   * READY 나 BLOCKED 로 선다.
   *
   * 보는 목록은 `image:check` 와 **같은 파일**이다
   * (`deploy/runtime-needs.json`). 두 벌로 적어 두면 한쪽만 늘어난다.
   */
  if (!existsSync("Dockerfile")) {
    const list = "deploy/runtime-needs.json";
    if (!existsSync(list)) {
      return add("DOCKER_RUNTIME", "UNKNOWN",
        `Dockerfile 도 ${list} 도 없어 무엇이 있어야 하는지 알 수 없습니다.`,
        "저장소 뿌리에서 `npm run image:check` 를 돌립니다.");
    }
    const needs = (JSON.parse(readFileSync(list, "utf8")) as
      { needs: [string, string][] }).needs;
    const miss = needs.filter(([want]) => !existsSync(want));
    return miss.length
      ? add("DOCKER_RUNTIME", "BLOCKED",
        `이미지 안에 ${miss.length}가지가 없습니다 — ` +
        miss.slice(0, 3).map(([w, why]) => `${w}(${why})`).join(" · "))
      : add("DOCKER_RUNTIME", "READY",
        `이미지 안에서 ${needs.length}자리를 실제로 확인했습니다 ` +
        `(결과지 엔진 · 법정 문서 · db · ops · 문항).`);
  }
  try {
    execFileSync("node", ["scripts/image-check.mjs"], { stdio: ["ignore", "pipe", "pipe"] });
    add("DOCKER_RUNTIME", "READY",
      "runtime 이미지에 결과지 엔진 · 법정 문서 · db · ops · 글꼴 · Chromium 이 다 들어갑니다.");
  } catch (e) {
    const out = String((e as { stdout?: Buffer }).stdout ?? "");
    const miss = out.split("\n").filter((l) => l.startsWith("  없음")).length;
    add("DOCKER_RUNTIME", "BLOCKED",
      `${miss}가지가 최종 이미지에서 빠집니다. \`npm run image:check\` 가 어느 줄인지 적습니다.`,
      undefined);
  }
}

/* ── DOMAIN ─────────────────────────────────────────────────────────
   `PLATFORM_URL` 하나를 본다(설계 원칙 5). **못 열어 본 것은 모르는
   것이다**: 프록시에 막히면 UNKNOWN 이고, 밖에서 안 열린다는 뜻이 아니다. */
async function domainRow() {
  if (!(process.env.PLATFORM_URL ?? "").trim()) {
    return missingEnv("DOMAIN", "PLATFORM_URL",
      "손님이 가입하고 결제하는 자리이고 메일 링크와 결제 콜백도 이 주소로 돌아옵니다.",
      "Railway → 서비스 → Variables 의 PLATFORM_URL 이 "
      + "https://app.careermatri.com 인지 봅니다. 값을 바꾸지는 않습니다.");
  }
  const d = appDomain();
  if (!d.ok) return add("DOMAIN", "BLOCKED", d.reason);
  const p = await probeAppDomain();
  if (p.ok === true) return add("DOMAIN", "READY", p.detail);
  if (p.ok === false) return add("DOMAIN", "BLOCKED", `${d.url} · ${p.detail}`);
  add("DOMAIN", "UNKNOWN", `${d.url} · ${p.detail}`,
    `밖에서 \`curl -sI ${d.url}/api/health\` 를 한 번 쳐 봅니다. 200 이면 READY 입니다.`);
}

/* ── APP_ENV ────────────────────────────────────────────────────────
   staging 과 production 은 **다른 자물쇠**를 요구한다. 어느 쪽인지로
   요구가 갈리므로 한 줄에서 같이 본다. */
function appEnvRow() {
  const env = appEnv();
  const gate = stagingGate();
  const mock = mockPaymentsAllowed();

  if (env === "dev") {
    return IN_DEPLOYMENT
      ? add("APP_ENV", "BLOCKED",
        "밖에서 열리는 배포본인데 APP_ENV 가 비어 있어 dev 로 읽힙니다. " +
        "가짜 결제가 열린 채로 서 있습니다.")
      : add("APP_ENV", "UNKNOWN", "이 자리가 APP_ENV 를 들고 있지 않습니다.",
        "Railway → 서비스 → Variables 의 APP_ENV 가 staging 인지 봅니다. " +
        "이 회차에서는 staging 을 그대로 둡니다.");
  }
  if (env === "staging") {
    if (!gate) {
      return add("APP_ENV", "BLOCKED",
        "staging 인데 STAGING_BASIC_AUTH 가 비어 있습니다. 공개 전 배포본이 " +
        "누구에게나 열려 있고, 검색엔진도 같이 들어옵니다.");
    }
    return add("APP_ENV", "READY",
      "staging 입니다. 공개 전 자물쇠가 걸려 있고 가짜 결제로 흐름을 끝까지 " +
      "돌릴 수 있습니다. 운영으로 바꾸는 순서는 PRODUCTION_SWITCH.md 입니다.");
  }
  /* production */
  if (mock) {
    return add("APP_ENV", "BLOCKED",
      "production 인데 가짜 결제가 열려 있습니다. 코드가 막아야 하는 자리입니다.");
  }
  if (gate) {
    return add("APP_ENV", "BLOCKED",
      "production 인데 STAGING_BASIC_AUTH 가 남아 있습니다. 손님이 못 들어옵니다.");
  }
  add("APP_ENV", "READY", "production 입니다. 가짜 결제가 막혀 있습니다.");
}

/* ── DATABASE ───────────────────────────────────────────────────────
   **가리키는 데가 없으면 모르는 것이다.** 운영 DB 를 안 가리킨 자리에서
   "운영 DB 가 비어 있다" 고 적으면 거짓이 된다. */
async function databaseRow() {
  const url = (process.env.DATABASE_URL ?? "").trim();
  if (!url) {
    return add("DATABASE", "UNKNOWN", "이 자리가 DATABASE_URL 을 들고 있지 않습니다.",
      "Railway → Postgres → Variables 의 DATABASE_URL 을 넣고 다시 돌립니다. " +
      "값은 화면에 찍지 않습니다.");
  }
  const local = /localhost|127\.0\.0\.1|host=\/|\/var\/run\/postgresql/.test(url);
  const { queryOne } = await import("../src/lib/db");
  const tables = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('users','orders','entitlements','attempts',
                           'v2_responses','report_snapshots','evidence_profiles')`,
  ).catch(() => null);

  if (!tables) {
    return add("DATABASE", "BLOCKED",
      "DATABASE_URL 이 있는데 붙지 못했습니다. 주소·자격증명·네트워크 중 하나입니다.");
  }
  if (tables.n < 7) {
    return add("DATABASE", "BLOCKED",
      `핵심 표 7개 중 ${tables.n}개만 있습니다. \`npm run db:init\` 으로 세웁니다.`);
  }
  /**
   * 표가 서 있는 것과 **팔 수 있는 상태**는 다르다.
   *
   * 다섯을 더 본다. 전부 조회로 답할 수 있고, 하나라도 틀리면 그 자리에서
   * 장사가 안 되거나 같은 결제가 두 번 적힌다.
   */
  const deep = await queryOne<{
    products: number; admins: number; demo: number; fks: number; uniqs: number;
  }>(
    `SELECT
       (SELECT count(*)::int FROM products
         WHERE assessment_version='ME_V2' AND price_status='approved' AND active) AS products,
       (SELECT count(*)::int FROM memberships
         WHERE role IN ('superadmin','platform_super_admin')) AS admins,
       (SELECT count(*)::int FROM users WHERE is_demo) AS demo,
       (SELECT count(*)::int FROM pg_constraint
         WHERE contype='f' AND connamespace='public'::regnamespace) AS fks,
       (SELECT count(*)::int FROM (
          SELECT conname AS n FROM pg_constraint
          UNION ALL SELECT indexname FROM pg_indexes WHERE schemaname='public'
        ) x WHERE n IN ('orders_order_no_key','entitlements_order_uniq')) AS uniqs`,
  ).catch(() => null);

  const bad: string[] = [];
  if (!deep) bad.push("깊은 조회가 돌지 않았습니다");
  else {
    if (deep.products !== 6) bad.push(`승인된 ME_V2 상품이 ${deep.products}개(6개여야 합니다)`);
    if (deep.admins < 1) bad.push("운영자가 없습니다 — `npm run make:admin`");
    if (deep.uniqs < 2) bad.push(`중복 결제를 막는 제약이 ${deep.uniqs}/2`);
    if (deep.fks < 50) bad.push(`외래키가 ${deep.fks}개뿐입니다 — 스키마가 반쪽입니다`);
  }
  if (bad.length) {
    return add("DATABASE", "BLOCKED", bad.join(" · "));
  }

  /* **시연 자료는 막지 않고 경고한다.** 지우는 것은 사람이 판단할 일이고,
     지우라고 막아 버리면 그 줄 때문에 다른 줄을 못 본다 */
  const contam = (deep?.demo ?? 0) > 0
    ? ` **시연 사람 ${deep!.demo}명이 섞여 있습니다** — 공개 전에 걷어냅니다.`
    : "";
  const sound = `핵심 표 7개 · 승인 상품 6개 · 운영자 ${deep!.admins}명 · ` +
    `외래키 ${deep!.fks}개 · 중복 결제 제약 2개 · 시연 ${deep!.demo}명.`;

  if (local) {
    return add("DATABASE", "WARNING",
      `${sound} 다만 **이 자리에서만 사는 DB** 입니다. 운영 기록을 여기에 ` +
      `두면 세션이 끝날 때 결제 기록까지 사라집니다.${contam}`);
  }
  if ((process.env.DB_IS_PERSISTENT ?? "").trim() !== "yes") {
    return add("DATABASE", "WARNING",
      `바깥 호스트의 DB 입니다. ${sound} 지속형이 맞으면 DB_IS_PERSISTENT=yes 로 ` +
      `확인해 주십시오. 조회로는 거기까지 알 수 없습니다.${contam}`);
  }
  add("DATABASE", contam ? "WARNING" : "READY",
    `지속형 PostgreSQL. ${sound}${contam}`);
}

/* ── PDF_VOLUME ─────────────────────────────────────────────────────
   **구매자의 PDF 가 redeploy 때 사라지는 상태를 허용하지 않는다.**

   가려야 하는 것이 둘이다: 쓸 수 있는가, 그리고 **재배포를 넘기는가.**
   첫째는 써 보면 알고, 둘째는 그 자리가 마운트인지로 안다 — 이미지
   안쪽의 폴더는 재배포 때 이미지와 함께 새로 만들어진다. */
function pdfRow() {
  const v = pdfVolume();
  if (!v.dir) {
    return missingEnv("PDF_VOLUME", "REPORT_PDF_DIR",
      "결과지 PDF 가 어디에 쌓이는지 아무도 모릅니다.",
      "Dockerfile 이 /app/var/reports 로 못 박아 두므로 운영 이미지에서는 늘 차 있습니다. " +
      "Railway → 서비스 → Settings → Volumes 의 Mount path 가 그 자리인지 봅니다.");
  }
  if (v.persistent === true) return add("PDF_VOLUME", "READY", v.detail);
  if (v.persistent === false) return add("PDF_VOLUME", "BLOCKED", v.detail);
  add("PDF_VOLUME", "UNKNOWN", v.detail, v.how ?? "운영 컨테이너에서 돌립니다.");
}

/* ── EMAIL ──────────────────────────────────────────────────────────
   **자격증명이 없으면 BLOCKED 로 끝낸다.** 한 통도 안 나가는 상태를
   WARNING 으로 적으면, 가입한 사람이 메일을 기다리는 동안 화면은 노랑이다. */
function emailRow() {
  if (!mailReady()) {
    /* **이 줄은 배포본 밖에서도 BLOCKED 다.** 자격증명이 아직 어디에도
       없다는 것을 우리가 안다 — 받은 적이 없다. 못 본 것이 아니라 없는
       것이므로 UNKNOWN 으로 숨기지 않는다 */
    return add("EMAIL", "BLOCKED",
      "SMTP 자격증명이 없어 한 통도 나가지 않습니다. 코드 쪽은 " +
      "`npm run mail:check` 가 끝까지 확인합니다 — MAIL_HOST · MAIL_PORT · " +
      "MAIL_USER · MAIL_PASS · MAIL_FROM 다섯 줄만 남았습니다.");
  }
  const from = (process.env.MAIL_FROM ?? "").trim();
  if (!/^[^@\s<>]+@[^@\s<>.]+\.[^@\s<>]+$/.test(from.replace(/^.*<|>$/g, ""))) {
    return add("EMAIL", "BLOCKED", `MAIL_FROM 이 주소 꼴이 아닙니다: ${from}`);
  }
  add("EMAIL", "READY", `${from} 로 나갑니다. SPF·DMARC 는 \`npm run launch:check\` 가 봅니다.`);
}

/* ── LEGAL ──────────────────────────────────────────────────────────
   **runtime 에서 실제로 읽어 본다.** 저장소에 파일이 있는 것과 컨테이너가
   읽을 수 있는 것은 다른 말이고, 그 차이로 약관 셋이 한 번 통째로 비었다. */
async function legalRow() {
  const bad: string[] = [];
  for (const rel of LEGAL_FILES) {
    const got = await readLegalBody(rel);
    if (!got.ok) { bad.push(`${path.basename(rel)} ${got.why}`); continue; }
    const text = got.text.trim();
    if (text.length < 200) bad.push(`${path.basename(rel)} 본문 ${text.length}자`);
    else if (/준비 중|TODO|placeholder|lorem/i.test(text.slice(0, 400))) {
      bad.push(`${path.basename(rel)} 가 아직 자리만 잡아 둔 글입니다`);
    }
  }
  if (bad.length) {
    return add("LEGAL", "BLOCKED",
      `약관 본문 ${bad.length}개를 이 자리에서 읽을 수 없습니다 (${bad.join(" · ")}). ` +
      `화면은 200 을 내면서 가게는 약관이 없는 상태가 됩니다.`);
  }
  add("LEGAL", "READY", "약관·개인정보·환불 셋의 본문을 runtime 에서 읽었습니다.");
}

/* ── BUSINESS ───────────────────────────────────────────────────────
   일곱 칸 중 **통신판매업 신고번호 하나만 비어 있는 것은 일부러다.**
   아직 신청하지 않았고, 지어내지 않는다. 그것만 비었으면 WARNING 이고
   다른 칸이 비었으면 BLOCKED 다 — 고쳐야 할 사람이 다르다. */
async function businessRow() {
  const biz = await businessInfo();
  /* **표에 있는 값을 못 읽은 것과 비어 있는 것은 다르다.** 일곱 칸은
     `site_settings` 에 들어 있고, DB 를 안 들고 있으면 일곱 칸이 다 비어
     보인다. 그 자리에서 "표시가 안 됐다" 고 적으면 거짓이다 */
  if (!(process.env.DATABASE_URL ?? "").trim() && biz.missing.length === biz.fields.length) {
    return add("BUSINESS", "UNKNOWN",
      "일곱 칸이 site_settings 에 있고 이 자리는 DB 를 들고 있지 않습니다.",
      "DATABASE_URL 을 넣고 다시 돌리거나, /admin/business 화면을 봅니다.");
  }
  if (biz.complete) {
    return add("BUSINESS", "READY", "전자상거래법 제10조 표시 일곱 칸이 다 찼습니다.");
  }
  const onlyMailorder = biz.missing.length === 1
    && biz.fields.find((f) => f.key === "mailorder")?.value === null;
  if (onlyMailorder) {
    return add("BUSINESS", "WARNING",
      "통신판매업 신고번호만 비어 있습니다. **일부러입니다** — 아직 신청하지 " +
      "않았고 기존 사이트의 번호를 가져오지 않았습니다. 공개 화면에는 " +
      "'확인 필요' 로 그립니다. 이 한 칸 때문에 운영 판매 문이 닫혀 있는 것도 " +
      "그대로 둡니다.");
  }
  add("BUSINESS", "BLOCKED",
    `표시가 ${biz.missing.length}칸 비어 있습니다 (${biz.missing.join(" · ")}). ` +
    `/admin/business 에서 넣습니다.`);
}

/* ── BACKUP ─────────────────────────────────────────────────────────
   **복구해 보기 전까지 백업은 완료가 아니다.** 그리고 **사람이 날짜만
   적어서 READY 를 만들 수 없다**: 기록은 `backup-restore.sh` 가 끝까지 돈
   자리에서만 생기고, 환경변수로는 생기지 않는다. */
async function backupRow() {
  if (!(process.env.DATABASE_URL ?? "").trim()) {
    return add("BACKUP", "UNKNOWN", "기록이 DB 에 있고 이 자리는 DB 를 들고 있지 않습니다.",
      "DATABASE_URL 을 넣고 다시 돌립니다.");
  }
  const { get } = await import("../src/lib/settings");
  const at = (await get("backup_restore_verified_at").catch(() => null)) ?? "";
  const target = (await get("backup_restore_target").catch(() => null)) ?? "";
  if (!at) {
    return add("BACKUP", "BLOCKED",
      "복구를 한 번도 해 보지 않았습니다. `npm run backup:restore` 가 받고 · " +
      "새 임시 DB 에 붓고 · 줄 수와 제약과 결과지를 세고 · 그 기록을 남깁니다.");
  }
  const days = (Date.now() - new Date(at).getTime()) / 86_400_000;
  if (!Number.isFinite(days)) {
    return add("BACKUP", "BLOCKED", `복구 기록을 날짜로 읽을 수 없습니다 (${at}).`);
  }
  if (/localhost|127\.0\.0\.1|socket/.test(target)) {
    return add("BACKUP", "WARNING",
      `${at} 에 ${target} 에서 복구가 됐습니다. 절차는 도는데 **운영 DB 에서는 ` +
      `아직 해 보지 않았습니다.**`);
  }
  if (days > 90) {
    return add("BACKUP", "WARNING",
      `복구 시험이 ${Math.round(days)}일 전입니다(${target}). 90일 안에 다시 해 봅니다.`);
  }
  add("BACKUP", "READY", `${at} 에 ${target} 에서 복구가 됐습니다.`);
}

/* ── PAYMENT ────────────────────────────────────────────────────────
   **가짜 결제를 READY 로 적지 않는다.** 그리고 지금 BLOCKED 인 것이
   정상인 순서다 — 심사가 끝나지 않았다. */
function paymentRow() {
  const kr = marketReadiness("KR");
  if (kr.provider === "mock") {
    /* **이 줄도 배포본 밖에서 BLOCKED 다.** 대행사 계약이 아직 없다는
       것을 우리가 안다. 그리고 지금 막혀 있는 것이 **의도된 순서**다 */
    return add("PAYMENT", "BLOCKED",
      "가짜 결제입니다. PG 계약이 아직 없고, 붙이는 일은 이 회차에서 " +
      "시작하지 않습니다. 운영(APP_ENV=production)에서는 서버가 아예 뜨지 " +
      "않으므로, 이 줄이 막혀 있는 동안은 staging 으로 둡니다.");
  }
  if (!kr.ready) return add("PAYMENT", "BLOCKED", kr.blocker ?? "결제를 받을 수 없습니다.");
  add("PAYMENT", "READY", `${kr.provider} 로 한국 결제를 받습니다.`);
}

const MARK: Record<OpsStatus, string> = {
  READY: "READY  ", WARNING: "WARNING", BLOCKED: "BLOCKED", UNKNOWN: "UNKNOWN",
};

async function main() {
  deployRow();
  dockerRow();
  await domainRow();
  appEnvRow();
  await databaseRow();
  pdfRow();
  emailRow();
  await legalRow();
  await businessRow();
  await backupRow();
  paymentRow();

  /* 적어 둔 순서대로 찍는다. 열한 줄이 늘 같은 자리에 있어야 어제와
     비교할 수 있다 */
  const byArea = new Map(rows.map((r) => [r.area, r]));
  console.log(`\n── CareerMatri 운영 점검 ${new Date().toISOString().slice(0, 16).replace("T", " ")} ──\n`);
  for (const a of OPS_AREAS) {
    const r = byArea.get(a);
    if (!r) { console.log(`  UNKNOWN  ${a.padEnd(15)} 검사가 돌지 않았습니다.`); continue; }
    console.log(`  ${MARK[r.status]}  ${a.padEnd(15)} ${r.detail}`);
    if (r.how) console.log(`           ${" ".repeat(15)} → ${r.how}`);
  }

  const n = (s: OpsStatus) => rows.filter((r) => r.status === s).length;
  console.log(
    `\n  READY ${n("READY")} · WARNING ${n("WARNING")} · ` +
    `BLOCKED ${n("BLOCKED")} · UNKNOWN ${n("UNKNOWN")}`);

  /* **UNKNOWN 으로는 실패하지 않는다.** 못 본 것이 실패면 개발 PC 에서
     돌릴 때마다 빨간 줄이 남고, 그러면 BLOCKED 가 눈에 안 띈다 */
  const blocked = rows.filter((r) => r.status === "BLOCKED");
  if (blocked.length) {
    console.log(`\n  ${blocked.map((r) => r.area).join(" · ")} 가 막혀 있습니다.`);
  }
  console.log("");
  process.exit(blocked.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
