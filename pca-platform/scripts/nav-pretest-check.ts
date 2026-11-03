/**
 * **검사 전인 사람이 왼쪽 메뉴를 누르면 어디로 가는가.**
 *
 *   npm run build && bash scripts/stage-serve.sh 3150
 *   UI_BASE=http://127.0.0.1:3150 npm run nav:pretest
 *
 * 2026-10-27 신고: 학교에서 아이디를 받은 학생이 처음 들어와 메뉴를 누르면
 * 아무 일도 안 일어났다. 메뉴는 멀쩡한 링크였고, 그 쪽들이 전공을 못 정해
 * 말없이 `/cores` 로 돌려보내고 있었다. 학교 학생은 학과가 전공을 정하므로
 * 응시 전에도 쪽이 열려야 한다.
 *
 * 세는 것:
 * - 학교 학생(검사 전): 메뉴 전부가 그 자리에서 열리고(200) 되돌아가지 않는다
 * - 개인 회원(검사 전): 전공을 모르는 쪽은 전공 고르기로 가되, **까닭을 적는다**
 * - 어느 쪽에서도 500 이 없다
 */
import { loadEnv, BASE, login, makeStudent, registerCampusStudent } from "./_loop-fixture";
loadEnv();
/* eslint-disable import/first */
import { chromium } from "playwright";
import { allLeaves, university } from "../src/lib/campus/registry";

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

async function walk(who: string, pw: string) {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await login(ctx, who, pw);
  await p.goto(`${BASE}/cores`, { waitUntil: "networkidle" });
  const hrefs = [...new Set(await p.locator("nav a").evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? "").filter((h) => h.startsWith("/"))))];
  const out: { href: string; at: string; status: number; note: boolean }[] = [];
  for (const href of hrefs) {
    const r = await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" }).catch(() => null);
    const at = new URL(p.url()).pathname;
    const note = at === "/cores" && href !== "/cores"
      ? (await p.locator("main").innerText()).includes("검사를 시작하면 열립니다") : false;
    out.push({ href, at, status: r?.status() ?? 0, note });
  }
  await br.close();
  return out;
}

async function main(): Promise<void> {
  const leaves = allLeaves(university("PCU")!);
  const dept = (leaves.find((l) => l.leaf.core_code && /인공지능/.test(l.leaf.name))
    ?? leaves.find((l) => l.leaf.core_code))!.leaf;

  console.log("\n── 학교 학생 (검사 전)");
  const s = await makeStudent("zz-nav-campus");
  await registerCampusStudent(s.id, "PCU", dept.code);
  const a = await walk("zz-nav-campus", s.pw);
  ok(`메뉴 ${a.length}개가 전부 200`, a.every((x) => x.status === 200), a.filter((x) => x.status !== 200).map((x) => `${x.href}:${x.status}`).join(" "));
  ok("전공 고르기로 되돌아가는 메뉴가 없다", a.every((x) => x.at !== "/cores" || x.href === "/cores"),
    a.filter((x) => x.at === "/cores" && x.href !== "/cores").map((x) => x.href).join(" "));

  console.log("\n── 개인 회원 (검사 전)");
  const q = await makeStudent("zz-nav-fresh");
  const b = await walk("zz-nav-fresh", q.pw);
  ok("500 이 없다", b.every((x) => x.status < 500), b.filter((x) => x.status >= 500).map((x) => x.href).join(" "));
  const back = b.filter((x) => x.at === "/cores" && x.href !== "/cores");
  ok("전공 고르기로 보낼 때는 까닭을 적는다", back.every((x) => x.note), back.filter((x) => !x.note).map((x) => x.href).join(" "));

  console.log(`\n검사 전 메뉴 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
}
void main();
