/**
 * **사람 셋이 답하는 규칙과, 그 규칙대로 응시를 끝까지 채우는 자리.**
 *
 * 두 검사가 같은 길을 밟는다: 상용 콘텐츠 QA(`v3:content:qa`)와 학과
 * 결과 대조(`pcu:generic`). **베껴 두면 화면이 한 번 바뀐 날 한 곳만
 * 고쳐진다** — 이 저장소가 `_loop-fixture` 와 `_v3-walk` 에서 이미 겪은
 * 자리다.
 *
 * 화면 글자가 필요한 쪽은 `onScreen` 을 넘긴다. 넘기지 않으면 아무것도
 * 모으지 않는다.
 */
import { packs } from "../src/lib/me-v3/core-registry";
import { controlOf } from "../src/lib/me-v3/runtime/menus";
import {
  attemptOf, checklistFor, choosePack, content, itemOf, menuContextOf, moveTo,
  saveAnswer, savePicks, viewOf,
} from "../src/lib/me-v3/runtime/session";
import type { Answer } from "../src/lib/me-v3/scoring/types";
import type { V3Attempt } from "../src/lib/me-v3/runtime/session";

/**
 * 사람이 답하는 규칙.
 *
 * `level` 은 보기 넷의 자리(0~3)이고 `levelBy` 가 축마다 그 자리를
 * 덮는다. `picks` 는 근거 묶음마다 앞에서부터 고를 수다: **지어내지 않고**
 * 실제 체크리스트에서 센다.
 */
export type Policy = {
  id: string; name: string;
  grid: [number, number, number];
  level: number; levelBy?: Record<string, number>;
  scale5: number;
  picks: number; artifacts: number; verify: number;
  /** 고르기 문항에서 몇째 보기를 고르는가 */
  choice: number;
};

/** 받은 규격 §2 의 세 처지. **Core 와 무관하게 같은 규칙이다** */
export const PEOPLE: Policy[] = [
  {
    id: "A", name: "거의 경험이 없는 학생",
    grid: [2, 0, 2], level: 0, scale5: 2,
    picks: 0, artifacts: 0, verify: 0, choice: 0,
  },
  {
    id: "B", name: "일부 경험과 일부 증거가 있는 학생",
    grid: [4, 1, 4], level: 1, levelBy: { J1: 2, J3: 2 }, scale5: 4,
    picks: 1, artifacts: 0, verify: 0, choice: 1,
  },
  {
    id: "C", name: "여러 영역을 직접 수행하고 증거가 있는 학생",
    grid: [5, 2, 4], level: 2, levelBy: { J3: 3, J5: 3 }, scale5: 5,
    picks: 2, artifacts: 2, verify: 2, choice: 2,
  },
];

export function firstPack(core: string, kind: "industry" | "role"): string | null {
  try {
    const p = packs<{ packs: { code: string }[] }>(core, kind);
    return p.packs[0]?.code ?? null;
  } catch { return null; }
}

export async function answerAll(
  core: string, a0: V3Attempt, userId: string, pol: Policy,
  onScreen?: (core: string, a: V3Attempt, v: Awaited<ReturnType<typeof viewOf>>)
    => Promise<string>,
): Promise<string[]> {
  const ind = firstPack(core, "industry");
  const role = firstPack(core, "role");
  for (const d of content(core).domains.domains) {
    await saveAnswer(a0.id, `G_${d.code}_INT`, { kind: "scale5", value: pol.grid[0] });
    await saveAnswer(a0.id, `G_${d.code}_EXP`, { kind: "exposure", value: pol.grid[1] });
    await saveAnswer(a0.id, `G_${d.code}_LEA`, { kind: "scale5", value: pol.grid[2] });
  }
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  const screens: string[] = [];
  let want: string | null = null, guard = 0;
  for (;;) {
    if ((guard += 1) > 400) throw new Error("화면이 끝나지 않는다");
    const v = await viewOf(a, want);
    if (onScreen) screens.push(await onScreen(core, a, v));
    const ctx = await menuContextOf(a);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const it = itemOf(core, id);
      if (!it) continue;
      const control = controlOf(it, ctx);
      let ans: Answer | null = null;
      if (control.kind === "level") {
        const ax = it.evidence_axis ?? "";
        const idx = pol.levelBy?.[ax] ?? pol.level;
        ans = { kind: "level", index: Math.min(idx, control.options.length - 1) };
      } else if (control.kind === "scale5") {
        ans = { kind: "scale5", value: pol.scale5 };
      } else if (control.kind === "exposure") {
        ans = { kind: "exposure", value: pol.grid[1] };
      } else if (control.kind === "steps") {
        const opts = control.options.filter((o) => o.value !== null);
        const pick = control.answer === "exposure"
          ? opts[Math.min(pol.grid[1], opts.length - 1)]
          : opts[Math.min(pol.scale5 - 1, opts.length - 1)];
        ans = control.answer === "exposure"
          ? { kind: "exposure", value: pick.value as number }
          : { kind: "scale5", value: pick.value as number };
      } else if (control.kind === "choice" && control.options.length) {
        ans = {
          kind: "choice",
          value: control.options[Math.min(pol.choice, control.options.length - 1)].value,
        };
      }
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain) {
      for (const g of checklistFor(core, v.screen.domain)) {
        const n = g.slot === "ARTIFACT" ? pol.artifacts
          : g.slot === "VERIFY" ? pol.verify : pol.picks;
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, n));
      }
    }
    if (v.screen.kind === "pick-industry" && ind) await choosePack(core, a.id, "industry", ind);
    if (v.screen.kind === "pick-role" && role) await choosePack(core, a.id, "role", role);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); break; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
  return screens;
}
