/**
 * 응시 화면을 **사람이 누르는 차례 그대로** 끝까지 눌러 주는 조각.
 *
 * 세 자리가 이것을 따로 들고 있으면, 화면이 한 번 바뀐 날 한 곳만
 * 고쳐지고 나머지는 **아무것도 고르지 않은 응시를 만들어 놓고 통과**한다.
 * 이 저장소에서 이미 그 모양으로 깨진 적이 있어서 한 자리로 모은다
 * (`scripts/_loop-fixture.ts` 와 같은 까닭이다).
 */
import type { Locator, Page } from "playwright";

export async function pickOne(
  box: Locator, want: number,
): Promise<"ok" | "covered" | "none"> {
  const labels = box.locator("label");
  if (!(await labels.count())) return "none";
  const label = labels.nth(want);
  await label.scrollIntoViewIfNeeded().catch(() => undefined);
  await label.click({ timeout: 2500 }).catch(() => undefined);
  if (await box.locator('input[type="radio"]:checked').count()) return "ok";
  await label.locator('input[type="radio"]')
    .evaluate((el) => (el as HTMLInputElement).click()).catch(() => undefined);
  return (await box.locator('input[type="radio"]:checked').count()) ? "covered" : "none";
}

/**
 * 지금 화면을 답하고 다음으로 넘긴다. 사람이 누르는 순서와 같다.
 *
 * **단추를 글자로 찾지 않는다.** 전환 화면은 `계속` 이고 질문은 `다음`
 * 이고 끝은 `결과 만들기` 라, 글자로 찾으면 문구를 고친 날 예행이 멈춘다.
 *
 * 고르는 값은 한쪽 끝으로 밀지 않는다. 전부 가장 높은 칸을 누르면 응답
 * 품질이 `다시 볼 것` 으로 붙고, 그러면 예행이 만든 자료가 파일럿 표에서
 * 손볼 일로 선다.
 */
export async function walk(
  p: Page, max: number,
): Promise<{ screens: number; done: boolean; covered: number }> {
  let screens = 0, covered = 0, stuck = 0;
  for (let i = 0; i < max; i += 1) {
    await p.waitForLoadState("networkidle");

    /* 1. 고르는 묶음마다 하나씩. 이미 고른 자리는 덮지 않는다.
          **한 칸으로 밀지 않는다**: 열두 영역에 같은 값을 넣으면 영역
          사이에 차이가 없어 `차이 적음` 이 붙고, 그 응답으로는 결과지가
          사람을 가르는지 볼 수 없다. 화면 차례로 조금씩 흔든다 */
    const was = p.url();
    /* **영역 훑기의 줄도 고르는 묶음이다.** 열두 줄이 한 화면에 서고 줄마다
       보기가 셋이라, `fieldset.qs-opts` 만 찾으면 그 화면에서 아무것도
       고르지 않고 넘어간다 */
    const boxes = p.locator("fieldset.qs-opts, fieldset.qs-sw, .qs-cards, .qs-list");
    const bn = await boxes.count();
    let advanced = false;
    for (let g = 0; g < bn; g += 1) {
      const box = boxes.nth(g);
      /* 복수 선택 자리는 네모라 `radio` 로만 세면 매번 다시 고른다 */
      if (await box.locator("input:checked").count()) continue;
      const labels = box.locator("label");
      const n = await labels.count();
      if (!n) continue;
      const shake = [0.8, 0.4, 1, 0.2, 0.6][(i + g) % 5];
      const want = n <= 2 ? 0 : Math.min(n - 1, Math.round((n - 1) * shake));
      const how = await pickOne(box, want);
      if (how === "covered") covered += 1;
      await p.waitForTimeout(40);
      /* **한 선택으로 끝나는 화면은 눌리면 저절로 넘어간다.** 그 뒤에
         `다음` 을 또 누르면 한 화면을 건너뛴다 */
      if (p.url() !== was) { advanced = true; break; }
    }
    if (advanced) {
      screens += 1;
      await p.waitForLoadState("networkidle");
      stuck = 0;
      continue;
    }

    /* 2. 근거 칩은 묶음마다 둘. 소유는 근거 둘 이상일 때만 선다.
          **이미 고른 칩을 다시 누르지 않는다**: 칩은 켜고 끄는 자리라
          같은 자리를 다시 누르면 꺼진다. 한 화면을 두 번 지나면 고른 것이
          사라지고, 그 자리에서 영영 못 넘어간다 */
    const groups = p.locator(".qs-chips");
    const gn = await groups.count();
    for (let g = 0; g < gn; g += 1) {
      const chips = groups.nth(g).locator("label.qs-chip");
      const cn = await chips.count();
      let on = await groups.nth(g).locator('input:checked').count();
      for (let c = 0; c < cn && on < 2; c += 1) {
        const chip = chips.nth(c);
        if (await chip.locator("input:checked").count()) continue;
        await chip.scrollIntoViewIfNeeded().catch(() => undefined);
        await chip.click({ timeout: 2500 }).catch(() => undefined);
        on = await groups.nth(g).locator('input:checked').count();
        await p.waitForTimeout(40);
      }
    }

    /* 3. 덧붙이는 한 줄. **응답이 아니다** — 결과지가 그 사람 말로 옮길 때 읽는다 */
    const areas = p.locator("textarea");
    const an = await areas.count();
    for (let t = 0; t < an; t += 1) {
      if (await areas.nth(t).inputValue().catch(() => "")) continue;
      await areas.nth(t).fill("구속 조건과 하중을 직접 정해 해석에 넣었습니다.")
        .catch(() => undefined);
      await areas.nth(t).blur().catch(() => undefined);
    }

    screens += 1;

    /* 4. 끝 화면이면 결과로 */
    const seeResult = p.locator("a.qs-btn-main");
    if (await seeResult.count()) {
      await seeResult.first().click().catch(() => undefined);
      await p.waitForLoadState("networkidle");
      return { screens, done: true, covered };
    }
    const go = p.locator("button.qs-btn-main");
    if (!(await go.count())) return { screens, done: false, covered };
    const before = p.url();
    await go.first().click({ force: true }).catch(() => undefined);
    await p.waitForTimeout(400);
    await p.waitForLoadState("networkidle");
    if (/\/result/.test(p.url())) return { screens, done: true, covered };
    if (p.url() === before) {
      /* **같은 자리에서 맴돌면 그만둔다.** 사백 번을 돌고 나서 `끝까지 가지
         못했다` 만 적으면 어디서 막혔는지 모른다. 세 번 더 보고 멈춘다 */
      stuck += 1;
      if (stuck < 3) continue;
      return { screens, done: false, covered };
    }
    stuck = 0;
  }
  return { screens, done: false, covered };
}

/** 알약으로 고르는 자리. `select` 가 아니라 `label` 을 누른다 */
export async function pickByValue(
  p: Page, name: string, value: string,
): Promise<void> {
  const input = p.locator(`input[name="${name}"][value="${value}"]`);
  if (!(await input.count())) return;
  const label = p.locator(`label:has(input[name="${name}"][value="${value}"])`);
  await (await label.count() ? label.first() : input.first())
    .click({ force: true }).catch(() => undefined);
  await p.waitForTimeout(80);
}
