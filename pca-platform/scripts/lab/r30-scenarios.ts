/**
 * **BIZ 학생 넷을 실제 코드 길로 돌려, 세 화면이 읽는 값을 한 장에 뜬다.**
 *
 * 화면을 찍는 자리가 아니다. 결과지의 `현재 상태` · `/me` 의 `현재 상태` ·
 * `지금 할 일` Hero · 근거 절 · 할 일 · 빈자리가 **같은 응시에서 무엇을
 * 읽어 어떤 글자를 내놓는지**를 서버 함수로 그대로 불러 적는다. 그래서
 * 고치기 전과 고친 뒤를 글자로 견줄 수 있고, 네 사람의 결과가 서로 갈리는지
 * (개인화)도 같은 표에서 읽힌다.
 *
 * 사람 넷:
 *   A  거의 경험이 없는 학생
 *   B  활동은 있는데 직무 연결이 약한 학생
 *   C  여러 영역을 직접 수행하고 증거가 있는 학생
 *   D  C 와 같은 활동량인데 **직접 정한 것이 없는** 학생(역할이 다르다)
 *
 * B 와 C 에게는 경험 하나를 서버 함수로 적고(`addExperience` → `applyRecompute`)
 * 그 앞뒤의 `/me` 값을 같이 적는다: Experience → Evidence → Action → /me 가
 * 실제로 이어지는지가 여기서 드러난다.
 *
 *   OUT=var/r30 npx tsx scripts/lab/r30-scenarios.ts
 *
 * **등록부와 측정에 한 글자도 쓰지 않는다.** 만드는 것은 시험용 계정과 그
 * 계정의 응시뿐이고 `makeStudent` 가 같은 이름을 지우고 다시 만든다.
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import { query } from "../../src/lib/db";
import { makeStudent } from "../_loop-fixture";
import { PEOPLE, answerAll, type Policy } from "../_v3-answer";
import { allLeaves, university } from "../../src/lib/campus/registry";
import {
  attemptOf, checklistFor, domainName, openAttempt, submit, type V3Attempt,
} from "../../src/lib/me-v3/runtime/session";
import type { CampusEntry } from "../../src/lib/me-v3/runtime/session";
import {
  addExperience, currentState, experiencesOf, latestResult,
} from "../../src/lib/me-v3/platform";
import { openActions } from "../../src/lib/me-v3/open-actions";
import { applyRecompute } from "../../src/lib/me-v3/recompute";
import { coreOf, type ResultModel } from "../../src/lib/me-v3/result/model";
import {
  actionBriefKo, actionHeadKo, actionKo, actionWhyKo, evidenceStoryKo, gapKo,
  headlineKo, ZONE_TITLE_KO,
} from "../../src/lib/me-v3/result/text.ko";
import { studentStateView } from "../../src/lib/me-v3/student";
import { thingKo } from "../../src/lib/me-v3/result/say";
import type { Zone } from "../../src/lib/me-v3/scoring/types";

const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const OUT = process.env.OUT ?? "var/r30";

/** D: C 와 같은 활동량이지만 조건·기준을 직접 정한 적이 없다 */
const D: Policy = {
  ...PEOPLE[2], id: "D", name: "C 와 비슷한 활동이지만 직접 정한 것이 없는 학생",
  level: 2, levelBy: { J3: 1, J5: 2 }, picks: 2, artifacts: 2, verify: 2,
};
const WHO: Policy[] = [...PEOPLE, D];

function leafOf(core: string): CampusEntry | null {
  const u = university("PCU");
  if (!u) return null;
  const row = allLeaves(u).find((r) => r.leaf.core_code === core);
  if (!row) return null;
  return {
    university_code: u.university_code, college_code: row.college.code,
    department_code: row.leaf.code, core_code: core,
    specialization: row.leaf.specialization ?? null,
  };
}

type Snap = {
  who: string; name: string; attempt: string;
  focus: string[]; zones: Record<string, string>;
  headline: { title: string; lead: string };
  result_state: { lead: string; tiles: { name: string; sub: string; zone: string;
    actual_artifacts: string[] }[] };
  me_state: { ready: { name: string; sub: string; zone: string; actual_artifacts: string[] }[];
    stage: string; lead: string };
  hero: { head: string; brief: string; gain: string; domain: string | null; code: string } | null;
  gaps: { title: string; why: string }[];
  actions: { code: string; domain: string | null; axis: string | null; do: string }[];
  evidence: { domain: string; did: string[]; decided: string[]; artifacts: string[];
    verifications: string[]; story: { action: string; decision?: string; outputs: string[];
    application: string; interview: string } }[];
  packs: { industry: string | null; role: string | null };
};

async function snap(who: Policy, userId: string, attempt: string): Promise<Snap> {
  const m = (await latestResult(userId)) as ResultModel;
  const core = coreOf(m);
  const name = (td: string) => domainName(core, td);
  const dom = (td: string) => m.domains.find((d) => d.code === td);
  const focus = m.overview.focus;
  const zones: Record<string, Zone> = {};
  for (const d of m.domains) zones[d.code] = d.zone;
  const st = await currentState(userId);
  const act = await openActions(userId);
  const first = act.rows.filter((a) => a.state !== "done")[0] ?? null;
  const nowModel = first
    ? m.actions.find((a) => (a.domain ?? "") === (first.td_code ?? "")
        && (a.axis ?? "") === (first.axis_code ?? "")) ?? null
    : null;
  /* 두 화면이 실제로 부르는 같은 함수를 부른다(R30) */
  const rv = studentStateView(core, m, zones, 3);
  const mv = studentStateView(core, st.model, st.zoneOf, 3);
  return {
    who: who.id, name: who.name, attempt,
    focus, zones,
    headline: headlineKo(m, name),
    result_state: {
      lead: rv.lead,
      tiles: rv.tiles.map((t) => ({
        name: name(t.code), sub: `${t.sub} [${t.kind}]`, zone: t.zone,
        actual_artifacts: (dom(t.code)?.artifacts ?? []).map(thingKo),
      })),
    },
    me_state: {
      stage: st.stage,
      lead: mv.lead,
      ready: mv.tiles.map((t) => ({
        name: name(t.code), sub: `${t.sub} [${t.kind}]`, zone: t.zone,
        actual_artifacts: (dom(t.code)?.artifacts ?? []).map(thingKo),
      })),
    },
    hero: nowModel ? {
      code: nowModel.code, domain: nowModel.domain ? name(nowModel.domain) : null,
      head: actionHeadKo(nowModel, nowModel.domain ? name(nowModel.domain) : ""),
      brief: actionBriefKo(nowModel, nowModel.domain ? name(nowModel.domain) : ""),
      gain: actionWhyKo(nowModel),
    } : null,
    gaps: st.gaps.slice(0, 4).map((g) => {
      const k = gapKo(g, name(g.domain)); return { title: k.title, why: k.why };
    }),
    actions: m.actions.map((a) => ({
      code: a.code, domain: a.domain ? name(a.domain) : null, axis: a.axis,
      do: actionKo(a, a.domain ? name(a.domain) : "", m.stage).do,
    })),
    evidence: focus.slice(0, 3).map((td) => {
      const d = dom(td)!;
      const s = evidenceStoryKo(core, td, {
        did: d.did[0] ?? null, decided: d.decided[0] ?? null,
        decisions: d.decided, artifacts: d.artifacts, verifications: d.verifications,
      }, "lead", name(td));
      return {
        domain: name(td), did: d.did, decided: d.decided, artifacts: d.artifacts,
        verifications: d.verifications,
        story: { action: s.action, decision: s.decision, outputs: s.outputs,
          application: s.application, interview: s.interview },
      };
    }),
    packs: { industry: m.industry_context?.code ?? null, role: m.role_context?.code ?? null },
  };
}

/** 경험 하나를 서버 함수로 적고 더한다. **화면이 보내는 꼴 그대로** */
async function addOne(
  userId: string, core: string, td: string, title: string,
  n: { problems: number; decisions: number; artifacts: number; verify: number } =
    { problems: 2, decisions: 2, artifacts: 1, verify: 1 },
) {
  const lists = checklistFor(core, td);
  const pick = (slot: string, k: number) =>
    (lists.find((l) => l.slot === slot)?.items ?? []).slice(0, k);
  const id = await addExperience(userId, {
    kind: "assignment", title, started_on: "2025-03", ended_on: null,
    td_codes: [td], axis_codes: [],
    problems: pick("J1", n.problems), decisions: pick("J3", n.decisions),
    artifacts: pick("ARTIFACT", n.artifacts), verifications: pick("VERIFY", n.verify),
    used_where: ["수업이나 과제 평가에 들어갔다"], note_text: "",
  });
  const plan = await applyRecompute(userId);
  return { id, moved: plan.moved.map((c) => `${domainName(core, c.domain)}·${c.axis} ${c.before}→${c.after}`),
    zone_moves: plan.zone_moves.map((z) => `${domainName(core, z.domain)} ${z.before}→${z.after}`),
    closed_gaps: plan.closed_gaps.length };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const leaf = leafOf(CORE);
  if (!leaf) throw new Error(`${CORE} 를 가리키는 PCU 자리가 없다`);
  const out: Record<string, unknown> = {};
  for (const who of WHO) {
    const mail = `r30-${CORE.toLowerCase()}-${who.id.toLowerCase()}@test.invalid`;
    const st = await makeStudent(mail);
    await query(
      `INSERT INTO entitlements (user_id, product_code, kind, tier, major_code, assessment_version, status)
       VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [st.id]);
    const a = await openAttempt({
      userId: st.id, tier: "PRO", stage: "bachelor", gradField: null, campus: leaf,
    });
    if (a.core_code !== CORE) throw new Error(`응시 Core 가 ${a.core_code}`);
    await answerAll(CORE, a, st.id, who);
    const done = (await attemptOf(a.id, st.id)) as V3Attempt;
    await submit(done);
    const before = await snap(who, st.id, a.id);
    const rec: Record<string, unknown> = { login: mail, before };
    if (who.id === "B" || who.id === "C") {
      /* B: 첫 빈자리(검증이 비어 있는 영역)에 **견준 것 둘**을 적는다 →
         그 축이 실제로 올라가야 한다 · C: 먼저 볼 영역에 결과물 둘을 더 적는다
         → 이미 더 높이 선 축이라 아무것도 움직이지 않아야 한다 */
      const m = (await latestResult(st.id)) as ResultModel;
      const g0 = m.gaps[0];
      const td = who.id === "B" ? (g0?.domain ?? m.overview.focus[0]) : m.overview.focus[0];
      const added = await addOne(st.id, CORE, td,
        who.id === "B" ? "학회 홍보 예산안을 짜고 집행한 일" : "팀 과제 사업계획서 초안 정리",
        who.id === "B" ? { problems: 0, decisions: 0, artifacts: 0, verify: 2 }
          : { problems: 2, decisions: 2, artifacts: 2, verify: 2 });
      rec.experience = { td: domainName(CORE, td), ...added };
      rec.after = await snap(who, st.id, a.id);
      rec.experiences = (await experiencesOf(st.id)).map((e) => e.title);
    }
    out[who.id] = rec;
    console.log(`${who.id} ${who.name} · 응시 ${a.id} · focus ${before.focus.map((t) => domainName(CORE, t)).join(" / ")}`);
  }
  writeFileSync(`${OUT}/scenarios.json`, JSON.stringify(out, null, 2));

  /* 사람이 읽는 표 */
  const L: string[] = [`# R30 시나리오 · ${CORE}`, ""];
  for (const who of WHO) {
    const r = out[who.id] as { before: Snap; after?: Snap; experience?: unknown; login: string };
    const b = r.before;
    L.push(`## ${who.id} · ${who.name}`, "", `- 계정 \`${r.login}\` · 응시 ${b.attempt}`);
    L.push(`- headline: **${b.headline.title}** — ${b.headline.lead}`);
    L.push(`- focus: ${b.focus.map((t) => `${domainName(CORE, t)}(${b.zones[t]})`).join(" · ") || "(없음)"}`);
    L.push(`- Result 현재 상태 머리: \`${b.result_state.lead}\``);
    for (const t of b.result_state.tiles) {
      L.push(`  - ${t.name} · sub \`${t.sub}\` · zone ${t.zone} · 실제 남긴 것 ${t.actual_artifacts.join(", ") || "(없음)"}`);
    }
    L.push(`- /me 현재 상태(stage ${b.me_state.stage}) 머리: \`${b.me_state.lead}\``);
    for (const t of b.me_state.ready) {
      L.push(`  - ${t.name} · sub \`${t.sub}\` · zone ${t.zone} · 실제 남긴 것 ${t.actual_artifacts.join(", ") || "(없음)"}`);
    }
    if (!b.me_state.ready.length) L.push("  - (설명할 수 있는 영역 없음)");
    L.push(`- Hero: ${b.hero ? `[${b.hero.code}] **${b.hero.head}** / ${b.hero.brief} / ${b.hero.gain}` : "(할 일 없음)"}`);
    L.push(`- gaps: ${b.gaps.map((g) => g.title).join(" | ") || "(없음)"}`);
    L.push(`- actions: ${b.actions.map((a) => `[${a.code}${a.domain ? ` ${a.domain}` : ""}] ${a.do}`).join(" | ") || "(없음)"}`);
    for (const e of b.evidence) {
      L.push(`- 근거 ${e.domain}: did ${e.did.length} · decided ${e.decided.length} · artifacts ${e.artifacts.length} · verifications ${e.verifications.length}`);
      L.push(`  - 이야기: ${e.story.action}${e.story.decision ? ` / ${e.story.decision}` : ""} / 남긴 것 ${e.story.outputs.join(", ") || "(없음)"}`);
      L.push(`  - 지원서 ${e.story.application} · 면접 ${e.story.interview}`);
    }
    if (r.experience) {
      L.push(`- **경험 추가**: ${JSON.stringify(r.experience, null, 0)}`);
      const a = r.after!;
      L.push(`- 추가 뒤 /me(stage ${a.me_state.stage}): ${a.me_state.ready.map((t) => `${t.name}(${t.zone}) sub \`${t.sub}\``).join(" · ") || "(없음)"}`);
      L.push(`- 추가 뒤 Hero: ${a.hero ? `[${a.hero.code}] ${a.hero.head} / ${a.hero.brief}` : "(없음)"}`);
      L.push(`- 추가 뒤 gaps: ${a.gaps.map((g) => g.title).join(" | ") || "(없음)"}`);
    }
    L.push("");
  }
  writeFileSync(`${OUT}/scenarios.md`, `${L.join("\n")}\n`);
  console.log(`\n떴다 → ${OUT}/scenarios.md`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
