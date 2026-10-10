/**
 * 제품 루프를 눌러 보는 검사들이 **같은 바탕**에서 출발하게 한다.
 *
 * 세 자리가 같은 줄을 들고 있었다(`v3:loop` · `v3:product-loop` ·
 * 루프 캡처). 사람을 만들고 끝낸 응시를 베껴 오고 로그인하고 세 걸음짜리
 * 경험 폼을 적는 일이 전부 같은데, 따로 적어 두면 **경험 폼이 세 걸음으로
 * 바뀐 날 한 곳만 고쳐진다.** 실제로 그 모양으로 깨질 자리였다: 가린
 * 판의 칸은 눌리지 않아서, 걸음을 넘기지 않고 고르면 아무것도 골리지
 * 않은 채로 저장되고 **검사가 끊긴 루프를 통과시킨다.**
 *
 * **열쇠는 부르는 자리에서 만들고 해시만 DB 에 남긴다.** 저장소에도
 * 문서에도 로그에도 적지 않는다.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** `.env.local` 을 먼저 읽는다. 들여오는 쪽보다 먼저 돌아야 한다 */
export function loadEnv(): void {
  for (const line of (() => {
    try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
    catch { return [] as string[]; }
  })()) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

/* eslint-disable import/first */
import type { BrowserContext, Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

export const BASE = (process.env.UI_BASE || process.env.BASE
  || "http://127.0.0.1:3000").replace(/\/$/, "");

/**
 * **지금 떠 있는 서버가 지금 빌드를 내주고 있는가.**
 *
 * `npm run build` 는 `.next/standalone` 을 통째로 지우고 다시 만든다.
 * 그때 떠 있던 서버는 **지워진 디렉터리를 cwd 로 들고** 계속 돌고,
 * 쪽은 멀쩡히 뜨는데 `sites/...` 를 상대 경로로 읽는 자리가 전부
 * ENOENT 로 500 이 된다. 그 500 이 격리 검사에서는
 * `남의 화면이 열리지 않는다` 처럼 보였다 — **고친 것이 아니라 서버가
 * 낡은 것이었다.**
 *
 * 띄우는 쪽이 `var/.serving-build` 에 적어 두고(그 자리는 `.next` 밖이라
 * 지워지지 않는다) 여기서 지금 빌드와 견준다. 다르면 그 자리에서 멈춘다:
 * 낡은 서버에서 돌린 결과는 초록이든 빨강이든 아무것도 말하지 않는다.
 */
export function assertFreshServer(): void {
  const read = (f: string) => {
    try { return readFileSync(resolve(process.cwd(), f), "utf8").trim(); }
    catch { return ""; }
  };
  const built = read(".next/BUILD_ID");
  const serving = read("var/.serving-build");
  if (!built || !serving || built === serving) return;
  throw new Error(
    `떠 있는 서버가 지난 빌드입니다(${serving} ≠ ${built}).`
    + " `npm run stage:serve <포트>` 로 다시 띄우십시오.");
}

/** 공개 전 배포본의 자물쇠. **우리도 그 문을 지난다** */
export function gateCreds(): { username: string; password: string } | null {
  const g = process.env.STAGING_BASIC_AUTH || "";
  if (!g.includes(":")) return null;
  return { username: g.split(":")[0], password: g.slice(g.indexOf(":") + 1) };
}

/**
 * 학생 하나를 그 자리에서 만든다.
 *
 * **`me-admin` 으로 재지 않는다.** 그 계정은 기관 담당자라 첫 화면이
 * `/org` 이고, 그것이 맞는 동작이다. 루프를 재려면 학생이어야 한다.
 */
export async function makeStudent(login: string): Promise<{ id: string; pw: string }> {
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [login]);
  if (old) {
    for (const t of ["v3_experiences", "v3_actions", "career_events",
                     "career_profiles", "memberships", "entitlements",
                     "analytics_events", "v3_attempts"]) {
      await query(`DELETE FROM ${t} WHERE user_id = $1`, [old.id]).catch(() => undefined);
    }
    await query(`DELETE FROM users WHERE id = $1`, [old.id]).catch(() => undefined);
  }
  const pw = randomBytes(18).toString("base64url");
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, is_demo, must_reset_pw)
     VALUES ($1,$1,'제품 루프 점검',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
    [login, await hashPassword(pw)]);
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, NULL, 'student')
       ON CONFLICT DO NOTHING`, [row?.id]).catch(() => undefined);
  return { id: row?.id as string, pw };
}

/**
 * 끝낸 응시 하나를 이 사람 앞으로 베껴 둔다.
 *
 * **검사를 다시 풀지 않는다.** 여기가 재는 것은 결과를 받은 사람의 다음
 * 걸음이고, 검사가 도는지는 `v3:runtime` 이 센다.
 *
 * **응답까지 함께 옮긴다**: 반영 계획이 그 응답을 읽어 어느 축이
 * 올라가는지 정한다. 응시만 옮기면 계획이 늘 비어 **끊긴 루프를 검사가
 * 통과시킨다.**
 */
export async function cloneFinished(
  userId: string, tier?: "BASIC" | "STANDARD" | "PRO",
): Promise<string | null> {
  /* **등급을 고를 수 있어야 한다.** 결과지의 쪽 길이는 등급이 정하므로
     (BASIC 4쪽 · PRO 10쪽) 길이를 재는 검사는 세 등급을 다 봐야 한다.
     인자가 없으면 전처럼 가장 최근 것 하나다 */
  const src = await queryOne<{ id: string }>(
    `SELECT a.id::text FROM v3_attempts a
       JOIN v3_snapshots s ON s.attempt_id = a.id
      WHERE a.user_id <> $1 AND a.status = 'scored'
        AND s.result_model IS NOT NULL
        AND ($2::text IS NULL OR a.tier = $2)
      ORDER BY s.created_at DESC LIMIT 1`, [userId, tier ?? null]);
  if (!src) return null;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO v3_attempts
       (user_id, tier, core_code, market_code, education_stage, grad_field,
        assessment_version, item_bank_version, scoring_version, status,
        current_screen, opened_probe, opened_deep, fourth_reason,
        industry_pack, role_pack, started_at, last_saved_at, submitted_at,
        undergrad_core, industry_interest, role_interest, org_interest)
     SELECT $1, tier, core_code, market_code, education_stage, grad_field,
            assessment_version, item_bank_version, scoring_version, status,
            current_screen, opened_probe, opened_deep, fourth_reason,
            industry_pack, role_pack, started_at, last_saved_at, submitted_at,
            undergrad_core, industry_interest, role_interest, org_interest
       FROM v3_attempts WHERE id = $2::bigint
     RETURNING id::text`, [userId, src.id]);
  const id = row?.id;
  if (!id) return null;
  await query(
    `INSERT INTO v3_responses (attempt_id, item_id, kind, value_int, value_text,
                               answered_at, note_text)
     SELECT $1::bigint, item_id, kind, value_int, value_text, answered_at, note_text
       FROM v3_responses WHERE attempt_id = $2::bigint`, [id, src.id]);
  await query(
    `INSERT INTO v3_evidence_picks (attempt_id, domain_code, slot, item_text)
     SELECT $1::bigint, domain_code, slot, item_text
       FROM v3_evidence_picks WHERE attempt_id = $2::bigint`, [id, src.id]);
  await query(
    `INSERT INTO v3_snapshots (attempt_id, module_versions, response_quality,
                               payload, result_model, result_model_version,
                               result_copy_version)
     SELECT $1::bigint, module_versions, response_quality, payload,
            result_model, result_model_version, result_copy_version
       FROM v3_snapshots WHERE attempt_id = $2::bigint`, [id, src.id]);
  /* **결과 안에 적힌 응시 번호도 함께 옮긴다.** 굳은 결과는 자기 응시
     번호를 품고 있고 작업공간이 `결과 보기` 를 그 번호로 건다. 안 옮기면
     베껴 온 사람의 홈이 **남의 응시로 가는 링크**를 세우고 404 가 난다 */
  await query(
    `UPDATE v3_snapshots
        SET result_model = jsonb_set(result_model, '{attempt_id}', to_jsonb($1::text))
      WHERE attempt_id = $2::bigint AND result_model IS NOT NULL`, [id, id]);
  return id;
}

export async function login(
  ctx: BrowserContext, who: string, pw: string,
): Promise<Page> {
  /* 낡은 서버에서 돌린 결과는 초록이든 빨강이든 아무것도 말하지 않는다 */
  assertFreshServer();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', who);
  await p.fill('input[type="password"]', pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
    .catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  return p;
}

/**
 * 세 걸음짜리 경험 폼을 끝까지 적는다(규격 §4).
 *
 * **걸음을 넘기면서 고른다.** 지금 걸음이 아닌 판은 `hidden` 이고 가린
 * 칸은 눌리지 않는다. `다음` 을 누르지 않고 고르면 아무것도 골리지 않은
 * 채로 저장된다.
 *
 * **한 자리에 둘을 고른다.** 근거가 둘이어야 `직접 수행` 으로 올라가고,
 * 하나만 고르면 올라가는 자리가 없어 `달라진 것` 이 늘 빈다.
 *
 * 돌려주는 값은 **실제로 켜진 기술영역의 수**다. 0 이면 그 뒤의 모든
 * 확인이 뜻을 잃는다.
 */
export async function fillExperience(
  p: Page, title: string, hooks?: { onStep?: (n: number) => Promise<void> },
): Promise<number> {
  await p.goto(`${BASE}/me/experience/new`, { waitUntil: "networkidle" });
  await p.fill('input[name="title"]', title);
  const month = await p.$('input[name="started_on"]');
  if (month) await month.fill("2025-03");
  await p.locator('.cm-pick:has(input[name="kind"])').first()
    .click({ timeout: 3000 }).catch(() => undefined);
  if (hooks?.onStep) await hooks.onStep(1);

  const next = p.locator('.cm-wiz-nav button:has-text("다음")');
  await next.click({ timeout: 5000 });
  const tds = p.locator('.cm-pick:has(input[name="td"]):visible');
  const nTd = await tds.count();
  for (let i = 0; i < Math.min(nTd, 2); i += 1) {
    await tds.nth(i).click({ timeout: 3000 }).catch(() => undefined);
  }
  await p.waitForTimeout(400);
  for (const nm of ["problem", "decision"]) {
    const g = p.locator(`.cm-pick:has(input[name="${nm}"]):visible`);
    for (let i = 0; i < Math.min(await g.count(), 2); i += 1) {
      await g.nth(i).click({ timeout: 3000 }).catch(() => undefined);
    }
  }
  if (hooks?.onStep) await hooks.onStep(2);

  await next.click({ timeout: 5000 }).catch(() => undefined);
  await p.waitForTimeout(300);
  for (const nm of ["artifact", "verification", "used_where"]) {
    const g = p.locator(`.cm-pick:has(input[name="${nm}"]):visible`);
    for (let i = 0; i < Math.min(await g.count(), 2); i += 1) {
      await g.nth(i).click({ timeout: 3000 }).catch(() => undefined);
    }
  }
  if (hooks?.onStep) await hooks.onStep(3);

  const checked = await p.$$eval('input[name="td"]',
    (xs) => xs.filter((x) => (x as HTMLInputElement).checked).length);
  await p.locator('.cm-wiz-nav button[type="submit"]').last().click({ force: true });
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.waitForTimeout(1200);
  return checked;
}
