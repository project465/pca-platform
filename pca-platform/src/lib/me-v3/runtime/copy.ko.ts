/**
 * 검사 화면의 한국어. **글자를 옮기기만 했고 한 글자도 바꾸지 않았다.**
 *
 * 전에는 이 글이 `blocks.ts` · `routing.ts` · `session.ts` · `menus.ts` ·
 * `examples.ts` 에 흩어져 있었다. 영어판을 들이면서 언어마다 한 벌씩
 * 모았다(`copy.en.ts` 가 같은 모양이다). 고르는 자리는 `copy.ts` 하나다.
 *
 * 왜 그 문장인지는 옮기기 전 자리의 주석이 그대로 든다(그 파일들에 남겨
 * 두었다). 여기는 글자만 있다: `v3:copy` 와 `v3:freeze` 가 이 글이 전과
 * 같은지 센다.
 */
import type { RuntimeCopy } from "./copy";
import { OWNERSHIP } from "../scoring/ownership";

/** 고른 영역 수를 글로 적는다. `3가지` 보다 `세 가지` 가 읽힌다 */
const KO_COUNT = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

export const COPY_KO: RuntimeCopy = {
  stages: {
    PROFILE: "기본 정보",
    FIELD: "관심 산업",
    EXPLORE: "영역 훑기",
    JUDGE: "실제 판단",
    DEEP: "경험 심화",
    EVIDENCE: "근거 고르기",
    PACK: "산업과 직무",
    TRANSLATE: "경험 번역",
    DONE: "완료",
  },
  stageLead: {
    PROFILE: "먼저 지금 학업 단계부터 확인할게요.",
    FIELD: "관심 있는 산업을 고르면, 그 산업에서 전공자가 하는 일을 보여 드립니다.",
    EXPLORE: "어떤 일을 해 보고 싶은지, 해 본 적은 있는지 가볍게 훑어보겠습니다.",
    JUDGE: "이제 실제로 해 본 일을 여쭙겠습니다.",
    DEEP: "해 보신 일을 조금 더 자세히 여쭙겠습니다.",
    EVIDENCE: "해 봤다고 답한 일을 영역마다 짚어 보겠습니다.",
    PACK: "고르신 직무와 산업에서 자주 하는 일을 여쭙겠습니다.",
    TRANSLATE: "경험 하나를 골라 지원서에 쓸 수 있게 정리해 봅니다.",
    DONE: "",
  },
  transGroups: {
    frame: { subject: "무엇을 풀었나",
      question: "그 경험에서 풀려던 문제와 상황을 골라 주세요" },
    method: { subject: "어떻게 했나",
      question: "쓴 방법과 직접 정한 것을 골라주세요" },
    result: { subject: "무엇이 남았나",
      question: "남은 결과물과 결과를 확인한 방법을 골라 주세요" },
    handoff: { subject: "어디에 썼나",
      question: "그 결과를 어디에 썼는지 골라 주세요" },
  },
  coreDefault: {
    pairAsk: {
      J1: "풀 문제와 범위 정하기",
      J2: "요구를 조건으로 바꾸기",
      J3: "직접 정해 본 것",
      J4: "쓴 방법과 도구",
      J5: "남긴 결과물",
      J6: "비교하고 확인한 것",
      J7: "잘 안 됐을 때",
      J8: "결과가 쓰인 곳",
    },
    deepPair: {
      "J1+J2": "풀 문제와 요구 정하기",
      "J4+J8": "쓴 방법과 결과가 쓰인 곳",
    },
    exposureHelp: "수업, 실습, 동아리, 아르바이트에서 해 본 것도 넣어 주세요.",
  },
  coreCopy: {
    BIZ_CORE_V1: {
      pairAsk: { J1: "범위 정하기", J2: "목표를 숫자로 바꾸기", J4: "쓴 방법" },
      deepPair: { "J1+J2": "범위와 목표 정하기" },
      exposureHelp: "수업, 동아리, 공모전, 아르바이트에서 해 본 것도 넣어 주세요.",
    },
  },
  count: (n) => KO_COUNT[n] ?? String(n),
  plan: {
    profile: {
      eyebrow: "기본 정보",
      question: "현재 학업 단계를 골라주세요",
      help: "단계에 따라 질문 속 상황만 바뀌고, 결과를 보는 기준은 같습니다.",
    },
    pickIndustry: {
      eyebrow: "관심 산업",
      question: "관심 있는 산업을 골라주세요",
      help: "두 개까지 고를 수 있습니다. 아직 모르겠으면 넘어가셔도 됩니다.",
    },
    scene: {
      eyebrow: "관심 산업",
      questionTwo: (major) => `고른 두 산업에서 ${major} 전공자가 다루는 일`,
      questionOne: (industry, major) => `${industry}에서 ${major} 전공자가 다루는 일`,
      help: "다음 질문에 답하실 때 참고해 주세요.",
    },
    sweepInterest: {
      eyebrow: "관심",
      question: "각 일을 얼마나 해 보고 싶은지 골라 주세요",
      help: "무슨 일인지 잘 모르겠으면 ‘모르겠다’를 누르세요.",
    },
    sweepExposure: {
      eyebrow: "해 본 횟수",
      question: "각 일을 몇 번이나 해 봤는지 골라 주세요",
    },
    sweepLearning: {
      eyebrow: "배우고 싶은 정도",
      question: "지금 시간을 내서 배워 보고 싶은 정도를 골라 주세요",
      help: "앞의 답을 보고 몇 가지만 다시 여쭙니다.",
    },
    sweepPage: (eyebrow, k, n) => `${eyebrow} ${k} / ${n}`,
    force: {
      CF_PAIR_1: {
        eyebrow: "먼저 해 볼 쪽",
        help: "두 일에 비슷하게 답하셨습니다. 하나만 먼저 해 볼 수 있다면 어느 쪽일까요?",
      },
      CF_PAIR_2: {
        eyebrow: "더 알아보고 싶은 쪽",
        help: "이번에는 해 보는 것과 상관없이, 더 알아보고 싶은 쪽을 골라 주세요.",
      },
    },
    forceFallback: {
      eyebrow: "한 가지만 더",
      help: "두 일에 비슷하게 답하셔서 하나만 더 여쭙겠습니다.",
    },
    judge: {
      eyebrow: "공통 질문",
      pair: (grad) => (grad ? "과제와 연구에서 해 본 일" : "과제와 팀 활동에서 해 본 일"),
    },
    xfield: {
      eyebrow: "대학원 경험",
      question: "대학원에서 한 일을 몇 가지 더 여쭙겠습니다",
      help: (major) => `대학원 전공이 달라도 ${major} 쪽 경험과 이어 볼 수 있도록 여쭙는 질문입니다.`,
      chips: (major) => ["다룬 분야", "가져다 쓸 수 있는 방법", `마지막으로 ${major} 일을 한 때`,
        "학부 때 가장 깊이 해 본 활동"],
      itemHelp: "고르신 내용은 경험을 지원서 표현으로 정리할 때 씁니다.",
    },
    judgeStrip: (count, names, many) =>
      `답하신 내용을 보고 ${count} 가지 일을 골랐습니다: `
      + `${names.join(", ")}. `
      + `${many ? "이 일들을" : "이 일을"} 실제로 해 봤는지 하나씩 여쭙겠습니다.`,
    pairFallback: "해 본 일",
    checklist: {
      eyebrow: "실제로 한 일",
      question: (d) => `${d}에서 실제로 한 것을 모두 골라 주세요`,
      help: "앞에서 ‘해 봤다’고 답한 것만 모았습니다. 해당하는 게 없으면 비워 두셔도 됩니다.",
    },
    consist: {
      eyebrow: "조금만 더",
      j3Postdoc: "맡은 과제와 다른 기관 일에서 각각 기준을 정해 본 적이 있나요?",
      j3: "학교 안과 밖에서 각각 기준을 정해 본 적이 있나요?",
      j5: "만든 결과물에 대해 두 가지만 더 여쭙겠습니다",
      other: "같은 일을 두 상황으로 나눠 여쭙겠습니다",
    },
    pickRole: {
      eyebrow: "관심 직무",
      question: "어떤 일을 더 자세히 보고 싶나요?",
      help: "두 개까지 고를 수 있습니다. 여기서 고른다고 앞의 답이 바뀌지는 않습니다.",
    },
    pickOrg: {
      eyebrow: "일하고 싶은 곳",
      question: "어떤 조직에서 일하는 모습이 더 그려지나요?",
      help: "두 개까지 고를 수 있습니다. 결과를 보여 드리는 순서에만 씁니다.",
    },
    industry: {
      strip: (name) => `이제 ${name ?? "고르신 산업"}에서 자주 하는 일을 여쭙겠습니다.`
        + ` 낯선 말은 질문 아래에 쉽게 풀어 두었습니다.`,
      eyebrowFallback: "산업 판단",
    },
    trans: {
      eyebrow: "경험 번역",
      question: (grad) => (grad
        ? "연구나 프로젝트 하나를 떠올려 주세요"
        : "과제나 프로젝트, 활동 하나를 떠올려 주세요"),
      help: "그 경험 하나를 네 번에 나눠 여쭙겠습니다. 모두 같은 경험으로 답해 주세요.",
      chips: ["풀려던 문제", "쓴 방법", "남은 결과물", "쓰인 곳"],
    },
    target: {
      eyebrow: "목표",
      question: "지금 생각하는 진로를 골라 주세요",
      help: "결과에서 지금 가진 경험과 나란히 보여 드립니다.",
    },
    done: { eyebrow: "응답 완료", question: "이제 결과를 만들 수 있습니다" },
  },
  branch: {
    "ug-core": {
      eyebrow: "수업과 과제",
      ask: "수업과 과제에서 해 본 일",
      help: "수업, 실습, 팀 과제, 동아리, 인턴에서 한 일을 모두 떠올려 주세요.",
    },
    "ms-core": {
      eyebrow: "연구와 과제",
      ask: "연구와 과제에서 직접 정한 것",
      help: "직접 정한 것과 받아서 한 것을 구분해 답해 주세요.",
    },
    "phd-core": {
      eyebrow: "문제를 정하는 단계",
      ask: "연구 문제와 가정 세우기",
      help: "가정과 변수와 한계를 누가 정했는지 답해주세요.",
    },
    "postdoc-core": {
      eyebrow: "맡아서 끌고 간 범위",
      ask: "맡아서 이끈 범위",
      help: "혼자 한 범위와 나눠 맡긴 범위를 나눠 답해주세요.",
    },
  },
  branchByCore: {
    ME_CORE_V3: {
      "ug-core": { help: "수업, 실험, 캡스톤, 동아리, 인턴에서 한 일을 모두 떠올려 주세요." },
    },
    BIZ_CORE_V1: {
      "ug-core": { help: "수업, 팀 과제, 공모전, 동아리, 인턴에서 한 일을 모두 떠올려 주세요." },
    },
  },
  axisLabel: {
    J1: "문제 정의", J2: "요구 해석", J3: "직접 판단", J4: "방법과 도구",
    J5: "산출물", J6: "비교와 검증", J7: "실패와 수정", J8: "조직 활용",
  },
  axisAsk: {
    J1: "범위를 정할 때",
    J2: "요구를 구체적인 조건으로 바꿀 때",
    J3: "직접 정한 것",
    J4: "쓴 방법과 도구",
    J5: "남긴 결과물",
    J6: "비교하고 확인한 것",
    J7: "잘 안 됐을 때",
    J8: "결과가 쓰인 곳",
  },
  axisAskByCore: {
    BIZ_CORE_V1: { J2: "목표를 숫자로 바꿀 때", J4: "쓴 방법" },
  },
  slotLabel: { ARTIFACT: "만든 자료", VERIFY: "비교해 본 기준" },
  menus: {
    scale5: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    exposure: ["없음", "1~2회", "3회 이상"],
    unknown: "모르겠다",
    fullScale5: {
      interest: {
        1: "전혀 관심 없음", 2: "관심 적음", 3: "보통",
        4: "관심 있음", 5: "매우 관심 있음",
      },
      learning_intent: {
        1: "전혀 배우고 싶지 않음", 2: "별로 배우고 싶지 않음", 3: "보통",
        4: "배우고 싶음", 5: "매우 배우고 싶음",
      },
    },
    orgTypes: [
      "완성품을 만드는 회사",
      "부품·장비·소재 회사",
      "엔지니어링 용역",
      "국가 과제 수행 기관",
      "대학 연구실",
      "공공·인증 기관",
      "소규모 조직",
    ],
  },
  sceneHint: (list) => `${list.join(", ")} 등 어디에서 해 본 일이든 괜찮습니다.`,
  ownershipMeans: OWNERSHIP.map((o) => o.means),
  ownershipWithExample: (means, example) => `${means}. 예: ${example}`,
};
