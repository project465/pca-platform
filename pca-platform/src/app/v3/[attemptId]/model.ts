/**
 * 화면 하나를 그리는 데 필요한 것만 담는다. **문항 은행을 브라우저로
 * 내려보내지 않는다.**
 *
 * 문항이 291개인데 전부 내려보내면 첫 화면이 그만큼 늦게 서고, 열리지
 * 않은 팩 문항까지 브라우저에 들어간다. 그래서 지금 화면의 문항만 담고,
 * 다음 화면은 다음 요청에서 만든다.
 */
import type { Control } from "@/lib/me-v3/runtime/menus";

export type Field = {
  itemId: string;
  /** 격자와 선호 화면처럼 한 화면에 여럿 설 때의 줄 이름 */
  label?: string;
  control: Control;
  value: number | string | null;
  note?: string;
  /** 보기마다 붙는 짧은 뜻. 보기 넷에서만 쓴다 */
  optionHelp?: string[];
  /**
   * 접어 둘 뜻풀이.
   *
   * 보기 넷을 처음 만나는 화면에서는 `optionHelp` 로 펼치고, 그 뒤에는
   * 여기로 와서 **접힌 자리**에 선다. 개념은 그대로 두고 매번 다시 읽지
   * 않게 하는 자리다.
   */
  optionHelpFold?: string[];
  /** 보기마다 붙는 네 글자 꼬리표. 보기 넷에서만 쓴다 */
  optionTag?: string[];
};

export type Group = {
  slot: string; label: string; items: string[]; picked: string[];
};

export type PackChoice = { code: string; name: string; gloss: string };

/** 산업과 역할과 조직을 고르는 화면의 종류 */
export type PickKind = "industry" | "role" | "org";

/** 보기 넷을 한눈에 가르는 꼬리표. 보기 넷 화면에서만 */
export type OptionTag = string[];

export type ScreenModel = {
  attemptId: string;
  kind: string;
  /**
   * 한 번 누르면 다음으로 넘어가는가.
   *
   * **한 선택으로 화면이 끝나는 자리만 참이다.** 훑기와 복수 선택과 근거
   * 고르기와 직접 적는 칸은 손으로 넘긴다: 고르는 중에 화면이 넘어가면
   * 나머지를 고를 수 없다.
   */
  auto: boolean;
  index: number;
  prevIndex: number | null;
  nextIndex: number | null;
  required: boolean;
  eyebrow?: string;
  subject?: string;
  question?: string;
  help?: string;
  /** 보기 읽는 법 한 줄. 보기 넷 화면에서만 */
  guide?: string;
  fields: Field[];
  groups?: Group[];
  /** 산업 장면처럼 읽기만 하는 자리의 본문 */
  body?: string[];
  /** 근거 고르기 화면이 쓰는 영역. **사용자에게는 보이지 않는다** */
  domain?: string;
  packs?: PackChoice[];
  /** 고르기 화면의 종류와 이미 고른 것과 최대 개수 */
  pickKind?: PickKind;
  pickedMany?: string[];
  max?: number;
  picked?: string | null;
  /** 기본 정보를 고치는 화면 */
  profile?: { stage: string; field: string | null; undergrad: string | null };
  /** 완료 화면이 적는 것. **판정은 담지 않는다** */
  answered?: number;
  done?: boolean;
  summary?: {
    explored: number;
    deep: string[];
    evidence: number;
    industry: string | null;
    role: string | null;
    judged: number;
  };
};

export type ProgressModel = {
  /** 지나온 단계 하나 · 지금 · 다음 하나. **여덟을 늘어놓지 않는다** */
  prev: string | null;
  now: string;
  next: string | null;
  inStage: { index: number; total: number };
  percent: number;
};
