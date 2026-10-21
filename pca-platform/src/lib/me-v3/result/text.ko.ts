/**
 * 결과 모델을 한국어로 옮긴다. **모델은 이 파일을 읽지 않는다.**
 *
 * 문장은 셋을 지킨다.
 *
 *   1. **관찰한 것만 적는다.** `분석적 사고력이 뛰어납니다` 가 아니라
 *      `하중 조건을 직접 정한 경험이 확인됩니다` 다. 재지 않은 것을
 *      단정하면 그 줄은 아무것도 재지 않은 줄이 된다.
 *   2. **비어 있는 자리를 `부족합니다` 로 끝내지 않는다.** 무엇이 비었고 ·
 *      왜 그 자리가 중요하고 · 다음에 무엇을 하면 되는지가 한 묶음이다.
 *   3. **막연한 할 일을 쓰지 않는다.** `경험을 쌓으세요` 대신 그 영역의
 *      자료에서 가져온 재료로 문장을 만든다.
 */
import type { Axis, AxisState, Stage, Zone } from "../scoring/types";
import { plainKo, sayKo, thingKo } from "./say";
import { chainFor } from "./chains";
import { andList, josaOf, orList, withJosa } from "./josa";
import { REASON_KO } from "../scoring/text.ko";
import { COMMON_ME, commonItemKo } from "../student/common";
import type {
  Action, ActionCode, CommonView, FirstMove, Gap, GapWhy, HeadlineCode, PackView,
  ResultModel,
} from "./model";

export const AXIS_KO: Record<Axis, string> = {
  J1: "문제 정의", J2: "요구 해석", J3: "직접 판단", J4: "방법과 도구",
  J5: "산출물", J6: "비교와 검증", J7: "실패와 수정", J8: "조직 활용",
};

/** 축이 무엇을 묻는 자리인지 한 줄. 결과지에서 축 이름 아래 선다 */
export const AXIS_WHAT_KO: Record<Axis, string> = {
  J1: "무엇을 풀 문제로 잡았는가",
  J2: "받은 요구를 어떻게 읽었는가",
  J3: "직접 정한 조건과 기준이 무엇인가",
  J4: "어떤 방법과 도구로 했는가",
  J5: "무엇이 결과물로 남았는가",
  J6: "무엇과 비교해 확인했는가",
  J7: "안 됐을 때 무엇을 고쳤는가",
  J8: "그 결과가 어디에 쓰였는가",
};

/**
 * 그 축이 확인된 사람이 **실제로 해 본 일**을 짧은 구로.
 *
 * 축 이름(`비교와 검증`)은 우리 쪽 분류이고, 그것이 학생 화면의 첫 줄에
 * 서면 읽는 사람이 자기 경험 대신 분류표를 읽는다. 그래서 칩에는 축
 * 이름이 서고 그 **위 한 줄**은 이 표가 든다. **새로 판정하지 않는다**:
 * 어느 축이 확인됐는지는 결과 모델이 정한 그대로이고 여기서는 그 축을
 * 학생의 말로 부르기만 한다.
 */
export const AXIS_DID_KO: Record<Axis, string> = {
  J1: "무엇을 풀지 직접 잡아본",
  J2: "받은 요구를 조건으로 옮겨본",
  J3: "기준을 직접 세워본",
  J4: "방법을 골라 끝까지 해본",
  J5: "남길 결과물을 만들어본",
  J6: "여러 안을 비교해 골라본",
  J7: "안 되는 데를 찾아 고쳐본",
  J8: "그 결과가 쓰이게 해본",
};

export const AXIS_STATE_SHORT_KO = {
  NOT_OBSERVED: "아직 없음",
  PARTICIPATED: "받아서 수행",
  CONFIRMED: "직접 수행",
  OWNED: "직접 결정",
} as const;

/**
 * 축 하나의 상태를 **문장으로** 적는다.
 *
 * 칸 셋에 색을 채워 두면 `3점 가운데 2점` 으로 읽힌다. 이 자리가 재는
 * 것은 점수가 아니고 누가 정했는지라서, 주인공은 글자 쪽이어야 한다.
 *
 * **축 이름을 문장에 그대로 끼우지 않는다.** `직접 판단` 을 끼우면
 * `직접 판단을 직접 해 본 것으로 확인됐습니다` 가 되고, 여덟 줄이 거의
 * 같은 모양으로 늘어선다. 축마다 묻는 것이 다르니 문장도 따로 적는다.
 */
type Said = "OWNED" | "CONFIRMED" | "PARTICIPATED";
const AXIS_SENT_KO: Record<Axis, Record<Said, string>> = {
  J1: {
    OWNED: "무엇을 풀 문제로 잡을지 직접 정함",
    CONFIRMED: "주어진 범위 안에서 문제를 직접 잡음",
    PARTICIPATED: "문제를 잡을 때 함께함",
  },
  J2: {
    OWNED: "받은 요구를 어떤 조건으로 옮길지 직접 정함",
    CONFIRMED: "받은 요구를 조건으로 옮기는 일을 직접 함",
    PARTICIPATED: "옮겨진 조건을 받아 씀",
  },
  J3: {
    OWNED: "조건과 기준값을 직접 정함",
    CONFIRMED: "조건과 기준값을 다루는 일을 직접 함",
    PARTICIPATED: "정해진 조건과 기준값을 받아 씀",
  },
  J4: {
    OWNED: "어떤 방법과 도구로 풀지 직접 고름",
    CONFIRMED: "그 방법과 도구를 직접 다룸",
    PARTICIPATED: "정해진 방법과 도구를 받아 씀",
  },
  J5: {
    OWNED: "무엇을 결과물로 남길지 직접 정함",
    CONFIRMED: "결과물을 직접 만들어 남김",
    PARTICIPATED: "결과물 만드는 일에 함께함",
  },
  J6: {
    OWNED: "무엇과 비교해 확인할지 직접 정함",
    CONFIRMED: "낸 값을 다른 것과 직접 비교함",
    PARTICIPATED: "비교한 결과를 받아 읽음",
  },
  J7: {
    OWNED: "안 됐을 때 무엇을 고칠지 직접 정함",
    CONFIRMED: "안 되던 부분을 직접 고침",
    PARTICIPATED: "고치는 일에 함께함",
  },
  J8: {
    OWNED: "그 결과를 어디에 쓸지 직접 정함",
    CONFIRMED: "그 결과가 쓰이는 데까지 직접 따라감",
    PARTICIPATED: "그 결과가 쓰인 곳을 전해 들음",
  },
};

export function axisStateKo(axis: Axis, state: AxisState): string {
  if (state === "NOT_OBSERVED") return "이번 응답에는 없음";
  return AXIS_SENT_KO[axis][state];
}

/**
 * 묶음의 이름. **코드를 사용자에게 내보내지 않는다.**
 *
 * `scoring/text.ko.ts` 의 이름은 되짚는 자리에서 쓰는 긴 말이고, 결과지
 * 화면에는 짧은 쪽이 선다. 둘이 어긋나지 않게 긴 말은 그대로 가져와
 * 설명 줄로 쓴다.
 */
/**
 * **학생이 먼저 보는 줄은 자연어다**(FINAL POLISH §2).
 *
 * `근거가 선 영역` 과 `이번에 깊게 묻지 않은 영역` 은 우리가 판정을
 * 부르는 말이고, 상담 자리에서 학생에게 그대로 말하지 않는다. 가리키는
 * 묶음과 그 묶음에 드는 조건은 한 줄도 바뀌지 않았다: **이름만 그 자리에서
 * 부르는 말로 적는다.** 안쪽 코드(`Z1_EVIDENCE_ESTABLISHED` …)는 그대로이고
 * 되짚는 자리에서 쓰는 긴 말은 `scoring/text.ko.ts` 가 그대로 든다.
 */
export const ZONE_TITLE_KO = {
  Z1_EVIDENCE_ESTABLISHED: "지원서에 쓸 수 있는 경험이 있는 영역",
  Z2_EVIDENCE_INCOMPLETE: "해 봤고 아직 정리가 덜 된 영역",
  Z3_EVIDENCE_LOW_INTEREST: "해 봤지만 지금 관심이 낮은 영역",
  Z4_INSUFFICIENT_EVIDENCE: "아직 해 본 일이 적은 영역",
  NOT_EXPLORED: "이번 검사에서는 자세히 다루지 않은 영역",
} as const;

/**
 * 영역 하나의 **한 줄 상태 설명**(규격 §12).
 *
 * **묶음 이름을 다시 적지 않는다.** 전에는 이 자리가 채점 쪽의 묶음 이름을 그대로
 * 써서, 영역 머리의 딱지가 `근거가 확인된 영역` 이라고 적은 바로 아래에
 * `근거가 선 영역` 이 또 섰다. 같은 말이 두 줄로 서면 읽는 사람은 둘째
 * 줄을 읽지 않고, 그 자리가 들어야 할 **무엇이 확인됐는가**가 사라진다.
 */
export const ZONE_LEAD_KO = {
  Z1_EVIDENCE_ESTABLISHED: "무엇을 정했는지와 무엇이 남았는지가 함께 적혀 있습니다.",
  Z2_EVIDENCE_INCOMPLETE: "해 보신 일은 있고, 손에 남은 것이 아직 적습니다.",
  Z3_EVIDENCE_LOW_INTEREST: "해 보신 일은 있고, 지금 관심은 다른 쪽에 있습니다.",
  Z4_INSUFFICIENT_EVIDENCE: "아직 이야기로 꺼낼 만한 것이 모이지 않았습니다.",
  NOT_EXPLORED: "이번 검사에서는 자세히 다루지 않았습니다.",
} as const;

/**
 * 결과 첫 줄. **상담 자리에서 사람이 그대로 말할 수 있는 문장만 쓴다**
 * (COMMERCIAL FINAL §4·§6).
 *
 * 재는 것은 한 줄도 바뀌지 않았다: 이 머리글이 서는 조건은 `build.ts` 의
 * `headlineOf()` 가 정하고 묶음 판정도 그대로다. 바뀐 것은 **같은 상태를
 * 어떤 말로 적는가**뿐이다.
 *
 * 전에는 이 자리가 우리 쪽 말로 상태를 적었다(`지원서에서 정리해볼 만한
 * 근거가 있는 영역이 있습니다` · `직접 정한 것과 남긴 결과물이 함께
 * 확인된 영역입니다`). 뜻은 맞지만 진로상담사가 학생을 앞에 두고 그대로
 * 말하지 않는 문장이고, 결과지의 첫 줄이 그렇게 서면 그 아래 전부가 같은
 * 말투로 읽힌다.
 *
 * **상태마다 할 말이 다르다.** 근거가 선 사람에게는 꺼내 쓸 것이 있다고
 * 말하고, 해 보기만 한 사람에게는 정리만 남았다고 말하고, 아직 적은
 * 사람에게는 하나부터 해 보자고 말한다. **가짜 개인화를 하지 않는다**:
 * 아래 다섯 줄은 실제 상태가 그에 해당할 때만 선다.
 */
const HEADLINE_KO: Record<HeadlineCode, { title: string; lead: string }> = {
  /* **품질까지 보증하는 말을 쓰지 않는다.** 우리가 본 것은 응답에서 확인된
     경험이고 밖에서 검증된 성과가 아니다 */
  EVIDENCE_READY: {
    title: "방향을 직접 정해 본 과제가 있어요",
    /* 이름 없는 자리의 기본값이다. 실제로는 아래 `headlineLead()` 가
       그 사람이 고른 답에서 두 문장을 만들어 이 자리를 덮는다 */
    lead: "지원서에서 할 이야기는 이미 있어요.",
  },
  EVIDENCE_PARTIAL: {
    title: "해 본 과제는 있고, 정리만 남았어요",
    /* **`바로 쓸 수 있다` 고 적지 않는다.** 쓰는 사람이 할 일을 우리가
       끝낸 것으로 적는 말이고, `v3:result:copy` 가 그것을 센다 */
    lead: "뭘 골랐는지만 덧붙이면 돼요.",
  },
  /* **관심과 근거를 한 점수로 합치지 않는다.** 관심이 낮다고 근거가 없는
     것이 아니다. 그 사람에게 할 말은 `이 영역을 진로로 둘지 정하세요` 이고
     `더 해 보세요` 는 이미 해 본 사람에게 할 말이 못 된다 */
  EVIDENCE_LOW_INTEREST: {
    title: "해 본 과제는 쌓였는데, 마음은 다른 쪽에 있어요",
    lead: "이 쪽을 계속 볼지부터 정하면 좋겠어요.",
  },
  EXPLORING: {
    title: "아직 직접 해 본 과제는 많지 않아요",
    lead: "짧게 한 번 해 보면 이야기할 거리가 생겨요.",
  },
  /* **첫 줄을 모자람으로 열지 않는다**(규격 §6). 전에는 `아직 판단할
     재료가 모이지 않았습니다` 로 열었다. 사실이지만 결과지를 연 사람이
     처음 읽는 줄이 자기가 모자란다는 말이고, 그 다음에 적힌 할 일까지 그
     틀에서 읽힌다. **좋게 꾸미지도 않는다**: 적합도나 강점을 말하지 않고,
     지금 이 응답으로 할 수 있는 말을 그대로 적는다 */
  NO_EVIDENCE: {
    title: "아직 한쪽으로 크게 기울지는 않았어요",
    lead: "해 본 적이 있다고 고르신 쪽부터 좁혀 보세요.",
  },
};

/**
 * 머리글이 **어느 영역에서 나온 말인지**(SIGN-OFF §2).
 *
 * 머리글 코드는 `headlineOf()` 가 묶음을 보고 정한다. 그러니 그 머리글을
 * 떠받치는 영역은 그 묶음에 든 영역이고, 그 이름을 머리글에 적으면
 * `무엇이 있는지` 까지 첫 줄에서 말할 수 있다.
 *
 * **가짜 개인화를 하지 않는다.** 머리글마다 떠받치는 묶음을 못 박아 두고,
 * 그 묶음에 실제로 든 영역만 이름을 적는다. 겪어 본 것이 없는 머리글
 * (`EXPLORING` · `NO_EVIDENCE`)은 이 표에 줄이 없어서 전과 같은 문장이
 * 그대로 선다: 꺼내 쓸 경험이 없는 사람에게 영역 이름을 적으면 그 줄이
 * 거짓이 된다.
 */
const HEADLINE_ZONE: Partial<Record<HeadlineCode, Zone>> = {
  EVIDENCE_READY: "Z1_EVIDENCE_ESTABLISHED",
  EVIDENCE_PARTIAL: "Z2_EVIDENCE_INCOMPLETE",
  EVIDENCE_LOW_INTEREST: "Z3_EVIDENCE_LOW_INTEREST",
};

/**
 * 영역 이름을 받아 머리글 한 줄을 만든다.
 *
 * **묶음마다 할 말이 다르다**: 근거가 선 쪽에는 꺼내 쓸 것이 있다고 적고,
 * 해 보기만 한 쪽에는 정리만 남았다고 적고, 관심이 다른 쪽에는 계속할지를
 * 정하라고 적는다. 상태를 바꿔 적지 않고 **그 상태에 이름만 붙인다.**
 */
/*
 * **분류 이름이 결과의 주인공으로 서지 않게 한다**(R5 §15).
 *
 * `경영전략·기획에서 …` 로 열면 첫 줄의 첫 낱말이 우리 쪽 분류이고,
 * 가운뎃점이 그 자리에서 가장 먼저 읽힌다. 뒤에 `과제에서` 를 붙이면
 * 같은 이름이 **그 사람이 한 과제의 자리**로 읽힌다. 이름 자체는 건드리지
 * 않는다: 그것이 측정이 가리키는 영역이고, 줄여 적으면 뜻이 달라진다.
 *
 * **동사를 사람 말로 둔다**(§11): `정하고` · `골랐고` · `남았어요`.
 */
const HEADLINE_SAID_KO: Partial<Record<HeadlineCode | "EVIDENCE_READY_OUTPUT", (where: string) => string>> = {
  EVIDENCE_READY: (w) => `${w} 과제에서 방향을 직접 정해 본 일이 있어요`,
  /* **직접 정하지 않은 사람에게 `직접 정해 본` 을 적지 않는다**(R30 시나리오 D).
     근거가 선 영역(Z1)은 필수 축과 산출물로 서고 직접 판단(J3)이 받아서
     수행에 머문 채로도 설 수 있다. 그 사람의 첫 줄이 `방향을 직접 정해 본
     일` 이면 지원서에 그대로 옮겨 적는 순간 거짓이 된다. 그래서 J3 가
     확인되지 않은 영역이 머리에 설 때는 **실제로 선 것**(끝까지 가서
     남긴 것)으로 적는다. 묶음도 알약도 그대로다 */
  EVIDENCE_READY_OUTPUT: (w) => `${w} 과제를 끝까지 가서 남긴 것이 있어요`,
  EVIDENCE_PARTIAL: (w) => `${w} 과제는 해 봤고, 정리만 남았어요`,
  EVIDENCE_LOW_INTEREST: (w) =>
    `${w} 과제는 해 봤는데, 마음은 다른 쪽에 있어요`,
};

/**
 * 첫 화면 맨 위의 **작은 알약 한 줄**(R5 Skeleton Reset).
 *
 * 새 첫 화면의 큰 글씨는 **그 사람이 고른 문장**이다. 그러면 판정은
 * 어디로 가는가 — 문장 위의 알약 하나로 간다. 여섯 자에서 열넉 자이고
 * 판정을 바꾸지 않는다: `headlineOf()` 가 정한 묶음을 그대로 받아 그
 * 상태를 학생의 말로 한 번 적을 뿐이다.
 */
const HEADLINE_BADGE_KO: Record<HeadlineCode, string> = {
  /* **`바로 쓸 수 있다` 고 적지 않는다**(R34 §4). 응답에서 확인된 것은
     그 사람이 고른 항목이고, 수치와 결과는 아직 적히지 않았다. 알약이
     말할 수 있는 것은 `옮겨 적을 재료가 있다` 까지다 */
  EVIDENCE_READY: "지원서에 쓸 경험이 있어요",
  EVIDENCE_PARTIAL: "정리만 하면 돼요",
  EVIDENCE_LOW_INTEREST: "해 본 일은 쌓여 있어요",
  EXPLORING: "이제 시작해 보면 돼요",
  NO_EVIDENCE: "아직 한쪽으로 기울지 않았어요",
};

export function headlineBadgeKo(m: ResultModel): string {
  return HEADLINE_BADGE_KO[m.overview.headline];
}

/**
 * 머리글에 이름을 적을 영역.
 *
 * 차례는 결과 모델이 정한 그대로다(`focus` · `low_interest`). **여기서
 * 차례를 다시 세우지 않는다**: 세우면 첫 줄이 가리키는 영역과 바로 아래
 * 칸이 가리키는 영역이 어긋난다.
 *
 * **둘까지만 적는다.** 넷을 이으면 첫 줄이 두 줄 반을 먹고, 결과지에서 가장
 * 먼저 읽는 자리가 가장 읽기 어려운 자리가 된다. 전체 목록은 아래 영역 절이
 * 한 자리에서 든다.
 */
function headlineDomains(m: ResultModel): string[] {
  const want = HEADLINE_ZONE[m.overview.headline];
  if (!want) return [];
  const inZone = new Set(m.domains.filter((d) => d.zone === want).map((d) => d.code));
  const order = m.overview.headline === "EVIDENCE_LOW_INTEREST"
    ? m.overview.low_interest : m.overview.focus;
  const picked = order.filter((c) => inZone.has(c));
  return (picked.length ? picked : [...inZone]).slice(0, 2);
}

const WHY_KO: Record<GapWhy, string> = {
  REQUIRED_FOR_DOMAIN: "이 영역에서 빠지면 경험을 설명하기 어려운 부분입니다",
  BLOCKS_EVIDENCE: "이것이 없으면 해 본 일을 다른 사람에게 보여줄 방법이 없습니다",
  NEEDED_BY_INDUSTRY: "고르신 산업에서 특히 자주 묻는 부분입니다",
  NEEDED_BY_ROLE: "고르신 역할에서 특히 자주 묻는 부분입니다",
};

/**
 * 축마다 **비어 있는 것을 그 축의 말로** 적는다(규격: 판정문 되풀이 금지).
 *
 * 전에는 여덟 축이 모두 `…경험이 아직 확인되지 않았습니다` 였다. 빈자리가
 * 일곱이면 한 결과지에 거의 같은 줄이 일곱 번 서고, 그러면 읽는 사람은
 * 그 절을 **하나의 빨간 목록**으로 읽는다. 상담 자리에서 사람은 축마다
 * 다른 말을 한다: 산출물이 없는 것과 비교를 안 한 것은 다른 이야기다.
 */
const AXIS_GAP_KO: Record<Axis, string> = {
  J1: "무엇을 풀 문제로 잡았는지가 아직 안 보여요",
  J2: "받은 요구를 어떤 조건으로 옮겼는지가 아직 없습니다",
  J3: "직접 정한 조건이나 기준이 아직 안 보여요",
  J4: "어떤 방법과 도구로 했는지가 아직 없습니다",
  J5: "과제에서 손에 남은 것이 아직 없어요",
  J6: "무엇과 비교해 봤는지가 아직 없습니다",
  J7: "안 됐을 때 무엇을 고쳤는지가 아직 없어요",
  J8: "그 결과가 어디에 쓰였는지가 아직 없습니다",
};

/**
 * 비어 있는 자리를 **첫 화면 칸에 적는 짧은 이름씨**로(COMMERCIAL FINAL §5).
 *
 * 축 이름(`요구 해석` · `직접 판단` · `산출물`)은 우리 쪽 분류다. 데이터
 * 구조로는 그대로 두되 **학생 화면의 첫 줄로 쓰지 않는다**: 첫 화면 칸이
 * `경영전략·기획에서 요구 해석 · 직접 판단` 으로 서면 읽는 사람이 자기
 * 결과 대신 우리 분류표를 읽는다.
 *
 * 여기 적는 것은 상담 자리에서 그대로 부르는 말이다: 그래서 `${needKo(ax)}
 * 을 아직 적지 않으셨습니다` 가 한 문장으로 선다.
 */
const AXIS_NEED_KO: Record<Axis, string> = {
  J1: "풀려고 한 문제",
  J2: "받은 요구를 어떤 조건으로 옮겼는지",
  J3: "직접 정한 기준",
  J4: "쓴 방법",
  J5: "손에 남은 결과물",
  J6: "무엇과 비교했는지",
  J7: "안 됐을 때 고친 내용",
  J8: "그 결과가 쓰인 곳",
};

export function needKo(axis: Axis): string {
  return AXIS_NEED_KO[axis];
}

/**
 * 축 이름씨 뒤에 붙이는 자리토씨.
 *
 * **`-는지` 로 끝나는 이름씨에는 `를` 을 붙이지 않는다.** `어떤 조건으로
 * 옮겼는지를 세 줄로 적어 보세요` 는 틀리지 않지만 상담 자리에서 사람이
 * 그렇게 말하지 않는다. 받침을 보고 붙이는 자리는 그대로 두고, 이
 * 모양만 뺀다.
 */
function needWithJosa(need: string): string {
  return /는지$/.test(need) ? need : withJosa(need, "을를");
}

/** 여럿을 한 문장으로. `A와 B를 아직 적지 않으셨습니다` */
export function needSentenceKo(axes: Axis[]): string {
  const xs = [...new Set(axes)].map((a) => AXIS_NEED_KO[a]);
  if (!xs.length) return "";
  return `${needWithJosa(andList(xs))} 아직 적지 않으셨어요`;
}

const GAP_TITLE_KO: Record<Gap["kind"], (ax: string, a?: Axis | null) => string> = {
  REQUIRED_AXIS: (ax, a) => (a ? AXIS_GAP_KO[a] : `${ax} 쪽 이야기가 아직 없습니다`),
  OUTPUT: () => "과제에서 손에 남은 것이 아직 없어요",
  OUTPUT_EVIDENCE: () => "무엇을 남겼는지 아직 고르지 않았습니다",
  VERIFICATION: () => "무엇과 비교해 봤는지가 아직 없어요",
  AXIS: (ax, a) => (a ? AXIS_GAP_KO[a] : `${ax} 쪽 이야기가 아직 없습니다`),
  /* **해 본 것을 없다고 적지 않는다.** 덜 적힌 것은 어디까지 직접
     정했는지다.
     **축 이름을 이 자리에 적지 않는다**(R2 §12). 전에는 `요구 해석은 해
     보셨고 …` 로 섰다. `요구 해석` 은 우리 쪽 분류이고, 바로 앞에 영역
     이름이 이미 적혀 있어서 그 말이 없어도 어디의 이야기인지 읽힌다 */
  /* **직접 정한 것이 확인된 자리다**(R31 · Human Review). 이 종류는
     `confirmed && !owned` 에서만 서므로(`build.ts`) 그 사람은 이미 무엇을
     정했다고 답했고, 모자란 것은 **그 기준을 어떤 근거로 어디까지
     맡았는가**다. 전에는 `어디까지 직접 정했는지가 아직 없습니다` 로 적어
     머리글의 `방향을 직접 정해 본 일이 있어요` 와 한 쪽에서 부딪혔다
     (R30 시나리오 C) */
  PARTIAL_EVIDENCE: () =>
    "직접 정한 것은 보이고, 그 기준을 어떤 근거로 어디까지 맡았는지는 아직입니다",
};

/**
 * 첫 화면 칸에 들어가는 짧은 꼴.
 *
 * 긴 제목을 그대로 넣으면 칸 하나가 두 줄로 벌어져 옆 칸과 어긋난다.
 * 여기는 **어디의 무엇인지**만 적고, 왜 그 자리가 필요한지는 아래 절이
 * 맡는다.
 */
const GAP_SHORT_KO: Record<Gap["kind"], (ax: string) => string> = {
  REQUIRED_AXIS: (ax) => ax,
  OUTPUT: () => "남은 결과물",
  OUTPUT_EVIDENCE: () => "남긴 결과물이 무엇인지",
  VERIFICATION: () => "무엇과 비교해 확인했는지",
  AXIS: (ax) => ax,
  PARTIAL_EVIDENCE: () => "정한 기준의 근거와 범위",
};

/**
 * **축 이름을 이 자리에 적지 않는다**(FINAL POLISH §2).
 *
 * 전에는 `요구 해석 경험` 과 `직접 판단 경험` 이 영역 카드와 첫 화면에
 * 그대로 섰다. 그 말은 우리 쪽 분류이고, 학생이 먼저 읽는 줄에 서면
 * 자기 결과 대신 분류표를 읽는다. 쓰는 말을 `AXIS_NEED_KO` 로 바꾼다:
 * 가리키는 축도 빈자리의 종류도 그대로이고 **부르는 말만 갈린다.**
 */
export function gapShortKo(g: Gap, domainName: string): string {
  return `${domainName} · ${GAP_SHORT_KO[g.kind](g.axis ? AXIS_NEED_KO[g.axis] : "")}`;
}

/**
 * 영역 카드 안에 적는 꼴. **영역 이름도 문장도 아니다**(규격 §10).
 *
 * 카드 머리가 영역을 이미 적고 있고, 같은 빈자리의 **긴 문장**은 아래
 * `앞으로 채울 것` 절이 든다. 카드에 그 문장을 그대로 세우면 한 종이에서
 * 같은 줄을 두 번 읽고, 영역 이름을 떼면 이번에는 카드끼리 글자까지 같은
 * 줄이 선다. 그래서 카드에는 **칸의 말**을 적는다.
 */
export function gapCellKo(g: Gap): string {
  return GAP_SHORT_KO[g.kind](g.axis ? AXIS_NEED_KO[g.axis] : "");
}

/** 반쯤 선 자리는 까닭도 다르다. `보여줄 방법이 없다` 는 참이 아니다 */
const PARTIAL_WHY_KO = "직접 정한 것이 보입니다. 지원서와 면접에서는 그"
  + " 기준을 어떤 근거로 정했고 어디까지 맡았는지까지 묻습니다.";


/**
 * 학위마다 할 일의 깊이가 다르다. **Core 판정은 그대로다.**
 *
 * 학부생에게 `협업에서 가진 권한` 을 적으라고 하면 적을 것이 없고, 포닥에게
 * `수업 과제면 됩니다` 는 하나 마나 한 말이다. 달라지는 것은 다음 걸음의
 * 깊이뿐이고, 묶음과 축 상태는 학위를 보지 않는다.
 */
const DEPTH_KO: Record<Stage, string> = {
  bachelor: "수업 프로젝트나 캡스톤, 짧은 스터디 가운데 하나면 됩니다.",
  master: "학위 과제에서 직접 맡은 범위와, 그 결과를 무엇으로 검증했는지까지"
    + " 적으면 됩니다.",
  phd: "문제를 어떻게 잡았고 그 방법을 왜 골랐는지, 남은 불확실성까지"
    + " 적으면 됩니다.",
  /* **한 문장에 셋을 담지 않는다**(PRODUCT POLISH §2). 범위와 몫과
     옮긴 문장을 한 줄에 이으면 학생이 한 번에 읽지 못한다 */
  postdoc: "혼자 판단한 범위와 과제에서 맡은 몫을 적으면 됩니다."
    + " 그 결과를 산업이나 기관의 말로 옮긴 문장도 함께 두세요.",
};

/** 짧게 한 번 해 보는 자리도 학위마다 다르다 */
const TRY_KO: Record<Stage, string> = {
  bachelor: "수업 프로젝트나 교내 과제 하나면 충분합니다.",
  master: "연구실 과제에서 작은 범위를 하나 맡아보는 것으로 됩니다.",
  phd: "본 연구 옆에 작은 검증 과제를 하나 두는 쪽이 빠릅니다.",
  postdoc: "협업 과제나 외부 의뢰 가운데 짧은 것을 하나 맡아 기록을 남기면 됩니다.",
};

/**
 * 영역마다 **그 일을 설명하는 차례가 다르다.** 그 표는 Core 마다 달라서
 * `chains.ts` 가 들고, 여기서는 할 일에 담겨 온 것을 읽기만 한다.
 *
 * **영역이 정해지지 않은 할 일에는 차례가 없다.**
 */
function chainOf(a: Action): string[] {
  return a.material.chain ?? [];
}

/**
 * 그 영역이 일하는 차례. 결과지에서 영역을 소개하는 자리에도 쓴다.
 *
 * **Core 를 함께 받는다.** 영역 코드는 Core 안에서만 뜻이 있어서, 코드만
 * 보고 고르면 전기전자 응시자에게 기계공학 차례가 나간다.
 */
export function domainChainKo(core: string, domain: string): string[] {
  return chainFor(core, domain);
}

/**
 * 고르신 항목 한 줄을 **높임꼴로** 옮긴다(R2 §8).
 *
 * Evidence 네 단계의 ①②③ 은 응답에서 고르신 체크리스트 문장이고 끝맺음이
 * `~다` 다. 그대로 세우면 네 줄이 **메모 넷**으로 읽히고, 바로 위 첫 화면과
 * 아래 할 일은 `~습니다` 라서 한 절 안에서 말투가 갈린다. 네 단계가 한
 * 경험을 네 문장으로 풀어낸 것으로 읽히려면 말끝이 같아야 한다.
 *
 * **낱말을 더하지도 빼지도 않는다**: `polite()` 가 끝맺음만 바꾼다.
 */
export function saidKo(clause: string): string {
  /* **그 사람이 한 일을 `습니다` 로 적지 않는다**(Gate §3·§4). 네 칸이
     모두 `했습니다` 로 닫히면 그 자리가 기록부로 읽힌다. 어순과 낱말은
     `say.ts` 가 돌리고 여기서는 문장으로 닫기만 한다 */
  return `${sayKo(clause)}.`;
}

/**
 * 첫 화면 ② `남긴 근거` 의 둘째 줄.
 *
 * 전에는 `지원서에 그대로 옮길 이야기가 8가지 모였습니다` 였다. **수를
 * 앞세우면 그 칸이 셈이 된다**(R2 §15·§17): 여덟이라는 수는 읽는 사람이
 * 다음에 무엇을 할지 정하는 데 쓰이지 않고, 우리가 센 축의 개수다.
 */
export function keptNoteKo(hasArtifacts: boolean): string {
  return hasArtifacts
    ? "과제를 하면서 직접 만들어 둔 것이에요."
    : "직접 골라서 정한 내용이 이 쪽에 적혀 있어요.";
}

/**
 * **경험 하나를 한 이야기로**(R12 §1).
 *
 * 받은 참조 구현이 `primary` 와 `secondary` 를 **같은 꼴 하나**로 두고
 * 둘을 layout 으로만 가른다. 그래서 여는 경험과 곁근거가 서로 다른 자료
 * 꼴을 들고 있던 것을 하나로 합쳤다. 꼴을 둘로 두면 **같은 재료에서 나온
 * 한 이야기**라는 것이 자료 쪽에서부터 흐려지고, 읽는 층이 두 벌로 갈려
 * 한쪽만 고쳐지는 날이 온다.
 *
 *   domain       그 경험이 선 영역 이름
 *   action       한 행동. 행동문 하나
 *   decision     그 안에서 직접 정한 것. 행동문 하나 (재료가 없으면 비운다)
 *   outputs      손에 남은 것. **이름씨**
 *   application  지원서에서 꺼낼 자리
 *   interview    면접에서 이어질 **실제 물음**
 *
 * **세 가지 꼴을 섞는다**(R11 §7): 행동문 · 이름씨 · 실제 물음. 그래서 한
 * 묶음이 전부 같은 어미로 닫히지 않는다. `decision` 이 `action` 과 같은
 * 문장이 되면 비운다: 같은 줄을 두 번 적으면 둘 가운데 하나는 읽히지 않는다.
 *
 * **두 경험을 같은 틀의 변형으로 두지 않는다.** 꼴이 하나이므로 가르는
 * 자리를 자료 쪽에 둔다: 여는 경험은 **그 영역이 일하는 차례**에서 꺼낼
 * 자리를 집고, 곁근거는 **손에 남은 것**에서 그것을 그렇게 만든 까닭을
 * 집는다. 화면 쪽은 그 둘을 서로 다른 DOM 으로 세운다(참조 구현의
 * `--primary` / `--secondary`).
 *
 * **뜻을 더하지 않는다**: 토막이 전부 고르신 항목과 그 영역이 일하는
 * 차례에서 오고, 재료가 없는 토막은 비운다.
 */
export type UseSlot = "lead" | "second";

export type UseEv = {
  did?: string | null;
  decided?: string | null;
  decisions?: string[]; artifacts?: string[]; verifications?: string[];
};

/** 경험 하나. **여는 경험과 곁근거가 같은 꼴을 쓴다** */
export type EvidenceStory = {
  /** 그 경험이 선 영역 이름. 부르는 쪽이 넘긴다 */
  domain: string;
  /** 한 행동. 행동문 하나 */
  action: string;
  /** 그 안에서 직접 정한 것. 재료가 없으면 비운다 */
  decision?: string;
  /** 손에 남은 것. 이름씨 */
  outputs: string[];
  /** 지원서에서의 **출발점**. 문장이 아니라 꺼낼 자리다 */
  application: string;
  /** 면접에서 이어질 **실제 물음** */
  interview: string;
};

/** `A를 ~했다` 에서 `A`. 목적어가 없거나 길면 돌려주지 않는다 */
function objKo(clause: string): string | null {
  const m = /^(.+)([을를])\s\S+다$/.exec(plainKo(clause));
  return m && m[1].length >= 2 && m[1].length <= 22 ? m[1] : null;
}

/** 고르신 판단에서 목적어를 모은다. 같은 말은 한 번만 */
function objsOf(ev: UseEv): string[] {
  const picks = [ev.decided, ...(ev.decisions ?? [])]
    .filter((t): t is string => !!t);
  return [...new Set(picks.map(objKo).filter((t): t is string => !!t))];
}

/**
 * 남은 것의 이름.
 *
 * **문장으로 세우지 않는다**. 이 자리가 드는 것은 손에 무엇이 남았는가이고,
 * 그건 이름씨로 적을 때 가장 짧게 읽힌다. 세는 말을 떼고 이어 붙은 이름씨
 * 둘을 가운뎃점으로 가르는 것이 전부이며, **이름을 바꾸지 않는다**: 영역
 * 사전이 적어 둔 말 그대로다.
 */
export function keepKo(label: string): string {
  const t = label.trim().replace(/\s한\s(벌|장|부|건|묶음|권|쪽)$/, "");
  const m = /^(.+?)와\s(.+?)\s(표|문서|기록|목록|대장)$/.exec(t);
  return m ? `${m[1]}·${m[2]} 정리${m[3]}` : t;
}

function keepsOf(ev: UseEv): string[] {
  return (ev.artifacts ?? []).map(keepKo)
    .filter((t) => t.length >= 2 && t.length <= 18).slice(0, 2);
}

/**
 * 면접은 **실제 묻는 말**로.
 *
 * 인용 부호를 글에 넣지 않는다: 그 자리를 `blockquote` 로 세우므로 부호가
 * 화면과 자료에 두 번 서게 된다(참조 구현의 `cm-use-block--interview`).
 * **겹토씨를 붙이지 않는다**: 받침을 보고 고른 토씨 뒤에 글자를 또 이어
 * 붙이면 그 자리를 세는 검사에 걸리고, 떼고 읽어도 뜻이 그대로다.
 */
function askKo(ev: UseEv, skip?: string): string {
  const vs = (ev.verifications ?? []).filter((t) => t.length >= 2 && t.length <= 14);
  if (vs.length) return `${withJosa(vs[0], "과와")} 어떻게 맞췄나요?`;
  const o = objsOf(ev).find((t) => t !== skip) ?? objsOf(ev)[0];
  return o ? `${withJosa(o, "은는")} 어떻게 정했나요?` : "그때 무엇을 보고 정했나요?";
}

/** 여는 경험의 꺼낼 자리. 그 영역이 **일하는 차례**에서 집는다 */
function leadUseKo(core: string, domain: string, ev: UseEv): string {
  const step = chainFor(core, domain)[1] ?? "";
  if (step && step.length <= 20) {
    return `${withJosa(step, "을를")} 어떤 기준으로 나눴는지부터 꺼내보세요`;
  }
  /* **되풀이되는 틀을 두 번 쓰지 않는다.** 위가 `어떤 기준으로 나눴는지`
     이므로 여기서 `어떤 기준으로 정했는지` 를 쓰면 같은 틀이 Core 마다
     돌아간다(`v3:result:copy` 14번이 세는 자리다) */
  const o = objsOf(ev)[0];
  return o
    ? `${withJosa(o, "을를")} 어디까지 직접 정했는지부터 꺼내보세요`
    : "그때 무엇을 먼저 정했는지부터 꺼내보세요";
}

/** 곁근거의 묻는 자리. 고른 판단 가운데 꺼낼 자리에서 쓰지 않은 쪽 */
function alsoAskKo(ev: UseEv): string {
  const objs = objsOf(ev);
  const point = objs[1] ?? objs[0];
  const other = objs.find((t) => t !== point) ?? objs[0];
  return other
    ? `${withJosa(other, "은는")} 어떻게 정했나요?`
    : askKo(ev);
}

/** 곁근거의 꺼낼 자리. **손에 남은 것**에서 까닭을 집는다 */
function alsoUseKo(ev: UseEv): string {
  const objs = objsOf(ev);
  const keep = keepsOf(ev);
  const point = objs[1] ?? objs[0];
  if (point) return `${withJosa(point, "을를")} 그렇게 정한 까닭까지 이어 적으면 좋아요`;
  if (keep.length) return `${withJosa(keep[0], "을를")} 그렇게 만든 까닭까지 이어 적으면 좋아요`;
  return "그때 직접 고른 것까지 이어 적으면 좋아요";
}

/**
 * 경험 하나를 이야기 하나로.
 *
 * `slot` 이 가르는 것은 **꺼낼 자리와 묻는 자리**뿐이다. 자료 꼴은 둘이
 * 같고, 화면 쪽이 그 둘을 서로 다른 DOM 으로 세운다.
 */
export function evidenceStoryKo(
  core: string, domain: string, ev: UseEv,
  slot: UseSlot = "lead", name = "",
): EvidenceStory {
  const objs = objsOf(ev);
  const did = ev.did ? sayKo(ev.did, "nida") : "";
  const decided = ev.decided ? sayKo(ev.decided, "nida") : "";
  /* **여는 경험의 큰 한 마디는 고른 판단이다.** 서류와 면접에서 읽히는
     쪽이 한 일이 아니라 그 안에서 직접 정한 것이고(설계 원칙 `한 일과
     고른 것을 가른다`), 곁근거는 반대로 한 일이 머리에 선다. 그래서 두
     이야기가 같은 꼴을 써도 **먼저 읽히는 토막이 서로 다르다** */
  const action = slot === "lead" ? (decided || did) : (did || decided);
  /* 곁근거의 둘째 줄은 `~도` 로 받아 **한 일에 더해진 것**으로 읽히게
     한다(참조 구현의 `cm-story__secondary-decision`) */
  const own = slot === "second"
    ? (objs.length ? `${objs[0]}도 직접 정했습니다` : decided)
    : did;
  return {
    domain: name,
    action,
    decision: own && own !== action ? own : undefined,
    outputs: keepsOf(ev),
    application: slot === "lead" ? leadUseKo(core, domain, ev) : alsoUseKo(ev),
    /* **여는 경험과 같은 꼴로 묻지 않는다.** 저쪽은 견준 자리를 먼저 묻고
       이쪽은 **고른 기준**을 묻는다. 고른 판단이 하나뿐이어도 그것을 쓴다:
       여기서 `askKo` 로 내려가면 견준 자리를 둘 다 묻게 되고, 그 둘이
       글자까지 같아진다(`v3:result:copy` 14번이 세는 자리다) */
    interview: slot === "lead" ? askKo(ev) : alsoAskKo(ev),
  };
}

/** 같은 재료에서 쓰는 자리 두 줄만. 종이 밖에서 읽는 자리가 쓴다 */
export function evidenceUsePartsKo(
  core: string, domain: string, ev: UseEv, slot: UseSlot = "lead",
): { resume: string; interview: string } {
  const s = evidenceStoryKo(core, domain, ev, slot);
  return { resume: s.application, interview: s.interview };
}

/** 한 줄로 잇는다 */
export function evidenceUseKo(
  core: string, domain: string, left: string | null,
): string {
  const s = evidenceStoryKo(core, domain, { artifacts: left ? [left] : [] });
  return `지원서 ${s.application} · 면접 ${s.interview}`;
}

/**
 * 네 단계는 둘까지 세우고, 나머지 영역은 **이름만** 잇는다.
 *
 * `~에서도 직접 정한 내용이 남아 있어요` 는 한 줄을 더 읽게 하면서 새로
 * 알려 주는 것이 없다. 남은 영역의 이름이 곧 그 사실이다.
 */
export function moreReadyKo(names: string[]): string {
  /* **가운뎃점으로 잇지 않는다**: 영역 이름 안에 이미 가운뎃점이 있어
     (`영업·사업개발`) 어디가 한 이름의 끝인지 읽히지 않는다 */
  return names.join(" / ");
}

/**
 * 해 본 것은 확인됐고 **어디까지 직접 정했는지**가 덜 적힌 축.
 *
 * `경험을 더 쌓으세요` 로 끝내면 할 말이 없어진다. 이미 한 일에서 자기
 * 몫을 가려 적는 것이 다음 걸음이고, 축마다 가릴 것이 다르다.
 */
type Mat = Action["material"];

/**
 * 할 일을 **경험 → 행동 → 결과물** 차례로 적는다(COMMERCIAL FINAL §8).
 *
 * 전에는 한 줄이 그 셋을 한 문장에 눌러 담았다: `경영전략·기획에서 받은
 * 요구를 조건으로 옮길 때 직접 정한 값을 조건표 한 장에 모아보세요.`
 * 뜻은 맞지만 **사람이 학생에게 그렇게 말하지 않는다.** 읽는 쪽은 먼저
 * `어떤 경험을 가져오라는 것인가` 를 알아야 하고, 그 다음에 무엇을 하고
 * 무엇을 남길지를 안다.
 *
 * 그래서 문장을 둘로 끊는다. 첫 문장이 **가져올 경험**을 고르게 하고,
 * 둘째 문장이 **할 일과 남길 것**을 한 묶음으로 적는다.
 */
/* **`~세요` 를 열여섯 줄에 그대로 쓰지 않는다**(R21 §F). 전에는 할 일
   열여섯이 전부 `골라보세요 … 적어 두세요` 로 열고 닫아서, 한 화면에
   같은 어미가 다섯 번 서고 그 되풀이가 사람이 아니라 틀로 읽혔다.
   첫 마디는 **고를 것 하나를 이름으로** 적고, 끝은 축마다 갈린다 */
const bring = (d: string): string => `최근 ${d} 과제 하나.`;
const bringNext = (d: string): string => `다음 ${d} 과제 하나.`;

/**
 * 할 일이 **무엇을 남기고 끝나는지**(Gate §6).
 *
 * 전에는 축 여덟 가운데 셋이 `적어두세요` 로 끝났다. 대상과 행동은 있고
 * 남길 결과가 없으면 그 할 일을 끝낸 사람의 손에 무엇이 있는지 알 수
 * 없고, 지원서에서 꺼낼 것도 생기지 않는다.
 *
 * **이름을 지어내지 않는다.** 돌려주는 것은 그 영역 사전의 `남기는 것`
 * 이고, 축마다 다른 자리를 집어 한 결과지에서 같은 이름이 되풀이되지
 * 않게 한다. 그래서 **Core 를 갈아 끼우면 이 자리가 함께 바뀐다**:
 * 축 문장이 Core 를 모르는 상수 하나였던 것이 Cross-Core 에서 영역
 * 이름만 바뀐 같은 문장으로 읽히던 원인이었다.
 *
 * 영역 사전에 결과물이 적혀 있지 않으면 지어내지 않고 `alt` 로 내려간다.
 */
const keep = (m: Mat, i: number, alt: string): string => {
  const xs = m.artifacts;
  /* **이상한 명사 결합을 그대로 적지 않는다**(Gate §7). 세는 말을 떼고
     이어 붙은 이름씨 사이에 조사를 넣는 것이 전부이고, 이름은 그대로다 */
  return xs.length ? thingKo(xs[i % xs.length]) : alt;
};

/**
 * 해 본 것은 확인됐고 **어디까지 직접 정했는지**가 덜 적힌 축.
 *
 * `경험을 더 쌓으세요` 로 끝내면 할 말이 없어진다. 이미 한 일에서 자기
 * 몫을 가려 적는 것이 다음 걸음이고, 축마다 가릴 것이 다르다.
 *
 * **한 문장에 하나만 담는다**(PRODUCT POLISH §2·§3). 영역과 행동과
 * 판단과 결과와 활용이 한 문장에 같이 들어가면 학생이 한 번에 읽지
 * 못한다. 첫 문장은 **어떤 경험을 가져올지**만 말하고, 둘째 문장이
 * 무엇을 적고 무엇을 남길지를 말한다.
 *
 * **영역마다 정하는 것이 다르다.** 영역 사전의 `먼저 정하는 것` 과
 * `남기는 것` 과 `무엇과 견주는가` 를 그대로 가져오면 열두 영역이 서로
 * 다른 문장을 받는다.
 */
const OWN_KO: Record<Axis, (d: string, m: Mat) => string> = {
  J1: (d, m) => `${bring(d)} 그때 무엇을 문제로 잡았는지 세 줄로 써서`
    + ` ${keep(m, 0, "정리한 문서")} 맨 앞에 붙입니다.`,
  J2: (d, m) => `${bring(d)} 받은 요구가 어떤 조건이 됐는지 적어`
    + ` ${keep(m, 1, "정리한 문서")}에 그대로 옮깁니다.`,
  /* **재료가 긴 영역이 있다.** `볼 손상 원인의 후보와 어느 재질을 어느
     강도로 갈지` 처럼 영역 사전의 말이 길면 한 줄이 백 자를 넘고, 그러면
     할 일로 읽히지 않는다. 그 자리에서는 재료를 그대로 쓰고 뒤를 줄인다 */
  J3: (d, m) => `${bring(d)} ${m.workflow.decide
    ? `${fewer(m.workflow.decide)} 직접 정한 것과 그 까닭을`
    : "그때 직접 정한 것과 그 까닭을"}`
    + ` ${keep(m, 2, "정리한 문서")}에 한 줄씩 남깁니다.`,
  J4: (d, m) => `${bring(d)} ${m.workflow.method
    ? `${fewer(m.workflow.method)} 왜 그 방법을 골랐는지`
    : "왜 그 방법을 골랐는지"} 다른 선택과 나란히`
    + ` ${keep(m, 3, "정리한 문서")}에 적습니다.`,
  J5: (d, m) => `${bring(d)} ${m.artifacts.length
    ? `그때 남긴 ${orList(m.artifacts)}에`
    : "그때 손에 남은 것에"} 가정과 한계를 한 줄씩 덧붙입니다.`,
  J6: (d, m) => `${bring(d)} ${m.verify_targets.length
    ? `${orList(m.verify_targets)} 가운데 무엇과 비교했는지`
    : "그 결과를 무엇과 비교했는지"} 적고,`
    + ` 그 차이를 ${keep(m, 1, "정리한 문서")}에 남깁니다.`,
  J7: (d, m) => `${bring(d)} 안 됐을 때 무엇을 바꿨는지 차례대로`
    + ` ${keep(m, 4, "정리한 문서")}에 덧붙입니다.`,
  J8: (d, m) => `${bring(d)} 그 결과가 어디에 쓰였는지 한 문단으로 써서`
    + ` ${keep(m, 5, "정리한 문서")} 끝에 붙입니다.`,
};

/**
 * 영역 사전의 목록을 **둘까지만** 적는다(R2 §16·§22).
 *
 * 영역마다 방법과 정할 것의 수가 달라서(`지표 정의, 자료 정리, 집단
 * 나누기, 비교, 결론 쓰기`) 다섯을 그대로 이으면 할 일 한 줄이 백 자를
 * 넘는다. 백 자가 넘는 줄은 할 일로 읽히지 않고 설명문으로 읽힌다.
 *
 * **줄이지만 거짓으로 적지 않는다**: 둘만 남길 때는 끝을 `가운데` 에서
 * `같은 것 가운데` 로 바꿔, 적힌 둘이 전부가 아니라는 것을 밝힌다.
 */
function fewer(list: string): string {
  const xs = list.split(/\s*,\s*/).filter(Boolean);
  if (xs.length <= 2) return `${list} 가운데`;
  return `${xs.slice(0, 2).join(", ")} 같은 것 가운데`;
}

/** 축마다 다음에 맡아볼 일이 다르다. **경험 → 행동 → 결과물 차례는 같다** */
const FILL_KO: Record<Axis, (d: string, m: Mat) => string> = {
  J1: (d, m) => `${bringNext(d)} 무엇을 문제로 잡을지 직접 정하고,`
    + ` 그 범위를 ${keep(m, 0, "정리한 문서")} 맨 앞에 한 줄 적습니다.`,
  J2: (d, m) => `${bringNext(d)} 받은 요구를 숫자로 옮기는 일을 맡고,`
    + ` 그 조건을 ${keep(m, 1, "정리한 문서")}로 남깁니다.`,
  J3: (d, m) => `${bringNext(d)} 기준이 되는 값을 직접 정하고,`
    + ` 왜 그 값인지 ${keep(m, 2, "정리한 문서")}에 함께 적습니다.`,
  J4: (d, m) => `${bringNext(d)} 쓸 방법을 직접 고르고,`
    + ` 고른 까닭을 ${keep(m, 3, "정리한 문서")}에 한 줄 남깁니다.`,
  J5: (d, m) => `${bringNext(d)} 끝까지 가서 ${keep(m, 0, "남는 것")} 한 벌을`
    + " 손에 남깁니다.",
  J6: (d, m) => `${bringNext(d)} 낸 값을 다른 방법으로 한 번 더 확인하고,`
    + ` 두 값을 ${keep(m, 4, "정리한 문서")}에 나란히 적습니다.`,
  /* **`자리` 는 우리 쪽 비유다**(GOLD MASTER §19). 손님 화면에서 그
     말이 가리키는 것이 축인지 공정의 한 지점인지 읽는 사람이 가를 수
     없다. 둘 다 그 일의 말로 적는다 */
  J7: (d, m) => `${bringNext(d)} 안 된 까닭을 좁혀 고치고,`
    + ` 그 과정을 ${keep(m, 5, "정리한 문서")}에 기록으로 남깁니다.`,
  J8: (d, m) => `${bringNext(d)} 낸 결과가 어디에 쓰이는지 따라가 보고,`
    + ` 쓰인 곳을 ${keep(m, 2, "정리한 문서")} 끝에 적습니다.`,
};

/**
 * 할 일의 **머리 한 줄**(COMMERCIAL FINAL §7).
 *
 * 첫 화면의 `지금 할 일` 칸은 머리 한 줄과 설명 두 줄까지다. 전에는 그
 * 칸이 `actionKo().do` 한 문장을 그대로 들고 있어서, 영역 이름과 재료가
 * 붙은 긴 문장이 세 줄로 벌어졌다. 그러면 네 칸 가운데 가장 중요한 칸이
 * 가장 읽기 어려운 칸이 된다.
 *
 * **머리는 할 일의 종류만 말한다.** 어디에서 무엇을 가지고 할지는 아래
 * 설명 줄이 들고, 세부 차례는 `다음에 할 일` 절이 든다.
 */
const ACTION_HEAD_KO: Record<ActionCode, string> = {
  WRITE_UP: "경험 하나를 한 쪽으로 정리하기",
  DEEPEN_OWNERSHIP: "그때 직접 정한 것을 적어 두기",
  BUILD_OUTPUT: "손에 남는 결과물 하나 만들기",
  ADD_VERIFICATION: "낸 결과를 한 번 비교해 보기",
  FILL_AXIS: "다음 과제에서 한 가지를 직접 정하기",
  TRY_SHORT_EXPERIENCE: "한 가지를 짧게 해 보기",
  EXPLORE_BROADLY: "한 가지를 골라 짧게 해 보기",
  STUDY_NEXT: "배운 것을 작은 과제에 써 보기",
  RECHECK_DIRECTION: "계속할 쪽인지 정하기",
};

/**
 * 할 일의 머리 한 줄. **영역을 받으면 그 영역의 말로 적는다**(R30).
 *
 * 전에는 머리가 종류만 말했다(`그때 직접 정한 것을 적어 두기`). 홈 Hero 와
 * 결과지 `지금 할 일` 칸에서 그 한 줄만 읽은 사람은 **어느 과제의 무엇을**
 * 적으라는 것인지 알 수 없었고, 아래 설명이 다른 축(`받은 요구를 어떤
 * 조건으로 옮겼는지`)을 말하면 머리와 설명이 서로 어긋났다. 목표 화면의 그
 * 자리는 `구조·내구 해석 경험에서 결과를 판단한 기준을 한 줄로 정리해보세요`
 * 처럼 영역과 할 일을 한 문장에 담는다.
 *
 * **새 사실을 만들지 않는다.** 들어가는 것은 할 일이 이미 들고 있는 영역과
 * 축(`AXIS_NEED_KO`)뿐이다. 영역을 못 받으면 전과 같은 머리다.
 */
/**
 * 머리 한 줄에 드는 축의 **짧은 이름씨**. `받은 요구를 어떤 조건으로
 * 옮겼는지` 를 그대로 머리에 넣으면 손전화에서 네 줄이 되고, 3초 안에
 * 무엇을 하라는지가 안 읽힌다. 긴 말은 설명 줄(`actionBriefKo`)이 든다.
 * **가리키는 축은 같다**: 짧게 적을 뿐 다른 축을 가리키지 않는다.
 */
const HEAD_NEED_KO: Record<Axis, string> = {
  J1: "풀려고 한 문제",
  J2: "요구를 옮긴 조건",
  J3: "직접 정한 기준",
  J4: "쓴 방법",
  J5: "남은 결과물",
  J6: "비교한 기준",
  J7: "고친 내용",
  J8: "결과가 쓰인 곳",
};

export function actionHeadKo(a: Action, domainName?: string): string {
  const d = (domainName ?? "").trim();
  if (!d) return ACTION_HEAD_KO[a.code];
  const need = a.axis ? HEAD_NEED_KO[a.axis] : null;
  switch (a.code) {
    case "WRITE_UP": return `${d} 경험 하나를 한 쪽으로 정리하기`;
    case "DEEPEN_OWNERSHIP":
      return need ? `${d} 과제에서 ${need} 적어 두기`
        : `${d} 과제에서 직접 정한 것을 적어 두기`;
    case "BUILD_OUTPUT": return `${d} 과제에서 손에 남는 결과물 하나 만들기`;
    case "ADD_VERIFICATION": return `${d}에서 낸 결과를 한 번 비교해 보기`;
    case "FILL_AXIS":
      return need ? `다음 ${d} 과제에서 ${need} 직접 정하기`
        : `다음 ${d} 과제에서 한 가지를 직접 정하기`;
    case "TRY_SHORT_EXPERIENCE": return `${d}에서 한 가지를 짧게 해 보기`;
    case "STUDY_NEXT": return `${d} 수업에서 배운 것을 작은 과제에 써 보기`;
    case "RECHECK_DIRECTION": return `${withJosa(d, "을를")} 계속할 쪽인지 정하기`;
    /* 영역이 정해지지 않은 할 일. 받은 이름을 쓰지 않는다 */
    case "EXPLORE_BROADLY": return ACTION_HEAD_KO[a.code];
  }
}

/**
 * 할 일의 **설명 두 줄까지**(COMMERCIAL FINAL §7).
 *
 * 머리가 할 일의 종류를 말했으므로 여기서는 **어느 경험을 가져와 얼마나
 * 적으면 되는지**만 말한다. 같은 동작을 두 번 적지 않는다.
 *
 * **세부 차례를 여기에 적지 않는다.** `하중 조건 → 이상화와 모델 → 해석값`
 * 같은 차례는 `다음에 할 일` 절이 들고, 첫 화면에서는 그 자리에 닿기까지
 * 화살표 넷을 지나게 된다.
 *
 * **말끝을 돌려 쓴다.** 아홉 줄이 모두 `~면 됩니다` 로 끝나면 그 칸이
 * 사람이 쓴 글로 읽히지 않는다.
 *
 * **무엇이 남는지까지 적는다.** 대상과 행동만 적으면 그 할 일을 끝낸
 * 사람의 손에 무엇이 남는지 알 수 없고, `v3:human` 이 그것을 센다.
 */
export function actionBriefKo(
  a: Action, domainName: string, where?: string[],
): string {
  const d = domainName || "지금 보고 있는 영역";
  const need = a.axis ? AXIS_NEED_KO[a.axis] : null;
  switch (a.code) {
    case "WRITE_UP":
      return `최근 ${d} 과제 하나. 한 쪽으로 정리합니다.`;
    case "DEEPEN_OWNERSHIP":
      return need
        ? `${d} 과제 하나. ${needWithJosa(need)} 세 줄로 적습니다.`
        : `${d} 과제 하나. 직접 정한 것을 세 줄로 적습니다.`;
    case "BUILD_OUTPUT":
      return `다음 ${d} 과제. 문서 한 장을 손에 남깁니다.`;
    case "ADD_VERIFICATION":
      return `${d}에서 낸 값. 다른 값과 표 한 장에 나란히 적습니다.`;
    case "FILL_AXIS":
      return need
        ? `다음 ${d} 과제. ${needWithJosa(need)} 직접 정하고 그 까닭을 한 줄 적습니다.`
        : `다음 ${d} 과제. 한 가지를 직접 정하고 그 까닭을 한 줄 적습니다.`;
    case "TRY_SHORT_EXPERIENCE":
      return `${withJosa(d, "을를")} 수업 과제로 한 번. 한 일을 다섯 줄로 적습니다.`;
    case "EXPLORE_BROADLY": {
      const list = (where ?? []).slice(0, 2);
      return list.length
        ? `${list.join(" · ")} 가운데 하나를 짧게 한 번. 한 일을 다섯 줄로 적습니다.`
        : "수업 과제 가운데 하나를 짧게 한 번. 한 일을 다섯 줄로 적습니다.";
    }
    case "STUDY_NEXT":
      return `${d} 수업 하나. 배운 것을 작은 과제에 써서 기록으로 남깁니다.`;
    case "RECHECK_DIRECTION":
      return `${withJosa(d, "을를")} 계속할지 정합니다. 그 까닭을 한 줄 적습니다.`;
  }
}

/**
 * 할 일을 끝내면 **무엇이 남는가** 한 줄(SIGN-OFF §5).
 *
 * 할 일만 적으면 읽는 사람이 `왜 이걸 해야 하지` 를 스스로 메워야 한다.
 * 이 자리는 그 답이고, **Evidence 에서 지원서로 가는 구조가 들고 있는
 * 것만** 적는다: 남긴 것이 있으면 무엇으로 보여줄지 말할 수 있고, 견준
 * 것이 있으면 어떻게 확인했는지 말할 수 있고, 직접 정한 것이 적혀 있으면
 * 그 기준을 설명할 수 있다.
 *
 * **합격이나 적합을 말하지 않는다.** 여기서 약속하는 것은 설명할 수 있게
 * 된다까지이고, 그 뒤는 읽는 사람의 일이다.
 */
const ACTION_WHY_KO: Record<ActionCode, string> = {
  WRITE_UP: "한 쪽으로 묶어 두면 면접에서 설명하기 쉬워요.",
  DEEPEN_OWNERSHIP: "세 줄만 적어 두면 지원서에서 어떤 기준으로 정했는지를"
    + " 그대로 옮겨 쓸 수 있어요.",
  BUILD_OUTPUT: "남겨 둔 것이 있으면 그 일을 무엇으로 보여줄지 말할 수 있습니다.",
  ADD_VERIFICATION: "비교해 둔 표가 있으면 그 값을 어떻게 확인했는지 말할 수 있어요.",
  FILL_AXIS: "까닭이 한 줄 적혀 있으면 그 과제에서 무엇을 정했는지 말할 수 있습니다.",
  TRY_SHORT_EXPERIENCE: "짧게라도 한 번 해 두면 다음에 적을 이야기가 생겨요.",
  EXPLORE_BROADLY: "한 가지를 겪어 보면 나머지와 비교할 기준이 생깁니다.",
  STUDY_NEXT: "들은 것을 과제 하나에 써 보면 그 과제가 기록으로 남습니다.",
  RECHECK_DIRECTION: "먼저 정해 두면 다음에 무엇을 쌓을지가 또렷해집니다.",
};

/** 할 일 칸의 **이유 한 줄**. 할 일이 없으면 적지 않는다 */
export function actionWhyKo(a: Action): string {
  /* **축이 있으면 그 축의 말로**(R30). `직접 정한 것을 적어 두기` 의 까닭이
     `어떤 기준으로 정했는지` 인 것은 맞지만, 같은 종류라도 받은 요구를
     옮긴 조건(J2)이나 쓴 방법(J4)을 적으라는 할 일 아래에 그 줄이 서면
     머리와 까닭이 서로 다른 것을 말한다 */
  if (a.code === "DEEPEN_OWNERSHIP" && a.axis && a.axis !== "J3") {
    return `세 줄만 적어 두면 지원서에서 ${needWithJosa(AXIS_NEED_KO[a.axis])} 그대로 적을 수 있어요.`;
  }
  return ACTION_WHY_KO[a.code];
}

/**
 * 고르신 항목 둘을 **한 사람 문장으로** 잇는다(SIGN-OFF §4).
 *
 * 전에는 이 자리가 고르신 항목을 가운뎃점으로 늘어놓았다
 * (`여러 안 가운데 하나를 근거를 들어 골랐다 · 예산이나 인원을 항목별로
 * 나눴다`). 뜻은 맞지만 그 꼴은 자료를 늘어놓은 줄이고, 결과지에서 가장
 * 먼저 읽는 칸이 그렇게 서면 읽는 사람이 자기 경험 대신 목록을 읽는다.
 *
 * **새로운 사실을 만들지 않는다.** 고르신 문장을 그대로 쓰고 **끝맺음만**
 * 바꾼다: 앞엣것은 `~다` 를 `~고` 로, 뒤엣것은 `~다` 를 `~습니다` 로.
 * 낱말 하나도 더하지 않으므로 없던 경험이 생기지 않는다.
 *
 * **고쳐 쓸 수 없는 항목은 그대로 둔다.** 옛 증거 지도에서 온 이름표는
 * 끝맺음이 `~다` 가 아니라서(`공차` · `제조 가능성`) 손대면 뜻이 깨진다.
 * 그때는 전처럼 가운뎃점으로 늘어놓는다.
 */
export function pickSentenceKo(picks: string[]): string {
  const x = picks.filter(Boolean).slice(0, 2);
  if (!x.length) return "";
  /* **목록으로 끝내지 않는다**(R2 §10). 끝맺음을 고칠 수 없는 이름표는
     가운뎃점으로 늘어놓고 있었는데, 그 꼴은 자료 목록이고 넷 가운데 가장
     먼저 읽는 칸이 그렇게 서면 읽는 사람이 자기 경험 대신 목록을 읽는다.
     **낱말을 더하지 않는다**: 고르신 이름을 그대로 두고 `다뤄 보셨습니다`
     한 마디만 붙여 문장으로 세운다 */
  /* **끝을 `~습니다` 로 못 박지 않는다**(R5 §13). 한 화면에서 이 함수가
     드는 자리가 둘이고(첫 화면 ① 칸과 이끄는 줄), 둘 다 `습니다` 로
     닫히면 결과지가 보고서 말투로 읽힌다. 고르신 낱말은 그대로 두고
     어미만 `~어요` 로 세운다 */
  if (!x.every((t) => t.endsWith("다"))) {
    return `${withJosa(andList(x), "을를")} 다뤄 보셨어요.`;
  }
  /* **재는 말을 그대로 읽어 주지 않는다**(Gate §1·§14). 어순과 몇 안 되는
     낱말을 `say.ts` 가 학생의 말로 돌린다. 뜻은 그대로다 */
  const said = x.map((t) => sayKo(t));
  const last = `${said[said.length - 1]}.`;
  return x.length === 1 ? last
    : `${said[0].replace(/어요$/, "고")}, ${last}`;
}

/**
 * 비어 있는 자리를 할 일 칸의 **설명 줄**로.
 *
 * `FILL_GAP` 인데 그 빈자리에 붙은 할 일이 모델에 없는 응시가 있다. 전에는
 * 그때 이 칸이 빈자리의 이름(`경영전략·기획 · 어디까지 직접 정했는지`)을
 * 그대로 들었고, 그 꼴은 우리 쪽 분류를 학생 화면의 첫 줄로 쓰는
 * 자리였다(§5).
 */
export function gapNeedShortKo(g: Gap): string {
  if (g.axis) return needSentenceKo([g.axis]);
  const what = GAP_SHORT_KO[g.kind]("");
  return `${withJosa(what, "을를")} 아직 적지 않으셨습니다`;
}

export function gapNeedKo(g: Gap, domainName: string): string {
  return `${domainName}에서 ${gapNeedShortKo(g)}`;
}

export function actionKo(
  a: Action, domainName: string, stage?: Stage,
  /**
   * 어느 영역에서 해 보면 되는가. **`EXPLORE_BROADLY` 에만 쓴다.**
   *
   * 그 할 일은 영역을 들고 있지 않아서(`domain: null`) 문장이 전공과
   * 무관해진다. 그래서 스무 Core 의 결과지가 전공 이름만 바꾼 것처럼
   * 읽혔다(규격 §16: 경험이 없는 응시자에서 글자 겹침 0.90). 여기 들어오는
   * 이름은 **결과 모델이 이미 들고 있는 것**이고(고르신 산업과 이어지는
   * 영역), 새로 판정하지 않는다. 넘기지 않으면 전과 같은 문장이다
   */
  where?: string[],
): { do: string; note?: string; guide?: string } {
  const w = a.material.workflow;
  const art = orList(a.material.artifacts.length ? a.material.artifacts
    : (w?.output ? [w.output] : []));
  /* **견줄 대상 목록도 둘까지다**(R2 §16). 영역마다 길이가 달라서
     (`낸 결과를 그 사람이 다시 말해 보게 한 결과`) 셋을 이으면 한 줄이
     백 자를 넘는다. 긴 자리에서는 맨 앞 하나만 적는다: `또는` 으로 이은
     긴 구절 셋은 읽는 사람이 어디까지가 한 대상인지 가를 수 없다 */
  const vts = a.material.verify_targets;
  const vt = orList(vts.join("").length > 24 ? vts.slice(0, 1) : vts.slice(0, 2));
  const depth = stage ? DEPTH_KO[stage] : undefined;

  if (a.code === "WRITE_UP") {
    /**
     * **지시와 차례를 가른다**(규격 §9).
     *
     * 전에는 한 문장이 `사례 하나를 골라 하중과 구속조건 → 이상화와 모델
     * → 해석값 → 검증 대조 → 설계 변경 차례로 한 쪽에 정리해보세요` 였다.
     * 읽는 사람이 **그래서 지금 무엇을 하면 되는가**에 닿기까지 화살표
     * 넷을 지나야 하고, 그러면 그 줄은 할 일로 읽히지 않고 설명서가 된다.
     * 지시는 한 마디로 적고 차례는 `guide` 가 들어 펼침 안으로 간다.
     */
    const chain = chainOf(a).join(" → ");
    return {
      do: chain
        ? `${bring(domainName)} 그때 무엇을 정했고 무엇이 남았는지 한 쪽으로 정리해 두세요.`
        : `${bring(domainName)} 그때 무엇을 정했고 그 결과가 어디에 쓰였는지 한 문단으로 적어 두세요.`,
      note: depth,
      guide: chain ? `적는 차례는 ${chain} 입니다.` : undefined,
    };
  }
  if (a.code === "DEEPEN_OWNERSHIP" && a.axis) {
    return { do: OWN_KO[a.axis](domainName, a.material), note: depth };
  }
  if (a.code === "EXPLORE_BROADLY") {
    /* **판정을 할 일 자리에 적지 않는다**(규격 §9). `어느 영역이 앞선다고
       보기 어렵습니다` 는 까닭이고, 그 자리는 화면의 `왜 필요한가` 다.
       **어디에서 해 보면 되는지는 적는다**(규격 §16): 영역 이름이 없으면
       이 줄이 전공과 무관한 말이 되고, 그러면 스무 전공의 결과지가 이름만
       바꾼 것으로 읽힌다 */
    const list = (where ?? []).slice(0, 2);
    return {
      do: list.length
        ? `${list.join(" · ")} 가운데 하나를 골라 수업이나 교내 과제로 짧게 해 보세요.`
          + " 무엇을 했고 무엇을 정했는지 다섯 줄로 적어 두세요."
        : "수업이나 교내 과제 가운데 하나를 골라 짧게 해 보세요."
          + " 무엇을 했고 무엇을 정했는지 다섯 줄로 적어 두세요.",
    };
  }
  if (a.code === "BUILD_OUTPUT") {
    const chain = chainOf(a).slice(0, 3).join(" → ");
    return {
      do: art
        ? `${bringNext(domainName)} 끝까지 가서 ${art} 한 벌을 남겨 두세요.`
        : `${bringNext(domainName)} 그때 정한 내용을 문서 하나로 남겨 두세요.`,
      note: chain ? undefined : depth,
      guide: chain ? `${chain} 까지 적혀 있으면 설명 재료가 됩니다.` : undefined,
    };
  }
  if (a.code === "ADD_VERIFICATION") {
    const target = vt || "기준값";
    return {
      do: `${bringNext(domainName)} 낸 결과를 ${withJosa(target, "과와")} 비교하고,`
        + " 두 값의 차이와 그 까닭을 표 한 장으로 남겨 두세요.",
      note: w?.on_fail ? `어긋났을 때는 ${w.on_fail}` : undefined,
    };
  }
  if (a.code === "FILL_AXIS" && a.axis) {
    return { do: FILL_KO[a.axis](domainName, a.material), note: depth };
  }
  if (a.code === "TRY_SHORT_EXPERIENCE") {
    /* **화면이 이미 보여 준 것을 문장으로 다시 설명하지 않는다.** 관심이
       높다는 것은 바로 위 칸에 적혀 있고, 여기 필요한 것은 할 일이다 */
    return {
      do: `${withJosa(domainName, "을를")} 다룰 짧은 과제나 스터디 하나를 정해 보세요.`
        + " 한 일과 직접 정한 것을 다섯 줄로 적어 두세요.",
      note: stage ? TRY_KO[stage] : undefined,
    };
  }
  if (a.code === "STUDY_NEXT") {
    return {
      do: `${domainName} 수업이나 교육 하나를 정해 들어 보세요.`
        + " 배운 것을 작은 과제에 한 번 쓰고, 무엇이 남았는지 적어 두세요.",
      note: "그 과제에서 남긴 것이 다음에 설명할 근거가 됩니다.",
    };
  }
  return {
    do: `${bring(domainName)} 그때 한 일을 한 쪽으로 적고,`
      + " 계속 쓸 경험인지 정해 보세요.",
  };
}

export function gapKo(g: Gap, domainName: string): {
  title: string; why: string; detail: string;
} {
  const ax = g.axis ? AXIS_KO[g.axis] : "";
  return {
    title: `${domainName} · ${GAP_TITLE_KO[g.kind](ax, g.axis ?? null)}`,
    why: g.kind === "PARTIAL_EVIDENCE" ? PARTIAL_WHY_KO : WHY_KO[g.why],
    detail: REASON_KO[g.reason],
  };
}

/**
 * 산업과 직무와 Evidence 와 Gap 을 **한 이야기로** 잇는다.
 *
 * 전에는 넷이 서로 다른 카드였다. 기술영역 묶음을 읽고, 산업 카드를 읽고,
 * 확인된 근거를 읽고, 비어 있는 자리를 읽는다. 네 번 읽고도 **그래서 이
 * 산업을 보려면 무엇이 더 필요한가**가 한 문장으로 서지 않았다.
 *
 * 이 함수가 세 토막을 한 문단으로 잇는다.
 *
 *   ① 어디에서 무엇이 확인됐다
 *   ② 그 산업이나 직무를 보려면 무엇이 아직 모자라다
 *   ③ 다음에 무엇을 하면 그 자리가 메워진다
 *
 * **셋 다 모델이 들고 있는 값에서만 온다.** 없는 토막은 적지 않는다: 지어낸
 * 연결 문장은 그 자리에서 가장 그럴듯하게 읽히고 가장 먼저 거짓이 된다.
 */
export function bridgeKo(
  pack: PackView, packName: string,
  domainName: (td: string) => string,
  action: Action | null, stage?: Stage,
): string[] {
  const out: string[] = [];

  /* **축 이름을 이 자리에 적지 않는다**(R2 §12). 전에는 `문제 정의와
     직접 판단 쪽을 직접 해 보셨습니다` 로 섰다. `문제 정의` 와 `직접
     판단` 은 우리 쪽 분류이고, 학생이 산업과 직무를 보는 자리에서 그
     말이 서면 자기 경험 대신 분류표를 읽는다. 쓰는 말을 `AXIS_NEED_KO`
     로 바꾼다: 가리키는 축은 그대로이고 **부르는 말만 갈린다** */
  const est = pack.established[0];
  if (est && est.axes.length) {
    const needs = andList(est.axes.slice(0, 2).map((a) => AXIS_NEED_KO[a]));
    out.push(`${withJosa(domainName(est.domain), "은는")} ${needs}까지`
      + " 적어 두셨습니다.");
  }

  const req = pack.requested[0];
  if (req) {
    const what = AXIS_NEED_KO[req.axis];
    const where = domainName(req.domain);
    /* **`자리` 는 우리 쪽 비유다**(R5 설명 과잉 §학생의 말). 비어 있는
       칸을 가리키는 말인데 학생은 그 비유를 쓰지 않는다. 무엇을 적으면
       되는지로 바꿔 적는다 */
    out.push(`${withJosa(packName, "을를")} 보려면 ${where}에서`
      + ` ${needWithJosa(what)} 더 적어 두면 좋아요.`);
  }

  if (action) {
    const k = actionKo(action, action.domain ? domainName(action.domain) : packName, stage);
    out.push(k.do);
  }
  return out;
}

/**
 * 결과 첫 줄.
 *
 * `name` 을 넘기면 **머리글을 떠받치는 영역의 이름까지** 적는다(§2). 넘기지
 * 않으면 전과 같은 문장이다: 영역 이름은 그 결과의 Core 사전에서 와야 하고
 * 그 사전을 읽는 코드는 DB 를 끌고 들어오므로, 번역표가 직접 읽지 않는다.
 *
 * **이끄는 줄은 개인화하지 않는다**(§3). 그 자리가 답하는 것은 `왜 이렇게
 * 보았는가` 이고, 그 까닭은 묶음마다 하나다. 영역 이름을 거기 또 적으면 두
 * 줄이 같은 말을 한다.
 */
/**
 * 머리글 아래 한 줄을 **그 사람이 고른 답에서** 만든다(R2 §4).
 *
 * 전에는 이 자리가 묶음마다 고정된 한 문장이었다(`해 본 일과 그때 직접
 * 정한 것이 함께 확인됐습니다`). 뜻은 맞지만 그것은 **시스템이 자기 판정을
 * 설명하는 말**이고, 결과지의 둘째 줄이 그렇게 서면 읽는 사람은 자기
 * 경험 대신 판정표를 읽는다.
 *
 * 그래서 사실 → 의미 두 문장으로 적는다: 먼저 **무엇을 직접 정했는지**를
 * 고르신 문장 그대로 옮기고, 그 뒤에 **그 판단이 무엇으로 남았는지**를
 * 잇는다. **없는 내용을 지어내지 않는다**: 두 토막이 전부 결과 모델의
 * `decided` · `did` · `artifacts` · `verifications` 에서 오고, 그 자리가
 * 비어 있으면 이 함수는 `null` 을 돌려주어 묶음의 기본 문장이 그대로 선다.
 */
function headlineLead(m: ResultModel): string | null {
  const code = headlineDomains(m)[0];
  const d = code ? m.domains.find((x) => x.code === code) : undefined;
  if (!d) return null;
  /* **사실을 한 번 더 적지 않는다**(R5 설명 과잉 §Hero·§Summary).
     전에는 이 자리가 `${한 일}. ${뜻}` 두 문장이었는데, 앞 문장이 바로
     아래 `내가 해본 경험` 칸과 **같은 응답에서 온 같은 종류의 사실**이라
     한 화면에서 같은 말을 두 번 하는 셈이었다. 390px 에서 그 두 문장이
     네 줄을 먹었다.

     그래서 Hero 의 보조 줄은 **한 문장**이고, 드는 것은 사실이 아니라
     `그래서 지금 무엇이 되는가` 다. 사실은 아래 칸이 든다. */
  if (!d.decided.length && !d.did.length) return null;
  if (m.overview.headline === "EVIDENCE_PARTIAL") {
    return "뭘 골랐는지만 덧붙이면 돼요.";
  }
  if (m.overview.headline === "EVIDENCE_READY") {
    /* R34: `그대로 쓰시면 돼요` 는 수치와 결과까지 우리가 끝낸 것으로
       읽힌다. 옮길 재료가 있다는 것과 직접 적을 것이 남았다는 것을 한
       문장에 둔다 */
    return "확인된 내용은 지원서로 옮기고, 수치와 결과는 직접 적어요.";
  }
  if (m.overview.headline === "EVIDENCE_LOW_INTEREST") {
    return "이 쪽을 계속 볼지만 정하면 돼요.";
  }
  return null;
}

export function headlineKo(
  m: ResultModel, name?: (td: string) => string,
): { title: string; lead: string } {
  const base = HEADLINE_KO[m.overview.headline];
  const lead = headlineLead(m) ?? base.lead;
  const doms = headlineDomains(m);
  const first = m.domains.find((d) => d.code === doms[0]);
  const j3 = first?.axes.find((a) => a.axis === "J3")?.state;
  const ownedWord = j3 === "CONFIRMED" || j3 === "OWNED";
  const said = m.overview.headline === "EVIDENCE_READY" && !ownedWord
    ? HEADLINE_SAID_KO.EVIDENCE_READY_OUTPUT
    : HEADLINE_SAID_KO[m.overview.headline];
  if (!name || !said) return { title: base.title, lead };
  const names = doms.map(name).filter(Boolean);
  if (!names.length) return { title: base.title, lead };
  const title = said(andList(names));
  /* **이름을 둘 이으면 taxonomy 를 이어 붙인 문장이 된다**(R5 §4).
     42자로 두었더니 390px 에서 `경영전략·기획과 마케팅 / ·시장에서 …`
     처럼 **가운뎃점이 줄을 여는** 자리가 나왔다. 그 줄은 낱말이 끊긴
     것으로 읽히고, 한 문장에 담긴 개념도 넷(영역 둘 + 직접 정함 +
     끝까지 함)이 된다.

     그래서 선을 34자로 내렸다. 짧은 이름 둘(`영업과 구매에서 …`)은
     그대로 서고, 긴 이름이 끼면 **첫 이름 하나만** 적는다.

     **측정 의미는 바뀌지 않는다**(§4): 어느 묶음인지도 어느 영역이
     떠받치는지도 그대로이고, 나머지 영역 이름은 바로 아래 `내가 해본
     경험` 칸의 칩과 영역 절이 한 자리에서 든다. **자르지는 않는다**:
     글자를 잘라 두면 뜻이 가운데서 끊긴다 */
  return { title: title.length > 34 ? said(names[0]) : title, lead };
}

/** 등급마다 무엇까지 말하는가. **BASIC 에 근거가 섰다는 판정을 두지 않는다** */
export const TIER_NOTE_KO = {
  BASIC: "이 결과는 어느 쪽부터 살펴볼지를 정하는 데까지입니다."
    + " 경험을 자세히 확인하는 질문은 아직 받지 않았습니다.",
  STANDARD: "경험이 확인된 영역과 아직 부족한 부분까지 적었습니다.",
  /* **행동과 활용을 한 문장에 담지 않는다**(PRODUCT POLISH §2) */
  PRO: "연구나 프로젝트 하나를 직무 언어로 바꿔 적었습니다."
    + " 고르신 산업과 역할에서 같은 경험이 어떻게 보이는지까지 담았습니다.",
} as const;

/**
 * 번역 열 단계의 이름.
 *
 * 문항 문면은 길다(`그 과제에서 가장 먼저 푼 문제는 무엇이었습니까`).
 * 결과지의 표에서는 **왼쪽 칸이 짧아야** 오른쪽의 그 사람 답이 읽힌다.
 */
export const TRANS_STEP_KO: Record<string, string> = {
  /* **이름이 없는 단계를 문항 번호로 적지 않는다.** `TR_TAG_1` 이 그대로
     화면과 종이에 나갔다. 여기 없는 단계는 화면이 아예 세우지 않는다 */
  TR_TAG_1: "이 과제가 닿은 영역",
  TR_TAG_2: "함께 걸친 영역",
  TR_T1: "어떤 문제였나",
  TR_T2: "왜 문제였나",
  TR_T3: "어떤 방법으로 봤나",
  TR_T4: "무엇을 바꿨나",
  TR_T5: "몇 번 돌렸나",
  TR_T6: "무엇과 비교했나",
  TR_T7: "안 됐을 때 무엇을 고쳤나",
  TR_T8: "무엇을 직접 정했나",
  TR_T9: "무엇이 남았나",
  TR_T10: "그 결과가 어디에 쓰였나",
};

/**
 * 첫 화면 세 번째 칸의 제목.
 *
 * **묻지 않은 것을 `없습니다` 로 적지 않는다.** 네 축만 물은 응시에서
 * `지금 비어 있는 자리는 없습니다` 가 섰고, 바로 옆 칸에는 `관심은 높고
 * 해 본 적이 없습니다` 가 섰다. 두 문장이 같은 화면에서 서로를 부순다.
 */
export const FIRST_MOVE_KO: Record<FirstMove, string> = {
  FILL_GAP: "가장 먼저 채울 것",
  WRITE_UP: "지원서와 면접용으로 정리할 것",
  DECIDE_DIRECTION: "먼저 정할 것",
  TRY: "지금 해볼 것",
  NONE: "지금 해볼 것",
};

/**
 * 네 축만 물은 응시의 영역 네 묶음.
 *
 * **근거 판정이 아니다.** 관심과 배울 뜻에 그 사람이 답한 것으로만 묶었고,
 * 묶음 이름에도 `근거` 가 들어가지 않는다.
 */
export const BASIC_GROUP_KO = {
  do_now: {
    title: "직접 해볼 영역",
    lead: "관심도 배울 뜻도 높다고 답한 영역입니다. 아래 할 일부터 보시면 됩니다.",
  },
  scan: {
    title: "짧게 탐색할 영역",
    lead: "관심이나 배울 뜻 가운데 하나가 높습니다. 한 번 보고 정하면 됩니다.",
  },
  low: {
    title: "지금 우선순위가 낮은 영역",
    lead: "관심이 낮다고 답한 영역입니다. 나중에 다시 보셔도 됩니다.",
  },
  unseen: {
    title: "답하지 않으신 영역",
    lead: "관심을 답하지 않으셨습니다. 경험이 없다는 뜻이 아닙니다.",
  },
} as const;

/** 할 일을 언제 할 것인가 */
export const HORIZON_KO = {
  NOW: "지금 할 일",
  NEXT: "다음 과제에서",
  LATER: "한 번 더 볼 것",
} as const;

/* **실제로 어떻게 처리했는지 적는다.** `좁게 읽어주세요` 는 무엇을 하라는
   말인지 알 수 없고, 읽는 사람은 자기 결과를 의심하게 된다 */
export const QUALITY_KO = {
  OK: "",
  REVIEW: "일부 답변이 서로 달라, 겹쳐 확인된 내용만 결과에 담았습니다.",
  LOW_VARIANCE: "영역 사이에 차이가 거의 생기지 않아, 먼저 볼 영역을 좁히지"
    + " 못했습니다. 더 끌리는 쪽과 덜 끌리는 쪽을 나눠 답하시면 또렷해집니다.",
  INCONSISTENT: "같은 경험을 묻는 두 문항의 답이 달라, 낮은 쪽으로 읽었습니다.",
} as const;


/**
 * 고르신 답을 지원서 문장으로 잇는다.
 *
 * **없는 내용을 지어내지 않는다.** 이어 붙이는 것은 응시자가 고른 보기
 * 뿐이고, 말끝만 높임으로 바꾼다. 과장하거나 성과를 보태지 않는다.
 */
const POLITE_TAIL = /([가-힣])다$/;

function polite(clause: string): string {
  const t = clause.trim().replace(/[.]$/, "");
  const m = POLITE_TAIL.exec(t);
  if (m) {
    /* 받침이 있는 어간 + `다` 는 `습니다` 로 간다(했다 · 없었다 · 남았다) */
    const code = m[1].charCodeAt(0);
    const jong = (code - 0xac00) % 28;
    if (jong !== 0) return `${t.slice(0, -1)}습니다`;
    return `${t.slice(0, -1)}ㅂ니다`;
  }
  /* 이름씨로 끝나면 `였습니다` 를 붙인다(…정하는 문제 → …문제였습니다) */
  return `${t}${josaOf(t, "이가") === "이" ? "이었습니다" : "였습니다"}`;
}

/**
 * 번역 열 단계를 한 문단으로. 빠진 단계는 그대로 건너뛴다.
 *
 * **문장을 마침표로 끊는다.** 빈칸으로만 이으면 여덟 마디가 한 줄로
 * 붙어서 읽는 사람이 어디서 숨을 쉬어야 할지 모른다.
 */
export function draftKo(
  steps: { item_id: string; choice: string | null }[],
): string[] {
  const by = new Map(steps.filter((x) => x.choice).map((x) => [x.item_id, x.choice as string]));
  const out: string[] = [];
  /* 지원서에서 말하는 차례. **문항 번호 차례가 아니다**: 그렇게 적으면
     `무엇을 직접 정했나` 가 맨 뒤로 밀려서, 가장 먼저 읽혀야 할 것이
     마지막에 선다 */
  for (const id of ["TR_T1", "TR_T2", "TR_T4", "TR_T8", "TR_T3",
                    "TR_T9", "TR_T6", "TR_T7"]) {
    const v = by.get(id);
    if (v) out.push(`${polite(v)}.`);
  }
  const used = by.get("TR_T10");
  if (used) out.push(`그 결과는 ${used} 쓰였습니다.`);
  return out;
}

/**
 * 지원서 문단의 뼈대(R32).
 *
 * **고르신 보기를 `~했습니다.` 로 이어 붙인 문단을 내놓지 않는다.** 그
 * 문단은 열 보기를 차례로 늘어놓은 것이라 자기소개서로 읽히지 않고, 읽는
 * 사람이 그것을 지원서에 그대로 붙이면 수치도 역할도 없는 글이 된다.
 * 대신 **역할·상황 → 행동 → 판단 → 결과** 네 칸으로 고르신 보기를 그대로
 * 나누어 돌려준다. 비어 있는 칸은 세우지 않고, 문장으로 잇는 일과 수치를
 * 채우는 일은 그 사람이 한다. 새 문장을 만들지 않는다.
 */
export type DraftFrame = { label: string; hint: string; items: string[] }[];
export function draftFrameKo(
  steps: { item_id: string; choice: string | null }[],
): DraftFrame {
  const by = new Map(steps.filter((x) => x.choice).map((x) => [x.item_id, x.choice as string]));
  const pick = (ids: string[]) => ids.map((id) => by.get(id)).filter((v): v is string => !!v);
  return [
    { label: "역할·상황", hint: "맡은 역할에서 어떤 문제였고 왜 문제였는지",
      items: pick(["TR_T1", "TR_T2"]) },
    { label: "행동", hint: "무엇을 바꿨고 어떤 방법으로 몇 번 돌렸는지",
      items: pick(["TR_T4", "TR_T3", "TR_T5"]) },
    { label: "판단", hint: "무엇을 직접 정했고 무엇과 비교했고 안 됐을 때 무엇을 고쳤는지",
      items: pick(["TR_T8", "TR_T6", "TR_T7"]) },
    { label: "결과", hint: "무엇이 남았고 어디에 쓰였는지 · 수치와 기간은 직접 적는다",
      items: pick(["TR_T9", "TR_T10"]) },
  ].filter((f) => f.items.length);
}

/**
 * 번역 표에 세울 차례.
 *
 * 열 단계가 이야기고, `TR_TAG_*` 는 그 과제가 어느 영역에 닿았는지를
 * 적어 두는 꼬리표다. 둘을 한 표에 섞으면 `열 단계` 가 열두 줄이 된다.
 */
/**
 * 읽는 차례. **물은 차례를 그대로 쓰지 않고 설명하는 차례로 바꾼다.**
 *
 * 문제 → 요구 → 내가 정한 것 → 결과를 보고 정한 것 → 방법 → 한 일 →
 * 남은 것 → 견준 것 → 고친 것 → 쓰인 자리. 지원서와 면접에서 말하는 길이
 * 이것이고, 문항 번호 차례(T1~T10)로 적으면 판단이 맨 뒤로 밀린다.
 */
export const TRANS_ORDER = [
  "TR_T1", "TR_T2", "TR_T4", "TR_T8", "TR_T3",
  "TR_T5", "TR_T9", "TR_T6", "TR_T7", "TR_T10",
] as const;

/**
 * 타계열 대학원 맥락 넷의 이름표.
 *
 * **문항 번호를 화면에 적지 않는다.** 여기 없는 자리는 화면이 아예 세우지
 * 않는다(`TRANS_STEP_KO` 와 같은 규칙이다).
 *
 * **전공 이름을 글자로 적지 않는다.** 표로 두었을 때 둘이 `기계공학` 을
 * 박고 있었고, 그래서 타계열 대학원을 다닌 경영학과 학생의 결과지가
 * `기계공학 문제에도 쓸 수 있는 방법` 을 적었다. 문항 은행은 Core 마다
 * 제 말로 묻고 있었고(`경영 문제에도 쓸 수 있는 것`) **읽는 이름표만**
 * 한 Core 의 말을 들고 있었다: 응시 화면의 산업 장면과 같은 종류다.
 * 전공 이름은 결과지가 이미 들고 있는 값(`resultMeta.major`)을 받는다.
 */
export function xfieldKo(id: string, major: string): string | null {
  switch (id) {
    case "XF_FIELD": return "대학원에서 다룬 분야";
    case "XF_BRIDGE": return `${major} 쪽 문제에도 쓸 수 있는 방법`;
    case "XF_ME_RECENT": return `${major} 쪽 활동을 마지막으로 한 때`;
    case "XF_ME_DEPTH": return "학부에서 가장 깊게 간 활동";
    default: return null;
  }
}

export const XFIELD_ORDER = [
  "XF_ME_DEPTH", "XF_ME_RECENT", "XF_FIELD", "XF_BRIDGE",
] as const;

/**
 * 영역에 걸치지 않는 판단 한 줄.
 *
 * 공통 판단과 학위 묶음은 기술영역이 없다. 그래서 `구조해석에서 하중을
 * 정했다` 처럼 적을 수 없고, 그 축을 어디에서든 해 봤다는 데까지만 적는다.
 * **영역 판정과 섞어 읽히지 않게 그 사실을 함께 적는다.**
 */
/**
 * 영역에 걸치지 않는 판단 하나하나의 이름.
 *
 * **축 이름으로 대신하지 않는다.** 전에는 `문제 정의` 처럼 축 이름만 나가서,
 * 공통 판단 여섯과 학위 묶음 여섯이 축 여덟으로 접히고 **어느 판단을 하신
 * 것인지 결과지가 되돌려 주지 못했다.** 한 축에 문항이 둘인 자리에서는 짝이
 * 가려 응답 하나가 아예 보이지 않았다.
 *
 * 문면을 그대로 쓰지 않고 줄인 말로 적는 까닭은, 결과지에서 이 자리가 목록이고
 * `~한 적이 있다` 가 열두 번 되풀이되면 읽히지 않기 때문이다. **학위마다 다른
 * 장면을 그대로 들고 간다**: 같은 축이라도 학부는 캡스톤이고 포닥은 과제 운영이다.
 */
/**
 * **R34: 이 표는 기계공학 벌이고 다른 Core 는 `student/common.ts` 가 든다.**
 * 전에는 이 한 벌이 스무 Core 전부에 나가 경영학과 학생의 종이에
 * `조건이나 치수` 와 `실험값과 계산값` 이 섰다. 표 자체는 `COMMON_ME` 를
 * 그대로 가리키고(`v3:measure` 가 이 이름으로 번호 덮임을 센다), 읽는
 * 자리는 `commonKo(v, core)` 가 그 Core 의 벌로 간다.
 */
export const COMMON_ITEM_KO: Record<string, string> = COMMON_ME;

/**
 * 영역에 걸치지 않는 판단을 읽는 말로.
 *
 * 축 이름 두 줄(`owned` · `confirmed`)은 그대로 두고 **문항 줄을 더한다.**
 * 축 이름은 어디까지 확인됐는지를 한눈에 보여 주고, 문항 줄은 그것이 어느
 * 판단이었는지를 되돌려 준다. 둘 가운데 하나만 두면 읽는 사람이 자기 답을
 * 알아보지 못하거나(축만) 전체가 안 보인다(문항만).
 */
export function commonKo(v: CommonView, core = "ME_CORE_V3"): {
  owned: string[]; confirmed: string[];
  didOwn: string[]; didConfirm: string[];
} {
  const owned = v.axes.filter((a) => a.owned).map((a) => AXIS_KO[a.axis]);
  const confirmed = v.axes
    .filter((a) => a.confirmed && !a.owned).map((a) => AXIS_KO[a.axis]);
  /* **그 Core 의 말로 부른다**(R34). Core 를 못 받은 옛 호출은 기계공학
     벌로 떨어진다: 그 자리가 전과 같은 글자를 내야 되짚을 때 갈리지 않는다 */
  const name = (id: string) => commonItemKo(core, id) ?? undefined;
  /**
   * **굳은 결과에 이 칸이 없을 수 있다.**
   *
   * 결과지는 그때 적어 둔 결과 모델을 그대로 꺼내 그린다. `items` 는
   * `me-v3-result-model.5` 에서 생긴 칸이라, 그 전에 응시한 사람의 줄에는
   * 없다. 없는 것을 읽으면 그 사람의 결과지가 500 으로 떨어진다. 실제로
   * 그렇게 떨어졌고 `v3:loop` 의 막다른 길 검사가 잡았다. **없으면 이 줄을
   * 세우지 않고 위의 축 두 줄만 선다**: 그 판본이 적어 둔 것이 거기까지다.
   */
  const items = v.items ?? [];
  /* **이름이 없는 문항은 세우지 않는다.** 문항 번호를 화면에 내보내는 것보다
     그 줄을 비우는 쪽이 낫고, 비면 `v3:measure` 가 먼저 걸린다 */
  const didOwn = items.filter((i) => i.owned).map((i) => name(i.item_id))
    .filter((x): x is string => !!x);
  const didConfirm = items.filter((i) => i.confirmed && !i.owned)
    .map((i) => name(i.item_id)).filter((x): x is string => !!x);
  return { owned, confirmed, didOwn, didConfirm };
}
