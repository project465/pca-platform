/**
 * **기관 배포용 결과지 샘플 참여자.** 실제로 응시했다고 가정하고, 제품의 `submit()` 으로 굳힌다.
 * 응답 · 근거 고르기 · 경험 기록을 사람처럼 넣고 **판정은 제품이 한다**(여기서 하지 않는다).
 * 넷 다 검토용으로 지어낸 참여자이며 실제 사람이 아니다.
 *
 *   V3_PREVIEW_OPEN='*' CASES=PCU_BIZ,PCU_EE,SJEPA_MECH npx tsx scripts/lab/campus-case.ts
 *     → var/pdf-gm/campus-case.json  ({ 사례: 응시 번호 })
 *
 * 진흥원 경영(이서윤)은 `sjepa-case.ts` 가 만든다. 이 파일은 그 틀을 기관 · 학과 · Core 를 받게 넓힌 것이다.
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

const OUT = "var/pdf-gm";

type Grid = [number, number, number];
type Person = {
  tag: string; org: string; leaf: string; core: string; login: string; name: string;
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
    /* 배재대 경영학과 4학년 · 대전 · 마케팅과 데이터 쪽 근거가 있다. 목표는 소비재 마케팅 */
    tag: "PCU_BIZ", org: "PCU", leaf: "PCU26_BIZ", core: "BIZ_CORE_V1",
    login: "zzpcu-sample-biz", name: "김하준",
    grid: {
      TD02: [5, 2, 5], TD08: [5, 2, 5], TD03: [4, 1, 4], TD09: [4, 1, 3], TD01: [4, 1, 4],
      TD10: [3, 1, 3], TD04: [2, 0, 2], TD05: [2, 1, 2], TD06: [2, 0, 2], TD07: [3, 1, 3],
      TD11: [3, 0, 3], TD12: [3, 1, 3],
    },
    level: 2, levelBy: { J8: 1, J7: 1 }, scale5: 4,
    levelIn: {
      TD02: { J1: 2, J2: 3, J3: 2, J4: 2, J5: 3, J6: 2, J7: 2, J8: 1 },
      TD08: { J1: 2, J2: 1, J3: 2, J4: 3, J5: 2, J6: 2, J7: 1, J8: 0 },
      TD03: { J1: 1, J2: 2, J3: 2, J4: 1, J5: 2, J6: 1, J7: 1, J8: 0 },
    },
    pickIn: ["TD02", "TD08", "TD03", "TD09"], picks: 2, artifacts: 2, verify: 1,
    industry: "INDUSTRY_CONSUMER_V1", role: "ROLE_MKT_V1",
    prefer: ["INDUSTRY_CONSUMER_V1", "ROLE_MKT_V1", "INDUSTRY_DIGITAL_V1", "ROLE_ANALYTICS_V1"],
    experiences: (c, art) => [
      {
        kind: "capstone", title: "마케팅 캡스톤 — 대전 지역 식품 브랜드 온라인 판매 개선안",
        started_on: "2026-03", ended_on: "2026-06", td_codes: ["TD02", "TD08"],
        problems: [c("TD02", "J1", 0)], decisions: [c("TD02", "J3", 0), c("TD08", "J4", 0)],
        artifacts: [art("TD02", 0), art("TD08", 0)], verifications: [], used_where: ["수업 발표", "기업 담당자 피드백"],
      },
      {
        kind: "assignment", title: "마케팅조사론 팀과제 — 대학생 커피 소비 설문 분석",
        started_on: "2025-09", ended_on: "2025-12", td_codes: ["TD08"],
        problems: [], decisions: [c("TD08", "J3", 0)],
        artifacts: [art("TD08", 1)], verifications: [], used_where: [],
      },
      {
        kind: "internship", title: "현장실습 — 유통기업 매장 판촉 운영 지원",
        started_on: "2026-07", ended_on: "2026-08", td_codes: ["TD03", "TD09"],
        problems: [c("TD03", "J1", 0)], decisions: [c("TD09", "J3", 0)],
        artifacts: [art("TD03", 1)], verifications: [], used_where: ["매장 주간 보고"],
      },
    ],
  },
  {
    /* 배재대 전기전자공학과 4학년 · 임베디드와 계측 근거 · 목표는 반도체 장비 시험·검증 */
    tag: "PCU_EE", org: "PCU", leaf: "PCU26_EE", core: "EE_CORE_V1",
    login: "zzpcu-sample-ee", name: "박서진",
    grid: {
      TD03: [5, 2, 5], TD12: [5, 2, 5], TD01: [4, 2, 4], TD07: [4, 1, 5], TD02: [4, 1, 4],
      TD11: [3, 1, 3], TD04: [3, 1, 3], TD08: [3, 1, 3], TD05: [2, 0, 2], TD06: [2, 0, 2],
      TD09: [2, 0, 2], TD10: [2, 0, 3],
    },
    level: 2, levelBy: { J8: 1, J7: 1 }, scale5: 4,
    levelIn: {
      TD03: { J1: 2, J2: 3, J3: 3, J4: 2, J5: 3, J6: 2, J7: 2, J8: 1 },
      TD12: { J1: 2, J2: 2, J3: 2, J4: 3, J5: 2, J6: 3, J7: 2, J8: 1 },
      TD01: { J1: 2, J2: 2, J3: 2, J4: 2, J5: 2, J6: 1, J7: 1, J8: 0 },
    },
    pickIn: ["TD03", "TD12", "TD01", "TD07"], picks: 2, artifacts: 2, verify: 1,
    industry: "INDUSTRY_SEMI_V1", role: "ROLE_TEST_V1",
    prefer: ["INDUSTRY_SEMI_V1", "ROLE_TEST_V1", "INDUSTRY_FACTORY_V1", "ROLE_DESIGN_V1"],
    experiences: (c, art) => [
      {
        kind: "capstone", title: "임베디드 캡스톤 — 온습도 센서 모니터링 보드 제작",
        started_on: "2026-03", ended_on: "2026-06", td_codes: ["TD03", "TD12"],
        problems: [c("TD03", "J1", 0)], decisions: [c("TD03", "J3", 0), c("TD12", "J4", 0)],
        artifacts: [art("TD03", 0), art("TD12", 0)], verifications: [], used_where: ["학과 작품 전시"],
      },
      {
        kind: "course", title: "전자회로실험 — 증폭기 주파수 응답 측정",
        started_on: "2025-09", ended_on: "2025-12", td_codes: ["TD01", "TD12"],
        problems: [], decisions: [c("TD01", "J3", 0)],
        artifacts: [art("TD01", 1)], verifications: [], used_where: [],
      },
      {
        kind: "credential", title: "반도체 공정 실습 교육 이수",
        started_on: "2026-01", ended_on: "2026-02", td_codes: ["TD07"],
        problems: [], decisions: [], artifacts: [art("TD07", 0)], verifications: [], used_where: [],
      },
    ],
  },
  {
    /* 세종 거주 구직 참여자 · 기계·자동차 계열 · 목표는 반도체 장비 설비·보전 */
    tag: "SJEPA_MECH", org: "SJEPA", leaf: "SJEPA26_MECH", core: "ME_CORE_V3",
    login: "zzsjepa-sample-mech", name: "최민재",
    grid: {
      TD01: [5, 2, 5], TD09: [5, 2, 5], TD08: [4, 2, 4], TD07: [4, 1, 4], TD10: [4, 1, 4],
      TD05: [3, 1, 3], TD02: [3, 1, 3], TD06: [3, 1, 2], TD03: [2, 0, 2], TD04: [2, 0, 2],
      TD11: [3, 1, 3], TD12: [3, 1, 4],
    },
    level: 2, levelBy: { J8: 1, J7: 1 }, scale5: 4,
    levelIn: {
      TD01: { J1: 2, J2: 2, J3: 3, J4: 2, J5: 3, J6: 2, J7: 2, J8: 1 },
      TD09: { J1: 2, J2: 2, J3: 2, J4: 3, J5: 2, J6: 2, J7: 3, J8: 1 },
      TD08: { J1: 1, J2: 2, J3: 2, J4: 2, J5: 2, J6: 1, J7: 1, J8: 0 },
    },
    pickIn: ["TD01", "TD09", "TD08", "TD07"], picks: 2, artifacts: 2, verify: 1,
    industry: "INDUSTRY_SEMICON_V2", role: "ROLE_MAINT_V2",
    prefer: ["INDUSTRY_SEMICON_V2", "ROLE_MAINT_V2", "INDUSTRY_SMARTFACTORY_V2", "ROLE_DESIGN_V2"],
    experiences: (c, art) => [
      {
        kind: "capstone", title: "기계설계 캡스톤 — 웨이퍼 이송용 그리퍼 설계",
        started_on: "2025-03", ended_on: "2025-06", td_codes: ["TD01", "TD05"],
        problems: [c("TD01", "J1", 0)], decisions: [c("TD01", "J3", 0)],
        artifacts: [art("TD01", 0)], verifications: [], used_where: ["졸업 작품 발표"],
      },
      {
        kind: "internship", title: "청년 일경험 — 장비 제조사 설비 점검 보조",
        started_on: "2026-07", ended_on: "2026-08", td_codes: ["TD09", "TD08"],
        problems: [c("TD09", "J1", 0)], decisions: [c("TD09", "J3", 0)],
        artifacts: [art("TD09", 0)], verifications: [], used_where: ["설비 점검 일지"],
      },
      {
        kind: "credential", title: "공유압 실무 교육 이수",
        started_on: "2026-01", ended_on: "2026-02", td_codes: ["TD09"],
        problems: [], decisions: [], artifacts: [art("TD09", 1)], verifications: [], used_where: [],
      },
    ],
  },
];

async function build(p: Person): Promise<string> {
  const st = await makeStudent(p.login);
  await registerCampusStudent(st.id, p.org, p.leaf);
  const found = allLeaves(university(p.org)!).find((r) => r.leaf.code === p.leaf)!;
  const CORE = p.core;
  const campus: CampusEntry = { university_code: p.org, college_code: found.college.code,
    department_code: p.leaf, core_code: CORE, specialization: found.leaf.specialization ?? null };
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
    [st.id, p.name]);
  return a.id;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const cases: Record<string, string> = {};
  const want = (process.env.CASES ?? "").split(",").filter(Boolean);
  for (const p of PEOPLE) if (!want.length || want.includes(p.tag)) cases[p.tag] = await build(p);
  writeFileSync(`${OUT}/campus-case.json`, JSON.stringify(cases, null, 1));
  console.log(cases);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
