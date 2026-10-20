/**
 * R5 · 이미 떠 있는 Staging 을 **읽기만** 하며 학생 · 담당자 화면을 찍는다.
 *
 * DB 에 붙지 않고 저장소 코드를 부르지 않는다. 밖에서 브라우저 하나로 두드리는
 * 것이 전부라 GitHub 러너에서도 돈다(이 세션 컨테이너는 그 주소가 CONNECT 403 이다).
 * **새 계정을 만들지 않고 응시를 열지 않는다**: 받은 시험 계정으로 로그인해 이미
 * 있는 화면을 열고, 자리마다 URL · 응답 코드 · 시각 · 폭 · 그림을 적는다.
 *
 * 응시 · 제출 · 경합처럼 쓰는 걸음은 여기서 하지 않는다. 그쪽은 승인 뒤
 * `r33-e2e.ts` 를 그 배포본의 DB 와 함께 돌린다(`docs/metri/review/r5/04_RELEASE_GATE.md`).
 *
 *   STAGING_BASE=https://charming-reverence-staging.up.railway.app \
 *   STAGING_BASIC_AUTH=user:pw PCU_STUDENT_ID=.. PCU_STUDENT_PW=.. \
 *   PCU_ADMIN_ID=.. PCU_ADMIN_PW=.. OUT=var/r5-staging npx tsx scripts/lab/r5-staging-probe.ts
 *
 * 비밀값은 그림 · 로그 · 결과 파일 어디에도 적지 않는다(아이디는 앞 세 글자만).
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = (process.env.STAGING_BASE || "").replace(/\/$/, "");
const OUT = process.env.OUT || "var/r5-staging";
const VIEWS = { d: { width: 1440, height: 900 }, m: { width: 390, height: 844 }, s: { width: 360, height: 800 } } as const;
type View = keyof typeof VIEWS;

const STUDENT = [
  "/campus/pcu", "/me", "/me/state", "/me/next", "/me/experience", "/me/results", "/v3/start", "/my",
];
const ADMIN = ["/org/v3", "/org/v3/students"];
const ANON = ["/api/health", "/login", "/campus/pcu", "/me"];

type Row = { who: string; view: View; path: string; url: string; status: number | null; at: string; shot: string; note: string };
const rows: Row[] = [];
const mask = (s: string) => (s ? s.slice(0, 3) + "***" : "");

function gate() {
  const g = process.env.STAGING_BASIC_AUTH || "";
  return g.includes(":") ? { username: g.split(":")[0], password: g.slice(g.indexOf(":") + 1) } : undefined;
}

async function visit(ctx: BrowserContext, who: string, view: View, path: string) {
  const p = await ctx.newPage();
  await p.setViewportSize(VIEWS[view]);
  let status: number | null = null; let note = "";
  try {
    const r = await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
    status = r?.status() ?? null;
    await p.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
  } catch (e) { note = String(e).slice(0, 120); }
  const name = `${who}-${view}-${path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root"}.png`;
  await p.screenshot({ path: `${OUT}/shots/${name}`, fullPage: true }).catch(() => undefined);
  rows.push({ who, view, path, url: new URL(p.url()).pathname, status, at: new Date().toISOString(), shot: name, note });
  await p.close();
}

async function login(ctx: BrowserContext, id: string, pw: string, path: string): Promise<boolean> {
  const p: Page = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', id);
  await p.fill('input[type="password"]', pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !/\/login/.test(new URL(u).pathname), { timeout: 30000 }).catch(() => undefined);
  const ok = !/\/login/.test(new URL(p.url()).pathname);
  await p.close();
  return ok;
}

async function main() {
  if (!BASE) throw new Error("STAGING_BASE 가 비어 있다");
  mkdirSync(`${OUT}/shots`, { recursive: true });
  const b = await chromium.launch();
  const auth = gate();
  for (const view of Object.keys(VIEWS) as View[]) {
    const anon = await b.newContext({ httpCredentials: auth });
    for (const path of ANON) await visit(anon, "anon", view, path);
    await anon.close();

    const sid = process.env.PCU_STUDENT_ID || ""; const spw = process.env.PCU_STUDENT_PW || "";
    if (sid && spw) {
      const ctx = await b.newContext({ httpCredentials: auth });
      const ok = await login(ctx, sid, spw, "/campus/pcu/login");
      rows.push({ who: "student", view, path: "(login)", url: "", status: ok ? 200 : null, at: new Date().toISOString(), shot: "", note: `id ${mask(sid)} ${ok ? "로그인됨" : "로그인 실패"}` });
      if (ok) for (const path of STUDENT) await visit(ctx, "student", view, path);
      await ctx.close();
    }
    const aid = process.env.PCU_ADMIN_ID || ""; const apw = process.env.PCU_ADMIN_PW || "";
    if (aid && apw) {
      const ctx = await b.newContext({ httpCredentials: auth });
      const ok = await login(ctx, aid, apw, "/login");
      rows.push({ who: "admin", view, path: "(login)", url: "", status: ok ? 200 : null, at: new Date().toISOString(), shot: "", note: `id ${mask(aid)} ${ok ? "로그인됨" : "로그인 실패"}` });
      if (ok) {
        for (const path of ADMIN) await visit(ctx, "admin", view, path);
        /* 담당자에게 학생 개인 결과 PDF 는 기본 거절이어야 한다 */
        const sAtt = process.env.PCU_STUDENT_ATTEMPT || "";
        if (sAtt) await visit(ctx, "admin-deny", view, `/v3/${sAtt}/result/pdf`);
      }
      await ctx.close();
    }
  }
  await b.close();
  const head = "| 누구 | 폭 | 경로 | 도착 | HTTP | 시각(UTC) | 그림 | 메모 |\n|---|---|---|---|---|---|---|---|\n";
  writeFileSync(`${OUT}/staging-probe.md`,
    `# Staging 읽기 전용 확인\n\n주소 ${BASE} · 커밋 ${process.env.GITHUB_SHA || "(로컬)"} · ${new Date().toISOString()}\n\n` + head
    + rows.map((r) => `| ${r.who} | ${r.view} | ${r.path} | ${r.url} | ${r.status ?? "—"} | ${r.at} | ${r.shot} | ${r.note} |`).join("\n") + "\n");
  writeFileSync(`${OUT}/staging-probe.json`, JSON.stringify(rows, null, 2));
  const bad = rows.filter((r) => r.status !== null && r.status >= 500).length;
  console.log(`자리 ${rows.length} · 5xx ${bad}`);
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
