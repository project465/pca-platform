/**
 * Phase 3.5 — **실제 렌더를 사람이 읽기 위한 캡처**.
 *
 * 자동검사가 녹색인지를 묻지 않는다. 묻는 것은 `처음 본 사람이 이 화면을
 * 완성된 유료 제품으로 느끼는가` 이고, 그 답은 그림을 봐야 나온다.
 *
 * 자리 목록을 주소로 열지 않고 **밟는 차례 그대로** 간다: 경험 2단은
 * 1단을 지나야 서고, 가린 판의 칸은 눌리지 않는다.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { BASE, gateCreds, makeStudent, cloneFinished, login, fillExperience } from "./_loop-fixture";

const OUT = "docs/metri/shots/accept";
const W = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const who = "accept-shot";
  const u = await makeStudent(who);
  const attempt = await cloneFinished(u.id);
  if (!attempt) throw new Error("끝낸 응시를 베껴 오지 못했습니다.");

  const br = await chromium.launch();
  const made: string[] = [];
  const bad: string[] = [];
  for (const [tag, size] of Object.entries(W)) {
    const ctx = await br.newContext({ viewport: size, httpCredentials: gateCreds() ?? undefined,
      deviceScaleFactor: 1, isMobile: tag === "mobile", hasTouch: tag === "mobile" });
    const p = await login(ctx, who, u.pw);
    /* **같은 그림이 두 이름으로 저장되면 걸린다.** 접힌 자리를 편다고
       `details` 만 열었더니 결과 상세가 요약과 **바이트까지 같게** 찍혔다.
       상태코드도 가로 스크롤도 멀쩡해서 아무 검사도 세지 않았다 */
    const seen = new Map<string, string>();
    const shot = async (name: string) => {
      await p.waitForTimeout(500);
      const f = `${OUT}/${name}__${tag}.png`;
      await p.screenshot({ path: f, fullPage: true });
      const h = createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);
      const twin = seen.get(h);
      if (twin) bad.push(`${name} ${tag}: ${twin} 과 같은 그림이다`);
      seen.set(h, name);
      made.push(f);
    };
    const go = async (path: string, name: string) => {
      await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await shot(name);
    };
    await go("/me", "01_home");
    await go("/me/state", "02_state");
    await go("/me/next", "03_next");
    /* 경험 세 걸음은 **밟아서** 찍는다 */
    await fillExperience(p, `수용성 캡처 ${tag}`, {
      onStep: async (n) => { await shot(`04_exp${n}`); },
    });
    await shot("05_exp_saved");
    await go(`/v3/${attempt}/result`, "06_result");
    /* 상세는 펴고 찍는다: 접힌 자리는 찍어도 아무것도 안 보인다 */
    await p.goto(`${BASE}/v3/${attempt}/result`, { waitUntil: "networkidle" });
    /* **`<details>` 를 여는 것만으로는 안 열린다**: 결과 본문의 접힌
       자리는 React 상태로 돌고(`detail.tsx`) `hidden` 으로 가려 둔다 */
    await p.locator(".rs-openbtn").first().click({ timeout: 5000 }).catch(() => undefined);
    await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelectorAll("details")
      .forEach((d) => { (d as HTMLDetailsElement).open = true; }));
    await shot("07_result_detail");
    await go("/me/results", "08_history");
    await go("/me/track", "09_track");
    await go("/me/experience", "10_exp_list");
    await ctx.close();
  }
  await br.close();
  console.log(`그림 ${made.length}장 — ${OUT}`);
  if (bad.length) {
    console.log(`\n걸린 것 ${bad.length}가지`);
    for (const b of bad) console.log("  걸림  " + b);
    process.exit(1);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
