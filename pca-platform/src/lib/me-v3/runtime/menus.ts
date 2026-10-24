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
import { itemOf, levelOptions } from "./session";
import { translateMenu } from "../student/translate";
import type { V3Lang } from "../i18n";
import { COPY_KO } from "./copy.ko";
import { copyFor } from "./copy";

export type Control =
  /** 보기 넷(L0~L3). 고른 자리가 `index` */
  | { kind: "level"; options: string[]; guide: string }
  /** 다섯 칸. 양 끝에만 말이 붙는다 */
  | { kind: "scale5"; labels: string[] }
  /** 격자의 경험 칸 셋 */
  | { kind: "exposure"; options: string[] }
  /**
   * 한 줄짜리 단계 고르기. **값을 은행이 든다.**
   *
   * 영역 훑기가 이것을 쓴다. 관심과 배울 뜻은 다섯 단계(1~5)에 `잘
   * 모르겠다` 가 **척도 밖에** 하나 붙고, 경험은 셋(0·1·2)이다.
   *
   * **둘을 한 줄에 섞어 두었던 것이 탈이었다.** `관심이 적다` 는 관심
   * 수준이고 `잘 모르겠다` 는 정보가 없다는 뜻이라 같은 축이 아니다. 그래서
   * 수준은 다섯 칸으로 세우고 모른다는 답은 그 줄 뒤에 작게 둔다.
   *
   * 저장되는 값과 읽는 함수는 그대로다: `band()` 가 처음부터 `1~2 LOW` ·
   * `3 MID` · `4~5 HIGH` 로 갈랐고, 화면이 그 가운데 셋만 보내고 있었다.
   * 근거는 `docs/metri/80_scale_gate.md`.
   *
   * `short` 는 **번호를 뗀 말**이다. 그리는 자리는 척도 밖(`모르겠다`)과
   * 경험 칸 셋뿐이고, 다섯 칸 척도의 칸에는 번호만 선다: 뜻은 격자 머리가
   * 한 번 들고, 칸의 접근성 이름에는 긴 말이 그대로 들어간다.
   */
  | { kind: "steps"; answer: "scale5" | "exposure";
      options: {
        value: number | null; label: string; short: string;
        /** 번호가 붙은 밝혀 적는 말. 격자 머리와 읽는 이름에 들어간다 */
        full: string;
      }[] }
  /** 고르기. 값은 코드이고 보이는 것은 `label` */
  | { kind: "choice"; options: { value: string; label: string }[];
      note?: { label: string; placeholder: string } };

/** 다섯 칸의 말. 문면이 "…하고 싶다" 꼴이라 동의 정도로 받는다 */
export const SCALE5 = COPY_KO.menus.scale5;
/**
 * 격자의 경험 칸. **횟수를 묻고 수준을 묻지 않는다.**
 *
 * **전공이 늘어도 이 세 낱말은 그대로다**(Authoring Contract §6). 전공마다
 * 빈도 척도를 따로 만들면 같은 `1` 이 전공에 따라 다른 뜻이 되고, 그러면
 * 두 전공을 같은 자 위에 놓을 수 없다.
 *
 * **문항 은행을 고치지 않는다.** 은행의 `options`(`없다 · 한두 번 ·
 * 여러 번`)와 `option_values`(`0 · 1 · 2`)가 한 글자도 바뀌지 않았고,
 * 이 표는 `FULL_SCALE5` 와 같은 자리다: 화면이 그 값을 어떻게 적는가일
 * 뿐이다. 그래서 `ME_V3_ITEM_BANK_V2.5` 와 `bank-lock.json` 과 저장된
 * 응답의 뜻이 그대로다. 자리는 `option_values` 가 정한다: 낱말을 차례로
 * 늘어놓으면 은행의 보기 차례가 바뀌는 날 뜻이 어긋난다.
 */
export const EXPOSURE = COPY_KO.menus.exposure;

/* 척도 밖(`모르겠다`). **값이 비어 있다는 뜻이지 관심이 낮다는 뜻이 아니다**.
   글은 언어마다 `copy.*.ts` 의 `menus.unknown` 이 든다 */

/**
 * 척도 다섯 칸의 **밝혀 적는 말**. 재는 것마다 갈린다(규격 §10).
 *
 * 이것이 격자 머리와 `aria-label` 과 `title` 에 들어가는 말이고, **칸 안에
 * 적히는 것은 번호 하나뿐이다.**
 *
 * 한동안 칸마다 줄인 말을 또 적었다(`전혀 없음 · 적음 · 보통 · 있음 ·
 * 매우 있음`). 그러면 둘이 어긋난다: 머리는 `관심 있음` 이라고 적는데
 * 칸은 `있음` 이라고 적어서, 좁은 화면에서 머리가 접히면 응시자가 읽는
 * 말이 **재는 축의 말이 아니게 된다.** 그리고 열두 줄 × 다섯 칸에 같은
 * 낱말이 예순 번 서서 화면이 표 계산기로 읽혔다. 지금은 뜻을 적는 자리가
 * 머리 하나이고, 좁은 화면에서는 그 머리가 줄글로 풀려 다섯 단계를 끝까지
 * 적는다(규격 §14 · §15).
 *
 * **문항 은행과 저장되는 값과 `band()` 는 한 글자도 바뀌지 않는다.**
 * 은행의 `options`(`전혀 관심 없다` …)와 `option_values`(1~5·null)가
 * 그대로이고, 이 표는 화면이 그것을 어떻게 적는가일 뿐이다.
 */
/* 표는 언어마다 `copy.*.ts` 의 `menus.fullScale5` 가 든다 */

/**
 * 밝혀 적는 말. **번호를 앞에 붙인다**(규격 §10).
 *
 * 다섯 칸 척도에서 번호를 떼면 `관심 적음` 과 `보통` 사이가 몇 칸인지
 * 눈으로만 세게 된다. 번호가 있으면 어느 칸을 고르는지가 한 번에 읽히고,
 * 되묻는 자리에서 `2 를 고르셨습니다` 로 적을 수 있다.
 *
 * **소유 보기 넷에는 번호를 붙이지 않는다.** 저쪽은 누가 정했는가의
 * 단계이고, 번호를 붙이면 `1점 · 2점 · 3점 · 4점` 으로 읽힌다. 여기는
 * 정도를 묻는 척도라 번호가 그 뜻과 어긋나지 않는다.
 */
export function fullOf(
  axis: string, value: number | null, label: string, lang?: V3Lang,
): string {
  const M = copyFor(lang).menus;
  if (value === null) return label;
  if (axis === "exposure") return M.exposure[value] ?? label;
  const t = M.fullScale5[axis];
  return t?.[value] ? `${value} ${t[value]}` : `${value} ${label}`;
}

/**
 * 번호를 뗀 말. **다섯 칸 척도에서는 화면에 서지 않는다.**
 *
 * 그리는 자리는 둘뿐이다: 척도 밖(`모르겠다`)과 경험 칸 셋(`없음 ·
 * 1~2회 · 3회 이상`, 저쪽은 낱말 자체가 값이다). 다섯 칸 척도의 값도
 * **재는 축의 말 그대로** 돌려준다: 줄여 적은 말을 따로 들고 있으면
 * 머리와 칸이 다른 말을 하게 되고, 그 어긋남이 좁은 화면에서만 드러난다.
 */
export function shortOf(
  axis: string, value: number | null, label: string, lang?: V3Lang,
): string {
  const M = copyFor(lang).menus;
  if (value === null) return M.unknown;
  /* 경험은 세 칸이고 말이 이미 짧다 */
  if (axis === "exposure") return M.exposure[value] ?? label;
  return M.fullScale5[axis]?.[value] ?? label;
}

/** 보기를 응시 중에 정하는 문항이 읽는 것 */
export type MenuContext = {
  /** 어느 Major Core 의 보기인가. 보기 넷의 문면이 core 의 은행에 있다 */
  core: string;
  /**
   * 보기 **글**의 언어. 비어 있으면 한국어다. **저장되는 값은 언어와 무관하다**:
   * 코드거나 자리 번호거나, 글자가 값인 보기는 원본(한국어) 글자가 값이다.
   */
  lang?: V3Lang;
  /** 격자에서 묶인 영역 둘. 강제 선택의 보기가 된다 */
  tiedPair: { code: string; name: string }[];
  domains: { code: string; name: string }[];
  industries: { code: string; name: string }[];
  roles: { code: string; name: string }[];
  orgs: { code: string; name: string }[];
};

/**
 * 번역 열 단계의 보기는 **Core 마다** 든다(`student/translate.ts`).
 *
 * 전에는 여기 한 벌이 글자로 있어 스무 Core 전부가 기계공학의 보기를 받았다.
 * 저장되는 값은 보기의 자리(`S1`~`S5`)이고 세 벌의 수와 차례가 같으므로
 * 측정은 그대로다.
 */
/**
 * 조직 유형 일곱의 짧은 이름.
 *
 * 문면은 "…환경이 나와 맞는다" 로 길다. 목표를 고르는 자리에서는 같은
 * 일곱을 **짧은 이름으로** 세워야 서로 견줄 수 있다. 순서는 문항
 * `PO_OC1`~`PO_OC7` 과 같다.
 */
/* 이름은 언어마다 `copy.*.ts` 의 `menus.orgTypes` 가 든다 */

type Item = {
  item_id: string; module: string; response_scale: string | null;
  options?: string[] | null;
  option_values?: number[] | null;
  measurement_axis?: string | null;
};

/**
 * 이 문항을 무엇으로 받는가.
 *
 * **응답의 종류와 보기를 한자리에서 정한다.** 화면마다 따로 정하면 같은
 * 문항이 자리에 따라 다른 보기를 받는다.
 */
export function controlOf(item: Item, ctx: MenuContext): Control {
  const sc = item.response_scale ?? "";
  const lang = ctx.lang ?? "ko";
  const M = copyFor(lang).menus;

  if (sc === "L0~L3" || sc === "4보기") {
    return { kind: "level", options: levelOptions(ctx.core, lang), guide: "" };
  }
  if ((sc === "5보기" || sc === "3보기")
      && item.options?.length && item.option_values?.length) {
    const axis = item.measurement_axis ?? "";
    return {
      kind: "steps",
      answer: axis === "exposure" ? "exposure" : "scale5",
      /* 값이 `null` 인 자리는 `잘 모르겠다` 다. **수를 주지 않는다**:
         가운데 값으로 두면 아직 모르는 사람이 보통 관심으로 판정된다 */
      options: item.options.map((label, i) => {
        const value = (item.option_values as (number | null)[])[i] ?? null;
        return {
          value, label,
          short: shortOf(axis, value, label, lang),
          full: fullOf(axis, value, label, lang),
        };
      }),
    };
  }
  if (sc === "5점") return { kind: "scale5", labels: M.scale5 };
  if (sc.startsWith("없음")) return { kind: "exposure", options: M.exposure };

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
      options: ctx.orgs.length
        ? ctx.orgs.map((o) => ({ value: o.code, label: o.name }))
        : M.orgTypes.map((label, i) => ({ value: `OC${i + 1}`, label })),
    };
  }
  const t = translateMenu(ctx.core, item.item_id, lang);
  if (t) {
    return {
      kind: "choice",
      options: t.options.map((label, i) => ({ value: `S${i + 1}`, label })),
      note: t.note ? { label: t.note, placeholder: "" } : undefined,
    };
  }
  if (item.options?.length) {
    /* **글자가 값인 보기는 원본 글자가 값이다.** 영어 글자를 값으로 저장하면
       같은 답이 언어에 따라 다른 응답이 되고, 결과 모델이 그 글자를 굳힌다.
       보이는 글만 그 언어다. 두 원고는 보기 개수와 차례가 같다 */
    const ko = lang === "ko" ? item : (itemOf(ctx.core, item.item_id, "ko") ?? item);
    const values = ko.options?.length === item.options.length ? ko.options : item.options;
    return {
      kind: "choice",
      options: item.options.map((label, i) => ({ value: values[i], label })),
    };
  }
  /* 여기 오면 보기가 없는 문항을 화면에 세운 것이다. 조용히 빈 보기를
     그리면 응시자는 눌리지 않는 화면을 본다 */
  throw new Error(`no options for item ${item.item_id} (${sc})`);
}
