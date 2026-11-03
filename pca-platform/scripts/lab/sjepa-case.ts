/**
 * **세종일자리경제진흥원(SJEPA) 결과지 샘플용 참여자 한 명.** 제품의 `submit()` 으로 굳힌다.
 * 상경·사무 계열 · 경영·사무(`SJEPA26_BIZ`) 로 들어온 세종 거주 구직 참여자이고, 전략·데이터·
 * 재무 쪽 근거가 있다. 목표는 공공기관 경영기획. **검토용으로 지어낸 참여자이며 실제 사람이 아니다.**
 * 판정을 여기서 하지 않는다: 응답과 근거와 경험 기록을 넣고 제품이 판정한다.
 *   V3_PREVIEW_OPEN='*' npx tsx scripts/lab/sjepa-case.ts   → var/pdf-gm/sjepa-case.json
 */
import { loadEnv, makeStudent, registerCampusStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import { query } from "../../src/lib/db";
import { allLeaves, university } from "../../src/lib/campus/registry";
import { controlOf } from "../../src/lib/me-v3/runtime/menus";
import {
  attemptOf, checklistFor, choosePack, content, itemOf, menuContextOf, moveTo,
  openAttempt, saveAnswer, savePicks, submit, viewOf, type CampusEntry, type V3Attempt,
} from "../../src/lib/me-v3/runtime/session";
import { addExperience } from "../../src/lib/me-v3/platform";
import type { Answer } from "../../src/lib/me-v3/scoring/types";

const CORE = "BIZ_CORE_V1", LEAF = "SJEPA26_BIZ", ORG = "SJEPA";
const OUT = "var/pdf-gm";

type Grid = [number, number, number];
type Person = {
  tag: "SJEPA";
  login: string;
  grid: Record<string, Grid>;
  level: number; levelBy: Record<string, number>;
  /** 영역마다 축의 보기 자리를 덮는다 (영역 → 축 → 0~3) */
  levelIn?: Record<string, Record<string, number>>;
  scale5: number;
  /** 근거를 고를 영역과 묶음마다 고를 수 */
  pickIn: string[]; picks: number; artifacts: number; verify: number;
  industry: string; role: string;
  /** 고르기 문항에서 먼저 고를 값 */
  prefer: string[];
  experiences: (c: (td: string, axis: string, i: number) => string, art: (td: string, i: number) => string) => Parameters<typeof addExperience>[1][];
};

const BASE: Grid = [3, 0, 3];
const PEOPLE: Person[] = [
  {
    tag: "SJEPA", login: "zzsjepa-sample-01",
    grid: {
      TD01: [5, 2, 5], TD08: [5, 2, 5], TD02: [4, 2, 4], TD04: [4, 1, 4], TD05: [4, 1, 3],
      TD07: [3, 1, 3], TD03: [3, 1, 2], TD06: [2, 0, 2], TD09: [2, 1, 2], TD10: [2, 0, 2],
      TD11: [3, 0, 4], TD12: [3, 1, 3],
    },
    level: 2, levelBy: { J8: 1, J7: 1 }, scale5: 4,
    levelIn: {
      TD01: { J1: 2, J2: 2, J3: 3, J4: 2, J5: 3, J6: 2, J7: 1, J8: 1 },
      TD08: { J1: 2, J2: 1, J3: 1, J4: 3, J5: 2, J6: 3, J7: 2, J8: 0 },
      TD02: { J1: 1, J2: 2, J3: 2, J4: 1, J5: 2, J6: 1, J7: 0, J8: 0 },
    },
    pickIn: ["TD01", "TD08", "TD02", "TD04"], picks: 2, artifacts: 2, verify: 1,
    industry: "INDUSTRY_PUBLIC_V1", role: "ROLE_PLAN_V1",
    prefer: ["INDUSTRY_PUBLIC_V1", "ROLE_PLAN_V1", "INDUSTRY_B2B_V1", "ROLE_ANALYTICS_V1"],
    experiences: (c, art) => [
      {
        kind: "capstone", title: "경영전략 캡스톤 — 세종 지역 서비스 기업 신사업 검토",
        started_on: "2026-03", ended_on: "2026-06", td_codes: ["TD01", "TD08"],
        problems: [c("TD01", "J1", 0)], decisions: [c("TD01", "J3", 0), c("TD08", "J4", 0)],
        artifacts: [art("TD01", 0), art("TD08", 0)], verifications: [],
        used_where: ["수업 발표"],
      },
      {
        kind: "assignment", title: "원가회계 팀과제 — 제품별 원가 계산",
        started_on: "2025-09", ended_on: "2025-12", td_codes: ["TD05"],
        problems: [], decisions: [c("TD05", "J3", 0)],
        artifacts: [art("TD05", 2)], verifications: [], used_where: [],
      },
      {
        kind: "internship", title: "청년 일경험 프로그램 — 공공기관 사업 실적 자료 정리",
        started_on: "2026-07", ended_on: "2026-08", td_codes: ["TD08", "TD04"],
        problems: [c("TD08", "J1", 0)], decisions: [c("TD08", "J3", 0)],
        artifacts: [art("TD08", 1)], verifications: [], used_where: ["기관 내부 보고"],
      },
    ],
  },
];

async function build(p: Person): Promise<string> {
  const st = await makeStudent(p.login);
  await registerCampusStudent(st.id, ORG, LEAF);
  const found = allLeaves(university(ORG)!).find((r) => r.leaf.code === LEAF)!;
  const campus: CampusEntry = { university_code: ORG, college_code: found.college.code,
    department_code: LEAF, core_code: CORE, specialization: found.leaf.specialization ?? null };
  const a0 = await openAttempt({ userId: st.id, tier: "PRO", stage: "bachelor" as never, gradField: null, campus });
  for (const d of content(CORE).domains.domains) {
    const g = p.grid[d.code] ?? BASE;
    await saveAnswer(a0.id, `G_${d.code}_INT`, { kind: "scale5", value: g[0] });
    await saveAnswer(a0.id, `G_${d.code}_EXP`, { kind: "exposure", value: g[1] });
    await saveAnswer(a0.id, `G_${d.code}_LEA`, { kind: "scale5", value: g[2] });
  }
  let a = (await attemptOf(a0.id, st.id)) as V3Attempt;
  let want: string | null = null, guard = 0;
  for (;;) {
    if ((guard += 1) > 400) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    const ctx = await menuContextOf(a);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const it = itemOf(CORE, id);
      if (!it) continue;
      const control = controlOf(it, ctx);
      let ans: Answer | null = null;
      if (control.kind === "level") {
        const ax = it.evidence_axis ?? "";
        const idx = p.levelIn?.[it.technical_domain ?? ""]?.[ax] ?? p.levelBy[ax] ?? p.level;
        ans = { kind: "level", index: Math.min(idx, control.options.length - 1) };
      } else if (control.kind === "scale5") {
        ans = { kind: "scale5", value: p.scale5 };
      } else if (control.kind === "exposure") {
        ans = { kind: "exposure", value: 1 };
      } else if (control.kind === "steps") {
        const opts = control.options.filter((o) => o.value !== null);
        const pick = opts[Math.min(control.answer === "exposure" ? 1 : p.scale5 - 1, opts.length - 1)];
        ans = control.answer === "exposure"
          ? { kind: "exposure", value: pick.value as number }
          : { kind: "scale5", value: pick.value as number };
      } else if (control.kind === "choice" && control.options.length) {
        const hit = p.prefer.map((v) => control.options.find((o) => String(o.value) === v)).find(Boolean);
        ans = { kind: "choice", value: (hit ?? control.options[0]).value };
      }
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain && p.pickIn.includes(v.screen.domain)) {
      const lv = p.levelIn?.[v.screen.domain] ?? {};
      for (const g of checklistFor(CORE, v.screen.domain)) {
        /* 근거는 '해 봤다' 이상으로 답한 축에서만 고른다. 직접 정했다고 답한 축은 둘 */
        const at = lv[g.slot] ?? p.levelBy[g.slot] ?? p.level;
        const n = g.slot === "ARTIFACT" ? p.artifacts : g.slot === "VERIFY" ? p.verify
          : at >= 3 ? 2 : at >= 2 ? 1 : 0;
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, n));
      }
    }
    if (v.screen.kind === "pick-industry") await choosePack(CORE, a.id, "industry", p.industry);
    if (v.screen.kind === "pick-role") await choosePack(CORE, a.id, "role", p.role);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId); want = v.nextId;
    a = (await attemptOf(a.id, st.id)) as V3Attempt;
  }
  await submit((await attemptOf(a.id, st.id)) as V3Attempt);

  /* 경험 기록: 체크리스트와 영역 사전의 문장을 쓴다 */
  const cl = content(CORE).checklists.domains;
  const dm = content(CORE).domains.domains;
  const c = (td: string, axis: string, i: number) => cl[td]?.[axis]?.[i]?.text ?? "";
  const art = (td: string, i: number) => dm.find((d) => d.code === td)?.artifacts[i] ?? "";
  for (const e of p.experiences(c, art)) await addExperience(st.id, e);
  await query(`UPDATE users SET display_name = $2 WHERE id = $1`,
    [st.id, "샘플 참여자"]);
  return a.id;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const cases: Record<string, string> = {};
  for (const p of PEOPLE) cases[p.tag] = await build(p);
  writeFileSync(`${OUT}/sjepa-case.json`, JSON.stringify(cases, null, 1));
  console.log(cases);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
