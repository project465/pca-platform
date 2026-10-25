/**
 * 영어로 응시한 사람의 작업공간(`/me/*`)을 한 쪽씩 열어 한글이 남았는지 센다.
 *
 * 한국 자료에 서 있는 쪽(`WS_KR_ONLY`)은 영어 작업공간에 서지 않아야 하므로
 * 그 쪽은 "열리지 않거나 다른 곳으로 보낸다" 를 본다. 나머지 쪽은 한글 0 이어야 한다.
 * 시험 계정의 표시 이름은 사람이 적은 값이라 세지 않는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 ATTEMPT=<영어 응시 번호> OUT=<저장소 밖> npx tsx scripts/lab/ws-en-probe.ts
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { BASE, gateCreds, loadEnv, login } from "../_loop-fixture";
import { query, queryOne } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/password";
import { WS_KR_ONLY } from "../../src/lib/me-v3/ws-lang";

loadEnv();
const OUT = process.env.OUT ?? "";
const ATTEMPT = process.env.ATTEMPT ?? "";
const PAGES = ["/me", "/me/state", "/me/next", "/me/experience", "/me/experience/new", "/me/explore",
  "/me/results", "/me/recompute", "/me/prep", "/me/gap", ...WS_KR_ONLY];

async function main(): Promise<void> {
  if (!ATTEMPT) throw new Error("ATTEMPT 를 적으십시오");
  if (OUT) mkdirSync(OUT, { recursive: true });
  const u = await queryOne<{ id: string; login_id: string | null; email: string | null; display_name: string | null }>(
    `SELECT u.id::text, u.login_id, u.email, u.display_name FROM v3_attempts a JOIN users u ON u.id = a.user_id
      WHERE a.id = $1::bigint AND a.locale = 'en'`, [ATTEMPT]);
  if (!u) throw new Error("영어 응시가 아닙니다");
  const pw = randomBytes(9).toString("base64url");
  await query(`UPDATE users SET password_hash = $2 WHERE id = $1::bigint`, [u.id, await hashPassword(pw)]);
  const exp = await queryOne<{ id: string }>(`SELECT id::text FROM v3_experiences WHERE user_id = $1::bigint AND status <> 'draft' ORDER BY id LIMIT 1`, [u.id]);
  const pages = exp ? [...PAGES, `/me/experience/${exp.id}/edit`] : PAGES;

  const gate = gateCreds();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-US", ...(gate ? { httpCredentials: gate } : {}) });
  const p = await login(ctx, u.login_id ?? u.email ?? "", pw);
  const name = (u.display_name ?? "").trim();
  const rows: string[] = [];
  let bad = 0;
  for (const pg of pages) {
    const res = await p.goto(`${BASE}${pg}`, { waitUntil: "networkidle" }).catch(() => null);
    const landed = new URL(p.url()).pathname;
    let txt = await p.locator("main, body").first().innerText().catch(() => "");
    if (name) txt = txt.split(name).join("").split(name.slice(0, 1)).join("");
    const hits = [...new Set(txt.match(/[가-힣][가-힣\s·,./()0-9a-zA-Z-]{0,18}/g) ?? [])].slice(0, 6);
    const krOnly = WS_KR_ONLY.some((k) => pg === k || pg.startsWith(`${k}/`));
    const status = res?.status() ?? 0;
    const ok = krOnly ? (landed !== pg || status >= 300 || hits.length === 0) : (status < 400 && hits.length === 0);
    if (!ok) bad += 1;
    rows.push(`${ok ? "ok  " : "FAIL"} ${pg} → ${landed} (${status})${krOnly ? " [KR only]" : ""}${hits.length ? `  한글: ${hits.join(" | ")}` : ""}`);
    if (OUT) await p.screenshot({ path: path.join(OUT, `${pg.replace(/[\/\[\]]/g, "_") || "_me"}.png`), fullPage: true }).catch(() => undefined);
  }
  await browser.close();
  console.log(rows.join("\n"));
  if (OUT) writeFileSync(path.join(OUT, "REPORT.txt"), rows.join("\n") + "\n");
  console.log(`\n${pages.length - bad}/${pages.length} 통과`);
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
