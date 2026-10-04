/**
 * 역할마다 실제로 로그인해서 **어디로 떨어지고 무엇이 막히는지** 센다.
 *
 * 화면이 있다는 말과 그 화면이 제 역할에게만 열린다는 말은 다르다.
 * `rbac.ts` 의 표를 읽는 것으로는 뒤를 확인할 수 없어서, 브라우저로
 * 세 계정을 실제로 로그인시켜 남의 화면을 두드려 본다.
 *
 * 먼저 띄워 두어야 한다:
 *
 *   createdb cmlocal
 *   export DATABASE_URL=postgres://.../cmlocal
 *   npm run db:reset && npm run db:platform && npm run metri:seed && npm run db:seed
 *   AUTH_SECRET=$(openssl rand -base64 48) npx next dev -p 3100
 *   node scripts/platform-roles-probe.mjs
 *
 * 쓰는 계정은 `scripts/seed.ts` 가 만든 **개발용**이다. 비밀번호가 코드에
 * 적혀 있으니 밖에 나가는 곳에는 이 시드를 쓰지 않는다.
 */
import { mkdirSync } from "node:fs";
const OUT = "docs/metri/shots/platform";
mkdirSync(OUT, { recursive: true });
const B = "http://127.0.0.1:3100";
const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

const WHO = [
  ["운영사관리자", "admin", "pca-dev-admin-1234",
   ["/admin/organizations", "/admin/sites", "/admin/ops", "/org", "/my"]],
  ["기관담당자", "me-admin", "pca-dev-org-1234",
   ["/org", "/org/participants", "/org/insights", "/admin/organizations", "/admin/sites"]],
  ["기관참여자", "2021001234", "TempPass2026", ["/my", "/org", "/admin/organizations"]],
];
const rows = [];
for (const [tag, id, pw, paths] of WHO) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  await p.goto(`${B}/login`, { waitUntil: "networkidle" });
  await p.fill('input[name="loginId"], input[name="id"], input[type="text"]', id).catch(() => {});
  await p.fill('input[type="password"]', pw);
  await p.click('button[type="submit"]');
  /* 서버 액션이 쿠키를 심고 리다이렉트한다. 첫 홉에서 주소를 읽으면
     아직 /login 이라서, 로그인 화면을 벗어날 때까지 기다린다 */
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
    .catch(() => {});
  await p.waitForLoadState("networkidle");
  const landed = new URL(p.url()).pathname;
  rows.push(`${tag.padEnd(8)} 로그인 후 → ${landed}`);
  await p.screenshot({ path: `${OUT}/${tag}_00_로그인후.png` });
  for (const path of paths) {
    const r = await p.goto(B + path, { waitUntil: "networkidle" });
    const at = new URL(p.url()).pathname;
    const code = r ? r.status() : 0;
    const verdict = at === path ? `열림(${code})` : `막힘 → ${at}`;
    rows.push(`  ${path.padEnd(24)} ${verdict}`);
    if (at === path && code < 400) {
      await p.screenshot({ path: `${OUT}/${tag}_${path.replace(/\//g, "_")}.png`, fullPage: true });
    }
  }
  /* 첫 로그인인 참여자는 비밀번호를 바꾼 뒤에야 제 화면을 본다.
     거기까지 가 봐야 '읽기 전용이냐 작동하냐' 를 말할 수 있다 */
  if (new URL(p.url()).pathname === "/password/change") {
    const pw2 = "ProbePass-2026!";
    await p.fill('input[name="current"]', pw);
    await p.fill('input[name="next"]', pw2);
    await p.fill('input[name="confirm"]', pw2);
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !new URL(u).pathname.startsWith("/password"), { timeout: 20000 })
      .catch(() => {});
    rows.push(`  ${"(비밀번호 변경 후)".padEnd(24)} → ${new URL(p.url()).pathname}`);
    for (const path of ["/my", "/org", "/admin/organizations"]) {
      const r = await p.goto(B + path, { waitUntil: "networkidle" });
      const at = new URL(p.url()).pathname;
      rows.push(`  ${path.padEnd(24)} ${at === path ? `열림(${r.status()})` : `막힘 → ${at}`}`);
      if (at === path) await p.screenshot({ path: `${OUT}/${tag}_바꾼뒤${path.replace(/\//g, "_")}.png`, fullPage: true });
    }
  }
  await c.close();
}
await browser.close();
console.log(rows.join("\n"));
