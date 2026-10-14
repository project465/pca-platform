/**
 * **그 Core 를 진입에서 결과지까지 한 사람이 이어서 밟는다.**
 *
 * `CORE` 하나로 어느 Core 든 밟는다. **전공 이름을 이 파일에 적지 않는다**:
 * 적어 두면 Core 를 하나 더 만드는 일이 이 검사를 베끼는 일이 되고, 베낀
 * 쪽은 화면이 한 번 바뀐 날 한 곳만 고쳐진다.
 *
 * 묻는 것은 `쪽이 서는가` 가 아니다. **학교 학과에서 고른 사람이 공통
 * 응시 화면을 지나 결과지와 종이까지 막히지 않고 가는가**다. 그래서 자리를
 * 주소로 열지 않고 사람이 누르는 차례 그대로 간다.
 *
 * 짓고 있는 Core 는 **학생에게 닫혀 있다**(`open_to_students: false`). 전에는
 * 이 검사가 그 칸을 잠시 `true` 로 쓰고 끝에서 되돌렸는데, **그 창이 열려
 * 있는 몇 초 동안 학생에게도 열려 있고** 되돌림이 다른 쓰기와 겹치면 열린
 * 칸이 그대로 남는다. 한 번 열여섯 Core 가 그렇게 남았다.
 *
 * 그래서 **이 검사는 등록부를 한 바이트도 쓰지 않는다.** 여는 일을 서버의
 * 환경변수로 옮겼고(`V3_PREVIEW_OPEN`), 이 검사가 세는 것은 셋이다: 등록부가
 * 진짜 닫혀 있는가 · 그래도 자료는 다 섰는가 · 미리보기로 띄운 서버에서
 * 길이 끝까지 밟히는가. 끝에서 등록부 파일이 글자까지 그대로인지 다시 센다.
 *
 *   V3_PREVIEW_OPEN=CS_CORE_V1 bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 CORE=CS_CORE_V1 npm run core:walk
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chromium, type Page } from "playwright";
import {
  BASE, assertFreshServer, assertPreviewServer, gateCreds, loadEnv, login,
  makeStudent,
} from "./_loop-fixture";
import { enterAssessment, walk } from "./_v3-walk";
import { query, queryOne } from "../src/lib/db";
import { coreFile } from "../src/lib/me-v3/core-registry";
import {
  allLeaves, readinessOf, statusOf, university,
} from "../src/lib/campus/registry";
import { defaultCore } from "../src/lib/me-v3/core-registry";

loadEnv();

const CORE = process.env.CORE ?? defaultCore();
/** 손님 화면에 서면 안 되는 안쪽 코드. **Core 이름을 글자로 적지 않는다** */
const INNER = new RegExp(`${CORE}|\\bTD\\d\\d\\b|\\bJ[1-8]\\b|INDUSTRY_|ROLE_`);
const INNER_LEAF = new RegExp(`${CORE}|TD0\\d|PCU2[67]_\\w*`);
/** 이 Core 의 영역 이름. 결과지가 그 전공의 말을 적는지 **자료로** 센다 */
const TD_NAMES = coreFile<{ domains: { name: string }[] }>(CORE, "domains")
  .domains.map((d) => d.name);
const MAIL = `${CORE.toLowerCase().replace(/_/g, "-")}-walk@test.invalid`;
/**
 * 끝에서 **글자까지 그대로인지** 세는 자리.
 *
 * standalone 서버는 빌드가 떠 둔 복사본을 읽으므로 두 벌이 있다. 전에는 이
 * 목록이 **쓰는 자리**였고, 지금은 **쓰지 않았다는 것을 세는 자리**다.
 */
const REGS = [
  "sites/pca-platform/content/major-cores.json",
  ".next/standalone/sites/pca-platform/content/major-cores.json",
];

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}${saw ? " — " + saw : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? " — " + saw : ""}`); }
};
const sha = (p: string) =>
  createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);

/**
 * 그 Core 를 가리키는 학교 자리 하나.
 *
 * **`LEAF` 로 자리를 고를 수 있다.** 한 Core 가 여러 학과를 여는데 늘 첫
 * 자리만 밟으면, 갈래를 더해 새로 연 자리는 한 번도 눌리지 않는다.
 */
function anyLeaf(): { uni: string; path: string; code: string; name: string } {
  const u = university("PCU");
  if (!u) throw new Error("등록부에 PCU 가 없습니다");
  const want = process.env.LEAF;
  const rows = allLeaves(u).filter((r) => r.leaf.core_code === CORE);
  const row = want ? rows.find((r) => r.leaf.code === want) : rows[0];
  if (!row) {
    throw new Error(want
      ? `${CORE} 의 자리 가운데 ${want} 가 없습니다 (${rows.map((r) => r.leaf.code).join(" ")})`
      : `${CORE} 를 가리키는 학교 자리가 없습니다`);
  }
  return {
    uni: u.university_code, code: row.leaf.code, name: row.leaf.name,
    path: `/campus/${u.university_code.toLowerCase()}/d/${row.leaf.code}`
      + `?y=${row.catalog.catalog_year}`,
  };
}

async function main(): Promise<void> {
  assertFreshServer();
  const before = REGS.map(sha);
  const leaf = anyLeaf();
  console.log(`  core  ${CORE} · 자리 ${leaf.code} ${leaf.name}\n`);

  /* 1~2. 지금 학생에게 어떤 상태인가.
     **`{ preview: false }` 로 묻는다.** 미리보기를 거쳐 물으면 이 줄이
     아무것도 세지 않는다: 열어 둔 서버에서는 늘 `READY` 가 나온다.

     **`준비 중` 으로 못 박지 않는다.** 운영 공개를 시작하면 이 자리의
     Core 가 실제로 열려 있고, 그때 멀쩡한 자리가 걸린다. 재는 것은
     `닫혀 있는가` 가 아니고 **이 검사가 그 상태를 바꾸지 않았는가**다
     (끝에서 다시 센다). */
  const openBefore = ((): string => {
    const u = university("PCU")!;
    const row = allLeaves(u).find((r) => r.leaf.code === leaf.code)!;
    const real = statusOf(u, row, undefined, { preview: false });
    console.log(`  적어둠  이 자리의 학생 공개 상태 — ${real}`);
    const rd = readinessOf(u, row, undefined, { preview: false });
    /* **`RESULT_READY` 도 자료가 다 선 것이다.** `readinessOf` 는 학생에게
       열린 자리를 한 칸 올려 적는다. 앞엣것만 받으면 **운영 공개를 시작한
       자리에서 멀쩡한 자료가 걸린다**(자리 하나를 연 날 실제로 걸렸다) */
    ok("자료가 다 서 있다",
      rd === "ASSESSMENT_READY" || rd === "RESULT_READY", rd);
    return real;
  })();

  /* 3. 닫혀 있으면 미리보기로 띄운 서버여야 한다.
     안 열려 있으면 학과 화면이 `준비 중` 으로 서고, 까닭을
     **`검사가 열리지 않는다` 로 거꾸로 적게 된다**. 이미 학생에게 열려
     있으면 그 문이 필요 없다 */
  if (openBefore === "PREPARING") assertPreviewServer(CORE);
  else console.log(`  적어둠  학생에게 열려 있어 미리보기 문을 쓰지 않는다`);

  const gate = gateCreds();
  const browser = await chromium.launch();
  /**
   * **두 등급으로 돈다.** 선별 등급은 여덟 축을 묻지 않아 결과지에
   * Evidence 와 Gap 절이 서지 않는 것이 맞다(묻지 않은 것을 `확인되지
   * 않았습니다` 로 적으면 응시자가 자기가 빠뜨린 줄 안다). 그 절이 실제로
   * 서는지는 **유료 등급으로 한 번 더 밟아야** 답이 나온다.
   */
  const TIER = (process.env.TIER ?? "PRO") as "BASIC" | "STANDARD" | "PRO";
  const student = await makeStudent(MAIL);
  /**
   * **이용권이 아직 Core 를 가리키지 않는다.** `v3Grants` 가 거르는 칸은
   * 엔진의 전역 판본(`ASSESSMENT_VERSION`)이고 상품표의 `product_code` 는
   * 기계공학 쪽 줄이다. 그래서 다른 Core 의 응시도 그 줄로 열린다. 고치는 일은
   * 이용권과 상품 구조를 건드리므로 이 회차의 범위 밖이고, 보고에 적는다.
   * **파는 줄을 새로 만들지 않는다**: 쓰는 상품은 `active = false` 다.
   */
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     VALUES ($1, $2, 'report', $3, 'ME', 'ME_V3_2', 'active')`,
    [student.id, `ME_V3_${TIER}_KR`, TIER]);
  let attempt = "";
  try {
    /* 4. 이 과정이 보는 등록부에서도 그 자리가 검사 가능으로 선다.
       닫힌 Core 를 밟을 때는 **이 과정도 서버와 같은 `V3_PREVIEW_OPEN` 을
       들고 돌아야** 이 줄이 선다. 안 들고 돌면 길은 밟히는데 이 줄만 걸려
       까닭이 흐려진다 */
    ok("이 자리가 검사 가능으로 선다", (() => {
      const u = university("PCU")!;
      const row = allLeaves(u).find((r) => r.leaf.code === leaf.code)!;
      return statusOf(u, row) === "READY" && readinessOf(u, row) === "RESULT_READY";
    })());

    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ...(gate ? { httpCredentials: gate } : {}),
    });
    const errs: string[] = [];
    const p: Page = await login(ctx, MAIL, student.pw);
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
    p.on("response", (r) => { if (r.status() >= 500) errs.push(`${r.status()} ${r.url()}`); });
    if (process.env.WALK_DEBUG) {
      p.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") {
          console.error(`[walk] 콘솔 ${m.type()} ${m.text().slice(0, 160)}`);
        }
      });
      p.on("requestfailed", (r) => {
        console.error(`[walk] 요청 실패 ${r.failure()?.errorText ?? ""} ${r.url().slice(0, 120)}`);
      });
      p.on("response", (r) => {
        if (r.status() >= 400) console.error(`[walk] 응답 ${r.status()} ${r.url().slice(0, 120)}`);
      });
    }

    /* 4~6. 학과 상세에서 공통 시작 화면으로 */
    await p.goto(`${BASE}${leaf.path}`, { waitUntil: "networkidle" });
    const detail = await p.locator("body").innerText();
    ok("학과 상세가 그 학과 이름을 적는다", detail.includes(leaf.name));
    ok("학과 상세에 안쪽 코드가 없다", !INNER_LEAF.test(detail),
      (detail.match(INNER_LEAF) ?? ["없다"])[0]);
    await p.getByRole("button", { name: "이 전공으로 검사 시작" }).click();
    await p.waitForURL(/\/v3\/start/, { timeout: 30000 });
    await p.waitForLoadState("networkidle");
    const start = await p.locator("body").innerText();
    ok("공통 시작 화면이 학교와 학과를 적는다",
      start.includes(leaf.name), start.split("\n").find((l) => l.trim())?.slice(0, 24) ?? "");

    /* 7~9. 응시를 열고 끝까지 */
    await p.getByText("학부", { exact: true }).click();
    await p.getByRole("button", { name: "검사 시작" }).click();
    await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    await enterAssessment(p);
    const m = /\/v3\/(\d+)/.exec(p.url());
    ok("응시가 열린다", !!m, new URL(p.url()).pathname);
    if (!m) throw new Error("응시가 열리지 않았습니다");
    attempt = m[1];

    const row = await queryOne<{
      core_code: string; tier: string; university_code: string | null;
      department_code: string | null; specialization_code: string | null;
    }>(`SELECT core_code, tier, university_code, department_code, specialization_code
          FROM v3_attempts WHERE id = $1`, [attempt]);
    ok("응시 줄이 이 Core 와 학교 맥락을 든다",
      row?.core_code === CORE && row?.university_code === leaf.uni
      && row?.department_code === leaf.code,
      `${row?.core_code} · ${row?.university_code} · ${row?.department_code}`);
    ok("등급은 이용권이 정한다", row?.tier === TIER, `${row?.tier}`);

    const first = await walk(p, 400);
    ok("끝까지 간다", first.done, `화면 ${first.screens}`);
    const answers = Number((await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1`,
      [attempt]))?.n ?? 0);
    ok("답이 서버에 쌓인다", answers > 30, `${answers}개`);

    /* 10~13. 채점과 결과지 */
    const snaps = async () => Number((await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_snapshots WHERE attempt_id = $1`,
      [attempt]))?.n ?? 0);
    ok("결과가 만들어졌다", (await snaps()) === 1, `스냅샷 ${await snaps()}벌`);
    const snap = await queryOne<{ core: string; model: string | null }>(
      `SELECT (module_versions->>'core_version') AS core,
              (result_model IS NOT NULL)::text AS model
         FROM v3_snapshots WHERE attempt_id = $1`, [attempt]);
    ok("스냅샷이 이 Core 를 적는다", snap?.core === CORE, String(snap?.core));
    ok("결과 모델이 함께 굳는다", snap?.model === "true", String(snap?.model));

    await p.goto(`${BASE}/v3/${attempt}/result`, { waitUntil: "networkidle" });
    const head = (await p.locator("h1").first().innerText().catch(() => "")).trim();
    ok("결과 첫 화면이 선다", head.length > 0, head.slice(0, 24));
    const fold = p.locator("button.rs-foldbtn, button.rs-more");
    const n = await fold.count();
    for (let i = 0; i < n; i += 1) await fold.nth(i).click().catch(() => undefined);
    await p.waitForTimeout(400);
    const body = await p.locator("body").innerText();
    /* **선별 등급에는 Evidence 와 Gap 절이 서지 않는 것이 맞다.** 여덟 축을
       묻지 않은 응시에서 축이 비었다고 적으면 응시자가 자기가 빠뜨린 줄
       안다. 그래서 등급에 따라 다른 것을 센다 */
    if (TIER === "BASIC") {
      ok("선별 결과지는 관심과 해 본 정도로 적는다",
        /관심|해 본/.test(body) && !/아직 확인되지 않/.test(body));
    } else {
      ok("결과지에 설명할 수 있는 경험이 선다",
        /지원서에서 설명할 수 있는 경험|지금 확인된 것/.test(body));
      /* 걸릴 때 **무엇이 섰는지**를 함께 적는다. 까닭을 적지 않으면
         다음 사람이 화면을 다시 열어 눈으로 찾는다 */
      const heads = (await p.locator("h2, h3").allInnerTexts())
        .map((t) => t.trim().split("\n")[0]).filter(Boolean);
      ok("결과지에 부족한 부분이 선다",
        /앞으로 채울 것|비어 있는 것|설명 근거를 더 붙일/.test(body),
        heads.slice(0, 12).join(" / "));
    }
    ok("결과지에 다음 할 일이 선다", /지금 해볼 것|다음에 할 일|지금 할 일/.test(body));
    const said = TD_NAMES.filter((n) => body.includes(n));
    ok("결과지가 이 전공의 영역 이름을 적는다", said.length > 0,
      said.slice(0, 3).join(" · ") || "없다");
    ok("결과지에 안쪽 코드가 없다", !INNER.test(body),
      (body.match(INNER) ?? ["없다"])[0]);

    const pdf = await p.request.get(`${BASE}/v3/${attempt}/result/pdf`, { timeout: 120000 });
    ok("종이가 나온다", pdf.status() === 200
      && (pdf.headers()["content-type"] || "").includes("pdf"),
      `${pdf.status()} ${pdf.headers()["content-type"] ?? ""}`);

    ok("브라우저 오류 0", errs.length === 0, errs[0] ?? "없음");

    /**
     * 손전화 폭에서도 읽히는가. **가로로 밀리면 그 쪽은 못 쓴다.**
     *
     * 같은 쪽을 390px 로 다시 열어 문서가 창보다 넓어지는지 센다. 새 화면을
     * 만들지 않았으므로 여기서 보는 것은 공통 화면이 이 Core 의 글자(영역
     * 이름이 긴 자리)를 받고도 넘치지 않는가다.
     */
    const narrow = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      ...(gate ? { httpCredentials: gate } : {}),
    });
    const np = await login(narrow, MAIL, student.pw);
    const over: string[] = [];
    for (const [name, path] of [
      ["학과 목록", `/campus/${leaf.uni.toLowerCase()}/majors`],
      ["학과 상세", leaf.path],
      ["시작 화면", "/v3/start"],
      ["결과 첫 화면", `/v3/${attempt}/result`],
    ] as [string, string][]) {
      await np.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const w = await np.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (w > 1) over.push(`${name} +${w}px`);
    }
    ok("390px 에서 가로로 밀리지 않는다", !over.length, over.join(" · ") || "자리 넷");
    await narrow.close();
    await ctx.close();
  } finally {
    await browser.close();
  }

  /* 14~16. 등록부를 한 바이트도 쓰지 않았는가 */
  ok("등록부가 글자까지 그대로다", REGS.every((f, i) => sha(f) === before[i]),
    REGS.map((f, i) => `${sha(f) === before[i] ? "같다" : "다르다"}`).join(" · "));
  {
    const u = university("PCU")!;
    const row = allLeaves(u).find((r) => r.leaf.code === leaf.code)!;
    const real = statusOf(u, row, undefined, { preview: false });
    ok("학생 공개 상태가 시작할 때와 같다", real === openBefore,
      `${openBefore} → ${real}`);
  }
  /* 쓴 자료는 지운다. **운영과 같은 표를 쓰므로 남기지 않는다** */
  if (attempt) {
    for (const t of ["v3_responses", "v3_snapshots", "v3_screen_trace"]) {
      await query(`DELETE FROM ${t} WHERE attempt_id = $1`, [attempt]).catch(() => undefined);
    }
  }
  for (const t of ["v3_experiences", "v3_actions", "career_events", "career_profiles",
                   "memberships", "entitlements", "analytics_events", "v3_attempts"]) {
    await query(`DELETE FROM ${t} WHERE user_id = $1`, [student.id]).catch(() => undefined);
  }
  await query(`DELETE FROM users WHERE id = $1`, [student.id]).catch(() => undefined);
  ok("쓴 자료를 지웠다", Number((await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_attempts WHERE user_id = $1`,
    [student.id]))?.n ?? 0) === 0);

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
void main();
