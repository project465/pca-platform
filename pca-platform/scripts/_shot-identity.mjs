/**
 * 찍은 그림이 **그 화면이라는 증거**.
 *
 * 이 파일이 있는 까닭은 한 번 호되게 당해서다. 작업공간 캡처 스물두
 * 자리 가운데 일곱(파일 스물한 장)이 전부 같은 그림이었다: `/my` 와
 * 빈 상태 다섯 쪽이 전부 **`비밀번호를 정해주세요`** 화면이었다. 찍는
 * 쪽이 로그인을 "주소가 `/login` 으로 시작하지 않으면 됐다" 로만 재고
 * 있었고, 첫 로그인 강제 변경이 걸린 계정은 `/password/change` 로
 * 떨어지므로 그 검사를 지나갔다. 그 화면은 200 이고 내부 코드도 없고
 * 가로 스크롤도 없어서 **나머지 검사도 전부 통과했다.**
 *
 * 그래서 재는 것을 바꾼다. 상태 코드는 "서버가 뭔가를 돌려줬다" 까지만
 * 말한다. 그림을 남기기 전에 **이 주소의 이 화면이 맞는가**를 묻는다.
 *
 *   ① 주소        — 떨어진 자리가 노린 자리인가
 *   ② 큰 글씨     — 그 쪽의 머리글이 섰는가
 *   ③ 가르는 글자 — 그 쪽에만 있는 글귀가 있는가
 *
 * ③ 이 가장 중요하다. 결과지 캡처에서 ①②만 맞으면 지나가는 자리를
 * 일부러 만들어 봤더니 그대로 통과했다(두 문항이 한 화면에 선 자리는
 * 큰 글씨가 전부 같다). **가르는 신호가 맞아야 통과다.**
 */

/**
 * 로그인했는데 떨어지는 자리들. 전부 200 이라 상태 코드로는 안 걸린다.
 *
 * **머리글로도 본다**: `/password/change` 는 주소로 잡히지만, 어떤
 * 배포본은 같은 쪽을 다른 주소에서 그린다.
 */
export const FALLBACK_PATHS = [
  "/login", "/signup", "/password/change", "/password/forgot", "/start",
];

export const FALLBACK_HEADINGS = [
  "비밀번호를 정해주세요",
  "비밀번호를 잊으셨나요",
  "다시 오셨군요",
  "공개 전입니다",
  "문제가 생겼습니다",
  "찾을 수 없습니다",
];

/** 그 주소가 떨어지는 자리인가 */
export function isFallbackPath(pathname) {
  return FALLBACK_PATHS.some((f) => pathname === f || pathname.startsWith(`${f}/`));
}

/**
 * 로그인하고 **어디에 떨어졌는지까지 확인한다.**
 *
 * `who` 는 `{ id, pw }` 다. **비밀번호를 다른 스크립트의 소스에서 긁어
 * 오지 않는다**: 긁어 오던 쪽이 첫 로그인 강제 변경을 몰랐다.
 */
export async function loginAs(ctx, who, base) {
  const { id, pw } = who;
  if (!id || !pw) throw new Error(`계정 정보가 모자랍니다: ${JSON.stringify(who)}`);
  const p = await ctx.newPage();
  await p.goto(`${base}/login`, { waitUntil: "networkidle" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', id);
  await p.fill('input[type="password"]', pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
    .catch(() => {});

  const at = new URL(p.url()).pathname;
  const head = await p.evaluate(() =>
    (document.querySelector("h1")?.textContent ?? "").trim());
  await p.close();

  if (at.startsWith("/login")) throw new Error(`로그인이 안 됐습니다: ${id}`);
  /* **여기서 멈춘다.** 비밀번호 변경이 걸린 계정으로 찍으면 모든 그림이
     그 화면이 되고, 그때 걸리는 검사가 하나도 없다 */
  if (isFallbackPath(at)) {
    throw new Error(
      `로그인 뒤 ${at} 로 떨어졌습니다 (${id}). 찍을 수 있는 계정이 아닙니다`
      + ` — 첫 로그인 비밀번호 변경이 걸려 있지 않은지 보십시오.`);
  }
  if (FALLBACK_HEADINGS.some((h) => head.includes(h))) {
    throw new Error(`로그인 뒤 "${head}" 화면입니다 (${id}).`);
  }
  return at;
}

/**
 * 지금 떠 있는 쪽이 **노린 그 화면인가.**
 *
 * `want` 는 `{ route, heading, must }` 이고 셋 다 선택이다. 적어 둔
 * 것만 센다. 적어 두지 않으면 떨어지는 자리만 거른다.
 */
export async function verifyScreen(page, want = {}) {
  const url = new URL(page.url());
  const at = url.pathname;
  const text = await page.evaluate(() => document.body.innerText);
  const head = await page.evaluate(() =>
    [...document.querySelectorAll("h1, .cm-h1, .rs-h1, .qs-q")]
      .map((e) => (e.textContent ?? "").trim()).join(" · "));

  const miss = [];
  /* **노리고 간 자리면 떨어진 것이 아니다.** 로그인 화면 자체를 찍을
     때는 `/login` 이 목적지다. 적어 둔 주소와 같으면 그 검사를 건너뛴다 */
  const aimed = want.route === at;
  if (!aimed) {
    if (isFallbackPath(at)) miss.push(`떨어지는 자리 ${at}`);
    for (const h of FALLBACK_HEADINGS) {
      if (head.includes(h)) miss.push(`떨어지는 머리글 "${h}"`);
    }
  }
  if (want.route && at !== want.route) miss.push(`주소 ${at} ≠ ${want.route}`);
  if (want.heading && !head.includes(want.heading)) {
    miss.push(`머리글에 "${want.heading}" 가 없다 (지금 "${head.slice(0, 60)}")`);
  }
  /* **가르는 글자.** ①② 만으로는 한 칸 옆을 찍어도 지나간다 */
  for (const m of [].concat(want.must ?? [])) {
    if (!text.includes(m)) miss.push(`"${m}" 가 화면에 없다`);
  }
  return { ok: miss.length === 0, at, head, miss };
}

/**
 * 같은 그림이 두 이름으로 저장되는가.
 *
 * 서로 다른 자리를 찍었는데 바이트까지 같으면 둘 중 하나는 그 화면이
 * 아니다. **일부러 같아야 하는 자리만** `allow` 에 적는다.
 */
export function makeDupeWatch(allow = []) {
  const seen = new Map();
  const ok = new Set(allow);
  return {
    add(name, bytes, hash) {
      const key = `${bytes}:${hash}`;
      const first = seen.get(key);
      if (first && !ok.has(name) && !ok.has(first)) {
        return `${name} 이 ${first} 과 같은 그림이다`;
      }
      if (!first) seen.set(key, name);
      return null;
    },
  };
}
