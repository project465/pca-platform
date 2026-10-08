/**
 * 화면 묶음. **한 화면에 한 가지를 묻는다.**
 *
 * 예외 둘만 둔다. 영역 격자는 한 영역의 관심과 경험과 학습 의향을 **함께
 * 읽어야** 뜻이 서고(셋을 따로 띄우면 같은 영역을 세 번 보는 줄 안다),
 * 역할·조직 선호 일곱은 서로 견주는 줄이라 한 자리에 세운다. 나머지는
 * 문항 하나가 화면 하나다: 보기 넷을 빠르게 넘기면 **오선택이 쌓인다.**
 *
 * 긴 폼으로 쌓지 않는 까닭은 중간 저장이 어려워지고, 한 화면에 열 문항이
 * 서면 응시자가 읽기를 멈추고 가운데 칸을 누르기 시작하기 때문이다.
 */
import type { Tier } from "../scoring/types";
import type { BankItem } from "../scoring/normalize";

/** 응시자가 지나는 큰 단계. 진행률의 윗칸이다 */
export const STAGES = [
  { code: "PROFILE", label: "기본 정보" },
  { code: "EXPLORE", label: "기본 탐색" },
  { code: "DOMAIN", label: "기술영역 확인" },
  { code: "DEEP", label: "경험 심화" },
  { code: "TRANSLATE", label: "경험 번역" },
  { code: "INDUSTRY", label: "산업 탐색" },
  { code: "ROLE", label: "역할 탐색" },
  { code: "DONE", label: "완료" },
] as const;
export type StageCode = typeof STAGES[number]["code"];

export type ScreenKind =
  | "profile" | "grid" | "single" | "multi" | "checklist"
  | "pick-industry" | "pick-role" | "transition" | "done";

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
  /** 이 화면에서 받는 문항. `grid` 는 셋, `single` 은 하나 */
  items: string[];
  /** 체크리스트 화면이 쓰는 영역 */
  domain?: string;
  /** 넘어가려면 답해야 하는가 */
  required: boolean;
};

export type Plan = {
  screens: Screen[];
  /** 큰 단계마다 화면 수 */
  perStage: Record<string, number>;
};

export type PlanInput = {
  tier: Tier;
  stage: "bachelor" | "master" | "phd" | "postdoc";
  branchBlock: string;
  probe: string[];
  deep: string[];
  industryPack: string | null;
  rolePack: string | null;
  /** 격자에서 묶인 영역 둘. 비어 있으면 강제 선택을 띄우지 않는다 */
  tiedPair: string[];
};

const AX_LABEL: Record<string, string> = {
  J1: "문제 정의", J2: "요구 해석", J3: "직접 판단", J4: "방법과 도구",
  J5: "산출물", J6: "비교와 검증", J7: "실패와 수정", J8: "조직 활용",
};

export function buildPlan(
  input: PlanInput, items: BankItem[], domainName: (td: string) => string,
  wording: (id: string, stage: string) => string,
  gridRow: (td: string) => string,
): Plan {
  const byId = new Map(items.map((i) => [i.item_id, i]));
  const screens: Screen[] = [];
  const add = (s: Screen) => screens.push(s);

  add({
    id: "profile", stage: "PROFILE", kind: "profile", required: true,
    eyebrow: "기본 정보",
    question: "현재 학업 단계를 골라주세요",
    help: "단계에 따라 질문 속 상황만 달라집니다. 평가 기준은 같습니다.",
    items: [],
  });

  /* 영역 격자: 한 화면에 한 영역 */
  const grids = items.filter((i) => i.module === "CORE-GRID");
  const domains = [...new Set(grids.map((i) => i.technical_domain as string))];
  domains.forEach((td, n) => {
    const three = grids.filter((i) => i.technical_domain === td).map((i) => i.item_id);
    add({
      id: `grid-${td}`, stage: "EXPLORE", kind: "grid", required: true,
      eyebrow: `기술영역 ${n + 1} / ${domains.length}`,
      subject: domainName(td),
      question: gridRow(td),
      help: "관심도와 경험, 학습 의향을 각각 골라주세요.",
      items: three, domain: td,
    });
  });

  /* 공통 판단 */
  for (const i of items.filter((x) => x.module === "CORE-JUDGE")) {
    add({
      id: `judge-${i.item_id}`, stage: "EXPLORE", kind: "single", required: true,
      eyebrow: "일하는 방식",
      question: wording(i.item_id, input.stage),
      items: [i.item_id],
    });
  }

  /* 강제 선택: 묶인 영역이 있을 때만 */
  if (input.tiedPair.length >= 2) {
    for (const i of items.filter((x) => x.module === "CORE-FORCE")) {
      add({
        id: `force-${i.item_id}`, stage: "EXPLORE", kind: "single", required: true,
        eyebrow: "한 가지만 더",
        question: wording(i.item_id, input.stage),
        help: "비슷하게 답하신 영역이 있어 한 가지만 더 묻습니다. 점수에는 반영되지 않습니다.",
        items: [i.item_id],
      });
    }
  }

  /* 학위·계열 분기 */
  for (const i of items.filter((x) => x.module === input.branchBlock)) {
    add({
      id: `branch-${i.item_id}`, stage: "EXPLORE", kind: "single", required: false,
      eyebrow: input.stage === "bachelor" ? "수업과 과제" : "연구와 과제",
      question: wording(i.item_id, input.stage),
      help: input.stage === "bachelor"
        ? "수업, 실험, 캡스톤, 인턴 경험을 모두 포함해 답해주세요."
        : "연구, 과제, 논문 작업을 모두 포함해 답해주세요.",
      items: [i.item_id],
    });
  }

  /* 선별 심화 */
  if (input.probe.length) {
    add({
      id: "t-probe", stage: "DOMAIN", kind: "transition", required: false,
      subject: "기본 탐색이 끝났습니다",
      /* **영역 이름을 머리글에 이어 붙이지 않는다.** 이름 셋을 가운뎃점으로
         묶어 조사를 붙이면 앞말에 따라 조사가 틀리고, 줄이 두 줄로 접힌다 */
      question: "해 보신 영역을 조금 더 살펴봅니다",
      help: `${input.probe.map(domainName).join(" · ")}`,
      items: [],
    });
  }
  for (const td of input.probe) {
    for (const i of items.filter((x) => x.module === "PROBE-J4" && x.technical_domain === td)) {
      add({
        /* 작게 영역 · 중간 축 · 크게 질문. 셋을 한 줄에 몰면 가장 작은
           글씨가 가장 많은 것을 말하게 된다 */
        id: `probe-${i.item_id}`, stage: "DOMAIN", kind: "single", required: false,
        eyebrow: domainName(td),
        subject: AX_LABEL[i.evidence_axis ?? ""] ?? "",
        question: wording(i.item_id, input.stage),
        items: [i.item_id], domain: td,
      });
    }
  }

  if (input.tier !== "BASIC") {
    add({
      id: "t-deep", stage: "DEEP", kind: "transition", required: false,
      subject: "기본 질문이 끝났습니다",
      question: "경험이 있는 영역을 자세히 살펴봅니다",
      help: `${input.deep.map(domainName).join(" · ")}`,
      items: [],
    });
    for (const td of input.deep) {
      for (const i of items.filter((x) => x.module === "DEEP-J8" && x.technical_domain === td)) {
        add({
          id: `deep-${i.item_id}`, stage: "DEEP", kind: "single", required: false,
          eyebrow: domainName(td),
          subject: AX_LABEL[i.evidence_axis ?? ""] ?? "",
          question: wording(i.item_id, input.stage),
          items: [i.item_id], domain: td,
        });
      }
      add({
        id: `check-${td}`, stage: "DEEP", kind: "checklist", required: false,
        eyebrow: "근거 고르기",
        subject: domainName(td),
        question: "직접 정했거나 결과물로 남긴 것을 모두 골라주세요",
        help: "해당하는 것이 없으면 비워두셔도 됩니다.",
        items: [], domain: td,
      });
    }

    /* 역할과 조직 선호: 서로 견주는 줄이라 한 자리에.
       **문항 번호의 앞머리로 고르지 않는다**: `PR_OC` 로 찾고 있었고
       은행의 문항은 `PO_OC1` 이라 조직 선호 일곱이 어느 화면에도 서지
       않았다. 측정축으로 고르면 번호 짓는 버릇과 따로 움직인다 */
    const rf = items.filter((x) => x.measurement_axis === "role_preference")
      .map((i) => i.item_id);
    const oc = items.filter((x) => x.measurement_axis === "org_preference")
      .map((i) => i.item_id);
    if (rf.length) {
      add({
        id: "pref-rf", stage: "DEEP", kind: "multi", required: false,
        eyebrow: "역할 선호", subject: "일곱 가지 역할",
        question: "각 역할을 얼마나 하고 싶은지 골라주세요",
        items: rf,
      });
    }
    if (oc.length) {
      add({
        id: "pref-oc", stage: "DEEP", kind: "multi", required: false,
        eyebrow: "조직 선호", subject: "일곱 가지 조직",
        question: "각 조직에서 일하고 싶은 정도를 골라주세요",
        items: oc,
      });
    }
    for (const i of items.filter((x) => x.module === "CONSIST")) {
      add({
        id: `consist-${i.item_id}`, stage: "DEEP", kind: "single", required: false,
        eyebrow: "경험 확인",
        question: wording(i.item_id, input.stage),
        items: [i.item_id],
      });
    }
  }

  if (input.tier === "PRO") {
    add({
      id: "t-trans", stage: "TRANSLATE", kind: "transition", required: false,
      subject: "경험 번역을 시작합니다",
      question: "연구나 프로젝트 하나를 떠올려주세요",
      help: "열 단계로 나누어 묻습니다. 직접 적는 칸은 건너뛰어도 됩니다.",
      items: [],
    });
    for (const i of items.filter((x) => x.module === "TRANS-10")) {
      add({
        id: `trans-${i.item_id}`, stage: "TRANSLATE", kind: "single", required: false,
        eyebrow: "경험 번역",
        question: wording(i.item_id, input.stage),
        items: [i.item_id],
      });
    }
    const tg = items.filter((x) => x.module === "TARGET").map((i) => i.item_id);
    if (tg.length) {
      add({
        id: "target", stage: "TRANSLATE", kind: "multi", required: false,
        eyebrow: "목표", subject: "희망하는 진로",
        question: "목표로 두고 있는 것을 골라주세요",
        items: tg,
      });
    }

    add({
      id: "pick-industry", stage: "INDUSTRY", kind: "pick-industry", required: false,
      eyebrow: "산업 탐색",
      question: "어느 산업을 먼저 살펴볼까요?",
      help: "고른 산업은 조금 더 자세히 묻습니다.",
      items: [],
    });
    if (input.industryPack) {
      for (const i of items.filter((x) => x.industry_pack === input.industryPack)) {
        add({
          id: `ind-${i.item_id}`, stage: "INDUSTRY", kind: "single", required: false,
          eyebrow: "산업 경험",
          question: wording(i.item_id, input.stage),
          items: [i.item_id],
        });
      }
    }
    add({
      id: "pick-role", stage: "ROLE", kind: "pick-role", required: false,
      eyebrow: "역할 탐색",
      question: "어떤 역할을 먼저 살펴볼까요?",
      help: "고른 역할은 조금 더 자세히 묻습니다.",
      items: [],
    });
    if (input.rolePack) {
      for (const i of items.filter((x) =>
        x.module === "ROLE" && x.item_id.startsWith(input.rolePack as string))) {
        add({
          id: `role-${i.item_id}`, stage: "ROLE", kind: "single", required: false,
          eyebrow: "역할 경험",
          question: wording(i.item_id, input.stage),
          items: [i.item_id],
        });
      }
    }
  }

  add({
    id: "done", stage: "DONE", kind: "done", required: false,
    subject: "응답이 모두 끝났습니다", question: "결과를 만들 준비가 됐습니다",
    items: [],
  });

  const perStage: Record<string, number> = {};
  for (const s of screens) perStage[s.stage] = (perStage[s.stage] ?? 0) + 1;
  void byId;
  return { screens, perStage };
}
