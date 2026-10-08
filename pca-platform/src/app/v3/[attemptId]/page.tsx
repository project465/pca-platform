import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { OWNERSHIP } from "@/lib/me-v3/scoring/ownership";
import { controlOf } from "@/lib/me-v3/runtime/menus";
import {
  answersOf, attemptOf, axisLabel, checklistFor, industryChoices, itemOf,
  menuContextOf, moveTo, optionGuidance, roleChoices, viewOf, wordingOf,
} from "@/lib/me-v3/runtime/session";
import type { Field, Group, ProgressModel, ScreenModel } from "./model";
import {
  INDUSTRY_HINT, OWNERSHIP_TAG, ROLE_HINT, TIER_WHAT,
} from "../tier-text";
import Screen from "./screen";

export const metadata = { title: "검사 · CareerMatri" };

/**
 * 지금 보여 줄 화면 하나.
 *
 * **이 화면의 문항만 만든다.** 291개를 한 번에 내려보내면 첫 화면이 그만큼
 * 늦게 서고, 열리지 않은 팩 문항까지 브라우저에 들어간다.
 *
 * **주소에는 몇째인가만 적는다.** 화면 이름에 `grid-TD03` 처럼 내부 코드가
 * 들어 있어서 주소에 적으면 응시자가 그것을 본다. 이어보기 자리는 DB 에
 * 이름으로 남는다.
 */
export default async function V3Screen({
  params, searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  const { s: q } = await searchParams;

  const a0 = await attemptOf(attemptId, user.id);
  if (!a0) notFound();

  const want = q === undefined ? null : Number(q);
  const v = await viewOf(a0, null, Number.isFinite(want) ? want : null);
  /* 이어보기 자리를 맞춰 둔다. 자바스크립트가 꺼져 있어도 다음에 들어오면
     보던 자리가 열린다 */
  if (v.attempt.current_screen !== v.screen.id) await moveTo(v.attempt.id, v.screen.id);

  const stage = v.attempt.education_stage;
  const sc = v.screen;

  const fieldOf = async (id: string, label?: string): Promise<Field | null> => {
    const it = itemOf(id);
    if (!it) return null;
    const ctx = await menuContextOf(v.attempt);
    const control = controlOf(it, ctx);
    const ans = v.answers[id];
    const value = !ans || ans.kind === "skipped" ? null
      : ans.kind === "level" ? ans.index
        : ans.kind === "choice" ? ans.value : ans.value;
    return {
      itemId: id, label, control, value,
      note: v.notes[id] ?? "",
      /* 보기 넷의 뜻은 `ownership.ts` 하나에서 온다. 화면이 따로 적으면
         어느 날 채점과 다른 말을 한다 */
      optionHelp: control.kind === "level" ? OWNERSHIP.map((o) => o.means) : undefined,
      optionTag: control.kind === "level" ? OWNERSHIP_TAG : undefined,
    };
  };

  const fields: Field[] = [];
  for (const id of sc.items) {
    const it = itemOf(id);
    /* 격자와 선호 화면은 줄 이름이 필요하다. 격자는 어미, 선호는 문면 */
    const label = sc.kind === "grid" ? (it?.grid_stem ?? undefined)
      : sc.kind === "multi" ? wordingOf(id, stage) : undefined;
    const f = await fieldOf(id, label ?? undefined);
    if (f) fields.push(f);
  }

  const dom = sc.domain;
  const groups: Group[] | undefined = sc.kind === "checklist" && dom
    ? checklistFor(dom).map((g) => ({
        slot: g.slot,
        /* 묶음마다 `· 내가 정한 것` 을 되풀이하지 않는다. 그 말은 질문이
           이미 하고 있고, 열 번 되풀이되면 묶음 이름이 안 읽힌다 */
        label: g.slot === "ARTIFACT" || g.slot === "VERIFY" ? g.label : axisLabel(g.slot),
        items: g.items,
        picked: g.slot === "ARTIFACT" ? (v.picks.artifacts[dom] ?? [])
          : g.slot === "VERIFY" ? (v.picks.verifications[dom] ?? [])
            : (v.picks.checklists[`${dom}.${g.slot}`] ?? []),
      }))
    : undefined;

  /* 고르기 전에 읽는 한 줄. 팩의 `demands` 는 문항이 서는 장면이라 길고,
     역할에 영역 이름을 늘어놓으면 **우리 분류를 읽으라는 화면**이 된다 */
  const packs = sc.kind === "pick-industry"
    ? industryChoices().map((p) => ({
        code: p.code, name: p.name, gloss: INDUSTRY_HINT[p.code] ?? p.first,
      }))
    : sc.kind === "pick-role"
      ? roleChoices().map((p) => ({
          code: p.code, name: p.name,
          gloss: ROLE_HINT[p.code] ?? p.domains.slice(0, 3).join(" · "),
        }))
      : undefined;

  const answered = Object.keys(await answersOf(v.attempt.id)).length;

  const model: ScreenModel = {
    attemptId: v.attempt.id,
    kind: sc.kind,
    index: v.index,
    prevIndex: v.prevIndex,
    nextIndex: v.nextIndex,
    required: sc.required,
    eyebrow: sc.eyebrow,
    subject: sc.subject,
    question: sc.question,
    help: sc.help,
    guide: fields.some((f) => f.control.kind === "level") ? optionGuidance() : undefined,
    fields,
    groups,
    domain: sc.domain,
    packs,
    picked: sc.kind === "pick-industry" ? v.attempt.industry_pack
      : sc.kind === "pick-role" ? v.attempt.role_pack : null,
    answered,
    done: v.attempt.status !== "in_progress",
    /* 기본 정보는 시작 화면에서 받았다. 이 화면은 **고치는 자리**다 */
    profile: sc.kind === "profile"
      ? { stage, field: v.attempt.grad_field } : undefined,
  };

  /* 지나온 단계 하나와 지금과 다음 하나만 적는다. 여덟을 늘어놓으면
     그것이 질문보다 큰 덩이가 되고 좁은 화면에서는 세 줄로 접힌다 */
  const list = v.progress.stages;
  const at = list.findIndex((x) => x.state === "current");
  const prog: ProgressModel = {
    prev: at > 0 ? list[at - 1].label : null,
    now: list[at]?.label ?? "",
    next: at >= 0 && at < list.length - 1 ? list[at + 1].label : null,
    inStage: { index: v.progress.inStage.index, total: v.progress.inStage.total },
    percent: Math.round((v.progress.screen.index / v.progress.screen.total) * 100),
  };

  return (
    <Screen s={model} prog={prog}
      tier={v.attempt.tier} tierLabel={TIER_WHAT[v.attempt.tier].label} />
  );
}
