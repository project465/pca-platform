/**
 * 화면 묶음. **한 화면에 한 가지를 묻는다.**
 *
 * 예외는 영역을 훑는 자리뿐이다. 열두 영역의 관심과 경험은 **서로 견주어야**
 * 뜻이 서고, 한 영역씩 따로 띄우면 같은 질문을 열두 번 보는 줄 안다. 나머지는
 * 문항 하나가 화면 하나다: 보기 넷을 빠르게 넘기면 **오선택이 쌓인다.**
 *
 * **V1 의 흐름을 버린 까닭.** 처음에는 영역마다 관심과 경험과 학습 의향을 한
 * 화면에 묶어 열두 화면을 세웠다. 응시자가 보는 것은 `기술영역 → 관심도 /
 * 해본 적 / 배우고 싶은 정도` 의 열두 번 반복이었고, 실제 판단을 묻는 문항은
 * 서른두 화면 가운데 여덟 자리뿐이었다. 산업은 맨 뒤에 붙은 부가 묶음이었다.
 * 그래서 흐름을 이렇게 바꿨다.
 *
 *   기본 정보 → 관심 산업 고르기 → 그 산업의 장면 → 영역 두 화면으로 훑기
 *   → 공통 판단 → 학위 장면 → 실제 업무 판단 → 심화 → 근거 고르기
 *   → 관심 역할 고르기 → 역할 판단 → 산업 판단 → 경험 번역 → 완료
 *
 * 산업이 처음과 끝에 두 번 서고, 반복되는 훑기가 두 화면으로 접히고, 실제
 * 판단 문항이 선별 등급 응답의 절반을 넘는다.
 */
import type { Tier } from "../scoring/types";
import type { BankItem } from "../scoring/normalize";
import { DEEP_BLOCK, PROBE_BLOCK } from "../scoring/normalize";

/** 응시자가 지나는 큰 단계. 진행률의 윗칸이다 */
export const STAGES = [
  { code: "PROFILE", label: "기본 정보" },
  { code: "FIELD", label: "관심 산업" },
  { code: "EXPLORE", label: "영역 훑기" },
  { code: "JUDGE", label: "실제 판단" },
  { code: "DEEP", label: "경험 심화" },
  { code: "EVIDENCE", label: "근거 고르기" },
  { code: "PACK", label: "산업과 직무" },
  { code: "TRANSLATE", label: "경험 번역" },
  { code: "DONE", label: "완료" },
] as const;
export type StageCode = typeof STAGES[number]["code"];

export type ScreenKind =
  | "profile" | "sweep" | "single" | "checklist" | "scene"
  | "pick-industry" | "pick-role" | "pick-org" | "transition" | "done";

export type Screen = {
  id: string;
  stage: StageCode;
  kind: ScreenKind;
  /** 작게 올리는 머리말. 무엇을 묻는 자리인지 */
  eyebrow?: string;
  /** 가운데 크기. 지금 보는 대상 */
  subject?: string;
  /** 크게. 질문 */
  question?: string;
  /** 필요할 때만 한 줄 */
  help?: string;
  /** 산업 장면처럼 읽기만 하는 자리의 본문 */
  body?: string[];
  /** 이 화면에서 받는 문항. `sweep` 은 열둘, `single` 은 하나 */
  items: string[];
  /** 체크리스트 화면이 쓰는 영역 */
  domain?: string;
  /** 산업이나 역할 팩 코드. 장면과 팩 문항이 쓴다 */
  pack?: string;
  /** 고르기 화면에서 최대 몇 개까지 */
  max?: number;
  /** 넘어가려면 답해야 하는가 */
  required: boolean;
  /**
   * 한 번 누르면 다음으로 넘어가는가.
   *
   * **한 선택으로 화면이 끝나는 자리만 참이다.** 격자와 복수 선택과 근거
   * 고르기와 직접 적는 칸은 손으로 넘긴다: 고르는 중에 화면이 넘어가면
   * 나머지를 고를 수 없다.
   */
  auto: boolean;
};

export type Plan = {
  screens: Screen[];
  /** 큰 단계마다 화면 수 */
  perStage: Record<string, number>;
};

export type PlanInput = {
  tier: Tier;
  stage: "bachelor" | "master" | "phd" | "postdoc";
  branchBlock: "ug-core" | "grad-stem";
  /** 대학원이 타계열이면 번역 맥락 묶음을 더 받는다 */
  crossField: boolean;
  probe: string[];
  deep: string[];
  /** 고른 관심 산업. 첫째가 깊게 묻는 산업이다 */
  industryInterest: string[];
  roleInterest: string[];
  /** 격자에서 묶인 영역 둘. 비어 있으면 강제 선택을 띄우지 않는다 */
  tiedPair: string[];
};

const AX_LABEL: Record<string, string> = {
  J1: "문제 정의", J2: "요구 해석", J3: "직접 판단", J4: "방법과 도구",
  J5: "산출물", J6: "비교와 검증", J7: "실패와 수정", J8: "조직 활용",
};

export type IndustryScene = {
  code: string; name: string; scene: string; demands: string[];
};

export type Deps = {
  items: BankItem[];
  domainName: (td: string) => string;
  /** 학위 장면이 붙은 문면 */
  wording: (id: string, stage: string) => string;
  /** 영역 훑기의 한 줄 */
  gridRow: (td: string) => string;
  /** 산업 장면 */
  scene: (code: string) => IndustryScene | null;
  /** 산업팩 문항의 쉬운 말 풀이 */
  gloss: (itemId: string) => string | null;
  roleName: (code: string) => string;
};

export function buildPlan(input: PlanInput, d: Deps): Plan {
  const { items, domainName, wording, gridRow } = d;
  const screens: Screen[] = [];
  const add = (s: Screen) => screens.push(s);
  const byModule = (m: string) => items.filter((i) => i.module === m);

  add({
    id: "profile", stage: "PROFILE", kind: "profile", required: true, auto: false,
    eyebrow: "기본 정보",
    question: "현재 학업 단계를 골라주세요",
    help: "단계에 따라 질문 속 상황만 달라집니다. 평가 기준은 같습니다.",
    items: [],
  });

  /* ── 관심 산업. **프로필 바로 뒤다.** 산업이 검사 뒤에 붙은 부가 묶음이
        아니라 검사를 읽는 틀이라는 것을 응시자가 첫 화면에서 알아야 한다 ── */
  add({
    id: "pick-industry", stage: "FIELD", kind: "pick-industry",
    required: false, auto: false, max: 2,
    eyebrow: "관심 산업",
    question: "관심 있는 산업을 골라주세요",
    help: "최대 두 개까지 고를 수 있습니다. 아직 모르겠으면 넘어가도 됩니다.",
    items: [],
  });
  for (const code of input.industryInterest) {
    const sc = d.scene(code);
    if (!sc) continue;
    add({
      id: `scene-${code}`, stage: "FIELD", kind: "scene",
      required: false, auto: false, pack: code,
      eyebrow: "산업 장면",
      subject: sc.name,
      question: sc.scene,
      body: sc.demands,
      items: [],
    });
  }

  /* ── 영역 훑기 두 화면. 열두 줄을 한 화면에서 본다 ── */
  const grid = byModule("CORE-GRID");
  const pick = (c: string) => grid.filter((i) => i.measurement_axis === c);
  add({
    id: "sweep-interest", stage: "EXPLORE", kind: "sweep", required: true, auto: false,
    eyebrow: "영역 훑기 1 / 2",
    question: "해 보고 싶은 일을 골라주세요",
    help: "열두 줄을 한 번에 봅니다. 잘 모르는 줄은 가운데를 고르면 됩니다.",
    items: pick("interest").map((i) => i.item_id),
  });
  add({
    id: "sweep-exposure", stage: "EXPLORE", kind: "sweep", required: true, auto: false,
    eyebrow: "영역 훑기 2 / 2",
    question: "해 본 적이 있는 일을 골라주세요",
    help: "수업과 실험과 캡스톤과 인턴과 연구를 모두 포함해 답해주세요.",
    items: pick("exposure").map((i) => i.item_id),
  });

  /* 묶인 영역 가르기. 묶이지 않았으면 띄우지 않는다 */
  if (input.tiedPair.length >= 2) {
    for (const i of byModule("CORE-FORCE")) {
      add({
        id: `force-${i.item_id}`, stage: "EXPLORE", kind: "single",
        required: true, auto: true,
        eyebrow: "한 가지만 더",
        question: wording(i.item_id, input.stage),
        help: "비슷하게 답하신 영역이 있어 한 가지만 더 묻습니다. 점수에는 반영되지 않습니다.",
        items: [i.item_id],
      });
    }
  }

  /* 학습 의향은 **선별된 영역에만** 묻는다 */
  const lea = pick("learning_intent")
    .filter((i) => input.probe.includes(String(i.technical_domain)));
  if (lea.length) {
    add({
      id: "sweep-learning", stage: "EXPLORE", kind: "sweep", required: false, auto: false,
      eyebrow: "배우고 싶은 정도",
      question: "지금 시간을 들여 배우고 싶은 일을 골라주세요",
      help: "자세히 보기로 한 영역만 묻습니다.",
      items: lea.map((i) => i.item_id),
    });
  }

  /* ── 공통 판단과 학위 장면 ── */
  for (const i of byModule("CORE-JUDGE")) {
    add({
      id: `judge-${i.item_id}`, stage: "JUDGE", kind: "single", required: true, auto: true,
      eyebrow: "일하는 방식",
      question: wording(i.item_id, input.stage),
      items: [i.item_id],
    });
  }
  for (const i of items.filter((x) => x.education_routing === input.branchBlock)) {
    add({
      id: `branch-${i.item_id}`, stage: "JUDGE", kind: "single", required: false, auto: true,
      eyebrow: input.branchBlock === "ug-core" ? "수업과 과제" : "연구와 과제",
      question: wording(i.item_id, input.stage),
      help: input.branchBlock === "ug-core"
        ? "수업, 실험, 캡스톤, 인턴 경험을 모두 포함해 답해주세요."
        : "연구, 과제, 논문 작업을 모두 포함해 답해주세요.",
      items: [i.item_id],
    });
  }
  if (input.crossField) {
    for (const i of items.filter((x) => x.education_routing === "xfield")) {
      add({
        id: `xfield-${i.item_id}`, stage: "JUDGE", kind: "single",
        required: false, auto: true,
        eyebrow: "대학원 경험",
        question: wording(i.item_id, input.stage),
        help: "이 답은 기술영역 결과에 반영되지 않습니다. 경험을 옮겨 적을 때만 씁니다.",
        items: [i.item_id],
      });
    }
  }

  /* ── 실제 업무 판단. 선별된 영역마다 네 축을 둘씩 ── */
  if (input.probe.length) {
    add({
      id: "t-judge", stage: "JUDGE", kind: "transition", required: false, auto: false,
      subject: "영역 훑기가 끝났습니다",
      question: "해 보신 영역을 실제 업무 장면으로 묻습니다",
      help: `${input.probe.map(domainName).join(" · ")}`,
      items: [],
    });
  }
  for (const td of input.probe) {
    const list = items.filter((x) => x.module === PROBE_BLOCK && x.technical_domain === td);
    for (const i of list) {
      add({
        id: `probe-${i.item_id}`, stage: "JUDGE", kind: "single",
        required: false, auto: true,
        eyebrow: domainName(td),
        subject: AX_LABEL[i.evidence_axis ?? ""] ?? "",
        question: wording(i.item_id, input.stage),
        items: [i.item_id], domain: td,
      });
    }
  }

  /* ── 심화 네 축 ── */
  if (input.tier !== "BASIC" && input.deep.length) {
    add({
      id: "t-deep", stage: "DEEP", kind: "transition", required: false, auto: false,
      subject: "실제 판단을 받았습니다",
      question: "같은 영역을 남은 네 축으로 더 묻습니다",
      help: `${input.deep.map(domainName).join(" · ")}`,
      items: [],
    });
    for (const td of input.deep) {
      for (const i of items.filter((x) => x.module === DEEP_BLOCK && x.technical_domain === td)) {
        add({
          id: `deep-${i.item_id}`, stage: "DEEP", kind: "single",
          required: false, auto: true,
          eyebrow: domainName(td),
          subject: AX_LABEL[i.evidence_axis ?? ""] ?? "",
          question: wording(i.item_id, input.stage),
          items: [i.item_id], domain: td,
        });
      }
    }
  }

  /* ── 근거 고르기. **문항을 다 받은 뒤에 묻는다**: 묻지도 않은 축의 근거를
        먼저 고르게 하면 응시자가 무엇을 고르는지 알 수 없다 ── */
  for (const td of input.probe) {
    add({
      id: `ev-${td}`, stage: "EVIDENCE", kind: "checklist", required: false, auto: false,
      eyebrow: "근거 고르기",
      subject: domainName(td),
      question: "직접 정했거나 결과물로 남긴 것을 모두 골라주세요",
      help: "해당하는 것이 없으면 비워두셔도 됩니다.",
      items: [], domain: td,
    });
  }
  if (input.tier !== "BASIC") {
    for (const i of byModule("CONSIST")) {
      add({
        id: `consist-${i.item_id}`, stage: "EVIDENCE", kind: "single",
        required: false, auto: true,
        eyebrow: "경험 확인",
        question: wording(i.item_id, input.stage),
        items: [i.item_id],
      });
    }
  }

  /* ── 관심 역할과 선호 조직. **Core 심화 뒤다**: 앞에 두면 고른 역할이
        기술영역 판정을 끌고 간다고 읽힌다 ── */
  add({
    id: "pick-role", stage: "PACK", kind: "pick-role", required: false, auto: false, max: 2,
    eyebrow: "관심 직무",
    question: "어떤 일을 더 자세히 보고 싶나요?",
    help: "최대 두 개까지 고를 수 있습니다. 앞의 결과는 그대로 둡니다.",
    items: [],
  });
  add({
    id: "pick-org", stage: "PACK", kind: "pick-org", required: false, auto: false, max: 2,
    eyebrow: "일하고 싶은 곳",
    question: "어떤 조직에서 일하는 모습이 더 그려지나요?",
    help: "최대 두 개까지 고를 수 있습니다. 점수에는 쓰이지 않고 결과를 읽는 순서만 정합니다.",
    items: [],
  });
  if (input.tier !== "BASIC") {
    for (const code of input.roleInterest) {
      const list = items.filter((x) =>
        x.module === "ROLE" && x.item_id.startsWith(`${code}_`));
      if (!list.length) continue;
      for (const i of list) {
        add({
          id: `role-${i.item_id}`, stage: "PACK", kind: "single",
          required: false, auto: true, pack: code,
          eyebrow: d.roleName(code),
          subject: AX_LABEL[i.evidence_axis ?? ""] ?? "",
          question: wording(i.item_id, input.stage),
          items: [i.item_id],
        });
      }
    }
  }

  /* ── 산업 판단. PRO 에서 고른 산업 하나를 깊게 ── */
  const deepIndustry = input.tier === "PRO" ? input.industryInterest[0] : undefined;
  if (deepIndustry) {
    const list = items.filter((x) =>
      x.module === "INDUSTRY" && x.item_id.startsWith(`${deepIndustry}_`));
    const sc = d.scene(deepIndustry);
    if (list.length) {
      add({
        id: "t-industry", stage: "PACK", kind: "transition", required: false, auto: false,
        subject: `${sc?.name ?? ""} 쪽을 더 봅니다`,
        question: "그 산업에서 실제로 달라지는 판단을 묻습니다",
        help: "산업 용어를 모르셔도 됩니다. 질문마다 쉬운 말로 다시 적어 둡니다.",
        items: [],
      });
    }
    for (const i of list) {
      add({
        id: `ind-${i.item_id}`, stage: "PACK", kind: "single",
        required: false, auto: true, pack: deepIndustry,
        eyebrow: sc?.name ?? "산업 판단",
        subject: AX_LABEL[i.evidence_axis ?? ""] ?? "",
        question: wording(i.item_id, input.stage),
        help: d.gloss(i.item_id) ?? undefined,
        items: [i.item_id],
      });
    }
  }

  /* ── 경험 번역 ── */
  if (input.tier === "PRO") {
    add({
      id: "t-trans", stage: "TRANSLATE", kind: "transition", required: false, auto: false,
      subject: "경험 번역을 시작합니다",
      question: "연구나 프로젝트 하나를 떠올려주세요",
      help: "열 단계로 나누어 묻습니다. 직접 적는 칸은 건너뛰어도 됩니다.",
      items: [],
    });
    for (const i of byModule("TRANS-10")) {
      add({
        id: `trans-${i.item_id}`, stage: "TRANSLATE", kind: "single",
        required: false, auto: false,
        eyebrow: "경험 번역",
        question: wording(i.item_id, input.stage),
        items: [i.item_id],
      });
    }
    for (const i of byModule("TARGET")) {
      add({
        id: `target-${i.item_id}`, stage: "TRANSLATE", kind: "single",
        required: false, auto: true,
        eyebrow: "목표",
        question: wording(i.item_id, input.stage),
        items: [i.item_id],
      });
    }
  }

  add({
    id: "done", stage: "DONE", kind: "done", required: false, auto: false,
    subject: "응답이 모두 끝났습니다", question: "결과를 만들 준비가 됐습니다",
    items: [],
  });

  const perStage: Record<string, number> = {};
  for (const s of screens) perStage[s.stage] = (perStage[s.stage] ?? 0) + 1;
  return { screens, perStage };
}
