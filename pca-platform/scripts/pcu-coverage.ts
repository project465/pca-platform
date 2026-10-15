/**
 * **배재대 전체 Coverage 를 자리마다 끝까지 밟아 센다.**
 *
 * 묻는 것은 `등록부에 적혀 있는가` 가 아니다. **그 학과를 고른 학생이
 * 실제로 시작해서 결과지와 종이까지 받는가**다. 그래서 자리마다 제품과
 * 같은 길을 지난다: 학과 맥락으로 응시를 열고 · 끝까지 답하고 · 제출하고 ·
 * 결과 쪽을 로그인한 본인으로 열고 · 대표 자리는 종이까지 뽑는다.
 *
 * **자리마다 종이를 뽑지 않는다.** 갈래는 Core 판정을 바꾸지 않으므로
 * (`specialization_contract`) 종이의 모양을 정하는 것은 Core 와 등급이다.
 * 그래서 종이는 **갈래마다 한 자리씩** 뽑고, 나머지 자리는 결과 쪽이
 * 그 학과 이름과 갈래 이름을 적는지까지 본다.
 *
 * 닫아 둔 Core 는 학교 맥락이 통째로 버려지는 것이 설계다. 전에는 세는
 * 동안만 등록부의 개방 칸을 쓰고 끝에서 되돌렸는데, **그 창이 열려 있는
 * 동안 학생에게도 열려 있고** 되돌림이 다른 쓰기와 겹치면 열린 칸이 그대로
 * 남는다. 실제로 한 번 열여섯 Core 가 그렇게 남았고, 그 상태에서
 * `v3:majors` 와 `v3:provenance` 가 걸렸다.
 *
 * 그래서 **이 검사는 등록부를 한 바이트도 쓰지 않는다.** 여는 일을 서버와
 * 이 과정의 환경변수로 옮겼다(`V3_PREVIEW_OPEN=*`, 운영에서는 어떤 값으로도
 * 열리지 않는다). 끝에서 등록부 파일이 글자까지 그대로인지 다시 센다.
 *
 *   V3_PREVIEW_OPEN='*' bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     npx tsx scripts/pcu-coverage.ts
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";
import {
  BASE, assertFreshServer, assertPreviewServer, gateCreds, loadEnv, login,
  makeStudent,
} from "./_loop-fixture";
import { query, queryOne } from "../src/lib/db";
import {
  core as coreEntry, hasCoreFile, packs, registry,
} from "../src/lib/me-v3/core-registry";
import {
  allLeaves, readinessOf, specializationName, statusOf, university,
} from "../src/lib/campus/registry";
import {
  attemptOf, checklistFor, choosePack, content, moveTo, openAttempt,
  saveAnswer, savePicks, submit, viewOf, type CampusEntry,
} from "../src/lib/me-v3/runtime/session";
import type { Answer, Tier } from "../src/lib/me-v3/scoring/types";
import type { V3Attempt } from "../src/lib/me-v3/runtime/session";

loadEnv();

const UNI = process.env.UNI ?? "PCU";
const TIER = (process.env.TIER ?? "BASIC") as Tier;
/** 한 자리만 다시 밟을 때. **고친 뒤 그 자리만 보려고 둔다** */
const ONLY = (process.env.ONLY ?? "").split(",").filter(Boolean);
const OUT = "var/pcu-coverage";
/** 끝에서 **쓰지 않았다는 것**을 세는 자리. 전에는 쓰는 자리였다 */
const REGS = [
  "sites/pca-platform/content/major-cores.json",
  ".next/standalone/sites/pca-platform/content/major-cores.json",
];
/** 손님 화면에 서면 안 되는 안쪽 코드 */
const INTERNAL = [
  /\bTD\d{2}\b/, /\bJ[1-8]\b/, /\bOC[1-7]\b/, /\bZ[1-4]\b/,
  /\bSPEC_[A-Z0-9_]+\b/, /\b[A-Z]+_CORE_V\d\b/, /\bPCU2[67]_[A-Z_]+\b/,
];

/**
 * 종이가 들고 있어야 하는 절(받은 규격 §14 · §11).
 *
 * **이름이 바뀐 절을 옛 이름으로 세고 있었다.** `지원서에 연결할 수 있는
 * 경험` 은 결과 첫 화면을 다시 짜면서 `내가 이미 가진 근거` 로 바뀌었는데
 * 이 목록이 따라오지 않았다. 그 뒤로 이 줄은 **종이에 그 절이 서 있어도
 * 늘 걸리는 줄**이었고, 사람이 그것을 `pdftotext 가 없어 못 읽었다` 와
 * 구별할 수 없었다. 절이 사라진 것과 이름이 바뀐 것은 다른 일이다.
 *
 * 뒤의 넷은 그 학과의 말이 종이에 서는지를 센다(§2 · §11): 먼저 보는
 * 영역과 흔히 남기는 것과 지금 할 수 있는 한 걸음과 지원서·면접에서
 * 꺼내는 자리다. **앞에 전공 이름이 붙으므로 뒷토막만 센다**: 전공마다
 * 다른 말을 요구하면 전공을 하나 더 열 때 이 목록을 같이 고쳐야 하고,
 * 그러면 어느 날 안 고치고 넘어간다.
 */
const PAPER_NEEDS = [
  "먼저 볼 영역", "내가 이미 가진 근거", "앞으로 채울 것", "다음에 할 일",
  "쪽에서 먼저 보는 영역", "쪽에서 흔히 남기는 것",
  "쪽에서 지금 할 수 있는 한 걸음", "그 경험을 지원서에서 꺼내는 자리",
  "면접에서 같은 구조로 되묻는 자리",
];

/**
 * **남의 전공의 말이 섞였는가**(§14).
 *
 * 세는 것은 **그 Core 에만 있는 영역 이름**이다. 두 Core 가 함께 쓰는
 * 이름(`품질` 같은 말)을 세면 멀쩡한 종이가 걸리고, 그러면 그 다음부터
 * 아무도 이 검사를 보지 않는다.
 */
function foreignDomainNames(mine: string): { name: string; core: string }[] {
  const all = new Map<string, Set<string>>();
  for (const c of registry().cores) {
    if (!hasCoreFile(c.code, "domains")) continue;
    let names: string[] = [];
    try {
      names = content(c.code).domains.domains.map((d: { name_ko?: string; name?: string }) =>
        d.name_ko ?? d.name ?? "");
    } catch { names = []; }
    for (const n of names.filter(Boolean)) {
      all.set(n, (all.get(n) ?? new Set()).add(c.code));
    }
  }
  const mineNames = [...all].filter(([, c]) => c.has(mine)).map(([n]) => n);
  const out: { name: string; core: string }[] = [];
  for (const [n, cores] of all) {
    if (cores.size !== 1 || cores.has(mine)) continue;
    /**
     * **내 영역 이름 안에 든 말은 남의 말이 아니다.**
     *
     * `수업 운영`(교육)은 어문의 `수업 운영·평가` 안에 그대로 들어 있고
     * `인사·조직`(경영)은 행정의 `인사·조직 관리` 안에 들어 있다. 글자로
     * 찾으면 **멀쩡한 종이 넷이 걸렸다.** 짧은 이름이 긴 이름 안에 드는
     * 자리를 빼고 센다.
     */
    if (mineNames.some((m) => m.includes(n) || n.includes(m))) continue;
    out.push({ name: n, core: [...cores][0] });
  }
  return out;
}

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  if (c) { pass += 1; console.log(`  통과  ${w}${saw ? ` — ${saw}` : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? ` — ${saw}` : ""}`); }
};
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 16);

function firstPack(core: string, kind: "industry" | "role"): string | null {
  try { return packs<{ packs: { code: string }[] }>(core, kind).packs[0]?.code ?? null; }
  catch { return null; }
}

/** 영역을 전부 해 봤다고 답한 사람 */
function answerOf(core: string) {
  const bank = content(core).bank.items;
  return (id: string): Answer | null => {
    const it = bank.find((x: { item_id: string }) => x.item_id === id);
    if (!it) return null;
    if (it.module === "CORE-FORCE") return { kind: "choice", value: "A" };
    if (it.module === "TRANS-10" || it.module === "TARGET") return { kind: "choice", value: "x" };
    if (it.response_scale === "L0~L3" || it.response_scale === "4보기") {
      return { kind: "level", index: 2 };
    }
    if (it.response_scale === "5점") return { kind: "scale5", value: 4 };
    if (it.response_scale === "3보기") return { kind: "exposure", value: 2 };
    return null;
  };
}

async function fill(core: string, a0: V3Attempt, userId: string): Promise<void> {
  const answer = answerOf(core);
  const ind = firstPack(core, "industry");
  const role = firstPack(core, "role");
  for (const d of content(core).domains.domains) {
    await saveAnswer(a0.id, `G_${d.code}_INT`, { kind: "scale5", value: 4 });
    await saveAnswer(a0.id, `G_${d.code}_EXP`, { kind: "exposure", value: 2 });
    await saveAnswer(a0.id, `G_${d.code}_LEA`, { kind: "scale5", value: 4 });
  }
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = null, guard = 0;
  for (;;) {
    if ((guard += 1) > 400) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const ans = answer(id);
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain) {
      for (const g of checklistFor(core, v.screen.domain)) {
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, 2));
      }
    }
    if (v.screen.kind === "pick-industry" && ind) await choosePack(core, a.id, "industry", ind);
    if (v.screen.kind === "pick-role" && role) await choosePack(core, a.id, "role", role);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
}

type Slot = {
  code: string; name: string; college: string; year: number;
  core: string; spec: string | null;
};

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const before = REGS.map(sha);
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);

  /* 1. 자리를 가른다. 자료가 다 선 자리만 밟는다 */
  const rows = allLeaves(u);
  const ready: Slot[] = [];
  const waiting: Slot[] = [];
  const routing: Slot[] = [];
  for (const r of rows) {
    const s: Slot = {
      code: r.leaf.code, name: r.leaf.name, college: r.college.name,
      year: r.catalog.catalog_year, core: r.leaf.core_code ?? "", spec: r.leaf.specialization ?? null,
    };
    if (r.leaf.routing_only) routing.push(s);
    else if (readinessOf(u, r) === "ASSESSMENT_READY" || readinessOf(u, r) === "RESULT_READY") ready.push(s);
    else waiting.push(s);
  }
  console.log(`\n${u.university_name} 선택 자리 ${rows.length}`);
  console.log(`  자료가 다 선 자리 ${ready.length} · 아직 ${waiting.length} · 전공 탐색 ${routing.length}\n`);

  const cores = [...new Set(ready.map((s) => s.core))];
  /* 갈래마다 한 자리씩만 종이를 뽑는다 */
  const paper = new Set<string>();
  for (const s of ready) {
    const key = `${s.core}:${s.spec ?? "-"}`;
    if (!paper.has(key)) { paper.add(key); (s as Slot & { paper?: boolean }).paper = true; }
  }
  if (ONLY.length) {
    /* **고친 자리만 다시 밟는다.** 종이는 그 자리에서 반드시 뽑는다:
       한 자리만 보는 까닭이 거의 늘 종이이기 때문이다 */
    ready.splice(0, ready.length, ...ready.filter((s) => ONLY.includes(s.code))
      .map((s) => Object.assign(s, { paper: true })));
  }

  /* 시작할 때의 학생 공개 상태. 끝에서 **바뀌지 않았는지** 견준다 */
  const openBefore = new Map(cores.map((c) => [c, coreEntry(c).open_to_students]));
  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  let ctx: BrowserContext | null = null;
  try {
    /* **등록부를 쓰지 않는다.** 미리보기로 띄운 서버인지만 확인한다 */
    for (const c of cores) assertPreviewServer(c);

    /* 2. 미리보기에서는 그 자리가 전부 검사 가능으로 선다 */
    {
      const u2 = university(UNI)!;
      const open = allLeaves(u2).filter((r) =>
        ready.some((s) => s.code === r.leaf.code) && statusOf(u2, r) === "READY");
      ok("자료가 다 선 자리가 미리보기에서 전부 검사 가능으로 선다",
        open.length === ready.length, `${open.length} / ${ready.length}`);
    }

    const mail = `pcucov-${Date.now()}@test.invalid`;
    const st = await makeStudent(mail);
    await query(
      `INSERT INTO entitlements
         (user_id, product_code, kind, tier, major_code, assessment_version, status)
       VALUES ($1,$2,'report',$3,'ME','ME_V3_2','active')`,
      [st.id, `ME_V3_${TIER}_KR`, TIER]);
    ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      ...(gate ? { httpCredentials: gate } : {}),
    });
    const p: Page = await login(ctx, mail, st.pw);

    const lines: string[] = [];
    let n = 0;
    for (const s of ready) {
      n += 1;
      const entry: CampusEntry = {
        university_code: u.university_code, college_code: "",
        department_code: s.code, core_code: s.core, specialization: s.spec,
      };
      /* college_code 는 등록부가 다시 읽는다. 적는 값은 고르는 자리의 코드다 */
      const a0 = await openAttempt({
        userId: st.id, tier: TIER, stage: "bachelor", gradField: null, campus: entry,
      });
      await fill(s.core, a0, st.id);
      const done = (await attemptOf(a0.id, st.id)) as V3Attempt;
      const { snapshot } = await submit(done);
      const row = await queryOne<{
        core_code: string; university_code: string | null;
        department_code: string | null; specialization_code: string | null;
      }>(`SELECT core_code, university_code, department_code, specialization_code
            FROM v3_attempts WHERE id = $1`, [a0.id]);
      const provOk = row?.core_code === s.core
        && row?.university_code === u.university_code
        && row?.department_code === s.code
        && (row?.specialization_code ?? null) === s.spec;

      await p.goto(`${BASE}/v3/${a0.id}/result`, { waitUntil: "domcontentloaded" });
      await p.locator(".rs-openbtn").first().click({ timeout: 3000 }).catch(() => undefined);
      const web = await p.locator("body").innerText();
      const specKo = specializationName({ core_code: s.core, specialization: s.spec } as never);
      const identOk = web.includes(u.university_name) && web.includes(s.name)
        && (!specKo || web.includes(specKo));
      const leak = INTERNAL.map((re) => (web.match(re) ?? [])[0]).find(Boolean);

      let pages = 0;
      const paperBad: string[] = [];
      if ((s as Slot & { paper?: boolean }).paper) {
        const res = await p.request.get(`${BASE}/v3/${a0.id}/result/pdf`, { timeout: 180000 });
        if (res.status() === 200 && (res.headers()["content-type"] ?? "").includes("pdf")) {
          const file = `${OUT}/${s.code}.pdf`;
          writeFileSync(file, await res.body());
          pages = (readFileSync(file, "latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
          /**
           * **쪽수만 세지 않는다**(§14). 종이는 학교가 학생에게 건네는
           * 결과물이라, 거기 적힌 것이 그 학과의 것인지까지 본다. 쪽이
           * 아홉인 것과 그 아홉 쪽이 그 학과의 말인 것은 다른 질문이다.
           */
          let txt = "";
          try {
            txt = execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
          } catch { txt = ""; }
          if (!txt) paperBad.push("종이에서 글자를 못 꺼냈다");
          else {
            if (!txt.includes(u.university_name)) paperBad.push("종이에 학교가 없다");
            if (!txt.includes(s.name.replace(/\s+/g, ""))
              && !txt.includes(s.name)) paperBad.push("종이에 학과가 없다");
            if (specKo && !txt.includes(specKo)) paperBad.push("종이에 갈래가 없다");
            for (const need of PAPER_NEEDS) {
              if (!txt.includes(need)) paperBad.push(`종이에 '${need}' 절이 없다`);
            }
            const hit = foreignDomainNames(s.core).find((x) => txt.includes(x.name));
            if (hit) paperBad.push(`남의 전공 말 — ${hit.name}(${hit.core})`);
          }
        }
      }
      const problems: string[] = [];
      if (!snapshot) problems.push("결과가 만들어지지 않았다");
      if (!provOk) problems.push(`응시 줄이 어긋난다(${row?.core_code}·${row?.department_code}·${row?.specialization_code})`);
      if (!identOk) problems.push("결과지가 학교·학과·갈래를 적지 않는다");
      if (leak) problems.push(`내부 코드 — ${leak}`);
      if ((s as Slot & { paper?: boolean }).paper && !(pages >= 3 && pages <= 12)) {
        problems.push(`종이 ${pages}쪽`);
      }
      problems.push(...paperBad);
      if (problems.length) bad.push(`${s.code} ${s.name}: ${problems.join(" / ")}`);
      else pass += 1;
      const mark = problems.length ? "걸림" : "통과";
      const paperMark = (s as Slot & { paper?: boolean }).paper ? ` · 종이 ${pages}쪽` : "";
      console.log(`  ${mark}  [${n}/${ready.length}] ${s.year} ${s.name}`
        + ` → ${coreEntry(s.core).name_ko}${specKo ? ` · ${specKo}` : ""}${paperMark}`
        + (problems.length ? ` — ${problems.join(" / ")}` : ""));
      lines.push([s.year, s.college, s.name, coreEntry(s.core).name_ko, specKo ?? "",
        mark, pages || ""].join("\t"));
    }
    writeFileSync(`${OUT}/coverage.tsv`, `${lines.join("\n")}\n`);
  } finally {
    await ctx?.close();
    await browser.close();
    const after = REGS.map(sha);
    ok("등록부를 한 바이트도 쓰지 않았다", before.every((h, i) => h === after[i]),
      `${before[0]} → ${after[0]}`);
    /* **학생 공개 상태가 시작할 때와 같은지 값으로 한 번 더 센다.**
       지문만 보면 같은 바이트 수로 뒤집힌 경우를 놓친다. `false` 로 못
       박지 않는 까닭은 **이미 열려 있는 Core 를 가리키는 자리가 생기는
       날 멀쩡한 자리가 걸리기** 때문이다: 재는 것은 `닫혀 있는가` 가
       아니고 `이 검사가 바꾸지 않았는가` 다 */
    const moved = cores.filter((c) => coreEntry(c).open_to_students !== openBefore.get(c));
    ok("자리의 Core 의 학생 공개 상태가 시작할 때와 같다", moved.length === 0,
      moved.join(" ") || `${cores.length}개 그대로`);
  }

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  for (const b of bad) console.log(`  · ${b}`);
  if (bad.length) process.exit(1);
}

void main();
