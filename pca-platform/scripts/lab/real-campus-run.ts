/**
 * **학교가 발급한 계정으로 사람처럼 끝까지 밟고 종이를 받아 본다.**
 *
 * 묻는 것은 하나다: 학생이 로그인해서 검사를 끝까지 풀고, 결과 쪽에서
 * `PDF 저장` 을 눌렀을 때 **그 기관 · 그 학과의 긴 결과지가 실제로 내려오는가.**
 * 서버 함수를 부르지 않고 화면만 누른다(`pcu-campus-flow.ts` 와 같은 걸음).
 *
 *   bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 OUT=<저장소 밖> npx tsx scripts/lab/real-campus-run.ts
 *   RUNS="PCU:PCU26_BIZ:박서진,SJEPA:SJEPA26_MECH:최민재,KUS:KUS26_SEMIPHYS:김하준"
 *
 * 이름은 지어낸 예시 참여자다. 계정은 지우지 않는다(샘플을 다시 열어 볼 수 있게).
 * 열쇠는 OUT 의 accounts.csv 에만 적고 저장소에는 두지 않는다.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { BASE, assertFreshServer, gateCreds, loadEnv } from "../_loop-fixture";
import { walk } from "../_v3-walk";
import { queryOne } from "../../src/lib/db";
import { checkStudent, provisionStudent } from "../../src/lib/campus/students";
import { allLeaves, university } from "../../src/lib/campus/registry";

loadEnv();

const OUT = process.env.OUT ?? "";
if (!OUT || path.resolve(OUT).startsWith(path.resolve("."))) {
  throw new Error("OUT 에 저장소 밖 자리를 적으십시오(열쇠가 적힌다)");
}
const RUNS = (process.env.RUNS
  ?? "PCU:PCU26_BIZ:박서진,SJEPA:SJEPA26_MECH:최민재,KUS:KUS26_SEMIPHYS:김하준,JJU:JJU26_AI:이도윤")
  .split(",").map((s) => { const [uni, leaf, name] = s.split(":"); return { uni, leaf, name }; });

/**
 * 검사 전에 학생이 적어 두는 경험 두 건(예시 참여자라 지어낸 내용이다).
 * 화면의 세 걸음(종류·제목 → 영역 → 문제·정한 것·결과물·확인)을 그대로 누른다.
 * `kind` 는 경험 종류 보기의 차례, `tds` 는 영역 보기의 차례다.
 */
const EXPS: Record<string, { kind: number; title: string; tds: number[] }[]> = {
  PCU26_BIZ: [
    { kind: 0, title: "마케팅원론 팀 과제: 대전 동네 카페 단골 고객 설문 분석", tds: [5, 9] },
    { kind: 1, title: "교내 창업동아리 운영비 예산 편성과 분기 정산", tds: [3, 0] },
  ],
  SJEPA26_MECH: [
    { kind: 1, title: "캡스톤디자인: 소형 컨베이어 구동부 설계와 시제품 제작", tds: [0, 3] },
    { kind: 0, title: "기계공작실습: 선반 가공 부품 치수 측정과 불량 원인 기록", tds: [6, 9] },
  ],
  KUS26_SEMIPHYS: [
    { kind: 0, title: "반도체공정실험: 박막 증착 후 두께 측정과 조건별 비교", tds: [6, 7] },
    { kind: 1, title: "학부연구생: 소자 전류-전압 특성 측정 자동화 스크립트", tds: [2, 0] },
  ],
  JJU26_AI: [
    { kind: 1, title: "캡스톤: 전주 한옥마을 방문 후기 감성 분류 모델", tds: [9, 4] },
    { kind: 0, title: "데이터베이스 수업: 교내 식당 혼잡도 예측 웹 서비스", tds: [3, 0] },
  ],
  JJU26_BOOTCAMP_AI: [
    { kind: 1, title: "피지컬 AI 부트캠프: 로봇팔 카메라로 부품을 인식해 집는 모델 학습", tds: [8, 5] },
    { kind: 0, title: "부트캠프 팀 과제: 공장 설비 진동 센서 이상 감지와 경보 기준 정하기", tds: [8, 9] },
  ],
};

/**
 * 그 과정의 학생처럼 답하게 하는 규칙. 피지컬 AI 부트캠프 예시는 기계학습·데이터와
 * 센서·제어·실시간 시스템 쪽을 높게, 화면·게임·그래픽스 쪽을 낮게 고른다.
 * 보기 차례가 낮은 칸 → 높은 칸이라 끝 칸을 고르면 높은 쪽이다.
 */
const HIGH = [/정했고/, /매우 관심/, /매우 배우고/, /여러 번/, /직접 했다/, /관심 있다/, /배우고 싶다/];
const LOW = [/받아 썼다/, /별로 관심/, /별로 배우고/, /한두 번/];
const pickBy = (labels: string[], res: RegExp[]) => {
  for (const re of res) { const k = labels.findIndex((l) => re.test(l)); if (k >= 0) return k; }
  return -1;
};
const PROFILE: Record<string, (q: { text: string; n: number; want: number; labels: string[] }) => number> = {
  JJU26_BOOTCAMP_AI: ({ text, want, labels }) => {
    const q = text.split("\n")[0] + " " + text;
    if (/기계학습|데이터 분석|모델|학습 데이터|추론|센서|로봇|제어|동시성|임베디드|알고리즘/.test(q)) {
      const k = pickBy(labels, HIGH); return k >= 0 ? k : want;
    }
    if (/인터페이스|게임|그래픽스|렌더링|화면 구현/.test(q)) {
      const k = pickBy(labels, LOW); return k >= 0 ? k : want;
    }
    return want;
  },
};

async function addExperience(p: import("playwright").Page, e: { kind: number; title: string; tds: number[] }) {
  await p.goto(`${BASE}/me/experience/new`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.locator('label.cm-pick:has(input[name="kind"])').nth(e.kind).click();
  await p.fill('input[name="title"]', e.title);
  await p.getByRole("button", { name: "다음", exact: true }).click();
  for (const i of e.tds) await p.locator('label.cm-pick:has(input[name="td"])').nth(i).click().catch(() => undefined);
  await p.getByRole("button", { name: "다음", exact: true }).click();
  const subs = p.locator(".cm-sub");
  for (let k = 0; k < await subs.count(); k += 1) {
    const picks = subs.nth(k).locator("label.cm-pick");
    for (let j = 0; j < Math.min(2, await picks.count()); j += 1) await picks.nth(j).click().catch(() => undefined);
  }
  await Promise.all([
    p.waitForURL((u) => !u.pathname.endsWith("/new"), { timeout: 30000 }).catch(() => undefined),
    p.getByRole("button", { name: "저장", exact: true }).click(),
  ]);
  await p.waitForLoadState("networkidle").catch(() => undefined);
}

const lines: string[] = [];
const ok = (label: string, pass: boolean, note = "") => {
  const s = `${pass ? "  통과" : "  실패"}  ${label}${note ? ` · ${note}` : ""}`;
  console.log(s); lines.push(s);
  return pass;
};

async function one(run: { uni: string; leaf: string; name: string }, browser: import("playwright").Browser) {
  const u = university(run.uni);
  if (!u) throw new Error(`등록부에 ${run.uni} 가 없습니다`);
  const seat = allLeaves(u).find((r) => r.leaf.code === run.leaf);
  if (!seat) throw new Error(`${run.uni} 에 ${run.leaf} 가 없습니다`);
  const code = u.university_code.toLowerCase();
  lines.push(`\n## ${u.university_name} · ${seat.leaf.name} · ${run.name}`);
  console.log(`\n── ${u.university_name} · ${seat.leaf.name}`);

  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [run.uni]);
  if (!org) throw new Error(`${run.uni} 기관 줄이 없습니다`);
  const sid = `zz${run.uni.toLowerCase()}${Date.now() % 1e6}`;
  const c = checkStudent(run.uni, {
    student_id: sid, name: run.name, department_code: seat.leaf.code, college_code: seat.college.code,
  });
  if (!c.ok) throw new Error(c.why);
  const prov = await provisionStudent(org.id, c.value);
  ok("담당자 명단으로 계정 발급", prov.created && Boolean(prov.password), `아이디 ${c.value.loginId}`);
  appendFileSync(path.join(OUT, "accounts.csv"), `${run.uni},${seat.leaf.name},${run.name},${c.value.loginId},${prov.password}\n`);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  if (gateCreds()) await ctx.setHTTPCredentials(gateCreds()!);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/campus/${code}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"]', c.value.loginId);
  await p.fill('input[name="password"]', prov.password as string);
  await p.click('button[type="submit"]');
  await p.waitForURL((x) => !new URL(x).pathname.endsWith("/login"), { timeout: 30000 }).catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  ok("학교 로그인 화면으로 로그인", new URL(p.url()).pathname === `/campus/${code}/start`, new URL(p.url()).pathname);
  const st = (await p.locator("body").innerText()).replace(/\s+/g, " ");
  ok("내 학과가 이미 적혀 있다", st.includes(seat.leaf.name), seat.leaf.name);

  await p.getByRole("button", { name: /검사 시작하기/ }).first().click(); /* 첫 폼은 머리띠의 로그아웃이다 */
  await p.waitForURL(/\/v3\/start/, { timeout: 30000 }).catch(() => undefined);
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.getByText("학부", { exact: true }).click();
  await p.getByRole("button", { name: "검사 시작" }).click();
  await p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
  const att = /\/v3\/(\d+)/.exec(p.url())?.[1] ?? "";
  ok("검사가 열린다", Boolean(att), `응시 ${att}`);
  /* 검사를 연 뒤 작업공간의 경험 화면에서 경험을 적고 돌아와 이어서 푼다.
     전공이 정해지기 전에는 경험 화면이 전공 고르기로 돌아간다 */
  for (const e of EXPS[run.leaf] ?? []) await addExperience(p, e);
  const nexp = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_experiences WHERE user_id=$1::bigint`, [prov.userId]);
  ok("경험 기록을 화면으로 적었다", Number(nexp?.n ?? 0) === (EXPS[run.leaf] ?? []).length, `${nexp?.n}건`);
  await p.goto(`${BASE}/v3/${att}`, { waitUntil: "domcontentloaded" });
  const t0 = Date.now();
  const w = await walk(p, 260, PROFILE[run.leaf] ? { choose: PROFILE[run.leaf] } : undefined);
  ok("화면을 눌러 끝까지 풀었다", w.done, `화면 ${w.screens}개 · ${Math.round((Date.now() - t0) / 1000)}초`);
  const row = await queryOne<{ tier: string; n: string; dep: string }>(
    `SELECT a.tier, a.department_code dep, (SELECT count(*) FROM v3_responses r WHERE r.attempt_id = a.id)::text n
       FROM v3_attempts a WHERE a.id = $1::bigint`, [att]);
  const np = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_evidence_picks WHERE attempt_id=$1::bigint`, [att]);
  ok("근거 항목을 골라 저장했다", Number(np?.n ?? 0) > 0, `${np?.n}개`);
  ok("응답이 서버에 저장됐다", Number(row?.n ?? 0) > 40, `${row?.n}개 · 등급 ${row?.tier} · ${row?.dep}`);

  await p.goto(`${BASE}/v3/${att}/result`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(() => undefined);
  const dir = path.join(OUT, `${run.uni}-${att}`); mkdirSync(dir, { recursive: true });
  await p.screenshot({ path: path.join(dir, "result-web.png"), fullPage: false });
  const res = (await p.locator("body").innerText()).replace(/\s+/g, " ");
  ok("웹 결과가 선다", res.length > 400, `${res.length}자`);

  /* 결과 쪽의 PDF 단추를 사람처럼 누른다 */
  const link = p.locator(`a[href$="/v3/${att}/result/pdf"]`).first();
  const has = await link.count();
  ok("결과 쪽에 PDF 단추가 있다", has > 0, has ? (await link.innerText()).trim() : "없음");
  const pdfPath = path.join(dir, `CareerMatri_${u.university_name}_${seat.leaf.name}_${run.name}.pdf`.replace(/[\s/]/g, ""));
  const t1 = Date.now();
  let got = false;
  try {
    const [dl] = await Promise.all([
      p.waitForEvent("download", { timeout: 180000 }),
      link.click({ modifiers: [] }),
    ]);
    await dl.saveAs(pdfPath); got = true;
  } catch {
    const r = await p.request.get(`${BASE}/v3/${att}/result/pdf`, { timeout: 180000 });
    if (r.status() === 200 && (r.headers()["content-type"] ?? "").includes("pdf")) {
      writeFileSync(pdfPath, await r.body()); got = true;
    } else lines.push(`  PDF 응답 ${r.status()} ${r.headers()["content-type"]}`);
  }
  ok("PDF 가 내려왔다", got, `${Math.round((Date.now() - t1) / 1000)}초`);
  if (got) {
    const info = execFileSync("pdfinfo", [pdfPath]).toString();
    const pages = Number(/Pages:\s+(\d+)/.exec(info)?.[1] ?? 0);
    const size = Number(/File size:\s+(\d+)/.exec(info)?.[1] ?? 0);
    ok("긴 결과지다(60쪽 이상)", pages >= 60, `${pages}쪽 · ${(size / 1e6).toFixed(1)}MB`);
    const txt = execFileSync("pdftotext", ["-layout", pdfPath, "-"]).toString();
    ok("참여자 이름과 기관과 학과가 적혀 있다",
      txt.includes(run.name) && txt.includes(u.university_name.split(" ")[0]) && txt.includes(seat.leaf.name.split("·")[0]),
      `${run.name} · ${u.university_name} · ${seat.leaf.name}`);
    const bad = ["—", "추천 기업", "TD0", "TD1", "ROLE_", "Z1_", "NOT_EXPLORED", "BIZ_CORE", "undefined", "NaN", "[object"]
      .filter((x) => txt.includes(x));
    ok("안쪽 코드 · 대시 · 깨진 값이 없다", bad.length === 0, bad.join(" "));
    mkdirSync(path.join(dir, "pages"), { recursive: true });
    execFileSync("pdftoppm", ["-r", "45", "-png", pdfPath, path.join(dir, "pages", "p")]);
  }
  await ctx.close();
}

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "accounts.csv"), "기관,학과,이름,아이디,비밀번호\n");
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    for (const r of RUNS) await one(r, browser).catch((e) => ok(`${r.uni} 진행`, false, String(e).slice(0, 300)));
  } finally { await browser.close(); }
  writeFileSync(path.join(OUT, "RUN.md"), `# 실제 화면으로 밟은 기록 (${new Date().toISOString()})\n${lines.join("\n")}\n`);
  process.exit(lines.some((l) => l.includes("실패")) ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
