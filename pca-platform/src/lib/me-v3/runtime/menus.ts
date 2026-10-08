/**
 * 보기. **문면은 문항 은행이 들고, 보기 메뉴는 여기서 만든다.**
 *
 * 은행의 어떤 문항은 `options` 가 비어 있고 `rationale` 에 "보기 메뉴는
 * 계열 module 이 정한다" 고 적혀 있다. 그 자리가 비어 있는 까닭은 보기가
 * **응시 중에 정해지기** 때문이다: 강제 선택은 격자에서 묶인 두 영역을
 * 보기로 세우고, 영역 태그는 열두 영역을 세우고, 목표는 지금 열려 있는
 * 산업과 역할을 세운다. 그것을 은행에 적어 두면 산업을 하나 더 늘리는
 * 일이 **동결된 문항 은행을 고치는 일**이 된다.
 *
 * **보기 넷은 여기서 만들지 않는다.** `level_options` 는 은행이 유일한
 * 출처이고(네 단계의 뜻이 판정 규칙과 묶여 있다), 여기서는 그것을 읽어
 * 그대로 내놓는다. 다른 말로 바꿔 적으면 같은 응답이 다른 뜻이 된다.
 */
import { levelOptions } from "./session";

export type Control =
  /** 보기 넷(L0~L3). 고른 자리가 `index` */
  | { kind: "level"; options: string[]; guide: string }
  /** 다섯 칸. 양 끝에만 말이 붙는다 */
  | { kind: "scale5"; labels: string[] }
  /** 격자의 경험 칸 셋 */
  | { kind: "exposure"; options: string[] }
  /** 고르기. 값은 코드이고 보이는 것은 `label` */
  | { kind: "choice"; options: { value: string; label: string }[];
      note?: { label: string; placeholder: string } };

/** 다섯 칸의 말. 문면이 "…하고 싶다" 꼴이라 동의 정도로 받는다 */
export const SCALE5 = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"];
/** 격자의 경험 칸. **횟수를 묻고 수준을 묻지 않는다** */
export const EXPOSURE = ["없다", "한두 번", "여러 번"];

/** 보기를 응시 중에 정하는 문항이 읽는 것 */
export type MenuContext = {
  /** 격자에서 묶인 영역 둘. 강제 선택의 보기가 된다 */
  tiedPair: { code: string; name: string }[];
  domains: { code: string; name: string }[];
  industries: { code: string; name: string }[];
  roles: { code: string; name: string }[];
};

/**
 * 번역 열 단계의 보기.
 *
 * **한 줄 칸은 보기를 대신하지 않는다.** 고른 보기가 단계를 센 근거이고,
 * 적은 줄은 결과지가 그 사람의 말로 옮겨 적을 때 쓴다. 그래서 줄을 비워도
 * 단계는 선다.
 */
const TRANS: Record<string, { options: string[]; note?: string }> = {
  TR_T1: {
    options: [
      "주어진 조건에서 치수나 값을 정하는 문제",
      "되지 않는 원인을 찾는 문제",
      "방법이나 절차 자체를 세우는 문제",
      "서로 부딪히는 요구를 맞추는 문제",
    ],
    note: "그 문제를 한두 줄로 적어 주십시오",
  },
  TR_T2: {
    options: [
      "그대로 두면 기준을 못 맞춘다",
      "앞이 정해지지 않아 다음 작업이 못 간다",
      "쓰던 방법으로는 시간이나 비용이 안 맞는다",
      "결과를 믿을 근거가 없다",
    ],
    note: "무엇이 걸렸는지 한 줄로 적어 주십시오",
  },
  TR_T3: {
    options: [
      "계산이나 해석으로 미리 봤다",
      "시험이나 계측으로 재서 확인했다",
      "먼저 만들어 보고 고쳤다",
      "기존 사례와 자료를 모아 정리했다",
    ],
    note: "검토했다가 쓰지 않은 방법이 있으면 적어 주십시오",
  },
  TR_T4: {
    options: [
      "형상이나 치수를 바꿨다",
      "재질이나 부품을 바꿨다",
      "조건이나 설정값을 바꿨다",
      "절차나 순서를 바꿨다",
    ],
    note: "끝까지 고정한 것이 있으면 적어 주십시오",
  },
  TR_T5: {
    options: [
      "조건을 바꿔 여러 번 돌렸다",
      "같은 조건을 여러 번 재서 흩어짐을 봤다",
      "한 번 하고 결과를 정리했다",
      "남이 돌린 결과를 받아 정리했다",
    ],
    note: "몇 번 했는지 적어 주십시오",
  },
  TR_T6: {
    options: [
      "규격이나 기준값과 견주었다",
      "시험이나 계측 결과와 견주었다",
      "다른 방법으로 낸 값과 견주었다",
      "견준 데가 없다",
    ],
  },
  TR_T7: {
    options: [
      "여러 번 재서 흩어짐을 적어 두었다",
      "여유를 두고 기준을 더 엄하게 잡았다",
      "쓸 수 있는 범위를 적어 남겼다",
      "따로 다루지 않았다",
    ],
  },
  TR_T8: {
    options: [
      "어느 안으로 갈지 정했다",
      "조건이나 기준값을 정했다",
      "다시 할 것과 그만둘 것을 정했다",
      "내가 정한 것은 없다",
    ],
  },
  TR_T9: {
    options: [
      "도면이나 사양으로 남았다",
      "해석이나 시험 보고로 남았다",
      "절차서나 기준으로 남았다",
      "발표 자료나 논문으로 남았다",
      "남은 것이 없다",
    ],
  },
  TR_T10: {
    options: [
      "다음 설계나 해석의 입력으로",
      "생산이나 공정 조건으로",
      "판정이나 인증의 근거로",
      "뒤이은 연구의 출발점으로",
    ],
    note: "누가 쓸 수 있는지 한 줄로 적어 주십시오",
  },
};

/**
 * 조직 유형 일곱의 짧은 이름.
 *
 * 문면은 "…환경이 나와 맞는다" 로 길다. 목표를 고르는 자리에서는 같은
 * 일곱을 **짧은 이름으로** 세워야 서로 견줄 수 있다. 순서는 문항
 * `PO_OC1`~`PO_OC7` 과 같다.
 */
const ORG_TYPES = [
  "완성품을 만드는 회사",
  "부품·장비·소재 회사",
  "엔지니어링 용역",
  "국가 과제 수행 기관",
  "대학 연구실",
  "공공·인증 기관",
  "적은 인원의 작은 조직",
];

type Item = {
  item_id: string; module: string; response_scale: string | null;
  options?: string[] | null;
};

/**
 * 이 문항을 무엇으로 받는가.
 *
 * **응답의 종류와 보기를 한자리에서 정한다.** 화면마다 따로 정하면 같은
 * 문항이 자리에 따라 다른 보기를 받는다.
 */
export function controlOf(item: Item, ctx: MenuContext): Control {
  const sc = item.response_scale ?? "";

  if (sc === "L0~L3" || sc === "4보기") {
    return { kind: "level", options: levelOptions(), guide: "" };
  }
  if (sc === "5점") return { kind: "scale5", labels: SCALE5 };
  if (sc.startsWith("없음")) return { kind: "exposure", options: EXPOSURE };

  if (item.module === "CORE-FORCE") {
    return {
      kind: "choice",
      options: ctx.tiedPair.map((d) => ({ value: d.code, label: d.name })),
    };
  }
  if (sc === "영역 고르기") {
    return {
      kind: "choice",
      options: ctx.domains.map((d) => ({ value: d.code, label: d.name })),
    };
  }
  if (item.item_id === "TG_ROLE") {
    return { kind: "choice", options: ctx.roles.map((r) => ({ value: r.code, label: r.name })) };
  }
  if (item.item_id === "TG_INDUSTRY") {
    return {
      kind: "choice",
      options: ctx.industries.map((i) => ({ value: i.code, label: i.name })),
    };
  }
  if (item.item_id === "TG_OC") {
    return {
      kind: "choice",
      options: ORG_TYPES.map((label, i) => ({ value: `OC${i + 1}`, label })),
    };
  }
  const t = TRANS[item.item_id];
  if (t) {
    return {
      kind: "choice",
      options: t.options.map((label, i) => ({ value: `S${i + 1}`, label })),
      note: t.note ? { label: t.note, placeholder: "" } : undefined,
    };
  }
  if (item.options?.length) {
    return { kind: "choice", options: item.options.map((label) => ({ value: label, label })) };
  }
  /* 여기 오면 보기가 없는 문항을 화면에 세운 것이다. 조용히 빈 보기를
     그리면 응시자는 눌리지 않는 화면을 본다 */
  throw new Error(`no options for item ${item.item_id} (${sc})`);
}
