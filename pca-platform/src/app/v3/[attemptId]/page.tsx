import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { majorExamplesOf, majorNameOf } from "@/lib/me-v3/major-name";
import { resultMeta } from "@/lib/me-v3/result/meta";
import { OWNERSHIP } from "@/lib/me-v3/scoring/ownership";
import { controlOf } from "@/lib/me-v3/runtime/menus";
import {
  answersOf, attemptOf, axisAsk, checklistFor, content, domainName,
  industryChoices, itemOf, menuContextOf, moveTo, optionGuidance, orgChoices,
  roleChoices, viewOf, wordingOf,
} from "@/lib/me-v3/runtime/session";
import type { Field, Group, PickKind, ProgressModel, ScreenModel } from "./model";
import {
  INDUSTRY_HINT, ORG_HINT, OWNERSHIP_EXAMPLE, OWNERSHIP_HELP, OWNERSHIP_LABEL,
  ROLE_HINT, TIER_WHAT,
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
  /* 이 응시에서 **보기 넷을 처음 만나는 화면**인가. 뜻풀이를 거기서만 펼친다 */
  const levelScreens = v.plan.screens.filter((x) =>
    x.items.some((id) => itemOf(a0.core_code, id)?.response_scale === "L0~L3"));
  const firstLevel = levelScreens.length > 0 && levelScreens[0].id === sc.id;

  /* 한 화면에 보기 넷짜리 문항이 둘이면 **뜻풀이는 한 번만 붙인다.**
     접힌 줄이라도 같은 요약(`보기가 어떻게 갈리나요`)이 한 화면에 두 번
     서면 그것이 문항 사이의 구분선처럼 읽힌다 */
  const firstLevelItem = sc.items.find((id) => itemOf(a0.core_code, id)?.response_scale === "L0~L3");

  const fieldOf = async (id: string, label?: string): Promise<Field | null> => {
    const it = itemOf(a0.core_code, id);
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
      /* **보기 넷은 화면에서 한 줄로 읽혀야 한다.**
         은행 문면은 `남이 한 것을 받아 썼다` 와 `내가 정하고 그 결과가
         쓰였다` 라서 둘째와 넷째가 끝까지 읽어야 갈린다. 화면에는 줄인
         말(`OWNERSHIP_LABEL`)을 세우고 그 아래 네 글자 안짝의 회색 한
         마디를 늘 붙인다. **은행과 채점은 한 글자도 안 바뀐다**: 판정에
         쓰는 것은 자리 번호뿐이다.

         긴 뜻풀이는 `보기가 어떻게 갈리나요` 로 내린다. 처음 만나는
         화면에서는 펼쳐 두고 그 뒤에는 접어 둔다: 네 줄을 보기마다 깔아
         두면 선별 등급에서만 스물여덟 화면에 똑같은 네 줄이 선다 */
      optionLabel: control.kind === "level" ? OWNERSHIP_LABEL : undefined,
      optionHelp: control.kind === "level" ? OWNERSHIP_HELP : undefined,
      /* 보기 넷의 뜻은 `ownership.ts` 하나에서 온다. 화면이 따로 적으면
         어느 날 채점과 다른 말을 한다 */
      /* **뜻풀이 뒤에 그 자리에서만 맞는 장면을 하나 붙인다**(규격 §6).
         뜻만 적으면 둘째와 셋째와 넷째가 끝까지 읽어도 갈리지 않는다.
         뜻은 `ownership.ts` 가 들고(측정 동결) 장면은 화면이 든다 */
      optionHelpFold: control.kind === "level" && id === firstLevelItem
        ? OWNERSHIP.map((o, n) => (OWNERSHIP_EXAMPLE[n]
          ? `${o.means}. 예: ${OWNERSHIP_EXAMPLE[n]}` : o.means)) : undefined,
      optionFoldOpen: control.kind === "level" && firstLevel && id === firstLevelItem,
    };
  };

  const fields: Field[] = [];
  for (const id of sc.items) {
    const it = itemOf(a0.core_code, id);
    /* 훑는 화면은 영역 이름이 줄이 된다. 문항 문면은 어미까지 붙어 길고,
       열두 줄을 그대로 세우면 같은 어미가 열두 번 되풀이된다.
       **한 화면에 문항이 둘 이상이면 문면이 줄이 된다.** 전에는 훑는
       화면에만 줄을 주어서, 보기 넷을 쓰는 문항 둘이 한 화면에 설 때
       **무엇에 답하는지가 화면에 한 글자도 없었다**: 큰 글씨는 둘이
       같이 쓰는 안내문(`해 보신 적이 있는 쪽을 골라주세요`)이고 각
       상자에는 보기 넷만 되풀이됐다. `pair` 화면이 검사의 절반이라
       응시자가 가장 오래 보는 자리가 그 상태였다 */
    const label = sc.kind === "sweep" ? (it?.grid_row ?? undefined)
      : sc.items.length > 1 ? wordingOf(a0.core_code, id, stage)
        : undefined;
    const f = await fieldOf(id, label ?? undefined);
    if (f) fields.push(f);
  }

  const dom = sc.domain;
  const groups: Group[] | undefined = sc.kind === "checklist" && dom
    ? checklistFor(a0.core_code, dom).map((g) => ({
        slot: g.slot,
        /* 묶음마다 `· 내가 정한 것` 을 되풀이하지 않는다. 그 말은 질문이
           이미 하고 있고, 열 번 되풀이되면 묶음 이름이 안 읽힌다 */
        label: g.slot === "ARTIFACT" || g.slot === "VERIFY" ? g.label : axisAsk(g.slot),
        items: g.items,
        picked: g.slot === "ARTIFACT" ? (v.picks.artifacts[dom] ?? [])
          : g.slot === "VERIFY" ? (v.picks.verifications[dom] ?? [])
            : (v.picks.checklists[`${dom}.${g.slot}`] ?? []),
      }))
    : undefined;

  /* 고르기 전에 읽는 한 줄. 팩의 `demands` 는 문항이 서는 장면이라 길고,
     역할에 영역 이름을 늘어놓으면 **우리 분류를 읽으라는 화면**이 된다 */
  const pickKind: PickKind | undefined = sc.kind === "pick-industry" ? "industry"
    : sc.kind === "pick-role" ? "role" : sc.kind === "pick-org" ? "org" : undefined;
  const packs = pickKind === "industry"
    ? industryChoices(a0.core_code).map((p) => ({
        code: p.code, name: p.name, gloss: INDUSTRY_HINT[p.code] ?? p.first,
      }))
    : pickKind === "role"
      ? roleChoices(a0.core_code).map((p) => ({
          code: p.code, name: p.name,
          gloss: ROLE_HINT[p.code] ?? p.domains.slice(0, 3).join(" · "),
        }))
      : pickKind === "org"
        ? orgChoices(a0.core_code).map((p) => ({
            code: p.code, name: p.name, gloss: ORG_HINT[p.code] ?? p.first,
          }))
        : undefined;
  const pickedMany = pickKind === "industry" ? (v.attempt.industry_interest ?? [])
    : pickKind === "role" ? (v.attempt.role_interest ?? [])
      : pickKind === "org" ? (v.attempt.org_interest ?? []) : undefined;

  const saved = await answersOf(v.attempt.id);
  const answered = Object.keys(saved).length;

  /**
   * 제출 전 검토(규격 §6).
   *
   * **답해야 하는 화면 가운데 아직 비어 있는 자리**를 끝 화면이 적는다.
   * 전에는 다 풀지 않고도 제출 단추가 그대로 섰고, 비어 있는 자리가 어디
   * 인지는 **아무 화면도 말하지 않았다.**
   *
   * **채점을 바꾸지 않는다**: 여기서 세는 것은 저장된 응답이 있는가뿐이고,
   * 비어 있어도 제출은 막지 않는다(묻지 않은 자리와 답하지 않은 자리를
   * 가르는 일은 채점이 이미 한다). 하는 일은 **어디로 돌아가면 되는지를
   * 적는 것**이다.
   */
  const gaps = sc.kind === "done"
    ? v.plan.screens
      .map((x, i) => ({ x, i }))
      .filter(({ x }) => x.required && x.items.length
        && x.items.some((id) => saved[id] === undefined))
      .map(({ x, i }) => ({
        index: i,
        label: [x.eyebrow, x.question ?? x.subject].filter(Boolean).join(" · ")
          || `${i + 1}번째 화면`,
      }))
      .slice(0, 12)
    : undefined;

  const model: ScreenModel = {
    attemptId: v.attempt.id,
    kind: sc.kind,
    auto: sc.auto,
    index: v.index,
    prevIndex: v.prevIndex,
    nextIndex: v.nextIndex,
    required: sc.required,
    eyebrow: sc.eyebrow,
    subject: sc.subject,
    question: sc.question,
    help: sc.help,
    strip: sc.strip,
    guide: fields.some((f) => f.control.kind === "level") ? optionGuidance(a0.core_code) : undefined,
    fields,
    groups,
    body: sc.body,
    chips: sc.chips,
    sections: sc.sections,
    domain: sc.domain,
    packs,
    pickKind,
    pickedMany,
    max: sc.max,
    picked: null,
    answered,
    done: v.attempt.status !== "in_progress",
    /* 끝낸 자리가 적는 것. 전부 **무엇을 물었고 무엇을 받았는가**이고
       판정은 한 줄도 들어가지 않는다 */
    summary: sc.kind === "done" ? {
      explored: content(a0.core_code).domains.domains.length,
      deep: (v.attempt.opened_deep.length ? v.attempt.opened_deep : v.attempt.opened_probe)
        .map((td) => domainName(a0.core_code, td)),
      evidence: Object.values(v.picks.checklists).flat().length
        + Object.values(v.picks.artifacts).flat().length
        + Object.values(v.picks.verifications).flat().length,
      industry: (v.attempt.industry_interest ?? [])
        .map((c) => industryChoices(a0.core_code).find((x) => x.code === c)?.name)
        .filter(Boolean).join(" · ") || null,
      role: (v.attempt.role_interest ?? [])
        .map((c) => roleChoices(a0.core_code).find((x) => x.code === c)?.name)
        .filter(Boolean).join(" · ") || null,
      /* **실제 판단을 몇 가지 받았는지.** 관심과 경험을 훑은 수와 섞지
         않는다: 그 둘이 섞인 수는 응시자에게 `설문 쉰 문항` 으로 읽힌다 */
      judged: judgedCount(v.plan.screens),
    } : undefined,
    /* 아직 비어 있는 자리. 끝 화면에서만 센다 */
    gaps,
    /* 기본 정보는 시작 화면에서 받았다. 이 화면은 **고치는 자리**다 */
    profile: sc.kind === "profile"
      ? { stage, field: v.attempt.grad_field, undergrad: v.attempt.undergrad_core }
      : undefined,
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

  /* **화면이 바뀌면 다시 세운다.** `?s=` 만 바뀌는 이동이라 React 가 같은
     자리의 같은 컴포넌트로 보고 상태를 그대로 들고 간다. 그러면 앞 화면의
     답이 남고, 넘어가는 동안 켜 둔 `moving` 이 꺼지지 않아 **`다음` 이 한 번
     눌린 뒤로 영원히 꺼진 채** 선다. 자리 목록으로 한 쪽씩 열어 보는
     캡처에서는 쪽마다 새로 뜨므로 드러나지 않았고, 사람이 눌러야 보였다 */
  /**
   * 머리띠에 설 **학교와 학과**(규격 §6).
   *
   * 전에는 머리띠가 `CareerMatri · 기본 정보 · 관심 산업 · PRO · 1 / 1`
   * 이었다. 학교에서 받은 검사를 풀고 있는 사람에게 **자기 학과가 화면
   * 어디에도 없었고**, 대신 사지도 않은 등급이 적혀 있었다.
   *
   * **값을 여기서 만들지 않는다.** 결과지 머리 한 줄이 읽는 자리를 그대로
   * 쓴다(`resultMeta`): 두 곳에서 따로 읽으면 어느 날 검사 화면과 결과지가
   * 다른 학과를 적는다(설계 원칙 10).
   */
  const meta = await resultMeta(v.attempt.id, v.attempt.core_code);

  return (
    <Screen key={`${model.attemptId}:${model.index}`} s={model} prog={prog}
      tier={v.attempt.tier}
      /* **학교 맥락에서는 등급을 적지 않는다.** 학과가 사는 것은 등급이
         아니라 한 벌이고, 적어 두면 고를 수 있는 값이 있는 줄로 읽힌다 */
      tierLabel={meta.school ? null : v.attempt.tier}
      school={meta.school} department={meta.department}
      major={majorNameOf(v.attempt.core_code) ?? "이 전공"}
      majorExamples={majorExamplesOf(v.attempt.core_code)} />
  );
}

/**
 * 실제 판단을 묻는 문항이 몇 개인가.
 *
 * **관심과 경험을 훑은 수와 섞지 않는다.** 섞으면 쉰 몇 개짜리 설문으로
 * 읽히고, 그것이 V1 에서 응시자가 읽기를 멈춘 자리였다.
 */
function judgedCount(screens: { kind: string; items: string[] }[]): number {
  return screens.filter((x) => x.kind === "single")
    .reduce((n, x) => n + x.items.length, 0);
}
