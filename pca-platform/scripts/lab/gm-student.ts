/**
 * **Track E · 학생 한 사람의 Gold Master PDF 를 뽑는다.** 운영 PDF 경로
 * (`/v3/{id}/result/pdf` · `var/reports`)와 연결하지 않는다.
 *
 *   DATABASE_URL=... ATTEMPT=<응시> AS=<요청한 사람 user id> npx tsx scripts/lab/gm-student.ts
 *     → var/gm-out/<응시>/BIZ-PRO.pdf · MANIFEST.json   (실패하면 FAIL.json)
 *
 * 차례: 권한 → 입력 고정(`report-gm/inputs.ts`) → 렌더(`full6`) → 인쇄 → 기록.
 * **같은 입력이면 같은 HTML 이 나온다**: MANIFEST 의 html_sha256 으로 견준다.
 * 실패는 걸음과 까닭을 FAIL.json 에 남기고, 덜 만든 PDF 를 남기지 않는다.
 * 인쇄는 두 번까지 다시 해 본다(브라우저가 뜨다 끊기는 일이 가장 흔하다).
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { query } from "../../src/lib/db";
import { build3 } from "../../src/lib/me-v3/report-gm/report3";
import { full6 } from "../../src/lib/me-v3/report-gm/render6";
import type { Lib } from "../../src/lib/me-v3/report-gm/render5";
import { canDownloadGm, frozenInput, GM_INPUT_VERSION, type GmRequester } from "../../src/lib/me-v3/report-gm/inputs";

const OUT_ROOT = process.env.GM_OUT ?? path.resolve("var/gm-out");
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");

/** 넘치면 그 쪽의 글만 줄인다(gm-full6 과 같은 규칙 · 최대 17%) */
const FIT_JS = `(() => {
  const over = (pg) => { const box = pg.querySelector(".bd").getBoundingClientRect(); let max = 0;
    for (const e of pg.querySelectorAll(".bd *")) { const b = e.getBoundingClientRect(); if (b.height) max = Math.max(max, b.bottom); }
    return Math.round(max - box.bottom); };
  return [...document.querySelectorAll(".pg")].map((pg) => {
    const bd = pg.querySelector(".bd"); if (!bd) return 0;
    let o = over(pg), z = 1;
    while (o > 0 && z > 0.83) { z = Math.round((z - 0.01) * 100) / 100; for (const c of bd.children) c.style.zoom = String(z); o = over(pg); }
    return o;
  });
})()`;

export async function requesterOf(userId: string): Promise<GmRequester> {
  const orgs = await query<{ id: string; code: string; role: string }>(
    `SELECT o.id::text, coalesce(o.code,'') AS code, m.role FROM memberships m JOIN organizations o ON o.id = m.org_id
      WHERE m.user_id = $1 AND m.role IN ('org_admin','instructor')`, [userId]);
  return {
    userId,
    role: orgs.some((o) => o.role === "org_admin") ? "org_admin" : orgs.length ? "instructor" : "student",
    orgs: orgs.map((o) => ({ id: Number(o.id), code: o.code })),
  };
}

export type GmResult =
  | { ok: true; pdf: string; manifest: Record<string, unknown> }
  | { ok: false; step: string; reason: string };

export async function generate(attemptId: string, requester: GmRequester): Promise<GmResult> {
  const dir = path.join(OUT_ROOT, attemptId);
  const fail = (step: string, reason: string): GmResult => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "FAIL.json"), JSON.stringify({ attempt_id: attemptId, step, reason, at: new Date().toISOString() }, null, 1));
    return { ok: false, step, reason };
  };
  /* 1 권한 */
  const may = await canDownloadGm(requester, attemptId).catch((e) => ({ ok: false, who: "none" as const, reason: String(e) }));
  if (!may.ok) return { ok: false, step: "permission", reason: may.reason ?? "거절" };
  /* 2 입력 고정 */
  let input, reused;
  try { ({ input, reused } = await frozenInput(attemptId)); } catch (e) { return fail("input", String(e)); }
  /* 3 렌더 */
  let html: string, pages: number, skipped: number, versions: unknown = null;
  try {
    const r = build3(input.result_model, { ...input.meta, tier: input.tier }, input.experiences);
    const lib: Lib = {
      toc: J("data/report-gm/biz-pro-toc.v1.json"), dart: J("data/region/dart-checks.v1.json"),
      overview: J("data/region/dart-overview.v1.json"), roles: J("data/report-gm/biz-role-guide.json"),
      orgs: J("data/region/kr-chungcheong-orgs.v2.json"),
      domains: r.map.map((m) => ({ code: m.code, name: m.name })), versions: r.versions,
    };
    const fontsDir = path.resolve("var/pdf-gm/fonts/pretendard");
    const f = existsSync(path.join(fontsDir, "Pretendard-Regular.woff2")) || existsSync(path.join(fontsDir, "Pretendard-Regular.otf"))
      ? { href: "fonts/pretendard", family: "Pretendard" as const } : { href: "fonts/nanum", family: "NanumGothic" as const };
    const out = full6(r, lib, f);
    html = out.html; pages = out.pages.length; skipped = out.skipped.length; versions = r.versions;
  } catch (e) { return fail("render", String(e)); }
  /* 4 인쇄 (두 번까지 다시) */
  mkdirSync(dir, { recursive: true });
  /* 글꼴은 HTML 옆 상대 경로로 읽힌다. 작업 폴더 var/pdf-gm 아래에 둔다 */
  const work = path.resolve("var/pdf-gm");
  const htmlFile = path.join(work, `gm-student-${attemptId}.html`);
  writeFileSync(htmlFile, html);
  const tmp = path.join(dir, "BIZ-PRO.pdf.part");
  let over: number[] = [], lastErr = "";
  for (let i = 0; i < 3; i++) {
    try {
      const { chromium } = await import("playwright");
      const exe = process.env.GM_CHROMIUM || undefined;
      const b = await chromium.launch({ args: ["--no-sandbox"], executablePath: exe });
      try {
        const p = await b.newPage();
        await p.goto("file://" + htmlFile, { waitUntil: "load" });
        await p.evaluate("document.fonts.ready");
        await p.emulateMedia({ media: "print" });
        over = await p.evaluate(FIT_JS) as number[];
        await p.pdf({ path: tmp, format: "A4", printBackground: true, preferCSSPageSize: true });
      } finally { await b.close(); }
      lastErr = ""; break;
    } catch (e) { lastErr = String(e).slice(0, 300); rmSync(tmp, { force: true }); }
  }
  if (lastErr) return fail("print", lastErr);
  if (over.some((o) => o > 0)) { rmSync(tmp, { force: true }); return fail("layout", `넘친 쪽 ${over.filter((o) => o > 0).length}`); }
  const pdf = path.join(dir, "BIZ-PRO.pdf");
  renameSync(tmp, pdf);
  rmSync(path.join(dir, "FAIL.json"), { force: true });
  const manifest = {
    attempt_id: attemptId, requester: may.who, input_version: GM_INPUT_VERSION,
    input_sha256: input.sha256, input_reused: reused, frozen_at: input.frozen_at,
    experiences_used: input.experiences.length, experiences_excluded: input.excluded,
    pages, skipped, html_sha256: sha(html), pdf_sha256: sha(readFileSync(pdf)),
    versions,
    made_at: new Date().toISOString(),
  };
  writeFileSync(path.join(dir, "MANIFEST.json"), JSON.stringify(manifest, null, 1));
  return { ok: true, pdf, manifest };
}

if (require.main === module) {
  (async () => {
    const id = process.env.ATTEMPT ?? ""; const as = process.env.AS ?? "";
    if (!id || !as) { console.error("ATTEMPT 와 AS(요청한 사람 user id)가 필요하다"); process.exit(2); }
    const r = await generate(id, await requesterOf(as));
    console.log(JSON.stringify(r.ok ? { ok: true, pdf: r.pdf, pages: r.manifest.pages, html: String(r.manifest.html_sha256).slice(0, 16) } : r));
    process.exit(r.ok ? 0 : 1);
  })().catch((e) => { console.error(e); process.exit(1); });
}
