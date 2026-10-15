/**
 * **대표 학과 Human Review Pack**(PCU 전 학과 콘텐츠 최종 QA §15).
 *
 * 계열마다 대표 학과 하나를 골라 **그 학과 학생이 실제로 받는 글**을 한
 * 문서로 모은다. 담는 것은 받은 규격의 여덟 자리다.
 *
 *   대표 문항 다섯 · 결과 머리말 · 확인된 경험 · 앞으로 채울 것 ·
 *   다음에 할 일 · 산업과 직무 연결 · 지원서 활용 · 면접 활용
 *
 * **등록부에 적힌 것을 베껴 적지 않는다.** 문항은 그 Core 의 은행에서
 * 읽고, 뒤의 일곱은 **제품과 같은 길**로 응시를 열고 끝까지 답하고 제출해
 * 로그인한 본인으로 결과 쪽을 받아 그 글자를 옮긴다. 손으로 적으면 문면을
 * 고친 날 이 문서가 조용히 옛 글을 들고 있다.
 *
 * **판정에 한 줄도 닿지 않는다.** 읽기만 하고, 쓰는 것은 검사용 학생과 그
 * 응시뿐이다(등록부와 학생 공개 상태를 건드리지 않는다).
 *
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' npm run pcu:pack
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import {
  BASE, assertFreshServer, assertPreviewServer, gateCreds, loadEnv, login, makeStudent,
} from "./_loop-fixture";
import { query } from "../src/lib/db";
import { allLeaves, offered, universities, visible } from "../src/lib/campus/registry";
import {
  core as coreEntry, coreFile, specializationOf,
} from "../src/lib/me-v3/core-registry";
import { specView } from "../src/lib/me-v3/result/spec-view";
import {
  attemptOf, openAttempt, submit, type CampusEntry, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import { PEOPLE, answerAll } from "./_v3-answer";

loadEnv();
const OUT = process.env.OUT ?? "docs/metri/PCU_REVIEW_PACK.md";

/**
 * 계열마다 대표 학과 하나.
 *
 * **받은 규격의 열 계열을 전부 덮는다.** 학과 코드로 적는 까닭은 이름이
 * 두 Catalog 에서 갈릴 수 있어서다(`드론로봇공학과` ↔ `드론로봇공학전공`).
 */
const PICKS: [string, string][] = [
  ["인문·사회", "PCU26_KOREAN"],
  ["사회(법·경찰)", "PCU26_POLICE"],
  ["경영", "PCU26_BIZ"],
  ["교육", "PCU26_EARLYCHILD"],
  ["생명", "PCU26_BT"],
  ["보건", "PCU26_NURSING"],
  ["공학", "PCU26_EE"],
  ["AI·SW", "PCU26_SWF_COMPUTER"],
  ["건축·토목", "PCU26_ARCH"],
  ["예체능·콘텐츠", "PCU26_ARTWEBTOON_MAIN"],
];

type Item = {
  item_id: string; module: string; technical_domain: string | null;
  measurement_axis: string | null; evidence_axis: string | null;
  wording: string; grid_row: string | null; grid_stem: string | null;
};

/**
 * 그 학과의 대표 문항 다섯.
 *
 * **그 학과가 먼저 보는 영역**(갈래 계약의 `domain_emphasis.lead` 첫
 * 자리)에서 고른다: 격자 한 줄과 선별 네 축이다. 무작위로 다섯을 집으면
 * 검토하는 분이 자기 전공과 상관없는 영역의 문항을 읽게 된다.
 */
function fiveItems(core: string, lead: string[]): Item[] {
  const bank = coreFile<{ items: Item[] }>(core, "items").items;
  const td = lead[0] ?? null;
  const grid = bank.find((i) => i.module === "CORE-GRID"
    && i.technical_domain === td && i.measurement_axis === "interest");
  const probe = bank.filter((i) => i.module.startsWith("PROBE")
    && i.technical_domain === td);
  const seen = new Set<string>();
  const four = probe.filter((i) => {
    const k = i.evidence_axis ?? "";
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  }).slice(0, 4);
  return [...(grid ? [grid] : []), ...four];
}

/**
 * 쪽에서 그 절만 떼어 낸다. 없으면 빈 글.
 *
 * **글 한가운데의 같은 글자를 절 머리로 읽지 않는다.** 처음에는 글자
 * 위치로 잘랐더니 본문의 `아래 '다음에 할 일' 부터 보세요` 가 절 머리로
 * 잡혀서, 한 절이 한 줄로 끊기고 다음 절이 앞 절의 꼬리를 물고 왔다.
 * 절 머리는 **제 줄을 통째로 차지한다.**
 */
const HEADS = [
  "내가 이미 가진 근거", "경험·근거 분포", "먼저 볼 영역", "같이 놓고 볼 영역",
  "앞으로 채울 것", "다음에 할 일", "어디에서 찾을지", "이 다음에",
  "결과 읽는 기준", "연구·프로젝트를 직무 언어로",
];

function section(text: string, head: string): string {
  const lines = text.split("\n").map((l) => l.trim());
  const i = lines.findIndex((l) => l === head);
  if (i < 0) return "";
  let end = lines.length;
  for (let j = i + 1; j < lines.length; j += 1) {
    /* 산업과 직무 절의 머리는 그 Core 의 팩 이름을 들고 있어 글자로 적을 수
       없다. 꼬리로 가린다 */
    if (HEADS.includes(lines[j]) || /^\d+\.\s/.test(lines[j])
      || /(쪽에 연결하면|직무에 연결하면)$/.test(lines[j])) { end = j; break; }
  }
  return lines.slice(i + 1, end).filter(Boolean).join("\n");
}

function quote(s: string): string {
  if (!s) return "> _그 응답에서는 이 절이 서지 않았습니다._";
  return s.split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => `> ${l}`).join("\n");
}

async function main(): Promise<void> {
  assertFreshServer();
  const u = universities().find((x) => x.university_code === "PCU");
  if (!u) { console.error("PCU 를 등록부에서 찾지 못했다"); process.exit(1); }
  const leaves = allLeaves(u).filter(offered).filter((r) => visible(r.leaf));

  const rows = PICKS.map(([family, code]) => {
    const r = leaves.find((x) => x.leaf.code === code);
    if (!r) throw new Error(`${code} 를 등록부에서 찾지 못했다`);
    if (!r.leaf.core_code) throw new Error(`${code} 에 Core 가 없다`);
    return { family, r };
  });

  const gate = gateCreds();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const out: string[] = [];
  out.push("# PCU 대표 학과 Human Review Pack");
  out.push("");
  out.push("계열마다 대표 학과 하나를 골라 **그 학과 학생이 실제로 받는 글**을 모았다.");
  out.push("문항은 그 Core 의 은행에서 읽고, 결과 쪽의 일곱 절은 제품과 같은 길로");
  out.push("응시를 열고 끝까지 답하고 제출해 받은 글자를 그대로 옮겼다.");
  out.push("");
  out.push("**읽어 주실 것 하나다.** 이 학과 학생이 읽었을 때 자기 전공의 이야기로");
  out.push("읽히는가. 기계가 셀 수 있는 것은 여기까지이고, 문면이 현장 말인지는");
  out.push("사람이 읽어야 한다.");
  out.push("");
  out.push(`생성 명령 \`npm run pcu:pack\` · 자동검사 \`npm run pcu:dept\``);
  out.push("");

  try {
    for (const { r } of rows) {
      const core = r.leaf.core_code as string;
      if (coreEntry(core).open_to_students === false) assertPreviewServer(core);
    }
    for (const { family, r } of rows) {
      const core = r.leaf.core_code as string;
      const spec = r.leaf.specialization ?? null;
      const sv = specView(core, spec);
      const specKo = spec ? (specializationOf(core, spec)?.name_ko ?? null) : null;

      const entry: CampusEntry = {
        university_code: u.university_code, college_code: r.college.code,
        department_code: r.leaf.code, core_code: core, specialization: spec,
      };
      const mail = `pack-${r.leaf.code.toLowerCase()}@test.invalid`;
      const st = await makeStudent(mail);
      await query(
        `INSERT INTO entitlements
           (user_id, product_code, kind, tier, major_code, assessment_version, status)
         VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [st.id]);
      const at = await openAttempt({
        userId: st.id, tier: "PRO", stage: "bachelor", gradField: null, campus: entry,
      });
      /* **사람 B 로 돌린다.** 일부 경험과 일부 근거가 있는 처지라 결과지의
         절이 가장 많이 선다(A 는 비어 있고 C 는 빈자리가 적다) */
      await answerAll(core, at, st.id, PEOPLE[1]);
      await submit((await attemptOf(at.id, st.id)) as V3Attempt);

      const ctx = await browser.newContext({
        viewport: { width: 1200, height: 900 },
        ...(gate ? { httpCredentials: gate } : {}),
      });
      const p = await login(ctx, mail, st.pw);
      await p.goto(`${BASE}/v3/${at.id}/result`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(400);
      const fold = p.locator("button", { hasText: "자세한 내용 보기" });
      if (await fold.count()) await fold.first().click().catch(() => undefined);
      for (const d of await p.locator("details").all()) {
        await d.evaluate((el) => el.setAttribute("open", "")).catch(() => undefined);
      }
      await p.waitForTimeout(300);
      const text = await p.locator("body").innerText();
      const head = await p.locator(".rs-head h1, .rs-hero h1, h1").first()
        .innerText().catch(() => "");
      await ctx.close();

      out.push(`## ${family} · ${r.leaf.name}`);
      out.push("");
      out.push(`- 단과대학 ${r.college.name} · Catalog ${r.catalog.catalog_code}`);
      out.push(`- 전공(Major Core) ${coreEntry(core).name_ko}`
        + (specKo ? ` · 갈래 ${specKo}` : " · 갈래 없음(이 Core 를 한 학과가 쓴다)"));
      out.push("");

      out.push("### 1. 대표 문항 다섯");
      out.push("");
      for (const i of fiveItems(core, sv.domainLead)) {
        const w = i.grid_row ? `${i.grid_row} (${i.grid_stem ?? ""})` : i.wording;
        out.push(`- ${w}`);
      }
      out.push("");

      out.push("### 2. 결과 머리말");
      out.push("");
      out.push(quote(head));
      out.push("");

      for (const [title, h] of [
        ["3. 확인된 경험", "내가 이미 가진 근거"],
        ["4. 앞으로 채울 것", "앞으로 채울 것"],
        ["5. 다음에 할 일", "다음에 할 일"],
        ["6. 산업과 직무 연결", "어디에서 찾을지"],
      ] as [string, string][]) {
        out.push(`### ${title}`);
        out.push("");
        out.push(quote(section(text, h).split("\n").slice(0, 16).join("\n")));
        out.push("");
      }

      out.push("### 7. 지원서 활용");
      out.push("");
      out.push(quote(sv.application.resume));
      out.push("");
      out.push("### 8. 면접 활용");
      out.push("");
      out.push(sv.application.interview.length
        ? sv.application.interview.map((t) => `- ${t}`).join("\n")
        : "- _아직 적혀 있지 않습니다._");
      out.push("");
      console.log(`  적었다  ${family.padEnd(14)} ${r.leaf.name}`);
    }
  } finally {
    await browser.close();
  }

  mkdirSync("docs/metri", { recursive: true });
  writeFileSync(OUT, `${out.join("\n")}\n`);
  console.log(`\n대표 학과 ${rows.length} — ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
